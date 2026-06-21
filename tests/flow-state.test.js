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
  for (let i = bodyStart; i < source.length; i++) {
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
  return Object.assign({
    displayName: "Alex",
    selectedCollege: {
      id: "school-a",
      name: "School A",
    },
    selectedMajor: {
      cipCode: "11.0101",
      name: "Computer Science",
    },
  }, overrides || {});
}

function flowContext(overrides) {
  return Object.assign({
    displayName: "Alex",
    college: "School A",
    collegeMeta: { id: "school-a" },
    major: "Computer Science",
    majorMeta: { cipCode: "11.0101" },
  }, overrides || {});
}

test("saved survey state is reused for the same identity", () => {
  const identityKey = identityKeyFromUserContext(userContext());
  const saved = {
    identityKey,
    phase: "report",
    ctx: flowContext(),
    answers: { interest_1: 5 },
  };

  assert.equal(savedForIdentity(saved, identityKey), saved);
});

test("legacy saved survey state is reused only when its context matches", () => {
  const identityKey = identityKeyFromUserContext(userContext());
  const legacySaved = {
    phase: "report",
    ctx: flowContext(),
    answers: { interest_1: 5 },
  };

  assert.equal(identityKeyFromContext(legacySaved.ctx), identityKey);
  assert.equal(savedForIdentity(legacySaved, identityKey), legacySaved);
});

test("saved report state is ignored after a shared-device user change", () => {
  const alexKey = identityKeyFromUserContext(userContext());
  const bobKey = identityKeyFromUserContext(userContext({ displayName: "Bob" }));
  const saved = {
    identityKey: alexKey,
    phase: "report",
    ctx: flowContext(),
    answers: { interest_1: 5 },
  };

  assert.equal(savedForIdentity(saved, bobKey), null);
});

test("saved report state is ignored after college or major changes", () => {
  const identityKey = identityKeyFromUserContext(userContext());
  const saved = {
    identityKey,
    phase: "report",
    ctx: flowContext(),
    answers: { interest_1: 5 },
  };

  const changedCollege = identityKeyFromUserContext(userContext({
    selectedCollege: { id: "school-b", name: "School B" },
  }));
  const changedMajor = identityKeyFromUserContext(userContext({
    selectedMajor: { cipCode: "45.1001", name: "Political Science" },
  }));

  assert.equal(savedForIdentity(saved, changedCollege), null);
  assert.equal(savedForIdentity(saved, changedMajor), null);
});
