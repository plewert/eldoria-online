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
  INV_SIZE: 48,
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
  FOOD_CD_MS: 1500,             // enfriamiento al comer
  HEAL_AMOUNT: 1000,            // hechizo de curar (V): vida por uso
  HEAL_CD_MS: 4000,             // y su enfriamiento
  BANK_SIZE: 120,
  BANK_MAX: 480, BANK_PACK: 5, BANK_PACK_COST: 1000000,   // ampliar banco: +5 casillas por 1.000.000
  CAVE_FEE: 2000,               // entrada a cada cueva de jefe               // casillas del banco
  TRADE_RANGE: 4,               // distancia máxima para comerciar
  TRADE_MAX_ITEMS: 8,
  TRADE_INVITE_MS: 20000,
  UP_STAT: 0.1,                 // cada +1 sube un 10% el ataque/defensa base
  ANC_MULT: 1.5,                // los Ancient valen x1.5
  PLUS_CHANCE: 0.22,            // prob. de que un arma/armadura soltada venga con +N
  ANCIENT_CHANCE: 0.015,        // prob. de que un equipo soltado sea Ancient (x4 en jefes)
  GEM_CHANCE: 0.0015,           // gemas: 0,15 % por muerte
  GEAR_DROP_MULT: 0.5,          // los equipos raros que sueltan monstruos y jefes caen la mitad de seguido
  BOSS_RARE_MULT: 4,
  MAX_SOCKETS: 3,
  GEM_REMOVE_COST: 250,         // oro por sacar una gema de una ranura
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
  // ---- Comida (tecla K): cura sin gastar pociones; enfriamiento propio ----
  sardina:         { name: 'Sardina',            icon: '🐟', type: 'consumable', food: 1, heal: 80,  stack: true, price: 30, sell: 8 },
  salmon:          { name: 'Salmón',             icon: '🍣', type: 'consumable', food: 1, heal: 100, stack: true, price: 45, sell: 12 },
  tiburon:         { name: 'Tiburón',            icon: '🦈', type: 'consumable', food: 1, heal: 150, stack: true, price: 75, sell: 20 },
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
  // ---- Armas nuevas ----
  espada_dorada:   { name: 'Espada Dorada',      icon: '⚔️', type: 'weapon', style: 'melee', atk: 27, cd: 1100, range: 1, minLevel: 16, price: 1400, sell: 560 },
  maza_enana:      { name: 'Maza Enana',         icon: '🔨', type: 'weapon', style: 'melee', atk: 31, cd: 1250, range: 1, minLevel: 20, sell: 900 },
  cimitarra_desierto:{ name: 'Cimitarra del Desierto', icon: '🗡️', type: 'weapon', style: 'melee', atk: 41, cd: 1100, range: 1, minLevel: 28, sell: 2400 },
  colmillo_hidra:  { name: 'Colmillo de la Hidra', icon: '🐍', type: 'weapon', style: 'melee', atk: 45, cd: 1150, range: 1, minLevel: 32, sell: 3000 },
  hacha_hielo:     { name: 'Hacha de Escarcha',  icon: '🪓', type: 'weapon', style: 'melee', atk: 57, cd: 1200, range: 1, minLevel: 40, sell: 6200 },
  hoja_faraon:     { name: 'Hoja del Faraón',    icon: '⚔️', type: 'weapon', style: 'melee', atk: 67, cd: 1150, range: 1, minLevel: 48, sell: 9000 },
  espada_reina:    { name: 'Espada de la Reina de Hielo', icon: '🗡️', type: 'weapon', style: 'melee', atk: 82, cd: 1200, range: 1, minLevel: 55, sell: 14000 },
  arco_cazador:    { name: 'Arco de Cazador',    icon: '🏹', type: 'weapon', style: 'ranged', atk: 27, cd: 1200, range: 6, minLevel: 16, price: 1450, sell: 580 },
  ballesta_enana:  { name: 'Ballesta Enana',     icon: '🎯', type: 'weapon', style: 'ranged', atk: 32, cd: 1300, range: 6, minLevel: 20, sell: 900 },
  arco_marfil:     { name: 'Arco de Marfil',     icon: '🏹', type: 'weapon', style: 'ranged', atk: 42, cd: 1200, range: 7, minLevel: 28, sell: 2500 },
  arco_glacial:    { name: 'Arco Glacial',       icon: '🏹', type: 'weapon', style: 'ranged', atk: 57, cd: 1250, range: 7, minLevel: 40, sell: 6400 },
  arco_sol:        { name: 'Arco del Sol',       icon: '🏹', type: 'weapon', style: 'ranged', atk: 68, cd: 1250, range: 7, minLevel: 48, sell: 9200 },
  arco_reina:      { name: 'Arco de la Reina',   icon: '🏹', type: 'weapon', style: 'ranged', atk: 83, cd: 1300, range: 8, minLevel: 55, sell: 14500 },
  baston_tormenta: { name: 'Bastón de Tormenta', icon: '⚡', type: 'weapon', style: 'magic', atk: 28, cd: 1300, range: 5, mana: 12, minLevel: 16, price: 1500, sell: 600 },
  baston_cristal:  { name: 'Vara de Cristal',    icon: '🔮', type: 'weapon', style: 'magic', atk: 34, cd: 1300, range: 5, mana: 14, minLevel: 22, sell: 1200 },
  baston_pantano:  { name: 'Bastón del Pantano', icon: '🌿', type: 'weapon', style: 'magic', atk: 42, cd: 1350, range: 5, mana: 18, minLevel: 28, sell: 2600 },
  baston_escarcha: { name: 'Bastón de Escarcha', icon: '❄️', type: 'weapon', style: 'magic', atk: 58, cd: 1350, range: 6, mana: 24, minLevel: 40, sell: 6500 },
  cetro_faraon:    { name: 'Cetro del Faraón',   icon: '🔱', type: 'weapon', style: 'magic', atk: 69, cd: 1400, range: 6, mana: 28, minLevel: 48, sell: 9400 },
  baculo_reina:    { name: 'Báculo de la Reina de Hielo', icon: '🌀', type: 'weapon', style: 'magic', atk: 84, cd: 1400, range: 6, mana: 34, minLevel: 55, sell: 15000 },
  // ---- Cascos nuevos ----
  casco_bronce:    { name: 'Casco de Bronce',    icon: '🪖', type: 'head', def: 9,  minLevel: 16, price: 900, sell: 360 },
  casco_escamas:   { name: 'Casco de Escamas',   icon: '⛑️', type: 'head', def: 13, minLevel: 28, sell: 2000 },
  casco_hielo:     { name: 'Yelmo de Escarcha',  icon: '🪖', type: 'head', def: 18, minLevel: 40, sell: 5200 },
  casco_faraon:    { name: 'Máscara del Faraón', icon: '👑', type: 'head', def: 23, minLevel: 50, sell: 8800 },
  // ---- Armaduras nuevas ----
  armadura_bronce: { name: 'Armadura de Bronce', icon: '🛡️', type: 'body', def: 13, minLevel: 16, price: 1800, sell: 720 },
  armadura_escamas:{ name: 'Armadura de Escamas',icon: '🦺', type: 'body', def: 19, minLevel: 28, sell: 3000 },
  armadura_hielo:  { name: 'Armadura de Escarcha', icon: '🥶', type: 'body', def: 26, minLevel: 40, sell: 7400 },
  armadura_faraon: { name: 'Armadura del Faraón',icon: '🏺', type: 'body', def: 33, minLevel: 50, sell: 12000 },
  // ---- Escudos nuevos ----
  escudo_bronce:   { name: 'Escudo de Bronce',   icon: '🔰', type: 'shield', def: 9,  minLevel: 16, price: 1100, sell: 440 },
  escudo_escamas:  { name: 'Escudo de Escamas',  icon: '🛡️', type: 'shield', def: 13, minLevel: 28, sell: 2300 },
  escudo_hielo:    { name: 'Escudo de Escarcha', icon: '🧊', type: 'shield', def: 19, minLevel: 40, sell: 5800 },
  escudo_faraon:   { name: 'Escudo del Faraón',  icon: '☀️', type: 'shield', def: 24, minLevel: 50, sell: 9500 },
  // ---- Trofeos nuevos ----
  colmillo_jabali: { name: 'Colmillo de Jabalí', icon: '🐗', type: 'misc', stack: true, sell: 45 },
  diente_goblin:   { name: 'Diente de Goblin',   icon: '🦷', type: 'misc', stack: true, sell: 50 },
  bolsa_bandido:   { name: 'Bolsa Robada',       icon: '👛', type: 'misc', stack: true, sell: 95 },
  pinza_cangrejo:  { name: 'Pinza de Cangrejo',  icon: '🦀', type: 'misc', stack: true, sell: 90 },
  perla:           { name: 'Perla del Mar',      icon: '⚪', type: 'misc', stack: true, sell: 160 },
  escama_sirena:   { name: 'Escama de Sirena',   icon: '🐚', type: 'misc', stack: true, sell: 140 },
  caparazon:       { name: 'Caparazón de Tortuga', icon: '🐢', type: 'misc', stack: true, sell: 210 },
  corona_cangrejo: { name: 'Corona del Cangrejo Colosal', icon: '👑', type: 'misc', stack: true, sell: 1400 },
  mineral_hierro:  { name: 'Mineral de Hierro',  icon: '⛏️', type: 'misc', stack: true, sell: 130 },
  barba_enano:     { name: 'Barba de Enano',     icon: '🧔', type: 'misc', stack: true, sell: 110 },
  engranaje:       { name: 'Engranaje Rúnico',   icon: '⚙️', type: 'misc', stack: true, sell: 300 },
  yunque:          { name: 'Yunque de Mithril',  icon: '⚒️', type: 'misc', stack: true, sell: 1800 },
  piel_sapo:       { name: 'Piel de Sapo',       icon: '🐸', type: 'misc', stack: true, sell: 120 },
  lengua_lagarto:  { name: 'Lengua de Lagarto',  icon: '🦎', type: 'misc', stack: true, sell: 180 },
  sombrero_bruja:  { name: 'Sombrero de Bruja',  icon: '🎩', type: 'misc', stack: true, sell: 260 },
  cabeza_hidra:    { name: 'Cabeza de Hidra',    icon: '🐲', type: 'misc', stack: true, sell: 2600 },
  piel_yeti:       { name: 'Piel de Yeti',       icon: '🧤', type: 'misc', stack: true, sell: 330 },
  cristal_hielo:   { name: 'Cristal de Hielo',   icon: '🧊', type: 'misc', stack: true, sell: 380 },
  colmillo_mamut:  { name: 'Colmillo de Mamut',  icon: '🦣', type: 'misc', stack: true, sell: 520 },
  esencia_helada:  { name: 'Esencia Helada',     icon: '🫧', type: 'misc', stack: true, sell: 450 },
  corazon_hielo:   { name: 'Corazón de Hielo Eterno', icon: '💙', type: 'misc', stack: true, sell: 4500 },
  aguijon:         { name: 'Aguijón de Escorpión', icon: '🦂', type: 'misc', stack: true, sell: 260 },
  venda:           { name: 'Venda Antigua',      icon: '🩹', type: 'misc', stack: true, sell: 280 },
  escarabajo:      { name: 'Escarabajo Dorado',  icon: '🪲', type: 'misc', stack: true, sell: 420 },
  amuleto_momia:   { name: 'Amuleto de Escarabajo', icon: '📿', type: 'misc', stack: true, sell: 700 },
  ankh:            { name: 'Ankh del Faraón',    icon: '☥', type: 'misc', stack: true, sell: 5200 },
  polvo_oro:       { name: 'Polvo Dorado',       icon: '✨', type: 'misc', stack: true, sell: 350 },
  gold:            { name: 'Monedas de Oro',     icon: '💰', type: 'gold' },
};

