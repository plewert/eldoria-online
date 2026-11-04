'use strict';
/* Funciones del jugador (cliente): 📖 Álbum de colecciones (gemas, mascotas, monturas y armas conseguidas), 🙂 Emotes visibles para los demás,
   y animaciones de pesca (sedal, corcho, salpicadura) y minería (pico, chispas y barra de enfriamiento de la roca).
   Atajos: F3 álbum · F9 emotes · F10 apaga/enciende las animaciones de pesca y minería. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $ } = X, TS = 32;
  let ANIMu = true; try { ANIMu = localStorage.getItem('eldoria.anim') !== '0'; } catch (e) { /* sin storage */ }
  const animQ = () => (ANIMu && (!X.perf || X.perf.q('anim')) ? 1 : 0);

  const css = document.createElement('style');
  css.textContent = `
.pj-bar{position:absolute;right:10px;top:10px;z-index:6;display:flex;flex-direction:column;gap:4px}
.pj-bar .pj-more{display:none}body.touch .pj-bar{top:calc(158px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px))}body.touch .pj-bar button{width:30px;height:30px;font-size:14px;opacity:.6}
.pj-bar button{width:34px;height:34px;border-radius:6px;background:rgba(14,18,24,.78);border:1px solid var(--edge,#555);color:var(--bone,#eee);font-size:16px;cursor:pointer}
.pj-bar button:hover{border-color:var(--brass,#c9a24b)}
.pj-ov{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}
.pj-box{width:min(620px,calc(100vw - 20px));max-height:calc(100vh - 40px);overflow:auto;background:rgba(26,20,13,.98);border:1px solid #c9a24b;border-radius:12px;padding:14px 16px;color:#f1e6c8}
.pj-box h3{margin:0 0 8px;color:#ffd77a;font-size:20px;display:flex;justify-content:space-between;align-items:center}
.pj-box h3 button{background:none;border:0;color:#c9b98e;font-size:20px;cursor:pointer}
.pj-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.pj-tabs button{padding:5px 11px;border-radius:8px;border:1px solid #6d5a34;background:#3b3220;color:#f1e6c8;cursor:pointer;font-weight:700}
.pj-tabs button.on{background:#ffd77a;color:#1d1608;border-color:#ffd77a}
.pj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px}
.pj-it{position:relative;aspect-ratio:1;border-radius:8px;background:#2a2216;border:1px solid #4a3d22;display:flex;align-items:center;justify-content:center;font-size:24px}
.pj-it.have{border-color:#c9a24b;background:#3a2f1a}.pj-it canvas,.pj-it .gico{width:38px;height:38px;object-fit:contain}
.pj-it.miss>*{filter:brightness(0) opacity(.35)}
.pj-sub{color:#c9b98e;font-size:13px;margin:0 0 8px}
.pj-em{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.pj-em button{padding:10px 4px;border-radius:10px;border:1px solid #6d5a34;background:#3b3220;color:#f1e6c8;font-size:12px;cursor:pointer}.pj-em button span{display:block;font-size:26px}
.pj-em button:hover{border-color:#ffd77a}`;
  document.head.append(css);

  /* ---------- Álbum ---------- */
  const CATS = [['gem', '💎 Gemas'], ['pet', '🐾 Mascotas'], ['mount', '🐎 Monturas'], ['weapon', '⚔️ Armas']];
  let seen = new Set(), tab = 'gem', ov = null;
  const render = () => {
    if (!ov) return; const box = ov.querySelector('.pj-box'); box.textContent = '';
    const h = el('h3'); h.append(el('span', '', '📖 Álbum de colecciones'), (() => { const b = el('button', '', '✕'); b.type = 'button'; b.setAttribute('aria-label', 'Cerrar'); b.addEventListener('click', closeAll); return b; })()); box.append(h);
    const tabs = el('div', 'pj-tabs');
    for (const [k, label] of CATS) { const ids = Object.keys(G.items).filter((id) => G.items[id].type === k), have = ids.filter((id) => seen.has(id)).length; const b = el('button', k === tab ? 'on' : '', `${label} ${have}/${ids.length}`); b.type = 'button'; b.addEventListener('click', () => { tab = k; render(); }); tabs.append(b); }
    box.append(tabs);
    const ids = Object.keys(G.items).filter((id) => G.items[id].type === tab).sort((a, b) => (G.items[a].atk || 0) - (G.items[b].atk || 0) || G.items[a].name.localeCompare(G.items[b].name));
    box.append(el('p', 'pj-sub', 'Aparecen los objetos que has tenido alguna vez. Los demás son una silueta: ¡a conseguirlos!'));
    const grid = el('div', 'pj-grid');
    for (const id of ids) { const d = G.items[id], have = seen.has(id), c = el('div', 'pj-it ' + (have ? 'have' : 'miss')); c.title = have ? d.name : '???'; c.append(X.iconNode(id)); grid.append(c); }
    box.append(grid);
  };
  function closeAll() { if (ov) { ov.remove(); ov = null; } }
  function openAlbum() { closeAll(); ov = el('div', 'pj-ov'); ov.append(el('div', 'pj-box')); ov.addEventListener('click', (e) => { if (e.target === ov) closeAll(); }); document.body.append(ov); render(); X.send({ t: 'album' }); }
  X.openAlbum = openAlbum;
  X.handlers.album = (m) => { seen = new Set(m.seen || []); render(); };

  /* ---------- Emotes ---------- */
  const EM = [['saludar', '👋', 'Saludar'], ['bailar', '💃', 'Bailar'], ['sentarse', '🪑', 'Sentarse'], ['reir', '😂', 'Reír'], ['vitorear', '🎉', 'Vitorear'], ['reverencia', '🙇', 'Reverencia'], ['llorar', '😢', 'Llorar'], ['pensar', '🤔', 'Pensar']];
  function openEmotes() {
    closeAll(); ov = el('div', 'pj-ov'); const box = el('div', 'pj-box'); box.style.maxWidth = '420px'; ov.append(box);
    const h = el('h3'); h.append(el('span', '', '🙂 Emotes')); const x = el('button', '', '✕'); x.type = 'button'; x.addEventListener('click', closeAll); h.append(x); box.append(h);
    const g = el('div', 'pj-em');
    EM.forEach(([k, ic, nm], i) => { const b = el('button'); b.type = 'button'; b.append(el('span', '', ic), document.createTextNode(`${i + 1}. ${nm}`)); b.addEventListener('click', () => { X.send({ t: 'emote', e: k }); closeAll(); }); g.append(b); });
    box.append(g); ov.addEventListener('click', (e) => { if (e.target === ov) closeAll(); }); document.body.append(ov);
  }
  X.openEmotes = openEmotes;
  const mkBar = () => {
    const st = $('#stage'); if (!st || st.querySelector('.pj-bar')) return;
    const bar = el('div', 'pj-bar'); const a = el('button', 'pj-act', '📖'), e = el('button', 'pj-act', '🙂'), m = el('button', 'pj-more', '⋯');
    a.type = e.type = m.type = 'button'; a.title = 'Álbum de colecciones (F3)'; e.title = 'Emotes (F9)'; m.title = 'Álbum y emotes';
    let t0 = 0; m.addEventListener('click', () => { bar.classList.toggle('open'); clearTimeout(t0); if (bar.classList.contains('open')) t0 = setTimeout(() => bar.classList.remove('open'), 5000); });
    a.addEventListener('click', () => { bar.classList.remove('open'); openAlbum(); }); e.addEventListener('click', () => { bar.classList.remove('open'); openEmotes(); }); bar.append(m, a, e); st.append(bar);
    const apply = () => { const h = X.perf ? X.perf.hud() : 'visible'; bar.classList.toggle('compact', h === 'compact'); bar.classList.toggle('hidden', h === 'hidden'); if (h !== 'compact') bar.classList.remove('open'); };
    apply(); if (X.perf) X.perf.onChange(apply);
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(mkBar, 120)); if (document.readyState !== 'loading') setTimeout(mkBar, 120);
  X.on('key', (k, ev) => {
    if (!ev) return false;
    if (ev.key === 'F3') { ev.preventDefault(); ov ? closeAll() : openAlbum(); return true; }
    if (ev.key === 'F9') { ev.preventDefault(); ov ? closeAll() : openEmotes(); return true; }
    if (ev.key === 'F10') { ev.preventDefault(); ANIMu = !ANIMu; try { localStorage.setItem('eldoria.anim', ANIMu ? '1' : '0'); } catch (e) { /* nada */ } X.toast(ANIMu ? 'Animaciones de pesca y minería: activadas (F10)' : 'Animaciones de pesca y minería: desactivadas (F10)'); return true; }
    if (ev.key === 'Escape' && ov) { closeAll(); return true; }
    if (ov && /^[1-8]$/.test(ev.key) && ov.querySelector('.pj-em')) { X.send({ t: 'emote', e: EM[+ev.key - 1][0] }); closeAll(); return true; }
    return false;
  });

  /* ---------- dibujo: emotes, pesca y minería ---------- */
  const emotes = new Map(), lines = new Map(), mines = [];
  const EMI = Object.fromEntries(EM.map(([k, ic]) => [k, ic]));
  X.on('fx', (f) => {
    const now = performance.now();
    if (f.k === 'em') { emotes.set(f.i, { e: f.e, t: now }); if (f.e === 'vitorear') X.burst(f.x, f.y - 0.6, 'sun', 18, { sp: 3, up: 3, g: 4, life: 1, size: 2.4 }); if (f.e === 'bailar') X.burst(f.x, f.y - 0.8, 'arcane', 8, { sp: 1.2, up: 2, life: 1.1, size: 2.4 }); }
    else if (f.k === 'fc') lines.set(f.i, { x1: f.x, y1: f.y, x2: f.tx, y2: f.ty, t: now, bite: 0 });
    else if (f.k === 'fb') { const l = lines.get(f.i); if (l) { l.bite = now; X.burst(f.x, f.y, 'water', 10, { sp: 2.4, up: 3, g: 6, life: 0.6, size: 2.4 }); X.ring(f.x, f.y, 'water', 500, 10, 2); } }
    else if (f.k === 'fe') { const l = lines.get(f.i); if (l) { if (f.ok) X.burst(l.x2, l.y2, 'water', 16, { sp: 3, up: 4, g: 7, life: 0.7, size: 2.6 }); lines.delete(f.i); } }
    else if (f.k === 'mn') mines.push({ x: f.x, y: f.y, t: now, cd: f.cd || 1100, me: f.i === G.id });
  });
  const pos = (id) => { const e = G.ents.get(id); return e ? [e.rx, e.ry] : null; };
  X.on('draw', (c, now, cw, ch) => {
    if (!G.me) return;
    const sx = (x) => (x - G.cam.x) * TS + cw / 2, sy = (y) => (y - G.cam.y) * TS + ch / 2;
    for (const [id, em] of emotes) {                                                         // burbuja con el gesto sobre la cabeza
      const age = (now - em.t) / 1000, p = pos(id); if (age > 3 || !p) { if (age > 3) emotes.delete(id); continue; }
      const a = Math.min(1, (3 - age) * 1.5), bob = Math.sin(now / 180) * (em.e === 'bailar' ? 5 : 2), X0 = sx(p[0]) + (em.e === 'bailar' ? Math.sin(now / 120) * 6 : 0), Y0 = sy(p[1]) - 46 + bob;
      c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(X0, Y0, 15, 0, 7); c.fill(); c.beginPath(); c.moveTo(X0 - 4, Y0 + 13); c.lineTo(X0, Y0 + 20); c.lineTo(X0 + 4, Y0 + 13); c.fill();
      c.font = '20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(EMI[em.e] || '🙂', X0, Y0 + 1);
      if (em.e === 'sentarse') { c.font = '12px sans-serif'; c.fillStyle = '#cfe'; c.fillText('z', X0 + 20, Y0 - 12 - (now / 200) % 6); c.fillText('Z', X0 + 26, Y0 - 20 - (now / 200) % 6); }
      c.restore();
    }
    if (!animQ()) return;
    for (const [id, l] of lines) {                                                           // sedal, corcho y ondas
      if (now - l.t > 30000) { lines.delete(id); continue; }
      const p = pos(id), x1 = (p ? sx(p[0]) : sx(l.x1)) + 10, y1 = (p ? sy(p[1]) : sy(l.y1)) - 22, k = Math.min(1, (now - l.t) / 380), arc = Math.sin(k * Math.PI) * 38;
      const bx = x1 + (sx(l.x2) - x1) * k, by = y1 + (sy(l.y2) - y1) * k - arc, dip = l.bite && now - l.bite < 4000 ? 5 + Math.sin(now / 55) * 2.5 : Math.sin(now / 500 + id) * 1.2;
      const tx = bx, ty = by + (k >= 1 ? dip : 0);
      c.save(); c.strokeStyle = 'rgba(235,235,225,.75)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + tx) / 2, Math.max(y1, ty) + 10 - (k < 1 ? 0 : 0), tx, ty); c.stroke();
      c.strokeStyle = 'rgba(210,235,255,.5)'; if (k >= 1) for (let i = 0; i < 2; i++) { const r = ((now / 900 + i / 2) % 1); c.globalAlpha = (1 - r) * 0.6; c.beginPath(); c.ellipse(tx, by + 3, 4 + r * 12, 2 + r * 5, 0, 0, 7); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = '#f2f2f2'; c.beginPath(); c.arc(tx, ty - 1, 3, 0, 7); c.fill(); c.fillStyle = '#e0503b'; c.beginPath(); c.arc(tx, ty - 3, 3, Math.PI, 0); c.fill();
      if (l.bite && now - l.bite < 4000) { c.fillStyle = '#ffe36a'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.fillText('!', tx, ty - 14 + Math.sin(now / 80) * 2); }
      c.restore();
    }
    for (let i = mines.length - 1; i >= 0; i--) {                                            // pico y barra de enfriamiento de la roca
      const m = mines[i], age = now - m.t; if (age > m.cd + 250) { mines.splice(i, 1); continue; }
      const X0 = sx(m.x), Y0 = sy(m.y);
      if (age < 260) { const k = age / 260; c.save(); c.translate(X0 - 14, Y0 - 22); c.rotate(-1.1 + k * 1.9); c.font = '22px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.fillText('⛏️', 0, 0); c.restore(); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,230,140,${1 - k})`; c.lineWidth = 2; c.beginPath(); c.arc(X0, Y0 - 6, 6 + k * 10, 0, 7); c.stroke(); c.restore(); }
      if (age < 60 && m.me !== undefined) X.burst(m.x, m.y - 0.2, null, 6, { sp: 3.5, up: 2.4, g: 8, life: 0.45, size: 2, add: true });
      if (m.me) { const k = Math.min(1, age / m.cd); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(X0 - 14, Y0 - 26, 28, 5); c.fillStyle = k >= 1 ? '#8ff0a0' : '#ffb347'; c.fillRect(X0 - 13, Y0 - 25, 26 * k, 3); }
    }
  });
})();
