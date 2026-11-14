'use strict';
/* Rey de los Dragones (Este II): decoración de la Guarida (trono, cadáveres, huesos, calaveras…) y efectos de sus ataques:
   llamarada + temblor + rocas, aleteo (viento), bolas de fuego, vuelo, aterrizaje con lava y derrumbe. Solo visual.
   Para quitarlo: borrar este archivo y su <script>. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const FLY = (window.RDFLY = new Map()), FLY0 = (window.RDFLY0 = new Map());
  const AN = [], RUB = [];
  let QUAKE = 0, LAVA = null; const SEEN = new Set();
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const hs = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, Math.max(2, r)); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, Math.max(1, r), Math.max(1, r) * 0.8, 0, 0, 7); c.stroke(); };
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T, f });

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    for (let i = RUB.length - 1; i >= 0; i--) if (now - RUB[i].t > 5000) RUB.splice(i, 1);
    if (f.lid) { if (SEEN.has(f.lid)) return; SEEN.add(f.lid); if (SEEN.size > 40) SEEN.delete(SEEN.values().next().value); }
    switch (f.k) {
      case 'rd_fly': FLY.set(f.id, now + f.T); FLY0.set(f.id, now); break;
      case 'rd_land': X.burst(f.x, f.y, 'dark', 40, { sp: 6, up: 2, g: 3, life: 1.1, size: 3 }); X.ring(f.x, f.y, 'fire', 800, 140, 6); G.shake = { t: now, m: 9 }; FLY.delete(f.id); break;
      case 'rd_quake': QUAKE = Math.max(QUAKE, now + f.T); break;
      case 'rd_rock': ADD('rd_rock', f, f.T + 600); break;
      case 'rd_wind': ADD('rd_wind', f, f.T + 300); break;
      case 'rd_wind_hit': ADD('rd_wind_hit', f, 900); X.burst(f.x, f.y, 'dark', 30, { sp: 9, up: 0.5, g: 0, life: 0.8, size: 2.4, add: false }); G.shake = { t: now, m: 7 }; break;
      case 'rd_fb': ADD('rd_fb', f, f.T + 50); break;
      case 'rd_lava': LAVA = { t: now, f }; break;
      default: break;
    }
  });
  // al caer una roca queda un montón de escombros un rato
  const rubble = (x, y, big) => { RUB.push({ t: performance.now(), x, y, big }); };

  /* ---------------- adornos de la guarida ---------------- */
  function drawProp(c, k, x, y, now, i) {
    if (k === 'throne') {                                                                                // trono de huesos y piedra negra (ocupa 3×3 casillas)
      const w = 96, h = 92; c.save(); c.translate(x, y + 16);
      c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(0, 6, w * 0.55, 10, 0, 0, 7); c.fill();
      c.fillStyle = '#1b1613'; c.fillRect(-w * 0.45, -h * 0.35, w * 0.9, h * 0.36);                       // base
      c.fillStyle = '#2a211c'; c.fillRect(-w * 0.45, -h * 0.35, w * 0.9, 5);
      c.fillStyle = '#251d19'; c.beginPath(); c.moveTo(-w * 0.3, -h * 0.3); c.lineTo(-w * 0.34, -h * 0.95); c.lineTo(-w * 0.12, -h * 1.08); c.lineTo(0, -h * 1.0); c.lineTo(w * 0.12, -h * 1.08); c.lineTo(w * 0.34, -h * 0.95); c.lineTo(w * 0.3, -h * 0.3); c.closePath(); c.fill();   // respaldo
      c.fillStyle = '#3a2d25'; c.beginPath(); c.moveTo(-w * 0.18, -h * 0.35); c.lineTo(-w * 0.2, -h * 0.85); c.lineTo(0, -h * 0.92); c.lineTo(w * 0.2, -h * 0.85); c.lineTo(w * 0.18, -h * 0.35); c.closePath(); c.fill();
      c.fillStyle = '#3d312a'; c.fillRect(-w * 0.34, -h * 0.55, w * 0.68, 7);                              // asiento
      for (const s of [-1, 1]) {                                                                          // cuernos de dragón a los lados
        c.fillStyle = '#d9cfb4'; c.beginPath(); c.moveTo(s * w * 0.3, -h * 0.9); c.quadraticCurveTo(s * w * 0.55, -h * 1.1, s * w * 0.46, -h * 1.38); c.quadraticCurveTo(s * w * 0.42, -h * 1.1, s * w * 0.24, -h * 0.98); c.closePath(); c.fill();
        c.fillStyle = '#b8ae94'; c.beginPath(); c.moveTo(s * w * 0.3, -h * 0.92); c.quadraticCurveTo(s * w * 0.5, -h * 1.08, s * w * 0.44, -h * 1.3); c.quadraticCurveTo(s * w * 0.43, -h * 1.1, s * w * 0.28, -h * 0.96); c.closePath(); c.fill();
      }
      c.fillStyle = '#e8dfc6'; c.beginPath(); c.ellipse(0, -h * 1.05, 11, 13, 0, 0, 7); c.fill();         // cráneo de dragón en lo alto
      c.fillStyle = '#16110e'; c.fillRect(-7, -h * 1.08, 5, 5); c.fillRect(2, -h * 1.08, 5, 5); c.fillRect(-2, -h * 0.98, 4, 5);
      const fl = 0.6 + 0.4 * Math.sin(now / 150);
      c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,${110 + Math.round(60 * fl)},30,${0.8})`; c.fillRect(-6, -h * 1.07, 3, 3); c.fillRect(3, -h * 1.07, 3, 3);
      glow(c, 0, -h * 0.6, 60, '255,90,20', 0.13 + 0.07 * fl); c.restore();
      c.save(); c.fillStyle = '#d8cfb6'; for (let q = 0; q < 7; q++) { const bx = x - 40 + q * 13 + hs(q, 1) * 6, by = y + 18 + hs(q, 2) * 6; c.beginPath(); c.ellipse(bx, by, 5, 2.4, hs(q, 3) * 3, 0, 7); c.fill(); } c.restore();
    } else if (k === 'mouth') {                                                                         // entrada exterior: boca de roca con colmillos, calavera de dragón y antorchas
      const s = 0.8, fl = 0.6 + 0.4 * Math.sin(now / 130); c.save(); c.translate(x, y + 4); c.scale(s, s);
      const P = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.closePath(); c.fill(); };
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, 52, 205, 22, 0, 0, 7); c.fill();
      P([[-190, 52], [-175, -38], [-130, -103], [-70, -143], [0, -158], [70, -143], [130, -103], [175, -38], [190, 52]], '#2e2826');
      for (let q = 0; q < 70; q++) { const rx = (hs(q, 1) - 0.5) * 340, ry = -140 + hs(q, 2) * 185; if (Math.abs(rx) < 80 && ry > -92) continue; const sz = 6 + hs(q, 3) * 10; P([[rx - sz, ry + sz * 0.5], [rx - sz / 3, ry - sz], [rx + sz, ry - sz / 3], [rx + sz * 0.7, ry + sz * 0.6]], ['#3c3532', '#241f1e', '#463e3a', '#342e2b'][q % 4]); }
      P([[-72, 50], [-76, -28], [-52, -84], [0, -100], [52, -84], [76, -28], [72, 50]], '#0a0505');
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 5, 0, 0, 90); g.addColorStop(0, `rgba(255,90,25,${0.35 + 0.15 * fl})`); g.addColorStop(1, 'rgba(255,60,10,0)'); c.fillStyle = g; c.fillRect(-90, -100, 180, 170); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter'; const pg = c.createRadialGradient(0, 14, 2, 0, 14, 34); pg.addColorStop(0, 'rgba(190,210,255,.95)'); pg.addColorStop(0.5, 'rgba(110,130,255,.55)'); pg.addColorStop(1, 'rgba(80,90,255,0)'); c.fillStyle = pg; c.fillRect(-40, -22, 80, 72);
      c.strokeStyle = `rgba(210,225,255,${0.6 + 0.3 * fl})`; c.lineWidth = 3; for (let q = 0; q < 2; q++) { c.beginPath(); c.ellipse(0, 14, 20 - q * 8, 26 - q * 10, now / 700 * (q ? -1 : 1), 0, 4.6); c.stroke(); } c.restore();
      for (let q = -5; q <= 5; q++) { const tx = q * 13; P([[tx - 6, -86 + Math.abs(q) * 3 + (Math.abs(q) < 5 ? 0 : 20)], [tx, -60 + Math.abs(q) * 2], [tx + 6, -86 + Math.abs(q) * 3]], '#e2dac4'); }
      for (let q = -4; q <= 4; q++) { const tx = q * 14 + 7; P([[tx - 6, 50], [tx, 26], [tx + 6, 50]], '#d6cfb8'); }
      for (const sd of [-1, 1]) {                                                                         // calavera de dragón con cuernos y ojos encendidos
        P([[sd * 38, -170], [sd * 74, -196], [sd * 92, -244], [sd * 62, -214], [sd * 34, -186]], '#cdc4ac');
      }
      P([[-46, -138], [-38, -180], [0, -192], [38, -180], [46, -138], [22, -124], [-22, -124]], '#e4dcc6');
      for (const sd of [-1, 1]) { c.fillStyle = '#120a08'; c.beginPath(); c.ellipse(sd * 22, -158, 11, 11, 0, 0, 7); c.fill(); c.fillStyle = `rgba(255,${100 + Math.round(60 * fl)},30,1)`; c.fillRect(sd * 22 - 4, -162, 8, 8); }
      c.fillStyle = '#1c130e'; c.fillRect(-4, -146, 8, 10);
      for (const sd of [-1, 1]) {                                                                         // antorchas
        const tx = sd * 120, ty = 40; c.fillStyle = '#241c18'; c.fillRect(tx - 4, ty - 20, 8, 38); P([[tx - 12, ty - 22], [tx + 12, ty - 22], [tx + 8, ty - 12], [tx - 8, ty - 12]], '#3a2e26');
        c.save(); c.globalCompositeOperation = 'lighter'; const gg = c.createRadialGradient(tx, ty - 40, 3, tx, ty - 40, 46); gg.addColorStop(0, `rgba(255,120,30,${0.4 + 0.2 * fl})`); gg.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = gg; c.fillRect(tx - 50, ty - 90, 100, 100); c.restore();
        P([[tx - 9, ty - 22], [tx - 6, ty - 44 - 3 * fl], [tx, ty - 62 - 5 * fl], [tx + 6, ty - 44], [tx + 9, ty - 22]], '#ff9628'); P([[tx - 4, ty - 22], [tx, ty - 42], [tx + 4, ty - 22]], '#ffeb96');
      }
      for (let q = 0; q < 12; q++) { const bx = (hs(q, 5) - 0.5) * 330, by = 54 + hs(q, 6) * 22; if (Math.abs(bx) < 55) continue;
        if (q % 2) { c.fillStyle = '#e2dac4'; c.beginPath(); c.arc(bx, by, 7, 0, 7); c.fill(); c.fillRect(bx - 4, by + 2, 8, 6); c.fillStyle = '#140c0a'; c.fillRect(bx - 4, by - 3, 3, 3); c.fillRect(bx + 1, by - 3, 3, 3); }
        else { c.strokeStyle = '#d6cfb8'; c.lineWidth = 4; c.beginPath(); c.moveTo(bx - 12, by); c.lineTo(bx + 12, by + 3); c.stroke(); } }
      c.restore();
    } else if (k === 'brazier') {                                                                       // brasero con fuego
      const fl = 0.6 + 0.4 * Math.sin(now / 110 + i * 2); c.save();
      c.fillStyle = '#241c18'; c.fillRect(x - 3, y - 2, 6, 14); c.fillStyle = '#332820'; c.beginPath(); c.moveTo(x - 10, y - 4); c.lineTo(x + 10, y - 4); c.lineTo(x + 6, y + 4); c.lineTo(x - 6, y + 4); c.closePath(); c.fill();
      c.globalCompositeOperation = 'lighter'; glow(c, x, y - 12, 38 + 8 * fl, '255,110,30', 0.28 + 0.14 * fl);
      c.fillStyle = `rgba(255,${130 + Math.round(70 * fl)},40,.9)`; c.beginPath(); c.moveTo(x - 7, y - 4); c.quadraticCurveTo(x - 5, y - 16 - 5 * fl, x, y - 24 - 6 * fl); c.quadraticCurveTo(x + 5, y - 16, x + 7, y - 4); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,240,170,.85)'; c.beginPath(); c.moveTo(x - 3, y - 4); c.quadraticCurveTo(x, y - 14 - 3 * fl, x + 3, y - 4); c.closePath(); c.fill(); c.restore();
    } else if (k === 'corpse') {                                                                        // aventurero caído (cadáver)
      const a = (hs(i, 3) - 0.5) * 0.8, pal = [['#4a5a7a', '#8a6a4a'], ['#6a3a3a', '#a07a5a'], ['#3a5a4a', '#9a7a58'], ['#5a4a6a', '#b08a68']][i % 4];
      c.save(); c.translate(x, y + 5); c.rotate(a); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, 4, 17, 5, 0, 0, 7); c.fill();
      c.fillStyle = pal[0]; c.fillRect(-9, -4, 17, 9); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-9, -4, 17, 2);
      c.fillStyle = pal[1]; c.beginPath(); c.arc(-12, 0, 4.2, 0, 7); c.fill(); c.fillStyle = '#26201c'; c.fillRect(-14, -1, 1.6, 1.6); c.fillRect(-11, -1, 1.6, 1.6);
      c.fillStyle = pal[1]; c.fillRect(8, -3, 7, 2.4); c.fillRect(8, 2, 8, 2.4); c.fillStyle = '#2a2420'; c.fillRect(14, -3, 4, 3); c.fillRect(15, 2, 4, 3);
      c.fillStyle = 'rgba(110,20,10,.55)'; c.beginPath(); c.ellipse(1, 1, 6, 3, 0.3, 0, 7); c.fill();
      if (i % 3 === 0) { c.fillStyle = '#7a7f8a'; c.fillRect(-3, -9, 2, 14); c.fillStyle = '#4a3322'; c.fillRect(-4, 4, 4, 2); }   // espada rota al lado
      c.restore();
    } else if (k === 'bones') {                                                                         // hueso suelto
      const a = hs(i, 3) * 3 - 1.5; c.save(); c.translate(x, y + 4); c.rotate(a); c.fillStyle = '#cfc6ae'; c.fillRect(-12, -1.6, 24, 3.2); c.fillStyle = '#e7dfc8'; c.fillRect(-12, -1.6, 24, 1);
      for (const s of [-1, 1]) { c.fillStyle = '#cfc6ae'; c.beginPath(); c.arc(s * 12, -1.8, 3, 0, 7); c.arc(s * 12, 1.8, 3, 0, 7); c.fill(); } c.restore();
    } else if (k === 'skull') {                                                                         // calavera
      c.save(); c.translate(x, y + 4); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 5, 7, 2.4, 0, 0, 7); c.fill();
      c.fillStyle = '#e4dcc4'; c.beginPath(); c.arc(0, -2, 6, 0, 7); c.fill(); c.fillRect(-3.4, 2, 6.8, 4); c.fillStyle = '#1a1410'; c.fillRect(-4, -3, 3, 3); c.fillRect(1, -3, 3, 3); c.fillRect(-0.8, 1, 1.6, 2);
      c.fillStyle = '#cfc6ae'; c.fillRect(-2.4, 4.4, 1, 1.6); c.fillRect(0.4, 4.4, 1, 1.6); c.restore();
    } else if (k === 'ribs') {                                                                          // caja torácica de un monstruo enorme
      c.save(); c.translate(x, y + 6); c.rotate((hs(i, 4) - 0.5) * 0.4); c.fillStyle = '#d3caae'; c.fillRect(-1.6, -14, 3.2, 17);
      for (let q = 0; q < 4; q++) for (const s of [-1, 1]) { c.strokeStyle = '#d3caae'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -12 + q * 4); c.quadraticCurveTo(s * 13, -14 + q * 4, s * 10, -3 + q * 3.5); c.stroke(); }
      c.restore();
    } else if (k === 'weapon') {                                                                        // arma clavada en el suelo
      const a = (hs(i, 7) - 0.5) * 0.9; c.save(); c.translate(x, y + 3); c.rotate(a); c.fillStyle = '#8b92a0'; c.fillRect(-1.5, -24, 3, 22); c.fillStyle = '#c6cddb'; c.fillRect(-1.5, -24, 1, 22);
      c.fillStyle = '#5a3a22'; c.fillRect(-1.2, -2, 2.4, 8); c.fillStyle = '#6a5a3a'; c.fillRect(-6, -3, 12, 2); c.restore();
    } else if (k === 'coins') {                                                                         // montoncito de monedas
      c.fillStyle = '#6a4c10'; c.beginPath(); c.ellipse(x, y + 8, 12, 4.4, 0, 0, 7); c.fill();
      for (let q = 0; q < 8; q++) { const a = hs(i, q) * 6.28, r = hs(q, i) * 7; c.fillStyle = q % 2 ? '#ffd24a' : '#e0a820'; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + 5 + Math.sin(a) * r * 0.4 - q * 0.5, 3.2, 1.5, 0, 0, 7); c.fill(); }
      if (Math.sin(now / 300 + i * 2) > 0.8) { c.fillStyle = '#fff'; c.fillRect(x + 4, y - 2, 2, 2); }
    } else if (k === 'rubble') {                                                                        // piedras caídas
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + 8, 12, 4, 0, 0, 7); c.fill();
      for (let q = 0; q < 4; q++) { const rx = x - 8 + q * 5 + hs(i, q) * 3, ry = y + 4 + hs(q, i) * 5, s = 3 + hs(i + q, 2) * 4; c.fillStyle = q % 2 ? '#3d3732' : '#2b2622'; c.beginPath(); c.moveTo(rx - s, ry + s * 0.5); c.lineTo(rx - s * 0.4, ry - s); c.lineTo(rx + s, ry - s * 0.2); c.lineTo(rx + s * 0.7, ry + s * 0.6); c.closePath(); c.fill(); }
    }
  }
  const onScr = (c, x, y, m) => x > -m && y > -m && x < c.canvas.width + m && y < c.canvas.height + m;

  X.on('under', (c, now) => {
    const TS = X.TS;
    if (G.e2p && G.e2p.length && G.me) { const z = X.zoneAt(G.me.x, G.me.y); for (let i = 0; i < G.e2p.length; i++) { const [x0, y0, k] = G.e2p[i]; if (k === 'throne' || k === 'brazier' || (k !== 'mouth' && !(z && z.id === 'cueva_dragones'))) continue; const sx = px(x0), sy = py(y0); if (onScr(c, sx, sy, 200)) drawProp(c, k, sx, sy, now, i); } }
    if (QUAKE > now) G.shake = { t: now, m: 2.6 };
    for (const r of RUB) { const p = (now - r.t) / 5000; if (p >= 1) continue; const x = px(r.x), y = py(r.y); drawProp(c, 'rubble', x, y, now, Math.round(r.x * 7 + r.y)); }
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'rd_rock') {                                                                            // sombra de aviso de la roca
        const u = Math.min(1, (now - b.t) / f.T), x = px(f.x), y = py(f.y), r = f.r * TS; if (now - b.t > f.T + 120) continue;
        c.save(); c.fillStyle = `rgba(0,0,0,${0.12 + 0.3 * u})`; c.beginPath(); c.ellipse(x, y, r * (0.35 + 0.65 * u), r * 0.8 * (0.35 + 0.65 * u), 0, 0, 7); c.fill();
        ring(c, x, y, r, f.big ? '255,150,60' : '255,200,120', 2, 0.35 + 0.5 * u); c.restore();
      } else if (b.k === 'rd_wind') {                                                                     // aviso del aleteo: anillos de aire que se expanden
        const x = px(f.x), y = py(f.y), u = (now - b.t) / (f.T + 300);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let q = 0; q < 3; q++) { const w = (u * 1.4 + q / 3) % 1; ring(c, x, y, f.R * TS * w, '210,230,255', 3, 0.5 * (1 - w)); }
        glow(c, x, y, f.R * TS * 0.7, '200,220,255', 0.07 + 0.07 * u); c.restore();
      } else if (b.k === 'rd_wind_hit') {                                                                 // ráfaga: rayas de viento hacia fuera
        const x = px(f.x), y = py(f.y); c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (let q = 0; q < 26; q++) { const a = q / 26 * 6.283 + hs(q, 1) * 0.2, r0 = (1 + p * f.R * (0.7 + hs(q, 2) * 0.5)) * TS, len = (1.5 + hs(q, 3) * 3) * TS; c.strokeStyle = `rgba(225,238,255,${0.8 * (1 - p)})`; c.lineWidth = 2 + hs(q, 4) * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.8); c.lineTo(x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len) * 0.8); c.stroke(); }
        c.restore();
      }
    }
  });

  function drawLava(c, now) {
    const TS = X.TS;
    if (LAVA) {
      const f = LAVA.f, t = now - LAVA.t, total = f.warn + f.dur + 900;
      if (t > total) LAVA = null;
      else {
        const sx0 = X.sxOf(f.x0), sy0 = X.syOf(f.y0), sx1 = X.sxOf(f.x1) + TS, sy1 = X.syOf(f.y1) + TS;
        const up = Math.min(1, Math.max(0, (t - f.warn * 0.55) / (f.warn * 0.45))), down = t > f.warn + f.dur ? 1 - (t - f.warn - f.dur) / 900 : 1, k = Math.max(0, up * down);
        if (t < f.warn) {                                                                                // aviso: refugios resaltados, el suelo se calienta
          c.save(); c.fillStyle = `rgba(255,70,10,${0.06 + 0.12 * (t / f.warn)})`; c.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0); c.restore();
        }
        if (k > 0.01) {
          c.save(); c.beginPath(); c.rect(sx0, sy0, sx1 - sx0, sy1 - sy0);
          for (const s of f.safe) { const x = px(s[0]), y = py(s[1]), r = s[2] * TS; c.moveTo(x + r, y); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); }
          c.clip('evenodd');
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * k; c.fillStyle = '#b8300c'; c.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
          c.globalAlpha = k;
          for (let q = 0; q < 150; q++) {                                                                // manchas brillantes que burbujean
            const bx = sx0 + hs(q, 1) * (sx1 - sx0), by = sy0 + hs(q, 2) * (sy1 - sy0); if (!onScr(c, bx, by, 40)) continue;
            const ph = (now / 900 + hs(q, 3) * 6) % 1, rr = 5 + hs(q, 4) * 11 * Math.sin(ph * 3.14);
            glow(c, bx, by, rr + 4, '255,170,40', 0.34 * Math.sin(ph * 3.14));
          }
          c.restore();
        }
        for (const s of f.safe) {                                                                        // refugio: plataforma de roca con halo
          const x = px(s[0]), y = py(s[1]), r = s[2] * TS, pu = 0.5 + 0.5 * Math.sin(now / 200);
          c.save(); c.fillStyle = 'rgba(70,60,56,.55)'; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
          c.strokeStyle = `rgba(160,240,255,${0.55 + 0.35 * pu})`; c.lineWidth = 2.5; c.setLineDash([8, 6]); c.lineDashOffset = -now / 40; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.stroke(); c.setLineDash([]);
          c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 0.9, '140,230,255', 0.1 + 0.08 * pu); c.restore();
        }
      }
    }
  }

  X.on('draw', (c, now) => {
    const TS = X.TS;
    drawLava(c, now);
    if (G.e2p && G.e2p.length && G.me) { const z = X.zoneAt(G.me.x, G.me.y); if (z && z.id === 'cueva_dragones') for (let i = 0; i < G.e2p.length; i++) { const [x0, y0, k] = G.e2p[i]; if (k !== 'throne' && k !== 'brazier') continue; const sx = px(x0), sy = py(y0); if (onScr(c, sx, sy, 120)) drawProp(c, k, sx, sy, now, i); } }
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'rd_rock') {                                                                            // la roca cae del techo
        const fall = Math.min(1, (now - b.t) / f.T);
        if (now - b.t < f.T) {
          const x = px(f.x), y = py(f.y), r = f.r * TS * (f.big ? 0.8 : 0.55), hh = (1 - fall * fall) * 260 * (fall > 0.55 ? 1 : 0) + (fall <= 0.55 ? 0 : 0);
          if (fall > 0.62) { const u = (fall - 0.62) / 0.38, yy = y - (1 - u * u) * 300; c.save(); c.translate(x, yy); c.rotate(u * 3 + f.x);
            c.fillStyle = '#3a342f'; c.beginPath(); c.moveTo(-r, r * 0.4); c.lineTo(-r * 0.5, -r * 0.9); c.lineTo(r * 0.3, -r); c.lineTo(r, -r * 0.1); c.lineTo(r * 0.7, r * 0.8); c.closePath(); c.fill();
            c.fillStyle = '#5a514a'; c.beginPath(); c.moveTo(-r * 0.5, -r * 0.9); c.lineTo(r * 0.3, -r); c.lineTo(r * 0.1, -r * 0.2); c.lineTo(-r * 0.6, -r * 0.1); c.closePath(); c.fill(); c.restore(); }
          void hh;
        } else if (!b.hit) { b.hit = 1; X.burst(f.x, f.y, 'dark', f.big ? 22 : 10, { sp: f.big ? 6 : 4, up: 3, g: 5, life: 0.7, size: f.big ? 3.6 : 2.6, add: false }); G.shake = { t: now, m: f.big ? 8 : 4 }; rubble(f.x, f.y, f.big); }
      } else if (b.k === 'rd_fb') {                                                                       // bola de fuego en parábola desde el dragón volador
        const u = Math.min(1, (now - b.t) / f.T), x = px(f.x1) + (px(f.x2) - px(f.x1)) * u, y0 = py(f.y1) - 60 + (py(f.y2) - (py(f.y1) - 60)) * u, y = y0 - Math.sin(u * Math.PI) * 70;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let q = 1; q <= 5; q++) { const v = Math.max(0, u - q * 0.035), xx = px(f.x1) + (px(f.x2) - px(f.x1)) * v, yy = py(f.y1) - 60 + (py(f.y2) - (py(f.y1) - 60)) * v - Math.sin(v * Math.PI) * 70; glow(c, xx, yy, 12 - q, '255,120,30', 0.35 - q * 0.05); }
        glow(c, x, y, 20, '255,150,40', 0.8); c.fillStyle = '#fff3c0'; c.beginPath(); c.arc(x, y, 4.2, 0, 7); c.fill(); c.restore();
      }
    }
    // llamas que salen de la boca del dragón durante el ataque
    for (const e of G.ents.values()) {
      if (e.kind !== 'mo' || e.t !== 'rey_dragones') continue;
      const castT = (X.casts.get(e.id) || 0), fl = (FLY.get(e.id) || 0) > now;
      if (castT > now || fl) { const dir = (e.face || 1) < 0 ? -1 : 1, x = X.sxOf(e.rx) + TS / 2 + dir * 62, y = X.syOf(e.ry) + TS - (fl ? 80 : 54); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 30 + 6 * Math.sin(now / 70), '255,120,30', 0.35); for (let q = 0; q < 4; q++) { const u = ((now / 260 + q / 4) % 1); c.fillStyle = `rgba(255,${150 + Math.round(80 * (1 - u))},50,${0.7 * (1 - u)})`; c.beginPath(); c.arc(x + dir * u * 26, y + (hs(q, 1) - 0.5) * 12 * u, 5 * (1 - u * 0.5), 0, 7); c.fill(); } c.restore(); }
    }
  });
})();
