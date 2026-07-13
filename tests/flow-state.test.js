const assert = require("node:assert/strict");
const test = require("node:test");

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.items.delete(key);
  }
}

globalThis.localStorage = new MemoryStorage();

const FlowState = require("../app/flow-state.js");

function userContext(displayName, college, major) {
  return {
    displayName,
    selectedCollege: { name: college },
    selectedMajor: { name: major },
    preLandingComplete: true,
  };
}

test("saved survey progress resumes for the same identity", () => {
  const ctx = userContext("Sam", "Swarthmore College", "Political Science");
  const saved = {
    phase: "report",
    ctx: { displayName: "Sam", college: "Swarthmore College", major: "Political Science" },
    sectionIdx: 7,
    answers: { q1: 5 },
  };

  FlowState.save(ctx, saved);

  assert.deepEqual(FlowState.load(ctx).answers, { q1: 5 });
  assert.equal(FlowState.load(ctx).phase, "report");
});

test("changed college or major cannot reuse stale answers", () => {
  const firstIdentity = userContext("Sam", "Swarthmore College", "Political Science");
  const changedMajor = userContext("Sam", "Swarthmore College", "Computer Science");
  const changedCollege = userContext("Sam", "Pomona College", "Political Science");

  FlowState.save(firstIdentity, {
    phase: "report",
    ctx: { displayName: "Sam", college: "Swarthmore College", major: "Political Science" },
    sectionIdx: 7,
    answers: { q1: 5 },
  });

  assert.equal(FlowState.load(changedMajor), null);
  assert.equal(FlowState.load(changedCollege), null);
});

test("legacy saves are trusted only when their context matches the current identity", () => {
  const current = userContext("Sam", "Swarthmore College", "Political Science");
  const changed = userContext("Sam", "Swarthmore College", "Computer Science");
  const legacy = {
    phase: "quiz",
    ctx: { displayName: "Sam", college: "Swarthmore College", major: "Political Science" },
    sectionIdx: 3,
    answers: { q2: 4 },
  };

  localStorage.setItem(FlowState.STORE, JSON.stringify(legacy));

  assert.deepEqual(FlowState.load(current), legacy);
  assert.equal(FlowState.load(changed), null);
});
