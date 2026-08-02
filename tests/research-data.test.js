const assert = require("node:assert/strict");
const test = require("node:test");

const { makeBrowserContext, runRepoScript } = require("./vm-helpers");

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
        title: "Official sources",
        blurb: "Start with verified sources.",
        links: [
          {
            id: "homepage",
            type: "homepage",
            label: "{college} homepage",
            query: "{college} official website",
            status: "Research link",
          },
          {
            id: "courses",
            type: "scoped",
            label: "{major} courses",
            query: "{college} {major} courses",
            siteQuery: "site:{domain} {major} courses",
            status: "Research link",
          },
        ],
      },
    ],
  },
  "collegeMajors.json": {
    _meta: { status: "Estimated", disclaimer: "Preview relation only." },
    similarMajors: {
      Psychology: [
        { name: "Cognitive Science", relation: "Shared mind and behavior focus." },
      ],
    },
  },
  "nearbyColleges.json": {
    byCollegeId: { "001315": [{ name: "Smith College" }] },
    fallback: { region: "Northeast" },
  },
  "collegeProfiles.json": {
    profiles: {
      "001315": {
        domain: "amherst.edu",
        homepage: "https://www.amherst.edu/",
      },
    },
  },
  "colleges.json": [
    {
      id: "001315",
      name: "Amherst College",
      alias: ["Amherst"],
      city: "Amherst",
      state: "MA",
      control: "Private",
      level: "4-year",
    },
  ],
};

function loadResearch(fetchOverrides = {}) {
  const calls = [];
  const context = makeBrowserContext({
    fetch(path) {
      calls.push(String(path));
      const response = fetchOverrides[path] || fixtures[path];
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve({ json: () => Promise.resolve(response) });
    },
    window: {
      __MAJORS: [
        { name: "Computer Science", category: "Computing" },
        { name: "Data Science", category: "Computing" },
        { name: "Information Science", category: "Computing" },
      ],
    },
  });
  runRepoScript(context, "app/research-data.js");
  return { calls, Research: context.window.Research };
}

test("Research.load caches local research data and contextFor resolves aliases to profiles", async () => {
  const { calls, Research } = loadResearch();

  await Research.load();
  await Research.load();

  assert.deepEqual(calls, [
    "colleges.json",
    "researchSources.json",
    "collegeMajors.json",
    "nearbyColleges.json",
    "collegeProfiles.json",
  ]);

  const context = Research.contextFor("Amherst", "Psychology");
  assert.equal(context.collegeId, "001315");
  assert.equal(context.domain, "amherst.edu");
  assert.equal(context.homepage, "https://www.amherst.edu/");
  assert.equal(Research.nearbyFor("001315").list[0].name, "Smith College");
});

test("Research builds official homepage links and scoped search URLs without internal routing", async () => {
  const { Research } = loadResearch();
  await Research.load();

  const category = Research.buildCategory("official", Research.contextFor("Amherst", "Psychology"));
  const homepage = category.links.find((link) => link.id === "homepage");
  const courses = category.links.find((link) => link.id === "courses");

  assert.equal(homepage.url, "https://www.amherst.edu/");
  assert.equal(homepage.status, "Official source");
  assert.match(courses.url, /^https:\/\/www\.google\.com\/search\?q=/);
  assert.match(decodeURIComponent(courses.url), /site:amherst\.edu Psychology courses/);
  assert.doesNotMatch(courses.url, /research\.html|survey\.html|start\.html/);
});

test("Research similar majors prefer curated data and label same-category fallbacks as estimated", async () => {
  const { Research } = loadResearch();
  await Research.load();

  assert.deepEqual(JSON.parse(JSON.stringify(Research.similarMajorsFor("Psychology"))), {
    list: [{ name: "Cognitive Science", relation: "Shared mind and behavior focus." }],
    status: "Estimated",
    disclaimer: "Preview relation only.",
    source: "curated",
  });

  const fallback = Research.similarMajorsFor("Computer Science");
  assert.equal(fallback.status, "Estimated");
  assert.equal(fallback.source, "category");
  assert.deepEqual(
    Array.from(fallback.list, (major) => major.name),
    ["Data Science", "Information Science"]
  );
});

test("Research.scorecardFor retries rate-limited lookups and caches successful matches", async () => {
  const fetches = [];
  const context = makeBrowserContext({
    fetch(url) {
      fetches.push(String(url));
      if (String(url).includes("collegescorecard")) {
        if (fetches.filter((u) => u.includes("collegescorecard")).length === 1) {
          return Promise.resolve({ status: 429, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({
            results: [
              {
                "school.name": "Amherst College",
                "school.school_url": "www.amherst.edu",
                "latest.student.size": 1970,
                "latest.admissions.admission_rate.overall": 0.09,
                "latest.cost.tuition_in_state": null,
                "latest.completion.completion_rate_4yr_150nt": 0.91,
              },
            ],
          }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve(fixtures[url]) });
    },
  });
  runRepoScript(context, "app/research-data.js");

  const first = await context.window.Research.scorecardFor("Amherst College");
  const second = await context.window.Research.scorecardFor("Amherst College");

  assert.equal(first.homepage, "https://www.amherst.edu");
  assert.equal(first.matched, "Amherst College");
  assert.equal(first.stats.find((stat) => stat.label === "Acceptance rate").value, "9%");
  assert.deepEqual(second, first);
  assert.equal(fetches.filter((url) => url.includes("collegescorecard")).length, 2);
});