// ------------------------------ GEMAS ------------------------------
// Se engarzan en las ranuras del equipo. Los efectos de todas las gemas equipadas se suman.
const GEMS = {
  rubi:      { name: 'Rubí',      icon: '🔴', col: '#e0503b', sell: 300,  desc: '+3 de ataque',                     fx: { atk: 3 } },
  zafiro:    { name: 'Zafiro',    icon: '🔵', col: '#4f95cf', sell: 300,  desc: '+30 de maná máximo',               fx: { mana: 30 } },
  esmeralda: { name: 'Esmeralda', icon: '🟢', col: '#4cc26a', sell: 300,  desc: '+35 de vida máxima',               fx: { hp: 35 } },
  topacio:   { name: 'Topacio',   icon: '🟡', col: '#e8c04a', sell: 280,  desc: '+3 de defensa',                    fx: { def: 3 } },
  amatista:  { name: 'Amatista',  icon: '🟣', col: '#b07cff', sell: 800,  desc: '+4% de golpe crítico (x1.8)',      fx: { crit: 0.04 } },
  opalo:     { name: 'Ópalo',     icon: '🟠', col: '#f09a5a', sell: 2000, desc: 'Roba el 3% del daño como vida',    fx: { steal: 0.03 } },
  diamante:  { name: 'Diamante',  icon: '💎', col: '#bfe9ff', sell: 1500, desc: 'Brillo +1: tu set resplandece (+1 ataque)', fx: { glow: 1, atk: 1 } },
};
for (const [id, g] of Object.entries(GEMS)) ITEMS[id] = { name: g.name, icon: g.icon, type: 'gem', stack: true, sell: g.sell, col: g.col, desc: g.desc };

