'use strict';
/**
 * Mundo de Eldoria (480 x 140 en el exterior + las salas de la Raid al sur): se genera de forma determinista (siempre el mismo mapa).
 *
 *   norte    Bosque Maldito (PvP) · Cumbres Heladas (PvP) -> Fortaleza de Hielo (mazmorra PvP)
 *   centro   Ciudad de Aldea Real (segura) · Prado de los Novatos (seguro)
 *   oeste    Catacumbas Silenciosas (mazmorra segura)
 *   este     Abismo Carmesí (mazmorra PvP) · Dunas Ardientes (PvP) -> Pirámide Olvidada (mazmorra PvP)
 *   sur      Colinas Doradas (segura) -> Minas Enanas (mazmorra segura) · Pantano Venenoso (PvP)
 *   costa    Playa de Cristal (segura) con el Puerto Marea (ciudad segura)
 */
const { SPAWN_PLAN } = require('./data');

const W0 = 180;                 // el mapa original (se genera igual que siempre)
const W1 = 320;                 // ancho del mundo antes de la gran ampliación al este (esa parte se genera igual que siempre)
const W = 480, H0 = 140;        // mundo exterior: Selva Esmeralda, Sabana Dorada, Aldea Pesquera, Tierras de Lava y, al este, las Tierras Inexploradas (vacías, para zonas futuras)
const H = 200;                  // + 60 filas al sur con las salas de la Raid (el exterior se genera igual que siempre con H0)
const T = {
  GRASS: 0, WATER: 1, TREE: 2, ROAD: 3, WALL: 4, DFLOOR: 5, PORTAL: 6, ROCK: 7, FLOWER: 8, SHOP: 9, AFLOOR: 10,
  SAND: 11, SNOW: 12, SWAMP: 13, DUNE: 14, PALM: 15, PINE: 16, DEADTREE: 17, CACTUS: 18, ICEBLOCK: 19,
  MFLOOR: 20, PFLOOR: 21, IFLOOR: 22, BOG: 23, HILL: 24, CFLOOR: 25, CWALL: 26, LAVA: 27, ASH: 28, CLOUDF: 29, CLOUDW: 30, WEBF: 31, WEBW: 32, AQF: 33, AQW: 34, MAGF: 35, MAGW: 36, TOMBF: 37, TOMBW: 38, BRAZ: 39,
};
const BLOCKED = new Uint8Array(64);   // (con 32 casillas, WEBW=32 quedaba fuera y no bloqueaba)
[T.WATER, T.TREE, T.WALL, T.ROCK, T.PALM, T.PINE, T.DEADTREE, T.CACTUS, T.ICEBLOCK, T.BOG, T.CWALL, T.LAVA, T.CLOUDW, T.WEBW, T.AQW, T.MAGW, T.TOMBW, T.BRAZ].forEach((t) => { BLOCKED[t] = 1; });

