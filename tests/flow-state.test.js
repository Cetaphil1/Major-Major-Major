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
    raw(key) {
      return data.get(key);
    },
  };
}

function uc(overrides) {
  return Object.assign({
    displayName: "Ada",
    selectedCollege: { name: "University of California, Berkeley", id: "110635" },
    selectedMajor: { name: "Computer Science", cipCode: "11.0701" },
    preLandingComplete: true,
  }, overrides || {});
}

function legacySaved(overrides) {
  return Object.assign({
    phase: "report",
    ctx: {
      displayName: "Ada",
      college: "University of California, Berkeley",
      collegeMeta: { id: "110635" },
      major: "Computer Science",
      majorMeta: { cipCode: "11.0701" },
      stage: "Currently enrolled",
      enrollment: "Full-time",
      intent: "switch",
    },
    sectionIdx: 25,
    answers: { int_1: 5, int_2: 4 },
  }, overrides || {});
}

test("loads legacy survey progress when saved context matches the current identity", () => {
  const saved = legacySaved();
  const storage = storageWith({
    [FlowState.STORE]: JSON.stringify(saved),
  });
  const flow = FlowState.create(storage);

  const loaded = flow.load(uc());

  assert.equal(loaded.phase, "report");
  assert.deepEqual(loaded.answers, saved.answers);
  assert.equal(loaded.identityKey, FlowState.identityKeyFromUserContext(uc()));
});

test("drops legacy survey progress when the user changes major", () => {
  const storage = storageWith({
    [FlowState.STORE]: JSON.stringify(legacySaved()),
  });
  const flow = FlowState.create(storage);

  const loaded = flow.load(uc({
    selectedMajor: { name: "Psychology", cipCode: "42.0101" },
  }));

  assert.equal(loaded, null);
});

test("drops keyed survey progress when the user changes college", () => {
  const storage = storageWith();
  const flow = FlowState.create(storage);
  flow.save(uc(), legacySaved({ phase: "quiz" }));

  const loaded = flow.load(uc({
    selectedCollege: { name: "New York University", id: "193900" },
  }));

  assert.equal(loaded, null);
});

test("persists and reloads progress for the same identity", () => {
  const storage = storageWith();
  const flow = FlowState.create(storage);
  const state = legacySaved({ phase: "quiz", sectionIdx: 4 });

  flow.save(uc(), state);
  const raw = JSON.parse(storage.raw(FlowState.STORE));
  const loaded = flow.load(uc());

  assert.equal(raw.identityKey, FlowState.identityKeyFromUserContext(uc()));
  assert.equal(loaded.phase, "quiz");
  assert.equal(loaded.sectionIdx, 4);
  assert.deepEqual(loaded.answers, state.answers);
});
