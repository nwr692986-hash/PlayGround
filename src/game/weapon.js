import * as THREE from 'three'
import { metalTexture } from '../core/textures.js'

const HIP = new THREE.Vector3(0.27, -0.16, -0.7)
const PORTRAIT_HIP = new THREE.Vector3(0.15, -0.19, -0.72)
const ADS = new THREE.Vector3(0, -0.105, -0.88)
const FIRE_INTERVAL = 60 / 720
const MAG_SIZE = 30

function vbox(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

function vcyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
  m.position.set(x, y, z)
  return m
}

export class Weapon {
  constructor(camera, scene, player, world, enemyManager, effects, audio, viewCamera = camera) {
    this.camera = camera
    this.scene = scene
    this.player = player
    this.world = world
    this.enemies = enemyManager
    this.effects = effects
    this.audio = audio
    this.viewCamera = viewCamera
    this.baseViewFov = viewCamera.fov
    this.ammo = MAG_SIZE
    this.reserve = 150
    this.reloading = false
    this.reloadT = 0
    this.fireCooldown = 0
    this.recoil = 0
    this.recoilVel = 0
    this.aiming = false
    this.adsT = 0
    this.trigger = false
    this.swayX = 0
    this.swayY = 0
    this.lookSway = new THREE.Vector2()
    this.baseFov = 68
    this.shots = 0
    this.onHit = null
    this.onStats = null
    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 220
    this.group = this.build()
    this.group.scale.setScalar(0.8)
    this.viewCamera.add(this.group)
    this.group.position.copy(HIP)
    this.group.rotation.set(0, 0.11, 0)
    this.magazineBaseY = this.magazine.position.y
  }

