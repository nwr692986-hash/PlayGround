import * as THREE from 'three'
import { smokeTexture, flashTexture, holeTexture, dustTexture } from '../core/textures.js'

export class Effects {
  constructor(scene) {
    this.scene = scene
    this.timers = []
    this.decals = []
    this.flashLight = new THREE.PointLight(0xffc175, 0, 9, 2)
    scene.add(this.flashLight)
    this.flashTimer = 0

    this.shellGeo = new THREE.BoxGeometry(0.022, 0.022, 0.055)
    this.shellMat = new THREE.MeshStandardMaterial({ color: 0xc9a13a, metalness: 0.8, roughness: 0.35 })
    this.sparkMat = new THREE.SpriteMaterial({ map: flashTexture(), color: 0xffb15a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    this.smokeMat = new THREE.SpriteMaterial({ map: smokeTexture(), color: 0xcdbb9c, transparent: true, depthWrite: false })
    this.dustMat = new THREE.SpriteMaterial({ map: dustTexture(), color: 0xd9bf91, transparent: true, depthWrite: false })
    this.bloodMat = new THREE.SpriteMaterial({ map: dustTexture(), color: 0x7a2b20, transparent: true, depthWrite: false })
    this.holeMat = new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffd48a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    this.enemyTracerMat = new THREE.LineBasicMaterial({ color: 0xff8a52, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  }

  schedule(duration, update) {
    this.timers.push({ t: 0, duration, update })
  }

  muzzleFlash(position, direction, scale = 1) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flashTexture(), color: 0xffd9a0, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95
    }))
    sprite.position.copy(position)
    sprite.scale.setScalar(0.42 * scale)
    sprite.material.rotation = Math.random() * Math.PI
    this.scene.add(sprite)
    this.schedule(0.07, (k) => {
      sprite.material.opacity = 0.95 * (1 - k)
      sprite.scale.setScalar(0.42 * scale + k * 0.4)
      if (k >= 1) this.scene.remove(sprite)
    })

    this.flashLight.position.copy(position).addScaledVector(direction, 0.4)
    this.flashLight.intensity = 14 * scale
    this.flashTimer = 0.08
  }

