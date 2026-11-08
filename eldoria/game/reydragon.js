'use strict';
/**
 * Rey de los Dragones (Este II): jefe de la Guarida del Rey Dragón, una gran cueva al sur de las Llanuras del Amanecer.
 * - Mucha defensa (armor 0,62) y es débil SOLO a las armas de la familia dragón (ver familias.js: weakOnly).
 * - 7 ataques con aviso en el suelo: llamarada + temblor de rocas, aleteo (viento que empuja), cola, lluvia de bolas de fuego desde el aire,
 *   zarpazo triple, ráfagas de fuego en vuelo y aterrizaje con lava + derrumbe (hay que buscar un refugio).
 * - Suelta el set «Abisal» (3 armas, 5 piezas de armadura, 2 amuletos y 1 anillo), una cría (mascota) y una montura voladora muy raras.
 * La geometría de la cueva está en world.js (E2_CAVES + E2_PROPS).
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const BOSS = 'rey_dragones', ZONE = 'cueva_dragones';

/** [id, nombre, sprite, tipo, nivel, valor, bonus, probabilidad, opciones] */
const SET = [
  ['rdr_arco',      'Arco del Viajero del Tiempo (TWB) de Fuego', 'rd_bow',    'weapon', 170, 336, { atk: 14, crit: 0.05 }, 0.03,  { style: 'ranged', cd: 900,  range: 9, el: 'fire' }],
  ['rdr_guadana',   'Guadaña de la Cosecha Infernal',             'rd_scythe', 'weapon', 170, 348, { atk: 16, crit: 0.04, hp: 300 }, 0.03, { style: 'melee', cd: 1050, range: 1, el: 'fire' }],
  ['rdr_baston',    'Bastón de la Magia Abisal',                  'rd_staff',  'weapon', 170, 342, { mana: 260, crit: 0.03, atk: 10 }, 0.03, { style: 'magic', cd: 1050, range: 8, el: 'void' }],
  ['rdr_casco',     'Casco de Escamas Abisales',                  'rd_helm',   'head',   170, 66,  { hp: 520, mana: 120, crit: 0.02 }, 0.045, {}],
  ['rdr_peto',      'Peto de Dragón Abisal',                      'rd_chest',  'body',   170, 108, { hp: 820, atk: 18 }, 0.045, {}],
  ['rdr_guantes',   'Guanteletes del Creador de Fuego',           'rd_glove',  'gloves', 170, 54,  { hp: 360, atk: 20, crit: 0.03 }, 0.045, {}],
  ['rdr_musleras',  'Musleras de Piel Draconiana',                'rd_leg',    'legs',   170, 84,  { hp: 560, atk: 10 }, 0.045, {}],
  ['rdr_espolones', 'Espolones de la Tormenta',                   'rd_boot',   'boots',  170, 48,  { hp: 380, atk: 12 }, 0.045, {}],
  ['rdr_corazon',   'Corazón del Volcán',                         'rd_amu1',   'amulet', 170, 0,   { hp: 700, atk: 18, mana: 150 }, 0.04, {}],
  ['rdr_corona',    'Amuleto de la Corona Abisal',                'rd_amu2',   'amulet', 170, 0,   { hp: 600, mana: 280, crit: 0.04 }, 0.04, {}],
  ['rdr_anillo',    'Anillo de la Llama Eterna',                  'rd_ring',   'ring',   170, 0,   { atk: 26, hp: 380, crit: 0.04 }, 0.04, {}],
];
const ICON = { weapon: '⚔️', head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', amulet: '📿', ring: '💍' };
const WICON = { ranged: '🏹', magic: '🔮', melee: '⚔️' };

function build(ITEMS, MONSTERS, SPAWN_PLAN) {
  const gear = [];
  for (const [id, name, spr, type, lv, val, bonus, , o] of SET) {
    const base = { name, spr, type, bonus, este2: 'dragon_king', rdr: 1, fam: 'dragon', famFixed: 1, minLevel: lv, sell: Math.round(8 + lv * lv * 3.4) * (type === 'weapon' ? 8 : 5) };
    if (type === 'weapon') Object.assign(base, { icon: WICON[o.style], style: o.style, atk: val, cd: o.cd, range: o.range, el: o.el });
    else { base.icon = ICON[type]; if (val) base.def = val; }
    ITEMS[id] = base; gear.push(id);
  }
  ITEMS.trofeo_rey_dragones = { name: 'Corona del Rey de los Dragones', icon: '👑', type: 'misc', stack: true, sell: 90000 };
  MONSTERS[BOSS] = {
    boss: true, shared: true, name: 'Rey de los Dragones', icon: '🐲', lv: 900, hp: 1200000, dmg: [520, 780], dmgK: 3.3, exp: 260000, move: 470, atkCd: 1300, aggro: 18,
    respawn: 15 * 60000, armor: 0.62, weakOnly: 'dragon', fam: ['dragon', 'fuego'], gold: [20000, 32000], special: 'rdr',
    loot: [['trofeo_rey_dragones', 1, 1, 2], ['pocion_vida_g', 1, 6, 10], ['pocion_mana_g', 1, 5, 8], ['pluma_fenix', 0.9, 1, 3], ['rubi', 0.9, 3, 6], ['zafiro', 0.9, 3, 6], ['esmeralda', 0.8, 2, 5], ['montura_rey_dragones', 0.0012, 1, 1]],
  };
  for (const [type, n] of [['zombi_caballero', 6], ['nigromante', 5], ['banshee', 5]]) SPAWN_PLAN.push({ zone: ZONE, type, n });
  module.exports.GEAR = gear;
}
/** tras bosspets: la cría usa su propio sprite (solo reposo y paso) */
function post(ITEMS, MONSTERS) {
  const p = ITEMS['pet_' + BOSS];
  if (p) { p.name = 'Cría del Rey de los Dragones'; p.mon = 'rey_dragones_p'; p.scale = 0.9; p.icon = '🐲'; p.desc = 'Una cría del Rey de los Dragones te sigue y recoge el oro. +' + Math.round((p.gold || 0.3) * 100) + '% de oro.'; }
  const loot = MONSTERS[BOSS] && MONSTERS[BOSS].loot; const e = loot && loot.find((l) => l[0] === 'pet_' + BOSS); if (e) e[1] = 0.003;
}

/* ============================== ataques (servidor) ============================== */
function install(Game) {
  const P = Game.prototype, W = () => world.W;
  const COL = '255,120,30';
  const free = (x, y) => world.isWalkable(x, y);

  P.rdrAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const ORDER = ['llamarada', 'aleteo', 'cola', 'bolas', 'zarpazo', 'rafagas', 'lava'];
    const rage = m.hp <= m.maxHp * 0.3;
    let k = ORDER[(m.spN || 0) % ORDER.length]; m.spN = (m.spN || 0) + 1;
    if (rage && m.spN % 3 === 0) k = 'lava';
    const dur = this.rdrCast(m, k);
    m.nextSp = now + dur + (rage ? 1200 : 2400) + Math.random() * 1200;
    m.nextMove = Math.max(m.nextMove || 0, now + 900); m.nextAtk = Math.max(m.nextAtk || 0, now + 900);
  };

  P.rdrCast = function (m, kind) {
    const alive = () => !m.dead && this.monsters.includes(m);
    const rect = world.E2_CAVES.find((c) => c.zone === ZONE).rect;
    const inRect = (x, y) => x > rect[0] && x < rect[2] && y > rect[1] && y < rect[3];
    const near = () => [...this.players.values()].filter((q) => q.hp > 0 && inRect(q.x, q.y));
    const say = (txt) => { for (const q of near()) this.msg(q, `🐲 Rey de los Dragones: ¡${txt}!`, 'x'); };
    const dmgOf = (k) => Math.round(rnd(m.def.dmg[0], m.def.dmg[1]) * (k || 1));
    const hit = (q, k, name, extra) => { this.hurtPlayer(q, dmgOf(k), m, this.now, name); if (extra) extra(q); };
    const root = (ms) => { m.nextMove = Math.max(m.nextMove || 0, this.now + ms); m.nextAtk = Math.max(m.nextAtk || 0, this.now + ms); };
    const cast = (T, r) => { this.fx.push({ k: 'e2_cast', x: m.x, y: m.y, id: m.id, T, col: COL }); root(r); };
    const wide = (f) => { const lid = Math.random(), [a, b, c2, d] = rect, cx = (a + c2) >> 1, cy = (b + d) >> 1; for (const [x, y] of [[cx, cy], [a + 10, b + 8], [c2 - 10, b + 8], [a + 10, d - 8], [c2 - 10, d - 8]]) this.fx.push({ ...f, x, y, lid }); };   // la sala es más grande que la vista: el aviso llega desde varios puntos
    const fly = (ms) => { this.fx.push({ k: 'rd_fly', id: m.id, T: ms, x: m.x, y: m.y }); m.flying = this.now + ms; root(ms); };
    const circle = (x, y, r, warn, k, name, o) => {            // aviso + golpe en círculo
      this.fx.push({ k: 'e2_mk', x, y, r, T: warn, col: COL, small: o && o.small ? 1 : 0 });
      this.later(warn, () => { if (!alive()) return; this.fx.push({ k: 'e2_hit', x, y, r, col: COL, small: o && o.small ? 1 : 0 }); for (const z of near()) if (Math.hypot(z.x - x, z.y - y) <= r + 0.2) hit(z, k, name, o && o.on); });
    };
    const distSeg = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, u = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(px - (x1 + vx * u), py - (y1 + vy * u)); };
    const lane = (x1, y1, x2, y2, warn, k, name, wd) => {
      this.fx.push({ k: 'e2_lane', x1, y1, x2, y2, T: warn, col: COL });
      this.later(warn, () => { if (!alive()) return; this.fx.push({ k: 'e2_beam', x1, y1, x2, y2, col: COL }); for (const z of near()) if (distSeg(z.x, z.y, x1, y1, x2, y2) <= (wd || 1.4)) hit(z, k, name); });
    };
    const rockSpots = (n, aim) => {                               // posiciones al azar de la sala + algunas sobre los jugadores
      const pts = [], pl = near();
      for (const q of pl) if (aim && pts.length < aim) pts.push({ x: Math.round(q.x), y: Math.round(q.y) });
      for (let i = 0; i < 120 && pts.length < n; i++) { const x = rnd(rect[0] + 2, rect[2] - 2), y = rnd(rect[1] + 2, rect[3] - 2); if (free(x, y) && !pts.some((s) => Math.hypot(s.x - x, s.y - y) < 2.4)) pts.push({ x, y }); }
      return pts;
    };
    const rock = (x, y, r, warn, k, big) => {
      this.fx.push({ k: 'rd_rock', x, y, r, T: warn, big: big ? 1 : 0 });
      this.later(warn, () => { if (!alive()) return; for (const z of near()) if (Math.hypot(z.x - x, z.y - y) <= r + 0.2) hit(z, k, big ? 'Derrumbe' : 'Lluvia de rocas'); });
    };
    const push = (q, ax, ay, n) => {                              // empuja n casillas (se frena en paredes y otros) y devuelve cuánto avanzó
      const len = Math.hypot(ax, ay) || 1, dx = Math.round(ax / len * 100) / 100, dy = Math.round(ay / len * 100) / 100; let moved = 0;
      for (let i = 1; i <= n; i++) {
        const nx = Math.round(q.x + dx * i), ny = Math.round(q.y + dy * i);
        if (!free(nx, ny) || this.mgrid.has(ny * W() + nx) || [...this.players.values()].some((o) => o !== q && o.x === nx && o.y === ny)) break;
        moved = i;
      }
      if (moved) { q.x = Math.round(q.x + dx * moved); q.y = Math.round(q.y + dy * moved); q.pend = null; q.nextMove = Math.max(q.nextMove || 0, this.now + 400); }
      return moved;
    };
    const moveBoss = (x, y) => { this.mgrid.delete(m.y * W() + m.x); m.x = x; m.y = y; this.mgrid.set(y * W() + x, m); };

    if (kind === 'llamarada') {                                   // llamarada gigante: línea de fuego + temblor + lluvia de rocas
      say('Llamarada'); cast(1500, 4800);
      const pl = near(), q = pl.length ? pl[rnd(0, pl.length - 1)] : null, ang = q ? Math.atan2(q.y - m.y, q.x - m.x) : (m.lf || 1) > 0 ? 0 : Math.PI;
      const x2 = m.x + Math.cos(ang) * 16, y2 = m.y + Math.sin(ang) * 16;
      lane(m.x, m.y, x2, y2, 1500, 1.9, 'Llamarada gigante', 2.2);
      this.later(1500, () => { if (!alive()) return; wide({ k: 'rd_quake', T: 3800 }); say('¡La cueva tiembla! ¡Esquiva las piedras!'); });
      for (let w = 0; w < 3; w++) this.later(1900 + w * 1000, () => { if (!alive()) return; for (const s of rockSpots(8, 3)) rock(s.x, s.y, 1.3, 1100, 0.9, false); });
      return 1500 + 3 * 1000 + 1800;
    }
    if (kind === 'aleteo') {                                      // aleteo: ráfaga de viento que empuja hacia atrás
      say('Aleteo'); cast(1300, 2600);
      this.fx.push({ k: 'rd_wind', x: m.x, y: m.y, R: 12, T: 1300 });
      this.later(1300, () => { if (!alive()) return; this.fx.push({ k: 'rd_wind_hit', x: m.x, y: m.y, R: 12 }); for (const z of near()) { const d = Math.hypot(z.x - m.x, z.y - m.y); if (d > 12) continue; hit(z, 1.2, 'Ráfaga de viento'); const mv = push(z, z.x - m.x || 1, z.y - m.y, 6); if (mv < 3) this.hurtPlayer(z, Math.round(dmgOf(0.5)), m, this.now, 'Golpe contra la pared'); } });
      return 1300 + 1500;
    }
    if (kind === 'cola') {                                        // coletazo: onda alrededor del jefe
      say('Coletazo'); cast(1200, 2300);
      this.fx.push({ k: 'e2_mk', x: m.x, y: m.y, r: 6.5, T: 1200, col: COL, follow: m.id });
      this.later(1200, () => { if (!alive()) return; this.fx.push({ k: 'e2_hit', x: m.x, y: m.y, r: 6.5, col: COL, ring: 1 }); for (const z of near()) if (Math.hypot(z.x - m.x, z.y - m.y) <= 6.5) { hit(z, 1.4, 'Coletazo', (q) => { q.slowUntil = Math.max(q.slowUntil || 0, this.now + 3000); }); push(z, z.x - m.x || 1, z.y - m.y, 3); } });
      return 1200 + 1100;
    }
    if (kind === 'bolas') {                                       // vuela y bombardea con bolas de fuego que explotan al caer
      say('Lluvia de fuego'); fly(6200); cast(900, 6200);
      for (let w = 0; w < 5; w++) this.later(1200 + w * 900, () => {
        if (!alive()) return;
        for (const s of rockSpots(5, 3)) {
          this.fx.push({ k: 'rd_fb', x1: m.x, y1: m.y, x2: s.x, y2: s.y, T: 900 });
          circle(s.x, s.y, 1.9, 900, 0.95, 'Bola de fuego', { small: 1 });
        }
      });
      return 6200;
    }
    if (kind === 'zarpazo') {                                     // tres golpes seguidos sobre el objetivo
      say('Zarpazo'); cast(900, 3800);
      const pl = near(), q = pl.length ? pl[rnd(0, pl.length - 1)] : null;
      for (let i = 0; i < 3; i++) this.later(500 + i * 900, () => { if (!alive()) return; const t = q && q.hp > 0 ? q : null; circle(t ? Math.round(t.x) : m.x, t ? Math.round(t.y) : m.y, 3.6, 800, 1.7, 'Zarpazo'); });
      return 500 + 2 * 900 + 800 + 400;
    }
    if (kind === 'rafagas') {                                     // vuela por la sala escupiendo ráfagas de fuego contra los más cercanos
      say('Ráfagas de fuego'); fly(7600); cast(900, 7600);
      const spots = rockSpots(5, 0);
      for (let i = 0; i < 4; i++) this.later(1000 + i * 1700, () => { if (alive() && spots[i] && !this.mgrid.has(spots[i].y * W() + spots[i].x)) moveBoss(spots[i].x, spots[i].y); });
      for (let i = 0; i < 8; i++) this.later(1300 + i * 800, () => {
        if (!alive()) return;
        const pl = near().sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2);
        for (const q of pl) { const ang = Math.atan2(q.y - m.y, q.x - m.x); lane(m.x, m.y, m.x + Math.cos(ang) * 14, m.y + Math.sin(ang) * 14, 600, 0.85, 'Ráfaga de fuego', 1.2); }
      });
      return 7600;
    }
    // lava: aterriza, el suelo se llena de lava salvo unos refugios; después se derrumba la cueva
    say('Aterriza… ¡busca un refugio!'); cast(1000, 11500);
    this.fx.push({ k: 'rd_land', x: m.x, y: m.y });
    const safe = []; for (let i = 0; i < 300 && safe.length < 4; i++) { const x = rnd(rect[0] + 3, rect[2] - 3), y = rnd(rect[1] + 3, rect[3] - 3); if (free(x, y) && Math.hypot(x - m.x, y - m.y) > 4 && !safe.some((s) => Math.hypot(s[0] - x, s[1] - y) < 9)) safe.push([x, y, 2.4]); }
    const WARN = 2200, DUR = 6500;
    this.later(900, () => { if (!alive()) return; wide({ k: 'rd_quake', T: 3000 }); wide({ k: 'rd_lava', x0: rect[0], y0: rect[1], x1: rect[2], y1: rect[3], safe, warn: WARN, dur: DUR }); say('¡La lava inunda la sala!'); });
    for (let t = 0; t < DUR / 500; t++) this.later(900 + WARN + t * 500, () => { if (!alive()) return; for (const z of near()) if (!safe.some((s) => Math.hypot(z.x - s[0], z.y - s[1]) <= s[2] + 0.3)) this.hurtPlayer(z, dmgOf(0.38), m, this.now, 'Lava'); });
    for (let w = 0; w < 3; w++) this.later(900 + WARN + 600 + w * 1900, () => {
      if (!alive()) return; wide({ k: 'rd_quake', T: 1500 });
      for (const s of rockSpots(6, 2)) if (!safe.some((q) => Math.hypot(q[0] - s.x, q[1] - s.y) < 2.4)) rock(s.x, s.y, 2.3, 1300, 1.6, true);
    });
    return 900 + WARN + DUR + 1200;
  };

  // muerte: avisa, reparte el set según el daño hecho (como los jefes de cueva)
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    const def = m.def; if (!def || def.special !== 'rdr') return K0.call(this, m, now);
    const parts = []; for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) parts.push([pl, e.dmg]); }
    const x = m.x, y = m.y, face = m.lf || 1, D = require('./data'), I = require('./items');
    const r = K0.call(this, m, now);
    const topDmg = Math.max(1, ...parts.map((q) => q[1])), ranked = parts.slice().sort((a, b) => b[1] - a[1]);
    if (ranked.length) this.broadcastChat(`🐲 ¡${def.name} ha caído! Mayor daño: ${ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ')}.`, 'k');
    for (const [pl, dmg] of ranked) {
      if (dmg < 1) continue;
      const k = 1 + 2 * (dmg / topDmg), instK = m.instSlot ? require('./instancias').LOOT_K : 1;
      for (const s of SET) {
        const id = s[0];
        if (Math.random() >= Math.min(0.6, s[7] * 0.5 * D.CFG.BOSS_DROP_K * k * instK * (this.lootMult ? this.lootMult(pl, id) : 1))) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, m.type, id);
        this.msgC(pl, `🐲✨ ¡Botín de ${def.name}: ${D.ITEMS[id].name}!`, '#ffd27a'); this.broadcastChat(`🐲 ¡${pl.name} ha conseguido ${D.ITEMS[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    }
    this.fx.push({ k: 'e2_die', x, y, col: COL, face });
    return r;
  };
}
module.exports = { build, post, install, SET, BOSS, ZONE, GEAR: [] };
