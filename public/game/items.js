'use strict';
/**
 * Instancias de objetos: rareza (+N / Ancient), ranuras con gemas, bonus de gemas,
 * nombres, empaquetado para el cliente y tablas de botín.
 *
 *  - Objeto normal / consumible / trofeo / gema: { id, qty }
 *  - Equipo (arma, casco, armadura, escudo):     { id, qty:1, up:0..6, an:0|1, gm:[gemaId|null, ...] }
 */
const { ITEMS, GEMS, CFG, RAR } = require('./data');

const CORE = ['weapon', 'head', 'body', 'shield'];
const SLOTS = [...CORE, 'amulet', 'ring1', 'ring2', 'belt', 'gloves', 'legs', 'boots'];
const GEAR_TYPES = new Set([...CORE, 'amulet', 'ring', 'belt', 'gloves', 'legs', 'boots']);
/** ¿Un objeto de este tipo cabe en esa casilla? (los anillos van en cualquiera de las dos) */
const fits = (slot, type) => slot === type || (type === 'ring' && (slot === 'ring1' || slot === 'ring2'));
/** Casilla donde se equipa un objeto (anillo: la primera libre, si no la primera). */
const slotFor = (type, eq) => (type === 'ring' ? (!eq.ring1 ? 'ring1' : !eq.ring2 ? 'ring2' : 'ring1') : type);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const isGear = (id) => !!ITEMS[id] && GEAR_TYPES.has(ITEMS[id].type);
const isGem = (id) => !!ITEMS[id] && ITEMS[id].type === 'gem';
const clone = (it) => (it ? Object.assign({}, it, it.gm ? { gm: it.gm.slice() } : {}) : null);

/** Crea un objeto. Para equipo: props = { up, an, ns } */
function mk(id, qty = 1, props) {
  const d = ITEMS[id];
  if (!d) return null;
  if (!GEAR_TYPES.has(d.type)) return { id, qty: Math.max(1, qty | 0) };
  const ns = clamp((props && props.ns) | 0, 0, CFG.MAX_SOCKETS);
  return { id, qty: 1, up: clamp((props && props.up) | 0, 0, 6), an: props && props.an ? 1 : 0, gm: new Array(ns).fill(null) };
}

/** Valida un objeto leído del disco (acepta el formato antiguo: solo el id como texto). */
function normalize(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') return mk(raw);
  if (!raw.id || !ITEMS[raw.id]) return null;
  if (!isGear(raw.id)) return { id: raw.id, qty: Math.max(1, raw.qty | 0) };
  const gm = Array.isArray(raw.gm) ? raw.gm.slice(0, CFG.MAX_SOCKETS).map((g) => (g && isGem(g) ? g : null)) : [];
  return { id: raw.id, qty: 1, up: clamp(raw.up | 0, 0, 6), an: raw.an ? 1 : 0, gm };
}

/* ---------------------------- estadísticas ---------------------------- */
const mult = (it) => (1 + CFG.UP_STAT * (it.up || 0)) * (it.an ? CFG.ANC_MULT : 1);

/** Ataque (armas) o defensa (resto) del objeto, sin contar las gemas. */
function baseStat(it) {
  const d = ITEMS[it.id];
  if (d.type === 'weapon') return Math.round(d.atk * mult(it));
  if (d.type === 'ring' || d.type === 'amulet') return 0;
  return Math.round(d.def * mult(it)) + (it.up > 0 ? Math.ceil(it.up / 2) : 0);
}

/** Bonus propio de anillos y amuletos (escala con +N y Ancient, salvo crítico y robo de vida). */
function bonusOf(it) {
  const b = it && ITEMS[it.id] && ITEMS[it.id].bonus;
  if (!b) return null;
  const m = mult(it), out = {};
  for (const k of Object.keys(b)) out[k] = k === 'crit' || k === 'steal' ? b[k] : Math.round(b[k] * m);
  return out;
}

function emptyFx() { return { atk: 0, hp: 0, mana: 0, def: 0, crit: 0, steal: 0, glow: 0 }; }

function addGemFx(out, it) {
  if (!it || !it.gm) return out;
  for (const g of it.gm) {
    const fx = g && GEMS[g] && GEMS[g].fx;
    if (fx) for (const k of Object.keys(fx)) out[k] += fx[k];
  }
  return out;
}

/** Suma de los efectos de todas las gemas del equipo puesto. */
function gearBonus(eq) {
  const out = emptyFx();
  for (const s of SLOTS) {
    addGemFx(out, eq[s]);
    const b = bonusOf(eq[s]);
    if (b) for (const k of Object.keys(b)) out[k] += b[k];
  }
  return out;
}

/** Brillo del set: diamantes + piezas Ancient + set completo mejorado. */
function visOf(eq) {
  let glow = 0, an = 0, all = true, minUp = 99;
  for (const s of SLOTS) {
    const it = eq[s], core = CORE.includes(s);
    if (!it) { if (core) all = false; continue; }
    if (it.an) an++;
    if (core) minUp = Math.min(minUp, it.up || 0);
    for (const g of it.gm || []) if (g === 'diamante') glow++;
  }
  glow += an;
  if (all && (minUp >= 1 || CORE.every((s) => eq[s] && eq[s].an))) glow += 2;       // set completo mejorado
  return { g: Math.min(12, glow), an };
}

