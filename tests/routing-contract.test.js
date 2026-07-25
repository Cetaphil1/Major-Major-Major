const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

test("site root redirects to the public landing page", () => {
  const html = readFileSync("index.html", "utf8");

  assert.match(html, /window\.location\.replace\(["']landing\/index\.html["']\)/);
  assert.match(html, /<meta[^>]+http-equiv=["']refresh["'][^>]+url=landing\/index\.html/i);
  assert.doesNotMatch(html, /app\/research\.jsx/);
});

test("survey loads identity-scoped flow state before the controller", () => {
  const html = readFileSync("survey.html", "utf8");
  const flowStateIndex = html.indexOf('src="app/flow-state.js"');
  const controllerIndex = html.indexOf('src="app/fit-app.jsx"');

  assert.notEqual(flowStateIndex, -1);
  assert.notEqual(controllerIndex, -1);
  assert.ok(flowStateIndex < controllerIndex, "flow-state.js must load before fit-app.jsx");
});

test("survey controller redirects incomplete identities before saving progress", () => {
  const source = readFileSync("app/fit-app.jsx", "utf8");

  assert.match(source, /UserContext\.hasIdentity\(\)/);
  assert.match(source, /!uc \|\| !uc\.preLandingComplete \|\| !hasIdentity/);
  assert.match(source, /if \(uc && uc\.preLandingComplete && hasIdentity\)/);
});
