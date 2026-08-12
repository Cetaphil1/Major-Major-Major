const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("root route sends visitors to the generated landing homepage", () => {
  const rootIndex = read("index.html");

  assert.match(rootIndex, /landing\/index\.html/);
  assert.doesNotMatch(rootIndex, /app\/research\.jsx/);
  assert.doesNotMatch(rootIndex, /preLandingComplete/);
});

test("research app remains available on its dedicated route", () => {
  const researchPage = read("research.html");

  assert.match(researchPage, /app\/research\.jsx/);
  assert.match(researchPage, /preLandingComplete/);
});
