'use strict';
/**
 * Mundo de Eldoria (180 x 140): se genera de forma determinista (siempre el mismo mapa).
 *
 *   norte    Bosque Maldito (PvP) · Cumbres Heladas (PvP) -> Fortaleza de Hielo (mazmorra PvP)
 *   centro   Ciudad de Aldea Real (segura) · Prado de los Novatos (seguro)
 *   oeste    Catacumbas Silenciosas (mazmorra segura)
 *   este     Abismo Carmesí (mazmorra PvP) · Dunas Ardientes (PvP) -> Pirámide Olvidada (mazmorra PvP)
 *   sur      Colinas Doradas (segura) -> Minas Enanas (mazmorra segura) · Pantano Venenoso (PvP)
 *   costa    Playa de Cristal (segura) con el Puerto Marea (ciudad segura)
 */
const { SPAWN_PLAN } = require('./data');

const W = 180, H = 140;
const T = {
  GRASS: 0, WATER: 1, TREE: 2, ROAD: 3, WALL: 4, DFLOOR: 5, PORTAL: 6, ROCK: 7, FLOWER: 8, SHOP: 9, AFLOOR: 10,
  SAND: 11, SNOW: 12, SWAMP: 13, DUNE: 14, PALM: 15, PINE: 16, DEADTREE: 17, CACTUS: 18, ICEBLOCK: 19,
  MFLOOR: 20, PFLOOR: 21, IFLOOR: 22, BOG: 23, HILL: 24,
};
const BLOCKED = new Uint8Array(32);
[T.WATER, T.TREE, T.WALL, T.ROCK, T.PALM, T.PINE, T.DEADTREE, T.CACTUS, T.ICEBLOCK, T.BOG].forEach((t) => { BLOCKED[t] = 1; });

// El orden importa: gana la primera zona cuyo rectángulo contiene la casilla.
const ZONES = [
  { id: 'ciudad',     name: 'Ciudad de Aldea Real',   pvp: false, kind: 'town',    rect: [78, 58, 102, 74] },
  { id: 'puerto',     name: 'Puerto Marea',           pvp: false, kind: 'town',    rect: [90, 120, 108, 131] },
  { id: 'catacumbas', name: 'Catacumbas Silenciosas', pvp: false, kind: 'dungeon', rect: [3, 40, 30, 91] },
  { id: 'minas',      name: 'Minas Enanas',           pvp: false, kind: 'dungeon', rect: [3, 96, 28, 136] },
  { id: 'abismo',     name: 'Abismo Carmesí',         pvp: true,  kind: 'dungeon', rect: [112, 40, 139, 74] },
  { id: 'piramide',   name: 'Pirámide Olvidada',      pvp: true,  kind: 'dungeon', rect: [148, 100, 175, 136] },
  { id: 'fortaleza',  name: 'Fortaleza de Hielo',     pvp: true,  kind: 'dungeon', rect: [148, 3, 175, 30] },
  { id: 'bosque',     name: 'Bosque Maldito',         pvp: true,  kind: 'wild',    rect: [0, 0, 99, 34] },
  { id: 'cumbres',    name: 'Cumbres Heladas',        pvp: true,  kind: 'wild',    rect: [100, 0, 179, 34], tint: 'rgba(120,170,255,.10)' },
  { id: 'dunas',      name: 'Dunas Ardientes',        pvp: true,  kind: 'wild',    rect: [140, 35, 179, 139], tint: 'rgba(255,170,60,.10)' },
  { id: 'pantano',    name: 'Pantano Venenoso',       pvp: true,  kind: 'wild',    rect: [0, 96, 59, 139], tint: 'rgba(80,140,60,.13)' },
  { id: 'colinas',    name: 'Colinas Doradas',        pvp: false, kind: 'field',   rect: [60, 96, 139, 119] },
  { id: 'playa',      name: 'Playa de Cristal',       pvp: false, kind: 'field',   rect: [60, 120, 139, 139] },
  { id: 'prado',      name: 'Prado de los Novatos',   pvp: false, kind: 'field',   rect: [0, 0, 179, 139] },
];
const zoneGrid = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let zi = ZONES.length - 1;
    for (let i = 0; i < ZONES.length; i++) {
      const r = ZONES[i].rect;
      if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { zi = i; break; }
    }
    zoneGrid[y * W + x] = zi;
  }
}
function zoneAt(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return ZONES[ZONES.length - 1];
  return ZONES[zoneGrid[y * W + x]];
}
function zoneById(id) { return ZONES.find((z) => z.id === id); }

