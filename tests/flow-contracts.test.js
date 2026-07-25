const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test("start page loads shared context before the prelanding app", () => {
  const html = read("start.html");
  const userContext = html.indexOf('src="app/user-context.js"');
  const snapshots = html.indexOf('src="app/college-snapshots.js"');
  const data = html.indexOf('src="app/data.jsx"');
  const fields = html.indexOf('src="app/screens-context.jsx"');
  const prelanding = html.indexOf('src="app/prelanding.jsx"');

  assert.ok(userContext > -1, "start.html must load UserContext");
  assert.ok(snapshots > userContext, "college snapshots load after UserContext");
  assert.ok(data > snapshots, "quiz/major data loads after plain JS dependencies");
  assert.ok(fields > data, "context fields load before the prelanding controller");
  assert.ok(prelanding > fields, "prelanding controller loads last");
});

test("prelanding completion persists state and routes to personalized research", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "confirmed completion must save both flags and continue to research.html"
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip:[^\n]*\n\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "skip must mark the intro complete and still land on research.html"
  );
  assert.ok(!source.includes('window.location.href = "index.html";'), "prelanding should not return users to the gated research alias");
});

test("research pages expose the intended survey and edit-context exits", () => {
  const canonical = read("research.html");
  const gatedAlias = read("index.html");

  assert.match(gatedAlias, /window\.location\.replace\('start\.html'\)/, "the root research alias keeps a prelanding gate");
  assert.match(canonical, /href="start\.html">Change college \/ major<\/a>/, "research page lets users edit context");
  assert.match(canonical, /href="survey\.html"[^>]*>Take the survey/, "research page has a top survey CTA");
  assert.match(canonical, /<DataStatusBadge status="Preview" \/>/, "demo fallback must be visibly labeled Preview");
  assert.match(canonical, /Showing a demo pairing/, "demo fallback copy must be explicit");
});

test("survey page loads scoring after context dependencies and guards direct entry", () => {
  const html = read("survey.html");
  const fitApp = read("app/fit-app.jsx");

  const userContext = html.indexOf('src="app/user-context.js"');
  const data = html.indexOf('src="app/data.jsx"');
  const research = html.indexOf('src="app/research.jsx"');
  const report = html.indexOf('src="app/screens-report.jsx"');
  const controller = html.indexOf('src="app/fit-app.jsx"');

  assert.ok(userContext > -1, "survey.html must load UserContext before React code");
  assert.ok(data > userContext, "survey data loads after UserContext");
  assert.ok(research > data, "research components load before report screens");
  assert.ok(report > research, "report screens load before the controller");
  assert.ok(controller > report, "fit-app controller loads last");
  assert.match(fitApp, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
});

test("generated landing export keeps the Fit Beyond Interest quiz entry contract", () => {
  const landingIndex = read("landing/index.html");
  const landingFiles = walk(path.join(root, "landing")).filter((file) => file.endsWith(".html"));
  const staleMatches = landingFiles.filter((file) => /Edukate/i.test(fs.readFileSync(file, "utf8")));

  assert.match(landingIndex, /<title>Fit Beyond Interest --? Does your major actually fit you\?<\/title>|<title>Fit Beyond Interest .* Does your major actually fit you\?<\/title>/);
  assert.match(landingIndex, /<meta property="og:title" content="Fit Beyond Interest">/);
  assert.match(landingIndex, /<meta name="twitter:title" content="Fit Beyond Interest">/);
  assert.match(landingIndex, /start\.html/, "public landing CTAs must enter the start flow");
  assert.doesNotMatch(landingIndex, /href="[^"]*(research|survey)\.html/, "landing CTAs should not bypass context entry");
  assert.deepEqual(staleMatches.map((file) => path.relative(root, file)), [], "generated landing pages should not expose stale Edukate copy");
});

test("generated research article slug inventory matches the current rebrand", () => {
  const current = [
    "landing/research-page/reading-belonging-and-career-clarity/index.html",
    "landing/research-page/school-effect-vs-subject-fit/index.html",
  ];
  const retired = [
    "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html",
    "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html",
  ];

  for (const rel of current) {
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} should exist`);
    assert.match(read(rel), /<meta property="og:title" content="Fit Beyond Interest">/);
  }
  for (const rel of retired) {
    assert.equal(fs.existsSync(path.join(root, rel)), false, `${rel} should remain retired`);
  }
});
