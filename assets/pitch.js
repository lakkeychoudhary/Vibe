/* ============================================================
   Vibe Pitch + Tempo Detector v2
   - YIN-lite autocorrelation pitch detection (smaller window for low latency)
   - Spectral-flux onset detection (works for melodic singing, not just percussion)
   - Melody-aware tempo estimator (notes that hold then change count as beats)
   ============================================================ */
(function () {
  let mic = null;
  let analyser = null;
  let timeData = null;
  let freqData = null;
  let prevFreq = null;
  let raf = null;
  let listeners = new Set();
  let onsetListeners = new Set();
  let lastResult = { pitch: 0, midi: 0, note: '—', clarity: 0, rms: 0, tempo: 0 };

  // tempo + onset state
  const onsetHistory = [];
  const noteChangeHistory = [];
  let lastOnsetTime = 0;
  let lastNoteChangeTime = 0;
  let lastMidi = -1;
  let fluxRollingMean = 0;
  let tempo = 0;

  async function start() {
    if (mic) return true;
    await window.VibeAudio.resume();
    const ctx = window.VibeAudio.ctx;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    mic = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;          // smaller = lower latency, plenty for vocals
    analyser.smoothingTimeConstant = 0.05; // tight: react fast to changes
    mic.connect(analyser);
    timeData = new Float32Array(analyser.fftSize);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    prevFreq = new Uint8Array(analyser.frequencyBinCount);
    loop();
    return true;
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (mic) { try { mic.disconnect(); } catch (e) {} mic = null; }
    listeners.clear();
    onsetListeners.clear();
    onsetHistory.length = 0;
    noteChangeHistory.length = 0;
    lastMidi = -1;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!analyser) return;
    analyser.getFloatTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);
    const rms = computeRMS(timeData);
    const sampleRate = window.VibeAudio.ctx.sampleRate;
    let pitch = 0, clarity = 0, midi = 0, note = '—';
    if (rms > 0.008) {
      // For higher freqs use a smaller window for speed (still 16ms at 100Hz min)
      // we always have 1024 samples; YIN walks up to sr/70 ~ 685 lags. Keep as-is.
      const r = autocorrelate(timeData, sampleRate);
      if (r.freq > 0) {
        pitch = r.freq;
        clarity = r.clarity;
        midi = Math.round(12 * Math.log2(pitch / 440) + 69);
        note = window.VibeAudio.noteName(midi);
      }
    }
    detectOnsetAndNote(rms, midi, clarity);
    prevFreq.set(freqData);
    lastResult = { pitch, midi, note, clarity, rms, tempo };
    listeners.forEach(fn => { try { fn(lastResult); } catch (e) {} });
  }

  function computeRMS(buf) {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  // YIN-lite. Early-exits at first dip below threshold for low latency.
  function autocorrelate(buf, sr) {
    const SIZE = buf.length;
    const MIN_FREQ = 75;
    const MAX_FREQ = 1200;
    const minLag = Math.floor(sr / MAX_FREQ);
    const maxLag = Math.min(SIZE - 1, Math.floor(sr / MIN_FREQ));
    const threshold = 0.18;

    // Single-pass: compute yin[tau] until first dip below threshold + parabolic interp
    let runningSum = 0;
    let foundTau = -1, foundVal = 1, prevVal = 1, prevPrev = 1;
    let bestTau = minLag, bestVal = 1;

    for (let tau = 1; tau < maxLag; tau++) {
      let sum = 0;
      const lim = SIZE - tau;
      // Unrolled loop step 4 for speed
      let i = 0;
      for (; i + 3 < lim; i += 4) {
        const d0 = buf[i] - buf[i + tau];
        const d1 = buf[i+1] - buf[i+1+tau];
        const d2 = buf[i+2] - buf[i+2+tau];
        const d3 = buf[i+3] - buf[i+3+tau];
        sum += d0*d0 + d1*d1 + d2*d2 + d3*d3;
      }
      for (; i < lim; i++) {
        const d = buf[i] - buf[i + tau];
        sum += d * d;
      }
      runningSum += sum;
      const v = sum * tau / Math.max(1e-9, runningSum);

      if (tau >= minLag) {
        if (v < bestVal) { bestVal = v; bestTau = tau; }
        // detect first dip below threshold then look for local minimum (descending)
        if (foundTau === -1 && v < threshold && v > prevVal) {
          // we just passed the minimum at tau-1
          foundTau = tau - 1; foundVal = prevVal;
          // parabolic interp using prevPrev, prevVal, v
          let betterTau = foundTau;
          const denom = (2 * (2 * prevVal - v - prevPrev));
          if (denom !== 0) betterTau = foundTau + (v - prevPrev) / denom;
          return { freq: sr / betterTau, clarity: 1 - foundVal };
        }
      }
      prevPrev = prevVal;
      prevVal = v;
    }
    // fallback: best minimum
    if (bestVal > 0.65) return { freq: 0, clarity: 0 };
    return { freq: sr / bestTau, clarity: 1 - bestVal };
  }

  // Spectral-flux onset detection.
  // For each frame, flux = sum of positive bin differences (energy that has risen).
  // Threshold = rolling mean * 1.5. Works for sung vocals where amplitude is smooth
  // but spectral content shifts on note changes.
  function detectOnsetAndNote(rms, midi, clarity) {
    const now = performance.now();

    // Spectral flux
    let flux = 0;
    for (let i = 0; i < freqData.length; i++) {
      const d = freqData[i] - prevFreq[i];
      if (d > 0) flux += d;
    }
    flux /= freqData.length;
    // exponentially weighted mean
    fluxRollingMean = fluxRollingMean * 0.92 + flux * 0.08;

    const fluxOnset = (flux > fluxRollingMean * 1.8) && (flux > 4) && (rms > 0.025);
    const noteOnset = (midi > 0 && clarity > 0.45 && midi !== lastMidi && rms > 0.02);

    if (fluxOnset && now - lastOnsetTime > 110) {
      lastOnsetTime = now;
      onsetHistory.push(now);
      if (onsetHistory.length > 16) onsetHistory.shift();
      const strength = Math.min(1, flux / (fluxRollingMean * 4 + 1));
      onsetListeners.forEach(fn => { try { fn({ strength, rms, time: now, kind: 'flux' }); } catch (e) {} });
      updateTempo();
    }

    if (noteOnset && now - lastNoteChangeTime > 80) {
      lastNoteChangeTime = now;
      noteChangeHistory.push(now);
      if (noteChangeHistory.length > 16) noteChangeHistory.shift();
      lastMidi = midi;
      // note-change is a *softer* onset event — still notify
      if (!fluxOnset) {
        onsetListeners.forEach(fn => { try { fn({ strength: 0.4, rms, time: now, kind: 'note' }); } catch (e) {} });
      }
    }
  }

  function updateTempo() {
    if (onsetHistory.length < 3) return;
    // Use intervals between recent onsets; find dominant interval
    const intervals = [];
    for (let i = 1; i < onsetHistory.length; i++) {
      intervals.push(onsetHistory[i] - onsetHistory[i - 1]);
    }
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    let bpm = 60000 / median;
    while (bpm < 60)  bpm *= 2;
    while (bpm > 200) bpm /= 2;
    tempo = Math.round(bpm);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function onOnset(fn) {
    onsetListeners.add(fn);
    return () => onsetListeners.delete(fn);
  }

  function getSpectrum() {
    if (!analyser) return null;
    return freqData;
  }

  function getLastOnsetTime() { return lastOnsetTime; }
  function getRecentOnsets() { return onsetHistory.slice(); }

  window.VibePitch = {
    start, stop, subscribe, onOnset,
    get isActive() { return !!mic; },
    get last() { return lastResult; },
    getSpectrum, getLastOnsetTime, getRecentOnsets,
  };
})();
