'use strict';
/**
 * Mundo de Eldoria: se genera de forma determinista (siempre el mismo mapa).
 *
 *   y  0..32   Bosque Maldito      (PvP)   bosque con orcos, lobos y osos
 *   y 33..88   Prado de Novatos    (seguro) alrededor de la ciudad
 *   centro     Ciudad Aldea Real   (seguro) tienda, templo y punto de reaparición
 *   oeste      Catacumbas          (seguro) mazmorra, jefe: Rey Esqueleto
 *   este       Abismo Carmesí      (PvP)    mazmorra, jefe: Demonio Supremo
 */
const { SPAWN_PLAN } = require('./data');

const W = 120, H = 90;
const T = { GRASS: 0, WATER: 1, TREE: 2, ROAD: 3, WALL: 4, DFLOOR: 5, PORTAL: 6, ROCK: 7, FLOWER: 8, SHOP: 9, AFLOOR: 10 };
const BLOCKED = new Uint8Array(16);
[T.WATER, T.TREE, T.WALL, T.ROCK].forEach((t) => { BLOCKED[t] = 1; });

const ZONES = [
  { id: 'ciudad',     name: 'Ciudad de Aldea Real',   pvp: false, kind: 'town',    rect: [48, 38, 72, 54] },
  { id: 'catacumbas', name: 'Catacumbas Silenciosas', pvp: false, kind: 'dungeon', rect: [3, 36, 30, 87] },
  { id: 'abismo',     name: 'Abismo Carmesí',         pvp: true,  kind: 'dungeon', rect: [90, 36, 117, 70] },
  { id: 'bosque',     name: 'Bosque Maldito',         pvp: true,  kind: 'wild',    rect: [0, 0, 119, 32] },
  { id: 'prado',      name: 'Prado de los Novatos',   pvp: false, kind: 'field',   rect: [0, 0, 119, 89] },
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

/* ---------- utilidades de aleatoriedad determinista ---------- */
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

/* ---------- construcción del mapa ---------- */
const tiles = new Uint8Array(W * H);
const rng = mulberry32(20261019);
const n1 = makeNoise(11), n2 = makeNoise(77), n3 = makeNoise(5);
const idx = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const isTown = (x, y) => zoneAt(x, y).id === 'ciudad';

const SPAWN_POINT = { x: 60, y: 48 };

// 1) Terreno exterior
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const wild = y <= 32;
    let t = T.GRASS;
    const a = n1(x / 6, y / 6), b = n2(x / 9, y / 9);
    if (wild) {
      if (a > 0.58 || rng() < 0.06) t = T.TREE;
      else if (b > 0.74) t = T.WATER;
      else if (rng() < 0.012) t = T.ROCK;
    } else {
      if (a > 0.80 || rng() < 0.025) t = T.TREE;
      else if (b > 0.80) t = T.WATER;
      else if (rng() < 0.006) t = T.ROCK;
    }
    if (t === T.GRASS && rng() < 0.035) t = T.FLOWER;
    tiles[idx(x, y)] = t;
  }
}
// costa de agua
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (d < 1 + Math.floor(n3(x / 5, y / 5) * 3)) tiles[idx(x, y)] = T.WATER;
  }
}

// 2) Ciudad
(function buildTown() {
  const [x0, y0, x1, y1] = ZONES[0].rect;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.ROAD;
  for (let x = x0; x <= x1; x++) { tiles[idx(x, y0)] = T.WALL; tiles[idx(x, y1)] = T.WALL; }
  for (let y = y0; y <= y1; y++) { tiles[idx(x0, y)] = T.WALL; tiles[idx(x1, y)] = T.WALL; }
  for (let x = 59; x <= 61; x++) { tiles[idx(x, y0)] = T.ROAD; tiles[idx(x, y1)] = T.ROAD; }   // puertas N y S
  for (let y = 45; y <= 47; y++) { tiles[idx(x0, y)] = T.ROAD; tiles[idx(x1, y)] = T.ROAD; }   // puertas O y E
  // parterres
  for (const [fx, fy] of [[51, 50], [52, 50], [51, 51], [68, 50], [69, 50], [69, 51], [51, 41], [69, 41]]) tiles[idx(fx, fy)] = T.FLOWER;
  const house = (ax, ay, bx, by, doorX) => {
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) tiles[idx(x, y)] = T.WALL;
    for (let y = ay + 1; y < by; y++) for (let x = ax + 1; x < bx; x++) tiles[idx(x, y)] = T.SHOP;
    tiles[idx(doorX, by)] = T.SHOP;
  };
  house(52, 40, 60, 44, 56);   // tienda de Boris
  house(63, 40, 70, 44, 66);   // templo del sabio Orin
})();

// 3) Mazmorras: habitaciones en cuadrícula conectadas con pasillos
function carveDungeon(rect, cols, rows, floor) {
  const [x0, y0, x1, y1] = rect;
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
  // pilares decorativos en habitaciones grandes (en esquinas, sin bloquear pasillos)
  for (const r of rooms) {
    if (r.rw >= 6 && r.rh >= 6) {
      tiles[idx(r.rx, r.ry)] = T.WALL;
      tiles[idx(r.rx + r.rw - 1, r.ry + r.rh - 1)] = T.WALL;
    }
  }
  return rooms;
}
const catRooms = carveDungeon(ZONES[1].rect, 3, 5, T.DFLOOR);
const abyRooms = carveDungeon(ZONES[2].rect, 3, 3, T.AFLOOR);

