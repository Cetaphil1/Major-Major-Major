const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function hrefsFrom(html) {
  const hrefs = [];
  const hrefPattern = /\bhref=(?:"([^"]*)"|'([^']*))/g;
  let match;

  while ((match = hrefPattern.exec(html))) {
    hrefs.push(match[1] || match[2] || "");
  }

  return hrefs;
}

test("prelanding finish and skip paths persist completion before research routing", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finish should mark the context complete before sending the student to personalized research"
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skip should still mark the intro complete and route to research rather than the generic landing page"
  );
  assert.doesNotMatch(
    source,
    /window\.location\.href = "index\.html"/,
    "prelanding should not route completed context back to the generic research/landing duplicate"
  );
});

test("research page reads saved context and labels demo fallback honestly", () => {
  const html = read("research.html");

  assert.match(html, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| \{\};/);
  assert.match(html, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(html, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
  assert.match(html, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
  assert.match(html, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);

  assert.match(
    html,
    /!isDemo \? \(\s*<p className="rs-greeting"[\s\S]*\{name \? <>\{name\}, here<\/> : <>Here<\/>\}'s the research for <b>\{major\}<\/b> at <b>\{college\}<\/b>/,
    "saved context should personalize the research page before the survey"
  );
  assert.match(
    html,
    /<DataStatusBadge status="Preview" \/>\s*Showing a demo pairing\./,
    "fallback content should remain visibly marked as preview data"
  );
});

test("research page offers clear survey CTAs without bypassing context edits", () => {
  const html = read("research.html");
  const hrefs = hrefsFrom(html);
  const surveyLinks = hrefs.filter((href) => href === "survey.html");

  assert.equal(
    surveyLinks.length,
    2,
    "research should expose both the top survey chip and the end-of-page survey CTA"
  );
  assert.ok(hrefs.includes("start.html"), "students should still be able to change college or major");
  assert.match(html, /Seen enough\? The survey turns this context into a personalized fit &amp; switch-risk read\./);
});

test("root research entry gates brand-new visitors into the start flow", () => {
  const html = read("index.html");

  assert.match(html, /<script src="app\/user-context\.js"><\/script>/);
  assert.match(html, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/);
  assert.match(html, /<DataStatusBadge status="Preview" \/>/);
});
