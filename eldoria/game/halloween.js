'use strict';
/**
 * EVENTO DE HALLOWEEN — el Rey Calabaza (Halloween King).
 * Cada cierto tiempo (30 min por defecto) el cielo se oscurece y caen truenos sobre la Ciudad de Aldea Real; 60 s después el Rey Calabaza aparece en la plaza.
 * Ataques (todos avisan antes y también alcanzan a quien esté dentro de la ciudad):
 *   1) Llamaradas moradas: llueven bolas de fuego morado por todo el cielo.
 *   2) Viento de fuego morado: muros de llamas cruzan la plaza de lado a lado.
 *   3) Calabazas explosivas: lanza calabazas por el mapa; paran, parpadean y estallan dejando fuego morado.
 *   4) Guadaña: tajo en círculo a su alrededor.
 * Botín (por participante): set del Rey Calabaza (calabaza, casaca, guantes, pantalón, botas, collar, 2 anillos) y la Guadaña del Rey Halloween.
 * Variables: HALLOWEEN_MIN (cada cuántos minutos, 30), HALLOWEEN_FIRST_MIN (primer aviso tras arrancar, 4), HALLOWEEN_EVENT=0 (desactiva), HALLOWEEN_ADMIN (nombres que pueden usar /halloween).
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const CITY = [90, 66];                                   // centro de la Ciudad de Aldea Real

/** [id, nombre, sprite, tipo, nivel, def, bonus, probabilidad] */
const PIECES = [
  ['hw_yelmo',    'Calabaza del Rey de Halloween',  'hw_helm',  'head',   110, 70, { hp: 420, atk: 9, crit: 0.03 }, 0.06],
  ['hw_peto',     'Casaca del Rey de Halloween',    'hw_chest', 'body',   110, 92, { hp: 620, atk: 17 }, 0.05],
  ['hw_guantes',  'Guantes del Rey Calabaza',       'hw_glove', 'gloves', 108, 36, { hp: 200, atk: 15, crit: 0.02 }, 0.06],
  ['hw_pantalon', 'Pantalón de la Cadena Calavera', 'hw_leg',   'legs',   108, 52, { hp: 340, atk: 12 }, 0.06],
  ['hw_botas',    'Botas del Rey Calabaza',         'hw_boot',  'boots',  108, 42, { hp: 240, atk: 9 }, 0.06],
];
const JEWELS = [
  ['hw_amuleto', 'Collar de la Calavera Dorada', 'hw_amulet', 'amulet', 110, { hp: 600, mana: 180, atk: 16, crit: 0.04 }, 0.05],
  ['hw_anillo',  'Anillo Calavera del Rey',      'hw_ring',   'ring',   110, { atk: 19, hp: 260, mana: 100, crit: 0.03 }, 0.05],
  ['hw_anillo2', 'Anillo Mandíbula Maldita',     'hw_ring2',  'ring',   108, { atk: 17, hp: 240, mana: 90, crit: 0.03 }, 0.05],
];
const SCYTHE = ['hw_guadana', 'Guadaña del Rey de Halloween', 'hw_scythe', 'melee', 112, 255, 1100, 'dark', 0.03];
const ICON = { head: '🎃', body: '🛡️', gloves: '🧤', legs: '👖', boots: '🥾', ring: '💍', amulet: '📿' };
const LOOT_IDS = [...PIECES.map((p) => [p[0], p[7]]), ...JEWELS.map((p) => [p[0], p[6]]), [SCYTHE[0], SCYTHE[8]]];

