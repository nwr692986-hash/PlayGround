import * as THREE from 'three'

function mat(color, roughness = 0.9, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function part(geo, material, x, y, z, parent) {
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function vbox(w, h, d, material, x, y, z, parent) {
  return part(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent)
}

export function createSoldierModel({ uniform = 0x6c6a4e, vest = 0x3f4236, scarf = 0x8c3c2a } = {}) {
  const g = new THREE.Group()
  const uniformMat = mat(uniform)
  const vestMat = mat(vest, 0.85)
  const bootMat = mat(0x26251f, 0.95)
  const skinMat = mat(0x9a7149, 0.9)
  const scarfMat = mat(scarf, 0.95)
  const helmetMat = mat(0x3a3c2f, 0.8, 0.15)
  const gunMat = mat(0x222420, 0.55, 0.55)

  const leftLeg = new THREE.Group()
  leftLeg.position.set(-0.13, 0.9, 0)
  vbox(0.17, 0.44, 0.2, uniformMat, 0, -0.22, 0, leftLeg)
  vbox(0.15, 0.42, 0.18, uniformMat, 0, -0.61, 0, leftLeg)
  vbox(0.17, 0.16, 0.28, bootMat, 0, -0.86, -0.04, leftLeg)
  g.add(leftLeg)

  const rightLeg = new THREE.Group()
  rightLeg.position.set(0.13, 0.9, 0)
  vbox(0.17, 0.44, 0.2, uniformMat, 0, -0.22, 0, rightLeg)
  vbox(0.15, 0.42, 0.18, uniformMat, 0, -0.61, 0, rightLeg)
  vbox(0.17, 0.16, 0.28, bootMat, 0, -0.86, -0.04, rightLeg)
  g.add(rightLeg)

  vbox(0.46, 0.55, 0.27, uniformMat, 0, 1.18, 0, g)
  const vestMesh = vbox(0.51, 0.38, 0.34, vestMat, 0, 1.21, -0.01, g)
  for (let i = 0; i < 3; i++) {
    vbox(0.14, 0.11, 0.06, mat(0x555647), -0.15 + i * 0.15, 1.2, -0.2, g)
  }
  vbox(0.3, 0.12, 0.06, mat(0x2f3028), 0, 1.45, -0.2, g)

  vbox(0.16, 0.14, 0.2, skinMat, 0, 1.53, 0, g)
  const head = part(new THREE.SphereGeometry(0.175, 12, 10), skinMat, 0, 1.64, 0, g)
  const mask = vbox(0.22, 0.12, 0.06, scarfMat, 0, 1.58, -0.16, g)
  const helmet = part(new THREE.SphereGeometry(0.205, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat, 0, 1.7, 0, g)
  helmet.scale.y = 0.85
  vbox(0.04, 0.05, 0.03, mat(0x1d1d19), 0, 1.66, -0.17, g)
  vbox(0.26, 0.06, 0.2, helmetMat, 0, 1.78, 0.02, g)

  const leftArm = new THREE.Group()
  leftArm.position.set(-0.3, 1.4, 0)
  vbox(0.14, 0.34, 0.16, uniformMat, 0, -0.16, -0.02, leftArm)
  const leftFore = vbox(0.12, 0.3, 0.14, uniformMat, 0.03, -0.44, -0.12, leftArm)
  leftFore.rotation.x = -0.8
  vbox(0.1, 0.11, 0.12, mat(0x34342c), 0.06, -0.55, -0.26, leftArm)
  g.add(leftArm)

  const rightArm = new THREE.Group()
  rightArm.position.set(0.3, 1.4, 0)
  vbox(0.14, 0.34, 0.16, uniformMat, 0, -0.16, -0.02, rightArm)
  const rightFore = vbox(0.12, 0.3, 0.14, uniformMat, -0.03, -0.42, -0.14, rightArm)
  rightFore.rotation.x = -1
  vbox(0.1, 0.11, 0.12, mat(0x34342c), -0.05, -0.54, -0.28, rightArm)
  g.add(rightArm)

  const rifle = new THREE.Group()
  rifle.position.set(0.08, 1.28, -0.3)
  vbox(0.06, 0.09, 0.5, gunMat, 0, 0, 0, rifle)
  const barrel = part(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), gunMat, 0, 0.015, -0.42, rifle)
  barrel.rotation.x = Math.PI / 2
  vbox(0.045, 0.11, 0.07, gunMat, 0, -0.08, -0.02, rifle)
  vbox(0.07, 0.14, 0.06, gunMat, 0, -0.09, 0.08, rifle)
  vbox(0.045, 0.035, 0.18, gunMat, 0, 0.07, 0.24, rifle)
  const muzzle = new THREE.Object3D()
  muzzle.position.set(0, 0.015, -0.65)
  rifle.add(muzzle)
  g.add(rifle)

  const hitBody = vbox(0.58, 0.62, 0.42, new THREE.MeshBasicMaterial({ visible: false }), 0, 1.19, -0.02, g)
  hitBody.visible = true
  hitBody.material.visible = false
  const headHit = part(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ visible: false }), 0, 1.67, 0, g)
  headHit.visible = true
  headHit.material.visible = false
  const legHit = vbox(0.44, 0.7, 0.32, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.5, 0, g)
  legHit.visible = true
  legHit.material.visible = false

  g.userData = { leftLeg, rightLeg, leftArm, rightArm, muzzle, head, rifle, vestMesh, hitBody, headHit, legHit }
  return g
}

