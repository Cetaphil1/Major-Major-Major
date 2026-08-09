const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function createFlowState() {
  const values = new Map();
  const sandbox = {
    window: {},
    localStorage: {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  };

  vm.runInNewContext(read("app/flow-state.js"), sandbox);
  return { FlowState: sandbox.window.FlowState, values };
}

test("site root redirects to the public landing page", () => {
  const html = read("index.html");

  assert.match(html, /window\.location\.replace\("landing\/index\.html"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=landing\/index\.html"/);
  assert.doesNotMatch(html, /script type="text\/babel"/);
});

test("research page redirects incomplete identities back to start", () => {
  const html = read("research.html");

  assert.match(html, /ctx\.preLandingComplete/);
  assert.match(html, /ctx\.contextConfirmed/);
  assert.match(html, /UserContext\.hasIdentity\(\)/);
  assert.match(html, /window\.location\.replace\("start\.html"\)/);
});

test("survey controller requires a confirmed identity", () => {
  const source = read("app/fit-app.jsx");

  assert.match(source, /uc && uc\.preLandingComplete && uc\.contextConfirmed && window\.UserContext && window\.UserContext\.hasIdentity\(\)/);
});

test("skip intro does not unlock downstream personalized pages", () => {
  const source = read("app/prelanding.jsx");
  const skipIntro = source.match(/const skipIntro = \(\) => \{[\s\S]*?\n    \};/);

  assert.ok(skipIntro, "skipIntro handler should exist");
  assert.doesNotMatch(skipIntro[0], /preLandingComplete:\s*true/);
  assert.match(skipIntro[0], /window\.location\.href = "landing\/index\.html"/);
});

test("blank edits preserve the last saved college and major until replacement", () => {
  const source = read("app/prelanding.jsx");

  assert.match(source, /previous\.selectedCollege \|\| null/);
  assert.match(source, /previous\.selectedMajor \|\| null/);
  assert.match(source, /preLandingComplete: confirmed && selectedCollege && selectedMajor \? previous\.preLandingComplete : false/);
});

test("editing identity fields invalidates prior confirmation", () => {
  const source = read("app/prelanding.jsx");

  assert.match(source, /onChange=\{\(value\) => \{setConfirmed\(false\);setName\(value\);\}\}/);
  assert.match(source, /onPick=\{\(n, m\) => \{setConfirmed\(false\);setCollege\(n\);setCollegeMeta\(m\);\}\}/);
  assert.match(source, /onPick=\{\(n, m\) => \{setConfirmed\(false\);setMajor\(n\);setMajorMeta\(m\);\}\}/);
});

test("survey loads identity-scoped state before the flow controller", () => {
  const html = read("survey.html");
  const flowState = html.indexOf('src="app/flow-state.js"');
  const fitApp = html.indexOf('src="app/fit-app.jsx"');

  assert.notEqual(flowState, -1);
  assert.notEqual(fitApp, -1);
  assert.ok(flowState < fitApp, "flow-state.js must load before fit-app.jsx");
});

test("flow state is reused only for the matching identity", () => {
  const { FlowState } = createFlowState();
  const firstIdentity = {
    displayName: "Sam",
    selectedCollege: { name: "College A" },
    selectedMajor: { name: "Major A" },
  };
  const secondIdentity = {
    displayName: "Sam",
    selectedCollege: { name: "College B" },
    selectedMajor: { name: "Major B" },
  };

  FlowState.save(firstIdentity, {
    phase: "report",
    ctx: { displayName: "Sam", college: "College A", major: "Major A" },
    sectionIdx: 2,
    answers: { q1: 5 },
  });

  assert.equal(FlowState.load(firstIdentity).phase, "report");
  assert.equal(FlowState.load(secondIdentity), null);
});

test("legacy unkeyed flow state is accepted only when its context matches", () => {
  const { FlowState, values } = createFlowState();
  const identity = {
    displayName: "Sam",
    selectedCollege: { name: "College A" },
    selectedMajor: { name: "Major A" },
  };

  values.set(FlowState.KEY, JSON.stringify({
    phase: "quiz",
    ctx: { displayName: "Sam", college: "College A", major: "Major A" },
    answers: { q1: 4 },
  }));
  assert.equal(FlowState.load(identity).phase, "quiz");

  values.set(FlowState.KEY, JSON.stringify({
    phase: "report",
    ctx: { displayName: "Sam", college: "College A", major: "Major C" },
    answers: { q1: 4 },
  }));
  assert.equal(FlowState.load(identity), null);
});
