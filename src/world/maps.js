import * as THREE from 'three'
import { createSky, createLighting, SKIES } from './sky.js'
import {
  MAT, stucco, stone, createPalm, createShrub, createTree, createBuilding, createMosque,
  createMinaret, createSandbagWall, createHesco, createBarrel, createCrate, createCar,
  createStall, createStreetLamp, createPowerLines, createArchGate, createFlag, createRubble,
  createWaterTank, createReedHut, createBoat, createOilDerrick, createMountain,
  createCitadelWall, createCitadelTower, createDustMotes, createSmokePlume, createBird
} from './props.js'

export const MAP_DATA = {
  baghdad: {
    name: 'بغداد',
    en: 'BAGHDAD',
    district: 'شارع الرشيد',
    tag: 'مدينة قديمة',
    time: 'الغروب',
    threat: 'متوسط',
    desc: 'تأمين شارع الرشيد وصد الهجمات قرب سوق المدينة القديمة. ضيّق الأزقة، ظلال النخيل، وقبة ذهبية تراقب المعركة.',
    accent: '#e0a75a',
    gradient: 'linear-gradient(135deg, #6b4a2c 0%, #c88743 52%, #2f3d3b 100%)'
  },
  basra: {
    name: 'البصرة',
    en: 'BASRA',
    district: 'أهوار الجنوب',
    tag: 'أهوار ومياه',
    time: 'المغرب',
    threat: 'عالي',
    desc: 'قتال بين بيوت القصب والمياه راكدة عند مغيب الشمس. مساحات مفتوحة وقناصة على الأفق، فانتبه لكل ظل.',
    accent: '#e7835b',
    gradient: 'linear-gradient(135deg, #253149 0%, #c56f4d 55%, #36554c 100%)'
  },
  erbil: {
    name: 'أربيل',
    en: 'ERBIL',
    district: 'القلعة',
    tag: 'قلعة جبلية',
    time: 'العصر',
    threat: 'منخفض',
    desc: 'دافع عن ساحة القلعة القديمة وسط الجبال. جدران حجرية وأسواق عريقة تمنحك غطاءً قوياً ومداخل ضيقة.',
    accent: '#b8c98b',
    gradient: 'linear-gradient(135deg, #2e3a3f 0%, #8d9470 55%, #b59c74 100%)'
  }
}

const mapQuality = { shadow: true, detail: true }

function setQuality(q) {
  mapQuality.shadow = q !== 'low'
  mapQuality.detail = q !== 'low'
}

function flat(geo, y = 0) {
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, y, 0)
  return geo
}

function groundPlane(size, material, y = 0) {
  const mesh = new THREE.Mesh(flat(new THREE.PlaneGeometry(size, size, 1, 1)), material)
  mesh.receiveShadow = true
  mesh.position.y = y
  return mesh
}

function collider(x, z, w, d, h = 3) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height: h }
}

function addStaticBuilding(ctx, opts) {
  const { x, z, w, d, h, side, color, shop, balcony, ruin, sign, roof } = opts
  const rot = side === 'left' ? Math.PI / 2 : side === 'right' ? -Math.PI / 2 : 0
  const building = createBuilding({ w, d, h, color, shop, balcony, ruin, sign, rooftop: roof !== false, floors: Math.max(1, Math.floor((h - 2.8) / 3.1)) })
  building.position.set(x, 0, z)
  building.rotation.y = rot
  ctx.group.add(building)
  const cw = rot === 0 ? w : d
  const cd = rot === 0 ? d : w
  ctx.colliders.push(collider(x, z, cw, cd, h))
  return building
}

function addProp(ctx, mesh, x, z, rot = 0, c = null) {
  mesh.position.set(x, 0, z)
  mesh.rotation.y = rot
  ctx.group.add(mesh)
  if (c) ctx.colliders.push(collider(x, z, c.w, c.d, c.h))
  return mesh
}

function addDust(ctx, count = 200, spread = 60, height = 12) {
  const dust = createDustMotes(count, spread)
  dust.position.y = 0
  ctx.group.add(dust)
  ctx.anim.dust = dust
  return dust
}

