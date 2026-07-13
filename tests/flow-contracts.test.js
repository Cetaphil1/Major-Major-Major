const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("start flow completion persists context before routing to research", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{\s*preLandingComplete: true,\s*contextConfirmed: true\s*\}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "finish should mark context complete before sending the student to personalized research"
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*(?:\/\/[^\n]*\s*)?UC\.update\(\{\s*preLandingComplete: true\s*\}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "skip should also mark the gate complete and land on the research page, not the old index route"
  );
});

test("research page is the bridge from saved context into the survey", () => {
  const html = read("research.html");

  assert.match(
    html,
    /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/,
    "research page should read the saved college before falling back to a labeled demo"
  );
  assert.match(
    html,
    /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/,
    "research page should read the saved major before falling back to a labeled demo"
  );
  assert.match(
    html,
    /<DataStatusBadge status="Preview" \/>/,
    "demo fallback should remain visibly labeled as preview data"
  );

  const surveyLinks = [...html.matchAll(/href="survey\.html"/g)];
  assert.equal(surveyLinks.length, 2, "research page should expose both top and end survey CTAs");
});
