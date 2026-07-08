const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

test("root index redirects to the marketing landing page", () => {
  const html = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");

  assert.match(html, /http-equiv=["']refresh["']\s+content=["']0;\s*url=landing\/index\.html["']/i);
  assert.match(html, /window\.location\.replace\(["']landing\/index\.html["']\)/);
  assert.doesNotMatch(html, /type=["']text\/babel["']/i);
  assert.doesNotMatch(html, /app\/research\.jsx/);
});

test("research app remains available on the explicit research route", () => {
  const html = fs.readFileSync(path.join(repoRoot, "research.html"), "utf8");

  assert.match(html, /app\/research\.jsx/);
  assert.match(html, /ReactDOM\.createRoot/);
});
