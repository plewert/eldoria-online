'use strict';
/* Zeus, Señor del Olimpo: rayos, truenos que persiguen, tormenta con cuadros seguros, chispas y el cielo con viento del Olimpo. Solo visual. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const AN = [], SLOW = new Map(), CH = new Map(), DIE = [];
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const hs = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T: T || f.T || 800, f });
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.stroke(); };
  const zst = (id) => { let s = X.zs.get(id); if (!s) { s = {}; X.zs.set(id, s); } return s; };
  const zeusNear = (x, y, d) => { const out = []; for (const e of G.ents.values()) if (e.t === 'zeus' && Math.hypot(e.x - x, e.y - y) <= d) out.push(e); return out; };

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    if (f.k === 'd' && f.c === 'h') { for (const e of zeusNear(f.x, f.y, 1.6)) { const s = zst(e.id); if (!(s.hurt > now)) s.hurt = now + 320; } return; }      // golpe recibido: reacción de herido
    if (f.k === 's') { for (const e of zeusNear(f.x, f.y, 2.2)) zst(e.id).atk = now + 460; return; }                                                     // ataque cuerpo a cuerpo
    switch (f.k) {
      case 'zs_cast': X.casts.set(f.id, now + f.T + 300); ADD('zs_cast', f, f.T + 300); break;
      case 'zs_mk': ADD('zs_mk', f); break;
      case 'zs_bolt': ADD('zs_bolt', f, f.small ? 420 : 650); X.burst(f.x, f.y, 'storm', f.small ? 6 : 16, { sp: 4, up: 3, g: 3, life: 0.6, size: 3 }); X.ring(f.x, f.y, 'storm', 420, f.small ? 34 : 56, 3);
        if (!f.small) G.shake = { t: now, m: 4 }; break;
      case 'zs_slow': SLOW.set(f.id, now + f.ms); break;
      case 'zs_safe': ADD('zs_safe', f); break;
      case 'zs_storm': ADD('zs_storm', f); break;
      case 'zs_chs': ADD('zs_chs', f); CH.set(f.id, { x0: f.x, y0: f.y, x1: f.x, y1: f.y, t: now, T: 1, born: now + f.T }); break;
      case 'zs_ch': { const c = CH.get(f.id) || { x1: f.x, y1: f.y }; CH.set(f.id, { x0: c.x1, y0: c.y1, x1: f.x, y1: f.y, t: now, T: f.T, born: 0 }); break; }
      case 'zs_che': CH.delete(f.id); ADD('zs_bolt', { x: f.x, y: f.y, r: 1.2, small: 1 }, 420); X.burst(f.x, f.y, 'storm', 10, { sp: 3, up: 3, g: 2, life: 0.6, size: 2.6 }); break;
      case 'zs_hit': X.burst(f.x, f.y, 'storm', 14, { sp: 4, up: 3, g: 3, life: 0.6, size: 3 }); X.ring(f.x, f.y, 'storm', 380, 40, 3); G.shake = { t: now, m: 3 }; break;
      case 'zs_spark': ADD('zs_spark', f, 500); X.burst(f.x, f.y, 'storm', 8, { sp: 3.5, up: 2.5, g: 3, life: 0.5, size: 2.4 }); break;
      case 'zs_die': DIE.push({ t: now, x: f.x, y: f.y, face: f.face }); X.burst(f.x, f.y, 'storm', 40, { sp: 6, up: 4, g: 2, life: 1.2, size: 3.4 }); X.ring(f.x, f.y, 'storm', 900, 120, 5); G.shake = { t: now, m: 8 }; break;
      default: break;
    }
  });

  const bolt = (c, x1, y1, x2, y2, seed, w, al) => {                                                    // rayo en zigzag
    const n = 9; c.beginPath(); c.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n; c.lineTo(x1 + (x2 - x1) * u + (hs(seed, i) - 0.5) * 26 * (1 - u * 0.4), y1 + (y2 - y1) * u); }
    c.lineTo(x2, y2); c.strokeStyle = `rgba(150,210,255,${0.55 * al})`; c.lineWidth = w * 3; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = `rgba(255,255,255,${al})`; c.lineWidth = w; c.stroke();
  };
  const inOlimpo = () => G.me && X.zoneAt(G.me.x, G.me.y).id === 'cueva_olimpo';

  /* ---- suelo: avisos, cuadros seguros, cielo oscuro de la tormenta ---- */
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'zs_mk') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = f.small ? 0.5 : 1;
        c.save(); c.fillStyle = `rgba(150,200,255,${(0.08 + 0.16 * p) * al})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (0.25 + 0.75 * p), '190,230,255', f.small ? 2 : 3, 0.9 * al); if (!f.small) ring(c, x, y, r, '255,255,255', 1.5, 0.5 + 0.4 * Math.sin(now / 60)); c.restore();
      } else if (b.k === 'zs_safe') {                                                  // cuadro seguro dorado
        const s = X.sxOf(f.x - 1), y = X.syOf(f.y - 1), w = 3 * TS, al = p > 0.92 ? (1 - p) / 0.08 : 1, pu = 0.5 + 0.5 * Math.sin(now / 240);
        c.save(); c.globalAlpha = al; c.fillStyle = `rgba(255,214,90,${0.38 + 0.18 * pu})`; c.fillRect(s, y, w, w);
        c.strokeStyle = `rgba(255,236,150,${0.8 + 0.2 * pu})`; c.lineWidth = 4; c.strokeRect(s + 2, y + 2, w - 4, w - 4); c.strokeStyle = 'rgba(120,80,0,.7)'; c.lineWidth = 1.5; c.strokeRect(s - 0.5, y - 0.5, w + 1, w + 1);
        c.globalCompositeOperation = 'lighter'; glow(c, s + w / 2, y + w / 2, w * 0.8, '255,225,120', 0.35 + 0.15 * pu);
        c.fillStyle = `rgba(255,245,200,${0.6 * al})`; for (let i = 0; i < 4; i++) { const u = (now / 900 + i / 4) % 1; c.fillRect(s + 6 + ((i * 29) % (w - 12)), y + w - u * w, 2, 2 + 3 * (1 - u)); }
        c.restore();
      } else if (b.k === 'zs_chs') {                                                   // aviso donde nacerá un trueno
        const x = px(f.x), y = py(f.y); c.save(); c.globalCompositeOperation = 'lighter'; ring(c, x, y, 40 * (1 - p) + 8, '170,220,255', 2.5, 0.8 * p); glow(c, x, y, 40, '170,220,255', 0.3 * p); c.restore();
      }
    }
  });

  /* ---- por encima: lanzamiento de Zeus, rayos, truenos perseguidores, chispas, tormenta, viento y muerte ---- */
  X.on('draw', (c, now, cw, ch) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'zs_cast') {                                                         // Zeus levanta el rayo: halo y anillos que convergen
        const e = G.ents.get(f.id); if (!e) continue;
        const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2 - 90, fade = p > 0.8 ? (1 - p) / 0.2 : 1, col = f.kind === 'tormenta' ? '255,235,150' : '150,210,255';
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 70 + 90 * p, col, 0.5 * fade);
        for (let k = 0; k < 3; k++) { const u = (now / 480 + k / 3) % 1; ring(c, x, y, 120 * (1 - u) + 12, col, 2.4, 0.7 * u * fade); }
        if (f.kind === 'tormenta') { c.fillStyle = `rgba(255,255,255,${0.6 * fade})`; for (let i = 0; i < 3; i++) bolt(c, x + (i - 1) * 40, y - 220, x + (i - 1) * 30, y + 60, now / 90 + i, 2, 0.5 * fade); }
        c.restore();
      } else if (b.k === 'zs_bolt') {                                                  // rayo que cae del cielo
        const x = px(f.x), y = py(f.y), al = 1 - p, sky = y - 420;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 6, (f.small ? 46 : 80) * (0.6 + p), '150,210,255', 0.8 * al);
        if (p < 0.55) { bolt(c, x + (hs(Math.round(f.x), Math.round(f.y)) - 0.5) * 20, sky, x, y, Math.round(now / 70) + f.x * 3, f.small ? 2 : 3.5, 1 - p / 0.55); }
        glow(c, x, y - 6, 24, '255,255,255', 0.9 * al); c.restore();
      } else if (b.k === 'zs_spark') {
        const x = px(f.x), y = py(f.y) - 14; c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { const a = hs(i, Math.round(now / 60)) * 6.28, L = 10 + 14 * (1 - p); c.strokeStyle = `rgba(210,240,255,${1 - p})`; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L * 0.8); c.stroke(); }
        c.restore();
      }
    }
    // truenos perseguidores: bola eléctrica que avanza con estela
    for (const [id, o] of CH) {
      const u = o.born && now < o.born ? 0 : Math.min(1, (now - o.t) / (o.T || 340)), gx = o.x0 + (o.x1 - o.x0) * u, gy = o.y0 + (o.y1 - o.y0) * u;
      if (o.born && now < o.born) continue;
      const x = px(gx), y = py(gy) - 10, r = 20 + 4 * Math.sin(now / 60);
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 58, '120,190,255', 0.55); glow(c, x, y, r, '255,255,255', 0.85);
      for (let i = 0; i < 5; i++) { const a = hs(i, Math.round(now / 50) + id.length) * 6.28; c.strokeStyle = 'rgba(200,235,255,.9)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 22); c.stroke(); }
      c.restore();
      if (Math.random() < 0.3) X.burst(gx, gy - 0.3, 'storm', 1, { sp: 1.5, up: 1, g: 2, life: 0.4, size: 2 });
    }
    // tormenta: cielo oscuro que se ilumina con relámpagos, y viento fuerte
    for (const b of AN) {
      if (b.k !== 'zs_storm') continue; const p = (now - b.t) / b.T; if (p >= 1) continue; const f = b.f, warn = Math.min(1, (now - b.t) / f.w), tail = p > 0.9 ? (1 - p) / 0.1 : 1;
      c.save(); c.fillStyle = `rgba(14,20,50,${0.38 * warn * tail})`; c.fillRect(0, 0, cw, ch);
      if (now - b.t > f.w && hs(Math.round(now / 90), 3) < 0.35) { c.fillStyle = 'rgba(220,235,255,.14)'; c.fillRect(0, 0, cw, ch); }
      c.restore();
    }
    if (inOlimpo()) {                                                                  // viento del Olimpo: rachas y jirones de nube que cruzan la pantalla
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const sp = 220 + hs(i, 1) * 260, x = ((now / 1000 * sp + hs(i, 2) * cw * 1.4) % (cw * 1.4)) - cw * 0.2, y = hs(i, 3) * ch, L = 40 + hs(i, 4) * 90;
        c.strokeStyle = `rgba(235,246,255,${0.1 + hs(i, 5) * 0.12})`; c.lineWidth = 1 + hs(i, 6) * 1.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + L * 0.5, y - 4 + Math.sin(now / 400 + i) * 5, x + L, y); c.stroke();
      }
      c.restore();
    }
    // lentitud por rayo: chispas azules en los pies
    for (const [id, until] of SLOW) {
      if (now > until) { SLOW.delete(id); continue; } const e = G.ents.get(id); if (!e) { SLOW.delete(id); continue; }
      const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 4; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 12, 24, '130,200,255', 0.28);
      c.strokeStyle = 'rgba(210,240,255,.8)'; c.lineWidth = 1.4; c.beginPath(); const a = hs(Math.round(now / 70), id.length || 1) * 6.28; c.moveTo(x, y - 10); c.lineTo(x + Math.cos(a) * 12, y - 10 + Math.sin(a) * 10); c.stroke(); c.restore();
    }
    // caída de Zeus: fotogramas de derrota y se apaga en destellos
    for (let i = DIE.length - 1; i >= 0; i--) {
      const d = DIE[i], age = now - d.t; if (age > 4200) { DIE.splice(i, 1); continue; }
      const S = X.sprReady() && X.SPR.zeus; if (!S) continue; const A = S.anim.death, fi = A[Math.min(3, Math.floor(age / 650))], x = px(d.x), y = py(d.y) + TS / 2 - 2;
      c.save(); c.globalAlpha = age > 3200 ? Math.max(0, 1 - (age - 3200) / 1000) : 1; { const fr = S.f[fi], w = fr[2], h = fr[3]; c.save(); c.imageSmoothingEnabled = true; c.translate(Math.round(x), Math.round(y)); if (d.face < 0) c.scale(-1, 1); c.drawImage(X.sprImg, fr[0], fr[1], w, h, -w / 2, -h, w, h); c.restore(); }
      c.globalCompositeOperation = 'lighter'; glow(c, x, y - 30, 80, '150,210,255', 0.3 * (1 - age / 4200)); c.restore();
    }
  });
})();