const tempVec = new THREE.Vector3()
const tempVec2 = new THREE.Vector3()

export class EnemyManager {
  constructor(scene, world, effects, audio) {
    this.scene = scene
    this.world = world
    this.effects = effects
    this.audio = audio
    this.enemies = []
    this.hitMeshes = []
    this.raycaster = new THREE.Raycaster()
    this.onKill = null
    this.player = null
    this.variant = 0
  }

  spawn(point) {
    let x = point.x
    let z = point.z
    for (let tries = 0; tries < 14; tries++) {
      if (!this.insideCollider(x, z, 0.7)) break
      x = point.x + (Math.random() - 0.5) * 6
      z = point.z + (Math.random() - 0.5) * 6
    }
    const variants = [
      { uniform: 0x6c6a4e, vest: 0x3f4236, scarf: 0x8c3c2a },
      { uniform: 0x585a46, vest: 0x31342d, scarf: 0x2f4148 },
      { uniform: 0x746e50, vest: 0x46463a, scarf: 0x5b3130 },
      { uniform: 0x53533f, vest: 0x2e3029, scarf: 0x6b5b37 }
    ]
    const model = createSoldierModel(variants[this.variant++ % variants.length])
    model.position.set(x, 0, z)
    this.scene.add(model)

    const enemy = {
      model,
      position: new THREE.Vector3(x, 0, z),
      health: 100,
      alive: true,
      dying: false,
      deathT: 0,
      speed: 1.5 + Math.random() * 0.7,
      strafe: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 0,
      shootTimer: 1.2 + Math.random() * 2,
      burst: 0,
      burstTimer: 0,
      canSee: false,
      losTimer: Math.random() * 0.4,
      walkPhase: Math.random() * 10,
      flinch: 0,
      aimYaw: 0,
      spawnGrace: 0.8
    }
    model.userData.enemy = enemy

    const parts = [
      [model.userData.hitBody, 'body'],
      [model.userData.headHit, 'head'],
      [model.userData.legHit, 'legs']
    ]
    parts.forEach(([mesh, name]) => {
      mesh.userData.enemy = enemy
      mesh.userData.part = name
      mesh.material.visible = false
      this.hitMeshes.push(mesh)
    })
    this.enemies.push(enemy)
    return enemy
  }

