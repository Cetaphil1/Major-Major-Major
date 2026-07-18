const assert = require("node:assert/strict");
const test = require("node:test");

const FlowState = require("../app/flow-state.js");

function memoryStorage(initialValue) {
  const data = new Map();
  if (initialValue !== undefined) data.set(FlowState.STORE, initialValue);
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function userContext(displayName, collegeName, majorName) {
  return {
    displayName,
    selectedCollege: { id: collegeName.toLowerCase().replace(/\s+/g, "-"), name: collegeName },
    selectedMajor: { cipCode: majorName.toLowerCase().replace(/\s+/g, "-"), name: majorName },
    preLandingComplete: true,
  };
}

test("loads saved survey progress for the same identity", () => {
  const uc = userContext("Sam", "UCLA", "Computer Science");
  const identityKey = FlowState.identityKeyFromUserContext(uc);
  const savedState = { identityKey, phase: "quiz", sectionIdx: 7, answers: { q1: 4 } };
  const storage = memoryStorage(JSON.stringify(savedState));

  assert.deepEqual(FlowState.scopedSavedForIdentity(uc, storage), {
    identityKey,
    saved: savedState,
  });
});

test("ignores saved survey progress after college or major changes", () => {
  const oldContext = userContext("Sam", "UCLA", "Computer Science");
  const oldIdentityKey = FlowState.identityKeyFromUserContext(oldContext);
  const storage = memoryStorage(JSON.stringify({
    identityKey: oldIdentityKey,
    phase: "report",
    sectionIdx: 42,
    answers: { q1: 1, q2: 1 },
    ctx: { college: "UCLA", major: "Computer Science" },
  }));

  const newContext = userContext("Sam", "UC Berkeley", "Economics");
  const result = FlowState.scopedSavedForIdentity(newContext, storage);

  assert.equal(result.identityKey, FlowState.identityKeyFromUserContext(newContext));
  assert.equal(result.saved, null);
});

test("new saves include the active identity key", () => {
  const uc = userContext("Sam", "UCLA", "Computer Science");
  const identityKey = FlowState.identityKeyFromUserContext(uc);
  const storage = memoryStorage();

  FlowState.saveRaw({ identityKey, phase: "context", sectionIdx: 0, answers: {} }, storage);

  assert.equal(JSON.parse(storage.getItem(FlowState.STORE)).identityKey, identityKey);
});
