'use strict';
/**
 * Fases de jefe + ataques con cuenta atrás (todos los jefes de cueva).
 *
 *  - Cada jefe tiene 3 fases según su vida: 100–70 % (la normal, sin cambios), 70–35 % (fase 2) y 35–0 % (fase 3 «furia»).
 *  - Al cambiar de fase: cartel en pantalla, temblor, el jefe es intocable ~2,5 s, luego ataca y se mueve más rápido.
 *  - En fases 2 y 3 el jefe añade ataques propios (además de los que ya tenía): cada uno avisa con una ZONA ROJA y un NÚMERO
 *    de cuenta atrás; si sales de la zona antes de llegar a 0, no recibes daño.
 *  - Piezas de ataque (iguales para todos, cada jefe las combina con su tema/color): lluvia de círculos, líneas, salto sobre un jugador,
 *    onda alrededor del jefe, charcos que se quedan, «refugios» (toda la zona daña salvo círculos seguros) e invocación de esbirros.
 *
 * APAGADO POR DEFECTO. Para encenderlas: variable de entorno ELDORIA_PHASES=1 (en Render: Environment). Para quitarlas de un jefe →
 * `off: true` en su entrada de PROFILES (abajo). Para quitarlas del todo: borrar la línea `require('./fases').install(Game)` de game.js.
 */
let _w = null; const world = new Proxy({}, { get: (_, k) => (_w || (_w = require('./world')))[k] });
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const COL = {
  fuego: '255,90,30', veneno: '70,255,90', sombra: '190,80,255', hielo: '120,200,255', rayo: '255,240,90', arena: '235,190,90',
  agua: '60,170,255', roca: '190,170,140', luz: '255,245,190', alma: '110,255,220', jade: '60,230,150',
};
/* constructores de ataques: R lluvia de círculos · L líneas · J salto · O onda · Z charcos · S refugios · U esbirros */
const R = (n, r, warn, k, name, o) => ({ a: 'rain', n, r, warn, k, name, ...o });
const L = (n, w, warn, k, name, o) => ({ a: 'lane', n, w, warn, k, name, ...o });
const J = (r, warn, k, name, o) => ({ a: 'leap', r, warn, k, name, ...o });
const O = (r, warn, k, name, o) => ({ a: 'nova', r, warn, k, name, ...o });
const Z = (n, r, warn, dur, k, name, o) => ({ a: 'pools', n, r, warn, dur, k, name, ...o });
const S = (n, r, warn, k, name, o) => ({ a: 'safe', n, r, warn, k, name, ...o });
const U = (type, n) => ({ a: 'summon', type, n });

