const assert = require("node:assert/strict");
const test = require("node:test");

const { makeBrowserContext, makeLocalStorage, runRepoScript } = require("./vm-helpers");

function loadUserContext(initialStorage = {}) {
  const localStorage = makeLocalStorage(initialStorage);
  const context = makeBrowserContext({ localStorage });
  runRepoScript(context, "app/user-context.js");
  return { UserContext: context.window.UserContext, localStorage };
}

test("UserContext falls back to an empty context when localStorage is malformed", () => {
  const { UserContext } = loadUserContext({ "fbi-user-context-v1": "{not-json" });

  assert.deepEqual(UserContext.load(), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
  assert.equal(UserContext.nameOr("friend"), "friend");
  assert.equal(UserContext.hasIdentity(), false);
});

test("UserContext partial updates preserve existing identity fields", () => {
  const { UserContext, localStorage } = loadUserContext();

  UserContext.update({
    displayName: "  Sam  ",
    selectedCollege: { name: "Howard University", id: "hu", isManual: false },
  });
  UserContext.update({
    selectedMajor: { name: "Psychology", category: "Social Sciences", relatedMajors: ["Sociology"] },
  });

  const saved = JSON.parse(localStorage.snapshot()[UserContext.KEY]);
  assert.equal(saved.displayName, "  Sam  ");
  assert.equal(saved.selectedCollege.name, "Howard University");
  assert.equal(saved.selectedMajor.name, "Psychology");
  assert.equal(UserContext.nameOr("friend"), "Sam");
  assert.equal(UserContext.hasIdentity(), true);
});

test("UserContext related majors prefer explicit data and otherwise fall back to category peers", () => {
  const { UserContext } = loadUserContext();
  const major = { name: "Data Science", category: "Computing", relatedMajors: ["Statistics", "Computer Science"] };
  const db = [
    major,
    { name: "Information Science", category: "Computing" },
    { name: "Economics", category: "Social Sciences" },
    { name: "Cybersecurity", category: "Computing" },
  ];

  assert.deepEqual(UserContext.relatedMajorsFor(major, db, 1), ["Statistics"]);
  assert.deepEqual(
    UserContext.relatedMajorsFor({ name: "Data Science", category: "Computing" }, db, 3),
    ["Information Science", "Cybersecurity"]
  );
});
