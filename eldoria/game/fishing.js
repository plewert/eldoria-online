'use strict';
/**
 * Pesca: caña + cebo, lanzar a una casilla de agua, esperar la picada y recoger el pez con un minijuego de
 * temporización (barra con zona verde y marcador). Habilidad propia (nivel 1-320), peces por zona, cañas
 * mejores, tesoros raros y registro de capturas. Todo es del servidor: la posición del marcador depende del tiempo.
 */
const { skillFromXp, skillXpFor } = require('./skills');       // data y world se piden dentro de install() (evita dependencia circular)

const FISH_MAX = 320, XP_SCALE = 20;                       // la pesca cuesta 1/20 de la experiencia de un combate
const fishLevel = (xp) => Math.min(FISH_MAX, skillFromXp(Math.max(0, xp) * XP_SCALE));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// pez: nivel mínimo, experiencia, dificultad (estrecha la zona verde y acelera el marcador)
const FISH = {
  sardina: { lvl: 1,   xp: 15,  diff: 0.00 },
  salmon:  { lvl: 30,  xp: 40,  diff: 0.08 },
  atun:    { lvl: 60,  xp: 90,  diff: 0.16 },
  tiburon: { lvl: 100, xp: 200, diff: 0.28 },
};
// peces por zona: [pez, peso]. Las zonas no listadas no tienen peces.
const ZONE_FISH = {
  prado:   { name: 'Ríos y lagos del prado',  fish: [['sardina', 60], ['salmon', 6]] },
  colinas: { name: 'Lagos de las colinas',    fish: [['sardina', 60], ['salmon', 8]] },
  pantano: { name: 'Aguas del pantano',       fish: [['sardina', 70], ['salmon', 5]] },
  dunas:   { name: 'Oasis de las dunas',      fish: [['sardina', 70], ['salmon', 6]] },
  sabana:  { name: 'Charcas de la sabana',    fish: [['sardina', 55], ['salmon', 12]] },
  bosque:  { name: 'Ríos del norte',          fish: [['sardina', 30], ['salmon', 40]] },
  cumbres: { name: 'Ríos de las cumbres',     fish: [['sardina', 20], ['salmon', 55]] },
  selva:   { name: 'Ríos de la selva',        fish: [['sardina', 20], ['salmon', 55]] },
  playa:   { name: 'Costa y mar abierto',     fish: [['sardina', 30], ['atun', 35], ['tiburon', 8]] },
  volcan:  { name: 'Mar del volcán (peligroso)', fish: [['atun', 40], ['tiburon', 18]], danger: 1 },
};
// cañas: nivel de pesca para usarla, espera (más bajo = más rápido) y bonus a la zona verde
const RODS = {
  cana_madera: { name: 'Caña de Trucha',        spr: 'r_trucha',   req: 1,   wait: 1.0,  bar: 0,    price: 150 },       // amarilla
  cana_carpa:  { name: 'Caña de Carpa',         spr: 'r_carpa',    req: 15,  wait: 0.92, bar: 0.02, price: 700 },       // azul
  cana_hierro: { name: 'Caña Fly Fishing',      spr: 'r_fly',      req: 25,  wait: 0.85, bar: 0.04, price: 1800 },      // amarilla
  cana_hielo:  { name: 'Caña de Hielo',         spr: 'r_hielo',    req: 40,  wait: 0.78, bar: 0.06, price: 3800 },      // azul
  cana_acero:  { name: 'Caña de Surf Casting',  spr: 'r_surf',     req: 60,  wait: 0.70, bar: 0.08, price: 7000 },      // azul
  cana_jade:   { name: 'Caña de Mar Profundo',  spr: 'r_profundo', req: 120, wait: 0.55, bar: 0.12, price: 24000 },     // amarilla premium
};
const BAITS = { cebo: { rare: 1.6, wait: 0.7 }, cebo_dorado: { rare: 2.6, wait: 0.5 } };
const SLACK = 0.06, BITE_MS = 2600;

