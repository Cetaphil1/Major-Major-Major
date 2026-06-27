const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const landingRoot = path.join(root, "landing");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walkHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

const landingFiles = walkHtml(landingRoot);

test("generated landing pages keep the Fit Beyond Interest rebrand", () => {
  assert.ok(landingFiles.length > 0, "expected generated landing HTML files");

  for (const filePath of landingFiles) {
    const html = fs.readFileSync(filePath, "utf8");
    const name = rel(filePath);

    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, `${name} should expose the current OG brand`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${name} should expose the current Twitter brand`);
    assert.doesNotMatch(html, /Edukate/i, `${name} should not leak stale Edukate copy`);
  }

  const home = read("landing/index.html");
  assert.match(home, /<title>Fit Beyond Interest \u2014 Does your major actually fit you\?<\/title>/);
});

test("every generated landing page starts the local quiz flow from its nesting level", () => {
  for (const filePath of landingFiles) {
    const html = fs.readFileSync(filePath, "utf8");
    const name = rel(filePath);
    const expected = path.relative(path.dirname(filePath), path.join(root, "start.html")).replace(/\\/g, "/");
    const matches = html.match(/(?:\.\.\/)+start\.html/g) || [];

    assert.ok(matches.length > 0, `${name} should link to the quiz start page`);
    assert.deepEqual([...new Set(matches)], [expected], `${name} should use the relative start.html route that resolves to the repo root`);
    assert.ok(fs.existsSync(path.resolve(path.dirname(filePath), expected)), `${name} start route should resolve to an existing file`);
  }
});

test("research article export uses the new current slugs only", () => {
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];
  const researchIndex = read("landing/research-page/index.html");

  for (const slug of currentSlugs) {
    const pagePath = path.join(landingRoot, "research-page", slug, "index.html");
    assert.ok(fs.existsSync(pagePath), `expected generated page for ${slug}`);

    const html = fs.readFileSync(pagePath, "utf8");
    assert.match(html, new RegExp(`research-page/${slug}`), `${slug} should publish its canonical OG URL`);
    assert.match(html, new RegExp(`&quot;${slug}&quot;`), `${slug} should be the hydrated collection path variable`);
    assert.match(researchIndex, new RegExp(slug), `research index should link to ${slug}`);
  }

  for (const slug of retiredSlugs) {
    assert.ok(!fs.existsSync(path.join(landingRoot, "research-page", slug, "index.html")), `${slug} should stay retired`);
    assert.doesNotMatch(researchIndex, new RegExp(slug), `research index should not link to retired ${slug}`);
  }
});
