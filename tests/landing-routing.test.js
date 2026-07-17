const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\(["']landing\/index\.html["']\)/);
  assert.match(html, /http-equiv=["']refresh["']/i);
  assert.match(html, /url=landing\/index\.html/i);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /start\.html/);
});

test("research app remains available at research.html", () => {
  const html = read("research.html");

  assert.match(html, /app\/research\.jsx/);
  assert.match(html, /href=["']survey\.html["']/);
  assert.doesNotMatch(html, /window\.location\.replace\(["']landing\/index\.html["']\)/);
});
