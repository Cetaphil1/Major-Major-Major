const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const FlowState = require("../app/flow-state.js");

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function userContext(overrides) {
  return Object.assign({
    displayName: "Ava",
    selectedCollege: { id: "college-1", name: "College One" },
    selectedMajor: { cipCode: "11.0101", name: "Computer Science" },
  }, overrides || {});
}

test("loads saved survey state only for the current identity", () => {
  const identityKey = FlowState.identityKeyFromUserContext(userContext());
  const saved = {
    identityKey,
    phase: "report",
    ctx: { displayName: "Ava", college: "College One", major: "Computer Science" },
    sectionIdx: 7,
    answers: { interest_1: 5 },
  };
  const storage = memoryStorage({ [FlowState.STORE]: JSON.stringify(saved) });

  assert.deepEqual(FlowState.loadForIdentity(identityKey, storage), saved);
});

test("rejects saved survey state when college or major changes", () => {
  const oldKey = FlowState.identityKeyFromUserContext(userContext());
  const newKey = FlowState.identityKeyFromUserContext(userContext({
    selectedCollege: { id: "college-2", name: "College Two" },
  }));
  const storage = memoryStorage({
    [FlowState.STORE]: JSON.stringify({
      identityKey: oldKey,
      phase: "report",
      ctx: { displayName: "Ava", college: "College One", major: "Computer Science" },
      answers: { interest_1: 5 },
    }),
  });

  assert.equal(FlowState.loadForIdentity(newKey, storage), null);
});

test("checks legacy saved state against its embedded flow context", () => {
  const currentKey = FlowState.identityKeyFromUserContext(userContext());
  const matchingLegacy = {
    phase: "quiz",
    ctx: {
      displayName: " Ava ",
      college: "College One",
      collegeMeta: { id: "college-1" },
      major: "Computer Science",
      majorMeta: { cipCode: "11.0101" },
    },
    sectionIdx: 2,
    answers: { workload_1: 2 },
  };
  const mismatchedLegacy = {
    phase: "report",
    ctx: {
      displayName: "Ava",
      college: "College Two",
      collegeMeta: { id: "college-2" },
      major: "Computer Science",
      majorMeta: { cipCode: "11.0101" },
    },
    answers: { workload_1: 2 },
  };

  assert.deepEqual(
    FlowState.loadForIdentity(currentKey, memoryStorage({ [FlowState.STORE]: JSON.stringify(matchingLegacy) })),
    matchingLegacy
  );
  assert.equal(
    FlowState.loadForIdentity(currentKey, memoryStorage({ [FlowState.STORE]: JSON.stringify(mismatchedLegacy) })),
    null
  );
});

test("survey page loads flow-state before the survey controller", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "survey.html"), "utf8");

  assert(html.includes('src="app/flow-state.js"'));
  assert(html.indexOf('src="app/flow-state.js"') < html.indexOf('src="app/fit-app.jsx"'));
});
