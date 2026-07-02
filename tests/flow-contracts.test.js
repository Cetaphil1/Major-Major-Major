const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("generated landing page keeps the rebrand and enters only through the start flow", () => {
  const landing = read("landing/index.html");

  assert.match(landing, /<title>Fit Beyond Interest/);
  assert.match(landing, /Fit Beyond Interest/);
  assert.doesNotMatch(landing, /Edukate/i);
  assert.match(landing, /start\.html/);
  assert.doesNotMatch(landing, /research\.html|survey\.html/);
});

test("prelanding completion and skip both mark context state before research handoff", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(
    prelanding,
    /const finish = \(\) => \{[\s\S]*?UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);[\s\S]*?window\.location\.href = "research\.html";[\s\S]*?\};/,
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{[\s\S]*?UC\.update\(\{ preLandingComplete: true \}\);[\s\S]*?window\.location\.href = "research\.html";[\s\S]*?\};/,
  );
});

test("root research shell gates new visitors to start.html and preserves research-to-survey CTAs", () => {
  const root = read("index.html");

  assert.ok(
    root.indexOf('<script src="app/user-context.js"></script>') < root.indexOf("window.UserContext.load()"),
    "UserContext must load before the root pre-landing gate executes",
  );
  assert.match(root, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/);
  assert.match(root, /<a className="rs-chiplink" href="survey\.html"[^>]*>Take the survey/);
  assert.match(root, /<DataStatusBadge status="Preview" \/>/);
  assert.match(root, /href="start\.html">Enter your own college &amp; major<\/a>/);
});

test("dedicated research page keeps demo disclosure plus top and bottom survey handoffs", () => {
  const research = read("research.html");

  assert.match(research, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
  assert.match(research, /<DataStatusBadge status="Preview" \/>/);
  assert.match(research, /href="start\.html">Enter your own college &amp; major<\/a>/);
  assert.match(research, /<a className="rs-chiplink" href="survey\.html"[^>]*>Take the survey/);
  assert.match(research, /<a className="o-btn o-btn--lg" href="survey\.html"/);
});

test("survey shell loads shared context before the flow controller, which gates incomplete visitors", () => {
  const survey = read("survey.html");
  const fitApp = read("app/fit-app.jsx");

  assert.ok(
    survey.indexOf('<script src="app/user-context.js"></script>') < survey.indexOf('src="app/fit-app.jsx"'),
    "survey must load UserContext before FlowApp overlays identity",
  );
  assert.match(fitApp, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(fitApp, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(fitApp, /seeded\.college = ucCollege\.name;/);
  assert.match(fitApp, /seeded\.major = ucMajor\.name;/);
});
