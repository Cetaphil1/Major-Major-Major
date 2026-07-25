const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadScoring() {
  const sandbox = {
    window: { __exports: {} },
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);

  vm.runInContext(fs.readFileSync(path.join(root, "app/data.jsx"), "utf8"), sandbox);

  const fitApp = fs.readFileSync(path.join(root, "app/fit-app.jsx"), "utf8");
  const start = fitApp.indexOf("  function dimScore");
  const end = fitApp.indexOf("  function FlowApp");
  assert.ok(start > -1 && end > start, "fit-app scoring block markers should exist");
  vm.runInContext(
    fitApp.slice(start, end) + "\nObject.assign(window.__exports, { dimScore, riskLevel, buildReport });",
    sandbox
  );

  return {
    sections: sandbox.window.SECTIONS,
    dimensions: sandbox.window.DIMENSIONS,
    ...sandbox.window.__exports,
  };
}

function answerValue(question, healthy) {
  if (question.reverse) return healthy ? 1 : 5;
  return healthy ? 5 : 1;
}

function answerSection(answers, section, healthy) {
  for (const question of section.questions) {
    answers[question.id] = answerValue(question, healthy);
  }
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("dimScore handles missing answers and reverse-scored items", () => {
  const { sections, dimScore } = loadScoring();
  const workload = sections.find((section) => section.dim === "workload");

  assert.equal(dimScore(workload, {}), null);

  const low = {};
  answerSection(low, workload, false);
  assert.equal(dimScore(workload, low), 0, "reverse workload strain should lower the healthy workload score");

  const high = {};
  answerSection(high, workload, true);
  assert.equal(dimScore(workload, high), 100, "healthy answers should produce a full workload score");
});

test("missing quiz answers default each report dimension to neutral", () => {
  const { buildReport, dimensions } = loadScoring();

  const report = plain(buildReport({ college: "Swarthmore College", major: "Political Science", intent: "exploring" }, {}));

  for (const dimension of dimensions) {
    assert.equal(report.scores[dimension.key], 55, `${dimension.key} should default to the neutral score`);
  }
  assert.equal(Number.isNaN(report.overall), false);
  assert.equal(report.student.college, "Swarthmore College");
  assert.equal(report.student.major, "Political Science");
});

test("high interest with low workload, belonging, and burnout produces high switch-risk guidance", () => {
  const { sections, buildReport } = loadScoring();
  const answers = {};

  for (const section of sections) answerSection(answers, section, true);
  for (const dim of ["workload", "belonging", "burnout"]) {
    answerSection(answers, sections.find((section) => section.dim === dim), false);
  }

  const report = plain(buildReport({
    college: "University of California, Berkeley",
    major: "Computer Science",
    stage: "Sophomore",
    intent: "switch",
    displayName: "Maya",
  }, answers));

  assert.equal(report.scores.interest, 100);
  assert.equal(report.scores.workload, 0);
  assert.equal(report.scores.belonging, 0);
  assert.equal(report.scores.burnout, 0);
  assert.equal(report.switchRisk.level, "High");
  assert.equal(report.burnoutRisk.level, "High");
  assert.match(report.verdict.lead, /^A real interest/);
  assert.match(report.verdict.body, /running well below your interest/);
  assert.ok(report.nextSteps.some((step) => /Protect recovery/.test(step.t)));
  assert.ok(report.nextSteps.some((step) => /course load/.test(step.t)));
  assert.ok(report.nextSteps.some((step) => /study group/.test(step.t)));
  assert.equal(report.betterFit[0].n, "Information Science");
});

test("stated intent nudges switch risk without exceeding clamps", () => {
  const { sections, buildReport } = loadScoring();
  const answers = {};
  for (const section of sections) answerSection(answers, section, false);

  const first = plain(buildReport({ college: "Purdue University", major: "Mechanical Engineering", intent: "first" }, answers));
  const switching = plain(buildReport({ college: "Purdue University", major: "Mechanical Engineering", intent: "switch" }, answers));

  assert.ok(switching.switchRisk.pct >= first.switchRisk.pct);
  assert.ok(switching.switchRisk.pct <= 96, "switch risk stays inside the public percentage clamp");
  assert.ok(first.burnoutRisk.pct <= 96, "burnout risk stays inside the public percentage clamp");
});
