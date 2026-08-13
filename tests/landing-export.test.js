const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
const landingDir = path.join(rootDir, "landing");

function listHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listHtmlFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function relativeToRoot(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function hrefsIn(html) {
  return Array.from(html.matchAll(/\bhref="([^"]+)"/g), (match) => match[1]);
}

function resolveHref(filePath, href) {
  const basePath = `/${relativeToRoot(filePath)}`;
  return new URL(href, `https://fit-beyond-interest.test${basePath}`);
}

test("landing export consistently uses the Fit Beyond Interest brand", () => {
  const htmlFiles = listHtmlFiles(landingDir);
  assert.ok(htmlFiles.length > 0, "expected generated landing HTML files");

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, "utf8");
    const label = relativeToRoot(filePath);

    assert.match(html, /Fit Beyond Interest/, `${label} should include current brand`);
    assert.match(
      html,
      /<meta property="og:title" content="Fit Beyond Interest">/,
      `${label} should use current Open Graph title`,
    );
    assert.match(
      html,
      /<meta name="twitter:title" content="Fit Beyond Interest">/,
      `${label} should use current Twitter title`,
    );
    assert.doesNotMatch(html, /Edukate/i, `${label} should not leak retired Edukate branding`);
  }
});

test("landing quiz-entry links resolve to the root start gate", () => {
  const appPagePattern = /(?:^|\/)(start|research|survey)\.html(?:[?#].*)?$/;
  const links = [];

  for (const filePath of listHtmlFiles(landingDir)) {
    for (const href of hrefsIn(fs.readFileSync(filePath, "utf8"))) {
      const resolved = resolveHref(filePath, href);
      const appPage = resolved.pathname.match(appPagePattern)?.[1];
      if (appPage) {
        links.push({ filePath, href, resolved, appPage });
      }
    }
  }

  assert.ok(links.length > 0, "expected exported landing pages to link into the quiz");

  for (const link of links) {
    const label = `${relativeToRoot(link.filePath)} -> ${link.href}`;
    assert.equal(link.appPage, "start", `${label} should not bypass context collection`);
    assert.equal(link.resolved.pathname, "/start.html", `${label} should resolve to root start.html`);
  }
});

test("generated research pages expose the current article slugs only", () => {
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  const researchIndex = read("landing/research-page/index.html");

  for (const slug of currentSlugs) {
    const pagePath = `landing/research-page/${slug}/index.html`;
    assert.ok(fs.existsSync(path.join(rootDir, pagePath)), `${pagePath} should exist`);
    assert.match(
      read(pagePath),
      new RegExp(`property="og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}"`),
      `${pagePath} should advertise its canonical generated URL`,
    );
    assert.match(researchIndex, new RegExp(slug), `research index should reference ${slug}`);
  }

  for (const slug of retiredSlugs) {
    assert.ok(
      !fs.existsSync(path.join(rootDir, "landing", "research-page", slug)),
      `${slug} generated page should remain retired`,
    );
    assert.doesNotMatch(researchIndex, new RegExp(slug), `research index should not reference ${slug}`);
  }
});
