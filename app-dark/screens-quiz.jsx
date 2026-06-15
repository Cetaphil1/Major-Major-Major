/* screens-quiz.jsx — paged quiz runtime (8 sections) */

function ScaleField({ question, section, value, onChange }) {
  const freq = section.scale === FREQ;
  return (
    <React.Fragment>
      <div className="scale-anchors"><span>{section.anchors[0]}</span><span>{section.anchors[1]}</span></div>
      <div className={"scale" + (freq ? " freq" : "")}>
        {section.scale.map((label, i) => (
          <button key={i} type="button"
            className={"scale-opt" + (value === i + 1 ? " selected" : "")}
            onClick={() => onChange(i + 1)}>
            <span className="num">{i + 1}</span>
            <span className="lbl">{label}</span>
          </button>
        ))}
      </div>
    </React.Fragment>
  );
}

function QuestionCard({ question, index, section, value, onChange }) {
  return (
    <article className={"q-card" + (value ? " answered" : "")}>
      <header className="q-card__head">
        <span className="q-card__idx">Q{String(index).padStart(2, "0")}<span className="req">*</span></span>
        <span className="q-card__flags">
          {question.reverse ? <Badge tone="yellow">Reverse-scored</Badge> : null}
        </span>
      </header>
      <h3 className="q-card__title">{question.text}</h3>
      <ScaleField question={question} section={section} value={value} onChange={onChange} />
    </article>
  );
}

function QuizRuntime({ sectionIdx, setSectionIdx, answers, setAnswers, onFinish, onExit }) {
  const section = SECTIONS[sectionIdx];
  const total = SECTIONS.length;

  const answeredAll = section.questions.every((q) => answers[q.id]);
  const answeredCount = Object.keys(answers).length;
  const pct = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const isLast = sectionIdx === total - 1;
  const dim = DIMENSIONS.find((d) => d.key === section.dim);

  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [sectionIdx]);

  const onAnswer = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const next = () => { if (!answeredAll) return; isLast ? onFinish() : setSectionIdx(sectionIdx + 1); };
  const back = () => { sectionIdx === 0 ? onExit() : setSectionIdx(sectionIdx - 1); };

  return (
    <div className="survey-app phase-in">
      <div className="survey-topbar">
        <div className="survey-topbar__inner">
          <div className="survey-topbar__row">
            <button className="survey-back" onClick={onExit}>← Exit</button>
            <span className="survey-step">
              Section <strong>{sectionIdx + 1}</strong> of <strong>{total}</strong>
              <span style={{ color: "var(--ink-4)", margin: "0 8px" }}>·</span>
              <span className="ttl">{section.title}</span>
            </span>
            <span className="survey-construct"><span className="pip" style={{ background: dim.color, boxShadow: "0 0 8px " + dim.color }} />{dim.short}</span>
          </div>
          <div className="survey-progress" aria-label={pct + "% complete"}><i style={{ width: pct + "%" }} /></div>
        </div>
      </div>

      <div className="survey-body" key={section.key}>
        <div className="survey-header">
          <div className="survey-header__meta"><span className="num">{String(section.number).padStart(2, "0")}</span><span>{section.title}</span></div>
          <h1>{section.title}</h1>
          <p>{section.subtitle}</p>
        </div>
        {section.questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i + 1} section={section} value={answers[q.id]} onChange={(v) => onAnswer(q.id, v)} />
        ))}
      </div>

      <div className="survey-footer">
        <div className="survey-footer__inner">
          <Button onClick={back}>← Back</Button>
          <div className="status">{section.questions.filter((q) => answers[q.id]).length}/{section.questions.length} this section</div>
          <div className="grow" />
          <Button variant="primary" arrow onClick={next} style={answeredAll ? {} : { opacity: 0.45, pointerEvents: "none" }}>{isLast ? "See my report" : "Next section"}</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { QuizRuntime, QuestionCard, ScaleField });
