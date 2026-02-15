/*
  SINET Audio Engine
  File: js/audio/audio-engine.js
  Version: 4.7
  Notes:
    - Reliable oscillator play
    - Proper stats for timer UI
    - Pause/Resume preserves elapsed time
*/

export class SinetAudioEngine {
  constructor(opts = {}) {
    this.audioContext = null;
    this.masterGain = null;
    this.oscillators = [];
    this.isPlaying = false;

    // v15.4.7 — audible carrier for sub-50Hz
    this.subCarrierHz = Number(opts.subCarrierHz) || 200;
    this.subCarrierThresholdHz = Number(opts.subCarrierThresholdHz) || 50;

    this.currentSequence = [];
    this.currentIndex = 0;
    this.totalDurationSec = 0;
    this.durationPerFreq = 0;

    // Optional per-frequency durations (seconds), aligned to sequence indices
    this._durationsSec = null;

    this._tickTimer = null;
    this._stepStartedAt = 0;
    this._resumeOffsetSec = 0;

    this.onTick = opts.onTick || null;
    this.onFreqChange = opts.onFreqChange || null;
    this.onComplete = opts.onComplete || null;
    this.onSkip = opts.onSkip || null;

    // Skip/disable support
    this._disabled = new Set();
  }

  init() {
    if (!this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      // Split output: direct -> destination, and media -> MediaStreamDestination (iOS background best-effort)
      this.outGainDirect = this.audioContext.createGain();
      this.outGainMedia = this.audioContext.createGain();
      this.mediaDest = this.audioContext.createMediaStreamDestination();
      this.outGainDirect.gain.value = 1;
      this.outGainMedia.gain.value = 0;
      this.masterGain.connect(this.outGainDirect);
      this.outGainDirect.connect(this.audioContext.destination);
      this.masterGain.connect(this.outGainMedia);
      this.outGainMedia.connect(this.mediaDest);
      this.masterGain.gain.value = 0.25; // louder default
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  playFrequency(freq) {
    this.stopOscillator();
    this.init();

    const ctx = this.audioContext;
    const hz = Math.max(0, Number(freq) || 0);

    // If frequency is sub-audible, render as AM on a fixed carrier (default 200 Hz)
    if (hz > 0 && hz < this.subCarrierThresholdHz) {
      const carrierHz = Math.max(40, Number(this.subCarrierHz) || 200);

      const carrier = ctx.createOscillator();
      carrier.type = "sine";
      carrier.frequency.setValueAtTime(carrierHz, ctx.currentTime);

      // Amplitude node: 0.5 offset so gain stays >= 0
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.5, ctx.currentTime);

      const mod = ctx.createOscillator();
      mod.type = "sine";
      mod.frequency.setValueAtTime(hz, ctx.currentTime);

      // Depth 0.5 so gain swings 0..1
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0.5, ctx.currentTime);

      mod.connect(depth);
      depth.connect(amp.gain);

      carrier.connect(amp);
      amp.connect(this.masterGain);

      mod.start();
      carrier.start();

      this.oscillators.push(carrier, mod);
      this.isPlaying = true;
      return;
    }

    // Normal audible oscillator
    if (hz <= 0) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, ctx.currentTime);
    osc.connect(this.masterGain);
    osc.start();

