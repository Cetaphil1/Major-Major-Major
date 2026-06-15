/* research.jsx — the reusable "college research system" components.
   Light report theme. Fed by window.Research (research-data.js). Every data
   point carries an honest status; outbound links open official tools or public
   searches — nothing is scraped. Exported to window for screens-report.jsx. */

/* ── DataStatusBadge ─────────────────────────────────────────── */
const RS_STATUS_CLASS = {
  "Official source": "official",
  "Loaded": "loaded",
  "Research link": "research",
  "Preview": "preview",
  "Estimated": "estimated",
  "Needs source": "needs",
  "Coming later": "later",
};
function DataStatusBadge({ status }) {
  const k = RS_STATUS_CLASS[status] || "later";
  return <span className={"rs-status rs-status--" + k}><span className="dot" />{status}</span>;
}

function RSWarning({ text }) {
  if (!text) return null;
  return (
    <div className="rs-warn">
      <span className="rs-warn__icon">!</span>
      <p>{text}</p>
    </div>
  );
}

function RSection({ eyebrow, eyebrowColor, title, sub, children, style }) {
  return (
    <section className="card" style={{ marginBottom: 16, ...style }}>
      <div className="rs-sec__head">
        <span className="rs-eyebrow"><span className="pip" style={{ background: eyebrowColor || "var(--purple)" }} />{eyebrow}</span>
        <h3 className="rs-sec__title">{title}</h3>
        {sub ? <p className="rs-sec__sub">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* ── ResearchLinks ───────────────────────────────────────────── */
function ResearchLinks({ links }) {
  return (
    <div className="rs-links">
      {links.map((l) => (
        <a key={l.id} className="rs-link" href={l.url} target="_blank" rel="noopener noreferrer">
          <div className="rs-link__body">
            <div className="rs-link__top">
              <span className="rs-link__label">{l.label}</span>
              <DataStatusBadge status={l.status} />
            </div>
            {l.note ? <p className="rs-link__note">{l.note}</p> : null}
          </div>
          <span className="rs-link__arrow">→</span>
        </a>
      ))}
    </div>
  );
}

/* ── CollegeProfileCard ──────────────────────────────────────────
   Demo schools show curated figures; ALL other schools fetch the SAME stat
   grid live from College Scorecard (research-data.js). Falls back to official
   links only if the API can't match the school. */
function CollegeStatGrid({ stats }) {
  return (
    <div className="rs-stats">
      {stats.map((s, i) => (
        <div key={i} className="rs-stat">
          <div className="rs-stat__v">{s.value}</div>
          <div className="rs-stat__l">{s.label}</div>
          {s.sub ? <div className="rs-stat__s">{s.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

function CollegeProfileCard({ ctx, major }) {
  const rec = ctx.record;
  const prof = ctx.profile;
  const name = prof ? prof.name : ((rec && rec.name) || ctx.college);
  const sub = prof
    ? [prof.control, prof.level, prof.location].filter(Boolean).join(" · ")
    : (rec ? [rec.control, rec.level, [rec.city, rec.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") : "");

  // Live Scorecard fetch for non-demo schools.
  const [live, setLive] = React.useState(prof ? "demo" : "loading");
  const [liveData, setLiveData] = React.useState(null);
  const [liveErr, setLiveErr] = React.useState(null);
  React.useEffect(() => {
    if (prof) return;
    let alive = true;
    setLive("loading"); setLiveData(null); setLiveErr(null);
    window.Research.scorecardFor(name).then((v) => {
      if (!alive) return;
      if (v && v.stats && v.stats.length) { setLiveData(v); setLive("ok"); }
      else { setLiveErr(v && v.error); setLive("none"); }
    });
    return () => { alive = false; };
  }, [name]);

  const homepage = prof ? prof.homepage : (liveData && liveData.homepage);
  const homeUrl = homepage || ("https://www.google.com/search?q=" + encodeURIComponent((name || "") + " official website"));
  const scorecard = "https://collegescorecard.ed.gov/search/?search=" + encodeURIComponent(name || "");
  const navigator = "https://nces.ed.gov/collegenavigator/?q=" + encodeURIComponent(name || "");

  const sourceLabel = prof ? prof.sourceLabel
    : (liveData ? ("College Scorecard · matched “" + liveData.matched + "”") : "");
  const stats = prof ? prof.stats : (liveData ? liveData.stats : []);

  return (
    <RSection eyebrow="College snapshot" eyebrowColor="var(--blue)" title={name} sub={sub}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <a className="rs-chiplink" href={homeUrl} target="_blank" rel="noopener noreferrer">
          {homepage ? "Official homepage" : "Find homepage"} →
        </a>
        <a className="rs-chiplink" href={scorecard} target="_blank" rel="noopener noreferrer">College Scorecard →</a>
        {(prof || liveData) ? <span className="rs-source"><DataStatusBadge status="Official source" /> {sourceLabel}</span> : null}
      </div>

      {(prof || live === "ok") ? (
        <>
          <CollegeStatGrid stats={stats} />
          <div className="rs-outcome">
            <span className="pip" style={{ background: "var(--green)" }} />
            <span>Earnings shown are school-wide. See <b>{major}</b>-specific median earnings in College Scorecard's Fields of Study.</span>
            <a className="rs-chiplink" href={scorecard} target="_blank" rel="noopener noreferrer">{major} earnings →</a>
          </div>
          {prof ? <><p className="rs-sec__sub" style={{ marginTop: 16 }}>{prof.reputation}</p><div><DataStatusBadge status={prof.reputationStatus} /></div></> : null}
        </>
      ) : live === "loading" ? (
        <div className="rs-stats">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="rs-stat rs-stat--skel" />)}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            {[
              { label: "Type", value: rec ? [rec.control, rec.level].filter(Boolean).join(" · ") || "—" : "—", status: "Loaded" },
              { label: "Location", value: rec ? [rec.city, rec.state].filter(Boolean).join(", ") || "—" : "—", status: "Loaded" },
            ].map((f, i) => (
              <div key={i} className="area-row">
                <span className="nm" style={{ color: "var(--ink-3)", flex: "0 0 auto", minWidth: 120, fontSize: 13 }}>{f.label}</span>
                <span className="nm" style={{ fontSize: 14 }}>{f.value}</span>
                <DataStatusBadge status={f.status} />
              </div>
            ))}
          </div>
          <div className="rs-empty" style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DataStatusBadge status={liveErr === "rate" ? "Coming later" : "Needs source"} />
              <span>{liveErr === "rate"
                ? <>Live College Scorecard data is temporarily rate-limited (shared demo key). Add a free API key to enable it for <b>{name}</b>, or pull the figures directly:</>
                : <>Couldn't auto-match <b>{name}</b> in College Scorecard — pull the official figures directly:</>}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="rs-chiplink" href={scorecard} target="_blank" rel="noopener noreferrer">College Scorecard →</a>
              <a className="rs-chiplink" href={navigator} target="_blank" rel="noopener noreferrer">NCES College Navigator →</a>
            </div>
          </div>
        </>
      )}
    </RSection>
  );
}

/* ── SimilarMajors ───────────────────────────────────────────── */
function SimilarMajors({ data, major }) {
  return (
    <RSection
      eyebrow="Similar majors" eyebrowColor="var(--purple)"
      title={"Majors related to " + major}
      sub="Related academic options to compare — not recommendations. The right move depends on your own fit signals, not this list."
    >
      <div style={{ marginBottom: 14 }}><DataStatusBadge status={data.status} /></div>
      {data.list.length ? (
        <div className="rs-majors">
          {data.list.map((m) => (
            <div key={m.name} className="rs-major">
              <span className="rs-major__n"><span className="pip" style={{ background: "var(--purple)" }} />{m.name}</span>
              {m.relation ? <p className="rs-major__r">{m.relation}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rs-empty"><DataStatusBadge status="Needs source" /> No similar-major mapping for {major} yet.</div>
      )}
    </RSection>
  );
}

/* ── SchoolVsMajor ───────────────────────────────────────────── */
const RS_SVM_ROWS = [
  { c: "var(--pink)", t: "The school environment", d: "The campus, size, or culture may be the strain — not the field itself. The same major can feel different elsewhere." },
  { c: "var(--blue)", t: "The major itself", d: "The subject matter may no longer pull you in. That's different from being tired or overworked." },
  { c: "var(--purple)", t: "The professors & courses", d: "A few specific instructors or required courses can sour a whole major. Often fixable by re-sequencing." },
  { c: "var(--yellow)", t: "The workload & pace", d: "The volume and deadlines, not the ideas, may be grinding you down. A lighter term can test this." },
  { c: "var(--green)", t: "An unclear career path", d: "Not seeing where the degree leads can drain motivation even when you like the work." },
  { c: "var(--pink-deep)", t: "Belonging", d: "Feeling like an outsider in the field is one of the strongest predictors of leaving." },
  { c: "var(--blue-bright)", t: "Advising & support", d: "Weak advising or support can make a workable major feel impossible. Worth testing before deciding." },
];
function SchoolVsMajor() {
  return (
    <RSection
      eyebrow="Diagnose" eyebrowColor="var(--pink)"
      title="Is it the school, the major, or both?"
      sub="Before deciding anything, separate the possible problems. These are prompts to reflect on — not measured signals. Live scoring connects to your quiz answers later."
    >
      <div className="rs-svm">
        {RS_SVM_ROWS.map((r) => (
          <div key={r.t} className="rs-svm__row">
            <span className="rs-svm__pip" style={{ background: r.c }} />
            <div className="rs-svm__body">
              <div className="rs-svm__top">
                <span className="rs-svm__t">{r.t}</span>
                <DataStatusBadge status="Preview" />
              </div>
              <p className="rs-svm__d">{r.d}</p>
            </div>
          </div>
        ))}
      </div>
    </RSection>
  );
}

/* ── ProfessorResearchLinks ──────────────────────────────────── */
function ProfessorResearchLinks({ category }) {
  if (!category) return null;
  return (
    <RSection
      eyebrow="Professors & courses" eyebrowColor="var(--purple-deep)"
      title={category.title} sub={category.blurb}
    >
      <RSWarning text={category.warning} />
      <ResearchLinks links={category.links} />
    </RSection>
  );
}

/* generic category section (official / rankings / campus) */
function LinkCategory({ category, eyebrow, eyebrowColor }) {
  if (!category) return null;
  return (
    <RSection eyebrow={eyebrow} eyebrowColor={eyebrowColor} title={category.title} sub={category.blurb}>
      <RSWarning text={category.warning} />
      <ResearchLinks links={category.links} />
    </RSection>
  );
}

/* ── NearbyCollegeComparison ─────────────────────────────────── */
const RS_OFFERS = {
  likely: { label: "Likely offers this major", color: "var(--green)" },
  similar: { label: "Likely offers a similar major", color: "var(--yellow)" },
  unknown: { label: "Offering unknown", color: "var(--ink-4)" },
};
function NearbyCollegeComparison({ nearby, college, major }) {
  const list = (nearby && nearby.list) || [];
  return (
    <RSection
      eyebrow="Nearby comparison" eyebrowColor="var(--green)"
      title="Nearby colleges to compare"
      sub="Hand-picked regional schools — distance is not calculated, and whether each offers your major is a guess until connected to real program data."
    >
      <div style={{ marginBottom: 14 }}><DataStatusBadge status="Preview" /></div>
      {list.length ? (
        <div className="rs-nearby">
          {list.map((n) => {
            const off = RS_OFFERS[n.offers] || RS_OFFERS.unknown;
            const enc = encodeURIComponent(n.name);
            const site = n.domain ? "https://" + n.domain : "https://www.google.com/search?q=" + enc + "+official+website";
            const scorecard = "https://collegescorecard.ed.gov/search/?search=" + enc;
            const maps = "https://www.google.com/maps/search/" + enc;
            const ranking = "https://www.google.com/search?q=" + encodeURIComponent(n.name + " ranking " + major);
            return (
              <div key={n.name} className="rs-ncard">
                <div className="rs-ncard__head">
                  <div>
                    <div className="rs-ncard__n">{n.name}</div>
                    <div className="rs-ncard__meta">{n.location} · {n.type}{n.distanceNote ? " · " + n.distanceNote : ""}</div>
                  </div>
                </div>
                <div className="rs-ncard__offers">
                  <span className="pip" style={{ background: off.color }} />{off.label}
                </div>
                <div className="rs-ncard__links">
                  <a className="rs-chiplink" href={site} target="_blank" rel="noopener noreferrer">Website</a>
                  <a className="rs-chiplink" href={scorecard} target="_blank" rel="noopener noreferrer">Scorecard</a>
                  <a className="rs-chiplink" href={ranking} target="_blank" rel="noopener noreferrer">Ranking</a>
                  <a className="rs-chiplink" href={maps} target="_blank" rel="noopener noreferrer">Map</a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rs-empty">
          <DataStatusBadge status="Needs source" />
          No regional list for {college} yet —
          <a className="rs-chiplink" href={"https://www.google.com/search?q=" + encodeURIComponent("colleges near " + college + " with " + major)} target="_blank" rel="noopener noreferrer">search nearby colleges</a>
        </div>
      )}
    </RSection>
  );
}

/* ── ResearchCenter — orchestrator ───────────────────────────── */
function ResearchCenter({ college, major }) {
  const [state, setState] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    window.Research.load().then(() => {
      if (!alive) return;
      const ctx = window.Research.contextFor(college, major);
      setState({
        ctx,
        cats: window.Research.buildCategories(ctx),
        similar: window.Research.similarMajorsFor(major),
        nearby: window.Research.nearbyFor(ctx.collegeId),
      });
    });
    return () => { alive = false; };
  }, [college, major]);

  if (!state) return <div className="rs"><div className="rs-loading">Loading your research center…</div></div>;

  const cat = (id) => state.cats.find((c) => c.id === id);

  return (
    <div className="rs">
      <CollegeProfileCard ctx={state.ctx} major={major} />
      <LinkCategory category={cat("official")} eyebrow="Official sources" eyebrowColor="var(--blue)" />
      <SchoolVsMajor />
      <SimilarMajors data={state.similar} major={major} />
      <LinkCategory category={cat("rankings")} eyebrow="Rankings" eyebrowColor="var(--yellow)" />
      <ProfessorResearchLinks category={cat("professors")} />
      <LinkCategory category={cat("campus")} eyebrow="Campus & location" eyebrowColor="var(--pink)" />
      <NearbyCollegeComparison nearby={state.nearby} college={college} major={major} />
    </div>
  );
}

Object.assign(window, {
  DataStatusBadge, ResearchLinks, CollegeProfileCard, SimilarMajors,
  SchoolVsMajor, ProfessorResearchLinks, LinkCategory, NearbyCollegeComparison, ResearchCenter,
});
