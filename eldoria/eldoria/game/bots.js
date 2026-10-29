'use strict';
/**
 * Aventureros simulados (bots): personajes controlados por el servidor que juegan como una persona normal.
 *  - Son jugadores de verdad para el motor (mismas reglas de combate, vida, experiencia, muerte y botín).
 *  - Tienen nombre propio como cualquier jugador (el /ayuda del juego avisa de que el mundo incluye aventureros del servidor).
 *  - Cuatro niveles de experiencia, cada uno con su zona:
 *      novato     → Prado (monstruos pequeños)
 *      aventurero → Catacumbas Silenciosas
 *      veterano   → Minas Enanas
 *      élite      → Colinas Doradas, y hacen la Raid del Santuario en grupo
 *  - Comparten mundo con los jugadores reales: cazan en las mismas zonas, recogen el botín, viajan a la ciudad para vender
 *    en la tienda, comprar pociones y mejoras, guardar lo valioso en el banco, y charlan de vez en cuando.
 *  - Aventureros y veteranos se juntan para los jefes de mazmorra sin ataques especiales (Rey Esqueleto y Maestro Forjador).
 *    Las élites hacen la Raid (esquivando los avisos de los jefes) y aceptan jugadores reales en su grupo, o se suman a
 *    la incursión que inicie un jugador real.
 *  - No se guardan (al reiniciar el servidor vuelven a empezar), no salen en rankings, no comercian de jugador a jugador
 *    ni atacan primero a nadie.
 *  Desactivar: BOTS=0 (variable de entorno). Cantidad: BOTS=16 (por defecto, máximo 16).
 */
const { ITEMS } = require('./data');
const I = require('./items');
const world = require('./world');
const { skillXpFor, skillFromXp } = require('./skills');
const { W, H, T, zoneAt, SPAWN_POINT, RAID } = world;

const kxy = (x, y) => y * W + x;
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const xpForLevel = (l) => 50 * (l - 1) * (l - 1);
const DIRS8 = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

const NAMES = ['Kael', 'MiraSol', 'Thorn92', 'Lyra', 'DoranX', 'Selene_', 'BramVK', 'Ysolde', 'Garrick7', 'NiaLuz', 'Orlan', 'TessK', 'Varek', 'Elin_', 'RodrikZ', 'SoraV'];
const COLORS = ['#e0584a', '#4aa3ff', '#6fcf6f', '#e0b84a', '#b06ae0', '#4ad0c0', '#e08a4a', '#d96aa8'];
const ROLE_ORDER = ['novato', 'aventurero', 'elite', 'novato', 'veterano', 'elite', 'novato', 'aventurero', 'elite', 'veterano', 'novato', 'aventurero', 'elite', 'elite', 'elite', 'novato'];

const SEARCH = 36;              // radio de búsqueda de monstruos
const STYLE_OF = ['melee', 'ranged', 'magic'];

const TIERS = {
  novato: { zone: 'prado', lv: [2, 9], capLv: 14, capSk: 12, gold: 120 },
  aventurero: {
    zone: 'catacumbas', zones: ['catacumbas', 'bosque'], lv: [22, 26], capLv: 30, capSk: 24, skill: 18, gold: 1500,
    gear: { melee: ['hacha_acero', 'casco_acero', 'armadura_placas', 'escudo_torre'], ranged: ['ballesta', 'casco_acero', 'armadura_placas'], magic: ['baston_hielo', 'casco_acero', 'armadura_placas'] },
  },
  veterano: {
    zone: 'minas', zones: ['minas', 'selva', 'pantano'], lv: [42, 48], capLv: 60, capSk: 70, skill: 55, gold: 6000,
    gear: { melee: ['martillo_titan', 'casco_dragon', 'armadura_abismo', 'escudo_titan'], ranged: ['arco_celestial', 'casco_dragon', 'armadura_abismo'], magic: ['baston_abismo', 'casco_dragon', 'armadura_abismo'] },
  },
  elite: { zone: 'colinas', zones: ['colinas', 'volcan', 'abismo'], lv: [100, 100], capLv: 110, capSk: 160, skill: 150, power: 3, tough: 0.62, gold: 20000 },
};
// jefes de mazmorra sin ataques especiales
const BOSSES = [{ type: 'rey_esqueleto', zone: 'catacumbas', min: 3 }, { type: 'maestro_forjador', zone: 'minas', min: 3 }];
const RAID_SLOTS = { helm: 'head', chest: 'body', glove: 'gloves', leg: 'legs', boot: 'boots', belt: 'belt', ring: 'ring1', amulet: 'amulet', cape: 'cape', weapon: 'weapon' };
// monstruos que cazan en cada zona (sin dragones ni jefes); las zonas con PvP también los llevan
const ZONE_TYPES = {
  catacumbas: ['murcielago', 'esqueleto', 'esqueleto_arquero', 'necrofago'],
  minas: ['kobold', 'enano_renegado', 'golem_hierro', 'arana_cueva'],
  colinas: ['jabali', 'goblin', 'arquero_goblin', 'bandido'],
  bosque: ['lobo', 'oso', 'orco', 'chaman_orco'],
  selva: ['oso', 'troll', 'bruja', 'lagarto', 'cobra'],
  pantano: ['sapo', 'lagarto', 'bruja'],
  volcan: ['golem_lava', 'demonio_menor'],
  abismo: ['troll', 'demonio_menor', 'golem_lava'],
};
const ALLOWED = new Set(['prado', 'ciudad', ...Object.keys(ZONE_TYPES)]);
const isRaidZone = (id) => id.startsWith('raid_');

