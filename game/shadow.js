'use strict';
/** Set de las Sombras: botín raro del Dragón de las Sombras. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['sombra_capucha', 'Capucha de las Sombras',   's_hood',     'head',   62, 38, { hp: 230, crit: 0.02 }, 0.06],
  ['sombra_coraza',  'Coraza de las Sombras',    's_chest',    'body',   66, 52, { hp: 350, atk: 8 }, 0.04],
  ['sombra_guantes', 'Guanteletes de las Sombras', 's_gauntlet', 'gloves', 64, 16, { hp: 90, atk: 7, crit: 0.01 }, 0.06],
  ['sombra_pantalon', 'Pantalón de Asesino de Sombras', 's_leg', 'legs', 64, 28, { hp: 200, crit: 0.02 }, 0.05],
  ['sombra_cinturon', 'Cinturón de las Sombras', 's_belt', 'belt', 63, 14, { hp: 160, mana: 60, crit: 0.01 }, 0.05],
  ['sombra_botas',   'Botas de las Sombras',     's_boot',     'boots',  63, 20, { hp: 120 }, 0.06],
  ['sombra_carcaj',  'Carcaj de las Sombras',    's_quiver',   'shield', 65, 24, { hp: 140, crit: 0.02 }, 0.05],
];
// joyas: [id, nombre, sprite, tipo, nivel, bonus, probabilidad]
const JEWELS = [
  ['sombra_anillo_umbrio',   'Anillo Umbrío',            's_ring_a', 'ring',   60, { def: 12, hp: 120 }, 0.05],
  ['sombra_anillo_noche',    'Anillo de la Noche Estrellada', 's_ring_s', 'ring', 62, { atk: 10, crit: 0.03 }, 0.05],
  ['sombra_anillo_vacio',    'Anillo del Vacío Violeta', 's_ring_g', 'ring',   64, { atk: 8, hp: 100, crit: 0.02 }, 0.04],
  ['sombra_amuleto_abismo',  'Amuleto del Abismo Violeta', 's_amulet', 'amulet', 66, { hp: 300, mana: 150, crit: 0.03 }, 0.04],
];
const BOW = ['sombra_arco', 'Arco de las Sombras', 's_bow', 68, 112, 1250, 'void', 0.01];
const ICON = { head: '🥷', body: '🛡️', gloves: '🧤', boots: '🥾', shield: '🎒', legs: '👖', belt: '🎗️' };

function build(ITEMS, MONSTERS, bossType) {
  for (const [id, name, spr, type, L, def, bonus] of PIECES) {
    ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, shadow: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 4 };
  }
  { const [id, name, spr, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style: 'ranged', atk, cd, range: 8, el, shadow: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 6 }; }
  for (const [id, name, spr, type, L, bonus] of JEWELS) ITEMS[id] = { name, icon: type === 'ring' ? '💍' : '📿', spr, type, bonus, shadow: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 4 };
  const boss = MONSTERS[bossType];
  for (const j of JEWELS) boss.loot.push([j[0], j[6], 1, 1]);
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([BOW[0], BOW[7], 1, 1]);
}
module.exports = { build, PIECES, JEWELS, BOW };
