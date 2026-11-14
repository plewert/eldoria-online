'use strict';
/* Fases de jefe (cliente): cartel de fase, temblor, aura, zonas rojas con NÚMERO de cuenta atrás, líneas, saltos, charcos y «refugios».
   Solo visual: el servidor decide el daño. Para quitarlo: borrar este archivo y su <script>. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const AN = [], AURA = new Map(); const SEEN = new Set();
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const glow = (c, x, y, r, col, al) => { const g = c.createRadialGradient(x, y, 1, x, y, Math.max(2, r)); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, Math.max(2, r), 0, 7); c.fill(); };
  const ring = (c, x, y, r, col, w, al) => { c.strokeStyle = `rgba(${col},${al})`; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, Math.max(1, r), Math.max(1, r) * 0.8, 0, 0, 7); c.stroke(); };
  const num = (left) => (left >= 1 ? String(Math.ceil(left)) : Math.max(0, left).toFixed(1));
  const text = (c, s, x, y, sz, col) => { c.font = `bold ${sz}px sans-serif`; c.textAlign = 'center'; c.lineWidth = Math.max(3, sz / 5); c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); };
  const ADD = (k, f, T) => AN.push({ k, t: performance.now(), T: T || f.T || 800, f, fx: f.x, fy: f.y });

  // cartel de fase (DOM, sobre el juego)
  const st = document.createElement('style');
  st.textContent = '#phBanner{position:fixed;left:0;right:0;top:22%;z-index:60;pointer-events:none;text-align:center;opacity:0;padding:14px 0;background:linear-gradient(90deg,transparent,rgba(0,0,0,.62) 18%,rgba(0,0,0,.62) 82%,transparent)}#phBanner b{display:block;font:900 clamp(26px,6vw,54px)/1.1 sans-serif;letter-spacing:2px;text-shadow:0 0 18px currentColor,0 3px 0 #000}#phBanner span{display:block;margin-top:6px;font:600 clamp(13px,2.4vw,22px) sans-serif;color:#ffe9c8;text-shadow:0 2px 0 #000}#phBanner.on{animation:phb 2.6s ease-out forwards}@keyframes phb{0%{opacity:0;transform:scale(1.25)}12%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0}}';
  document.head.appendChild(st);
  const bn = document.createElement('div'); bn.id = 'phBanner'; document.body.appendChild(bn);
  X.handlers.ph_banner = (m) => {
    bn.classList.remove('on'); void bn.offsetWidth;
    bn.innerHTML = ''; const b = document.createElement('b'), s = document.createElement('span'); b.textContent = m.big; b.style.color = `rgb(${m.col})`; s.textContent = `${m.name} · ${m.sub}`; bn.append(b, s); bn.classList.add('on');
  };

  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AN.length - 1; i >= 0; i--) if (now - AN[i].t > AN[i].T + 50) AN.splice(i, 1);
    if (f.lid) { if (SEEN.has(f.lid)) return; SEEN.add(f.lid); if (SEEN.size > 40) SEEN.delete(SEEN.values().next().value); }
    switch (f.k) {
      case 'ph_zone': case 'ph_lane': case 'ph_safe': ADD(f.k, f); break;
      case 'ph_pool': ADD('ph_pool', f, f.T); break;
      case 'ph_beam': ADD('ph_beam', f, 500); G.shake = { t: now, m: 4 }; break;
      case 'ph_hit': ADD('ph_hit', f, 650); X.burst(f.x, f.y, 'fire', f.big ? 22 : 12, { sp: 4.5, up: 3, g: 3, life: 0.6, size: 3 }); G.shake = { t: now, m: Math.min(9, 3 + f.r * (f.big ? 0.9 : 0.5)) }; if (f.ring) X.ring(f.x, f.y, 'dark', 560, f.r * 20, 4); break;
      case 'ph_shift':
        AURA.set(f.id, { ph: f.ph, col: f.col }); ADD('ph_shift', f, f.T + 300);
        G.shake = { t: now, m: 9 }; X.ring(f.x, f.y, 'arcane', 900, 120, 5); X.ring(f.x, f.y, 'fire', 700, 80, 4); X.burst(f.x, f.y, 'fire', 36, { sp: 6, up: 4, g: 2, life: 1, size: 3.4 });
        break;
      default: break;
    }
  });

  const zoneXY = (b, now) => {                                                                       // centro de la zona (sigue al jefe / al jugador marcado hasta 450 ms antes)
    const f = b.f; let x = f.x, y = f.y;
    if (f.follow) { const e = G.ents.get(f.follow); if (e) { x = e.rx !== undefined ? e.rx : e.x; y = e.ry !== undefined ? e.ry : e.y; return [X.sxOf(x) + X.TS / 2, X.syOf(y) + X.TS / 2]; } }
    if (f.track && now - b.t < f.T - 450) { const e = G.ents.get(f.track); if (e) { b.fx = e.rx !== undefined ? e.rx : e.x; b.fy = e.ry !== undefined ? e.ry : e.y; } }
    return [px(b.fx !== undefined ? b.fx : x), py(b.fy !== undefined ? b.fy : y)];
  };

  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f, col = f.col || '255,90,40', pu = 0.5 + 0.5 * Math.sin(now / 70);
      if (b.k === 'ph_zone') {
        const [x, y] = zoneXY(b, now), r = f.r * TS;
        c.save(); c.fillStyle = `rgba(${col},${0.12 + 0.16 * p + 0.08 * pu})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        c.fillStyle = `rgba(${col},${0.2 + 0.25 * p})`; c.beginPath(); c.ellipse(x, y, r * p, r * p * 0.8, 0, 0, 7); c.fill();
        ring(c, x, y, r, col, 3.2, 0.7 + 0.3 * pu); ring(c, x, y, r * (0.15 + 0.85 * p), '255,235,190', 2, 0.9);
        c.restore();
      } else if (b.k === 'ph_lane') {
        const x1 = px(f.x1), y1 = py(f.y1), x2 = px(f.x2), y2 = py(f.y2);
        c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(${col},${0.12 + 0.22 * p + 0.06 * pu})`; c.lineWidth = f.w * 2 * TS; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = `rgba(255,235,190,${0.5 + 0.4 * pu})`; c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = -now / 25; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); c.restore();
      } else if (b.k === 'ph_pool') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, fade = p > 0.8 ? (1 - p) / 0.2 : 1;
        c.save(); c.fillStyle = `rgba(${col},${(0.22 + 0.1 * pu) * fade})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill(); ring(c, x, y, r, col, 2.4, 0.8 * fade);
        c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 0.9, col, 0.3 * fade); c.restore();
      } else if (b.k === 'ph_safe') {
        const cx = px(f.x), cy = py(f.y), r = f.R * TS; c.save(); c.beginPath(); c.ellipse(cx, cy, r, r * 0.8, 0, 0, 7);
        for (const s of f.safe) { c.moveTo(px(s[0]) + s[2] * TS, py(s[1])); c.ellipse(px(s[0]), py(s[1]), s[2] * TS, s[2] * TS * 0.8, 0, 0, 7); }
        c.fillStyle = `rgba(${col},${0.16 + 0.26 * p + 0.07 * pu})`; c.fill('evenodd'); ring(c, cx, cy, r, col, 3, 0.8);
        for (const s of f.safe) { ring(c, px(s[0]), py(s[1]), s[2] * TS, '140,255,170', 3, 0.95); glow(c, px(s[0]), py(s[1]), s[2] * TS, '120,255,160', 0.2 + 0.1 * pu); }
        c.restore();
      } else if (b.k === 'ph_hit') {
        const x = px(f.x), y = py(f.y), r = f.r * TS;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r, col, 0.55 * (1 - p)); ring(c, x, y, r * (0.4 + 0.6 * p), '255,235,190', 4 * (1 - p) + 1, 1 - p); c.restore();
      }
    }
  });

  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const b of AN) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f, left = (b.T - (now - b.t)) / 1000;
      if (b.k === 'ph_zone') { const [x, y] = zoneXY(b, now); c.save(); text(c, num(left), x, y + 12, 34 + (left < 1 ? 6 : 0), left < 1 ? '#ff9a8a' : '#fff'); if (f.lb && p < 0.9) text(c, f.lb, x, y - f.r * TS * 0.8 - 8, 15, '#ffe2b0'); c.restore(); }
      else if (b.k === 'ph_safe') {
        const cx = px(f.x), cy = py(f.y); c.save();
        for (const s of f.safe) text(c, 'SEGURO', px(s[0]), py(s[1]) + 5, 14, '#a8ffc0');
        text(c, `${f.lb} · ${num(left)}`, cx, cy - f.R * TS * 0.8 - 12, 22, '#fff'); c.restore();
      } else if (b.k === 'ph_lane') { if (f.lb) { const x = px(f.x2), y = py(f.y2); c.save(); text(c, num(left), px((f.x1 + f.x2) / 2), py((f.y1 + f.y2) / 2) + 10, 28, '#fff'); text(c, f.lb, x, y - 8, 14, '#ffe2b0'); c.restore(); } else { c.save(); text(c, num(left), px((f.x1 + f.x2) / 2), py((f.y1 + f.y2) / 2) + 10, 24, '#fff'); c.restore(); } }
      else if (b.k === 'ph_beam') {
        const x1 = px(f.x1), y1 = py(f.y1) - 14, x2 = px(f.x2), y2 = py(f.y2) - 8, al = 1 - p; c.save(); c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(${f.col},${0.6 * al})`; c.lineWidth = f.w * 2 * TS * (0.6 + 0.4 * al); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = `rgba(255,255,255,${0.9 * al})`; c.lineWidth = 5; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
      } else if (b.k === 'ph_shift') {
        const e = G.ents.get(f.id); if (!e) continue; const x = X.sxOf(e.rx !== undefined ? e.rx : e.x) + TS / 2, y = X.syOf(e.ry !== undefined ? e.ry : e.y) + TS - 40, fade = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 70 + 130 * p, '255,255,255', 0.45 * fade); glow(c, x, y, 120 * (0.4 + p), f.col, 0.5 * fade); c.restore();
      }
    }
    // aura de la fase mientras el jefe siga en pantalla
    for (const [id, a] of AURA) {
      const e = G.ents.get(id); if (!e) { AURA.delete(id); continue; }
      const x = X.sxOf(e.rx !== undefined ? e.rx : e.x) + TS / 2, y = X.syOf(e.ry !== undefined ? e.ry : e.y) + TS - 20, k = a.ph === 3 ? 1 : 0.55, pu = 0.6 + 0.4 * Math.sin(now / (a.ph === 3 ? 160 : 300));
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y - 30, (a.ph === 3 ? 150 : 110), a.col, 0.16 * k * pu); ring(c, x, y, 80 + 12 * pu, a.col, 2, 0.35 * k); c.restore();
    }
  });
})();
