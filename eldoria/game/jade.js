'use strict';
/** Set del Hidra de Jade (arquero): botín raro de la Hidra de Jade. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['jade_yelmo',    'Yelmo de Jade',        'j_helm',  'head',   70, 42, { hp: 260, crit: 0.03 }, 0.06],
  ['jade_coraza',   'Coraza de Escamas de Jade', 'j_chest', 'body', 74, 58, { hp: 400, atk: 9 }, 0.04],
  ['jade_guantes',  'Guanteletes de Jade',  'j_glove', 'gloves', 72, 18, { hp: 100, atk: 8, crit: 0.02 }, 0.06],
  ['jade_botas',    'Botas de Jade',        'j_boot',  'boots',  71, 22, { hp: 140 }, 0.06],
];
const BOW = ['jade_arco', 'Arco de la Hidra', 'j_bow', 76, 128, 1150, 'poison', 0.04];
const ICON = { head: '🐲', body: '🛡️', gloves: '🧤', boots: '🥾' };

function build(ITEMS, MONSTERS, bossType) {
  for (const [id, name, spr, type, L, def, bonus] of PIECES) {
    ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, jade: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 4 };
  }
  { const [id, name, spr, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style: 'ranged', atk, cd, range: 8, el, jade: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 6 }; }
  const boss = MONSTERS[bossType];
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([BOW[0], BOW[7], 1, 1]);
}
module.exports = { build, PIECES, BOW };
