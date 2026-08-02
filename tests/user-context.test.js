const assert = require("node:assert/strict");
const test = require("node:test");

const { makeBrowserContext, makeLocalStorage, runRepoScript } = require("./vm-helpers");

function loadUserContext(initialStorage) {
  const localStorage = makeLocalStorage(initialStorage);
  const context = makeBrowserContext({ localStorage });
  runRepoScript(context, "app/user-context.js");
  return { localStorage, UserContext: context.window.UserContext, context };
}

test("UserContext falls back to the empty shape when storage is missing or malformed", () => {
  const { UserContext } = loadUserContext({ "fbi-user-context-v1": "{bad json" });

  assert.deepEqual(JSON.parse(JSON.stringify(UserContext.load())), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
  assert.equal(UserContext.nameOr(), "you");
  assert.equal(UserContext.hasIdentity(), false);
});

test("UserContext merges partial updates without dropping saved routing state", () => {
  const { localStorage, UserContext } = loadUserContext();

  UserContext.update({
    displayName: "  Amara  ",
    selectedCollege: { name: "Spelman College", id: "001594" },
    preLandingComplete: true,
  });
  UserContext.update({
    selectedMajor: { name: "Computer Science", category: "Computer and information sciences" },
  });

  const stored = JSON.parse(localStorage.getItem(UserContext.KEY));
  assert.equal(stored.displayName, "  Amara  ");
  assert.equal(stored.selectedCollege.name, "Spelman College");
  assert.equal(stored.selectedMajor.name, "Computer Science");
  assert.equal(stored.preLandingComplete, true);
  assert.equal(UserContext.nameOr("student"), "Amara");
  assert.equal(UserContext.hasIdentity(), true);
});

test("relatedMajorsFor prefers explicit related majors and otherwise falls back by category", () => {
  const { UserContext } = loadUserContext();
  const majorDb = [
    { name: "Computer Science", category: "Computing" },
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "Biology", category: "Life sciences" },
  ];

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor(
      { name: "Computer Science", category: "Computing", relatedMajors: ["Cognitive Science", "Math"] },
      majorDb,
      1
    )),
    ["Cognitive Science"]
  );

  assert.deepEqual(
    Array.from(UserContext.relatedMajorsFor({ name: "Computer Science", category: "Computing" }, majorDb, 2)),
    ["Data Science", "Information Science"]
  );
});
