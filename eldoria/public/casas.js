'use strict';
/* Casas con techo (solo visual, en el cliente; el servidor no cambia). Detecta las casas de las ciudades (muros + suelo de tienda),
   les dibuja un techo (teja, paja o piedra según la ciudad) con sombra y chimenea con humo, que se vuelve transparente al entrar.
   De noche las ventanas se encienden y sale luz por la puerta. Dentro hay alfombra y decoración en la pared del fondo.
   Se apaga con F5 (guardado en localStorage "eldoria.casas"). Para quitarlo: borrar este archivo y su <script>. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X, TS = 32;
  let ON = true; try { ON = localStorage.getItem('eldoria.casas') !== '0'; } catch (e) { /* sin storage */ }
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
  function scan() {                                          // casas = zonas conexas de suelo de tienda rodeadas de muro
    if (houses && forTiles === G.tiles) return houses;
    houses = []; forTiles = G.tiles; if (!G.tiles) return houses;
    const W = G.W, H = G.H, seen = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (G.tiles[i] !== 9 || seen[i]) continue;
      const st = [i]; seen[i] = 1; let x0 = W, x1 = 0, y0 = H, y1 = 0, n = 0;
      while (st.length) {
        const j = st.pop(), x = j % W, y = (j / W) | 0; n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const k of [j + 1, j - 1, j + W, j - W]) if (k >= 0 && k < W * H && G.tiles[k] === 9 && !seen[k]) { seen[k] = 1; st.push(k); }
      }
      const ax = x0 - 1, bx = x1 + 1, ay = y0 - 1, by = y1;
      if (n > 400 || x1 - x0 < 1 || y1 - y0 < 1 || ay < 0 || G.tiles[ay * W + ax] !== 4 || G.tiles[ay * W + bx] !== 4) continue;
      let door = x0; for (let x = x0; x <= x1; x++) if (G.tiles[y1 * W + x] === 9) door = x;
      const zid = (X.zoneAt ? X.zoneAt(x0, y0) : { id: 'ciudad' }).id, style = STYLE[zid] || 'teja', v = (hs(ax, ay) * 3) | 0;
      houses.push({ ax, bx, ay, by, x0, x1, y0, y1, door, style, pal: PAL[style][v], chim: style !== 'paja' && hs(ax, ay, 2) > 0.35, fade: 1 });
    }
    return houses;
  }
  const inside = (h) => { const m = G.me; return !!m && ((m.x >= h.x0 && m.x <= h.x1 && m.y >= h.y0 && m.y < h.y1) || (m.x === h.door && m.y === h.by)); };
  const vis = (h, cw, ch) => { const a = sx(h.ax, cw), b = sy(h.ay, ch); return a < cw + 40 && b < ch + 40 && a + (h.bx - h.ax + 1) * TS > -40 && b + (h.by - h.ay + 1) * TS > -80; };
  const glow = (c, x, y, r, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };

  /* ---------- debajo de los personajes: sombra, ventanas, luz de la puerta, decoración interior ---------- */
  X.on('under', (c, now, cw, ch) => {
    if (!ON) return;
    const night = nightK();
    for (const h of scan()) {
      if (!vis(h, cw, ch)) continue;
      const L = sx(h.ax, cw), T = sy(h.ay, ch), R = sx(h.bx + 1, cw), B = sy(h.by, ch), F = sy(h.by + 1, ch);
      // sombra proyectada hacia el sur y el este
      c.save(); c.globalAlpha = 0.28 * (0.45 + h.fade * 0.55); c.fillStyle = '#0b1018';
      c.beginPath(); c.moveTo(L + 6, F - 2); c.lineTo(R + 2, F - 2); c.lineTo(R + 16, F + 12); c.lineTo(L + 18, F + 12); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(R, T + 12); c.lineTo(R + 16, T + 24); c.lineTo(R + 16, F + 12); c.lineTo(R, F - 2); c.closePath(); c.fill(); c.restore();
      // decoración interior: alfombra en el centro y objetos en la pared del fondo
      const cx = (h.x0 + h.x1) / 2, cy = (h.y0 + h.y1 - 1) / 2, v = hs(h.ax, h.ay, 5);
      for (let y = h.y0; y < h.y1; y++) for (let x = h.x0; x <= h.x1; x++) {
        if (G.npcTiles && G.npcTiles.has(y * G.W + x)) continue;
        if (Math.abs(x - cx) <= (h.x1 - h.x0 > 4 ? 1.6 : 0.6) && Math.abs(y - cy) <= 0.6 && h.y1 - h.y0 >= 3) {
          const X0 = sx(x, cw), Y0 = sy(y, ch);
          c.fillStyle = v < 0.5 ? '#7a2e3a' : '#2f5a63'; c.fillRect(X0, Y0 + 2, TS, TS - 4);
          c.strokeStyle = v < 0.5 ? '#d8b86a' : '#e0d4a0'; c.lineWidth = 1; c.strokeRect(X0 + 3.5, Y0 + 5.5, TS - 7, TS - 11);
          c.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 3; k++) c.fillRect(X0 + 8 + k * 6, Y0 + 11, 3, 3);
        }
      }
      for (let x = h.x0; x <= h.x1; x++) {                          // pared del fondo (fila de muro superior)
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
    if (!ON) return;
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
      if (h.chim) {
        const cxp = R - 38, cyp = T + 6;
        c.fillStyle = '#6f6a66'; c.fillRect(cxp, cyp, 16, 26); c.fillStyle = '#4c4845'; c.fillRect(cxp - 2, cyp - 3, 20, 5);
        for (let i = 0; i < 4; i++) {                                              // humo
          const k = ((now / 1800 + i / 4 + hs(h.ax, h.ay)) % 1), a = (1 - k) * 0.5 * h.fade;
          c.fillStyle = `rgba(225,225,228,${a})`; c.beginPath(); c.arc(cxp + 8 + Math.sin(k * 6 + i) * 4 + k * 8, cyp - 6 - k * 34, 3 + k * 7, 0, 7); c.fill();
        }
      }
      c.restore();
    }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'F5' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); ON = !ON; try { localStorage.setItem('eldoria.casas', ON ? '1' : '0'); } catch (x) { /* nada */ } if (X.toast) X.toast(ON ? 'Techos de casas: activados (F5)' : 'Techos de casas: desactivados (F5)'); } });
})();
