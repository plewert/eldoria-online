'use strict';
/** Pruebas de los aventureros simulados:  node test/bots.js */
const assert = require('assert');
const os = require('os');
const path = require('path');
const Store = require('../game/store');
const { Game } = require('../game/game');
const world = require('../game/world');
const { CFG } = require('../game/data');

const store = new Store(path.join(os.tmpdir(), 'eldoria-bots-' + process.pid + '.json'));
const game = new Game(store);
let t = 2_000_000;
game.now = t;
game.botCfg = { firstBossMs: 125000, bossCdMs: 600000, firstRaidMs: 125000, raidCdMs: 3600000 };
assert.strictEqual(game.initBots(16), 16);
const chats = [];
const bc = game.broadcastChat.bind(game);
game.broadcastChat = (m, k, n) => { chats.push(m); return bc(m, k, n); };
const advance = (ms) => { for (let i = 0; i < ms; i += CFG.TICK_MS) { t += CFG.TICK_MS; game.tick(t); } };
const zoneCount = (role, zone) => game.bots.filter((b) => b.ai.role === role && world.zoneAt(b.x, b.y).id === zone).length;

// etiquetados y repartidos por rol
assert.ok(game.bots.every((b) => b.bot && /^[A-Za-z0-9][A-Za-z0-9_]{2,13}$/.test(b.name)), 'nombres válidos como los de cualquier jugador');
for (const r of ['novato', 'aventurero', 'veterano', 'elite']) assert.ok(game.bots.some((b) => b.ai.role === r), 'hay ' + r);
assert.ok(game.bots.filter((b) => b.ai.role === 'elite').every((b) => b.eq.weapon && b.eq.weapon.id.startsWith('rd_') && b.eq.cape), 'las élites llevan equipo de la Raid');

const xp0 = game.bots.reduce((n, b) => n + b.xp, 0);
advance(120000);
// cada rol llega a su zona
assert.ok(zoneCount('novato', 'prado') >= 3, 'novatos en el Prado');
assert.ok(zoneCount('aventurero', 'catacumbas') >= 1, 'aventureros en las Catacumbas');
assert.ok(zoneCount('veterano', 'minas') >= 1, 'veteranos en las Minas');
assert.ok(zoneCount('elite', 'colinas') + zoneCount('elite', 'raid_hall') + game.bots.filter((b) => b.ai.role === 'elite' && world.zoneAt(b.x, b.y).id.startsWith('raid_')).length >= 1, 'élites en las Colinas o la Raid');

// jefes de mazmorra: un grupo derrota al Rey Esqueleto o al Maestro Forjador
let boss = false;
for (let i = 0; i < 90 && !boss; i++) { advance(10000); boss = chats.some((c) => /ha derrotado a (Rey Esqueleto|Maestro Forjador)/.test(c)); }
assert.ok(boss, 'los bots derrotan a un jefe de mazmorra');

// la Raid: los bots inician la incursión y avanzan
let raid = false, room = 0;
for (let i = 0; i < 200 && room < 2; i++) { advance(10000); if (game.raid) { raid = true; room = Math.max(room, game.raid.room); } }
assert.ok(raid, 'los bots inician la Raid');
assert.ok(room >= 2, 'y superan la primera cámara');

// no se guardan y no entran en zonas PvP
game.saveAll();
assert.ok(!Object.keys(store.accounts).some((k) => k.startsWith('bot:')), 'bots no se guardan');
assert.ok(game.bots.every((b) => b.bot && world.zoneAt(b.x, b.y).kind !== 'wild' && !world.zoneAt(b.x, b.y).pvp), 'ningún bot entra en zonas PvP');
assert.ok(xp0 < game.bots.reduce((n, b) => n + b.xp, 0), 'ganan experiencia');
assert.ok(game.bots.every((b) => b.level <= b.ai.capLv), 'respetan su tope de nivel');

