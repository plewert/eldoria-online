'use strict';
/* Interfaz de los sistemas nuevos: misiones, logros, grupo y gremio, ranking, mercado, oficios,
   barra de habilidades, mejoras activas, aviso de evento, nodos de recolección, mascotas y recuperación de clave. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $, send } = X;
  const fmt = (n) => Math.round(n).toLocaleString('es');
  const xi = (G.xi = { ach: {}, title: '', st: {}, defs: [], skills: {}, recipes: [], nodes: {}, quests: [], guild: '' });
  const qst = (G.qst = {});                       // id → { st, n }
  const QD = {};
  const have = (id) => (G.inv || []).reduce((a, it) => a + (it && it[0] === id ? it[1] : 0), 0);
  const iname = (id) => (G.items[id] ? G.items[id].name : id);
  const iicon = (id) => (G.items[id] ? G.items[id].icon || '' : '');
  const npcName = (id) => { const n = (G.npcs || []).find((q) => q.id === id); return n ? n.name : id; };
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

  /* ---------- ventanas ---------- */
  const wins = {};
  function win(id, title, wide) {
    const m = el('div', 'modal w2'); m.hidden = true; m.id = 'w2_' + id;
    const sh = el('div', 'sheet' + (wide ? '' : ' narrow2'));
    const h = el('header'); const t = el('h2', '', title), x = el('button', '', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
    h.append(t, x); const body = el('div', 'w2body'); sh.append(h, body); m.append(sh); document.body.append(m);
    x.addEventListener('click', () => close(id));
    m.addEventListener('mousedown', (ev) => { if (ev.target === m) close(id); });
    return (wins[id] = { m, body, t, onOpen: null });
  }
  function open(id) { for (const k in wins) if (k !== id) wins[k].m.hidden = true; const w = wins[id]; w.m.hidden = false; if (w.onOpen) w.onOpen(); }
  function close(id) { wins[id].m.hidden = true; }
  const toggle = (id) => { if (wins[id].m.hidden) open(id); else close(id); };
  const anyOpen = () => Object.values(wins).some((w) => !w.m.hidden);
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && anyOpen()) { for (const k in wins) wins[k].m.hidden = true; } }, true);
  const btn = (label, fn, cls) => { const b = el('button', cls || 'mini', label); b.type = 'button'; b.addEventListener('click', fn); return b; };

  /* ---------- barra de menús ---------- */
  const bar = el('div', 'menu2');
  const mkBtn = (ic, tip, k, id) => { const b = el('button', '', ic); b.type = 'button'; b.title = `${tip} (${k.toUpperCase()})`; b.setAttribute('aria-label', tip); b.addEventListener('click', () => toggle(id)); bar.append(b); return b; };
  const hud = el('div', 'hud2'), buffsEl = el('div', 'buffs2'), partyEl = el('div', 'party2');
  hud.append(buffsEl, partyEl);
  const banner = el('div', 'banner2'); banner.hidden = true;
  const mount = () => { const st = $('#stage'); if (st && !bar.parentNode) st.append(bar, hud, banner); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount();

  /* ============================ COLECCIÓN DE JEFES ============================ */
  const wB = win('b', '📖 Colección (jefes y pesca)', true); mkBtn('📖', 'Colección de jefes', 'b', 'b');
  let colData = {};
  function renderCol() {
    const b = wB.body; b.replaceChildren();
    const bosses = Object.entries(G.mons || {}).filter(([, d]) => d.boss && d.loot && d.loot.length).sort((a, c) => (a[1].lv || 0) - (c[1].lv || 0));
    let got = 0, tot = 0;
    const secs = bosses.map(([t, d]) => {
      const sec = el('div', 'colsec'), have2 = colData[t] || {}; let g = 0, n = 0;
      const grid = el('div', 'colgrid');
      for (const [id, ch] of d.loot) {
        const it = G.items[id]; if (!it) continue;
        if (!(it.type === 'weapon' || it.type === 'shield' || ['head', 'body', 'gloves', 'legs', 'boots', 'cape', 'amulet', 'ring', 'belt', 'pet', 'mount'].includes(it.type) || /^trofeo/.test(id)) && ch >= 0.2) continue;   // solo lo "coleccionable": equipo, mascotas y objetos raros
        n++; const c = have2[id], tile = el('div', 'coltile' + (c ? ' on' : ''));
        const ic = el('div', 'ico'); ic.append(X.iconNode ? X.iconNode(id) : it.icon || '?'); tile.append(ic, el('small', '', c ? it.name : '???'));
        if (c) { g++; tile.append(el('b', '', '×' + c)); }
        tile.title = c ? `${it.name} — conseguido ${c} ${c === 1 ? 'vez' : 'veces'}` : `Aún no te ha salido (${(ch * 100).toFixed(ch < 0.01 ? 2 : 1)} %)`;
        grid.append(tile);
      }
      if (!n) return null; got += g; tot += n;
      const h = el('h3', '', `${d.icon} ${d.name} · nivel ${d.lv} `); h.append(el('small', '', `${g} / ${n}`)); sec.append(h, grid); return sec;
    }).filter(Boolean);
    for (const [title, defsCol, key] of [['⛏️ Minería', G.mine && G.mine.defs && G.mine.defs.col, 'mineria'], ['🎣 Pesca', G.fish && G.fish.defs && G.fish.defs.col, 'pesca']]) {   // secciones de oficios (peces, rocas, gemas, mascotas...)
      if (!defsCol) continue;
      const sec = el('div', 'colsec'), have3 = colData[key] || {}, grid = el('div', 'colgrid'); let g = 0;
      for (const [id, ch] of defsCol) {
        const it = G.items[id]; if (!it) continue; const c = have3[id], tile = el('div', 'coltile' + (c ? ' on' : ''));
        const ic = el('div', 'ico'); ic.append(X.iconNode ? X.iconNode(id) : it.icon || '?'); tile.append(ic, el('small', '', c ? it.name : '???'));
        if (c) { g++; tile.append(el('b', '', '×' + c)); }
        tile.title = c ? `${it.name} — conseguido ${c} ${c === 1 ? 'vez' : 'veces'}` : ch >= 1 ? 'Aún no lo has conseguido' : `Aún no te ha salido (${(ch * 100).toFixed(2)} %)`;
        grid.append(tile);
      }
      const h = el('h3', '', title + ' '); h.append(el('small', '', `${g} / ${defsCol.length}`)); sec.append(h, grid); secs.unshift(sec);
    }
    b.append(el('p', 'colhead', `Objetos de jefes que ya te han salido: ${got} / ${tot}`), ...secs);
    if (!secs.length) b.append(el('p', '', 'Aún no hay jefes registrados.'));
  }
  const colQ = []; let colBusy = false;
  const colNext = () => {
    const m = colQ.shift(); if (!m) { colBusy = false; return; }
    colBusy = true; const it = G.items[m.id] || {}, st = $('#stage'); if (!st) { colBusy = false; return; }
    const n = el('div', 'colnew'), ic = el('div', 'ico'); ic.append(X.iconNode ? X.iconNode(m.id) : it.icon || '?');
    n.append(ic, el('div', 'ct', ''), ); n.lastChild.append(el('small', '', '📖 ¡Nuevo en tu colección!'), el('b', '', it.name || m.id));
    st.append(n); setTimeout(() => n.classList.add('out'), 4200); setTimeout(() => { n.remove(); colNext(); }, 4800);
  };
  X.handlers.colnew = (m) => { colQ.push(m); if (!colBusy) colNext(); };
  wB.onOpen = () => { send({ t: 'col' }); send({ t: 'fish' }); send({ t: 'mine' }); renderCol(); };
  X.handlers.col = (m) => { colData = m.v || {}; if (!wB.m.hidden) renderCol(); };

  /* ============================ MISIONES ============================ */
  const wQ = win('q', '📜 Misiones'), wN = win('n', 'Misión');
  const qBtn = mkBtn('📜', 'Misiones', 'q', 'q');
  let dlgNpc = '';
  const qView = (id) => {
    const d = QD[id], s = qst[id] || { st: 'locked', n: 0 };
    let st = s.st, n = s.n;
    if (st === 'active' || st === 'ready') { if (d.type === 'collect') n = Math.min(d.n, have(d.item)); if (n >= d.n) st = 'ready'; else st = 'active'; }
    return { d, st, n };
  };
  const objTxt = (d, n) => {
    const what = d.type === 'killany' ? 'monstruos' : d.type === 'kill' ? (G.mons[d.mon] ? G.mons[d.mon].name : d.mon) : iname(d.item);
    return `${d.type === 'collect' ? 'Reunir' : 'Derrotar'} ${what}: ${n == null ? d.n : n + ' / ' + d.n}`;
  };
  const rewTxt = (r) => `💰 ${fmt(r.g || 0)} · ✨ ${fmt(r.xp || 0)} xp` + ((r.items || []).length ? ' · ' + r.items.map(([i, q]) => (q > 1 ? q + '× ' : '') + iname(i)).join(', ') : '');
  function questCard(id, withNpc) {
    const { d, st, n } = qView(id), c = el('div', 'qcard st-' + st);
    c.append(el('h4', '', d.title + (d.repeat ? ' ↻' : '')), el('p', 'fine', d.desc));
    c.append(el('p', 'obj', objTxt(d, st === 'new' || st === 'locked' ? null : n)));
    c.append(el('p', 'rew', 'Premio: ' + rewTxt(d.reward)));
    if (withNpc) c.append(el('p', 'fine', `Entregar a: ${npcName(d.npc)}`));
    const a = el('div', 'acts');
    if (st === 'new') a.append(btn('Aceptar', () => send({ t: 'q_accept', id })));
    else if (st === 'ready') a.append(btn('Entregar', () => send({ t: 'q_turn', id }), 'mini go'));
    else if (st === 'active') { a.append(el('span', 'fine', 'En curso')); if (withNpc) a.append(btn('Abandonar', () => { send({ t: 'q_abandon', id }); }, 'mini')); }
    else if (st === 'locked') a.append(el('span', 'fine', `Nivel ${d.lv}${d.after && QD[d.after] ? ' · antes: ' + QD[d.after].title : ''}`));
    else a.append(el('span', 'fine', '✔ Completada'));
    c.append(a); return c;
  }
  function renderQLog() {
    const b = wQ.body; b.replaceChildren();
    const ids = Object.keys(QD), act = ids.filter((i) => { const s = qView(i).st; return s === 'active' || s === 'ready'; });
    b.append(el('h3', '', `Activas (${act.length}/10)`));
    if (!act.length) b.append(el('p', 'fine', 'No tienes misiones activas. Habla con los PNJ marcados con ❗ en el mapa.'));
    act.forEach((i) => b.append(questCard(i, true)));
    const av = ids.filter((i) => qView(i).st === 'new');
    if (av.length) { b.append(el('h3', '', 'Disponibles')); av.forEach((i) => b.append(el('p', 'qline', `❗ ${QD[i].title} — ${npcName(QD[i].npc)} (nivel ${QD[i].lv})`))); }
    const done = ids.filter((i) => qView(i).st === 'done').length;
    b.append(el('p', 'fine', `Completadas: ${done} de ${ids.length}`));
  }
  function renderDlg() {
    const b = wN.body; b.replaceChildren(); wN.t.textContent = npcName(dlgNpc);
    const ids = Object.keys(QD).filter((i) => QD[i].npc === dlgNpc);
    ids.sort((a, c) => ({ ready: 0, new: 1, active: 2, locked: 3, done: 4 }[qView(a).st] - { ready: 0, new: 1, active: 2, locked: 3, done: 4 }[qView(c).st]));
    ids.forEach((i) => b.append(questCard(i, false)));
    if (!ids.length) b.append(el('p', 'fine', 'No tengo encargos para ti.'));
  }
  wQ.onOpen = renderQLog;
  X.handlers.quests = (m) => {
    for (const q of m.list) qst[q.id] = { st: q.st, n: q.n };
    if (m.npc && QDready()) { const mine = m.list.length; if (mine) { dlgNpc = m.npc; renderDlg(); if (wN.m.hidden) open('n'); } }
    else if (!wQ.m.hidden) renderQLog();
    if (!wN.m.hidden && dlgNpc) renderDlg();
  };
  const QDready = () => Object.keys(QD).length > 0;
  X.handlers.qprog = (m) => { const s = qst[m.id] || (qst[m.id] = { st: 'active', n: 0 }); s.n = m.n; s.st = m.n >= m.need ? 'ready' : 'active'; if (!wQ.m.hidden) renderQLog(); X.toast(`📜 ${m.title}: ${m.n}/${m.need}`, null, 2500); };
  X.handlers.quest_done = (m) => { X.toast(`✅ Misión cumplida: ${m.title}`, null, 5000); };
  X.on('inv', () => { if (!wQ.m.hidden) renderQLog(); if (!wN.m.hidden) renderDlg(); if (!wC.m.hidden) renderCraft(); if (!wM.m.hidden && tab === 'sell') renderMarket(); });

  /* ============================ LOGROS Y TÍTULOS ============================ */
  const wA = win('a', '🏆 Logros', true); mkBtn('🏆', 'Logros y títulos', 'l', 'a');
  const achVal = (type) => {
    const s = xi.st;
    switch (type) { case 'lv': return G.me ? G.me.l : 0; case 'gold': return (G.gold || 0) + (G.bankGold || 0); case 'kt': return s.kt; default: return s[type]; }
  };
  function renderAch() {
    const b = wA.body; b.replaceChildren();
    const got = Object.keys(xi.ach).length;
    b.append(el('p', '', `Logros: ${got} / ${xi.defs.length}  ·  Oficio nivel ${xi.st.clv || 1}`));
    const ts = el('div', 'titles'); ts.append(el('b', '', 'Título: '));
    ts.append(btn(xi.title ? 'Quitar' : 'Sin título', () => send({ t: 'title', id: '' }), xi.title ? 'mini' : 'mini on'));
    for (const d of xi.defs) if (d[6] && xi.ach[d[0]]) ts.append(btn(d[6], () => send({ t: 'title', id: d[0] }), xi.title === d[6] ? 'mini on' : 'mini'));
    b.append(ts);
    const grid = el('div', 'achgrid');
    for (const [id, name, desc, type, thr, gold, title] of xi.defs) {
      const ok = !!xi.ach[id], v = achVal(type), c = el('div', 'ach' + (ok ? ' ok' : ''));
      c.append(el('b', '', (ok ? '🏆 ' : '🔒 ') + name), el('span', 'fine', desc));
      if (!ok && typeof v === 'number') { const bb = el('div', 'bar mini'); const i = el('i'); i.style.width = Math.min(100, (v / thr) * 100) + '%'; bb.append(i); c.append(bb, el('span', 'fine', `${fmt(v)} / ${fmt(thr)}`)); }
      c.append(el('span', 'fine', `${gold ? '💰 ' + fmt(gold) : ''}${title ? ' · título «' + title + '»' : ''}`));
      grid.append(c);
    }
    b.append(grid);
  }
  wA.onOpen = () => { send({ t: 'xinfo' }); renderAch(); };
  // cruz enterrada donde moriste en zona peligrosa
  X.handlers.grave = (m) => { G.grave = m.x >= 0 ? { x: m.x, y: m.y } : null; if (G.grave) X.toast && X.toast('✝ Tu tumba quedó marcada en el mapa.'); };
  X.on('under', (c, now) => {
    const g = G.grave; if (!g) return; const TS = X.TS, x = X.sxOf(g.x), y = X.syOf(g.y);
    if (x < -TS || y < -TS || x > c.canvas.width || y > c.canvas.height) return;
    c.save(); c.translate(x + TS / 2, y + TS / 2 + 2);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, 11, 11, 4, 0, 0, 7); c.fill();
    c.fillStyle = '#5b4a36'; c.beginPath(); c.ellipse(0, 9, 10, 3.5, 0, 0, 7); c.fill();             // tierra removida
    c.fillStyle = '#d9d2c2'; c.fillRect(-2, -12, 4, 22); c.fillRect(-7, -7, 14, 4);                    // cruz
    c.fillStyle = '#a79f8d'; c.fillRect(0, -12, 2, 22); c.fillRect(0, -7, 7, 4);
    c.strokeStyle = 'rgba(255,90,70,' + (0.35 + 0.2 * Math.sin(now / 350)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 15, 0, 7); c.stroke();
    c.restore();
  });
  X.handlers.xinfo = (m) => {
    xi.ach = m.ach || {}; xi.title = m.title || ''; xi.st = m.st || {}; xi.guild = m.guild || '';
    if (m.defs) {
      xi.defs = m.defs; xi.skills = m.skills; xi.recipes = m.recipes; xi.nodes = m.nodes; xi.quests = m.quests;
      for (const q of m.quests) QD[q.id] = q;
      send({ t: 'q_list' }); buildSkills();
    }
    if (!wA.m.hidden) renderAch(); if (!wC.m.hidden) renderCraft();
  };
  X.handlers.ach = (m) => { X.toast(`🏆 Logro: ${m.name}${m.title ? ' — título «' + m.title + '»' : ''}`, null, 6000); };

  /* ============================ GRUPO Y GREMIO ============================ */
  const wS = win('s', '👥 Grupo y gremio', true); mkBtn('👥', 'Grupo y gremio', 'g', 's');
  G.party = []; G.guild = { name: '', members: [] };
  function renderSocial() {
    const b = wS.body; b.replaceChildren();
    const cols = el('div', 'cols'), a = el('div'), c = el('div');
    a.append(el('h3', '', 'Grupo'));
    if (!G.party.length) a.append(el('p', 'fine', 'No estás en un grupo. Haz clic derecho sobre un jugador → «Invitar al grupo». Compartís experiencia y no os podéis atacar.'));
    G.party.forEach((p) => {
      const r = el('div', 'mrow'); r.append(el('span', '', `${p.ld ? '👑 ' : ''}${p.n} (niv. ${p.l})`));
      const lead = G.party.find((q) => q.i === G.id);
      if (lead && lead.ld && p.i !== G.id) r.append(btn('Expulsar', () => send({ t: 'p_kick', n: p.n })));
      a.append(r);
    });
    if (G.party.length) a.append(btn('Salir del grupo', () => send({ t: 'p_leave' })));
    c.append(el('h3', '', 'Gremio'));
    if (!G.guild.name) {
      c.append(el('p', 'fine', 'Crea un gremio (cuesta 2.000 de oro) o pide que te inviten.'));
      const inp = el('input'); inp.maxLength = 16; inp.placeholder = 'Nombre del gremio'; inp.setAttribute('aria-label', 'Nombre del gremio');
      c.append(inp, btn('Crear', () => send({ t: 'g_create', n: inp.value.trim() })));
    } else {
      c.append(el('p', '', `«${G.guild.name}» — ${G.guild.role === 'lider' ? 'líder' : 'miembro'}`));
      G.guild.members.forEach((p) => {
        const r = el('div', 'mrow'); r.append(el('span', p.on ? 'on' : 'off', `${p.on ? '🟢' : '⚪'} ${p.r === 'lider' ? '👑 ' : ''}${p.n} (niv. ${p.l})`));
        if (G.guild.role === 'lider' && p.r !== 'lider') r.append(btn('Expulsar', () => send({ t: 'g_kick', n: p.n })));
        c.append(r);
      });
      c.append(btn('Salir del gremio', () => send({ t: 'g_leave' })), el('p', 'fine', 'Chat de gremio: /gc mensaje · Chat de grupo: /p mensaje'));
    }
    cols.append(a, c); b.append(cols);
  }
  wS.onOpen = () => { send({ t: 'g_info' }); renderSocial(); };
  function renderPartyHud() {
    partyEl.replaceChildren();
    if (G.party.length < 2) return;
    for (const p of G.party) {
      const r = el('div', 'pm'); r.append(el('span', '', `${p.ld ? '👑' : ''}${p.n} ${p.l}`));
      const bb = el('div', 'bar hp mini'), i = el('i'); i.style.width = Math.max(0, Math.min(100, (p.h / p.H) * 100)) + '%'; bb.append(i); r.append(bb); partyEl.append(r);
    }
  }
  X.handlers.party = (m) => { G.party = m.m || []; renderPartyHud(); if (!wS.m.hidden) renderSocial(); };
  X.handlers.guild = (m) => { G.guild = { name: m.name || '', role: m.role || '', members: m.members || [] }; if (!wS.m.hidden) renderSocial(); };
  X.handlers.invite = (m) => {
    const party = m.k === 'party';
    X.toast(party ? `${m.from} te invita a su grupo.` : `${m.from} te invita al gremio «${m.name}».`, [['Aceptar', () => send({ t: party ? 'p_acc' : 'g_acc', id: m.id })], ['Rechazar', () => {}]], 25000);
  };

  /* ============================ RANKING ============================ */
  const wR = win('r', '📊 Ranking'); mkBtn('📊', 'Ranking', 'r', 'r');
  let rkTab = 'lvl', rkData = null;
  const RK = { lvl: ['Nivel', ''], kills: ['Monstruos', ''], pvp: ['Jugadores', ''], boss: ['Jefes', ''] };
  function renderRank() {
    const b = wR.body; b.replaceChildren();
    const tabs = el('div', 'tabs2'); for (const k in RK) tabs.append(btn(RK[k][0], () => { rkTab = k; renderRank(); }, k === rkTab ? 'mini on' : 'mini')); b.append(tabs);
    const rows = rkData && rkData[rkTab];
    if (!rows) b.append(el('p', 'fine', 'Cargando…'));
    else if (!rows.length) b.append(el('p', 'fine', 'Aún no hay datos.'));
    else { const t = el('ol', 'rank'); rows.forEach(([n, v, g]) => { const li = el('li', n.toLowerCase() === (G.me && G.me.n || '').toLowerCase() ? 'me' : ''); li.append(el('span', '', n + (g ? ` ‹${g}›` : '')), el('b', '', fmt(v))); t.append(li); }); b.append(t); }
  }
  wR.onOpen = () => { send({ t: 'rank' }); renderRank(); };
  X.handlers.rank = (m) => { rkData = m.v; if (!wR.m.hidden) renderRank(); };

  /* ============================ MERCADO ============================ */
  const wM = win('m', '🏪 Mercado', true); mkBtn('🏪', 'Mercado de jugadores', 'p', 'm');
  let tab = 'buy', mk = { list: [], mine: [], fee: 0.05 }, mq = '', mkind = '';
  const refreshMarket = () => send({ t: 'm_list', q: mq, k: mkind });
  function renderMarket() {
    const b = wM.body; b.replaceChildren();
    const tabs = el('div', 'tabs2');
    [['buy', 'Comprar'], ['sell', 'Vender'], ['mine', 'Mis ventas']].forEach(([k, l]) => tabs.append(btn(l, () => { tab = k; renderMarket(); }, k === tab ? 'mini on' : 'mini')));
    tabs.append(el('span', 'gold', `💰 ${fmt(G.gold || 0)}`)); b.append(tabs);
    b.append(el('p', 'fine', `Solo en ciudades. Comisión de venta: ${Math.round(mk.fee * 100)}%. Los anuncios duran 48 h; si no se venden, vuelven a tu correo.`));
    if (tab === 'buy') {
      const f = el('div', 'mrow'), qi = el('input'); qi.placeholder = 'Buscar…'; qi.value = mq; qi.setAttribute('aria-label', 'Buscar objeto');
      const sel = el('select'); [['', 'Todo'], ['weapon', 'Armas'], ['armor', 'Armaduras'], ['jewel', 'Joyas'], ['other', 'Otros']].forEach(([v, l]) => { const o = el('option', '', l); o.value = v; sel.append(o); }); sel.value = mkind;
      const go = () => { mq = qi.value; mkind = sel.value; refreshMarket(); };
      qi.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') go(); ev.stopPropagation(); });
      f.append(qi, sel, btn('Buscar', go)); b.append(f);
      const list = el('div', 'list');
      mk.list.filter((l) => !mk.mine.includes(l.id)).forEach((l) => {
        const a = el('div', 'acts'); const bb = btn(`Comprar ${fmt(l.price)}`, () => { send({ t: 'm_buy', id: l.id }); setTimeout(refreshMarket, 300); }); bb.disabled = (G.gold || 0) < l.price; a.append(bb);
        list.append(X.itemRow(l.it, `de ${l.sn} · ${fmt(l.price)} de oro · ${l.h} h`, a));
      });
      if (!list.children.length) list.append(el('p', 'fine', 'No hay anuncios con ese filtro.'));
      b.append(list);
    } else if (tab === 'sell') {
      const list = el('div', 'list');
      (G.inv || []).forEach((it, i) => {
        if (!it || it[2] === 1 && false) return;
        const a = el('div', 'acts'), pi = el('input'); pi.type = 'number'; pi.min = 1; pi.placeholder = 'precio'; pi.className = 'price'; pi.setAttribute('aria-label', 'Precio');
        pi.addEventListener('keydown', (ev) => ev.stopPropagation());
        a.append(pi, btn('Vender', () => { const p = parseInt(pi.value, 10); if (!(p > 0)) { X.toast('Pon un precio.', null, 2000); return; } send({ t: 'm_sell', s: i, price: p }); setTimeout(() => { refreshMarket(); tab = 'mine'; }, 300); }));
        list.append(X.itemRow(it, `valor de tienda ${fmt((G.items[it[0]] && G.items[it[0]].sell) || 0)}`, a));
      });
      if (!list.children.length) list.append(el('p', 'fine', 'La mochila está vacía.'));
      b.append(list);
    } else {
      const list = el('div', 'list');
      mk.list.filter((l) => mk.mine.includes(l.id)).forEach((l) => { const a = el('div', 'acts'); a.append(btn('Retirar', () => { send({ t: 'm_cancel', id: l.id }); setTimeout(refreshMarket, 300); })); list.append(X.itemRow(l.it, `${fmt(l.price)} de oro · ${l.h} h restantes`, a)); });
      if (!list.children.length) list.append(el('p', 'fine', 'No tienes anuncios activos.'));
      b.append(list);
    }
  }
  wM.onOpen = () => { refreshMarket(); renderMarket(); };
  X.handlers.market = (m) => { mk = m; if (!wM.m.hidden) renderMarket(); };

  /* ============================ OFICIOS ============================ */
  const wC = win('c', '⚒ Oficios', true); mkBtn('⚒', 'Fabricar', 'f', 'c');
  function renderCraft() {
    const b = wC.body; b.replaceChildren();
    b.append(el('p', '', `Nivel de oficio ${xi.st.clv || 1} · recolecta 🌿💠⛏️🔷 en el campo (clic sobre ellos) y fabrica en una ciudad.`));
    const list = el('div', 'list');
    for (const r of xi.recipes) {
      const lock = (xi.st.clv || 1) < r.lvl;
      let ok = !lock; const ing = r.ing.map(([i, n]) => { const h = have(i); if (h < n) ok = false; return `${iicon(i)} ${iname(i)} ${Math.min(h, n)}/${n}`; });
      const row = el('div', 'item'), ic = el('div', 'ico', r.out[0].startsWith('@') ? '💎' : iicon(r.out[0])), nm = el('div', 'nm', r.name);
      nm.append(el('small', '', (lock ? `Requiere oficio ${r.lvl} · ` : '') + ing.join(' · ')));
      const a = el('div', 'acts'); const bb = btn('Fabricar', () => send({ t: 'craft', id: r.id })); bb.disabled = !ok; a.append(bb);
      row.append(ic, nm, a); if (!ok) row.classList.add('dim'); list.append(row);
    }
    b.append(list);
  }
  wC.onOpen = () => { send({ t: 'xinfo' }); renderCraft(); };

  /* ============================ PESCA ============================ */
  const wF = win('o', '🎣 Pesca', true); mkBtn('🎣', 'Pesca', 'o', 'o');
  const fsd = G.fish = { lv: 1, xp: 0, lo: 0, hi: 1, c: {}, defs: null };
  const fs = { st: '', x: 0, y: 0, t0: 0, wait: 0, fish: '', lo: 0, hi: 0, speed: 1, dur: 0, ct: 0, res: null };
  const FISH_ICON = { sardina: '🐟', salmon: '🍣', atun: '🐠', tiburon: '🦈', perla_marina: '🦪', tesoro_hundido: '🧰' };
  const hasRod = () => (G.inv || []).some((it) => it && G.items[it[0]] && G.items[it[0]].rod);
  const tri = (ph) => { const x = ph % 2; return x < 1 ? x : 2 - x; };
  const isWater = (x, y) => x >= 0 && y >= 0 && x < G.W && y < G.H && G.tiles && G.tiles[y * G.W + x] === 1;
  const castAt = (x, y) => {
    if (!hasRod()) { X.toast('🎣 Necesitas una caña de pescar: Nilo el Pescador las vende en la aldea de pescadores.', null, 4000); return; }
    if (!G.me || cheb(G.me.x, G.me.y, x, y) > 5) { X.toast('Acércate más al agua para lanzar la caña.', null, 2500); return; }
    send({ t: 'fcast', x, y });
  };
  X.on('click', (t) => {
    if (!isWater(t.x, t.y)) return false;
    if (!hasRod() && !fs.st) { const n = performance.now(); if (!fs.hint || n - fs.hint > 12000) { fs.hint = n; X.toast('🎣 Para pescar necesitas una caña (Nilo el Pescador).', null, 3000); } return false; }
    castAt(t.x, t.y); return true;
  });
  X.on('ctx', (t) => (isWater(t.x, t.y) ? [{ hdr: 'Agua' }, { label: '🎣 Pescar aquí', fn: () => castAt(t.x, t.y) }] : null));
  X.handlers.fcast = (m) => { fs.st = 'wait'; fs.x = m.x; fs.y = m.y; fs.t0 = performance.now(); fs.wait = m.wait; fs.ct = performance.now(); fs.res = null; fs.bait = m.bait; showGame(); };
  X.handlers.fbite = (m) => { fs.st = 'bite'; fs.fish = m.fish; fs.lo = m.lo; fs.hi = m.hi; fs.speed = m.speed; fs.dur = m.dur; fs.t0 = performance.now(); fs.bt = fs.t0; showGame(); };
  X.handlers.fend = (m) => {
    const was = fs.st; if (m.ok && m.fish) fs.jump = { cv: X.iconNode ? X.iconNode(m.fish) : null, x: fs.x, y: fs.y, t: performance.now() }; fs.st = ''; fs.res = m.ok ? { ok: 1, fish: m.fish, qty: m.qty, t: performance.now() } : (was && !m.silent ? { ok: 0, t: performance.now() } : null);
    showGame(); if (m.ok && fs.res) setTimeout(() => { if (fs.res && performance.now() - fs.res.t > 1300) { fs.res = null; showGame(); } }, 1400);
    if (!m.ok && fs.res) setTimeout(() => { if (fs.res && !fs.res.ok) { fs.res = null; showGame(); } }, 1400);
  };
  const fishLi = document.querySelector('#skills li[data-sk="fish"]');
  const syncFishRow = () => {
    if (!fishLi) return; const max = fsd.defs ? fsd.defs.max : 320, hi = fsd.hi > fsd.lo ? fsd.hi : fsd.lo + 1;
    fishLi.querySelector('b').textContent = fsd.lv; fishLi.title = `Nivel de pesca ${fsd.lv} / ${max} (clic para abrir la ventana de pesca)`;
    fishLi.querySelector('.bar i').style.width = (fsd.lv >= max ? 100 : Math.max(0, Math.min(100, (fsd.xp - fsd.lo) / (hi - fsd.lo) * 100))) + '%';
  };
  if (fishLi) { fishLi.style.cursor = 'pointer'; fishLi.addEventListener('click', () => toggle('o')); }
  X.handlers.fish = (m) => { Object.assign(fsd, m); if (m.defs) fsd.defs = m.defs; syncFishRow(); if (!wF.m.hidden) renderFish(); if (!wB.m.hidden) renderCol(); };

  // barra del minijuego
  const fg = el('div', 'fishgame'); fg.hidden = true;
  const fgT = el('div', 'fgt'), fgBar = el('div', 'fgbar'), fgZone = el('div', 'fgzone'), fgMark = el('div', 'fgmark'), fgHint = el('small', 'fgh');
  fgBar.append(fgZone, fgMark); fg.append(fgT, fgBar, fgHint); document.body.append(fg);
  const reel = () => { if (fs.st) send({ t: 'freel' }); };
  fgBar.addEventListener('mousedown', (ev) => { ev.stopPropagation(); reel(); });
  fgBar.addEventListener('touchstart', (ev) => { ev.preventDefault(); reel(); }, { passive: false });
  fg.addEventListener('mousedown', (ev) => ev.stopPropagation());
  function showGame() {
    if (!fs.st && !fs.res) { fg.hidden = true; return; }
    fg.hidden = false; fg.className = 'fishgame' + (fs.st === 'bite' ? ' bite' : '') + (fs.res ? (fs.res.ok ? ' won' : ' lost') : '');
    if (fs.res) { fgT.textContent = ''; if (fs.res.ok && X.iconNode) { const ic = X.iconNode(fs.res.fish); ic.classList && ic.classList.add('fgico'); fgT.append(ic); } fgT.append(fs.res.ok ? `¡Pescaste ${fs.res.qty > 1 ? fs.res.qty + '× ' : ''}${iname(fs.res.fish)}!` : 'Se escapó…'); fgBar.style.visibility = 'hidden'; fgHint.textContent = ''; return; }
    fgBar.style.visibility = fs.st === 'bite' ? 'visible' : 'hidden';
    if (fs.st === 'bite') { fgT.textContent = `🎣 ¡Picó un pez! Pulsa ESPACIO cuando el marcador esté en verde`; fgZone.style.left = fs.lo * 100 + '%'; fgZone.style.width = (fs.hi - fs.lo) * 100 + '%'; fgHint.textContent = 'o haz clic en la barra'; }
    else { fgT.textContent = fs.bait ? '🎣 Esperando… (con cebo)' : '🎣 Esperando a que pique…'; fgHint.textContent = 'No te muevas · tirar antes de tiempo asusta al pez'; }
  }
  X.on('key', (k, ev) => { if ((k === ' ' && fs.st) || (k === 'enter' && fs.st === 'bite')) { reel(); return true; } return false; });
  X.on('draw', (c, now) => {
    if (fs.st === 'bite') { fgMark.style.left = tri((performance.now() - fs.t0) / 1000 * fs.speed) * 100 + '%'; }
  });

  // el pez salta del agua hasta el pescador
  X.on('draw', (c) => {
    const j = fs.jump; if (!j) return; const k = (performance.now() - j.t) / 750; const me = G.ents.get(G.id);
    if (k >= 1 || !me || !j.cv || !j.cv.width) { fs.jump = null; return; }
    const TS = X.TS, ax = X.sxOf(j.x) + TS / 2, ay = X.syOf(j.y) + TS / 2, bx = X.sxOf(me.rx) + TS / 2, by = X.syOf(me.ry) + TS / 2 - 8;
    const x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(k * Math.PI) * 38, sc = 0.9 + Math.sin(k * Math.PI) * 0.5;
    c.save(); c.translate(x, y); c.rotate((k - 0.5) * 1.6 * (bx < ax ? -1 : 1)); c.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    c.drawImage(j.cv, -j.cv.width * sc / 2, -j.cv.height * sc / 2, j.cv.width * sc, j.cv.height * sc); c.restore();
  });

  // sedal y corcho en el mundo
  const rodIc = {};
  X.on('draw', (c, now) => {
    if (!fs.st || !G.me) return;
    const me = G.ents.get(G.id); if (!me) return; const TS = X.TS;
    const tx = X.sxOf(fs.x) + TS / 2, ty = X.syOf(fs.y) + TS / 2, px = X.sxOf(me.rx) + TS / 2 + 6, py = X.syOf(me.ry) + TS / 2 - 10;
    const k = Math.min(1, (performance.now() - fs.ct) / 380), bite = fs.st === 'bite';
    // caña en la mano: la mejor que tengas (el icono girado, mango en la mano y punta hacia el agua); el sedal sale de la punta
    let px0 = px, py0 = py, rid = '', rq = -1;
    for (const it of G.inv || []) { const d = it && G.items[it[0]]; const r = d && d.rod && fsd.defs && fsd.defs.rods[it[0]]; if (r && r.req <= fsd.lv && r.req > rq) { rq = r.req; rid = it[0]; } }
    if (rid && X.iconNode) {
      const ic = (rodIc[rid] && rodIc[rid].width ? rodIc[rid] : (rodIc[rid] = X.iconNode(rid))), dir = tx < px - 1 ? -1 : 1, sz = 30, sway = bite ? Math.sin(now / 45) * 1.6 : Math.sin(now / 700) * 0.6;
      const hx = px - dir * 5, hy = py + 11;
      if (ic && ic.tagName === 'CANVAS' && ic.width) { c.save(); c.translate(hx, hy); c.scale(dir, 1); c.imageSmoothingEnabled = false; c.drawImage(ic, 0, -sz + 2, sz, sz); c.restore(); }
      px0 = hx + dir * (sz - 3); py0 = hy - sz + 5 + sway;
    }
    const px1 = px0, py1 = py0;
    const bx = px1 + (tx - px1) * k, by = py1 + (ty - py1) * k - Math.sin(k * Math.PI) * 26;
    c.save();
    c.strokeStyle = 'rgba(235,235,225,.85)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px1, py1); c.quadraticCurveTo((px1 + bx) / 2, Math.min(py1, by) + 10 * (1 - k * 0.7), bx, by); c.stroke();
    if (k >= 1) {
      for (let i = 0; i < 2; i++) { const ph = ((now / (bite ? 350 : 1100)) + i * 0.5) % 1; c.strokeStyle = `rgba(220,240,255,${(1 - ph) * (bite ? 0.9 : 0.5)})`; c.lineWidth = 1.5; c.beginPath(); c.ellipse(tx, ty + 4, 4 + ph * (bite ? 14 : 10), 2 + ph * (bite ? 6 : 4), 0, 0, 7); c.stroke(); }
      const dip = bite ? 3 + Math.sin(now / 55) * 2.2 : Math.sin(now / 600) * 1;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(tx, ty + 5, 4, 1.8, 0, 0, 7); c.fill();
      c.fillStyle = '#f4f1ea'; c.beginPath(); c.arc(tx, ty + dip, 3.6, 0, 7); c.fill();
      c.fillStyle = '#e5483a'; c.beginPath(); c.arc(tx, ty + dip - 1.5, 3.6, Math.PI, 0); c.fill();
      c.fillStyle = '#ff7f6a'; c.fillRect(tx - 1.5, ty + dip - 4, 1.5, 1.5);
      if (bite) { c.fillStyle = '#ffe36a'; c.font = 'bold 16px "Segoe UI",sans-serif'; c.textAlign = 'center'; c.strokeStyle = '#3a2a00'; c.lineWidth = 3; c.strokeText('!', tx, ty - 12 + Math.sin(now / 90) * 2); c.fillText('!', tx, ty - 12 + Math.sin(now / 90) * 2); }
    } else { c.fillStyle = '#e5483a'; c.beginPath(); c.arc(bx, by, 3, 0, 7); c.fill(); }
    c.restore();
  });

  // ventana: nivel, peces por zona, cañas y registro de capturas
  function renderFish() {
    const b = wF.body; b.textContent = ''; const d = fsd.defs; if (!d) { b.append(el('p', '', 'Cargando…')); return; }
    const pct = fsd.lv >= d.max ? 100 : Math.max(0, Math.min(100, (fsd.xp - fsd.lo) / Math.max(1, fsd.hi - fsd.lo) * 100));
    b.append(el('p', 'colhead', `Nivel de pesca ${fsd.lv} / ${d.max}  ·  ${fmt(fsd.xp)} xp`));
    const bar = el('div', 'fbarx'), fill = el('div', 'fbarf'); fill.style.width = pct + '%'; bar.append(fill); b.append(bar);
    b.append(el('p', 'fhint', 'Compra una caña a Nilo el Pescador (aldea de pescadores) y haz clic en el agua (o clic derecho → Pescar). Quédate quieto, espera la picada y pulsa ESPACIO con el marcador en la zona verde. A más nivel: menos espera, zona verde más ancha y peces mejores. Cebos aceleran la picada y atraen peces raros.'));
    b.append(el('h3', '', 'Registro de capturas'));
    const g = el('div', 'colgrid');
    for (const id of ['sardina', 'salmon', 'atun', 'tiburon', 'perla_marina', 'tesoro_hundido']) {
      const n = fsd.c[id] || 0, F = d.fish[id], tile = el('div', 'coltile' + (n ? ' on' : ''));
      const ic = el('div', 'ico'); ic.append(X.iconNode ? X.iconNode(id) : FISH_ICON[id] || '🐟'); tile.append(ic, el('small', '', n ? iname(id) : '???'));
      if (n) tile.append(el('b', '', '×' + n));
      tile.title = F ? `${iname(id)} · requiere pesca ${F.lvl} · cura ${(G.items[id] || {}).heal || 0}` : `${iname(id)} · tesoro raro`;
      g.append(tile);
    }
    b.append(g);
    b.append(el('h3', '', 'Dónde pescar'));
    for (const z of Object.values(d.zones)) {
      const row = el('p', 'frow'); row.append(el('b', '', z.name + (z.danger ? ' ⚠️' : '') + ': '));
      z.fish.forEach(([id], i) => { const F = d.fish[id], ok = fsd.lv >= F.lvl; const s = el('span', ok ? 'fok' : 'flock', `${FISH_ICON[id]} ${iname(id)} (${F.lvl})`); row.append(i ? ' · ' : '', s); });
      b.append(row);
    }
    b.append(el('h3', '', 'Cañas'));
    for (const [id, r] of Object.entries(d.rods)) { const ok = fsd.lv >= r.req; { const row = el('p', 'frow' + (ok ? '' : ' flock')); const ic = el('span', 'fricon'); ic.append(X.iconNode ? X.iconNode(id) : '🎣'); row.append(ic, `${r.name} — pesca ${r.req} · espera ${Math.round(r.wait * 100)}% · zona verde +${Math.round(r.bar * 100)}%${have(id) ? ' ✔ la tienes' : ''}`); b.append(row); } }
  }
  wF.onOpen = () => { send({ t: 'fish' }); renderFish(); };

  /* ---------- atajos ---------- */
  const KEYS = { u: 'u', n: 'map', q: 'q', l: 'a', g: 's', r: 'r', p: 'm', f: 'c', b: 'b', o: 'o' };
  X.on('key', (k) => {
    if (KEYS[k]) { toggle(KEYS[k]); return true; }
    if (k === '1' || k === '2' || k === '3') { useSkill(+k - 1); return true; }
    return false;
  });

  /* ============================ HABILIDADES ============================ */
  const sk = { box: null, btns: [], cd: {}, style: '' };
  const STYLE_ICON = { melee: '⚔️', ranged: '🏹', magic: '🔮' };
  function buildSkills() {
    const hb = $('#hotbar'); if (!hb || !G.stats || !xi.skills.melee) return;
    const style = G.stats.style; if (!style || !xi.skills[style]) return;
    if (!sk.box) { sk.box = el('span', 'skbox'); hb.append(el('span', 'gap'), sk.box); }
    if (sk.style === style && sk.btns.length) return;
    sk.style = style; sk.btns = []; sk.box.replaceChildren();
    xi.skills[style].forEach((d, i) => {
      const b = el('button', 'skb'); b.type = 'button'; b.dataset.i = i;
      b.append(el('b', '', d.icon), el('small', '', String(i + 1)), el('i', 'cdv'));
      b.title = `${d.name} (${i + 1}) — ${d.desc} Maná ${d.mana}. Enfriamiento ${d.cd / 1000} s. Nivel ${d.lv} con ${STYLE_ICON[style]}.`;
      b.addEventListener('click', () => useSkill(i)); sk.box.append(b); sk.btns.push(b);
    });
    tickSkills();
  }
  const skLv = () => (G.stats && G.stats.sk && G.stats.sk[sk.style] ? G.stats.sk[sk.style][0] : 1);
  function useSkill(i) {
    const d = xi.skills[sk.style] && xi.skills[sk.style][i]; if (!d) return;
    if (skLv() < d.lv) { X.toast(`${d.name}: necesitas nivel ${d.lv} de ${STYLE_ICON[sk.style]}.`, null, 2500); return; }
    send({ t: 'skill', k: i });
  }
  function tickSkills() {
    if (!sk.btns.length) return;
    const now = performance.now(), lv = skLv(), mana = G.stats ? G.stats.mana : 0;
    sk.btns.forEach((b, i) => {
      const d = xi.skills[sk.style][i], left = Math.max(0, (sk.cd[d.id] || 0) - now);
      b.classList.toggle('lock', lv < d.lv); b.classList.toggle('nomana', lv >= d.lv && mana < d.mana);
      const cv = b.querySelector('.cdv'); cv.style.height = left > 0 ? Math.min(100, (left / d.cd) * 100) + '%' : '0';
    });
  }
  setInterval(tickSkills, 100);
  X.on('stats', () => { buildSkills(); tickSkills(); });
  X.handlers.skcd = (m) => { sk.cd[m.id] = performance.now() + m.ms; tickSkills(); };

  /* ============================ MEJORAS ACTIVAS ============================ */
  const BUFF = { atk: ['⚔️', 'Ataque'], def: ['🛡️', 'Defensa'], xp: ['📘', 'Experiencia'], shield: ['🔮', 'Escudo arcano'] };
  G.buffs = {};
  function renderBuffs() {
    buffsEl.replaceChildren(); const now = performance.now();
    for (const k in G.buffs) {
      const b = G.buffs[k], left = Math.max(0, Math.ceil((b.t - now) / 1000)); if (!left) { delete G.buffs[k]; continue; }
      const i = el('span', 'bf', ''); i.append(el('b', '', (BUFF[k] || ['✨'])[0]), el('small', '', left > 99 ? Math.ceil(left / 60) + 'm' : left + 's'));
      i.title = `${(BUFF[k] || ['', k])[1]}${k === 'shield' ? ' (' + b.hp + ' de absorción)' : ' ×' + b.m}`; buffsEl.append(i);
    }
  }
  X.handlers.buffs = (m) => { G.buffs = {}; const now = performance.now(); for (const k in m.b) G.buffs[k] = { t: now + m.b[k].s * 1000, m: m.b[k].m, hp: m.b[k].hp }; renderBuffs(); };
  setInterval(renderBuffs, 500);

  /* ============================ EVENTO DE JEFE ============================ */
  let bannerT = 0;
  X.handlers.event = (m) => {
    banner.hidden = false; banner.className = 'banner2 ' + m.k; banner.textContent = '';
    banner.append(el('b', '', m.k === 'end' ? '🗿 Evento terminado' : m.k === 'warn' ? '⚠️ Evento inminente' : '🗿 ¡Jefe de evento!'), el('span', '', m.text || ''));
    if (m.x != null) G.eventAt = { x: m.x, y: m.y, t: performance.now() };
    clearTimeout(bannerT); bannerT = setTimeout(() => { banner.hidden = true; }, m.k === 'start' ? 22000 : 12000);
    if (m.k === 'end') G.eventAt = null;
  };
  // flecha hacia el jefe
  X.on('draw', (c, now, cw, ch) => {
    const t = G.eventAt; if (!t || !G.me) return;
    if (now - t.t > 600000) { G.eventAt = null; return; }
    const dx = t.x - G.me.x, dy = t.y - G.me.y, d = Math.hypot(dx, dy); if (d < 14) return;
    const a = Math.atan2(dy, dx), px = cw / 2 + Math.cos(a) * Math.min(cw, ch) * 0.36, py = ch / 2 + Math.sin(a) * Math.min(cw, ch) * 0.36;
    c.save(); c.translate(px, py); c.rotate(a); c.fillStyle = 'rgba(255,120,60,.9)'; c.strokeStyle = '#000'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(12, 0); c.lineTo(-8, 8); c.lineTo(-3, 0); c.lineTo(-8, -8); c.closePath(); c.stroke(); c.fill(); c.restore();
    c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffb48a'; c.strokeStyle = '#000'; c.lineWidth = 3;
    c.strokeText(`🗿 ${Math.round(d)}`, px, py + 20); c.fillText(`🗿 ${Math.round(d)}`, px, py + 20);
  });

  /* ============================ MARCAS SOBRE LOS PNJ, NODOS Y MASCOTAS ============================ */
  const nodeAt = (x, y) => (G.nodes || []).find((n) => n[2] === x && n[3] === y);
  X.on('under', (c, now) => {
    const TS = X.TS;
    // marcas de misión
    for (const n of G.npcs || []) {
      let mark = '';
      for (const id in QD) { if (QD[id].npc !== n.id) continue; const st = qView(id).st; if (st === 'ready') { mark = '?'; break; } if (st === 'new') mark = mark || '!'; else if (st === 'active') mark = mark || '…'; }
      if (!mark) continue;
      const cx = X.sxOf(n.x) + TS / 2, cy = X.syOf(n.y) - 18 + Math.sin(now / 260 + n.x) * 2;
      X.outlined(c, mark === '…' ? '?' : mark, cx, cy, mark === '!' ? '#ffd23f' : mark === '?' ? '#ffd23f' : '#9aa7b3', 'bold 22px Georgia, serif');
    }
    // nodos de recolección
    for (const [, type, x, y] of G.nodes || []) {
      const d = xi.nodes[type]; if (!d) continue;
      const cx = X.sxOf(x) + TS / 2, cy = X.syOf(y) + TS / 2, pulse = 1 + Math.sin(now / 420 + x * 3 + y) * 0.06;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, cy + 10, 10, 3.5, 0, 0, 7); c.fill();
      if (d.spr && X.SPR[d.spr] && X.sprReady()) {                                   // rocas de minería (sprites)
        X.drawSpriteS(c, d.spr, 0, cx, cy + 12, false, 1.1);
        if (G.mine && d.lvl > G.mine.lv) { c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffb4a0'; c.strokeStyle = '#000'; c.lineWidth = 2.5; c.strokeText('⛏️' + d.lvl, cx, cy - 8); c.fillText('⛏️' + d.lvl, cx, cy - 8); }
        continue;
      }
      c.save(); c.translate(cx, cy + 2); c.scale(pulse, pulse); c.font = '20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.icon, 0, 0); c.restore();
      if (Math.sin(now / 300 + x * 7) > 0.88) { c.fillStyle = '#fff'; c.fillRect(cx + 7, cy - 9, 2, 2); }
    }
    // mascotas
    for (const e of G.ents.values()) {
      if (e.kind !== 'pl' || !e.pt || !G.items[e.pt]) continue;
      const d = G.items[e.pt], pp = e.pet || (e.pet = { x: e.rx - 0.8, y: e.ry + 0.4, f: 1 });
      const tx = e.rx - (e.face || 1) * 0.85, ty = e.ry + 0.35, dd = Math.hypot(tx - pp.x, ty - pp.y);
      if (dd > 6) { pp.x = tx; pp.y = ty; } else if (dd > 0.05) { const k = Math.min(1, dd * 0.09 + 0.02); pp.x += (tx - pp.x) * k * 1.4; pp.y += (ty - pp.y) * k * 1.4; pp.f = tx >= pp.x ? 1 : -1; }
      const sx = X.sxOf(pp.x) + TS / 2, sy = X.syOf(pp.y) + TS - 4, bob = Math.abs(Math.sin(now / 160 + e.id)) * (dd > 0.1 ? 3 : 0.8);
      if (sx < -60 || sy < -60 || sx > c.canvas.width + 60) continue;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(sx, sy, 8, 3, 0, 0, 7); c.fill();
      const ok = !d.emoji && X.SPR[d.mon] && X.sprReady() && X.drawSpriteS(c, d.mon, 0, sx, sy - bob, pp.f < 0, d.scale || 0.5);
      if (!ok) { c.font = '18px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff'; c.fillText(d.emoji || d.icon, sx, sy - bob); }
    }
  });
  // aura del escudo / grito sobre el propio jugador
  X.on('draw', (c, now) => {
    if (!G.me) return; const me = G.ents.get(G.id); if (!me) return;
    const TS = X.TS, cx = X.sxOf(me.rx) + TS / 2, cy = X.syOf(me.ry) + TS / 2;
    const sh = G.buffs.shield, at = G.buffs.atk;
    if (sh) { c.save(); c.strokeStyle = `rgba(140,190,255,${0.55 + 0.25 * Math.sin(now / 160)})`; c.lineWidth = 2; c.fillStyle = 'rgba(120,170,255,.12)'; c.beginPath(); c.arc(cx, cy, 20, 0, 7); c.fill(); c.stroke(); c.restore(); }
    if (at) { c.save(); c.strokeStyle = `rgba(255,170,60,${0.35 + 0.2 * Math.sin(now / 120)})`; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy + 4, 16 + Math.sin(now / 140) * 1.5, 0, 7); c.stroke(); c.restore(); }
  });

  // clic en un nodo: camina hasta él y recolecta
  let gTarget = null;
  X.on('click', (t) => {
    const n = nodeAt(t.x, t.y); if (!n || !G.me) return false;
    gTarget = { id: n[0], x: n[2], y: n[3], until: performance.now() + 15000 };
    if (cheb(G.me.x, G.me.y, n[2], n[3]) > 1) X.walkTo(n[2], n[3]);
    tickGather(); return true;
  });
  function tickGather() {
    if (!gTarget || !G.me) return;
    if (performance.now() > gTarget.until || !nodeAt(gTarget.x, gTarget.y)) { gTarget = null; return; }
    if (cheb(G.me.x, G.me.y, gTarget.x, gTarget.y) <= 1) { send({ t: 'gather', id: gTarget.id }); gTarget.until = performance.now() + 900; }
  }
  setInterval(tickGather, 350);

  /* ============================ MINERÍA ============================ */
  const wMn = win('u', '⛏️ Minería', true); mkBtn('⛏️', 'Minería', 'u', 'u');
  const msd = G.mine = { lv: 1, xp: 0, lo: 0, hi: 1, c: {}, defs: null };
  const GEM_IC = { rubi: '🔴', zafiro: '🔵', esmeralda: '🟢', topacio: '🟡', amatista: '🟣', opalo: '🟠', diamante: '💎' };
  const bestPickId = () => {
    let best = '', rq = -1; const picks = (msd.defs && msd.defs.picks) || {};
    for (const it of G.inv || []) { const r = it && picks[it[0]]; if (r && r.req <= msd.lv && r.req > rq) { rq = r.req; best = it[0]; } }
    return best;
  };
  const mineLi = document.querySelector('#skills li[data-sk="mine"]');
  function syncMineRow() {
    if (!mineLi) return; const max = msd.defs ? msd.defs.max : 320, hi = msd.hi > msd.lo ? msd.hi : msd.lo + 1;
    mineLi.querySelector('b').textContent = msd.lv; mineLi.title = `Nivel de minería ${msd.lv} / ${max} (clic para abrir la ventana de minería)`;
    mineLi.querySelector('.bar i').style.width = (msd.lv >= max ? 100 : Math.max(0, Math.min(100, (msd.xp - msd.lo) / (hi - msd.lo) * 100))) + '%';
  }
  if (mineLi) { mineLi.style.cursor = 'pointer'; mineLi.addEventListener('click', () => toggle('u')); }
  function renderMine() {
    const b = wMn.body; b.textContent = ''; const d = msd.defs; if (!d) { b.append(el('p', '', 'Cargando…')); return; }
    const pct = msd.lv >= d.max ? 100 : Math.max(0, Math.min(100, (msd.xp - msd.lo) / Math.max(1, msd.hi - msd.lo) * 100));
    b.append(el('p', 'colhead', `Nivel de minería ${msd.lv} / ${d.max}  ·  ${fmt(msd.xp)} xp`));
    const bar = el('div', 'fbarx'), fill = el('div', 'fbarf'); fill.style.width = pct + '%'; bar.append(fill); b.append(bar);
    b.append(el('p', 'fhint', 'Compra un pico a Boris el Mercader (ciudad) y haz clic en una roca del mapa: caminarás hasta ella y la picarás. Cada roca pide un nivel de minería. Mejores picos minan más rápido, dan más piedra y atraen más gemas. Las gemas se engarzan en las ranuras de armas y armaduras (en una zona segura).'));
    b.append(el('h3', '', 'Rocas y registro'));
    const g = el('div', 'colgrid');
    for (const id of d.order) {
      const r = d.rocks[id], n = msd.c[id] || 0, ok = msd.lv >= r.lvl, tile = el('div', 'coltile' + (n ? ' on' : ''));
      const ic = el('div', 'ico'); ic.append(X.iconNode ? X.iconNode(id) : '🪨'); tile.append(ic, el('small', '', n || ok ? r.name : '???'), el('small', '', ok ? `Nv ${r.lvl}` : `🔒 Nv ${r.lvl}`));
      if (n) tile.append(el('b', '', '×' + n));
      tile.title = `${r.name} · minería ${r.lvl} · ${r.xp} xp · gema ${(r.gem * 100).toFixed(1)}% (base) · ${r.zones.join(', ')}`;
      g.append(tile);
    }
    b.append(g);
    b.append(el('h3', '', 'Dónde minar'));
    for (const id of d.order) {
      const r = d.rocks[id], ok = msd.lv >= r.lvl, row = el('p', 'frow' + (ok ? '' : ' flock')), ic = el('span', 'fricon'); ic.append(X.iconNode ? X.iconNode(id) : '🪨');
      row.append(ic, el('b', '', `${r.name} (Nv ${r.lvl}): `), r.zones.join(' · '), el('small', '', `  ·  gemas: ${r.pool.filter((v, i, a) => a.indexOf(v) === i).map((q) => GEM_IC[q] || q).join(' ')}`)); b.append(row);
    }
    b.append(el('h3', '', 'Gemas encontradas'));
    const gg = el('div', 'colgrid');
    for (const id of ['rubi', 'zafiro', 'esmeralda', 'topacio', 'amatista', 'opalo', 'diamante']) {
      const n = msd.c[id] || 0, tile = el('div', 'coltile' + (n ? ' on' : '')), ic = el('div', 'ico'); ic.append(X.iconNode ? X.iconNode(id) : GEM_IC[id]);
      tile.append(ic, el('small', '', n ? iname(id) : '???')); if (n) tile.append(el('b', '', '×' + n)); tile.title = (G.gems && G.gems[id] ? G.gems[id].desc : '') || iname(id); gg.append(tile);
    }
    b.append(gg);
    b.append(el('h3', '', 'Picos'));
    for (const [id, r] of Object.entries(d.picks)) { const ok = msd.lv >= r.req, row = el('p', 'frow' + (ok ? '' : ' flock')), ic = el('span', 'fricon'); ic.append(X.iconNode ? X.iconNode(id) : '⛏️'); row.append(ic, `${r.name} — minería ${r.req} · velocidad ${Math.round(100 / r.speed)}% · gemas +${Math.round(r.gem * 100)}% · piedra extra ${Math.round(r.extra * 100)}% · ${fmt(r.price)} 🪙${have(id) ? ' ✔ lo tienes' : ''}`); b.append(row); }
  }
  X.handlers.mine = (m) => { Object.assign(msd, m); if (m.defs) msd.defs = m.defs; syncMineRow(); if (!wMn.m.hidden) renderMine(); if (!wB.m.hidden) renderCol(); };
  wMn.onOpen = () => { send({ t: 'mine' }); renderMine(); };
  // al picar: polvo y esquirlas de la roca + el pico en la mano (se balancea mientras minas)
  X.on('fx', (f) => { if (f.k === 'mn') { X.burst(f.x, f.y, 'stone', 16, { sp: 4, up: 3, g: 5, life: 0.55, size: 2.6 }); X.ring(f.x, f.y, 'stone', 300, 18, 3); } });
  const pkIc = {};
  X.on('draw', (c, now) => {
    if (!gTarget || !G.me || performance.now() > gTarget.until || cheb(G.me.x, G.me.y, gTarget.x, gTarget.y) > 1) return;
    const id = bestPickId(); if (!id || !X.iconNode) return; const me = G.ents.get(G.id); if (!me) return;
    const ic = (pkIc[id] && pkIc[id].width ? pkIc[id] : (pkIc[id] = X.iconNode(id))); if (!ic || ic.tagName !== 'CANVAS' || !ic.width) return;
    const TS = X.TS, dir = gTarget.x < me.x ? -1 : 1, cx = X.sxOf(me.rx) + TS / 2 + dir * 5, cy = X.syOf(me.ry) + TS / 2 + 3, ang = -0.5 + (Math.sin(now / 95) * 0.5 + 0.5) * 1.5, k = 0.8;
    c.save(); c.translate(cx, cy); c.scale(dir, 1); c.rotate(ang); c.imageSmoothingEnabled = false; c.drawImage(ic, -4 * k, -31 * k, 36 * k, 36 * k); c.restore();
  });

  /* ============================ EFECTOS DE HABILIDADES ============================ */
  X.on('fx', (f) => {
    if (f.k !== 'sk') return;
    const TS = X.TS, x = f.x, y = f.y, now = performance.now();
    const R = (r, el2, T, w) => X.ring(x, y, el2, T, r * TS, w || 4);
    switch (f.id) {
      case 'golpe': X.burst(x, y, 'sun', 26, { sp: 6, life: 0.6, size: 3 }); R(1.2, 'sun', 420); G.shake = { t: now, m: 5 }; break;
      case 'torbellino': X.burst(x, y, 'sun', 34, { sp: 7, life: 0.55, size: 2.4 }); R(1.5, 'sun', 380); R(0.8, 'fire', 300); G.shake = { t: now, m: 3 }; break;
      case 'grito': X.burst(x, y - 0.3, 'fire', 30, { sp: 4, up: 3, life: 0.9, size: 3 }); R(3, 'fire', 700, 5); break;
      case 'certero': X.addFx({ k: 'p', x1: f.x1, y1: f.y1, x2: x, y2: y, s: 'ranged', cr: 1 }); break;
      case 'lluvia': for (let i = 0; i < 16; i++) setTimeout(() => X.burst(x + (Math.random() - 0.5) * (f.r * 2 + 1), y + (Math.random() - 0.5) * (f.r * 2 + 1), null, 6, { sp: 2, g: 6, life: 0.3, size: 1.8, add: false }), i * 40); R(f.r || 2, 'sun', 800, 3); break;
      case 'veneno': X.addFx({ k: 'p', x1: f.x1, y1: f.y1, x2: x, y2: y, s: 'ranged' }); setTimeout(() => { X.burst(x, y, 'poison', 22, { sp: 2, up: 2, life: 0.9, size: 2.6 }); R(1, 'poison', 600); }, 220); break;
      case 'bola': X.addFx({ k: 'p', x1: f.x1, y1: f.y1, x2: x, y2: y, s: 'fire' }); setTimeout(() => { X.burst(x, y, 'fire', 40, { sp: 5, life: 0.7, size: 3.4 }); R(f.r || 1.5, 'fire', 520, 5); G.shake = { t: performance.now(), m: 4 }; }, 260); break;
      case 'hielo': X.addFx({ k: 'p', x1: f.x1, y1: f.y1, x2: x, y2: y, s: 'ice' }); setTimeout(() => { X.burst(x, y, 'ice', 28, { sp: 3, life: 0.8, size: 2.6 }); R(1, 'ice', 500); }, 200); break;
      case 'escudo': X.burst(x, y - 0.2, 'magic', 30, { sp: 3, up: 2, life: 0.9, size: 2.6 }); R(1.4, 'magic', 700); break;
      default: break;
    }
  });

  /* ============================ ATAQUES DEL DRAGÓN DE LAS SOMBRAS ============================ */
  const BF = [];                                   // efectos de jefe en curso
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cracks = (r) => Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 6.283 + rnd(-0.2, 0.2), pts = [[0, 0]]; let d = 0; while (d < r * rnd(0.7, 1)) { d += rnd(0.35, 0.7); pts.push([Math.cos(a + rnd(-0.28, 0.28)) * d, Math.sin(a + rnd(-0.28, 0.28)) * d]); } return pts; });
  X.on('fx', (f) => {
    const now = performance.now();
    switch (f.k) {
      case 'dkw': BF.push({ k: 'dkw', t: now, T: 1000, f }); break;
      case 'dk': BF.push({ k: 'dk', t: now, T: 1000, f, seed: Math.random() * 99 }); G.shake = { t: now, m: 3 }; X.burst(f.x1, f.y1, 'dark', 26, { sp: 4, life: 0.7, size: 3.2, add: false }); break;
      case 'slw': BF.push({ k: 'slw', t: now, T: 1100, f }); break;
      case 'sl': BF.push({ k: 'crack', t: now, T: 9000, x: f.x, y: f.y, r: f.r, c: cracks(f.r) });
        X.ring(f.x, f.y, 'fire', 700, f.r * 32, 6); X.ring(f.x, f.y, 'dark', 520, f.r * 20, 4);
        X.burst(f.x, f.y, 'fire', 60, { sp: 7, up: 3, g: 5, life: 0.9, size: 3.4 }); X.burst(f.x, f.y, 'dark', 30, { sp: 5, life: 0.9, size: 3.5, add: false });
        G.shake = { t: now, m: 9 }; break;
      case 'fiw': BF.push({ k: 'fiw', t: now, T: 1000, f }); break;
      case 'fi': BF.push({ k: 'crack', t: now, T: 6000, x: f.x, y: f.y, r: 1.5, c: cracks(1.5) }); BF.push({ k: 'fi', t: now, T: 700, f });
        X.burst(f.x, f.y, 'fire', 34, { sp: 3, up: 6, g: 4, life: 0.9, size: 3.4 }); X.ring(f.x, f.y, 'fire', 500, 26, 4); break;
      case 'burn': X.burst(f.x, f.y - 0.3, 'dark', 8, { sp: 1.2, up: 2.4, life: 0.7, size: 2.6, add: false }); break;
      default: break;
    }
  });
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  // el aliento sale de la boca: algo por encima y hacia donde mira el dragón
  const mouth = (f) => { let face = 1; for (const e of G.ents.values()) if (e.kind === 'mo' && e.t === 'dragon_sombra' && Math.abs(e.x - f.x1) < 2 && Math.abs(e.y - f.y1) < 2) face = e.face || 1; return [px(f.x1) + face * 1.4 * X.TS, py(f.y1) - 1.3 * X.TS]; };
  // suelo: avisos rojos, grietas de lava
  X.on('under', (c, now) => {
    for (let i = BF.length - 1; i >= 0; i--) {
      const b = BF[i], p = (now - b.t) / b.T; if (p >= 1) { BF.splice(i, 1); continue; }
      const TS = X.TS;
      if (b.k === 'dkw') {
        const f = b.f, [x1, y1] = mouth(f), x2 = px(f.x2), y2 = py(f.y2), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
        c.save(); c.translate(x1, y1); c.rotate(a); c.fillStyle = `rgba(140,60,220,${0.10 + 0.22 * p})`; c.fillRect(0, -TS * 1.6, L, TS * 3.2);
        c.strokeStyle = `rgba(210,150,255,${0.35 + 0.4 * Math.abs(Math.sin(now / 90))})`; c.lineWidth = 2; c.strokeRect(0, -TS * 1.6, L, TS * 3.2); c.restore();
      } else if (b.k === 'slw') {
        const f = b.f, x = px(f.x), y = py(f.y), r = f.r * TS;
        c.fillStyle = `rgba(230,40,20,${0.08 + 0.22 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,${90 + 100 * Math.abs(Math.sin(now / 80))},40,.85)`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
        c.beginPath(); c.arc(x, y, r * p, 0, 7); c.stroke();
      } else if (b.k === 'fiw') {
        const f = b.f, x = px(f.x), y = py(f.y), r = f.r * TS;
        c.strokeStyle = `rgba(255,150,40,${0.5 + 0.4 * Math.abs(Math.sin(now / 70))})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
        c.fillStyle = `rgba(255,90,20,${0.12 + 0.3 * p})`; c.fill();
      } else if (b.k === 'crack') {
        const x = px(b.x), y = py(b.y), al = Math.min(1, (1 - p) * 2.2);
        c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round';
        for (const pts of b.c) {
          c.beginPath(); pts.forEach(([u, v], j) => (j ? c.lineTo(u * TS, v * TS) : c.moveTo(u * TS, v * TS)));
          c.strokeStyle = `rgba(10,6,8,${0.85 * al})`; c.lineWidth = 4; c.stroke();
          c.strokeStyle = `rgba(255,${100 + 60 * Math.sin(now / 200 + pts.length)},20,${0.9 * al})`; c.lineWidth = 1.6; c.stroke();
        }
        c.restore();
      }
    }
  });
  // por encima: aliento de fuego negro y columnas de lava
  X.on('draw', (c, now) => {
    for (const b of BF) {
      const p = (now - b.t) / b.T, TS = X.TS; if (p >= 1) continue;
      if (b.k === 'dk') {
        const f = b.f, [x1, y1] = mouth(f), x2 = px(f.x2), y2 = py(f.y2), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
        const reach = Math.min(1, p * 4), al = p < 0.7 ? 1 : (1 - p) / 0.3;
        c.save(); c.translate(x1, y1); c.rotate(a);
        for (let i = 0; i < 46; i++) {
          const s = (i / 46) * L * reach, w = 7 + (s / L) * 26, off = Math.sin(now / 55 + i * 1.7 + b.seed) * w * 0.55;
          c.fillStyle = `rgba(14,5,24,${0.85 * al})`; c.beginPath(); c.arc(s, off, w, 0, 7); c.fill();
          if (i % 2) { c.strokeStyle = `rgba(170,90,255,${0.55 * al})`; c.lineWidth = 2; c.beginPath(); c.arc(s, off, w + 1, 0, 7); c.stroke(); }
        }
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) { const s = rnd(0, L * reach); c.fillStyle = `rgba(190,110,255,${0.35 * al})`; c.beginPath(); c.arc(s, rnd(-1, 1) * (8 + s / L * 24), rnd(2, 5), 0, 7); c.fill(); }
        c.restore();
      } else if (b.k === 'fi') {
        const f = b.f, x = px(f.x), y = py(f.y) + 8, h = 90 * Math.sin(Math.min(1, p * 2.2) * Math.PI * 0.5) * (1 - p * 0.6);
        const g = c.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, 'rgba(255,230,120,.95)'); g.addColorStop(0.5, 'rgba(255,110,20,.85)'); g.addColorStop(1, 'rgba(90,20,10,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(x - 13, y); c.quadraticCurveTo(x - 7 + Math.sin(now / 50) * 3, y - h * 0.6, x, y - h); c.quadraticCurveTo(x + 7 + Math.sin(now / 60) * 3, y - h * 0.6, x + 13, y); c.closePath(); c.fill();
      }
    }
  });

  /* ============================ CLAVE: código de recuperación ============================ */
  X.handlers.xauth = (m) => {
    if (m.ok === 'created' && m.rc) {
      const w = win('rc', '🔑 Código de recuperación'); w.body.replaceChildren();
      w.body.append(el('p', '', 'Guarda este código. Es la única forma de recuperar tu cuenta si olvidas la clave:'), el('p', 'code', m.rc), el('p', 'fine', 'Cada código sirve una sola vez. Si lo pierdes, escribe /codigo tuClave en el chat para crear uno nuevo.'));
      const cp = btn('Copiar', () => { try { navigator.clipboard.writeText(m.rc); cp.textContent = 'Copiado ✔'; } catch (e) { /* sin portapapeles */ } }, 'primary'); w.body.append(cp);
      open('rc');
    } else if (m.ok === 'recovered') {
      $('#loginErr').textContent = ''; const ok = $('#recMsg'); if (ok) ok.textContent = 'Contraseña cambiada. Ya puedes entrar con la nueva.';
    }
  };
  (() => {
    const form = $('#loginForm'); if (!form) return;
    const a = el('button', 'linkbtn', '¿Olvidaste tu clave?'); a.type = 'button'; form.append(a);
    const box = el('div', 'recbox'); box.hidden = true;
    const n = el('input'), cd = el('input'), pw = el('input'); n.placeholder = 'Nombre'; cd.placeholder = 'Código XXXX-XXXX-XXXX'; pw.type = 'password'; pw.placeholder = 'Clave nueva'; pw.autocomplete = 'new-password';
    n.maxLength = 14; cd.maxLength = 14; pw.maxLength = 64; [n, cd, pw].forEach((i) => i.setAttribute('aria-label', i.placeholder));
    const go = btn('Cambiar clave', async () => {
      $('#loginErr').textContent = ''; $('#recMsg').textContent = '';
      try { await X.connect(); } catch (e) { $('#loginErr').textContent = e.message; return; }
      send({ t: 'recover', name: n.value.trim(), code: cd.value.trim(), pass: pw.value });
    }, 'ghost');
    const msg = el('p', 'fine'); msg.id = 'recMsg'; msg.setAttribute('role', 'status');
    box.append(n, cd, pw, go, msg); form.append(box);
    a.addEventListener('click', () => { box.hidden = !box.hidden; if (!box.hidden) { n.value = $('#lname').value; n.focus(); } });
  })();

  /* ---------- Hidra de Jade: lluvia ácida, fuego amarillo, golpe con piedras ---------- */
  X.on('fx', (f) => {
    const now = performance.now();
    switch (f.k) {
      case 'ykw': BF.push({ k: 'ykw', t: now, T: 1000, f }); break;
      case 'yk': BF.push({ k: 'yk', t: now, T: 1000, f, seed: Math.random() * 99 }); G.shake = { t: now, m: 3 }; X.burst(f.x1, f.y1, 'storm', 26, { sp: 4, life: 0.7, size: 3.2 }); break;
      case 'acw': BF.push({ k: 'acw', t: now, T: 900, f }); break;
      case 'ac': BF.push({ k: 'pool', t: now, T: 3500, x: f.x, y: f.y, seed: Math.random() * 9 }); X.burst(f.x, f.y, 'poison', 22, { sp: 3.5, up: 4, g: 5, life: 0.7, size: 3 }); X.ring(f.x, f.y, 'poison', 420, 34, 4); break;
      case 'hsw': BF.push({ k: 'hsw', t: now, T: 1100, f }); break;
      case 'hs': X.ring(f.x, f.y, 'poison', 650, f.r * 32, 6); X.ring(f.x, f.y, 'dark', 520, f.r * 20, 4); X.burst(f.x, f.y, 'dark', 40, { sp: 6, up: 3, g: 5, life: 0.9, size: 3.6, add: false }); G.shake = { t: now, m: 9 }; break;
      case 'rcw': BF.push({ k: 'rcw', t: now, T: 1100, f, h: rnd(-6, 6) }); break;
      case 'rc': BF.push({ k: 'rubble', t: now, T: 5000, x: f.x, y: f.y, s: Math.random() * 99 }); X.burst(f.x, f.y, 'dark', 26, { sp: 5, up: 4, g: 6, life: 0.8, size: 3.4, add: false }); X.ring(f.x, f.y, 'dark', 380, 30, 4); G.shake = { t: now, m: 4 }; break;
      default: break;
    }
  });
  const hmouths = (f) => { let face = 1; for (const e of G.ents.values()) if (e.kind === 'mo' && e.t === 'hidra_jade' && Math.abs(e.x - f.x1) < 2 && Math.abs(e.y - f.y1) < 2) face = e.face || 1; return [-1.9, -1.25, -0.6].map((u) => [px(f.x1) + face * 1.7 * X.TS, py(f.y1) + u * X.TS]); };
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of BF) {
      const p = (now - b.t) / b.T; if (p >= 1) continue;
      if (b.k === 'ykw') {
        const f = b.f, [x1, y1] = hmouths(f)[1], x2 = px(f.x2), y2 = py(f.y2), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
        c.save(); c.translate(x1, y1); c.rotate(a); c.fillStyle = `rgba(255,210,40,${0.10 + 0.22 * p})`; c.fillRect(0, -TS * 1.8, L, TS * 3.6);
        c.strokeStyle = `rgba(255,235,120,${0.35 + 0.4 * Math.abs(Math.sin(now / 90))})`; c.lineWidth = 2; c.strokeRect(0, -TS * 1.8, L, TS * 3.6); c.restore();
      } else if (b.k === 'acw' || b.k === 'rcw') {
        const f = b.f, x = px(f.x), y = py(f.y), r = f.r * TS, acid = b.k === 'acw';
        c.fillStyle = acid ? `rgba(120,230,40,${0.10 + 0.25 * p})` : `rgba(200,170,120,${0.08 + 0.22 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = acid ? `rgba(190,255,90,${0.5 + 0.4 * Math.abs(Math.sin(now / 70))})` : `rgba(255,200,120,${0.5 + 0.4 * Math.abs(Math.sin(now / 70))})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
      } else if (b.k === 'hsw') {
        const f = b.f, x = px(f.x), y = py(f.y), r = f.r * TS;
        c.fillStyle = `rgba(120,200,60,${0.08 + 0.22 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = `rgba(200,255,120,.85)`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y, r * p, 0, 7); c.stroke();
      } else if (b.k === 'pool') {
        const x = px(b.x), y = py(b.y), al = Math.min(1, (1 - p) * 2.4);
        const g = c.createRadialGradient(x, y, 2, x, y, TS * 1.3); g.addColorStop(0, `rgba(150,255,60,${0.75 * al})`); g.addColorStop(1, `rgba(60,150,20,0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, TS * 1.3, TS * 0.9, 0, 0, 7); c.fill();
        for (let i = 0; i < 4; i++) { const t = (now / 500 + i * 0.27 + b.seed) % 1; c.fillStyle = `rgba(220,255,140,${0.6 * al * (1 - t)})`; c.beginPath(); c.arc(x + Math.sin(i * 2.1 + b.seed) * TS * 0.7, y - t * 12 + 4, 2 + t * 2, 0, 7); c.fill(); }
      } else if (b.k === 'rubble') {
        const x = px(b.x), y = py(b.y), al = Math.min(1, (1 - p) * 3);
        c.fillStyle = `rgba(0,0,0,${0.3 * al})`; c.beginPath(); c.ellipse(x, y + 8, 18, 6, 0, 0, 7); c.fill();
        for (let i = 0; i < 5; i++) { const a = i * 1.3 + b.s, rr = 5 + (i % 3) * 5; c.fillStyle = `rgba(${70 + i * 12},${64 + i * 10},${58 + i * 8},${al})`; c.beginPath(); c.moveTo(x + Math.cos(a) * rr - 5, y + Math.sin(a) * rr * 0.5 + 3); c.lineTo(x + Math.cos(a) * rr + 1, y + Math.sin(a) * rr * 0.5 - 5); c.lineTo(x + Math.cos(a) * rr + 6, y + Math.sin(a) * rr * 0.5 + 4); c.closePath(); c.fill(); }
      }
    }
  });
  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const b of BF) {
      const p = (now - b.t) / b.T; if (p >= 1) continue;
      if (b.k === 'yk') {
        const f = b.f, hm = hmouths(f), x2 = px(f.x2), y2 = py(f.y2), reach = Math.min(1, p * 4), al = p < 0.7 ? 1 : (1 - p) / 0.3;
        hm.forEach(([x1, y1], hi) => {
          const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
          c.save(); c.translate(x1, y1); c.rotate(a);
          const n = 30; for (let i = 0; i < n; i++) {
            const s = (i / n) * L * reach, w = 4 + (s / L) * (hi === 1 ? 24 : 15), off = Math.sin(now / 50 + i * 1.7 + b.seed + hi) * w * 0.5;
            c.fillStyle = `rgba(255,${170 + (i % 3) * 25},20,${0.7 * al})`; c.beginPath(); c.arc(s, off, w, 0, 7); c.fill();
          }
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 12; i++) { const s = rnd(0, L * reach); c.fillStyle = `rgba(255,245,150,${0.45 * al})`; c.beginPath(); c.arc(s, rnd(-1, 1) * (6 + s / L * 16), rnd(2, 5), 0, 7); c.fill(); }
          c.restore();
        });
      } else if (b.k === 'acw' || b.k === 'rcw') {       // lo que cae: gota de ácido o piedra
        const f = b.f, x = px(f.x), y0 = py(f.y), fall = (1 - p) * (b.k === 'acw' ? 170 : 210), y = y0 - fall;
        if (b.k === 'acw') { c.fillStyle = 'rgba(150,255,60,.95)'; c.beginPath(); c.moveTo(x, y - 12); c.quadraticCurveTo(x + 8, y + 2, x, y + 6); c.quadraticCurveTo(x - 8, y + 2, x, y - 12); c.fill(); c.fillStyle = 'rgba(230,255,170,.8)'; c.fillRect(x - 2, y - 2, 2, 4); }
        else { c.save(); c.translate(x + b.h, y); c.rotate(p * 7); c.fillStyle = '#6b6258'; c.beginPath(); c.moveTo(-9, 2); c.lineTo(-3, -9); c.lineTo(8, -5); c.lineTo(9, 6); c.lineTo(-2, 9); c.closePath(); c.fill(); c.strokeStyle = '#2b2622'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#8c8276'; c.fillRect(-3, -6, 5, 3); c.restore(); }
      }
    }
  });
  /* ---------- Arcángel: rayos del cielo, tornado y nova azul ---------- */
  const AF = [];
  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = AF.length - 1; i >= 0; i--) if (now - AF[i].t > AF[i].T) AF.splice(i, 1);
    switch (f.k) {
      case 'lgw': AF.push({ k: 'lgw', t: now, T: 900, f }); break;
      case 'lg': AF.push({ k: 'lg', t: now, T: 420, f, s: Math.random() * 99 }); X.burst(f.x, f.y, 'storm', 14, { sp: 4, up: 3, g: 5, life: 0.5, size: 2.8 }); X.ring(f.x, f.y, 'storm', 360, 28, 3); G.shake = { t: now, m: 3 }; break;
      case 'frw': AF.push({ k: 'frw', t: now, T: 900, f }); break;
      case 'fr': AF.push({ k: 'fr', t: now, T: 1800, f, s: Math.random() * 99 }); X.burst(f.x, f.y, 'fire', 18, { sp: 4, up: 4, g: 5, life: 0.7, size: 3 }); X.ring(f.x, f.y, 'fire', 380, 30, 4); G.shake = { t: now, m: 3 }; break;
      case 'fqw': AF.push({ k: 'fqw', t: now, T: 1300, f }); G.shake = { t: now, m: 2 }; break;
      case 'fq': AF.push({ k: 'fq', t: now, T: 800, f }); X.ring(f.x, f.y, 'fire', 700, f.r * 32, 7); X.burst(f.x, f.y, 'dark', 40, { sp: 6, up: 3, g: 5, life: 0.9, size: 3.6, add: false }); G.shake = { t: now, m: 12 }; break;
      case 'wbw': AF.push({ k: 'wbw', t: now, T: 1100, f }); break;
      case 'wb': AF.push({ k: 'wb', t: now, T: 2400, f, s: Math.random() * 9 }); X.burst(f.x, f.y, 'fire', 22, { sp: 4, up: 3, g: 4, life: 0.8, size: 3 }); X.ring(f.x, f.y, 'fire', 420, f.r * 26, 4); G.shake = { t: now, m: 3 }; break;
      case 'spw': AF.push({ k: 'spw', t: now, T: 900, f }); break;
      case 'sp': AF.push({ k: 'sp', t: now, T: 700, f }); X.burst(f.x, f.y, 'fire', 18, { sp: 4, up: 4, g: 5, life: 0.6, size: 3 }); X.ring(f.x, f.y, 'fire', 380, 24, 3); break;
      case 'tpo': case 'tpi': AF.push({ k: f.k, t: now, T: 900, f }); X.burst(f.x, f.y, 'arcane', 26, { sp: 4, up: 5, g: 2, life: 0.8, size: 3 }); X.ring(f.x, f.y, 'arcane', 600, 34, 5); break;
      case 'tn': AF.push({ k: 'tn', t: now, T: 560, f }); break;
      case 'nvw': AF.push({ k: 'nvw', t: now, T: 1300, f }); break;
      case 'nv': AF.push({ k: 'nv', t: now, T: 700, f }); X.ring(f.x, f.y, 'arcane', 650, f.r * 36, 6); X.burst(f.x, f.y, 'arcane', 36, { sp: 6, up: 5, g: 3, life: 0.9, size: 3.4 }); G.shake = { t: now, m: 7 }; break;
      default: break;
    }
  });
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of AF) {
      const p = Math.max(0, (now - b.t) / b.T); if (p >= 1) continue; const f = b.f, x = px(f.x), y = py(f.y);
      if (b.k === 'wbw') {                                    // aviso: red de fuego que se tensa
        const r = f.r * TS; c.fillStyle = `rgba(255,100,20,${0.08 + 0.22 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,200,110,${0.5 + 0.4 * Math.abs(Math.sin(now / 60))})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
        c.strokeStyle = `rgba(255,220,160,${0.35 + 0.3 * p})`; c.lineWidth = 1;
        for (let i = 0; i < 8; i++) { const a = i * 0.785; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8); c.stroke(); }
        for (const k of [0.35, 0.7]) { c.beginPath(); c.arc(x, y, r * k * p, 0, 7); c.stroke(); }
      } else if (b.k === 'wb') {                              // red de telaraña ardiendo en el suelo
        const al = Math.min(1, (1 - p) * 2.2), r = f.r * TS;
        const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, `rgba(255,190,60,${0.55 * al})`); g.addColorStop(1, 'rgba(160,30,0,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,${170 + Math.sin(now / 90 + b.s) * 60 | 0},60,${0.9 * al})`; c.lineWidth = 1.6;
        for (let i = 0; i < 8; i++) { const a = i * 0.785; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8); c.stroke(); }
        for (const k of [0.33, 0.66, 1]) { c.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * 0.785; const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * 0.8 * k; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); }
        for (let i = 0; i < 5; i++) { const u = (now / 420 + i * 0.21 + b.s) % 1; c.fillStyle = `rgba(255,${190 - u * 90},40,${0.8 * al * (1 - u)})`; c.fillRect(x + Math.sin(i * 2.4 + b.s) * r * 0.7 - 2, y - u * 24, 4, 7); }
      } else if (b.k === 'spw') {                             // grietas de lava de donde saldrá la araña
        const r = 0.9 * TS; c.fillStyle = `rgba(255,90,20,${0.15 + 0.4 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,200,90,${0.5 + 0.4 * p})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r * (1 - p * 0.4), r * 0.6 * (1 - p * 0.4), 0, 0, 7); c.stroke();
      } else if (b.k === 'frw') {
        const r = f.r * TS; c.fillStyle = `rgba(255,110,20,${0.10 + 0.25 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,190,80,${0.5 + 0.4 * Math.abs(Math.sin(now / 60))})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
      } else if (b.k === 'fr') {                              // charco de fuego que arde un momento
        const al = Math.min(1, (1 - p) * 2.2), g = c.createRadialGradient(x, y, 2, x, y, TS * 1.5); g.addColorStop(0, `rgba(255,200,60,${0.8 * al})`); g.addColorStop(0.6, `rgba(230,70,10,${0.5 * al})`); g.addColorStop(1, 'rgba(120,20,0,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, TS * 1.5, TS, 0, 0, 7); c.fill();
        for (let i = 0; i < 5; i++) { const u = (now / 420 + i * 0.21 + b.s) % 1; c.fillStyle = `rgba(255,${180 - u * 80},40,${0.8 * al * (1 - u)})`; c.beginPath(); c.moveTo(x + Math.sin(i * 2.4 + b.s) * TS * 0.9 - 4, y); c.lineTo(x + Math.sin(i * 2.4 + b.s) * TS * 0.9, y - 10 - u * 22); c.lineTo(x + Math.sin(i * 2.4 + b.s) * TS * 0.9 + 4, y); c.fill(); }
      } else if (b.k === 'fqw') {                             // terremoto: onda que se cierra
        const r = f.r * TS; c.fillStyle = `rgba(150,90,40,${0.08 + 0.22 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,170,90,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y, r * p, 0, 7); c.stroke();
        c.strokeStyle = `rgba(30,15,5,${0.5 * p})`; c.lineWidth = 2; for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * p, y + Math.sin(a) * r * p * 0.8); c.stroke(); }
      } else if (b.k === 'fq') {                              // grietas en el suelo
        const r = f.r * TS, al = 1 - p; c.strokeStyle = `rgba(255,120,30,${0.9 * al})`; c.lineWidth = 3;
        for (let i = 0; i < 10; i++) { const a = i * 0.63; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a + 0.2) * r * 0.4); c.lineTo(x + Math.cos(a + 0.15) * r * 0.95, y + Math.sin(a) * r * 0.75); c.stroke(); }
      } else if (b.k === 'lgw') {
        const r = 1.5 * TS; c.fillStyle = `rgba(255,240,120,${0.10 + 0.25 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,250,190,${0.5 + 0.4 * Math.abs(Math.sin(now / 60))})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
      } else if (b.k === 'nvw') {
        const r = f.r * TS; c.fillStyle = `rgba(70,140,255,${0.10 + 0.28 * p})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = 'rgba(150,200,255,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y, r * p, 0, 7); c.stroke();
        for (let i = 0; i < 6; i++) { const a = now / 400 + i * 1.047; c.fillStyle = 'rgba(190,225,255,.8)'; c.fillRect(x + Math.cos(a) * r * 0.7 * (1 - p * 0.5) - 2, y + Math.sin(a) * r * 0.5 * (1 - p * 0.5) - 2, 4, 4); }
      }
    }
  });
  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const b of AF) {
      const p = Math.max(0, (now - b.t) / b.T); if (p >= 1) continue; const f = b.f, x = px(f.x), y = py(f.y);
      if (b.k === 'tpo' || b.k === 'tpi') {                   // columna de luz del teletransporte
        const al = b.k === 'tpo' ? 1 - p : Math.min(1, (1 - p) * 1.6), r = TS * (b.k === 'tpo' ? 0.7 + p * 0.6 : 1.3 - p * 0.6); c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, y - 130, 0, y + 6); g.addColorStop(0, 'rgba(160,120,255,0)'); g.addColorStop(1, `rgba(210,190,255,${0.8 * al})`);
        c.fillStyle = g; c.fillRect(x - r * 0.45, y - 130, r * 0.9, 136);
        c.strokeStyle = `rgba(230,215,255,${al})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + 4, r, r * 0.45, 0, 0, 7); c.stroke(); c.restore();
      } else if (b.k === 'frw') {                                  // bola de fuego que cae con estela
        const fy = y - (1 - p) * 230 - 6;
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(x + 18 * (1 - p), fy - 50, x, fy); g.addColorStop(0, 'rgba(255,80,0,0)'); g.addColorStop(1, 'rgba(255,170,40,.8)');
        c.strokeStyle = g; c.lineWidth = 12; c.beginPath(); c.moveTo(x + 22 * (1 - p), fy - 56); c.lineTo(x, fy); c.stroke();
        c.fillStyle = 'rgba(255,230,120,.95)'; c.beginPath(); c.arc(x, fy, 9, 0, 7); c.fill(); c.fillStyle = 'rgba(255,120,20,.7)'; c.beginPath(); c.arc(x, fy, 15, 0, 7); c.fill(); c.restore();
      } else if (b.k === 'lg') {                                   // rayo zigzag desde arriba
        const al = 1 - p; c.save(); c.globalCompositeOperation = 'lighter';
        for (const [w, col] of [[9, `rgba(120,170,255,${0.5 * al})`], [3, `rgba(255,255,230,${al})`]]) {
          c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x, y);
          for (let i = 1; i <= 8; i++) c.lineTo(x + Math.sin(i * 2.3 + b.s) * 14 * (i / 8), y - i * 34); c.stroke();
        }
        c.fillStyle = `rgba(255,255,220,${0.6 * al})`; c.beginPath(); c.ellipse(x, y, TS * 1.4 * (0.4 + p), TS * 0.8 * (0.4 + p), 0, 0, 7); c.fill(); c.restore();
      } else if (b.k === 'tn') {                            // tornado: espiral de aire blanco-azulado
        const al = 1 - p * 0.6; c.save();
        for (let i = 0; i < 14; i++) {
          const u = i / 13, yy = y + 6 - u * 62, rw = 6 + u * 24, a = now / 90 + i * 1.1;
          c.fillStyle = `rgba(${200 + u * 40},${225 + u * 20},255,${0.55 * al})`; c.beginPath(); c.ellipse(x + Math.sin(a) * rw * 0.5, yy, rw, 5, 0, 0, 7); c.fill();
          c.strokeStyle = `rgba(255,255,255,${0.5 * al})`; c.lineWidth = 1.5; c.stroke();
        }
        c.restore();
      } else if (b.k === 'nv') {                            // pilar azul de la nova
        const al = 1 - p, r = f.r * TS; c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, y - 220, 0, y); g.addColorStop(0, 'rgba(70,140,255,0)'); g.addColorStop(1, `rgba(150,210,255,${0.85 * al})`);
        c.fillStyle = g; c.fillRect(x - r * 0.55, y - 220, r * 1.1, 220);
        c.fillStyle = `rgba(190,225,255,${0.55 * al})`; c.beginPath(); c.ellipse(x, y, r * (0.5 + p), r * (0.35 + p * 0.6), 0, 0, 7); c.fill(); c.restore();
      }
    }
  });
  /* ---------- Leviatán Abisal: tornados marinos, olas, rayo de bolas de agua y escudo burbuja ---------- */
  const LF = [], TORN = new Map();
  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = LF.length - 1; i >= 0; i--) if (now - LF[i].t > LF[i].T) LF.splice(i, 1);
    switch (f.k) {
      case 'twn': LF.push({ k: 'twn', t: now, T: 800, f }); X.ring(f.x, f.y, 'water', 500, 40, 4); break;
      case 'wtn': { const o = TORN.get(f.id); if (o) { o.x0 = o.x1; o.y0 = o.y1; o.x1 = f.x; o.y1 = f.y; o.t = now; } else TORN.set(f.id, { x0: f.x, y0: f.y, x1: f.x, y1: f.y, t: now, s: f.id * 99 }); break; }
      case 'olw': LF.push({ k: 'olw', t: now, T: 1100, f }); break;
      case 'ol': LF.push({ k: 'ol', t: now, T: 300, f, s: Math.random() * 9 }); if (Math.random() < 0.25) X.burst(f.x, f.y, 'water', 3, { sp: 3, up: 3, g: 4, life: 0.5, size: 2.4 }); break;
      case 'bmw': LF.push({ k: 'bmw', t: now, T: 1000, f }); break;
      case 'bm': LF.push({ k: 'bm', t: now, T: 560, f, s: Math.random() * 99 }); G.shake = { t: now, m: 3 }; X.burst(f.x1, f.y1, 'water', 18, { sp: 4, life: 0.6, size: 3 }); break;
      case 'bub': LF.push({ k: 'bub', t: now, T: 620, f }); break;
      case 'bubx': LF.push({ k: 'bubx', t: now, T: 500, f }); X.ring(f.x, f.y - 2, 'water', 500, 90, 5); X.burst(f.x, f.y - 2, 'water', 30, { sp: 6, up: 4, g: 3, life: 0.8, size: 3 }); break;
      default: break;
    }
  });
  const levMouth = (f) => [px(f.x1), py(f.y1)];
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of LF) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'twn') {
        const x = px(f.x), y = py(f.y), r = 1.6 * TS; c.strokeStyle = `rgba(150,235,255,${0.9 * (1 - p)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, r * (0.4 + p), r * (0.3 + p * 0.7), 0, 0, 7); c.stroke();
      } else if (b.k === 'olw') {                             // aviso: franja por la que pasará la ola
        const xa = px(Math.min(f.x1, f.x2)), xb = px(Math.max(f.x1, f.x2)), y = py(f.y), h = f.h * TS, dir = f.x2 > f.x1 ? 1 : -1;
        c.fillStyle = `rgba(60,170,230,${0.10 + 0.2 * p})`; c.fillRect(xa, y - h / 2, xb - xa, h);
        c.strokeStyle = `rgba(170,235,255,${0.35 + 0.4 * Math.abs(Math.sin(now / 80))})`; c.lineWidth = 2; c.strokeRect(xa, y - h / 2, xb - xa, h);
        c.fillStyle = `rgba(210,245,255,${0.25 + 0.3 * p})`; const off = (now / 14) % 48;
        for (let xx = xa - 48 + (dir > 0 ? off : 48 - off); xx < xb; xx += 48) { if (xx < xa) continue; c.beginPath(); c.moveTo(xx, y - 7); c.lineTo(xx + 12 * dir, y); c.lineTo(xx, y + 7); c.lineTo(xx + 4 * dir, y); c.closePath(); c.fill(); }
      } else if (b.k === 'bmw') {                             // aviso: la boca se carga y se marca la línea del rayo
        const [x1, y1] = levMouth(f), x2 = px(f.x2), y2 = py(f.y2), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
        c.save(); c.translate(x1, y1); c.rotate(a); c.fillStyle = `rgba(80,190,240,${0.08 + 0.18 * p})`; c.fillRect(0, -TS * 1.5, L, TS * 3);
        c.strokeStyle = `rgba(190,240,255,${0.3 + 0.4 * Math.abs(Math.sin(now / 80))})`; c.lineWidth = 2; c.strokeRect(0, -TS * 1.5, L, TS * 3); c.restore();
      }
    }
  });
  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const [id, o] of TORN) {                             // tornados: se mueven suavemente entre pasos y se desvanecen al terminar
      const age = now - o.t; if (age > 900) { TORN.delete(id); continue; }
      const k = Math.min(1, age / 400), tx = o.x0 + (o.x1 - o.x0) * k, ty = o.y0 + (o.y1 - o.y0) * k, x = px(tx), y = py(ty) + 8, al = age > 450 ? Math.max(0, 1 - (age - 450) / 450) : 1;
      c.save(); c.globalAlpha = al;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 2, 15, 5, 0, 0, 7); c.fill();
      for (let i = 0; i < 16; i++) {
        const u = i / 15, yy = y - u * 68, rw = 5 + u * 20, a = now / 80 + i * 1.15 + o.s;
        c.fillStyle = `rgba(${90 + u * 120 | 0},${190 + u * 50 | 0},${225 + u * 25 | 0},${0.6})`; c.beginPath(); c.ellipse(x + Math.sin(a) * rw * 0.45 + Math.sin(now / 300 + o.s) * u * 5, yy, rw, 5, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(235,252,255,.6)'; c.lineWidth = 1.3; c.stroke();
      }
      for (let i = 0; i < 5; i++) { const a = now / 110 + i * 1.25 + o.s, u = (now / 500 + i * 0.2) % 1; c.fillStyle = 'rgba(210,245,255,.85)'; c.beginPath(); c.arc(x + Math.cos(a) * (10 + u * 16), y - u * 64, 1.8 + (i % 2), 0, 7); c.fill(); }
      c.restore();
    }
    for (const b of LF) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'ol') {                                     // frente de ola con espuma
        const x = px(f.x), y = py(f.y), h = f.h * TS, d = f.d, al = Math.min(1, (1 - p) * 1.7), w = 2.8 * TS;
        c.save(); const g = c.createLinearGradient(x - d * w, 0, x + d * 0.4 * TS, 0); g.addColorStop(0, 'rgba(40,150,220,0)'); g.addColorStop(0.7, `rgba(70,185,235,${0.7 * al})`); g.addColorStop(1, `rgba(220,250,255,${0.95 * al})`);
        c.fillStyle = g; c.beginPath(); c.moveTo(x - d * w, y - h / 2); c.lineTo(x + d * 0.4 * TS, y - h / 2 + 6);
        for (let i = 0; i <= 6; i++) c.lineTo(x + d * (0.4 + Math.sin(now / 90 + i + b.s) * 0.12) * TS, y - h / 2 + 6 + (h - 12) * i / 6); c.lineTo(x + d * 0.4 * TS, y + h / 2 - 6); c.lineTo(x - d * w, y + h / 2); c.closePath(); c.fill();
        c.fillStyle = `rgba(255,255,255,${0.85 * al})`; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(x + d * (0.3 + Math.sin(now / 70 + i * 2 + b.s) * 0.2) * TS, y - h / 2 + 8 + (h - 16) * i / 6, 3 + (i % 3), 0, 7); c.fill(); }
        c.restore();
      } else if (b.k === 'bm') {                              // rayo: chorro de bolas de agua desde la boca
        const [x1, y1] = levMouth(f), x2 = px(f.x2), y2 = py(f.y2), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), reach = Math.min(1, p * 5), al = p < 0.7 ? 1 : (1 - p) / 0.3;
        c.save(); c.translate(x1, y1); c.rotate(a);
        const n = 26; for (let i = 0; i < n; i++) {
          const s = (i / n) * L * reach, w = 4 + (s / L) * 14, off = Math.sin(now / 45 + i * 1.7 + b.s) * w * 0.45;
          c.fillStyle = `rgba(${60 + (i % 3) * 20},${170 + (i % 3) * 25},235,${0.7 * al})`; c.beginPath(); c.arc(s, off, w, 0, 7); c.fill();
          c.strokeStyle = `rgba(215,248,255,${0.7 * al})`; c.lineWidth = 1.2; c.stroke();
        }
        c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 10; i++) { const s = Math.random() * L * reach; c.fillStyle = `rgba(200,245,255,${0.4 * al})`; c.beginPath(); c.arc(s, (Math.random() - 0.5) * (6 + s / L * 18), 2 + Math.random() * 3, 0, 7); c.fill(); }
        c.restore();
      } else if (b.k === 'bub') {                             // burbuja protectora alrededor del jefe
        const x = px(f.x), y = py(f.y) - 2.3 * TS, rx = 4.6 * TS, ry = 3.1 * TS, wob = 1 + Math.sin(now / 160) * 0.025;
        c.save(); const g = c.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 6, x, y, rx);
        g.addColorStop(0, 'rgba(210,248,255,.10)'); g.addColorStop(0.75, 'rgba(110,210,245,.14)'); g.addColorStop(1, 'rgba(180,240,255,.45)');
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx * wob, ry / wob, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(230,252,255,${0.7 + 0.2 * Math.sin(now / 90)})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, rx * wob, ry / wob, 0, 0, 7); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - rx * 0.45, y - ry * 0.5, rx * 0.16, ry * 0.08, -0.6, 0, 7); c.fill();
        c.restore();
      } else if (b.k === 'bubx') {                            // la burbuja revienta
        const x = px(f.x), y = py(f.y) - 2.3 * TS, al = 1 - p; c.strokeStyle = `rgba(230,252,255,${al})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 4.6 * TS * (1 + p * 0.4), 3.1 * TS * (1 + p * 0.4), 0, 0, 7); c.stroke();
      }
    }
  });
  /* ---------- Ignaros, Soberano del Magma: infierno con refugio azul, meteoritos, líneas de fuego y marea de lava ---------- */
  const MG = [], BRN = new Map(); let LAVA = null;
  const flameAt = (c, x, y, h, w, now, s) => {                                        // llama con parpadeo (capas roja, naranja y amarilla)
    for (const [col, k] of [['rgba(255,60,10,.85)', 1], ['rgba(255,150,30,.9)', 0.72], ['rgba(255,235,130,.92)', 0.42]]) {
      const fl = Math.sin(now / 90 + s * 1.7) * 0.18 + Math.sin(now / 53 + s * 3.1) * 0.12, hh = h * k * (1 + fl), ww = w * k;
      c.fillStyle = col; c.beginPath(); c.moveTo(x - ww, y); c.quadraticCurveTo(x - ww * 0.9, y - hh * 0.5, x + fl * ww * 2, y - hh); c.quadraticCurveTo(x + ww * 0.9, y - hh * 0.5, x + ww, y); c.closePath(); c.fill();
    }
  };
  // el orbe flotante del jefe (para que los ataques salgan de él)
  const orbOf = (bx, by) => { for (const e of G.ents.values()) if (e.kind === 'mo' && e.t === 'ignaros') return { id: e.id, x: X.sxOf(e.rx) + X.TS / 2, y: X.syOf(e.ry) + X.TS - 2 - 180, wx: e.rx, wy: e.ry }; return null; };
  const caveBox = (R) => ({ x: X.sxOf(R[0]), y: X.syOf(R[1]), w: (R[2] - R[0] + 1) * X.TS, h: (R[3] - R[1] + 1) * X.TS });
  const sqPath = (c, f) => { c.rect(X.sxOf(f.sx), X.syOf(f.sy), f.w * X.TS, f.w * X.TS); };
  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = MG.length - 1; i >= 0; i--) if (now - MG[i].t > MG[i].T) MG.splice(i, 1);
    switch (f.k) {
      case 'mcast': X.casts.set(f.id, now + f.T + 400); MG.push({ k: 'mcast', t: now, T: f.T + 400, f }); break;
      case 'mgw': MG.push({ k: 'mgw', t: now, T: f.T, f }); break;
      case 'mgf': MG.push({ k: 'mgf', t: now, T: f.T, f }); G.shake = { t: now, m: 5 }; break;
      case 'mmw': MG.push({ k: 'mmw', t: now, T: f.T, f }); if (f.bx !== undefined) { const o = orbOf(f.bx, f.by); if (o) X.burst(o.wx, o.wy - 5.6, 'fire', 6, { sp: 3, up: 5, g: -2, life: 0.5, size: 2.8 }); } break;
      case 'mmx': MG.push({ k: 'mmx', t: now, T: 900, f }); G.shake = { t: now, m: 4 }; X.burst(f.x, f.y, 'fire', 26, { sp: 5, up: 3, g: 3, life: 0.8, size: 3.4 }); X.ring(f.x, f.y, 'fire', 600, 60, 5); break;
      case 'mlw': MG.push({ k: 'mlw', t: now, T: f.T, f }); break;
      case 'ml': MG.push({ k: 'ml', t: now, T: f.T, f, s: Math.random() * 9 }); G.shake = { t: now, m: 3 }; break;
      case 'mlw2': MG.push({ k: 'mlw2', t: now, T: f.T, f }); break;
      case 'mlv': LAVA = { t: now, f, T: f.rise + f.hold + f.ebb }; G.shake = { t: now, m: 4 }; break;
      case 'brn': BRN.set(f.id, now + (f.ms || 1500)); break;
      default: break;
    }
  });
  const islandDraw = (c, f, now, al) => {                                                       // rocas azules seguras
    for (const i of f.isl) {
      const x = px(i.x), y = py(i.y), r = i.r * X.TS, pu = 0.5 + 0.5 * Math.sin(now / 170);
      c.fillStyle = `rgba(26,28,50,${0.8 * al})`; c.beginPath(); c.ellipse(x, y, r, r * 0.85, 0, 0, 7); c.fill();
      c.fillStyle = `rgba(60,120,255,${(0.22 + 0.14 * pu) * al})`; c.beginPath(); c.ellipse(x, y, r, r * 0.85, 0, 0, 7); c.fill();
      c.strokeStyle = `rgba(150,200,255,${(0.7 + 0.3 * pu) * al})`; c.lineWidth = 3; c.stroke();
      c.strokeStyle = `rgba(210,235,255,${0.5 * al})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, r * 0.7, r * 0.6, 0, 0, 7); c.stroke();
    }
  };
  const lavaFill = (c, b, now) => {                                                               // textura animada de lava
    c.fillStyle = '#a82208'; c.fillRect(b.x, b.y, b.w, b.h);
    c.fillStyle = 'rgba(255,110,20,.8)'; c.fillRect(b.x, b.y, b.w, b.h);
    const t = now / 700;
    for (let yy = b.y; yy < b.y + b.h; yy += 14) {
      c.strokeStyle = `rgba(255,${190 + ((yy / 14) | 0) % 3 * 20},70,.55)`; c.lineWidth = 3; c.beginPath();
      for (let xx = b.x; xx <= b.x + b.w; xx += 10) { const yv = yy + Math.sin(xx / 37 + t + yy / 20) * 4; if (xx === b.x) c.moveTo(xx, yv); else c.lineTo(xx, yv); } c.stroke();
    }
    c.fillStyle = 'rgba(90,20,6,.55)';
    for (let k = 0; k < 90; k++) { const hx = (k * 131 + 17) % 997 / 997, hy = (k * 197 + 43) % 991 / 991; const ox = (Math.sin(t * 0.6 + k) * 6), oy = Math.cos(t * 0.5 + k * 1.3) * 4; c.beginPath(); c.ellipse(b.x + hx * b.w + ox, b.y + hy * b.h + oy, 9 + (k % 4) * 3, 4 + (k % 3) * 2, 0, 0, 7); c.fill(); }
  };
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of MG) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'mgw') {                                                            // aviso: la cueva se calienta y aparece el refugio azul
        const B = caveBox(f.r), pu = 0.5 + 0.5 * Math.sin(now / 120 * (1 + p * 2));
        c.save(); c.fillStyle = `rgba(255,60,10,${0.06 + 0.18 * p * (0.6 + 0.4 * pu)})`; c.fillRect(B.x, B.y, B.w, B.h);
        const sx = X.sxOf(f.sx), sy = X.syOf(f.sy), w = f.w * TS;
        const g = c.createRadialGradient(sx + w / 2, sy + w / 2, 4, sx + w / 2, sy + w / 2, w * 1.6); g.addColorStop(0, 'rgba(80,150,255,.35)'); g.addColorStop(1, 'rgba(80,150,255,0)'); c.fillStyle = g; c.fillRect(sx - w, sy - w, w * 3, w * 3);
        c.fillStyle = `rgba(50,120,255,${0.35 + 0.2 * pu})`; c.fillRect(sx, sy, w, w);
        c.strokeStyle = `rgba(170,215,255,${0.8 + 0.2 * pu})`; c.lineWidth = 3; c.strokeRect(sx + 1.5, sy + 1.5, w - 3, w - 3);
        c.strokeStyle = 'rgba(220,240,255,.7)'; c.lineWidth = 1; for (let i = 1; i < f.w; i++) { c.beginPath(); c.moveTo(sx + i * TS, sy); c.lineTo(sx + i * TS, sy + w); c.moveTo(sx, sy + i * TS); c.lineTo(sx + w, sy + i * TS); c.stroke(); }
        c.fillStyle = 'rgba(235,245,255,.95)'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('REFUGIO', sx + w / 2, sy - 6);
        c.strokeStyle = `rgba(255,200,120,${0.5 * (1 - p)})`; c.lineWidth = 2; c.beginPath(); c.arc(sx + w / 2, sy + w / 2, w * (1.1 + 1.3 * (1 - p)), 0, 7); c.stroke();     // cuenta atrás
        c.restore();
      } else if (b.k === 'mgf') {                                                     // el suelo arde (menos el refugio)
        const B = caveBox(f.r), al = p < 0.12 ? p / 0.12 : p > 0.8 ? (1 - p) / 0.2 : 1;
        c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); sqPath(c, f); c.clip('evenodd');
        c.fillStyle = `rgba(255,70,10,${0.4 * al})`; c.fillRect(B.x, B.y, B.w, B.h);
        c.fillStyle = `rgba(255,170,40,${0.18 * al * (0.6 + 0.4 * Math.sin(now / 70))})`; c.fillRect(B.x, B.y, B.w, B.h);
        c.restore();
        c.save(); const sx = X.sxOf(f.sx), sy = X.syOf(f.sy), w = f.w * TS; c.strokeStyle = `rgba(170,215,255,${al})`; c.lineWidth = 3; c.strokeRect(sx + 1.5, sy + 1.5, w - 3, w - 3); c.fillStyle = `rgba(60,130,255,${0.3 * al})`; c.fillRect(sx, sy, w, w); c.restore();
      } else if (b.k === 'mmw') {                                                     // aviso del meteorito
        const x = px(f.x), y = py(f.y), r = f.r * TS * 1.1;
        c.fillStyle = `rgba(255,50,10,${0.12 + 0.25 * p})`; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,170,90,${0.5 + 0.4 * Math.abs(Math.sin(now / 70))})`; c.lineWidth = 2; c.stroke();
        c.strokeStyle = 'rgba(255,230,160,.8)'; c.beginPath(); c.ellipse(x, y, r * (1 - p), r * 0.8 * (1 - p), 0, 0, 7); c.stroke();
      } else if (b.k === 'mmx') {                                                     // cráter y onda explosiva
        const x = px(f.x), y = py(f.y), al = 1 - p;
        c.fillStyle = `rgba(40,12,6,${0.55 * al})`; c.beginPath(); c.ellipse(x, y, f.r * TS * 0.9, f.r * TS * 0.7, 0, 0, 7); c.fill();
        const R2 = 5 * TS * Math.min(1, p * 2.6);
        c.strokeStyle = `rgba(255,190,90,${al})`; c.lineWidth = 6 * al + 1; c.beginPath(); c.ellipse(x, y, R2, R2 * 0.8, 0, 0, 7); c.stroke();
        c.strokeStyle = `rgba(255,90,20,${0.7 * al})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, R2 * 0.8, R2 * 0.64, 0, 0, 7); c.stroke();
      } else if (b.k === 'mlw') {                                                     // aviso de la línea de fuego
        const x1 = px(f.x1), y1 = py(f.y1), x2 = px(f.x2), y2 = py(f.y2), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), th = f.w * TS;
        c.save(); if (f.r) { const B = caveBox(f.r); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip(); } c.translate(x1, y1); c.rotate(a); c.fillStyle = `rgba(255,60,10,${0.08 + 0.2 * p})`; c.fillRect(0, -th / 2, L, th);
        c.strokeStyle = `rgba(255,190,110,${0.35 + 0.4 * Math.abs(Math.sin(now / 80))})`; c.lineWidth = 2; c.strokeRect(0, -th / 2, L, th); c.restore();
      } else if (b.k === 'mlw2') {                                                    // aviso de la lava: rocas seguras
        const B = caveBox(f.r), pu = 0.5 + 0.5 * Math.sin(now / 130);
        c.fillStyle = `rgba(255,60,10,${0.05 + 0.15 * p * (0.6 + 0.4 * pu)})`; c.fillRect(B.x, B.y, B.w, B.h);
        islandDraw(c, f, now, 1);
        c.fillStyle = 'rgba(235,245,255,.95)'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; for (const i of f.isl) c.fillText('ROCA', px(i.x), py(i.y) - i.r * TS - 4);
      }
    }
    if (LAVA) {                                                                       // marea de lava
      const age = now - LAVA.t, f = LAVA.f; if (age > LAVA.T) { LAVA = null; return; }
      const rise = Math.min(1, age / f.rise), ebb = age > f.rise + f.hold ? (age - f.rise - f.hold) / f.ebb : 0, B = caveBox(f.r);
      const cx = f.bx !== undefined ? px(f.bx) : B.x + B.w / 2, cy = f.bx !== undefined ? py(f.by) : B.y + B.h / 2, maxR = Math.hypot(B.w, B.h) + 20, rad = maxR * (ebb > 0 ? 1 - ebb : rise);
      c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip();
      c.beginPath(); c.arc(cx, cy, rad, 0, 7);
      for (const i of f.isl) { c.moveTo(px(i.x) + i.r * TS, py(i.y)); c.ellipse(px(i.x), py(i.y), i.r * TS, i.r * TS * 0.85, 0, 0, 7); }
      c.clip('evenodd'); lavaFill(c, B, now); c.restore();
      c.strokeStyle = `rgba(255,220,120,${0.7 * (1 - ebb)})`; c.lineWidth = 3; c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip(); c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.stroke(); c.restore();    // frente de lava
      islandDraw(c, f, now, 1 - ebb * 0.6);
    }
  });
  X.on('draw', (c, now) => {
    const TS = X.TS;
    for (const b of MG) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'mgf') {                                                            // llamas altas en todo el suelo
        const R = f.r, al = p < 0.1 ? p / 0.1 : p > 0.75 ? (1 - p) / 0.25 : 1;
        for (let y = R[1] + 1; y <= R[3]; y++) for (let x = R[0] + 1; x <= R[2]; x++) {
          if (x >= f.sx && x < f.sx + f.w && y >= f.sy && y < f.sy + f.w) continue;
          const sx = X.sxOf(x), sy = X.syOf(y); if (sx < -TS || sy < -TS || sx > innerWidth + TS || sy > innerHeight + TS) continue;
          const hs = (x * 73856093 ^ y * 19349663) >>> 0; if (hs % 3 === 0) continue;
          if (f.bx !== undefined && Math.hypot(x - f.bx, y - f.by) > (now - b.t) / 650 * 46) continue;        // se extiende en ola desde Ignaros
          c.save(); c.globalAlpha = al; flameAt(c, sx + 8 + (hs % 17), sy + TS - 2, 18 + (hs % 14), 5 + (hs % 3), now, hs % 11); c.restore();
        }
      } else if (b.k === 'mmw') {                                                     // el meteorito cae con estela
        const x = px(f.x), y = py(f.y), fy = y - (1 - p) * 340 - 6, fx = x + (1 - p) * 170;
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(fx + 70, fy - 60, fx, fy); g.addColorStop(0, 'rgba(255,80,0,0)'); g.addColorStop(1, 'rgba(255,170,40,.85)');
        c.strokeStyle = g; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(fx + 72, fy - 62); c.lineTo(fx, fy); c.stroke();
        c.fillStyle = 'rgba(255,120,20,.8)'; c.beginPath(); c.arc(fx, fy, 15, 0, 7); c.fill(); c.fillStyle = 'rgba(255,235,150,.95)'; c.beginPath(); c.arc(fx, fy, 9, 0, 7); c.fill(); c.restore();
      } else if (b.k === 'mmx') {
        const x = px(f.x), y = py(f.y), al = 1 - p;
        c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y - 10, 2, x, y - 10, 70 * (0.5 + p)); g.addColorStop(0, `rgba(255,240,170,${0.9 * al})`); g.addColorStop(0.5, `rgba(255,120,20,${0.6 * al})`); g.addColorStop(1, 'rgba(255,60,0,0)');
        c.fillStyle = g; c.fillRect(x - 90, y - 100, 180, 180); c.restore();
      } else if (b.k === 'ml') {                                                      // línea de fuego
        const x1 = px(f.x1), y1 = py(f.y1), x2 = px(f.x2), y2 = py(f.y2), L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), th = f.w * TS, al = p < 0.2 ? p / 0.2 : (1 - p) / 0.8;
        c.save(); if (f.r) { const B = caveBox(f.r); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip(); } c.translate(x1, y1); c.rotate(a); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, -th / 2, 0, th / 2); g.addColorStop(0, 'rgba(255,60,0,0)'); g.addColorStop(0.5, `rgba(255,190,70,${0.85 * al})`); g.addColorStop(1, 'rgba(255,60,0,0)');
        c.fillStyle = g; c.fillRect(0, -th / 2, L, th); c.restore();
        c.save(); if (f.r) { const B = caveBox(f.r); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip(); }
        for (let s = 0; s < L; s += 26) { const wx = x1 + Math.cos(a) * s, wy = y1 + Math.sin(a) * s; if (wx < -30 || wy < -60 || wx > innerWidth + 30 || wy > innerHeight + 60) continue; c.save(); c.globalAlpha = Math.max(0, al); flameAt(c, wx, wy + 8, 26 + (s % 5) * 4, 8, now, s / 26 + b.s); c.restore(); }
        c.restore();
      }
    }
    for (const b of MG) {
      const p = (now - b.t) / b.T; if (p >= 1 || p < 0) continue; const f = b.f;
      if (b.k === 'mcast') {                                                          // el orbe se carga: anillos que convergen, chispas en espiral y destello
        const o = orbOf(); if (!o) continue;
        const pal = { inferno: ['255,90,30', '255,210,120'], meteoros: ['255,150,40', '255,240,170'], lineas: ['255,200,60', '255,255,210'], lava: ['255,60,20', '255,170,60'] }[f.kind] || ['255,120,30', '255,230,150'];
        const charge = Math.min(1, p * b.T / Math.max(600, f.T)), fade = p > 0.85 ? (1 - p) / 0.15 : 1;
        c.save(); c.globalCompositeOperation = 'lighter';
        const gr = c.createRadialGradient(o.x, o.y, 4, o.x, o.y, 40 + 90 * charge); gr.addColorStop(0, `rgba(${pal[1]},${0.75 * fade})`); gr.addColorStop(0.45, `rgba(${pal[0]},${0.4 * fade})`); gr.addColorStop(1, `rgba(${pal[0]},0)`);
        c.fillStyle = gr; c.fillRect(o.x - 140, o.y - 140, 280, 280);
        for (let k = 0; k < 3; k++) { const u = ((now / 520 + k / 3) % 1), r = 120 * (1 - u) + 14; c.strokeStyle = `rgba(${pal[1]},${0.7 * u * fade})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(o.x, o.y, r, r * 0.8, 0, 0, 7); c.stroke(); }
        for (let k = 0; k < 14; k++) { const u = ((now / 700 + k * 0.071) % 1), a = k * 0.9 + now / 400, r = 110 * (1 - u); c.fillStyle = `rgba(${pal[1]},${0.9 * u * fade})`; c.beginPath(); c.arc(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.8, 1.8 + 2 * u, 0, 7); c.fill(); }
        c.restore();
      } else if (b.k === 'mmw' && f.bx !== undefined && p < 0.25) {                  // meteorito lanzado: haz que sale del orbe hacia el cielo
        const o = orbOf(); if (!o) continue; const al = 1 - p / 0.25;
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,170,60,${0.8 * al})`; c.lineWidth = 6 * al + 1; c.lineCap = 'round'; c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x + 60, o.y - 320); c.stroke();
        c.strokeStyle = `rgba(255,240,190,${al})`; c.lineWidth = 2; c.stroke(); c.restore();
      }
    }
    for (const [id, until] of BRN) {                                                  // el personaje arde: llamas y brasas sobre su cuerpo
      if (now > until) { BRN.delete(id); continue; } const e = G.ents.get(id); if (!e) { BRN.delete(id); continue; }
      const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 2, al = Math.min(1, (until - now) / 400);
      c.save(); c.globalAlpha = al; c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,90,20,.22)'; c.beginPath(); c.ellipse(x, y - 14, 14, 20, 0, 0, 7); c.fill(); c.restore();
      c.save(); c.globalAlpha = al; for (let i = 0; i < 5; i++) flameAt(c, x - 10 + i * 5, y - 2 - (i % 2) * 8, 20 + (i % 3) * 5, 4, now, id + i); c.restore();
      if (Math.random() < 0.5) X.burst(e.rx, e.ry - 0.4, 'fire', 1, { sp: 0.8, up: 2.4, g: -1, life: 0.6, size: 2.2 });
    }
    if (LAVA) {                                                                       // quien pisa lava se hunde hasta la cintura
      const age = now - LAVA.t, f = LAVA.f, rise = Math.min(1, age / f.rise), ebb = age > f.rise + f.hold ? (age - f.rise - f.hold) / f.ebb : 0, B = caveBox(f.r);
      const rad = (Math.hypot(B.w, B.h) + 20) * (ebb > 0 ? 1 - ebb : rise), cx = f.bx !== undefined ? px(f.bx) : B.x + B.w / 2, cy = f.bx !== undefined ? py(f.by) : B.y + B.h / 2;
      for (const e of G.ents.values()) {
        if (e.kind !== 'pl' || e.h <= 0 || e.x < f.r[0] || e.x > f.r[2] || e.y < f.r[1] || e.y > f.r[3]) continue;
        if (f.isl.some((i) => Math.hypot(e.x - i.x, e.y - i.y) <= i.r)) continue;
        const x = X.sxOf(e.rx) + TS / 2, y = X.syOf(e.ry) + TS - 6; if (Math.hypot(x - cx, y - cy) > rad) continue;
        c.save(); c.beginPath(); c.rect(x - 22, y - 8, 44, 30); c.clip();
        c.fillStyle = 'rgba(255,110,20,.92)'; c.beginPath(); c.ellipse(x, y + 2, 15 + Math.sin(now / 120 + e.id) * 1.2, 8, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,220,110,.8)'; c.beginPath(); c.ellipse(x + Math.sin(now / 200 + e.id) * 4, y, 7, 3, 0, 0, 7); c.fill(); c.restore();
        if (Math.random() < 0.15) X.burst(e.rx, e.ry, 'fire', 1, { sp: 1.2, up: 2.6, g: 3, life: 0.5, size: 2.4 });
      }
    }
  });
  /* ---------- aviso de versión nueva: quien tenga el juego abierto con archivos viejos no ve los jefes nuevos ---------- */
  {
    let v0 = null, shown = false;
    const check = () => fetch('/status', { cache: 'no-store' }).then((r) => r.json()).then((st) => {
      if (!st.v) return; if (v0 === null) { v0 = st.v; return; }
      if (st.v === v0 || shown) return; shown = true;
      const bar = el('div', 'newver'); bar.append(el('span', '', '🔄 ¡Hay una versión nueva del juego! Recarga para ver los jefes y objetos nuevos. '), btn('Recargar ahora', () => location.reload())); document.body.append(bar);
    }).catch(() => {});
    check(); setInterval(check, 30000);
  }
  /* ---------- mapa del mundo: zoom, arrastre y nombres de zona ---------- */
  const wMap = win('map', '🗺️ Mapa del mundo', true); mkBtn('🗺️', 'Mapa del mundo', 'n', 'map');
  {
    const tb = el('div', 'maptb'), cvm = el('canvas', 'mapcv'), hint = el('p', 'fine', 'Rueda del ratón o + / − para acercar · arrastra para mover · N para cerrar');
    const zm = el('span', 'mapz', ''); const bMinus = btn('−', () => zoomBy(1 / 1.35)), bPlus = btn('+', () => zoomBy(1.35)), bMe = btn('📍 Centrar en mí', () => { center(); }), bAll = btn('Ver todo', () => { fitAll(); });
    tb.append(bMinus, bPlus, bMe, bAll, zm); wMap.body.append(tb, cvm, hint);
    const M = { z: 3, cx: 160, cy: 70, drag: null, raf: 0, w: 0, h: 0 };
    const LBL = { prado: [55, 48], dunas: [160, 52], sabana: [214, 128], volcan: [285, 45], pantano: [45, 128], playa: [100, 135], colinas: [100, 108] };
    const kindCol = (z) => (z.kind === 'town' ? '#ffe08a' : z.kind === 'dungeon' ? (z.pvp ? '#ff9a7a' : '#d6b8ff') : z.pvp ? '#ffb0a0' : '#e8f2dc');
    const sizeCv = () => {
      const w = Math.max(280, Math.min(920, window.innerWidth - 60)), h = Math.max(260, Math.min(520, window.innerHeight - 200)), d = window.devicePixelRatio || 1;
      if (M.w !== w || M.h !== h) { M.w = w; M.h = h; cvm.style.width = w + 'px'; cvm.style.height = h + 'px'; cvm.width = Math.round(w * d); cvm.height = Math.round(h * d); }
      return d;
    };
    const minZ = () => Math.min(M.w / G.W, M.h / G.H), clampV = () => {
      M.z = Math.max(minZ(), Math.min(18, M.z));
      const hw = M.w / M.z / 2, hh = M.h / M.z / 2;
      M.cx = G.W * M.z <= M.w ? G.W / 2 : Math.max(hw, Math.min(G.W - hw, M.cx)); M.cy = G.H * M.z <= M.h ? G.H / 2 : Math.max(hh, Math.min(G.H - hh, M.cy));
    };
    function zoomBy(k, mx, my) {
      const bx = mx == null ? M.w / 2 : mx, by = my == null ? M.h / 2 : my;
      const wx = M.cx + (bx - M.w / 2) / M.z, wy = M.cy + (by - M.h / 2) / M.z;
      M.z *= k; clampV();
      M.cx = wx - (bx - M.w / 2) / M.z; M.cy = wy - (by - M.h / 2) / M.z; clampV();
    }
    function center() { if (G.me) { M.z = Math.max(M.z, 6); M.cx = G.me.x; M.cy = G.me.y; clampV(); } }
    function fitAll() { sizeCv(); M.z = minZ(); M.cx = G.W / 2; M.cy = G.H / 2; clampV(); }
    function drawMap() {
      if (wMap.m.hidden) { M.raf = 0; return; }
      const d = sizeCv(), mb = X.miniBase && X.miniBase(); const c = cvm.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0); c.fillStyle = '#05070a'; c.fillRect(0, 0, M.w, M.h);
      if (mb && G.W) {
        clampV(); const z = M.z, ox = M.w / 2 - M.cx * z, oy = M.h / 2 - M.cy * z;
        c.imageSmoothingEnabled = false; c.drawImage(mb, ox, oy, G.W * z, G.H * z);
        c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineJoin = 'round';
        for (const zn of G.zones) {                                                             // recuadros de las zonas pequeñas (ciudades y cuevas)
          if (zn.kind === 'wild' || zn.kind === 'field') continue; const [a, b2, c2, d2] = zn.rect;
          c.strokeStyle = zn.kind === 'town' ? 'rgba(255,224,138,.7)' : 'rgba(214,184,255,.55)'; c.lineWidth = 1.5; c.strokeRect(ox + a * z, oy + b2 * z, (c2 - a + 1) * z, (d2 - b2 + 1) * z);
        }
        if (z >= 4) for (const q of G.portals || []) { c.fillStyle = '#b07cff'; c.beginPath(); c.arc(ox + (q.x + 0.5) * z, oy + (q.y + 0.5) * z, Math.max(2, z * 0.35), 0, 7); c.fill(); }
        for (const e of G.ents.values()) if (e.kind === 'pl' && e.id !== G.id) { c.fillStyle = '#fff'; c.fillRect(ox + e.x * z - 1.5, oy + e.y * z - 1.5, 3, 3); }
        const small = z < 3.2;
        for (const zn of G.zones) {                                                             // nombres de las zonas
          if (zn.id === 'prado' && false) continue; const big = zn.kind === 'wild' || zn.kind === 'field';
          if (!big && small) continue;
          const [a, b2, c2, d2] = zn.rect, ov = LBL[zn.id], lx = ov ? ov[0] : (a + c2) / 2, ly = ov ? ov[1] : (b2 + d2) / 2;
          const fs = big ? Math.max(11, Math.min(20, z * 4.2)) : Math.max(10, Math.min(15, z * 2.6));
          const nm = zn.name; c.font = `700 ${fs}px "Segoe UI", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          const x = ox + lx * z, y = oy + ly * z; if (x < -120 || x > M.w + 120 || y < -20 || y > M.h + 20) continue;
          c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(nm, x, y); c.fillStyle = kindCol(zn); c.fillText(nm, x, y);
          if (zn.pvp && z >= 2.2) { c.font = `600 ${Math.max(9, fs * 0.6)}px system-ui, sans-serif`; c.lineWidth = 3; c.strokeText('⚔ PvP', x, y + fs * 0.85); c.fillStyle = '#ff7a6a'; c.fillText('⚔ PvP', x, y + fs * 0.85); }
        }
        if (G.me) {                                                                              // tú
          const px2 = ox + (G.me.x + 0.5) * z, py2 = oy + (G.me.y + 0.5) * z, pu = 6 + Math.sin(performance.now() / 260) * 2;
          c.strokeStyle = 'rgba(255,220,120,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(px2, py2, pu + 4, 0, 7); c.stroke();
          c.fillStyle = '#c9a24b'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.arc(px2, py2, 4.5, 0, 7); c.fill(); c.stroke();
        }
        if (G.grave && G.grave.x >= 0) { const gx = ox + (G.grave.x + 0.5) * z, gy = oy + (G.grave.y + 0.5) * z; c.fillStyle = '#ff5a4a'; c.font = '700 14px system-ui'; c.textAlign = 'center'; c.fillText('✝', gx, gy); }
        zm.textContent = `Zoom ×${(z / minZ()).toFixed(1)}`;
      }
      M.raf = requestAnimationFrame(drawMap);
    }
    wMap.onOpen = () => { fitAll(); if (G.me) { M.z = Math.max(M.z, 4.2); M.cx = G.me.x; M.cy = G.me.y; clampV(); } if (!M.raf) M.raf = requestAnimationFrame(drawMap); };
    cvm.addEventListener('wheel', (ev) => { ev.preventDefault(); const r = cvm.getBoundingClientRect(); zoomBy(ev.deltaY < 0 ? 1.2 : 1 / 1.2, ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
    cvm.addEventListener('pointerdown', (ev) => { cvm.setPointerCapture(ev.pointerId); M.drag = { x: ev.clientX, y: ev.clientY, cx: M.cx, cy: M.cy }; cvm.classList.add('grab'); });
    cvm.addEventListener('pointermove', (ev) => { if (!M.drag) return; M.cx = M.drag.cx - (ev.clientX - M.drag.x) / M.z; M.cy = M.drag.cy - (ev.clientY - M.drag.y) / M.z; clampV(); });
    const endDrag = () => { M.drag = null; cvm.classList.remove('grab'); }; cvm.addEventListener('pointerup', endDrag); cvm.addEventListener('pointercancel', endDrag);
    cvm.addEventListener('dblclick', (ev) => { const r = cvm.getBoundingClientRect(); zoomBy(1.8, ev.clientX - r.left, ev.clientY - r.top); });
    document.addEventListener('keydown', (ev) => { if (wMap.m.hidden) return; if (ev.key === '+' || ev.key === '=') zoomBy(1.35); else if (ev.key === '-' || ev.key === '_') zoomBy(1 / 1.35); });
    const mini = $('#mini'); if (mini) { mini.style.cursor = 'zoom-in'; mini.title = 'Clic para abrir el mapa del mundo (N)'; mini.addEventListener('click', () => open('map')); }
  }
})();
