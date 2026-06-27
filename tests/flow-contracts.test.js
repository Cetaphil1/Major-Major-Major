const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("new visitors are gated through the prelanding flow before research", () => {
  const index = read("index.html");

  assert.match(index, /<script src="app\/user-context\.js"><\/script>/, "index should load shared user context before gating");
  assert.match(index, /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/, "index should route incomplete visitors to start.html");
});

test("prelanding completion persists context before routing to research", () => {
  const start = read("start.html");
  const prelanding = read("app/prelanding.jsx");

  assert.match(start, /<script src="app\/user-context\.js"><\/script>[\s\S]*<script src="app\/college-snapshots\.js"><\/script>[\s\S]*<script type="text\/babel" src="app\/prelanding\.jsx"><\/script>/, "start.html should load context and snapshot data before the prelanding app");
  assert.match(prelanding, /UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);[\s\S]*window\.location\.href = "research\.html";/, "confirmed users should be marked complete before research navigation");
  assert.match(prelanding, /UC\.update\(\{ preLandingComplete: true \}\);[\s\S]*window\.location\.href = "research\.html";/, "skipping should still mark the intro complete before research navigation");
});

test("research page keeps the selected context editable and hands off to the survey", () => {
  const research = read("research.html");
  const survey = read("survey.html");

  assert.match(research, /<script src="app\/user-context\.js"><\/script>/, "research should read the shared user context");
  assert.match(research, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| \{\};/, "research should use saved prelanding context when available");
  assert.match(research, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/, "research should explicitly mark missing context as a demo state");
  assert.match(research, /Showing a demo pairing\./, "research should explain the fallback instead of rendering an empty page");
  assert.match(research, /href="start\.html">Change college \/ major<\/a>/, "research should let users edit their saved college or major");
  assert.match(research, /href="survey\.html"[^>]*>Take the survey/, "research should continue into the survey flow");
  assert.match(survey, /<script src="app\/user-context\.js"><\/script>[\s\S]*<script type="text\/babel" src="app\/fit-app\.jsx"><\/script>/, "survey should load the shared context before the quiz app");
});
