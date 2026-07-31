const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING = path.join(ROOT, "landing");

function htmlFiles(dir = LANDING) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files.sort();
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function hrefs(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1].replace(/&amp;/g, "&"));
}

function resolvedPath(fromFile, href) {
  return new URL(href, `https://fit.test/${rel(fromFile)}`).pathname;
}

test("landing export stays rebranded across generated HTML", () => {
  const files = htmlFiles();
  assert.ok(files.length >= 18, "expected generated landing HTML pages");

  for (const file of files) {
    const html = read(file);
    assert.match(html, /Fit Beyond Interest/, `${rel(file)} should use the current brand`);
    assert.doesNotMatch(html, /Edukate/i, `${rel(file)} should not contain retired Edukate copy`);
  }
});

test("landing quiz entry links resolve to the root start flow", () => {
  const requiredEntryPages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/research-page/index.html",
  ];
  const pagesWithStartLinks = new Set();

  for (const file of htmlFiles()) {
    const startLinks = hrefs(read(file)).filter((href) => /start\.html(?:[?#].*)?$/.test(href));
    if (!startLinks.length) continue;
    pagesWithStartLinks.add(rel(file));

    for (const href of startLinks) {
      assert.equal(
        resolvedPath(file, href),
        "/start.html",
        `${rel(file)} has quiz entry href ${href} resolving away from /start.html`,
      );
    }
  }

  for (const page of requiredEntryPages) {
    assert.ok(pagesWithStartLinks.has(page), `${page} should expose a start.html quiz entry`);
  }
});

test("landing export does not bypass the pre-landing flow", () => {
  for (const file of htmlFiles()) {
    const internalFlowLinks = hrefs(read(file)).filter((href) => /(?:research|survey)\.html(?:[?#].*)?$/.test(href));
    assert.deepEqual(internalFlowLinks, [], `${rel(file)} should not link directly to gated app pages`);
  }
});

test("current research article slugs and canonical URLs are present", () => {
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];
  const retiredSlugs = [
    "college-readiness",
    "faculty-excellence",
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  for (const slug of currentSlugs) {
    const file = path.join(LANDING, "research-page", slug, "index.html");
    assert.ok(fs.existsSync(file), `${slug} article page should exist`);
    const html = read(file);
    assert.match(html, new RegExp(`/research-page/${slug}`), `${slug} should publish its OG URL`);
    assert.match(html, /Fit Beyond Interest/, `${slug} should use the current brand`);
  }

  const allLandingHtml = htmlFiles().map(read).join("\n");
  for (const slug of retiredSlugs) {
    assert.ok(!fs.existsSync(path.join(LANDING, "research-page", slug)), `${slug} directory should be removed`);
    assert.doesNotMatch(allLandingHtml, new RegExp(slug), `${slug} should not remain linked in landing HTML`);
  }
});
