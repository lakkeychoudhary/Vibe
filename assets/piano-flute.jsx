/* ============================================================
   Vibe — Piano + Flute screens (the deep two)
   Globals: PianoScreen, FluteScreen
   ============================================================ */

/* ---------- Piano ---------- */
function PianoScreen({ onBack, mode }) {
  const [root, setRoot] = useState('C');
  const [scale, setScale] = useState('Major');
  const [octave, setOctave] = useState(4);
  const [active, setActive] = useState(new Set());
  const [autoOn, setAutoOn] = useState(false);
  const [autoNote, setAutoNote] = useState(null);

  // build 14 white keys + black keys spanning 2 octaves from C(octave)
  const whiteOffsets = [0, 2, 4, 5, 7, 9, 11];
  const blackOffsets = [1, 3, 6, 8, 10];
  const startMidi = 12 * (octave + 1); // C of `octave`
  const whites = [];
  const blacks = [];
  for (let o = 0; o < 2; o++) {
    whiteOffsets.forEach((w, i) => {
      whites.push({ midi: startMidi + o * 12 + w, label: window.VibeAudio.NOTE_NAMES[w] + (octave + o) });
    });
    blackOffsets.forEach(b => {
      blacks.push({ midi: startMidi + o * 12 + b });
    });
  }

  const scaleMembers = useMemo(() => {
    const intervals = window.VibeAudio.SCALES[scale];
    const r = window.VibeAudio.ROOTS.indexOf(root);
    const set = new Set(intervals.map(i => (i + r) % 12));
    return set;
  }, [root, scale]);

  const press = useCallback((midi) => {
    window.VibeAudio.playPiano(midi, 0.9);
    setActive(prev => { const n = new Set(prev); n.add(midi); return n; });
    setTimeout(() => setActive(prev => { const n = new Set(prev); n.delete(midi); return n; }), 250);
  }, []);

  // keyboard listener
  useEffect(() => {
    const map = 'asdfghjkl;\''.split('');
    const handle = (e) => {
      if (e.repeat) return;
      const i = map.indexOf(e.key);
      if (i >= 0 && whites[i]) press(whites[i].midi);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [whites, press]);

  // auto-follow voice
  useEffect(() => {
    if (mode !== 'auto') return;
    let unsub;
    let lastMidi = 0;
    let lastTime = 0;
    (async () => {
      try {
        await window.VibePitch.start();
        setAutoOn(true);
        unsub = window.VibePitch.subscribe((r) => {
          if (!r.pitch || r.clarity < 0.6) { setAutoNote(null); return; }
          const snapped = window.VibeAudio.snapToScale(r.midi, root, scale);
          setAutoNote(snapped);
          const now = performance.now();
          if (snapped !== lastMidi && now - lastTime > 180) {
            press(snapped);
            lastMidi = snapped; lastTime = now;
          }
        });
      } catch (e) { console.warn('mic failed', e); }
    })();
    return () => { if (unsub) unsub(); window.VibePitch.stop(); setAutoOn(false); };
  }, [mode, root, scale, press]);

  // black key positioning: positions relative to whites
  const whitePct = 100 / whites.length;
  const blackPositions = [];
  // for each octave, black keys after white 0,1,3,4,5
  const blackWhiteIdx = [0, 1, 3, 4, 5]; // 0=after C, 1=after D, 3=after F, 4=after G, 5=after A
  for (let o = 0; o < 2; o++) {
    blackWhiteIdx.forEach((wi, j) => {
      blackPositions.push({
        midi: blacks[o * 5 + j].midi,
        left: (wi + 1 + o * 7) * whitePct - whitePct * 0.27
      });
    });
  }

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Piano</div>
          <div className="dimmed" style={{ fontSize: 13 }}>
            {mode === 'auto' ? 'sing & it plays' : 'tap or use A–; keys'}
          </div>
        </div>
        <div className="controls-row">
          <ScalePicker root={root} scale={scale} onRoot={setRoot} onScale={setScale} />
          <div className="control">
            <label>Octave</label>
            <button onClick={() => setOctave(o => Math.max(2, o - 1))} className="hand" style={{ padding: '0 8px', fontSize: 18 }}>−</button>
            <strong>{octave}</strong>
            <button onClick={() => setOctave(o => Math.min(6, o + 1))} className="hand" style={{ padding: '0 8px', fontSize: 18 }}>+</button>
          </div>
        </div>
      </div>

      <div className="stage">
        <div className="piano-wrap">
          <div className="piano-info">
            <div className="hint" style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
              {mode === 'auto'
                ? (autoOn
                    ? (autoNote
                        ? <><Icons.Mic size={16}/> {window.VibeAudio.noteName(autoNote)}</>
                        : <><Icons.Mic size={16}/> listening…</>)
                    : 'starting mic…')
                : 'highlighted = in scale'}
            </div>
            <div className="hint dimmed">{root} {scale}</div>
          </div>

          <div className="piano">
            <div className="piano-keys">
              {whites.map((k, i) => {
                const inScale = scaleMembers.has(k.midi % 12);
                return (
                  <div
                    key={k.midi}
                    className={`key-white ${active.has(k.midi) ? 'active' : ''} ${inScale ? 'in-scale' : ''}`}
                    onPointerDown={(e) => { e.preventDefault(); press(k.midi); }}
                  >
                    {k.label.startsWith('C') ? k.label : ''}
                  </div>
                );
              })}
              {blackPositions.map((b) => {
                const inScale = scaleMembers.has(b.midi % 12);
                return (
                  <div
                    key={b.midi}
                    className={`key-black ${active.has(b.midi) ? 'active' : ''}`}
                    style={{ left: `${b.left}%`, opacity: inScale ? 1 : 0.7 }}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); press(b.midi); }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Flute (mic-driven) ---------- */
function FluteScreen({ onBack, mode: parentMode }) {
  const [root, setRoot] = useState('C');
  const [scale, setScale] = useState('Major');
  const [snap, setSnap] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [breath, setBreath] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [note, setNote] = useState('—');
  const voiceRef = useRef(null);
  const spectrumBars = useRef([]);

  const startMic = useCallback(async () => {
    await window.VibeAudio.resume();
    try {
      await window.VibePitch.start();
      voiceRef.current = window.VibeAudio.createFluteVoice();
      setMicOn(true);
    } catch (e) {
      alert('Vibe needs mic access for the flute.\n\n' + (e.message || ''));
    }
  }, []);

  const stopMic = useCallback(() => {
    window.VibePitch.stop();
    if (voiceRef.current) { voiceRef.current.stop(); voiceRef.current = null; }
    setMicOn(false); setBreath(0); setPitch(0); setNote('—');
  }, []);

  useEffect(() => () => stopMic(), [stopMic]);

  useEffect(() => {
    if (!micOn) return;
    let unsub = window.VibePitch.subscribe((r) => {
      // breath = rms strength, threshold maps to volume
      const b = Math.min(1, Math.max(0, (r.rms - 0.01) / 0.18));
      setBreath(b);
      if (voiceRef.current) {
        voiceRef.current.setVolume(b);
        if (r.pitch && r.clarity > 0.5) {
          let freq = r.pitch;
          let midi = r.midi;
          if (snap) {
            midi = window.VibeAudio.snapToScale(r.midi, root, scale);
            freq = window.VibeAudio.noteToFreq(midi);
          }
          voiceRef.current.setFreq(freq, 0.05);
          setPitch(freq);
          setNote(window.VibeAudio.noteName(midi));
        } else if (r.rms < 0.02) {
          setNote('—');
        }
      }
    });
    // spectrum
    let raf;
    function loop() {
      const sp = window.VibePitch.getSpectrum();
      if (sp && spectrumBars.current.length) {
        const step = Math.floor(sp.length / spectrumBars.current.length);
        spectrumBars.current.forEach((bar, i) => {
          if (!bar) return;
          let s = 0;
          for (let k = 0; k < 6; k++) s += sp[i * step + k] || 0;
          const v = Math.min(60, (s / 6) * 0.4);
          bar.style.height = v + 'px';
        });
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { if (unsub) unsub(); cancelAnimationFrame(raf); };
  }, [micOn, root, scale, snap]);

  // animate flute holes by pitch range
  const holeCount = 6;
  const liveHole = useMemo(() => {
    if (!pitch) return -1;
    // map 200..900 Hz to 0..holeCount
    const mapped = Math.floor(((Math.log2(Math.max(50, pitch)) - Math.log2(200)) / (Math.log2(900) - Math.log2(200))) * holeCount);
    return Math.max(0, Math.min(holeCount - 1, mapped));
  }, [pitch]);

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Flute</div>
          <div className="dimmed" style={{ fontSize: 13 }}>blow into the mic · the louder you sing, the louder it plays</div>
        </div>
        <div className="controls-row">
          <ScalePicker root={root} scale={scale} onRoot={setRoot} onScale={setScale} />
          <div className="control">
            <label>Snap to scale</label>
            <Toggle on={snap} onChange={setSnap} />
          </div>
        </div>
      </div>

      <div className="stage">
        <div className="flute-stage">
          {!micOn ? (
            <div className="mic-cta">
              <div className="mic-orb" onClick={startMic}><MicIcon size={56} /></div>
              <div className="hand" style={{ fontSize: 28, color: 'var(--ink)' }}>Tap & blow</div>
              <p className="dimmed" style={{ maxWidth: 380 }}>
                Vibe uses your microphone on-device only. Nothing leaves your phone.
                Blow gently, hum, or sing — the flute mirrors your breath and pitch.
              </p>
            </div>
          ) : (
            <>
              {/* Flute SVG */}
              <svg className="flute-svg" viewBox="0 0 760 120" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="fluteBody" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#F0C77E"/>
                    <stop offset="0.5" stopColor="#E0A458"/>
                    <stop offset="1" stopColor="#A8593C"/>
                  </linearGradient>
                </defs>
                <rect x="20" y="40" width="720" height="40" rx="20" fill="url(#fluteBody)" stroke="#6E3F25" strokeWidth="2"/>
                <rect x="20" y="40" width="720" height="14" rx="7" fill="rgba(255,255,255,0.25)"/>
                <circle cx="60" cy="60" r="10" fill="#3A2418"/>
                {/* breath glow on mouthpiece */}
                <circle cx="60" cy="60" r={10 + breath * 24} fill="#FBF3E8" opacity={breath * 0.5} />
                {Array.from({ length: holeCount }).map((_, i) => {
                  const cx = 200 + i * 90;
                  const isLive = i === liveHole && breath > 0.06;
                  return (
                    <g key={i}>
                      <circle cx={cx} cy="60" r="9" fill={isLive ? '#FBF3E8' : '#3A2418'} stroke="#6E3F25" strokeWidth="1.5"/>
                      {isLive && <circle cx={cx} cy="60" r="14" fill="none" stroke="#FBF3E8" strokeWidth="1.5" opacity="0.5"/>}
                    </g>
                  );
                })}
                <rect x="700" y="50" width="30" height="20" rx="3" fill="#6E3F25"/>
              </svg>

              <div className="flute-meters">
                <div className="meter-card">
                  <div className="label">breath</div>
                  <div className="value">{Math.round(breath * 100)}<span style={{ fontSize: 16, opacity: 0.6 }}>%</span></div>
                  <div className="meter-bar"><div className="fill" style={{ width: (breath * 100) + '%' }}/></div>
                </div>
                <div className="meter-card">
                  <div className="label">note</div>
                  <div className="value">{note}</div>
                  <div className="dimmed" style={{ fontSize: 12, marginTop: 6 }}>{pitch ? pitch.toFixed(1) + ' Hz' : '—'}</div>
                </div>
                <div className="meter-card">
                  <div className="label">spectrum</div>
                  <div className="tone-bars" style={{ marginTop: 6 }}>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <span key={i} ref={el => spectrumBars.current[i] = el} style={{ height: 4 }} />
                    ))}
                  </div>
                </div>
              </div>

              <button className="btn btn-ghost" onClick={stopMic}>Stop</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PianoScreen, FluteScreen });