/* ---------- aleatoriedad determinista ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(seed) {
  const r = mulberry32(seed);
  const g = new Float32Array(64 * 64);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const s = (t) => t * t * (3 - 2 * t);
  const v = (a, b) => g[((b & 63) * 64) + (a & 63)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = s(x - xi), w = s(y - yi);
    return v(xi, yi) * (1 - u) * (1 - w) + v(xi + 1, yi) * u * (1 - w) + v(xi, yi + 1) * (1 - u) * w + v(xi + 1, yi + 1) * u * w;
  };
}

const tiles = new Uint8Array(W * H);
const rng = mulberry32(20261021);
const n1 = makeNoise(11), n2 = makeNoise(77), n3 = makeNoise(5);
const idx = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const SPAWN_POINT = { x: 90, y: 66 };

/* 1) Terreno exterior por zona */
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const z = zoneAt(x, y).id;
    const a = n1(x / 6, y / 6), b = n2(x / 9, y / 9);
    let t = T.GRASS;
    switch (z) {
      case 'bosque':
        if (a > 0.58 || rng() < 0.06) t = T.TREE; else if (b > 0.74) t = T.WATER; else if (rng() < 0.012) t = T.ROCK;
        break;
      case 'cumbres':
        t = T.SNOW;
        if (a > 0.64 || rng() < 0.05) t = T.PINE; else if (b > 0.80) t = T.WATER; else if (rng() < 0.02) t = T.ICEBLOCK;
        break;
      case 'dunas':
        t = T.DUNE;
        if (b > 0.86) t = T.WATER; else if (rng() < 0.016) t = T.CACTUS; else if (rng() < 0.01) t = T.ROCK; else if (rng() < 0.006) t = T.PALM;
        break;
      case 'pantano':
        t = T.SWAMP;
        if (b > 0.64) t = T.BOG; else if (a > 0.66 || rng() < 0.05) t = T.DEADTREE; else if (rng() < 0.012) t = T.ROCK;
        break;
      case 'colinas':
        t = T.HILL;
        if (a > 0.84 || rng() < 0.02) t = T.TREE; else if (b > 0.84) t = T.WATER; else if (rng() < 0.008) t = T.ROCK; else if (rng() < 0.05) t = T.FLOWER;
        break;
      case 'playa':
        t = T.SAND;
        if (y >= 133 + Math.floor(n3(x / 4, y / 4) * 3)) t = T.WATER; else if (rng() < 0.014) t = T.PALM; else if (rng() < 0.008) t = T.ROCK;
        break;
      default:
        if (a > 0.80 || rng() < 0.025) t = T.TREE; else if (b > 0.80) t = T.WATER; else if (rng() < 0.006) t = T.ROCK;
        if (t === T.GRASS && rng() < 0.035) t = T.FLOWER;
    }
    tiles[idx(x, y)] = t;
  }
}
// costa de agua alrededor del mapa
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (d < 1 + Math.floor(n3(x / 5, y / 5) * 3)) tiles[idx(x, y)] = T.WATER;
  }
}

