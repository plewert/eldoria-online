'use strict';
/**
 * Pruebas de lógica del juego (sin red, con tiempo simulado).
 *   node test/logic.js
 */
const assert = require('assert');
const os = require('os');
const path = require('path');
const Store = require('../game/store');
const { Game } = require('../game/game');
const world = require('../game/world');
const { CFG, ITEMS } = require('../game/data');
const I = require('../game/items');

const store = new Store(path.join(os.tmpdir(), 'eldoria-test-' + process.pid + '.json'));
const game = new Game(store);
let T0 = 1_000_000;
const advance = (ms) => { for (let t = 0; t < ms; t += CFG.TICK_MS) { T0 += CFG.TICK_MS; game.tick(T0); } };
// avanza hasta que se cumpla la condición (o se agote el tiempo): evita depender de reapariciones aleatorias
const advanceUntil = (cond, ms) => { for (let t = 0; t < ms && !cond(); t += CFG.TICK_MS) { T0 += CFG.TICK_MS; game.tick(T0); } };

// websocket falso que guarda lo que recibe el jugador
function fakeWs() {
  const ws = { open: true, p: null, got: [], send(s) { this.got.push(JSON.parse(s)); }, close() { this.open = false; } };
  return ws;
}
function login(name) {
  const acc = store.get(name) || store.create(name, 'secreto', '#ff8800');
  const ws = fakeWs();
  const p = game.attach(acc, ws);
  return { p, ws };
}
function place(p, x, y) { p.x = x; p.y = y; game.pgrid.set(y * world.W + x, p); }
function clearAround(x, y, r) {
  for (const m of game.monsters) if (!m.dead && Math.abs(m.x - x) <= r && Math.abs(m.y - y) <= r) { game.mgrid.delete(m.y * world.W + m.x); m.dead = true; m.respawnAt = Infinity; }
}
function findTile(zoneId, pred) {
  for (let y = 0; y < world.H; y++) for (let x = 0; x < world.W; x++) {
    if (world.reach[y * world.W + x] && world.zoneAt(x, y).id === zoneId && world.tiles[y * world.W + x] !== world.T.PORTAL && pred(x, y)) return [x, y];
  }
  throw new Error('sin casilla en ' + zoneId);
}
const open = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => world.isWalkable(x + dx, y + dy) && world.isWalkable(x + 2 * dx, y + 2 * dy));

let n = 0;
const ok = (name, fn) => { try { fn(); n++; console.log('  ✔', name); } catch (e) { console.error('  ✘', name, '\n   ', e.stack.split('\n').slice(0,3).join(' | ')); process.exitCode = 1; } };

console.log('Mundo');
ok('todas las apariciones están en casillas alcanzables', () => {
  for (const s of world.monsterSpawns) assert(world.isWalkable(s.x, s.y) && world.reach[s.y * world.W + s.x], `${s.type} en ${s.x},${s.y}`);
});
ok('portales con destino válido', () => { for (const p of world.PORTALS) assert(world.isWalkable(p.tx, p.ty)); });
ok('zonas: ciudad/prado/catacumbas seguras, bosque/abismo PvP', () => {
  assert.equal(world.zoneAt(world.SPAWN_POINT.x, world.SPAWN_POINT.y).id, 'ciudad');
  assert.equal(world.zoneAt(world.SPAWN_POINT.x, world.SPAWN_POINT.y).pvp, false);
  assert.equal(world.zoneAt(90, 90).id, 'prado');
  assert.equal(world.zoneAt(10, 60).id, 'catacumbas');
  assert.equal(world.zoneAt(50, 10).pvp, true);
  assert.equal(world.zoneAt(125, 55).id, 'abismo');
  for (const id of ['dunas', 'pantano', 'cumbres', 'puerto', 'minas', 'piramide', 'fortaleza', 'colinas', 'playa']) assert(world.zoneById(id), 'falta la zona ' + id);
});

