'use strict';
/** Legiones del Inframundo: ~45 demonios de seis familias (diablillos, querubines, siervos, diablos, hechiceras infernales,
 *  demonios serafín y archidemonios) repartidos por la gran zona de ceniza, más tres serafines caídos como jefes de campo.
 *  Los más débiles viven en el centro (donde apareces) y los más fuertes en los extremos oeste y este. Cada familia suelta
 *  su propio material (se vende), pociones y gemas; los jefes sueltan trofeo. Datos en `ROSTER`; los dibujos están en sprites.json. */
const L = (it, ch, a, b) => [it, ch, a, b];
const MID = [150, 291, 330, 395], WEST = [0, 291, 149, 395], EAST = [331, 291, 479, 395];
// niveles de dureza: vida, daño, experiencia, oro
const TIER = [
  { lv: 420, hp: 9000,  dmg: [140, 220], exp: 4800,  gold: [160, 420],  respawn: 50000 },
  { lv: 480, hp: 12500, dmg: [170, 260], exp: 6200,  gold: [220, 560],  respawn: 55000 },
  { lv: 540, hp: 17000, dmg: [210, 320], exp: 7800,  gold: [300, 760],  respawn: 60000 },
  { lv: 600, hp: 23000, dmg: [260, 390], exp: 9800,  gold: [400, 1000], respawn: 65000 },
  { lv: 660, hp: 31000, dmg: [320, 480], exp: 12500, gold: [550, 1400], respawn: 75000 },
  { lv: 720, hp: 42000, dmg: [400, 600], exp: 16500, gold: [800, 2000], respawn: 90000 },
];
const MAT = {
  imp: ['cuerno_diablillo', 'Cuerno de Diablillo', '🦴', 900],
  che: ['ala_demoniaca', 'Ala Demoníaca', '🪽', 1400],
  ser: ['esencia_sombria', 'Esencia Sombría', '🌑', 2200],
  smd: ['garra_infernal', 'Garra Infernal', '🔱', 3000],
  inf: ['lagrima_infernal', 'Lágrima Infernal', '🔮', 4200],
  fie: ['colmillo_demoniaco', 'Colmillo Demoníaco', '🦷', 5500],
  arc: ['sello_demoniaco', 'Sello Demoníaco', '🔥', 8000],
};
const ARM = [['pocion_vida_g', 0.4, 1, 3], ['pocion_mana_g', 0.3, 1, 2]];
const GEM = (t) => [L('rubi', 0.05 + 0.02 * t, 1, 2), L('zafiro', 0.04 + 0.02 * t, 1, 1), L('topacio', 0.03 + 0.02 * t, 1, 1)];

