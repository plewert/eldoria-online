'use strict';
/* Cerbero, Guardián del Inframundo («Las Fauces del Inframundo»): triple llamarada, triple zarpazo, aullido, fuego de almas azul, embestida,
   cadenas de almas y muerte; además dibuja los adornos de la cueva (huesos de titán, cadenas, monedas, armas clavadas, huevo, llamas azules)
   y las antorchas de los pilares. Solo visual. Para quitarlo: borrar este archivo y su <script> (el jefe sigue funcionando). */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const AN = [], DIE = [];
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const hs = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T: T || f.T || 800, f });
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, Math.max(2, r)); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, Math.max(1, r), Math.max(1, r) * 0.8, 0, 0, 7); c.stroke(); };
  const st = (id) => { let s = X.zs.get(id); if (!s) { s = {}; X.zs.set(id, s); } return s; };
  const near = (x, y, d) => { const out = []; for (const e of G.ents.values()) if (e.t === 'cerbero' && Math.hypot(e.x - x, e.y - y) <= d) out.push(e); return out; };
  const zid = () => (G.me ? X.zoneAt(G.me.x, G.me.y).id : '');
  const caveOff = () => { if (!G.me) return null; const z = X.zoneAt(G.me.x, G.me.y); if (z.id === 'cueva_cerbero') return [0, 0]; if (/^inst_cueva_cerbero_/.test(z.id) && z.rect) return [z.rect[0] - 301, z.rect[1] - 296]; return null; };   // también las instancias privadas
  const inCave = () => !!caveOff();
  const onScr = (x, y, m) => x > -m && y > -m && x < innerWidth + m && y < innerHeight + m;
  const BLUE = '90,190,255', ORG = '255,110,30';
  const pillarsAt = (o) => { const out = []; if (!G.tiles || !G.W) return out; for (let y = 296; y <= 314; y++) for (let x = 301; x <= 334; x++) if (G.tiles[(y + o[1]) * G.W + x + o[0]] === 52) out.push([x + o[0], y + o[1]]); return out; };
  const pcache = new Map();

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    if (f.k === 'd' && f.c === 'h') { for (const e of near(f.x, f.y, 1.6)) { const s = st(e.id); if (!(s.hurt > now)) s.hurt = now + 320; } return; }
    if (f.k === 's') { for (const e of near(f.x, f.y, 2.2)) st(e.id).atk = now + 460; return; }
    switch (f.k) {
      case 'cb_cast': X.casts.set(f.id, now + Math.min(f.T, 1300) + 200); ADD('cb_cast', f, f.T + 300); break;
      case 'cb_mk': ADD('cb_mk', f); break;
      case 'cb_lane': ADD('cb_lane', f); break;
      case 'cb_flame': ADD('cb_flame', f, 650); X.burst(f.x2, f.y2, 'fire', 14, { sp: 4, up: 3, g: 3, life: 0.6, size: 3 }); G.shake = { t: now, m: 3 }; break;
      case 'cb_claw': ADD('cb_claw', f, 520); st(f.id).atk = now + 460; X.burst(f.x, f.y, 'fire', 12, { sp: 4, up: 2.5, g: 3, life: 0.5, size: 2.8 }); G.shake = { t: now, m: 4 }; break;
      case 'cb_howl': ADD('cb_howl', f, f.T); break;
      case 'cb_soul': ADD('cb_soul', f, f.T); X.burst(f.x, f.y, 'ice', 16, { sp: 4, up: 5, g: 3, life: 0.9, size: 3 }); X.ring(f.x, f.y, 'ice', 420, 48, 3); G.shake = { t: now, m: 3 }; break;
      case 'cb_dash': ADD('cb_dash', f, 520); G.shake = { t: now, m: 6 }; break;
      case 'cb_quake': X.burst(f.x, f.y, 'fire', 24, { sp: 5, up: 3, g: 2, life: 0.8, size: 3.4 }); X.ring(f.x, f.y, 'fire', 600, 90, 4); G.shake = { t: now, m: 7 }; break;
      case 'cb_chain': ADD('cb_chain', f, f.T); break;
      case 'cb_tug': ADD('cb_tug', f, 420); X.burst(f.x, f.y, 'ice', 4, { sp: 2.5, up: 2, g: 2, life: 0.4, size: 2.2 }); break;
      case 'cb_bite': ADD('cb_bite', f, 600); X.burst(f.x, f.y, 'fire', 18, { sp: 5, up: 3, g: 2, life: 0.7, size: 3 }); G.shake = { t: now, m: 6 }; break;
      case 'cb_die': DIE.push({ t: now, x: f.x, y: f.y, face: f.face }); X.burst(f.x, f.y, 'fire', 44, { sp: 6, up: 5, g: 2, life: 1.3, size: 3.6 }); X.burst(f.x, f.y, 'ice', 30, { sp: 4, up: 6, g: -1, life: 1.6, size: 3 }); X.ring(f.x, f.y, 'fire', 900, 120, 5); G.shake = { t: now, m: 8 }; break;
      default: break;
    }
  });

  /* ---- adornos de la cueva (sin colisión) ---- */
  function drawProp(c, k, x, y, now, i) {
    if (k === 'soul') {                                                                                 // grietas con fuego azul eléctrico frío
      const fl = 0.6 + 0.4 * Math.sin(now / 130 + i * 1.9); c.save(); c.globalCompositeOperation = 'lighter';
      glow(c, x, y - 4, 22 + 5 * fl, BLUE, 0.3 + 0.25 * fl); c.fillStyle = `rgba(150,220,255,${0.7 + 0.3 * fl})`;
      for (let q = 0; q < 3; q++) { const w = 3 + q, h = 8 + 7 * fl * (1 - q * 0.2); c.beginPath(); c.moveTo(x - 6 + q * 6 - w, y + 2); c.lineTo(x - 6 + q * 6, y + 2 - h); c.lineTo(x - 6 + q * 6 + w, y + 2); c.fill(); }
      c.restore();
    } else if (k === 'bones') {                                                                         // hueso de titán calcinado
      const a = hs(i, 3) * 0.8 - 0.4; c.save(); c.translate(x, y + 4); c.rotate(a); c.fillStyle = '#cfc6ae'; c.fillRect(-14, -2, 28, 4); c.fillStyle = '#e7dfc8'; c.fillRect(-14, -2, 28, 1);
      for (const s of [-1, 1]) { c.fillStyle = '#cfc6ae'; c.beginPath(); c.arc(s * 14, -2, 3.4, 0, 7); c.arc(s * 14, 2, 3.4, 0, 7); c.fill(); }
      c.fillStyle = `rgba(255,${100 + 40 * Math.sin(now / 400 + i)},20,.35)`; c.fillRect(-9, -1, 8, 2); c.restore();
    } else if (k === 'coins') {                                                                         // pila de monedas con la huella de pata
      c.fillStyle = '#7a5a12'; c.beginPath(); c.ellipse(x, y + 8, 13, 5, 0, 0, 7); c.fill();
      for (let q = 0; q < 9; q++) { const a = hs(i, q) * 6.28, r = hs(q, i) * 8; c.fillStyle = q % 2 ? '#ffd24a' : '#e0a820'; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + 4 + Math.sin(a) * r * 0.4 - q * 0.5, 3.4, 1.8, 0, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(160,60,0,.9)'; c.fillRect(x - 1, y, 3, 2); c.fillRect(x - 4, y - 2, 1.5, 1.5); c.fillRect(x + 3, y - 2, 1.5, 1.5);
      if (Math.sin(now / 300 + i * 2) > 0.8) { c.fillStyle = '#fff'; c.fillRect(x + 4, y - 3, 2, 2); }
    } else if (k === 'chain') {                                                                         // cadena de confinamiento rota colgando del techo
      c.strokeStyle = '#2c2c38'; c.lineWidth = 3; const sw = Math.sin(now / 900 + i) * 3;
      for (let q = 0; q < 6; q++) { const yy = y - 28 + q * 6, xx = x + sw * (q / 6); c.strokeStyle = q % 2 ? '#3d3d4c' : '#24242e'; c.strokeRect(xx - 3, yy, 6, 7); }
    } else if (k === 'weapon') {                                                                        // arma de aventurero derrotado, clavada en la roca
      const a = (hs(i, 7) - 0.5) * 0.9; c.save(); c.translate(x, y + 2); c.rotate(a); c.fillStyle = '#1d1d24'; c.fillRect(-1.5, -24, 3, 22); c.fillStyle = '#3b3b48'; c.fillRect(-1.5, -24, 1, 22);
      c.fillStyle = '#4a3322'; c.fillRect(-1, -2, 2, 8); c.fillStyle = '#2a2a33'; c.fillRect(-5, -3, 10, 2);
      if (i % 2) { c.globalCompositeOperation = 'lighter'; glow(c, 0, -14, 14, BLUE, 0.35 + 0.15 * Math.sin(now / 300 + i)); } c.restore();
    } else if (k === 'egg') {                                                                           // huevo de basilisco del Inframundo (verde oscuro) sobre grietas de lava
      c.fillStyle = '#6a1c08'; c.beginPath(); c.ellipse(x, y + 8, 12, 5, 0, 0, 7); c.fill(); c.fillStyle = '#ff7a1a'; c.fillRect(x - 8, y + 7, 5, 1.5); c.fillRect(x + 3, y + 8, 5, 1.5);
      c.fillStyle = '#1b4a2a'; c.beginPath(); c.ellipse(x, y - 2, 8, 11, 0, 0, 7); c.fill(); c.fillStyle = '#2f7a46'; c.beginPath(); c.ellipse(x - 2, y - 5, 3, 5, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(80,255,140,.25)'; c.fillRect(x - 5, y - 4, 2, 2); c.fillRect(x + 1, y + 1, 2, 2);
    }
  }
  const ABOVE = new Set(['chain', 'weapon', 'egg', 'soul']);
  const props = (c, now, above) => {
    if (!G.cbp || !G.cbp.length || !inCave()) return;
    const o = caveOff(); if (!o) return;
    for (let i = 0; i < G.cbp.length; i++) { const [x0, y0, k] = G.cbp[i]; if (ABOVE.has(k) !== above) continue; const x = x0 + o[0], y = y0 + o[1], sx = px(x), sy = py(y); if (!onScr(sx, sy, 50)) continue; drawProp(c, k, sx, sy, now, i); }
  };

  X.on('under', (c, now) => {
    const TS = X.TS;
    if (inCave()) props(c, now, false);
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'cb_mk') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = f.small ? 0.6 : 1, col = f.blue ? BLUE : '255,60,20';
        c.save(); c.fillStyle = `rgba(${col},${(0.1 + 0.2 * p) * al})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (0.25 + 0.75 * p), f.blue ? '140,210,255' : '255,110,40', f.small ? 2 : 3, 0.9 * al); if (!f.small) ring(c, x, y, r, col, 1.6, 0.5 + 0.4 * Math.sin(now / 60));
        c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 0.9, col, 0.25 * p * al); c.restore();
      } else if (b.k === 'cb_lane') {                                                                     // línea de aviso: llamarada o embestida
        const x1 = px(f.x1), y1 = py(f.y1), x2 = px(f.x2), y2 = py(f.y2), pu = 0.5 + 0.5 * Math.sin(now / 80), w = (f.wide ? 2.6 : 2.2) * TS;
        c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(255,50,10,${0.1 + 0.18 * p + 0.05 * pu})`; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = `rgba(255,140,50,${0.5 + 0.4 * pu})`; c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = -now / 25; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
        glow(c, x2, y2, w * 0.7, '255,80,20', 0.3 * p); c.restore();
      } else if (b.k === 'cb_claw') {
        const x = px(f.x), y = py(f.y), r = f.r * TS; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r, '255,80,20', 0.45 * (1 - p)); ring(c, x, y, r * (0.4 + 0.6 * p), '255,170,70', 4 * (1 - p) + 1, 1 - p); c.restore();
      } else if (b.k === 'cb_howl') {
        const e = G.ents.get(f.id); const x = e ? X.sxOf(e.rx) + TS / 2 : px(f.x), y = e ? X.syOf(e.ry) + TS / 2 : py(f.y), r = f.r * TS, ch = Math.min(1, p / 0.7);
        c.save(); c.globalCompositeOperation = 'lighter'; ring(c, x, y, r, '255,100,40', 1.5, 0.3 + 0.3 * Math.sin(now / 80));
        for (let k = 0; k < 3; k++) { const u = (ch + k / 3) % 1; ring(c, x, y, r * u, k % 2 ? '255,170,80' : '255,80,30', 3.5 * (1 - u) + 1, 0.8 * (1 - u)); } c.restore();
      } else if (b.k === 'cb_soul') {                                                                     // suelo en llamas azules
        const x = px(f.x), y = py(f.y), r = f.r * TS, fade = p > 0.8 ? (1 - p) / 0.2 : Math.min(1, p / 0.05 + 0.2), fl = 0.5 + 0.5 * Math.sin(now / 110 + f.x * 3);
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 1.3, BLUE, (0.4 + 0.2 * fl) * fade); ring(c, x, y, r, '140,210,255', 2, 0.7 * fade);
        for (let q = 0; q < 6; q++) { const a = q * 1.05 + now / 700, rr = r * 0.6 * hs(q, f.x); c.fillStyle = `rgba(170,230,255,${0.8 * fade})`; const fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr * 0.7, h = 8 + 8 * fl; c.beginPath(); c.moveTo(fx - 3, fy); c.lineTo(fx, fy - h); c.lineTo(fx + 3, fy); c.fill(); }
        c.restore();
      } else if (b.k === 'cb_chain') {                                                                    // círculo de las cadenas
        const e = G.ents.get(f.id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS / 2, al = p > 0.9 ? (1 - p) / 0.1 : 1;
        c.save(); c.globalAlpha = al; c.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) { const u = (now / 650 + k / 3) % 1; ring(c, x, y, f.r * TS * (1 - u) + 20, '120,200,255', 2.5, 0.8 * u); }
        ring(c, x, y, f.r * TS, '120,200,255', 1.4, 0.5); c.restore();
      }
    }
  });

  /* ---- por encima ---- */
  X.on('draw', (c, now) => {
    const TS = X.TS;
    if (inCave()) {
      const o = caveOff(), key = o[0] + ',' + o[1]; let pillars = pcache.get(key); if (!pillars) { pillars = pillarsAt(o); pcache.set(key, pillars); }
      for (const [x, y] of pillars) { const sx = px(x), sy = py(y); if (!onScr(sx, sy, 60)) continue; const fl = 0.6 + 0.4 * Math.sin(now / 110 + x);       // antorchas azul y naranja de los pilares
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, sx - 3, sy - 24, 34, ORG, 0.35 * fl); glow(c, sx + 3, sy - 24, 30, BLUE, 0.35 * fl); c.restore(); }
      props(c, now, true);
    }
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'cb_cast') {
        const e = G.ents.get(f.id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2 - 60, fade = p > 0.8 ? (1 - p) / 0.2 : 1, col = f.kind === 'almas' || f.kind === 'cadenas' ? BLUE : ORG;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 60 + 80 * p, col, 0.5 * fade);
        for (let k = 0; k < 3; k++) { const u = (now / 480 + k / 3) % 1; ring(c, x, y, 110 * (1 - u) + 12, col, 2.4, 0.7 * u * fade); } c.restore();
      } else if (b.k === 'cb_flame') {                                                                    // chorro de fuego de una cabeza
        const x1 = px(f.x1), y1 = py(f.y1) - 20, x2 = px(f.x2), y2 = py(f.y2) - 8, u = Math.min(1, p * 3), al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        c.strokeStyle = `rgba(255,70,10,${0.7 * al})`; c.lineWidth = 34 * al + 6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u); c.stroke();
        c.strokeStyle = `rgba(255,190,70,${0.9 * al})`; c.lineWidth = 16 * al + 3; c.stroke(); c.strokeStyle = `rgba(255,250,210,${al})`; c.lineWidth = 5; c.stroke();
        glow(c, x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 40, '255,150,40', 0.7 * al); c.restore();
      } else if (b.k === 'cb_dash') {
        const x1 = px(f.x1), y1 = py(f.y1) - 10, x2 = px(f.x2), y2 = py(f.y2) - 10, al = 1 - p; c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        c.strokeStyle = `rgba(255,90,30,${0.6 * al})`; c.lineWidth = 40 * al + 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.strokeStyle = `rgba(255,220,150,${0.8 * al})`; c.lineWidth = 10; c.stroke(); c.restore();
      } else if (b.k === 'cb_tug') {
        const e = G.ents.get(f.i), m = [...G.ents.values()].find((q) => q.t === 'cerbero'); if (!e || !m) continue; const x1 = px(f.x), y1 = py(f.y) - 10, x2 = X.sxOf(m.rx) + TS / 2, y2 = X.syOf(m.ry) + TS / 2 - 12;
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(140,210,255,${0.8 * (1 - p)})`; c.lineWidth = 3; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
      } else if (b.k === 'cb_bite') {
        const x = px(f.x), y = py(f.y) - 20; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 110 * (0.4 + p), '255,100,30', 0.6 * (1 - p)); ring(c, x, y + 20, 150 * p, '255,200,120', 4 * (1 - p) + 1, 1 - p); c.restore();
      }
    }
    for (let i = DIE.length - 1; i >= 0; i--) { const d = DIE[i], p = (now - d.t) / 1800; if (p >= 1) { DIE.splice(i, 1); continue; } const x = px(d.x), y = py(d.y) - 20; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 130 * (0.5 + p), '90,190,255', 0.5 * (1 - p)); glow(c, x, y, 90 * (0.5 + p), '255,110,30', 0.5 * (1 - p)); c.restore(); }
  });
})();
