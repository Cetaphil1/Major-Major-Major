const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const landingRoot = path.join(repoRoot, "landing");

function listHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function relative(file) {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

function decodeHtmlAttributes(html) {
  return html.replaceAll("&quot;", "\"").replaceAll("&amp;", "&");
}

function extractHrefs(html) {
  const hrefs = [];
  const normalized = decodeHtmlAttributes(html);
  const pattern = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match;
  while ((match = pattern.exec(normalized)) !== null) {
    hrefs.push(match[1] || match[2]);
  }
  return hrefs;
}

function resolveSiteHref(fromFile, href) {
  const clean = href.split("#")[0].split("?")[0];
  if (clean.startsWith("/")) return path.normalize(path.join(repoRoot, clean.slice(1)));
  return path.normalize(path.resolve(path.dirname(fromFile), clean));
}

test("generated landing pages keep the Fit Beyond Interest rebrand", () => {
  const files = listHtmlFiles(landingRoot);
  assert.ok(files.length > 0, "expected landing HTML export files");

  const staleBranding = [];
  for (const file of files) {
    const html = read(file);
    assert.match(
      html,
      /<title>[^<]*Fit Beyond Interest[^<]*<\/title>/,
      `${relative(file)} should retain Fit Beyond Interest in the document title`
    );
    assert.match(
      html,
      /<meta\s+(?:property|name)="(?:og:title|twitter:title)"\s+content="Fit Beyond Interest"/,
      `${relative(file)} should retain Fit Beyond Interest social title metadata`
    );
    if (/\bEdukate\b|edukate-university/i.test(html)) staleBranding.push(relative(file));
  }

  assert.deepEqual(staleBranding, [], "landing export should not resurrect Edukate branding");
});

test("landing quiz entry links resolve to the root start flow only", () => {
  const files = listHtmlFiles(landingRoot);
  const startLinks = [];
  const bypassLinks = [];

  for (const file of files) {
    for (const href of extractHrefs(read(file))) {
      if (/^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("#")) continue;
      if (href.includes("start.html")) startLinks.push({ file, href });
      if (/(^|\/)(research|survey)\.html(?:$|[?#])/i.test(href)) {
        bypassLinks.push(`${relative(file)} -> ${href}`);
      }
    }
  }

  assert.ok(startLinks.length > 0, "expected the landing export to include Take the quiz links");
  for (const { file, href } of startLinks) {
    assert.equal(
      resolveSiteHref(file, href),
      path.join(repoRoot, "start.html"),
      `${relative(file)} has a start.html link that does not resolve to the root start flow: ${href}`
    );
  }
  assert.deepEqual(
    bypassLinks,
    [],
    "landing pages must not deep-link into research.html or survey.html without saved context"
  );
});

test("research article slugs match the Fit Beyond Interest content model", () => {
  const currentSlugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit"
  ];
  const retiredSlugs = [
    "edukate-professor-receives-national-teaching-excellence-award",
    "edukate-university-celebrates-record-breaking-graduation-ceremony"
  ];
  const allLandingHtml = listHtmlFiles(landingRoot)
    .map((file) => read(file))
    .join("\n");

  for (const slug of currentSlugs) {
    const articlePath = path.join(landingRoot, "research-page", slug, "index.html");
    assert.ok(
      fs.existsSync(articlePath),
      `expected current research article slug to exist: ${slug}`
    );
    assert.ok(
      read(articlePath).includes(`https://incredible-pages-588758.framer.app/research-page/${slug}`),
      `article should keep its canonical/open-graph URL for ${slug}`
    );
  }
  for (const slug of retiredSlugs) {
    assert.ok(
      !fs.existsSync(path.join(landingRoot, "research-page", slug, "index.html")),
      `retired Edukate research slug should stay removed: ${slug}`
    );
    assert.ok(!allLandingHtml.includes(slug), `landing export should not reference retired slug ${slug}`);
  }
});
