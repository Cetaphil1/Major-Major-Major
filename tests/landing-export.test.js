const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const GENERATED_PAGES = [
  "landing/index.html",
  "landing/programs/index.html",
  "landing/research-page/index.html",
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function hrefsFor(file) {
  const html = read(file);
  return Array.from(html.matchAll(/\bhref="([^"]+)"/g), (match) => decodeHtml(match[1]));
}

function resolvedPath(fromFile, href) {
  const url = new URL(href, `https://example.test/${fromFile}`);
  return url.pathname.replace(/^\//, "");
}

test("generated landing pages keep the Fit Beyond Interest brand contract", () => {
  for (const page of GENERATED_PAGES) {
    const html = read(page);
    assert.match(html, /Fit Beyond Interest/, `${page} should use the current brand`);
    assert.doesNotMatch(html, /Edukate University|Edukate professor|record-breaking graduation/i, `${page} should not surface retired Edukate copy`);
  }
});

test("marketing quiz entry links resolve to the pre-landing flow, not research or survey", () => {
  for (const page of GENERATED_PAGES) {
    const resolved = hrefsFor(page)
      .filter((href) => !/^(?:https?:|mailto:|tel:|#)/i.test(href))
      .map((href) => resolvedPath(page, href));

    assert.ok(
      resolved.includes("start.html"),
      `${page} should include a link into the pre-landing start flow`
    );
    assert.ok(
      !resolved.includes("research.html"),
      `${page} should not bypass context collection by linking directly to research`
    );
    assert.ok(
      !resolved.includes("survey.html"),
      `${page} should not bypass research context by linking directly to survey`
    );
  }
});

test("generated research articles expose current slugs and retired Edukate articles stay removed", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  for (const slug of currentSlugs) {
    const file = `landing/research-page/${slug}/index.html`;
    const html = read(file);
    assert.match(html, new RegExp(`/research-page/${slug}`), `${file} should advertise its canonical route`);
    assert.match(html, /Fit Beyond Interest/, `${file} should carry the current brand`);
  }

  for (const slug of retiredSlugs) {
    assert.equal(
      fs.existsSync(path.join(ROOT, "landing/research-page", slug, "index.html")),
      false,
      `${slug} should remain deleted`
    );
  }
});
