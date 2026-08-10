const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("root entry redirects to the generated landing site", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /<a href="landing\/index\.html">Fit Beyond Interest<\/a>/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /preLandingComplete/);
  assert.doesNotMatch(html, /window\.location\.replace\('start\.html'\)/);
});
