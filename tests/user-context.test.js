const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

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
    dump() {
      return Object.fromEntries(store);
    },
  };
}

function loadUserContext(initialStorage = {}) {
  const localStorage = createStorage(initialStorage);
  const context = {
    localStorage,
    window: {
      __MAJORS: [
        { name: "Computer Science", category: "Engineering", relatedMajors: ["Data Science", "Information Science"] },
        { name: "Mechanical Engineering", category: "Engineering" },
        { name: "Civil Engineering", category: "Engineering" },
        { name: "History", category: "Humanities" },
      ],
    },
  };
  context.window.localStorage = localStorage;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "app/user-context.js"), "utf8"), context);
  return { UserContext: context.window.UserContext, localStorage };
}

function host(value) {
  return JSON.parse(JSON.stringify(value));
}

test("load recovers from missing and malformed storage with the empty context shape", () => {
  const { UserContext } = loadUserContext();
  assert.deepEqual(host(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const malformed = loadUserContext({ "fbi-user-context-v1": "{not json" });
  assert.deepEqual(host(malformed.UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
});

test("update merges partial patches, preserves identity, and clear removes persisted context", () => {
  const { UserContext, localStorage } = loadUserContext();

  UserContext.update({
    displayName: "  Maya  ",
    selectedCollege: { name: "UCLA", id: "ucla" },
  });
  UserContext.update({
    selectedMajor: { name: "Computer Science", category: "Engineering" },
    preLandingComplete: true,
  });

  assert.deepEqual(host(UserContext.load()), {
    displayName: "  Maya  ",
    selectedCollege: { name: "UCLA", id: "ucla" },
    selectedMajor: { name: "Computer Science", category: "Engineering" },
    contextConfirmed: false,
    preLandingComplete: true,
  });
  assert.equal(UserContext.nameOr("friend"), "Maya");
  assert.equal(UserContext.hasIdentity(), true);

  const saved = JSON.parse(localStorage.dump()[UserContext.KEY]);
  assert.equal(saved.preLandingComplete, true);

  UserContext.clear();
  assert.equal(localStorage.getItem(UserContext.KEY), null);
});

test("name and identity helpers fall back honestly when saved context is partial", () => {
  const { UserContext } = loadUserContext({
    "fbi-user-context-v1": JSON.stringify({
      displayName: "   ",
      selectedCollege: { name: "UCLA" },
      selectedMajor: null,
    }),
  });

  assert.equal(UserContext.nameOr("friend"), "friend");
  assert.equal(UserContext.nameOr(), "you");
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.update({ selectedMajor: { name: "History" } });
  assert.equal(UserContext.hasIdentity(), true);
});

test("relatedMajorsFor prefers explicit related majors and otherwise falls back by category", () => {
  const { UserContext } = loadUserContext();

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({
      name: "Computer Science",
      category: "Engineering",
      relatedMajors: ["Data Science", "Information Science", "Software Engineering"],
    }, null, 2)),
    ["Data Science", "Information Science"],
  );

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Engineering" }, null, 3)),
    ["Mechanical Engineering", "Civil Engineering"],
  );

  assert.deepEqual(Array.from(UserContext.relatedMajorsFor({ name: "Undeclared" }, null, 3)), []);
});
