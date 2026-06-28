const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const landingRoot = path.join(root, "landing");
const appStartPath = path.join(root, "start.html");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function landingHtmlFiles(dir = landingRoot) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return landingHtmlFiles(fullPath);
    return entry.isFile() && entry.name === "index.html" ? [fullPath] : [];
  }).sort();
}

test("landing export keeps the Fit Beyond Interest rebrand and removes stale Edukate copy", () => {
  const files = landingHtmlFiles();
  assert.ok(files.length > 0, "expected generated landing HTML files");

  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);

    assert.match(html, /Fit Beyond Interest/, `${rel} should use the current brand`);
    assert.doesNotMatch(html, /\bEdukate\b/i, `${rel} should not retain old Edukate branding`);
  }

  assert.match(
    read("landing/index.html"),
    /Does your major actually fit you\?/,
    "landing homepage should keep the current major-fit positioning"
  );
});

test("landing start-flow links resolve to the root app start page from every nested page", () => {
  for (const file of landingHtmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    const links = html.match(/(?:\.\.\/)+start\.html/g) || [];

    assert.ok(links.length > 0, `${rel} should link to the start flow`);
    for (const link of links) {
      assert.equal(
        path.resolve(path.dirname(file), link),
        appStartPath,
        `${rel} has a start-flow link with the wrong relative depth: ${link}`
      );
    }
  }
});

test("research landing export uses current article slugs and drops retired Edukate articles", () => {
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
    const articlePath = path.join(landingRoot, "research-page", slug, "index.html");
    assert.ok(fs.existsSync(articlePath), `expected current research article at ${slug}`);

    const articleHtml = fs.readFileSync(articlePath, "utf8");
    assert.match(researchIndex, new RegExp(`research-page/${slug}`), `research index should link ${slug}`);
    assert.match(articleHtml, new RegExp(`research-page/${slug}`), `${slug} should expose its canonical Open Graph URL`);
    assert.match(articleHtml, new RegExp(`&quot;${slug}&quot;`), `${slug} should hydrate with its own path variable`);
  }

  for (const slug of retiredSlugs) {
    assert.ok(
      !fs.existsSync(path.join(landingRoot, "research-page", slug)),
      `retired research article should not be exported: ${slug}`
    );
    assert.doesNotMatch(researchIndex, new RegExp(slug), `research index should not link retired article ${slug}`);
  }
});
