const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function landingHtmlFiles(dir = "landing") {
  const absDir = path.join(repoRoot, dir);
  return fs.readdirSync(absDir, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return landingHtmlFiles(rel);
    return entry.isFile() && entry.name.endsWith(".html") ? [rel] : [];
  });
}

test("landing export keeps the Fit Beyond Interest brand in page metadata", () => {
  const files = landingHtmlFiles();

  assert.ok(files.length > 0, "expected landing HTML files to be exported");
  for (const file of files) {
    const html = read(file);
    assert.match(
      html,
      /<meta property="og:title" content="Fit Beyond Interest">/,
      `${file} should expose the new Open Graph brand`
    );
    assert.match(
      html,
      /<meta name="twitter:title" content="Fit Beyond Interest">/,
      `${file} should expose the new Twitter brand`
    );
    assert.doesNotMatch(html, /\bEdukate\b/, `${file} should not leak the old Edukate brand`);
  }
});

test("landing home page advertises the current major-fit positioning", () => {
  const html = read("landing/index.html");

  assert.match(html, /<title>Fit Beyond Interest[^<]*Does your major actually fit you\?<\/title>/);
  assert.match(html, /Does your major actually fit you\?/);
  assert.match(html, /Fit Beyond Interest/);
});

test("research article slugs point to current content and not retired Edukate articles", () => {
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];
  const landingPages = landingHtmlFiles();
  const allLandingHtml = landingPages.map(read).join("\n");

  for (const slug of currentSlugs) {
    assert.ok(
      exists(`landing/research-page/${slug}/index.html`),
      `expected current article export for ${slug}`
    );
    assert.match(
      allLandingHtml,
      new RegExp(`/research-page/${slug}\\b`),
      `expected landing export to link ${slug}`
    );
  }

  for (const slug of retiredSlugs) {
    assert.ok(
      !exists(`landing/research-page/${slug}/index.html`),
      `retired article export should stay removed: ${slug}`
    );
    assert.doesNotMatch(
      allLandingHtml,
      new RegExp(slug),
      `landing export should not link retired article ${slug}`
    );
  }
});

test("research article pages hydrate with their own slug metadata", () => {
  const slugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];

  for (const slug of slugs) {
    const html = read(`landing/research-page/${slug}/index.html`);

    assert.match(
      html,
      new RegExp(`https://incredible-pages-588758\\.framer\\.app/research-page/${slug}\\b`),
      `${slug} should publish its own canonical social URL`
    );
    assert.match(
      html,
      new RegExp(`&quot;${slug}&quot;`),
      `${slug} should be present in the Framer hydrate path variables`
    );
  }
});
