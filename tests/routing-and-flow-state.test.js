const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("root entry redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /<meta http-equiv="refresh" content="0; url=landing\/index\.html" \/>/);
  assert.match(html, /<a href="landing\/index\.html">Fit Beyond Interest<\/a>/);
  assert.doesNotMatch(html, /app\/research\.jsx|app\/user-context\.js|start\.html/);
});

test("survey persistence is tied to a complete saved identity", () => {
  const controller = read("app/fit-app.jsx");

  assert.match(controller, /function hasCompleteIdentity\(uc\)/);
  assert.match(controller, /uc\.selectedCollege && uc\.selectedCollege\.name/);
  assert.match(controller, /uc\.selectedMajor && uc\.selectedMajor\.name/);
  assert.match(controller, /function savedMatchesIdentity\(saved, identityKey\)/);
  assert.match(controller, /saved\.identityKey \? saved\.identityKey === identityKey : identityKeyForSavedCtx\(saved\.ctx\) === identityKey/);
  assert.match(controller, /save\(\{ identityKey, phase, ctx, sectionIdx, answers \}\)/);
  assert.match(controller, /window\.location\.replace\("start\.html"\)/);
});

test("start over clears both survey progress and identity context", () => {
  const controller = read("app/fit-app.jsx");

  assert.match(controller, /onRestart=\{\(\) => \{ wipe\(\); if \(window\.UserContext\) window\.UserContext\.clear\(\);/);
});
