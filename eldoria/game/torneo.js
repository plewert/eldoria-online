'use strict';
/**
 * Torneo PvP 1 contra 1 en eliminatoria, cada 20 minutos (en punto, :00 :20 :40).
 *  - Inscripción con /torneo durante los 3 minutos anteriores (se avisa a todos).
 *  - Mínimo 4 participantes; si no se cancela. Máximo 16.
 *  - Dentro del combate todos son iguales: 1.000 de vida, cada golpe quita 200–300, mismo ritmo y alcance por estilo,
 *    sin pociones, hechizos, gemas, mascota ni montura. Al terminar cada uno vuelve a su sitio con su estado intacto.
 *  - Ganador: 2.000.000 de oro + un Topacio (1M) y una probabilidad muy baja de un arma legendaria del arsenal.
 * El combate se juega en la plaza de la Ciudad de Alba Dorada (zona segura): solo puede dañarte tu rival.
 */
const TN = {
  PERIOD: 20 * 60000, REG_MS: 3 * 60000, MIN: 4, MAX: 16,
  HP: 1000, DMG: [200, 300], PREP_MS: 5000, FIGHT_MS: 90000,
  GOLD: 2000000, GEM: 'topacio', PRACTICE_K: 0.1,        // con menos de MIN jugadores reales (bots rellenando) el oro es el 10 % y no hay gema ni armas
  WEAPON_CHANCE: 0.00001,                       // por arma y por torneo ganado: más rara que la Gema Corrupta (0,002 %)
  SLOTS: [[395, 61, 405, 61], [395, 65, 405, 65], [395, 69, 405, 69], [395, 73, 405, 73]],     // [ax, ay, bx, by] de cada ring
  CD: { melee: 900, ranged: 1000, magic: 1000 }, RANGE: { melee: 1, ranged: 5, magic: 5 },
};
const WEAPONS = [
  ['tn_arco', 'Arco Corazón de Dragón', 'tn_bow', 'ranged', 120, 285, 1000, 'fire', '🏹', 8],
  ['tn_baculo', 'Báculo Arcano', 'tn_staff', 'magic', 120, 285, 1000, 'arcane', '🔮', 7],
  ['tn_espada', 'Hoja del Vacío', 'tn_sword', 'melee', 120, 295, 1100, 'dark', '⚔️', 1],
];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function build(ITEMS_) {
  for (const [id, name, spr, style, L, atk, cd, el, icon, range] of WEAPONS) {
    ITEMS_[id] = { name, icon, spr, type: 'weapon', style, atk, cd, range, el, tourney: 1, minLevel: L, sell: 9000000,
      desc: 'Arsenal legendario de los Eones. Solo la consigue el ganador de un torneo, con una probabilidad rarísima.' };
  }
}

