/* screens-report.jsx — analyzing loader + final guidance report */

function Analyzing({ onDone, context }) {
  const steps = [
    "Scoring your eight fit dimensions",
    "Weighing interest against workload and burnout",
    "Estimating switching and burnout risk",
    "Matching better-fit major directions",
    "Writing your guidance report",
  ];
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const timers = [];
    steps.forEach((_, i) => timers.push(setTimeout(() => setStep(i + 1), 700 * (i + 1))));
    timers.push(setTimeout(onDone, 700 * steps.length + 650));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="loading-screen phase-in">
      <div className="loading-card">
        <div className="loading-orbwrap">
          <div className="loading-orb" />
          <div className="loading-orb__core"><span className="mark-lg" /></div>
        </div>
        <h2>Analyzing your profile…</h2>
        <p className="sub">
          Reading your answers for <b style={{ color: "var(--ink)" }}>{context.major || "your major"}</b>
          {context.college ? <> at <b style={{ color: "var(--ink)" }}>{context.college}</b></> : null} — not just what you like, but whether it's likely to last.
        </p>
        <div className="loading-steps">
          {steps.map((s, i) => (
            <div key={i} className={"loading-step" + (i < step ? " done" : i === step ? " active" : "")}>
              <span className="loading-step__tick" />
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
  const tone = value >= 75 ? "var(--green)" : value >= 55 ? "var(--blue-bright)" : value >= 40 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="results-score__ring" style={{ background: `conic-gradient(${tone} ${value * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}>
      <div style={{ position: "absolute", inset: 10, borderRadius: "50%", background: "var(--bg-card)", display: "grid", placeItems: "center" }}>
        <div>
          <div className="results-score__num" style={{ color: tone }}>{value}</div>
          <div className="results-score__den">/ 100</div>
        </div>
      </div>
    </div>
  );
}

function RiskTile({ label, level, pct, tone }) {
  const color = tone === "risk" ? "var(--red)" : tone === "warn" ? "var(--yellow)" : "var(--green)";
  return (
    <div className="signal">
      <span className="signal__edge" style={{ background: color, boxShadow: "0 0 12px " + color }} />
      <div className="signal__tag">{label}</div>
      <div className="signal__val" style={{ color }}>{level}</div>
      <div className="rbar__track" style={{ marginBottom: 10 }}><i style={{ width: pct + "%", background: color, boxShadow: "0 0 10px " + color }} /></div>
      <p className="signal__body">{RISK_COPY[label]}</p>
    </div>
  );
}
const RISK_COPY = {
  "Switching risk": "How likely you are to leave this major in the next year if nothing changes.",
  "Burnout risk": "How close your current pace is to emotional exhaustion this term.",
  "Overall direction": "A blend of all eight signals — where this major is trending for you.",
};

function dimColor(key) { const d = DIMENSIONS.find((x) => x.key === key); return d ? d.color : "var(--blue)"; }
function scoreTag(v) { return v >= 70 ? ["Strong", "tag-strong"] : v >= 50 ? ["Watch", "tag-watch"] : ["At risk", "tag-risk"]; }

function Report({ report, onRestart, onRetake }) {
  const r = report;
  const intentLabel = (INTENT.find((i) => i.key === r.student.intent) || {}).t || "";
  return (
    <div className="results phase-in">
      <div className="results__inner">
        <div className="results-top">
          <Brand tagline="" />
          <div className="grow" />
          <span className="badge badge--green"><span className="pulse" style={{ width: 5, height: 5 }} />Report ready</span>
        </div>

        {/* Verdict + overall score */}
        <div className="results-hero">
          <div className="results-verdict">
            <div className="results-verdict__tag"><Pip color="var(--blue-bright)" />Your major fit · {r.student.major}</div>
            <h1>{r.verdict.lead} <span className="accent">{r.verdict.accent}</span></h1>
            <p>{r.verdict.body}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              <Badge>{r.student.stage}</Badge>
              <Badge>{r.student.college}</Badge>
              <Badge tone="purple">{intentLabel}</Badge>
            </div>
          </div>
          <div className="results-score">
            <ScoreRing value={r.overall} />
            <div className="results-score__lbl">Overall major fit</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{r.overallLabel}</div>
          </div>
        </div>

        {/* Risk row */}
        <div className="results-signals">
          <RiskTile label="Switching risk" level={r.switchRisk.level} pct={r.switchRisk.pct} tone={r.switchRisk.tone} />
          <RiskTile label="Burnout risk" level={r.burnoutRisk.level} pct={r.burnoutRisk.pct} tone={r.burnoutRisk.tone} />
          <div className="signal">
            <span className="signal__edge" style={{ background: "var(--grad-fit)" }} />
            <div className="signal__tag">What it adds up to</div>
            <div className="signal__val" style={{ fontSize: 20, lineHeight: 1.2 }}>{r.bottomLine.head}</div>
            <p className="signal__body">{r.bottomLine.body}</p>
          </div>
        </div>

        {/* Where the real issue is */}
        <div className="results-reco" style={{ marginBottom: 24 }}>
          <h3><Pip color="var(--blue-bright)" />What's actually behind the risk</h3>
          <p className="results-reco__sub">The major, the school, the workload, the career path, or outside pressure</p>
          <p className="body" style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink-2)" }}>{r.diagnosis}</p>
          <div className="reco-list" style={{ margin: 0 }}>
            {r.warningSigns && r.warningSigns.length ? (
              <div className="reco-item" style={{ alignItems: "flex-start" }}>
                <span className="reco-item__n" style={{ color: "var(--yellow)" }}>!</span>
                <span className="reco-item__t"><b>Warning signs to watch for.</b> {r.warningSigns.join(" · ")}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Full dimension breakdown */}
        <div className="results-bars">
          <div className="results-bars__head">
            <h3>Your eight fit signals</h3>
            <span className="mono" style={{ color: "var(--ink-4)" }}>0–100 per dimension</span>
          </div>
          {DIMENSIONS.map((d) => {
            const v = r.scores[d.key];
            const [tag, tagCls] = scoreTag(v);
            return (
              <div key={d.key} className="rbar">
                <span className="rbar__name"><span className="pip" style={{ background: d.color, color: d.color }} />{d.name}</span>
                <span className="rbar__track"><i style={{ width: v + "%", background: d.color, boxShadow: "0 0 10px " + d.color }} /></span>
                <span className="rbar__val"><span className={"rbar__tag " + tagCls}>{tag}</span>{v}</span>
              </div>
            );
          })}
        </div>

        {/* Strongest / weakest */}
        <div className="results-twocol">
          <div className="areas-card">
            <h4><Pip color="var(--green)" />Strongest areas</h4>
            {r.strongest.map((a) => (
              <div key={a.key} className="area-row">
                <span className="pip" style={{ background: dimColor(a.key), color: dimColor(a.key) }} />
                <span className="nm">{a.name}</span><span className="sc" style={{ color: "var(--green)" }}>{a.score}</span>
              </div>
            ))}
          </div>
          <div className="areas-card">
            <h4><Pip color="var(--red)" />Weakest areas</h4>
            {r.weakest.map((a) => (
              <div key={a.key} className="area-row">
                <span className="pip" style={{ background: dimColor(a.key), color: dimColor(a.key) }} />
                <span className="nm">{a.name}</span><span className="sc" style={{ color: "var(--red)" }}>{a.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* School environment */}
        <div className="results-reco" style={{ marginBottom: 24 }}>
          <h3><Pip color="var(--pink)" />Your school environment</h3>
          <p className="results-reco__sub">How {r.student.college} may be shaping this</p>
          <p className="body" style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink-2)" }}>{r.schoolEnv.intro}</p>
          <div className="reco-list" style={{ margin: 0 }}>
            {r.schoolEnv.factors.map((f, i) => (
              <div key={i} className="reco-item">
                <span className="reco-item__n" style={{ color: f.tone === "risk" ? "var(--red)" : f.tone === "warn" ? "var(--yellow)" : "var(--green)" }}>{f.tone === "good" ? "+" : "•"}</span>
                <span className="reco-item__t"><b>{f.t}</b> {f.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended next steps */}
        <div className="results-reco" style={{ marginBottom: 24 }}>
          <h3><Pip color="var(--blue-bright)" />Recommended next steps</h3>
          <p className="results-reco__sub">Concrete moves, in priority order</p>
          <div className="reco-list">
            {r.nextSteps.map((s, i) => (
              <div key={i} className="reco-item">
                <span className="reco-item__n">{String(i + 1).padStart(2, "0")}</span>
                <span className="reco-item__t"><b>{s.t}</b> {s.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* When to switch vs stay */}
        <div className="results-twocol" style={{ marginBottom: 24 }}>
          <div className="areas-card">
            <h4><Pip color="var(--green)" />When staying makes sense</h4>
            {r.staySigns.map((s, i) => (
              <div key={i} className="area-row" style={{ alignItems: "flex-start" }}>
                <span className="pip" style={{ background: "var(--green)", color: "var(--green)", marginTop: 6 }} />
                <span className="nm" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
          <div className="areas-card">
            <h4><Pip color="var(--yellow)" />When switching makes sense</h4>
            {r.switchSigns.map((s, i) => (
              <div key={i} className="area-row" style={{ alignItems: "flex-start" }}>
                <span className="pip" style={{ background: "var(--yellow)", color: "var(--yellow)", marginTop: 6 }} />
                <span className="nm" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Better-fit majors */}
        <div className="results-reco" style={{ marginBottom: 24 }}>
          <h3><Pip color="var(--purple)" />Better-fit major directions</h3>
          <p className="results-reco__sub">Fields that keep what you love and ease what's draining you</p>
          <div className="major-chips">
            {r.betterFit.map((m) => (
              <div key={m.n} className="major-chip"><span className="major-chip__n">{m.n}</span><span className="major-chip__w">{m.w}</span></div>
            ))}
          </div>
          <p className="body" style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>These share {r.student.major}'s core but trade some of its heaviest workload — worth a conversation with an advisor before any move.</p>
        </div>

        {/* Questions to ask */}
        <div className="results-reco">
          <h3><Pip color="var(--yellow)" />Questions to ask before switching or committing</h3>
          <p className="results-reco__sub">Sit with these for a week before deciding</p>
          <div className="questions-list">
            {r.questions.map((q, i) => (
              <div key={i} className="question-item"><span className="qm">?</span><span>{q}</span></div>
            ))}
          </div>
          <div className="results-cta" style={{ marginTop: 26 }}>
            <Button variant="primary" arrow onClick={onRetake}>Re-take after midterms</Button>
            <Button variant="ghost" onClick={onRestart}>Start over</Button>
            <div style={{ flex: 1 }} />
            <span className="fine">Saved locally · not a clinical assessment</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Analyzing, Report });
