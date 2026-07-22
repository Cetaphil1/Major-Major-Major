const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadScoringApi() {
  const dataSource = read("app/data.jsx");
  const fitAppSource = read("app/fit-app.jsx");
  const scoringStart = fitAppSource.indexOf("  // \u2500\u2500 scoring");
  const controllerStart = fitAppSource.indexOf("  // \u2500\u2500 controller");

  assert.notEqual(scoringStart, -1, "expected scoring block marker");
  assert.notEqual(controllerStart, -1, "expected controller block marker");

  const scoringSource = fitAppSource.slice(scoringStart, controllerStart);
  const sandbox = { window: {} };
  vm.createContext(sandbox);

  vm.runInContext(dataSource, sandbox, { filename: "app/data.jsx" });
  vm.runInContext(
    `${scoringSource}\nwindow.__scoringApi = { dimScore, riskLevel, buildReport };`,
    sandbox,
    { filename: "app/fit-app.jsx#scoring" },
  );

  return {
    api: sandbox.window.__scoringApi,
    sections: plain(sandbox.window.SECTIONS),
  };
}

function answersFor(sections, desiredRawByDim) {
  const answers = {};

  for (const section of sections) {
    const desiredRaw = desiredRawByDim[section.dim] ?? 3;
    for (const question of section.questions) {
      answers[question.id] = question.reverse ? 6 - desiredRaw : desiredRaw;
    }
  }

  return answers;
}

test("dimension scoring handles missing answers and reverse-scored burnout items", () => {
  const { api, sections } = loadScoringApi();
  const burnout = sections.find((section) => section.dim === "burnout");

  assert.equal(api.dimScore(burnout, {}), null);
  assert.equal(api.dimScore(burnout, { bo_1: 5, bo_2: 5, bo_3: 1 }), 0);
  assert.equal(api.dimScore(burnout, { bo_1: 1, bo_2: 1, bo_3: 5 }), 100);
});

test("report flags high switch risk when interest is high but workload and recovery are low", () => {
  const { api, sections } = loadScoringApi();
  const answers = answersFor(sections, {
    interest: 5,
    confidence: 3,
    workload: 1,
    motivation: 3,
    career: 5,
    school: 3,
    belonging: 1,
    burnout: 1,
  });

  const report = plain(api.buildReport(
    {
      college: "University of California, Berkeley",
      major: "Computer Science",
      stage: "Sophomore",
      intent: "switch",
      displayName: "Maya",
    },
    answers,
  ));

  assert.equal(report.student.displayName, "Maya");
  assert.equal(report.scores.interest, 100);
  assert.equal(report.scores.workload, 0);
  assert.equal(report.scores.burnout, 0);
  assert.deepEqual(report.switchRisk, { level: "High", pct: 82, tone: "risk" });
  assert.deepEqual(report.burnoutRisk, { level: "High", pct: 96, tone: "risk" });
  assert.match(report.verdict.lead, /A real interest/);
  assert.match(report.diagnosis, /switching risk is high/);
  assert.ok(report.warningSigns.includes("dreading work you used to enjoy"));
  assert.ok(report.nextSteps.some((step) => /Protect recovery/.test(step.t)));
  assert.deepEqual(
    report.betterFit.map((fit) => fit.n),
    ["Information Science", "Data Science", "Cognitive Science", "Applied Mathematics"],
  );
});