/* ------------------------------ nombres ------------------------------ */
function nameOf(it) {
  const d = ITEMS[it.id];
  if (!isGear(it.id)) return d.name;
  return (it.an ? 'Ancient ' : '') + d.name + (it.up > 0 ? ' +' + it.up : '');
}
function rarityOf(it) {
  if (!isGear(it.id)) return 'none';
  return it.an ? 'ancient' : it.up > 0 ? 'plus' : 'normal';
}
function colorOf(it) {
  if (isGem(it.id)) return ITEMS[it.id].col;
  return RAR[rarityOf(it)];
}
function sellValue(it) {
  const d = ITEMS[it.id];
  if (!d || !d.sell) return 0;
  if (!isGear(it.id)) return d.sell;
  return Math.round(d.sell * (1 + 0.35 * (it.up || 0)) * (it.an ? 6 : 1));
}

/** Formato compacto para el cliente. */
function pack(it) {
  if (!it) return null;
  if (!isGear(it.id)) return [it.id, it.qty];
  const out = [it.id, 1, it.up || 0, it.an ? 1 : 0, it.gm.length, it.gm.slice(), baseStat(it)];
  const b = bonusOf(it);
  if (b) out.push(b);
  return out;
}

/** ¿Son idénticos (para comprobar ofertas de comercio)? */
function same(a, b) {
  if (!a || !b || a.id !== b.id) return false;
  if (!isGear(a.id)) return true;
  return (a.up || 0) === (b.up || 0) && !!a.an === !!b.an && JSON.stringify(a.gm) === JSON.stringify(b.gm);
}

/* ---------------- colocar objetos en una mochila (o banco) ---------------- */
/** Mete `it` en el arreglo `arr` (null = hueco). Devuelve cuántas unidades NO cupieron. */
function putInto(arr, it) {
  let qty = it.qty;
  if (!isGear(it.id) && ITEMS[it.id].stack) {
    for (const s of arr) {
      if (qty <= 0) break;
      if (s && s.id === it.id && s.qty < CFG.STACK_MAX) {
        const add = Math.min(qty, CFG.STACK_MAX - s.qty);
        s.qty += add; qty -= add;
      }
    }
    while (qty > 0) {
      const i = arr.indexOf(null);
      if (i < 0) break;
      const add = Math.min(qty, CFG.STACK_MAX);
      arr[i] = { id: it.id, qty: add }; qty -= add;
    }
    return qty;
  }
  while (qty > 0) {
    const i = arr.indexOf(null);
    if (i < 0) break;
    arr[i] = isGear(it.id) ? clone(it) : { id: it.id, qty: 1 };
    qty--;
  }
  return qty;
}

/* ------------------------------- botín ------------------------------- */
/** Convierte un equipo del botín en una instancia con su propia suerte (+N, Ancient, ranuras). */
function rollGear(id, boss) {
  const an = Math.random() < CFG.ANCIENT_CHANCE * (boss ? CFG.BOSS_RARE_MULT : 1) ? 1 : 0;
  let up = 0;
  if (an) up = rnd(0, 3);
  else if (Math.random() < CFG.PLUS_CHANCE * (boss ? 1.8 : 1)) {
    const r = Math.random();
    up = r < 0.5 ? 1 : r < 0.75 ? 2 : r < 0.87 ? 3 : r < 0.94 ? 4 : r < 0.98 ? 5 : 6;
  }
  let ns;
  if (an) ns = rnd(2, 3);
  else if (up >= 4) ns = rnd(1, 3);
  else if (up > 0) ns = rnd(0, 2);
  else ns = Math.random() < 0.1 ? 1 : 0;
  return mk(id, 1, { up, an, ns });
}

const gemChance = () => CFG.GEM_CHANCE;      // 0,15 % por muerte (monstruos y jefes)

function pickGem(def) {
  const w = { rubi: 10, zafiro: 10, esmeralda: 10, topacio: 10 };
  if (def.exp >= 100) w.amatista = 4;
  if (def.exp >= 300) { w.diamante = 3; w.opalo = 1.5; }
  if (def.boss) { w.diamante = 6; w.opalo = 3; w.amatista = 8; }
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (const [g, v] of Object.entries(w)) { if ((r -= v) < 0) return g; }
  return 'rubi';
}

/** Información del botín de un monstruo para el panel de "ver drops". */
function dropInfo(def) {
  const loot = def.loot.map(([id, ch, a, b]) => [id, ch, a, b, isGear(id) ? 1 : 0]);
  let none = 1;
  for (const [, ch, , , g] of loot) if (g) none *= 1 - ch;
  const gearAny = 1 - none;
  const mulA = def.boss ? CFG.BOSS_RARE_MULT : 1;
  return {
    loot, gold: def.gold,
    gem: gemChance(def),
    plus: gearAny * Math.min(1, CFG.PLUS_CHANCE * (def.boss ? 1.8 : 1)),
    anc: gearAny * CFG.ANCIENT_CHANCE * mulA,
  };
}

module.exports = {
  CORE, fits, slotFor, bonusOf,
  SLOTS, isGear, isGem, clone, mk, normalize, baseStat, gearBonus, visOf, nameOf, rarityOf, colorOf,
  sellValue, pack, same, putInto, rollGear, gemChance, pickGem, dropInfo, rnd,
};
