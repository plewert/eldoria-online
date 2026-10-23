'use strict';
/** Set del Titán de Magma: botín raro del Coloso Ancestral. [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['titan_yelmo',      'Yelmo del Titán',            't_helm',     'head',   46, 20, { hp: 90 }, 0.05],
  ['titan_capacete',   'Capacete de Magma',          't_dome',     'head',   48, 22, { hp: 110, atk: 2 }, 0.05],
  ['titan_yelmo_astas','Yelmo Astado del Titán',     't_horn',     'head',   50, 25, { hp: 130, atk: 3 }, 0.04],
  ['titan_capacete_asc','Capacete de Ascuas',        't_ember',    'head',   52, 27, { hp: 150, atk: 4 }, 0.04],
  ['titan_capacete_pua','Capacete de Púas Ígneas',   't_spike',    'head',   55, 30, { hp: 175, atk: 6 }, 0.03],
  ['titan_capacete_inf','Capacete Infernal',         't_infernal', 'head',   58, 33, { hp: 200, atk: 8, crit: 0.01 }, 0.03],
  ['titan_coraza',     'Coraza del Titán de Magma',  't_chest',    'body',   54, 44, { hp: 280, atk: 6 }, 0.03],
  ['titan_guantes',    'Guanteletes del Titán',      't_glove1',   'gloves', 48, 9,  { hp: 40, atk: 3 }, 0.05],
  ['titan_guantes_mag','Guanteletes de Magma',       't_glove2',   'gloves', 55, 13, { hp: 70, atk: 6 }, 0.03],
  ['titan_cinto',      'Cinto Forjado del Titán',    't_belt',     'belt',   50, 11, { hp: 120 }, 0.04],
  ['titan_grebas',     'Grebas del Titán',           't_leg1',     'legs',   46, 15, { hp: 70 }, 0.05],
  ['titan_grebas_ven', 'Grebas Venadas',             't_leg2',     'legs',   50, 18, { hp: 95 }, 0.04],
  ['titan_rodilleras', 'Rodilleras de Magma',        't_leg3',     'legs',   54, 22, { hp: 120, atk: 3 }, 0.04],
  ['titan_grebas_alt', 'Grebas Altas de Lava',       't_leg4',     'legs',   58, 26, { hp: 150, atk: 5 }, 0.03],
  ['titan_botas',      'Botas del Titán',            't_boot',     'boots',  52, 14, { hp: 80 }, 0.04],
];
// armas y escudo: [id, nombre, sprite, nivel, ataque, cd, elemento, probabilidad]
const WEAPONS = [
  ['titan_espada',  'Hoja de Magma',        't_sword',  52, 90, 1050, 'fire', 0.03],
  ['titan_martillo','Martillo del Coloso',  't_hammer', 56, 99, 1500, 'fire', 0.025],
];
const SHIELD = ['titan_escudo', 'Escudo del Dragón de Magma', 't_shield', 54, 34, { hp: 170, def: 6 }, 0.03];
const ICON = { head: '⛑️', body: '🛡️', gloves: '🧤', belt: '🎗️', legs: '🦿', boots: '🥾' };

function build(ITEMS, MONSTERS, bossType) {
  for (const [id, name, spr, type, L, def, bonus] of PIECES) {
    ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, titan: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 3 };
  }
  for (const [id, name, spr, L, atk, cd, el] of WEAPONS) {
    ITEMS[id] = { name, icon: id === 'titan_martillo' ? '🔨' : '🗡️', spr, type: 'weapon', style: 'melee', atk, cd, range: 1, el, titan: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 5 };
  }
  { const [id, name, spr, L, def, bonus] = SHIELD; ITEMS[id] = { name, icon: '🛡️', spr, type: 'shield', def, bonus, titan: 1, minLevel: L, sell: Math.round(8 + L * L * 3.4) * 3 }; }
  const boss = MONSTERS[bossType];
  for (const w of WEAPONS) boss.loot.push([w[0], w[7], 1, 1]);
  boss.loot.push([SHIELD[0], SHIELD[6], 1, 1]);
  for (const [id, , , , , , , ch] of PIECES) boss.loot.push([id, ch, 1, 1]);
}
module.exports = { build, PIECES, WEAPONS, SHIELD };
