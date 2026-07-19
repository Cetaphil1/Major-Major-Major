const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1/gi), (match) => match[2]);
}

function assertBefore(list, first, second) {
  const firstIndex = list.indexOf(first);
  const secondIndex = list.indexOf(second);
  assert.notEqual(firstIndex, -1, `${first} should be loaded`);
  assert.notEqual(secondIndex, -1, `${second} should be loaded`);
  assert.ok(firstIndex < secondIndex, `${first} should load before ${second}`);
}

test("start page loads context dependencies before the prelanding controller", () => {
  const scripts = scriptSrcs(read("start.html"));

  assertBefore(scripts, "app/user-context.js", "app/prelanding.jsx");
  assertBefore(scripts, "app/college-snapshots.js", "app/prelanding.jsx");
  assertBefore(scripts, "app/data.jsx", "app/prelanding.jsx");
  assertBefore(scripts, "app/screens-context.jsx", "app/prelanding.jsx");
});

test("prelanding finish and skip both persist completion before research handoff", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "finish should mark the context complete and continue to research.html"
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "skip should still mark prelanding complete and route to research.html"
  );
  assert.match(source, /Continue to your research/);
});

test("research page personalizes from saved context and provides survey handoff", () => {
  const source = read("research.html");
  const scripts = scriptSrcs(source);

  assertBefore(scripts, "app/user-context.js", "app/research-data.js");
  assert.match(source, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(source, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
  assert.match(source, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
  assert.match(source, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
  assert.match(source, /\{name \? <>\{name\}, here<\/> : <>Here<\/>\}'s the research for <b>\{major\}<\/b> at <b>\{college\}<\/b>/);

  const surveyLinks = Array.from(source.matchAll(/href="survey\.html"/g));
  assert.ok(surveyLinks.length >= 2, "research.html should offer both header and end-of-page survey CTAs");
  assert.match(source, /Seen enough\? The survey turns this context into a personalized fit &amp; switch-risk read\./);
});

test("survey flow gates missing prelanding context and overlays saved identity", () => {
  const source = read("app/fit-app.jsx");

  assert.match(
    source,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey should redirect brand-new visitors into the prelanding flow"
  );
  assert.match(source, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(source, /seeded\.college = ucCollege\.name;/);
  assert.match(source, /seeded\.major = ucMajor\.name;/);
  assert.match(source, /collegeMeta = ucCollege\.isManual \? null : \{ id: ucCollege\.id/);
  assert.match(source, /majorMeta = ucMajor\.isManual \? null : \{ cipCode: ucMajor\.cipCode/);
});
