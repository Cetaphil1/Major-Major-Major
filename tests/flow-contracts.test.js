const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function scriptOrder(html, scripts) {
  let cursor = -1;
  for (const script of scripts) {
    const index = html.indexOf(script);
    assert.notEqual(index, -1, `${script} should be loaded`);
    assert.ok(index > cursor, `${script} should load after the previous script`);
    cursor = index;
  }
}

test("start page loads globals before Babel modules", () => {
  scriptOrder(read("start.html"), [
    'src="app/user-context.js"',
    'src="app/college-snapshots.js"',
    "react@18.3.1",
    "react-dom@18.3.1",
    "@babel/standalone@7.29.0",
    'src="app/data.jsx"',
    'src="app/screens-context.jsx"',
    'src="app/prelanding.jsx"',
  ]);
});

test("prelanding completion saves context before routing to research", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(prelanding, /UC\.update\(\{\s*preLandingComplete: true,\s*contextConfirmed: true\s*\}\);\s*window\.location\.href = "research\.html";/s);
  assert.match(prelanding, /UC\.update\(\{\s*preLandingComplete: true\s*\}\);\s*window\.location\.href = "research\.html";/s);
  assert.match(prelanding, /Continue to your research/);
});

test("research page personalizes from saved context and offers survey next steps", () => {
  const research = read("research.html");

  assert.match(research, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(research, /uc\.displayName/);
  assert.match(research, /Swarthmore College/);
  assert.match(research, /Political Science/);
  assert.match(research, /DataStatusBadge status="Preview"/);
  assert.match(research, /Showing a demo pairing/);
  assert.equal((research.match(/href="survey\.html"/g) || []).length, 2, "research page should link to the survey at top and bottom");
});

test("survey keeps incomplete visitors in start flow and overlays saved identity", () => {
  const survey = read("survey.html");
  const controller = read("app/fit-app.jsx");

  scriptOrder(survey, [
    'src="app/user-context.js"',
    'src="app/research-data.js"',
    'src="app/data.jsx"',
    'src="app/screens-context.jsx"',
    'src="app/screens-quiz.jsx"',
    'src="app/research.jsx"',
    'src="app/screens-report.jsx"',
    'src="app/fit-app.jsx"',
  ]);

  assert.match(controller, /window\.location\.replace\("start\.html"\)/);
  assert.match(controller, /!uc \|\| !uc\.preLandingComplete/);
  assert.match(controller, /seeded\.displayName = uc\.displayName \|\| ""/);
  assert.match(controller, /seeded\.college = ucCollege\.name/);
  assert.match(controller, /seeded\.major = ucMajor\.name/);
});
