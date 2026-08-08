const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function createLocalStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function loadFlowState() {
  const localStorage = createLocalStorage();
  const context = {
    window: {},
    localStorage,
  };
  context.window.localStorage = localStorage;
  vm.createContext(context);
  vm.runInContext(read("app/flow-state.js"), context);
  return { FlowState: context.window.FlowState, localStorage };
}

function userContext(displayName, collegeName, collegeId, majorName, cipCode) {
  return {
    displayName,
    selectedCollege: { name: collegeName, id: collegeId },
    selectedMajor: { name: majorName, cipCode },
    preLandingComplete: true,
    contextConfirmed: true,
  };
}

test("survey state is scoped to the saved name, college, and major", () => {
  const { FlowState } = loadFlowState();
  const firstIdentity = userContext("Sam", "Swarthmore College", "swarthmore", "Political Science", "45.1001");
  const secondIdentity = userContext("Sam", "Swarthmore College", "swarthmore", "Computer Science", "11.0701");

  FlowState.save({
    phase: "report",
    ctx: { college: "Swarthmore College", major: "Political Science" },
    sectionIdx: 24,
    answers: { interest1: 5 },
  }, firstIdentity);

  assert.equal(FlowState.load(firstIdentity).phase, "report");
  assert.deepEqual(FlowState.load(firstIdentity).answers, { interest1: 5 });
  assert.equal(FlowState.load(secondIdentity), null);

  FlowState.save({
    phase: "context",
    ctx: { college: "Swarthmore College", major: "Computer Science" },
    sectionIdx: 0,
    answers: {},
  }, secondIdentity);

  assert.equal(FlowState.load(secondIdentity).phase, "context");
  assert.deepEqual(FlowState.load(secondIdentity).answers, {});
});

test("root index is only a public landing redirect", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(html, /app\/research\.jsx|function ResearchPage|start\.html/);
});

test("survey page loads identity-scoped flow state before the controller", () => {
  const html = read("survey.html");

  const flowStateIdx = html.indexOf('src="app/flow-state.js"');
  const fitAppIdx = html.indexOf('src="app/fit-app.jsx"');
  assert.ok(flowStateIdx > -1, "flow-state.js should be loaded");
  assert.ok(fitAppIdx > -1, "fit-app.jsx should be loaded");
  assert.ok(flowStateIdx < fitAppIdx, "flow-state.js must load before fit-app.jsx");
});

test("downstream pages require a completed identity", () => {
  const researchHtml = read("research.html");
  const fitApp = read("app/fit-app.jsx");

  assert.match(researchHtml, /window\.UserContext\.hasIdentity\(\)/);
  assert.match(researchHtml, /!c\.preLandingComplete/);
  assert.match(fitApp, /window\.UserContext\.hasIdentity/);
  assert.match(fitApp, /!uc \|\| !uc\.preLandingComplete \|\| !hasIdentity/);
  assert.match(fitApp, /FlowStore\.load\(uc\)/);
  assert.match(fitApp, /FlowStore\.save\(\{ phase, ctx, sectionIdx, answers \}, uc\)/);
});

test("skip intro does not unlock research or survey without identity", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(prelanding, /preLandingComplete: false/);
  assert.match(prelanding, /contextConfirmed: false/);
  assert.match(prelanding, /window\.location\.href = "landing\/index\.html"/);
});
