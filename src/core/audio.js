export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.sfx = null
    this.ambientBus = null
    this.muted = false
    this.ambientNodes = []
    this.started = false
  }

  async ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.72
      this.master.connect(this.ctx.destination)

      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -18
      comp.knee.value = 14
      comp.ratio.value = 6
      comp.attack.value = 0.003
      comp.release.value = 0.2
      comp.connect(this.master)

      this.sfx = this.ctx.createGain()
      this.sfx.gain.value = 0.9
      this.sfx.connect(comp)

      this.ambientBus = this.ctx.createGain()
      this.ambientBus.gain.value = 0.0
      this.ambientBus.connect(this.master)

      this.reverb = this.ctx.createConvolver()
      this.reverb.buffer = this.makeImpulse(2.3, 2.4)
      this.reverbSend = this.ctx.createGain()
      this.reverbSend.gain.value = 0.18
      this.reverbSend.connect(this.reverb)
      this.reverb.connect(comp)

      this.noiseBuffer = this.makeNoise(2)
      this.ambientBus.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.2)
      this.startAmbience()
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  makeNoise(seconds) {
    const rate = this.ctx.sampleRate
    const buffer = this.ctx.createBuffer(1, rate * seconds, rate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * seconds)
    const buffer = this.ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
      }
    }
    return buffer
  }

  setMuted(muted) {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.72, this.ctx.currentTime + 0.15)
    }
  }

  startAmbience() {
    if (!this.ctx || this.started) return
    this.started = true
    const t = this.ctx.currentTime

    const wind = this.ctx.createBufferSource()
    wind.buffer = this.noiseBuffer
    wind.loop = true
    const windFilter = this.ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 420
    windFilter.Q.value = 0.55
    const windGain = this.ctx.createGain()
    windGain.gain.value = 0.09
    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.09
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 0.035
    lfo.connect(lfoGain)
    lfoGain.connect(windGain.gain)
    wind.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(this.ambientBus)
    wind.start(t)
    lfo.start(t)

    const droneGain = this.ctx.createGain()
    droneGain.gain.value = 0.022
    droneGain.connect(this.ambientBus)
    const freqs = [55, 82.4, 110.2]
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator()
      osc.type = i === 2 ? 'triangle' : 'sine'
      osc.frequency.value = f
      const g = this.ctx.createGain()
      g.gain.value = i === 2 ? 0.3 : 0.55
      osc.connect(g)
      g.connect(droneGain)
      osc.start(t)
      this.ambientNodes.push(osc)
    })

    this.ambientNodes.push(wind, lfo)
  }

  stopAmbience() {
    const t = this.ctx?.currentTime
    if (t == null) return
    this.ambientBus.gain.cancelScheduledValues(t)
    this.ambientBus.gain.linearRampToValueAtTime(0, t + 0.4)
  }

  resumeAmbience() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.ambientBus.gain.cancelScheduledValues(t)
    this.ambientBus.gain.linearRampToValueAtTime(0.3, t + 0.4)
  }

  noiseBurst({ duration = 0.1, type = 'lowpass', freq = 2200, endFreq = 300, gain = 0.6, q = 0.8, when = 0, send = 0.2 } = {}) {
    if (!this.ctx) return
    const t = this.ctx.currentTime + when
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.playbackRate.value = 0.9 + Math.random() * 0.2
    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + duration)
    filter.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + duration)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.sfx)
    if (send > 0) {
      const s = this.ctx.createGain()
      s.gain.value = send
      g.connect(s)
      s.connect(this.reverbSend)
    }
    src.start(t)
    src.stop(t + duration + 0.02)
  }

  tone({ freq = 200, endFreq = 60, duration = 0.2, type = 'sine', gain = 0.4, when = 0, send = 0 } = {}) {
    if (!this.ctx) return
    const t = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(g)
    g.connect(this.sfx)
    if (send > 0) {
      const s = this.ctx.createGain()
      s.gain.value = send
      g.connect(s)
      s.connect(this.reverbSend)
    }
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  shot() {
    if (!this.ctx) return
    this.noiseBurst({ duration: 0.19, type: 'lowpass', freq: 5200, endFreq: 260, gain: 0.7, q: 0.7, send: 0.35 })
    this.noiseBurst({ duration: 0.045, type: 'highpass', freq: 1400, endFreq: 2600, gain: 0.22, q: 0.5 })
    this.tone({ freq: 145, endFreq: 42, duration: 0.18, type: 'triangle', gain: 0.5, send: 0.2 })
    this.tone({ freq: 68, endFreq: 36, duration: 0.28, type: 'sine', gain: 0.38, send: 0.15 })
  }

  enemyShot(distance = 20) {
    if (!this.ctx) return
    const v = Math.max(0.12, Math.min(0.48, 16 / Math.max(distance, 4)))
    this.noiseBurst({ duration: 0.16, type: 'lowpass', freq: 3000, endFreq: 220, gain: v, q: 0.6, send: 0.3 })
    this.tone({ freq: 110, endFreq: 40, duration: 0.16, gain: v * 0.55, send: 0.2 })
  }

  hit(head = false) {
    if (!this.ctx) return
    this.tone({ freq: head ? 1250 : 880, endFreq: head ? 640 : 520, duration: 0.055, type: 'square', gain: 0.09 })
    this.noiseBurst({ duration: 0.03, type: 'highpass', freq: 2200, endFreq: 3200, gain: 0.1 })
  }

  kill() {
    if (!this.ctx) return
    this.tone({ freq: 520, endFreq: 900, duration: 0.09, type: 'sine', gain: 0.16 })
    this.tone({ freq: 780, endFreq: 1180, duration: 0.12, type: 'sine', gain: 0.1, when: 0.07 })
  }

  reload() {
    if (!this.ctx) return
    this.noiseBurst({ duration: 0.06, type: 'bandpass', freq: 1800, endFreq: 900, gain: 0.22, q: 2 })
    this.tone({ freq: 220, endFreq: 120, duration: 0.07, type: 'square', gain: 0.08 })
    this.noiseBurst({ duration: 0.07, type: 'bandpass', freq: 1200, endFreq: 2400, gain: 0.18, q: 2, when: 0.55 })
    this.tone({ freq: 180, endFreq: 320, duration: 0.08, type: 'square', gain: 0.1, when: 1.35 })
  }

  empty() {
    if (!this.ctx) return
    this.noiseBurst({ duration: 0.03, type: 'bandpass', freq: 2600, endFreq: 1500, gain: 0.16, q: 3 })
  }

  footstep(run = false) {
    if (!this.ctx) return
    this.noiseBurst({ duration: 0.085, type: 'lowpass', freq: run ? 900 : 620, endFreq: 90, gain: run ? 0.18 : 0.1, q: 1.3 })
    this.tone({ freq: run ? 90 : 70, endFreq: 38, duration: 0.08, gain: 0.08 })
  }

  damage() {
    if (!this.ctx) return
    this.noiseBurst({ duration: 0.22, type: 'lowpass', freq: 600, endFreq: 90, gain: 0.35, q: 1 })
    this.tone({ freq: 90, endFreq: 45, duration: 0.3, type: 'sawtooth', gain: 0.12 })
  }

  explosion() {
    if (!this.ctx) return
    this.noiseBurst({ duration: 0.8, type: 'lowpass', freq: 1500, endFreq: 70, gain: 0.85, q: 0.8, send: 0.5 })
    this.tone({ freq: 70, endFreq: 24, duration: 0.7, type: 'sine', gain: 0.7, send: 0.4 })
    this.tone({ freq: 140, endFreq: 30, duration: 0.35, type: 'triangle', gain: 0.35 })
  }

  click() {
    if (!this.ctx) return
    this.tone({ freq: 640, endFreq: 420, duration: 0.045, type: 'triangle', gain: 0.06 })
  }

  wave() {
    if (!this.ctx) return
    ;[220, 277, 330].forEach((f, i) => this.tone({ freq: f, endFreq: f * 1.01, duration: 0.7, type: 'sine', gain: 0.08, when: i * 0.12, send: 0.4 }))
  }

  victory() {
    if (!this.ctx) return
    ;[262, 330, 392, 523].forEach((f, i) => this.tone({ freq: f, endFreq: f, duration: 0.9, type: 'triangle', gain: 0.09, when: i * 0.14, send: 0.5 }))
  }
}
