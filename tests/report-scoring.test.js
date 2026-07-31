const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadScoring() {
  const dataSource = fs.readFileSync(path.join(ROOT, "app/data.jsx"), "utf8");
  const appSource = fs.readFileSync(path.join(ROOT, "app/fit-app.jsx"), "utf8");
  const scoringStart = appSource.indexOf("function dimScore");
  const scoringEnd = appSource.indexOf("  // \u2500\u2500 controller", scoringStart);

  assert.notEqual(scoringStart, -1, "dimScore block should be present");
  assert.notEqual(scoringEnd, -1, "controller boundary should be present");

  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(dataSource, sandbox, { filename: "app/data.jsx" });
  vm.runInContext(
    `${appSource.slice(scoringStart, scoringEnd)}
     Object.assign(window, { dimScore, riskLevel, buildReport, betterFitFor });`,
    sandbox,
    { filename: "app/fit-app.scoring.js" },
  );
  return sandbox;
}

function answerAllHealthy(SECTIONS) {
  const answers = {};
  for (const section of SECTIONS) {
    for (const question of section.questions) {
      answers[question.id] = question.reverse ? 1 : 5;
    }
  }
  return answers;
}

function setSection(SECTIONS, answers, dim, healthy) {
  const section = SECTIONS.find((item) => item.dim === dim);
  assert.ok(section, `section ${dim} should exist`);
  for (const question of section.questions) {
    answers[question.id] = healthy
      ? (question.reverse ? 1 : 5)
      : (question.reverse ? 5 : 1);
  }
}

test("dimScore flips reverse-scored answers before averaging", () => {
  const { SECTIONS, dimScore } = loadScoring();
  const confidence = SECTIONS.find((section) => section.dim === "confidence");

  assert.equal(dimScore(confidence, { con_1: 5, con_2: 5, con_3: 1 }), 100);
  assert.equal(dimScore(confidence, { con_1: 5, con_2: 5, con_3: 5 }), 67);
  assert.equal(dimScore(confidence, {}), null);
});

test("buildReport defaults unanswered dimensions to neutral scores", () => {
  const { buildReport } = loadScoring();

  const report = buildReport(
    { college: "Swarthmore College", major: "Political Science", intent: "switch" },
    {},
  );

  assert.deepEqual(Object.values(report.scores), [55, 55, 55, 55, 55, 55, 55, 55]);
  assert.equal(report.overall, 55);
  assert.equal(report.switchRisk.pct, 53);
  assert.equal(report.switchRisk.level, "Elevated");
});

test("high interest with low workload and burnout reports switch risk cause", () => {
  const { SECTIONS, buildReport } = loadScoring();
  const answers = answerAllHealthy(SECTIONS);
  setSection(SECTIONS, answers, "workload", false);
  setSection(SECTIONS, answers, "burnout", false);
  setSection(SECTIONS, answers, "belonging", false);

  const report = buildReport(
    { college: "UC Berkeley", major: "Computer Science", intent: "switch", displayName: "Maya" },
    answers,
  );

  assert.equal(report.scores.interest, 100);
  assert.equal(report.scores.workload, 0);
  assert.equal(report.scores.burnout, 0);
  assert.equal(report.switchRisk.level, "High");
  assert.equal(report.bottomLine.head, "Decision point");
  assert.match(report.verdict.lead, /A real interest/);
  assert.match(report.verdict.body, /quietly switch out/);
  assert.match(report.diagnosis, /pace and volume, not the subject/);
  assert.ok(report.warningSigns.includes("dreading work you used to enjoy"));
});

test("switch-risk percentages are clamped at both ends", () => {
  const { SECTIONS, buildReport } = loadScoring();
  const healthyAnswers = answerAllHealthy(SECTIONS);
  const unhealthyAnswers = answerAllHealthy(SECTIONS);

  for (const section of SECTIONS) {
    setSection(SECTIONS, unhealthyAnswers, section.dim, false);
  }

  const lowRisk = buildReport(
    { college: "Purdue University", major: "Mechanical Engineering", intent: "first" },
    healthyAnswers,
  );
  const highRisk = buildReport(
    { college: "Purdue University", major: "Mechanical Engineering", intent: "switch" },
    unhealthyAnswers,
  );

  assert.equal(lowRisk.switchRisk.pct, 4);
  assert.equal(lowRisk.switchRisk.level, "Low");
  assert.equal(highRisk.switchRisk.pct, 96);
  assert.equal(highRisk.switchRisk.level, "High");
});
