const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const landingRoot = path.join(root, "landing");

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out.sort();
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function hrefs(html) {
  return Array.from(html.matchAll(/\bhref=(["'])(.*?)\1/gi), (match) => match[2]);
}

function pageUrl(file) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  return new URL(rel, "https://example.test/");
}

test("generated landing export consistently uses the Fit Beyond Interest brand", () => {
  const pages = walkHtml(landingRoot);

  assert.ok(pages.length > 0, "expected generated landing pages to be present");
  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");

    assert.match(html, /Fit Beyond Interest/, `${file} should use current brand`);
    assert.doesNotMatch(html, /Edukate|Edukate University|edukate-/i, `${file} should not retain Edukate branding`);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, `${file} should expose current OG title`);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${file} should expose current Twitter title`);
  }
});

test("landing research export contains current article slugs and removes retired Edukate articles", () => {
  const landingIndex = read("landing/research-page/index.html");

  assert.ok(fs.existsSync(path.join(root, "landing/research-page/reading-belonging-and-career-clarity/index.html")));
  assert.ok(fs.existsSync(path.join(root, "landing/research-page/school-effect-vs-subject-fit/index.html")));
  assert.match(landingIndex, /reading-belonging-and-career-clarity/);
  assert.match(landingIndex, /school-effect-vs-subject-fit/);

  assert.ok(!fs.existsSync(path.join(root, "landing/research-page/edukate-professor-receives-national-teaching-excellence-award")));
  assert.ok(!fs.existsSync(path.join(root, "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony")));
  assert.doesNotMatch(landingIndex, /edukate-professor|record-breaking-graduation/i);
});

test("landing CTAs enter the root prelanding flow and avoid context-dependent pages", () => {
  const pages = walkHtml(landingRoot);
  let startLinks = 0;

  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    for (const href of hrefs(html)) {
      assert.ok(!href.includes("research.html"), `${file} must not deep-link into research.html`);
      assert.ok(!href.includes("survey.html"), `${file} must not deep-link into survey.html`);

      if (href.includes("start.html")) {
        startLinks += 1;
        const resolved = new URL(href, pageUrl(file));
        assert.equal(resolved.pathname, "/start.html", `${file} should resolve ${href} to the root app start.html`);
      }
    }
  }

  assert.ok(startLinks > 0, "expected generated landing pages to include quiz-entry CTAs");
});
