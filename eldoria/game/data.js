'use strict';
/**
 * Datos del juego: configuración, objetos, monstruos y tienda.
 * Todo lo "balanceable" vive aquí para ajustarlo sin tocar la lógica.
 */

const CFG = {
  TICK_MS: 50,            // frecuencia de simulación (20 ticks/s)
  SNAP_EVERY: 2,          // se envía estado cada 2 ticks (10 Hz)
  XP_RATE: 2,             // multiplicador global de experiencia
  STEP_MS: 230,           // milisegundos por casilla al caminar
  PVP_MIN_LEVEL: 5,       // protección de novato: nivel mínimo para PvP (atacante y víctima)
  PVP_DMG_MULT: 0.6,      // el daño entre jugadores se reduce para que los combates duren
  PVP_LOCK_MS: 20000,     // "en combate": no puedes huir a zona segura ni teletransportarte
  GHOST_MS: 20000,        // si te desconectas en combate, tu personaje sigue 20 s (anti combat-log)
  INV_SIZE: 24,
  STACK_MAX: 100,
  VIEW_X: 16,             // radio de visión enviado al cliente
  VIEW_Y: 12,
  GROUND_TTL: 10 * 60 * 1000,   // los objetos del suelo duran 10 min
  LOOT_PROTECT_MS: 30000,       // en zonas seguras, el botín es del que más daño hizo durante 30 s
  DEATH_XP_LOSS: 0.05,          // pérdida de experiencia al morir en zona PvP
  DEATH_ITEM_DROP: 0.5,         // probabilidad de soltar cada pila del inventario al morir en PvP
  DEATH_EQUIP_DROP: 0.15,       // probabilidad de soltar cada pieza equipada al morir en PvP
  DEATH_GOLD_DROP: 0.25,        // fracción de oro que se suelta al morir en PvP
  AUTOSAVE_MS: 30000,
};

