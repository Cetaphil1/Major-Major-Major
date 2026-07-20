const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(ROOT, "app/user-context.js"), "utf8");

function loadUserContext(seed = {}) {
  const store = new Map(Object.entries(seed));
  const sandbox = {
    window: {},
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
  };

  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: "app/user-context.js" });

  return { UserContext: sandbox.window.UserContext, window: sandbox.window, store };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load recovers from malformed localStorage with the empty context shape", () => {
  const { UserContext } = loadUserContext({ "fbi-user-context-v1": "{bad json" });

  assert.deepEqual(plain(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
});

test("update merges patches without clobbering saved identity", () => {
  const { UserContext } = loadUserContext();

  UserContext.save({
    displayName: "Sam",
    selectedCollege: { name: "Purdue University", state: "IN" },
    selectedMajor: { name: "Computer Science", category: "Technology" },
    contextConfirmed: true,
    preLandingComplete: false,
  });

  UserContext.update({ preLandingComplete: true });
  const saved = plain(UserContext.load());

  assert.equal(saved.displayName, "Sam");
  assert.equal(saved.selectedCollege.name, "Purdue University");
  assert.equal(saved.selectedMajor.name, "Computer Science");
  assert.equal(saved.contextConfirmed, true);
  assert.equal(saved.preLandingComplete, true);
});

test("identity helpers require both selected school and major", () => {
  const { UserContext } = loadUserContext();

  assert.equal(UserContext.hasIdentity(), false);
  UserContext.update({ selectedCollege: { name: "UCLA" } });
  assert.equal(UserContext.hasIdentity(), false);
  UserContext.update({ selectedMajor: { name: "Psychology" } });
  assert.equal(UserContext.hasIdentity(), true);
});

test("name helper trims saved display name and uses honest fallback", () => {
  const { UserContext } = loadUserContext();

  assert.equal(UserContext.nameOr("student"), "student");
  UserContext.update({ displayName: "  Maya  " });
  assert.equal(UserContext.nameOr("student"), "Maya");
});

test("related majors prefer explicit data, then same-category fallback", () => {
  const { UserContext, window } = loadUserContext();
  const db = [
    { name: "Computer Science", category: "Technology" },
    { name: "Information Science", category: "Technology" },
    { name: "Data Science", category: "Technology" },
    { name: "Psychology", category: "Social Science" },
  ];
  window.__MAJORS = db;

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", relatedMajors: ["Data Science"] }, db, 5)),
    ["Data Science"],
  );
  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Technology" }, null, 2)),
    ["Information Science", "Data Science"],
  );
});
