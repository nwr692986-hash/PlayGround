import { dist2 } from './utils.js';

function removePickups(game, pickups) {
  for (const p of pickups || []) {
    p.active = false;
    p.group.visible = false;
    const idx = game.city.pickups.indexOf(p);
    if (idx >= 0) game.city.pickups.splice(idx, 1);
    game.scene.remove(p.group);
  }
}

const DEFS = [
  {
    id: 'first-ride',
    title: 'أول جولة',
    start: { x: -210, z: 160 },
    reward: 300,
    objectiveText: (c) => (c.stage === 0 ? 'اسرق السيارة البرتقالية قرب البيت' : 'وصل العربية إلى كراج الحي'),
    setup(c, game) {
      c.car = game.city.spawnCarAt(-196, 175, 'sports', 0xff7a1a, Math.PI / 2);
      c.car.parkedMission = true;
      c.objective = { x: c.car.pos.x, z: c.car.pos.z };
      game.ui.dialogue('زين', 'رجعت يا آدم؟ البيت ما تغير. خذ العربية البرتقالية اللي قدام البيت ووصلها لكراج الحي قبل ما يلاحظها أحد.', 6200);
      game.ui.toast('مهمة جديدة: أول جولة', 'mission');
    },
    update(c, dt, game) {
      if (c.stage === 0) {
        c.objective = { x: c.car.pos.x, z: c.car.pos.z };
        if (game.playerCar) {
          c.stage = 1;
          c.objective = { x: -140, z: 98 };
          game.ui.dialogue('زين', 'تمام. الكراج شرق عند تقاطع السبعين. لا تخبطها.', 4200);
          game.ui.toast('العربية معك — وصلها للكراج', 'mission');
        }
      } else if (c.stage === 1) {
        if (game.playerCar && dist2(game.player.position.x, game.player.position.z, -140, 98) < 8) {
          this.complete();
        }
      }
    },
  },
  {
    id: 'corner-money',
    title: 'تحصيل الحماية',
    start: { x: -140, z: 98 },
    reward: 500,
    objectiveText: (c) => {
      const left = c.pickups.filter((p) => p.active).length;
      return left > 1 ? `اجمع أكياس المال (${3 - left}/3)` : 'اجمع آخر كيس مال';
    },
    setup(c, game) {
      const spots = [
        { x: 140, z: 96 },
        { x: 232, z: 140 },
        { x: 140, z: -44 },
      ];
      c.pickups = spots.map((s) => {
        const p = game.city.spawnPickup('cash', s.x, s.z);
        p.amount = 0;
        p.mission = true;
        return p;
      });
      c.objective = { x: 140, z: 96 };
      game.ui.dialogue('أبو خليل', 'يا ابن الشمس، ثلاثة من دكاكين الشرق ما دفعوا الحماية هذا الشهر. اجمع الأكياس وارجع. خليك ساكت، الشارع يسمع.', 7000);
      game.ui.toast('مهمة جديدة: تحصيل الحماية', 'mission');
    },
    update(c, dt, game) {
      const remaining = c.pickups.filter((p) => p.active);
      if (remaining.length) {
        c.objective = { x: remaining[0].x, z: remaining[0].z };
      }
      if (!remaining.length) {
        this.complete();
      }
    },
    cleanup(c, game) {
      removePickups(game, c.pickups);
    },
  },
  {
    id: 'heat',
    title: 'حرارة الشارع',
    start: { x: -140, z: 98 },
    reward: 700,
    objectiveText: (c) => (c.stage === 0 ? 'روح لمغسلة السيارات واخفِ العربية' : 'ارجع لحي الشمس بهدوء'),
    setup(c, game) {
      c.objective = { x: 70, z: -112 };
      game.setWanted(3, 'نصب');
      game.ui.dialogue('زين', 'الشرطة حطت اسمك على الكيس اللي جمعناه. روح لمغسلة السيارات في شارع الشرق، خليهم يغسلوا العربية ويغسلوا ملفك.', 7000);
      game.ui.toast('مطلوب! روح لمغسلة السيارات', 'police');
    },
    update(c, dt, game) {
      c.timer = (c.timer || 0) + dt;
      if (c.stage === 0) {
        if (dist2(game.player.position.x, game.player.position.z, 70, -112) < 12) {
          game.clearWanted();
          c.stage = 1;
          c.objective = { x: -210, z: 160 };
          game.ui.dialogue('عامل المغسلة', 'العربية نظيفة، واسمك نظيف. ما شفتك هنا.', 4200);
          game.ui.toast('تم مسح المطلوب — ارجع للحي', 'mission');
        } else if (game.wanted === 0) {
          c.stage = 1;
          c.objective = { x: -210, z: 160 };
          game.ui.toast('الشوارع هديت — ارجع للحي', 'mission');
        }
      } else if (dist2(game.player.position.x, game.player.position.z, -210, 160) < 9) {
        this.complete();
      }
    },
  },
  {
    id: 'turf-war',
    title: 'حرب الحي',
    start: { x: 140, z: 140 },
    reward: 1000,
    objectiveText: (c) => {
      const alive = (c.targets || []).filter((p) => !p.dead && !p.removed).length;
      return `اقضِ على عصابة الكوبرا في الحديقة (${5 - alive}/5)`;
    },
    setup(c, game) {
      c.objective = { x: 140, z: 140 };
      game.addHealth(30);
      game.ui.dialogue('أبو خليل', 'الكوبرا دخلوا حديقة الشمس. خمسة من رجالهم هناك. طهّر الحديقة، وخلّي الحي يعرف إن الشمس ما تغيب.', 7000);
      c.targets = game.city.spawnGang(5, 140, 140);
      game.ui.toast('مهمة جديدة: حرب الحي', 'mission');
    },
    update(c, dt, game) {
      const alive = (c.targets || []).filter((p) => !p.dead && !p.removed);
      if (alive.length) {
        const target = alive[0];
        c.objective = { x: target.pos.x, z: target.pos.z };
      } else {
        this.complete();
      }
    },
    cleanup(c, game) {
      for (const ped of c.targets || []) {
        if (!ped.dead && !ped.removed) game.city.removePed(ped, true);
      }
    },
  },
  {
    id: 'last-flight',
    title: 'آخر رحلة',
    start: { x: -210, z: 160 },
    reward: 2500,
    objectiveText: (c) => (c.stage === 0 ? 'اسرق السيارة الرياضية قرب البيت' : 'وصلها إلى مطار سان أرويو قبل أن يقطعوا الطريق'),
    setup(c, game) {
      c.car = game.city.spawnCarAt(-196, 175, 'sports', 0xff2e63, Math.PI / 2);
      c.car.parkedMission = true;
      c.objective = { x: c.car.pos.x, z: c.car.pos.z };
      game.ui.dialogue('زين', 'صفقة العمر على المطار. العربية الوردية فيها الشحنة. خذها للمطار، والشرطة كلها في الطريق. لا توقف.', 7200);
      game.ui.toast('المهمة الأخيرة: آخر رحلة', 'mission');
    },
    update(c, dt, game) {
      if (c.stage === 0) {
        c.objective = { x: c.car.pos.x, z: c.car.pos.z };
        if (game.playerCar) {
          c.stage = 1;
          c.objective = { x: 300, z: -160 };
          game.setWanted(3, 'تهريب');
          game.ui.dialogue('زين', 'الشرطة شافتك! خذها على المطار، لا ترفع رجلك!', 4800);
          game.ui.toast('اهرب للمطار!', 'police');
        }
      } else if (game.playerCar && dist2(game.player.position.x, game.player.position.z, 300, -160) < 15) {
        this.complete();
      }
    },
  },
];

