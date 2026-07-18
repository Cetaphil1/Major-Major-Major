const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function htmlFilesUnder(relDir) {
  const dir = path.join(root, relDir);
  const out = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        out.push(fullPath);
      }
    }
  }

  walk(dir);
  return out.sort();
}

function extractHrefs(html) {
  const hrefs = [];
  const patterns = [
    /href="([^"]+)"/g,
    /href='([^']+)'/g,
    /href=\\"([^"\\]+)\\"/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      hrefs.push(match[1]);
    }
  }

  return hrefs;
}

test("generated landing pages keep the Fit Beyond Interest rebrand", () => {
  const pages = htmlFilesUnder("landing");
  assert.ok(pages.length >= 18, "expected the checked-in landing export pages");

  for (const file of pages) {
    const rel = path.relative(root, file);
    const html = fs.readFileSync(file, "utf8");

    assert.match(html, /<title>[^<]*Fit Beyond Interest[^<]*<\/title>/, `${rel} title should use current brand`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, `${rel} Open Graph title should use current brand`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${rel} Twitter title should use current brand`);
    assert.doesNotMatch(html, /\bEdukate\b/, `${rel} should not expose retired Edukate branding`);
  }
});

test("landing quiz-entry links resolve to the root start flow", () => {
  const pages = htmlFilesUnder("landing");
  const startLinks = [];

  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    for (const href of extractHrefs(html).filter((value) => value.includes("start.html"))) {
      startLinks.push({ file, href });
    }
  }

  assert.ok(startLinks.length > 0, "expected landing CTAs to link into start.html");

  for (const { file, href } of startLinks) {
    const withoutHashOrQuery = href.split(/[?#]/, 1)[0];
    const resolved = path.resolve(path.dirname(file), withoutHashOrQuery);
    assert.equal(
      resolved,
      path.join(root, "start.html"),
      `${path.relative(root, file)} has a quiz CTA that resolves outside the root start flow: ${href}`,
    );
  }
});

test("landing research collection exposes current articles and drops retired slugs", () => {
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
    const rel = `landing/research-page/${slug}/index.html`;
    assert.ok(fs.existsSync(path.join(root, rel)), `${slug} article page should exist`);
    assert.match(indexHtml, new RegExp(slug), `${slug} should be discoverable from the research index`);

    const articleHtml = read(rel);
    assert.match(
      articleHtml,
      new RegExp(`property="og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}`),
      `${slug} should retain its canonical share URL`,
    );
  }

  for (const slug of retiredSlugs) {
    assert.ok(!fs.existsSync(path.join(root, `landing/research-page/${slug}/index.html`)), `${slug} should stay removed`);
    assert.doesNotMatch(indexHtml, new RegExp(slug), `${slug} should not be linked from the research index`);
  }
});
