'use strict';
/**
 * Familias de criaturas y equipo. Un arma de una familia hace más daño a los monstruos de esa familia
 * (de +15 % a +35 % según el nivel del arma) y las piezas de armadura de la familia reducen el daño que
 * esos monstruos hacen (de 1,5 % a 2,5 % por pieza, tope 15 %). Todo el equipo sin familia sigue valiendo igual contra todo.
 */
const FAMS = {
  dragon:   { name: 'Dragones',        icon: '🐉' },
  hidra:    { name: 'Hidras y reptiles', icon: '🐍' },
  nomuerto: { name: 'No-muertos',      icon: '💀' },
  demonio:  { name: 'Demonios',        icon: '😈' },
  angel:    { name: 'Ángeles y celestiales', icon: '👼' },
  bestia:   { name: 'Bestias',         icon: '🐺' },
  gigante:  { name: 'Gigantes y golems', icon: '🗿' },
  hielo:    { name: 'Criaturas de hielo', icon: '❄️' },
  marino:   { name: 'Criaturas marinas', icon: '🌊' },
  fuego:    { name: 'Criaturas de fuego', icon: '🔥' },
};
const WEAPON_MIN = 0.15, WEAPON_MAX = 0.35, ARMOR_MIN = 0.015, ARMOR_MAX = 0.025, ARMOR_CAP = 0.15;
const GEAR = new Set(['weapon', 'head', 'body', 'shield', 'legs', 'boots', 'gloves', 'belt', 'cape', 'amulet', 'ring']);

// monstruos: por su clave (puede caer en varias familias)
const MON_RULES = [
  ['dragon',   /^dragon/],
  ['hidra',    /hidra|medusa|cobra|serpiente|lagarto|raid_slyvra|raid_vibora|^bruja$/],
  ['nomuerto', /esqueleto|necrofago|momia|faraon|zombi|banshee|nigromante|espectro|anubis|sombra_infernal|halloween|rey_ogro|ogro_zombi/],
  ['demonio',  /demonio|diablo|diablillo|serafin_caido|serafina|serafin_infernal|hades|cerbero|hechicera_infernal|bruja_oscura|princesa|reina_cenizas|gargola|horror_ojos|baba_infernal|cabeza_alada|querubin_caido|querubin_sombrio|raid_malgathor|sombra_infernal/],
  ['angel',    /arcangel|^angel|serafin_fuego|serafin_tormenta|serafin_menor|querubin_(?!caido|sombrio)|guardian_alado|espada_celestial|celestial|zeus|raid_xaelis/],
  ['bestia',   /arana|escorpion|escarabajo|aracnido|grifo|bestia|lobo|oso|jabali|mamut|yeti|conejo|rata|murcielago|sapo|gusano|tortuga|cangrejo|hada/],
  ['gigante',  /golem|troll|coloso|^ent_|orco|ogro|raid_koros/],
  ['hielo',    /hielo|helado|gelido|yeti|mamut|escarcha/],
  ['marino',   /sirena|cangrejo|tortuga|leviatan|reina_coral|lagarto_playa/],
  ['fuego',    /ignaros|golem_lava|ardiente|llameante|archidemonio_llamas|fuego|^dragon$|raid_aranak|raid_escorpion/],
];
// equipo: por id + nombre (una sola familia, la primera que encaje)
const ITEM_RULES = [
  ['hidra',    /^jade_|^md_|^rd_rv_/],
  ['dragon',   /dragon|dragón|dracón|^sombra_/],
  ['hidra',    /hidra|pantano|^jade_|^md_|^rd_rv_|escamas|cobra|víbora|serpiente/],
  ['nomuerto', /hueso|faraón|faraon|^an_|^hw_|^ka_|^el_|momia|anubis|calavera/],
  ['demonio',  /demon|demoníac|^hd_|^cb_|^rd_rm_|^arco_sombras|infernal|inframundo|cerbero|vacío|abismo/],
  ['angel',    /^angel_|celest|ángel|arcángel|divin|^zs_|^rd_rx_|aurora|alado|olimpo|trueno|tormenta|rayo/],
  ['marino',   /^mar_|tridente|perla|coral|pescador|ancla|navegante|leviat/],
  ['hielo',    /hielo|escarcha|glacial|reina|helad/],
  ['gigante',  /^titan_|titán|^rd_rk_|^va_|maza_enana|martillo|coloso|piedra|roca/],
  ['fuego',    /^ig_|^fuego_|llama|fuego|magma|ígneo|igneo|lava|brasas|rubí|^rd_ra_|ceniza|solar|sol\b/],
  ['bestia',   /^ae_|garra|colmillo|arco_cazador|^th_|cazador|lobo|oso/],
];

