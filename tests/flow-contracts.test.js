const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function scriptOrder(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), (match) => match[1]);
}

function assertBefore(list, first, second) {
  const firstIndex = list.indexOf(first);
  const secondIndex = list.indexOf(second);
  assert.notEqual(firstIndex, -1, `${first} should be loaded`);
  assert.notEqual(secondIndex, -1, `${second} should be loaded`);
  assert.ok(firstIndex < secondIndex, `${first} should load before ${second}`);
}

test("start page loads shared context before the prelanding controller", () => {
  const scripts = scriptOrder(read("start.html"));

  assertBefore(scripts, "app/user-context.js", "app/college-snapshots.js");
  assertBefore(scripts, "app/user-context.js", "app/data.jsx");
  assertBefore(scripts, "app/data.jsx", "app/screens-context.jsx");
  assertBefore(scripts, "app/screens-context.jsx", "app/prelanding.jsx");
});

test("prelanding finish and skip persist completion before research handoff", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finish should confirm context and route to research.html",
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip:[^\n]*\n\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skip should still mark the prelanding gate complete before research.html",
  );
});

test("survey requires prelanding completion and overlays saved identity", () => {
  const surveyHtml = read("survey.html");
  const fitApp = read("app/fit-app.jsx");
  const scripts = scriptOrder(surveyHtml);

  assertBefore(scripts, "app/user-context.js", "app/fit-app.jsx");
  assertBefore(scripts, "app/research-data.js", "app/fit-app.jsx");
  assert.match(
    fitApp,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey should redirect direct entries back to the prelanding flow",
  );
  assert.match(
    fitApp,
    /seeded\.displayName = uc\.displayName \|\| "";/,
    "saved display name should overlay any stale quiz state",
  );
  assert.match(
    fitApp,
    /seeded\.college = ucCollege\.name;/,
    "saved college should overlay any stale quiz state",
  );
  assert.match(
    fitApp,
    /seeded\.major = ucMajor\.name;/,
    "saved major should overlay any stale quiz state",
  );
});
