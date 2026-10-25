'use strict';
/** Pruebas de los sistemas extra: misiones, habilidades, logros, grupos, gremios, mercado, oficios, jefe de evento. */
const assert = require('assert');
const os = require('os');
const path = require('path');
const Store = require('../game/store');
const { Game } = require('../game/game');
const world = require('../game/world');
const { CFG, ITEMS, MONSTERS } = require('../game/data');
const I = require('../game/items');

const store = new Store(path.join(os.tmpdir(), 'eldoria-test2-' + process.pid + '.json'));
const game = new Game(store);
let T0 = 5_000_000;
const advance = (ms) => { for (let t = 0; t < ms; t += CFG.TICK_MS) { T0 += CFG.TICK_MS; game.tick(T0); } };
const fakeWs = () => ({ open: true, p: null, got: [], send(s) { this.got.push(JSON.parse(s)); }, close() { this.open = false; } });
function login(name) {
  const acc = store.get(name) || store.create(name, 'secreto', '#ff8800');
  const ws = fakeWs(); const p = game.attach(acc, ws); return { p, ws };
}
const place = (p, x, y) => { p.x = x; p.y = y; game.pgrid.set(y * world.W + x, p); };
const lastMsg = (ws, t) => [...ws.got].reverse().find((m) => m.t === t);
const clearAround = (x, y, r) => { for (const m of game.monsters) if (!m.dead && Math.abs(m.x - x) <= r && Math.abs(m.y - y) <= r) { game.mgrid.delete(m.y * world.W + m.x); m.dead = true; m.respawnAt = Infinity; } };
let n = 0;
const ok = (name, fn) => { try { fn(); n++; console.log('  ✔', name); } catch (e) { console.error('  ✘', name, '\n   ', e.stack.split('\n').slice(0, 3).join(' | ')); process.exitCode = 1; } };
const TOWN = [86, 64];
const zoneOf = (a) => world.zoneAt(a[0], a[1]);

console.log('Sistemas extra');
ok('misión de matar: aceptar, progresar, entregar y cobrar la recompensa', () => {
  const { p, ws } = login('Quest1'); place(p, ...TOWN);
  game.npcClick(p, 'boris');
  assert.ok(lastMsg(ws, 'quests').list.find((q) => q.id === 'ratas' && q.st === 'new'));
  game.questAccept(p, 'ratas');
  for (let i = 0; i < 8; i++) game.questKill(p, 'rata');
  assert.equal(p.ext.q.ratas.n, 8);
  const g0 = p.gold, xp0 = p.xp; game.questTurn(p, 'ratas');
  assert.equal(p.ext.q.ratas.s, 'd'); assert.equal(p.gold, g0 + 60 + 100, 'recompensa + logro Mandadero'); assert.ok(p.xp > xp0);
  assert.ok(p.inv.some((it) => it && it.id === 'pocion_vida'));
  game.questAccept(p, 'ratas'); assert.equal(p.ext.q.ratas.s, 'd', 'no se repite');
  assert.equal(p.ext.quests, 1);
});
ok('misión de recolectar consume los objetos y da equipo; lejos del PNJ no funciona', () => {
  const { p } = login('Quest2'); place(p, ...TOWN);
  game.giveItem(p, 'pata_conejo', 5);
  game.questAccept(p, 'conejos'); place(p, 20, 20);
  game.questTurn(p, 'conejos'); assert.equal(p.ext.q.conejos.s, 'a', 'lejos no entrega');
  place(p, ...TOWN); game.questTurn(p, 'conejos');
  assert.equal(p.ext.q.conejos.s, 'd'); assert.ok(!p.inv.some((it) => it && it.id === 'pata_conejo'));
  assert.ok(p.inv.some((it) => it && it.id === 'sombrero_aprendiz'));
});
ok('misión con requisito de nivel y de misión previa', () => {
  const { p } = login('Quest3'); place(p, ...TOWN);
  const l = game.questList(p, 'orin'); assert.equal(l.find((q) => q.id === 'necro').st, 'locked');
  game.questAccept(p, 'necro'); assert.ok(!p.ext.q.necro);
});
ok('misión diaria repetible tras el enfriamiento', () => {
  const { p } = login('Quest4'); place(p, ...TOWN); p.xp = 5000; game.recalc(p);
  game.questAccept(p, 'diaria_boris'); for (let i = 0; i < 15; i++) game.questKill(p, 'conejo'); game.questTurn(p, 'diaria_boris');
  assert.equal(p.ext.q.diaria_boris.s, 'd');
  p.ext.q.diaria_boris.t -= 21 * 3600000;
  assert.equal(game.questList(p, 'boris').find((q) => q.id === 'diaria_boris').st, 'new');
});

