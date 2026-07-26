const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("root index redirects to the marketing landing page", () => {
  const html = read("index.html");

  assert.match(html, /landing\/index\.html/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /UserContext\.load/);
});

test("survey loads flow-state before the flow controller", () => {
  const html = read("survey.html");
  const flowState = html.indexOf('src="app/flow-state.js"');
  const fitApp = html.indexOf('src="app/fit-app.jsx"');

  assert.notEqual(flowState, -1);
  assert.notEqual(fitApp, -1);
  assert.ok(flowState < fitApp);
});

test("survey home navigation returns to the canonical research page", () => {
  const fitApp = read("app/fit-app.jsx");

  assert.match(fitApp, /window\.location\.href = "research\.html"/);
  assert.doesNotMatch(fitApp, /window\.location\.href = "index\.html"/);
});
