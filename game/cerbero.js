'use strict';
/**
 * Cerbero, Guardián del Inframundo — jefe de «Las Fauces del Inframundo» (zona «El Inframundo»).
 * Seis ataques especiales (además de morder y arañar):
 *   1) Triple llamarada: las tres cabezas escupen fuego en línea hacia tres jugadores (avisa con un rayo rojo en el suelo).
 *   2) Triple zarpazo: tres zarpazos seguidos delante de él (avisa con un círculo).
 *   3) Aullido infernal: un aullido en onda que daña y RALENTIZA a todos los que estén cerca.
 *   4) Fuego de almas: brotan llamas azules de las grietas del suelo y se quedan ardiendo unos segundos.
 *   5) Embestida: se lanza en línea recta contra un jugador, arrolla todo lo que haya en el camino.
 *   6) Cadenas de almas: cadenas espectrales arrastran a todos hacia él y los dejan quietos un instante antes del mordisco.
 * Botín raro: equipo de Cerbero (yelmo, coraza, guanteletes, grebas, pisadores, anillo y amuleto) y 4 armas (2 arcos y 2 báculos), cada una con 3 especiales.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['cb_yelmo',   'Yelmo de Cerbero',            'cb_helm',  'head',   106, 80,  { hp: 480, atk: 11, crit: 0.03 }, 0.05],
  ['cb_peto',    'Coraza de Cerbero',           'cb_chest', 'body',   108, 102, { hp: 690, atk: 19 }, 0.04],
  ['cb_guantes', 'Guanteletes de Cerbero',      'cb_glove', 'gloves', 107, 41,  { hp: 230, atk: 17, crit: 0.02 }, 0.05],
  ['cb_grebas',  'Grebas de Cerbero',           'cb_leg',   'legs',   107, 57,  { hp: 380, atk: 14 }, 0.05],
  ['cb_botas',   'Pisadores de Cerbero',        'cb_boot',  'boots',  106, 45,  { hp: 270, atk: 11 }, 0.05],
];
const RING = ['cb_anillo', 'Anillo del Guardián Infernal', 'cb_ring', 'ring', 106, { atk: 21, hp: 290, mana: 115, crit: 0.03 }, 0.05];
const AMULET = ['cb_amuleto', 'Amuleto de las Tres Cabezas', 'cb_amulet', 'amulet', 107, { hp: 660, mana: 200, atk: 18, crit: 0.04 }, 0.04];
/** [id, nombre, sprite, estilo, nivel, ataque, espera, elemento, alcance, probabilidad, bonus] */
const WEAPONS = [
  ['cb_arco_fuego',      'Arco Infernal de Cerbero',        'cb_bow1',   'ranged', 107, 275, 1100, 'fire', 8, 0.012, { atk: 10 }],
  ['cb_arco_rastreador', 'Arco Rastreador del Inframundo',  'cb_bow2',   'ranged', 106, 255, 850,  'fire', 8, 0.012, { crit: 0.06 }],
  ['cb_baston_triptico', 'Báculo Tríptico de Llamas',       'cb_staff1', 'magic',  107, 270, 1100, 'fire', 7, 0.012, { mana: 150 }],
  ['cb_baston_garra',    'Báculo de la Garra de Cerbero',   'cb_staff2', 'magic',  108, 280, 1150, 'fire', 7, 0.012, { hp: 200 }],
];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', ring: '💍', amulet: '📿' };

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, cerbero: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, type, L, bonus] of [RING, AMULET]) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, cerbero: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, style, L, atk, cd, el, range, , bonus] of WEAPONS) ITEMS[id] = { name, icon: style === 'ranged' ? '🏹' : '🔥', spr, type: 'weapon', style, atk, cd, range, el, bonus, cerbero: 1, minLevel: L, sell: sell(L, 8) };
  ITEMS.trofeo_cerbero = { name: 'Colmillo de Cerbero', icon: '🦷', type: 'misc', stack: true, sell: 50000 };
  MONSTERS.cerbero = {
    name: 'Cerbero, Guardián del Inframundo', icon: '🐕', lv: 910, hp: 600000, dmg: [430, 670], dmgK: 3.2, exp: 165000, move: 330, atkCd: 1100, aggro: 20, respawn: 60000, armor: 0.5, shared: true, boss: true, special: 'cerbero',
    gold: [57000, 82000], loot: [['trofeo_cerbero', 1, 1, 2], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10], ['pluma_fenix', 0.5, 1, 2]],
  };
  const boss = MONSTERS.cerbero;
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([RING[0], RING[6], 1, 1], [AMULET[0], AMULET[6], 1, 1]);
  for (const w of WEAPONS) boss.loot.push([w[0], w[9], 1, 1]);
}

