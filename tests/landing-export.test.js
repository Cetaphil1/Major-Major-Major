const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const landingRoot = path.join(root, "landing");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function hrefs(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/gi)].map((match) => match[1]);
}

function resolvedInternalTargets(relPath) {
  const html = read(relPath);
  const pageDir = path.dirname(path.join(root, relPath));

  return hrefs(html)
    .filter((href) => !/^(?:https?:|mailto:|tel:|#)/i.test(href))
    .map((href) => path.relative(root, path.resolve(pageDir, href)).replaceAll(path.sep, "/"));
}

test("generated landing pages keep Fit Beyond Interest metadata", () => {
  for (const file of htmlFiles(landingRoot)) {
    const relPath = path.relative(root, file);
    const html = fs.readFileSync(file, "utf8");

    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/, relPath);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/, relPath);
  }
});

test("primary landing entry points start at the context flow, not research or survey", () => {
  const entryPages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/research-page/index.html",
  ];

  for (const relPath of entryPages) {
    const targets = resolvedInternalTargets(relPath);
    const startTargets = targets.filter((target) => target === "start.html");

    assert.ok(startTargets.length > 0, `${relPath} should link into start.html`);
    assert.deepEqual(
      targets.filter((target) => ["research.html", "survey.html"].includes(target)),
      [],
      `${relPath} should not bypass the context flow`,
    );
  }
});

test("current research landing slugs are published with canonical Open Graph URLs", () => {
  const slugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];

  for (const slug of slugs) {
    const relPath = `landing/research-page/${slug}/index.html`;
    const html = read(relPath);

    assert.match(
      html,
      new RegExp(`<meta property="og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}">`),
      `${relPath} should advertise its canonical research URL`,
    );
  }
});

test("retired placeholder research slugs remain removed from the export", () => {
  const retired = [
    "landing/research-page/college-readiness/index.html",
    "landing/research-page/faculty-excellence/index.html",
  ];

  for (const relPath of retired) {
    assert.equal(fs.existsSync(path.join(root, relPath)), false, `${relPath} should stay absent`);
  }
});
