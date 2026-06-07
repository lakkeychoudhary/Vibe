/* ============================================================
   Vibe — Other instruments (Guitar, Violin, Tabla, Sitar, Harmonium, Drums)
   Globals: GuitarScreen, ViolinScreen, TablaScreen, SitarScreen, HarmoniumScreen, DrumsScreen
   ============================================================ */

/* ---------- Guitar ---------- */
function GuitarScreen({ onBack, mode }) {
  const [root, setRoot] = useState('C');
  const [scale, setScale] = useState('Major');
  // 6 strings, standard tuning (E2 A2 D3 G3 B3 E4) midis
  const strings = [
    { name: 'E', midi: 40, thickness: 'thicker' },
    { name: 'A', midi: 45, thickness: 'thicker' },
    { name: 'D', midi: 50, thickness: 'thick' },
    { name: 'G', midi: 55, thickness: 'thick' },
    { name: 'B', midi: 59, thickness: '' },
    { name: 'e', midi: 64, thickness: '' },
  ];
  const chords = [
    { name: 'C',    notes: [48, 52, 55, 60, 64] },
    { name: 'G',    notes: [43, 47, 50, 55, 59, 67] },
    { name: 'Am',   notes: [45, 52, 57, 60, 64] },
    { name: 'F',    notes: [41, 48, 53, 57, 60] },
    { name: 'D',    notes: [50, 57, 62, 66] },
    { name: 'Em',   notes: [40, 47, 52, 55, 59, 64] },
    { name: 'Dm',   notes: [50, 57, 62, 65] },
  ];
  const [activeStr, setActiveStr] = useState(null);
  const [autoNote, setAutoNote] = useState('—');

  const pluckString = (s) => {
    window.VibeAudio.playPluck(s.midi, { decay: 2.5, brightness: 0.55, gain: 0.45 });
    setActiveStr(s.midi);
    setTimeout(() => setActiveStr(null), 500);
  };
  const strumChord = (c) => {
    window.VibeAudio.strumChord(c.notes, { decay: 2.6, gain: 0.4 });
  };

  // Auto: voice -> snap to scale -> pluck nearest string (fast retrigger)
  const lastAutoMidi = useRef(0);
  const lastAutoTime = useRef(0);
  const { active: autoActive } = useAutoMic({
    enabled: mode === 'auto',
    onPitch: (r) => {
      const snapped = window.VibeAudio.snapToScale(r.midi, root, scale);
      const now = performance.now();
      if (snapped === lastAutoMidi.current && now - lastAutoTime.current < 80) return;
      lastAutoMidi.current = snapped;
      lastAutoTime.current = now;
      setAutoNote(window.VibeAudio.noteName(snapped));
      window.VibeAudio.playPluck(snapped, { decay: 2.4, brightness: 0.55, gain: 0.55 });
      // visualize closest string
      let best = strings[0], bd = 999;
      strings.forEach(s => { const d = Math.abs((snapped % 12) - (s.midi % 12)); if (d < bd) { bd = d; best = s; } });
      setActiveStr(best.midi); setTimeout(() => setActiveStr(null), 260);
    }
  });

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Guitar</div>
          <div className="dimmed" style={{ fontSize: 13 }}>{mode === 'auto' ? 'sing · strings echo your note' : 'pluck strings or tap a chord to strum'}</div>
        </div>
        <div className="controls-row">
          <ScalePicker root={root} scale={scale} onRoot={setRoot} onScale={setScale} />
          {mode === 'auto' && <AutoBadge active={autoActive} note={autoNote} />}
        </div>
      </div>
      <div className="stage">
        <div className="guitar-stage">
          <div className="strings">
            {strings.map(s => (
              <div
                key={s.midi}
                className={`string ${s.thickness} ${activeStr === s.midi ? 'playing' : ''}`}
                onPointerDown={() => pluckString(s)}
              >
                <span className="pluck-label">{s.name}</span>
                <span className="wire" />
              </div>
            ))}
          </div>
          <div className="chord-row">
            {chords.map(c => (
              <button key={c.name} className="chord-btn" onClick={() => strumChord(c)}>{c.name}</button>
            ))}
          </div>
          <div className="hand center" style={{ fontSize: 18, color: 'var(--ink-soft)' }}>
            ↑ pluck a string &nbsp;·&nbsp; tap a chord to strum
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Violin ---------- */
function ViolinScreen({ onBack, mode }) {
  const [root, setRoot] = useState('D');
  const [scale, setScale] = useState('Major');
  const voiceRef = useRef(null);
  const [bowing, setBowing] = useState(false);
  const [currentMidi, setCurrentMidi] = useState(57);
  const stageRef = useRef(null);
  const [autoNote, setAutoNote] = useState('—');

  // bow with finger drag on a vertical strip
  const handleStart = (e) => {
    e.preventDefault();
    if (!voiceRef.current) {
      voiceRef.current = window.VibeAudio.createBowVoice(currentMidi);
      voiceRef.current.setVolume(0.7);
    }
    setBowing(true);
  };
  const handleEnd = () => {
    setBowing(false);
    if (voiceRef.current) { voiceRef.current.stop(); voiceRef.current = null; }
  };
  const handleMove = (e) => {
    if (!bowing || !stageRef.current || !voiceRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX) || 0) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    // map to scale notes across 2 octaves
    const notes = window.VibeAudio.scaleNotes(root, scale, 4)
      .concat(window.VibeAudio.scaleNotes(root, scale, 5));
    const idx = Math.floor(pct * (notes.length - 1));
    const midi = notes[idx];
    setCurrentMidi(midi);
    voiceRef.current.setFreq(window.VibeAudio.noteToFreq(midi));
  };
  useEffect(() => () => { if (voiceRef.current) voiceRef.current.stop(); }, []);

  // Auto: continuous bowed voice following user's pitch + rms
  const { active: autoActive } = useAutoMic({
    enabled: mode === 'auto',
    onPitch: (r) => {
      if (!voiceRef.current) {
        voiceRef.current = window.VibeAudio.createBowVoice(r.midi);
      }
      const snapped = window.VibeAudio.snapToScale(r.midi, root, scale);
      setCurrentMidi(snapped);
      setAutoNote(window.VibeAudio.noteName(snapped));
      voiceRef.current.setFreq(window.VibeAudio.noteToFreq(snapped));
    },
    onRms: (r) => {
      if (voiceRef.current) {
        const v = Math.min(1, Math.max(0, (r.rms - 0.01) / 0.18));
        voiceRef.current.setVolume(v);
      }
    }
  });
  useEffect(() => {
    if (mode !== 'auto' && voiceRef.current) {
      voiceRef.current.stop(); voiceRef.current = null;
    }
  }, [mode]);

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Violin</div>
          <div className="dimmed" style={{ fontSize: 13 }}>{mode === 'auto' ? 'sing · the bow follows your voice' : 'press &amp; drag across the bow strip'}</div>
        </div>
        <div className="controls-row">
          <ScalePicker root={root} scale={scale} onRoot={setRoot} onScale={setScale} />
          {mode === 'auto' && <AutoBadge active={autoActive} note={autoNote} />}
        </div>
      </div>
      <div className="stage">
        <div className="flute-stage">
          <div className="hand" style={{ fontSize: 56, color: bowing ? 'var(--terra)' : 'var(--ink)' }}>
            {window.VibeAudio.noteName(currentMidi)}
          </div>
          <div
            ref={stageRef}
            onPointerDown={handleStart}
            onPointerUp={handleEnd}
            onPointerLeave={handleEnd}
            onPointerMove={handleMove}
            style={{
              width: '100%', maxWidth: 760, height: 90,
              background: 'linear-gradient(90deg, #6E3F25 0%, #A8593C 50%, #6E3F25 100%)',
              borderRadius: 18,
              position: 'relative',
              cursor: 'grab',
              boxShadow: 'var(--shadow)',
              touchAction: 'none'
            }}
          >
            <div style={{
              position: 'absolute', inset: '40% 12px 40% 12px',
              background: 'linear-gradient(90deg, #FDF8EF, #F0C77E)',
              borderRadius: 999,
              boxShadow: '0 0 12px rgba(253,248,239,0.6)',
              opacity: bowing ? 1 : 0.65
            }}/>
            <div className="hand" style={{ position: 'absolute', top: 8, left: 16, fontSize: 16, color: 'rgba(253,248,239,0.7)' }}>
              ← drag the bow →
            </div>
          </div>
          <p className="dimmed center" style={{ maxWidth: 540 }}>
            Hold and slide your finger to bow. The note follows your position across the {root} {scale} scale.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tabla ---------- */
function TablaScreen({ onBack, mode }) {
  const [hit, setHit] = useState(null);
  const pads = [
    { id: 'tabla-dha',  label: 'Dha', sub: 'na+ge', bg1: '#F5C9A1', bg2: '#A8593C' },
    { id: 'tabla-dhin', label: 'Dhin', sub: 'tin+ge', bg1: '#F5C9A1', bg2: '#C97B5C' },
    { id: 'tabla-na',   label: 'Na',  sub: 'right rim', bg1: '#F5E0C8', bg2: '#E0A458' },
    { id: 'tabla-tin',  label: 'Tin', sub: 'right center', bg1: '#F5E0C8', bg2: '#F0C77E' },
    { id: 'tabla-ge',   label: 'Ge',  sub: 'left open', bg1: '#E0A458', bg2: '#6E3F25' },
    { id: 'tabla-ka',   label: 'Ka',  sub: 'left closed', bg1: '#C97B5C', bg2: '#3A2418' },
  ];
  const tap = (id) => {
    window.VibeAudio.playDrum(id);
    setHit(id);
    setTimeout(() => setHit(h => h === id ? null : h), 150);
  };
  // teen-taal pattern (16-beat tabla pattern)
  const [playing, setPlaying] = useState(false);
  const interval = useRef(null);
  const startTeentaal = () => {
    if (playing) { clearInterval(interval.current); setPlaying(false); return; }
    setPlaying(true);
    // Teentaal: Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha
    const pattern = ['tabla-dha','tabla-dhin','tabla-dhin','tabla-dha',
                     'tabla-dha','tabla-dhin','tabla-dhin','tabla-dha',
                     'tabla-dha','tabla-tin','tabla-tin','tabla-na',
                     'tabla-na','tabla-dhin','tabla-dhin','tabla-dha'];
    let i = 0;
    const bpm = 100;
    interval.current = setInterval(() => {
      const id = pattern[i % pattern.length];
      window.VibeAudio.playDrum(id);
      setHit(id); setTimeout(() => setHit(null), 100);
      i++;
    }, 60000 / bpm);
  };
  useEffect(() => () => clearInterval(interval.current), []);

  // Auto: each vocal onset triggers a bol; low pitch = Ge/Dha, high = Na/Tin
  const lastPitchRef = useRef(0);
  const autoIdx = useRef(0);
  const { active: autoActive } = useAutoMic({
    enabled: mode === 'auto',
    onPitch: (r) => { lastPitchRef.current = r.pitch; },
    onOnset: (o) => {
      const pitch = lastPitchRef.current;
      let id;
      if (o.strength > 0.55) id = pitch && pitch < 250 ? 'tabla-dha' : 'tabla-dhin';
      else if (o.strength > 0.3) id = (autoIdx.current % 2 === 0) ? 'tabla-tin' : 'tabla-na';
      else id = 'tabla-ge';
      window.VibeAudio.playDrum(id);
      setHit(id); setTimeout(() => setHit(null), 110);
      autoIdx.current++;
    }
  });

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Tabla</div>
          <div className="dimmed" style={{ fontSize: 13 }}>{mode === 'auto' ? 'beat with your voice · every sound hits a bol' : 'tap the bols · or let teentaal play itself'}</div>
        </div>
        <div className="controls-row">
          {mode === 'auto' && <AutoBadge active={autoActive} note={hit || '—'} />}
          <button className="btn btn-ghost" onClick={startTeentaal}>
            {playing ? <><Icons.Pause size={14}/> stop</> : <><Icons.Play size={14}/> teentaal</>}
          </button>
        </div>
      </div>
      <div className="stage">
        <div className="drum-pads">
          {pads.map(p => (
            <div
              key={p.id}
              className={`drum-pad ${hit === p.id ? 'hit' : ''}`}
              style={{ '--bg-1': p.bg1, '--bg-2': p.bg2 }}
              onPointerDown={() => tap(p.id)}
            >
              {p.label}
              <span className="sub">{p.id.replace('tabla-', '')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Sitar ---------- */
function SitarScreen({ onBack, mode }) {
  const [root, setRoot] = useState('C');
  const [scale, setScale] = useState('Raag Yaman');
  const notes = window.VibeAudio.scaleNotes(root, scale, 4)
    .concat(window.VibeAudio.scaleNotes(root, scale, 5).slice(0, 4));
  const [pressed, setPressed] = useState(null);
  const [autoNote, setAutoNote] = useState('—');
  const pluck = (m) => {
    window.VibeAudio.playPluck(m, { decay: 3.5, brightness: 0.7, buzz: 0.6, gain: 0.4 });
    setPressed(m); setTimeout(() => setPressed(null), 320);
  };
  // sympathetic drone
  const droneRef = useRef([]);
  const [droneOn, setDroneOn] = useState(false);
  const toggleDrone = () => {
    if (droneOn) {
      droneRef.current.forEach(v => v.stop());
      droneRef.current = [];
      setDroneOn(false);
    } else {
      const r = window.VibeAudio.ROOTS.indexOf(root) + 12 * 4;
      droneRef.current = [r - 12, r, r + 7].map(m => {
        const v = window.VibeAudio.createBowVoice(m);
        v.setVolume(0.08);
        return v;
      });
      setDroneOn(true);
    }
  };
  useEffect(() => () => droneRef.current.forEach(v => v.stop()), []);

  // Auto: pitch changes -> pluck snapped scale note (fast retrigger)
  const lastAutoMidi = useRef(0);
  const lastAutoTime = useRef(0);
  const { active: autoActive } = useAutoMic({
    enabled: mode === 'auto',
    onPitch: (r) => {
      const snapped = window.VibeAudio.snapToScale(r.midi, root, scale);
      const now = performance.now();
      if (snapped === lastAutoMidi.current && now - lastAutoTime.current < 80) return;
      lastAutoMidi.current = snapped;
      lastAutoTime.current = now;
      setAutoNote(window.VibeAudio.noteName(snapped));
      window.VibeAudio.playPluck(snapped, { decay: 3.2, brightness: 0.7, buzz: 0.6, gain: 0.5 });
      setPressed(snapped); setTimeout(() => setPressed(null), 220);
    }
  });

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Sitar</div>
          <div className="dimmed" style={{ fontSize: 13 }}>{mode === 'auto' ? 'sing · the strings echo your raag' : 'resonant · buzzy · with a tanpura drone'}</div>
        </div>
        <div className="controls-row">
          <ScalePicker root={root} scale={scale} onRoot={setRoot} onScale={setScale} />
          <div className="control">
            <label>Drone</label>
            <Toggle on={droneOn} onChange={toggleDrone} />
          </div>
          {mode === 'auto' && <AutoBadge active={autoActive} note={autoNote} />}
        </div>
      </div>
      <div className="stage">
        <div className="flute-stage">
          <div className="chord-row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {notes.map((m, i) => (
              <button
                key={i}
                className={`chord-btn ${pressed === m ? 'active' : ''}`}
                style={{ minWidth: 70, fontSize: 26 }}
                onPointerDown={() => pluck(m)}
              >
                {window.VibeAudio.noteName(m).replace(/\d/, '')}
              </button>
            ))}
          </div>
          <p className="dimmed center" style={{ maxWidth: 540 }}>
            Each button is a note in {scale}. The drone holds the tonic and fifth — try Raag Bhairavi or Yaman.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Harmonium ---------- */
function HarmoniumScreen({ onBack, mode }) {
  const [octave, setOctave] = useState(4);
  const [root, setRoot] = useState('C');
  const [scale, setScale] = useState('Major');
  const [autoNote, setAutoNote] = useState('—');
  const startMidi = 12 * (octave + 1);
  const whiteOffsets = [0, 2, 4, 5, 7, 9, 11];
  const blackOffsets = [1, 3, 6, 8, 10];
  const blackWhiteIdx = [0, 1, 3, 4, 5];
  const whites = []; const blacks = [];
  for (let o = 0; o < 2; o++) {
    whiteOffsets.forEach(w => whites.push(startMidi + o * 12 + w));
    blackOffsets.forEach(b => blacks.push(startMidi + o * 12 + b));
  }
  const [active, setActive] = useState(new Set());
  const press = (m) => {
    window.VibeAudio.playHarmonium(m, 1.0);
    setActive(p => { const n = new Set(p); n.add(m); return n; });
    setTimeout(() => setActive(p => { const n = new Set(p); n.delete(m); return n; }), 400);
  };

  // Auto: pitch changes -> sustain reedy note (fast retrigger)
  const lastAutoMidi = useRef(0);
  const lastAutoTime = useRef(0);
  const { active: autoActive } = useAutoMic({
    enabled: mode === 'auto',
    onPitch: (r) => {
      const snapped = window.VibeAudio.snapToScale(r.midi, root, scale);
      const now = performance.now();
      // fast retrigger: only suppress if SAME note within 120ms
      if (snapped === lastAutoMidi.current && now - lastAutoTime.current < 120) return;
      lastAutoMidi.current = snapped;
      lastAutoTime.current = now;
      setAutoNote(window.VibeAudio.noteName(snapped));
      window.VibeAudio.playHarmonium(snapped, 0.8, 0.8);
      setActive(p => { const n = new Set(p); n.add(snapped); return n; });
      setTimeout(() => setActive(p => { const n = new Set(p); n.delete(snapped); return n; }), 300);
    }
  });
  const whitePct = 100 / whites.length;
  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Harmonium</div>
          <div className="dimmed" style={{ fontSize: 13 }}>{mode === 'auto' ? 'sing · the reeds match your note' : 'reedy &amp; warm · perfect for bhajan'}</div>
        </div>
        <div className="controls-row">
          {mode === 'auto' && <>
            <ScalePicker root={root} scale={scale} onRoot={setRoot} onScale={setScale} />
            <AutoBadge active={autoActive} note={autoNote} />
          </>}
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
          <div className="piano" style={{ background: 'linear-gradient(180deg, #6E3F25, #3A2418)' }}>
            <div className="piano-keys">
              {whites.map((m, i) => (
                <div
                  key={m}
                  className={`key-white ${active.has(m) ? 'active' : ''}`}
                  onPointerDown={(e) => { e.preventDefault(); press(m); }}
                />
              ))}
              {Array.from({ length: 2 }).flatMap((_, o) =>
                blackWhiteIdx.map((wi, j) => {
                  const midi = blacks[o * 5 + j];
                  return (
                    <div
                      key={midi}
                      className={`key-black ${active.has(midi) ? 'active' : ''}`}
                      style={{ left: `${(wi + 1 + o * 7) * whitePct - whitePct * 0.27}%` }}
                      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); press(midi); }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Drum Kit ---------- */
function DrumsScreen({ onBack, mode }) {
  const [hit, setHit] = useState(null);
  const pads = [
    { id: 'kick',  label: 'Kick',  bg1: '#F5E0C8', bg2: '#A8593C' },
    { id: 'snare', label: 'Snare', bg1: '#F5C9A1', bg2: '#C97B5C' },
    { id: 'hat',   label: 'Hat',   bg1: '#F5E0C8', bg2: '#E0A458' },
    { id: 'crash', label: 'Crash', bg1: '#F0C77E', bg2: '#A8593C' },
  ];
  const tap = (id) => {
    window.VibeAudio.playDrum(id);
    setHit(id); setTimeout(() => setHit(null), 100);
  };

  // boom-bap beat
  const [playing, setPlaying] = useState(false);
  const beatRef = useRef(null);
  const [bpm, setBpm] = useState(96);
  const startBeat = () => {
    if (playing) { clearInterval(beatRef.current); setPlaying(false); return; }
    setPlaying(true);
    // 16-step pattern
    const pat = {
      kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
    };
    let i = 0;
    beatRef.current = setInterval(() => {
      const step = i % 16;
      if (pat.kick[step])  { window.VibeAudio.playDrum('kick'); setHit('kick'); setTimeout(() => setHit(null), 50); }
      if (pat.snare[step]) { window.VibeAudio.playDrum('snare'); }
      if (pat.hat[step])   { window.VibeAudio.playDrum('hat'); }
      i++;
    }, 60000 / bpm / 4);
  };
  useEffect(() => () => clearInterval(beatRef.current), []);

  // Auto: each onset triggers a hit; strength + pitch decide which one
  const lastPitchRef = useRef(0);
  const autoStep = useRef(0);
  const { active: autoActive } = useAutoMic({
    enabled: mode === 'auto',
    onPitch: (r) => { lastPitchRef.current = r.pitch; },
    onOnset: (o) => {
      let id;
      if (o.strength > 0.55 && lastPitchRef.current < 250) id = 'kick';
      else if (o.strength > 0.5) id = (autoStep.current % 2 === 0) ? 'kick' : 'snare';
      else if (o.strength > 0.25) id = 'snare';
      else id = 'hat';
      window.VibeAudio.playDrum(id);
      setHit(id); setTimeout(() => setHit(null), 80);
      autoStep.current++;
    }
  });

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Drum Kit</div>
          <div className="dimmed" style={{ fontSize: 13 }}>{mode === 'auto' ? 'beatbox · the kit hits with your voice' : 'tap pads or play the loop'}</div>
        </div>
        <div className="controls-row">
          {mode === 'auto' && <AutoBadge active={autoActive} note={hit || '—'} />}
          <div className="control">
            <label>BPM</label>
            <input type="number" min="60" max="180" value={bpm} onChange={e => setBpm(Number(e.target.value) || 96)}
              style={{ width: 50, border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit' }}/>
          </div>
          <button className="btn btn-ghost" onClick={startBeat}>
            {playing ? <><Icons.Pause size={14}/> stop loop</> : <><Icons.Play size={14}/> play loop</>}
          </button>
        </div>
      </div>
      <div className="stage">
        <div className="drum-pads">
          {pads.map(p => (
            <div
              key={p.id}
              className={`drum-pad ${hit === p.id ? 'hit' : ''}`}
              style={{ '--bg-1': p.bg1, '--bg-2': p.bg2 }}
              onPointerDown={() => tap(p.id)}
            >
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Dholak ---------- */
function DholakScreenComponent({ onBack, mode }) {
  const [hit, setHit] = useState(null);
  const pads = [
    { id: 'dholak-dha',  label: 'Dha', sub: 'left boom', bg1: '#E89B7A', bg2: '#6E3F25' },
    { id: 'dholak-bass', label: 'Ge',  sub: 'left tap', bg1: '#E0A458', bg2: '#A8593C' },
    { id: 'dholak-na',   label: 'Na',  sub: 'right slap', bg1: '#F5C9A1', bg2: '#C97B5C' },
    { id: 'dholak-tin',  label: 'Tin', sub: 'right tap', bg1: '#F5E0C8', bg2: '#E0A458' },
  ];
  const tap = (id) => {
    window.VibeAudio.playDrum(id);
    setHit(id); setTimeout(() => setHit(h => h === id ? null : h), 130);
  };
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);
  const startKaherwa = () => {
    if (playing) { clearInterval(intervalRef.current); setPlaying(false); return; }
    setPlaying(true);
    // Kaherwa: Dha Ge Na Ti | Na Ka Dhin Na (8 beat, dholak feel)
    const pattern = ['dholak-dha','dholak-bass','dholak-na','dholak-tin',
                     'dholak-na','dholak-bass','dholak-dha','dholak-na'];
    let i = 0;
    intervalRef.current = setInterval(() => {
      const id = pattern[i % pattern.length];
      window.VibeAudio.playDrum(id);
      setHit(id); setTimeout(() => setHit(null), 100);
      i++;
    }, 60000 / 110);
  };
  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Auto: onsets trigger pattern
  const lastPitchRef = useRef(0);
  const autoIdx = useRef(0);
  const { active: autoActive } = useAutoMic({
    enabled: mode === 'auto',
    onPitch: (r) => { lastPitchRef.current = r.pitch; },
    onOnset: (o) => {
      const pitch = lastPitchRef.current;
      let id;
      if (o.strength > 0.55) id = pitch && pitch < 250 ? 'dholak-dha' : 'dholak-na';
      else if (o.strength > 0.3) id = (autoIdx.current % 2 === 0) ? 'dholak-tin' : 'dholak-bass';
      else id = 'dholak-bass';
      window.VibeAudio.playDrum(id);
      setHit(id); setTimeout(() => setHit(null), 100);
      autoIdx.current++;
    }
  });

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Dholak</div>
          <div className="dimmed" style={{ fontSize: 13 }}>{mode === 'auto' ? 'beat with your voice · dholak follows' : 'two heads · boom on left, slap on right'}</div>
        </div>
        <div className="controls-row">
          {mode === 'auto' && <AutoBadge active={autoActive} note={hit || '—'} />}
          <button className="btn btn-ghost" onClick={startKaherwa}>
            {playing ? <><Icons.Pause size={14}/> stop</> : <><Icons.Play size={14}/> kaherwa</>}
          </button>
        </div>
      </div>
      <div className="stage">
        <div className="drum-pads">
          {pads.map(p => (
            <div
              key={p.id}
              className={`drum-pad ${hit === p.id ? 'hit' : ''}`}
              style={{ '--bg-1': p.bg1, '--bg-2': p.bg2 }}
              onPointerDown={() => tap(p.id)}
            >
              {p.label}
              <span className="sub">{p.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GuitarScreen, ViolinScreen, TablaScreen, SitarScreen, HarmoniumScreen, DrumsScreen, DholakScreen: DholakScreenComponent });
