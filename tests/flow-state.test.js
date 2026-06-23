const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../app/fit-app.jsx"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `expected ${name} to be defined`);

  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`could not extract ${name}`);
}

const helperSource = [
  extractFunction("norm"),
  extractFunction("identityKeyFromContext"),
  extractFunction("identityKeyFromUserContext"),
  extractFunction("savedForIdentity"),
  "module.exports = { identityKeyFromContext, identityKeyFromUserContext, savedForIdentity };",
].join("\n");

const sandbox = { module: { exports: {} } };
vm.runInNewContext(helperSource, sandbox);
const {
  identityKeyFromContext,
  identityKeyFromUserContext,
  savedForIdentity,
} = sandbox.module.exports;

function userContext(overrides) {
  return {
    displayName: "Alex",
    selectedCollege: {
      id: "swarthmore",
      name: "Swarthmore College",
    },
    selectedMajor: {
      cipCode: "45.1001",
      name: "Political Science",
    },
    ...overrides,
  };
}

function flowContext(overrides) {
  return {
    displayName: "Alex",
    collegeMeta: { id: "swarthmore" },
    college: "Swarthmore College",
    majorMeta: { cipCode: "45.1001" },
    major: "Political Science",
    ...overrides,
  };
}

test("keeps saved survey state for the same identity", () => {
  const identityKey = identityKeyFromUserContext(userContext());
  const saved = {
    identityKey,
    phase: "report",
    ctx: flowContext(),
    answers: { interest_1: 5 },
  };

  assert.equal(savedForIdentity(saved, identityKey), saved);
});

test("drops saved survey state when the selected college changes", () => {
  const saved = {
    identityKey: identityKeyFromUserContext(userContext()),
    phase: "report",
    ctx: flowContext(),
    answers: { interest_1: 5 },
  };
  const changedIdentity = identityKeyFromUserContext(userContext({
    selectedCollege: { id: "mit", name: "Massachusetts Institute of Technology" },
  }));

  assert.equal(savedForIdentity(saved, changedIdentity), null);
});

test("drops legacy saved survey state when the selected major changes", () => {
  const legacySaved = {
    phase: "report",
    ctx: flowContext(),
    answers: { interest_1: 5 },
  };
  const changedIdentity = identityKeyFromUserContext(userContext({
    selectedMajor: { cipCode: "11.0701", name: "Computer Science" },
  }));

  assert.equal(savedForIdentity(legacySaved, changedIdentity), null);
});

test("normalizes casing and whitespace in identity keys", () => {
  assert.equal(
    identityKeyFromContext(flowContext({
      displayName: "  ALEX ",
      college: " swarthmore college ",
      major: " political science ",
    })),
    identityKeyFromUserContext(userContext())
  );
});