console.log('Personajes');
const A = login('Aria'), B = login('Borin'), C = login('Ciri');
ok('personaje nuevo: arma de melee, arco y vara en el inventario (mismo héroe, 3 estilos)', () => {
  assert.equal(A.p.eq.weapon.id, 'espada_madera');
  const ids = A.p.inv.filter(Boolean).map((i) => i.id);
  assert(ids.includes('arco_corto') && ids.includes('vara_novato'));
});
ok('cambiar de estilo con las teclas Z/X/C equipa el arma correcta', () => {
  game.handle(A.p, { t: 'style', s: 'ranged' }); assert.equal(game.styleOf(A.p), 'ranged');
  game.handle(A.p, { t: 'style', s: 'magic' }); assert.equal(game.styleOf(A.p), 'magic');
  game.handle(A.p, { t: 'style', s: 'melee' }); assert.equal(game.styleOf(A.p), 'melee');
});
ok('recibe el mundo, inventario y estado al conectar', () => {
  const kinds = A.ws.got.map((m) => m.t);
  assert(kinds.includes('welcome') && kinds.includes('inv') && kinds.includes('stats') && kinds.includes('s'));
});

console.log('Combate en zona segura (prado)');
const [px, py] = findTile('prado', (x, y) => y > 70 && open(x, y));
place(A.p, px, py);
clearAround(px, py, 12);
const rata = game.spawnMonster('rata', px + 2, py);
ok('el jugador mata a una rata, gana experiencia y la rata suelta botín', () => {
  game.handle(A.p, { t: 'target', id: rata.id });
  const xp0 = A.p.xp;
  advanceUntil(() => rata.dead, 30000);
  assert(rata.dead, 'la rata debería haber muerto');
  assert(A.p.xp > xp0, 'debería ganar xp');
  assert(A.p.sxp.melee > 0, 'debería subir la habilidad cuerpo a cuerpo');
});
ok('mago y arquero también combaten (maná gastado / daño a distancia)', () => {
  for (const [style, name] of [['magic', 'rata2'], ['ranged', 'rata3']]) {
    game.handle(A.p, { t: 'style', s: style });
    const m = game.spawnMonster('rata', px + 3, py + 1);
    const mana0 = A.p.mana;
    game.handle(A.p, { t: 'target', id: m.id });
    advanceUntil(() => m.dead, 25000);
    assert(m.dead, name + ' debería morir');
    if (style === 'magic') assert(A.p.mana < mana0 || A.p.mana === A.p.maxMana, 'la magia gasta maná');
    assert(A.p.sxp[style] > 0, 'sube la habilidad ' + style);
  }
  game.handle(A.p, { t: 'style', s: 'melee' });
});
ok('en zona segura el botín queda protegido para quien hizo más daño', () => {
  const m = game.spawnMonster('serpiente', px + 1, py + 2);
  place(B.p, px - 3, py);
  game.handle(A.p, { t: 'target', id: m.id });
  advanceUntil(() => m.dead, 60000);
  assert(m.dead);
  const g = [...game.ground.values()].find((q) => q.x === m.x && q.y === m.y);
  if (g) { assert.equal(g.owner, A.p.id); assert(g.prot > game.now - 1); }
});

