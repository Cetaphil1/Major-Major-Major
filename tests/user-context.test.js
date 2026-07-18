const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/user-context.js"), "utf8");
const key = "fbi-user-context-v1";

function makeLocalStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));
  return {
    getItem(name) {
      return store.has(name) ? store.get(name) : null;
    },
    setItem(name, value) {
      store.set(name, String(value));
    },
    removeItem(name) {
      store.delete(name);
    },
    readJson(name) {
      const raw = store.get(name);
      return raw ? JSON.parse(raw) : null;
    },
    has(name) {
      return store.has(name);
    },
  };
}

function loadUserContext(initialEntries) {
  const localStorage = makeLocalStorage(initialEntries);
  const sandbox = {
    localStorage,
    window: {},
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "app/user-context.js" });
  return { UserContext: sandbox.window.UserContext, localStorage, window: sandbox.window };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load recovers to an empty context when storage is missing or malformed", () => {
  const missing = loadUserContext();
  assert.deepEqual(plain(missing.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const malformed = loadUserContext({ [key]: "{not-json" });
  assert.deepEqual(plain(malformed.UserContext.load()), plain(missing.UserContext.empty()));
});

test("update merges partial context and persists the full flow state", () => {
  const initial = {
    displayName: "  Ada  ",
    selectedCollege: { name: "Howard University", id: 131520 },
    contextConfirmed: false,
  };
  const { UserContext, localStorage } = loadUserContext({ [key]: JSON.stringify(initial) });

  const next = UserContext.update({
    selectedMajor: { name: "Computer Science", category: "STEM" },
    preLandingComplete: true,
  });

  assert.deepEqual(plain(next), {
    displayName: "  Ada  ",
    selectedCollege: { name: "Howard University", id: 131520 },
    selectedMajor: { name: "Computer Science", category: "STEM" },
    contextConfirmed: false,
    preLandingComplete: true,
  });
  assert.deepEqual(localStorage.readJson(key), plain(next));
  assert.equal(UserContext.nameOr("student"), "Ada");
  assert.equal(UserContext.hasIdentity(), true);
});

test("identity helpers are honest about missing names and clearing storage", () => {
  const { UserContext, localStorage } = loadUserContext({
    [key]: JSON.stringify({
      displayName: "   ",
      selectedCollege: { name: "Spelman College" },
      selectedMajor: null,
      contextConfirmed: true,
      preLandingComplete: true,
    }),
  });

  assert.equal(UserContext.nameOr("friend"), "friend");
  assert.equal(UserContext.nameOr(), "you");
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.clear();
  assert.equal(localStorage.has(key), false);
});

test("relatedMajorsFor prefers explicit related majors and falls back by category", () => {
  const { UserContext, window } = loadUserContext();
  window.__MAJORS = [
    { name: "Computer Science", category: "Technology" },
    { name: "Data Science", category: "Technology" },
    { name: "Information Systems", category: "Technology" },
    { name: "Political Science", category: "Social Sciences" },
  ];

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Economics", relatedMajors: ["Finance", "Accounting"] }, [], 1)),
    ["Finance"],
  );
  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Technology" }, null, 3)),
    ["Data Science", "Information Systems"],
  );
  assert.deepEqual(Array.from(UserContext.relatedMajorsFor({ name: "Undeclared" }, null, 3)), []);
});
