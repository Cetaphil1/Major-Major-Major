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
  return fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) return landingHtmlFiles(relativePath);
      return entry.isFile() && entry.name === "index.html" ? [relativePath] : [];
    })
    .sort();
}

function startHrefFor(pagePath) {
  const fromDir = path.posix.dirname(pagePath);
  return path.posix.relative(fromDir, "start.html") || "start.html";
}

function hrefsFor(html, targetFile) {
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.includes(targetFile));
}

const fitDescription = "Compare your major, school environment, workload, motivation, belonging, and career clarity to understand whether your major actually fits.";

test("generated landing pages keep Fit Beyond Interest metadata and remove old brand copy", () => {
  const files = landingHtmlFiles();

  assert.ok(files.length >= 15, "expected the generated landing export to include nested route pages");

  for (const file of files) {
    const html = read(file);

    assert.match(html, /<title>[^<]*Fit Beyond Interest[^<]*<\/title>/, `${file} should keep the Fit Beyond Interest title`);
    assert.ok(html.includes(`<meta name="description" content="${fitDescription}">`), `${file} should keep the product-specific description`);
    assert.ok(html.includes('<meta property="og:title" content="Fit Beyond Interest">'), `${file} should keep the Open Graph brand`);
    assert.ok(html.includes('<meta name="twitter:title" content="Fit Beyond Interest">'), `${file} should keep the Twitter brand`);
    assert.doesNotMatch(html, /Edukate/i, `${file} should not leak the retired Edukate brand`);
  }
});

test("generated landing pages route quiz CTAs to the root start flow from every depth", () => {
  for (const file of landingHtmlFiles()) {
    const html = read(file);
    const expectedHref = startHrefFor(file);
    const startHrefs = hrefsFor(html, "start.html");

    assert.ok(startHrefs.length > 0, `${file} should expose a start.html CTA`);
    assert.ok(
      startHrefs.some((href) => href === expectedHref),
      `${file} should link to ${expectedHref}; found ${startHrefs.join(", ")}`
    );
    assert.ok(exists(path.posix.normalize(path.posix.join(path.posix.dirname(file), expectedHref))), `${file} CTA should resolve to an existing start.html`);
  }
});

test("current research article routes are exported with their collection identity", () => {
  const researchArticles = {
    "landing/research-page/school-effect-vs-subject-fit/index.html": "school-effect-vs-subject-fit",
    "landing/research-page/reading-belonging-and-career-clarity/index.html": "reading-belonging-and-career-clarity",
  };

  for (const [file, slug] of Object.entries(researchArticles)) {
    const html = read(file);

    assert.ok(html.includes(`&quot;${slug}&quot;`), `${file} should hydrate the ${slug} path variable`);
    assert.match(html, /collectionItemId&quot;:&quot;[^&]+&quot;/, `${file} should keep a Framer collection item id`);
    assert.ok(html.includes(`https://incredible-pages-588758.framer.app/research-page/${slug}`), `${file} should keep its canonical OG URL`);
  }
});

test("retired Edukate research article routes are not shipped", () => {
  const retiredRoutes = [
    "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html",
    "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html",
  ];

  for (const route of retiredRoutes) {
    assert.equal(exists(route), false, `${route} should stay removed`);
  }
});
