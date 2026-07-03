const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function createStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    dump() {
      return Object.fromEntries(store);
    },
  };
}

function loadUserContext(seed) {
  const localStorage = createStorage(seed);
  const context = {
    window: {},
    localStorage,
  };
  context.window.localStorage = localStorage;
  vm.runInNewContext(read("app/user-context.js"), context, { filename: "app/user-context.js" });
  return { UserContext: context.window.UserContext, localStorage, window: context.window };
}

function host(value) {
  return JSON.parse(JSON.stringify(value));
}

test("UserContext recovers from bad storage and preserves partial updates", () => {
  const { UserContext, localStorage } = loadUserContext({ "fbi-user-context-v1": "{not json" });

  assert.deepEqual(host(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  UserContext.save({
    displayName: "  Maya  ",
    selectedCollege: { name: "Swarthmore College", id: "swat" },
    selectedMajor: { name: "Computer Science", category: "Engineering" },
    contextConfirmed: false,
    preLandingComplete: false,
  });
  const next = UserContext.update({ contextConfirmed: true });

  assert.equal(next.contextConfirmed, true);
  assert.equal(next.selectedCollege.name, "Swarthmore College");
  assert.equal(next.selectedMajor.name, "Computer Science");
  assert.equal(UserContext.nameOr("friend"), "Maya");
  assert.equal(UserContext.hasIdentity(), true);

  UserContext.clear();
  assert.equal(localStorage.getItem(UserContext.KEY), null);
  assert.equal(UserContext.nameOr("friend"), "friend");
});

test("UserContext related major fallback prefers explicit lists before category siblings", () => {
  const { UserContext, window } = loadUserContext();
  const db = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "English", category: "Humanities" },
  ];
  window.__MAJORS = db;

  assert.deepEqual(host(UserContext.relatedMajorsFor({ name: "Computer Science", relatedMajors: ["Math", "Statistics", "AI"] }, db, 2)), [
    "Math",
    "Statistics",
  ]);
  assert.deepEqual(host(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, db, 5)), [
    "Data Science",
    "Information Science",
  ]);
  assert.deepEqual(host(UserContext.relatedMajorsFor({ name: "Undeclared" }, db, 5)), []);
});

function createResearchHarness(options = {}) {
  const localStorage = createStorage(options.storage);
  const calls = [];
  const fixtures = {
    "researchSources.json": {
      _meta: {
        engines: {
          google: "https://google.example/search?q=",
          youtube: "https://youtube.example/results?search_query=",
        },
      },
      categories: [
        {
          id: "official",
          title: "Official sources",
          blurb: "Verify the source.",
          links: [
            { id: "homepage", type: "homepage", label: "{college} homepage", query: "{college} official site", status: "Research link" },
            { id: "dept", type: "scoped", label: "{major} at {college}", query: "{college} {major}", siteQuery: "site:{domain} {major}", status: "Research link" },
            { id: "video", type: "search", engine: "youtube", label: "{major} student videos", query: "{college} {major} students", status: "Student perspective" },
            { id: "scorecard", type: "direct", label: "College Scorecard for {college}", url: "https://scorecard.example/?college={c}&major={m}", status: "Official source" },
          ],
        },
      ],
    },
    "collegeMajors.json": {
      _meta: { status: "Estimated", disclaimer: "Related majors are directional." },
      similarMajors: {
        "Computer Science": [{ name: "Data Science", relation: "Shares programming and analysis." }],
      },
    },
    "nearbyColleges.json": { byCollegeId: { swat: [{ name: "Haverford College" }] }, fallback: { state: "PA" } },
    "collegeProfiles.json": { profiles: { swat: { domain: "swarthmore.edu", homepage: "https://www.swarthmore.edu" } } },
    "colleges.json": [{ id: "swat", name: "Swarthmore College", alias: ["Swat"] }],
  };
  const scorecardResponses = options.scorecardResponses || [];

  const fetch = async (url) => {
    calls.push(String(url));
    if (fixtures[url]) {
      return { json: async () => fixtures[url] };
    }
    const next = scorecardResponses.shift();
    if (!next) {
      return { status: 200, json: async () => ({ results: [] }) };
    }
    if (next.status === 429) {
      return { status: 429, json: async () => ({}) };
    }
    return { status: next.status || 200, json: async () => next.body };
  };

  const context = {
    window: {
      __MAJORS: [
        { name: "Economics", category: "Social Sciences" },
        { name: "Public Policy", category: "Social Sciences" },
        { name: "Political Science", category: "Social Sciences" },
      ],
    },
    localStorage,
    fetch,
    encodeURIComponent,
    Promise,
    Date,
  };
  context.window.localStorage = localStorage;
  context.window.fetch = fetch;

  vm.runInNewContext(read("app/research-data.js"), context, { filename: "app/research-data.js" });
  return { Research: context.window.Research, window: context.window, localStorage, calls };
}

