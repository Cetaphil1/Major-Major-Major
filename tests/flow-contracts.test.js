const assert = require("node:assert/strict");
const test = require("node:test");

const { readRepoFile } = require("./vm-helpers");

function scriptSources(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), (match) => match[1]);
}

function assertBefore(list, first, second) {
  const firstIndex = list.indexOf(first);
  const secondIndex = list.indexOf(second);
  assert.notEqual(firstIndex, -1, `${first} should be loaded`);
  assert.notEqual(secondIndex, -1, `${second} should be loaded`);
  assert.ok(firstIndex < secondIndex, `${first} should load before ${second}`);
}

test("entry pages load shared context before dependent scripts", () => {
  const startScripts = scriptSources(readRepoFile("start.html"));
  assertBefore(startScripts, "app/user-context.js", "app/college-snapshots.js");
  assertBefore(startScripts, "app/user-context.js", "app/data.jsx");
  assertBefore(startScripts, "app/data.jsx", "app/screens-context.jsx");
  assertBefore(startScripts, "app/screens-context.jsx", "app/prelanding.jsx");

  const surveyScripts = scriptSources(readRepoFile("survey.html"));
  assertBefore(surveyScripts, "app/user-context.js", "app/research-data.js");
  assertBefore(surveyScripts, "app/data.jsx", "app/screens-quiz.jsx");
  assertBefore(surveyScripts, "app/research.jsx", "app/screens-report.jsx");
  assertBefore(surveyScripts, "app/screens-report.jsx", "app/fit-app.jsx");

  const researchScripts = scriptSources(readRepoFile("research.html"));
  assertBefore(researchScripts, "app/user-context.js", "app/research-data.js");
  assertBefore(researchScripts, "app/research-data.js", "app/research.jsx");
});

test("prelanding persists completion before routing into research", () => {
  const source = readRepoFile("app/prelanding.jsx");

  assert.match(source, /const finish = \(\) => \{[\s\S]*?UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);[\s\S]*?window\.location\.href = "research\.html";[\s\S]*?\};/);
  assert.match(source, /const skipIntro = \(\) => \{[\s\S]*?UC\.update\(\{ preLandingComplete: true \}\);[\s\S]*?window\.location\.href = "research\.html";[\s\S]*?\};/);
});

test("research page preserves the path into survey and edit context", () => {
  const source = readRepoFile("research.html");

  assert.match(source, /href="start\.html">Change college \/ major/);
  assert.match(source, /href="survey\.html"[^>]*>Take the survey/);
  assert.match(source, /href="start\.html">Enter your own college &amp; major/);
});

test("direct survey entry is guarded and saved identity wins over stale flow state", () => {
  const source = readRepoFile("app/fit-app.jsx");

  assert.match(source, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(source, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(source, /seeded\.college = ucCollege\.name;/);
  assert.match(source, /seeded\.major = ucMajor\.name;/);
});

test("legacy index gates brand-new visitors into the prelanding flow", () => {
  const source = readRepoFile("index.html");

  assert.ok(source.indexOf('<script src="app/user-context.js"></script>') < source.indexOf("window.UserContext.load()"));
  assert.ok(source.indexOf("window.UserContext.load()") < source.indexOf('<script src="app/research-data.js"></script>'));
  assert.match(source, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/);
});
