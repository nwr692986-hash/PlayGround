import { clamp, formatMoney, timeString, dist2 } from './utils.js';

const MOD_ICONS = {
  godMode: '♥', infiniteAmmo: '∞', superJump: '↑', lowGravity: '☾', speedBoost: '»',
  jetpack: '✦', drift: '≈', neon: '◉', riot: '⚠', chaos: '☠', noWanted: '✕',
};

const DISTRICTS = [
  { name: 'حي الشمس', en: 'SUNSET HEIGHTS', x: -210, z: 140, r: 130 },
  { name: 'وسط المدينة', en: 'DOWNTOWN ARROYO', x: 140, z: 0, r: 150 },
  { name: 'المنطقة الصناعية', en: 'EASTSIDE YARDS', x: 150, z: 150, r: 120 },
  { name: 'شارع المحيط', en: 'OCEAN DRIVE', x: 0, z: 290, r: 120 },
  { name: 'المطار', en: 'SAN ARROYO INTL', x: 300, z: -160, r: 140 },
  { name: 'الضواحي', en: 'WESTSIDE', x: -170, z: -120, r: 130 },
];

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      boot: $('boot'), bootBar: $('bootBar'),
      start: $('startScreen'), playBtn: $('playBtn'), continueBtn: $('continueBtn'),
      hud: $('hud'),
      healthBar: $('healthBar'), healthNum: $('healthNum'), armorBar: $('armorBar'), armorNum: $('armorNum'),
      cash: $('cash'), chips: $('modChips'), stars: [...document.querySelectorAll('#wantedStars i')],
      wantedBadge: $('wantedBadge'),
      clock: $('clock'), district: $('district'), radioName: $('radioName'), radioEn: $('radioEn'),
      minimap: $('minimap'),
      missionPanel: $('missionPanel'), missionTag: $('missionTag'), missionTitle: $('missionTitle'),
      missionObjective: $('missionObjective'), missionDistance: $('missionDistance'),
      location: $('locationBanner'),
      weaponName: $('weaponName'), weaponAmmo: $('weaponAmmo'), weaponIcon: $('weaponIcon'),
      weaponSlots: [...document.querySelectorAll('#weaponSlots span')],
      speedo: $('speedo'), speedNum: $('speedNum'), speedBar: $('speedBar'), gearLabel: $('gearLabel'),
      hints: $('controlsHint'), interact: $('interactPrompt'),
      dialogue: $('dialogue'), dialogueSpeaker: $('dialogueSpeaker'), dialogueText: $('dialogueText'),
      crosshair: $('crosshair'), toasts: $('toasts'),
      missionBanner: $('missionBanner'), mbTitle: $('mbTitle'), mbReward: $('mbReward'),
      modsOverlay: $('modsOverlay'), modsBody: $('modsBody'), modChipsPanel: $('modChipsPanel'), closeMods: $('closeMods'),
      pauseOverlay: $('pauseOverlay'), resumeBtn: $('resumeBtn'), pauseModsBtn: $('pauseModsBtn'),
      saveBtn: $('saveBtn'), helpBtn: $('helpBtn'), restartBtn: $('restartBtn'),
      helpOverlay: $('helpOverlay'), closeHelp: $('closeHelp'),
      wasted: $('wastedOverlay'), story: $('storyOverlay'), storyStats: $('storyStats'), storyContinue: $('storyContinue'),
      error: $('errorOverlay'), errorText: $('errorText'),
      mobile: $('mobileControls'), joystick: $('joystick'), joystickKnob: $('joystickKnob'),
    };
    for (const key of ['playBtn', 'continueBtn', 'modsBody', 'closeMods', 'resumeBtn', 'pauseModsBtn', 'saveBtn',
      'helpBtn', 'restartBtn', 'closeHelp', 'storyContinue']) {
      this[key] = this.el[key];
    }
    this.mapCtx = this.el.minimap.getContext('2d');
    this.lastHintMode = '';
    this.toastTimers = new Set();
    this.dialogueTimer = null;
    this.locationTimer = null;
    this.bannerTimer = null;
    this.mapAccum = 0;
    this.mapCache = null;
  }

  setBoot(p) {
    this.el.bootBar.style.width = `${clamp(p, 0, 1) * 100}%`;
  }

  finishBoot() {
    this.el.boot.classList.add('done');
    setTimeout(() => this.el.boot.classList.add('hidden'), 550);
  }

  showStart(hasSave) {
    this.el.start.classList.remove('hidden');
    this.el.continueBtn.classList.toggle('hidden', !hasSave);
  }

  hideStart() {
    this.el.start.classList.add('hidden');
  }

  showHUD(show = true) {
    this.el.hud.classList.toggle('hidden', !show);
  }

  setInteract(text) {
    if (!text) {
      this.el.interact.classList.add('hidden');
      return;
    }
    this.el.interact.innerHTML = text;
    this.el.interact.classList.remove('hidden');
  }

  toast(message, kind = '', ms = 2800) {
    const node = document.createElement('div');
    node.className = `toast ${kind}`;
    node.textContent = message;
    this.el.toasts.appendChild(node);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstElementChild.remove();
    const timer = setTimeout(() => {
      node.classList.add('out');
      const t2 = setTimeout(() => { node.remove(); this.toastTimers.delete(t2); }, 380);
      this.toastTimers.add(t2);
    }, ms);
    this.toastTimers.add(timer);
  }

  dialogue(speaker, text, ms = 4600) {
    this.el.dialogueSpeaker.textContent = speaker;
    this.el.dialogueText.textContent = text;
    this.el.dialogue.classList.remove('hidden');
    clearTimeout(this.dialogueTimer);
    this.dialogueTimer = setTimeout(() => this.el.dialogue.classList.add('hidden'), ms);
  }

  hideDialogue() {
    clearTimeout(this.dialogueTimer);
    this.el.dialogue.classList.add('hidden');
  }

  showLocation(name, en) {
    this.el.location.innerHTML = `<div class="loc-en">${en}</div><div class="loc-ar">${name}</div>`;
    this.el.location.classList.remove('hidden');
    const clone = this.el.location.cloneNode(true);
    this.el.location.replaceWith(clone);
    this.el.location = clone;
    clearTimeout(this.locationTimer);
    this.locationTimer = setTimeout(() => clone.classList.add('hidden'), 4300);
  }

  missionBanner(title, reward) {
    this.el.mbTitle.textContent = title;
    this.el.mbReward.textContent = reward;
    this.el.missionBanner.classList.remove('hidden');
    const node = this.el.missionBanner;
    node.style.animation = 'none';
    void node.offsetWidth;
    node.style.animation = '';
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => node.classList.add('hidden'), 4100);
  }

  wasted(show) {
    this.el.wasted.classList.toggle('hidden', !show);
  }

  story(stats) {
    this.el.storyStats.innerHTML = stats.map((s) => `<div>${s}</div>`).join('');
    this.el.story.classList.remove('hidden');
  }

  hideStory() {
    this.el.story.classList.add('hidden');
  }

  error(message) {
    this.el.errorText.textContent = message;
    this.el.error.classList.remove('hidden');
    this.el.boot.classList.add('hidden');
  }

  getDistrict(x, z) {
    let best = DISTRICTS[0];
    let bestD = Infinity;
    for (const d of DISTRICTS) {
      const dd = dist2(x, z, d.x, d.z);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }

  buildMods(game) {
    const chips = game.chips;
    const mods = game.modDefs.map((m) => {
      const unlocked = chips >= m.req;
      const on = Boolean(game.mods[m.key]);
      return `
        <button type="button" class="mod-card ${on ? 'on' : ''} ${unlocked ? '' : 'locked'}" data-mod="${m.key}" ${unlocked ? '' : 'disabled'}>
          <div class="mod-top">
            <div class="mod-name">${m.name}</div>
            <div class="mod-icon">${MOD_ICONS[m.key] || '◆'}</div>
          </div>
          <div class="mod-desc">${m.desc}</div>
          ${unlocked ? '' : `<div class="mod-req">🔒 يتطلب ${m.req} شرائح مود</div>`}
          <div class="mod-toggle"></div>
        </button>
      `;
    }).join('');

    const weathers = [
      ['clear', 'صافٍ'], ['sunset', 'غروب'], ['night', 'ليل'], ['rain', 'مطر'],
    ].map(([id, label]) => `<button type="button" class="pill ${game.weather === id ? 'on' : ''}" data-weather="${id}">${label}</button>`).join('');

    const spawns = [
      ['sports', 'رياضية'], ['sedan', 'سيدان'], ['suv', 'دفع رباعي'], ['taxi', 'تاكسي'], ['police', 'شرطة'], ['van', 'فان'],
    ].map(([id, label]) => `<button type="button" class="pill" data-spawn="${id}">${label}</button>`).join('');

    const teleports = [
      ['safehouse', 'حي الشمس'], ['downtown', 'وسط المدينة'], ['park', 'الحديقة'], ['spray', 'الغسيل'], ['beach', 'الشاطئ'], ['airport', 'المطار'],
    ].map(([id, label]) => `<button type="button" class="pill" data-tp="${id}">${label}</button>`).join('');

    this.el.modsBody.innerHTML = `
      <div class="mod-section">
        <div class="section-head"><div class="section-title">مودات الشارع</div><div class="section-hint">افتحها بشرائح المود من المهام</div></div>
        <div class="mod-grid">${mods}</div>
      </div>
      <div class="mod-section">
        <div class="section-head"><div class="section-title">الوقت والجو</div><div class="section-hint">تغيير فوري للمشهد</div></div>
        <div class="range-row"><span>الساعة</span><input id="modTime" data-time type="range" min="0" max="23.9" step="0.1" value="${game.hour}" /><b id="modTimeVal">${timeString(game.hour)}</b></div>
        <div class="pills" style="margin-bottom:10px">${weathers}
          <button type="button" class="pill ${game.autoTime ? 'on' : ''}" data-autotime>الوقت يتقدم</button>
        </div>
        <div class="range-row"><span>كثافة المرور</span><input id="modTraffic" data-traffic type="range" min="0" max="30" step="1" value="${game.city.targetTraffic}" /><b id="modTrafficVal">${game.city.targetTraffic}</b></div>
      </div>
      <div class="mod-section">
        <div class="section-head"><div class="section-title">استدعاء مركبة</div><div class="section-hint">تظهر قربك على الطريق</div></div>
        <div class="pills">${spawns}</div>
      </div>
      <div class="mod-section">
        <div class="section-head"><div class="section-title">تنقل سريع</div><div class="section-hint">مود غير قانوني — طبعاً</div></div>
        <div class="pills">${teleports}</div>
      </div>
      <div class="mod-section">
        <div class="section-head"><div class="section-title">شيفرة الحي</div><div class="section-hint">جرّب SUNSET</div></div>
        <div class="pills">
          <input id="cheatInput" maxlength="16" placeholder="شيفرة سرية" style="flex:1;min-width:150px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:#fff;padding:8px 10px;font-family:inherit" />
          <button type="button" class="pill" data-cheat>تفعيل</button>
        </div>
      </div>
    `;
    this.el.modChipsPanel.textContent = chips;
  }

  toggleMods(show, game) {
    this.el.modsOverlay.classList.toggle('hidden', !show);
    if (show && game) this.buildMods(game);
  }

  togglePause(show) {
    this.el.pauseOverlay.classList.toggle('hidden', !show);
  }

  toggleHelp(show) {
    this.el.helpOverlay.classList.toggle('hidden', !show);
  }

  updateHUD(game) {
    const p = game.player;
    this.el.healthBar.style.width = `${clamp(p.health, 0, 100)}%`;
    this.el.healthNum.textContent = Math.round(p.health);
    this.el.armorBar.style.width = `${clamp(p.armor, 0, 100)}%`;
    this.el.armorNum.textContent = Math.round(p.armor);
    this.el.cash.textContent = formatMoney(game.money);
    this.el.chips.textContent = `${game.chips} شرائح مود`;
    const wanted = Math.max(0, Math.min(5, game.wanted));
    this.el.stars.forEach((s, i) => s.classList.toggle('on', i < wanted));
    this.el.wantedBadge.textContent = wanted > 0 ? 'مطلوب' : 'هادئ';
    this.el.wantedBadge.classList.toggle('hot', wanted > 0);
    this.el.clock.textContent = timeString(game.hour);
    this.el.district.textContent = game.district.name;
    if (game.playerCar) {
      const st = game.audio.stationName();
      this.el.radioName.textContent = game.audio.radioOn ? st.name : 'مغلق';
      this.el.radioEn.textContent = game.audio.radioOn ? st.en : 'RADIO OFF';
    } else {
      this.el.radioName.textContent = '—';
      this.el.radioEn.textContent = 'ادخل سيارة';
    }

    const weapon = game.weapons[game.weaponIndex];
    this.el.weaponName.textContent = weapon.name;
    const reserve = game.mods.infiniteAmmo ? '∞' : weapon.reserve;
    this.el.weaponAmmo.innerHTML = `${weapon.mag} <span style="opacity:.5">/</span> ${reserve}`;
    this.el.weaponIcon.textContent = weapon.icon;
    this.el.weaponSlots.forEach((s, i) => s.classList.toggle('on', i === game.weaponIndex));

    if (game.playerCar) {
      this.el.speedo.classList.remove('hidden');
      const kmh = Math.round(Math.abs(game.playerCar.speed) * 3.6);
      this.el.speedNum.textContent = kmh;
      this.el.speedBar.style.width = `${clamp(kmh / (game.playerCar.maxSpeed * 3.6), 0, 1) * 100}%`;
      this.el.gearLabel.textContent = Math.abs(game.playerCar.speed) < 0.6 ? 'N' : game.playerCar.speed < 0 ? 'R' : 'D';
    } else {
      this.el.speedo.classList.add('hidden');
    }

    const mode = game.playerCar ? 'car' : 'foot';
    if (mode !== this.lastHintMode) {
      this.lastHintMode = mode;
      this.el.hints.innerHTML = mode === 'car'
        ? '<span><b>W/S</b> وقود وفرامل</span><span><b>A/D</b> توجيه</span><span><b>Space</b> فرامل يد</span><span><b>Shift</b> نيترو</span><span><b>V</b> راديو</span><span><b>F</b> نزول</span>'
        : '<span><b>WASD</b> حركة</span><span><b>Shift</b> عدو</span><span><b>Space</b> قفز</span><span><b>Click</b> إطلاق</span><span><b>F</b> سيارة</span><span><b>F3</b> مودات</span>';
    }

    this.updateMissionPanel(game);
    this.mapAccum += 1;
    if (this.mapAccum % 4 === 0) this.updateMinimap(game);
  }

  updateMissionPanel(game) {
    const m = game.missions;
    if (m.storyComplete) {
      this.el.missionPanel.classList.add('hidden');
      return;
    }
    const current = m.current;
    const start = m.getStartMarker();
    const obj = m.getObjectiveMarker();
    const target = current ? obj : start;
    if (!target) {
      this.el.missionPanel.classList.add('hidden');
      return;
    }
    this.el.missionPanel.classList.remove('hidden');
    this.el.missionTitle.textContent = current ? current.def.title : m.nextDef()?.title || 'وضع حر';
    this.el.missionTag.textContent = current ? `MISSION ${m.completed + 1}/${m.list.length}` : 'NEXT';
    this.el.missionObjective.textContent = current ? current.def.objectiveText(current, game) : 'اتجه لعلامة المهمة واضغط E';
    const d = Math.round(dist2(game.player.position.x, game.player.position.z, target.x, target.z));
    this.el.missionDistance.textContent = d;
    this.currentTarget = target;
  }

  updateMinimap(game) {
    const ctx = this.mapCtx;
    const W = this.el.minimap.width;
    const H = this.el.minimap.height;
    const px = game.player.position.x;
    const pz = game.player.position.z;
    const view = 190;
    const half = view / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.fillStyle = '#0b1015';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    const scale = W / view;
    ctx.scale(scale, scale);
    ctx.translate(-px, -pz);
    const map = game.world.mapCanvas;
    ctx.drawImage(map, -340, -340, 680, 680);
    // street names / district marker layer
    ctx.globalAlpha = 0.9;
    const blips = [];
    if (game.missions.getObjectiveMarker()) blips.push({ ...game.missions.getObjectiveMarker(), type: 'mission' });
    else if (game.missions.getStartMarker()) blips.push({ ...game.missions.getStartMarker(), type: 'mission' });
    blips.push({ x: -210, z: 160, type: 'safe' });
    for (const car of game.city.policeCars) {
      if (!car.destroyed) blips.push({ x: car.pos.x, z: car.pos.z, type: 'police' });
    }
    for (const ped of game.city.peds) {
      if (ped.police && !ped.dead && !ped.removed) blips.push({ x: ped.pos.x, z: ped.pos.z, type: 'cop' });
    }
    for (const b of blips) {
      ctx.beginPath();
      if (b.type === 'mission') {
        ctx.fillStyle = Math.sin(performance.now() / 250) > 0 ? '#ffb703' : '#ffd166';
        const r = 4.4;
        ctx.arc(b.x, b.z, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,183,3,.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.z, r + 2.4, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.type === 'police' || b.type === 'cop') {
        ctx.fillStyle = '#ff4d4d';
        ctx.arc(b.x, b.z, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#64f0c8';
        ctx.arc(b.x, b.z, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // player arrow
    const heading = game.playerCar ? game.playerCar.heading : game.playerHeading;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    const cx = W / 2;
    const cy = H / 2;
    ctx.beginPath();
    ctx.moveTo(cx + fx * 9, cy + fz * 9);
    ctx.lineTo(cx - fx * 5 + rx * 5, cy - fz * 5 + rz * 5);
    ctx.lineTo(cx - fx * 5 - rx * 5, cy - fz * 5 - rz * 5);
    ctx.closePath();
    ctx.fillStyle = '#fff4d6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // frame corners
    ctx.strokeStyle = 'rgba(255,183,3,.4)';
    ctx.lineWidth = 2;
    const c = 12;
    const corners = [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]];
    for (const [x, y, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx * c, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * c);
      ctx.stroke();
    }
  }
}
