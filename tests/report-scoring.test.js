const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");

const { createBrowserSandbox, readRepoFile, runScript } = require("./vm-helpers");

function loadScoring() {
  const sandbox = createBrowserSandbox();
  runScript("app/data.jsx", sandbox);

  const source = readRepoFile("app/fit-app.jsx");
  const start = source.indexOf("function dimScore");
  const end = source.indexOf("  // \u2500\u2500 controller");
  assert.notEqual(start, -1, "scoring block should start at dimScore");
  assert.notEqual(end, -1, "scoring block should end before controller");

  vm.runInNewContext(
    [
      source.slice(start, end),
      "Object.assign(window, { dimScore, riskLevel, buildReport });",
    ].join("\n"),
    sandbox,
    { filename: "app/fit-app.jsx#scoring" },
  );

  return sandbox;
}

function answerAll(section, value, answers) {
  for (const question of section.questions) {
    answers[question.id] = value;
  }
}

test("dimScore ignores unanswered items and reverses risk-worded answers", () => {
  const sandbox = loadScoring();
  const confidence = sandbox.SECTIONS.find((section) => section.dim === "confidence");

  assert.equal(sandbox.dimScore(confidence, {}), null);
  assert.equal(sandbox.dimScore(confidence, { con_1: 5, con_3: 5 }), 50);
  assert.equal(sandbox.dimScore(confidence, { con_1: 5, con_2: 5, con_3: 1 }), 100);
});

test("buildReport defaults unanswered dimensions to neutral scores", () => {
  const sandbox = loadScoring();
  const report = sandbox.buildReport({
    college: "Swarthmore College",
    major: "Political Science",
    intent: "first",
  }, {});

  for (const dimension of sandbox.DIMENSIONS) {
    assert.equal(report.scores[dimension.key], 55);
  }
  assert.equal(report.overall, 55);
  assert.equal(report.switchRisk.pct, 45);
  assert.equal(report.switchRisk.level, "Moderate");
});

test("high interest with draining workload and burnout produces high switch-risk guidance", () => {
  const sandbox = loadScoring();
  const answers = {};

  for (const section of sandbox.SECTIONS) {
    if (section.dim === "interest" || section.dim === "career") {
      for (const question of section.questions) {
        answers[question.id] = question.reverse ? 1 : 5;
      }
    } else if (section.dim === "confidence") {
      for (const question of section.questions) {
        answers[question.id] = question.reverse ? 2 : 4;
      }
    } else {
      for (const question of section.questions) {
        answers[question.id] = question.reverse ? 5 : 1;
      }
    }
  }

  const report = sandbox.buildReport({
    college: "University of California, Berkeley",
    major: "Computer Science",
    intent: "switch",
  }, answers);

  assert.equal(report.scores.interest, 100);
  assert.equal(report.scores.workload, 0);
  assert.equal(report.scores.burnout, 0);
  assert.equal(report.switchRisk.level, "High");
  assert.ok(report.switchRisk.pct >= 90);
  assert.equal(report.burnoutRisk.level, "High");
  assert.match(report.verdict.lead, /A real interest/);
  assert.match(report.diagnosis, /pace and volume, not the subject/);
  assert.ok(report.nextSteps.some((step) => /advisor/.test(step.t)));
  assert.ok(report.nextSteps.some((step) => /study group/.test(step.t)));
});

test("switch and burnout risk percentages are clamped to display-safe bounds", () => {
  const sandbox = loadScoring();
  const answers = {};

  for (const section of sandbox.SECTIONS) {
    answerAll(section, 1, answers);
    for (const question of section.questions) {
      if (question.reverse) answers[question.id] = 5;
    }
  }

  const report = sandbox.buildReport({
    college: "State University",
    major: "Unknown Major",
    intent: "switch",
  }, answers);

  assert.equal(report.switchRisk.pct, 96);
  assert.equal(report.burnoutRisk.pct, 96);
  assert.deepEqual(
    Array.from(report.betterFit, (fit) => fit.n),
    ["An adjacent applied field", "A broader version of this field", "A more hands-on track"],
  );
});
