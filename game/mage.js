'use strict';
/**
 * Línea de equipo de mago (láminas de pixel-art): túnicas, sombreros, báculos, cinturones, guantes,
 * libros y orbes. Cada pieza es más fuerte que la anterior. `spr` = clave del dibujo en gear.json.
 */
const sellOf = (L) => Math.round(8 + L * L * 3.4);
const priceOf = (L) => Math.round(sellOf(L) * 2.6);

// [id, nombre, sprite, nivel, def, bonus]
const ROBES = [
  ['tunica_aprendiz',  'Túnica de Aprendiz',     'robe0',  1, 2,  { mana: 10 }],
  ['tunica_bosque',    'Túnica del Bosque',      'robe1',  5, 3,  { mana: 20 }],
  ['tunica_bruma',     'Túnica de la Bruma',     'robe2',  9, 5,  { mana: 30 }],
  ['tunica_azul',      'Túnica Azul Bordada',    'robe3',  14, 7,  { mana: 45 }],
  ['tunica_maestro',   'Túnica de Maestro',      'robe4',  20, 9,  { mana: 60 }],
  ['tunica_carmesi',   'Túnica Carmesí',         'robe5',  26, 12, { mana: 80, atk: 2 }],
  ['tunica_plata',     'Túnica Roja y Plata',    'robe6',  32, 15, { mana: 100, atk: 3 }],
  ['tunica_noche',     'Túnica de la Noche',     'robe7',  38, 18, { mana: 125, atk: 5 }],
  ['tunica_estelar',   'Túnica Estelar',         'robe8',  43, 21, { mana: 150, atk: 7 }],
  ['manto_lunar',      'Manto Lunar',            'robe9',  48, 24, { mana: 180, atk: 9 }],
  ['manto_igneo',     'Manto Ígneo',            'robe10', 52, 27, { mana: 210, atk: 12 }],
  ['manto_lava',       'Manto de Lava Viva',     'robe11', 56, 30, { mana: 245, atk: 15 }],
  ['manto_hielo_eterno','Manto de Hielo Eterno', 'robe12', 60, 34, { mana: 285, atk: 19 }],
];
ROBES[10][0] = 'manto_igneo';
const HATS = [
  ['sombrero_aprendiz', 'Sombrero de Aprendiz',  'hat0',  1, 1,  { mana: 5 }],
  ['sombrero_bosque',   'Sombrero del Bosque',   'hat1',  5, 2,  { mana: 10 }],
  ['sombrero_azul',     'Sombrero Azul',         'hat2',  9, 3,  { mana: 15 }],
  ['sombrero_cono',     'Cono del Hechicero',    'hat3',  14, 4,  { mana: 22 }],
  ['sombrero_estrellas','Sombrero de Estrellas', 'hat4',  19, 6,  { mana: 30 }],
  ['sombrero_ancla',    'Sombrero del Navegante','hat5',  24, 8,  { mana: 40 }],
  ['sombrero_rojo',     'Sombrero Rojo',         'hat6',  29, 10, { mana: 50 }],
  ['sombrero_gala',     'Sombrero de Gala',      'hat7',  33, 12, { mana: 60 }],
  ['gorro_rubi',        'Gorro de Rubí',         'hat10', 36, 13, { mana: 70, crit: 0.01 }],
  ['gorro_zafiro',      'Gorro de Zafiro',       'hat11', 39, 14, { mana: 80, crit: 0.01 }],
  ['corona_gemas',      'Corona de Gemas',       'hat8',  44, 17, { mana: 95, crit: 0.02 }],
  ['corona_real',       'Corona del Archimago',  'hat9',  48, 19, { mana: 110, crit: 0.02 }],
  ['capucha_sangre',    'Capucha de Sangre',     'hat12', 52, 22, { mana: 130, atk: 4 }],
  ['capucha_llama',     'Capucha de Llamas',     'hat13', 56, 25, { mana: 150, atk: 6 }],
  ['capucha_escarcha',  'Capucha de Escarcha',   'hat14', 60, 28, { mana: 175, atk: 8 }],
];
// [id, nombre, sprite, nivel, ataque, elemento]
const STAFFS = [
  ['baculo_rizado',   'Bastón Rizado',          'staff0', 1,  8,  null],
  ['baculo_nudoso',   'Bastón Nudoso',          'staff1', 2,  10, null],
  ['baculo_viajero',  'Bastón del Viajero',     'staff2', 4,  12, null],
  ['baculo_roble',    'Bastón de Roble',        'staff3', 6,  15, null],
  ['baculo_orbe',     'Bastón del Orbe Azul',   'staff4', 9,  18, 'ice'],
  ['baculo_ramita',   'Bastón de Ramas',        'staff5', 12, 21, 'poison'],
  ['baculo_rubi',     'Báculo de Rubí',         'staff6', 15, 25, 'fire'],
  ['baculo_esmeralda','Báculo de Esmeralda',    'staff7', 19, 29, 'poison'],
  ['baculo_zafiro',   'Báculo de Zafiro',       'staff8', 23, 34, 'ice'],
  ['baculo_plata',    'Báculo de Plata',        'staff9', 27, 40, 'arcane'],
  ['baculo_cristal_rojo','Báculo de Cristal Rojo','staff10', 32, 46, 'fire'],
  ['baculo_llama',    'Báculo de la Llama',     'staff11', 37, 52, 'fire'],
  ['baculo_selva',    'Báculo de la Selva',     'staff12', 42, 59, 'poison'],
  ['baculo_glaciar',  'Báculo Glaciar',         'staff13', 47, 66, 'ice'],
  ['baculo_violeta',  'Báculo del Vacío',       'staff14', 51, 73, 'void'],
  ['baculo_sol_dorado','Báculo del Sol Dorado', 'staff15', 55, 80, 'sun'],
  ['baculo_runas',    'Báculo de Runas',        'staff16', 58, 86, 'storm'],
  ['baculo_aurora',   'Báculo de la Aurora',    'staff17', 60, 91, 'ice'],
  ['baculo_infinito', 'Báculo del Infinito',    'staff18', 62, 96, 'arcane'],
];
const BELTS = [
  ['cinto_cuero',     'Cinto de Cuero',          'belt0', 1,  1, { hp: 10 }],
  ['cinto_bolsa',     'Cinto con Bolsa',         'belt1', 4,  2, { hp: 18, mana: 5 }],
  ['cinto_hierbas',   'Cinto de Herbolario',     'belt2', 8,  3, { hp: 28, mana: 10 }],
  ['cinto_hebilla',   'Cinto de Hebilla',        'belt3', 12, 4, { hp: 40, mana: 14 }],
  ['cinto_pociones',  'Cinto de Alquimista',     'belt4', 16, 5, { hp: 55, mana: 20 }],
  ['cinto_viajero',   'Cinto del Viajero',       'belt5', 20, 6, { hp: 70, mana: 28 }],
  ['cinto_gran_cuero','Gran Cinto de Mago',      'belt6', 24, 7, { hp: 90, mana: 36 }],
  ['faja_estelar',    'Faja Estelar',            'belt7', 30, 9, { hp: 115, mana: 50 }],
  ['faja_carmesi',    'Faja Carmesí',            'belt8', 38, 11, { hp: 145, mana: 65 }],
  ['faja_archimago',  'Faja del Archimago',      'belt9', 46, 13, { hp: 180, mana: 85 }],
];
const GLOVES = [
  ['guantes_tela',    'Guantes de Tela',         'glove0', 3,  1, { mana: 8 }],
  ['guantes_seda',    'Guantes de Seda',         'glove1', 10, 2, { mana: 18, atk: 1 }],
  ['guantes_cuero',   'Guantes de Cuero',        'glove2', 18, 3, { mana: 30, atk: 3 }],
  ['guantes_runas',   'Guantes Rúnicos',         'glove3', 28, 4, { mana: 45, atk: 5, crit: 0.01 }],
  ['guantes_sello',   'Guantes del Sello',       'glove4', 38, 5, { mana: 65, atk: 8, crit: 0.02 }],
  ['guantes_arcanos', 'Guantes Arcanos',         'glove5', 48, 6, { mana: 90, atk: 12, crit: 0.03 }],
];
// mano libre: libros de hechizos y orbes (casilla del escudo)
const OFFHAND = [
  ['libro_aprendiz',  'Libro del Aprendiz',      'book0', 1,  1, { mana: 10 }],
  ['libro_rojo',      'Grimorio Rojo',           'book1', 7,  2, { mana: 25 }],
  ['libro_hebilla',   'Grimorio con Cierre',     'book2', 13, 3, { mana: 40 }],
  ['orbe_cristal',    'Orbe de Cristal',         'orb0',  20, 4, { mana: 60, crit: 0.01 }],
  ['libro_runa',      'Grimorio de la Runa',     'book3', 26, 6, { mana: 80, atk: 4 }],
  ['libro_estelar',   'Grimorio Estelar',        'book4', 34, 8, { mana: 105, atk: 7 }],
  ['orbe_violeta',    'Orbe del Vacío',          'orb1',  42, 10, { mana: 135, atk: 10, crit: 0.02 }],
  ['libro_abierto',   'Libro de las Eras',       'book5', 50, 12, { mana: 170, atk: 14, crit: 0.03 }],
];
// anillos y amuletos existentes que toman el dibujo de la lámina
const RING_SPR = {};

