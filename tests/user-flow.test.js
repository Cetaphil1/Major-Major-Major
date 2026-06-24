const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("prelanding completion routes students to research before the survey", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/
  );
  assert.doesNotMatch(source, /window\.location\.href = "index\.html";/);
});

test("research page personalizes saved context and provides survey CTAs", () => {
  const source = read("research.html");

  assert.match(source, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(source, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
  assert.match(source, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
  assert.match(source, /\{!isDemo \? \(\s*<p className="rs-greeting"/);
  assert.match(
    source,
    /\{name \? <>\{name\}, here<\/> : <>Here<\/>\}'s the research for <b>\{major\}<\/b> at <b>\{college\}<\/b>\. Read it over, then take the survey\./
  );
  assert.match(source, /<a className="rs-chiplink" href="survey\.html"[^>]*>Take the survey/);
  assert.match(source, /<a className="o-btn o-btn--lg" href="survey\.html"/);
  assert.match(source, /<a className="rs-chiplink" href="start\.html">Change college \/ major<\/a>/);
});

test("generated landing page starts the context flow instead of bypassing it", () => {
  const source = read("landing/index.html");
  const startLinks = source.match(/href="\.\.\/start\.html"/g) || [];

  assert.match(source, /<title>Fit Beyond Interest/);
  assert.match(source, /Does your major actually fit you\?/);
  assert.match(
    source,
    /Compare your major, school environment, workload, motivation, belonging, and career clarity/
  );
  assert.ok(startLinks.length >= 1, "expected at least one CTA to the context start flow");
  assert.doesNotMatch(source, /href="\.\.\/survey\.html"/);
});
