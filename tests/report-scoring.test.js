const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function loadScoring() {
  const sandbox = { console, window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read("app/data.jsx"), sandbox, { filename: "app/data.jsx" });

  const fitApp = read("app/fit-app.jsx");
  const start = fitApp.indexOf("  function dimScore");
  const end = fitApp.indexOf("  // \u2500\u2500 controller");
  assert.notEqual(start, -1, "dimScore block should be present");
  assert.notEqual(end, -1, "controller boundary should be present");

  const scoringBlock = `${fitApp.slice(start, end)}
Object.assign(window, { dimScore, riskLevel, buildReport });`;
  vm.runInContext(scoringBlock, sandbox, { filename: "app/fit-app.scoring.jsx" });
  return sandbox.window;
}

function answersFor(valueByPrefix) {
  const answers = {};
  const sections = loadScoring().SECTIONS;
  for (const section of sections) {
    const fallback = valueByPrefix.default || 3;
    for (const question of section.questions) {
      const prefix = question.id.split("_")[0];
      answers[question.id] = valueByPrefix[prefix] || fallback;
    }
  }
  return answers;
}

test("missing section answers default to neutral scores in reports", () => {
  const { buildReport } = loadScoring();
  const report = buildReport(
    { college: "Swarthmore College", major: "Political Science", intent: "first" },
    {},
  );

  assert.equal(report.scores.interest, 55);
  assert.equal(report.scores.workload, 55);
  assert.equal(report.scores.burnout, 55);
  assert.equal(report.switchRisk.level, "Moderate");
  assert.equal(report.student.college, "Swarthmore College");
  assert.equal(report.student.major, "Political Science");
});

test("high interest with exhausted workload produces high switch-risk guidance", () => {
  const { buildReport } = loadScoring();
  const answers = answersFor({
    default: 4,
    int: 5,
    wl: 1,
    bel: 1,
    bo: 5,
  });
  answers.wl_2 = 5;
  answers.bel_3 = 5;
  answers.bo_3 = 1;

  const report = buildReport(
    { college: "University of Michigan", major: "Computer Science", intent: "switch" },
    answers,
  );

  assert.equal(report.scores.interest, 100);
  assert.equal(report.scores.workload, 0);
  assert.equal(report.scores.belonging, 0);
  assert.equal(report.scores.burnout, 0);
  assert.equal(report.switchRisk.level, "High");
  assert.equal(report.switchRisk.pct, 96);
  assert.match(report.verdict.lead, /real interest/i);
  assert.match(report.diagnosis, /pace and volume/i);
  assert.ok(report.nextSteps.some((step) => /course load/i.test(step.t)));
});
