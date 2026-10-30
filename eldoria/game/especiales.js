'use strict';
/**
 * Especiales de las armas de jefe: cada arma de jefe (nivel 76 o más) lleva 2 habilidades propias, con las teclas 4 y 5.
 * A = más barata y frecuente; B = definitiva (más maná y enfriamiento largo).
 * kind: fan (abanico frente a ti), line (rayo en línea), nova (círculo en ti o en el objetivo, con empuje/aturdir/ralentizar/cegar),
 *       rain (impactos al azar alrededor del objetivo), volley (ráfaga de disparos al objetivo), cloud (zona que daña cada segundo),
 *       bolt (un impacto + curación al grupo), heal (curación al grupo + daño en círculo).
 * Contra jefes los controles (aturdir, ralentizar, cegar, atraer) duran la mitad o no funcionan (atraer).
 */
const mk = (id, name, icon, kind, o) => Object.assign({ id, name, icon, kind, cd: 30000, mana: 60, lv: 30, mult: 3, col: '255,200,90' }, o);
const SP = {
  // ---- cuerpo a cuerpo ----
  fuego_garras: [
    mk('sp_zarpazo', 'Zarpazo infernal', '🔥', 'fan', { col: '190,80,255', mult: 3, burn: { ticks: 5, mult: 0.3 }, cd: 25000, mana: 55, desc: 'Tres cortes de fuego negro en abanico (×3) y quemadura 5 s.' }),
    mk('sp_eclipse', 'Eclipse de llamas', '🌑', 'nova', { col: '190,80,255', r: 3, mult: 3.5, burn: { ticks: 5, mult: 0.35 }, cd: 75000, mana: 110, lv: 60, desc: 'Explosión negra a tu alrededor (×3,5) con quemadura.' }),
  ],
  fuego_mandoble: [
    mk('sp_filo', 'Filo del viento', '🌪️', 'line', { col: '200,230,255', len: 8, mult: 3.2, cd: 25000, mana: 55, desc: 'Una onda de viento cruza 8 casillas en línea (×3,2).' }),
    mk('sp_ciclon', 'Ciclón de llamas', '🌀', 'nova', { col: '255,150,70', r: 3, mult: 2.6, slow: 3000, pull: 2, cd: 75000, mana: 110, lv: 60, desc: 'Atrae y ralentiza a los enemigos cercanos (×2,6).' }),
  ],
  mar_tridente: [
    mk('sp_marea', 'Marea', '🌊', 'nova', { col: '110,200,255', r: 3, mult: 2.5, slow: 4000, cd: 25000, mana: 55, desc: 'Una ola golpea a tu alrededor (×2,5) y ralentiza 4 s.' }),
    mk('sp_maremoto', 'Maremoto', '🌊', 'line', { col: '110,200,255', len: 10, mult: 3.6, slow: 4000, cd: 75000, mana: 110, lv: 60, desc: 'Un maremoto cruza 10 casillas (×3,6) y ralentiza.' }),
  ],
  rd_rk_weapon: [
    mk('sp_temblor', 'Temblor', '💢', 'nova', { col: '255,150,60', r: 3, mult: 2.8, stun: 2000, cd: 30000, mana: 60, desc: 'Golpe al suelo (×2,8) que aturde 2 s.' }),
    mk('sp_cataclismo', 'Cataclismo', '🌋', 'nova', { col: '255,150,60', r: 5, mult: 3.4, stun: 3000, cd: 80000, mana: 130, lv: 60, desc: 'Sacudida enorme (×3,4) que aturde 3 s.' }),
  ],
  rd_rm_weapon: [
    mk('sp_singular', 'Singularidad', '⚫', 'nova', { col: '190,90,255', r: 3, mult: 4, pull: 3, atTarget: 1, cd: 35000, mana: 70, desc: 'Atrae a los enemigos al objetivo y explota (×4).' }),
    mk('sp_horizonte', 'Horizonte de sucesos', '🕳️', 'nova', { col: '190,90,255', r: 6, mult: 4.5, pull: 4, cd: 90000, mana: 150, lv: 60, desc: 'Un agujero negro lo atrae todo hacia ti y estalla (×4,5).' }),
  ],
  // ---- a distancia ----
  jade_arco: [
    mk('sp_veneno_hidra', 'Aliento de la Hidra', '🐍', 'cloud', { col: '90,230,110', r: 3, secs: 6, mult: 0.9, slow: 2500, cd: 30000, mana: 60, desc: 'Nube venenosa que daña cada segundo y ralentiza.' }),
    mk('sp_tres_cabezas', 'Tres cabezas', '🐉', 'volley', { col: '90,230,110', hits: 6, span: 1500, mult: 1.6, cd: 80000, mana: 125, lv: 60, desc: 'Seis dardos venenosos al objetivo (×1,6 cada uno).' }),
  ],
  angel_arco: [
    mk('sp_flecha_luz', 'Flecha de luz', '✨', 'bolt', { col: '255,240,170', mult: 3.5, heal: 0.06, cd: 30000, mana: 60, desc: 'Flecha de luz (×3,5) que cura 6 % al grupo.' }),
    mk('sp_lluvia_celestial', 'Lluvia celestial', '🌟', 'rain', { col: '255,240,170', n: 8, r: 5, hr: 1.6, mult: 1.6, cd: 80000, mana: 130, lv: 60, desc: '8 flechas de luz caen alrededor del objetivo (×1,6).' }),
  ],
  fuego_arco: [
    mk('sp_flecha_viento', 'Flecha del viento', '🌪️', 'line', { col: '200,230,255', len: 9, mult: 3.2, cd: 30000, mana: 60, desc: 'Flecha huracanada que cruza 9 casillas (×3,2).' }),
    mk('sp_tormenta_llama', 'Tormenta de llamas', '🔥', 'rain', { col: '255,150,70', n: 7, r: 4, hr: 1.6, mult: 1.8, burn: { ticks: 4, mult: 0.3 }, cd: 80000, mana: 125, lv: 60, desc: '7 flechas ardientes caen alrededor del objetivo.' }),
  ],
  ig_arco: [
    mk('sp_meteoro', 'Flecha meteoro', '☄️', 'nova', { col: '255,120,40', r: 2, mult: 3.5, atTarget: 1, burn: { ticks: 4, mult: 0.3 }, cd: 30000, mana: 60, desc: 'Una flecha cae del cielo y explota (×3,5).' }),
    mk('sp_lluvia_fuego', 'Lluvia de fuego', '🔥', 'rain', { col: '255,120,40', n: 6, r: 4, hr: 1.6, mult: 1.8, cd: 80000, mana: 120, lv: 60, desc: '6 flechas de fuego caen alrededor del objetivo (×1,8 cada una).' }),
  ],
  an_arco: [
    mk('sp_portal', 'Portal verde', '🟢', 'volley', { col: '120,255,170', hits: 3, span: 1200, mult: 1.5, cd: 30000, mana: 60, desc: 'Tres flechas de fuego verde (×1,5 cada una).' }),
    mk('sp_cielo_portales', 'Cielo de portales', '🌌', 'rain', { col: '120,255,170', n: 8, r: 5, hr: 1.6, mult: 1.5, cd: 80000, mana: 130, lv: 60, desc: '8 flechas verdes caen de portales (×1,5 cada una).' }),
  ],
  rd_rv_weapon: [
    mk('sp_nube', 'Nube tóxica', '☣️', 'cloud', { col: '90,220,110', r: 3, secs: 8, mult: 0.5, cd: 30000, mana: 60, desc: 'Deja una nube 8 s que daña cada segundo (×0,5).' }),
    mk('sp_epidemia', 'Epidemia', '☠️', 'cloud', { col: '90,220,110', r: 5, secs: 12, mult: 0.6, slow: 1500, cd: 80000, mana: 130, lv: 60, desc: 'Gran nube 12 s (×0,6 por segundo) que ralentiza.' }),
  ],
  rd_ra_weapon: [
    mk('sp_rafaga', 'Ráfaga mecánica', '⚙️', 'volley', { col: '255,200,90', hits: 8, span: 3000, mult: 0.8, cd: 30000, mana: 60, desc: '8 virotes en 3 s (×0,8 cada uno).' }),
    mk('sp_sobrecarga', 'Sobrecarga', '⚡', 'volley', { col: '255,200,90', hits: 14, span: 4000, mult: 0.7, cd: 80000, mana: 130, lv: 60, desc: '14 virotes en 4 s (×0,7 cada uno).' }),
  ],
  // ---- magia ----
  angel_cetro: [
    mk('sp_juicio', 'Juicio alado', '👼', 'bolt', { col: '255,240,190', mult: 3.2, heal: 0.08, cd: 30000, mana: 65, desc: 'Un rayo de luz (×3,2) que cura un 8 % a tu grupo.' }),
    mk('sp_bendicion', 'Bendición', '✨', 'heal', { col: '255,240,190', r: 4, mult: 2, heal: 0.25, cd: 85000, mana: 140, lv: 60, desc: 'Luz que cura un 25 % a tu grupo y daña a los cercanos (×2).' }),
  ],
  ig_baston: [
    mk('sp_orbe', 'Orbe ardiente', '🔥', 'nova', { col: '255,120,40', r: 3, mult: 3.2, atTarget: 1, burn: { ticks: 4, mult: 0.3 }, cd: 30000, mana: 65, desc: 'El orbe explota sobre el objetivo (×3,2) y quema.' }),
    mk('sp_meteoros', 'Lluvia de meteoros', '☄️', 'rain', { col: '255,120,40', n: 5, r: 4, hr: 1.8, mult: 1.8, cd: 80000, mana: 130, lv: 60, desc: '5 meteoros caen alrededor del objetivo (×1,8 cada uno).' }),
  ],
  an_baston: [
    mk('sp_miasma', 'Miasma de tumbas', '💀', 'cloud', { col: '120,255,170', r: 3, secs: 6, mult: 0.6, cd: 30000, mana: 65, desc: 'Grietas y miasma 6 s: daño continuo (×0,6 por segundo).' }),
    mk('sp_grietas', 'Grietas del juicio', '⚖️', 'nova', { col: '120,255,170', r: 5, mult: 3.4, slow: 4000, atTarget: 1, cd: 80000, mana: 130, lv: 60, desc: 'El suelo se agrieta en 5 casillas (×3,4) y ralentiza.' }),
  ],
  rd_rx_weapon: [
    mk('sp_sol', 'Sol naciente', '🌅', 'nova', { col: '255,230,150', r: 3, mult: 3.8, blind: 3000, atTarget: 1, cd: 35000, mana: 70, desc: 'Explosión de luz (×3,8) que ciega 3 s.' }),
    mk('sp_amanecer', 'Amanecer', '☀️', 'heal', { col: '255,230,150', r: 6, mult: 3, heal: 0.15, cd: 90000, mana: 150, lv: 60, desc: 'Gran destello (×3) que cura un 15 % a tu grupo.' }),
  ],
};
// arma -> [A, B]; los datos que se envían al cliente
const WSPEC = {}; for (const [w, l] of Object.entries(SP)) WSPEC[w] = l.map((s) => Object.assign({}, s, { aoe: s.r && !s.atTarget ? s.r : s.r, kindStr: s.kind }));