// Colores de rareza de los nombres de equipo
const RAR = { normal: '#9aa3ad', plus: '#5fd16a', ancient: '#4aa8ff', none: '#e8e2d0' };

// Lo que vende cada mercader
// ---- Anillos, amuletos y armas nuevas ----
// bonus: se suma al personaje mientras lo lleva puesto (escala con +N y Ancient, salvo crit y steal)
Object.assign(ITEMS, {
  daga_sombra:     { name: 'Daga de Sombra',     icon: '🗡️', type: 'weapon', style: 'melee', atk: 18, cd: 800,  range: 1, minLevel: 12, price: 650, sell: 260 },
  lanza_guerra:    { name: 'Lanza de Guerra',    icon: '🔱', type: 'weapon', style: 'melee', atk: 36, cd: 1150, range: 1, minLevel: 24, sell: 1900 },
  hacha_doble:     { name: 'Hacha Doble de Guerra', icon: '🪓', type: 'weapon', style: 'melee', atk: 52, cd: 1300, range: 1, minLevel: 36, sell: 4800 },
  espada_llamas:   { name: 'Espada de Llamas',   icon: '🔥', type: 'weapon', style: 'melee', atk: 74, cd: 1150, range: 1, minLevel: 50, sell: 11500 },
  ballesta_pesada: { name: 'Ballesta Pesada',    icon: '🎯', type: 'weapon', style: 'ranged', atk: 36, cd: 1350, range: 6, minLevel: 24, sell: 1900 },
  arco_sombras:    { name: 'Arco de Sombras',    icon: '🏹', type: 'weapon', style: 'ranged', atk: 72, cd: 1250, range: 7, minLevel: 50, sell: 11000 },
  baston_hueso:    { name: 'Bastón de Hueso',    icon: '🦴', type: 'weapon', style: 'magic', atk: 24, cd: 1300, range: 5, mana: 10, minLevel: 10, price: 620, sell: 250 },
  baston_solar:    { name: 'Bastón Solar',       icon: '☀️', type: 'weapon', style: 'magic', atk: 62, cd: 1400, range: 6, mana: 26, minLevel: 44, sell: 8200 },
  // anillos (se pueden llevar dos)
  anillo_cobre:    { name: 'Anillo de Cobre',    icon: '💍', type: 'ring', bonus: { def: 2 }, minLevel: 1,  price: 120, sell: 40 },
  anillo_fuerza:   { name: 'Anillo de Fuerza',   icon: '💍', type: 'ring', bonus: { atk: 3 }, minLevel: 8,  price: 700, sell: 280 },
  anillo_vida:     { name: 'Anillo de Vida',     icon: '💍', type: 'ring', bonus: { hp: 30 }, minLevel: 8,  price: 650, sell: 260 },
  anillo_mana:     { name: 'Anillo Arcano',      icon: '💍', type: 'ring', bonus: { mana: 28 }, minLevel: 8, price: 650, sell: 260 },
  anillo_plata:    { name: 'Anillo de Plata',    icon: '💍', type: 'ring', bonus: { def: 5, hp: 20 }, minLevel: 18, sell: 900 },
  anillo_rubi:     { name: 'Anillo de Rubí',     icon: '💍', type: 'ring', bonus: { atk: 8, crit: 0.02 }, minLevel: 24, sell: 1800 },
  anillo_sangre:   { name: 'Anillo de Sangre',   icon: '💍', type: 'ring', bonus: { atk: 5, steal: 0.03 }, minLevel: 30, sell: 2600 },
  anillo_hielo:    { name: 'Anillo de Escarcha', icon: '💍', type: 'ring', bonus: { def: 8, mana: 40 }, minLevel: 40, sell: 5200 },
  anillo_faraon:   { name: 'Anillo del Faraón',  icon: '💍', type: 'ring', bonus: { atk: 12, hp: 60, crit: 0.03 }, minLevel: 50, sell: 9800 },
  // amuletos
  amuleto_hueso:   { name: 'Amuleto de Hueso',   icon: '📿', type: 'amulet', bonus: { def: 1, hp: 15 }, minLevel: 1, price: 150, sell: 50 },
  amuleto_jade:    { name: 'Amuleto de Jade',    icon: '📿', type: 'amulet', bonus: { def: 4, mana: 30 }, minLevel: 10, price: 900, sell: 360 },
  amuleto_vigor:   { name: 'Amuleto de Vigor',   icon: '📿', type: 'amulet', bonus: { hp: 70 }, minLevel: 15, sell: 1100 },
  amuleto_dragon:  { name: 'Amuleto de Dragón',  icon: '📿', type: 'amulet', bonus: { atk: 10, hp: 50 }, minLevel: 30, sell: 3300 },
  amuleto_sol:     { name: 'Amuleto del Sol',    icon: '📿', type: 'amulet', bonus: { def: 8, mana: 60, crit: 0.04 }, minLevel: 40, sell: 6800 },
  amuleto_abismo:  { name: 'Amuleto del Abismo', icon: '📿', type: 'amulet', bonus: { atk: 15, steal: 0.04 }, minLevel: 45, sell: 8800 },
  amuleto_faraon:  { name: 'Amuleto del Faraón', icon: '📿', type: 'amulet', bonus: { atk: 10, def: 10, hp: 90 }, minLevel: 50, sell: 12500 },
});


