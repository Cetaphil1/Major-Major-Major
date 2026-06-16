const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

function makeResponse(body, status = 200) {
  return {
    status,
    json: async () => body,
  };
}

async function loadResearch(options = {}) {
  const fileResponses = {
    "researchSources.json": readJSON("researchSources.json"),
    "collegeMajors.json": readJSON("collegeMajors.json"),
    "nearbyColleges.json": readJSON("nearbyColleges.json"),
    "collegeProfiles.json": readJSON("collegeProfiles.json"),
    "colleges.json": readJSON("colleges.json"),
    ...(options.fileResponses || {}),
  };
  const scorecardResponses = options.scorecardResponses || [];
  const requests = [];
  const localStorage = options.localStorage || makeStorage();
  const context = {
    console,
    encodeURIComponent,
    Date,
    Promise,
    localStorage,
  };
  context.window = {
    __MAJORS: options.majors || [],
  };
  context.fetch = async (url) => {
    requests.push(url);
    if (fileResponses[url]) return makeResponse(fileResponses[url]);
    if (url.startsWith("https://api.data.gov/ed/collegescorecard/v1/schools")) {
      const next = scorecardResponses.shift();
      if (!next) return makeResponse({ results: [] });
      return makeResponse(next.body, next.status || 200);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  context.window.fetch = context.fetch;
  context.window.localStorage = localStorage;

  vm.createContext(context);
  const source = fs.readFileSync(path.join(root, "app/research-data.js"), "utf8");
  vm.runInContext(source, context, { filename: "app/research-data.js" });
  await context.window.Research.load();

  return { Research: context.window.Research, window: context.window, requests, localStorage };
}

test("builds official and scoped research links with honest source labels", async () => {
  const { Research } = await loadResearch();
  const ctx = Research.contextFor("cal", "Computer Science");

  assert.equal(ctx.collegeId, "uc-berkeley");
  assert.equal(ctx.domain, "berkeley.edu");

  const official = Research.buildCategory("official", ctx);
  const scorecard = official.links.find((link) => link.id === "scorecard");
  const homepage = official.links.find((link) => link.id === "homepage");
  const department = official.links.find((link) => link.id === "department");

  assert.equal(scorecard.status, "Official source");
  assert.equal(scorecard.url, "https://collegescorecard.ed.gov/search/?search=cal");
  assert.equal(homepage.status, "Official source");
  assert.equal(homepage.url, "https://www.berkeley.edu/");
  assert.equal(
    department.url,
    "https://www.google.com/search?q=site%3Aberkeley.edu%20Computer%20Science%20department",
  );
});

test("falls back to labeled research links when a verified homepage is unavailable", async () => {
  const { Research } = await loadResearch();
  const ctx = Research.contextFor("Unlisted College", "Design");

  const homepage = Research.buildCategory("official", ctx).links.find((link) => link.id === "homepage");

  assert.equal(homepage.status, "Research link");
  assert.equal(homepage.url, "https://www.google.com/search?q=Unlisted%20College%20official%20website");
});

test("labels similar-major fallbacks as estimated and excludes the selected major", async () => {
  const { Research } = await loadResearch({
    majors: [
      { name: "Urban Planning", category: "Design" },
      { name: "Architecture", category: "Design" },
      { name: "Landscape Architecture", category: "Design" },
      { name: "Accounting", category: "Business" },
    ],
  });

  const result = Research.similarMajorsFor("Urban Planning");

  assert.equal(result.status, "Estimated");
  assert.equal(result.source, "category");
  assert.deepEqual(
    result.list.map((major) => major.name),
    ["Architecture", "Landscape Architecture"],
  );
});

test("uses the best Scorecard match, normalizes homepage URLs, and caches successful lookups", async () => {
  const { Research, requests, localStorage } = await loadResearch({
    scorecardResponses: [
      {
        body: {
          results: [
            {
              "school.name": "Springfield Career Institute",
              "school.school_url": "career.example.edu",
              "latest.student.size": 9000,
              "latest.admissions.admission_rate.overall": 0.85,
            },
            {
              "school.name": "Springfield University-Main Campus",
              "school.school_url": "springfield.example.edu",
              "latest.student.size": 24000,
              "latest.admissions.admission_rate.overall": 0.42,
              "latest.cost.tuition.in_state": 12000,
              "latest.cost.tuition.out_of_state": 28000,
              "latest.completion.completion_rate_4yr_150nt": 0.68,
            },
          ],
        },
      },
    ],
  });

  const first = await Research.scorecardFor("Springfield University");
  const second = await Research.scorecardFor("Springfield University");

  assert.equal(first.matched, "Springfield University-Main Campus");
  assert.equal(first.homepage, "https://springfield.example.edu");
  assert.deepEqual(
    first.stats.map((stat) => stat.label),
    ["Enrollment", "Acceptance rate", "In-state tuition", "Graduation rate"],
  );
  assert.deepEqual(second, first);
  assert.equal(
    requests.filter((url) => url.startsWith("https://api.data.gov/ed/collegescorecard")).length,
    1,
  );
  assert.match(Object.keys(localStorage.snapshot())[0], /^fbi-sc-springfield-university$/);
});

test("does not cache Scorecard rate-limit failures", async () => {
  const { Research, requests, localStorage } = await loadResearch({
    scorecardResponses: [
      { status: 429, body: {} },
      { status: 429, body: {} },
      { status: 429, body: {} },
    ],
  });

  const result = await Research.scorecardFor("Rate Limited College");

  assert.deepEqual(result, { error: "rate" });
  assert.deepEqual(localStorage.snapshot(), {});
  assert.equal(
    requests.filter((url) => url.startsWith("https://api.data.gov/ed/collegescorecard")).length,
    3,
  );
});
