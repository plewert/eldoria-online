'use strict';
/* Vista 3D experimental (WebGL propio, sin dependencias): terreno low-poly con relieve (muros, rocas, árboles), cámara orbital
 * y personajes/monstruos/PNJ como figuras de pie con los sprites actuales. El 2D sigue intacto: botón 🧊 para alternar. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* nada */ } } };
  const qs = new URLSearchParams(location.search);
  if (qs.get('3d') === 'gl') store.set('eld.gl3d', '1'); else if (qs.get('3d') === '0') store.set('eld.gl3d', '0');
  let on = store.get('eld.gl3d') === '1', gl = null, cvs = null, ok = true;
  const CH = 16, RAD = 30;                                              // casillas por bloque y radio visible
  const cam = { yaw: 0, pitch: 0.92, dist: 15 };
  const P = {};                                                          // programas, buffers, texturas
  const CELL_W = 256, CELL_H = 192, COLS = 4, ROWS = 14;
  let atlas = null, actx = null, chunks = new Map(), tilesRef = null, mapKey = '';
  let objs = [], vp = new Float32Array(16), eye = [0, 0, 0], vw = 1, vh = 1, hover = null, built = 0;

  /* ---------- matemáticas ---------- */
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; };
  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const look = (e, t) => {
    let fx = t[0] - e[0], fy = t[1] - e[1], fz = t[2] - e[2]; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
    let sx = fy * 0 - fz * 1, sy = fz * 0 - fx * 0, sz = fx * 1 - fy * 0; const sl = Math.hypot(sx, sy, sz); sx /= sl; sy /= sl; sz /= sl;       // s = f × up
    const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx, m = new Float32Array(16);
    m[0] = sx; m[1] = ux; m[2] = -fx; m[4] = sy; m[5] = uy; m[6] = -fy; m[8] = sz; m[9] = uz; m[10] = -fz;
    m[12] = -(sx * e[0] + sy * e[1] + sz * e[2]); m[13] = -(ux * e[0] + uy * e[1] + uz * e[2]); m[14] = fx * e[0] + fy * e[1] + fz * e[2]; m[15] = 1; return m;
  };
  const proj = (x, y, z) => { const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]; if (w <= 0.01) return null; return [(vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w, (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w, w]; };

  /* ---------- shaders ---------- */
  const SH_T = ['attribute vec3 aPos;attribute vec3 aCol;attribute float aFl;uniform mat4 uVP;uniform vec3 uEye;varying vec3 vCol;varying float vFog;varying vec3 vP;varying float vFl;void main(){vP=aPos;vCol=aCol;vFl=aFl;vFog=clamp((distance(aPos,uEye)-17.)/14.,0.,1.);gl_Position=uVP*vec4(aPos,1.);}',
    'precision mediump float;varying vec3 vCol;varying float vFog;varying vec3 vP;varying float vFl;uniform vec3 uFog;uniform vec3 uTint;uniform float uT;void main(){vec3 c=vCol;if(vFl>.5){c+=vec3(.04,.07,.1)*sin(vP.x*3.+uT*1.6)*sin(vP.z*3.3+uT*1.3)+vec3(.03)*sin(vP.x*7.-uT*2.);}c*=uTint;gl_FragColor=vec4(mix(c,uFog,vFog),1.);}'];
  const SH_B = ['attribute vec3 aPos;attribute vec2 aUv;uniform mat4 uVP;uniform vec3 uEye;varying vec2 vUv;varying float vFog;void main(){vUv=aUv;vFog=clamp((distance(aPos,uEye)-19.)/12.,0.,1.);gl_Position=uVP*vec4(aPos,1.);}',
    'precision mediump float;varying vec2 vUv;varying float vFog;uniform sampler2D uTex;uniform vec3 uTint;void main(){vec4 t=texture2D(uTex,vUv);if(t.a<.35)discard;gl_FragColor=vec4(t.rgb*mix(uTint,vec3(1.),.35),t.a*(1.-vFog*.9));}'];
  const prog = (vs, fs) => {
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
  };

  /* ---------- terreno ---------- */
  const NAME = {}; const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  let COL = [], TREES = null, WALLS = null, FLAT = null;
  const initTiles = () => {
    const gi = X.gi; for (const k of Object.keys(gi.TILE)) NAME[gi.TILE[k]] = k;
    COL = gi.MINI_COL.map((c) => hex(c.length === 7 ? c : '#808080'));
    const ids = (arr) => new Set(arr.filter((k) => gi.TILE[k] !== undefined).map((k) => gi.TILE[k]));
    TREES = ids(['TREE', 'PINE', 'PALM', 'DEADTREE', 'CACTUS']); FLAT = ids(['WATER', 'LAVA', 'BOG']);
    WALLS = new Map(); for (const [k, h] of [['WALL', 1.6], ['CWALL', 1.7], ['ROCK', 0.9], ['ICEBLOCK', 0.8]]) if (gi.TILE[k] !== undefined) WALLS.set(gi.TILE[k], h);
  };
  const LD = (() => { const l = [0.45, 0.85, 0.3], n = Math.hypot(...l); return l.map((v) => v / n); })();
  function quadTo(out, a, b, c, d, col, fl) {            // a,b,c,d en sentido antihorario visto desde fuera
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const k = 0.5 + 0.5 * Math.max(0, nx * LD[0] + ny * LD[1] + nz * LD[2]), r = col[0] * k, g = col[1] * k, bl = col[2] * k;
    for (const q of [a, b, c, a, c, d]) out.push(q[0], q[1], q[2], r, g, bl, fl);
  }
  const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  const shade = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
  function box(out, x0, y0, z0, x1, y1, z1, col) {
    quadTo(out, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], shade(col, 1.08), 0);         // arriba
    quadTo(out, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, 0);                         // +z
    quadTo(out, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, 0);                         // -z
    quadTo(out, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], shade(col, 0.92), 0);           // +x
    quadTo(out, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], shade(col, 0.85), 0);           // -x
  }
  function pyramid(out, cx, cz, r, y0, y1, col) {
    const a = [cx - r, y0, cz + r], b = [cx + r, y0, cz + r], c = [cx + r, y0, cz - r], d = [cx - r, y0, cz - r], t = [cx, y1, cz];
    quadTo(out, a, b, t, t, col, 0); quadTo(out, b, c, t, t, shade(col, 0.92), 0); quadTo(out, c, d, t, t, col, 0); quadTo(out, d, a, t, t, shade(col, 0.85), 0);
  }
  function buildChunk(cx, cy) {
    const out = [], W = G.W, H = G.H, T = G.tiles, x0 = cx * CH, y0 = cy * CH;
    for (let y = y0; y < Math.min(H, y0 + CH); y++) for (let x = x0; x < Math.min(W, x0 + CH); x++) {
      const id = T[y * W + x], n = NAME[id] || '';
      let base = COL[id] || [0.5, 0.5, 0.5]; const j = 0.94 + hash(x, y) * 0.12; base = shade(base, j);
      const xa = x - 0.5, xb = x + 0.5, za = y - 0.5, zb = y + 0.5;
      if (FLAT.has(id)) {
        const yy = n === 'LAVA' ? -0.08 : -0.14;
        quadTo(out, [xa, yy, zb], [xb, yy, zb], [xb, yy, za], [xa, yy, za], shade(base, 1.1), 1);
        continue;
      }
      const wall = WALLS.get(id), tree = TREES.has(id), g0 = tree ? shade(COL[0] || [0.25, 0.42, 0.22], j) : base;
      if (!wall) quadTo(out, [xa, 0, zb], [xb, 0, zb], [xb, 0, za], [xa, 0, za], shade(g0, 1.1), 0);
      for (const [dx, dy, p0, p1, p2, p3] of [[0, 1, [xa, 0, zb], [xb, 0, zb], [xb, -0.14, zb], [xa, -0.14, zb]], [0, -1, [xb, 0, za], [xa, 0, za], [xa, -0.14, za], [xb, -0.14, za]], [1, 0, [xb, 0, zb], [xb, 0, za], [xb, -0.14, za], [xb, -0.14, zb]], [-1, 0, [xa, 0, za], [xa, 0, zb], [xa, -0.14, zb], [xa, -0.14, za]]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !FLAT.has(T[ny * W + nx])) continue; quadTo(out, p0, p1, p2, p3, shade(base, 0.8), 0);
      }
      if (wall) { box(out, xa, 0, za, xb, wall, zb, shade(base, 1)); continue; }
      if (tree) {
        const jx = (hash(y, x) - 0.5) * 0.25, jz = (hash(x + 9, y + 3) - 0.5) * 0.25, hh = 1 + hash(x + 5, y) * 0.35;
        if (n === 'CACTUS') { box(out, x - 0.14 + jx, 0, y - 0.14 + jz, x + 0.14 + jx, 0.9, y + 0.14 + jz, [0.3, 0.55, 0.28]); box(out, x + 0.14 + jx, 0.45, y - 0.08 + jz, x + 0.34 + jx, 0.6, y + 0.08 + jz, [0.3, 0.55, 0.28]); continue; }
        if (n === 'DEADTREE') { box(out, x - 0.08 + jx, 0, y - 0.08 + jz, x + 0.08 + jx, 1.0, y + 0.08 + jz, [0.4, 0.34, 0.3]); box(out, x + 0.08 + jx, 0.55, y - 0.04 + jz, x + 0.38 + jx, 0.63, y + 0.04 + jz, [0.4, 0.34, 0.3]); continue; }
        const trunkH = n === 'PALM' ? 1.15 : 0.5 * hh, leaf = n === 'PINE' ? [0.12, 0.34, 0.2] : n === 'PALM' ? [0.3, 0.62, 0.22] : [0.2 + hash(x, y) * 0.08, 0.5 + hash(y, x) * 0.1, 0.2];
        box(out, x - 0.09 + jx, 0, y - 0.09 + jz, x + 0.09 + jx, trunkH, y + 0.09 + jz, [0.42, 0.28, 0.16]);
        if (n === 'PINE') { pyramid(out, x + jx, y + jz, 0.46, 0.3, 1.0 * hh, leaf); pyramid(out, x + jx, y + jz, 0.34, 0.75 * hh, 1.55 * hh, shade(leaf, 1.1)); }
        else if (n === 'PALM') { pyramid(out, x + jx, y + jz, 0.55, trunkH, trunkH + 0.28, leaf); pyramid(out, x + jx, y + jz, 0.3, trunkH + 0.2, trunkH + 0.55, shade(leaf, 1.12)); }
        else { box(out, x - 0.4 + jx, trunkH - 0.05, y - 0.4 + jz, x + 0.4 + jx, trunkH + 0.55, y + 0.4 + jz, leaf); pyramid(out, x + jx, y + jz, 0.3, trunkH + 0.55, trunkH + 0.95, shade(leaf, 1.12)); }
        continue;
      }
      if (id !== undefined && BLOCKED_LOW.has(id)) box(out, xa + 0.05, 0, za + 0.05, xb - 0.05, 0.9, zb - 0.05, shade(base, 0.9));         // otros bloqueos (muros de cueva, hielo…)
    }
    const arr = new Float32Array(out), buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    return { buf, n: arr.length / 7 };
  }
  let BLOCKED_LOW = new Set();

  /* ---------- inicio ---------- */
  function initGL() {
    cvs = document.createElement('canvas'); cvs.id = 'gl3d';
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;z-index:1;touch-action:none';
    X.gi.cv.parentNode.insertBefore(cvs, X.gi.cv.nextSibling);
    gl = cvs.getContext('webgl', { antialias: true, alpha: false }); if (!gl) { ok = false; return; }
    P.t = prog(...SH_T); P.b = prog(...SH_B);
    P.tl = { VP: gl.getUniformLocation(P.t, 'uVP'), eye: gl.getUniformLocation(P.t, 'uEye'), fog: gl.getUniformLocation(P.t, 'uFog'), tint: gl.getUniformLocation(P.t, 'uTint'), t: gl.getUniformLocation(P.t, 'uT'), pos: gl.getAttribLocation(P.t, 'aPos'), col: gl.getAttribLocation(P.t, 'aCol'), fl: gl.getAttribLocation(P.t, 'aFl') };
    P.bl = { VP: gl.getUniformLocation(P.b, 'uVP'), eye: gl.getUniformLocation(P.b, 'uEye'), tint: gl.getUniformLocation(P.b, 'uTint'), tex: gl.getUniformLocation(P.b, 'uTex'), pos: gl.getAttribLocation(P.b, 'aPos'), uv: gl.getAttribLocation(P.b, 'aUv') };
    P.bbuf = gl.createBuffer(); P.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, P.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, COLS * CELL_W, ROWS * CELL_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    atlas = document.createElement('canvas'); atlas.width = COLS * CELL_W; atlas.height = ROWS * CELL_H; actx = atlas.getContext('2d'); actx.imageSmoothingEnabled = false;
    cvs.addEventListener('pointerdown', onDown); cvs.addEventListener('pointerup', onUp); cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('contextmenu', (ev) => { ev.preventDefault(); forward(ev, 'contextmenu', 2); });
    cvs.addEventListener('wheel', (ev) => { ev.preventDefault(); cam.dist = Math.max(7, Math.min(30, cam.dist * (ev.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    addEventListener('keydown', (ev) => { if (!on || /INPUT|TEXTAREA/.test((ev.target && ev.target.tagName) || '')) return; if (ev.key === 'q' || ev.key === 'Q') cam.yaw -= 0.18; else if (ev.key === 'e' || ev.key === 'E') cam.yaw += 0.18; else if (ev.key === 'PageUp') cam.pitch = Math.min(1.3, cam.pitch + 0.08); else if (ev.key === 'PageDown') cam.pitch = Math.max(0.45, cam.pitch - 0.08); });
    BLOCKED_LOW = new Set([...X.gi.BLOCK].filter((id) => !FLAT.has(id) && !TREES.has(id) && !WALLS.has(id)));
  }

  /* ---------- puntero ---------- */
  let down = null;
  const toNdc = (ev) => { const r = cvs.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * 2 - 1, 1 - ((ev.clientY - r.top) / r.height) * 2]; };
  function pickObj(nx, ny) {
    let best = null, bd = 1e9;
    for (const o of objs) {
      if (!o.sc) continue; const [x0, y0, x1, y1] = o.sc;
      if (nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1 && o.w < bd) { bd = o.w; best = o; }
    }
    return best;
  }
  function ground(nx, ny) {                                         // rayo → plano y=0
    const inv = (() => { const m = vp, a = new Float64Array(16); for (let i = 0; i < 16; i++) a[i] = m[i]; return invert(a); })(); if (!inv) return null;
    const un = (z) => { const v = [0, 0, 0, 0]; for (let r = 0; r < 4; r++) v[r] = inv[r] * nx + inv[4 + r] * ny + inv[8 + r] * z + inv[12 + r]; return [v[0] / v[3], v[1] / v[3], v[2] / v[3]]; };
    const a = un(-1), b = un(1), dy = b[1] - a[1]; if (Math.abs(dy) < 1e-6) return null; const t = -a[1] / dy;
    return { x: Math.round(a[0] + (b[0] - a[0]) * t), y: Math.round(a[2] + (b[2] - a[2]) * t) };
  }
  function invert(m) {
    const inv = new Float64Array(16), [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15] = m;
    inv[0] = m5 * m10 * m15 - m5 * m11 * m14 - m9 * m6 * m15 + m9 * m7 * m14 + m13 * m6 * m11 - m13 * m7 * m10;
    inv[4] = -m4 * m10 * m15 + m4 * m11 * m14 + m8 * m6 * m15 - m8 * m7 * m14 - m12 * m6 * m11 + m12 * m7 * m10;
    inv[8] = m4 * m9 * m15 - m4 * m11 * m13 - m8 * m5 * m15 + m8 * m7 * m13 + m12 * m5 * m11 - m12 * m7 * m9;
    inv[12] = -m4 * m9 * m14 + m4 * m10 * m13 + m8 * m5 * m14 - m8 * m6 * m13 - m12 * m5 * m10 + m12 * m6 * m9;
    inv[1] = -m1 * m10 * m15 + m1 * m11 * m14 + m9 * m2 * m15 - m9 * m3 * m14 - m13 * m2 * m11 + m13 * m3 * m10;
    inv[5] = m0 * m10 * m15 - m0 * m11 * m14 - m8 * m2 * m15 + m8 * m3 * m14 + m12 * m2 * m11 - m12 * m3 * m10;
    inv[9] = -m0 * m9 * m15 + m0 * m11 * m13 + m8 * m1 * m15 - m8 * m3 * m13 - m12 * m1 * m11 + m12 * m3 * m9;
    inv[13] = m0 * m9 * m14 - m0 * m10 * m13 - m8 * m1 * m14 + m8 * m2 * m13 + m12 * m1 * m10 - m12 * m2 * m9;
    inv[2] = m1 * m6 * m15 - m1 * m7 * m14 - m5 * m2 * m15 + m5 * m3 * m14 + m13 * m2 * m7 - m13 * m3 * m6;
    inv[6] = -m0 * m6 * m15 + m0 * m7 * m14 + m4 * m2 * m15 - m4 * m3 * m14 - m12 * m2 * m7 + m12 * m3 * m6;
    inv[10] = m0 * m5 * m15 - m0 * m7 * m13 - m4 * m1 * m15 + m4 * m3 * m13 + m12 * m1 * m7 - m12 * m3 * m5;
    inv[14] = -m0 * m5 * m14 + m0 * m6 * m13 + m4 * m1 * m14 - m4 * m2 * m13 - m12 * m1 * m6 + m12 * m2 * m5;
    inv[3] = -m1 * m6 * m11 + m1 * m7 * m10 + m5 * m2 * m11 - m5 * m3 * m10 - m9 * m2 * m7 + m9 * m3 * m6;
    inv[7] = m0 * m6 * m11 - m0 * m7 * m10 - m4 * m2 * m11 + m4 * m3 * m10 + m8 * m2 * m7 - m8 * m3 * m6;
    inv[11] = -m0 * m5 * m11 + m0 * m7 * m9 + m4 * m1 * m11 - m4 * m3 * m9 - m8 * m1 * m7 + m8 * m3 * m5;
    inv[15] = m0 * m5 * m10 - m0 * m6 * m9 - m4 * m1 * m10 + m4 * m2 * m9 + m8 * m1 * m6 - m8 * m2 * m5;
    const det = m0 * inv[0] + m1 * inv[4] + m2 * inv[8] + m3 * inv[12]; if (!det) return null; for (let i = 0; i < 16; i++) inv[i] /= det; return inv;
  }
  function forward(ev, type, button) {                              // reutiliza la lógica del 2D: le pasamos la casilla ya calculada
    if (!G.me) return;
    const [nx, ny] = toNdc(ev), o = pickObj(nx, ny), t = o ? { x: Math.round(o.x), y: Math.round(o.y) } : ground(nx, ny); if (!t) return;
    X.gl3.tile = t;
    try { X.gi.cv.dispatchEvent(new MouseEvent(type, { bubbles: false, cancelable: true, button, clientX: ev.clientX, clientY: ev.clientY })); } finally { X.gl3.tile = null; }
  }
  function onDown(ev) { if (ev.pointerType === 'touch') { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; return; } if (ev.button === 0) forward(ev, 'mousedown', 0); }
  function onUp(ev) { if (ev.pointerType === 'touch' && down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 12 && performance.now() - down.t < 450) forward(ev, 'mousedown', 0); down = null; }
  function onMove(ev) { const [nx, ny] = toNdc(ev); hover = pickObj(nx, ny); cvs.style.cursor = hover ? 'crosshair' : 'default'; }

  /* ---------- fotograma ---------- */
  function lightLevel() { const h = X.env && X.env.hour ? X.env.hour() : 12; if (h >= 7 && h <= 18) return [1, 1, 1]; const k = h < 7 ? (h < 5 ? 0 : (h - 5) / 2) : (h > 20 ? 0 : (20 - h) / 2); const f = 0.4 + 0.6 * k; return [f * 0.9, f * 0.95, 0.55 + 0.45 * f]; }
  function render(now) {
    requestAnimationFrame(render);
    if (!on || !ok || !G.me || !X.gi) return;
    if (!gl) { try { initTiles(); initGL(); if (!ok) { setOn(false); return; } setOn(true); } catch (e) { ok = false; console.warn('3D no disponible:', e && e.message); setOn(false); return; } }
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(2, Math.round(cvs.clientWidth * dpr)), h = Math.max(2, Math.round(cvs.clientHeight * dpr));
    if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; } vw = w; vh = h;
    if (tilesRef !== G.tiles) { for (const c of chunks.values()) gl.deleteBuffer(c.buf); chunks = new Map(); tilesRef = G.tiles; }
    const tx = G.cam.x, ty = G.cam.y, cp = Math.cos(cam.pitch), eyeV = [tx + Math.sin(cam.yaw) * cam.dist * cp, 0.4 + Math.sin(cam.pitch) * cam.dist, ty + Math.cos(cam.yaw) * cam.dist * cp];
    eye = eyeV; vp = mul(persp(0.9, w / h, 0.5, 90), look(eyeV, [tx, 0.5, ty]));
    const L = lightLevel(), fogC = [0.58 * L[0], 0.72 * L[1], 0.86 * L[2]];
    gl.viewport(0, 0, w, h); gl.clearColor(fogC[0], fogC[1], fogC[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    // terreno
    gl.useProgram(P.t); gl.uniformMatrix4fv(P.tl.VP, false, vp); gl.uniform3fv(P.tl.eye, eyeV); gl.uniform3fv(P.tl.fog, fogC); gl.uniform3fv(P.tl.tint, L); gl.uniform1f(P.tl.t, now / 1000);
    const ccx = Math.floor(tx / CH), ccy = Math.floor(ty / CH), nr = Math.ceil(RAD / CH); built = 0;
    gl.enableVertexAttribArray(P.tl.pos); gl.enableVertexAttribArray(P.tl.col); gl.enableVertexAttribArray(P.tl.fl);
    for (let cy = ccy - nr; cy <= ccy + nr; cy++) for (let cx = ccx - nr; cx <= ccx + nr; cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= G.W || cy * CH >= G.H) continue;
      const k = cy * 1000 + cx; let c = chunks.get(k);
      if (!c) { if (built >= 3) continue; c = buildChunk(cx, cy); chunks.set(k, c); built++; }
      if (!c.n) continue; gl.bindBuffer(gl.ARRAY_BUFFER, c.buf);
      gl.vertexAttribPointer(P.tl.pos, 3, gl.FLOAT, false, 28, 0); gl.vertexAttribPointer(P.tl.col, 3, gl.FLOAT, false, 28, 12); gl.vertexAttribPointer(P.tl.fl, 1, gl.FLOAT, false, 28, 24);
      gl.drawArrays(gl.TRIANGLES, 0, c.n);
    }
    gl.disableVertexAttribArray(P.tl.fl);
    billboards(now, L);
  }

  function billboards(now, L) {
    const gi = X.gi, tgId = G.me.tg, S = gi.TS;
    objs = [];
    const near = (x, y) => Math.abs(x - G.cam.x) < 24 && Math.abs(y - G.cam.y) < 24;
    for (const e of G.ents.values()) if (near(e.rx, e.ry)) objs.push({ x: e.rx, y: e.ry, boss: gi.isBoss(e), draw: (c, sx, sy) => gi.entOne(c, e, sx, sy, now, tgId) });
    for (const n of G.npcs) if (near(n.x, n.y)) objs.push({ x: n.x, y: n.y, boss: false, draw: (c, sx, sy) => { c.translate(sx - gi.sxOf(n.x), sy - gi.syOf(n.y)); gi.npcOne(c, n, now); } });
    for (const g of G.ground) if (near(g.x, g.y)) objs.push({ x: g.x, y: g.y, boss: false, small: true, draw: (c, sx, sy) => { c.translate(sx - gi.sxOf(g.x), sy - gi.syOf(g.y)); gi.itemOne(c, g, now); } });
    objs.sort((a, b) => (a.boss ? 1 : 0) - (b.boss ? 1 : 0) || a.y - b.y); objs = objs.slice(0, COLS * ROWS);
    const verts = new Float32Array(objs.length * 30), right = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)]; let usedRows = 0, vi = 0;
    objs.forEach((o, i) => {
      const col = i % COLS, row = (i / COLS) | 0, x0 = col * CELL_W, y0 = row * CELL_H; usedRows = Math.max(usedRows, row + 1);
      const sc = o.boss ? 1 : 2, lw = CELL_W / sc, lh = CELL_H / sc;                                // lienzo lógico de la celda
      actx.save(); actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(x0, y0, CELL_W, CELL_H); actx.beginPath(); actx.rect(x0, y0, CELL_W, CELL_H); actx.clip();
      actx.setTransform(sc, 0, 0, sc, x0, y0); actx.imageSmoothingEnabled = false;
      const sx = Math.round(lw / 2 - S / 2), sy = Math.round(lh * 0.9 - S);                          // el pie queda a ~90 % de la altura
      try { o.draw(actx, sx, sy); } catch (_) { /* un sprite roto no tumba la vista */ }
      actx.restore();
      const px = CELL_W / (S * sc), wTiles = px, hTiles = CELL_H / (S * sc), below = (CELL_H - (sy + S - 2) * sc) / (S * sc);     // tamaño en casillas y parte bajo el suelo
      const bx = o.x, bz = o.y + 0.2, y0w = -below, y1w = hTiles - below, hw = wTiles / 2;
      const u0 = x0 / atlas.width, u1 = (x0 + CELL_W) / atlas.width, v0 = y0 / atlas.height, v1 = (y0 + CELL_H) / atlas.height;
      const A = [bx - right[0] * hw, y0w, bz - right[2] * hw], B = [bx + right[0] * hw, y0w, bz + right[2] * hw], C = [bx + right[0] * hw, y1w, bz + right[2] * hw], D = [bx - right[0] * hw, y1w, bz - right[2] * hw];
      for (const [p, u, v] of [[A, u0, v1], [B, u1, v1], [C, u1, v0], [A, u0, v1], [C, u1, v0], [D, u0, v0]]) { verts[vi++] = p[0]; verts[vi++] = p[1]; verts[vi++] = p[2]; verts[vi++] = u; verts[vi++] = v; }
      const pa = proj(...A), pc = proj(...C), pb = proj(...B), pd = proj(...D); o.sc = null;
      if (pa && pb && pc && pd) { const xs = [pa[0], pb[0], pc[0], pd[0]], ys = [pa[1], pb[1], pc[1], pd[1]]; const mx = (Math.min(...xs) + Math.max(...xs)) / 2, sw = (Math.max(...xs) - Math.min(...xs)) * 0.34; o.sc = [mx - sw, Math.min(...ys), mx + sw, Math.max(...ys) * 0.55 + Math.min(...ys) * 0.45]; o.w = pa[2]; }
    });
    if (!objs.length) return;
    gl.bindTexture(gl.TEXTURE_2D, P.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, usedRows === ROWS ? atlas : (() => { const t = actx.getImageData(0, 0, atlas.width, usedRows * CELL_H); return t; })());
    gl.useProgram(P.b); gl.uniformMatrix4fv(P.bl.VP, false, vp); gl.uniform3fv(P.bl.eye, eye); gl.uniform3fv(P.bl.tint, L); gl.uniform1i(P.bl.tex, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.bbuf); gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, vi), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(P.bl.pos); gl.enableVertexAttribArray(P.bl.uv); gl.vertexAttribPointer(P.bl.pos, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(P.bl.uv, 2, gl.FLOAT, false, 20, 12);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.TRIANGLES, 0, vi / 5); gl.disable(gl.BLEND);
  }

  /* ---------- botón ---------- */
  X.gl3 = { tile: null, get on() { return on; } };
  function setOn(v) {
    on = !!v && ok; store.set('eld.gl3d', on ? '1' : '0'); const cv = X.gi && X.gi.cv;
    if (cvs) cvs.style.display = on ? 'block' : 'none'; if (cv) cv.style.opacity = on ? '0' : '1'; if (cv) cv.style.pointerEvents = on ? 'none' : '';
    if (btn) { btn.textContent = on ? '🌐 3D real' : '🌐 Probar 3D real'; btn.title = on ? 'Volver a la vista 2D (Q/E giran la cámara, rueda = zoom)' : 'Probar la vista 3D experimental'; }
    document.body.classList.toggle('gl3d', on);
  }
  let btn = null;
  function mkBtn() {
    btn = document.createElement('button'); btn.id = 'gl3dBtn'; btn.type = 'button';
    btn.style.cssText = 'position:fixed;left:10px;bottom:56px;z-index:30;padding:5px 9px;font:600 12px "Segoe UI",sans-serif;color:#e8e2d0;background:rgba(14,18,24,.8);border:1px solid #6b5a2e;border-radius:6px;cursor:pointer';
    btn.addEventListener('click', () => setOn(!on));
    document.body.appendChild(btn); setOn(on);
  }
  const wait = setInterval(() => { if (G.me && X.gi) { clearInterval(wait); mkBtn(); requestAnimationFrame(render); if (on) setTimeout(() => setOn(true), 400); } }, 300);
  X.on('snap', () => { if (on && cvs) cvs.style.display = 'block'; });
})();
