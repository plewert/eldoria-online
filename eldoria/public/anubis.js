'use strict';
/* Anubis, Juez de las Sombras: efectos animados de la Tumba (miasma, portales verdes, flechas, sombras, momia y fuego negro). Solo visual. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const AN = [], DOT = new Map();
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const caveBox = (R) => ({ x: X.sxOf(R[0]), y: X.syOf(R[1]), w: (R[2] - R[0] + 1) * X.TS, h: (R[3] - R[1] + 1) * X.TS });
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hs = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
  const mon = (id) => G.ents.get(id);
  const onScr = (x, y, m) => x > -m && y > -m && x < innerWidth + m && y < innerHeight + m;
  const ADD = (k, f, T, extra) => AN.push(Object.assign({ k, t: performance.now(), T: T || f.T || 1000, f }, extra));

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    switch (f.k) {
      case 'an_cast': X.casts.set(f.id, now + f.T + 400); ADD('an_cast', f, f.T + 400); break;
      case 'an_hw': ADD('an_hw', f); break;
      case 'an_crack': ADD('an_crack', f); G.shake = { t: now, m: 6 }; X.ring(f.x, f.y, 'dark', 700, 90, 6); X.burst(f.x, f.y, 'dark', 22, { sp: 5, up: 3, g: 4, life: 0.8, size: 3.2 }); break;
      case 'an_ms': ADD('an_ms', f); break;
      case 'an_dot': DOT.set(f.id, now + (f.ms || 4000)); break;
      case 'an_pt': ADD('an_pt', f); break;
      case 'an_ar': ADD('an_ar', f); break;
      case 'an_bm': ADD('an_bm', f, 700); G.shake = { t: now, m: 2 }; X.burst(f.x, f.y, 'poison', 14, { sp: 4, up: 3, g: 3, life: 0.6, size: 3 }); X.ring(f.x, f.y, 'poison', 450, 52, 4); break;
      case 'an_split': ADD('an_split', f); break;
      case 'an_sp': ADD('an_sp', f, 800); X.burst(f.x, f.y, 'dark', 14, { sp: 3, up: 4, g: -1, life: 0.8, size: 3 }); break;
      case 'an_merge': ADD('an_merge', f); break;
      case 'an_rev': ADD('an_rev', f); break;
      case 'an_mx': ADD('an_mx', f, 1100); G.shake = { t: now, m: 8 }; X.burst(f.x, f.y, 'dark', 40, { sp: 7, up: 4, g: 3, life: 1, size: 3.6 }); X.ring(f.x, f.y, 'dark', 800, 110, 7); break;
      case 'an_lw': ADD('an_lw', f); break;
      case 'an_l': ADD('an_l', f); G.shake = { t: now, m: 3 }; break;
      case 'an_bfw': ADD('an_bfw', f); break;
      case 'an_bf': ADD('an_bf', f, 800); X.burst(f.x, f.y, 'dark', 16, { sp: 4, up: 3, g: 3, life: 0.7, size: 3 }); break;
      default: break;
    }
  });

  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.stroke(); };
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const crackPath = (c, x, y, R, seed) => {
    for (let k = 0; k < 9; k++) {
      const a = k * 0.7 + hs(seed, k) * 0.4; let cx = x, cy = y; c.moveTo(cx, cy);
      for (let s = 1; s <= 6; s++) { const L = R / 6; cx += Math.cos(a + (hs(k, s) - 0.5) * 0.9) * L; cy += Math.sin(a + (hs(s, k) - 0.5) * 0.9) * L * 0.8; c.lineTo(cx, cy); }
    }
  };

  /* ---- suelo: avisos, grietas, miasma y portales ---- */
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'an_hw') {                                                          // aviso del golpe del báculo
        const x = px(f.x), y = py(f.y), r = f.r * TS;
        c.save(); c.fillStyle = `rgba(120,255,160,${0.08 + 0.12 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (0.3 + 0.7 * p), '150,255,190', 3, 0.9); ring(c, x, y, r, '120,255,160', 2, 0.6 + 0.4 * Math.sin(now / 70)); c.restore();
      } else if (b.k === 'an_crack') {                                                // la tierra se agrieta
        const x = px(f.x), y = py(f.y), R = f.r * TS * Math.min(1, p * 4), al = p > 0.7 ? (1 - p) / 0.3 : 1;
        c.save(); c.globalAlpha = al; c.strokeStyle = 'rgba(8,3,14,.95)'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); crackPath(c, x, y, R, 3); c.stroke();
        c.strokeStyle = 'rgba(120,255,160,.9)'; c.lineWidth = 2.2; c.stroke(); c.restore();
      } else if (b.k === 'an_ms') {                                                   // nube de miasma de las tumbas
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = (p < 0.08 ? p / 0.08 : p > 0.85 ? (1 - p) / 0.15 : 1);
        if (!onScr(x, y, r + 60)) continue;
        c.save(); c.globalAlpha = al; glow(c, x, y, r * 1.2, '60,20,90', 0.55); glow(c, x, y, r, '90,255,150', 0.18 + 0.06 * Math.sin(now / 300 + f.x));
        for (let i = 0; i < 9; i++) { const a = now / (1500 + i * 130) + i * 0.7, rr = r * (0.25 + 0.55 * ((i * 0.37) % 1)); glow(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8 - 6, r * 0.5, i % 2 ? '120,40,170' : '70,220,130', 0.22); }
        ring(c, x, y, r, '130,255,170', 2, 0.55); c.restore();
        if (Math.random() < 0.25) X.burst(f.x + rnd(-f.r, f.r) * 0.7, f.y + rnd(-f.r, f.r) * 0.5, 'dark', 1, { sp: 0.5, up: 1.6, g: -1, life: 1, size: 3 });
      } else if (b.k === 'an_pt') {                                                   // portal verde
        const x = px(f.x), y = py(f.y), al = p < 0.08 ? p / 0.08 : p > 0.9 ? (1 - p) / 0.1 : 1;
        if (!onScr(x, y, 80)) continue;
        c.save(); c.globalAlpha = al; glow(c, x, y - 8, 52, '70,255,140', 0.5);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { const u = (now / 900 + i / 4) % 1; ring(c, x, y - 4, 24 * (1 - u) + 4, '150,255,190', 2.5, 0.8 * u); }
        c.fillStyle = 'rgba(10,50,30,.95)'; c.beginPath(); c.ellipse(x, y - 4, 15, 10, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(120,255,170,.95)'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y - 4, 17, 11.5, now / 800, 0, 5); c.stroke();
        for (let i = 0; i < 6; i++) { const a = now / 400 + i * 1.05; c.fillStyle = 'rgba(200,255,220,.9)'; c.fillRect(x + Math.cos(a) * 17 - 1, y - 4 + Math.sin(a) * 11 - 1, 2.5, 2.5); }
        c.restore();
      } else if (b.k === 'an_ar') {                                                   // marca donde caerá la flecha
        const x = px(f.x2), y = py(f.y2), r = f.r * TS * 0.9;
        c.save(); c.fillStyle = `rgba(90,255,150,${0.08 + 0.14 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (1 - 0.7 * p), '170,255,200', 2.5, 0.95); ring(c, x, y, r, '90,255,150', 1.6, 0.7); c.restore();
      } else if (b.k === 'an_lw') {                                                   // aviso de los rayos de fuego negro
        const x1 = px(f.x1), y1 = py(f.y1), x2 = px(f.x2), y2 = py(f.y2), L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), th = f.w * TS;
        c.save(); if (f.r) { const B = caveBox(f.r); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip(); }
        c.translate(x1, y1); c.rotate(a); c.fillStyle = `rgba(150,60,255,${0.1 + 0.2 * p})`; c.fillRect(0, -th / 2, L, th);
        c.strokeStyle = `rgba(200,150,255,${0.5 + 0.4 * Math.sin(now / 60)})`; c.lineWidth = 1.5; c.strokeRect(0, -th / 2, L, th); c.restore();
      } else if (b.k === 'an_bfw') {                                                  // aviso de bola de fuego negro
        const x = px(f.x), y = py(f.y), r = f.r * TS;
        c.save(); c.fillStyle = `rgba(110,40,200,${0.12 + 0.18 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill(); ring(c, x, y, r * (1 - 0.6 * p), '200,150,255', 2.5, 0.95); c.restore();
      } else if (b.k === 'an_rev') {                                                  // círculo de resurrección
        const x = px(f.x), y = py(f.y), r = 46 * Math.min(1, p * 3), al = p > 0.8 ? (1 - p) / 0.2 : 1;
        c.save(); c.globalAlpha = al; ring(c, x, y, r, '120,255,170', 3, 0.9); ring(c, x, y, r * 0.65, '180,120,255', 2, 0.9);
        for (let i = 0; i < 6; i++) { const a = now / 500 + i * 1.047; c.fillStyle = 'rgba(190,255,215,.9)'; c.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r * 0.8 - 2, 4, 4); }
        glow(c, x, y - 16, 60, '90,255,160', 0.35 * p); c.restore();
      }
    }
    // quienes están en el miasma: tinte venenoso y burbujas (curación reducida)
    for (const [id, until] of DOT) {
      if (now > until) { DOT.delete(id); continue; } const e = G.ents.get(id); if (!e) { DOT.delete(id); continue; }
      const x = X.sxOf(e.rx) + X.TS / 2, y = X.syOf(e.ry) + X.TS - 4, al = Math.min(1, (until - now) / 500);
      c.save(); c.globalAlpha = al; c.globalCompositeOperation = 'lighter'; glow(c, x, y - 14, 26, '110,255,160', 0.3); c.restore();
      if (Math.random() < 0.18) X.burst(e.rx, e.ry - 0.3, 'poison', 1, { sp: 0.6, up: 2, g: -1, life: 0.7, size: 2.2 });
    }
  });

  /* ---- por encima: flechas, explosiones, rayos, sombras y la momia ---- */
  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'an_cast') {                                                        // Anubis se concentra: anillos que convergen y rayos verdes
        const e = mon(f.id); if (!e) continue;
        const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2 - 80, fade = p > 0.8 ? (1 - p) / 0.2 : 1;
        const col = f.kind === 'miasma' ? '120,255,170' : f.kind === 'portales' ? '90,255,150' : f.kind === 'sombras' ? '170,110,255' : '200,255,210';
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 60 + 80 * p, col, 0.45 * fade);
        for (let k = 0; k < 3; k++) { const u = (now / 520 + k / 3) % 1; ring(c, x, y, 110 * (1 - u) + 12, col, 2.4, 0.7 * u * fade); }
        if (f.kind === 'miasma') { c.strokeStyle = `rgba(${col},${0.8 * fade})`; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 24, y - 34 - 40 * (1 - p)); c.lineTo(x + 24, y + 76); c.stroke(); }
        c.restore();
      } else if (b.k === 'an_ar') {                                                   // flecha de fuego verde
        const u = Math.min(1, p / 0.97), x1 = px(f.x1), y1 = py(f.y1) - 8, x2 = px(f.x2), y2 = py(f.y2);
        const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u - Math.sin(u * Math.PI) * 70;
        const xp = x1 + (x2 - x1) * Math.max(0, u - 0.08), yp = y1 + (y2 - y1) * Math.max(0, u - 0.08) - Math.sin(Math.max(0, u - 0.08) * Math.PI) * 70;
        c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(xp, yp, x, y); g.addColorStop(0, 'rgba(40,200,90,0)'); g.addColorStop(1, 'rgba(150,255,190,.9)');
        c.strokeStyle = g; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(xp, yp); c.lineTo(x, y); c.stroke();
        glow(c, x, y, 18, '90,255,150', 0.8); c.fillStyle = 'rgba(235,255,240,.95)'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.restore();
      } else if (b.k === 'an_bm') {                                                   // explosión de fuego verde
        const x = px(f.x), y = py(f.y), al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 8, 70 * (0.5 + p), '120,255,170', 0.9 * al); glow(c, x, y - 8, 36, '230,255,230', 0.8 * al); c.restore();
      } else if (b.k === 'an_split') {                                                // Anubis se desdobla: tres siluetas salen hacia los lados
        const e = mon(f.id); if (!e) continue;
        const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2, u = Math.min(1, p / 0.8);
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 70, 120, '170,110,255', 0.4 * (1 - p));
        for (const s of f.sp || []) { const tx = px(s.x), ty = py(s.y), gx = x + (tx - x) * u, gy = y + (ty - y) * u - Math.sin(u * Math.PI) * 30; glow(c, gx, gy - 40, 36, '150,90,255', 0.55); c.fillStyle = 'rgba(20,6,40,.6)'; c.beginPath(); c.ellipse(gx, gy - 40, 11, 32, 0, 0, 7); c.fill(); }
        c.restore();
      } else if (b.k === 'an_merge') {                                                // las sombras se reabsorben
        const e = mon(f.id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2;
        c.save(); c.globalCompositeOperation = 'lighter'; ring(c, x, y - 60, 120 * (1 - p) + 10, '210,160', 3, 0.9 * (1 - p)); glow(c, x, y - 60, 90, '230,255,235', 0.5 * (1 - p)); c.restore();
      } else if (b.k === 'an_sp') {
        const x = px(f.x), y = py(f.y), al = 1 - p; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 20, 50, '170,110,255', 0.7 * al); c.restore();
      } else if (b.k === 'an_rev') {                                                  // la momia emerge entre vendas luminosas
        const x = px(f.x), y = py(f.y);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 10; i++) { const a = now / 320 + i * 0.63, r = 36 * (1 - p) + 6, yy = y - p * 70 - (i % 5) * 7; c.strokeStyle = `rgba(210,255,225,${0.6 * (1 - p)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x + Math.cos(a) * r, yy); c.lineTo(x + Math.cos(a + 0.8) * r, yy - 6); c.stroke(); }
        glow(c, x, y - 30, 70, '120,255,170', 0.35 * Math.sin(p * Math.PI)); c.restore();
      } else if (b.k === 'an_mx') {                                                   // la momia estalla en fuego negro
        const x = px(f.x), y = py(f.y), al = 1 - p, r = f.r * TS * (0.4 + p);
        c.save(); glow(c, x, y - 10, r * 1.3, '15,0,25', 0.95 * al); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 10, r, '170,80,255', 0.7 * al); glow(c, x, y - 10, r * 0.4, '240,220,255', 0.9 * al); ring(c, x, y, r, '200,140,255', 4, al); c.restore();
      } else if (b.k === 'an_l') {                                                    // rayo de fuego negro
        const x1 = px(f.x1), y1 = py(f.y1), x2 = px(f.x2), y2 = py(f.y2), L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), th = f.w * TS, al = p < 0.2 ? p / 0.2 : (1 - p) / 0.8;
        c.save(); if (f.r) { const B = caveBox(f.r); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip(); } c.translate(x1, y1); c.rotate(a);
        let g = c.createLinearGradient(0, -th / 2, 0, th / 2); g.addColorStop(0, 'rgba(10,0,20,0)'); g.addColorStop(0.5, `rgba(20,4,36,${0.9 * al})`); g.addColorStop(1, 'rgba(10,0,20,0)'); c.fillStyle = g; c.fillRect(0, -th / 2, L, th);
        c.globalCompositeOperation = 'lighter'; g = c.createLinearGradient(0, -th / 3, 0, th / 3); g.addColorStop(0, 'rgba(150,60,255,0)'); g.addColorStop(0.5, `rgba(205,150,255,${0.8 * al})`); g.addColorStop(1, 'rgba(150,60,255,0)'); c.fillStyle = g; c.fillRect(0, -th / 3, L, th * 0.66);
        c.restore();
        c.save(); if (f.r) { const B = caveBox(f.r); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip(); }
        for (let s = 0; s < L; s += 28) { const wx = x1 + Math.cos(a) * s, wy = y1 + Math.sin(a) * s; if (!onScr(wx, wy, 40)) continue; c.globalAlpha = Math.max(0, al); const fh = 20 + 14 * Math.abs(Math.sin(now / 80 + s)); c.fillStyle = 'rgba(40,10,70,.9)'; c.beginPath(); c.moveTo(wx - 7, wy); c.quadraticCurveTo(wx, wy - fh, wx + 2, wy - fh * 1.2); c.quadraticCurveTo(wx + 8, wy - fh * 0.4, wx + 7, wy); c.fill(); c.fillStyle = 'rgba(190,120,255,.8)'; c.beginPath(); c.moveTo(wx - 3, wy); c.quadraticCurveTo(wx, wy - fh * 0.6, wx + 1, wy - fh * 0.7); c.quadraticCurveTo(wx + 4, wy - fh * 0.2, wx + 3, wy); c.fill(); }
        c.restore();
      } else if (b.k === 'an_bf') {                                                   // bola de fuego negro
        const x = px(f.x), y = py(f.y), al = 1 - p;
        c.save(); glow(c, x, y - 8, 60, '20,0,35', 0.9 * al); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 8, 46 * (0.6 + p), '170,90,255', 0.8 * al); glow(c, x, y - 8, 18, '245,230,255', 0.9 * al); c.restore();
      }
    }
  });
})();
