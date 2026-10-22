import * as THREE from 'three'

const EYE_HEIGHT = 1.72
const RADIUS = 0.44

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

export class Player {
  constructor(camera, audio) {
    this.camera = camera
    this.audio = audio
    this.position = new THREE.Vector3(0, EYE_HEIGHT, 27)
    this.velocity = new THREE.Vector3()
    this.yaw = 0
    this.pitch = 0
    this.recoilPitch = 0
    this.recoilYaw = 0
    this.shake = 0
    this.shakeTime = 0
    this.bob = 0
    this.bobOffset = new THREE.Vector2()
    this.health = 100
    this.maxHealth = 100
    this.dead = false
    this.lastDamageAt = -99
    this.damageDirection = 0
    this.walkTime = 0
    this.sprinting = false
    this.ads = false
    this.sensitivity = 1
    this.colliders = []
    this.bounds = { minX: -30, maxX: 30, minZ: -60, maxZ: 30 }
    this.onDamage = null
    this.onDeath = null
    this.onStep = null
    this.time = 0
    this.velocityY = 0
    this.onGround = true
  }

  reset(world) {
    const start = world.playerStart || { x: 0, z: 0, yaw: 0 }
    this.position.set(start.x, EYE_HEIGHT, start.z)
    this.velocity.set(0, 0, 0)
    this.yaw = start.yaw || 0
    this.pitch = 0
    this.recoilPitch = 0
    this.recoilYaw = 0
    this.health = this.maxHealth
    this.dead = false
    this.lastDamageAt = -99
    this.colliders = world.colliders
    this.bounds = world.bounds
    this.velocityY = 0
    this.onGround = true
    this.applyCamera(0, 0)
    this.camera.position.set(start.x, EYE_HEIGHT, start.z)
    this.camera.rotation.set(0, this.yaw, 0, 'YXZ')
  }

  addRecoil(pitch, yaw) {
    this.recoilPitch += pitch
    this.recoilYaw += yaw
  }

  addShake(amount) {
    this.shake = Math.min(0.22, this.shake + amount)
  }

  look(dx, dy, sensitivity = 1) {
    const s = 0.0022 * sensitivity
    this.yaw -= dx * s
    this.pitch = clamp(this.pitch - dy * s, -1.35, 1.35)
  }

  move(dt, input) {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    let mx = input.moveX
    let mz = input.moveZ
    const mag = Math.hypot(mx, mz)
    if (mag > 1) {
      mx /= mag
      mz /= mag
    }
    this.sprinting = input.sprint && mag > 0.55 && !this.ads
    const speed = this.sprinting ? 7.4 : this.ads ? 2.9 : 5.1
    const target = new THREE.Vector3()
    target.addScaledVector(forward, -mz)
    target.addScaledVector(right, mx)
    if (target.lengthSq() > 0) target.normalize().multiplyScalar(speed)

    const accel = this.onGround ? 11 : 3
    this.velocity.x += (target.x - this.velocity.x) * Math.min(1, accel * dt)
    this.velocity.z += (target.z - this.velocity.z) * Math.min(1, accel * dt)

    if (input.jump && this.onGround) {
      this.velocityY = 5.1
      this.onGround = false
      input.jump = false
    }
    this.velocityY -= 13.5 * dt
    this.position.y += this.velocityY * dt
    if (this.position.y <= EYE_HEIGHT) {
      this.position.y = EYE_HEIGHT
      this.velocityY = 0
      this.onGround = true
    }

    this.position.x += this.velocity.x * dt
    this.position.z += this.velocity.z * dt
    this.resolveCollisions()

    const speed2d = Math.hypot(this.velocity.x, this.velocity.z)
    if (speed2d > 0.5 && this.onGround) {
      this.bob += dt * (this.sprinting ? 12 : 8.6)
      const stepInterval = this.sprinting ? 0.32 : 0.45
      this.walkTime += dt
      if (this.walkTime > stepInterval) {
        this.walkTime = 0
        if (this.onStep) this.onStep(this.sprinting)
      }
    } else {
      this.bob += dt * 1.2
      this.walkTime = 0
    }
    return speed2d
  }

