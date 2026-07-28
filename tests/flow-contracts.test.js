const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function scriptIndex(html, src) {
  const needle = `src="${src}"`;
  const index = html.indexOf(needle);
  assert.notEqual(index, -1, `expected ${src} to be loaded`);
  return index;
}

test("start flow persists completion before routing to canonical research page", () => {
  const startHtml = read("start.html");
  const prelanding = read("app/prelanding.jsx");

  assert.ok(
    scriptIndex(startHtml, "app/user-context.js") < scriptIndex(startHtml, "app/prelanding.jsx"),
    "start.html must load UserContext before the prelanding controller",
  );

  assert.match(
    prelanding,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "finish should mark confirmed context complete before research.html navigation",
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{\s*\/\/[^\n]*\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "skip should still mark prelanding complete before research.html navigation",
  );
  assert.doesNotMatch(prelanding, /window\.location\.href = "index\.html"/, "start flow should not drift back to ambiguous index.html routing");
});

test("research entry keeps context gate, saved-user personalization, and demo honesty", () => {
  const indexHtml = read("index.html");
  const researchHtml = read("research.html");

  assert.ok(
    scriptIndex(indexHtml, "app/user-context.js") < indexHtml.indexOf("window.UserContext.load()"),
    "index.html gate must load UserContext before reading saved context",
  );
  assert.match(indexHtml, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/, "index.html should force brand-new visitors through start.html");

  assert.match(researchHtml, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/, "research.html should read saved display name");
  assert.match(researchHtml, /name \? <>\{name\}, here<\/> : <>Here<\/>/, "research.html should greet named students without inventing a fallback name");
  assert.match(researchHtml, /<DataStatusBadge status="Preview" \/>/, "demo research pairing must remain visibly labeled Preview");
  assert.match(researchHtml, /Showing a demo pairing\./, "demo fallback should be described honestly");
  assert.match(researchHtml, /href="start\.html">Change college \/ major<\/a>/, "research.html should allow context edits");

  const surveyLinks = Array.from(researchHtml.matchAll(/href="survey\.html"/g));
  assert.equal(surveyLinks.length, 2, "research.html should offer both top and end-of-page survey CTAs");
});

test("survey entry is guarded by prelanding context and overlays saved identity", () => {
  const surveyHtml = read("survey.html");
  const fitApp = read("app/fit-app.jsx");

  assert.ok(
    scriptIndex(surveyHtml, "app/user-context.js") < scriptIndex(surveyHtml, "app/fit-app.jsx"),
    "survey.html must load UserContext before fit-app.jsx",
  );

  assert.match(
    fitApp,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey controller should redirect incomplete context back to start.html",
  );
  assert.match(fitApp, /seeded\.displayName = uc\.displayName \|\| "";/, "survey context should preserve the saved display name");
  assert.match(fitApp, /seeded\.college = ucCollege\.name;/, "survey context should overlay the saved college");
  assert.match(fitApp, /seeded\.major = ucMajor\.name;/, "survey context should overlay the saved major");
});
