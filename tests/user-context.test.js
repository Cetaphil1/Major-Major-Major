const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/user-context.js"), "utf8");

function toHost(value) {
  return JSON.parse(JSON.stringify(value));
}

function createUserContext() {
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
  vm.runInNewContext(source, sandbox, { filename: "app/user-context.js" });
  return { UserContext: sandbox.window.UserContext, store, window: sandbox.window };
}

test("load safely returns the empty context for missing or malformed storage", () => {
  const { UserContext, store } = createUserContext();

  assert.deepEqual(toHost(UserContext.load()), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  store.set(UserContext.KEY, "{not valid json");
  assert.deepEqual(toHost(UserContext.load()), toHost(UserContext.empty()));
});

test("update merges partial patches into the saved context", () => {
  const { UserContext, store } = createUserContext();

  UserContext.save({
    displayName: "Maya",
    selectedCollege: { name: "Swarthmore College", id: "216287" },
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });

  const next = UserContext.update({
    selectedMajor: { name: "Political Science", category: "Social Sciences" },
    preLandingComplete: true,
  });

  assert.equal(next.displayName, "Maya");
  assert.equal(next.selectedCollege.name, "Swarthmore College");
  assert.equal(next.selectedMajor.name, "Political Science");
  assert.equal(next.preLandingComplete, true);
  assert.deepEqual(JSON.parse(store.get(UserContext.KEY)), toHost(next));
});

test("name and identity helpers avoid fake data and require college plus major", () => {
  const { UserContext } = createUserContext();

  assert.equal(UserContext.nameOr("student"), "student");
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.update({ displayName: "  Jordan  " });
  assert.equal(UserContext.nameOr("student"), "Jordan");
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.update({ selectedCollege: { name: "Howard University" } });
  assert.equal(UserContext.hasIdentity(), false);

  UserContext.update({ selectedMajor: { name: "Computer Science" } });
  assert.equal(UserContext.hasIdentity(), true);
});

test("related major fallback prefers explicit data, then same-category matches", () => {
  const { UserContext, window } = createUserContext();
  const major = {
    name: "Computer Science",
    category: "Technology",
    relatedMajors: ["Data Science", "Information Systems", "Cybersecurity"],
  };

  assert.deepEqual(Array.from(UserContext.relatedMajorsFor(major, [], 2)), ["Data Science", "Information Systems"]);

  window.__MAJORS = [
    { name: "Computer Science", category: "Technology" },
    { name: "Data Science", category: "Technology" },
    { name: "Information Systems", category: "Technology" },
    { name: "Political Science", category: "Social Sciences" },
  ];

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Technology" }, null, 2)),
    ["Data Science", "Information Systems"],
  );
  assert.deepEqual(Array.from(UserContext.relatedMajorsFor({ name: "Undeclared" }, window.__MAJORS, 2)), []);
});
