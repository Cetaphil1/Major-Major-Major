const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function jsonFromVm(value) {
  return JSON.parse(JSON.stringify(value));
}

function createLocalStorage(initial = {}) {
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
    dump() {
      return Object.fromEntries(store);
    },
  };
}

function createBrowserContext({ fetch, localStorage, windowProps } = {}) {
  const sandbox = {
    console,
    Date,
    Promise,
    URL,
    URLSearchParams,
    encodeURIComponent,
    fetch,
    localStorage: localStorage || createLocalStorage(),
  };
  sandbox.window = sandbox;
  Object.assign(sandbox.window, windowProps || {});
  return vm.createContext(sandbox);
}

function loadScript(relPath, context) {
  vm.runInContext(read(relPath), context, { filename: relPath });
}

test("UserContext recovers from bad storage and preserves saved identity patches", () => {
  const storage = createLocalStorage({ "fbi-user-context-v1": "{bad json" });
  const context = createBrowserContext({ localStorage: storage });
  loadScript("app/user-context.js", context);

  assert.deepEqual(jsonFromVm(context.window.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  context.window.UserContext.save({
    displayName: "Sam",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
    contextConfirmed: false,
    preLandingComplete: false,
  });
  context.window.UserContext.update({ preLandingComplete: true });

  const saved = jsonFromVm(context.window.UserContext.load());
  assert.equal(saved.displayName, "Sam");
  assert.equal(saved.selectedCollege.name, "Swarthmore College");
  assert.equal(saved.selectedMajor.name, "Political Science");
  assert.equal(saved.preLandingComplete, true);
  assert.equal(context.window.UserContext.nameOr("friend"), "Sam");
  assert.equal(context.window.UserContext.hasIdentity(), true);
});

test("UserContext related-major fallback is capped, category-based, and excludes the source major", () => {
  const context = createBrowserContext();
  loadScript("app/user-context.js", context);

  const db = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Systems", category: "Computing" },
    { name: "English", category: "Humanities" },
  ];

  assert.deepEqual(
    jsonFromVm(context.window.UserContext.relatedMajorsFor({ name: "Computer Science", relatedMajors: ["Data Science", "Cognitive Science"] }, db, 1)),
    ["Data Science"],
  );
  assert.deepEqual(
    jsonFromVm(context.window.UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, db, 5)),
    ["Data Science", "Information Systems"],
  );
});

test("Research builders label official homepages and search fallbacks honestly", async () => {
  const calls = [];
  const fixtures = {
    "researchSources.json": {
      _meta: {
        engines: {
          google: "https://www.google.com/search?q=",
          youtube: "https://www.youtube.com/results?search_query=",
        },
      },
      categories: [
        {
          id: "official",
          title: "Official",
          links: [
            { id: "homepage", label: "{college} homepage", type: "homepage", query: "{college} official website", status: "Research link" },
            { id: "department", label: "{college} {major} department", type: "scoped", siteQuery: "site:{domain} {major} department", query: "{college} {major} department", status: "Research link" },
            { id: "scorecard", label: "Scorecard", type: "direct", url: "https://collegescorecard.ed.gov/search/?search={c}", status: "Official source" },
          ],
        },
      ],
    },
    "collegeMajors.json": {
      _meta: { status: "Estimated", disclaimer: "Compare before switching." },
      similarMajors: {
        "Computer Science": [{ name: "Data Science", relation: "Shares programming and statistics." }],
      },
    },
    "nearbyColleges.json": { byCollegeId: {}, fallback: {} },
    "collegeProfiles.json": {
      profiles: {
        mit: { domain: "mit.edu", homepage: "https://www.mit.edu/" },
      },
    },
  };
  const context = createBrowserContext({
    windowProps: {
      __COLLEGES: [{ id: "mit", name: "Massachusetts Institute of Technology", alias: ["MIT"] }],
      __MAJORS: [
        { name: "History", category: "Humanities" },
        { name: "English", category: "Humanities" },
      ],
    },
    fetch: async (url) => {
      calls.push(String(url));
      return { json: async () => fixtures[url] || [] };
    },
  });
  loadScript("app/research-data.js", context);

  await context.window.Research.load();
  assert.equal(calls.includes("colleges.json"), false, "preloaded colleges should avoid a duplicate fetch");

  const ctx = context.window.Research.contextFor("MIT", "Computer Science");
  const officialLinks = jsonFromVm(context.window.Research.buildCategory("official", ctx).links);
  const homepage = officialLinks.find((link) => link.id === "homepage");
  const department = officialLinks.find((link) => link.id === "department");
  const scorecard = officialLinks.find((link) => link.id === "scorecard");

  assert.equal(homepage.url, "https://www.mit.edu/");
  assert.equal(homepage.status, "Official source");
  assert.equal(department.url, "https://www.google.com/search?q=site%3Amit.edu%20Computer%20Science%20department");
  assert.equal(scorecard.url, "https://collegescorecard.ed.gov/search/?search=MIT");
  assert.equal(scorecard.status, "Official source");

  const unknownLinks = jsonFromVm(context.window.Research.buildCategory("official", { college: "Unknown College", major: "Robotics" }).links);
  assert.equal(unknownLinks.find((link) => link.id === "homepage").status, "Research link");
  assert.equal(
    unknownLinks.find((link) => link.id === "homepage").url,
    "https://www.google.com/search?q=Unknown%20College%20official%20website",
  );

  assert.deepEqual(jsonFromVm(context.window.Research.similarMajorsFor("Computer Science")).list, [
    { name: "Data Science", relation: "Shares programming and statistics." },
  ]);
  assert.deepEqual(jsonFromVm(context.window.Research.similarMajorsFor("History")).list, [
    { name: "English", relation: "Same field: Humanities." },
  ]);
  assert.equal(context.window.Research.similarMajorsFor("Made Up Major").status, "Needs source");
});

