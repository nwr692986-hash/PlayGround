import * as THREE from 'three';
import {
  clamp, damp, lerpAngle, angleDelta, pick, rand, radialTexture, dist2,
} from './utils.js';

const shadowTexture = radialTexture('rgba(0,0,0,0.62)', 'rgba(0,0,0,0)');
const shadowGeo = new THREE.PlaneGeometry(1, 1);

const GEO = {
  torso: new THREE.BoxGeometry(0.64, 0.74, 0.34),
  head: new THREE.SphereGeometry(0.22, 10, 8),
  hair: new THREE.SphereGeometry(0.235, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
  arm: new THREE.BoxGeometry(0.16, 0.56, 0.17),
  hand: new THREE.SphereGeometry(0.095, 6, 5),
  leg: new THREE.BoxGeometry(0.2, 0.74, 0.21),
  shoe: new THREE.BoxGeometry(0.21, 0.13, 0.34),
  cap: new THREE.CylinderGeometry(0.22, 0.235, 0.12, 10),
  brim: new THREE.BoxGeometry(0.3, 0.03, 0.26),
  glasses: new THREE.BoxGeometry(0.34, 0.09, 0.06),
  gun: new THREE.BoxGeometry(0.09, 0.15, 0.42),
  gunTip: new THREE.BoxGeometry(0.05, 0.05, 0.18),
  wheel: new THREE.CylinderGeometry(1, 1, 1, 12),
  body: new THREE.BoxGeometry(1, 1, 1),
  cabin: new THREE.BoxGeometry(1, 1, 1),
};

const CAR_TYPES = {
  sedan: { w: 1.82, len: 4.25, bodyH: 0.48, cabinW: 1.5, cabinH: 0.55, cabinL: 2.05, wheelR: 0.32, maxSpeed: 27, accel: 14, grip: 7.5, mass: 1 },
  sports: { w: 1.92, len: 4.3, bodyH: 0.4, cabinW: 1.42, cabinH: 0.44, cabinL: 1.8, wheelR: 0.33, maxSpeed: 42, accel: 26, grip: 8.5, mass: 0.9 },
  suv: { w: 2.02, len: 4.7, bodyH: 0.62, cabinW: 1.7, cabinH: 0.7, cabinL: 2.4, wheelR: 0.38, maxSpeed: 28, accel: 15, grip: 6.8, mass: 1.3 },
  taxi: { w: 1.82, len: 4.25, bodyH: 0.48, cabinW: 1.5, cabinH: 0.55, cabinL: 2.05, wheelR: 0.32, maxSpeed: 30, accel: 16, grip: 8, mass: 1 },
  van: { w: 2.05, len: 5.2, bodyH: 0.75, cabinW: 1.78, cabinH: 0.85, cabinL: 3.5, wheelR: 0.38, maxSpeed: 24, accel: 12, grip: 6, mass: 1.5 },
  police: { w: 1.86, len: 4.35, bodyH: 0.48, cabinW: 1.53, cabinH: 0.55, cabinL: 2.0, wheelR: 0.33, maxSpeed: 36, accel: 22, grip: 8.4, mass: 1.05 },
};

const SKIN_TONES = [0xb97d52, 0x8a5a38, 0xd8a77c, 0x6f442b, 0xc58b65, 0x9a6a47];
const HAIR_COLORS = [0x1b1715, 0x2b1e16, 0x3d2a1a, 0x111111, 0x5a4028];

export function createHuman(opts = {}) {
  const {
    shirt = 0x2e8b82,
    pants = 0x27364f,
    skin = pick(SKIN_TONES),
    hair = pick(HAIR_COLORS),
    cap = null,
    police = false,
    rival = false,
    player = false,
    scale = 1,
  } = opts;
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.86, flatShading: true });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9, flatShading: true });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.92, flatShading: true });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.95, flatShading: true });
  const shoeMat = new THREE.MeshStandardMaterial({ color: police ? 0x161a20 : 0x24201d, roughness: 0.85 });

  const torso = new THREE.Mesh(GEO.torso, shirtMat);
  torso.position.y = 1.2;
  group.add(torso);
  if (police) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.38), new THREE.MeshStandardMaterial({ color: 0x1c2a45, roughness: 0.8 }));
    vest.position.y = 1.22;
    group.add(vest);
  }
  if (rival) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.4, 0.38), new THREE.MeshStandardMaterial({ color: 0x3b245a, roughness: 0.9 }));
    vest.position.y = 1.32;
    group.add(vest);
  }
  const head = new THREE.Mesh(GEO.head, skinMat);
  head.position.y = 1.78;
  head.scale.set(1, 1.12, 0.95);
  group.add(head);
  const hairMesh = new THREE.Mesh(GEO.hair, hairMat);
  hairMesh.position.y = 1.83;
  group.add(hairMesh);
  let capMesh = null;
  if (cap !== null) {
    capMesh = new THREE.Mesh(GEO.cap, new THREE.MeshStandardMaterial({ color: cap, roughness: 0.9 }));
    capMesh.position.y = 1.99;
    group.add(capMesh);
    const brim = new THREE.Mesh(GEO.brim, capMesh.material);
    brim.position.set(0, 1.96, 0.2);
    group.add(brim);
  }
  if (player) {
    const glasses = new THREE.Mesh(GEO.glasses, new THREE.MeshStandardMaterial({ color: 0x0a0c0e, metalness: 0.4, roughness: 0.35 }));
    glasses.position.set(0, 1.82, 0.18);
    group.add(glasses);
  }
  if (police) {
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    badge.position.set(-0.18, 1.42, 0.19);
    group.add(badge);
  }

  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.43, 1.5, 0);
    const arm = new THREE.Mesh(GEO.arm, shirtMat);
    arm.position.y = -0.28;
    pivot.add(arm);
    const hand = new THREE.Mesh(GEO.hand, skinMat);
    hand.position.y = -0.6;
    pivot.add(hand);
    const gun = new THREE.Mesh(GEO.gun, new THREE.MeshStandardMaterial({ color: 0x20242a, metalness: 0.6, roughness: 0.4 }));
    gun.position.set(0, -0.6, 0.22);
    gun.visible = false;
    pivot.add(gun);
    group.add(pivot);
    return { pivot, gun, hand };
  };
  const makeLeg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, 0.82, 0);
    const leg = new THREE.Mesh(GEO.leg, pantsMat);
    leg.position.y = -0.37;
    pivot.add(leg);
    const shoe = new THREE.Mesh(GEO.shoe, shoeMat);
    shoe.position.set(0, -0.76, 0.06);
    pivot.add(shoe);
    group.add(pivot);
    return pivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.35, 1.35, 1);
  shadow.position.y = 0.012;
  group.add(shadow);

  group.scale.setScalar(scale);
  return {
    group,
    parts: { torso, head, leftArm, rightArm, leftLeg, rightLeg, capMesh },
    materials: { skinMat, shirtMat, pantsMat },
    aiming: false,
    armed: false,
    phase: Math.random() * Math.PI * 2,
    scale,
  };
}

