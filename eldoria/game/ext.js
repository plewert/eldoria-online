'use strict';
/**
 * Sistemas añadidos sobre Game: misiones, logros y títulos, habilidades activas con efectos (buffs),
 * grupos y gremios, ranking, mercado entre jugadores, jefe de evento, recolección, fabricación,
 * mascotas, monturas y correo (para entregar cosas a quien está desconectado).
 */
const { CFG, ITEMS, MONSTERS, GEMS } = require('./data');
const I = require('./items');
const world = require('./world');
const { QUESTS, byId: QBY } = require('./quests');
const X = require('./extra');
const { zoneAt, NPCS, W, H, T } = world;

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const kxy = (x, y) => y * W + x;
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const levelFromXp = (xp) => 1 + Math.floor(Math.sqrt(xp / 50));
const skillFromXp = (xp) => 1 + Math.floor(Math.sqrt(xp / 20));
const craftLevel = (cxp) => 1 + Math.floor(Math.sqrt(cxp / 15));
const ACH_BY = Object.fromEntries(X.ACHS.map((a) => [a[0], a]));
const num = (v, max = 1e12) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const GUILD_RE = /^[A-Za-zÁÉÍÓÚÑáéíóúñ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]{2,15}$/;
const PARTY_MAX = 5;
const MARKET_MAX = 8, MARKET_FEE = 0.05, MARKET_HOURS = 72;
const EVENT_EVERY = (parseFloat(process.env.EVENT_MIN) || 35) * 60000;

const defExt = () => ({ q: {}, ach: {}, title: '', kt: 0, kills: {}, bosses: 0, pvp: 0, deaths: 0, quests: 0, crafts: 0, gather: 0, cxp: 0, events: 0, sold: 0, pet: '', mount: '', hadPet: 0, hadMount: 0, partyKills: 0, guild: '', grole: '', mail: [] });

function sanitizeExt(raw) {
  const e = defExt();
  if (!raw || typeof raw !== 'object') return e;
  for (const k of ['kt', 'bosses', 'pvp', 'deaths', 'quests', 'crafts', 'gather', 'cxp', 'events', 'sold', 'hadPet', 'hadMount', 'partyKills']) e[k] = num(raw[k]);
  if (raw.q && typeof raw.q === 'object') for (const [id, v] of Object.entries(raw.q)) if (QBY[id] && v && (v.s === 'a' || v.s === 'd')) e.q[id] = { s: v.s, n: num(v.n, 1e6), t: num(v.t, 1e15) };
  if (raw.ach && typeof raw.ach === 'object') for (const [id, t] of Object.entries(raw.ach)) if (ACH_BY[id]) e.ach[id] = num(t, 1e15) || 1;
  if (raw.kills && typeof raw.kills === 'object') for (const [m, n] of Object.entries(raw.kills)) if (MONSTERS[m]) e.kills[m] = num(n);
  e.title = typeof raw.title === 'string' ? raw.title.slice(0, 30) : '';
  e.pet = ITEMS[raw.pet] && ITEMS[raw.pet].type === 'pet' ? raw.pet : '';
  e.mount = ITEMS[raw.mount] && ITEMS[raw.mount].type === 'mount' ? raw.mount : '';
  e.guild = typeof raw.guild === 'string' && GUILD_RE.test(raw.guild) ? raw.guild : '';
  e.grole = e.guild ? (raw.grole === 'lider' ? 'lider' : 'miembro') : '';
  if (Array.isArray(raw.mail)) e.mail = raw.mail.slice(0, 50).map((m) => ({ g: num(m && m.g), it: m && m.it ? I.normalize(m.it) : null, tx: String((m && m.tx) || '').slice(0, 120) })).filter((m) => m.g || m.it || m.tx);
  return e;
}