const SHOPS = {
  durgan: [],
  marela: [],   // Alba Dorada: pescado, cañas y cebos (se rellena al final)
  zaroth: [],   // Alba Dorada: armas mágicas (se rellena al final)   // Gremio de Mineros: picos (se rellena en mining.js)
  boris: [
    'sardina', 'salmon', 'tiburon',
    'pocion_vida', 'pocion_vida_g', 'pocion_mana', 'pocion_mana_g',
    'espada_hierro', 'hacha_acero', 'arco_largo', 'ballesta', 'baston_fuego', 'baston_hielo', 'baston_hueso',
    'anillo_cobre', 'anillo_fuerza', 'anillo_vida', 'anillo_mana', 'amuleto_hueso', 'amuleto_jade',
    'casco_cuero', 'casco_hierro', 'casco_acero',
    'armadura_cuero', 'cota_malla', 'armadura_placas',
    'escudo_madera', 'escudo_hierro', 'escudo_torre',
  ],
  nilo: [
    'sardina', 'salmon', 'tiburon', 'pocion_vida', 'pocion_vida_g', 'pocion_mana', 'pocion_mana_g',
  ],
  brisa: [
    'sardina', 'salmon', 'tiburon',
    'pocion_vida_g', 'pocion_mana_g',
    'espada_dorada', 'arco_cazador', 'baston_tormenta', 'daga_sombra',
    'casco_bronce', 'armadura_bronce', 'escudo_bronce',
  ],
};
const SHOP = SHOPS.boris;

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
  // ---- Colinas Doradas (segura) ----
  jabali:   { name: 'Jabalí', icon: '🐗', hp: 260, dmg: [16, 30], exp: 130, move: 430, atkCd: 1700, aggro: 5, respawn: 40000,
              gold: [8, 30], loot: [['colmillo_jabali', 0.55, 1, 1], ['pocion_vida', 0.12, 1, 2], ['casco_hierro', 0.04, 1, 1], ['espada_dorada', 0.012, 1, 1]] },
  goblin:   { name: 'Goblin', icon: '🦹', hp: 230, dmg: [14, 26], exp: 115, move: 450, atkCd: 1500, aggro: 6, respawn: 40000,
              gold: [10, 40], loot: [['diente_goblin', 0.55, 1, 1], ['espada_dorada', 0.015, 1, 1], ['arco_cazador', 0.015, 1, 1], ['pocion_mana', 0.1, 1, 2]] },
  arquero_goblin:{ name: 'Goblin Arquero', icon: '🥷', hp: 200, dmg: [13, 24], exp: 110, move: 650, atkCd: 2000, aggro: 7, range: 5, proj: 'arrow', respawn: 40000,
              gold: [10, 35], loot: [['diente_goblin', 0.4, 1, 1], ['arco_cazador', 0.03, 1, 1], ['pocion_vida', 0.12, 1, 2]] },
  bandido:  { name: 'Bandido', icon: '🕵️', hp: 320, dmg: [18, 34], exp: 170, move: 600, atkCd: 1700, aggro: 6, respawn: 45000,
              gold: [30, 90], loot: [['bolsa_bandido', 0.5, 1, 1], ['armadura_bronce', 0.02, 1, 1], ['casco_bronce', 0.03, 1, 1], ['escudo_bronce', 0.03, 1, 1], ['pocion_vida_g', 0.08, 1, 1]] },
  // ---- Playa de Cristal (segura) ----
  cangrejo: { name: 'Cangrejo Gigante', icon: '🦀', hp: 380, dmg: [20, 36], exp: 190, move: 520, atkCd: 1800, aggro: 4, respawn: 45000,
              gold: [20, 60], loot: [['pinza_cangrejo', 0.55, 1, 1], ['pocion_mana_g', 0.08, 1, 1], ['escudo_bronce', 0.03, 1, 1]] },
  sirena:   { name: 'Sirena', icon: '🧜‍♀️', hp: 330, dmg: [18, 34], exp: 210, move: 700, atkCd: 2000, aggro: 7, range: 5, proj: 'ice', respawn: 50000,
              gold: [30, 80], loot: [['escama_sirena', 0.5, 1, 1], ['perla', 0.2, 1, 1], ['baston_tormenta', 0.03, 1, 1], ['pocion_mana_g', 0.15, 1, 2]] },
  tortuga:  { name: 'Tortuga Gigante', icon: '🐢', hp: 700, dmg: [22, 38], exp: 260, move: 900, atkCd: 2200, aggro: 3, respawn: 55000,
              gold: [30, 100], loot: [['caparazon', 0.5, 1, 1], ['perla', 0.15, 1, 1], ['armadura_bronce', 0.04, 1, 1]] },
  cangrejo_colosal:{ name: 'Cangrejo Colosal', icon: '🦞', hp: 2600, dmg: [38, 64], exp: 1700, move: 650, atkCd: 1700, aggro: 8, respawn: 8 * 60000, boss: true,
              gold: [300, 700], loot: [['corona_cangrejo', 1, 1, 1], ['espada_dorada', 0.2, 1, 1], ['arco_cazador', 0.2, 1, 1], ['baston_tormenta', 0.2, 1, 1], ['armadura_bronce', 0.3, 1, 1], ['perla', 1, 2, 4], ['pocion_vida_g', 0.9, 2, 4]] },
  // ---- Minas Enanas (mazmorra segura) ----
  kobold:   { name: 'Kobold', icon: '🦊', hp: 300, dmg: [20, 36], exp: 180, move: 480, atkCd: 1500, aggro: 7, respawn: 40000,
              gold: [15, 50], loot: [['mineral_hierro', 0.55, 1, 2], ['maza_enana', 0.02, 1, 1], ['pocion_vida_g', 0.08, 1, 1]] },
  enano_renegado:{ name: 'Enano Renegado', icon: '🧔', hp: 480, dmg: [26, 44], exp: 260, move: 650, atkCd: 1800, aggro: 6, respawn: 45000,
              gold: [40, 110], loot: [['barba_enano', 0.5, 1, 1], ['maza_enana', 0.03, 1, 1], ['casco_escamas', 0.02, 1, 1], ['escudo_escamas', 0.02, 1, 1], ['pocion_vida_g', 0.15, 1, 2]] },
  golem_hierro:{ name: 'Gólem de Hierro', icon: '🤖', hp: 900, dmg: [34, 56], exp: 420, move: 850, atkCd: 2100, aggro: 5, respawn: 60000,
              gold: [60, 140], loot: [['engranaje', 0.5, 1, 1], ['mineral_hierro', 0.6, 1, 3], ['armadura_escamas', 0.03, 1, 1], ['casco_escamas', 0.03, 1, 1], ['baston_cristal', 0.03, 1, 1], ['ballesta_enana', 0.03, 1, 1]] },
  arana_cueva:{ name: 'Araña de Cueva', icon: '🕷️', hp: 420, dmg: [24, 42], exp: 240, move: 500, atkCd: 1500, aggro: 7, respawn: 45000,
              gold: [20, 70], loot: [['seda_arana', 0.6, 1, 3], ['veneno_serpiente', 0.4, 1, 2], ['pocion_mana_g', 0.1, 1, 1]] },
  maestro_forjador:{ name: 'Maestro Forjador', icon: '⚒️', hp: 3600, dmg: [48, 80], exp: 2600, move: 600, atkCd: 1700, aggro: 9, respawn: 9 * 60000, boss: true,
              gold: [400, 900], loot: [['yunque', 1, 1, 1], ['maza_enana', 0.25, 1, 1], ['ballesta_enana', 0.25, 1, 1], ['armadura_escamas', 0.2, 1, 1], ['casco_escamas', 0.2, 1, 1], ['escudo_escamas', 0.2, 1, 1], ['baston_cristal', 0.25, 1, 1], ['pocion_vida_g', 1, 3, 6]] },
  // ---- Pantano Venenoso (PvP) ----
  sapo:     { name: 'Sapo Gigante', icon: '🐸', hp: 520, dmg: [26, 44], exp: 300, move: 420, atkCd: 1600, aggro: 5, respawn: 40000,
              gold: [20, 70], loot: [['piel_sapo', 0.6, 1, 2], ['pocion_vida_g', 0.1, 1, 2]] },
  lagarto:  { name: 'Lagarto del Pantano', icon: '🦎', hp: 680, dmg: [32, 54], exp: 380, move: 520, atkCd: 1700, aggro: 6, respawn: 45000,
              gold: [40, 110], loot: [['lengua_lagarto', 0.5, 1, 1], ['casco_escamas', 0.03, 1, 1], ['armadura_escamas', 0.025, 1, 1], ['cimitarra_desierto', 0.01, 1, 1]] },
  bruja:    { name: 'Bruja del Pantano', icon: '🧙‍♀️', hp: 560, dmg: [30, 52], exp: 420, move: 700, atkCd: 2000, aggro: 8, range: 5, proj: 'poison', respawn: 50000,
              gold: [50, 130], loot: [['sombrero_bruja', 0.5, 1, 1], ['baston_pantano', 0.03, 1, 1], ['pocion_mana_g', 0.2, 1, 3], ['escudo_escamas', 0.03, 1, 1]] },
  hidra:    { name: 'Hidra de Tres Cabezas', icon: '🐲', hp: 5200, dmg: [62, 104], exp: 3400, move: 600, atkCd: 1900, aggro: 9, range: 3, proj: 'poison', respawn: 12 * 60000, boss: true,
              gold: [500, 1200], loot: [['cabeza_hidra', 1, 1, 1], ['colmillo_hidra', 0.25, 1, 1], ['baston_pantano', 0.25, 1, 1], ['cimitarra_desierto', 0.2, 1, 1], ['armadura_escamas', 0.3, 1, 1], ['pocion_vida_g', 1, 3, 7], ['pocion_mana_g', 1, 3, 6]] },
  // ---- Dunas Ardientes (PvP) ----
  escorpion:{ name: 'Escorpión Gigante', icon: '🦂', hp: 620, dmg: [34, 56], exp: 380, move: 480, atkCd: 1600, aggro: 6, respawn: 40000,
              gold: [30, 90], loot: [['aguijon', 0.55, 1, 1], ['cimitarra_desierto', 0.015, 1, 1], ['pocion_vida_g', 0.1, 1, 2]] },
  cobra:    { name: 'Cobra Real', icon: '🐍', hp: 520, dmg: [38, 62], exp: 400, move: 350, atkCd: 1400, aggro: 7, respawn: 40000,
              gold: [30, 90], loot: [['veneno_serpiente', 0.6, 1, 2], ['arco_marfil', 0.02, 1, 1]] },
  momia:    { name: 'Momia', icon: '🩹', hp: 820, dmg: [40, 66], exp: 500, move: 750, atkCd: 1900, aggro: 6, respawn: 50000,
              gold: [40, 120], loot: [['venda', 0.55, 1, 2], ['casco_escamas', 0.04, 1, 1], ['cimitarra_desierto', 0.02, 1, 1], ['arco_marfil', 0.02, 1, 1], ['pocion_mana_g', 0.12, 1, 2]] },
  gusano_arena:{ name: 'Gusano de Arena', icon: '🪱', hp: 1400, dmg: [52, 88], exp: 760, move: 800, atkCd: 2200, aggro: 4, respawn: 70000,
              gold: [60, 160], loot: [['polvo_oro', 0.6, 1, 2], ['armadura_escamas', 0.04, 1, 1], ['escudo_escamas', 0.04, 1, 1], ['arco_marfil', 0.03, 1, 1]] },
  rey_escorpion:{ name: 'Rey Escorpión', icon: '🦂', hp: 5600, dmg: [64, 108], exp: 4200, move: 550, atkCd: 1700, aggro: 9, respawn: 12 * 60000, boss: true,
              gold: [600, 1400], loot: [['aguijon', 1, 2, 4], ['cimitarra_desierto', 0.3, 1, 1], ['arco_marfil', 0.3, 1, 1], ['casco_escamas', 0.3, 1, 1], ['escudo_escamas', 0.3, 1, 1], ['pocion_vida_g', 1, 4, 8]] },
  // ---- Pirámide Olvidada (mazmorra PvP) ----
  escarabajo_gigante:{ name: 'Escarabajo Gigante', icon: '🪲', hp: 1100, dmg: [56, 92], exp: 800, move: 500, atkCd: 1500, aggro: 7, respawn: 55000,
              gold: [60, 150], loot: [['escarabajo', 0.5, 1, 1], ['amuleto_momia', 0.1, 1, 1], ['casco_faraon', 0.01, 1, 1]] },
  sacerdote_momia:{ name: 'Sacerdote Momia', icon: '🧞', hp: 1000, dmg: [60, 98], exp: 950, move: 700, atkCd: 2000, aggro: 8, range: 5, proj: 'fire', respawn: 60000,
              gold: [80, 180], loot: [['amuleto_momia', 0.3, 1, 1], ['cetro_faraon', 0.02, 1, 1], ['pocion_mana_g', 0.3, 1, 3], ['escudo_faraon', 0.02, 1, 1]] },
  momia_real:{ name: 'Momia Real', icon: '👳', hp: 1700, dmg: [68, 112], exp: 1250, move: 700, atkCd: 1900, aggro: 7, respawn: 70000,
              gold: [100, 220], loot: [['venda', 0.7, 1, 2], ['armadura_faraon', 0.03, 1, 1], ['hoja_faraon', 0.015, 1, 1], ['casco_faraon', 0.03, 1, 1], ['escudo_faraon', 0.03, 1, 1]] },
  faraon:   { name: 'Faraón Eterno', icon: '🏺', hp: 9500, dmg: [95, 160], exp: 9000, move: 520, atkCd: 1800, aggro: 10, range: 4, proj: 'fire', respawn: 15 * 60000, boss: true,
              gold: [1000, 2400], loot: [['ankh', 1, 1, 1], ['hoja_faraon', 0.3, 1, 1], ['cetro_faraon', 0.3, 1, 1], ['arco_sol', 0.3, 1, 1], ['casco_faraon', 0.4, 1, 1], ['armadura_faraon', 0.4, 1, 1], ['escudo_faraon', 0.4, 1, 1], ['pocion_vida_g', 1, 6, 10], ['pocion_mana_g', 1, 6, 10]] },
  // ---- Cumbres Heladas (PvP) ----
  lobo_hielo:{ name: 'Lobo de Hielo', icon: '🐺', hp: 780, dmg: [42, 70], exp: 520, move: 330, atkCd: 1400, aggro: 8, respawn: 40000,
              gold: [30, 100], loot: [['piel_lobo', 0.6, 1, 2], ['cristal_hielo', 0.1, 1, 1], ['hacha_hielo', 0.01, 1, 1]] },
  yeti:     { name: 'Yeti', icon: '🦍', hp: 1300, dmg: [56, 92], exp: 780, move: 650, atkCd: 1900, aggro: 6, respawn: 55000,
              gold: [50, 140], loot: [['piel_yeti', 0.55, 1, 1], ['casco_hielo', 0.03, 1, 1], ['armadura_hielo', 0.025, 1, 1], ['hacha_hielo', 0.02, 1, 1]] },
  elemental_hielo:{ name: 'Elemental de Hielo', icon: '🧊', hp: 900, dmg: [50, 84], exp: 700, move: 700, atkCd: 2000, aggro: 7, range: 4, proj: 'ice', respawn: 55000,
              gold: [50, 140], loot: [['cristal_hielo', 0.55, 1, 1], ['baston_escarcha', 0.025, 1, 1], ['pocion_mana_g', 0.2, 1, 3], ['escudo_hielo', 0.03, 1, 1]] },
  mamut:    { name: 'Mamut', icon: '🦣', hp: 2200, dmg: [70, 116], exp: 1100, move: 850, atkCd: 2200, aggro: 4, respawn: 75000,
              gold: [80, 200], loot: [['colmillo_mamut', 0.6, 1, 1], ['armadura_hielo', 0.04, 1, 1], ['escudo_hielo', 0.04, 1, 1], ['arco_glacial', 0.02, 1, 1], ['pocion_vida_g', 0.3, 1, 3]] },
  // ---- Fortaleza de Hielo (mazmorra PvP) ----
  caballero_hielo:{ name: 'Caballero de Hielo', icon: '🤺', hp: 1800, dmg: [78, 128], exp: 1500, move: 650, atkCd: 1800, aggro: 7, respawn: 65000,
              gold: [100, 240], loot: [['esencia_helada', 0.5, 1, 1], ['hacha_hielo', 0.03, 1, 1], ['casco_hielo', 0.04, 1, 1], ['escudo_hielo', 0.04, 1, 1]] },
  espectro_helado:{ name: 'Espectro Helado', icon: '👻', hp: 1400, dmg: [74, 120], exp: 1700, move: 550, atkCd: 2000, aggro: 9, range: 5, proj: 'ice', respawn: 65000,
              gold: [100, 240], loot: [['esencia_helada', 0.6, 1, 2], ['baston_escarcha', 0.035, 1, 1], ['arco_glacial', 0.03, 1, 1], ['pocion_mana_g', 0.3, 1, 3]] },
  golem_hielo:{ name: 'Gólem de Hielo', icon: '⛄', hp: 3200, dmg: [96, 150], exp: 2100, move: 900, atkCd: 2300, aggro: 5, respawn: 80000,
              gold: [150, 320], loot: [['cristal_hielo', 0.8, 1, 3], ['armadura_hielo', 0.06, 1, 1], ['hacha_hielo', 0.04, 1, 1], ['espada_reina', 0.003, 1, 1]] },
  reina_hielo:{ name: 'Reina de Hielo', icon: '👸', hp: 12000, dmg: [110, 180], exp: 12000, move: 550, atkCd: 1800, aggro: 10, range: 5, proj: 'ice', respawn: 18 * 60000, boss: true,
              gold: [1200, 3000], loot: [['corazon_hielo', 1, 1, 1], ['espada_reina', 0.25, 1, 1], ['arco_reina', 0.25, 1, 1], ['baculo_reina', 0.25, 1, 1], ['casco_hielo', 0.5, 1, 1], ['armadura_hielo', 0.5, 1, 1], ['escudo_hielo', 0.5, 1, 1], ['pocion_vida_g', 1, 8, 12], ['pocion_mana_g', 1, 8, 12]] },
};