function addBirds(ctx, count = 4) {
  const flock = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const bird = createBird()
    bird.scale.setScalar(1.6)
    bird.userData.offset = Math.random() * Math.PI * 2
    bird.userData.radius = 18 + Math.random() * 18
    bird.userData.height = 20 + Math.random() * 10
    bird.userData.speed = 0.05 + Math.random() * 0.04
    flock.add(bird)
  }
  ctx.group.add(flock)
  ctx.anim.birds = flock
}

function addSmoke(ctx, x, y, z, color, scale = 1) {
  const smoke = createSmokePlume(ctx.scene, new THREE.Vector3(x, y, z), color)
  smoke.scale.setScalar(scale)
  smoke.userData.baseScale = scale
  ctx.anim.smoke.push(smoke)
  return smoke
}

function addFire(ctx, x, y, z, intensity = 1) {
  const light = new THREE.PointLight(0xff8a3a, intensity * 8, 14, 2)
  light.position.set(x, y + 0.7, z)
  ctx.group.add(light)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: MAT.flash.map, color: 0xffa54a, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8
  }))
  sprite.position.set(x, y + 0.65, z)
  sprite.scale.setScalar(1.4)
  ctx.group.add(sprite)
  ctx.anim.fire.push({ light, sprite, phase: Math.random() * 10, intensity })
}

function finalize(ctx, key, extra = {}) {
  const data = MAP_DATA[key]
  const world = {
    key,
    scene: ctx.scene,
    group: ctx.group,
    colliders: ctx.colliders,
    spawnPoints: ctx.spawns,
    playerStart: ctx.playerStart,
    bounds: ctx.bounds,
    skyConfig: SKIES[key],
    data,
    anim: ctx.anim,
    ambient: ctx.ambient,
    updaters: ctx.updaters,
    ...extra
  }
  return world
}

function baseScene(key, quality) {
  setQuality(quality)
  const config = SKIES[key]
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(config.fog, config.fogDensity)
  createSky(scene, config)
  const lights = createLighting(scene, config)
  if (quality === 'medium') {
    lights.sun.shadow.mapSize.set(1024, 1024)
  } else if (quality === 'low') {
    lights.sun.shadow.mapSize.set(1024, 1024)
    lights.sun.castShadow = false
  }
  const group = new THREE.Group()
  scene.add(group)
  const ctx = {
    scene, group,
    colliders: [],
    spawns: [],
    anim: { palms: [], flags: [], smoke: [], birds: null, fire: [], dust: null },
    updaters: [],
    playerStart: { x: 0, z: 0, yaw: 0 },
    bounds: { minX: -40, maxX: 40, minZ: -70, maxZ: 35 },
    ambient: config
  }
  return { scene, group, lights, ctx, config }
}

function animateCommon(ctx, t, dt) {
  ctx.anim.palms.forEach((p) => {
    const crown = p.userData.crown
    if (crown) {
      crown.rotation.z = Math.sin(t * 0.8 + crown.userData.phase) * 0.035
      crown.rotation.x = Math.cos(t * 0.62 + crown.userData.phase) * 0.025
    }
  })
  ctx.anim.flags.forEach((flag) => {
    if (flag.userData.flag) flag.userData.flag.rotation.y = Math.sin(t * 1.6 + flag.position.x) * 0.12
  })
  ctx.anim.smoke.forEach((s) => {
    s.position.y += dt * 0.45
    s.material.opacity = 0.24 + Math.sin(t * 0.7 + s.userData.phase) * 0.06
    const base = s.userData.baseScale || 1
    s.scale.setScalar(base * (1 + ((t * 0.05 + s.userData.phase) % 1) * 0.7))
    if (s.position.y > 34) s.position.y -= 22
  })
  ctx.anim.fire.forEach((f) => {
    const flicker = 0.72 + Math.sin(t * 17 + f.phase) * 0.18 + Math.sin(t * 31 + f.phase) * 0.1
    f.light.intensity = f.intensity * 8 * flicker
    f.sprite.material.opacity = 0.55 + flicker * 0.35
    f.sprite.scale.setScalar(1.2 + flicker * 0.5)
  })
  if (ctx.anim.dust) {
    const pos = ctx.anim.dust.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) + dt * 0.35
      let y = pos.getY(i) + Math.sin(t * 0.4 + i) * dt * 0.06
      if (x > 30) x = -30
      if (y > 14) y = 0.4
      pos.setX(i, x)
      pos.setY(i, y)
    }
    pos.needsUpdate = true
  }
  if (ctx.anim.birds) {
    ctx.anim.birds.children.forEach((b) => {
      const u = b.userData
      const a = t * u.speed + u.offset
      b.position.set(Math.cos(a) * u.radius, u.height + Math.sin(a * 2.3) * 1.6, Math.sin(a) * u.radius - 10)
      b.rotation.y = -a + Math.PI / 2
      const flap = Math.sin(t * 6 + u.offset) * 0.4
      if (b.userData.l) {
        b.userData.l.rotation.z = flap
        b.userData.r.rotation.z = -flap
      }
    })
  }
  ctx.updaters.forEach((fn) => fn(t, dt))
}

