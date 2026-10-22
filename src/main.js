import * as THREE from 'three';
import { World, LANDMARKS } from './world.js';
import { CityLife, createHuman, setHumanWeapon, animateHuman } from './entities.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import { MissionSystem } from './missions.js';
import {
  clamp, damp, lerp, lerpAngle, rand, dist2, pick, timeString, formatMoney,
} from './utils.js';

const SAVE_KEY = 'san_arroyo_save_v1';

const MOD_DEFS = [
  { key: 'superJump', name: 'قفزة خارقة', desc: 'قفزة أعلى بثلاث مرات. افتراضي — مجاني.', req: 0 },
  { key: 'lowGravity', name: 'جاذبية القمر', desc: 'الجاذبية تصير خفيفة، والقفز يطول.', req: 0 },
  { key: 'speedBoost', name: 'سرعة الشارع', desc: 'عدو أسرع ونيترو أقوى في السيارات.', req: 0 },
  { key: 'neon', name: 'نيون تحت السيارة', desc: 'إضاءة أرضية لكل مركبة في المدينة.', req: 0 },
  { key: 'drift', name: 'دريفت', desc: 'تماسك أقل، وانزلاق جانبي أكثر مع Space.', req: 1 },
  { key: 'infiniteAmmo', name: 'ذخيرة لا تنتهي', desc: 'المخزن والاحتياطي بلا حدود.', req: 1 },
  { key: 'godMode', name: 'وضع الخالد', desc: 'لا ضرر من الرصاص، السيارات، أو السقوط.', req: 2 },
  { key: 'riot', name: 'شغب شامل', desc: 'المدينة تغلي — السكان يهربون ويشتبكون.', req: 2 },
  { key: 'jetpack', name: 'جيت باك', desc: 'اضغط Space في الهواء للطيران عمودياً.', req: 3 },
  { key: 'noWanted', name: 'اختفاء المطلوب', desc: 'الشرطة تنساك تماماً. مود خطير.', req: 3 },
  { key: 'chaos', name: 'فوضى', desc: 'كل 15 ثانية يحدث شيء مجنون قربك.', req: 4 },
];

const WEAPONS = [
  {
    id: 'fists', name: 'أيدي', icon: '✊', melee: true, damage: 26, rate: 0.42,
    range: 2.6, magSize: 0, mag: 0, reserve: 0, reload: 0,
  },
  {
    id: 'pistol', name: 'مسدس', icon: '⌐', damage: 34, rate: 0.24, range: 120,
    magSize: 12, mag: 12, reserve: 60, reload: 1.05, spread: 0.01, auto: false,
  },
  {
    id: 'smg', name: 'رشاش', icon: '⌁', damage: 16, rate: 0.075, range: 100,
    magSize: 30, mag: 30, reserve: 120, reload: 1.35, spread: 0.024, auto: true,
  },
];

const TELEPORTS = {
  safehouse: { x: -210, z: 160, name: 'حي الشمس' },
  downtown: { x: 140, z: 96, name: 'وسط المدينة' },
  park: { x: 140, z: 158, name: 'حديقة الشمس' },
  spray: { x: 70, z: -104, name: 'مغسلة السيارات' },
  beach: { x: 0, z: 280, name: 'شارع المحيط' },
  airport: { x: 300, z: -160, name: 'مطار سان أرويو' },
};

class Game {
  constructor() {
    this.boot();
  }

