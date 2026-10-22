import * as THREE from 'three'
import {
  sandTexture, plasterTexture, brickTexture, asphaltTexture, dirtTexture, rugTexture,
  signTexture, posterTexture, metalTexture, woodTexture, waterTexture, graniteTexture,
  smokeTexture, flashTexture, holeTexture, dustTexture
} from '../core/textures.js'

const matCache = new Map()

function cached(key, make) {
  if (!matCache.has(key)) matCache.set(key, make())
  return matCache.get(key)
}

export function stucco(color = 0xd9c5a2, roughness = 0.95) {
  return cached('stucco' + color + roughness, () => new THREE.MeshStandardMaterial({
    map: plasterTexture(), color, roughness, metalness: 0
  }))
}

export function brick(color = 0xc09a6c) {
  return cached('brick' + color, () => new THREE.MeshStandardMaterial({
    map: brickTexture(), color, roughness: 1, metalness: 0
  }))
}

export function stone(color = 0xb0a184) {
  return cached('stone' + color, () => new THREE.MeshStandardMaterial({
    map: graniteTexture(), color, roughness: 0.95
  }))
}

export const MAT = {
  get sand() { return cached('sand', () => new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 })) },
  get dirt() { return cached('dirt', () => new THREE.MeshStandardMaterial({ map: dirtTexture(), roughness: 1 })) },
  get asphalt() { return cached('asphalt', () => new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.94 })) },
  get metal() { return cached('metal', () => new THREE.MeshStandardMaterial({ map: metalTexture(), color: 0x9c9c94, roughness: 0.58, metalness: 0.55 })) },
  get darkMetal() { return cached('darkMetal', () => new THREE.MeshStandardMaterial({ color: 0x2c2f2d, roughness: 0.45, metalness: 0.7 })) },
  get wood() { return cached('wood', () => new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.9 })) },
  get darkWood() { return cached('darkWood', () => new THREE.MeshStandardMaterial({ map: woodTexture(), color: 0x5a412a, roughness: 0.95 })) },
  get gold() { return cached('gold', () => new THREE.MeshStandardMaterial({ color: 0xc99a3f, roughness: 0.28, metalness: 0.85 })) },
  get goldDark() { return cached('goldDark', () => new THREE.MeshStandardMaterial({ color: 0x8c6a28, roughness: 0.4, metalness: 0.75 })) },
  get glass() { return cached('glass', () => new THREE.MeshStandardMaterial({ color: 0x1a2b30, roughness: 0.22, metalness: 0.55, emissive: 0x101a1e, emissiveIntensity: 0.6 })) },
  get black() { return cached('black', () => new THREE.MeshStandardMaterial({ color: 0x141311, roughness: 0.9 })) },
  get white() { return cached('white', () => new THREE.MeshStandardMaterial({ color: 0xd8d3c4, roughness: 0.85 })) },
  get concrete() { return cached('concrete', () => new THREE.MeshStandardMaterial({ map: plasterTexture(), color: 0x9a958a, roughness: 1 })) },
  get burlap() { return cached('burlap', () => new THREE.MeshStandardMaterial({ color: 0xb39a6c, roughness: 1 })) },
  get fabricRed() { return cached('fabricRed', () => new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 0.98, side: THREE.DoubleSide })) },
  get fabricGreen() { return cached('fabricGreen', () => new THREE.MeshStandardMaterial({ color: 0x2f5a44, roughness: 0.95, side: THREE.DoubleSide })) },
  get fabricBlue() { return cached('fabricBlue', () => new THREE.MeshStandardMaterial({ color: 0x2c4a66, roughness: 0.95, side: THREE.DoubleSide })) },
  get palm() { return cached('palm', () => new THREE.MeshStandardMaterial({ color: 0x5b7637, roughness: 0.9, side: THREE.DoubleSide })) },
  get palmDark() { return cached('palmDark', () => new THREE.MeshStandardMaterial({ color: 0x41562a, roughness: 0.95, side: THREE.DoubleSide })) },
  get bark() { return cached('bark', () => new THREE.MeshStandardMaterial({ color: 0x6e5a3c, roughness: 1 })) },
  get leaf() { return cached('leaf', () => new THREE.MeshStandardMaterial({ color: 0x4d6532, roughness: 1 })) },
  get olive() { return cached('olive', () => new THREE.MeshStandardMaterial({ color: 0x4a5138, roughness: 0.9 })) },
  get rust() { return cached('rust', () => new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.92, metalness: 0.25 })) },
  get terracotta() { return cached('terracotta', () => new THREE.MeshStandardMaterial({ color: 0x9b4d2c, roughness: 0.9 })) },
  get water() { return cached('water', () => new THREE.MeshStandardMaterial({ map: waterTexture(), color: 0x9fc7bd, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.9 })) },
  get smoke() { return cached('smoke', () => new THREE.SpriteMaterial({ map: smokeTexture(), color: 0xcfc4ad, transparent: true, opacity: 0.5, depthWrite: false })) },
  get flash() { return cached('flash', () => new THREE.SpriteMaterial({ map: flashTexture(), color: 0xffd28a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })) },
  get hole() { return cached('hole', () => new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })) },
  get dust() { return cached('dust', () => new THREE.PointsMaterial({ map: dustTexture(), color: 0xe8cf9e, size: 0.22, transparent: true, opacity: 0.35, depthWrite: false })) }
}

