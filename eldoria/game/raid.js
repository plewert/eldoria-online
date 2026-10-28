'use strict';
/**
 * RAID — Santuario de las Cinco Sombras (1 a 10 jugadores).
 * 5 jefes en 5 cámaras seguidas (Slyvra, Koros, Aranak, Xaelis y Malgathor). Al caer el último aparece un cofre
 * que cada participante abre una vez: da el botín raro (sets de la raid, capas, armas) con su animación.
 * Todo lo decide el servidor: salas, vidas, vida de los jefes (escala con el grupo), ataques con aviso y cofre.
 */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

const MAX_PARTY = 10, MAX_DEATHS = 3;

/* ---------------------------------------------------------------- objetos ---------------------------------------------------------------- */
// ranura del atlas → tipo de objeto
const SLOT_TYPE = { helm: 'head', chest: 'body', glove: 'gloves', leg: 'legs', boot: 'boots', belt: 'belt', ring: 'ring', amulet: 'amulet', cape: 'cape', weapon: 'weapon' };
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', belt: '🎗️', ring: '💍', amulet: '📿', cape: '🧥' };
// peso de cada pieza dentro del cofre (más bajo = más raro)
const SLOT_W = { helm: 10, chest: 9, glove: 10, leg: 10, boot: 10, belt: 10, ring: 8, amulet: 6, cape: 5, weapon: 3 };

const SETS = {
  rv: {
    boss: 'raid_slyvra', L: 100, k: 1.00, names: {
      helm: 'Corona de la Reina Venenosa', chest: 'Coraza de Escamas Ponzoñosas', glove: 'Garras de Ponzoña', leg: 'Grebas de Cieno Letal', boot: 'Botas del Cenagal',
      belt: 'Cinto de Colmillos', ring: 'Anillo de Veneno Vivo', amulet: 'Amuleto del Nido Letal', cape: 'Capa de la Reina Víbora', weapon: 'Arco Compuesto Miasma',
    }, weapon: { style: 'ranged', el: 'poison' }, cape: { cc: ['#5cd96a', '#1d5a2c', '#c9ff8a'], glow: '#7dff7a' },
  },
  rk: {
    boss: 'raid_koros', L: 105, k: 1.08, names: {
      helm: 'Yelmo del Coloso Sísmico', chest: 'Peto de Roca Fundida', glove: 'Puños de Basalto', leg: 'Grebas de Magma', boot: 'Botas del Temblor',
      belt: 'Cinto de Lava Solidificada', ring: 'Anillo del Cráter', amulet: 'Amuleto del Corazón de Piedra', cape: 'Capa de Ceniza Ardiente', weapon: 'Martillo Sísmico de Koros',
    }, weapon: { style: 'melee', el: 'fire' }, cape: { cc: ['#e8742a', '#5a1a08', '#ffc060'], glow: '#ff7a20' },
  },
  ra: {
    boss: 'raid_aranak', L: 110, k: 1.16, names: {
      helm: 'Casco Mecánico de Aranak', chest: 'Coraza de Engranajes', glove: 'Manoplas de Pinza', leg: 'Grebas de Pistones', boot: 'Botas de Acero Vivo',
      belt: 'Cinto de Eslabones', ring: 'Anillo de Núcleo Ígneo', amulet: 'Amuleto del Reactor', cape: 'Capa de Placas Fundidas', weapon: 'Ballesta de Aguijón Mecánico',
    }, weapon: { style: 'ranged', el: 'fire' }, cape: { cc: ['#b9824a', '#3b2410', '#ffd08a'], glow: '#ff9a40' },
  },
  rx: {
    boss: 'raid_xaelis', L: 115, k: 1.24, names: {
      helm: 'Diadema de la Ira del Alba', chest: 'Vestidura Rayosolar', glove: 'Guanteletes del Trueno', leg: 'Calzas de Luz Dorada', boot: 'Sandalias del Relámpago',
      belt: 'Faja del Amanecer', ring: 'Anillo del Rayo Dorado', amulet: 'Amuleto del Sol Naciente', cape: 'Capa y Alas de Xaelis', weapon: 'Cetro de la Ira del Alba',
    }, weapon: { style: 'magic', el: 'sun' }, cape: { cc: ['#ffe68a', '#c98a1a', '#fff6c8'], glow: '#ffe27a', wings: true },
  },
  rm: {
    boss: 'raid_malgathor', L: 120, k: 1.35, names: {
      helm: 'Yelmo del Segador del Vacío', chest: 'Coraza de Singularidad', glove: 'Garras del Olvido', leg: 'Grebas del Abismo', boot: 'Botas del Vacío Eterno',
      belt: 'Cinto de Materia Oscura', ring: 'Anillo del Horizonte de Sucesos', amulet: 'Amuleto de la Nada', cape: 'Capa del Segador del Vacío', weapon: 'Gran Espada Singularidad del Olvido',
    }, weapon: { style: 'melee', el: 'void' }, cape: { cc: ['#8a3cff', '#1a0836', '#e0b8ff'], glow: '#b070ff' },
  },
};
// estadísticas base por ranura (se multiplican por k del set)
const STATS = {
  helm: { def: 62, bonus: { hp: 360, atk: 6, crit: 0.03 } }, chest: { def: 84, bonus: { hp: 560, atk: 15 } }, glove: { def: 30, bonus: { hp: 160, atk: 13, crit: 0.02 } },
  leg: { def: 44, bonus: { hp: 300, atk: 10 } }, boot: { def: 34, bonus: { hp: 200, atk: 7 } }, belt: { def: 28, bonus: { hp: 280, atk: 10 } },
  ring: { bonus: { atk: 16, hp: 200, crit: 0.03 } }, amulet: { bonus: { hp: 520, mana: 160, atk: 13, crit: 0.04 } }, cape: { def: 26, bonus: { hp: 340, atk: 9, crit: 0.02 } },
  weapon: { atk: 230, cd: 1150 },
};
const itemId = (p, s) => `rd_${p}_${s}`;
const ALL_ITEMS = [];
for (const [p, S] of Object.entries(SETS)) for (const s of Object.keys(SLOT_TYPE)) ALL_ITEMS.push([p, s]);

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  const scale = (b, k) => { const o = {}; for (const [a, v] of Object.entries(b)) o[a] = a === 'crit' ? Math.round(v * k * 1000) / 1000 : Math.round(v * k); return o; };
  for (const [p, S] of Object.entries(SETS)) {
    for (const s of Object.keys(SLOT_TYPE)) {
      const type = SLOT_TYPE[s], st = STATS[s], id = itemId(p, s), name = S.names[s], spr = `${p}_${s}`;
      if (s === 'weapon') {
        ITEMS[id] = { name, icon: S.weapon.style === 'ranged' ? '🏹' : S.weapon.style === 'magic' ? '🔮' : '⚔️', spr, type: 'weapon', style: S.weapon.style, atk: Math.round(st.atk * S.k), cd: st.cd,
          range: S.weapon.style === 'ranged' ? 8 : S.weapon.style === 'magic' ? 7 : 1, el: S.weapon.el, raid: 1, minLevel: S.L, sell: sell(S.L, 9) };
      } else {
        ITEMS[id] = { name, icon: ICON[type], spr, type, bonus: scale(st.bonus, S.k), raid: 1, minLevel: S.L, sell: sell(S.L, 6) };
        if (st.def) ITEMS[id].def = Math.round(st.def * S.k);
        if (s === 'cape') Object.assign(ITEMS[id], { cc: S.cape.cc, glow: S.cape.glow, wings: !!S.cape.wings });
      }
    }
  }
  // jefes (el botín de los sets sale del cofre; aquí solo se listan para la colección)
  for (const def of Object.values(BOSS_DEFS)) {
    const S = SETS[def.set];
    const loot = Object.keys(SLOT_TYPE).map((s) => [itemId(def.set, s), CHEST_CHANCE(def.set, s), 1, 1]);
    MONSTERS[def.type] = { name: def.name, icon: def.icon, lv: def.lv, hp: def.hp, dmg: def.dmg, dmgK: def.dmgK, exp: def.exp, move: def.move, atkCd: def.atkCd, aggro: 24, respawn: 999999999, armor: 0.5,
      shared: true, boss: true, special: 'raid', raidId: def.type, gold: [0, 0], loot, minLevelHint: S.L };
  }
  for (const def of Object.values(MINIONS)) MONSTERS[def.type] = def.def;
}

