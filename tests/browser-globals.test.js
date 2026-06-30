const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function makeStorage(seed = {}) {
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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadUserContext(seed) {
  const localStorage = makeStorage(seed);
  const context = { window: {}, localStorage };
  context.window.window = context.window;
  context.window.localStorage = localStorage;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "app", "user-context.js"), "utf8"),
    context.window,
    { filename: "app/user-context.js" }
  );
  return { UserContext: context.window.UserContext, localStorage };
}

test("UserContext recovers from empty or malformed storage", () => {
  let harness = loadUserContext();
  assert.deepEqual(plain(harness.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  harness = loadUserContext({ "fbi-user-context-v1": "{not-json" });
  assert.equal(harness.UserContext.hasIdentity(), false);
  assert.deepEqual(plain(harness.UserContext.load()).selectedCollege, null);
});

test("UserContext persists identity, honest name fallback, and clear", () => {
  const { UserContext, localStorage } = loadUserContext();
  UserContext.update({
    displayName: "  Alex  ",
    selectedCollege: { name: "UC Berkeley", id: "berkeley", isManual: false },
    selectedMajor: { name: "Computer Science", category: "Computing", isManual: false },
    contextConfirmed: true,
  });

  assert.equal(UserContext.hasIdentity(), true);
  assert.equal(UserContext.nameOr("you"), "Alex");
  assert.equal(plain(UserContext.load()).selectedCollege.name, "UC Berkeley");

  UserContext.update({ displayName: "   " });
  assert.equal(UserContext.nameOr("you"), "you");

  UserContext.clear();
  assert.equal(localStorage.getItem(UserContext.KEY), null);
});

test("UserContext derives related majors without mutating explicit relations", () => {
  const { UserContext } = loadUserContext();
  const db = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "Nursing", category: "Health" },
  ];

  assert.deepEqual(
    plain(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, db, 2)),
    ["Data Science", "Information Science"]
  );
  assert.deepEqual(
    plain(UserContext.relatedMajorsFor({ relatedMajors: ["Statistics", "Applied Math"] }, db, 1)),
    ["Statistics"]
  );
});

function loadResearch(fixtures) {
  const localStorage = makeStorage();
  const context = {
    window: {
      __MAJORS: fixtures.majors || [],
    },
    localStorage,
    encodeURIComponent,
    Date,
    fetch: async (url) => ({
      json: async () => {
        if (!(url in fixtures)) throw new Error(`Unexpected fetch: ${url}`);
        return fixtures[url];
      },
    }),
  };
  context.window.window = context.window;
  context.window.localStorage = localStorage;
  context.window.fetch = context.fetch;
  context.window.encodeURIComponent = encodeURIComponent;
  context.window.Date = Date;

  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "app", "research-data.js"), "utf8"),
    context.window,
    { filename: "app/research-data.js" }
  );
  return { Research: context.window.Research, localStorage };
}

test("Research builds encoded personalized source links", async () => {
  const { Research } = loadResearch({
    "researchSources.json": {
      _meta: { engines: { google: "https://google.test/search?q=" } },
      categories: [],
    },
    "collegeMajors.json": { similarMajors: {} },
    "nearbyColleges.json": { byCollegeId: {}, fallback: {} },
    "collegeProfiles.json": { profiles: {} },
    "colleges.json": [],
  });
  await Research.load();

  const ctx = { college: "UC Berkeley", major: "Data Science & AI", domain: "berkeley.edu" };
  assert.deepEqual(plain(Research.buildOne({
    id: "catalog",
    type: "direct",
    label: "{college} {major} catalog",
    url: "https://catalog.test/{c}/{m}",
    status: "Official source",
  }, ctx)), {
    id: "catalog",
    label: "UC Berkeley Data Science & AI catalog",
    url: "https://catalog.test/UC%20Berkeley/Data%20Science%20%26%20AI",
    status: "Official source",
    note: "",
  });

  assert.equal(
    Research.buildOne({ id: "q", type: "search", engine: "google", query: "{college} {major}" }, ctx).url,
    "https://google.test/search?q=UC%20Berkeley%20Data%20Science%20%26%20AI"
  );
});

test("Research prefers official homepage data and flags similar-major provenance", async () => {
  const { Research } = loadResearch({
    "researchSources.json": {
      _meta: { engines: { google: "https://google.test/search?q=" } },
      categories: [],
    },
    "collegeMajors.json": {
      _meta: { status: "Estimated", disclaimer: "review locally" },
      similarMajors: {
        "Computer Science": [{ name: "Data Science", relation: "Shared computing foundation." }],
      },
    },
    "nearbyColleges.json": { byCollegeId: {}, fallback: {} },
    "collegeProfiles.json": {
      profiles: {
        berkeley: { domain: "berkeley.edu", homepage: "https://www.berkeley.edu/" },
      },
    },
    "colleges.json": [
      { id: "berkeley", name: "University of California, Berkeley", alias: ["UC Berkeley"] },
    ],
    majors: [
      { name: "Mathematics", category: "Math" },
      { name: "Statistics", category: "Math" },
      { name: "Applied Mathematics", category: "Math" },
    ],
  });
  await Research.load();

  const ctx = Research.contextFor("UC Berkeley", "Computer Science");
  assert.equal(plain(ctx).collegeId, "berkeley");
  assert.equal(
    Research.buildOne({ id: "home", type: "homepage", label: "{college} home", query: "{college}" }, ctx).url,
    "https://www.berkeley.edu/"
  );
  assert.equal(
    Research.buildOne({ id: "home", type: "homepage", label: "{college} home", query: "{college}" }, ctx).status,
    "Official source"
  );

  const curated = plain(Research.similarMajorsFor("Computer Science"));
  assert.equal(curated.source, "curated");
  assert.equal(curated.status, "Estimated");
  assert.deepEqual(curated.list, [{ name: "Data Science", relation: "Shared computing foundation." }]);

  const categoryFallback = plain(Research.similarMajorsFor("Mathematics"));
  assert.equal(categoryFallback.source, "category");
  assert.equal(categoryFallback.status, "Estimated");
  assert.deepEqual(categoryFallback.list.map((entry) => entry.name), ["Statistics", "Applied Mathematics"]);
});
