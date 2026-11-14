'use strict';
/**
 * Álbum de colecciones y emotes.
 *  - Álbum: se apuntan las gemas, mascotas, monturas y armas que el jugador ha tenido alguna vez (mochila, banco, equipo, mascota o montura activas).
 *    El cliente pide 'album' y pinta las que ya tiene y la silueta de las que faltan.
 *  - Emotes: 'emote' con un nombre de la lista; todos los jugadores cercanos ven el gesto (fx 'em').
 */
function install(Game) {
  const { ITEMS } = require('./data'), P = Game.prototype;
  const O = { handle: P.handle, tickExt: P.tickExt };
  const EMOTES = ['saludar', 'bailar', 'sentarse', 'reir', 'vitorear', 'reverencia', 'llorar', 'pensar'];
  const TRACK = new Set(['gem', 'pet', 'mount', 'weapon']);
  const note = (p, it) => { if (it && it.id && TRACK.has((ITEMS[it.id] || {}).type) && !p.ext.seen[it.id]) { p.ext.seen[it.id] = 1; return true; } return false; };

  P.albumScan = function (p) {
    if (!p.ext || !p.ext.seen) return;
    let n = 0;
    for (const it of p.inv) if (note(p, it)) n++;
    for (const it of p.bank || []) if (note(p, it)) n++;
    for (const it of Object.values(p.eq || {})) if (note(p, it)) n++;
    for (const id of [p.ext.pet, p.ext.mount]) if (id && note(p, { id })) n++;
    if (n) this.msg(p, `📖 Álbum: ${n} objeto${n > 1 ? 's' : ''} nuevo${n > 1 ? 's' : ''} en tu colección.`, 's');
  };
  P.tickExt = function (now) {
    O.tickExt.call(this, now);
    this.albumN = (this.albumN || 0) + 1;
    if (this.albumN % 40 === 0) for (const p of this.players.values()) if (!p.bot) this.albumScan(p);
  };
  P.handle = function (p, msg) {
    if (msg && msg.t === 'album') { this.albumScan(p); this.send(p, { t: 'album', seen: Object.keys(p.ext.seen || {}) }); return; }
    if (msg && msg.t === 'emote') {
      const e = String(msg.e || '');
      if (!EMOTES.includes(e) || p.dead || (p.tn && p.tn.fight) || this.now < (p.emoteAt || 0)) return;
      p.emoteAt = this.now + 1500;
      this.fx.push({ k: 'em', i: p.id, x: p.x, y: p.y, e });
      return;
    }
    return O.handle.call(this, p, msg);
  };
  Game.EMOTES = EMOTES;
}
module.exports = { install };
