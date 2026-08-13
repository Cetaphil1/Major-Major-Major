const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("site root redirects to the public landing page", () => {
  const index = read("index.html");

  assert.match(index, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(index, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(index, /app\/research\.jsx/);
  assert.doesNotMatch(index, /app\/fit-app\.jsx/);
});

test("downstream app pages require a completed identity", () => {
  const research = read("research.html");
  const survey = read("survey.html");

  for (const page of [research, survey]) {
    assert.match(page, /preLandingComplete/);
    assert.match(page, /contextConfirmed/);
    assert.match(page, /UserContext\.hasIdentity\(\)/);
    assert.match(page, /window\.location\.replace\("start\.html"\)/);
  }

  assert.ok(
    survey.indexOf('app/flow-state.js') < survey.indexOf('app/fit-app.jsx'),
    "survey.html must load identity-scoped persistence before the controller",
  );
});

test("skip intro exits to landing without completing identity", () => {
  const prelanding = read("app/prelanding.jsx");
  const skipIntro = prelanding.match(/const skipIntro = \(\) => \{([\s\S]*?)\n    \};/);

  assert.ok(skipIntro, "skipIntro handler should exist");
  assert.match(skipIntro[1], /window\.location\.href = "landing\/index\.html"/);
  assert.doesNotMatch(skipIntro[1], /preLandingComplete/);
});

test("prelanding blank edits do not erase saved college or major", () => {
  const prelanding = read("app/prelanding.jsx");
  const persistEffect = prelanding.match(/useEffect\(\(\) => \{([\s\S]*?)\n    \}, \[name, college, collegeMeta, major, majorMeta, confirmed\]\);/);

  assert.ok(persistEffect, "identity persistence effect should exist");
  assert.match(persistEffect[1], /if \(college\.trim\(\)\) patch\.selectedCollege/);
  assert.match(persistEffect[1], /if \(major\.trim\(\)\) patch\.selectedMajor/);
  assert.doesNotMatch(persistEffect[1], /selectedCollege:[^\n]*: null/);
  assert.doesNotMatch(persistEffect[1], /selectedMajor:[^\n]*: null/);
  assert.match(prelanding, /setCollege\(n\);setCollegeMeta\(m\);setConfirmed\(false\);/);
  assert.match(prelanding, /setMajor\(n\);setMajorMeta\(m\);setConfirmed\(false\);/);
});

test("report start-over clears both stores and restarts context entry", () => {
  const fitApp = read("app/fit-app.jsx");
  const onRestart = fitApp.match(/onRestart=\{\(\) => \{([\s\S]*?)\n      \}\}/);

  assert.ok(onRestart, "Report onRestart handler should exist");
  assert.match(onRestart[1], /wipe\(\)/);
  assert.match(onRestart[1], /window\.UserContext\.clear\(\)/);
  assert.match(onRestart[1], /window\.location\.href = "start\.html"/);
  assert.match(fitApp, /uc\.contextConfirmed/);
});

test("flow state is scoped to the active user identity", () => {
  const storage = new Map();
  const context = {
    window: {},
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
  context.window.localStorage = context.localStorage;

  vm.runInNewContext(read("app/flow-state.js"), context);
  const FlowState = context.window.FlowState;
  const identityA = {
    displayName: "Sam",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  };
  const identityB = {
    displayName: "Sam",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Computer Science" },
  };
  const keyA = FlowState.identityKey(identityA);
  const keyB = FlowState.identityKey(identityB);

  FlowState.save({ phase: "report", answers: { q1: 5 } }, keyA);

  assert.equal(FlowState.load(keyA).phase, "report");
  assert.equal(FlowState.load(keyB), null);

  storage.set(FlowState.STORE, JSON.stringify({ phase: "report" }));
  assert.equal(FlowState.load(keyA), null, "legacy unscoped progress must not attach to an identity");

  FlowState.save({ phase: "quiz" }, keyB);
  FlowState.wipe();
  assert.equal(storage.has(FlowState.STORE), false);
});
