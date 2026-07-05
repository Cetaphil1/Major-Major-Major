const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadFlowState() {
  const store = new Map();
  const context = {
    window: {},
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
    },
  };
  context.window.localStorage = context.localStorage;

  const source = fs.readFileSync(path.join(__dirname, "../app/flow-state.js"), "utf8");
  vm.runInNewContext(source, context);

  return { FlowState: context.window.FlowState, store };
}

function user(displayName, collegeName, majorName) {
  return {
    displayName,
    selectedCollege: { id: collegeName.toLowerCase().replace(/\s+/g, "-"), name: collegeName },
    selectedMajor: { cipCode: majorName === "Computer Science" ? "11.0701" : "45.1001", name: majorName },
  };
}

test("does not restore survey state for a different identity", () => {
  const { FlowState } = loadFlowState();
  const firstIdentity = FlowState.identityFromUserContext(user("Sam", "UCLA", "Computer Science"));
  const secondIdentity = FlowState.identityFromUserContext(user("Sam", "UCLA", "Political Science"));
  const firstState = {
    phase: "report",
    ctx: { displayName: "Sam", college: "UCLA", major: "Computer Science", intent: "switch" },
    sectionIdx: 24,
    answers: { interest_1: 5 },
  };

  FlowState.save(firstIdentity, firstState);

  assert.equal(FlowState.load(secondIdentity), null);
  assert.equal(FlowState.load(firstIdentity).answers.interest_1, 5);
});

test("migrates matching legacy state into an identity-scoped key", () => {
  const { FlowState, store } = loadFlowState();
  const identity = FlowState.identityFromUserContext(user("Sam", "UCLA", "Computer Science"));
  const legacyState = {
    phase: "quiz",
    ctx: { displayName: "Sam", college: "UCLA", major: "Computer Science", intent: "exploring" },
    sectionIdx: 7,
    answers: { workload_2: 2 },
  };
  store.set(FlowState.LEGACY_KEY, JSON.stringify(legacyState));

  const loaded = FlowState.load(identity);

  assert.equal(loaded.phase, "quiz");
  assert.equal(store.has(FlowState.LEGACY_KEY), false);
  assert.equal(FlowState.load(identity).sectionIdx, 7);
});

test("rejects legacy state when saved college or major differs", () => {
  const { FlowState, store } = loadFlowState();
  const identity = FlowState.identityFromUserContext(user("Sam", "UCLA", "Political Science"));
  store.set(FlowState.LEGACY_KEY, JSON.stringify({
    phase: "report",
    ctx: { displayName: "Sam", college: "UCLA", major: "Computer Science" },
    sectionIdx: 24,
    answers: { interest_1: 5 },
  }));

  assert.equal(FlowState.load(identity), null);
  assert.equal(store.has(FlowState.LEGACY_KEY), true);
});
