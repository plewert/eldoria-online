'use strict';
/**
 * Minería: picos + rocas repartidas por el mapa (granito, pizarra, arenisca, basalto, obsidiana, mármol, pedernal y pómez).
 * Habilidad propia (nivel 1-320), cada roca pide un nivel y da piedra, experiencia y la posibilidad de encontrar gemas
 * para engarzar en las armas y el equipo. Los picos mejores minan más rápido y atraen más gemas.
 */
const { skillFromXp, skillXpFor } = require('./skills');
const MINE_MAX = 320, XP_SCALE = 20;
const mineLevel = (xp) => Math.min(MINE_MAX, skillFromXp(Math.max(0, xp) * XP_SCALE));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// roca: nivel de minería, experiencia, zonas donde aparece, cuántas, reaparición, probabilidad de gema y gemas posibles [gema, peso]
const ROCKS = {
  granito:   { name: 'Granito Rosado',    lvl: 1,   xp: 12,  zones: ['prado', 'colinas', 'bosque'],                     n: 42, respawn: 70000, gem: 0.03,  sell: 14,  pool: [['rubi', 10], ['zafiro', 10], ['esmeralda', 10], ['topacio', 10]] },
  arenisca:  { name: 'Arenisca Dorada',   lvl: 1,   xp: 12,  zones: ['dunas', 'sabana', 'playa'],                       n: 42, respawn: 70000, gem: 0.03,  sell: 14,  pool: [['rubi', 10], ['zafiro', 10], ['esmeralda', 10], ['topacio', 10]] },
  pizarra:   { name: 'Pizarra Azul',      lvl: 30,  xp: 60,  zones: ['pantano', 'catacumbas', 'minas', 'cumbres'],      n: 36, respawn: 80000, gem: 0.035, sell: 45,  pool: [['rubi', 10], ['zafiro', 10], ['esmeralda', 10], ['topacio', 10], ['amatista', 2]] },
  pedernal:  { name: 'Pedernal Oscuro',   lvl: 60,  xp: 140,  zones: ['selva', 'bosque', 'abismo', 'minas'],             n: 32, respawn: 85000, gem: 0.04,  sell: 95,  pool: [['rubi', 10], ['zafiro', 10], ['esmeralda', 10], ['topacio', 10], ['amatista', 4]] },
  pomez:     { name: 'Piedra Pómez',      lvl: 90,  xp: 260, zones: ['volcan', 'pantano', 'playa'],                     n: 30, respawn: 90000, gem: 0.045, sell: 170, pool: [['rubi', 10], ['zafiro', 10], ['esmeralda', 10], ['topacio', 10], ['amatista', 5], ['opalo', 1]] },
  marmol:    { name: 'Mármol Blanco',     lvl: 120,  xp: 450, zones: ['cumbres', 'fortaleza', 'piramide', 'colinas'],    n: 28, respawn: 95000, gem: 0.05,  sell: 320, pool: [['rubi', 8], ['zafiro', 8], ['esmeralda', 8], ['topacio', 8], ['amatista', 6], ['opalo', 2], ['diamante', 1]] },
  basalto:   { name: 'Basalto Negro',     lvl: 170,  xp: 800, zones: ['volcan', 'minas', 'piramide', 'abismo'],          n: 26, respawn: 100000, gem: 0.055, sell: 520, pool: [['amatista', 8], ['opalo', 3], ['diamante', 2], ['rubi', 5], ['zafiro', 5], ['esmeralda', 5]] },
  obsidiana: { name: 'Obsidiana',         lvl: 220, xp: 1500, zones: ['cueva_arana', 'cueva', 'cueva_jade', 'cueva_nube', 'cueva_mar'], n: 18, respawn: 120000, gem: 0.07, sell: 900, pool: [['amatista', 6], ['opalo', 5], ['diamante', 4]] },
};
const ORDER = ['granito', 'arenisca', 'pizarra', 'pedernal', 'pomez', 'marmol', 'basalto', 'obsidiana'];
// picos: nivel de minería para usarlos, velocidad (menos = más rápido), bonus de gemas y de piedra extra
const PICKS = {
  pico_piedra:    { name: 'Pico de Piedra',    spr: 'pk_piedra',    req: 1,   speed: 1.0,  gem: 0,    extra: 0,    price: 150 },
  pico_hierro:    { name: 'Pico de Hierro',    spr: 'pk_hierro',    req: 30,  speed: 0.9,  gem: 0.1,  extra: 0.05, price: 900 },
  pico_acero:     { name: 'Pico de Acero',     spr: 'pk_acero',     req: 60,  speed: 0.8,  gem: 0.2,  extra: 0.1,  price: 3200 },
  pico_cristal:   { name: 'Pico de Cristal',   spr: 'pk_cristal',   req: 120,  speed: 0.7,  gem: 0.35, extra: 0.15, price: 9000 },
  pico_obsidiana: { name: 'Pico de Obsidiana', spr: 'pk_obsidiana', req: 180,  speed: 0.6,  gem: 0.5,  extra: 0.2,  price: 26000 },
  pico_abismo:    { name: 'Pico del Abismo',   spr: 'pk_abismo',    req: 240, speed: 0.5,  gem: 0.75, extra: 0.3,  price: 70000 },
};
const RARE_GEMS = new Set(['amatista', 'opalo', 'diamante']);
const GEM_ICON = { rubi: '🔴', zafiro: '🔵', esmeralda: '🟢', topacio: '🟡', amatista: '🟣', opalo: '🟠', diamante: '💎' };

