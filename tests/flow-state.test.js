const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app", "flow-state.js"), "utf8");

function createHarness(userContext) {
  const entries = new Map();
  const localStorage = {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      entries.set(key, String(value));
    },
    removeItem(key) {
      entries.delete(key);
    },
  };
  const window = {
    localStorage,
    UserContext: {
      load() {
        return userContext;
      },
    },
  };
  const context = vm.createContext({ window, localStorage, Object, JSON });

  vm.runInContext(source, context);

  return { FlowState: context.window.FlowState, localStorage };
}

test("identity keys are based on the active college and major", () => {
  const { FlowState } = createHarness({
    selectedCollege: { name: " Swarthmore College " },
    selectedMajor: { name: " Political Science " },
  });

  assert.equal(FlowState.currentIdentityKey(), "swarthmore college|political science");
});

test("saved survey state reloads for the same identity", () => {
  const { FlowState } = createHarness({
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });

  FlowState.save({ phase: "report", sectionIdx: 7, answers: { q1: 5 } });

  assert.deepEqual(FlowState.load(), {
    identityKey: "swarthmore college|political science",
    phase: "report",
    sectionIdx: 7,
    answers: { q1: 5 },
  });
});

test("saved survey state is discarded when college or major changes", () => {
  const first = createHarness({
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });
  first.FlowState.save({ phase: "report", sectionIdx: 7, answers: { q1: 5 } });
  const raw = first.localStorage.getItem(first.FlowState.STORE);

  const second = createHarness({
    selectedCollege: { name: "Carnegie Mellon University" },
    selectedMajor: { name: "Computer Science" },
  });
  second.localStorage.setItem(second.FlowState.STORE, raw);

  assert.equal(second.FlowState.load(), null);
});

test("legacy unscoped survey state is not reused for a confirmed identity", () => {
  const { FlowState, localStorage } = createHarness({
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });
  localStorage.setItem(FlowState.STORE, JSON.stringify({ phase: "report", answers: { q1: 5 } }));

  assert.equal(FlowState.load(), null);
});
