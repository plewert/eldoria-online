'use strict';
/** Tabletas de teletransporte: las vende Boris por 100 000 de oro. De un solo uso; llevan al camino de cada zona. [id, nombre, x, y] */
const PRICE = 100000;
const TABLETS = [
  ['tp_ciudad',   'Tableta de Teletransporte: Ciudad de Aldea Real', 90, 66],
  ['tp_bosque',   'Tableta de Teletransporte: Bosque Maldito',       90, 31],
  ['tp_cumbres',  'Tableta de Teletransporte: Cumbres Heladas',      130, 31],
  ['tp_dunas',    'Tableta de Teletransporte: Dunas Ardientes',      150, 78],
  ['tp_aldea',    'Tableta de Teletransporte: Aldea Pesquera',       211, 78],
  ['tp_selva',    'Tableta de Teletransporte: Selva Esmeralda',      211, 40],
  ['tp_sabana',   'Tableta de Teletransporte: Sabana Dorada',        212, 90],
  ['tp_lava',     'Tableta de Teletransporte: Tierras de Lava',      288, 78],
  ['tp_pantano',  'Tableta de Teletransporte: Pantano Venenoso',     30, 102],
  ['tp_colinas',  'Tableta de Teletransporte: Colinas Doradas',      90, 100],
  ['tp_puerto',   'Tableta de Teletransporte: Puerto Marea',         99, 124],
];
function build(ITEMS, SHOPS) {
  for (const [id, name, x, y] of TABLETS) ITEMS[id] = { name, icon: '📜', type: 'tablet', dest: [x, y], stack: true, price: PRICE, sell: 20000, desc: 'De un solo uso: te teletransporta al instante (no se puede usar en combate).' };
  SHOPS.boris.push(...TABLETS.map((t) => t[0]));
}
module.exports = { build, TABLETS, PRICE };