module.exports = function install(Game) {
  const P = Game.prototype;
  const G0 = {
    gainXp: P.gainXp, hurtPlayer: P.hurtPlayer, defOf: P.defOf, weaponOf: P.weaponOf, canPvp: P.canPvp,
    killMonster: P.killMonster, killPlayer: P.killPlayer, use: P.use, removePlayer: P.removePlayer,
  };

  /* ============================ DATOS DEL JUGADOR ============================ */
  P.extLoad = function (p, d) {
    p.ext = sanitizeExt(d && d.ext);
    p.buffs = {}; p.skcd = {}; p.nextSkill = 0; p.nextGather = 0; p.partyId = 0; p.partyInv = null; p.guildInv = null; p.lastBuffTxt = '';
  };
  P.extSave = function (p) { return JSON.parse(JSON.stringify(p.ext)); };

  P.extView = function (q) {
    const o = {};
    if (q.ext.title) o.tt = q.ext.title;
    if (q.ext.guild) o.gl = q.ext.guild;
    if (q.ext.pet) o.pt = q.ext.pet;
    if (q.ext.mount) o.mt = q.ext.mount;
    return o;
  };

  P.giveOrDrop = function (p, id, qty) {
    const left = this.giveItem(p, id, qty);
    if (left > 0) {
      if (I.isGear(id)) for (let i = 0; i < left; i++) this.addGround(id, 1, p.x, p.y, { inst: I.mk(id) });
      else this.addGround(id, left, p.x, p.y);
      this.msgThrottle(p, 'full2', 'Tu inventario está lleno: parte de la recompensa cayó al suelo.');
    }
    p.dirty.inv = true;
  };
  const countItem = (p, id) => p.inv.reduce((n, it) => n + (it && it.id === id ? it.qty : 0), 0);
  const takeItems = (p, id, n) => {
    for (let i = 0; i < p.inv.length && n > 0; i++) {
      const it = p.inv[i]; if (!it || it.id !== id) continue;
      const t = Math.min(n, it.qty); it.qty -= t; n -= t; if (it.qty <= 0) p.inv[i] = null;
    }
    return n === 0;
  };

  P.onLogin = function (p) {
    const e = p.ext;
    // correo: oro y objetos que llegaron mientras estabas desconectado
    const keep = [];
    for (const m of e.mail) {
      if (m.g) { p.gold += m.g; this.msg(p, m.tx || `Recibes ${m.g} de oro.`, 's'); }
      if (m.it) {
        const left = this.giveInst(p, m.it);
        if (left > 0) { keep.push(m); continue; }
        this.msgC(p, m.tx || `Recibes ${I.nameOf(m.it)}.`, I.colorOf(m.it));
      } else if (!m.g && m.tx) this.msg(p, m.tx, 's');
    }
    if (keep.length !== e.mail.length) { e.mail = keep; p.dirty.inv = true; }
    if (keep.length) this.msg(p, 'Tienes correo pendiente: libera espacio en tu mochila y vuelve a entrar.', 's');
    this.checkAch(p, true);
    this.sendXinfo(p, true);
    this.sendBuffs(p);
    if (e.guild) this.sendGuild(p);
    if (this.event && this.event.state === 'active' && this.event.boss) this.send(p, { t: 'event', k: 'start', x: this.event.boss.x, y: this.event.boss.y, text: `¡${this.event.boss.def.name} está causando estragos! Ve a ${zoneAt(this.event.boss.x, this.event.boss.y).name}.` });
  };

  P.mail = function (key, entry) {
    const online = this.players.get(key);
    if (online) {
      if (entry.g) { online.gold += entry.g; }
      if (entry.it) this.giveOrDropInst(online, entry.it);
      if (entry.tx) this.msg(online, entry.tx, 's');
      online.dirty.inv = true;
      return;
    }
    const acc = this.store.accounts[key];
    if (!acc || !acc.data) return;
    acc.data.ext = acc.data.ext || {};
    acc.data.ext.mail = (acc.data.ext.mail || []).concat([entry]).slice(-50);
    this.store.saveData(key, acc.data);
  };
  P.giveOrDropInst = function (p, inst) {
    const left = this.giveInst(p, inst);
    if (left > 0) this.addGround(inst.id, I.isGear(inst.id) ? 1 : left, p.x, p.y, I.isGear(inst.id) ? { inst } : {});
  };

  /* ============================ LOGROS Y TÍTULOS ============================ */
  P.achValue = function (p, type) {
    const e = p.ext;
    switch (type) {
      case 'kt': return e.kt; case 'bosses': return e.bosses; case 'lv': return p.level; case 'pvp': return e.pvp; case 'quests': return e.quests;
      case 'gold': return p.gold + p.bankGold; case 'crafts': return e.crafts; case 'gather': return e.gather; case 'deaths': return e.deaths; case 'events': return e.events;
      case 'pet': return e.hadPet; case 'mount': return e.hadMount; case 'sold': return e.sold; case 'guild': return e.guild ? 1 : 0; case 'party': return e.partyKills;
      default: if (type.startsWith('mon:')) return e.kills[type.slice(4)] || 0; return 0;
    }
  };
  P.checkAch = function (p, quiet) {
    let any = false;
    for (const [id, name, desc, type, thr, gold, title] of X.ACHS) {
      if (p.ext.ach[id] || this.achValue(p, type) < thr) continue;
      p.ext.ach[id] = Date.now(); any = true;
      if (gold) p.gold += gold;
      if (!quiet) {
        this.msgC(p, `🏆 Logro: ${name}${gold ? ` (+${gold} de oro)` : ''}${title ? ` — título «${title}»` : ''}`, '#ffd96a');
        this.send(p, { t: 'ach', id, name, title });
      }
      p.dirty.inv = true;
    }
    if (any) this.sendXinfo(p, false);
  };
  P.sendXinfo = function (p, defs) {
    const e = p.ext;
    const m = { t: 'xinfo', ach: e.ach, title: e.title, st: { kt: e.kt, bosses: e.bosses, pvp: e.pvp, deaths: e.deaths, quests: e.quests, crafts: e.crafts, gather: e.gather, events: e.events, sold: e.sold, party: e.partyKills, pet: e.hadPet ? 1 : 0, mount: e.hadMount ? 1 : 0, guild: e.guild ? 1 : 0, clv: craftLevel(e.cxp), cxp: e.cxp }, guild: e.guild };
    if (defs) { m.defs = X.ACHS; m.skills = X.SKILLS; m.recipes = X.RECIPES; m.nodes = X.NODES; m.quests = QUESTS.map((q) => ({ id: q.id, npc: q.npc, lv: q.lv, title: q.title, desc: q.desc, type: q.type, mon: q.mon, item: q.item, n: q.n, reward: q.reward, after: q.after, repeat: q.repeat })); }
    this.send(p, m);
  };
  P.setTitle = function (p, id) {
    if (!id) p.ext.title = '';
    else { const a = ACH_BY[id]; if (!a || !p.ext.ach[id] || !a[6]) return; p.ext.title = a[6]; }
    this.sendXinfo(p, false);
  };

  /* ============================ MISIONES ============================ */
  const qState = (p, q, now) => {
    const e = p.ext.q[q.id];
    if (e && e.s === 'a') {
      const have = q.type === 'collect' ? countItem(p, q.item) : e.n;
      return have >= q.n ? 'ready' : 'active';
    }
    if (e && e.s === 'd') { if (!q.repeat || now - e.t < q.repeat * 3600000) return 'done'; }
    if (p.level < q.lv) return 'locked';
    if (q.after && !(p.ext.q[q.after] && p.ext.q[q.after].s === 'd')) return 'locked';
    return 'new';
  };
  P.questList = function (p, npcId) {
    const now = Date.now();
    return QUESTS.filter((q) => !npcId || q.npc === npcId).map((q) => {
      const e = p.ext.q[q.id], st = qState(p, q, now);
      return { id: q.id, st, n: q.type === 'collect' ? Math.min(q.n, countItem(p, q.item)) : (e && e.s === 'a' ? e.n : 0) };
    });
  };
  P.sendQuests = function (p, npcId) { this.send(p, { t: 'quests', npc: npcId || '', list: this.questList(p, npcId) }); };
  P.nearNpc = (p, id) => { const n = NPCS.find((q) => q.id === id); return n && cheb(p.x, p.y, n.x, n.y) <= 5; };
  P.questAccept = function (p, id) {
    const q = QBY[String(id)]; if (!q || !this.nearNpc(p, q.npc)) return;
    if (qState(p, q, Date.now()) !== 'new') return;
    if (Object.values(p.ext.q).filter((e) => e.s === 'a').length >= 10) { this.msg(p, 'Ya tienes 10 misiones activas.', 's'); return; }
    p.ext.q[q.id] = { s: 'a', n: 0, t: Date.now() };
    this.msg(p, `Misión aceptada: ${q.title}.`, 's');
    this.sendQuests(p, q.npc);
  };
  P.questTurn = function (p, id) {
    const q = QBY[String(id)]; if (!q || !this.nearNpc(p, q.npc)) return;
    if (qState(p, q, Date.now()) !== 'ready') return;
    if (q.type === 'collect' && !takeItems(p, q.item, q.n)) return;
    const r = q.reward;
    p.ext.q[q.id] = { s: 'd', n: 0, t: Date.now() };
    p.ext.quests++;
    if (r.g) p.gold += r.g;
    for (const [iid, qty] of r.items || []) this.giveOrDrop(p, iid, qty);
    if (r.xp) this.gainXp(p, r.xp);
    this.send(p, { t: 'quest_done', id: q.id, title: q.title });
    this.msgC(p, `✅ Misión cumplida: ${q.title}. +${r.g} de oro, +${r.xp} xp${(r.items || []).length ? ', ' + r.items.map(([i, n]) => (n > 1 ? n + '× ' : '') + ITEMS[i].name).join(', ') : ''}.`, '#7fe08a');
    p.dirty.inv = true; p.dirty.stats = true;
    this.checkAch(p);
    this.sendQuests(p, q.npc);
  };
  P.questAbandon = function (p, id) {
    const e = p.ext.q[String(id)]; if (!e || e.s !== 'a') return;
    delete p.ext.q[String(id)];
    this.sendQuests(p, '');
  };
  P.questKill = function (p, type) {
    for (const q of QUESTS) {
      const e = p.ext.q[q.id];
      if (!e || e.s !== 'a' || e.n >= q.n) continue;
      if (q.type === 'kill' && q.mon === type) e.n++;
      else if (q.type === 'killany') e.n++;
      else continue;
      this.send(p, { t: 'qprog', id: q.id, n: e.n, need: q.n, title: q.title });
      if (e.n >= q.n) this.msgC(p, `📜 Misión lista para entregar: ${q.title}.`, '#ffd96a');
    }
  };

  /* ============================ BUFFS Y HABILIDADES ============================ */
  P.buffMult = function (p, k) { const b = p.buffs[k]; return b && b.until > this.now ? b.m : 1; };
  P.addBuff = function (p, k, m, secs, extra) { p.buffs[k] = Object.assign({ m, until: this.now + secs * 1000 }, extra || {}); this.sendBuffs(p); };
  P.sendBuffs = function (p) {
    const now = this.now, b = {};
    for (const [k, v] of Object.entries(p.buffs)) if (v.until > now && (k !== 'shield' || v.hp > 0)) b[k] = { s: Math.ceil((v.until - now) / 1000), m: v.m, hp: v.hp };
    const txt = JSON.stringify(b);
    p.lastBuffTxt = txt;
    this.send(p, { t: 'buffs', b });
  };
  P.weaponOf = function (p) {
    const w = G0.weaponOf.call(this, p), m = this.buffMult(p, 'atk');
    return m !== 1 ? Object.assign({}, w, { atk: Math.round(w.atk * m) }) : w;
  };
  P.defOf = function (p) { return Math.round(G0.defOf.call(this, p) * this.buffMult(p, 'def')); };
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    const sh = p.buffs && p.buffs.shield;
    if (sh && sh.until > now && sh.hp > 0) {
      const a = Math.min(sh.hp, raw); sh.hp -= a; raw -= a;
      this.fx.push({ k: 'd', x: p.x, y: p.y, v: 'absorbe ' + a, c: 'm' });
      if (sh.hp <= 0) this.sendBuffs(p);
      if (raw <= 0) return 0;
    }
    return G0.hurtPlayer.call(this, p, raw, src, now, srcName);
  };
  P.gainXp = function (p, xp) {
    const m = this.buffMult(p, 'xp');
    G0.gainXp.call(this, p, m !== 1 ? Math.round(xp * m) : xp);
    this.checkAch(p);
  };
  P.sameGroup = function (a, b) {
    return (a.partyId && a.partyId === b.partyId) || (a.ext.guild && a.ext.guild === b.ext.guild);
  };
  P.canPvp = function (a, b) { return G0.canPvp.call(this, a, b) && !this.sameGroup(a, b); };

  /** Daño base de un golpe del jugador (igual que el ataque normal). */
  P.baseDmg = function (p, w) {
    const skill = skillFromXp(p.sxp[w.style]);
    return Math.max(1, Math.round(w.atk * (0.55 + Math.random() * 0.45) * (1 + 0.05 * (skill - 1)) * (1 + 0.015 * (p.level - 1))));
  };
  /** Aplica daño de una habilidad a un objetivo (monstruo o jugador). */
  P.skillHit = function (p, t, dmg, now) {
    if (t.kind === 'pl') {
      if (!this.canPvp(p, t)) return false;
      dmg = Math.max(1, Math.round(dmg * CFG.PVP_DMG_MULT));
      p.pvpLock = now + CFG.PVP_LOCK_MS; t.pvpLock = now + CFG.PVP_LOCK_MS;
      this.hurtPlayer(t, dmg, p, now, p.name);
    } else if (t.kind === 'mo' && !t.dead) this.hurtMonster(t, dmg, p, now);
    else return false;
    return true;
  };
  P.useSkill = function (p, idx) {
    const now = this.now;
    if (now < p.nextSkill) return;
    const w = this.weaponOf(p), style = w.style, list = X.SKILLS[style], sk = list && list[idx | 0];
    if (!sk) return;
    const sl = skillFromXp(p.sxp[style]);
    if (sl < sk.lv) { this.msgThrottle(p, 'sklv', `${sk.name}: requiere habilidad ${sk.lv} de ${style === 'melee' ? 'combate cuerpo a cuerpo' : style === 'ranged' ? 'distancia' : 'magia'}.`); return; }
    if (now < (p.skcd[sk.id] || 0)) return;
    if (p.mana < sk.mana) { this.msgThrottle(p, 'mana', 'No tienes suficiente maná.'); return; }
    const range = w.range || 1;
    let t = p.target ? this.ents.get(p.target) : null;
    if (t && ((t.kind === 'mo' && t.dead) || (t.kind === 'pl' && !this.canPvp(p, t)))) t = null;
    const offensive = !sk.buff && !sk.shield;
    if (offensive) {
      if (sk.aoe && !sk.atTarget) {            // alrededor de uno mismo: no necesita objetivo
        if (!this.monsters.some((m) => !m.dead && cheb(m.x, m.y, p.x, p.y) <= sk.aoe + 0)) { this.msgThrottle(p, 'noenemy', 'No hay enemigos cerca.'); return; }
      } else {
        if (!t) { this.msgThrottle(p, 'notarget', 'Elige un objetivo primero (clic en un monstruo).'); return; }
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d > (range === 1 ? 1.5 : range + 0.2)) { this.msgThrottle(p, 'far', 'El objetivo está demasiado lejos.'); return; }
      }
    }
    p.mana -= sk.mana; p.skcd[sk.id] = now + sk.cd; p.nextSkill = now + 700;
    this.send(p, { t: 'skcd', id: sk.id, ms: sk.cd });
    p.dirty.stats = true;
    this.addSkillXp(p, style, 4);
    if (sk.buff) {
      for (const [k, m] of Object.entries(sk.buff)) this.addBuff(p, k, m, sk.secs);
      this.fx.push({ k: 'sk', id: sk.id, x: p.x, y: p.y, i: p.id });
      return;
    }
    if (sk.shield) {
      const hp = Math.round(50 + p.level * 6 + sl * 5);
      p.buffs.shield = { m: 1, hp, until: now + sk.secs * 1000 }; this.sendBuffs(p);
      this.fx.push({ k: 'sk', id: sk.id, x: p.x, y: p.y, i: p.id });
      return;
    }
    const base = this.baseDmg(p, w);
    const mkdmg = (mult, crit) => { let d = Math.round(base * mult); if (crit) d = Math.round(d * 1.8); return Math.max(1, d); };
    const hitAll = (cx, cy, r, mult) => {
      let n = 0;
      for (const m of this.monsters) if (!m.dead && cheb(m.x, m.y, cx, cy) <= r) { if (this.skillHit(p, m, mkdmg(mult, 0), now)) n++; }
      for (const q of this.players.values()) if (q !== p && q.hp > 0 && cheb(q.x, q.y, cx, cy) <= r && this.canPvp(p, q)) { if (this.skillHit(p, q, mkdmg(mult, 0), now)) n++; }
      return n;
    };
    if (t) p.dir = Math.abs(t.x - p.x) >= Math.abs(t.y - p.y) ? (t.x > p.x ? 1 : 3) : (t.y > p.y ? 2 : 0);
    if (sk.aoe) {
      const cx = sk.atTarget && t ? t.x : p.x, cy = sk.atTarget && t ? t.y : p.y;
      this.fx.push({ k: 'sk', id: sk.id, x: cx, y: cy, x1: p.x, y1: p.y, r: sk.aoe, el: sk.el || null, s: style });
      hitAll(cx, cy, sk.aoe, sk.mult);
    } else {
      this.fx.push({ k: 'sk', id: sk.id, x: t.x, y: t.y, x1: p.x, y1: p.y, el: sk.el || null, s: style });
      this.skillHit(p, t, mkdmg(sk.mult, sk.crit), now);
      if (sk.crit) this.fx.push({ k: 'd', x: p.x, y: p.y, v: '¡CRÍTICO!', c: 'x' });
      if (sk.slow && t.kind === 'mo') t.slowUntil = now + sk.slow;
      if (sk.dot && !t.dead) this.dots.push({ src: p.id, tid: t.id, left: sk.dot.ticks, next: now + 1000, dmg: mkdmg(sk.dot.mult, 0) });
    }
  };

  /* ============================ PARTY (GRUPO) ============================ */
  P.partyOf = function (p) { return p.partyId ? this.parties.get(p.partyId) : null; };
  P.partyMembers = function (party) { return party.members.map((k) => this.players.get(k)).filter(Boolean); };
  P.partyInvite = function (p, id) {
    const t = this.ents.get(id | 0);
    if (!t || t.kind !== 'pl' || t === p || !t.ws) return;
    if (t.partyId) { this.msg(p, `${t.name} ya está en un grupo.`, 's'); return; }
    const mine = this.partyOf(p);
    if (mine && mine.leader !== p.key) { this.msg(p, 'Solo el líder puede invitar.', 's'); return; }
    if (mine && mine.members.length >= PARTY_MAX) { this.msg(p, `El grupo está lleno (${PARTY_MAX}).`, 's'); return; }
    t.partyInv = { from: p.id, exp: Date.now() + 40000 };
    this.send(t, { t: 'invite', k: 'party', from: p.name, id: p.id });
    this.msg(p, `Invitaste a ${t.name} a tu grupo.`, 's');
  };
  P.partyAccept = function (p, id) {
    const inv = p.partyInv; if (!inv || inv.from !== (id | 0) || Date.now() > inv.exp || p.partyId) return;
    p.partyInv = null;
    const l = this.ents.get(inv.from); if (!l || l.kind !== 'pl') return;
    let party = this.partyOf(l);
    if (!party) { party = { id: this.nextPartyId++, leader: l.key, members: [l.key] }; this.parties.set(party.id, party); l.partyId = party.id; }
    if (party.members.length >= PARTY_MAX) { this.msg(p, 'El grupo está lleno.', 's'); return; }
    party.members.push(p.key); p.partyId = party.id;
    this.partyChatSys(party, `${p.name} se unió al grupo.`);
    this.sendParty(party);
  };
  P.partyLeave = function (p, silent) {
    const party = this.partyOf(p); if (!party) return;
    party.members = party.members.filter((k) => k !== p.key); p.partyId = 0;
    this.send(p, { t: 'party', m: [] });
    if (!silent) this.msg(p, 'Saliste del grupo.', 's');
    if (party.members.length < 2) {
      for (const q of this.partyMembers(party)) { q.partyId = 0; this.send(q, { t: 'party', m: [] }); this.msg(q, 'El grupo se disolvió.', 's'); }
      this.parties.delete(party.id); return;
    }
    if (party.leader === p.key) party.leader = party.members[0];
    this.partyChatSys(party, `${p.name} dejó el grupo.`);
    this.sendParty(party);
  };
  P.partyKick = function (p, name) {
    const party = this.partyOf(p); if (!party || party.leader !== p.key) return;
    const t = this.partyMembers(party).find((q) => q.name.toLowerCase() === String(name).toLowerCase());
    if (t && t !== p) { this.msg(t, 'Te expulsaron del grupo.', 's'); this.partyLeave(t, true); }
  };
  P.partyChatSys = function (party, text) { for (const q of this.partyMembers(party)) this.msg(q, text, 's'); };
  P.sendParty = function (party) {
    const m = this.partyMembers(party).map((q) => ({ i: q.id, n: q.name, l: q.level, h: q.hp, H: q.maxHp, ld: q.key === party.leader ? 1 : 0 }));
    for (const q of this.partyMembers(party)) this.send(q, { t: 'party', m });
  };

  /* ============================ GREMIOS ============================ */
  P.guildMembers = function (name) {
    const out = [], low = name.toLowerCase();
    for (const [k, acc] of Object.entries(this.store.accounts)) {
      if (k.startsWith('__')) continue;
      const on = this.players.get(k);
      const e = on ? on.ext : acc.data && acc.data.ext;
      if (!e || !e.guild || e.guild.toLowerCase() !== low) continue;
      out.push({ n: acc.name, l: on ? on.level : levelFromXp((acc.data && acc.data.xp) || 0), r: e.grole === 'lider' ? 'lider' : 'miembro', on: on && on.ws ? 1 : 0 });
    }
    return out.sort((a, b) => (b.r === 'lider') - (a.r === 'lider') || b.l - a.l);
  };
  P.sendGuild = function (p) {
    if (!p.ext.guild) { this.send(p, { t: 'guild', name: '', members: [] }); return; }
    this.send(p, { t: 'guild', name: p.ext.guild, role: p.ext.grole, members: this.guildMembers(p.ext.guild) });
  };
  P.guildBroadcast = function (name, fn) { for (const q of this.players.values()) if (q.ext.guild === name) fn(q); };
  P.guildCreate = function (p, name) {
    name = String(name || '').trim().replace(/\s+/g, ' ');
    if (p.ext.guild) { this.msg(p, 'Ya perteneces a un gremio.', 's'); return; }
    if (!GUILD_RE.test(name)) { this.msg(p, 'Nombre de gremio inválido: 3 a 16 letras, números y espacios.', 's'); return; }
    if (zoneAt(p.x, p.y).kind !== 'town') { this.msg(p, 'Solo puedes fundar un gremio en una ciudad.', 's'); return; }
    if (this.guildMembers(name).length) { this.msg(p, 'Ya existe un gremio con ese nombre.', 's'); return; }
    if (p.gold < 1000) { this.msg(p, 'Fundar un gremio cuesta 1.000 de oro.', 's'); return; }
    p.gold -= 1000; p.ext.guild = name; p.ext.grole = 'lider'; p.dirty.inv = true;
    this.broadcastChat(`🏰 ${p.name} fundó el gremio «${name}».`, 's');
    this.sendGuild(p); this.checkAch(p);
  };
  P.guildInvite = function (p, id) {
    if (!p.ext.guild || p.ext.grole !== 'lider') { this.msg(p, 'Solo el líder del gremio puede invitar.', 's'); return; }
    const t = this.ents.get(id | 0);
    if (!t || t.kind !== 'pl' || t === p || !t.ws) return;
    if (t.ext.guild) { this.msg(p, `${t.name} ya tiene gremio.`, 's'); return; }
    if (this.guildMembers(p.ext.guild).length >= 30) { this.msg(p, 'El gremio está lleno (30).', 's'); return; }
    t.guildInv = { from: p.id, name: p.ext.guild, exp: Date.now() + 40000 };
    this.send(t, { t: 'invite', k: 'guild', from: p.name, id: p.id, name: p.ext.guild });
    this.msg(p, `Invitaste a ${t.name} al gremio.`, 's');
  };
  P.guildAccept = function (p, id) {
    const inv = p.guildInv; if (!inv || inv.from !== (id | 0) || Date.now() > inv.exp || p.ext.guild) return;
    p.guildInv = null; p.ext.guild = inv.name; p.ext.grole = 'miembro';
    this.guildBroadcast(inv.name, (q) => { this.msg(q, `${p.name} se unió al gremio.`, 's'); this.sendGuild(q); });
    this.checkAch(p);
  };
  P.guildLeave = function (p) {
    const g = p.ext.guild; if (!g) return;
    const wasLeader = p.ext.grole === 'lider';
    p.ext.guild = ''; p.ext.grole = '';
    this.sendGuild(p); this.msg(p, 'Dejaste el gremio.', 's');
    const rest = this.guildMembers(g);
    if (wasLeader && rest.length) this.setGuildRole(rest[0].n, g, 'lider');
    this.guildBroadcast(g, (q) => { this.msg(q, `${p.name} dejó el gremio.`, 's'); this.sendGuild(q); });
  };
  P.setGuildRole = function (name, g, role) {
    const key = String(name).toLowerCase(), on = this.players.get(key);
    const e = on ? on.ext : this.store.accounts[key] && this.store.accounts[key].data && this.store.accounts[key].data.ext;
    if (e) { e.grole = role; if (!on) this.store.saveData(key, this.store.accounts[key].data); }
  };
  P.guildKick = function (p, name) {
    if (p.ext.grole !== 'lider') return;
    const key = String(name).toLowerCase(); if (key === p.key) return;
    const on = this.players.get(key);
    const e = on ? on.ext : this.store.accounts[key] && this.store.accounts[key].data && this.store.accounts[key].data.ext;
    if (!e || e.guild !== p.ext.guild) return;
    e.guild = ''; e.grole = '';
    if (on) { this.msg(on, 'Te expulsaron del gremio.', 's'); this.sendGuild(on); } else this.store.saveData(key, this.store.accounts[key].data);
    this.guildBroadcast(p.ext.guild, (q) => this.sendGuild(q));
  };

  /* ============================ CHAT: grupo, gremio, comandos ============================ */
  P.chatExt = function (p, text) {
    if (/^\/codigo(\s|$)/i.test(text)) {            // genera un código nuevo para recuperar la contraseña
      const acc = this.store.accounts[p.key], pw = text.slice(7).trim();
      if (!pw) this.msg(p, 'Escribe /codigo tuClave para crear un código de recuperación nuevo.', 's');
      else if (!acc || !this.store.verify(acc, pw)) this.msg(p, 'Clave incorrecta.', 's');
      else { const rc = this.store.setRecovery(acc); this.send(p, { t: 'xauth', ok: 'created', rc }); }
      return true;
    }
    if (text.startsWith('/p ')) {
      const party = this.partyOf(p); if (!party) { this.msg(p, 'No estás en un grupo.', 's'); return true; }
      for (const q of this.partyMembers(party)) this.send(q, { t: 'chat', n: p.name, m: text.slice(3), k: 'pt' });
      return true;
    }
    if (text.startsWith('/gc ')) {
      if (!p.ext.guild) { this.msg(p, 'No tienes gremio.', 's'); return true; }
      this.guildBroadcast(p.ext.guild, (q) => this.send(q, { t: 'chat', n: p.name, m: text.slice(4), k: 'gc' }));
      return true;
    }
    const m = /^\/(\w+)\s*(.*)$/.exec(text); if (!m) return false;
    const cmd = m[1].toLowerCase(), arg = m[2].trim();
    const find = (n) => [...this.players.values()].find((q) => q.name.toLowerCase() === n.toLowerCase() && q.ws);
    if (cmd === 'grupo') {
      const [sub, ...rest] = arg.split(/\s+/);
      if (sub === 'invitar') { const t = find(rest.join(' ')); if (t) this.partyInvite(p, t.id); else this.msg(p, 'Jugador no encontrado.', 's'); }
      else if (sub === 'aceptar') this.partyAccept(p, p.partyInv ? p.partyInv.from : 0);
      else if (sub === 'salir') this.partyLeave(p);
      else this.msg(p, 'Uso: /grupo invitar nombre · /grupo aceptar · /grupo salir · /p mensaje', 's');
      return true;
    }
    if (cmd === 'gremio') {
      const [sub, ...rest] = arg.split(/\s+/);
      if (sub === 'crear') this.guildCreate(p, rest.join(' '));
      else if (sub === 'invitar') { const t = find(rest.join(' ')); if (t) this.guildInvite(p, t.id); else this.msg(p, 'Jugador no encontrado.', 's'); }
      else if (sub === 'aceptar') this.guildAccept(p, p.guildInv ? p.guildInv.from : 0);
      else if (sub === 'salir') this.guildLeave(p);
      else if (sub === 'expulsar') this.guildKick(p, rest.join(' '));
      else this.msg(p, 'Uso: /gremio crear Nombre · invitar nombre · aceptar · salir · expulsar nombre · /gc mensaje', 's');
      return true;
    }
    if (cmd === 'clave') {
      const [a, b] = arg.split(/\s+/);
      if (!a || !b) { this.msg(p, 'Uso: /clave contraseña_actual contraseña_nueva', 's'); return true; }
      const acc = this.store.accounts[p.key];
      if (!acc || !this.store.verify(acc, a)) { this.msg(p, 'La contraseña actual no es correcta.', 's'); return true; }
      if (b.length < 4 || b.length > 64) { this.msg(p, 'La contraseña nueva debe tener 4 a 64 caracteres.', 's'); return true; }
      this.store.setPassword(acc, b); this.msg(p, 'Contraseña cambiada.', 's'); return true;
    }
    return false;
  };

  /* ============================ RANKING ============================ */
  P.rankings = function () {
    const now = Date.now();
    if (this.rankCache && now - this.rankCache.t < 20000) return this.rankCache.v;
    const rows = [];
    for (const [k, acc] of Object.entries(this.store.accounts)) {
      const on = this.players.get(k);
      if (k.startsWith('__') || (!acc.data && !on)) continue;
      const e = on ? on.ext : acc.data.ext || {};
      rows.push({ n: acc.name, xp: on ? on.xp : acc.data.xp | 0, kt: e.kt | 0, pvp: e.pvp | 0, bosses: e.bosses | 0, g: e.guild || '' });
    }
    const top = (key, fn) => rows.slice().sort((a, b) => b[key] - a[key]).filter((r) => r[key] > 0).slice(0, 10).map((r) => [r.n, fn ? fn(r) : r[key], r.g]);
    const v = { lvl: top('xp', (r) => levelFromXp(r.xp)), kills: top('kt'), pvp: top('pvp'), boss: top('bosses') };
    this.rankCache = { t: now, v };
    return v;
  };

  /* ============================ MERCADO ============================ */
  P.market = function () {
    let acc = this.store.accounts.__market;
    if (!acc) acc = this.store.accounts.__market = { key: '__market', name: '__market', salt: '', hash: '', color: '', created: Date.now(), data: { list: [], nid: 1 } };
    if (!acc.data || !Array.isArray(acc.data.list)) acc.data = { list: [], nid: 1 };
    return acc.data;
  };
  P.saveMarket = function () { this.store.saveData('__market', this.market()); };
  P.inTown = (p) => zoneAt(p.x, p.y).kind === 'town';
  P.marketSend = function (p, filter) {
    const m = this.market(), now = Date.now(), f = filter || {};
    const q = String(f.q || '').toLowerCase().slice(0, 30);
    const kinds = { weapon: ['weapon'], armor: ['head', 'body', 'shield', 'belt', 'gloves'], jewel: ['ring', 'amulet'], other: null };
    let list = m.list.filter((l) => {
      const d = ITEMS[l.it.id]; if (!d) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (f.k && kinds[f.k] !== undefined) { const ks = kinds[f.k]; const isOther = !I.isGear(l.it.id); if (f.k === 'other' ? !isOther : !ks.includes(d.type)) return false; }
      return true;
    });
    list = list.sort((a, b) => b.t - a.t).slice(0, 80);
    const mine = m.list.filter((l) => l.sk === p.key).map((l) => l.id);
    this.send(p, { t: 'market', list: list.map((l) => ({ id: l.id, sn: l.sn, price: l.price, it: I.pack(l.it), h: Math.max(1, Math.ceil((l.t + MARKET_HOURS * 3600000 - now) / 3600000)) })), mine, fee: MARKET_FEE });
  };
  P.marketSell = function (p, slot, price) {
    if (!this.inTown(p)) { this.msg(p, 'El mercado solo funciona en las ciudades.', 's'); return; }
    const it = p.inv[slot | 0]; price = num(price, 99999999);
    if (!it || price < 1) return;
    const m = this.market();
    if (m.list.filter((l) => l.sk === p.key).length >= MARKET_MAX) { this.msg(p, `Máximo ${MARKET_MAX} ofertas a la vez.`, 's'); return; }
    p.inv[slot | 0] = null; p.dirty.inv = true;
    m.list.push({ id: m.nid++, sk: p.key, sn: p.name, it: I.clone(it), price, t: Date.now() });
    this.saveMarket();
    this.msgC(p, `Pusiste en venta ${I.nameOf(it)} por ${price} de oro.`, I.colorOf(it));
    this.marketSend(p);
  };
  P.marketBuy = function (p, id) {
    if (!this.inTown(p)) { this.msg(p, 'El mercado solo funciona en las ciudades.', 's'); return; }
    const m = this.market(), i = m.list.findIndex((l) => l.id === (id | 0)); if (i < 0) { this.marketSend(p); return; }
    const l = m.list[i];
    if (l.sk === p.key) { this.msg(p, 'No puedes comprar tu propio objeto (cancélalo).', 's'); return; }
    if (p.gold < l.price) { this.msg(p, 'No tienes suficiente oro.', 's'); return; }
    const test = p.inv.map(I.clone); if (I.putInto(test, I.clone(l.it)) > 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
    m.list.splice(i, 1); this.saveMarket();
    p.gold -= l.price; this.giveInst(p, I.clone(l.it)); p.dirty.inv = true;
    this.msgC(p, `Compraste ${I.nameOf(l.it)} por ${l.price} de oro.`, I.colorOf(l.it));
    const net = Math.floor(l.price * (1 - MARKET_FEE));
    this.mail(l.sk, { g: net, it: null, tx: `💰 Vendiste ${I.nameOf(l.it)} en el mercado: +${net} de oro (comisión ${Math.round(MARKET_FEE * 100)}%).` });
    const seller = this.players.get(l.sk); if (seller) { seller.ext.sold++; this.checkAch(seller); } else { const a = this.store.accounts[l.sk]; if (a && a.data && a.data.ext) a.data.ext.sold = (a.data.ext.sold | 0) + 1; }
    this.marketSend(p);
  };
  P.marketCancel = function (p, id) {
    const m = this.market(), i = m.list.findIndex((l) => l.id === (id | 0) && l.sk === p.key); if (i < 0) return;
    const l = m.list[i];
    const test = p.inv.map(I.clone); if (I.putInto(test, I.clone(l.it)) > 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
    m.list.splice(i, 1); this.saveMarket(); this.giveInst(p, I.clone(l.it)); p.dirty.inv = true;
    this.marketSend(p);
  };
  P.marketExpire = function () {
    const m = this.market(), now = Date.now(), keep = [];
    for (const l of m.list) {
      if (now - l.t > MARKET_HOURS * 3600000) this.mail(l.sk, { g: 0, it: l.it, tx: `Tu oferta de ${I.nameOf(l.it)} expiró: te devolvemos el objeto.` });
      else keep.push(l);
    }
    if (keep.length !== m.list.length) { m.list = keep; this.saveMarket(); }
  };

  /* ============================ MASCOTAS, MONTURAS, ELIXIRES ============================ */
  P.mountMult = function (p) { const d = p.ext.mount && ITEMS[p.ext.mount]; return d ? d.speed : 1; };
  P.use = function (p, slot) {
    const it = p.inv[slot | 0]; const d = it && ITEMS[it.id];
    if (d && d.type === 'pet') {
      p.ext.pet = p.ext.pet === it.id ? '' : it.id; if (p.ext.pet) p.ext.hadPet = 1;
      this.msg(p, p.ext.pet ? `${d.name} te acompañará.` : `${d.name} descansa.`, 's'); this.checkAch(p); return;
    }
    if (d && d.type === 'mount') {
      if ((d.minLevel || 1) > p.level) { this.msg(p, `Necesitas nivel ${d.minLevel} para montar ${d.name}.`, 's'); return; }
      p.ext.mount = p.ext.mount === it.id ? '' : it.id; if (p.ext.mount) p.ext.hadMount = 1;
      this.msg(p, p.ext.mount ? `Montas ${d.name}.` : 'Desmontas.', 's'); this.checkAch(p); return;
    }
    if (d && d.buff) {
      if ((d.minLevel || 1) > p.level) { this.msg(p, `Necesitas nivel ${d.minLevel} para usar ${d.name}.`, 's'); return; }
      if (this.now < p.nextPotion) return;
      for (const [k, m] of Object.entries(d.buff)) this.addBuff(p, k, m, d.secs);
      this.msg(p, `${d.name}: ${d.desc}`, 's');
      p.nextPotion = this.now + 1000; it.qty--; if (it.qty <= 0) p.inv[slot | 0] = null; p.dirty.inv = true; return;
    }
    return G0.use.call(this, p, slot);
  };
  // si el objeto ya no está en la mochila, la mascota/montura deja de ser válida solo al soltarlo/venderlo: se comprueba aquí
  P.petCheck = function (p) {
    const has = (id) => p.inv.some((i) => i && i.id === id) || (p.bank || []).some((i) => i && i.id === id);
    if (p.ext.pet && !has(p.ext.pet)) p.ext.pet = '';
    if (p.ext.mount && !has(p.ext.mount)) p.ext.mount = '';
  };

  /* ============================ RECOLECCIÓN Y FABRICACIÓN ============================ */
  P.initNodes = function () {
    let s = 987654;
    const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    this.nodes = []; let id = 1;
    const taken = new Set();
    for (const m of world.monsterSpawns) taken.add(kxy(m.x, m.y));
    const okTile = (t) => t === T.GRASS || t === T.DUNE || t === T.SNOW || t === T.FLOOR || t === T.SAND || t === T.DIRT || t === undefined;
    for (const [type, nd] of Object.entries(X.NODES)) {
      const cands = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!world.reach[kxy(x, y)] || !zoneAt(x, y) || !nd.zones.includes(zoneAt(x, y).id)) continue;
        const t = world.tiles[kxy(x, y)];
        if (t === T.PORTAL || t === T.ROAD || t === T.WATER || t === T.WALL) continue;
        if (zoneAt(x, y).kind === 'town') continue;
        cands.push([x, y]);
      }
      for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
      let n = 0;
      for (const [x, y] of cands) {
        if (n >= nd.n) break;
        if (taken.has(kxy(x, y)) || NPCS.some((q) => cheb(q.x, q.y, x, y) < 3)) continue;
        if (this.nodes.some((q) => cheb(q.x, q.y, x, y) < 4)) continue;
        this.nodes.push({ id: id++, type, x, y, at: 0 }); n++;
      }
    }
    this.nodeById = new Map(this.nodes.map((n) => [n.id, n]));
  };
  P.nodeView = function (p) {
    const out = [], vx = CFG.VIEW_X, vy = CFG.VIEW_Y, now = this.now;
    for (const n of this.nodes) if (now >= n.at && Math.abs(n.x - p.x) <= vx && Math.abs(n.y - p.y) <= vy) out.push([n.id, n.type, n.x, n.y]);
    return out;
  };
  P.gather = function (p, id) {
    const n = this.nodeById.get(id | 0), now = this.now;
    if (!n || now < n.at || now < p.nextGather || cheb(p.x, p.y, n.x, n.y) > 1) return;
    const nd = X.NODES[n.type];
    p.nextGather = now + 1100; n.at = now + nd.respawn * (0.8 + Math.random() * 0.4);
    const cl = craftLevel(p.ext.cxp);
    for (const [iid, a, b] of nd.give) {
      const q = rnd(a, b) + (Math.random() < Math.min(0.5, cl * 0.03) ? 1 : 0);
      this.giveOrDrop(p, iid, q);
      this.fx.push({ k: 'd', x: p.x, y: p.y, v: `+${q} ${ITEMS[iid].name}`, c: 'g' });
    }
    if (nd.gem && Math.random() < nd.gem) { const g = Object.keys(GEMS)[rnd(0, 3)]; this.giveOrDrop(p, g, 1); this.msgC(p, `¡Encuentras ${ITEMS[g].name}!`, GEMS[g].col); }
    p.ext.gather++; p.ext.cxp += nd.xp;
    this.fx.push({ k: 'g', x: n.x, y: n.y });
    this.checkAch(p); this.sendXinfo(p, false);
  };
  P.craft = function (p, rid) {
    if (!this.inTown(p)) { this.msg(p, 'Solo puedes fabricar en una ciudad (mesa de trabajo).', 's'); return; }
    const r = X.RECIPES.find((q) => q.id === String(rid)); if (!r) return;
    const cl = craftLevel(p.ext.cxp);
    if (cl < r.lvl) { this.msg(p, `Necesitas nivel de oficio ${r.lvl} (tienes ${cl}).`, 's'); return; }
    for (const [id, n] of r.ing) if (countItem(p, id) < n) { this.msg(p, `Te faltan materiales: ${ITEMS[id].name} ×${n}.`, 's'); return; }
    let out = r.out[0]; const qty = r.out[1];
    if (out === '@gem') out = ['rubi', 'zafiro', 'esmeralda', 'topacio'][rnd(0, 3)];
    else if (out === '@gem2') out = ['amatista', 'opalo', 'diamante'][rnd(0, 2)];
    const test = p.inv.map(I.clone);
    for (const [id, n] of r.ing) { let k = n; for (let i = 0; i < test.length && k > 0; i++) { const it = test[i]; if (it && it.id === id) { const t = Math.min(k, it.qty); it.qty -= t; k -= t; if (it.qty <= 0) test[i] = null; } } }
    if (I.putInto(test, I.mk(out, qty)) > 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
    for (const [id, n] of r.ing) takeItems(p, id, n);
    this.giveItem(p, out, qty);
    p.ext.crafts++; p.ext.cxp += r.xp; p.dirty.inv = true;
    this.msgC(p, `⚒ Fabricaste ${qty > 1 ? qty + '× ' : ''}${ITEMS[out].name}.`, '#9fd0ff');
    this.fx.push({ k: 'g', x: p.x, y: p.y });
    this.checkAch(p); this.sendXinfo(p, false);
  };

  /* ============================ JEFE DE EVENTO ============================ */
  P.initEvent = function () {
    const zone = world.zoneById ? world.zoneById('colinas') : null;
    let best = null, bd = 1e9;
    for (let y = 96; y <= 119; y++) for (let x = 60; x <= 139; x++) {
      if (!world.reach[kxy(x, y)]) continue;
      const t = world.tiles[kxy(x, y)]; if (t === T.PORTAL || t === T.ROAD) continue;
      const d = Math.hypot(x - 100, y - 107); if (d < bd) { bd = d; best = [x, y]; }
    }
    this.arena = best || [100, 107];
    this.event = { state: 'idle', next: Date.now() + (parseFloat(process.env.EVENT_FIRST_MIN) || 6) * 60000, boss: null, ends: 0 };
  };
  P.eventTick = function (now) {
    const ev = this.event; if (!ev) return;
    const online = [...this.players.values()].filter((q) => q.ws);
    if (ev.state === 'idle' && now >= ev.next) {
      if (!online.length) { ev.next = now + 3 * 60000; return; }
      ev.state = 'warn'; ev.spawnAt = now + 60000;
      const zn = zoneAt(this.arena[0], this.arena[1]).name;
      this.broadcastChat(`⚠️ ¡El Coloso Ancestral despertará en 60 segundos en ${zn}! Reúne a tu grupo.`, 'k');
      for (const q of online) this.send(q, { t: 'event', k: 'warn', secs: 60, x: this.arena[0], y: this.arena[1], text: `El Coloso Ancestral despierta en 60 s (${zn}).` });
    } else if (ev.state === 'warn' && now >= ev.spawnAt) {
      const n = Math.max(1, online.length);
      const m = this.spawnMonster(X.BOSS.type, this.arena[0], this.arena[1]);
      m.maxHp = m.hp = Math.round(X.BOSS.def.hp * (1 + 0.35 * (n - 1))); m.event = true; m.noRespawn = true; m.sx = m.x; m.sy = m.y;
      ev.boss = m; ev.state = 'active'; ev.ends = now + 12 * 60000;
      const zn = zoneAt(m.x, m.y).name;
      this.broadcastChat(`🗿 ¡El Coloso Ancestral ha despertado en ${zn}! Tenéis 12 minutos para derrotarlo.`, 'k');
      for (const q of online) this.send(q, { t: 'event', k: 'start', x: m.x, y: m.y, text: `¡El Coloso Ancestral ha despertado en ${zn}!` });
    } else if (ev.state === 'active') {
      const m = ev.boss;
      if (!m || m.dead) { this.removeEventBoss(); ev.state = 'idle'; ev.next = now + EVENT_EVERY; }
      else if (now >= ev.ends) {
        this.removeEventBoss(); ev.state = 'idle'; ev.next = now + EVENT_EVERY;
        this.broadcastChat('El Coloso Ancestral se desvaneció entre la niebla… volverá.', 'k');
        for (const q of online) this.send(q, { t: 'event', k: 'end', text: 'El Coloso Ancestral se desvaneció.' });
      }
    }
  };
  P.removeEventBoss = function () {
    const m = this.event.boss; if (!m) return;
    this.mgrid.delete(kxy(m.x, m.y));
    this.monsters = this.monsters.filter((q) => q !== m); this.ents.delete(m.id); this.event.boss = null;
  };

  /* ============================ ENGANCHES DE COMBATE ============================ */
  P.killMonster = function (m, now) {
    // participantes antes de que el original borre el reparto de daño
    const parts = [];
    let total = 0;
    for (const [pid, e] of m.dmgBy) {
      if (now - e.t > 120000) continue;
      const pl = this.ents.get(pid);
      if (!pl || pl.kind !== 'pl') continue;
      parts.push([pl, e.dmg]); total += e.dmg;
    }
    const topPl = parts.slice().sort((a, b) => b[1] - a[1])[0];
    G0.killMonster.call(this, m, now);
    const def = m.def;
    // quita la reaparición del jefe de evento
    if (m.noRespawn) m.respawnAt = Infinity;
    const xpOf = (dmg) => Math.max(1, Math.round(def.exp * CFG.XP_RATE * dmg / (total || 1)));
    // misiones, estadísticas, logros
    const credited = new Set();
    for (const [pl] of parts) {
      credited.add(pl);
      const party = this.partyOf(pl);
      if (party) for (const q of this.partyMembers(party)) if (q !== pl && cheb(q.x, q.y, m.x, m.y) <= 16 && q.hp > 0) credited.add(q);
    }
    for (const q of credited) {
      q.ext.kt++; q.ext.kills[m.type] = (q.ext.kills[m.type] || 0) + 1;
      if (def.boss) q.ext.bosses++;
      if (q.partyId) q.ext.partyKills++;
      this.questKill(q, m.type);
      this.checkAch(q);
    }
    // experiencia de grupo: reparto con bonus
    const done = new Set();
    for (const [pl] of parts) {
      const party = this.partyOf(pl); if (!party || done.has(party.id)) continue; done.add(party.id);
      const near = this.partyMembers(party).filter((q) => cheb(q.x, q.y, m.x, m.y) <= 16 && q.hp > 0);
      if (near.length < 2) continue;
      let pool = 0; const own = new Map();
      for (const [q, dmg] of parts) if (near.includes(q)) { const x = xpOf(dmg); pool += x; own.set(q, x); }
      const share = pool * (1 + 0.12 * (near.length - 1)) / near.length;
      for (const q of near) { const extra = Math.round(share - (own.get(q) || 0)); if (extra > 0) G0.gainXp.call(this, q, extra); }
    }
    // mascota: recoge el oro y suma su bonus
    if (topPl && topPl[0].ext.pet) {
      const pl = topPl[0], pd = ITEMS[pl.ext.pet];
      const arr = this.gtile.get(kxy(m.x, m.y));
      const g = arr && arr.find((q) => q.item === 'gold' && q.owner === pl.id);
      if (g && pd) {
        const gain = Math.round(g.qty * (1 + (pd.gold || 0)));
        this.removeGround(g); pl.gold += gain; pl.dirty.inv = true;
        this.fx.push({ k: 'd', x: pl.x, y: pl.y, v: '+' + gain + '💰', c: 'x' });
      }
    }
    // jefe de evento: recompensas para todos los que ayudaron
    if (m.event) {
      const need = total * 0.02;
      const names = parts.slice().sort((a, b) => b[1] - a[1]).slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ');
      this.broadcastChat(`🏆 ¡El Coloso Ancestral ha caído! Mayor daño: ${names}.`, 'k');
      const pool = Object.values(ITEMS).filter((d) => d.mage && d.minLevel >= 40);
      for (const [pl, dmg] of parts) {
        if (dmg < need) continue;
        pl.ext.events++;
        const gold = 2500 + pl.level * 80; pl.gold += gold;
        this.gainXp(pl, 4000);
        this.msgC(pl, `🗿 Recompensa del Coloso: +${gold} de oro y 4000 xp.`, '#ffd96a');
        if (Math.random() < 0.3 && pool.length) { const d = pool[rnd(0, pool.length - 1)]; const id = Object.keys(ITEMS).find((k) => ITEMS[k] === d); this.giveOrDrop(pl, id, 1); this.msgC(pl, `¡Botín épico: ${d.name}!`, '#4aa8ff'); }
        pl.dirty.inv = true; this.checkAch(pl);
      }
    }
  };
  P.killPlayer = function (p, src, srcName, now) {
    const pvp = zoneAt(p.x, p.y).pvp;
    G0.killPlayer.call(this, p, src, srcName, now);
    p.ext.deaths++;
    if (src && src.kind === 'pl' && src !== p) { src.ext.pvp++; this.checkAch(src); }
    p.buffs.shield = null; this.checkAch(p);
  };
  P.removePlayer = function (p) {
    if (p.partyId) this.partyLeave(p, true);
    G0.removePlayer.call(this, p);
  };

  /* ============================ MENSAJES DEL CLIENTE ============================ */
  P.handleExt = function (p, msg) {
    switch (msg.t) {
      case 'skill': this.useSkill(p, msg.k | 0); break;
      case 'q_accept': this.questAccept(p, msg.id); break;
      case 'q_turn': this.questTurn(p, msg.id); break;
      case 'q_abandon': this.questAbandon(p, msg.id); break;
      case 'q_list': this.sendQuests(p, ''); break;
      case 'title': this.setTitle(p, String(msg.id || '')); break;
      case 'xinfo': this.sendXinfo(p, false); break;
      case 'rank': this.send(p, { t: 'rank', v: this.rankings() }); break;
      case 'p_inv': this.partyInvite(p, msg.id); break;
      case 'p_acc': this.partyAccept(p, msg.id); break;
      case 'p_leave': this.partyLeave(p); break;
      case 'p_kick': this.partyKick(p, msg.n); break;
      case 'g_create': this.guildCreate(p, msg.n); break;
      case 'g_inv': this.guildInvite(p, msg.id); break;
      case 'g_acc': this.guildAccept(p, msg.id); break;
      case 'g_leave': this.guildLeave(p); break;
      case 'g_kick': this.guildKick(p, msg.n); break;
      case 'g_info': this.sendGuild(p); break;
      case 'm_list': this.marketSend(p, msg); break;
      case 'm_sell': this.marketSell(p, msg.s, msg.price); break;
      case 'm_buy': this.marketBuy(p, msg.id); break;
      case 'm_cancel': this.marketCancel(p, msg.id); break;
      case 'gather': this.gather(p, msg.id); break;
      case 'craft': this.craft(p, msg.id); break;
      default: break;
    }
    if (p.dirty.inv) { p.dirty.inv = false; this.sendInv(p); p.dirty.stats = true; }
  };

  /* ============================ BUCLE ============================ */
  P.tickExt = function (now) {
    this.eventTick(now);
    // veneno
    if (this.dots.length) {
      for (const d of this.dots.slice()) {
        if (now < d.next) continue;
        const src = this.ents.get(d.src), t = this.ents.get(d.tid);
        d.left--; d.next = now + 1000;
        if (!src || !t || t.dead || (t.kind === 'pl' && !this.canPvp(src, t))) d.left = 0;
        else { this.fx.push({ k: 'd', x: t.x, y: t.y, v: d.dmg, c: 'h' }); if (t.kind === 'mo') this.hurtMonster(t, d.dmg, src, now); else this.hurtPlayer(t, d.dmg, src, now, src.name); }
        if (d.left <= 0) this.dots.splice(this.dots.indexOf(d), 1);
      }
    }
    if (this.tickN % 20 === 0) {                    // cada segundo
      for (const p of this.players.values()) {
        if (!p.ws) continue;
        const txt = JSON.stringify(Object.fromEntries(Object.entries(p.buffs).filter(([k, v]) => v && v.until > now && (k !== 'shield' || v.hp > 0)).map(([k, v]) => [k, Math.ceil((v.until - now) / 1000)])));
        const sig = Object.keys(JSON.parse(txt)).sort().join();
        if (sig !== p.lastSig) { p.lastSig = sig; this.sendBuffs(p); }
        if (p.partyInv && Date.now() > p.partyInv.exp) p.partyInv = null;
        this.petCheck(p);
      }
      for (const party of this.parties.values()) this.sendParty(party);
    }
    if (this.tickN % 1200 === 0) this.marketExpire();
  };
};