/* 2) Ciudades */
function house(ax, ay, bx, by, doorX) {
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) tiles[idx(x, y)] = T.WALL;
  for (let y = ay + 1; y < by; y++) for (let x = ax + 1; x < bx; x++) tiles[idx(x, y)] = T.SHOP;
  tiles[idx(doorX, by)] = T.SHOP;
}
function buildTown(zoneId, gatesX, gatesY, flowers, houses) {
  const [x0, y0, x1, y1] = zoneById(zoneId).rect;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.ROAD;
  for (let x = x0; x <= x1; x++) { tiles[idx(x, y0)] = T.WALL; tiles[idx(x, y1)] = T.WALL; }
  for (let y = y0; y <= y1; y++) { tiles[idx(x0, y)] = T.WALL; tiles[idx(x1, y)] = T.WALL; }
  for (const x of gatesX) { tiles[idx(x, y0)] = T.ROAD; tiles[idx(x, y1)] = T.ROAD; }
  for (const y of gatesY) { tiles[idx(x0, y)] = T.ROAD; tiles[idx(x1, y)] = T.ROAD; }
  for (const [fx, fy] of flowers) tiles[idx(fx, fy)] = T.FLOWER;
  for (const h of houses) house(...h);
}
buildTown('ciudad', [89, 90, 91], [65, 66, 67],
  [[81, 70], [82, 70], [81, 71], [100, 71], [101, 71], [101, 72], [80, 60], [101, 60]],
  [[81, 60, 89, 64, 85], [92, 60, 99, 64, 95], [92, 66, 99, 70, 95]]);
buildTown('puerto', [99, 100, 101], [125, 126, 127],
  [[92, 129], [93, 129], [106, 129], [107, 129]],
  [[92, 122, 97, 126, 94], [102, 122, 107, 126, 104]]);

/* 3) Mazmorras: habitaciones en cuadrícula conectadas con pasillos */
function carveDungeon(zoneId, cols, rows, floor) {
  const [x0, y0, x1, y1] = zoneById(zoneId).rect;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.WALL;
  const cw = Math.floor((x1 - x0 + 1) / cols), ch = Math.floor((y1 - y0 + 1) / rows);
  const rooms = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx0 = x0 + i * cw, cy0 = y0 + j * ch;
      const rw = 5 + Math.floor(rng() * (cw - 6));
      const rh = 5 + Math.floor(rng() * (ch - 6));
      const rx = cx0 + 1 + Math.floor(rng() * (cw - 2 - rw + 1));
      const ry = cy0 + 1 + Math.floor(rng() * (ch - 2 - rh + 1));
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) tiles[idx(x, y)] = floor;
      rooms.push({ i, j, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2), rx, ry, rw, rh });
    }
  }
  const carve = (x, y) => { if (x >= x0 && x <= x1 && y >= y0 && y <= y1) tiles[idx(x, y)] = floor; };
  const R = (i, j) => rooms[j * cols + i];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = R(i, j);
      if (i + 1 < cols) {
        const b = R(i + 1, j);
        for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) carve(x, a.cy);
        for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) carve(b.cx, y);
      }
      if (j + 1 < rows) {
        const b = R(i, j + 1);
        for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) carve(a.cx, y);
        for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) carve(x, b.cy);
      }
    }
  }
  for (const r of rooms) {   // pilares decorativos
    if (r.rw >= 6 && r.rh >= 6) { tiles[idx(r.rx, r.ry)] = T.WALL; tiles[idx(r.rx + r.rw - 1, r.ry + r.rh - 1)] = T.WALL; }
  }
  return rooms;
}
const catRooms = carveDungeon('catacumbas', 3, 5, T.DFLOOR);
const minRooms = carveDungeon('minas', 3, 4, T.MFLOOR);
const abyRooms = carveDungeon('abismo', 3, 3, T.AFLOOR);
const pirRooms = carveDungeon('piramide', 3, 4, T.PFLOOR);
const forRooms = carveDungeon('fortaleza', 3, 3, T.IFLOOR);

