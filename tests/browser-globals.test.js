const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function host(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
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
    snapshot() {
      return Object.fromEntries(store.entries());
    },
  };
}

function loadUserContext(initialStorage) {
  const localStorage = createStorage(initialStorage);
  const context = {
    localStorage,
    window: {},
  };
  vm.createContext(context);
  vm.runInContext(read("app/user-context.js"), context, { filename: "app/user-context.js" });
  return { UserContext: context.window.UserContext, localStorage };
}

function loadResearchContext({ fetchImpl, initialStorage, majors } = {}) {
  const localStorage = createStorage(initialStorage);
  const window = {};
  if (majors) window.__MAJORS = majors;
  const context = {
    fetch: fetchImpl,
    localStorage,
    window,
  };
  vm.createContext(context);
  vm.runInContext(read("app/research-data.js"), context, { filename: "app/research-data.js" });
  return { Research: context.window.Research, window: context.window, localStorage };
}

test("UserContext recovers from malformed storage and preserves partial updates", () => {
  const { UserContext, localStorage } = loadUserContext({
    "fbi-user-context-v1": "{not valid json",
  });

  assert.deepEqual(host(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  UserContext.update({
    displayName: "  Maya  ",
    selectedCollege: { name: "Swarthmore College", id: "swat", isManual: false },
  });
  UserContext.update({ contextConfirmed: true });

  assert.equal(UserContext.nameOr("friend"), "Maya");
  assert.equal(UserContext.hasIdentity(), false, "major is required before identity is complete");

  UserContext.update({
    selectedMajor: { name: "Political Science", category: "Social sciences", isManual: false },
    preLandingComplete: true,
  });

  assert.equal(UserContext.hasIdentity(), true);
  assert.deepEqual(host(UserContext.load()), {
    displayName: "  Maya  ",
    selectedCollege: { name: "Swarthmore College", id: "swat", isManual: false },
    selectedMajor: { name: "Political Science", category: "Social sciences", isManual: false },
    contextConfirmed: true,
    preLandingComplete: true,
  });

  UserContext.clear();
  assert.equal(localStorage.snapshot()["fbi-user-context-v1"], undefined);
  assert.equal(UserContext.nameOr(), "you");
});

test("UserContext related majors prefer explicit mappings and fall back by category", () => {
  const { UserContext } = loadUserContext();
  const explicit = UserContext.relatedMajorsFor({
    name: "Computer Science",
    category: "Computing",
    relatedMajors: ["Data Science", "Information Science", "Cognitive Science"],
  }, [], 2);

  assert.deepEqual(Array.from(explicit), ["Data Science", "Information Science"]);

  const fallback = UserContext.relatedMajorsFor(
    { name: "Political Science", category: "Social sciences" },
    [
      { name: "Political Science", category: "Social sciences" },
      { name: "Public Policy", category: "Social sciences" },
      { name: "Economics", category: "Social sciences" },
      { name: "Music", category: "Arts" },
    ],
    5,
  );

  assert.deepEqual(Array.from(fallback), ["Public Policy", "Economics"]);
});

test("Research data builds official and search links from cached college context", async () => {
  const fixtureByPath = {
    "researchSources.json": {
      _meta: { engines: { google: "https://search.test/?q=", youtube: "https://video.test/?q=" } },
      categories: [
        {
          id: "fit",
          title: "Fit research",
          blurb: "Research the pairing",
          links: [
            { id: "home", type: "homepage", label: "{college} homepage", query: "{college} official", status: "Research link" },
            { id: "program", type: "scoped", label: "{major} at {college}", siteQuery: "site:{domain} {major}", query: "{college} {major}", status: "Research link" },
            { id: "direct", type: "direct", label: "Compare", url: "https://tool.test/?college={c}&major={m}", status: "Official source" },
          ],
        },
      ],
    },
    "collegeMajors.json": {
      _meta: { status: "Estimated", disclaimer: "Use as a starting point." },
      similarMajors: {
        "Computer Science": [{ name: "Data Science", relation: "Same computational core." }],
      },
    },
    "nearbyColleges.json": { byCollegeId: { swat: [{ name: "Bryn Mawr College" }] }, fallback: { state: "PA" } },
    "collegeProfiles.json": {
      profiles: {
        swat: { domain: "swarthmore.edu", homepage: "https://www.swarthmore.edu/" },
      },
    },
    "colleges.json": [
      { id: "swat", name: "Swarthmore College", alias: ["Swat"] },
      { id: "mit", name: "Massachusetts Institute of Technology", alias: [] },
    ],
  };
  const fetches = [];
  const { Research } = loadResearchContext({
    majors: [
      { name: "Political Science", category: "Social sciences" },
      { name: "Public Policy", category: "Social sciences" },
    ],
    fetchImpl: async (url) => {
      fetches.push(String(url));
      return {
        json: async () => fixtureByPath[String(url)],
      };
    },
  });

  await Research.load();

  assert.deepEqual(fetches.sort(), [
    "collegeMajors.json",
    "collegeProfiles.json",
    "colleges.json",
    "nearbyColleges.json",
    "researchSources.json",
  ]);
  assert.equal(Research.collegeRecordFor("Swat").id, "swat");

  const ctx = Research.contextFor("Swat", "Computer Science");
  assert.equal(ctx.collegeId, "swat");
  assert.equal(ctx.homepage, "https://www.swarthmore.edu/");

  const links = host(Research.buildCategory("fit", ctx).links);
  assert.deepEqual(links, [
    {
      id: "home",
      label: "Swat homepage",
      url: "https://www.swarthmore.edu/",
      status: "Official source",
      note: "",
    },
    {
      id: "program",
      label: "Computer Science at Swat",
      url: "https://search.test/?q=site%3Aswarthmore.edu%20Computer%20Science",
      status: "Research link",
      note: "",
    },
    {
      id: "direct",
      label: "Compare",
      url: "https://tool.test/?college=Swat&major=Computer%20Science",
      status: "Official source",
      note: "",
    },
  ]);

  assert.deepEqual(host(Research.similarMajorsFor("Computer Science")), {
    list: [{ name: "Data Science", relation: "Same computational core." }],
    status: "Estimated",
    disclaimer: "Use as a starting point.",
    source: "curated",
  });
  assert.deepEqual(host(Research.similarMajorsFor("Political Science")), {
    list: [{ name: "Public Policy", relation: "Same field: Social sciences." }],
    status: "Estimated",
    disclaimer: "Use as a starting point.",
    source: "category",
  });
});

test("Research Scorecard caches successful matches and normalizes stat values", async () => {
  const scorecardFetches = [];
  const { Research, localStorage } = loadResearchContext({
    fetchImpl: async (url) => {
      scorecardFetches.push(String(url));
      return {
        status: 200,
        json: async () => ({
          results: [
            {
              "school.name": "Swarthmore College",
              "school.school_url": "www.swarthmore.edu",
              "latest.student.size": 1664,
              "latest.admissions.admission_rate.overall": 0.07,
              "latest.admissions.sat_scores.midpoint.critical_reading": 740,
              "latest.admissions.sat_scores.midpoint.math": 760,
              "latest.cost.tuition.in_state": 65000,
              "latest.cost.tuition.out_of_state": 65000,
              "latest.cost.avg_net_price.overall": 20500,
              "latest.completion.completion_rate_4yr_150nt": 0.91,
              "latest.earnings.10_yrs_after_entry.median": 81000,
            },
          ],
        }),
      };
    },
  });

  const result = host(await Research.scorecardFor("Swarthmore College"));
  assert.equal(result.homepage, "https://www.swarthmore.edu");
  assert.equal(result.matched, "Swarthmore College");
  assert.deepEqual(result.stats, [
    { label: "Enrollment", value: "1,664", sub: "Degree-seeking" },
    { label: "Acceptance rate", value: "7%", sub: "Highly selective" },
    { label: "SAT midpoint", value: "1500", sub: "Reading + math" },
    { label: "Tuition & fees", value: "$65,000", sub: "Before aid" },
    { label: "Avg net price", value: "$20,500", sub: "After aid" },
    { label: "Graduation rate", value: "91%", sub: "Within 6 years" },
    { label: "Median earnings", value: "$81,000", sub: "~10 yrs after entry" },
  ]);
  assert.equal(scorecardFetches.length, 1);
  assert.match(localStorage.snapshot()["fbi-sc-swarthmore-college"], /Swarthmore College/);

  const cached = host(await Research.scorecardFor("Swarthmore College"));
  assert.deepEqual(cached, result);
  assert.equal(scorecardFetches.length, 1, "cached scorecard results should avoid another network call");
});

test("Research Scorecard rate limits are reported without poisoning cache", async () => {
  const { Research, localStorage } = loadResearchContext({
    fetchImpl: async () => ({
      status: 429,
      json: async () => ({ results: [] }),
    }),
  });

  assert.deepEqual(host(await Research.scorecardFor("Rate Limited University")), { error: "rate" });
  assert.equal(localStorage.snapshot()["fbi-sc-rate-limited-university"], undefined);
});