// como una persona: venden en la tienda, compran pociones y guardan lo valioso en el banco
const ITEMS = require('../game/data').ITEMS;
const I = require('../game/items');
const nov = game.bots.find((b) => b.ai.role === 'novato');
nov.inv.fill(null);
I.putInto(nov.inv, I.mk('cola_rata', 7)); I.putInto(nov.inv, I.mk('hueso', 4)); I.putInto(nov.inv, I.mk('diamante', 1));
nov.gold = 3000; nov.ai.nextTrip = 0; nov.hp = nov.maxHp;
let trip = false;
for (let i = 0; i < 2400 && !trip; i++) { advance(250); if (nov.ai.mode === 'town') trip = true; }
assert.ok(trip, 'el bot emprende un viaje a la ciudad');
for (let i = 0; i < 2400 && nov.ai.mode === 'town'; i++) advance(250);
assert.notStrictEqual(nov.ai.mode, 'town', 'termina el viaje');
assert.ok(!nov.inv.some((it) => it && it.id === 'cola_rata'), 'vendió los trofeos');
assert.ok(nov.bank.some((it) => it && it.id === 'diamante'), 'guardó la gema en el banco');
assert.ok(nov.bankGold > 0 || nov.gold <= 1500, 'guardó el oro sobrante en el banco');
assert.ok(nov.inv.some((it) => it && ITEMS[it.id] && ITEMS[it.id].heal), 'tiene pociones');

// recogen botín del suelo
const hunter = game.bots.find((b) => b.ai.role === 'novato' && b !== nov && b.ai.mode !== 'town' && world.zoneAt(b.x, b.y).id === 'prado');
if (hunter) {
  hunter.inv.fill(null); hunter.ai.mode = 'hunt'; hunter.target = null;
  const gx = hunter.x + 1, gy = hunter.y;
  if (world.isWalkable(gx, gy) && !game.mgrid.has(gy * world.W + gx) && world.tiles[gy * world.W + gx] !== world.T.PORTAL) {
    const g = game.addGround('cola_rata', 1, gx, gy, {});
    for (let i = 0; i < 18 && game.ground.has(g.gid); i++) advance(5000);
    assert.ok(!game.ground.has(g.gid), 'un bot recogió el objeto del suelo');
  }
}

// un jugador real llega a la antecámara mientras los bots hacen la Raid: no se van, y el jugador puede unirse
const acc = store.create('Humano', 'secreto', '#ff8800');
const ws = { open: true, p: null, got: [], send(s) { this.got.push(JSON.parse(s)); }, close() {} };
const me = game.attach(acc, ws);
for (let i = 0; i < 80 && !(game.raid && game.raid.botRun); i++) advance(10000);
assert.ok(game.raid && game.raid.botRun, 'los bots tienen una Raid en curso');
{
  const H = world.RAID.rooms[0];
  me.x = H.start[0] + 3; me.y = H.cy; me.tpSeq++;
  game.handle(me, { t: 'raid_go' });
  advance(2000);
  assert.ok(game.raid && game.raid.members.has(me.key), 'el jugador real se une a la Raid de los bots');
  assert.ok([...game.raid.members].some((k) => k.startsWith('bot:')), 'y los bots siguen dentro');
}
// zonas con PvP: los bots cazan allí y se defienden de un jugador real que los ataca (no empiezan peleas)
{
  const av = game.bots.find((b) => b.ai.role === 'aventurero');
  av.ai.zone = 'bosque'; av.ai.zoneUntil = t + 1e9; av.ai.mode = 'hunt';
  for (let i = 0; i < 240 && world.zoneAt(av.x, av.y).id !== 'bosque'; i++) advance(2500);
  assert.strictEqual(world.zoneAt(av.x, av.y).id, 'bosque', 'un aventurero llega al Bosque Maldito (PvP)');
  me.x = av.x + 1; me.y = av.y; me.tpSeq++; me.hp = me.maxHp;
  me.xp = 50 * 9 * 9;            // nivel 10: dentro del PvP
  game.recalc(me); me.hp = me.maxHp;
  assert.ok(game.canPvp(me, av), 'ambos pueden pelear entre sí');
  game.hurtPlayer(av, 5, me, t, me.name);
  assert.strictEqual(av.target, me.id, 'el bot se defiende del jugador que lo ataca');
}
// ni el ranking /top ni el comercio los incluyen
game.handle(me, { t: 'chat', text: '/top' });
const topMsg = ws.got.filter((m) => m.t === 'chat').pop().m;
assert.ok(!game.bots.some((b) => topMsg.includes(b.name)), '/top no lista bots');
console.log('OK bots (' + game.bots.length + ' aventureros; jefe derrotado, Raid hasta cámara ' + room + ')');