/* 4) Caminos (despejan árboles, agua y rocas del trazado) */
function carvePath(x0, y0, x1, y1) {
  const put = (x, y) => { if (inb(x, y) && tiles[idx(x, y)] !== T.PORTAL && tiles[idx(x, y)] !== T.WALL) tiles[idx(x, y)] = T.ROAD; };
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) put(x, y0);
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) put(x1, y);
}
carvePath(90, 57, 90, 31);      // puerta norte -> bosque
carvePath(90, 31, 130, 31);     // camino del norte (bosque y cumbres)
carvePath(96, 31, 96, 29);      // ramal al portal del Abismo
carvePath(130, 31, 130, 21);    // ramal al portal de la Fortaleza de Hielo
carvePath(77, 66, 41, 66);      // puerta oeste -> Catacumbas
carvePath(103, 66, 103, 78);    // puerta este
carvePath(103, 78, 150, 78);    // camino al desierto
carvePath(150, 78, 150, 89);    // ramal al portal de la Pirámide
carvePath(90, 75, 90, 100);     // puerta sur -> colinas
carvePath(90, 100, 67, 100);    // ramal al portal de las Minas
carvePath(90, 100, 100, 119);   // camino al Puerto Marea
carvePath(67, 102, 30, 102);    // calle del pantano
carvePath(30, 102, 30, 118);

/* 5) Portales */
const PORTALS = [];
function addPortal(x, y, tx, ty, label) { tiles[idx(x, y)] = T.PORTAL; PORTALS.push({ x, y, tx, ty, label }); }
function link(ox, oy, rooms, exitX, exitY, labelIn, labelOut) {
  const e = rooms[0];
  addPortal(ox, oy, e.cx + 1, e.cy, labelIn);
  addPortal(e.cx, e.cy, exitX, exitY, labelOut);
}
link(40, 66, catRooms, 41, 66, 'Catacumbas Silenciosas (zona segura)', 'Salir al Prado');
link(66, 100, minRooms, 67, 100, 'Minas Enanas (zona segura)', 'Salir a las Colinas');
link(96, 28, abyRooms, 96, 30, 'Abismo Carmesí (¡PvP!)', 'Salir al Bosque');
link(150, 90, pirRooms, 150, 89, 'Pirámide Olvidada (¡PvP!)', 'Salir al Desierto');
link(130, 20, forRooms, 130, 22, 'Fortaleza de Hielo (¡PvP!)', 'Salir a las Cumbres');

function clearAround(cx, cy, r) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!inb(x, y)) continue;
      const t = tiles[idx(x, y)];
      if (BLOCKED[t] && t !== T.WALL) tiles[idx(x, y)] = zoneAt(x, y).id === 'dunas' ? T.DUNE : zoneAt(x, y).id === 'cumbres' ? T.SNOW : T.GRASS;
    }
  }
}
for (const p of PORTALS) {
  const z = zoneAt(p.x, p.y);
  if (z.kind !== 'dungeon') clearAround(p.x, p.y, 2);
}
for (const p of PORTALS) tiles[idx(p.x, p.y)] = T.PORTAL;

/* 6) PNJ */
const NPCS = [
  { id: 'boris', name: 'Boris el Mercader',  icon: '🧑‍🌾', x: 85,  y: 62,  type: 'shop', shop: 'boris' },
  { id: 'orin',  name: 'Orin el Sabio',      icon: '🧙‍♂️', x: 95,  y: 62,  type: 'sage' },
  { id: 'gerda', name: 'Gerda la Banquera',  icon: '👩‍💼', x: 95,  y: 68,  type: 'bank' },
  { id: 'brisa', name: 'Capitán Brisa',      icon: '🧑‍✈️', x: 94,  y: 124, type: 'shop', shop: 'brisa' },
  { id: 'marta', name: 'Marta la Banquera',  icon: '💁‍♀️', x: 104, y: 124, type: 'bank' },
];

/* ---------- accesibilidad ---------- */
function isWalkable(x, y) { return inb(x, y) && !BLOCKED[tiles[idx(x, y)]]; }
const portalAtMap = new Map();
for (const p of PORTALS) portalAtMap.set(idx(p.x, p.y), p);
function portalAt(x, y) { return portalAtMap.get(idx(x, y)) || null; }

