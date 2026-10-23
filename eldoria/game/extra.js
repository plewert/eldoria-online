'use strict';
/** Logros, habilidades activas, objetos de oficios, mascotas y monturas, recetas. */
const ACHS = [
  // [id, nombre, descripción, tipo, umbral, oro, título]
  ['k1', 'Primera sangre', 'Derrota a tu primer monstruo.', 'kt', 1, 20, 'Novato'],
  ['k100', 'Cazador', 'Derrota a 100 monstruos.', 'kt', 100, 300, 'Cazador'],
  ['k1000', 'Exterminador', 'Derrota a 1.000 monstruos.', 'kt', 1000, 3000, 'Exterminador'],
  ['k5000', 'Azote de Eldoria', 'Derrota a 5.000 monstruos.', 'kt', 5000, 15000, 'Azote de Eldoria'],
  ['b1', 'Matajefes', 'Derrota a un jefe.', 'bosses', 1, 500, 'Matajefes'],
  ['b10', 'Cazajefes', 'Derrota a 10 jefes.', 'bosses', 10, 5000, 'Cazajefes'],
  ['l10', 'Aprendiz', 'Llega al nivel 10.', 'lv', 10, 200, 'Aprendiz'],
  ['l25', 'Veterano', 'Llega al nivel 25.', 'lv', 25, 2000, 'Veterano'],
  ['l40', 'Campeón', 'Llega al nivel 40.', 'lv', 40, 8000, 'Campeón'],
  ['l60', 'Leyenda', 'Llega al nivel 60.', 'lv', 60, 30000, 'Leyenda'],
  ['p1', 'Duelista', 'Gana tu primer duelo PvP.', 'pvp', 1, 300, 'Duelista'],
  ['p10', 'Sanguinario', 'Gana 10 combates PvP.', 'pvp', 10, 3000, 'Sanguinario'],
  ['p50', 'Señor de la guerra', 'Gana 50 combates PvP.', 'pvp', 50, 20000, 'Señor de la Guerra'],
  ['q1', 'Mandadero', 'Completa una misión.', 'quests', 1, 100, 'Mandadero'],
  ['q6', 'Aventurero', 'Completa 6 misiones.', 'quests', 6, 1500, 'Aventurero'],
  ['q14', 'Héroe del reino', 'Completa 14 misiones.', 'quests', 14, 10000, 'Héroe'],
  ['g10k', 'Acaudalado', 'Ten 10.000 de oro a la vez.', 'gold', 10000, 0, 'Acaudalado'],
  ['g100k', 'Magnate', 'Ten 100.000 de oro a la vez.', 'gold', 100000, 0, 'Magnate'],
  ['c10', 'Artesano', 'Fabrica 10 objetos.', 'crafts', 10, 400, 'Artesano'],
  ['c60', 'Maestro artesano', 'Fabrica 60 objetos.', 'crafts', 60, 4000, 'Maestro Artesano'],
  ['r50', 'Recolector', 'Recolecta 50 materiales.', 'gather', 50, 400, 'Recolector'],
  ['r300', 'Herbolario', 'Recolecta 300 materiales.', 'gather', 300, 4000, 'Herbolario'],
  ['d10', 'Cabezota', 'Muere 10 veces.', 'deaths', 10, 0, 'Cabezota'],
  ['dr', 'Mata dragones', 'Derrota a un dragón.', 'mon:dragon', 1, 2000, 'Mata Dragones'],
  ['fa', 'Maldición rota', 'Derrota al Faraón.', 'mon:faraon', 1, 5000, 'Rompemaldiciones'],
  ['re', 'Corazón helado', 'Derrota a la Reina de Hielo.', 'mon:reina_hielo', 1, 8000, 'Reina Caída'],
  ['ds', 'Del abismo', 'Derrota al Demonio Supremo.', 'mon:demonio_supremo', 1, 6000, 'Cazademonios'],
  ['ev', 'Defensor del reino', 'Participa en derrotar a un jefe de evento.', 'events', 1, 3000, 'Defensor del Reino'],
  ['pe', 'Amigo fiel', 'Ten una mascota.', 'pet', 1, 300, 'Amigo Fiel'],
  ['mo', 'Jinete', 'Monta tu primera montura.', 'mount', 1, 500, 'Jinete'],
  ['ma', 'Comerciante', 'Vende un objeto en el mercado.', 'sold', 1, 300, 'Comerciante'],
  ['gu', 'Compañero', 'Únete a un gremio.', 'guild', 1, 300, 'Compañero'],
  ['pa', 'En equipo', 'Derrota monstruos en grupo.', 'party', 1, 200, 'Compañero de Armas'],
];

