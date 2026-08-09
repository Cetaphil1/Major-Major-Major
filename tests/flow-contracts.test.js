const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

async function read(relPath) {
  return fs.readFile(path.join(ROOT, relPath), "utf8");
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), (m) => m[1]);
}

function assertOrder(items, expected, label) {
  const indexes = expected.map((item) => items.indexOf(item));
  indexes.forEach((idx, i) => {
    assert.notEqual(idx, -1, `${label} is missing ${expected[i]}`);
  });
  for (let i = 1; i < indexes.length; i += 1) {
    assert.ok(indexes[i - 1] < indexes[i], `${label} should load ${expected[i - 1]} before ${expected[i]}`);
  }
}

async function htmlFiles(dir) {
  const out = [];
  async function walk(abs) {
    const entries = await fs.readdir(abs, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(abs, entry.name);
      if (entry.isDirectory()) await walk(entryPath);
      else if (entry.isFile() && entry.name.endsWith(".html")) out.push(path.relative(ROOT, entryPath));
    }
  }
  await walk(path.join(ROOT, dir));
  return out.sort();
}

test("start and survey pages load shared state before React flow scripts", async () => {
  const start = await read("start.html");
  assertOrder(scriptSrcs(start), [
    "app/user-context.js",
    "app/college-snapshots.js",
    "https://unpkg.com/react@18.3.1/umd/react.development.js",
    "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js",
    "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
    "app/data.jsx",
    "app/screens-context.jsx",
    "app/prelanding.jsx",
  ], "start.html");

  const survey = await read("survey.html");
  assertOrder(scriptSrcs(survey), [
    "app/user-context.js",
    "app/research-data.js",
    "https://unpkg.com/react@18.3.1/umd/react.development.js",
    "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js",
    "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
    "app/data.jsx",
    "app/primitives.jsx",
    "app/screens-context.jsx",
    "app/screens-quiz.jsx",
    "app/research.jsx",
    "app/screens-report.jsx",
    "app/fit-app.jsx",
  ], "survey.html");
});

test("pre-landing completion persists context before routing to research", async () => {
  const prelanding = await read("app/prelanding.jsx");

  assert.match(prelanding, /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/);
  assert.match(prelanding, /const skipIntro = \(\) => \{\s*\/\/ honest skip:[\s\S]*?UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/);
});

test("research page marks demo data and exposes the survey handoff", async () => {
  const research = await read("research.html");

  assert.match(research, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| \{\};/);
  assert.match(research, /const college = .* \|\| "Swarthmore College";/);
  assert.match(research, /const major = .* \|\| "Political Science";/);
  assert.match(research, /<DataStatusBadge status="Preview" \/>/);
  assert.match(research, /Showing a demo pairing\./);
  assert.match(research, /href="survey\.html"[\s\S]*Take the survey/);
});

test("generated landing pages keep quiz entry links and avoid direct survey bypasses", async () => {
  const files = await htmlFiles("landing");
  assert.ok(files.length >= 18, "expected the generated landing export to include nested pages");

  const missingStart = [];
  const directBypasses = [];

  for (const file of files) {
    const html = await read(file);
    if (!html.includes("start.html")) missingStart.push(file);
    if (/(research|survey)\.html/.test(html)) directBypasses.push(file);
  }

  assert.deepEqual(missingStart, []);
  assert.deepEqual(directBypasses, []);
});

test("research article inventory keeps current slugs and retired slugs out of the export", async () => {
  const files = await htmlFiles("landing/research-page");

  assert.ok(files.includes("landing/research-page/school-effect-vs-subject-fit/index.html"));
  assert.ok(files.includes("landing/research-page/reading-belonging-and-career-clarity/index.html"));
  assert.equal(files.some((file) => file.includes("college-readiness")), false);
  assert.equal(files.some((file) => file.includes("faculty-excellence")), false);
});
