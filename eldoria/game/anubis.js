'use strict';
/**
 * Anubis, Juez de las Sombras — jefe de la Tumba de Anubis (Desierto de las Pirámides).
 * Ataques: 1) Miasma de las tumbas (golpea el suelo con el báculo: grietas y nubes oscuras que dañan sin parar y reducen la curación y la regeneración),
 *          2) Portales verdes por toda la cueva que disparan flechas de fuego verde (explotan al caer: hay que esquivarlas),
 *          3) Se divide en 3 sombras (cuerpo a cuerpo, mágica y a distancia): mientras duran, Anubis es inmune,
 *          4) Con poca vida revive una Momia Eterna: al morir explota y lanza fuego negro por toda la cueva.
 * Botín raro: set completo del Juicio (máscara, armadura, guantelete, grebas, botas, cinturón, sello, amuleto) y el Arco del Chacal Alado.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['an_yelmo',     'Máscara de Anubis, Juez de las Sombras', 'an_helm',  'head',   95, 66, { hp: 380, atk: 8, crit: 0.03 }, 0.05],
  ['an_peto',      'Armadura del Juicio',                    'an_chest', 'body',   97, 88, { hp: 580, atk: 16 }, 0.04],
  ['an_guantes',   'Guantelete del Juicio Final',            'an_glove', 'gloves', 96, 34, { hp: 180, atk: 14, crit: 0.02 }, 0.05],
  ['an_pantalon',  'Armadura de Pantalón del Juicio',        'an_leg',   'legs',   96, 48, { hp: 320, atk: 11 }, 0.05],
  ['an_botas',     'Botas de la Ascensión Divina',           'an_boot',  'boots',  95, 38, { hp: 220, atk: 8 }, 0.05],
  ['an_cinto',     'Cinturón del Plumaje Nocturno',          'an_belt',  'belt',   96, 30, { hp: 300, atk: 11 }, 0.05],
];
const RING = ['an_anillo', 'Sello del Juicio Final', 'an_ring', 'ring', 95, { atk: 18, hp: 240, mana: 90, crit: 0.03 }, 0.05];
const AMULET = ['an_amuleto', 'Corazón de la Balanza', 'an_amulet', 'amulet', 96, { hp: 560, mana: 170, atk: 15, crit: 0.04 }, 0.04];
const BOW = ['an_arco', 'Arco del Chacal Alado', 'an_bow', 'ranged', 97, 235, 1100, 'poison', 0.012];
const STAFF = ['an_baston', 'Báculo del Chacal Alado', 'an_staff', 'magic', 97, 245, 1100, 'poison', 0.012];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', belt: '🎗️', ring: '💍', amulet: '📿' };

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, anubis: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, type, L, bonus] of [RING, AMULET]) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, anubis: 1, minLevel: L, sell: sell(L, 5) };
  { const [id, name, spr, style, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style, atk, cd, range: 8, el, anubis: 1, minLevel: L, sell: sell(L, 8) }; }
  { const [id, name, spr, style, L, atk, cd, el] = STAFF; ITEMS[id] = { name, icon: '🔮', spr, type: 'weapon', style, atk, cd, range: 7, el, anubis: 1, minLevel: L, sell: sell(L, 8) }; }
  ITEMS.trofeo_anubis = { name: 'Balanza de Anubis', icon: '⚖️', type: 'misc', stack: true, sell: 36000 };
  MONSTERS.anubis = {
    name: 'Anubis, Juez de las Sombras', icon: '🐺', lv: 800, hp: 480000, dmg: [270, 450], dmgK: 2.6, exp: 120000, move: 430, atkCd: 1300, aggro: 16, respawn: 60000, armor: 0.5, shared: true, boss: true, special: 'anubis',
    gold: [20000, 30000], loot: [['trofeo_anubis', 1, 1, 2], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10], ['pluma_fenix', 0.5, 1, 2]],
  };
  const boss = MONSTERS.anubis;
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([RING[0], RING[6], 1, 1], [AMULET[0], AMULET[6], 1, 1], [BOW[0], BOW[8], 1, 1], [STAFF[0], STAFF[8], 1, 1]);
  // las tres sombras (invocadas) y la momia que revive; no sueltan nada
  const base = { lv: 300, exp: 1500, aggro: 24, respawn: 999999999, armor: 0.25, gold: [0, 0], loot: [] };
  MONSTERS.anubis_sombra_m = Object.assign({ name: 'Sombra de Anubis (cuerpo a cuerpo)', icon: '🌑', hp: 5000, dmg: [260, 420], move: 340, atkCd: 1000, spr: 'anubis', shade: 'rgba(200,50,90,.6)', glow: '255,60,90' }, base);
  MONSTERS.anubis_sombra_h = Object.assign({ name: 'Sombra de Anubis (mágica)', icon: '🌑', hp: 4000, dmg: [240, 400], move: 520, atkCd: 1500, range: 6, proj: 'poison', spr: 'anubis', shade: 'rgba(130,80,255,.6)', glow: '170,90,255' }, base);
  MONSTERS.anubis_sombra_a = Object.assign({ name: 'Sombra de Anubis (a distancia)', icon: '🌑', hp: 4000, dmg: [220, 360], move: 420, atkCd: 1100, range: 8, proj: 'arrow', spr: 'anubis', shade: 'rgba(40,200,140,.6)', glow: '60,255,170' }, base);
  MONSTERS.momia_eterna = { name: 'Momia Eterna del Juicio', icon: '🩹', lv: 320, hp: 20000, dmg: [260, 430], exp: 8000, move: 520, atkCd: 1200, aggro: 24, respawn: 999999999, armor: 0.2, gold: [0, 0], loot: [], spr: 'momia_eterna' };
}

/* ============================== comportamiento del jefe (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const rect = () => world.zoneById('cueva_anubis').rect;
  const inCave = (q) => { const R = rect(); return q.hp > 0 && q.x >= R[0] && q.x <= R[2] && q.y >= R[1] && q.y <= R[3]; };
  const floorOk = (x, y) => world.isWalkable(x, y) && world.tiles[y * world.W + x] === world.T.TOMBF;
  const KIDS = ['anubis_sombra_m', 'anubis_sombra_h', 'anubis_sombra_a', 'momia_eterna'];

  P.anubisAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    this.anubisSweep(m);
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    if (m.shadowsUntil > now) return;
    let kind;
    if (!m.mummyDone && m.hp <= m.maxHp * 0.3) { kind = 'momia'; m.mummyDone = true; }
    else { const order = ['miasma', 'portales', 'miasma', 'sombras', 'portales', 'miasma', 'portales', 'sombras']; kind = order[(m.spN || 0) % order.length]; m.spN = (m.spN || 0) + 1; }
    const dur = this.anubisCast(m, kind);
    m.nextSp = now + dur + 2500 + Math.random() * 2000;
    m.nextMove = Math.max(m.nextMove, now + 1500); m.nextAtk = Math.max(m.nextAtk, now + 1500);
  };

  /** retira las invocaciones muertas, caducadas o de un jefe que ya cayó */
  P.anubisSweep = function (m) {
    const kids = this.monsters.filter((z) => z.parent === m);
    if (!kids.length) return;
    const now = this.now, bossUp = !m.dead && this.monsters.includes(m);
    for (const q of kids) if (q.dead || !bossUp || now >= (q.diesAt || Infinity)) { this.mgrid.delete(q.y * world.W + q.x); this.monsters = this.monsters.filter((z) => z !== q); this.ents.delete(q.id); }
  };

  const spots = (g, n, minD, avoid) => {                                                          // casillas de suelo libres repartidas por la cueva
    const R = rect(), out = [];
    for (let k = 0; k < n * 60 && out.length < n; k++) {
      const x = rnd(R[0] + 3, R[2] - 3), y = rnd(R[1] + 3, R[3] - 2);
      if (!floorOk(x, y) || g.mgrid.has(y * world.W + x) || g.pgrid.has(y * world.W + x)) continue;
      if (out.some((s) => Math.hypot(s.x - x, s.y - y) < minD) || (avoid && Math.hypot(avoid.x - x, avoid.y - y) < 4)) continue;
      out.push({ x, y });
    }
    return out;
  };

  P.anubisCast = function (m, kind) {
    const R = rect(), alive = () => !m.dead && this.monsters.includes(m);
    const inside = () => [...this.players.values()].filter(inCave);
    const say = (txt) => { for (const q of inside()) this.msg(q, txt, 'x'); };
    const cc = { x: Math.round((R[0] + R[2]) / 2), y: Math.round((R[1] + R[3]) / 2) };                // los efectos de toda la cueva se anclan al centro
    const cast = (T, root) => { this.fx.push({ k: 'an_cast', x: m.x, y: m.y, id: m.id, T, kind }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };
    const dot = (q, ms) => { q.antiHeal = Math.max(q.antiHeal || 0, this.now + (ms || 4000)); this.fx.push({ k: 'an_dot', id: q.id, ms: ms || 4000 }); };

    if (kind === 'miasma') {                                                                      // golpe del báculo: grietas y miasma que sigue dañando
      const bx = m.x, by = m.y;
      say('☠️ Anubis golpea el suelo con su báculo: ¡sal de las grietas y del miasma!'); cast(1700, 3400);
      this.fx.push({ k: 'an_hw', x: bx, y: by, r: 4.6, T: 1500 });
      this.later(1500, () => {
        if (!alive()) return;
        this.fx.push({ k: 'an_crack', x: bx, y: by, r: 11, T: 1600 });
        for (const q of inside()) if (Math.hypot(q.x - bx, q.y - by) <= 4.6) { this.hurtPlayer(q, rnd(330, 450), m, this.now, 'Golpe del báculo'); dot(q, 5000); }
        const pl = inside(), zones = [{ x: bx, y: by + 1 }];
        for (const q of pl.slice(0, 4)) zones.push({ x: Math.round(q.x), y: Math.round(q.y) });
        for (const s of spots(this, 3, 6)) zones.push(s);
        for (const z of zones) { z.r = 3.4; this.fx.push({ k: 'an_ms', x: z.x, y: z.y, r: z.r, T: 9500 }); }
        const until = this.now + 9500;
        const tick = () => {
          if (!alive()) return; const nw = this.now; if (nw > until) return;
          for (const q of inside()) if (zones.some((z) => Math.hypot(q.x - z.x, q.y - z.y) <= z.r)) { this.hurtPlayer(q, rnd(75, 115), m, nw, 'Miasma de las tumbas'); dot(q, 4000); }
          this.later(500, tick);
        };
        this.later(300, tick);
      });
      return 1500 + 9500;
    }
    if (kind === 'portales') {                                                                    // portales verdes: flechas de fuego verde que explotan al caer
      const n = 6 + Math.min(3, inside().length);
      const pts = spots(this, n, 6, m);
      say('🟢 ¡Se abren portales verdes! Esquiva las flechas de fuego verde.'); cast(1500, 3000);
      for (const p of pts) this.fx.push({ k: 'an_pt', x: p.x, y: p.y, T: 11500 });
      const rounds = 7;
      for (let r = 0; r < rounds; r++) this.later(1800 + r * 1300, () => {
        if (!alive()) return;
        const pl = inside(); if (!pl.length) return;
        const shooters = pts.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(pts.length, 3 + Math.floor(pl.length / 2)));
        for (const p of shooters) {
          const q = pl[rnd(0, pl.length - 1)], tx = Math.round(q.x + (Math.random() - 0.5) * 2), ty = Math.round(q.y + (Math.random() - 0.5) * 2);
          this.fx.push({ k: 'an_ar', x1: p.x, y1: p.y, x2: tx, y2: ty, r: 1.7, T: 1000 });
          this.later(1000, () => {
            if (!alive()) return;
            this.fx.push({ k: 'an_bm', x: tx, y: ty, r: 1.7 });
            for (const z of inside()) if (Math.hypot(z.x - tx, z.y - ty) <= 1.8) this.hurtPlayer(z, rnd(250, 350), m, this.now, 'Flecha de fuego verde');
          });
        }
      });
      return 1800 + rounds * 1300 + 1800;
    }
    if (kind === 'sombras') {                                                                     // se divide en 3 sombras; Anubis es inmune mientras duren
      const n = Math.max(1, inside().length), K = 1 + 0.35 * (n - 1);
      const sp = spots(this, 3, 3, m); while (sp.length < 3) sp.push({ x: Math.round(m.x) + sp.length - 1, y: Math.round(m.y) + 3 });
      say('🌑 ¡Anubis se divide en tres sombras! Derrótalas para que vuelva a ser vulnerable.'); cast(1800, 3200);
      this.fx.push({ k: 'an_split', x: m.x, y: m.y, id: m.id, T: 1800, sp });
      m.shieldUntil = this.now + 40000; m.shadowsUntil = this.now + 40000;
      m.nextAtk = this.now + 40000;
      const kids = [];
      this.later(1700, () => {
        if (!alive()) return;
        ['anubis_sombra_m', 'anubis_sombra_h', 'anubis_sombra_a'].forEach((type, i) => {
          const s = sp[i], k = this.spawnMonster(type, s.x, s.y);
          k.maxHp = k.hp = Math.round(k.def.hp * K); k.noRespawn = true; k.respawnAt = Infinity; k.parent = m; k.diesAt = this.now + 40000; k.target = m.target;
          this.fx.push({ k: 'an_sp', x: s.x, y: s.y }); kids.push(k);
        });
      });
      const watch = () => {
        if (!alive()) return;
        if (kids.length && kids.every((k) => k.dead) || this.now > m.shadowsUntil - 1) {
          m.shieldUntil = 0; m.shadowsUntil = 0; m.nextAtk = this.now + 1500; m.nextSp = Math.max(m.nextSp || 0, this.now + 2500);
          this.fx.push({ k: 'an_merge', x: m.x, y: m.y, id: m.id, T: 1200 });
          for (const q of inside()) this.msg(q, '⚖️ Las sombras caen y Anubis vuelve a ser vulnerable.', 'x');
          return;
        }
        this.later(500, watch);
      };
      this.later(2500, watch);
      return 3500;
    }
    // momia: Anubis revive una momia que, al morir, explota y lanza fuego negro por toda la cueva
    const spot = spots(this, 1, 3, m)[0] || { x: Math.round(m.x), y: Math.round(m.y) + 3 };
    say('🩹 Anubis revive a una Momia Eterna… ¡cuidado cuando muera!'); cast(2000, 3200);
    this.fx.push({ k: 'an_rev', x: spot.x, y: spot.y, T: 2000 });
    this.later(1900, () => {
      if (!alive()) return;
      const n = Math.max(1, inside().length), mu = this.spawnMonster('momia_eterna', spot.x, spot.y);
      mu.maxHp = mu.hp = Math.round(mu.def.hp * (1 + 0.35 * (n - 1))); mu.noRespawn = true; mu.respawnAt = Infinity; mu.parent = m; mu.diesAt = this.now + 240000; mu.target = m.target;
      this.fx.push({ k: 'an_sp', x: spot.x, y: spot.y });
    });
    return 3500;
  };

  /** la momia murió: explosión y fuego negro por toda la cueva */
  P.anubisBoom = function (mu) {
    const R = rect(), boss = mu.parent, bx = mu.x, by = mu.y;
    const alive = () => boss && !boss.dead && this.monsters.includes(boss);
    const inside = () => [...this.players.values()].filter(inCave);
    const cc = { x: Math.round((R[0] + R[2]) / 2), y: Math.round((R[1] + R[3]) / 2) };
    for (const q of inside()) this.msg(q, '💥 ¡La momia explota y lanza fuego negro por toda la cueva!', 'x');
    this.fx.push({ k: 'an_mx', x: bx, y: by, r: 5 });
    for (const q of inside()) if (Math.hypot(q.x - bx, q.y - by) <= 4.5) this.hurtPlayer(q, rnd(450, 620), boss || mu, this.now, 'Explosión de la momia');
    // 8 rayos de fuego negro desde la momia
    const a0 = Math.random() * Math.PI / 4, lines = [];
    for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; lines.push({ x1: bx, y1: by, x2: bx + Math.cos(a) * 40, y2: by + Math.sin(a) * 40 }); }
    for (const l of lines) this.fx.push(Object.assign({ k: 'an_lw', w: 2, T: 1300, x: cc.x, y: cc.y, r: R }, l));
    this.later(1300, () => {
      const hit = new Set();
      for (const l of lines) this.fx.push(Object.assign({ k: 'an_l', w: 2, T: 800, x: cc.x, y: cc.y, r: R }, l));
      for (let st = 0; st < 6; st++) this.later(st * 130, () => {
        for (const q of inside()) for (const [i, l] of lines.entries()) {
          const vx = l.x2 - l.x1, vy = l.y2 - l.y1, u = Math.max(0, Math.min(1, ((q.x - l.x1) * vx + (q.y - l.y1) * vy) / (vx * vx + vy * vy)));
          if (Math.hypot(q.x - (l.x1 + vx * u), q.y - (l.y1 + vy * u)) <= 1.2 && !hit.has(q.id + ':' + i)) { hit.add(q.id + ':' + i); this.hurtPlayer(q, rnd(380, 520), boss || mu, this.now, 'Rayo de fuego negro'); }
        }
      });
    });
    // lluvia de bolas de fuego negro por todo el recinto
    const n = 14 + Math.min(8, inside().length * 2);
    for (let i = 0; i < n; i++) this.later(1800 + i * 330, () => {
      const pl = inside(), tgt = pl.length && Math.random() < 0.5 ? pl[rnd(0, pl.length - 1)] : null;
      const x = tgt ? Math.round(tgt.x) : rnd(R[0] + 3, R[2] - 3), y = tgt ? Math.round(tgt.y) : rnd(R[1] + 3, R[3] - 2);
      this.fx.push({ k: 'an_bfw', x, y, r: 2, T: 1000 });
      this.later(1000, () => {
        this.fx.push({ k: 'an_bf', x, y, r: 2 });
        for (const q of inside()) if (Math.hypot(q.x - x, q.y - y) <= 2.2) this.hurtPlayer(q, rnd(300, 430), boss || mu, this.now, 'Fuego negro');
      });
    });
  };

  // curación reducida por el miasma + hooks de muerte
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    const r = K0.call(this, m, now);
    if (m.type === 'momia_eterna' && m.parent && !m.parent.dead) this.anubisBoom(m);
    if (m.type === 'anubis') { for (const k of this.monsters.filter((z) => z.parent === m)) { this.mgrid.delete(k.y * world.W + k.x); this.monsters = this.monsters.filter((z) => z !== k); this.ents.delete(k.id); } }
    return r;
  };
}
module.exports = { build, install, PIECES, RING, AMULET, BOW, STAFF };
