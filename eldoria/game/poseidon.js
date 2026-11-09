'use strict';
/**
 * Poseidón, Rey de los Mares — jefe del Santuario de Poseidón (Paraíso de Coral).
 * Seis especiales:
 *   1) Remolino: un torbellino de agua atrae a los jugadores y los daña; al final estalla.
 *   2) Tridente: lanza su tridente a los jugadores (marca en el suelo, impacto con ralentización).
 *   3) Olas gigantes: olas enormes recorren toda la cueva; solo se salva quien esté en el carril calmo.
 *   4) Oscuridad: oscurece la cueva y las corrientes abisales golpean a quien se quede quieto.
 *   5) Ráfagas de agua: abanicos de chorros a presión.
 *   6) Bolas de agua: cada jugador de la cueva recibe una bola de agua.
 * Además: invoca a su amiga la Ballena Abisal (3 especiales propios) y, a ciertos umbrales de vida, entra en
 * modo «burbuja de agua»: se cura, pero sigue recibiendo daño (la mitad).
 * Botín raro: el equipo completo del Rey de los Mares (corona, coraza, guanteletes, grebas, botas, capa, sello, perla),
 * el Arco de las Mareas, el Báculo de Poseidón y el Tridente de Poseidón.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad, (look de capa)] */
const PIECES = [
  ['ps_corona',   'Corona de Poseidón',            'ps_helm',  'head',   104, 76,  { hp: 460, atk: 10, crit: 0.03 }, 0.05],
  ['ps_coraza',   'Coraza de las Mareas',          'ps_chest', 'body',   106, 98,  { hp: 660, atk: 18 }, 0.04],
  ['ps_guantes',  'Guanteletes del Abismo',        'ps_glove', 'gloves', 105, 39,  { hp: 220, atk: 16, crit: 0.02 }, 0.05],
  ['ps_grebas',   'Grebas del Océano',             'ps_leg',   'legs',   105, 54,  { hp: 360, atk: 13 }, 0.05],
  ['ps_botas',    'Botas de Coral Real',           'ps_boot',  'boots',  104, 43,  { hp: 260, atk: 10 }, 0.05],
  ['ps_capa',     'Capa del Rey de los Mares',     'ps_cape',  'cape',   105, 36,  { hp: 420, atk: 11, crit: 0.02 }, 0.04, { cc: ['#2a8fc9', '#0a2c55', '#8ff0ff'], glow: '#38c8ff' }],
];
const RINGS = [['ps_anillo', 'Sello del Tridente', 'ps_ring', 'ring', 104, { atk: 21, hp: 280, mana: 110, crit: 0.03 }, 0.05]];
const AMULET = ['ps_amuleto', 'Perla del Rey de los Mares', 'ps_amulet', 'amulet', 105, { hp: 640, mana: 190, atk: 17, crit: 0.04 }, 0.04];
const BOW = ['ps_arco', 'Arco de las Mareas', 'ps_bow', 'ranged', 106, 262, 1100, 'water', 0.012];
const STAFF = ['ps_cetro', 'Báculo de Poseidón', 'ps_staff', 'magic', 106, 272, 1100, 'water', 0.012];
const TRIDENT = ['ps_tridente', 'Tridente de Poseidón', 'ps_trident', 'melee', 106, 268, 1100, 'water', 0.012];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', belt: '🎗️', ring: '💍', amulet: '📿', shield: '🛡️', cape: '🧣' };

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus, , look] of PIECES) {
    ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, poseidon: 1, minLevel: L, sell: sell(L, 5) };
    if (look) { ITEMS[id].cc = look.cc; ITEMS[id].glow = look.glow; }
  }
  for (const [id, name, spr, type, L, bonus] of [...RINGS, AMULET]) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, poseidon: 1, minLevel: L, sell: sell(L, 5) };
  { const [id, name, spr, style, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style, atk, cd, range: 8, el, poseidon: 1, minLevel: L, sell: sell(L, 8) }; }
  { const [id, name, spr, style, L, atk, cd, el] = STAFF; ITEMS[id] = { name, icon: '🔮', spr, type: 'weapon', style, atk, cd, range: 7, el, poseidon: 1, minLevel: L, sell: sell(L, 8) }; }
  { const [id, name, spr, style, L, atk, cd, el] = TRIDENT; ITEMS[id] = { name, icon: '🔱', spr, type: 'weapon', style, atk, cd, range: 1, el, poseidon: 1, minLevel: L, sell: sell(L, 8) }; }
  ITEMS.trofeo_poseidon = { name: 'Perla de Poseidón', icon: '🔱', type: 'misc', stack: true, sell: 46000 };
  MONSTERS.poseidon = {
    name: 'Poseidón, Rey de los Mares', icon: '🔱', lv: 900, hp: 680000, dmg: [400, 640], dmgK: 3.0, exp: 160000, move: 400, atkCd: 1250, aggro: 18, respawn: 60000, armor: 0.5, shared: true, boss: true, special: 'poseidon',
    gold: [28000, 40000], loot: [['trofeo_poseidon', 1, 1, 2], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10]],
  };
  MONSTERS.ballena = {
    name: 'Ballena Abisal, Amiga de Poseidón', icon: '🐋', lv: 700, hp: 90000, dmg: [260, 420], dmgK: 3.0, exp: 0, move: 330, atkCd: 1300, aggro: 24, respawn: 999999999, armor: 0.3, gold: [0, 0], loot: [], special: 'ballena',
  };
  const boss = MONSTERS.poseidon;
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  for (const r of RINGS) boss.loot.push([r[0], r[6], 1, 1]);
  boss.loot.push([AMULET[0], AMULET[6], 1, 1], [BOW[0], BOW[8], 1, 1], [STAFF[0], STAFF[8], 1, 1], [TRIDENT[0], TRIDENT[8], 1, 1]);
}

