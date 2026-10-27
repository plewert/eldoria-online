'use strict';
/** Set del Hidra de Jade (arquero): botín raro de la Hidra de Jade. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['jade_yelmo',    'Yelmo de Jade',        'j_helm',  'head',   70, 42, { hp: 260, crit: 0.03 }, 0.06],
  ['jade_coraza',   'Coraza de Escamas de Jade', 'j_chest', 'body', 74, 58, { hp: 400, atk: 9 }, 0.04],
  ['jade_guantes',  'Guanteletes de Jade',  'j_glove', 'gloves', 72, 18, { hp: 100, atk: 8, crit: 0.02 }, 0.06],
  ['jade_pantalon', 'Pantalón de Escamas de Dragón', 'j_leg', 'legs', 73, 30, { hp: 220, atk: 5 }, 0.05],
  ['jade_carcaj',   'Carcaj de Escamas de Jade', 'j_quiver', 'shield', 72, 26, { hp: 150, atk: 6, crit: 0.02 }, 0.05],
  ['jade_botas',    'Botas de Jade',        'j_boot',  'boots',  71, 22, { hp: 140 }, 0.06],
];
// joyas y cinturón: [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad]
const JEWELS = [
  ['jade_anillo_rubi',  'Anillo del Rubí Dracónico', 'j_ring_r', 'ring', 72, 0, { atk: 10, hp: 120, crit: 0.02 }, 0.05],
  ['jade_anillo_hoja',  'Anillo de Hoja de Jade',    'j_ring_g', 'ring', 70, 0, { def: 10, hp: 160 }, 0.05],
  ['jade_cinturon',     'Cinturón de Escamas de Jade', 'j_belt', 'belt', 71, 16, { hp: 180, atk: 5 }, 0.05],
  ['jade_amuleto',      'Amuleto del Dragón de Jade', 'j_amulet', 'amulet', 74, 0, { hp: 350, mana: 100, atk: 8, crit: 0.03 }, 0.04],
];
const BOW = ['jade_arco', 'Arco de la Hidra', 'j_bow', 76, 128, 1150, 'poison', 0.01];
const ICON = { head: '🐲', body: '🛡️', gloves: '🧤', boots: '🥾', legs: '👖', shield: '🏹' };

function build(ITEMS, MONSTERS, bossType) {
  for (const [id, name, spr, type, L, def, bonus] of PIECES) {
    ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, jade: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 4 };
  }
  { const [id, name, spr, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style: 'ranged', atk, cd, range: 8, el, jade: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 6 }; }
  for (const [id, name, spr, type, L, def, bonus] of JEWELS) ITEMS[id] = Object.assign({ name, icon: type === 'ring' ? '💍' : type === 'belt' ? '🎗️' : '📿', spr, type, bonus, jade: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 4 }, def ? { def } : {});
  const boss = MONSTERS[bossType];
  for (const j of JEWELS) boss.loot.push([j[0], j[7], 1, 1]);
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([BOW[0], BOW[7], 1, 1]);
}
module.exports = { build, PIECES, JEWELS, BOW };
