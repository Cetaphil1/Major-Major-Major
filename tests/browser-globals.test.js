const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const USER_CONTEXT_KEY = "fbi-user-context-v1";

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readJSON(relativePath) {
  return JSON.parse(readText(relativePath));
}

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
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
    snapshot() {
      return Object.fromEntries(data);
    },
  };
}

function createBrowserContext({ storage = createStorage(), window = {}, fetchImpl } = {}) {
  window.window = window;
  window.localStorage = storage;

  const sandbox = {
    window,
    localStorage: storage,
    fetch: fetchImpl,
    console,
    Date,
    Promise,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
  };

  return vm.createContext(sandbox);
}

function runGlobalScript(relativePath, context) {
  vm.runInContext(readText(relativePath), context, { filename: relativePath });
  return context.window;
}

function localFixtureFetch(overrides = {}) {
  const fixtures = {
    "researchSources.json": readJSON("researchSources.json"),
    "collegeMajors.json": readJSON("collegeMajors.json"),
    "nearbyColleges.json": readJSON("nearbyColleges.json"),
    "collegeProfiles.json": readJSON("collegeProfiles.json"),
    "colleges.json": readJSON("colleges.json"),
    ...overrides,
  };

  return async function fetchFixture(url) {
    if (typeof url === "string" && Object.prototype.hasOwnProperty.call(fixtures, url)) {
      return { status: 200, json: async () => fixtures[url] };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

async function loadResearch({ storage = createStorage(), fetchImpl = localFixtureFetch() } = {}) {
  const window = { __MAJORS: readJSON("majors.json") };
  const context = createBrowserContext({ storage, window, fetchImpl });
  runGlobalScript("app/research-data.js", context);
  await context.window.Research.load();
  return context;
}

test("UserContext recovers from corrupt storage and reports identity honestly", () => {
  const storage = createStorage({ [USER_CONTEXT_KEY]: "{not-valid-json" });
  const context = createBrowserContext({ storage });
  runGlobalScript("app/user-context.js", context);

  const UserContext = context.window.UserContext;
  assert.deepEqual(JSON.parse(JSON.stringify(UserContext.load())), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
  assert.equal(UserContext.nameOr("student"), "student");
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.save({
    ...UserContext.empty(),
    displayName: "  Maya  ",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });
  assert.equal(UserContext.nameOr("student"), "Maya");
  assert.equal(UserContext.hasIdentity(), true);
});

test("UserContext update merges partial patches without dropping completed flow state", () => {
  const storage = createStorage({
    [USER_CONTEXT_KEY]: JSON.stringify({
      displayName: "Maya",
      selectedCollege: { name: "University of California, Berkeley" },
      selectedMajor: null,
      contextConfirmed: false,
      preLandingComplete: true,
    }),
  });
  const context = createBrowserContext({ storage });
  runGlobalScript("app/user-context.js", context);

  const next = context.window.UserContext.update({
    selectedMajor: { name: "Computer Science" },
    contextConfirmed: true,
  });

  assert.equal(next.displayName, "Maya");
  assert.equal(next.selectedCollege.name, "University of California, Berkeley");
  assert.equal(next.selectedMajor.name, "Computer Science");
  assert.equal(next.preLandingComplete, true);
  assert.equal(JSON.parse(storage.snapshot()[USER_CONTEXT_KEY]).contextConfirmed, true);
});

test("UserContext relatedMajorsFor prefers explicit related majors and falls back by category", () => {
  const majors = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "Political Science", category: "Social Sciences" },
  ];
  const context = createBrowserContext({ window: { __MAJORS: majors } });
  runGlobalScript("app/user-context.js", context);

  const UserContext = context.window.UserContext;
  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "CS", relatedMajors: ["Data Science", "Math"] }, majors, 1)),
    ["Data Science"],
  );
  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, majors, 5)),
    ["Data Science", "Information Science"],
  );
});

test("Research resolves college aliases and verified profile metadata after fixture load", async () => {
  const context = await loadResearch();
  const Research = context.window.Research;

  assert.equal(Research.collegeRecordFor("cal").id, "uc-berkeley");
  assert.equal(Research.collegeRecordFor("University of California, Berkeley").id, "uc-berkeley");

  const ctx = Research.contextFor("University of California, Berkeley", "Computer Science");
  assert.equal(ctx.collegeId, "uc-berkeley");
  assert.equal(ctx.domain, "berkeley.edu");
  assert.equal(ctx.homepage, "https://www.berkeley.edu/");
});

