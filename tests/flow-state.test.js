const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "flow-state.js"), "utf8");

function createFlowState(initialValue) {
  const storage = new Map();
  if (initialValue !== undefined) storage.set("fbi-flow-v1", JSON.stringify(initialValue));

  const context = {
    window: {},
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
  };
  context.window.localStorage = context.localStorage;
  vm.runInNewContext(source, context);

  return {
    flowState: context.window.FBIFlowState,
    readStored() {
      const raw = storage.get("fbi-flow-v1");
      return raw ? JSON.parse(raw) : null;
    },
  };
}

function userContext(displayName, college, major) {
  return {
    displayName,
    selectedCollege: { name: college },
    selectedMajor: { name: major },
    preLandingComplete: true,
  };
}

test("does not load legacy survey state for a changed college/major identity", () => {
  const { flowState } = createFlowState({
    phase: "report",
    ctx: {
      displayName: "Alex",
      college: "UCLA",
      major: "Computer Science",
      stage: "Currently enrolled",
      enrollment: "Full-time",
      intent: "switch",
    },
    sectionIdx: 49,
    answers: { interest_1: 1 },
  });

  const newIdentity = flowState.identityFromUserContext(
    userContext("Alex", "Swarthmore College", "Political Science")
  );

  assert.equal(flowState.loadForIdentity(newIdentity), null);
});

test("migrates matching legacy state by allowing the next save to attach identity", () => {
  const { flowState, readStored } = createFlowState({
    phase: "quiz",
    ctx: {
      displayName: "Alex",
      college: "UCLA",
      major: "Computer Science",
      stage: "Currently enrolled",
      enrollment: "Full-time",
      intent: "switch",
    },
    sectionIdx: 12,
    answers: { interest_1: 4 },
  });

  const identity = flowState.identityFromUserContext(
    userContext(" Alex ", "ucla", "computer science")
  );
  const loaded = flowState.loadForIdentity(identity);

  assert.equal(loaded.phase, "quiz");
  flowState.save(loaded, identity);
  assert.equal(readStored().identityKey, "alex|ucla|computer science");
});

test("keeps identity-scoped state isolated between majors", () => {
  const { flowState } = createFlowState({
    identityKey: "alex|ucla|computer science",
    phase: "report",
    ctx: { displayName: "Alex", college: "UCLA", major: "Computer Science" },
    answers: { interest_1: 5 },
  });

  assert.equal(
    flowState.loadForIdentity("alex|ucla|computer science").phase,
    "report"
  );
  assert.equal(flowState.loadForIdentity("alex|ucla|biology"), null);
});

test("does not leak scoped state into a session with no current identity", () => {
  const { flowState } = createFlowState({
    identityKey: "alex|ucla|computer science",
    phase: "report",
    ctx: { displayName: "Alex", college: "UCLA", major: "Computer Science" },
  });

  assert.equal(flowState.loadForIdentity(""), null);
});
