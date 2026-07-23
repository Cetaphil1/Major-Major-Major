const assert = require("node:assert/strict");
const test = require("node:test");

function createLocalStorage() {
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
    },
    clear() {
      values.clear();
    },
  };
}

global.localStorage = createLocalStorage();
const flowState = require("../app/flow-state.js");

function userContext({ displayName = "Ada", college = "Swarthmore College", collegeId = "swarthmore", major = "Political Science", cipCode = "45.1001" } = {}) {
  return {
    displayName,
    preLandingComplete: true,
    selectedCollege: {
      id: collegeId,
      name: college,
    },
    selectedMajor: {
      cipCode,
      name: major,
    },
  };
}

test("saved survey progress reloads for the same identity", () => {
  localStorage.clear();
  const uc = userContext();
  const state = {
    phase: "report",
    ctx: {
      displayName: "Ada",
      college: "Swarthmore College",
      collegeMeta: { id: "swarthmore" },
      major: "Political Science",
      majorMeta: { cipCode: "45.1001" },
    },
    sectionIdx: 2,
    answers: { q1: 5 },
  };

  flowState.saveForUserContext(uc, state);

  assert.deepEqual(flowState.loadForUserContext(uc), state);
});

test("saved survey progress is ignored after the selected major changes", () => {
  localStorage.clear();
  flowState.saveForUserContext(userContext(), {
    phase: "report",
    ctx: {
      displayName: "Ada",
      college: "Swarthmore College",
      collegeMeta: { id: "swarthmore" },
      major: "Political Science",
      majorMeta: { cipCode: "45.1001" },
    },
    sectionIdx: 7,
    answers: { q1: 5, q2: 1 },
  });

  const changedMajor = userContext({ major: "Computer Science", cipCode: "11.0101" });

  assert.equal(flowState.loadForUserContext(changedMajor), null);
});

test("old unscoped state migrates only when its context matches", () => {
  localStorage.clear();
  const oldState = {
    phase: "quiz",
    ctx: {
      displayName: "Ada",
      college: "Swarthmore College",
      collegeMeta: { id: "swarthmore" },
      major: "Political Science",
      majorMeta: { cipCode: "45.1001" },
    },
    sectionIdx: 3,
    answers: { q1: 4 },
  };
  localStorage.setItem(flowState.STORE, JSON.stringify(oldState));

  assert.deepEqual(flowState.loadForUserContext(userContext()), oldState);
  assert.equal(flowState.loadForUserContext(userContext({ college: "Williams College", collegeId: "williams" })), null);
});

test("incomplete identities do not save or load survey state", () => {
  localStorage.clear();
  const incomplete = {
    displayName: "Ada",
    preLandingComplete: true,
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: null,
  };

  flowState.saveForUserContext(incomplete, { phase: "report", answers: { q1: 5 } });

  assert.equal(localStorage.getItem(flowState.STORE), null);
  assert.equal(flowState.loadForUserContext(incomplete), null);
});
