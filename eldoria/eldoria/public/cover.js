'use strict';
/* Portada animada: cielo nocturno, dragones en vuelo, castillo, brasas y un caballero de fuego.
 * Todo se dibuja por código (sin imágenes). Se detiene al entrar al juego. */
(() => {
  const cv = document.getElementById('cover');
  if (!cv) return;
  if (window.EldSafe && window.EldSafe.on()) { cv.style.display = 'none'; return; }       // modo seguro: sin portada animada
  const c = cv.getContext('2d');
  const login = document.getElementById('login');
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1;
  const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  const stars = (() => { const r = rnd(11), a = []; for (let i = 0; i < 140; i++) a.push({ x: r(), y: r() * 0.62, s: 0.5 + r() * 1.4, p: r() * 6.28 }); return a; })();
  const embers = [];
  const spawnEmber = (x, y, up = 1) => embers.push({ x, y, vx: (Math.random() - 0.5) * 18, vy: -(20 + Math.random() * 50) * up, life: 0, max: 1.5 + Math.random() * 2.2, s: 1 + Math.random() * 2 });

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  window.addEventListener('resize', resize);

  /* ---------------- fondo ---------------- */
  function sky(t) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080b16'); g.addColorStop(0.45, '#1a1530'); g.addColorStop(0.72, '#4a1f2a'); g.addColorStop(1, '#8a3a1c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const s of stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 1400 + s.p));
      c.fillStyle = `rgba(255,240,220,${a})`; c.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    const mx = W * 0.8, my = H * 0.2, mr = Math.min(W, H) * 0.07;
    const mg = c.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4);
    mg.addColorStop(0, 'rgba(255,225,170,.35)'); mg.addColorStop(1, 'rgba(255,225,170,0)');
    c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr * 4, 0, 7); c.fill();
    c.fillStyle = '#f3dba6'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
    c.fillStyle = 'rgba(190,150,90,.35)'; c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.28, 0, 7); c.fill(); c.beginPath(); c.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.18, 0, 7); c.fill();
    // nubes lentas
    for (let i = 0; i < 4; i++) {
      const cx = ((t / (90 + i * 30) + i * 420) % (W + 500)) - 250, cy = H * (0.18 + i * 0.1);
      c.fillStyle = `rgba(70,40,60,${0.25 - i * 0.03})`;
      for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(cx + k * 46, cy + Math.sin(k * 2 + i) * 8, 90, 16, 0, 0, 7); c.fill(); }
    }
  }

  function ridge(base, amp, seed, col, step = 26) {
    const r = rnd(seed); c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
    let y = base;
    for (let x = 0; x <= W + step; x += step) { y = base + (r() - 0.5) * amp; c.lineTo(x, y); }
    c.lineTo(W + step, H); c.closePath(); c.fill();
  }

  function castle(x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#120c18';
    const rect = (a, b, w, h) => c.fillRect(a, b, w, h);
    rect(-70, -60, 140, 60); rect(-90, -90, 30, 90); rect(60, -100, 30, 100); rect(-20, -120, 40, 120);
    for (const [a, b, w] of [[-90, -90, 30], [60, -100, 30], [-20, -120, 40], [-70, -60, 140]]) for (let i = 0; i < w; i += 10) rect(a + i, b - 7, 6, 7);
    c.beginPath(); c.moveTo(-96, -90); c.lineTo(-75, -128); c.lineTo(-54, -90); c.fill();
    c.beginPath(); c.moveTo(54, -100); c.lineTo(75, -140); c.lineTo(96, -100); c.fill();
    c.fillStyle = `rgba(255,170,60,${0.7 + 0.3 * Math.sin(t / 300)})`;
    [[-78, -70], [70, -80], [-6, -100], [-6, -76], [30, -30], [-40, -30]].forEach(([a, b]) => rect(a, b, 5, 8));
    c.restore();
  }

  /* ---------------- dragón (vista lateral) ---------------- */
  function dragon(x, y, s, flap, dir, tone, breath) {
    c.save(); c.translate(x, y); c.scale(s * dir, s);
    const body = tone === 0 ? '#2a1420' : '#1c1a2e', edge = tone === 0 ? '#ff7a3a' : '#6aa0ff', wing = tone === 0 ? '#3a1a28' : '#262a46';
    const w = Math.sin(flap);
    const wingDraw = (back) => {
      c.save(); c.translate(-6, -8);
      c.rotate((back ? -0.25 : 0) + w * 0.75 - 0.5);
      c.fillStyle = back ? '#150c14' : wing; c.strokeStyle = edge; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-18, -70); c.lineTo(-48, -88); c.lineTo(-44, -56); c.lineTo(-72, -58); c.lineTo(-56, -34); c.lineTo(-80, -26); c.lineTo(-40, -8); c.closePath(); c.fill(); c.globalAlpha = 0.7; c.stroke(); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-48, -88); c.moveTo(0, 0); c.lineTo(-72, -58); c.moveTo(0, 0); c.lineTo(-80, -26); c.stroke();
      c.restore();
    };
    wingDraw(true);
    // cola
    c.fillStyle = body; c.beginPath(); c.moveTo(-18, -2); c.quadraticCurveTo(-60, 10 + w * 6, -96, -6 + w * 10); c.lineTo(-108, -14 + w * 12); c.lineTo(-96, -2 + w * 10); c.quadraticCurveTo(-58, 22 + w * 6, -18, 12); c.closePath(); c.fill();
    // cuerpo, cuello y cabeza
    c.beginPath(); c.ellipse(0, 2, 30, 15, -0.05, 0, 7); c.fill();
    c.beginPath(); c.moveTo(18, -6); c.quadraticCurveTo(44, -22, 46, -38 + w * 2); c.lineTo(56, -40 + w * 2); c.lineTo(78, -34 + w * 2); c.lineTo(58, -28 + w * 2); c.quadraticCurveTo(52, -6, 26, 12); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(48, -40 + w * 2); c.lineTo(40, -52 + w * 2); c.lineTo(54, -44 + w * 2); c.fill();      // cuerno
    c.fillStyle = edge; c.beginPath(); c.arc(55, -36 + w * 2, 1.8, 0, 7); c.fill();                                // ojo
    // espinas dorsales
    c.fillStyle = body; for (let i = 0; i < 6; i++) { const px = -22 + i * 9; c.beginPath(); c.moveTo(px, -13); c.lineTo(px + 4, -20); c.lineTo(px + 8, -13); c.fill(); }
    // patas
    c.strokeStyle = body; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(6, 12); c.lineTo(14, 24); c.lineTo(8, 28); c.moveTo(-8, 13); c.lineTo(-14, 25); c.lineTo(-20, 27); c.stroke();
    // vientre iluminado por fuego
    c.fillStyle = tone === 0 ? 'rgba(255,120,50,.25)' : 'rgba(110,160,255,.2)'; c.beginPath(); c.ellipse(2, 9, 24, 6, 0, 0, 7); c.fill();
    wingDraw(false);
    if (breath > 0) {                                                                                               // aliento de fuego
      const L = 70 + breath * 130;
      for (let i = 0; i < 14; i++) {
        const k = i / 13, px = 76 + k * L, py = -32 + k * (8 + Math.sin(i + flap * 3) * 6), rr = 4 + k * 20 * breath;
        const g = c.createRadialGradient(px, py, 0, px, py, rr);
        g.addColorStop(0, `rgba(255,240,170,${0.9 * (1 - k * 0.6)})`); g.addColorStop(0.5, `rgba(255,130,40,${0.7 * (1 - k * 0.5)})`); g.addColorStop(1, 'rgba(200,30,10,0)');
        c.fillStyle = g; c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill();
      }
    }
    c.restore();
  }

  /* ---------------- caballero de fuego ---------------- */
  function knight(x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const sway = Math.sin(t / 900) * 1.2, br = Math.sin(t / 700) * 0.8;
    // halo de fuego
    const hg = c.createRadialGradient(0, -70, 10, 0, -70, 130);
    hg.addColorStop(0, 'rgba(255,140,50,.38)'); hg.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = hg; c.beginPath(); c.arc(0, -70, 130, 0, 7); c.fill();
    // capa al viento
    c.fillStyle = '#7a1414'; c.beginPath(); c.moveTo(-10, -92); c.lineTo(-52 - Math.sin(t / 260) * 6, -56 + Math.sin(t / 310) * 4); c.lineTo(-74 - Math.sin(t / 220 + 1) * 8, -10); c.lineTo(-50 - Math.sin(t / 240) * 5, 4); c.lineTo(-20, -4); c.lineTo(4, -60); c.closePath(); c.fill();
    c.fillStyle = '#4e0c0c'; c.beginPath(); c.moveTo(-14, -88); c.lineTo(-46, -50); c.lineTo(-58, -6); c.lineTo(-20, -6); c.closePath(); c.fill();
    // botas y piernas
    const steel = '#3a3f4c', steelL = '#5b6272', dark = '#1b1e26', trim = '#ff7a2a';
    c.fillStyle = dark; c.fillRect(-14, -34, 12, 30); c.fillRect(4, -34, 12, 30); c.fillStyle = steel; c.fillRect(-16, -8, 15, 8); c.fillRect(4, -8, 16, 8);
    c.fillStyle = steelL; c.fillRect(-14, -34, 4, 26); c.fillRect(6, -34, 4, 26);
    c.fillStyle = trim; c.fillRect(-14, -20, 12, 2); c.fillRect(4, -20, 12, 2);
    // tronco
    c.fillStyle = steel; c.beginPath(); c.moveTo(-20, -90 + br); c.lineTo(22, -90 + br); c.lineTo(17, -34); c.lineTo(-17, -34); c.closePath(); c.fill();
    c.fillStyle = steelL; c.fillRect(-18, -88 + br, 7, 52);
    c.fillStyle = trim; c.fillRect(-18, -60, 36, 3); c.beginPath(); c.moveTo(0, -84 + br); c.lineTo(8, -70); c.lineTo(0, -58); c.lineTo(-8, -70); c.closePath(); c.fill();
    c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(0, -70, 2.6, 0, 7); c.fill();
    // hombreras
    c.fillStyle = steelL; c.beginPath(); c.ellipse(-24, -88 + br, 12, 9, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(26, -88 + br, 12, 9, 0, 0, 7); c.fill();
    c.fillStyle = trim; c.fillRect(-34, -84 + br, 20, 2); c.fillRect(16, -84 + br, 20, 2);
    // brazo izquierdo (escudo) y derecho (espada en alto)
    c.fillStyle = steel; c.fillRect(-36, -82 + br, 9, 28);
    c.fillStyle = '#23262e'; c.beginPath(); c.moveTo(-52, -78); c.lineTo(-30, -78); c.lineTo(-30, -44); c.lineTo(-41, -32); c.lineTo(-52, -44); c.closePath(); c.fill();
    c.strokeStyle = trim; c.lineWidth = 2; c.stroke(); c.fillStyle = trim; c.beginPath(); c.arc(-41, -58, 4, 0, 7); c.fill();
    c.fillStyle = steel; c.save(); c.translate(30, -84 + br); c.rotate(-0.9 + sway * 0.02); c.fillRect(0, -4, 9, 30); c.restore();
    // espada flamígera
    c.save(); c.translate(46, -102 + br); c.rotate(0.12 + sway * 0.01);
    c.fillStyle = '#6b4a2e'; c.fillRect(-2, 8, 4, 12); c.fillStyle = '#c9a24b'; c.fillRect(-8, 6, 16, 3);
    const bl = c.createLinearGradient(0, 6, 0, -80); bl.addColorStop(0, '#ffe9a8'); bl.addColorStop(0.5, '#ff8a2a'); bl.addColorStop(1, '#d8350f');
    c.fillStyle = bl; c.beginPath(); c.moveTo(-4, 6); c.lineTo(4, 6); c.lineTo(3, -70); c.lineTo(0, -82); c.lineTo(-3, -70); c.closePath(); c.fill();
    c.restore();
    // casco con cuernos y ojos de fuego
    c.fillStyle = steel; c.beginPath(); c.arc(0, -106 + br, 15, Math.PI, 0); c.lineTo(15, -94 + br); c.lineTo(-15, -94 + br); c.closePath(); c.fill();
    c.fillStyle = steelL; c.fillRect(-13, -118 + br, 6, 20);
    c.fillStyle = dark; c.fillRect(-12, -104 + br, 24, 7);
    c.fillStyle = trim; c.fillRect(-9, -102 + br, 6, 3); c.fillRect(3, -102 + br, 6, 3);
    c.fillStyle = '#23262e'; c.beginPath(); c.moveTo(-13, -116 + br); c.quadraticCurveTo(-30, -122 + br, -30, -140 + br); c.quadraticCurveTo(-20, -126 + br, -8, -121 + br); c.fill();
    c.beginPath(); c.moveTo(13, -116 + br); c.quadraticCurveTo(30, -122 + br, 30, -140 + br); c.quadraticCurveTo(20, -126 + br, 8, -121 + br); c.fill();
    c.fillStyle = trim; c.beginPath(); c.moveTo(0, -122 + br); c.lineTo(-4, -132 + br); c.lineTo(0, -128 + br); c.lineTo(4, -134 + br); c.lineTo(6, -121 + br); c.fill();     // cresta de llama
    c.restore();
  }

  /* ---------------- bucle ---------------- */
  const dragons = [
    { x: 0.15, y: 0.3, s: 1.1, v: 38, d: 1, tone: 0, ph: 0, br: 0 },
    { x: 0.7, y: 0.14, s: 0.6, v: 26, d: -1, tone: 1, ph: 2, br: 0 },
    { x: 0.42, y: 0.38, s: 0.42, v: 20, d: 1, tone: 0, ph: 4, br: 0 },
  ];
  let last = 0, fireT = 0;

  function frame(now) {
    if (!login.hidden && !still) requestAnimationFrame(frame);
    if (login.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (!W || !H) resize();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    sky(now);
    ridge(H * 0.62, 38, 7, '#2a1626', 40);
    castle(W * 0.74, H * 0.66, Math.min(1.6, W / 900), now);
    // dragones
    for (const d of dragons) {
      d.x += (d.v * d.d * dt) / W; d.ph += dt * (d.s > 0.7 ? 5.2 : 6.5);
      if (d.d > 0 && d.x > 1.15) d.x = -0.15; if (d.d < 0 && d.x < -0.15) d.x = 1.15;
      const bob = Math.sin(now / 700 + d.ph) * 8;
      if (d === dragons[0]) { fireT += dt; const cyc = fireT % 9; d.br = cyc > 6.2 && cyc < 8.2 ? Math.sin(((cyc - 6.2) / 2) * Math.PI) : 0; }
      dragon(d.x * W, d.y * H + bob, d.s * Math.min(1.4, Math.max(0.6, W / 1100)), d.ph, d.d, d.tone, d.br);
      if (d.br > 0.3 && Math.random() < 0.6) spawnEmber(d.x * W + 80 * d.s, d.y * H + bob - 30 * d.s, 0.3);
    }
    ridge(H * 0.78, 50, 21, '#1c0f1c', 34);
    // acantilado y caballero
    const kx = W < 760 ? W * 0.5 : W * 0.17, ky = H * 0.9;
    c.fillStyle = '#120a14'; c.beginPath(); c.moveTo(kx - 170, H); c.lineTo(kx - 120, ky + 4); c.lineTo(kx + 120, ky + 4); c.lineTo(kx + 190, H); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,120,40,.25)'; c.fillRect(kx - 120, ky + 4, 240, 2);
    knight(kx, ky + 4, Math.min(1.5, Math.max(0.8, H / 560)), now);
    if (Math.random() < 0.5) spawnEmber(kx + 46 + Math.random() * 8, ky - 120 * Math.min(1.5, H / 560), 0.6);
    if (Math.random() < 0.9) spawnEmber(Math.random() * W, H + 6);
    // brasas
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]; e.life += dt; if (e.life > e.max) { embers.splice(i, 1); continue; }
      e.x += (e.vx + Math.sin(now / 400 + i) * 10) * dt; e.y += e.vy * dt;
      const a = 1 - e.life / e.max; c.fillStyle = `rgba(255,${150 + (a * 90 | 0)},60,${a})`; c.fillRect(e.x, e.y, e.s, e.s);
    }
    // viñeta
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }
  resize();
  requestAnimationFrame(frame);
  new MutationObserver(() => { if (!login.hidden) { last = performance.now(); requestAnimationFrame(frame); } }).observe(login, { attributes: true, attributeFilter: ['hidden'] });
})();
