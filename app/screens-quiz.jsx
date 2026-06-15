/* screens-quiz.jsx — one-question-at-a-time runtime, vue-flow-form style.
   Flattens the 8 sections into a Typeform-like flow: a section-break screen
   introduces each section, then each Likert item is its own screen with
   numbered options (1–5). Keyboard: 1–5 to pick, Enter to advance. */

const KEYS = ["1", "2", "3", "4", "5", "6"];

/* Build the flat step list from SECTIONS (memo-free; it's cheap). */
function buildSteps() {
  const steps = [];
  let qNum = 0;
  SECTIONS.forEach((section, si) => {
    steps.push({ type: "section", section, si });
    section.questions.forEach((q) => {
      qNum += 1;
      steps.push({ type: "q", section, si, q, qNum });
    });
  });
  steps.push({ type: "complete" });
  return steps;
}

function UpArrow() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>); }
function DownArrow() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>); }

function SectionScreen({ step, total }) {
  const { section, si } = step;
  return (
    <div className="f-section" key={"sec" + si}>
      <div className="f-section__tag"><span className="bar" />Section {si + 1} of {total}</div>
      <h2 className="f-section__title">{section.title}</h2>
      <p className="f-section__desc">{section.subtitle}</p>
      <div className="f-section__dots" aria-hidden="true">
        {SECTIONS.map((_, i) => (
          <i key={i} className={i < si ? "on" : i === si ? "cur" : ""} />
        ))}
      </div>
      <div className="f-section__num"><b>{String(section.questions.length)}</b> quick questions in this part</div>
    </div>
  );
}

function QuestionScreen({ step, value, onPick }) {
  const { section, q, qNum } = step;
  const dim = DIMENSIONS.find((d) => d.key === section.dim);
  return (
    <div className="qz__inner q-anim" key={q.id}>
      <div className="q-tagline">
        <span className="pip" style={{ "--c": dim.color }} />
        {section.title}
        <span className="n">· {String(qNum).padStart(2, "0")} / {String(TOTAL_QUESTIONS).padStart(2, "0")}</span>
      </div>
      <h1 className="q-title">{q.text}</h1>
      <p className="q-help">Pick the answer that's most true for you — there are no wrong answers.</p>

      <ul className="f-radios" role="listbox">
        {section.scale.map((label, i) => {
          const selected = value === i + 1;
          return (
            <li key={i}>
              <button type="button" role="option" aria-selected={selected}
                className={"f-radio" + (selected ? " selected" : "")}
                onClick={() => onPick(i + 1)}>
                <span className="f-key">{KEYS[i]}</span>
                <span className="f-label">{label}</span>
                <span className="f-check">✓</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CompleteScreen() {
  return (
    <div className="f-section" key="complete">
      <div className="f-section__tag"><span className="bar" />All done</div>
      <h2 className="f-section__title">That's everything.</h2>
      <p className="f-section__desc">You've answered all {TOTAL_QUESTIONS} questions across the eight signals. Calculate your result to see where your major fit is strong, where the switching risk is, and what to do next.</p>
    </div>
  );
}

function QuizRuntime({ sectionIdx, setSectionIdx, answers, setAnswers, onFinish, onExit }) {
  const steps = buildSteps();
  const total = SECTIONS.length;
  // `sectionIdx` (persisted) is reused as the global step index.
  const stepIdx = Math.min(sectionIdx || 0, steps.length - 1);
  const step = steps[stepIdx];

  const answeredCount = SECTIONS.reduce((n, s) => n + s.questions.filter((q) => answers[q.id]).length, 0);
  const pct = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const isQ = step.type === "q";
  const isComplete = step.type === "complete";
  const curVal = isQ ? answers[step.q.id] : null;
  const canNext = !isQ || !!curVal;

  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [stepIdx]);

  const goTo = (i) => setSectionIdx(Math.max(0, Math.min(i, steps.length - 1)));
  const next = () => { if (canNext) goTo(stepIdx + 1); };
  const back = () => { if (stepIdx === 0) onExit(); else goTo(stepIdx - 1); };

  const pick = (v) => {
    setAnswers((a) => ({ ...a, [step.q.id]: v }));
    // auto-advance, vue-flow-form style
    window.clearTimeout(pick._t);
    pick._t = window.setTimeout(() => setSectionIdx((cur) => Math.min((cur || 0) + 1, steps.length - 1)), 320);
  };

  // keyboard
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "Enter") { e.preventDefault(); isComplete ? onFinish() : next(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); back(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); if (canNext) next(); return; }
      if (isQ && e.key && e.key.length === 1) {
        const up = e.key.toUpperCase();
        let idx = KEYS.indexOf(up);
        if (idx === -1 && e.key >= "1" && e.key <= "9") idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < step.section.scale.length) { e.preventDefault(); pick(idx + 1); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stepIdx, curVal, canNext, isQ, isComplete]);

  return (
    <div>
      <header className="vff-header">
        <div className="vff-brand">
          <span className="mark" />
          <span><b>Fit Beyond Interest</b><span>Major-fit quiz</span></span>
        </div>
        <button className="vff-exit" onClick={onExit}>Save &amp; exit</button>
      </header>

      <div className="qz">
        {step.type === "section" ? <SectionScreen step={step} total={total} /> : null}
        {isQ ? <QuestionScreen step={step} value={curVal} onPick={pick} /> : null}
        {isComplete ? <CompleteScreen /> : null}

        {/* Continue row — section breaks & the complete screen only.
            Questions auto-advance when an option is picked. */}
        {!isQ ? (
          <div className="qz__inner" style={{ maxWidth: 720 }}>
            <div className="f-submit-row">
              {isComplete ? (
                <button className="o-btn" onClick={onFinish}>Calculate my result<span className="k">↵</span></button>
              ) : (
                <button className={"o-btn" + (canNext ? "" : " is-disabled")} onClick={next}>
                  Start this section
                  <span className="k">↵</span>
                </button>
              )}
              <span className="f-enter-desc">press <b>Enter</b></span>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="vff-footer">
        <div className="vff-progress">
          <span>{pct}% completed</span>
          <span className="f-progress-bar"><i style={{ width: pct + "%" }} /></span>
        </div>
        <div className="vff-nav">
          <button className={"f-nav-btn" + (stepIdx === 0 ? " is-disabled" : "")} onClick={back} aria-label="Previous"><UpArrow /></button>
          <button className={"f-nav-btn" + (canNext ? "" : " is-disabled")} onClick={() => (isComplete ? onFinish() : next())} aria-label="Next"><DownArrow /></button>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { QuizRuntime });
