const assert = require("node:assert/strict");
const { readdir, readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING_ROOT = path.join(ROOT, "landing");

async function landingPages(dir = LANDING_ROOT) {
  const entries = await readdir(dir, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...await landingPages(fullPath));
    } else if (entry.name === "index.html") {
      pages.push(fullPath);
    }
  }

  return pages.sort();
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function startLinks(html) {
  const decoded = decodeHtmlEntities(html);
  const matches = decoded.match(/(?:\.\.\/)*start\.html(?:[?#][^"'<>\s)]*)?/g);
  return [...new Set(matches || [])];
}

test("generated landing pages use current Fit Beyond Interest branding", async () => {
  const pages = await landingPages();
  assert.ok(pages.length > 0, "expected generated landing pages");

  for (const page of pages) {
    const html = await readFile(page, "utf8");
    assert.match(html, /<title>[^<]*Fit Beyond Interest/i, rel(page));
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, rel(page));
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, rel(page));
    assert.doesNotMatch(html, /Edukate|edukate/, `${rel(page)} should not contain retired Edukate branding`);
  }
});

test("generated landing start links resolve to the root quiz setup page", async () => {
  const pages = await landingPages();

  for (const page of pages) {
    const html = await readFile(page, "utf8");
    const links = startLinks(html);
    assert.ok(links.length > 0, `${rel(page)} should contain a start-flow CTA`);

    for (const link of links) {
      const resolved = path.resolve(path.dirname(page), link);
      assert.equal(
        resolved,
        path.join(ROOT, "start.html"),
        `${rel(page)} link ${link} should resolve to root start.html`,
      );
    }
  }
});

test("research export exposes current article slugs and omits retired Edukate slugs", async () => {
  const pages = await landingPages(path.join(LANDING_ROOT, "research-page"));
  const paths = pages.map(rel);

  assert.ok(
    paths.includes("landing/research-page/school-effect-vs-subject-fit/index.html"),
    "school-vs-major research article should be exported",
  );
  assert.ok(
    paths.includes("landing/research-page/reading-belonging-and-career-clarity/index.html"),
    "belonging/career-clarity research article should be exported",
  );
  assert.equal(
    paths.some((pagePath) => pagePath.includes("edukate-")),
    false,
    "retired Edukate article paths should not be exported",
  );

  for (const page of pages) {
    const html = await readFile(page, "utf8");
    assert.doesNotMatch(html, /research-page\/edukate-/i, `${rel(page)} should not link retired Edukate slugs`);
  }
});