export function box(w, h, d, material, x = 0, y = 0, z = 0, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  return mesh
}

export function cyl(rt, rb, h, seg, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function archShape(w, h, r) {
  const s = new THREE.Shape()
  const half = w / 2
  s.moveTo(-half, 0)
  s.lineTo(-half, h - r)
  s.absarc(0, h - r, half, Math.PI, 0, true)
  s.lineTo(half, 0)
  s.lineTo(-half, 0)
  return s
}

function archPanel(w, h, depth = 0.6, material = MAT.glass, inset = 0) {
  const shape = archShape(w, h, w / 2)
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  geo.translate(0, 0, -depth / 2)
  const mesh = new THREE.Mesh(geo, material)
  mesh.castShadow = false
  mesh.receiveShadow = true
  mesh.position.z = inset
  return mesh
}

function signPlane(text, width, height, opts) {
  const mat = new THREE.MeshStandardMaterial({ map: signTexture(text, opts), roughness: 0.8, emissive: 0x111111, emissiveIntensity: 0.3 })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat)
  mesh.castShadow = false
  return mesh
}

function soldierSilhouette() {
  const g = new THREE.Group()
  const uniform = stucco(0x6b6b4f, 0.9)
  g.add(box(0.46, 0.72, 0.28, uniform, 0, 1.18, 0, false))
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), stucco(0xa57c55))
  head.position.y = 1.72
  g.add(head)
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stucco(0x51513a))
  helmet.position.y = 1.78
  g.add(helmet)
  const legMat = stucco(0x56563f)
  g.add(box(0.16, 0.78, 0.2, legMat, -0.13, 0.42, 0, false))
  g.add(box(0.16, 0.78, 0.2, legMat, 0.13, 0.42, 0, false))
  return g
}

export function createPalm({ height = 7.2, bend = 0.5, scale = 1, phase = Math.random() * 10 } = {}) {
  const g = new THREE.Group()
  const segments = 5
  let y = 0
  let x = 0
  let z = 0
  const segH = height / segments
  const crown = new THREE.Group()
  for (let i = 0; i < segments; i++) {
    const t = i / segments
    const rTop = 0.16 + 0.1 * (1 - t)
    const rBottom = 0.2 + 0.1 * (1 - t)
    const seg = cyl(rTop, rBottom, segH * 1.05, 7, MAT.bark)
    seg.position.set(x, y + segH / 2, z)
    seg.rotation.z = -bend * t * 0.085
    g.add(seg)
    y += segH
    x += Math.sin(bend * t * 0.085) * segH * 0.9
  }
  crown.position.set(x, y - 0.15, z)

  function frondGeometry(len, width) {
    const segs = 7
    const positions = []
    const indices = []
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const droop = -Math.pow(t, 1.75) * len * 0.62
      const half = Math.max(0.015, width * 0.5 * (1 - t * 0.92))
      positions.push(-half, droop, -len * t, half, droop, -len * t)
      if (i < segs) {
        const a = i * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  const count = 11
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.2
    const len = 2.3 + Math.random() * 1.3
    const pivot = new THREE.Group()
    pivot.rotation.y = a
    pivot.rotation.x = -0.32 - Math.random() * 0.4
    pivot.rotation.z = (Math.random() - 0.5) * 0.25
    const leafMat = i % 3 === 0 ? MAT.palmDark : MAT.palm
    const leaf = new THREE.Mesh(frondGeometry(len, 0.46), leafMat)
    leaf.castShadow = false
    pivot.add(leaf)
    crown.add(pivot)
  }

  const dateMat = stucco(0x9a5a25, 0.8)
  for (let i = 0; i < 4; i++) {
    const cluster = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), dateMat)
    const a = Math.random() * Math.PI * 2
    cluster.position.set(Math.cos(a) * 0.3, -0.25 - Math.random() * 0.25, Math.sin(a) * 0.3)
    crown.add(cluster)
  }

  crown.userData.phase = phase
  g.add(crown)
  g.userData.crown = crown
  g.scale.setScalar(scale)
  return g
}

export function createShrub(scale = 1) {
  const g = new THREE.Group()
  const trunk = cyl(0.05, 0.08, 0.5, 5, MAT.bark, 0, 0.25, 0)
  g.add(trunk)
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 + Math.random() * 0.16, 0), MAT.leaf)
    leaf.position.set((Math.random() - 0.5) * 0.4, 0.55 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4)
    leaf.scale.y = 0.8
    leaf.castShadow = false
    g.add(leaf)
  }
  g.scale.setScalar(scale)
  return g
}

