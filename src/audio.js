import { clamp } from './utils.js';

const STATIONS = [
  {
    name: 'راديو الشمس',
    en: 'SUN FM 98.1',
    color: '#ffb703',
    tempo: 92,
    root: 55,
    bass: [0, 0, 3, 5, 0, -2, 3, 7, 0, 0, -5, 3, 0, 2, 5, 3],
    chord: [0, 3, 7],
    hat: 0.7,
  },
  {
    name: 'طريق 66',
    en: 'ROUTE 66.6',
    color: '#ff5d3a',
    tempo: 108,
    root: 65,
    bass: [0, 7, 0, 5, 3, 7, 0, -2, 0, 7, 10, 7, 3, 5, 7, 0],
    chord: [0, 4, 7],
    hat: 1,
  },
  {
    name: 'موجة الليل',
    en: 'NIGHTWAVE',
    color: '#7c6bff',
    tempo: 80,
    root: 49,
    bass: [0, 0, 3, 3, -2, -2, 5, 5, 0, 0, 3, 7, -2, 3, 5, 2],
    chord: [0, 3, 10],
    hat: 0.45,
  },
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.master = null;
    this.sfx = null;
    this.music = null;
    this.engineGain = null;
    this.rainGain = null;
    this.siren = null;
    this.radioOn = true;
    this.station = 0;
    this.musicTimer = null;
    this.musicRunning = false;
    this.nextNote = 0;
    this.beat = 0;
    this.noise = null;
    this.sirenTimer = null;
    this.engineRunning = false;
    this.rainRunning = false;
    this.volume = 0.7;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.6;
    this.sfx.connect(this.master);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);
    this.ready = true;
    this.noise = this.makeNoise(2);
  }

  makeNoise(seconds = 1) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.volume;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  noiseSource(rate = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rate;
    return src;
  }

  gun(kind = 'pistol') {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this.noiseSource(kind === 'smg' ? 1.6 : 1.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = kind === 'smg' ? 1800 : 1100;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    const dur = kind === 'smg' ? 0.075 : 0.14;
    gain.gain.setValueAtTime(kind === 'smg' ? 0.28 : 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.02);
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(kind === 'smg' ? 120 : 160, t);
    thump.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    thumpGain.gain.setValueAtTime(0.34, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    thump.connect(thumpGain);
    thumpGain.connect(this.sfx);
    thump.start(t);
    thump.stop(t + 0.14);
  }

  punch() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  impact() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const src = this.noiseSource(0.8);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + 0.14);
  }

  explosion() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const src = this.noiseSource(0.6);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + 1.15);
    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.7);
    sg.gain.setValueAtTime(0.6, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    sub.connect(sg);
    sg.connect(this.sfx);
    sub.start(t);
    sub.stop(t + 0.85);
  }

  chime(up = true) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const notes = up ? [523, 659, 784] : [784, 659, 523];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.14, t + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.18);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.2);
    });
  }

  pickup() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.05 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.16);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.18);
    });
  }

  ui() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 660;
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  horn() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [392, 494].forEach((f) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
      g.gain.setValueAtTime(0.07, t + 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  startEngine() {
    if (!this.ready || this.engineRunning) return;
    this.engineRunning = true;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, t);
    this.engineGain.gain.exponentialRampToValueAtTime(0.055, t + 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 27.5;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.sfx);
    osc.start();
    osc2.start();
    this.engine = { osc, osc2, filter };
  }

  stopEngine() {
    if (!this.engineRunning) return;
    this.engineRunning = false;
    const t = this.ctx.currentTime;
    try {
      this.engineGain.gain.cancelScheduledValues(t);
      this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, t);
      this.engineGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      this.engine.osc.stop(t + 0.25);
      this.engine.osc2.stop(t + 0.25);
    } catch {}
  }

  setEngine(speed01) {
    if (!this.engineRunning || !this.engine || !Number.isFinite(speed01)) return;
    speed01 = clamp(speed01, 0, 1);
    const t = this.ctx.currentTime;
    const f = 42 + speed01 * 130;
    this.engine.osc.frequency.setTargetAtTime(f, t, 0.08);
    this.engine.osc2.frequency.setTargetAtTime(f / 2, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(220 + speed01 * 1500, t, 0.08);
  }

  startSiren() {
    if (!this.ready || this.siren) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = 700;
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.5;
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.2);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    osc.start();
    this.siren = { osc, g };
    let high = false;
    this.sirenTimer = setInterval(() => {
      if (!this.siren) return;
      high = !high;
      try {
        this.siren.osc.frequency.setTargetAtTime(high ? 940 : 660, this.ctx.currentTime, 0.12);
      } catch {}
    }, 420);
  }

  stopSiren() {
    if (!this.siren) return;
    clearInterval(this.sirenTimer);
    try {
      this.siren.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      this.siren.osc.stop(this.ctx.currentTime + 0.5);
    } catch {}
    this.siren = null;
  }

  startRain() {
    if (!this.ready || this.rainRunning) return;
    this.rainRunning = true;
    const ctx = this.ctx;
    const src = this.noiseSource(0.55);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1600;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.5);
    src.loop = true;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start();
    this.rain = { src, g };
  }

  stopRain() {
    if (!this.rainRunning) return;
    this.rainRunning = false;
    const t = this.ctx.currentTime;
    try {
      this.rain.g.gain.setTargetAtTime(0.0001, t, 0.4);
      this.rain.src.stop(t + 1.5);
    } catch {}
  }

  stationName() {
    const s = STATIONS[this.station];
    return { name: s.name, en: s.en, color: s.color };
  }

  cycleStation() {
    this.station = (this.station + 1) % STATIONS.length;
    if (this.musicRunning) {
      this.beat = 0;
      this.nextNote = this.ctx.currentTime + 0.08;
    }
    return this.stationName();
  }

  setRadio(on) {
    this.radioOn = on;
    if (!on) this.stopMusic();
  }

  startMusic() {
    if (!this.ready || this.musicRunning || !this.radioOn) return;
    this.musicRunning = true;
    this.music.gain.cancelScheduledValues(this.ctx.currentTime);
    this.music.gain.setTargetAtTime(0.13, this.ctx.currentTime, 0.4);
    this.nextNote = this.ctx.currentTime + 0.1;
    this.beat = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
  }

  stopMusic() {
    if (!this.musicRunning) return;
    this.musicRunning = false;
    clearInterval(this.musicTimer);
    if (this.music && this.ctx) {
      this.music.gain.cancelScheduledValues(this.ctx.currentTime);
      this.music.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
    }
  }

  scheduleMusic() {
    if (!this.ready || !this.musicRunning) return;
    const ctx = this.ctx;
    while (this.nextNote < ctx.currentTime + 0.25) {
      this.playBeat(this.beat, this.nextNote);
      const station = STATIONS[this.station];
      this.nextNote += 60 / station.tempo / 2;
      this.beat++;
    }
  }

  playBeat(beat, time) {
    const station = STATIONS[this.station];
    const ctx = this.ctx;
    const step = beat % 16;
    const bar = Math.floor(beat / 16);
    const beatInBar = beat % 8;
    const playKick = (t) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, t);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.14);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(this.music);
      osc.start(t);
      osc.stop(t + 0.2);
    };
    const playNoise = (t, hp, gain, dur) => {
      const src = this.noiseSource(1);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = hp;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.music);
      src.start(t);
      src.stop(t + dur + 0.02);
    };
    if (beatInBar === 0 || beatInBar === 3 || beatInBar === 6) playKick(time);
    if (beatInBar === 2 || beatInBar === 6) playNoise(time, 1200, 0.3, 0.13);
    if (station.hat > 0 && step % 2 === 0) playNoise(time, 7200, 0.055 * station.hat, 0.035);
    if (step % 4 === 2) playNoise(time, 5200, 0.03 * station.hat, 0.05);
    const note = station.root + station.bass[step];
    const f = 440 * Math.pow(2, (note - 69) / 12);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = f;
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.17, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.music);
    osc.start(time);
    osc.stop(time + 0.26);
    if (step === 0 || step === 8) {
      station.chord.forEach((interval, i) => {
        const note2 = station.root + 12 + interval + (i === 2 ? 12 : 0);
        const f2 = 440 * Math.pow(2, (note2 - 69) / 12);
        const o = ctx.createOscillator();
        const gg = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f2;
        o.detune.value = (Math.random() - 0.5) * 12;
        gg.gain.setValueAtTime(0.0001, time);
        gg.gain.exponentialRampToValueAtTime(0.028, time + 0.06);
        gg.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
        const fl = ctx.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.value = 900;
        o.connect(fl);
        fl.connect(gg);
        gg.connect(this.music);
        o.start(time);
        o.stop(time + 0.95);
      });
    }
    if (bar % 2 === 1 && step === 14) {
      const lead = station.root + 24 + station.chord[beatInBar % station.chord.length];
      const f2 = 440 * Math.pow(2, (lead - 69) / 12);
      const o = ctx.createOscillator();
      const gg = ctx.createGain();
      o.type = 'square';
      o.frequency.value = f2;
      gg.gain.setValueAtTime(0.0001, time);
      gg.gain.exponentialRampToValueAtTime(0.018, time + 0.01);
      gg.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
      o.connect(gg);
      gg.connect(this.music);
      o.start(time);
      o.stop(time + 0.22);
    }
  }
}
