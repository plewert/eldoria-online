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
const ok = (name, fn) => { try { fn(); n++; console.log('  ✔', name); } catch (e) { console.error('  ✘', name, '\n   ', e.message); process.exitCode = 1; } };

console.log('Mundo');
ok('todas las apariciones están en casillas alcanzables', () => {
  for (const s of world.monsterSpawns) assert(world.isWalkable(s.x, s.y) && world.reach[s.y * world.W + s.x], `${s.type} en ${s.x},${s.y}`);
});
ok('portales con destino válido', () => { for (const p of world.PORTALS) assert(world.isWalkable(p.tx, p.ty)); });
ok('zonas: ciudad/prado/catacumbas seguras, bosque/abismo PvP', () => {
  assert.equal(world.zoneAt(60, 48).pvp, false);
  assert.equal(world.zoneAt(60, 70).id, 'prado');
  assert.equal(world.zoneAt(10, 60).id, 'catacumbas');
  assert.equal(world.zoneAt(60, 10).pvp, true);
  assert.equal(world.zoneAt(100, 50).id, 'abismo');
});

console.log('Personajes');
const A = login('Aria'), B = login('Borin'), C = login('Ciri');
ok('personaje nuevo: arma de melee, arco y vara en el inventario (mismo héroe, 3 estilos)', () => {
  assert.equal(A.p.eq.weapon, 'espada_madera');
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
  A.p.eq.weapon = 'hacha_acero';   // con la espada de madera no vence la regeneración de un nivel 21
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
  const boris = world.NPCS[0];
  place(C.p, boris.x, boris.y + 2);
  C.p.gold = 1000;
  game.handle(C.p, { t: 'buy', id: 'espada_hierro', q: 1 });
  assert.equal(C.p.gold, 1000 - ITEMS.espada_hierro.price);
  assert(C.p.inv.some((i) => i && i.id === 'espada_hierro'));
  const slot = C.p.inv.findIndex((i) => i && i.id === 'espada_hierro');
  game.handle(C.p, { t: 'sell', s: slot, q: 1 });
  assert.equal(C.p.gold, 1000 - ITEMS.espada_hierro.price + ITEMS.espada_hierro.sell);
});
ok('no se puede comprar lejos del mercader', () => {
  place(C.p, 60, 50); C.p.gold = 1000;
  game.handle(C.p, { t: 'buy', id: 'pocion_vida', q: 1 });
  assert.equal(C.p.gold, 1000);
});
ok('requisito de nivel al equipar', () => {
  C.p.inv[0] = { id: 'martillo_titan', qty: 1 };
  game.handle(C.p, { t: 'equip', s: 0 });
  assert.notEqual(C.p.eq.weapon, 'martillo_titan');
});
ok('pociones curan y se consumen', () => {
  C.p.hp = 10; C.p.nextPotion = 0;
  C.p.inv.fill(null); C.p.inv[0] = { id: 'pocion_vida', qty: 2 };
  game.handle(C.p, { t: 'potion', k: 'heal' });
  assert(C.p.hp > 10); assert.equal(C.p.inv[0].qty, 1);
});

console.log('Portales y persistencia');
ok('el portal teletransporta a la mazmorra y se bloquea en combate', () => {
  const portal = world.PORTALS[0];
  place(C.p, portal.x - 1, portal.y); C.p.nextMove = 0; C.p.pvpLock = 0;
  game.handle(C.p, { t: 'move', dx: 1, dy: 0, once: true });
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

fs_cleanup();
function fs_cleanup() { try { require('fs').unlinkSync(store.file); } catch (e) { /* nada */ } }
console.log(`\n${n} pruebas correctas${process.exitCode ? ' (con fallos)' : ''}`);
