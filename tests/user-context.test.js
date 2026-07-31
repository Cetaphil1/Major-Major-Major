const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(ROOT, "app/user-context.js"), "utf8");

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
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

function loadContext(storage = createStorage()) {
  const sandbox = {
    window: {},
    localStorage: storage,
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.localStorage = storage;
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: "app/user-context.js" });
  return { UserContext: sandbox.window.UserContext, storage, window: sandbox.window };
}

function host(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load returns the full empty shape when storage is absent or malformed", () => {
  const { UserContext, storage } = loadContext();
  assert.deepEqual(host(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  storage.setItem(UserContext.KEY, "{bad json");
  assert.deepEqual(host(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
});

test("update merges partial patches without dropping saved identity", () => {
  const { UserContext, storage } = loadContext();

  UserContext.save({
    displayName: "Sam",
    selectedCollege: { name: "Swarthmore College", id: "swarthmore", isManual: false },
    selectedMajor: { name: "Political Science", category: "Social Sciences", isManual: false },
    contextConfirmed: true,
    preLandingComplete: false,
  });

  const updated = UserContext.update({ displayName: "Sammy", preLandingComplete: true });
  assert.equal(updated.displayName, "Sammy");
  assert.equal(updated.selectedCollege.name, "Swarthmore College");
  assert.equal(updated.selectedMajor.name, "Political Science");
  assert.equal(updated.contextConfirmed, true);
  assert.equal(updated.preLandingComplete, true);

  const persisted = JSON.parse(storage.raw(UserContext.KEY));
  assert.equal(persisted.displayName, "Sammy");
  assert.equal(persisted.selectedCollege.name, "Swarthmore College");
});

test("nameOr trims saved display names and falls back honestly", () => {
  const { UserContext } = loadContext();

  assert.equal(UserContext.nameOr("friend"), "friend");
  UserContext.update({ displayName: "  Riley  " });
  assert.equal(UserContext.nameOr("friend"), "Riley");
  UserContext.update({ displayName: "   " });
  assert.equal(UserContext.nameOr(), "you");
});

test("hasIdentity requires both a college and a major name", () => {
  const { UserContext } = loadContext();

  assert.equal(UserContext.hasIdentity(), false);
  UserContext.update({ selectedCollege: { name: "Purdue University" } });
  assert.equal(UserContext.hasIdentity(), false);
  UserContext.update({ selectedMajor: { name: "Mechanical Engineering" } });
  assert.equal(UserContext.hasIdentity(), true);
  UserContext.update({ selectedCollege: { name: "" } });
  assert.equal(UserContext.hasIdentity(), false);
});

test("clear removes the shared context record", () => {
  const { UserContext, storage } = loadContext();

  UserContext.update({ displayName: "Ari", preLandingComplete: true });
  assert.ok(storage.raw(UserContext.KEY));
  UserContext.clear();
  assert.equal(storage.raw(UserContext.KEY), undefined);
});

test("relatedMajorsFor uses explicit lists before category fallback", () => {
  const { UserContext, window } = loadContext();
  window.__MAJORS = [
    { name: "Computer Science", category: "Technology" },
    { name: "Data Science", category: "Technology" },
    { name: "Information Science", category: "Technology" },
    { name: "Psychology", category: "Social Sciences" },
  ];

  assert.deepEqual(
    host(UserContext.relatedMajorsFor({ name: "Political Science", relatedMajors: ["Public Policy", "Economics"] }, [], 1)),
    ["Public Policy"],
  );
  assert.deepEqual(
    host(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Technology" }, null, 2)),
    ["Data Science", "Information Science"],
  );
  assert.deepEqual(host(UserContext.relatedMajorsFor({ name: "Undeclared" }, null, 2)), []);
});
