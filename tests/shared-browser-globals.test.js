const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
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
    keys() {
      return [...store.keys()];
    },
  };
}

function runBrowserScript(relPath, extras = {}) {
  const context = {
    console,
    Promise,
    Date,
    encodeURIComponent,
    localStorage: extras.localStorage || createStorage(),
    fetch: extras.fetch || (() => Promise.reject(new Error("unexpected fetch"))),
    __MAJORS: extras.__MAJORS || [],
    __COLLEGES: extras.__COLLEGES,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read(relPath), context, { filename: relPath });
  return context;
}

function response(json, status = 200) {
  return { status, json: () => Promise.resolve(json) };
}

describe("UserContext browser global", () => {
  it("recovers from malformed storage and preserves existing fields on partial updates", () => {
    const storage = createStorage({ "fbi-user-context-v1": "not json" });
    const ctx = runBrowserScript("app/user-context.js", { localStorage: storage });
    const { UserContext } = ctx.window;

    assert.deepEqual(JSON.parse(JSON.stringify(UserContext.load())), JSON.parse(JSON.stringify(UserContext.empty())));

    UserContext.update({
      displayName: "Sam",
      selectedCollege: { name: "Swarthmore College", id: "swat" },
    });
    UserContext.update({ contextConfirmed: true });

    assert.deepEqual(JSON.parse(JSON.stringify(UserContext.load())), {
      displayName: "Sam",
      selectedCollege: { name: "Swarthmore College", id: "swat" },
      selectedMajor: null,
      contextConfirmed: true,
      preLandingComplete: false,
    });
  });

  it("requires both college and major names for identity and clears stored context", () => {
    const storage = createStorage();
    const ctx = runBrowserScript("app/user-context.js", { localStorage: storage });
    const { UserContext } = ctx.window;

    UserContext.update({ selectedCollege: { name: "Swarthmore College" } });
    assert.equal(UserContext.hasIdentity(), false);

    UserContext.update({ selectedMajor: { name: "Political Science" } });
    assert.equal(UserContext.hasIdentity(), true);

    UserContext.clear();
    assert.equal(storage.getItem(UserContext.KEY), null);
    assert.equal(UserContext.hasIdentity(), false);
  });

  it("uses explicit related majors before same-category fallback", () => {
    const ctx = runBrowserScript("app/user-context.js", {
      __MAJORS: [
        { name: "Political Science", category: "Social Sciences" },
        { name: "Economics", category: "Social Sciences" },
        { name: "Sociology", category: "Social Sciences" },
        { name: "Computer Science", category: "STEM" },
      ],
    });
    const { UserContext } = ctx.window;

    assert.deepEqual(
      Array.from(UserContext.relatedMajorsFor({ name: "Political Science", relatedMajors: ["Public Policy", "Economics"] }, [], 1)),
      ["Public Policy"],
    );
    assert.deepEqual(
      Array.from(UserContext.relatedMajorsFor({ name: "Political Science", category: "Social Sciences" }, null, 2)),
      ["Economics", "Sociology"],
    );
  });
});

