'use strict';
/**
 * Pociones y elixirs nuevos (los iconos son las botellas de la hoja de pociones: gear.json i_p_*).
 *  - Poción de Regeneración: cura un 2,5 % de la vida cada segundo durante 20 s.
 *  - Antídoto: quita el veneno y las quemaduras y, 30 s, resiste el 80 % de su daño.
 *  - Poción de Furia / Arcana / de Rango: +15 % de ataque con armas cuerpo a cuerpo / mágicas / a distancia (y +10 % de defensa), 5 min.
 *  - Elixir del Cazador de Botín: +50 % de probabilidad de botín (las mascotas no cuentan), 5 min. Muy caro.
 *  - Elixir de Suerte del Minero: el doble de gemas al minar, 10 min.
 *  - Elixir del Pescador: pesca más rápida y con más probabilidad de piezas raras, 10 min.
 */
const POT = {
  pocion_regen:    { name: 'Poción de Regeneración', spr: 'p_regen', buff: { regen: 0.025 }, secs: 20, minLevel: 1, price: 50000, desc: 'Cura un 2,5 % de tu vida cada segundo durante 20 s.' },
  pocion_antidoto: { name: 'Antídoto', spr: 'p_antidoto', buff: { antidote: 1 }, secs: 30, cure: 1, minLevel: 1, price: 50000, desc: 'Quita el veneno y las quemaduras; durante 30 s resistes el 80 % de su daño.' },
  elixir_furia:    { name: 'Poción de Furia (cuerpo a cuerpo)', spr: 'p_furia', buff: { atkm: 1.15, def: 1.1 }, secs: 300, minLevel: 40, price: 100000, desc: '+15 % de ataque con armas cuerpo a cuerpo y +10 % de defensa durante 5 min.' },
  elixir_arcano:   { name: 'Poción Arcana (magia)', spr: 'p_arcana', buff: { atkg: 1.15, def: 1.1 }, secs: 300, minLevel: 40, price: 100000, desc: '+15 % de ataque con armas mágicas y +10 % de defensa durante 5 min.' },
  elixir_rango:    { name: 'Poción de Rango (a distancia)', spr: 'p_rango', buff: { atkr: 1.15, def: 1.1 }, secs: 300, minLevel: 40, price: 100000, desc: '+15 % de ataque con armas a distancia y +10 % de defensa durante 5 min.' },
  pocion_salto:    { name: 'Poción de Teletransporte corto', spr: 'p_salto', blink: 6, minLevel: 1, price: 30000, desc: 'Te teletransporta hasta 6 casillas hacia donde miras (si hay hueco libre). Un solo uso.' },
  pocion_critico:  { name: 'Poción de Crítico', spr: 'p_critico', buff: { crit: 0.15 }, secs: 300, minLevel: 40, price: 200000, desc: '+15 % de probabilidad de golpe crítico durante 5 min. No se usa a la vez que las pociones de Furia, Arcana o Rango.' },
  pocion_resistencia: { name: 'Poción de Resistencia Elemental', spr: 'p_resistencia', buff: { eres: 0.7 }, secs: 300, minLevel: 30, price: 100000, desc: 'Reduce un 30 % el daño de fuego, hielo y veneno durante 5 min.' },
  elixir_raid:     { name: 'Elixir de la Raid', spr: 'p_raid', buff: { raid: 1.2 }, secs: 10800, raidOnly: 1, minLevel: 40, price: 1000000, desc: 'Solo en la Raid: +20 % de ataque y +20 % de defensa hasta que termine la Raid.' },
  elixir_cazador_raid: { name: 'Elixir del Cazador de Botín (Raid)', spr: 'p_cazador', buff: { raidloot: 1.5 }, secs: 10800, raidOnly: 1, minLevel: 40, price: 1200000, desc: 'Solo en la Raid: +50 % de probabilidad de botín (jefes y cofre; las mascotas no cuentan) hasta que termine la Raid.' },
  elixir_cazador:  { name: 'Elixir del Cazador de Botín', spr: 'p_cazador', buff: { loot: 1.5 }, secs: 300, minLevel: 30, price: 1000000, desc: '+50 % de probabilidad de botín (no mascotas) durante 5 min.' },
  elixir_minero:   { name: 'Elixir de Suerte del Minero', spr: 'p_minero', buff: { gem: 2 }, secs: 600, minLevel: 1, price: 1000000, desc: 'El doble de gemas al minar durante 10 min.' },
  elixir_pescador: { name: 'Elixir del Pescador', spr: 'p_pescador', buff: { fish: 1.5 }, secs: 600, minLevel: 1, price: 1000000, desc: 'Pesca más rápida y más piezas raras durante 10 min.' },
};
const SOLD = { boris: ['pocion_regen', 'pocion_antidoto', 'elixir_furia', 'elixir_arcano', 'elixir_rango', 'pocion_critico', 'pocion_resistencia', 'pocion_salto', 'elixir_raid', 'elixir_cazador_raid', 'elixir_cazador', 'elixir_minero', 'elixir_pescador'] };
const DOT_LABEL = /fuego negro|fuego amarillo|telaraña ardiente|charco|miasma|lava|red de fuego|línea de fuego|veneno|ácido/i;
const REGEN_MS = 1000;
const ATK_POTS = ['atkm', 'atkg', 'atkr'];                     // el crítico no se usa a la vez que estas
const ELEM_LABEL = /fuego|llama|lava|meteor|magma|brasa|ardiente|quema|hielo|helad|escarcha|ventisca|veneno|ácid|miasma|tóxic/i;

