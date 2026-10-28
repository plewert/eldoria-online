'use strict';
/* Extras gráficos (solo visuales, en el cliente). Se controlan con el botón ✨ de efectos:
   nivel 1 (básico): huellas, polvo, golpes con peso, entrada de jefes, fases, subida de nivel y transiciones.
   nivel 2 (completo): + charcos y salpicaduras, nieve acumulada, espuma y brillos en el agua, hojas con viento,
                       ventanas encendidas de noche, auras del equipo y estela de capa.
   nivel 3 (cine): + reflejos de personajes en el agua y relámpagos dibujados. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $ } = X;
  const TS = 32;
  const T = { GRASS: 0, WATER: 1, ROAD: 3, ROCK: 7, FLOWER: 8, SHOP: 9, SAND: 11, SNOW: 12, SWAMP: 13, DUNE: 14, BOG: 23, HILL: 24, TREE: 2, PALM: 15, PINE: 16 };
  const lvl = () => (X.gfx ? X.gfx.level() : 2);
  const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  const tile = (x, y) => (x < 0 || y < 0 || x >= G.W || y >= G.H ? -1 : G.tiles[y * G.W + x]);
  const cen = (cw, ch, x, y) => [(x - G.cam.x) * TS + cw / 2, (y - G.cam.y) * TS + ch / 2];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const night = () => { const h = X.env ? X.env.hour() : 12; return h >= 12 ? smooth(17.5, 20.5, h) : 1 - smooth(5, 7.5, h); };
  const rgbOf = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '220,220,220'; const n = parseInt(m[1], 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };

  /* ---------- CSS de las tarjetas (entrada de jefe, nivel) ---------- */
  const css = document.createElement('style');
  css.textContent = `
.bossintro{position:absolute;inset:0;pointer-events:none;z-index:40;display:grid;place-items:center;overflow:hidden}
.bossintro .bar{position:absolute;left:0;right:0;height:0;background:#000;animation:biBar 2.6s ease-in-out forwards}
.bossintro .bar.t{top:0}.bossintro .bar.b{bottom:0}
.bossintro .tt{position:relative;text-align:center;color:#ffd9c8;text-shadow:0 0 18px #c03020,0 2px 0 #000;animation:biTxt 2.6s ease-out forwards;opacity:0}
.bossintro .tt b{display:block;font:800 clamp(22px,5vw,46px)/1.1 "Segoe UI",system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}
.bossintro .tt i{display:block;font:600 clamp(11px,2vw,15px)/1.6 "Segoe UI",sans-serif;letter-spacing:.5em;color:#ff9c80;text-transform:uppercase;margin-bottom:4px}
.bossintro .tt u{display:block;margin:8px auto 0;height:2px;width:0;background:linear-gradient(90deg,transparent,#ff8060,transparent);animation:biLine 2.6s ease-out forwards;text-decoration:none}
@keyframes biBar{0%{height:0}12%,82%{height:11%}100%{height:0}}
@keyframes biTxt{0%{opacity:0;letter-spacing:.5em;transform:scale(1.25)}18%{opacity:1;letter-spacing:.12em;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(.98)}}
@keyframes biLine{0%{width:0}25%{width:min(70%,420px)}100%{width:min(70%,420px)}}
.lvlup{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);pointer-events:none;z-index:40;text-align:center;animation:luTxt 2.4s ease-out forwards}
.lvlup b{display:block;font:800 clamp(26px,6vw,52px)/1 "Segoe UI",sans-serif;color:#ffe9a0;text-shadow:0 0 16px #e0a020,0 0 40px #e0a020,0 3px 0 #5a3a00;letter-spacing:.08em}
.lvlup i{display:block;font:600 13px "Segoe UI",sans-serif;color:#fff4cc;letter-spacing:.35em;text-transform:uppercase;margin-top:4px;text-shadow:0 1px 3px #000}
.lvlup::before{content:'';position:absolute;left:50%;top:50%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,220,120,.35) 0 6deg,transparent 6deg 18deg);-webkit-mask:radial-gradient(circle,#000 0,transparent 68%);mask:radial-gradient(circle,#000 0,transparent 68%);animation:luRays 2.4s linear forwards;z-index:-1}
@keyframes luTxt{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}24%{transform:translate(-50%,-50%) scale(1)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@keyframes luRays{0%{transform:rotate(0) scale(.4);opacity:0}15%{opacity:1}100%{transform:rotate(70deg) scale(1.1);opacity:0}}
.slot.r-plus::after,.slot.r-ancient::after,.slot.r-raid::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.38) 50%,transparent 62%);transform:translateX(-130%);animation:slotShine 3.6s ease-in-out infinite}
.slot.r-plus,.slot.r-ancient,.slot.r-raid{overflow:hidden}
.slot.r-ancient::after{animation-duration:2.6s}
.slot.r-raid{border-color:#b074ff;animation:raidGlow 2.2s ease-in-out infinite}
@keyframes slotShine{0%,55%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
@keyframes raidGlow{0%,100%{box-shadow:inset 0 0 0 1px rgba(176,116,255,.5),0 0 6px rgba(176,116,255,.35),inset 0 2px 5px rgba(0,0,0,.6)}50%{box-shadow:inset 0 0 0 1px rgba(255,214,120,.7),0 0 14px rgba(176,116,255,.7),inset 0 2px 5px rgba(0,0,0,.6)}}
@media (prefers-reduced-motion:reduce){.slot::after{animation:none!important}.slot.r-raid{animation:none}}`;
  document.head.append(css);
  const stage = () => $('#stage') || document.body;
  const card = (cls, html, ms) => { const d = el('div', cls); d.innerHTML = html; stage().append(d); setTimeout(() => d.remove(), ms); return d; };

  /* ---------- partículas propias (en casillas) ---------- */
  const P = [];
  const add = (x, y, vx, vy, life, size, col, o = {}) => { if (P.length < 400) P.push({ x, y, vx, vy, t: 0, life, size, col, add: !!o.add, g: o.g || 0, dr: o.dr || 0 }); };
  const stepParts = (c, cw, ch, dt) => {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt; if (p.t >= p.life) { P.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx += p.dr * dt;
      const [x, y] = cen(cw, ch, p.x, p.y), a = 1 - p.t / p.life;
      if (x < -20 || y < -20 || x > cw + 20 || y > ch + 20) continue;
      c.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      c.fillStyle = `rgba(${p.col},${0.8 * a})`; c.beginPath(); c.arc(x, y, p.size * (0.5 + a * 0.5), 0, 7); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  };

  /* ---------- estado ---------- */
  let last = performance.now(), pud = 0, snowAcc = 0, punch = 0, punchAt = 0, hurt = 0, flashW = 0, trAt = -1e9;
  const prints = [], splashes = [], leaves = [], pos = new Map(), phase = new Map(), seenBoss = new Set();
  let lastIntro = -1e9, lastMe = null, bolts = [];
  const doPunch = (k) => { punch = Math.max(punch, k); punchAt = performance.now(); };

  /* ---------- eventos ---------- */
  X.on('fx', (f) => {
    const now = performance.now();
    if (f.k === 'd') {
      const me = G.me;
      if (f.v === '¡CRÍTICO!') { doPunch(1); flashW = Math.max(flashW, 0.35); }
      if (me && f.c === 'p' && Math.abs(f.x - me.x) <= 1 && Math.abs(f.y - me.y) <= 1) {          // me golpean: destello rojo en los bordes
        const dmg = parseInt(f.v, 10) || 0, mx = (G.stats && G.stats.maxHp) || (me.H) || 100;
        hurt = Math.min(1, Math.max(hurt, 0.35 + dmg / Math.max(1, mx) * 3));
        if (dmg > mx * 0.18) doPunch(0.8);
      }
    }
    if (f.k === 'l' && G.me && Math.abs(f.x - G.me.x) <= 1 && Math.abs(f.y - G.me.y) <= 1) {       // subida de nivel
      const lv = G.stats ? G.stats.lv : '';
      card('lvlup', `<b>¡NIVEL ${lv}!</b><i>Has subido de nivel</i>`, 2500); doPunch(0.7);
    }
  });

  X.on('snap', (m) => {
    const now = performance.now(), L = lvl();
    // entradas y fases de jefes
    for (const e of G.ents.values()) {
      if (e.kind !== 'mo') continue;
      const d = G.mons[e.t]; if (!d || !d.boss) continue;
      if (!seenBoss.has(e.id)) {
        seenBoss.add(e.id);
        if (L >= 1 && G.me && Math.max(Math.abs(e.x - G.me.x), Math.abs(e.y - G.me.y)) <= 14 && now - lastIntro > 12000) {
          lastIntro = now; card('bossintro', `<div class="bar t"></div><div class="bar b"></div><div class="tt"><i>Jefe</i><b>${(d.name || '').replace(/[<>&]/g, '')}</b><u></u></div>`, 2700);
          doPunch(1); G.shake = { t: now, m: 8 }; X.bossVoice ? X.bossVoice(e.t) : X.sfx && X.sfx('boss'); X.ring(e.x, e.y, 'dark', 800, 90, 5); X.burst(e.x, e.y, 'dark', 30, { sp: 5, up: 2, g: 3, life: 0.9, size: 3.4 });
        }
      }
      const fr = e.H ? e.h / e.H : 1, ph = fr <= 0.25 ? 3 : fr <= 0.5 ? 2 : fr <= 0.75 ? 1 : 0, old = phase.get(e.id) || 0;
      if (ph > old && fr > 0) {
        phase.set(e.id, ph); G.texts.push({ x: e.x, y: e.y - 1.6, v: ph === 3 ? '¡FURIA!' : '¡Se enfurece!', c: 'p', t: now, dx: 0, big: true });
        X.ring(e.rx, e.ry, 'fire', 700, 80, 6); X.burst(e.rx, e.ry, 'fire', 36, { sp: 6, up: 3, g: 4, life: 0.9, size: 3.4 }); G.shake = { t: now, m: 9 }; doPunch(0.9); X.sfx && X.sfx('boss');
      } else if (!phase.has(e.id)) phase.set(e.id, ph);
    }
    // huellas, polvo y estela de capa
    if (L >= 1) for (const e of G.ents.values()) {
      const o = pos.get(e.id);
      if (!o) { pos.set(e.id, { x: e.x, y: e.y }); continue; }
      if (o.x === e.x && o.y === e.y) continue;
      const dx = e.x - o.x, dy = e.y - o.y, tl = tile(o.x, o.y), sub = tl === T.SAND || tl === T.DUNE || tl === T.SNOW || tl === T.SWAMP || tl === T.BOG;
      o.x = e.x; o.y = e.y;
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      const wx = e.x - dx, wy = e.y - dy;
      if (sub) prints.push({ x: wx, y: wy, dx, dy, t: performance.now(), k: tl === T.SNOW ? 'snow' : tl === T.SWAMP || tl === T.BOG ? 'mud' : 'sand', f: prints.length & 1 });
      if (prints.length > 260) prints.splice(0, prints.length - 260);
      const dusty = tl === T.SAND || tl === T.DUNE || tl === T.ROAD || tl === T.GRASS;
      if (dusty && !(pud > 0.35)) { const col = tl === T.DUNE || tl === T.SAND ? '214,190,140' : tl === T.ROAD ? '170,150,120' : '120,150,90'; for (let i = 0; i < 2; i++) add(wx + (Math.random() - 0.5) * 0.3, wy + 0.25, -dx * 0.5 + (Math.random() - 0.5) * 0.6, -0.4 - Math.random() * 0.4, 0.5, 2.2, col, { dr: 0 }); }
      if (e.id === G.id && L >= 2 && G.eq && G.eq.cape) {
        const rgb = rgbOf(X.itColor ? X.itColor(G.eq.cape) : '#aaa');
        for (let i = 0; i < 3; i++) add(wx + (Math.random() - 0.5) * 0.3, wy - 0.3 + Math.random() * 0.2, -dx * 0.8 * Math.random(), -0.2 - Math.random() * 0.6, 0.7, 2.4, rgb, { add: true });
      }
    }
    for (const id of pos.keys()) if (!G.ents.has(id)) pos.delete(id);
    // transición de portal: salto grande de posición
    if (G.me) { if (lastMe && Math.max(Math.abs(G.me.x - lastMe.x), Math.abs(G.me.y - lastMe.y)) > 6 && L >= 1) trAt = now; lastMe = { x: G.me.x, y: G.me.y }; }
  });

  /* ---------- suelo (bajo los personajes) ---------- */
  X.on('under', (c, now, cw, ch) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const L = lvl(); if (L < 1 || !G.me || !G.tiles) return;
    const z = X.zoneAt(G.me.x, G.me.y), dun = z.kind === 'dungeon', desert = z.id === 'dunas', snowz = z.id === 'cumbres';
    const W = X.env ? X.env.weather() : { kind: null, k: 0 }, raining = !dun && W.kind === 'rain' && !desert && !snowz, snowing = !dun && W.kind === 'rain' && snowz;
    pud = Math.max(0, Math.min(1, pud + (raining ? W.k * dt / 18 : -dt / 90)));
    snowAcc = Math.max(0, Math.min(1, snowAcc + (snowing ? W.k * dt / 40 : -dt / 160)));
    const nt = night(), x0 = Math.floor(G.cam.x - cw / 2 / TS) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / TS) + 1, y0 = Math.floor(G.cam.y - ch / 2 / TS) - 1, y1 = Math.ceil(G.cam.y + ch / 2 / TS) + 1;
    let trees = 0;
    c.save();
    // huellas
    for (let i = prints.length - 1; i >= 0; i--) {
      const p = prints[i], age = (now - p.t) / 1000, life = p.k === 'snow' ? 16 : p.k === 'mud' ? 10 : 8;
      if (age > life) { prints.splice(i, 1); continue; }
      const [x, y] = cen(cw, ch, p.x, p.y); if (x < -10 || y < -10 || x > cw + 10 || y > ch + 10) continue;
      const a = (1 - age / life) * 0.5, ang = Math.atan2(p.dy, p.dx), ox = Math.cos(ang + 1.57) * (p.f ? 3 : -3), oy = Math.sin(ang + 1.57) * (p.f ? 3 : -3);
      c.fillStyle = p.k === 'snow' ? `rgba(110,130,170,${a})` : p.k === 'mud' ? `rgba(30,26,14,${a * 1.2})` : `rgba(120,90,50,${a * 0.9})`;
      c.beginPath(); c.ellipse(x + ox, y + oy + 6, 3, 2, ang, 0, 7); c.fill();
    }
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = tile(tx, ty); if (t < 0) continue;
      const [x, y] = cen(cw, ch, tx, ty), h = hash(tx, ty);
      if (t === T.TREE || t === T.PINE || t === T.PALM) { trees++; continue; }
      if (L >= 2 && t === T.WATER) {                                                // espuma en la orilla y destellos
        const nb = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]];
        for (const [ax, ay, k] of nb) {
          if (tile(tx + ax, ty + ay) === T.WATER || tile(tx + ax, ty + ay) < 0) continue;
          const wob = Math.sin(now / 520 + tx * 1.3 + ty * 0.9), al = 0.28 + 0.2 * wob;
          c.strokeStyle = `rgba(235,250,255,${al})`; c.lineWidth = 2; c.beginPath();
          const ex = x + ax * 14, ey = y + ay * 14, px = -ay, py = ax;
          for (let s = -1; s <= 1.01; s += 0.5) { const q = x + ax * (14 - 2 - wob * 1.5) + px * s * 15, r = y + ay * (14 - 2 - wob * 1.5) + py * s * 15 + Math.sin(now / 400 + s * 3 + tx) * 1.2; if (s === -1) c.moveTo(q, r); else c.lineTo(q, r); }
          c.stroke();
        }
        if (h > 0.86) { const tw = Math.max(0, Math.sin(now / 380 + h * 40)); if (tw > 0) { c.fillStyle = `rgba(255,255,255,${0.7 * tw})`; const gx = x + (h * 97 % 1 - 0.5) * 22, gy = y + (h * 53 % 1 - 0.5) * 22; c.fillRect(gx - 1, gy - 0.5, 3, 1); c.fillRect(gx - 0.5, gy - 1, 1, 3); } }
        continue;
      }
      if (L >= 2 && t === T.SHOP && nt > 0.25) {                                      // ventanas encendidas al anochecer
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(x, y, 2, x, y, 34); g.addColorStop(0, `rgba(255,190,90,${0.45 * nt})`); g.addColorStop(1, 'rgba(255,170,70,0)'); c.fillStyle = g; c.fillRect(x - 34, y - 34, 68, 68); c.restore();
        continue;
      }
      if (L >= 2 && snowAcc > 0.04 && (t === T.GRASS || t === T.ROAD || t === T.ROCK || t === T.FLOWER || t === T.HILL) && X.zoneAt(tx, ty).id === 'cumbres') {
        c.fillStyle = `rgba(242,248,255,${snowAcc * (0.42 + 0.4 * h)})`; c.fillRect(x - 16, y - 16, 32, 32);
        continue;
      }
      if (L >= 2 && t === T.SNOW && h > 0.94) { const tw = Math.max(0, Math.sin(now / 450 + h * 60)); if (tw > 0) { c.fillStyle = `rgba(255,255,255,${0.85 * tw})`; c.fillRect(x + (h * 31 % 1 - 0.5) * 20, y + (h * 77 % 1 - 0.5) * 20, 2, 2); } }
      if (L >= 2 && pud > 0.05 && (t === T.GRASS || t === T.ROAD || t === T.FLOWER || t === T.SAND) && hash(tx * 3 + 1, ty * 7 + 2) < 0.15) {   // charcos con ondas
        const r = (7 + 6 * hash(tx + 9, ty + 4)) * Math.min(1, pud * 1.6), px = x + (h - 0.5) * 8, py = y + (hash(tx, ty + 5) - 0.5) * 8;
        c.fillStyle = `rgba(52,76,118,${0.42 * pud})`; c.beginPath(); c.ellipse(px, py, r, r * 0.55, 0, 0, 7); c.fill();
        c.fillStyle = `rgba(200,225,255,${0.28 * pud})`; c.beginPath(); c.ellipse(px - r * 0.25, py - r * 0.18, r * 0.5, r * 0.2, 0, 0, 7); c.fill();
        if (raining) { const u = (now / 900 + h * 7) % 1; c.strokeStyle = `rgba(220,235,255,${0.55 * (1 - u)})`; c.lineWidth = 1; c.beginPath(); c.ellipse(px, py, r * u * 0.9, r * u * 0.5, 0, 0, 7); c.stroke(); }
      }
    }
    // salpicaduras de lluvia
    if (L >= 2 && raining) {
      const n = W.k * 46 * dt; for (let i = 0; i < n + Math.random(); i++) if (splashes.length < 90) splashes.push({ x: Math.random() * cw, y: Math.random() * ch, t: now });
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i], u = (now - s.t) / 320; if (u >= 1) { splashes.splice(i, 1); continue; }
      c.strokeStyle = `rgba(215,230,255,${0.6 * (1 - u)})`; c.lineWidth = 1; c.beginPath(); c.ellipse(s.x, s.y, 1 + u * 6, 0.6 + u * 3, 0, 0, 7); c.stroke();
      if (u < 0.5) { c.fillStyle = `rgba(230,240,255,${0.7 * (1 - u * 2)})`; c.fillRect(s.x - 2 + u * 4, s.y - u * 9, 1.2, 1.2); c.fillRect(s.x + 2 - u * 4, s.y - u * 7, 1.2, 1.2); }
    }
    // reflejos en el agua (cine): quien está junto al agua deja un reflejo vertical
    if (L >= 3) for (const e of G.ents.values()) {
      const tx = Math.round(e.rx), ty = Math.round(e.ry);
      if (tile(tx, ty + 1) !== T.WATER) continue;
      const [x, y] = cen(cw, ch, e.rx, e.ry), rgb = e.kind === 'pl' ? rgbOf(e.c) : (G.mons[e.t] && G.mons[e.t].boss ? '220,90,70' : '200,210,220');
      const g = c.createLinearGradient(0, y + 16, 0, y + 46); g.addColorStop(0, `rgba(${rgb},.38)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); const sh = Math.sin(now / 260) * 2;
      c.moveTo(x - 7, y + 16); c.lineTo(x + 7, y + 16); c.lineTo(x + 5 + sh, y + 46); c.lineTo(x - 5 - sh, y + 46); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(235,250,255,.35)'; c.lineWidth = 1; for (let k = 0; k < 2; k++) { const u = (now / 1100 + k / 2) % 1; c.beginPath(); c.ellipse(x, y + 18, 5 + u * 10, 2 + u * 3, 0, 0, 7); c.globalAlpha = 1 - u; c.stroke(); c.globalAlpha = 1; }
    }
    // auras de jefes según su furia
    for (const e of G.ents.values()) {
      if (e.kind !== 'mo') continue; const d = G.mons[e.t]; if (!d || !d.boss) continue;
      const ph = phase.get(e.id) || 0; if (!ph) continue;
      const [x, y] = cen(cw, ch, e.rx, e.ry), r = TS * (1.5 + ph * 0.35), col = ph === 1 ? '255,180,60' : ph === 2 ? '255,100,40' : '255,40,30';
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y + 6, 4, x, y + 6, r); g.addColorStop(0, `rgba(${col},${0.22 + 0.08 * Math.sin(now / (260 - ph * 50))})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y + 6 - r, r * 2, r * 2);
      c.strokeStyle = `rgba(${col},.55)`; c.lineWidth = 1.6; c.setLineDash([6, 8]); c.lineDashOffset = -now / 40; c.beginPath(); c.ellipse(x, y + 12, r * 0.8, r * 0.34, 0, 0, 7); c.stroke(); c.setLineDash([]);
      c.restore();
      if (ph >= 2 && Math.random() < 0.3) add(e.rx + (Math.random() - 0.5) * 1.5, e.ry + 0.1, 0, -1 - Math.random(), 0.9, 2.4, col, { add: true });
    }
    // aura del equipo propio (sets de raid, Ancient y +N altos)
    if (L >= 2 && G.eq && G.me) {
      const cnt = {}; let anc = 0, up = 0;
      for (const s in G.eq) { const it = G.eq[s]; if (!it) continue; const m = /^rd_(r[vkaxm])_/.exec(it[0]); if (m) cnt[m[1]] = (cnt[m[1]] || 0) + 1; if (it[3]) anc++; up = Math.max(up, it[2] || 0); }
      let best = null, n = 0; for (const k in cnt) if (cnt[k] > n) { n = cnt[k]; best = k; }
      const COL = { rv: '143,208,74', rk: '255,110,50', ra: '255,205,80', rx: '120,170,255', rm: '176,100,255' };
      const col = n >= 2 ? COL[best] : anc ? '90,175,255' : up >= 10 ? '255,232,160' : null, pw = n >= 2 ? Math.min(1, n / 8) : anc ? 0.35 : up >= 15 ? 0.4 : 0.22;
      const me = G.ents.get(G.id);
      if (col && me) {
        const [x, y] = cen(cw, ch, me.rx, me.ry), r = 20 + pw * 14;
        c.save(); c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(${col},${0.18 + 0.2 * pw})`; c.lineWidth = 1.4; c.setLineDash([3, 5]); c.lineDashOffset = now / 50; c.beginPath(); c.ellipse(x, y + 12, r, r * 0.4, 0, 0, 7); c.stroke(); c.setLineDash([]);
        c.strokeStyle = `rgba(${col},${0.5 * pw + 0.1})`; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + 12, r * 0.6, r * 0.24, 0, 0, 7); c.stroke();
        const g = c.createRadialGradient(x, y + 12, 2, x, y + 12, r); g.addColorStop(0, `rgba(${col},${0.08 * pw + 0.02})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y + 12 - r, r * 2, r * 2);
        c.restore();
        if (Math.random() < 0.18 + 0.4 * pw) add(me.rx + (Math.random() - 0.5) * 0.9, me.ry + 0.3, (Math.random() - 0.5) * 0.3, -0.6 - Math.random() * 0.8, 1.1, 1.6 + pw, col, { add: true });
        if (n >= 8) { const a = now / 600; add(me.rx + Math.cos(a) * 0.7, me.ry - 0.2 + Math.sin(a) * 0.25, 0, -0.3, 0.5, 2, col, { add: true }); }
      }
    }
    c.restore();
    stepParts(c, cw, ch, dt);
    X.state = X.state || {}; X.state.trees = trees;
  });

  /* ---------- encima de todo (hojas, relámpagos, golpes, transición) ---------- */
  X.on('draw', (c, now, cw, ch, dt, tx, ty) => {
    const L = lvl(); if (L < 1 || !G.me) return;
    const z = X.zoneAt(G.me.x, G.me.y), dun = z.kind === 'dungeon', desert = z.id === 'dunas', snowz = z.id === 'cumbres';
    const W = X.env ? X.env.weather() : { kind: null, k: 0 }, wet = W.kind === 'rain' ? W.k : 0;
    const wind = 0.55 + 0.45 * Math.sin(now / 5200) + 0.3 * Math.sin(now / 1900 + 2);
    // hojas con el viento (bosque) o arena arrastrada (desierto)
    if (L >= 2 && !dun && !snowz && !(wet > 0.4)) {
      const nt = night(), forest = (X.state && X.state.trees) || 0, want = desert ? Math.round(10 + Math.max(0, wind) * 18) : Math.min(20, Math.round(forest / 7));
      while (leaves.length < want) leaves.push({ x: -20 - Math.random() * cw * 0.6, y: Math.random() * ch, ph: Math.random() * 9, s: 2 + Math.random() * 2, r: Math.random() * 6, c: desert ? '224,196,140' : ['134,176,70', '176,160,60', '204,128,48', '96,150,60'][(Math.random() * 4) | 0] });
      if (leaves.length > want) leaves.length = want;
      const sp = 28 + Math.max(0, wind) * (desert ? 190 : 70);
      for (const l of leaves) {
        l.x += sp * dt * (0.7 + 0.3 * Math.sin(l.ph + now / 900)); l.y += (desert ? 6 : 16 + 10 * Math.sin(l.ph + now / 600)) * dt; l.r += dt * 3;
        if (l.x > cw + 20 || l.y > ch + 20) { l.x = -20; l.y = Math.random() * ch * 0.9; }
        c.save(); c.translate(l.x, l.y); c.rotate(l.r); c.globalAlpha = 0.9 * (1 - nt * 0.6);
        c.fillStyle = `rgb(${l.c})`;
        if (desert) { c.globalAlpha = 0.35 * (0.4 + Math.max(0, wind)); c.fillRect(0, 0, 6 + sp / 14, 1); } else { c.beginPath(); c.ellipse(0, 0, l.s * 1.5, l.s * 0.7, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-l.s * 1.2, -0.3, l.s * 2.4, 0.6); }
        c.restore();
      }
    } else leaves.length = 0;
    // relámpagos dibujados
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], u = (now - b.t) / 380; if (u >= 1) { bolts.splice(i, 1); continue; }
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
      for (const [w, col] of [[7, `rgba(150,170,255,${0.35 * (1 - u)})`], [3, `rgba(220,230,255,${0.8 * (1 - u)})`], [1.2, `rgba(255,255,255,${1 - u})`]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath(); b.pts.forEach(([x, y], k) => (k ? c.lineTo(x * cw, y * ch) : c.moveTo(x * cw, y * ch))); c.stroke();
        for (const br of b.br) { c.beginPath(); br.forEach(([x, y], k) => (k ? c.lineTo(x * cw, y * ch) : c.moveTo(x * cw, y * ch))); c.stroke(); }
      }
      c.restore();
    }
    // golpes con peso: zoom breve, destello blanco y bordes rojos al recibir daño
    const dtp = (now - punchAt) / 1000; if (punch > 0) punch = Math.max(0, punch - dt * 5.5);
    if (punch > 0.02) {
      const cv = c.canvas, k = 1 + 0.032 * punch * punch, w = cv.width, h = cv.height;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(cv, 0, 0, w, h, -(k - 1) * w / 2, -(k - 1) * h / 2, w * k, h * k); c.restore();
    }
    if (flashW > 0.02) { c.fillStyle = `rgba(255,248,230,${flashW * 0.5})`; c.fillRect(0, 0, cw, ch); flashW *= Math.pow(0.0015, dt); }
    if (hurt > 0.02) {
      const g = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.6);
      g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, `rgba(200,10,10,${0.5 * hurt})`); c.fillStyle = g; c.fillRect(0, 0, cw, ch); hurt *= Math.pow(0.03, dt);
    }
    // iris de transición al cruzar portales
    const tu = (now - trAt) / 750;
    if (tu >= 0 && tu < 1) {
      const px = (tx - G.cam.x) * TS + cw / 2, py = (ty - G.cam.y) * TS + ch / 2, R = Math.hypot(cw, ch), r = R * smooth(0, 1, tu) * 0.85 + 10;
      const g = c.createRadialGradient(px, py, r * 0.5, px, py, r + 40); g.addColorStop(0, 'rgba(10,14,36,0)'); g.addColorStop(r / (r + 40) * 0.95, 'rgba(10,14,36,0)'); g.addColorStop(1, `rgba(10,14,36,${0.97 * (1 - tu * 0.4)})`);
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      if (tu < 0.25) { c.fillStyle = `rgba(190,205,255,${0.5 * (1 - tu * 4)})`; c.fillRect(0, 0, cw, ch); }
    }
  });

  /* relámpago dibujado (lo llama env.js al caer un rayo, solo nivel cine) */
  X.bolt = () => {
    if (lvl() < 3) return;
    const x0 = 0.15 + Math.random() * 0.7, pts = [[x0, -0.02]], br = []; let x = x0, y = 0;
    while (y < 0.55 + Math.random() * 0.3) { x += (Math.random() - 0.5) * 0.09; y += 0.05 + Math.random() * 0.05; pts.push([x, y]); if (Math.random() < 0.25) { const b = [[x, y]]; let bx = x, by = y; for (let i = 0; i < 3; i++) { bx += (Math.random() - 0.3) * 0.07; by += 0.04; b.push([bx, by]); } br.push(b); } }
    bolts.push({ pts, br, t: performance.now() });
  };
})();
