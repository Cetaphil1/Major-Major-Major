const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

test("start flow loads shared context before prelanding UI", () => {
  const html = read("start.html");

  const userContext = html.indexOf('src="app/user-context.js"');
  const snapshots = html.indexOf('src="app/college-snapshots.js"');
  const data = html.indexOf('src="app/data.jsx"');
  const contextScreen = html.indexOf('src="app/screens-context.jsx"');
  const prelanding = html.indexOf('src="app/prelanding.jsx"');

  assert.ok(userContext > -1, "start flow should load the shared user context store");
  assert.ok(snapshots > userContext, "college snapshots should load after the shared context store");
  assert.ok(data > snapshots, "quiz data should load after plain shared scripts");
  assert.ok(contextScreen > data, "context field components should load before prelanding");
  assert.ok(prelanding > contextScreen, "prelanding controller should load after its dependencies");
});

test("prelanding completion persists the gate before sending visitors to research", () => {
  const script = read("app/prelanding.jsx");

  assert.match(
    script,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/m,
    "finish should mark the context confirmed before opening research",
  );
  assert.match(
    script,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/m,
    "skip should still mark prelanding complete before opening research",
  );
});

test("research page uses saved identity and offers only edit-or-survey next steps", () => {
  const html = read("research.html");

  assert.ok(
    html.indexOf('src="app/user-context.js"') < html.indexOf('src="app/research-data.js"'),
    "research data should load after shared context",
  );
  assert.match(html, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(html, /uc\.selectedCollege && uc\.selectedCollege\.name/);
  assert.match(html, /uc\.selectedMajor && uc\.selectedMajor\.name/);
  assert.match(html, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
  assert.match(html, /href="start\.html">Change college \/ major<\/a>/);
  assert.match(html, /href="survey\.html"[^>]*>Take the survey/);
  assert.match(html, /href="start\.html">Enter your own college &amp; major<\/a>/);
});

test("survey guards direct entry and overlays prelanding identity", () => {
  const html = read("survey.html");
  const app = read("app/fit-app.jsx");

  assert.ok(
    html.indexOf('src="app/user-context.js"') < html.indexOf('src="app/research-data.js"'),
    "survey should load shared context before research helpers",
  );
  assert.ok(
    html.indexOf('src="app/research-data.js"') < html.indexOf('src="app/fit-app.jsx"'),
    "survey controller should load after its plain shared scripts",
  );
  assert.match(
    app,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey should redirect visitors who have not completed prelanding",
  );
  assert.match(app, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(app, /seeded\.college = ucCollege\.name;/);
  assert.match(app, /seeded\.major = ucMajor\.name;/);
});
