const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadFlowState(initialValue) {
  const storage = new Map();
  if (initialValue !== undefined) {
    storage.set("fbi-flow-v1", JSON.stringify(initialValue));
  }

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
  context.window = context;

  const source = fs.readFileSync(path.join(__dirname, "..", "app", "flow-state.js"), "utf8");
  vm.runInNewContext(source, context);

  return { FlowState: context.FlowState, storage };
}

const identity = {
  displayName: "Ava",
  selectedCollege: { name: "Swarthmore College" },
  selectedMajor: { name: "Political Science" },
};

test("identityKey normalizes the current pre-landing identity", () => {
  const { FlowState } = loadFlowState();
  assert.equal(
    FlowState.identityKey(identity),
    JSON.stringify({
      displayName: "ava",
      college: "swarthmore college",
      major: "political science",
    }),
  );
});

test("loadForIdentity rejects saved survey progress from another identity", () => {
  const otherKey = JSON.stringify({
    displayName: "ava",
    college: "Swarthmore College".toLowerCase(),
    major: "Economics".toLowerCase(),
  });
  const { FlowState } = loadFlowState({
    identityKey: otherKey,
    phase: "report",
    ctx: { college: "Swarthmore College", major: "Economics" },
    answers: { q1: 5 },
  });

  assert.equal(FlowState.loadForIdentity(FlowState.identityKey(identity)), null);
});

test("loadForIdentity accepts matching legacy progress and stamps the identity key", () => {
  const { FlowState } = loadFlowState({
    phase: "quiz",
    ctx: { displayName: "Ava", college: "Swarthmore College", major: "Political Science" },
    answers: { q1: 4 },
  });

  const state = FlowState.loadForIdentity(FlowState.identityKey(identity));

  assert.equal(state.phase, "quiz");
  assert.equal(state.identityKey, FlowState.identityKey(identity));
});

test("saveForIdentity writes the identity key and wipe clears the survey store", () => {
  const { FlowState, storage } = loadFlowState();
  const key = FlowState.identityKey(identity);

  FlowState.saveForIdentity(key, { phase: "context", answers: {} });
  assert.equal(JSON.parse(storage.get("fbi-flow-v1")).identityKey, key);

  FlowState.wipe();
  assert.equal(storage.has("fbi-flow-v1"), false);
});