// El orden importa: gana la primera zona cuyo rectángulo contiene la casilla.
const RAID_Y0 = 146, RAID_Y1 = 170, RAID_W = 36;
const RAID_ROOMS = [
  { id: 'raid_hall',      name: 'Antecámara del Santuario de las Cinco Sombras', x0: 2 },
  { id: 'raid_slyvra',    name: 'Cámara 1: Ciénaga de Slyvra',       x0: 42, tint: 'rgba(80,200,90,.10)' },
  { id: 'raid_koros',     name: 'Cámara 2: Cráter de Koros',         x0: 82, tint: 'rgba(255,90,20,.12)' },
  { id: 'raid_aranak',    name: 'Cámara 3: Forja de Aranak',         x0: 122, tint: 'rgba(255,120,40,.08)' },
  { id: 'raid_xaelis',    name: 'Cámara 4: Templo de Xaelis',        x0: 162, tint: 'rgba(255,230,150,.08)' },
  { id: 'raid_malgathor', name: 'Cámara 5: Abismo de Malgathor',     x0: 202, tint: 'rgba(150,60,255,.12)' },
];
for (const r of RAID_ROOMS) { r.x1 = r.x0 + RAID_W - 1; r.y0 = RAID_Y0; r.y1 = RAID_Y1; r.cx = Math.floor((r.x0 + r.x1) / 2); r.cy = Math.floor((r.y0 + r.y1) / 2); }
const ZONES = [
  ...RAID_ROOMS.map((r) => ({ id: r.id, name: r.name, pvp: false, kind: 'dungeon', tint: r.tint, rect: [r.x0, r.y0, r.x1, r.y1] })),
  { id: 'ciudad',     name: 'Ciudad de Aldea Real',   pvp: false, kind: 'town',    rect: [78, 58, 102, 74] },
  { id: 'puerto',     name: 'Puerto Marea',           pvp: false, kind: 'town',    rect: [90, 120, 108, 131] },
  { id: 'aldea',      name: 'Aldea Pesquera de Coral', pvp: false, kind: 'town',    rect: [200, 70, 222, 84] },
  { id: 'catacumbas', name: 'Catacumbas Silenciosas', pvp: false, kind: 'dungeon', rect: [3, 40, 30, 91] },
  { id: 'minas',      name: 'Minas Enanas',           pvp: false, kind: 'dungeon', rect: [3, 96, 28, 136] },
  { id: 'cueva',      name: 'Cueva del Dragón de las Sombras', pvp: false, kind: 'dungeon', dark: true, rect: [106, 80, 139, 99] },
  { id: 'cueva_jade', name: 'Cueva del Hidra de Jade', pvp: false, kind: 'dungeon', dark: true, rect: [36, 38, 69, 57] },
  { id: 'cueva_nube', name: 'Santuario de las Nubes', pvp: false, kind: 'dungeon', rect: [196, 96, 229, 115] },
  { id: 'cueva_arana', name: 'Guarida del Aracnídeo Fuego Negro', pvp: false, kind: 'dungeon', tint: 'rgba(255,60,10,.12)', rect: [272, 96, 305, 115] },
  { id: 'cueva_mar',  name: 'Gruta del Leviatán Abisal', pvp: false, kind: 'dungeon', tint: 'rgba(30,150,210,.14)', rect: [213, 40, 246, 59] },
  { id: 'cueva_magma', name: 'Caldera del Soberano del Magma', pvp: false, kind: 'dungeon', tint: 'rgba(255,70,10,.16)', rect: [272, 119, 305, 137] },
  { id: 'cueva_anubis', name: 'Tumba de Anubis, Juez de las Sombras', pvp: false, kind: 'dungeon', dark: true, tint: 'rgba(110,50,190,.16)', rect: [361, 118, 394, 136] },
  { id: 'abismo',     name: 'Abismo Carmesí',         pvp: true,  kind: 'dungeon', rect: [112, 40, 139, 74] },
  { id: 'piramide',   name: 'Pirámide Olvidada',      pvp: true,  kind: 'dungeon', rect: [148, 100, 175, 136] },
  { id: 'fortaleza',  name: 'Fortaleza de Hielo',     pvp: true,  kind: 'dungeon', rect: [148, 3, 175, 30] },
  { id: 'bosque',     name: 'Bosque Maldito',         pvp: true,  kind: 'wild',    rect: [0, 0, 99, 34] },
  { id: 'cumbres',    name: 'Cumbres Heladas',        pvp: true,  kind: 'wild',    rect: [100, 0, 179, 34], tint: 'rgba(120,170,255,.10)' },
  { id: 'dunas',      name: 'Dunas Ardientes',        pvp: true,  kind: 'wild',    rect: [140, 35, 179, 139], tint: 'rgba(255,170,60,.10)' },
  { id: 'pantano',    name: 'Pantano Venenoso',       pvp: true,  kind: 'wild',    rect: [0, 96, 59, 139], tint: 'rgba(80,140,60,.13)' },
  { id: 'colinas',    name: 'Colinas Doradas',        pvp: false, kind: 'field',   rect: [60, 96, 139, 119] },
  { id: 'playa',      name: 'Playa de Cristal',       pvp: false, kind: 'field',   rect: [60, 120, 139, 139] },
  { id: 'selva',      name: 'Selva Esmeralda',        pvp: true,  kind: 'wild',    rect: [180, 0, 249, 69], tint: 'rgba(60,160,90,.10)' },
  { id: 'sabana',     name: 'Sabana Dorada',          pvp: false, kind: 'field',   rect: [180, 70, 249, 139] },
  { id: 'volcan',     name: 'Tierras de Lava y Fuego', pvp: true,  kind: 'wild',    rect: [250, 0, 319, 139], tint: 'rgba(255,70,20,.14)' },
  { id: 'gremio_minero', name: 'Gremio de Mineros',   pvp: false, kind: 'town',    rect: [34, 70, 61, 85] },
  { id: 'ciudad_alba', name: 'Ciudad de Alba Dorada', pvp: false, kind: 'town', rect: [380, 57, 420, 83] },        // gran ciudad segura en el centro de las Tierras Inexploradas
  { id: 'montana_alta', name: 'Montañas del Trueno', pvp: false, kind: 'wild', rect: [320, 0, 399, 56], tint: 'rgba(150,170,210,.10)' },
  { id: 'nubes_reino', name: 'Reino de las Nubes', pvp: false, kind: 'wild', rect: [400, 0, 479, 56], tint: 'rgba(200,225,255,.12)' },
  { id: 'desierto_piramides', name: 'Desierto de las Pirámides', pvp: false, kind: 'wild', rect: [320, 84, 399, 139], tint: 'rgba(255,190,80,.10)' },
  { id: 'paraiso', name: 'Paraíso de Coral', pvp: false, kind: 'field', rect: [400, 84, 479, 139], tint: 'rgba(80,220,220,.08)' },
  { id: 'tierras_nuevas', name: 'Tierras Inexploradas', pvp: false, kind: 'field', rect: [320, 0, 479, 139] },   // reservado para zonas futuras
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
for (let y = 0; y < H0; y++) {
  for (let x = 0; x < W0; x++) {            // (solo el mapa original: así el generador aleatorio produce lo mismo de siempre)
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
// ampliación al este (generador propio, no altera el mapa original)
{
  const r2 = mulberry32(8675309), n4 = makeNoise(31), n5 = makeNoise(63);
  for (let y = 0; y < H0; y++) {
    for (let x = W0; x < W1; x++) {
      const a = n4(x / 6, y / 6), b = n5(x / 8, y / 8), z = zoneAt(x, y).id;
      let t;
      if (z === 'volcan') { t = T.ASH; if (b > 0.64) t = T.LAVA; else if (a > 0.8 || r2() < 0.02) t = T.CWALL; }          // obsidiana
      else if (z === 'selva') { t = T.GRASS; if (a > 0.54 || r2() < 0.06) t = T.TREE; else if (b > 0.78) t = T.WATER; else if (r2() < 0.012) t = T.PALM; else if (r2() < 0.008) t = T.ROCK; else if (r2() < 0.04) t = T.FLOWER; }
      else { t = T.HILL; if (a > 0.84 || r2() < 0.012) t = T.TREE; else if (b > 0.82) t = T.WATER; else if (r2() < 0.008) t = T.ROCK; else if (r2() < 0.05) t = T.FLOWER; else if (r2() < 0.004) t = T.PALM; }
      tiles[idx(x, y)] = t;
    }
  }
}
// ampliación grande al este: Tierras Inexploradas (generador propio; no toca nada de lo anterior). Terreno abierto para futuras zonas
{
  const r3 = mulberry32(31415926), n6 = makeNoise(101), n7 = makeNoise(202);
  for (let y = 0; y < H0; y++) {
    for (let x = W1; x < W; x++) {
      const a = n6(x / 7, y / 7), b = n7(x / 10, y / 10);
      let t = T.GRASS;
      if (a > 0.72 || r3() < 0.02) t = T.TREE; else if (b > 0.84) t = T.WATER; else if (r3() < 0.007) t = T.ROCK; else if (r3() < 0.04) t = T.FLOWER;
      tiles[idx(x, y)] = t;
    }
  }
  // paso despejado entre las Tierras de Lava y las Tierras Inexploradas (7 casillas de ancho)
  for (let y = 67; y <= 73; y++) for (let x = W1 - 10; x < W1 + 10; x++) tiles[idx(x, y)] = x < W1 ? T.ASH : T.GRASS;
}

// cuatro regiones nuevas alrededor de Alba Dorada: montañas, reino de las nubes, desierto con pirámides y paraíso de coral
{
  const r4 = mulberry32(27182818), n8 = makeNoise(303), n9 = makeNoise(404), n10 = makeNoise(505);
  for (let y = 0; y < H0; y++) {
    for (let x = W1; x < W; x++) {
      const z = zoneAt(x, y).id; if (z === 'ciudad_alba' || z === 'tierras_nuevas') continue;
      const a = n8(x / 5, y / 5), b = n9(x / 9, y / 9), c = n10(x / 12, y / 12);
      let t;
      if (z === 'montana_alta') {
        t = y < 24 || c > 0.62 ? T.SNOW : T.HILL;
        if (a > 0.7) t = T.CWALL; else if (b > 0.74) t = T.PINE; else if (r4() < 0.035) t = T.PINE; else if (r4() < 0.012) t = T.CWALL; else if (r4() < 0.01 && t === T.SNOW) t = T.ICEBLOCK; else if (t === T.HILL && r4() < 0.04) t = T.FLOWER;
      } else if (z === 'nubes_reino') {
        t = T.CLOUDF; if (a > 0.68 || r4() < 0.018) t = T.CLOUDW;
      } else if (z === 'desierto_piramides') {
        t = b > 0.5 ? T.DUNE : T.SAND; if (r4() < 0.022) t = T.CACTUS; else if (r4() < 0.01) t = T.CWALL; else if (r4() < 0.006) t = T.PALM; else if (a > 0.82) t = T.CWALL;
      } else {                                                       // paraíso: playa de arena, laguna turquesa y palmeras
        t = T.SAND; const lag = Math.hypot((x - 440) / 30, (y - 112) / 22) + (b - 0.5) * 0.6;
        if (lag < 0.92 && lag > 0.0) t = T.WATER; else if (r4() < 0.05) t = T.PALM; else if (r4() < 0.03) t = T.FLOWER;
        if (lag < 0.92 && (Math.hypot(x - 430, y - 108) < 3.2 || Math.hypot(x - 452, y - 118) < 3.8 || Math.hypot(x - 440, y - 126) < 3 || Math.hypot(x - 424, y - 118) < 2.6)) { t = T.SAND; if (r4() < 0.25) t = T.PALM; }   // islotes
      }
      tiles[idx(x, y)] = t;
    }
  }
  // pirámides de arenisca (muros sólidos escalonados; la mayor guarda al jefe del desierto)
  for (const [cx, by, hw] of [[352, 112, 9], [335, 130, 5], [380, 96, 4]]) {
    for (let k = 0; k <= hw; k++) for (let x = cx - hw + k; x <= cx + hw - k; x++) tiles[idx(x, by - k)] = T.CWALL;
    tiles[idx(cx, by)] = T.SAND; tiles[idx(cx, by - 1)] = T.CWALL;      // la base queda cerrada
  }
  // montaña: cima nevada con un claro para el jefe, y cuevas (claros) en las laderas
  for (let y = 9; y <= 17; y++) for (let x = 352; x <= 366; x++) if (Math.hypot(x - 359, y - 13) < 6.5) tiles[idx(x, y)] = T.SNOW;
}
// costa de agua alrededor del mapa
for (let y = 0; y < H0; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H0 - 1 - y);
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
buildTown('aldea', [210, 211, 212], [77, 78, 79],
  [[202, 82], [203, 82], [219, 82], [220, 82], [201, 71], [221, 71]],
  [[202, 72, 208, 77, 205], [213, 72, 219, 77, 216]]);
buildTown('puerto', [99, 100, 101], [125, 126, 127],
  [[92, 129], [93, 129], [106, 129], [107, 129]],
  [[92, 122, 97, 126, 94], [102, 122, 107, 126, 104]]);

buildTown('ciudad_alba', [399, 400, 401], [69, 70, 71],
  [[398, 68], [402, 68], [398, 72], [402, 72], [400, 66], [400, 74], [383, 70], [417, 70], [383, 59], [417, 59], [383, 81], [417, 81]],
  [[384, 60, 394, 66, 389], [384, 74, 394, 80, 389], [406, 60, 416, 66, 411], [406, 74, 416, 80, 411]]);
carvePath(331, 70, 379, 70);
// calles de las regiones nuevas (Alba Dorada en el centro)
{ // despeja crestas y columnas de nube que cortarían las calles del norte
  const clr = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const z = zoneAt(x, y).id, t = tiles[idx(x, y)]; if (z === 'montana_alta' && (t === T.CWALL || t === T.PINE)) tiles[idx(x, y)] = T.HILL; else if (z === 'nubes_reino' && t === T.CLOUDW) tiles[idx(x, y)] = T.CLOUDF; } };
  clr(400, 57, 400, 40); clr(336, 40, 464, 40); clr(359, 40, 359, 14); clr(424, 40, 424, 12); clr(452, 40, 452, 26);
}
carvePath(400, 57, 400, 40); carvePath(336, 40, 464, 40);              // norte: montañas (oeste) y nubes (este)
carvePath(359, 40, 359, 14); carvePath(424, 40, 424, 12); carvePath(452, 40, 452, 26);
carvePath(400, 83, 400, 98); carvePath(336, 98, 464, 98);              // sur: desierto (oeste) y paraíso (este)
carvePath(352, 98, 352, 114); carvePath(377, 98, 377, 116); carvePath(440, 98, 440, 106);
for (let y = 0; y < H0; y++) for (let x = 400; x < 480; x++) if (y < 57 && tiles[idx(x, y)] === T.ROAD) tiles[idx(x, y)] = T.CLOUDF;    // en las nubes el camino es de nube
for (let y = 84; y < H0; y++) for (let x = 400; x < 480; x++) if (tiles[idx(x, y)] === T.ROAD && zoneAt(x, y).id === 'paraiso') tiles[idx(x, y)] = T.SAND;
for (let y = 0; y < 57; y++) for (let x = 320; x < 400; x++) if (tiles[idx(x, y)] === T.ROAD && zoneAt(x, y).id === 'montana_alta') tiles[idx(x, y)] = T.HILL;     // camino desde las Tierras de Lava hasta la puerta oeste de Alba Dorada

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

/* 3b) Cueva del Dragón: una caverna enorme y oscura con una sola puerta (en el camino del desierto) */
const CAVE = { rect: zoneById('cueva').rect, door: [122, 79], inside: [122, 85], exit: [122, 82], lair: [123, 95] };
const CAVE2 = { rect: zoneById('cueva_jade').rect, door: [52, 59], inside: [52, 52], exit: [52, 55], lair: [53, 42], flip: true };
function carveCave(C, seed) {
  const [x0, y0, x1, y1] = C.rect, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + (C.flip ? -1 : 1), nz = makeNoise(seed);
  const fy = (y) => (C.flip ? y0 + y1 - y : y);          // la puerta puede estar al norte o al sur
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.CWALL;
  const floor = (x, y) => { if (x > x0 && x < x1 && y > y0 && y < y1) tiles[idx(x, y)] = T.CFLOOR; };
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
    const dx = (x - cx) / ((x1 - x0) / 2), dy = (y - cy) / ((y1 - y0) / 2), r = Math.hypot(dx, dy);
    if (r < 0.9 + (nz(x / 3, y / 3) - 0.5) * 0.42) floor(x, y);
  }
  const vx = C.inside[0];
  for (let y = y0 + 1; y <= y0 + 8; y++) for (let x = vx - 4; x <= vx + 4; x++) floor(x, fy(y));        // vestíbulo de la entrada
  for (let y = y0 + 10; y <= y1 - 1; y++) for (let x = C.lair[0] - 9; x <= C.lair[0] + 9; x++) if (Math.hypot(x - C.lair[0], (y - (y0 + 15)) * 1.3) < 8.5) floor(x, fy(y));   // guarida
  const keep = (x, y) => Math.abs(x - C.inside[0]) <= 3 && Math.abs(y - C.inside[1]) <= 3 || Math.hypot(x - C.lair[0], y - C.lair[1]) <= 5;
  const pil = mulberry32(seed * 7 + 1);                                                              // estalagmitas
  for (let y = y0 + 2; y < y1 - 1; y++) for (let x = x0 + 2; x < x1 - 1; x++) if (tiles[idx(x, y)] === T.CFLOOR && !keep(x, y) && pil() < 0.045) tiles[idx(x, y)] = T.CWALL;
  const seen = new Set([idx(C.inside[0], C.inside[1])]), q = [...seen];                              // solo queda lo recorrible desde la entrada
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nk = idx(x + dx, y + dy); if (!seen.has(nk) && tiles[nk] === T.CFLOOR) { seen.add(nk); q.push(nk); } } }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[idx(x, y)] === T.CFLOOR && !seen.has(idx(x, y))) tiles[idx(x, y)] = T.CWALL;
}
carveCave(CAVE, 909);
carveCave(CAVE2, 1313);
// Santuario de las Nubes: cueva con forma de nube, suelo blanco; la puerta está al norte, en la Sabana junto a la aldea pesquera
const CAVE3 = { rect: zoneById('cueva_nube').rect, door: [212, 95], inside: [212, 101], exit: [212, 98], lair: [213, 111] };
function carveCloud(C, seed) {
  const [x0, y0, x1, y1] = C.rect, nz = makeNoise(seed);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.CLOUDW;
  const lobes = [[201, 109, 5.2], [207, 106.5, 6.2], [213, 107, 7.6], [220, 106.5, 6.2], [225, 109.5, 4.6], [213, 111.5, 6.5], [205, 111.5, 4.5], [221, 111.5, 4.5]];
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) for (const [lx, ly, lr] of lobes) if (Math.hypot(x - lx, (y - ly) * 1.1) < lr + (nz(x / 2.5, y / 2.5) - 0.5) * 0.9) { tiles[idx(x, y)] = T.CLOUDF; break; }
  for (let y = y0 + 1; y <= y0 + 8; y++) for (let x = C.inside[0] - 3; x <= C.inside[0] + 3; x++) tiles[idx(x, y)] = T.CLOUDF;     // vestíbulo
  const keep = (x, y) => Math.abs(x - C.inside[0]) <= 3 && Math.abs(y - C.inside[1]) <= 4 || Math.hypot(x - C.lair[0], y - C.lair[1]) <= 5;
  const pil = mulberry32(seed * 5 + 3);
  for (let y = y0 + 2; y < y1 - 1; y++) for (let x = x0 + 2; x < x1 - 1; x++) if (tiles[idx(x, y)] === T.CLOUDF && !keep(x, y) && pil() < 0.04) tiles[idx(x, y)] = T.CLOUDW;   // columnas de nube
  const seen = new Set([idx(C.inside[0], C.inside[1])]), q = [...seen];
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nk = idx(x + dx, y + dy); if (!seen.has(nk) && tiles[nk] === T.CLOUDF) { seen.add(nk); q.push(nk); } } }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[idx(x, y)] === T.CLOUDF && !seen.has(idx(x, y))) tiles[idx(x, y)] = T.CLOUDW;
}
carveCloud(CAVE3, 2121);

