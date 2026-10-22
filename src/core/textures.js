import * as THREE from 'three'

const cache = new Map()

function canvas(size = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')]
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function speckle(ctx, size, count, colors, alpha = 0.35, maxSize = 3) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * rand(0.3, 1)
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0]
    const s = rand(0.6, maxSize)
    ctx.fillRect(rand(0, size), rand(0, size), s, s)
  }
  ctx.globalAlpha = 1
}

function toTexture(c, repeat = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = 4
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

export function sandTexture() {
  return memo('sand', () => {
    const size = 512
    const [c, ctx] = canvas(size)
    const g = ctx.createLinearGradient(0, 0, size, size)
    g.addColorStop(0, '#c8a374')
    g.addColorStop(0.45, '#bd9868')
    g.addColorStop(1, '#ceac7c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = rand(0.03, 0.1)
      ctx.fillStyle = Math.random() > 0.5 ? '#e6cfa6' : '#9a774c'
      ctx.beginPath()
      ctx.ellipse(rand(0, size), rand(0, size), rand(30, 120), rand(12, 50), rand(0, Math.PI), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    ctx.strokeStyle = 'rgba(122, 90, 55, 0.25)'
    for (let i = 0; i < 40; i++) {
      ctx.lineWidth = rand(1, 2.4)
      ctx.beginPath()
      const y = rand(0, size)
      ctx.moveTo(0, y)
      for (let x = 0; x <= size; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 5)
      ctx.stroke()
    }

    speckle(ctx, size, 9500, ['#8a6a43', '#e8d1a7', '#b58e5c', '#7a5d3b'], 0.4, 2.2)
    return toTexture(c, 18)
  })
}

export function plasterTexture(base = '#c9aa7f', dark = '#a98a60') {
  return memo('plaster' + base, () => {
    const size = 512
    const [c, ctx] = canvas(size)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = rand(0.03, 0.13)
      ctx.fillStyle = Math.random() > 0.5 ? '#fff3d6' : dark
      ctx.beginPath()
      ctx.ellipse(rand(0, size), rand(0, size), rand(15, 90), rand(10, 55), rand(0, Math.PI), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    ctx.strokeStyle = 'rgba(92, 69, 43, 0.35)'
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = rand(0.8, 2)
      ctx.beginPath()
      let x = rand(0, size)
      let y = rand(0, size)
      ctx.moveTo(x, y)
      for (let s = 0; s < 4; s++) {
        x += rand(-26, 26)
        y += rand(8, 32)
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(255, 244, 220, 0.28)'
    ctx.lineWidth = 4
    for (let i = 0; i < 6; i++) {
      const y = rand(0, size)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y + rand(-6, 6))
      ctx.stroke()
    }

    speckle(ctx, size, 5200, ['#7d5f3c', '#f2dfba', '#a9885b'], 0.3, 2.4)
    return toTexture(c, 2)
  })
}

export function brickTexture(base = '#b98f62') {
  return memo('brick' + base, () => {
    const size = 512
    const [c, ctx] = canvas(size)
    ctx.fillStyle = '#8a6a48'
    ctx.fillRect(0, 0, size, size)
    const rows = 16
    const bh = size / rows
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 ? bh : 0
      for (let x = -bh * 2; x < size + bh * 2; x += bh * 2) {
        const tone = rand(-14, 14)
        ctx.fillStyle = `hsl(31 30% ${48 + tone * 0.4}%)`
        ctx.fillRect(x + offset + 2, r * bh + 2, bh * 2 - 4, bh - 4)
        ctx.strokeStyle = 'rgba(255,225,180,0.16)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + offset + 3, r * bh + 3, bh * 2 - 6, bh - 6)
      }
    }
    speckle(ctx, size, 2400, ['#6b5136', '#e1c393'], 0.35, 2)
    return toTexture(c, 3)
  })
}

export function asphaltTexture() {
  return memo('asphalt', () => {
    const size = 512
    const [c, ctx] = canvas(size)
    ctx.fillStyle = '#4a4a48'
    ctx.fillRect(0, 0, size, size)
    speckle(ctx, size, 14000, ['#6d6c66', '#30302e', '#8d8a80', '#242422'], 0.55, 2.6)
    ctx.strokeStyle = 'rgba(20,20,20,0.55)'
    for (let i = 0; i < 14; i++) {
      ctx.lineWidth = rand(1, 2.6)
      ctx.beginPath()
      let x = rand(0, size)
      let y = rand(0, size)
      ctx.moveTo(x, y)
      for (let s = 0; s < 6; s++) {
        x += rand(-24, 24)
        y += rand(14, 46)
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = rand(0.05, 0.18)
      ctx.fillStyle = '#b9a57f'
      ctx.beginPath()
      ctx.ellipse(rand(0, size), rand(0, size), rand(10, 50), rand(6, 26), rand(0, 3), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    return toTexture(c, 10)
  })
}

export function dirtTexture() {
  return memo('dirt', () => {
    const size = 512
    const [c, ctx] = canvas(size)
    ctx.fillStyle = '#8b6a46'
    ctx.fillRect(0, 0, size, size)
    speckle(ctx, size, 12000, ['#6d5234', '#a88858', '#5a432c', '#c3a574'], 0.5, 3)
    return toTexture(c, 12)
  })
}

export function rugTexture() {
  return memo('rug', () => {
    const size = 512
    const [c, ctx] = canvas(size)
    ctx.fillStyle = '#7d2320'
    ctx.fillRect(0, 0, size, size)
    const colors = ['#d8a83e', '#e7dcc0', '#255b52', '#b54b2c', '#1b2b46']
    for (let ring = 0; ring < 5; ring++) {
      ctx.strokeStyle = colors[ring % colors.length]
      ctx.lineWidth = 10
      ctx.strokeRect(18 + ring * 16, 18 + ring * 16, size - 36 - ring * 32, size - 36 - ring * 32)
    }
    for (let y = 60; y < size - 60; y += 64) {
      for (let x = 60; x < size - 60; x += 64) {
        ctx.fillStyle = colors[((x + y) / 64) % colors.length | 0]
        ctx.beginPath()
        ctx.moveTo(x, y - 18)
        ctx.lineTo(x + 18, y)
        ctx.lineTo(x, y + 18)
        ctx.lineTo(x - 18, y)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    for (let i = 0; i < 90; i++) {
      ctx.beginPath()
      ctx.moveTo(rand(0, size), 0)
      ctx.lineTo(rand(0, size), size)
      ctx.stroke()
    }
    return toTexture(c, 1)
  })
}

export function signTexture(text, { bg = '#164238', fg = '#f3d98d', accent = '#d9a441', sub = '' } = {}) {
  const key = 'sign' + text + bg + fg + sub
  return memo(key, () => {
    const [c, ctx] = canvas(512)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 512, 512)
    const grad = ctx.createLinearGradient(0, 0, 512, 512)
    grad.addColorStop(0, 'rgba(255,255,255,0.12)')
    grad.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)

    ctx.strokeStyle = accent
    ctx.lineWidth = 10
    ctx.strokeRect(22, 22, 468, 468)
    ctx.lineWidth = 3
    ctx.strokeRect(38, 38, 436, 436)

    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = "900 118px Cairo, 'Noto Naskh Arabic', serif"
    ctx.fillText(text, 256, sub ? 226 : 256)
    if (sub) {
      ctx.font = '600 46px Cairo, sans-serif'
      ctx.fillStyle = accent
      ctx.fillText(sub, 256, 330)
    }
    speckle(ctx, 512, 900, ['#000000', '#ffffff'], 0.05, 3)
    return toTexture(c, 1)
  })
}

export function posterTexture(text, { bg = '#1c3b63', fg = '#f4e5b7' } = {}) {
  const key = 'poster' + text + bg
  return memo(key, () => {
    const [c, ctx] = canvas(512)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 6
    ctx.strokeRect(16, 16, 480, 480)
    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    ctx.font = '900 96px Cairo, sans-serif'
    ctx.fillText(text, 256, 210)
    ctx.font = '600 40px Cairo, sans-serif'
    ctx.fillText('الرافدين', 256, 300)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(90, 350, 332, 6)
    speckle(ctx, 512, 2000, ['#000', '#fff'], 0.08, 3)
    return toTexture(c, 1)
  })
}

export function metalTexture() {
  return memo('metal', () => {
    const size = 256
    const [c, ctx] = canvas(size)
    ctx.fillStyle = '#5b5d5a'
    ctx.fillRect(0, 0, size, size)
    speckle(ctx, size, 4000, ['#84867e', '#343632', '#a17b4b'], 0.4, 2.4)
    for (let i = 0; i < 18; i++) {
      ctx.globalAlpha = rand(0.06, 0.2)
      ctx.fillStyle = '#8a5a2c'
      ctx.beginPath()
      ctx.ellipse(rand(0, size), rand(0, size), rand(4, 22), rand(3, 14), rand(0, 3), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    return toTexture(c, 2)
  })
}

export function woodTexture() {
  return memo('wood', () => {
    const size = 256
    const [c, ctx] = canvas(size)
    ctx.fillStyle = '#7a5734'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 34; i++) {
      ctx.strokeStyle = `rgba(${60 + Math.random() * 50}, ${40 + Math.random() * 32}, 20, ${rand(0.12, 0.35)})`
      ctx.lineWidth = rand(1, 4)
      ctx.beginPath()
      ctx.moveTo(0, rand(0, size))
      ctx.bezierCurveTo(size * 0.3, rand(0, size), size * 0.6, rand(0, size), size, rand(0, size))
      ctx.stroke()
    }
    speckle(ctx, size, 1500, ['#5a3f25', '#c19a66'], 0.3, 2)
    return toTexture(c, 2)
  })
}

export function waterTexture() {
  return memo('water', () => {
    const size = 512
    const [c, ctx] = canvas(size)
    const g = ctx.createLinearGradient(0, 0, 0, size)
    g.addColorStop(0, '#335f5a')
    g.addColorStop(0.5, '#2a4f4c')
    g.addColorStop(1, '#426b5e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 420; i++) {
      ctx.strokeStyle = `rgba(${180 + Math.random() * 60}, ${200 + Math.random() * 40}, 190, ${rand(0.03, 0.16)})`
      ctx.lineWidth = rand(1, 3)
      ctx.beginPath()
      const y = rand(0, size)
      ctx.moveTo(rand(-30, size), y)
      ctx.quadraticCurveTo(rand(0, size), y + rand(-10, 10), rand(0, size), y + rand(-4, 4))
      ctx.stroke()
    }
    return toTexture(c, 6)
  })
}

export function graniteTexture() {
  return memo('granite', () => {
    const size = 512
    const [c, ctx] = canvas(size)
    ctx.fillStyle = '#9a8b72'
    ctx.fillRect(0, 0, size, size)
    const rows = 8
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 ? 40 : 0
      for (let x = -80; x < size + 80; x += 80) {
        ctx.fillStyle = `hsl(35 16% ${58 + rand(-9, 9)}%)`
        ctx.fillRect(x + offset + 2, r * 64 + 2, 76, 60)
      }
    }
    speckle(ctx, size, 8000, ['#6d6252', '#c3b79c', '#4d4438'], 0.35, 3)
    return toTexture(c, 4)
  })
}

export function smokeTexture() {
  return memo('smoke', () => {
    const [c, ctx] = canvas(128)
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return toTexture(c, 1)
  })
}

export function flashTexture() {
  return memo('flash', () => {
    const [c, ctx] = canvas(256)
    ctx.translate(128, 128)
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 120)
    g.addColorStop(0, 'rgba(255,255,240,1)')
    g.addColorStop(0.16, 'rgba(255,226,150,0.95)')
    g.addColorStop(0.5, 'rgba(255,140,40,0.42)')
    g.addColorStop(1, 'rgba(255,90,10,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const r = i % 2 ? 34 : 122
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
    return toTexture(c, 1)
  })
}

export function holeTexture() {
  return memo('hole', () => {
    const [c, ctx] = canvas(128)
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 58)
    g.addColorStop(0, 'rgba(12,10,8,0.95)')
    g.addColorStop(0.4, 'rgba(30,24,18,0.7)')
    g.addColorStop(1, 'rgba(20,16,12,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return toTexture(c, 1)
  })
}

export function sunTexture() {
  return memo('sun', () => {
    const [c, ctx] = canvas(256)
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 126)
    g.addColorStop(0, 'rgba(255,255,246,1)')
    g.addColorStop(0.08, 'rgba(255,244,205,0.98)')
    g.addColorStop(0.22, 'rgba(255,219,150,0.55)')
    g.addColorStop(0.55, 'rgba(255,185,100,0.12)')
    g.addColorStop(1, 'rgba(255,170,80,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    return toTexture(c, 1)
  })
}

export function cloudTexture() {
  return memo('cloud', () => {
    const [c, ctx] = canvas(512)
    for (let i = 0; i < 26; i++) {
      const x = rand(90, 422)
      const y = rand(160, 350)
      const r = rand(35, 110)
      const g = ctx.createRadialGradient(x, y, 1, x, y, r)
      g.addColorStop(0, 'rgba(255,255,255,0.20)')
      g.addColorStop(0.6, 'rgba(255,245,230,0.08)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    return toTexture(c, 1)
  })
}

export function dustTexture() {
  return memo('dust', () => {
    const [c, ctx] = canvas(64)
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30)
    g.addColorStop(0, 'rgba(240,220,180,0.9)')
    g.addColorStop(0.45, 'rgba(220,190,140,0.35)')
    g.addColorStop(1, 'rgba(210,180,130,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return toTexture(c, 1)
  })
}
