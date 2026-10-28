'use strict';
/* Realismo de iluminación y terreno (solo visual, en el cliente). Va con el botón ✨:
   nivel 2: oclusión ambiental junto a muros, rocas y árboles; sombras con luz filtrada bajo las copas; bordes blandos entre
            tipos de suelo; agua con profundidad y brillo del cielo; sombras de nubes; bruma baja; luz dinámica de hechizos,
            proyectiles, lava y jefes enfurecidos; vaho en el frío.
   nivel 3: + reflejo de la luna en el agua, bruma más densa, luces más intensas. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const TS = 32;
  const lvl = () => (X.gfx ? X.gfx.level() : 2);
  const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hourNow = () => (X.env ? X.env.hour() : 12);
  const nightK = (h) => (h >= 12 ? smooth(17.5, 20.5, h) : 1 - smooth(5, 7.5, h));
  const tile = (x, y) => (x < 0 || y < 0 || x >= G.W || y >= G.H ? -1 : G.tiles[y * G.W + x]);
  const cen = (cw, ch, x, y) => [(x - G.cam.x) * TS + cw / 2, (y - G.cam.y) * TS + ch / 2];

  const WALLS = new Set([4, 26, 30, 32, 34]), ROCKY = new Set([7, 18, 19]), TREES = new Set([2, 15, 16, 17]);
  const CLS = { 0: 'g', 8: 'g', 2: 'g', 7: 'g', 24: 'g', 3: 'r', 11: 's', 15: 's', 14: 'd', 12: 'n', 16: 'n', 13: 'm', 17: 'm', 23: 'm' };
  const CC = { g: '92,138,62', r: '146,128,100', s: '218,196,148', d: '222,192,132', n: '238,244,250', m: '72,92,60' };
  const LIGHT = { fire: '255,140,50', ice: '120,200,255', arcane: '190,140,255', void: '150,70,220', storm: '255,230,90', poison: '150,220,80', dark: '150,90,220', sun: '255,215,100', water: '90,210,230', magic: '140,190,235' };

  /* distancia a la orilla de cada casilla de agua (para el color de profundidad) */
  let wd = null, wdFor = null;
  const waterDist = () => {
    if (wd && wdFor === G.tiles) return wd;
    const n = G.W * G.H; wd = new Uint8Array(n).fill(0); wdFor = G.tiles;
    let q = [];
    for (let i = 0; i < n; i++) if (G.tiles[i] === 1) { const x = i % G.W, y = (i / G.W) | 0; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(x + a, y + b) !== 1)) { wd[i] = 1; q.push(i); } }
    for (let d = 1; d < 6 && q.length; d++) {
      const nq = [];
      for (const i of q) { const x = i % G.W, y = (i / G.W) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx >= G.W || ny >= G.H) continue; const j = ny * G.W + nx; if (G.tiles[j] === 1 && !wd[j]) { wd[j] = d + 1; nq.push(j); } } }
      q = nq;
    }
    for (let i = 0; i < n; i++) if (G.tiles[i] === 1 && !wd[i]) wd[i] = 6;
    return wd;
  };

  /* partículas en pantalla (vaho, brasas) */
  const P = [];
  const spark = (x, y, vx, vy, life, size, col, add) => { if (P.length < 160) P.push({ x, y, vx, vy, t: 0, life, size, col, add }); };
  let last = performance.now(), lastBreath = 0;

  /* ---------- suelo: bajo los árboles ---------- */
  X.on('ground', (c, now, cw, ch) => {
    const L = lvl(); if (L < 2 || !G.me || !G.tiles) return;
    const z = X.zoneAt(G.me.x, G.me.y), dun = z.kind === 'dungeon';
    const h = hourNow(), nt = nightK(h), day = dun ? 0 : 1 - nt, dir = Math.max(-1, Math.min(1, (h - 12.5) / 6));
    const x0 = Math.floor(G.cam.x - cw / 2 / TS) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / TS) + 1, y0 = Math.floor(G.cam.y - ch / 2 / TS) - 1, y1 = Math.ceil(G.cam.y + ch / 2 / TS) + 1;
    const W = waterDist();
    c.save();
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = tile(tx, ty); if (t < 0) continue;
      const sx = (tx - G.cam.x) * TS + cw / 2 - TS / 2, sy = (ty - G.cam.y) * TS + ch / 2 - TS / 2, cx = sx + TS / 2, cy = sy + TS / 2, hh = hash(tx, ty);
      if (t === 1) {                                                                // agua: más oscura y azul cuanto más lejos de la orilla + brillo del cielo
        const d = W[ty * G.W + tx] || 1;
        c.fillStyle = `rgba(8,38,92,${Math.min(0.42, 0.07 * d)})`; c.fillRect(sx, sy, TS, TS);
        const sheen = 0.5 + 0.5 * Math.sin(now / 1400 + (tx + ty) * 0.6 + hh * 3);
        c.fillStyle = day > 0.1 ? `rgba(190,225,255,${0.07 * sheen * day})` : `rgba(150,170,230,${0.05 * sheen * nt})`; c.fillRect(sx, sy + 8 * sheen, TS, 10);
        if (L >= 3 && nt > 0.4 && d >= 2) {                                         // columna de luna sobre el agua
          const moonX = G.cam.x + 3, m = Math.max(0, 1 - Math.abs(tx - moonX) / 2.5) * nt;
          if (m > 0 && hh > 0.3) { const tw = 0.5 + 0.5 * Math.sin(now / 300 + hh * 50); c.fillStyle = `rgba(225,235,255,${0.45 * m * tw})`; c.fillRect(cx - 6 + (hh * 13 % 1) * 8, cy - 1 + (hh * 7 % 1) * 10, 8, 1.5); }
        }
        continue;
      }
      // mezcla suave entre tipos de suelo
      const a = CLS[t];
      if (a) for (const [ax, ay] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const b = CLS[tile(tx + ax, ty + ay)]; if (!b || b === a) continue;
        const g = c.createLinearGradient(cx + ax * 16, cy + ay * 16, cx + ax * 6, cy + ay * 6);
        g.addColorStop(0, `rgba(${CC[b]},0.62)`); g.addColorStop(1, `rgba(${CC[b]},0)`);
        c.fillStyle = g; c.fillRect(sx, sy, TS, TS);
      }
      // oclusión ambiental: el suelo junto a muros y rocas se oscurece
      if (!WALLS.has(t) && !ROCKY.has(t) && !TREES.has(t)) {
        for (const [ax, ay] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const o = tile(tx + ax, ty + ay); if (!(WALLS.has(o) || ROCKY.has(o))) continue;
          const g = c.createLinearGradient(cx + ax * 16, cy + ay * 16, cx + ax * 2, cy + ay * 2);
          g.addColorStop(0, `rgba(8,10,18,${dun ? 0.32 : 0.26})`); g.addColorStop(1, 'rgba(8,10,18,0)'); c.fillStyle = g; c.fillRect(sx, sy, TS, TS);
        }
        if (t === 14 && hh > 0.5) { c.strokeStyle = `rgba(150,110,60,${0.16 + 0.08 * Math.sin(now / 2000 + hh * 9)})`; c.lineWidth = 1; c.beginPath(); c.moveTo(sx + 2, cy + (hh - 0.5) * 10); c.quadraticCurveTo(cx, cy + (hh - 0.5) * 10 - 4, sx + 30, cy + (hh - 0.5) * 10 + 1); c.stroke(); }   // ondas de la duna
        if ((t === 3 || t === 11) && hh > 0.9) { c.fillStyle = 'rgba(90,86,80,.55)'; c.beginPath(); c.ellipse(sx + 6 + hh * 90 % 20, sy + 8 + hh * 50 % 16, 2.2, 1.5, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(200,196,188,.35)'; c.fillRect(sx + 5 + hh * 90 % 20, sy + 7 + hh * 50 % 16, 1.5, 0.8); }   // guijarros
      }
      if (TREES.has(t)) {                                                          // sombra de copa con luz filtrada que baila con el viento
        const dap = 0.5 + 0.5 * Math.sin(now / 1700 + hh * 9 + tx * 0.4);
        if (day > 0.05) {
          const al = (0.13 + 0.05 * dap) * day, ox = dir * 12;
          c.save(); c.translate(cx + ox, cy + 8); c.scale(1, 0.58);
          const g = c.createRadialGradient(0, 0, 3, 0, 0, 30); g.addColorStop(0, `rgba(10,24,10,${al * 1.5})`); g.addColorStop(1, 'rgba(10,24,10,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 30, 0, 7); c.fill(); c.restore();
          if (dap > 0.55) { c.fillStyle = `rgba(255,240,190,${0.06 * day * (dap - 0.5)})`; c.beginPath(); c.ellipse(cx + ox * 1.6 + (hh - 0.5) * 12, cy + 14, 5 + hh * 4, 2.5, 0, 0, 7); c.fill(); }   // mancha de sol entre las hojas
        }
        const g2 = c.createRadialGradient(cx, cy + 10, 2, cx, cy + 10, 20); g2.addColorStop(0, 'rgba(6,10,6,.34)'); g2.addColorStop(1, 'rgba(6,10,6,0)'); c.fillStyle = g2; c.fillRect(cx - 22, cy - 10, 44, 40);   // oclusión en la base
      } else if (ROCKY.has(t) || t === 27) {
        if (t === 27) {                                                             // lava: brilla e ilumina lo cercano
          c.save(); c.globalCompositeOperation = 'lighter';
          const g = c.createRadialGradient(cx, cy, 2, cx, cy, 46); g.addColorStop(0, `rgba(255,110,30,${0.34 + 0.1 * Math.sin(now / 300 + hh * 20)})`); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.fillRect(cx - 46, cy - 46, 92, 92); c.restore();
          if (Math.random() < 0.012) spark(cx, cy, (Math.random() - 0.5) * 14, -22 - Math.random() * 18, 1.2, 1.8, '255,170,70', true);
        } else { const g = c.createRadialGradient(cx, cy + 8, 2, cx, cy + 8, 22); g.addColorStop(0, 'rgba(8,10,14,.3)'); g.addColorStop(1, 'rgba(8,10,14,0)'); c.fillStyle = g; c.fillRect(cx - 24, cy - 12, 48, 44); }
      }
    }
    c.restore();
  });

  /* ---------- encima: nubes, bruma, luz dinámica, vaho ---------- */
  X.on('draw', (c, now, cw, ch, dt, tx, ty) => {
    const L = lvl(); if (L < 2 || !G.me) return;
    const dts = Math.min(0.1, (now - last) / 1000); last = now;
    const z = X.zoneAt(G.me.x, G.me.y), dun = z.kind === 'dungeon', snowz = z.id === 'cumbres', swamp = z.id === 'pantano' || z.id === 'cienaga';
    const W = X.env ? X.env.weather() : { kind: null, k: 0 }, wet = W.kind === 'rain' ? W.k : 0, h = hourNow(), nt = nightK(h), day = dun ? 0 : 1 - nt;
    // sombras de nubes que pasan sobre el mapa (periódicas, siguen al viento)
    if (!dun && day > 0.1) {
      const per = 56, wx = now / 1000 * 0.35;
      c.save();
      for (let i = 0; i < 6; i++) {
        let ox = (((i * 17.3 + wx * (1 + (i % 3) * 0.15) - G.cam.x + per / 2) % per) + per) % per - per / 2, oy = (((i * 11.1 + 7 - G.cam.y + per / 2) % per) + per) % per - per / 2;
        const r = (4 + (i % 3) * 1.6) * TS, x = cw / 2 + ox * TS, y = ch / 2 + oy * TS * 0.8;
        if (x < -r || x > cw + r || y < -r || y > ch + r) continue;
        c.save(); c.translate(x, y); c.scale(1.5, 0.8);
        const g = c.createRadialGradient(0, 0, r * 0.1, 0, 0, r); g.addColorStop(0, `rgba(14,22,40,${(0.16 + 0.12 * wet) * day})`); g.addColorStop(1, 'rgba(14,22,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.restore();
      }
      c.restore();
    }
    // bruma baja: al amanecer/atardecer, tras la lluvia y en pantanos
    const twi = dun ? 0 : Math.max(0, 1 - Math.abs(nt - 0.5) * 3.2), mist = Math.min(1, (swamp ? 0.7 : 0) + twi * 0.8 + wet * 0.3) * (L >= 3 ? 1.3 : 1);
    if (mist > 0.04) {
      const col = swamp ? '150,185,160' : nt > 0.5 || h < 8 ? '190,200,230' : '230,215,195';
      for (let i = 0; i < 5; i++) {
        const x = ((now / (90 + i * 23) + i * 260) % (cw + 700)) - 350, y = ch * (0.45 + 0.13 * i) + Math.sin(now / 3500 + i) * 14;
        c.save(); c.translate(x, y); c.scale(1, 0.22); const g = c.createRadialGradient(0, 0, 10, 0, 0, 340); g.addColorStop(0, `rgba(${col},${0.2 * mist})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 340, 0, 7); c.fill(); c.restore();
      }
    }
    // luz dinámica: proyectiles elementales, hechizos, jefes enfurecidos
    const k = (0.5 + 0.9 * nt + (dun ? 0.7 : 0)) * (L >= 3 ? 1.25 : 1);
    const lights = [];
    for (const p of G.proj || []) { const T = p.T || 300, u = (now - p.t) / T; if (u < 0 || u > 1 || !p.el || p.s === 'ranged' || p.s === 'arrow') continue; lights.push([p.x1 + (p.x2 - p.x1) * u, p.y1 + (p.y2 - p.y1) * u - 0.3, LIGHT[p.el] || LIGHT.magic, 0.5, 72]); }
    for (const cst of G.casts || []) { const u = (now - cst.t) / 420; if (u < 0 || u > 1) continue; lights.push([cst.x, cst.y - 0.2, LIGHT[cst.el] || LIGHT.magic, 0.55 * (1 - u), 80]); }
    for (const e of G.ents.values()) {
      if (e.kind === 'mo' && G.mons[e.t] && G.mons[e.t].boss && e.H && e.h / e.H <= 0.5) lights.push([e.rx, e.ry - 0.3, e.h / e.H <= 0.25 ? '255,50,30' : '255,110,40', 0.35 + 0.1 * Math.sin(now / 200), 110]);
      if (e.id === G.id && G.eq && G.eq.weapon && G.items[G.eq.weapon[0]] && G.items[G.eq.weapon[0]].el) lights.push([e.rx, e.ry - 0.5, LIGHT[G.items[G.eq.weapon[0]].el] || LIGHT.magic, 0.08, 40]);
    }
    if (lights.length) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [wx, wy, col, a, r] of lights) {
        const [x, y] = cen(cw, ch, wx, wy); if (x < -r || y < -r || x > cw + r || y > ch + r) continue;
        const g = c.createRadialGradient(x, y, 3, x, y, r); g.addColorStop(0, `rgba(${col},${Math.min(0.7, a * k)})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      c.restore();
    }
    // vaho al respirar en el frío
    if (snowz && now - lastBreath > 1800) {
      lastBreath = now;
      for (const e of G.ents.values()) if (e.kind === 'pl' && Math.abs(e.rx - tx) < cw / 2 / TS && Math.abs(e.ry - ty) < ch / 2 / TS && ((now / 1800 + e.id) % 3) < 1) { const [x, y] = cen(cw, ch, e.rx, e.ry); for (let i = 0; i < 4; i++) spark(x + 4 + i * 2, y - 24, 6 + Math.random() * 6, -6 - Math.random() * 6, 1.1, 2 + i * 0.6, '235,245,255', false); }
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dts; if (p.t >= p.life) { P.splice(i, 1); continue; }
      p.x += p.vx * dts; p.y += p.vy * dts; const a = 1 - p.t / p.life;
      c.globalCompositeOperation = p.add ? 'lighter' : 'source-over'; c.fillStyle = `rgba(${p.col},${0.55 * a})`; c.beginPath(); c.arc(p.x, p.y, p.size * (p.add ? a : 1.2 - a * 0.4), 0, 7); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  });
})();