export function createTree(scale = 1) {
  const g = new THREE.Group()
  g.add(cyl(0.16, 0.26, 2.2, 6, MAT.bark, 0, 1.1, 0))
  const canopyMat = stucco(0x5a6b3b, 0.95)
  for (let i = 0; i < 5; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + Math.random() * 0.4, 1), canopyMat)
    blob.position.set((Math.random() - 0.5) * 1.1, 2.4 + Math.random() * 0.8, (Math.random() - 0.5) * 1.1)
    blob.scale.y = 0.85
    blob.castShadow = true
    g.add(blob)
  }
  g.scale.setScalar(scale)
  return g
}

export function createBuilding({
  w = 10, d = 12, h = 8, color = 0xd6bd93, floors = 2, shop = false,
  sign = null, balcony = true, ruin = false, windowSeed = Math.random(), rooftop = true
} = {}) {
  const g = new THREE.Group()
  const wall = stucco(color)
  const body = box(w, h, d, wall, 0, h / 2, 0)
  g.add(body)

  if (!ruin) {
    g.add(box(w + 0.35, 0.28, d + 0.35, stone(0xa89878), 0, h, 0))
    const parapet = 0.55
    g.add(box(w + 0.3, parapet, 0.26, wall, 0, h + parapet / 2, d / 2))
    g.add(box(w + 0.3, parapet, 0.26, wall, 0, h + parapet / 2, -d / 2))
    g.add(box(0.26, parapet, d + 0.3, wall, w / 2, h + parapet / 2, 0))
    g.add(box(0.26, parapet, d + 0.3, wall, -w / 2, h + parapet / 2, 0))
  } else {
    g.add(box(w * 0.55, 0.3, d * 0.6, MAT.concrete, 0, h - 0.2, 0.4))
  }

  if (!ruin) {
    const cols = Math.max(2, Math.floor(w / 3))
    const floorH = (h - 2.8) / Math.max(1, floors)
    for (let f = 0; f < floors; f++) {
      const wy = 2.6 + f * floorH + floorH * 0.42
      if (wy > h - 1.2) continue
      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + (w / cols) * (c + 0.5)
        if (Math.random() < 0.12) continue
        const ww = 1.05 + ((windowSeed * 7 + c) % 3) * 0.12
        const wh = 1.35
        g.add(box(ww + 0.24, wh + 0.24, 0.14, stone(0xa59678), wx, wy, d / 2 + 0.03, false))
        g.add(box(ww, wh, 0.1, MAT.glass, wx, wy, d / 2 + 0.06, false))
        if (Math.random() < 0.55) {
          g.add(box(ww + 0.4, 0.12, 0.42, MAT.concrete, wx, wy + wh / 2 + 0.18, d / 2 + 0.2, false))
        }
        if (Math.random() < 0.3) {
          const shutter = box(ww / 2 - 0.05, wh, 0.06, MAT.darkWood, wx - ww / 4, wy, d / 2 + 0.09, false)
          shutter.rotation.y = 0.2
          g.add(shutter)
        }
      }
      if (f > 0) g.add(box(w + 0.12, 0.16, 0.1, stone(0xae9d7c), 0, 2.45 + f * floorH, d / 2 + 0.03, false))
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const ww = 1.1
      const wh = 1.3
      const wx = -w / 2 + 1.5 + Math.random() * (w - 3)
      g.add(box(ww, wh, 0.1, MAT.black, wx, 2.8 + Math.random() * 3, d / 2 + 0.02, false))
    }
  }

  if (shop && !ruin) {
    const openW = Math.min(4.2, w - 2)
    g.add(box(openW, 2.5, 0.14, MAT.black, 0, 1.3, d / 2 + 0.03, false))
    const awning = box(openW + 0.7, 0.1, 1.5, Math.random() > 0.5 ? MAT.fabricRed : MAT.fabricGreen, 0, 2.85, d / 2 + 0.7, false)
    awning.rotation.x = 0.16
    awning.castShadow = true
    g.add(awning)
    const label = sign || ['مقهى الرشيد', 'بقالة النخيل', 'سوق بغداد', 'مطعم دجلة', 'عطارة الزهور'][(Math.random() * 5) | 0]
    const signMesh = signPlane(label, Math.min(4.6, w - 1.4), 0.95)
    signMesh.position.set(0, 3.65, d / 2 + 0.12)
    g.add(signMesh)
    g.add(box(0.11, 0.11, 1.2, MAT.darkMetal, -openW / 2 + 0.2, 2.5, d / 2 + 0.5, false))
    g.add(box(0.11, 0.11, 1.2, MAT.darkMetal, openW / 2 - 0.2, 2.5, d / 2 + 0.5, false))
  } else if (!ruin) {
    const door = archPanel(1.8, 2.9, 0.35, MAT.darkWood)
    door.position.set(w / 2 - 2.1, 0.02, d / 2 + 0.04)
    g.add(door)
  }

  if (balcony && !ruin && h > 6) {
    const bx = w / 2 - 2.2
    g.add(box(2.4, 0.16, 0.8, stone(0xb2a184), bx, 4.1, d / 2 + 0.4))
    g.add(box(2.4, 0.55, 0.08, MAT.darkMetal, bx, 4.4, d / 2 + 0.78, false))
    g.add(box(0.08, 0.55, 0.8, MAT.darkMetal, bx - 1.16, 4.4, d / 2 + 0.4, false))
    g.add(box(0.08, 0.55, 0.8, MAT.darkMetal, bx + 1.16, 4.4, d / 2 + 0.4, false))
  }

  if (rooftop && !ruin) {
    const tank = cyl(0.62, 0.62, 1.1, 10, MAT.white, w / 2 - 1.4, h + 1.15, -d / 2 + 1.3)
    g.add(tank)
    const legs = box(0.1, 0.65, 0.1, MAT.darkMetal, w / 2 - 1.4, h + 0.3, -d / 2 + 1.3, false)
    g.add(legs)
    const dish = createSatelliteDish()
    dish.position.set(-w / 2 + 1.5, h + 0.7, -d / 2 + 1.4)
    dish.rotation.y = Math.random() * Math.PI
    g.add(dish)
    if (Math.random() < 0.55) {
      const line = new THREE.Group()
      const rope = box(0.03, 0.03, 4.2, MAT.darkMetal, 0, 0, 0, false)
      rope.rotation.y = Math.PI / 2
      line.add(rope)
      const cloths = [MAT.fabricRed, MAT.fabricGreen, MAT.fabricBlue, MAT.white]
      for (let i = 0; i < 4; i++) {
        const cloth = box(0.55, 0.7, 0.02, cloths[i], -1.5 + i * 0.9, -0.36, 0, false)
        line.add(cloth)
      }
      line.position.set(0, h + 2.2, d / 2 - 1)
      g.add(line)
    }
    g.add(box(0.9, 0.55, 0.42, MAT.white, -w / 2 + 1.3, h + 0.85, d / 2 - 1, false))
    for (let i = 0; i < 3; i++) {
      const rebar = cyl(0.015, 0.015, 1.2 + Math.random(), 4, MAT.darkMetal, -w / 2 + 0.6 + i * 0.35, h + 0.9, d / 2 - 0.3)
      rebar.rotation.z = (Math.random() - 0.5) * 0.25
      g.add(rebar)
    }
  }

  if (ruin) {
    for (let i = 0; i < 7; i++) {
      const r = box(0.5 + Math.random(), 0.3 + Math.random() * 0.4, 0.5 + Math.random(), MAT.concrete, (Math.random() - 0.5) * w, 0.2, d / 2 + Math.random(), false)
      r.rotation.set(Math.random(), Math.random(), Math.random())
      g.add(r)
    }
  }

  return g
}

