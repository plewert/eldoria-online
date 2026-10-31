'use strict';
/**
 * Instancias privadas de los jefes de cueva (pagas, individuales).
 *  - Cada cueva tiene 6 copias exactas al sur del mapa (zonas inst_<cueva>_<n>); los precios están en `INST_CAVES` (game/world.js).
 *  - Entras por un portal junto a la puerta de la cueva y pagas al cruzarlo. Solo tú estás dentro.
 *  - El jefe sale al instante: +50 % de vida, +25 % de daño y +50 % de oro y de botín (las mascotas no suben). Duración máxima: 20 min.
 *  - Termina cuando el jefe cae (90 s para recoger el botín), se acaba el tiempo, sales por el portal, mueres o te desconectas.
 */
const world = require('./world');
const { ITEMS, CFG } = require('./data');
const HP_K = 1.5, DMG_K = 1.25, LOOT_K = 1.5, MAX_MS = 20 * 60 * 1000, CLEAR_MS = 90 * 1000;
const kxy = (x, y) => y * world.W + x;

function install(Game) {
  const P = Game.prototype;
  const slotsOf = () => world.INSTANCES.flatMap((I) => I.slots.map((sl) => ({ I, sl })));
  const byZone = (id) => slotsOf().find((q) => q.sl.id === id);
  const state = (g) => g.instSt || (g.instSt = new Map());          // id de plaza -> { key, boss, endAt, cleared }

  // el portal de entrada paga y lleva a una plaza libre
  P.instEnter = function (p, portal) {
    const I = world.INSTANCES.find((q) => q.cave === portal.inst), st = state(this);
    if (p.bot) return;
    const free = I.slots.find((sl) => !st.has(sl.id));
    if (!free) { this.msgThrottle(p, 'instfull', 'Las instancias de este jefe están ocupadas. Inténtalo en unos minutos.'); return; }
    if (p.gold < I.fee) { this.msgThrottle(p, 'fee', `Esta instancia cuesta ${I.fee.toLocaleString('es')} de oro (en mano).`); return; }
    p.gold -= I.fee; p.dirty.inv = true;
    const key = p.key, now = this.now;
    st.set(free.id, { key, boss: null, endAt: now + MAX_MS, cleared: false });
    const px = p.x, py = p.y; this.pgrid.delete(kxy(px, py));
    p.x = free.inside[0]; p.y = free.inside[1]; p.tpSeq++; p.target = null; p.pend = null; this.pgrid.set(kxy(p.x, p.y), p);
    const m = this.spawnMonster(I.boss, free.lair[0], free.lair[1]);
    m.maxHp = m.hp = Math.round(m.def.hp * HP_K); m.instSlot = free.id; m.instMul = DMG_K; m.noRespawn = true; m.respawnAt = Infinity;
    st.get(free.id).boss = m;
    this.msg(p, `Pagas ${I.fee.toLocaleString('es')} de oro: instancia privada de ${m.def.name}. Jefe +50 % de vida y +25 % de daño, +50 % de botín. Tienes 20 min.`, 's');
  };

  // saca al dueño (si sigue dentro) y limpia la plaza
  const end = function (g, id, why) {
    const st = state(g), s = st.get(id), q = byZone(id); if (!s || !q) return;
    const owner = [...g.players.values()].find((x) => x.key === s.key);
    if (owner && world.zoneAt(owner.x, owner.y).id === id) {
      g.pgrid.delete(kxy(owner.x, owner.y)); owner.x = q.I.out[0]; owner.y = q.I.out[1]; owner.tpSeq++; owner.target = null; owner.pend = null; g.pgrid.set(kxy(owner.x, owner.y), owner);
      if (why) g.msg(owner, why, 's');
    }
    const [x0, y0, x1, y1] = q.sl.rect;
    g.monsters = g.monsters.filter((m) => { const inside = m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1; if (inside) { g.mgrid.delete(kxy(m.x, m.y)); g.ents.delete(m.id); } return !inside; });
    for (const o of [...g.ground.values()]) if (o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1) g.removeGround(o);
    st.delete(id);
  };
  P.instTick = function (now) {
    const st = state(this); if (!st.size) return;
    for (const [id, s] of [...st]) {
      const owner = [...this.players.values()].find((x) => x.key === s.key), inside = owner && world.zoneAt(owner.x, owner.y).id === id;
      if (!inside) { end(this, id, ''); continue; }
      if (now >= s.endAt) end(this, id, s.cleared ? 'La instancia se cierra. ¡Buen trabajo!' : '⌛ Se acabó el tiempo: la instancia se cierra.');
    }
  };
  const T0 = P.tickExt;
  P.tickExt = function (now) { T0.call(this, now); if (!this.nextInst || now >= this.nextInst) { this.nextInst = now + 1000; this.instTick(now); } };

  // al derrotar al jefe: +50 % de oro y de botín (las mascotas no cambian) y 90 s para recoger
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (!m.instSlot) return K0.call(this, m, now);
    const real = m.def;
    m.def = Object.assign({}, real, { loot: real.loot.map(([id, ch, a, b]) => [id, ITEMS[id] && ITEMS[id].type === 'pet' ? ch : Math.min(1, ch * LOOT_K), a, b]), gold: [Math.round(real.gold[0] * LOOT_K), Math.round(real.gold[1] * LOOT_K)] });
    try { K0.call(this, m, now); } finally { m.def = real; }
    const s = state(this).get(m.instSlot); if (s) { s.cleared = true; s.endAt = Math.min(s.endAt, this.now + CLEAR_MS); }
    const owner = s && [...this.players.values()].find((x) => x.key === s.key); if (owner) this.msg(owner, `¡${real.name} ha caído! Recoge tu botín: la instancia se cierra en 90 s.`, 's');
  };

  // el jefe de la instancia pega más fuerte
  const H0 = P.hurtPlayer;
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    if (src && src.instMul) raw = Math.round(raw * src.instMul);
    return H0.call(this, p, raw, src, now, srcName);
  };

  // si alguien aparece dentro de una instancia ajena (p. ej. tras reiniciar el servidor), se le saca
  const L0 = P.onLogin;
  P.onLogin = function (p) {
    L0.call(this, p);
    const q = byZone(world.zoneAt(p.x, p.y).id);
    if (q && (state(this).get(q.sl.id) || {}).key !== p.key) { p.x = q.I.out[0]; p.y = q.I.out[1]; p.tpSeq++; }
  };
}
module.exports = { install, HP_K, DMG_K, LOOT_K, MAX_MS, CLEAR_MS };
