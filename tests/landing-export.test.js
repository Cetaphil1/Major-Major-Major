const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function landingHtmlFiles(dir = "landing") {
  const absoluteDir = path.join(repoRoot, dir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...landingHtmlFiles(relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

function hrefs(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

function resolvedPath(fromFile, href) {
  return new URL(href, `https://fit.test/${fromFile}`).pathname;
}

test("generated landing export keeps Fit Beyond Interest branding and removes Edukate copy", () => {
  const landing = read("landing/index.html");

  assert.match(landing, /<title>Fit Beyond Interest[^<]+Does your major actually fit you\?<\/title>/);
  assert.match(landing, /<meta property="og:title" content="Fit Beyond Interest">/);
  assert.match(landing, /<meta name="twitter:title" content="Fit Beyond Interest">/);
  assert.match(landing, /workload, motivation, belonging, and career clarity/);

  for (const file of landingHtmlFiles()) {
    assert.doesNotMatch(read(file), /Edukate/i, `${file} should not contain stale Edukate copy`);
  }
});

test("landing quiz-entry links resolve to the root start flow", () => {
  const landing = read("landing/index.html");
  const startLinks = hrefs(landing).filter((href) => href.includes("start.html"));

  assert.ok(startLinks.length > 0, "expected the generated landing page to link into start.html");
  assert.deepEqual(
    [...new Set(startLinks.map((href) => resolvedPath("landing/index.html", href)))],
    ["/start.html"],
  );
  assert.equal(startLinks.some((href) => /research\.html|survey\.html/.test(href)), false);
});

test("current research article slugs are published and retired Edukate slugs stay removed", () => {
  const researchIndex = read("landing/research-page/index.html");
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony",
  ];

  for (const slug of currentSlugs) {
    const pagePath = `landing/research-page/${slug}/index.html`;
    const article = read(pagePath);

    assert.ok(exists(pagePath), `expected ${pagePath} to exist`);
    assert.match(researchIndex, new RegExp(`${slug}/index\\.html`));
    assert.match(article, new RegExp(`https://incredible-pages-588758\\.framer\\.app/research-page/${slug}`));
    assert.doesNotMatch(article, /Edukate/i);
  }

  for (const slug of retiredSlugs) {
    assert.equal(exists(`landing/research-page/${slug}/index.html`), false);
    assert.doesNotMatch(researchIndex, new RegExp(slug));
  }
});