// [tipo, nombre, icono, familia, celda del dibujo, dureza, altura del dibujo, extras, [[caja, n], …]]
const ROSTER = [
  ['diablillo', 'Diablillo', '👹', 'imp', 'imp_1_0', 0, 34, {}, [[MID, 5]]],
  ['diablillo_espada', 'Diablillo Espadachín', '🗡️', 'imp', 'imp_3_2', 0, 34, {}, [[MID, 5]]],
  ['diablillo_oscuro', 'Diablillo Sombrío', '😈', 'imp', 'imp_0_3', 0, 34, {}, [[MID, 5]]],
  ['diablillo_fuego', 'Diablillo Lanzafuego', '🔥', 'imp', 'imp_3_3', 0, 34, { range: 4, proj: 'fire' }, [[MID, 5]]],
  ['diablillo_tirador', 'Diablillo Tirador', '☄️', 'imp', 'imp_2_3', 0, 34, { range: 5, proj: 'fire' }, [[MID, 4]]],
  ['querubin_rojo', 'Querubín Rojo', '👿', 'che', 'che_0_1', 1, 36, {}, [[MID, 5]]],
  ['querubin_verde', 'Querubín Verde', '🟢', 'che', 'che_0_3', 1, 36, {}, [[MID, 4]]],
  ['querubin_borracho', 'Querubín Tabernero', '🍺', 'che', 'che_0_5', 1, 36, {}, [[MID, 4]]],
  ['querubin_dorado', 'Querubín Dorado', '🟠', 'che', 'che_0_6', 1, 36, {}, [[MID, 4]]],
  ['querubin_hielo', 'Querubín de Escarcha', '🧊', 'che', 'che_0_7', 1, 36, { range: 5, proj: 'ice' }, [[MID, 4]]],
  ['querubin_sombrio', 'Querubín Sombrío', '🟣', 'che', 'che_0_8', 1, 36, {}, [[MID, 4]]],
  ['cabeza_alada', 'Cabeza Alada', '🦇', 'ser', 'ser_0_7', 1, 34, { fly: true }, [[MID, 5]]],
  ['querubin_caido', 'Querubín Caído', '🪽', 'ser', 'ser_1_5', 1, 38, { fly: true }, [[MID, 5]]],
  ['sombra_infernal', 'Sombra Infernal', '👤', 'ser', 'ser_0_0', 1, 46, { fly: true }, [[MID, 5]]],
  ['espectro_gris', 'Espectro Gris', '👻', 'ser', 'ser_0_2', 2, 46, { fly: true }, [[MID, 4]]],
  ['baba_infernal', 'Baba Infernal', '🟪', 'ser', 'ser_0_6', 2, 44, {}, [[MID, 4]]],
  ['necrofago_infernal', 'Necrófago Infernal', '🧟', 'ser', 'ser_1_0', 2, 48, {}, [[WEST, 3], [EAST, 3]]],
  ['gargola', 'Gárgola de Piedra', '🗿', 'ser', 'ser_1_1', 3, 50, {}, [[WEST, 4], [EAST, 4]]],
  ['gargola_alada', 'Gárgola Alada', '🦅', 'ser', 'ser_1_3', 3, 52, { fly: true }, [[WEST, 3], [EAST, 3]]],
  ['horror_ojos', 'Horror de Mil Ojos', '👁️', 'ser', 'ser_1_4', 3, 50, {}, [[WEST, 3], [EAST, 3]]],
  ['diablo_cornudo', 'Diablo Cornudo', '😈', 'smd', 'smd_0_0', 2, 44, {}, [[WEST, 4], [EAST, 4]]],
  ['diablo_verde', 'Diablo Venenoso', '☠️', 'smd', 'smd_0_1', 2, 44, { range: 4, proj: 'poison' }, [[WEST, 3], [EAST, 3]]],
  ['diablo_carmesi', 'Diablo Carmesí', '🔴', 'smd', 'smd_1_0', 2, 44, {}, [[WEST, 4], [EAST, 4]]],
  ['diablo_hechicero', 'Diablo Hechicero', '🔮', 'smd', 'smd_1_1', 3, 46, { range: 5, proj: 'fire' }, [[WEST, 3], [EAST, 3]]],
  ['diablo_ardiente', 'Diablo Ardiente', '🔥', 'smd', 'smd_0_2', 3, 48, { range: 4, proj: 'fire' }, [[WEST, 3], [EAST, 3]]],
  ['diablo_llameante', 'Diablo Llameante', '🌋', 'smd', 'smd_1_2', 3, 48, {}, [[WEST, 3], [EAST, 3]]],
  ['hechicera_infernal', 'Hechicera Infernal', '🧙‍♀️', 'inf', 'inf_0_3', 3, 54, { range: 5, proj: 'fire' }, [[WEST, 3], [EAST, 3]]],
  ['bruja_oscura', 'Bruja Oscura', '🔮', 'inf', 'inf_0_2', 3, 54, { range: 5, proj: 'ice' }, [[WEST, 3], [EAST, 3]]],
  ['princesa_infernal', 'Princesa Infernal', '👸', 'inf', 'inf_1_3', 4, 56, { range: 6, proj: 'fire' }, [[WEST, 3], [EAST, 3]]],
  ['princesa_carmesi', 'Princesa Carmesí', '❤️‍🔥', 'inf', 'inf_1_4', 4, 56, { range: 6, proj: 'fire' }, [[WEST, 3], [EAST, 3]]],
  ['reina_cenizas', 'Reina de las Cenizas', '👑', 'inf', 'inf_0_6', 4, 58, { range: 6, proj: 'fire' }, [[WEST, 2], [EAST, 2]]],
  ['demonio_hacha', 'Demonio Serafín del Hacha', '🪓', 'fie', 'fie_0_2', 4, 58, {}, [[WEST, 3], [EAST, 3]]],
  ['demonio_cuchilla', 'Demonio Serafín de la Cuchilla', '🔪', 'fie', 'fie_0_7', 4, 58, {}, [[WEST, 3], [EAST, 3]]],
  ['demonio_cornudo', 'Demonio Serafín Cornudo', '🐂', 'fie', 'fie_1_1', 4, 60, {}, [[WEST, 3], [EAST, 3]]],
  ['demonio_guadana', 'Demonio Serafín de la Guadaña', '⚰️', 'fie', 'fie_1_3', 4, 60, {}, [[WEST, 3], [EAST, 3]]],
  ['demonio_negro', 'Demonio Serafín Negro', '🖤', 'fie', 'fie_1_8', 4, 60, {}, [[WEST, 3], [EAST, 3]]],
  ['archidemonio_acero', 'Archidemonio de Acero', '⚔️', 'arc', 'arc_0_6', 5, 64, {}, [[WEST, 3], [EAST, 3]]],
  ['archidemonio_llamas', 'Archidemonio de las Llamas', '🔥', 'arc', 'arc_0_3', 5, 66, { range: 4, proj: 'fire' }, [[WEST, 2], [EAST, 2]]],
  ['archidemonio_alado', 'Archidemonio de Alas Ígneas', '🪽', 'arc', 'arc_1_0', 5, 66, { range: 5, proj: 'fire' }, [[WEST, 2], [EAST, 2]]],
  ['archidemonio_gelido', 'Archidemonio Gélido', '❄️', 'arc', 'arc_1_3', 5, 64, { range: 5, proj: 'ice' }, [[WEST, 2], [EAST, 2]]],
  ['archidemonio_venenoso', 'Archidemonio Venenoso', '🧪', 'arc', 'arc_1_4', 5, 66, {}, [[WEST, 2], [EAST, 2]]],
  ['archidemonio_carmesi', 'Archidemonio Carmesí', '🩸', 'arc', 'arc_1_6', 5, 66, {}, [[WEST, 2], [EAST, 2]]],
  ['archidemonio_solar', 'Archidemonio Solar', '☀️', 'arc', 'arc_1_7', 5, 66, {}, [[WEST, 2], [EAST, 2]]],
];
// jefes de campo del Inframundo
const BOSSES = [
  ['serafin_caido', 'Serafín Caído', '🦇', 'big_0_0', 760, 280000, [260, 420], 110000, { fly: true }, [[10, 295, 110, 390]], 'trofeo_serafin_caido', 'Ala del Serafín Caído', 26000],
  ['serafina_noche', 'Serafina de la Noche', '🌙', 'big_0_1', 800, 330000, [280, 450], 125000, { fly: true, range: 6, proj: 'ice' }, [[370, 295, 470, 390]], 'trofeo_serafina_noche', 'Corona de la Serafina', 28000],
  ['serafin_infernal', 'Serafín Infernal', '🔥', 'big_0_2', 840, 400000, [300, 480], 150000, { fly: true, range: 5, proj: 'fire' }, [[130, 292, 200, 330]], 'trofeo_serafin_infernal', 'Corazón del Serafín Infernal', 32000],
];

