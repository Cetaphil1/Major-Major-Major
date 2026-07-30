const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function indexOfOrFail(source, needle, label = needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `Expected to find ${label}`);
  return index;
}

test("entry pages load UserContext before scripts that depend on saved flow state", () => {
  const start = read("start.html");
  assert.ok(
    indexOfOrFail(start, 'src="app/user-context.js"', "start UserContext script") <
      indexOfOrFail(start, 'src="app/prelanding.jsx"', "prelanding script"),
    "start.html must load UserContext before the prelanding controller",
  );

  const researchIndex = read("index.html");
  assert.ok(
    indexOfOrFail(researchIndex, 'src="app/user-context.js"', "index UserContext script") <
      indexOfOrFail(researchIndex, "window.UserContext.load()", "index gate"),
    "index.html must load UserContext before checking preLandingComplete",
  );

  const survey = read("survey.html");
  assert.ok(
    indexOfOrFail(survey, 'src="app/user-context.js"', "survey UserContext script") <
      indexOfOrFail(survey, 'src="app/fit-app.jsx"', "survey app script"),
    "survey.html must load UserContext before the survey app",
  );
});

test("prelanding completion and skip paths persist the gate flag before research", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(
    prelanding,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finish() should mark the flow complete and route to research.html",
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skipIntro() should mark the flow complete and route to research.html",
  );
});

test("research page personalizes from saved context and exposes the survey handoff", () => {
  const research = read("research.html");

  assert.match(research, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(research, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(research, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
  assert.match(research, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
  assert.match(research, /<a className="rs-chiplink" href="survey\.html"/);
  assert.match(research, /<a className="o-btn o-btn--lg" href="survey\.html"/);
  assert.match(research, /href="start\.html">Enter your own college &amp; major<\/a>/);
});

test("survey app guards direct entry and overlays prelanding identity", () => {
  const fitApp = read("app/fit-app.jsx");

  assert.match(
    fitApp,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey app should redirect visitors who have not completed prelanding",
  );
  assert.match(fitApp, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(fitApp, /seeded\.college = ucCollege\.name;/);
  assert.match(fitApp, /seeded\.major = ucMajor\.name;/);
});
