const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/");
}

function walkHtmlFiles(relDir) {
  const absDir = path.join(root, relDir);
  return fs.readdirSync(absDir, { withFileTypes: true }).flatMap((entry) => {
    const relPath = path.join(relDir, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(relPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [relPath] : [];
  });
}

function hrefsFrom(relPath) {
  const html = decodeHtml(read(relPath));
  const hrefs = new Set();
  for (const match of html.matchAll(/\bhref\s*=\s*"([^"]+)"/g)) {
    hrefs.add(match[1]);
  }
  for (const match of html.matchAll(/"href"\s*:\s*"([^"]+)"/g)) {
    hrefs.add(match[1]);
  }
  return [...hrefs];
}

function resolvedPath(fromRelPath, href) {
  return new URL(href, `https://example.test/${fromRelPath}`).pathname;
}

test("generated landing pages enter the context flow, not research or survey directly", () => {
  const pages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/research-page/index.html",
  ];

  for (const page of pages) {
    const paths = hrefsFrom(page).map((href) => resolvedPath(page, href));

    assert(
      paths.includes("/start.html"),
      `${page} should link quiz CTAs to the root start.html flow`,
    );
    assert(
      !paths.includes("/research.html"),
      `${page} should not bypass pre-landing research context`,
    );
    assert(
      !paths.includes("/survey.html"),
      `${page} should not bypass pre-landing survey context`,
    );
  }
});

test("landing export uses current Fit Beyond Interest branding without retired Edukate content", () => {
  const files = walkHtmlFiles("landing");
  const combined = files.map(read).join("\n");

  assert.match(read("landing/index.html"), /<title>Fit Beyond Interest\b[\s\S]*Does your major actually fit you\?<\/title>/);
  assert.match(combined, /Fit Beyond Interest/);
  assert.doesNotMatch(combined, /Edukate/);
  assert.doesNotMatch(combined, /college-readiness|faculty-excellence/);
  assert.doesNotMatch(combined, /professor-receives-national-teaching-excellence-award/);
  assert.doesNotMatch(combined, /record-breaking-graduation-ceremony/);
});

test("research export exposes current article slugs and no retired article files", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  for (const slug of currentSlugs) {
    const relPath = `landing/research-page/${slug}/index.html`;
    assert.equal(fs.existsSync(path.join(root, relPath)), true, `${relPath} should exist`);

    const html = read(relPath);
    assert.match(html, new RegExp(slug));
    assert.match(html, new RegExp(`og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}`));
  }

  for (const slug of retiredSlugs) {
    assert.equal(
      fs.existsSync(path.join(root, `landing/research-page/${slug}/index.html`)),
      false,
      `${slug} should remain removed from the export`,
    );
  }
});