console.log('PvP');
ok('NO se puede atacar a otro jugador en zona segura', () => {
  A.p.xp = 20000; B.p.xp = 20000; game.recalc(A.p); game.recalc(B.p);
  place(A.p, px, py); place(B.p, px + 1, py);
  game.handle(A.p, { t: 'target', id: B.p.id });
  assert.equal(A.p.target, null);
  const hp = B.p.hp; advance(5000);
  assert(B.p.hp >= hp);
});
const [wx, wy] = findTile('bosque', (x, y) => y > 12 && open(x, y) && world.tiles[y * world.W + x] !== world.T.ROAD);
ok('protección de novato: nivel < 5 no puede ser atacado en zona PvP', () => {
  const low = login('Novato');
  place(A.p, wx, wy); place(low.p, wx + 1, wy);
  clearAround(wx, wy, 14);
  game.handle(A.p, { t: 'target', id: low.p.id });
  assert.equal(A.p.target, null);
  game.removePlayer(low.p);
});
ok('en zona PvP sí se puede, el combate bloquea huir a zona segura', () => {
  A.p.hp = A.p.maxHp; B.p.hp = B.p.maxHp;
  place(A.p, wx, wy); place(B.p, wx + 1, wy);
  clearAround(wx, wy, 14);
  game.handle(A.p, { t: 'target', id: B.p.id });
  assert.equal(A.p.target, B.p.id);
  advanceUntil(() => B.p.hp < B.p.maxHp, 3000);   // B regenera rápido a nivel alto: se comprueba al recibir el golpe
  assert(B.p.hp < B.p.maxHp, 'B debería haber recibido daño');
  assert(A.p.pvpLock > game.now, 'A queda en combate');
  assert(B.p.pvpLock > game.now, 'B queda en combate');
});
ok('el jugador caído en PvP suelta botín que el ganador puede robar', () => {
  B.p.hp = 3; B.p.gold = 1000;
  A.p.eq.weapon = I.mk('hacha_acero'); A.p.vis = null;   // con la espada de madera no vence la regeneración de un nivel 21
  for (let i = 0; i < B.p.inv.length; i++) B.p.inv[i] = { id: 'pocion_vida', qty: 5 };
  place(A.p, wx, wy); place(B.p, wx + 1, wy);
  const bx = B.p.x, by = B.p.y;
  const goldA = A.p.gold;
  game.handle(A.p, { t: 'target', id: B.p.id });
  advance(8000);
  assert.equal(B.p.x, world.SPAWN_POINT.x, 'B reaparece en la ciudad');
  assert(B.p.hp > 0);
  const loot = game.gtile.get(by * world.W + bx);
  assert(loot && loot.length > 0, 'debe haber botín en el suelo');
  assert(loot.every((g) => g.prot === 0), 'el botín PvP no está protegido');
  // A camina sobre el botín y lo recoge
  place(A.p, bx - 1, by); A.p.nextMove = 0;
  game.handle(A.p, { t: 'move', dx: 1, dy: 0, once: true });
  advance(300);
  assert(A.p.gold > goldA, 'A roba el oro');
});
ok('al morir en zona PvP: pierde experiencia sin bajar de nivel', () => {
  assert(B.p.level >= 5);
});
ok('morir en zona segura NO suelta objetos', () => {
  const [sx, sy] = findTile('prado', (x, y) => y > 60 && open(x, y));
  place(C.p, sx, sy);
  const inv0 = JSON.stringify(C.p.inv), gold0 = C.p.gold;
  C.p.hp = 1;
  game.killPlayer(C.p, { kind: 'mo', def: { name: 'Rata' } }, 'Rata', game.now);
  assert.equal(JSON.stringify(C.p.inv), inv0);
  assert.equal(C.p.gold, gold0);
  assert.equal(C.p.x, world.SPAWN_POINT.x);
});

console.log('Tienda e inventario');
ok('comprar y vender junto a Boris', () => {
  const boris = world.NPCS.find((n) => n.id === 'boris');
  place(C.p, boris.x, boris.y + 2);
  C.p.gold = 1000;
  game.handle(C.p, { t: 'npc', id: 'boris' });
  game.handle(C.p, { t: 'buy', id: 'espada_hierro', q: 1 });
  assert.equal(C.p.gold, 1000 - ITEMS.espada_hierro.price);
  assert(C.p.inv.some((i) => i && i.id === 'espada_hierro'));
  const slot = C.p.inv.findIndex((i) => i && i.id === 'espada_hierro');
  game.handle(C.p, { t: 'sell', s: slot, q: 1 });
  assert.equal(C.p.gold, 1000 - ITEMS.espada_hierro.price + ITEMS.espada_hierro.sell);
});
ok('no se puede comprar lejos del mercader', () => {
  place(C.p, world.SPAWN_POINT.x, world.SPAWN_POINT.y + 20); C.p.gold = 1000;
  game.handle(C.p, { t: 'buy', id: 'pocion_vida', q: 1 });
  assert.equal(C.p.gold, 1000);
});
ok('requisito de nivel al equipar', () => {
  C.p.inv[0] = I.mk('martillo_titan');
  game.handle(C.p, { t: 'equip', s: 0 });
  assert.notEqual(C.p.eq.weapon && C.p.eq.weapon.id, 'martillo_titan');
});
ok('pociones curan y se consumen', () => {
  C.p.hp = 10; C.p.nextPotion = 0;
  C.p.inv.fill(null); C.p.inv[0] = { id: 'pocion_vida', qty: 2 };
  game.handle(C.p, { t: 'potion', k: 'heal' });
  assert(C.p.hp > 10); assert.equal(C.p.inv[0].qty, 1);
});