  resolveCollisions() {
    const p = this.position
    for (const c of this.colliders) {
      const cx = clamp(p.x, c.minX, c.maxX)
      const cz = clamp(p.z, c.minZ, c.maxZ)
      let dx = p.x - cx
      let dz = p.z - cz
      let dist = Math.hypot(dx, dz)
      if (dist < RADIUS) {
        if (dist < 0.0001) {
          const left = Math.abs(p.x - c.minX)
          const right = Math.abs(c.maxX - p.x)
          const front = Math.abs(p.z - c.minZ)
          const back = Math.abs(c.maxZ - p.z)
          const m = Math.min(left, right, front, back)
          if (m === left) p.x = c.minX - RADIUS
          else if (m === right) p.x = c.maxX + RADIUS
          else if (m === front) p.z = c.minZ - RADIUS
          else p.z = c.maxZ + RADIUS
        } else {
          const push = (RADIUS - dist) / dist
          p.x += dx * push
          p.z += dz * push
        }
      }
    }
    p.x = clamp(p.x, this.bounds.minX, this.bounds.maxX)
    p.z = clamp(p.z, this.bounds.minZ, this.bounds.maxZ)
  }

  applyCamera(swayX = 0, swayY = 0) {
    const shakeAmt = this.shake
    const sx = (Math.random() - 0.5) * shakeAmt
    const sy = (Math.random() - 0.5) * shakeAmt
    const speed2d = Math.hypot(this.velocity.x, this.velocity.z)
    const bobStrength = this.ads ? 0.25 : 1
    this.bobOffset.x += ((Math.sin(this.bob) * 0.028 * bobStrength) - this.bobOffset.x) * 0.2
    this.bobOffset.y += ((Math.abs(Math.cos(this.bob)) * 0.032 * bobStrength) - this.bobOffset.y) * 0.2
    const moveBob = speed2d > 0.5 && this.onGround ? this.bobOffset.y : 0
    this.camera.position.set(
      this.position.x + swayX + sx,
      this.position.y + moveBob + sy,
      this.position.z
    )
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.set(
      this.pitch + this.recoilPitch + sy * 0.4,
      this.yaw + this.recoilYaw + sx * 0.4,
      Math.sin(this.bob * 0.5) * 0.006 * (speed2d > 0.5 ? 1 : 0)
    )
  }

  update(dt, input, weapon) {
    this.time += dt
    this.ads = weapon?.aiming || false
    const speed2d = this.move(dt, input)
    this.recoilPitch *= Math.exp(-13 * dt)
    this.recoilYaw *= Math.exp(-13 * dt)
    this.shake *= Math.exp(-9 * dt)

    if (this.time - this.lastDamageAt > 5.5 && this.health < this.maxHealth && !this.dead) {
      this.health = Math.min(this.maxHealth, this.health + 11 * dt)
    }
    if (this.health <= 0 && !this.dead) {
      this.dead = true
      if (this.onDeath) this.onDeath()
    }

    const swayX = weapon ? weapon.swayX : 0
    const swayY = weapon ? weapon.swayY : 0
    this.applyCamera(swayX, swayY)
    return speed2d
  }

  takeDamage(amount, fromPos) {
    if (this.dead) return
    this.health = Math.max(0, this.health - amount)
    this.lastDamageAt = this.time
    this.addShake(0.11)
    if (fromPos) {
      const dx = fromPos.x - this.position.x
      const dz = fromPos.z - this.position.z
      this.damageDirection = Math.atan2(dx, dz)
      this.lastDamageFrom = fromPos.clone ? fromPos.clone() : { x: fromPos.x, z: fromPos.z }
    }
    if (this.audio) this.audio.damage()
    if (this.onDamage) this.onDamage(amount, this.health)
  }
}
