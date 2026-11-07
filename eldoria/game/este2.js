'use strict';
/**
 * Ampliación Este II: Llanuras del Amanecer (la Alianza Heroica: grifos, hadas, gólem, orco y bestia águila, héroes renegados)
 * y Bosque Susurrante (la Legión de los No Muertos: zombis, banshee, nigromantes, ogro zombi, caudillo y ents).
 * - 23 monstruos con animaciones (public/sprites.json) y 8 mini-jefes que sueltan el set de Thorne.
 * - 4 cuevas de dificultad creciente (Cripta del Rey Ogro, Nido del Grifo Real, Santuario del Ent Ancestral, Osario del Dragón Esqueleto),
 *   cada una con su jefe y un set de equipo: Kaelen, Aeliana, Valeria y Eldrin. Los jefes usan 6 ataques con aviso en el suelo.
 * - 6 armas nuevas con 3 especiales cada una (en especiales.js) y 2 objetos de mano (carcaj y escudo) con especial.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const L = (it, ch, a, b) => [it, ch, a, b];

/* ------------------------------ equipo (hoja «Drops de equipamiento y armas») ------------------------------ */
/** [id, nombre, sprite, tipo, nivel, valor (def o ataque), bonus, probabilidad, opciones] */
const SETS = {
  thorne: [   // 5.º set: lo sueltan los mini-jefes de las dos zonas abiertas
    ['th_arco',   'Arco Largo Recurvo',        'th_bow',    'weapon', 60, 205, { crit: 0.04 }, 0.05, { style: 'ranged', cd: 950, range: 8 }],
    ['th_daga',   'Daga de la Garra',          'th_dagger', 'weapon', 60, 185, { crit: 0.07 }, 0.05, { style: 'melee', cd: 650, range: 1, el: 'poison' }],
    ['th_jubon',  'Jubón de Cuero Reforzado',  'th_jerkin', 'body',   62, 74,  { hp: 380, atk: 9 }, 0.06, {}],
  ],
  kaelen: [   // Cripta del Rey Ogro
    ['ka_arco',      'Arco del Guardabosques Verdante', 'ka_bow',      'weapon', 80, 228, { atk: 8 }, 0.035, { style: 'ranged', cd: 1000, range: 8, el: 'poison' }],
    ['ka_carcaj',    'Carcaj de Susurros',              'ka_quiver',   'shield', 80, 34,  { hp: 220, atk: 9, crit: 0.03 }, 0.06, {}],
    ['ka_guantes',   'Guanteletes Caelum',              'ka_gauntlet', 'gloves', 80, 38,  { hp: 250, atk: 13, crit: 0.02 }, 0.06, {}],
  ],
  aeliana: [  // Nido del Grifo Real
    ['ae_baston',    'Báculo de la Hechicera Estelar',  'ae_staff',    'weapon', 100, 255, { mana: 150 }, 0.035, { style: 'magic', cd: 1100, range: 7, el: 'ice' }],
    ['ae_tunica',    'Túnica Tejeluna',                 'ae_robe',     'body',   100, 92,  { hp: 560, mana: 190, atk: 14 }, 0.05, {}],
    ['ae_diadema',   'Diadema Rúnica',                  'ae_circlet',  'head',   100, 56,  { hp: 330, mana: 160, crit: 0.03 }, 0.06, {}],
  ],
  valeria: [  // Santuario del Ent Ancestral
    ['va_espada',    'Hoja Rúnica Ancestral',           'va_sword',    'weapon', 120, 288, { atk: 12, crit: 0.03 }, 0.035, { style: 'melee', cd: 1100, range: 1, el: 'arcane' }],
    ['va_escudo',    'Escudo de Escamas de Dragón',     'va_shield',   'shield', 120, 72,  { hp: 520, atk: 6 }, 0.05, {}],
    ['va_guantes',   'Guanteletes de la Fortaleza',     'va_gauntlet', 'gloves', 120, 46,  { hp: 300, atk: 15 }, 0.06, {}],
  ],
  eldrin: [   // Osario del Dragón Esqueleto
    ['el_baston',    'Báculo del Invocador del Vacío',  'el_staff',    'weapon', 140, 298, { mana: 210, crit: 0.03 }, 0.035, { style: 'magic', cd: 1150, range: 7, el: 'void' }],
    ['el_capa',      'Capa Tejesombras',                'el_cloak',    'cape',   140, 48,  { hp: 420, atk: 14, crit: 0.03 }, 0.05, {}],
    ['el_anillo',    'Anillo de Éter',                  'el_ring',     'ring',   140, 0,   { atk: 22, hp: 320, mana: 140, crit: 0.03 }, 0.05, {}],
  ],
};
const ICON = { weapon: '⚔️', head: '⛑️', body: '🛡️', gloves: '🧤', shield: '🛡️', cape: '🧣', ring: '💍' };
const WICON = { ranged: '🏹', magic: '🔮', melee: '⚔️' };