/* ------------------------------ OBJETOS ------------------------------ */
// type: weapon | head | body | shield | consumable | misc
// weapon: style (melee|ranged|magic), atk, cd (ms entre ataques), range, mana (magia), minLevel
// armor : def, minLevel
// price = precio de compra en tienda, sell = precio de venta (sin sell => no se puede vender)
const ITEMS = {
  // ---- Armas cuerpo a cuerpo ----
  espada_madera:   { name: 'Espada de Madera',   icon: '🗡️', type: 'weapon', style: 'melee', atk: 8,  cd: 1100, range: 1, minLevel: 1,  sell: 5 },
  espada_hierro:   { name: 'Espada de Hierro',   icon: '⚔️', type: 'weapon', style: 'melee', atk: 14, cd: 1100, range: 1, minLevel: 4,  price: 180, sell: 70 },
  hacha_acero:     { name: 'Hacha de Acero',     icon: '🪓', type: 'weapon', style: 'melee', atk: 22, cd: 1150, range: 1, minLevel: 10, price: 700, sell: 280 },
  mandoble_runico: { name: 'Mandoble Rúnico',    icon: '🗡️', type: 'weapon', style: 'melee', atk: 34, cd: 1150, range: 1, minLevel: 22, sell: 1500 },
  martillo_titan:  { name: 'Martillo del Titán', icon: '🔨', type: 'weapon', style: 'melee', atk: 48, cd: 1250, range: 1, minLevel: 35, sell: 5000 },
  // ---- Armas a distancia ----
  arco_corto:      { name: 'Arco Corto',         icon: '🏹', type: 'weapon', style: 'ranged', atk: 8,  cd: 1200, range: 6, minLevel: 1,  sell: 5 },
  arco_largo:      { name: 'Arco Largo',         icon: '🏹', type: 'weapon', style: 'ranged', atk: 14, cd: 1200, range: 6, minLevel: 4,  price: 190, sell: 75 },
  ballesta:        { name: 'Ballesta de Acero',  icon: '🎯', type: 'weapon', style: 'ranged', atk: 22, cd: 1250, range: 6, minLevel: 10, price: 720, sell: 290 },
  arco_dragon:     { name: 'Arco de Dragón',     icon: '🏹', type: 'weapon', style: 'ranged', atk: 34, cd: 1250, range: 7, minLevel: 22, sell: 1600 },
  arco_celestial:  { name: 'Arco Celestial',     icon: '🏹', type: 'weapon', style: 'ranged', atk: 48, cd: 1300, range: 7, minLevel: 35, sell: 5200 },
  // ---- Armas mágicas ----
  vara_novato:     { name: 'Vara de Aprendiz',   icon: '🪄', type: 'weapon', style: 'magic', atk: 9,  cd: 1300, range: 5, mana: 4,  minLevel: 1,  sell: 5 },
  baston_fuego:    { name: 'Bastón de Fuego',    icon: '🔥', type: 'weapon', style: 'magic', atk: 15, cd: 1300, range: 5, mana: 7,  minLevel: 4,  price: 200, sell: 80 },
  baston_hielo:    { name: 'Bastón de Hielo',    icon: '❄️', type: 'weapon', style: 'magic', atk: 23, cd: 1300, range: 5, mana: 11, minLevel: 10, price: 750, sell: 300 },
  baston_arcano:   { name: 'Bastón Arcano',      icon: '🔮', type: 'weapon', style: 'magic', atk: 35, cd: 1350, range: 6, mana: 16, minLevel: 22, sell: 1700 },
  baston_abismo:   { name: 'Bastón del Abismo',  icon: '🌀', type: 'weapon', style: 'magic', atk: 50, cd: 1400, range: 6, mana: 22, minLevel: 35, sell: 5500 },
  // ---- Cascos ----
  casco_cuero:     { name: 'Casco de Cuero',     icon: '🪖', type: 'head', def: 2,  minLevel: 1,  price: 40,  sell: 15 },
  casco_hierro:    { name: 'Casco de Hierro',    icon: '🪖', type: 'head', def: 4,  minLevel: 4,  price: 150, sell: 60 },
  casco_acero:     { name: 'Casco de Acero',     icon: '⛑️', type: 'head', def: 7,  minLevel: 10, price: 520, sell: 210 },
  casco_demonio:   { name: 'Casco Demoníaco',    icon: '👹', type: 'head', def: 11, minLevel: 22, sell: 1400 },
  casco_dragon:    { name: 'Yelmo de Dragón',    icon: '🐲', type: 'head', def: 15, minLevel: 35, sell: 4200 },
  // ---- Armaduras ----
  tunica_tela:     { name: 'Túnica de Tela',     icon: '👕', type: 'body', def: 1,  minLevel: 1,  sell: 3 },
  armadura_cuero:  { name: 'Armadura de Cuero',  icon: '🥋', type: 'body', def: 3,  minLevel: 1,  price: 80,  sell: 30 },
  cota_malla:      { name: 'Cota de Malla',      icon: '🦺', type: 'body', def: 6,  minLevel: 4,  price: 260, sell: 100 },
  armadura_placas: { name: 'Armadura de Placas', icon: '🛡️', type: 'body', def: 10, minLevel: 10, price: 950, sell: 380 },
  armadura_dragon: { name: 'Armadura de Dragón', icon: '🐉', type: 'body', def: 16, minLevel: 22, sell: 2600 },
  armadura_abismo: { name: 'Armadura del Abismo',icon: '😈', type: 'body', def: 22, minLevel: 35, sell: 6500 },
  // ---- Escudos ----
  escudo_madera:   { name: 'Escudo de Madera',   icon: '🟫', type: 'shield', def: 2,  minLevel: 1,  price: 50,  sell: 20 },
  escudo_hierro:   { name: 'Escudo de Hierro',   icon: '🔰', type: 'shield', def: 4,  minLevel: 4,  price: 190, sell: 75 },
  escudo_torre:    { name: 'Escudo de Torre',    icon: '🏰', type: 'shield', def: 7,  minLevel: 10, price: 620, sell: 250 },
  escudo_demonio:  { name: 'Escudo Demoníaco',   icon: '👿', type: 'shield', def: 11, minLevel: 22, sell: 1500 },
  escudo_titan:    { name: 'Escudo del Titán',   icon: '🗿', type: 'shield', def: 15, minLevel: 35, sell: 4500 },
  // ---- Consumibles ----
  pocion_vida:     { name: 'Poción de Vida',     icon: '🧪', type: 'consumable', heal: 70,     stack: true, price: 35,  sell: 5 },
  pocion_vida_g:   { name: 'Poción de Vida Grande', icon: '❤️‍🔥', type: 'consumable', heal: 180, stack: true, minLevel: 10, price: 110, sell: 20 },
  pocion_mana:     { name: 'Poción de Maná',     icon: '💧', type: 'consumable', restore: 45,  stack: true, price: 40,  sell: 6 },
  pocion_mana_g:   { name: 'Poción de Maná Grande', icon: '🔷', type: 'consumable', restore: 120, stack: true, minLevel: 10, price: 120, sell: 22 },
  // ---- Trofeos / materiales (solo para vender) ----
  pata_conejo:     { name: 'Pata de Conejo',     icon: '🐾', type: 'misc', stack: true, sell: 4 },
  cola_rata:       { name: 'Cola de Rata',       icon: '🪱', type: 'misc', stack: true, sell: 3 },
  veneno_serpiente:{ name: 'Veneno de Serpiente',icon: '🧫', type: 'misc', stack: true, sell: 10 },
  seda_arana:      { name: 'Seda de Araña',      icon: '🕸️', type: 'misc', stack: true, sell: 15 },
  ala_murcielago:  { name: 'Ala de Murciélago',  icon: '🪽', type: 'misc', stack: true, sell: 18 },
  hueso:           { name: 'Hueso Antiguo',      icon: '🦴', type: 'misc', stack: true, sell: 12 },
  polvo_necro:     { name: 'Polvo Necrótico',    icon: '🧂', type: 'misc', stack: true, sell: 35 },
  piel_lobo:       { name: 'Piel de Lobo',       icon: '🧣', type: 'misc', stack: true, sell: 40 },
  colmillo_oso:    { name: 'Colmillo de Oso',    icon: '🦷', type: 'misc', stack: true, sell: 70 },
  sangre_orco:     { name: 'Sangre de Orco',     icon: '🩸', type: 'misc', stack: true, sell: 55 },
  amuleto_orco:    { name: 'Amuleto Orco',       icon: '📿', type: 'misc', stack: true, sell: 120 },
  ojo_troll:       { name: 'Ojo de Troll',       icon: '👁️', type: 'misc', stack: true, sell: 150 },
  cuerno_demonio:  { name: 'Cuerno de Demonio',  icon: '🦄', type: 'misc', stack: true, sell: 400 },
  nucleo_lava:     { name: 'Núcleo de Lava',     icon: '🌋', type: 'misc', stack: true, sell: 450 },
  escama_dragon:   { name: 'Escama de Dragón',   icon: '🐉', type: 'misc', stack: true, sell: 600 },
  corona_esqueleto:{ name: 'Corona del Rey Esqueleto', icon: '👑', type: 'misc', stack: true, sell: 900 },
  corazon_orco:    { name: 'Corazón del Señor Orco',   icon: '🫀', type: 'misc', stack: true, sell: 1100 },
  alma_demonio:    { name: 'Alma del Demonio Supremo', icon: '💎', type: 'misc', stack: true, sell: 3500 },
  gold:            { name: 'Monedas de Oro',     icon: '💰', type: 'gold' },
};