// Dónde nace cada monstruo
const SPAWN_PLAN = [
  // box: [x0,y0,x1,y1] limita dónde puede nacer dentro de la zona
  { zone: 'prado',      type: 'conejo',          n: 16, box: [31, 60, 111, 95] },
  { zone: 'prado',      type: 'rata',            n: 22, box: [31, 60, 111, 95] },
  { zone: 'prado',      type: 'serpiente',       n: 14, box: [31, 72, 111, 95] },
  { zone: 'prado',      type: 'arana',           n: 12, box: [31, 80, 111, 95] },
  { zone: 'selva',      type: 'oso',             n: 14 },
  { zone: 'selva',      type: 'troll',           n: 12 },
  { zone: 'selva',      type: 'bruja',           n: 12 },
  { zone: 'selva',      type: 'lagarto',         n: 16 },
  { zone: 'selva',      type: 'cobra',           n: 14 },
  { zone: 'sabana',     type: 'jabali',          n: 22 },
  { zone: 'sabana',     type: 'bandido',         n: 16 },
  { zone: 'sabana',     type: 'goblin',          n: 18 },
  { zone: 'sabana',     type: 'arquero_goblin',  n: 12 },
  { zone: 'sabana',     type: 'escarabajo_gigante', n: 10 },
  { zone: 'volcan',     type: 'golem_lava',      n: 26 },
  { zone: 'volcan',     type: 'demonio_menor',   n: 22 },
  { zone: 'volcan',     type: 'dragon',          n: 12 },
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
  { zone: 'colinas',    type: 'jabali',          n: 18 },
  { zone: 'colinas',    type: 'goblin',          n: 18 },
  { zone: 'colinas',    type: 'arquero_goblin',  n: 12 },
  { zone: 'colinas',    type: 'bandido',         n: 12 },
  { zone: 'playa',      type: 'cangrejo',        n: 18 },
  { zone: 'playa',      type: 'sirena',          n: 10 },
  { zone: 'playa',      type: 'tortuga',         n: 8 },
  { zone: 'minas',      type: 'kobold',          n: 16 },
  { zone: 'minas',      type: 'enano_renegado',  n: 14 },
  { zone: 'minas',      type: 'golem_hierro',    n: 8 },
  { zone: 'minas',      type: 'arana_cueva',     n: 10 },
  { zone: 'pantano',    type: 'sapo',            n: 20 },
  { zone: 'pantano',    type: 'lagarto',         n: 16 },
  { zone: 'pantano',    type: 'bruja',           n: 12 },
  { zone: 'dunas',      type: 'escorpion',       n: 22, box: [140, 35, 179, 99] },
  { zone: 'dunas',      type: 'cobra',           n: 16, box: [140, 35, 179, 99] },
  { zone: 'dunas',      type: 'momia',           n: 14, box: [140, 35, 179, 99] },
  { zone: 'dunas',      type: 'gusano_arena',    n: 8,  box: [140, 35, 179, 99] },
  { zone: 'piramide',   type: 'escarabajo_gigante', n: 16 },
  { zone: 'piramide',   type: 'sacerdote_momia', n: 12 },
  { zone: 'piramide',   type: 'momia_real',      n: 12 },
  { zone: 'cumbres',    type: 'lobo_hielo',      n: 20 },
  { zone: 'cumbres',    type: 'yeti',            n: 14 },
  { zone: 'cumbres',    type: 'elemental_hielo', n: 12 },
  { zone: 'cumbres',    type: 'mamut',           n: 8 },
  { zone: 'fortaleza',  type: 'caballero_hielo', n: 14 },
  { zone: 'fortaleza',  type: 'espectro_helado', n: 10 },
  { zone: 'fortaleza',  type: 'golem_hielo',     n: 8 },
];