export function createSatelliteDish() {
  const g = new THREE.Group()
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), MAT.white)
  dish.rotation.x = Math.PI * 0.56
  dish.rotation.z = 0.3
  dish.castShadow = true
  g.add(dish)
  g.add(cyl(0.03, 0.03, 0.7, 4, MAT.darkMetal, 0, -0.2, 0))
  g.add(box(0.05, 0.05, 0.6, MAT.darkMetal, 0, 0.15, -0.3, false))
  return g
}

export function createMosque({ scale = 1 } = {}) {
  const g = new THREE.Group()
  const wall = stucco(0xd7c29a)
  const trim = stone(0xc4ad83)
  const baseW = 16
  const baseD = 13
  const baseH = 8
  g.add(box(baseW, baseH, baseD, wall, 0, baseH / 2, 0))
  g.add(box(baseW + 0.5, 0.4, baseD + 0.5, trim, 0, baseH, 0))

  const drum = cyl(4.5, 4.5, 1.4, 24, trim, 0, baseH + 0.7, 0)
  g.add(drum)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), MAT.gold)
  dome.scale.y = 0.82
  dome.position.set(0, baseH + 1.4, 0)
  dome.castShadow = true
  dome.receiveShadow = true
  g.add(dome)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.12, 8, 32), MAT.goldDark)
  ring.rotation.x = Math.PI / 2
  ring.position.y = baseH + 1.4
  g.add(ring)

  const finial = new THREE.Group()
  finial.position.set(0, baseH + 5.8, 0)
  finial.add(cyl(0.08, 0.14, 1.5, 8, MAT.goldDark, 0, 0.5, 0))
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), MAT.gold)
  orb.position.y = 1.35
  finial.add(orb)
  const spike = cyl(0.00, 0.09, 0.9, 6, MAT.gold, 0, 1.95, 0)
  finial.add(spike)
  g.add(finial)

  const arch = archPanel(3.2, 4.6, 0.5, MAT.darkWood)
  arch.position.set(0, 0.05, baseD / 2 + 0.06)
  g.add(arch)
  g.add(box(0.5, 5.2, 0.7, trim, -2.1, 2.5, baseD / 2 + 0.25))
  g.add(box(0.5, 5.2, 0.7, trim, 2.1, 2.5, baseD / 2 + 0.25))
  const archTop = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.26, 8, 20, Math.PI), trim)
  archTop.position.set(0, 4.9, baseD / 2 + 0.25)
  g.add(archTop)

  for (let i = -1; i <= 1; i++) {
    if (i === 0) continue
    const niche = archPanel(1.3, 2.4, 0.25, MAT.glass)
    niche.position.set(i * 4.4, 0.7, baseD / 2 + 0.05)
    g.add(niche)
  }
  for (let i = -2; i <= 2; i++) {
    g.add(box(1.2, 1.6, 0.1, MAT.glass, i * 2.6, 6.4, baseD / 2 + 0.05, false))
  }

  const minaret = createMinaret(19)
  minaret.position.set(-baseW / 2 - 1.8, 0, baseD / 2 - 1)
  g.add(minaret)
  const minaret2 = createMinaret(15)
  minaret2.position.set(baseW / 2 + 1.8, 0, -baseD / 2 + 1)
  g.add(minaret2)

  g.add(box(baseW + 3, 0.35, baseD + 3, trim, 0, 0.18, 0))
  g.scale.setScalar(scale)
  return g
}

