import { Game } from './game/Game.js'

function showFatal(message) {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:#070b0a;color:#f0e6d2;font-family:Cairo,sans-serif;text-align:center;padding:30px;line-height:1.9'
  el.innerHTML = `<div><div style="font-size:34px;color:#ecc37a;margin-bottom:12px">تعذّر تشغيل اللعبة</div><div style="font-size:14px;color:#a8a18e">${message}</div></div>`
  document.body.appendChild(el)
}

async function boot() {
  try {
    if (!window.WebGLRenderingContext) throw new Error('متصفحك لا يدعم WebGL.')
    await document.fonts.ready
    const canvas = document.getElementById('scene')
    const game = new Game(canvas)
    document.body.classList.add('booted')
    window.addEventListener('beforeunload', () => {
      game.audio?.ctx?.close?.()
    })
  } catch (error) {
    console.error(error)
    showFatal(error?.message || 'حدث خطأ غير متوقع أثناء التحميل.')
  }
}

boot()