const NPC_TIPS = [
  '¡Bienvenido, aventurero! Con una espada eres guerrero, con un arco tirador y con una vara mago. Cambia de arma cuando quieras: Z, X y C.',
  'Las zonas verdes son seguras: nadie puede atacarte allí salvo los monstruos. Las zonas rojas son PvP: ¡puedes perder tu botín!',
  'Tus habilidades de combate cuerpo a cuerpo, distancia y magia suben por separado. Entrena la que más uses.',
  'El nombre del equipo te dice su valor: gris es normal, verde es excelente (+1 a +6) y azul es Ancient, ¡rarísimo!',
  'Las gemas se engarzan en las ranuras del equipo (clic derecho en el objeto, solo en zona segura). Rubí ataque, Esmeralda vida, Diamante brillo...',
  'Guarda tus gemas y objetos valiosos en el banco con Gerda. Lo que está en el banco no se pierde si te matan.',
  'Clic derecho en un jugador para comerciar con él. Clic derecho en un monstruo para ver qué botín suelta.',
  'Hay un puerto al sur, Puerto Marea, con otro mercader y otro banco. Las Minas Enanas son seguras; la Pirámide y la Fortaleza de Hielo no.',
  'La poción de vida es la tecla H, la de maná la J, y el hechizo de curación la V.',
];