// Guarida del Aracnídeo Fuego Negro: cueva con forma de telaraña (anillo y radios), en las Tierras de Lava; puerta al norte
const CAVE4 = { rect: zoneById('cueva_arana').rect, door: [288, 95], inside: [288, 100], exit: [288, 98], lair: [288, 107] };
function carveWeb(C) {
  const [x0, y0, x1, y1] = C.rect, cx = C.lair[0], cy = C.lair[1];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.WEBW;
  const floor = (x, y) => { if (x > x0 && x < x1 && y > y0 && y < y1) tiles[idx(x, y)] = T.WEBF; };
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
    const dx = x - cx, dy = (y - cy) * 1.15, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (r < 4.6) floor(x, y);                                              // centro de la tela
    if (Math.abs(r - 8) < 1.1) floor(x, y);                                // anillo
    if (Math.abs(r - 12.5) < 0.9 && r < 14) floor(x, y);                   // anillo exterior
    const sp = Math.PI / 4, d = Math.abs(((a % sp) + sp * 1.5) % sp - sp / 2);   // radios cada 45 grados
    if (d < 0.2 && r < 15) floor(x, y);
  }
  for (let y = y0 + 1; y <= y0 + 6; y++) for (let x = C.inside[0] - 2; x <= C.inside[0] + 2; x++) tiles[idx(x, y)] = T.WEBF;   // vestíbulo
  const seen = new Set([idx(C.inside[0], C.inside[1])]), q = [...seen];
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nk = idx(x + dx, y + dy); if (inb(x + dx, y + dy) && tiles[nk] === T.WEBF && !seen.has(nk)) { seen.add(nk); q.push(nk); } } }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[idx(x, y)] === T.WEBF && !seen.has(idx(x, y))) tiles[idx(x, y)] = T.WEBW;
}
carveWeb(CAVE4);

