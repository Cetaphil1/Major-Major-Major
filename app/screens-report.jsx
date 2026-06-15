/* screens-report.jsx — analyzing loader + final guidance report,
   restyled to the vue-flow-form light "purple" theme. */

function Analyzing({ onDone, context }) {
  // Checklist the loader walks through (the "real" work being done)
  const steps = [
    "Scoring your eight fit dimensions",
    "Weighing interest against workload and burnout",
    "Estimating switching and burnout risk",
    "Matching better-fit major directions",
    "Writing your guidance report",
  ];
  // Playful rotating status line
  const blurbs = [
    "Reading your iceberg…",
    "Separating major mismatch from survival mode…",
    "Checking whether the major is guilty…",
    "Weighing the school against the subject…",
    "Building your report…",
  ];
  const [step, setStep] = React.useState(0);
  const [blurb, setBlurb] = React.useState(0);

  React.useEffect(() => {
    const timers = [];
    steps.forEach((_, i) => timers.push(setTimeout(() => setStep(i + 1), 720 * (i + 1))));
    timers.push(setTimeout(onDone, 720 * steps.length + 650));
    const cycle = setInterval(() => setBlurb((b) => (b + 1) % blurbs.length), 1100);
    timers.push({ clear: () => clearInterval(cycle) });
    return () => timers.forEach((t) => (t.clear ? t.clear() : clearTimeout(t)));
  }, []);

  return (
    <div className="az">
      <div className="az__card">
        <div className="az__spinner" aria-hidden="true">
          <span className="az__spinner-track" />
          <span className="az__spinner-arc" />
          <span className="az__spinner-core" />
        </div>
        <h2>Analyzing your profile…</h2>
        <p className="az__blurb" key={blurb}>{blurbs[blurb]}</p>
        <p className="az__sub">
          Reading your answers for <b>{context.major || "your major"}</b>
          {context.college ? <> at <b>{context.college}</b></> : null} — not just what you like, but whether it's likely to last.
        </p>
        <div className="az__steps">
          {steps.map((s, i) => (
            <div key={i} className={"az__step" + (i < step ? " done" : i === step ? " active" : "")}>
              <span className="tick" />
              <span className="grow">{s}</span>
              <span className="pct">{i < step ? "done" : i === step ? "···" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ value }) {
  const tone = value >= 75 ? "var(--green)" : value >= 55 ? "var(--blue)" : value >= 40 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="rp-ring" style={{ background: `conic-gradient(${tone} ${value * 3.6}deg, var(--vff-line-soft) 0deg)` }}>
      <div className="rp-ring__hole">
        <div>
          <div className="rp-ring__num" style={{ color: tone }}>{value}</div>
          <div className="rp-ring__den">/ 100</div>
        </div>
      </div>
    </div>
  );
}

const RISK_COPY = {
  "Switching risk": "How likely you are to leave this major in the next year if nothing changes.",
  "Burnout risk": "How close your current pace is to emotional exhaustion this term.",
};
function RiskTile({ label, level, pct, tone }) {
  const color = tone === "risk" ? "var(--red)" : tone === "warn" ? "var(--yellow)" : "var(--green)";
  return (
    <div className="card signal">
      <span className="signal__edge" style={{ background: color }} />
      <div className="signal__tag">{label}</div>
      <div className="signal__val" style={{ color }}>{level}</div>
      <div className="rbar__track" style={{ marginBottom: 12 }}><i style={{ width: pct + "%", background: color }} /></div>
      <p className="signal__body">{RISK_COPY[label]}</p>
    </div>
  );
}

function dimColor(key) { const d = DIMENSIONS.find((x) => x.key === key); return d ? d.color : "var(--blue)"; }
function scoreTag(v) { return v >= 70 ? ["Strong", "tag-strong"] : v >= 50 ? ["Watch", "tag-watch"] : ["At risk", "tag-risk"]; }

function Report({ report, onRestart, onRetake }) {
  const r = report;
  const intentLabel = (INTENT.find((i) => i.key === r.student.intent) || {}).t || "";
  return (
    <div className="rp">
      <div className="rp-top">
        <div className="rp-brand">
          <span className="mark" />
          <span><b>Fit Beyond Interest</b><span>Your guidance report</span></span>
        </div>
        <div className="grow" />
        <span className="rp-badge"><span className="pulse" />Report ready</span>
      </div>

      {/* Verdict + overall score */}
      <div className="card rp-hero">
        <div className="rp-verdict">
          <div className="rp-verdict__tag"><span className="pip" style={{ background: "var(--blue)" }} />Your major fit · {r.student.major}</div>
          <h1>{r.student.displayName ? <span className="rp-greet">{r.student.displayName}, here's the honest read. </span> : null}{r.verdict.lead} <span className="accent">{r.verdict.accent}</span></h1>
          <p>{r.verdict.body}</p>
          <div className="rp-tags">
            <span className="tag">{r.student.stage}</span>
            <span className="tag">{r.student.college}</span>
            <span className="tag tag--purple">{intentLabel}</span>
          </div>
        </div>
        <div className="rp-score">
          <ScoreRing value={r.overall} />
          <div className="rp-score__lbl">Overall major fit</div>
          <div className="rp-score__val">{r.overallLabel}</div>
        </div>
      </div>

      {/* Risk row */}
      <div className="rp-signals">
        <RiskTile label="Switching risk" level={r.switchRisk.level} pct={r.switchRisk.pct} tone={r.switchRisk.tone} />
        <RiskTile label="Burnout risk" level={r.burnoutRisk.level} pct={r.burnoutRisk.pct} tone={r.burnoutRisk.tone} />
        <div className="card signal">
          <span className="signal__edge" style={{ background: "var(--grad-fit)" }} />
          <div className="signal__tag">What it adds up to</div>
          <div className="signal__val" style={{ fontSize: 20, lineHeight: 1.2 }}>{r.bottomLine.head}</div>
          <p className="signal__body">{r.bottomLine.body}</p>
        </div>
      </div>

      {/* What's behind the risk */}
      <div className="card rp-card">
        <h3><span className="pip" style={{ background: "var(--blue)" }} />What's actually behind the risk</h3>
        <p className="rp-card__sub">The major, the school, the workload, the career path, or outside pressure</p>
        <p className="rp-card__body">{r.diagnosis}</p>
        {r.warningSigns && r.warningSigns.length ? (
          <div className="reco-list">
            <div className="reco-item">
              <span className="reco-item__n" style={{ background: "rgba(224,160,21,0.16)", color: "#a9770a" }}>!</span>
              <span className="reco-item__t"><b>Warning signs to watch for.</b> {r.warningSigns.join(" · ")}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Eight signals */}
      <div className="card rp-card">
        <div className="rbar-head">
          <h3 style={{ margin: 0 }}>Your eight fit signals</h3>
          <span className="meta">0–100 per dimension</span>
        </div>
        {DIMENSIONS.map((d) => {
          const v = r.scores[d.key];
          const [tag, tagCls] = scoreTag(v);
          return (
            <div key={d.key} className="rbar">
              <span className="rbar__name"><span className="pip" style={{ background: d.color }} />{d.name}</span>
              <span className="rbar__track"><i style={{ width: v + "%", background: d.color }} /></span>
              <span className="rbar__val"><span className={"rbar__tag " + tagCls}>{tag}</span>{v}</span>
            </div>
          );
        })}
      </div>

      {/* Strongest / weakest */}
      <div className="rp-twocol">
        <div className="card areas-card">
          <h4><span className="pip" style={{ background: "var(--green)" }} />Strongest areas</h4>
          {r.strongest.map((a) => (
            <div key={a.key} className="area-row">
              <span className="pip" style={{ background: dimColor(a.key) }} />
              <span className="nm">{a.name}</span><span className="sc" style={{ color: "var(--green-deep)" }}>{a.score}</span>
            </div>
          ))}
        </div>
        <div className="card areas-card">
          <h4><span className="pip" style={{ background: "var(--red)" }} />Weakest areas</h4>
          {r.weakest.map((a) => (
            <div key={a.key} className="area-row">
              <span className="pip" style={{ background: dimColor(a.key) }} />
              <span className="nm">{a.name}</span><span className="sc" style={{ color: "var(--red)" }}>{a.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* School environment */}
      <div className="card rp-card">
        <h3><span className="pip" style={{ background: "var(--pink)" }} />Your school environment</h3>
        <p className="rp-card__sub">How {r.student.college} may be shaping this</p>
        <p className="rp-card__body">{r.schoolEnv.intro}</p>
        <div className="reco-list">
          {r.schoolEnv.factors.map((f, i) => (
            <div key={i} className="reco-item">
              <span className="reco-item__n" style={{ background: f.tone === "good" ? "rgba(39,174,96,0.14)" : f.tone === "warn" ? "rgba(224,160,21,0.16)" : "#f3eef9", color: f.tone === "good" ? "var(--green-deep)" : f.tone === "warn" ? "#a9770a" : "var(--purple)" }}>{f.tone === "good" ? "+" : "•"}</span>
              <span className="reco-item__t"><b>{f.t}</b> {f.d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next steps */}
      <div className="card rp-card">
        <h3><span className="pip" style={{ background: "var(--blue)" }} />Recommended next steps</h3>
        <p className="rp-card__sub">Concrete moves, in priority order</p>
        <div className="reco-list">
          {r.nextSteps.map((s, i) => (
            <div key={i} className="reco-item">
              <span className="reco-item__n">{String(i + 1).padStart(2, "0")}</span>
              <span className="reco-item__t"><b>{s.t}</b> {s.d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stay vs switch */}
      <div className="rp-twocol">
        <div className="card areas-card">
          <h4><span className="pip" style={{ background: "var(--green)" }} />When staying makes sense</h4>
          {r.staySigns.map((s, i) => (
            <div key={i} className="area-row" style={{ alignItems: "flex-start" }}>
              <span className="pip" style={{ background: "var(--green)", marginTop: 7 }} />
              <span className="nm" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="card areas-card">
          <h4><span className="pip" style={{ background: "var(--yellow)" }} />When switching makes sense</h4>
          {r.switchSigns.map((s, i) => (
            <div key={i} className="area-row" style={{ alignItems: "flex-start" }}>
              <span className="pip" style={{ background: "var(--yellow)", marginTop: 7 }} />
              <span className="nm" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Better-fit majors */}
      <div className="card rp-card">
        <h3><span className="pip" style={{ background: "var(--purple)" }} />Better-fit major directions</h3>
        <p className="rp-card__sub">Fields that keep what you love and ease what's draining you</p>
        <div className="major-chips">
          {r.betterFit.map((m) => (
            <div key={m.n} className="major-chip"><span className="major-chip__n">{m.n}</span><span className="major-chip__w">{m.w}</span></div>
          ))}
        </div>
        <p className="rp-card__body" style={{ marginTop: 16, marginBottom: 0, fontSize: 13 }}>These share {r.student.major}'s core but trade some of its heaviest workload — worth a conversation with an advisor before any move.</p>
      </div>

      {/* Questions */}
      <div className="card rp-card" style={{ marginBottom: 0 }}>
        <h3><span className="pip" style={{ background: "var(--yellow)" }} />Questions to ask before switching or committing</h3>
        <p className="rp-card__sub">Sit with these for a week before deciding</p>
        <div className="questions-list">
          {r.questions.map((q, i) => (
            <div key={i} className="question-item"><span className="qm">?</span><span>{q}</span></div>
          ))}
        </div>
        <div className="rp-cta">
          <button className="o-btn" onClick={onRetake}>Re-take after midterms</button>
          <button className="o-btn o-btn--ghost" onClick={onRestart}>Start over</button>
          <div className="grow" />
          <span className="fine">Saved locally · not a clinical assessment</span>
        </div>
      </div>

      <ReportExtras report={r} />
    </div>
  );
}

/* ── ReportExtras — the real college research system + coffee CTA ───
   Replaces the old placeholder tool grid. ResearchCenter (research.jsx) renders
   the college snapshot, official sources, school-vs-major diagnostic, similar
   majors, rankings, professor/campus research links, and nearby colleges — each
   with an honest status badge. */
function ReportExtras({ report }) {
  const r = report;
  const college = r.student.college, major = r.student.major;

  return (
    <div className="rx">
      <div className="rx-research">
        <div className="rx-research__txt">
          <span className="rx-eyebrow"><span className="pip" style={{ background: "var(--blue)" }} />Your research center</span>
          <h2>Research {major} at {college}</h2>
          <p>Official Scorecard data (enrollment, cost, graduation, earnings), similar majors, professors, campus life, and nearby colleges — on one dedicated page, each item labeled for what's real vs. a search.</p>
        </div>
        <a className="o-btn" href="research.html" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>Open research center →</a>
      </div>

      <div className="rx-coffee">
        <div className="rx-coffee__txt">
          <h3>Want to have a coffee chat? Want to buy me coffee?</h3>
          <p>This is a student-built project. No paywall, no gate on your report — just say hi or fuel the next feature.</p>
        </div>
        <div className="rx-coffee__btns">
          <a className="o-btn o-btn--ghost" href="[COFFEE_CHAT_LINK]">Coffee chat</a>
          <a className="o-btn" href="[BUY_ME_COFFEE_LINK]">Buy me coffee</a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Analyzing, Report });