// ---------------------------------------------------------------- BAGHDAD

function buildBaghdad(quality) {
  const { scene, group, lights, ctx } = baseScene('baghdad', quality)
  ctx.playerStart = { x: 0, z: 27, yaw: 0 }
  ctx.bounds = { minX: -31, maxX: 31, minZ: -69, maxZ: 33 }

  group.add(groundPlane(220, MAT.sand))
  const road = new THREE.Mesh(flat(new THREE.PlaneGeometry(12, 118)), MAT.asphalt)
  road.position.set(0, 0.015, -19)
  road.receiveShadow = true
  group.add(road)

  const sidewalkMat = new THREE.MeshStandardMaterial({ map: MAT.sand.map, color: 0xcab08a, roughness: 1 })
  for (const s of [-1, 1]) {
    const walk = new THREE.Mesh(flat(new THREE.PlaneGeometry(3.2, 118)), sidewalkMat)
    walk.position.set(s * 7.7, 0.045, -19)
    walk.receiveShadow = true
    group.add(walk)
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 118), stone(0xbba988))
    curb.position.set(s * 6.1, 0.08, -19)
    curb.receiveShadow = true
    curb.castShadow = true
    group.add(curb)
  }

  for (let i = 0; i < 12; i++) {
    const dash = new THREE.Mesh(flat(new THREE.PlaneGeometry(0.18, 2.4)), stucco(0xd8c9a2, 1))
    dash.position.set(0, 0.028, 24 - i * 8.5)
    dash.material.transparent = true
    dash.material.opacity = 0.35
    group.add(dash)
  }

  const left = [
    { z: 24, w: 9, d: 10, h: 8.5, c: 0xd7bd92, shop: true, sign: 'مقهى الرشيد' },
    { z: 12, w: 8, d: 12, h: 11, c: 0xc7a97c, balcony: true },
    { z: -1, w: 10, d: 11, h: 7.5, c: 0xd2b98e, shop: true, sign: 'بقالة النخيل' },
    { z: -14, w: 9, d: 12, h: 12.5, c: 0xbfa477, balcony: true },
    { z: -28, w: 10, d: 10, h: 9, c: 0xd9c197, shop: true, sign: 'عطارة الزهور' },
    { z: -42, w: 8, d: 12, h: 13, c: 0xc8aa7c, ruin: false },
    { z: -55, w: 10, d: 10, h: 7.5, c: 0xd0b58a, ruin: true }
  ]
  const right = [
    { z: 26, w: 9, d: 11, h: 9.5, c: 0xcbae80, shop: true, sign: 'مطعم دجلة' },
    { z: 13, w: 10, d: 12, h: 7, c: 0xd8bf95, ruin: true },
    { z: 0, w: 8, d: 11, h: 12, c: 0xc2a578, balcony: true },
    { z: -13, w: 10, d: 13, h: 8.5, c: 0xd5ba8e, shop: true, sign: 'سوق بغداد' },
    { z: -27, w: 8, d: 11, h: 11.5, c: 0xbea274 },
    { z: -40, w: 10, d: 12, h: 8, c: 0xd3b98d, shop: true, sign: 'خياط الرافدين' },
    { z: -54, w: 9, d: 11, h: 10.5, c: 0xc9ac80 }
  ]
  left.forEach((b) => addStaticBuilding(ctx, { ...b, x: -13.8, side: 'left', color: b.c }))
  right.forEach((b) => addStaticBuilding(ctx, { ...b, x: 13.8, side: 'right', color: b.c }))

  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = 20 - i * 23 - (s > 0 ? 8 : 0)
      addStaticBuilding(ctx, {
        x: s * 25, z, w: 10, d: 14, h: 14 + (i % 2) * 5,
        side: s < 0 ? 'left' : 'right', color: 0xb89c70, balcony: false, rooftop: false
      })
    }
  }

  const mosque = createMosque({ scale: 1.15 })
  mosque.position.set(-3, 0, -64)
  group.add(mosque)
  ctx.colliders.push(collider(-3, -64, 21, 17, 15))

  const gate = createArchGate({ width: 13, height: 7.4, depth: 1.2 })
  gate.position.set(0, 0, 4)
  group.add(gate)
  ctx.colliders.push(collider(-5.4, 4, 2.6, 1.6, 8))
  ctx.colliders.push(collider(5.4, 4, 2.6, 1.6, 8))

  for (let i = 0; i < 7; i++) {
    const palm = createPalm({ height: 6.5 + Math.random() * 3.2, bend: 0.5 + Math.random() * 0.8, phase: i })
    const side = i % 2 ? 1 : -1
    palm.position.set(side * (8.6 + Math.random() * 1.2), 0, 21 - i * 10.5)
    group.add(palm)
    ctx.anim.palms.push(palm)
  }

  for (let i = 0; i < 4; i++) {
    const palm = createPalm({ height: 6 + Math.random() * 2, phase: 10 + i })
    palm.position.set(-20 + Math.random() * 6, 0, -58 + Math.random() * 12)
    group.add(palm)
    ctx.anim.palms.push(palm)
  }

  addProp(ctx, createSandbagWall({ length: 5.4, rows: 3 }), 4.1, 21, Math.PI / 2, { w: 1.2, d: 5.4, h: 1.3 })
  addProp(ctx, createHesco({ w: 2.2, h: 1.4, d: 1.1 }), -4.6, 19.5, 0, { w: 2.2, d: 1.1, h: 1.4 })
  addProp(ctx, createHesco({ w: 2.2, h: 1.4, d: 1.1 }), -6.9, 19.5, 0, { w: 2.2, d: 1.1, h: 1.4 })

  addProp(ctx, createCar({ color: 0x8c9a98 }), -4.9, 10, 0.04, { w: 2, d: 4.2, h: 1.5 })
  addProp(ctx, createCar({ color: 0x9c7b52, destroyed: true }), 4.9, -19, -0.08, { w: 2, d: 4.2, h: 1.5 })
  addProp(ctx, createCar({ color: 0xa6a8a0 }), -4.7, -36, 0.02, { w: 2, d: 4.2, h: 1.5 })

  addProp(ctx, createStall(), 8.7, 16, -0.25, { w: 2.8, d: 1.8, h: 2.2 })
  addProp(ctx, createStall(), -8.8, -7, 0.35, { w: 2.8, d: 1.8, h: 2.2 })
  addProp(ctx, createStall(), 8.7, -31, 0.2, { w: 2.8, d: 1.8, h: 2.2 })

  for (const [x, z] of [[-8.3, -24], [8.4, -42], [-8.4, 2], [8.5, 6]]) {
    addProp(ctx, createBarrel(), x, z, 0, { w: 0.8, d: 0.8, h: 1 })
  }
  for (const [x, z, s] of [[-9.2, -2, 0.9], [9.2, 22, 0.75], [9.1, -50, 0.9], [-9, -46, 0.8]]) {
    addProp(ctx, createCrate({ size: s, rot: Math.random() }), x, z, 0, { w: s, d: s, h: s })
  }

  for (let i = 0; i < 5; i++) {
    const z = 28 - i * 22
    addProp(ctx, createStreetLamp(), -7.2, z, Math.PI, null)
    addProp(ctx, createStreetLamp(), 7.2, z - 11, 0, null)
  }

  const poles = []
  for (let i = 0; i < 7; i++) poles.push({ x: 6.9, z: 30 - i * 14 })
  group.add(createPowerLines(poles, 8.2))

  const banner = createFlag({ text: 'الرافدين', scale: 0.85 })
  banner.position.set(-6.7, 0, 22)
  group.add(banner)
  ctx.anim.flags.push(banner)

  addProp(ctx, createRubble(10), -9.6, -13, 0, null)
  addProp(ctx, createRubble(8), 9.7, -44, 0, null)
  addProp(ctx, createRubble(6), 8.9, 3, 0, null)

  for (let i = 0; i < 3; i++) {
    const t = createTree(0.8 + Math.random() * 0.3)
    t.position.set(9.4, 0, -24 + i * 6)
    group.add(t)
  }
  for (let i = 0; i < 5; i++) {
    const s = createShrub(0.7 + Math.random() * 0.5)
    s.position.set((Math.random() > 0.5 ? 1 : -1) * (9 + Math.random() * 3), 0, 18 - Math.random() * 52)
    group.add(s)
  }

  for (let i = 0; i < 10; i++) {
    const far = new THREE.Mesh(new THREE.BoxGeometry(7 + Math.random() * 9, 8 + Math.random() * 18, 8 + Math.random() * 8), stucco(0x9f8a6c))
    far.position.set(-55 + i * 12, (8 + Math.random() * 14) / 2, -92 - Math.random() * 20)
    far.castShadow = false
    far.receiveShadow = false
    group.add(far)
  }

  addSmoke(ctx, -34, 5, -50, 0x8c8475, 1.1)
  addSmoke(ctx, 35, 7, -62, 0x9b9280, 1.4)
  addDust(ctx, 260, 70)
  addBirds(ctx, 5)

  ctx.spawns = [
    { x: -3.5, z: -46 }, { x: 3, z: -38 }, { x: 0, z: -56 }, { x: -4.5, z: -24 },
    { x: 5.2, z: -12 }, { x: -9.6, z: 8 }, { x: 9.4, z: 12 }, { x: 0, z: -60 }
  ]

  return finalize(ctx, 'baghdad', {
    lights,
    update(t, dt) { animateCommon(ctx, t, dt) }
  })
}

