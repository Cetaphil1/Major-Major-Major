const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const landingRoot = path.join(root, "landing");

function walkHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function hrefsFrom(html) {
  return Array.from(html.matchAll(/\bhref=(["'])(.*?)\1/g), (match) => match[2]);
}

function localHrefPath(href) {
  const withoutFragment = href.split("#", 1)[0];
  const withoutQuery = withoutFragment.split("?", 1)[0];
  return withoutQuery.replace(/\/+$/, "");
}

const landingHtmlFiles = walkHtml(landingRoot);

test("generated landing export keeps the Fit Beyond Interest rebrand", () => {
  assert.ok(landingHtmlFiles.length > 0, "expected generated landing HTML files");

  const stalePatterns = [
    /Edukate/i,
    /University Lane/i,
    /Knowledge City/i,
    /edukate-professor-receives-national-teaching-excellence-award/i,
    /edukate-university-celebrates-record-breaking-graduation-ceremony/i,
  ];

  for (const file of landingHtmlFiles) {
    const html = read(file);
    assert.match(html, /Fit Beyond Interest/, `${rel(file)} should carry the current brand`);
    for (const pattern of stalePatterns) {
      assert.doesNotMatch(html, pattern, `${rel(file)} should not contain stale Edukate copy`);
    }
  }
});

test("landing quiz CTAs enter through the root start flow only", () => {
  for (const file of landingHtmlFiles) {
    const html = read(file);
    const hrefs = hrefsFrom(html);
    const startLinks = hrefs.filter((href) => href.includes("start.html"));

    assert.ok(startLinks.length > 0, `${rel(file)} should include a start-flow CTA`);
    for (const href of startLinks) {
      const resolved = path.resolve(path.dirname(file), localHrefPath(href));
      assert.equal(resolved, path.join(root, "start.html"), `${rel(file)} has a start link that should resolve to root start.html`);
    }

    const bypassLinks = hrefs.filter((href) => /(^|\/)(research|survey)\.html(?:[?#]|$)/.test(href));
    assert.deepEqual(bypassLinks, [], `${rel(file)} should not bypass context with direct research/survey links`);
  }
});

test("research landing slugs use current article paths and no retired Edukate paths", () => {
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  const researchIndex = read(path.join(landingRoot, "research-page", "index.html"));
  for (const slug of currentSlugs) {
    const articlePath = path.join(landingRoot, "research-page", slug, "index.html");
    assert.ok(fs.existsSync(articlePath), `expected current research article at ${rel(articlePath)}`);
    assert.match(researchIndex, new RegExp(slug), `research index should reference ${slug}`);
    assert.match(read(articlePath), new RegExp(slug), `${rel(articlePath)} should preserve its canonical slug`);
  }

  const allLandingHtml = landingHtmlFiles.map(read).join("\n");
  for (const slug of retiredSlugs) {
    const retiredPath = path.join(landingRoot, "research-page", slug, "index.html");
    assert.equal(fs.existsSync(retiredPath), false, `retired research article should stay removed: ${rel(retiredPath)}`);
    assert.doesNotMatch(allLandingHtml, new RegExp(slug, "i"), `landing export should not reference retired slug ${slug}`);
  }
});