const PROFILES = {
  cerbero: { col: 'fuego', p2: ['FASE 2', 'Las cabezas despiertan: cada una ataca distinto', [Z(3, 2.2, 2200, 5000, 0.9, 'Veneno de la cabeza verde', { c: 'veneno' }), R(3, 2.2, 2000, 1.2, 'Fuego de la cabeza roja', { aim: 2 }), O(5.5, 1600, 1.2, 'Mordisco triple', { c: 'sombra' })]],
    p3: ['FASE 3 — FURIA', 'Más rápido · invoca crías · salta sobre ti', [J(3.6, 2000, 1.6, 'Salto de Cerbero'), S(3, 2.6, 2400, 1.5, 'Aullido infernal', { c: 'sombra' }), R(5, 2, 1500, 1.3, 'Combo de tres cabezas', { aim: 3, c: 'sombra' })], U('diablillo_fuego', 2)] },
  zeus: { col: 'rayo', p2: ['FASE 2', 'La tormenta se desata', [R(5, 1.8, 1700, 1.1, 'Rayo divino', { aim: 3 }), L(2, 1.6, 1600, 1.2, 'Cadena de relámpagos', { len: 14 })]],
    p3: ['FASE 3 — IRA DEL OLIMPO', 'Tormenta total: busca un refugio', [S(2, 2.6, 2600, 1.5, 'Tormenta del Olimpo'), J(3.8, 1800, 1.6, 'Descenso de Zeus', { c: 'luz' }), R(7, 1.7, 1300, 1.2, 'Aguacero de rayos', { aim: 4 })], U('guardia_sagrado', 2)] },
  hades: { col: 'alma', p2: ['FASE 2', 'Las almas se levantan', [R(4, 2, 1900, 1.1, 'Almas errantes', { aim: 3 }), Z(3, 2.4, 2200, 5000, 0.8, 'Fuego del Inframundo', { c: 'fuego' })]],
    p3: ['FASE 3 — DOMINIO DEL INFRAMUNDO', 'Oscuridad total: busca un refugio', [S(3, 2.4, 2500, 1.5, 'Oscuridad total', { c: 'sombra' }), L(3, 1.6, 1500, 1.3, 'Cadenas de almas'), O(6, 1500, 1.4, 'Grito de los condenados', { c: 'sombra' })], U('sombra_infernal', 3)] },
  anubis: { col: 'arena', p2: ['FASE 2', 'El juicio comienza', [Z(3, 2.2, 2200, 6000, 0.7, 'Arenas del juicio'), L(2, 1.6, 1700, 1.2, 'Lanza del sol', { c: 'luz' })]],
    p3: ['FASE 3 — JUICIO FINAL', 'Veredicto: nadie queda sin juzgar', [O(6, 1600, 1.4, 'Veredicto'), R(6, 1.8, 1400, 1.2, 'Sentencia', { aim: 3, c: 'sombra' })], U('momia_eterna', 2)] },
  medusa: { col: 'jade', p2: ['FASE 2', 'La mirada despierta', [L(3, 1.8, 1700, 1.2, 'Mirada petrificante'), Z(3, 2.2, 2200, 5000, 0.8, 'Veneno de serpientes', { c: 'veneno' })]],
    p3: ['FASE 3 — FURIA DE GORGONA', 'Estallido de piedra: busca un refugio', [S(3, 2.4, 2500, 1.5, 'Estallido de piedra', { c: 'roca' }), R(6, 1.8, 1400, 1.2, 'Serpientes', { aim: 3, c: 'veneno' })], U('medusa_clon', 2)] },
  leviatan: { col: 'agua', p2: ['FASE 2', 'Se agita el mar', [L(2, 1.8, 1700, 1.2, 'Ola gigante'), Z(3, 2.4, 2200, 5000, 0.8, 'Remolino')]],
    p3: ['FASE 3 — MAREMOTO', 'La marea lo cubre todo: busca un refugio', [S(3, 2.6, 2600, 1.5, 'Maremoto'), J(3.6, 1900, 1.5, 'Zambullida'), R(5, 2, 1400, 1.2, 'Torrente', { aim: 3 })]] },
  ignaros: { col: 'fuego', p2: ['FASE 2', 'La lava hierve', [Z(4, 2.2, 2000, 6000, 0.8, 'Charcos de lava'), R(4, 2, 1800, 1.2, 'Bomba de magma', { aim: 3 })]],
    p3: ['FASE 3 — ERUPCIÓN', 'El volcán estalla: busca un refugio', [S(3, 2.4, 2500, 1.5, 'Erupción'), O(6.5, 1600, 1.4, 'Onda de calor', { c: 'arena' })]] },
  dragon_sombra: { col: 'sombra', p2: ['FASE 2', 'Despierta la sombra', [R(4, 2, 1800, 1.2, 'Aliento oscuro', { aim: 3 }), L(2, 1.8, 1600, 1.2, 'Ráfaga de sombra')]],
    p3: ['FASE 3 — NOCHE ETERNA', 'Se apagan las luces: busca un refugio', [S(3, 2.4, 2500, 1.5, 'Noche eterna'), J(3.6, 1900, 1.6, 'Picado', { c: 'fuego' }), Z(3, 2.2, 2000, 5000, 0.8, 'Sombra viva')]] },
  hidra_jade: { col: 'jade', p2: ['FASE 2', 'Nacen nuevas cabezas', [L(3, 1.6, 1700, 1.1, 'Chorro de veneno', { c: 'veneno' }), Z(3, 2.2, 2200, 5000, 0.8, 'Charcos tóxicos', { c: 'veneno' })]],
    p3: ['FASE 3 — HIDRA FURIOSA', 'Todas las cabezas atacan a la vez', [R(6, 1.8, 1400, 1.2, 'Lluvia de ácido', { aim: 3, c: 'veneno' }), O(6, 1500, 1.4, 'Coletazo'), S(3, 2.4, 2600, 1.4, 'Niebla tóxica', { c: 'veneno' })]] },
  arcangel: { col: 'luz', p2: ['FASE 2', 'Las alas se abren', [R(4, 2, 1800, 1.2, 'Rayos sagrados', { aim: 3 }), L(2, 1.6, 1700, 1.2, 'Lanza de luz')]],
    p3: ['FASE 3 — JUICIO CELESTIAL', 'Luz cegadora: busca un refugio', [S(3, 2.5, 2500, 1.5, 'Luz cegadora'), J(3.6, 1900, 1.5, 'Descenso del arcángel')], U('arcangel_centinela', 2)] },
  aracnido_fuego: { col: 'fuego', p2: ['FASE 2', 'Tejen telas de fuego', [Z(4, 2, 2000, 6000, 0.8, 'Telarañas ardientes'), L(2, 1.6, 1700, 1.2, 'Hilo de fuego')]],
    p3: ['FASE 3 — NIDO INFERNAL', 'Salta sobre ti y llena el suelo de brasas', [J(3.4, 1800, 1.5, 'Salto de araña'), R(6, 1.7, 1400, 1.2, 'Lluvia de brasas', { aim: 3 })], U('arana_fuego', 3)] },
  rey_dragones: { col: 'fuego', p2: ['FASE 2', 'El rey se enfurece', [R(5, 1.9, 1700, 1.1, 'Brasas del rey', { aim: 3 }), O(6, 1500, 1.3, 'Pisotón del rey', { c: 'roca' })]],
    p3: ['FASE 3 — IRA DEL REY', 'Picado, mar de fuego y triple llamarada', [J(4, 1900, 1.5, 'Picado del rey'), S(2, 2.4, 2600, 1.4, 'Mar de fuego'), L(3, 1.8, 1400, 1.3, 'Triple llamarada')]] },
  rey_ogro: { col: 'roca', p2: ['FASE 2', 'El rey ruge', [R(3, 2, 1900, 1.2, 'Garrotazo', { aim: 2 }), O(5, 1500, 1.2, 'Pisotón')]],
    p3: ['FASE 3 — FURIA OGRA', 'Salta y embiste sin descanso', [J(3.4, 1800, 1.5, 'Salto del rey'), L(2, 1.8, 1500, 1.2, 'Embestida')]] },
  grifo_rey: { col: 'luz', p2: ['FASE 2', 'El grifo alza el vuelo', [L(2, 1.6, 1700, 1.2, 'Picado'), R(4, 1.8, 1800, 1.1, 'Plumas afiladas', { aim: 3 })]],
    p3: ['FASE 3 — HURACÁN', 'Un huracán lo cubre todo: busca un refugio', [S(3, 2.4, 2500, 1.4, 'Huracán', { c: 'rayo' }), J(3.4, 1800, 1.5, 'Aterrizaje')]] },
  ent_ancestral: { col: 'veneno', p2: ['FASE 2', 'Despiertan las raíces', [Z(3, 2.2, 2200, 5000, 0.8, 'Raíces venenosas'), R(4, 1.9, 1800, 1.2, 'Brotes', { aim: 3, c: 'jade' })]],
    p3: ['FASE 3 — BOSQUE VIVO', 'Las espinas cubren el suelo: busca un refugio', [S(3, 2.4, 2500, 1.4, 'Espinas del bosque', { c: 'jade' }), O(6, 1500, 1.3, 'Remolino de hojas')]] },
  dragon_esqueleto: { col: 'alma', p2: ['FASE 2', 'Los huesos se reúnen', [L(2, 1.7, 1600, 1.2, 'Aliento de huesos'), R(4, 1.9, 1800, 1.2, 'Lluvia de huesos', { aim: 3, c: 'roca' })]],
    p3: ['FASE 3 — LLAMAS FANTASMA', 'Fuego espectral: busca un refugio', [S(3, 2.4, 2500, 1.5, 'Llamas fantasma'), J(3.6, 1800, 1.5, 'Caída ósea', { c: 'sombra' })]] },
};
const TH = [0.7, 0.35];                                   // umbrales de vida de las fases 2 y 3
const ATK_F = [1, 0.85, 0.7], MOVE_F = [1, 0.85, 0.75];     // factores de espera de ataque y paso por fase
const INV_MS = 2500;                                      // intocable al cambiar de fase
const RANGE = 26;                                         // jugadores a los que afecta (casillas)