export function createMinaret(height = 18) {
  const g = new THREE.Group()
  const shaft = cyl(0.62, 0.95, height, 10, stucco(0xcdb78e))
  shaft.position.y = height / 2
  g.add(shaft)
  for (let i = 0; i < 6; i++) {
    const band = cyl(0.85 - i * 0.04, 0.85 - i * 0.04, 0.12, 10, stone(0xbaa279), 0, 3 + i * 2.6, 0)
    g.add(band)
  }
  const balc = cyl(1.25, 1.25, 0.35, 12, stone(0xb29c72), 0, height * 0.55, 0)
  g.add(balc)
  const balc2 = cyl(1.05, 1.05, 0.3, 12, stone(0xb29c72), 0, height * 0.8, 0)
  g.add(balc2)
  const top = cyl(0.9, 0.9, 1.4, 10, stucco(0xcdb78e), 0, height + 0.7, 0)
  g.add(top)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.gold)
  cap.position.y = height + 1.4
  g.add(cap)
  g.add(cyl(0.00, 0.12, 1.4, 6, MAT.gold, 0, height + 2.6, 0))
  return g
}

export function createSandbagWall({ length = 5, rows = 3 } = {}) {
  const g = new THREE.Group()
  const count = Math.round(length / 0.58) * rows
  const geo = new THREE.CapsuleGeometry(0.23, 0.42, 3, 8)
  const inst = new THREE.InstancedMesh(geo, MAT.burlap, count)
  inst.castShadow = true
  inst.receiveShadow = true
  const dummy = new THREE.Object3D()
  let i = 0
  for (let r = 0; r < rows; r++) {
    const perRow = Math.round(length / 0.58)
    for (let c = 0; c < perRow; c++) {
      dummy.position.set(-length / 2 + 0.3 + c * 0.58 + (r % 2) * 0.2, 0.24 + r * 0.4, (r % 2) * 0.1)
      dummy.rotation.set(0, 0, Math.PI / 2)
      dummy.rotation.y = (Math.random() - 0.5) * 0.15
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      inst.setMatrixAt(i++, dummy.matrix)
    }
  }
  g.add(inst)
  return g
}

export function createHesco({ w = 2.2, h = 1.4, d = 1.1 } = {}) {
  const g = new THREE.Group()
  g.add(box(w, h, d, MAT.dirt, 0, h / 2, 0))
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.02, h + 0.02, d + 0.02)),
    new THREE.LineBasicMaterial({ color: 0x4a3d28, transparent: true, opacity: 0.6 })
  )
  frame.position.y = h / 2
  g.add(frame)
  for (let i = -1; i <= 1; i += 2) {
    g.add(box(0.06, h, 0.06, MAT.darkMetal, (i * w) / 2, h / 2, d / 2, false))
    g.add(box(0.06, h, 0.06, MAT.darkMetal, (i * w) / 2, h / 2, -d / 2, false))
  }
  return g
}

export function createBarrel({ scale = 1, color = null } = {}) {
  const g = new THREE.Group()
  const mat = color ? stucco(color, 0.85) : MAT.rust
  const body = cyl(0.33, 0.33, 0.95, 14, mat, 0, 0.48, 0)
  g.add(body)
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 16), MAT.darkMetal)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.27 + i * 0.42
    g.add(ring)
  }
  g.scale.setScalar(scale)
  return g
}

