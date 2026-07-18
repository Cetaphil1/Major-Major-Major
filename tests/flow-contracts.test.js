const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function indexOfOrThrow(source, needle, label) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${label} should include ${needle}`);
  return index;
}

test("start flow persists completion before routing to research", () => {
  const startHtml = read("start.html");
  const prelanding = read("app/prelanding.jsx");

  assert.ok(
    indexOfOrThrow(startHtml, 'src="app/user-context.js"', "start.html") <
      indexOfOrThrow(startHtml, 'src="app/prelanding.jsx"', "start.html"),
    "start.html should load UserContext before the prelanding app writes to it",
  );

  assert.match(
    prelanding,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finishing the identity preview should persist completion and confirmation before research.html",
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skipping should still mark the prelanding flow complete before research.html",
  );
});

test("research page personalizes saved context and keeps survey CTAs reachable", () => {
  const researchHtml = read("research.html");

  assert.ok(
    indexOfOrThrow(researchHtml, 'src="app/user-context.js"', "research.html") <
      indexOfOrThrow(researchHtml, 'src="app/research.jsx"', "research.html"),
    "research.html should load saved context before rendering the page",
  );

  assert.match(researchHtml, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(researchHtml, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
  assert.match(researchHtml, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
  assert.match(
    researchHtml,
    /\{name \? <>\{name\}, here<\/> : <>Here<\/>\}'s the research for <b>\{major\}<\/b> at <b>\{college\}<\/b>/,
    "saved names should be reflected in the personalized research greeting",
  );
  assert.match(researchHtml, /Showing a demo pairing\./, "missing context should show an honest preview state");

  const surveyLinks = [...researchHtml.matchAll(/href="survey\.html"/g)];
  assert.ok(surveyLinks.length >= 2, "research.html should expose both top and end-of-page survey CTAs");
});

test("survey app gates on completed prelanding context and overlays saved identity", () => {
  const surveyHtml = read("survey.html");
  const fitApp = read("app/fit-app.jsx");

  assert.ok(
    indexOfOrThrow(surveyHtml, 'src="app/user-context.js"', "survey.html") <
      indexOfOrThrow(surveyHtml, 'src="app/fit-app.jsx"', "survey.html"),
    "survey.html should load UserContext before the survey controller",
  );

  assert.match(
    fitApp,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey should redirect visitors who have not completed the prelanding context",
  );
  assert.match(fitApp, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(fitApp, /seeded\.college = ucCollege\.name;/);
  assert.match(fitApp, /seeded\.major = ucMajor\.name;/);
});