function build(ITEMS, MONSTERS) {
  const sell = (L, k) => Math.round(8 + L * L * 3.4) * k;
  for (const [id, name, spr, type, L, def, bonus] of PIECES) ITEMS[id] = { name, icon: ICON[type], spr, type, def, bonus, halloween: 1, minLevel: L, sell: sell(L, 5) };
  for (const [id, name, spr, type, L, bonus] of JEWELS) ITEMS[id] = { name, icon: ICON[type], spr, type, bonus, halloween: 1, minLevel: L, sell: sell(L, 5) };
  { const [id, name, spr, style, L, atk, cd, el] = SCYTHE; ITEMS[id] = { name, icon: '🪓', spr, type: 'weapon', style, atk, cd, range: 1, el, halloween: 1, minLevel: L, sell: sell(L, 8) }; }
  ITEMS.trofeo_halloween = { name: 'Calabaza Maldita del Rey', icon: '🎃', type: 'misc', stack: true, sell: 40000 };
  MONSTERS.halloween_king = {
    name: 'Rey de Halloween', icon: '🎃', lv: 820, hp: 650000, dmg: [320, 520], dmgK: 2.6, exp: 150000, move: 600, atkCd: 1400, aggro: 22, respawn: 999999999, armor: 0.5, shared: true, boss: true, special: 'halloween',
    gold: [0, 0], loot: [['trofeo_halloween', 1, 1, 1], ['pluma_fenix', 1, 1, 2]], spr: 'halloween_king',
  };
  for (const [id, ch] of LOOT_IDS) MONSTERS.halloween_king.loot.push([id, ch, 1, 1]);
}