// Lo que vende el mercader Boris
const SHOP = [
  'pocion_vida', 'pocion_vida_g', 'pocion_mana', 'pocion_mana_g',
  'espada_hierro', 'hacha_acero', 'arco_largo', 'ballesta', 'baston_fuego', 'baston_hielo',
  'casco_cuero', 'casco_hierro', 'casco_acero',
  'armadura_cuero', 'cota_malla', 'armadura_placas',
  'escudo_madera', 'escudo_hierro', 'escudo_torre',
];

// Equipo inicial de un personaje nuevo: el mismo héroe puede ser guerrero, arquero o mago
const START_KIT = {
  gold: 60,
  eq: { weapon: 'espada_madera', head: null, body: 'tunica_tela', shield: null },
  inv: [['arco_corto', 1], ['vara_novato', 1], ['pocion_vida', 5], ['pocion_mana', 4]],
};

/* ------------------------------ MONSTRUOS ------------------------------ */
// dmg: [min,max], move: ms por casilla, atkCd: ms entre ataques, aggro: radio de agresión (0 = pasivo)
// range: alcance de ataque (1 = cuerpo a cuerpo), proj: estilo del proyectil
// loot: [id, probabilidad, min, max]
const MONSTERS = {
  // ---- Prado de los Novatos (zona segura) ----
  conejo:   { name: 'Conejo',   icon: '🐇', hp: 14,  dmg: [0, 2],   exp: 3,   move: 600, atkCd: 2000, aggro: 0, respawn: 20000,
              gold: [0, 3],   loot: [['pata_conejo', 0.4, 1, 1]] },
  rata:     { name: 'Rata',     icon: '🐀', hp: 24,  dmg: [1, 4],   exp: 7,   move: 650, atkCd: 1500, aggro: 4, respawn: 25000,
              gold: [0, 6],   loot: [['cola_rata', 0.5, 1, 1], ['pocion_vida', 0.04, 1, 1], ['espada_madera', 0.02, 1, 1]] },
  serpiente:{ name: 'Serpiente',icon: '🐍', hp: 50,  dmg: [3, 7],   exp: 16,  move: 700, atkCd: 1800, aggro: 5, respawn: 30000,
              gold: [2, 12],  loot: [['veneno_serpiente', 0.35, 1, 1], ['casco_cuero', 0.04, 1, 1], ['pocion_mana', 0.05, 1, 1]] },
  arana:    { name: 'Araña',    icon: '🕷️', hp: 75,  dmg: [4, 10],  exp: 28,  move: 550, atkCd: 1500, aggro: 6, respawn: 35000,
              gold: [3, 16],  loot: [['seda_arana', 0.4, 1, 1], ['escudo_madera', 0.05, 1, 1], ['armadura_cuero', 0.04, 1, 1]] },
  // ---- Catacumbas Silenciosas (mazmorra segura) ----
  murcielago:{ name: 'Murciélago', icon: '🦇', hp: 60, dmg: [5, 12], exp: 35, move: 350, atkCd: 1400, aggro: 7, respawn: 30000,
              gold: [0, 10],  loot: [['ala_murcielago', 0.5, 1, 1], ['pocion_vida', 0.08, 1, 1]] },
  esqueleto:{ name: 'Esqueleto',icon: '💀', hp: 130, dmg: [9, 19],  exp: 70,  move: 650, atkCd: 1700, aggro: 6, respawn: 40000,
              gold: [8, 35],  loot: [['hueso', 0.6, 1, 2], ['casco_hierro', 0.05, 1, 1], ['espada_hierro', 0.04, 1, 1], ['escudo_hierro', 0.04, 1, 1], ['pocion_vida', 0.1, 1, 2]] },
  esqueleto_arquero:{ name: 'Esqueleto Arquero', icon: '☠️', hp: 110, dmg: [8, 16], exp: 65, move: 700, atkCd: 2000, aggro: 7, range: 5, proj: 'arrow', respawn: 40000,
              gold: [8, 30],  loot: [['hueso', 0.5, 1, 1], ['arco_largo', 0.04, 1, 1], ['pocion_mana', 0.1, 1, 1]] },
  necrofago:{ name: 'Necrófago',icon: '🧟', hp: 210, dmg: [13, 26], exp: 120, move: 750, atkCd: 1800, aggro: 6, respawn: 50000,
              gold: [15, 55], loot: [['polvo_necro', 0.5, 1, 1], ['cota_malla', 0.05, 1, 1], ['hacha_acero', 0.02, 1, 1], ['pocion_vida_g', 0.06, 1, 1], ['pocion_mana_g', 0.05, 1, 1]] },
  rey_esqueleto:{ name: 'Rey Esqueleto', icon: '🤴', hp: 1200, dmg: [25, 48], exp: 900, move: 500, atkCd: 1500, aggro: 9, respawn: 8 * 60000, boss: true,
              gold: [200, 500], loot: [['corona_esqueleto', 1, 1, 1], ['mandoble_runico', 0.12, 1, 1], ['armadura_placas', 0.15, 1, 1], ['escudo_torre', 0.15, 1, 1], ['pocion_vida_g', 0.9, 2, 5], ['pocion_mana_g', 0.9, 2, 4]] },
  // ---- Bosque Maldito (PvP) ----
  lobo:     { name: 'Lobo Huargo', icon: '🐺', hp: 160, dmg: [11, 22], exp: 95, move: 380, atkCd: 1500, aggro: 7, respawn: 35000,
              gold: [5, 25],  loot: [['piel_lobo', 0.6, 1, 1], ['pocion_vida', 0.15, 1, 2]] },
  oso:      { name: 'Oso Pardo',icon: '🐻', hp: 300, dmg: [15, 30], exp: 170, move: 600, atkCd: 1900, aggro: 5, respawn: 45000,
              gold: [10, 40], loot: [['colmillo_oso', 0.5, 1, 1], ['cota_malla', 0.04, 1, 1], ['pocion_vida_g', 0.06, 1, 1]] },
  orco:     { name: 'Orco Guerrero', icon: '👺', hp: 240, dmg: [13, 28], exp: 140, move: 600, atkCd: 1700, aggro: 6, respawn: 45000,
              gold: [20, 70], loot: [['sangre_orco', 0.5, 1, 1], ['hacha_acero', 0.04, 1, 1], ['casco_acero', 0.04, 1, 1], ['escudo_torre', 0.03, 1, 1], ['pocion_mana', 0.1, 1, 2], ['amuleto_orco', 0.08, 1, 1]] },
  chaman_orco:{ name: 'Chamán Orco', icon: '🧙', hp: 190, dmg: [14, 28], exp: 160, move: 700, atkCd: 2000, aggro: 7, range: 5, proj: 'fire', respawn: 50000,
              gold: [25, 80], loot: [['baston_hielo', 0.03, 1, 1], ['pocion_mana_g', 0.15, 1, 1], ['amuleto_orco', 0.15, 1, 1], ['sangre_orco', 0.4, 1, 1]] },
  senor_orco:{ name: 'Señor Orco', icon: '👹', hp: 1800, dmg: [30, 55], exp: 1500, move: 500, atkCd: 1500, aggro: 9, respawn: 10 * 60000, boss: true,
              gold: [300, 800], loot: [['corazon_orco', 1, 1, 1], ['arco_dragon', 0.08, 1, 1], ['casco_demonio', 0.1, 1, 1], ['armadura_placas', 0.25, 1, 1], ['pocion_vida_g', 0.9, 3, 6]] },
  // ---- Abismo Carmesí (mazmorra PvP) ----
  troll:    { name: 'Troll de Piedra', icon: '🧌', hp: 480, dmg: [26, 46], exp: 300, move: 650, atkCd: 1800, aggro: 6, respawn: 60000,
              gold: [40, 110], loot: [['ojo_troll', 0.5, 1, 1], ['armadura_placas', 0.08, 1, 1], ['casco_demonio', 0.03, 1, 1], ['pocion_vida_g', 0.2, 1, 3], ['mandoble_runico', 0.01, 1, 1]] },
  demonio_menor:{ name: 'Demonio Menor', icon: '😈', hp: 650, dmg: [32, 58], exp: 450, move: 600, atkCd: 2000, aggro: 7, range: 4, proj: 'fire', respawn: 70000,
              gold: [60, 150], loot: [['cuerno_demonio', 0.5, 1, 1], ['escudo_demonio', 0.05, 1, 1], ['baston_arcano', 0.03, 1, 1], ['pocion_mana_g', 0.25, 1, 3]] },
  golem_lava:{ name: 'Gólem de Lava', icon: '🌋', hp: 950, dmg: [38, 64], exp: 600, move: 800, atkCd: 2100, aggro: 6, respawn: 80000,
              gold: [80, 200], loot: [['nucleo_lava', 0.55, 1, 1], ['armadura_dragon', 0.04, 1, 1], ['arco_dragon', 0.03, 1, 1], ['mandoble_runico', 0.03, 1, 1], ['escudo_demonio', 0.04, 1, 1]] },
  dragon:   { name: 'Dragón Ígneo', icon: '🐉', hp: 1500, dmg: [50, 92], exp: 1300, move: 700, atkCd: 2200, aggro: 8, range: 3, proj: 'fire', respawn: 3 * 60000,
              gold: [150, 400], loot: [['escama_dragon', 0.7, 1, 2], ['armadura_dragon', 0.1, 1, 1], ['casco_demonio', 0.08, 1, 1], ['arco_dragon', 0.06, 1, 1], ['baston_arcano', 0.05, 1, 1], ['martillo_titan', 0.01, 1, 1], ['pocion_vida_g', 0.4, 2, 4], ['pocion_mana_g', 0.4, 2, 4]] },
  demonio_supremo:{ name: 'Demonio Supremo', icon: '👿', hp: 4500, dmg: [80, 150], exp: 5000, move: 550, atkCd: 2000, aggro: 10, range: 3, proj: 'fire', respawn: 15 * 60000, boss: true,
              gold: [800, 2000], loot: [['alma_demonio', 1, 1, 1], ['martillo_titan', 0.25, 1, 1], ['arco_celestial', 0.25, 1, 1], ['baston_abismo', 0.25, 1, 1], ['casco_dragon', 0.3, 1, 1], ['armadura_abismo', 0.3, 1, 1], ['escudo_titan', 0.3, 1, 1], ['pocion_vida_g', 1, 5, 10], ['pocion_mana_g', 1, 5, 10]] },
};

