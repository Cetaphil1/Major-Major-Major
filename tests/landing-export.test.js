const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { ROOT, readRepoFile } = require("./vm-helpers");

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listHtmlFiles(fullPath));
    } else if (entry.name.endsWith(".html")) {
      out.push(fullPath);
    }
  }
  return out;
}

function hrefsFor(html) {
  return Array.from(html.matchAll(/\bhref="([^"]+)"/g), (match) => match[1]);
}

const landingFiles = listHtmlFiles(path.join(ROOT, "landing"));

test("latest landing export is rebranded without retired Edukate slugs", () => {
  assert.ok(landingFiles.length > 0, "landing export should include HTML pages");

  for (const file of landingFiles) {
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, file);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, file);
    assert.doesNotMatch(html, /Edukate|edukate|college-readiness|faculty-excellence|graduation-ceremony|teaching-excellence/, file);
  }
});

test("marketing quiz-entry links resolve to the root prelanding page", () => {
  const filesWithQuizEntry = [];

  for (const file of landingFiles) {
    const html = fs.readFileSync(file, "utf8");
    const flowHrefs = hrefsFor(html).filter((href) => /(?:start|research|survey)\.html/.test(href));
    if (!flowHrefs.length) continue;

    filesWithQuizEntry.push(file);
    assert.ok(flowHrefs.every((href) => /start\.html(?:[#?].*)?$/.test(href)), `${file} should not bypass start.html`);

    for (const href of flowHrefs) {
      const cleanHref = href.split(/[?#]/, 1)[0];
      assert.equal(
        path.resolve(path.dirname(file), cleanHref),
        path.join(ROOT, "start.html"),
        `${file} should resolve ${href} to root start.html`,
      );
    }
  }

  assert.ok(filesWithQuizEntry.length >= 10, "expected generated landing pages to expose quiz-entry links");
});

test("current research article pages are exported and retired articles stay removed", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  for (const slug of currentSlugs) {
    const file = path.join(ROOT, "landing", "research-page", slug, "index.html");
    assert.ok(fs.existsSync(file), `${slug} should be exported`);
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, new RegExp(`og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}`));
    assert.match(html, new RegExp(`&quot;${slug}&quot;`));
  }

  for (const slug of retiredSlugs) {
    assert.equal(
      fs.existsSync(path.join(ROOT, "landing", "research-page", slug, "index.html")),
      false,
      `${slug} should remain removed`,
    );
  }

  const index = readRepoFile("landing", "research-page", "index.html");
  for (const slug of retiredSlugs) {
    assert.doesNotMatch(index, new RegExp(slug));
  }
});
