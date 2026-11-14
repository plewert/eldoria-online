'use strict';
/* Evento de Halloween: cielo oscuro con truenos, Rey Calabaza, llamaradas moradas, viento de fuego, calabazas explosivas y guadaña. Solo visual. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const TS = () => X.TS;
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const FX = [], BOLTS = [], PK = [];
  const HW = { a: 0, target: 0, flash: 0, last: 0, fightA: 0.52 };
  const COL = '176,100,255', FIRE = '255,140,50';
  const KIND = { scythe: 's', rain: 'k', bomb: 'c', wind: 'z' };                     // pose del jefe (ver drawRaidBoss)
  const rnd = (a, b) => a + Math.random() * (b - a);

  X.handlers.hw = (m) => {
    if (m.k === 'dark') { HW.target = HW.fightA; HW.rate = 1 / Math.max(2, m.secs || 20); }
    else if (m.k === 'fight') { HW.target = HW.fightA; HW.rate = 0.4; }
    else if (m.k === 'off') { HW.target = 0; HW.rate = 0.25; }
  };

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = FX.length - 1; i >= 0; i--) if (now - FX[i].t > FX[i].T) FX.splice(i, 1);
    switch (f.k) {
      case 'hw_bolt': BOLTS.push({ t: now, T: f.big ? 900 : 480, x: f.x, y: f.y, big: f.big, s: Math.random() * 999 }); HW.flash = Math.max(HW.flash, f.big ? 0.85 : 0.4);
        X.burst(f.x, f.y, 'dark', f.big ? 40 : 10, { sp: f.big ? 7 : 3, up: 4, g: 3, life: 0.7, size: 3 }); if (f.big) { G.shake = { t: now, m: 8 }; X.ring(f.x, f.y, 'dark', 900, 120, 7); } break;
      case 'hw_fw': FX.push({ k: 'fw', t: now, T: f.ms, f }); break;
      case 'hw_fh': FX.push({ k: 'fh', t: now, T: 650, f }); X.burst(f.x, f.y, 'dark', 16, { sp: 4, up: 4, g: 4, life: 0.7, size: 3.2 }); X.ring(f.x, f.y, 'dark', 450, f.r * 34, 4); break;
      case 'hw_ww': FX.push({ k: 'ww', t: now, T: f.ms, f }); break;
      case 'hw_wind': FX.push({ k: 'wind', t: now, T: f.ms, f }); break;
      case 'hw_pk': PK.push({ t: now, fly: f.fly, fuse: f.fuse, f }); break;
      case 'hw_pkx': X.burst(f.x, f.y, 'fire', 34, { sp: 6, up: 5, g: 4, life: 0.9, size: 3.6 }); X.burst(f.x, f.y, 'dark', 20, { sp: 5, up: 4, g: 3, life: 0.8, size: 3 }); X.ring(f.x, f.y, 'fire', 600, 90, 6); G.shake = { t: now, m: 4 }; FX.push({ k: 'bang', t: now, T: 500, f }); break;
      case 'hw_pool': FX.push({ k: 'pool', t: now, T: f.ms, f, s: Math.random() * 99 }); break;
      case 'hw_sw': FX.push({ k: 'sw', t: now, T: f.ms, f }); break;
      case 'hw_sh': FX.push({ k: 'sh', t: now, T: 650, f }); X.burst(f.x, f.y, 'dark', 44, { sp: 7, up: 4, g: 5, life: 0.8, size: 3.4 }); X.ring(f.x, f.y, 'dark', 700, f.r * 36, 7); G.shake = { t: now, m: 7 }; break;
      case 'hw_cast': X.casts.set(f.id, now + f.T + 400); X.rdc.set(f.id, { k: KIND[f.kind] || 'c', t: now, T: f.T }); break;
      default: break;
    }
  });

  const ell = (c, x, y, r, fill, stroke, w) => { c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w || 2; c.stroke(); } };

  /* ---- suelo: avisos, charcos y estallidos ---- */
  X.on('under', (c, now) => {
    const T = TS();
    for (const b of FX) {
      const p = Math.min(1, Math.max(0, (now - b.t) / b.T)), f = b.f;
      if (b.k === 'fw') {                                                          // aviso de llamarada
        const x = px(f.x), y = py(f.y), r = f.r * T;
        const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, `rgba(${COL},${0.05 + 0.18 * p})`); g.addColorStop(0.8, `rgba(${COL},${0.14 + 0.2 * p})`); g.addColorStop(1, `rgba(${COL},0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.fill();
        ell(c, x, y, r, null, `rgba(${COL},${0.5 + 0.4 * Math.abs(Math.sin(now / 70))})`, 2); ell(c, x, y, r * p, null, 'rgba(255,255,255,.4)', 1);
      } else if (b.k === 'fh' || b.k === 'sh') {
        const x = px(f.x), y = py(f.y), r = f.r * T, al = 1 - p, g = c.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, `rgba(255,240,255,${0.85 * al})`); g.addColorStop(0.45, `rgba(${COL},${0.6 * al})`); g.addColorStop(1, `rgba(${COL},0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * (0.7 + 0.45 * p), r * 0.82 * (0.7 + 0.45 * p), 0, 0, 7); c.fill();
      } else if (b.k === 'bang') {
        const x = px(f.x), y = py(f.y), r = f.r * T * (0.5 + p), al = 1 - p, g = c.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, `rgba(255,240,200,${0.9 * al})`); g.addColorStop(0.4, `rgba(${FIRE},${0.6 * al})`); g.addColorStop(1, `rgba(${COL},0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.fill();
      } else if (b.k === 'sw') {                                                    // aviso de la guadaña
        const x = px(f.x), y = py(f.y), r = f.r * T;
        ell(c, x, y, r, `rgba(${COL},${0.05 + 0.18 * p})`, `rgba(${COL},${0.55 + 0.4 * Math.abs(Math.sin(now / 70))})`, 2.5); ell(c, x, y, r * p, null, 'rgba(255,255,255,.4)', 1.2);
        for (let i = 0; i < 10; i++) { const a = i * 0.628 + 0.2; c.strokeStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * p, y + Math.sin(a) * r * p * 0.82); c.stroke(); }
      } else if (b.k === 'pool') {                                                  // fuego morado en el suelo
        const x = px(f.x), y = py(f.y), r = f.r * T, al = Math.min(1, (1 - p) * 5) * Math.min(1, p * 8 + 0.2), g = c.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, `rgba(${COL},${0.6 * al})`); g.addColorStop(0.8, `rgba(${COL},${0.3 * al})`); g.addColorStop(1, `rgba(${COL},0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.fill();
        for (let i = 0; i < 7; i++) { const u = (now / 650 + i * 0.15 + b.s) % 1; c.fillStyle = `rgba(${i % 2 ? COL : FIRE},${0.75 * al * (1 - u)})`; c.beginPath(); c.arc(x + Math.sin(i * 2.7 + b.s) * r * 0.6, y - u * 20, 2.2, 0, 7); c.fill(); }
      } else if (b.k === 'ww') {                                                    // aviso del viento de fuego: franja y flechas
        const horiz = f.x2 !== f.x, x0 = px(Math.min(f.x, f.x2)), x1 = px(Math.max(f.x, f.x2)), y0 = py(Math.min(f.y, f.y2)), y1 = py(Math.max(f.y, f.y2)), hf = f.half * T, al = 0.08 + 0.12 * Math.abs(Math.sin(now / 160));
        c.fillStyle = `rgba(${COL},${al})`; if (horiz) c.fillRect(x0, y0 - hf, x1 - x0, hf * 2); else c.fillRect(x0 - hf, y0, hf * 2, y1 - y0);
        c.strokeStyle = `rgba(${COL},.6)`; c.lineWidth = 2; if (horiz) c.strokeRect(x0, y0 - hf, x1 - x0, hf * 2); else c.strokeRect(x0 - hf, y0, hf * 2, y1 - y0);
        c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '700 14px sans-serif'; c.textAlign = 'center';
        const dirx = Math.sign(f.x2 - f.x), diry = Math.sign(f.y2 - f.y), n = 7;
        for (let i = 0; i < n; i++) { const u = ((i / n) + now / 1400) % 1, X0 = horiz ? x0 + (x1 - x0) * (dirx > 0 ? u : 1 - u) : px(f.x), Y0 = horiz ? py(f.y) : y0 + (y1 - y0) * (diry > 0 ? u : 1 - u); for (let k = -2; k <= 2; k++) c.fillText(horiz ? (dirx > 0 ? '»' : '«') : (diry > 0 ? '⌄' : '⌃'), horiz ? X0 : X0 + k * 60, horiz ? Y0 + k * 60 : Y0); }
      }
    }
    for (const q of PK) {                                                          // aviso de la explosión de cada calabaza
      const u = (now - q.t - q.fly) / q.fuse; if (u < 0 || u > 1) continue;
      const x = px(q.f.x2), y = py(q.f.y2), r = q.f.r * T;
      ell(c, x, y, r, `rgba(255,120,40,${0.05 + 0.14 * u})`, `rgba(255,${150 - 100 * u},60,${0.4 + 0.5 * Math.abs(Math.sin(now / (160 - 100 * u)))})`, 2); ell(c, x, y, r * u, null, 'rgba(255,255,255,.35)', 1);
    }
  });

  const pumpkin = (c, x, y, s, flash, spin) => {
    c.save(); c.translate(x, y); c.rotate(spin);
    const g = c.createRadialGradient(-s * 0.25, -s * 0.3, s * 0.1, 0, 0, s * 1.1); g.addColorStop(0, '#ffc15a'); g.addColorStop(0.55, '#e8731a'); g.addColorStop(1, '#7a300a');
    c.fillStyle = g; for (const dx of [-0.5, 0.5, 0]) { c.beginPath(); c.ellipse(dx * s, 0, s * 0.62, s * 0.82, 0, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(90,30,5,.55)'; c.lineWidth = 1; for (const dx of [-0.25, 0.25]) { c.beginPath(); c.ellipse(dx * s * 2, 0, s * 0.3, s * 0.8, 0, 0, 7); c.stroke(); }
    c.fillStyle = '#3d5a1c'; c.fillRect(-s * 0.1, -s * 0.98, s * 0.2, s * 0.3);
    c.fillStyle = flash > 0.5 ? '#fff6b0' : '#ffd23a'; c.beginPath(); c.moveTo(-s * 0.5, -s * 0.18); c.lineTo(-s * 0.18, -s * 0.18); c.lineTo(-s * 0.34, -s * 0.5); c.fill(); c.beginPath(); c.moveTo(s * 0.5, -s * 0.18); c.lineTo(s * 0.18, -s * 0.18); c.lineTo(s * 0.34, -s * 0.5); c.fill();
    c.beginPath(); c.moveTo(-s * 0.5, s * 0.15); c.lineTo(s * 0.5, s * 0.15); c.lineTo(s * 0.3, s * 0.5); c.lineTo(0, s * 0.35); c.lineTo(-s * 0.3, s * 0.5); c.closePath(); c.fill();
    if (flash > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,${200 - 120 * flash},120,${0.55 * flash})`; for (const dx of [-0.5, 0.5, 0]) { c.beginPath(); c.ellipse(dx * s, 0, s * 0.62, s * 0.82, 0, 0, 7); c.fill(); } }
    c.restore();
  };

  /* ---- sobre el mundo: truenos, llamaradas cayendo, muro de viento y calabazas ---- */
  const bolt = (c, x0, y0, x1, y1, seed, w, col) => {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0);
    const n = 9; for (let i = 1; i < n; i++) { const u = i / n, j = (Math.sin(seed + i * 12.9898) * 43758.5453 % 1) * 2 - 1; c.lineTo(x0 + (x1 - x0) * u + j * 26 * (1 - u * 0.5), y0 + (y1 - y0) * u); }
    c.lineTo(x1, y1); c.stroke();
  };
  X.on('draw', (c, now, cw, ch) => {
    const T = TS();
    // oscuridad
    const dt = HW.last ? Math.min(0.1, (now - HW.last) / 1000) : 0.016; HW.last = now;
    HW.a += (HW.target - HW.a) * Math.min(1, dt * (HW.rate || 0.4) * 2.2);
    HW.flash *= Math.pow(0.0025, dt);
    for (let i = BOLTS.length - 1; i >= 0; i--) if (now - BOLTS[i].t > BOLTS[i].T) BOLTS.splice(i, 1);
    for (let i = PK.length - 1; i >= 0; i--) if (now - PK[i].t > PK[i].fly + PK[i].fuse) PK.splice(i, 1);
    c.save();
    if (HW.a > 0.01) {
      c.fillStyle = `rgba(14,4,34,${HW.a * 0.9})`; c.fillRect(0, 0, cw, ch);
      const g = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.25, cw / 2, ch / 2, Math.max(cw, ch) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,0,40,${HW.a * 0.8})`); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    // llamaradas que caen
    c.globalCompositeOperation = 'lighter';
    for (const b of FX) {
      const p = (now - b.t) / b.T, f = b.f; if (p < 0 || p > 1) continue;
      if (b.k === 'fw') {
        const e = Math.pow(p, 1.7), x = px(f.x) + (1 - e) * 5 * T, y = py(f.y) - (1 - e) * 13 * T, r = 9 + 6 * e;
        const tail = c.createLinearGradient(x, y, x + 5 * T * 0.35, y - 13 * T * 0.35); tail.addColorStop(0, `rgba(${COL},.75)`); tail.addColorStop(1, `rgba(${COL},0)`);
        c.strokeStyle = tail; c.lineWidth = r * 1.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5 * T * 0.35, y - 13 * T * 0.35); c.stroke();
        const g = c.createRadialGradient(x, y, 1, x, y, r * 2); g.addColorStop(0, 'rgba(255,240,255,.95)'); g.addColorStop(0.35, `rgba(${COL},.8)`); g.addColorStop(1, `rgba(${FIRE},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2, 0, 7); c.fill();
      } else if (b.k === 'wind') {                                                  // muro de llamas moradas que avanza
        const horiz = f.x2 !== f.x, hf = f.half * T, along = horiz ? px(f.x) + (px(f.x2) - px(f.x)) * p : py(f.y) + (py(f.y2) - py(f.y)) * p, mid = horiz ? py(f.y) : px(f.x);
        const dirv = horiz ? Math.sign(f.x2 - f.x) : Math.sign(f.y2 - f.y);
        for (let k = -hf; k <= hf; k += 11) {
          const a = horiz ? along : mid + k, bb = horiz ? mid + k : along, ph = k * 0.37 + now / 90, hh = 26 + 12 * Math.sin(ph);
          const g = c.createRadialGradient(a, bb, 1, a, bb, 22); g.addColorStop(0, 'rgba(255,230,255,.8)'); g.addColorStop(0.4, `rgba(${COL},.6)`); g.addColorStop(1, `rgba(${COL},0)`); c.fillStyle = g; c.beginPath(); c.arc(a, bb, 22, 0, 7); c.fill();
          c.fillStyle = `rgba(${(Math.floor(ph) % 3) ? COL : FIRE},.55)`; c.beginPath();
          if (horiz) { c.moveTo(a - 6, bb + 6); c.quadraticCurveTo(a - dirv * hh * 0.4, bb - 4, a - dirv * hh, bb - 8 + Math.sin(ph) * 5); c.quadraticCurveTo(a - dirv * hh * 0.4, bb + 4, a + 6, bb - 6); }
          else { c.moveTo(a - 6, bb - 6); c.quadraticCurveTo(a - 4, bb - dirv * hh * 0.4, a - 8 + Math.sin(ph) * 5, bb - dirv * hh); c.quadraticCurveTo(a + 4, bb - dirv * hh * 0.4, a + 6, bb + 6); }
          c.fill();
        }
      }
    }
    c.globalCompositeOperation = 'source-over';
    // calabazas lanzadas / en espera
    for (const q of PK) {
      const t = now - q.t, f = q.f;
      if (t < q.fly) {
        const u = t / q.fly, x = px(f.x1) + (px(f.x2) - px(f.x1)) * u, y = py(f.y1) + (py(f.y2) - py(f.y1)) * u - Math.sin(Math.PI * u) * T * 5;
        c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(px(f.x1) + (px(f.x2) - px(f.x1)) * u, py(f.y1) + (py(f.y2) - py(f.y1)) * u, 9, 3.5, 0, 0, 7); c.fill();
        pumpkin(c, x, y, 11 - 2 * Math.sin(Math.PI * u) * -1, 0, u * 9);
      } else {
        const u = (t - q.fly) / q.fuse, fl = Math.abs(Math.sin((t) / (230 - 160 * u))) * (0.3 + 0.7 * u), x = px(f.x2), y = py(f.y2) - 6 - Math.max(0, 1 - (t - q.fly) / 180) * 12;
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + 7, 10, 3.6, 0, 0, 7); c.fill();
        pumpkin(c, x, y, 11 * (1 + 0.12 * u * Math.sin(t / 60)), fl, Math.sin(t / 90) * 0.06 * u);
        c.fillStyle = `rgba(255,${180 - 140 * u},40,${0.8})`; c.fillRect(x - 1, y - 16 - Math.sin(t / 40) * 2, 2, 4);
      }
    }
    // truenos
    for (const b of BOLTS) {
      const p = (now - b.t) / b.T, al = Math.max(0, 1 - p), x = px(b.x), y = py(b.y), top = y - Math.max(ch, 420) * 1.1;
      c.globalCompositeOperation = 'lighter';
      const fl = Math.random() < 0.6 ? 1 : 0.4;
      bolt(c, x + (Math.sin(b.s) * 40), top, x, y, b.s, b.big ? 12 : 6, `rgba(${COL},${0.5 * al * fl})`);
      bolt(c, x + (Math.sin(b.s) * 40), top, x, y, b.s, b.big ? 5 : 2.4, `rgba(255,250,255,${0.95 * al * fl})`);
      if (b.big) { c.fillStyle = `rgba(${COL},${0.35 * al})`; c.fillRect(x - 28, top, 56, y - top); }
      const g = c.createRadialGradient(x, y, 1, x, y, T * (b.big ? 4 : 2)); g.addColorStop(0, `rgba(255,240,255,${0.8 * al})`); g.addColorStop(1, `rgba(${COL},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, T * (b.big ? 4 : 2), 0, 7); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
    if (HW.flash > 0.01) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(190,150,255,${HW.flash * 0.5})`; c.fillRect(0, 0, cw, ch); }
    c.restore();
  });
})();