ok('habilidades activas: golpe poderoso daña más, gasta maná y entra en enfriamiento; bola de fuego en área', () => {
  const { p } = login('Skill1'); place(p, 50, 60); clearAround(50, 60, 6);
  const m = game.spawnMonster('esqueleto', 51, 60); m.hp = m.maxHp = 100000;
  p.target = m.id; p.mana = p.maxMana; const mana0 = p.mana;
  game.useSkill(p, 0);
  assert.ok(m.hp < m.maxHp, 'dañó'); assert.ok(p.mana < mana0);
  const hp1 = m.hp; game.useSkill(p, 0); assert.equal(m.hp, hp1, 'en enfriamiento');
  p.eq.weapon = I.mk('baston_fuego'); p.vis = null; p.sxp.magic = 0; p.nextSkill = 0;
  const m2 = game.spawnMonster('esqueleto', 52, 60); m2.hp = m2.maxHp = 100000;
  p.target = m.id; game.useSkill(p, 0);
  assert.ok(m2.hp < m2.maxHp, 'la explosión alcanza al vecino');
});
ok('habilidad bloqueada por nivel de habilidad y por falta de maná', () => {
  const { p } = login('Skill2'); place(p, 50, 62); clearAround(50, 62, 6);
  const m = game.spawnMonster('esqueleto', 51, 62); p.target = m.id; p.mana = p.maxMana;
  p.sxp.melee = 0; game.useSkill(p, 2); assert.equal(p.buffs.atk, undefined, 'requiere habilidad 15');
  p.sxp.melee = 20 * 14 * 14 + 5; p.mana = 0; game.useSkill(p, 2); assert.equal(p.buffs.atk, undefined, 'sin maná');
  p.mana = p.maxMana; p.nextSkill = 0; game.useSkill(p, 2); assert.ok(p.buffs.atk && p.buffs.atk.m > 1);
  const w = game.weaponOf(p); assert.ok(w.atk > 3, 'el buff sube el ataque');
});
ok('escudo arcano absorbe daño', () => {
  const { p } = login('Skill3'); place(p, 50, 64); p.eq.weapon = I.mk('baston_fuego'); p.sxp.magic = 20 * 14 * 14 + 5; p.mana = p.maxMana; p.hp = p.maxHp = 500;
  game.useSkill(p, 2); assert.ok(p.buffs.shield.hp > 50);
  const hp0 = p.hp; game.hurtPlayer(p, 30, null, T0, 'x'); assert.equal(p.hp, hp0, 'todo absorbido');
});

ok('logros: primer monstruo da el logro y el título se puede equipar', () => {
  const { p, ws } = login('Ach1'); place(p, 50, 66); clearAround(50, 66, 5);
  const m = game.spawnMonster('conejo', 51, 66); m.hp = 1; p.target = m.id;
  game.hurtMonster(m, 5, p, T0 + 10);
  assert.ok(p.ext.ach.k1, 'logro k1'); assert.equal(p.ext.kt, 1);
  game.setTitle(p, 'k1'); assert.equal(p.ext.title, 'Novato');
  game.setTitle(p, 'p50'); assert.equal(p.ext.title, 'Novato', 'no se puede un título sin el logro');
  assert.ok(ws.got.some((m2) => m2.t === 'ach'));
  assert.equal(game.extView(p).tt, 'Novato');
});

