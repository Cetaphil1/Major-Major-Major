const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const landingRoot = path.join(root, "landing");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  });
}

function landingHtmlFiles() {
  return walk(landingRoot)
    .filter((file) => file.endsWith(".html"))
    .map((file) => path.relative(root, file).split(path.sep).join(path.posix.sep))
    .sort();
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x2F;|&#47;/gi, "/");
}

function extractHtmlRefs(html, targetFile) {
  const refs = new Set();
  const escaped = targetFile.replace(".", "\\.");
  const patterns = [
    new RegExp(`href=["']([^"']*${escaped}[^"']*)["']`, "g"),
    new RegExp(`href=&quot;([^&]*${escaped}[^&]*)&quot;`, "g"),
    new RegExp(`"href"\\s*:\\s*"([^"]*${escaped}[^"]*)"`, "g"),
    new RegExp(`&quot;href&quot;\\s*:\\s*&quot;([^&]*${escaped}[^&]*)&quot;`, "g"),
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      refs.add(decodeHtml(match[1]));
    }
  }

  return [...refs];
}

function resolveRef(fromRelPath, href) {
  const pathOnly = href.split(/[?#]/, 1)[0];
  if (/^https?:\/\//i.test(pathOnly)) {
    return new URL(pathOnly).pathname.replace(/^\/+/, "");
  }
  if (pathOnly.startsWith("/")) return pathOnly.replace(/^\/+/, "");
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRelPath), pathOnly));
}

test("generated landing pages keep Fit Beyond Interest branding", () => {
  const files = landingHtmlFiles();
  assert.ok(files.length >= 18, "expected the generated landing export pages to be present");

  for (const file of files) {
    const html = read(file);
    assert.match(html, /Fit Beyond Interest/, `${file} should include the current product name`);
    assert.doesNotMatch(html, /Edukate/i, `${file} should not expose retired Edukate branding`);
  }
});

test("landing quiz-entry links resolve to the root start flow", () => {
  for (const file of landingHtmlFiles()) {
    const html = read(file);
    const startRefs = extractHtmlRefs(html, "start.html");
    assert.ok(startRefs.length > 0, `${file} should link into the quiz start flow`);

    for (const href of startRefs) {
      assert.equal(
        resolveRef(file, href),
        "start.html",
        `${file} href ${href} should resolve to root start.html`
      );
    }

    assert.deepEqual(extractHtmlRefs(html, "research.html"), [], `${file} should not bypass context into research`);
    assert.deepEqual(extractHtmlRefs(html, "survey.html"), [], `${file} should not bypass context into survey`);
  }
});

test("research article export uses current slugs and removes retired Edukate slugs", () => {
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
    const relPath = `landing/research-page/${slug}/index.html`;
    assert.ok(fs.existsSync(path.join(root, relPath)), `${relPath} should exist`);
    assert.match(indexHtml, new RegExp(slug), `research index should link to ${slug}`);
    assert.match(read(relPath), new RegExp(`/research-page/${slug}`), `${relPath} should keep canonical slug metadata`);
  }

  for (const slug of retiredSlugs) {
    assert.equal(
      fs.existsSync(path.join(root, `landing/research-page/${slug}/index.html`)),
      false,
      `${slug} should not be exported anymore`
    );
    assert.doesNotMatch(indexHtml, new RegExp(slug), `research index should not link to retired slug ${slug}`);
  }
});