/* ============================== evento y jefe (servidor) ============================== */
function install(Game) {
  const P = Game.prototype;
  const I = require('./items');
  const EVERY = (parseFloat(process.env.HALLOWEEN_MIN) || 30) * 60000, FIRST = (parseFloat(process.env.HALLOWEEN_FIRST_MIN) || 4) * 60000;
  const ENABLED = process.env.HALLOWEEN_EVENT !== '0', MINS = 15, WARN = 60000;
  const admins = () => (process.env.HALLOWEEN_ADMIN || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  const { MONSTERS, ITEMS } = require('./data');

  const online = (g) => [...g.players.values()].filter((q) => q.ws);
  const sendAll = (g, msg) => { for (const q of online(g)) g.send(q, msg); };
  const spawnPoint = (g) => (g.findArena ? g.findArena(CITY[0], CITY[1]) : CITY);

  /* ---------- estado ---------- */
  P.hwTick = function (now) {
    if (!ENABLED) return;
    const h = this.hw || (this.hw = { state: 'idle', next: now + FIRST, boss: null, nextBolt: 0 });
    const ons = online(this);
    if (h.state === 'idle') {
      if (now < h.next) return;
      if (!ons.length) { h.next = now + 3 * 60000; return; }
      this.hwStart(now);
    } else if (h.state === 'warn') {
      if (now >= h.nextBolt) { this.hwBolt(h.at[0] + rnd(-26, 26), h.at[1] + rnd(-17, 17), 0); h.nextBolt = now + rnd(500, 1500) / (1 + (now - h.warnAt) / WARN); }
      if (now >= h.spawnAt) this.hwSpawn(now);
    } else if (h.state === 'active') {
      const m = h.boss;
      if (!m || m.dead) { this.hwEnd(now, false); return; }
      if (now >= h.ends) { this.hwEnd(now, false, true); return; }
      if (now >= h.nextBolt) { this.hwBolt(h.at[0] + rnd(-24, 24), h.at[1] + rnd(-15, 15), 0); h.nextBolt = now + rnd(3500, 8000); }
    }
  };
  P.hwBolt = function (x, y, big) { this.fx.push({ k: 'hw_bolt', x, y, big }); };
  P.hwStart = function (now) {
    const h = this.hw, at = spawnPoint(this); h.at = at; h.state = 'warn'; h.warnAt = now; h.spawnAt = now + WARN; h.nextBolt = now;
    const zn = world.zoneAt(at[0], at[1]).name;
    this.broadcastChat(`🎃 ¡El cielo se oscurece sobre ${zn}! El Rey de Halloween despertará en 60 segundos.`, 'k');
    sendAll(this, { t: 'hw', k: 'dark', secs: 60, x: at[0], y: at[1] });
    sendAll(this, { t: 'event', k: 'warn', secs: 60, x: at[0], y: at[1], ic: '🎃', text: `El Rey de Halloween despierta en 60 s (${zn}).` });
  };
  P.hwSpawn = function (now) {
    const h = this.hw, at = h.at, n = Math.max(1, online(this).length);
    this.hwBolt(at[0], at[1], 1);
    const m = this.spawnMonster('halloween_king', at[0], at[1]);
    m.maxHp = m.hp = Math.round(MONSTERS.halloween_king.hp * (1 + 0.35 * (n - 1))); m.noRespawn = true; m.respawnAt = Infinity; m.hwRun = true; m.sx = m.x; m.sy = m.y;
    m.shieldUntil = now + 5000; m.nextSp = now + 6000; m.nextMove = m.nextAtk = now + 5000;
    h.boss = m; h.state = 'active'; h.ends = now + MINS * 60000; h.nextBolt = now + 4000;
    const zn = world.zoneAt(m.x, m.y).name;
    this.broadcastChat(`🎃 ¡El Rey de Halloween ha despertado en ${zn}! Tenéis ${MINS} minutos para derrotarlo.`, 'k');
    sendAll(this, { t: 'event', k: 'start', x: m.x, y: m.y, ic: '🎃', text: `¡El Rey de Halloween ha despertado en ${zn}!` });
    sendAll(this, { t: 'hw', k: 'fight' });
  };
  P.hwEnd = function (now, killed, timeout) {
    const h = this.hw; if (!h) return;
    const m = h.boss;
    if (m && !m.dead) { this.mgrid.delete(m.y * world.W + m.x); this.monsters = this.monsters.filter((q) => q !== m); this.ents.delete(m.id); }
    h.boss = null; h.state = 'idle'; h.next = now + EVERY;
    sendAll(this, { t: 'hw', k: 'off' });
    if (timeout) { this.broadcastChat('🎃 El Rey de Halloween se desvaneció entre la niebla… volverá.', 'k'); sendAll(this, { t: 'event', k: 'end', ic: '🎃', text: 'El Rey de Halloween se desvaneció.' }); }
    else if (killed) sendAll(this, { t: 'event', k: 'end', ic: '🎃', text: '¡El Rey de Halloween ha caído!' });
  };

  /* ---------- botín ---------- */
  P.hwRewards = function (m, parts, total) {
    const need = total * 0.02, ranked = parts.slice().sort((a, b) => b[1] - a[1]), names = ranked.slice(0, 3).map((q) => `${q[0].name} (${q[1]})`).join(', ');
    this.broadcastChat(`🏆 ¡El Rey de Halloween ha caído! Mayor daño: ${names}.`, 'k');
    ranked.forEach(([pl, dmg], rank) => {
      if (dmg < need) return;
      pl.ext.events = (pl.ext.events || 0) + 1;
      const gold = 5000 + pl.level * 100; pl.gold += gold; this.gainXp(pl, 12000);
      this.giveOrDrop(pl, 'trofeo_halloween', 1); this.giveOrDrop(pl, 'pluma_fenix', rnd(1, 2));
      this.msgC(pl, `🎃 Recompensa del Rey de Halloween: +${gold} de oro, 12000 xp y una Calabaza Maldita.`, '#ffb040');
      const k = rank < 3 ? 1.5 : 1;                                                    // los tres que más daño hicieron tienen más suerte
      for (const [id, ch] of LOOT_IDS) {
        if (Math.random() >= ch * k) continue;
        this.giveOrDropInst(pl, I.rollGear(id, true)); if (this.logDrop) this.logDrop(pl, 'halloween_king', id);
        this.msgC(pl, `🎃✨ ¡Botín del Rey: ${ITEMS[id].name}!`, '#c58bff');
        this.broadcastChat(`🎃 ¡${pl.name} ha conseguido ${ITEMS[id].name}!`, 'k');
      }
      pl.dirty.inv = true; if (this.sendCol) this.sendCol(pl); if (this.checkAch) this.checkAch(pl);
    });
  };
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    if (!m.hwRun) return K0.call(this, m, now);
    const parts = []; let total = 0;
    for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) { parts.push([pl, e.dmg]); total += e.dmg; } }
    const real = m.def; m.def = Object.assign({}, real, { loot: [], gold: [0, 0] });
    try { K0.call(this, m, now); } finally { m.def = real; }
    this.hwRewards(m, parts, total);
    this.hwEnd(now, true);
  };
  const L0 = P.onLogin;
  P.onLogin = function (p) {
    L0.call(this, p);
    const h = this.hw; if (!h) return;
    if (h.state === 'warn') this.send(p, { t: 'hw', k: 'dark', secs: Math.max(1, Math.round((h.spawnAt - this.now) / 1000)), x: h.at[0], y: h.at[1] });
    else if (h.state === 'active') { this.send(p, { t: 'hw', k: 'dark', secs: 1, x: h.at[0], y: h.at[1] }); this.send(p, { t: 'hw', k: 'fight' }); }
  };

  /* ---------- ataques del jefe ---------- */
  const near = (g, cx, cy, r) => [...g.players.values()].filter((q) => q.hp > 0 && Math.hypot(q.x - cx, q.y - cy) <= r);
  P.hwAI = function (m, now) {
    if (!m.hwRun || m.dead) return;
    if (m.lpx !== undefined && m.x !== m.lpx) m.lf = m.x < m.lpx ? -1 : 1; m.lpx = m.x;
    if (now < (m.nextSp || 0) || m.shieldUntil > now) return;
    const tg = near(this, m.x, m.y, 30); if (!tg.length) { m.nextSp = now + 1000; return; }
    const enr = m.hp < m.maxHp * 0.35, K = enr ? 1.25 : 1;
    const order = ['rain', 'bomb', 'wind', 'scythe', 'bomb', 'rain', 'wind', 'bomb'], kind = order[(m.spN || 0) % order.length]; m.spN = (m.spN || 0) + 1;
    const alive = () => !m.dead && this.hw && this.hw.boss === m;
    const hit = (q, lo, hi, tag) => this.hurtPlayer(q, Math.round(rnd(lo, hi) * K), m, this.now, tag);
    const cx = m.x, cy = m.y;
    let dur = 2500;
    if (kind === 'rain') {                                                // llamaradas moradas que caen del cielo
      const waves = enr ? 4 : 3; dur = waves * 900 + 1200;
      for (let w = 0; w < waves; w++) this.later(w * 900, () => {
        if (!alive()) return;
        const live = near(this, cx, cy, 30), n = 7 + w * 3 + Math.min(6, live.length), spots = [];
        for (let i = 0; i < n; i++) { const q = live[i]; spots.push(q && i < 4 ? [q.x + rnd(-1, 1), q.y + rnd(-1, 1)] : [cx + rnd(-23, 23), cy + rnd(-15, 15)]); }
        for (const [x, y] of spots) this.fx.push({ k: 'hw_fw', x, y, r: 1.7, ms: 1000 });
        this.later(1000, () => { if (!alive()) return; for (const [x, y] of spots) { this.fx.push({ k: 'hw_fh', x, y, r: 1.7 }); for (const q of near(this, x, y, 1.7)) hit(q, 340, 520, 'Llamarada morada'); } });
      });
    } else if (kind === 'wind') {                                         // viento de fuego morado: muros de llamas que cruzan la plaza
      const horiz = (m.spN % 2) === 0, span = 28, half = 13, W = 2.2, T = 3400; dur = T + 1600;
      const lanes = [[-1, 0], [1, 1300]];
      for (const [dir, delay] of lanes) {
        const a = horiz ? cx - dir * span : cy - dir * span, b = horiz ? cx + dir * span : cy + dir * span;
        const f = { k: 'hw_ww', x: horiz ? a : cx, y: horiz ? cy : a, x2: horiz ? b : cx, y2: horiz ? cy : b, half, w: W, ms: 1300 + delay };
        this.later(delay, () => { if (alive()) this.fx.push(Object.assign({}, f, { ms: 1300 })); });
        this.later(delay + 1300, () => {
          if (!alive()) return;
          this.fx.push({ k: 'hw_wind', x: f.x, y: f.y, x2: f.x2, y2: f.y2, half, w: W, ms: T });
          const steps = Math.round(T / 250);
          for (let i = 1; i <= steps; i++) this.later(i * 250, () => {
            if (!alive()) return;
            const u = i / steps, p = a + (b - a) * u;
            for (const q of near(this, cx, cy, 40)) { const along = horiz ? q.x : q.y, side = horiz ? q.y : q.x, mid = horiz ? cy : cx; if (Math.abs(along - p) <= W && Math.abs(side - mid) <= half) hit(q, 120, 190, 'Viento de fuego morado'); }
          });
        });
      }
      dur = 1300 + 1300 + T;
    } else if (kind === 'bomb') {                                         // calabazas explosivas lanzadas por el mapa
      const n = Math.min(16, 7 + tg.length + (enr ? 3 : 0)); dur = 2800;
      for (let i = 0; i < n; i++) {
        const q = tg[i % tg.length], fromP = i < Math.min(3, tg.length), x = fromP ? q.x + rnd(-2, 2) : cx + rnd(-23, 23), y = fromP ? q.y + rnd(-2, 2) : cy + rnd(-15, 15);
        const fly = 800 + rnd(0, 300), fuse = 1600 + rnd(0, 800), delay = i * 120;
        this.later(delay, () => {
          if (!alive()) return;
          this.fx.push({ k: 'hw_pk', x1: cx, y1: cy - 2, x2: x, y2: y, fly, fuse, r: 2.5 });
          this.later(fly + fuse, () => {
            if (!alive()) return;
            this.fx.push({ k: 'hw_pkx', x, y, r: 2.5 });
            for (const z of near(this, x, y, 2.5)) hit(z, 520, 780, 'Calabaza explosiva');
            this.fx.push({ k: 'hw_pool', x, y, r: 1.7, ms: 4000 });
            for (let s = 1; s <= 4; s++) this.later(s * 1000, () => { for (const z of near(this, x, y, 1.7)) hit(z, 70, 110, 'Fuego morado'); });
          });
        });
      }
    } else {                                                              // guadaña: tajo en círculo
      const R = 6; dur = 2200;
      this.fx.push({ k: 'hw_sw', x: cx, y: cy, r: R, ms: 1300 });
      this.later(1300, () => { if (!alive()) return; this.fx.push({ k: 'hw_sh', x: cx, y: cy, r: R }); for (const q of near(this, cx, cy, R)) hit(q, 800, 1100, 'Guadaña del Rey'); });
    }
    this.fx.push({ k: 'hw_cast', id: m.id, kind, T: kind === 'wind' ? 1300 : kind === 'scythe' ? 1300 : 1000 });
    m.nextSp = now + dur + (enr ? 1500 : 3000) + Math.random() * 1500;
    m.nextMove = Math.max(m.nextMove, now + 1500); m.nextAtk = Math.max(m.nextAtk, now + 1500);
  };

  /* ---------- enganches ---------- */
  const T0 = P.tickExt;
  P.tickExt = function (now) { T0.call(this, now); this.hwTick(now); };
  const C0 = P.chatExt;
  P.chatExt = function (p, text) {
    const m = /^\/halloween(?:\s+(\S+))?/i.exec(text);
    if (m) {
      if (!admins().includes(p.name.toLowerCase()) && process.env.HALLOWEEN_OPEN !== '1') { this.msg(p, 'Solo los administradores pueden usar /halloween.', 's'); return true; }
      const h = this.hw || (this.hw = { state: 'idle', next: 0, boss: null, nextBolt: 0 }), a = (m[1] || '').toLowerCase();
      if (a === 'parar') { if (h.state !== 'idle') { this.hwEnd(this.now, false, true); } this.msg(p, 'Evento de Halloween detenido.', 's'); }
      else if (h.state !== 'idle') this.msg(p, 'El evento de Halloween ya está en marcha.', 's');
      else { h.next = 0; this.msg(p, '🎃 Evento de Halloween convocado.', 's'); }
      return true;
    }
    return C0.call(this, p, text);
  };
}

module.exports = { build, install, PIECES, JEWELS, SCYTHE, LOOT_IDS };
