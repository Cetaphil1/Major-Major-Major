const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const landingRoot = path.join(repoRoot, "landing");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function walkHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function landingHtmlFiles() {
  return walkHtml(landingRoot).map((file) => path.relative(repoRoot, file).replaceAll(path.sep, "/"));
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function hrefsFrom(html) {
  const hrefs = [];
  const regex = /\bhref\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = regex.exec(html))) {
    hrefs.push(decodeHtml(match[2]));
  }
  return hrefs;
}

function landingSitePath(fileRelativePath, href) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) {
    return null;
  }

  const withoutHashOrQuery = href.split(/[?#]/, 1)[0];
  if (!withoutHashOrQuery) return null;

  const siteFilePath = path.relative(landingRoot, path.join(repoRoot, fileRelativePath)).replaceAll(path.sep, "/");
  const siteDirectory = path.posix.dirname(`/${siteFilePath}`);
  return path.posix.normalize(
    withoutHashOrQuery.startsWith("/")
      ? withoutHashOrQuery
      : path.posix.join(siteDirectory, withoutHashOrQuery),
  );
}

test("generated landing entry CTAs route into the start flow", () => {
  const entryPages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/research-page/index.html",
  ];

  for (const page of entryPages) {
    const startTargets = hrefsFrom(read(page))
      .filter((href) => href.includes("start.html"))
      .map((href) => landingSitePath(page, href));

    assert.ok(startTargets.length > 0, `${page} should expose a start.html CTA`);
    assert.deepEqual(new Set(startTargets), new Set(["/start.html"]), `${page} should link to the root start flow`);
  }
});

test("generated landing pages do not bypass context or research steps", () => {
  const bypassLinks = [];

  for (const page of landingHtmlFiles()) {
    for (const href of hrefsFrom(read(page))) {
      const target = landingSitePath(page, href);
      if (target === "/research.html" || target === "/survey.html") {
        bypassLinks.push(`${page} -> ${href}`);
      }
    }
  }

  assert.deepEqual(bypassLinks, [], "landing export should not deep-link directly to research.html or survey.html");
});

test("current research article exports are present with canonical social URLs", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];

  for (const slug of currentSlugs) {
    const page = `landing/research-page/${slug}/index.html`;
    const html = read(page);

    assert.match(html, new RegExp(`property="og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}"`));
    assert.match(html, new RegExp(`&quot;${slug}&quot;`), `${page} should preserve the generated route path variable`);
  }
});

test("retired Edukate research exports stay removed from generated pages", () => {
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];
  const researchPages = landingHtmlFiles().filter((page) => page.startsWith("landing/research-page/"));

  for (const slug of retiredSlugs) {
    assert.equal(fs.existsSync(path.join(landingRoot, "research-page", slug, "index.html")), false, `${slug} should not be exported`);

    for (const page of researchPages) {
      assert.equal(read(page).includes(slug), false, `${page} should not reference retired slug ${slug}`);
    }
  }
});

test("generated landing metadata uses the Fit Beyond Interest rebrand", () => {
  for (const page of landingHtmlFiles()) {
    const html = read(page);

    assert.match(html, /<title>[^<]*Fit Beyond Interest[^<]*<\/title>/, `${page} should use Fit Beyond Interest title metadata`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, `${page} should use Fit Beyond Interest Open Graph title`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${page} should use Fit Beyond Interest Twitter title`);
    assert.equal(html.includes("Edukate"), false, `${page} should not contain retired Edukate branding`);
  }
});
