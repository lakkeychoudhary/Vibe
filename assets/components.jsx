/* ============================================================
   Vibe — shared components: Background, Nav, common UI
   Globals: Background, Brand, TopBar, ModeTabs, BackButton, Feature
   ============================================================ */
const { useEffect, useRef, useState, useMemo, useCallback } = React;

/* ---------- Sunset / Dawn scene background ---------- */
function Background() {
  // generate 8 ember positions once
  const embers = useMemo(() => (
    Array.from({ length: 9 }, (_, i) => ({
      left: 5 + i * 11 + Math.random() * 6,
      delay: -Math.random() * 14,
      dur: 11 + Math.random() * 8,
      dx: (Math.random() - 0.5) * 160,
      size: 2 + Math.random() * 3,
    }))
  ), []);

  return (
    <div className="bg-stage" aria-hidden>
      <div className="stars" />
      <div className="sun-halo" />
      <div className="sun-disc" />
      <div className="cloud c4" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c5" />
      <div className="cloud c3" />
      <div className="haze" />

      {/* layered hill silhouettes — back to front, increasing darkness */}
      <svg className="hills" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice" style={{ height: '52vh' }}>
        <defs>
          <linearGradient id="h1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#9B3F5C" stopOpacity="0.55"/>
            <stop offset="1" stopColor="#6B2B4A" stopOpacity="0.75"/>
          </linearGradient>
          <linearGradient id="h2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7A2E48" stopOpacity="0.75"/>
            <stop offset="1" stopColor="#4A1A35" stopOpacity="0.92"/>
          </linearGradient>
          <linearGradient id="h3" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3A1428" stopOpacity="0.9"/>
            <stop offset="1" stopColor="#1F0B1A" stopOpacity="1"/>
          </linearGradient>
        </defs>
        {/* far hills */}
        <path d="M0,420 C160,360 280,400 420,380 C560,360 720,420 880,400 C1040,380 1200,360 1440,400 L1440,600 L0,600 Z"
              fill="url(#h1)"/>
        {/* mid hills */}
        <path d="M0,480 C200,440 340,500 520,470 C700,440 880,520 1100,490 C1260,470 1380,500 1440,480 L1440,600 L0,600 Z"
              fill="url(#h2)"/>
        {/* near hills with a couple of trees */}
        <path d="M0,540 C200,510 360,560 540,535 C720,510 900,570 1080,540 C1260,515 1380,545 1440,535 L1440,600 L0,600 Z"
              fill="url(#h3)"/>
        {/* solo tree silhouette on the right hill */}
        <g fill="#1F0B1A" opacity="0.95">
          <rect x="1110" y="500" width="3" height="36" />
          <ellipse cx="1112" cy="498" rx="14" ry="20" />
          <rect x="240" y="518" width="2" height="22" />
          <ellipse cx="241" cy="516" rx="9" ry="12" />
        </g>
      </svg>

      {/* drifting embers */}
      {embers.map((e, i) => (
        <span key={i} className="ember"
          style={{
            left: e.left + '%',
            bottom: '20%',
            animationDelay: e.delay + 's',
            animationDuration: e.dur + 's',
            width: e.size + 'px',
            height: e.size + 'px',
            '--dx': e.dx + 'px',
          }}
        />
      ))}

      <div className="grain" />
    </div>
  );
}

/* ---------- Brand mark ---------- */
function Brand({ onClick }) {
  return (
    <div className="brand" onClick={onClick}>
      <div className="brand-mark" />
      <div className="brand-name">Vi<em>be</em></div>
    </div>
  );
}

/* ---------- TopBar ---------- */
function TopBar({ onHome, rightChildren }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const u = () => setOnline(navigator.onLine);
    window.addEventListener('online', u);
    window.addEventListener('offline', u);
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', u); };
  }, []);
  return (
    <div className="topbar">
      <Brand onClick={onHome} />
      <div className="topbar-actions">
        {rightChildren}
        <div className={`pill ${online ? 'live' : ''}`}>
          <span className="dot" />
          {online ? 'online · works offline' : 'offline · still works'}
        </div>
      </div>
    </div>
  );
}

/* ---------- Mode tabs ---------- */
function ModeTabs({ value, onChange, options }) {
  return (
    <div className="mode-tabs">
      {options.map(o => (
        <button key={o.id} className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---------- Back button ---------- */
function BackButton({ onClick, children = 'Back' }) {
  return (
    <button className="back-btn" onClick={onClick} aria-label="Back">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {children}
    </button>
  );
}

/* ---------- Mic icon ---------- */
const MicIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="13" rx="3" />
    <path d="M19 11a7 7 0 0 1-14 0" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

/* ---------- Scribbly toggle ---------- */
function Toggle({ on, onChange }) {
  return <div className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} />;
}

/* ---------- Scale picker (root + scale) ---------- */
function ScalePicker({ root, scale, onRoot, onScale }) {
  return (
    <>
      <div className="control">
        <label>Key</label>
        <select value={root} onChange={e => onRoot(e.target.value)}>
          {window.VibeAudio.ROOTS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div className="control">
        <label>Scale</label>
        <select value={scale} onChange={e => onScale(e.target.value)}>
          {Object.keys(window.VibeAudio.SCALES).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    </>
  );
}

Object.assign(window, { Background, Brand, TopBar, ModeTabs, BackButton, MicIcon, Toggle, ScalePicker });

/* ---------- useAutoMic — shared hook for Auto-mode follow logic ---------- */
function useAutoMic({ enabled, onPitch, onOnset, onRms }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const pitchCb = useRef(onPitch); pitchCb.current = onPitch;
  const onsetCb = useRef(onOnset); onsetCb.current = onOnset;
  const rmsCb   = useRef(onRms);   rmsCb.current = onRms;

  useEffect(() => {
    if (!enabled) return;
    let unsubP, unsubO;
    let cancelled = false;
    (async () => {
      try {
        await window.VibeAudio.resume();
        await window.VibePitch.start();
        if (cancelled) return;
        setActive(true);
        unsubP = window.VibePitch.subscribe((r) => {
          if (rmsCb.current) rmsCb.current(r);
          if (r.pitch && r.clarity > 0.55 && pitchCb.current) pitchCb.current(r);
        });
        unsubO = window.VibePitch.onOnset((o) => {
          if (onsetCb.current) onsetCb.current(o);
        });
      } catch (e) {
        setError(e.message || 'mic unavailable');
      }
    })();
    return () => {
      cancelled = true;
      if (unsubP) unsubP();
      if (unsubO) unsubO();
      window.VibePitch.stop();
      setActive(false);
    };
  }, [enabled]);

  return { active, error };
}

/* ---------- AutoBadge — pill shown when an instrument is in auto mode ---------- */
function AutoBadge({ active, note, info }) {
  return (
    <div className="pill" style={{
      borderColor: active ? 'rgba(45,170,110,0.5)' : 'rgba(168,89,60,0.3)',
      color: active ? '#1F7D54' : 'var(--ink-soft)'
    }}>
      <span className="dot" style={{ background: active ? '#2DAA6E' : '#C97B5C', boxShadow: active ? '0 0 0 4px rgba(45,170,110,0.18)' : 'none', animation: active ? 'blink 1.4s ease-in-out infinite' : 'none' }} />
      {active ? <><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Icons.Mic size={12}/> listening</span> · <strong style={{ color: 'var(--ink)' }}>{note || '—'}</strong>{info && <span style={{ opacity: 0.7, marginLeft: 6 }}>{info}</span>}</> : 'starting mic…'}
    </div>
  );
}

Object.assign(window, { useAutoMic, AutoBadge });