// Gruta del Leviatán Abisal: cueva inundada (suelo de agua poco profunda, lagos hondos y columnas de roca) en la Selva Esmeralda; puerta al norte
const CAVE5 = { rect: zoneById('cueva_mar').rect, door: [229, 39], inside: [229, 44], exit: [229, 42], lair: [229, 52] };
function carveAqua(C, seed) {
  const [x0, y0, x1, y1] = C.rect, cx = C.lair[0] + 0.5, cy = C.lair[1] - 1.5, nz = makeNoise(seed);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.AQW;
  const floor = (x, y) => { if (x > x0 && x < x1 && y > y0 && y < y1) tiles[idx(x, y)] = T.AQF; };
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
    const dx = (x - cx) / 16, dy = (y - cy) / 9.2;
    if (Math.hypot(dx, dy) < 0.97 + (nz(x / 3, y / 3) - 0.5) * 0.34) floor(x, y);                      // gran cámara inundada
  }
  for (let y = y0 + 1; y <= y0 + 6; y++) for (let x = C.inside[0] - 3; x <= C.inside[0] + 3; x++) floor(x, y);   // vestíbulo
  const keep = (x, y) => Math.abs(x - C.inside[0]) <= 4 && y <= y0 + 7 || Math.hypot(x - C.lair[0], (y - C.lair[1]) * 1.2) <= 8;
  for (const [lx, ly, lr] of [[219.5, 47, 1.9], [240, 47.5, 1.9], [220, 55.5, 1.7], [239.5, 55.5, 1.7], [229.5, 57, 1.3]]) {   // lagos hondos (agua profunda)
    for (let y = Math.floor(ly - lr - 1); y <= Math.ceil(ly + lr + 1); y++) for (let x = Math.floor(lx - lr - 1); x <= Math.ceil(lx + lr + 1); x++) if (tiles[idx(x, y)] === T.AQF && Math.hypot(x - lx, (y - ly) * 1.1) < lr && !keep(x, y)) tiles[idx(x, y)] = T.WATER;
  }
  const pil = mulberry32(seed * 3 + 5);
  for (let y = y0 + 2; y < y1 - 1; y++) for (let x = x0 + 2; x < x1 - 1; x++) if (tiles[idx(x, y)] === T.AQF && !keep(x, y) && pil() < 0.035) tiles[idx(x, y)] = T.AQW;   // columnas de roca
  const seen = new Set([idx(C.inside[0], C.inside[1])]), q = [...seen];
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nk = idx(x + dx, y + dy); if (inb(x + dx, y + dy) && tiles[nk] === T.AQF && !seen.has(nk)) { seen.add(nk); q.push(nk); } } }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[idx(x, y)] === T.AQF && !seen.has(idx(x, y))) tiles[idx(x, y)] = T.AQW;
}
carveAqua(CAVE5, 5151);

