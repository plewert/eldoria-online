'use strict';
/**
 * Lógica del juego (servidor autoritativo).
 *  - Un mismo personaje puede ser guerrero, tirador o mago: el estilo lo define el arma equipada.
 *  - Zonas seguras: solo los monstruos pueden atacarte. Zonas PvP: puedes pelear con otros jugadores
 *    y quedarte con el botín de quien caiga.
 */
const { CFG, ITEMS, GEMS, RAR, SHOPS, START_KIT, MONSTERS, NPC_TIPS } = require('./data');
const I = require('./items');
const world = require('./world');
const { W, H, T, zoneAt, ZONES, PORTALS, NPCS, SPAWN_POINT } = world;

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const kxy = (x, y) => y * W + x;
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const clampDir = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

const levelFromXp = (xp) => Math.min(LEVEL_MAX, 1 + Math.floor(Math.sqrt(xp / 50)));
const xpForLevel = (l) => 50 * (l - 1) * (l - 1);
// los equipos raros de monstruos y jefes caen menos (una sola vez al cargar)
for (const d of Object.values(MONSTERS)) for (const l of d.loot) if (I.isGear(l[0])) l[1] *= CFG.GEAR_DROP_MULT;
const { LEVEL_MAX, SKILL_MAX, skillFromXp, skillXpFor, skillMult } = require('./skills');

const FISTS = { name: 'Puños', style: 'melee', atk: 3, cd: 1500, range: 1 };
const SKILL_NAMES = { melee: 'combate cuerpo a cuerpo', ranged: 'combate a distancia', magic: 'magia' };
const SLOTS = I.SLOTS;
const DIRS8 = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_]{2,13}$/;
const npcTiles = new Set(NPCS.map((n) => kxy(n.x, n.y)));

// Mazmorras y cuevas son recintos cerrados: nada ataca hacia dentro ni hacia fuera de ellas
const sameRealm = (a, b) => { const za = zoneAt(a.x, a.y), zb = zoneAt(b.x, b.y); return za === zb || (za.kind !== 'dungeon' && zb.kind !== 'dungeon'); };

class Game {
  constructor(store) {
    this.store = store;
    this.now = Date.now();
    this.tickN = 0;
    this.nextId = 1;
    this.nextGid = 1;
    this.ents = new Map();      // id -> jugador o monstruo
    this.players = new Map();   // clave de cuenta -> jugador
    this.monsters = [];
    this.ground = new Map();    // gid -> objeto en el suelo
    this.gtile = new Map();     // casilla -> [objetos]
    this.mgrid = new Map();     // casilla -> monstruo vivo
    this.pgrid = new Map();     // casilla -> jugador
    this.fx = [];
    this.lastSave = Date.now();
    this.dots = []; this.parties = new Map(); this.nextPartyId = 1;
    this.initNodes(); this.initEvent();
    for (const s of world.monsterSpawns) this.spawnMonster(s.type, s.x, s.y);
  }

  /* ============================ MONSTRUOS ============================ */
  spawnMonster(type, x, y) {
    const def = MONSTERS[type];
    const m = {
      kind: 'mo', id: this.nextId++, type, def, x, y, sx: x, sy: y,
      hp: def.hp, maxHp: def.hp, target: null,
      nextMove: 0, nextAtk: 0, nextScan: 0, dmgBy: new Map(), dead: false, respawnAt: 0,
    };
    this.ents.set(m.id, m);
    this.mgrid.set(kxy(x, y), m);
    this.monsters.push(m);
    return m;
  }

  monsterCanStep(m, x, y) {
    if (!world.isWalkable(x, y)) return false;
    const k = kxy(x, y);
    if (this.mgrid.has(k) || this.pgrid.has(k)) return false;
    if (world.tiles[k] === T.PORTAL) return false;
    if (zoneAt(x, y).kind === 'town') return false;       // los monstruos nunca entran a la ciudad
    return true;
  }