  insideCollider(x, z, radius) {
    for (const c of this.world.colliders) {
      const cx = Math.max(c.minX, Math.min(c.maxX, x))
      const cz = Math.max(c.minZ, Math.min(c.maxZ, z))
      if ((x - cx) ** 2 + (z - cz) ** 2 < radius * radius) return true
    }
    return false
  }

  removeEnemy(enemy) {
    enemy.alive = false
    enemy.dying = true
    enemy.deathT = 0
    const parts = [enemy.model.userData.hitBody, enemy.model.userData.headHit, enemy.model.userData.legHit]
    parts.forEach((mesh) => {
      const idx = this.hitMeshes.indexOf(mesh)
      if (idx >= 0) this.hitMeshes.splice(idx, 1)
    })
  }

  damage(enemy, amount, headshot = false, point = null) {
    if (!enemy || !enemy.alive) return false
    enemy.health -= amount
    enemy.flinch = 1
    enemy.canSee = true
    if (enemy.health <= 0) {
      this.removeEnemy(enemy)
      if (this.onKill) this.onKill(enemy, headshot)
      return true
    }
    return false
  }

  update(dt, player) {
    this.player = player
    const playerPos = player.position
    for (const enemy of this.enemies) {
      const model = enemy.model
      if (enemy.dying) {
        enemy.deathT += dt
        model.rotation.x += (-Math.PI / 2 - model.rotation.x) * Math.min(1, dt * 6)
        model.position.y -= dt * 0.22
        if (enemy.deathT > 4.5) {
          this.scene.remove(model)
          enemy.dying = false
          enemy.alive = false
          enemy.removed = true
        }
        continue
      }
      if (!enemy.alive) continue

      enemy.spawnGrace -= dt
      if (enemy.spawnGrace > 0) continue
      enemy.flinch *= Math.exp(-8 * dt)

      const dx = playerPos.x - enemy.position.x
      const dz = playerPos.z - enemy.position.z
      const dist = Math.hypot(dx, dz)
      const targetYaw = Math.atan2(dx, dz)
      let yawDiff = targetYaw - model.rotation.y
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
      model.rotation.y += yawDiff * Math.min(1, dt * 5)

      enemy.losTimer -= dt
      if (enemy.losTimer <= 0) {
        enemy.losTimer = 0.3 + Math.random() * 0.2
        enemy.canSee = this.lineOfSight(enemy.position, playerPos, dist)
      }

      const ideal = 11 + (enemy.variantIndex || 0) * 0.5
      let moveX = 0
      let moveZ = 0
      if (dist > ideal + 4 || !enemy.canSee) {
        moveX = (dx / Math.max(dist, 0.001)) * enemy.speed
        moveZ = (dz / Math.max(dist, 0.001)) * enemy.speed
      } else if (dist < 7) {
        moveX = -(dx / Math.max(dist, 0.001)) * enemy.speed * 0.8
        moveZ = -(dz / Math.max(dist, 0.001)) * enemy.speed * 0.8
      } else {
        enemy.strafeTimer -= dt
        if (enemy.strafeTimer <= 0) {
          enemy.strafeTimer = 1.2 + Math.random() * 1.8
          enemy.strafe *= -1
        }
        moveX = (-dz / Math.max(dist, 0.001)) * enemy.strafe * enemy.speed * 0.65
        moveZ = (dx / Math.max(dist, 0.001)) * enemy.strafe * enemy.speed * 0.65
      }

      enemy.position.x += moveX * dt
      enemy.position.z += moveZ * dt
      this.resolveCollision(enemy)

      const moving = Math.hypot(moveX, moveZ) > 0.1
      if (moving) {
        enemy.walkPhase += dt * 4.6
        const swing = Math.sin(enemy.walkPhase) * 0.62
        model.userData.leftLeg.rotation.x = swing
        model.userData.rightLeg.rotation.x = -swing
      } else {
        model.userData.leftLeg.rotation.x *= Math.exp(-8 * dt)
        model.userData.rightLeg.rotation.x *= Math.exp(-8 * dt)
      }
      model.userData.leftArm.rotation.x = Math.sin(enemy.walkPhase) * 0.08 - 0.12
      model.userData.rightArm.rotation.x = -Math.sin(enemy.walkPhase) * 0.08 - 0.12
      model.rotation.z = Math.sin(enemy.walkPhase * 0.5) * 0.02 + enemy.flinch * 0.06
      model.position.set(enemy.position.x, 0, enemy.position.z)

      const eye = tempVec.set(enemy.position.x, 1.55, enemy.position.z)
      const playerChest = tempVec2.set(playerPos.x, playerPos.y - 0.2, playerPos.z)
      const aim = playerChest.clone().sub(eye)
      const aimYaw = Math.atan2(aim.x, aim.z)
      model.rotation.y = aimYaw

      if (enemy.canSee && dist < 55) {
        enemy.shootTimer -= dt
        if (enemy.burst > 0) {
          enemy.burstTimer -= dt
          if (enemy.burstTimer <= 0) {
            enemy.burst--
            enemy.burstTimer = 0.12
            this.enemyShoot(enemy, dist, eye, playerChest)
          }
        } else if (enemy.shootTimer <= 0) {
          enemy.shootTimer = 1.5 + Math.random() * 2.1
          enemy.burst = 2 + ((Math.random() * 2) | 0)
          enemy.burstTimer = 0
        }
      } else {
        enemy.shootTimer = Math.max(enemy.shootTimer, 0.5)
      }
    }
    this.enemies = this.enemies.filter((e) => !e.removed)
  }

