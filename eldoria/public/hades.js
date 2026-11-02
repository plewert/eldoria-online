'use strict';
/* Hades, Rey del Inframundo: dragón de fuego, temblor con erupciones, ráfagas, absorción con daño devuelto, desaparición,
   viento de fuego y ambiente de miedo en su cueva y en El Inframundo. Solo visual. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const AN = [], DIE = [];
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const hs = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T: T || f.T || 800, f });
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.stroke(); };
  const hst = (id) => { let s = X.zs.get(id); if (!s) { s = {}; X.zs.set(id, s); } return s; };
  const hadesNear = (x, y, d) => { const out = []; for (const e of G.ents.values()) if (e.t === 'hades' && Math.hypot(e.x - x, e.y - y) <= d) out.push(e); return out; };
  const zid = () => (G.me ? X.zoneAt(G.me.x, G.me.y).id : '');
  const inCave = () => zid() === 'cueva_hades', inInfra = () => zid() === 'inframundo';
  let quake = 0, quakeT = 0;

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    if (f.k === 'd' && f.c === 'h') { for (const e of hadesNear(f.x, f.y, 1.6)) { const s = hst(e.id); if (!(s.hurt > now)) s.hurt = now + 320; } return; }
    if (f.k === 's') { for (const e of hadesNear(f.x, f.y, 2.2)) hst(e.id).atk = now + 460; return; }
    switch (f.k) {
      case 'hd_cast': X.casts.set(f.id, now + f.T + 300); ADD('hd_cast', f, f.T + 300); break;
      case 'hd_mk': ADD('hd_mk', f); break;
      case 'hd_lane': ADD('hd_lane', f); break;
      case 'hd_dragon': ADD('hd_dragon', f, f.path.length * f.step + f.burn + 600); G.shake = { t: now, m: 3 }; break;
      case 'hd_erupt': ADD('hd_erupt', f, 700); X.burst(f.x, f.y, 'fire', 16, { sp: 4.5, up: 5, g: 4, life: 0.8, size: 3.2 }); X.ring(f.x, f.y, 'fire', 420, 52, 3); G.shake = { t: now, m: 4 }; break;
      case 'hd_quake': quakeT = now + f.T; ADD('hd_quake', f, f.T); break;
      case 'hd_burst': ADD('hd_burst', f, 520); X.burst(f.x, f.y, 'fire', 14, { sp: 4, up: 3, g: 3, life: 0.6, size: 3 }); X.ring(f.x, f.y, 'fire', 380, 42, 3); break;
      case 'hd_abs': ADD('hd_abs', f, f.T); break;
      case 'hd_ref': ADD('hd_ref', f, 420); X.burst(f.x, f.y, 'fire', 8, { sp: 3.5, up: 2.5, g: 3, life: 0.5, size: 2.6 }); break;
      case 'hd_nova': ADD('hd_nova', f, 900); X.burst(f.x, f.y, 'fire', 30, { sp: 6, up: 3, g: 2, life: 0.9, size: 3.2 }); G.shake = { t: now, m: 6 }; break;
      case 'hd_vanish': hst(f.id).hide = now + 6000; ADD('hd_smoke', f, 900); X.burst(f.x, f.y, 'fire', 24, { sp: 4, up: 4, g: 1, life: 0.9, size: 3.4 }); break;
      case 'hd_appear': hst(f.id).hide = 0; ADD('hd_smoke', f, 900); X.burst(f.x, f.y, 'fire', 26, { sp: 5, up: 3, g: 2, life: 0.8, size: 3.4 }); X.ring(f.x, f.y, 'fire', 520, f.r * 32, 4); G.shake = { t: now, m: 6 }; break;
      case 'hd_die': DIE.push({ t: now, x: f.x, y: f.y, face: f.face }); X.burst(f.x, f.y, 'fire', 46, { sp: 6, up: 5, g: 2, life: 1.3, size: 3.6 }); X.ring(f.x, f.y, 'fire', 900, 120, 5); G.shake = { t: now, m: 8 }; break;
      default: break;
    }
  });

  /* ---- dragón de fuego: cuerpo serpenteante hecho de llamas ---- */
  function drawDragon(c, now, b) {
    const f = b.f, TS = X.TS, t = now - b.t, n = f.path.length, idx = Math.min(n - 1, t / f.step), head = Math.floor(idx);
    if (t / f.step > n + 14) return;
    const SEG = 22;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let s = SEG; s >= 0; s--) {                                                                         // del rabo a la cabeza
      const k = idx - s * 0.75; if (k < 0) continue; const i = Math.min(n - 1, Math.floor(k)); const p = f.path[i];
      const wave = Math.sin(now / 120 + s * 0.7) * (0.35 + 0.02 * s), x = px(p[0]), y = py(p[1]) + wave * TS * 0.9 - 14 - Math.sin(now / 200 + s * 0.5) * 3;
      const r = s === 0 ? 20 : 9 + (SEG - s) * 0.55 + Math.sin(now / 90 + s) * 1.2, al = s === 0 ? 1 : Math.max(0.25, 1 - s / (SEG + 3));
      glow(c, x, y, r * 3.1, '255,70,10', 0.5 * al); glow(c, x, y, r * 1.8, '255,150,30', 0.8 * al); glow(c, x, y, r * 0.8, '255,235,150', 0.95 * al);
      if (s % 3 === 0) { c.fillStyle = `rgba(255,${120 + (s * 9) % 100},30,${0.9 * al})`; const L = r * 1.4; c.beginPath(); c.moveTo(x - L * 0.2, y - r * 0.6); c.lineTo(x + L * 0.1 * f.dir, y - r * 1.9 - (s % 2) * 6); c.lineTo(x + L * 0.5, y - r * 0.6); c.fill(); }   // púas / llamas del lomo
      if (s === 0) {                                                                                         // cabeza: cuernos, mandíbula y ojos
        const d = f.dir; c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#3a0c06'; c.beginPath(); c.moveTo(x - d * 4, y - 12); c.lineTo(x + d * 30, y - 2); c.lineTo(x + d * 26, y + 8); c.lineTo(x - d * 8, y + 10); c.closePath(); c.fill();
        c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(x + d * 4, y - 12); c.lineTo(x - d * 8, y - 28); c.lineTo(x - d * 2, y - 8); c.fill(); c.beginPath(); c.moveTo(x - d * 4, y - 12); c.lineTo(x - d * 18, y - 24); c.lineTo(x - d * 8, y - 6); c.fill();
        c.fillStyle = '#fff3b0'; c.fillRect(x + d * 10 - 2, y - 6, 5, 3); c.fillStyle = '#ffd24a'; for (let q = 0; q < 4; q++) c.fillRect(x + d * (18 + q * 3), y + 6, 2, 4);
        c.globalCompositeOperation = 'lighter'; glow(c, x + d * 30, y + 2, 26 + Math.sin(now / 50) * 5, '255,170,40', 0.8);                // aliento de fuego
      }
    }
    c.restore();
    if (Math.random() < 0.7) { const p = f.path[head]; X.burst(p[0], p[1] + (Math.random() - 0.5) * 2, 'fire', 2, { sp: 2, up: 2.5, g: 1, life: 0.7, size: 2.8 }); }
  }

  /* ---- suelo: avisos rojos, carril del dragón, suelo en llamas ---- */
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'hd_mk') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = f.small ? 0.55 : 1;
        c.save(); c.fillStyle = `rgba(255,60,20,${(0.1 + 0.2 * p) * al})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (0.25 + 0.75 * p), '255,110,40', f.small ? 2 : 3, 0.9 * al); if (!f.small) ring(c, x, y, r, '255,70,20', 1.6, 0.5 + 0.4 * Math.sin(now / 60));
        c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 0.9, '255,80,20', 0.25 * p * al); c.restore();
      } else if (b.k === 'hd_lane') {                                                                       // carril por el que pasará el dragón
        const x0 = X.sxOf(f.x0), y0 = X.syOf(f.y - 1), w = (f.x1 - f.x0 + 1) * TS, h = 3 * TS, pu = 0.5 + 0.5 * Math.sin(now / 90);
        c.save(); c.fillStyle = `rgba(255,50,10,${0.1 + 0.14 * p + 0.06 * pu})`; c.fillRect(x0, y0, w, h);
        c.strokeStyle = `rgba(255,120,40,${0.5 + 0.4 * pu})`; c.lineWidth = 2; c.setLineDash([10, 8]); c.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2); c.setLineDash([]);
        c.fillStyle = `rgba(255,170,60,${0.8 * pu})`; for (let i = 0; i < 4; i++) { const xx = f.dir > 0 ? x0 + 24 + i * 26 : x0 + w - 24 - i * 26, yy = py(f.y); c.beginPath(); c.moveTo(xx, yy - 8); c.lineTo(xx + f.dir * 14, yy); c.lineTo(xx, yy + 8); c.fill(); }
        c.restore();
      } else if (b.k === 'hd_dragon') {                                                                     // suelo ardiendo tras el dragón
        const t = now - b.t, hd = t / f.step; c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < f.path.length; i++) {
          if (i > hd) break; const age = t - i * f.step; if (age > f.burn) continue; const fade = age > f.burn - 1200 ? Math.max(0, (f.burn - age) / 1200) : 1;
          for (let dy = -1; dy <= 1; dy++) { const x = px(f.path[i][0]), y = py(f.path[i][1] + dy), fl = 0.5 + 0.5 * Math.sin(now / 110 + i * 1.7 + dy * 2.3); glow(c, x, y, 22 + 5 * fl, '255,80,15', (0.45 + 0.2 * fl) * fade); if ((i + dy) % 2 === 0) { c.fillStyle = `rgba(255,190,60,${0.8 * fade})`; c.fillRect(x - 3 + Math.sin(now / 130 + i) * 5, y - 4 - fl * 8, 3, 5 + fl * 5); } }
        }
        c.restore();
      } else if (b.k === 'hd_abs') {                                                                        // círculo de absorción bajo Hades
        const e = [...G.ents.values()].find((q) => q.id === f.id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS / 2, al = p > 0.9 ? (1 - p) / 0.1 : 1;
        c.save(); c.globalAlpha = al; c.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) { const u = (now / 700 + k / 3) % 1; ring(c, x, y, 150 * (1 - u) + 20, '180,60,255', 2.5, 0.8 * u); }
        c.strokeStyle = 'rgba(255,90,40,.85)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 62, 50, 0, 0, 7); c.stroke();
        for (let i = 0; i < 8; i++) { const a = now / 600 + i * 0.785; c.fillStyle = 'rgba(255,150,60,.9)'; c.fillRect(x + Math.cos(a) * 62 - 2, y + Math.sin(a) * 50 - 2, 5, 5); }
        c.restore();
      }
    }
  });

  /* ---- por encima ---- */
  X.on('draw', (c, now, cw, ch) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'hd_cast') {                                                                              // Hades alza la guadaña: halo ardiente
        const e = G.ents.get(f.id); if (!e) continue;
        const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2 - 90, fade = p > 0.8 ? (1 - p) / 0.2 : 1, col = f.kind === 'absorber' ? '190,70,255' : '255,100,30';
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 70 + 90 * p, col, 0.5 * fade);
        for (let k = 0; k < 3; k++) { const u = (now / 480 + k / 3) % 1; ring(c, x, y, 120 * (1 - u) + 12, col, 2.4, 0.7 * u * fade); }
        c.restore();
      } else if (b.k === 'hd_erupt') {                                                                      // columna de lava
        const x = px(f.x), y = py(f.y), al = 1 - p, h = 150 * Math.sin(Math.min(1, p * 1.8) * Math.PI / 2);
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 4, 70 * (0.6 + p), '255,70,10', 0.8 * al);
        const g = c.createLinearGradient(x, y, x, y - h); g.addColorStop(0, `rgba(255,210,80,${0.95 * al})`); g.addColorStop(0.5, `rgba(255,100,20,${0.8 * al})`); g.addColorStop(1, 'rgba(120,20,5,0)'); c.fillStyle = g;
        c.beginPath(); c.moveTo(x - 22, y); c.quadraticCurveTo(x - 14, y - h * 0.6, x - 6 + Math.sin(now / 60) * 4, y - h); c.quadraticCurveTo(x + 14, y - h * 0.6, x + 22, y); c.fill();
        glow(c, x, y - 6, 26, '255,240,170', 0.9 * al); c.restore();
      } else if (b.k === 'hd_burst') {                                                                      // ráfaga de fuego de la guadaña
        const e = hadesNear(f.sx, f.sy, 3)[0], sx = e ? X.sxOf(e.rx) + TS / 2 : px(f.sx), sy = e ? X.syOf(e.ry) + TS / 2 - 40 : py(f.sy) - 40, x = px(f.x), y = py(f.y), u = Math.min(1, p / 0.55), al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) { const o = (k - 1) * 8; c.strokeStyle = `rgba(${k === 1 ? '255,230,140' : '255,100,20'},${0.9 * al})`; c.lineWidth = k === 1 ? 3 : 5; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + x) / 2 + o, (sy + y) / 2 - 40, sx + (x - sx) * u, sy + (y - sy) * u); c.stroke(); }
        glow(c, sx + (x - sx) * u, sy + (y - sy) * u, 34, '255,140,40', 0.9 * al); if (p > 0.5) glow(c, x, y, 60, '255,80,20', 0.8 * al);
        c.restore();
      } else if (b.k === 'hd_ref') {                                                                        // daño devuelto: hilo de fuego del jefe al atacante
        const e = hadesNear(f.sx, f.sy, 3)[0], sx = e ? X.sxOf(e.rx) + TS / 2 : px(f.sx), sy = e ? X.syOf(e.ry) + TS / 2 - 30 : py(f.sy) - 30, x = px(f.x), y = py(f.y) - 12, al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(210,90,255,${0.9 * al})`; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(x, y); c.stroke();
        c.strokeStyle = `rgba(255,170,70,${al})`; c.lineWidth = 1.4; c.stroke(); glow(c, x, y, 30, '255,90,40', 0.8 * al); c.restore();
      } else if (b.k === 'hd_nova') {
        const x = px(f.x), y = py(f.y), r = f.r * TS * (0.15 + 0.85 * p), al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; ring(c, x, y, r, '255,110,40', 7 * al + 1, 0.9 * al); ring(c, x, y, r * 0.8, '190,70,255', 3, 0.7 * al); glow(c, x, y, r, '255,70,20', 0.25 * al); c.restore();
      } else if (b.k === 'hd_smoke') {                                                                      // humo y brasas al esfumarse o aparecer
        const x = px(f.x), y = py(f.y) - 30, al = 1 - p;
        c.save(); c.globalCompositeOperation = 'source-over'; for (let i = 0; i < 8; i++) { const a = i * 0.79 + p * 2, r = 12 + 40 * p; c.fillStyle = `rgba(20,6,8,${0.5 * al})`; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7 - p * 30, 14 + 8 * p, 0, 7); c.fill(); }
        c.globalCompositeOperation = 'lighter'; glow(c, x, y, 70 * (1 - p * 0.4), '255,80,20', 0.5 * al); c.restore();
      } else if (b.k === 'hd_dragon') drawDragon(c, now, b);
    }
    // aura de absorción sobre Hades: remolino violeta
    for (const b of AN) {
      if (b.k !== 'hd_abs') continue; const p = (now - b.t) / b.T; if (p >= 1) continue; const e = G.ents.get(b.f.id); if (!e) continue;
      const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS / 2 - 50, al = p > 0.9 ? (1 - p) / 0.1 : 1;
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 110, '170,50,255', 0.38 * al); glow(c, x, y, 70, '255,70,40', 0.25 * al);
      for (let i = 0; i < 12; i++) { const a = now / 380 + i * 0.52, r = 48 + 22 * Math.sin(now / 300 + i); c.fillStyle = `rgba(220,120,255,${0.8 * al})`; c.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 3, 3); }
      c.restore();
    }
    // temblor: pantalla con vibración y polvo rojo
    for (const b of AN) {
      if (b.k !== 'hd_quake') continue; const p = (now - b.t) / b.T; if (p >= 1) continue;
      const k = p > 0.85 ? (1 - p) / 0.15 : Math.min(1, p / 0.08); if (now - quake > 90) { quake = now; G.shake = { t: now, m: 3 + 3 * k }; }
      c.save(); c.fillStyle = `rgba(90,10,0,${0.12 * k})`; c.fillRect(0, 0, cw, ch); c.restore();
    }
    // ambiente: viento de fuego, ceniza y miedo (viñeta que late) en el Trono y, más suave, en El Inframundo
    const cave = inCave(), infra = !cave && inInfra();
    if (cave || infra) {
      const k = cave ? 1 : 0.55, t = now / 1000;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < Math.round(34 * k); i++) {                                                          // rachas de viento ardiente y brasas
        const sp = 260 + hs(i, 1) * 300, x = ((t * sp + hs(i, 2) * cw * 1.4) % (cw * 1.4)) - cw * 0.2, y = hs(i, 3) * ch + Math.sin(t * 2 + i) * 6, L = 40 + hs(i, 4) * 100;
        c.strokeStyle = `rgba(255,${90 + hs(i, 7) * 90 | 0},30,${0.1 + hs(i, 5) * 0.16})`; c.lineWidth = 1 + hs(i, 6) * 1.6; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + L * 0.5, y - 5 + Math.sin(now / 350 + i) * 6, x + L, y); c.stroke();
        if (i % 4 === 0) { c.fillStyle = `rgba(255,170,60,${0.5 + 0.4 * hs(i, 8)})`; c.fillRect(x + L, y - 2 - ((t * 20 + i * 9) % 18), 2, 2); }
      }
      c.restore();
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.1) * Math.sin(t * 0.37 + 1), g = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * (0.28 - 0.04 * pulse), cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
      g.addColorStop(0, 'rgba(20,0,0,0)'); g.addColorStop(1, `rgba(40,0,6,${(0.62 + 0.12 * pulse) * k})`); c.fillStyle = g; c.fillRect(0, 0, cw, ch);          // oscuridad que respira: sensación de miedo
      if (cave && hs(Math.round(t * 3), 11) < 0.05) { c.fillStyle = 'rgba(255,60,20,.07)'; c.fillRect(0, 0, cw, ch); }                                        // destellos rojos ocasionales
    }
    // caída de Hades: se hunde en llamas y se desvanece
    for (let i = DIE.length - 1; i >= 0; i--) {
      const d = DIE[i], age = now - d.t; if (age > 4200) { DIE.splice(i, 1); continue; }
      const S = X.sprReady() && X.SPR.hades; if (!S) continue; const fi = S.anim.death[Math.min(S.anim.death.length - 1, Math.floor(age / 900))], x = px(d.x), y = py(d.y) + TS / 2 - 2;
      c.save(); c.globalAlpha = age > 2600 ? Math.max(0, 1 - (age - 2600) / 1500) : 1; { const fr = S.f[fi], w = fr[2], h = fr[3], sink = Math.min(1, age / 3000) * h * 0.5; c.save(); c.imageSmoothingEnabled = true; c.translate(Math.round(x), Math.round(y)); if (d.face < 0) c.scale(-1, 1); c.beginPath(); c.rect(-w / 2, -h, w, h - sink + 2); c.clip(); c.drawImage(X.sprImg, fr[0], fr[1], w, h, -w / 2, -h + sink, w, h); c.restore(); }
      c.globalCompositeOperation = 'lighter'; glow(c, x, y - 40, 90, '255,80,20', 0.45 * (1 - age / 4200)); c.restore();
    }
  });
})();
