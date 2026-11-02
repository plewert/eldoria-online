'use strict';
/** Tabletas de teletransporte: las vende Boris por 2 000 de oro. De un solo uso; llevan al camino de cada zona. [id, nombre, x, y] */
const PRICE = 2000;
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
  ['tp_alba',     'Tableta de Teletransporte: Ciudad de Alba Dorada', 400, 70],
  ['tp_montana',  'Tableta de Teletransporte: Montañas del Trueno',  359, 40],
  ['tp_nubes',    'Tableta de Teletransporte: Reino de las Nubes',   424, 40],
  ['tp_desierto', 'Tableta de Teletransporte: Desierto de las Pirámides', 352, 98],
  ['tp_paraiso',  'Tableta de Teletransporte: Paraíso de Coral',     440, 98],
  ['tp_gremio',   'Tableta de Teletransporte: Gremio de Mineros',    74, 65],
];
/** Tabletas de las cuevas de jefe: 250 000 de oro en Boris; te dejan dentro de la cueva, cerca de la entrada. */
const CAVE_PRICE = 250000;
const CAVE_TABLETS = [
  ['tp_cueva_dragon', 'Tableta de Teletransporte: Cueva del Dragón de las Sombras', 122, 85],
  ['tp_cueva_jade',   'Tableta de Teletransporte: Cueva del Hidra de Jade',         52, 52],
  ['tp_cueva_nube',   'Tableta de Teletransporte: Santuario de las Nubes',          212, 101],
  ['tp_cueva_arana',  'Tableta de Teletransporte: Guarida del Aracnídeo',           288, 100],
  ['tp_cueva_mar',    'Tableta de Teletransporte: Gruta del Leviatán',              229, 44],
  ['tp_cueva_magma',  'Tableta de Teletransporte: Caldera del Magma',               288, 123],
  ['tp_cueva_anubis', 'Tableta de Teletransporte: Tumba de Anubis',                 377, 122],
  ['tp_cueva_olimpo', 'Tableta de Teletransporte: El Olimpo de Zeus',               342, 35],
  ['tp_cueva_hades',  'Tableta de Teletransporte: Trono de Hades (Inframundo)',      240, 311],
];
function build(ITEMS, SHOPS) {
  for (const [id, name, x, y] of CAVE_TABLETS) ITEMS[id] = { name, icon: '📜', type: 'tablet', dest: [x, y], stack: true, price: CAVE_PRICE, sell: 20000, desc: 'De un solo uso: te deja dentro de la cueva, cerca de la entrada (no se puede usar en combate).' };
  SHOPS.boris.push(...CAVE_TABLETS.map((t) => t[0]));
  for (const [id, name, x, y] of TABLETS) ITEMS[id] = { name, icon: '📜', type: 'tablet', dest: [x, y], stack: true, price: PRICE, sell: 400, desc: 'De un solo uso: te teletransporta al instante (no se puede usar en combate).' };
  SHOPS.boris.push(...TABLETS.map((t) => t[0]));
  SHOPS.zaroth.push(...TABLETS.map((t) => t[0]));      // el brujo de Alba Dorada también las vende
}
module.exports = { build, TABLETS, CAVE_TABLETS, PRICE, CAVE_PRICE };
