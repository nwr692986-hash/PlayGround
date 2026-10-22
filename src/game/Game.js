import * as THREE from 'three'
import { buildMap, MAP_DATA } from '../world/maps.js'
import { Player } from './player.js'
import { Weapon } from './weapon.js'
import { EnemyManager, createSoldierModel } from './enemy.js'
import { Effects } from './effects.js'
import { HUD } from './hud.js'
import { AudioEngine } from '../core/audio.js'

const WAVES = [4, 6, 8]
const MAX_WAVES = 3
const isTouchDevice = () => matchMedia('(hover: none), (pointer: coarse)').matches || (navigator.maxTouchPoints > 1 && innerWidth < 1200) || location.search.includes('touch=1')

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor(0x0a0f0e)

    this.clock = new THREE.Clock()
    this.state = 'menu'
    this.selectedMap = 'baghdad'
    this.touch = isTouchDevice()
    this.sensitivity = 1
    this.qualityChoice = 'auto'
    this.soundMuted = false
    this.audio = new AudioEngine()
    this.hud = new HUD()
    this.menuWorld = null
    this.menuScene = null
    this.menuCamera = null
    this.menuExtras = null
    this.world = null
    this.scene = null
    this.viewScene = null
    this.viewCamera = null
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1200)
    this.player = null
    this.weapon = null
    this.enemies = null
    this.effects = null
    this.projectiles = []
    this.grenades = 2
    this.grenadeCooldown = 0
    this.score = 0
    this.kills = 0
    this.headshots = 0
    this.hits = 0
    this.wave = 1
    this.waveState = 'idle'
    this.waveSize = 0
    this.spawned = 0
    this.killed = 0
    this.spawnTimer = 0
    this.introTimer = 0
    this.intermissionTimer = 0
    this.lastAmmoNotify = null
    this.starting = false
    this.quality = 'high'

    document.body.classList.toggle('touch', this.touch)
    this.input = {
      moveX: 0, moveZ: 0, sprint: false, jump: false, firing: false,
      aiming: false, reloadPressed: false, grenadePressed: false,
      lookDX: 0, lookDY: 0
    }
    this.keys = new Set()
    this.lookPointer = null
    this.stickPointer = null
    this.stickX = 0
    this.stickZ = 0
    this.mouseLook = false
    this.mouseAim = false
    this.touchAim = false

    this.resize()
    this.setupInput()
    this.setupMenu()
    this.setupScreens()
    this.animate = this.animate.bind(this)
    requestAnimationFrame(this.animate)
    window.__rafidain = this
    window.__THREE = THREE
  }

  // ─────────────────────────── menu

  setupMenu() {
    this.createMenuWorld()
    this.selectMap('baghdad', false)

    document.querySelectorAll('.map-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.audio.click()
        this.selectMap(card.dataset.map)
      })
    })
    document.getElementById('start-btn').addEventListener('click', () => this.beginMission())
  }

  createMenuWorld() {
    const world = buildMap('baghdad', 'high')
    this.menuWorld = world
    this.menuScene = world.scene
    this.menuCamera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 1200)
    this.menuCamera.position.set(3.5, 12.5, 33)
    this.menuCamera.lookAt(-1, 5.2, -40)

    const squad = new THREE.Group()
    const soldierA = createSoldierModel({ uniform: 0x5c5f49, vest: 0x33362d, scarf: 0x4d4130 })
    soldierA.position.set(-4.4, 0, 7.4)
    soldierA.rotation.y = 0.12
    const soldierB = createSoldierModel({ uniform: 0x626147, vest: 0x393b31, scarf: 0x2e3b3b })
    soldierB.position.set(-3.1, 0, 9.6)
    soldierB.rotation.y = -0.1
    soldierB.scale.setScalar(0.98)
    squad.add(soldierA, soldierB)
    this.menuScene.add(squad)
    this.menuExtras = { squad, soldierA, soldierB }
  }

  disposeMenuWorld() {
    if (!this.menuScene) return
    disposeSceneGeometries(this.menuWorld.group)
    this.menuScene.remove(this.menuWorld.group)
    this.menuScene = null
    this.menuWorld = null
    this.menuExtras = null
  }

  selectMap(key, sound = true) {
    this.selectedMap = key
    const data = MAP_DATA[key]
    document.querySelectorAll('.map-card').forEach((card) => {
      const active = card.dataset.map === key
      card.classList.toggle('active', active)
      card.setAttribute('aria-selected', String(active))
    })
    const startMap = document.getElementById('start-map')
    startMap.textContent = `${data.name} · ${data.district}`
    document.getElementById('brief-code').textContent = `OP-0${Object.keys(MAP_DATA).indexOf(key) + 1}`
    document.getElementById('brief-title').textContent = data.district
    document.getElementById('brief-desc').textContent = data.desc
    document.getElementById('brief-region').textContent = data.name
    document.getElementById('brief-time').textContent = data.time
    document.getElementById('brief-threat').textContent = data.threat
    const widths = { baghdad: 56, basra: 92, erbil: 36 }
    document.getElementById('threat-bar').style.width = `${widths[key]}%`
    if (sound) this.audio.click()
  }

  async beginMission() {
    if (this.starting) return
    this.starting = true
    await this.audio.ensure()
    await this.startMission(this.selectedMap)
    this.starting = false
  }

  // ─────────────────────────── loading + gameplay setup

  async startMission(key) {
    const data = MAP_DATA[key]
    this.resetStats()
    const loading = document.getElementById('loading')
    const menu = document.getElementById('menu')
    menu.classList.add('hidden')
    loading.classList.remove('hidden')
    document.getElementById('loading-title').textContent = `${data.name} · ${data.district}`
    const tips = [
      'نصيحة: استخدم الغطاء وأعد التلقيم خلف الجدران.',
      'نصيحة: أطلق النار على الرأس لإنهاء الخصم بطلقة واحدة.',
      'نصيحة: الحركة أثناء التصويب تقلل دقتك.',
      'نصيحة: القنبلة مفيدة عند اقتراب مجموعة من الأعداء.',
      'نصيحة: اضغط زر التصويب لتقليل انتشار الرصاص.'
    ]
    document.getElementById('load-tip').textContent = tips[(Math.random() * tips.length) | 0]
    const statuses = ['تجهيز المنطقة…', 'بناء المباني…', 'إضاءة المشهد…', 'نشر القوات…', 'التحام…']
    const setProgress = (p, i) => {
      document.getElementById('loadbar-fill').style.width = `${p}%`
      document.getElementById('load-percent').textContent = `${p}%`
      document.getElementById('load-status').textContent = statuses[i] || statuses[0]
    }
    setProgress(8, 0)
    this.hud.hide()
    await wait(100)

    setProgress(24, 1)
    await wait(130)
    this.disposeGameplay()
    this.disposeMenuWorld()

    this.quality = this.resolveQuality()
    const qualityForMap = this.quality === 'low' ? 'low' : this.quality === 'medium' ? 'medium' : 'high'
    const world = buildMap(key, qualityForMap)
    this.world = world
    this.scene = world.scene
    this.scene.add(this.camera)
    this.setupViewModel()
    this.renderer.toneMappingExposure = world.skyConfig.exposure
    this.applyRenderQuality()

    setProgress(52, 2)
    await wait(140)
    setProgress(72, 3)

    this.effects = new Effects(this.scene)
    this.enemies = new EnemyManager(this.scene, world, this.effects, this.audio)
    this.enemies.onKill = (enemy, headshot) => this.onKill(enemy, headshot)
    this.player = new Player(this.camera, this.audio)
    this.player.sensitivity = this.sensitivity
    this.player.reset(world)
    this.player.onDeath = () => this.onPlayerDeath()
    this.player.onStep = (run) => this.audio.footstep(run)
    this.weapon = new Weapon(this.camera, this.scene, this.player, world, this.enemies, this.effects, this.audio, this.viewCamera)
    this.weapon.onHit = ({ headshot }) => {
      this.hits++
      this.hud.hit(headshot)
    }
    this.weapon.onStats = (stats) => {
      this.lastAmmoNotify = stats
      this.hud.setAmmo(stats)
    }
    this.weapon.baseFov = this.baseFov()
    this.camera.fov = this.weapon.baseFov
    this.camera.updateProjectionMatrix()
    this.weapon.notify()

    this.hud.show()
    this.hud.setObjective('صمود أمام الموجات', `${data.name} · ${data.district}`)
    this.hud.setScore(0)
    this.hud.setGrenades(this.grenades)
    this.hud.setAmmo({ ammo: 30, reserve: 150, reloading: false })
    this.hud.setWave(1, MAX_WAVES, WAVES[0])
    document.getElementById('touch-ui').classList.toggle('hidden', !this.touch)

    setProgress(90, 4)
    await wait(140)
    setProgress(100, 4)
    await wait(180)
    loading.classList.add('hidden')
    this.state = 'playing'
    this.audio.resumeAmbience()
    this.startWave(1)
    this.clock.getDelta()
  }

  resolveQuality() {
    if (this.qualityChoice === 'high') return 'high'
    if (this.qualityChoice === 'low') return 'low'
    return this.touch ? 'medium' : 'high'
  }

  applyRenderQuality() {
    const dpr = Math.min(devicePixelRatio || 1, this.quality === 'high' ? 2 : this.quality === 'medium' ? 1.5 : 1)
    this.renderer.setPixelRatio(dpr)
    this.renderer.shadowMap.enabled = this.quality !== 'low'
    this.renderer.shadowMap.needsUpdate = true
    this.resize()
  }

  baseFov() {
    const aspect = innerWidth / innerHeight
    if (this.touch && aspect < 0.9) return 78
    if (aspect < 1) return 74
    return 70
  }

  setupViewModel() {
    const viewScene = new THREE.Scene()
    const viewCamera = new THREE.PerspectiveCamera(this.baseFov(), innerWidth / innerHeight, 0.01, 10)
    viewScene.add(viewCamera)
    viewScene.add(new THREE.HemisphereLight(0xffe9c8, 0x23261e, 1.55))
    const key = new THREE.DirectionalLight(0xffe8c6, 2.6)
    key.position.set(0.55, 0.85, 0.5)
    key.target.position.set(0, -0.08, -1)
    viewCamera.add(key, key.target)
    const rim = new THREE.DirectionalLight(0xa9c2dd, 1.15)
    rim.position.set(-0.7, 0.15, 0.25)
    rim.target.position.set(0, 0, -1)
    viewCamera.add(rim, rim.target)
    this.viewScene = viewScene
    this.viewCamera = viewCamera
  }

  syncViewModel() {
    if (!this.viewCamera) return
    this.viewCamera.position.copy(this.camera.position)
    this.viewCamera.quaternion.copy(this.camera.quaternion)
    this.viewCamera.updateMatrixWorld(true)
  }

  disposeGameplay() {
    if (this.weapon) {
      this.camera.remove(this.weapon.group)
      this.weapon.group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose()
          if (o.material && o.material.dispose) o.material.dispose()
        }
      })
      this.weapon = null
    }
    if (this.effects) {
      this.effects.clear()
      this.effects = null
    }
    if (this.enemies) {
      this.enemies.clear()
      this.enemies = null
    }
    this.projectiles.forEach((p) => this.scene?.remove(p.mesh))
    this.projectiles.length = 0
    if (this.player) {
      this.player = null
    }
    if (this.scene) {
      this.scene.remove(this.camera)
      if (this.world) disposeSceneGeometries(this.world.group)
      this.scene = null
    }
    if (this.viewScene && this.viewCamera) {
      this.viewScene.remove(this.viewCamera)
    }
    this.viewScene = null
    this.viewCamera = null
    this.world = null
  }

  // ─────────────────────────── waves

  startWave(n) {
    this.wave = n
    this.waveState = 'intro'
    this.waveSize = WAVES[n - 1]
    this.spawned = 0
    this.killed = 0
    this.introTimer = 1.6
    this.spawnTimer = 1.2
    this.hud.setWave(n, MAX_WAVES, this.waveSize)
    this.hud.setObjective(n === MAX_WAVES ? 'الموجة الأخيرة · صمود' : `صد الموجة ${n}`, this.world?.data ? `${this.world.data.name} · ${this.world.data.district}` : '')
    const names = ['الموجة الأولى', 'الموجة الثانية', 'الموجة الأخيرة']
    const subs = ['ثبّت موقعك', 'العدو يتقدم', 'صمود حتى النهاية']
    this.hud.announce(names[n - 1], subs[n - 1], n === MAX_WAVES ? 'danger' : '', 2200)
    this.audio.wave()
  }

  updateWaves(dt) {
    if (!this.enemies) return
    if (this.waveState === 'intro') {
      this.introTimer -= dt
      if (this.introTimer <= 0) this.waveState = 'fight'
      return
    }
    if (this.waveState === 'intermission') {
      this.intermissionTimer -= dt
      if (this.intermissionTimer <= 0) {
        this.startWave(this.wave + 1)
      }
      return
    }
    if (this.waveState !== 'fight') return
    const alive = this.enemies.enemies.filter((e) => e.alive && !e.dying).length
    if (this.spawned < this.waveSize && alive < (this.quality === 'low' ? 4 : 6)) {
      this.spawnTimer -= dt
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 1.05 + Math.random() * 0.6
        this.spawnOne()
      }
    }
    if (this.spawned >= this.waveSize && alive === 0) {
      this.completeWave()
    }
  }

  spawnOne() {
    const points = this.world.spawnPoints
    const playerPos = this.player.position
    let candidates = points.filter((p) => Math.hypot(p.x - playerPos.x, p.z - playerPos.z) > 12)
    if (!candidates.length) candidates = points
    const point = candidates[(Math.random() * candidates.length) | 0]
    this.enemies.spawn(point)
    this.spawned++
    this.hud.setWave(this.wave, MAX_WAVES, Math.max(0, this.waveSize - this.killed))
  }

  completeWave() {
    this.waveState = 'clear'
    this.score += 250
    this.hud.setScore(this.score)
    if (this.wave >= MAX_WAVES) {
      this.victory()
      return
    }
    this.waveState = 'intermission'
    this.intermissionTimer = 4.2
    this.hud.announce('تم صد الموجة', 'أعد التلقيم · استعد للهجوم التالي', 'win', 2200)
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 32)
    this.weapon.ammo = 30
    this.weapon.reserve = Math.min(240, this.weapon.reserve + 90)
    this.weapon.notify()
    this.grenades = Math.min(3, this.grenades + 1)
    this.hud.setGrenades(this.grenades)
    this.audio.wave()
  }

  onKill(enemy, headshot) {
    this.kills++
    if (headshot) this.headshots++
    const points = headshot ? 150 : 100
    this.score += points
    this.killed++
    this.hud.setScore(this.score)
    this.hud.addKill(headshot, points)
    this.audio.kill()
    this.hud.setWave(this.wave, MAX_WAVES, Math.max(0, this.waveSize - this.killed))
    if (headshot) this.hud.announce('إصابة قاتلة', '+150', '', 750)
  }

  onPlayerDeath() {
    if (this.state !== 'playing') return
    this.audio.stopAmbience()
    this.input.firing = false
    this.showResult(false)
  }

  victory() {
    this.state = 'result'
    this.audio.stopAmbience()
    this.audio.victory()
    this.input.firing = false
    if (this.touch) document.getElementById('touch-ui').classList.add('hidden')
    this.hud.announce('تمت المهمة', 'صمدت حتى النهاية', 'win', 2400)
    const stars = this.player.health > 62 ? 3 : this.player.health > 28 ? 2 : 1
    setTimeout(() => this.showResult(true, stars), 850)
  }

  showResult(win, stars = 1) {
    this.state = 'result'
    this.input.firing = false
    document.getElementById('touch-ui').classList.add('hidden')
    const result = document.getElementById('result')
    result.classList.remove('hidden')
    result.classList.toggle('defeat', !win)
    document.getElementById('result-kicker').textContent = win ? 'تمت المهمة' : 'فشلت المهمة'
    document.getElementById('result-title').textContent = win ? 'صمدت حتى النهاية' : 'سقطت الجبهة'
    const data = MAP_DATA[this.selectedMap]
    document.getElementById('result-sub').textContent = `${data.name} · ${data.district}`
    document.getElementById('result-emblem').textContent = win ? '✦' : '✕'
    const starEls = document.querySelectorAll('#result-stars i')
    starEls.forEach((el, i) => el.classList.toggle('on', i < stars))
    document.getElementById('stat-kills').textContent = this.kills
    document.getElementById('stat-heads').textContent = this.headshots
    const accuracy = this.weapon && this.weapon.shots > 0 ? Math.round((this.hits / this.weapon.shots) * 100) : 0
    document.getElementById('stat-accuracy').textContent = `${accuracy}%`
    document.getElementById('stat-score').textContent = String(this.score)
    if (this.player && this.player.health <= 0) {
      document.getElementById('result-kicker').textContent = 'فشلت المهمة'
    }
  }

  // ─────────────────────────── input

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return
      this.keys.add(e.code)
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'playing') this.pauseGame()
        else if (this.state === 'paused') this.resumeGame()
      }
      if (this.state !== 'playing') return
      if (e.code === 'KeyR') this.input.reloadPressed = true
      if (e.code === 'KeyG') this.input.grenadePressed = true
      if (e.code === 'Space') {
        this.input.jump = true
        e.preventDefault()
      }
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return
      if (this.state !== 'playing') return
      if (e.button === 0) this.input.firing = true
      if (e.button === 2) this.mouseAim = true
      if (e.button === 0 && document.pointerLockElement !== this.canvas && !this.touch) {
        this.canvas.requestPointerLock?.()
      }
      this.mouseLook = true
    })
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return
      if (e.button === 0) this.input.firing = false
      if (e.button === 2) this.mouseAim = false
      this.mouseLook = false
    })
    window.addEventListener('pointermove', (e) => {
      if (this.state !== 'playing' || this.touch) return
      if (document.pointerLockElement === this.canvas) {
        this.input.lookDX += e.movementX
        this.input.lookDY += e.movementY
        this.player?.look(e.movementX, e.movementY, this.sensitivity)
      } else if (this.mouseLook) {
        this.input.lookDX += e.movementX
        this.input.lookDY += e.movementY
        this.player?.look(e.movementX, e.movementY, this.sensitivity)
      }
    })
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    this.canvas.addEventListener('click', (e) => {
      if (e.pointerType === 'touch') return
      if (this.state !== 'playing') return
      if (!this.touch && document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock?.()
    })

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pauseGame()
    })

    window.addEventListener('resize', () => this.resize())

    const soundBtn = document.getElementById('sound-btn')
    soundBtn.addEventListener('click', async () => {
      await this.audio.ensure()
      this.soundMuted = !this.soundMuted
      this.audio.setMuted(this.soundMuted)
      soundBtn.classList.toggle('muted', this.soundMuted)
      this.audio.click()
    })
    document.getElementById('fullscreen-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
      else document.exitFullscreen?.()
    })

    this.setupTouchControls()
  }

  setupTouchControls() {
    const stickZone = document.getElementById('stick-zone')
    const knob = document.getElementById('stick-knob')
    const base = document.getElementById('stick-base')
    const resetStick = () => {
      this.stickPointer = null
      this.stickX = 0
      this.stickZ = 0
      this.input.moveX = 0
      this.input.moveZ = 0
      knob.style.transform = 'translate(0px, 0px)'
    }

    stickZone.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      e.preventDefault()
      this.stickPointer = e.pointerId
      stickZone.setPointerCapture(e.pointerId)
    })
    stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickPointer) return
      const rect = base.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = e.clientX - cx
      let dy = e.clientY - cy
      const max = rect.width * 0.38
      const len = Math.hypot(dx, dy)
      if (len > max) {
        dx = (dx / len) * max
        dy = (dy / len) * max
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`
      this.stickX = dx / max
      this.stickZ = dy / max
    })
    const endStick = (e) => {
      if (e.pointerId === this.stickPointer) resetStick()
    }
    stickZone.addEventListener('pointerup', endStick)
    stickZone.addEventListener('pointercancel', endStick)

    const lookZone = document.getElementById('look-zone')
    lookZone.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      if (this.lookPointer !== null) return
      e.preventDefault()
      this.lookPointer = e.pointerId
      lookZone.setPointerCapture(e.pointerId)
      this.lastLook = { x: e.clientX, y: e.clientY }
    })
    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookPointer) return
      const dx = e.clientX - this.lastLook.x
      const dy = e.clientY - this.lastLook.y
      this.lastLook = { x: e.clientX, y: e.clientY }
      this.input.lookDX += dx * 1.35
      this.input.lookDY += dy * 1.35
      this.player?.look(dx * 1.35, dy * 1.35, this.sensitivity)
    })
    const endLook = (e) => {
      if (e.pointerId === this.lookPointer) this.lookPointer = null
    }
    lookZone.addEventListener('pointerup', endLook)
    lookZone.addEventListener('pointercancel', endLook)

    const bindHold = (el, down, up) => {
      el.addEventListener('pointerdown', (e) => {
        if (this.state !== 'playing') return
        e.preventDefault()
        e.stopPropagation()
        el.setPointerCapture(e.pointerId)
        el.classList.add('down')
        down()
      })
      const release = (e) => {
        e.preventDefault()
        el.classList.remove('down')
        up()
      }
      el.addEventListener('pointerup', release)
      el.addEventListener('pointercancel', release)
      el.addEventListener('pointerleave', (e) => {
        if (e.buttons) return
      })
    }

    bindHold(document.getElementById('btn-fire'), () => { this.input.firing = true }, () => { this.input.firing = false })

    const aimBtn = document.getElementById('btn-aim')
    aimBtn.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      e.preventDefault()
      e.stopPropagation()
      this.touchAim = !this.touchAim
      aimBtn.classList.toggle('active', this.touchAim)
    })
    document.getElementById('btn-reload').addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      e.preventDefault()
      e.stopPropagation()
      this.weapon?.startReload()
    })
    document.getElementById('btn-jump').addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      e.preventDefault()
      e.stopPropagation()
      this.input.jump = true
    })
    document.getElementById('btn-grenade').addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      e.preventDefault()
      e.stopPropagation()
      this.throwGrenade()
    })
    document.getElementById('pause-btn').addEventListener('click', () => this.pauseGame())
  }

  // ─────────────────────────── screens

  setupScreens() {
    document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame())
    document.getElementById('restart-btn').addEventListener('click', () => {
      document.getElementById('pause').classList.add('hidden')
      this.restartMission()
    })
    document.getElementById('quit-btn').addEventListener('click', () => {
      document.getElementById('pause').classList.add('hidden')
      this.quitToMenu()
    })
    document.getElementById('retry-btn').addEventListener('click', () => {
      document.getElementById('result').classList.add('hidden')
      this.restartMission()
    })
    document.getElementById('menu-btn').addEventListener('click', () => {
      document.getElementById('result').classList.add('hidden')
      this.quitToMenu()
    })
    const slider = document.getElementById('sens-range')
    slider.addEventListener('input', () => {
      this.sensitivity = Number(slider.value)
      document.getElementById('sens-value').textContent = `${this.sensitivity.toFixed(1)}×`
      if (this.player) this.player.sensitivity = this.sensitivity
    })
    document.querySelectorAll('#quality-seg button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.qualityChoice = btn.dataset.q
        document.querySelectorAll('#quality-seg button').forEach((b) => b.classList.toggle('active', b === btn))
        document.getElementById('quality-value').textContent = btn.dataset.q === 'auto' ? 'تلقائي' : btn.dataset.q === 'high' ? 'عالي' : 'سريع'
        this.audio.click()
      })
    })
  }

  pauseGame() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.input.firing = false
    this.mouseAim = false
    this.touchAim = false
    document.getElementById('btn-aim')?.classList.remove('active')
    document.exitPointerLock?.()
    const data = MAP_DATA[this.selectedMap]
    document.getElementById('pause-map').textContent = `${data.name} · ${data.district}`
    document.getElementById('pause').classList.remove('hidden')
    this.audio.setMuted(this.soundMuted)
    this.audio.stopAmbience()
  }

  resumeGame() {
    if (this.state !== 'paused') return
    document.getElementById('pause').classList.add('hidden')
    this.state = 'playing'
    this.clock.getDelta()
    this.audio.resumeAmbience()
  }

  restartMission() {
    document.getElementById('pause').classList.add('hidden')
    document.getElementById('result').classList.add('hidden')
    this.disposeGameplay()
    this.hud.hide()
    this.audio.stopAmbience()
    this.resetStats()
    this.startMission(this.selectedMap)
  }

  quitToMenu() {
    document.getElementById('pause').classList.add('hidden')
    document.getElementById('result').classList.add('hidden')
    this.disposeGameplay()
    this.hud.hide()
    if (this.touch) document.getElementById('touch-ui').classList.add('hidden')
    this.audio.stopAmbience()
    this.resetStats()
    if (!this.menuScene) this.createMenuWorld()
    this.state = 'menu'
    this.renderer.toneMappingExposure = 1.02
    document.getElementById('result').classList.add('hidden')
    document.getElementById('menu').classList.remove('hidden')
    this.clock.getDelta()
  }

  resetStats() {
    this.score = 0
    this.kills = 0
    this.headshots = 0
    this.hits = 0
    this.grenades = 2
    this.wave = 1
    this.waveState = 'idle'
    this.waveSize = 0
    this.spawned = 0
    this.killed = 0
    this.input.firing = false
    this.touchAim = false
    this.mouseAim = false
  }

  // ─────────────────────────── grenades

  throwGrenade() {
    if (!this.weapon || this.grenadeCooldown > 0 || this.grenades <= 0) return
    this.grenades--
    this.grenadeCooldown = 0.8
    this.hud.setGrenades(this.grenades)
    this.camera.updateMatrixWorld()
    const pos = new THREE.Vector3()
    this.camera.getWorldPosition(pos)
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3c4a36, roughness: 0.6, metalness: 0.4 })
    )
    mesh.position.copy(pos).addScaledVector(dir, 0.7)
    this.scene.add(mesh)
    const vel = dir.clone().multiplyScalar(15).add(new THREE.Vector3(0, 3.5, 0))
    this.projectiles.push({ mesh, vel, time: 0, pos: mesh.position.clone() })
    this.audio.click()
    document.getElementById('btn-grenade')?.classList.add('down')
    setTimeout(() => document.getElementById('btn-grenade')?.classList.remove('down'), 120)
  }

  updateGrenades(dt) {
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - dt)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.time += dt
      p.vel.y -= 20 * dt
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.rotation.x += dt * 8
      const groundY = 0.12
      if (p.mesh.position.y <= groundY || p.time > 2.4) {
        this.explodeGrenade(p.mesh.position)
        this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
        this.projectiles.splice(i, 1)
      }
    }
  }

  explodeGrenade(position) {
    this.effects.explosion(position)
    this.audio.explosion()
    const dist = this.player.position.distanceTo(position)
    if (dist < 16) this.player.addShake(Math.max(0.03, 0.2 * (1 - dist / 16)))
    if (dist < 5.5) this.player.takeDamage(24 * (1 - dist / 5.5), position)
    if (!this.enemies) return
    for (const enemy of [...this.enemies.enemies]) {
      if (!enemy.alive) continue
      const d = enemy.position.distanceTo(new THREE.Vector3(position.x, 0, position.z))
      if (d < 7.5) {
        const amount = 150 * (1 - d / 9)
        this.enemies.damage(enemy, amount, false, position)
      }
    }
  }

  // ─────────────────────────── loop

  resize() {
    const w = innerWidth
    const h = innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.fov = this.baseFov()
    this.camera.updateProjectionMatrix()
    if (this.weapon) this.weapon.baseFov = this.baseFov()
    if (this.menuCamera) {
      this.menuCamera.aspect = w / h
      this.menuCamera.updateProjectionMatrix()
    }
    if (this.viewCamera) {
      this.viewCamera.aspect = w / h
      this.viewCamera.fov = this.baseFov()
      this.viewCamera.updateProjectionMatrix()
    }
  }

  updateMenu(t) {
    if (!this.menuWorld) return
    this.menuWorld.update(t, 1 / 60)
    if (this.menuCamera) {
      const a = Math.sin(t * 0.07) * 1.4
      const b = Math.cos(t * 0.055) * 0.9
      this.menuCamera.position.set(3.5 + a, 12.5 + Math.sin(t * 0.18) * 0.18, 33 + b)
      this.menuCamera.lookAt(-1 + Math.sin(t * 0.05) * 0.7, 5.2, -40)
    }
    if (this.menuExtras) {
      const { soldierA, soldierB } = this.menuExtras
      soldierA.position.y = Math.sin(t * 1.3) * 0.012
      soldierB.position.y = Math.sin(t * 1.1 + 1) * 0.012
      soldierB.rotation.y = -0.1 + Math.sin(t * 0.4) * 0.06
    }
  }

  updateGameplay(dt, t) {
    if (!this.player || !this.weapon) return
    const input = this.input
    input.moveX = this.stickPointer !== null ? this.stickX : 0
    input.moveZ = this.stickPointer !== null ? this.stickZ : 0
    if (!this.touch) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) input.moveZ -= 1
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) input.moveZ += 1
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) input.moveX -= 1
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) input.moveX += 1
      input.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
    }
    if (this.touch) {
      input.moveX = Math.max(-1, Math.min(1, input.moveX))
      input.moveZ = Math.max(-1, Math.min(1, input.moveZ))
    } else {
      input.aiming = this.mouseAim
    }
    if (this.touch) input.aiming = this.touchAim

    if (input.reloadPressed) {
      this.weapon.startReload()
      input.reloadPressed = false
    }
    if (input.grenadePressed) {
      this.throwGrenade()
      input.grenadePressed = false
    }

    this.player.update(dt, input, this.weapon)
    this.weapon.update(dt, input)
    this.enemies.update(dt, this.player)
    this.effects.update(dt)
    this.updateGrenades(dt)
    this.updateWaves(dt)
    this.hud.update(this.player)
    this.hud.setAmmo({ ammo: this.weapon.ammo, reserve: this.weapon.reserve, reloading: this.weapon.reloading })
    this.input.lookDX = 0
    this.input.lookDY = 0
  }

  animate() {
    requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime
    if (this.state === 'menu' && this.menuScene) {
      this.updateMenu(t)
      this.renderer.render(this.menuScene, this.menuCamera)
      return
    }
    if (this.scene && this.camera) {
      if (this.state === 'playing') this.updateGameplay(dt, t)
      this.renderer.render(this.scene, this.camera)
      if (this.viewScene && this.viewCamera && (this.state === 'playing' || this.state === 'paused')) {
        this.syncViewModel()
        this.renderer.autoClear = false
        this.renderer.clearDepth()
        this.renderer.render(this.viewScene, this.viewCamera)
        this.renderer.autoClear = true
      }
    }
  }
}

function disposeSceneGeometries(root) {
  if (!root) return
  root.traverse((o) => {
    if (o.isMesh && o.geometry) o.geometry.dispose()
    if (o.isLine && o.geometry) o.geometry.dispose()
    if (o.isPoints && o.geometry) o.geometry.dispose()
  })
}
