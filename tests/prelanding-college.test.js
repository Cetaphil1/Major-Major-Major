const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../app/prelanding.jsx"), "utf8");

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

function loadMapCollege({ colleges, selectedCollege } = {}) {
  const sandbox = {
    window: { __COLLEGES: colleges || [] },
    UC: { load: () => ({ selectedCollege: selectedCollege || null }) },
    module: { exports: {} },
  };

  vm.runInNewContext(`${extractFunction("mapCollege")}\nmodule.exports = mapCollege;`, sandbox);
  return sandbox.module.exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("mapCollege preserves structured metadata when re-editing the same saved school", () => {
  const mapCollege = loadMapCollege({
    selectedCollege: {
      name: "School A",
      city: "Austin",
      state: "TX",
      type: "Public",
      level: "4-year",
      id: "school-a",
      isManual: false,
    },
  });

  assert.deepEqual(plain(mapCollege("School A", null)), {
    name: "School A",
    city: "Austin",
    state: "TX",
    type: "Public",
    level: "4-year",
    id: "school-a",
    isManual: false,
  });
});

test("mapCollege restores structured metadata for exact college dataset matches", () => {
  const mapCollege = loadMapCollege({
    colleges: [{
      name: "School B",
      city: "Boston",
      state: "MA",
      control: "Private",
      level: "4-year",
      id: "school-b",
    }],
  });

  assert.deepEqual(plain(mapCollege("school b", null)), {
    name: "school b",
    city: "Boston",
    state: "MA",
    type: "Private",
    level: "4-year",
    id: "school-b",
    isManual: false,
  });
});

test("mapCollege still marks genuinely unknown colleges as manual entries", () => {
  const mapCollege = loadMapCollege();

  assert.deepEqual(plain(mapCollege("Unlisted School", null)), {
    name: "Unlisted School",
    isManual: true,
  });
});