/* ------------------------------ monstruos ------------------------------ */
const GEM = [L('rubi', 0.05, 1, 2), L('zafiro', 0.05, 1, 2), L('esmeralda', 0.04, 1, 1)];
const POT = [L('pocion_vida_g', 0.3, 1, 3), L('pocion_mana_g', 0.22, 1, 2)];
const sellOf = (lv, k) => Math.round(8 + lv * lv * 3.4) * k;

const MON = {
  // ---- Llanuras del Amanecer: la Alianza Heroica ----
  hada_traviesa:      { zone: 'llanuras_este', n: 14, fly: true, name: 'Hada Traviesa', icon: '🧚', hp: 5200, dmg: [120, 190], exp: 3600, move: 430, atkCd: 1400, aggro: 8, range: 4, proj: 'ice', respawn: 50000, gold: [90, 260], loot: [L('esencia_helada', 0.4, 1, 2), L('pluma_fenix', 0.02, 1, 1)] },
  grifo_joven:        { zone: 'llanuras_este', n: 12, fly: true, name: 'Grifo Joven', icon: '🦅', hp: 9800, dmg: [150, 240], exp: 5200, move: 480, atkCd: 1500, aggro: 8, respawn: 60000, gold: [140, 380], loot: [L('pluma_fenix', 0.04, 1, 1), L('ala_murcielago', 0.3, 1, 2)] },
  caballero_renegado: { zone: 'llanuras_este', n: 14, name: 'Caballero Renegado', icon: '🛡️', hp: 11500, dmg: [150, 240], exp: 5400, move: 640, atkCd: 1700, aggro: 7, respawn: 60000, gold: [150, 400], loot: [L('mineral_hierro', 0.4, 1, 3), L('armadura_placas', 0.03, 1, 1)] },
  arquero_renegado:   { zone: 'llanuras_este', n: 12, name: 'Arquero Renegado', icon: '🏹', hp: 7200, dmg: [140, 230], exp: 4800, move: 520, atkCd: 1400, aggro: 10, range: 7, proj: 'arrow', respawn: 55000, gold: [120, 330], loot: [L('arco_marfil', 0.02, 1, 1), L('piel_lobo', 0.25, 1, 2)] },
  mago_renegado:      { zone: 'llanuras_este', n: 10, name: 'Mago Renegado', icon: '🧙', hp: 6800, dmg: [150, 250], exp: 5000, move: 560, atkCd: 1600, aggro: 9, range: 6, proj: 'ice', respawn: 55000, gold: [140, 360], loot: [L('cristal_arcano', 0.2, 1, 1), L('pocion_mana_g', 0.4, 1, 2)] },
  golem_piedra:       { zone: 'llanuras_este', n: 2, boss: true, name: 'Gólem de Piedra Ancestral', icon: '🗿', lv: 330, hp: 95000, dmg: [180, 300], dmgK: 2.0, exp: 38000, move: 700, atkCd: 1800, aggro: 9, respawn: 8 * 60000, armor: 0.35, gold: [4000, 8000], special: 'e2',
    e2: { col: '190,170,140', atks: [{ k: 'slam', r: 3, m: 1.6, stun: 1200, name: 'Puñetazo sísmico' }, { k: 'nova', r: 5, m: 1.2, name: 'Temblor de piedra' }, { k: 'line', len: 8, m: 1.5, name: 'Avalancha' }] },
    loot: [L('trofeo_golem_piedra', 1, 1, 1), L('pocion_vida_g', 1, 3, 6), L('pocion_mana_g', 1, 2, 4), L('rubi', 0.6, 1, 3), L('zafiro', 0.6, 1, 3)] },
  jefe_orco:          { zone: 'llanuras_este', n: 2, boss: true, name: 'Jefe Orco de la Alianza Caída', icon: '👹', lv: 340, hp: 105000, dmg: [190, 320], dmgK: 2.0, exp: 42000, move: 600, atkCd: 1600, aggro: 10, respawn: 8 * 60000, armor: 0.3, gold: [4500, 8500], special: 'e2',
    e2: { col: '230,110,80', atks: [{ k: 'slam', r: 3, m: 1.7, name: 'Garrotazo' }, { k: 'nova', r: 5, m: 1.3, slow: 3000, name: 'Grito de guerra' }, { k: 'summon', t: 'caballero_renegado', n: 2, name: 'Refuerzos' }] },
    loot: [L('trofeo_jefe_orco', 1, 1, 1), L('pocion_vida_g', 1, 3, 6), L('pocion_mana_g', 1, 2, 4), L('esmeralda', 0.6, 1, 3), L('topacio', 0.5, 1, 2)] },
  bestia_aguila:      { zone: 'llanuras_este', n: 2, boss: true, fly: true, name: 'Bestia Cabeza de Águila', icon: '🦅', lv: 350, hp: 110000, dmg: [200, 330], dmgK: 2.0, exp: 44000, move: 520, atkCd: 1500, aggro: 11, respawn: 8 * 60000, armor: 0.3, gold: [4500, 9000], special: 'e2',
    e2: { col: '255,220,150', atks: [{ k: 'line', len: 9, m: 1.6, name: 'Picado' }, { k: 'rain', n: 6, r: 1.7, m: 1.2, name: 'Plumas afiladas' }, { k: 'nova', r: 4.5, m: 1.2, slow: 3000, name: 'Graznido' }] },
    loot: [L('trofeo_bestia_aguila', 1, 1, 1), L('pocion_vida_g', 1, 3, 6), L('pluma_fenix', 0.4, 1, 1), L('zafiro', 0.6, 1, 3)] },
  // ---- Bosque Susurrante: la Legión de los No Muertos ----
  zombi:              { zone: 'bosque_este', n: 18, name: 'Zombi', icon: '🧟', hp: 8200, dmg: [140, 220], exp: 4200, move: 700, atkCd: 1800, aggro: 6, respawn: 45000, gold: [80, 240], loot: [L('hueso', 0.5, 1, 3), L('piel_lobo', 0.15, 1, 1)] },
  zombi_podrido:      { zone: 'bosque_este', n: 14, name: 'Zombi Podrido', icon: '🧟', hp: 10400, dmg: [150, 240], exp: 4900, move: 720, atkCd: 1800, aggro: 6, respawn: 50000, gold: [100, 280], loot: [L('hueso', 0.4, 1, 3), L('veneno_serpiente', 0.25, 1, 2)] },
  zombi_bruto:        { zone: 'bosque_este', n: 12, name: 'Zombi Bruto', icon: '🧟', hp: 14500, dmg: [180, 280], exp: 5800, move: 800, atkCd: 2000, aggro: 6, respawn: 60000, gold: [140, 380], loot: [L('hueso', 0.4, 1, 3), L('mineral_hierro', 0.3, 1, 2)] },
  zombi_caballero:    { zone: 'bosque_este', n: 10, name: 'Caballero Zombi', icon: '🧟', hp: 13500, dmg: [190, 290], exp: 6200, move: 700, atkCd: 1700, aggro: 7, respawn: 60000, gold: [150, 400], loot: [L('armadura_placas', 0.03, 1, 1), L('hueso', 0.4, 1, 3)] },
  zombi_yelmo:        { zone: 'bosque_este', n: 10, name: 'Zombi del Yelmo de Cubo', icon: '🧟', hp: 12400, dmg: [180, 280], exp: 5900, move: 680, atkCd: 1600, aggro: 7, respawn: 60000, gold: [140, 380], loot: [L('hacha_acero', 0.03, 1, 1), L('hueso', 0.4, 1, 3)] },
  banshee:            { zone: 'bosque_este', n: 12, fly: true, name: 'Banshee', icon: '👻', hp: 6800, dmg: [150, 240], exp: 5400, move: 520, atkCd: 1700, aggro: 8, range: 5, proj: 'ice', respawn: 55000, gold: [130, 340], loot: [L('esencia_helada', 0.4, 1, 2), L('cristal_arcano', 0.15, 1, 1)] },
  nigromante:         { zone: 'bosque_este', n: 10, name: 'Nigromante', icon: '🧙‍♂️', hp: 7600, dmg: [160, 260], exp: 5600, move: 560, atkCd: 1700, aggro: 9, range: 6, proj: 'fire', respawn: 55000, gold: [150, 380], loot: [L('cristal_arcano', 0.25, 1, 1), L('hueso', 0.3, 1, 2), L('pocion_mana_g', 0.4, 1, 2)] },
  ogro_zombi:         { zone: 'bosque_este', n: 2, boss: true, name: 'Ogro Zombi', icon: '🧟', lv: 340, hp: 110000, dmg: [190, 320], dmgK: 2.0, exp: 43000, move: 650, atkCd: 1800, aggro: 9, respawn: 8 * 60000, armor: 0.3, gold: [4500, 8500], special: 'e2',
    e2: { col: '120,200,90', atks: [{ k: 'slam', r: 3, m: 1.7, name: 'Porrazo con el garrote' }, { k: 'nova', r: 5, m: 1.2, slow: 3000, name: 'Rugido pútrido' }, { k: 'summon', t: 'zombi', n: 3, name: 'Levantar muertos' }] },
    loot: [L('trofeo_ogro_zombi', 1, 1, 1), L('pocion_vida_g', 1, 3, 6), L('pocion_mana_g', 1, 2, 4), L('rubi', 0.6, 1, 3)] },
  zombi_caudillo:     { zone: 'bosque_este', n: 2, boss: true, name: 'Caudillo Zombi', icon: '🧟', lv: 360, hp: 115000, dmg: [200, 340], dmgK: 2.0, exp: 46000, move: 620, atkCd: 1600, aggro: 10, respawn: 8 * 60000, armor: 0.3, gold: [5000, 9000], special: 'e2',
    e2: { col: '200,70,70', atks: [{ k: 'line', len: 8, m: 1.6, name: 'Estocada del caudillo' }, { k: 'rain', n: 6, r: 1.7, m: 1.2, name: 'Lluvia de sangre' }, { k: 'summon', t: 'zombi_yelmo', n: 2, name: 'Guardia del caudillo' }] },
    loot: [L('trofeo_zombi_caudillo', 1, 1, 1), L('pocion_vida_g', 1, 3, 6), L('topacio', 0.5, 1, 2), L('esmeralda', 0.6, 1, 3)] },
  nigromante_oscuro:  { zone: 'bosque_este', n: 1, boss: true, name: 'Nigromante Oscuro', icon: '🧙', lv: 370, hp: 100000, dmg: [210, 350], dmgK: 2.0, exp: 45000, move: 560, atkCd: 1500, aggro: 12, range: 7, proj: 'fire', respawn: 8 * 60000, armor: 0.25, gold: [5000, 9500], special: 'e2',
    e2: { col: '170,100,255', atks: [{ k: 'rain', n: 7, r: 1.8, m: 1.3, name: 'Almas errantes' }, { k: 'summon', t: 'zombi_podrido', n: 3, name: 'Levantar muertos' }, { k: 'nova', r: 5, m: 1.3, slow: 3000, name: 'Aura de muerte' }] },
    loot: [L('trofeo_nigromante_oscuro', 1, 1, 1), L('pocion_mana_g', 1, 3, 6), L('cristal_arcano', 0.7, 1, 2), L('zafiro', 0.6, 1, 3)] },
  ent_viejo:          { zone: 'bosque_este', n: 2, boss: true, name: 'Ent Viejo', icon: '🌳', lv: 350, hp: 108000, dmg: [190, 320], dmgK: 2.0, exp: 43000, move: 800, atkCd: 1900, aggro: 8, respawn: 8 * 60000, armor: 0.35, gold: [4500, 8500], special: 'e2',
    e2: { col: '110,200,90', atks: [{ k: 'slam', r: 3.5, m: 1.5, stun: 1200, name: 'Raíces atrapadoras' }, { k: 'rain', n: 6, r: 1.6, m: 1.2, name: 'Espinas' }, { k: 'nova', r: 5, m: 1.2, name: 'Pisotón' }] },
    loot: [L('trofeo_ent_viejo', 1, 1, 1), L('pocion_vida_g', 1, 3, 6), L('esmeralda', 0.7, 1, 3), L('pluma_fenix', 0.2, 1, 1)] },
  // ---- jefes de las 4 cuevas (ver CAVES) ----
  rey_ogro:           { cave: 'cueva_cripta', boss: true, shared: true, name: 'Rey Ogro Putrefacto', icon: '🧟', lv: 450, hp: 260000, dmg: [260, 410], dmgK: 2.2, exp: 90000, move: 520, atkCd: 1500, aggro: 14, respawn: 12 * 60000, armor: 0.4, gold: [9000, 15000], special: 'e2',
    e2: { col: '120,210,90', rage: 0.3, atks: [{ k: 'slam', r: 3.4, m: 1.5, name: 'Porrazo' }, { k: 'nova', r: 7, m: 1.1, slow: 3500, name: 'Rugido del rey' }, { k: 'summon', t: 'zombi_bruto', n: 3, name: 'Levantar muertos' }, { k: 'line', len: 11, m: 1.7, name: 'Embestida' }, { k: 'rain', n: 8, r: 1.8, m: 1.2, name: 'Escombros' }, { k: 'slam', r: 4.2, m: 1.9, name: 'Triple porrazo', rep: 3 }] },
    loot: [L('trofeo_rey_ogro', 1, 1, 2), L('pocion_vida_g', 1, 4, 8), L('pocion_mana_g', 1, 3, 6), L('pluma_fenix', 0.4, 1, 2), L('rubi', 0.8, 2, 4)] },
  grifo_rey:          { cave: 'cueva_nido', boss: true, shared: true, fly: true, name: 'Grifo Real Ancestral', icon: '🦅', lv: 550, hp: 330000, dmg: [300, 470], dmgK: 2.4, exp: 110000, move: 440, atkCd: 1400, aggro: 14, respawn: 12 * 60000, armor: 0.4, gold: [10000, 17000], special: 'e2',
    e2: { col: '255,210,120', rage: 0.3, atks: [{ k: 'line', len: 12, m: 1.7, name: 'Picado real' }, { k: 'rain', n: 9, r: 1.8, m: 1.2, name: 'Tormenta de plumas' }, { k: 'nova', r: 7, m: 1.2, slow: 3500, name: 'Aleteo huracanado' }, { k: 'summon', t: 'grifo_joven', n: 2, name: 'Llamada de la bandada' }, { k: 'slam', r: 3.6, m: 1.7, name: 'Garra real' }, { k: 'line', len: 14, m: 1.9, name: 'Embestida celeste', rep: 2 }] },
    loot: [L('trofeo_grifo_rey', 1, 1, 2), L('pocion_vida_g', 1, 4, 8), L('pocion_mana_g', 1, 3, 6), L('pluma_fenix', 0.6, 1, 2), L('zafiro', 0.8, 2, 4)] },
  ent_ancestral:      { cave: 'cueva_santuario', boss: true, shared: true, name: 'Ent Ancestral del Bosque Eterno', icon: '🌳', lv: 650, hp: 410000, dmg: [350, 540], dmgK: 2.6, exp: 130000, move: 600, atkCd: 1600, aggro: 14, respawn: 12 * 60000, armor: 0.45, gold: [12000, 19000], special: 'e2',
    e2: { col: '110,210,100', rage: 0.3, atks: [{ k: 'slam', r: 4, m: 1.6, stun: 1500, name: 'Raíces del bosque' }, { k: 'rain', n: 10, r: 2, m: 1.2, name: 'Lluvia de espinas' }, { k: 'nova', r: 8, m: 1.2, stun: 1200, name: 'Pisotón ancestral' }, { k: 'summon', t: 'hada_traviesa', n: 3, name: 'Espíritus del bosque' }, { k: 'line', len: 13, m: 1.8, name: 'Látigo de ramas' }, { k: 'slam', r: 4.6, m: 2.0, name: 'Triple golpe', rep: 3 }] },
    loot: [L('trofeo_ent_ancestral', 1, 1, 2), L('pocion_vida_g', 1, 4, 8), L('pocion_mana_g', 1, 3, 6), L('pluma_fenix', 0.6, 1, 2), L('esmeralda', 0.8, 2, 4)] },
  dragon_esqueleto:   { cave: 'cueva_osario', boss: true, shared: true, fly: true, name: 'Dragón Esqueleto Eterno', icon: '🐲', lv: 760, hp: 520000, dmg: [400, 620], dmgK: 2.9, exp: 150000, move: 480, atkCd: 1400, aggro: 16, respawn: 12 * 60000, armor: 0.5, gold: [14000, 22000], special: 'e2',
    e2: { col: '255,140,50', rage: 0.3, atks: [{ k: 'line', len: 14, m: 1.8, name: 'Aliento de fuego' }, { k: 'rain', n: 11, r: 1.9, m: 1.2, name: 'Lluvia de llamas' }, { k: 'nova', r: 9, m: 1.2, slow: 4000, name: 'Rugido de huesos' }, { k: 'summon', t: 'zombi_caballero', n: 3, name: 'Legión de huesos' }, { k: 'slam', r: 4.4, m: 1.8, name: 'Zarpazo de hueso' }, { k: 'line', len: 14, m: 2.1, name: 'Aliento triple', rep: 3 }] },
    loot: [L('trofeo_dragon_esqueleto', 1, 1, 2), L('pocion_vida_g', 1, 5, 9), L('pocion_mana_g', 1, 4, 7), L('pluma_fenix', 0.8, 1, 3), L('rubi', 0.9, 2, 5), L('zafiro', 0.9, 2, 5)] },
};
/** cueva -> jefe, equipo y monstruos de dentro [tipo, n] (la geometría está en world.js) */
const CAVES = {
  cueva_cripta:    { boss: 'rey_ogro',         set: 'kaelen',  mobs: [['zombi_podrido', 8], ['zombi_bruto', 6], ['banshee', 6]] },
  cueva_nido:      { boss: 'grifo_rey',        set: 'aeliana', mobs: [['grifo_joven', 8], ['hada_traviesa', 6], ['arquero_renegado', 6]] },
  cueva_santuario: { boss: 'ent_ancestral',    set: 'valeria', mobs: [['caballero_renegado', 6], ['mago_renegado', 6], ['zombi_yelmo', 6]] },
  cueva_osario:    { boss: 'dragon_esqueleto', set: 'eldrin',  mobs: [['zombi_caballero', 8], ['nigromante', 6], ['banshee', 6]] },
};
const TROPHY = {
  trofeo_golem_piedra: ['Corazón de Piedra Ancestral', '🗿', 20000], trofeo_jefe_orco: ['Colmillo del Jefe Orco', '🦷', 21000], trofeo_bestia_aguila: ['Pluma de la Bestia Águila', '🪶', 22000],
  trofeo_ogro_zombi: ['Garrote del Ogro Zombi', '🏏', 21000], trofeo_zombi_caudillo: ['Capa del Caudillo Zombi', '🧣', 23000], trofeo_nigromante_oscuro: ['Bastón del Nigromante Oscuro', '🪄', 23000],
  trofeo_ent_viejo: ['Corteza del Ent Viejo', '🪵', 21000], trofeo_rey_ogro: ['Corona del Rey Ogro', '👑', 48000], trofeo_grifo_rey: ['Garra del Grifo Real', '🦅', 52000],
  trofeo_ent_ancestral: ['Semilla del Bosque Eterno', '🌰', 56000], trofeo_dragon_esqueleto: ['Cráneo del Dragón Esqueleto', '💀', 60000],
};