/* ---------------------------------------------------------------- jefes ---------------------------------------------------------------- */
// ataques: c = círculos sobre jugadores, s = golpe en torno al jefe, l = línea, p = charco persistente, u = invoca, h = escudo, v = atrae, r = lluvia aleatoria
const BOSS_DEFS = {
  raid_slyvra: {
    type: 'raid_slyvra', set: 'rv', name: 'Slyvra, Reina Venenosa', icon: '🐍', lv: 700, hp: 520000, dmg: [260, 430], dmgK: 2.6, exp: 120000, move: 380, atkCd: 1300, th: 'poison',
    seq: [{ k: 'p', n: 4, r: 2.6, dmg: [90, 140], life: 7 }, { k: 'u', t: 'raid_vibora', n: 3 }, { k: 'c', n: 5, r: 2.2, dmg: [520, 760], warn: 1300 }, { k: 'l', w: 1.7, len: 15, dmg: [700, 980], warn: 1400 }, { k: 'p', n: 5, r: 2.6, dmg: [100, 150], life: 8 }, { k: 'u', t: 'raid_vibora', n: 4 }],
  },
  raid_koros: {
    type: 'raid_koros', set: 'rk', name: 'Koros, el Rompetierras', icon: '🗿', lv: 720, hp: 600000, dmg: [290, 470], dmgK: 2.6, exp: 140000, move: 420, atkCd: 1400, th: 'quake',
    seq: [{ k: 's', r: 6.5, dmg: [820, 1150], warn: 1500 }, { k: 'c', n: 6, r: 2.0, dmg: [560, 820], warn: 1300 }, { k: 'p', n: 4, r: 2.4, dmg: [110, 160], life: 7 }, { k: 's', r: 8, dmg: [900, 1250], warn: 1700 }, { k: 'r', n: 10, r: 1.7, dmg: [480, 700], warn: 1200 }],
  },
  raid_aranak: {
    type: 'raid_aranak', set: 'ra', name: 'Aranak, el Escorpión Mecanizado', icon: '🦂', lv: 740, hp: 680000, dmg: [310, 500], dmgK: 2.6, exp: 160000, move: 400, atkCd: 1300, th: 'fire',
    seq: [{ k: 'l', w: 1.8, len: 16, dmg: [780, 1080], warn: 1300 }, { k: 'u', t: 'raid_escorpion', n: 4 }, { k: 'c', n: 6, r: 2.2, dmg: [560, 820], warn: 1300 }, { k: 'l', w: 1.8, len: 16, dmg: [800, 1100], warn: 1100, multi: 3 }, { k: 's', r: 7, dmg: [850, 1200], warn: 1600 }],
  },
  raid_xaelis: {
    type: 'raid_xaelis', set: 'rx', name: 'Xaelis, Ira del Alba', icon: '⚡', lv: 760, hp: 760000, dmg: [330, 530], dmgK: 2.6, exp: 180000, move: 360, atkCd: 1200, th: 'light',
    seq: [{ k: 'r', n: 12, r: 1.8, dmg: [520, 760], warn: 1100 }, { k: 'l', w: 1.8, len: 18, dmg: [820, 1150], warn: 1300 }, { k: 'h', ms: 4500 }, { k: 'c', n: 7, r: 2.2, dmg: [600, 880], warn: 1200 }, { k: 's', r: 7.5, dmg: [900, 1250], warn: 1500 }],
  },
  raid_malgathor: {
    type: 'raid_malgathor', set: 'rm', name: 'Malgathor, Segador del Vacío', icon: '🌀', lv: 800, hp: 1100000, dmg: [380, 600], dmgK: 2.6, exp: 300000, move: 360, atkCd: 1100, th: 'void', final: true,
    seq: [{ k: 'v', r: 12, pull: 4 }, { k: 's', r: 6, dmg: [1000, 1400], warn: 1100 }, { k: 'c', n: 8, r: 2.2, dmg: [650, 940], warn: 1200 }, { k: 'l', w: 2, len: 18, dmg: [950, 1300], warn: 1200, multi: 3 }, { k: 'p', n: 6, r: 2.6, dmg: [120, 180], life: 8 }, { k: 'r', n: 14, r: 1.8, dmg: [600, 880], warn: 1100 }, { k: 'h', ms: 4000 }],
  },
};
const BOSS_ORDER = ['raid_slyvra', 'raid_koros', 'raid_aranak', 'raid_xaelis', 'raid_malgathor'];
const MINIONS = {
  raid_vibora: { type: 'raid_vibora', def: { name: 'Víbora de Slyvra', icon: '🐍', lv: 170, hp: 14000, dmg: [190, 290], exp: 500, move: 240, atkCd: 800, aggro: 20, respawn: 999999999, armor: 0.2, gold: [0, 0], loot: [] } },
  raid_escorpion: { type: 'raid_escorpion', def: { name: 'Escorpión Mecánico', icon: '🦂', lv: 175, hp: 18000, dmg: [210, 320], exp: 600, move: 260, atkCd: 900, aggro: 20, respawn: 999999999, armor: 0.2, gold: [0, 0], loot: [] } },
};
// probabilidad (informativa) de cada pieza en el cofre final
function CHEST_CHANCE(set, slot) { const tot = Object.values(SLOT_W).reduce((a, b) => a + b, 0), setW = set === 'rm' ? 0.3 : 0.175; return Math.round(SLOT_W[slot] / tot * setW * 1000) / 1000; }

