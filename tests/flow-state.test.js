const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "flow-state.js"), "utf8");
const storage = new Map();
const sandbox = {
  window: {},
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  },
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const FlowState = sandbox.window.FlowState;
const emptyCtx = { college: "", major: "", stage: "", enrollment: "", intent: "", displayName: "" };

function userContext({ name = "Ada", college = "MIT", collegeId = "mit", major = "Computer Science", majorId = "11.0701" } = {}) {
  return {
    displayName: name,
    selectedCollege: college ? { id: collegeId, name: college, city: "Cambridge", state: "MA", type: "Private", level: "4-year" } : null,
    selectedMajor: major ? { cipCode: majorId, name: major, category: "Computing" } : null,
    preLandingComplete: true,
  };
}

function legacySaved(overrides = {}) {
  return Object.assign({
    phase: "report",
    sectionIdx: 7,
    answers: { q1: 5, q2: 1 },
    ctx: {
      displayName: "Ada",
      college: "MIT",
      collegeMeta: { id: "mit", city: "Cambridge", state: "MA" },
      major: "Computer Science",
      majorMeta: { cipCode: "11.0701", category: "Computing" },
      stage: "Choosing classes",
      enrollment: "Full-time",
      intent: "stay",
    },
  }, overrides);
}

{
  const initial = FlowState.createInitialState(legacySaved(), userContext(), emptyCtx);

  assert.strictEqual(initial.phase, "report");
  assert.deepStrictEqual(initial.answers, { q1: 5, q2: 1 });
  assert.strictEqual(initial.sectionIdx, 7);
  assert.strictEqual(initial.ctx.stage, "Choosing classes");
  assert.strictEqual(initial.ctx.college, "MIT");
  assert.strictEqual(initial.ctx.major, "Computer Science");
}

{
  const initial = FlowState.createInitialState(
    legacySaved(),
    userContext({ major: "Biology (Pre-Med)", majorId: "26.0101" }),
    emptyCtx
  );

  assert.strictEqual(initial.phase, "context");
  assert.strictEqual(JSON.stringify(initial.answers), "{}");
  assert.strictEqual(initial.sectionIdx, 0);
  assert.strictEqual(initial.ctx.college, "MIT");
  assert.strictEqual(initial.ctx.major, "Biology (Pre-Med)");
  assert.strictEqual(initial.ctx.stage, "");
  assert.strictEqual(initial.ctx.intent, "");
}

{
  const initial = FlowState.createInitialState(
    legacySaved({
      ctx: {
        displayName: "Ada",
        college: "UCLA",
        collegeMeta: { id: "ucla" },
        major: "Psychology",
        majorMeta: { cipCode: "42.0101" },
        stage: "Considering switching",
      },
    }),
    userContext({ name: "", college: "", major: "" }),
    emptyCtx
  );

  assert.strictEqual(initial.phase, "context");
  assert.strictEqual(JSON.stringify(initial.answers), "{}");
  assert.strictEqual(initial.ctx.displayName, "");
  assert.strictEqual(initial.ctx.college, "");
  assert.strictEqual(initial.ctx.collegeMeta, null);
  assert.strictEqual(initial.ctx.major, "");
  assert.strictEqual(initial.ctx.majorMeta, null);
  assert.strictEqual(initial.ctx.stage, "");
}

console.log("flow-state tests passed");