const reach = new Uint8Array(W * H);
(function bfs() {
  const q = [idx(SPAWN_POINT.x, SPAWN_POINT.y)];
  reach[q[0]] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const k = q[qi], x = k % W, y = (k / W) | 0;
    const push = (nx, ny) => {
      if (!isWalkable(nx, ny)) return;
      const nk = idx(nx, ny);
      if (reach[nk]) return;
      reach[nk] = 1; q.push(nk);
    };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) push(x + dx, y + dy);
    const p = portalAtMap.get(k);
    if (p) push(p.tx, p.ty);
  }
})();

/* ---------- apariciones de monstruos ---------- */
function farFromPortals(x, y, d) {
  for (const p of PORTALS) if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= d) return false;
  return true;
}
const monsterSpawns = [];
(function plan() {
  const r = mulberry32(424242);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cache = {};
  const candidates = (zoneId, box) => {
    const key = zoneId + ':' + (box || '');
    if (cache[key]) return cache[key];
    const out = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!reach[idx(x, y)] || zoneAt(x, y).id !== zoneId) continue;
        if (box && (x < box[0] || y < box[1] || x > box[2] || y > box[3])) continue;
        const t = tiles[idx(x, y)];
        if (t === T.PORTAL || (t === T.ROAD && zoneId !== 'prado' && zoneId !== 'bosque')) continue;
        if (!farFromPortals(x, y, 7)) continue;
        if (zoneId === 'bosque' && y < 3) continue;
        out.push([x, y]);
      }
    }
    cache[key] = shuffle(out);
    return cache[key];
  };
  for (const s of SPAWN_PLAN) {
    let placed = 0;
    for (const [x, y] of candidates(s.zone, s.box)) {
      if (placed >= s.n) break;
      let ok = true;   // separación mínima de 3 casillas entre apariciones
      for (const m of monsterSpawns) { if (Math.abs(m.x - x) < 3 && Math.abs(m.y - y) < 3) { ok = false; break; } }
      if (!ok) continue;
      monsterSpawns.push({ type: s.type, x, y }); placed++;
    }
  }
  // Jefes: última habitación de cada mazmorra, o el tile alcanzable más cercano a un punto
  const last = (rooms) => rooms[rooms.length - 1];
  monsterSpawns.push({ type: 'rey_esqueleto', x: last(catRooms).cx, y: last(catRooms).cy });
  monsterSpawns.push({ type: 'maestro_forjador', x: last(minRooms).cx, y: last(minRooms).cy });
  monsterSpawns.push({ type: 'demonio_supremo', x: last(abyRooms).cx, y: last(abyRooms).cy });
  monsterSpawns.push({ type: 'faraon', x: last(pirRooms).cx, y: last(pirRooms).cy });
  monsterSpawns.push({ type: 'reina_hielo', x: last(forRooms).cx, y: last(forRooms).cy });
  const nearest = (zoneId, px, py) => {
    let best = null, bd = 1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!reach[idx(x, y)] || zoneAt(x, y).id !== zoneId || tiles[idx(x, y)] === T.PORTAL || tiles[idx(x, y)] === T.ROAD) continue;
      const d = Math.hypot(x - px, y - py);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  };
  for (const [type, zone, px, py] of [['senor_orco', 'bosque', 20, 10], ['hidra', 'pantano', 40, 125], ['rey_escorpion', 'dunas', 160, 60], ['cangrejo_colosal', 'playa', 125, 128]]) {
    const b = nearest(zone, px, py);
    monsterSpawns.push({ type, x: b[0], y: b[1] });
  }
})();

// Versión compacta del mapa para el cliente (un carácter por casilla)
const CH = '0123456789abcdefghijklmno';
const rows = [];
for (let y = 0; y < H; y++) {
  let s = '';
  for (let x = 0; x < W; x++) s += CH[tiles[idx(x, y)]];
  rows.push(s);
}

module.exports = {
  W, H, T, BLOCKED, tiles, ZONES, zoneAt, zoneById, PORTALS, portalAt, NPCS, SPAWN_POINT,
  isWalkable, reach, monsterSpawns, rows, catRooms, abyRooms, minRooms, pirRooms, forRooms,
};
