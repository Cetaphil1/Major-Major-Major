const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function createFlowState() {
  const storage = new Map();
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
  vm.runInNewContext(fs.readFileSync(path.join(root, "app/flow-state.js"), "utf8"), context);
  return { FlowState: context.window.FlowState, storage };
}

function userContext(displayName, college, major) {
  return {
    displayName,
    selectedCollege: college ? { name: college } : null,
    selectedMajor: major ? { name: major } : null,
  };
}

test("flow state requires a complete college and major identity", () => {
  const { FlowState } = createFlowState();

  assert.equal(FlowState.keyForUserContext(userContext("Ava", "Swarthmore College", null)), null);
  assert.equal(FlowState.keyForUserContext(userContext("Ava", null, "Political Science")), null);
  assert.equal(
    FlowState.keyForUserContext(userContext(" Ava  Lee ", " Swarthmore   College ", "Political Science")),
    "ava lee|swarthmore college|political science"
  );
});

test("saved survey progress is only loaded for the matching identity", () => {
  const { FlowState } = createFlowState();
  const key = FlowState.keyForUserContext(userContext("Ava", "Swarthmore College", "Political Science"));
  const otherKey = FlowState.keyForUserContext(userContext("Ava", "Pomona College", "Political Science"));

  FlowState.save(key, {
    phase: "report",
    ctx: { displayName: "Ava", college: "Swarthmore College", major: "Political Science" },
    sectionIdx: 3,
    answers: { q1: 5 },
  });

  assert.equal(FlowState.load(key).phase, "report");
  assert.equal(FlowState.load(otherKey), null);
});

test("legacy survey progress migrates only when its context matches", () => {
  const { FlowState, storage } = createFlowState();
  const matchingKey = FlowState.keyForUserContext(userContext("Ava", "Swarthmore College", "Political Science"));
  const staleKey = FlowState.keyForUserContext(userContext("Ava", "Swarthmore College", "Economics"));

  storage.set(FlowState.STORE, JSON.stringify({
    phase: "report",
    ctx: { displayName: "Ava", college: "Swarthmore College", major: "Political Science" },
    answers: { q1: 5 },
  }));

  assert.equal(FlowState.load(matchingKey).identityKey, matchingKey);
  assert.equal(FlowState.load(staleKey), null);
});

test("survey page loads flow state before the React survey controller", () => {
  const surveyHtml = fs.readFileSync(path.join(root, "survey.html"), "utf8");

  assert.ok(
    surveyHtml.indexOf('src="app/flow-state.js"') > surveyHtml.indexOf('src="app/user-context.js"'),
    "flow-state should load after user-context"
  );
  assert.ok(
    surveyHtml.indexOf('src="app/flow-state.js"') < surveyHtml.indexOf('src="app/fit-app.jsx"'),
    "flow-state should load before fit-app"
  );
});

test("survey controller redirects before rendering without a saved identity", () => {
  const fitApp = fs.readFileSync(path.join(root, "app/fit-app.jsx"), "utf8");

  assert.match(fitApp, /const hasRequiredIdentity = !!\(uc && uc\.preLandingComplete && identityKey\);/);
  assert.match(fitApp, /if \(!hasRequiredIdentity\) \{ window\.location\.replace\("start\.html"\); \}/);
  assert.match(fitApp, /if \(!hasRequiredIdentity\) return null;/);
});