function build(ITEMS, MONSTERS, SPAWN_PLAN) {
  for (const [id, name, icon, sell] of Object.values(MAT)) ITEMS[id] = { name, icon, type: 'misc', stack: true, sell };
  for (const b of BOSSES) ITEMS[b[10]] = { name: b[11], icon: b[2], type: 'misc', stack: true, sell: b[12] };
  for (const [type, name, icon, fam, spr, t, h, ex, spots] of ROSTER) {
    const T = TIER[t], mat = MAT[fam][0];
    MONSTERS[type] = Object.assign({ name, icon, spr: type, lv: T.lv, hp: T.hp, dmg: T.dmg, exp: T.exp, move: 480 + (t % 3) * 60, atkCd: 1500 + (t % 2) * 200, aggro: 8, respawn: T.respawn,
      gold: T.gold, loot: [L(mat, 0.6, 1, 2)].concat(ARM, GEM(t)) }, ex);
    for (const [box, n] of spots) SPAWN_PLAN.push({ zone: 'inframundo', type, n, box });
  }
  for (const [type, name, icon, spr, lv, hp, dmg, exp, ex, boxes, trophy] of BOSSES) {
    MONSTERS[type] = Object.assign({ name, icon, spr: type, lv, hp, dmg, exp, move: 480, atkCd: 1400, aggro: 14, respawn: 15 * 60000, armor: 0.35, boss: true, gold: [9000, 16000],
      loot: [L(trophy, 1, 1, 1), L('pocion_vida_g', 1, 4, 8), L('pocion_mana_g', 1, 4, 8), L('pluma_fenix', 0.5, 1, 2), L('rubi', 0.8, 2, 4), L('zafiro', 0.8, 2, 4), L('topacio', 0.6, 1, 3), L(MAT.arc[0], 1, 2, 4)] }, ex);
    for (const box of boxes) SPAWN_PLAN.push({ zone: 'inframundo', type, n: 1, box });
  }
}
module.exports = { build, ROSTER, BOSSES, TIER, MAT };
