/* fit-app.jsx — Fit Beyond Interest flow controller (switch-major focused).
   context (college search) → quiz → analyzing → guidance report.
   Scores are computed from the student's actual answers, and the report
   narrative is generated to EXPLAIN the reason behind the risk. */

(function () {
  const { useState, useEffect } = React;
  const STORE = "fbi-flow-v1";

  // ── persistence ───────────────────────────────────────────────
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; } }
  function save(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {} }
  function wipe() { try { localStorage.removeItem(STORE); } catch {} }

  // ── scoring ───────────────────────────────────────────────────
  // Each section maps to one dimension. Answers are 1–5; reverse items flip.
  // Dimension score is 0–100 where HIGH = healthy (high burnout score = resilient).
  function dimScore(section, answers) {
    const vals = section.questions.map((q) => {
      const raw = answers[q.id];
      if (!raw) return null;
      return q.reverse ? 6 - raw : raw;
    }).filter((v) => v != null);
    if (!vals.length) return null;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(((mean - 1) / 4) * 100);
  }

  function riskLevel(pct) {
    if (pct >= 62) return { level: "High", tone: "risk" };
    if (pct >= 46) return { level: "Elevated", tone: "warn" };
    if (pct >= 30) return { level: "Moderate", tone: "warn" };
    return { level: "Low", tone: "good" };
  }

  const SWITCH_MAP = {
    "Computer Science": [["Information Science", "high"], ["Data Science", "high"], ["Cognitive Science", "good"], ["Applied Mathematics", "good"]],
    "Mechanical Engineering": [["Industrial Engineering", "high"], ["Applied Physics", "good"], ["Product Design", "good"], ["Materials Science", "good"]],
    "Biology (Pre-Med)": [["Public Health", "high"], ["Biochemistry", "good"], ["Health Sciences", "high"], ["Psychology", "good"]],
    "Psychology": [["Cognitive Science", "high"], ["Human Development", "good"], ["Public Health", "good"], ["Sociology", "good"]],
    "Business Administration": [["Economics", "good"], ["Marketing", "high"], ["Information Systems", "good"], ["Communications", "good"]],
    "Economics": [["Data Science", "good"], ["Public Policy", "high"], ["Statistics", "good"], ["Finance", "good"]],
    "Nursing": [["Public Health", "high"], ["Health Administration", "good"], ["Kinesiology", "good"], ["Psychology", "good"]],
    "Political Science": [["Public Policy", "high"], ["Communications", "good"], ["Economics", "good"], ["Sociology", "good"]],
    "Mathematics": [["Data Science", "high"], ["Statistics", "high"], ["Economics", "good"], ["Computer Science", "good"]],
    "English": [["Communications", "high"], ["Media Studies", "good"], ["Marketing", "good"], ["Education", "good"]],
    "Graphic Design": [["UX Design", "high"], ["Communications", "good"], ["Marketing", "good"], ["Media Arts", "good"]],
    "Communications": [["Marketing", "high"], ["Media Studies", "good"], ["Public Relations", "good"], ["Journalism", "good"]],
  };
  function betterFitFor(major) {
    const list = SWITCH_MAP[major] || [["An adjacent applied field", "good"], ["A broader version of this field", "good"], ["A more hands-on track", "good"]];
    const pct = ["94% aligned", "90% aligned", "86% aligned", "83% aligned"];
    return list.map((m, i) => ({ n: m[0], w: pct[i] || "aligned" }));
  }

  function buildReport(ctx, answers) {
    const scores = {};
    SECTIONS.forEach((s) => { const v = dimScore(s, answers); scores[s.dim] = v == null ? 55 : v; });

    const get = (k) => scores[k];
    const overall = Math.round(
      (get("interest") * 1.3 + get("confidence") + get("workload") * 1.1 + get("motivation") +
       get("career") + get("school") + get("belonging") + get("burnout") * 1.2) / 8.6
    );
    const overallLabel = overall >= 78 ? "Strong fit" : overall >= 60 ? "Moderate fit" : overall >= 45 ? "Fragile fit" : "Poor fit";

    // Switching risk: driven by the operational + belonging signals, nudged by stated intent
    let switchPct = Math.round(100 - (get("workload") * 0.9 + get("burnout") * 1.0 + get("belonging") * 0.8 + get("motivation") * 0.7 + get("school") * 0.6 + get("career") * 0.5) / 4.5);
    if (ctx.intent === "switch") switchPct += 8;
    if (ctx.intent === "exploring") switchPct += 3;
    switchPct = Math.max(4, Math.min(96, switchPct));
    const burnoutPct = Math.max(4, Math.min(96, 100 - get("burnout")));
    const sr = riskLevel(switchPct), br = riskLevel(burnoutPct);

    // Strongest / weakest
    const ranked = DIMENSIONS.map((d) => ({ key: d.key, name: d.name, score: get(d.key) })).sort((a, b) => b.score - a.score);
    const strongest = ranked.slice(0, 3);
    const weakest = ranked.slice(-3).reverse();
    const lowKeys = weakest.map((w) => w.key);
    const has = (k) => lowKeys.includes(k);

    // ── narrative ──────────────────────────────────────────────
    const interestHigh = get("interest") >= 62;
    const weakNames = weakest.map((w) => w.name.toLowerCase()).slice(0, 2).join(" and ");

    let verdict;
    if (overall >= 78) {
      verdict = { lead: "A strong fit —", accent: "and built to last.", body: `You like ${ctx.major}, you can handle its real demands, and you can see where it leads. Your signals line up across interest, workload, and resilience — the pattern of students who stay and thrive.` };
    } else if (interestHigh && (get("workload") <= 48 || get("burnout") <= 48)) {
      verdict = { lead: "A real interest —", accent: "running on a draining term.", body: `You clearly like ${ctx.major} and can see where it leads. But your ${weakNames} are running well below your interest — exactly the pattern that pushes students who like their major to quietly switch out. Here's where it's strong, where the risk is, and what to do before deciding.` };
    } else if (get("interest") < 50) {
      verdict = { lead: "The pull itself is fading —", accent: "not just the workload.", body: `Your interest in ${ctx.major} is among your lower signals, which is different from being tired or overworked. That's worth taking seriously: it usually means the subject — not just the pace — may not be yours.` };
    } else {
      verdict = { lead: "A mixed picture —", accent: "stay-able with changes.", body: `${ctx.major} partly fits you. A few signals are holding it up while others are pulling it down. The deciding factor isn't whether you like the field; it's whether the weak spots become sustainable.` };
    }

    // bottom-line tile
    let bottomLine;
    if (overall >= 78) bottomLine = { head: "On track", body: "Keep doing what's working and protect the few areas that could slip." };
    else if (switchPct >= 62) bottomLine = { head: "Decision point", body: "The risk is real. Use the next steps before making — or ruling out — a switch." };
    else bottomLine = { head: "Stay-able — with changes", body: "The fit is salvageable. The deciding factor is whether the weak signals become sustainable this term." };

    // diagnosis — what is actually behind the risk
    let cause;
    if (has("interest")) cause = "the subject itself, not just the pace — your interest is one of your weaker signals";
    else if (has("workload") || has("burnout")) cause = "the pace and volume, not the subject — your interest holds up while your workload tolerance and recovery don't";
    else if (has("school")) cause = "your specific program and campus, not the field — the same major might fit better elsewhere";
    else if (has("career")) cause = "an unclear payoff, not the day-to-day — you can do the work but can't yet see where it leads";
    else if (has("belonging")) cause = "isolation in the field, not the material — you can do it, but you don't yet feel part of it";
    else cause = "a cluster of smaller strains rather than one obvious cause";
    const diagnosis = `Your switching risk is ${sr.level.toLowerCase()}, and the reason matters more than the score. The strain is mostly ${cause}. Your strongest signals — ${strongest.map((s) => s.name.toLowerCase()).slice(0, 2).join(" and ")} — are real and worth protecting before you decide anything.`;

    const warningSigns = [];
    if (get("burnout") <= 50) warningSigns.push("dreading work you used to enjoy");
    if (get("belonging") <= 50) warningSigns.push("feeling alone in the major");
    if (get("workload") <= 50) warningSigns.push("falling behind no matter the effort");
    if (get("motivation") <= 50) warningSigns.push("studying only to avoid falling behind");
    if (get("career") <= 50) warningSigns.push("losing sight of why the degree matters");
    if (!warningSigns.length) warningSigns.push("a sudden drop in any one signal after a heavy stretch");

    // school environment
    const compHeavy = get("school") <= 55 || get("belonging") <= 50;
    const schoolEnv = {
      intro: `Where you study shapes major fit as much as the major does — class sizes, competitiveness, advising, and who's around you all change whether the same field feels sustainable. Here's how ${ctx.college} may be affecting your signals.`,
      factors: [
        compHeavy
          ? { t: "A demanding, competitive program.", d: `Your school-fit and belonging signals suggest the culture at ${ctx.college} may be adding pressure on top of the coursework. The same major at a more collaborative program can read very differently.`, tone: "warn" }
          : { t: "A supportive program culture.", d: `Your school-fit signal is healthy — the environment at ${ctx.college} seems to be working with you, not against you.`, tone: "good" },
        get("belonging") <= 50
          ? { t: "Thin support network so far.", d: "Belonging is one of the strongest predictors of staying. Finding one study group or club in the major can move this fast.", tone: "warn" }
          : { t: "You've found your people.", d: "You feel at home among students in the field — a strong buffer against switching when the work gets hard.", tone: "good" },
        { t: "Advising and course access.", d: `Before any decision, use ${ctx.college}'s advising to test a lighter or re-sequenced term — it's the cheapest way to find out if it's the school or the field.`, tone: "neutral" },
      ],
    };

    // when to stay / when to switch
    const staySigns = [
      "Your interest and curiosity are still genuinely high.",
      "The drain traces to workload or this specific term — things that can change.",
      "A lighter schedule, a study group, or better advising would plausibly fix it.",
      "You'd be sad to lose the parts of this field you love.",
    ];
    const switchSigns = [
      "The subject itself — not just the pace — stopped interesting you.",
      "You've genuinely tried adjusting load and support and still feel drained.",
      "A related field keeps the parts you love and eases what's draining you.",
      "Your strongest signals point somewhere adjacent, not here.",
    ];

    // next steps
    const nextSteps = [];
    if (get("burnout") <= 55) nextSteps.push({ t: "Protect recovery, not just output.", d: "Burnout resilience is among your lowest signals. Build two fixed no-work blocks into each week before adding anything new." });
    if (get("workload") <= 55) nextSteps.push({ t: "Talk to your advisor about course load — this term.", d: "Workload tolerance is below your interest. A lighter or re-sequenced semester may keep you in the field you actually like." });
    if (get("belonging") <= 55) nextSteps.push({ t: "Find one study group or club in the major.", d: "Belonging is one of the strongest predictors of staying — one small group can move it fast." });
    if (get("career") <= 55) nextSteps.push({ t: "Shadow or talk to someone two years ahead.", d: "Career clarity is shaky. Seeing the real work this degree leads to often restores — or honestly ends — the motivation." });
    nextSteps.push({ t: "Run a 4-week check-in before any switch.", d: "Don't decide mid-crunch. Re-take this after midterms to see whether the dip is the workload or the field." });

    const questions = [
      "Is it the subject I'm tired of, or the pace and volume of this program?",
      `Would a lighter term or a different school make ${ctx.major} sustainable?`,
      "Which parts of the work energize me, and which consistently drain me?",
      "If I switched, would I keep the parts of this field I genuinely love?",
      "Who in this major do I actually want to be like in four years?",
    ];

    return {
      student: { college: ctx.college || "your school", major: ctx.major || "your major", stage: ctx.stage || "", intent: ctx.intent || "switch" },
      overall, overallLabel,
      switchRisk: { level: sr.level, pct: switchPct, tone: sr.tone },
      burnoutRisk: { level: br.level, pct: burnoutPct, tone: br.tone },
      scores, strongest, weakest,
      verdict, bottomLine, diagnosis, warningSigns, schoolEnv, staySigns, switchSigns,
      nextSteps, betterFit: betterFitFor(ctx.major), questions,
    };
  }

  // ── controller ────────────────────────────────────────────────
  function FlowApp() {
    const saved = load();
    const emptyCtx = { college: "", major: "", stage: "", enrollment: "", intent: "" };
    const [phase, setPhase] = useState(saved?.phase || "context");
    const [ctx, setCtx] = useState(saved?.ctx || emptyCtx);
    const [sectionIdx, setSectionIdx] = useState(saved?.sectionIdx || 0);
    const [answers, setAnswers] = useState(saved?.answers || {});

    useEffect(() => { save({ phase, ctx, sectionIdx, answers }); }, [phase, ctx, sectionIdx, answers]);

    const go = (p) => { window.scrollTo({ top: 0, behavior: "auto" }); setPhase(p); };
    const toLanding = () => { window.location.href = "index.html"; };

    const report = buildReport(ctx, answers);

    if (phase === "context")
      return <StudentContext ctx={ctx} setCtx={setCtx} onContinue={() => go("quiz")} onBack={toLanding} />;

    if (phase === "quiz")
      return <QuizRuntime
        sectionIdx={sectionIdx} setSectionIdx={setSectionIdx}
        answers={answers} setAnswers={setAnswers}
        onFinish={() => go("analyzing")}
        onExit={() => { setSectionIdx(0); go("context"); }}
      />;

    if (phase === "analyzing")
      return <Analyzing context={ctx} onDone={() => go("report")} />;

    return <Report report={report}
      onRetake={() => { setAnswers({}); setSectionIdx(0); go("quiz"); }}
      onRestart={() => { wipe(); setAnswers({}); setSectionIdx(0); setCtx(emptyCtx); toLanding(); }}
    />;
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<FlowApp />);
})();
