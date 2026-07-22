const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function scriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
}

function assertBefore(items, first, second) {
  const firstIndex = items.indexOf(first);
  const secondIndex = items.indexOf(second);

  assert.notEqual(firstIndex, -1, `expected ${first} to be loaded`);
  assert.notEqual(secondIndex, -1, `expected ${second} to be loaded`);
  assert.ok(firstIndex < secondIndex, `expected ${first} before ${second}`);
}

test("start flow loads shared context and lookup data before prelanding logic", () => {
  const scripts = scriptSources(read("start.html"));

  assertBefore(scripts, "app/user-context.js", "app/prelanding.jsx");
  assertBefore(scripts, "app/college-snapshots.js", "app/prelanding.jsx");
  assertBefore(scripts, "app/data.jsx", "app/prelanding.jsx");
  assertBefore(scripts, "app/screens-context.jsx", "app/prelanding.jsx");
});

test("prelanding completion persists context before routing to research", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{[\s\S]*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);[\s\S]*window\.location\.href = "research\.html";[\s\S]*\};/,
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{[\s\S]*UC\.update\(\{ preLandingComplete: true \}\);[\s\S]*window\.location\.href = "research\.html";[\s\S]*\};/,
  );
});

test("research page reads saved identity and keeps survey CTAs visible", () => {
  const html = read("research.html");
  const scripts = scriptSources(html);

  assertBefore(scripts, "app/user-context.js", "app/research.jsx");
  assertBefore(scripts, "app/research-data.js", "app/research.jsx");
  assert.match(html, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(html, /<DataStatusBadge status="Preview" \/>/);
  assert.match(html, /Showing a demo pairing/);

  const surveyLinks = [...html.matchAll(/href="survey\.html"/g)];
  assert.ok(surveyLinks.length >= 2, "expected top and end-of-page survey CTAs");
  assert.match(html, /href="start\.html">Change college \/ major<\/a>/);
});

test("survey gate requires completed prelanding and overlays saved identity", () => {
  const survey = read("survey.html");
  const fitApp = read("app/fit-app.jsx");
  const scripts = scriptSources(survey);

  assertBefore(scripts, "app/user-context.js", "app/fit-app.jsx");
  assertBefore(scripts, "app/research-data.js", "app/fit-app.jsx");
  assert.match(
    fitApp,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
  );
  assert.match(fitApp, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(fitApp, /seeded\.college = ucCollege\.name;/);
  assert.match(fitApp, /seeded\.major = ucMajor\.name;/);
});