function build(ITEMS, MONSTERS, SPAWN_PLAN) {
  for (const [id, [name, icon, sell]] of Object.entries(TROPHY)) ITEMS[id] = { name, icon, type: 'misc', stack: true, sell };
  const gear = [];
  for (const [setName, list] of Object.entries(SETS)) for (const [id, name, spr, type, lv, val, bonus, , o] of list) {
    const base = { name, spr, type, bonus, este2: setName, minLevel: lv, sell: sellOf(lv, type === 'weapon' ? 8 : 5) };
    if (type === 'weapon') Object.assign(base, { icon: WICON[o.style], style: o.style, atk: val, cd: o.cd, range: o.range, el: o.el });
    else { base.icon = ICON[type]; if (val) base.def = val; }
    ITEMS[id] = base; gear.push(id);
  }
  for (const [type, d] of Object.entries(MON)) {
    const { zone, cave, n, ...def } = d;
    def.loot = def.loot.slice();
    if (!def.boss) def.loot.push(...POT, ...GEM.map((g) => [g[0], g[1] / 3, g[2], g[3]]));
    MONSTERS[type] = def;
    if (zone && n) SPAWN_PLAN.push({ zone, type, n });
  }
  for (const [cave, c] of Object.entries(CAVES)) for (const [type, n] of c.mobs) SPAWN_PLAN.push({ zone: cave, type, n });
  module.exports.GEAR = gear;
}

