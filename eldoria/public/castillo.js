'use strict';
/* Castillo Real (cliente, solo visual): puentes de madera, fuente con chorro, almenas, antorchas y estandartes en las puertas, torres con
   tejado rojo y banderas, y la sala del trono (suelo de piedra, alfombra real, tarima, trono, columnas y braseros).
   El terreno, el rey y la guardia los manda el servidor. Para quitarlo: borrar este archivo y su <script> (queda un castillo liso). */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X, TS = 32;
  const SX = (x) => X.sxOf(x), SY = (y) => X.syOf(y);
  const R0 = [76, 36, 104, 57];                                           // zona del castillo
  const TOWERS = [[77, 37], [100, 37], [77, 53], [100, 53]];               // esquinas superiores izquierdas de las torres (4 × 4)
  let keep = null, kt = null;
  const getKeep = () => { if (kt !== G.houses) { kt = G.houses; const h = (G.houses || []).find((q) => q[5] === 'castillo'); keep = h ? { ax: h[0], ay: h[1], bx: h[2], by: h[3], door: h[4] } : null; } return keep; };
  const near = (cw, ch) => SX(R0[2] + 2) > -60 && SX(R0[0] - 2) < cw + 60 && SY(R0[3] + 2) > -120 && SY(R0[1] - 6) < ch + 60;
  const night = () => { const h = X.env ? X.env.hour() : 12; const k = h >= 12 ? Math.max(0, Math.min(1, (h - 17.5) / 3)) : 1 - Math.max(0, Math.min(1, (h - 5) / 2.5)); return k; };
  const glow = (c, x, y, r, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const banner = (c, x, y, w, h, now, k) => {                              // estandarte colgante rojo con corona dorada
    const sw = Math.sin(now / 700 + k) * 1.5;
    c.fillStyle = '#4e2c18'; c.fillRect(x - 2, y - 2, w + 4, 3);
    c.fillStyle = '#a82a38'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w + sw, y + h); c.lineTo(x + w / 2, y + h - 6); c.lineTo(x + sw, y + h); c.closePath(); c.fill();
    c.strokeStyle = '#e6b84a'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#f0c850'; c.beginPath(); const mx = x + w / 2 + sw / 2, my = y + h * 0.35; c.moveTo(mx - 5, my + 3); c.lineTo(mx - 5, my - 3); c.lineTo(mx - 2.5, my); c.lineTo(mx, my - 4); c.lineTo(mx + 2.5, my); c.lineTo(mx + 5, my - 3); c.lineTo(mx + 5, my + 3); c.closePath(); c.fill();
  };

  X.on('under', (c, now, cw, ch) => {
    if (!near(cw, ch)) return; const nk = night();
    // puentes de madera (norte y sur)
    for (const by of [36, 57]) {
      const L = SX(89), T = SY(by);
      c.fillStyle = '#7a5230'; c.fillRect(L, T, TS * 3, TS);
      c.fillStyle = '#5a3a1e'; for (let y = 3; y < TS; y += 8) c.fillRect(L, T + y, TS * 3, 1.5);
      c.fillStyle = '#8f6238'; for (let x = 0; x < TS * 3; x += 16) c.fillRect(L + x, T, 1.5, TS);
      c.fillStyle = '#3b2412'; c.fillRect(L - 2, T, 5, TS); c.fillRect(L + TS * 3 - 3, T, 5, TS);
    }
    // fuente
    { const L = SX(89) - 5, T = SY(51) - 5, W = TS * 3 + 10, Hh = TS * 2 + 10;
      c.fillStyle = '#8e887a'; c.fillRect(L, T, W, Hh); c.fillStyle = '#b4ae9e'; c.fillRect(L, T, W, 4); c.fillStyle = '#5c574d'; c.fillRect(L, T + Hh - 4, W, 4);
      c.fillStyle = '#3d7fb8'; c.fillRect(L + 6, T + 6, W - 12, Hh - 12);
      c.strokeStyle = 'rgba(190,230,255,.5)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const r = 6 + ((now / 60 + i * 12) % 36); c.globalAlpha = 1 - r / 42; c.beginPath(); c.ellipse(L + W / 2, T + Hh / 2 + 6, r, r * 0.55, 0, 0, 7); c.stroke(); } c.globalAlpha = 1;
      const cx = L + W / 2, cy = T + Hh / 2;
      c.fillStyle = '#a49e90'; c.fillRect(cx - 5, cy - 12, 10, 20); c.fillStyle = '#c4beb0'; c.fillRect(cx - 7, cy - 14, 14, 4);
      c.fillStyle = 'rgba(210,240,255,.9)'; for (let i = 0; i < 9; i++) { const k = ((now / 700) + i / 9) % 1, a = (i / 9) * 6.28; c.fillRect(cx + Math.cos(a) * 16 * k - 1, cy - 14 - Math.sin(k * 3.14) * 18 + k * 18, 2, 2); }
    }
    // almenas en los muros exteriores
    c.fillStyle = '#9a9eb0'; c.strokeStyle = '#3a3c4c'; c.lineWidth = 1;
    const mer = (x, y) => { const L = SX(x), T = SY(y); for (let i = 0; i < 3; i++) { c.fillRect(L + 2 + i * 10, T + 1, 7, 6); c.strokeRect(L + 2.5 + i * 10, T + 1.5, 6, 5); } };
    for (let x = 77; x <= 103; x++) { if (x < 89 || x > 91) { mer(x, 37); mer(x, 56); } }
    // antorchas junto a las puertas
    for (const [tx, ty] of [[88, 37], [92, 37], [88, 56], [92, 56]]) {
      const X0 = SX(tx), Y0 = SY(ty), fl = 0.8 + Math.sin(now / 120 + tx) * 0.2;
      c.fillStyle = '#3a2a1a'; c.fillRect(X0 + 14, Y0 + 12, 4, 10); c.fillStyle = '#ffb040'; c.beginPath(); c.ellipse(X0 + 16, Y0 + 9, 4, 6 * fl, 0, 0, 7); c.fill(); c.fillStyle = '#ffe890'; c.beginPath(); c.ellipse(X0 + 16, Y0 + 10, 2, 3.5 * fl, 0, 0, 7); c.fill();
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, X0 + 16, Y0 + 10, 46 + nk * 30, '255,170,70', (0.22 + nk * 0.3) * fl); c.restore();
    }
    // ----- sala del trono -----
    const K = getKeep(); if (!K) return;
    const x0 = K.ax + 1, x1 = K.bx - 1, y0 = K.ay + 1, y1 = K.by - 1, cx = K.door;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {                 // suelo de piedra en damero
      const L = SX(x), T = SY(y); c.fillStyle = (x + y) & 1 ? '#5b5770' : '#4d4963'; c.fillRect(L, T, TS, TS); c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(L, T, TS, 2); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(L, T + TS - 2, TS, 2);
    }
    c.fillStyle = '#7a6a48'; c.fillRect(SX(cx - 2), SY(y0), TS * 5, TS * 2); c.fillStyle = '#a08c5c'; c.fillRect(SX(cx - 2), SY(y0), TS * 5, 3); c.fillStyle = '#4e4228'; c.fillRect(SX(cx - 2), SY(y0 + 2) - 4, TS * 5, 4);   // tarima
    for (let y = y0 + 1; y <= K.by; y++) {                                           // alfombra real hasta la puerta
      const L = SX(cx - 1), T = SY(y); c.fillStyle = '#8e2432'; c.fillRect(L, T, TS * 3, TS);
      c.fillStyle = '#e6b84a'; c.fillRect(L + 2, T, 2, TS); c.fillRect(L + TS * 3 - 4, T, 2, TS);
      c.fillStyle = 'rgba(240,200,90,.35)'; if (y % 2) for (let i = 0; i < 3; i++) { const mx = L + 16 + i * TS; c.beginPath(); c.moveTo(mx, T + 8); c.lineTo(mx + 6, T + 16); c.lineTo(mx, T + 24); c.lineTo(mx - 6, T + 16); c.closePath(); c.fill(); }
    }
    for (const x of [x0 + 1, x0 + 3, x1 - 3, x1 - 1]) banner(c, SX(x) + 6, SY(K.ay) + 2, 20, 28, now, x);       // estandartes en la pared del fondo
    for (const x of [cx - 1, cx + 1]) { const L = SX(x), T = SY(K.ay); c.fillStyle = '#2a2f55'; c.fillRect(L + 7, T + 4, 18, 26); c.fillStyle = '#6aa8e6'; c.fillRect(L + 9, T + 6, 14, 22); c.fillStyle = 'rgba(255,230,160,.5)'; c.fillRect(L + 15, T + 6, 2, 22); }   // vidrieras
    // muebles: trono, columnas, braseros
    for (const [fx, fy, fk] of (G.decor || [])) {
      if (fx < x0 || fx > x1 || fy < y0 || fy > y1) continue; const L = SX(fx), T = SY(fy);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(L + 3, T + TS - 4, TS - 6, 4);
      if (fk === 'trono') {
        c.fillStyle = '#c9a038'; c.fillRect(L + 2, T - 14, 28, 40); c.fillStyle = '#e8c860'; c.fillRect(L + 2, T - 14, 28, 4); c.fillStyle = '#8e2432'; c.fillRect(L + 6, T - 8, 20, 30); c.fillStyle = '#b03a48'; c.fillRect(L + 8, T - 6, 16, 8);
        c.fillStyle = '#c9a038'; c.fillRect(L, T + 10, 6, 16); c.fillRect(L + 26, T + 10, 6, 16); c.fillStyle = '#f0d070'; c.beginPath(); c.arc(L + 16, T - 16, 4, 0, 7); c.fill();
      } else if (fk === 'columna') {
        c.fillStyle = '#d8d4c8'; c.fillRect(L + 6, T - 18, 20, 4); c.fillStyle = '#c4c0b2'; c.fillRect(L + 9, T - 14, 14, 36); c.fillStyle = '#eceae0'; c.fillRect(L + 9, T - 14, 4, 36); c.fillStyle = '#a8a496'; c.fillRect(L + 20, T - 14, 3, 36); c.fillStyle = '#d8d4c8'; c.fillRect(L + 6, T + 20, 20, 6);
      } else if (fk === 'brasero') {
        const fl = 0.8 + Math.sin(now / 90 + fx) * 0.2;
        c.fillStyle = '#4a3a2a'; c.fillRect(L + 12, T + 14, 8, 12); c.fillStyle = '#6a5a48'; c.beginPath(); c.moveTo(L + 6, T + 8); c.lineTo(L + 26, T + 8); c.lineTo(L + 21, T + 17); c.lineTo(L + 11, T + 17); c.closePath(); c.fill();
        c.fillStyle = '#ff9a30'; c.beginPath(); c.ellipse(L + 16, T + 5, 6, 9 * fl, 0, 0, 7); c.fill(); c.fillStyle = '#ffe080'; c.beginPath(); c.ellipse(L + 16, T + 6, 3, 5 * fl, 0, 0, 7); c.fill();
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, L + 16, T + 6, 70, '255,160,60', 0.35 * fl); c.restore();
      }
    }
  });

  X.on('draw', (c, now, cw, ch) => {
    if (!near(cw, ch)) return; const me = G.me, K = getKeep();
    // torres con tejado rojo y bandera (se vuelven transparentes si el jugador está cerca)
    for (const [tx, ty] of TOWERS) {
      const cx = SX(tx) + TS * 2, cy = SY(ty) + TS * 2 - 6, dx = me ? Math.abs(me.x + 0.5 - (tx + 2)) : 99, dy = me ? Math.abs(me.y + 0.5 - (ty + 2)) : 99, a = dx < 4.2 && dy < 4.6 ? 0.45 : 1;
      c.save(); c.globalAlpha = a;
      c.fillStyle = '#3a3c4c'; c.beginPath(); c.ellipse(cx, cy + 4, TS * 2.15, TS * 1.1, 0, 0, 7); c.fill();                  // alero
      c.fillStyle = '#b8434c'; c.beginPath(); c.moveTo(cx - TS * 2.1, cy + 2); c.lineTo(cx + TS * 2.1, cy + 2); c.lineTo(cx, cy - 84); c.closePath(); c.fill();
      c.fillStyle = '#8e2f38'; c.beginPath(); c.moveTo(cx + 2, cy + 2); c.lineTo(cx + TS * 2.1, cy + 2); c.lineTo(cx, cy - 84); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(60,16,22,.55)'; c.lineWidth = 1.4; for (let i = 1; i < 6; i++) { const yy = cy + 2 - i * 14; c.beginPath(); c.moveTo(cx - (1 - i / 6.2) * TS * 2.1, yy); c.lineTo(cx + (1 - i / 6.2) * TS * 2.1, yy); c.stroke(); }
      c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy - 84); c.lineTo(cx, cy - 114); c.stroke();
      const w = Math.sin(now / 260 + tx) * 3; c.fillStyle = '#d83a48'; c.beginPath(); c.moveTo(cx, cy - 114); c.lineTo(cx + 24 + w, cy - 108); c.lineTo(cx + 2, cy - 98); c.closePath(); c.fill(); c.strokeStyle = '#f0c850'; c.lineWidth = 1; c.stroke();
      c.restore();
    }
    // banderas en el tejado de la torre del homenaje (solo si no estás dentro)
    if (K && !(me && me.x >= K.ax + 1 && me.x <= K.bx - 1 && me.y >= K.ay + 1 && me.y <= K.by)) {
      const L = SX(K.ax) - 6, R = SX(K.bx + 1) + 6, T = SY(K.ay) - 14;
      for (const [fx, k] of [[L + 26, 0], [(L + R) / 2, 1], [R - 26, 2]]) {
        const h = k === 1 ? 58 : 44, w = Math.sin(now / 240 + k * 2) * 3;
        c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, T + 8); c.lineTo(fx, T - h); c.stroke();
        c.fillStyle = '#d83a48'; c.beginPath(); c.moveTo(fx, T - h); c.lineTo(fx + 26 + w, T - h + 7); c.lineTo(fx + 2, T - h + 18); c.closePath(); c.fill(); c.strokeStyle = '#f0c850'; c.lineWidth = 1; c.stroke();
        c.fillStyle = '#f0c850'; c.beginPath(); c.arc(fx, T - h - 2, 3, 0, 7); c.fill();
      }
    }
    // estandartes en las fachadas de los muros
    for (const [bx, by] of [[85, 56], [95, 56], [85, 37], [95, 37]]) banner(c, SX(bx) + 6, SY(by) + 2, 20, 28, now, bx + by);
  });
})();