function tag(ITEMS, MONSTERS) {
  for (const [k, d] of Object.entries(MONSTERS)) {
    const f = MON_RULES.filter(([, re]) => re.test(k)).map(([n]) => n);
    if (f.length) d.fam = f;
  }
  for (const [k, d] of Object.entries(ITEMS)) {
    if (!GEAR.has(d.type) || d.famFixed) continue;
    const s = (k + ' ' + (d.name || '')).toLowerCase();
    const hit = ITEM_RULES.find(([, re]) => re.test(s));
    if (hit) d.fam = hit[0];
  }
}

/** Fracción extra de daño de un arma contra una familia (0 si no coincide). */
const weaponBonus = (d) => (d && d.fam ? WEAPON_MIN + (WEAPON_MAX - WEAPON_MIN) * Math.min(1, (d.minLevel || 1) / 100) : 0);
const armorPiece = (d) => ARMOR_MIN + (ARMOR_MAX - ARMOR_MIN) * Math.min(1, ((d && d.minLevel) || 1) / 100);

function install(Game, ITEMS, MONSTERS) {
  tag(ITEMS, MONSTERS);                      // los monstruos de módulos posteriores (Inframundo, etc.) ya existen aquí
  const P = Game.prototype, HM = P.hurtMonster, HP = P.hurtPlayer;
  P.famBonus = function (p, def) {
    const w = p && p.eq && p.eq.weapon, d = w && ITEMS[w.id];
    return d && d.fam && def && def.fam && def.fam.includes(d.fam) ? weaponBonus(d) : 0;
  };
  P.famResist = function (p, def) {
    if (!p || !p.eq || !def || !def.fam) return 0;
    let r = 0;
    for (const [slot, it] of Object.entries(p.eq)) {
      if (slot === 'weapon' || !it) continue;
      const d = ITEMS[it.id]; if (d && d.fam && def.fam.includes(d.fam)) r += armorPiece(d);
    }
    return Math.min(ARMOR_CAP, r);
  };
  P.hurtMonster = function (m, dmg, p, now) {
    const b = p && p.kind === 'pl' && m && m.def && m.def.fam ? this.famBonus(p, m.def) : 0;
    if (p && p.kind === 'pl' && m && m.def && m.def.weakOnly) {            // jefe débil solo a una familia de armas (Rey de los Dragones)
      const w = p.eq && p.eq.weapon, d = w && ITEMS[w.id];
      if (d && d.fam === m.def.weakOnly) dmg = Math.max(1, Math.round(dmg * 2.1));
      else { dmg = Math.max(1, Math.round(dmg * 0.4)); if (!(p.famFx > now)) { p.famFx = now + 3000; this.fx.push({ k: 'd', x: m.x, y: m.y, v: `🛡️ solo le dañan las armas de ${FAMS[m.def.weakOnly].name.toLowerCase()}`, c: 'x' }); } }
    } else if (b > 0) {
      dmg = Math.max(1, Math.round(dmg * (1 + b)));
      if (!(p.famFx > now)) { p.famFx = now + 3000; this.fx.push({ k: 'd', x: m.x, y: m.y, v: `${FAMS[ITEMS[p.eq.weapon.id].fam].icon} +${Math.round(b * 100)}%`, c: 'x' }); }
    }
    return HM.call(this, m, dmg, p, now);
  };
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    const def = src && src.kind === 'mo' ? src.def : null;
    if (def && def.fam) { const r = this.famResist(p, def); if (r > 0) raw = Math.max(1, Math.round(raw * (1 - r))); }
    return HP.call(this, p, raw, src, now, srcName);
  };
}
module.exports = { FAMS, tag, install, weaponBonus, armorPiece, WEAPON_MIN, WEAPON_MAX, ARMOR_CAP };
