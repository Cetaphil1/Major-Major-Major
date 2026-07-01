const test = require("node:test");
const assert = require("node:assert/strict");

function createLocalStorage() {
  const data = new Map();
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
    clear() {
      data.clear();
    }
  };
}

globalThis.localStorage = createLocalStorage();

const FlowState = require("../app/flow-state.js");

function userContext(displayName, collegeName, collegeId, majorName, majorCipCode) {
  return {
    displayName,
    selectedCollege: { name: collegeName, id: collegeId },
    selectedMajor: { name: majorName, cipCode: majorCipCode },
    preLandingComplete: true
  };
}

test.beforeEach(() => {
  globalThis.localStorage.clear();
});

test("loads saved progress when the current identity matches", () => {
  const identity = FlowState.identityFromUserContext(
    userContext("Ari", "Swarthmore College", "swat", "Political Science", "45.1001")
  );

  FlowState.save({ phase: "quiz", sectionIdx: 2, answers: { q1: 5 } }, identity);

  assert.deepEqual(FlowState.load(identity), {
    identityKey: FlowState.identityKey(identity),
    phase: "quiz",
    sectionIdx: 2,
    answers: { q1: 5 }
  });
});

test("does not load old answers after college or major identity changes", () => {
  const oldIdentity = FlowState.identityFromUserContext(
    userContext("Ari", "Swarthmore College", "swat", "Political Science", "45.1001")
  );
  const newMajorIdentity = FlowState.identityFromUserContext(
    userContext("Ari", "Swarthmore College", "swat", "Computer Science", "11.0701")
  );
  const newCollegeIdentity = FlowState.identityFromUserContext(
    userContext("Ari", "Haverford College", "haverford", "Political Science", "45.1001")
  );

  FlowState.save({ phase: "report", sectionIdx: 7, answers: { q1: 1, q2: 2 } }, oldIdentity);

  assert.equal(FlowState.load(newMajorIdentity), null);
  assert.equal(FlowState.load(newCollegeIdentity), null);
});

test("does not reuse legacy unscoped progress", () => {
  const identity = FlowState.identityFromUserContext(
    userContext("Ari", "Swarthmore College", "swat", "Political Science", "45.1001")
  );

  globalThis.localStorage.setItem(
    FlowState.STORE,
    JSON.stringify({ phase: "report", sectionIdx: 7, answers: { q1: 1 } })
  );

  assert.equal(FlowState.load(identity), null);
});

test("normalizes identity values before matching saved progress", () => {
  const savedIdentity = FlowState.identityFromUserContext(
    userContext(" Ari ", "Swarthmore College", "SWAT", "Political Science", "45.1001")
  );
  const currentIdentity = FlowState.identityFromUserContext(
    userContext("ari", " swarthmore college ", "swat", "political science", "45.1001")
  );

  FlowState.save({ phase: "quiz", sectionIdx: 1, answers: { q1: 4 } }, savedIdentity);

  assert.equal(FlowState.load(currentIdentity).phase, "quiz");
});
