/* prelanding.jsx — Fit Beyond Interest PRE-LANDING flow.
   A Typeform-style 4-step experience a new visitor sees BEFORE the landing page:
     1. NameStep      — "What should we call you?"
     2. CollegeStep   — "What college are we looking at?"   (real autocomplete)
     3. MajorStep     — "What major are we judging?"        (real autocomplete)
     4. PreviewReport — an interactive College + Major preview report
   On finish, sets preLandingComplete=true and routes to index.html (the landing).
   Context is persisted via window.UserContext (localStorage). */

(function () {
  const { useState, useEffect, useRef } = React;
  const UC = window.UserContext;

  /* ── helpers ─────────────────────────────────────────────────── */
  // Enrich a picked major with keywords + related majors from the DB.
  // Robust against the DB not being loaded yet (e.g. revisiting to edit
  // context): falls back to the previously saved major so good metadata
  // is never clobbered by a degraded re-mount.
  function enrichMajor(name, meta) {
    const db = window.__MAJORS || [];
    const rec = db.find((m) => m.name.toLowerCase() === (name || "").toLowerCase());
    const prevSaved = UC.load().selectedMajor || {};
    const prev = prevSaved.name && prevSaved.name.toLowerCase() === (name || "").toLowerCase() ? prevSaved : {};
    const base = {
      name: name,
      category: meta && meta.category || rec && rec.category || prev.category || "",
      cipCode: meta && meta.cipCode || rec && rec.cipCode || prev.cipCode || "",
      keywords: rec && rec.keywords || prev.keywords || [],
      // a real pick supplies meta; only a true "Other" entry (no meta, no rec) is manual
      isManual: rec ? false : meta ? false : prev.isManual != null ? prev.isManual : true
    };
    base.relatedMajors = rec ? UC.relatedMajorsFor(rec, db, 5) : prev.relatedMajors || [];
    return base;
  }
  function mapCollege(name, meta) {
    if (!meta) return { name: name, isManual: true };
    return {
      name: name,
      city: meta.city || "",
      state: meta.state || "",
      type: meta.control || "",
      level: meta.level || "",
      id: meta.id || "",
      isManual: false
    };
  }
  const cityState = (c) => [c && c.city, c && c.state].filter(Boolean).join(", ");

  /* Real campus setting, size & notable programs for every college — sourced from
     U.S. News Best Colleges / IPEDS (fall 2024). Data lives in the plain-JS file
     app/college-snapshots.js (loaded before this script), keyed by college id.
     Schools not in the dataset fall back to an honest "Coming soon" placeholder. */
  const COLLEGE_SNAPSHOT = window.__COLLEGE_SNAPSHOTS || {};

  /* ── shared chrome ───────────────────────────────────────────── */
  function FlowChrome({ children, onExit }) {
    return (
      <header className="vff-header">
        <div className="vff-brand">
          <span className="mark" />
          <span><b>Fit Beyond Interest</b><span>Major-fit &amp; switching guidance</span></span>
        </div>
        <button className="vff-exit" onClick={onExit} style={{ fontWeight: "700", width: "150px", backgroundColor: "rgba(255, 255, 255, 0.26)" }}>{children || "Skip intro"}</button>
      </header>);

  }

  function StepFooter({ step, total, canNext, onBack, onNext }) {
    return (
      <footer className="vff-footer">
        <div className="vff-progress">
          <span>Preview {step + 1} of {total}</span>
          <span className="f-progress-bar"><i style={{ width: (step + 1) / total * 100 + "%" }} /></span>
        </div>
        <div className="vff-nav">
          <button className="f-nav-btn" onClick={onBack} aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg></button>
          <button className={"f-nav-btn" + (canNext ? "" : " is-disabled")} onClick={onNext} aria-label="Continue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></button>
        </div>
      </footer>);

  }

  /* ── STEP 1 · NAME ───────────────────────────────────────────── */
  function NameStep({ value, onChange, onContinue, onSkip }) {
    const ref = useRef(null);
    useEffect(() => {if (ref.current) ref.current.focus();}, []);
    return (
      <div className="qz__inner q-anim">
        <div className="q-tagline"><span className="pip" style={{ background: "var(--vff-purple)" }} />Let's set the scene</div>
        <h1 className="q-title">What should we call you?</h1>
        <p className="q-help">Use your first name, an alias, or anything you want the report to call you. It won't bite I promise:)
</p>
        <input ref={ref}
        className="pl-input"
        placeholder="Shelly, Big S, anonymous academic victim…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {if (e.key === "Enter") onContinue();}} />
        
        <div className="f-submit-row">
          <button className="o-btn" onClick={onContinue}>Continue<span className="k">↵</span></button>
          <button className="btn-ghost" onClick={onSkip}>Skip</button>
          <span className="f-enter-desc">press <b>Enter</b></span>
        </div>
      </div>);

  }

  /* ── STEP 2 · COLLEGE ────────────────────────────────────────── */
  function CollegeStep({ college, collegeMeta, onPick, onContinue, onBack }) {
    return (
      <div className="qz__inner q-anim">
        <div className="q-tagline"><span className="pip" style={{ background: "var(--blue)", borderRadius: "0px" }} />Let's set the scene</div>
        <h1 className="q-title">What college are we looking at?</h1>
        <p className="q-help">Search your current college, intended college, or the school you want the report to use, this report doesn't have everything yet:(</p>
        <div className="ctx-stepfield">
          <CollegeField label="College" value={college} meta={collegeMeta} onPick={onPick} onEnter={onContinue} />
        </div>
        <div className="f-submit-row ctx-submit">
          <button className="btn-ghost" onClick={onBack}>← Back</button>
          <button className={"o-btn" + (college && college.trim() ? "" : " is-disabled")} onClick={onContinue}>Continue<span className="k">↵</span></button>
          <span className="f-enter-desc">press <b>Enter</b></span>
        </div>
      </div>);

  }

  /* ── STEP 3 · MAJOR ──────────────────────────────────────────── */
  function MajorStep({ major, majorMeta, onPick, onContinue, onBack }) {
    return (
      <div className="qz__inner q-anim">
        <div className="q-tagline"><span className="pip" style={{ background: "var(--purple)" }} />The subject</div>
        <h1 className="q-title">What major are we judging?</h1>
        <p className="q-help">Pick the major you're in, considering, comparing, or at least of dreaming about taking when you get to college.</p>
        <div className="ctx-stepfield" style={{ lineHeight: "1.5", width: "720px", height: "50px" }}>
          <MajorField label="Major" value={major} meta={majorMeta} onPick={onPick} onEnter={onContinue} />
        </div>
        <div className="f-submit-row ctx-submit">
          <button className="btn-ghost" onClick={onBack}>← Back</button>
          <button className={"o-btn" + (major && major.trim() ? "" : " is-disabled")} onClick={onContinue}>See the quick read<span className="k">↵</span></button>
          <span className="f-enter-desc">press <b>Enter</b></span>
        </div>
      </div>);

  }

  /* ── PREVIEW REPORT cards ────────────────────────────────────── */
  function Chip({ label, value }) {
    return (
      <div className="pl-chip">
        <span className="pl-chip__k">{label}</span>
        <span className="pl-chip__v">{value}</span>
      </div>);

  }

  function StatCard({ label, value, sub, preview }) {
    return (
      <div className="pl-stat">
        <span className="pl-stat__k">{label}</span>
        <span className="pl-stat__v">{value}</span>
        {sub ? <span className="pl-stat__s">{sub}</span> : null}
        {preview ? <span className="pl-badge pl-badge--preview">Preview placeholder</span> : null}
      </div>);

  }

  function FitLens({ color, n, title, body }) {
    return (
      <div className="pl-lens" style={{ "--c": color }}>
        <span className="pl-lens__n">{n}</span>
        <h4 className="pl-lens__t">{title}</h4>
        <p className="pl-lens__b">{body}</p>
      </div>);

  }

  function ToolTeaser({ color, title, body, badge, badgeTone, onClick }) {
    return (
      <button className="pl-tool" style={{ "--c": color }} onClick={onClick}>
        <span className={"pl-badge pl-badge--" + badgeTone}>{badge}</span>
        <h4 className="pl-tool__t">{title}</h4>
        <p className="pl-tool__b">{body}</p>
        <span className="pl-tool__go">Open <span className="arrow">→</span></span>
      </button>);

  }

  /* ── STEP 4 · PREVIEW REPORT PAGE ────────────────────────────── */
  function PreviewReportPage({ name, college, major, confirmed, onConfirm, onChangeCollege, onChangeMajor, onContinue, onEditName, onSwitchMajor }) {
    const [toolMsg, setToolMsg] = useState(null);
    const [explore, setExplore] = useState(null);

    // Missing-data guard
    if (!college || !college.name || !major || !major.name) {
      const missing = !college || !college.name ? "college" : "major";
      return (
        <div className="pl-report">
          <div className="pl-missing">
            <div className="pl-missing__icon">!</div>
            <h2>We're missing your {missing}.</h2>
            <p>The quick read needs both your college and your major to frame the result. Let's grab your {missing} and come right back.</p>
            <button className="o-btn" onClick={missing === "college" ? onChangeCollege : onChangeMajor}>Add my {missing}</button>
          </div>
        </div>);

    }

    const displayName = (name || "").trim();
    const related = (major.relatedMajors || []).filter(Boolean);
    const collegeLoc = cityState(college);
    const collegeType = [college.type, college.level].filter(Boolean).join(" · ");
    const manualCollege = college.isManual;
    const snap = COLLEGE_SNAPSHOT[college.id];
    const manualMajor = major.isManual;

    return (
      <div className="pl-report">
        {/* hero */}
        <div className="pl-rhead">
          <span className="pl-eyebrow"><span className="pulse" />Quick read · preview, not a verdict</span>
          <h1 className="pl-h1">{displayName ? <>{displayName}, is this right?</> : "Is this right?"}</h1>
          <p className="pl-sub">Before the full quiz, we just want to make sure that this is accurate.</p>
        </div>

        {/* top summary card */}
        <div className="pl-summary">
          <div className="pl-chips">
            <Chip label="Name" value={displayName || "Anonymous"} />
            <Chip label="College" value={college.name} />
            <Chip label="Major" value={major.name} />
          </div>
          <p className="pl-summary__note"><span className="pl-dot" />If this isn't you, then change it in the change college option below, nerd.</p>
        </div>

        {/* SECTION 1 — confirm context */}
        <section className="pl-section">
          <div className="pl-sechead">
            <span className="pl-num">01</span>
            <h2>Is this the right setup?</h2>
          </div>
          <div className="pl-confirm">
            <div className="pl-card" style={{ height: "170px" }}>
              <div className="pl-card__tag"><span className="pip" style={{ background: "var(--blue)" }} />College</div>
              <div className="pl-card__name">{college.name}</div>
              <div className="pl-card__rows">
                {collegeLoc ? <span>{collegeLoc}</span> : null}
                {college.type ? <span>{college.type}</span> : null}
                {college.level ? <span>{college.level}</span> : null}
                {manualCollege ? <span className="pl-badge pl-badge--manual">Manual entry</span> : null}
              </div>
              <div className="pl-card__src">College data: local preview dataset</div>
            </div>
            <div className="pl-card" style={{ height: "170px" }}>
              <div className="pl-card__tag"><span className="pip" style={{ background: "var(--purple)" }} />Major</div>
              <div className="pl-card__name">{major.name}</div>
              <div className="pl-card__rows">
                {major.category ? <span>{major.category}</span> : null}
                {major.cipCode ? <span>CIP {major.cipCode}</span> : null}
                {(major.keywords || []).slice(0, 3).map((k) => <span key={k} className="pl-kw">{k}</span>)}
                {manualMajor ? <span className="pl-badge pl-badge--manual">Manual entry</span> : null}
              </div>
              <div className="pl-card__src">Major data: CIP-style preview dataset</div>
            </div>
          </div>
          <div className="pl-confirm__btns">
            <button className={"o-btn" + (confirmed ? " o-btn--done" : "")} onClick={onConfirm}>
              {confirmed ? <>✓ Context confirmed</> : "Yes, this is right"}
            </button>
            <button className="btn-ghost" onClick={onChangeCollege}>Change college</button>
            <button className="btn-ghost" onClick={onChangeMajor}>Change major</button>
          </div>
        </section>

        {/* SECTION 2 — college snapshot */}
        <section className="pl-section">
          <div className="pl-sechead"><span className="pl-num">02</span><h2>College snapshot</h2></div>
          <div className="pl-stats">
            <StatCard label="Location" value={collegeLoc || "—"} sub={manualCollege ? "From your manual entry" : "From preview dataset"} />
            <StatCard label="School type" value={collegeType || "Not listed"} sub={manualCollege ? "Manual entry" : "Real local data"} />
            <StatCard label="Campus setting" value={snap ? snap.setting : "Coming soon"} preview={!snap} />
            <StatCard label="Size" value={snap ? snap.size : "Coming soon"} sub={snap ? snap.sizeSub : undefined} preview={!snap} />
          </div>
          <div className="pl-known" style={{ backgroundColor: "rgb(255, 255, 255)" }}>
            <span className="pl-known__lbl">Known for</span>
            {snap && snap.knownFor ?
            <ul className="pl-known__list">{snap.knownFor.map((k) => <li key={k}>{k}</li>)}</ul> :
            <ul className="pl-known__list">
                  <li>Program strengths coming soon</li>
                  <li>Campus culture data coming soon</li>
                  <li>Student review summaries coming soon</li>
                </ul>}
            <p className="pl-note">{snap ?
              <>Campus setting &amp; size: {snap.url ?
                <a href={snap.url} target="_blank" rel="noopener noreferrer">{snap.src} Best Colleges</a> :
                <b>{snap.src}</b>}, fall 2024. Notable programs from university &amp; U.S. News profiles.</> :
              "More school-specific data can be added later. For now, we're using your selected college as context for the quiz."}</p>
          </div>
        </section>

        {/* SECTION 3 — major snapshot */}
        <section className="pl-section">
          <div className="pl-sechead"><span className="pl-num">03</span><h2>Major snapshot</h2></div>
          <div className="pl-stats">
            <StatCard label="Major" value={major.name} sub={manualMajor ? "Manual entry" : "From CIP-style dataset"} />
            <StatCard label="Academic field" value={major.category || "Not categorized"} sub={major.category ? "Broad category" : "Add a category later"} />
            <StatCard label="CIP code" value={major.cipCode || "—"} sub={major.cipCode ? "Classification of Instructional Programs" : "Not available"} />
            <StatCard label="Search keywords" value={(major.keywords || []).length ? major.keywords.slice(0, 4).join(", ") : "—"} sub="Used to match your major" />
          </div>
          <div className="pl-known" style={{ backgroundColor: "rgb(255, 254, 254)" }}>
            <span className="pl-known__lbl">Related majors</span>
            {related.length ?
            <React.Fragment>
                <span className="pl-related-hint">Curious about another path? Tap one to explore switching your major.</span>
                <div className="pl-related">
                  {related.map((m) => <button key={m} type="button" className="pl-relchip" onClick={() => setExplore(m)}>{m}<span className="arrow">→</span></button>)}
                </div>
                {explore ? function () {
                const db = window.__MAJORS || [];
                const rec = db.find((x) => x.name.toLowerCase() === explore.toLowerCase());
                const field = rec && rec.category;
                const cip = rec && rec.cipCode;
                return (
                  <div className="pl-explore">
                      <div className="pl-explore__head">
                        <span className="pl-explore__eyebrow">Explore a switch</span>
                        <button type="button" className="pl-explore__close" aria-label="Close" onClick={() => setExplore(null)}>×</button>
                      </div>
                      <h4 className="pl-explore__name">{explore}</h4>
                      <div className="pl-explore__meta">
                        {field ? <span>{field}</span> : null}
                        {cip ? <span>CIP {cip}</span> : null}
                        {!field && !cip ? <span>Field of study</span> : null}
                      </div>
                      <p className="pl-explore__note">Make this your major and we'll re-frame the preview around it — your college stays the same.</p>
                      <div className="pl-explore__btns">
                        <button className="o-btn" onClick={() => {onSwitchMajor(explore);setExplore(null);}}>Switch to {explore}</button>
                        <button className="btn-ghost" onClick={() => setExplore(null)}>Keep {major.name}</button>
                      </div>
                    </div>);

              }() : null}
              </React.Fragment> :

            <p className="pl-note">No adjacent fields mapped yet for this major — we'll surface related majors here as the dataset grows.</p>
            }
          </div>
        </section>

        {/* SECTION 7 — continue CTA */}
        <section className="pl-cta" style={{ height: "300px" }}>
          <h2>Ready for the actual read?</h2>
          <div className="pl-cta__btns">
            <button className="o-btn o-btn--lg" onClick={onContinue}>Continue to main page<span className="arrow">→</span></button>
            <div className="pl-edit">
              <span>Edit context:</span>
              <button onClick={onEditName}>Name</button>
              <button onClick={onChangeCollege}>College</button>
              <button onClick={onChangeMajor}>Major</button>
            </div>
          </div>
          <div className="pl-cta__fine" style={{ height: "0px" }}>{confirmed ? "Context setup complete" : "Preview 4 of 4"} · saved on this device</div>
        </section>
      </div>);

  }

  /* ── controller ──────────────────────────────────────────────── */
  function PreLandingFlow() {
    const saved = UC.load();
    const [step, setStep] = useState(0);
    const [name, setName] = useState(saved.displayName || "");
    const [college, setCollege] = useState(saved.selectedCollege ? saved.selectedCollege.name : "");
    const [collegeMeta, setCollegeMeta] = useState(saved.selectedCollege && !saved.selectedCollege.isManual ?
    { id: saved.selectedCollege.id, city: saved.selectedCollege.city, state: saved.selectedCollege.state, control: saved.selectedCollege.type, level: saved.selectedCollege.level } : null);
    const [major, setMajor] = useState(saved.selectedMajor ? saved.selectedMajor.name : "");
    const [majorMeta, setMajorMeta] = useState(saved.selectedMajor && !saved.selectedMajor.isManual ?
    { cipCode: saved.selectedMajor.cipCode, category: saved.selectedMajor.category } : null);
    const [confirmed, setConfirmed] = useState(saved.contextConfirmed || false);

    // persist whenever identity changes
    useEffect(() => {
      UC.update({
        displayName: name.trim() ? name.trim() : null,
        selectedCollege: college.trim() ? mapCollege(college.trim(), collegeMeta) : null,
        selectedMajor: major.trim() ? enrichMajor(major.trim(), majorMeta) : null,
        contextConfirmed: confirmed
      });
    }, [name, college, collegeMeta, major, majorMeta, confirmed]);

    const TOTAL = 4;
    const go = (s) => {window.scrollTo({ top: 0, behavior: "auto" });setStep(s);};

    const finish = () => {
      UC.update({ preLandingComplete: true, contextConfirmed: true });
      window.location.href = "index.html";
    };
    const skipIntro = () => {
      // honest skip: mark complete, leave whatever's filled, go to landing
      UC.update({ preLandingComplete: true });
      window.location.href = "index.html";
    };

    const builtCollege = college.trim() ? mapCollege(college.trim(), collegeMeta) : null;
    const builtMajor = major.trim() ? enrichMajor(major.trim(), majorMeta) : null;

    // step 4 is the long report — different chrome (no centered qz, no footer nav)
    if (step === 3) {
      return (
        <div>
          <FlowChrome onExit={skipIntro}>Skip to landing</FlowChrome>
          <PreviewReportPage
            name={name} college={builtCollege} major={builtMajor} confirmed={confirmed}
            onConfirm={() => setConfirmed(true)}
            onChangeCollege={() => go(1)}
            onChangeMajor={() => go(2)}
            onEditName={() => go(0)}
            onSwitchMajor={(n) => {
              const db = window.__MAJORS || [];
              const rec = db.find((m) => m.name.toLowerCase() === n.toLowerCase());
              setMajor(n);
              setMajorMeta(rec ? { cipCode: rec.cipCode, category: rec.category } : null);
            }}
            onContinue={finish} />
          
        </div>);

    }

    let body, canNext;
    if (step === 0) {
      canNext = true;
      body = <NameStep value={name} onChange={setName} onContinue={() => go(1)} onSkip={() => {setName("");go(1);}} />;
    } else if (step === 1) {
      canNext = !!college.trim();
      body = <CollegeStep college={college} collegeMeta={collegeMeta}
      onPick={(n, m) => {setCollege(n);setCollegeMeta(m);}}
      onContinue={() => college.trim() && go(2)} onBack={() => go(0)} />;
    } else {
      canNext = !!major.trim();
      body = <MajorStep major={major} majorMeta={majorMeta}
      onPick={(n, m) => {setMajor(n);setMajorMeta(m);}}
      onContinue={() => major.trim() && go(3)} onBack={() => go(1)} />;
    }

    return (
      <div>
        <FlowChrome onExit={skipIntro}>Skip intro</FlowChrome>
        <div className="qz ctx-qz">{body}</div>
        <StepFooter step={step} total={TOTAL} canNext={canNext}
        onBack={() => go(Math.max(0, step - 1))}
        onNext={() => {if (canNext) go(step + 1);}} />
      </div>);

  }

  ReactDOM.createRoot(document.getElementById("root")).render(<PreLandingFlow />);
})();