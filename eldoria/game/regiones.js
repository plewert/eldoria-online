'use strict';
/** Cuatro regiones alrededor de la Ciudad de Alba Dorada: Montañas del Trueno, Reino de las Nubes,
 *  Desierto de las Pirámides y Paraíso de Coral. Monstruos nuevos (con el dibujo de uno ya existente: `spr`),
 *  un jefe de región por zona, trofeos y misiones. Todas son zonas sin PvP. */
const L = (it, ch, a, b) => [it, ch, a, b];
const GEMLOOT = [L('rubi', 0.12, 1, 2), L('zafiro', 0.12, 1, 2), L('esmeralda', 0.1, 1, 1)];
const POT = [L('pocion_vida_g', 0.35, 1, 3), L('pocion_mana_g', 0.25, 1, 2)];

const MON = {
  // ---- Montañas del Trueno: huestes de arcángeles ----
  arcangel_centinela: { zone: 'montana_alta', n: 16, spr: 'ang_centinela', fly: true, name: 'Arcángel Centinela', icon: '⚔️', hp: 6500, dmg: [110, 180], exp: 3200, move: 600, atkCd: 1800, aggro: 7, respawn: 70000, gold: [120, 320], loot: [L('pluma_fenix', 0.03, 1, 1), L('cristal_arcano', 0.1, 1, 1)] },
  arcangel_cruzado:   { zone: 'montana_alta', n: 14, spr: 'ang_cruzado', fly: true, name: 'Arcángel Cruzado', icon: '🗡️', hp: 5600, dmg: [120, 190], exp: 3100, move: 560, atkCd: 1700, aggro: 7, respawn: 65000, gold: [100, 280], loot: [L('esencia_helada', 0.4, 1, 2), L('armadura_placas', 0.03, 1, 1)] },
  espada_celestial:   { zone: 'montana_alta', n: 14, spr: 'ang_espada', fly: true, name: 'Espada Celestial', icon: '✨', hp: 4600, dmg: [110, 175], exp: 2800, move: 450, atkCd: 1400, aggro: 8, respawn: 55000, gold: [90, 240], loot: [L('cristal_hielo', 0.4, 1, 2), L('piel_lobo', 0.2, 1, 1)] },
  guardian_alado:     { zone: 'montana_alta', n: 12, spr: 'ang_guardian', fly: true, name: 'Guardián Alado', icon: '🛡️', hp: 8500, dmg: [130, 210], exp: 4200, move: 800, atkCd: 2100, aggro: 6, respawn: 80000, gold: [150, 380], loot: [L('mineral_hierro', 0.5, 1, 3), L('corazon_hielo', 0.08, 1, 1)] },
  serafin_fuego:      { zone: 'montana_alta', boss: true, spr: 'ang_boss_fuego', fly: true, name: 'Serafín de Fuego', icon: '🔥', lv: 280, hp: 150000, dmg: [190, 320], exp: 60000, move: 520, atkCd: 1500, aggro: 12, respawn: 15 * 60000, armor: 0.3, gold: [8000, 14000],
    loot: [L('trofeo_serafin_fuego', 1, 1, 1), L('pocion_vida_g', 1, 4, 8), L('pocion_mana_g', 1, 3, 6), L('pluma_fenix', 0.4, 1, 1), L('rubi', 0.8, 2, 4), L('zafiro', 0.8, 2, 4)] },
  // ---- Reino de las Nubes: ángeles ----
  angel_nube:     { zone: 'nubes_reino', n: 16, spr: 'ang_nube', fly: true, name: 'Ángel de las Nubes', icon: '👼', hp: 4200, dmg: [100, 170], exp: 3000, move: 600, atkCd: 1700, aggro: 8, respawn: 60000, gold: [90, 250], loot: [L('esencia_helada', 0.5, 1, 2), L('pluma_fenix', 0.02, 1, 1)] },
  angel_guerrero: { zone: 'nubes_reino', n: 14, spr: 'ang_guerrero', fly: true, name: 'Ángel Guerrero', icon: '🗡️', hp: 5600, dmg: [120, 190], exp: 3400, move: 650, atkCd: 1600, aggro: 8, respawn: 65000, gold: [100, 280], loot: [L('cristal_hielo', 0.5, 1, 2), L('cristal_arcano', 0.15, 1, 1)] },
  celestial_sabia:{ zone: 'nubes_reino', n: 12, spr: 'ang_sabia', fly: true, name: 'Celestial Sabia', icon: '🔮', hp: 4800, dmg: [110, 180], exp: 3600, move: 700, atkCd: 1800, aggro: 8, range: 5, proj: 'ice', respawn: 65000, gold: [120, 300], loot: [L('cristal_arcano', 0.25, 1, 1), L('pocion_mana_g', 0.3, 1, 2)] },
  serafin_menor:  { zone: 'nubes_reino', n: 12, spr: 'ang_serafin', fly: true, name: 'Serafín Menor', icon: '🌟', hp: 7200, dmg: [130, 210], exp: 4200, move: 520, atkCd: 1500, aggro: 8, range: 4, proj: 'fire', respawn: 70000, gold: [150, 380], loot: [L('esencia_helada', 0.4, 1, 2), L('corazon_hielo', 0.1, 1, 1)] },
  querubin_trompeta:{ zone: 'nubes_reino', n: 14, spr: 'ang_trompeta', fly: true, name: 'Querubín Trompetista', icon: '🎺', hp: 3600, dmg: [90, 150], exp: 2500, move: 420, atkCd: 1300, aggro: 9, respawn: 50000, gold: [70, 200], loot: [L('pluma_fenix', 0.02, 1, 1), L('ala_murcielago', 0.3, 1, 1)] },
  serafin_tormenta:{ zone: 'nubes_reino', boss: true, spr: 'ang_boss_tormenta', fly: true, name: 'Serafín de la Tormenta', icon: '🌩️', lv: 300, hp: 170000, dmg: [200, 340], exp: 70000, move: 480, atkCd: 1400, aggro: 14, range: 6, proj: 'ice', respawn: 15 * 60000, armor: 0.3, gold: [9000, 15000],
    loot: [L('trofeo_serafin', 1, 1, 1), L('pocion_vida_g', 1, 4, 8), L('pocion_mana_g', 1, 3, 6), L('pluma_fenix', 0.5, 1, 2), L('zafiro', 0.8, 2, 4), L('esmeralda', 0.8, 2, 4)] },
  // ---- Desierto de las Pirámides ----
  escorpion_dorado:{ zone: 'desierto_piramides', n: 16, spr: 'es_dorado', name: 'Escorpión Dorado', icon: '🦂', hp: 4600, dmg: [110, 180], exp: 2900, move: 460, atkCd: 1500, aggro: 7, respawn: 55000, gold: [90, 250], loot: [L('aguijon', 0.6, 1, 2), L('polvo_oro', 0.3, 1, 3)] },
  guardian_momia: { zone: 'desierto_piramides', n: 14, spr: 'momia', name: 'Guardián Momia', icon: '🩹', hp: 6200, dmg: [120, 200], exp: 3500, move: 720, atkCd: 1900, aggro: 6, respawn: 65000, gold: [110, 300], loot: [L('venda', 0.7, 1, 3), L('amuleto_momia', 0.15, 1, 1)] },
  sacerdote_sol:  { zone: 'desierto_piramides', n: 12, spr: 'sacerdote_momia', name: 'Sacerdote del Sol', icon: '🧞', hp: 5200, dmg: [130, 200], exp: 3800, move: 700, atkCd: 1900, aggro: 8, range: 5, proj: 'fire', respawn: 65000, gold: [130, 330], loot: [L('amuleto_momia', 0.25, 1, 1), L('ankh', 0.15, 1, 1)] },
  cobra_real:     { zone: 'desierto_piramides', n: 14, spr: 'cobra', name: 'Cobra Real', icon: '🐍', hp: 3800, dmg: [100, 160], exp: 2500, move: 460, atkCd: 1500, aggro: 7, respawn: 50000, gold: [70, 200], loot: [L('veneno_serpiente', 0.7, 1, 3)] },
  escarabajo_dorado:{ zone: 'desierto_piramides', n: 10, spr: 'escarabajo_gigante', name: 'Escarabajo Dorado', icon: '🪲', hp: 7200, dmg: [130, 210], exp: 4000, move: 520, atkCd: 1600, aggro: 6, respawn: 70000, gold: [140, 350], loot: [L('escarabajo', 0.6, 1, 2), L('polvo_oro', 0.4, 1, 3)] },
  // ---- Guerreros egipcios (infantería del faraón) ----
  lancero_egipcio:  { zone: 'desierto_piramides', n: 12, spr: 'eg_lancero', name: 'Lancero Egipcio', icon: '🔱', hp: 5400, dmg: [115, 185], exp: 3200, move: 560, atkCd: 1600, aggro: 7, respawn: 60000, gold: [100, 280], loot: [L('bolsa_bandido', 0.2, 1, 1), L('polvo_oro', 0.3, 1, 3)] },
  escudero_egipcio: { zone: 'desierto_piramides', n: 10, spr: 'eg_escudero', name: 'Escudero Egipcio', icon: '🛡️', hp: 7000, dmg: [105, 170], exp: 3500, move: 720, atkCd: 1900, aggro: 6, respawn: 65000, gold: [110, 300], loot: [L('escudo_bronce', 0.03, 1, 1), L('polvo_oro', 0.3, 1, 3)] },
  guardia_sagrado:  { zone: 'desierto_piramides', n: 10, spr: 'eg_sagrado', name: 'Guardia del Escudo Sagrado', icon: '🏺', hp: 7800, dmg: [120, 195], exp: 3900, move: 720, atkCd: 1900, aggro: 6, respawn: 70000, gold: [130, 340], loot: [L('amuleto_momia', 0.12, 1, 1), L('ankh', 0.08, 1, 1)] },
  hachero_egipcio:  { zone: 'desierto_piramides', n: 10, spr: 'eg_hachero', name: 'Hachero Egipcio', icon: '🪓', hp: 6000, dmg: [135, 215], exp: 3600, move: 520, atkCd: 1700, aggro: 7, respawn: 65000, gold: [120, 320], loot: [L('hacha_acero', 0.03, 1, 1), L('polvo_oro', 0.3, 1, 3)] },
  arquero_nilo:     { zone: 'desierto_piramides', n: 12, spr: 'eg_arquero', name: 'Arquero del Nilo', icon: '🏹', hp: 3800, dmg: [100, 165], exp: 2800, move: 520, atkCd: 1500, aggro: 9, range: 6, proj: 'arrow', respawn: 55000, gold: [80, 230], loot: [L('arco_corto', 0.03, 1, 1), L('polvo_oro', 0.2, 1, 2)] },
  guardia_real:     { zone: 'desierto_piramides', n: 6, spr: 'eg_real', name: 'Guardia Real del Faraón', icon: '👑', hp: 11000, dmg: [150, 240], exp: 5200, move: 600, atkCd: 1700, aggro: 7, respawn: 90000, gold: [250, 600], loot: [L('amuleto_momia', 0.2, 1, 1), L('ankh', 0.15, 1, 1), L('pluma_fenix', 0.03, 1, 1)] },
  capitan_egipcio:  { zone: 'desierto_piramides', n: 6, spr: 'eg_capitan', name: 'Capitán de la Guardia', icon: '⚔️', hp: 10000, dmg: [150, 235], exp: 5000, move: 600, atkCd: 1700, aggro: 7, respawn: 90000, gold: [240, 580], loot: [L('amuleto_momia', 0.2, 1, 1), L('ankh', 0.12, 1, 1)] },
  arquero_elite:    { zone: 'desierto_piramides', n: 8, spr: 'eg_elite_arq', name: 'Arquero de Élite del Faraón', icon: '🎯', hp: 5600, dmg: [135, 215], exp: 4000, move: 500, atkCd: 1400, aggro: 10, range: 7, proj: 'arrow', respawn: 65000, gold: [150, 380], loot: [L('arco_marfil', 0.02, 1, 1), L('ankh', 0.1, 1, 1)] },
  amenkhet:        { zone: 'desierto_piramides', boss: true, spr: 'faraon', name: 'Amenkhet, Rey de las Arenas', icon: '👑', lv: 290, hp: 160000, dmg: [200, 330], exp: 65000, move: 500, atkCd: 1500, aggro: 12, respawn: 15 * 60000, armor: 0.3, gold: [8500, 14500],
    loot: [L('trofeo_amenkhet', 1, 1, 1), L('pocion_vida_g', 1, 4, 8), L('pocion_mana_g', 1, 3, 6), L('pluma_fenix', 0.4, 1, 1), L('rubi', 0.8, 2, 4), L('topacio', 0.6, 1, 3)] },
  // ---- Paraíso de Coral (zona tranquila: criaturas pequeñas y un jefe amable de derrotar) ----
  cangrejo_coral: { zone: 'paraiso', n: 16, name: 'Cangrejo de Coral', icon: '🦀', hp: 2600, dmg: [60, 100], exp: 1800, move: 600, atkCd: 1700, aggro: 4, respawn: 45000, gold: [60, 180], loot: [L('pinza_cangrejo', 0.6, 1, 2), L('perla', 0.08, 1, 1)] },
  tortuga_marina: { zone: 'paraiso', n: 12, name: 'Tortuga Marina', icon: '🐢', hp: 3600, dmg: [60, 110], exp: 2000, move: 900, atkCd: 2000, aggro: 3, respawn: 55000, gold: [60, 180], loot: [L('caparazon', 0.5, 1, 1), L('perla', 0.1, 1, 1)] },
  sirena_coral:   { zone: 'paraiso', n: 12, spr: 'sirena', name: 'Sirena de Coral', icon: '🧜‍♀️', hp: 3800, dmg: [80, 130], exp: 2400, move: 650, atkCd: 1800, aggro: 6, range: 5, proj: 'ice', respawn: 55000, gold: [80, 220], loot: [L('escama_sirena', 0.5, 1, 2), L('perla', 0.15, 1, 1)] },
  lagarto_playa:  { zone: 'paraiso', n: 12, spr: 'lagarto', name: 'Lagarto de Playa', icon: '🦎', hp: 3200, dmg: [70, 120], exp: 2100, move: 520, atkCd: 1700, aggro: 5, respawn: 50000, gold: [60, 180], loot: [L('lengua_lagarto', 0.5, 1, 2)] },
  querubin_arpa:  { zone: 'paraiso', n: 8, spr: 'ang_arpa', fly: true, name: 'Querubín del Arpa', icon: '🪽', hp: 3000, dmg: [60, 100], exp: 2000, move: 450, atkCd: 1500, aggro: 3, respawn: 50000, gold: [60, 180], loot: [L('pluma_fenix', 0.02, 1, 1), L('perla', 0.1, 1, 1)] },
  querubin_alegre:{ zone: 'paraiso', n: 8, spr: 'ang_querubin', fly: true, name: 'Querubín Juguetón', icon: '👼', hp: 3000, dmg: [60, 100], exp: 2000, move: 420, atkCd: 1500, aggro: 3, respawn: 50000, gold: [60, 180], loot: [L('ala_murcielago', 0.3, 1, 1), L('perla', 0.1, 1, 1)] },
  angel_playa:    { zone: 'paraiso', n: 8, spr: 'ang_playa', fly: true, name: 'Ángel de la Playa', icon: '😇', hp: 4200, dmg: [80, 130], exp: 2500, move: 600, atkCd: 1700, aggro: 4, respawn: 55000, gold: [80, 220], loot: [L('esencia_helada', 0.3, 1, 1), L('perla', 0.12, 1, 1)] },
  reina_coral:    { zone: 'paraiso', boss: true, spr: 'sirena', name: 'Reina Sirena del Paraíso', icon: '👑', lv: 220, hp: 110000, dmg: [150, 250], exp: 50000, move: 520, atkCd: 1500, aggro: 10, range: 6, proj: 'ice', respawn: 12 * 60000, armor: 0.2, gold: [7000, 12000],
    loot: [L('trofeo_reina_coral', 1, 1, 1), L('pocion_vida_g', 1, 3, 6), L('pocion_mana_g', 1, 3, 6), L('perla', 1, 3, 6), L('escama_sirena', 1, 2, 4), L('pluma_fenix', 0.3, 1, 1)] },
};

function build(ITEMS, MONSTERS, SPAWN_PLAN) {
  Object.assign(ITEMS, {
    trofeo_serafin_fuego: { name: 'Pluma Ígnea del Serafín', icon: '🪶', type: 'misc', stack: true, sell: 22000 },
    trofeo_serafin: { name: 'Halo del Serafín', icon: '😇', type: 'misc', stack: true, sell: 24000 },
    trofeo_amenkhet: { name: 'Ankh Dorado de Amenkhet', icon: '☥', type: 'misc', stack: true, sell: 23000 },
    trofeo_reina_coral: { name: 'Corona de Coral', icon: '👑', type: 'misc', stack: true, sell: 20000 },
  });
  for (const [type, d] of Object.entries(MON)) {
    const { zone, n, ...def } = d;
    def.loot = def.loot.concat(def.boss ? [] : POT.concat(GEMLOOT.map((g) => [g[0], g[1] / 3, g[2], g[3]])));
    MONSTERS[type] = def;
    if (n) SPAWN_PLAN.push({ zone, type, n });
  }
}
module.exports = { build, MON };
