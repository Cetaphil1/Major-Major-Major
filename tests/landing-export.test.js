const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function htmlHrefs(html) {
  return Array.from(html.matchAll(/href="([^"]+)"/g), (match) => match[1]);
}

function resolveFromPage(pageRel, href) {
  return path.relative(
    ROOT,
    path.resolve(path.dirname(path.join(ROOT, pageRel)), href),
  ).replace(/\\/g, "/");
}

test("generated landing entry points start at the prelanding flow", () => {
  const pages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/research-page/index.html",
  ];

  for (const page of pages) {
    const hrefs = htmlHrefs(read(page));
    const startTargets = hrefs
      .filter((href) => /start\.html(?:$|[?#])/.test(href))
      .map((href) => resolveFromPage(page, href));

    assert.ok(startTargets.length > 0, `${page} should link into start.html`);
    assert.deepEqual(
      [...new Set(startTargets)],
      ["start.html"],
      `${page} should resolve quiz CTAs to the root prelanding page`,
    );

    const bypassTargets = hrefs.filter((href) => /(?:research|survey)\.html(?:$|[?#])/.test(href));
    assert.deepEqual(bypassTargets, [], `${page} should not bypass context capture`);
  }
});

test("current research article export exists and retired slugs stay removed", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  for (const slug of currentSlugs) {
    const rel = `landing/research-page/${slug}/index.html`;
    assert.equal(exists(rel), true, `${slug} article should be exported`);
    const html = read(rel);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/);
    assert.match(html, new RegExp(`property="og:url" content="https://[^"]+/research-page/${slug}`));
  }

  for (const slug of retiredSlugs) {
    assert.equal(
      exists(`landing/research-page/${slug}/index.html`),
      false,
      `${slug} should not remain exported`,
    );
  }
});
