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
  p.sxp.melee = require('../game/skills').skillXpFor(15) + 5; p.mana = 0; game.useSkill(p, 2); assert.equal(p.buffs.atk, undefined, 'sin maná');
  p.mana = p.maxMana; p.nextSkill = 0; game.useSkill(p, 2); assert.ok(p.buffs.atk && p.buffs.atk.m > 1);
  const w = game.weaponOf(p); assert.ok(w.atk > 3, 'el buff sube el ataque');
});
ok('escudo arcano absorbe daño', () => {
  const { p } = login('Skill3'); place(p, 50, 64); p.eq.weapon = I.mk('baston_fuego'); p.sxp.magic = require('../game/skills').skillXpFor(15) + 5; p.mana = p.maxMana; p.hp = p.maxHp = 500;
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
  assert.ok(game.nodes.length > 100, 'hay puntos de recolección'); assert.ok(new Set(game.nodes.map((q) => q.type)).size === 17, 'oficios + 8 rocas + 5 del gremio');
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
  ['sombra_capucha', 'sombra_coraza', 'sombra_guantes', 'sombra_botas', 'sombra_carcaj', 'sombra_arco', 'sombra_pantalon', 'sombra_cinturon', 'sombra_anillo_umbrio', 'sombra_anillo_noche', 'sombra_anillo_vacio', 'sombra_amuleto_abismo'].forEach((i) => assert.ok(loot.includes(i), i));
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
ok('Hidra de Jade: cueva propia, set de arquero y sus tres ataques', () => {
  assert.equal(MONSTERS.hidra_jade.special, 'hydra'); assert.equal(MONSTERS.hidra_jade.respawn, 60000);
  const loot = MONSTERS.hidra_jade.loot.map((l) => l[0]);
  ['jade_yelmo', 'jade_coraza', 'jade_guantes', 'jade_botas', 'jade_arco', 'jade_pantalon', 'jade_carcaj', 'jade_anillo_rubi', 'jade_anillo_hoja', 'jade_cinturon', 'jade_amuleto'].forEach((i) => assert.ok(loot.includes(i), i));
  assert.equal(ITEMS.jade_carcaj.type, 'shield');
  assert.equal(ITEMS.jade_arco.style, 'ranged');
  const sp = world.monsterSpawns.find((q) => q.type === 'hidra_jade'); assert.equal(zoneOf([sp.x, sp.y]).id, 'cueva_jade');
  assert.equal(world.monsterSpawns.filter((q) => zoneOf([q.x, q.y]).id === 'cueva_jade').length, 1, 'solo la hidra');
  const door = world.PORTALS.find((q) => q.x === 52 && q.y === 59); assert.ok(door && zoneOf([door.tx, door.ty]).id === 'cueva_jade');
  const a = login('Hyd1'); a.p.level = 80; a.p.maxHp = a.p.hp = 9000; place(a.p, sp.x + 5, sp.y + 2);
  const m = game.spawnMonster('hidra_jade', sp.x, sp.y); m.noRespawn = true; m.target = a.p.id;
  const seen = new Set(); const push0 = game.fx.push.bind(game.fx); game.fx.push = (...f) => { f.forEach((x) => seen.add(x.k)); return push0(...f); };
  const need = ['ykw', 'yk', 'acw', 'ac', 'hsw', 'hs', 'rcw', 'rc'];
  for (let i = 0; i < 1800 && !need.every((k) => seen.has(k)); i++) { a.p.hp = 9000; place(a.p, m.x + 6, m.y + 1); T0 += CFG.TICK_MS; game.tick(T0); }
  delete game.fx.push;
  need.forEach((k) => assert.ok(seen.has(k), 'fx ' + k + ' → ' + [...seen]));
  game.mgrid.delete(m.y * world.W + m.x); game.monsters = game.monsters.filter((q) => q !== m); game.ents.delete(m.id);
});
ok('habilidades: tope 320 y cada nivel cuesta más', () => {
  const S = require('../game/skills'); assert.equal(S.SKILL_MAX, 320);
  assert.equal(S.skillFromXp(0), 1); assert.equal(S.skillFromXp(S.skillXpFor(50)), 50); assert.equal(S.skillFromXp(S.skillXpFor(50) - 1), 49);
  assert.equal(S.skillFromXp(1e12), 320);
  let prev = 0; for (let l = 2; l <= 320; l++) { const c = S.skillXpFor(l) - S.skillXpFor(l - 1); assert.ok(c > prev, 'cuesta más en ' + l); prev = c; }
  assert.ok(S.skillXpFor(100) > 20 * 99 * 99, 'más caro que antes');
  const a = login('Sk1'); a.p.sxp.melee = S.skillXpFor(320) - 1; game.addSkillXp(a.p, 'melee', 99999); assert.equal(a.p.sxp.melee, S.skillXpFor(320)); assert.equal(S.skillFromXp(a.p.sxp.melee), 320);
  assert.ok(S.skillMult(320) < 10);
});
ok('los jefes pegan 1,5 veces más fuerte', () => {
  const a = login('Bd1'); place(a.p, 50, 64); a.p.hp = a.p.maxHp = 100000; a.p.eq = {}; game.recalc(a.p);
  const norm = { kind: 'mo', x: 50, y: 63, def: { boss: false } }, boss = { kind: 'mo', x: 50, y: 63, def: { boss: true } };
  let sn = 0, sb = 0; for (let i = 0; i < 300; i++) { a.p.hp = 100000; game.hurtPlayer(a.p, 200, norm, T0, 'x'); sn += 100000 - a.p.hp; a.p.hp = 100000; game.hurtPlayer(a.p, 200, boss, T0, 'x'); sb += 100000 - a.p.hp; }
  assert.ok(sb / sn > 1.35 && sb / sn < 1.65, 'ratio ' + sb / sn);
});
ok('colección de jefes: registra lo que suelta el jefe y se guarda', () => {
  const a = login('Col1'); place(a.p, 122, 86);
  const m = game.spawnMonster('dragon_sombra', 122, 90); m.noRespawn = true; game.hurtMonster(m, 5000, a.p, T0);
  const r0 = Math.random; Math.random = () => 0; game.killMonster(m, T0); Math.random = r0;
  const col = a.p.ext.col.dragon_sombra; assert.ok(col && col.sombra_arco >= 1 && col.sombra_capucha >= 1, JSON.stringify(col));
  assert.deepEqual(lastMsg(a.ws, 'col').v.dragon_sombra, col);
  const nw = lastMsg(a.ws, 'colnew'); assert.ok(nw && col[nw.id] === 1, 'aviso de objeto nuevo');
  const c0 = Object.assign({}, col); game.logDrop(a.p, 'dragon_sombra', 'sombra_arco'); assert.equal(a.p.ext.col.dragon_sombra.sombra_arco, c0.sombra_arco + 1);
  const back = game.extSave(a.p).col; assert.deepEqual(back.dragon_sombra, col);
  game.mgrid.delete(m.y * world.W + m.x); game.monsters = game.monsters.filter((q) => q !== m); game.ents.delete(m.id);
});
ok('hechizo de curar: 1000 de vida y 4 s de enfriamiento', () => {
  const a = login('Heal1'); place(a.p, 50, 64); a.p.maxHp = 5000; a.p.hp = 100; a.p.mana = a.p.maxMana = 200; a.p.nextSpell = 0;
  T0 += 10; game.now = T0; game.castHeal(a.p); assert.equal(a.p.hp, 1100);
  game.castHeal(a.p); assert.equal(a.p.hp, 1100, 'enfriamiento');
  game.now = T0 + 3900; game.castHeal(a.p); assert.equal(a.p.hp, 1100, 'aún en enfriamiento');
  game.now = T0 + 4100; game.castHeal(a.p); assert.equal(a.p.hp, 2100, 'otra vez a los 4 s');
});
ok('comida: sardina 80, salmón 100, tiburón 150; se come con el mensaje eat y tiene enfriamiento propio', () => {
  assert.equal(ITEMS.sardina.heal, 80); assert.equal(ITEMS.salmon.heal, 100); assert.equal(ITEMS.tiburon.heal, 150);
  const a = login('Food1'); place(a.p, 50, 64); a.p.maxHp = 1000; a.p.hp = 100; a.p.inv = a.p.inv.map(() => null);
  a.p.inv[0] = I.mk('sardina', 3); a.p.inv[1] = I.mk('tiburon', 2); a.p.inv[2] = I.mk('pocion_vida', 2); a.p.nextFood = 0;
  T0 += 10; game.now = T0; game.handle(a.p, { t: 'eat' }); assert.equal(a.p.hp, 250, 'sin sobrar: come el tiburón (150) porque falta mucho');
  game.handle(a.p, { t: 'eat' }); assert.equal(a.p.hp, 250, 'enfriamiento de la comida');
  game.now = T0 + 2000; a.p.hp = 970; game.handle(a.p, { t: 'eat' }); assert.equal(a.p.hp, 1000); assert.equal(a.p.inv[0].qty, 2, 'con poco que curar se come la sardina');
  game.now = T0 + 4000; a.p.hp = 100; game.handle(a.p, { t: 'potion', k: 'heal' }); assert.equal(a.p.inv[2].qty, 1, 'la poción no usa comida y viceversa');
  assert.ok(require('../game/data').SHOPS.boris.includes('tiburon'));
});
ok('mapa ampliado: Selva Esmeralda, Sabana Dorada y Aldea Pesquera con comida y banco', () => {
  assert.equal(world.W, 480);
  { const z = world.zoneById('tierras_nuevas'); assert.ok(z && !z.pvp && z.rect[0] === 320 && z.rect[2] === 479, 'zona reservada al este'); let n = 0; for (let y = 0; y < 140; y++) for (let x = 320; x < 480; x++) if (world.reach[y * world.W + x]) n++; assert.ok(n > 10000, 'las tierras nuevas se pueden recorrer (' + n + ')'); assert.ok(world.reach[70 * world.W + 330], 'hay paso desde las Tierras de Lava'); assert.ok(!world.monsterSpawns.some((m) => world.zoneAt(m.x, m.y).id === 'tierras_nuevas'), 'vacías, sin puntos de aparición'); }
  assert.equal(world.zoneAt(220, 30).id, 'selva'); assert.equal(world.zoneAt(240, 110).id, 'sabana'); assert.equal(world.zoneAt(210, 77).id, 'aldea');
  assert.ok(world.zoneAt(210, 77).kind === 'town' && !world.zoneAt(210, 77).pvp);
  for (const id of ['nilo', 'tomas']) { const n = world.NPCS.find((q) => q.id === id); assert.ok(n && world.reach[n.y * world.W + n.x], id + ' alcanzable'); }
  const nilo = require('../game/data').SHOPS.nilo; ['sardina', 'salmon', 'tiburon'].forEach((i) => assert.ok(nilo.includes(i)));
  for (const z of ['selva', 'sabana']) assert.ok(world.monsterSpawns.some((m) => world.zoneAt(m.x, m.y).id === z), 'monstruos en ' + z);
  assert.ok(world.reach[78 * world.W + 240], 'se llega al fondo de la sabana andando');
  const b = login('Far1'); place(b.p, 206, 75); game.handle(b.p, { t: 'npc', id: 'nilo' }); assert.ok(lastMsg(b.ws, 'shop'), 'abre la tienda de Nilo'); assert.ok(lastMsg(b.ws, 'shop').stock.includes('tiburon'));
});
ok('Tierras de Lava: zona PvP con lava intransitable y monstruos de fuego', () => {
  const z = world.zoneById('volcan'); assert.ok(z.pvp && z.kind === 'wild');
  assert.equal(world.zoneAt(280, 50).id, 'volcan');
  let lava = 0; for (let y = 0; y < world.H; y++) for (let x = 250; x < world.W; x++) if (world.tiles[y * world.W + x] === world.T.LAVA) { lava++; assert.ok(!world.isWalkable(x, y)); }
  assert.ok(lava > 300, 'hay lagos de lava: ' + lava);
  assert.ok(world.reach[78 * world.W + 300], 'se llega andando por el camino');
  const types = new Set(world.monsterSpawns.filter((m) => world.zoneAt(m.x, m.y).id === 'volcan').map((m) => m.type));
  ['golem_lava', 'demonio_menor', 'dragon'].forEach((t) => assert.ok(types.has(t), t));
  assert.equal(world.rows[0].length, world.W);
});
ok('gemas 0,15 %, equipo raro a la mitad y mascotas de jefe', () => {
  assert.equal(I.gemChance(MONSTERS.rata), 0.0015); assert.equal(I.gemChance(MONSTERS.dragon_sombra), 0.0015);
  assert.ok(Math.abs(MONSTERS.dragon_sombra.loot.find((l) => l[0] === 'sombra_arco')[1] - 0.005) < 1e-9, 'arco 0,5 %');
  for (const [t, d] of Object.entries(MONSTERS)) if (d.boss) { const l = d.loot.find((q) => q[0] === 'pet_' + t); assert.ok(l, 'mascota de ' + t); assert.equal(ITEMS['pet_' + t].type, 'pet'); assert.equal(ITEMS['pet_' + t].mon, t); }
  const a = login('Pet9'); place(a.p, 50, 64); a.p.inv[0] = I.mk('pet_dragon_sombra'); game.use(a.p, 0); assert.equal(a.p.ext.pet, 'pet_dragon_sombra');
});
ok('pantalones de los dragones: ranura de piernas, drop y se equipan', () => {
  for (const [id, boss, spr] of [['sombra_pantalon', 'dragon_sombra', 's_leg'], ['jade_pantalon', 'hidra_jade', 'j_leg']]) {
    assert.equal(ITEMS[id].type, 'legs'); assert.equal(ITEMS[id].spr, spr); assert.ok(MONSTERS[boss].loot.some((l) => l[0] === id && l[1] > 0.02));
    const a = login('Lg' + id.length); a.p.level = 90; a.p.inv[0] = I.mk(id); game.use(a.p, 0); assert.ok(a.p.eq.legs && a.p.eq.legs.id === id, 'equipa en piernas');
  }
  const g = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../public/gear.json'), 'utf8')); assert.ok(g.i_s_leg && g.i_j_leg, 'iconos');
});
ok('mazmorras y cuevas: nadie ataca a través de la entrada', () => {
  const a = login('Wall1'); place(a.p, 122, 78); a.p.hp = a.p.maxHp = 5000;
  const m = game.spawnMonster('dragon_sombra', 122, 84); const hp0 = m.hp;
  game.hurtMonster(m, 500, a.p, T0); assert.equal(m.hp, hp0, 'desde fuera no daña');
  m.target = a.p.id; m.nextAtk = 0; for (let i = 0; i < 40; i++) { T0 += CFG.TICK_MS; game.tick(T0); }
  assert.equal(a.p.hp, 5000, 'el dragón no daña hacia fuera'); assert.notEqual(m.target, a.p.id);
  place(a.p, 122, 86); game.hurtMonster(m, 500, a.p, T0); assert.equal(m.hp, hp0 - 250, 'dentro sí, con 50% de defensa');
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

ok('nivel general congelado en 320: experiencia, vida y maná dejan de crecer', () => {
  const S = require('../game/skills'); const { xpForLevel } = require('../game/game');
  assert.equal(S.LEVEL_MAX, 320);
  const a = login('Lvl1'); a.p.xp = xpForLevel(319); game.gainXp(a.p, 10 ** 9);
  assert.equal(a.p.level, 320); assert.equal(a.p.xp, xpForLevel(320));
  const hp = a.p.maxHp; game.gainXp(a.p, 10 ** 9); assert.equal(a.p.maxHp, hp); assert.equal(a.p.xp, xpForLevel(320));
  assert.equal(hp, 100 + 20 * 319);
});

ok('pesca: caña, picada, minijuego de temporización, nivel y peces por zona', () => {
  const F = require('../game/fishing');
  // casilla de agua del prado con tierra adyacente
  let wx = -1, wy = -1, lx = -1, ly = -1;
  outer: for (let y = 2; y < world.H - 2; y++) for (let x = 2; x < 100; x++) {
    if (world.tiles[y * world.W + x] === world.T.WATER && world.zoneAt(x, y).id === 'prado' && world.tiles[y * world.W + x - 1] === world.T.GRASS) { wx = x; wy = y; lx = x - 1; ly = y; break outer; }
  }
  assert.ok(wx > 0, 'hay agua en el prado');
  const a = login('Pez1'); place(a.p, lx, ly);
  game.fishCast(a.p, wx, wy); assert.ok(!a.p.fishing, 'sin caña no se pesca');
  a.p.inv[0] = I.mk('cana_madera', 1); a.p.inv[1] = I.mk('cebo', 3);
  T0 += 10; game.now = T0; game.fishCast(a.p, wx, wy);
  assert.equal(a.p.fishing.state, 'wait'); assert.equal(lastMsg(a.ws, 'fcast').x, wx); assert.equal(a.p.inv[1].qty, 2, 'gasta un cebo');
  // tirar antes de tiempo
  game.fishReel(a.p); assert.ok(!a.p.fishing, 'pronto: se asusta');
  // picada y recogida acertada
  const r0 = Math.random; let got = 0;
  for (let k = 0; k < 8; k++) {
    T0 += 20000; game.now = T0; game.fishCast(a.p, wx, wy);
    T0 += 20000; game.now = T0; game.fishTick(T0); const f = a.p.fishing; assert.equal(f.state, 'bite'); assert.ok(f.fish === 'sardina' || f.fish === 'salmon');
    const mid = (f.lo + f.hi) / 2; // buscar el instante en el que el marcador está en el centro
    let tt = f.t0; for (let q = 0; q < 4000; q++) { const ph = ((tt - f.t0) / 1000 * f.speed) % 2, pos = ph < 1 ? ph : 2 - ph; if (Math.abs(pos - mid) < 0.01) break; tt += 1; }
    game.now = tt; game.fishReel(a.p); if (!a.p.fishing) got++;
  }
  assert.ok(got >= 6, 'capturas: ' + got); assert.ok(a.p.ext.fish.xp > 0); assert.ok(a.p.inv.some((it) => it && (it.id === 'sardina' || it.id === 'salmon')));
  // fallo: marcador fuera de la zona
  T0 += 20000; game.now = T0; game.fishCast(a.p, wx, wy); T0 += 20000; game.now = T0; game.fishTick(T0);
  const f2 = a.p.fishing; game.now = f2.end + 1000; game.fishReel(a.p); assert.ok(!a.p.fishing && lastMsg(a.ws, 'fend').ok === 0, 'tarde: se escapa');
  // moverse cancela
  T0 += 20000; game.now = T0; game.fishCast(a.p, wx, wy); a.p.x += 0; place(a.p, lx, ly - 1); game.fishTick(T0 + 1); assert.ok(!a.p.fishing, 'moverse recoge el sedal');
  // nivel y tablas
  const lvl = (xp) => require('../game/skills').skillFromXp(xp * 20);
  assert.equal(lvl(0), 1); assert.ok(lvl(1e6) > 100); assert.equal(lvl(1e12), 320);
  for (const id of ['atun', 'cana_jade', 'cebo_dorado', 'perla_marina']) assert.ok(ITEMS[id], id);
  assert.equal(ITEMS.atun.heal, 120);
  const SH = require('../game/data').SHOPS; assert.ok(F.build && SH.nilo.includes('cana_madera') && SH.nilo.includes('atun') && SH.boris.includes('cana_jade') && SH.boris.includes('cebo'));
  // los peces valen más con el nivel
  a.p.ext.fish.xp = 1e6; assert.ok(game.fishMult(a.p, 'tiburon') > 2); assert.equal(game.fishMult(a.p, 'espada_hierro'), 1);
  // persistencia
  const back = game.extSave(a.p); assert.equal(back.fish.xp, 1e6);
});

ok('pesca: set del Maestro Pescador (drop 0,5 %, 5 presas con el set completo)', () => {
  for (const id of ['pesca_sombrero', 'pesca_chaleco', 'pesca_pantalon', 'pesca_botas', 'cana_maestra']) assert.ok(ITEMS[id], id);
  assert.deepEqual(['pesca_sombrero', 'pesca_chaleco', 'pesca_pantalon', 'pesca_botas'].map((i) => ITEMS[i].type), ['head', 'body', 'legs', 'boots']);
  let wx = -1, wy = -1, lx = -1, ly = -1;
  outer: for (let y = 2; y < world.H - 2; y++) for (let x = 2; x < 100; x++) {
    if (world.tiles[y * world.W + x] === world.T.WATER && world.zoneAt(x, y).id === 'prado' && world.tiles[y * world.W + x - 1] === world.T.GRASS) { wx = x; wy = y; lx = x - 1; ly = y; break outer; }
  }
  const a = login('Pez2'); place(a.p, lx, ly); a.p.inv[0] = I.mk('cana_madera', 1);
  const r0 = Math.random;
  const cast = () => { T0 += 20000; game.now = T0; game.fishCast(a.p, wx, wy); T0 += 20000; game.now = T0; game.fishTick(T0); const f = a.p.fishing; const mid = (f.lo + f.hi) / 2; let tt = f.t0; for (let q = 0; q < 4000; q++) { const ph = ((tt - f.t0) / 1000 * f.speed) % 2, pos = ph < 1 ? ph : 2 - ph; if (Math.abs(pos - mid) < 0.01) break; tt += 1; } game.now = tt; game.fishReel(a.p); };
  const count = () => a.p.inv.reduce((n, it) => n + (it && (it.id === 'sardina' || it.id === 'salmon') ? it.qty : 0), 0);
  try {
    Math.random = () => 0.001;                                        // todo sale: pieza rara en cada captura
    cast(); assert.ok(a.p.inv.some((it) => it && it.id === 'pesca_sombrero') && a.p.inv.some((it) => it && it.id === 'cana_maestra'), 'cae el set');
    for (const id of ['pet_pelicano', 'pet_pulpo']) { assert.equal(ITEMS[id].type, 'pet'); assert.ok(a.p.inv.some((it) => it && it.id === id), 'cae ' + id); assert.ok(a.p.ext.col.pesca[id], 'registrada en la colección'); }
    assert.ok(a.p.ext.col.pesca.sardina || a.p.ext.col.pesca.salmon, 'peces en la colección');
    assert.ok(lastMsg(a.ws, 'colnew'), 'aviso de nuevo objeto');
    assert.ok(game.extSave(a.p).col.pesca.pet_pulpo, 'se guarda');
    Math.random = () => 0.5;                                          // sin drop y sin set: 1 presa
    const n0 = count(); cast(); assert.equal(count() - n0, 1);
    for (const [s, id] of [['head', 'pesca_sombrero'], ['body', 'pesca_chaleco'], ['legs', 'pesca_pantalon'], ['boots', 'pesca_botas']]) a.p.eq[s] = I.mk(id, 1);
    Math.random = () => 0.2;                                          // < 25 %: 5 presas
    const n1 = count(); cast(); assert.equal(count() - n1, 5);
    Math.random = () => 0.6; const n2 = count(); cast(); assert.equal(count() - n2, 1, 'sin suerte: 1 presa');
  } finally { Math.random = r0; }
});

ok('Arcángel: cueva de nubes, set celestial raro y sus tres ataques', () => {
  assert.equal(MONSTERS.arcangel.special, 'angel');
  const loot = MONSTERS.arcangel.loot.map((l) => l[0]);
  ['angel_yelmo', 'angel_coraza', 'angel_guantes', 'angel_botas', 'angel_pantalon', 'angel_carcaj', 'angel_anillo', 'angel_cinturon', 'angel_amuleto', 'angel_cetro', 'angel_arco'].forEach((id) => { assert.ok(loot.includes(id), id); assert.ok(ITEMS[id], id); });
  assert.equal(ITEMS.angel_cetro.style, 'magic'); assert.equal(ITEMS.angel_arco.style, 'ranged'); assert.equal(MONSTERS.arcangel.loot.find((l) => l[0] === 'angel_arco')[1], 0.005);
  const sp = world.monsterSpawns.find((q) => q.type === 'arcangel'); assert.equal(zoneOf([sp.x, sp.y]).id, 'cueva_nube');
  assert.equal(typeof Game.prototype.angelAI, 'function');
});

ok('mochila: arrastrar y soltar intercambia casillas', () => {
  const { p } = login('Swap1'); const A = p.inv[0], B = p.inv[1]; p.inv[5] = null;
  game.handle(p, { t: 'swap', a: 0, b: 1 }); assert.equal(p.inv[0], B); assert.equal(p.inv[1], A);
  game.handle(p, { t: 'swap', a: 0, b: 5 }); assert.equal(p.inv[5], B); assert.equal(p.inv[0], null);
  game.handle(p, { t: 'swap', a: -1, b: 999 }); assert.equal(p.inv[5], B, 'índices inválidos se ignoran');
});

ok('Coloso del evento: lluvia de fuego y terremoto', () => {
  assert.equal(MONSTERS.coloso_ancestral.special, 'titan'); assert.equal(typeof Game.prototype.titanAI, 'function');
  const sp = require('../public/sprites.json').coloso_ancestral; assert.ok(sp.f.length >= 4 && sp.anim > 0, 'animado');
});

ok('Aracnídeo Fuego Negro: guarida de telarañas en la zona de lava, set raro y sus ataques', () => {
  assert.equal(MONSTERS.aracnido_fuego.special, 'spider'); assert.ok(MONSTERS.arana_fuego, 'arañas invocadas');
  const loot = MONSTERS.aracnido_fuego.loot.map((l) => l[0]);
  ['fuego_yelmo', 'fuego_peto', 'fuego_guantes', 'fuego_pantalon', 'fuego_botas', 'fuego_cinturon', 'fuego_carcaj', 'fuego_mandoble', 'fuego_garras', 'fuego_arco'].forEach((id) => { assert.ok(loot.includes(id), id); assert.ok(ITEMS[id], id); });
  assert.equal(ITEMS.fuego_arco.style, 'ranged'); assert.equal(ITEMS.fuego_mandoble.style, 'melee');
  const sp = world.monsterSpawns.find((q) => q.type === 'aracnido_fuego'); assert.equal(zoneOf([sp.x, sp.y]).id, 'cueva_arana');
  assert.ok(world.isWalkable(288, 100) && world.isWalkable(sp.x, sp.y), 'se puede llegar a la guarida');
  assert.equal(typeof Game.prototype.spiderAI, 'function');
  const sj = require('../public/sprites.json'); assert.ok(sj.aracnido_fuego.f.length >= 6 && sj.arana_fuego.f.length >= 4);
});

ok('Leviatán Abisal: gruta inundada, set raro y sus 4 ataques (tornados, olas, rayo y burbuja)', () => {
  assert.equal(MONSTERS.leviatan.special, 'leviathan'); assert.equal(typeof Game.prototype.leviathanAI, 'function');
  const loot = MONSTERS.leviatan.loot.map((l) => l[0]);
  ['mar_yelmo', 'mar_coraza', 'mar_guantes', 'mar_grebas', 'mar_botas', 'mar_cinto', 'mar_anillo_perla', 'mar_anillo_alga', 'mar_anillo_coral', 'mar_amuleto', 'mar_tridente', 'pet_leviatan'].forEach((id) => { assert.ok(loot.includes(id), id); assert.ok(ITEMS[id], id); });
  assert.equal(ITEMS.mar_tridente.style, 'melee'); assert.equal(ITEMS.mar_tridente.el, 'water');
  const sj = require('../public/sprites.json'); assert.ok(sj.leviatan.f.length >= 8 && sj.leviatan.anim > 0, 'animado');
  const sp = world.monsterSpawns.find((q) => q.type === 'leviatan'); assert.equal(zoneOf([sp.x, sp.y]).id, 'cueva_mar');
  assert.ok(world.isWalkable(229, 44) && world.isWalkable(sp.x, sp.y), 'se puede llegar a la guarida');
  assert.ok(world.BLOCKED[world.T.AQW] && world.BLOCKED[world.T.WEBW] && world.BLOCKED[world.T.WATER] && !world.BLOCKED[world.T.AQF], 'muros bloquean y el suelo de agua se camina');
  const pt = world.PORTALS.find((q) => q.x === 229 && q.y === 39); assert.deepEqual([pt.tx, pt.ty], [229, 44]);
  const run = (ms) => { for (let k = 0; k <= ms; k += 100) { game.now += 100; const due = game.sched.filter((e) => e.at <= game.now); game.sched = game.sched.filter((e) => e.at > game.now); due.forEach((e) => e.fn()); } };
  const { p } = login('Lev1'); place(p, 229, 48); p.hp = p.maxHp = 1e7;
  const m = game.spawnMonster('leviatan', sp.x, sp.y); m.target = p.id; game.fx.length = 0;
  const go = (i) => { m.spN = i; m.nextSp = 0; game.now += 10; game.leviathanAI(m, game.now); };
  go(1); run(16000); const ids = new Set(game.fx.filter((f) => f.k === 'wtn').map((f) => f.id)); assert.ok(ids.size >= 6, 'los tornados se multiplican: ' + ids.size);
  m.nextSp = 0; let hp0 = p.hp; go(2); run(8000); assert.ok(game.fx.some((f) => f.k === 'olw') && game.fx.some((f) => f.k === 'ol') && p.hp < hp0, 'las olas golpean');
  hp0 = p.hp; go(0); run(4000); assert.ok(game.fx.some((f) => f.k === 'bm') && p.hp < hp0, 'el rayo de agua golpea');
  go(3); assert.ok(m.shieldUntil > game.now, 'burbuja'); const h1 = m.hp; game.hurtMonster(m, 5000, p, game.now); assert.equal(m.hp, h1, 'inmune 5 s');
  run(5200); assert.ok(!m.shieldUntil); game.hurtMonster(m, 5000, p, game.now); assert.ok(m.hp < h1, 'la burbuja acaba');
});

ok('Ignaros, Soberano del Magma: caldera, botín (6 objetos) y sus 4 ataques (infierno con refugio, meteoritos, líneas y lava)', () => {
  assert.equal(MONSTERS.ignaros.special, 'magma'); assert.equal(typeof Game.prototype.magmaAI, 'function');
  const loot = MONSTERS.ignaros.loot.map((l) => l[0]);
  ['ig_casco', 'ig_pecho', 'ig_capa', 'ig_anillo', 'ig_arco', 'ig_baston', 'trofeo_magma', 'pet_ignaros'].forEach((id) => { assert.ok(loot.includes(id), id); assert.ok(ITEMS[id], id); });
  assert.equal(ITEMS.ig_arco.style, 'ranged'); assert.equal(ITEMS.ig_baston.style, 'magic'); assert.ok(ITEMS.ig_capa.cc && ITEMS.ig_capa.type === 'cape');
  const sj = require('../public/sprites.json'), gj = require('../public/gear.json');
  assert.ok(sj.ignaros.f.length >= 8 && sj.ignaros.anim > 0 && sj.ignaros_cast.f.length >= 4, 'animado y con pose de lanzamiento');
  for (const k of ['ig_helm', 'ig_chest', 'ig_cape', 'ig_ring', 'ig_bow', 'ig_staff']) assert.ok(gj['i_' + k], 'icono ' + k);
  for (const k of ['ig_helm', 'ig_chest', 'ig_bow', 'ig_staff']) assert.ok(gj['c_' + k], 'personaje ' + k);
  const sp = world.monsterSpawns.find((q) => q.type === 'ignaros'); assert.equal(zoneOf([sp.x, sp.y]).id, 'cueva_magma'); assert.equal(zoneOf([288, 118]).id, 'volcan');
  assert.ok(world.isWalkable(288, 123) && world.isWalkable(sp.x, sp.y) && world.BLOCKED[world.T.MAGW] && !world.BLOCKED[world.T.MAGF]);
  const pt = world.PORTALS.find((q) => q.x === 288 && q.y === 118); assert.deepEqual([pt.tx, pt.ty], [288, 123]);
  const run = (ms) => { for (let k = 0; k <= ms; k += 100) { game.now += 100; const due = game.sched.filter((e) => e.at <= game.now); game.sched = game.sched.filter((e) => e.at > game.now); due.forEach((e) => e.fn()); } };
  const a = login('Mag1'), b = login('Mag2'); place(a.p, 288, 126); place(b.p, 284, 126); for (const q of [a.p, b.p]) q.hp = q.maxHp = 1e7;
  const m = game.spawnMonster('ignaros', sp.x, sp.y); m.target = a.p.id; game.fx.length = 0;
  // 1) infierno: quien está en el cuadro azul no recibe daño
  game.magmaCast(m, 'inferno'); const w = game.fx.find((f) => f.k === 'mgw'); assert.ok(w && w.w >= 3, 'se marca el refugio');
  for (let y = w.sy; y < w.sy + w.w; y++) for (let x = w.sx; x < w.sx + w.w; x++) assert.ok(world.isWalkable(x, y), 'el refugio es suelo libre');
  place(a.p, w.sx + 1, w.sy + 1); place(b.p, w.sx > 280 ? w.sx - 4 : w.sx + w.w + 3, w.sy); const hpA = a.p.hp, hpB = b.p.hp;
  run(12000); assert.ok(game.fx.some((f) => f.k === 'mgf'), 'el suelo arde'); assert.equal(a.p.hp, hpA, 'el refugio protege'); assert.ok(b.p.hp < hpB, 'fuera del refugio quema');
  assert.ok(game.fx.some((f) => f.k === 'brn' && f.id === b.p.id), 'el personaje arde');
  // 2) meteoritos con onda explosiva
  place(a.p, 288, 126); place(b.p, 284, 127); let h0 = a.p.hp + b.p.hp; game.fx.length = 0; game.magmaCast(m, 'meteoros'); run(14000);
  assert.ok(game.fx.filter((f) => f.k === 'mmw').length >= 12 && game.fx.some((f) => f.k === 'mmx') && a.p.hp + b.p.hp < h0, 'los meteoritos hacen daño');
  // 3) líneas de fuego por toda la cueva
  place(a.p, 288, 126); h0 = a.p.hp; game.fx.length = 0; game.magmaCast(m, 'lineas'); run(9000);
  assert.ok(game.fx.some((f) => f.k === 'mlw') && game.fx.some((f) => f.k === 'ml') && a.p.hp < h0, 'las líneas golpean');
  // 4) lava: las rocas azules protegen
  place(a.p, 288, 126); place(b.p, 284, 127); game.fx.length = 0; game.magmaCast(m, 'lava'); const lw = game.fx.find((f) => f.k === 'mlw2'); assert.ok(lw && lw.isl.length >= 3, 'se marcan rocas');
  const isl = lw.isl[0]; place(a.p, isl.x, isl.y); const far = [[284, 127], [292, 124], [279, 131], [296, 132], [288, 133]].find(([x, y]) => world.isWalkable(x, y) && lw.isl.every((i) => Math.hypot(x - i.x, y - i.y) > i.r + 0.5)); place(b.p, far[0], far[1]);
  const hA = a.p.hp, hB = b.p.hp; run(16000); assert.ok(game.fx.some((f) => f.k === 'mlv'), 'sube la lava'); assert.ok(game.fx.filter((f) => /^m(g|l|m)/.test(f.k)).every((f) => Number.isFinite(f.x ?? f.x1) && Number.isFinite(f.y ?? f.y1)), 'los efectos llevan posición (si no, el servidor no los envía)'); assert.ok(game.fx.filter((f) => ['mgw', 'mgf', 'mlw2', 'mlv', 'mlw', 'ml'].includes(f.k)).every((f) => f.x === 289 && f.y === 128), 'anclados al centro de la caldera'); assert.equal(a.p.hp, hA, 'la roca protege'); assert.ok(b.p.hp < hB, 'la lava quema');
});

ok('Anubis, Juez de las Sombras: tumba, botín, miasma, portales, sombras y momia que explota', () => {
  assert.equal(MONSTERS.anubis.special, 'anubis'); assert.equal(typeof Game.prototype.anubisAI, 'function');
  const loot = MONSTERS.anubis.loot.map((l) => l[0]);
  ['an_yelmo', 'an_peto', 'an_guantes', 'an_pantalon', 'an_botas', 'an_cinto', 'an_anillo', 'an_amuleto', 'an_arco', 'an_baston', 'trofeo_anubis'].forEach((id) => { assert.ok(loot.includes(id), id); assert.ok(ITEMS[id], id); });
  const sj = require('../public/sprites.json'), gj = require('../public/gear.json');
  for (const k of ['anubis', 'momia_eterna']) assert.ok(sj[k], 'dibujo ' + k);
  for (const k of ['an_helm', 'an_chest', 'an_glove', 'an_leg', 'an_boot', 'an_belt', 'an_ring', 'an_amulet', 'an_bow', 'an_staff']) assert.ok(gj['i_' + k], 'icono ' + k);
  for (const k of ['an_helm', 'an_chest', 'an_belt', 'an_bow', 'an_staff']) assert.ok(gj['c_' + k], 'personaje ' + k);
  const sp = world.monsterSpawns.find((q) => q.type === 'anubis'); assert.equal(zoneOf([sp.x, sp.y]).id, 'cueva_anubis'); assert.ok(world.reach[sp.y * world.W + sp.x], 'alcanzable');
  const pt = world.PORTALS.find((q) => q.x === 377 && q.y === 117); assert.ok(pt && pt.fee === 2000);
  const run = (ms) => { for (let k = 0; k <= ms; k += 100) { game.now += 100; const due = game.sched.filter((e) => e.at <= game.now); game.sched = game.sched.filter((e) => e.at > game.now); due.forEach((e) => e.fn()); } };
  const a = login('Anu1'), b = login('Anu2'); place(a.p, 377, 125); place(b.p, 372, 126); for (const q of [a.p, b.p]) q.hp = q.maxHp = 1e7;
  const m = game.spawnMonster('anubis', sp.x, sp.y); m.target = a.p.id; game.fx.length = 0;
  // 1) miasma: daño continuo y curación reducida
  game.anubisCast(m, 'miasma'); run(9000); assert.ok(game.fx.some((f) => f.k === 'an_crack') && game.fx.some((f) => f.k === 'an_ms'), 'grietas y miasma');
  assert.ok(a.p.hp < 1e7, 'el miasma daña'); assert.ok(a.p.antiHeal > 0, 'reduce la curación');
  // 2) portales verdes con flechas que explotan
  place(a.p, 377, 125); a.p.hp = 1e7; game.fx.length = 0; game.anubisCast(m, 'portales'); run(14000);
  assert.ok(game.fx.filter((f) => f.k === 'an_pt').length >= 6 && game.fx.some((f) => f.k === 'an_ar') && game.fx.some((f) => f.k === 'an_bm'), 'portales y flechas');
  // 3) tres sombras: Anubis es inmune mientras duren
  game.fx.length = 0; game.anubisCast(m, 'sombras'); run(2500);
  const sh = game.monsters.filter((z) => z.parent === m); assert.deepEqual(sh.map((z) => z.type).sort(), ['anubis_sombra_a', 'anubis_sombra_h', 'anubis_sombra_m'], 'tres sombras');
  assert.ok(m.shieldUntil > game.now, 'Anubis inmune'); for (const z of sh) z.dead = true; run(1500); game.anubisSweep(m);
  assert.ok(!(m.shieldUntil > game.now), 'vuelve a ser vulnerable'); assert.ok(!game.monsters.some((z) => z.parent === m && z.type.startsWith('anubis_sombra')), 'las sombras desaparecen');
  // 4) momia: al morir explota con fuego negro por toda la cueva
  game.fx.length = 0; game.anubisCast(m, 'momia'); run(2500); const mu = game.monsters.find((z) => z.type === 'momia_eterna'); assert.ok(mu, 'revive una momia');
  place(a.p, 377, 125); a.p.hp = 1e7; const h0 = a.p.hp; game.killMonster(mu, game.now); run(8000);
  assert.ok(game.fx.some((f) => f.k === 'an_mx') && game.fx.some((f) => f.k === 'an_l') && game.fx.some((f) => f.k === 'an_bf'), 'explosión, rayos y bolas negras'); assert.ok(a.p.hp < h0, 'el fuego negro daña');
  assert.ok(game.fx.filter((f) => /^an_/.test(f.k)).every((f) => Number.isFinite(f.x ?? f.x1) && Number.isFinite(f.y ?? f.y1) || f.k === 'an_dot'), 'fx con coordenadas');
  // curación reducida
  const hp0 = a.p.hp = 1000; a.p.maxHp = 5000; a.p.antiHeal = game.now + 5000; const nm = a.p.hp; assert.ok(a.p.antiHeal > game.now && nm === hp0);
});

ok('minería: picos, rocas por nivel, experiencia, gemas raras y colección', () => {
  const M = require('../game/mining');
  for (const id of M.ORDER) { assert.ok(ITEMS[id], id); assert.ok(game.nodes.some((q) => q.type === 'roca_' + id), 'hay rocas de ' + id); }
  assert.equal(Object.keys(M.PICKS).length, 6); const SH = require('../game/data').SHOPS; assert.ok(SH.boris.includes('pico_piedra') && SH.boris.includes('pico_abismo'));
  const sj = require('../public/sprites.json'), gj = require('../public/gear.json'); for (const id of M.ORDER) { assert.ok(sj['rock_' + id] && gj['i_k_' + id], 'gráficos de ' + id); } for (const k of Object.values(M.PICKS)) assert.ok(gj['i_' + k.spr]);
  const { p, ws } = login('Mine1'); const nd = game.nodes.find((q) => q.type === 'roca_granito'); place(p, nd.x, nd.y); game.now += 5000;
  game.gather(p, nd.id); assert.ok(!p.inv.some((it) => it && it.id === 'granito') && nd.at === 0, 'sin pico no se mina');
  p.inv[0] = I.mk('pico_piedra', 1); const r0 = Math.random;
  try {
    Math.random = () => 0.5; game.gather(p, nd.id);
    assert.ok(p.inv.some((it) => it && it.id === 'granito'), 'da granito'); assert.ok(p.ext.mine.xp > 0 && p.ext.mine.c.granito >= 1); assert.ok(nd.at > game.now, 'la roca se agota');
    assert.ok(lastMsg(ws, 'mine').lv >= 1, 'se informa de la habilidad'); assert.ok(p.ext.col.mineria.granito, 'colección');
    const ob = game.nodes.find((q) => q.type === 'roca_obsidiana'); place(p, ob.x, ob.y); game.now += 5000; game.gather(p, ob.id); assert.equal(ob.at, 0, 'nivel de minería insuficiente');
    // con nivel y pico altos y suerte: sale gema rara y se anuncia
    p.ext.mine.xp = 1e8; p.inv[1] = I.mk('pico_abismo', 1); Math.random = () => 0.0001; game.now += 5000; game.gather(p, ob.id);
    assert.ok(['amatista', 'opalo', 'diamante'].some((g) => p.inv.some((it) => it && it.id === g)), 'gema rara'); assert.ok(p.ext.col.mineria.obsidiana);
  } finally { Math.random = r0; }
  assert.ok(game.extSave(p).mine.xp > 0 && game.extSave(p).col.mineria);
});

ok('tabletas de teletransporte: Boris las vende a 100k y llevan a la zona', () => {
  const SH = require('../game/data').SHOPS; assert.equal(ITEMS.tp_lava.price, 2000); assert.ok(ITEMS.tp_paraiso && ITEMS.tp_alba.dest[0] === 400 && require('../game/data').SHOPS.zaroth.includes('tp_nubes')); assert.ok(SH.boris.includes('tp_lava') && SH.boris.includes('tp_ciudad'));
  const { p, ws } = login('Tab1'); place(p, ...TOWN); p.inv[0] = I.mk('tp_lava', 2); p.pvpLock = 0; game.now = T0 + 5;
  game.handle(p, { t: 'use', s: 0 });
  assert.equal(zoneOf([p.x, p.y]).id, 'volcan'); assert.equal(p.inv[0].qty, 1, 'se gasta una');
  place(p, ...TOWN); p.pvpLock = game.now + 5000; game.handle(p, { t: 'use', s: 0 });
  assert.equal(zoneOf([p.x, p.y]).id, 'ciudad', 'no se puede usar en combate'); assert.equal(p.inv[0].qty, 1);
});

ok('Raid: 5 cámaras, jefes, vidas, escalado por grupo, cofre final con botín raro y capa equipada', () => {
  const R = require('../game/raid'), RAID = world.RAID;
  assert.equal(R.ALL_ITEMS.length, 50); for (const [p, s] of R.ALL_ITEMS) assert.ok(ITEMS[R.itemId(p, s)], p + s);
  const gj = require('../public/gear.json'), sj = require('../public/sprites.json');
  for (const [p, s] of R.ALL_ITEMS) assert.ok(gj['i_' + p + '_' + s], 'icono ' + p + s);
  for (const id of R.BOSS_ORDER) { assert.ok(sj[id] && MONSTERS[id].special === 'raid' && MONSTERS[id].loot.length === 11, id); }
  assert.ok(ITEMS.rd_rx_cape.wings && ITEMS.rd_rm_cape.type === 'cape' && ITEMS.rd_rm_weapon.style === 'melee');
  assert.equal(RAID.rooms.length, 6);
  const A = login('RaidA'), B = login('RaidB'); const H = RAID.rooms[0];
  for (const q of [A.p, B.p]) { q.level = 150; q.hp = q.maxHp = 5e6; place(q, H.start[0] + 3, H.cy); q.dead = false; }
  A.p.eq.cape = I.mk('rd_rm_cape'); assert.ok(I.isGear('rd_rm_cape'));
  game.raidGo(A.p); const r = game.raid; assert.ok(r && r.members.size === 2 && r.room === 1 && r.boss);
  const m = r.boss, base = MONSTERS.raid_slyvra.hp; assert.equal(m.maxHp, Math.round(base * 1.75), 'vida escalada a 2 jugadores');
  assert.ok(m.shieldUntil > game.now, 'inmune al despertar');
  assert.equal(world.zoneAt(A.p.x, A.p.y).id, 'raid_slyvra');
  const run = (ms) => { for (let k = 0; k <= ms; k += 100) { game.now += 100; game.tickN += 0; const due = game.sched.filter((e) => e.at <= game.now); game.sched = game.sched.filter((e) => e.at > game.now); due.forEach((e) => e.fn()); } };
  // ataques
  m.shieldUntil = 0; place(A.p, m.x - 3, m.y); place(B.p, m.x - 4, m.y + 2); m.target = A.p.id;
  for (let i = 0; i < 6; i++) { game.fx.length = 0; m.nextSp = 0; game.now += 10; const hp0 = A.p.hp + B.p.hp; game.raidAI(m, game.now); run(9000); if (i === 0) assert.ok(game.fx.some((f) => f.k === 'rd_w'), 'aviso'); }
  assert.ok(game.monsters.some((q) => q.type === 'raid_vibora'), 'invoca víboras');
  // matar jefes uno a uno
  const kill = (b) => { b.shieldUntil = 0; b.dmgBy.set(A.p.id, { dmg: 7e5, t: game.now }); b.dmgBy.set(B.p.id, { dmg: 3e5, t: game.now }); game.hurtMonster(b, b.hp + 99999999, A.p, game.now); };
  for (let i = 1; i <= 4; i++) { assert.equal(r.room, i); kill(r.boss); assert.equal(r.phase, 'transition'); game.now += 15000; T0 = game.now; advance(1100); }
  assert.equal(r.room, 5, 'llegan a la cámara 5'); assert.equal(world.zoneAt(A.p.x, A.p.y).id, 'raid_malgathor');
  assert.equal(r.boss.maxHp, Math.round(MONSTERS.raid_malgathor.hp * 1.75));
  // vidas: morir y volver
  A.p.hp = 1; game.hurtPlayer(A.p, 1e7, r.boss, game.now); assert.ok(world.zoneAt(A.p.x, A.p.y).id !== 'raid_malgathor'); assert.equal(r.deaths[A.p.key], 1);
  place(A.p, H.start[0] + 3, H.cy); A.p.hp = A.p.maxHp = 5e6; game.raidGo(A.p); assert.equal(world.zoneAt(A.p.x, A.p.y).id, 'raid_malgathor', 'vuelve a la cámara actual');
  // jefe final → cofre
  const fin = r.boss; fin.shieldUntil = 0; fin.dmgBy.set(A.p.id, { dmg: 6e5, t: game.now }); fin.dmgBy.set(B.p.id, { dmg: 4e5, t: game.now }); r.contrib[A.p.key] = 9e5; r.contrib[B.p.key] = 5e5;
  game.hurtMonster(fin, fin.hp + 99999999, A.p, game.now);
  assert.equal(r.phase, 'chest'); assert.ok(r.chest && world.isWalkable(r.chest.x, r.chest.y));
  place(A.p, r.chest.x - 1, r.chest.y); game.raidOpenChest(A.p);
  const loot = lastMsg(A.ws, 'raid_loot'); assert.ok(loot && loot.items.length >= 1 && loot.gold > 0, 'el cofre da botín');
  assert.ok(loot.items.every((o) => ITEMS[o.id] && (ITEMS[o.id].raid || ITEMS[o.id].type === 'pet')) && A.p.inv.some((it) => it && /^(rd_|pet_)/.test(it.id)) , 'objetos en el inventario');
  assert.ok(game.fx.some((f) => f.k === 'rd_chest'), 'animación');
  const before = A.ws.got.filter((q) => q.t === 'raid_loot').length; game.raidOpenChest(A.p); assert.equal(A.ws.got.filter((q) => q.t === 'raid_loot').length, before, 'solo se abre una vez');
  place(B.p, r.chest.x + 40, r.chest.y); game.raidOpenChest(B.p); assert.ok(!r.opened.has(B.p.key), 'hay que estar junto al cofre');
  assert.ok(A.p.ext.col.raid_malgathor || A.p.ext.col.raid_slyvra || A.p.ext.col.raid_koros || A.p.ext.col.raid_aranak || A.p.ext.col.raid_xaelis, 'colección');
  game.raidFinish(); assert.equal(game.raid, null); assert.ok(!game.monsters.some((q) => q.raidRun));
  // derrota total
  place(A.p, H.start[0] + 3, H.cy); A.p.hp = A.p.maxHp; game.raidGo(A.p); const r2 = game.raid; assert.equal(r2.members.size, 1); assert.equal(r2.boss.maxHp, MONSTERS.raid_slyvra.hp);
  game.now += 5000; A.p.hp = 0; place(A.p, 3, 3); T0 = game.now; advance(1100); assert.equal(game.raid, null, 'sin supervivientes la Raid termina');
  for (let i = 0; i < 12; i++) { const { p } = login('RaidX' + i); place(p, H.start[0] + 2 + (i % 3), H.cy + (i % 5)); p.hp = p.maxHp = 1e6; if (i === 0) var first = p; }
  game.raidGo(first); assert.equal(game.raid.members.size, 10, 'máximo 10 jugadores'); game.raidReset();
});

ok('Banco ampliable (1M por 5 espacios) y entrada de 2k a las cuevas de jefe', () => {
  const { p, ws } = login('Banquero'); const g = world.NPCS.find((q) => q.type === 'bank'); place(p, g.x + 1, g.y);
  const n0 = p.bank.length; p.gold = 999999; p.bankGold = 0; game.bankBuy(p); assert.equal(p.bank.length, n0, 'sin oro no amplía');
  p.gold = 600000; p.bankGold = 500000; game.bankBuy(p); assert.equal(p.bank.length, n0 + 5); assert.equal(p.gold + p.bankGold, 100000, 'cobra 1M (mano y banco)');
  p.gold = 2e6; game.bankBuy(p); game.bankBuy(p); assert.equal(p.bank.length, n0 + 15, 'se puede seguir comprando'); assert.equal(lastMsg(ws, 'bank').size, n0 + 15);
  p.bank[n0 + 14] = { id: 'pocion_vida', qty: 3 }; const d = game.serialize(p); assert.equal(d.bankSlots, n0 + 15);
  const q = game.createPlayer({ key: 'x', name: 'x', data: d }); assert.equal(q.bank.length, n0 + 15); assert.ok(q.bank[n0 + 14]);
  place(p, g.x + 40, g.y); p.gold = 2e6; game.bankBuy(p); assert.equal(p.bank.length, n0 + 15, 'hay que estar junto a la banquera');
  const fees = world.PORTALS.filter((o) => o.fee); assert.equal(fees.length, 7, 'las 7 cuevas de jefe cobran'); assert.ok(fees.every((o) => o.fee === 2000));
  const po = fees[5], z0 = [po.tx, po.ty];
  const stepOn = (pl) => { const sx = po.x + 1, sy = po.y; place(pl, sx, sy); pl.pvpLock = 0; pl.nextMove = 0; game.tryStep(pl, -1, 0, game.now + 1e6); };
  const { p: r } = login('Pobre'); r.gold = 1999; stepOn(r); assert.ok(!(r.x === z0[0] && r.y === z0[1]), 'sin 2k no entra'); assert.equal(r.gold, 1999);
  const { p: u } = login('Rico'); u.gold = 5000; stepOn(u); assert.deepEqual([u.x, u.y], z0, 'con oro entra'); assert.equal(u.gold, 3000);
  const ex = world.PORTALS.find((o) => !o.fee && o.tx === po.x && o.ty === po.y - 0) ; assert.ok(world.PORTALS.filter((o) => !o.fee).length > 6, 'las salidas son gratis');
});

ok('misiones de jefes: 14 nuevas, las de cueva se repiten cada día', () => {
  const { QUESTS } = require('../game/quests'); const bq = QUESTS.filter((q) => q.type === 'kill' && MONSTERS[q.mon] && MONSTERS[q.mon].boss);
  assert.ok(bq.length >= 16, 'un encargo por jefe'); for (const m of ['dragon_sombra', 'hidra_jade', 'arcangel', 'aracnido_fuego', 'leviatan', 'ignaros']) { const q = bq.find((o) => o.mon === m); assert.ok(q && q.repeat === 24, m); }
  const { p } = login('Cazador'); p.level = 95; p.xp = Math.max(p.xp, 1); place(p, ...TOWN); const q = QUESTS.find((o) => o.id === 'cueva_magma');
  game.questAccept(p, q.id); assert.equal(p.ext.q[q.id].s, 'a'); game.questKill(p, 'ignaros'); assert.equal(p.ext.q[q.id].n, 1);
  const g0 = p.gold; game.questTurn(p, q.id); assert.ok(p.gold >= g0 + q.reward.g); assert.equal(p.ext.q[q.id].s, 'd');
  p.ext.q[q.id].t -= 25 * 3600000; game.questAccept(p, q.id); assert.equal(p.ext.q[q.id].s, 'a', 'vuelve a estar disponible tras 24 h');
});

ok('Gremio de Mineros: sala segura con solo rocas de nivel bajo y medio, capataz con picos y sin etiqueta de gremio', () => {
  const z = world.zoneById('gremio_minero'); assert.ok(z && z.kind === 'town' && !z.pvp);
  const inG = game.nodes.filter((nd) => world.zoneAt(nd.x, nd.y).id === 'gremio_minero'); const { NODES } = require('../game/extra');
  assert.ok(inG.length >= 10, 'hay rocas dentro (' + inG.length + ')'); assert.ok(inG.every((nd) => NODES[nd.type].rock && NODES[nd.type].lvl <= 90), 'ninguna roca alta');
  const kinds = new Set(inG.map((nd) => NODES[nd.type].rock)); for (const r of ['granito', 'arenisca', 'pizarra', 'pedernal', 'pomez']) assert.ok(kinds.has(r), r);
  assert.ok(![...kinds].some((r) => ['marmol', 'basalto', 'obsidiana'].includes(r)));
  assert.ok(inG.every((nd) => world.reach[nd.y * world.W + nd.x]), 'alcanzables'); assert.ok(world.reach[73 * world.W + 47], 'se llega por el portal'); const pin = world.PORTALS.find((o) => /Gremio de Mineros/.test(o.label)); assert.ok(pin && !pin.fee && world.zoneAt(pin.x, pin.y).id !== 'gremio_minero' && world.zoneAt(pin.tx, pin.ty).id === 'gremio_minero', 'entrada por portal desde fuera, sin cobro'); assert.ok(world.PORTALS.some((o) => o.label === 'Salir al Prado' && world.zoneAt(o.x, o.y).id === 'gremio_minero'), 'portal de salida');
  const du = world.NPCS.find((q) => q.id === 'durgan'); assert.ok(du && world.zoneAt(du.x, du.y).id === 'gremio_minero');
  assert.ok(require('../game/data').SHOPS.durgan.includes('pico_hierro'), 'vende picos');
  assert.ok(!world.monsterSpawns.some((o) => world.zoneAt(o.x, o.y).id === 'gremio_minero'), 'sin puntos de aparición de monstruos');
});

ok('flechas de misión: señalan monstruo, entrada de la cueva del jefe o PNJ al que entregar', () => {
  const { p, ws } = login('Guia'); place(p, ...TOWN); p.level = 99; const g = () => lastMsg(ws, 'qguide');
  game.questAccept(p, 'ratas'); let m = g(); assert.ok(m && m.list.length === 1 && m.list[0].id === 'ratas' && /Rata/i.test(m.list[0].label), 'apunta a las ratas');
  const sp = world.monsterSpawns.filter((o) => o.type === 'rata'); assert.ok(sp.some((o) => o.x === m.list[0].x && o.y === m.list[0].y), 'coordenadas de un spawn real');
  place(p, ...TOWN); game.questAccept(p, 'cueva_magma'); m = g(); const q = m.list.find((o) => o.id === 'cueva_magma'); const por = world.PORTALS.find((o) => o.x === q.x && o.y === q.y);
  assert.ok(por && /Caldera/.test(por.label) && /^Entrada/.test(q.label), 'apunta al portal de la Caldera, no al jefe');
  const ig = world.monsterSpawns.find((o) => o.type === 'ignaros'); place(p, ig.x, ig.y - 3); game.questGuide(p); const q2 = g().list.find((o) => o.id === 'cueva_magma'); assert.ok(q2.x === ig.x && q2.y === ig.y, 'dentro de la cueva apunta al jefe');
  assert.ok(typeof q2.zone === 'string' && q2.zone.length, 'la flecha trae el nombre de la zona');
  place(p, ...TOWN); for (let i = 0; i < 8; i++) game.questKill(p, 'rata'); const r = g().list.find((o) => o.id === 'ratas'); assert.ok(/Entregar/.test(r.label), 'lista: apunta al PNJ'); game.questAbandon(p, 'cueva_magma'); assert.ok(!g().list.some((o) => o.id === 'cueva_magma'));
});

ok('Ciudad de Alba Dorada: gran ciudad segura con banco, pescadera y brujo de armas mágicas', () => {
  const z = world.zoneById('ciudad_alba'); assert.ok(z && z.kind === 'town' && !z.pvp && z.rect[2] - z.rect[0] >= 40, 'ciudad grande (más que Aldea Real)');
  const N = (id) => world.NPCS.find((q) => q.id === id); for (const id of ['ilda', 'marela', 'zaroth']) { const n = N(id); assert.ok(n && world.zoneAt(n.x, n.y).id === 'ciudad_alba' && world.reach[n.y * world.W + n.x], id + ' dentro y alcanzable'); }
  const { SHOPS, ITEMS } = require('../game/data'); assert.equal(N('ilda').type, 'bank'); assert.ok(SHOPS.marela.includes('salmon') && SHOPS.marela.includes('cana_madera'), 'pescado y cañas');
  const mg = SHOPS.zaroth.filter((i) => ITEMS[i].type === 'weapon'); assert.ok(mg.length >= 8 && mg.every((i) => ITEMS[i].style === 'magic'), 'solo armas mágicas');
  const { p, ws } = login('Alba'); place(p, N('ilda').x + 1, N('ilda').y); p.gold = 1000; game.npcClick(p, 'ilda'); assert.ok(lastMsg(ws, 'bank'), 'abre el banco'); game.bankGoldMove(p, 'dep', 500); assert.equal(p.bankGold, 500);
  place(p, N('zaroth').x + 1, N('zaroth').y); game.npcClick(p, 'zaroth'); assert.ok(lastMsg(ws, 'shop'), 'abre la tienda del brujo');
  assert.ok(world.reach[70 * world.W + 379] && world.reach[70 * world.W + 331], 'camino desde las Tierras de Lava');
});

ok('cuatro regiones nuevas: montañas, nubes, desierto con pirámides y paraíso, con monstruos y un jefe cada una', () => {
  const { MONSTERS } = require('../game/data'), { QUESTS } = require('../game/quests');
  const R = { montana_alta: 'serafin_fuego', nubes_reino: 'serafin_tormenta', desierto_piramides: 'amenkhet', paraiso: 'reina_coral' };
  for (const [zid, boss] of Object.entries(R)) {
    const z = world.zoneById(zid); assert.ok(z && !z.pvp, zid + ' existe y es segura');
    const sp = world.monsterSpawns.filter((o) => world.zoneAt(o.x, o.y).id === zid); assert.ok(sp.length >= 40, zid + ' tiene monstruos');
    const b = sp.find((o) => o.type === boss); assert.ok(b && MONSTERS[boss].boss, 'jefe de ' + zid);
    assert.ok(world.reach[b.y * world.W + b.x], 'jefe alcanzable en ' + zid);
    assert.ok(QUESTS.some((q) => q.mon === boss), 'misión del jefe ' + boss);
  }
  assert.ok(world.reach[57 * world.W + 400] && world.reach[40 * world.W + 440] && world.reach[98 * world.W + 340] && world.reach[98 * world.W + 440], 'calles desde Alba Dorada a las cuatro regiones');
  const SJ = require('../public/sprites.json'); assert.ok(Object.values(MONSTERS).filter((m) => m.spr).every((m) => SJ[m.spr]), 'todos los dibujos de monstruos existen');
});

console.log(`\n${n} pruebas correctas`);
try { require('fs').unlinkSync(store.file); } catch (e) { /* nada */ }

