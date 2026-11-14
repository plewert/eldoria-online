'use strict';
/* Especiales de las armas de jefe (teclas 4 y 5): abanico, rayo, nova, lluvia, ráfaga, nube y curación. Solo visual. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const FX = [];
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const onScr = (x, y, m) => x > -m && y > -m && x < innerWidth + m && y < innerHeight + m;
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, Math.max(2, r)); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, Math.max(1, r), Math.max(1, r) * 0.8, 0, 0, 7); c.stroke(); };
  const T = { wsp: 600, wsf: 520, wsl: 700, wsn: 800, wsi: 600, wsa: 250, wsw: 700, wsc: 8000, wsh: 1000 };
  X.on('fx', (f) => {
    if (!T[f.k]) return;
    const now = performance.now();
    for (let i = FX.length - 1; i >= 0; i--) if (now - FX[i].t > FX[i].T) FX.splice(i, 1);
    FX.push({ k: f.k, t: now, T: f.T || T[f.k], f });
    if (f.k === 'wsi' && f.r >= 2) { G.shake = { t: now, m: 3 }; X.burst(f.x, f.y, 'fire', 8, { sp: 3, up: 2, g: 3, life: 0.5, size: 2.6 }); }
    if (f.k === 'wsn') G.shake = { t: now, m: 4 };
  });
  /* suelo: avisos, nubes, círculos de pulso */
  X.on('under', (c, now) => {
    for (const b of FX) {
      const p = (now - b.t) / b.T; if (p < 0 || p >= 1) continue; const f = b.f, TS = X.TS;
      if (b.k === 'wsw') { const x = px(f.x), y = py(f.y), r = f.r * TS; c.save(); c.fillStyle = `rgba(${f.col},${0.08 + 0.16 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill(); ring(c, x, y, r * (1 - 0.6 * p), f.col, 2.4, 0.95); ring(c, x, y, r, f.col, 1.5, 0.6); c.restore(); }
      else if (b.k === 'wsc') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = p < 0.06 ? p / 0.06 : p > 0.9 ? (1 - p) / 0.1 : 1; if (!onScr(x, y, r + 60)) continue;
        c.save(); c.globalAlpha = al; glow(c, x, y, r * 1.15, f.col, 0.28 + 0.06 * Math.sin(now / 250));
        for (let i = 0; i < 8; i++) { const a = now / (1700 + i * 140) + i * 0.8, rr = r * (0.2 + 0.6 * ((i * 0.41) % 1)); glow(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8 - 4, r * 0.45, f.col, 0.2); }
        ring(c, x, y, r, f.col, 2, 0.6); c.restore();
        if (Math.random() < 0.3) X.burst(f.x + (Math.random() - 0.5) * f.r, f.y + (Math.random() - 0.5) * f.r * 0.7, 'poison', 1, { sp: 0.5, up: 1.5, g: -1, life: 0.9, size: 2.6 });
      } else if (b.k === 'wsh') { const x = px(f.x), y = py(f.y); c.save(); c.globalCompositeOperation = 'lighter'; ring(c, x, y, 10 + 22 * p, f.col, 2.5, 1 - p); glow(c, x, y - 14, 30, f.col, 0.4 * (1 - p)); c.restore(); }
    }
  });
  /* por encima: lanzamiento, abanico, rayo, nova, proyectil e impacto */
  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const b of FX) {
      const p = (now - b.t) / b.T; if (p < 0 || p >= 1) continue; const f = b.f, al = 1 - p;
      if (b.k === 'wsp') { const x = px(f.x), y = py(f.y); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 12, 50 * (0.6 + p), f.col, 0.5 * al); ring(c, x, y, 14 + 40 * p, f.col, 2, al); c.restore(); }
      else if (b.k === 'wsf') {
        const x = px(f.x1), y = py(f.y1), a0 = Math.atan2(py(f.y) - y, px(f.x) - x); c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (let i = -1; i <= 1; i++) { const a = a0 + i * 0.55, u = Math.min(1, p * 2.2), r = 20 + 46 * u; c.strokeStyle = `rgba(${f.col},${al})`; c.lineWidth = 7 * al + 1; c.beginPath(); c.arc(x, y - 8, r, a - 0.5, a + 0.5); c.stroke(); c.strokeStyle = `rgba(255,255,255,${al * 0.8})`; c.lineWidth = 2; c.stroke(); }
        c.restore();
      } else if (b.k === 'wsl') {
        const x1 = px(f.x1), y1 = py(f.y1) - 8, x2 = px(f.x2), y2 = py(f.y2) - 8, u = Math.min(1, p * 3), ex = x1 + (x2 - x1) * u, ey = y1 + (y2 - y1) * u;
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = `rgba(${f.col},${al * 0.85})`; c.lineWidth = 16 * al + 3; c.beginPath(); c.moveTo(x1, y1); c.lineTo(ex, ey); c.stroke();
        c.strokeStyle = `rgba(255,255,255,${al})`; c.lineWidth = 4; c.stroke(); glow(c, ex, ey, 26, f.col, 0.7 * al); c.restore();
      } else if (b.k === 'wsn') {
        const x = px(f.x), y = py(f.y), r = f.r * TS; c.save(); c.globalCompositeOperation = 'lighter';
        if (f.pull) { for (let i = 0; i < 12; i++) { const a = i * 0.52 + now / 300, u = (now / 400 + i * 0.17) % 1, rr = (r + 30) * (1 - u * 0.9); c.fillStyle = `rgba(${f.col},${0.9 * u})`; c.fillRect(x + Math.cos(a) * rr - 1.5, y + Math.sin(a) * rr * 0.8 - 1.5, 3, 3); } glow(c, x, y, 30 + 20 * p, '10,0,20', 0.8 * (p < 0.6 ? 1 : 0.4)); }
        ring(c, x, y, r * Math.min(1, p * 1.6), f.col, 4 * al + 1, al); glow(c, x, y, r * (0.5 + p), f.col, 0.5 * al); c.restore();
      } else if (b.k === 'wsa') {
        const u = Math.min(1, p / 0.95), x1 = px(f.x1), y1 = py(f.y1) - 10, x2 = px(f.x2), y2 = py(f.y2) - 8, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u, xp = x1 + (x2 - x1) * Math.max(0, u - 0.25), yp = y1 + (y2 - y1) * Math.max(0, u - 0.25);
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; const g = c.createLinearGradient(xp, yp, x, y); g.addColorStop(0, `rgba(${f.col},0)`); g.addColorStop(1, `rgba(${f.col},.95)`); c.strokeStyle = g; c.lineWidth = 5; c.beginPath(); c.moveTo(xp, yp); c.lineTo(x, y); c.stroke();
        glow(c, x, y, 14, f.col, 0.8); c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); c.restore();
      } else if (b.k === 'wsi') {
        const x = px(f.x), y = py(f.y), r = f.r * TS; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 6, r * (0.7 + 0.8 * p), f.col, 0.85 * al); glow(c, x, y - 6, r * 0.4, '255,255,255', 0.8 * al); ring(c, x, y, r * (0.4 + 0.8 * p), f.col, 3, al); c.restore();
      }
    }
  });
})();
