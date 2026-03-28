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

  playHit(type: 'perfect' | 'great' | 'good') {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const freq = { perfect: 880, great: 660, good: 440 }[type];
    const dur = { perfect: 0.15, great: 0.12, good: 0.1 }[type];
    const vol = { perfect: 0.3, great: 0.25, good: 0.2 }[type];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (type === 'perfect') osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);

    if (type === 'perfect' || type === 'great') {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.5, now);
      gain2.gain.setValueAtTime(vol * 0.3, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);
      osc2.start(now);
      osc2.stop(now + dur);
    }
  }

  playMiss() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
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
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + i * 0.07);
      g.gain.setValueAtTime(0.2, now + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.12);
      o.start(now + i * 0.07);
      o.stop(now + i * 0.07 + 0.12);
    });
  }

  playTick() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playGo() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
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
  // Freq bands: bass(20-150Hz), low-mid(150-500), mid(500-2k), high(2k-8k)
  // bin ≈ 21.5Hz at 44100/2048
  private readonly B = [[1,7],[7,23],[23,93],[93,372]];

  async init(): Promise<boolean> {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia(
        { audio: true, video: { width: 1 as any, height: 1 as any, frameRate: 1 as any }, preferCurrentTab: true } as any
      );
      s.getVideoTracks().forEach(t => t.stop());
      if (!s.getAudioTracks().length) { s.getTracks().forEach(t => t.stop()); return false; }
      this.stream = s;
      this.audioCtx = new AudioContext();
      const src = this.audioCtx.createMediaStreamSource(new MediaStream(s.getAudioTracks()));
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
    this.audioCtx?.close();
    this.stream = null; this.audioCtx = null; this.analyser = null;
  }
}
