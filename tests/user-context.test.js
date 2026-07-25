const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function createStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    raw(key) {
      return data.get(key);
    },
  };
}

function loadUserContext(initialStorage) {
  const storage = createStorage(initialStorage);
  const sandbox = {
    window: {},
    localStorage: storage,
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.localStorage = storage;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "app/user-context.js"), "utf8"), sandbox);
  return { UserContext: sandbox.window.UserContext, window: sandbox.window, storage };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load falls back to an empty context for missing or malformed storage", () => {
  const { UserContext, storage } = loadUserContext({
    "fbi-user-context-v1": "{not valid json",
  });

  assert.deepEqual(plain(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  UserContext.save({ displayName: "Ava", selectedCollege: null });
  assert.equal(JSON.parse(storage.raw(UserContext.KEY)).displayName, "Ava");
});

test("update merges partial patches without losing saved identity", () => {
  const { UserContext, storage } = loadUserContext();

  UserContext.update({
    displayName: " Ava ",
    selectedCollege: { name: "Swarthmore College", id: "swarthmore", isManual: false },
    selectedMajor: { name: "Political Science", category: "Social Sciences", isManual: false },
    contextConfirmed: true,
  });
  UserContext.update({ preLandingComplete: true });

  const loaded = plain(UserContext.load());
  assert.equal(loaded.displayName, " Ava ");
  assert.equal(loaded.selectedCollege.name, "Swarthmore College");
  assert.equal(loaded.selectedMajor.name, "Political Science");
  assert.equal(loaded.contextConfirmed, true);
  assert.equal(loaded.preLandingComplete, true);
  assert.equal(UserContext.nameOr("friend"), "Ava");
  assert.equal(UserContext.hasIdentity(), true);

  UserContext.clear();
  assert.equal(storage.raw(UserContext.KEY), undefined);
  assert.equal(UserContext.hasIdentity(), false);
});

test("hasIdentity requires both a college and a major name", () => {
  const { UserContext } = loadUserContext();

  UserContext.update({ selectedCollege: { name: "Howard University" } });
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.update({ selectedMajor: { name: "Computer Science" } });
  assert.equal(UserContext.hasIdentity(), true);

  UserContext.update({ selectedCollege: { name: "" } });
  assert.equal(UserContext.hasIdentity(), false);
});

test("relatedMajorsFor prefers explicit related majors and falls back by category", () => {
  const { UserContext, window } = loadUserContext();
  window.__MAJORS = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "Political Science", category: "Social Sciences" },
  ];

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", relatedMajors: ["Data Science", "Cognitive Science"] }, [], 1)),
    ["Data Science"]
  );
  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, null, 5)),
    ["Data Science", "Information Science"]
  );
  assert.deepEqual(Array.from(UserContext.relatedMajorsFor({ name: "Undeclared" }, null, 5)), []);
});