// ---------------------------------------------------------------- BASRA

function buildBasra(quality) {
  const { scene, group, lights, ctx } = baseScene('basra', quality)
  ctx.playerStart = { x: 0, z: 26, yaw: 0 }
  ctx.bounds = { minX: -52, maxX: 52, minZ: -58, maxZ: 48 }

  const water = new THREE.Mesh(flat(new THREE.PlaneGeometry(340, 340)), MAT.water)
  water.position.y = -0.32
  water.receiveShadow = false
  group.add(water)
  ctx.updaters.push((t) => {
    water.material.map.offset.set(t * 0.0035, t * 0.0022)
    water.material.opacity = 0.85 + Math.sin(t * 0.4) * 0.03
  })

  const island = new THREE.Mesh(flat(new THREE.CircleGeometry(68, 48)), MAT.dirt)
  island.position.y = 0
  island.receiveShadow = true
  group.add(island)

  const pathMat = new THREE.MeshStandardMaterial({ map: MAT.dirt.map, color: 0xb69a6f, roughness: 1 })
  const path = new THREE.Mesh(flat(new THREE.PlaneGeometry(9, 95)), pathMat)
  path.position.set(0, 0.02, -14)
  path.receiveShadow = true
  group.add(path)

  for (let i = 0; i < 3; i++) {
    const hut = createReedHut()
    const positions = [[-15, -2], [12, -17], [19, 9]]
    hut.position.set(positions[i][0], 0, positions[i][1])
    hut.rotation.y = i * 0.7
    group.add(hut)
    ctx.colliders.push(collider(positions[i][0], positions[i][1], 4.4, 4.4, 4))
  }

  for (const [x, z, w, d, h, c] of [
    [-27, -20, 12, 10, 5.5, 0xc0a171],
    [28, -27, 14, 11, 6.5, 0xb99a6a],
    [-31, 20, 10, 9, 5, 0xc6a97a],
    [30, 24, 11, 10, 5.5, 0xbea071]
  ]) {
    addStaticBuilding(ctx, { x, z, w, d, h, side: x < 0 ? 'left' : 'right', color: c, shop: false, balcony: false, rooftop: true })
  }

  addProp(ctx, createSandbagWall({ length: 5, rows: 3 }), -4.2, 18, Math.PI / 2, { w: 1.2, d: 5, h: 1.3 })
  addProp(ctx, createSandbagWall({ length: 4, rows: 2 }), 4.5, 12, 0.2, { w: 4, d: 1.2, h: 1 })
  addProp(ctx, createHesco({ w: 2.4, h: 1.5, d: 1.2 }), 2.6, 19.6, 0.1, { w: 2.4, d: 1.2, h: 1.5 })
  addProp(ctx, createHesco({ w: 2.4, h: 1.5, d: 1.2 }), 5.2, 20.6, -0.1, { w: 2.4, d: 1.2, h: 1.5 })

  addProp(ctx, createStall(), -10.5, 13, 0.4, { w: 2.8, d: 1.8, h: 2.2 })
  addProp(ctx, createStall(), 10.8, 2, -0.3, { w: 2.8, d: 1.8, h: 2.2 })
  addProp(ctx, createStall(), -9, -21, 0.15, { w: 2.8, d: 1.8, h: 2.2 })

  addProp(ctx, createCar({ color: 0x877b66, destroyed: true }), -6.6, -9, 0.1, { w: 2, d: 4.2, h: 1.5 })
  addProp(ctx, createCar({ color: 0x9c8f74 }), 7.2, -33, -0.05, { w: 2, d: 4.2, h: 1.5 })

  for (const [x, z] of [[-8.5, 6], [8.6, -6], [-11, -16], [12, 18]]) {
    addProp(ctx, createBarrel(), x, z, 0, { w: 0.8, d: 0.8, h: 1 })
  }
  for (const [x, z, s] of [[-7.8, 21, 0.9], [7.9, 14, 0.8], [-12, 1, 0.9]]) {
    addProp(ctx, createCrate({ size: s, rot: Math.random() }), x, z, 0, { w: s, d: s, h: s })
  }

  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + 0.3
    const dist = 55 + Math.random() * 10
    const palm = createPalm({ height: 6 + Math.random() * 4, bend: 0.7, scale: 0.85, phase: i })
    palm.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
    group.add(palm)
    ctx.anim.palms.push(palm)
  }
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1
    const palm = createPalm({ height: 7 + Math.random() * 3.5, bend: 0.6 + Math.random() * 0.7, phase: 20 + i })
    palm.position.set(side * (12 + Math.random() * 8), 0, 16 - i * 7)
    group.add(palm)
    ctx.anim.palms.push(palm)
  }

  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 52 + Math.random() * 14
    const shrub = createShrub(1 + Math.random())
    shrub.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
    group.add(shrub)
  }

  const derrick = createOilDerrick({ height: 17 })
  derrick.position.set(-41, 0, -31)
  derrick.rotation.y = 0.4
  group.add(derrick)
  ctx.colliders.push(collider(-41, -31, 6, 6, 17))
  addSmoke(ctx, -41, 18, -31, 0x4e4a42, 1.6)
  addFire(ctx, -41, 0.6, -31, 0.7)

  for (let i = 0; i < 3; i++) {
    const boat = createBoat()
    boat.position.set(54 + i * 4, -0.28, -14 + i * 13)
    boat.rotation.y = Math.PI * 0.65 + i * 0.4
    group.add(boat)
  }

  const pier = new THREE.Group()
  for (let i = 0; i < 7; i++) {
    pier.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 3.4), MAT.darkWood))
  }
  for (let i = 0; i < 7; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 3.4), MAT.darkWood)
    plank.position.set(0, 0.1, 0)
    plank.rotation.y = Math.PI / 2
    plank.position.x = -62 + i * 0.42
    pier.add(plank)
  }
  pier.position.set(56, 0.1, 26)
  group.add(pier)

  const poles = []
  for (let i = 0; i < 5; i++) poles.push({ x: 9.2, z: 28 - i * 16 })
  group.add(createPowerLines(poles, 7.6))

  const banner = createFlag({ text: 'أهوار البصرة', scale: 0.9 })
  banner.position.set(6.4, 0, 21)
  group.add(banner)
  ctx.anim.flags.push(banner)

  addProp(ctx, createRubble(7), 14.8, 4, 0, null)
  addProp(ctx, createRubble(9), -16.4, -10, 0, null)

  for (let i = 0; i < 8; i++) {
    const far = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 8, 4 + Math.random() * 7, 8 + Math.random() * 8), stucco(0x8a7a5e))
    far.position.set(-70 + i * 20, 3, -105 - Math.random() * 30)
    group.add(far)
  }

  addDust(ctx, 220, 80)
  addBirds(ctx, 6)

  ctx.spawns = [
    { x: -16, z: -23 }, { x: 14, z: -34 }, { x: 0, z: -43 }, { x: -24, z: 6 },
    { x: 24, z: 11 }, { x: 15, z: -6 }, { x: -11, z: -39 }, { x: 30, z: -18 }
  ]

  return finalize(ctx, 'basra', {
    lights,
    update(t, dt) { animateCommon(ctx, t, dt) }
  })
}

