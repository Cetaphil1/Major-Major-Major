const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function assertOrdered(source, labels) {
  let previous = -1;
  for (const label of labels) {
    const next = source.indexOf(label);
    assert.notEqual(next, -1, `${label} should be present`);
    assert.ok(next > previous, `${label} should come after previous dependency`);
    previous = next;
  }
}

test("start flow loads shared context before the pre-landing controller", () => {
  const start = read("start.html");

  assertOrdered(start, [
    'src="app/user-context.js"',
    'src="app/college-snapshots.js"',
    'src="app/data.jsx"',
    'src="app/screens-context.jsx"',
    'src="app/prelanding.jsx"',
  ]);
});

test("pre-landing finish and skip persist completion before routing to research", () => {
  const source = read("app/prelanding.jsx");

  const finish = source.match(/const finish = \(\) => \{[\s\S]*?\n    \};/);
  assert.ok(finish, "finish handler should be present");
  assert.match(finish[0], /UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);/);
  assert.match(finish[0], /window\.location\.href = "research\.html";/);
  assert.ok(
    finish[0].indexOf("UC.update") < finish[0].indexOf("window.location.href"),
    "finish should save completion before navigating",
  );

  const skip = source.match(/const skipIntro = \(\) => \{[\s\S]*?\n    \};/);
  assert.ok(skip, "skip handler should be present");
  assert.match(skip[0], /UC\.update\(\{ preLandingComplete: true \}\);/);
  assert.match(skip[0], /window\.location\.href = "research\.html";/);
  assert.ok(
    skip[0].indexOf("UC.update") < skip[0].indexOf("window.location.href"),
    "skip should save completion before navigating",
  );
});

test("root research page gates new visitors through start.html", () => {
  const root = read("index.html");

  assertOrdered(root, [
    'src="app/user-context.js"',
    "window.UserContext.load()",
    "window.location.replace('start.html')",
    'src="app/research-data.js"',
  ]);
  assert.match(root, /if \(!c\.preLandingComplete\)/);
});

test("research page uses saved identity with demo fallback and survey CTAs", () => {
  const research = read("research.html");

  assertOrdered(research, [
    'src="app/user-context.js"',
    'src="app/research-data.js"',
    'src="app/research.jsx"',
    "window.UserContext && window.UserContext.load()",
  ]);

  assert.match(research, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(research, /Swarthmore College/);
  assert.match(research, /Political Science/);
  assert.match(research, /DataStatusBadge status="Preview"/);
  assert.match(research, /Showing a demo pairing/);
  assert.ok((research.match(/href="survey\.html"/g) || []).length >= 2, "top and bottom survey CTAs should exist");
  assert.ok((research.match(/href="start\.html"/g) || []).length >= 2, "context edit links should return to start");
});

test("survey loads scoring dependencies and enforces pre-landing completion", () => {
  const survey = read("survey.html");
  const app = read("app/fit-app.jsx");

  assertOrdered(survey, [
    'src="app/user-context.js"',
    'src="app/research-data.js"',
    'src="app/data.jsx"',
    'src="app/primitives.jsx"',
    'src="app/screens-context.jsx"',
    'src="app/screens-quiz.jsx"',
    'src="app/research.jsx"',
    'src="app/screens-report.jsx"',
    'src="app/fit-app.jsx"',
  ]);

  assert.match(app, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(app, /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(app, /seeded\.college = ucCollege\.name;/);
  assert.match(app, /seeded\.major = ucMajor\.name;/);
});
