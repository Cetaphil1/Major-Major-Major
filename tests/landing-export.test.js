const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function htmlFiles(dirRel) {
  const dir = path.join(root, dirRel);
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  }

  walk(dir);
  return files.sort();
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&amp;/g, "&");
}

function hrefsFrom(html) {
  const hrefs = [];
  const hrefPattern = /\bhref=(?:"([^"]*)"|'([^']*)'|&quot;([^&]*)&quot;)/g;
  let match;

  while ((match = hrefPattern.exec(html))) {
    hrefs.push(decodeHtml(match[1] || match[2] || match[3] || ""));
  }

  return hrefs;
}

function resolvedPath(fromRelPath, href) {
  const pageDir = path.posix.dirname("/" + fromRelPath);
  return new URL(href, "https://fit.test" + pageDir + "/").pathname;
}

test("generated landing pages keep the Fit Beyond Interest rebrand", () => {
  const files = htmlFiles("landing");
  assert.ok(files.length > 0, "expected generated landing html files");

  for (const file of files) {
    const html = read(file);

    assert.match(html, /<title>[^<]*Fit Beyond Interest[^<]*<\/title>/, `${file} title should use the new brand`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, `${file} should have branded og:title`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${file} should have branded twitter:title`);
    assert.doesNotMatch(html, /\bEdukate\b/i, `${file} should not ship stale Edukate copy`);
  }
});

test("landing quiz-entry links resolve to the root start flow", () => {
  const files = htmlFiles("landing");
  const startLinks = [];
  const bypassLinks = [];

  for (const file of files) {
    const html = read(file);

    for (const href of hrefsFrom(html)) {
      if (href.includes("start.html")) {
        startLinks.push({ file, href, resolved: resolvedPath(file, href) });
      }

      if (href.includes("research.html") || href.includes("survey.html")) {
        bypassLinks.push({ file, href, resolved: resolvedPath(file, href) });
      }
    }
  }

  assert.ok(startLinks.length > 0, "expected generated landing pages to expose quiz-entry links");
  assert.deepEqual(
    startLinks.filter((link) => link.resolved !== "/start.html"),
    [],
    "landing start links should enter the root app flow, not a nested missing page"
  );
  assert.deepEqual(
    bypassLinks,
    [],
    "landing pages should not bypass saved-context setup by linking directly to research.html or survey.html"
  );
});

test("current research article slugs are present and retired Edukate slugs stay removed", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];
  const researchIndex = read("landing/research-page/index.html");

  for (const slug of currentSlugs) {
    const relPath = `landing/research-page/${slug}/index.html`;
    assert.ok(fs.existsSync(path.join(root, relPath)), `${slug} page should exist`);

    const html = read(relPath);
    assert.match(html, new RegExp(`/research-page/${slug}`), `${slug} should publish its canonical route`);
    assert.match(html, new RegExp(`&quot;${slug}&quot;`), `${slug} should be wired through Framer path variables`);
    assert.match(researchIndex, new RegExp(slug), `research index should link ${slug}`);
  }

  for (const slug of retiredSlugs) {
    assert.equal(
      fs.existsSync(path.join(root, `landing/research-page/${slug}/index.html`)),
      false,
      `${slug} should remain removed`
    );
    assert.doesNotMatch(researchIndex, new RegExp(slug), `research index should not link retired slug ${slug}`);
  }
});
