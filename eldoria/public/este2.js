'use strict';
/* Ampliación Este II: avisos en el suelo y golpes de los jefes y mini-jefes (círculos, ondas, líneas), animación de herido/ataque
   de los monstruos nuevos y estallido de muerte de los jefes de cueva. Solo visual. Para quitarlo: borrar este archivo y su <script>. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const AN = [], DIE = [];
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, Math.max(2, r)); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, Math.max(1, r), Math.max(1, r) * 0.8, 0, 0, 7); c.stroke(); };
  const st = (id) => { let s = X.zs.get(id); if (!s) { s = {}; X.zs.set(id, s); } return s; };
  const isE2 = (t) => window.E2T && (t in window.E2T);
  const near = (x, y, d) => { const out = []; for (const e of G.ents.values()) if (e.kind === 'mo' && isE2(e.t) && Math.hypot(e.x - x, e.y - y) <= d) out.push(e); return out; };
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T: T || f.T || 800, f });

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    if (f.k === 'd' && f.c === 'h') { for (const e of near(f.x, f.y, 1.6)) { const s = st(e.id); if (!(s.hurt > now)) s.hurt = now + 320; } return; }
    if (f.k === 's') { for (const e of near(f.x, f.y, 2.2)) st(e.id).atk = now + 460; return; }
    switch (f.k) {
      case 'e2_cast': X.casts.set(f.id, now + Math.min(f.T, 1300) + 200); ADD('e2_cast', f, f.T + 300); break;
      case 'e2_mk': ADD('e2_mk', f); break;
      case 'e2_lane': ADD('e2_lane', f); break;
      case 'e2_hit': ADD('e2_hit', f, 600); X.burst(f.x, f.y, 'fire', f.small ? 8 : 16, { sp: 4, up: 3, g: 3, life: 0.6, size: 3 }); G.shake = { t: now, m: Math.min(6, 2 + f.r) }; if (f.ring) X.ring(f.x, f.y, 'dark', 500, f.r * 18, 4); break;
      case 'e2_beam': ADD('e2_beam', f, 600); G.shake = { t: now, m: 4 }; break;
      case 'e2_die': DIE.push({ t: now, x: f.x, y: f.y, col: f.col || '255,200,120' }); X.burst(f.x, f.y, 'fire', 40, { sp: 6, up: 5, g: 2, life: 1.3, size: 3.4 }); X.ring(f.x, f.y, 'fire', 700, 100, 5); G.shake = { t: now, m: 8 }; break;
      default: break;
    }
  });

  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'e2_mk') {                                                                              // círculo de aviso
        const e = f.follow ? G.ents.get(f.follow) : null, x = e ? X.sxOf(e.rx) + TS / 2 : px(f.x), y = e ? X.syOf(e.ry) + TS / 2 : py(f.y), r = f.r * TS, al = f.small ? 0.7 : 1, col = f.col || '255,90,40';
        c.save(); c.fillStyle = `rgba(${col},${(0.08 + 0.2 * p) * al})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (0.2 + 0.8 * p), col, 3, 0.9 * al); ring(c, x, y, r, col, 1.6, 0.5 + 0.4 * Math.sin(now / 60));
        c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 0.9, col, 0.22 * p * al); c.restore();
      } else if (b.k === 'e2_lane') {                                                                     // línea de aviso
        const x1 = px(f.x1), y1 = py(f.y1), x2 = px(f.x2), y2 = py(f.y2), pu = 0.5 + 0.5 * Math.sin(now / 80), col = f.col || '255,90,40';
        c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(${col},${0.1 + 0.2 * p + 0.05 * pu})`; c.lineWidth = 2.6 * TS; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = `rgba(255,230,180,${0.5 + 0.4 * pu})`; c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = -now / 25; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); c.restore();
      } else if (b.k === 'e2_hit') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, col = f.col || '255,120,40';
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r, col, 0.5 * (1 - p)); ring(c, x, y, r * (0.4 + 0.6 * p), '255,230,180', 4 * (1 - p) + 1, 1 - p); c.restore();
      }
    }
  });
  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f, col = f.col || '255,120,40';
      if (b.k === 'e2_cast') {
        const e = G.ents.get(f.id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2 - 40, fade = p > 0.8 ? (1 - p) / 0.2 : 1;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 50 + 60 * p, col, 0.45 * fade);
        for (let k = 0; k < 3; k++) { const u = (now / 480 + k / 3) % 1; ring(c, x, y, 90 * (1 - u) + 10, col, 2.2, 0.7 * u * fade); } c.restore();
      } else if (b.k === 'e2_beam') {
        const x1 = px(f.x1), y1 = py(f.y1) - 14, x2 = px(f.x2), y2 = py(f.y2) - 8, u = Math.min(1, p * 3), al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        c.strokeStyle = `rgba(${col},${0.7 * al})`; c.lineWidth = 30 * al + 5; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u); c.stroke();
        c.strokeStyle = `rgba(255,245,210,${al})`; c.lineWidth = 6; c.stroke(); glow(c, x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 34, col, 0.6 * al); c.restore();
      }
    }
    for (let i = DIE.length - 1; i >= 0; i--) { const d = DIE[i], p = (now - d.t) / 1800; if (p >= 1) { DIE.splice(i, 1); continue; } const x = px(d.x), y = py(d.y) - 20; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 120 * (0.5 + p), d.col, 0.5 * (1 - p)); ring(c, x, y + 20, 200 * p, '255,240,200', 5 * (1 - p) + 1, 1 - p); c.restore(); }
  });
})();
