const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

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
  };
}

function loadUserContext(seed) {
  const localStorage = createStorage(seed);
  const sandbox = { window: {}, localStorage };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "app/user-context.js"), "utf8"), sandbox);
  return { UserContext: sandbox.window.UserContext, localStorage };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load returns a safe empty context for missing or malformed storage", () => {
  const { UserContext, localStorage } = loadUserContext();
  assert.deepEqual(plain(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  localStorage.setItem(UserContext.KEY, "{not json");
  assert.deepEqual(plain(UserContext.load()), plain(UserContext.empty()));
});

test("update merges partial patches without dropping saved identity", () => {
  const { UserContext } = loadUserContext();

  UserContext.update({
    displayName: "Alex",
    selectedCollege: { name: "Howard University", state: "DC" },
    selectedMajor: { name: "Computer Science", category: "Technology" },
  });
  const updated = UserContext.update({ preLandingComplete: true });

  assert.equal(updated.displayName, "Alex");
  assert.equal(updated.selectedCollege.name, "Howard University");
  assert.equal(updated.selectedMajor.name, "Computer Science");
  assert.equal(updated.preLandingComplete, true);
  assert.equal(updated.contextConfirmed, false);
  assert.equal(UserContext.hasIdentity(), true);
  assert.equal(UserContext.nameOr("friend"), "Alex");
});

test("related majors prefer explicit mappings and fall back to shared category", () => {
  const { UserContext } = loadUserContext();
  const db = [
    { name: "Computer Science", category: "Technology" },
    { name: "Information Science", category: "Technology" },
    { name: "Data Science", category: "Technology" },
    { name: "Psychology", category: "Social Science" },
  ];

  assert.deepEqual(Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", relatedMajors: ["Cognitive Science", "Data Science"] }, db, 1)), ["Cognitive Science"]);
  assert.deepEqual(Array.from(UserContext.relatedMajorsFor(db[0], db, 3)), ["Information Science", "Data Science"]);
  assert.deepEqual(Array.from(UserContext.relatedMajorsFor({ name: "Undeclared" }, db)), []);
});

test("clear removes stored context", () => {
  const { UserContext } = loadUserContext();

  UserContext.update({ displayName: "Riley", preLandingComplete: true });
  UserContext.clear();

  assert.equal(UserContext.nameOr("you"), "you");
  assert.equal(UserContext.hasIdentity(), false);
  assert.deepEqual(plain(UserContext.load()), plain(UserContext.empty()));
});
