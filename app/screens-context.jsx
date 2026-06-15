/* screens-context.jsx — student context onboarding, vue-flow-form light skin */

function AutoField({ label, hint, placeholder, value, onChange, options, color }) {
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = value ?
  options.filter((o) => o.toLowerCase().includes(value.toLowerCase()) && o.toLowerCase() !== value.toLowerCase()).slice(0, 6) :
  options.slice(0, 6);

  return (
    <div className="field" ref={wrapRef}>
      <label className="field__label">{label}</label>
      {hint ? <span className="field__hint">{hint}</span> : null}
      <div className="field__autorow">
        <input
          className="text-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {onChange(e.target.value);setOpen(true);setHi(0);}}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {e.preventDefault();setHi((h) => Math.min(h + 1, matches.length - 1));} else
            if (e.key === "ArrowUp") {e.preventDefault();setHi((h) => Math.max(h - 1, 0));} else
            if (e.key === "Enter" && matches[hi]) {e.preventDefault();onChange(matches[hi]);setOpen(false);} else
            if (e.key === "Escape") setOpen(false);
          }} />
        
        {open && matches.length > 0 ?
        <div className="autolist">
            {matches.map((o, i) =>
          <button key={o} type="button" className={i === hi ? "active" : ""}
          onMouseEnter={() => setHi(i)}
          onClick={() => {onChange(o);setOpen(false);}}>
                <span className="pip" style={{ background: color || "var(--purple)" }} />{o}
              </button>
          )}
          </div> :
        null}
      </div>
    </div>);

}

/* ── College search (real autocomplete over colleges.json) ───────── */
function collegeMetaLine(c) {
  const bits = [];
  if (c.city && c.state) bits.push(c.city + ", " + c.state);else
  if (c.state) bits.push(c.state);
  if (c.control) bits.push(c.control);
  if (c.level) bits.push(c.level);
  return bits.join(" · ");
}