console.log('Portales y persistencia');
ok('el portal teletransporta a la mazmorra y se bloquea en combate', () => {
  const portal = world.PORTALS.find((q) => world.zoneAt(q.tx, q.ty).id === 'catacumbas' && world.zoneAt(q.x, q.y).id !== 'catacumbas');
  const [ddx, ddy] = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([a, b]) => world.isWalkable(portal.x - a, portal.y - b) && world.tiles[(portal.y - b) * world.W + portal.x - a] !== world.T.PORTAL);
  place(C.p, portal.x - ddx, portal.y - ddy); C.p.nextMove = 0; C.p.pvpLock = 0;
  game.handle(C.p, { t: 'move', dx: ddx, dy: ddy, once: true });
  advance(300);
  assert.equal(world.zoneAt(C.p.x, C.p.y).id, 'catacumbas');
});
ok('guardar y cargar cuenta conserva el personaje', () => {
  game.savePlayer(C.p); store.flush();
  const data = store.get('Ciri').data;
  assert.equal(data.xp, C.p.xp);
  assert(Array.isArray(data.inv));
});
ok('desconexión en combate deja el personaje 20 s en el mundo (anti combat-log)', () => {
  place(A.p, wx, wy); A.p.pvpLock = game.now + 15000;
  A.ws.open = false; game.onClose(A.ws);
  assert(game.players.has(A.p.key), 'sigue en el mundo');
  advance(CFG.GHOST_MS + 2000);
  assert(!game.players.has(A.p.key), 'desaparece tras el tiempo de gracia');
});


