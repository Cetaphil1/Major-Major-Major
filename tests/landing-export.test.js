const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING_ROOT = path.join(ROOT, "landing");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function walkHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    return entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function hrefsIn(html) {
  return Array.from(
    html.matchAll(/href=(?:\\"([^\\"]+)\\"|"([^"]+)")/g),
    (match) => match[1] || match[2],
  );
}

test("generated landing pages carry Fit Beyond Interest branding", () => {
  const files = walkHtml(LANDING_ROOT);
  assert.ok(files.length > 0, "expected generated landing html files");

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    const html = fs.readFileSync(file, "utf8");

    assert.match(html, /<title>[^<]*Fit Beyond Interest/i, `${relPath} should have branded title metadata`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest"/, `${relPath} should have branded OG metadata`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest"/, `${relPath} should have branded Twitter metadata`);
    assert.doesNotMatch(html, /Edukate/i, `${relPath} should not expose stale Edukate copy`);
  }
});

test("landing quiz-entry links resolve to the root start flow", () => {
  const files = walkHtml(LANDING_ROOT);
  const expected = path.join(ROOT, "start.html");

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    const startLinks = hrefsIn(fs.readFileSync(file, "utf8")).filter((href) => href.includes("start.html"));

    assert.ok(startLinks.length > 0, `${relPath} should include at least one start.html CTA`);
    for (const href of startLinks) {
      const cleanHref = href.split(/[?#]/, 1)[0];
      assert.equal(
        path.resolve(path.dirname(file), cleanHref),
        expected,
        `${relPath} has a start flow link that does not resolve to root start.html: ${href}`,
      );
    }
  }
});

test("landing research collection uses current Fit Beyond Interest slugs", () => {
  const retiredSlugs = [
    "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html",
    "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html",
  ];
  const currentSlugs = [
    "landing/research-page/school-effect-vs-subject-fit/index.html",
    "landing/research-page/reading-belonging-and-career-clarity/index.html",
  ];

  for (const relPath of retiredSlugs) {
    assert.equal(fs.existsSync(path.join(ROOT, relPath)), false, `${relPath} should stay retired`);
  }
  for (const relPath of currentSlugs) {
    assert.equal(fs.existsSync(path.join(ROOT, relPath)), true, `${relPath} should exist`);
  }

  const researchIndex = read("landing/research-page/index.html");
  assert.match(researchIndex, /school-effect-vs-subject-fit/);
  assert.match(researchIndex, /reading-belonging-and-career-clarity/);
  assert.doesNotMatch(researchIndex, /edukate-professor|record-breaking-graduation/i);
});