export function setHumanWeapon(human, armed) {
  human.armed = armed;
  human.parts.rightArm.gun.visible = armed;
}

export function animateHuman(human, dt, speed, time, opts = {}) {
  const { aiming = false, running = false } = opts;
  const p = human.parts;
  human.phase += dt * (speed > 0.4 ? (running ? 11 : 7.5) : 1.7);
  const swing = speed > 0.3 ? Math.min(1.15, speed / 6) : 0;
  const s = Math.sin(human.phase);
  if (aiming) {
    p.rightArm.pivot.rotation.x = -1.52;
    p.rightArm.pivot.rotation.z = -0.08;
    p.leftArm.pivot.rotation.x = -1.2;
    p.leftArm.pivot.rotation.z = 0.24;
  } else {
    p.rightArm.pivot.rotation.x = -s * swing * 0.9;
    p.leftArm.pivot.rotation.x = s * swing * 0.9;
    p.rightArm.pivot.rotation.z = 0;
    p.leftArm.pivot.rotation.z = 0;
  }
  p.leftLeg.rotation.x = s * swing;
  p.rightLeg.rotation.x = -s * swing;
  p.torso.position.y = 1.2 + Math.abs(Math.cos(human.phase * 2)) * 0.025 * swing;
  p.head.position.y = 1.78 + Math.abs(Math.cos(human.phase * 2)) * 0.02 * swing;
  if (p.capMesh) p.capMesh.position.y = 1.99 + Math.abs(Math.cos(human.phase * 2)) * 0.02 * swing;
  if (speed < 0.3) {
    p.rightArm.pivot.rotation.x *= 0.9;
    p.leftArm.pivot.rotation.x *= 0.9;
    p.torso.rotation.z = Math.sin(time * 1.4) * 0.012;
  } else {
    p.torso.rotation.z = 0;
  }
}

