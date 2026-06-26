const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

test("prelanding completion sends students to personalized research first", () => {
  const source = read("app/prelanding.jsx");

  assert.match(
    source,
    /const finish = \(\) => \{[\s\S]*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);[\s\S]*window\.location\.href = "research\.html";[\s\S]*\};/,
    "completed context should mark confirmation and route to research.html",
  );
  assert.match(
    source,
    /const skipIntro = \(\) => \{[\s\S]*UC\.update\(\{ preLandingComplete: true \}\);[\s\S]*window\.location\.href = "research\.html";[\s\S]*\};/,
    "skipping intro should still land on research.html, not the generic index page",
  );
  assert.doesNotMatch(
    source,
    /window\.location\.href = "index\.html"/,
    "prelanding should not bypass the research page by routing to index.html",
  );
});

test("research page is the handoff between context and survey", () => {
  const research = read("research.html");
  const surveyHrefs = Array.from(research.matchAll(/href="([^"]*survey\.html)"/g), (m) => m[1]);

  assert.doesNotMatch(
    research,
    /location\.replace\(['"]start\.html['"]\)/,
    "research.html must be reachable after prelanding without the index gate",
  );
  assert.match(research, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(research, /<ResearchCenter college=\{college\} major=\{major\} \/>/);
  assert.ok(surveyHrefs.length >= 2, "research page should expose both top and end-of-page survey CTAs");
  assert.match(research, /Read it over, then take the survey/);
});

test("index remains gated for brand-new visitors", () => {
  const index = read("index.html");

  assert.match(index, /Pre-landing gate: a brand-new visitor goes through start\.html first\./);
  assert.match(
    index,
    /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/,
    "generic index page should send new visitors into the start flow",
  );
});

test("research pages keep external links in new tabs without current-page navigation", () => {
  for (const relPath of ["index.html", "research.html"]) {
    const source = read(relPath);

    assert.match(source, /a\[target="_blank"\]/, `${relPath} should delegate only target=_blank anchors`);
    assert.match(source, /\^https\?:\\\/\\\//, `${relPath} should only intercept http(s) URLs`);
    assert.match(source, /e\.preventDefault\(\);[\s\S]*openExternal\(href\);/, `${relPath} should use the breakout helper`);
    assert.match(source, /window\.open\(url, "_blank", "noopener,noreferrer"\)/, `${relPath} should open external links safely`);
  }
});
