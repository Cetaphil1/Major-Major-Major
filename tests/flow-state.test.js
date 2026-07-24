const assert = require("node:assert/strict");
const test = require("node:test");

const FlowState = require("../app/flow-state.js");

function storageWith(value) {
  const data = new Map();
  if (value !== undefined) data.set(FlowState.STORE, JSON.stringify(value));
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
    raw(key) {
      return data.get(key);
    },
  };
}

function userContext(college, major) {
  return {
    selectedCollege: { name: college },
    selectedMajor: { name: major },
  };
}

test("loads saved survey state only for the current college and major", () => {
  const storage = storageWith({
    identityKey: "purdue university|computer science",
    phase: "report",
    answers: { interest_1: 5 },
    ctx: { college: "Purdue University", major: "Computer Science" },
  });

  assert.equal(
    FlowState.load(userContext("Purdue University", "Computer Science"), storage).phase,
    "report"
  );
  assert.equal(
    FlowState.load(userContext("Purdue University", "Mechanical Engineering"), storage),
    null
  );
});

test("migrates legacy state only when its context matches the current identity", () => {
  const matching = storageWith({
    phase: "quiz",
    ctx: { college: "Spelman College", major: "Psychology" },
    answers: { belonging_1: 4 },
  });
  const migrated = FlowState.load(userContext("  Spelman   College ", "psychology"), matching);

  assert.equal(migrated.identityKey, "spelman college|psychology");
  assert.equal(migrated.phase, "quiz");

  const stale = storageWith({
    phase: "report",
    ctx: { college: "Spelman College", major: "Psychology" },
    answers: { belonging_1: 4 },
  });

  assert.equal(
    FlowState.load(userContext("Spelman College", "Biology (Pre-Med)"), stale),
    null
  );
});

test("save stamps the persisted survey state with the active identity", () => {
  const storage = storageWith();

  const saved = FlowState.save(
    { phase: "analyzing", ctx: { college: "Howard University", major: "Economics" } },
    userContext("Howard University", "Economics"),
    storage
  );
  const raw = JSON.parse(storage.raw(FlowState.STORE));

  assert.equal(saved.identityKey, "howard university|economics");
  assert.equal(raw.identityKey, "howard university|economics");
  assert.equal(raw.phase, "analyzing");
});