  boot() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1300);

    this.ui = new UI();
    this.audio = new AudioEngine();
    this.ui.setBoot(0.06);

    this.scene.add(new THREE.AmbientLight(0x6b7280, 0.36));
    this.world = new World(this.scene);
    this.headlight = new THREE.SpotLight(0xfff1cc, 0, 58, 0.56, 0.55, 1.2);
    this.headlight.visible = false;
    this.headlight.target = new THREE.Object3D();
    this.scene.add(this.headlight, this.headlight.target);
    this.ui.setBoot(0.42);

    this.player = {
      position: new THREE.Vector3(0, 0, 0),
      vel: new THREE.Vector3(),
      vy: 0,
      health: 100,
      armor: 0,
      onGround: true,
      mesh: null,
    };
    this.createPlayerModel();
    this.ui.setBoot(0.64);

    this.city = new CityLife(this);
    this.city.spawnInitial();
    this.city.spawnCarAt(-199, 156, 'sedan', 0x2f6b8a, Math.PI / 2);
    this.ui.setBoot(0.84);

    this.missions = new MissionSystem(this);
    this.createMissionMarker();

    this.money = 500;
    this.chips = 0;
    this.wanted = 0;
    this.heatTimer = 0;
    this.hour = 17.15;
    this.autoTime = true;
    this.weather = 'clear';
    this.envAccum = 0;
    this.hudAccum = 0;
    this.started = false;
    this.paused = false;
    this.modsOpen = false;
    this.helpOpen = false;
    this.storyOpen = false;
    this.gameOver = false;
    this.respawnTimer = 0;
    this.touch = false;
    this.touchMove = { x: 0, y: 0 };
    this.touchSprint = false;
    this.fireHeld = false;
    this.aiming = false;
    this.camYaw = this.world.getSpawn().yaw;
    this.camPitch = -0.13;
    this.camDist = 6.2;
    this.lookTimer = 0;
    this.shakeMag = 0;
    this.reloadTimer = 0;
    this.nextFire = 0;
    this.weaponIndex = 1;
    this.weapons = WEAPONS.map((w) => ({ ...w }));
    this.playerHeading = this.world.getSpawn().yaw;
    this.playerCar = null;
    this.lastDistrict = '';
    this.kills = 0;
    this.tracers = [];
    this.chaosTimer = 13;
    this.modDirty = false;
    this.lastInteract = '';
    this.keys = {};
    this.mods = {
      superJump: false, lowGravity: false, speedBoost: false, neon: false,
      drift: false, infiniteAmmo: false, godMode: false, riot: false,
      jetpack: false, noWanted: false, chaos: false,
    };
    this.modDefs = MOD_DEFS;

    const spawn = this.world.getSpawn();
    this.resetPlayer(spawn);
    this.district = this.ui.getDistrict(spawn.x, spawn.z);
    this.lastDistrict = this.district.name;
    this.setMissionMarker(this.missions.getStartMarker());
    this.world.updateEnvironment(this.hour, this.weather);
    this.ui.setBoot(1);

    this.savedGame = this.readSave();
    this.bindEvents();
    this.setupTouch();

    this.lastFrameAt = performance.now();
    this.introStart = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
    this.autosave = setInterval(() => { if (this.started && !this.gameOver) this.save(true); }, 10000);

    setTimeout(() => {
      this.ui.finishBoot();
      this.ui.showStart(Boolean(this.savedGame));
    }, 450);

    this.setupDebug();
  }

  createPlayerModel() {
    const human = createHuman({
      player: true,
      shirt: 0x1f7a6b,
      pants: 0x1c2740,
      skin: 0x9a6a47,
      hair: 0x17120f,
      cap: 0xd0632f,
    });
    this.player.mesh = human.group;
    this.player.human = human;
    this.player.mesh.visible = false;
    this.scene.add(this.player.mesh);
    setHumanWeapon(human, true);
  }

  createMissionMarker() {
    const group = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffb703, transparent: true, opacity: 0.26, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.56, 8, 16, 1, true), beamMat);
    beam.position.y = 4.2;
    group.add(beam);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.08, 6, 36), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    group.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.05, 6, 30), ringMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.15;
    group.add(ring2);
    const gemMat = new THREE.MeshBasicMaterial({ color: 0xffd166, toneMapped: false });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), gemMat);
    gem.position.y = 3.6;
    group.add(gem);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(3, 28), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }));
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = 0.16;
    group.add(disk);
    group.visible = false;
    this.scene.add(group);
    this.marker = { group, beamMat, ringMat, gemMat, gem, ring, ring2, disk };
  }

  resetPlayer(spawn) {
    const x = spawn.x;
    const z = spawn.z;
    const y = this.world.groundHeightAt(x, z);
    this.player.position.set(x, y, z);
    this.player.vel.set(0, 0, 0);
    this.player.vy = 0;
    this.player.health = 100;
    this.player.armor = 0;
    this.player.onGround = true;
    this.player.mesh.position.copy(this.player.position);
    this.player.mesh.rotation.y = spawn.yaw;
    this.player.mesh.visible = true;
    this.playerHeading = spawn.yaw;
    this.camYaw = spawn.yaw;
    this.camPitch = -0.13;
  }

  readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return null;
      return data;
    } catch {
      return null;
    }
  }

  save(silent = false) {
    if (!this.started || this.gameOver) return;
    try {
      const data = {
        v: 1,
        ts: Date.now(),
        x: this.player.position.x,
        z: this.player.position.z,
        money: this.money,
        health: this.player.health,
        armor: this.player.armor,
        chips: this.chips,
        completed: this.missions.completed,
        storyComplete: this.missions.storyComplete,
        mods: { ...this.mods },
        hour: this.hour,
        autoTime: this.autoTime,
        weather: this.weather,
        weaponIndex: this.weaponIndex,
        weapons: this.weapons.map((w) => ({ id: w.id, mag: w.mag, reserve: w.reserve })),
        kills: this.kills,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.savedGame = data;
      if (!silent) this.ui.toast('تم حفظ اللعبة', 'mission', 1600);
    } catch {}
  }

  applySave(data) {
    const x = clamp(data.x ?? LANDMARKS.safehouse.x, -300, 300);
    const z = clamp(data.z ?? LANDMARKS.safehouse.z, -300, 320);
    const y = this.world.groundHeightAt(x, z);
    this.player.position.set(x, y, z);
    this.player.mesh.position.copy(this.player.position);
    this.money = Math.max(0, data.money ?? 500);
    this.player.health = clamp(data.health ?? 100, 20, 100);
    this.player.armor = clamp(data.armor ?? 0, 0, 100);
    this.chips = data.chips ?? data.completed ?? 0;
    this.missions.completed = clamp(data.completed ?? 0, 0, 5);
    this.missions.chips = this.chips;
    this.missions.storyComplete = Boolean(data.storyComplete) || this.missions.completed >= 5;
    if (this.missions.storyComplete) this.chips = Math.max(this.chips, 5);
    this.mods = { ...this.mods, ...(data.mods || {}) };
    this.hour = data.hour ?? 17.15;
    this.autoTime = data.autoTime ?? true;
    this.weather = data.weather || 'clear';
    this.weaponIndex = clamp(data.weaponIndex ?? 1, 0, 2);
    this.kills = data.kills || 0;
    if (data.weapons) {
      for (const saved of data.weapons) {
        const w = this.weapons.find((x) => x.id === saved.id);
        if (w) {
          w.mag = saved.mag;
          w.reserve = saved.reserve;
        }
      }
    }
    this.wanted = 0;
    this.city.clearPolice();
    this.world.updateEnvironment(this.hour, this.weather);
    this.camYaw = this.world.getSpawn().yaw;
    this.playerHeading = this.camYaw;
    this.player.mesh.rotation.y = this.camYaw;
    this.setMissionMarker(this.missions.getStartMarker());
    this.applyModState();
    this.audio.setRadio(this.audio.radioOn);
    if (this.weather === 'rain') this.audio.startRain();
    else this.audio.stopRain();
    this.ui.buildMods(this);
  }

  startGame(load = false) {
    if (this.started) return;
    this.audio.init();
    this.audio.resume();
    this.started = true;
    this.ui.hideStart();
    this.ui.showHUD(true);
    if (this.isTouchDevice()) this.ui.el.mobile.classList.remove('hidden');
    if (load && this.savedGame) {
      this.applySave(this.savedGame);
      this.ui.toast('تم تحميل آخر حفظ', 'mission');
    } else {
      this.money = 500;
      this.chips = 0;
      this.weapons = WEAPONS.map((w) => ({ ...w }));
      this.weaponIndex = 1;
      this.missions.reset();
      this.setMissionMarker(this.missions.getStartMarker());
      this.ui.dialogue('زين', 'يا آدم، البيت لسه واقف، والحي لسه بيتنفس. العلامة قدامك — اضغط E وخلينا نبدأ.', 6500);
      this.ui.toast('اتجه للعلامة الذهبية واضغط E', 'mission', 4500);
    }
    setHumanWeapon(this.player.human, this.weaponIndex > 0);
    const d = this.ui.getDistrict(this.player.position.x, this.player.position.z);
    this.district = d;
    this.lastDistrict = d.name;
    this.ui.showLocation(d.name, d.en);
    this.requestLock();
    this.save(true);
  }

  requestLock() {
    if (this.isTouchDevice()) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch {}
  }

  isTouchDevice() {
    return matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }

  bindEvents() {
    this.ui.playBtn.addEventListener('click', () => this.startGame(false));
    this.ui.continueBtn.addEventListener('click', () => this.startGame(true));

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      this.pointerLocked = locked;
      if (locked) {
        this.lockLostAt = 0;
        return;
      }
      if (this.started && !this.paused && !this.modsOpen && !this.helpOpen && !this.gameOver && !this.storyOpen) {
        this.openPause();
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.started || this.paused || this.gameOver) return;
      if (e.button === 2) {
        this.aiming = true;
        return;
      }
      if (e.button !== 0) return;
      if (!this.isTouchDevice() && document.pointerLockElement !== this.canvas) {
        this.requestLock();
        return;
      }
      this.fireHeld = true;
      this.tryFire();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fireHeld = false;
      if (e.button === 2) this.aiming = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.canvas || this.paused) return;
      this.camYaw -= e.movementX * 0.0022;
      this.camPitch = clamp(this.camPitch - e.movementY * 0.002, -0.72, 0.55);
      this.lookTimer = 0;
    });

    window.addEventListener('wheel', (e) => {
      if (!this.started || this.paused) return;
      this.camDist = clamp(this.camDist + e.deltaY * 0.004, 3.2, 11);
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (!this.started) {
        if (e.code === 'Enter') this.startGame(false);
        return;
      }
      if (['Space', 'Tab', 'KeyE', 'KeyF', 'KeyR', 'KeyV', 'KeyH', 'F3', 'Escape'].includes(e.code)) e.preventDefault();
      this.keys[e.code] = true;
      if (e.repeat) return;
      if (e.code === 'Escape') {
        if (this.modsOpen) { this.closeMods(); return; }
        if (this.helpOpen) { this.ui.toggleHelp(false); this.helpOpen = false; return; }
        if (this.storyOpen) return;
        if (this.paused) this.closePause();
        else this.openPause();
        return;
      }
      if (e.code === 'F3') { this.toggleMods(); return; }
      if (this.paused || this.modsOpen) return;
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyF') this.toggleVehicle();
      if (e.code === 'KeyR') this.reload();
      if (e.code === 'KeyV') this.cycleRadio();
      if (e.code === 'KeyH') { if (this.playerCar) this.audio.horn(); }
      if (e.code === 'F9') this.save();
      if (e.code === 'Digit1') this.selectWeapon(0);
      if (e.code === 'Digit2') this.selectWeapon(1);
      if (e.code === 'Digit3') this.selectWeapon(2);
      if (e.code === 'Space' && !this.playerCar) this.jump();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.jumpHeld = false;
    });
    window.addEventListener('blur', () => {
      this.keys = {};
      this.fireHeld = false;
      this.touchMove = { x: 0, y: 0 };
    });

    this.ui.closeMods.addEventListener('click', () => this.closeMods());
    this.ui.resumeBtn.addEventListener('click', () => this.closePause());
    this.ui.pauseModsBtn.addEventListener('click', () => {
      this.pauseReturn = true;
      this.ui.togglePause(false);
      this.openMods();
    });
    this.ui.saveBtn.addEventListener('click', () => this.save());
    this.ui.helpBtn.addEventListener('click', () => {
      this.helpOpen = true;
      this.ui.toggleHelp(true);
    });
    this.ui.closeHelp.addEventListener('click', () => {
      this.helpOpen = false;
      this.ui.toggleHelp(false);
    });
    this.ui.restartBtn.addEventListener('click', () => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    });
    this.ui.storyContinue.addEventListener('click', () => {
      this.storyOpen = false;
      this.ui.hideStory();
      this.paused = false;
      this.requestLock();
    });

    this.ui.modsBody.addEventListener('click', (e) => {
      const mod = e.target.closest('[data-mod]');
      if (mod) { this.toggleMod(mod.dataset.mod, mod.disabled); return; }
      const weather = e.target.closest('[data-weather]');
      if (weather) { this.setWeather(weather.dataset.weather); this.ui.buildMods(this); return; }
      const spawn = e.target.closest('[data-spawn]');
      if (spawn) { this.spawnVehicle(spawn.dataset.spawn); return; }
      const tp = e.target.closest('[data-tp]');
      if (tp) { this.teleport(tp.dataset.tp); this.closeMods(); return; }
      const auto = e.target.closest('[data-autotime]');
      if (auto) { this.autoTime = !this.autoTime; this.ui.buildMods(this); return; }
      const cheat = e.target.closest('[data-cheat]');
      if (cheat) {
        const input = document.getElementById('cheatInput');
        if (input && input.value.trim().toUpperCase() === 'SUNSET') {
          this.chips = Math.max(this.chips, 9);
          this.ui.toast('شيفرة مقبولة: كل المودات مفتوحة', 'mission', 4000);
          this.audio.chime(true);
          this.ui.buildMods(this);
        } else {
          this.ui.toast('شيفرة خاطئة. جرّب SUNSET', 'police');
        }
      }
    });

    this.ui.modsBody.addEventListener('input', (e) => {
      if (e.target.matches('[data-time]')) {
        this.hour = parseFloat(e.target.value);
        this.autoTime = false;
        const val = document.getElementById('modTimeVal');
        if (val) val.textContent = timeString(this.hour);
        this.world.updateEnvironment(this.hour, this.weather);
      }
      if (e.target.matches('[data-traffic]')) {
        this.city.targetTraffic = parseInt(e.target.value, 10);
        const val = document.getElementById('modTrafficVal');
        if (val) val.textContent = this.city.targetTraffic;
      }
    });
  }

  setupTouch() {
    this.touch = this.isTouchDevice();
    const stick = this.ui.el.joystick;
    const knob = this.ui.el.joystickKnob;
    let active = null;
    let center = { x: 0, y: 0 };
    const move = (e) => {
      if (!active) return;
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      const max = 38;
      const len = Math.hypot(dx, dy);
      const nx = len > max ? (dx / len) * max : dx;
      const ny = len > max ? (dy / len) * max : dy;
      knob.style.transform = `translate(${nx}px, ${ny}px)`;
      this.touchMove.x = nx / max;
      this.touchMove.y = -ny / max;
    };
    stick.addEventListener('pointerdown', (e) => {
      active = e.pointerId;
      const r = stick.getBoundingClientRect();
      center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      stick.setPointerCapture(active);
      move(e);
      e.preventDefault();
    });
    stick.addEventListener('pointermove', move);
    const end = () => {
      active = null;
      knob.style.transform = '';
      this.touchMove = { x: 0, y: 0 };
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    document.querySelectorAll('[data-touch]').forEach((btn) => {
      const action = btn.dataset.touch;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (action === 'fire') {
          this.fireHeld = true;
          this.tryFire();
        } else if (action === 'jump') {
          if (this.playerCar) this.keys.Space = true;
          else this.jump();
        } else if (action === 'enter') {
          this.interactOrVehicle();
        } else if (action === 'sprint') {
          this.touchSprint = true;
        }
        btn.setPointerCapture?.(e.pointerId);
      });
      btn.addEventListener('pointerup', () => {
        if (action === 'fire') this.fireHeld = false;
        if (action === 'jump') this.keys.Space = false;
        if (action === 'sprint') this.touchSprint = false;
      });
      btn.addEventListener('pointercancel', () => {
        this.fireHeld = false;
        this.touchSprint = false;
        this.keys.Space = false;
      });
    });

    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.touch || !this.started || this.paused || e.pointerType !== 'touch') return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      this.camYaw -= (e.clientX - drag.x) * 0.006;
      this.camPitch = clamp(this.camPitch - (e.clientY - drag.y) * 0.005, -0.7, 0.5);
      drag.x = e.clientX;
      drag.y = e.clientY;
      this.lookTimer = 0;
    });
    this.canvas.addEventListener('pointerup', () => { drag = null; });
    this.canvas.addEventListener('pointercancel', () => { drag = null; });
  }

  interactOrVehicle() {
    if (this.lastInteract === 'mission') this.interact();
    else this.toggleVehicle();
  }

  interact() {
    if (this.paused || this.gameOver) return;
    if (this.missions.canStart(this.player.position)) {
      this.missions.startCurrent();
      this.audio.ui();
    }
  }

  selectWeapon(index) {
    if (index < 0 || index >= this.weapons.length) return;
    if (this.weaponIndex === index) return;
    this.weaponIndex = index;
    this.reloadTimer = 0;
    this.audio.ui();
    setHumanWeapon(this.player.human, index > 0);
  }

  toggleVehicle() {
    if (this.paused || this.gameOver) return;
    if (this.playerCar) this.exitVehicle();
    else this.enterNearestVehicle();
  }

  enterNearestVehicle() {
    const car = this.city.getNearestCar(this.player.position, 5.2);
    if (!car) {
      this.ui.toast('لا توجد سيارة قريبة', '', 1800);
      return;
    }
    const wasAi = car.ai;
    car.ai = false;
    car.occupied = true;
    car.vel.set(0, 0);
    this.playerCar = car;
    this.player.position.copy(car.pos);
    this.player.mesh.visible = false;
    this.camYaw = car.heading;
    this.lookTimer = 0;
    this.audio.startEngine();
    if (this.audio.radioOn) this.audio.startMusic();
    if (this.city.policeCars.includes(car)) {
      this.city.policeCars = this.city.policeCars.filter((c) => c !== car);
      car.police = false;
    }
    if (this.city.traffic.includes(car) && wasAi) {
      this.addWanted(1, 'سرقة سيارة');
    }
    this.ui.toast(`${car.police ? 'سيارة شرطة' : 'سيارة'} — F للنزول`, '', 2200);
  }

  exitVehicle() {
    const car = this.playerCar;
    if (!car) return;
    if (Math.abs(car.speed) > 13) {
      this.ui.toast('خفف السرعة قبل النزول!', 'police', 1800);
      return;
    }
    const right = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    const pos = car.pos.clone().addScaledVector(right, 2.3);
    pos.y = this.world.groundHeightAt(pos.x, pos.z);
    this.world.resolveCircle(pos, 0.5);
    if (dist2(pos.x, pos.z, car.pos.x, car.pos.z) < 1.2) pos.addScaledVector(right, -4.6);
    this.player.position.copy(pos);
    this.player.mesh.position.copy(pos);
    this.player.mesh.visible = true;
    this.playerHeading = car.heading;
    car.occupied = false;
    car.ai = false;
    car.vel.set(0, 0);
    car.speed = 0;
    this.playerCar = null;
    this.audio.stopEngine();
    this.audio.stopMusic();
    this.camYaw = car.heading;
    this.lookTimer = 0;
  }

  onPlayerCarDestroyed() {
    if (!this.playerCar) return;
    const car = this.playerCar;
    this.playerCar = null;
    this.player.mesh.visible = true;
    this.player.position.set(car.pos.x + 2.2, this.world.groundHeightAt(car.pos.x, car.pos.z), car.pos.z);
    this.player.mesh.position.copy(this.player.position);
    this.audio.stopEngine();
    this.audio.stopMusic();
    this.damagePlayer(38, 'explosion');
    this.notify('انفجرت السيارة!', 'police', 3200);
  }

  jump() {
    if (this.playerCar || !this.player.onGround) return;
    this.player.vy = this.mods.superJump ? 12.5 : 6.4;
    this.player.onGround = false;
    this.jumpHeld = true;
  }

  updatePlayer(dt) {
    const p = this.player;
    const touch = this.touchMove;
    const forward = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0) + touch.y;
    const strafe = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0) + touch.x;
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const desired = new THREE.Vector3().addScaledVector(fwd, forward).addScaledVector(right, strafe);
    if (desired.lengthSq() > 1) desired.normalize();
    const sprint = this.keys.ShiftLeft || this.keys.ShiftRight || this.touchSprint;
    let speed = sprint ? 9.4 : 5.2;
    if (this.mods.speedBoost) speed *= 1.32;
    if (this.aiming) speed *= 0.6;
    const accel = p.onGround ? 16 : 5;
    p.vel.x = damp(p.vel.x, desired.x * speed, accel, dt);
    p.vel.z = damp(p.vel.z, desired.z * speed, accel, dt);
    p.position.x += p.vel.x * dt;
    p.position.z += p.vel.z * dt;
    this.world.resolveCircle(p.position, 0.46);

    const ground = this.world.groundHeightAt(p.position.x, p.position.z);
    const gravity = this.mods.lowGravity ? 6.5 : 21;
    if (this.mods.jetpack && this.keys.Space && !p.onGround) {
      p.vy = Math.min(p.vy + 24 * dt, 7.2);
      this.city.particles.spawn(
        new THREE.Vector3(p.position.x, p.position.y + 0.5, p.position.z),
        new THREE.Vector3(rand(-0.5, 0.5), -3, rand(-0.5, 0.5)),
        0x66ddff, 0.25, 1.5,
      );
    }
    p.vy -= gravity * dt;
    p.position.y += p.vy * dt;
    if (p.position.y <= ground) {
      p.position.y = ground;
      p.vy = 0;
      p.onGround = true;
    } else if (p.position.y > ground + 0.22) {
      p.onGround = false;
    }
    if (p.onGround && ground > p.position.y + 0.001) p.position.y = ground;
    p.position.y = Math.max(p.position.y, ground - 0.1);

    const horizSpeed = Math.hypot(p.vel.x, p.vel.z);
    const human = this.player.human;
    const aiming = this.weaponIndex > 0 && (this.aiming || performance.now() - (this.lastShotAt || 0) < 350);
    if (horizSpeed > 0.4) {
      const target = Math.atan2(p.vel.x, p.vel.z);
      if (!aiming) this.playerHeading = lerpAngle(this.playerHeading, target, clamp(dt * 12, 0, 1));
    } else if (this.aiming) {
      this.playerHeading = this.camYaw;
    }
    if (this.headlight) this.headlight.visible = false;
    human.group.rotation.y = this.playerHeading;
    human.group.position.copy(p.position);
    animateHuman(human, dt, horizSpeed, performance.now() / 1000, {
      aiming,
      running: sprint && horizSpeed > 5,
    });

    if (this.fireHeld && this.weapons[this.weaponIndex].auto) this.tryFire();
    this.player.mesh.visible = true;
  }

  updateVehicle(dt) {
    const car = this.playerCar;
    if (!car || car.destroyed) return;
    const touch = this.touchMove;
    const throttle = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0) + touch.y;
    const steerIn = (this.keys.KeyA ? 1 : 0) - (this.keys.KeyD ? 1 : 0) - touch.x;
    const handbrake = Boolean(this.keys.Space);
    const nitro = Boolean(this.keys.ShiftLeft || this.keys.ShiftRight || this.touchSprint);
    const onRoad = this.world.onRoad(car.pos.x, car.pos.z);
    let maxSpeed = car.maxSpeed * (onRoad ? 1 : 0.64);
    if (this.mods.speedBoost) maxSpeed *= 1.18;
    if (nitro) maxSpeed *= 1.32;

    const fwd = new THREE.Vector2(Math.sin(car.heading), Math.cos(car.heading));
    const right = new THREE.Vector2(Math.cos(car.heading), -Math.sin(car.heading));
    let long = car.vel.dot(fwd);
    let lat = car.vel.dot(right);
    if (throttle > 0) {
      car.vel.addScaledVector(fwd, car.accel * throttle * dt * (nitro ? 1.8 : 1));
    } else if (throttle < 0) {
      if (long > 1) car.vel.addScaledVector(fwd, -car.accel * 1.8 * dt * -throttle);
      else car.vel.addScaledVector(fwd, -car.accel * 0.55 * dt * -throttle);
    }
    const drag = throttle !== 0 ? 0.22 : 1.15;
    long = car.vel.dot(fwd) * Math.exp(-drag * dt);
    lat = car.vel.dot(right) * Math.exp(-(this.mods.drift ? 2.1 : 7.8) * dt);
    if (handbrake) {
      long *= Math.exp(-2.6 * dt);
      lat *= Math.exp(-1.6 * dt);
    }
    car.vel.set(fwd.x * long + right.x * lat, fwd.y * long + right.y * lat);
    const speedMag = car.vel.length();
    const limit = Math.max(maxSpeed, 8);
    if (speedMag > limit) car.vel.multiplyScalar(limit / speedMag);
    if (Math.abs(long) < 0.05 && throttle === 0) car.vel.set(0, 0);

    const steerFactor = clamp(Math.abs(long) / 5.5, 0, 1);
    const direction = long < -0.3 ? -1 : 1;
    car.heading += steerIn * 2.05 * dt * steerFactor * direction * (handbrake ? 1.5 : 1);
    car.pos.x += car.vel.x * dt;
    car.pos.z += car.vel.y * dt;
    car.pos.y = this.world.groundHeightAt(car.pos.x, car.pos.z);

    const hit = this.world.resolveCircle(car.pos, 1.25);
    if (hit) {
      const impact = car.vel.length();
      car.vel.multiplyScalar(-0.18);
      if (impact > 5) {
        this.city.damageCar(car, impact * 1.6, 'crash');
        this.audio.impact();
        this.shake(Math.min(0.5, impact * 0.02));
        this.city.particles.burst(new THREE.Vector3(car.pos.x, 0.8, car.pos.z), 0xffcc66, 8, 3, { life: 0.4, gravity: 8 });
      }
    }

    for (const other of this.city.traffic) {
      if (other === car || other.destroyed) continue;
      const d = dist2(car.pos.x, car.pos.z, other.pos.x, other.pos.z);
      if (d < 3.1) {
        const impact = car.vel.length();
        if (impact > 3.5) {
          this.city.damageCar(car, 4 + impact * 0.4, 'crash');
          this.city.damageCar(other, impact * 2.5, 'crash');
          car.vel.multiplyScalar(0.25);
          other.speed = 0;
          this.audio.impact();
          this.shake(Math.min(0.4, impact * 0.015));
        } else {
          car.vel.multiplyScalar(0.75);
        }
        break;
      }
    }

    const night = this.world.night || 0;
    if (this.headlight) {
      this.headlight.visible = night > 0.28;
      this.headlight.intensity = night > 0.28 ? 90 * night : 0;
      this.headlight.position.set(car.pos.x + fwd.x * (car.cfg.len * 0.52), car.pos.y + 0.85, car.pos.z + fwd.y * (car.cfg.len * 0.52));
      this.headlight.target.position.set(car.pos.x + fwd.x * 24, car.pos.y + 0.2, car.pos.z + fwd.y * 24);
      this.headlight.target.updateMatrixWorld();
    }
    this.player.position.copy(car.pos);
    car.speed = car.vel.dot(fwd);
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    const roll = clamp(-steerIn * Math.abs(long) * 0.006, -0.07, 0.07);
    const pitch = clamp((throttle < 0 ? 1 : -1) * Math.min(1, Math.abs(long) / 20) * 0.026, -0.05, 0.05);
    car.group.rotation.z = damp(car.group.rotation.z, roll, 8, dt);
    car.group.rotation.x = damp(car.group.rotation.x, pitch, 8, dt);
    for (const w of car.wheels) w.rotation.x += long * dt * 2.2;
    this.audio.setEngine(clamp(Math.abs(long) / car.maxSpeed, 0, 1));
    this.lookTimer += dt;
    if (this.lookTimer > 1.15) {
      this.camYaw = lerpAngle(this.camYaw, car.heading, clamp(dt * 2.6, 0, 1));
      this.camPitch = damp(this.camPitch, -0.12, 2, dt);
    }
    if (nitro && Math.abs(long) > 4 && Math.random() < 0.8) {
      const back = new THREE.Vector3(car.pos.x - fwd.x * (car.len || 2.2), car.pos.y + 0.4, car.pos.z - fwd.y * 2.2);
      this.city.particles.spawn(back, new THREE.Vector3(-fwd.x * 2, rand(0, 0.5), -fwd.y * 2), pick([0x59f0ff, 0xff8a3a]), 0.25, 0);
    }
    const glowOn = this.mods.neon;
    if (car.glow) {
      car.glow.visible = glowOn;
      if (glowOn) car.glowMat.color.setHSL((performance.now() * 0.0002) % 1, 0.9, 0.6);
    }
    if (this.fireHeld && this.weapons[this.weaponIndex].auto) this.tryFire();
  }

  updateCamera(dt) {
    if (!this.started) {
      const t = (performance.now() - this.introStart) / 1000;
      const spawn = this.world.getSpawn();
      const angle = 1.15 + Math.sin(t * 0.12) * 0.55;
      const radius = 26;
      this.camera.position.set(
        spawn.x + Math.cos(angle) * radius,
        7.5 + Math.sin(t * 0.2) * 0.9,
        spawn.z + Math.sin(angle) * radius,
      );
      this.camera.lookAt(spawn.x + 4, 2.6, spawn.z - 2);
      return;
    }
    const car = this.playerCar;
    const target = new THREE.Vector3();
    if (car) {
      target.set(car.pos.x, car.pos.y + 1.45, car.pos.z);
    } else {
      target.set(this.player.position.x, this.player.position.y + 1.62, this.player.position.z);
    }
    const aiming = this.aiming && !car && this.weaponIndex > 0;
    const dist = car ? (aiming ? 6.5 : 9.2) : (aiming ? 3.4 : this.camDist);
    const dir = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * Math.cos(this.camPitch),
    ).normalize();
    const desired = target.clone().addScaledVector(dir, -dist);
    const castDir = desired.clone().sub(target);
    const castLen = castDir.length();
    castDir.normalize();
    const wall = this.world.raycast(target, castDir, castLen + 0.6);
    if (wall.distance < castLen + 0.4) {
      desired.copy(target).addScaledVector(castDir, Math.max(0.7, wall.distance - 0.45));
    }
    const ground = this.world.groundHeightAt(desired.x, desired.z);
    desired.y = Math.max(desired.y, ground + 0.45);
    const k = 1 - Math.exp(-12 * dt);
    this.camera.position.lerp(desired, k);
    const look = target.clone().add(new THREE.Vector3(0, aiming ? 0.0 : 0.08, 0));
    this.camera.lookAt(look);

    if (this.shakeMag > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeMag;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeMag;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeMag;
      this.camera.lookAt(look);
      this.shakeMag = damp(this.shakeMag, 0, 7, dt);
    }
  }

  shake(mag) {
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  updateTracers(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      } else {
        t.line.material.opacity = clamp(t.life / t.maxLife, 0, 1);
      }
    }
  }

  addTracer(start, end, color = 0xffd166) {
    const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.075, maxLife: 0.075 });
  }

  getEntityFromObject(obj) {
    let o = obj;
    while (o && !o.userData?.entity) o = o.parent;
    return o?.userData?.entity || null;
  }

  tryFire() {
    if (!this.started || this.paused || this.gameOver || this.storyOpen) return;
    const now = performance.now() / 1000;
    if (now < this.nextFire) return;
    if (this.reloadTimer > 0) return;
    const weapon = this.weapons[this.weaponIndex];
    const car = this.playerCar;
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    if (weapon.melee) {
      origin.set(this.player.position.x, this.player.position.y + 1.35, this.player.position.z);
      const cp = Math.cos(this.camPitch);
      dir.set(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp).normalize();
    } else {
      origin.copy(this.camera.position);
      this.camera.getWorldDirection(dir);
      const spread = weapon.spread || 0;
      dir.x += (Math.random() - 0.5) * spread * 2;
      dir.y += (Math.random() - 0.5) * spread * 2;
      dir.z += (Math.random() - 0.5) * spread * 2;
      dir.normalize();
    }

    if (weapon.melee) {
      this.nextFire = now + weapon.rate;
      this.audio.punch();
      this.aiming = false;
      this.lastShotAt = performance.now();
      const result = this.raycastWorld(origin, dir, weapon.range);
      const point = result.point;
      if (result.entity?.kind === 'ped') {
        this.city.damagePed(result.entity, weapon.damage, 'player');
        this.city.particles.burst(point, 0x8f1d1d, 6, 2.4, { life: 0.3, gravity: 12 });
        this.panicCity(point);
      } else if (result.entity?.kind === 'car') {
        this.city.damageCar(result.entity, 5, 'player');
        this.city.particles.burst(point, 0xffcc66, 6, 2, { life: 0.3, gravity: 8 });
      } else {
        this.city.particles.burst(point, 0xffcf7a, 5, 2, { life: 0.25, gravity: 4 });
      }
      this.addTracer(origin.clone().addScaledVector(dir, 0.6), point, 0xffd9a0);
      return;
    }

    if (weapon.mag <= 0) {
      this.reload();
      return;
    }
    if (!this.mods.infiniteAmmo) weapon.mag--;
    this.nextFire = now + weapon.rate;
    this.lastShotAt = performance.now();
    this.audio.gun(weapon.id);
    this.shake(weapon.id === 'smg' ? 0.045 : 0.09);
    this.camPitch = clamp(this.camPitch + 0.003 + Math.random() * 0.004, -0.72, 0.55);
    const muzzle = car
      ? new THREE.Vector3(car.pos.x + Math.sin(car.heading) * 1.6, car.pos.y + 1.1, car.pos.z + Math.cos(car.heading) * 1.6)
      : new THREE.Vector3(this.player.position.x, this.player.position.y + 1.48, this.player.position.z);
    this.city.particles.spawn(muzzle, new THREE.Vector3(dir.x, dir.y + 0.6, dir.z), 0xffcf6a, 0.09, 0);

    const result = this.raycastWorld(origin, dir, weapon.range);
    const end = result.point.clone();
    if (result.entity?.kind === 'ped') {
      const ped = result.entity;
      const headshot = result.hitPoint && result.hitPoint.y > ped.pos.y + 1.55;
      const dmg = weapon.damage * (headshot ? 1.9 : 1);
      this.city.damagePed(ped, dmg, 'player');
      this.city.particles.burst(result.point, 0x8f1d1d, 7, 2.5, { life: 0.35, gravity: 12 });
      this.panicCity(muzzle);
    } else if (result.entity?.kind === 'car') {
      const hitCar = result.entity;
      if (hitCar !== this.playerCar) {
        this.city.damageCar(hitCar, weapon.damage * 0.9, 'player');
        this.city.particles.burst(result.point, 0xffcc66, 8, 3, { life: 0.4, gravity: 9 });
        if (!hitCar.police) this.addWanted(1, 'إطلاق نار');
      }
    } else if (result.hit) {
      this.city.particles.burst(result.point, 0xd8c9a8, 5, 2, { life: 0.3, gravity: 9 });
    }
    this.addTracer(muzzle, end, weapon.id === 'smg' ? 0xffe08a : 0xffd166);
    this.panicCity(muzzle);
  }

  raycastWorld(origin, dir, range) {
    const raycaster = new THREE.Raycaster(origin, dir, 0, range);
    const objs = [];
    for (const ped of this.city.peds) {
      if (!ped.dead && !ped.removed) objs.push(ped.group);
    }
    for (const car of this.city.traffic) {
      if (!car.destroyed && car !== this.playerCar) objs.push(car.group);
    }
    const hits = raycaster.intersectObjects(objs, true);
    let wall = this.world.raycast(origin, dir, range);
    if (dir.y < -0.001) {
      const t = -origin.y / dir.y;
      if (t > 0 && t < wall.distance) {
        wall = { distance: t, point: origin.clone().addScaledVector(dir, t), normal: new THREE.Vector3(0, 1, 0) };
      }
    }
    let best = null;
    for (const h of hits) {
      const entity = this.getEntityFromObject(h.object);
      if (!entity) continue;
      if (h.distance < wall.distance) {
        best = { entity, point: h.point, hitPoint: h.point, hit: true, distance: h.distance };
        break;
      }
    }
    if (best) return best;
    return { entity: null, point: wall.point, hit: wall.distance < range, distance: wall.distance };
  }

  panicCity(pos) {
    this.city.panic(pos.x, pos.z, 26);
  }

  reload() {
    const weapon = this.weapons[this.weaponIndex];
    if (weapon.melee || this.reloadTimer > 0) return;
    if (weapon.mag >= weapon.magSize) return;
    if (!this.mods.infiniteAmmo && weapon.reserve <= 0) {
      this.ui.toast('لا توجد ذخيرة احتياطية', 'police', 1800);
      return;
    }
    this.reloadTimer = weapon.reload;
    this.ui.toast('جاري التعمير...', '', 1300);
    this.audio.ui();
  }

  cycleRadio() {
    if (!this.playerCar) {
      this.ui.toast('الراديو يعمل داخل السيارة', '', 1800);
      return;
    }
    const st = this.audio.cycleStation();
    this.ui.toast(`راديو: ${st.name}`, 'mission', 1800);
    this.audio.startMusic();
  }

  addMoney(n) {
    this.money = Math.max(0, this.money + n);
  }

  addHealth(n) {
    this.player.health = clamp(this.player.health + n, 0, 100);
    this.ui.toast(`+${Math.round(n)} صحة`, 'mission', 1600);
  }

  addArmor(n) {
    this.player.armor = clamp(this.player.armor + n, 0, 100);
    this.ui.toast(`+${Math.round(n)} دروع`, 'mission', 1600);
  }

  damagePlayer(amount, source = 'unknown') {
    if (this.gameOver || !this.started) return;
    if (this.mods.godMode) return;
    if (this.player.armor > 0) {
      const absorbed = Math.min(this.player.armor, amount * 0.62);
      this.player.armor -= absorbed;
      amount -= absorbed;
    }
    this.player.health -= amount;
    this.shake(0.18);
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.wasted();
    }
  }

  wasted() {
    if (this.gameOver) return;
    this.gameOver = true;
    if (this.playerCar) {
      const car = this.playerCar;
      car.occupied = false;
      car.ai = false;
      this.playerCar = null;
      this.player.mesh.visible = true;
      this.player.position.set(car.pos.x + 2, this.world.groundHeightAt(car.pos.x, car.pos.z), car.pos.z);
    }
    this.audio.stopEngine();
    this.audio.stopMusic();
    this.audio.stopSiren();
    this.ui.wasted(true);
    this.missions.fail('أُصبت — أعد المحاولة');
    this.respawnTimer = 4.2;
  }

  respawn() {
    this.ui.wasted(false);
    this.gameOver = false;
    this.money = Math.max(0, this.money - 100);
    this.player.health = 100;
    this.player.armor = 0;
    this.wanted = 0;
    this.city.clearPolice();
    this.city.clearPolice();
    this.player.position.set(LANDMARKS.hospital.x, this.world.groundHeightAt(LANDMARKS.hospital.x, LANDMARKS.hospital.z), LANDMARKS.hospital.z);
    this.player.vel.set(0, 0, 0);
    this.player.vy = 0;
    this.player.mesh.visible = true;
    this.player.mesh.position.copy(this.player.position);
    this.camYaw = -Math.PI / 2;
    this.playerHeading = this.camYaw;
    this.player.mesh.rotation.y = this.camYaw;
    this.setMissionMarker(this.missions.getStartMarker());
    this.ui.toast('خرجت من المستشفى — خسرت $100', 'police', 3200);
    this.save();
  }

  setWanted(n, reason = '') {
    if (this.mods.noWanted) n = 0;
    n = clamp(Math.round(n), 0, 5);
    const old = this.wanted;
    this.wanted = n;
    this.heatTimer = 0;
    if (n > old && reason) this.ui.toast(`المطلوب ارتفع: ${reason}`, 'police', 2200);
    if (n === 0) {
      this.city.clearPolice();
      this.audio.stopSiren();
    } else {
      this.audio.startSiren();
    }
  }

  addWanted(n, reason = '') {
    if (this.mods.noWanted) {
      this.setWanted(0);
      return;
    }
    const old = this.wanted;
    this.wanted = clamp(this.wanted + n, 0, 5);
    this.heatTimer = 0;
    if (this.wanted > old && reason) this.ui.toast(`المطلوب +${n}: ${reason}`, 'police', 2400);
    this.audio.startSiren();
  }

  clearWanted() {
    const was = this.wanted;
    this.wanted = 0;
    this.city.clearPolice();
    this.audio.stopSiren();
    if (was > 0) this.ui.toast('تم مسح سجلك — الشرطة فقدت أثرك', 'mission', 2600);
  }

  onPedKilled(ped, source) {
    this.kills++;
    if (ped.gang === 'rival') {
      this.addMoney(25);
      this.ui.toast('+$25 — واحد من الكوبرا وقع', 'cash', 1600);
      return;
    }
    if (ped.police) {
      this.addWanted(1, 'قتل شرطي');
      return;
    }
    if (source === 'player' || source === 'car') {
      this.addWanted(2, 'قتل مدني');
      if (Math.random() < 0.55) {
        const p = this.city.spawnPickup('cash', ped.pos.x, ped.pos.z);
        p.amount = rand(25, 70);
      }
    }
  }

  onCarExploded(car, source) {
    if (car.police) this.addWanted(1, 'تدمير سيارة شرطة');
    else if (source === 'player' && car !== this.playerCar) this.addWanted(1, 'تدمير سيارة');
    this.ui.toast('انفجرت سيارة', 'police', 1800);
  }

  onStoryComplete() {
    this.storyOpen = true;
    this.paused = true;
    try { document.exitPointerLock(); } catch {}
    this.ui.story([
      `المال: ${formatMoney(this.money)}`,
      `المهام: 5 / 5`,
      `القتلات: ${this.kills}`,
      `مودات: 11 مفتوحة`,
    ]);
    this.chips = Math.max(this.chips, 11);
    this.ui.buildMods(this);
    this.save();
  }

  notify(message, kind = '', ms = 2800) {
    this.ui.toast(message, kind, ms);
  }

  setMissionMarker(pos) {
    if (!pos) {
      this.marker.group.visible = false;
      return;
    }
    const y = this.world.groundHeightAt(pos.x, pos.z);
    this.marker.group.position.set(pos.x, y + 0.05, pos.z);
    this.marker.group.visible = true;
    const color = this.missions.current ? 0xffb703 : 0x64f0c8;
    this.marker.beamMat.color.setHex(color);
    this.marker.ringMat.color.setHex(color);
    this.marker.gemMat.color.setHex(color);
    this.marker.disk.material.color.setHex(color);
  }

  updateMissionMarker(dt) {
    if (!this.marker.group.visible) return;
    const t = performance.now() / 1000;
    this.marker.gem.rotation.y += dt * 1.5;
    this.marker.gem.position.y = 3.5 + Math.sin(t * 2) * 0.22;
    this.marker.ring.rotation.z += dt * 0.6;
    this.marker.ring2.rotation.z -= dt * 0.9;
    const pulse = 0.1 + (Math.sin(t * 2.4) * 0.5 + 0.5) * 0.12;
    this.marker.beamMat.opacity = pulse;
  }

  toggleMod(key, disabled) {
    const def = MOD_DEFS.find((m) => m.key === key);
    if (!def || disabled) {
      this.ui.toast(`مود مقفل — يحتاج ${def?.req ?? 0} شرائح`, 'police', 2400);
      return;
    }
    this.mods[key] = !this.mods[key];
    this.audio.ui();
    this.applyModState();
    this.ui.buildMods(this);
    this.ui.toast(`${this.mods[key] ? 'فُعّل' : 'أُوقف'}: ${def.name}`, this.mods[key] ? 'mission' : '', 1800);
    this.save();
  }

  applyModState() {
    this.city.riot = Boolean(this.mods.riot);
    if (this.mods.noWanted) this.clearWanted();
    for (const car of this.city.traffic) {
      if (car.glow) car.glow.visible = Boolean(this.mods.neon);
    }
    if (this.mods.infiniteAmmo) {
      for (const w of this.weapons) {
        if (w.magSize) {
          w.mag = w.magSize;
          w.reserve = Math.max(w.reserve, w.magSize);
        }
      }
    }
  }

  spawnVehicle(type = 'sports') {
    if (!this.started) return;
    let base = this.world.nearestRoadPoint(this.player.position.x, this.player.position.z);
    const axis = base.axis;
    let heading = axis === 'x' ? 0 : Math.PI / 2;
    if (Math.random() < 0.5) heading += Math.PI;
    let x = base.x;
    let z = base.z;
    if (this.playerCar) {
      x += Math.sin(this.playerCar.heading) * 10;
      z += Math.cos(this.playerCar.heading) * 10;
      base = this.world.nearestRoadPoint(x, z);
      x = base.x;
      z = base.z;
    }
    const car = this.city.spawnCarAt(x, z, type, pick([0xff5d3a, 0x59c7ff, 0x64f0c8, 0xffd166, 0xff6fb5]), heading);
    car.ai = false;
    car.vel.set(0, 0);
    this.ui.toast(`تم استدعاء ${type}`, 'mission', 1800);
    this.audio.chime(true);
  }

  teleport(name) {
    const tp = TELEPORTS[name];
    if (!tp) return;
    if (this.playerCar) {
      const rp = this.world.nearestRoadPoint(tp.x, tp.z);
      const car = this.playerCar;
      car.pos.set(rp.x, this.world.groundHeightAt(rp.x, rp.z), rp.z);
      car.vel.set(0, 0);
      car.heading = rp.axis === 'x' ? 0 : Math.PI / 2;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading;
      this.player.position.copy(car.pos);
      this.camYaw = car.heading;
    } else {
      const p = new THREE.Vector3(tp.x, 0, tp.z);
      p.y = this.world.groundHeightAt(p.x, p.z);
      this.world.resolveCircle(p, 0.6);
      this.player.position.copy(p);
      this.player.mesh.position.copy(p);
      this.player.vel.set(0, 0);
      this.camYaw = Math.PI / 2;
      this.playerHeading = this.camYaw;
      this.player.mesh.rotation.y = this.camYaw;
    }
    this.ui.showLocation(tp.name, 'FAST TRAVEL');
    this.ui.toast(`انتقلت إلى ${tp.name}`, 'mission', 2000);
    this.save();
  }

  setWeather(kind) {
    if (kind === 'sunset') {
      this.hour = 17.65;
      this.autoTime = false;
      this.weather = 'clear';
    } else if (kind === 'night') {
      this.hour = 22.4;
      this.autoTime = false;
      this.weather = 'clear';
    } else if (kind === 'rain') {
      this.weather = 'rain';
    } else {
      this.weather = 'clear';
    }
    if (this.weather === 'rain') this.audio.startRain();
    else this.audio.stopRain();
    this.world.updateEnvironment(this.hour, this.weather);
    this.ui.buildMods(this);
  }

  getDistrict() {
    return this.ui.getDistrict(this.player.position.x, this.player.position.z);
  }

  updateWanted(dt) {
    if (this.mods.noWanted && this.wanted > 0) this.clearWanted();
    if (this.wanted <= 0) return;
    if (dist2(this.player.position.x, this.player.position.z, 70, -112) < 10) {
      this.clearWanted();
      this.ui.toast('المغسلة غسلت سجلك', 'mission', 2400);
      return;
    }
    this.heatTimer += dt;
    if (this.heatTimer > 16) {
      this.wanted = Math.max(0, this.wanted - 1);
      this.heatTimer = 0;
      if (this.wanted === 0) {
        this.city.clearPolice();
        this.audio.stopSiren();
        this.ui.toast('هدأت الشرطة — اختفى المطلوب', 'mission', 2600);
      } else {
        this.ui.toast('الشرطة تفقد أثرك...', 'mission', 2200);
      }
    }
  }

  updateChaos(dt) {
    if (!this.mods.chaos) {
      this.chaosTimer = 13;
      return;
    }
    this.chaosTimer -= dt;
    if (this.chaosTimer > 0) return;
    this.chaosTimer = 14;
    const events = ['explode', 'cash', 'gang', 'rain', 'cop'];
    const ev = pick(events);
    const px = this.player.position.x;
    const pz = this.player.position.z;
    if (ev === 'explode') {
      const cars = this.city.traffic.filter((c) => !c.destroyed && c !== this.playerCar && dist2(c.pos.x, c.pos.z, px, pz) < 45);
      if (cars.length) {
        this.city.explodeCar(pick(cars), 'chaos');
        this.ui.toast('فوضى: انفجار قريب!', 'police', 2600);
      }
    } else if (ev === 'cash') {
      const p = this.city.spawnPickup('cash', px + rand(-12, 12), pz + rand(-12, 12));
      p.amount = rand(150, 300);
      this.ui.toast('فوضى: كيس فلوس ظهر قربك', 'cash', 2600);
    } else if (ev === 'gang') {
      this.city.spawnGang(2, px + rand(-6, 6), pz + rand(-6, 6));
      this.ui.toast('فوضى: عصابة ظهرت!', 'police', 2600);
    } else if (ev === 'rain') {
      this.weather = this.weather === 'rain' ? 'clear' : 'rain';
      if (this.weather === 'rain') this.audio.startRain();
      else this.audio.stopRain();
      this.world.updateEnvironment(this.hour, this.weather);
      this.ui.toast('فوضى: تغيّر الجو', 'mission', 2400);
    } else {
      this.addWanted(1, 'فوضى');
      this.ui.toast('فوضى: بلاغ كاذب عن جريمة', 'police', 2600);
    }
  }

  updateInteractions() {
    if (this.gameOver || this.paused) return;
    let text = null;
    let kind = '';
    if (this.missions.canStart(this.player.position)) {
      text = '<b>E</b> ابدأ المهمة';
      kind = 'mission';
    } else if (!this.playerCar) {
      const car = this.city.getNearestCar(this.player.position, 5.2);
      if (car) {
        text = '<b>F</b> ادخل السيارة';
        kind = 'vehicle';
      }
    }
    if (text !== this.lastInteract) {
      this.lastInteract = text;
      this.ui.setInteract(text);
    }
    this.interactKind = kind;
  }

  frame() {
    const nowMs = performance.now();
    const dt = Math.min(Math.max(0, (nowMs - this.lastFrameAt) / 1000), 0.05);
    this.lastFrameAt = nowMs;
    if (this.started && !this.paused && !this.gameOver) {
      this.tick(dt);
    } else if (this.started && this.gameOver) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      this.world.updateRain(dt, this.camera, this.weather === 'rain');
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    if (this.started) {
      this.hudAccum += dt;
      if (this.hudAccum > 0.1) {
        this.hudAccum = 0;
        this.ui.updateHUD(this);
      }
    }
  }

  tick(dt) {
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const weapon = this.weapons[this.weaponIndex];
        if (weapon.magSize) {
          const need = weapon.magSize - weapon.mag;
          if (this.mods.infiniteAmmo) {
            weapon.mag = weapon.magSize;
          } else {
            const take = Math.min(need, weapon.reserve);
            weapon.mag += take;
            weapon.reserve -= take;
          }
        }
      }
    }

    if (this.autoTime) this.hour = (this.hour + dt * 0.026) % 24;
    this.envAccum += dt;
    if (this.envAccum > 0.28) {
      this.envAccum = 0;
      this.world.updateEnvironment(this.hour, this.weather);
    }
    if (this.world.waterUniforms) this.world.waterUniforms.uTime.value = performance.now() / 1000;
    this.world.updateRain(dt, this.camera, this.weather === 'rain');
    this.lookTimer += dt;

    if (this.playerCar) this.updateVehicle(dt);
    else this.updatePlayer(dt);

    this.city.update(dt, this);
    this.missions.update(dt, this);
    this.updateWanted(dt);
    this.updateChaos(dt);
    this.updateMissionMarker(dt);
    this.updateTracers(dt);
    this.updateInteractions();
    this.audio.setEngine(this.playerCar ? clamp(Math.abs(this.playerCar.speed) / this.playerCar.maxSpeed, 0, 1) : 0);

    if (this.key && this.key !== '') this.key = '';
    const dist = this.getDistrict();
    this.district = dist;
    if (dist.name !== this.lastDistrict) {
      this.lastDistrict = dist.name;
      this.ui.showLocation(dist.name, dist.en);
    }

    if (this.player.health <= 0 && !this.gameOver) this.wasted();
    if (this.player.position.y < -4) {
      this.player.position.y = this.world.groundHeightAt(this.player.position.x, this.player.position.z);
      this.player.vy = 0;
    }
  }

  openPause() {
    if (!this.started || this.gameOver) return;
    this.paused = true;
    this.fireHeld = false;
    this.ui.togglePause(true);
    try { document.exitPointerLock(); } catch {}
  }

  closePause() {
    this.ui.togglePause(false);
    this.paused = false;
    this.requestLock();
  }

  toggleMods() {
    if (!this.started) return;
    if (this.modsOpen) this.closeMods();
    else this.openMods();
  }

  openMods() {
    if (!this.started) return;
    if (!this.ui.el.pauseOverlay.classList.contains('hidden')) this.pauseReturn = true;
    this.ui.togglePause(false);
    this.modsOpen = true;
    this.paused = true;
    this.fireHeld = false;
    this.ui.buildMods(this);
    this.ui.toggleMods(true, this);
    try { document.exitPointerLock(); } catch {}
  }

  closeMods() {
    this.modsOpen = false;
    this.ui.toggleMods(false);
    if (this.pauseReturn) {
      this.pauseReturn = false;
      this.ui.togglePause(true);
      return;
    }
    this.paused = false;
    this.requestLock();
  }

  setupDebug() {
    window.__game = this;
    window.__SAN_ARROYO__ = this;
  }
}

function failStart(error) {
  console.error(error);
  const overlay = document.getElementById('errorOverlay');
  const text = document.getElementById('errorText');
  const boot = document.getElementById('boot');
  if (boot) boot.classList.add('hidden');
  if (overlay) overlay.classList.remove('hidden');
  if (text) text.textContent = String(error?.message || error);
}

try {
  const game = new Game();
  window.__game = game;
} catch (error) {
  failStart(error);
}