test("Research data resolves aliases, honest source labels, and encoded external links", async () => {
  const { Research } = createResearchHarness();

  await Research.load();
  const ctx = Research.contextFor("Swat", "Computer Science");
  assert.equal(ctx.collegeId, "swat");
  assert.equal(ctx.domain, "swarthmore.edu");

  assert.deepEqual(host(Research.nearbyFor("swat")), {
    list: [{ name: "Haverford College" }],
    fallback: { state: "PA" },
  });

  const category = Research.buildCategory("official", ctx);
  const links = Object.fromEntries(category.links.map((link) => [link.id, host(link)]));

  assert.equal(links.homepage.url, "https://www.swarthmore.edu");
  assert.equal(links.homepage.status, "Official source");
  assert.equal(links.dept.url, "https://google.example/search?q=site%3Aswarthmore.edu%20Computer%20Science");
  assert.equal(links.video.url, "https://youtube.example/results?search_query=Swat%20Computer%20Science%20students");
  assert.equal(links.scorecard.url, "https://scorecard.example/?college=Swat&major=Computer%20Science");
});

test("Research similar major data distinguishes curated and category fallbacks", async () => {
  const { Research } = createResearchHarness();

  await Research.load();

  assert.deepEqual(host(Research.similarMajorsFor("Computer Science")), {
    list: [{ name: "Data Science", relation: "Shares programming and analysis." }],
    status: "Estimated",
    disclaimer: "Related majors are directional.",
    source: "curated",
  });
  assert.deepEqual(host(Research.similarMajorsFor("Economics")), {
    list: [
      { name: "Public Policy", relation: "Same field: Social Sciences." },
      { name: "Political Science", relation: "Same field: Social Sciences." },
    ],
    status: "Estimated",
    disclaimer: "Related majors are directional.",
    source: "category",
  });
  assert.equal(Research.similarMajorsFor("Unknown Major").status, "Needs source");
});

test("Research scorecard lookup picks exact normalized matches and caches only successes", async () => {
  const scorecardBody = {
    results: [
      {
        "school.name": "Swarthmore College - Main Campus Extension",
        "school.school_url": "extension.example.edu",
        "latest.student.size": 300,
      },
      {
        "school.name": "Swarthmore College",
        "school.school_url": "www.swarthmore.edu",
        "latest.student.size": 1647,
        "latest.admissions.admission_rate.overall": 0.07,
        "latest.admissions.sat_scores.midpoint.critical_reading": 740,
        "latest.admissions.sat_scores.midpoint.math": 760,
        "latest.cost.tuition.in_state": 62000,
        "latest.cost.tuition.out_of_state": 62000,
        "latest.cost.avg_net_price.overall": 21000,
        "latest.completion.completion_rate_4yr_150nt": 0.92,
        "latest.earnings.10_yrs_after_entry.median": 84000,
      },
    ],
  };
  const { Research, localStorage, calls } = createResearchHarness({ scorecardResponses: [{ body: scorecardBody }] });

  await Research.load();
  const first = await Research.scorecardFor("Swarthmore College");
  const second = await Research.scorecardFor("Swarthmore College");
  const scorecardCalls = calls.filter((url) => url.startsWith("https://api.data.gov/ed/collegescorecard/"));

  assert.equal(scorecardCalls.length, 1, "a successful Scorecard match should be cached");
  assert.equal(first.matched, "Swarthmore College");
  assert.equal(second.matched, "Swarthmore College");
  assert.equal(first.homepage, "https://www.swarthmore.edu");
  assert.deepEqual(first.stats.map((stat) => host(stat)), [
    { label: "Enrollment", value: "1,647", sub: "Degree-seeking" },
    { label: "Acceptance rate", value: "7%", sub: "Highly selective" },
    { label: "SAT midpoint", value: "1500", sub: "Reading + math" },
    { label: "Tuition & fees", value: "$62,000", sub: "Before aid" },
    { label: "Avg net price", value: "$21,000", sub: "After aid" },
    { label: "Graduation rate", value: "92%", sub: "Within 6 years" },
    { label: "Median earnings", value: "$84,000", sub: "~10 yrs after entry" },
  ]);
  assert.match(localStorage.getItem("fbi-sc-swarthmore-college"), /Swarthmore College/);
});

test("Research scorecard lookup reports rate limits without poisoning the cache", async () => {
  const { Research, localStorage, calls } = createResearchHarness({
    scorecardResponses: [{ status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }],
  });

  await Research.load();
  assert.deepEqual(host(await Research.scorecardFor("Rate Limited College")), { error: "rate" });
  assert.deepEqual(host(await Research.scorecardFor("Rate Limited College")), { error: "rate" });

  const scorecardCalls = calls.filter((url) => url.startsWith("https://api.data.gov/ed/collegescorecard/"));
  assert.equal(scorecardCalls.length, 6, "rate-limit failures should be retried on later calls");
  assert.equal(localStorage.getItem("fbi-sc-rate-limited-college"), null);
});
