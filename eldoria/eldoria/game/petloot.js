'use strict';
/**
 * Las mascotas recogen el botín: con una mascota activa, el oro y los objetos que dejan tus presas
 * (los tuyos, o los que no tienen dueño en zonas PvP y salieron de tu kill) acaban en tu mochila sin tener que pisarlos.
 *  - Radio de 8 casillas alrededor del dueño, un montón cada ~0,45 s y tras 1 s en el suelo (la mascota "va a por ello").
 *  - El oro conserva el bonus de la mascota. Si la mochila está llena, el objeto se queda en el suelo.
 *  - No toca el botín protegido de otros jugadores ni el que otros dejan al morir.
 */
const { ITEMS, CFG } = require('./data');
const I = require('./items');
const world = require('./world');

const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const RADIUS = 8, EVERY_MS = 450, SETTLE_MS = 1000;
const sameRealm = (a, b) => { const za = world.zoneAt(a.x, a.y), zb = world.zoneAt(b.x, b.y); return za === zb || (za.kind !== 'dungeon' && zb.kind !== 'dungeon'); };

function install(Game) {
  const P = Game.prototype;

  // marca el botín sin dueño (zonas PvP) de la presa de un jugador con mascota, para que solo su mascota lo recoja
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    let top = null, td = -1;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && e.dmg > td && now - e.t <= 120000) { td = e.dmg; top = pl; } }
    const g0 = this.nextGid;
    const r = K0.call(this, m, now);
    if (top && top.ext && top.ext.pet) {
      for (let gid = g0; gid < this.nextGid; gid++) { const g = this.ground.get(gid); if (g && !g.owner) g.petFor = top.id; }
    }
    return r;
  };

  P.petLootTick = function (now) {
    for (const p of this.players.values()) {
      if (!p.ws || p.hp <= 0 || !p.ext || !p.ext.pet || now < (p.nextPetPick || 0)) continue;
      const pd = ITEMS[p.ext.pet]; if (!pd) continue;
      let best = null, bd = 99;
      for (const g of this.ground.values()) {
        if (g.owner !== p.id && g.petFor !== p.id) continue;
        if (g.prot > now && g.owner !== p.id) continue;
        if (now - (g.exp - CFG.GROUND_TTL) < SETTLE_MS) continue;
        const d = cheb(p.x, p.y, g.x, g.y);
        if (d > RADIUS || d >= bd || !sameRealm(p, g)) continue;
        best = g; bd = d;
      }
      if (!best) continue;
      p.nextPetPick = now + EVERY_MS;
      const g = best;
      if (g.item === 'gold') {
        const gain = Math.round(g.qty * (1 + (pd.gold || 0)));
        this.removeGround(g); p.gold += gain; p.dirty.inv = true;
        this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + gain + '💰', c: 'x' });
        continue;
      }
      const before = g.qty;
      const left = g.inst ? this.giveInst(p, g.inst) : this.giveItem(p, g.item, g.qty);
      if (left < before) {
        p.dirty.inv = true; p.dirty.stats = true;
        const got = g.inst || { id: g.item, qty: 1 };
        if (g.inst) this.msgC(p, `🐾 ${pd.name} recoge ${I.nameOf(got)}.`, I.colorOf(got));
        this.fx.push({ k: 'd', x: p.x, y: p.y, v: '🐾', c: 'x' });
      }
      if (left <= 0) this.removeGround(g); else { g.qty = left; p.nextPetPick = now + 3000; this.msgThrottle(p, 'full', 'Tu inventario está lleno.'); }
    }
  };

  const T0 = P.tickExt;
  P.tickExt = function (now) {
    T0.call(this, now);
    if (this.tickN % 6 === 0) this.petLootTick(this.now || now);
  };
}

module.exports = { install };
