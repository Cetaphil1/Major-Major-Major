const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /preLandingComplete/);
});

test("skipping onboarding does not unlock identity-gated pages", () => {
  const source = read("app/prelanding.jsx");
  const skipIntro = source.match(/const skipIntro = \(\) => \{[\s\S]*?\n    \};/);

  assert.ok(skipIntro, "skipIntro handler should exist");
  assert.match(skipIntro[0], /preLandingComplete:\s*false/);
  assert.match(skipIntro[0], /contextConfirmed:\s*false/);
  assert.match(skipIntro[0], /window\.location\.href = "landing\/index\.html"/);
  assert.doesNotMatch(skipIntro[0], /preLandingComplete:\s*true/);
  assert.doesNotMatch(skipIntro[0], /window\.location\.href = "research\.html"/);
});

test("research page requires a complete college and major identity", () => {
  const html = read("research.html");

  assert.match(html, /UserContext\.hasIdentity\(\)/);
  assert.match(html, /window\.location\.replace\("start\.html"\)/);
  assert.doesNotMatch(html, /Swarthmore College/);
  assert.doesNotMatch(html, /Political Science/);
});

test("survey page requires identity before rendering or saving flow state", () => {
  const source = read("app/fit-app.jsx");

  assert.match(source, /const hasIdentity = !!\(window\.UserContext && window\.UserContext\.hasIdentity\(\)\);/);
  assert.match(source, /const canEnterSurvey = !!\(uc && uc\.preLandingComplete && hasIdentity\);/);
  assert.match(source, /if \(!canEnterSurvey\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(source, /if \(canEnterSurvey\) save\(\{ phase, ctx, sectionIdx, answers \}\);/);
  assert.match(source, /if \(!canEnterSurvey\) return null;/);
});

test("starting over clears both survey progress and identity", () => {
  const source = read("app/fit-app.jsx");

  assert.match(source, /wipe\(\);/);
  assert.match(source, /window\.UserContext\.clear\(\);/);
  assert.match(source, /window\.location\.href = "start\.html";/);
});