// ---------------------------------------------------------------- ERBIL

function buildErbil(quality) {
  const { scene, group, lights, ctx } = baseScene('erbil', quality)
  ctx.playerStart = { x: 0, z: 30, yaw: 0 }
  ctx.bounds = { minX: -46, maxX: 46, minZ: -52, maxZ: 46 }

  group.add(groundPlane(200, MAT.dirt))

  const plazaMat = new THREE.MeshStandardMaterial({ map: stone().map, color: 0xc6b898, roughness: 1 })
  const plaza = new THREE.Mesh(flat(new THREE.PlaneGeometry(54, 80)), plazaMat)
  plaza.position.set(0, 0.02, -12)
  plaza.receiveShadow = true
  group.add(plaza)

  const marketMat = new THREE.MeshStandardMaterial({ map: MAT.asphalt.map, color: 0x8d7d64, roughness: 1 })
  const road = new THREE.Mesh(flat(new THREE.PlaneGeometry(10, 80)), marketMat)
  road.position.set(0, 0.03, 4)
  road.receiveShadow = true
  group.add(road)

  for (const [x, z, w, d, h, c, shop, sign] of [
    [-14, 29, 10, 12, 6.5, 0xc7b18a, true, 'مقهى القلعة'],
    [15, 27, 11, 12, 7, 0xbda67f, true, 'بازار أربيل'],
    [-17, 13, 10, 11, 8, 0xcdb995, false, null],
    [17, 12, 10, 12, 7.5, 0xc2ab84, true, 'عطارة كردستان'],
    [-18, -4, 12, 12, 9, 0xbda47b, false, null],
    [18, -5, 11, 12, 8.5, 0xcab48e, false, null],
    [-19, -21, 11, 12, 7, 0xc4ac85, true, 'خبز التنور'],
    [19, -22, 12, 12, 8, 0xb9a176, false, null]
  ]) {
    addStaticBuilding(ctx, { x, z, w, d, h, side: x < 0 ? 'left' : 'right', color: c, shop, sign, balcony: true })
  }

  const citadelHill = new THREE.Mesh(new THREE.CylinderGeometry(27, 34, 8, 28), stone(0xad9b7c))
  citadelHill.position.set(-2, 3.8, -55)
  citadelHill.receiveShadow = true
  citadelHill.castShadow = true
  group.add(citadelHill)

  const wall = createCitadelWall({ width: 34, height: 7, depth: 2.2 })
  wall.position.set(-2, 8, -52)
  group.add(wall)
  ctx.colliders.push(collider(-2, -52, 34, 2.4, 15))

  const towerL = createCitadelTower({ radius: 3.4, height: 13 })
  towerL.position.set(-19, 8, -52)
  group.add(towerL)
  ctx.colliders.push(collider(-19, -52, 7, 7, 21))
  const towerR = createCitadelTower({ radius: 3.2, height: 12 })
  towerR.position.set(15, 8, -52)
  group.add(towerR)
  ctx.colliders.push(collider(15, -52, 6.6, 6.6, 20))

  const gate = createArchGate({ width: 8, height: 6.6, depth: 1.8 })
  gate.position.set(-2, 8, -50.5)
  group.add(gate)
  ctx.colliders.push(collider(-2, -50.5, 8, 2, 15))

  const inner = createBuilding({ w: 16, d: 8, h: 7, color: 0xcab48c, balcony: false, rooftop: false })
  inner.position.set(-2, 8, -62)
  group.add(inner)

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const m = createMountain({
      radius: 20 + Math.random() * 18,
      height: 28 + Math.random() * 30,
      color: i % 2 ? 0x777a6f : 0x6d6a5f
    })
    m.position.set(Math.cos(a) * (115 + Math.random() * 50), 0, Math.sin(a) * (115 + Math.random() * 50) - 25)
    group.add(m)
  }

  for (let i = 0; i < 6; i++) {
    const tree = createTree(1 + Math.random() * 0.5)
    tree.position.set(-11 + (i % 3) * 10, 0, 3 - i * 8)
    group.add(tree)
  }
  for (let i = 0; i < 6; i++) {
    const shrub = createShrub(0.9 + Math.random() * 0.8)
    shrub.position.set((Math.random() > 0.5 ? 1 : -1) * (11 + Math.random() * 4), 0, 30 - Math.random() * 68)
    group.add(shrub)
  }

  addProp(ctx, createSandbagWall({ length: 5.4, rows: 3 }), -4.6, 22, Math.PI / 2, { w: 1.2, d: 5.4, h: 1.3 })
  addProp(ctx, createSandbagWall({ length: 4.5, rows: 2 }), 5, 16, 0, { w: 4.5, d: 1.2, h: 1 })
  addProp(ctx, createHesco({ w: 2.4, h: 1.5, d: 1.2 }), 4.2, 24, 0.12, { w: 2.4, d: 1.2, h: 1.5 })

  addProp(ctx, createStall(), -10, 8, 0.25, { w: 2.8, d: 1.8, h: 2.2 })
  addProp(ctx, createStall(), 10.5, -2, -0.2, { w: 2.8, d: 1.8, h: 2.2 })
  addProp(ctx, createStall(), -10.5, -30, 0.1, { w: 2.8, d: 1.8, h: 2.2 })

  addProp(ctx, createCar({ color: 0x8d8f86 }), -6.4, 12, 0.04, { w: 2, d: 4.2, h: 1.5 })
  addProp(ctx, createCar({ color: 0x9d8460, destroyed: true }), 6.5, -14, -0.12, { w: 2, d: 4.2, h: 1.5 })

  for (const [x, z] of [[-8, 18], [8.4, 8], [-8.6, -12], [8.8, -27]]) {
    addProp(ctx, createBarrel(), x, z, 0, { w: 0.8, d: 0.8, h: 1 })
  }
  for (const [x, z, s] of [[-8.3, 25, 0.9], [8.6, 20, 0.8], [8.2, -36, 0.95]]) {
    addProp(ctx, createCrate({ size: s, rot: Math.random() }), x, z, 0, { w: s, d: s, h: s })
  }

  for (let i = 0; i < 6; i++) {
    const lamp = createStreetLamp()
    lamp.position.set(-8.7, 0, 30 - i * 13)
    group.add(lamp)
  }

  const poles = []
  for (let i = 0; i < 5; i++) poles.push({ x: 8.8, z: 34 - i * 18 })
  group.add(createPowerLines(poles, 8))

  const banner = createFlag({ text: 'قلعة أربيل', scale: 0.95 })
  banner.position.set(-7.4, 0, 26)
  group.add(banner)
  ctx.anim.flags.push(banner)

  addProp(ctx, createRubble(9), 9, -8, 0, null)
  addProp(ctx, createRubble(7), -9, -40, 0, null)

  addSmoke(ctx, 26, 6, -85, 0x8b877a, 1.2)
  addDust(ctx, 180, 70)
  addBirds(ctx, 5)

  ctx.spawns = [
    { x: -8, z: -37 }, { x: 7, z: -34 }, { x: -18, z: -12 }, { x: 18, z: -8 },
    { x: 0, z: -43 }, { x: -24, z: 8 }, { x: 24, z: 9 }, { x: -10, z: 2 }
  ]

  return finalize(ctx, 'erbil', {
    lights,
    update(t, dt) { animateCommon(ctx, t, dt) }
  })
}

export function buildMap(key, quality = 'high') {
  if (key === 'basra') return buildBasra(quality)
  if (key === 'erbil') return buildErbil(quality)
  return buildBaghdad(quality)
}
