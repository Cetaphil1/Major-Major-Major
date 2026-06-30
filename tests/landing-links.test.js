const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING_DIR = path.join(ROOT, "landing");

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function hrefsFrom(html) {
  return Array.from(html.matchAll(/\bhref=(["'])(.*?)\1/g), (match) =>
    match[2].replace(/&amp;/g, "&")
  );
}

function withoutQueryOrHash(href) {
  return href.split("#")[0].split("?")[0];
}

test("all generated landing pages link quiz entry to root start.html", () => {
  const files = htmlFiles(LANDING_DIR);
  assert.ok(files.length > 0, "expected generated landing HTML pages");

  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const startLinks = hrefsFrom(html).filter((href) =>
      withoutQueryOrHash(href).endsWith("start.html")
    );

    assert.ok(startLinks.length > 0, `${path.relative(ROOT, file)} should link to start.html`);

    for (const href of startLinks) {
      const resolved = path.resolve(path.dirname(file), withoutQueryOrHash(href));
      assert.equal(
        resolved,
        path.join(ROOT, "start.html"),
        `${path.relative(ROOT, file)} has a quiz link that does not resolve to root start.html: ${href}`
      );
      assert.ok(fs.existsSync(resolved), `quiz entry target should exist for ${href}`);
    }
  }
});

test("landing export does not bypass the context flow", () => {
  for (const file of htmlFiles(LANDING_DIR)) {
    const html = fs.readFileSync(file, "utf8");
    const localHrefs = hrefsFrom(html).filter((href) => !/^[a-z][a-z0-9+.-]*:/i.test(href));

    assert.equal(
      localHrefs.some((href) => /(?:^|\/)(?:research|survey)\.html(?:[?#]|$)/.test(href)),
      false,
      `${path.relative(ROOT, file)} should not deep-link directly to research.html or survey.html`
    );
  }
});

test("rebranded research article slugs are present and old brand copy stays retired", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const indexHtml = fs.readFileSync(path.join(LANDING_DIR, "research-page", "index.html"), "utf8");

  for (const slug of currentSlugs) {
    assert.ok(
      fs.existsSync(path.join(LANDING_DIR, "research-page", slug, "index.html")),
      `expected current research article route for ${slug}`
    );
    assert.match(indexHtml, new RegExp(slug), `research index should expose ${slug}`);
  }

  for (const file of htmlFiles(LANDING_DIR)) {
    const html = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(html, /Edukate/i, `${path.relative(ROOT, file)} should not contain retired Edukate copy`);
  }
});