function build(ITEMS_, SHOPS) {
  for (const f of ['sardina', 'salmon', 'tiburon']) if (ITEMS_[f]) ITEMS_[f].spr = 'f_' + f;
  ITEMS_.atun = { spr: 'f_atun', name: 'Atún', icon: '🐠', type: 'consumable', food: 1, heal: 120, stack: true, price: 60, sell: 16 };
  for (const [id, r] of Object.entries(RODS)) ITEMS_[id] = { name: `${r.name} (pesca ${r.req})`, icon: '🎣', spr: r.spr, type: 'misc', rod: 1, price: r.price, sell: Math.round(r.price / 4) };
  ITEMS_.cebo = { name: 'Cebo de Gusanos', icon: '🪱', type: 'misc', stack: true, bait: 1, price: 12, sell: 3 };
  ITEMS_.cebo_dorado = { name: 'Cebo Dorado', icon: '✨', type: 'misc', stack: true, bait: 1, price: 90, sell: 25 };
  ITEMS_.perla_marina = { name: 'Perla Marina', icon: '🦪', type: 'misc', stack: true, sell: 2500 };
  ITEMS_.tesoro_hundido = { name: 'Cofre Hundido', icon: '🧰', type: 'misc', stack: true, sell: 6000 };
  SHOPS.nilo.push('cana_madera', 'cana_carpa', 'cana_hierro', 'cana_hielo', 'cana_acero', 'cana_jade', 'cebo', 'cebo_dorado', 'atun');
  SHOPS.boris.push('atun'); SHOPS.brisa.push('atun');
}

const tri = (ph) => { const x = ph % 2; return x < 1 ? x : 2 - x; };       // onda triangular 0..1

