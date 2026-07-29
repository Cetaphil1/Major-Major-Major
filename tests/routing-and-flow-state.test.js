const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadFlowState(initialStore) {
  const store = Object.assign({}, initialStore || {});
  const context = {
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem(key, value) {
        store[key] = String(value);
      },
      removeItem(key) {
        delete store[key];
      },
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read("app/flow-state.js"), context);
  return { FlowState: context.window.FlowState, store };
}

test("root index redirects to the generated landing page", () => {
  const html = read("index.html");

  assert.match(html, /landing\/index\.html/);
  assert.doesNotMatch(html, /app\/research\.jsx/);
  assert.doesNotMatch(html, /window\.UserContext\.load/);
});

test("survey loads flow-state before the React flow controller", () => {
  const html = read("survey.html");
  const flowStateIndex = html.indexOf('src="app/flow-state.js"');
  const appIndex = html.indexOf('src="app/fit-app.jsx"');

  assert.ok(flowStateIndex >= 0, "survey.html should load app/flow-state.js");
  assert.ok(appIndex >= 0, "survey.html should load app/fit-app.jsx");
  assert.ok(flowStateIndex < appIndex, "flow state helper must load before fit-app");
});

test("flow state is only hydrated for the active college and major", () => {
  const { FlowState } = loadFlowState();
  const firstIdentity = FlowState.identityFromUserContext({
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });
  const secondIdentity = FlowState.identityFromUserContext({
    selectedCollege: { name: "Pomona College" },
    selectedMajor: { name: "Computer Science" },
  });

  FlowState.save(firstIdentity, {
    phase: "report",
    ctx: { college: "Swarthmore College", major: "Political Science" },
    sectionIdx: 7,
    answers: { q1: 5 },
  });

  assert.equal(FlowState.load(firstIdentity).phase, "report");
  assert.equal(FlowState.load(secondIdentity), null);
});

test("compatible legacy saves migrate without crossing identities", () => {
  const legacy = {
    phase: "quiz",
    ctx: { college: "Swarthmore College", major: "Political Science" },
    sectionIdx: 2,
    answers: { q1: 4 },
  };
  const { FlowState } = loadFlowState({
    "fbi-flow-v1": JSON.stringify(legacy),
  });
  const matchingIdentity = FlowState.identityFromUserContext({
    selectedCollege: { name: " Swarthmore   College " },
    selectedMajor: { name: "political science" },
  });
  const changedIdentity = FlowState.identityFromUserContext({
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Economics" },
  });

  assert.equal(FlowState.load(matchingIdentity).identityKey, matchingIdentity);
  assert.equal(FlowState.load(changedIdentity), null);
});
