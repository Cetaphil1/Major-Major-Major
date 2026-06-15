/* screens-context.jsx — Student context onboarding form */

function AutoField({ label, hint, placeholder, value, onChange, options, color }) {
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()) && o.toLowerCase() !== value.toLowerCase()).slice(0, 6)
    : options.slice(0, 6);

  return (
    <div className="field" ref={wrapRef}>
      <label className="field__label">{label}</label>
      {hint ? <span className="field__hint">{hint}</span> : null}
      <div className="field__autorow">
        <input
          className="text-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter" && matches[hi]) { e.preventDefault(); onChange(matches[hi]); setOpen(false); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && matches.length > 0 ? (
          <div className="autolist">
            {matches.map((o, i) => (
              <button key={o} type="button" className={i === hi ? "active" : ""}
                onMouseEnter={() => setHi(i)}
                onClick={() => { onChange(o); setOpen(false); }}>
                <span className="pip" style={{ background: color || "var(--blue)" }} />{o}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StudentContext({ ctx, setCtx, onContinue, onBack }) {
  const set = (k, v) => setCtx((c) => ({ ...c, [k]: v }));
  const ready = ctx.college.trim() && ctx.major.trim() && ctx.stage && ctx.enrollment && ctx.intent;

  return (
    <div className="context-screen phase-in">
      <header className="topnav">
        <div className="topnav__inner">
          <Brand />
          <div className="topnav__cta"><FlowSteps active={1} /></div>
        </div>
      </header>

      <div className="context__inner">
        <div className="survey-header" style={{ marginBottom: 4 }}>
          <div className="survey-header__meta"><span className="num">01</span><span>About you</span></div>
          <h1 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 600, letterSpacing: "-0.022em", margin: 0 }}>A little context first.</h1>
          <p style={{ fontSize: 16, color: "var(--ink-2)", margin: 0, maxWidth: 560, lineHeight: 1.55 }}>
            This tunes your report to your actual situation. Estimates are fine — answer for where you are or where you're headed.
          </p>
        </div>

        <AutoField
          label="Current or intended college"
          placeholder="Start typing your school…"
          value={ctx.college} onChange={(v) => set("college", v)}
          options={COLLEGES} color="var(--blue)"
        />

        <AutoField
          label="Current or intended major"
          hint="The field you're in now, or the one you're leaning toward."
          placeholder="e.g. Computer Science"
          value={ctx.major} onChange={(v) => set("major", v)}
          options={MAJORS} color="var(--purple)"
        />

        <div className="field">
          <label className="field__label">Year or college stage</label>
          <div className="segmented">
            {STAGES.map((s) => (
              <button key={s} type="button" className={"seg-opt" + (ctx.stage === s ? " selected" : "")} onClick={() => set("stage", s)}>{s}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">Enrollment</label>
          <div className="segmented">
            {ENROLLMENT.map((s) => (
              <button key={s} type="button" className={"seg-opt" + (ctx.enrollment === s ? " selected" : "")} onClick={() => set("enrollment", s)} style={{ flex: "0 1 200px" }}>{s}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">Where are you in the decision?</label>
          <div className="seg-grid">
            {INTENT.map((o) => (
              <button key={o.key} type="button" className={"seg-card" + (ctx.intent === o.key ? " selected" : "")} onClick={() => set("intent", o.key)}>
                <span className="seg-card__t">{o.t}</span>
                <span className="seg-card__d">{o.d}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="start-cta" style={{ marginTop: 4 }}>
          <Button variant="ghost" onClick={onBack}>← Back</Button>
          <div style={{ flex: 1 }} />
          <Button variant="primary" arrow onClick={onContinue} style={ready ? {} : { opacity: 0.45, pointerEvents: "none" }}>Start the quiz</Button>
        </div>
        <span className="mono" style={{ color: "var(--ink-4)", marginTop: -8 }}>24 questions · about 6 minutes · saved as you go</span>
      </div>
    </div>
  );
}

Object.assign(window, { StudentContext, AutoField });
