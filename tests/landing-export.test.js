const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function walkHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

test("generated landing export is consistently rebranded", () => {
  const landingFiles = walkHtml(path.join(ROOT, "landing"));
  assert.ok(landingFiles.length >= 18, "expected the generated landing export to be present");

  const staleCopyFiles = [];
  const missingTitleFiles = [];
  const missingOgTitleFiles = [];

  for (const filePath of landingFiles) {
    const html = fs.readFileSync(filePath, "utf8");
    if (/Edukate/i.test(html)) staleCopyFiles.push(rel(filePath));
    if (!/<title>[^<]*Fit Beyond Interest[^<]*<\/title>/.test(html)) missingTitleFiles.push(rel(filePath));
    if (!/<meta property="og:title" content="Fit Beyond Interest">/.test(html)) missingOgTitleFiles.push(rel(filePath));
  }

  assert.deepEqual(staleCopyFiles, [], "stale Edukate copy should not survive the rebrand");
  assert.deepEqual(missingTitleFiles, [], "each generated page title should carry the Fit Beyond Interest brand");
  assert.deepEqual(missingOgTitleFiles, [], "each generated page should share the new social title");
});

test("landing entry points send visitors to the prelanding quiz flow", () => {
  const entryPages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/research-page/index.html",
  ];

  for (const page of entryPages) {
    const html = read(page);
    assert.match(html, /start\.html/, `${page} should link into the context-gathering start flow`);
    assert.doesNotMatch(html, /research\.html/, `${page} should not skip straight to research`);
    assert.doesNotMatch(html, /survey\.html/, `${page} should not skip straight to the survey`);
  }
});

test("research article inventory matches the current Fit Beyond Interest slugs", () => {
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];
  const indexHtml = read("landing/research-page/index.html");

  for (const slug of currentSlugs) {
    const articlePath = `landing/research-page/${slug}/index.html`;
    assert.ok(fs.existsSync(path.join(ROOT, articlePath)), `${articlePath} should exist`);
    assert.match(indexHtml, new RegExp(slug), `research index should reference ${slug}`);

    const articleHtml = read(articlePath);
    assert.match(articleHtml, /<title>Fit Beyond Interest<\/title>/);
    assert.match(
      articleHtml,
      new RegExp(`<meta property="og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}">`),
      `${articlePath} should publish a canonical social URL for its slug`,
    );
  }

  for (const slug of retiredSlugs) {
    assert.ok(!fs.existsSync(path.join(ROOT, "landing/research-page", slug)), `${slug} should remain retired`);
    assert.doesNotMatch(indexHtml, new RegExp(slug), `research index should not reference retired slug ${slug}`);
  }
});
