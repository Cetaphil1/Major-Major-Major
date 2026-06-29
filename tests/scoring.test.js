const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function loadScoring() {
  const context = {
    console,
    window: null,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    React: { useState: () => {}, useEffect: () => {} },
    ReactDOM: { createRoot: () => ({ render: () => {} }) },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read("app/data.jsx"), context, { filename: "app/data.jsx" });

  const fitApp = read("app/fit-app.jsx");
  const scoringOnly = `${fitApp.split("  // ── controller")[0]}
  window.__FitScoring = { dimScore, riskLevel, betterFitFor, buildReport };
})();`;
  vm.runInContext(scoringOnly, context, { filename: "app/fit-app.jsx" });
  return context;
}

function healthyAnswers(sections) {
  const answers = {};
  for (const section of sections) {
    for (const question of section.questions) {
      answers[question.id] = question.reverse ? 1 : 5;
    }
  }
  return answers;
}

function unhealthyAnswers(sections) {
  const answers = {};
  for (const section of sections) {
    for (const question of section.questions) {
      answers[question.id] = question.reverse ? 5 : 1;
    }
  }
  return answers;
}

describe("fit scoring", () => {
  it("reverse-scores negatively worded items before calculating a dimension", () => {
    const ctx = loadScoring();
    const confidence = ctx.SECTIONS.find((section) => section.dim === "confidence");

    assert.equal(ctx.__FitScoring.dimScore(confidence, { con_1: 5, con_2: 5, con_3: 1 }), 100);
    assert.equal(ctx.__FitScoring.dimScore(confidence, { con_1: 5, con_2: 5, con_3: 5 }), 67);
    assert.equal(ctx.__FitScoring.dimScore(confidence, {}), null);
  });

  it("defaults unanswered dimensions to neutral scores instead of crashing reports", () => {
    const ctx = loadScoring();
    const report = ctx.__FitScoring.buildReport({
      college: "Swarthmore College",
      major: "Political Science",
      intent: "first",
    }, {});

    assert.deepEqual(JSON.parse(JSON.stringify(report.scores)), {
      interest: 55,
      confidence: 55,
      workload: 55,
      motivation: 55,
      career: 55,
      school: 55,
      belonging: 55,
      burnout: 55,
    });
    assert.equal(report.overall, 55);
    assert.deepEqual(JSON.parse(JSON.stringify(report.switchRisk)), { level: "Moderate", pct: 45, tone: "warn" });
    assert.deepEqual(JSON.parse(JSON.stringify(report.burnoutRisk)), { level: "Moderate", pct: 45, tone: "warn" });
  });

  it("keeps high-fit answers low risk and low-fit switch intent high risk", () => {
    const ctx = loadScoring();
    const high = ctx.__FitScoring.buildReport({
      college: "Swarthmore College",
      major: "Political Science",
      intent: "first",
    }, healthyAnswers(ctx.SECTIONS));
    const low = ctx.__FitScoring.buildReport({
      college: "Swarthmore College",
      major: "Political Science",
      intent: "switch",
    }, unhealthyAnswers(ctx.SECTIONS));

    assert.equal(high.overall, 100);
    assert.equal(high.overallLabel, "Strong fit");
    assert.deepEqual(JSON.parse(JSON.stringify(high.switchRisk)), { level: "Low", pct: 4, tone: "good" });
    assert.deepEqual(JSON.parse(JSON.stringify(high.burnoutRisk)), { level: "Low", pct: 4, tone: "good" });

    assert.equal(low.overall, 0);
    assert.equal(low.overallLabel, "Poor fit");
    assert.deepEqual(JSON.parse(JSON.stringify(low.switchRisk)), { level: "High", pct: 96, tone: "risk" });
    assert.deepEqual(JSON.parse(JSON.stringify(low.burnoutRisk)), { level: "High", pct: 96, tone: "risk" });
  });

  it("applies switch and exploring intent nudges without exceeding risk bounds", () => {
    const ctx = loadScoring();
    const answers = healthyAnswers(ctx.SECTIONS);
    const first = ctx.__FitScoring.buildReport({ college: "Swarthmore College", major: "Political Science", intent: "first" }, answers);
    const exploring = ctx.__FitScoring.buildReport({ college: "Swarthmore College", major: "Political Science", intent: "exploring" }, answers);
    const switching = ctx.__FitScoring.buildReport({ college: "Swarthmore College", major: "Political Science", intent: "switch" }, answers);

    assert.equal(first.switchRisk.pct, 4);
    assert.equal(exploring.switchRisk.pct, 4);
    assert.equal(switching.switchRisk.pct, 8);
  });

  it("preserves documented risk thresholds", () => {
    const ctx = loadScoring();

    assert.deepEqual(JSON.parse(JSON.stringify(ctx.__FitScoring.riskLevel(29))), { level: "Low", tone: "good" });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.__FitScoring.riskLevel(30))), { level: "Moderate", tone: "warn" });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.__FitScoring.riskLevel(46))), { level: "Elevated", tone: "warn" });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.__FitScoring.riskLevel(62))), { level: "High", tone: "risk" });
  });
});