function noviceTypes(level) {
  if (level < 3) return ['conejo', 'rata'];
  if (level < 6) return ['conejo', 'rata', 'serpiente'];
  return ['rata', 'serpiente', 'arana'];
}

/* ---------- campos de distancia (viajes largos, incluidos los portales) ---------- */
const revPortal = new Map();
for (const pt of world.PORTALS) {
  const k = kxy(pt.tx, pt.ty);
  if (!revPortal.has(k)) revPortal.set(k, []);
  revPortal.get(k).push(kxy(pt.x, pt.y));
}
const isPortalTile = (x, y) => world.tiles[kxy(x, y)] === T.PORTAL;
const fieldCache = new Map();
/** Distancia en pasos hasta (tx,ty) desde cualquier casilla. Cruzar un portal cuenta como un paso. */
function fieldTo(tx, ty) {
  const key = kxy(tx, ty);
  if (fieldCache.has(key)) return fieldCache.get(key);
  const f = new Int16Array(W * H).fill(-1), q = new Int32Array(W * H);
  let head = 0, tail = 0;
  f[key] = 0; q[tail++] = key;
  while (head < tail) {
    const k = q[head++], x = k % W, y = (k / W) | 0, d = f[k];
    const rp = revPortal.get(k);
    if (rp) for (const pk of rp) if (f[pk] < 0) { f[pk] = d + 1; q[tail++] = pk; }
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nk = kxy(nx, ny);
      if (f[nk] >= 0 || isPortalTile(nx, ny) || !world.isWalkable(nx, ny)) continue;
      f[nk] = d + 1; q[tail++] = nk;
    }
  }
  fieldCache.set(key, f);
  return f;
}

/** Primera casilla alcanzable de una zona cerca de un punto (para puntos de encuentro). */
function tileNear(zoneId, cx, cy) {
  for (let r = 0; r < 30; r++) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || x < 0 || y < 0 || x >= W || y >= H) continue;
        if (zoneAt(x, y).id === zoneId && world.reach[kxy(x, y)] && !isPortalTile(x, y)) return [x, y];
      }
    }
  }
  return null;
}
const HUBS = {
  catacumbas: () => [world.catRooms[0].cx + 1, world.catRooms[0].cy],
  minas: () => [world.minRooms[0].cx + 1, world.minRooms[0].cy],
  colinas: () => tileNear('colinas', 90, 106),
  ciudad: () => [SPAWN_POINT.x, SPAWN_POINT.y],
  prado: () => tileNear('prado', 90, 80),
  raid: () => [RAID.rooms[0].start[0] + 3, RAID.rooms[0].cy],
  bosque: () => tileNear('bosque', 50, 20),
  selva: () => tileNear('selva', 211, 36),
  pantano: () => tileNear('pantano', 30, 115),
  volcan: () => tileNear('volcan', 285, 70),
  abismo: () => [world.abyRooms[0].cx + 1, world.abyRooms[0].cy],
  shop: () => tileNear('ciudad', 85, 64),
  bank: () => tileNear('ciudad', 95, 70),
};

