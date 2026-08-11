const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("research pages require both college and major before personalized rendering", () => {
  for (const page of ["research.html", "index.html"]) {
    const html = read(page);

    assert.match(html, /const hasCollege = !!\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
    assert.match(html, /const hasMajor = !!\(uc\.selectedMajor && uc\.selectedMajor\.name\);/);
    assert.match(html, /const hasIdentity = hasCollege && hasMajor;/);
    assert.match(html, /const college = hasIdentity \? uc\.selectedCollege\.name : "Swarthmore College";/);
    assert.match(html, /const major = hasIdentity \? uc\.selectedMajor\.name : "Political Science";/);
    assert.match(html, /const isDemo = !hasIdentity;/);
  }
});

test("skip intro does not unlock the personalized flow without identity", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(prelanding, /UC\.update\(\{ preLandingComplete: false \}\);/);
  assert.match(prelanding, /window\.location\.href = "landing\/index\.html";/);
});
