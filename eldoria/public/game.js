'use strict';
(() => {
  const TS = 32;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } },
  };
  const STYLE_NAME = { melee: 'Cuerpo a cuerpo', ranged: 'Distancia', magic: 'Magia' };
  const COLORS = ['#4aa3ff', '#e0503b', '#7bb36f', '#c9a24b', '#b07cff', '#e8e2d0'];

  const G = {
    W: 0, H: 0, tiles: null, zoneGrid: null, zones: [], portals: [], npcs: [], items: {}, mons: {}, cfg: {},
    id: 0, me: null, stats: null, inv: [], eq: {}, gold: 0,
    ents: new Map(), ground: [], texts: [], proj: [], flashes: [], bubbles: new Map(),
    cam: { x: 0, y: 0 }, path: [], lastTp: -1, zoneId: '', shopOpen: false, hover: null,
  };
  let ws = null, joined = false, wantMode = 'login';

  /* ======================================================================
   *  CONEXIÓN
   * ==================================================================== */
  function connect() {
    return new Promise((resolve, reject) => {
      if (ws && ws.readyState === 1) return resolve();
      const s = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
      s.onopen = () => { ws = s; resolve(); };
      s.onerror = () => reject(new Error('No se pudo conectar con el servidor.'));
      s.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
      s.onclose = () => {
        if (ws === s) ws = null;
        if (joined) { $('#offline').hidden = false; $('#offOk').focus(); }
      };
    });
  }
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

  /* ======================================================================
   *  ACCESO
   * ==================================================================== */
  (function initLogin() {
    const sw = $('#swatches');
    const saved = store.get('eldoria.color') || COLORS[0];
    COLORS.forEach((c, i) => {
      const lab = el('label'); const inp = el('input'); const sp = el('span');
      inp.type = 'radio'; inp.name = 'color'; inp.value = c; inp.checked = c === saved || (!COLORS.includes(saved) && i === 0);
      inp.setAttribute('aria-label', 'Color ' + (i + 1)); sp.style.background = c;
      lab.append(inp, sp); sw.append(lab);
    });
    $('#lname').value = store.get('eldoria.name') || '';
    document.querySelectorAll('#loginForm button[type=submit]').forEach((b) => b.addEventListener('click', () => { wantMode = b.dataset.mode; }));
    $('#loginForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const name = $('#lname').value.trim(), pass = $('#lpass').value;
      const color = (document.querySelector('#swatches input:checked') || {}).value || COLORS[0];
      $('#loginErr').textContent = '';
      try { await connect(); } catch (e) { $('#loginErr').textContent = e.message; return; }
      store.set('eldoria.name', name); store.set('eldoria.color', color);
      send({ t: 'auth', mode: wantMode, name, pass, color });
    });
    const refresh = () => fetch('/status').then((r) => r.json()).then((s) => {
      $('#online').textContent = s.online === 1 ? '1 aventurero conectado ahora.' : `${s.online} aventureros conectados ahora.`;
    }).catch(() => { $('#online').textContent = ''; });
    refresh(); setInterval(() => { if (!joined) refresh(); }, 15000);
  })();
  $('#offOk').addEventListener('click', () => location.reload());
  $('#deadOk').addEventListener('click', () => { $('#dead').hidden = true; });

  /* ======================================================================
   *  MENSAJES DEL SERVIDOR
   * ==================================================================== */
  function onMsg(m) {
    switch (m.t) {
      case 'welcome': onWelcome(m); break;
      case 'inv': G.inv = m.inv; G.eq = m.eq; G.gold = m.gold; renderInv(); break;
      case 'stats': G.stats = m; renderStats(); break;
      case 's': onSnapshot(m); break;
      case 'chat': addChat(m); break;
      case 'shop': openShop(m); break;
      case 'dead': onDead(m); break;
      case 'err':
        if (!joined) $('#loginErr').textContent = m.msg;
        else addChat({ n: '', m: m.msg, k: 'k' });
        break;
      default: break;
    }
  }

  function onWelcome(m) {
    joined = true;
    G.id = m.id; G.W = m.w; G.H = m.h; G.zones = m.zones; G.portals = m.portals; G.npcs = m.npcs; G.items = m.items; G.mons = m.mons; G.cfg = m.cfg;
    const CH = '0123456789a';
    G.tiles = new Uint8Array(G.W * G.H);
    m.rows.forEach((row, y) => { for (let x = 0; x < G.W; x++) G.tiles[y * G.W + x] = CH.indexOf(row[x]); });
    G.zoneGrid = new Uint8Array(G.W * G.H);
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
      let zi = G.zones.length - 1;
      for (let i = 0; i < G.zones.length; i++) { const r = G.zones[i].rect; if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { zi = i; break; } }
      G.zoneGrid[y * G.W + x] = zi;
    }
    G.npcTiles = new Set(G.npcs.map((n) => n.y * G.W + n.x));
    buildMiniBase();
    $('#login').hidden = true; $('#game').hidden = false;
    $('#lpass').value = '';
    resize();
    requestAnimationFrame(frame);
  }

  const zoneAt = (x, y) => (x < 0 || y < 0 || x >= G.W || y >= G.H ? G.zones[G.zones.length - 1] : G.zones[G.zoneGrid[y * G.W + x]]);

  function onSnapshot(m) {
    const seen = new Set();
    for (const p of m.pl) {
      seen.add(p.i);
      let e = G.ents.get(p.i);
      if (!e) { e = { kind: 'pl', id: p.i, rx: p.x, ry: p.y }; G.ents.set(p.i, e); }
      Object.assign(e, { n: p.n, x: p.x, y: p.y, h: p.h, H: p.H, l: p.l, c: p.c, s: p.s, d: p.d, k: p.k, o: p.o });
    }
    for (const q of m.mo) {
      seen.add(q.i);
      let e = G.ents.get(q.i);
      if (!e) { e = { kind: 'mo', id: q.i, rx: q.x, ry: q.y }; G.ents.set(q.i, e); }
      Object.assign(e, { t: q.t, x: q.x, y: q.y, h: q.h, H: q.H });
    }
    for (const id of [...G.ents.keys()]) if (!seen.has(id)) G.ents.delete(id);
    G.me = m.me; G.ground = m.gi;
    const meEnt = G.ents.get(G.id);
    if (m.me.tp !== G.lastTp) {                         // teletransporte o reaparición: sin deslizamiento
      G.lastTp = m.me.tp; G.path = [];
      if (meEnt) { meEnt.rx = meEnt.x; meEnt.ry = meEnt.y; }
      G.cam.x = m.me.x; G.cam.y = m.me.y;
      for (const e of G.ents.values()) { e.rx = e.x; e.ry = e.y; }
    }
    const now = performance.now();
    for (const f of m.fx) addFx(f, now);
    updateHud();
    drawMini();
  }

  function addFx(f, now) {
    switch (f.k) {
      case 'd': G.texts.push({ x: f.x, y: f.y, v: String(f.v), c: f.c, t: now, dx: (Math.random() - 0.5) * 14 }); break;
      case 'p': G.proj.push({ x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, s: f.s, t: now }); break;
      case 's': case 'x': case 'l': case 'h': G.flashes.push({ k: f.k, x: f.x, y: f.y, t: now }); break;
      case 'c': G.bubbles.set(f.i, { v: f.v, t: now }); break;
      default: break;
    }
  }

  function onDead(m) {
    $('#deadTxt').textContent = m.pvp ? `${m.by} te ha derrotado en una zona PvP.` : `${m.by} te ha derrotado. En zona segura no pierdes nada.`;
    const ul = $('#deadLost'); ul.replaceChildren();
    (m.lost || []).forEach((t) => ul.append(el('li', '', 'Perdiste: ' + t)));
    $('#dead').hidden = false; $('#deadOk').focus();
    G.path = [];
  }

  /* ======================================================================
   *  INTERFAZ: chat, barras, inventario, tienda
   * ==================================================================== */
  function addChat(m) {
    const log = $('#log');
    const p = el('p', m.k || 's');
    if (m.n) {
      const b = el('b', '', m.k === 'g' ? `[Global] ${m.n}: ` : `${m.n}: `);
      p.append(b, document.createTextNode(m.m));
    } else p.textContent = m.m;
    log.append(p);
    while (log.children.length > 120) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  const fmt = (n) => Math.round(n).toLocaleString('es');
  const pct = (a, b) => `${Math.max(0, Math.min(100, (a / Math.max(1, b)) * 100))}%`;

  function updateHud() {
    const m = G.me, s = G.stats;
    if (!m) return;
    if (s) {
      $('#bhp').style.width = pct(m.h, s.maxHp); $('#thpTxt').textContent = `${fmt(m.h)} / ${fmt(s.maxHp)}`;
      $('#bmp').style.width = pct(m.m, s.maxMana); $('#tmpTxt').textContent = `${fmt(m.m)} / ${fmt(s.maxMana)}`;
    }
    const z = zoneAt(m.x, m.y);
    const zEl = $('#zone');
    zEl.className = (z.pvp ? 'pvp' : 'safe') + (m.lk > 0 ? ' lock' : '');
    $('#zname').textContent = z.name;
    $('#zrule').textContent = m.lk > 0 ? `En combate ${m.lk} s: no puedes huir a una zona segura`
      : z.pvp ? 'Zona PvP: pueden atacarte y robarte el botín' : 'Zona segura: solo te atacan los monstruos';
    const t = m.tg != null ? G.ents.get(m.tg) : null;
    const tp = $('#target');
    if (t) {
      tp.hidden = false;
      $('#tname').textContent = t.kind === 'mo' ? (G.mons[t.t] || {}).name || 'Monstruo' : `${t.n} (nv ${t.l})`;
      $('#thp').style.width = pct(t.h, t.H);
    } else tp.hidden = true;
  }

  function renderStats() {
    const s = G.stats; if (!s) return;
    const me = G.ents.get(G.id);
    $('#cname').textContent = me ? me.n : '';
    $('#clv').textContent = s.lv;
    $('#bxp').style.width = pct(s.xp - s.xpLo, s.xpHi - s.xpLo);
    $('#txpTxt').textContent = `${fmt(s.xp - s.xpLo)} / ${fmt(s.xpHi - s.xpLo)}`;
    $('#gold').textContent = fmt(s.gold); $('#defTxt').textContent = `Defensa ${s.def}`;
    document.querySelectorAll('#skills li').forEach((li) => {
      const k = li.dataset.sk, [lv, xp, lo, hi] = s.sk[k];
      li.querySelector('b').textContent = lv;
      li.querySelector('.bar i').style.width = pct(xp - lo, hi - lo);
      li.classList.toggle('on', s.style === k);
    });
    document.querySelectorAll('#hotbar [data-style]').forEach((b) => b.classList.toggle('on', s.style === b.dataset.style));
    updateHud();
  }

  function itemInfo(id) {
    const d = G.items[id]; if (!d) return id;
    const L = [d.name];
    if (d.type === 'weapon') L.push(`${STYLE_NAME[d.style]} · ataque ${d.atk} · alcance ${d.range}${d.mana ? ` · ${d.mana} de maná` : ''}`);
    else if (['head', 'body', 'shield'].includes(d.type)) L.push(`Defensa ${d.def}`);
    else if (d.type === 'consumable') L.push(d.heal ? `Cura ${d.heal} de vida` : `Restaura ${d.restore} de maná`);
    if (d.minLevel > 1) L.push(`Requiere nivel ${d.minLevel}`);
    if (d.sell) L.push(`Se vende por ${d.sell} de oro`);
    return L.join('\n');
  }

  function fillSlot(node, id, qty) {
    node.replaceChildren();
    node.classList.toggle('empty', !id);
    node.classList.remove('locked');
    if (!id) { node.removeAttribute('title'); return; }
    const d = G.items[id];
    node.append(el('span', '', d.icon));
    if (qty > 1) node.append(el('span', 'q', String(qty)));
    node.title = itemInfo(id);
    if (G.stats && (d.minLevel || 1) > G.stats.lv) node.classList.add('locked');
  }

  const EQ_GLYPH = { head: '⛑', weapon: '⚔', body: '👕', shield: '🛡' };
  function buildInvGrid() {
    const grid = $('#inv'); grid.replaceChildren();
    for (let i = 0; i < G.cfg.invSize; i++) {
      const s = el('div', 'slot empty'); s.dataset.i = i;
      s.addEventListener('click', (ev) => {
        const it = G.inv[i]; if (!it) return;
        if (ev.shiftKey) send({ t: 'drop', s: i, q: it[1] }); else send({ t: 'use', s: i });
      });
      s.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (G.inv[i]) send({ t: 'drop', s: i, q: 1 }); });
      grid.append(s);
    }
    document.querySelectorAll('#equip .slot').forEach((s) => {
      s.addEventListener('click', () => { if (G.eq[s.dataset.eq]) send({ t: 'unequip', slot: s.dataset.eq }); });
    });
  }

  function renderInv() {
    if (!$('#inv').children.length) buildInvGrid();
    $('#inv').querySelectorAll('.slot').forEach((s) => { const it = G.inv[+s.dataset.i]; fillSlot(s, it && it[0], it && it[1]); });
    document.querySelectorAll('#equip .slot').forEach((s) => {
      const id = G.eq[s.dataset.eq]; fillSlot(s, id, 1);
      if (!id) { s.textContent = EQ_GLYPH[s.dataset.eq]; s.title = 'Vacío: ' + { head: 'casco', weapon: 'arma', body: 'armadura', shield: 'escudo' }[s.dataset.eq]; }
    });
    $('#gold').textContent = fmt(G.gold);
    const count = (key) => G.inv.reduce((n, it) => { const d = it && G.items[it[0]]; return n + (d && d[key] ? it[1] : 0); }, 0);
    const h = count('heal'), mn = count('restore');
    $('#nHeal').textContent = h; $('#nMana').textContent = mn;
    document.querySelector('[data-pot=heal]').classList.toggle('none', !h);
    document.querySelector('[data-pot=mana]').classList.toggle('none', !mn);
    if (G.shopOpen) renderShop();
  }

  /* ---- tienda ---- */
  let shopStock = [];
  function openShop(m) {
    shopStock = m.stock; G.shopOpen = true;
    $('#shopTitle').textContent = m.npc;
    $('#shop').hidden = false; renderShop(); $('#shopClose').focus();
  }
  function closeShop() { G.shopOpen = false; $('#shop').hidden = true; }
  $('#shopClose').addEventListener('click', closeShop);
  $('#shop').addEventListener('mousedown', (ev) => { if (ev.target === $('#shop')) closeShop(); });

  function renderShop() {
    $('#shopGold').textContent = fmt(G.gold);
    const buy = $('#buyList'); buy.replaceChildren();
    shopStock.forEach((id) => {
      const d = G.items[id];
      const row = el('div', 'item');
      const nm = el('div', 'nm', d.name);
      const sub = el('small', '', `${d.price} de oro${d.minLevel > 1 ? ` · nivel ${d.minLevel}` : ''}${d.atk ? ` · ataque ${d.atk}` : ''}${d.def ? ` · defensa ${d.def}` : ''}`);
      nm.append(sub); row.title = itemInfo(id);
      const acts = el('div', 'acts');
      const b1 = el('button', '', 'Comprar'); b1.disabled = G.gold < d.price;
      b1.addEventListener('click', () => send({ t: 'buy', id, q: 1 }));
      acts.append(b1);
      if (d.stack) {
        const b10 = el('button', '', '×10'); b10.disabled = G.gold < d.price * 10;
        b10.addEventListener('click', () => send({ t: 'buy', id, q: 10 }));
        acts.append(b10);
      }
      row.append(el('div', 'ico', d.icon), nm, acts); buy.append(row);
    });
    const sell = $('#sellList'); sell.replaceChildren();
    let any = false;
    G.inv.forEach((it, i) => {
      if (!it) return;
      const d = G.items[it[0]]; if (!d || !d.sell) return;
      any = true;
      const row = el('div', 'item');
      const nm = el('div', 'nm', `${d.name}${it[1] > 1 ? ' ×' + it[1] : ''}`);
      nm.append(el('small', '', `${d.sell} de oro cada uno`)); row.title = itemInfo(it[0]);
      const acts = el('div', 'acts');
      const b1 = el('button', '', 'Vender'); b1.addEventListener('click', () => send({ t: 'sell', s: i, q: 1 }));
      acts.append(b1);
      if (it[1] > 1) { const ba = el('button', '', 'Todo'); ba.addEventListener('click', () => send({ t: 'sell', s: i, q: it[1] })); acts.append(ba); }
      row.append(el('div', 'ico', d.icon), nm, acts); sell.append(row);
    });
    if (!any) sell.append(el('p', 'empty-note', 'No llevas nada que el mercader compre.'));
  }

  /* ======================================================================
   *  TEXTURAS DEL MAPA (generadas por código, estilo píxel)
   * ==================================================================== */
  const TILE = { GRASS: 0, WATER: 1, TREE: 2, ROAD: 3, WALL: 4, DFLOOR: 5, PORTAL: 6, ROCK: 7, FLOWER: 8, SHOP: 9, AFLOOR: 10 };
  const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const mk = (fn) => { const c = document.createElement('canvas'); c.width = c.height = TS; const g = c.getContext('2d'); fn(g); return c; };
  const dot = (g, c, x, y, w = 2, h = 2) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  const grass = (v) => mk((g) => {
    const r = seeded(100 + v); g.fillStyle = '#3d6a38'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 26; i++) dot(g, r() < 0.5 ? '#477a41' : '#335c31', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2);
    for (let i = 0; i < 5; i++) dot(g, '#5c9552', (r() * 16 | 0) * 2, (r() * 14 | 0) * 2, 2, 4);
  });
  const water = (f) => mk((g) => {
    g.fillStyle = '#27597f'; g.fillRect(0, 0, TS, TS);
    const r = seeded(7);
    for (let i = 0; i < 6; i++) { const x = ((r() * 12 | 0) * 2 + f * 6) % 28, y = (r() * 15 | 0) * 2; dot(g, '#3a77a3', x, y, 8, 2); }
    for (let i = 0; i < 3; i++) dot(g, '#1f4a6b', (r() * 14 | 0) * 2, (r() * 15 | 0) * 2, 6, 2);
  });
  const withGrass = (v, fn) => mk((g) => { g.drawImage(grass(v), 0, 0); fn(g); });
  const tree = (v) => withGrass(v, (g) => {
    dot(g, 'rgba(0,0,0,.25)', 7, 25, 18, 5);
    dot(g, '#5a3b22', 14, 18, 4, 11); dot(g, '#46301b', 14, 18, 1, 11);
    const blob = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    blob(16, 13, 11, '#1d4526'); blob(11, 15, 7, '#25552e'); blob(21, 14, 7, '#25552e'); blob(15, 8, 7, '#2e6a38');
    dot(g, '#3d8446', 12, 7, 3, 2); dot(g, '#3d8446', 19, 11, 3, 2);
  });
  const rock = (v) => withGrass(v, (g) => {
    dot(g, 'rgba(0,0,0,.25)', 6, 22, 20, 6);
    g.fillStyle = '#7b7e86'; g.beginPath(); g.ellipse(16, 18, 10, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#9a9da5'; g.beginPath(); g.ellipse(13, 15, 5, 3.5, 0, 0, 7); g.fill();
    dot(g, '#5d6068', 19, 21, 6, 2);
  });
  const flower = (v, col) => withGrass(v, (g) => { const r = seeded(40 + v); for (let i = 0; i < 3; i++) { const x = 4 + (r() * 12 | 0) * 2, y = 4 + (r() * 12 | 0) * 2; dot(g, col, x, y, 3, 3); dot(g, '#f2e6a8', x + 1, y + 1, 1, 1); } });
  const road = (v) => mk((g) => {
    const r = seeded(300 + v); g.fillStyle = '#7d756a'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#6a6358'; g.fillRect(0, 15, TS, 2); g.fillRect(15, 0, 2, 15); g.fillRect(7, 17, 2, 15); g.fillRect(23, 17, 2, 15);
    for (let i = 0; i < 14; i++) dot(g, r() < 0.5 ? '#8c8478' : '#5f594f', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 2);
  });
  const wall = (v) => mk((g) => {
    g.fillStyle = '#4b5363'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#2f343f'; for (let y = 0; y < TS; y += 8) g.fillRect(0, y, TS, 1);
    for (let y = 0; y < 4; y++) for (let x = (y % 2) * 8; x < TS; x += 16) g.fillRect(x + 8 * (y % 2 ? 0 : 1) - (y % 2 ? 0 : 0), y * 8, 1, 8);
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, TS, 2);
    const r = seeded(500 + v); for (let i = 0; i < 6; i++) dot(g, 'rgba(0,0,0,.18)', (r() * 15 | 0) * 2, (r() * 15 | 0) * 2);
  });
  const dfloor = (v) => mk((g) => {
    const r = seeded(700 + v); g.fillStyle = '#2a2933'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#1f1e27'; g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS); g.fillRect(16, 0, 1, TS); g.fillRect(0, 16, TS, 1);
    for (let i = 0; i < 10; i++) dot(g, r() < 0.5 ? '#343340' : '#22212b', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2);
  });
  const afloor = (v) => mk((g) => {
    const r = seeded(900 + v); g.fillStyle = '#3b2024'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#2a1518'; g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS); g.fillRect(16, 0, 1, TS); g.fillRect(0, 16, TS, 1);
    for (let i = 0; i < 9; i++) dot(g, r() < 0.5 ? '#4a292d' : '#2e191c', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2);
    if (r() < 0.35) dot(g, '#d2552a', (r() * 14 | 0) * 2 + 2, (r() * 14 | 0) * 2 + 2, 2, 2);
  });
  const shopFloor = (v) => mk((g) => {
    const r = seeded(1100 + v); g.fillStyle = '#6e4b2e'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#573a22'; for (let y = 0; y < TS; y += 8) g.fillRect(0, y, TS, 1);
    for (let i = 0; i < 8; i++) dot(g, r() < 0.5 ? '#7a553a' : '#5d3f27', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 4, 1);
  });

  const TEX = {
    grass: [0, 1, 2, 3].map(grass), water: [water(0), water(1)],
    tree: [0, 1].map(tree), rock: [0, 1].map(rock),
    flower: [flower(0, '#e86a8a'), flower(1, '#f0d26a'), flower(2, '#b894f0')],
    road: [0, 1, 2].map(road), wall: [0, 1, 2].map(wall),
    dfloor: [0, 1, 2, 3].map(dfloor), afloor: [0, 1, 2, 3].map(afloor), shop: [0, 1].map(shopFloor),
  };
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };

  function texFor(t, x, y, frame) {
    const h = hash(x, y);
    switch (t) {
      case TILE.GRASS: return TEX.grass[h % 4];
      case TILE.WATER: return TEX.water[frame];
      case TILE.TREE: return TEX.tree[h % 2];
      case TILE.ROAD: case TILE.PORTAL: return TEX.road[h % 3];
      case TILE.WALL: return TEX.wall[h % 3];
      case TILE.DFLOOR: return TEX.dfloor[h % 4];
      case TILE.ROCK: return TEX.rock[h % 2];
      case TILE.FLOWER: return TEX.flower[h % 3];
      case TILE.SHOP: return TEX.shop[h % 2];
      case TILE.AFLOOR: return TEX.afloor[h % 4];
      default: return TEX.grass[0];
    }
  }

  /* ======================================================================
   *  MINIMAPA
   * ==================================================================== */
  const MINI_COL = ['#3f6b3a', '#2b5d8a', '#234a2a', '#8a8271', '#59606e', '#3a3948', '#b07cff', '#77797f', '#3f6b3a', '#7a5634', '#4a2a2e'];
  let miniBase = null;
  function buildMiniBase() {
    const c = document.createElement('canvas'); c.width = G.W; c.height = G.H;
    const g = c.getContext('2d');
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
      g.fillStyle = MINI_COL[G.tiles[y * G.W + x]]; g.fillRect(x, y, 1, 1);
      if (zoneAt(x, y).pvp) { g.fillStyle = 'rgba(212,80,59,.22)'; g.fillRect(x, y, 1, 1); }
    }
    miniBase = c;
  }
  function drawMini() {
    const cv = $('#mini'); if (!miniBase || !G.me) return;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(miniBase, 0, 0, cv.width, cv.height);
    const sx = cv.width / G.W, sy = cv.height / G.H;
    for (const e of G.ents.values()) {
      if (e.id === G.id) continue;
      g.fillStyle = e.kind === 'pl' ? '#ffffff' : '#ff7a5c';
      g.fillRect(e.x * sx - 1, e.y * sy - 1, e.kind === 'pl' ? 3 : 2, e.kind === 'pl' ? 3 : 2);
    }
    g.fillStyle = '#c9a24b'; g.strokeStyle = '#000'; g.lineWidth = 1;
    g.beginPath(); g.arc(G.me.x * sx, G.me.y * sy, 3.5, 0, 7); g.fill(); g.stroke();
  }

  /* ======================================================================
   *  DIBUJO
   * ==================================================================== */
  const cv = $('#view'), ctx = cv.getContext('2d');
  let cw = 0, ch = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = cv.getBoundingClientRect(); cw = r.width; ch = r.height;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  }
  window.addEventListener('resize', resize);

  const sxOf = (tx) => Math.round((tx - G.cam.x) * TS + cw / 2 - TS / 2);
  const syOf = (ty) => Math.round((ty - G.cam.y) * TS + ch / 2 - TS / 2);

  function outlined(c, text, x, y, fill, font = 'bold 11px "Segoe UI", system-ui, sans-serif') {
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.85)'; c.lineJoin = 'round'; c.strokeText(text, x, y);
    c.fillStyle = fill; c.fillText(text, x, y);
  }
  function hpBar(c, x, y, w, frac) {
    c.fillStyle = 'rgba(0,0,0,.8)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    c.fillStyle = frac > 0.5 ? '#6fb35e' : frac > 0.25 ? '#d9a03a' : '#c8452f';
    c.fillRect(x - w / 2, y, Math.max(1, w * frac), 3);
  }

  function drawPlayer(c, e, sx, sy, now) {
    const cx = sx + TS / 2, base = sy + TS - 3;
    const moving = Math.hypot(e.x - e.rx, e.y - e.ry) > 0.08;
    const bob = moving ? Math.sin(now / 80 + e.id) * 1.6 : 0;
    const side = e.d === 3 ? -1 : 1;
    c.save();
    if (e.o) c.globalAlpha = 0.55;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, base, 10, 4, 0, 0, 7); c.fill();
    c.fillStyle = '#2a2f3a'; c.fillRect(cx - 5, base - 9, 4, 9 + bob); c.fillRect(cx + 1, base - 9, 4, 9 - bob);   // piernas
    c.fillStyle = e.c; c.fillRect(cx - 7, base - 21, 14, 13);                                                       // capa/cuerpo
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(cx - 7, base - 10, 14, 2);
    c.fillStyle = '#e8c39e'; c.beginPath(); c.arc(cx, base - 26, 6, 0, 7); c.fill();                               // cabeza
    c.fillStyle = '#3a2a1c'; c.beginPath(); c.arc(cx, base - 28, 6, Math.PI, 0); c.fill();
    if (e.d !== 0) { c.fillStyle = '#111'; c.fillRect(cx + side * 2 - 1, base - 26, 2, 2); }
    const hx = cx + 9 * side, hy = base - 14;
    if (e.s === 'melee') {
      c.fillStyle = '#cfd6df'; c.fillRect(hx - 1, hy - 14, 3, 14); c.fillStyle = '#c9a24b'; c.fillRect(hx - 4, hy - 1, 9, 3); c.fillStyle = '#6b4a2e'; c.fillRect(hx - 1, hy + 2, 3, 4);
    } else if (e.s === 'ranged') {
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; c.beginPath(); c.arc(hx - side * 5, hy - 2, 10, side > 0 ? -1.2 : Math.PI - 1.2 + 0.0, side > 0 ? 1.2 : Math.PI + 1.2, side < 0); c.stroke();
      c.strokeStyle = '#d8d2c0'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx - side * 5 + side * 5.5, hy - 11); c.lineTo(hx - side * 5 + side * 5.5, hy + 7); c.stroke();
    } else if (e.s === 'magic') {
      c.fillStyle = '#7a4f26'; c.fillRect(hx - 1, hy - 18, 3, 24);
      const glow = 4 + Math.sin(now / 200) * 0.8;
      c.fillStyle = 'rgba(134,193,234,.35)'; c.beginPath(); c.arc(hx, hy - 20, glow + 3, 0, 7); c.fill();
      c.fillStyle = '#86c1ea'; c.beginPath(); c.arc(hx, hy - 20, glow, 0, 7); c.fill();
    }
    c.restore();
  }

  function drawMonster(c, e, sx, sy, now) {
    const d = G.mons[e.t] || { icon: '❓', boss: false };
    const cx = sx + TS / 2, cy = sy + TS / 2;
    const size = d.boss ? 46 : 28;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, sy + TS - 4, d.boss ? 17 : 11, 4, 0, 0, 7); c.fill();
    if (d.boss) { c.fillStyle = 'rgba(212,80,59,.16)'; c.beginPath(); c.arc(cx, cy, 24 + Math.sin(now / 300) * 2, 0, 7); c.fill(); }
    const hop = Math.abs(Math.sin(now / 170 + e.id)) * (Math.hypot(e.x - e.rx, e.y - e.ry) > 0.08 ? 3 : 0.6);
    c.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fff'; c.fillText(d.icon, cx, cy - hop - (d.boss ? 6 : 1));
  }

  function drawFlash(c, f, now) {
    const age = now - f.t, cx = sxOf(f.x) + TS / 2, cy = syOf(f.y) + TS / 2;
    if (f.k === 's') {
      if (age > 180) return; const a = 1 - age / 180;
      c.strokeStyle = `rgba(255,240,200,${a})`; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 8 + age / 12, -2.4, -0.4); c.stroke();
      c.beginPath(); c.arc(cx, cy, 5 + age / 14, 0.8, 2.6); c.stroke();
    } else if (f.k === 'x') {
      if (age > 450) return; const a = 1 - age / 450;
      c.strokeStyle = `rgba(230,230,230,${a})`; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 6 + age / 14, 0, 7); c.stroke();
      c.fillStyle = `rgba(160,160,170,${a * 0.5})`; c.beginPath(); c.arc(cx, cy, 4 + age / 20, 0, 7); c.fill();
    } else if (f.k === 'l') {
      if (age > 1100) return; const a = 1 - age / 1100;
      c.strokeStyle = `rgba(201,162,75,${a})`; c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy + 6 - age / 30, 14 + age / 60, 5, 0, 0, 7); c.stroke();
      c.beginPath(); c.ellipse(cx, cy + 16 - age / 22, 12, 4, 0, 0, 7); c.stroke();
    } else if (f.k === 'h') {
      if (age > 700) return; const a = 1 - age / 700;
      c.fillStyle = `rgba(140,230,140,${a})`;
      for (let i = 0; i < 5; i++) { const ang = i * 1.26 + age / 300; c.fillRect(cx + Math.cos(ang) * 10 - 1, cy - age / 18 + Math.sin(ang) * 4 - 1, 3, 3); }
    }
  }

  const TXT_COL = { p: '#ff5a4a', h: '#ffd08a', g: '#7be08a', m: '#86c1ea', x: '#f2d27a' };

  function drawProj(c, p, now) {
    const T = 230, age = now - p.t; if (age > T) return;
    const k = age / T;
    const x = (p.x1 + (p.x2 - p.x1) * k - G.cam.x) * TS + cw / 2, y = (p.y1 + (p.y2 - p.y1) * k - G.cam.y) * TS + ch / 2 - 6;
    const ang = Math.atan2(p.y2 - p.y1, p.x2 - p.x1);
    if (p.s === 'ranged' || p.s === 'arrow') {
      c.save(); c.translate(x, y); c.rotate(ang);
      c.strokeStyle = '#d8d2c0'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(7, 0); c.stroke();
      c.fillStyle = '#cfd6df'; c.beginPath(); c.moveTo(10, 0); c.lineTo(5, -3); c.lineTo(5, 3); c.fill();
      c.restore();
    } else {
      const fire = p.s === 'fire';
      const g = c.createRadialGradient(x, y, 1, x, y, 11);
      g.addColorStop(0, fire ? '#fff2c0' : '#e8f4ff'); g.addColorStop(0.4, fire ? '#f08a2e' : '#86c1ea'); g.addColorStop(1, fire ? 'rgba(224,80,40,0)' : 'rgba(134,120,234,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill();
    }
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!G.me) return;
    const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;

    // interpolación suave de posiciones
    const k = 1 - Math.exp(-dt * 15);
    for (const e of G.ents.values()) {
      if (Math.abs(e.x - e.rx) > 4 || Math.abs(e.y - e.ry) > 4) { e.rx = e.x; e.ry = e.y; } else { e.rx += (e.x - e.rx) * k; e.ry += (e.y - e.ry) * k; }
    }
    const me = G.ents.get(G.id);
    const tx = me ? me.rx : G.me.x, ty = me ? me.ry : G.me.y;
    G.cam.x += (tx - G.cam.x) * (1 - Math.exp(-dt * 20)); G.cam.y += (ty - G.cam.y) * (1 - Math.exp(-dt * 20));

    c.fillStyle = '#05070a'; c.fillRect(0, 0, cw, ch);
    const frameW = Math.floor(now / 650) % 2;
    const x0 = Math.floor(G.cam.x - cw / 2 / TS) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / TS) + 1;
    const y0 = Math.floor(G.cam.y - ch / 2 / TS) - 1, y1 = Math.ceil(G.cam.y + ch / 2 / TS) + 1;

    // terreno
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= G.W || y >= G.H) continue;
      const t = G.tiles[y * G.W + x];
      c.drawImage(texFor(t, x, y, frameW), sxOf(x), syOf(y));
    }
    // zonas PvP: velo rojizo y borde donde termina la zona segura
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= G.W || y >= G.H || !zoneAt(x, y).pvp) continue;
      const sx = sxOf(x), sy = syOf(y);
      c.fillStyle = 'rgba(170,30,20,.10)'; c.fillRect(sx, sy, TS, TS);
      c.fillStyle = 'rgba(212,80,59,.85)';
      if (!zoneAt(x - 1, y).pvp) c.fillRect(sx, sy, 2, TS);
      if (!zoneAt(x + 1, y).pvp) c.fillRect(sx + TS - 2, sy, 2, TS);
      if (!zoneAt(x, y - 1).pvp) c.fillRect(sx, sy, TS, 2);
      if (!zoneAt(x, y + 1).pvp) c.fillRect(sx, sy + TS - 2, TS, 2);
    }
    // portales
    for (const p of G.portals) {
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const cx = sxOf(p.x) + TS / 2, cy = syOf(p.y) + TS / 2, pvp = /PvP/.test(p.label);
      const col = pvp ? '224,80,59' : '134,150,255';
      const g = c.createRadialGradient(cx, cy, 2, cx, cy, 20);
      g.addColorStop(0, `rgba(${col},.9)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 20, 0, 7); c.fill();
      c.strokeStyle = `rgba(${col},.95)`; c.lineWidth = 2;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(cx, cy, 9 + i * 4, now / (500 + i * 300) * (i ? -1 : 1), now / (500 + i * 300) * (i ? -1 : 1) + 4.2); c.stroke(); }
      if (Math.abs(p.x - G.cam.x) < 6 && Math.abs(p.y - G.cam.y) < 5) outlined(c, p.label, cx, cy - 26, pvp ? '#f0b3a6' : '#cfd6ff');
    }
    // objetos del suelo
    for (const g of G.ground) {
      const cx = sxOf(g.x) + TS / 2, cy = syOf(g.y) + TS / 2 + 3 + Math.sin(now / 400 + g.x * 3 + g.y) * 1.2;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, cy + 8, 8, 3, 0, 0, 7); c.fill();
      c.font = '20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
      const top = g.it[0], d = G.items[top[0]];
      c.fillText(g.n > 1 ? '👝' : (d ? d.icon : '?'), cx, cy);
      if (g.n > 1) outlined(c, '×' + g.n, cx + 11, cy + 9, '#f2d27a', 'bold 10px sans-serif');
      else if (top[1] > 1) outlined(c, String(top[1]), cx + 10, cy + 9, '#f2d27a', 'bold 10px sans-serif');
      if (top[2]) c.fillText('🔒', cx - 9, cy - 9);
    }
    // PNJ
    for (const n of G.npcs) {
      if (n.x < x0 || n.x > x1 || n.y < y0 || n.y > y1) continue;
      const cx = sxOf(n.x) + TS / 2, cy = syOf(n.y) + TS / 2;
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, cy + 12, 11, 4, 0, 0, 7); c.fill();
      c.font = '28px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
      c.fillText(n.icon, cx, cy - 1);
      outlined(c, n.name, cx, cy - 26, '#c9a24b');
    }
    // entidades ordenadas por fila
    const list = [...G.ents.values()].sort((a, b) => a.ry - b.ry);
    const tgId = G.me.tg;
    for (const e of list) {
      const sx = Math.round((e.rx - G.cam.x) * TS + cw / 2 - TS / 2), sy = Math.round((e.ry - G.cam.y) * TS + ch / 2 - TS / 2);
      if (sx < -TS * 2 || sy < -TS * 2 || sx > cw + TS || sy > ch + TS) continue;
      if (e.id === tgId) {
        c.strokeStyle = `rgba(255,70,50,${0.7 + 0.3 * Math.sin(now / 150)})`; c.lineWidth = 2; c.strokeRect(sx + 1, sy + 1, TS - 2, TS - 2);
      }
      if (e.kind === 'pl') drawPlayer(c, e, sx, sy, now); else drawMonster(c, e, sx, sy, now);
      const cx = sx + TS / 2;
      if (e.kind === 'pl') {
        const top = sy - 14;
        hpBar(c, cx, top, 28, e.h / e.H);
        outlined(c, `${e.n} [${e.l}]${e.k ? ' ⚔' : ''}${e.o ? ' (ausente)' : ''}`, cx, top - 8, e.id === G.id ? '#c9a24b' : '#e8e2d0');
      } else {
        const d = G.mons[e.t] || {}; const top = sy - (d.boss ? 18 : 6);
        hpBar(c, cx, top, d.boss ? 40 : 28, e.h / e.H);
        outlined(c, d.name || '?', cx, top - 8, d.boss ? '#ff9c80' : '#d8d2c0');
      }
      const bub = G.bubbles.get(e.id);
      if (bub) {
        if (now - bub.t > 4500) G.bubbles.delete(e.id);
        else {
          c.font = '12px "Segoe UI", sans-serif'; const w = Math.min(220, c.measureText(bub.v).width + 14), by = sy - 38;
          c.fillStyle = 'rgba(14,18,24,.88)'; c.fillRect(cx - w / 2, by - 11, w, 20); c.strokeStyle = '#324052'; c.lineWidth = 1; c.strokeRect(cx - w / 2 + .5, by - 10.5, w - 1, 19);
          c.fillStyle = '#e8e2d0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(bub.v, cx, by);
        }
      }
    }
    // efectos
    G.proj = G.proj.filter((p) => now - p.t < 230); for (const p of G.proj) drawProj(c, p, now);
    G.flashes = G.flashes.filter((f) => now - f.t < 1100); for (const f of G.flashes) drawFlash(c, f, now);
    G.texts = G.texts.filter((t) => now - t.t < 1000);
    for (const t of G.texts) {
      const a = 1 - (now - t.t) / 1000;
      c.globalAlpha = Math.min(1, a * 1.6);
      outlined(c, t.v, sxOf(t.x) + TS / 2 + t.dx * (1 - a), syOf(t.y) - 4 - (1 - a) * 30, TXT_COL[t.c] || '#fff', 'bold 14px "Segoe UI", sans-serif');
      c.globalAlpha = 1;
    }
    // oscuridad en mazmorras
    const zk = zoneAt(G.me.x, G.me.y).kind;
    if (zk === 'dungeon') {
      const px = (tx - G.cam.x) * TS + cw / 2, py = (ty - G.cam.y) * TS + ch / 2;
      const g = c.createRadialGradient(px, py, 70, px, py, Math.max(cw, ch) * 0.62);
      g.addColorStop(0, 'rgba(4,5,9,0)'); g.addColorStop(0.55, 'rgba(4,5,9,.72)'); g.addColorStop(1, 'rgba(4,5,9,.94)');
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    walkTick(now);
  }

  /* ======================================================================
   *  CONTROLES
   * ==================================================================== */
  const held = new Set();
  const KEYDIR = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  const chatIn = $('#chatIn');
  const typing = () => document.activeElement === chatIn;

  window.addEventListener('keydown', (ev) => {
    if (!joined) return;
    const k = ev.key.toLowerCase();
    if (typing()) {
      if (k === 'enter') { const t = chatIn.value.trim(); if (t) send({ t: 'chat', text: t }); chatIn.value = ''; chatIn.blur(); }
      else if (k === 'escape') chatIn.blur();
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (k === 'enter') { ev.preventDefault(); chatIn.focus(); return; }
    if (k === 'escape') { if (G.shopOpen) closeShop(); else { send({ t: 'target', id: null }); G.path = []; } return; }
    if (KEYDIR[k]) { ev.preventDefault(); held.add(k); G.path = []; return; }
    if (k === 'z') send({ t: 'style', s: 'melee' });
    else if (k === 'x') send({ t: 'style', s: 'ranged' });
    else if (k === 'c') send({ t: 'style', s: 'magic' });
    else if (k === 'h') send({ t: 'potion', k: 'heal' });
    else if (k === 'j') send({ t: 'potion', k: 'mana' });
    else if (k === 'v') send({ t: 'spell' });
    else if (k === 'e' || k === ' ') { ev.preventDefault(); send({ t: 'pickup' }); }
  });
  window.addEventListener('keyup', (ev) => { held.delete(ev.key.toLowerCase()); });
  window.addEventListener('blur', () => held.clear());

  let wasMoving = false;
  setInterval(() => {
    if (!joined) return;
    let dx = 0, dy = 0;
    for (const k of held) { dx += KEYDIR[k][0]; dy += KEYDIR[k][1]; }
    dx = Math.sign(dx); dy = Math.sign(dy);
    if (dx || dy) { send({ t: 'move', dx, dy }); wasMoving = true; }
    else if (wasMoving) { send({ t: 'move', dx: 0, dy: 0 }); wasMoving = false; }
  }, 80);

  document.querySelectorAll('#hotbar button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.style) send({ t: 'style', s: b.dataset.style });
    else if (b.dataset.pot) send({ t: 'potion', k: b.dataset.pot });
    else if (b.dataset.spell) send({ t: 'spell' });
  }));

  /* ---- clic en el mapa: atacar, hablar o caminar ---- */
  const tileAt = (ev) => {
    const r = cv.getBoundingClientRect();
    return { x: Math.round((ev.clientX - r.left - cw / 2) / TS + G.cam.x), y: Math.round((ev.clientY - r.top - ch / 2) / TS + G.cam.y) };
  };
  const entAtTile = (t) => {
    let best = null;
    for (const e of G.ents.values()) if (e.id !== G.id && Math.round(e.x) === t.x && Math.round(e.y) === t.y) best = e;
    return best;
  };
  cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
  cv.addEventListener('mousemove', (ev) => {
    if (!G.me) return;
    const t = tileAt(ev);
    cv.style.cursor = entAtTile(t) ? 'crosshair' : G.npcs.some((n) => n.x === t.x && n.y === t.y) ? 'help' : 'default';
  });
  cv.addEventListener('mousedown', (ev) => {
    if (!G.me) return;
    if (typing()) chatIn.blur();
    const t = tileAt(ev);
    const e = entAtTile(t);
    if (e) { send({ t: 'target', id: e.id }); G.path = []; return; }
    const n = G.npcs.find((q) => q.x === t.x && q.y === t.y);
    if (n) { send({ t: 'npc', id: n.id }); return; }
    send({ t: 'target', id: null });
    walkTo(t.x, t.y);
  });

  const BLOCK = new Set([TILE.WATER, TILE.TREE, TILE.WALL, TILE.ROCK]);
  function walkable(x, y) { return x >= 0 && y >= 0 && x < G.W && y < G.H && !BLOCK.has(G.tiles[y * G.W + x]) && !G.npcTiles.has(y * G.W + x); }
  function walkTo(gx, gy) {
    if (!walkable(gx, gy)) return;
    const sx = G.me.x, sy = G.me.y;
    const occ = new Set(); for (const e of G.ents.values()) if (e.kind === 'mo') occ.add(Math.round(e.y) * G.W + Math.round(e.x));
    const start = sy * G.W + sx, goal = gy * G.W + gx;
    const prev = new Map([[start, -1]]), q = [start];
    for (let i = 0; i < q.length && i < 6000; i++) {
      const k = q[i]; if (k === goal) break;
      const x = k % G.W, y = (k / G.W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy, nk = ny * G.W + nx;
        if (prev.has(nk) || !walkable(nx, ny) || occ.has(nk)) continue;
        if (dx && dy && (!walkable(x + dx, y) || !walkable(x, y + dy))) continue;      // sin cortar esquinas
        if (G.tiles[nk] === TILE.PORTAL && nk !== goal) continue;
        prev.set(nk, k); q.push(nk);
      }
    }
    if (!prev.has(goal)) { addChat({ n: '', m: 'No hay camino hasta ahí.', k: 's' }); return; }
    const path = []; for (let k = goal; k !== start; k = prev.get(k)) path.push({ x: k % G.W, y: (k / G.W) | 0 });
    G.path = path.reverse(); G.pathStuck = performance.now();
  }
  let nextWalk = 0;
  function walkTick(now) {
    if (!G.path.length || now < nextWalk || !G.me) return;
    nextWalk = now + 70;
    const nx = G.path[0], m = G.me;
    if (m.x === nx.x && m.y === nx.y) { G.path.shift(); G.pathStuck = now; return; }
    if (Math.max(Math.abs(m.x - nx.x), Math.abs(m.y - nx.y)) > 1 || now - G.pathStuck > 1500) { G.path = []; return; }
    send({ t: 'move', dx: nx.x - m.x, dy: nx.y - m.y, once: true });
  }
})();
