const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function landingHtmlFiles(dir = path.join(ROOT, "landing")) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return landingHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

test("generated landing export stays rebranded and starts the quiz flow", () => {
  const files = landingHtmlFiles();
  assert.ok(files.length > 10, "expected generated landing pages to be present");

  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const relative = path.relative(ROOT, file);

    assert.match(html, /Fit Beyond Interest/, `${relative} should use current product branding`);
    assert.doesNotMatch(html, /\bEdukate\b/, `${relative} should not retain stale Edukate copy`);
    assert.match(html, /start\.html/, `${relative} should expose the context-entry flow`);
    assert.doesNotMatch(html, /href=["'][^"']*(?:research|survey)\.html/, `${relative} should not bypass start.html`);
  }
});

test("research article slugs match the current rebrand", () => {
  const currentArticles = [
    "landing/research-page/reading-belonging-and-career-clarity/index.html",
    "landing/research-page/school-effect-vs-subject-fit/index.html",
  ];
  const retiredArticles = [
    "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html",
    "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html",
  ];

  for (const article of currentArticles) {
    assert.ok(exists(article), `${article} should exist`);
    assert.match(read(article), /property="og:url" content="[^"]+\/research-page\/[^"]+"/, `${article} should keep a canonical article URL`);
  }

  for (const article of retiredArticles) {
    assert.equal(exists(article), false, `${article} should remain removed`);
  }
});