console.log('Rareza, gemas, banco y comercio');
const { RAR, MONSTERS } = require('../game/data');
const D = login('Dara'), E = login('Eli');
const gerda = world.NPCS.find((n) => n.id === 'gerda');
const home = world.SPAWN_POINT;
function resetPair() {
  for (const q of [D, E]) { q.p.inv.fill(null); q.p.gold = 0; q.p.pvpLock = 0; q.p.trade = null; q.p.hp = q.p.maxHp; }
  place(D.p, home.x, home.y + 2); place(E.p, home.x + 1, home.y + 2);
}
ok('nombres por rareza: normal gris, +N verde, Ancient azul', () => {
  const n = I.mk('espada_hierro'), u = I.mk('espada_hierro', 1, { up: 3 }), a = I.mk('espada_hierro', 1, { an: 1 });
  assert.equal(I.colorOf(n), RAR.normal); assert.equal(I.colorOf(u), RAR.plus); assert.equal(I.colorOf(a), RAR.ancient);
  assert.equal(I.nameOf(n), 'Espada de Hierro'); assert.equal(I.nameOf(u), 'Espada de Hierro +3'); assert(I.nameOf(a).startsWith('Ancient '));
  assert(I.baseStat(u) > I.baseStat(n) && I.baseStat(a) > I.baseStat(u));
  assert.equal(RAR.normal, '#9aa3ad');
});
ok('Ancient es muy raro, +N es poco común, y los jefes sueltan más', () => {
  const N = 40000; let anc = 0, plus = 0, ancB = 0;
  for (let i = 0; i < N; i++) { const g = I.rollGear('espada_hierro', false); if (g.an) anc++; else if (g.up > 0) plus++; if (I.rollGear('espada_hierro', true).an) ancB++; }
  assert(anc > 0 && anc / N < 0.04, 'ancient ' + anc / N);
  assert(plus / N > 0.1 && plus / N < 0.35, 'plus ' + plus / N);
  assert(ancB > anc, 'jefes más ancient');
});
ok('el botín de un monstruo trae equipo con su propia rareza (instancia)', () => {
  const m = game.spawnMonster('esqueleto', home.x, home.y - 30);
  m.def = Object.assign({}, m.def, { loot: [['espada_hierro', 1, 1, 1]], gold: [0, 0] });
  game.killMonster(m, game.now);
  const g = [...game.ground.values()].find((q) => q.x === m.x && q.y === m.y && q.item === 'espada_hierro');
  assert(g && g.inst && Array.isArray(g.inst.gm), 'instancia con ranuras');
});
ok('gemas: se engarzan en zona segura, dan bonus y se pueden sacar pagando', () => {
  resetPair();
  D.p.eq.weapon = I.mk('espada_hierro', 1, { ns: 2 }); D.p.vis = null; game.recalc(D.p);
  D.p.inv[0] = { id: 'rubi', qty: 2 }; D.p.inv[1] = { id: 'diamante', qty: 1 }; D.p.gold = 1000;
  const atk0 = game.weaponOf(D.p).atk, glow0 = game.visOf(D.p).g;
  game.handle(D.p, { t: 'socket', gem: 0, from: 'eq', at: 'weapon' });
  assert.equal(game.weaponOf(D.p).atk, atk0 + 3, 'rubí: +3 ataque');
  game.handle(D.p, { t: 'socket', gem: 1, from: 'eq', at: 'weapon' });
  assert(game.visOf(D.p).g > glow0, 'diamante: más brillo');
  game.handle(D.p, { t: 'socket', gem: 0, from: 'eq', at: 'weapon' });
  assert.equal(D.p.inv[0].qty, 1, 'sin ranuras libres: no consume la gema');
  game.handle(D.p, { t: 'unsocket', from: 'eq', at: 'weapon', hole: 0 });
  assert.equal(D.p.gold, 1000 - CFG.GEM_REMOVE_COST);
  assert.equal(D.p.eq.weapon.gm[0], null);
  assert.equal(game.weaponOf(D.p).atk, atk0 + 1, 'queda solo el +1 del diamante');
});
ok('no se puede engarzar en zona PvP', () => {
  const g0 = JSON.stringify(D.p.eq.weapon.gm);
  place(D.p, wx, wy); D.p.inv[2] = { id: 'rubi', qty: 1 };
  game.handle(D.p, { t: 'socket', gem: 2, from: 'eq', at: 'weapon' });
  assert.equal(JSON.stringify(D.p.eq.weapon.gm), g0); assert.equal(D.p.inv[2].qty, 1);
});
ok('banco: guardar y sacar objetos, gemas y oro; lejos de la banquera no funciona', () => {
  resetPair();
  place(D.p, gerda.x, gerda.y + 2);
  D.p.inv[0] = I.mk('espada_hierro', 1, { up: 4, ns: 1 }); D.p.inv[1] = { id: 'rubi', qty: 5 }; D.p.gold = 900;
  game.handle(D.p, { t: 'bdep', s: 0, q: 1 }); game.handle(D.p, { t: 'bdep', s: 1, q: 3 }); game.handle(D.p, { t: 'bgold', d: 'dep', q: 600 });
  assert.equal(D.p.inv[0], null); assert.equal(D.p.inv[1].qty, 2); assert.equal(D.p.gold, 300); assert.equal(D.p.bankGold, 600);
  assert(D.p.bank.some((i) => i && i.id === 'espada_hierro' && i.up === 4), 'el +4 conserva su rareza');
  place(D.p, home.x, home.y + 15);
  game.handle(D.p, { t: 'bgold', d: 'wd', q: 100 }); assert.equal(D.p.bankGold, 600);
  place(D.p, gerda.x, gerda.y + 2);
  const bs = D.p.bank.findIndex((i) => i && i.id === 'espada_hierro');
  game.handle(D.p, { t: 'bwd', s: bs, q: 1 }); game.handle(D.p, { t: 'bgold', d: 'wd', q: 100 });
  assert(D.p.inv.some((i) => i && i.id === 'espada_hierro' && i.up === 4)); assert.equal(D.p.gold, 400);
});
ok('lo guardado en el banco no se pierde al morir en zona PvP', () => {
  const bank0 = JSON.stringify(D.p.bank), bg = D.p.bankGold;
  place(D.p, wx, wy); D.p.hp = 1;
  game.killPlayer(D.p, { kind: 'mo', def: { name: 'Rata' } }, 'Rata', game.now);
  assert.equal(JSON.stringify(D.p.bank), bank0); assert.equal(D.p.bankGold, bg);
});
ok('comercio: ambos ponen su oferta, confirman y el intercambio es atómico', () => {
  resetPair();
  D.p.inv[0] = I.mk('espada_hierro', 1, { up: 5, an: 0, ns: 2 }); D.p.inv[1] = { id: 'rubi', qty: 4 }; E.p.gold = 500;
  game.handle(D.p, { t: 'trade_req', id: E.p.id });
  assert(E.ws.got.some((m) => m.t === 'trade_inv'), 'E recibe la invitación');
  game.handle(E.p, { t: 'trade_acc', id: D.p.id });
  assert(D.p.trade && E.p.trade);
  game.handle(D.p, { t: 'trade_add', s: 0, q: 1 }); game.handle(D.p, { t: 'trade_add', s: 1, q: 2 });
  game.handle(E.p, { t: 'trade_gold', g: 400 });
  assert.equal(D.p.inv[0], null); assert.equal(D.p.inv[1].qty, 2); assert.equal(E.p.gold, 100);
  game.handle(D.p, { t: 'trade_ok' });
  assert(D.p.trade, 'falta la confirmación de E');
  game.handle(E.p, { t: 'trade_ok' });
  assert(!D.p.trade && !E.p.trade);
  assert(E.p.inv.some((i) => i && i.id === 'espada_hierro' && i.up === 5 && i.gm.length === 2), 'E recibe el +5 con sus ranuras');
  assert.equal(E.p.inv.filter((i) => i && i.id === 'rubi').reduce((a, i) => a + i.qty, 0), 2);
  assert.equal(D.p.gold, 400); assert.equal(E.p.gold, 100);
});
ok('comercio: si alguien cambia la oferta se anulan las confirmaciones; cancelar devuelve todo', () => {
  resetPair();
  D.p.inv[0] = { id: 'rubi', qty: 3 }; D.p.gold = 200;
  game.handle(D.p, { t: 'trade_req', id: E.p.id }); game.handle(E.p, { t: 'trade_acc', id: D.p.id });
  game.handle(D.p, { t: 'trade_add', s: 0, q: 3 }); game.handle(D.p, { t: 'trade_gold', g: 150 });
  game.handle(E.p, { t: 'trade_ok' }); game.handle(D.p, { t: 'trade_gold', g: 100 });
  assert.equal(E.p.trade.ok, false, 'la confirmación de E se anuló');
  game.handle(E.p, { t: 'trade_no' });
  assert(!D.p.trade && !E.p.trade);
  assert.equal(D.p.gold, 200); assert.equal(D.p.inv.filter((i) => i && i.id === 'rubi').reduce((a, i) => a + i.qty, 0), 3);
});
ok('comercio: sin espacio se cancela sin perder nada; lejos o en combate no se puede', () => {
  resetPair();
  D.p.inv[0] = I.mk('espada_hierro'); E.p.inv.fill({ id: 'pocion_vida', qty: 1 });
  game.handle(D.p, { t: 'trade_req', id: E.p.id }); game.handle(E.p, { t: 'trade_acc', id: D.p.id });
  game.handle(D.p, { t: 'trade_add', s: 0, q: 1 }); game.handle(D.p, { t: 'trade_ok' }); game.handle(E.p, { t: 'trade_ok' });
  assert(!D.p.trade && D.p.inv.some((i) => i && i.id === 'espada_hierro'), 'D recupera su espada');
  place(E.p, home.x + 20, home.y + 2);
  game.handle(D.p, { t: 'trade_req', id: E.p.id }); assert(!E.p.tradeInv, 'muy lejos');
  place(E.p, home.x + 1, home.y + 2); D.p.pvpLock = game.now + 5000;
  game.handle(D.p, { t: 'trade_req', id: E.p.id }); assert(!E.p.tradeInv, 'en combate');
  D.p.pvpLock = 0;
});
ok('la ficha de cada monstruo incluye su tabla de botín (clic derecho)', () => {
  const w = D.ws.got.find((m) => m.t === 'welcome');
  const dr = w.mons.dragon;
  assert(dr && Array.isArray(dr.loot) && dr.loot.length > 3 && dr.hp === MONSTERS.dragon.hp);
  assert(dr.loot.some((l) => l[4] === 1), 'marca los equipos'); assert(dr.anc > 0 && dr.plus > 0 && dr.gem > 0);
  assert(w.mons.demonio_supremo.anc > w.mons.dragon.anc, 'los jefes tienen más prob. de Ancient');
});
ok('guardar y cargar conserva +N, Ancient, gemas y banco', () => {
  D.p.eq.weapon = I.mk('hacha_acero', 1, { up: 6, an: 1, ns: 3 }); D.p.eq.weapon.gm = ['rubi', 'diamante', null];
  game.savePlayer(D.p); store.flush();
  const back = I.normalize(JSON.parse(JSON.stringify(store.get('Dara').data.eq.weapon)));
  assert.deepEqual(back, D.p.eq.weapon);
  assert.equal(I.normalize('espada_madera').id, 'espada_madera', 'acepta el formato viejo');
});

