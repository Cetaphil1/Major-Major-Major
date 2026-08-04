const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { readRepoFile, repoRoot } = require("./vm-helpers");

function scriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map((match) => match[1]);
}

function hrefs(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/gi)].map((match) => match[1]);
}

function htmlFilesUnder(relativeDir) {
  const root = path.join(repoRoot, relativeDir);
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    const relativePath = path.relative(repoRoot, entryPath);
    if (entry.isDirectory()) files.push(...htmlFilesUnder(relativePath));
    else if (entry.name.endsWith(".html")) files.push(relativePath);
  }
  return files.sort();
}

function resolveFrom(filePath, href) {
  return path.normalize(path.join(path.dirname(path.join(repoRoot, filePath)), href));
}

test("entry pages load shared context and data scripts before page controllers", () => {
  assert.deepEqual(scriptSources(readRepoFile("start.html")).filter((src) => src.startsWith("app/")), [
    "app/user-context.js",
    "app/college-snapshots.js",
    "app/data.jsx",
    "app/screens-context.jsx",
    "app/prelanding.jsx",
  ]);

  assert.deepEqual(scriptSources(readRepoFile("survey.html")).filter((src) => src.startsWith("app/")), [
    "app/user-context.js",
    "app/research-data.js",
    "app/data.jsx",
    "app/primitives.jsx",
    "app/screens-context.jsx",
    "app/screens-quiz.jsx",
    "app/research.jsx",
    "app/screens-report.jsx",
    "app/fit-app.jsx",
  ]);

  assert.deepEqual(scriptSources(readRepoFile("research.html")).filter((src) => src.startsWith("app/")), [
    "app/user-context.js",
    "app/research-data.js",
    "app/research.jsx",
  ]);
});

test("prelanding completion and skip both persist completion before routing to research", () => {
  const source = readRepoFile("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip:[\s\S]*?UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/
  );
});

test("research and survey keep visitors on the context-first path", () => {
  const research = readRepoFile("research.html");
  const survey = readRepoFile("app/fit-app.jsx");

  assert.match(research, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| \{\};/);
  assert.match(research, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
  assert.match(research, /href="start\.html">Change college \/ major/);
  assert.match(research, /href="survey\.html"/);

  assert.match(survey, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(survey, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(survey, /seeded\.college = ucCollege\.name;/);
  assert.match(survey, /seeded\.major = ucMajor\.name;/);
});

test("generated landing pages enter the quiz through start.html without bypassing context", () => {
  for (const file of ["landing/index.html", "landing/programs/index.html", "landing/research-page/index.html"]) {
    const pageHrefs = hrefs(readRepoFile(file));
    const startLinks = pageHrefs.filter((href) => href.includes("start.html"));

    assert.ok(startLinks.length > 0, `${file} should include a start.html entry point`);
    assert.ok(
      startLinks.every((href) => resolveFrom(file, href) === path.join(repoRoot, "start.html")),
      `${file} start links should resolve to the root start.html`
    );
    assert.equal(
      pageHrefs.some((href) => /(^|\/)(survey|research)\.html(?:[#?]|$)/.test(href)),
      false,
      `${file} should not link directly into survey.html or research.html`
    );
  }
});

test("generated landing export consistently uses the Fit Beyond Interest rebrand", () => {
  for (const file of htmlFilesUnder("landing")) {
    const html = readRepoFile(file);

    assert.match(html, /Fit Beyond Interest/, `${file} should include the current brand`);
    assert.doesNotMatch(html, /Edukate/i, `${file} should not include retired Edukate copy`);
  }
});

test("generated research article inventory uses the current article slugs", () => {
  const current = [
    "landing/research-page/school-effect-vs-subject-fit/index.html",
    "landing/research-page/reading-belonging-and-career-clarity/index.html",
  ];
  const retired = [
    "landing/research-page/college-readiness/index.html",
    "landing/research-page/faculty-excellence/index.html",
  ];

  for (const file of current) {
    assert.match(readRepoFile(file), /Fit Beyond Interest|School Effect|Reading, Belonging/i);
  }
  for (const file of retired) {
    assert.throws(() => readRepoFile(file), /ENOENT/);
  }
});
