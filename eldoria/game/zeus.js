'use strict';
/**
 * Zeus, Señor del Olimpo — jefe de El Olimpo (Montañas del Trueno).
 * Habilidades:
 *   1) Diez rayos: lanza 10 rayos seguidos al jugador; cada rayo que acierta lo ralentiza.
 *   2) Truenos perseguidores: invoca truenos que persiguen a los jugadores por toda la plataforma.
 *   3) Tormenta de miles de rayos: cae una lluvia enorme de rayos; hay que refugiarse en un cuadro seguro (marcado en dorado).
 *   4) Chispas: sus golpes sueltan chispas que saltan a los jugadores cercanos.
 * Botín raro: el equipo completo del Olimpo (yelmo, túnica, faldellín, sandalias, guantes, brazaletes, dos sellos, collar, égida) y el Cetro y el Arco de Zeus.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['zs_yelmo',     'Yelmo del Señor del Trueno',   'zs_helm',   'head',   100, 72, { hp: 420, atk: 9, crit: 0.03 }, 0.05],
  ['zs_peto',      'Túnica del Olimpo',            'zs_chest',  'body',   102, 94, { hp: 620, atk: 17 }, 0.04],
  ['zs_guantes',   'Guantes del Rayo',             'zs_glove',  'gloves', 101, 37, { hp: 200, atk: 15, crit: 0.02 }, 0.05],
  ['zs_pantalon',  'Faldellín del Olimpo',         'zs_leg',    'legs',   101, 51, { hp: 340, atk: 12 }, 0.05],
  ['zs_botas',     'Sandalias del Trueno',         'zs_boot',   'boots',  100, 41, { hp: 240, atk: 9 }, 0.05],
  ['zs_escudo',    'Égida de Zeus',                'zs_shield', 'shield', 102, 108, { hp: 720, atk: 9, crit: 0.02 }, 0.03],
];
const RINGS = [
  ['zs_anillo',  'Sello del Águila Real',         'zs_ring',  'ring', 100, { atk: 19, hp: 260, mana: 100, crit: 0.03 }, 0.05],
  ['zs_anillo2', 'Anillo del Zafiro de la Tormenta', 'zs_ring2', 'ring', 100, { atk: 17, hp: 240, mana: 130, crit: 0.03 }, 0.05],
];
const AMULET = ['zs_amuleto', 'Collar de las Águilas del Olimpo', 'zs_amulet', 'amulet', 101, { hp: 600, mana: 180, atk: 16, crit: 0.04 }, 0.04];
const BOW = ['zs_arco', 'Arco de las Tormentas', 'zs_bow', 'ranged', 102, 245, 1100, 'storm', 0.012];
const STAFF = ['zs_cetro', 'Cetro de Zeus', 'zs_staff', 'magic', 102, 255, 1100, 'storm', 0.012];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', belt: '🎗️', ring: '💍', amulet: '📿', shield: '🛡️' };

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, zeus: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, type, L, bonus] of [...RINGS, AMULET]) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, zeus: 1, minLevel: L, sell: sell(L, 5) };
  { const [id, name, spr, style, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style, atk, cd, range: 8, el, zeus: 1, minLevel: L, sell: sell(L, 8) }; }
  { const [id, name, spr, style, L, atk, cd, el] = STAFF; ITEMS[id] = { name, icon: '⚡', spr, type: 'weapon', style, atk, cd, range: 7, el, zeus: 1, minLevel: L, sell: sell(L, 8) }; }
  ITEMS.trofeo_zeus = { name: 'Rayo de Zeus', icon: '⚡', type: 'misc', stack: true, sell: 42000 };
  MONSTERS.zeus = {
    name: 'Zeus, Señor del Olimpo', icon: '⚡', lv: 850, hp: 560000, dmg: [380, 600], dmgK: 3.0, exp: 140000, move: 420, atkCd: 1250, aggro: 18, respawn: 60000, armor: 0.5, shared: true, boss: true, special: 'zeus',
    gold: [25000, 36000], loot: [['trofeo_zeus', 1, 1, 2], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10], ['pluma_fenix', 0.5, 1, 2]],
  };
  const boss = MONSTERS.zeus;
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  for (const r of RINGS) boss.loot.push([r[0], r[6], 1, 1]);
  boss.loot.push([AMULET[0], AMULET[6], 1, 1], [BOW[0], BOW[8], 1, 1], [STAFF[0], STAFF[8], 1, 1]);
}

/* ============================== comportamiento del jefe (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const rect = (m) => world.zoneAt(m.x, m.y).rect;
  const inCave = (q, R) => q.hp > 0 && q.x >= R[0] && q.x <= R[2] && q.y >= R[1] && q.y <= R[3];
  const floorOk = (x, y) => world.isWalkable(x, y) && world.tiles[y * world.W + x] === world.T.OLYF;
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  const ORDER = ['rayos', 'truenos', 'tormenta', 'rayos', 'tormenta', 'truenos'];

  P.zeusAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const kind = ORDER[(m.spN || 0) % ORDER.length]; m.spN = (m.spN || 0) + 1;
    const dur = this.zeusCast(m, kind);
    const rage = m.hp <= m.maxHp * 0.3;
    m.nextSp = now + dur + (rage ? 1500 : 2800) + Math.random() * 1800;
    m.nextMove = Math.max(m.nextMove, now + 1200); m.nextAtk = Math.max(m.nextAtk, now + 1200);
  };

  /** casillas de suelo libres repartidas por la plataforma */
  const spots = (g, n, minD, R, avoid) => {
    const out = [];
    for (let k = 0; k < n * 80 && out.length < n; k++) {
      const x = rnd(R[0] + 2, R[2] - 2), y = rnd(R[1] + 2, R[3] - 2);
      if (!floorOk(x, y)) continue;
      if (out.some((s) => Math.hypot(s.x - x, s.y - y) < minD) || (avoid && avoid.some((a) => Math.hypot(a.x - x, a.y - y) < 6))) continue;
      out.push({ x, y });
    }
    return out;
  };

  P.zeusCast = function (m, kind) {
    const R = rect(m), alive = () => !m.dead && this.monsters.includes(m);
    const inside = () => [...this.players.values()].filter((q) => inCave(q, R));
    const say = (txt) => { for (const q of inside()) this.msg(q, txt, 'x'); };
    const cast = (T, root) => { this.fx.push({ k: 'zs_cast', x: m.x, y: m.y, id: m.id, T, kind }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };
    const slow = (q, ms) => { q.slowUntil = Math.max(q.slowUntil || 0, this.now + ms); this.fx.push({ k: 'zs_slow', id: q.id, ms }); };

    if (kind === 'rayos') {                                                                       // 10 rayos consecutivos; cada impacto ralentiza
      say('⚡ ¡Zeus lanza diez rayos seguidos! Cada impacto te ralentiza.'); cast(1200, 5600);
      const N = 10, GAP = 450, WARN = 650;
      for (let i = 0; i < N; i++) this.later(900 + i * GAP, () => {
        if (!alive()) return;
        const pl = inside(); if (!pl.length) return;
        const q = pl[i % pl.length], tx = Math.round(q.x), ty = Math.round(q.y);
        this.fx.push({ k: 'zs_mk', x: tx, y: ty, r: 1.4, T: WARN, n: i });
        this.later(WARN, () => {
          if (!alive()) return;
          this.fx.push({ k: 'zs_bolt', x: tx, y: ty, r: 1.4, sx: m.x, sy: m.y });
          for (const z of inside()) if (Math.hypot(z.x - tx, z.y - ty) <= 1.5) { this.hurtPlayer(z, rnd(300, 415), m, this.now, 'Rayo de Zeus'); slow(z, 3500); }
        });
      });
      return 900 + N * GAP + WARN;
    }
    if (kind === 'truenos') {                                                                     // truenos que persiguen y SE MULTIPLICAN: hay que correr
      const pl0 = inside(), n = Math.min(4, 1 + pl0.length);
      say('🌩️ ¡Zeus invoca truenos que te persiguen y se multiplican! ¡Corre y no te dejes alcanzar!'); cast(1600, 3200);
      const born = spots(this, n, 5, R, pl0.map((q) => ({ x: q.x, y: q.y })));
      while (born.length < n) born.push({ x: Math.round(m.x) + born.length - 2, y: Math.round(m.y) + 2 });
      const STEP = 290, LIFE = 15000, SPLIT = 3800, until = this.now + 1500 + LIFE, cap = 8 + 3 * pl0.length;
      const hitAt = new Map(); let alive_n = 0, seq = 0;
      const spawn = (x, y, delay, gen) => {
        if (alive_n >= cap) return; alive_n++;
        const c = { id: 'zt' + m.id + '_' + (seq++) + '_' + this.now, x, y, split: this.now + delay + SPLIT };
        this.fx.push({ k: 'zs_chs', x: c.x, y: c.y, id: c.id, T: delay });
        const step = () => {
          if (!alive() || this.now > until) { alive_n--; this.fx.push({ k: 'zs_che', id: c.id, x: c.x, y: c.y }); return; }
          const pl = inside();
          if (pl.length) {
            let best = pl[0], bd = 1e9; for (const q of pl) { const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < bd) { bd = d; best = q; } }
            const sx = Math.sign(best.x - c.x), sy = Math.sign(best.y - c.y);
            const opts = Math.random() < 0.18 ? [[sx, -sy], [-sx, sy], [sx, sy], [sx, 0], [0, sy]] : [[sx, sy], [sx, 0], [0, sy], [sx, -sy], [-sx, sy]];
            for (const [dx, dy] of opts) { if ((dx || dy) && floorOk(c.x + dx, c.y + dy)) { c.x += dx; c.y += dy; break; } }
            this.fx.push({ k: 'zs_ch', id: c.id, x: c.x, y: c.y, T: STEP });
            for (const q of pl) if (Math.hypot(q.x - c.x, q.y - c.y) <= 1.25) {
              const key = c.id + ':' + q.id; if ((hitAt.get(key) || 0) > this.now) continue; hitAt.set(key, this.now + 1100);
              this.fx.push({ k: 'zs_hit', x: q.x, y: q.y });
              this.hurtPlayer(q, rnd(320, 440), m, this.now, 'Trueno perseguidor');
            }
            if (this.now >= c.split && until - this.now > 2500 && alive_n < cap) { c.split = this.now + SPLIT; this.fx.push({ k: 'zs_mul', x: c.x, y: c.y }); spawn(c.x, c.y, 300, gen + 1); }   // se multiplica
          }
          this.later(STEP, step);
        };
        this.later(delay, step);
      };
      for (const b of born) spawn(b.x, b.y, 1500, 0);
      return 1500 + LIFE;
    }
    // tormenta: miles de rayos; solo se está a salvo en los cuadros dorados
    const pl0 = inside(), nSafe = Math.max(2, Math.min(4, Math.ceil(pl0.length / 2) + 1));
    const safes = spots(this, nSafe, 9, R).map((s) => ({ x: s.x, y: s.y }));
    while (safes.length < 2) safes.push({ x: Math.round(m.x) + safes.length * 5 - 3, y: Math.round(m.y) + 4 });
    const inSafe = (x, y, pad) => safes.some((s) => cheb(x, y, s.x, s.y) <= 1 + (pad || 0));
    const WARN = 3600, STORM = 8000;
    say('🌩️ ¡Zeus desata una tormenta de miles de rayos! Refúgiate en un cuadro dorado.'); cast(1800, WARN + STORM + 800);
    for (const s of safes) this.fx.push({ k: 'zs_safe', x: s.x, y: s.y, T: WARN + STORM + 600 });
    this.fx.push({ k: 'zs_storm', T: WARN + STORM, w: WARN, x: Math.round((R[0] + R[2]) / 2), y: Math.round((R[1] + R[3]) / 2), r: R });
    const strike = (x, y, big) => {
      this.fx.push({ k: 'zs_bolt', x, y, r: big ? 1.6 : 1.3, small: big ? 0 : 1 });
      for (const z of inside()) if (!inSafe(z.x, z.y) && Math.hypot(z.x - x, z.y - y) <= (big ? 1.7 : 1.4)) this.hurtPlayer(z, big ? rnd(485, 645) : rnd(195, 285), m, this.now, big ? 'Rayo de la tormenta' : 'Lluvia de rayos');
    };
    const WAVES = Math.round(STORM / 230);
    for (let w = 0; w < WAVES; w++) this.later(WARN + w * 230, () => {
      if (!alive()) return;
      const k = 6 + Math.min(4, inside().length);
      for (let i = 0; i < k; i++) {
        const x = rnd(R[0] + 1, R[2] - 1), y = rnd(R[1] + 1, R[3] - 1);
        if (!floorOk(x, y) || inSafe(x, y, 1)) continue;
        this.fx.push({ k: 'zs_mk', x, y, r: 1.3, T: 380, small: 1 });
        this.later(380, () => { if (alive()) strike(x, y, false); });
      }
    });
    for (let s = 0; s < 7; s++) this.later(WARN + 700 + s * 1100, () => {                       // golpe directo a quien siga fuera de los cuadros
      if (!alive()) return;
      for (const q of inside()) if (!inSafe(q.x, q.y)) {
        const tx = Math.round(q.x), ty = Math.round(q.y); this.fx.push({ k: 'zs_mk', x: tx, y: ty, r: 1.7, T: 700 });
        this.later(700, () => { if (alive()) strike(tx, ty, true); });
      }
    });
    return WARN + STORM + 600;
  };

  const H0 = P.hurtPlayer;
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    const r = H0.call(this, p, raw, src, now, srcName);
    if (src && src.def && src.def.special === 'zeus' && !srcName && p.hp > 0) {                  // sus golpes sueltan chispas que saltan a los cercanos
      this.fx.push({ k: 'zs_spark', x: p.x, y: p.y, id: src.id });
      for (const q of this.players.values()) if (q !== p && q.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) <= 2.6) {
        H0.call(this, q, Math.max(1, Math.round(raw * 0.35)), src, now, 'Chispas de Zeus');
        this.fx.push({ k: 'zs_spark', x: q.x, y: q.y });
      }
    }
    return r;
  };

  const GEAR = new Set([...PIECES, ...RINGS, AMULET, BOW, STAFF].map((q) => q[0]));
  const CH = new Map(); for (const q of PIECES) CH.set(q[0], q[7]); for (const q of RINGS) CH.set(q[0], q[6]); CH.set(AMULET[0], AMULET[6]); CH.set(BOW[0], BOW[8]); CH.set(STAFF[0], STAFF[8]);
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (m.type !== 'zeus') return K0.call(this, m, now);
    const x = m.x, y = m.y, face = m.lf || 1, parts = []; let total = 0;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) { parts.push([pl, e.dmg]); total += e.dmg; } }
    const real = m.def, instK = m.instSlot ? require('./instancias').LOOT_K : 1;
    m.def = Object.assign({}, real, { loot: real.loot.filter((l) => !GEAR.has(l[0])) });                 // oro, trofeo y pociones: reparto normal
    let r; try { r = K0.call(this, m, now); } finally { m.def = real; }
    // equipo del Olimpo: botín para todos los que participan; cuanto más daño haces, más suerte (hasta ×3 el que más daño hizo)
    const I = require('./items'), need = total * 0.01, topDmg = Math.max(1, ...parts.map((q) => q[1])), ranked = parts.slice().sort((a, b) => b[1] - a[1]);
    if (ranked.length) this.broadcastChat(`⚡ ¡Zeus ha caído! Mayor daño: ${ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ')}.`, 'k');
    for (const [pl, dmg] of ranked) {
      if (dmg < need) continue;
      const k = 1 + 2 * (dmg / topDmg);
      for (const id of GEAR) {
        if (Math.random() >= Math.min(0.6, CH.get(id) * 0.5 * k * instK * (this.lootMult ? this.lootMult(pl, id) : 1))) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, 'zeus', id);
        this.msgC(pl, `⚡✨ ¡Botín de Zeus: ${ITEMS_REF()[id].name}!`, '#7fb8ff'); this.broadcastChat(`⚡ ¡${pl.name} ha conseguido ${ITEMS_REF()[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    }
    this.fx.push({ k: 'zs_die', x, y, face });
    return r;
  };
}
const ITEMS_REF = () => require('./data').ITEMS;
module.exports = { build, install, PIECES, RINGS, AMULET, BOW, STAFF };
