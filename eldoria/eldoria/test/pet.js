'use strict';
/** Las mascotas recogen el botín:  node test/pet.js */
const assert = require('assert');
const os = require('os');
const path = require('path');
const Store = require('../game/store');
const { Game } = require('../game/game');
const world = require('../game/world');
const { CFG } = require('../game/data');

const store = new Store(path.join(os.tmpdir(), 'eldoria-pet-' + process.pid + '.json'));
const game = new Game(store);
let t = 5_000_000; game.now = t;
const advance = (ms) => { for (let i = 0; i < ms; i += CFG.TICK_MS) { t += CFG.TICK_MS; game.tick(t); } };
const ws = { open: true, p: null, got: [], send(s) { this.got.push(JSON.parse(s)); }, close() {} };
const me = game.attach(store.create('Domador', 'secreto', '#4aa3ff'), ws);
const other = game.attach(store.create('Otro', 'secreto', '#aa3333'), { open: true, p: null, got: [], send() {}, close() {} });
me.x = 90; me.y = 66; other.x = 94; other.y = 66;
const free = me.inv.filter((i) => !i).length;

// sin mascota: el botín lejano se queda donde está
const g1 = game.addGround('cola_rata', 2, 94, 68, { prot: 0, owner: me.id });
advance(3000);
assert.ok(game.ground.has(g1.gid), 'sin mascota no recoge nada');

// con mascota: recoge lo suyo (oro y objetos) a distancia, y no lo de otros
me.inv[0] = { id: 'mascota_lobito', qty: 1 };
me.ext.pet = 'mascota_lobito';
const g2 = game.addGround('gold', 40, 93, 66, { prot: t + 30000, owner: me.id });
const g3 = game.addGround('pata_conejo', 1, 92, 64, {});
g3.petFor = me.id;
const g4 = game.addGround('pata_conejo', 1, 93, 64, { prot: t + 30000, owner: other.id });
const gold0 = me.gold;
advance(4000);
assert.ok(!game.ground.has(g1.gid), 'recoge el objeto propio');
assert.ok(!game.ground.has(g2.gid) && me.gold > gold0, 'recoge el oro');
assert.ok(!game.ground.has(g3.gid), 'recoge el botín sin dueño de su presa');
assert.ok(game.ground.has(g4.gid), 'no toca el botín protegido de otro jugador');
assert.ok(me.inv.some((i) => i && i.id === 'cola_rata'), 'el objeto está en la mochila');

// demasiado lejos: se queda
const g5 = game.addGround('cola_rata', 1, me.x + 12, me.y, { prot: 0, owner: me.id });
advance(3000);
assert.ok(game.ground.has(g5.gid), 'fuera del radio no lo recoge');
console.log('OK mascotas recogen botín');
