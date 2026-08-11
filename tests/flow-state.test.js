const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadFlowState(initialStorage) {
  const storage = { ...(initialStorage || {}) };
  const localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    },
  };
  const sandbox = { window: {}, localStorage };
  sandbox.window.window = sandbox.window;

  const code = fs.readFileSync(path.join(root, "app", "flow-state.js"), "utf8");
  vm.runInNewContext(code, sandbox, { filename: "app/flow-state.js" });

  return { FlowState: sandbox.window.FlowState, storage };
}

function userContext(displayName, college, major) {
  return {
    displayName,
    selectedCollege: college ? { name: college } : null,
    selectedMajor: major ? { name: major } : null,
  };
}

test("saved survey state is ignored when the current identity changes", () => {
  const saved = {
    phase: "report",
    ctx: {
      displayName: "Alex",
      college: "Swarthmore College",
      major: "Political Science",
    },
    answers: { q1: 5 },
  };
  const { FlowState } = loadFlowState({
    "fbi-flow-v1": JSON.stringify(saved),
  });

  assert.equal(
    FlowState.load(userContext("Alex", "Purdue University", "Computer Science")),
    null
  );
});

test("legacy unscoped state is adopted only for the matching identity", () => {
  const saved = {
    phase: "quiz",
    ctx: {
      displayName: "Alex",
      college: "Swarthmore College",
      major: "Political Science",
    },
    answers: { q1: 5 },
  };
  const { FlowState } = loadFlowState({
    "fbi-flow-v1": JSON.stringify(saved),
  });

  const loaded = FlowState.load(userContext(" Alex ", "swarthmore college", "Political   Science"));

  assert.equal(loaded.phase, "quiz");
  assert.equal(loaded.identityKey, "alex|swarthmore college|political science");
});

test("saved state receives an identity key and does not resume for another student", () => {
  const { FlowState, storage } = loadFlowState();

  FlowState.save(
    { phase: "report", ctx: { displayName: "Alex", college: "Purdue University", major: "Computer Science" } },
    userContext("Alex", "Purdue University", "Computer Science")
  );

  const raw = JSON.parse(storage["fbi-flow-v1"]);
  assert.equal(raw.identityKey, "alex|purdue university|computer science");
  assert.equal(FlowState.load(userContext("Sam", "Purdue University", "Computer Science")), null);
});

test("survey page loads flow-state before the survey controller", () => {
  const surveyHtml = fs.readFileSync(path.join(root, "survey.html"), "utf8");
  const flowStatePos = surveyHtml.indexOf('src="app/flow-state.js"');
  const fitAppPos = surveyHtml.indexOf('src="app/fit-app.jsx"');

  assert.ok(flowStatePos > -1, "survey.html must include app/flow-state.js");
  assert.ok(fitAppPos > -1, "survey.html must include app/fit-app.jsx");
  assert.ok(flowStatePos < fitAppPos, "flow-state.js must load before fit-app.jsx");
});
