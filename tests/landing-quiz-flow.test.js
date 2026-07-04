const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtml(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(fullPath);
    }
  }
  return out;
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function resolveLocalHref(fromFile, href) {
  const withoutHashOrQuery = href.split(/[?#]/, 1)[0];
  return path.resolve(path.dirname(fromFile), withoutHashOrQuery);
}

test("landing export keeps quiz CTAs on the prelanding flow", () => {
  const landingFiles = walkHtml(path.join(root, "landing"));
  assert.ok(landingFiles.length > 0, "expected landing export HTML files");

  for (const filePath of landingFiles) {
    const html = fs.readFileSync(filePath, "utf8");
    const startLinks = [...html.matchAll(/href="([^"]*start\.html(?:[?#][^"]*)?)"/g)].map((m) => m[1]);

    assert.ok(
      startLinks.length > 0,
      `${rel(filePath)} should expose a quiz-entry link to start.html`,
    );

    for (const href of startLinks) {
      assert.equal(
        resolveLocalHref(filePath, href),
        path.join(root, "start.html"),
        `${rel(filePath)} has start.html href ${href} that does not resolve to the root flow`,
      );
    }

    assert.doesNotMatch(
      html,
      /href="[^"]*(?:research|survey)\.html(?:[?#][^"]*)?"/,
      `${rel(filePath)} should not bypass prelanding by linking directly into research or survey`,
    );
  }
});

test("landing rebrand exposes current research articles without stale Edukate paths", () => {
  const landingFiles = walkHtml(path.join(root, "landing"));
  const combined = landingFiles.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");

  assert.match(read("landing/index.html"), /Fit Beyond Interest/);
  assert.doesNotMatch(combined, /edukate/i, "landing export should not contain stale Edukate copy");

  const currentArticles = [
    "landing/research-page/reading-belonging-and-career-clarity/index.html",
    "landing/research-page/school-effect-vs-subject-fit/index.html",
  ];
  for (const article of currentArticles) {
    assert.ok(fs.existsSync(path.join(root, article)), `${article} should exist`);
  }

  const retiredArticles = [
    "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html",
    "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html",
  ];
  for (const article of retiredArticles) {
    assert.equal(fs.existsSync(path.join(root, article)), false, `${article} should stay retired`);
  }
});

test("prelanding finish and skip persist completion before research navigation", () => {
  const source = read("app/prelanding.jsx");
  const finish = source.match(/const finish = \(\) => \{([\s\S]*?)\n    \};/);
  const skipIntro = source.match(/const skipIntro = \(\) => \{([\s\S]*?)\n    \};/);

  assert.ok(finish, "finish handler should be present");
  assert.ok(skipIntro, "skipIntro handler should be present");

  const finishBody = finish[1];
  const skipBody = skipIntro[1];

  assert.match(
    finishBody,
    /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\);/,
    "finish should save both completion and confirmation",
  );
  assert.match(
    skipBody,
    /UC\.update\(\{\s*preLandingComplete:\s*true\s*\}\);/,
    "skip should still mark prelanding complete",
  );

  for (const [name, body] of [["finish", finishBody], ["skipIntro", skipBody]]) {
    const saveIndex = body.indexOf("UC.update");
    const navIndex = body.indexOf('window.location.href = "research.html"');
    assert.ok(navIndex > saveIndex, `${name} should save context before routing to research.html`);
  }
});

test("research page personalizes saved context and keeps a clear survey handoff", () => {
  const html = read("research.html");
  const surveyLinks = [...html.matchAll(/href="survey\.html"/g)];

  assert.match(html, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(html, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(html, /uc\.selectedCollege && uc\.selectedCollege\.name/);
  assert.match(html, /uc\.selectedMajor && uc\.selectedMajor\.name/);
  assert.match(html, /\{name \? <>\{name\}, here<\/> : <>Here<\/>\}'s the research for/);
  assert.ok(surveyLinks.length >= 2, "research should offer both header and end-of-page survey CTAs");
  assert.match(html, /Seen enough\? The survey turns this context into a personalized fit/);
});