// Caldera del Soberano del Magma: cámara de basalto con grietas de lava en las Tierras de Lava; la puerta está al norte
const CAVE6 = { rect: zoneById('cueva_magma').rect, door: [288, 118], inside: [288, 123], exit: [288, 121], lair: [288, 131] };
function carveMagma(C, seed) {
  const [x0, y0, x1, y1] = C.rect, cx = C.lair[0] + 0.5, cy = C.lair[1] - 2.5, nz = makeNoise(seed);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.MAGW;
  const floor = (x, y) => { if (x > x0 && x < x1 && y > y0 && y < y1) tiles[idx(x, y)] = T.MAGF; };
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
    const dx = (x - cx) / 15.8, dy = (y - cy) / 8.2;
    if (Math.hypot(dx, dy) < 0.97 + (nz(x / 3, y / 3) - 0.5) * 0.3) floor(x, y);                       // gran cámara
  }
  for (let y = y0 + 1; y <= y0 + 6; y++) for (let x = C.inside[0] - 3; x <= C.inside[0] + 3; x++) floor(x, y);   // vestíbulo
  const keep = (x, y) => Math.abs(x - C.inside[0]) <= 4 && y <= y0 + 7 || Math.hypot(x - C.lair[0], (y - C.lair[1]) * 1.1) <= 9;
  for (const [lx, ly, lr] of [[277, 126, 1.6], [300, 126, 1.6], [276.5, 132.5, 1.5], [300.5, 132.5, 1.5]]) {      // pequeños lagos de lava en los bordes
    for (let y = Math.floor(ly - lr - 1); y <= Math.ceil(ly + lr + 1); y++) for (let x = Math.floor(lx - lr - 1); x <= Math.ceil(lx + lr + 1); x++) if (tiles[idx(x, y)] === T.MAGF && Math.hypot(x - lx, (y - ly) * 1.1) < lr && !keep(x, y)) tiles[idx(x, y)] = T.LAVA;
  }
  const pil = mulberry32(seed * 3 + 5);
  for (let y = y0 + 2; y < y1 - 1; y++) for (let x = x0 + 2; x < x1 - 1; x++) if (tiles[idx(x, y)] === T.MAGF && !keep(x, y) && pil() < 0.03) tiles[idx(x, y)] = T.MAGW;   // columnas de basalto
  const seen = new Set([idx(C.inside[0], C.inside[1])]), q = [...seen];
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nk = idx(x + dx, y + dy); if (inb(x + dx, y + dy) && tiles[nk] === T.MAGF && !seen.has(nk)) { seen.add(nk); q.push(nk); } } }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[idx(x, y)] === T.MAGF && !seen.has(idx(x, y))) tiles[idx(x, y)] = T.MAGW;
}
carveMagma(CAVE6, 6161);

