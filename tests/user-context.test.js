const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/user-context.js"), "utf8");

const defaultContext = {
  displayName: null,
  selectedCollege: null,
  selectedMajor: null,
  contextConfirmed: false,
  preLandingComplete: false,
};

function createStorage() {
  const store = new Map();
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
    clear() {
      store.clear();
    },
  };
}

function loadUserContext({ majors = [] } = {}) {
  const localStorage = createStorage();
  const sandbox = {
    localStorage,
    window: { __MAJORS: majors },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "app/user-context.js" });
  return {
    UserContext: sandbox.window.UserContext,
    localStorage,
    window: sandbox.window,
  };
}

function hostValue(value) {
  return JSON.parse(JSON.stringify(value));
}

test("loads defaults and safely recovers from malformed storage", () => {
  const { UserContext, localStorage } = loadUserContext();

  assert.deepEqual(hostValue(UserContext.load()), defaultContext);

  localStorage.setItem(UserContext.KEY, "{not json");
  assert.deepEqual(hostValue(UserContext.load()), defaultContext);
});

test("partial updates preserve identity when marking pre-landing complete", () => {
  const { UserContext } = loadUserContext();

  UserContext.update({
    displayName: "Alex",
    selectedCollege: {
      name: "Swarthmore College",
      city: "Swarthmore",
      state: "PA",
      type: "Private nonprofit",
      level: "4-year",
      id: "216287",
      isManual: false,
    },
    selectedMajor: {
      name: "Political Science",
      category: "Social Sciences",
      cipCode: "45.1001",
      isManual: false,
    },
  });
  UserContext.update({ preLandingComplete: true, contextConfirmed: true });

  const saved = hostValue(UserContext.load());
  assert.equal(saved.preLandingComplete, true);
  assert.equal(saved.contextConfirmed, true);
  assert.equal(saved.displayName, "Alex");
  assert.equal(saved.selectedCollege.name, "Swarthmore College");
  assert.equal(saved.selectedMajor.name, "Political Science");
  assert.equal(UserContext.hasIdentity(), true);
});

test("identity and display-name helpers reflect missing or trimmed context", () => {
  const { UserContext } = loadUserContext();

  UserContext.update({
    displayName: "  Alex  ",
    selectedCollege: { name: "Swarthmore College" },
    selectedMajor: { name: "Political Science" },
  });
  assert.equal(UserContext.nameOr("you"), "Alex");
  assert.equal(UserContext.hasIdentity(), true);

  UserContext.update({ displayName: null, selectedMajor: null });
  assert.equal(UserContext.nameOr("you"), "you");
  assert.equal(UserContext.hasIdentity(), false);
});

test("clear removes saved context for restart flows", () => {
  const { UserContext, localStorage } = loadUserContext();

  UserContext.update({ preLandingComplete: true });
  assert.notEqual(localStorage.getItem(UserContext.KEY), null);

  UserContext.clear();
  assert.equal(localStorage.getItem(UserContext.KEY), null);
  assert.deepEqual(hostValue(UserContext.load()), defaultContext);
});

test("relatedMajorsFor prefers curated related majors and respects the limit", () => {
  const { UserContext } = loadUserContext();

  const related = UserContext.relatedMajorsFor(
    {
      name: "Political Science",
      category: "Social Sciences",
      relatedMajors: ["Economics", "Sociology", "Public Policy"],
    },
    [],
    2,
  );

  assert.deepEqual(Array.from(related), ["Economics", "Sociology"]);
});

test("relatedMajorsFor falls back to same-category database matches", () => {
  const { UserContext } = loadUserContext({
    majors: [
      { name: "Political Science", category: "Social Sciences" },
      { name: "Economics", category: "Social Sciences" },
      { name: "Sociology", category: "Social Sciences" },
      { name: "Biology", category: "Life Sciences" },
    ],
  });

  const related = UserContext.relatedMajorsFor(
    { name: "Political Science", category: "Social Sciences" },
    null,
    2,
  );

  assert.deepEqual(Array.from(related), ["Economics", "Sociology"]);
});
