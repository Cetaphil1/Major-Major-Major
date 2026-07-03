const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function listHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtml(rel));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(rel);
  }
  return out.sort();
}

function hrefs(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

function stripQueryAndHash(href) {
  return href.split("#")[0].split("?")[0];
}

test("generated landing pages keep the Fit Beyond Interest rebrand and quiz entry contract", () => {
  const landingPages = listHtml("landing");

  assert.ok(landingPages.length > 10, "expected the generated landing export pages to be present");
  assert.equal(
    fs.existsSync(path.join(ROOT, "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html")),
    false,
    "retired Edukate professor article must not be regenerated",
  );
  assert.equal(
    fs.existsSync(path.join(ROOT, "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html")),
    false,
    "retired Edukate graduation article must not be regenerated",
  );

  const staleBrandPages = [];
  const bypassLinks = [];
  const startLinks = [];

  for (const rel of landingPages) {
    const html = read(rel);
    if (/Edukate/i.test(html)) staleBrandPages.push(rel);
    assert.match(html, /Fit Beyond Interest/, `${rel} should expose the current product name`);

    for (const href of hrefs(html)) {
      const clean = stripQueryAndHash(href);
      if (/(^|\/)(research|survey)\.html$/i.test(clean)) bypassLinks.push(`${rel} -> ${href}`);
      if (/(^|\/)start\.html$/i.test(clean)) {
        const resolved = path.resolve(path.join(ROOT, path.dirname(rel)), clean);
        startLinks.push(`${rel} -> ${href}`);
        assert.equal(
          resolved,
          path.join(ROOT, "start.html"),
          `${rel} start-flow link should resolve to the root app start.html`,
        );
      }
    }
  }

  assert.deepEqual(staleBrandPages, [], "generated landing pages should not contain stale Edukate copy");
  assert.deepEqual(bypassLinks, [], "landing CTAs should not bypass context entry by linking to research.html or survey.html");
  assert.ok(startLinks.length >= landingPages.length, "each generated landing page should keep at least one quiz entry link");
});

test("root research entry gates brand-new visitors back through start.html", () => {
  const html = read("index.html");

  assert.match(html, /<script src="app\/user-context\.js"><\/script>/);
  assert.match(html, /window\.UserContext\.load\(\)/);
  assert.match(html, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/);
  assert.match(html, /href="survey\.html"/, "research page should still offer the survey handoff");
  assert.doesNotMatch(html, /window\.location\.href\s*=\s*['"]research\.html['"]/, "root page should not self-route around the gate");
});

test("prelanding completion persists context before sending the user to personalized research", () => {
  const source = read("app/prelanding.jsx");

  assert.match(source, /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/);
  assert.match(source, /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/);
  assert.match(source, /selectedCollege: college\.trim\(\) \? mapCollege\(college\.trim\(\), collegeMeta\) : null/);
  assert.match(source, /selectedMajor: major\.trim\(\) \? enrichMajor\(major\.trim\(\), majorMeta\) : null/);
});

test("survey flow remains gated and seeded from saved prelanding identity", () => {
  const html = read("survey.html");
  const source = read("app/fit-app.jsx");

  assert.ok(
    html.indexOf('<script src="app/user-context.js"></script>') < html.indexOf('<script type="text/babel" src="app/fit-app.jsx"></script>'),
    "survey must load UserContext before the flow controller",
  );
  assert.match(source, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(source, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(source, /seeded\.college = ucCollege\.name;/);
  assert.match(source, /seeded\.major = ucMajor\.name;/);
});

test("research page labels demo data and leads into the survey from both CTAs", () => {
  const html = read("research.html");

  assert.match(html, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
  assert.match(html, /<DataStatusBadge status="Preview" \/>/);
  assert.match(html, /Showing a demo pairing\./);
  assert.ok((html.match(/href="survey\.html"/g) || []).length >= 2, "research page should keep top and bottom survey CTAs");
});
