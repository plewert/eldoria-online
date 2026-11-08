'use strict';
/* Casas con techo (solo visual, en el cliente; el servidor no cambia). Detecta las casas de las ciudades (muros + suelo de tienda),
   les dibuja un techo (teja, paja o piedra según la ciudad) con sombra y chimenea con humo, que se vuelve transparente al entrar.
   De noche las ventanas se encienden y sale luz por la puerta. Dentro hay alfombra y decoración en la pared del fondo.
   Se apaga con F5 (guardado en localStorage "eldoria.casas"). Para quitarlo: borrar este archivo y su <script>. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X, TS = 32;
  let ONu = true; try { ONu = localStorage.getItem('eldoria.casas') !== '0'; } catch (e) { /* sin storage */ }
  const Q = () => (ONu ? (X.perf ? X.perf.q('casas') : 2) : 0);
  const hs = (x, y, k = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const nightK = () => { const h = X.env ? X.env.hour() : 12; return h >= 12 ? smooth(17.5, 20.5, h) : 1 - smooth(5, 7.5, h); };
  const sx = (x, cw) => Math.round((x - G.cam.x) * TS + cw / 2 - TS / 2), sy = (y, ch) => Math.round((y - G.cam.y) * TS + ch / 2 - TS / 2);
  const STYLE = { ciudad: 'teja', aldea: 'paja', puerto: 'paja', ciudad_alba: 'piedra' };
  const PAL = {
    teja: [['#b9503a', '#8f3626', '#d4684c'], ['#a8442f', '#7e2e20', '#c75a41'], ['#bf5b3f', '#933a28', '#da7050']],
    paja: [['#cdb065', '#9c8240', '#e2c880'], ['#c2a35a', '#917838', '#d8bd77'], ['#d1b56f', '#a08644', '#e6cd8a']],
    piedra: [['#7f858f', '#575c66', '#9ba1ab'], ['#74798a', '#50556a', '#8e93a6'], ['#868a86', '#5d615d', '#a2a6a2']],
  };

  let houses = null, forTiles = null;
  const KPAL = { taberna: [['#7a4a2e', '#4e2c18', '#9a6240']], herreria: [['#4b4f58', '#2c2f36', '#666b76']], biblioteca: [['#4f7d86', '#33565e', '#6aa0aa']], castillo: [['#9a2f3a', '#651b25', '#c24a54']] };
  function scan() {                                          // casas: las que manda el servidor (con su tipo)
    if (houses && forTiles === G.tiles) return houses;
    houses = []; forTiles = G.tiles; if (!G.tiles) return houses;
    for (const [ax, ay, bx, by, door, kind] of (G.houses || [])) {
      const zid = (X.zoneAt ? X.zoneAt(ax + 1, ay + 1) : { id: 'ciudad' }).id, base = STYLE[zid] || 'teja', style = kind === 'herreria' ? 'piedra' : base, v = (hs(ax, ay) * 3) | 0;
      houses.push({ ax, bx, ay, by, x0: ax + 1, x1: bx - 1, y0: ay + 1, y1: by, door, kind: kind || 'general', style, pal: KPAL[kind] ? KPAL[kind][0] : PAL[style][v], chim: kind === 'herreria' || kind === 'taberna' || (style !== 'paja' && hs(ax, ay, 2) > 0.35), fade: 1 });
    }
    return houses;
  }
  const inside = (h) => { const m = G.me; return !!m && ((m.x >= h.x0 && m.x <= h.x1 && m.y >= h.y0 && m.y < h.y1) || (m.x === h.door && m.y === h.by)); };
  const vis = (h, cw, ch) => { const a = sx(h.ax, cw), b = sy(h.ay, ch); return a < cw + 40 && b < ch + 40 && a + (h.bx - h.ax + 1) * TS > -40 && b + (h.by - h.ay + 1) * TS > -80; };
  let liteNow = false;
  const glow = (c, x, y, r, col, a) => { if (liteNow) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };

  /* ---------- debajo de los personajes: sombra, ventanas, luz de la puerta, decoración interior ---------- */
  X.on('under', (c, now, cw, ch) => {
    const q = Q(); if (!q) return; const lite = q < 2; liteNow = lite;
    const night = nightK();
    for (const h of scan()) {
      if (!vis(h, cw, ch)) continue;
      const L = sx(h.ax, cw), T = sy(h.ay, ch), R = sx(h.bx + 1, cw), B = sy(h.by, ch), F = sy(h.by + 1, ch);
      // sombra proyectada hacia el sur y el este
      if (!lite) { c.save(); c.globalAlpha = 0.28 * (0.45 + h.fade * 0.55); c.fillStyle = '#0b1018';
      c.beginPath(); c.moveTo(L + 6, F - 2); c.lineTo(R + 2, F - 2); c.lineTo(R + 16, F + 12); c.lineTo(L + 18, F + 12); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(R, T + 12); c.lineTo(R + 16, T + 24); c.lineTo(R + 16, F + 12); c.lineTo(R, F - 2); c.closePath(); c.fill(); c.restore(); }
      // decoración interior: alfombra en el centro y objetos en la pared del fondo
      const cx = (h.x0 + h.x1) / 2, cy = (h.y0 + h.y1 - 1) / 2, v = hs(h.ax, h.ay, 5);
      for (let y = h.y0; y < h.y1; y++) for (let x = h.x0; x <= h.x1; x++) {
        if (h.kind === 'castillo') break;                              // la sala del trono se dibuja en castillo.js
        if (G.npcTiles && G.npcTiles.has(y * G.W + x)) continue;
        if (Math.abs(x - cx) <= (h.x1 - h.x0 > 4 ? 1.6 : 0.6) && Math.abs(y - cy) <= 0.6 && h.y1 - h.y0 >= 3) {
          const X0 = sx(x, cw), Y0 = sy(y, ch);
          c.fillStyle = v < 0.5 ? '#7a2e3a' : '#2f5a63'; c.fillRect(X0, Y0 + 2, TS, TS - 4);
          c.strokeStyle = v < 0.5 ? '#d8b86a' : '#e0d4a0'; c.lineWidth = 1; c.strokeRect(X0 + 3.5, Y0 + 5.5, TS - 7, TS - 11);
          c.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 3; k++) c.fillRect(X0 + 8 + k * 6, Y0 + 11, 3, 3);
        }
      }
      for (const [fx, fy, fk] of (G.decor || [])) {                  // muebles sólidos de esta casa
        if (fx < h.x0 || fx > h.x1 || fy < h.y0 || fy >= h.y1) continue;
        const X0 = sx(fx, cw), Y0 = sy(fy, ch);
        c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(X0 + 2, Y0 + TS - 5, TS - 4, 5);
        if (fk === 'cofre') { c.fillStyle = '#7a4a22'; c.fillRect(X0 + 4, Y0 + 12, 24, 16); c.fillStyle = '#9a6430'; c.fillRect(X0 + 4, Y0 + 8, 24, 7); c.fillStyle = '#d8b24a'; c.fillRect(X0 + 14, Y0 + 14, 4, 6); c.strokeStyle = '#3a220f'; c.strokeRect(X0 + 4.5, Y0 + 8.5, 23, 19); }
        else if (fk === 'estante') { c.fillStyle = '#5b3d20'; c.fillRect(X0 + 2, Y0 + 3, 28, 26); c.fillStyle = '#2d1d0e'; for (const yy of [11, 20]) c.fillRect(X0 + 3, Y0 + yy, 26, 2); for (let i = 0; i < 5; i++) { c.fillStyle = ['#b33', '#37a', '#3a5', '#c93', '#82b'][(i + fx) % 5]; c.fillRect(X0 + 4 + i * 5, Y0 + 5, 4, 6); c.fillStyle = ['#c93', '#3a5', '#b33', '#37a', '#82b'][(i + fy) % 5]; c.fillRect(X0 + 4 + i * 5, Y0 + 14, 4, 6); } c.fillStyle = '#9bd'; c.fillRect(X0 + 6, Y0 + 22, 4, 6); c.fillStyle = '#d96'; c.fillRect(X0 + 18, Y0 + 23, 6, 5); }
        else if (fk === 'mesa') { c.fillStyle = '#6a4424'; c.fillRect(X0 + 3, Y0 + 9, 26, 15); c.fillStyle = '#8a5c30'; c.fillRect(X0 + 3, Y0 + 7, 26, 5); c.fillStyle = '#e8e0c8'; c.fillRect(X0 + 8, Y0 + 11, 6, 5); c.fillStyle = '#c8e0f0'; c.fillRect(X0 + 19, Y0 + 12, 4, 6); }
        else if (fk === 'barril') { c.fillStyle = '#6e4521'; c.beginPath(); c.ellipse(X0 + 16, Y0 + 18, 11, 11, 0, 0, 7); c.fill(); c.fillStyle = '#4a2c12'; c.fillRect(X0 + 5, Y0 + 14, 22, 2); c.fillRect(X0 + 5, Y0 + 21, 22, 2); c.fillStyle = '#9a6a38'; c.beginPath(); c.ellipse(X0 + 16, Y0 + 9, 8, 3, 0, 0, 7); c.fill(); }
        else if (fk === 'barra') { c.fillStyle = '#5a3a1e'; c.fillRect(X0, Y0 + 12, TS, 17); c.fillStyle = '#9a6a38'; c.fillRect(X0, Y0 + 8, TS, 6); c.fillStyle = '#d8d0b8'; if ((fx + fy) % 2) { c.fillRect(X0 + 8, Y0 + 2, 5, 7); c.fillRect(X0 + 20, Y0 + 3, 4, 6); } else c.fillRect(X0 + 12, Y0 + 3, 6, 6); }
        else if (fk === 'yunque') { c.fillStyle = '#3c4048'; c.fillRect(X0 + 6, Y0 + 20, 20, 8); c.fillStyle = '#5a606a'; c.fillRect(X0 + 3, Y0 + 12, 26, 8); c.fillRect(X0 + 22, Y0 + 14, 8, 4); c.fillStyle = '#e8a050'; const hot = 0.5 + 0.5 * Math.sin(now / 400 + fx); c.globalAlpha = hot; c.fillRect(X0 + 12, Y0 + 11, 8, 2); c.globalAlpha = 1; }
        else if (fk === 'fragua') { c.fillStyle = '#5c5650'; c.fillRect(X0 + 1, Y0 + 6, 30, 24); c.fillStyle = '#2a2622'; c.fillRect(X0 + 6, Y0 + 14, 20, 14); const fl = 0.75 + Math.sin(now / 90 + fx) * 0.25; c.fillStyle = `rgba(255,${140 + 60 * fl | 0},40,${fl})`; c.fillRect(X0 + 9, Y0 + 19, 14, 9);
          c.save(); c.globalCompositeOperation = 'lighter'; glow(c, X0 + 16, Y0 + 20, 44 + night * 12, '255,150,60', 0.4 * fl); c.restore(); }
      }
      if (!lite && (h.kind === 'taberna' || h.kind === 'herreria')) {            // el tabernero y el herrero (figuras de ambiente)
        const wx = h.kind === 'taberna' ? (h.x0 + h.x1) >> 1 : ((G.decor || []).find((d) => d[2] === 'yunque' && d[0] >= h.x0 && d[0] <= h.x1) || [h.x0 + 1])[0], wy = h.y0 + 1;
        if (!(G.npcTiles && G.npcTiles.has(wy * G.W + wx)) && !(G.decorSet && G.decorSet.has(wy * G.W + wx))) {
          const X0 = sx(wx, cw), Y0 = sy(wy, ch), sw = h.kind === 'herreria' ? Math.sin(now / 160) * 0.5 + 0.5 : 0;
          c.fillStyle = h.kind === 'taberna' ? '#a64' : '#555'; c.fillRect(X0 + 10, Y0 + 12, 12, 16); c.fillStyle = '#f0c8a0'; c.beginPath(); c.arc(X0 + 16, Y0 + 9, 5, 0, 7); c.fill();
          c.fillStyle = h.kind === 'taberna' ? '#eee' : '#3a2a1a'; c.fillRect(X0 + 10, Y0 + 3, 12, 3);
          if (h.kind === 'herreria') { c.save(); c.translate(X0 + 22, Y0 + 14); c.rotate(-0.8 + sw * 1.2); c.fillStyle = '#6b4a2a'; c.fillRect(0, -1, 10, 2); c.fillStyle = '#9aa0aa'; c.fillRect(8, -3, 4, 6); c.restore(); }
        }
      }
      for (let x = h.x0; x <= h.x1 && h.kind !== 'castillo'; x++) {                          // pared del fondo (fila de muro superior)
        const X0 = sx(x, cw), Y0 = sy(h.ay, ch), k = (hs(x, h.ay, 9) * 5) | 0;
        c.fillStyle = 'rgba(40,26,16,.55)'; c.fillRect(X0, Y0 + TS - 5, TS, 5);
        if (k === 0) { c.fillStyle = '#6b4a2a'; c.fillRect(X0 + 3, Y0 + 10, TS - 6, 3); c.fillRect(X0 + 3, Y0 + 20, TS - 6, 3);   // estante con libros y frascos
          for (let i = 0; i < 4; i++) { c.fillStyle = ['#a33', '#37a', '#3a5', '#c93'][(i + x) % 4]; c.fillRect(X0 + 5 + i * 6, Y0 + 3, 4, 7); } c.fillStyle = '#7ad'; c.fillRect(X0 + 22, Y0 + 14, 4, 6); }
        else if (k === 1) { c.fillStyle = '#4a3a22'; c.fillRect(X0 + 5, Y0 + 5, TS - 10, 18); c.fillStyle = ['#6aa0c8', '#c88a5a', '#7cb06a'][(x + h.ay) % 3]; c.fillRect(X0 + 7, Y0 + 7, TS - 14, 14); }   // cuadro
        else if (k === 2) { c.fillStyle = '#8a2a2a'; c.beginPath(); c.moveTo(X0 + 9, Y0 + 3); c.lineTo(X0 + 23, Y0 + 3); c.lineTo(X0 + 23, Y0 + 20); c.lineTo(X0 + 16, Y0 + 15); c.lineTo(X0 + 9, Y0 + 20); c.closePath(); c.fill(); c.fillStyle = '#e6c860'; c.fillRect(X0 + 14, Y0 + 7, 4, 4); }   // estandarte
        else if (k === 3) { const fl = 0.8 + Math.sin(now / 130 + x) * 0.2; c.fillStyle = '#3a2a1a'; c.fillRect(X0 + 14, Y0 + 14, 4, 8); c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(X0 + 16, Y0 + 11, 3, 0, 7); c.fill();
          c.save(); c.globalCompositeOperation = 'lighter'; glow(c, X0 + 16, Y0 + 12, 30 + night * 20, '255,190,90', (0.18 + night * 0.25) * fl); c.restore(); }   // antorcha
      }
      // ventanas de la fachada y luz que sale por la puerta
      for (let x = h.ax + 1; x < h.bx; x++) {
        if (Math.abs(x - h.door) < 1 || (x - h.ax) % 3 !== 1) continue;
        const X0 = sx(x, cw), Y0 = sy(h.by, ch);
        c.fillStyle = '#3d2c1c'; c.fillRect(X0 + 7, Y0 + 7, 18, 16);
        c.fillStyle = night > 0.4 ? '#ffd27a' : '#86b4d8'; c.fillRect(X0 + 9, Y0 + 9, 14, 12);
        c.fillStyle = '#3d2c1c'; c.fillRect(X0 + 15, Y0 + 9, 2, 12); c.fillRect(X0 + 9, Y0 + 14, 14, 2);
        if (night > 0.05) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, X0 + 16, Y0 + 16, 34, '255,190,90', 0.5 * night); c.restore(); }
      }
      if (night > 0.05) {
        const dx = sx(h.door, cw) + TS / 2, dy = sy(h.by, ch) + TS;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, dx, dy + 6, 64, '255,184,84', 0.42 * night); c.restore();
      }
    }
  });

  /* ---------- encima de todo: techo con chimenea y humo (fundido al entrar) ---------- */
  X.on('draw', (c, now, cw, ch, dt) => {
    const q = Q(); if (!q) return; const lite = q < 2;
    for (const h of scan()) {
      const tgt = inside(h) ? 0 : 1; h.fade += (tgt - h.fade) * Math.min(1, (dt || 0.016) * 6); if (Math.abs(tgt - h.fade) < 0.01) h.fade = tgt;
      if (!vis(h, cw, ch) || h.fade <= 0.02) continue;
      const L = sx(h.ax, cw) - 6, R = sx(h.bx + 1, cw) + 6, T = sy(h.ay, ch) - 14, B = sy(h.by, ch) + 4, mid = T + (B - T) * 0.4;
      const [base, dark, light] = h.pal;
      c.save(); c.globalAlpha = h.fade;
      c.fillStyle = light; c.fillRect(L, T, R - L, mid - T);                      // vertiente trasera (más clara)
      c.fillStyle = base; c.fillRect(L, mid, R - L, B - mid);                     // vertiente delantera
      c.save(); c.beginPath(); c.rect(L, T, R - L, B - T); c.clip();
      c.strokeStyle = dark; c.lineWidth = 1.5;
      if (h.style === 'teja') {
        for (let y = T + 7, r = 0; y < B; y += 8, r++) { c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke(); for (let x = L + (r % 2) * 7; x < R; x += 14) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke(); } }
      } else if (h.style === 'piedra') {
        for (let y = T + 8, r = 0; y < B; y += 10, r++) { c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke(); for (let x = L + (r % 2) * 10; x < R; x += 20) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 10); c.stroke(); } }
      } else {
        c.lineWidth = 1.2; for (let y = T; y < B; y += 5) for (let x = L; x < R; x += 6) { const k = hs(x, y, 3); c.beginPath(); c.moveTo(x + k * 4, y); c.lineTo(x + k * 4 + 2 - k * 4, y + 6); c.stroke(); }
      }
      c.restore();
      c.fillStyle = dark; c.fillRect(L, mid - 2, R - L, 4);                       // cumbrera
      c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(L, B - 5, R - L, 5);             // alero (sombra hacia el muro)
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.strokeRect(L + 0.5, T + 0.5, R - L - 1, B - T - 1);
      if (h.chim && !lite) {
        const cxp = R - 38, cyp = T + 6;
        c.fillStyle = '#6f6a66'; c.fillRect(cxp, cyp, 16, 26); c.fillStyle = '#4c4845'; c.fillRect(cxp - 2, cyp - 3, 20, 5);
        for (let i = 0; i < 4; i++) {                                              // humo
          const k = ((now / 1800 + i / 4 + hs(h.ax, h.ay)) % 1), a = (1 - k) * 0.5 * h.fade;
          c.fillStyle = `rgba(225,225,228,${a})`; c.beginPath(); c.arc(cxp + 8 + Math.sin(k * 6 + i) * 4 + k * 8, cyp - 6 - k * 34, 3 + k * 7, 0, 7); c.fill();
        }
      }
      if (X.season && X.season() === 'invierno') {                                // manto de nieve
        c.fillStyle = 'rgba(245,250,255,.92)'; c.fillRect(L, T, R - L, (mid - T) * 0.8 + 2); c.fillStyle = 'rgba(225,236,248,.9)'; c.fillRect(L, mid + 2, R - L, 5);
        for (let x = L; x < R; x += 9) c.fillRect(x, T + (mid - T) * 0.8, 6, 3 + hs(x, T) * 4);
      }
      if (h.kind === 'taberna' && !lite) {                                          // cartel con jarra y notas de música
        const px0 = sx(h.door, cw) + TS + 6, py0 = sy(h.by, ch) + 2;
        c.fillStyle = '#4e2c18'; c.fillRect(px0, py0 - 4, 2, 22); c.fillRect(px0, py0 - 4, 18, 2); c.fillStyle = '#c9a15a'; c.fillRect(px0 + 3, py0, 15, 12); c.fillStyle = '#fff'; c.fillRect(px0 + 7, py0 + 3, 6, 7);
        for (let i = 0; i < 3; i++) { const k = (now / 2200 + i / 3) % 1; c.fillStyle = `rgba(255,235,170,${(1 - k) * 0.9 * h.fade})`; c.font = '12px sans-serif'; c.fillText('♪', px0 + 4 + Math.sin(k * 7 + i) * 8, py0 - 8 - k * 28); }
      }
      c.restore();
    }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'F5' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); ONu = !ONu; try { localStorage.setItem('eldoria.casas', ONu ? '1' : '0'); } catch (x) { /* nada */ } if (X.toast) X.toast(ONu ? 'Techos de casas: activados (F5)' : 'Techos de casas: desactivados (F5)'); } });
})();