export function createCrate({ size = 0.8, rot = 0 } = {}) {
  const g = new THREE.Group()
  g.add(box(size, size, size, MAT.wood, 0, size / 2, 0))
  for (let i = -1; i <= 1; i += 2) {
    g.add(box(0.07, size + 0.02, 0.07, MAT.darkWood, (i * size) / 2, size / 2, size / 2, false))
    g.add(box(0.07, size + 0.02, 0.07, MAT.darkWood, (i * size) / 2, size / 2, -size / 2, false))
  }
  g.rotation.y = rot
  return g
}

export function createCar({ color = 0x8f9a99, destroyed = false } = {}) {
  const g = new THREE.Group()
  const paint = destroyed ? MAT.black : stucco(color, 0.35)
  const body = box(1.85, 0.5, 4, paint, 0, 0.68, 0)
  body.castShadow = true
  g.add(body)
  const hood = box(1.8, 0.18, 1.15, paint, 0, 0.98, 1.35)
  g.add(hood)
  const cabin = box(1.6, 0.58, 1.9, paint, 0, 1.2, -0.25)
  g.add(cabin)
  const windshield = box(1.5, 0.5, 0.05, MAT.glass, 0, 1.22, 0.72, false)
  windshield.rotation.x = -0.32
  g.add(windshield)
  const rear = box(1.5, 0.45, 0.05, MAT.glass, 0, 1.2, -1.22, false)
  rear.rotation.x = 0.28
  g.add(rear)
  for (const sx of [-1, 1]) {
    g.add(box(0.05, 0.36, 1.5, MAT.glass, sx * 0.81, 1.24, -0.25, false))
  }
  g.add(box(1.8, 0.22, 0.22, MAT.darkMetal, 0, 0.52, 2.02, false))
  g.add(box(1.8, 0.22, 0.22, MAT.darkMetal, 0, 0.52, -2.02, false))
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12)
  for (const [sx, sz] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) {
    const wheel = new THREE.Mesh(wheelGeo, MAT.black)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(sx, 0.33, sz)
    wheel.castShadow = true
    g.add(wheel)
  }
  if (destroyed) {
    g.rotation.z = 0.04
    g.rotation.x = -0.02
    g.add(box(0.6, 0.05, 0.8, MAT.black, -0.3, 1.5, 0.4, false))
  }
  return g
}

export function createStall() {
  const g = new THREE.Group()
  g.add(box(2.6, 0.12, 1.5, MAT.wood, 0, 0.95, 0))
  g.add(box(0.12, 0.95, 0.12, MAT.darkWood, -1.2, 0.48, 0.6, false))
  g.add(box(0.12, 0.95, 0.12, MAT.darkWood, 1.2, 0.48, 0.6, false))
  g.add(box(0.12, 0.95, 0.12, MAT.darkWood, -1.2, 0.48, -0.6, false))
  g.add(box(0.12, 0.95, 0.12, MAT.darkWood, 1.2, 0.48, -0.6, false))
  for (let i = 0; i < 5; i++) {
    const pole = box(0.07, 2.1, 0.07, MAT.darkWood, (i < 2 ? -1.3 : 1.3), 1.05, (i % 2 ? -0.7 : 0.7), false)
    g.add(pole)
  }
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.1, 4, 2), MAT.fabricRed)
  cloth.rotation.x = Math.PI / 2 - 0.13
  cloth.position.set(0, 2.1, 0)
  cloth.castShadow = true
  g.add(cloth)
  for (let i = 0; i < 6; i++) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), [MAT.terracotta, stucco(0xd8912d), stucco(0x8a9a3a)][i % 3])
    fruit.position.set(-0.9 + (i % 3) * 0.32, 1.08, 0.2 + Math.floor(i / 3) * 0.3)
    g.add(fruit)
  }
  const crate = createCrate({ size: 0.55 })
  crate.position.set(1.1, 0, 0.5)
  g.add(crate)
  return g
}

export function createStreetLamp() {
  const g = new THREE.Group()
  g.add(cyl(0.07, 0.1, 6.5, 6, MAT.darkMetal, 0, 3.25, 0))
  g.add(box(0.9, 0.08, 0.08, MAT.darkMetal, 0.42, 6.4, 0))
  const lamp = box(0.42, 0.16, 0.26, stucco(0x5a584c), 0.8, 6.32, 0, false)
  g.add(lamp)
  const bulb = box(0.3, 0.04, 0.18, new THREE.MeshStandardMaterial({ color: 0xffe3a0, emissive: 0xffca66, emissiveIntensity: 1.6 }), 0.8, 6.22, 0, false)
  g.add(bulb)
  return g
}

