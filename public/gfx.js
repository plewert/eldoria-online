'use strict';
/* Efectos visuales opcionales: sombras con la hora del día, luces cálidas, rayos de sol, partículas,
   viñeta y gradación de color. Tres niveles (✨ junto al botón de sonido): Completo, Básico y Apagado.
   Todo es visual en el cliente; en teléfono arranca en Básico para cuidar la batería. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $, store } = X;
  const TS = 32;
  const touch = (() => { try { return 'ontouchstart' in window || matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } })();
  let lvl = store.get('eldoria.gfx'); lvl = lvl === '0' || lvl === '1' || lvl === '2' || lvl === '3' ? +lvl : (touch ? 1 : 2);
  if (window.EldSafe && window.EldSafe.on()) lvl = 0;
  const NAMES = ['Apagados', 'Básicos (sombras, viñeta y color)', 'Completos (luces, rayos de sol y partículas)', 'Cinematográficos (además: bloom, reflejos, profundidad de campo y color; exigente)'], ICON = ['🚫', '🔅', '✨', '🎬'];

  const btn = el('button', 'sndbtn gfxbtn'); btn.type = 'button';
  const label = () => { btn.textContent = ICON[lvl]; btn.title = 'Efectos visuales: ' + NAMES[lvl] + ' — pulsa para cambiar'; btn.setAttribute('aria-label', btn.title); };
  btn.addEventListener('click', () => { lvl = (lvl + 3) % 4; store.set('eldoria.gfx', String(lvl)); label(); });
  label();
  const mount = () => { const st = $('#stage'); if (st && !btn.parentNode) st.append(btn); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount();
  X.gfx = { level: () => lvl, set: (v) => { lvl = v == null ? (touch ? 1 : 2) : v; label(); } };

  const hour = () => (X.env ? X.env.hour() : 12);
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const nightK = (h) => h >= 12 ? smooth(17.5, 20.5, h) : 1 - smooth(5, 7.5, h);   // 0 de día, 1 de noche
  const scale = (c, cw) => c.canvas.width / cw;
  const cen = (cw, ch, x, y) => [(x - G.cam.x) * TS + cw / 2, (y - G.cam.y) * TS + ch / 2];

  const soft = (c, x, y, rx, ry, a) => {            // sombra suave
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(10,8,25,${a})`); g.addColorStop(1, 'rgba(10,8,25,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
  };
  /* sombras proyectadas por el sol: largas y hacia el oeste por la mañana, hacia el este por la tarde */
  X.on('under', (c, now, cw, ch) => {
    if (!lvl || !G.me) return;
    const z = X.zoneAt ? X.zoneAt(G.me.x, G.me.y) : {}; if (z.kind === 'dungeon') return;
    const h = hour(), n = nightK(h), dir = Math.max(-1, Math.min(1, (h - 12.5) / 6)), a = 0.55 * (1 - n * 0.8), len = 1 + Math.abs(dir) * 1.2;
    const cast = (x, y, r) => {
      if (x < -60 || y < -60 || x > cw + 60 || y > ch + 60) return;
      soft(c, x + dir * r * 0.9, y, r * len, r * 0.42, a);
      soft(c, x, y, r * 0.8, r * 0.3, a * 0.8);
    };
    for (const n2 of G.npcs) { const [x, y] = cen(cw, ch, n2.x, n2.y); cast(x, y + 12, 12); }
    for (const e of G.ents.values()) { const [x, y] = cen(cw, ch, e.rx, e.ry); cast(x, y + 12, e.kind === 'mo' && G.mons[e.t] && G.mons[e.t].boss ? 26 : 11); }
  });

  let vg = null, vk = '';
  const motes = Array.from({ length: 46 }, (_, i) => ({ x: (i * 0.6180339) % 1, y: (i * 0.3247) % 1, p: i * 1.7, s: 0.5 + ((i * 37) % 10) / 10 }));
  X.on('draw', (c, now, cw, ch, dt, tx, ty) => {
    if (!lvl || !G.me) return;
    const z = X.zoneAt ? X.zoneAt(G.me.x, G.me.y) : {}, dun = z.kind === 'dungeon';
    const h = hour(), n = nightK(h), W = X.env ? X.env.weather() : { kind: null, k: 0 }, wet = W.kind === 'rain' ? W.k : 0, fog = W.kind === 'fog' ? W.k : 0;
    const k = scale(c, cw);
    c.save(); c.setTransform(k, 0, 0, k, 0, 0);
    // --- luces cálidas (solo completo): jugador, PNJ, portales y otros jugadores; más fuertes al anochecer ---
    if (lvl >= 2) {
      c.globalCompositeOperation = 'screen';
      const glow = (x, y, r, col, a) => {
        if (x < -r || y < -r || x > cw + r || y > ch + r) return;
        const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const lit = dun ? 0.7 : 0.22 + 0.5 * n, fl = 1 + Math.sin(now / 130 + 1) * 0.04 + Math.sin(now / 53) * 0.03;
      const [px, py] = cen(cw, ch, tx, ty); glow(px, py - 4, 84 * fl, '255,200,120', 0.15 * lit);
      for (const p of G.npcs) { const [x, y] = cen(cw, ch, p.x, p.y); glow(x, y - 6, 78 * fl, '255,190,110', 0.5 * lit); }
      for (const p of G.portals) { const [x, y] = cen(cw, ch, p.x, p.y); glow(x, y, 56, /PvP/.test(p.label) ? '255,90,70' : '140,160,255', 0.32 + 0.1 * Math.sin(now / 300)); }
      for (const e of G.ents.values()) if (e.kind === 'pl' && e.id !== G.id) { const [x, y] = cen(cw, ch, e.rx, e.ry); glow(x, y - 6, 60, '255,210,140', 0.2 * lit); }
      // rayos de sol (de día y sin tormenta)
      const day = (1 - n) * (1 - wet * 0.8) * (dun ? 0 : 1) * (1 - fog * 0.5);
      if (day > 0.05) {
        const dr = (h - 12.5) / 6, ang = -0.5 - dr * 0.25;
        for (let i = 0; i < 6; i++) {
          const x0 = ((i * 0.19 + now / 90000) % 1.3) * cw - 0.15 * cw, w = 22 + (i % 3) * 18;
          c.save(); c.translate(x0, -30); c.rotate(ang);
          const g = c.createLinearGradient(0, 0, 0, ch * 1.4); g.addColorStop(0, `rgba(255,228,160,${0.1 * day * (0.7 + 0.3 * Math.sin(now / 2500 + i))})`); g.addColorStop(1, 'rgba(255,228,160,0)');
          c.fillStyle = g; c.fillRect(0, 0, w, ch * 1.4); c.restore();
        }
      }
      // polvo de luz de día; luciérnagas de noche
      const fly = n > 0.5 && !dun && z.id !== 'dunas' && !wet;
      if (!dun || z.dark) for (const m of motes) {
        const x = ((m.x + Math.sin(now / 4000 * m.s + m.p) * 0.03 + now / 160000 * m.s) % 1) * cw, y = ((m.y + Math.cos(now / 5000 * m.s + m.p) * 0.04 - now / 300000 * m.s + 1) % 1) * ch;
        const tw = 0.5 + 0.5 * Math.sin(now / (fly ? 600 : 1100) * m.s + m.p), r = fly ? 2 + tw * 2 : 1 + tw * 1.4;
        const g = c.createRadialGradient(x, y, 0, x, y, r * 4); const col = fly ? '190,255,120' : '255,236,180';
        g.addColorStop(0, `rgba(${col},${(fly ? 0.9 : 0.5) * tw * (fly ? 1 : 1 - n)})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 4, 0, 7); c.fill();
      }
    }
    // --- gradación de color: sol dorado y sombras azuladas ---
    if (!dun) {
      c.globalCompositeOperation = 'soft-light';
      const g = c.createLinearGradient(0, 0, cw, ch);
      g.addColorStop(0, `rgba(255,190,100,${0.4 * (1 - n)})`); g.addColorStop(1, `rgba(80,100,210,${0.2 + 0.1 * n})`);
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    // --- viñeta ---
    c.globalCompositeOperation = 'source-over';
    const key = cw + 'x' + ch; if (key !== vk) { vk = key; vg = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.36, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.55); vg.addColorStop(0, 'rgba(8,6,20,0)'); vg.addColorStop(1, 'rgba(8,6,20,0.58)'); }
    c.fillStyle = vg; c.fillRect(0, 0, cw, ch);
    c.restore();
  });
})();
