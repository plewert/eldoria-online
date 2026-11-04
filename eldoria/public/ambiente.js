'use strict';
/* Ambiente (solo visual, en el cliente): clima por región (nieve en zonas frías, tormenta de arena en el desierto, niebla en el pantano,
   ceniza en el Inframundo), charcos con reflejos bajo la lluvia, estaciones (hojas en otoño, flores en primavera, nieve en invierno),
   animales ambientales (pájaros, mariposas, peces que saltan), faroles, puentes, barandas y arcos de entrada de las cuevas.
   Se apaga con F6 (localStorage "eldoria.ambiente"). Para quitarlo: borrar este archivo y su <script>. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X, TS = 32;
  let ONu = true; try { ONu = localStorage.getItem('eldoria.ambiente') !== '0'; } catch (e) { /* sin storage */ }
  const Q = () => (ONu ? (X.perf ? X.perf.q('ambiente') : 2) : 0);
  const hs = (x, y, k = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hour = () => (X.env ? X.env.hour() : 12);
  const nightK = () => { const h = hour(); return h >= 12 ? smooth(17.5, 20.5, h) : 1 - smooth(5, 7.5, h); };
  const lowPower = () => Q() < 2 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (window.EldSafe && window.EldSafe.on && window.EldSafe.on());
  const tileAt = (x, y) => (x < 0 || y < 0 || x >= G.W || y >= G.H ? -1 : G.tiles[y * G.W + x]);
  const sxOf = (x, cw) => (x - G.cam.x) * TS + cw / 2 - TS / 2, syOf = (y, ch) => (y - G.cam.y) * TS + ch / 2 - TS / 2;

  /* ---------- estaciones (por el calendario real, igual para todos) ---------- */
  X.season = () => { let o = null; try { o = localStorage.getItem('eldoria.season'); } catch (e) { /* nada */ } if (o) return o; const m = new Date().getMonth(); return m === 11 || m < 2 ? 'invierno' : m < 5 ? 'primavera' : m < 8 ? 'verano' : 'otoño'; };

  /* ---------- clima por región ---------- */
  const COLD = new Set(['cumbres', 'montana_alta', 'nubes_reino']), DESERT = new Set(['dunas', 'desierto_piramides']), SWAMP = new Set(['pantano']), ASH = new Set(['inframundo', 'volcan']);
  const SLOT = 4 * 60 * 1000;
  function regional(zid) {                                   // { k: tipo, v: intensidad 0..1 } según región y reloj real
    const now = Date.now(), s = Math.floor(now / SLOT), f = (now % SLOT) / SLOT, edge = Math.min(1, f / 0.1, (1 - f) / 0.1), r = hs(s, zid.length);
    if (COLD.has(zid)) return r < 0.6 ? { k: 'snow', v: edge * (0.5 + 0.5 * hs(s, 3)) } : null;
    if (DESERT.has(zid)) return r < 0.4 ? { k: 'sand', v: edge * (0.5 + 0.5 * hs(s, 4)) } : null;
    if (SWAMP.has(zid)) return r < 0.65 ? { k: 'fog', v: edge * (0.6 + 0.4 * hs(s, 5)) } : null;
    if (ASH.has(zid)) return { k: 'ash', v: 0.7 };
    return null;
  }
  const seasonal = (zk, zid) => {                           // lo que cae del cielo según la estación en zonas abiertas
    if (zk === 'dungeon' || DESERT.has(zid) || COLD.has(zid) || ASH.has(zid)) return null;
    const s = X.season();
    return s === 'otoño' ? { k: 'leaf', v: 0.45 } : s === 'primavera' ? { k: 'petal', v: 0.35 } : s === 'invierno' ? { k: 'snow', v: 0.4 } : null;
  };
  let parts = [], fogBlobs = null;
  const COL = { leaf: ['#c8571f', '#d98a1f', '#a83a14', '#d9b030'], petal: ['#ffd0e0', '#fff', '#f8b0c8'] };
  function spawn(kind, cw, ch, W) {
    const side = kind === 'sand' ? 0 : Math.random() * cw;
    const p = { k: kind, x: kind === 'sand' ? -20 : side, y: kind === 'sand' ? Math.random() * ch : -10, s: Math.random(), vy: 0, vx: 0, r: Math.random() * 6 };
    if (kind === 'snow') { p.vy = 50 + p.s * 60; p.vx = (X.env && X.env.weather().kind ? 0 : 0); }
    else if (kind === 'leaf') { p.vy = 40 + p.s * 40; p.col = COL.leaf[(Math.random() * 4) | 0]; }
    else if (kind === 'petal') { p.vy = 30 + p.s * 30; p.col = COL.petal[(Math.random() * 3) | 0]; }
    else if (kind === 'sand') { p.vx = 520 + p.s * 380; p.vy = 40 + p.s * 40; }
    else if (kind === 'ash') { p.vy = 30 + p.s * 40; p.col = Math.random() < 0.5 ? '255,140,60' : '120,110,110'; }
    return p;
  }
  function drawWeather(c, now, cw, ch, dt, zid, zk) {
    const wl = regional(zid) || seasonal(zk, zid); const low = lowPower();
    const want = wl ? Math.round((low ? 40 : 90) * wl.v * (wl.k === 'sand' ? 1.8 : 1)) : 0;
    const kind = wl ? wl.k : null;
    parts = parts.filter((p) => p.k === kind);
    while (parts.length < want && kind && kind !== 'fog') parts.push(spawn(kind, cw, ch));
    if (parts.length > want) parts.length = want;
    c.save();
    if (kind === 'fog') {
      if (!fogBlobs) { fogBlobs = document.createElement('canvas'); fogBlobs.width = fogBlobs.height = 128; const g = fogBlobs.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(210,225,215,.55)'); gr.addColorStop(1, 'rgba(210,225,215,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
      c.globalAlpha = 0.55 * wl.v;
      for (let i = 0; i < 7; i++) { const x = ((now / (70 + i * 19) + i * 260) % (cw + 700)) - 350, y = ch * (0.1 + 0.13 * i) + Math.sin(now / 2600 + i) * 24; c.drawImage(fogBlobs, x - 300, y - 300, 600, 600); }
      c.globalAlpha = 1; c.fillStyle = `rgba(190,205,195,${0.1 * wl.v})`; c.fillRect(0, 0, cw, ch);
    } else if (kind === 'sand') {
      c.fillStyle = `rgba(214,170,96,${0.2 * wl.v})`; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(236,208,150,.55)'; c.lineWidth = 1.2; c.beginPath();
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x > cw + 40) { p.x = -40; p.y = Math.random() * ch; } c.moveTo(p.x, p.y); c.lineTo(p.x - 18 - p.s * 20, p.y - 3); }
      c.stroke();
    } else if (kind === 'snow') {
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (const p of parts) { p.y += p.vy * dt; p.x += Math.sin(now / 800 + p.r) * 16 * dt; if (p.y > ch) { p.y = -6; p.x = Math.random() * cw; } c.fillRect(p.x, p.y, 2 + p.s * 1.5, 2 + p.s * 1.5); }
      if (zk !== 'dungeon' && !COLD.has(zid)) { c.fillStyle = `rgba(230,240,255,${0.05 * wl.v})`; c.fillRect(0, 0, cw, ch); }
    } else if (kind === 'ash') {
      c.globalCompositeOperation = 'lighter';
      for (const p of parts) { p.y += p.vy * dt; p.x += Math.sin(now / 900 + p.r) * 12 * dt; if (p.y > ch) { p.y = -6; p.x = Math.random() * cw; } c.fillStyle = `rgba(${p.col},.55)`; c.fillRect(p.x, p.y, 1.8 + p.s * 1.6, 1.8 + p.s * 1.6); }
    } else if (kind === 'leaf' || kind === 'petal') {
      for (const p of parts) {
        p.y += p.vy * dt; p.x += Math.sin(now / 600 + p.r) * 26 * dt + 10 * dt; if (p.y > ch + 8) { p.y = -8; p.x = Math.random() * cw; }
        c.save(); c.translate(p.x, p.y); c.rotate(now / 500 + p.r); c.fillStyle = p.col; c.fillRect(-3, -1.5, kind === 'leaf' ? 6 : 4, kind === 'leaf' ? 3 : 2.4); c.restore();
      }
    }
    c.restore();
  }

  /* ---------- suelo: charcos, hojas, flores, nieve (solo casillas visibles) ---------- */
  function drawGround(c, now, cw, ch, zk, zid) {
    if (zk === 'dungeon') return;
    const W = X.env ? X.env.weather() : { kind: null, k: 0 }, wet = W.kind === 'rain' && !DESERT.has(zid) && !COLD.has(zid) ? W.k : 0, season = X.season(), night = nightK();
    const x0 = Math.floor(G.cam.x - cw / 2 / TS) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / TS) + 1, y0 = Math.floor(G.cam.y - ch / 2 / TS) - 1, y1 = Math.ceil(G.cam.y + ch / 2 / TS) + 1;
    const noGround = DESERT.has(zid) || ASH.has(zid);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = tileAt(x, y); if (t < 0) continue;
      const h = hs(x, y, 11), X0 = sxOf(x, cw), Y0 = syOf(y, ch);
      if (wet > 0.15 && (t === 3 || t === 0) && h < 0.1 + 0.1 * wet) {                 // charco con reflejo y ondas
        c.fillStyle = `rgba(70,100,140,${0.45 * wet})`; c.beginPath(); c.ellipse(X0 + 16, Y0 + 20, 11, 5.5, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(200,225,255,${0.5 * wet})`; c.lineWidth = 1; c.beginPath(); c.ellipse(X0 + 14, Y0 + 19, 6, 2.5, 0, 0, 7); c.stroke();
        const k = (now / 900 + h * 5) % 1; c.strokeStyle = `rgba(220,235,255,${(1 - k) * 0.6 * wet})`; c.beginPath(); c.ellipse(X0 + 16 + (h - 0.05) * 30, Y0 + 20, 2 + k * 7, 1 + k * 3, 0, 0, 7); c.stroke();
        c.fillStyle = `rgba(255,230,170,${0.25 * wet * (0.4 + night)})`; c.fillRect(X0 + 11, Y0 + 17, 10, 2);       // reflejo de la luz
      }
      if (noGround) continue;
      if (season === 'otoño' && (t === 0 || t === 3) && h > 0.9) { c.fillStyle = ['#c8571f', '#d98a1f', '#a83a14'][(h * 30 | 0) % 3]; for (let i = 0; i < 4; i++) c.fillRect(X0 + 6 + hs(x, y, i) * 18, Y0 + 8 + hs(y, x, i) * 18, 4, 2.4); }
      else if (season === 'primavera' && (t === 0 || t === 8) && h > 0.88) { const cx = X0 + 8 + hs(x, y, 3) * 16, cy = Y0 + 10 + hs(x, y, 4) * 14; c.fillStyle = '#3c7a30'; c.fillRect(cx, cy, 1.5, 6); c.fillStyle = ['#ff7aa8', '#ffe35a', '#fff', '#b58cff'][(h * 40 | 0) % 4]; c.fillRect(cx - 2, cy - 3, 5.5, 4); c.fillStyle = '#ffd54a'; c.fillRect(cx, cy - 2, 1.8, 1.8); }
      else if (season === 'invierno' && (t === 0 || t === 3 || t === 8) && h > 0.78) { c.fillStyle = `rgba(245,250,255,${0.55 + 0.3 * hs(x, y, 6)})`; c.beginPath(); c.ellipse(X0 + 16 + (h - 0.9) * 40, Y0 + 18, 9 + hs(x, y, 7) * 6, 5, 0, 0, 7); c.fill(); }
    }
  }

  function drawGroundLite(c, now, cw, ch, zk, zid) {            // perfil medio: solo charcos (sin hojas, flores ni nieve en el suelo)
    if (zk === 'dungeon') return;
    const W = X.env ? X.env.weather() : { kind: null, k: 0 }, wet = W.kind === 'rain' && !DESERT.has(zid) && !COLD.has(zid) ? W.k : 0; if (wet < 0.2) return;
    const x0 = Math.floor(G.cam.x - cw / 2 / TS) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / TS) + 1, y0 = Math.floor(G.cam.y - ch / 2 / TS) - 1, y1 = Math.ceil(G.cam.y + ch / 2 / TS) + 1;
    c.fillStyle = `rgba(70,100,140,${0.4 * wet})`;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const t = tileAt(x, y); if ((t === 3 || t === 0) && hs(x, y, 11) < 0.1 + 0.1 * wet) { c.beginPath(); c.ellipse(sxOf(x, cw) + 16, syOf(y, ch) + 20, 11, 5.5, 0, 0, 7); c.fill(); } }
  }

  /* ---------- animales ambientales ---------- */
  const fled = new Map();
  const BIRD = ['#8a6a48', '#6a88b0', '#b05a4a', '#777'];
  const wild = (zk, zid) => zk !== 'dungeon' && zk !== 'town' && !DESERT.has(zid) && !ASH.has(zid);
  let fish = [], nextFish = 0;
  function drawAnimals(c, now, cw, ch, dt, zk, zid) {
    if (!wild(zk, zid)) return;
    const h = hour(), day = h > 7 && h < 18, season = X.season(), me = G.me, low = lowPower();
    const x0 = Math.floor((G.cam.x - cw / 2 / TS) / 5) - 1, x1 = Math.ceil((G.cam.x + cw / 2 / TS) / 5), y0 = Math.floor((G.cam.y - ch / 2 / TS) / 5) - 1, y1 = Math.ceil((G.cam.y + ch / 2 / TS) / 5);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const hb = hs(gx, gy, 21), hx = gx * 5 + 1 + hs(gx, gy, 22) * 3, hy = gy * 5 + 1 + hs(gx, gy, 23) * 3, tx = Math.round(hx), ty = Math.round(hy), t = tileAt(tx, ty);
      if (day && season !== 'invierno' && hb < 0.32 && (t === 0 || t === 8)) {                                   // pájaro posado que huye al acercarte
        const key = gx + ',' + gy, f = fled.get(key);
        if (!f && me && Math.hypot(me.x - hx, me.y - hy) < 3.2) fled.set(key, { t: now, dx: hx - me.x > 0 ? 1 : -1 });
        const F = fled.get(key);
        if (!F) { const X0 = (hx - G.cam.x) * TS + cw / 2, Y0 = (hy - G.cam.y) * TS + ch / 2, hop = Math.max(0, Math.sin(now / 340 + hb * 30)) > 0.97 ? 2 : 0; c.fillStyle = BIRD[(hb * 100 | 0) % 4]; c.fillRect(X0 - 3, Y0 - 4 - hop, 6, 4); c.fillStyle = '#d8b050'; c.fillRect(X0 + 3, Y0 - 3 - hop, 2, 1.5); c.fillStyle = '#222'; c.fillRect(X0 + 1, Y0 - 3.5 - hop, 1, 1); }
        else if (now - F.t < 2600) { const k = (now - F.t) / 2600, X0 = (hx - G.cam.x) * TS + cw / 2 + F.dx * k * 160, Y0 = (hy - G.cam.y) * TS + ch / 2 - k * 130, wing = Math.sin(now / 45) * 4; c.strokeStyle = BIRD[(hb * 100 | 0) % 4]; c.lineWidth = 2; c.beginPath(); c.moveTo(X0 - 6, Y0 - wing); c.lineTo(X0, Y0); c.lineTo(X0 + 6, Y0 - wing); c.stroke(); }
        else if (now - F.t > 40000) fled.delete(key);
      }
      if (day && hb > 0.5 && hb < (season === 'invierno' ? 0.5 : season === 'otoño' ? 0.58 : low ? 0.66 : 0.76) && (t === 0 || t === 8)) {     // mariposas
        const ph = now / 1000 + hb * 50, wx = hx + Math.sin(ph * 0.7) * 1.6, wy = hy + Math.sin(ph * 1.1 + 1) * 1.1;
        const X0 = (wx - G.cam.x) * TS + cw / 2, Y0 = (wy - G.cam.y) * TS + ch / 2 - 10 + Math.sin(ph * 3) * 3, fl = Math.abs(Math.sin(now / 90 + hb * 20));
        c.fillStyle = ['#ffb347', '#6ec6ff', '#fff27a', '#ff8fb8', '#c8a0ff'][(hb * 100 | 0) % 5]; c.fillRect(X0 - 4 * fl - 1, Y0 - 2, 4 * fl + 1, 4); c.fillRect(X0 + 1, Y0 - 2, 4 * fl + 1, 4); c.fillStyle = '#333'; c.fillRect(X0 - 0.5, Y0 - 2, 1.5, 5);
      }
    }
    if (now > nextFish) {                                                                               // pez que salta en el agua visible
      nextFish = now + 900 + Math.random() * 1800;
      for (let i = 0; i < 14; i++) { const x = Math.floor(G.cam.x - cw / 2 / TS + Math.random() * cw / TS), y = Math.floor(G.cam.y - ch / 2 / TS + Math.random() * ch / TS); if (tileAt(x, y) === 1) { fish.push({ x, y, t: now }); break; } }
    }
    fish = fish.filter((f) => now - f.t < 900);
    for (const f of fish) {
      const k = (now - f.t) / 900, X0 = (f.x - G.cam.x) * TS + cw / 2 + (k - 0.5) * 18, Y0 = (f.y - G.cam.y) * TS + ch / 2 - Math.sin(k * Math.PI) * 18;
      c.strokeStyle = `rgba(230,245,255,${0.7 * (1 - k)})`; c.lineWidth = 1; c.beginPath(); c.ellipse((f.x - G.cam.x) * TS + cw / 2, (f.y - G.cam.y) * TS + ch / 2 + 4, 4 + k * 12, 2 + k * 5, 0, 0, 7); c.stroke();
      c.save(); c.translate(X0, Y0); c.rotate((k - 0.5) * 2.4); c.fillStyle = '#7fb4d8'; c.beginPath(); c.ellipse(0, 0, 6, 2.8, 0, 0, 7); c.fill(); c.fillStyle = '#d6ecf8'; c.beginPath(); c.moveTo(-5, 0); c.lineTo(-9, -3); c.lineTo(-9, 3); c.fill(); c.restore();
    }
  }

  /* ---------- faroles, puentes, barandas y arcos de entrada ---------- */
  const glow = (c, x, y, r, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const nearDoor = (x, y) => (G.houses || []).some((h) => Math.abs(x - h[4]) <= 1 && Math.abs(y - h[3]) <= 2);
  function drawDeco(c, now, cw, ch, zk, zid) {
    const W = X.env ? X.env.weather() : { kind: null, k: 0 }, wet = W.kind === 'rain' ? W.k : 0, night = nightK();
    const x0 = Math.floor(G.cam.x - cw / 2 / TS) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / TS) + 1, y0 = Math.floor(G.cam.y - ch / 2 / TS) - 1, y1 = Math.ceil(G.cam.y + ch / 2 / TS) + 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = tileAt(x, y); if (t !== 3 && t !== 1) continue;
      const X0 = sxOf(x, cw), Y0 = syOf(y, ch);
      if (t === 3) {
        const n = tileAt(x, y - 1), s = tileAt(x, y + 1), w = tileAt(x - 1, y), e = tileAt(x + 1, y);
        if (n === 1 && s === 1 || w === 1 && e === 1) {                                                       // puente: tablones y barandas
          const horiz = w === 1 && e === 1 ? false : true;
          c.fillStyle = '#8a6238'; c.fillRect(X0, Y0, TS, TS); c.fillStyle = '#6a4626'; if (horiz) for (let i = 0; i < 4; i++) c.fillRect(X0, Y0 + i * 8 + 7, TS, 1.5); else for (let i = 0; i < 4; i++) c.fillRect(X0 + i * 8 + 7, Y0, 1.5, TS);
          c.fillStyle = '#4e3018'; if (horiz) { c.fillRect(X0, Y0, TS, 3); c.fillRect(X0, Y0 + TS - 3, TS, 3); } else { c.fillRect(X0, Y0, 3, TS); c.fillRect(X0 + TS - 3, Y0, 3, TS); }
          continue;
        }
        if (zk === 'town' && n === 4 && !nearDoor(x, y) && x % 5 === 1) {                                     // farol junto a la fachada
          const fx = X0 + TS - 5, fy = Y0 + TS - 3, on = night > 0.1, fl = (0.75 + Math.sin(now / 110 + x) * 0.12) * (1 - 0.8 * wet);
          c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(fx - 3, fy - 1, 8, 3); c.fillStyle = '#2c2a2e'; c.fillRect(fx - 1, fy - 20, 3, 20); c.fillRect(fx - 4, fy - 26, 9, 2); c.fillRect(fx - 4, fy - 20, 9, 2);
          c.fillStyle = on ? `rgba(255,${190 * fl | 0},90,1)` : 'rgba(120,120,110,.9)'; c.fillRect(fx - 3, fy - 24, 7, 4);
          if (on) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, fx, fy - 22, 56, '255,190,90', 0.4 * night * fl); c.restore(); }
        }
        // baranda de ribera: camino pegado al agua
        if (n === 1 && s !== 1) { c.fillStyle = '#6a4626'; c.fillRect(X0, Y0 + 1, TS, 2); for (let i = 0; i < 4; i++) c.fillRect(X0 + 2 + i * 9, Y0 - 3, 2.5, 7); }
        else if (s === 1 && n !== 1) { c.fillStyle = '#6a4626'; c.fillRect(X0, Y0 + TS - 3, TS, 2); for (let i = 0; i < 4; i++) c.fillRect(X0 + 2 + i * 9, Y0 + TS - 7, 2.5, 7); }
      }
    }
    for (const p of G.portals || []) {                                                                       // arco de piedra en las entradas
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const X0 = sxOf(p.x, cw), Y0 = syOf(p.y, ch);
      c.fillStyle = '#5b5f68'; c.fillRect(X0 - 1, Y0 + 2, 6, TS - 2); c.fillRect(X0 + TS - 5, Y0 + 2, 6, TS - 2); c.fillRect(X0 - 2, Y0 - 3, TS + 4, 7);
      c.fillStyle = '#7b808b'; c.fillRect(X0 - 2, Y0 - 3, TS + 4, 2); c.fillRect(X0 - 1, Y0 + 2, 2, TS - 2); c.fillRect(X0 + TS - 5, Y0 + 2, 2, TS - 2);
      c.fillStyle = '#3d4047'; for (let i = 0; i < 3; i++) { c.fillRect(X0, Y0 + 8 + i * 8, 4, 1); c.fillRect(X0 + TS - 4, Y0 + 8 + i * 8, 4, 1); }
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(150,170,255,${0.12 + 0.05 * Math.sin(now / 400 + p.x)})`; c.fillRect(X0 + 5, Y0 + 4, TS - 10, TS - 4); c.restore();
    }
  }

  X.on('under', (c, now, cw, ch) => {
    const q = Q(); if (!q || !G.me || !G.tiles) return;
    const z = X.zoneAt(G.me.x, G.me.y); if (!z) return;
    if (q >= 2) drawGround(c, now, cw, ch, z.kind, z.id); else drawGroundLite(c, now, cw, ch, z.kind, z.id);
    drawDeco(c, now, cw, ch, z.kind, z.id);
  });
  X.on('draw', (c, now, cw, ch, dt) => {
    const q = Q(); if (!q || !G.me || !G.tiles) return;
    const z = X.zoneAt(G.me.x, G.me.y); if (!z) return;
    if (q >= 2) drawAnimals(c, now, cw, ch, dt || 0.016, z.kind, z.id);
    if (z.kind !== 'dungeon' || z.id === 'inframundo') drawWeather(c, now, cw, ch, dt || 0.016, z.id, z.kind);
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'F6') { e.preventDefault(); ONu = !ONu; try { localStorage.setItem('eldoria.ambiente', ONu ? '1' : '0'); } catch (x) { /* nada */ } if (X.toast) X.toast(ONu ? 'Ambiente: activado (F6)' : 'Ambiente: desactivado (F6)'); } });
})();
