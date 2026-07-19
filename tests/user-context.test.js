const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/user-context.js"), "utf8");

function createContext() {
  const store = new Map();
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
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { sandbox, store, UserContext: sandbox.UserContext };
}

function toHost(value) {
  return JSON.parse(JSON.stringify(value));
}

test("UserContext recovers from missing or malformed localStorage", () => {
  const { store, UserContext } = createContext();

  assert.deepEqual(toHost(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  store.set(UserContext.KEY, "{bad json");
  assert.deepEqual(toHost(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
});

test("UserContext update merges partial patches and preserves saved identity", () => {
  const { UserContext } = createContext();

  UserContext.update({
    displayName: "  Shelly  ",
    selectedCollege: { name: "Swarthmore College", id: "swarthmore", isManual: false },
  });
  const updated = UserContext.update({
    selectedMajor: { name: "Political Science", category: "Social Sciences", isManual: false },
    preLandingComplete: true,
  });

  assert.equal(updated.displayName, "  Shelly  ");
  assert.equal(updated.selectedCollege.name, "Swarthmore College");
  assert.equal(updated.selectedMajor.name, "Political Science");
  assert.equal(updated.contextConfirmed, false);
  assert.equal(updated.preLandingComplete, true);
  assert.equal(UserContext.nameOr("friend"), "Shelly");
  assert.equal(UserContext.hasIdentity(), true);
});

test("UserContext detects missing identity and supports clear", () => {
  const { UserContext } = createContext();

  UserContext.update({ selectedCollege: { name: "Swarthmore College" } });
  assert.equal(UserContext.hasIdentity(), false);
  assert.equal(UserContext.nameOr("friend"), "friend");

  UserContext.clear();
  assert.deepEqual(toHost(UserContext.load()), toHost(UserContext.empty()));
});

test("UserContext relatedMajorsFor prefers curated related majors then same-category fallback", () => {
  const { UserContext } = createContext();
  const db = [
    { name: "Political Science", category: "Social Sciences", relatedMajors: ["Public Policy", "Economics"] },
    { name: "Sociology", category: "Social Sciences" },
    { name: "Anthropology", category: "Social Sciences" },
    { name: "Computer Science", category: "Engineering" },
  ];

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor(db[0], db, 1)),
    ["Public Policy"],
    "curated related majors should be preferred and capped"
  );
  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Economics", category: "Social Sciences" }, db, 2)),
    ["Political Science", "Sociology"],
    "fallback should use same-category majors without the current major"
  );
  assert.deepEqual(Array.from(UserContext.relatedMajorsFor({ name: "Undeclared" }, db, 2)), []);
});
