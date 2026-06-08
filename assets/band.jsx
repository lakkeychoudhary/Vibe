/* ============================================================
   Vibe — Band Mode v3 (Karaoke-style)
   - Phase 1: LISTENING — silent, gathers pitch + onsets
   - Phase 2: LOCKED — once tempo + key detected, plays groove on grid
       * Tabla (Indian feel) or Drum-kit groove pattern
       * Bass plucks chord roots on downbeats
       * Harmonium pad sustains chord, changes per bar
       * Lead echoes user's melody snapped to scale
   - Chord progression: per-bar, picks chord whose root matches the
     melody most-sung note in that bar (functional harmony in key)
   - Fades out after ~2s of silence; resumes on resume
   ============================================================ */

function BandScreen({ onBack }) {
  const [active, setActive] = useState(false);
  const [singing, setSinging] = useState(false);
  const [locked, setLocked] = useState(false);
  const [key, setKey] = useState('C Major');
  const [tempo, setTempo] = useState(0);
  const [bar, setBar] = useState(0);
  const [beat, setBeat] = useState(0);
  const [feel, setFeel] = useState('indian'); // 'indian' | 'pop'
  const [note, setNote] = useState('—');
  const [pitch, setPitch] = useState(0);
  const [rms, setRms] = useState(0);
  const [members, setMembers] = useState({
    drums:  { on: true, vol: 0.9,  lvl: 0 },
    bass:   { on: true, vol: 0.85, lvl: 0 },
    pad:    { on: true, vol: 0.55, lvl: 0 },
    melody: { on: true, vol: 0.7,  lvl: 0 },
  });

  // ---- refs ----
  const rmsRef = useRef(0);
  const pitchRef = useRef(0);
  const midiRef = useRef(0);
  const clarityRef = useRef(0);
  const lastVoiceTimeRef = useRef(0);
  const keyRef = useRef('C Major');
  const tempoRef = useRef(0);
  const lockedRef = useRef(false);
  const feelRef = useRef('indian');
  const membersRef = useRef(members);
  useEffect(() => { membersRef.current = members; }, [members]);
  useEffect(() => { keyRef.current = key; }, [key]);
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  useEffect(() => { feelRef.current = feel; }, [feel]);

  // pitch class histogram (long-term for key)
  const pcHist = useRef(new Array(12).fill(0));
  const lastDecay = useRef(performance.now());

  // melody note buffer for current bar (pitch class -> sum of time held)
  const barNotes = useRef(new Map());

  // groove scheduler state
  const schedulerRef = useRef({ active: false, raf: 0, beatNum: 0, nextBeatTime: 0, currentChordRoot: 0, currentChordQual: 'maj' });

  const lastMelodyMidi = useRef(0);
  const lastMelodyTime = useRef(0);

  const start = async () => {
    await window.VibeAudio.resume();
    try {
      await window.VibePitch.start();
      setActive(true); setLocked(false);
      pcHist.current = new Array(12).fill(0);
      barNotes.current = new Map();
    } catch (e) { alert('Mic needed.\n' + e.message); }
  };
  const stop = () => {
    window.VibePitch.stop();
    setActive(false); setSinging(false); setLocked(false);
    setTempo(0); setNote('—'); setPitch(0); setRms(0); setBar(0); setBeat(0);
    if (schedulerRef.current.raf) cancelAnimationFrame(schedulerRef.current.raf);
    schedulerRef.current.active = false;
  };
  useEffect(() => () => stop(), []);

  // ---- Pitch subscription ----
  useEffect(() => {
    if (!active) return;
    const unsubP = window.VibePitch.subscribe((r) => {
      rmsRef.current = r.rms;
      setRms(r.rms);
      // Update display + barNotes + histogram
      if (r.pitch && r.clarity > 0.45 && r.rms > 0.018) {
        pitchRef.current = r.pitch;
        midiRef.current = r.midi;
        clarityRef.current = r.clarity;
        const now = performance.now();
        lastVoiceTimeRef.current = now;
        setPitch(r.pitch);
        setNote(window.VibeAudio.noteName(r.midi));

        const pc = ((r.midi % 12) + 12) % 12;
        // long-term histogram
        if (now - lastDecay.current > 4000) {
          pcHist.current = pcHist.current.map(v => v * 0.85);
          lastDecay.current = now;
        }
        pcHist.current[pc] += r.clarity;

        // bar-local histogram (for chord choice)
        barNotes.current.set(pc, (barNotes.current.get(pc) || 0) + r.clarity);
      }
    });
    const unsubO = window.VibePitch.onOnset((o) => {
      // tempo updates handled inside pitch.js — we read tempoRef from window.VibePitch.last.tempo
      const t = window.VibePitch.last.tempo;
      if (t && t !== tempoRef.current) {
        setTempo(t);
      }
    });
    return () => { unsubP(); unsubO(); };
  }, [active]);

  // ---- Key detection (low-freq tick) ----
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
      const minor = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
      let bestScore = -1, bestKey = 'C', bestMode = 'Major';
      for (let r = 0; r < 12; r++) {
        let sM = 0, sm = 0;
        for (let i = 0; i < 12; i++) {
          sM += pcHist.current[(i + r) % 12] * major[i];
          sm += pcHist.current[(i + r) % 12] * minor[i];
        }
        if (sM > bestScore) { bestScore = sM; bestKey = window.VibeAudio.ROOTS[r]; bestMode = 'Major'; }
        if (sm > bestScore) { bestScore = sm; bestKey = window.VibeAudio.ROOTS[r]; bestMode = 'Minor'; }
      }
      const sum = pcHist.current.reduce((a, b) => a + b, 0);
      if (sum > 3) setKey(`${bestKey} ${bestMode}`);
    }, 500);
    return () => clearInterval(id);
  }, [active]);

  // ---- Lock criteria: stable tempo + sustained singing ----
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const recent = window.VibePitch.getRecentOnsets();
      const t = window.VibePitch.last.tempo;
      const sum = pcHist.current.reduce((a, b) => a + b, 0);
      // need 3+ onsets, valid tempo, some melody history — lock fast
      if (!lockedRef.current && recent.length >= 3 && t > 0 && sum > 1.5) {
        setLocked(true);
      } else if (lockedRef.current) {
        // if user is silent for >2s, unlock to relisten
        if (performance.now() - lastVoiceTimeRef.current > 2000) {
          setLocked(false);
        }
      }
    }, 120);
    return () => clearInterval(id);
  }, [active]);

  // ---- The Karaoke Groove Scheduler ----
  useEffect(() => {
    if (!active || !locked) {
      if (schedulerRef.current.raf) cancelAnimationFrame(schedulerRef.current.raf);
      schedulerRef.current.active = false;
      return;
    }
    const sched = schedulerRef.current;
    sched.active = true;
    sched.beatNum = 0;
    sched.nextBeatTime = performance.now() + 200;

    // chord chooser: pick from {I, IV, V, vi} (or i, iv, v, VI in minor) based on bar histogram
    const chooseChord = () => {
      const [keyRoot, keyMode] = keyRef.current.split(' ');
      const keyRootIdx = window.VibeAudio.ROOTS.indexOf(keyRoot);
      const intervals = (keyMode === 'Minor')
        ? { 'i': 0, 'iv': 5, 'v': 7, 'VI': 8 }
        : { 'I': 0, 'IV': 5, 'V': 7, 'vi': 9 };
      const qualities = (keyMode === 'Minor')
        ? { 'i': 'min', 'iv': 'min', 'v': 'min', 'VI': 'maj' }
        : { 'I': 'maj', 'IV': 'maj', 'V': 'maj', 'vi': 'min' };

      // bar histogram \u2014 sum across chord tones (1, 3, 5) for each candidate
      let bestRoot = keyRootIdx, bestQual = qualities[Object.keys(intervals)[0]], bestScore = -1;
      Object.keys(intervals).forEach(deg => {
        const rootPc = (keyRootIdx + intervals[deg]) % 12;
        const thirdPc = (rootPc + (qualities[deg] === 'maj' ? 4 : 3)) % 12;
        const fifthPc = (rootPc + 7) % 12;
        const score = (barNotes.current.get(rootPc) || 0) * 2
                    + (barNotes.current.get(thirdPc) || 0)
                    + (barNotes.current.get(fifthPc) || 0) * 1.2;
        if (score > bestScore) { bestScore = score; bestRoot = rootPc; bestQual = qualities[deg]; }
      });
      // if no melody data this bar, default to current key root
      if (bestScore <= 0) { bestRoot = keyRootIdx; bestQual = keyMode === 'Minor' ? 'min' : 'maj'; }
      return { root: bestRoot, qual: bestQual };
    };

    // INDIAN groove: Kaherwa-flavored, 8 beats per bar
    //  beat: 1   2   3   4   5   6   7   8
    //  taal: Dha Ge  Na  Tin Na  Ge  Dhin Na    (with subdivision flam on offbeats)
    const indianPattern = ['tabla-dha','tabla-ge','tabla-na','tabla-tin',
                           'tabla-na','tabla-ge','tabla-dhin','tabla-na'];
    // POP groove: 4-on-floor kick + snare on 2/4 + 8th hats
    const popPattern = [
      { kick: 1, snare: 0, hat: 1 },
      { kick: 0, snare: 0, hat: 1 },
      { kick: 0, snare: 1, hat: 1 },
      { kick: 0, snare: 0, hat: 1 },
      { kick: 1, snare: 0, hat: 1 },
      { kick: 1, snare: 0, hat: 1 },
      { kick: 0, snare: 1, hat: 1 },
      { kick: 0, snare: 0, hat: 1 },
    ];

    const tick = (now) => {
      if (!sched.active) return;
      sched.raf = requestAnimationFrame(tick);

      const t = performance.now();
      const bpm = tempoRef.current || 96;
      const beatMs = 60000 / bpm / 2; // 8th-note grid
      const voiceActive = (t - lastVoiceTimeRef.current) < 1500 && rmsRef.current > 0.012;

      // run scheduler events; allow catch-up if behind
      while (t >= sched.nextBeatTime) {
        const stepInBar = sched.beatNum % 8;
        const isDownbeat = (stepInBar === 0);
        const m = membersRef.current;

        // === Per-bar chord update at downbeat ===
        if (isDownbeat) {
          const c = chooseChord();
          sched.currentChordRoot = c.root;
          sched.currentChordQual = c.qual;
          // reset bar histogram
          barNotes.current = new Map();
          setBar(b => b + 1);

          // bass on downbeat
          if (voiceActive && m.bass.on) {
            const bassMidi = 36 + c.root;
            window.VibeAudio.playPluck(bassMidi, { decay: 1.3, brightness: 0.32, gain: 1.15 * m.bass.vol });
            setMembers(p => ({ ...p, bass: { ...p.bass, lvl: 1 } }));
          }
          // pad chord, sustained for ~1 bar
          if (voiceActive && m.pad.on) {
            const chordMidis = window.VibeAudio.chordFor(48 + c.root, c.qual);
            const barDur = beatMs * 8 / 1000;
            chordMidis.forEach(n => window.VibeAudio.playHarmonium(n, barDur + 0.2, 0.55 * m.pad.vol));
            setMembers(p => ({ ...p, pad: { ...p.pad, lvl: 1 } }));
          }
        }
        // bass extra hit on beat 5 (mid bar)
        if (stepInBar === 4 && voiceActive && membersRef.current.bass.on) {
          const fifth = (sched.currentChordRoot + 7) % 12;
          const bassMidi = 36 + fifth;
          window.VibeAudio.playPluck(bassMidi, { decay: 1.2, brightness: 0.32, gain: 0.95 * membersRef.current.bass.vol });
          setMembers(p => ({ ...p, bass: { ...p.bass, lvl: 0.8 } }));
        }

        // === Drums on grid ===
        if (voiceActive && membersRef.current.drums.on) {
          if (feelRef.current === 'indian') {
            const bol = indianPattern[stepInBar];
            window.VibeAudio.playDrum(bol);
          } else {
            const p = popPattern[stepInBar];
            if (p.kick)  window.VibeAudio.playDrum('kick');
            if (p.snare) window.VibeAudio.playDrum('snare');
            if (p.hat)   window.VibeAudio.playDrum('hat');
          }
          setMembers(p => ({ ...p, drums: { ...p.drums, lvl: 1 } }));
        }

        setBeat(stepInBar);
        sched.beatNum++;
        sched.nextBeatTime += beatMs;
      }

      // === LEAD (off-grid, follows user pitch immediately) ===
      const m = membersRef.current;
      if (voiceActive && m.melody.on && pitchRef.current && clarityRef.current > 0.45) {
        const [keyRoot, keyMode] = keyRef.current.split(' ');
        const snapped = window.VibeAudio.snapToScale(midiRef.current, keyRoot, keyMode === 'Minor' ? 'Minor' : 'Major');
        if (snapped !== lastMelodyMidi.current && t - lastMelodyTime.current > 40) {
          lastMelodyMidi.current = snapped;
          lastMelodyTime.current = t;
          window.VibeAudio.playPluck(snapped, { decay: 1.5, brightness: 0.6, gain: 0.85 * m.melody.vol });
          setMembers(p => ({ ...p, melody: { ...p.melody, lvl: 1 } }));
        }
      }

      // smooth decay of visual levels
      setMembers(p => ({
        drums:  { ...p.drums,  lvl: Math.max(0, p.drums.lvl  - 0.06) },
        bass:   { ...p.bass,   lvl: Math.max(0, p.bass.lvl   - 0.03) },
        pad:    { ...p.pad,    lvl: Math.max(0, p.pad.lvl    - 0.012) },
        melody: { ...p.melody, lvl: Math.max(0, p.melody.lvl - 0.07) },
      }));

      setSinging(voiceActive);
    };

    sched.raf = requestAnimationFrame(tick);
    return () => { if (sched.raf) cancelAnimationFrame(sched.raf); sched.active = false; };
  }, [active, locked]);

  const setMember = (id, patch) => {
    setMembers(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  // status copy
  let statusLine;
  if (!active) statusLine = 'tap the mic to begin · everything runs on your device';
  else if (!locked) statusLine = 'listening · sing a few notes so we can lock your key & tempo…';
  else if (singing) statusLine = 'band is following you · change notes to change the chord';
  else statusLine = 'paused · sing again to resume';

  return (
    <div className="screen player fade-in">
      <div className="player-head">
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div className="brand-name" style={{ fontSize: 32 }}>Band Mode</div>
          <div className="dimmed" style={{ fontSize: 13 }}>
            karaoke-style backing · listens, locks, plays in your key &amp; tempo
          </div>
        </div>
        <div className="controls-row">
          <div className="mode-tabs" style={{ padding: 4 }}>
            <button className={feel === 'indian' ? 'active' : ''} onClick={() => setFeel('indian')} style={{ padding: '8px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Drum size={12}/> Indian
            </button>
            <button className={feel === 'pop' ? 'active' : ''} onClick={() => setFeel('pop')} style={{ padding: '8px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Slider size={12}/> Pop
            </button>
          </div>
          <div className="control">
            <label>BPM</label>
            <strong style={{ fontSize: 16, color: 'var(--ink)' }}>{tempo || '—'}</strong>
          </div>
          <div className="control">
            <label>Key</label>
            <strong style={{ fontSize: 16, color: 'var(--terra)' }}>{key}</strong>
          </div>
          <div className="control" style={{ borderColor: locked ? '#2DAA6E' : undefined }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {locked ? <><Icons.Lock size={12}/> locked</> : <><Icons.Ear size={12}/> listening</>}
            </label>
            <strong style={{ fontSize: 14, color: locked ? '#1F7D54' : 'var(--ink-soft)' }}>bar {bar} · beat {beat + 1}</strong>
          </div>
        </div>
      </div>

      <div className="stage">
        <div className="band-stage">
          <div className="band-hero">
            <div className="band-mic">
              <div className="ring r1" style={{ borderColor: locked ? 'rgba(45,170,110,0.4)' : undefined }}/>
              <div className="ring r2" style={{ borderColor: locked ? 'rgba(45,170,110,0.3)' : undefined }}/>
              <div className="ring r3" />
              <div className="band-mic-orb" onClick={active ? stop : start}
                style={{
                  transform: `scale(${1 + Math.min(0.18, rms * 1.8)})`,
                  transition: 'transform 0.05s ease',
                  boxShadow: singing ? '0 30px 80px -10px rgba(255, 180, 100, 0.75)' : '0 30px 80px -20px rgba(168, 89, 60, 0.55)'
                }}>
                <MicIcon size={64} />
              </div>
            </div>

            <div className="band-info">
              <div className="band-stat">
                <span className="k">You're singing</span>
                <span className="v">{active && singing ? note : '—'}</span>
              </div>
              <div className="band-stat">
                <span className="k">Detected key</span>
                <span className="v">{active ? key : 'listening…'}</span>
              </div>
              <div className="band-stat">
                <span className="k">Tempo</span>
                <span className="v">{tempo || '—'} <span style={{ fontSize: 14, opacity: 0.6 }}>bpm</span></span>
              </div>
              <button className="btn btn-primary" onClick={active ? stop : start}>
                {active
                  ? <><Icons.Pause size={14}/> Stop the band</>
                  : <><Icons.Play size={14}/> Start listening</>}
                {!active && <span className="btn-icon"><MicIcon size={14} /></span>}
              </button>
              {active && !locked && (
                <div className="hand center" style={{ fontSize: 17, color: 'var(--terra-deep)' }}>
                  sing 4–8 beats so we can lock onto your tune
                </div>
              )}
            </div>
          </div>

          <div className="band-row">
            {[
              { id: 'drums',  name: feel === 'indian' ? 'Tabla' : 'Drums',  sub: feel === 'indian' ? 'kaherwa groove' : 'kick · snare · hat' },
              { id: 'bass',   name: 'Bass',    sub: 'plucked roots' },
              { id: 'pad',    name: 'Harmony', sub: 'harmonium chord' },
              { id: 'melody', name: 'Lead',    sub: 'echoes your pitch' },
            ].map(m => (
              <div key={m.id} className={`band-member ${members[m.id].on ? 'active' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="name">{m.name}</div>
                  <Toggle on={members[m.id].on} onChange={(v) => setMember(m.id, { on: v })} />
                </div>
                <div className="sub">{m.sub}</div>
                <div className="wave">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span key={i} style={{ height: `${4 + members[m.id].lvl * (8 + Math.abs(Math.sin(i + Date.now() / 200) * 14))}px` }}/>
                  ))}
                </div>
                <input type="range" min="0" max="1" step="0.01"
                  value={members[m.id].vol}
                  onChange={e => setMember(m.id, { vol: Number(e.target.value) })}/>
              </div>
            ))}
          </div>

          <p className="dimmed center hand" style={{ fontSize: 20 }}>{statusLine}</p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BandScreen });