/* ============================== ataques de jefes y mini-jefes (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const floorOk = (x, y) => world.isWalkable(x, y);
  const distSeg = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, u = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(px - (x1 + vx * u), py - (y1 + vy * u)); };

  P.e2AI = function (m, now) {
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1;
    m.lpx = m.x;
    if (now < (m.nextSp || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    const cfg = m.def.e2; if (!cfg) return;
    const atk = cfg.atks[(m.spN || 0) % cfg.atks.length]; m.spN = (m.spN || 0) + 1;
    const dur = this.e2Cast(m, atk, cfg);
    const rage = cfg.rage && m.hp <= m.maxHp * cfg.rage;
    m.nextSp = now + dur + (rage ? 1400 : 2600) + Math.random() * 1500;
    m.nextMove = Math.max(m.nextMove, now + 900); m.nextAtk = Math.max(m.nextAtk, now + 900);
  };

  P.e2Cast = function (m, a, cfg) {
    const alive = () => !m.dead && this.monsters.includes(m);
    const R = 15, col = cfg.col;
    const near = () => [...this.players.values()].filter((q) => q.hp > 0 && Math.hypot(q.x - m.x, q.y - m.y) <= R);
    const say = (txt) => { for (const q of near()) this.msg(q, `${m.def.icon || '⚔️'} ${m.def.name}: ¡${a.name}!${txt || ''}`, 'x'); };
    const dmgOf = (k) => Math.round(rnd(m.def.dmg[0], m.def.dmg[1]) * (a.m || 1) * (k || 1));
    const hit = (q) => { this.hurtPlayer(q, dmgOf(), m, this.now, a.name); if (a.slow) q.slowUntil = Math.max(q.slowUntil || 0, this.now + a.slow); if (a.stun) { q.nextMove = Math.max(q.nextMove || 0, this.now + a.stun); q.nextAtk = Math.max(q.nextAtk || 0, this.now + a.stun); } };
    const cast = (T, root) => { this.fx.push({ k: 'e2_cast', x: m.x, y: m.y, id: m.id, T, col }); m.nextMove = Math.max(m.nextMove, this.now + root); m.nextAtk = Math.max(m.nextAtk, this.now + root); };
    const rep = a.rep || 1;

    if (a.k === 'slam') {                                                                         // círculo sobre el objetivo (o sobre el propio jefe)
      say(' ¡Sal del círculo!'); cast(900, 900 + rep * 900);
      const WARN = 800, GAP = 800, pl = near(), t0 = pl.length ? pl[rnd(0, pl.length - 1)] : null;
      for (let i = 0; i < rep; i++) this.later(600 + i * GAP, () => {
        if (!alive()) return; const q = t0 && t0.hp > 0 ? t0 : null, cx = q && !a.self ? Math.round(q.x) : m.x, cy = q && !a.self ? Math.round(q.y) : m.y;
        this.fx.push({ k: 'e2_mk', x: cx, y: cy, r: a.r, T: WARN, col });
        this.later(WARN, () => { if (!alive()) return; this.fx.push({ k: 'e2_hit', x: cx, y: cy, r: a.r, col }); for (const z of near()) if (Math.hypot(z.x - cx, z.y - cy) <= a.r + 0.2) hit(z); });
      });
      return 600 + (rep - 1) * GAP + WARN + 400;
    }
    if (a.k === 'nova') {                                                                         // onda alrededor del jefe
      say(' ¡Aléjate de él!'); cast(1300, 2200);
      const WARN = 1300;
      this.later(500, () => { if (alive()) this.fx.push({ k: 'e2_mk', x: m.x, y: m.y, r: a.r, T: WARN, col, follow: m.id }); });
      this.later(500 + WARN, () => { if (!alive()) return; this.fx.push({ k: 'e2_hit', x: m.x, y: m.y, r: a.r, col, ring: 1 }); for (const z of near()) if (Math.hypot(z.x - m.x, z.y - m.y) <= a.r) hit(z); });
      return 500 + WARN + 500;
    }
    if (a.k === 'line') {                                                                         // rayo / aliento / embestida en línea
      say(' ¡Sal de la línea!'); cast(1100, 1000 + rep * 1100);
      const WARN = 1100, GAP = 900, pl = near();
      for (let i = 0; i < rep; i++) {
        const q = pl.length ? pl[(i + rnd(0, 1)) % pl.length] : null, ang = q ? Math.atan2(q.y - m.y, q.x - m.x) : Math.random() * 6.283;
        const x1 = m.x, y1 = m.y, x2 = x1 + Math.cos(ang) * a.len, y2 = y1 + Math.sin(ang) * a.len;
        this.later(700 + i * GAP, () => { if (alive()) this.fx.push({ k: 'e2_lane', x1, y1, x2, y2, T: WARN, col }); });
        this.later(700 + i * GAP + WARN, () => { if (!alive()) return; this.fx.push({ k: 'e2_beam', x1, y1, x2, y2, col }); for (const z of near()) if (distSeg(z.x, z.y, x1, y1, x2, y2) <= 1.3) hit(z); });
      }
      return 700 + (rep - 1) * GAP + WARN + 500;
    }
    if (a.k === 'rain') {                                                                         // círculos alrededor de los jugadores y al azar
      say(' ¡Cuidado con el suelo!'); cast(1000, 2600);
      const WARN = 1000, pl = near(), pts = [];
      for (const q of pl) if (pts.length < a.n && Math.random() < 0.8) pts.push({ x: Math.round(q.x), y: Math.round(q.y) });
      for (let k = 0; k < 90 && pts.length < a.n; k++) { const x = Math.round(m.x + (Math.random() - 0.5) * 14), y = Math.round(m.y + (Math.random() - 0.5) * 10); if (floorOk(x, y) && !pts.some((s) => Math.hypot(s.x - x, s.y - y) < 2.2)) pts.push({ x, y }); }
      this.later(600, () => { if (alive()) for (const s of pts) this.fx.push({ k: 'e2_mk', x: s.x, y: s.y, r: a.r, T: WARN, col, small: 1 }); });
      this.later(600 + WARN, () => { if (!alive()) return; for (const s of pts) { this.fx.push({ k: 'e2_hit', x: s.x, y: s.y, r: a.r, col }); for (const z of near()) if (Math.hypot(z.x - s.x, z.y - s.y) <= a.r + 0.2) hit(z); } });
      return 600 + WARN + 600;
    }
    if (a.k === 'summon') {                                                                       // refuerzos que caducan a los 45 s
      say(''); cast(1100, 1800);
      const alivePets = this.monsters.filter((z) => z.parent === m && !z.dead).length, n = Math.max(0, Math.min(a.n, 8 - alivePets)); if (!n) return 1200;
      const spots = [];
      for (let i = 0; i < n * 8 && spots.length < n; i++) { const x = Math.round(m.x + (Math.random() - 0.5) * 9), y = Math.round(m.y + (Math.random() - 0.5) * 7); if (floorOk(x, y) && !this.mgrid.has(y * world.W + x) && !this.pgrid.has(y * world.W + x) && !spots.some((s) => s[0] === x && s[1] === y)) spots.push([x, y]); }
      for (const [x, y] of spots) this.fx.push({ k: 'spw', x, y });
      this.later(900, () => {
        if (!alive()) return;
        for (const [x, y] of spots) {
          if (this.mgrid.has(y * world.W + x) || this.pgrid.has(y * world.W + x)) continue;
          const c = this.spawnMonster(a.t, x, y); if (!c) continue; c.noRespawn = true; c.respawnAt = Infinity; c.parent = m; c.target = m.target; c.diesAt = this.now + 45000; this.fx.push({ k: 'sp', x, y });
        }
        if (!m.sweep) { m.sweep = true; const sweep = () => {
          const bossUp = alive(), now2 = this.now;
          for (const q of this.monsters.filter((z) => z.parent === m && (z.dead || !bossUp || now2 >= z.diesAt))) { this.mgrid.delete(q.y * world.W + q.x); this.monsters = this.monsters.filter((z) => z !== q); this.ents.delete(q.id); }
          if (bossUp || this.monsters.some((z) => z.parent === m)) this.later(2000, sweep); else m.sweep = false;
        }; this.later(2000, sweep); }
      });
      return 2200;
    }
    return 800;
  };

  // la muerte de un jefe de cueva avisa a todos los jugadores y suelta el equipo con suerte para quien más daño hizo
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    const def = m.def, list = def && def.special === 'e2' ? (def.cave ? SETS[CAVES[def.cave].set] : SETS.thorne) : null;
    if (!list) return K0.call(this, m, now);
    const parts = []; let total = 0;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) { parts.push([pl, e.dmg]); total += e.dmg; } }
    const x = m.x, y = m.y, face = m.lf || 1, D = require('./data'), I = require('./items');
    const r = K0.call(this, m, now);
    // equipo del set: botín para todos los que participan; cuanto más daño haces, más suerte (hasta ×3 el que más daño hizo)
    const topDmg = Math.max(1, ...parts.map((q) => q[1])), ranked = parts.slice().sort((a, b) => b[1] - a[1]);
    if (def.cave && ranked.length) this.broadcastChat(`${def.icon} ¡${def.name} ha caído! Mayor daño: ${ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ')}.`, 'k');
    for (const [pl, dmg] of ranked) {
      if (dmg < 1) continue;
      const k = 1 + 2 * (dmg / topDmg), instK = m.instSlot ? require('./instancias').LOOT_K : 1;
      for (const s of list) {
        const id = s[0];
        if (Math.random() >= Math.min(0.6, s[7] * 0.5 * D.CFG.BOSS_DROP_K * k * instK * (this.lootMult ? this.lootMult(pl, id) : 1))) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, m.type, id);
        this.msgC(pl, `${def.icon}✨ ¡Botín de ${def.name}: ${D.ITEMS[id].name}!`, '#ffd27a'); this.broadcastChat(`${def.icon} ¡${pl.name} ha conseguido ${D.ITEMS[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    }
    if (def.cave) this.fx.push({ k: 'e2_die', x, y, col: def.e2.col, face });
    return r;
  };
}
module.exports = { build, install, SETS, MON, CAVES, GEAR: [] };