/* ============================== comportamiento del jefe (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const rect = (m) => world.zoneAt(m.x, m.y).rect;
  const inCave = (q, R) => q.hp > 0 && q.x >= R[0] && q.x <= R[2] && q.y >= R[1] && q.y <= R[3];
  const floorOk = (x, y) => world.isWalkable(x, y) && world.tiles[y * world.W + x] !== world.T.LAVA;
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  const ORDER = ['llamarada', 'zarpazo', 'almas', 'aullido', 'embestida', 'cadenas', 'llamarada', 'almas', 'zarpazo', 'embestida', 'aullido', 'cadenas'];

  P.cerberoAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const kind = ORDER[(m.spN || 0) % ORDER.length]; m.spN = (m.spN || 0) + 1;
    const dur = this.cerberoCast(m, kind);
    const rage = m.hp <= m.maxHp * 0.3;
    m.nextSp = now + dur + (rage ? 1400 : 2600) + Math.random() * 1700;
    m.nextMove = Math.max(m.nextMove, now + 1000); m.nextAtk = Math.max(m.nextAtk, now + 1000);
  };

  const spots = (n, minD, R) => {
    const out = [];
    for (let k = 0; k < n * 80 && out.length < n; k++) {
      const x = rnd(R[0] + 3, R[2] - 3), y = rnd(R[1] + 3, R[3] - 3);
      if (!floorOk(x, y) || out.some((s) => Math.hypot(s.x - x, s.y - y) < minD)) continue;
      out.push({ x, y });
    }
    return out;
  };
  const distSeg = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, u = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(px - (x1 + vx * u), py - (y1 + vy * u)); };

  P.cerberoCast = function (m, kind) {
    const R = rect(m), alive = () => !m.dead && this.monsters.includes(m);
    const inside = () => [...this.players.values()].filter((q) => inCave(q, R));
    const say = (txt) => { for (const q of inside()) this.msg(q, txt, 'x'); };
    const cast = (T, root) => { this.fx.push({ k: 'cb_cast', x: m.x, y: m.y, id: m.id, T, kind }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };
    const hit = (q, lo, hi, name) => this.hurtPlayer(q, rnd(lo, hi), m, this.now, name);
    const slow = (q, ms) => { q.slowUntil = Math.max(q.slowUntil || 0, this.now + ms); };

    if (kind === 'llamarada') {                                                                   // tres cabezas, tres rayos de fuego
      say('🔥🔥🔥 ¡Cerbero escupe fuego con sus tres cabezas! ¡Sal de las líneas rojas!'); cast(1100, 4300);
      const WARN = 1300, pl = inside(), n = 3, LEN = 11;
      const tg = []; for (let i = 0; i < n; i++) { const q = pl.length ? pl[(i + rnd(0, 2)) % pl.length] : null; const a = q ? Math.atan2(q.y - m.y, q.x - m.x) : (i - 1) * 0.7 + Math.PI / 2; tg.push(a + (i - 1) * (pl.length > 2 ? 0 : 0.35)); }
      tg.forEach((a, i) => {
        const x1 = m.x, y1 = m.y, x2 = x1 + Math.cos(a) * LEN, y2 = y1 + Math.sin(a) * LEN;
        this.later(700 + i * 260, () => { if (alive()) this.fx.push({ k: 'cb_lane', x1, y1, x2, y2, T: WARN }); });
        this.later(700 + i * 260 + WARN, () => {
          if (!alive()) return;
          this.fx.push({ k: 'cb_flame', x1, y1, x2, y2 });
          for (const q of inside()) if (distSeg(q.x, q.y, x1, y1, x2, y2) <= 1.3) hit(q, 420, 580, 'Llamarada de Cerbero');
        });
      });
      return 700 + 2 * 260 + WARN + 500;
    }
    if (kind === 'zarpazo') {                                                                     // tres zarpazos seguidos
      say('🐾 ¡Cerbero levanta las garras! ¡Triple zarpazo: aléjate de él!'); cast(900, 3600);
      const WARN = 700, GAP = 800;
      for (let i = 0; i < 3; i++) this.later(700 + i * GAP, () => {
        if (!alive()) return; const cx = m.x, cy = m.y;
        this.fx.push({ k: 'cb_mk', x: cx, y: cy, r: 3.4, T: WARN });
        this.later(WARN, () => {
          if (!alive()) return; this.fx.push({ k: 'cb_claw', x: cx, y: cy, r: 3.4, id: m.id, i });
          for (const q of inside()) if (Math.hypot(q.x - cx, q.y - cy) <= 3.5) hit(q, 360, 520, 'Zarpazo');
        });
      });
      return 700 + 2 * GAP + WARN + 400;
    }
    if (kind === 'aullido') {                                                                     // onda de aullido: daño y ralentización
      say('🐺 ¡Los tres aullidos de Cerbero hacen temblar la cueva! ¡Alejaos o quedaréis lentos!'); cast(1300, 3200);
      const R2 = 9, WARN = 1300;
      this.later(500, () => { if (alive()) this.fx.push({ k: 'cb_howl', x: m.x, y: m.y, id: m.id, r: R2, T: WARN + 500 }); });
      this.later(WARN + 500, () => {
        if (!alive()) return;
        for (const q of inside()) { const d = Math.hypot(q.x - m.x, q.y - m.y); if (d <= R2) { hit(q, 260, 380, 'Aullido infernal'); slow(q, 4000); } }
      });
      return WARN + 1100;
    }
    if (kind === 'almas') {                                                                       // fuego de almas azul que se queda ardiendo
      say('💙🔥 ¡Del suelo brota el fuego de las almas! ¡No pises las llamas azules!'); cast(1200, 6200);
      const WAVES = 4, GAP = 1200, WARN = 900, BURN = 6000, fires = []; let ticking = false;
      const tick = () => {
        const nowT = this.now; for (let i = fires.length - 1; i >= 0; i--) if (fires[i].until <= nowT) fires.splice(i, 1);
        if (fires.length) { for (const q of inside()) if (fires.some((f) => Math.hypot(f.x - q.x, f.y - q.y) <= f.r + 0.3)) hit(q, 120, 190, 'Fuego de almas'); this.later(500, tick); } else ticking = false;
      };
      for (let w = 0; w < WAVES; w++) this.later(1000 + w * GAP, () => {
        if (!alive()) return;
        const pl = inside(), pts = spots(3 + Math.min(4, pl.length), 3, R);
        for (const q of pl) if (Math.random() < 0.7) pts.push({ x: Math.round(q.x), y: Math.round(q.y) });
        for (const s of pts) {
          this.fx.push({ k: 'cb_mk', x: s.x, y: s.y, r: 1.7, T: WARN, blue: 1 });
          this.later(WARN, () => {
            if (!alive()) return;
            this.fx.push({ k: 'cb_soul', x: s.x, y: s.y, r: 1.7, T: BURN });
            fires.push({ x: s.x, y: s.y, r: 1.7, until: this.now + BURN });
            for (const z of inside()) if (Math.hypot(z.x - s.x, z.y - s.y) <= 1.8) hit(z, 300, 430, 'Erupción de almas');
            if (!ticking) { ticking = true; this.later(500, tick); }
          });
        }
      });
      return 1000 + WAVES * GAP + WARN + 600;
    }
    if (kind === 'embestida') {                                                                   // se lanza en línea recta contra un jugador
      const pl = inside(); if (!pl.length) return 600;
      const q = pl[rnd(0, pl.length - 1)], dx0 = q.x - m.x, dy0 = q.y - m.y, L = Math.hypot(dx0, dy0) || 1, ux = dx0 / L, uy = dy0 / L, MAXL = Math.min(14, L + 3);
      let ex = m.x, ey = m.y; for (let s = 1; s <= MAXL; s++) { const nx = Math.round(m.x + ux * s), ny = Math.round(m.y + uy * s); if (!floorOk(nx, ny) || (this.mgrid.has(ny * world.W + nx) && this.mgrid.get(ny * world.W + nx) !== m)) break; ex = nx; ey = ny; }
      const x1 = m.x, y1 = m.y, WARN = 1200;
      say(`🐕💥 ¡Cerbero se prepara para embestir a ${q.name}! ¡Sal de la línea!`); cast(500, WARN + 900);
      this.fx.push({ k: 'cb_lane', x1, y1, x2: ex, y2: ey, T: WARN, wide: 1 });
      m.target = q.id;
      this.later(WARN, () => {
        if (!alive()) return;
        this.fx.push({ k: 'cb_dash', x1, y1, x2: ex, y2: ey, id: m.id });
        for (const z of inside()) if (distSeg(z.x, z.y, x1, y1, ex, ey) <= 1.5) hit(z, 480, 660, 'Embestida de Cerbero');
        if (!this.mgrid.has(ey * world.W + ex) || this.mgrid.get(ey * world.W + ex) === m) this.relocate(m, ex, ey);
        this.fx.push({ k: 'cb_quake', x: m.x, y: m.y });
      });
      return WARN + 900;
    }
    // cadenas de almas: arrastran a todos hacia él y los inmovilizan un instante antes del mordisco
    say('⛓️👻 ¡Cadenas de almas! ¡Cerbero os arrastra hacia sus fauces!'); cast(1000, 4500);
    const STEPS = 7, GAP = 280, STILL = 1500;
    this.later(800, () => { if (alive()) this.fx.push({ k: 'cb_chain', x: m.x, y: m.y, id: m.id, T: STEPS * GAP + STILL, r: 11 }); });
    for (let s = 0; s < STEPS; s++) this.later(1000 + s * GAP, () => {
      if (!alive()) return;
      for (const q of inside()) {
        if (Math.hypot(q.x - m.x, q.y - m.y) > 11 || cheb(m.x, m.y, q.x, q.y) <= 1) continue;
        const dx = Math.sign(m.x - q.x), dy = Math.sign(m.y - q.y);
        if (!this.tryStep(q, dx, dy, this.now) && dx && dy) { if (!this.tryStep(q, dx, 0, this.now)) this.tryStep(q, 0, dy, this.now); }
        q.nextMove = this.now + 450; this.fx.push({ k: 'cb_tug', i: q.id, x: q.x, y: q.y });
      }
    });
    this.later(1000 + STEPS * GAP, () => {
      if (!alive()) return;
      for (const q of inside()) if (cheb(m.x, m.y, q.x, q.y) <= 4) { q.nextMove = Math.max(q.nextMove || 0, this.now + STILL); this.fx.push({ k: 'cb_mk', x: Math.round(q.x), y: Math.round(q.y), r: 1.4, T: STILL, blue: 1, small: 1 }); }
      this.later(STILL, () => { if (!alive()) return; this.fx.push({ k: 'cb_bite', x: m.x, y: m.y, id: m.id }); for (const q of inside()) if (cheb(m.x, m.y, q.x, q.y) <= 4) hit(q, 400, 560, 'Mordisco de Cerbero'); });
    });
    return 1000 + STEPS * GAP + STILL + 500;
  };

  const GEAR = new Set([...PIECES, RING, AMULET, ...WEAPONS].map((q) => q[0]));
  const CH = new Map(); for (const q of PIECES) CH.set(q[0], q[7]); CH.set(RING[0], RING[6]); CH.set(AMULET[0], AMULET[6]); for (const w of WEAPONS) CH.set(w[0], w[9]);
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (m.type !== 'cerbero') return K0.call(this, m, now);
    const x = m.x, y = m.y, face = m.lf || 1, parts = []; let total = 0;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) { parts.push([pl, e.dmg]); total += e.dmg; } }
    const real = m.def, instK = m.instSlot ? require('./instancias').LOOT_K : 1;
    m.def = Object.assign({}, real, { loot: real.loot.filter((l) => !GEAR.has(l[0])) });
    let r; try { r = K0.call(this, m, now); } finally { m.def = real; }
    // equipo de Cerbero: botín para todos los que participan; cuanto más daño haces, más suerte (hasta ×3 el que más daño hizo)
    const I = require('./items'), topDmg = Math.max(1, ...parts.map((q) => q[1])), ranked = parts.slice().sort((a, b) => b[1] - a[1]);
    if (ranked.length) this.broadcastChat(`🐕 ¡Cerbero ha caído! Mayor daño: ${ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ')}.`, 'k');
    for (const [pl, dmg] of ranked) {
      if (dmg < 1) continue;
      const k = 1 + 2 * (dmg / topDmg);
      for (const id of GEAR) {
        if (Math.random() >= Math.min(0.6, CH.get(id) * 0.5 * require('./data').CFG.BOSS_DROP_K * k * instK * (this.lootMult ? this.lootMult(pl, id) : 1))) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, 'cerbero', id);
        this.msgC(pl, `🐕✨ ¡Botín de Cerbero: ${require('./data').ITEMS[id].name}!`, '#ff9a4a'); this.broadcastChat(`🐕 ¡${pl.name} ha conseguido ${require('./data').ITEMS[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    }
    this.fx.push({ k: 'cb_die', x, y, face });
    return r;
  };
}
module.exports = { build, install, PIECES, RING, AMULET, WEAPONS };
