'use strict';
/**
 * Ignaros, Soberano del Magma — jefe de la Caldera (Tierras de Lava).
 * Ataques: 1) Infierno (toda la cueva arde; hay que refugiarse en el cuadro azul que aparece al azar),
 *          2) Lluvia de meteoritos con onda explosiva, 3) Líneas de fuego que cruzan toda la cueva,
 *          4) Marea de lava (la cueva se llena de lava; solo las rocas azules son seguras).
 * Botín raro: casco, pecho, capa, anillo, arco y bastón del Magma.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });   // carga perezosa (world.js depende de data.js)
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['ig_casco', 'Yelmo del Soberano del Magma', 'ig_helm', 'head', 90, 60, { hp: 360, atk: 7, crit: 0.03 }, 0.05],
  ['ig_pecho', 'Coraza de Basalto Ardiente', 'ig_chest', 'body', 92, 80, { hp: 560, atk: 15 }, 0.04],
];
const CAPE = ['ig_capa', 'Capa de Ceniza y Magma', 'ig_cape', 'cape', 90, 32, { hp: 380, atk: 10, crit: 0.02 }, 0.04, { cc: ['#5a3a2e', '#1a0c08', '#ff9a30'], glow: '#ff6a10' }];
const RING = ['ig_anillo', 'Anillo del Corazón de Magma', 'ig_ring', 'ring', 90, { atk: 15, hp: 220, mana: 80, crit: 0.03 }, 0.05];
const BOW = ['ig_arco', 'Arco Ígneo de Ignaros', 'ig_bow', 'ranged', 92, 215, 1100, 'fire', 0.012];
const STAFF = ['ig_baston', 'Bastón del Orbe Ardiente', 'ig_staff', 'magic', 92, 215, 1100, 'fire', 0.012];
const ICON = { head: '⛑️', body: '🛡️', cape: '🧥', ring: '💍' };

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, magma: 1, minLevel: L, sell: sell(L, 5) };
  { const [id, name, spr, type, L, def, bonus, , look] = CAPE; ITEMS[id] = { name, icon: ICON.cape, spr, type, def, bonus, magma: 1, minLevel: L, sell: sell(L, 5), cc: look.cc, glow: look.glow, flames: 1, big: 1 }; }
  { const [id, name, spr, type, L, bonus] = RING; ITEMS[id] = { name, icon: ICON.ring, spr, type, bonus, magma: 1, minLevel: L, sell: sell(L, 5) }; }
  for (const [id, name, spr, style, L, atk, cd, el] of [BOW, STAFF]) ITEMS[id] = { name, icon: style === 'ranged' ? '🏹' : '🔮', spr, type: 'weapon', style, atk, cd, range: style === 'ranged' ? 8 : 7, el, magma: 1, minLevel: L, sell: sell(L, 8) };
  ITEMS.trofeo_magma = { name: 'Corazón de Magma', icon: '🌋', type: 'misc', stack: true, sell: 32000 };
  MONSTERS.ignaros = {
    name: 'Ignaros, Soberano del Magma', icon: '🌋', lv: 750, hp: 460000, dmg: [270, 450], dmgK: 2.6, exp: 115000, move: 440, atkCd: 1300, aggro: 16, respawn: 60000, armor: 0.5, shared: true, boss: true, special: 'magma',
    gold: [20000, 30000], loot: [['trofeo_magma', 1, 1, 2], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10], ['pluma_fenix', 0.5, 1, 2]],
  };
  const boss = MONSTERS.ignaros;
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([CAPE[0], CAPE[7], 1, 1], [RING[0], RING[6], 1, 1], [BOW[0], BOW[8], 1, 1], [STAFF[0], STAFF[8], 1, 1]);
}

/* ============================== comportamiento del jefe (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const cave = () => world.zoneById('cueva_magma').rect;
  const inCave = (q) => { const R = cave(); return q.hp > 0 && q.x >= R[0] && q.x <= R[2] && q.y >= R[1] && q.y <= R[3]; };

  P.magmaAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const order = ['inferno', 'meteoros', 'lineas', 'lava', 'meteoros', 'inferno', 'lineas'];
    const kind = order[(m.spN || 0) % order.length];
    m.spN = (m.spN || 0) + 1;
    const dur = this.magmaCast(m, kind);
    m.nextSp = now + dur + 3000 + Math.random() * 2000;
    m.nextMove = Math.max(m.nextMove, now + 1500); m.nextAtk = Math.max(m.nextAtk, now + 1500);
  };

  /** Lanza un ataque y devuelve cuánto dura (ms). */
  P.magmaCast = function (m, kind) {
    const R = cave(), alive = () => !m.dead && this.monsters.includes(m);
    const inside = () => [...this.players.values()].filter(inCave);
    const floorOk = (x, y) => world.isWalkable(x, y) && world.tiles[y * world.W + x] === world.T.MAGF;
    const say = (txt) => { for (const q of inside()) this.msg(q, txt, 'x'); };
    const burn = (q, ms) => this.fx.push({ k: 'brn', id: q.id, ms: ms || 1800 });
    // elige un cuadrado w x w de suelo libre (cerca del primer jugador para que dé tiempo a llegar)
    const pickSquare = (w, avoid) => {
      const pl = inside(), anchor = pl[0] || m;
      for (let k = 0; k < 400; k++) {
        const a = Math.random() * 6.28, d = 3 + Math.random() * 15, x = Math.round(anchor.x + Math.cos(a) * d), y = Math.round(anchor.y + Math.sin(a) * d);
        if (x < R[0] + 2 || x + w > R[2] - 1 || y < R[1] + 2 || y + w > R[3] - 1) continue;
        let ok = true; for (let yy = y; yy < y + w && ok; yy++) for (let xx = x; xx < x + w; xx++) if (!floorOk(xx, yy)) { ok = false; break; }
        if (ok && avoid.every((s) => Math.hypot(s.x - x, s.y - y) >= 7)) return { x, y, w };
      }
      return null;
    };
    const cc = { x: Math.round((R[0] + R[2]) / 2), y: Math.round((R[1] + R[3]) / 2) };      // los efectos de toda la cueva se anclan al centro (el servidor filtra por distancia)
    const cast = (T, root) => { this.fx.push({ k: 'mcast', x: m.x, y: m.y, id: m.id, kind, T }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };   // pose de lanzamiento y quieto mientras dura
    const bx = m.x, by = m.y;
    const sq = (s, q) => Math.round(q.x) >= s.x && Math.round(q.x) < s.x + s.w && Math.round(q.y) >= s.y && Math.round(q.y) < s.y + s.w;

    if (kind === 'inferno') {                                        // toda la cueva arde: hay que meterse en el cuadro azul
      const w = inside().length > 3 ? 5 : 3, s = pickSquare(w, []) || { x: Math.round(m.x) - 1, y: Math.round(m.y) + 3, w: 3 };
      this.fx.push({ k: 'mgw', x: cc.x, y: cc.y, sx: s.x, sy: s.y, w: s.w, T: 4500, r: R });
      say('🔥 ¡La cueva se enciende! Corre al cuadro azul para refugiarte.'); cast(4500, 7200);
      this.later(4500, () => {
        if (!alive()) return;
        this.fx.push({ k: 'mgf', x: cc.x, y: cc.y, bx, by, sx: s.x, sy: s.y, w: s.w, T: 2600, r: R });
        const hit = (lo, hi, tag) => { for (const q of inside()) if (!sq(s, q)) { this.hurtPlayer(q, rnd(lo, hi), m, this.now, tag); burn(q); } };
        hit(260, 360, 'Infierno');
        for (let i = 1; i <= 5; i++) this.later(i * 500, () => { if (alive()) hit(70, 110, 'Fuego de la caldera'); });
      });
      return 7200;
    }
    if (kind === 'meteoros') {                                       // meteoritos con aviso; al caer, onda explosiva
      const n = 12 + Math.min(8, inside().length * 2);
      say('☄️ ¡Llueven meteoritos! Sal de los círculos rojos.'); cast(2200, n * 380 + 1500);
      for (let i = 0; i < n; i++) this.later(i * 380, () => {
        if (!alive()) return;
        const pl = inside(), tgt = pl.length && Math.random() < 0.45 ? pl[rnd(0, pl.length - 1)] : null;
        const x = tgt ? Math.round(tgt.x) : rnd(R[0] + 3, R[2] - 3), y = tgt ? Math.round(tgt.y) : rnd(R[1] + 3, R[3] - 2);
        this.fx.push({ k: 'mmw', x, y, r: 2, T: 1100, bx: m.x, by: m.y });
        this.later(1100, () => {
          if (!alive()) return;
          this.fx.push({ k: 'mmx', x, y, r: 2 });
          const direct = new Set();
          for (const q of inside()) if (Math.hypot(q.x - x, q.y - y) <= 2.2) { direct.add(q.id); this.hurtPlayer(q, rnd(250, 350), m, this.now, 'Meteorito'); burn(q); }
          this.later(280, () => {                                      // onda explosiva que se expande
            if (!alive()) return;
            for (const q of inside()) { const d = Math.hypot(q.x - x, q.y - y); if (!direct.has(q.id) && d > 2.2 && d <= 5) this.hurtPlayer(q, rnd(100, 160), m, this.now, 'Onda explosiva'); }
          });
        });
      });
      return n * 380 + 1500;
    }
    if (kind === 'lineas') {                                         // rayos de fuego desde el jefe y líneas que cruzan toda la cueva
      say('🔥 ¡Líneas de fuego! Cruza entre ellas.'); cast(1800, 6800);
      const seg = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 });
      const fire = (lines, warnMs) => {
        for (const l of lines) this.fx.push(Object.assign({ k: 'mlw', w: 2, T: warnMs, x: cc.x, y: cc.y, r: R }, l));
        this.later(warnMs, () => {
          if (!alive()) return;
          const hit = new Set();
          for (const l of lines) this.fx.push(Object.assign({ k: 'ml', w: 2, T: 800, x: cc.x, y: cc.y, r: R }, l));
          for (let step = 0; step < 6; step++) this.later(step * 130, () => {                  // el fuego dura un instante: se comprueba varias veces
            if (!alive()) return;
            for (const q of inside()) for (const [i, l] of lines.entries()) {
              const vx = l.x2 - l.x1, vy = l.y2 - l.y1, u = Math.max(0, Math.min(1, ((q.x - l.x1) * vx + (q.y - l.y1) * vy) / (vx * vx + vy * vy)));
              if (Math.hypot(q.x - (l.x1 + vx * u), q.y - (l.y1 + vy * u)) <= 1.2 && !hit.has(q.id + ':' + i)) { hit.add(q.id + ':' + i); this.hurtPlayer(q, rnd(230, 330), m, this.now, 'Línea de fuego'); burn(q); }
            }
          });
        });
      };
      this.later(1500, () => {                                       // ronda 1: onda del jefe y 8 rayos radiales
        if (!alive()) return;
        this.fx.push({ k: 'mmx', x: bx, y: by, r: 3 });
        const a0 = Math.random() * Math.PI / 4, lines = [];
        for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; lines.push(seg(bx, by, bx + Math.cos(a) * 40, by + Math.sin(a) * 40)); }
        fire(lines, 1300);
      });
      this.later(1500 + 3200, () => {                                // ronda 2: líneas horizontales y verticales por toda la cueva
        if (!alive()) return;
        const lines = [], pl = inside(), want = 4 + (pl.length > 2 ? 1 : 0), used = [];
        const add = (h, v) => { used.push({ h, v }); lines.push(h ? seg(R[0] + 1, v, R[2] - 1, v) : seg(v, R[1] + 1, v, R[3] - 1)); };
        if (pl[0]) { const h = Math.random() < 0.5; add(h, Math.round(h ? pl[0].y : pl[0].x)); }
        for (let k = 0; k < 40 && lines.length < want; k++) { const h = Math.random() < 0.5, v = h ? rnd(R[1] + 3, R[3] - 2) : rnd(R[0] + 3, R[2] - 3); if (used.every((l) => l.h !== h || Math.abs(l.v - v) >= 4)) add(h, v); }
        fire(lines, 1300);
      });
      return 1500 + 3200 + 2300;
    }
    // lava: la cueva se llena; solo las rocas azules son seguras
    const pl = inside(), isl = [], need = 3 + Math.ceil(pl.length / 3);
    for (let k = 0; k < need; k++) { const s = pickSquare(3, isl.map((i) => ({ x: i.x - 1, y: i.y - 1 }))); if (s) isl.push({ x: s.x + 1, y: s.y + 1, r: 2.4 }); }
    if (!isl.length) isl.push({ x: Math.round(m.x), y: Math.round(m.y) + 3, r: 2.4 });
    say('🌋 ¡La caldera se inunda de lava! Sube a las rocas azules.'); cast(4000, 4000);
    this.fx.push({ k: 'mlw2', x: cc.x, y: cc.y, isl, T: 4000, r: R });
    this.later(4000, () => {
      if (!alive()) return;
      this.fx.push({ k: 'mlv', x: cc.x, y: cc.y, bx, by, isl, r: R, rise: 1800, hold: 6500, ebb: 1600 });
      const until = this.now + 1800 + 6500;
      const tick = () => {
        if (!alive()) return; const nw = this.now; if (nw > until) return;
        if (nw > until - 6500) for (const q of inside()) if (!isl.some((i) => Math.hypot(q.x - i.x, q.y - i.y) <= i.r)) { this.hurtPlayer(q, rnd(90, 140), m, nw, 'Lava'); burn(q, 1400); }
        this.later(500, tick);
      };
      this.later(1800, tick);
    });
    return 4000 + 1800 + 6500 + 1600;
  };
}
module.exports = { build, install, PIECES, CAPE, RING, BOW, STAFF };
