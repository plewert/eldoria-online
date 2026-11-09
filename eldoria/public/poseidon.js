'use strict';
/* Poseidón, Rey de los Mares y la Ballena Abisal: remolino, tridente, olas gigantes, oscuridad, ráfagas, bolas de agua, burbuja de curación. Solo visual. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const AN = [], TUG = new Map(), DIE = [], BUB = new Map();
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const hs = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T: T || f.T || 800, f });
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.stroke(); };
  const zst = (id) => { let s = X.zs.get(id); if (!s) { s = {}; X.zs.set(id, s); } return s; };
  const near = (x, y, d) => { const out = []; for (const e of G.ents.values()) if ((e.t === 'poseidon' || e.t === 'ballena') && Math.hypot(e.x - x, e.y - y) <= d) out.push(e); return out; };
  const inCave = () => G.me && X.zoneAt(G.me.x, G.me.y).id === 'cueva_poseidon';
  const WATER = '90,210,255', FOAM = '225,250,255';
  const dk = document.createElement('canvas'), dg = dk.getContext('2d');

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    if (f.k === 'd' && f.c === 'h') { for (const e of near(f.x, f.y, 1.8)) { const s = zst(e.id); if (!(s.hurt > now)) s.hurt = now + 320; } return; }
    if (f.k === 's') { for (const e of near(f.x, f.y, 2.4)) zst(e.id).atk = now + 460; return; }
    switch (f.k) {
      case 'ps_cast': X.casts.set(f.id, now + f.T + 300); ADD('ps_cast', f, f.T + 300); break;
      case 'ps_mk': case 'ps_jmk': case 'ps_wmk': case 'ps_whirl': case 'ps_trident': case 'ps_orb': case 'ps_dark': case 'ps_summon': case 'ps_dash': ADD(f.k, f, f.T);
        if (f.k === 'ps_whirl') G.shake = { t: now, m: 3 };
        if (f.k === 'ps_dark') G.shake = { t: now, m: 2 };
        break;
      case 'ps_wave': ADD('ps_wave', f, f.T); G.shake = { t: now, m: 5 }; break;
      case 'ps_tug': TUG.set(f.i, now + 500); if (Math.random() < 0.5) X.burst(f.x, f.y - 0.2, 'water', 2, { sp: 1.6, up: 1.5, g: 3, life: 0.5, size: 2.2 }); break;
      case 'ps_burst': ADD('ps_burst', f, 800); X.burst(f.x, f.y, 'water', 40, { sp: 6, up: 5, g: 3, life: 0.9, size: 3.2 }); X.ring(f.x, f.y, 'water', 700, 110, 5); G.shake = { t: now, m: 7 }; break;
      case 'ps_hit': X.burst(f.x, f.y, 'water', f.big ? 22 : 12, { sp: 4, up: 3, g: 3, life: 0.6, size: 3 }); X.ring(f.x, f.y, 'water', 380, f.big ? 70 : 44, 3); G.shake = { t: now, m: f.big ? 5 : 3 }; break;
      case 'ps_stab': ADD('ps_stab', f, 1500); X.burst(f.x, f.y, 'water', 26, { sp: 5, up: 4, g: 3, life: 0.8, size: 3 }); X.ring(f.x, f.y, 'water', 500, 80, 4); G.shake = { t: now, m: 6 }; break;
      case 'ps_splash': ADD('ps_splash', f, 700); X.burst(f.x, f.y, 'water', 24, { sp: 4.5, up: 4, g: 3, life: 0.8, size: 3 }); X.ring(f.x, f.y, 'water', 500, 76, 4); G.shake = { t: now, m: 4 }; break;
      case 'ps_geyser': ADD('ps_geyser', f, 800); X.burst(f.x, f.y, 'water', 18, { sp: 2.5, up: 7, g: 4, life: 1, size: 3 }); X.ring(f.x, f.y, 'water', 450, 60, 3); break;
      case 'ps_jet': ADD('ps_jet', f, 420); X.burst(f.ex, f.ey, 'water', 6, { sp: 3, up: 2, g: 3, life: 0.5, size: 2.4 }); break;
      case 'ps_bub': BUB.set(f.id, now + f.T); X.burst(f.x, f.y, 'water', 20, { sp: 3, up: 3, g: -1, life: 1, size: 3 }); break;
      case 'ps_bubx': BUB.delete(f.id); X.burst(f.x, f.y, 'water', 30, { sp: 5, up: 4, g: 1, life: 0.9, size: 3 }); X.ring(f.x, f.y, 'water', 600, 90, 4); break;
      case 'ps_heal': X.burst(f.x, f.y - 0.3, 'water', 4, { sp: 1, up: 3, g: -2, life: 1, size: 2.4 }); break;
      case 'ps_appear': ADD('ps_appear', f, 1100); X.burst(f.x, f.y, 'water', 36, { sp: 5, up: 5, g: 3, life: 1, size: 3.2 }); X.ring(f.x, f.y, 'water', 700, 100, 5); G.shake = { t: now, m: 5 }; break;
      case 'ps_vanish': X.burst(f.x, f.y, 'water', 24, { sp: 4, up: 4, g: 3, life: 0.8, size: 3 }); X.ring(f.x, f.y, 'water', 500, 70, 3); break;
      case 'ps_wdie': DIE.push({ t: performance.now(), x: f.x, y: f.y, face: f.face, key: 'ballena' }); X.burst(f.x, f.y, 'water', 40, { sp: 6, up: 5, g: 3, life: 1.1, size: 3.4 }); G.shake = { t: now, m: 5 }; break;
      case 'ps_die': BUB.clear(); DIE.push({ t: performance.now(), x: f.x, y: f.y, face: f.face, key: 'poseidon' }); X.burst(f.x, f.y, 'water', 60, { sp: 7, up: 5, g: 2, life: 1.4, size: 3.6 }); X.ring(f.x, f.y, 'water', 1000, 140, 6); G.shake = { t: now, m: 9 }; break;
      default: break;
    }
  });

  const ca = (p, a, b) => (p < a ? p / a : p > b ? (1 - p) / (1 - b) : 1);

  /* ---- suelo: avisos y remolino ---- */
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'ps_mk') {
        if (f.dark) continue;                                                           // en la oscuridad se dibuja por encima
        const x = px(f.x), y = py(f.y), r = f.r * TS;
        c.save(); c.fillStyle = `rgba(70,190,255,${0.1 + 0.18 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (0.25 + 0.75 * p), WATER, f.big ? 4 : 3, 0.9); ring(c, x, y, r, FOAM, 1.5, 0.45 + 0.35 * Math.sin(now / 60)); c.restore();
      } else if (b.k === 'ps_jmk') {                                                    // línea de aviso de un chorro
        const x1 = px(f.sx), y1 = py(f.sy), x2 = px(f.ex), y2 = py(f.ey);
        c.save(); c.strokeStyle = `rgba(90,210,255,${0.12 + 0.3 * p})`; c.lineWidth = f.wide ? 30 : f.w ? 16 : 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = `rgba(225,250,255,${0.4 + 0.4 * Math.sin(now / 60)})`; c.lineWidth = 1.5; c.stroke(); c.restore();
      } else if (b.k === 'ps_wmk') {                                                    // aviso de ola: todo el ancho salvo el carril calmo
        const x0 = X.sxOf(f.x0), w = (f.x1 - f.x0 + 1) * TS, ya = X.syOf(f.y0), yg = X.syOf(f.ga), yb = X.syOf(f.gb + 1), ye = X.syOf(f.y1 + 1), al = 0.12 + 0.12 * Math.sin(now / 90);
        c.save(); c.fillStyle = `rgba(255,80,90,${al + 0.1 * p})`; c.fillRect(x0, ya, w, yg - ya); c.fillRect(x0, yb, w, ye - yb);
        c.fillStyle = `rgba(120,255,200,${0.14 + 0.12 * p})`; c.fillRect(x0, yg, w, yb - yg); c.strokeStyle = 'rgba(160,255,215,.8)'; c.lineWidth = 2; c.strokeRect(x0, yg, w, yb - yg);
        c.fillStyle = 'rgba(255,255,255,.7)'; const ay = (yg + yb) / 2; for (let i = 0; i < 6; i++) { const u = ((now / 600 + i / 6) % 1), ax = f.dir > 0 ? x0 + u * w : x0 + w - u * w; c.beginPath(); c.moveTo(ax, ay - 8); c.lineTo(ax + f.dir * 12, ay); c.lineTo(ax, ay + 8); c.fill(); }
        c.restore();
      } else if (b.k === 'ps_whirl') {                                                  // remolino en el suelo
        const x = px(f.x), y = py(f.y), R = f.r * TS * 0.55, al = ca(p, 0.08, 0.9);
        c.save(); c.globalAlpha = al; const gr = c.createRadialGradient(x, y, 4, x, y, R); gr.addColorStop(0, 'rgba(8,40,90,.85)'); gr.addColorStop(0.55, 'rgba(30,130,200,.45)'); gr.addColorStop(1, 'rgba(90,210,255,0)');
        c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, R, R * 0.8, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(225,250,255,.7)'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); for (let i = 0; i <= 26; i++) { const u = i / 26, a = now / 260 + k * 1.57 + u * 6.5, rr = R * (0.12 + 0.88 * u); const sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr * 0.8; if (i) c.lineTo(sx, sy); else c.moveTo(sx, sy); } c.stroke(); }
        c.restore();
      } else if (b.k === 'ps_stab') {                                                   // tridente clavado
        const x = px(f.x), y = py(f.y), al = ca(p, 0.05, 0.6); c.save(); c.globalAlpha = al; ring(c, x, y, f.r * TS * 0.9, WATER, 3, 0.8);
        c.strokeStyle = '#cfe9f5'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x, y - 44); c.stroke(); c.strokeStyle = '#7fd2ff'; c.lineWidth = 2;
        for (const o of [-8, 0, 8]) { c.beginPath(); c.moveTo(x + o, y - 44); c.lineTo(x + o, y - 56); c.stroke(); } c.beginPath(); c.moveTo(x - 8, y - 44); c.lineTo(x + 8, y - 44); c.stroke(); c.restore();
      } else if (b.k === 'ps_summon') {
        const x = px(f.x), y = py(f.y); c.save(); c.globalCompositeOperation = 'lighter'; ring(c, x, y, 50 * (1 - p) + 10, WATER, 3, 0.9 * p + 0.2); glow(c, x, y, 60, WATER, 0.35 * p); c.restore();
      }
    }
    for (const [id, until] of TUG) { if (now > until) TUG.delete(id); }
  });

  /* ---- por encima ---- */
  X.on('draw', (c, now, cw, ch) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'ps_cast') {                                                          // halo de agua alrededor de quien lanza
        const e = G.ents.get(f.id); if (!e || !Number.isFinite(e.rx) || !Number.isFinite(e.ry)) continue;
        const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2 - (e.t === 'ballena' ? 40 : 80), fade = p > 0.8 ? (1 - p) / 0.2 : 1;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 70 + 80 * p, WATER, 0.45 * fade);
        for (let k = 0; k < 3; k++) { const u = (now / 480 + k / 3) % 1; ring(c, x, y, 110 * (1 - u) + 12, WATER, 2.4, 0.7 * u * fade); }
        c.restore();
      } else if (b.k === 'ps_trident') {                                                // tridente volando
        const u = Math.min(1, p), x1 = px(f.sx), y1 = py(f.sy) - 50, x2 = px(f.x), y2 = py(f.y), x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u - Math.sin(u * Math.PI) * 30, a = Math.atan2(y2 - y1, x2 - x1);
        c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = 'rgba(120,220,255,.5)'; c.lineWidth = 7; c.beginPath(); c.moveTo(-34, 0); c.lineTo(0, 0); c.stroke();
        c.strokeStyle = '#dff4ff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-18, 0); c.lineTo(14, 0); c.stroke(); c.strokeStyle = '#7fd8ff'; c.lineWidth = 2.4;
        for (const o of [-7, 0, 7]) { c.beginPath(); c.moveTo(10, o); c.lineTo(22, o * 0.7); c.stroke(); } c.beginPath(); c.moveTo(10, -7); c.lineTo(10, 7); c.stroke(); c.restore();
      } else if (b.k === 'ps_orb') {                                                    // bola de agua en arco
        const u = Math.min(1, p), x1 = px(f.sx), y1 = py(f.sy) - 60, x2 = px(f.x), y2 = py(f.y), x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u - Math.sin(u * Math.PI) * 120;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 30, WATER, 0.7); c.globalCompositeOperation = 'source-over';
        const g = c.createRadialGradient(x - 3, y - 3, 1, x, y, 13); g.addColorStop(0, 'rgba(235,252,255,.95)'); g.addColorStop(0.6, 'rgba(70,190,255,.85)'); g.addColorStop(1, 'rgba(20,100,200,.8)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); c.restore();
      } else if (b.k === 'ps_jet') {                                                    // chorro a presión
        const x1 = px(f.sx), y1 = py(f.sy) - 20, x2 = px(f.ex), y2 = py(f.ey), al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = `rgba(40,140,230,${0.5 * al})`; c.lineWidth = f.w ? 20 : 16; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = `rgba(150,230,255,${0.8 * al})`; c.lineWidth = 8; c.stroke(); c.strokeStyle = `rgba(255,255,255,${0.9 * al})`; c.lineWidth = 3; c.stroke(); c.restore();
      } else if (b.k === 'ps_geyser') {                                                 // géiser
        const x = px(f.x), y = py(f.y), h = 110 * Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5) * (p > 0.6 ? (1 - p) / 0.4 : 1), w = f.r * TS * 0.5;
        c.save(); if (f.dark) c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, 'rgba(225,250,255,.85)'); g.addColorStop(1, 'rgba(60,170,240,.65)');
        c.fillStyle = g; c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.5, y - h * 0.6, x - w * 0.25, y - h); c.lineTo(x + w * 0.25, y - h); c.quadraticCurveTo(x + w * 0.5, y - h * 0.6, x + w, y); c.fill(); c.restore();
      } else if (b.k === 'ps_burst') {
        const x = px(f.x), y = py(f.y); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 110 * (0.4 + p), WATER, 0.7 * (1 - p)); c.restore();
      } else if (b.k === 'ps_appear') {
        const x = px(f.x), y = py(f.y); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 20, 90, WATER, 0.5 * (1 - p)); c.restore();
      } else if (b.k === 'ps_wave') {                                                   // ola gigante: muro de agua con espuma
        const el = now - b.t, sp = (f.x1 - f.x0) / b.T, wx = f.dir > 0 ? f.x0 + el * sp : f.x1 - el * sp, x = px(wx), w = 56;
        const ya = X.syOf(f.y0), yg = X.syOf(f.ga), yb = X.syOf(f.gb + 1), ye = X.syOf(f.y1 + 1);
        c.save(); for (const [y0, y1] of [[ya, yg], [yb, ye]]) {
          if (y1 <= y0) continue;
          const g = c.createLinearGradient(x - w * f.dir, 0, x + w * 0.4 * f.dir, 0); g.addColorStop(0, 'rgba(30,120,210,0)'); g.addColorStop(0.55, 'rgba(60,170,240,.75)'); g.addColorStop(1, 'rgba(230,250,255,.95)');
          c.fillStyle = g; c.fillRect(Math.min(x - w * f.dir, x + w * 0.4 * f.dir), y0, w * 1.4, y1 - y0);
          c.fillStyle = 'rgba(255,255,255,.9)'; for (let yy = y0; yy < y1; yy += 12) { const o = Math.sin(now / 80 + yy * 0.3) * 6; c.beginPath(); c.arc(x + w * 0.35 * f.dir + o, yy + 6, 7 + hs(yy, 1) * 4, 0, 7); c.fill(); }
        }
        c.restore();
        if (Math.random() < 0.6) X.burst(wx, f.ga + (f.gb - f.ga) * Math.random() + (Math.random() < 0.5 ? -4 : 4) * Math.random() * 2, 'water', 1, { sp: 2, up: 2, g: 3, life: 0.5, size: 2.4 });
      }
    }
    // marcas en la oscuridad (se ven por encima de la oscuridad)
    // oscuridad: toda la cueva a oscuras salvo un halo alrededor de tu personaje
    for (const b of AN) {
      if (b.k !== 'ps_dark' || !G.me || !inCave()) continue; const p = (now - b.t) / b.T; if (p >= 1) continue;
      if (dk.width !== cw || dk.height !== ch) { dk.width = cw; dk.height = ch; }
      const k = Math.min(1, (now - b.t) / 900) * (p > 0.9 ? (1 - p) / 0.1 : 1), me = G.ents.get(G.me.id) || G.me, mx = X.sxOf(Number.isFinite(me.rx) ? me.rx : me.x) + TS / 2, my = X.syOf(Number.isFinite(me.ry) ? me.ry : me.y) + TS / 2;
      dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, cw, ch); dg.fillStyle = `rgba(0,6,22,${0.9 * k})`; dg.fillRect(0, 0, cw, ch);
      dg.globalCompositeOperation = 'destination-out'; const R = 150 + 20 * Math.sin(now / 300), g = dg.createRadialGradient(mx, my, 20, mx, my, R); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dg.fillStyle = g; dg.fillRect(mx - R, my - R, R * 2, R * 2);
      // el jefe y la ballena brillan con un halo azul incluso a oscuras
      for (const e of G.ents.values()) if ((e.t === 'poseidon' || e.t === 'ballena') && Number.isFinite(e.rx) && Number.isFinite(e.ry)) { const ex = X.sxOf(e.rx) + TS / 2, ey = X.syOf(e.ry) + TS / 2, r2 = 90, g2 = dg.createRadialGradient(ex, ey, 10, ex, ey, r2); g2.addColorStop(0, 'rgba(0,0,0,.8)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); dg.fillStyle = g2; dg.fillRect(ex - r2, ey - r2, r2 * 2, r2 * 2); }
      c.drawImage(dk, 0, 0);
      for (const m of AN) if (m.k === 'ps_mk' && m.f.dark) { const pp = (now - m.t) / m.T; if (pp < 0 || pp >= 1) continue; const x = px(m.f.x), y = py(m.f.y), r = m.f.r * TS; c.save(); c.globalCompositeOperation = 'lighter'; ring(c, x, y, r * (0.25 + 0.75 * pp), WATER, 3, 0.9); ring(c, x, y, r, FOAM, 1.5, 0.5); glow(c, x, y, r, WATER, 0.18 * pp); c.restore(); }
    }
    // burbuja de agua alrededor de Poseidón
    for (const [id, until] of BUB) {
      if (now > until) { BUB.delete(id); continue; } const e = G.ents.get(id); if (!e) { BUB.delete(id); continue; } if (!Number.isFinite(e.rx)) continue;
      const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 82, R = 96 + 4 * Math.sin(now / 160), al = Math.min(1, (until - now) / 500);
      c.save(); c.globalAlpha = al; const g = c.createRadialGradient(x - 20, y - 30, 8, x, y, R); g.addColorStop(0, 'rgba(210,248,255,.10)'); g.addColorStop(0.8, 'rgba(70,190,255,.20)'); g.addColorStop(1, 'rgba(180,240,255,.55)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, R * 0.82, R, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(235,252,255,.85)'; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(x - R * 0.35, y - R * 0.5, 10, 18, -0.6, 0, 7); c.fill();
      c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const u = (now / 1100 + i / 5) % 1; c.fillStyle = `rgba(190,240,255,${0.8 * (1 - u)})`; c.beginPath(); c.arc(x + Math.sin(u * 9 + i * 2) * R * 0.5, y + R * 0.8 - u * R * 1.5, 2.5 + (i % 3), 0, 7); c.fill(); }
      c.restore();
    }
    // atraídos por el remolino: salpicaduras en los pies
    for (const [id, until] of TUG) {
      const e = G.ents.get(id); if (!e || now > until || !Number.isFinite(e.rx)) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 4;
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 10, 24, WATER, 0.3); ring(c, x, y, 14 + 4 * Math.sin(now / 80), FOAM, 1.5, 0.6); c.restore();
    }
    // caída de Poseidón / la ballena
    for (let i = DIE.length - 1; i >= 0; i--) {
      const d = DIE[i], age = now - d.t; if (age > 4200) { DIE.splice(i, 1); continue; }
      const S = X.sprReady() && X.SPR[d.key]; if (!S || !S.anim.death) continue; const A = S.anim.death, fi = A[Math.min(A.length - 1, Math.floor(age / 650))], x = px(d.x), y = py(d.y) + TS / 2 - 2;
      c.save(); c.globalAlpha = age > 3200 ? Math.max(0, 1 - (age - 3200) / 1000) : 1; X.drawSpriteS(c, d.key, fi, Math.round(x), Math.round(y), d.face < 0, 1); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 30, 80, WATER, 0.3 * (1 - age / 4200)); c.restore();
    }
  });
})();