  build() {
    const g = new THREE.Group()
    const gunmetal = new THREE.MeshStandardMaterial({ map: metalTexture(), color: 0x565b52, metalness: 0.45, roughness: 0.42, emissive: 0x0c0d0b })
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3d36, metalness: 0.28, roughness: 0.62, emissive: 0x0b0c0a })
    const polymer = new THREE.MeshStandardMaterial({ color: 0x332c22, metalness: 0.05, roughness: 0.9, emissive: 0x080604 })
    const tan = new THREE.MeshStandardMaterial({ color: 0x887454, metalness: 0.08, roughness: 0.8, emissive: 0x0f0d09 })
    const glove = new THREE.MeshStandardMaterial({ color: 0x3f3d32, roughness: 0.92 })
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x474a38, roughness: 0.95 })
    const skin = new THREE.MeshStandardMaterial({ color: 0xb08a62, roughness: 0.85 })
    const lens = new THREE.MeshStandardMaterial({ color: 0x3d5868, metalness: 0.75, roughness: 0.18, emissive: 0x0d1a20 })
    const red = new THREE.MeshStandardMaterial({ color: 0xff3322, emissive: 0xff2a11, emissiveIntensity: 3 })

    g.add(vbox(0.088, 0.105, 0.34, gunmetal, 0, 0.005, 0.02))
    g.add(vbox(0.095, 0.035, 0.3, dark, 0, 0.065, 0.01))

    const guard = vbox(0.086, 0.075, 0.3, polymer, 0, 0.008, -0.27)
    g.add(guard)
    for (let i = 0; i < 5; i++) {
      g.add(vbox(0.098, 0.012, 0.02, dark, 0, 0.048, -0.14 - i * 0.058))
    }
    const barrel = vcyl(0.019, 0.021, 0.34, 10, gunmetal, 0, 0.018, -0.5)
    barrel.rotation.x = Math.PI / 2
    g.add(barrel)
    const brake = vcyl(0.032, 0.028, 0.08, 8, dark, 0, 0.018, -0.7)
    brake.rotation.x = Math.PI / 2
    g.add(brake)
    for (let i = 0; i < 3; i++) {
      g.add(vbox(0.062, 0.008, 0.012, dark, 0, 0.018, -0.675 + i * 0.018))
    }

    const stock = vbox(0.052, 0.07, 0.14, polymer, 0, -0.014, 0.235)
    g.add(stock)
    g.add(vbox(0.06, 0.086, 0.018, dark, 0, -0.016, 0.312))
    g.add(vbox(0.052, 0.06, 0.16, dark, 0, 0.012, 0.17))
    g.add(vbox(0.02, 0.035, 0.13, gunmetal, 0, 0.078, 0.17))

    const grip = vbox(0.052, 0.13, 0.07, polymer, 0, -0.098, 0.075)
    grip.rotation.x = -0.24
    g.add(grip)

    const trigger = vbox(0.008, 0.045, 0.012, dark, 0, -0.06, 0.035)
    g.add(trigger)
    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 5, 10, Math.PI), dark)
    triggerGuard.position.set(0, -0.055, 0.04)
    triggerGuard.rotation.set(Math.PI / 2, 0, Math.PI)
    g.add(triggerGuard)

    const mag = new THREE.Group()
    mag.position.set(0, -0.075, -0.035)
    mag.add(vbox(0.056, 0.16, 0.095, dark, 0, -0.075, 0))
    mag.add(vbox(0.06, 0.02, 0.1, polymer, 0, -0.145, 0.005))
    mag.rotation.x = 0.14
    g.add(mag)
    this.magazine = mag

    const mount = vbox(0.05, 0.03, 0.09, dark, 0, 0.098, -0.02)
    g.add(mount)
    const optic = vcyl(0.026, 0.026, 0.1, 12, dark, 0, 0.132, -0.02)
    optic.rotation.x = Math.PI / 2
    g.add(optic)
    const opticFront = vcyl(0.029, 0.028, 0.022, 12, gunmetal, 0, 0.132, -0.073)
    opticFront.rotation.x = Math.PI / 2
    g.add(opticFront)
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.023, 12), lens)
    glass.position.set(0, 0.132, 0.031)
    g.add(glass)
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0038, 8), red)
    dot.position.set(0, 0.132, 0.034)
    dot.rotation.y = Math.PI
    g.add(dot)
    g.add(vbox(0.03, 0.018, 0.03, dark, 0, 0.098, 0.033))

    const frontSight = vbox(0.008, 0.05, 0.012, dark, 0, 0.075, -0.39)
    g.add(frontSight)
    g.add(vbox(0.05, 0.012, 0.04, gunmetal, 0, 0.055, -0.39))

    const leftArm = new THREE.Group()
    const leftGlove = vbox(0.062, 0.062, 0.1, glove, -0.072, -0.02, -0.27)
    leftGlove.rotation.z = 0.25
    leftArm.add(leftGlove)
    leftArm.add(vbox(0.052, 0.062, 0.18, sleeve, -0.092, -0.068, -0.15))
    leftArm.rotation.y = 0.16
    g.add(leftArm)
    const thumbL = vbox(0.02, 0.025, 0.055, skin, -0.045, 0.02, -0.295)
    thumbL.rotation.z = 0.4
    g.add(thumbL)

    const rightArm = new THREE.Group()
    const rightGlove = vbox(0.062, 0.08, 0.085, glove, 0.02, -0.075, 0.075)
    rightGlove.rotation.z = -0.2
    rightArm.add(rightGlove)
    rightArm.add(vbox(0.056, 0.066, 0.17, sleeve, 0.03, -0.115, 0.17))
    rightArm.rotation.x = 0.22
    g.add(rightArm)

    const muzzle = new THREE.Object3D()
    muzzle.position.set(0, 0.018, -0.74)
    g.add(muzzle)
    this.muzzle = muzzle

    const eject = new THREE.Object3D()
    eject.position.set(0.055, 0.035, 0.0)
    g.add(eject)
    this.ejectPort = eject

    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false
        o.receiveShadow = false
        o.frustumCulled = false
        o.renderOrder = 5
      }
    })
    return g
  }

  setWorld(world, enemyManager) {
    this.world = world
    this.enemies = enemyManager
    this.ammo = MAG_SIZE
    this.reserve = 150
    this.reloading = false
    this.reloadT = 0
    this.fireCooldown = 0
    this.recoil = 0
    this.recoilVel = 0
    this.shots = 0
    this.aiming = false
    this.adsT = 0
    this.trigger = false
    this.magazine.position.y = this.magazineBaseY
    this.notify()
  }

  notify() {
    if (this.onStats) this.onStats({ ammo: this.ammo, reserve: this.reserve, reloading: this.reloading })
  }

  startReload() {
    if (this.reloading || this.ammo >= MAG_SIZE || this.reserve <= 0) return
    this.reloading = true
    this.reloadT = 0
    this.audio.reload()
    this.notify()
  }

  finishReload() {
    const needed = MAG_SIZE - this.ammo
    const take = Math.min(needed, this.reserve)
    this.ammo += take
    this.reserve -= take
    this.reloading = false
    this.reloadT = 0
    this.notify()
  }

  update(dt, input) {
    this.fireCooldown -= dt
    this.recoilVel += -this.recoil * 120 * dt
    this.recoilVel *= Math.exp(-15 * dt)
    this.recoil += this.recoilVel * dt
    this.recoil = Math.max(0, Math.min(1.3, this.recoil))

    const adsTarget = input.aiming ? 1 : 0
    this.aiming = adsTarget > 0.5
    this.adsT += (adsTarget - this.adsT) * Math.min(1, dt * 12)
    const fov = this.baseFov - 17 * this.adsT
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
    const viewFov = this.baseViewFov - 14 * this.adsT
    if (this.viewCamera && Math.abs(this.viewCamera.fov - viewFov) > 0.05) {
      this.viewCamera.fov = viewFov
      this.viewCamera.updateProjectionMatrix()
    }

    this.lookSway.x += (input.lookDX * 0.00035 - this.lookSway.x) * Math.min(1, dt * 8)
    this.lookSway.y += (input.lookDY * 0.0003 - this.lookSway.y) * Math.min(1, dt * 8)
    this.lookSway.x = Math.max(-0.04, Math.min(0.04, this.lookSway.x))
    this.lookSway.y = Math.max(-0.03, Math.min(0.03, this.lookSway.y))
    this.swayX = Math.sin(this.player.bob * 0.5) * 0.012 * (this.adsT < 0.5 ? 1 : 0.2)
    this.swayY = Math.abs(Math.cos(this.player.bob)) * 0.008 * (this.adsT < 0.5 ? 1 : 0.2)

    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z)
    const moveSway = speed > 0.5 ? 1 : 0.15
    const hip = this.viewCamera && this.viewCamera.aspect < 0.9 ? PORTRAIT_HIP : HIP
    const target = hip.clone().lerp(ADS, this.adsT)
    target.x += Math.sin(this.player.bob * 0.5) * 0.008 * moveSway - this.lookSway.x * 0.6
    target.y += Math.abs(Math.cos(this.player.bob)) * 0.007 * moveSway - this.lookSway.y * 0.6
    target.z += this.recoil * 0.045
    this.group.position.lerp(target, Math.min(1, dt * 14))

    let rx = this.recoil * 0.15
    let ry = 0.035 * (1 - this.adsT)
    let rz = 0
    if (this.reloading) {
      this.reloadT += dt
      const p = Math.min(1, this.reloadT / 1.75)
      const arc = Math.sin(p * Math.PI)
      rx += arc * 0.5
      rz += arc * 0.62
      this.group.position.y -= arc * 0.11
      const magP = Math.min(1, Math.max(0, (p - 0.12) / 0.38))
      this.magazine.position.y = this.magazineBaseY - Math.sin(magP * Math.PI) * 0.28
      this.magazine.rotation.z = Math.sin(magP * Math.PI) * 0.35
      if (this.reloadT >= 1.75) this.finishReload()
    } else {
      this.magazine.position.y += (this.magazineBaseY - this.magazine.position.y) * Math.min(1, dt * 10)
      this.magazine.rotation.z *= Math.exp(-10 * dt)
    }

    this.group.rotation.set(
      rx + this.lookSway.y * 0.25,
      ry + this.lookSway.x * 0.3,
      rz + this.lookSway.x * 0.2
    )

    this.trigger = !!input.firing
    if (this.trigger) {
      if (this.reloading) return
      if (this.ammo <= 0) {
        if (this.fireCooldown <= 0) {
          this.audio.empty()
          this.fireCooldown = 0.35
          this.startReload()
        }
        return
      }
      if (this.fireCooldown <= 0) this.fire()
    }
  }

  fire() {
    this.fireCooldown = FIRE_INTERVAL
    this.ammo--
    this.shots++
    this.audio.shot()
    this.recoilVel += 7.5
    this.camera.updateMatrixWorld()
    this.group.updateWorldMatrix(true, false)

    const origin = new THREE.Vector3()
    this.camera.getWorldPosition(origin)
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    const moving = Math.hypot(this.player.velocity.x, this.player.velocity.z) > 0.6
    const spread = this.aiming ? 0.0032 : (moving ? 0.024 : 0.015)
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0)
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1)
    dir.addScaledVector(right, (Math.random() - 0.5) * spread)
    dir.addScaledVector(up, (Math.random() - 0.5) * spread).normalize()

    this.player.addRecoil(0.0085 + Math.random() * 0.005, (Math.random() - 0.5) * 0.005)
    this.player.addShake(0.012)

    const muzzlePos = new THREE.Vector3()
    this.muzzle.getWorldPosition(muzzlePos)
    const flashPos = muzzlePos.clone().addScaledVector(dir, 0.02)
    this.effects.muzzleFlash(flashPos, dir, this.aiming ? 0.8 : 1)
    this.effects.shell(this.ejectPort.getWorldPosition(new THREE.Vector3()), right, up)

    this.raycaster.set(origin, dir)

    let enemyHit = null
    if (this.enemies) {
      const hits = this.raycaster.intersectObjects(this.enemies.hitMeshes, false)
      if (hits.length) enemyHit = hits[0]
    }
    let worldHit = null
    if (this.world) {
      const hits = this.raycaster.intersectObject(this.world.group, true)
      if (hits.length) worldHit = hits[0]
    }

    if (enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance)) {
      const point = enemyHit.point
      const normal = dir.clone().negate()
      this.effects.tracer(muzzlePos, point)
      this.effects.impact(point, normal, true)
      const part = enemyHit.object.userData.part || 'body'
      const headshot = part === 'head'
      const damage = headshot ? 140 : 36
      const dead = this.enemies.damage(enemyHit.object.userData.enemy, damage, headshot, point)
      this.audio.hit(headshot)
      if (this.onHit) this.onHit({ headshot, dead, point, enemy: enemyHit.object.userData.enemy })
    } else if (worldHit) {
      const point = worldHit.point
      let normal = new THREE.Vector3(0, 1, 0)
      if (worldHit.face) {
        normal.copy(worldHit.face.normal).transformDirection(worldHit.object.matrixWorld)
      }
      this.effects.tracer(muzzlePos, point)
      this.effects.impact(point, normal)
    } else {
      const far = origin.clone().addScaledVector(dir, 150)
      this.effects.tracer(muzzlePos, far)
    }

    if (this.ammo === 0 && this.reserve > 0) {
      setTimeout(() => {
        if (this.ammo === 0 && !this.reloading) this.startReload()
      }, 350)
    }
    this.notify()
  }
}
