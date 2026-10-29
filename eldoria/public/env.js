'use strict';
/* Ciclo de día y noche, antorchas y clima (lluvia, nieve, niebla). Todo es visual y sale del reloj real,
   así todos los jugadores ven la misma hora y el mismo tiempo. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $ } = X;
  const DAY_MS = 24 * 60 * 1000;                          // un día del juego dura 24 minutos reales
  const gameHour = () => ((Date.now() % DAY_MS) / DAY_MS) * 24;
  const lerp = (a, b, t) => a + (b - a) * t;

  /** [alfa de oscuridad, r, g, b] según la hora */
  function tone(h) {
    const K = [[0, .66, 8, 14, 42], [5, .62, 10, 16, 46], [6.5, .30, 90, 50, 70], [8, 0, 0, 0, 0], [17, 0, 0, 0, 0], [18.5, .28, 120, 60, 40], [20, .56, 14, 18, 52], [24, .66, 8, 14, 42]];
    for (let i = 0; i < K.length - 1; i++) if (h >= K[i][0] && h <= K[i + 1][0]) {
      const t = (h - K[i][0]) / (K[i + 1][0] - K[i][0]), a = K[i], b = K[i + 1];
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t), lerp(a[4], b[4], t)];
    }
    return [0, 0, 0, 0];
  }
  const hash = (n) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const SLOT = 5 * 60 * 1000;
  /** { kind: 'rain' | 'fog' | null, k: intensidad 0..1 } */
  function weather() {
    const now = Date.now(), s = Math.floor(now / SLOT), f = (now % SLOT) / SLOT;
    const r = hash(s), edge = Math.min(1, f / 0.08, (1 - f) / 0.08);
    if (r < 0.22) return { kind: 'rain', k: edge * (0.55 + 0.45 * hash(s + 9)) };
    // la niebla / nublado se quitó: los degradados grandes hacían bajar los fps en teléfonos y PC
    return { kind: null, k: 0 };
  }

  const lc = document.createElement('canvas'), lx = lc.getContext('2d');
  let drops = [], flash = 0, nextBolt = performance.now() + 8000, lastRain = -1;

  // reloj en pantalla
  const clock = el('div', 'clock'); clock.setAttribute('aria-live', 'off');
  const mount = () => { const st = $('#stage'); if (st && !clock.parentNode) st.append(clock); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount();

  X.env = { hour: gameHour, weather };
  X.on('draw', (c, now, cw, ch, dt, tx, ty) => {
    if (!G.me || !G.zones.length) return;
    const z = X.zoneAt(G.me.x, G.me.y), h = gameHour(), W = weather(), TS = 32;
    const indoors = z.kind === 'dungeon';
    const snow = z.id === 'cumbres', desert = z.id === 'dunas';
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    const icon = indoors ? '🕯️' : h >= 6.5 && h < 18.5 ? '☀️' : h >= 18.5 && h < 20 || h >= 5 && h < 6.5 ? '🌇' : '🌙';
    const wi = indoors ? '' : W.kind === 'rain' && !desert ? (snow ? ' ❄️' : ' 🌧️') : W.kind === 'fog' ? ' 🌫️' : '';
    const txt = `${icon} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${wi}`;
    if (clock.textContent !== txt) clock.textContent = txt;
    const cave = !!z.dark;
    if (indoors && !cave) { if (lastRain !== 0) { lastRain = 0; X.setRain && X.setRain(0); } return; }

    // --- noche / ocaso con luces alrededor del jugador, las antorchas y otros jugadores ---
    const [a0, r, g, b] = cave ? [0.9, 6, 3, 14] : tone(h);
    const wet = W.kind === 'rain' && !desert ? W.k : 0, fog = W.kind === 'fog' ? W.k : 0;
    const a = cave ? 0.8 : Math.min(0.78, a0 + 0.14 * wet + 0.08 * fog);
    if (a > 0.01) {
      const sc = 0.5, w = Math.ceil(cw * sc), hgt = Math.ceil(ch * sc);
      if (lc.width !== w || lc.height !== hgt) { lc.width = w; lc.height = hgt; }
      lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, w, hgt);
      lx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`; lx.fillRect(0, 0, w, hgt);
      lx.globalCompositeOperation = 'destination-out';
      const hole = (x, y, rad, k) => {
        const gr = lx.createRadialGradient(x * sc, y * sc, rad * sc * 0.15, x * sc, y * sc, rad * sc);
        gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = gr; lx.beginPath(); lx.arc(x * sc, y * sc, rad * sc, 0, 7); lx.fill();
      };
      const px = (tx - G.cam.x) * TS + cw / 2, py = (ty - G.cam.y) * TS + ch / 2 - 6;
      const lit = cave || a0 > 0.12 ? 1 : 0.5 * (a0 / 0.12);
      hole(px, py, (cave ? 190 : 120) + 14 * Math.min(4, G.me.v || 0), 0.85 * Math.max(0.2, lit));
      for (const e of G.ents.values()) if (e.kind === 'pl' && e.id !== G.id) hole((e.rx - G.cam.x) * TS + cw / 2, (e.ry - G.cam.y) * TS + ch / 2 - 6, 70, 0.8 * lit);
      if (cave) for (const e of G.ents.values()) if (e.kind === 'mo' && G.mons[e.t] && G.mons[e.t].boss) hole((e.rx - G.cam.x) * TS + cw / 2, (e.ry - G.cam.y) * TS + ch / 2 - 30, 150, 0.9);   // el jefe de la cueva se ve de lejos
      for (const n of G.npcs) hole((n.x - G.cam.x) * TS + cw / 2 + TS / 2 - 16, (n.y - G.cam.y) * TS + ch / 2, 90, 0.85 * lit);
      for (const p of G.portals) hole((p.x - G.cam.x) * TS + cw / 2, (p.y - G.cam.y) * TS + ch / 2, 80, 0.8 * lit);
      c.drawImage(lc, 0, 0, w, hgt, 0, 0, cw, ch);
      // brillo cálido de las fuentes de luz
      if (a0 > 0.1) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const warm = (x, y, rad, k) => { const gr = c.createRadialGradient(x, y, 2, x, y, rad); gr.addColorStop(0, `rgba(255,170,80,${k})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
        for (const n of G.npcs) warm((n.x - G.cam.x) * TS + cw / 2 + TS / 2 - 16, (n.y - G.cam.y) * TS + ch / 2, 46, 0.18 * a0 / 0.6);
        for (const p of G.portals) warm((p.x - G.cam.x) * TS + cw / 2, (p.y - G.cam.y) * TS + ch / 2, 40, 0.22 * a0 / 0.6);
        c.restore();
      }
    }

    // --- niebla ---
    if (fog > 0.02) {
      c.save();
      for (let i = 0; i < 6; i++) {
        const x = ((now / (60 + i * 17) + i * 220) % (cw + 600)) - 300, y = ch * (0.15 + 0.15 * i) + Math.sin(now / 3000 + i) * 20;
        const gr = c.createRadialGradient(x, y, 10, x, y, 320); gr.addColorStop(0, `rgba(215,222,230,${0.32 * fog})`); gr.addColorStop(1, 'rgba(215,222,230,0)');
        c.fillStyle = gr; c.fillRect(x - 320, y - 320, 640, 640);
      }
      c.fillStyle = `rgba(200,208,218,${0.14 * fog})`; c.fillRect(0, 0, cw, ch);
      c.restore();
    }
    // --- lluvia o nieve ---
    const kind = wet > 0.02 || (snow && W.kind === 'rain') ? (snow ? 'snow' : 'rain') : null;
    const inten = kind ? (snow ? W.k : wet) : 0;
    const want = kind ? Math.round(inten * Math.min(240, cw * ch / 5200)) : 0;
    while (drops.length < want) drops.push({ x: Math.random() * (cw + 80), y: Math.random() * ch, l: 8 + Math.random() * 10, v: 520 + Math.random() * 260, s: Math.random() });
    if (drops.length > want) drops.length = want;
    if (kind) {
      c.save();
      if (kind === 'rain') {
        c.strokeStyle = 'rgba(190,210,255,.5)'; c.lineWidth = 1; c.beginPath();
        for (const d of drops) {
          d.y += d.v * dt; d.x -= d.v * dt * 0.22;
          if (d.y > ch) { d.y = -10; d.x = Math.random() * (cw + 80); }
          if (d.x < -20) d.x += cw + 60;
          c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * 0.22, d.y - d.l);
        }
        c.stroke();
        c.fillStyle = `rgba(30,50,90,${0.12 * inten})`; c.fillRect(0, 0, cw, ch);
      } else {
        c.fillStyle = 'rgba(255,255,255,.85)';
        for (const d of drops) {
          d.y += (40 + d.s * 50) * dt; d.x += Math.sin(now / 700 + d.s * 9) * 18 * dt;
          if (d.y > ch) { d.y = -6; d.x = Math.random() * cw; }
          c.fillRect(d.x, d.y, 2 + d.s * 1.5, 2 + d.s * 1.5);
        }
      }
      c.restore();
      // relámpagos en tormentas fuertes
      if (kind === 'rain' && inten > 0.7) {
        const t = performance.now();
        if (t > nextBolt) { flash = 1; X.bolt && X.bolt(); nextBolt = t + 9000 + Math.random() * 14000; setTimeout(() => X.sfx && X.sfx('thunder'), 400 + Math.random() * 600); }
      }
    }
    if (flash > 0.02) { c.fillStyle = `rgba(235,240,255,${flash * 0.55})`; c.fillRect(0, 0, cw, ch); flash *= Math.pow(0.04, dt); }
    const rl = Math.round(inten * 10);
    if (rl !== lastRain) { lastRain = rl; X.setRain && X.setRain(kind === 'rain' ? inten : 0); }
  });
})();
