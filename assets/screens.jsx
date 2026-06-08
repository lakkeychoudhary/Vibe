/* ============================================================
   Vibe — Landing + Picker screens
   Globals: Landing, Picker, INSTRUMENTS
   ============================================================ */

const INSTRUMENTS = [
  { id: 'piano',    name: 'Piano',     tag: '88 keys · velocity sense',  bg: '#F5C9A1', deep: true,  icon: 'piano' },
  { id: 'flute',    name: 'Flute',     tag: 'Breath through your mic',   bg: '#F0C77E', deep: true,  icon: 'flute' },
  { id: 'guitar',   name: 'Guitar',    tag: 'Strum or pluck · 6 strings', bg: '#E89B7A', deep: false, icon: 'guitar' },
  { id: 'violin',   name: 'Violin',    tag: 'Bow with your finger',      bg: '#F2B488', deep: false, icon: 'violin' },
  { id: 'tabla',    name: 'Tabla',     tag: 'Na · Tin · Dha · Ge',       bg: '#F5C9A1', deep: false, icon: 'tabla' },
  { id: 'dholak',   name: 'Dholak',    tag: 'Boomy bass + slap',          bg: '#E89B7A', deep: false, icon: 'tabla' },
  { id: 'sitar',    name: 'Sitar',     tag: 'Resonant · buzzy strings',  bg: '#E0A458', deep: false, icon: 'sitar' },
  { id: 'harmonium',name: 'Harmonium', tag: 'Reedy drone keys',          bg: '#F0C77E', deep: false, icon: 'harmonium' },
  { id: 'drums',    name: 'Drum Kit',  tag: 'Kick · Snare · Hat · Crash',bg: '#E89B7A', deep: false, icon: 'drums' },
];

/* Inline glyphs — simple geometric placeholders, never overdesigned */
function InstrumentGlyph({ id, size = 32 }) {
  const stroke = '#A8593C';
  const fill = '#FBF3E8';
  const s = size;
  switch (id) {
    case 'piano':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="3" y="8" width="26" height="18" rx="3" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <line x1="11" y1="8" x2="11" y2="26" stroke={stroke} strokeWidth="1.2"/>
          <line x1="19" y1="8" x2="19" y2="26" stroke={stroke} strokeWidth="1.2"/>
          <rect x="7" y="8" width="3" height="9" fill={stroke}/>
          <rect x="15" y="8" width="3" height="9" fill={stroke}/>
          <rect x="22" y="8" width="3" height="9" fill={stroke}/>
        </svg>
      );
    case 'flute':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="3" y="14" width="26" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <circle cx="10" cy="16" r="1" fill={stroke}/>
          <circle cx="15" cy="16" r="1" fill={stroke}/>
          <circle cx="20" cy="16" r="1" fill={stroke}/>
          <circle cx="25" cy="16" r="1" fill={stroke}/>
          <circle cx="5" cy="16" r="1.4" fill={stroke}/>
        </svg>
      );
    case 'guitar':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M21 5l-3 3 6 6-3 3a5 5 0 11-3-3l3-3-6-6z" fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round"/>
          <circle cx="14" cy="20" r="2" fill={stroke}/>
        </svg>
      );
    case 'violin':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 4c4 0 6 4 6 8s-2 6-6 8-6 4-6 6 2 2 4 2" fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round"/>
          <line x1="14" y1="10" x2="20" y2="22" stroke={stroke} strokeWidth="0.8"/>
        </svg>
      );
    case 'tabla':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <ellipse cx="11" cy="22" rx="6" ry="6" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <ellipse cx="22" cy="22" rx="5" ry="5" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <circle cx="11" cy="22" r="2" fill={stroke}/>
          <circle cx="22" cy="22" r="1.5" fill={stroke}/>
        </svg>
      );
    case 'sitar':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="9" cy="23" r="6" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <rect x="14" y="4" width="3" height="22" rx="1" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <line x1="15.5" y1="6" x2="15.5" y2="24" stroke={stroke} strokeWidth="0.6"/>
        </svg>
      );
    case 'harmonium':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="3" y="10" width="26" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <rect x="5" y="18" width="22" height="4" fill={stroke}/>
          <circle cx="9" cy="14" r="1.4" fill={stroke}/>
          <circle cx="16" cy="14" r="1.4" fill={stroke}/>
          <circle cx="23" cy="14" r="1.4" fill={stroke}/>
        </svg>
      );
    case 'drums':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <ellipse cx="16" cy="14" rx="11" ry="3" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <path d="M5 14v8c0 1.7 5 3 11 3s11-1.3 11-3v-8" fill={fill} stroke={stroke} strokeWidth="1.6"/>
          <line x1="10" y1="6" x2="6" y2="14" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="22" y1="6" x2="26" y2="14" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      );
    default: return null;
  }
}

