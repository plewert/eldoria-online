'use strict';
/* Interfaz nueva (ui3): marco del jugador y del enemigo, orbes de vida y maná, minimapa redondo, misiones activas,
   panel lateral con pestañas (Mochila / Equipo / Habilidades) y chat con pestañas.
   Es una capa sobre la interfaz existente (usa los mismos elementos); se desactiva con el botón 🎨 del menú,
   o con ?ui=old en la dirección. La preferencia se guarda en eldoria.ui3 ('0' = interfaz clásica). */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $, store } = X;
  const q = /[?&]ui=old/.test(location.search) ? '0' : /[?&]ui=new/.test(location.search) ? '1' : store.get('eldoria.ui3');
  const ON = q !== '0';
  if (!ON) {      // modo clásico: solo un botón para volver a la interfaz nueva
    const mountOld = () => { const bar = document.querySelector('.menu2'); if (!bar || bar.querySelector('.ui3sw')) return; const b = el('button', 'ui3sw', '🎨'); b.type = 'button'; b.title = 'Probar la interfaz nueva'; b.addEventListener('click', () => { store.set('eldoria.ui3', '1'); location.reload(); }); bar.append(b); };
    setInterval(mountOld, 1500); return;
  }
  document.body.classList.add('ui3');
  const touch = () => document.body.classList.contains('touch');
  const fmt = (n) => Math.round(n).toLocaleString('es');
  const stage = () => $('#stage');
  const sh = (n) => { n = Math.floor(n); const f = (v, u) => (Math.floor(v * 10) / 10) + u; return n >= 1e9 ? f(n / 1e9, 'G') : n >= 1e6 ? f(n / 1e6, 'M') : n >= 1e5 ? Math.floor(n / 1e3) + 'k' : fmt(n); };
  let built = false;

  function build() {
    const st = stage(); if (!st || built || !$('#side')) return; built = true;

    /* ---- marco del jugador ---- */
    const pf = el('div', 'u3 g3', ''); pf.id = 'u3pf';
    pf.innerHTML = '<div class="u3av"><span id="u3ic">⚔️</span><b id="u3lv">1</b></div><div class="u3pb"><div class="u3nm"><span id="u3nm"></span></div>'
      + '<div class="u3bar hp"><i id="u3hp"></i><span id="u3hpT"></span></div><div class="u3bar mp"><i id="u3mp"></i><span id="u3mpT"></span></div><div class="u3bar xp"><i id="u3xp"></i></div></div>';
    st.append(pf);

    /* ---- minimapa redondo ---- */
    const mb = el('div', 'u3mm'); mb.id = 'u3mm';
    const mini = $('#mini'); if (mini) mb.append(mini);
    mb.append(el('span', 'u3n', 'N'), el('span', 'u3s', 'S'));
    const co = el('div', 'u3co g3'); co.id = 'u3co';
    st.append(mb, co);

    /* ---- misiones activas ---- */
    const qt = el('div', 'u3qt g3'); qt.id = 'u3qt'; qt.innerHTML = '<h4>📜 Misiones activas</h4><div id="u3ql"></div>'; st.append(qt);

    /* ---- barra inferior: orbes + barra de habilidades + experiencia ---- */
    if (!touch()) {
      const row = el('div', 'u3row'); row.id = 'u3row';
      const oh = el('div', 'u3orb hp'); oh.id = 'u3oh'; oh.innerHTML = '<b></b>';
      const om = el('div', 'u3orb mp'); om.id = 'u3om'; om.innerHTML = '<b></b>';
      const mid = el('div', 'u3mid'); const hb = $('#hotbar'); const xb = el('div', 'u3xb'); xb.innerHTML = '<i id="u3xb"></i>';
      mid.append(hb, xb); row.append(oh, mid, om); st.append(row);
    }

    /* ---- chat con pestañas ---- */
    const bar = $('#chatBar');
    if (bar) {
      const tabs = el('div', 'u3ct'); tabs.id = 'u3ct';
      for (const [k, n] of [['a', 'Todo'], ['g', 'Global'], ['c', 'Combate']]) { const s = el('button', k === 'a' ? 'on' : '', n); s.type = 'button'; s.dataset.t = k; tabs.append(s); }
      bar.append(tabs);
      tabs.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); $('#log').dataset.t = b.dataset.t; $('#log').scrollTop = 1e9; });
      const log = $('#log'); log.dataset.t = 'a';
      const cat = (p) => { if (p.dataset.c) return; p.dataset.c = p.querySelector('b') || /^(g|pt|gc)$/.test(p.className) ? 'g' : /^(d|k|h|c|p|w|z|me)$/.test(p.className) ? 'c' : 's'; };
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) cat(n); }).observe(log, { childList: true });
      log.querySelectorAll('p').forEach(cat);
    }

    /* ---- panel lateral con pestañas ---- */
    const side = $('#side');
    const pt = el('div', 'u3pt'); pt.id = 'u3pt';
    const secs = [...side.children].filter((n) => n.tagName === 'SECTION');
    const map = { inv: secs[3], eq: secs[2], sk: secs[1] };
    if (secs[0]) secs[0].classList.add('u3hide');
    const show = (k) => { for (const t in map) if (map[t]) map[t].classList.toggle('u3hide', t !== k); pt.querySelectorAll('button[data-k]').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); store.set('eldoria.ui3tab', k); };
    for (const [k, n] of [['inv', '🎒 Mochila'], ['eq', '🛡 Equipo'], ['sk', '📊 Habilidades']]) { const b = el('button', '', n); b.type = 'button'; b.dataset.k = k; b.addEventListener('click', () => show(k)); pt.append(b); }
    const cx = el('button', 'cl', '✕'); cx.type = 'button'; cx.title = 'Cerrar (I)'; cx.addEventListener('click', () => setPanel(false)); pt.append(cx);
    side.prepend(pt); show(store.get('eldoria.ui3tab') || 'inv');
    // las ranuras de equipo ahora van en pestaña propia: se ven también las barras de vida/maná del personaje en "Habilidades"

    /* ---- menú lateral: mochila y cambio de interfaz ---- */
    const dock = document.querySelector('.menu2');
    if (dock) {
      const bag = el('button', 'u3bag', '🎒'); bag.type = 'button'; bag.title = 'Mochila y equipo (I)'; bag.addEventListener('click', () => setPanel());
      const sw = el('button', 'ui3sw', '🎨'); sw.type = 'button'; sw.title = 'Volver a la interfaz clásica'; sw.addEventListener('click', () => { store.set('eldoria.ui3', '0'); location.reload(); });
      dock.prepend(bag); dock.append(sw);
    }
    X.on('key', (k) => { if (k === 'i') { setPanel(); return true; } return false; });
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  }
  function setPanel(v) {
    const b = document.body, open = v === undefined ? !b.classList.contains('drawer') : v;
    b.classList.toggle('drawer', open); const t = document.querySelector('.drawerBtn'); if (t) t.textContent = open ? '✕' : '🎒';
  }

  /* ---- sincronización con los datos del juego ---- */
  const val = (id) => { const e = $(id); return e ? e : null; };
  function misiones() {
    const box = $('#u3ql'); if (!box || !X.QD) return;
    const have = (id) => (G.inv || []).reduce((a, it) => a + (it && it[0] === id ? it[1] : 0), 0);
    const rows = [];
    for (const id in X.QD) {
      const s = G.qst && G.qst[id]; if (!s || (s.st !== 'active' && s.st !== 'ready')) continue;
      const d = X.QD[id]; let n = s.n || 0; if (d.type === 'collect') n = Math.min(d.n, have(d.item));
      rows.push([d.title, Math.min(n, d.n), d.n, n >= d.n]);
    }
    rows.sort((a, b) => (b[3] - a[3]));
    const key = JSON.stringify(rows.slice(0, 3)); if (box.dataset.k === key) return; box.dataset.k = key;
    box.replaceChildren();
    if (!rows.length) { box.append(el('p', 'u3none', 'Habla con los PNJ marcados con ❗ en el mapa.')); }
    for (const [t, n, m, ok] of rows.slice(0, 3)) {
      const p = el('div', 'u3q' + (ok ? ' ok' : '')); p.append(el('span', '', t), el('b', '', ok ? '✔ Entregar' : `${n}/${m}`));
      const bar = el('div', 'u3qb'); const i = el('i'); i.style.width = Math.min(100, (n / Math.max(1, m)) * 100) + '%'; bar.append(i); p.append(bar); box.append(p);
    }
    if (rows.length > 3) box.append(el('p', 'u3none', `+${rows.length - 3} más (tecla Q)`));
  }
  function sync() {
    if (!built || !G.me) return;
    const s = G.stats, m = G.me;
    if (s) {
      const hp = m.h / Math.max(1, s.maxHp), mp = m.m / Math.max(1, s.maxMana);
      const set = (id, f, t) => { const e = $(id); if (e) { if (f != null) e.style.width = Math.max(0, Math.min(100, f * 100)) + '%'; if (t != null) e.textContent = t; } };
      set('#u3hp', hp, null); set('#u3hpT', null, `${fmt(m.h)} / ${fmt(s.maxHp)}`); set('#u3mp', mp, null); set('#u3mpT', null, `${fmt(m.m)} / ${fmt(s.maxMana)}`);
      const xr = (s.xp - s.xpLo) / Math.max(1, s.xpHi - s.xpLo); set('#u3xp', xr, null);
      const xb = $('#u3xb'); if (xb) xb.style.width = Math.max(0, Math.min(100, xr * 100)) + '%';
      const lv = $('#u3lv'); if (lv) lv.textContent = s.lv;
      const ic = $('#u3ic'); if (ic) ic.textContent = s.style === 'ranged' ? '🏹' : s.style === 'magic' ? '🔮' : '⚔️';
      const oh = $('#u3oh'), om = $('#u3om');
      if (oh) { oh.style.setProperty('--f', Math.max(0, Math.min(1, hp))); oh.firstChild.textContent = sh(m.h); }
      if (om) { om.style.setProperty('--f', Math.max(0, Math.min(1, mp))); om.firstChild.textContent = sh(m.m); }
    }
    const me = G.ents && G.ents.get(G.id); const nm = $('#u3nm'); if (nm && me && nm.textContent !== me.n) nm.textContent = me.n;
    const co = $('#u3co'); if (co) { const z = $('#zname'); const t = `${z ? z.textContent : ''} · ${m.x}, ${m.y}`; if (co.textContent !== t) co.textContent = t; }
    misiones();
  }
  setInterval(() => { if (!built && document.querySelector('.menu2') && !$('#game').hidden) build(); sync(); }, 200);
})();