  tracer(from, to, enemy = false) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()])
    const line = new THREE.Line(geo, (enemy ? this.enemyTracerMat : this.tracerMat).clone())
    line.frustumCulled = false
    this.scene.add(line)
    this.schedule(0.09, (k) => {
      line.material.opacity = (enemy ? 0.8 : 0.85) * (1 - k)
      if (k >= 1) {
        this.scene.remove(line)
        geo.dispose()
        line.material.dispose()
      }
    })
  }

  impact(point, normal, enemy = false) {
    const puff = new THREE.Sprite((enemy ? this.bloodMat : this.dustMat).clone())
    puff.position.copy(point).addScaledVector(normal, 0.06)
    puff.scale.setScalar(enemy ? 0.28 : 0.24)
    puff.material.opacity = 0.75
    this.scene.add(puff)
    this.schedule(0.38, (k) => {
      puff.material.opacity = 0.75 * (1 - k)
      puff.scale.setScalar((enemy ? 0.28 : 0.24) + k * 0.55)
      if (k >= 1) {
        this.scene.remove(puff)
        puff.material.dispose()
      }
    })

    if (!enemy) {
      for (let i = 0; i < 3; i++) {
        const spark = new THREE.Sprite(this.sparkMat.clone())
        spark.position.copy(point)
        spark.scale.setScalar(0.05)
        spark.material.opacity = 0.9
        this.scene.add(spark)
        const vel = normal.clone().multiplyScalar(1.2).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.6, (Math.random() - 0.5) * 2))
        let px = point.x, py = point.y, pz = point.z
        this.schedule(0.22, (k, dt) => {
          px += vel.x * dt
          py += vel.y * dt
          pz += vel.z * dt
          vel.y -= 7 * dt
          spark.position.set(px, py, pz)
          spark.material.opacity = 0.9 * (1 - k)
          if (k >= 1) {
            this.scene.remove(spark)
            spark.material.dispose()
          }
        })
      }

      if (this.decals.length > 42) {
        const old = this.decals.shift()
        this.scene.remove(old)
        old.geometry.dispose()
      }
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), this.holeMat)
      decal.position.copy(point).addScaledVector(normal, 0.018)
      decal.lookAt(point.clone().add(normal))
      this.scene.add(decal)
      this.decals.push(decal)
    }
  }

  shell(position, right, up) {
    const shell = new THREE.Mesh(this.shellGeo, this.shellMat)
    shell.position.copy(position)
    this.scene.add(shell)
    const vel = new THREE.Vector3(
      right.x * (1.6 + Math.random()) + (Math.random() - 0.5) * 0.6,
      1.4 + Math.random() * 0.8,
      right.z * (1.6 + Math.random()) + (Math.random() - 0.5) * 0.6
    )
    let vx = vel.x, vy = vel.y, vz = vel.z
    this.schedule(1.1, (k, dt) => {
      vy -= 11 * dt
      vx *= 0.99
      vz *= 0.99
      shell.position.x += vx * dt
      shell.position.y += vy * dt
      shell.position.z += vz * dt
      shell.rotation.x += dt * 22
      shell.rotation.z += dt * 17
      if (shell.position.y < 0.03) {
        shell.position.y = 0.03
        vy *= -0.35
        vx *= 0.6
        vz *= 0.6
      }
      if (k >= 1) this.scene.remove(shell)
    })
  }

  explosion(position) {
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flashTexture(), color: 0xffc06a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1
    }))
    flash.position.copy(position)
    flash.scale.setScalar(1.5)
    this.scene.add(flash)
    this.schedule(0.28, (k) => {
      flash.material.opacity = 1 - k
      flash.scale.setScalar(1.5 + k * 7)
      if (k >= 1) {
        this.scene.remove(flash)
        flash.material.dispose()
      }
    })

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
    )
    ball.position.copy(position)
    this.scene.add(ball)
    this.schedule(0.45, (k) => {
      ball.scale.setScalar(1 + k * 2.4)
      ball.material.opacity = 0.9 * (1 - k)
      if (k >= 1) {
        this.scene.remove(ball)
        ball.geometry.dispose()
        ball.material.dispose()
      }
    })

    for (let i = 0; i < 14; i++) {
      const smoke = new THREE.Sprite(this.smokeMat.clone())
      smoke.position.copy(position)
      const a = Math.random() * Math.PI * 2
      const sp = 1.2 + Math.random() * 2.6
      const vx = Math.cos(a) * sp
      const vz = Math.sin(a) * sp
      const vy = 0.6 + Math.random() * 1.8
      smoke.scale.setScalar(0.8 + Math.random() * 0.8)
      smoke.material.opacity = 0.55
      smoke.material.color = new THREE.Color(i % 3 ? 0xb7ab99 : 0x5d554b)
      this.scene.add(smoke)
      let px = position.x, py = position.y, pz = position.z
      this.schedule(1.6, (k, dt) => {
        px += vx * dt
        py += vy * dt
        pz += vz * dt
        smoke.position.set(px, py, pz)
        smoke.scale.setScalar(1 + k * 4)
        smoke.material.opacity = 0.55 * (1 - k)
        if (k >= 1) {
          this.scene.remove(smoke)
          smoke.material.dispose()
        }
      })
    }

    this.flashLight.position.copy(position)
    this.flashLight.intensity = 60
    this.flashTimer = 0.35

    for (let i = 0; i < 16; i++) {
      const spark = new THREE.Sprite(this.sparkMat.clone())
      spark.position.copy(position)
      spark.scale.setScalar(0.12)
      this.scene.add(spark)
      const a = Math.random() * Math.PI * 2
      const el = Math.random() * Math.PI * 0.5
      const sp = 4 + Math.random() * 9
      const vx = Math.cos(a) * Math.cos(el) * sp
      const vz = Math.sin(a) * Math.cos(el) * sp
      let vy = Math.sin(el) * sp + 2
      let px = position.x, py = position.y, pz = position.z
      this.schedule(0.9, (k, dt) => {
        px += vx * dt
        py += vy * dt
        pz += vz * dt
        vy -= 12 * dt
        spark.position.set(px, py, pz)
        spark.material.opacity = 1 - k
        if (k >= 1) {
          this.scene.remove(spark)
          spark.material.dispose()
        }
      })
    }
  }

  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const timer = this.timers[i]
      timer.t += dt
      const k = Math.min(1, timer.t / timer.duration)
      timer.update(k, dt)
      if (k >= 1) this.timers.splice(i, 1)
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt
      this.flashLight.intensity *= Math.exp(-24 * dt)
      if (this.flashTimer <= 0) this.flashLight.intensity = 0
    }
  }

  clear() {
    for (const timer of this.timers) timer.update(1, 0)
    this.timers.length = 0
    this.decals.forEach((d) => {
      this.scene.remove(d)
      d.geometry.dispose()
    })
    this.decals.length = 0
    this.flashLight.intensity = 0
  }
}
