const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("start page boots the shared context-backed prelanding flow", () => {
  const start = read("start.html");

  assert.match(start, /<title>Fit Beyond Interest/, "start page should stay branded");
  assert.match(start, /<script src="app\/user-context\.js"><\/script>/, "start must load shared context before React screens");
  assert.match(start, /<script src="app\/college-snapshots\.js"><\/script>/, "start should keep college enrichment data available");
  assert.match(start, /<script type="text\/babel" src="app\/prelanding\.jsx"><\/script>/, "start should render the prelanding controller");
});

test("prelanding completion and skip persist context before research", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(
    prelanding,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "finish should mark the context complete before routing to research.html",
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{[\s\S]*?UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "skip should still mark prelanding complete before routing to research.html",
  );
  assert.doesNotMatch(prelanding, /window\.location\.href = "index\.html"/, "prelanding should not route completed context back to the generic index page");
});

test("research page clearly hands students into the survey", () => {
  const research = read("research.html");

  assert.match(research, /window\.UserContext && window\.UserContext\.load\(\)/, "research should personalize from shared context");
  assert.match(research, /DataStatusBadge status="Preview"/, "research should label demo fallback content");
  assert.match(research, /href="start\.html"[^>]*>Change college \/ major<\/a>/, "research should let students revise context");
  assert.match(research, /href="survey\.html"[^>]*>Take the survey/, "research should include the survey CTA");
});

test("survey page keeps the context gate and overlays prelanding identity", () => {
  const survey = read("survey.html");
  const app = read("app/fit-app.jsx");

  assert.match(survey, /<script src="app\/user-context\.js"><\/script>/, "survey must load shared context");
  assert.match(survey, /<script type="text\/babel" src="app\/fit-app\.jsx"><\/script>/, "survey must load the flow controller");
  assert.match(app, /window\.location\.replace\("start\.html"\)/, "survey should gate missing context back to start.html");
  assert.match(app, /seeded\.displayName = uc\.displayName \|\| "";/, "survey should seed display name from prelanding context");
  assert.match(app, /seeded\.college = ucCollege\.name;/, "survey should seed college from prelanding context");
  assert.match(app, /seeded\.major = ucMajor\.name;/, "survey should seed major from prelanding context");
});