// Tumba de Anubis: gran sala funeraria de piedra violeta (desierto de las pirámides). Pilares, brasas moradas y un altar al fondo; la puerta está al norte
const CAVE7 = { rect: zoneById('cueva_anubis').rect, door: [377, 117], inside: [377, 122], exit: [377, 120], lair: [377, 130] };
(function carveTomb(C) {
  const [x0, y0, x1, y1] = C.rect, cx = 377.5;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = T.TOMBW;
  const floor = (x, y) => { if (x > x0 && x < x1 && y > y0 && y < y1) tiles[idx(x, y)] = T.TOMBF; };
  for (let y = y0 + 1; y <= y0 + 4; y++) for (let x = C.inside[0] - 3; x <= C.inside[0] + 3; x++) floor(x, y);          // vestíbulo
  for (let y = y0 + 3; y < y1; y++) for (let x = x0 + 2; x < x1 - 1; x++) { const dx = Math.abs(x - cx) / 15.6, dy = (y - 128.5) / 7.6; if (dx * dx + dy * dy < 1.06 || (Math.abs(x - cx) < 14 && y >= y0 + 4)) floor(x, y); }      // gran sala
  // pilares en dos filas a cada lado
  for (const px of [365, 369, 386, 390]) for (const py of [122, 126, 131]) if (tiles[idx(px, py)] === T.TOMBF) tiles[idx(px, py)] = T.TOMBW;
  // altar al fondo: arco de piedra con un nicho
  for (let x = 372; x <= 383; x++) for (let y = 134; y <= 135; y++) tiles[idx(x, y)] = T.TOMBW;
  for (const [x, y] of [[374, 133], [381, 133]]) tiles[idx(x, y)] = T.TOMBW;
  // brasas moradas (6)
  for (const [x, y] of [[367, 124], [388, 124], [367, 133], [388, 133], [371, 128], [384, 128]]) if (tiles[idx(x, y)] === T.TOMBF) tiles[idx(x, y)] = T.BRAZ;
  // alcobas laterales con estatuas (zonas bajas decoradas con pilares)
  for (const [ax, ay] of [[364, 127], [391, 127]]) for (let dy = 0; dy < 2; dy++) tiles[idx(ax, ay + dy * 3)] = T.TOMBW;
  const seen = new Set([idx(C.inside[0], C.inside[1])]), q = [...seen];
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nk = idx(x + dx, y + dy); if (inb(x + dx, y + dy) && tiles[nk] === T.TOMBF && !seen.has(nk)) { seen.add(nk); q.push(nk); } } }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[idx(x, y)] === T.TOMBF && !seen.has(idx(x, y))) tiles[idx(x, y)] = T.TOMBW;
})(CAVE7);

// Cueva del Gremio de Mineros: cueva propia (zona segura) con portal de entrada junto a la ciudad. Solo rocas de nivel bajo y medio
const GUILD = { rect: zoneById('gremio_minero').rect, door: [74, 64], outside: [74, 65], inside: [47, 83], exit: [47, 84] };
(function carveGuild(C) {
  const [x0, y0, x1, y1] = C.rect;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = (x === x0 || x === x1 || y === y0 || y === y1) ? T.CWALL : T.MFLOOR;
  for (const [px, py] of [[38, 74], [57, 74], [38, 81], [57, 81], [47, 78], [49, 78], [43, 76], [52, 76]]) tiles[idx(px, py)] = T.CWALL;     // columnas
})(GUILD);

