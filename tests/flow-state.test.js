const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createStorage() {
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
    }
  };
}

function loadFlowState(storage) {
  const code = fs.readFileSync(path.join(__dirname, "..", "app", "flow-state.js"), "utf8");
  const context = {
    window: {},
    localStorage: storage
  };
  vm.runInNewContext(code, context);
  return context.window.FlowState;
}

function userContext(displayName, collegeName, collegeId, majorName, cipCode) {
  return {
    displayName,
    selectedCollege: { name: collegeName, id: collegeId },
    selectedMajor: { name: majorName, cipCode }
  };
}

test("saved survey flow is ignored when the college or major changes", () => {
  const storage = createStorage();
  const FlowState = loadFlowState(storage);
  const oldContext = userContext("Sam", "MIT", "166683", "Computer Science", "11.0701");
  const newContext = userContext("Sam", "Stanford University", "243744", "Biology", "26.0101");

  FlowState.save({
    identityKey: FlowState.identityKey(oldContext),
    phase: "report",
    sectionIdx: 7,
    answers: { interest_1: 5 }
  });

  assert.equal(FlowState.forIdentity(newContext), null);
});

test("saved survey flow resumes only for the matching identity", () => {
  const storage = createStorage();
  const FlowState = loadFlowState(storage);
  const context = userContext("Sam", "MIT", "166683", "Computer Science", "11.0701");

  FlowState.save({
    identityKey: FlowState.identityKey(context),
    phase: "quiz",
    sectionIdx: 2,
    answers: { interest_1: 4 }
  });

  assert.deepEqual(FlowState.forIdentity(context), {
    identityKey: FlowState.identityKey(context),
    phase: "quiz",
    sectionIdx: 2,
    answers: { interest_1: 4 }
  });
});

test("unkeyed legacy survey flow is discarded", () => {
  const storage = createStorage();
  const FlowState = loadFlowState(storage);
  const context = userContext("Sam", "MIT", "166683", "Computer Science", "11.0701");

  storage.setItem(FlowState.STORE, JSON.stringify({
    phase: "report",
    sectionIdx: 7,
    answers: { interest_1: 5 }
  }));

  assert.equal(FlowState.forIdentity(context), null);
});