export function createPowerLines(points = [], height = 7.5) {
  const g = new THREE.Group()
  const poleMat = MAT.darkWood
  points.forEach((p) => {
    g.add(cyl(0.08, 0.13, height, 5, poleMat, p.x, height / 2, p.z))
    g.add(box(1.4, 0.08, 0.08, poleMat, p.x, height - 0.4, p.z, false))
    g.add(box(0.08, 0.08, 0.8, poleMat, p.x, height - 0.8, p.z, false))
  })
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    for (const side of [-0.6, 0.6]) {
      const start = new THREE.Vector3(a.x + side, height - 0.4, a.z)
      const end = new THREE.Vector3(b.x + side, height - 0.4, b.z)
      const mid = start.clone().lerp(end, 0.5)
      mid.y -= 0.55
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(12)),
        new THREE.LineBasicMaterial({ color: 0x1a1916, transparent: true, opacity: 0.7 })
      )
      g.add(line)
    }
  }
  return g
}

export function createArchGate({ width = 12, height = 8, depth = 1.4 } = {}) {
  const g = new THREE.Group()
  const mat = stone(0xbfae8c)
  const pillarW = 2.2
  for (const s of [-1, 1]) {
    g.add(box(pillarW, height, depth, mat, (s * (width - pillarW)) / 2, height / 2, 0))
    g.add(box(pillarW + 0.5, 0.6, depth + 0.5, stone(0xa89674), (s * (width - pillarW)) / 2, height + 0.3, 0))
  }
  const opening = width - pillarW
  const arch = new THREE.Mesh(new THREE.TorusGeometry(opening / 2, 0.62, 10, 26, Math.PI), mat)
  arch.position.y = height
  arch.castShadow = true
  arch.receiveShadow = true
  g.add(arch)
  const band = new THREE.Mesh(new THREE.TorusGeometry(opening / 2 + 0.5, 0.16, 6, 26, Math.PI), stone(0xa89674))
  band.position.y = height
  band.position.z = depth / 2 + 0.02
  g.add(band)
  return g
}

export function createFlag({ text = 'الرافدين', scale = 1 } = {}) {
  const g = new THREE.Group()
  g.add(cyl(0.045, 0.06, 5.5, 6, MAT.metal, 0, 2.75, 0))
  const mat = new THREE.MeshStandardMaterial({ map: signTexture(text, { bg: '#1f4a37', fg: '#f1d78a', accent: '#d6a441' }), side: THREE.DoubleSide, roughness: 0.9 })
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.3, 10, 4), mat)
  const pos = flag.geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    pos.setZ(i, Math.sin((x + 1) * 1.8) * 0.12)
  }
  flag.geometry.computeVertexNormals()
  flag.position.set(1.02, 4.75, 0)
  flag.castShadow = true
  g.add(flag)
  g.scale.setScalar(scale)
  g.userData.flag = flag
  return g
}

export function createRubble(count = 8) {
  const g = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const s = 0.2 + Math.random() * 0.7
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), Math.random() > 0.6 ? MAT.rust : MAT.concrete)
    mesh.position.set((Math.random() - 0.5) * 4, s * 0.5, (Math.random() - 0.5) * 4)
    mesh.rotation.set(Math.random(), Math.random(), Math.random())
    mesh.castShadow = true
    mesh.receiveShadow = true
    g.add(mesh)
  }
  return g
}

export function createWaterTank() {
  const g = new THREE.Group()
  g.add(cyl(1.4, 1.6, 2.4, 14, MAT.white, 0, 1.2, 0))
  g.add(cyl(1.42, 1.42, 0.14, 14, MAT.darkMetal, 0, 2.4, 0))
  for (const s of [-1, 1]) {
    g.add(box(0.12, 1.2, 0.12, MAT.darkMetal, s * 0.9, 0.6, 0.9, false))
    g.add(box(0.12, 1.2, 0.12, MAT.darkMetal, s * 0.9, 0.6, -0.9, false))
  }
  return g
}

export function createReedHut() {
  const g = new THREE.Group()
  const wall = stucco(0xa98b60)
  g.add(cyl(2.1, 2.3, 2.6, 14, wall, 0, 1.3, 0))
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 2.6, 14), stucco(0x8b7444, 1))
  roof.position.y = 3.6
  roof.castShadow = true
  g.add(roof)
  const door = box(1.2, 1.9, 0.15, MAT.black, 0, 0.95, 2.25, false)
  g.add(door)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const reed = cyl(0.04, 0.05, 3.2, 4, stucco(0x9b834f), Math.cos(a) * 2.4, 1.6, Math.sin(a) * 2.4)
    reed.rotation.z = -Math.cos(a) * 0.16
    reed.rotation.x = Math.sin(a) * 0.16
    g.add(reed)
  }
  return g
}

export function createBoat() {
  const g = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-0.7, -2)
  shape.lineTo(-0.9, 0.8)
  shape.quadraticCurveTo(-0.5, 1.6, 0, 2.2)
  shape.quadraticCurveTo(0.5, 1.6, 0.9, 0.8)
  shape.lineTo(0.7, -2)
  shape.quadraticCurveTo(0, -2.35, -0.7, -2)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.65, bevelEnabled: false })
  const hull = new THREE.Mesh(geo, MAT.darkWood)
  hull.rotation.x = -Math.PI / 2
  hull.position.y = 0.35
  hull.castShadow = true
  g.add(hull)
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3), MAT.black)
  inner.rotation.x = -Math.PI / 2
  inner.position.set(0, 0.68, 0)
  g.add(inner)
  for (let i = 0; i < 2; i++) {
    g.add(box(1.3, 0.08, 0.3, MAT.wood, 0, 0.58, -0.8 + i * 1.5, false))
  }
  return g
}