export function createVehicle(type = 'sedan', color = 0xbf4b3c, opts = {}) {
  const cfg = CAR_TYPES[type] || CAR_TYPES.sedan;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: 0.22, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x171b20, roughness: 0.65, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x7fa7bb, roughness: 0.15, metalness: 0.45, transparent: true, opacity: 0.72 });
  const bodyY = cfg.wheelR + cfg.bodyH / 2 + 0.08;
  const body = new THREE.Mesh(GEO.body, bodyMat);
  body.scale.set(cfg.w, cfg.bodyH, cfg.len);
  body.position.y = bodyY;
  group.add(body);
  const hood = new THREE.Mesh(GEO.body, bodyMat);
  hood.scale.set(cfg.w * 0.92, cfg.bodyH * 0.35, cfg.len * 0.2);
  hood.position.set(0, bodyY + cfg.bodyH * 0.4, cfg.len * 0.35);
  group.add(hood);
  const cabin = new THREE.Mesh(GEO.cabin, glassMat);
  cabin.scale.set(cfg.cabinW, cfg.cabinH, cfg.cabinL);
  cabin.position.set(0, bodyY + cfg.bodyH / 2 + cfg.cabinH / 2 - 0.03, -cfg.len * 0.06);
  group.add(cabin);
  const roof = new THREE.Mesh(GEO.body, bodyMat);
  roof.scale.set(cfg.cabinW * 0.94, 0.09, cfg.cabinL * 0.9);
  roof.position.set(0, bodyY + cfg.bodyH / 2 + cfg.cabinH, -cfg.len * 0.06);
  group.add(roof);

  const wheels = [];
  const wheelGeo = GEO.wheel.clone();
  wheelGeo.scale(cfg.wheelR, cfg.wheelR, 0.26);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9aa2a5, metalness: 0.7, roughness: 0.35 });
  const wx = cfg.w / 2 - 0.02;
  const wz = cfg.len / 2 - cfg.wheelR * 1.25;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * wx, cfg.wheelR + 0.02, sz * wz);
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      pivot.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(cfg.wheelR * 0.55, cfg.wheelR * 0.55, 0.28, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      pivot.add(rim);
      group.add(pivot);
      wheels.push(pivot);
    }
  }

  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3333, toneMapped: false });
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.06), headMat);
    head.position.set(s * (cfg.w / 2 - 0.35), bodyY + 0.04, cfg.len / 2 + 0.01);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.06), tailMat);
    tail.position.set(s * (cfg.w / 2 - 0.32), bodyY + 0.05, -cfg.len / 2 - 0.01);
    group.add(tail);
  }

  let lights = null;
  if (type === 'police') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.38), darkMat);
    base.position.set(0, bodyY + cfg.bodyH / 2 + cfg.cabinH + 0.12, -cfg.len * 0.06);
    group.add(base);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2438, toneMapped: false });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x2f6bff, toneMapped: false });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.17, 0.3), redMat);
    red.position.set(-0.32, bodyY + cfg.bodyH / 2 + cfg.cabinH + 0.26, -cfg.len * 0.06);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.17, 0.3), blueMat);
    blue.position.set(0.32, bodyY + cfg.bodyH / 2 + cfg.cabinH + 0.26, -cfg.len * 0.06);
    group.add(red, blue);
    lights = { redMat, blueMat, red, blue, t: 0 };
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 0.02, 0.19, cfg.len * 0.55), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.5 }));
    stripe.position.set(0, bodyY + 0.02, -cfg.len * 0.05);
    group.add(stripe);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.32), new THREE.MeshBasicMaterial({ color: 0xffc42e, toneMapped: false }));
    sign.position.set(0, bodyY + cfg.bodyH / 2 + cfg.cabinH + 0.17, -cfg.len * 0.06);
    group.add(sign);
  }

  const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.58, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(cfg.w * 1.25, cfg.len * 1.12, 1);
  shadow.position.y = 0.015;
  group.add(shadow);

  const glowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture, color: 0x59f0ff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(shadowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(cfg.w * 1.5, cfg.len * 1.2, 1);
  glow.position.y = 0.03;
  glow.visible = false;
  group.add(glow);

  return {
    group,
    cfg,
    wheels,
    lights,
    bodyMat,
    glow,
    glowMat,
    type,
    color,
    speed: 0,
    heading: opts.heading || 0,
    maxSpeed: cfg.maxSpeed,
    accel: cfg.accel,
    grip: cfg.grip,
    health: 100,
    occupied: false,
    ai: opts.ai !== false,
    destroyed: false,
  };
}

export class Particles {
  constructor(scene, max = 420) {
    this.max = max;
    this.data = [];
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.22, vertexColors: true, transparent: true, opacity: 0.95,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(position, velocity, color, life = 0.7, gravity = 8, size = 0.22) {
    if (this.data.length >= this.max) this.data.shift();
    this.data.push({
      pos: position.clone(),
      vel: velocity.clone(),
      color: new THREE.Color(color),
      life,
      maxLife: life,
      gravity,
      size,
    });
  }

  burst(position, color, count = 12, speed = 5, opts = {}) {
    const { life = 0.6, gravity = 9, spread = 1, up = 2 } = opts;
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 2 * speed, Math.random() * up, (Math.random() - 0.5) * 2 * speed);
      v.multiplyScalar(spread);
      this.spawn(position, v, color, life * (0.6 + Math.random() * 0.7), gravity);
    }
  }

  update(dt) {
    const alive = [];
    for (const p of this.data) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.06) {
        p.pos.y = 0.06;
        p.vel.y *= -0.28;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
      alive.push(p);
    }
    this.data = alive;
    const count = Math.min(alive.length, this.max);
    for (let i = 0; i < count; i++) {
      const p = alive[i];
      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      const fade = clamp(p.life / p.maxLife, 0, 1);
      this.colors[i * 3] = p.color.r * fade;
      this.colors[i * 3 + 1] = p.color.g * fade;
      this.colors[i * 3 + 2] = p.color.b * fade;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }
}

function makeLoop(rng = Math.random) {
  const lines = [-245, -175, -105, -35, 35, 105, 175, 245];
  let x1 = pick(lines);
  let x2 = pick(lines);
  let z1 = pick(lines);
  let z2 = pick(lines);
  while (x1 === x2) x2 = pick(lines);
  while (z1 === z2) z2 = pick(lines);
  if (x1 > x2) [x1, x2] = [x2, x1];
  if (z1 > z2) [z1, z2] = [z2, z1];
  const inset = 4;
  const pts = [
    { x: x1 + inset, z: z1 + inset },
    { x: x2 - inset, z: z1 + inset },
    { x: x2 - inset, z: z2 - inset },
    { x: x1 + inset, z: z2 - inset },
  ];
  if (rng() < 0.5) pts.reverse();
  return pts;
}