function build(ITEMS_, SHOPS) {
  const NODES = require('./extra').NODES;
  for (const id of ORDER) {
    const r = ROCKS[id];
    ITEMS_[id] = { name: r.name, icon: '🪨', spr: 'k_' + id, type: 'misc', stack: true, sell: r.sell };
    NODES['roca_' + id] = { icon: '🪨', name: r.name, rock: id, spr: 'rock_' + id, lvl: r.lvl, give: [[id, 1, 2]], zones: r.zones, n: r.n, respawn: r.respawn, xp: r.xp, gem: r.gem };
  }
  for (const [id, k] of Object.entries(PICKS)) ITEMS_[id] = { name: `${k.name} (minería ${k.req})`, icon: '⛏️', spr: k.spr, type: 'misc', pick: 1, price: k.price, sell: Math.round(k.price / 4) };
  SHOPS.boris.push(...Object.keys(PICKS));
}

module.exports = { build, ROCKS, PICKS, ORDER, MINE_MAX, install(Game) {
  const { ITEMS, GEMS } = require('./data');
  const world = require('./world');
  const P = Game.prototype;
  const have = (p, id) => p.inv.reduce((n, it) => n + (it && it.id === id ? it.qty : 0), 0);
  const lvOf = (p) => mineLevel(p.ext.mine.xp);
  const bestPick = (p, lv) => { let best = null; for (const id of Object.keys(PICKS)) if (have(p, id) && PICKS[id].req <= lv && (!best || PICKS[id].req > PICKS[best].req)) best = id; return best; };
  const colList = () => ORDER.map((id) => [id, 1]).concat(['rubi', 'zafiro', 'esmeralda', 'topacio', 'amatista', 'opalo', 'diamante'].map((g) => [g, g === 'opalo' || g === 'diamante' ? 0.01 : 0.03]));

  P.mineView = function (p) {
    const m = p.ext.mine, lv = lvOf(p), rocks = {};
    for (const [id, r] of Object.entries(ROCKS)) rocks[id] = { name: r.name, lvl: r.lvl, xp: r.xp, gem: r.gem, zones: r.zones.map((z) => (world.zoneById(z) || { name: z }).name), pool: r.pool.map((q) => q[0]) };
    return { t: 'mine', lv, xp: m.xp, lo: Math.ceil(skillXpFor(lv) / XP_SCALE), hi: lv >= MINE_MAX ? Math.ceil(skillXpFor(lv) / XP_SCALE) : Math.ceil(skillXpFor(lv + 1) / XP_SCALE), c: m.c,
      defs: { rocks, picks: PICKS, order: ORDER, max: MINE_MAX, scale: XP_SCALE, col: colList() } };
  };
  P.sendMine = function (p) { this.send(p, this.mineView(p)); };

  P.mineRock = function (p, n, nd) {
    const now = this.now; if (p.dead) return;
    const lv = lvOf(p), pick = bestPick(p, lv);
    if (!pick) { this.msgThrottle(p, 'nopick', Object.keys(PICKS).some((id) => have(p, id)) ? 'Tu nivel de minería es muy bajo para ese pico.' : '⛏️ Necesitas un pico para minar: Boris el Mercader los vende en la ciudad.'); return; }
    if (lv < nd.lvl) { this.msgThrottle(p, 'lowmine', `Esta roca (${nd.name}) necesita nivel de minería ${nd.lvl} (tienes ${lv}).`); return; }
    const k = PICKS[pick], r = ROCKS[nd.rock], e = p.ext.mine;
    p.nextGather = now + 1100 * k.speed; n.at = now + nd.respawn * (0.8 + Math.random() * 0.4);
    const before = lv;
    let q = rnd(1, 2) + (Math.random() < k.extra ? 1 : 0);
    this.giveOrDrop(p, nd.rock, q); this.logDrop(p, 'mineria', nd.rock);
    e.c[nd.rock] = (e.c[nd.rock] || 0) + q; e.xp += nd.xp;
    this.fx.push({ k: 'd', x: p.x, y: p.y, v: `+${q} ${ITEMS[nd.rock].name}`, c: 'g' });
    this.fx.push({ k: 'mn', x: n.x, y: n.y, r: nd.rock });
    // gema: más probable con mejor pico y más nivel
    const ch = r.gem * (1 + k.gem) * (1 + lv / 400);
    if (Math.random() < ch) {
      let t = r.pool.reduce((a, o) => a + o[1], 0) * Math.random(), g = r.pool[0][0];
      for (const [id, w] of r.pool) { t -= w; if (t <= 0) { g = id; break; } }
      this.giveOrDrop(p, g, 1); this.logDrop(p, 'mineria', g); e.c[g] = (e.c[g] || 0) + 1;
      this.msgC(p, `${RARE_GEMS.has(g) ? '🌟 ¡RARO! ' : '💎 '}¡Encuentras ${ITEMS[g].name} en la roca!`, GEMS[g].col);
      this.fx.push({ k: 'd', x: n.x, y: n.y, v: `${GEM_ICON[g]} ${ITEMS[g].name}`, c: 'g' });
      if (RARE_GEMS.has(g)) this.broadcastChat(`⛏️ ¡${p.name} ha encontrado ${ITEMS[g].name} minando ${nd.name}!`, 'k');
    }
    p.ext.gather++;
    const after = lvOf(p); if (after > before) this.msgC(p, `⛏️ ¡Tu nivel de minería sube a ${after}!`, '#ffd96a');
    p.dirty.inv = true;
    this.checkAch(p); this.sendMine(p); this.sendCol(p);
  };

  const H0 = P.handleExt;
  P.handleExt = function (p, msg) {
    if (msg.t === 'mine') { this.sendMine(p); return; }
    return H0.call(this, p, msg);
  };
  const L0 = P.onLogin;
  P.onLogin = function (p) { L0.call(this, p); this.sendMine(p); };
} };