module.exports = { build, install(Game) {
  const { ITEMS } = require('./data');
  const world = require('./world');
  const { zoneAt, tiles, W, H, T } = world;
  const P = Game.prototype;
  const have = (p, id) => p.inv.reduce((n, it) => n + (it && it.id === id ? it.qty : 0), 0);
  const take = (p, id, n) => { for (let i = 0; i < p.inv.length && n > 0; i++) { const it = p.inv[i]; if (!it || it.id !== id) continue; const t = Math.min(n, it.qty); it.qty -= t; n -= t; if (it.qty <= 0) p.inv[i] = null; } p.dirty.inv = true; };
  const lvOf = (p) => fishLevel(p.ext.fish.xp);
  const bestRod = (p, lv) => { let best = null; for (const id of Object.keys(RODS)) if (have(p, id) && RODS[id].req <= lv && (!best || RODS[id].req > RODS[best].req)) best = id; return best; };

  P.fishView = function (p) {
    const f = p.ext.fish, lv = lvOf(p);
    return { t: 'fish', lv, xp: f.xp, lo: Math.ceil(skillXpFor(lv) / XP_SCALE), hi: lv >= FISH_MAX ? Math.ceil(skillXpFor(lv) / XP_SCALE) : Math.ceil(skillXpFor(lv + 1) / XP_SCALE), c: f.c, defs: { fish: FISH, zones: ZONE_FISH, rods: RODS, max: FISH_MAX, scale: XP_SCALE } };
  };
  P.sendFish = function (p) { this.send(p, this.fishView(p)); };
  P.fishMult = function (p, id) { return FISH[id] ? 1 + lvOf(p) * 0.01 : 1; };       // los peces valen más con el nivel

  P.fishCast = function (p, x, y) {
    if (p.dead || !p.ext) return;
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H || tiles[y * W + x] !== T.WATER) { this.msg(p, 'Solo puedes pescar en el agua.', 's'); return; }
    if (cheb(p.x, p.y, x, y) > 5) { this.msg(p, 'Acércate más al agua para lanzar la caña.', 's'); return; }
    const lv = lvOf(p), rod = bestRod(p, lv);
    if (!rod) { this.msg(p, have(p, 'cana_madera') || Object.keys(RODS).some((id) => have(p, id)) ? 'Tu nivel de pesca es muy bajo para esa caña.' : 'Necesitas una caña de pescar: Nilo el Pescador las vende en la aldea de pescadores.', 's'); return; }
    const z = ZONE_FISH[zoneAt(x, y).id];
    if (!z) { this.msg(p, 'Aquí no hay peces.', 's'); return; }
    if (!z.fish.some(([f]) => FISH[f].lvl <= lv)) { this.msg(p, `En estas aguas necesitas más nivel de pesca (tienes ${lv}).`, 's'); return; }
    if (p.fishing) this.fishStop(p, true);
    let bait = '';
    for (const b of ['cebo_dorado', 'cebo']) if (have(p, b)) { bait = b; break; }
    if (bait) take(p, bait, 1);
    const r = RODS[rod], b = bait ? BAITS[bait] : null;
    const wait = Math.max(1500, rnd(4500, 9500) * r.wait * (1 - Math.min(0.5, lv / 640)) * (b ? b.wait : 1));
    p.fishing = { x, y, px: p.x, py: p.y, state: 'wait', biteAt: this.now + wait, rod, bait, zone: zoneAt(x, y).id };
    (this.anglers || (this.anglers = new Set())).add(p);
    this.send(p, { t: 'fcast', x, y, wait: Math.round(wait), bait: bait ? 1 : 0 });
  };
  P.fishStop = function (p, silent) {
    if (!p.fishing) return;
    p.fishing = null; if (this.anglers) this.anglers.delete(p);
    this.send(p, { t: 'fend', ok: 0, silent: silent ? 1 : 0 });
  };
  const pickFish = (p, f) => {
    const z = ZONE_FISH[f.zone], lv = lvOf(p), b = f.bait ? BAITS[f.bait] : null;
    const opts = z.fish.filter(([id]) => FISH[id].lvl <= lv).map(([id, w], i) => [id, w * (i > 0 || z.fish.length === 1 ? 1 : 1) * (FISH[id].lvl > 1 ? (b ? b.rare : 1) * (1 + (lv - FISH[id].lvl) / 150) : 1)]);
    let t = opts.reduce((a, o) => a + o[1], 0) * Math.random();
    for (const [id, w] of opts) { t -= w; if (t <= 0) return id; }
    return opts[0][0];
  };
  P.fishTick = function (now) {
    if (!this.anglers || !this.anglers.size) return;
    for (const p of [...this.anglers]) {
      const f = p.fishing;
      if (!f || p.dead || !this.ents.has(p.id)) { this.anglers.delete(p); p.fishing = null; continue; }
      if (p.x !== f.px || p.y !== f.py || cheb(p.x, p.y, f.x, f.y) > 6) { this.msg(p, 'Te moviste: recoges el sedal.', 's'); this.fishStop(p, true); continue; }
      if (f.state === 'wait' && now >= f.biteAt) {
        const fish = pickFish(p, f), d = FISH[fish].diff, lv = lvOf(p), r = RODS[f.rod];
        const w = Math.min(0.5, Math.max(0.12, 0.34 - d + lv * 0.0004 + r.bar)), c = 0.18 + w / 2 + Math.random() * (0.64 - w);
        f.state = 'bite'; f.fish = fish; f.lo = c - w / 2; f.hi = c + w / 2; f.speed = 0.75 + d * 1.6 + Math.random() * 0.2; f.t0 = now; f.end = now + BITE_MS;
        this.send(p, { t: 'fbite', fish, lo: +f.lo.toFixed(3), hi: +f.hi.toFixed(3), speed: +f.speed.toFixed(3), dur: BITE_MS });
        this.fx.push({ k: 'd', x: f.x, y: f.y, v: '!', c: 'x' });
      } else if (f.state === 'bite' && now > f.end + 250) this.fishFail(p, 'El pez se soltó: reaccionaste tarde.');
    }
  };
  P.fishFail = function (p, txt) {
    const f = p.fishing; if (!f) return;
    const shark = f.fish === 'tiburon';
    p.fishing = null; this.anglers.delete(p);
    this.msg(p, txt, 's');
    if (shark) {
      if (have(p, 'cebo') || have(p, 'cebo_dorado')) { take(p, have(p, 'cebo') ? 'cebo' : 'cebo_dorado', 1); this.msg(p, '¡El tiburón se llevó tu cebo!', 's'); }
      else if (Math.random() < 0.6 || ZONE_FISH[f.zone].danger) {
        const dmg = Math.min(p.hp - 1, Math.round(p.maxHp * 0.08)); if (dmg > 0) { p.hp -= dmg; this.fx.push({ k: 'd', x: p.x, y: p.y, v: dmg, c: 'h' }); this.msg(p, '¡El tiburón te muerde al soltarse!', 's'); }
      }
    }
    this.send(p, { t: 'fend', ok: 0 });
  };
  P.fishReel = function (p) {
    const f = p.fishing; if (!f) return;
    if (f.state === 'wait') { this.msg(p, 'Tiraste demasiado pronto: el pez se asustó.', 's'); this.fishStop(p, true); this.send(p, { t: 'fend', ok: 0 }); return; }
    const now = this.now, pos = tri((now - f.t0) / 1000 * f.speed);
    if (now > f.end + 250 || pos < f.lo - SLACK || pos > f.hi + SLACK) { this.fishFail(p, 'Se escapó. Tira cuando el marcador esté en la zona verde.'); return; }
    // captura
    const e = p.ext.fish, id = f.fish, F = FISH[id], before = lvOf(p), r = RODS[f.rod];
    let qty = 1; if (r.req >= 60 && Math.random() < 0.12) qty = 2;
    this.giveOrDrop(p, id, qty);
    e.c[id] = (e.c[id] || 0) + qty; e.xp += F.xp * qty;
    this.fx.push({ k: 'd', x: f.x, y: f.y, v: '+' + qty + ' ' + ITEMS[id].name, c: 'g' });
    this.msgC(p, `🎣 ¡Pescaste ${qty > 1 ? qty + '× ' : ''}${ITEMS[id].name}! (+${F.xp * qty} pesca)`, '#7fd0ff');
    const tr = 0.006 * (f.bait === 'cebo_dorado' ? 3 : f.bait ? 1.5 : 1) * (1 + lvOf(p) / 200);
    if (Math.random() < tr) {
      const treasure = Math.random() < 0.7 ? 'perla_marina' : 'tesoro_hundido';
      this.giveOrDrop(p, treasure, 1); e.c[treasure] = (e.c[treasure] || 0) + 1; this.msgC(p, `✨ ¡Encuentras ${ITEMS[treasure].name}!`, '#ffe08a');
    }
    p.fishing = null; this.anglers.delete(p); p.dirty.inv = true;
    const after = lvOf(p); if (after > before) this.msgC(p, `🎣 ¡Tu nivel de pesca sube a ${after}!`, '#7fd0ff');
    this.send(p, { t: 'fend', ok: 1, fish: id, qty });
    this.sendFish(p);
    this.checkAch && this.checkAch(p);
  };

  const G0 = P.tickExt;
  const flush = function (p) { if (p.dirty.inv) { p.dirty.inv = false; this.sendInv(p); p.dirty.stats = true; } };
  P.tickExt = function (now) { G0.call(this, now); this.fishTick(this.now || now); if (this.anglers) for (const p of this.anglers) flush.call(this, p); };
  const H0 = P.handleExt;
  P.handleExt = function (p, msg) {
    switch (msg.t) {
      case 'fcast': this.fishCast(p, msg.x, msg.y); flush.call(this, p); return;
      case 'freel': this.fishReel(p); flush.call(this, p); return;
      case 'fstop': this.fishStop(p, false); return;
      case 'fish': this.sendFish(p); return;
      default: return H0.call(this, p, msg);
    }
  };
  const L0 = P.onLogin;
  P.onLogin = function (p) { L0.call(this, p); this.sendFish(p); };
} };