// Habilidades activas por estilo (teclas 1, 2 y 3). mult: multiplicador de daño sobre un golpe normal.
const SKILLS = {
  melee: [
    { id: 'golpe', name: 'Golpe poderoso', icon: '💥', cd: 6000, mana: 12, lv: 1, mult: 2.4, desc: 'Un golpe devastador (×2,4 de daño).' },
    { id: 'torbellino', name: 'Torbellino', icon: '🌀', cd: 10000, mana: 22, lv: 8, mult: 1.3, aoe: 1, desc: 'Golpea a todos los enemigos a tu alrededor.' },
    { id: 'grito', name: 'Grito de guerra', icon: '📣', cd: 30000, mana: 28, lv: 15, buff: { atk: 1.3 }, secs: 12, desc: '+30% de ataque durante 12 s.' },
  ],
  ranged: [
    { id: 'certero', name: 'Disparo certero', icon: '🎯', cd: 6000, mana: 12, lv: 1, mult: 2.1, crit: 1, desc: 'Disparo crítico garantizado.' },
    { id: 'lluvia', name: 'Lluvia de flechas', icon: '☔', cd: 11000, mana: 24, lv: 8, mult: 1.15, aoe: 2, atTarget: 1, desc: 'Cubre de flechas la zona del objetivo.' },
    { id: 'veneno', name: 'Flecha envenenada', icon: '☠️', cd: 14000, mana: 20, lv: 15, mult: 0.6, dot: { ticks: 6, mult: 0.45 }, desc: 'Daño inmediato y veneno durante 6 s.' },
  ],
  magic: [
    { id: 'bola', name: 'Bola de fuego', icon: '🔥', cd: 7000, mana: 26, lv: 1, mult: 2.5, aoe: 1, atTarget: 1, el: 'fire', desc: 'Explota y daña a los que rodean al objetivo.' },
    { id: 'hielo', name: 'Rayo de hielo', icon: '❄️', cd: 9000, mana: 22, lv: 8, mult: 1.7, slow: 4000, el: 'ice', desc: 'Daña y ralentiza al enemigo 4 s.' },
    { id: 'escudo', name: 'Escudo arcano', icon: '🛡️', cd: 28000, mana: 32, lv: 15, shield: 1, secs: 15, desc: 'Absorbe daño durante 15 s (crece con tu nivel).' },
  ],
};

// Materiales, elixires, mascotas y monturas
const EXTRA_ITEMS = {
  hierba_curativa: { name: 'Hierba Curativa', icon: '🌿', type: 'misc', stack: true, sell: 6 },
  flor_azul: { name: 'Flor Azul', icon: '💠', type: 'misc', stack: true, sell: 8 },
  cristal_arcano: { name: 'Cristal Arcano', icon: '🔷', type: 'misc', stack: true, sell: 90 },
  pluma_fenix: { name: 'Pluma de Fénix', icon: '🪶', type: 'misc', stack: true, sell: 400 },
  elixir_fuerza: { name: 'Elixir de Fuerza', icon: '🧪', type: 'consumable', stack: true, buff: { atk: 1.2 }, secs: 300, minLevel: 8, sell: 120, desc: '+20% de ataque durante 5 min.' },
  elixir_defensa: { name: 'Elixir de Piel de Roca', icon: '🧪', type: 'consumable', stack: true, buff: { def: 1.4 }, secs: 300, minLevel: 8, sell: 120, desc: '+40% de defensa durante 5 min.' },
  elixir_poder: { name: 'Elixir de Poder', icon: '⚗️', type: 'consumable', stack: true, buff: { atk: 1.35 }, secs: 300, minLevel: 20, sell: 420, desc: '+35% de ataque durante 5 min.' },
  elixir_sabiduria: { name: 'Elixir de Sabiduría', icon: '📘', type: 'consumable', stack: true, buff: { xp: 1.25 }, secs: 900, minLevel: 10, sell: 500, desc: '+25% de experiencia durante 15 min.' },
  // mascotas: se invocan con clic; siguen al héroe y recogen el oro del botín. gold = % extra de oro
  mascota_lobito: { name: 'Lobito Gris', icon: '🐺', type: 'pet', mon: 'lobo', scale: 0.55, gold: 0.05, price: 1500, sell: 300, desc: 'Te sigue y recoge el oro. +5% de oro.' },
  mascota_cangrejo: { name: 'Cangrejito', icon: '🦀', type: 'pet', mon: 'kobold', emoji: '🦀', scale: 0.5, gold: 0.06, sell: 400, desc: 'Un amigo pinchudo. +6% de oro.' },
  mascota_murcielago: { name: 'Murciélago Mascota', icon: '🦇', type: 'pet', mon: 'murcielago', scale: 0.6, gold: 0.08, price: 4000, sell: 900, desc: 'Vuela a tu lado. +8% de oro.' },
  mascota_goblin: { name: 'Goblin Aprendiz', icon: '👺', type: 'pet', mon: 'goblin', scale: 0.5, gold: 0.1, price: 9000, sell: 2000, desc: 'Un goblin que cuida tu bolsa. +10% de oro.' },
  mascota_dragoncito: { name: 'Dragoncito', icon: '🐲', type: 'pet', mon: 'dragon', scale: 0.38, gold: 0.18, sell: 9000, desc: 'Cría de dragón. +18% de oro.' },
  mascota_fantasma: { name: 'Espectro Amistoso', icon: '👻', type: 'pet', mon: 'espectro_helado', scale: 0.5, gold: 0.25, sell: 15000, desc: 'Fantasma helado. +25% de oro.' },
  // monturas: velocidad = multiplicador del tiempo por paso (menor = más rápido)
  montura_lobo: { name: 'Lobo de Montar', icon: '🐺', type: 'mount', mon: 'lobo', scale: 0.95, speed: 0.78, minLevel: 15, price: 6000, sell: 1500, desc: 'Cabalgas un 22% más rápido.' },
  montura_oso: { name: 'Oso Pardo de Montar', icon: '🐻', type: 'mount', mon: 'oso', scale: 0.9, speed: 0.7, minLevel: 25, price: 20000, sell: 5000, desc: 'Cabalgas un 30% más rápido.' },
  montura_dragon: { name: 'Dragón Joven', icon: '🐉', type: 'mount', mon: 'dragon', scale: 0.62, speed: 0.58, minLevel: 40, sell: 30000, desc: 'Vuelas un 42% más rápido.' },
  trofeo_coloso: { name: 'Trofeo del Coloso', icon: '🏆', type: 'misc', stack: true, sell: 8000 },
};

