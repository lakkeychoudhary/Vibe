/* ============================================================
   Vibe Audio Engine
   Pure Web Audio synthesis. No samples, all generated.
   Exposes window.VibeAudio with init() + per-instrument voices.
   ============================================================ */
(function () {
  let ctx = null;
  let master = null;
  let limiter = null;
  let reverb = null;
  let reverbSend = null;

  // ---- helpers ----
  const noteToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = (midi) => NOTE_NAMES[midi % 12] + Math.floor(midi / 12 - 1);

  function makeReverb(seconds = 2.2, decay = 2.5) {
    const rate = ctx.sampleRate;
    const length = rate * seconds;
    const buf = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  function init() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = 1.4; // push hot — limiter will catch peaks

    // hot maximizer-style limiter (keeps signal as loud as possible)
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 4;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.06;

    // makeup gain after limiter to push output close to 0 dBFS
    const makeup = ctx.createGain();
    makeup.gain.value = 1.6;

    reverb = makeReverb(2.2, 2.4);
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.12;

    master.connect(limiter);
    limiter.connect(makeup);
    makeup.connect(ctx.destination);
    master.connect(reverbSend);
    reverbSend.connect(reverb);
    reverb.connect(makeup);

    return ctx;
  }

  function ensure() { if (!ctx) init(); return ctx; }

  function resume() {
    ensure();
    if (ctx.state === 'suspended') return ctx.resume();
    return Promise.resolve();
  }

  // ---- Piano ----
  // FM-ish synthesis: sine carrier + several decaying harmonics, hammer click
  function playPiano(midi, velocity = 0.85) {
    ensure();
    const now = ctx.currentTime;
    const freq = noteToFreq(midi);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);

    // hammer click
    const click = ctx.createBufferSource();
    const clickBuf = ctx.createBuffer(1, 1024, ctx.sampleRate);
    const cd = clickBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cd.length, 6);
    click.buffer = clickBuf;
    const clickGain = ctx.createGain();
    clickGain.gain.value = 0.06 * velocity;
    click.connect(clickGain).connect(out);
    click.start(now);

    // harmonics
    const harmonics = [
      { mult: 1, amp: 1.0, decay: 1.8 },
      { mult: 2, amp: 0.5, decay: 1.2 },
      { mult: 3, amp: 0.18, decay: 0.8 },
      { mult: 4, amp: 0.08, decay: 0.5 },
      { mult: 5.01, amp: 0.05, decay: 0.4 },
    ];
    harmonics.forEach(h => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * h.mult;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(h.amp * 0.25 * velocity, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + h.decay * (1 + (midi < 60 ? 0.6 : 0)));
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + h.decay + 0.1);
    });

    // overall envelope
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(1.3 * velocity, now + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

    return { stop: () => { try { out.gain.cancelScheduledValues(ctx.currentTime); out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2); } catch (e) {} } };
  }

  // ---- Flute / Sustained breath instrument ----
  // continuous oscillator with breath noise + vibrato; volume modulated externally
  function createFluteVoice() {
    ensure();
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);

    // body oscillators (sine + small saw for shimmer)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 440;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.7;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.15;

    // vibrato
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 4; // cents -> hz approx
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.connect(lfoGain).connect(osc2.frequency);

    // breath noise
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.6;
    noise.connect(noiseFilter).connect(noiseGain).connect(out);

    osc.connect(oscGain).connect(out);
    osc2.connect(osc2Gain).connect(out);

    osc.start();
    osc2.start();
    lfo.start();
    noise.start();

    return {
      setFreq(freq, gliss = 0.06) {
        const t = ctx.currentTime;
        osc.frequency.cancelScheduledValues(t);
        osc2.frequency.cancelScheduledValues(t);
        osc.frequency.linearRampToValueAtTime(freq, t + gliss);
        osc2.frequency.linearRampToValueAtTime(freq, t + gliss);
        // brighter on higher freq
        noiseFilter.frequency.setTargetAtTime(800 + freq * 1.6, t, 0.05);
      },
      setVolume(v) {
        const t = ctx.currentTime;
        out.gain.setTargetAtTime(Math.min(1, Math.max(0, v)) * 0.95, t, 0.04);
        noiseGain.gain.setTargetAtTime(Math.min(1, Math.max(0, v)) * 0.08, t, 0.04);
      },
      stop() {
        try {
          out.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
          setTimeout(() => {
            osc.stop(); osc2.stop(); lfo.stop(); noise.stop();
            out.disconnect();
          }, 200);
        } catch (e) {}
      }
    };
  }

  // ---- Guitar / Sitar (Karplus-Strong) ----
  function playPluck(midi, opts = {}) {
    ensure();
    const now = ctx.currentTime;
    const freq = noteToFreq(midi);
    const decay = opts.decay ?? 2.0;
    const brightness = opts.brightness ?? 0.55;
    const buzz = opts.buzz ?? 0; // for sitar
    const length = Math.max(2, Math.floor(ctx.sampleRate / freq));
    const bufLen = Math.floor(ctx.sampleRate * decay);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // seed with noise
    for (let i = 0; i < length && i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    // Karplus-Strong loop (read-safe: never accesses d[-1])
    for (let i = length; i < bufLen; i++) {
      const a = d[i - length];
      const b = (i - length - 1 >= 0) ? d[i - length - 1] : a;
      let v = 0.5 * (a + b * brightness) * 0.997;
      if (buzz > 0) {
        v = Math.tanh(v * (1 + buzz * 2)) * (1 + buzz * 0.1 * Math.sin(i * 0.001));
      }
      d[i] = v;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime((opts.gain ?? 0.75), now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = Math.min(7000, freq * 12);
    src.connect(filt).connect(g).connect(master);
    src.start(now);
    src.stop(now + decay + 0.2);
  }

  // ---- Strum a chord ----
  function strumChord(midiNotes, opts = {}) {
    const stride = opts.stride ?? 0.025;
    midiNotes.forEach((n, i) => {
      setTimeout(() => playPluck(n, opts), i * stride * 1000);
    });
  }

  // ---- Violin (bowed) ----
  function createBowVoice(midi) {
    ensure();
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);
    const freq = noteToFreq(midi);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq * 1.003;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2200;
    filt.Q.value = 4;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 3;
    lfo.connect(lfoG).connect(osc1.frequency);
    lfo.connect(lfoG).connect(osc2.frequency);

    osc1.connect(filt);
    osc2.connect(filt);
    filt.connect(out);
    osc1.start(); osc2.start(); lfo.start();

    return {
      setVolume(v) {
        const t = ctx.currentTime;
        out.gain.setTargetAtTime(v * 0.55, t, 0.05);
        filt.frequency.setTargetAtTime(1200 + v * 2500, t, 0.05);
      },
      setFreq(f) {
        const t = ctx.currentTime;
        osc1.frequency.linearRampToValueAtTime(f, t + 0.04);
        osc2.frequency.linearRampToValueAtTime(f * 1.003, t + 0.04);
      },
      stop() {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        setTimeout(() => { try { osc1.stop(); osc2.stop(); lfo.stop(); out.disconnect(); } catch(e){} }, 300);
      }
    };
  }

  // single-shot violin note
  function playViolin(midi, dur = 1.4, vel = 0.7) {
    const v = createBowVoice(midi);
    let level = 0;
    let raf;
    const start = performance.now();
    function loop(t) {
      const elapsed = (t - start) / 1000;
      // attack 0.15, sustain, release
      if (elapsed < 0.18) level = (elapsed / 0.18) * vel;
      else if (elapsed < dur - 0.25) level = vel;
      else level = Math.max(0, vel * (1 - (elapsed - (dur - 0.25)) / 0.25));
      v.setVolume(level);
      if (elapsed < dur) raf = requestAnimationFrame(loop);
      else v.stop();
    }
    loop(performance.now());
  }

  // ---- Tabla / Dholak / Drums ----
  // Authentic-leaning synthesis: dayan (right) uses modal partials at near-harmonic
  // ratios for the bell-like ring; bayan (left) uses pitch-glide for hand-pressure
  // bend; dholak uses thicker bass body + slap. Mostly modeled, not faithful, but
  // recognizable as the right family of drums.

  // Dayan strike — bell-like ring with 4 inharmonic partials (kinar-tuned tabla).
  // ratios ~ [1, 2.0, 3.0, 4.0] with slight detune for realism.
  function dayanStrike(fundamentalHz, opts = {}) {
    const now = ctx.currentTime;
    const decay = opts.decay ?? 0.55;
    const vel = opts.vel ?? 1.0;
    const muted = opts.muted ?? false; // for 'Ta' vs 'Na' (Ta has shorter ring)
    const out = ctx.createGain();
    out.gain.value = 1.6 * vel;
    out.connect(master);

    // Modal partials with detune; amplitudes tuned to sound bell-like
    const partials = [
      { mul: 1.00, amp: 1.00, dec: muted ? decay * 0.3 : decay },
      { mul: 2.00, amp: 0.65, dec: muted ? decay * 0.25 : decay * 0.9 },
      { mul: 3.01, amp: 0.40, dec: muted ? decay * 0.2 : decay * 0.7 },
      { mul: 4.02, amp: 0.22, dec: muted ? decay * 0.15 : decay * 0.5 },
      { mul: 5.05, amp: 0.10, dec: decay * 0.3 },
    ];
    partials.forEach(p => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fundamentalHz * p.mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(p.amp * 0.4, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.dec);
      o.connect(g).connect(out);
      o.start(now); o.stop(now + p.dec + 0.05);
    });
    // sharp attack: highpass click
    addNoiseClick(out, now, 0.012, 0.55, 1500);
  }

  // Bayan strike — boomy low note with characteristic downward pitch glide
  // (hand pressure release on the membrane). Touch-decay variant for 'Ka' (closed).
  function bayanStrike(opts = {}) {
    const now = ctx.currentTime;
    const decay = opts.decay ?? 0.7;
    const vel = opts.vel ?? 1.0;
    const closed = opts.closed ?? false; // 'Ka' / 'Ke' is a closed slap
    const out = ctx.createGain();
    out.gain.value = 1.8 * vel;
    out.connect(master);

    const fStart = opts.fStart ?? 180;
    const fEnd = opts.fEnd ?? 90;

    // Body partial 1 — main body, drops in pitch
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(fStart * 1.6, now);
    o1.frequency.exponentialRampToValueAtTime(fStart, now + 0.02);
    o1.frequency.exponentialRampToValueAtTime(fEnd, now + (closed ? 0.06 : 0.25));
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.95, now + 0.003);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + (closed ? 0.15 : decay));
    o1.connect(g1).connect(out);
    o1.start(now); o1.stop(now + decay + 0.1);

    // Body partial 2 — adds growl
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(fStart * 2.3, now);
    o2.frequency.exponentialRampToValueAtTime(fEnd * 2, now + (closed ? 0.06 : 0.25));
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.18, now + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + (closed ? 0.1 : decay * 0.6));
    o2.connect(g2).connect(out);
    o2.start(now); o2.stop(now + decay + 0.1);

    // attack thump
    addNoiseClick(out, now, 0.018, closed ? 0.5 : 0.35, 80);
  }

  function playDrum(kind = 'tabla-na') {
    ensure();
    const now = ctx.currentTime;
    // ===== TABLA bols =====
    if (kind === 'tabla-na' || kind === 'tabla-ta') {
      // Na: rim strike on dayan — bright, ringing, ~440Hz fundamental
      dayanStrike(440, { decay: 0.65, vel: 1.0, muted: kind === 'tabla-ta' });
    } else if (kind === 'tabla-tin' || kind === 'tabla-ti') {
      // Tin: higher dayan strike with center finger — ~640Hz, slightly drier
      dayanStrike(640, { decay: 0.5, vel: 0.9 });
    } else if (kind === 'tabla-tu') {
      // Tu: very dry, muted, just the body of a dayan
      dayanStrike(440, { decay: 0.18, vel: 0.85, muted: true });
    } else if (kind === 'tabla-ge' || kind === 'tabla-ga') {
      // Ge: open bayan with bend (the iconic 'gummy' tabla bass)
      bayanStrike({ decay: 0.7, vel: 1.0, fStart: 180, fEnd: 80 });
    } else if (kind === 'tabla-ka' || kind === 'tabla-ke') {
      // Ka: closed slap on bayan, very short
      bayanStrike({ decay: 0.18, vel: 0.9, closed: true, fStart: 200, fEnd: 110 });
    } else if (kind === 'tabla-dha') {
      // Dha = Na + Ge played together
      dayanStrike(440, { decay: 0.6, vel: 0.95 });
      bayanStrike({ decay: 0.65, vel: 1.0, fStart: 175, fEnd: 78 });
    } else if (kind === 'tabla-dhin') {
      // Dhin = Tin + Ge
      dayanStrike(640, { decay: 0.55, vel: 0.95 });
      bayanStrike({ decay: 0.65, vel: 1.0, fStart: 170, fEnd: 76 });
    }
    // ===== DHOLAK bols =====
    else if (kind === 'dholak-bass' || kind === 'dholak-dha') {
      // Dholak left head — boomy, woody, faster decay than tabla bayan
      const out = ctx.createGain();
      out.gain.value = 2.0;
      out.connect(master);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(170, now);
      o.frequency.exponentialRampToValueAtTime(70, now + 0.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(1.0, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      o.connect(g).connect(out);
      o.start(now); o.stop(now + 0.4);
      // wood body resonance
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 320;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.15, now);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      o2.connect(g2).connect(out);
      o2.start(now); o2.stop(now + 0.1);
      addNoiseClick(out, now, 0.012, 0.4, 200);
    } else if (kind === 'dholak-ti' || kind === 'dholak-na') {
      // Dholak right head — slap, sharp, high
      const out = ctx.createGain();
      out.gain.value = 1.8;
      out.connect(master);
      // ringing partials but inharmonic + drier than tabla
      [380, 760, 1140].forEach((f, idx) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.02);
        const g = ctx.createGain();
        const amp = [0.6, 0.3, 0.12][idx];
        const dec = [0.18, 0.12, 0.08][idx];
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(amp, now + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dec);
        o.connect(g).connect(out);
        o.start(now); o.stop(now + dec + 0.05);
      });
      addNoiseClick(out, now, 0.025, 0.45, 2200);
    } else if (kind === 'dholak-tin') {
      // softer dholak right head tap
      const out = ctx.createGain();
      out.gain.value = 1.5;
      out.connect(master);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 580;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.5, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      o.connect(g).connect(out);
      o.start(now); o.stop(now + 0.28);
      addNoiseClick(out, now, 0.015, 0.25, 1800);
    }
    // ===== Drum kit =====
    else if (kind === 'kick') {
      const out = ctx.createGain(); out.gain.value = 1.6; out.connect(master);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(1.2, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.connect(g).connect(out);
      osc.start(now); osc.stop(now + 0.45);
      addNoiseClick(out, now, 0.015, 0.4, 200);
    } else if (kind === 'snare') {
      const out = ctx.createGain(); out.gain.value = 1.6; out.connect(master);
      addNoiseClick(out, now, 0.18, 0.8);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 220;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(g).connect(out);
      osc.start(now); osc.stop(now + 0.2);
    } else if (kind === 'hat') {
      const out = ctx.createGain(); out.gain.value = 1.4; out.connect(master);
      addNoiseClick(out, now, 0.05, 0.5, 8000);
    } else if (kind === 'crash') {
      const out = ctx.createGain(); out.gain.value = 1.4; out.connect(master);
      addNoiseClick(out, now, 0.8, 0.6, 6000);
    }
  }

  function addNoiseClick(dest, now, dur, level, hp = 1200) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(filt).connect(g).connect(dest);
    src.start(now); src.stop(now + dur + 0.05);
  }

  // ---- Harmonium (sustained reed) ----
  function playHarmonium(midi, dur = 1.2, vel = 0.7) {
    ensure();
    const now = ctx.currentTime;
    const freq = noteToFreq(midi);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);
    [1, 2, 3, 4].forEach((h, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'square';
      o.frequency.value = freq * h * (1 + (Math.random() - 0.5) * 0.001);
      const g = ctx.createGain();
      g.gain.value = 0.32 / (h * 0.7);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1800;
      o.connect(filt).connect(g).connect(out);
      o.start(now); o.stop(now + dur + 0.2);
    });
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(vel * 0.8, now + 0.08);
    out.gain.setValueAtTime(vel * 0.8, now + dur - 0.15);
    out.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  }

  // ---- Scales ----
  const SCALES = {
    'Major': [0, 2, 4, 5, 7, 9, 11],
    'Minor': [0, 2, 3, 5, 7, 8, 10],
    'Pentatonic': [0, 2, 4, 7, 9],
    'Blues': [0, 3, 5, 6, 7, 10],
    'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'Raag Yaman': [0, 2, 4, 6, 7, 9, 11],
    'Raag Bhairavi': [0, 1, 3, 5, 7, 8, 10],
    'Raag Bhairav': [0, 1, 4, 5, 7, 8, 11],
    'Raag Bhupali': [0, 2, 4, 7, 9],
    'Raag Darbari': [0, 2, 3, 5, 7, 8, 10],
    'Raag Malkauns': [0, 3, 5, 8, 10],
  };
  const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function scaleNotes(rootName, scaleName, baseOctave = 4) {
    const root = ROOTS.indexOf(rootName);
    const intervals = SCALES[scaleName] || SCALES['Major'];
    const baseMidi = 12 * (baseOctave + 1) + root;
    return intervals.map(i => baseMidi + i);
  }

  function snapToScale(midi, rootName, scaleName) {
    const root = ROOTS.indexOf(rootName);
    const intervals = SCALES[scaleName] || SCALES['Major'];
    const semis = ((midi - root) % 12 + 12) % 12;
    let best = intervals[0], bestD = 99;
    intervals.forEach(iv => {
      const d = Math.min(Math.abs(iv - semis), Math.abs(iv - semis + 12), Math.abs(iv - semis - 12));
      if (d < bestD) { bestD = d; best = iv; }
    });
    const octave = Math.floor((midi - root) / 12);
    return root + best + octave * 12;
  }

  // chord builder
  function chordFor(rootMidi, quality = 'maj') {
    if (quality === 'maj') return [rootMidi, rootMidi + 4, rootMidi + 7];
    if (quality === 'min') return [rootMidi, rootMidi + 3, rootMidi + 7];
    if (quality === '7') return [rootMidi, rootMidi + 4, rootMidi + 7, rootMidi + 10];
    if (quality === 'maj7') return [rootMidi, rootMidi + 4, rootMidi + 7, rootMidi + 11];
    if (quality === 'sus') return [rootMidi, rootMidi + 5, rootMidi + 7];
    return [rootMidi, rootMidi + 4, rootMidi + 7];
  }

  window.VibeAudio = {
    init, resume, ensure,
    get ctx() { return ctx; },
    get master() { return master; },
    noteToFreq, noteName, NOTE_NAMES,
    SCALES, ROOTS, scaleNotes, snapToScale, chordFor,
    playPiano, createFluteVoice, playPluck, strumChord, playViolin,
    createBowVoice, playDrum, playHarmonium,
    setMasterVolume(v) { ensure(); master.gain.value = v; },
    setReverb(v) { ensure(); reverbSend.gain.value = v; }
  };
})();