function build(ITEMS, SHOPS) {
  for (const [id, d] of Object.entries(POT)) ITEMS[id] = Object.assign({ icon: '🧪', type: 'consumable', stack: true, sell: Math.round(d.price / 4) }, d);
  for (const [npc, ids] of Object.entries(SOLD)) if (SHOPS[npc]) SHOPS[npc].push(...ids);
}

function install(Game) {
  const P = Game.prototype;
  // quita el veneno y otros daños continuos que tenga el jugador
  P.cleanse = function (p) { if (this.dots) this.dots = this.dots.filter((d) => d.tid !== p.id); };
  const H0 = P.hurtPlayer;
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    if (srcName && p.buffs && p.buffs.antidote && p.buffs.antidote.until > this.now && DOT_LABEL.test(srcName)) raw = Math.max(1, Math.round(raw * 0.2));
    if (p.buffs && p.buffs.eres && p.buffs.eres.until > this.now && src && src.kind !== 'pl') {       // resistencia elemental: fuego, hielo y veneno
      const el = src.def && src.def.proj; if (el === 'fire' || el === 'ice' || el === 'poison' || (srcName && ELEM_LABEL.test(srcName))) raw = Math.max(1, Math.round(raw * p.buffs.eres.m));
    }
    return H0.call(this, p, raw, src, now, srcName);
  };
  // Elixir de la Raid: activo solo mientras tú y la Raid sigan dentro; al terminar se quita
  P.raidOn = function (p) { return !!(this.raid && this.raid.members && this.raid.members.has(p.key) && /^raid_/.test(require('./world').zoneAt(p.x, p.y).id)); };
  P.critBuff = function (p) { const b = p.buffs && p.buffs.crit; return b && b.until > this.now ? b.m : 0; };
  // usos especiales: salto corto y exclusión crítico / pociones de ataque
  const U0 = P.use;
  P.use = function (p, slot) {
    const it = p.inv[slot | 0], d = it && require('./data').ITEMS[it.id], act = (k) => p.buffs && p.buffs[k] && p.buffs[k].until > this.now;
    if (d && d.buff && d.minLevel <= p.level) {
      if (d.buff.crit && ATK_POTS.some(act)) { this.msg(p, 'No puedes usar la Poción de Crítico con una poción de Furia, Arcana o Rango activa.', 's'); return; }
      if (ATK_POTS.some((k) => d.buff[k]) && act('crit')) { this.msg(p, 'No puedes usar esa poción con la Poción de Crítico activa.', 's'); return; }
    }
    if (d && d.raidOnly && d.minLevel <= p.level && !this.raidOn(p)) { this.msg(p, 'El Elixir de la Raid solo se puede usar dentro de la Raid.', 's'); return; }
    if (d && d.blink) {
      if (this.now < p.nextPotion) return;
      const world = require('./world'), W = world.W, key = (x, y) => y * W + x, DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]][p.dir | 0] || [0, 1];
      const z0 = world.zoneAt(p.x, p.y); let best = null;
      for (let n = d.blink; n >= 1; n--) {
        const x = p.x + DIR[0] * n, y = p.y + DIR[1] * n;
        if (world.isWalkable(x, y) && world.reach[key(x, y)] && world.zoneAt(x, y) === z0 && !this.pgrid.has(key(x, y)) && !this.mgrid.has(key(x, y))) { best = [x, y]; break; }
      }
      if (!best) { this.msg(p, 'No hay hueco libre para saltar en esa dirección.', 's'); return; }
      const ox = p.x, oy = p.y; this.fx.push({ k: 'tpo', x: ox, y: oy });
      this.pgrid.delete(key(ox, oy)); p.x = best[0]; p.y = best[1]; this.pgrid.set(key(p.x, p.y), p);
      p.tpSeq++; p.target = null; p.pend = null; this.fx.push({ k: 'tpi', x: p.x, y: p.y });
      it.qty--; if (it.qty <= 0) p.inv[slot | 0] = null; p.dirty.inv = true; p.nextPotion = this.now + 1000;
      return;
    }
    return U0.call(this, p, slot);
  };
  // ataque extra según el estilo del arma (no se multiplica con el elixir de ataque general: vale el mayor)
  const W0 = P.weaponOf;
  P.weaponOf = function (p) {
    let w = W0.call(this, p); if (!p.buffs || !w) return w;
    if (p.buffs.raid && p.buffs.raid.until > this.now && this.raidOn(p)) w = Object.assign({}, w, { atk: Math.round(w.atk * p.buffs.raid.m) });
    const sm = this.buffMult(p, w.style === 'magic' ? 'atkg' : w.style === 'ranged' ? 'atkr' : 'atkm'); if (sm === 1) return w;
    const am = this.buffMult(p, 'atk'); if (sm <= am) return w;
    return Object.assign({}, w, { atk: Math.round((w.atk / am) * sm) });
  };
  const D0 = P.defOf;
  P.defOf = function (p) { const d = D0.call(this, p); return p.buffs && p.buffs.raid && p.buffs.raid.until > this.now && this.raidOn(p) ? Math.round(d * p.buffs.raid.m) : d; };
  // multiplicador de botín del Elixir del Cazador (las mascotas no se ven afectadas)
  P.lootMult = function (p, id) { const I = require('./data').ITEMS[id]; return p && p.buffs && !(I && I.type === 'pet') ? this.buffMult(p, 'loot') : 1; };
  // regeneración
  const T0 = P.tickExt;
  P.tickExt = function (now) {
    T0.call(this, now);
    for (const p of this.players.values()) {
      if (p.buffs && (p.buffs.raid || p.buffs.raidloot) && !this.raidOn(p)) { p.buffs.raid = null; p.buffs.raidloot = null; this.sendBuffs(p); }       // terminó la Raid (o saliste): se acaba el elixir
      const b = p.buffs && p.buffs.regen; if (!b || b.until <= this.now || p.hp <= 0 || now < (p.nextRegen || 0)) continue;
      p.nextRegen = now + REGEN_MS; if (p.hp >= p.maxHp) continue;
      const h = Math.max(1, Math.round(p.maxHp * b.m)); p.hp = Math.min(p.maxHp, p.hp + h); p.dirty.stats = true;
      this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + h, c: 'g' });
    }
  };
}
module.exports = { build, install, POT, SOLD };
