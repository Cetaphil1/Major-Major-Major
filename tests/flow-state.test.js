const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadUserContext(initialValue) {
  let stored = initialValue == null ? null : JSON.stringify(initialValue);
  const sandbox = {
    window: {},
    localStorage: {
      getItem(key) {
        return key === "fbi-user-context-v1" ? stored : null;
      },
      setItem(key, value) {
        if (key === "fbi-user-context-v1") stored = String(value);
      },
      removeItem(key) {
        if (key === "fbi-user-context-v1") stored = null;
      },
    },
  };
  sandbox.window.localStorage = sandbox.localStorage;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(path.join(root, "app", "user-context.js"), "utf8"), sandbox);
  return sandbox.window.UserContext;
}

test("identityKey requires both college and major", () => {
  const UC = loadUserContext({
    displayName: "Alex",
    selectedCollege: { name: "UC Berkeley" },
    selectedMajor: null,
    preLandingComplete: true,
  });

  assert.equal(UC.identityKey(), null);
  assert.equal(UC.hasIdentity(), false);
});

test("identityKey is stable for casing and whitespace but changes by user identity", () => {
  const UC = loadUserContext();
  const first = UC.identityKey({
    displayName: " Alex ",
    selectedCollege: { name: " UC Berkeley " },
    selectedMajor: { name: " Computer Science " },
  });

  assert.equal(first, UC.identityKey({
    displayName: "alex",
    selectedCollege: { name: "uc berkeley" },
    selectedMajor: { name: "computer science" },
  }));
  assert.notEqual(first, UC.identityKey({
    displayName: "Sam",
    selectedCollege: { name: "uc berkeley" },
    selectedMajor: { name: "computer science" },
  }));
});

test("matchesIdentity rejects saved flow from another college or major", () => {
  const UC = loadUserContext();
  const current = {
    displayName: "Alex",
    selectedCollege: { name: "UC Berkeley" },
    selectedMajor: { name: "Computer Science" },
  };
  const saved = { identityKey: UC.identityKey(current), phase: "report", answers: { int_1: 5 } };

  assert.equal(UC.matchesIdentity(saved, current), true);
  assert.equal(UC.matchesIdentity(saved, {
    displayName: "Alex",
    selectedCollege: { name: "UCLA" },
    selectedMajor: { name: "Computer Science" },
  }), false);
  assert.equal(UC.matchesIdentity({ phase: "report", answers: { int_1: 5 } }, current), false);
});

test("survey flow persists and restores state only for the current identity", () => {
  const source = readFileSync(path.join(root, "app", "fit-app.jsx"), "utf8");

  assert.match(source, /const saved = UC\.matchesIdentity\(rawSaved, uc\) \? rawSaved : null;/);
  assert.match(source, /save\(\{ identityKey, phase, ctx, sectionIdx, answers \}\)/);
});

test("restart clears both quiz progress and pre-landing identity", () => {
  const source = readFileSync(path.join(root, "app", "fit-app.jsx"), "utf8");

  assert.match(source, /wipe\(\); UC\.clear\(\);/);
  assert.match(source, /window\.location\.href = "start\.html"/);
});