  resolveCollision(enemy) {
    const p = enemy.position
    const radius = 0.42
    for (const c of this.world.colliders) {
      const cx = Math.max(c.minX, Math.min(c.maxX, p.x))
      const cz = Math.max(c.minZ, Math.min(c.maxZ, p.z))
      let dx = p.x - cx
      let dz = p.z - cz
      const dist = Math.hypot(dx, dz)
      if (dist < radius) {
        if (dist < 0.0001) {
          p.z = c.maxZ + radius
        } else {
          const push = (radius - dist) / dist
          p.x += dx * push
          p.z += dz * push
        }
      }
    }
    p.x = Math.max(this.world.bounds.minX + 1, Math.min(this.world.bounds.maxX - 1, p.x))
    p.z = Math.max(this.world.bounds.minZ + 1, Math.min(this.world.bounds.maxZ - 1, p.z))
  }

  lineOfSight(from, playerPos, dist) {
    const origin = new THREE.Vector3(from.x, 1.55, from.z)
    const target = new THREE.Vector3(playerPos.x, playerPos.y - 0.15, playerPos.z)
    const dir = target.clone().sub(origin).normalize()
    this.raycaster.set(origin, dir)
    this.raycaster.far = dist
    const hits = this.raycaster.intersectObject(this.world.group, true)
    return !hits.length || hits[0].distance > dist - 0.6
  }

  enemyShoot(enemy, dist, eye, playerChest) {
    const model = enemy.model
    const muzzle = new THREE.Vector3()
    model.userData.muzzle.getWorldPosition(muzzle)
    const target = playerChest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.2))
    const dir = target.clone().sub(muzzle).normalize()
    this.effects.tracer(muzzle, target, true)
    this.effects.muzzleFlash(muzzle, dir, 0.55)
    this.audio.enemyShot(dist)
    const chance = Math.max(0.1, Math.min(0.38, 0.46 - dist * 0.0075))
    if (Math.random() < chance && this.player && !this.player.dead) {
      const dmg = 3.6 + Math.random() * 2.8 + Math.max(0, (16 - dist) * 0.12)
      this.player.takeDamage(dmg, enemy.position)
    }
  }

  clear() {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.model)
      enemy.model.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose()
          if (o.material && o.material.dispose) o.material.dispose()
        }
      })
    }
    this.enemies.length = 0
    this.hitMeshes.length = 0
  }
}