    this.oscillators.push(osc);
    this.isPlaying = true;
  }

  stopOscillator() {
    for (const osc of this.oscillators) {
      try { osc.stop(); osc.disconnect(); } catch(e) {}
    }
    this.oscillators = [];
    this.isPlaying = false;
  }

  loadSequence(list, totalDurationSec, startIndex = 0, elapsedInCurrentFreq = 0, durationsSec = null) {
    this.currentSequence = Array.isArray(list) ? list : [];
    this.totalDurationSec = Math.max(0, Number(totalDurationSec) || 0);
    this.currentIndex = Math.max(0, Number(startIndex) || 0);

    this._disabled = new Set();

    // Optional: per-frequency durations (seconds), aligned to original indices
    this._durationsSec = null;
    if (Array.isArray(durationsSec) && durationsSec.length === this.currentSequence.length) {
      this._durationsSec = durationsSec.map(v => Math.max(0, Number(v) || 0));
      const sum = this._durationsSec.reduce((acc, v) => acc + (Number(v) || 0), 0);
      if (!this.totalDurationSec || this.totalDurationSec < sum) this.totalDurationSec = sum;
    }

    const n = Math.max(1, this.currentSequence.length);
    this.durationPerFreq = this.totalDurationSec / n;
    this._resumeOffsetSec = Math.max(0, Number(elapsedInCurrentFreq) || 0);
  }


  _durFor(index) {
    const i = Number(index);
    if (this._durationsSec && Number.isFinite(i) && i >= 0 && i < this._durationsSec.length) {
      const v = Number(this._durationsSec[i]);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return Math.max(0, Number(this.durationPerFreq) || 0);
  }

  _isEnabledIndex(i) {
    return !this._disabled.has(Number(i));
  }

  _enabledCount() {
    const n = this.currentSequence.length || 0;
    let c = 0;
    for (let i = 0; i < n; i++) if (this._isEnabledIndex(i)) c++;
    return c;
  }


  isEnabled(index) {
    return this._isEnabledIndex(index);
  }

  setEnabled(index, enabled) {
    const i = Number(index);
    if (!Number.isFinite(i)) return;
    if (enabled) this._disabled.delete(i);
    else this._disabled.add(i);
  }

  skipCurrent() {
    // disable current and move to next immediately
    const i = this.currentIndex;
    this.setEnabled(i, false);

    // stop current sound & timer
    this.stopOscillator();
    if (this._tickTimer) clearInterval(this._tickTimer);
    this._tickTimer = null;

    this._resumeOffsetSec = 0;
    this.currentIndex += 1;
    this._runStep();
  }
  play() {
    this.init();
    this._runStep();
  }

  _runStep() {
    // auto-skip disabled items
    while (this.currentIndex < this.currentSequence.length && this._disabled.has(this.currentIndex)) {
      const skippedObj = this.currentSequence[this.currentIndex] || {};
      this.onSkip && this.onSkip(skippedObj, this._buildStats(0));
      this.currentIndex += 1;
    }

    if (this.currentIndex >= this.currentSequence.length) {
      this.stop();
      this.onComplete && this.onComplete();
      return;
    }

    const obj = this.currentSequence[this.currentIndex] || {};
    const hz = Number(obj.value) || 0;

    this.playFrequency(hz);
    this._stepStartedAt = this.audioContext.currentTime;

    const stepDur = this._durFor(this.currentIndex);
    const timeLeft = Math.max(0, stepDur - this._resumeOffsetSec);

    // immediate callback
    this.onFreqChange && this.onFreqChange(obj, this._buildStats(this._resumeOffsetSec));

    if (this._tickTimer) clearInterval(this._tickTimer);
    this._tickTimer = setInterval(() => {
      if (!this.isPlaying) return;

      const elapsedSinceStart = this.audioContext.currentTime - this._stepStartedAt;
      const elapsedInFreq = this._resumeOffsetSec + elapsedSinceStart;

      this.onTick && this.onTick(this._buildStats(elapsedInFreq));

      if (elapsedSinceStart >= timeLeft) {
        clearInterval(this._tickTimer);
        this._tickTimer = null;
        this._resumeOffsetSec = 0;
        this.currentIndex += 1;
        this._runStep();
      }
    }, 200);
  }

  _buildStats(elapsedInFreq) {
    const totalItems = this.currentSequence.length || 0;
    const elapsedIn = Math.max(0, Number(elapsedInFreq) || 0);

    // Track totals should ignore disabled items
    let enabledTotalItems = 0;
    let currentPos = 0; // position among enabled items (0-based)
    let totalTrackSec = 0;
    let elapsedTrackSec = 0;

    for (let i = 0; i < totalItems; i++) {
      if (!this._isEnabledIndex(i)) continue;
      const d = this._durFor(i);
      enabledTotalItems += 1;
      totalTrackSec += d;

      if (i < this.currentIndex) {
        currentPos += 1;
        elapsedTrackSec += d;
      } else if (i === this.currentIndex) {
        elapsedTrackSec += Math.max(0, Math.min(d, elapsedIn));
      }
    }

    const durationCurrentSec = this._durFor(this.currentIndex);

    return {
      currentIndex: this.currentIndex,
      totalItems,
      enabledTotalItems,
      currentPos,
      elapsedInFreq: elapsedIn,
      durationPerFreq: Math.max(0, Number(this.durationPerFreq) || 0),
      durationCurrentSec,
      totalDurationSec: Math.max(0, Number(this.totalDurationSec) || 0),
      totalTrackSec: Math.max(0, Number(totalTrackSec) || 0),
      elapsedTrackSec: Math.max(0, Number(elapsedTrackSec) || 0),
      hasPerFreqDurations: !!this._durationsSec
    };
  }

  pause() {
    let elapsed = 0;
    if (this.isPlaying && this.audioContext) {
      elapsed = this._resumeOffsetSec + (this.audioContext.currentTime - this._stepStartedAt);
    }
    this._resumeOffsetSec = Math.max(0, elapsed);

    this.stopOscillator();
    if (this._tickTimer) clearInterval(this._tickTimer);
    this._tickTimer = null;
    return this.getState();
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
    this._resumeOffsetSec = 0;
  }


// Alias used by UI (now playing list, skip logic)
getStats() {
  // best-effort: build a stats object similar to _buildStats
  const elapsed = this._resumeOffsetSec || 0;
  return this._buildStats(elapsed);
}

  getState() {
    return this._buildStats(this._resumeOffsetSec);
  }
  // Enable HTMLMediaElement output via MediaStream (best-effort; helps iOS lock-screen/background in some cases)
  enableMediaOutput(audioEl) {
    this.init();
    if (!this.mediaDest || !this.outGainMedia || !this.outGainDirect) return false;
    if (!audioEl) return false;
    try {
      audioEl.srcObject = this.mediaDest.stream;
      audioEl.preload = "auto";
      audioEl.playsInline = true;
      audioEl.setAttribute("playsinline", "");
      audioEl.muted = false;
      // Switch output: prefer media element, mute direct path to avoid double audio
      this.outGainMedia.gain.value = 1;
      this.outGainDirect.gain.value = 0;

      const p = audioEl.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      return true;
    } catch (e) {
      // Fallback: keep direct output
      try { this.outGainDirect.gain.value = 1; this.outGainMedia.gain.value = 0; } catch(_) {}
      return false;
    }
  }

  disableMediaOutput() {
    try {
      if (this.outGainDirect) this.outGainDirect.gain.value = 1;
      if (this.outGainMedia) this.outGainMedia.gain.value = 0;
    } catch(_) {}
  }

  getMediaStream() {
    this.init();
    return this.mediaDest ? this.mediaDest.stream : null;
  }

}
