const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("site root redirects to the exported landing page", () => {
  const html = read("index.html");

  assert.match(html, /landing\/index\.html/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /preLandingComplete/);
  assert.doesNotMatch(html, /start\.html/);
});

test("research app remains available on research.html", () => {
  const html = read("research.html");

  assert.match(html, /app\/research\.jsx/);
  assert.match(html, /survey\.html/);
  assert.doesNotMatch(html, /href="index\.html"/);
});