  updateMonster(m, now) {
    const def = m.def;
    if (m.dead) {
      if (now >= m.respawnAt) {
        const k = kxy(m.sx, m.sy);
        if (this.mgrid.has(k) || this.pgrid.has(k)) { m.respawnAt = now + 3000; return; }
        m.dead = false; m.hp = m.maxHp; m.x = m.sx; m.y = m.sy; m.target = null; m.dmgBy.clear();
        this.mgrid.set(k, m);
      }
      return;
    }
    let t = m.target ? this.ents.get(m.target) : null;
    if (t && (t.kind !== 'pl' || t.hp <= 0 || cheb(m.x, m.y, t.x, t.y) > def.aggro + 9 || cheb(t.x, t.y, m.sx, m.sy) > 20 || !sameRealm(m, t))) { m.target = null; t = null; }
    if (!t && def.aggro > 0 && now >= m.nextScan) {
      m.nextScan = now + 400;
      let best = null, bd = 1e9;
      for (const p of this.players.values()) {
        if (p.hp <= 0 || !sameRealm(m, p)) continue;
        const d = cheb(m.x, m.y, p.x, p.y);
        if (d <= def.aggro && d < bd) { bd = d; best = p; }
      }
      if (best) { m.target = best.id; t = best; }
    }
    if (t) {
      const range = def.range || 1;
      const d = range === 1 ? cheb(m.x, m.y, t.x, t.y) : dist(m.x, m.y, t.x, t.y);
      const inRange = d <= (range === 1 ? 1 : range + 0.2);
      if (inRange && now >= m.nextAtk) {
        m.nextAtk = now + def.atkCd;
        const raw = rnd(def.dmg[0], def.dmg[1]);
        if (range > 1) this.fx.push({ k: 'p', x1: m.x, y1: m.y, x2: t.x, y2: t.y, s: def.proj || 'fire' });
        else this.fx.push({ k: 's', x: t.x, y: t.y });
        this.hurtPlayer(t, raw, m, now, def.name);
      }
      if (!inRange && now >= m.nextMove) {
        m.nextMove = now + def.move * (m.slowUntil > now ? 2.2 : 1);
        const goal = range === 1 ? (x, y) => cheb(x, y, t.x, t.y) <= 1 : (x, y) => dist(x, y, t.x, t.y) <= range - 0.3;
        this.moveToward(m, t.x, t.y, goal, (x, y) => this.monsterCanStep(m, x, y));
      }
    } else if (now >= m.nextMove) {
      m.nextMove = now + def.move * 2.5;
      const far = cheb(m.x, m.y, m.sx, m.sy) > 6;
      if (far) {
        this.moveToward(m, m.sx, m.sy, (x, y) => x === m.sx && y === m.sy, (x, y) => this.monsterCanStep(m, x, y));
        if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * 0.05));
      } else if (def.aggro >= 0 && Math.random() < 0.3) {
        const [dx, dy] = DIRS8[rnd(0, 3)];
        const nx = m.x + dx, ny = m.y + dy;
        if (cheb(nx, ny, m.sx, m.sy) <= 4 && this.monsterCanStep(m, nx, ny)) this.relocate(m, nx, ny);
      }
    }
  }

  relocate(m, nx, ny) {
    this.mgrid.delete(kxy(m.x, m.y));
    m.x = nx; m.y = ny;
    this.mgrid.set(kxy(nx, ny), m);
  }

  /** Avanza un paso hacia (tx,ty): BFS local y, si no hay camino cercano, paso voraz. */
  moveToward(m, tx, ty, goalFn, pass) {
    const step = this.bfsStep(m.x, m.y, goalFn, pass, 260) || this.greedyStep(m.x, m.y, tx, ty, pass);
    if (!step) return false;
    this.relocate(m, m.x + step.dx, m.y + step.dy);
    return true;
  }

  bfsStep(sx, sy, goalFn, pass, maxNodes) {
    const start = kxy(sx, sy);
    const prev = new Map([[start, -1]]);
    const q = [start];
    for (let qi = 0; qi < q.length && q.length < maxNodes; qi++) {
      const k = q[qi], x = k % W, y = (k / W) | 0;
      if (k !== start && goalFn(x, y)) {
        let c = k;
        while (prev.get(c) !== start) c = prev.get(c);
        return { dx: (c % W) - sx, dy: ((c / W) | 0) - sy };
      }
      for (let i = 0; i < 8; i++) {
        const nx = x + DIRS8[i][0], ny = y + DIRS8[i][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nk = kxy(nx, ny);
        if (prev.has(nk) || !pass(nx, ny)) continue;
        prev.set(nk, k); q.push(nk);
      }
    }
    return null;
  }

  greedyStep(sx, sy, tx, ty, pass) {
    let best = null, bd = dist(sx, sy, tx, ty);
    for (const [dx, dy] of DIRS8) {
      const nx = sx + dx, ny = sy + dy;
      if (!pass(nx, ny)) continue;
      const d = dist(nx, ny, tx, ty);
      if (d < bd) { bd = d; best = { dx, dy }; }
    }
    return best;
  }

  /* ============================ SUELO / BOTÍN ============================ */
  addGround(item, qty, x, y, opts = {}) {
    const g = { gid: this.nextGid++, item, qty, x, y, exp: this.now + CFG.GROUND_TTL, prot: opts.prot || 0, owner: opts.owner || 0, inst: opts.inst || null };
    this.ground.set(g.gid, g);
    const k = kxy(x, y);
    const arr = this.gtile.get(k);
    if (arr) arr.push(g); else this.gtile.set(k, [g]);
    return g;
  }

  removeGround(g) {
    this.ground.delete(g.gid);
    const k = kxy(g.x, g.y);
    const arr = this.gtile.get(k);
    if (!arr) return;
    const i = arr.indexOf(g);
    if (i >= 0) arr.splice(i, 1);
    if (!arr.length) this.gtile.delete(k);
  }

  pickup(p, silent, only) {
    const arr = this.gtile.get(kxy(p.x, p.y));
    if (p.wantGid && this.now > p.wantUntil) p.wantGid = 0;
    if (!only && p.wantGid) only = p.wantGid;          // modo elegir: al caminar solo se recoge lo pedido
    if (!arr || !arr.length) return;
    const now = this.now;
    let invDirty = false, blocked = false, full = false;
    for (const g of arr.slice()) {
      if (only && g.gid !== only) continue;
      if (g.prot > now && g.owner !== p.id) { blocked = true; continue; }
      if (only) p.wantGid = 0;
      if (g.item === 'gold') {
        p.gold += g.qty; this.removeGround(g); invDirty = true;
        this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + g.qty + '💰', c: 'x' });
        if (!silent) this.msg(p, `Recoges ${g.qty} monedas de oro.`, 's');
        continue;
      }
      const before = g.qty;
      const left = g.inst ? this.giveInst(p, g.inst) : this.giveItem(p, g.item, g.qty);
      if (left < before) {
        invDirty = true;
        if (!silent) {
          const got = g.inst || { id: g.item, qty: 1 };
          this.msgC(p, `Recoges ${g.inst ? '' : (before - left) + 'x '}${I.nameOf(got)}.`, I.colorOf(got));
        }
      }
      if (left <= 0) this.removeGround(g); else { g.qty = left; full = true; }
    }
    if (invDirty) { p.dirty.inv = true; p.dirty.stats = true; }
    if (full) this.msgThrottle(p, 'full', 'Tu inventario está lleno.');
    if (blocked) this.msgThrottle(p, 'prot', 'Ese botín pertenece a otro jugador durante unos segundos.');
  }

  /* ============================ INVENTARIO ============================ */
  /** Devuelve la cantidad que NO cupo. */
  giveItem(p, id, qty) {
    if (!ITEMS[id]) return qty;
    return I.putInto(p.inv, I.mk(id, qty));
  }

  /** Entrega un objeto ya creado (con +N, gemas...). Devuelve cuántas unidades NO cupieron. */
  giveInst(p, it) { return I.putInto(p.inv, it); }

  equip(p, slot) {
    const it = p.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    if (!def || !I.isGear(it.id)) return;
    if ((def.minLevel || 1) > p.level) { this.msg(p, `Necesitas nivel ${def.minLevel} para usar ${def.name}.`, 's'); return; }
    const sl = I.slotFor(def.type, p.eq);
    const old = p.eq[sl];
    p.eq[sl] = it;
    p.inv[slot] = old || null;
    p.vis = null; this.recalc(p);
    p.dirty.inv = true;
  }

  unequip(p, slotName) {
    if (!SLOTS.includes(slotName) || !p.eq[slotName]) return;
    const i = p.inv.indexOf(null);
    if (i < 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
    p.inv[i] = p.eq[slotName];
    p.eq[slotName] = null;
    p.vis = null; this.recalc(p);
    p.dirty.inv = true;
  }

  use(p, slot) {
    const it = p.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    if (!def) return;
    if (I.isGear(it.id)) { this.equip(p, slot); return; }
    if (def.type !== 'consumable') return;
    const now = this.now;
    if (def.food ? now < p.nextFood : now < p.nextPotion) return;
    if ((def.minLevel || 1) > p.level) { this.msg(p, `Necesitas nivel ${def.minLevel} para usar ${def.name}.`, 's'); return; }
    if (def.heal) {
      if (p.hp >= p.maxHp) return;
      const h = Math.min(def.heal, p.maxHp - p.hp);
      p.hp += h; this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + h, c: 'g' });
    } else if (def.restore) {
      if (p.mana >= p.maxMana) return;
      const r = Math.min(def.restore, p.maxMana - p.mana);
      p.mana += r; this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + r, c: 'm' });
    }
    if (def.food) p.nextFood = now + CFG.FOOD_CD_MS; else p.nextPotion = now + 1000;
    it.qty--; if (it.qty <= 0) p.inv[slot] = null;
    p.dirty.inv = true;
  }

  useBest(p, kind) {
    // Usa la mejor poción disponible de ese tipo (la más pequeña que no desperdicie demasiado)
    let bestSlot = -1, bestVal = 1e9;
    for (let i = 0; i < p.inv.length; i++) {
      const it = p.inv[i];
      if (!it) continue;
      const d = ITEMS[it.id];
      if (!d || d.type !== 'consumable' || d.food || !d[kind] || (d.minLevel || 1) > p.level) continue;
      if (d[kind] < bestVal) { bestVal = d[kind]; bestSlot = i; }
    }
    if (bestSlot >= 0) this.use(p, bestSlot);
    else this.msgThrottle(p, 'nopot', kind === 'heal' ? 'No tienes pociones de vida.' : 'No tienes pociones de maná.');
  }

  /** Comer: la comida más pequeña que cubra lo que te falta; si ninguna basta, la mayor. */
  useFood(p) {
    if (p.hp >= p.maxHp) return;
    const missing = p.maxHp - p.hp; let slot = -1, val = 0, fit = false;
    for (let i = 0; i < p.inv.length; i++) {
      const it = p.inv[i], d = it && ITEMS[it.id]; if (!d || !d.food) continue;
      const ok = d.heal >= missing;
      if (slot < 0 || (ok && (!fit || d.heal < val)) || (!ok && !fit && d.heal > val)) { slot = i; val = d.heal; fit = ok; }
    }
    if (slot < 0) { this.msgThrottle(p, 'nofood', 'No tienes comida. Cómprala en las tiendas o en la Aldea Pesquera.'); return; }
    if (this.now < p.nextFood) return;
    this.use(p, slot);
    this.fx.push({ k: 'h', x: p.x, y: p.y });
  }

  drop(p, slot, qty) {
    const it = p.inv[slot];
    if (!it) return;
    if (I.isGear(it.id)) { p.inv[slot] = null; this.addGround(it.id, 1, p.x, p.y, { inst: it }); }
    else {
      qty = Math.max(1, Math.min(it.qty, qty | 0 || 1));
      it.qty -= qty; if (it.qty <= 0) p.inv[slot] = null;
      this.addGround(it.id, qty, p.x, p.y);
    }
    p.dirty.inv = true;
  }

  /** Cambia al mejor arma del estilo pedido (de tu inventario o la ya equipada). */
  switchStyle(p, style) {
    let bestSlot = -1, bestAtk = -1;
    for (let i = 0; i < p.inv.length; i++) {
      const it = p.inv[i];
      if (!it) continue;
      const d = ITEMS[it.id];
      if (d && d.type === 'weapon' && d.style === style && (d.minLevel || 1) <= p.level && I.baseStat(it) > bestAtk) { bestAtk = I.baseStat(it); bestSlot = i; }
    }
    const cur = p.eq.weapon, cd = cur && ITEMS[cur.id];
    if (cd && cd.style === style && I.baseStat(cur) >= bestAtk) { this.msgThrottle(p, 'sw', 'Ya usas un arma de ese estilo.'); return; }
    if (bestSlot >= 0) { this.equip(p, bestSlot); this.msgC(p, `Cambias a ${I.nameOf(p.eq.weapon)}.`, I.colorOf(p.eq.weapon)); }
    else this.msgThrottle(p, 'sw', 'No tienes ningún arma utilizable de ese estilo.');
  }

  /* ============================ JUGADORES ============================ */
  recalc(p) {
    p.level = levelFromXp(p.xp);
    const gb = I.gearBonus(p.eq);
    p.maxHp = 100 + 20 * (p.level - 1) + gb.hp;
    p.maxMana = 40 + 12 * (p.level - 1) + gb.mana;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    if (p.mana > p.maxMana) p.mana = p.maxMana;
  }

  defOf(p) {
    let d = I.gearBonus(p.eq).def;
    for (const s of ['head', 'body', 'shield']) { const it = p.eq[s]; if (it) d += I.baseStat(it); }
    return d;
  }

  weaponOf(p) {
    const it = p.eq.weapon;
    if (!it) return FISTS;
    const d = ITEMS[it.id];
    return { name: I.nameOf(it), style: d.style, atk: I.baseStat(it) + I.gearBonus(p.eq).atk, cd: d.cd, range: d.range, mana: d.mana };
  }

  styleOf(p) { return this.weaponOf(p).style; }

  visOf(p) { if (!p.vis) p.vis = I.visOf(p.eq); return p.vis; }

  createPlayer(acc) {
    const d = acc.data || null;
    const p = {
      kind: 'pl', id: this.nextId++, key: acc.key, name: acc.name, color: acc.color || '#4aa3ff',
      ws: null, x: SPAWN_POINT.x, y: SPAWN_POINT.y, dir: 2,
      hp: 0, mana: 0, xp: 0, sxp: { melee: 0, ranged: 0, magic: 0 }, gold: 0,
      inv: new Array(CFG.INV_SIZE).fill(null), eq: { weapon: null, head: null, body: null, shield: null },
      bank: new Array(CFG.BANK_SIZE).fill(null), bankGold: 0, vis: null, trade: null, tradeInv: null, bankOpen: false,
      target: null, nextMove: 0, nextAtk: 0, nextPotion: 0, nextFood: 0, nextSpell: 0, nextRegen: 0, pend: null,
      pvpLock: 0, offlineUntil: 0, tpSeq: 0, lastChat: 0, throttle: {}, dirty: { inv: true, stats: true },
    };
    this.extLoad(p, d);
    if (d) {
      p.xp = Math.min(xpForLevel(LEVEL_MAX), d.xp | 0); p.gold = d.gold | 0;
      const cap = skillXpFor(SKILL_MAX); p.sxp = { melee: Math.min(cap, d.sxp.melee | 0), ranged: Math.min(cap, d.sxp.ranged | 0), magic: Math.min(cap, d.sxp.magic | 0) };
      d.inv.forEach((it, i) => { const n = I.normalize(it); if (n && i < CFG.INV_SIZE) p.inv[i] = n; });
      if (Array.isArray(d.bank)) d.bank.forEach((it, i) => { const n = I.normalize(it); if (n && i < CFG.BANK_SIZE) p.bank[i] = n; });
      p.bankGold = d.bankGold | 0;
      for (const s of SLOTS) { const n = I.normalize(d.eq && d.eq[s]); p.eq[s] = n && I.fits(s, ITEMS[n.id].type) ? n : null; }
      if (world.isWalkable(d.x, d.y) && zoneAt(d.x, d.y).kind !== 'dungeon') { p.x = d.x; p.y = d.y; }
      this.recalc(p);
      p.hp = Math.max(1, Math.min(p.maxHp, d.hp | 0)); p.mana = Math.max(0, Math.min(p.maxMana, d.mana | 0));
    } else {
      p.gold = START_KIT.gold;
      for (const s of SLOTS) p.eq[s] = START_KIT.eq[s] ? I.mk(START_KIT.eq[s]) : null;
      for (const [id, q] of START_KIT.inv) this.giveItem(p, id, q);
      this.recalc(p);
      p.hp = p.maxHp; p.mana = p.maxMana;
    }
    this.players.set(p.key, p);
    this.ents.set(p.id, p);
    return p;
  }

  serialize(p) {
    const eq = {};
    for (const s of SLOTS) eq[s] = I.clone(p.eq[s]);
    const inv = p.inv.map((it) => I.clone(it));
    let gold = p.gold;
    if (p.trade) {                    // lo que está en la oferta de un comercio no se pierde si el servidor se cae
      for (const it of p.trade.offer) I.putInto(inv, it);
      gold += p.trade.gold;
    }
    return {
      x: p.x, y: p.y, hp: p.hp, mana: p.mana, xp: p.xp, sxp: p.sxp, gold,
      inv, eq, bank: p.bank.map((it) => I.clone(it)), bankGold: p.bankGold, ext: this.extSave(p),
    };
  }

  savePlayer(p) { this.store.saveData(p.key, this.serialize(p)); }

  /** Conecta una cuenta autenticada a la partida. */
  attach(acc, ws) {
    let p = this.players.get(acc.key);
    if (p) {
      if (p.ws && p.ws !== ws) {
        const old = p.ws;
        old.p = null;
        try { old.send(JSON.stringify({ t: 'err', msg: 'Has iniciado sesión desde otro lugar.' })); old.close(); } catch (e) { /* nada */ }
      }
      p.offlineUntil = 0;
    } else {
      p = this.createPlayer(acc);
    }
    p.ws = ws; ws.p = p;
    p.dirty = { inv: true, stats: true };
    this.sendWelcome(p);
    this.onLogin(p);
    this.msg(p, `¡Bienvenido a Eldoria, ${p.name}! Habla con Orin el Sabio en la ciudad para recibir consejos.`, 's');
    this.broadcastChat(`${p.name} se ha conectado.`, 's');
    return p;
  }

  onClose(ws) {
    const p = ws.p;
    if (!p || p.ws !== ws) return;
    this.tradeCancel(p, `${p.name} se desconectó: comercio cancelado.`);
    p.ws = null; ws.p = null;
    if (this.now < p.pvpLock) {
      p.offlineUntil = this.now + CFG.GHOST_MS;   // sigue en el mundo y es vulnerable
      p.pend = null;
    } else {
      this.removePlayer(p);
    }
  }

  removePlayer(p) {
    this.tradeCancel(p);
    this.savePlayer(p);
    this.players.delete(p.key);
    this.ents.delete(p.id);
    this.pgrid.delete(kxy(p.x, p.y));
    this.broadcastChat(`${p.name} se ha desconectado.`, 's');
  }

  /* ============================ ENVÍO ============================ */
  send(p, obj) {
    if (p.ws && p.ws.open) p.ws.send(JSON.stringify(obj));
  }

  msg(p, text, kind = 's') { this.send(p, { t: 'chat', n: '', m: text, k: kind }); }

  /** Mensaje con color propio (nombres de objetos por rareza). */
  msgC(p, text, color) { this.send(p, { t: 'chat', n: '', m: text, k: 'i', c: color }); }

  msgThrottle(p, key, text) {
    if (this.now < (p.throttle[key] || 0)) return;
    p.throttle[key] = this.now + 2500;
    this.msg(p, text, 's');
  }

  broadcastChat(text, kind, from = '') {
    for (const p of this.players.values()) this.send(p, { t: 'chat', n: from, m: text, k: kind });
  }

  sendWelcome(p) {
    // Ficha de cada monstruo con su tabla de botín (para el clic derecho "ver drops")
    const monsDefs = {};
    for (const [k, d] of Object.entries(MONSTERS)) {
      monsDefs[k] = Object.assign({
        name: d.name, icon: d.icon, boss: !!d.boss, range: d.range || 1, lv: d.lv || 1,
        hp: d.hp, dmg: d.dmg, exp: Math.round(d.exp * CFG.XP_RATE), aggro: d.aggro, respawn: d.respawn, move: d.move,
      }, I.dropInfo(d));
    }
    const gems = {};
    for (const [k, g] of Object.entries(GEMS)) gems[k] = { name: g.name, icon: g.icon, col: g.col, desc: g.desc };
    this.send(p, {
      t: 'welcome', id: p.id, w: W, h: H, rows: world.rows,
      zones: ZONES.map((z) => ({ id: z.id, name: z.name, pvp: z.pvp, kind: z.kind, dark: !!z.dark, rect: z.rect, tint: z.tint || null })),
      portals: PORTALS.map((q) => ({ x: q.x, y: q.y, label: q.label })),
      npcs: NPCS, items: ITEMS, mons: monsDefs, gems, rar: RAR,
      cfg: {
        pvpMin: CFG.PVP_MIN_LEVEL, step: CFG.STEP_MS, invSize: CFG.INV_SIZE, bankSize: CFG.BANK_SIZE,
        tradeMax: CFG.TRADE_MAX_ITEMS, gemCost: CFG.GEM_REMOVE_COST, plusChance: CFG.PLUS_CHANCE, ancChance: CFG.ANCIENT_CHANCE,
      },
    });
    this.sendInv(p); this.sendStats(p);
    this.sendSnapshot(p);
  }

  sendInv(p) {
    const eq = {};
    for (const s of SLOTS) eq[s] = I.pack(p.eq[s]);
    this.send(p, { t: 'inv', inv: p.inv.map(I.pack), eq, gold: p.gold, bankGold: p.bankGold });
  }

  sendStats(p) {
    const sk = {};
    for (const s of ['melee', 'ranged', 'magic']) {
      const l = skillFromXp(p.sxp[s]);
      sk[s] = [l, p.sxp[s], skillXpFor(l), l >= SKILL_MAX ? skillXpFor(l) + 1 : skillXpFor(l + 1)];
    }
    const w = this.weaponOf(p);
    this.send(p, {
      t: 'stats', lv: p.level, xp: p.xp, xpLo: xpForLevel(Math.min(p.level, LEVEL_MAX - 1)), xpHi: xpForLevel(Math.min(p.level + 1, LEVEL_MAX)),
      maxHp: p.maxHp, maxMana: p.maxMana, gold: p.gold, sk, style: w.style, def: this.defOf(p), weapon: w.name,
      gb: I.gearBonus(p.eq), glow: this.visOf(p).g,
    });
  }

  sendSnapshot(p) {
    if (!p.ws || !p.ws.open) return;
    const now = this.now, vx = CFG.VIEW_X, vy = CFG.VIEW_Y;
    const inView = (x, y) => Math.abs(x - p.x) <= vx && Math.abs(y - p.y) <= vy;
    const pl = [], mo = [], gi = [], fx = [];
    for (const q of this.players.values()) {
      if (!inView(q.x, q.y)) continue;
      const vis = this.visOf(q);
      pl.push({ i: q.id, n: q.name, x: q.x, y: q.y, h: q.hp, H: q.maxHp, l: q.level, c: q.color, s: this.styleOf(q), d: q.dir, k: now < q.pvpLock ? 1 : 0, o: q.ws ? 0 : 1, v: vis.g, a: vis.an, t: q.trade ? 1 : 0, q: SLOTS.map((s) => (q.eq[s] ? q.eq[s].id : 0)), ...this.extView(q) });
    }
    for (const m of this.monsters) {
      if (m.dead || !inView(m.x, m.y)) continue;
      mo.push({ i: m.id, t: m.type, x: m.x, y: m.y, h: m.hp, H: m.maxHp });
    }
    for (const [k, arr] of this.gtile) {
      const x = k % W, y = (k / W) | 0;
      if (!inView(x, y)) continue;
      gi.push({ x, y, it: arr.slice(0, 4).map((g) => [g.item, g.qty, g.prot > now && g.owner !== p.id ? 1 : 0, g.inst ? g.inst.up || 0 : 0, g.inst && g.inst.an ? 1 : 0, g.gid]), n: arr.length });
    }
    for (const f of this.fx) {
      const fx0 = f.x !== undefined ? f.x : f.x1, fy0 = f.y !== undefined ? f.y : f.y1;
      if (Math.abs(fx0 - p.x) <= vx + 3 && Math.abs(fy0 - p.y) <= vy + 3) fx.push(f);
    }
    this.send(p, { t: 's', me: { x: p.x, y: p.y, h: p.hp, m: p.mana, tg: p.target, tp: p.tpSeq, v: this.visOf(p).g, lk: p.pvpLock > now ? Math.ceil((p.pvpLock - now) / 1000) : 0 }, pl, mo, gi, fx, nd: this.nodeView(p) });
  }

  /* ============================ ENTRADAS DEL CLIENTE ============================ */
  handle(p, msg) {
    const now = Date.now();
    switch (msg.t) {
      case 'move': {
        const dx = clampDir(msg.dx), dy = clampDir(msg.dy);
        if (!dx && !dy) { p.pend = null; break; }
        p.pend = { dx, dy, exp: now + (msg.once ? 350 : 130) };
        break;
      }
      case 'target': {
        if (msg.id == null) { p.target = null; break; }
        const t = this.ents.get(msg.id | 0);
        if (!t || t === p || (t.kind === 'mo' && t.dead)) { p.target = null; break; }
        if (cheb(p.x, p.y, t.x, t.y) > CFG.VIEW_X) break;
        if (t.kind === 'pl' && !this.canPvp(p, t)) { p.target = null; this.explainNoPvp(p, t); break; }
        p.target = t.id;
        break;
      }
      case 'equip': this.equip(p, msg.s | 0); break;
      case 'unequip': this.unequip(p, String(msg.slot)); p.dirty.stats = true; break;
      case 'swap': {                                  // reorganizar la mochila: intercambia dos casillas
        const a = msg.a | 0, b = msg.b | 0, n = p.inv.length;
        if (a < 0 || b < 0 || a >= n || b >= n || a === b) break;
        const t = p.inv[a]; p.inv[a] = p.inv[b]; p.inv[b] = t; p.dirty.inv = true; break;
      }
      case 'use': this.use(p, msg.s | 0); break;
      case 'drop': this.drop(p, msg.s | 0, msg.q | 0); break;
      case 'pickup': this.pickup(p, false); break;
      case 'pick': {                                  // clic derecho: recoger solo ese objeto
        const g = this.ground.get(msg.gid | 0); if (!g) break;
        if (cheb(p.x, p.y, g.x, g.y) > 40) break;
        if (g.x === p.x && g.y === p.y) this.pickup(p, false, g.gid);
        else { p.wantGid = g.gid; p.wantUntil = this.now + 20000; }
        break;
      }
      case 'style': if (['melee', 'ranged', 'magic'].includes(msg.s)) this.switchStyle(p, msg.s); break;
      case 'potion': this.useBest(p, msg.k === 'mana' ? 'restore' : 'heal'); break;
      case 'spell': this.castHeal(p); break;
      case 'eat': this.useFood(p); break;
      case 'chat': this.chat(p, String(msg.text || '')); break;
      case 'npc': this.npcClick(p, msg.id); break;
      case 'buy': this.buy(p, String(msg.id), msg.q | 0); break;
      case 'sell': this.sell(p, msg.s | 0, msg.q | 0); break;
      case 'bdep': this.bankDeposit(p, msg.s | 0, msg.q | 0); break;
      case 'bwd': this.bankWithdraw(p, msg.s | 0, msg.q | 0); break;
      case 'bgold': this.bankGoldMove(p, msg.d === 'wd' ? 'wd' : 'dep', msg.q); break;
      case 'socket': this.socketGem(p, msg); break;
      case 'unsocket': this.unsocketGem(p, msg); break;
      case 'trade_req': this.tradeRequest(p, msg.id); break;
      case 'trade_acc': this.tradeAccept(p, msg.id); break;
      case 'trade_add': this.tradeAdd(p, msg.s | 0, msg.q | 0); break;
      case 'trade_rem': this.tradeRemove(p, msg.i | 0); break;
      case 'trade_gold': this.tradeGold(p, msg.g); break;
      case 'trade_ok': this.tradeConfirm(p); break;
      case 'trade_no':
        if (p.trade) this.tradeCancel(p, 'Comercio cancelado.');
        else if (p.tradeInv) { const q = this.ents.get(p.tradeInv.from); p.tradeInv = null; if (q && q.kind === 'pl') this.msg(q, `${p.name} rechazó el comercio.`, 's'); }
        break;
      default: this.handleExt(p, msg); break;
    }
    if (p.dirty.inv) { p.dirty.inv = false; this.sendInv(p); p.dirty.stats = true; }
    if (p.dirty.stats) { p.dirty.stats = false; this.sendStats(p); }
  }

  chat(p, text) {
    text = text.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 120);
    if (!text) return;
    const now = Date.now();
    if (now - p.lastChat < 600) return;
    p.lastChat = now;
    if (text === '/pos') { const z = zoneAt(p.x, p.y); this.msg(p, `Estás en ${z.name} (${p.x}, ${p.y}). ${z.pvp ? 'Zona PvP.' : 'Zona segura.'}`, 's'); return; }
    if (text === '/top') {
      const list = [...this.players.values()].sort((a, b) => b.xp - a.xp).slice(0, 5).map((q) => `${q.name} (nv ${q.level})`).join(', ');
      this.msg(p, 'Jugadores conectados más fuertes: ' + list, 's'); return;
    }
    if (text === '/ayuda') { this.msg(p, 'Comandos: /g mensaje (global), /p mensaje (grupo), /gc mensaje (gremio), /grupo, /gremio, /clave, /pos, /top. Teclas 1-2-3: habilidades; Q misiones, L logros, G social, R ranking, P mercado, F oficios. Otras: WASD mover, Z/X/C arma, H/J pociones, V curar, E recoger. Clic derecho: monstruo = ver sus drops, jugador = comerciar, objeto = gemas.', 's'); return; }
    if (text.startsWith('/g ')) { this.broadcastChat(text.slice(3), 'g', p.name); return; }
    if (this.chatExt(p, text)) return;
    if (text.startsWith('/')) { this.msg(p, 'Comando desconocido. Escribe /ayuda.', 's'); return; }
    for (const q of this.players.values()) {
      if (cheb(q.x, q.y, p.x, p.y) <= 14) this.send(q, { t: 'chat', n: p.name, m: text, k: 'l' });
    }
    this.fx.push({ k: 'c', x: p.x, y: p.y, v: text.slice(0, 40), i: p.id });
  }

  npcClick(p, id) {
    const n = NPCS.find((q) => q.id === id);
    if (!n) return;
    if (cheb(p.x, p.y, n.x, n.y) > 4) { this.msg(p, `Acércate más a ${n.name}.`, 's'); return; }
    p.shopNpc = null;
    if (n.type === 'shop') {
      p.shopNpc = n.id;
      this.send(p, { t: 'shop', npc: n.name, stock: SHOPS[n.shop] || [] });
      this.msg(p, `${n.name}: ¡Bienvenido! Compro tus trofeos y vendo equipo de calidad.`, 'n');
      if (n.id === 'orin') this.msg(p, `${n.name}: ${NPC_TIPS[rnd(0, NPC_TIPS.length - 1)]}`, 'n');
    } else if (n.type === 'bank') {
      this.sendBank(p);
      this.msg(p, `${n.name}: Guardo tu oro y tus objetos a salvo. Lo que está en el banco no se pierde si te matan.`, 'n');
    } else {
      this.msg(p, `${n.name}: ${NPC_TIPS[rnd(0, NPC_TIPS.length - 1)]}`, 'n');
    }
    this.sendQuests(p, n.id);
  }

  /** El mercader cuya tienda tiene abierta el jugador, si sigue cerca. */
  openShop(p) {
    const n = p.shopNpc && NPCS.find((q) => q.id === p.shopNpc);
    return n && cheb(p.x, p.y, n.x, n.y) <= 4 ? n : null;
  }

  buy(p, id, qty) {
    const n = this.openShop(p);
    if (!n) { this.msg(p, 'Estás demasiado lejos del mercader.', 's'); return; }
    if (!(SHOPS[n.shop] || []).includes(id)) return;
    const def = ITEMS[id];
    qty = Math.max(1, Math.min(def.stack ? 100 : 1, qty || 1));
    const total = def.price * qty;
    if (p.gold < total) { this.msg(p, 'No tienes suficiente oro.', 's'); return; }
    const left = this.giveItem(p, id, qty);
    const bought = qty - left;
    if (bought <= 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
    p.gold -= def.price * bought;
    this.msg(p, `Compras ${bought}x ${def.name} por ${def.price * bought} de oro.`, 's');
    p.dirty.inv = true;
  }

  sell(p, slot, qty) {
    const it = p.inv[slot];
    if (!it) return;
    if (!this.openShop(p)) { this.msg(p, 'Estás demasiado lejos del mercader.', 's'); return; }
    let each = I.sellValue(it);
    if (each && this.fishMult) each = Math.round(each * this.fishMult(p, it.id));     // los peces valen más con el nivel de pesca
    if (!each) { this.msg(p, 'El mercader no quiere eso.', 's'); return; }
    qty = I.isGear(it.id) ? 1 : Math.max(1, Math.min(it.qty, qty || 1));
    const name = I.nameOf(it), col = I.colorOf(it);
    it.qty -= qty; if (it.qty <= 0) p.inv[slot] = null;
    const gain = each * qty;
    p.gold += gain;
    this.msgC(p, `Vendes ${qty}x ${name} por ${gain} de oro.`, col);
    p.dirty.inv = true;
  }

  /* ============================ BANCO ============================ */
  nearBank(p) { return NPCS.find((q) => q.type === 'bank' && cheb(p.x, p.y, q.x, q.y) <= 4) || null; }

  sendBank(p) { this.send(p, { t: 'bank', bank: p.bank.map(I.pack), gold: p.bankGold, size: CFG.BANK_SIZE }); }

  bankDeposit(p, slot, qty) {
    if (!this.nearBank(p)) { this.msg(p, 'Acércate a una banquera.', 's'); return; }
    const it = p.inv[slot];
    if (!it) return;
    if (I.isGear(it.id)) {
      if (I.putInto(p.bank, it) > 0) { this.msg(p, 'Tu banco está lleno.', 's'); return; }
      p.inv[slot] = null;
    } else {
      qty = Math.max(1, Math.min(it.qty, qty || it.qty));
      const done = qty - I.putInto(p.bank, { id: it.id, qty });
      if (done <= 0) { this.msg(p, 'Tu banco está lleno.', 's'); return; }
      it.qty -= done; if (it.qty <= 0) p.inv[slot] = null;
    }
    p.dirty.inv = true; this.sendBank(p);
  }

  bankWithdraw(p, slot, qty) {
    if (!this.nearBank(p)) { this.msg(p, 'Acércate a una banquera.', 's'); return; }
    const it = p.bank[slot];
    if (!it) return;
    if (I.isGear(it.id)) {
      if (I.putInto(p.inv, it) > 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
      p.bank[slot] = null;
    } else {
      qty = Math.max(1, Math.min(it.qty, qty || it.qty));
      const done = qty - I.putInto(p.inv, { id: it.id, qty });
      if (done <= 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
      it.qty -= done; if (it.qty <= 0) p.bank[slot] = null;
    }
    p.dirty.inv = true; this.sendBank(p);
  }

  bankGoldMove(p, dir, q) {
    if (!this.nearBank(p)) { this.msg(p, 'Acércate a una banquera.', 's'); return; }
    q = Math.floor(Number(q) || 0);
    if (q <= 0) return;
    if (dir === 'wd') { q = Math.min(q, p.bankGold); p.bankGold -= q; p.gold += q; }
    else { q = Math.min(q, p.gold); p.gold -= q; p.bankGold += q; }
    if (q <= 0) return;
    p.dirty.inv = true; this.sendBank(p);
  }

  /* ============================ GEMAS Y RANURAS ============================ */
  gearRef(p, from, at) {
    if (from === 'eq') return SLOTS.includes(String(at)) ? p.eq[String(at)] : null;
    const it = p.inv[at | 0];
    return it && I.isGear(it.id) ? it : null;
  }

  canSocket(p) {
    if (zoneAt(p.x, p.y).pvp || this.now < p.pvpLock) { this.msg(p, 'Solo puedes engarzar o sacar gemas en una zona segura y fuera de combate.', 's'); return false; }
    return true;
  }

  socketGem(p, m) {
    if (!this.canSocket(p)) return;
    const gs = m.gem | 0, gem = p.inv[gs];
    if (!gem || !I.isGem(gem.id)) return;
    const item = this.gearRef(p, m.from, m.at);
    if (!item) return;
    const hole = item.gm.indexOf(null);
    if (hole < 0) { this.msg(p, 'Ese objeto no tiene ranuras libres.', 's'); return; }
    const gid = gem.id;
    item.gm[hole] = gid;
    gem.qty--; if (gem.qty <= 0) p.inv[gs] = null;
    this.msgC(p, `Engarzas ${ITEMS[gid].name} en ${I.nameOf(item)}.`, ITEMS[gid].col);
    p.vis = null; this.recalc(p);
    p.dirty.inv = true; p.dirty.stats = true;
  }

  unsocketGem(p, m) {
    if (!this.canSocket(p)) return;
    const item = this.gearRef(p, m.from, m.at);
    const hole = m.hole | 0, gid = item && item.gm[hole];
    if (!gid) return;
    if (p.gold < CFG.GEM_REMOVE_COST) { this.msg(p, `Sacar una gema cuesta ${CFG.GEM_REMOVE_COST} de oro.`, 's'); return; }
    if (this.giveItem(p, gid, 1) > 0) { this.msg(p, 'Tu inventario está lleno.', 's'); return; }
    p.gold -= CFG.GEM_REMOVE_COST;
    item.gm[hole] = null;
    this.msgC(p, `Sacas ${ITEMS[gid].name} de ${I.nameOf(item)}.`, ITEMS[gid].col);
    p.vis = null; this.recalc(p);
    p.dirty.inv = true; p.dirty.stats = true;
  }

  /* ============================ COMERCIO ENTRE JUGADORES ============================ */
  sendTrade(p) {
    const t = p.trade;
    if (!t) return;
    this.send(p, {
      t: 'trade', with: { id: t.w.id, name: t.w.name },
      me: { offer: t.offer.map(I.pack), gold: t.gold, ok: t.ok },
      you: { offer: t.w.trade.offer.map(I.pack), gold: t.w.trade.gold, ok: t.w.trade.ok },
    });
  }

  tradeTouch(p) { const t = p.trade; t.ok = false; t.w.trade.ok = false; this.sendTrade(p); this.sendTrade(t.w); }

  tradeRequest(p, id) {
    const q = this.ents.get(id | 0);
    if (!q || q.kind !== 'pl' || q === p || !q.ws) return;
    if (p.trade || q.trade) { this.msg(p, 'Alguno de los dos ya está comerciando.', 's'); return; }
    if (cheb(p.x, p.y, q.x, q.y) > CFG.TRADE_RANGE) { this.msg(p, `Acércate más a ${q.name} para comerciar.`, 's'); return; }
    if (this.now < p.pvpLock || this.now < q.pvpLock) { this.msg(p, 'No se puede comerciar durante un combate.', 's'); return; }
    q.tradeInv = { from: p.id, exp: this.now + CFG.TRADE_INVITE_MS };
    this.send(q, { t: 'trade_inv', from: p.id, name: p.name });
    this.msg(p, `Invitación de comercio enviada a ${q.name}.`, 's');
  }

  tradeAccept(p, id) {
    const inv = p.tradeInv, q = this.ents.get(id | 0);
    if (!inv || inv.from !== (id | 0) || this.now > inv.exp) { this.msg(p, 'La invitación ya caducó.', 's'); return; }
    p.tradeInv = null;
    if (!q || q.kind !== 'pl' || !q.ws || q.trade || p.trade) return;
    if (cheb(p.x, p.y, q.x, q.y) > CFG.TRADE_RANGE) { this.msg(p, `Acércate más a ${q.name} para comerciar.`, 's'); return; }
    p.trade = { w: q, offer: [], gold: 0, ok: false };
    q.trade = { w: p, offer: [], gold: 0, ok: false };
    this.sendTrade(p); this.sendTrade(q);
  }

  /** Cancela el comercio en curso y devuelve a cada uno lo que había puesto en la oferta. */
  tradeCancel(p, why) {
    const t = p.trade;
    if (!t) return;
    for (const side of [p, t.w]) {
      const tr = side.trade;
      if (!tr) continue;
      for (const it of tr.offer) {
        const left = I.putInto(side.inv, it);
        if (left > 0) this.addGround(it.id, left, side.x, side.y, I.isGear(it.id) ? { inst: it } : {});
      }
      side.gold += tr.gold;
      side.trade = null; side.dirty.inv = true;
      this.send(side, { t: 'trade_end' });
      if (why) this.msg(side, why, 's');
    }
  }

  tradeAdd(p, slot, qty) {
    const t = p.trade, it = p.inv[slot];
    if (!t || !it) return;
    const stackable = !I.isGear(it.id);
    if (t.offer.length >= CFG.TRADE_MAX_ITEMS && !(stackable && t.offer.some((o) => o.id === it.id))) { this.msg(p, `Máximo ${CFG.TRADE_MAX_ITEMS} objetos por oferta.`, 's'); return; }
    let moved;
    if (!stackable) { p.inv[slot] = null; moved = it; }
    else {
      qty = Math.max(1, Math.min(it.qty, qty || it.qty));
      it.qty -= qty; if (it.qty <= 0) p.inv[slot] = null;
      moved = { id: it.id, qty };
    }
    const ex = stackable && t.offer.find((o) => o.id === moved.id);
    if (ex) ex.qty += moved.qty; else t.offer.push(moved);
    p.dirty.inv = true;
    this.tradeTouch(p);
  }

  tradeRemove(p, i) {
    const t = p.trade, it = t && t.offer[i | 0];
    if (!it) return;
    const left = I.putInto(p.inv, it);
    if (left > 0) { this.msg(p, 'Tu inventario está lleno.', 's'); if (left < it.qty) it.qty = left; }
    else t.offer.splice(i | 0, 1);
    p.dirty.inv = true;
    this.tradeTouch(p);
  }

  tradeGold(p, g) {
    const t = p.trade;
    if (!t) return;
    const total = p.gold + t.gold;
    g = Math.max(0, Math.min(total, Math.floor(Number(g) || 0)));
    p.gold = total - g; t.gold = g;
    p.dirty.inv = true;
    this.tradeTouch(p);
  }

  tradeConfirm(p) {
    const t = p.trade;
    if (!t) return;
    t.ok = true;
    if (t.w.trade.ok) this.tradeExecute(p, t.w);
    else { this.sendTrade(p); this.sendTrade(t.w); }
  }

  tradeExecute(a, b) {
    const ta = a.trade, tb = b.trade;
    const simA = a.inv.map(I.clone), simB = b.inv.map(I.clone);
    let full = false;
    for (const it of tb.offer) if (I.putInto(simA, it) > 0) full = true;
    for (const it of ta.offer) if (I.putInto(simB, it) > 0) full = true;
    if (full) { this.tradeCancel(a, 'Comercio cancelado: a alguno no le cabe lo que recibiría. Liberen espacio.'); return; }
    for (const it of tb.offer) this.giveInst(a, it);
    for (const it of ta.offer) this.giveInst(b, it);
    a.gold += tb.gold; b.gold += ta.gold;
    a.trade = null; b.trade = null;
    for (const [me, other, got] of [[a, b, tb], [b, a, ta]]) {
      me.dirty.inv = true;
      this.send(me, { t: 'trade_end', done: 1 });
      const list = got.offer.map((it) => `${it.qty > 1 ? it.qty + 'x ' : ''}${I.nameOf(it)}`).concat(got.gold ? [got.gold + ' de oro'] : []);
      this.msg(me, `Comercio completado con ${other.name}. Recibes: ${list.length ? list.join(', ') : 'nada'}.`, 's');
    }
  }

  castHeal(p) {
    const now = this.now;
    if (now < p.nextSpell) { this.msgThrottle(p, 'spcd', `Curar se recarga: ${Math.ceil((p.nextSpell - now) / 1000)} s.`); return; }
    const cost = 25;
    if (p.mana < cost) { this.msgThrottle(p, 'mana', 'No tienes suficiente maná.'); return; }
    if (p.hp >= p.maxHp) return;
    const h = Math.min(p.maxHp - p.hp, CFG.HEAL_AMOUNT);                 // curación fija de 200
    p.mana -= cost; p.hp += h; p.nextSpell = now + CFG.HEAL_CD_MS;
    this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + h, c: 'g' });
    this.fx.push({ k: 'h', x: p.x, y: p.y });
    this.addSkillXp(p, 'magic', 8);
  }

  /* ============================ COMBATE ============================ */
  canPvp(a, b) {
    return zoneAt(a.x, a.y).pvp && zoneAt(b.x, b.y).pvp && a.level >= CFG.PVP_MIN_LEVEL && b.level >= CFG.PVP_MIN_LEVEL;
  }

  explainNoPvp(p, t) {
    if (!zoneAt(p.x, p.y).pvp || !zoneAt(t.x, t.y).pvp) this.msgThrottle(p, 'pvp', 'Zona segura: aquí no se puede atacar a otros jugadores.');
    else this.msgThrottle(p, 'pvp', `Protección de novato: el PvP solo funciona entre jugadores de nivel ${CFG.PVP_MIN_LEVEL} o más.`);
  }

  addSkillXp(p, style, amt) {
    const before = skillFromXp(p.sxp[style]);
    p.sxp[style] = Math.min(skillXpFor(SKILL_MAX), p.sxp[style] + amt);       // tope: nivel 320
    const after = skillFromXp(p.sxp[style]);
    if (after > before) this.msg(p, `¡Tu habilidad de ${SKILL_NAMES[style]} sube al nivel ${after}!`, 's');
    p.dirty.stats = true;
  }

  gainXp(p, xp) {
    const before = p.level;
    p.xp = Math.min(xpForLevel(LEVEL_MAX), p.xp + xp);   // experiencia congelada al nivel máximo
    this.recalc(p);
    this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + xp + ' xp', c: 'x' });
    if (p.level > before) {
      p.hp = p.maxHp; p.mana = p.maxMana;
      this.fx.push({ k: 'l', x: p.x, y: p.y });
      this.msg(p, `¡Has subido al nivel ${p.level}! Tu vida y maná se han restaurado.`, 's');
    }
    p.dirty.stats = true;
  }

  hurtPlayer(p, raw, src, now, srcName) {
    const def = this.defOf(p);
    const dmg = Math.max(1, raw - Math.floor(Math.random() * (def + 1)));
    p.hp -= dmg;
    this.fx.push({ k: 'd', x: p.x, y: p.y, v: dmg, c: 'p' });
    if (p.hp <= 0) this.killPlayer(p, src, srcName, now);
    return dmg;
  }

  hurtMonster(m, dmg, p, now) {
    if (p && p.kind === 'pl' && !sameRealm(m, p)) return;
    if (m.def.armor) dmg = Math.max(1, Math.round(dmg * (1 - m.def.armor)));   // defensa: reduce todo el daño recibido
    m.hp -= dmg;
    this.fx.push({ k: 'd', x: m.x, y: m.y, v: dmg, c: 'h' });
    const e = m.dmgBy.get(p.id);
    if (e) { e.dmg += dmg; e.t = now; } else m.dmgBy.set(p.id, { dmg, t: now });
    if (!m.target) m.target = p.id;
    if (m.hp <= 0) this.killMonster(m, now);
  }

  killMonster(m, now) {
    const def = m.def;
    m.dead = true; m.hp = 0; m.target = null;
    this.mgrid.delete(kxy(m.x, m.y));
    m.respawnAt = now + def.respawn * (0.8 + Math.random() * 0.4);
    let total = 0, top = null, topDmg = -1;
    const parts = [];
    for (const [pid, e] of m.dmgBy) {
      if (now - e.t > 120000) continue;
      const pl = this.ents.get(pid);
      if (!pl || pl.kind !== 'pl') continue;
      parts.push([pl, e.dmg]); total += e.dmg;
      if (e.dmg > topDmg) { topDmg = e.dmg; top = pl; }
    }
    for (const [pl, dmg] of parts) {
      const xp = Math.max(1, Math.round(def.exp * CFG.XP_RATE * dmg / total));
      this.gainXp(pl, xp);
    }
    // botín
    const zone = zoneAt(m.x, m.y);
    const opts = !zone.pvp && top ? { prot: now + CFG.LOOT_PROTECT_MS, owner: top.id } : {};
    if ((def.shared || def.boss) && parts.length) {
      // botín compartido: cada participante tira por su cuenta; quien más daño hizo tiene mejor suerte
      const gold = rnd(def.gold[0], def.gold[1]);
      for (const [pl, dmg] of parts) {
        if (dmg < total * 0.01) continue;
        const share = dmg / total, f = (0.3 + 0.7 * dmg / topDmg) * (pl === top ? 1.6 : 1);
        const o = { prot: now + CFG.LOOT_PROTECT_MS, owner: pl.id };
        const g = Math.round(gold * Math.max(0.1, share) * (pl === top ? 1.3 : 1));
        if (g > 0) this.addGround('gold', g, m.x, m.y, o);
        for (const [id, chance, qa, qb] of def.loot) {
          if (Math.random() >= Math.min(1, chance * f)) continue;
          if (I.isGear(id)) this.addGround(id, 1, m.x, m.y, Object.assign({ inst: I.rollGear(id, true) }, o));
          else this.addGround(id, rnd(qa, qb), m.x, m.y, o);
          if (this.logDrop) this.logDrop(pl, m.type, id);      // colección de jefes
        }
        if (this.sendCol) this.sendCol(pl);
        if (Math.random() < I.gemChance(def) * f) this.addGround(I.pickGem(def), 1, m.x, m.y, o);
        if (pl !== top) this.msg(pl, `Participaste contra ${def.name}: tienes tu propio botín en el suelo.`, 's');
      }
    } else {
    const gold = rnd(def.gold[0], def.gold[1]);
    if (gold > 0) this.addGround('gold', gold, m.x, m.y, opts);
    for (const [id, chance, a, b] of def.loot) {
      if (Math.random() >= chance) continue;
      if (I.isGear(id)) this.addGround(id, 1, m.x, m.y, Object.assign({ inst: I.rollGear(id, !!def.boss) }, opts));   // cada equipo trae su propia suerte (+N, Ancient, ranuras)
      else this.addGround(id, rnd(a, b), m.x, m.y, opts);
    }
    if (Math.random() < I.gemChance(def)) this.addGround(I.pickGem(def), 1, m.x, m.y, opts);
    }
    this.fx.push({ k: 'x', x: m.x, y: m.y });
    if (def.boss && top) this.broadcastChat(`¡${top.name} ha derrotado a ${def.name}!`, 'k');
    m.dmgBy.clear();
  }

  killPlayer(p, src, srcName, now) {
    const z = zoneAt(p.x, p.y);
    const lost = [];
    p.target = null; p.pend = null;
    this.tradeCancel(p, 'Comercio cancelado.');
    if (z.pvp) {
      p.inv.forEach((it, i) => {
        if (it && Math.random() < CFG.DEATH_ITEM_DROP) {
          this.addGround(it.id, it.qty, p.x, p.y, I.isGear(it.id) ? { inst: it } : {});
          lost.push(`${it.qty > 1 ? it.qty + 'x ' : ''}${I.nameOf(it)}`);
          p.inv[i] = null;
        }
      });
      for (const s of SLOTS) {
        if (p.eq[s] && Math.random() < CFG.DEATH_EQUIP_DROP) {
          this.addGround(p.eq[s].id, 1, p.x, p.y, { inst: p.eq[s] });
          lost.push(I.nameOf(p.eq[s]));
          p.eq[s] = null;
        }
      }
      p.vis = null;
      const g = Math.floor(p.gold * CFG.DEATH_GOLD_DROP);
      if (g > 0) { p.gold -= g; this.addGround('gold', g, p.x, p.y); lost.push(g + ' de oro'); }
      const floor = xpForLevel(p.level);
      p.xp = Math.max(floor, p.xp - Math.floor((p.xp) * CFG.DEATH_XP_LOSS));
    }
    if (src && src.kind === 'pl') {
      this.broadcastChat(`⚔️ ${src.name} ha derrotado a ${p.name} en ${z.name}.`, 'k');
      src.target = null;
    }
    this.fx.push({ k: 'x', x: p.x, y: p.y });
    p.x = SPAWN_POINT.x; p.y = SPAWN_POINT.y; p.tpSeq++;
    this.recalc(p);
    p.hp = Math.ceil(p.maxHp * 0.5); p.mana = Math.ceil(p.maxMana * 0.5);
    p.pvpLock = 0;
    this.send(p, { t: 'dead', by: srcName || 'algo', pvp: z.pvp, lost });
    p.dirty.inv = true; p.dirty.stats = true;
    if (p.ws) { this.sendInv(p); this.sendStats(p); p.dirty.inv = false; p.dirty.stats = false; }
  }

  doAttack(p, t, now) {
    const w = this.weaponOf(p);
    if (w.style === 'magic') {
      if (p.mana < w.mana) { p.nextAtk = now + 800; this.msgThrottle(p, 'mana', 'No tienes suficiente maná.'); return; }
      p.mana -= w.mana;
    }
    const skill = skillFromXp(p.sxp[w.style]);
    const gb = I.gearBonus(p.eq);
    let dmg = Math.round(w.atk * (0.55 + Math.random() * 0.45) * skillMult(skill) * (1 + 0.015 * (p.level - 1)));
    dmg = Math.max(1, dmg);
    let crit = 0;
    if (gb.crit > 0 && Math.random() < gb.crit) {           // Amatista: golpe crítico
      crit = 1; dmg = Math.round(dmg * 1.8);
      this.fx.push({ k: 'd', x: p.x, y: p.y, v: '¡CRÍTICO!', c: 'x' });
    }
    if (t.kind === 'pl') {
      if (!this.canPvp(p, t)) { p.target = null; this.explainNoPvp(p, t); return; }
      dmg = Math.max(1, Math.round(dmg * CFG.PVP_DMG_MULT));
      p.pvpLock = now + CFG.PVP_LOCK_MS;
      t.pvpLock = now + CFG.PVP_LOCK_MS;
    }
    p.nextAtk = now + w.cd;
    const wid = p.eq.weapon ? p.eq.weapon.id : null;
    if (w.style === 'melee') this.fx.push({ k: 's', x: t.x, y: t.y, w: wid, cr: crit, i: p.id });
    else this.fx.push({ k: 'p', x1: p.x, y1: p.y, x2: t.x, y2: t.y, s: w.style, w: wid, cr: crit });
    this.addSkillXp(p, w.style, 1 + Math.floor(dmg / 3));
    p.dir = Math.abs(t.x - p.x) >= Math.abs(t.y - p.y) ? (t.x > p.x ? 1 : 3) : (t.y > p.y ? 2 : 0);
    if (t.kind === 'pl') this.hurtPlayer(t, dmg, p, now, p.name);
    else this.hurtMonster(t, dmg, p, now);
    if (gb.steal > 0 && p.hp > 0 && p.hp < p.maxHp) {       // Ópalo: robo de vida
      const h = Math.min(p.maxHp - p.hp, Math.max(1, Math.round(dmg * gb.steal)));
      p.hp += h; this.fx.push({ k: 'd', x: p.x, y: p.y, v: '+' + h, c: 'g' });
    }
  }

  /* ============================ MOVIMIENTO DE JUGADORES ============================ */
  playerCanStep(p, x, y, now) {
    if (!world.isWalkable(x, y)) return false;
    if (this.mgrid.has(kxy(x, y)) || npcTiles.has(kxy(x, y))) return false;
    const zf = zoneAt(p.x, p.y), zt = zoneAt(x, y);
    if (zf.pvp && !zt.pvp && now < p.pvpLock) return false;
    return true;
  }

  tryStep(p, dx, dy, now) {
    let nx = p.x + dx, ny = p.y + dy;
    if (!this.playerCanStep(p, nx, ny, now)) {
      let ok = false;
      if (dx && dy) {   // deslizar por el eje libre
        if (this.playerCanStep(p, p.x + dx, p.y, now)) { nx = p.x + dx; ny = p.y; ok = true; }
        else if (this.playerCanStep(p, p.x, p.y + dy, now)) { nx = p.x; ny = p.y + dy; ok = true; }
      }
      if (!ok) {
        const zf = zoneAt(p.x, p.y), zt = zoneAt(nx, ny);
        if (zf.pvp && !zt.pvp && now < p.pvpLock && world.isWalkable(nx, ny)) this.msgThrottle(p, 'lock', '¡Estás en combate! No puedes entrar a una zona segura todavía.');
        return false;
      }
    }
    const sdx = nx - p.x, sdy = ny - p.y;
    p.x = nx; p.y = ny;
    p.dir = sdx > 0 ? 1 : sdx < 0 ? 3 : sdy > 0 ? 2 : 0;
    p.nextMove = now + CFG.STEP_MS * (sdx && sdy ? 1.35 : 1) * this.mountMult(p);
    this.pgrid.set(kxy(nx, ny), p);
    const portal = world.portalAt(nx, ny);
    if (portal) {
      if (now < p.pvpLock) { this.msgThrottle(p, 'lock', '¡Estás en combate! No puedes usar el portal todavía.'); }
      else {
        p.x = portal.tx; p.y = portal.ty; p.tpSeq++; p.target = null; p.pend = null;
        this.msg(p, `Cruzas el portal: ${zoneAt(p.x, p.y).name}.`, 's');
      }
    }
    this.pickup(p, false);
    return true;
  }

  chaseTarget(p, t, now) {
    const w = this.weaponOf(p);
    const range = w.range || 1;
    const goal = range === 1 ? (x, y) => cheb(x, y, t.x, t.y) <= 1 : (x, y) => dist(x, y, t.x, t.y) <= range - 0.4;
    const pass = (x, y) => this.playerCanStep(p, x, y, now) && world.tiles[kxy(x, y)] !== T.PORTAL;
    const step = this.bfsStep(p.x, p.y, goal, pass, 260) || this.greedyStep(p.x, p.y, t.x, t.y, pass);
    if (step) this.tryStep(p, step.dx, step.dy, now);
  }

  updatePlayer(p, now) {
    if (!p.ws && p.offlineUntil && now >= p.offlineUntil) { this.removePlayer(p); return; }
    if (p.trade) {
      const q = p.trade.w;
      if (!q.ws || cheb(p.x, p.y, q.x, q.y) > CFG.TRADE_RANGE + 3 || now < p.pvpLock || now < q.pvpLock) this.tradeCancel(p, 'Comercio cancelado: se alejaron o entraron en combate.');
    }
    // regeneración
    if (now >= p.nextRegen) {
      p.nextRegen = now + 1000;
      const town = zoneAt(p.x, p.y).kind === 'town';
      const mult = town ? 4 : 1;
      if (p.hp > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + Math.round((1 + p.level * 0.3) * mult));
      const ml = skillFromXp(p.sxp.magic);
      if (p.mana < p.maxMana) p.mana = Math.min(p.maxMana, p.mana + Math.round((1 + p.level * 0.25 + ml * 0.25) * mult));
    }
    // movimiento manual
    let moved = false;
    if (p.pend) {
      if (now > p.pend.exp) p.pend = null;
      else if (now >= p.nextMove) {
        const { dx, dy } = p.pend;
        if (p.pend.exp - now > 0) { moved = this.tryStep(p, dx, dy, now); }
        p.pend = null;   // cada orden es un paso; el cliente reenvía mientras la tecla siga pulsada
      }
    }
    // combate
    if (p.target) {
      const t = this.ents.get(p.target);
      if (!t || (t.kind === 'mo' && t.dead) || (t.kind === 'pl' && !t.ws && !t.offlineUntil) || cheb(p.x, p.y, t.x, t.y) > CFG.VIEW_X) { p.target = null; return; }
      if (!sameRealm(p, t)) { p.target = null; this.msgThrottle(p, 'realm', 'No puedes atacar a través de la entrada: entra a la mazmorra.'); return; }
      if (t.kind === 'pl' && !this.canPvp(p, t)) { p.target = null; this.explainNoPvp(p, t); return; }
      const w = this.weaponOf(p);
      const range = w.range || 1;
      const d = range === 1 ? cheb(p.x, p.y, t.x, t.y) : dist(p.x, p.y, t.x, t.y);
      const inRange = d <= (range === 1 ? 1 : range + 0.2);
      if (inRange) { if (now >= p.nextAtk) this.doAttack(p, t, now); }
      else if (!moved && !p.pend && now >= p.nextMove) this.chaseTarget(p, t, now);
    }
  }

  /* ============================ BUCLE PRINCIPAL ============================ */
  tick(now = Date.now()) {
    this.now = now; this.tickN++;
    this.pgrid.clear();
    for (const p of this.players.values()) this.pgrid.set(kxy(p.x, p.y), p);
    for (const p of [...this.players.values()]) this.updatePlayer(p, now);
    for (const m of this.monsters) this.updateMonster(m, now);
    this.tickExt(now);
    if (this.tickN % 40 === 0) {
      for (const g of [...this.ground.values()]) if (now >= g.exp) this.removeGround(g);
    }
    // desconectados en combate: ya no hay nadie que reciba su cambio de inventario
    for (const p of this.players.values()) {
      if (p.dirty.inv && p.ws) { p.dirty.inv = false; this.sendInv(p); p.dirty.stats = true; }
      if (p.dirty.stats && p.ws) { p.dirty.stats = false; this.sendStats(p); }
    }
    if (this.tickN % CFG.SNAP_EVERY === 0) {
      for (const p of this.players.values()) this.sendSnapshot(p);
      this.fx.length = 0;
    }
    if (now - this.lastSave > CFG.AUTOSAVE_MS) {
      this.lastSave = now;
      for (const p of this.players.values()) this.savePlayer(p);
    }
  }

  saveAll() { for (const p of this.players.values()) this.savePlayer(p); this.store.flush(); }
}

require('./ext')(Game);
require('./fishing').install(Game);
module.exports = { Game, NAME_RE, levelFromXp, xpForLevel, skillFromXp };
