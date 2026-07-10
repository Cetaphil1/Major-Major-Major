const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING_DIR = path.join(ROOT, "landing");

function htmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out.sort();
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function unescapeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripQueryAndHash(href) {
  return href.split("#", 1)[0].split("?", 1)[0];
}

function resolvedRepoPath(fromFile, href) {
  const clean = stripQueryAndHash(unescapeHtml(href));
  if (
    !clean ||
    clean.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(clean) ||
    clean.startsWith("/")
  ) {
    return null;
  }
  return path.relative(ROOT, path.resolve(path.dirname(fromFile), clean)).replace(/\\/g, "/");
}

const landingHtml = htmlFiles(LANDING_DIR);

test("landing export keeps Fit Beyond Interest metadata on every generated page", () => {
  assert.ok(landingHtml.length > 0, "expected landing HTML pages to be present");

  for (const file of landingHtml) {
    const html = read(file);
    assert.match(html, /<title>[^<]*Fit Beyond Interest/i, `${rel(file)} title should use current brand`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest"/, `${rel(file)} og:title should use current brand`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest"/, `${rel(file)} twitter:title should use current brand`);
    assert.doesNotMatch(html, /\bEdukate\b/i, `${rel(file)} should not ship retired Edukate branding`);
  }
});

test("landing research collection uses current Fit Beyond Interest slugs", () => {
  const currentArticles = [
    "landing/research-page/school-effect-vs-subject-fit/index.html",
    "landing/research-page/reading-belonging-and-career-clarity/index.html",
  ];
  const retiredArticles = [
    "landing/research-page/climate-solutions/index.html",
    "landing/research-page/environmental-impact/index.html",
  ];

  for (const article of currentArticles) {
    assert.ok(fs.existsSync(path.join(ROOT, article)), `${article} should exist`);
  }

  for (const article of retiredArticles) {
    assert.equal(fs.existsSync(path.join(ROOT, article)), false, `${article} should remain retired`);
  }

  const researchIndex = read(path.join(LANDING_DIR, "research-page", "index.html"));
  for (const slug of ["school-effect-vs-subject-fit", "reading-belonging-and-career-clarity"]) {
    assert.match(researchIndex, new RegExp(slug), `research index should link ${slug}`);
  }
  for (const slug of ["climate-solutions", "environmental-impact"]) {
    assert.doesNotMatch(researchIndex, new RegExp(`research-page/${slug}`), `research index should not link retired ${slug}`);
  }
});

test("landing quiz CTAs resolve to the root context entry only", () => {
  const startLinks = [];
  const bypassLinks = [];
  const hrefPattern = /\bhref=(?:"([^"]+)"|'([^']+)')/g;

  for (const file of landingHtml) {
    const html = read(file);
    let match;
    while ((match = hrefPattern.exec(html)) !== null) {
      const href = match[1] || match[2];
      const resolved = resolvedRepoPath(file, href);
      if (!resolved) continue;

      if (stripQueryAndHash(unescapeHtml(href)).endsWith("start.html")) {
        startLinks.push({ file: rel(file), href, resolved });
      }
      if (resolved === "research.html" || resolved === "survey.html") {
        bypassLinks.push({ file: rel(file), href, resolved });
      }
    }
  }

  assert.ok(startLinks.length > 0, "expected at least one landing CTA into start.html");
  assert.deepEqual(
    [...new Set(startLinks.map((link) => link.resolved))],
    ["start.html"],
    `landing start links should all resolve to root start.html: ${JSON.stringify(startLinks, null, 2)}`
  );
  assert.deepEqual(bypassLinks, [], "landing pages should not bypass context with research.html or survey.html links");
});
