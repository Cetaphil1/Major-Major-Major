const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /<meta http-equiv="refresh" content="0; url=landing\/index\.html" \/>/);
  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /survey\.html/);
});

test("research entry requires completed college and major identity", () => {
  const html = read("research.html");
  const userContextIdx = html.indexOf('<script src="app/user-context.js"></script>');
  const guardIdx = html.indexOf("window.UserContext.hasIdentity()");

  assert.ok(userContextIdx >= 0, "research page loads UserContext");
  assert.ok(guardIdx > userContextIdx, "identity guard runs after UserContext loads");
  assert.match(html, /!c\.preLandingComplete \|\| !window\.UserContext\.hasIdentity\(\)/);
  assert.match(html, /window\.location\.replace\("start\.html"\)/);
});

test("survey controller does not render or persist without identity", () => {
  const js = read("app/fit-app.jsx");

  assert.match(js, /const hasIdentity = !!\(window\.UserContext && window\.UserContext\.hasIdentity && window\.UserContext\.hasIdentity\(\)\);/);
  assert.match(js, /const canUseFlow = !!\(uc && uc\.preLandingComplete && hasIdentity\);/);
  assert.match(js, /if \(!canUseFlow\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(js, /if \(canUseFlow\) save\(\{ phase, ctx, sectionIdx, answers \}\);/);
  assert.match(js, /if \(!canUseFlow\) return null;/);
});

test("skipping onboarding without identity stays out of personalized flow", () => {
  const js = read("app/prelanding.jsx");

  assert.match(js, /if \(builtCollege && builtMajor\) \{/);
  assert.match(js, /UC\.update\(\{ preLandingComplete: false, contextConfirmed: false \}\);/);
  assert.match(js, /window\.location\.href = "landing\/index\.html";/);
  assert.doesNotMatch(js, /UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";/);
});
