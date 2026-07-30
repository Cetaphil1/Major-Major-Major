const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("site root redirects to the public landing page", () => {
  const index = read("index.html");

  assert.match(index, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(index, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(index, /ReactDOM\.createRoot/);
  assert.doesNotMatch(index, /ResearchPage/);
});

test("skip intro cannot mark pre-landing complete without an identity", () => {
  const prelanding = read("app/prelanding.jsx");
  const skipStart = prelanding.indexOf("const skipIntro = () => {");
  const skipEnd = prelanding.indexOf("const builtCollege", skipStart);
  const skipIntro = prelanding.slice(skipStart, skipEnd);

  assert.match(skipIntro, /UC\.hasIdentity\(\)/);
  assert.match(skipIntro, /preLandingComplete: true/);
  assert.match(skipIntro, /preLandingComplete: false/);
  assert.match(skipIntro, /window\.location\.href = "landing\/index\.html"/);
});

test("research and survey pages guard against missing identity", () => {
  for (const file of ["research.html", "survey.html"]) {
    const html = read(file);
    assert.match(html, /window\.UserContext\.hasIdentity\(\)/, `${file} checks hasIdentity`);
    assert.match(html, /window\.location\.replace\("start\.html"\)/, `${file} redirects to start`);
  }
});

test("survey loads identity-scoped flow state before the controller", () => {
  const survey = read("survey.html");
  const flowStateIndex = survey.indexOf('src="app/flow-state.js"');
  const fitAppIndex = survey.indexOf('src="app/fit-app.jsx"');

  assert.ok(flowStateIndex > -1, "flow-state script is loaded");
  assert.ok(fitAppIndex > -1, "fit-app controller is loaded");
  assert.ok(flowStateIndex < fitAppIndex, "flow-state loads before fit-app");
});

test("survey controller gates identity, scopes saves, and clears both stores on restart", () => {
  const fitApp = read("app/fit-app.jsx");

  assert.match(fitApp, /const hasIdentity = /);
  assert.match(fitApp, /FlowStore\.loadForIdentity\(activeIdentityKey\)/);
  assert.match(fitApp, /FlowStore\.saveForIdentity\(activeIdentityKey/);
  assert.match(fitApp, /FlowStore\.wipe\(\); if \(ucApi && ucApi\.clear\) ucApi\.clear\(\)/);
});