test("Research Scorecard lookup formats official matches and caches only successes", async () => {
  const storage = createLocalStorage();
  const calls = [];
  const context = createBrowserContext({
    localStorage: storage,
    fetch: async (url) => {
      calls.push(String(url));
      return {
        status: 200,
        json: async () => ({
          results: [
            {
              "school.name": "University of California Berkeley",
              "school.school_url": "www.berkeley.edu",
              "latest.student.size": 33500,
              "latest.admissions.admission_rate.overall": 0.11,
              "latest.admissions.sat_scores.midpoint.critical_reading": 720,
              "latest.admissions.sat_scores.midpoint.math": 760,
              "latest.cost.tuition.in_state": 16000,
              "latest.cost.tuition.out_of_state": 49000,
              "latest.cost.avg_net_price.overall": 19000,
              "latest.completion.completion_rate_4yr_150nt": 0.81,
              "latest.earnings.10_yrs_after_entry.median": 94000,
            },
          ],
        }),
      };
    },
  });
  loadScript("app/research-data.js", context);

  const first = jsonFromVm(await context.window.Research.scorecardFor("University of California Berkeley"));
  const second = jsonFromVm(await context.window.Research.scorecardFor("University of California Berkeley"));

  assert.equal(calls.length, 1, "successful Scorecard matches should be reused from localStorage");
  assert.deepEqual(second, first);
  assert.equal(first.homepage, "https://www.berkeley.edu");
  assert.equal(first.matched, "University of California Berkeley");
  assert.deepEqual(first.stats.slice(0, 4), [
    { label: "Enrollment", value: "33,500", sub: "Degree-seeking" },
    { label: "Acceptance rate", value: "11%", sub: "Highly selective" },
    { label: "SAT midpoint", value: "1480", sub: "Reading + math" },
    { label: "In-state tuition", value: "$16,000", sub: "Out-of-state $49,000" },
  ]);

  const rateLimitedStorage = createLocalStorage();
  const rateLimitedCalls = [];
  const rateLimitedContext = createBrowserContext({
    localStorage: rateLimitedStorage,
    fetch: async (url) => {
      rateLimitedCalls.push(String(url));
      return { status: 429, json: async () => ({ results: [] }) };
    },
  });
  loadScript("app/research-data.js", rateLimitedContext);

  assert.deepEqual(jsonFromVm(await rateLimitedContext.window.Research.scorecardFor("Rate Limited University")), { error: "rate" });
  assert.equal(rateLimitedCalls.length, 3, "rate-limited lookups should exhaust all query fallbacks");
  assert.deepEqual(rateLimitedStorage.dump(), {}, "rate-limit errors should not be cached");
});
