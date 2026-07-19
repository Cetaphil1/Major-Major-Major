const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.match(html, /window\.location\.replace\(target\)/);
  assert.match(html, /"landing\/index\.html" \+ window\.location\.search \+ window\.location\.hash/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /app\/user-context\.js/);
  assert.doesNotMatch(html, /Swarthmore College|Political Science/);
});

test("landing page quiz CTAs enter the start flow only", () => {
  const html = read("landing/index.html");

  assert.match(html, /href="\.\.\/start\.html"/);
  assert.doesNotMatch(html, /href="(?:\.\.\/)?research\.html"/);
  assert.doesNotMatch(html, /href="(?:\.\.\/)?survey\.html"/);
});

test("research page requires completed identity before rendering", () => {
  const html = read("research.html");
  const guardIndex = html.indexOf("window.UserContext.hasIdentity()");
  const renderIndex = html.indexOf('src="app/research.jsx"');

  assert.ok(guardIndex > -1, "missing identity guard");
  assert.ok(renderIndex > -1, "missing research renderer");
  assert.ok(guardIndex < renderIndex, "guard must run before research renderer loads");
  assert.match(html, /!c \|\| !c\.preLandingComplete \|\| !window\.UserContext\.hasIdentity\(\)/);
  assert.match(html, /window\.location\.replace\("start\.html"\)/);
});

test("start flow completion goes to research, while skip returns to landing without completing identity", () => {
  const source = read("app/prelanding.jsx");
  const skipBlock = source.match(/const skipIntro = \(\) => \{([\s\S]*?)\n    \};/);

  assert.match(source, /UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";/);
  assert.ok(skipBlock, "missing skipIntro function");
  assert.match(skipBlock[1], /window\.location\.href = "landing\/index\.html";/);
  assert.doesNotMatch(skipBlock[1], /preLandingComplete: true/);
});

test("survey gate and restart keep identity state consistent", () => {
  const source = read("app/fit-app.jsx");
  const startOverBlock = source.match(/const startOver = \(\) => \{([\s\S]*?)\n    \};/);

  assert.match(source, /!uc \|\| !uc\.preLandingComplete \|\| !window\.UserContext\.hasIdentity\(\)/);
  assert.ok(startOverBlock, "missing startOver function");
  assert.match(startOverBlock[1], /wipe\(\);/);
  assert.match(startOverBlock[1], /window\.UserContext\.clear\(\);/);
  assert.match(startOverBlock[1], /window\.location\.href = "start\.html";/);
  assert.match(source, /onRestart=\{startOver\}/);
});
