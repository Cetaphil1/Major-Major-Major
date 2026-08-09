const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

function userContextSandbox(initialStorage) {
  const sandbox = {
    window: {},
    localStorage: createStorage(initialStorage),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(ROOT, "app/user-context.js"), "utf8");
  vm.runInContext(code, sandbox, { filename: "app/user-context.js" });
  return sandbox;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load returns a complete empty shape for missing or malformed storage", () => {
  const missing = userContextSandbox();
  assert.deepEqual(plain(missing.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const malformed = userContextSandbox({ "fbi-user-context-v1": "{not-json" });
  assert.deepEqual(plain(malformed.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
});

test("update preserves existing identity fields while applying partial changes", () => {
  const sandbox = userContextSandbox();
  sandbox.UserContext.save({
    displayName: "Riley",
    selectedCollege: { name: "Purdue University", id: "purdue" },
    selectedMajor: { name: "Mechanical Engineering" },
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const updated = sandbox.UserContext.update({ contextConfirmed: true, preLandingComplete: true });

  assert.deepEqual(plain(updated), {
    displayName: "Riley",
    selectedCollege: { name: "Purdue University", id: "purdue" },
    selectedMajor: { name: "Mechanical Engineering" },
    contextConfirmed: true,
    preLandingComplete: true,
  });
});

test("identity helpers require both selected college and selected major names", () => {
  const sandbox = userContextSandbox();
  assert.equal(sandbox.UserContext.hasIdentity(), false);

  sandbox.UserContext.update({ selectedCollege: { name: "Boston University" } });
  assert.equal(sandbox.UserContext.hasIdentity(), false);

  sandbox.UserContext.update({ selectedMajor: { name: "Psychology" } });
  assert.equal(sandbox.UserContext.hasIdentity(), true);
  assert.equal(sandbox.UserContext.nameOr("you"), "you");

  sandbox.UserContext.update({ displayName: "  Alex  " });
  assert.equal(sandbox.UserContext.nameOr("you"), "Alex");
});

test("relatedMajorsFor prefers explicit related majors then falls back by category", () => {
  const sandbox = userContextSandbox();
  const major = {
    name: "Computer Science",
    category: "Computing",
    relatedMajors: ["Data Science", "Information Science", "Cognitive Science"],
  };

  assert.deepEqual(Array.from(sandbox.UserContext.relatedMajorsFor(major, [], 2)), [
    "Data Science",
    "Information Science",
  ]);

  const db = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "Psychology", category: "Social Science" },
  ];
  assert.deepEqual(Array.from(sandbox.UserContext.relatedMajorsFor(db[0], db, 5)), [
    "Data Science",
    "Information Science",
  ]);
});