// Dónde nace cada monstruo
const SPAWN_PLAN = [
  { zone: 'prado',      type: 'conejo',          n: 16, minY: 57 },
  { zone: 'prado',      type: 'rata',            n: 22, minY: 57 },
  { zone: 'prado',      type: 'serpiente',       n: 14, minY: 62 },
  { zone: 'prado',      type: 'arana',           n: 12, minY: 66 },
  { zone: 'catacumbas', type: 'murcielago',      n: 14 },
  { zone: 'catacumbas', type: 'esqueleto',       n: 18 },
  { zone: 'catacumbas', type: 'esqueleto_arquero', n: 10 },
  { zone: 'catacumbas', type: 'necrofago',       n: 10 },
  { zone: 'bosque',     type: 'lobo',            n: 20 },
  { zone: 'bosque',     type: 'oso',             n: 12 },
  { zone: 'bosque',     type: 'orco',            n: 16 },
  { zone: 'bosque',     type: 'chaman_orco',     n: 10 },
  { zone: 'abismo',     type: 'troll',           n: 10 },
  { zone: 'abismo',     type: 'demonio_menor',   n: 8 },
  { zone: 'abismo',     type: 'golem_lava',      n: 8 },
  { zone: 'abismo',     type: 'dragon',          n: 4 },
];

const NPC_TIPS = [
  '¡Bienvenido, aventurero! Con una espada eres guerrero, con un arco tirador y con una vara mago. Cambia de arma cuando quieras: Z, X y C.',
  'Las zonas verdes son seguras: nadie puede atacarte allí salvo los monstruos. Las zonas rojas son PvP: ¡puedes perder tu botín!',
  'Tus habilidades de combate cuerpo a cuerpo, distancia y magia suben por separado. Entrena la que más uses.',
  'En el Bosque Maldito y el Abismo Carmesí el botín es mejor... pero cualquiera puede arrebatártelo si caes.',
  'Si te atacan otros jugadores no podrás refugiarte en una zona segura durante unos segundos. ¡Pelea o huye al otro lado!',
  'Las Catacumbas (portal al sur) son seguras y tienen un jefe poderoso: el Rey Esqueleto. Ve en grupo.',
  'La poción de vida es la tecla H, la de maná la J, y el hechizo de curación la V.',
];

module.exports = { CFG, ITEMS, SHOP, START_KIT, MONSTERS, SPAWN_PLAN, NPC_TIPS };