// Recetas (en ciudades). lvl = nivel de oficio. out = [id, cantidad]
const RECIPES = [
  { id: 'r_vida', name: 'Poción de vida ×3', lvl: 1, ing: [['hierba_curativa', 2]], out: ['pocion_vida', 3], xp: 6 },
  { id: 'r_mana', name: 'Poción de maná ×3', lvl: 1, ing: [['flor_azul', 2]], out: ['pocion_mana', 3], xp: 6 },
  { id: 'r_vida_g', name: 'Poción de vida grande ×2', lvl: 4, ing: [['hierba_curativa', 4], ['flor_azul', 1]], out: ['pocion_vida_g', 2], xp: 14 },
  { id: 'r_mana_g', name: 'Poción de maná grande ×2', lvl: 4, ing: [['flor_azul', 4], ['hierba_curativa', 1]], out: ['pocion_mana_g', 2], xp: 14 },
  { id: 'r_fuerza', name: 'Elixir de Fuerza', lvl: 6, ing: [['hierba_curativa', 5], ['sangre_orco', 2]], out: ['elixir_fuerza', 1], xp: 24 },
  { id: 'r_roca', name: 'Elixir de Piel de Roca', lvl: 6, ing: [['hierba_curativa', 5], ['piel_lobo', 2]], out: ['elixir_defensa', 1], xp: 24 },
  { id: 'r_sabio', name: 'Elixir de Sabiduría', lvl: 9, ing: [['hierba_curativa', 6], ['flor_azul', 6], ['cristal_arcano', 1]], out: ['elixir_sabiduria', 1], xp: 40 },
  { id: 'r_poder', name: 'Elixir de Poder', lvl: 12, ing: [['flor_azul', 6], ['cristal_arcano', 2], ['cuerno_demonio', 1]], out: ['elixir_poder', 1], xp: 60 },
  { id: 'r_pulir', name: 'Pulir gema (al azar)', lvl: 8, ing: [['mineral_hierro', 6]], out: ['@gem', 1], xp: 30 },
  { id: 'r_pulir2', name: 'Gema rara (amatista, ópalo o diamante)', lvl: 15, ing: [['mineral_hierro', 10], ['cristal_arcano', 3]], out: ['@gem2', 1], xp: 80 },
];

// Puntos de recolección: tipo → { icono, material, zonas, cantidad, tiempo de reaparición }
const NODES = {
  hierba: { icon: '🌿', name: 'Hierba curativa', give: [['hierba_curativa', 1, 2]], zones: ['prado', 'colinas', 'playa'], n: 70, respawn: 80000, xp: 2 },
  flor: { icon: '💠', name: 'Flor azul', give: [['flor_azul', 1, 2]], zones: ['prado', 'colinas', 'bosque', 'pantano'], n: 50, respawn: 90000, xp: 2 },
  mena: { icon: '⛏️', name: 'Veta de mineral', give: [['mineral_hierro', 1, 3]], zones: ['minas', 'catacumbas'], n: 45, respawn: 100000, xp: 3, gem: 0.05 },
  cristal: { icon: '🔷', name: 'Cristal arcano', give: [['cristal_arcano', 1, 1]], zones: ['cumbres', 'fortaleza', 'abismo'], n: 28, respawn: 140000, xp: 5, gem: 0.04 },
};

const BOSS = {
  type: 'coloso_ancestral',
  def: { name: 'Coloso Ancestral', icon: '🗿', hp: 30000, dmg: [60, 110], exp: 9000, move: 520, atkCd: 1500, aggro: 12, respawn: 999999999, boss: true, gold: [3000, 6000], loot: [['trofeo_coloso', 1, 1, 2], ['pocion_vida_g', 1, 3, 6], ['pocion_mana_g', 1, 3, 6]] },
};

module.exports = { ACHS, SKILLS, EXTRA_ITEMS, RECIPES, NODES, BOSS };
