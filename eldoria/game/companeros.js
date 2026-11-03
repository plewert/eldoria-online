'use strict';
/**
 * Compañeros: pasivas pequeñas para mascotas y monturas, y monturas nuevas.
 *  - Solo cuenta la mascota activa y la montura activa (una de cada), así que no se acumulan.
 *  - Pasiva = { atk, def, hp, mana, crit, steal }; se suma al bonus del equipo (el tope de crítico y robo de vida sigue aplicando).
 *  - Cada cría de jefe recibe una pasiva fija según su tipo y su nivel; las mascotas de tienda/pesca, una más pequeña.
 */
const KINDS = ['atk', 'def', 'hp', 'mana', 'crit', 'steal'];
const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/** Valor de una pasiva según el nivel (los jefes débiles dan menos). */
function value(kind, lv) {
  switch (kind) {
    case 'atk': return clampN(1 + Math.floor(lv / 150), 1, 6);
    case 'def': return clampN(1 + Math.floor(lv / 150), 1, 6);
    case 'hp': return clampN(20 + Math.floor(lv / 5), 20, 200);
    case 'mana': return clampN(15 + Math.floor(lv / 6), 15, 160);
    case 'crit': return +clampN(0.004 + lv / 40000, 0.004, 0.025).toFixed(4);
    default: return +clampN(0.003 + lv / 60000, 0.003, 0.015).toFixed(4);     // steal
  }
}
const TXT = { atk: (v) => `+${v} de ataque`, def: (v) => `+${v} de defensa`, hp: (v) => `+${v} de vida`, mana: (v) => `+${v} de maná`,
  crit: (v) => `+${(v * 100).toFixed(1).replace('.0', '')} % de crítico`, steal: (v) => `+${(v * 100).toFixed(1).replace('.0', '')} % de robo de vida` };
const text = (pas) => Object.entries(pas).map(([k, v]) => TXT[k](v)).join(', ');

function give(d, pas) { d.pas = pas; d.desc = `${(d.desc || '').replace(/ Pasiva:.*$/, '')} Pasiva: ${text(pas)}.`; }

const MOUNTS = {
  montura_jabali: { name: 'Jabalí de Guerra', icon: '🐗', type: 'mount', mon: 'jabali', scale: 0.95, speed: 0.66, minLevel: 30, price: 60000, sell: 15000, desc: 'Cabalgas un 34% más rápido.' },
  montura_mamut: { name: 'Mamut de Guerra', icon: '🦣', type: 'mount', mon: 'mamut', scale: 0.8, speed: 0.62, minLevel: 60, price: 400000, sell: 100000, desc: 'Cabalgas un 38% más rápido.' },
  montura_brasas: { name: 'Bestia de Brasas', icon: '🔥', type: 'mount', mon: 'demonio_cornudo', scale: 0.75, speed: 0.5, minLevel: 100, sell: 2000000, desc: 'Cabalgas el doble de rápido. Solo la suelta Hades, muy rara vez.' },
};
const MOUNT_PAS = { montura_lobo: { hp: 30 }, montura_oso: { def: 3 }, montura_dragon: { atk: 3 }, montura_jabali: { def: 4 }, montura_mamut: { hp: 120 }, montura_brasas: { atk: 5, def: 4, hp: 100 } };
const BRASAS_DROP = 0.0008;

function build(ITEMS, MONSTERS, SHOPS) {
  for (const [id, d] of Object.entries(MOUNTS)) ITEMS[id] = d;
  SHOPS.brisa.push('montura_jabali', 'montura_mamut');
  if (MONSTERS.hades) MONSTERS.hades.loot.push(['montura_brasas', BRASAS_DROP, 1, 1]);
  for (const [id, pas] of Object.entries(MOUNT_PAS)) if (ITEMS[id]) give(ITEMS[id], pas);
  for (const [id, d] of Object.entries(ITEMS)) {
    if (d.type !== 'pet') continue;
    const mon = MONSTERS[d.mon], boss = id.startsWith('pet_') && mon && mon.boss;
    const lv = boss ? mon.lv || 20 : 40;
    const kind = KINDS[hash(id) % KINDS.length];
    give(d, { [kind]: value(kind, lv) });
  }
}

/** Suma las pasivas de la mascota y la montura activas a un bonus de equipo. */
function apply(gb, ITEMS, ext) {
  if (!ext) return gb;
  for (const id of [ext.pet, ext.mount]) {
    const pas = id && ITEMS[id] && ITEMS[id].pas;
    if (pas) for (const k of Object.keys(pas)) gb[k] = (gb[k] || 0) + pas[k];
  }
  if (gb.crit > 0.10) gb.crit = 0.10;
  if (gb.steal > 0.15) gb.steal = 0.15;
  if (gb.aspd > 0.15) gb.aspd = 0.15;
  if (gb.cdr > 0.20) gb.cdr = 0.20;
  return gb;
}
module.exports = { build, apply, value, text, MOUNTS, BRASAS_DROP };