/* ---------------------------------------------------------------- servidor ---------------------------------------------------------------- */
module.exports = { build, SETS, BOSS_DEFS, BOSS_ORDER, MINIONS, MAX_PARTY, MAX_DEATHS, ALL_ITEMS, itemId, install(Game) {
  const world = require('./world');
  const I = require('./items');
  const { ITEMS, CFG, MONSTERS } = require('./data');
  const { zoneAt, RAID } = world;
  const P = Game.prototype;
  const ROOMS = RAID.rooms;                    // [0]=antecámara, 1..5 = cámaras de los jefes
  const roomOf = (x, y) => { const id = zoneAt(x, y).id; return ROOMS.findIndex((r) => r.id === id); };
  const inRaid = (p) => roomOf(p.x, p.y) >= 0;
  const KEEP = 150000;                         // el cofre queda abierto 2,5 minutos como máximo

  const tp = (p, x, y) => { p.x = x; p.y = y; p.tpSeq++; p.target = null; p.pend = null; p.nextMove = 0; };

  P.raidReset = function () {
    const r = this.raid;
    if (r) { for (const m of this.monsters.filter((q) => q.raidRun)) this.raidRemoveMonster(m); }
    this.raid = null;
  };
  P.raidRemoveMonster = function (m) {
    this.ents.delete(m.id); this.mgrid.delete(m.y * world.W + m.x);
    this.monsters = this.monsters.filter((z) => z !== m);
  };
  const members = (g, alive) => { const r = g.raid; if (!r) return []; const out = []; for (const k of r.members) { const q = g.players.get(k); if (q && (!alive || (q.hp > 0 && inRaid(q) && roomOf(q.x, q.y) > 0))) out.push(q); } return out; };
  const tell = (g, text, col) => { for (const q of members(g)) g.msgC(q, text, col || '#d9b8ff'); };

  /* ---------- inicio y avance ---------- */
  P.raidGo = function (p) {
    if (p.dead || p.hp <= 0) return;
    const r = this.raid, rm = roomOf(p.x, p.y);
    if (rm < 0) { this.msg(p, 'La entrada de la Raid está en la Ciudad de Aldea Real (portal del Santuario de las Cinco Sombras).', 's'); return; }
    if (r && r.members.has(p.key)) {                                                     // ya participas: vuelve a la cámara actual
      if ((r.deaths[p.key] || 0) > MAX_DEATHS) { this.msg(p, 'Has agotado tus vidas en esta incursión.', 's'); return; }
      const R = ROOMS[r.room]; if (rm === r.room) return;
      tp(p, R.start[0] + rnd(0, 2), R.start[1] + rnd(-2, 2)); this.msg(p, `Regresas a la ${R.name}.`, 's'); return;
    }
    if (r) {
      const early = r.room === 1 && r.phase === 'fight' && this.now < r.startedAt + 60000;         // se puede entrar durante el primer minuto
      const botRun = r.botRun && (r.phase === 'fight' || r.phase === 'transition');                 // o en cualquier momento si la iniciaron los aventureros simulados
      if ((early || botRun) && r.members.size < MAX_PARTY) {
        r.members.add(p.key); r.deaths[p.key] = 0; r.contrib[p.key] = 0;
        const R = ROOMS[Math.max(1, r.room)]; tp(p, R.start[0] + rnd(0, 2), R.start[1] + rnd(-2, 2)); tell(this, `⚔️ ${p.name} se une a la Raid (${r.members.size}/${MAX_PARTY}).`);
        return;
      }
      this.msg(p, `Hay una Raid en curso (cámara ${r.room} de 5, ${r.members.size} jugadores). Espera a que termine.`, 's'); return;
    }
    if (rm !== 0) { this.msg(p, 'Solo se puede iniciar desde la antecámara.', 's'); return; }
    const hall = [...this.players.values()].filter((q) => q.hp > 0 && roomOf(q.x, q.y) === 0).slice(0, MAX_PARTY);
    if (!hall.includes(p)) hall.unshift(p);
    const grp = hall.slice(0, MAX_PARTY);
    this.raid = { members: new Set(grp.map((q) => q.key)), deaths: {}, contrib: {}, room: 0, phase: 'idle', startedAt: this.now, boss: null, chest: null, opened: new Set(), cleared: 0 };
    for (const q of grp) { this.raid.deaths[q.key] = 0; this.raid.contrib[q.key] = 0; }
    this.broadcastChat(`⚔️ ${p.name} inicia la Raid del Santuario de las Cinco Sombras con ${grp.length} ${grp.length === 1 ? 'jugador' : 'jugadores'}.`, 'k');
    this.raidEnterRoom(1);
  };
  P.raidEnterRoom = function (i) {
    const r = this.raid; if (!r) return;
    r.room = i; r.phase = 'fight'; r.startedAt = this.now;
    const R = ROOMS[i], def = BOSS_DEFS[BOSS_ORDER[i - 1]];
    for (const q of members(this)) { if (q.hp <= 0) continue; tp(q, R.start[0] + rnd(0, 2), R.start[1] + rnd(-2, 2)); if (i > 1) { q.hp = Math.min(q.maxHp || q.hp, Math.max(q.hp, Math.round((q.maxHp || q.hp) * 0.6))); } }
    const n = members(this).length, m = this.spawnMonster(def.type, R.lair[0], R.lair[1]);
    m.maxHp = m.hp = Math.round(def.hp * (1 + 0.75 * (Math.max(1, n) - 1)));
    m.noRespawn = true; m.respawnAt = Infinity; m.raidRun = true; m.rIdx = i;
    m.shieldUntil = this.now + 9000; m.nextMove = m.nextAtk = this.now + 9000; m.nextSp = this.now + 10000; m.spN = 0;
    r.boss = m;
    this.fx.push({ k: 'rd_sh', x: m.x, y: m.y, ms: 9000 });
    for (const q of members(this)) { this.msgC(q, `${def.icon} ${R.name}: ${def.name} despierta en 9 segundos. ¡Prepárense!`, '#ffd96a'); this.raidSend(q); }
  };
  P.raidWipe = function () {
    const r = this.raid; if (!r) return;
    for (const q of members(this)) { this.msgC(q, '💀 La Raid ha caído. El Santuario se sella.', '#ff7a7a'); if (inRaid(q)) { tp(q, RAID.enter.x, RAID.enter.y + 2); q.hp = Math.max(1, q.hp); } this.send(q, { t: 'raid', on: false }); }
    this.broadcastChat('💀 Una Raid ha sido aniquilada en el Santuario de las Cinco Sombras.', 'k');
    this.raidReset();
  };
  P.raidFinish = function () {
    const r = this.raid; if (!r) return;
    for (const q of members(this)) { if (inRaid(q)) tp(q, RAID.enter.x, RAID.enter.y + 2); this.send(q, { t: 'raid', on: false }); }
    this.raidReset();
  };
  P.raidLeave = function (p) {
    if (!inRaid(p)) return;
    tp(p, RAID.enter.x, RAID.enter.y + 2); this.send(p, { t: 'raid', on: false });
    const r = this.raid; if (r && r.members.has(p.key) && r.phase !== 'chest') r.deaths[p.key] = (r.deaths[p.key] || 0) + 1;
  };

  /* ---------- botín ---------- */
  const rollPiece = (wantSet) => {
    const sets = Object.keys(SETS), setW = (s) => (wantSet ? (s === wantSet ? 1 : 0) : s === 'rm' ? 0.3 : 0.175);
    let t = Math.random() * sets.reduce((a, s) => a + setW(s), 0), set = sets[0];
    for (const s of sets) { t -= setW(s); if (t <= 0) { set = s; break; } }
    const slots = Object.keys(SLOT_W); let u = Math.random() * slots.reduce((a, s) => a + SLOT_W[s], 0), slot = slots[0];
    for (const s of slots) { u -= SLOT_W[s]; if (u <= 0) { slot = s; break; } }
    return [set, slot];
  };
  P.raidGrant = function (p, set, slot) {
    const id = itemId(set, slot), inst = I.rollGear(id, true);
    this.giveOrDropInst(p, inst);
    if (this.logDrop) this.logDrop(p, SETS[set].boss, id);
    p.dirty.inv = true;
    return id;
  };
  P.raidBossLoot = function (m, parts) {                                              // cada jefe intermedio: 22 % de una pieza de su set a cada participante
    const def = BOSS_DEFS[m.type], total = parts.reduce((a, b) => a + b[1], 0) || 1;
    for (const [pl, dmg] of parts) {
      const g = 1500 + pl.level * 20; pl.gold += g; pl.dirty.inv = true;
      this.msgC(pl, `${def.icon} ${def.name} derrotado: +${g} de oro.`, '#ffd96a');
      if (Math.random() < 0.22 * Math.min(1.6, 0.4 + 1.2 * dmg / total * parts.length / 2 + 0.4)) {
        const [, slot] = rollPiece(def.set), id = this.raidGrant(pl, def.set, slot);
        this.msgC(pl, `✨ ¡Botín de jefe: ${ITEMS[id].name}!`, '#c58bff');
        if (this.sendCol) this.sendCol(pl);
      }
    }
  };
  P.raidOpenChest = function (p) {
    const r = this.raid; if (!r || r.phase !== 'chest' || !r.chest) { this.msg(p, 'No hay ningún cofre que abrir.', 's'); return; }
    if (!r.members.has(p.key)) { this.msg(p, 'Solo los participantes de la Raid pueden abrir el cofre.', 's'); return; }
    if (r.opened.has(p.key)) { this.msg(p, 'Ya abriste el cofre.', 's'); return; }
    if (p.hp <= 0 || cheb(p.x, p.y, r.chest.x, r.chest.y) > 3) { this.msg(p, 'Acércate al cofre.', 's'); return; }
    if (!(r.contrib[p.key] > 0) && !r.finalDmg[p.key]) { this.msg(p, 'No participaste en la batalla: el cofre no te reconoce.', 's'); return; }
    r.opened.add(p.key);
    const tot = Object.values(r.contrib).reduce((a, b) => a + b, 0) || 1, n = r.members.size, share = (r.contrib[p.key] || 0) / tot;
    const extra = Math.min(0.85, 0.25 + 0.5 * Math.min(1.5, share * n) / 1.5);                          // más aporte → más opciones de un segundo objeto
    const drops = [[...rollPiece()]]; if (Math.random() < extra) drops.push(rollPiece()); if (Math.random() < 0.08) drops.push(rollPiece());
    const out = [];
    if (Math.random() < 0.04) { const bt = BOSS_ORDER[Math.random() < 0.4 ? 4 : rnd(0, 3)], pid = 'pet_' + bt; this.giveOrDrop(p, pid, 1); if (this.logDrop) this.logDrop(p, bt, pid); out.push({ id: pid, rare: true, set: BOSS_DEFS[bt].set }); }
    for (const [set, slot] of drops) { const id = this.raidGrant(p, set, slot); out.push({ id, rare: slot === 'weapon' || slot === 'cape' || set === 'rm' && slot === 'chest', set }); }
    const gold = 25000 + p.level * 120 + rnd(0, 8000); p.gold += gold;
    const phoenix = rnd(1, 2); this.giveOrDrop(p, 'pluma_fenix', phoenix);
    this.gainXp(p, 20000);
    p.ext.events = (p.ext.events || 0) + 1; p.dirty.inv = true;
    this.send(p, { t: 'raid_loot', items: out, gold, extra: [{ id: 'pluma_fenix', q: phoenix }] });
    this.fx.push({ k: 'rd_chest', x: r.chest.x, y: r.chest.y, rare: out.some((o) => o.rare) ? 1 : 0 });
    for (const o of out) if (o.rare) this.broadcastChat(`🌟 ¡${p.name} ha conseguido ${ITEMS[o.id].name} en el cofre de la Raid!`, 'k');
    if (this.sendCol) this.sendCol(p);
    if (this.checkAch) this.checkAch(p);
    if (r.opened.size >= members(this).filter((q) => r.contrib[q.key] > 0 || r.finalDmg[q.key]).length) r.endAt = Math.min(r.endAt, this.now + 25000);
  };

  /* ---------- eventos de combate ---------- */
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (m.raidRun && m.def.special === 'raid') {
      const r = this.raid, parts = [];
      for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl') { parts.push([pl, e.dmg]); if (r) r.contrib[pl.key] = (r.contrib[pl.key] || 0) + e.dmg; } }
      const real = m.def; m.def = Object.assign({}, real, { loot: [], gold: [0, 0] });
      try { K0.call(this, m, now); } finally { m.def = real; }
      if (!r || r.boss !== m) return;
      const def = BOSS_DEFS[m.type];
      this.fx.push({ k: 'rd_sh', x: m.x, y: m.y, ms: 0 });
      for (const q of this.monsters.filter((z) => z.raidRun && z.parent === m && !z.dead)) { q.hp = 0; q.dead = true; }
      r.cleared++; r.boss = null;
      if (def.final) {
        r.finalDmg = {}; for (const [pl, d] of parts) r.finalDmg[pl.key] = d;
        const R = ROOMS[5]; r.chest = { x: R.lair[0] - 6, y: R.cy }; r.phase = 'chest'; r.endAt = this.now + KEEP;
        this.broadcastChat('🏆 ¡La Raid ha derrotado a Malgathor, Segador del Vacío!', 'k');
        for (const q of members(this)) { this.msgC(q, '🎁 Un cofre de luz aparece en la cámara. Acércate y ábrelo (clic o tecla E).', '#ffd96a'); }
        this.fx.push({ k: 'rd_chest', x: r.chest.x, y: r.chest.y, rare: 0, appear: 1 });
        this.raidBossLoot(m, parts);
      } else {
        this.raidBossLoot(m, parts);
        r.phase = 'transition'; r.nextAt = this.now + 14000;
        for (const q of members(this)) this.msgC(q, `✅ ${def.name} ha caído. Siguiente cámara en 14 segundos.`, '#7dff9a');
      }
      return;
    }
    return K0.call(this, m, now);
  };
  const KP = P.killPlayer;
  P.killPlayer = function (p, src, srcName, now) {
    const r = this.raid, was = r && r.members.has(p.key) && inRaid(p);
    KP.call(this, p, src, srcName, now);
    if (was) {
      r.deaths[p.key] = (r.deaths[p.key] || 0) + 1;
      const left = MAX_DEATHS - r.deaths[p.key];
      this.msgC(p, left >= 0 ? `💀 Has caído en la Raid. Puedes volver con el portal (te quedan ${left} ${left === 1 ? 'vida' : 'vidas'}).` : '💀 Has agotado tus vidas en esta incursión.', '#ff7a7a');
      this.send(p, { t: 'raid', on: false });
    }
  };
  const RP = P.removePlayer;
  P.removePlayer = function (p) { RP.call(this, p); };
  const L0 = P.onLogin;
  P.onLogin = function (p) {
    L0.call(this, p);
    const rm = roomOf(p.x, p.y);
    if (rm > 0 && !(this.raid && this.raid.members.has(p.key))) { const H = ROOMS[0]; tp(p, H.start[0] + 3, H.cy); }
  };

  /* ---------- IA de los jefes ---------- */
  const near = (g, m, cx, cy, rad) => members(g, true).filter((q) => roomOf(q.x, q.y) === m.rIdx && Math.hypot(q.x - cx, q.y - cy) <= rad);
  P.raidAI = function (m, now) {
    const r = this.raid; if (!r || r.boss !== m || m.dead) return;
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1; m.lpx = m.x;
    const def = BOSS_DEFS[m.type], R = ROOMS[m.rIdx];
    const frac = m.hp / m.maxHp, enr = frac < 0.35;
    if (m.shieldUntil > now && now < r.startedAt + 9000) return;
    if (now < (m.nextSp || 0)) return;
    const tg = near(this, m, m.x, m.y, 40); if (!tg.length) return;
    const atk = def.seq[(m.spN || 0) % def.seq.length]; m.spN = (m.spN || 0) + 1;
    m.nextSp = now + (enr ? 3600 : 5200) + Math.random() * 1500;
    m.nextMove = Math.max(m.nextMove, now + 900); m.nextAtk = Math.max(m.nextAtk, now + 900);
    const alive = () => !m.dead && r.boss === m && this.raid === r;
    const enrK = enr ? 1.25 : 1, dmgOf = (a) => Math.round(rnd(a[0], a[1]) * enrK);
    const th = def.th;
    const spotsAtPlayers = (n) => { const out = []; for (let i = 0; i < n; i++) { const q = tg[i % tg.length]; out.push(i < tg.length ? [q.x, q.y] : [q.x + rnd(-3, 3), q.y + rnd(-3, 3)]); } return out; };
    const inRoomRand = () => [rnd(R.x0 + 4, R.x1 - 3), rnd(R.y0 + 3, R.y1 - 3)];
    const hitCircles = (spots, rad, dm, warn, tag) => {
      for (const [x, y] of spots) this.fx.push({ k: 'rd_w', x, y, r: rad, ms: warn, th });
      this.later(warn, () => {
        if (!alive()) return;
        for (const [x, y] of spots) {
          this.fx.push({ k: 'rd_h', x, y, r: rad, th });
          for (const q of near(this, m, x, y, rad)) this.hurtPlayer(q, dmgOf(dm), m, this.now, tag || def.name);
        }
      });
    };
    switch (atk.k) {
      case 'c': hitCircles(spotsAtPlayers(Math.min(atk.n, 4 + tg.length * 2)), atk.r, atk.dmg, atk.warn, 'Impacto'); break;
      case 'r': { const sp = []; for (let i = 0; i < atk.n; i++) sp.push(i < tg.length && i % 3 === 0 ? [tg[i % tg.length].x, tg[i % tg.length].y] : inRoomRand()); hitCircles(sp, atk.r, atk.dmg, atk.warn, 'Lluvia'); break; }
      case 's': { const x = m.x, y = m.y; this.fx.push({ k: 'rd_w', x, y, r: atk.r, ms: atk.warn, th, big: 1 });
        this.later(atk.warn, () => { if (!alive()) return; this.fx.push({ k: 'rd_h', x, y, r: atk.r, th, big: 1 }); for (const q of near(this, m, x, y, atk.r)) this.hurtPlayer(q, dmgOf(atk.dmg), m, this.now, 'Golpe devastador'); }); break; }
      case 'l': {
        const lines = atk.multi || 1, t0 = Math.atan2(tg[0].y - m.y, tg[0].x - m.x);
        for (let li = 0; li < lines; li++) {
          const q = tg[li % tg.length], a = lines > 1 && li >= tg.length ? t0 + (li - tg.length + 1) * 0.5 : Math.atan2(q.y - m.y, q.x - m.x);
          const x1 = m.x, y1 = m.y, x2 = x1 + Math.cos(a) * atk.len, y2 = y1 + Math.sin(a) * atk.len;
          this.fx.push({ k: 'rd_lw', x: x1, y: y1, x2, y2, w: atk.w, ms: atk.warn, th });
          this.later(atk.warn, () => {
            if (!alive()) return; this.fx.push({ k: 'rd_l', x: x1, y: y1, x2, y2, w: atk.w, th });
            const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
            for (const z of near(this, m, x1, y1, atk.len + 3)) { const u = Math.max(0, Math.min(1, ((z.x - x1) * dx + (z.y - y1) * dy) / L2)); if (Math.hypot(z.x - (x1 + dx * u), z.y - (y1 + dy * u)) <= atk.w) this.hurtPlayer(z, dmgOf(atk.dmg), m, this.now, 'Rayo'); }
          });
        }
        break; }
      case 'p': {                                                     // charcos que dañan cada segundo
        const spots = spotsAtPlayers(atk.n);
        for (const [x, y] of spots) this.fx.push({ k: 'rd_w', x, y, r: atk.r, ms: 1100, th });
        this.later(1100, () => {
          if (!alive()) return;
          for (const [x, y] of spots) {
            this.fx.push({ k: 'rd_pool', x, y, r: atk.r, ms: atk.life * 1000, th });
            for (let i = 1; i <= atk.life; i++) this.later(1000 * i, () => { if (!alive()) return; for (const q of near(this, m, x, y, atk.r)) this.hurtPlayer(q, dmgOf(atk.dmg), m, this.now, 'Charco'); });
          }
        });
        break; }
      case 'u': {                                                     // invoca esbirros
        const kids = this.monsters.filter((q) => q.parent === m && !q.dead).length, room = 9 - kids; if (room <= 0) break;
        const n = Math.min(room, atk.n + Math.floor(tg.length / 3)), spots = [];
        for (let i = 0; i < n * 8 && spots.length < n; i++) { const x = Math.round(m.x + (Math.random() - 0.5) * 12), y = Math.round(m.y + (Math.random() - 0.5) * 10); if (world.isWalkable(x, y) && !this.mgrid.has(y * world.W + x) && !this.pgrid.has(y * world.W + x) && !spots.some((s) => s[0] === x && s[1] === y)) spots.push([x, y]); }
        for (const [x, y] of spots) this.fx.push({ k: 'rd_w', x, y, r: 1, ms: 900, th });
        this.later(900, () => {
          if (!alive()) return;
          for (const [x, y] of spots) { if (this.mgrid.has(y * world.W + x)) continue; const c = this.spawnMonster(atk.t, x, y); c.noRespawn = true; c.respawnAt = Infinity; c.parent = m; c.raidRun = true; c.rIdx = m.rIdx; c.diesAt = this.now + 50000; c.target = tg[rnd(0, tg.length - 1)].id; this.fx.push({ k: 'rd_h', x, y, r: 1.2, th }); }
        });
        break; }
      case 'h': {                                                     // escudo: inmune unos segundos
        m.shieldUntil = now + atk.ms; this.fx.push({ k: 'rd_sh', x: m.x, y: m.y, ms: atk.ms });
        this.later(atk.ms, () => { if (alive()) { m.shieldUntil = 0; this.fx.push({ k: 'rd_sh', x: m.x, y: m.y, ms: 0 }); } });
        this.fx.push({ k: 'rd_w', x: m.x, y: m.y, r: 5, ms: atk.ms, th, big: 1 });
        break; }
      case 'v': {                                                     // singularidad: atrae a todos y estalla
        const x = m.x, y = m.y; this.fx.push({ k: 'rd_pull', x, y, r: atk.r, ms: 1800, th });
        for (let i = 1; i <= 3; i++) this.later(500 * i, () => { if (!alive()) return; for (const q of near(this, m, x, y, atk.r)) { const dx = Math.sign(x - q.x), dy = Math.sign(y - q.y); for (let s = 0; s < atk.pull / 3 + 1; s++) { const nx = q.x + dx, ny = q.y + dy; if (world.isWalkable(nx, ny) && !this.pgrid.has(ny * world.W + nx) && !this.mgrid.has(ny * world.W + nx) && Math.hypot(nx - x, ny - y) > 1.5) { q.x = nx; q.y = ny; } } q.tpSeq++; q.target = null; } });
        this.later(1800, () => { if (!alive()) return; this.fx.push({ k: 'rd_h', x, y, r: 5, th, big: 1 }); for (const q of near(this, m, x, y, 5)) this.hurtPlayer(q, dmgOf([1100, 1500]), m, this.now, 'Singularidad'); });
        break; }
      default: break;
    }
  };

  /* ---------- bucle y vista ---------- */
  const T0 = P.tickExt;
  P.tickExt = function (now) {
    T0.call(this, now);
    const r = this.raid; if (!r) return;
    if (this.tickN % 20 !== 0) return;
    // limpieza de esbirros
    for (const q of this.monsters.filter((z) => z.raidRun && z.parent && (z.dead || z.parent.dead || !this.raid || (z.diesAt && now >= z.diesAt)))) { this.raidRemoveMonster(q); }
    const alive = members(this, true);
    if (r.phase === 'fight' || r.phase === 'transition') {
      if (!alive.length && now > r.startedAt + 4000) { this.raidWipe(); return; }
      if (r.phase === 'transition' && now >= r.nextAt) { this.raidEnterRoom(r.room + 1); return; }
    }
    if (r.phase === 'chest' && now >= r.endAt) { this.raidFinish(); return; }
    for (const q of members(this)) if (inRaid(q)) this.raidSend(q);
    for (const q of this.players.values()) if (!r.members.has(q.key) && roomOf(q.x, q.y) === 0) this.raidSend(q);
  };
  P.raidSend = function (p) {
    const r = this.raid, rm = roomOf(p.x, p.y); if (rm < 0) return;
    const inRun = !!(r && r.members.has(p.key));
    const b = r && r.boss, msg = { t: 'raid', on: true, hall: rm === 0, room: r ? r.room : 0, run: !!r, mine: inRun, phase: r ? r.phase : 'idle',
      n: r ? r.members.size : 0, lives: r ? Math.max(0, MAX_DEATHS - (r.deaths[p.key] || 0)) : MAX_DEATHS, boss: b ? { id: b.id, n: b.def.name, h: Math.max(0, b.hp), m: b.maxHp, sh: b.shieldUntil > this.now ? 1 : 0 } : null,
      cd: r && r.phase === 'transition' ? Math.max(0, Math.ceil((r.nextAt - this.now) / 1000)) : r && r.phase === 'chest' ? Math.max(0, Math.ceil((r.endAt - this.now) / 1000)) : 0,
      chest: r && r.chest ? { x: r.chest.x, y: r.chest.y, open: r.opened.has(p.key) ? 1 : 0, can: (r.contrib[p.key] > 0 || (r.finalDmg && r.finalDmg[p.key])) ? 1 : 0 } : null,
      team: r ? members(this).map((q) => ({ n: q.name, h: Math.max(0, q.hp), m: q.maxHp || q.hp, d: q.hp <= 0 || !inRaid(q) ? 1 : 0 })) : [] };
    this.send(p, msg);
  };

  /* ---------- órdenes ---------- */
  const C0 = P.chatExt;
  P.chatExt = function (p, text) {
    const m = /^\/raid(?:\s+(\S+))?/i.exec(text);
    if (m) {
      const a = (m[1] || '').toLowerCase();
      if (a === 'salir') this.raidLeave(p); else if (a === 'estado') this.raidSend(p); else this.raidGo(p);
      return true;
    }
    return C0.call(this, p, text);
  };
  const H0 = P.handleExt;
  P.handleExt = function (p, msg) {
    switch (msg.t) {
      case 'raid_go': this.raidGo(p); return;
      case 'raid_leave': this.raidLeave(p); return;
      case 'raid_open': this.raidOpenChest(p); return;
      case 'raid_info': this.raidSend(p); return;
      default: break;
    }
    return H0.call(this, p, msg);
  };
} };
