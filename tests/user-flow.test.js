const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

function handlerBody(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\(\\) => \\{([\\s\\S]*?)\\n    \\};`));
  assert.ok(match, `Expected to find ${name} handler`);
  return match[1];
}

test("prelanding completion and skip both land on personalized research", () => {
  const source = readProjectFile("app/prelanding.jsx");
  const finish = handlerBody(source, "finish");
  const skipIntro = handlerBody(source, "skipIntro");

  assert.match(
    finish,
    /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\);/,
    "finishing the context flow must mark the context confirmed"
  );
  assert.match(
    finish,
    /window\.location\.href\s*=\s*"research\.html";/,
    "finishing the context flow must land on the research page"
  );

  assert.match(
    skipIntro,
    /UC\.update\(\{\s*preLandingComplete:\s*true\s*\}\);/,
    "skipping should still mark pre-landing complete"
  );
  assert.doesNotMatch(
    skipIntro,
    /contextConfirmed:\s*true/,
    "skipping should not falsely confirm missing context"
  );
  assert.match(
    skipIntro,
    /window\.location\.href\s*=\s*"research\.html";/,
    "skipping should also land on the research page demo state"
  );
  assert.doesNotMatch(source, /window\.location\.href\s*=\s*"index\.html"/);
});

test("survey controller sends visitors without completed context back to start", () => {
  const source = readProjectFile("app/fit-app.jsx");

  assert.match(
    source,
    /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| null;/,
    "survey flow should read the shared prelanding context"
  );
  assert.match(
    source,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey flow should not bypass context collection"
  );
});

test("research page personalizes saved context and labels demo fallback", () => {
  const source = readProjectFile("research.html");

  assert.match(
    source,
    /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/,
    "research page should read the saved display name"
  );
  assert.match(
    source,
    /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/
  );
  assert.match(
    source,
    /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/
  );
  assert.match(
    source,
    /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/
  );
  assert.match(
    source,
    /\{!isDemo \? \([\s\S]*className="rs-greeting"[\s\S]*\{name \? <>\{name\}, here<\/> : <>Here<\/>\}/,
    "saved context should show a personalized greeting"
  );
  assert.match(
    source,
    /\{isDemo \? \([\s\S]*<DataStatusBadge status="Preview" \/>[\s\S]*Showing a demo pairing/,
    "demo fallback must remain visibly labeled as preview data"
  );
});

test("research page keeps clear survey and context-edit entry points", () => {
  const source = readProjectFile("research.html");

  assert.match(
    source,
    /<a className="rs-chiplink" href="start\.html">Change college \/ major<\/a>/,
    "top navigation should let students edit context"
  );
  assert.match(
    source,
    /<a className="rs-chiplink" href="survey\.html"[\s\S]*>Take the survey/,
    "top navigation should link to the survey"
  );
  assert.match(
    source,
    /<a className="o-btn o-btn--lg" href="survey\.html"[\s\S]*>\s*Take the survey/,
    "end-of-page CTA should link to the survey"
  );
});

test("marketing landing starts with context instead of bypassing the flow", () => {
  const source = readProjectFile("landing/index.html");

  assert.match(source, /<title>Fit Beyond Interest/);
  assert.doesNotMatch(source, /Edukate University/);
  assert.ok(
    (source.match(/href="(?:\.\.\/)*start\.html"/g) || []).length >= 2,
    "primary landing CTAs should send visitors into the context flow"
  );
  assert.doesNotMatch(
    source,
    /href="(?:research|survey)\.html"/,
    "marketing landing should not bypass context by linking directly to research or survey"
  );
});