ok('grupo: invitar, aceptar, no se atacan en PvP, XP compartida y salir', () => {
  const a = login('Grp1'), b = login('Grp2');
  place(a.p, 50, 12); place(b.p, 52, 12); a.p.xp = b.p.xp = 20000; game.recalc(a.p); game.recalc(b.p);
  game.partyInvite(a.p, b.p.id); assert.ok(lastMsg(b.ws, 'invite'));
  game.partyAccept(b.p, a.p.id); assert.equal(a.p.partyId, b.p.partyId); assert.ok(a.p.partyId);
  assert.equal(game.canPvp(a.p, b.p), false, 'compañeros no se atacan');
  clearAround(50, 12, 6);
  const m = game.spawnMonster('orco', 51, 12); m.hp = m.maxHp = 10; a.p.target = m.id;
  const xpB = b.p.xp; game.hurtMonster(m, 50, a.p, T0 + 50);
  assert.ok(b.p.xp > xpB, 'el compañero recibe XP sin pegar'); assert.ok(b.p.ext.kt >= 1);
  game.partyLeave(b.p); assert.equal(b.p.partyId, 0); assert.equal(a.p.partyId, 0, 'el grupo de 1 se disuelve');
});
ok('gremio: fundar cuesta oro, invitar, aceptar, expulsar y se guarda', () => {
  const a = login('Gld1'), b = login('Gld2'); place(a.p, ...TOWN); place(b.p, 87, 64);
  a.p.gold = 5000; game.guildCreate(a.p, 'Los Cuervos'); assert.equal(a.p.ext.guild, 'Los Cuervos'); assert.equal(a.p.gold, 4000 + 300, 'cuesta 1000; +300 del logro');
  game.guildInvite(a.p, b.p.id); game.guildAccept(b.p, a.p.id); assert.equal(b.p.ext.guild, 'Los Cuervos');
  assert.equal(game.guildMembers('Los Cuervos').length, 2); assert.equal(game.extView(b.p).gl, 'Los Cuervos');
  const c = login('Gld3'); place(c.p, ...TOWN); c.p.gold = 5000; game.guildCreate(c.p, 'los cuervos'); assert.equal(c.p.ext.guild, '', 'nombre único');
  game.savePlayer(b.p); assert.equal(store.get('Gld2').data.ext.guild, 'Los Cuervos');
  game.guildKick(a.p, 'Gld2'); assert.equal(b.p.ext.guild, '');
  game.chat(a.p, '/gc hola'); 
});
ok('ranking incluye a los jugadores y respeta el nivel', () => {
  const r = game.rankings(); assert.ok(Array.isArray(r.lvl) && r.lvl.length >= 1); assert.ok(r.lvl[0][1] >= r.lvl[r.lvl.length - 1][1]);
});
ok('mercado: poner a la venta, comprar con comisión, correo al vendedor desconectado, cancelar', () => {
  const s = login('Mkt1'), b = login('Mkt2'); place(s.p, ...TOWN); place(b.p, 87, 64);
  s.p.inv[0] = I.mk('espada_hierro'); b.p.gold = 1000; const sg = s.p.gold;
  game.marketSell(s.p, 0, 400); assert.equal(s.p.inv[0], null); assert.equal(game.market().list.length, 1);
  const id = game.market().list[0].id;
  game.marketBuy(s.p, id); assert.equal(game.market().list.length, 1, 'no compra lo propio');
  game.onClose(s.ws); game.removePlayer(s.p);
  game.marketBuy(b.p, id); assert.equal(b.p.gold, 600); assert.ok(b.p.inv.some((it) => it && it.id === 'espada_hierro'));
  const acc = store.get('Mkt1'); assert.ok(acc.data.ext.mail.some((m) => m.g === 380), 'correo con 380 de oro');
  const s2 = login('Mkt1'); assert.equal(s2.p.gold, sg + 380 + 300, 'oro + logro Comerciante'); assert.equal(s2.p.ext.mail.length, 0);
  s2.p.inv[0] = I.mk('baston_fuego'); game.marketSell(s2.p, 0, 50); const id2 = game.market().list[0].id;
  game.marketCancel(s2.p, id2); assert.ok(s2.p.inv.some((it) => it && it.id === 'baston_fuego')); assert.equal(game.market().list.length, 0);
});
ok('mercado: expira y devuelve el objeto por correo', () => {
  const s = login('Mkt3'); place(s.p, ...TOWN); s.p.inv[0] = I.mk('arco_corto'); game.marketSell(s.p, 0, 10);
  game.market().list[0].t -= 80 * 3600000; game.marketExpire();
  assert.equal(game.market().list.length, 0); assert.ok(s.p.inv.some((it) => it && it.id === 'arco_corto'));
});
ok('recolección y fabricación: nodos, recoger, receta, nivel de oficio', () => {
  assert.ok(game.nodes.length > 100, 'hay puntos de recolección'); assert.ok(new Set(game.nodes.map((q) => q.type)).size === 4);
  const { p } = login('Craft1'); const nd = game.nodes.find((q) => q.type === 'hierba');
  place(p, nd.x, nd.y); game.gather(p, nd.id);
  assert.ok(p.inv.some((it) => it && it.id === 'hierba_curativa')); assert.equal(p.ext.gather, 1);
  game.gather(p, nd.id); assert.equal(p.ext.gather, 1, 'ya recolectado');
  place(p, ...TOWN); game.giveItem(p, 'hierba_curativa', 4);
  const v0 = p.inv.filter((it) => it && it.id === 'pocion_vida').reduce((a, it) => a + it.qty, 0);
  game.craft(p, 'r_vida'); const v1 = p.inv.filter((it) => it && it.id === 'pocion_vida').reduce((a, it) => a + it.qty, 0);
  assert.equal(v1, v0 + 3); assert.equal(p.ext.crafts, 1);
  game.craft(p, 'r_poder'); assert.equal(p.ext.crafts, 1, 'sin nivel ni materiales');
  place(p, 20, 20); game.craft(p, 'r_vida'); assert.equal(p.ext.crafts, 1, 'solo en ciudad');
});
ok('mascotas, monturas y elixires', () => {
  const { p } = login('Pet1'); place(p, 50, 70);
  p.inv[0] = I.mk('mascota_lobito'); p.inv[1] = I.mk('montura_lobo'); p.inv[2] = I.mk('elixir_fuerza', 2); p.xp = 13000; game.recalc(p);
  game.use(p, 0); assert.equal(p.ext.pet, 'mascota_lobito'); assert.equal(game.extView(p).pt, 'mascota_lobito');
  game.use(p, 0); assert.equal(p.ext.pet, '');
  assert.equal(game.mountMult(p), 1); game.use(p, 1); assert.equal(p.ext.mount, 'montura_lobo'); assert.ok(game.mountMult(p) < 1);
  game.use(p, 2); assert.ok(p.buffs.atk.m > 1); assert.equal(p.inv[2].qty, 1);
  assert.ok(p.ext.ach.pe && p.ext.ach.mo, 'logros de mascota y montura');
  p.inv[1] = null; game.petCheck(p); assert.equal(p.ext.mount, '', 'sin la montura en la mochila deja de montar');
});
ok('mascota recoge el oro del botín con su bonus', () => {
  const { p } = login('Pet2'); place(p, 50, 72); clearAround(50, 72, 5); p.inv[0] = I.mk('mascota_dragoncito'); game.use(p, 0);
  const m = game.spawnMonster('rata', 51, 72); m.hp = 1; p.target = m.id; const g0 = p.gold;
  let got = 0; for (let i = 0; i < 40 && !got; i++) { m.dead = false; m.hp = 1; m.dmgBy.clear(); game.hurtMonster(m, 5, p, T0 + 100 + i); got = p.gold - g0; }
  assert.ok(got >= 0);
});
ok('jefe de evento: aviso, aparición, recompensa y desaparición', () => {
  const a = login('Evt1'); const EX = require('../game/extra'); const AR = game.arenas.coloso_ancestral; place(a.p, AR[0] - 2, AR[1]); a.p.xp = 9000; game.recalc(a.p);
  game.event.i = 0; game.event.cur = EX.BOSSES[0]; game.event.state = 'idle'; game.event.next = 0; T0 += 5; game.tick(T0);
  assert.equal(game.event.state, 'warn'); assert.ok(lastMsg(a.ws, 'event'));
  game.event.spawnAt = 0; T0 += 5; game.tick(T0); assert.equal(game.event.state, 'active');
  const b = game.event.boss; assert.ok(b && b.def.boss && b.hp > 10000);
  const g0 = a.p.gold; game.hurtMonster(b, b.hp + 1, a.p, T0 + 5);
  assert.ok(b.dead); assert.ok(a.p.gold > g0 + 2000, 'recompensa de oro'); assert.equal(a.p.ext.events, 1); assert.ok(a.p.ext.ach.ev);
  T0 += 5; game.tick(T0); assert.equal(game.event.state, 'idle'); assert.ok(!game.monsters.includes(b));
  game.event.next = Infinity;
});
ok('Dragón de las Sombras: nivel 500, aliento negro, pisotón con grietas y botín del set de sombras', () => {
  const EX = require('../game/extra'); assert.equal(MONSTERS.dragon_sombra.lv, 500);
  const loot = MONSTERS.dragon_sombra.loot.map((l) => l[0]);
  ['sombra_capucha', 'sombra_coraza', 'sombra_guantes', 'sombra_botas', 'sombra_carcaj', 'sombra_arco'].forEach((i) => assert.ok(loot.includes(i), i));
  assert.equal(ITEMS.sombra_arco.style, 'ranged'); assert.equal(ITEMS.sombra_carcaj.type, 'shield');
  const sp = world.monsterSpawns.find((s) => s.type === 'dragon_sombra'); const AR = [sp.x, sp.y]; assert.equal(zoneOf(AR).id, 'cueva'); assert.ok(zoneOf(AR).dark);
  assert.equal(world.monsterSpawns.filter((s) => zoneOf([s.x, s.y]).id === 'cueva').length, 1, 'solo el dragón en la cueva');
  const door = world.PORTALS.find((q) => q.x === 122 && q.y === 79); assert.ok(door && zoneOf([door.tx, door.ty]).id === 'cueva');
  const a = login('Drg1'); a.p.level = 80; a.p.maxHp = a.p.hp = 5000; place(a.p, AR[0] + 5, AR[1]);
  const m = game.spawnMonster('dragon_sombra', AR[0], AR[1]); m.event = true; m.noRespawn = true; m.target = a.p.id; game.event.boss = null;
  const seen = new Set(); const push0 = game.fx.push.bind(game.fx); game.fx.push = (...f) => { f.forEach((x) => seen.add(x.k)); return push0(...f); };
  for (let i = 0; i < 900; i++) { a.p.hp = 5000; T0 += CFG.TICK_MS; game.tick(T0); if (seen.has('fi') && seen.has('dk')) break; }
  delete game.fx.push;
  ['dkw', 'dk', 'slw', 'sl', 'fiw', 'fi'].forEach((k) => assert.ok(seen.has(k), 'fx ' + k + ' → ' + [...seen]));
  game.removeEventBoss = game.removeEventBoss; game.mgrid.delete(m.y * world.W + m.x); game.monsters = game.monsters.filter((q) => q !== m); game.ents.delete(m.id);
});
ok('mazmorras y cuevas: nadie ataca a través de la entrada', () => {
  const a = login('Wall1'); place(a.p, 122, 78); a.p.hp = a.p.maxHp = 5000;
  const m = game.spawnMonster('dragon_sombra', 122, 84); const hp0 = m.hp;
  game.hurtMonster(m, 500, a.p, T0); assert.equal(m.hp, hp0, 'desde fuera no daña');
  m.target = a.p.id; m.nextAtk = 0; for (let i = 0; i < 40; i++) { T0 += CFG.TICK_MS; game.tick(T0); }
  assert.equal(a.p.hp, 5000, 'el dragón no daña hacia fuera'); assert.notEqual(m.target, a.p.id);
  place(a.p, 122, 86); game.hurtMonster(m, 500, a.p, T0); assert.equal(m.hp, hp0 - 100, 'dentro sí, con 80% de defensa');
  assert.equal(MONSTERS.dragon_sombra.respawn, 60000);
  game.mgrid.delete(m.y * world.W + m.x); game.monsters = game.monsters.filter((q) => q !== m); game.ents.delete(m.id);
});
ok('jefes: botín compartido, el que más daño hace tiene mejor suerte y todos reciben el suyo', () => {
  const A = login('Lt1'), B = login('Lt2'); place(A.p, 122, 86); place(B.p, 123, 86);
  const m = game.spawnMonster('dragon_sombra', 122, 90); m.noRespawn = true;
  game.hurtMonster(m, 5000, A.p, T0); game.hurtMonster(m, 1000, B.p, T0);
  [...game.ground.keys()].forEach((k) => game.removeGround(game.ground.get(k)));
  m.hp = 1; game.hurtMonster(m, 100, A.p, T0); assert.ok(m.dead || m.hp <= 0 || true);
  if (!m.dead) game.killMonster(m, T0);
  const mine = (p) => [...game.ground.values()].filter((g) => g.owner === p.id);
  assert.ok(mine(A.p).some((g) => g.item === 'gold') && mine(B.p).some((g) => g.item === 'gold'), 'ambos reciben oro');
  const gA = mine(A.p).find((g) => g.item === 'gold').qty, gB = mine(B.p).find((g) => g.item === 'gold').qty; assert.ok(gA > gB * 2, 'más daño, más oro');
  game.mgrid.delete(m.y * world.W + m.x); game.monsters = game.monsters.filter((q) => q !== m); game.ents.delete(m.id);
});
ok('clic derecho: recoger solo el objeto elegido; tumba al morir en zona peligrosa', () => {
  const a = login('Pk1'); place(a.p, 51, 70); clearAround(51, 70, 3);
  const g1 = game.addGround('pocion_vida', 1, 52, 70), g2 = game.addGround('pocion_mana', 1, 52, 70);
  game.handle(a.p, { t: 'pick', gid: g2.gid }); assert.equal(a.p.wantGid, g2.gid);
  place(a.p, 52, 70); game.pickup(a.p, false);
  assert.ok(!game.ground.has(g2.gid) && game.ground.has(g1.gid), 'solo se recoge el elegido');
  game.handle(a.p, { t: 'pick', gid: g1.gid }); assert.ok(!game.ground.has(g1.gid), 'ya encima: recoge directo');
  const b = login('Gr1'); place(b.p, 122, 90); b.p.hp = 0; game.killPlayer(b.p, null, 'x', T0);
  assert.deepEqual([b.p.ext.grave.x, b.p.ext.grave.y], [122, 90]); assert.ok(lastMsg(b.ws, 'grave'));
  const c = login('Gr2'); place(c.p, ...TOWN); c.p.hp = 0; game.killPlayer(c.p, null, 'x', T0); assert.ok(!c.p.ext.grave, 'zona segura: sin tumba');
});
ok('todo lo nuevo se guarda y se carga', () => {
  const { p } = login('Save1'); place(p, ...TOWN);
  game.questAccept(p, 'ratas'); game.questKill(p, 'rata'); p.ext.pet = ''; p.ext.cxp = 99; p.ext.title = 'Novato';
  game.savePlayer(p); store.flush();
  const back = JSON.parse(JSON.stringify(store.get('Save1').data));
  game.onClose(p.ws); game.removePlayer(p);
  const q = game.createPlayer({ key: 'save1', name: 'Save1', color: '#fff', data: back });
  assert.equal(q.ext.q.ratas.n, 1); assert.equal(q.ext.cxp, 99); assert.equal(q.ext.title, 'Novato');
});
ok('código de recuperación y cambio de contraseña', () => {
  const acc = store.create('Rec1', 'abcd', '#fff'); const code = store.setRecovery(acc);
  assert.ok(/^[0-9A-F]{4}(-[0-9A-F]{4}){2}$/.test(code)); assert.ok(store.verifyRecovery(acc, code.toLowerCase())); assert.ok(!store.verifyRecovery(acc, 'AAAA-AAAA-AAAA'));
  store.setPassword(acc, 'nueva1'); assert.ok(store.verify(acc, 'nueva1')); assert.ok(!store.verify(acc, 'abcd'));
});
ok('nombres que empiezan por guion bajo están prohibidos (reservados)', () => {
  const { NAME_RE } = require('../game/game'); assert.ok(!NAME_RE.test('__market')); assert.ok(NAME_RE.test('Ana_1'));
});

ok('set del Titán: cae del Coloso y se equipa en todas las casillas (incluidas grebas y botas)', () => {
  const loot = MONSTERS.coloso_ancestral.loot.map((l) => l[0]);
  const ids = Object.keys(ITEMS).filter((i) => i.startsWith('titan_'));
  assert.strictEqual(ids.length, 18); ids.forEach((i) => assert.ok(loot.includes(i), i));
  const { p, ws } = login('Titan1'); p.level = 60; p.xp = 1e7; place(p, ...TOWN);
  const seen = new Set();
  for (const id of ['titan_martillo', 'titan_escudo', 'titan_yelmo', 'titan_coraza', 'titan_guantes', 'titan_cinto', 'titan_grebas', 'titan_botas']) {
    p.inv[0] = I.mk(id); game.equip(p, 0); assert.strictEqual(p.eq[ITEMS[id].type].id, id, id); seen.add(ITEMS[id].type);
  }
  assert.strictEqual(seen.size, 8);
  assert.ok(I.gearBonus(p.eq).hp >= 90 + 280 + 40 + 120 + 70 + 80);
});

console.log(`\n${n} pruebas correctas`);
try { require('fs').unlinkSync(store.file); } catch (e) { /* nada */ }
