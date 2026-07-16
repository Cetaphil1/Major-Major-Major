const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(html, /app\/research\.jsx|ResearchCenter|preLandingComplete/);
});

test("research page redirects visitors without a college and major identity", () => {
  const html = read("research.html");

  assert.ok(
    html.indexOf('src="app/user-context.js"') < html.indexOf("UserContext.hasIdentity()"),
    "research guard must run after loading UserContext"
  );
  assert.match(html, /UserContext\.hasIdentity\(\)/);
  assert.match(html, /window\.location\.replace\("start\.html"\)/);
});

test("skip intro cannot mark onboarding complete without context", () => {
  const source = read("app/prelanding.jsx");

  assert.match(source, /const hasContext = !!\(college\.trim\(\) && major\.trim\(\)\);/);
  assert.match(source, /UC\.update\(\{ preLandingComplete: false, contextConfirmed: false \}\);/);
  assert.match(source, /window\.location\.href = "landing\/index\.html";/);
});

test("survey entry requires identity and scopes saved flow to that identity", () => {
  const source = read("app/fit-app.jsx");

  assert.match(source, /function identityKeyFromUserContext\(uc\)/);
  assert.match(source, /const hasIdentity = !!\(window\.UserContext && window\.UserContext\.hasIdentity && window\.UserContext\.hasIdentity\(\)\);/);
  assert.match(source, /const saved = rawSaved && rawSaved\.identityKey === identityKey \? rawSaved : null;/);
  assert.match(source, /if \(hasIdentity\) save\(\{ identityKey, phase, ctx, sectionIdx, answers \}\);/);
  assert.match(source, /window\.location\.href = "research\.html";/);
  assert.match(source, /window\.UserContext\.clear/);
  assert.match(source, /window\.location\.href = "start\.html";/);
});
