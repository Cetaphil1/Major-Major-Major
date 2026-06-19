const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = join(__dirname, "..");

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
  };
}

function loadUserContext(initialStorage) {
  const context = {
    localStorage: createStorage(initialStorage),
    window: {},
  };
  context.window.localStorage = context.localStorage;
  vm.createContext(context);
  vm.runInContext(readFileSync(join(root, "app/user-context.js"), "utf8"), context);
  return context;
}

test("load returns safe defaults for missing or malformed saved context", () => {
  const emptyContext = loadUserContext();
  assert.deepEqual(emptyContext.window.UserContext.load(), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const malformedContext = loadUserContext({ "fbi-user-context-v1": "not json" });
  assert.deepEqual(malformedContext.window.UserContext.load(), emptyContext.window.UserContext.empty());
});

test("update merges partial changes without dropping existing flow state", () => {
  const { window } = loadUserContext({
    "fbi-user-context-v1": JSON.stringify({
      displayName: "Mia",
      selectedCollege: { name: "Howard University" },
      selectedMajor: { name: "Computer Science" },
      preLandingComplete: true,
    }),
  });

  const updated = window.UserContext.update({ contextConfirmed: true });

  assert.equal(updated.displayName, "Mia");
  assert.equal(updated.selectedCollege.name, "Howard University");
  assert.equal(updated.selectedMajor.name, "Computer Science");
  assert.equal(updated.preLandingComplete, true);
  assert.equal(updated.contextConfirmed, true);
});

test("identity and related-major helpers require real saved names", () => {
  const { window } = loadUserContext();

  assert.equal(window.UserContext.hasIdentity(), false);
  window.UserContext.update({
    selectedCollege: { name: "Spelman College" },
    selectedMajor: { name: "Political Science" },
  });
  assert.equal(window.UserContext.hasIdentity(), true);

  assert.deepEqual(
    Array.from(window.UserContext.relatedMajorsFor(
      { name: "Political Science", relatedMajors: ["Public Policy", "Economics"] },
      [],
      1
    )),
    ["Public Policy"]
  );
  assert.deepEqual(
    Array.from(window.UserContext.relatedMajorsFor(
      { name: "Political Science", category: "Social Sciences" },
      [
        { name: "Political Science", category: "Social Sciences" },
        { name: "Economics", category: "Social Sciences" },
        { name: "Nursing", category: "Health" },
        { name: "Sociology", category: "Social Sciences" },
      ],
      2
    )),
    ["Economics", "Sociology"]
  );
});
