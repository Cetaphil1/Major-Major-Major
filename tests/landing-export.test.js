const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function decodeHtml(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function walkHtml(dir, prefix = dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) return walkHtml(rel, rel);
    return entry.isFile() && entry.name.endsWith(".html") ? [rel] : [];
  });
}

test("generated landing pages stay rebranded away from Edukate", () => {
  const pages = walkHtml("landing");
  assert.ok(pages.length > 0, "expected generated landing HTML pages");

  for (const page of pages) {
    const html = decodeHtml(read(page));
    assert.match(html, /Fit Beyond Interest/, `${page} should carry the current brand`);
    assert.doesNotMatch(html, /\bEdukate\b/, `${page} should not leak the retired Edukate brand`);
  }
});

test("landing entry points start with context collection instead of bypassing the flow", () => {
  const home = decodeHtml(read("landing/index.html"));

  assert.match(home, /\/start\.html/, "primary landing export should link into the start flow");
  assert.doesNotMatch(
    home,
    /\/(?:research|survey)\.html|href="(?:research|survey)\.html"/,
    "marketing landing should not send new users directly to research or survey pages",
  );
});

test("research export exposes current articles and omits retired Edukate slugs", () => {
  const index = decodeHtml(read("landing/research-page/index.html"));
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  for (const slug of currentSlugs) {
    assert.ok(
      fs.existsSync(path.join(ROOT, "landing", "research-page", slug, "index.html")),
      `expected generated article page for ${slug}`,
    );
    assert.match(index, new RegExp(`/research-page/${slug}`), `research index should link ${slug}`);
    assert.match(
      decodeHtml(read(`landing/research-page/${slug}/index.html`)),
      new RegExp(`og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}`),
      `${slug} should publish a canonical Open Graph URL`,
    );
  }

  for (const slug of retiredSlugs) {
    assert.ok(
      !fs.existsSync(path.join(ROOT, "landing", "research-page", slug, "index.html")),
      `retired generated page should not exist for ${slug}`,
    );
    assert.doesNotMatch(index, new RegExp(slug), `research index should not link retired slug ${slug}`);
  }
});