/* Santuario de las Cinco Sombras (Raid): 6 salas en fila al sur del mundo. Todo el sur se cierra con roca y se talla cada sala. */
for (let y = H0; y < H; y++) for (let x = 0; x < W; x++) tiles[idx(x, y)] = T.CWALL;
const RAID = { rooms: RAID_ROOMS, enter: { x: 85, y: 72 } };
(function carveRaid() {
  const rr = mulberry32(777001), nz = makeNoise(9091);
  for (const R of RAID_ROOMS) {
    const wall = R.id === 'raid_xaelis' ? T.CLOUDW : R.id === 'raid_aranak' || R.id === 'raid_hall' ? T.WALL : T.CWALL;
    const floor = { raid_hall: T.DFLOOR, raid_slyvra: T.SWAMP, raid_koros: T.ASH, raid_aranak: T.MFLOOR, raid_xaelis: T.CLOUDF, raid_malgathor: T.AFLOOR }[R.id];
    for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) tiles[idx(x, y)] = wall;
    const ax = (R.x1 - R.x0) / 2 - 1.2, ay = (R.y1 - R.y0) / 2 - 1.2, mid = R.id === 'raid_hall' || R.id === 'raid_aranak';
    for (let y = R.y0 + 1; y < R.y1; y++) for (let x = R.x0 + 1; x < R.x1; x++) {
      const dx = (x - (R.x0 + R.x1) / 2) / ax, dy = (y - (R.y0 + R.y1) / 2) / ay;
      const inside = mid ? true : (Math.pow(Math.abs(dx), 3.2) + Math.pow(Math.abs(dy), 3.2) < 1 + (nz(x / 3, y / 3) - 0.5) * 0.25);   // sala casi rectangular con esquinas redondeadas
      if (inside) tiles[idx(x, y)] = floor;
    }
    // decoración de cada sala (lejos de la entrada al oeste, del centro y de la guarida al este)
    const free = (x, y) => Math.abs(x - R.cx) > 3 && Math.abs(y - R.cy) > 3 && x > R.x0 + 8 && x < R.x1 - 3 && y > R.y0 + 2 && y < R.y1 - 2 && tiles[idx(x, y)] === floor;
    const blob = (bx, by, rad, t) => { for (let y = Math.floor(by - rad - 1); y <= Math.ceil(by + rad + 1); y++) for (let x = Math.floor(bx - rad - 1); x <= Math.ceil(bx + rad + 1); x++) if (Math.hypot(x - bx, y - by) <= rad && free(x, y)) tiles[idx(x, y)] = t; };
    if (R.id === 'raid_slyvra') { for (let i = 0; i < 7; i++) blob(R.x0 + 10 + rr() * 22, R.y0 + 3 + rr() * 18, 1.4 + rr() * 1.6, T.BOG); for (let i = 0; i < 12; i++) { const x = R.x0 + 9 + Math.floor(rr() * 24), y = R.y0 + 3 + Math.floor(rr() * 19); if (free(x, y)) tiles[idx(x, y)] = T.DEADTREE; } }
    else if (R.id === 'raid_koros') { for (let i = 0; i < 6; i++) blob(R.x0 + 10 + rr() * 22, R.y0 + 3 + rr() * 18, 1.5 + rr() * 1.8, T.LAVA); for (let i = 0; i < 10; i++) { const x = R.x0 + 9 + Math.floor(rr() * 24), y = R.y0 + 3 + Math.floor(rr() * 19); if (free(x, y)) tiles[idx(x, y)] = T.ROCK; } }
    else if (R.id === 'raid_aranak') { for (let i = 0; i < 9; i++) { const x = R.x0 + 9 + Math.floor(rr() * 24), y = R.y0 + 3 + Math.floor(rr() * 19); if (free(x, y)) tiles[idx(x, y)] = T.ROCK; } for (const yy of [R.y0 + 4, R.y1 - 4]) for (let x = R.x0 + 10; x < R.x1 - 4; x++) if (free(x, yy) && (x % 7)) tiles[idx(x, yy)] = T.LAVA; }
    else if (R.id === 'raid_xaelis') { for (let i = 0; i < 8; i++) { const x = R.x0 + 9 + Math.floor(rr() * 24), y = R.y0 + 3 + Math.floor(rr() * 19); if (free(x, y)) tiles[idx(x, y)] = T.CLOUDW; } }
    else if (R.id === 'raid_malgathor') { for (let i = 0; i < 6; i++) blob(R.x0 + 10 + rr() * 22, R.y0 + 3 + rr() * 18, 1.2 + rr() * 1.4, T.LAVA); for (let i = 0; i < 8; i++) { const x = R.x0 + 9 + Math.floor(rr() * 24), y = R.y0 + 3 + Math.floor(rr() * 19); if (free(x, y)) tiles[idx(x, y)] = T.CWALL; } }
    R.start = [R.x0 + 5, R.cy]; R.lair = [R.x1 - 9, R.cy];
    // entrada de jugadores siempre libre
    for (let y = R.cy - 2; y <= R.cy + 2; y++) for (let x = R.x0 + 2; x <= R.x0 + 8; x++) tiles[idx(x, y)] = floor;
    for (let y = R.cy - 3; y <= R.cy + 3; y++) for (let x = R.lair[0] - 3; x <= R.lair[0] + 3; x++) tiles[idx(x, y)] = floor;
  }
})();


