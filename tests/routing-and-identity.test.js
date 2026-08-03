const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("site root is only a redirect to the marketing landing page", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(html, /type="text\/babel"/);
  assert.doesNotMatch(html, /href="survey\.html"/);
});

test("research and survey pages require a complete saved identity", () => {
  for (const file of ["research.html", "survey.html"]) {
    const html = read(file);

    assert.match(html, /window\.UserContext\.hasIdentity\(\)/, file);
    assert.match(html, /window\.location\.replace\("start\.html"\)/, file);
    assert.doesNotMatch(html, /preLandingComplete\)/, file);
  }
});

test("skip intro cannot unlock personalized pages without identity", () => {
  const source = read("app/prelanding.jsx");
  const skipIntro = source.match(/const skipIntro = \(\) => \{[\s\S]*?\n    \};/);

  assert.ok(skipIntro, "skipIntro function should exist");
  assert.match(skipIntro[0], /preLandingComplete:\s*UC\.hasIdentity\(\)/);
  assert.match(skipIntro[0], /window\.location\.href = "landing\/index\.html"/);
  assert.doesNotMatch(skipIntro[0], /preLandingComplete:\s*true/);
  assert.doesNotMatch(skipIntro[0], /window\.location\.href = "research\.html"/);
});

test("survey progress is scoped to the current identity", () => {
  const source = read("app/fit-app.jsx");

  assert.match(source, /function identityKey\(uc\)/);
  assert.match(source, /selectedCollege[\s\S]*selectedMajor/);
  assert.match(source, /saved && saved\.identityKey === currentIdentityKey \? saved : null/);
  assert.match(source, /save\(\{ phase, ctx, sectionIdx, answers, identityKey: currentIdentityKey \}\)/);
});

test("starting over clears both survey and identity stores", () => {
  const source = read("app/fit-app.jsx");

  assert.match(source, /wipe\(\); if \(window\.UserContext\) window\.UserContext\.clear\(\);/);
  assert.match(source, /window\.location\.href = "start\.html"/);
});
