const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(html, /start\.html/);
  assert.doesNotMatch(html, /ResearchCenter/);
});

test("landing page CTA enters the quiz start flow", () => {
  const html = read("landing/index.html");

  assert.match(html, /\.\.\/start\.html/);
  assert.doesNotMatch(html, /href="(?:\.\.\/)?research\.html"/);
  assert.doesNotMatch(html, /href="(?:\.\.\/)?survey\.html"/);
});
