const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING_ROOT = path.join(ROOT, "landing");
const WEB_ORIGIN = "https://fit-beyond-interest.test";

function walkHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function hrefs(html) {
  return Array.from(html.matchAll(/\bhref="([^"]+)"/g), (match) => match[1]);
}

function resolveWebPath(file, href) {
  const relativeDir = path.relative(ROOT, path.dirname(file)).split(path.sep).join("/");
  const base = new URL(`/${relativeDir ? `${relativeDir}/` : ""}`, WEB_ORIGIN);
  return new URL(href, base).pathname;
}

test("generated landing pages keep the Fit Beyond Interest rebrand", () => {
  const files = walkHtmlFiles(LANDING_ROOT);
  assert.ok(files.length > 0, "expected generated landing HTML files");

  for (const file of files) {
    const html = read(file);
    const label = relative(file);

    assert.match(html, /<title>[^<]*Fit Beyond Interest[^<]*<\/title>/, `${label} title should be rebranded`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, `${label} should expose rebranded OG title`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${label} should expose rebranded Twitter title`);
    assert.doesNotMatch(html, /Edukate/i, `${label} should not ship retired Edukate template copy`);
  }
});

test("landing quiz CTAs enter the root context flow without bypassing research or survey", () => {
  const files = walkHtmlFiles(LANDING_ROOT);
  const startLinks = [];

  for (const file of files) {
    const html = read(file);
    for (const href of hrefs(html)) {
      if (/start\.html(?:[?#].*)?$/i.test(href)) {
        startLinks.push([file, href, resolveWebPath(file, href)]);
      }

      assert.notEqual(
        resolveWebPath(file, href),
        "/research.html",
        `${relative(file)} should not bypass context directly to research.html via ${href}`,
      );
      assert.notEqual(
        resolveWebPath(file, href),
        "/survey.html",
        `${relative(file)} should not bypass context directly to survey.html via ${href}`,
      );
    }
  }

  assert.ok(startLinks.length > 0, "expected at least one generated landing CTA to start.html");
  for (const [file, href, resolved] of startLinks) {
    assert.equal(resolved, "/start.html", `${relative(file)} ${href} should resolve to the root app start flow`);
  }
});

test("research article slugs match the Fit Beyond Interest content model", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "college-readiness",
    "faculty-excellence",
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];
  const researchIndex = read(path.join(LANDING_ROOT, "research-page", "index.html"));

  for (const slug of currentSlugs) {
    const articlePath = path.join(LANDING_ROOT, "research-page", slug, "index.html");
    assert.ok(fs.existsSync(articlePath), `expected current article page for ${slug}`);

    const articleHtml = read(articlePath);
    assert.match(articleHtml, new RegExp(`/research-page/${slug}`), `${slug} should publish its canonical OG URL`);
    assert.match(researchIndex, new RegExp(slug), `research index should expose current article slug ${slug}`);
  }

  for (const slug of retiredSlugs) {
    assert.ok(!fs.existsSync(path.join(LANDING_ROOT, "research-page", slug)), `retired slug directory should stay removed: ${slug}`);
    assert.doesNotMatch(researchIndex, new RegExp(slug, "i"), `research index should not link retired slug ${slug}`);
  }
});