export function createOilDerrick({ height = 16 } = {}) {
  const g = new THREE.Group()
  const mat = MAT.rust
  const legPositions = [[-2.4, 0, -2.4], [2.4, 0, -2.4], [-2.4, 0, 2.4], [2.4, 0, 2.4]]
  const top = new THREE.Vector3(0, height, 0)
  function beam(a, b, r = 0.07) {
    const dir = b.clone().sub(a)
    const len = dir.length()
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 5), mat)
    mesh.position.copy(a).addScaledVector(dir, 0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    mesh.castShadow = true
    g.add(mesh)
  }
  const tops = []
  legPositions.forEach((p) => {
    const a = new THREE.Vector3(...p)
    beam(a, top, 0.1)
    tops.push(a)
  })
  for (let level = 1; level < 5; level++) {
    const t = level / 5
    const r = 2.4 * (1 - t) + 0.3 * t
    const y = height * t
    const corners = [[-r, -r], [r, -r], [r, r], [-r, r]].map(([x, z]) => new THREE.Vector3(x, y, z))
    for (let i = 0; i < 4; i++) beam(corners[i], corners[(i + 1) % 4], 0.04)
    for (let i = 0; i < 4; i++) {
      if ((i + level) % 2 === 0) beam(corners[i], corners[(i + 1) % 4], 0.035)
    }
  }
  g.add(box(1.6, 0.4, 1.6, MAT.darkMetal, 0, height - 1.6, 0, false))
  g.add(cyl(0.2, 0.2, 1.1, 6, MAT.darkMetal, 0, height - 2.4, 0))
  return g
}

export function createMountain({ radius = 26, height = 42, color = 0x746b62 } = {}) {
  const geo = new THREE.ConeGeometry(radius, height, 16, 8)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = Math.sin(x * 0.35 + z * 0.21) * 0.08 + Math.sin(y * 0.5) * 0.04
    pos.setX(i, x * (1 + n))
    pos.setZ(i, z * (1 + n))
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }))
  mesh.position.y = height / 2 - 1
  mesh.receiveShadow = true
  return mesh
}

export function createCitadelWall({ width = 30, height = 7, depth = 2 } = {}) {
  const g = new THREE.Group()
  const mat = stone(0xb5a281)
  g.add(box(width, height, depth, mat, 0, height / 2, 0))
  const merlonW = 0.85
  const gap = 0.55
  const count = Math.floor(width / (merlonW + gap))
  for (let i = 0; i < count; i++) {
    g.add(box(merlonW, 0.9, depth + 0.15, mat, -width / 2 + 0.5 + i * (merlonW + gap), height + 0.45, 0, false))
  }
  for (let i = 0; i < 3; i++) {
    g.add(box(1.2, 2.1, 0.25, MAT.black, -width / 3 + i * (width / 3), height * 0.45, depth / 2 + 0.05, false))
  }
  return g
}

export function createCitadelTower({ radius = 3.4, height = 12 } = {}) {
  const g = new THREE.Group()
  const mat = stone(0xb5a281)
  g.add(cyl(radius, radius * 1.08, height, 12, mat, 0, height / 2, 0))
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    g.add(box(0.85, 0.9, 0.85, mat, Math.cos(a) * radius, height + 0.4, Math.sin(a) * radius, false))
  }
  g.add(box(1.1, 2.2, 0.2, MAT.black, 0, height * 0.55, radius + 0.02, false))
  return g
}

export function createDustMotes(count = 220, spread = 55) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread
    positions[i * 3 + 1] = Math.random() * 12 + 0.3
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(geo, MAT.dust)
  points.frustumCulled = false
  points.userData.base = positions.slice()
  return points
}

export function createSmokePlume(scene, position, color = 0x9c917e) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: smokeTexture(), color, transparent: true, opacity: 0.35, depthWrite: false
  }))
  sprite.position.copy(position)
  sprite.scale.set(8, 8, 8)
  sprite.userData.smoke = true
  sprite.userData.phase = Math.random() * 10
  scene.add(sprite)
  return sprite
}

export function createBird() {
  const g = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0x2f2a24, side: THREE.DoubleSide })
  const wingGeo = new THREE.BufferGeometry()
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, 0.08, 0.1, 0.35, 0, -0.16], 3))
  wingGeo.computeVertexNormals()
  const l = new THREE.Mesh(wingGeo, mat)
  const r = new THREE.Mesh(wingGeo, mat)
  r.scale.x = -1
  g.add(l, r)
  g.userData.l = l
  g.userData.r = r
  return g
}

export { soldierSilhouette, signPlane }
