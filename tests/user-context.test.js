const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function createHarness(initialStorage = {}) {
  const storage = { ...initialStorage };
  const sandbox = {
    window: {},
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) {
        delete storage[key];
      },
    },
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "app/user-context.js"), "utf8"), sandbox);
  return { storage, UserContext: sandbox.window.UserContext, window: sandbox.window };
}

function toHost(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load falls back to the empty context when stored data is missing or malformed", () => {
  const fresh = createHarness();
  assert.deepEqual(toHost(fresh.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const malformed = createHarness({ "fbi-user-context-v1": "{not-json" });
  assert.deepEqual(toHost(malformed.UserContext.load()), toHost(malformed.UserContext.empty()));
});

test("update merges partial patches without dropping saved identity or defaults", () => {
  const { UserContext } = createHarness();

  UserContext.update({
    displayName: "Mina",
    selectedCollege: { name: "Purdue University", state: "IN", isManual: false },
    selectedMajor: { name: "Mechanical Engineering", category: "Engineering", isManual: false },
  });
  UserContext.update({ preLandingComplete: true });

  assert.deepEqual(toHost(UserContext.load()), {
    displayName: "Mina",
    selectedCollege: { name: "Purdue University", state: "IN", isManual: false },
    selectedMajor: { name: "Mechanical Engineering", category: "Engineering", isManual: false },
    contextConfirmed: false,
    preLandingComplete: true,
  });
  assert.equal(UserContext.nameOr("fallback"), "Mina");
  assert.equal(UserContext.hasIdentity(), true);
});

test("clear removes saved context and relatedMajorsFor uses explicit and category fallbacks", () => {
  const { UserContext, window } = createHarness();
  const db = [
    { name: "Computer Science", category: "Computing", relatedMajors: ["Data Science", "Cognitive Science"] },
    { name: "Information Science", category: "Computing" },
    { name: "Software Engineering", category: "Computing" },
    { name: "Political Science", category: "Social Sciences" },
  ];
  window.__MAJORS = db;

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor(db[0], db, 5)),
    ["Data Science", "Cognitive Science"],
    "explicit related majors should win"
  );
  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor(db[1], db, 2)),
    ["Computer Science", "Software Engineering"],
    "same-category fallback should exclude the selected major and respect the limit"
  );

  UserContext.update({ displayName: "Mina" });
  UserContext.clear();
  assert.equal(UserContext.nameOr("fallback"), "fallback");
  assert.equal(UserContext.hasIdentity(), false);
});