// 4) Portales
const PORTALS = [];
function addPortal(x, y, tx, ty, label) {
  tiles[idx(x, y)] = T.PORTAL;
  PORTALS.push({ x, y, tx, ty, label });
}
const catEntry = catRooms[0], abyEntry = abyRooms[0];
addPortal(40, 60, catEntry.cx + 1, catEntry.cy, 'Catacumbas Silenciosas (zona segura)');
addPortal(catEntry.cx, catEntry.cy, 41, 60, 'Salir al Prado');
addPortal(100, 31, abyEntry.cx + 1, abyEntry.cy, 'Abismo Carmesí (¡PvP!)');
addPortal(abyEntry.cx, abyEntry.cy, 100, 29, 'Salir al Bosque');

// 5) Caminos que garantizan conexión (despejan árboles, agua y rocas)
function carvePath(x0, y0, x1, y1) {
  const put = (x, y) => { if (inb(x, y) && tiles[idx(x, y)] !== T.PORTAL && tiles[idx(x, y)] !== T.WALL) tiles[idx(x, y)] = T.ROAD; };
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) put(x, y0);
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) put(x1, y);
}
function clearAround(cx, cy, r) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!inb(x, y)) continue;
      const t = tiles[idx(x, y)];
      if (t === T.TREE || t === T.WATER || t === T.ROCK) tiles[idx(x, y)] = T.GRASS;
    }
  }
}
carvePath(60, 37, 60, 31);       // puerta norte -> bosque
carvePath(60, 31, 100, 31);      // bosque, camino al portal del Abismo
carvePath(60, 55, 60, 60);       // puerta sur -> prado
carvePath(60, 60, 41, 60);       // prado, camino al portal de las Catacumbas
carvePath(73, 46, 88, 46);       // puerta este
carvePath(47, 46, 34, 46);       // puerta oeste
for (const p of PORTALS) if (!(p.x >= 3 && p.x <= 30) && !(p.x >= 90 && p.x <= 117 && p.y >= 36 && p.y <= 70)) clearAround(p.x, p.y, 2);
clearAround(100, 29, 2);
clearAround(41, 60, 1);
// el tile de cada portal exterior debe seguir siendo portal tras despejar
for (const p of PORTALS) tiles[idx(p.x, p.y)] = T.PORTAL;

// 6) NPCs
const NPCS = [
  { id: 'boris', name: 'Boris el Mercader', icon: '🧑‍🌾', x: 56, y: 42, type: 'shop' },
  { id: 'orin',  name: 'Orin el Sabio',     icon: '🧙‍♂️', x: 66, y: 42, type: 'sage' },
];

/* ---------- accesibilidad ---------- */
function isWalkable(x, y) { return inb(x, y) && !BLOCKED[tiles[idx(x, y)]]; }

const portalAtMap = new Map();
for (const p of PORTALS) portalAtMap.set(idx(p.x, p.y), p);
function portalAt(x, y) { return portalAtMap.get(idx(x, y)) || null; }

// Zona alcanzable desde el punto de reaparición (incluye los portales)
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
  const taken = new Set();
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cache = {};
  const candidates = (zoneId, minY) => {
    const key = zoneId + ':' + (minY || 0);
    if (cache[key]) return cache[key];
    const out = [];
    for (let y = minY || 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!reach[idx(x, y)] || zoneAt(x, y).id !== zoneId) continue;
        const t = tiles[idx(x, y)];
        if (t === T.PORTAL || t === T.ROAD && zoneId !== 'prado' && zoneId !== 'bosque') continue;
        if (!farFromPortals(x, y, 7)) continue;
        if (zoneId === 'prado' && (isTown(x, y) || y < 33)) continue;
        if (zoneId === 'bosque' && y < 3) continue;
        out.push([x, y]);
      }
    }
    cache[key] = shuffle(out);
    return cache[key];
  };
  for (const s of SPAWN_PLAN) {
    const list = candidates(s.zone, s.minY);
    let placed = 0;
    for (const [x, y] of list) {
      if (placed >= s.n) break;
      // separación mínima de 3 casillas entre apariciones
      let ok = true;
      for (const m of monsterSpawns) { if (Math.abs(m.x - x) < 3 && Math.abs(m.y - y) < 3) { ok = false; break; } }
      if (!ok) continue;
      monsterSpawns.push({ type: s.type, x, y }); taken.add(idx(x, y)); placed++;
    }
  }
  // Jefes en la última habitación de cada mazmorra y en el rincón del bosque
  const lastCat = catRooms[catRooms.length - 1], lastAby = abyRooms[abyRooms.length - 1];
  monsterSpawns.push({ type: 'rey_esqueleto', x: lastCat.cx, y: lastCat.cy });
  monsterSpawns.push({ type: 'demonio_supremo', x: lastAby.cx, y: lastAby.cy });
  // Señor Orco: tile alcanzable más cercano a (20,10)
  let best = null, bd = 1e9;
  for (let y = 4; y < 30; y++) for (let x = 4; x < W - 4; x++) {
    if (!reach[idx(x, y)] || zoneAt(x, y).id !== 'bosque') continue;
    const d = Math.hypot(x - 20, y - 10);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  monsterSpawns.push({ type: 'senor_orco', x: best[0], y: best[1] });
})();

// Versión compacta del mapa para enviar al cliente (un carácter por casilla)
const CH = '0123456789a';
const rows = [];
for (let y = 0; y < H; y++) {
  let s = '';
  for (let x = 0; x < W; x++) s += CH[tiles[idx(x, y)]];
  rows.push(s);
}

module.exports = {
  W, H, T, BLOCKED, tiles, ZONES, zoneAt, zoneById, PORTALS, portalAt, NPCS, SPAWN_POINT,
  isWalkable, reach, monsterSpawns, rows, catRooms, abyRooms,
};
