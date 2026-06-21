const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(repoRoot, "app/user-context.js"), "utf8");

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function loadUserContext(initialStorage) {
  const localStorage = makeStorage(initialStorage);
  const context = { localStorage };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "app/user-context.js" });
  return { UserContext: context.UserContext, localStorage, window: context };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load returns a complete empty context when storage is missing or malformed", () => {
  let result = loadUserContext();
  assert.deepEqual(plain(result.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  result = loadUserContext({ "fbi-user-context-v1": "{not json" });
  assert.deepEqual(plain(result.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
});

test("update merges partial patches without dropping saved identity", () => {
  const { UserContext, localStorage } = loadUserContext();

  UserContext.save({
    displayName: "Shelly",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const next = UserContext.update({ contextConfirmed: true, preLandingComplete: true });

  assert.equal(next.displayName, "Shelly");
  assert.equal(next.selectedCollege.name, "Swarthmore College");
  assert.equal(next.selectedMajor.name, "Political Science");
  assert.equal(next.contextConfirmed, true);
  assert.equal(next.preLandingComplete, true);
  assert.equal(JSON.parse(localStorage.getItem(UserContext.KEY)).displayName, "Shelly");
});

test("hasIdentity requires both a selected college and selected major name", () => {
  const { UserContext } = loadUserContext();

  assert.equal(UserContext.hasIdentity(), false);
  UserContext.update({ selectedCollege: { name: "Swarthmore College" } });
  assert.equal(UserContext.hasIdentity(), false);
  UserContext.update({ selectedMajor: { name: "Political Science" } });
  assert.equal(UserContext.hasIdentity(), true);
});

test("relatedMajorsFor prefers explicit relationships and falls back by category", () => {
  const { UserContext, window } = loadUserContext();
  window.__MAJORS = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "Political Science", category: "Social Sciences" },
  ];

  assert.deepEqual(
    plain(UserContext.relatedMajorsFor({ name: "Computer Science", relatedMajors: ["Cognitive Science"] })),
    ["Cognitive Science"]
  );
  assert.deepEqual(
    plain(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, undefined, 2)),
    ["Data Science", "Information Science"]
  );
});