function rankColleges(list, q) {
  q = q.trim().toLowerCase();
  if (!q) return list.slice(0, 8);
  const scored = [];
  for (const c of list) {
    const name = (c.name || "").toLowerCase();
    const aliases = c.alias || [];
    let score = 99;
    if (name === q) score = 0;else
    if (name.startsWith(q)) score = 1;else
    if (aliases.some((a) => a === q)) score = 1;else
    if (aliases.some((a) => a.startsWith(q))) score = 2;else
    if (name.split(/[\s,–-]+/).some((w) => w.startsWith(q))) score = 3;else
    if (name.includes(q)) score = 4;else
    if (((c.city || "") + " " + (c.state || "")).toLowerCase().includes(q)) score = 5;
    if (score < 99) scored.push([score, c]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return scored.slice(0, 8).map((s) => s[1]);
}

function CollegeField({ label, value, meta, onPick, onEnter }) {
  const [db, setDb] = React.useState(window.__COLLEGES || null);
  const [query, setQuery] = React.useState(value || "");
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    if (window.__COLLEGES) {setDb(window.__COLLEGES);return;}
    let alive = true;
    fetch("colleges.json").
    then((r) => r.json()).
    then((d) => {window.__COLLEGES = d;if (alive) setDb(d);}).
    catch(() => {
      const fb = (typeof COLLEGES !== "undefined" ? COLLEGES : []).map((n) => ({ name: n, city: "", state: "", control: "", level: "" }));
      window.__COLLEGES = fb;if (alive) setDb(fb);
    });
    return () => {alive = false;};
  }, []);

  React.useEffect(() => {setQuery(value || "");}, [value]);

  React.useEffect(() => {
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = db ? rankColleges(db, query) : [];
  const showOther = query.trim().length > 0;
  const otherIdx = matches.length;

  const choose = (c) => {onPick(c.name, { id: c.id, city: c.city, state: c.state, control: c.control, level: c.level });setQuery(c.name);setOpen(false);};
  const chooseOther = () => {onPick(query.trim(), null);setOpen(false);};
  const onType = (v) => {setQuery(v);onPick(v, null);setOpen(true);setHi(0);};

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      // Enter = the Continue action. Commit the current pick (if the dropdown is
      // open) so the full college name is saved, then advance via onEnter. Works
      // whether the dropdown is open or already closed after a selection.
      e.preventDefault();
      if (!query.trim()) return;                 // empty input → don't continue
      if (open) {
        if (hi === otherIdx && showOther) chooseOther();
        else if (matches[hi]) choose(matches[hi]);
        else chooseOther();
      }
      if (onEnter) onEnter();
      return;
    }
    if (!open) {if (e.key === "ArrowDown") setOpen(true);return;}
    const max = showOther ? otherIdx : matches.length - 1;
    if (e.key === "ArrowDown") {e.preventDefault();setHi((h) => Math.min(h + 1, max));} else
    if (e.key === "ArrowUp") {e.preventDefault();setHi((h) => Math.max(h - 1, 0));} else
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="field" ref={wrapRef}>
      <label className="field__label">{label}</label>
      <span className="field__hint">Search 150+ U.S. colleges — (or add your own with “Other / not listed.”-some features will be limited)</span>
      <div className="field__autorow">
        <input
          className="text-input"
          placeholder={db ? "Start typing your school… (e.g. Berkeley, UCLA)" : "Loading colleges…"}
          value={query}
          autoComplete="off"
          onChange={(e) => onType(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown} />
        
        {open ?
        <div className="autolist col-list" role="listbox">
            {!db ?
          <div className="col-empty">Loading colleges…</div> :

          <React.Fragment>
                {matches.map((c, i) =>
            <button key={c.id || c.name} type="button" role="option" className={"col-opt" + (i === hi ? " active" : "")}
            onMouseEnter={() => setHi(i)} onClick={() => choose(c)}>
                    <span className="pip" style={{ background: c.control === "Private" ? "var(--purple)" : "var(--blue)" }} />
                    <span className="col-opt__txt">
                      <span className="col-opt__name">{c.name}</span>
                      <span className="col-opt__meta">{collegeMetaLine(c) || "United States"}</span>
                    </span>
                  </button>
            )}
                {showOther && matches.length === 0 ?
            <div className="col-empty">No matches in the list — add it manually below.</div> :
            null}
                {showOther ?
            <button type="button" className={"col-opt col-other" + (hi === otherIdx ? " active" : "")}
            onMouseEnter={() => setHi(otherIdx)} onClick={chooseOther}>
                    <span className="col-other__plus">+</span>
                    <span className="col-opt__txt">
                      <span className="col-opt__name">Use “{query.trim()}”</span>
                      <span className="col-opt__meta">Other / not listed</span>
                    </span>
                  </button> :
            null}
              </React.Fragment>
          }
          </div> :
        null}
      </div>
      {!open && value ?
      <div className="col-selected">
          <span className="col-selected__check">✓</span>
          <span>{meta ? collegeMetaLine(meta) : "Custom entry · not in the list"}</span>
        </div> :
      null}
    </div>);

}

/* ── Major search (real autocomplete over majors.json / CIP) ────── */
function majorMetaLine(m) {
  const bits = [];
  if (m.category) bits.push(m.category);
  if (m.cipCode) bits.push("CIP " + m.cipCode);
  return bits.join(" · ");
}

function rankMajors(list, q) {
  q = q.trim().toLowerCase();
  if (!q) return list.slice(0, 8);
  const scored = [];
  for (const m of list) {
    const name = (m.name || "").toLowerCase();
    const cat = (m.category || "").toLowerCase();
    const kws = (m.keywords || []).map((k) => k.toLowerCase());
    let score = 99;
    if (name === q) score = 0;else
    if (name.startsWith(q)) score = 1;else
    if (kws.some((k) => k === q)) score = 1;else
    if (kws.some((k) => k.startsWith(q))) score = 2;else
    if (name.split(/[\s,\/–-]+/).some((w) => w.startsWith(q))) score = 2;else
    if (name.includes(q)) score = 3;else
    if (kws.some((k) => k.includes(q))) score = 4;else
    if (cat.includes(q)) score = 5;
    if (score < 99) scored.push([score, m]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return scored.slice(0, 8).map((s) => s[1]);
}

function MajorField({ label, value, meta, onPick, onEnter }) {
  const [db, setDb] = React.useState(window.__MAJORS || null);
  const [query, setQuery] = React.useState(value || "");
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    if (window.__MAJORS) {setDb(window.__MAJORS);return;}
    let alive = true;
    fetch("majors.json").
    then((r) => r.json()).
    then((d) => {window.__MAJORS = d;if (alive) setDb(d);}).
    catch(() => {
      const fb = (typeof MAJORS !== "undefined" ? MAJORS : []).map((n) => ({ name: n, category: "", cipCode: "", keywords: [] }));
      window.__MAJORS = fb;if (alive) setDb(fb);
    });
    return () => {alive = false;};
  }, []);

  React.useEffect(() => {setQuery(value || "");}, [value]);

  React.useEffect(() => {
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = db ? rankMajors(db, query) : [];
  const showOther = query.trim().length > 0;
  const otherIdx = matches.length;

  const choose = (m) => {onPick(m.name, { cipCode: m.cipCode, category: m.category });setQuery(m.name);setOpen(false);};
  const chooseOther = () => {onPick(query.trim(), null);setOpen(false);};
  const onType = (v) => {setQuery(v);onPick(v, null);setOpen(true);setHi(0);};

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      // Enter = the Continue action. Commit the current pick (if the dropdown is
      // open) so the full major name is saved, then advance via onEnter. Works
      // whether the dropdown is open or already closed after a selection.
      e.preventDefault();
      if (!query.trim()) return;                 // empty input → don't continue
      if (open) {
        if (hi === otherIdx && showOther) chooseOther();
        else if (matches[hi]) choose(matches[hi]);
        else chooseOther();
      }
      if (onEnter) onEnter();
      return;
    }
    if (!open) {if (e.key === "ArrowDown") setOpen(true);return;}
    const max = showOther ? otherIdx : matches.length - 1;
    if (e.key === "ArrowDown") {e.preventDefault();setHi((h) => Math.min(h + 1, max));} else
    if (e.key === "ArrowUp") {e.preventDefault();setHi((h) => Math.max(h - 1, 0));} else
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="field" ref={wrapRef}>
      <label className="field__label">Some majors may not be covered, if so please choose something similar</label>
      <span className="field__hint">Search majors by name, field, or keyword (CS, pre-med, design…) — or add your own.</span>
      <div className="field__autorow">
        <input
          className="text-input"
          placeholder={db ? "Start typing your major… (e.g. Computer Science, pre-med)" : "Loading majors…"}
          value={query}
          autoComplete="off"
          onChange={(e) => onType(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown} />
        
        {open ?
        <div className="autolist col-list" role="listbox">
            {!db ?
          <div className="col-empty">Loading majors…</div> :

          <React.Fragment>
                {matches.map((m, i) =>
            <button key={m.name} type="button" role="option" className={"col-opt" + (i === hi ? " active" : "")}
            onMouseEnter={() => setHi(i)} onClick={() => choose(m)}>
                    <span className="pip" style={{ background: "var(--purple)" }} />
                    <span className="col-opt__txt">
                      <span className="col-opt__name">{m.name}</span>
                      <span className="col-opt__meta">{majorMetaLine(m) || "Field of study"}</span>
                    </span>
                  </button>
            )}
                {showOther && matches.length === 0 ?
            <div className="col-empty">No matching major — add it manually below.</div> :
            null}
                {showOther ?
            <button type="button" className={"col-opt col-other" + (hi === otherIdx ? " active" : "")}
            onMouseEnter={() => setHi(otherIdx)} onClick={chooseOther}>
                    <span className="col-other__plus">+</span>
                    <span className="col-opt__txt">
                      <span className="col-opt__name">Use “{query.trim()}”</span>
                      <span className="col-opt__meta">Other / not listed</span>
                    </span>
                  </button> :
            null}
              </React.Fragment>
          }
          </div> :
        null}
      </div>
      {!open && value ?
      <div className="col-selected">
          <span className="col-selected__check">✓</span>
          <span>{meta ? majorMetaLine(meta) : "Custom entry · not in the list"}</span>
        </div> :
      null}
    </div>);

}

function StudentContext({ ctx, setCtx, onContinue, onBack }) {
  // Identity (name / college / major) is collected in the pre-landing flow and
  // injected into ctx — so this step ONLY asks the remaining context questions
  // (stage, enrollment, intent) and never re-asks name, college, or major.
  const set = (k, v) => setCtx((c) => ({ ...c, [k]: v }));
  const [step, setStep] = React.useState(0);
  const TOTAL = 3;

  const valid = [ctx.stage, ctx.enrollment, ctx.intent];
  const canNext = !!valid[step];
  const isLast = step === TOTAL - 1;

  const goNext = () => {if (!canNext) return;isLast ? onContinue() : setStep(step + 1);};
  const goBack = () => {step === 0 ? onBack() : setStep(step - 1);};

  const OPTKEYS = ["A", "B", "C", "D", "E", "F"];
  const advanceSoon = () => {window.clearTimeout(advanceSoon._t);advanceSoon._t = window.setTimeout(() => setStep((s) => Math.min(s + 1, TOTAL - 1)), 240);};
  const pickAdv = (k, v) => {set(k, v);advanceSoon();};

  // A–F / 1–6 pick options; Enter advances
  React.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (e.key === "Enter") {
        if (canNext) {e.preventDefault();goNext();}
        return;
      }
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (!e.key || e.key.length !== 1) return;
      let idx = OPTKEYS.indexOf(e.key.toUpperCase());
      if (idx === -1 && e.key >= "1" && e.key <= "6") idx = +e.key - 1;
      if (idx < 0) return;
      if (step === 0 && STAGES[idx]) pickAdv("stage", STAGES[idx]);else
      if (step === 1 && ENROLLMENT[idx]) pickAdv("enrollment", ENROLLMENT[idx]);else
      if (step === 2 && INTENT[idx]) set("intent", INTENT[idx].key);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, canNext]);

  const steps = [
  {
    title: "Where are you in the process?",
    sub: "This frames whether your report leans toward choosing, staying, or switching.",
    body:
    <ul className="f-radios ctx-radios" role="listbox">
          {STAGES.map((s, i) =>
      <li key={s}>
              <button type="button" className={"f-radio" + (ctx.stage === s ? " selected" : "")} onClick={() => pickAdv("stage", s)}>
                <span className="f-key">{OPTKEYS[i]}</span>
                <span className="f-label">{s}</span>
                <span className="f-check">✓</span>
              </button>
            </li>
      )}
        </ul>

  },
  {
    title: "How are you enrolled?",
    sub: "Workload and burnout read differently depending on how much you're carrying.",
    body:
    <ul className="f-radios ctx-radios" role="listbox">
          {ENROLLMENT.map((s, i) =>
      <li key={s}>
              <button type="button" className={"f-radio" + (ctx.enrollment === s ? " selected" : "")} onClick={() => pickAdv("enrollment", s)}>
                <span className="f-key">{OPTKEYS[i]}</span>
                <span className="f-label">{s}</span>
                <span className="f-check">✓</span>
              </button>
            </li>
      )}
        </ul>

  },
  {
    title: "What are you trying to figure out?",
    sub: "Your report is written for the question you're actually asking.",
    body:
    <ul className="f-radios ctx-radios" role="listbox">
          {INTENT.map((o, i) =>
      <li key={o.key}>
              <button type="button" className={"f-radio f-radio--multi" + (ctx.intent === o.key ? " selected" : "")} onClick={() => set("intent", o.key)}>
                <span className="f-key">{OPTKEYS[i]}</span>
                <span className="f-radio__txt"><span className="f-label">{o.t}</span><span className="f-radio__sub">{o.d}</span></span>
                <span className="f-check">✓</span>
              </button>
            </li>
      )}
        </ul>

  }];


  const cur = steps[step];

  return (
    <div>
      <header className="vff-header">
        <div className="vff-brand">
          <span className="mark" />
          <span><b>Fit Beyond Interest</b><span>Major-fit quiz</span></span>
        </div>
        <button className="vff-exit" onClick={onBack}>← Home</button>
      </header>

      {ctx.college || ctx.major ?
      <div className="ctx-locked">
          <span className="ctx-locked__lbl">Your context</span>
          {ctx.displayName ? <span className="ctx-locked__chip">{ctx.displayName}</span> : null}
          {ctx.college ? <span className="ctx-locked__chip"><span className="pip" style={{ background: "var(--blue)" }} />{ctx.college}</span> : null}
          {ctx.major ? <span className="ctx-locked__chip"><span className="pip" style={{ background: "var(--purple)" }} />{ctx.major}</span> : null}
          <a className="ctx-locked__edit" href="start.html">Edit</a>
        </div> :
      null}

      <div className="qz ctx-qz">
        <div className="qz__inner q-anim" key={step}>
          <div className="q-tagline">
            <span className="pip" style={{ background: "var(--vff-purple)" }} />
            A bit of context
            <span className="n">· Step {step + 1} of {TOTAL}</span>
          </div>
          <h1 className="q-title">{cur.title}</h1>
          <p className="q-help">{cur.sub}</p>
          {cur.body}
          <div className="f-submit-row ctx-submit">
            <button className="btn-ghost" onClick={goBack}>← Back</button>
            <button className={"o-btn" + (canNext ? "" : " is-disabled")} onClick={goNext}>
              {isLast ? "Start the quiz" : "Continue"}<span className="k">↵</span>
            </button>
            <span className="f-enter-desc">press <b>Enter</b></span>
          </div>
        </div>
      </div>

      <footer className="vff-footer">
        <div className="vff-progress">
          <span>Step {step + 1} of {TOTAL}</span>
          <span className="f-progress-bar"><i style={{ width: (step + 1) / TOTAL * 100 + "%" }} /></span>
        </div>
        <div className="vff-nav">
          <button className="f-nav-btn" onClick={goBack} aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg></button>
          <button className={"f-nav-btn" + (canNext ? "" : " is-disabled")} onClick={goNext} aria-label="Continue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></button>
        </div>
      </footer>
    </div>);

}

Object.assign(window, { StudentContext, AutoField, CollegeField, MajorField });