function install(Game) {
  const P = Game.prototype;

  /* ===================================================== creación ===================================================== */
  P.initBots = function (n) {
    this.bots = [];
    this.botCfg = Object.assign({ firstBossMs: 90000, bossCdMs: 20 * 60000, firstRaidMs: 4 * 60000, raidCdMs: 30 * 60000 }, this.botCfg || {});
    this.botHaz = []; this._bfxN = 0;
    this.botBoss = {}; for (const b of BOSSES) this.botBoss[b.type] = { next: this.now + this.botCfg.firstBossMs + rnd(0, 60000) };
    this.botGroup = null;
    this.botRaid = { next: this.now + this.botCfg.firstRaidMs, phase: 'idle', t0: 0, ids: [] };
    n = Math.max(0, Math.min(NAMES.length, n | 0));
    let ei = 0;
    for (let i = 0; i < n; i++) {
      const base = NAMES[i], role = ROLE_ORDER[i], tier = TIERS[role];
      const p = this.createPlayer({ key: 'bot:' + base.toLowerCase(), name: base, color: COLORS[i % COLORS.length] });
      p.bot = true;
      const eidx = role === 'elite' ? ei++ : -1;
      const style = role === 'elite' ? STYLE_OF[[0, 1, 2, 0, 1, 2][eidx % 6]] : STYLE_OF[i % 3];
      this.botGear(p, role, style, eidx);
      const lvl = rnd(tier.lv[0], tier.lv[1]);
      p.xp = xpForLevel(lvl) + rnd(0, 40);
      p.sxp = { melee: 0, ranged: 0, magic: 0 };
      if (tier.skill) p.sxp[style] = skillXpFor(tier.skill);
      p.ai = { role, tier, style, zone: tier.zone, zoneUntil: this.now + rnd(6, 14) * 60000, mode: 'hunt', until: 0, px: -1, py: -1, stuckAt: 0, skip: new Map(), lootSkip: new Map(), nextTrip: this.now + rnd(5, 12) * 60000, nextChat: this.now + rnd(30000, 120000), nextHeal: 0, capLv: tier.capLv, capSk: tier.capSk, power: tier.power || 1, tough: tier.tough || 1 };
      this.recalc(p);
      p.hp = p.maxHp; p.mana = p.maxMana; p.gold = tier.gold;
      const spot = this.botSpot(p);
      if (spot) { p.x = spot[0]; p.y = spot[1]; }
      this.bots.push(p);
    }
    return this.bots.length;
  };

  P.botGear = function (p, role, style, ei) {
    for (const s of Object.keys(p.eq)) p.eq[s] = null;
    if (role === 'novato') {
      p.eq.weapon = I.mk(['espada_madera', 'arco_corto', 'vara_novato'][STYLE_OF.indexOf(style)]);
      p.eq.body = I.mk('tunica_tela');
      if (Math.random() < 0.6) p.eq.head = I.mk('casco_cuero');
      if (style === 'melee' && Math.random() < 0.5) p.eq.shield = I.mk('escudo_madera');
    } else if (role === 'elite') {
      const sid = style === 'melee' ? (ei % 2 ? 'rm' : 'rk') : style === 'ranged' ? 'rv' : 'rx';
      for (const [slot, eqs] of Object.entries(RAID_SLOTS)) {
        const id = `rd_${sid}_${slot}`;
        if (ITEMS[id]) p.eq[eqs] = I.mk(id);
      }
    } else {
      const g = TIERS[role].gear[style];
      p.eq.weapon = I.mk(g[0]); p.eq.head = I.mk(g[1]); p.eq.body = I.mk(g[2]);
      if (g[3]) p.eq.shield = I.mk(g[3]);
    }
    p.vis = null;
  };

  /** Casilla libre al azar dentro de una zona (por defecto, el prado). */
  P.botSpot = function (p, cx, cy, r, zone) {
    zone = zone || 'prado';
    for (let i = 0; i < 60; i++) {
      const x = cx === undefined ? rnd(32, 110) : cx + rnd(-r, r), y = cy === undefined ? rnd(62, 94) : cy + rnd(-r, r);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (zoneAt(x, y).id !== zone || !world.isWalkable(x, y) || !world.reach[kxy(x, y)]) continue;
      if (isPortalTile(x, y) || this.mgrid.has(kxy(x, y)) || this.pgrid.has(kxy(x, y))) continue;
      return [x, y];
    }
    return null;
  };

  /* ===================================================== movimiento ===================================================== */
  /** Camina un paso hacia un punto (BFS corto, con rutas dentro de una zona). */
  P.botWalk = function (p, tx, ty, now, adjacent, nodes) {
    if (now < p.nextMove) return false;
    const goal = adjacent ? (x, y) => cheb(x, y, tx, ty) <= 1 : (x, y) => x === tx && y === ty;
    const pass = (x, y) => this.playerCanStep(p, x, y, now) && !isPortalTile(x, y);
    const step = this.bfsStep(p.x, p.y, goal, pass, nodes || 500) || this.greedyStep(p.x, p.y, tx, ty, pass);
    if (!step) return false;
    return this.tryStep(p, step.dx, step.dy, now);
  };

  /** Un paso por el campo de distancia hacia un destino lejano (cruza portales). Devuelve true si llegó. */
  P.botTravel = function (p, dest, now) {
    if (!dest) return false;
    const f = fieldTo(dest[0], dest[1]), d = f[kxy(p.x, p.y)];
    if (d === 0) return true;
    if (d < 0 || now < p.nextMove) return false;
    let best = null, bd = d, blocker = null;
    for (const [dx, dy] of DIRS8) {
      const nx = p.x + dx, ny = p.y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const v = f[kxy(nx, ny)];
      if (v < 0 || v >= bd) continue;
      if (!this.playerCanStep(p, nx, ny, now)) { const mm = this.mgrid.get(kxy(nx, ny)); if (mm && !mm.dead) blocker = mm; continue; }
      best = { dx, dy }; bd = v;
    }
    if (best) this.tryStep(p, best.dx, best.dy, now);
    else if (blocker) { p.target = blocker.id; p.ai.clearUntil = now + 4000; }      // un monstruo les cierra el paso: lo derriban
    return false;
  };

  /* ===================================================== utilidades ===================================================== */
  P.botRealInRaid = function () {
    for (const q of this.players.values()) if (q.ws && isRaidZone(zoneAt(q.x, q.y).id)) return true;
    return false;
  };
  P.botRealInHall = function () {
    for (const q of this.players.values()) if (q.ws && q.hp > 0 && zoneAt(q.x, q.y).id === 'raid_hall') return true;
    return false;
  };

  /** Cura: primero pociones de la mochila, luego el conjuro de curar. Las élites usan un remedio propio (su vida es enorme). */
  P.botHeal = function (p, now, below) {
    if (p.hp >= p.maxHp * (below || 0.5)) return;
    const ai = p.ai;
    if (ai.role === 'elite') {
      if (now < ai.nextHeal) return;
      const h = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * (ai.mode === 'raid' ? 0.35 : 0.3)));
      p.hp += h; ai.nextHeal = now + (ai.mode === 'raid' ? 3000 : 5000);
      this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + h, c: 'g' });
      this.fx.push({ k: 'h', x: p.x, y: p.y });
      return;
    }
    if (now >= p.nextPotion) {
      const s = p.inv.findIndex((it) => it && ITEMS[it.id] && ITEMS[it.id].heal && !ITEMS[it.id].food && (ITEMS[it.id].minLevel || 1) <= p.level);
      if (s >= 0) { this.use(p, s); return; }
    }
    if (now >= p.nextSpell && p.mana >= 25) this.castHeal(p);
  };

  P.botPick = function (p, now) {
    const ai = p.ai, zone = ai.zone, types = ai.role === 'novato' ? noviceTypes(p.level) : ZONE_TYPES[zone];
    const taken = new Set();
    for (const b of this.bots) if (b !== p && b.target) taken.add(b.target);
    let best = null, bd = 1e9;
    for (const m of this.monsters) {
      if (m.dead || m.def.boss || !types.includes(m.type) || taken.has(m.id)) continue;
      const d = cheb(p.x, p.y, m.x, m.y);
      if (d > SEARCH || d >= bd) continue;
      if (zoneAt(m.x, m.y).id !== zone) continue;
      const sk = ai.skip.get(m.id); if (sk && sk > now) continue;
      best = m; bd = d;
    }
    return best;
  };

  P.botZoneOk = function (p) {
    const id = zoneAt(p.x, p.y).id;
    if (ALLOWED.has(id) || isRaidZone(id)) return true;
    return false;
  };

  /* ===================================================== IA individual ===================================================== */
  P.botThink = function (p, now) {
    const ai = p.ai;
    if (!this.botZoneOk(p)) { p.x = SPAWN_POINT.x; p.y = SPAWN_POINT.y; p.tpSeq++; p.target = null; ai.mode = 'hunt'; }
    const w = this.weaponOf(p);
    if (w.style === 'magic' && p.mana < w.mana * 3) p.mana = p.maxMana;      // los magos nunca se quedan sin maná
    this.botHeal(p, now, ai.mode === 'raid' || ai.mode === 'boss' ? 0.55 : 0.4);

    if (ai.mode === 'boss') return this.botBossThink(p, now);
    if (ai.mode === 'raid') return this.botRaidThink(p, now);
    if (ai.mode === 'town') return this.botTownThink(p, now);
    if (ai.mode === 'idle') { if (now >= ai.until) ai.mode = 'hunt'; return; }
    this.botChatter(p, now);
    this.botHuntThink(p, now);
  };

  P.botHuntThink = function (p, now) {
    const ai = p.ai, cur = zoneAt(p.x, p.y);
    // cada cierto tiempo cambian de zona de caza (algunas tienen PvP: allí los jugadores pueden atacarlos y ellos se defienden)
    if (ai.tier.zones && now >= ai.zoneUntil && ai.mode === 'hunt') {
      ai.zoneUntil = now + rnd(10, 20) * 60000;
      const z = ai.tier.zones[rnd(0, ai.tier.zones.length - 1)], hub = HUBS[z]();
      if (hub && fieldTo(hub[0], hub[1])[kxy(p.x, p.y)] >= 0) ai.zone = z;
    }
    const zone = ai.zone;
    if (this.botNeedsTrip(p, now)) { ai.mode = 'town'; ai.trip = { step: 'shop', t0: now, next: 0, n: 0 }; p.target = null; return; }
    // fuera de su zona de caza: viaja hasta ella (los novatos solo vuelven al prado desde la ciudad)
    if (cur.id !== zone) {
      if (!(ai.clearUntil > now)) p.target = null;
      this.botTravel(p, HUBS[zone](), now);
      return;
    }
    // atascado: no avanza ni ataca durante 10 s -> deja ese objetivo
    if (p.x !== ai.px || p.y !== ai.py || now - p.nextAtk < 3000) { ai.px = p.x; ai.py = p.y; ai.stuckAt = now; }
    else if (now - ai.stuckAt > 10000) {
      if (p.target) ai.skip.set(p.target, now + 20000);
      p.target = null; ai.stuckAt = now; ai.wander = null;
    }
    if (p.target) {
      const t = this.ents.get(p.target);
      if (t && t.kind === 'mo' && !t.dead) return;   // updatePlayer persigue y ataca
      if (t && t.kind === 'pl' && t.hp > 0 && this.canPvp(p, t) && cheb(p.x, p.y, t.x, t.y) <= 12 && p.pvpLock > now - 15000) return;   // defensa propia
      const wasKill = t && t.dead;
      if (wasKill) ai.killAt = { x: t.x, y: t.y, until: now + 15000 };
      p.target = null;
      if (wasKill && Math.random() < 0.25) { ai.mode = 'idle'; ai.until = now + rnd(2500, 9000); return; }
    }
    const loot = this.botFindLoot(p, now);
    if (loot) {
      if (p.x === loot[0] && p.y === loot[1]) { this.pickup(p, true); if (this.gtile.has(loot[2])) ai.lootSkip.set(loot[2], now + 30000); }
      else if (!this.botWalk(p, loot[0], loot[1], now, false, 300) && now >= p.nextMove) ai.lootSkip.set(loot[2], now + 30000);
      return;
    }
    const m = this.botPick(p, now);
    if (m) {
      ai.wander = null;
      if (cheb(p.x, p.y, m.x, m.y) <= 10) p.target = m.id;
      else this.botWalk(p, m.x, m.y, now, true, zone === 'prado' ? 500 : 2500);
      return;
    }
    // sin monstruos libres cerca: pasea un poco
    if (!ai.wander || (ai.wander[0] === p.x && ai.wander[1] === p.y) || now > ai.wanderUntil) {
      ai.wander = this.botSpot(p, p.x, p.y, 10, zone); ai.wanderUntil = now + 8000;
      if (!ai.wander || Math.random() < 0.4) { ai.mode = 'idle'; ai.until = now + rnd(2000, 6000); ai.wander = null; return; }
    }
    if (ai.wander) this.botWalk(p, ai.wander[0], ai.wander[1], now, false);
  };

  /* ===================================================== botín, tienda y banco ===================================================== */
  P.botFindLoot = function (p, now) {
    if (p.inv.every(Boolean)) return null;
    const zid = zoneAt(p.x, p.y).id, pvp = zoneAt(p.x, p.y).pvp;
    let best = null, bd = 99;
    for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -7; dx <= 7; dx++) {
        const x = p.x + dx, y = p.y + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const k = kxy(x, y), arr = this.gtile.get(k);
        if (!arr) continue;
        const sk = p.ai.lootSkip.get(k); if (sk && sk > now) continue;
        if (!arr.some((g) => g.prot <= now || g.owner === p.id)) continue;
        if (zoneAt(x, y).id !== zid) continue;
        if (pvp) { const kp = p.ai.killAt; if (!kp || now > kp.until || cheb(x, y, kp.x, kp.y) > 2) continue; }   // en PvP solo recogen lo de sus propias presas, no lo que dejan otros jugadores al morir
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        if (d < bd) { bd = d; best = [x, y, k]; }
      }
    }
    return best;
  };

  const kindOf = (it) => {                                  // qué hace un bot con cada objeto de la mochila
    const d = ITEMS[it.id]; if (!d) return 'keep';
    if (d.type === 'consumable') return 'keep';
    const v = I.sellValue(it);
    if (I.isGem(it.id)) return 'bank';
    if (I.isGear(it.id)) return (it.up > 0 || it.an || v >= 800) ? 'bank' : v > 0 ? 'sell' : 'keep';
    return v >= 800 ? 'bank' : v > 0 ? 'sell' : 'keep';
  };
  const healCount = (p) => p.inv.reduce((n, it) => n + (it && ITEMS[it.id] && ITEMS[it.id].heal && !ITEMS[it.id].food ? it.qty : 0), 0);

  P.botNeedsTrip = function (p, now) {
    const ai = p.ai, used = p.inv.filter(Boolean).length;
    if (used >= 36) return true;
    if (now < ai.nextTrip) return false;
    return used >= 8 || (ai.role !== 'elite' && healCount(p) === 0 && p.gold >= 60);
  };

  P.botTownThink = function (p, now) {
    const ai = p.ai, tr = ai.trip;
    if (!tr || now - tr.t0 > 300000) { ai.mode = 'hunt'; ai.trip = null; ai.nextTrip = now + rnd(4, 8) * 60000; return; }
    if (now < tr.next) return;
    const npc = (id) => world.NPCS.find((n) => n.id === id);
    if (tr.step === 'shop') {
      const n = npc('boris');
      if (cheb(p.x, p.y, n.x, n.y) > 3) { this.botTravel(p, HUBS.shop(), now); return; }
      if (!tr.opened) { tr.opened = true; this.npcClick(p, 'boris'); tr.next = now + 700; return; }
      if (this.botShopAction(p, tr)) { tr.next = now + rnd(350, 800); return; }
      tr.step = 'bank'; tr.next = now + 500; return;
    }
    const g = npc('gerda');
    if (cheb(p.x, p.y, g.x, g.y) > 3) { this.botTravel(p, HUBS.bank(), now); return; }
    if (this.botBankAction(p, tr)) { tr.next = now + rnd(350, 700); return; }
    ai.mode = 'hunt'; ai.trip = null; ai.nextTrip = now + rnd(8, 14) * 60000;
  };

  /** Una acción de tienda por llamada: equipar mejoras, vender, comprar pociones y mejoras. Devuelve false si ya no queda nada. */
  P.botShopAction = function (p, tr) {
    const ai = p.ai;
    // 1) equipar lo que sea mejor que lo puesto
    for (let i = 0; i < p.inv.length; i++) {
      const it = p.inv[i]; if (!it || !I.isGear(it.id)) continue;
      const d = ITEMS[it.id];
      if ((d.minLevel || 1) > p.level || (d.type === 'weapon' && d.style !== ai.style)) continue;
      const sl = I.slotFor(d.type, p.eq), cur = p.eq[sl];
      if (!cur || I.baseStat(it) > I.baseStat(cur)) { this.equip(p, i); return true; }
    }
    // 2) vender lo que sobra
    for (let i = 0; i < p.inv.length; i++) {
      const it = p.inv[i]; if (!it || kindOf(it) !== 'sell') continue;
      this.sell(p, i, it.qty); return true;
    }
    // 3) comprar pociones
    if (!tr.potions) {
      tr.potions = true;
      const big = p.level >= 10 && p.gold >= 400, id = big ? 'pocion_vida_g' : 'pocion_vida', need = 8 - healCount(p);
      if (need > 0 && p.gold >= ITEMS[id].price * need && ai.role !== 'elite') { this.buy(p, id, need); return true; }
    }
    // 4) comprar una mejora de equipo que pueda pagar
    if (tr.n < 4) {
      let best = null, gain = 0;
      for (const id of world.NPCS.length ? (require('./data').SHOPS.boris || []) : []) {
        const d = ITEMS[id]; if (!d || !I.isGear(id) || (d.minLevel || 1) > p.level || d.price > p.gold * 0.8) continue;
        if (d.type === 'weapon' && d.style !== ai.style) continue;
        if (!['weapon', 'head', 'body', 'shield'].includes(d.type)) continue;
        const cur = p.eq[d.type], g = I.baseStat(I.mk(id)) - (cur ? I.baseStat(cur) : 0);
        if (g > gain) { gain = g; best = id; }
      }
      if (best) { tr.n++; this.buy(p, best, 1); return true; }
      tr.n = 99;
    }
    return false;
  };

  P.botBankAction = function (p, tr) {
    tr.bank = (tr.bank || 0) + 1;
    if (tr.bank > 60) return false;
    for (let i = 0; i < p.inv.length; i++) {
      const it = p.inv[i]; if (!it || kindOf(it) !== 'bank') continue;
      const before = p.inv[i]; this.bankDeposit(p, i, it.qty);
      if (p.inv[i] === before && I.isGear(before.id)) { p.inv[i] = null; I.putInto(p.inv, before); tr.bank = 99; return false; }   // banco lleno
      return true;
    }
    if (p.gold > 1500 && !tr.gold) { tr.gold = true; this.bankGoldMove(p, 'dep', p.gold - 500); return true; }
    return false;
  };

  /* ===================================================== charla ===================================================== */
  const SAY = ['¡Buenas!', '¿Alguien para ir a por un jefe?', 'Qué buen día para cazar.', 'Cuidado con las arañas.', '¡Ánimo!', 'Voy a vender unas cosas.', 'Hoy hay buen botín.', '¿Qué tal por aquí?', 'Me voy a las mazmorras.'];
  P.botChatter = function (p, now) {
    const ai = p.ai;
    if (now < ai.nextChat) return;
    ai.nextChat = now + rnd(90, 240) * 1000;
    let real = false;
    for (const q of this.players.values()) if (q.ws && cheb(q.x, q.y, p.x, p.y) <= 12) { real = true; break; }
    if (real && Math.random() < 0.7) this.chat(p, SAY[rnd(0, SAY.length - 1)]);
  };

  /* ===================================================== jefes de mazmorra ===================================================== */
  P.botBossThink = function (p, now) {
    const g = this.botGroup, ai = p.ai;
    if (!g || !g.members.includes(p)) { ai.mode = 'hunt'; p.target = null; return; }
    const b = g.boss;
    const clearing = ai.clearUntil > now;
    if (zoneAt(p.x, p.y).id !== g.zone) { if (!clearing) p.target = null; this.botTravel(p, HUBS[g.zone](), now); return; }
    if (g.phase === 'gather') {
      if (!clearing) p.target = null;
      if (cheb(p.x, p.y, g.lair[0], g.lair[1]) > 13) this.botTravel(p, g.lair, now);
      return;
    }
    if (b.dead) return;
    if (cheb(p.x, p.y, b.x, b.y) > 10) { if (!clearing) p.target = null; this.botTravel(p, [b.x, b.y], now); }
    else p.target = b.id;
  };

  P.botBossDirector = function (now) {
    const g = this.botGroup;
    if (g) {
      const alive = g.members.filter((m) => m.hp > 0 && zoneAt(m.x, m.y).id === g.zone);
      if (g.boss.dead) { if (Math.random() < 0.6) this.chat(g.members[0], 'gg'); this.botBoss[g.type].next = now + this.botCfg.bossCdMs * (0.8 + Math.random() * 0.5); return this.botGroupEnd(); }
      if (g.phase === 'gather') {
        if (now - g.t0 > 300000) { this.botBoss[g.type].next = now + 5 * 60000; return this.botGroupEnd(); }
        const engaged = g.boss.target && alive.some((m) => m.id === g.boss.target);
        const near = alive.filter((m) => cheb(m.x, m.y, g.boss.x, g.boss.y) <= 14);
        if (engaged && near.length >= 1) { g.phase = 'fight'; g.t1 = now; return; }
        if (near.length >= Math.min(g.members.length, 3) && (near.length === alive.length || now - g.t0 > 90000)) { g.phase = 'fight'; g.t1 = now; this.botSay(g.members[0], `⚔️ ${g.members.map((m) => m.name).join(', ')} van a por ${g.boss.def.name}.`); }
      } else if (!alive.length || now - g.t1 > 240000) { this.botBoss[g.type].next = now + 10 * 60000; return this.botGroupEnd(); }
      return;
    }
    for (const B of BOSSES) {
      const st = this.botBoss[B.type];
      if (now < st.next) continue;
      const boss = this.monsters.find((m) => m.type === B.type && !m.dead);
      if (!boss) continue;
      const cand = this.bots.filter((q) => (q.ai.role === 'aventurero' || q.ai.role === 'veterano') && (q.ai.mode === 'hunt' || q.ai.mode === 'idle') && q.hp >= q.maxHp * 0.7);
      if (cand.length < B.min) continue;
      cand.sort((a, b) => (b.ai.tier.zone === B.zone) - (a.ai.tier.zone === B.zone));
      const members = cand.slice(0, 4);
      const lair = [boss.sx, boss.sy];
      this.botGroup = { type: B.type, zone: B.zone, boss, members, phase: 'gather', t0: now, t1: 0, lair };
      for (const m of members) { m.ai.mode = 'boss'; m.target = null; }
      return;
    }
  };
  P.botGroupEnd = function () {
    const g = this.botGroup; if (!g) return;
    for (const m of g.members) { m.ai.mode = 'hunt'; m.target = null; }
    this.botGroup = null;
  };
  P.botSay = function (p, text) { this.broadcastChat(text, 'k'); };

  /* ===================================================== la Raid ===================================================== */
  const raidZoneIdx = (p) => RAID.rooms.findIndex((r) => r.id === zoneAt(p.x, p.y).id);

  P.botRaidThink = function (p, now) {
    const ai = p.ai, r = this.raid, rm = raidZoneIdx(p), R = this.botRaid;
    if (R.phase === 'gather') {
      p.target = null;
      if (rm < 0) this.botTravel(p, HUBS.raid(), now);
      else if (rm === 0 && r && !r.members.has(p.key) && now >= (ai.rejoin || 0)) { ai.rejoin = now + 4000; this.raidGo(p); }   // un jugador real la inició: se suman
      return;
    }
    // en la Raid
    if (!r || !r.members.has(p.key)) {
      if (rm === 0 && r && now < R.t0 + 240000 && now >= (ai.rejoin || 0)) { ai.rejoin = now + 4000; this.raidGo(p); return; }   // intenta unirse
      if (rm >= 0) { if (!r) return; ai.mode = 'hunt'; return; }
      if (r && now < R.t0 + 120000) { this.botTravel(p, HUBS.raid(), now); return; }
      ai.mode = 'hunt'; p.target = null; return;
    }
    if (rm < 0) {                               // cayó: vuelve si le quedan vidas
      p.target = null;
      if ((r.deaths[p.key] || 0) <= 3) {
        if (r.phase === 'fight' || r.phase === 'transition') this.botTravel(p, HUBS.raid(), now);
      } else ai.mode = 'hunt';
      return;
    }
    if (rm === 0) { if (r.members.has(p.key) && this.now >= (ai.rejoin || 0)) { ai.rejoin = now + 4000; this.raidGo(p); } return; }
    if (r.phase === 'chest' && r.chest && rm === 5 && !ai.opened) {            // el cofre final: como cualquiera, se acercan y lo abren
      p.target = null;
      if (cheb(p.x, p.y, r.chest.x, r.chest.y) > 2) this.botWalk(p, r.chest.x, r.chest.y, now, true, 600);
      else { ai.opened = true; this.raidOpenChest(p); }
      return;
    }
    if (r.phase !== 'fight' || !r.boss || r.boss.dead || rm !== r.room) { p.target = null; return; }
    const b = r.boss;
    let tgt = b, bd = 12;                                                   // primero los esbirros cercanos, luego el jefe
    if (b.shieldUntil > now || cheb(p.x, p.y, b.x, b.y) > 24) bd = 40;
    for (const m of this.monsters) {
      if (m.dead || !m.raidRun || m.parent !== b) continue;
      const d = cheb(p.x, p.y, m.x, m.y); if (d < bd) { bd = d; tgt = m; }
    }
    if (p.target !== tgt.id && !ai.dodging) p.target = tgt.id;
  };

  /** Registra los avisos de ataque de los jefes de la Raid para que los bots los esquiven. */
  P.botNoteHazards = function (now) {
    const fx = this.fx;
    if (fx.length < this._bfxN) this._bfxN = 0;
    for (let i = this._bfxN; i < fx.length; i++) {
      const f = fx[i];
      if (f.k === 'rd_w' && f.r > 1.5) this.botHaz.push({ x: f.x, y: f.y, r: f.r, until: now + f.ms + 350 });
      else if (f.k === 'rd_lw') this.botHaz.push({ line: 1, x: f.x, y: f.y, x2: f.x2, y2: f.y2, r: f.w, until: now + f.ms + 350 });
      else if (f.k === 'rd_pool') this.botHaz.push({ x: f.x, y: f.y, r: f.r, until: now + f.ms });
    }
    this._bfxN = fx.length;
    if (this.botHaz.length && this.tickN % 10 === 0) this.botHaz = this.botHaz.filter((h) => h.until > now);
  };
  const inHaz = (h, x, y, pad) => {
    if (!h.line) return Math.hypot(x - h.x, y - h.y) <= h.r + pad;
    const dx = h.x2 - h.x, dy = h.y2 - h.y, L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((x - h.x) * dx + (y - h.y) * dy) / L2));
    return Math.hypot(x - (h.x + dx * u), y - (h.y + dy * u)) <= h.r + pad;
  };
  P.botDodge = function (p, now) {
    const ai = p.ai;
    if (!this.botHaz.length) { ai.dodging = false; return; }
    const bad = (x, y) => this.botHaz.some((h) => h.until > now && inHaz(h, x, y, 0.8));
    if (!bad(p.x, p.y)) { ai.dodging = false; return; }
    ai.dodging = true; p.target = null;
    if (now < p.nextMove) return;
    const rm = raidZoneIdx(p);
    const pass = (x, y) => this.playerCanStep(p, x, y, now) && !isPortalTile(x, y) && raidZoneIdx({ x, y }) === rm;
    const step = this.bfsStep(p.x, p.y, (x, y) => !bad(x, y), pass, 400);
    if (step) this.tryStep(p, step.dx, step.dy, now);
  };

  P.botRaidDirector = function (now) {
    const R = this.botRaid, r = this.raid;
    const elites = this.bots.filter((q) => q.ai.role === 'elite');
    const free = () => elites.filter((q) => (q.ai.mode === 'hunt' || q.ai.mode === 'idle') && q.hp >= q.maxHp * 0.8);
    const begin = (cand, withReal) => {
      R.phase = 'gather'; R.t0 = now; R.withReal = withReal; R.ids = cand.slice(0, 6).map((q) => q.key);
      for (const q of cand.slice(0, 6)) { q.ai.mode = 'raid'; q.ai.opened = false; q.target = null; }
    };
    if (R.phase === 'idle') {
      if (r || elites.length < 3) return;
      const cand = free();
      if (this.botRealInHall() && cand.length >= 2) { begin(cand, true); return; }          // un jugador real espera en la antecámara: van con él
      if (now < R.next || cand.length < 3) return;
      begin(cand, false);
      return;
    }
    const mine = R.ids.map((k) => this.players.get(k)).filter(Boolean);
    const stop = (wait) => { for (const q of mine) { if (q.ai.mode === 'raid') q.ai.mode = 'hunt'; q.target = null; q.ai.dodging = false; } R.phase = 'idle'; R.next = now + (wait || this.botCfg.raidCdMs * (0.8 + Math.random() * 0.5)); };
    if (R.phase === 'gather') {
      if (this.raid) {                                    // la inició un jugador real: se suman
        if (this.raid.botRun) { stop(); return; }
        R.phase = 'run'; R.t0 = now; return;
      }
      const inHall = mine.filter((q) => raidZoneIdx(q) === 0);
      if (R.withReal) {                                   // esperan a que el jugador real la inicie
        if (!this.botRealInHall() && now - R.t0 > 60000) { stop(60000); return; }
        if (now - R.t0 > 300000) stop(60000);
        return;
      }
      if ((inHall.length === mine.length && mine.length >= 3) || (now - R.t0 > 120000 && inHall.length >= 3)) {
        this.raidGo(inHall[0]);
        if (this.raid) { this.raid.botRun = true; R.phase = 'run'; R.t0 = now; } else stop();
      } else if (now - R.t0 > 180000) stop();
      return;
    }
    if (R.phase === 'run' && !this.raid) stop();
  };

  /* ===================================================== bucle ===================================================== */
  const G0 = P.gainXp;
  P.gainXp = function (p, xp) {
    if (p.bot) {                       // cada nivel de bot tiene un tope: no se vuelven invencibles
      const cap = xpForLevel(p.ai.capLv);
      if (p.xp >= cap) return;
      xp = Math.min(xp, cap - p.xp);
    }
    return G0.call(this, p, xp);
  };
  const S0 = P.addSkillXp;
  P.addSkillXp = function (p, style, amt) {
    if (p.bot && skillFromXp(p.sxp[style]) >= p.ai.capSk) return;
    return S0.call(this, p, style, amt);
  };
  const HM = P.hurtMonster;
  P.hurtMonster = function (m, dmg, p, now) {
    if (p && p.bot && p.ai.power > 1) dmg = Math.round(dmg * p.ai.power);
    return HM.call(this, m, dmg, p, now);
  };
  const HP0 = P.hurtPlayer;
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    if (p.bot && p.ai.tough < 1) raw = Math.max(1, Math.round(raw * p.ai.tough));
    if (p.bot && src && src.kind === 'pl' && !src.bot && p.ai.mode === 'hunt' && this.canPvp(p, src)) p.target = src.id;      // se defienden, no empiezan peleas
    return HP0.call(this, p, raw, src, now, srcName);
  };

  const T0 = P.tickExt;
  P.tickExt = function (now) {
    T0.call(this, now);
    if (!this.bots || !this.bots.length) return;
    const t = this.now || now;
    this.botNoteHazards(t);
    for (const p of this.bots) if (p.hp > 0 && p.ai.mode === 'raid' && raidZoneIdx(p) > 0) this.botDodge(p, t);
    if (this.tickN % 4 === 0) for (const p of this.bots) if (p.hp > 0) this.botThink(p, t);
    if (this.tickN % 20 === 0) { this.botBossDirector(t); this.botRaidDirector(t); }
  };
}

module.exports = { install, NAMES };
