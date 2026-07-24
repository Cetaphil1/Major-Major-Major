const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function htmlFilesUnder(relativePath) {
  const directory = path.join(root, relativePath);
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return htmlFilesUnder(child);
    return entry.isFile() && entry.name.endsWith(".html") ? [child] : [];
  });
}

test("generated landing pages keep the Fit Beyond Interest rebrand", () => {
  const files = htmlFilesUnder("landing");
  assert.ok(files.length > 0, "expected generated landing HTML files");

  for (const file of files) {
    const html = read(file);
    assert.match(html, /Fit Beyond Interest/, `${file} should expose current product branding`);
    assert.doesNotMatch(html, /Edukate/i, `${file} should not leak stale Edukate template copy`);
  }
});

test("public landing page sends quiz traffic only to the start flow", () => {
  const html = read("landing/index.html");

  assert.match(html, /<title>Fit Beyond Interest .+?Does your major actually fit you\?<\/title>/);
  assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/);
  assert.match(html, /start\.html/, "landing CTA should enter the context/start flow");
  assert.doesNotMatch(html, /research\.html|survey\.html/, "landing must not deep-link past context collection");
});

test("research landing articles use the new Fit Beyond Interest slugs", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  const indexHtml = read("landing/research-page/index.html");

  for (const slug of currentSlugs) {
    assert.ok(exists(`landing/research-page/${slug}/index.html`), `${slug} article should exist`);
    assert.match(indexHtml, new RegExp(slug), `research index should link ${slug}`);

    const articleHtml = read(`landing/research-page/${slug}/index.html`);
    assert.match(articleHtml, new RegExp(`/research-page/${slug}`), `${slug} should set canonical social URL`);
  }

  for (const slug of retiredSlugs) {
    assert.ok(!exists(`landing/research-page/${slug}/index.html`), `${slug} article should stay retired`);
    assert.doesNotMatch(indexHtml, new RegExp(slug), `research index should not link retired slug ${slug}`);
  }
});
