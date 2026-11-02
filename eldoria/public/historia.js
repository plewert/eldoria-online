'use strict';
/* Modo historia de las cuevas de jefe: escenas de entrada/final, tablillas con capítulos y Diario de Historia (tecla Y). */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $, send } = X;
  let S = [];                                            // historias (server → 'story' k:all)
  const queue = []; let scene = null;

  /* ---------- escena (entrada, capítulo o final) ---------- */
  const cap = { intro: 'Una cueva antigua', ch: 'Tablilla antigua', end: 'Final' };
  function showNext() {
    if (scene || !queue.length) return;
    const m = queue.shift(), st = $('#stage'); if (!st) { queue.length = 0; return; }
    const root = el('div', 'hist-scene hs-' + m.k), box = el('div', 'hist-box');
    const lines = m.k === 'ch' ? [m.text] : (m.lines || []);
    box.append(el('div', 'hist-ic', m.icon || '📖'), el('small', 'hist-cap', m.k === 'ch' ? `📜 Capítulo ${m.i + 1} / ${m.n}` : m.k === 'end' ? '🏆 Final de la historia' : '📖 Modo historia'),
      el('h2', '', m.k === 'ch' ? m.title : m.name));
    if (m.k === 'ch') box.append(el('div', 'hist-sub', m.name));
    for (const l of lines) box.append(el('p', '', l));
    const b = el('button', 'hist-go', 'Continuar  [Espacio]'); b.type = 'button'; box.append(b, el('small', 'hist-esc', 'Esc: saltar'));
    root.append(box); st.append(root); scene = root;
    requestAnimationFrame(() => root.classList.add('on'));
    const end = () => { if (scene !== root) return; scene = null; if (!queue.length) send({ t: 'story', k: 'ack' }); root.classList.remove('on'); setTimeout(() => root.remove(), 300); window.removeEventListener('keydown', kd, true); setTimeout(showNext, 350); };
    const kd = (ev) => { if (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end(); } else ev.stopPropagation(); };
    window.addEventListener('keydown', kd, true); b.addEventListener('click', end);
  }

  /* ---------- diario ---------- */
  const m = el('div', 'modal w2'); m.hidden = true; m.id = 'w2_hist';
  const sh = el('div', 'sheet'), h = el('header'), t = el('h2', '', '📖 Diario de Historia'), x = el('button', '', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
  const body = el('div', 'w2body'); h.append(t, x); sh.append(h, body); m.append(sh); document.body.append(m);
  const toggle = () => { m.hidden = !m.hidden; if (!m.hidden) { send({ t: 'story' }); render(); } };
  x.addEventListener('click', () => { m.hidden = true; });
  m.addEventListener('mousedown', (ev) => { if (ev.target === m) m.hidden = true; });
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !m.hidden) m.hidden = true; }, true);
  function render() {
    body.replaceChildren();
    const all = S.reduce((a, s) => a + s.c.length, 0), tot = S.reduce((a, s) => a + s.n, 0), fin = S.filter((s) => s.done).length;
    body.append(el('p', 'hist-head', `Capítulos leídos: ${all} / ${tot} · Historias completas: ${fin} / ${S.length}`));
    const bar = el('div', 'hist-bar'), i = el('i'); i.style.width = (tot ? (100 * all / tot) : 0) + '%'; bar.append(i); body.append(bar);
    body.append(el('p', 'fine', 'Lee las 3 tablillas de cada cueva y derrota a su jefe para completar su historia. Completa todas para el título «Cronista de Eldoria».'));
    for (const s of S) {
      const sec = el('div', 'hist-sec' + (s.done ? ' done' : '')), hd = el('h3', '', `${s.icon} ${s.name} `);
      hd.append(el('small', '', s.done ? '✅ completa' : `${s.c.length}/${s.n}${s.end ? ' · final ✔' : ''}`)); sec.append(hd);
      if (!s.intro && !s.c.length && !s.end) { sec.append(el('p', 'fine', '🔒 Entra en su cueva para descubrirla.')); body.append(sec); continue; }
      if (s.intro) { const d = el('details'); d.append(el('summary', '', '📖 Entrada'), ...s.intro.map((l) => el('p', '', l))); sec.append(d); }
      for (let k = 0; k < s.n; k++) {
        const c = s.ch.find((q) => q[0] === k), d = el('details');
        if (c) d.append(el('summary', '', `📜 ${k + 1}. ${c[1]}`), el('p', '', c[2])); else { d.append(el('summary', 'lockd', `🔒 ${k + 1}. ???`), el('p', 'fine', 'Tablilla sin descubrir dentro de la cueva.')); }
        sec.append(d);
      }
      if (s.end) { const d = el('details'); d.append(el('summary', '', '🏆 Final'), ...s.end.map((l) => el('p', '', l))); sec.append(d); } else sec.append(el('p', 'fine lockd', '🔒 Final: derrota al jefe.'));
      body.append(sec);
    }
  }
  const bar0 = document.querySelector('.menu2');
  const mk = () => { const b0 = document.querySelector('.menu2'); if (!b0) return; const b = el('button', '', '📚'); b.type = 'button'; b.title = 'Diario de Historia (Y)'; b.setAttribute('aria-label', 'Diario de Historia'); b.addEventListener('click', toggle); b0.append(b); };
  if (bar0) mk(); else document.addEventListener('DOMContentLoaded', () => setTimeout(mk, 50));
  X.on('key', (k) => { if (k === 'y') { toggle(); return true; } return false; });

  X.handlers.story = (d) => {
    if (d.k === 'all') { S = d.v || []; if (!m.hidden) render(); return; }
    queue.push(d); showNext();
  };

  /* ---------- tablillas en el suelo ---------- */
  X.on('under', (c, now) => {
    const TS = X.TS; if (!S.length) return;
    for (const s of S) {
      for (let k = 0; k < s.stones.length; k++) {
        const [tx, ty] = s.stones[k], px = X.sxOf(tx) + TS / 2, py = X.syOf(ty) + TS / 2, read = s.c.includes(k);
        if (px < -TS || py < -TS || px > c.canvas.width + TS || py > c.canvas.height + TS) continue;
        const a = read ? 0.18 : 0.35 + 0.2 * Math.sin(now / 420 + tx);
        const g = c.createRadialGradient(px, py, 2, px, py, TS * 0.9); g.addColorStop(0, `rgba(255,215,106,${a})`); g.addColorStop(1, 'rgba(255,215,106,0)'); c.fillStyle = g; c.fillRect(px - TS, py - TS, TS * 2, TS * 2);
        c.fillStyle = read ? '#6c6a74' : '#8a8798'; c.strokeStyle = '#2a2833'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(px - TS * 0.22, py + TS * 0.3); c.lineTo(px - TS * 0.22, py - TS * 0.18); c.quadraticCurveTo(px, py - TS * 0.38, px + TS * 0.22, py - TS * 0.18); c.lineTo(px + TS * 0.22, py + TS * 0.3); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = read ? '#b9ae86' : '#ffd76a'; for (let i = 0; i < 3; i++) c.fillRect(px - TS * 0.12, py - TS * 0.08 + i * TS * 0.1, TS * 0.24, 1.6);
      }
    }
  });
})();
