const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertInOrder(source, snippets, label) {
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet);
    assert.ok(index > cursor, `${label}: expected "${snippet}" after prior dependency`);
    cursor = index;
  }
}

test("start page loads identity and flow dependencies before the prelanding controller", () => {
  const html = read("start.html");

  assertInOrder(
    html,
    [
      'src="app/user-context.js"',
      'src="app/college-snapshots.js"',
      'src="app/data.jsx"',
      'src="app/screens-context.jsx"',
      'src="app/prelanding.jsx"',
    ],
    "start.html script order",
  );
});

test("prelanding completion persists context before routing to research", () => {
  const source = read("app/prelanding.jsx");

  assert.match(source, /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\);/);
  assert.match(source, /UC\.update\(\{\s*preLandingComplete:\s*true\s*\}\);/);
  assert.doesNotMatch(source, /window\.location\.href\s*=\s*"index\.html"/);

  const completeBeforeRoute = source.indexOf("UC.update({ preLandingComplete: true, contextConfirmed: true });");
  const routeToResearch = source.indexOf('window.location.href = "research.html";');
  assert.ok(completeBeforeRoute >= 0, "completion update should exist");
  assert.ok(routeToResearch > completeBeforeRoute, "completion should be saved before navigating");
});

test("research page preserves the required edit and survey handoff links", () => {
  const html = read("research.html");

  assert.match(html, /href="start\.html"/, "students must be able to edit saved context");
  assert.match(html, /href="survey\.html"/, "research page must continue to the survey");
  assert.match(html, /DataStatusBadge status="Preview"/, "demo fallback must stay visibly labeled");
});

test("survey controller guards direct entry without prelanding context", () => {
  const html = read("survey.html");
  const source = read("app/fit-app.jsx");

  assertInOrder(
    html,
    [
      'src="app/user-context.js"',
      'src="app/research-data.js"',
      'src="app/data.jsx"',
      'src="app/primitives.jsx"',
      'src="app/screens-context.jsx"',
      'src="app/screens-quiz.jsx"',
      'src="app/research.jsx"',
      'src="app/screens-report.jsx"',
      'src="app/fit-app.jsx"',
    ],
    "survey.html script order",
  );
  assert.match(source, /if \(!uc \|\| !uc\.preLandingComplete\) \{\s*window\.location\.replace\("start\.html"\);\s*\}/);
});
