export class SoundEngine {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  /** Hit-Sound pro Bewertung */
  playHit(type: 'perfect' | 'great' | 'good' | 'bad') {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    if (type === 'perfect') {
      // Chime: bright arpeggio
      [880, 1100, 1320, 1760].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + i * 0.04);
        g.gain.setValueAtTime(0.25, now + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.15);
        o.start(now + i * 0.04);
        o.stop(now + i * 0.04 + 0.15);
      });
    } else if (type === 'great') {
      // Pling: two-tone
      [660, 990].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + i * 0.06);
        g.gain.setValueAtTime(0.22, now + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
        o.start(now + i * 0.06);
        o.stop(now + i * 0.06 + 0.12);
      });
    } else if (type === 'good') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      o.frequency.setValueAtTime(440, now);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      o.start(now);
      o.stop(now + 0.1);
    } else {
      // Bad: dull thud
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(200, now);
      o.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      o.start(now);
      o.stop(now + 0.12);
    }
  }

  playMiss() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCombo() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + i * 0.07);
      g.gain.setValueAtTime(0.2, now + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.12);
      o.start(now + i * 0.07);
      o.stop(now + i * 0.07 + 0.12);
    });
  }

  /** Crowd Applaus (weißes Rauschen mit Modulation) */
  playCrowdCheer(duration: number = 1.5) {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Shaped noise to sound like crowd
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2000, now);
    bandpass.Q.setValueAtTime(0.5, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** Countdown Tick (3, 2, 1) */
  playCountdownTick(number: number) {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const freq = number > 0 ? 440 : 880; // GO! ist höher
    const dur = number > 0 ? 0.15 : 0.3;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = number > 0 ? 'sine' : 'square';
    o.frequency.setValueAtTime(freq, now);
    if (number === 0) o.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.start(now);
    o.stop(now + dur);
  }

  playTick() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playGo() {
    this.playCountdownTick(0);
  }

  /** Level Up sound */
  playLevelUp() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + i * 0.1);
      g.gain.setValueAtTime(0.25, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      o.start(now + i * 0.1);
      o.stop(now + i * 0.1 + 0.3);
    });
  }
}

export class BeatScheduler {
  private beatInterval: number;
  private lastBeatTime: number = 0;
  private beatCount: number = 0;

  constructor(bpm: number, subBeats: number = 1) {
    const safeBpm = Math.max(60, Math.min(300, bpm));
    this.beatInterval = (60000 / safeBpm) / subBeats;
  }

  update(currentTime: number): number {
    if (this.lastBeatTime === 0) {
      this.lastBeatTime = currentTime;
      return 1;
    }
    let beats = 0;
    while (currentTime - this.lastBeatTime >= this.beatInterval) {
      this.lastBeatTime += this.beatInterval;
      this.beatCount++;
      beats++;
    }
    return beats;
  }

  reset() {
    this.lastBeatTime = 0;
    this.beatCount = 0;
  }
}

export class TapBPMDetector {
  private taps: number[] = [];

  tap(): number | null {
    const now = Date.now();
    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > 3000) {
      this.taps = [];
    }
    this.taps.push(now);
    if (this.taps.length > 8) this.taps.shift();
    if (this.taps.length < 2) return null;
    let total = 0;
    for (let i = 1; i < this.taps.length; i++) {
      total += this.taps[i] - this.taps[i - 1];
    }
    return Math.round(60000 / (total / (this.taps.length - 1)));
  }

  reset() { this.taps = []; }
}

/**
 * Auto-BPM-Detection via Web Audio API
 * Analysiert Audio-Energie-Peaks um den BPM zu schätzen
 */
export class AutoBPMDetector {
  private audioCtx: AudioContext | null = null;

  async detectFromStream(stream: MediaStream, durationSec: number = 10): Promise<number | null> {
    try {
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const energyHistory: number[] = [];
      const sampleRate = 60; // Samples per second

      return new Promise((resolve) => {
        const interval = setInterval(() => {
          analyser.getByteFrequencyData(data);
          // Focus on bass frequencies (first 10 bins)
          let bassEnergy = 0;
          for (let i = 0; i < 10; i++) bassEnergy += data[i];
          energyHistory.push(bassEnergy);

          if (energyHistory.length >= sampleRate * durationSec) {
            clearInterval(interval);
            resolve(this.estimateBPM(energyHistory, sampleRate));
          }
        }, 1000 / sampleRate);

        // Timeout fallback
        setTimeout(() => {
          clearInterval(interval);
          if (energyHistory.length > sampleRate * 2) {
            resolve(this.estimateBPM(energyHistory, sampleRate));
          } else {
            resolve(null);
          }
        }, (durationSec + 2) * 1000);
      });
    } catch {
      return null;
    }
  }