const PED_PATHS = [];
function blockRing(cx, cz) {
  return [
    { x: cx - 23, z: cz - 23 },
    { x: cx + 23, z: cz - 23 },
    { x: cx + 23, z: cz + 23 },
    { x: cx - 23, z: cz + 23 },
  ];
}

export class CityLife {
  constructor(game) {
    this.game = game;
    this.world = game.world;
    this.scene = game.scene;
    this.peds = [];
    this.traffic = [];
    this.policeCars = [];
    this.pickups = [];
    this.particles = new Particles(this.scene, 500);
    this.id = 1;
    this.targetTraffic = 12;
    this.panicTimer = 0;
    this.flashTimer = 0;
    this.lastCopSpawn = 0;
    this.elapsed = 0;
    this.riot = false;
    this.lowDetail = false;
    this.trafficSpawnTimer = 0;
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) PED_PATHS.push(blockRing(i * 70, j * 70));
    }
  }

  spawnInitial() {
    for (let i = 0; i < 13; i++) this.spawnTraffic();
    for (let i = 0; i < 20; i++) this.spawnPed();
    this.spawnPickup('health', -70, 104);
    this.spawnPickup('health', 140, 158);
    this.spawnPickup('health', 12, 282);
    this.spawnPickup('armor', 70, -104);
    this.spawnPickup('armor', 112, 40);
    this.spawnPickup('cash', -168, 160);
    this.spawnPickup('cash', 210, -140);
    this.spawnPickup('cash', 40, 210);
    const homePath = blockRing(-210, 140);
    for (let i = 0; i < 4; i++) {
      const ped = this.spawnPed();
      ped.path = homePath;
      ped.pathIndex = i % 4;
      this.setPedPosition(ped, -210 + rand(-20, 20), 146 + rand(-14, 18));
      ped.group.rotation.y = rand(0, Math.PI * 2);
    }
  }

  spawnPed(opts = {}) {
    const path = pick(PED_PATHS);
    const start = pick(path);
    const human = createHuman({
      shirt: opts.shirt ?? pick([0x3d6b8c, 0x8c3d4a, 0x4a7a52, 0xb0833e, 0x6b5b8a, 0xd0c3a8, 0x37424a]),
      pants: opts.pants ?? pick([0x27364f, 0x3b342e, 0x20242a, 0x4a4a52]),
      cap: Math.random() < 0.25 ? pick([0x8c3d4a, 0x2f6b4a, 0x30343a]) : null,
    });
    const ped = {
      id: this.id++,
      kind: 'ped',
      human,
      group: human.group,
      pos: new THREE.Vector3(start.x + rand(-4, 4), 0.18, start.z + rand(-4, 4)),
      path,
      pathIndex: Math.floor(Math.random() * path.length),
      speed: rand(1.1, 1.9),
      hp: 60,
      dead: false,
      deadTimer: 0,
      state: opts.hostile ? 'hostile' : 'walk',
      hostile: Boolean(opts.hostile),
      gang: opts.gang || null,
      police: Boolean(opts.police),
      shootTimer: rand(0.4, 1.6),
      fleeTimer: 0,
      walkPhase: Math.random() * 10,
      scale: 1,
    };
    if (opts.police) {
      ped.state = 'hostile';
      ped.hostile = true;
      ped.hp = 85;
      ped.speed = rand(2.5, 3.4);
    }
    if (opts.gang) {
      ped.hp = 75;
      ped.speed = rand(2.2, 3);
    }
    this.setPedPosition(ped, start.x + rand(-3, 3), start.z + rand(-3, 3));
    ped.group.userData.entity = ped;
    this.peds.push(ped);
    this.scene.add(ped.group);
    return ped;
  }

  spawnGang(count = 5, cx = 140, cz = 140) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const ped = this.spawnPed({
        hostile: true,
        gang: 'rival',
        shirt: 0x4a2a70,
        pants: 0x1b1a22,
        cap: 0x2f1846,
      });
      const x = cx + Math.cos(a) * (12 + Math.random() * 6);
      const z = cz + Math.sin(a) * (12 + Math.random() * 6);
      ped.pos.set(x, 0.18, z);
      ped.group.position.copy(ped.pos);
      ped.hostile = true;
      ped.gang = 'rival';
      ped.hp = 80;
      ped.shootTimer = 1 + Math.random() * 1.5;
      result.push(ped);
    }
    return result;
  }

  spawnCop(x, z) {
    const ped = this.spawnPed({ police: true, shirt: 0x1c2a45, pants: 0x141b2b, cap: 0x101a2c });
    ped.pos.set(x, 0.18, z);
    ped.group.position.copy(ped.pos);
    ped.state = 'hostile';
    ped.hostile = true;
    ped.police = true;
    ped.hp = 95;
    ped.shootTimer = 0.8;
    return ped;
  }

  setPedPosition(ped, x, z) {
    ped.pos.x = clamp(x, -300, 300);
    ped.pos.z = clamp(z, -300, 360);
    ped.pos.y = this.world.groundHeightAt(ped.pos.x, ped.pos.z);
    ped.group.position.copy(ped.pos);
  }

  spawnTraffic(opts = {}) {
    const route = makeLoop();
    const start = route[0];
    const types = ['sedan', 'sedan', 'suv', 'taxi', 'sports', 'van'];
    const type = opts.type || pick(types);
    const color = opts.color ?? pick([0xbf4b3c, 0x3d6b8c, 0x4a7a52, 0xb0833e, 0x6b5b8a, 0xd0c3a8, 0x2f3438, 0x8c3d4a]);
    const car = createVehicle(type, color, { heading: 0 });
    const vehicle = {
      id: this.id++,
      kind: 'car',
      ...car,
      pos: new THREE.Vector3(start.x + rand(-5, 5), 0.02, start.z + rand(-5, 5)),
      path: route,
      pathIndex: 1,
      ai: true,
      police: false,
      vel: new THREE.Vector2(),
      steer: 0,
      throttle: 0,
      maxSpeed: car.maxSpeed,
      lastDamage: 0,
    };
    if (opts.heading !== undefined) vehicle.heading = opts.heading;
    if (!opts.noShadow) {
      // shadow already in car group
    }
    vehicle.group.userData.entity = vehicle;
    vehicle.group.userData.entity = vehicle;
    this.traffic.push(vehicle);
    this.scene.add(vehicle.group);
    this.syncCar(vehicle);
    return vehicle;
  }

  spawnCarAt(x, z, type = 'sedan', color = 0xbf4b3c, heading = 0) {
    const car = createVehicle(type, color, { heading, ai: false });
    const vehicle = {
      id: this.id++,
      kind: 'car',
      ...car,
      pos: new THREE.Vector3(x, this.world.groundHeightAt(x, z), z),
      path: null,
      pathIndex: 0,
      ai: false,
      police: type === 'police',
      vel: new THREE.Vector2(),
      steer: 0,
      throttle: 0,
      maxSpeed: car.maxSpeed,
    };
    vehicle.group.userData.entity = vehicle;
    vehicle.group.userData.entity = vehicle;
    this.traffic.push(vehicle);
    this.scene.add(vehicle.group);
    this.syncCar(vehicle);
    return vehicle;
  }

  spawnPoliceCar(x, z) {
    const car = this.spawnCarAt(x, z, 'police', 0x1d2f4f, 0);
    car.ai = true;
    car.police = true;
    car.chase = true;
    car.maxSpeed = 34;
    this.policeCars.push(car);
    return car;
  }

  syncCar(car) {
    const y = this.world.groundHeightAt(car.pos.x, car.pos.z);
    car.pos.y = y;
    car.group.position.set(car.pos.x, y, car.pos.z);
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) {
      w.rotation.y = 0;
    }
  }

  getNearestCar(pos, range = 5, exclude = null) {
    let best = null;
    let bestD = range;
    for (const car of this.traffic) {
      if (car.destroyed || car === exclude) continue;
      if (car.occupied) continue;
      const d = dist2(pos.x, pos.z, car.pos.x, car.pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  panic(x, z, radius = 30, source = 'gun') {
    this.panicTimer = 0.1;
    for (const ped of this.peds) {
      if (ped.dead || ped.police || ped.gang) continue;
      if (dist2(ped.pos.x, ped.pos.z, x, z) < radius) {
        ped.state = 'flee';
        ped.fleeTimer = rand(4, 8);
      }
    }
  }

  damagePed(ped, amount, source = 'player') {
    if (ped.dead) return false;
    ped.hp -= amount;
    if (ped.hp <= 0) {
      ped.dead = true;
      ped.deadTimer = 0;
      ped.hostile = false;
      ped.state = 'dead';
      ped.group.rotation.x = -Math.PI / 2.1;
      ped.group.position.y = this.world.groundHeightAt(ped.pos.x, ped.pos.z) + 0.3;
      this.particles.burst(new THREE.Vector3(ped.pos.x, 1, ped.pos.z), 0x9a1c1c, 14, 3, { life: 0.5, gravity: 12 });
      this.game.onPedKilled(ped, source);
      return true;
    }
    if (source === 'player') {
      ped.state = ped.gang || ped.police ? 'hostile' : 'flee';
      ped.fleeTimer = rand(3, 6);
      this.particles.burst(new THREE.Vector3(ped.pos.x, 1.2, ped.pos.z), 0x8f1d1d, 5, 2, { life: 0.35, gravity: 10 });
    }
    return false;
  }

  damageCar(car, amount, source = 'player') {
    if (car.destroyed) return;
    car.health -= amount;
    if (car.health <= 0) this.explodeCar(car, source);
  }

  explodeCar(car, source = 'player') {
    if (car.destroyed) return;
    car.destroyed = true;
    const p = new THREE.Vector3(car.pos.x, 0.8, car.pos.z);
    this.particles.burst(p, 0xffaa33, 45, 9, { life: 0.9, gravity: 5, up: 7 });
    this.particles.burst(p, 0x333333, 25, 4, { life: 1.5, gravity: -1, up: 3 });
    this.game.audio.explosion();
    this.game.shake(0.7);
    this.scene.remove(car.group);
    car.destroyed = true;
    car.ai = false;
    if (this.game.playerCar === car) this.game.onPlayerCarDestroyed();
    this.game.onCarExploded(car, source);
  }

  spawnPickup(type, x, z) {
    const colors = { health: 0x5dff8a, armor: 0x59bfff, cash: 0xffcf4d };
    const geo = type === 'cash'
      ? new THREE.BoxGeometry(0.7, 0.45, 0.9)
      : new THREE.OctahedronGeometry(0.42, 0);
    const mat = new THREE.MeshStandardMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 0.7, roughness: 0.4, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1.15;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 5, 18), new THREE.MeshBasicMaterial({ color: colors[type], transparent: true, opacity: 0.6, toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.24;
    const group = new THREE.Group();
    group.add(mesh, ring);
    const y = this.world.groundHeightAt(x, z);
    group.position.set(x, y, z);
    this.scene.add(group);
    const pickup = { type, x, z, group, mesh, active: true, timer: 0, amount: type === 'cash' ? rand(80, 160) : 45 };
    this.pickups.push(pickup);
    return pickup;
  }

  clearPolice() {
    for (const ped of this.peds) {
      if (ped.police && !ped.dead) this.removePed(ped, false);
    }
    for (const car of this.policeCars) {
      if (!car.destroyed && car !== this.game.playerCar) {
        this.scene.remove(car.group);
        car.destroyed = true;
        car.ai = false;
      }
    }
    this.policeCars = [];
    this.game.audio.stopSiren();
  }

  removePed(ped, effect = true) {
    if (ped.removed) return;
    ped.removed = true;
    if (effect) this.particles.burst(new THREE.Vector3(ped.pos.x, 1, ped.pos.z), 0x888888, 8, 2, { life: 0.4 });
    this.scene.remove(ped.group);
    ped.group.traverse((o) => {
      if (o.geometry && o.geometry !== GEO.torso && o.geometry !== GEO.head && o.geometry !== GEO.arm && o.geometry !== GEO.leg) {
        // shared geometries are kept, custom ones are usually small enough to let GC handle
      }
      if (o.material && o.material.dispose && o.material !== ped.human.materials?.shirtMat && o.material !== ped.human.materials?.pantsMat && o.material !== ped.human.materials?.skinMat) {
        // Materials are per-ped; disposing avoids leaks in long sessions.
        o.material.dispose?.();
      }
    });
  }

  despawnTraffic() {
    while (this.traffic.length > this.targetTraffic) {
      const idx = this.traffic.findIndex((c) => c.ai && c !== this.game.playerCar && !c.police);
      if (idx < 0) break;
      const car = this.traffic[idx];
      this.scene.remove(car.group);
      car.destroyed = true;
      this.traffic.splice(idx, 1);
    }
  }

  update(dt, game) {
    this.elapsed += dt;
    this.panicTimer = Math.max(0, this.panicTimer - dt);
    this.flashTimer += dt;
    if (this.traffic.length < this.targetTraffic) {
      this.trafficSpawnTimer -= dt;
      if (this.trafficSpawnTimer <= 0) {
        this.trafficSpawnTimer = 1.2;
        this.spawnTraffic();
      }
    } else if (this.traffic.length > this.targetTraffic + 2) {
      this.despawnTraffic();
    }

    const playerPos = game.player.position;
    const inCar = game.playerCar;

    for (const car of this.traffic) {
      if (car.destroyed) continue;
      if (car === game.playerCar) continue;
      if (car.ai) this.updateTrafficCar(car, dt, game);
      else {
        car.group.position.set(car.pos.x, this.world.groundHeightAt(car.pos.x, car.pos.z), car.pos.z);
        car.group.rotation.y = car.heading;
      }
      if (car.police) this.updatePoliceCar(car, dt, game);
    }

    for (const ped of this.peds) {
      if (ped.removed) continue;
      if (ped.dead) {
        ped.deadTimer += dt;
        if (ped.deadTimer > 22) {
          this.removePed(ped, false);
        }
        continue;
      }
      if (Math.abs(ped.pos.x - playerPos.x) > 340 || Math.abs(ped.pos.z - playerPos.z) > 340) continue;
      this.updatePed(ped, dt, game);
    }

    for (const pickup of this.pickups) {
      if (!pickup.active) {
        pickup.timer -= dt;
        if (pickup.timer <= 0) {
          pickup.active = true;
          pickup.group.visible = true;
        }
        continue;
      }
      pickup.mesh.rotation.y += dt * 1.8;
      pickup.group.position.y = this.world.groundHeightAt(pickup.x, pickup.z) + Math.sin(this.elapsed * 2 + pickup.x) * 0.08;
      if (dist2(pickup.x, pickup.z, playerPos.x, playerPos.z) < 2.1) {
        pickup.active = false;
        pickup.group.visible = false;
        pickup.timer = 45;
        if (pickup.type === 'cash') {
          if (pickup.amount > 0) {
            game.addMoney(Math.round(pickup.amount));
            game.ui.toast(`+$${Math.round(pickup.amount)}`, 'cash');
          }
        } else if (pickup.type === 'health') {
          game.addHealth(35);
        } else {
          game.addArmor(50);
        }
        game.audio.pickup();
      }
    }

    if (inCar && Math.abs(inCar.speed) > 4) {
      for (const ped of this.peds) {
        if (ped.dead || ped.removed) continue;
        if (dist2(ped.pos.x, ped.pos.z, inCar.pos.x, inCar.pos.z) < 1.7) {
          this.damagePed(ped, 120, 'car');
          game.audio.impact();
          game.shake(0.2);
        }
      }
    }

    if (game.wanted > 0) {
      this.ensurePolice(game.wanted, playerPos, dt);
      this.updateCops(dt, game);
    } else {
      if (this.policeCars.length || this.peds.some((p) => p.police && !p.dead)) this.clearPolice();
    }

    this.updatePoliceLights(dt);
    this.particles.update(dt);
    if (this.peds.some((p) => p.removed)) this.peds = this.peds.filter((p) => !p.removed);
    if (this.traffic.some((c) => c.destroyed && c !== game.playerCar)) {
      this.traffic = this.traffic.filter((c) => !c.destroyed || c === game.playerCar);
    }
  }

  updateTrafficCar(car, dt, game) {
    if (!car.path) return;
    const target = car.path[car.pathIndex % car.path.length];
    const dx = target.x - car.pos.x;
    const dz = target.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4) {
      car.pathIndex = (car.pathIndex + 1) % car.path.length;
    }
    const desired = Math.atan2(dx, dz);
    car.heading = lerpAngle(car.heading, desired, clamp(dt * 3.6, 0, 1));
    let targetSpeed = car.maxSpeed * 0.36;
    const playerCar = game.playerCar;
    if (playerCar) {
      const pd = dist2(car.pos.x, car.pos.z, playerCar.pos.x, playerCar.pos.z);
      if (pd < 8) targetSpeed *= 0.15;
    }
    car.speed = damp(car.speed, targetSpeed, 2.4, dt);
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    car.pos.y = this.world.groundHeightAt(car.pos.x, car.pos.z);
    if (this.world.resolveCircle(car.pos, 1.35)) car.speed *= 0.5;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
    car.steer = 0;
  }

  updatePoliceCar(car, dt, game) {
    const target = game.playerCar ? game.playerCar.pos : game.player.position;
    const dx = target.x - car.pos.x;
    const dz = target.z - car.pos.z;
    const d = Math.hypot(dx, dz);
    const desired = Math.atan2(dx, dz);
    car.heading = lerpAngle(car.heading, desired, clamp(dt * 3.2, 0, 1));
    let targetSpeed = d > 90 ? 22 : d > 14 ? 27 : 14;
    if (game.playerCar && d < 8) targetSpeed = 26;
    car.speed = damp(car.speed, targetSpeed, 2.2, dt);
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    car.pos.y = this.world.groundHeightAt(car.pos.x, car.pos.z);
    if (this.world.resolveCircle(car.pos, 1.35)) car.speed *= 0.55;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;

    if (game.playerCar && d < 3.9) {
      game.playerCar.vel.multiplyScalar(0.94);
      game.playerCar.health -= 16 * dt;
      car.health -= 8 * dt;
      game.shake(0.12);
      if (game.playerCar.health <= 0) this.explodeCar(game.playerCar, 'police');
      if (car.health <= 0) this.explodeCar(car, 'crash');
    }
    if (!game.playerCar && d < 10 && game.wanted >= 2) {
      // cops get out and pressure the player on foot
      this.lastCopSpawn -= dt;
      if (this.lastCopSpawn <= 0) {
        this.lastCopSpawn = 4;
        const cop = this.spawnCop(car.pos.x + rand(-3, 3), car.pos.z + rand(3, 7));
        cop.shootTimer = 0.7;
      }
    }
  }

  ensurePolice(wanted, playerPos, dt) {
    const desiredCars = wanted >= 4 ? 3 : wanted >= 2 ? 2 : 1;
    this.policeCars = this.policeCars.filter((c) => !c.destroyed);
    if (this.policeCars.length < desiredCars) {
      const angle = Math.random() * Math.PI * 2;
      const px = clamp(playerPos.x + Math.cos(angle) * rand(80, 120), -240, 300);
      const pz = clamp(playerPos.z + Math.sin(angle) * rand(80, 120), -240, 240);
      const rp = this.world.nearestRoadPoint(px, pz);
      const car = this.spawnPoliceCar(rp.x, rp.z);
      car.heading = Math.atan2(playerPos.x - rp.x, playerPos.z - rp.z);
      this.game.audio.startSiren();
      this.game.ui.toast('الشرطة في الطريق!', 'police');
    } else {
      this.game.audio.startSiren();
    }
    if (wanted >= 2) {
      const cops = this.peds.filter((p) => p.police && !p.dead && !p.removed).length;
      const maxCops = Math.min(5, wanted + 1);
      if (cops < maxCops) {
        this.lastCopSpawn -= dt;
        if (this.lastCopSpawn <= 0) {
          this.lastCopSpawn = 6;
          const angle = Math.random() * Math.PI * 2;
          const px = clamp(playerPos.x + Math.cos(angle) * rand(24, 38), -280, 300);
          const pz = clamp(playerPos.z + Math.sin(angle) * rand(24, 38), -280, 300);
          this.spawnCop(px, pz);
        }
      }
    }
  }

  updateCops(dt, game) {
    for (const ped of this.peds) {
      if (!ped.police || ped.dead || ped.removed) continue;
      const target = game.playerCar ? game.playerCar.pos : game.player.position;
      const d = dist2(ped.pos.x, ped.pos.z, target.x, target.z);
      if (d > 16) {
        const dx = target.x - ped.pos.x;
        const dz = target.z - ped.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        ped.pos.x += (dx / len) * 3.2 * dt;
        ped.pos.z += (dz / len) * 3.2 * dt;
        ped.group.rotation.y = Math.atan2(dx, dz);
        ped.walkPhase += dt * 9;
      }
      ped.aimTimer = (ped.aimTimer || 0) + dt;
    }
  }

  updatePoliceLights(dt) {
    this.flashTimer += dt;
    const flash = Math.sin(this.flashTimer * 9) > 0;
    for (const car of this.policeCars) {
      if (!car.lights || car.destroyed) continue;
      car.lights.redMat.color.setHex(flash ? 0xff2438 : 0x4a1018);
      car.lights.blueMat.color.setHex(flash ? 0x2f6bff : 0x101d4a);
    }
  }

  updatePed(ped, dt, game) {
    const human = ped.human;
    const target = game.playerCar ? game.playerCar.pos : game.player.position;
    const d = dist2(ped.pos.x, ped.pos.z, target.x, target.z);
    if (ped.state === 'hostile') {
      const dx = target.x - ped.pos.x;
      const dz = target.z - ped.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      const aimYaw = Math.atan2(dx, dz);
      const health = game.player.health;
      if (d > 15) {
        ped.pos.x += (dx / len) * ped.speed * dt;
        ped.pos.z += (dz / len) * ped.speed * dt;
        human.group.rotation.y = aimYaw;
        animateHuman(human, dt, ped.speed, this.elapsed, { running: true });
      } else {
        human.group.rotation.y = lerpAngle(human.group.rotation.y, aimYaw, clamp(dt * 5, 0, 1));
        animateHuman(human, dt, 0, this.elapsed, { aiming: ped.police || ped.gang });
      }
      ped.shootTimer -= dt;
      if (ped.shootTimer <= 0 && d < 34 && health > 0 && !game.playerCarIsDead) {
        ped.shootTimer = ped.police ? rand(0.85, 1.5) : rand(1.1, 1.9);
        const muzzle = new THREE.Vector3(ped.pos.x, 1.4, ped.pos.z);
        const aim = target.clone();
        aim.y += 1.1;
        game.addTracer(muzzle, aim, ped.police ? 0xff6644 : 0xffaa55);
        game.audio.gun('pistol');
        const hitChance = ped.police ? 0.72 : 0.55;
        if (Math.random() < hitChance) {
          game.damagePlayer(ped.police ? 7 : 8, ped.police ? 'police' : 'gang');
        }
        this.particles.spawn(muzzle, new THREE.Vector3(0, 1, 0), 0xffcc66, 0.15, 0);
      }
      ped.pos.y = this.world.groundHeightAt(ped.pos.x, ped.pos.z);
      if (this.world.resolveCircle(ped.pos, 0.4)) {
        ped.pos.x += rand(-0.2, 0.2);
        ped.pos.z += rand(-0.2, 0.2);
      }
      human.group.position.copy(ped.pos);
      return;
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      const len = d || 1;
      const dx = (ped.pos.x - target.x) / len;
      const dz = (ped.pos.z - target.z) / len;
      ped.pos.x += dx * 5.2 * dt;
      ped.pos.z += dz * 5.2 * dt;
      human.group.rotation.y = Math.atan2(dx, dz);
      animateHuman(human, dt, 5, this.elapsed, { running: true });
      if (this.world.resolveCircle(ped.pos, 0.4)) {
        ped.pos.x += dz * 0.4;
        ped.pos.z -= dx * 0.4;
      }
      ped.pos.y = this.world.groundHeightAt(ped.pos.x, ped.pos.z);
      human.group.position.copy(ped.pos);
      if (ped.fleeTimer <= 0) ped.state = 'walk';
      return;
    }
    if (this.riot && !ped.police && Math.random() < 0.002) {
      ped.state = 'flee';
      ped.fleeTimer = rand(2, 5);
    }
    const path = ped.path;
    if (!path) {
      animateHuman(human, dt, 0, this.elapsed);
      return;
    }
    const wp = path[ped.pathIndex % path.length];
    const dx = wp.x - ped.pos.x;
    const dz = wp.z - ped.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2) {
      ped.pathIndex = (ped.pathIndex + 1) % path.length;
    }
    const desired = Math.atan2(dx, dz);
    human.group.rotation.y = lerpAngle(human.group.rotation.y, desired, clamp(dt * 2.4, 0, 1));
    ped.pos.x += Math.sin(human.group.rotation.y) * ped.speed * dt;
    ped.pos.z += Math.cos(human.group.rotation.y) * ped.speed * dt;
    ped.pos.y = this.world.groundHeightAt(ped.pos.x, ped.pos.z);
    if (this.world.resolveCircle(ped.pos, 0.4)) {
      ped.pos.x += Math.cos(human.group.rotation.y) * 0.5;
      ped.pos.z -= Math.sin(human.group.rotation.y) * 0.5;
      ped.pathIndex = (ped.pathIndex + 1) % path.length;
    }
    human.group.position.copy(ped.pos);
    animateHuman(human, dt, ped.speed, this.elapsed);
  }
}
