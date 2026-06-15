// iceberg.jsx — embedded animated sequence for "Fit Beyond Interest"
// Mounts into #iceberg-mount. Loops. Below-water labels surface in sequence.

(function () {
  const { useRef, useEffect, useState } = React;

  // ─── Constants ──────────────────────────────────────────────────────────
  const W = 1280;
  const H = 720;
  // The reference photo, rendered at stage width. Native 1386×1142.
  const IMG = 'assets/iceberg.png';
  const IMG_W = 1280;
  const IMG_H = Math.round(1280 * 1142 / 1386); // ≈ 1055
  const PAN_MAX = IMG_H - H;     // vertical travel from tip view → deep view
  const STAGE_DUR = 14;          // seconds, loops

  // Labels under water — positioned in image space (0..IMG_W, 0..IMG_H),
  // they pan with the photo. Appear in sequence as the camera descends.
  const DEEP_LABELS = [
    { t: 3.2, x: 470, y: 440, text: 'WORKLOAD FIT',          key: 'workload-fit',          color: '#7DA8FF' },
    { t: 3.7, x: 775, y: 475, text: 'STRESS TOLERANCE',      key: 'stress-tolerance',      color: '#A78BFA' },
    { t: 4.2, x: 600, y: 560, text: 'MOTIVATION QUALITY',    key: 'motivation-quality',    color: '#A78BFA' },
    { t: 4.7, x: 850, y: 600, text: 'BEHAVIORAL ENGAGEMENT', key: 'behavioral-engagement', color: '#7DA8FF' },
    { t: 5.2, x: 445, y: 665, text: 'BELONGING',             key: 'belonging',             color: '#F472B6' },
    { t: 5.7, x: 705, y: 695, text: 'IDENTITY FIT',          key: 'identity-fit',          color: '#F472B6' },
    { t: 6.3, x: 575, y: 805, text: 'RESILIENCE',            key: 'resilience',            color: '#4ADE80' },
    { t: 6.9, x: 695, y: 905, text: 'SWITCH RISK',           key: 'switch-risk',           color: '#FBBF24' },
  ];

  // ─── Panning photo layer (photo + tip label + deep labels) ──────────────
  // The whole layer is the photo at stage width; the camera holds on the
  // above-water tip, then descends to reveal the underwater mass. The labels
  // live inside this layer so they travel with the ice they point to.
  function PhotoLayer({ discovered, onClick }) {
    const { time } = Animations.useTimeline();
    // Hold on tip (0–2s) → descend to deep (2–5.5s) → hold → rise back before loop
    const panY = Animations.interpolate(
      [0, 2.0, 5.5, 11.5, 13.4],
      [0, 0, -PAN_MAX, -PAN_MAX, 0],
      Animations.Easing.easeInOutCubic
    )(time);

    return (
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: IMG_W, height: IMG_H,
        transform: `translateY(${panY}px)`,
        willChange: 'transform',
      }}>
        <img
          src={IMG}
          alt="Iceberg — a small tip above the waterline, a far larger mass below."
          width={IMG_W}
          height={IMG_H}
          style={{ display: 'block', width: IMG_W, height: IMG_H, userSelect: 'none' }}
          draggable={false}
        />
        {/* Above-water label, pinned to the tip */}
        <TipLabel />
        {/* Below-water labels */}
        {DEEP_LABELS.map((d, i) => (
          <DeepLabel
            key={i}
            data={d}
            discovered={discovered.has(d.key)}
            onClick={onClick}
          />
        ))}
      </div>
    );
  }

  // ─── Above-water label (pinned near the tip, in image space) ─────────────
  function TipLabel() {
    const time = Animations.useTime();
    const op = Animations.interpolate([0, 0.4, 1.1], [0, 0, 1], Animations.Easing.easeOutCubic)(time);
    const ty = (1 - op) * 8;
    return (
      <div style={{
        position: 'absolute',
        left: 820, top: 120,
        opacity: op,
        transform: `translateY(${ty}px)`,
        display: 'flex', flexDirection: 'column', gap: 6,
        textAlign: 'left',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, letterSpacing: '0.14em',
          color: '#CADBFF', textTransform: 'uppercase',
          textShadow: '0 1px 10px rgba(0,0,0,0.5)',
        }}>What quizzes measure</div>
        <div style={{
          fontFamily: 'Inter Tight, Inter, sans-serif',
          fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em',
          color: '#FFFFFF',
          textShadow: '0 2px 18px rgba(0,0,0,0.55)',
        }}>Interest</div>
        <div style={{
          width: 80, height: 2, background: '#5B8DEF', opacity: 0.85,
          boxShadow: '0 0 10px #5B8DEF',
        }} />
      </div>
    );
  }

  // ─── Below-water label (one trait) ───────────────────────────────────────
  function DeepLabel({ data, discovered, onClick }) {
    const time = Animations.useTime();
    const local = time - data.t;
    if (local < 0) return null;
    const op = Math.min(1, local / 0.5);
    const ty = (1 - op) * 10;

    return (
      <button
        type="button"
        onClick={() => onClick(data.key)}
        aria-label={`Reveal ${data.text} in the legend`}
        style={{
          position: 'absolute',
          left: data.x, top: data.y,
          transform: `translate(-50%, ${ty}px)`,
          opacity: op,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          background: 'transparent',
          border: 0, padding: 6,
          margin: 0,
          cursor: 'pointer',
          pointerEvents: 'auto',
          font: 'inherit', color: 'inherit',
          transition: 'transform 0.18s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = `translate(-50%, ${ty - 2}px) scale(1.05)`; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = `translate(-50%, ${ty}px)`; }}
      >
        <div style={{
          width: discovered ? 20 : 16,
          height: discovered ? 20 : 16,
          borderRadius: '50%',
          background: discovered ? data.color : 'rgba(3,8,20,0.55)',
          border: `2.5px solid ${data.color}`,
          boxShadow: discovered
            ? `0 0 22px ${data.color}, 0 0 0 5px ${data.color}33, 0 0 0 1px rgba(0,0,0,0.5)`
            : `0 0 16px ${data.color}, 0 0 0 1px rgba(0,0,0,0.55)`,
          transition: 'all 0.22s ease',
        }} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14, letterSpacing: '0.08em',
          color: discovered ? '#FFFFFF' : data.color,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          fontWeight: 600,
          padding: '5px 11px',
          borderRadius: 7,
          background: 'rgba(3,7,16,0.78)',
          border: `1px solid ${data.color}`,
          boxShadow: discovered ? `0 0 14px ${data.color}55` : '0 2px 10px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
        }}>{data.text}</div>
      </button>
    );
  }

  // ─── Caption (bottom strip) ──────────────────────────────────────────────
  function Caption() {
    const time = Animations.useTime();

    let text = '';
    let op = 0;

    if (time >= 0.6 && time < 2.6) {
      text = 'Most quizzes stop here.';
      op = Math.min(1, (time - 0.6) / 0.4) * (1 - Math.max(0, (time - 2.2) / 0.4));
    } else if (time >= 2.6 && time < 8.0) {
      text = 'Real fit lives below the surface.';
      op = Math.min(1, (time - 2.6) / 0.4) * (1 - Math.max(0, (time - 7.5) / 0.4));
    } else if (time >= 8.0) {
      text = 'Eight signals that predict whether students stay.';
      op = Math.min(1, (time - 8.0) / 0.5);
    }
    op = Math.max(0, Math.min(1, op));

    return (
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 44,
        textAlign: 'center',
        opacity: op,
        transition: 'opacity 0.25s',
      }}>
        <div style={{
          display: 'inline-block',
          fontFamily: 'Inter Tight, Inter, sans-serif',
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: '-0.012em',
          color: '#ECEEF5',
          padding: '11px 20px',
          background: 'rgba(8,11,20,0.7)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 999,
        }}>{text}</div>
      </div>
    );
  }

  // ─── HUD: top-left diagnostic mark ───────────────────────────────────────
  function HUD() {
    return (
      <div style={{
        position: 'absolute', left: 32, top: 32,
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10.5, letterSpacing: '0.14em',
        color: '#7A8197', textTransform: 'uppercase',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5B8DEF', boxShadow: '0 0 8px #5B8DEF' }} />
        Iceberg model · fit beyond interest
      </div>
    );
  }

  // ─── Root ────────────────────────────────────────────────────────────────
  function IcebergScene() {
    const { Stage } = Animations;
    const { useState } = React;
    const [discovered, setDiscovered] = useState(() => new Set());

    const onLabelClick = (key) => {
      setDiscovered((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        try {
          window.dispatchEvent(new CustomEvent('iceberg:discover', {
            detail: { key, count: next.size, total: DEEP_LABELS.length },
          }));
        } catch {}
        return next;
      });
    };

    // Allow external reveal-all from the legend panel
    React.useEffect(() => {
      const handler = () => {
        const allKeys = DEEP_LABELS.map(d => d.key);
        setDiscovered(new Set(allKeys));
        allKeys.forEach((key, i) => {
          window.dispatchEvent(new CustomEvent('iceberg:discover', {
            detail: { key, count: i + 1, total: allKeys.length },
          }));
        });
      };
      window.addEventListener('iceberg:revealAll', handler);
      return () => window.removeEventListener('iceberg:revealAll', handler);
    }, []);

    return (
      <Stage
        width={W}
        height={H}
        duration={STAGE_DUR}
        background="#03060E"
        loop={true}
        autoplay={true}
        playWhenVisible={true}
        persistKey="iceberg-anim"
      >
        <PhotoLayer discovered={discovered} onClick={onLabelClick} />
        <Caption />
        <HUD />
      </Stage>
    );
  }

  // Mount
  // Always begin the sequence from the start; the Stage's visibility gate
  // (playWhenVisible) holds it at t=0 until the section scrolls into view.
  try { localStorage.removeItem('iceberg-anim:t'); } catch {}
  const mount = document.getElementById('iceberg-mount');
  if (mount) {
    ReactDOM.createRoot(mount).render(<IcebergScene />);
  }

  window.IcebergScene = IcebergScene;
})();
