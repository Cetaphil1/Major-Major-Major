const assert = require("node:assert/strict");
const test = require("node:test");

const { createBrowserSandbox, createLocalStorage, runScript } = require("./vm-helpers");

function loadUserContext(localStorage = createLocalStorage()) {
  const sandbox = createBrowserSandbox({ localStorage });
  runScript("app/user-context.js", sandbox);
  return sandbox;
}

test("UserContext recovers from malformed persisted data", () => {
  const sandbox = loadUserContext(createLocalStorage({
    "fbi-user-context-v1": "{not valid json",
  }));

  assert.deepEqual(sandbox.UserContext.load(), {
    displayName: null,
    selectedCollege: null,
    selectedMajor: null,
    contextConfirmed: false,
    preLandingComplete: false,
  });
  assert.equal(sandbox.UserContext.nameOr("friend"), "friend");
  assert.equal(sandbox.UserContext.hasIdentity(), false);
});

test("UserContext partial updates preserve identity and gate fields", () => {
  const sandbox = loadUserContext();

  sandbox.UserContext.update({
    displayName: "  Maya  ",
    selectedCollege: { name: "Swarthmore College", id: "swarthmore-college" },
    selectedMajor: { name: "Political Science", category: "Social Sciences" },
    preLandingComplete: true,
  });
  sandbox.UserContext.update({ contextConfirmed: true });

  const saved = sandbox.UserContext.load();
  assert.equal(saved.displayName, "  Maya  ");
  assert.equal(saved.selectedCollege.name, "Swarthmore College");
  assert.equal(saved.selectedMajor.name, "Political Science");
  assert.equal(saved.preLandingComplete, true);
  assert.equal(saved.contextConfirmed, true);
  assert.equal(sandbox.UserContext.nameOr("friend"), "Maya");
  assert.equal(sandbox.UserContext.hasIdentity(), true);
});

test("UserContext builds honest related-major fallbacks by category", () => {
  const sandbox = loadUserContext();
  const major = { name: "Computer Science", category: "Computing" };
  const db = [
    major,
    { name: "Data Science", category: "Computing" },
    { name: "Information Science", category: "Computing" },
    { name: "Psychology", category: "Social Sciences" },
  ];

  assert.deepEqual(
    Array.from(sandbox.UserContext.relatedMajorsFor(major, db, 2)),
    ["Data Science", "Information Science"],
  );
  assert.deepEqual(
    Array.from(sandbox.UserContext.relatedMajorsFor({
      name: "Economics",
      category: "Social Sciences",
      relatedMajors: ["Public Policy", "Statistics", "Finance"],
    }, db, 2)),
    ["Public Policy", "Statistics"],
  );
});