// ---- Botín de anillos, amuletos y armas nuevas: [monstruo, objeto, probabilidad] ----
const EXTRA_LOOT = [
  ['rata', 'anillo_cobre', 0.02], ['esqueleto', 'amuleto_hueso', 0.04], ['esqueleto', 'baston_hueso', 0.015],
  ['esqueleto_arquero', 'ballesta_pesada', 0.02], ['necrofago', 'anillo_plata', 0.012], ['rey_esqueleto', 'amuleto_vigor', 0.25],
  ['orco', 'anillo_fuerza', 0.02], ['troll', 'lanza_guerra', 0.012], ['troll', 'amuleto_vigor', 0.02],
  ['senor_orco', 'hacha_doble', 0.2], ['senor_orco', 'anillo_sangre', 0.25], ['golem_lava', 'espada_llamas', 0.015],
  ['demonio_menor', 'anillo_rubi', 0.02], ['demonio_menor', 'arco_sombras', 0.008], ['dragon', 'amuleto_dragon', 0.03],
  ['demonio_supremo', 'espada_llamas', 0.15], ['demonio_supremo', 'amuleto_abismo', 0.3], ['demonio_supremo', 'arco_sombras', 0.12],
  ['hidra', 'anillo_sangre', 0.1], ['momia_real', 'baston_solar', 0.01], ['faraon', 'baston_solar', 0.15], ['faraon', 'anillo_faraon', 0.3],
  ['faraon', 'amuleto_faraon', 0.2], ['yeti', 'anillo_hielo', 0.015], ['reina_hielo', 'anillo_hielo', 0.3], ['reina_hielo', 'amuleto_sol', 0.25],
  ['caballero_hielo', 'amuleto_sol', 0.01], ['maestro_forjador', 'anillo_plata', 0.2], ['maestro_forjador', 'lanza_guerra', 0.15],
];
for (const [m, id, ch] of EXTRA_LOOT) if (MONSTERS[m]) MONSTERS[m].loot.push([id, ch, 1, 1]);
require('./mage').build(ITEMS, SHOPS, MONSTERS);
{
  const X = require('./extra');
  Object.assign(ITEMS, X.EXTRA_ITEMS);
  MONSTERS[X.BOSS.type] = X.BOSS.def;
  require('./titan').build(ITEMS, MONSTERS, X.BOSS.type);
  MONSTERS[X.DRAGON.type] = X.DRAGON.def;
  require('./shadow').build(ITEMS, MONSTERS, X.DRAGON.type);
  MONSTERS[X.JADE.type] = X.JADE.def;
  require('./jade').build(ITEMS, MONSTERS, X.JADE.type);
  MONSTERS[X.ANGEL.type] = X.ANGEL.def;
  require('./angel').build(ITEMS, MONSTERS, X.ANGEL.type);
  MONSTERS[X.SPIDER.type] = X.SPIDER.def; MONSTERS[X.SPIDER.minion.type] = X.SPIDER.minion.def;
  require('./spider').build(ITEMS, MONSTERS, X.SPIDER.type);
  MONSTERS[X.LEVIATAN.type] = X.LEVIATAN.def;
  require('./leviatan').build(ITEMS, MONSTERS, X.LEVIATAN.type);
  require('./magma').build(ITEMS, MONSTERS);
  require('./anubis').build(ITEMS, MONSTERS);
  require('./raid').build(ITEMS, MONSTERS);
  require('./regiones').build(ITEMS, MONSTERS, SPAWN_PLAN);
  require('./bosspets').build(ITEMS, MONSTERS);
  require('./fishing').build(ITEMS, SHOPS);
  require('./mining').build(ITEMS, SHOPS);
  require('./tablets').build(ITEMS, SHOPS);
  SHOPS.marela.push(...SHOPS.nilo);
  SHOPS.brisa.push('mascota_lobito', 'mascota_murcielago', 'mascota_goblin', 'montura_lobo', 'montura_oso');
  const rare = [['lobo', 'mascota_lobito', 0.004], ['murcielago', 'mascota_murcielago', 0.003], ['goblin', 'mascota_goblin', 0.003], ['dragon', 'mascota_dragoncito', 0.01],
    ['espectro_helado', 'mascota_fantasma', 0.006], ['lobo_hielo', 'montura_lobo', 0.002], ['oso', 'montura_oso', 0.002], ['dragon', 'pluma_fenix', 0.08], ['faraon', 'pluma_fenix', 0.5],
    ['elemental_hielo', 'cristal_arcano', 0.12], ['golem_hielo', 'cristal_arcano', 0.3], ['espectro_helado', 'cristal_arcano', 0.1], ['hidra', 'montura_dragon', 0.03], ['reina_hielo', 'montura_dragon', 0.2]];
  for (const [m, id, ch] of rare) if (MONSTERS[m]) MONSTERS[m].loot.push([id, ch, 1, 1]);
  SHOPS.zaroth.push('pocion_mana', 'pocion_mana_g', ...Object.keys(ITEMS).filter((k) => ITEMS[k].type === 'weapon' && ITEMS[k].style === 'magic' && ITEMS[k].price).sort((a, b) => ITEMS[a].price - ITEMS[b].price));   // Zaroth: todas las armas mágicas a la venta
}

// Nivel de cada monstruo (se muestra sobre su cabeza): sale de la experiencia que da, salvo los que fijan el suyo.
for (const d of Object.values(MONSTERS)) if (!d.lv) d.lv = Math.max(1, Math.round(0.6 * Math.sqrt(d.exp)));

module.exports = { CFG, ITEMS, GEMS, RAR, SHOP, SHOPS, START_KIT, MONSTERS, SPAWN_PLAN, NPC_TIPS };
