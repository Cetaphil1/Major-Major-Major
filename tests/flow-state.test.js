const assert = require("node:assert/strict");
const test = require("node:test");

const FlowState = require("../app/flow-state.js");

function storageWith(initial) {
  const data = new Map(Object.entries(initial || {}));
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

function userContext(overrides) {
  return Object.assign({
    displayName: "Alex",
    preLandingComplete: true,
    selectedCollege: { id: "ucla", name: "University of California, Los Angeles" },
    selectedMajor: { cipCode: "11.0701", name: "Computer Science" },
  }, overrides || {});
}

test("loads saved flow state for the matching identity", () => {
  const uc = userContext();
  const saved = {
    identityKey: FlowState.identityKeyFromUserContext(uc),
    phase: "report",
    ctx: {
      displayName: "Alex",
      college: "University of California, Los Angeles",
      collegeMeta: { id: "ucla" },
      major: "Computer Science",
      majorMeta: { cipCode: "11.0701" },
    },
    answers: { q1: 5 },
  };
  const storage = storageWith({ [FlowState.STORE]: JSON.stringify(saved) });

  assert.deepEqual(FlowState.loadForUserContext(uc, storage), saved);
});

test("drops saved report state when the selected major changes", () => {
  const original = userContext();
  const storage = storageWith();
  FlowState.saveForUserContext({ phase: "report", answers: { q1: 5 } }, original, storage);

  const changedMajor = userContext({
    selectedMajor: { cipCode: "26.0101", name: "Biology" },
  });

  assert.equal(FlowState.loadForUserContext(changedMajor, storage), null);
});

test("drops legacy unscoped state when its embedded context belongs to another identity", () => {
  const legacy = {
    phase: "report",
    ctx: {
      displayName: "Alex",
      college: "University of California, Los Angeles",
      collegeMeta: { id: "ucla" },
      major: "Computer Science",
      majorMeta: { cipCode: "11.0701" },
    },
    answers: { q1: 5 },
  };
  const storage = storageWith({ [FlowState.STORE]: JSON.stringify(legacy) });
  const changedCollege = userContext({
    selectedCollege: { id: "usc", name: "University of Southern California" },
  });

  assert.equal(FlowState.loadForUserContext(changedCollege, storage), null);
});

test("migrates legacy unscoped state only when its context matches", () => {
  const uc = userContext();
  const legacy = {
    phase: "quiz",
    ctx: {
      displayName: "  Alex  ",
      college: "UCLA",
      collegeMeta: { id: "ucla" },
      major: "Computer Science",
      majorMeta: { cipCode: "11.0701" },
    },
    answers: { q1: 4 },
  };
  const storage = storageWith({ [FlowState.STORE]: JSON.stringify(legacy) });

  const loaded = FlowState.loadForUserContext(uc, storage);

  assert.equal(loaded.identityKey, FlowState.identityKeyFromUserContext(uc));
  assert.equal(loaded.phase, "quiz");
  assert.equal(
    JSON.parse(storage.getItem(FlowState.STORE)).identityKey,
    FlowState.identityKeyFromUserContext(uc)
  );
});

test("wipe removes only the survey flow store", () => {
  const storage = storageWith({
    [FlowState.STORE]: JSON.stringify({ phase: "quiz" }),
    "fbi-user-context-v1": JSON.stringify(userContext()),
  });

  FlowState.wipe(storage);

  assert.equal(storage.getItem(FlowState.STORE), null);
  assert.notEqual(storage.getItem("fbi-user-context-v1"), null);
});