function install(Game) {
  const { ITEMS, CFG } = require('./data'), world = require('./world'), I = require('./items');     // aquí (no arriba) para evitar el ciclo data ↔ torneo
  const kxy = (x, y) => y * world.W + x;
  const P = Game.prototype;
  const O = { handle: P.handle, canPvp: P.canPvp, hurtPlayer: P.hurtPlayer, weaponOf: P.weaponOf, recalc: P.recalc, removePlayer: P.removePlayer, tickExt: P.tickExt, chatExt: P.chatExt };
  const ALLOW = new Set(['move', 'target', 'style', 'chat']);
  const inFight = (p) => p && p.tn && p.tn.fight;
  const state = (g) => g.tn || (g.tn = { phase: 'idle', next: 0, ent: [], round: 0, pend: [], act: [], win: [], bye: [], lastAnn: 0, nextTick: 0, count: 0 });
  const fmtMin = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`; };

  P.canPvp = function (a, b) { return inFight(a) && a.tn.opp === b.id && inFight(b) ? true : O.canPvp.call(this, a, b); };
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    if (!inFight(p)) return O.hurtPlayer.call(this, p, raw, src, now, srcName);
    if (!src || src.kind !== 'pl' || p.tn.opp !== src.id || now < p.tn.match.fightAt) return 0;     // solo cuenta tu rival y tras la cuenta atrás
    const dmg = rnd(TN.DMG[0], TN.DMG[1]);
    p.hp -= dmg; this.fx.push({ k: 'd', x: p.x, y: p.y, v: dmg, c: 'p' });
    if (p.hp <= 0) { p.hp = 0; this.tnEnd(p.tn.match, src, p, 'ko'); }
    return dmg;
  };
  P.weaponOf = function (p) {
    const w = O.weaponOf.call(this, p);
    if (!inFight(p)) return w;
    const st = w.style === 'ranged' || w.style === 'magic' ? w.style : 'melee';
    return { name: w.name, style: st, atk: 1, cd: TN.CD[st], range: TN.RANGE[st], mana: 0 };
  };
  P.recalc = function (p) {
    O.recalc.call(this, p);
    if (inFight(p)) { p.maxHp = TN.HP; p.maxMana = 1000; if (p.hp > p.maxHp) p.hp = p.maxHp; if (p.mana > p.maxMana) p.mana = p.maxMana; }
  };
  P.handle = function (p, msg) {
    if (inFight(p) && !ALLOW.has(msg.t)) { this.msgThrottle(p, 'tn', 'En el torneo solo puedes moverte y pelear.'); return; }
    return O.handle.call(this, p, msg);
  };
  P.removePlayer = function (p) { this.tnLeave(p, true); return O.removePlayer.call(this, p); };

  /* ---------- colocar jugadores ---------- */
  P.tnPlace = function (p, x, y) {
    const spots = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [-3, 0]]
      .map(([dx, dy]) => [x + dx, y + dy]).filter(([sx, sy]) => world.isWalkable(sx, sy) && !this.mgrid.has(kxy(sx, sy)) && (!this.pgrid.has(kxy(sx, sy)) || this.pgrid.get(kxy(sx, sy)) === p));
    if (!spots.length) return false;
    this.fx.push({ k: 'tpo', x: p.x, y: p.y });
    if (this.pgrid.get(kxy(p.x, p.y)) === p) this.pgrid.delete(kxy(p.x, p.y));
    p.x = spots[0][0]; p.y = spots[0][1]; this.pgrid.set(kxy(p.x, p.y), p);
    p.tpSeq = (p.tpSeq | 0) + 1; p.target = null; p.pend = null;
    this.fx.push({ k: 'tpi', x: p.x, y: p.y });
    return true;
  };

  /** ¿Puede este jugador inscribirse o seguir en el torneo? */
  P.tnOk = function (p, now) {
    return p && (p.bot || p.ws) && p.hp > 0 && this.ents.get(p.id) === p && p.level >= CFG.PVP_MIN_LEVEL && !p.trade
      && now >= (p.pvpLock || 0) && world.zoneAt(p.x, p.y).kind !== 'dungeon';
  };

  /** Faltan jugadores: los aventureros del servidor (bots) completan el mínimo si hay al menos un jugador real inscrito. */
  P.tnFillBots = function (now) {
    const s = state(this), humans = s.ent.filter((p) => !p.bot).length;
    if (!humans || s.ent.length >= TN.MIN) return;
    const pool = (this.bots || []).filter((b) => !(b.tn && b.tn.in) && b.ai && ['hunt', 'idle', 'town'].includes(b.ai.mode) && this.tnOk(b, now));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (const b of pool.slice(0, TN.MIN - s.ent.length)) { b.tn = Object.assign(b.tn || {}, { in: true }); b.target = null; s.ent.push(b); }
  };

  /* ---------- combates ---------- */
  P.tnStartMatch = function (m, now) {
    const [ax, ay, bx, by] = TN.SLOTS[m.slot];
    [[m.a, ax, ay, m.b], [m.b, bx, by, m.a]].forEach(([p, x, y, o]) => {
      p.tn = Object.assign(p.tn || {}, { fight: true, opp: o.id, match: m, save: { x: p.x, y: p.y, hp: p.hp, mana: p.mana, pet: p.ext.pet, mount: p.ext.mount } });
      this.tradeCancel && this.tradeCancel(p, 'Comercio cancelado.');
      this.tnPlace(p, x, y); p.ext.pet = ''; p.ext.mount = '';
      this.recalc(p); p.hp = p.maxHp; p.mana = p.maxMana; p.dirty.stats = true;
      this.msgC(p, `⚔️ Ronda ${m.round}: ${p === m.a ? m.b.name : m.a.name} es tu rival. ¡Empieza en ${TN.PREP_MS / 1000} s! Todos pegan igual: 1.000 de vida, 200–300 por golpe.`, '#f0c867');
    });
    m.fightAt = now + TN.PREP_MS; m.until = m.fightAt + TN.FIGHT_MS; m.live = true;
  };
  P.tnRestore = function (p) {
    const t = p.tn; if (!t || !t.fight) return;
    t.fight = false;
    p.ext.pet = t.save.pet; p.ext.mount = t.save.mount;
    this.tnPlace(p, t.save.x, t.save.y);
    this.recalc(p); p.hp = Math.min(p.maxHp, Math.max(1, t.save.hp)); p.mana = Math.min(p.maxMana, t.save.mana); p.target = null; p.pvpLock = 0;
    p.dirty.stats = true; if (p.ws) this.sendStats && this.sendStats(p);
  };
  /** Termina un combate. loser puede ser null si ninguno quedó disponible. */
  P.tnEnd = function (m, winner, loser, why) {
    if (!m.live) return; m.live = false;
    const s = state(this);
    for (const p of [m.a, m.b]) if (p.tn) this.tnRestore(p);
    s.act = s.act.filter((x) => x !== m);
    if (loser && loser.tn) loser.tn.in = false;
    if (winner) { s.win.push(winner); this.broadcastChat(`⚔️ Torneo, ronda ${m.round}: ${winner.name} vence a ${loser ? loser.name : 'su rival'}${why === 'time' ? ' (por vida restante)' : why === 'left' ? ' (abandono)' : ''}.`, 'k'); }
    if (loser && loser.ws) this.msgC(loser, 'Has sido eliminado del torneo. ¡Gracias por participar!', '#ff8f7a');
    if (winner && winner.ws && s.phase === 'run') this.msgC(winner, '¡Has ganado! Espera a la siguiente ronda.', '#8fe08f');
  };
  /** Un jugador sale del torneo (desconexión o /torneo): pierde su combate si está luchando. */
  P.tnLeave = function (p, silent) {
    const s = this.tn; if (!s || !p.tn) return;
    s.ent = s.ent.filter((q) => q !== p); s.win = s.win.filter((q) => q !== p); s.bye = s.bye.filter((q) => q !== p);
    s.pend = s.pend.filter((m) => { if (m.a === p || m.b === p) { const o = m.a === p ? m.b : m.a; if (o.tn && o.tn.in) s.win.push(o); return false; } return true; });
    if (inFight(p)) { const m = p.tn.match, o = m.a === p ? m.b : m.a; this.tnEnd(m, o, p, 'left'); }
    p.tn.in = false;
  };

  /* ---------- rondas ---------- */
  P.tnRound = function (now) {
    const s = state(this);
    const alive = [...s.win, ...s.bye].filter((p) => p.tn && p.tn.in && this.tnOk(p, now));
    s.win = []; s.bye = [];
    if (alive.length <= 1) { this.tnFinish(alive[0] || null, now); return; }
    s.round++;
    for (let i = alive.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [alive[i], alive[j]] = [alive[j], alive[i]]; }
    if (alive.length % 2) { const b = alive.pop(); s.bye.push(b); this.msgC(b, `Ronda ${s.round}: pasas directo a la siguiente.`, '#8fe08f'); }
    for (let i = 0; i < alive.length; i += 2) s.pend.push({ a: alive[i], b: alive[i + 1], round: s.round, live: false });
    this.broadcastChat(`🏆 Torneo: ronda ${s.round} con ${alive.length + s.bye.length} jugadores.`, 'k');
  };
  P.tnFinish = function (champ, now) {
    const s = state(this);
    s.phase = 'idle'; s.next += TN.PERIOD; if (s.next <= now) s.next = Math.ceil((now + 1) / TN.PERIOD) * TN.PERIOD;
    s.ent.forEach((p) => { if (p.tn) p.tn.in = false; }); s.ent = []; s.lastAnn = 0;
    if (!champ) { this.broadcastChat('🏆 Torneo terminado sin ganador.', 'k'); return; }
    const practice = (s.humans | 0) < TN.MIN;                                   // con bots rellenando: premio reducido, sin gema ni armas
    if (champ.bot) { this.broadcastChat(`🏆 ${champ.name} (aventurero del servidor) gana el torneo.`, 'k'); return; }
    const gold = practice ? Math.round(TN.GOLD * TN.PRACTICE_K) : TN.GOLD;
    champ.gold += gold; this.msgC(champ, `🏆 ¡Ganas el torneo! +${gold.toLocaleString('es')} de oro${practice ? ` (premio reducido: faltaron jugadores reales, mínimo ${TN.MIN})` : ` y un ${ITEMS[TN.GEM].name}`}.`, '#f0c867');
    if (!practice && this.giveItem(champ, TN.GEM, 1)) this.addGround(TN.GEM, 1, champ.x, champ.y);
    const won = [];
    if (!practice) for (const w of WEAPONS) if (Math.random() < TN.WEAPON_CHANCE) { const it = I.rollGear(w[0], true); if (this.giveInst(champ, it)) this.addGround(w[0], 1, champ.x, champ.y, { inst: it }); won.push(I.nameOf(it)); }
    if (won.length) this.msgC(champ, `✨ ¡El arsenal de los Eones te elige: ${won.join(', ')}!`, '#c58bff');
    this.broadcastChat(`🏆 ${champ.name} gana el torneo${won.length ? ' y se lleva ' + won.join(', ') + ' ✨' : ''}.`, 'k');
    champ.dirty.inv = true; champ.dirty.stats = true;
  };

  /* ---------- reloj del torneo ---------- */
  P.tnBotThink = function (p, now) {                          // IA de los bots dentro del torneo: perseguir y pegar al rival
    const opp = p.tn && p.tn.fight ? this.ents.get(p.tn.opp) : null;
    p.target = opp ? opp.id : null;
  };

  P.tnTick = function (now) {
    const s = state(this);
    if (now < s.nextTick) return; s.nextTick = now + 250;
    if (!s.next) s.next = Math.ceil((now + 1) / TN.PERIOD) * TN.PERIOD;
    if (s.phase === 'idle' && now >= s.next - TN.REG_MS) {
      s.phase = 'reg'; s.ent = [];
      this.broadcastChat(`🏆 Torneo en ${fmtMin(s.next - now)}: escribe /torneo para inscribirte (mínimo ${TN.MIN} jugadores, pelean todos igual).`, 'k');
    }
    if (s.phase === 'reg') {
      for (const mark of [60000, 10000]) if (s.next - now <= mark && s.lastAnn !== mark && s.next - now > 0) { s.lastAnn = mark; this.broadcastChat(`🏆 El torneo empieza en ${fmtMin(s.next - now)}. Inscritos: ${s.ent.length}. Escribe /torneo.`, 'k'); }
      if (s.next - now <= 20000) this.tnFillBots(now);                  // en los últimos 20 s los bots completan el mínimo si hay un jugador real
      if (now >= s.next) {
        s.ent = s.ent.filter((p) => p.tn && p.tn.in && this.tnOk(p, now));
        if (s.ent.length < TN.MIN) {
          this.broadcastChat(`🏆 Torneo cancelado: faltan jugadores (${s.ent.length}/${TN.MIN}). Próximo en ${fmtMin(TN.PERIOD)}.`, 'k');
          s.ent.forEach((p) => { p.tn.in = false; }); s.ent = []; s.phase = 'idle'; s.next += TN.PERIOD; s.lastAnn = 0;
        } else {
          s.humans = s.ent.filter((p) => !p.bot).length; s.phase = 'run'; s.round = 0; s.win = s.ent.slice(); s.bye = []; s.pend = []; s.act = [];
          this.broadcastChat(`🏆 ¡Empieza el torneo con ${s.ent.length} jugadores${s.humans < TN.MIN ? ' (los aventureros del servidor completan los puestos: premio reducido)' : ''}!`, 'k');
          this.tnRound(now);
        }
      }
    }
    if (s.phase === 'run') {
      for (const m of s.act.slice()) {                                   // comprobar combates en curso
        if (!m.live) continue;
        const okA = this.tnOk(m.a, now) || (m.a.hp > 0 && m.a.ws), okB = this.tnOk(m.b, now) || (m.b.hp > 0 && m.b.ws);
        if (!okA || !okB) { this.tnEnd(m, okA ? m.a : okB ? m.b : null, okA ? m.b : m.a, 'left'); continue; }
        if (now >= m.until) { const w = m.a.hp === m.b.hp ? (Math.random() < 0.5 ? m.a : m.b) : m.a.hp > m.b.hp ? m.a : m.b; this.tnEnd(m, w, w === m.a ? m.b : m.a, 'time'); }
      }
      while (s.pend.length && s.act.length < TN.SLOTS.length) {         // lanzar combates pendientes
        const m = s.pend.shift();
        const used = new Set(s.act.map((x) => x.slot)); m.slot = TN.SLOTS.findIndex((_, i) => !used.has(i));
        const okA = this.tnOk(m.a, now), okB = this.tnOk(m.b, now);
        if (!okA || !okB) { const w = okA ? m.a : okB ? m.b : null; if (w) s.win.push(w); continue; }
        this.tnStartMatch(m, now); s.act.push(m);
      }
      if (!s.pend.length && !s.act.length) this.tnRound(now);
      if (s.phase === 'run' && now > s.next + TN.PERIOD - 5000) { for (const m of s.act.slice()) this.tnEnd(m, null, null, 'time'); this.tnFinish(null, now); }     // seguro: nunca invade el siguiente torneo
    }
  };
  P.tickExt = function (now) { this.tnTick(now); return O.tickExt.call(this, now); };

  P.chatExt = function (p, text) {
    if (text !== '/torneo') return O.chatExt.call(this, p, text);
    const s = state(this), now = this.now || Date.now();
    if (s.phase === 'reg') {
      if (p.tn && p.tn.in) { p.tn.in = false; s.ent = s.ent.filter((q) => q !== p); this.msg(p, 'Has salido de la inscripción del torneo.', 's'); return true; }
      if (!this.tnOk(p, now)) { this.msg(p, `No puedes inscribirte ahora (nivel ${CFG.PVP_MIN_LEVEL}+, vivo y sin estar en combate).`, 's'); return true; }
      if (s.ent.length >= TN.MAX) { this.msg(p, `El torneo está lleno (${TN.MAX}).`, 's'); return true; }
      p.tn = Object.assign(p.tn || {}, { in: true }); s.ent.push(p);
      this.msgC(p, `🏆 Inscrito (${s.ent.length}). Empieza en ${fmtMin(s.next - now)}. Mantente cerca y vivo; te llevaremos a la arena.`, '#f0c867'); return true;
    }
    if (s.phase === 'run') this.msg(p, `Torneo en curso (ronda ${s.round}). El siguiente empieza en ${fmtMin(s.next + TN.PERIOD - now)} aprox.; la inscripción abre 3 min antes.`, 's');
    else this.msg(p, `Próximo torneo en ${fmtMin((s.next || now + TN.PERIOD) - now)}. La inscripción abre 3 minutos antes. Ganador: ${TN.GOLD.toLocaleString('es')} de oro + Topacio.`, 's');
    return true;
  };
}
module.exports = { build, install, TN, WEAPONS };
