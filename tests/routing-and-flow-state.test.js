const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const FlowState = require(path.join(root, "app", "flow-state.js"));

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /app\/fit-app\.jsx/);
});

test("start-flow skip returns to landing without completing identity", () => {
  const source = read("app/prelanding.jsx");
  const skipIntro = source.match(/const skipIntro = \(\) => \{[\s\S]*?\n    \};/);

  assert.ok(skipIntro, "skipIntro handler should exist");
  assert.match(skipIntro[0], /window\.location\.href = "landing\/index\.html"/);
  assert.doesNotMatch(skipIntro[0], /preLandingComplete:\s*true/);
  assert.doesNotMatch(skipIntro[0], /research\.html/);
});

test("research and survey pages require a complete identity", () => {
  const research = read("research.html");
  const survey = read("app/fit-app.jsx");

  assert.match(research, /ctx\.preLandingComplete/);
  assert.match(research, /UserContext\.hasIdentity\(\)/);
  assert.match(research, /window\.location\.replace\("start\.html"\)/);
  assert.match(survey, /identityKeyFromUserContext\(uc\)/);
  assert.match(survey, /hasConfirmedIdentity/);
  assert.match(survey, /if \(!hasConfirmedIdentity\) \{ window\.location\.replace\("start\.html"\); \}/);
});

test("flow state is restored only for the active identity", () => {
  const storage = new MemoryStorage();
  const firstIdentity = FlowState.identityKeyFromUserContext({
    displayName: "Ari",
    selectedCollege: { id: "purdue", name: "Purdue University" },
    selectedMajor: { cipCode: "11.0701", name: "Computer Science" },
  });
  const secondIdentity = FlowState.identityKeyFromUserContext({
    displayName: "Ari",
    selectedCollege: { id: "purdue", name: "Purdue University" },
    selectedMajor: { cipCode: "45.1001", name: "Political Science" },
  });

  FlowState.saveForIdentity(firstIdentity, {
    phase: "report",
    ctx: { college: "Purdue University", major: "Computer Science" },
    sectionIdx: 7,
    answers: { q1: 5 },
  }, storage);

  assert.equal(FlowState.loadForIdentity(firstIdentity, storage).phase, "report");
  assert.equal(FlowState.loadForIdentity(secondIdentity, storage), null);
});

test("survey entry loads flow-state before the JSX controller", () => {
  const html = read("survey.html");
  const flowStateIdx = html.indexOf('src="app/flow-state.js"');
  const fitAppIdx = html.indexOf('src="app/fit-app.jsx"');

  assert.ok(flowStateIdx > -1, "survey.html should load flow-state.js");
  assert.ok(fitAppIdx > -1, "survey.html should load fit-app.jsx");
  assert.ok(flowStateIdx < fitAppIdx, "flow-state.js must load before fit-app.jsx");
});