/* ============================== comportamiento (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const rect = (m) => world.zoneAt(m.x, m.y).rect;
  const inCave = (q, R) => q.hp > 0 && q.x >= R[0] && q.x <= R[2] && q.y >= R[1] && q.y <= R[3];
  const floorOk = (x, y) => { if (!world.isWalkable(x, y)) return false; const t = world.tiles[y * world.W + x]; return t === world.T.PSF || t === world.T.PSA; };
  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy; if (!L2) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)); return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  const ORDER = ['tridente', 'remolino', 'rafagas', 'olas', 'bolas', 'oscuridad', 'rafagas', 'tridente', 'olas', 'remolino', 'bolas', 'oscuridad'];
  const BUB_AT = [0.72, 0.45, 0.22], BUB_MS = 9000, BUB_TAKE = 0.5, BUB_HEAL = 0.012;       // burbuja: umbrales de vida, duración, daño recibido y cura por tick (cada 600 ms)
  const WORDER = ['chorros', 'embestida', 'geiseres'];

  const spots = (n, minD, R, avoid) => {
    const out = [];
    for (let k = 0; k < n * 80 && out.length < n; k++) {
      const x = rnd(R[0] + 2, R[2] - 2), y = rnd(R[1] + 2, R[3] - 2);
      if (!floorOk(x, y)) continue;
      if (out.some((s) => Math.hypot(s.x - x, s.y - y) < minD) || (avoid && avoid.some((a) => Math.hypot(a.x - x, a.y - y) < 5))) continue;
      out.push({ x, y });
    }
    return out;
  };
  const freeNear = (g, x, y, r) => {
    for (let k = 0; k < 60; k++) {
      const cx = Math.round(x) + rnd(-r, r), cy = Math.round(y) + rnd(-r, r);
      if (floorOk(cx, cy) && !g.mgrid.has(cy * world.W + cx) && !g.pgrid.has(cy * world.W + cx)) return { x: cx, y: cy };
    }
    return null;
  };
  const common = (g, m) => {
    const R = rect(m), alive = () => !m.dead && g.monsters.includes(m);
    const inside = () => [...g.players.values()].filter((q) => inCave(q, R));
    const say = (txt) => { for (const q of inside()) g.msg(q, txt, 'x'); };
    const slow = (q, ms) => { q.slowUntil = Math.max(q.slowUntil || 0, g.now + ms); };
    return { R, alive, inside, say, slow };
  };

  /* ---------------------------------- Poseidón ---------------------------------- */
  P.poseidonAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    this.psKids(m);
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    if (now < (m.bubbleUntil || 0)) { m.nextAtk = Math.max(m.nextAtk, now + 300); m.nextMove = Math.max(m.nextMove, now + 300); return; }   // en la burbuja no ataca ni se mueve
    const ratio = m.hp / m.maxHp;
    if ((m.bubN || 0) < BUB_AT.length && ratio <= BUB_AT[m.bubN || 0]) { this.psBubble(m); return; }
    if (m.whaleAt === undefined) m.whaleAt = now + 7000;
    if (now >= m.whaleAt && !this.monsters.some((z) => z.parent === m && z.type === 'ballena' && !z.dead)) { this.psSummon(m); return; }
    if (now < (m.nextSp || 0)) return;
    const kind = ORDER[(m.spN || 0) % ORDER.length]; m.spN = (m.spN || 0) + 1;
    const dur = this.psCast(m, kind);
    const rage = ratio <= 0.3;
    m.nextSp = now + dur + (rage ? 1400 : 2700) + Math.random() * 1700;
    m.nextMove = Math.max(m.nextMove, now + 1200); m.nextAtk = Math.max(m.nextAtk, now + 1200);
  };

  /** modo burbuja de agua: se cura pero sigue recibiendo daño */
  P.psBubble = function (m) {
    const { alive, say } = common(this, m);
    m.bubN = (m.bubN || 0) + 1; const until = this.now + BUB_MS; m.bubbleUntil = until;
    m.nextSp = Math.max(m.nextSp || 0, until + 1500); m.nextAtk = Math.max(m.nextAtk, until); m.nextMove = Math.max(m.nextMove, until);
    this.fx.push({ k: 'ps_bub', x: m.x, y: m.y, id: m.id, T: BUB_MS });
    say('🫧 ¡Poseidón se envuelve en una burbuja de agua y se cura! Sigue recibiendo daño: ¡ataca sin parar!');
    for (let i = 1; i <= Math.floor(BUB_MS / 600); i++) this.later(i * 600, () => {
      if (!alive() || m.bubbleUntil !== until) return;
      const h = Math.min(m.maxHp - m.hp, Math.round(m.maxHp * BUB_HEAL)); if (h <= 0) return;
      m.hp += h; this.fx.push({ k: 'ps_heal', x: m.x, y: m.y, id: m.id });
      if (i % 3 === 0) this.fx.push({ k: 'd', x: m.x, y: m.y - 0.5, v: '🫧 +' + h, c: 'x' });
    });
    this.later(BUB_MS, () => { if (alive() && m.bubbleUntil === until) { m.bubbleUntil = 0; this.fx.push({ k: 'ps_bubx', x: m.x, y: m.y, id: m.id }); } });
  };

  /** invoca a la ballena */
  P.psSummon = function (m) {
    const { alive, say } = common(this, m);
    const s = freeNear(this, m.x, m.y, 4); m.whaleAt = this.now + 40000; if (!s) return;
    say('🐋 ¡Poseidón invoca a su amiga, la Ballena Abisal!');
    this.fx.push({ k: 'ps_cast', x: m.x, y: m.y, id: m.id, T: 1400, kind: 'invocar' }); this.fx.push({ k: 'ps_summon', x: s.x, y: s.y, T: 1500 });
    m.nextMove = Math.max(m.nextMove, this.now + 1500); m.nextAtk = Math.max(m.nextAtk, this.now + 1500); m.nextSp = Math.max(m.nextSp || 0, this.now + 2500);
    this.later(1500, () => {
      if (!alive()) return;
      const sp = this.mgrid.has(s.y * world.W + s.x) || this.pgrid.has(s.y * world.W + s.x) ? freeNear(this, s.x, s.y, 3) : s; if (!sp) return;
      const c = this.spawnMonster('ballena', sp.x, sp.y);
      c.maxHp = c.hp = Math.max(60000, Math.round(m.maxHp * 0.1)); c.noRespawn = true; c.respawnAt = Infinity; c.parent = m; c.target = m.target; c.instSlot = m.instSlot; c.instMul = m.instMul;
      this.fx.push({ k: 'ps_appear', x: sp.x, y: sp.y, id: c.id, r: 2 });
    });
  };

  /** quita las ballenas muertas o huérfanas */
  P.psKids = function (m) {
    const kids = this.monsters.filter((z) => z.parent === m); if (!kids.length) return;
    const up = !m.dead && this.monsters.includes(m);
    for (const q of kids) if (q.dead || !up) {
      if (!q.dead) this.fx.push({ k: 'ps_vanish', x: q.x, y: q.y, id: q.id });
      else if (m.whaleAt !== undefined && m.whaleAt < this.now + 30000) m.whaleAt = this.now + 30000;     // si la matan, tarda en volver
      this.mgrid.delete(q.y * world.W + q.x); this.monsters = this.monsters.filter((z) => z !== q); this.ents.delete(q.id);
    }
  };

  P.psCast = function (m, kind) {
    const { R, alive, inside, say, slow } = common(this, m);
    const cast = (T, root) => { this.fx.push({ k: 'ps_cast', x: m.x, y: m.y, id: m.id, T, kind }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };

    if (kind === 'remolino') {                                                                    // remolino de agua: atrae y daña
      const pl0 = inside(), tgt = pl0.length ? pl0[rnd(0, pl0.length - 1)] : m;
      const cx = Math.round(tgt.x), cy = Math.round(tgt.y), WARN = 1300, LIFE = 7500, RAD = 9;
      say('🌀 ¡Poseidón invoca un REMOLINO! Te atrae hacia su centro: ¡aléjate!'); cast(1200, 1200 + LIFE);
      this.fx.push({ k: 'ps_mk', x: cx, y: cy, r: 2, T: WARN, big: 1 });
      this.later(WARN, () => {
        if (!alive()) return;
        this.fx.push({ k: 'ps_whirl', x: cx, y: cy, r: RAD, T: LIFE });
        const end = this.now + LIFE;
        const tick = () => {
          if (!alive() || this.now >= end) return;
          for (const q of inside()) {
            const d = Math.hypot(q.x - cx, q.y - cy); if (d > RAD) continue;
            slow(q, 900);
            if (d > 1.2) {
              const dx = Math.sign(cx - q.x), dy = Math.sign(cy - q.y);
              if (!this.tryStep(q, dx, dy, this.now) && dx && dy) { if (!this.tryStep(q, dx, 0, this.now)) this.tryStep(q, 0, dy, this.now); }
              this.fx.push({ k: 'ps_tug', i: q.id, x: q.x, y: q.y });
            }
            if (Math.hypot(q.x - cx, q.y - cy) <= 2.2) { this.fx.push({ k: 'ps_hit', x: q.x, y: q.y }); this.hurtPlayer(q, rnd(150, 230), m, this.now, 'Remolino de Poseidón'); }
          }
          this.later(420, tick);
        };
        tick();
        this.later(LIFE, () => {
          if (!alive()) return;
          this.fx.push({ k: 'ps_burst', x: cx, y: cy, r: 3 });
          for (const q of inside()) if (Math.hypot(q.x - cx, q.y - cy) <= 3) this.hurtPlayer(q, rnd(430, 570), m, this.now, 'Estallido del remolino');
        });
      });
      return WARN + LIFE + 300;
    }
    if (kind === 'tridente') {                                                                    // lanza el tridente a los jugadores
      const pl0 = inside(); if (!pl0.length) return 600;
      const N = Math.min(4, 2 + pl0.length), GAP = 900, WARN = 1000, FLY = 420;
      say('🔱 ¡Poseidón lanza su tridente! Sal de las marcas.'); cast(1200, 1200 + N * GAP);
      for (let i = 0; i < N; i++) this.later(700 + i * GAP, () => {
        if (!alive()) return;
        const pl = inside(); if (!pl.length) return;
        const q = pl[i % pl.length], tx = Math.round(q.x), ty = Math.round(q.y), sx = m.x, sy = m.y;
        this.fx.push({ k: 'ps_mk', x: tx, y: ty, r: 1.6, T: WARN, n: i });
        this.later(WARN - FLY, () => { if (alive()) this.fx.push({ k: 'ps_trident', sx, sy, x: tx, y: ty, T: FLY }); });
        this.later(WARN, () => {
          if (!alive()) return;
          this.fx.push({ k: 'ps_stab', x: tx, y: ty, r: 1.7 });
          for (const z of inside()) if (Math.hypot(z.x - tx, z.y - ty) <= 1.7) { this.hurtPlayer(z, rnd(560, 740), m, this.now, 'Tridente de Poseidón'); slow(z, 2800); }
        });
      });
      return 700 + N * GAP + WARN;
    }
    if (kind === 'olas') {                                                                        // olas enormes que recorren toda la cueva
      const WAVES = 3, WARN = 1800, SPEED = 7, GAPW = 5, SPACING = 3000;
      say('🌊 ¡Poseidón alza OLAS ENORMES que recorrerán toda la cueva! Ponte en el carril calmo.'); cast(1400, 1400 + WAVES * SPACING);
      const W0 = R[0] + 1, W1 = R[2] - 1, LEN = W1 - W0, DUR = Math.round(LEN / SPEED * 1000);
      for (let w = 0; w < WAVES; w++) {
        const dir = w % 2 === 0 ? 1 : -1, gy = rnd(R[1] + 4, R[3] - 5), gya = gy - 2, gyb = gya + GAPW - 1, t0 = 600 + w * SPACING;
        this.later(t0, () => {
          if (!alive()) return;
          this.fx.push({ k: 'ps_wmk', x0: W0, x1: W1, y0: R[1] + 1, y1: R[3] - 1, ga: gya, gb: gyb, dir, T: WARN });
          this.later(WARN, () => {
            if (!alive()) return;
            this.fx.push({ k: 'ps_wave', x0: W0, x1: W1, y0: R[1] + 1, y1: R[3] - 1, ga: gya, gb: gyb, dir, T: DUR });
            const start = this.now, hit = new Set();
            const tick = () => {
              if (!alive()) return;
              const el = this.now - start, xf = dir > 0 ? W0 + el / 1000 * SPEED : W1 - el / 1000 * SPEED;
              for (const q of inside()) {
                if (hit.has(q.id) || Math.abs(q.x - xf) > 1.6 || (q.y >= gya - 0.4 && q.y <= gyb + 0.4)) continue;
                hit.add(q.id); this.fx.push({ k: 'ps_hit', x: q.x, y: q.y, big: 1 });
                this.hurtPlayer(q, rnd(620, 800), m, this.now, 'Ola gigante'); slow(q, 2500);
              }
              if (el < DUR + 200) this.later(110, tick);
            };
            tick();
          });
        });
      }
      return 600 + (WAVES - 1) * SPACING + WARN + DUR + 400;
    }
    if (kind === 'oscuridad') {                                                                   // oscurece la cueva; corrientes abisales
      const DARK = 11000, STRIKES = 9;
      say('🌑 ¡Poseidón oscurece la cueva! Las corrientes abisales golpean a quien se quede quieto.'); cast(1400, 2000);
      this.fx.push({ k: 'ps_dark', T: DARK, x: Math.round((R[0] + R[2]) / 2), y: Math.round((R[1] + R[3]) / 2), r: R });
      for (let s = 0; s < STRIKES; s++) this.later(1800 + s * 1000, () => {
        if (!alive()) return;
        for (const q of inside()) {
          const tx = Math.round(q.x), ty = Math.round(q.y); this.fx.push({ k: 'ps_mk', x: tx, y: ty, r: 1.5, T: 850, dark: 1 });
          this.later(850, () => {
            if (!alive()) return;
            this.fx.push({ k: 'ps_geyser', x: tx, y: ty, r: 1.5, dark: 1 });
            for (const z of inside()) if (Math.hypot(z.x - tx, z.y - ty) <= 1.6) this.hurtPlayer(z, rnd(300, 420), m, this.now, 'Corriente abisal');
          });
        }
      });
      return 1800 + STRIKES * 1000 + 600;
    }
    if (kind === 'rafagas') {                                                                     // abanicos de chorros de agua
      const VOL = 3, JETS = 5, WARN = 800, LEN = 14;
      say('💦 ¡Poseidón lanza ráfagas de agua a presión!'); cast(1000, 1000 + VOL * 1400);
      for (let v = 0; v < VOL; v++) this.later(700 + v * 1400, () => {
        if (!alive()) return;
        const pl = inside(); const q = pl.length ? pl[rnd(0, pl.length - 1)] : null;
        const base = q ? Math.atan2(q.y - m.y, q.x - m.x) : Math.random() * Math.PI * 2, sx = m.x, sy = m.y, rays = [];
        for (let j = 0; j < JETS; j++) {
          const a = base + (j - (JETS - 1) / 2) * 0.34 + (v % 2 ? 0.17 : 0);
          rays.push({ ex: sx + Math.cos(a) * LEN, ey: sy + Math.sin(a) * LEN });
        }
        for (const r of rays) this.fx.push({ k: 'ps_jmk', sx, sy, ex: r.ex, ey: r.ey, T: WARN });
        this.later(WARN, () => {
          if (!alive()) return;
          for (const r of rays) this.fx.push({ k: 'ps_jet', sx, sy, ex: r.ex, ey: r.ey });
          for (const z of inside()) if (rays.some((r) => segDist(z.x, z.y, sx, sy, r.ex, r.ey) <= 1.0)) this.hurtPlayer(z, rnd(330, 450), m, this.now, 'Ráfaga de agua');
        });
      });
      return 700 + VOL * 1400 + WARN;
    }
    // bolas de agua: una para cada jugador de la cueva
    const ROUNDS = 2, WARN = 1400, FLY = 700;
    say('💧 ¡Poseidón lanza BOLAS DE AGUA contra todos los que estáis en la cueva!'); cast(1100, 1100 + ROUNDS * 2200);
    for (let r = 0; r < ROUNDS; r++) this.later(800 + r * 2200, () => {
      if (!alive()) return;
      const pl = inside(), pts = pl.map((q) => ({ x: Math.round(q.x), y: Math.round(q.y) }));
      for (const s of spots(2 + pl.length, 3, R)) pts.push(s);
      const sx = m.x, sy = m.y;
      for (const s of pts) {
        this.fx.push({ k: 'ps_mk', x: s.x, y: s.y, r: 1.9, T: WARN });
        this.later(WARN - FLY, () => { if (alive()) this.fx.push({ k: 'ps_orb', sx, sy, x: s.x, y: s.y, T: FLY }); });
      }
      this.later(WARN, () => {
        if (!alive()) return;
        for (const s of pts) this.fx.push({ k: 'ps_splash', x: s.x, y: s.y, r: 1.9 });
        for (const z of inside()) if (pts.some((s) => Math.hypot(z.x - s.x, z.y - s.y) <= 2.0)) this.hurtPlayer(z, rnd(380, 520), m, this.now, 'Bola de agua');
      });
    });
    return 800 + ROUNDS * 2200 + WARN;
  };

  /* ------------------------------------ la ballena ------------------------------------ */
  P.ballenaAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    const R = rect(m), pl = [...this.players.values()].filter((q) => inCave(q, R));
    if (now < (m.busyUntil || 0)) return;
    // recorre toda la cueva: va de un punto a otro (a veces junto a un jugador) y golpea a quien roza
    if (now >= m.nextMove) {
      if (!m.way || now >= (m.wayUntil || 0) || (Math.abs(m.x - m.way.x) <= 1 && Math.abs(m.y - m.way.y) <= 1)) {
        const near = pl.length && Math.random() < 0.45 ? pl[rnd(0, pl.length - 1)] : null;
        const s = near ? { x: Math.round(near.x), y: Math.round(near.y) } : spots(1, 0, R)[0];
        m.way = s || { x: m.sx, y: m.sy }; m.wayUntil = now + rnd(3500, 6500);
      }
      m.nextMove = now + m.def.move * (m.slowUntil > now ? 2.2 : 1);
      this.moveToward(m, m.way.x, m.way.y, (x, y) => x === m.way.x && y === m.way.y, (x, y) => this.monsterCanStep(m, x, y));
    }
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const kind = WORDER[(m.spN || 0) % WORDER.length]; m.spN = (m.spN || 0) + 1;
    const dur = this.ballenaCast(m, kind, R);
    m.nextSp = now + dur + 2200 + Math.random() * 2200;
  };

  P.ballenaCast = function (m, kind, R) {
    const { alive, inside, say, slow } = common(this, m);
    const root = (ms) => { m.busyUntil = this.now + ms; m.nextMove = Math.max(m.nextMove, this.now + ms); m.nextAtk = Math.max(m.nextAtk, this.now + ms); };
    const cast = (T) => this.fx.push({ k: 'ps_cast', x: m.x, y: m.y, id: m.id, T, kind: 'w_' + kind });
    if (kind === 'chorros') {                                                                     // la ballena gira lanzando chorros por todos lados
      const ROUNDS = 3, WARN = 800, JETS = 7, LEN = 11;
      say('🐋 ¡La ballena lanza ráfagas de agua en todas direcciones!'); cast(1000); root(ROUNDS * 1300 + 800);
      for (let r = 0; r < ROUNDS; r++) this.later(600 + r * 1300, () => {
        if (!alive()) return;
        const sx = m.x, sy = m.y, off = Math.random() * Math.PI * 2, rays = [];
        for (let j = 0; j < JETS; j++) { const a = off + j * (Math.PI * 2 / JETS); rays.push({ ex: sx + Math.cos(a) * LEN, ey: sy + Math.sin(a) * LEN }); }
        for (const q of rays) this.fx.push({ k: 'ps_jmk', sx, sy, ex: q.ex, ey: q.ey, T: WARN, w: 1 });
        this.later(WARN, () => {
          if (!alive()) return;
          for (const q of rays) this.fx.push({ k: 'ps_jet', sx, sy, ex: q.ex, ey: q.ey, w: 1 });
          for (const z of inside()) if (rays.some((q) => segDist(z.x, z.y, sx, sy, q.ex, q.ey) <= 0.95)) this.hurtPlayer(z, rnd(250, 350), m, this.now, 'Chorro de la ballena');
        });
      });
      return 600 + ROUNDS * 1300 + WARN;
    }
    if (kind === 'embestida') {                                                                   // embiste en línea recta hasta un jugador
      const pl = inside(); if (!pl.length) return 600;
      const q = pl[rnd(0, pl.length - 1)], tx = Math.round(q.x), ty = Math.round(q.y), sx = m.x, sy = m.y, WARN = 1000;
      say('🐋 ¡La ballena se lanza a embestir!'); cast(WARN); root(WARN + 2000);
      this.fx.push({ k: 'ps_jmk', sx, sy, ex: tx, ey: ty, T: WARN, w: 1, wide: 1 });
      this.later(WARN, () => {
        if (!alive()) return;
        const n = Math.max(1, Math.round(Math.max(Math.abs(tx - m.x), Math.abs(ty - m.y)))), ox = m.x, oy = m.y; let i = 0;
        this.fx.push({ k: 'ps_dash', id: m.id, x: tx, y: ty, T: n * 70 });
        const step = () => {
          if (!alive() || i >= n) return;
          i++; const nx = Math.round(ox + (tx - ox) * i / n), ny = Math.round(oy + (ty - oy) * i / n);
          if (floorOk(nx, ny) && !this.mgrid.has(ny * world.W + nx) && !this.pgrid.has(ny * world.W + nx)) this.relocate(m, nx, ny);
          for (const z of inside()) if (Math.hypot(z.x - m.x, z.y - m.y) <= 1.5 && (m.hitDash || 0) !== this.now) {
            const key = 'd' + z.id; if ((m[key] || 0) > this.now) continue; m[key] = this.now + 900;
            this.fx.push({ k: 'ps_hit', x: z.x, y: z.y, big: 1 }); this.hurtPlayer(z, rnd(380, 520), m, this.now, 'Embestida de la ballena'); slow(z, 2000);
          }
          this.later(70, step);
        };
        step();
      });
      return WARN + 1200;
    }
    // géiseres bajo los jugadores
    const pl0 = inside(), WARN = 1100, ROUNDS = 2;
    say('🐋 ¡La ballena hace brotar géiseres bajo vuestros pies!'); cast(1000); root(ROUNDS * 1800 + 600);
    for (let r = 0; r < ROUNDS; r++) this.later(500 + r * 1800, () => {
      if (!alive()) return;
      const pts = inside().map((q) => ({ x: Math.round(q.x), y: Math.round(q.y) }));
      for (const s of spots(3, 3, R)) pts.push(s);
      for (const s of pts) this.fx.push({ k: 'ps_mk', x: s.x, y: s.y, r: 1.6, T: WARN });
      this.later(WARN, () => {
        if (!alive()) return;
        for (const s of pts) this.fx.push({ k: 'ps_geyser', x: s.x, y: s.y, r: 1.6 });
        for (const z of inside()) if (pts.some((s) => Math.hypot(z.x - s.x, z.y - s.y) <= 1.7)) { this.hurtPlayer(z, rnd(280, 390), m, this.now, 'Géiser'); slow(z, 2000); }
      });
    });
    void pl0;
    return 500 + ROUNDS * 1800 + WARN;
  };

  /* --------------------------------------- enganches --------------------------------------- */
  const U0 = P.updateMonster;
  P.updateMonster = function (m, now) {
    if (m.type === 'ballena' && !m.dead) this.ballenaAI(m, now);
    const r = U0.call(this, m, now);
    if (m.type === 'poseidon' && !m.dead) this.poseidonAI(m, now);
    return r;
  };

  const HM = P.hurtMonster;
  P.hurtMonster = function (m, dmg, p, now) {
    if (m.type === 'poseidon' && p && m.bubbleUntil > now) dmg = Math.max(1, Math.round(dmg * BUB_TAKE));   // en la burbuja recibe la mitad, pero recibe
    return HM.call(this, m, dmg, p, now);
  };

  const H0 = P.hurtPlayer;
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    const r = H0.call(this, p, raw, src, now, srcName);
    if (src && src.def && src.def.special === 'poseidon' && !srcName && p.hp > 0) {                  // sus golpes salpican a los cercanos y los mojan
      this.fx.push({ k: 'ps_hit', x: p.x, y: p.y });
      p.slowUntil = Math.max(p.slowUntil || 0, this.now + 1200);
      for (const q of this.players.values()) if (q !== p && q.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) <= 2.6) {
        H0.call(this, q, Math.max(1, Math.round(raw * 0.35)), src, now, 'Salpicadura de Poseidón');
        this.fx.push({ k: 'ps_hit', x: q.x, y: q.y });
      }
    }
    return r;
  };

  const GEAR = new Set([...PIECES, ...RINGS, AMULET, BOW, STAFF, TRIDENT].map((q) => q[0]));
  const CH = new Map(); for (const q of PIECES) CH.set(q[0], q[7]); for (const q of RINGS) CH.set(q[0], q[6]); CH.set(AMULET[0], AMULET[6]); for (const q of [BOW, STAFF, TRIDENT]) CH.set(q[0], q[8]);
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (m.type === 'ballena') { this.fx.push({ k: 'ps_wdie', x: m.x, y: m.y, face: m.lf || 1 }); return K0.call(this, m, now); }
    if (m.type !== 'poseidon') return K0.call(this, m, now);
    const x = m.x, y = m.y, face = m.lf || 1, parts = []; m.bubbleUntil = 0;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) parts.push([pl, e.dmg]); }
    const real = m.def, instK = m.instSlot ? require('./instancias').LOOT_K : 1;
    m.def = Object.assign({}, real, { loot: real.loot.filter((l) => !GEAR.has(l[0])) });                 // oro, trofeo y pociones: reparto normal
    let r; try { r = K0.call(this, m, now); } finally { m.def = real; }
    m.spN = 0; m.bubN = 0; m.whaleAt = undefined; m.nextSp = 0; this.psKids(m);
    // equipo del Rey de los Mares: botín para todos los que participan; cuanto más daño haces, más suerte (hasta ×3 el que más daño hizo)
    const I = require('./items'), D = require('./data'), topDmg = Math.max(1, ...parts.map((q) => q[1])), ranked = parts.slice().sort((a, b) => b[1] - a[1]);
    this.broadcastChat('🔱 ¡Poseidón ha caído! Las aguas se calman.' + (ranked.length ? ` Mayor daño: ${ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ')}.` : ''), 'k');
    for (const [pl, dmg] of ranked) {
      const k = 1 + 2 * (dmg / topDmg);
      for (const id of GEAR) {
        if (Math.random() >= Math.min(0.6, CH.get(id) * 0.5 * D.CFG.BOSS_DROP_K * k * instK * (this.lootMult ? this.lootMult(pl, id) : 1))) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, 'poseidon', id);
        this.msgC(pl, `🔱✨ ¡Botín de Poseidón: ${D.ITEMS[id].name}!`, '#7fe0ff'); this.broadcastChat(`🔱 ¡${pl.name} ha conseguido ${D.ITEMS[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    }
    this.fx.push({ k: 'ps_die', x, y, face });
    return r;
  };
}
module.exports = { build, install, PIECES, RINGS, AMULET, BOW, STAFF, TRIDENT };
