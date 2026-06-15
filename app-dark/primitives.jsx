/* primitives.jsx — shared atoms for the Fit Beyond Interest UI kit */

function Mark({ size = 26, radius = 7 }) {
  return (
    <span className="mark" style={{ width: size, height: size, borderRadius: radius }} aria-hidden="true" />
  );
}

function Brand({ tagline = "Major-fit guidance · v2.1", small = false }) {
  return (
    <a href="#top" className="brand" style={{ fontSize: small ? 14 : 15 }}>
      <Mark />
      <span>
        Fit Beyond Interest
        {tagline ? <small>{tagline}</small> : null}
      </span>
    </a>
  );
}

function Button({ variant = "default", children, arrow, onClick, style, big }) {
  const cls = "btn" + (variant === "primary" ? " btn--primary" : variant === "ghost" ? " btn--ghost" : "");
  return (
    <button className={cls} onClick={onClick} style={{ ...(big ? { padding: "14px 22px", fontSize: 15 } : {}), ...style }}>
      {children}
      {arrow ? <span className="arrow">→</span> : null}
    </button>
  );
}

function Badge({ tone, children }) {
  return <span className={"badge" + (tone ? " badge--" + tone : "")}>{children}</span>;
}

function Pip({ color = "var(--blue)", size = 6, glow = true }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, boxShadow: glow ? "0 0 8px " + color : "none", flex: "0 0 auto", display: "inline-block" }} />;
}

/* A compact stepper that shows where the user is in the whole flow. */
function FlowSteps({ active }) {
  const steps = ["Intro", "About you", "Quiz", "Report"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase",
            color: i === active ? "var(--blue-bright)" : i < active ? "var(--ink-2)" : "var(--ink-4)",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i <= active ? "var(--blue-bright)" : "transparent",
              border: i <= active ? "0" : "1px solid var(--ink-4)",
              boxShadow: i === active ? "0 0 8px var(--blue-bright)" : "none",
            }} />
            {s}
          </span>
          {i < steps.length - 1 ? <span style={{ color: "var(--ink-4)", fontSize: 10 }}>·</span> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, { Mark, Brand, Button, Badge, Pip, FlowSteps });