  private estimateBPM(energyHistory: number[], sampleRate: number): number {
    // Einfache Peak-Detection: Finde die durchschnittliche Zeit zwischen Energie-Peaks
    const avg = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
    const threshold = avg * 1.3;

    const peaks: number[] = [];
    let lastPeak = -10;

    for (let i = 1; i < energyHistory.length - 1; i++) {
      if (energyHistory[i] > threshold &&
          energyHistory[i] > energyHistory[i - 1] &&
          energyHistory[i] > energyHistory[i + 1] &&
          i - lastPeak > sampleRate * 0.2) {
        peaks.push(i);
        lastPeak = i;
      }
    }

    if (peaks.length < 2) return 120; // Fallback

    // Durchschnittliches Intervall zwischen Peaks
    let totalInterval = 0;
    for (let i = 1; i < peaks.length; i++) {
      totalInterval += peaks[i] - peaks[i - 1];
    }
    const avgInterval = totalInterval / (peaks.length - 1);
    const secondsPerBeat = avgInterval / sampleRate;
    const bpm = Math.round(60 / secondsPerBeat);

    // Clamp to reasonable range
    return Math.max(60, Math.min(240, bpm));
  }

  destroy() {
    this.audioCtx?.close();
    this.audioCtx = null;
  }
}

export class AudioAnalyzer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array | null = null;
  private stream: MediaStream | null = null;
  private prevEnergy = [0, 0, 0, 0];
  private lastSpawn = [0, 0, 0, 0];
  private sustainMs = [0, 0, 0, 0];
  private lastTime = 0;
  private globalLast = 0;
  private _active = false;
  private source: MediaStreamAudioSourceNode | null = null;
  private readonly B = [[1,7],[7,23],[23,93],[93,372]];

  async init(): Promise<boolean> {
    try {
      const mediaPromise = navigator.mediaDevices.getDisplayMedia(
        { audio: true, video: { width: 1 as any, height: 1 as any, frameRate: 1 as any }, preferCurrentTab: true } as any
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getDisplayMedia timeout')), 5000)
      );
      const s = await Promise.race([mediaPromise, timeoutPromise]);
      s.getVideoTracks().forEach(t => t.stop());
      if (!s.getAudioTracks().length) { s.getTracks().forEach(t => t.stop()); return false; }
      this.stream = s;
      this.audioCtx = new AudioContext();
      const src = this.audioCtx.createMediaStreamSource(new MediaStream(s.getAudioTracks()));
      this.source = src;
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;
      src.connect(this.analyser);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this._active = true;
      return true;
    } catch { return false; }
  }

  get active() { return this._active; }

  analyze(time: number, minInt: number, maxPS: number): { col: number; isHold: boolean; holdDur: number }[] {
    if (!this.analyser || !this.freqData) return [];
    const dt = this.lastTime ? time - this.lastTime : 16;
    this.lastTime = time;
    this.analyser.getByteFrequencyData(this.freqData);
    const gcd = 1000 / maxPS;
    const res: { col: number; isHold: boolean; holdDur: number }[] = [];
    for (let b = 0; b < 4; b++) {
      let sum = 0, c = 0;
      for (let i = this.B[b][0]; i < this.B[b][1] && i < this.freqData.length; i++) { sum += this.freqData[i]; c++; }
      const e = c ? sum / c : 0;
      const flux = e - this.prevEnergy[b];
      if (e > 70) this.sustainMs[b] += dt; else this.sustainMs[b] = 0;
      if (flux > 25 && e > 50 && time - this.lastSpawn[b] > minInt && time - this.globalLast > gcd) {
        this.lastSpawn[b] = time;
        this.globalLast = time;
        const hold = this.sustainMs[b] > 400;
        res.push({ col: b, isHold: hold, holdDur: hold ? Math.min(2.5, this.sustainMs[b] / 800) : 0 });
        this.sustainMs[b] = 0;
      }
      this.prevEnergy[b] = e * 0.7 + this.prevEnergy[b] * 0.3;
    }
    return res;
  }

  destroy() {
    this._active = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.source?.disconnect();
    this.audioCtx?.close();
    this.stream = null; this.audioCtx = null; this.analyser = null;
  }
}
