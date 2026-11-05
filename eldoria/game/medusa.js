'use strict';
/**
 * Medusa, Reina de las Serpientes — jefe de la Cueva de Medusa (zona «El Inframundo»).
 * Es más rápida que los demás jefes. Habilidades (además de golpear con el hacha):
 *   1) Mirada de piedra: las serpientes de su pelo lanzan una luz. Los jugadores deben correr a una ZONA SEGURA (círculo de runas)
 *      antes de que estalle; quien quede fuera se convierte en piedra 12 s (no puede moverse ni atacar) y Medusa le golpea mucho más fuerte.
 *   2) Piel de piedra (modo combate): 6 s de inmunidad total.
 *   3) Aparición: desaparece y reaparece junto a un jugador; lo convierte en piedra 5 s y le golpea.
 *   4) Atracción: un hechizo que ralentiza a todos y los arrastra hacia ella.
 *   5) División: se divide en 3; las dos imágenes caducan o estallan al morir.
 *   6) Bola tóxica: la lanza al aire; al explotar salpica a TODOS los jugadores.
 * Botín raro: equipo de la Gorgona (yelmo, coraza, manto de víboras, guantes, grebas, botas, égida, carcaj, orbe, 3 anillos, collar),
 *   el Hacha Colmillo, el Arco Víbora Espectral y el Báculo de las Cuatro Cabezas. Más el Ojo de Medusa (trofeo) y materiales de elixir.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const STONE_GAZE_MS = 12000, STONE_JUMP_MS = 5000;       // piedra por la mirada / al aparecer junto a ti
const STONE_HIT_K = 1.8;                  // los golpes de Medusa a un jugador de piedra
const BLOCKED_MSGS = new Set(['move', 'walkpath', 'target', 'skill', 'style', 'spell', 'equip', 'unequip', 'drop', 'pickup', 'pick', 'npc', 'trade_req']);

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['md_yelmo',    'Yelmo de la Gorgona',            'md_helm',   'head',   106, 80,  { hp: 490, atk: 11, crit: 0.03 }, 0.05],
  ['md_peto',     'Coraza de Escamas de Medusa',    'md_chest',  'body',   108, 104, { hp: 700, atk: 19 }, 0.04],
  ['md_manto',    'Manto de Víboras Enroscadas',    'md_chest2', 'body',   107, 92,  { hp: 640, atk: 17, mana: 160 }, 0.04],
  ['md_guantes',  'Garras Petrificantes',           'md_glove',  'gloves', 107, 41,  { hp: 235, atk: 17, crit: 0.02 }, 0.05],
  ['md_pantalon', 'Grebas de Escamas Pétreas',      'md_leg',    'legs',   107, 57,  { hp: 380, atk: 14 }, 0.05],
  ['md_botas',    'Botas de la Reptante',           'md_boot',   'boots',  106, 46,  { hp: 275, atk: 11 }, 0.05],
  ['md_escudo',   'Égida de la Hidra de Piedra',    'md_shield', 'shield', 108, 116, { hp: 760, atk: 10, crit: 0.02 }, 0.03],
  ['md_carcaj',   'Carcaj de las Víboras',          'md_quiver', 'shield', 106, 34,  { hp: 200, atk: 12, crit: 0.03 }, 0.04],
  ['md_orbe',     'Orbe de las Cuatro Serpientes',  'md_orb',    'shield', 107, 30,  { hp: 220, atk: 14, mana: 260 }, 0.04],
];
const RINGS = [
  ['md_anillo',  'Anillo de la Serpiente Dorada', 'md_ring',  'ring', 106, { atk: 21, hp: 290, mana: 115, crit: 0.03 }, 0.05],
  ['md_anillo2', 'Ojo de la Gorgona',             'md_ring2', 'ring', 107, { atk: 18, hp: 330, mana: 160, crit: 0.03 }, 0.05],
  ['md_anillo3', 'Sombra del Basilisco',          'md_ring3', 'ring', 107, { atk: 23, hp: 260, mana: 100, crit: 0.04 }, 0.05],
];
const AMULET = ['md_amuleto', 'Collar de la Reina Serpiente', 'md_amulet', 'amulet', 108, { hp: 680, mana: 200, atk: 18, crit: 0.04 }, 0.04];
const AXE = ['md_hacha', 'Hacha Colmillo de Medusa', 'md_axe', 'melee', 108, 280, 1150, 'poison', 0.012];
const BOW = ['md_arco', 'Arco Víbora Espectral', 'md_bow', 'ranged', 108, 270, 1100, 'poison', 0.012];
const STAFF = ['md_baculo', 'Báculo de las Cuatro Cabezas', 'md_staff', 'magic', 108, 275, 1100, 'poison', 0.012];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', ring: '💍', amulet: '📿', shield: '🛡️' };
const ALL = [...PIECES, ...RINGS, AMULET];
const WEAPONS = [AXE, BOW, STAFF];

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: id === 'md_orbe' ? '🔮' : id === 'md_carcaj' ? '🏹' : ICON[type], spr, type, def, bonus, medusa: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, type, L, bonus] of [...RINGS, AMULET]) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, medusa: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, style, L, atk, cd, el] of WEAPONS) ITEMS[id] = { name, icon: style === 'melee' ? '🪓' : style === 'ranged' ? '🏹' : '🐍', spr, type: 'weapon', style, atk, cd, range: style === 'melee' ? 1 : style === 'ranged' ? 8 : 7, el, medusa: 1, minLevel: L, sell: sell(L, 8) };
  ITEMS.trofeo_medusa = { name: 'Ojo de Medusa', icon: '👁️', type: 'misc', stack: true, sell: 50000 };
  MONSTERS.medusa = {
    name: 'Medusa, Reina de las Serpientes', icon: '🐍', lv: 880, hp: 600000, dmg: [400, 620], dmgK: 3.1, exp: 150000, move: 290, atkCd: 1100, aggro: 20, respawn: 60000, armor: 0.5, shared: true, boss: true, special: 'medusa',
    gold: [52000, 76000], loot: [['trofeo_medusa', 1, 1, 2], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10], ['pluma_fenix', 0.5, 1, 2]],
  };
  // imágenes de Medusa (habilidad «dividirse en 3»): no sueltan nada
  MONSTERS.medusa_clon = { name: 'Imagen de Medusa', icon: '🐍', lv: 700, hp: 60000, dmg: [260, 400], dmgK: 3.1, exp: 0, move: 290, atkCd: 1100, aggro: 24, respawn: 999999999, armor: 0.3, gold: [0, 0], loot: [], spr: 'medusa', special: 'medusa_clon' };
  const boss = MONSTERS.medusa;
  for (const p of ALL) boss.loot.push([p[0], p[p.length - 1], 1, 1]);
  for (const w of WEAPONS) boss.loot.push([w[0], w[8], 1, 1]);
}

function install(Game) {
  const P = Game.prototype;
  const rect = (m) => world.zoneAt(m.x, m.y).rect;
  const inCave = (q, R) => q.hp > 0 && q.x >= R[0] && q.x <= R[2] && q.y >= R[1] && q.y <= R[3];
  const floorOk = (x, y) => world.isWalkable(x, y) && world.tiles[y * world.W + x] === world.T.MDF;
  const ORDER = ['mirada', 'bola', 'atraer', 'salto', 'piel', 'dividir', 'mirada', 'salto', 'bola', 'atraer', 'dividir', 'mirada'];
  const K_MIN = 1, K_MAX = 2, K_PER_LV = 0.02, LV_BASE = 100;           // vida de Medusa según el nivel del jugador más alto que entra

  P.medusaAI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    this.medusaKids(m);
    if (!m.scaled && m.hp === m.maxHp) {                                                           // su vida crece con el nivel de quien entra a la cueva
      const R = rect(m), lv = Math.max(0, ...[...this.players.values()].filter((q) => inCave(q, R)).map((q) => q.level || 1));
      if (lv > 0) {
        const k = Math.max(K_MIN, Math.min(K_MAX, 1 + (lv - LV_BASE) * K_PER_LV));
        m.baseMax = m.maxHp; m.maxHp = m.hp = Math.round(m.maxHp * k); m.scaled = true; m.scaleK = k;
        for (const q of this.players.values()) if (inCave(q, R)) this.msg(q, `🐍 La vida de Medusa se ajusta a tu nivel (${lv}): ×${k.toFixed(2)} → ${m.maxHp.toLocaleString('es')}.`, 'x');
      }
    }
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const kind = ORDER[(m.spN || 0) % ORDER.length]; m.spN = (m.spN || 0) + 1;
    const dur = this.medusaCast(m, kind);
    const rage = m.hp <= m.maxHp * 0.3;
    m.nextSp = now + dur + (rage ? 1200 : 2400) + Math.random() * 1500;
    m.nextMove = Math.max(m.nextMove, now + 900); m.nextAtk = Math.max(m.nextAtk, now + 900);
  };

  const spots = (n, minD, R, avoid, avoidD) => {
    const out = [];
    for (let k = 0; k < n * 100 && out.length < n; k++) {
      const x = rnd(R[0] + 2, R[2] - 2), y = rnd(R[1] + 2, R[3] - 2);
      if (!floorOk(x, y)) continue;
      if (out.some((s) => Math.hypot(s.x - x, s.y - y) < minD) || (avoid && avoid.some((a) => Math.hypot(a.x - x, a.y - y) < (avoidD || 3)))) continue;
      out.push({ x, y });
    }
    return out;
  };

  /** convierte a un jugador en piedra durante ms (no se mueve ni ataca) */
  P.petrify = function (q, ms, by) {
    if (!q || q.hp <= 0) return;
    q.stoneUntil = Math.max(q.stoneUntil || 0, this.now + ms); q.target = null; q.pend = null;
    this.fx.push({ k: 'md_stone', i: q.id, x: q.x, y: q.y, ms });
    this.msgC(q, `🗿 ¡Te has convertido en piedra! (${Math.round(ms / 1000)} s) ${ms >= 5000 ? 'Medusa golpea mucho más fuerte a las estatuas.' : ''}`, '#9fe0a0');
    if (by) by.stoneTargets = true;
  };

  P.medusaCast = function (m, kind) {
    const R = rect(m), alive = () => !m.dead && this.monsters.includes(m);
    const inside = () => [...this.players.values()].filter((q) => inCave(q, R));
    const say = (txt) => { for (const q of inside()) this.msg(q, txt, 'x'); };
    const cast = (T, root) => { this.fx.push({ k: 'md_cast', x: m.x, y: m.y, id: m.id, T, kind }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };
    const hit = (q, lo, hi, name) => this.hurtPlayer(q, rnd(lo, hi), m, this.now, name);
    const slow = (q, ms) => { q.slowUntil = Math.max(q.slowUntil || 0, this.now + ms); };

    if (kind === 'mirada') {                                                                      // mirada de piedra: refugiarse en las zonas seguras
      const pl0 = inside(), nz = Math.max(2, Math.min(4, Math.ceil(pl0.length / 2) + 1)), ZR = 2.3, WARN = 3600;
      const zones = spots(nz, 7, R, [{ x: m.x, y: m.y }], 4);
      if (!zones.length) return 600;
      say('🐍👁️ ¡Las serpientes de Medusa brillan! ¡Corre a una ZONA SEGURA (círculo de runas) o te convertirás en piedra 12 s!'); cast(1200, WARN + 900);
      this.fx.push({ k: 'md_gaze', x: m.x, y: m.y, id: m.id, T: WARN, zones: zones.map((z) => ({ x: z.x, y: z.y, r: ZR })) });
      this.later(WARN, () => {
        if (!alive()) return;
        this.fx.push({ k: 'md_flash', x: m.x, y: m.y, id: m.id });
        const stoned = [];
        for (const q of inside()) {
          if (zones.some((z) => Math.hypot(q.x - z.x, q.y - z.y) <= ZR + 0.2)) { this.fx.push({ k: 'md_safe', x: q.x, y: q.y }); continue; }
          this.petrify(q, STONE_GAZE_MS, m); stoned.push(q);
        }
        if (stoned.length) { m.target = stoned[0].id; m.nextAtk = Math.min(m.nextAtk, this.now + 500); }
      });
      return WARN + 900;
    }
    if (kind === 'piel') {                                                                        // piel de piedra: inmune 6 s
      const DUR = 6000;
      say('🗿 ¡Medusa endurece su piel: es INMUNE durante 6 segundos! Esquiva y espera a que se rompa.'); cast(900, DUR + 500);
      m.stoneUntil = this.now + DUR; this.fx.push({ k: 'md_skin', x: m.x, y: m.y, id: m.id, T: DUR });
      this.later(DUR, () => { if (!alive()) return; m.stoneUntil = 0; this.fx.push({ k: 'md_unskin', x: m.x, y: m.y, id: m.id }); });
      return DUR + 500;
    }
    if (kind === 'atraer') {                                                                      // atracción: ralentiza y arrastra hacia ella
      say('🌀 ¡Medusa lanza un hechizo que os ralentiza y os atrae hacia ella!'); cast(1000, 4200);
      const STEPS = 8, GAP = 300;
      this.later(900, () => { if (alive()) this.fx.push({ k: 'md_pull', x: m.x, y: m.y, id: m.id, T: STEPS * GAP + 600, r: 9 }); });
      for (let s = 0; s < STEPS; s++) this.later(1100 + s * GAP, () => {
        if (!alive()) return;
        for (const q of inside()) {
          if ((q.stoneUntil || 0) > this.now) continue;
          slow(q, 3500);
          const dx = Math.sign(m.x - q.x), dy = Math.sign(m.y - q.y);
          if (Math.max(Math.abs(m.x - q.x), Math.abs(m.y - q.y)) <= 1) continue;
          if (!this.tryStep(q, dx, dy, this.now) && dx && dy) { if (!this.tryStep(q, dx, 0, this.now)) this.tryStep(q, 0, dy, this.now); }
          q.nextMove = this.now + 520;
          this.fx.push({ k: 'md_tug', i: q.id, x: q.x, y: q.y });
        }
      });
      return 1100 + STEPS * GAP + 400;
    }
    if (kind === 'bola') {                                                                        // bola tóxica al aire: explota y salpica a todos
      const FLY = 1500;
      say('☄️ ¡Medusa lanza una bola tóxica al aire! ¡Va a explotar y salpicará a TODOS!'); cast(900, FLY + 3200);
      this.fx.push({ k: 'md_orb', x: m.x, y: m.y, id: m.id, T: FLY });
      this.later(FLY, () => {
        if (!alive()) return;
        this.fx.push({ k: 'md_boom', x: m.x, y: m.y });
        const pl = inside(), pts = pl.map((q) => ({ x: Math.round(q.x), y: Math.round(q.y) }));
        for (const s of spots(4 + pl.length, 3, R)) pts.push(s);
        const WARN = 1000;
        for (const s of pts) {
          this.fx.push({ k: 'md_mk', x: s.x, y: s.y, r: 1.7, T: WARN, sx: m.x, sy: m.y });
          this.later(WARN, () => {
            if (!alive()) return;
            this.fx.push({ k: 'md_splash', x: s.x, y: s.y, r: 1.7 });
            for (const z of inside()) if (Math.hypot(z.x - s.x, z.y - s.y) <= 1.8) hit(z, 380, 540, 'Salpicadura tóxica');
          });
        }
      });
      return FLY + 1000 + 600;
    }
    if (kind === 'dividir') {                                                                     // se divide en 3: dos imágenes que atacan
      const spotsK = [];
      for (let k = 0; k < 80 && spotsK.length < 2; k++) {
        const x = Math.round(m.x) + rnd(-4, 4), y = Math.round(m.y) + rnd(-4, 4);
        if (Math.hypot(x - m.x, y - m.y) < 2 || !floorOk(x, y) || this.mgrid.has(y * world.W + x) || this.pgrid.has(y * world.W + x) || spotsK.some((s2) => s2.x === x && s2.y === y)) continue;
        spotsK.push({ x, y });
      }
      if (!spotsK.length) return 600;
      say('🐍🐍🐍 ¡Medusa se divide en TRES! Las imágenes caducan en 30 s y estallan al morir.'); cast(1200, 1800);
      this.fx.push({ k: 'md_split', x: m.x, y: m.y, id: m.id, T: 1100 });
      for (const z of spotsK) this.fx.push({ k: 'md_mk', x: z.x, y: z.y, r: 1.2, T: 1100, sx: m.x, sy: m.y });
      this.later(1100, () => {
        if (!alive()) return;
        for (const z of spotsK) {
          if (this.mgrid.has(z.y * world.W + z.x) || this.pgrid.has(z.y * world.W + z.x)) continue;
          const c = this.spawnMonster('medusa_clon', z.x, z.y);
          c.maxHp = c.hp = Math.max(20000, Math.round(m.maxHp * 0.08)); c.noRespawn = true; c.respawnAt = Infinity; c.parent = m; c.diesAt = this.now + 30000; c.target = m.target; c.instSlot = m.instSlot; c.instMul = m.instMul;
          this.fx.push({ k: 'md_appear', x: z.x, y: z.y, id: c.id, r: 1.6 });
        }
      });
      return 1100 + 1800;
    }
    // salto: desaparece y reaparece junto a un jugador; lo convierte en piedra 5 s y le golpea
    const pl = inside(); if (!pl.length) return 600;
    const q = pl[rnd(0, pl.length - 1)], cand = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = Math.round(q.x) + dx, y = Math.round(q.y) + dy; if ((dx || dy) && Math.hypot(dx, dy) <= 2.3 && floorOk(x, y) && !this.mgrid.has(y * world.W + x) && !this.pgrid.has(y * world.W + x)) cand.push({ x, y }); }
    if (!cand.length) return 600;
    const d = cand[rnd(0, cand.length - 1)], WARN = 1300;
    say(`🐍 ¡Medusa desaparece… y va a reaparecer junto a ${q.name}!`); cast(500, WARN + 700);
    this.fx.push({ k: 'md_vanish', x: m.x, y: m.y, id: m.id }); this.fx.push({ k: 'md_mk', x: d.x, y: d.y, r: 2.4, T: WARN, stone: 1 });
    m.hideUntil = this.now + WARN; m.target = q.id;
    this.later(WARN, () => {
      if (!alive()) return;
      if (!this.mgrid.has(d.y * world.W + d.x)) this.relocate(m, d.x, d.y);
      m.hideUntil = 0; this.fx.push({ k: 'md_appear', x: m.x, y: m.y, id: m.id, r: 2.4 });
      for (const z of inside()) if (Math.hypot(z.x - m.x, z.y - m.y) <= 2.5) { hit(z, 380, 520, 'Mirada de Medusa'); this.petrify(z, STONE_JUMP_MS, m); }
    });
    return WARN + 600;
  };

  /** retira las imágenes de Medusa muertas, caducadas o de una Medusa que ya cayó */
  P.medusaKids = function (m) {
    const kids = this.monsters.filter((z) => z.parent === m); if (!kids.length) return;
    const now = this.now, up = !m.dead && this.monsters.includes(m);
    for (const q of kids) if (q.dead || !up || now >= (q.diesAt || Infinity)) {
      if (!q.dead) this.fx.push({ k: 'md_vanish', x: q.x, y: q.y, id: q.id });
      this.mgrid.delete(q.y * world.W + q.x); this.monsters = this.monsters.filter((z) => z !== q); this.ents.delete(q.id);
    }
  };

  // inmunidad con la piel de piedra
  const HM = P.hurtMonster;
  P.hurtMonster = function (m, dmg, p, now) {
    if (m.type !== 'medusa' || !p) return HM.call(this, m, dmg, p, now);
    if (m.stoneUntil > now) {
      if (!(m.immMsg > now)) { m.immMsg = now + 700; this.fx.push({ k: 'd', x: m.x, y: m.y, v: '🗿 ¡Inmune!', c: 'x' }); this.fx.push({ k: 'md_ping', x: m.x, y: m.y }); }
      return;
    }
    return HM.call(this, m, dmg, p, now);
  };

  // los golpes de Medusa contra jugadores de piedra son devastadores
  const H0 = P.hurtPlayer;
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    if (src && src.def && src.def.special === 'medusa' && (!srcName || srcName === src.def.name) && (p.stoneUntil || 0) > (now || this.now)) {
      this.fx.push({ k: 'd', x: p.x, y: p.y - 0.4, v: '🗿 ¡Golpe devastador!', c: 'x' });
      raw = Math.round(raw * STONE_HIT_K);
    }
    return H0.call(this, p, raw, src, now, srcName);
  };

  // un jugador de piedra no puede moverse, atacar ni lanzar especiales
  const H1 = P.handle;
  P.handle = function (p, msg) {
    if (msg && (p.stoneUntil || 0) > this.now && BLOCKED_MSGS.has(msg.t)) return;
    return H1.call(this, p, msg);
  };
  const DA = P.doAttack;
  P.doAttack = function (p, t, now) { if ((p.stoneUntil || 0) > now) { p.target = null; return; } return DA.call(this, p, t, now); };

  const GEAR = new Set([...ALL, ...WEAPONS].map((q) => q[0]));
  const CH = new Map(); for (const q of ALL) CH.set(q[0], q[q.length - 1]); for (const w of WEAPONS) CH.set(w[0], w[8]);
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (m.type === 'medusa_clon') {                                                               // la imagen estalla al morir
      const x = m.x, y = m.y, R = rect(m); this.fx.push({ k: 'md_splash', x, y, r: 2 });
      for (const q of this.players.values()) if (inCave(q, R) && Math.hypot(q.x - x, q.y - y) <= 2.2) this.hurtPlayer(q, rnd(250, 360), m, now, 'Imagen de Medusa');
      return K0.call(this, m, now);
    }
    if (m.type !== 'medusa') return K0.call(this, m, now);
    const x = m.x, y = m.y, face = m.lf || 1, parts = []; m.stoneUntil = 0;
    for (const q of this.players.values()) q.stoneUntil = 0;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) parts.push([pl, e.dmg]); }
    const real = m.def, instK = m.instSlot ? require('./instancias').LOOT_K : 1;
    m.def = Object.assign({}, real, { loot: real.loot.filter((l) => !GEAR.has(l[0])) });
    let r; try { r = K0.call(this, m, now); } finally { m.def = real; }
    if (m.baseMax) { m.maxHp = m.baseMax; m.baseMax = 0; } m.scaled = false; this.medusaKids(m);       // al renacer vuelve a ajustarse a quien entre
    // equipo de la Gorgona: botín para todos los que participan; cuanto más daño haces, más suerte (hasta ×3 el que más daño hizo)
    const I = require('./items'), D = require('./data'), topDmg = Math.max(1, ...parts.map((q) => q[1])), ranked = parts.slice().sort((a, b) => b[1] - a[1]);
    this.broadcastChat('🐍 ¡Medusa ha caído! Las serpientes de su cabello se apagan.' + (ranked.length ? ` Mayor daño: ${ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ')}.` : ''), 'k');
    for (const [pl, dmg] of ranked) {
      if (dmg < 1) continue;
      const k = 1 + 2 * (dmg / topDmg);
      for (const id of GEAR) {
        if (Math.random() >= Math.min(0.6, CH.get(id) * 0.5 * D.CFG.BOSS_DROP_K * k * instK * (this.lootMult ? this.lootMult(pl, id) : 1))) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, 'medusa', id);
        this.msgC(pl, `🐍✨ ¡Botín de Medusa: ${D.ITEMS[id].name}!`, '#7dff9a'); this.broadcastChat(`🐍 ¡${pl.name} ha conseguido ${D.ITEMS[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    }
    this.fx.push({ k: 'md_die', x, y, face });
    return r;
  };
}
module.exports = { build, install, STONE_HIT_K, PIECES, RINGS, AMULET, WEAPONS };
