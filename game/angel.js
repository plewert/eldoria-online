'use strict';
/** Set Celestial del Arcángel del Santuario: botín raro. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['angel_yelmo',    'Yelmo Celestial',            'a_helm',  'head',   75, 46, { hp: 280, mana: 80, crit: 0.03 }, 0.06],
  ['angel_coraza',   'Coraza de Luz Divina',       'a_chest', 'body',   78, 62, { hp: 420, atk: 10 }, 0.04],
  ['angel_guantes',  'Guanteletes Celestiales',    'a_glove', 'gloves', 76, 20, { hp: 110, atk: 9, crit: 0.02 }, 0.06],
  ['angel_pantalon', 'Pantalón Divino de Luz',     'a_leg',   'legs',   77, 32, { hp: 240, atk: 6 }, 0.05],
  ['angel_botas',    'Botas Aladas Celestiales',  'a_boot',  'boots',  76, 24, { hp: 150, atk: 3 }, 0.06],
  ['angel_carcaj',   'Carcaj de Plumas Celestiales','a_quiver','shield', 76, 28, { hp: 160, atk: 7, crit: 0.02 }, 0.05],
];
const JEWELS = [
  ['angel_anillo',   'Anillo de la Gracia Celestial', 'a_ring',   'ring',   76, 0,  { atk: 11, hp: 140, crit: 0.02 }, 0.05],
  ['angel_cinturon', 'Cinturón de Plumaje Divino',    'a_belt',   'belt',   75, 18, { hp: 200, atk: 6 }, 0.05],
  ['angel_amuleto',  'Amuleto de la Gracia Celestial','a_amulet', 'amulet', 78, 0,  { hp: 380, mana: 120, atk: 9, crit: 0.03 }, 0.04],
];
const STAFF = ['angel_cetro', 'Báculo Alado del Arcángel', 'a_staff', 80, 140, 1100, 0.01];
const BOW = ['angel_arco', 'Arco Arcangélico', 'a_bow', 80, 150, 1100, 'sun', 0.01];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', shield: '🏹' };
function build(ITEMS, MONSTERS, bossType) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, angel: 1, minLevel: L, sell: sell(L, 4) };
  for (const [id, name, spr, type, L, def, bonus] of JEWELS) ITEMS[id] = Object.assign({ name, icon: type === 'ring' ? '💍' : type === 'belt' ? '🎗️' : '📿', spr, type, bonus, angel: 1, minLevel: L, sell: sell(L, 4) }, def ? { def } : {});
  { const [id, name, spr, L, atk, cd] = STAFF; ITEMS[id] = { name, icon: '🪄', spr, type: 'weapon', style: 'magic', atk, cd, range: 8, mana: 14, el: 'sun', angel: 1, minLevel: L, sell: sell(L, 6) }; }
  { const [id, name, spr, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style: 'ranged', atk, cd, range: 8, el, angel: 1, minLevel: L, sell: sell(L, 6) }; }
  const boss = MONSTERS[bossType];
  for (const j of JEWELS) boss.loot.push([j[0], j[7], 1, 1]);
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([STAFF[0], STAFF[6], 1, 1]);
  boss.loot.push([BOW[0], BOW[7], 1, 1]);
}
module.exports = { build, PIECES, JEWELS, STAFF, BOW };
