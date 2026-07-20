const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function scriptTags(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
}

test("prelanding completion saves context before routing to the research page", () => {
  const source = read("app/prelanding.jsx");
  const finish = source.match(/const finish = \(\) => \{([\s\S]*?)\n    \};/);
  const skipIntro = source.match(/const skipIntro = \(\) => \{([\s\S]*?)\n    \};/);

  assert.ok(finish, "finish handler should be easy to audit");
  assert.match(
    finish[1],
    /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\);/,
    "finish should persist a completed, confirmed context",
  );
  assert.match(finish[1], /window\.location\.href\s*=\s*"research\.html";/, "finish should land on research");
  assert.doesNotMatch(finish[1], /window\.location\.href\s*=\s*"index\.html";/, "finish should not route to generic index");

  assert.ok(skipIntro, "skip handler should be easy to audit");
  assert.match(
    skipIntro[1],
    /UC\.update\(\{\s*preLandingComplete:\s*true\s*\}\);/,
    "skip should still mark the prelanding gate complete",
  );
  assert.match(skipIntro[1], /window\.location\.href\s*=\s*"research\.html";/, "skip should still land on research");
});

test("research page keeps the clear path into survey without hiding demo status", () => {
  const html = read("research.html");

  assert.match(html, /href="start\.html"/, "research page should let users change college or major");
  assert.ok((html.match(/href="survey\.html"/g) || []).length >= 2, "research page should have top and bottom survey CTAs");
  assert.match(html, /DataStatusBadge status="Preview"/, "demo fallback must remain visibly labeled");
  assert.match(html, /Showing a demo pairing/, "demo fallback copy should explain the placeholder context");
});

test("survey controller gates incomplete visitors through the start flow", () => {
  const source = read("app/fit-app.jsx");

  assert.match(
    source,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{\s*window\.location\.replace\("start\.html"\);\s*\}/,
    "survey should redirect visitors who have not completed the prelanding context",
  );
});

test("entry HTML loads shared context before pages that depend on it", () => {
  const startScripts = scriptTags(read("start.html"));
  const surveyScripts = scriptTags(read("survey.html"));
  const researchScripts = scriptTags(read("research.html"));

  assert.ok(startScripts.indexOf("app/user-context.js") < startScripts.indexOf("app/prelanding.jsx"));
  assert.ok(surveyScripts.indexOf("app/user-context.js") < surveyScripts.indexOf("app/fit-app.jsx"));
  assert.ok(researchScripts.indexOf("app/user-context.js") < researchScripts.indexOf("app/research-data.js"));
  assert.ok(researchScripts.indexOf("app/research-data.js") < researchScripts.indexOf("app/research.jsx"));
});