/* 4) Caminos (despejan árboles, agua y rocas del trazado) */
function carvePath(x0, y0, x1, y1) {
  const put = (x, y) => { if (inb(x, y) && tiles[idx(x, y)] !== T.PORTAL && tiles[idx(x, y)] !== T.WALL && tiles[idx(x, y)] !== T.CWALL && tiles[idx(x, y)] !== T.CLOUDW && tiles[idx(x, y)] !== T.WEBW && tiles[idx(x, y)] !== T.AQW && tiles[idx(x, y)] !== T.MAGW) tiles[idx(x, y)] = T.ROAD; };
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
carvePath(211, 39, 229, 39);    // ramal al portal de la Gruta del Leviatán
carvePath(150, 78, 200, 78);    // camino largo al este: Aldea Pesquera
carvePath(211, 70, 211, 36);    // camino de la aldea a la Selva Esmeralda
carvePath(212, 84, 212, 94);    // camino de la aldea al Santuario de las Nubes
carvePath(288, 78, 288, 94);    // camino a la Guarida del Aracnídeo
carvePath(222, 78, 300, 78);    // y hacia el fondo de la sabana y las Tierras de Lava
carvePath(90, 75, 90, 100);     // puerta sur -> colinas
carvePath(90, 100, 67, 100);    // ramal al portal de las Minas
carvePath(90, 100, 100, 119);   // camino al Puerto Marea
carvePath(67, 102, 30, 102);    // calle del pantano
carvePath(30, 102, 30, 118);

/* 5) Portales */
const PORTALS = [];
function addPortal(x, y, tx, ty, label, fee) { tiles[idx(x, y)] = T.PORTAL; PORTALS.push({ x, y, tx, ty, label, fee: fee || 0 }); }
const CAVE_FEE = 2000;
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
addPortal(CAVE.door[0], CAVE.door[1], CAVE.inside[0], CAVE.inside[1], 'Cueva del Dragón de las Sombras (peligro extremo)', CAVE_FEE);
addPortal(CAVE.exit[0], CAVE.exit[1], CAVE.door[0], CAVE.door[1] - 1, 'Salir al Desierto');
addPortal(CAVE2.door[0], CAVE2.door[1], CAVE2.inside[0], CAVE2.inside[1], 'Cueva del Hidra de Jade (peligro extremo)', CAVE_FEE);
addPortal(CAVE2.exit[0], CAVE2.exit[1], CAVE2.door[0], CAVE2.door[1] + 1, 'Salir al Prado');
addPortal(CAVE3.door[0], CAVE3.door[1], CAVE3.inside[0], CAVE3.inside[1], 'Santuario de las Nubes (peligro extremo)', CAVE_FEE);
addPortal(CAVE3.exit[0], CAVE3.exit[1], CAVE3.door[0], CAVE3.door[1] - 1, 'Salir a la Sabana');
addPortal(CAVE4.door[0], CAVE4.door[1], CAVE4.inside[0], CAVE4.inside[1], 'Guarida del Aracnídeo Fuego Negro (peligro extremo)', CAVE_FEE);
addPortal(CAVE4.exit[0], CAVE4.exit[1], CAVE4.door[0], CAVE4.door[1] - 1, 'Salir a las Tierras de Lava');
addPortal(CAVE5.door[0], CAVE5.door[1], CAVE5.inside[0], CAVE5.inside[1], 'Gruta del Leviatán Abisal (peligro extremo)', CAVE_FEE);
addPortal(CAVE5.exit[0], CAVE5.exit[1], CAVE5.door[0], CAVE5.door[1] - 1, 'Salir a la Selva Esmeralda');
addPortal(CAVE6.door[0], CAVE6.door[1], CAVE6.inside[0], CAVE6.inside[1], 'Caldera del Soberano del Magma (peligro extremo)', CAVE_FEE);
addPortal(CAVE6.exit[0], CAVE6.exit[1], CAVE6.door[0], CAVE6.door[1] - 1, 'Salir a las Tierras de Lava');
addPortal(CAVE7.door[0], CAVE7.door[1], CAVE7.inside[0], CAVE7.inside[1], 'Tumba de Anubis (peligro extremo)', CAVE_FEE);
addPortal(CAVE7.exit[0], CAVE7.exit[1], CAVE7.door[0], CAVE7.door[1] - 1, 'Salir al Desierto de las Pirámides');
addPortal(GUILD.door[0], GUILD.door[1], GUILD.inside[0], GUILD.inside[1], 'Cueva del Gremio de Mineros (zona segura)');
addPortal(GUILD.exit[0], GUILD.exit[1], GUILD.outside[0], GUILD.outside[1], 'Salir al Prado');
{
  const H1 = RAID_ROOMS[0];
  addPortal(RAID.enter.x, RAID.enter.y, H1.start[0] + 3, H1.cy, 'Santuario de las Cinco Sombras (Raid de 1 a 10 jugadores)');
  addPortal(H1.start[0] - 2, H1.cy, RAID.enter.x, RAID.enter.y - 1, 'Salir a la Ciudad de Aldea Real');
}

function clearAround(cx, cy, r) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!inb(x, y)) continue;
      const t = tiles[idx(x, y)];
      if (BLOCKED[t] && t !== T.WALL && t !== T.CWALL && t !== T.CLOUDW && t !== T.WEBW && t !== T.AQW && t !== T.MAGW) tiles[idx(x, y)] = zoneAt(x, y).id === 'dunas' ? T.DUNE : zoneAt(x, y).id === 'cumbres' ? T.SNOW : T.GRASS;
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
  { id: 'ilda',   name: 'Ilda la Banquera',    icon: '🏦', spr: 'gerda', x: 389, y: 63, type: 'bank' },
  { id: 'marela', name: 'Marela la Pescadora', icon: '🐟', x: 411, y: 63, type: 'shop', shop: 'marela' },
  { id: 'zaroth', name: 'Zaroth el Brujo',     icon: '🧙', spr: 'orin',  x: 411, y: 77, type: 'shop', shop: 'zaroth' },
  { id: 'durgan', name: 'Durgan el Capataz', icon: '⛏️', x: 44, y: 72, type: 'shop', shop: 'durgan' },
  { id: 'boris', name: 'Boris el Mercader',  icon: '🧑‍🌾', x: 85,  y: 62,  type: 'shop', shop: 'boris' },
  { id: 'orin',  name: 'Orin el Sabio',      icon: '🧙‍♂️', x: 95,  y: 62,  type: 'shop', shop: 'orin' },
  { id: 'gerda', name: 'Gerda la Banquera',  icon: '👩‍💼', x: 95,  y: 68,  type: 'bank' },
  { id: 'nilo',  name: 'Nilo el Pescador',   icon: '🎣', x: 205, y: 74, type: 'shop', shop: 'nilo' },
  { id: 'tomas', name: 'Tomás el Banquero',  icon: '🧑‍💼', x: 216, y: 74, type: 'bank' },
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
  monsterSpawns.push({ type: 'dragon_sombra', x: CAVE.lair[0], y: CAVE.lair[1] });
  monsterSpawns.push({ type: 'hidra_jade', x: CAVE2.lair[0], y: CAVE2.lair[1] });
  monsterSpawns.push({ type: 'arcangel', x: CAVE3.lair[0], y: CAVE3.lair[1] });
monsterSpawns.push({ type: 'aracnido_fuego', x: CAVE4.lair[0], y: CAVE4.lair[1] });
  monsterSpawns.push({ type: 'leviatan', x: CAVE5.lair[0], y: CAVE5.lair[1] });
  monsterSpawns.push({ type: 'ignaros', x: CAVE6.lair[0], y: CAVE6.lair[1] });
  monsterSpawns.push({ type: 'anubis', x: CAVE7.lair[0], y: CAVE7.lair[1] });
  const nearest = (zoneId, px, py) => {
    let best = null, bd = 1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!reach[idx(x, y)] || zoneAt(x, y).id !== zoneId || tiles[idx(x, y)] === T.PORTAL || tiles[idx(x, y)] === T.ROAD) continue;
      const d = Math.hypot(x - px, y - py);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  };
  for (const [type, zone, px, py] of [['senor_orco', 'bosque', 20, 10], ['hidra', 'pantano', 40, 125], ['rey_escorpion', 'dunas', 160, 60], ['cangrejo_colosal', 'playa', 125, 128],
    ['serafin_fuego', 'montana_alta', 359, 13], ['serafin_tormenta', 'nubes_reino', 440, 24], ['amenkhet', 'desierto_piramides', 352, 116], ['reina_coral', 'paraiso', 440, 100]]) {
    const b = nearest(zone, px, py);
    monsterSpawns.push({ type, x: b[0], y: b[1] });
  }
})();

// Versión compacta del mapa para el cliente (un carácter por casilla)
const CH = '0123456789abcdefghijklmnopqrstuvwxyzABCD';
const rows = [];
for (let y = 0; y < H; y++) {
  let s = '';
  for (let x = 0; x < W; x++) s += CH[tiles[idx(x, y)]];
  rows.push(s);
}

module.exports = {
  W, H, T, BLOCKED, tiles, ZONES, zoneAt, zoneById, PORTALS, portalAt, NPCS, SPAWN_POINT,
  RAID, isWalkable, reach, monsterSpawns, rows, catRooms, abyRooms, minRooms, pirRooms, forRooms,
};
