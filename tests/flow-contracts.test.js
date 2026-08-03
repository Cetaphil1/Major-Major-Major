const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function scriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
}

function indexOfSource(sources, name) {
  const index = sources.findIndex((src) => src === name);
  assert.notEqual(index, -1, `${name} should be loaded`);
  return index;
}

test("start page loads shared context before pre-landing flow scripts", () => {
  const sources = scriptSources(read("start.html"));

  assert(
    indexOfSource(sources, "app/user-context.js") <
      indexOfSource(sources, "app/college-snapshots.js"),
    "college snapshot data should load after shared context",
  );
  assert(
    indexOfSource(sources, "app/user-context.js") <
      indexOfSource(sources, "app/prelanding.jsx"),
    "pre-landing flow depends on UserContext",
  );
  assert(
    indexOfSource(sources, "app/data.jsx") <
      indexOfSource(sources, "app/prelanding.jsx"),
    "pre-landing autocomplete fields depend on app data",
  );
  assert(
    indexOfSource(sources, "app/screens-context.jsx") <
      indexOfSource(sources, "app/prelanding.jsx"),
    "pre-landing flow depends on context field components",
  );
});

test("pre-landing finish and skip persist completion before research navigation", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(
    prelanding,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finishing the preview should persist completion and confirmation before research.html",
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skipping the intro should still persist completion before research.html",
  );
});

test("research page keeps users on the research-to-survey path", () => {
  const research = read("research.html");

  assert.match(research, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(research, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(research, /href="start\.html">Change college \/ major<\/a>/);
  assert.match(research, /href="survey\.html"[\s\S]*Take the survey/);
  assert.match(research, /Showing a demo pairing\.[\s\S]*href="start\.html"/);
  assert.match(research, /Seen enough\? The survey turns this context into a personalized fit &amp; switch-risk read\./);
});

test("survey page is guarded by pre-landing completion and overlays saved identity", () => {
  const surveyHtml = read("survey.html");
  const fitApp = read("app/fit-app.jsx");
  const sources = scriptSources(surveyHtml);

  assert(
    indexOfSource(sources, "app/user-context.js") <
      indexOfSource(sources, "app/fit-app.jsx"),
    "survey controller depends on UserContext being loaded first",
  );
  assert.match(
    fitApp,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "direct survey entry should route visitors back through start.html",
  );
  assert.match(fitApp, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(fitApp, /seeded\.college = ucCollege\.name;/);
  assert.match(fitApp, /seeded\.major = ucMajor\.name;/);
});
