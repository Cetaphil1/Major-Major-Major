const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function functionBody(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\(\\) => \\{([\\s\\S]*?)\\n    \\};`));
  assert.ok(match, `expected to find ${name} handler`);
  return match[1];
}

test("prelanding finish and skip persist context before routing to research", () => {
  const source = read("app/prelanding.jsx");
  const finish = functionBody(source, "finish");
  const skipIntro = functionBody(source, "skipIntro");

  assert.match(finish, /preLandingComplete:\s*true/);
  assert.match(finish, /contextConfirmed:\s*true/);
  assert.ok(
    finish.indexOf("UC.update") < finish.indexOf("window.location.href = \"research.html\""),
    "finish should save completion before navigating"
  );
  assert.doesNotMatch(finish, /index\.html/, "finish should route to canonical research.html, not ambiguous index.html");

  assert.match(skipIntro, /preLandingComplete:\s*true/);
  assert.ok(
    skipIntro.indexOf("UC.update") < skipIntro.indexOf("window.location.href = \"research.html\""),
    "skip should save completion before navigating"
  );
  assert.doesNotMatch(skipIntro, /index\.html/, "skip should route to canonical research.html, not ambiguous index.html");
});

test("root research page gates new users back to the start flow", () => {
  const html = read("index.html");

  assert.match(html, /UserContext\.load\(\)/);
  assert.match(html, /if \(!c\.preLandingComplete\)\s*\{\s*window\.location\.replace\('start\.html'\);?\s*\}/);
  assert.match(html, /ResearchCenter college=\{college\} major=\{major\}/);
});

test("canonical research page shows saved context, preview honesty, and survey CTAs", () => {
  const html = read("research.html");
  const surveyLinks = [...html.matchAll(/href="survey\.html"/g)];

  assert.match(html, /const name = \(uc\.displayName \|\| ""\)\.trim\(\)/);
  assert.match(html, /uc\.selectedCollege && uc\.selectedCollege\.name/);
  assert.match(html, /uc\.selectedMajor && uc\.selectedMajor\.name/);
  assert.match(html, /DataStatusBadge status="Preview"/);
  assert.match(html, /Showing a demo pairing/);
  assert.match(html, /rs-greeting/);
  assert.match(html, /the research for <b>\{major\}<\/b> at <b>\{college\}<\/b>/);
  assert.match(html, /Read it over, then take the survey/);
  assert.ok(surveyLinks.length >= 2, "research.html should provide both top and end survey CTAs");
});

test("survey controller requires completed prelanding context", () => {
  const source = read("app/fit-app.jsx");

  assert.match(
    source,
    /if \(!uc \|\| !uc\.preLandingComplete\)\s*\{\s*window\.location\.replace\("start\.html"\);?\s*\}/,
    "survey should redirect incomplete users to start.html"
  );
});