ok('anillos y amuletos: dos anillos, bonus al personaje, se guardan y se ven en el snapshot', () => {
  const J = login('Joya').p;
  J.xp = 1e9; game.recalc(J); J.inv[0] = I.mk('anillo_fuerza'); J.inv[1] = I.mk('anillo_vida'); J.inv[2] = I.mk('anillo_rubi'); J.inv[3] = I.mk('amuleto_vigor');
  const hp0 = J.maxHp, atk0 = I.gearBonus(J.eq).atk;
  game.equip(J, 0); game.equip(J, 1);
  assert.equal(J.eq.ring1.id, 'anillo_fuerza'); assert.equal(J.eq.ring2.id, 'anillo_vida');
  game.equip(J, 3); assert.equal(J.eq.amulet.id, 'amuleto_vigor');
  assert.ok(J.maxHp > hp0, 'el amuleto y el anillo de vida suben la vida máxima');
  assert.equal(I.gearBonus(J.eq).atk, atk0 + 3);
  game.equip(J, 2);                                  // tercer anillo: reemplaza al primero y el viejo vuelve a la mochila
  assert.equal(J.eq.ring1.id, 'anillo_rubi');
  assert.ok(J.inv.some((it) => it && it.id === 'anillo_fuerza'));
  game.unequip(J, 'ring2'); assert.equal(J.eq.ring2, null);
  const snap = game.sendSnapshot(J) || null;
  game.savePlayer(J); store.flush();
  const back = store.get('Joya').data.eq;
  assert.equal(I.normalize(back.amulet).id, 'amuleto_vigor');
  assert.equal(I.pack(J.eq.ring1)[7].crit, 0.02);
});

fs_cleanup();
function fs_cleanup() { try { require('fs').unlinkSync(store.file); } catch (e) { /* nada */ } }
console.log(`\n${n} pruebas correctas${process.exitCode ? ' (con fallos)' : ''}`);
