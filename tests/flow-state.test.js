const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "flow-state.js"), "utf8");

function createFlowState() {
  const store = new Map();
  const sandbox = {
    window: {
      localStorage: {
        getItem(key) {
          return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
          store.set(key, String(value));
        },
        removeItem(key) {
          store.delete(key);
        },
      },
    },
  };
  vm.runInNewContext(source, sandbox);
  return { FlowState: sandbox.window.FlowState, store };
}

test("loads saved survey progress only for the same identity", () => {
  const { FlowState } = createFlowState();
  const identity = FlowState.identityKey({
    displayName: "Hannah",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });

  FlowState.save({ phase: "report", answers: { interest1: 5 } }, identity);

  assert.deepEqual(JSON.parse(JSON.stringify(FlowState.load(identity))), {
    identityKey: "hannah|swarthmore college|political science",
    phase: "report",
    answers: { interest1: 5 },
  });
});

test("drops stale survey progress after college or major changes", () => {
  const { FlowState } = createFlowState();
  const oldIdentity = FlowState.identityKey({
    displayName: "Hannah",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });
  const newIdentity = FlowState.identityKey({
    displayName: "Hannah",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Computer Science" },
  });

  FlowState.save({ phase: "report", answers: { interest1: 5 } }, oldIdentity);

  assert.equal(FlowState.load(newIdentity), null);
});

test("does not reuse legacy unscoped progress for a current identity", () => {
  const { FlowState, store } = createFlowState();
  const identity = FlowState.identityKey({
    displayName: "Hannah",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });
  store.set(FlowState.STORE, JSON.stringify({ phase: "report", answers: { interest1: 5 } }));

  assert.equal(FlowState.load(identity), null);
});

test("survey page loads flow state before the React controller", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "survey.html"), "utf8");
  const flowStateIndex = html.indexOf('src="app/flow-state.js"');
  const fitAppIndex = html.indexOf('src="app/fit-app.jsx"');

  assert.notEqual(flowStateIndex, -1);
  assert.notEqual(fitAppIndex, -1);
  assert.ok(flowStateIndex < fitAppIndex);
});
