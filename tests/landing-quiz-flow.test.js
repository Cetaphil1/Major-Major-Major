const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const landingRoot = path.join(repoRoot, "landing");

function walkHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function hrefsIn(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

function localTargetExists(fromFile, href) {
  const withoutFragment = href.split("#")[0].split("?")[0];
  if (!withoutFragment || /^[a-z][a-z0-9+.-]*:/i.test(withoutFragment)) return true;

  const resolved = path.resolve(path.dirname(fromFile), withoutFragment);
  if (fs.existsSync(resolved)) return true;

  return fs.existsSync(path.join(resolved, "index.html"));
}

test("all landing quiz CTAs resolve to root start.html from their page depth", () => {
  const pages = walkHtml(landingRoot);
  const startLinks = [];

  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    for (const href of hrefsIn(html).filter((value) => value.includes("start.html"))) {
      const resolved = path.resolve(path.dirname(file), href);
      startLinks.push({ file: path.relative(repoRoot, file), href, resolved });
    }
  }

  assert.ok(startLinks.length > 0, "expected generated landing pages to link into the quiz flow");
  for (const link of startLinks) {
    assert.equal(
      link.resolved,
      path.join(repoRoot, "start.html"),
      `${link.file} has a quiz CTA that does not resolve to root start.html: ${link.href}`,
    );
  }
});

test("landing pages do not bypass the context step by linking directly to app-only pages", () => {
  const bypassLinks = [];

  for (const file of walkHtml(landingRoot)) {
    const html = fs.readFileSync(file, "utf8");
    for (const href of hrefsIn(html)) {
      const resolved = path.resolve(path.dirname(file), href.split("#")[0].split("?")[0]);
      if (resolved === path.join(repoRoot, "survey.html") || resolved === path.join(repoRoot, "research.html")) {
        bypassLinks.push(`${path.relative(repoRoot, file)} -> ${href}`);
      }
    }
  }

  assert.deepEqual(bypassLinks, [], "landing CTAs must send first-time users through start.html");
});

test("rebranded research articles use the current slugs and no stale Edukate paths", () => {
  const researchIndex = fs.readFileSync(path.join(landingRoot, "research-page", "index.html"), "utf8");
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-to-launch-new-ai-research-center",
  ];

  for (const slug of currentSlugs) {
    assert.ok(
      fs.existsSync(path.join(landingRoot, "research-page", slug, "index.html")),
      `missing generated research article page for ${slug}`,
    );
    assert.match(researchIndex, new RegExp(`${slug}/index\\.html`), `research index should link to ${slug}`);
  }

  const landingText = walkHtml(landingRoot)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  for (const slug of retiredSlugs) {
    assert.doesNotMatch(landingText, new RegExp(slug, "i"), `stale retired research slug still referenced: ${slug}`);
    assert.ok(!fs.existsSync(path.join(landingRoot, "research-page", slug)), `retired slug directory still exists: ${slug}`);
  }
  assert.doesNotMatch(landingText, /Edukate/i, "landing export should not contain stale Edukate branding");
});

test("all local landing hrefs resolve to committed files", () => {
  const brokenLinks = [];

  for (const file of walkHtml(landingRoot)) {
    const html = fs.readFileSync(file, "utf8");
    for (const href of hrefsIn(html)) {
      if (!localTargetExists(file, href)) {
        brokenLinks.push(`${path.relative(repoRoot, file)} -> ${href}`);
      }
    }
  }

  assert.deepEqual(brokenLinks, []);
});
