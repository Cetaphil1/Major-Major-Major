const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function createFlowState() {
  const store = new Map();
  const localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
  const sandbox = { window: {}, localStorage };
  vm.runInNewContext(read("app/flow-state.js"), sandbox);
  return { FlowState: sandbox.window.FlowState, store };
}

test("root index redirects to the generated landing page", () => {
  const html = read("index.html");

  assert.match(html, /landing\/index\.html/);
  assert.match(html, /window\.location\.replace\(target\)/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /ReactDOM\.createRoot/);
});

test("research page remains the dedicated research app entry", () => {
  const html = read("research.html");

  assert.match(html, /app\/research\.jsx/);
  assert.match(html, /function ResearchPage\(\)/);
  assert.match(html, /href="survey\.html"/);
});

test("survey loads identity-scoped flow state before the app controller", () => {
  const html = read("survey.html");
  const flowStateIndex = html.indexOf('src="app/flow-state.js"');
  const fitAppIndex = html.indexOf('src="app/fit-app.jsx"');

  assert.notEqual(flowStateIndex, -1);
  assert.notEqual(fitAppIndex, -1);
  assert.ok(flowStateIndex < fitAppIndex);
});

test("flow state ignores saved answers from a different identity", () => {
  const { FlowState, store } = createFlowState();
  const oldIdentity = FlowState.identityKey("Sam", "Old College", "Biology");
  const newIdentity = FlowState.identityKeyFromUserContext({
    displayName: "Sam",
    selectedCollege: { name: "New College" },
    selectedMajor: { name: "Economics" },
  });

  FlowState.save({
    phase: "report",
    ctx: { displayName: "Sam", college: "Old College", major: "Biology" },
    answers: { q1: 5 },
  }, oldIdentity);

  assert.equal(FlowState.load(newIdentity), null);
  assert.deepEqual(FlowState.load(oldIdentity).answers, { q1: 5 });
  assert.match(store.get(FlowState.KEY), /"identityKey"/);
});

test("legacy saved state is only migrated when its context matches", () => {
  const { FlowState, store } = createFlowState();
  const legacyState = {
    phase: "quiz",
    ctx: { displayName: "Ari", college: "Match University", major: "Computer Science" },
    answers: { q2: 4 },
  };
  store.set(FlowState.KEY, JSON.stringify(legacyState));

  const matchingIdentity = FlowState.identityKey("Ari", "Match University", "Computer Science");
  const mismatchedIdentity = FlowState.identityKey("Ari", "Other University", "Computer Science");

  assert.equal(FlowState.load(mismatchedIdentity), null);
  assert.deepEqual(FlowState.load(matchingIdentity).answers, { q2: 4 });
});
