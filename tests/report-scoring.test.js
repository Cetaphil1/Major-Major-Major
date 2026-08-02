const assert = require("node:assert/strict");
const test = require("node:test");

const { makeBrowserContext, readRepoFile, runRepoScript } = require("./vm-helpers");

function loadScoring() {
  const context = makeBrowserContext();
  runRepoScript(context, "app/data.jsx");

  const source = readRepoFile("app/fit-app.jsx");
  const start = source.indexOf("  function dimScore");
  const end = source.indexOf("  // \u2500\u2500 controller");
  assert.notEqual(start, -1, "expected dimScore block in app/fit-app.jsx");
  assert.notEqual(end, -1, "expected controller marker in app/fit-app.jsx");

  const scoringOnly = source.slice(start, end) + "\nwindow.__scoring = { dimScore, riskLevel, buildReport };\n";
  vmRun(context, scoringOnly, "app/fit-app.scoring.js");
  return { scoring: context.window.__scoring, sections: context.window.SECTIONS };
}

function vmRun(context, source, filename) {
  return require("node:vm").runInContext(source, context, { filename });
}

function answersFor(sectionScores) {
  const { sections } = loadScoring();
  const answers = {};
  for (const section of sections) {
    const target = sectionScores[section.dim] ?? 3;
    for (const question of section.questions) {
      answers[question.id] = question.reverse ? 6 - target : target;
    }
  }
  return answers;
}

test("dimScore reverses negatively phrased items so burnout resilience is not overstated", () => {
  const { scoring, sections } = loadScoring();
  const burnout = sections.find((section) => section.dim === "burnout");

  assert.equal(scoring.dimScore(burnout, { bo_1: 5, bo_2: 5, bo_3: 1 }), 0);
  assert.equal(scoring.dimScore(burnout, { bo_1: 1, bo_2: 1, bo_3: 5 }), 100);
  assert.equal(scoring.dimScore(burnout, {}), null);
});

test("buildReport defaults unanswered sections to neutral scores", () => {
  const { scoring } = loadScoring();
  const report = scoring.buildReport({ college: "Howard University", major: "Psychology" }, {});

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
  assert.equal(report.student.college, "Howard University");
  assert.equal(report.student.major, "Psychology");
});

test("buildReport flags the risky pattern where interest is high but workload and recovery are low", () => {
  const { scoring } = loadScoring();
  const answers = answersFor({
    interest: 5,
    confidence: 4,
    workload: 1,
    motivation: 1,
    career: 1,
    school: 1,
    belonging: 1,
    burnout: 1,
  });

  const report = scoring.buildReport(
    { college: "University of California, Berkeley", major: "Computer Science", intent: "switch" },
    answers
  );

  assert.equal(report.scores.interest, 100);
  assert.equal(report.scores.workload, 0);
  assert.equal(report.scores.burnout, 0);
  assert.equal(report.switchRisk.level, "High");
  assert.equal(report.switchRisk.pct, 96);
  assert.match(report.verdict.body, /running well below your interest/i);
  assert.match(report.diagnosis, /pace and volume/i);
  assert.ok(report.warningSigns.includes("dreading work you used to enjoy"));
  assert.ok(report.nextSteps.some((step) => /course load/i.test(step.t)));
  assert.deepEqual(
    report.betterFit.map((fit) => fit.n).slice(0, 2),
    ["Information Science", "Data Science"]
  );
});
