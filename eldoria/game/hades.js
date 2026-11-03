'use strict';
/**
 * Hades, Rey del Inframundo — jefe del Trono de Hades (zona «El Inframundo»).
 * Habilidades (además de golpear con la guadaña):
 *   1) Dragón de fuego: un gran dragón recorre la cueva de lado a lado incendiando todo a su paso (el suelo arde varios segundos).
 *   2) Temblor: golpea el suelo, la cueva tiembla y caen erupciones de lava; hay que esquivar los círculos rojos.
 *   3) Ráfagas de la guadaña: lanza ráfagas de fuego a TODOS los jugadores.
 *   4) Absorción: durante unos segundos absorbe todo el daño y los especiales y se los DEVUELVE al atacante.
 *   5) Desaparecer: se esfuma y reaparece junto a un jugador con un golpe en área (avisa con un círculo).
 *   Resistencias: las armas de arco le hacen mucho menos daño que la magia y el cuerpo a cuerpo.
 * Botín raro: equipo del Inframundo (yelmo, coraza, guanteletes, grebas, botas, sello, collar), la Guadaña del Eclipse y el Arco del Sol Negro.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['hd_yelmo',    'Yelmo del Rey Infernal',      'hd_helm',  'head',   103, 76, { hp: 460, atk: 10, crit: 0.03 }, 0.05],
  ['hd_peto',     'Coraza del Eclipse Ardiente', 'hd_chest', 'body',   105, 98, { hp: 660, atk: 18 }, 0.04],
  ['hd_guantes',  'Guanteletes de Ceniza',       'hd_glove', 'gloves', 104, 39, { hp: 220, atk: 16, crit: 0.02 }, 0.05],
  ['hd_pantalon', 'Grebas de Obsidiana',         'hd_leg',   'legs',   104, 54, { hp: 360, atk: 13 }, 0.05],
  ['hd_botas',    'Botas del Abismo',            'hd_boot',  'boots',  103, 43, { hp: 260, atk: 10 }, 0.05],
  ['hd_cinto',    'Cinturón del Corazón de Fuego', 'hd_belt', 'belt',   102, 32, { hp: 340, atk: 12, crit: 0.02 }, 0.05],
];
const RING = ['hd_anillo', 'Sello del Rey del Inframundo', 'hd_ring', 'ring', 103, { atk: 20, hp: 280, mana: 110, crit: 0.03 }, 0.05];
const RING2 = ['hd_anillo2', 'Banda de las Almas Ardientes', 'hd_ring2', 'ring', 101, { atk: 14, hp: 360, mana: 150, crit: 0.02 }, 0.05];
const AMULET = ['hd_amuleto', 'Corazón de Brasas', 'hd_amulet', 'amulet', 104, { hp: 640, mana: 190, atk: 17, crit: 0.04 }, 0.04];
const SCYTHE = ['hd_guadana', 'Guadaña del Eclipse', 'hd_scythe', 'melee', 105, 270, 1150, 'fire', 0.012];
const BOW = ['hd_arco', 'Arco del Sol Negro', 'hd_bow', 'ranged', 105, 260, 1100, 'fire', 0.012];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', belt: '🎗️', ring: '💍', amulet: '📿' };
const ARCO_K = 0.45;                         // los arcos le hacen menos de la mitad del daño

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, hades: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, type, L, bonus] of [RING, RING2, AMULET]) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, hades: 1, minLevel: L, sell: sell(L, 5) };
  { const [id, name, spr, style, L, atk, cd, el] = SCYTHE; ITEMS[id] = { name, icon: '🪓', spr, type: 'weapon', style, atk, cd, range: 1, el, hades: 1, minLevel: L, sell: sell(L, 8) }; }
  { const [id, name, spr, style, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style, atk, cd, range: 8, el, hades: 1, minLevel: L, sell: sell(L, 8) }; }
  ITEMS.trofeo_hades = { name: 'Corona de Hades', icon: '👑', type: 'misc', stack: true, sell: 46000 };
  MONSTERS.hades = {
    name: 'Hades, Rey del Inframundo', icon: '🔥', lv: 900, hp: 620000, dmg: [420, 650], dmgK: 3.2, exp: 160000, move: 400, atkCd: 1200, aggro: 20, respawn: 60000, armor: 0.5, shared: true, boss: true, special: 'hades',
    gold: [28000, 40000], loot: [['trofeo_hades', 1, 1, 2], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10], ['pluma_fenix', 0.5, 1, 2]],
  };
  const boss = MONSTERS.hades;
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([RING[0], RING[6], 1, 1], [RING2[0], RING2[6], 1, 1], [AMULET[0], AMULET[6], 1, 1], [SCYTHE[0], SCYTHE[8], 1, 1], [BOW[0], BOW[8], 1, 1]);
}

/* ============================== comportamiento del jefe (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const rect = (m) => world.zoneAt(m.x, m.y).rect;
  const inCave = (q, R) => q.hp > 0 && q.x >= R[0] && q.x <= R[2] && q.y >= R[1] && q.y <= R[3];
  const floorOk = (x, y) => world.isWalkable(x, y) && world.tiles[y * world.W + x] === world.T.HDF;
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  const ORDER = ['temblor', 'rafagas', 'dragon', 'absorber', 'salto', 'rafagas', 'temblor', 'dragon', 'salto'];

  P.hadesAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const kind = ORDER[(m.spN || 0) % ORDER.length]; m.spN = (m.spN || 0) + 1;
    const dur = this.hadesCast(m, kind);
    const rage = m.hp <= m.maxHp * 0.3;
    m.nextSp = now + dur + (rage ? 1500 : 2800) + Math.random() * 1800;
    m.nextMove = Math.max(m.nextMove, now + 1000); m.nextAtk = Math.max(m.nextAtk, now + 1000);
  };

  const spots = (n, minD, R, avoid) => {
    const out = [];
    for (let k = 0; k < n * 80 && out.length < n; k++) {
      const x = rnd(R[0] + 2, R[2] - 2), y = rnd(R[1] + 2, R[3] - 2);
      if (!floorOk(x, y)) continue;
      if (out.some((s) => Math.hypot(s.x - x, s.y - y) < minD) || (avoid && avoid.some((a) => Math.hypot(a.x - x, a.y - y) < 3))) continue;
      out.push({ x, y });
    }
    return out;
  };

  P.hadesCast = function (m, kind) {
    const R = rect(m), alive = () => !m.dead && this.monsters.includes(m);
    const inside = () => [...this.players.values()].filter((q) => inCave(q, R));
    const say = (txt) => { for (const q of inside()) this.msg(q, txt, 'x'); };
    const cast = (T, root) => { this.fx.push({ k: 'hd_cast', x: m.x, y: m.y, id: m.id, T, kind }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };
    const hit = (q, lo, hi, name) => this.hurtPlayer(q, rnd(lo, hi), m, this.now, name);

    if (kind === 'dragon') {                                                                      // dragón de fuego: recorre la cueva incendiando el suelo
      say('🐉🔥 ¡Hades invoca un gran dragón de fuego! ¡Sal de su camino: arde todo a su paso!'); cast(1400, 5200);
      const STEP = 130, WARN = 1300, BURN = 6500, x0 = R[0] + 1, x1 = R[2] - 1, pl0 = inside();
      const lanes = [];
      for (let i = 0; i < 2; i++) { const q = pl0.length ? pl0[i % pl0.length] : null; const y = Math.max(R[1] + 3, Math.min(R[3] - 3, q ? Math.round(q.y) + (i ? 2 : 0) : Math.round(m.y) + 4)); lanes.push({ y, dir: i ? -1 : 1, off: i * 1600 }); }
      const burns = []; let ticking = false, lastTick = 0;
      const tick = () => {
        const nowT = this.now;
        for (let i = burns.length - 1; i >= 0; i--) if (burns[i].until <= nowT) burns.splice(i, 1);
        if (burns.length && nowT - lastTick >= 440) { lastTick = nowT; for (const q of inside()) if (burns.some((b) => b.x === Math.round(q.x) && b.y === Math.round(q.y))) hit(q, 95, 150, 'Fuego del dragón'); }
        if (burns.length || lanes.some((l) => l.running)) this.later(220, tick); else ticking = false;
      };
      for (const L of lanes) {
        const path = []; for (let i = 0; i <= x1 - x0; i++) path.push([L.dir > 0 ? x0 + i : x1 - i, L.y]);
        this.fx.push({ k: 'hd_lane', x: Math.round((x0 + x1) / 2), y: L.y, x0, x1, T: WARN + L.off, dir: L.dir });
        this.later(WARN + L.off, () => {
          if (!alive()) return; L.running = true;
          this.fx.push({ k: 'hd_dragon', x: Math.round((x0 + x1) / 2), y: L.y, path, step: STEP, burn: BURN, dir: L.dir });
          const hitSet = new Set();
          path.forEach(([px, py], i) => this.later(i * STEP, () => {
            if (!alive()) { L.running = false; return; }
            for (let dy = -1; dy <= 1; dy++) if (floorOk(px, py + dy)) burns.push({ x: px, y: py + dy, until: this.now + BURN });
            for (const q of inside()) if (!hitSet.has(q.id) && cheb(q.x, q.y, px, py) <= 1) { hitSet.add(q.id); hit(q, 440, 590, 'Dragón de fuego'); }
            if (i === path.length - 1) L.running = false;
          }));
          if (!ticking) { ticking = true; this.later(300, tick); }
        });
      }
      return WARN + 1600 + (x1 - x0) * STEP + 400;
    }
    if (kind === 'temblor') {                                                                     // golpe al suelo: tiembla la cueva y caen erupciones de lava
      say('🌋 ¡Hades golpea el suelo! La cueva tiembla: ¡esquiva las erupciones de lava!'); cast(1400, 7200);
      const WAVES = 9, GAP = 650, WARN = 850;
      this.later(900, () => { if (alive()) this.fx.push({ k: 'hd_quake', x: m.x, y: m.y, T: WAVES * GAP + 800 }); });
      for (let w = 0; w < WAVES; w++) this.later(1400 + w * GAP, () => {
        if (!alive()) return;
        const pl = inside(), pts = spots(4 + Math.min(5, pl.length), 3, R);
        for (const q of pl) if (Math.random() < 0.75) pts.push({ x: Math.round(q.x), y: Math.round(q.y) });
        for (const s of pts) {
          this.fx.push({ k: 'hd_mk', x: s.x, y: s.y, r: 1.6, T: WARN });
          this.later(WARN, () => {
            if (!alive()) return;
            this.fx.push({ k: 'hd_erupt', x: s.x, y: s.y, r: 1.6 });
            for (const z of inside()) if (Math.hypot(z.x - s.x, z.y - s.y) <= 1.7) hit(z, 350, 500, 'Erupción de lava');
          });
        }
      });
      return 1400 + WAVES * GAP + WARN;
    }
    if (kind === 'rafagas') {                                                                     // ráfagas de fuego de la guadaña a todos los jugadores
      say('🔥 ¡Hades lanza ráfagas de fuego con su guadaña a todos! ¡Muévete!'); cast(1000, 4600);
      const VOLLEYS = 3, GAP = 950, WARN = 650;
      for (let v = 0; v < VOLLEYS; v++) this.later(900 + v * GAP, () => {
        if (!alive()) return;
        for (const q of inside()) {
          const tx = Math.round(q.x), ty = Math.round(q.y);
          this.fx.push({ k: 'hd_mk', x: tx, y: ty, r: 1.5, T: WARN, small: 1 });
          this.later(WARN, () => {
            if (!alive()) return;
            this.fx.push({ k: 'hd_burst', x: tx, y: ty, sx: m.x, sy: m.y });
            for (const z of inside()) if (Math.hypot(z.x - tx, z.y - ty) <= 1.6) hit(z, 330, 470, 'Ráfaga de fuego');
          });
        }
      });
      return 900 + VOLLEYS * GAP + WARN;
    }
    if (kind === 'absorber') {                                                                    // absorbe ataques y especiales y los devuelve
      const DUR = 6000;
      say('☠️ ¡Hades absorbe TODO el daño y los especiales y te los devuelve! ¡Deja de atacar o aléjate!'); cast(900, DUR + 600);
      m.absorbUntil = this.now + DUR; m.absorbed = 0; this.fx.push({ k: 'hd_abs', x: m.x, y: m.y, id: m.id, T: DUR });
      this.later(DUR, () => {
        if (!alive()) return; m.absorbUntil = 0;
        this.fx.push({ k: 'hd_nova', x: m.x, y: m.y, r: 6 });
        for (const z of inside()) if (Math.hypot(z.x - m.x, z.y - m.y) <= 6.2) hit(z, 300, 430, 'Estallido de almas');
      });
      return DUR + 600;
    }
    // salto: desaparece y reaparece junto a un jugador con un golpe en área (avisa con un círculo)
    const pl = inside(); if (!pl.length) return 600;
    const q = pl[rnd(0, pl.length - 1)], cand = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = Math.round(q.x) + dx, y = Math.round(q.y) + dy; if ((dx || dy) && floorOk(x, y) && !this.mgrid.has(y * world.W + x) && !this.pgrid.has(y * world.W + x)) cand.push({ x, y }); }
    if (!cand.length) return 600;
    const d = cand[rnd(0, cand.length - 1)], WARN = 1300;
    say(`👁️ ¡Hades desaparece… y va a reaparecer junto a ${q.name}!`); cast(500, WARN + 700);
    this.fx.push({ k: 'hd_vanish', x: m.x, y: m.y, id: m.id }); this.fx.push({ k: 'hd_mk', x: d.x, y: d.y, r: 2.4, T: WARN });
    m.hideUntil = this.now + WARN; m.target = q.id;
    this.later(WARN, () => {
      if (!alive()) return;
      if (!this.mgrid.has(d.y * world.W + d.x)) this.relocate(m, d.x, d.y);
      m.hideUntil = 0; this.fx.push({ k: 'hd_appear', x: m.x, y: m.y, id: m.id, r: 2.4 });
      for (const z of inside()) if (Math.hypot(z.x - m.x, z.y - m.y) <= 2.5) hit(z, 430, 580, 'Aparición de Hades');
    });
    return WARN + 600;
  };

  // resistencia a los arcos y absorción con daño devuelto
  const HM = P.hurtMonster;
  P.hurtMonster = function (m, dmg, p, now) {
    if (m.type !== 'hades' || !p) return HM.call(this, m, dmg, p, now);
    if (m.absorbUntil > now) {
      if (p.kind === 'pl') {
        m.absorbed = (m.absorbed || 0) + dmg;
        this.fx.push({ k: 'hd_ref', x: p.x, y: p.y, sx: m.x, sy: m.y });
        this.fx.push({ k: 'd', x: m.x, y: m.y, v: '☠️ ¡Absorbido!', c: 'x' });
        if (p.hp > 0) this.hurtPlayer(p, Math.max(1, Math.min(Math.round(dmg * 0.6), Math.round(p.maxHp * 0.3))), m, now, 'Daño devuelto');
      }
      return;
    }
    if (p.kind === 'pl' && this.styleOf(p) === 'ranged') { dmg = Math.max(1, Math.round(dmg * ARCO_K)); if (!(m.arcoMsg > now)) { m.arcoMsg = now + 2500; this.fx.push({ k: 'd', x: m.x, y: m.y, v: '🏹 ¡Resiste los arcos!', c: 'x' }); } }
    return HM.call(this, m, dmg, p, now);
  };

  const GEAR = new Set([...PIECES, RING, RING2, AMULET, SCYTHE, BOW].map((q) => q[0]));
  const CH = new Map(); for (const q of PIECES) CH.set(q[0], q[7]); CH.set(RING[0], RING[6]); CH.set(RING2[0], RING2[6]); CH.set(AMULET[0], AMULET[6]); CH.set(SCYTHE[0], SCYTHE[8]); CH.set(BOW[0], BOW[8]);
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (m.type !== 'hades') return K0.call(this, m, now);
    const x = m.x, y = m.y, face = m.lf || 1, parts = []; let total = 0; m.absorbUntil = 0;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) { parts.push([pl, e.dmg]); total += e.dmg; } }
    const real = m.def, instK = m.instSlot ? require('./instancias').LOOT_K : 1;
    m.def = Object.assign({}, real, { loot: real.loot.filter((l) => !GEAR.has(l[0])) });
    let r; try { r = K0.call(this, m, now); } finally { m.def = real; }
    // equipo del Inframundo: botín para todos los que participan; cuanto más daño haces, más suerte (hasta ×3 el que más daño hizo)
    const I = require('./items'), need = 1, topDmg = Math.max(1, ...parts.map((q) => q[1])), ranked = parts.slice().sort((a, b) => b[1] - a[1]);
    if (ranked.length) this.broadcastChat(`🔥 ¡Hades ha caído! Mayor daño: ${ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ')}.`, 'k');
    for (const [pl, dmg] of ranked) {
      if (dmg < need) continue;
      const k = 1 + 2 * (dmg / topDmg);
      for (const id of GEAR) {
        if (Math.random() >= Math.min(0.6, CH.get(id) * 0.5 * require('./data').CFG.BOSS_DROP_K * k * instK * (this.lootMult ? this.lootMult(pl, id) : 1))) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, 'hades', id);
        this.msgC(pl, `🔥✨ ¡Botín de Hades: ${require('./data').ITEMS[id].name}!`, '#ff9a4a'); this.broadcastChat(`🔥 ¡${pl.name} ha conseguido ${require('./data').ITEMS[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    }
    this.fx.push({ k: 'hd_die', x, y, face });
    return r;
  };
}
module.exports = { build, install, PIECES, RING, RING2, AMULET, SCYTHE, BOW, ARCO_K };
