const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /url=landing\/index\.html/);
  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /app\/fit-app\.jsx/);
});

test("personalized research and survey routes require a completed identity", () => {
  for (const file of ["research.html", "survey.html"]) {
    const html = read(file);

    assert.match(html, /UserContext\.hasIdentity\(\)/);
    assert.match(html, /preLandingComplete/);
    assert.match(html, /window\.location\.replace\("start\.html"\)/);
  }
});

test("skipping the intro does not complete the personalized flow", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{\s*window\.location\.href = "landing\/index\.html";\s*\};/
  );
});

test("survey progress is scoped to the active identity", () => {
  const app = read("app/fit-app.jsx");

  assert.match(app, /function identityKeyFor\(uc\)/);
  assert.match(app, /saved\.identityKey === identityKey/);
  assert.match(app, /save\(\{ identityKey, phase, ctx, sectionIdx, answers \}\)/);
  assert.match(app, /window\.UserContext\.clear\(\)/);
});