export class MissionSystem {
  constructor(game) {
    this.game = game;
    this.list = DEFS;
    this.completed = 0;
    this.chips = 0;
    this.current = null;
    this.storyComplete = false;
    this.lastFail = 0;
  }

  reset() {
    this.current = null;
    this.completed = 0;
    this.chips = 0;
    this.storyComplete = false;
  }

  nextDef() {
    return this.list[this.completed] || null;
  }

  getStartMarker() {
    if (this.current || this.storyComplete) return null;
    const def = this.nextDef();
    return def ? def.start : null;
  }

  getObjectiveMarker() {
    return this.current ? this.current.objective : null;
  }

  canStart(playerPos) {
    if (this.current || this.storyComplete) return false;
    const m = this.getStartMarker();
    if (!m) return false;
    return dist2(playerPos.x, playerPos.z, m.x, m.z) < 4.5;
  }

  startCurrent() {
    if (this.current || this.storyComplete) return false;
    const def = this.nextDef();
    if (!def) return false;
    this.current = {
      def,
      stage: 0,
      objective: { ...def.start },
      timer: 0,
      targets: [],
      pickups: [],
    };
    this.game.audio.chime(true);
    def.setup?.(this.current, this.game);
    this.game.setMissionMarker(this.current.objective);
    return true;
  }

  update(dt, game) {
    if (!this.current) return;
    this.current.def.update?.call(this, this.current, dt, game);
    if (this.current) this.game.setMissionMarker(this.current.objective);
  }

  complete() {
    if (!this.current) return;
    const def = this.current;
    this.current.def.cleanup?.(def, this.game);
    const reward = def.def.reward;
    this.current = null;
    this.completed++;
    this.chips = this.completed;
    this.game.chips = this.chips;
    this.game.addMoney(reward);
    this.game.addArmor(35);
    this.game.addHealth(25);
    this.game.audio.chime(true);
    this.game.ui.missionBanner(def.def.title, `+$${reward} · +1 MOD CHIP`);
    this.game.ui.dialogue('زين', 'شغل نظيف. خذ شرحة مود زيادة، وافتح اللي بدك ياه من المود منيو.', 5000);
    this.game.ui.toast(`اكتملت: ${def.def.title} · +$${reward}`, 'mission');
    const newly = this.game.modDefs.filter((m) => m.req === this.completed);
    if (newly.length) {
      this.game.ui.toast(`مود مفتوح: ${newly.map((m) => m.name).join(' · ')}`, 'mission', 4200);
    }
    if (this.completed >= this.list.length) {
      this.storyComplete = true;
      this.game.setMissionMarker(null);
      setTimeout(() => this.game.onStoryComplete(), 1400);
    } else {
      this.game.setMissionMarker(this.getStartMarker());
    }
    this.game.save();
    this.game.ui.buildMods?.(this.game);
  }

  fail(reason = 'فشلت المهمة') {
    if (!this.current) return;
    this.current.def.cleanup?.(this.current, this.game);
    this.current = null;
    this.game.ui.missionBanner('MISSION FAILED', reason);
    this.game.ui.toast(reason, 'police', 4200);
    this.game.setMissionMarker(this.getStartMarker());
    this.game.save();
  }
}
