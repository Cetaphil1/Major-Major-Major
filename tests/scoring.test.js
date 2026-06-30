const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function loadQuizData() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "app", "data.jsx"), "utf8"),
    context.window,
    { filename: "app/data.jsx" }
  );
  return {
    DIMENSIONS: context.window.DIMENSIONS,
    SECTIONS: context.window.SECTIONS,
  };
}

function loadScoring() {
  const { DIMENSIONS, SECTIONS } = loadQuizData();
  const source = fs.readFileSync(path.join(ROOT, "app", "fit-app.jsx"), "utf8");
  const start = source.indexOf("  function dimScore");
  const end = source.indexOf("  // \u2500\u2500 controller");
  assert.notEqual(start, -1, "expected dimScore block in fit-app.jsx");
  assert.notEqual(end, -1, "expected controller marker after scoring block");

  const scoringSource = source.slice(start, end);
  const factory = new Function(
    "SECTIONS",
    "DIMENSIONS",
    `${scoringSource}\nreturn { dimScore, riskLevel, buildReport };`
  );
  return { ...factory(SECTIONS, DIMENSIONS), DIMENSIONS, SECTIONS };
}

function answersFor(SECTIONS, valueForQuestion) {
  return Object.fromEntries(
    SECTIONS.flatMap((section) =>
      section.questions.map((question) => [question.id, valueForQuestion(question)])
    )
  );
}

test("dimension scoring flips reverse-coded answers", () => {
  const { dimScore, SECTIONS } = loadScoring();
  const workload = SECTIONS.find((section) => section.dim === "workload");
  const burnout = SECTIONS.find((section) => section.dim === "burnout");

  assert.equal(dimScore(workload, { wl_2: 5 }), 0, "high agreement with buried workload should hurt workload tolerance");
  assert.equal(dimScore(workload, { wl_2: 1 }), 100, "low agreement with buried workload should improve workload tolerance");
  assert.equal(dimScore(burnout, { bo_1: 1 }), 100, "low exhaustion should produce strong burnout resilience");
  assert.equal(dimScore(burnout, { bo_1: 5 }), 0, "high exhaustion should produce weak burnout resilience");
});

test("missing answers default each report dimension to neutral-positive 55", () => {
  const { buildReport } = loadScoring();
  const report = buildReport({ college: "UC Berkeley", major: "Computer Science", intent: "first" }, {});

  assert.deepEqual(report.scores, {
    interest: 55,
    confidence: 55,
    workload: 55,
    motivation: 55,
    career: 55,
    school: 55,
    belonging: 55,
    burnout: 55,
  });
});

test("switch intent materially nudges switching risk without changing answers", () => {
  const { buildReport, SECTIONS } = loadScoring();
  const answers = answersFor(SECTIONS, () => 3);
  const baseCtx = { college: "UC Berkeley", major: "Computer Science" };

  const staying = buildReport({ ...baseCtx, intent: "first" }, answers);
  const exploring = buildReport({ ...baseCtx, intent: "exploring" }, answers);
  const switching = buildReport({ ...baseCtx, intent: "switch" }, answers);

  assert.equal(exploring.switchRisk.pct - staying.switchRisk.pct, 3);
  assert.equal(switching.switchRisk.pct - staying.switchRisk.pct, 8);
});

test("switching risk clamps to bounded percentages", () => {
  const { buildReport, SECTIONS } = loadScoring();
  const healthyAnswers = answersFor(SECTIONS, (question) => question.reverse ? 1 : 5);
  const strainedAnswers = answersFor(SECTIONS, (question) => question.reverse ? 5 : 1);
  const ctx = { college: "UC Berkeley", major: "Computer Science", intent: "switch" };

  assert.equal(buildReport(ctx, healthyAnswers).switchRisk.pct, 4);
  assert.equal(buildReport(ctx, strainedAnswers).switchRisk.pct, 96);
});