/* ---------- Landing ---------- */
function Landing({ onStart }) {
  return (
    <div className="screen fade-in">
      <TopBar onHome={onStart} />
      <div className="hero">
        <div>
          <span className="hero-eyebrow">
            <Icons.Sparkle size={14} />
            offline · on-device · no servers
          </span>
          <h1>play. sing.<br/><span className="underline">be the band.</span></h1>
          <p className="lede">
            A pocket music studio that runs entirely on your device. Real instruments,
            real touch, real breath through your mic — and a band that listens.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={onStart}>
              Start playing
              <span className="btn-icon"><Icons.Arrow size={14}/></span>
            </button>
            <button className="btn btn-ghost" onClick={onStart}>
              <Icons.Mic size={18} /> Try Band Mode
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-note n1"><Icons.Note size={16}/>&nbsp;&nbsp;sa re ga</div>
          <div className="hero-note n2">C maj7</div>
          <div className="hero-note n3">120 bpm</div>
          <div className="hero-note n4"><Icons.Drum size={16}/>&nbsp;&nbsp;dha dhin</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature">
          <h4>real instruments</h4>
          <p>8 instruments synthesized fresh on every touch — no canned loops.</p>
        </div>
        <div className="feature">
          <h4>sing &amp; play</h4>
          <p>Auto Play follows your voice, note for note, with the instrument of your choice.</p>
        </div>
        <div className="feature">
          <h4>band mode</h4>
          <p>Hum a melody. Vibe detects your key and tempo, then plays along.</p>
        </div>
        <div className="feature">
          <h4>works anywhere</h4>
          <p>Installs as an app. Works on a plane. No accounts, ever.</p>
        </div>
      </div>

      <div className="footnote">scribbled with care · v1.0</div>
    </div>
  );
}

/* ---------- Picker ---------- */
function Picker({ mode, setMode, onPick, onHome, onBand }) {
  return (
    <div className="screen fade-in">
      <TopBar onHome={onHome} />
      <div className="section-head">
        <div>
          <span className="scribble">pick your sound</span>
          <h2>What feels right today?</h2>
          <p>Quality over quantity. Tap to begin — every instrument is real-time synthesized.</p>
        </div>
        <ModeTabs
          value={mode}
          onChange={setMode}
          options={[
            { id: 'manual', label: <><Icons.Hand size={13}/> Manual</> },
            { id: 'auto',   label: <><Icons.Mic size={13}/> Auto Play</> },
            { id: 'band',   label: <><Icons.Band size={13}/> Band</> },
          ]}
        />
      </div>

      {mode === 'band' ? (
        <div className="band-stage fade-in" style={{ alignItems: 'center' }}>
          <button className="btn btn-primary" style={{ alignSelf: 'center' }} onClick={onBand}>
            Open Band Mode <span className="btn-icon"><Icons.Arrow size={14}/></span>
          </button>
          <p className="dimmed center" style={{ maxWidth: 480, margin: '0 auto' }}>
            Sing or hum — Vibe detects your key and tempo, then plays drums, bass, and harmony in time.
          </p>
        </div>
      ) : (
        <div className="inst-grid">
          {INSTRUMENTS.map(inst => (
            <div
              key={inst.id}
              className="inst-card"
              style={{ '--bg': inst.bg }}
              onClick={() => onPick(inst.id)}
            >
              <div className="icon"><InstrumentGlyph id={inst.icon} size={32} /></div>
              <div>
                <h3>{inst.name}</h3>
                <p>{inst.tag}</p>
                <div className="meta">
                  {inst.deep ? <><Icons.Star size={11}/> flagship</> : <>tap to play</>}
                  <Icons.Chevron size={10}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="footnote">
        {mode === 'manual'  && 'tap and play · your fingers, your rhythm'}
        {mode === 'auto'    && 'sing into your mic · the instrument follows'}
        {mode === 'band'    && 'lead with your voice · the band joins in'}
      </div>
    </div>
  );
}

Object.assign(window, { Landing, Picker, INSTRUMENTS, InstrumentGlyph });
