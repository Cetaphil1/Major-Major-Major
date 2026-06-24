const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const LANDING_ROOT = path.join(ROOT, "landing");
const EXPECTED_DESCRIPTION =
  "Compare your major, school environment, workload, motivation, belonging, and career clarity to understand whether your major actually fits.";

const CURRENT_RESEARCH_SLUGS = [
  "reading-belonging-and-career-clarity",
  "school-effect-vs-subject-fit",
];

const RETIRED_RESEARCH_SLUGS = [
  "edukate-professor-receives-national-teaching-excellence-award",
  "edukate-university-celebrates-record-breaking-graduation-ceremony",
];

function htmlFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return htmlFiles(fullPath);
      return entry.isFile() && entry.name === "index.html" ? [fullPath] : [];
    })
    .sort();
}

function readHtml(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([^\s=]+)=["']([^"']*)["']/g)) {
    attributes[match[1].toLowerCase()] = match[2];
  }
  return attributes;
}

function metaContent(html, expectedAttributes) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const matches = Object.entries(expectedAttributes).every(
      ([key, value]) => attributes[key.toLowerCase()] === value,
    );
    if (matches) return attributes.content || null;
  }
  return null;
}

function titleText(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1] : null;
}

function hrefs(html) {
  const values = new Set();
  for (const match of html.matchAll(/href="([^"]+)"/g)) values.add(match[1]);
  for (const match of html.matchAll(/href=\\+"([^"\\]+)\\+"/g)) values.add(match[1]);
  return [...values].sort();
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

test("landing export uses Fit Beyond Interest metadata consistently", () => {
  const files = htmlFiles(LANDING_ROOT);
  assert.ok(files.length > 0, "expected generated landing HTML files");

  for (const filePath of files) {
    const html = readHtml(filePath);

    assert.match(titleText(html), /Fit Beyond Interest/, `${relative(filePath)} title`);
    assert.equal(
      metaContent(html, { name: "description" }),
      EXPECTED_DESCRIPTION,
      `${relative(filePath)} meta description`,
    );
    assert.equal(
      metaContent(html, { property: "og:description" }),
      EXPECTED_DESCRIPTION,
      `${relative(filePath)} OG description`,
    );
    assert.equal(
      metaContent(html, { name: "twitter:description" }),
      EXPECTED_DESCRIPTION,
      `${relative(filePath)} Twitter description`,
    );
    assert.doesNotMatch(html, /edukate/i, `${relative(filePath)} stale Edukate copy`);
  }
});

test("landing export links users into the root start flow", () => {
  const files = htmlFiles(LANDING_ROOT);

  for (const filePath of files) {
    const startLinks = hrefs(readHtml(filePath)).filter((href) => href.endsWith("start.html"));
    assert.ok(startLinks.length > 0, `${relative(filePath)} should expose a quiz entry link`);

    for (const href of startLinks) {
      const resolved = path.resolve(path.dirname(filePath), href);
      assert.equal(
        resolved,
        path.join(ROOT, "start.html"),
        `${relative(filePath)} ${href} should resolve to the shared start flow`,
      );
      assert.ok(fs.existsSync(resolved), `${relative(filePath)} ${href} target exists`);
    }
  }
});

test("research article routes expose current Fit Beyond Interest slugs only", () => {
  const landingIndex = readHtml(path.join(LANDING_ROOT, "index.html"));

  for (const slug of CURRENT_RESEARCH_SLUGS) {
    const articlePath = path.join(LANDING_ROOT, "research-page", slug, "index.html");
    assert.ok(fs.existsSync(articlePath), `${slug} generated page exists`);
    assert.match(
      landingIndex,
      new RegExp(`research-page/${slug}/index\\.html`),
      `landing index links to ${slug}`,
    );

    const articleHtml = readHtml(articlePath);
    assert.match(articleHtml, new RegExp(`/research-page/${slug}`), `${slug} OG URL`);
    assert.match(articleHtml, new RegExp(`&quot;${slug}&quot;`), `${slug} hydration path`);
  }

  for (const slug of RETIRED_RESEARCH_SLUGS) {
    assert.ok(
      !fs.existsSync(path.join(LANDING_ROOT, "research-page", slug)),
      `${slug} retired page directory should not exist`,
    );
    assert.doesNotMatch(landingIndex, new RegExp(slug), `landing index should not link ${slug}`);
  }
});
