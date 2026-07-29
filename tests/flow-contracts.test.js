const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function scriptSources(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), (match) => match[1]);
}

function assertOrdered(items, before, after) {
  const beforeIndex = items.indexOf(before);
  const afterIndex = items.indexOf(after);
  assert.notEqual(beforeIndex, -1, `${before} should be present`);
  assert.notEqual(afterIndex, -1, `${after} should be present`);
  assert.ok(beforeIndex < afterIndex, `${before} should load before ${after}`);
}

test("start page loads shared context and data before the pre-landing controller", () => {
  const html = read("start.html");
  const sources = scriptSources(html);

  assertOrdered(sources, "app/user-context.js", "app/data.jsx");
  assertOrdered(sources, "app/user-context.js", "app/screens-context.jsx");
  assertOrdered(sources, "app/college-snapshots.js", "app/prelanding.jsx");
  assertOrdered(sources, "app/data.jsx", "app/prelanding.jsx");
  assertOrdered(sources, "app/screens-context.jsx", "app/prelanding.jsx");
});

test("pre-landing finish and skip both persist completion before research handoff", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finish should save completion and confirmed context before navigating to research"
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip:[^\n]*\n\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skip should still mark pre-landing complete before navigating to research"
  );
  assert.match(source, /Continue to your research/);
});

test("research and survey pages preserve the intended handoff path", () => {
  const index = read("index.html");
  const research = read("research.html");
  const survey = read("survey.html");
  const fitApp = read("app/fit-app.jsx");

  assert.match(index, /window\.UserContext\.load\(\)/);
  assert.match(index, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/);
  assert.ok(
    index.indexOf("app/user-context.js") < index.indexOf("window.UserContext.load()"),
    "index gate must load UserContext before reading it"
  );

  assert.match(research, /href="start\.html">Change college \/ major<\/a>/);
  assert.match(research, /href="survey\.html"[^>]*>Take the survey/);
  assert.match(research, /Showing a demo pairing/);
  assert.match(research, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);

  assertOrdered(scriptSources(survey), "app/user-context.js", "app/fit-app.jsx");
  assert.match(fitApp, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(fitApp, /seeded\.college = ucCollege\.name;/);
  assert.match(fitApp, /seeded\.major = ucMajor\.name;/);
});