function install(Game) {
  const P = Game.prototype;
  const world = require('./world');
  const { CFG } = require('./data');
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

  P.wspecial = function (p, sk, t, w, sl, now) {
    const base = this.baseDmg(p, w), dm = (m) => Math.max(1, Math.round(base * m)), col = sk.col, self = this;
    const foes = (cx, cy, r) => {                                                    // monstruos y jugadores enemigos dentro de un círculo
      const out = [];
      for (const m of self.monsters) if (!m.dead && Math.hypot(m.x - cx, m.y - cy) <= r + 0.4) out.push(m);
      for (const q of self.players.values()) if (q !== p && q.hp > 0 && Math.hypot(q.x - cx, q.y - cy) <= r + 0.4 && self.canPvp(p, q)) out.push(q);
      return out;
    };
    const cc = (m, ms, kind) => {
      if (m.kind !== 'mo' || m.dead) return; const k = m.def.boss ? 0.5 : 1, t2 = now + ms * k;
      if (kind === 'slow') m.slowUntil = Math.max(m.slowUntil || 0, t2);
      else { m.nextMove = Math.max(m.nextMove || 0, t2); m.nextAtk = Math.max(m.nextAtk || 0, t2); if (kind === 'blind') m.target = null; }
    };
    const burn = (m, b) => { if (b && m.kind === 'mo' && !m.dead) this.dots.push({ src: p.id, tid: m.id, left: b.ticks, next: this.now + 1000, dmg: dm(b.mult) }); };
    const hit = (m, mult) => this.skillHit(p, m, dm(mult), this.now);
    const pull = (cx, cy, r, steps) => {
      for (const m of foes(cx, cy, r)) {
        if (m.kind !== 'mo' || m.def.boss) continue;
        for (let s = 0; s < steps; s++) {
          const dx = Math.sign(cx - m.x), dy = Math.sign(cy - m.y); if (!dx && !dy) break;
          const tries = [[m.x + dx, m.y + dy], [m.x + dx, m.y], [m.x, m.y + dy]]; let moved = false;
          for (const [nx, ny] of tries) { if ((nx !== m.x || ny !== m.y) && self.monsterCanStep(m, nx, ny) && !(nx === cx && ny === cy && false)) { self.mgrid.delete(m.y * world.W + m.x); m.x = nx; m.y = ny; self.mgrid.set(ny * world.W + nx, m); moved = true; break; } }
          if (!moved) break;
        }
      }
    };
    const healGroup = (frac) => {
      const mates = new Set([p]); const party = this.partyOf ? this.partyOf(p) : null;
      if (party) for (const q of this.partyMembers(party)) if (q.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) <= 12) mates.add(q);
      for (const q of mates) { const h = Math.min(q.maxHp - q.hp, Math.round(q.maxHp * frac * (q.antiHeal > this.now ? 0.4 : 1))); if (h > 0) { q.hp += h; this.fx.push({ k: 'd', x: q.x, y: q.y, v: '+' + h, c: 'g' }); q.dirty.stats = true; } this.fx.push({ k: 'wsh', x: q.x, y: q.y, col }); }
    };
    const cx = sk.atTarget && t ? t.x : p.x, cy = sk.atTarget && t ? t.y : p.y;
    const tx = t ? t.x : p.x, ty = t ? t.y : p.y;
    let dx = tx - p.x, dy = ty - p.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    this.fx.push({ k: 'wsp', x: p.x, y: p.y, col, i: p.id });

    if (sk.kind === 'fan') {
      this.fx.push({ k: 'wsf', x1: p.x, y1: p.y, x: p.x + dx * 2, y: p.y + dy * 2, col });
      for (const m of foes(p.x, p.y, 2.2)) if ((m.x - p.x) * dx + (m.y - p.y) * dy > -0.2) { hit(m, sk.mult); burn(m, sk.burn); }
    } else if (sk.kind === 'line') {
      const x2 = p.x + dx * sk.len, y2 = p.y + dy * sk.len;
      this.fx.push({ k: 'wsl', x1: p.x, y1: p.y, x2, y2, col, T: 700 });
      for (const m of foes(p.x + dx * sk.len / 2, p.y + dy * sk.len / 2, sk.len / 2 + 1)) {
        const vx = x2 - p.x, vy = y2 - p.y, u = Math.max(0, Math.min(1, ((m.x - p.x) * vx + (m.y - p.y) * vy) / (vx * vx + vy * vy)));
        if (Math.hypot(m.x - (p.x + vx * u), m.y - (p.y + vy * u)) <= 1.2) { hit(m, sk.mult); if (sk.slow) cc(m, sk.slow, 'slow'); }
      }
    } else if (sk.kind === 'nova' || sk.kind === 'heal') {
      this.fx.push({ k: 'wsn', x: cx, y: cy, r: sk.r, col, pull: sk.pull ? 1 : 0, T: 800 });
      if (sk.pull) pull(cx, cy, sk.r + 2, sk.pull);
      this.later(sk.pull ? 450 : 150, () => {
        for (const m of foes(cx, cy, sk.r)) { hit(m, sk.mult); burn(m, sk.burn); if (sk.stun) cc(m, sk.stun, 'stun'); if (sk.slow) cc(m, sk.slow, 'slow'); if (sk.blind) cc(m, sk.blind, 'blind'); }
        if (sk.kind === 'heal') healGroup(sk.heal);
        this.fx.push({ k: 'wsi', x: cx, y: cy, r: sk.r, col });
      });
    } else if (sk.kind === 'bolt') {
      this.fx.push({ k: 'wsa', x1: p.x, y1: p.y, x2: tx, y2: ty, col, T: 250 });
      this.later(250, () => { if (t && !t.dead && (t.kind === 'mo' || t.hp > 0)) hit(t, sk.mult); this.fx.push({ k: 'wsi', x: tx, y: ty, r: 1.6, col }); if (sk.heal) healGroup(sk.heal); });
    } else if (sk.kind === 'volley') {
      const gap = sk.span / sk.hits;
      for (let i = 0; i < sk.hits; i++) this.later(i * gap, () => {
        if (p.hp <= 0 || !t || (t.kind === 'mo' && t.dead)) return;
        this.fx.push({ k: 'wsa', x1: p.x, y1: p.y, x2: t.x, y2: t.y, col, T: 220 });
        this.later(220, () => { if (t && !(t.kind === 'mo' && t.dead)) { hit(t, sk.mult); this.fx.push({ k: 'wsi', x: t.x, y: t.y, r: 1.2, col }); } });
      });
    } else if (sk.kind === 'rain') {
      for (let i = 0; i < sk.n; i++) {
        const a = Math.random() * 6.283, d = Math.random() * sk.r, x = Math.round(tx + Math.cos(a) * d), y = Math.round(ty + Math.sin(a) * d);
        this.later(i * 260, () => this.fx.push({ k: 'wsw', x, y, r: sk.hr, T: 700, col }));
        this.later(i * 260 + 700, () => { this.fx.push({ k: 'wsi', x, y, r: sk.hr, col }); for (const m of foes(x, y, sk.hr)) hit(m, sk.mult); });
      }
    } else if (sk.kind === 'cloud') {
      this.fx.push({ k: 'wsc', x: tx, y: ty, r: sk.r, T: sk.secs * 1000, col });
      for (let i = 1; i <= sk.secs; i++) this.later(i * 1000, () => { for (const m of foes(tx, ty, sk.r)) { hit(m, sk.mult); if (sk.slow) cc(m, sk.slow, 'slow'); } });
    }
    if (t) p.dir = Math.abs(tx - p.x) >= Math.abs(ty - p.y) ? (tx > p.x ? 1 : 3) : (ty > p.y ? 2 : 0);
  };
}
module.exports = { WSPEC, SP, install };
