const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(repoRoot, "app/user-context.js"), "utf8");

function createStorage(initial = {}) {
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
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

function loadContext(initialStorage) {
  const localStorage = createStorage(initialStorage);
  const sandbox = { window: {}, localStorage };
  sandbox.window.localStorage = localStorage;

  vm.runInNewContext(source, sandbox, { filename: "app/user-context.js" });
  return { UserContext: sandbox.window.UserContext, localStorage };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load returns an empty context for missing or malformed localStorage", () => {
  const { UserContext } = loadContext({
    "fbi-user-context-v1": "{not-json",
  });

  assert.deepEqual(plain(UserContext.empty()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
  assert.deepEqual(plain(UserContext.load()), plain(UserContext.empty()));
});

test("update merges partial patches without dropping existing context", () => {
  const { UserContext, localStorage } = loadContext();

  UserContext.update({
    displayName: "Maya",
    selectedCollege: { name: "Swarthmore College", id: "swarthmore" },
  });
  const next = UserContext.update({
    selectedMajor: { name: "Political Science", category: "Social Sciences" },
    preLandingComplete: true,
  });

  assert.deepEqual(plain(next), {
    displayName: "Maya",
    selectedCollege: { name: "Swarthmore College", id: "swarthmore" },
    selectedMajor: { name: "Political Science", category: "Social Sciences" },
    contextConfirmed: false,
    preLandingComplete: true,
  });
  assert.deepEqual(plain(UserContext.load()), plain(next));

  UserContext.clear();
  assert.equal(localStorage.snapshot()[UserContext.KEY], undefined);
});

test("name and identity helpers use saved student context honestly", () => {
  const { UserContext } = loadContext();

  assert.equal(UserContext.nameOr("you"), "you");
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.update({
    displayName: "  Jo  ",
    selectedCollege: { name: "Howard University" },
    selectedMajor: { name: "Computer Science" },
  });

  assert.equal(UserContext.nameOr("you"), "Jo");
  assert.equal(UserContext.hasIdentity(), true);

  UserContext.update({ selectedMajor: { name: "" } });
  assert.equal(UserContext.hasIdentity(), false);
});

test("relatedMajorsFor prefers explicit related majors then category fallback", () => {
  const { UserContext } = loadContext();
  const db = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Systems", category: "Computing" },
    { name: "Political Science", category: "Social Sciences" },
  ];

  assert.deepEqual(
    plain(UserContext.relatedMajorsFor({ name: "Custom", relatedMajors: ["A", "B", "C"] }, db, 2)),
    ["A", "B"],
  );
  assert.deepEqual(
    plain(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, db, 2)),
    ["Data Science", "Information Systems"],
  );
  assert.deepEqual(plain(UserContext.relatedMajorsFor({ name: "Unknown" }, db, 2)), []);
});