function install(Game) {
  const P = Game.prototype;
  const ON = () => process.env.ELDORIA_PHASES === '1';           // se mira en cada llamada (las pruebas lo encienden)
  const zoneOf = (e) => world.zoneAt(e.x, e.y);
  const free = (x, y) => world.isWalkable(x, y) && world.zoneAt(x, y).kind !== 'town';
  const distSeg = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, u = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(px - (x1 + vx * u), py - (y1 + vy * u)); };

  P.phNear = function (m) { const z = zoneOf(m); return [...this.players.values()].filter((q) => q.hp > 0 && zoneOf(q) === z && Math.hypot(q.x - m.x, q.y - m.y) <= RANGE); };

  /** Anuncia una fase nueva: cartel, temblor, intocable y pausa. */
  P.phEnter = function (m, ph, now) {
    const pr = PROFILES[m.type], info = ph === 2 ? pr.p2 : pr.p3, col = COL[pr.col];
    m.ph = ph; m.phInv = now + INV_MS; m.phNext = now + INV_MS + 1500;
    m.nextAtk = Math.max(m.nextAtk || 0, now + INV_MS); m.nextMove = Math.max(m.nextMove || 0, now + INV_MS); m.nextSp = Math.max(m.nextSp || 0, now + INV_MS + 1000);
    this.fx.push({ k: 'ph_shift', x: m.x, y: m.y, id: m.id, col, ph, T: INV_MS });
    for (const q of this.phNear(m)) { this.send(q, { t: 'ph_banner', big: info[0], sub: info[1], col, ph, name: m.def.name }); this.msg(q, `⚠️ ${m.def.name}: ${info[0]} — ${info[1]}`, 'x'); }
    if (ph === 3 && info[3]) this.later(INV_MS, () => { if (!m.dead && this.monsters.includes(m)) this.phSummon(m, info[3].type, info[3].n); });
  };

  P.phSummon = function (m, type, n) {
    const D = require('./data'); if (!D.MONSTERS[type]) return;
    const live = this.monsters.filter((z) => z.phParent === m && !z.dead).length; let made = 0;
    for (let i = 0; i < 60 && made < n && live + made < 6; i++) {
      const x = m.x + rnd(-5, 5), y = m.y + rnd(-5, 5); if (!free(x, y) || this.mgrid.has(y * world.W + x) || this.pgrid.has(y * world.W + x) || zoneOf({ x, y }) !== zoneOf(m)) continue;
      const c = this.spawnMonster(type, x, y); if (!c) continue;
      c.noRespawn = true; c.respawnAt = Infinity; c.phParent = m; c.target = m.target; c.diesAt = this.now + 45000; made++;
      this.fx.push({ k: 'sp', x, y });
    }
    if (made) for (const q of this.phNear(m)) this.msg(q, `${m.def.name} invoca refuerzos.`, 'x');
  };

  P.phCleanup = function (m, now, bossUp) {
    if (!this.monsters.some((z) => z.phParent === m)) return;
    for (const q of this.monsters.filter((z) => z.phParent === m && (z.dead || !bossUp || now >= z.diesAt))) {
      if (!q.dead) { this.mgrid.delete(q.y * world.W + q.x); this.ents.delete(q.id); }
      this.monsters = this.monsters.filter((z) => z !== q);
    }
  };

  /** Lanza un ataque de fase. Devuelve cuánto dura (ms). */
  P.phCast = function (m, A, ph) {
    const pr = PROFILES[m.type], alive = () => !m.dead && this.monsters.includes(m);
    const near = () => this.phNear(m), kk = ph === 3 ? 1.12 : 1, colK = A.c || pr.col, col = COL[colK] || COL.fuego;
    const dmgOf = (k) => Math.round(rnd(m.def.dmg[0], m.def.dmg[1]) * k * kk);
    const hit = (q, k) => { if (q.hp > 0) this.hurtPlayer(q, dmgOf(k), m, this.now, A.name); };
    const say = (t) => { for (const q of near()) this.msg(q, `⚠️ ${m.def.name}: ¡${t}!`, 'x'); };
    const root = (ms) => { m.nextMove = Math.max(m.nextMove || 0, this.now + ms); m.nextAtk = Math.max(m.nextAtk || 0, this.now + ms); };
    this.fx.push({ k: 'e2_cast', x: m.x, y: m.y, id: m.id, T: Math.min(A.warn || 1500, 1500), col });
    const spots = (n, aim, R0) => {
      const pts = []; const pl = near(); for (const q of pl) if (pts.length < (aim || 0)) pts.push({ x: q.x, y: q.y });
      for (let i = 0; i < 200 && pts.length < n; i++) { const x = m.x + rnd(-R0, R0), y = m.y + rnd(-R0, R0); if (free(x, y) && !pts.some((s) => Math.hypot(s.x - x, s.y - y) < 2.6)) pts.push({ x, y }); }
      return pts;
    };
    switch (A.a) {
      case 'rain': {
        say(A.name); root(700);
        for (const s of spots(A.n, A.aim, 10)) {
          this.fx.push({ k: 'ph_zone', x: s.x, y: s.y, r: A.r, T: A.warn, col, lb: A.name });
          this.later(A.warn, () => { if (!alive()) return; this.fx.push({ k: 'ph_hit', x: s.x, y: s.y, r: A.r, col }); for (const q of near()) if (Math.hypot(q.x - s.x, q.y - s.y) <= A.r + 0.2) hit(q, A.k); });
        }
        return A.warn + 600;
      }
      case 'nova': {
        say(A.name); root(A.warn + 400);
        this.fx.push({ k: 'ph_zone', x: m.x, y: m.y, r: A.r, T: A.warn, col, lb: A.name, follow: m.id });
        this.later(A.warn, () => { if (!alive()) return; this.fx.push({ k: 'ph_hit', x: m.x, y: m.y, r: A.r, col, ring: 1 }); for (const q of near()) if (Math.hypot(q.x - m.x, q.y - m.y) <= A.r + 0.2) hit(q, A.k); });
        return A.warn + 600;
      }
      case 'lane': {
        say(A.name); root(A.warn + 400);
        const pl = near(), len = A.len || 14;
        for (let i = 0; i < A.n; i++) {
          const q = pl.length ? pl[(i + rnd(0, 2)) % pl.length] : null, ang = (q ? Math.atan2(q.y - m.y, q.x - m.x) : rnd(0, 6)) + (pl.length < 2 ? (i - (A.n - 1) / 2) * 0.45 : 0);
          const x1 = m.x, y1 = m.y, x2 = x1 + Math.cos(ang) * len, y2 = y1 + Math.sin(ang) * len;
          this.fx.push({ k: 'ph_lane', x1, y1, x2, y2, T: A.warn, w: A.w, col, lb: i === 0 ? A.name : '' });
          this.later(A.warn, () => { if (!alive()) return; this.fx.push({ k: 'ph_beam', x1, y1, x2, y2, col, w: A.w }); for (const z of near()) if (distSeg(z.x, z.y, x1, y1, x2, y2) <= A.w) hit(z, A.k); });
        }
        return A.warn + 600;
      }
      case 'leap': {
        say(A.name); root(A.warn + 700);
        const pl = near(); const q = pl.length ? pl[rnd(0, pl.length - 1)] : null; if (!q) return 800;
        this.fx.push({ k: 'ph_zone', x: q.x, y: q.y, r: A.r, T: A.warn, col, lb: A.name, big: 1, track: q.id });
        // la marca sigue al jugador hasta el último instante: se fija 450 ms antes de caer
        let tx = q.x, ty = q.y; this.later(A.warn - 450, () => { if (q.hp > 0) { tx = q.x; ty = q.y; } });
        this.later(A.warn, () => {
          if (!alive()) return;
          let bx = tx, by = ty; for (let i = 0; i < 30 && (!free(bx, by) || (this.mgrid.has(by * world.W + bx) && this.mgrid.get(by * world.W + bx) !== m)); i++) { bx = tx + rnd(-2, 2); by = ty + rnd(-2, 2); }
          if (free(bx, by)) { this.mgrid.delete(m.y * world.W + m.x); m.x = bx; m.y = by; this.mgrid.set(by * world.W + bx, m); }
          this.fx.push({ k: 'ph_hit', x: tx, y: ty, r: A.r, col, ring: 1, big: 1 });
          for (const z of near()) if (Math.hypot(z.x - tx, z.y - ty) <= A.r + 0.2) hit(z, A.k);
        });
        return A.warn + 900;
      }
      case 'pools': {
        say(A.name); root(700);
        for (const s of spots(A.n, 1, 9)) {
          this.fx.push({ k: 'ph_zone', x: s.x, y: s.y, r: A.r, T: A.warn, col, lb: A.name });
          this.later(A.warn, () => {
            if (!alive()) return; this.fx.push({ k: 'ph_pool', x: s.x, y: s.y, r: A.r, T: A.dur, col });
            for (let t = 0; t < A.dur / 700; t++) this.later(t * 700, () => { if (!alive()) return; for (const q of near()) if (Math.hypot(q.x - s.x, q.y - s.y) <= A.r) hit(q, A.k * 0.5); });
          });
        }
        return A.warn + 800;
      }
      case 'safe': {
        say(`${A.name}: busca un refugio`); root(A.warn + 500);
        const Rr = 12, ref = []; for (let i = 0; i < 300 && ref.length < A.n; i++) { const x = m.x + rnd(-Rr + 3, Rr - 3), y = m.y + rnd(-Rr + 3, Rr - 3); if (free(x, y) && Math.hypot(x - m.x, y - m.y) < Rr - 2 && !ref.some((s) => Math.hypot(s[0] - x, s[1] - y) < 7)) ref.push([x, y, A.r]); }
        const lid = Math.random();
        this.fx.push({ k: 'ph_safe', x: m.x, y: m.y, R: Rr, safe: ref, T: A.warn, col, lb: A.name, lid });
        this.later(A.warn, () => {
          if (!alive()) return; this.fx.push({ k: 'ph_hit', x: m.x, y: m.y, r: Rr, col, ring: 1, big: 1 });
          for (const q of near()) if (Math.hypot(q.x - m.x, q.y - m.y) <= Rr + 0.5 && !ref.some((s) => Math.hypot(q.x - s[0], q.y - s[1]) <= s[2] + 0.3)) hit(q, A.k);
        });
        return A.warn + 800;
      }
      case 'summon': this.phSummon(m, A.type, A.n); return 800;
      default: return 500;
    }
  };

  const U0 = P.updateMonster;
  P.updateMonster = function (m, now) {
    const pr = ON() && m.def && m.def.boss && PROFILES[m.type]; const a0 = m.nextAtk, v0 = m.nextMove;
    U0.call(this, m, now);
    if (!pr || pr.off) return;
    if (m.dead) { this.phCleanup(m, now, false); return; }
    if (m.ph > 1 && m.hp >= m.maxHp) { m.ph = 1; m.phInv = 0; }                                      // revivió / se curó del todo
    const ph = m.hp > m.maxHp * TH[0] ? 1 : m.hp > m.maxHp * TH[1] ? 2 : 3;
    if (ph > (m.ph || 1)) this.phEnter(m, ph, now);
    const cur = m.ph || 1;
    this.phCleanup(m, now, true);
    if (cur > 1) {                                                                                  // más rápido en fase 2 y 3 (solo la espera normal, no los bloqueos de los ataques)
      if (m.nextAtk !== a0 && m.nextAtk - now === m.def.atkCd) m.nextAtk = now + Math.round(m.def.atkCd * ATK_F[cur - 1]);
      if (m.nextMove !== v0 && (m.nextMove - now === m.def.move || m.nextMove - now === m.def.move * 2.2)) m.nextMove = now + Math.round((m.nextMove - now) * MOVE_F[cur - 1]);
    }
    if (cur < 2 || now < (m.phInv || 0) || now < (m.phNext || 0)) return;
    const t = m.target ? this.ents.get(m.target) : null; if (!t || t.kind !== 'pl' || t.hp <= 0) return;
    if ((m.nextMove || 0) - now > 1400) { m.phNext = now + 800; return; }                             // está lanzando otro ataque: espera
    const list = cur === 3 ? pr.p2[2].concat(pr.p3[2]) : pr.p2[2];
    const A = list[(m.phN = (m.phN || 0) + 1) % list.length];
    const dur = this.phCast(m, A, cur);
    m.phNext = now + dur + (cur === 3 ? 3200 : 5200) + Math.random() * 2500;
  };

  const H0 = P.hurtMonster;
  P.hurtMonster = function (m, dmg, p, now) {
    if (m.phInv > now && ON()) { if (!(m.phMsg > now)) { m.phMsg = now + 700; this.fx.push({ k: 'd', x: m.x, y: m.y, v: '🛡️ ¡Cambia de fase!', c: 'x' }); } return; }
    return H0.call(this, m, dmg, p, now);
  };
}
module.exports = { install, PROFILES, COL, TH, INV_MS };
