const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "flow-state.js"), "utf8");

function createFlowState(initialStorage) {
  const storage = new Map(Object.entries(initialStorage || {}));
  const context = {
    window: {},
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
  };
  context.window.localStorage = context.localStorage;
  vm.runInNewContext(source, context);
  return { FlowState: context.window.FlowState, storage };
}

function identity(displayName, college, major) {
  return {
    displayName,
    selectedCollege: { name: college },
    selectedMajor: { name: major },
  };
}

test("loads saved survey progress for the same identity", () => {
  const { FlowState } = createFlowState();
  const current = FlowState.identityFromUserContext(identity("Sam", "UCLA", "Psychology"));
  const flow = {
    phase: "quiz",
    ctx: { college: "UCLA", major: "Psychology", intent: "switch" },
    sectionIdx: 7,
    answers: { q1: 4 },
  };

  FlowState.save(current, flow);

  assert.deepEqual(FlowState.load(current), flow);
});

test("does not reuse answers after college or major identity changes", () => {
  const { FlowState } = createFlowState();
  const first = FlowState.identityFromUserContext(identity("Sam", "UCLA", "Psychology"));
  const changed = FlowState.identityFromUserContext(identity("Sam", "UC Berkeley", "Computer Science"));

  FlowState.save(first, {
    phase: "report",
    ctx: { college: "UCLA", major: "Psychology", intent: "switch" },
    sectionIdx: 42,
    answers: { q1: 1, q2: 2 },
  });

  assert.equal(FlowState.load(changed), null);
});

test("ignores legacy unscoped flow state instead of migrating stale reports", () => {
  const legacy = {
    phase: "report",
    ctx: { college: "UC Berkeley", major: "Computer Science", intent: "switch" },
    sectionIdx: 42,
    answers: { q1: 1, q2: 2 },
  };
  const { FlowState } = createFlowState({
    "fbi-flow-v1": JSON.stringify(legacy),
  });
  const current = FlowState.identityFromUserContext(identity("Sam", "UC Berkeley", "Computer Science"));

  assert.equal(FlowState.load(current), null);
});

test("normalizes harmless case and whitespace differences in identity keys", () => {
  const { FlowState } = createFlowState();
  const first = FlowState.identityFromUserContext(identity(" Sam ", "UCLA", "Psychology"));
  const same = FlowState.identityFromUserContext(identity("sam", " ucla ", " psychology "));
  const flow = { phase: "context", ctx: {}, sectionIdx: 0, answers: {} };

  FlowState.save(first, flow);

  assert.deepEqual(FlowState.load(same), flow);
});
