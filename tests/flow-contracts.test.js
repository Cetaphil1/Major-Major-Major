const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

function landingHtmlFiles(dir = path.join(root, "landing")) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return landingHtmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function extractHrefs(html) {
  const decoded = decodeHtmlEntities(html);
  const hrefs = [];
  for (const match of decoded.matchAll(/\bhref=["']([^"']+)["']/g)) {
    hrefs.push(match[1]);
  }
  for (const match of decoded.matchAll(/"href"\s*:\s*"([^"]+)"/g)) {
    hrefs.push(match[1]);
  }
  return Array.from(new Set(hrefs));
}

function resolveFromRepoFile(filePath, href) {
  const relFile = path.relative(root, filePath).split(path.sep).join("/");
  const base = new URL(`https://fit.test/${relFile}`);
  return new URL(href, base);
}

test("landing export keeps quiz CTAs pointed at the root start flow", () => {
  const landingFiles = landingHtmlFiles();
  assert.ok(landingFiles.length > 0, "expected generated landing HTML files");

  const startLinks = [];
  const bypassLinks = [];

  for (const file of landingFiles) {
    const html = read(path.relative(root, file));
    assert.match(html, /Fit Beyond Interest/, `${file} should keep the current brand`);
    assert.doesNotMatch(html, /Edukate/i, `${file} should not leak the old university-template brand`);

    for (const href of extractHrefs(html)) {
      const resolved = resolveFromRepoFile(file, href);
      if (href.includes("start.html")) startLinks.push({ file, href, resolved });
      if (/\/?(research|survey)\.html(?:$|[?#])/.test(resolved.pathname)) {
        bypassLinks.push({ file, href, resolved });
      }
    }
  }

  assert.ok(startLinks.length > 0, "expected at least one generated CTA into start.html");
  assert.deepEqual(
    startLinks.map(({ file, href, resolved }) => ({
      file: path.relative(root, file).split(path.sep).join("/"),
      href,
      pathname: resolved.pathname,
    })).filter((link) => link.pathname !== "/start.html"),
    [],
    "generated landing start links must resolve to the root start.html, even from nested pages",
  );
  assert.deepEqual(
    bypassLinks.map(({ file, href, resolved }) => ({
      file: path.relative(root, file).split(path.sep).join("/"),
      href,
      pathname: resolved.pathname,
    })),
    [],
    "landing pages should not bypass the context flow by linking directly to research.html or survey.html",
  );
});

test("landing research slugs use the current Fit Beyond Interest article routes", () => {
  const activeSlugs = [
    "landing/research-page/school-effect-vs-subject-fit/index.html",
    "landing/research-page/reading-belonging-and-career-clarity/index.html",
  ];
  const retiredSlugs = [
    "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html",
    "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html",
  ];

  for (const slug of activeSlugs) {
    assert.ok(fs.existsSync(path.join(root, slug)), `${slug} should exist`);
    assert.match(read(slug), new RegExp(path.basename(path.dirname(slug))), `${slug} should hydrate its slug`);
  }
  for (const slug of retiredSlugs) {
    assert.equal(fs.existsSync(path.join(root, slug)), false, `${slug} should stay retired`);
  }
});

test("start flow saves context completion before moving to research", () => {
  const start = read("start.html");
  const prelanding = read("app/prelanding.jsx");

  assert.match(start, /app\/user-context\.js/, "start.html must load shared context storage");
  assert.ok(
    start.indexOf("app/user-context.js") < start.indexOf("app/prelanding.jsx"),
    "prelanding flow should load after UserContext",
  );

  assert.match(
    prelanding,
    /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\);\s*window\.location\.href\s*=\s*"research\.html"/s,
    "finish should mark context complete and route to research.html",
  );
  assert.match(
    prelanding,
    /UC\.update\(\{\s*preLandingComplete:\s*true\s*\}\);\s*window\.location\.href\s*=\s*"research\.html"/s,
    "skip should still mark prelanding complete before research.html",
  );
});

test("research and survey pages preserve the saved-context journey", () => {
  const index = read("index.html");
  const research = read("research.html");
  const survey = read("survey.html");
  const app = read("app/fit-app.jsx");

  assert.match(index, /window\.UserContext\.load\(\)/, "root app should read UserContext for the prelanding gate");
  assert.match(index, /window\.location\.replace\('start\.html'\)/, "root app should send new visitors through start.html");

  assert.match(research, /const name = \(uc\.displayName \|\| ""\)\.trim\(\)/, "research should personalize from saved name");
  assert.match(research, /<b>\{major\}<\/b> at <b>\{college\}<\/b>/, "research should show saved college and major");
  assert.match(research, /href="start\.html">Change college \/ major<\/a>/, "research should let students edit context");
  assert.match(research, /href="survey\.html"/g, "research should expose survey CTAs after the research step");

  assert.match(survey, /app\/user-context\.js/, "survey should load shared context storage");
  assert.match(app, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/, "survey app should gate missing context");
  assert.match(app, /seeded\.displayName = uc\.displayName \|\| ""/, "survey app should overlay the saved display name");
  assert.match(app, /seeded\.college = ucCollege\.name/, "survey app should overlay the saved college");
  assert.match(app, /seeded\.major = ucMajor\.name/, "survey app should overlay the saved major");
});
