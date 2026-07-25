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

function userContext(displayName, college, major) {
  return {
    displayName,
    selectedCollege: { name: college },
    selectedMajor: { name: major },
  };
}

test("loads saved survey state only for the current student identity", () => {
  const storage = storageWith({
    identityKey: "mira|purdue university|computer science",
    phase: "report",
    answers: { interest_1: 5 },
    ctx: { displayName: "Mira", college: "Purdue University", major: "Computer Science" },
  });

  assert.equal(
    FlowState.load(userContext("Mira", "Purdue University", "Computer Science"), storage).phase,
    "report"
  );
  assert.equal(
    FlowState.load(userContext("Mira", "Purdue University", "Mechanical Engineering"), storage),
    null
  );
  assert.equal(
    FlowState.load(userContext("Kai", "Purdue University", "Computer Science"), storage),
    null
  );
});

test("migrates legacy state only when its context matches the current identity", () => {
  const matching = storageWith({
    phase: "quiz",
    ctx: { displayName: "Ari", college: "  Spelman   College ", major: "Psychology" },
    answers: { belonging_1: 4 },
  });
  const migrated = FlowState.load(userContext("ari", "Spelman College", "psychology"), matching);

  assert.equal(migrated.identityKey, "ari|spelman college|psychology");
  assert.equal(migrated.phase, "quiz");

  const stale = storageWith({
    phase: "report",
    ctx: { displayName: "Ari", college: "Spelman College", major: "Psychology" },
    answers: { belonging_1: 4 },
  });

  assert.equal(
    FlowState.load(userContext("Ari", "Spelman College", "Biology (Pre-Med)"), stale),
    null
  );
});

test("save stamps persisted survey state with the active identity", () => {
  const storage = storageWith();

  const saved = FlowState.save(
    { phase: "analyzing", ctx: { displayName: "Jo", college: "Howard University", major: "Economics" } },
    userContext("Jo", "Howard University", "Economics"),
    storage
  );
  const raw = JSON.parse(storage.raw(FlowState.STORE));

  assert.equal(saved.identityKey, "jo|howard university|economics");
  assert.equal(raw.identityKey, "jo|howard university|economics");
  assert.equal(raw.phase, "analyzing");
});

test("save does not persist survey progress without a complete identity", () => {
  const storage = storageWith();

  const saved = FlowState.save(
    { phase: "quiz", answers: { interest_1: 3 } },
    { displayName: "No College", selectedCollege: null, selectedMajor: { name: "Economics" } },
    storage
  );

  assert.equal(saved.identityKey, "");
  assert.equal(storage.raw(FlowState.STORE), undefined);
});
