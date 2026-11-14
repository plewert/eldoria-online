'use strict';
/* Mejoras visuales de combate (solo cliente): anillo de enfriamiento de los poderes alrededor del personaje, números de daño con color
   y tamaño por elemento, y muerte de monstruos con partículas según su tipo. Se apaga con F8 (localStorage "eldoria.combate"). */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X, TS = 32;
  let ONu = true; try { ONu = localStorage.getItem('eldoria.combate') !== '0'; } catch (e) { /* sin storage */ }
  const Q = () => (ONu ? (X.perf ? X.perf.q('combate') : 2) : 0);

  /* ---------- anillo de enfriamiento ---------- */
  const cds = new Map();                                     // id del poder -> { t0, t1 }
  let readyFlash = 0;
  const hookCd = () => {
    if (!X.handlers || !X.handlers.skcd || X.handlers.skcd.__rf) return;
    const orig = X.handlers.skcd;
    X.handlers.skcd = (m) => { const now = performance.now(); cds.set(m.id, { t0: now, t1: now + m.ms }); return orig(m); };
    X.handlers.skcd.__rf = true;
  };
  function ring(c, now, cw, ch) {
    hookCd(); const e = G.ents.get(G.id); if (!e) return;
    let best = null;
    for (const [id, v] of cds) { if (now >= v.t1) { if (now - v.t1 < 350) readyFlash = Math.max(readyFlash, 1 - (now - v.t1) / 350); cds.delete(id); continue; } if (!best || v.t1 < best.t1) best = v; }
    const cx = (e.rx - G.cam.x) * TS + cw / 2, cy = (e.ry - G.cam.y) * TS + ch / 2 + 13;
    if (best) {
      const k = (now - best.t0) / (best.t1 - best.t0);
      c.save(); c.translate(cx, cy); c.scale(1, 0.4); c.lineCap = 'round';
      c.strokeStyle = 'rgba(20,20,30,.5)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 17, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(255,170,60,.95)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke();
      c.restore();
    }
    if (readyFlash > 0.02) {                                                                // ¡listo!
      c.save(); c.translate(cx, cy); c.scale(1, 0.4); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(150,240,255,${readyFlash})`; c.lineWidth = 3 + (1 - readyFlash) * 4; c.beginPath(); c.arc(0, 0, 17 + (1 - readyFlash) * 10, 0, 7); c.stroke(); c.restore();
      readyFlash *= 0.9;
    }
  }

  /* ---------- números de daño por elemento ---------- */
  const COLS = { fire: '#ff9a3a', ice: '#8fdcff', poison: '#9be84a', storm: '#fff06a', arcane: '#c89bff', dark: '#b58cff', water: '#5fd8ee', sun: '#ffe08a' };
  const SZ = { fire: 1.15, ice: 1.1, storm: 1.2, poison: 1.0, arcane: 1.1, dark: 1.1, water: 1.05, sun: 1.15 };
  const hits = [], seen = new WeakSet();
  const elOfProj = (p) => p.el && COLS[p.el] ? p.el : null;
  function numbers(now) {
    for (const p of G.proj) if (!seen.has(p)) { seen.add(p); const el = elOfProj(p); if (el) hits.push({ x: p.x2, y: p.y2, el, t: p.t + p.T }); }
    while (hits.length && now - hits[0].t > 900) hits.shift();
    for (const t of G.texts) {
      if (t.rf || !/^\d/.test(String(t.v))) continue; t.rf = 1;
      const h = hits.find((q) => Math.abs(q.t - now) < 500 && Math.hypot(q.x - t.x, q.y - t.y) < 1.1);
      if (h && t.c === 'p' || h && t.c === 'm') { t.col = COLS[h.el]; t.sz = SZ[h.el] || 1; if (X.burst) X.burst(t.x, t.y - 0.4, h.el, 3, { sp: 1.4, up: 1.5, life: 0.5, size: 2 }); }
    }
  }

  /* ---------- muerte de monstruos por tipo ---------- */
  const KIND = [
    [/fuego|lava|magma|infern|llama|f[eé]nix|demon|diablo|ifrit/i, 'fire'], [/hielo|escarcha|nieve|glaci|yeti|helad/i, 'ice'],
    [/veneno|ara[nñ]a|serpiente|v[ií]bora|hidra|pantano|limo|slime|[aá]cido|escorpi/i, 'poison'], [/rayo|tormenta|trueno|zeus|el[eé]ctric/i, 'storm'],
    [/sombra|oscur|espectro|fantasma|vampiro|hades|abismo|nigro|muerte|alma/i, 'dark'], [/esqueleto|hueso|momia|zombi|lich|calavera/i, 'bone'],
    [/arcano|mago|cristal|hechic|brujo/i, 'arcane'], [/agua|pulpo|cangrejo|pez|leviat|sirena|medusa|tibur/i, 'water'],
    [/sol|dorad|[aá]ngel|seraf|santo|celest/i, 'sun'], [/golem|roca|piedra|titan|t[ií]tan|trol/i, 'stone'],
  ];
  const kindOf = (name) => { for (const [re, k] of KIND) if (re.test(name)) return k; return null; };
  function deaths() {
    for (const g of G.ghosts) {
      if (g.rf) continue; g.rf = 1; const e = g.e, d = G.mons[e.t]; if (!d) continue;
      const k = kindOf(d.name || ''), boss = !!d.boss, x = e.rx, y = e.ry - 0.3, n = boss ? 2 : 1;
      if (k === 'bone') { X.burst(x, y, null, 14 * n, { sp: 3.5, up: 2.8, g: 9, life: 0.9, size: 3, sq: true, add: false, b: e.ry + 0.3 }); X.burst(x, y, 'stone', 8 * n, { sp: 1.3, up: 1, life: 1.1, size: 4, add: false }); }
      else if (k === 'fire') { X.burst(x, y, 'fire', 18 * n, { sp: 3, up: 3.2, life: 1, size: 3, wv: 1 }); X.ring(x, y, 'fire', 520, 14, 3); }
      else if (k === 'ice') { X.burst(x, y, 'ice', 16 * n, { sp: 3.6, up: 2.4, g: 8, life: 0.9, size: 3.4, sq: true, b: e.ry + 0.3 }); X.ring(x, y, 'ice', 480, 12, 2); }
      else if (k === 'poison') { X.burst(x, y, 'poison', 14 * n, { sp: 1.1, up: 2, life: 1.4, size: 4.2, ci: true }); }
      else if (k === 'storm') { X.burst(x, y, 'storm', 16 * n, { sp: 5, life: 0.45, size: 2.2 }); X.ring(x, y, 'storm', 380, 10, 3); }
      else if (k) { X.burst(x, y, k, 14 * n, { sp: 3, up: 1.6, life: 0.9, size: 3 }); X.ring(x, y, k, 460, 12, 2); }
      else X.burst(x, y, null, 8 * n, { sp: 2.4, up: 1.4, g: 4, life: 0.6, size: 2.4, add: false });
    }
  }
  X.on('draw', (c, now, cw, ch) => { const q = Q(); if (!q || !G.me) return; ring(c, now, cw, ch); if (q >= 2) { numbers(now); deaths(); } });
  window.addEventListener('keydown', (e) => { if (e.key === 'F8') { e.preventDefault(); ONu = !ONu; try { localStorage.setItem('eldoria.combate', ONu ? '1' : '0'); } catch (x) { /* nada */ } if (X.toast) X.toast(ONu ? 'Efectos de combate: activados (F8)' : 'Efectos de combate: desactivados (F8)'); } });
})();