function build(ITEMS, SHOPS, MONSTERS) {
  const add = (id, o) => { ITEMS[id] = o; };
  for (const [id, name, spr, L, def, bonus] of ROBES) add(id, { name, icon: '🥻', spr, type: 'body', def, bonus, mage: 1, minLevel: L, sell: sellOf(L), ...(L <= 16 ? { price: priceOf(L) } : {}) });
  for (const [id, name, spr, L, def, bonus] of HATS) add(id, { name, icon: '🧙', spr, type: 'head', def, bonus, mage: 1, minLevel: L, sell: sellOf(L), ...(L <= 16 ? { price: priceOf(L) } : {}) });
  for (const [id, name, spr, L, atk, el] of STAFFS) {
    const i = STAFFS.findIndex((s) => s[0] === id);
    add(id, { name, icon: '🪄', spr, type: 'weapon', style: 'magic', atk, cd: 1300 + Math.round(i * 8), range: i >= 14 ? 7 : i >= 7 ? 6 : 5, mana: Math.round(4 + i * 1.7), minLevel: L, sell: sellOf(L), ...(el ? { el } : {}), ...(L <= 16 ? { price: priceOf(L) } : {}) });
  }
  for (const [id, name, spr, L, def, bonus] of BELTS) add(id, { name, icon: '🎗️', spr, type: 'belt', def, bonus, minLevel: L, sell: sellOf(L), ...(L <= 16 ? { price: priceOf(L) } : {}) });
  for (const [id, name, spr, L, def, bonus] of GLOVES) add(id, { name, icon: '🧤', spr, type: 'gloves', def, bonus, minLevel: L, sell: sellOf(L), ...(L <= 16 ? { price: priceOf(L) } : {}) });
  for (const [id, name, spr, L, def, bonus] of OFFHAND) add(id, { name, icon: '📖', spr, type: 'shield', def, bonus, mage: 1, minLevel: L, sell: sellOf(L), ...(L <= 16 ? { price: priceOf(L) } : {}) });

  // Tienda de Orin: los primeros peldaños de cada pieza
  const all = [...ROBES, ...HATS, ...STAFFS, ...BELTS, ...GLOVES, ...OFFHAND];
  SHOPS.orin = ['pocion_mana', 'pocion_mana_g', ...all.filter((r) => ITEMS[r[0]].price).map((r) => r[0])];

  // Botín: cada pieza cae de dos monstruos de su nivel
  const ladder = ['rata', 'serpiente', 'arana', 'esqueleto', 'goblin', 'orco', 'troll', 'bruja', 'demonio_menor', 'golem_lava', 'momia', 'yeti', 'dragon', 'momia_real', 'caballero_hielo', 'golem_hielo', 'demonio_supremo', 'hidra', 'faraon', 'reina_hielo'].filter((m) => MONSTERS[m]);
  for (const r of all) {
    const id = r[0], L = ITEMS[id].minLevel;
    if (L <= 3) continue;
    const idx = Math.min(ladder.length - 1, Math.floor((L / 62) * (ladder.length - 1)));
    for (const j of [idx, Math.min(ladder.length - 1, idx + 1)]) {
      const m = MONSTERS[ladder[j]];
      m.loot.push([id, m.boss ? 0.12 : 0.02, 1, 1]);
    }
  }
}
module.exports = { build, ROBES, HATS, STAFFS, BELTS, GLOVES, OFFHAND, RING_SPR };
