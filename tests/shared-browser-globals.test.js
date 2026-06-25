const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    dump() {
      return Object.fromEntries(data);
    },
  };
}

async function runBrowserScript(scriptPath, globals = {}) {
  const source = await readFile(path.join(ROOT, scriptPath), "utf8");
  const context = {
    console,
    Promise,
    Date,
    encodeURIComponent,
    localStorage: globals.localStorage || createStorage(),
    fetch: globals.fetch,
    window: {},
  };
  context.window = Object.assign(context.window, globals.window || {});
  context.window.localStorage = context.localStorage;
  context.window.fetch = context.fetch;
  context.window.Date = Date;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: scriptPath });
  return context;
}

test("UserContext safely recovers from bad storage and preserves partial updates", async () => {
  const storage = createStorage({
    "fbi-user-context-v1": "{bad json",
  });
  const context = await runBrowserScript("app/user-context.js", { localStorage: storage });
  const UC = context.window.UserContext;

  assert.deepEqual(JSON.parse(JSON.stringify(UC.load())), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  UC.save({
    displayName: "  Maya  ",
    selectedCollege: null,
    selectedMajor: { name: "Computer Science" },
    contextConfirmed: false,
    preLandingComplete: true,
  });
  UC.update({
    selectedCollege: { name: "University of California, Berkeley" },
    contextConfirmed: true,
  });

  const saved = UC.load();
  assert.equal(saved.displayName, "  Maya  ");
  assert.equal(saved.selectedMajor.name, "Computer Science");
  assert.equal(saved.selectedCollege.name, "University of California, Berkeley");
  assert.equal(saved.contextConfirmed, true);
  assert.equal(saved.preLandingComplete, true);
  assert.equal(UC.nameOr("friend"), "Maya");
  assert.equal(UC.hasIdentity(), true);
});

test("UserContext related major fallback is category-based, limited, and excludes the current major", async () => {
  const context = await runBrowserScript("app/user-context.js");
  const UC = context.window.UserContext;
  const db = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Systems", category: "Computing" },
    { name: "History", category: "Humanities" },
  ];

  assert.deepEqual(
    Array.from(UC.relatedMajorsFor({ name: "Computer Science", relatedMajors: ["Data Science", "Cybersecurity"] }, db, 1)),
    ["Data Science"],
  );
  assert.deepEqual(
    Array.from(UC.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, db, 5)),
    ["Data Science", "Information Systems"],
  );
  assert.deepEqual(Array.from(UC.relatedMajorsFor({ name: "History" }, db, 5)), []);
});

async function createResearchContext({ fetchImpl } = {}) {
  const storage = createStorage();
  const fetchJSON = async (filePath) => ({
    async json() {
      const text = await readFile(path.join(ROOT, filePath), "utf8");
      return JSON.parse(text);
    },
  });
  const context = await runBrowserScript("app/research-data.js", {
    localStorage: storage,
    fetch: fetchImpl || fetchJSON,
  });
  context.window.__MAJORS = JSON.parse(await readFile(path.join(ROOT, "majors.json"), "utf8"));
  await context.window.Research.load();
  return { context, storage };
}

test("Research builds official/profile links without disguising fallback search links", async () => {
  const { context } = await createResearchContext();
  const Research = context.window.Research;

  const known = Research.contextFor("cal", "Computer Science");
  assert.equal(known.collegeId, "uc-berkeley");
  assert.equal(known.domain, "berkeley.edu");

  const knownOfficial = Research.buildCategory("official", known);
  const knownHomepage = knownOfficial.links.find((link) => link.id === "homepage");
  const knownAdmissions = knownOfficial.links.find((link) => link.id === "admissions");
  assert.equal(knownHomepage.status, "Official source");
  assert.equal(knownHomepage.url, "https://www.berkeley.edu/");
  assert.match(knownAdmissions.url, /^https:\/\/www\.google\.com\/search\?q=/);
  assert.match(decodeURIComponent(knownAdmissions.url), /site:berkeley\.edu admissions/);

  const unknown = Research.contextFor("Unknown College", "Computer Science");
  const unknownHomepage = Research.buildCategory("official", unknown).links.find((link) => link.id === "homepage");
  assert.equal(unknownHomepage.status, "Research link");
  assert.match(decodeURIComponent(unknownHomepage.url), /Unknown College official website/);
});

test("Research similar majors distinguish curated, category fallback, and unknown data", async () => {
  const { context } = await createResearchContext();
  const Research = context.window.Research;

  const curated = Research.similarMajorsFor("Computer Science");
  assert.equal(curated.status, "Estimated");
  assert.equal(curated.source, "curated");
  assert.equal(curated.list.length, 7);
  assert.equal(curated.list[0].name, "Data Science");

  const fallback = Research.similarMajorsFor("Cybersecurity");
  assert.equal(fallback.status, "Estimated");
  assert.equal(fallback.source, "category");
  assert.ok(fallback.list.length > 0);
  assert.equal(fallback.list.some((major) => major.name === "Cybersecurity"), false);
  assert.match(fallback.list[0].relation, /^Same field:/);

  const missing = Research.similarMajorsFor("Totally New Major");
  assert.equal(missing.status, "Needs source");
  assert.deepEqual(Array.from(missing.list), []);
});

test("Research scorecard lookup chooses a matching school, formats stats, and caches successes only", async () => {
  const scorecardResponses = [
    {
      results: [
        {
          "school.name": "University of California, Berkeley",
          "school.school_url": "berkeley.edu",
          "latest.student.size": 33469,
          "latest.admissions.admission_rate.overall": 0.12,
          "latest.admissions.sat_scores.midpoint.critical_reading": 720,
          "latest.admissions.sat_scores.midpoint.math": 780,
          "latest.cost.tuition.in_state": 17721,
          "latest.cost.tuition.out_of_state": 55323,
          "latest.cost.avg_net_price.overall": 17371,
          "latest.completion.completion_rate_4yr_150nt": 0.94,
          "latest.earnings.10_yrs_after_entry.median": 74900,
        },
      ],
    },
  ];
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url.startsWith("https://api.data.gov/")) {
      return {
        status: 200,
        async json() {
          return scorecardResponses.shift() || { results: [] };
        },
      };
    }

    return {
      async json() {
        const text = await readFile(path.join(ROOT, url), "utf8");
        return JSON.parse(text);
      },
    };
  };
  const { context, storage } = await createResearchContext({ fetchImpl });
  const Research = context.window.Research;

  const first = await Research.scorecardFor("University of California, Berkeley");
  const second = await Research.scorecardFor("University of California, Berkeley");

  assert.equal(first.matched, "University of California, Berkeley");
  assert.equal(first.homepage, "https://berkeley.edu");
  assert.deepEqual(first.stats.slice(0, 3).map((stat) => stat.label), [
    "Enrollment",
    "Acceptance rate",
    "SAT midpoint",
  ]);
  assert.equal(first.stats.find((stat) => stat.label === "Acceptance rate").value, "12%");
  assert.deepEqual(JSON.parse(JSON.stringify(second)), JSON.parse(JSON.stringify(first)));
  assert.equal(requested.filter((url) => url.startsWith("https://api.data.gov/")).length, 1);
  assert.ok(storage.dump()["fbi-sc-university-of-california-berkeley"], "successful scorecard match should be cached");
});
