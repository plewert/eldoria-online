'use strict';
/* Medusa, Reina de las Serpientes (solo visual): cueva de templo con columnas rotas, braseros y antorchas, mirada de piedra con
   zonas seguras de runas, piel de piedra, aparición, atracción, bola tóxica y muerte. Los dibujos vienen de medusa.png (atlas).
   Para quitarlo: borrar este archivo, medusa.png y su <script> (el jefe seguiría funcionando con el dibujo normal). */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const ATLAS = { f0: [0, 0, 32, 32], f1: [34, 0, 32, 32], f2: [68, 0, 32, 32], f3: [102, 0, 32, 32], w0: [136, 0, 32, 32], w1: [170, 0, 32, 32], w2: [204, 0, 32, 32], wf: [238, 0, 32, 32], wv: [272, 0, 32, 32], wr: [306, 0, 32, 32], pillar: [340, 0, 45, 83], brazier: [387, 0, 64, 66], torch: [453, 0, 42, 72], debris: [0, 85, 59, 45], debris2: [61, 85, 63, 57], runes: [126, 85, 66, 68], orb: [194, 85, 32, 28], meteor: [228, 85, 40, 40], burst: [270, 85, 124, 87] };
  const img = new Image(); let ready = false;
  img.onload = () => {                                                                             // los dibujos del atlas sustituyen a las losas de respaldo
    ready = true;
    const T = X.TEX; if (!T) return;
    const put = (cv, key) => { const r = ATLAS[key], g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false; g.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, cv.width, cv.height); };
    ['f0', 'f1', 'f2', 'f3'].forEach((k, i) => put(T.mdfloor[i], k));
    ['w0', 'w1', 'w2', 'w0', 'w1', 'wf', 'wv', 'wr'].forEach((k, i) => put(T.mdwall[i], k));
  };
  img.src = 'medusa.png';
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const hs = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.stroke(); };
  const spr = (c, k, x, y, w, h, al) => { if (!ready) return; const r = ATLAS[k]; if (al != null) c.globalAlpha = al; c.drawImage(img, r[0], r[1], r[2], r[3], x - w / 2, y - h / 2, w, h); if (al != null) c.globalAlpha = 1; };
  const st = (id) => { let s = X.zs.get(id); if (!s) { s = {}; X.zs.set(id, s); } return s; };
  const near = (x, y, d) => { const out = []; for (const e of G.ents.values()) if (e.t === 'medusa' && Math.hypot(e.x - x, e.y - y) <= d) out.push(e); return out; };
  const zid = () => (G.me ? X.zoneAt(G.me.x, G.me.y).id : '');
  const inCave = () => /cueva_medusa/.test(zid());
  const Q = () => (X.perf ? X.perf.q('ambiente') : 2);
  const AN = [], DIE = []; X.stone = new Map();
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T: T || f.T || 800, f });
  let flash = 0, flashT = 0;

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T) AN.splice(i, 1);
    if (f.k === 'd' && f.c === 'h') { for (const e of near(f.x, f.y, 1.6)) { const s = st(e.id); if (!(s.hurt > now)) s.hurt = now + 320; } return; }
    if (f.k === 's') { for (const e of near(f.x, f.y, 2.2)) st(e.id).atk = now + 460; return; }
    switch (f.k) {
      case 'md_cast': X.casts.set(f.id, now + Math.min(f.T, 1300) + 200); ADD('md_cast', f, f.T + 300); break;
      case 'md_gaze': ADD('md_gaze', f, f.T + 900); break;
      case 'md_flash': flash = 1; flashT = now; ADD('md_flash', f, 900); G.shake = { t: now, m: 6 }; X.burst(f.x, f.y, 'poison', 30, { sp: 6, up: 2, g: 1, life: 0.9, size: 3 }); break;
      case 'md_safe': X.burst(f.x, f.y, 'poison', 10, { sp: 2.5, up: 3, g: 1, life: 0.8, size: 2.4 }); X.ring(f.x, f.y, 'poison', 500, 36, 3); break;
      case 'md_stone': X.stone.set(f.i, now + f.ms); ADD('md_stone', f, f.ms); X.burst(f.x, f.y, 'stone', 22, { sp: 3.5, up: 3, g: 5, life: 0.9, size: 2.8 }); X.ring(f.x, f.y, 'stone', 600, 46, 4); break;
      case 'md_skin': st(f.id).skin = now + f.T; ADD('md_skin', f, f.T); X.burst(f.x, f.y, 'stone', 24, { sp: 4, up: 3, g: 5, life: 1, size: 3 }); break;
      case 'md_unskin': st(f.id).skin = 0; X.burst(f.x, f.y, 'stone', 40, { sp: 6, up: 4, g: 6, life: 1.1, size: 3.4 }); X.ring(f.x, f.y, 'stone', 700, 80, 4); G.shake = { t: now, m: 5 }; break;
      case 'md_ping': X.burst(f.x, f.y, 'stone', 5, { sp: 2.5, up: 2, g: 5, life: 0.5, size: 2.4 }); break;
      case 'md_pull': ADD('md_pull', f, f.T); break;
      case 'md_tug': X.burst(f.x, f.y, 'poison', 3, { sp: 1.5, up: 1, g: 1, life: 0.4, size: 2 }); break;
      case 'md_orb': ADD('md_orb', f, f.T + 200); break;
      case 'md_boom': ADD('md_boom', f, 900); G.shake = { t: now, m: 5 }; X.burst(f.x, f.y - 2.5, 'poison', 40, { sp: 6, up: 2, g: 4, life: 1.2, size: 3.2 }); break;
      case 'md_mk': ADD('md_mk', f); break;
      case 'md_splash': ADD('md_splash', f, 700); X.burst(f.x, f.y, 'poison', 18, { sp: 4, up: 4, g: 3, life: 0.8, size: 3 }); X.ring(f.x, f.y, 'poison', 420, 52, 3); G.shake = { t: now, m: 3 }; break;
      case 'md_vanish': st(f.id).hide = now + 6000; ADD('md_smoke', f, 900); X.burst(f.x, f.y, 'stone', 20, { sp: 4, up: 3, g: 2, life: 0.9, size: 3 }); break;
      case 'md_appear': st(f.id).hide = 0; ADD('md_smoke', f, 900); X.burst(f.x, f.y, 'poison', 24, { sp: 5, up: 3, g: 2, life: 0.8, size: 3.2 }); X.ring(f.x, f.y, 'poison', 520, f.r * 32, 4); G.shake = { t: now, m: 6 }; break;
      case 'md_die': DIE.push({ t: now, x: f.x, y: f.y, face: f.face }); X.burst(f.x, f.y, 'poison', 46, { sp: 6, up: 5, g: 2, life: 1.3, size: 3.6 }); X.ring(f.x, f.y, 'poison', 900, 120, 5); G.shake = { t: now, m: 8 }; break;
      default: break;
    }
  });

  /* ---------- decorado de la cueva: columnas, braseros, antorchas y escombros ---------- */
  const TILE = { MDF: 45, MDW: 46, MDP: 47, MDB: 48 };
  X.on('under', (c, now, cw, ch) => {
    const TS = X.TS, me = G.me; if (!me || !G.tiles) return;
    const cave = inCave(), gz = zid();
    if (cave && ready) {
      const hx = Math.ceil(cw / TS / 2) + 2, hy = Math.ceil(ch / TS / 2) + 3;
      const z = X.zoneAt(me.x, me.y), R = z && z.rect;
      for (let y = Math.floor(G.cam.y) - hy; y <= Math.ceil(G.cam.y) + hy; y++) for (let x = Math.floor(G.cam.x) - hx; x <= Math.ceil(G.cam.x) + hx; x++) {
        if (x < 0 || y < 0 || x >= G.W || y >= G.H) continue;
        const t = G.tiles[y * G.W + x]; if (t < 45 || t > 48) continue;
        const cx = px(x), by = X.syOf(y) + TS - 2;
        if (t === TILE.MDP) { c.save(); c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(cx, by - 1, TS * 0.45, TS * 0.17, 0, 0, 7); c.fill(); c.restore(); spr(c, 'pillar', cx, by - TS * 0.88, TS * 0.95, TS * 1.75); }
        else if (t === TILE.MDB) {
          spr(c, 'brazier', cx, by - TS * 0.45, TS * 1.05, TS * 1.08);
          const fl = 0.7 + 0.3 * Math.sin(now / 110 + x * 3 + y); c.save(); c.globalCompositeOperation = 'lighter';
          glow(c, cx, by - TS * 0.7, 36 + 6 * fl, '120,255,140', 0.32 * fl); glow(c, cx, by - TS * 0.62, 14, '230,255,170', 0.6 * fl);
          c.fillStyle = `rgba(150,255,150,${0.75 * fl})`; c.beginPath(); c.moveTo(cx - 7, by - TS * 0.5); c.quadraticCurveTo(cx - 4, by - TS * 1.0 - 5 * fl, cx + Math.sin(now / 130 + x) * 2, by - TS * 1.2 - 6 * fl); c.quadraticCurveTo(cx + 5, by - TS * 0.95, cx + 7, by - TS * 0.5); c.fill(); c.restore();
        } else if (t === TILE.MDF && Q() >= 1 && hs(x, y) > 0.955) spr(c, hs(y, x) > 0.5 ? 'debris' : 'debris2', cx + (hs(x + 3, y) - 0.5) * 10, by - 6, TS * 0.7, TS * 0.55);
      }
      if (R) for (const dx of [5, 10, 15, 20, 25, 30]) {                                                  // antorchas en el muro del fondo
        const tx = R[0] + dx, ty = R[1] + 1; if (Math.abs(tx - G.cam.x) > hx || Math.abs(ty - G.cam.y) > hy) continue;
        const cx = px(tx), by = X.syOf(ty) + TS - 3, fl = 0.7 + 0.3 * Math.sin(now / 120 + dx);
        spr(c, 'torch', cx, by - TS * 0.7, TS * 0.62, TS * 1.06);
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, cx, by - TS * 1.05, 62 + 8 * fl, '255,170,70', 0.3 * fl); glow(c, cx, by - TS * 0.95, 16, '255,230,150', 0.5 * fl); c.restore();
      }
    }
    for (const b of AN) {                                                                              // avisos en el suelo
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'md_gaze') {                                                                         // zonas seguras: círculos de runas
        const T0 = f.T, q = Math.min(1, (now - b.t) / T0), fadeOut = (now - b.t) > T0 ? Math.max(0, 1 - ((now - b.t) - T0) / 900) : 1;
        for (const zn of f.zones) {
          const x = px(zn.x), y = py(zn.y), r = zn.r * X.TS, pu = 0.5 + 0.5 * Math.sin(now / 160);
          c.save(); c.globalAlpha = fadeOut; const g = c.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, 'rgba(160,255,190,.34)'); g.addColorStop(0.75, 'rgba(70,230,130,.22)'); g.addColorStop(1, 'rgba(60,230,120,.04)');
          c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
          c.globalCompositeOperation = 'lighter'; ring(c, x, y, r, '90,255,160', 3.5, 0.95); ring(c, x, y, r * 0.72, '60,255,130', 2, 0.65 + 0.3 * pu);
          for (let i = 0; i < 8; i++) { const a = now / 1400 + i * 0.785, rx = x + Math.cos(a) * r * 0.86, ry = y + Math.sin(a) * r * 0.86 * 0.8; c.fillStyle = `rgba(210,255,225,${0.7 + 0.3 * pu})`; c.save(); c.translate(rx, ry); c.rotate(a + 1.57); c.fillRect(-1.5, -5, 3, 10); c.fillRect(-4, -1, 8, 2); c.restore(); }
          glow(c, x, y, r * 0.8, '110,255,170', 0.18 + 0.12 * pu); c.restore();
          c.save(); c.globalAlpha = fadeOut; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(230,255,235,.95)'; c.strokeStyle = 'rgba(0,40,10,.9)'; c.lineWidth = 3; c.strokeText('ZONA SEGURA', x, y + 4); c.fillText('ZONA SEGURA', x, y + 4); c.restore();
        }
      } else if (b.k === 'md_mk') {                                                                    // aviso de salpicadura / aparición
        const x = px(f.x), y = py(f.y), r = f.r * X.TS, col = f.stone ? '190,200,190' : '120,255,90';
        c.save(); c.fillStyle = `rgba(${f.stone ? '120,140,125' : '70,200,40'},${0.1 + 0.2 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r * (0.25 + 0.75 * p), col, 3, 0.9); ring(c, x, y, r, col, 1.6, 0.5 + 0.4 * Math.sin(now / 60)); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 0.9, col, 0.22 * p); c.restore();
      } else if (b.k === 'md_pull') {                                                                  // remolino de atracción
        const e = [...G.ents.values()].find((q) => q.id === f.id); if (!e) continue; const x = X.sxOf(e.rx) + X.TS / 2, y = X.syOf(e.ry) + X.TS / 2, al = p > 0.85 ? (1 - p) / 0.15 : Math.min(1, p / 0.15);
        c.save(); c.globalAlpha = al; c.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) { const u = (now / 650 + k / 4) % 1; ring(c, x, y, f.r * X.TS * (1 - u) + 14, '120,255,170', 2.6, 0.75 * u); }
        for (let i = 0; i < 14; i++) { const a = now / 500 + i * 0.45, rr = f.r * X.TS * (0.25 + 0.75 * ((now / 900 + i * 0.07) % 1)); c.fillStyle = 'rgba(180,255,210,.85)'; c.fillRect(x + Math.cos(a) * rr - 2, y + Math.sin(a) * rr * 0.8 - 2, 4, 4); }
        c.restore();
      }
    }
  });

  /* ---------- por encima ---------- */
  X.on('draw', (c, now, cw, ch) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'md_cast' || b.k === 'md_gaze') {                                                    // halo verde y serpientes brillantes sobre Medusa
        const e = G.ents.get(f.id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2 - 120, gaze = b.k === 'md_gaze';
        const k = gaze ? Math.min(1, (now - b.t) / f.T) : 1, fade = p > 0.8 ? (1 - p) / 0.2 : 1;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, (gaze ? 60 + 110 * k : 70 + 80 * p), gaze ? '140,255,120' : '120,255,170', (gaze ? 0.25 + 0.4 * k : 0.45) * fade);
        if (gaze) {
          for (let i = 0; i < 9; i++) { const a = -1.57 + (i - 4) * 0.38, L = 30 + 26 * k + 8 * Math.sin(now / 90 + i); c.strokeStyle = `rgba(190,255,150,${(0.3 + 0.6 * k) * fade})`; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 14); c.quadraticCurveTo(x + Math.cos(a) * L * 0.6 + Math.sin(now / 80 + i) * 6, y + Math.sin(a) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke(); }
          glow(c, x - 8, y + 18, 10 + 12 * k, '255,255,170', 0.5 * k * fade); glow(c, x + 8, y + 18, 10 + 12 * k, '255,255,170', 0.5 * k * fade);          // los ojos
          c.fillStyle = `rgba(20,70,30,${0.16 * k})`; c.fillRect(0, 0, cw, ch);
        } else for (let k2 = 0; k2 < 3; k2++) { const u = (now / 480 + k2 / 3) % 1; ring(c, x, y, 110 * (1 - u) + 12, '120,255,170', 2.4, 0.7 * u * fade); }
        c.restore();
      } else if (b.k === 'md_skin') {                                                                  // polvo de piedra girando alrededor
        const e = G.ents.get(f.id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS / 2 - 50, al = p > 0.9 ? (1 - p) / 0.1 : 1;
        c.save(); c.globalAlpha = al; for (let i = 0; i < 12; i++) { const a = now / 520 + i * 0.52, r = 58 + 10 * Math.sin(now / 300 + i); c.fillStyle = i % 2 ? '#b9c0bb' : '#7d857f'; c.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r * 0.9 - 2, 4, 4); }
        c.fillStyle = 'rgba(190,200,195,.8)'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('🗿 INMUNE ' + Math.ceil((1 - p) * f.T / 1000) + 's', x, y - 62); c.restore();
      } else if (b.k === 'md_orb') {                                                                   // la bola sube en espiral
        const e = G.ents.get(f.id); const sx = e ? X.sxOf(e.rx) + TS / 2 : px(f.x), sy = (e ? X.syOf(e.ry) + TS / 2 : py(f.y)) - 70, u = Math.min(1, p / 0.85), h = 30 + 200 * u * u;
        const x = sx + Math.sin(u * 6) * 8, y = sy - h;
        c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 6; i >= 1; i--) glow(c, x - Math.sin(u * 6 - i * 0.2) * 0, y + i * 9, 12 + i, '90,255,90', 0.08 * (7 - i));
        glow(c, x, y, 40, '110,255,110', 0.55); c.restore(); spr(c, 'orb', x, y, 40 + 8 * Math.sin(now / 70), 36);
      } else if (b.k === 'md_boom') {                                                                  // explosión en el aire
        const e = near(f.x, f.y, 3)[0], x = e ? X.sxOf(e.rx) + TS / 2 : px(f.x), y = (e ? X.syOf(e.ry) + TS / 2 : py(f.y)) - 70 - 230, al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; spr(c, 'burst', x, y, 230 * (0.4 + 0.9 * p), 160 * (0.4 + 0.9 * p), al); ring(c, x, y, 260 * p, '150,255,120', 4 * al + 1, 0.8 * al); c.restore();
      } else if (b.k === 'md_mk') {                                                                    // gotas que caen del cielo sobre cada marca
        const x = px(f.x), y = py(f.y), u = Math.min(1, p * 1.15); if (u >= 1 || f.stone) continue;
        const yy = y - (1 - u * u) * 260; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, yy, 22, '110,255,90', 0.55 * (0.4 + u)); c.restore(); spr(c, 'meteor', x - 6, yy - 6, 26, 26, 0.9);
      } else if (b.k === 'md_splash') {                                                                // salpicadura verde
        const x = px(f.x), y = py(f.y), al = 1 - p; c.save(); c.globalCompositeOperation = 'lighter'; spr(c, 'burst', x, y - 10, 120 * (0.5 + 0.7 * p), 84 * (0.5 + 0.7 * p), al); glow(c, x, y, 70 * (0.6 + p), '90,255,80', 0.4 * al); c.restore();
      } else if (b.k === 'md_stone') {                                                                 // estatua: barra de tiempo y polvo sobre el jugador
        const e = G.ents.get(f.i); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) - 14, left = 1 - p;
        c.save(); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 15, y - 4, 30, 6); c.fillStyle = '#a9b3ad'; c.fillRect(x - 14, y - 3, 28 * left, 4);
        c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText('🗿', x, y - 8); c.restore();
      } else if (b.k === 'md_smoke') {                                                                 // humo gris-verde al desaparecer o aparecer
        const x = px(f.x), y = py(f.y) - 30, al = 1 - p;
        c.save(); for (let i = 0; i < 8; i++) { const a = i * 0.79 + p * 2, r = 12 + 40 * p; c.fillStyle = `rgba(40,70,50,${0.5 * al})`; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7 - p * 30, 14 + 8 * p, 0, 7); c.fill(); }
        c.globalCompositeOperation = 'lighter'; glow(c, x, y, 70 * (1 - p * 0.4), '110,255,140', 0.4 * al); c.restore();
      }
    }
    if (flash > 0) {                                                                                   // destello de la mirada
      const a = Math.max(0, 1 - (now - flashT) / 520); if (a > 0) { c.save(); c.fillStyle = `rgba(220,255,225,${0.6 * a})`; c.fillRect(0, 0, cw, ch); c.restore(); } else flash = 0;
    }
    // estatuas: polvo gris y aura de piedra sobre los petrificados
    for (const [id, until] of X.stone) {
      if (until <= now) { X.stone.delete(id); continue; }
      const e = G.ents.get(id); if (!e) continue; const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS / 2;
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 26, '200,210,205', 0.12); c.restore();
    }
    // ambiente en la cueva: niebla verde que respira y viñeta oscura
    if (inCave()) {
      const t = now / 1000, q = Q();
      if (q >= 1) {
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < (q >= 2 ? 9 : 4); i++) { const x = ((t * (14 + hs(i, 1) * 16) + hs(i, 2) * cw * 1.3) % (cw * 1.3)) - cw * 0.15, y = hs(i, 3) * ch, r = 130 + hs(i, 4) * 120; glow(c, x, y, r, '70,200,110', 0.05 + 0.03 * Math.sin(t + i)); }
        c.restore();
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.0) * Math.sin(t * 0.43 + 1), g = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * (0.3 - 0.03 * pulse), cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
      g.addColorStop(0, 'rgba(0,20,6,0)'); g.addColorStop(1, `rgba(2,22,8,${0.55 + 0.1 * pulse})`); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    // caída de Medusa: se desploma y se desvanece
    for (let i = DIE.length - 1; i >= 0; i--) {
      const d = DIE[i], age = now - d.t; if (age > 4600) { DIE.splice(i, 1); continue; }
      const S = X.sprReady() && X.SPR.medusa; if (!S) continue; const fi = S.anim.death[Math.min(S.anim.death.length - 1, Math.floor(age / 1100))], x = px(d.x), y = py(d.y) + TS / 2 - 2;
      c.save(); c.globalAlpha = age > 3000 ? Math.max(0, 1 - (age - 3000) / 1500) : 1;
      { const fr = S.f[fi], w = fr[2], h = fr[3]; c.save(); c.imageSmoothingEnabled = true; c.translate(Math.round(x), Math.round(y)); if (d.face < 0) c.scale(-1, 1); c.beginPath(); c.rect(-w / 2, -h, w, h + 4); c.clip(); c.drawImage(X.sprImg, fr[0], fr[1], w, h, -w / 2, -h + 2, w, h); c.restore(); }
      c.globalCompositeOperation = 'lighter'; glow(c, x, y - 40, 90, '110,255,140', 0.4 * (1 - age / 4600)); c.restore();
    }
  });
})();
