const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
const landingDir = path.join(rootDir, "landing");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function walkHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function projectRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function extractHrefs(html) {
  return Array.from(html.matchAll(/\bhref="([^"]+)"/g), (match) => match[1]);
}

function resolveInternalHref(fromFile, href) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|$)/i.test(href)) return null;

  const cleanHref = href.split("#")[0].split("?")[0];
  if (!cleanHref) return null;

  return path.normalize(path.resolve(path.dirname(fromFile), cleanHref));
}

test("landing pages route product CTAs to the root start flow", () => {
  const startPage = path.join(rootDir, "start.html");
  const landingFiles = walkHtmlFiles(landingDir);

  for (const file of landingFiles) {
    const html = fs.readFileSync(file, "utf8");
    const startLinks = extractHrefs(html).filter((href) => href.includes("start.html"));

    assert.ok(startLinks.length > 0, `${projectRelative(file)} should link to the start flow`);

    for (const href of startLinks) {
      assert.equal(
        resolveInternalHref(file, href),
        startPage,
        `${projectRelative(file)} has a start-flow link that does not resolve to root start.html: ${href}`,
      );
    }
  }
});

test("landing research links cover the current article slugs", () => {
  const landingHome = readProjectFile("landing/index.html");
  const researchIndex = readProjectFile("landing/research-page/index.html");
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];

  for (const slug of currentSlugs) {
    const articlePath = `landing/research-page/${slug}/index.html`;
    const articleHtml = readProjectFile(articlePath);

    assert.ok(fs.existsSync(path.join(rootDir, articlePath)), `${articlePath} should exist`);
    assert.match(landingHome, new RegExp(`research-page/${slug}/index\\.html`));
    assert.match(researchIndex, new RegExp(`\\./${slug}/index\\.html`));
    assert.match(articleHtml, /Fit Beyond Interest/);
    assert.doesNotMatch(articleHtml, /Edukate/i);
  }
});

test("landing export no longer references deleted research article slugs", () => {
  const landingHtml = walkHtmlFiles(landingDir)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  assert.doesNotMatch(
    landingHtml,
    /edukate-professor-receives-national-teaching-excellence-award/,
  );
  assert.doesNotMatch(
    landingHtml,
    /edukate-university-celebrates-record-breaking-graduation-ceremony/,
  );
});
