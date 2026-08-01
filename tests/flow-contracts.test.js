const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function scriptPosition(html, src) {
  const index = html.indexOf(`src="${src}"`);
  assert.notEqual(index, -1, `expected ${src} script tag`);
  return index;
}

test("start flow finishes or skips into personalized research after marking prelanding complete", () => {
  const source = read("app/prelanding.jsx");

  const finishStart = source.indexOf("const finish = () => {");
  const skipStart = source.indexOf("const skipIntro = () => {");
  assert.notEqual(finishStart, -1, "finish handler exists");
  assert.notEqual(skipStart, -1, "skipIntro handler exists");

  const finishBlock = source.slice(finishStart, skipStart);
  const skipBlock = source.slice(skipStart, source.indexOf("const builtCollege", skipStart));

  assert.match(
    finishBlock,
    /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\);/,
    "finish persists completed and confirmed context"
  );
  assert.match(
    finishBlock,
    /window\.location\.href\s*=\s*"research\.html";/,
    "finish routes to personalized research"
  );

  assert.match(
    skipBlock,
    /UC\.update\(\{\s*preLandingComplete:\s*true\s*\}\);/,
    "skip persists the completed prelanding gate"
  );
  assert.match(
    skipBlock,
    /window\.location\.href\s*=\s*"research\.html";/,
    "skip also routes to personalized research instead of the generic landing page"
  );
});

test("research entry points load context before research data and keep the expected calls to action", () => {
  for (const page of ["index.html", "research.html"]) {
    const html = read(page);
    const userContext = scriptPosition(html, "app/user-context.js");
    const researchData = scriptPosition(html, "app/research-data.js");
    const researchComponent = scriptPosition(html, "app/research.jsx");

    assert.ok(userContext < researchData, `${page} loads UserContext before research data`);
    assert.ok(researchData < researchComponent, `${page} loads research data before components`);
    assert.match(html, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
    assert.match(html, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
    assert.match(html, /<DataStatusBadge status="Preview" \/>/, `${page} labels fallback demo data`);
    assert.match(html, /href="start\.html"[^>]*>Change college \/ major<\/a>/, `${page} lets users edit context`);
  }

  const gatedIndex = read("index.html");
  assert.match(
    gatedIndex,
    /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/,
    "root research entry gates brand-new visitors into the start flow"
  );

  const personalizedResearch = read("research.html");
  assert.match(personalizedResearch, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(
    personalizedResearch,
    /Seen enough\? The survey turns this context into a personalized fit &amp; switch-risk read\./,
    "research page keeps the end-of-page survey bridge"
  );
  assert.equal(
    Array.from(personalizedResearch.matchAll(/href="survey\.html"/g)).length,
    2,
    "research page exposes both top and bottom survey CTAs"
  );
});

test("survey page protects direct entry and overlays saved prelanding identity", () => {
  const survey = read("survey.html");
  assert.ok(
    scriptPosition(survey, "app/user-context.js") < scriptPosition(survey, "app/fit-app.jsx"),
    "survey loads UserContext before the flow controller"
  );

  const controller = read("app/fit-app.jsx");
  assert.match(
    controller,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey redirects direct visitors who have not completed prelanding"
  );
  assert.match(controller, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(controller, /seeded\.college = ucCollege\.name;/);
  assert.match(controller, /seeded\.major = ucMajor\.name;/);
});
