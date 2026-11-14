'use strict';
/** Set de Fuego Negro del Aracnídeo (cuerpo a cuerpo + largo alcance): botín raro. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['fuego_yelmo',    'Rastreador Ciego',            'f_helm',   'head',   80, 50, { hp: 300, atk: 4, crit: 0.03 }, 0.06],
  ['fuego_peto',     'Silbato Silencioso',          'f_chest',  'body',   84, 68, { hp: 460, atk: 12 }, 0.04],
  ['fuego_guantes',  'Brazal de Garra',             'f_glove',  'gloves', 82, 22, { hp: 120, atk: 10, crit: 0.02 }, 0.06],
  ['fuego_pantalon', 'Pantalón de Fuego Negro',     'f_leg',    'legs',   83, 34, { hp: 250, atk: 7 }, 0.05],
  ['fuego_botas',    'Botas de Garra de Fuego Negro','f_boot',  'boots',  81, 26, { hp: 160, atk: 4 }, 0.06],
  ['fuego_cinturon', 'Cierre de Garra',             'f_belt',   'belt',   82, 20, { hp: 220, atk: 7 }, 0.05],
  ['fuego_carcaj',   'Reserva Ígnea',               'f_quiver', 'shield', 82, 30, { hp: 170, atk: 8, crit: 0.02 }, 0.05],
];
// armas: [id, nombre, sprite, estilo, nivel, ataque, cd, elemento, probabilidad]
const WEAPONS = [
  ['fuego_mandoble', 'Llama del Viento (Gran Espada)', 'f_sword', 'melee',  88, 175, 1250, 'fire', 0.01],
  ['fuego_garras',   'Garras de Fuego Negro',          'f_claw',  'melee',  86, 140, 800,  'fire', 0.01],
  ['fuego_arco',     'Arco Largo Llama del Viento',    'f_bow',   'ranged', 88, 160, 1100, 'fire', 0.01],
];
const ICON = { head: '🪖', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', belt: '🎗️', shield: '🏹' };
function build(ITEMS, MONSTERS, bossType) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, spider: 1, minLevel: L, sell: sell(L, 4) };
  for (const [id, name, spr, style, L, atk, cd, el] of WEAPONS) ITEMS[id] = { name, icon: style === 'ranged' ? '🏹' : '⚔️', spr, type: 'weapon', style, atk, cd, range: style === 'ranged' ? 8 : 1, el, spider: 1, minLevel: L, sell: sell(L, 6) };
  const boss = MONSTERS[bossType];
  for (const p of PIECES) boss.loot.push([p[0], p[7], 1, 1]);
  for (const w of WEAPONS) boss.loot.push([w[0], w[8], 1, 1]);
}
module.exports = { build, PIECES, WEAPONS };
