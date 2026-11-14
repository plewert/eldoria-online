'use strict';
/** Set del Leviatán Abisal (cuerpo a cuerpo, agua): botín raro. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['mar_yelmo',    'Yelmo del Abismo Marino',      'l_helm',  'head',   85, 54, { hp: 320, atk: 5, crit: 0.03 }, 0.06],
  ['mar_coraza',   'Coraza del Leviatán',          'l_chest', 'body',   88, 72, { hp: 500, atk: 13 }, 0.04],
  ['mar_guantes',  'Manoplas de Escama Abisal',    'l_glove', 'gloves', 86, 24, { hp: 130, atk: 11, crit: 0.02 }, 0.06],
  ['mar_grebas',   'Grebas de Escama Abisal',      'l_leg',   'legs',   87, 36, { hp: 270, atk: 8 }, 0.05],
  ['mar_botas',    'Botas de las Mareas',          'l_boot',  'boots',  85, 28, { hp: 170, atk: 5 }, 0.06],
  ['mar_cinto',    'Cinto de Concha Profunda',     'l_belt',  'belt',   86, 22, { hp: 240, atk: 8 }, 0.05],
];
const JEWELS = [
  ['mar_anillo_perla',  'Anillo de la Perla Marina',   'l_ring1',  'ring',   84, { atk: 12, hp: 150, crit: 0.02 }, 0.05],
  ['mar_anillo_alga',   'Anillo de Alga Esmeralda',    'l_ring2',  'ring',   84, { hp: 260, mana: 90, atk: 7 }, 0.05],
  ['mar_anillo_coral',  'Anillo de Coral Rojo',        'l_ring3',  'ring',   84, { atk: 10, hp: 180, crit: 0.03 }, 0.05],
  ['mar_amuleto',       'Amuleto del Corazón Marino',  'l_amulet', 'amulet', 88, { hp: 420, mana: 130, atk: 10, crit: 0.03 }, 0.04],
];
const TRIDENT = ['mar_tridente', 'Tridente del Leviatán', 'l_trident', 'melee', 88, 180, 1150, 'water', 0.01];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', belt: '🎗️', ring: '💍', amulet: '📿' };
function build(ITEMS, MONSTERS, bossType) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, mar: 1, minLevel: L, sell: sell(L, 4) };
  for (const [id, name, spr, type, L, bonus] of JEWELS) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, mar: 1, minLevel: L, sell: sell(L, 4) };
  { const [id, name, spr, style, L, atk, cd, el] = TRIDENT; ITEMS[id] = { name, icon: '🔱', spr, type: 'weapon', style, atk, cd, range: 1, el, mar: 1, minLevel: L, sell: sell(L, 6) }; }
  const boss = MONSTERS[bossType];
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  for (const j of JEWELS) boss.loot.push([j[0], j[6], 1, 1]);
  boss.loot.push([TRIDENT[0], TRIDENT[8], 1, 1]);
}
module.exports = { build, PIECES, JEWELS, TRIDENT };