test("Research links encode direct queries and use verified homepages when available", async () => {
  const context = await loadResearch();
  const Research = context.window.Research;
  const ctx = Research.contextFor("University of California, Berkeley", "Computer Science");
  const official = Research.buildCategory("official", ctx);

  const scorecard = official.links.find((link) => link.id === "scorecard");
  assert.equal(
    scorecard.url,
    "https://collegescorecard.ed.gov/search/?search=University%20of%20California%2C%20Berkeley",
  );

  const homepage = official.links.find((link) => link.id === "homepage");
  assert.equal(homepage.url, "https://www.berkeley.edu/");
  assert.equal(homepage.status, "Official source");

  const department = official.links.find((link) => link.id === "department");
  assert.match(department.url, /^https:\/\/www\.google\.com\/search\?q=/);
  assert.match(decodeURIComponent(department.url), /site:berkeley\.edu Computer Science department$/);
});

test("Research similar majors are sourced from curated data or flagged category fallback", async () => {
  const context = await loadResearch();
  const Research = context.window.Research;

  const curated = Research.similarMajorsFor("Political Science");
  assert.equal(curated.status, "Estimated");
  assert.equal(curated.source, "curated");
  assert.equal(curated.list[0].name, "International Relations");

  const fallback = Research.similarMajorsFor("Information Technology");
  assert.equal(fallback.status, "Estimated");
  assert.equal(fallback.source, "category");
  assert.equal(fallback.list[0].relation, "Same field: Computer and Information Sciences.");
  assert.ok(fallback.list.some((item) => item.name === "Computer Science"));

  const unknown = Research.similarMajorsFor("Made Up Major");
  assert.equal(unknown.status, "Needs source");
  assert.deepEqual(Array.from(unknown.list), []);
});

test("Research scorecardFor chooses the exact normalized school and caches only successful matches", async () => {
  const storage = createStorage();
  const fixtureFetch = localFixtureFetch();
  const fetchImpl = async (url) => {
    if (typeof url === "string" && url.startsWith("https://api.data.gov/ed/collegescorecard")) {
      return {
        status: 200,
        json: async () => ({
          results: [
            {
              "school.name": "California University of Management and Sciences",
              "school.school_url": "www.calums.edu",
              "latest.student.size": 100000,
            },
            {
              "school.name": "University of California-Berkeley",
              "school.school_url": "www.berkeley.edu",
              "latest.student.size": 33469,
              "latest.admissions.admission_rate.overall": 0.12,
              "latest.cost.tuition.in_state": 17721,
              "latest.cost.tuition.out_of_state": 55323,
            },
          ],
        }),
      };
    }
    return fixtureFetch(url);
  };
  const context = await loadResearch({ storage, fetchImpl });

  const result = JSON.parse(JSON.stringify(await context.window.Research.scorecardFor("University of California Berkeley")));
  assert.equal(result.matched, "University of California-Berkeley");
  assert.equal(result.homepage, "https://www.berkeley.edu");
  assert.deepEqual(
    result.stats.slice(0, 3).map((stat) => [stat.label, stat.value]),
    [
      ["Enrollment", "33,469"],
      ["Acceptance rate", "12%"],
      ["In-state tuition", "$17,721"],
    ],
  );
  assert.ok(storage.snapshot()["fbi-sc-university-of-california-berkeley"]);
});

test("Research scorecardFor does not cache rate-limit failures", async () => {
  const storage = createStorage();
  const fixtureFetch = localFixtureFetch();
  const fetchImpl = async (url) => {
    if (typeof url === "string" && url.startsWith("https://api.data.gov/ed/collegescorecard")) {
      return { status: 429, json: async () => ({ results: [] }) };
    }
    return fixtureFetch(url);
  };
  const context = await loadResearch({ storage, fetchImpl });

  const result = JSON.parse(JSON.stringify(await context.window.Research.scorecardFor("Rate Limited University")));
  assert.deepEqual(result, { error: "rate" });
  assert.equal(storage.snapshot()["fbi-sc-rate-limited-university"], undefined);
});
