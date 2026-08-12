const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function scriptSources(html) {
  return [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map((match) => {
      const src = match[1].match(/\bsrc="([^"]+)"/i);
      return src && src[1];
    })
    .filter(Boolean);
}

function assertBefore(list, earlier, later) {
  const earlierIndex = list.indexOf(earlier);
  const laterIndex = list.indexOf(later);

  assert.notEqual(earlierIndex, -1, `${earlier} should be loaded`);
  assert.notEqual(laterIndex, -1, `${later} should be loaded`);
  assert.ok(earlierIndex < laterIndex, `${earlier} should load before ${later}`);
}

test("start flow loads identity helpers before the prelanding controller", () => {
  const sources = scriptSources(read("start.html"));

  assertBefore(sources, "app/user-context.js", "app/prelanding.jsx");
  assertBefore(sources, "app/college-snapshots.js", "app/prelanding.jsx");
  assertBefore(sources, "app/data.jsx", "app/prelanding.jsx");
  assertBefore(sources, "app/screens-context.jsx", "app/prelanding.jsx");
});

test("prelanding completion persists context before routing to personalized research", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finishing the intro should confirm context and route to research.html",
  );

  assert.match(
    source,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skipping the intro should still mark the gate complete and route to research.html",
  );
});

test("research page preserves honest demo fallback and leads into the survey", () => {
  const html = read("research.html");

  assert.match(html, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
  assert.match(html, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
  assert.match(html, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
  assert.match(html, /<DataStatusBadge status="Preview" \/>/);
  assert.match(html, /href="start\.html">Change college \/ major/);
  assert.equal((html.match(/href="survey\.html"/g) || []).length, 2);
});

test("survey cannot be entered before the prelanding gate completes", () => {
  const surveySources = scriptSources(read("survey.html"));
  const controller = read("app/fit-app.jsx");

  assertBefore(surveySources, "app/user-context.js", "app/fit-app.jsx");
  assertBefore(surveySources, "app/research-data.js", "app/fit-app.jsx");
  assert.match(
    controller,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "fit-app should send direct survey visitors back through the context flow",
  );
});
