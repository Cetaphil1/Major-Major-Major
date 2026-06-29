const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function scriptOrder(html, src) {
  const index = html.indexOf(src);
  assert.notEqual(index, -1, `expected ${src} to be loaded`);
  return index;
}

describe("quiz flow contracts", () => {
  it("gates the root research shell behind prelanding completion", () => {
    const html = read("index.html");

    assert.ok(scriptOrder(html, "app/user-context.js") < html.indexOf("Pre-landing gate"));
    assert.match(html, /window\.UserContext\.load\(\)/);
    assert.match(html, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/);
  });

  it("persists prelanding identity before routing to personalized research", () => {
    const source = read("app/prelanding.jsx");

    assert.match(source, /UC\.update\(\{\s*displayName: name\.trim\(\) \? name\.trim\(\) : null,/);
    assert.match(source, /selectedCollege: college\.trim\(\) \? mapCollege\(college\.trim\(\), collegeMeta\) : null,/);
    assert.match(source, /selectedMajor: major\.trim\(\) \? enrichMajor\(major\.trim\(\), majorMeta\) : null,/);
    assert.match(source, /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/);
    assert.match(source, /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/);
  });

  it("keeps research as the explicit bridge into the survey", () => {
    const html = read("research.html");

    assert.ok(scriptOrder(html, "app/user-context.js") < scriptOrder(html, "app/research-data.js"));
    assert.match(html, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| \{\};/);
    assert.match(html, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
    assert.match(html, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
    assert.match(html, /Showing a demo pairing\./);
    assert.match(html, /href="survey\.html"[\s\S]*Take the survey/);
    assert.match(html, /Seen enough\? The survey turns this context into a personalized fit &amp; switch-risk read\./);
  });

  it("loads shared context and research helpers before the survey controller", () => {
    const html = read("survey.html");

    assert.ok(scriptOrder(html, "app/user-context.js") < scriptOrder(html, "app/fit-app.jsx"));
    assert.ok(scriptOrder(html, "app/research-data.js") < scriptOrder(html, "app/fit-app.jsx"));
    assert.ok(scriptOrder(html, "app/data.jsx") < scriptOrder(html, "app/fit-app.jsx"));
    assert.ok(scriptOrder(html, "app/screens-report.jsx") < scriptOrder(html, "app/fit-app.jsx"));
  });

  it("keeps survey entry protected by prelanding state and overlays saved identity", () => {
    const source = read("app/fit-app.jsx");

    assert.match(source, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| null;/);
    assert.match(source, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
    assert.match(source, /seeded\.displayName = uc\.displayName \|\| "";/);
    assert.match(source, /seeded\.college = ucCollege\.name;/);
    assert.match(source, /seeded\.major = ucMajor\.name;/);
  });
});
