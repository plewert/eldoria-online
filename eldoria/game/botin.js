'use strict';
/**
 * Botín de jefes: el equipo y las armas salen mucho menos (la probabilidad pasa a 1/3) y, en su lugar, cada jefe de cueva suelta
 * dos materiales propios, que se acumulan, se venden caros y se fabrican en elixires de jefe (mesa de trabajo de una ciudad).
 */
const GEAR_K = 1 / 3;                                               // multiplicador de la probabilidad de caer de armas y armaduras
const GEAR_TYPES = new Set(['weapon', 'head', 'body', 'shield', 'amulet', 'ring', 'belt', 'gloves', 'legs', 'boots', 'cape']);
const MAT_CHANCE = 0.5;

/** jefe → [[material, nombre, icono, precio de venta], [material 2 …]], elixir { id, nombre, spr, buff, secs, desc } */
const BOSS_MATS = {
  dragon_sombra:  { mats: [['escama_sombra', 'Escama de Sombra', '🐲', 40000], ['colmillo_sombra', 'Colmillo del Dragón', '🦷', 40000]],
                    elixir: ['elixir_dragon', 'Elixir del Dragón de Sombras', 'p_furia', { atk: 1.12 }, 600, '+12 % de ataque durante 10 min.'] },
  hidra_jade:     { mats: [['escama_jade', 'Escama de Jade', '🟢', 48000], ['veneno_hidra', 'Veneno de Hidra', '☠️', 48000]],
                    elixir: ['elixir_hidra', 'Elixir de la Hidra de Jade', 'p_regen', { regen: 0.01 }, 60, 'Cura un 1 % de tu vida cada segundo durante 60 s.'] },
  arcangel:       { mats: [['pluma_celeste', 'Pluma Celestial', '🪶', 56000], ['polvo_estelar', 'Polvo Estelar', '✨', 56000]],
                    elixir: ['elixir_celestial', 'Elixir Celestial', 'p_resistencia', { def: 1.2 }, 600, '+20 % de defensa durante 10 min.'] },
  aracnido_fuego: { mats: [['seda_negra', 'Seda Negra', '🕸️', 64000], ['ojo_arana', 'Ojo de Aracnídeo', '👁️', 64000]],
                    elixir: ['elixir_seda', 'Elixir de Seda Negra', 'p_critico', { crit: 0.1 }, 600, '+10 % de golpe crítico durante 10 min (no se usa con Furia, Arcana o Rango).'] },
  leviatan:       { mats: [['perla_abisal', 'Perla Abisal', '🫧', 72000], ['coral_negro', 'Coral Negro', '🪸', 72000]],
                    elixir: ['elixir_abisal', 'Elixir Abisal', 'p_antidoto', { eres: 0.6 }, 600, 'Reduce un 40 % el daño de fuego, hielo y veneno durante 10 min.'] },
  ignaros:        { mats: [['nucleo_magma', 'Núcleo de Magma', '🔥', 80000], ['ceniza_ardiente', 'Ceniza Ardiente', '🌋', 80000]],
                    elixir: ['elixir_magma', 'Elixir del Magma', 'p_furia', { atk: 1.2 }, 300, '+20 % de ataque durante 5 min.'] },
  anubis:         { mats: [['vendas_eternas', 'Vendas Eternas', '🩹', 90000], ['ankh_dorado', 'Ankh Dorado', '☥', 90000]],
                    elixir: ['elixir_juicio', 'Elixir del Juicio', 'p_arcana', { xp: 1.5 }, 900, '+50 % de experiencia durante 15 min.'] },
  zeus:           { mats: [['fragmento_rayo', 'Fragmento de Rayo', '⚡', 100000], ['pluma_aguila', 'Pluma de Águila Real', '🦅', 100000]],
                    elixir: ['elixir_trueno', 'Elixir del Trueno', 'p_cazador', { loot: 1.3 }, 600, '+30 % de probabilidad de botín (no mascotas) durante 10 min.'] },
};

function build(ITEMS, MONSTERS, RECIPES) {
  // 1) el equipo sale menos
  for (const m of Object.values(MONSTERS)) if (m.loot && !m.gearK) { for (const l of m.loot) if (ITEMS[l[0]] && GEAR_TYPES.has(ITEMS[l[0]].type)) l[1] = l[1] * GEAR_K; m.gearK = 1; }
  // 2) materiales de jefe y sus elixires
  for (const [boss, d] of Object.entries(BOSS_MATS)) {
    for (const [id, name, icon, sell] of d.mats) {
      ITEMS[id] = { name, icon, type: 'misc', stack: true, sell, desc: 'Material de jefe: véndelo o fabrica un elixir en la mesa de trabajo de una ciudad.' };
      if (MONSTERS[boss]) MONSTERS[boss].loot.push([id, MAT_CHANCE, 1, 3]);
    }
    const [eid, ename, spr, buff, secs, desc] = d.elixir;
    ITEMS[eid] = { name: ename, icon: '🧪', spr, type: 'consumable', stack: true, buff, secs, minLevel: 30, sell: 20000, desc };
    RECIPES.push({ id: 'r_' + eid, name: ename, lvl: 5, ing: [[d.mats[0][0], 4], [d.mats[1][0], 4]], out: [eid, 1], xp: 60 });
  }
}
module.exports = { build, GEAR_K, BOSS_MATS, GEAR_TYPES };
