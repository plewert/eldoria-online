'use strict';
/** Set de las Sombras: botín raro del Dragón de las Sombras. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['sombra_capucha', 'Capucha de las Sombras',   's_hood',     'head',   62, 38, { hp: 230, crit: 0.02 }, 0.06],
  ['sombra_coraza',  'Coraza de las Sombras',    's_chest',    'body',   66, 52, { hp: 350, atk: 8 }, 0.04],
  ['sombra_guantes', 'Guanteletes de las Sombras', 's_gauntlet', 'gloves', 64, 16, { hp: 90, atk: 7, crit: 0.01 }, 0.06],
  ['sombra_botas',   'Botas de las Sombras',     's_boot',     'boots',  63, 20, { hp: 120 }, 0.06],
  ['sombra_carcaj',  'Carcaj de las Sombras',    's_quiver',   'shield', 65, 24, { hp: 140, crit: 0.02 }, 0.05],
];
const BOW = ['sombra_arco', 'Arco de las Sombras', 's_bow', 68, 112, 1250, 'void', 0.01];
const ICON = { head: '🥷', body: '🛡️', gloves: '🧤', boots: '🥾', shield: '🎒' };

function build(ITEMS, MONSTERS, bossType) {
  for (const [id, name, spr, type, L, def, bonus] of PIECES) {
    ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, shadow: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 4 };
  }
  { const [id, name, spr, L, atk, cd, el] = BOW; ITEMS[id] = { name, icon: '🏹', spr, type: 'weapon', style: 'ranged', atk, cd, range: 8, el, shadow: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 6 }; }
  const boss = MONSTERS[bossType];
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  boss.loot.push([BOW[0], BOW[7], 1, 1]);
}
module.exports = { build, PIECES, BOW };
