const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function makeStorage(initial = {}) {
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

function toHost(value) {
  return JSON.parse(JSON.stringify(value));
}

function runScript(file, extraContext = {}) {
  const context = vm.createContext({
    console,
    window: {},
    localStorage: makeStorage(),
    Date,
    ...extraContext,
  });
  context.window = Object.assign(context.window, {
    localStorage: context.localStorage,
  });
  context.window.window = context.window;
  context.window.Date = context.Date;
  context.fetch = context.fetch || extraContext.fetch;
  context.window.fetch = context.fetch;

  const code = fs.readFileSync(path.join(repoRoot, file), "utf8");
  vm.runInContext(code, context, { filename: file });
  return context;
}

function jsonFetch(fixtures = {}) {
  const defaults = {
    "researchSources.json": JSON.parse(fs.readFileSync(path.join(repoRoot, "researchSources.json"), "utf8")),
    "collegeMajors.json": JSON.parse(fs.readFileSync(path.join(repoRoot, "collegeMajors.json"), "utf8")),
    "nearbyColleges.json": JSON.parse(fs.readFileSync(path.join(repoRoot, "nearbyColleges.json"), "utf8")),
    "collegeProfiles.json": JSON.parse(fs.readFileSync(path.join(repoRoot, "collegeProfiles.json"), "utf8")),
    "colleges.json": JSON.parse(fs.readFileSync(path.join(repoRoot, "colleges.json"), "utf8")),
  };
  const data = { ...defaults, ...fixtures };
  return async (url) => {
    const key = String(url).split("?")[0];
    if (!(key in data)) throw new Error(`unexpected fetch: ${url}`);
    return {
      status: 200,
      json: async () => data[key],
    };
  };
}

test("UserContext safely defaults, merges patches, and reports identity honestly", () => {
  const storage = makeStorage({ "fbi-user-context-v1": "{not-json" });
  const context = runScript("app/user-context.js", { localStorage: storage });
  const UC = context.window.UserContext;

  assert.deepEqual(toHost(UC.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
  assert.equal(UC.nameOr("friend"), "friend");
  assert.equal(UC.hasIdentity(), false);

  UC.update({
    displayName: "  Sam  ",
    selectedCollege: { name: "Swarthmore College", id: "swarthmore" },
    preLandingComplete: true,
  });
  UC.update({
    selectedMajor: { name: "Political Science", category: "Social Sciences" },
  });

  const saved = toHost(UC.load());
  assert.equal(saved.displayName, "  Sam  ");
  assert.equal(saved.selectedCollege.name, "Swarthmore College");
  assert.equal(saved.selectedMajor.name, "Political Science");
  assert.equal(saved.preLandingComplete, true);
  assert.equal(UC.nameOr("friend"), "Sam");
  assert.equal(UC.hasIdentity(), true);

  UC.clear();
  assert.equal(storage.getItem("fbi-user-context-v1"), null);
});

test("UserContext related-major fallback uses explicit data before same-category siblings", () => {
  const context = runScript("app/user-context.js");
  const UC = context.window.UserContext;
  const db = [
    { name: "Computer Science", category: "Computing", relatedMajors: ["Data Science", "Software Engineering"] },
    { name: "Mathematics", category: "Computing" },
    { name: "English", category: "Humanities" },
  ];

  assert.deepEqual(toHost(UC.relatedMajorsFor(db[0], db, 5)), ["Data Science", "Software Engineering"]);
  assert.deepEqual(toHost(UC.relatedMajorsFor({ name: "Mathematics", category: "Computing" }, db, 5)), [
    "Computer Science",
  ]);
  assert.deepEqual(toHost(UC.relatedMajorsFor({ name: "Undeclared" }, db, 5)), []);
});

test("Research helpers resolve aliases, encode link templates, and label similar-major provenance", async () => {
  const majors = JSON.parse(fs.readFileSync(path.join(repoRoot, "majors.json"), "utf8"));
  const context = runScript("app/research-data.js", {
    fetch: jsonFetch(),
    window: { __MAJORS: majors },
  });
  const Research = context.window.Research;

  await Research.load();

  const cal = toHost(Research.collegeRecordFor("cal"));
  assert.equal(cal.id, "uc-berkeley");
  assert.equal(toHost(Research.collegeRecordFor("Swarthmore College")).id, "swarthmore");

  const direct = Research.buildOne(
    {
      id: "program-search",
      type: "direct",
      label: "{major} at {college}",
      url: "https://example.edu/search?school={c}&program={m}",
      status: "Official source",
    },
    { college: "University of California, Berkeley", major: "Cognitive Science & AI" },
  );
  assert.equal(
    direct.url,
    "https://example.edu/search?school=University%20of%20California%2C%20Berkeley&program=Cognitive%20Science%20%26%20AI",
  );
  assert.equal(direct.label, "Cognitive Science & AI at University of California, Berkeley");

  const curated = toHost(Research.similarMajorsFor("Computer Science"));
  assert.equal(curated.source, "curated");
  assert.ok(curated.list.some((major) => major.name === "Data Science"));

  const category = toHost(Research.similarMajorsFor("Mathematics"));
  assert.equal(category.source, "category");
  assert.equal(category.status, "Estimated");
  assert.ok(category.list.some((major) => major.name !== "Mathematics"));
});

test("Research scorecard lookup picks exact matches, normalizes homepage URLs, and caches successes", async () => {
  let fetchCount = 0;
  const storage = makeStorage();
  const context = runScript("app/research-data.js", {
    localStorage: storage,
    fetch: async () => {
      fetchCount += 1;
      return {
        status: 200,
        json: async () => ({
          results: [
            {
              "school.name": "University of California, Berkeley Extension",
              "school.school_url": "extension.berkeley.edu",
              "latest.student.size": 400,
            },
            {
              "school.name": "University of California, Berkeley",
              "school.school_url": "www.berkeley.edu",
              "latest.student.size": 33000,
              "latest.admissions.admission_rate.overall": 0.12,
              "latest.cost.tuition.in_state": 14600,
              "latest.cost.tuition.out_of_state": 44100,
              "latest.completion.completion_rate_4yr_150nt": 0.84,
            },
          ],
        }),
      };
    },
  });

  const first = toHost(await context.window.Research.scorecardFor("University of California, Berkeley"));
  assert.equal(fetchCount, 1);
  assert.equal(first.matched, "University of California, Berkeley");
  assert.equal(first.homepage, "https://www.berkeley.edu");
  assert.ok(first.stats.some((stat) => stat.label === "Acceptance rate" && stat.value === "12%"));
  assert.ok(first.stats.some((stat) => stat.label === "In-state tuition" && stat.value === "$14,600"));

  const cached = toHost(await context.window.Research.scorecardFor("University of California, Berkeley"));
  assert.equal(fetchCount, 1, "successful scorecard matches should be reused from localStorage");
  assert.equal(cached.matched, first.matched);
});

test("Research scorecard rate limits are not cached as successful results", async () => {
  let fetchCount = 0;
  const storage = makeStorage();
  const context = runScript("app/research-data.js", {
    localStorage: storage,
    fetch: async () => {
      fetchCount += 1;
      return {
        status: 429,
        json: async () => {
          throw new Error("429 responses should not be parsed");
        },
      };
    },
  });

  const result = toHost(await context.window.Research.scorecardFor("Rate Limited University"));

  assert.deepEqual(result, { error: "rate" });
  assert.equal(fetchCount, 3, "scorecard lookup should try narrowed search terms before giving up");
  assert.deepEqual(storage.dump(), {}, "rate-limit failures must not poison the local cache");
});
