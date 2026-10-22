const DIRS = [
  [0, 'ش', true], [45, 'ش.ق', false], [90, 'ق', true], [135, 'ج.ق', false],
  [180, 'ج', true], [225, 'ج.غ', false], [270, 'غ', true], [315, 'ش.غ', false]
]

export class HUD {
  constructor() {
    this.root = document.getElementById('hud')
    this.healthPanel = document.getElementById('health-panel')
    this.healthFill = document.getElementById('health-fill')
    this.healthValue = document.getElementById('health-value')
    this.lowPulse = document.getElementById('low-hp-pulse')
    this.ammoPanel = document.getElementById('ammo-panel')
    this.ammoMag = document.getElementById('ammo-mag')
    this.ammoReserve = document.getElementById('ammo-reserve')
    this.ammoFill = document.getElementById('ammo-fill')
    this.waveCurrent = document.getElementById('wave-current')
    this.waveTotal = document.getElementById('wave-total')
    this.waveEnemies = document.getElementById('wave-enemies')
    this.score = document.getElementById('score-value')
    this.objective = document.getElementById('objective-text')
    this.objectiveSub = document.getElementById('objective-sub')
    this.killfeed = document.getElementById('killfeed')
    this.announceEl = document.getElementById('announce')
    this.announceTitle = document.getElementById('announce-title')
    this.announceSub = document.getElementById('announce-sub')
    this.hitmarker = document.getElementById('hitmarker')
    this.compassTrack = document.getElementById('compass-track')
    this.damageVignette = document.getElementById('damage-vignette')
    this.damageDirection = document.getElementById('damage-direction')
    this.grenadeCount = document.getElementById('grenade-count')
    this.lastHealth = -1
    this.announceTimer = 0
    this.hitTimer = 0
    this.buildCompass()
  }

  buildCompass() {
    let html = ''
    for (let deg = -45; deg <= 765; deg += 15) {
      const norm = ((deg % 360) + 360) % 360
      const dir = DIRS.find((d) => d[0] === norm)
      if (dir) {
        html += `<span class="compass-label${dir[2] ? ' card' : ''}" style="left:${deg * 2}px">${dir[1]}</span>`
      } else {
        html += `<span class="compass-tick" style="left:${deg * 2}px"></span>`
      }
    }
    this.compassTrack.innerHTML = html
  }

  show() { this.root.classList.remove('hidden') }
  hide() {
    this.root.classList.add('hidden')
    this.killfeed.innerHTML = ''
    this.damageVignette.style.setProperty('--damage', 0)
    this.damageDirection.style.opacity = 0
  }

  setHealth(health, max = 100) {
    const rounded = Math.ceil(health)
    if (rounded !== this.lastHealth) {
      this.lastHealth = rounded
      this.healthValue.textContent = rounded
      this.healthFill.style.width = `${Math.max(0, (health / max) * 100)}%`
      this.healthPanel.classList.toggle('mid', health <= 65 && health > 32)
      this.healthPanel.classList.toggle('low', health <= 32)
      this.lowPulse.classList.toggle('on', health <= 32)
    }
  }

  setAmmo({ ammo, reserve, reloading }) {
    this.ammoMag.textContent = ammo
    this.ammoReserve.textContent = reserve
    this.ammoFill.style.width = `${(ammo / 30) * 100}%`
    this.ammoPanel.classList.toggle('empty', ammo === 0)
    this.ammoPanel.classList.toggle('reloading', !!reloading)
  }

  setWave(current, total, remaining) {
    this.waveCurrent.textContent = current
    this.waveTotal.textContent = total
    this.waveEnemies.textContent = `${remaining} متبقٍ`
  }

  setScore(score) {
    this.score.textContent = score.toLocaleString('ar-EG')
  }

  setObjective(text, sub) {
    this.objective.textContent = text
    if (sub) this.objectiveSub.textContent = sub
  }

  setGrenades(count) {
    const b = this.grenadeCount.querySelector('b')
    if (b) b.textContent = `x${count}`
  }

  updateCompass(yaw) {
    let heading = ((-yaw * 180) / Math.PI) % 360
    if (heading < 0) heading += 360
    this.compassTrack.style.transform = `translate3d(${-heading * 2}px,0,0)`
  }

  hit(headshot) {
    this.hitmarker.classList.remove('show')
    this.hitmarker.classList.toggle('head', headshot)
    void this.hitmarker.offsetWidth
    this.hitmarker.classList.add('show')
    clearTimeout(this.hitTimer)
    this.hitTimer = setTimeout(() => this.hitmarker.classList.remove('show'), 190)
  }

  addKill(headshot, points = 100) {
    const el = document.createElement('div')
    el.className = `kill-item${headshot ? ' head' : ''}`
    el.innerHTML = `<span class="ks">+${points}</span><span>${headshot ? 'إصابة قاتلة · رأس' : 'تم القضاء على العدو'}</span>`
    this.killfeed.appendChild(el)
    while (this.killfeed.children.length > 4) this.killfeed.removeChild(this.killfeed.firstChild)
    setTimeout(() => el.remove(), 3100)
  }

  announce(title, sub = '', variant = '', duration = 1900) {
    this.announceTitle.textContent = title
    this.announceSub.textContent = sub
    this.announceEl.className = `show ${variant}`
    clearTimeout(this.announceTimer)
    this.announceTimer = setTimeout(() => {
      this.announceEl.className = ''
    }, duration)
  }

  update(player, grace = 0) {
    if (!player) return
    this.setHealth(player.health, player.maxHealth)
    this.updateCompass(player.yaw)
    const since = player.time - player.lastDamageAt
    const recent = Math.max(0, 1 - since / 1.6)
    const low = player.health <= 32 && !player.dead ? 0.22 + Math.sin(player.time * 5) * 0.1 : 0
    const damage = Math.max(recent * 0.7, low)
    this.damageVignette.style.setProperty('--damage', damage.toFixed(3))
    if (player.lastDamageFrom && since < 1.6) {
      const dx = player.lastDamageFrom.x - player.position.x
      const dz = player.lastDamageFrom.z - player.position.z
      const cy = Math.cos(player.yaw)
      const sy = Math.sin(player.yaw)
      const localX = dx * cy - dz * sy
      const localForward = -dx * sy - dz * cy
      const angle = (Math.atan2(localX, localForward) * 180) / Math.PI
      this.damageDirection.style.setProperty('--angle', `${angle.toFixed(1)}deg`)
      this.damageDirection.style.opacity = (recent * 0.9).toFixed(2)
    } else {
      this.damageDirection.style.opacity = 0
    }
  }
}
