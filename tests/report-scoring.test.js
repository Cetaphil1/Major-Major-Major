const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function scoringSandbox() {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("app/data.jsx"), sandbox, { filename: "app/data.jsx" });

  const fitApp = read("app/fit-app.jsx");
  const scoringStart = fitApp.indexOf("  function dimScore");
  const controllerStart = fitApp.indexOf("  // \u2500\u2500 controller", scoringStart);
  assert.notEqual(scoringStart, -1, "expected scoring block in fit-app.jsx");
  assert.notEqual(controllerStart, -1, "expected controller block in fit-app.jsx");

  const scoringOnly = fitApp.slice(scoringStart, controllerStart);
  vm.runInContext(`${scoringOnly}\nwindow.__scoring = { dimScore, riskLevel, buildReport };`, sandbox, {
    filename: "app/fit-app.scoring.js",
  });
  return sandbox;
}

function healthyAnswer(question) {
  return question.reverse ? 1 : 5;
}

function strainedAnswer(question) {
  return question.reverse ? 5 : 1;
}

function answersFor(sectionModes) {
  const sandbox = scoringSandbox();
  const answers = {};
  sandbox.SECTIONS.forEach((section) => {
    const mode = sectionModes[section.dim] || "neutral";
    section.questions.forEach((question) => {
      if (mode === "healthy") answers[question.id] = healthyAnswer(question);
      else if (mode === "strained") answers[question.id] = strainedAnswer(question);
      else answers[question.id] = 3;
    });
  });
  return answers;
}

test("dimScore honors reverse-scored items and ignores missing answers", () => {
  const { __scoring } = scoringSandbox();
  const section = {
    questions: [
      { id: "plain" },
      { id: "reverse", reverse: true },
      { id: "missing" },
    ],
  };

  assert.equal(__scoring.dimScore(section, { plain: 5, reverse: 1 }), 100);
  assert.equal(__scoring.dimScore(section, { plain: 5, reverse: 5 }), 50);
  assert.equal(__scoring.dimScore(section, {}), null);
});

test("buildReport treats unanswered dimensions as neutral defaults", () => {
  const { __scoring } = scoringSandbox();
  const report = __scoring.buildReport({
    college: "Purdue University",
    major: "Mechanical Engineering",
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
  assert.equal(report.student.college, "Purdue University");
  assert.equal(report.student.major, "Mechanical Engineering");
  assert.equal(report.student.intent, "first");
});

test("high interest plus strained workload and burnout yields high switch guidance", () => {
  const { __scoring } = scoringSandbox();
  const answers = answersFor({
    interest: "healthy",
    confidence: "healthy",
    workload: "strained",
    motivation: "strained",
    career: "healthy",
    school: "strained",
    belonging: "strained",
    burnout: "strained",
  });

  const report = __scoring.buildReport({
    college: "University of California, Berkeley",
    major: "Computer Science",
    stage: "Sophomore",
    intent: "switch",
    displayName: "Sam",
  }, answers);

  assert.equal(report.scores.interest, 100);
  assert.equal(report.scores.workload, 0);
  assert.equal(report.scores.burnout, 0);
  assert.equal(report.switchRisk.level, "High");
  assert.equal(report.switchRisk.pct, 96);
  assert.equal(report.burnoutRisk.level, "High");
  assert.equal(report.verdict.lead, "A real interest \u2014");
  assert.equal(report.verdict.accent, "running on a draining term.");
  assert.match(report.verdict.body, /well below your interest/);
  assert.ok(report.warningSigns.includes("dreading work you used to enjoy"));
  assert.ok(report.nextSteps.some((step) => /Protect recovery/.test(step.t)));
});

test("stated intent nudges switch risk without changing raw dimension scores", () => {
  const { __scoring } = scoringSandbox();
  const ctx = { college: "Boston University", major: "Psychology" };
  const first = __scoring.buildReport({ ...ctx, intent: "first" }, {});
  const exploring = __scoring.buildReport({ ...ctx, intent: "exploring" }, {});
  const switching = __scoring.buildReport({ ...ctx, intent: "switch" }, {});

  assert.deepEqual(first.scores, exploring.scores);
  assert.deepEqual(first.scores, switching.scores);
  assert.equal(exploring.switchRisk.pct - first.switchRisk.pct, 3);
  assert.equal(switching.switchRisk.pct - first.switchRisk.pct, 8);
});