describe("Research browser global", () => {
  it("builds official homepage links and URL-encodes direct college/major placeholders", async () => {
    const fetch = (url) => {
      const fixtures = {
        "researchSources.json": {
          _meta: { engines: { google: "https://google.test/search?q=" } },
          categories: [{
            id: "official",
            title: "Official",
            links: [
              { id: "home", type: "homepage", label: "{college} homepage", query: "{college} {major} official", status: "Research link" },
              { id: "direct", type: "direct", label: "Search {major}", url: "https://example.test/find?college={c}&major={m}", status: "Official tool" },
            ],
          }],
        },
        "collegeMajors.json": {
          _meta: { status: "Estimated", disclaimer: "Preview relationships." },
          similarMajors: {
            "Political Science": [{ name: "Public Policy", relation: "Shared policy focus." }],
          },
        },
        "nearbyColleges.json": { byCollegeId: {}, fallback: {} },
        "collegeProfiles.json": {
          profiles: {
            swat: { domain: "swarthmore.edu", homepage: "https://www.swarthmore.edu" },
          },
        },
        "colleges.json": [
          { id: "swat", name: "Swarthmore College", alias: ["Swat"] },
        ],
      };
      return Promise.resolve(response(fixtures[url]));
    };
    const ctx = runBrowserScript("app/research-data.js", { fetch });

    await ctx.window.Research.load();
    const researchCtx = ctx.window.Research.contextFor("Swat", "Political Science & Government");
    const category = ctx.window.Research.buildCategory("official", researchCtx);

    assert.equal(researchCtx.collegeId, "swat");
    assert.equal(category.links[0].url, "https://www.swarthmore.edu");
    assert.equal(category.links[0].status, "Official source");
    assert.equal(category.links[1].url, "https://example.test/find?college=Swat&major=Political%20Science%20%26%20Government");
    assert.equal(category.links[1].label, "Search Political Science & Government");
  });

  it("labels similar-major provenance honestly across curated, category, and unmapped results", async () => {
    const fetch = (url) => Promise.resolve(response({
      "researchSources.json": { _meta: { engines: {} }, categories: [] },
      "collegeMajors.json": {
        _meta: { status: "Estimated", disclaimer: "Preview relationships." },
        similarMajors: {
          "Political Science": [{ name: "Public Policy", relation: "Shared policy focus." }],
        },
      },
      "nearbyColleges.json": { byCollegeId: {}, fallback: {} },
      "collegeProfiles.json": { profiles: {} },
      "colleges.json": [],
    }[url]));
    const ctx = runBrowserScript("app/research-data.js", {
      fetch,
      __MAJORS: [
        { name: "Economics", category: "Social Sciences" },
        { name: "Sociology", category: "Social Sciences" },
        { name: "Anthropology", category: "Social Sciences" },
      ],
    });

    await ctx.window.Research.load();

    const curated = ctx.window.Research.similarMajorsFor("Political Science");
    assert.equal(curated.status, "Estimated");
    assert.equal(curated.source, "curated");
    assert.deepEqual(JSON.parse(JSON.stringify(curated.list)), [{ name: "Public Policy", relation: "Shared policy focus." }]);

    const category = ctx.window.Research.similarMajorsFor("Economics");
    assert.equal(category.status, "Estimated");
    assert.equal(category.source, "category");
    assert.deepEqual(JSON.parse(JSON.stringify(category.list)), [
      { name: "Sociology", relation: "Same field: Social Sciences." },
      { name: "Anthropology", relation: "Same field: Social Sciences." },
    ]);

    const missing = ctx.window.Research.similarMajorsFor("Unknown Major");
    assert.equal(missing.status, "Needs source");
    assert.deepEqual(JSON.parse(JSON.stringify(missing.list)), []);
  });

  it("does not cache College Scorecard rate-limit responses", async () => {
    const storage = createStorage();
    let calls = 0;
    const fetch = () => {
      calls += 1;
      return Promise.resolve({ status: 429, json: () => Promise.reject(new Error("rate limited")) });
    };
    const ctx = runBrowserScript("app/research-data.js", { fetch, localStorage: storage });

    const result = await ctx.window.Research.scorecardFor("Swarthmore College");

    assert.deepEqual(JSON.parse(JSON.stringify(result)), { error: "rate" });
    assert.equal(calls, 3, "all fallback query attempts should be tried before returning rate");
    assert.deepEqual(storage.keys(), []);
  });

  it("formats and caches successful College Scorecard matches", async () => {
    const storage = createStorage();
    let calls = 0;
    const fetch = () => {
      calls += 1;
      return Promise.resolve(response({
        results: [{
          "school.name": "Swarthmore College",
          "school.school_url": "www.swarthmore.edu",
          "latest.student.size": 1647,
          "latest.admissions.admission_rate.overall": 0.07,
          "latest.admissions.sat_scores.midpoint.critical_reading": 750,
          "latest.admissions.sat_scores.midpoint.math": 770,
          "latest.cost.tuition.in_state": 65000,
          "latest.cost.tuition.out_of_state": 65000,
          "latest.cost.avg_net_price.overall": 21000,
          "latest.completion.completion_rate_4yr_150nt": 0.91,
          "latest.earnings.10_yrs_after_entry.median": 74000,
        }],
      }));
    };
    const ctx = runBrowserScript("app/research-data.js", { fetch, localStorage: storage });

    const result = await ctx.window.Research.scorecardFor("Swarthmore College");
    const cached = await ctx.window.Research.scorecardFor("Swarthmore College");

    assert.equal(calls, 1, "second lookup should use the cache");
    assert.equal(cached.matched, "Swarthmore College");
    assert.equal(result.homepage, "https://www.swarthmore.edu");
    assert.deepEqual(JSON.parse(JSON.stringify(result.stats.slice(0, 3))), [
      { label: "Enrollment", value: "1,647", sub: "Degree-seeking" },
      { label: "Acceptance rate", value: "7%", sub: "Highly selective" },
      { label: "SAT midpoint", value: "1520", sub: "Reading + math" },
    ]);
  });
});
