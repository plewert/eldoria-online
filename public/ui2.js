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

  /* ---------- atajos ---------- */
  const KEYS = { q: 'q', l: 'a', g: 's', r: 'r', p: 'm', f: 'c' };
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
})();
