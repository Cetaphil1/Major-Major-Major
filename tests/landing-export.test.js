const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING_ROOT = path.join(ROOT, "landing");

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function extractHrefs(html) {
  return Array.from(html.matchAll(/\bhref="([^"]+)"/g), (match) =>
    match[1].replace(/&amp;/g, "&")
  );
}

function resolveSitePath(fromRelativePath, href) {
  if (/^(?:https?:)?\/\//i.test(href) || href.startsWith("#") || href.startsWith("mailto:")) {
    return null;
  }
  const withoutQuery = href.split(/[?#]/, 1)[0];
  const fromDir = path.posix.dirname(fromRelativePath.replace(/\\/g, "/"));
  return path.posix.normalize(`/${fromDir}/${withoutQuery}`);
}

test("generated landing pages keep Fit Beyond Interest metadata and retired branding out", () => {
  const files = htmlFiles(LANDING_ROOT);
  assert.ok(files.length > 0, "expected generated landing HTML files");

  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const relative = path.relative(ROOT, file);

    assert.match(html, /<title>[^<]*Fit Beyond Interest[^<]*<\/title>/, `${relative} title is rebranded`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, `${relative} has OG brand`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${relative} has Twitter brand`);
    assert.doesNotMatch(html, /Edukate/i, `${relative} must not expose retired Edukate branding`);
  }
});

test("marketing entry pages send quiz traffic to the start flow instead of bypassing context", () => {
  const entryPages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/research-page/index.html",
  ];

  for (const page of entryPages) {
    const html = read(page);
    const sitePaths = extractHrefs(html)
      .map((href) => resolveSitePath(page, href))
      .filter(Boolean);

    assert.ok(
      sitePaths.includes("/start.html"),
      `${page} should include a quiz-entry link to the root start flow`
    );
    assert.equal(
      sitePaths.filter((href) => href === "/research.html" || href === "/survey.html").length,
      0,
      `${page} should not bypass context by linking directly to research.html or survey.html`
    );
  }
});

test("current research article slugs exist and retired slugs are removed from landing export", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = ["college-readiness", "faculty-excellence"];

  for (const slug of currentSlugs) {
    const relative = `landing/research-page/${slug}/index.html`;
    const html = read(relative);

    assert.match(
      html,
      new RegExp(`og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}`),
      `${relative} should advertise the canonical research-page URL`
    );
    assert.match(html, new RegExp(`&quot;${slug}&quot;`), `${relative} should hydrate with its slug`);
  }

  const landingText = htmlFiles(LANDING_ROOT)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  for (const slug of retiredSlugs) {
    assert.equal(
      fs.existsSync(path.join(LANDING_ROOT, "research-page", slug)),
      false,
      `retired research directory ${slug} should not exist`
    );
    assert.doesNotMatch(landingText, new RegExp(slug), `landing export should not reference ${slug}`);
  }
});
