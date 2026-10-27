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
  if (location.hash === '#debug') { window.__eld = G; G.renderInv = () => renderInv(); G.openShop = (m) => openShop(m); }
  let ws = null, joined = false, wantMode = 'login';
  /* Ganchos para los módulos extra (audio, clima, táctil, misiones, social...) */
  const HK = { msg: [], fx: [], snap: [], draw: [], under: [], click: [], key: [], chat: [], inv: [], stats: [], ctx: [] };
  const EXT = (window.EldExt = {
    G, el, $, store, joy: { dx: 0, dy: 0 }, handlers: {},
    on(n, f) { HK[n].push(f); },
    msg(m) { for (const f of HK.msg) f(m); }, fx(f) { for (const h of HK.fx) h(f); }, snap(m) { for (const f of HK.snap) f(m); },
    draw(c, now, cw, ch, dt, tx, ty) { for (const f of HK.draw) f(c, now, cw, ch, dt, tx, ty); },
    under(c, now, cw, ch) { for (const f of HK.under) f(c, now, cw, ch); }, click(t, ev) { return HK.click.some((f) => f(t, ev)); },
    ctx(t) { for (const f of HK.ctx) { const r = f(t); if (r) return r; } return null; },
    key(k, ev) { return HK.key.some((f) => f(k, ev)); }, chat(m) { for (const f of HK.chat) f(m); },
    inv(m) { for (const f of HK.inv) f(m); }, stats(m) { for (const f of HK.stats) f(m); },
  });

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
  EXT.send = send;

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
      case 'inv': G.inv = m.inv; G.eq = m.eq; G.gold = m.gold; G.bankGold = m.bankGold; renderInv(); EXT.inv(m); break;
      case 'bank': openBank(m); break;
      case 'trade': openTrade(m); break;
      case 'trade_inv': onTradeInvite(m); break;
      case 'trade_end': closeTrade(m.done); break;
      case 'stats': G.stats = m; renderStats(); renderGemSum(); EXT.stats(m); break;
      case 's': onSnapshot(m); break;
      case 'chat': addChat(m); break;
      case 'shop': openShop(m); break;
      case 'dead': onDead(m); break;
      case 'xauth': if (EXT.handlers.xauth) EXT.handlers.xauth(m); break;
      case 'err':
        if (!joined) $('#loginErr').textContent = m.msg;
        else addChat({ n: '', m: m.msg, k: 'k' });
        break;
      default: if (EXT.handlers[m.t]) EXT.handlers[m.t](m); EXT.msg(m); break;
    }
  }

  function onWelcome(m) {
    joined = true;
    G.id = m.id; G.W = m.w; G.H = m.h; G.zones = m.zones; G.portals = m.portals; G.npcs = m.npcs; G.items = m.items; G.mons = m.mons; G.cfg = m.cfg; G.rar = m.rar; G.gems = m.gems;
    for (const [iid, idf] of Object.entries(m.items)) if (idf.el) WEAPON_ELEM[iid] = idf.el;
    const CH = '0123456789abcdefghijklmnopqrstuvwxy';
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

  const zoneAt = EXT.zoneAt = (x, y) => (x < 0 || y < 0 || x >= G.W || y >= G.H ? G.zones[G.zones.length - 1] : G.zones[G.zoneGrid[y * G.W + x]]);

  // velocidad constante: la fija el servidor (un paso cada cfg.step ms / cada def.move ms para monstruos)
  const speedOf = (e) => (e.kind === 'pl' ? 1000 / ((G.cfg.step || 230) * ((e.mt && G.items[e.mt] && G.items[e.mt].speed) || 1)) : 1000 / ((G.mons[e.t] || {}).move || 600));

  function onSnapshot(m) {
    const seen = new Set();
    for (const p of m.pl) {
      seen.add(p.i);
      let e = G.ents.get(p.i);
      if (!e) { e = { kind: 'pl', id: p.i, rx: p.x, ry: p.y }; G.ents.set(p.i, e); }
      Object.assign(e, { n: p.n, x: p.x, y: p.y, h: p.h, H: p.H, l: p.l, c: p.c, s: p.s, d: p.d, k: p.k, o: p.o, v: p.v || 0, a: p.a || 0, tr: p.t, q: p.q, tt: p.tt || '', gl: p.gl || '', pt: p.pt || '', mt: p.mt || '' });
    }
    for (const q of m.mo) {
      seen.add(q.i);
      let e = G.ents.get(q.i);
      if (!e) { e = { kind: 'mo', id: q.i, rx: q.x, ry: q.y }; G.ents.set(q.i, e); }
      Object.assign(e, { t: q.t, x: q.x, y: q.y, h: q.h, H: q.H });
    }
    for (const id of [...G.ents.keys()]) if (!seen.has(id) && !(G.keep && id >= 7000)) G.ents.delete(id);
    G.me = m.me; G.ground = m.gi; G.nodes = m.nd || [];
    if (G.me) {                                            // se cierran solos al alejarte del PNJ
      const far = (kind) => !G.npcs.some((n) => (kind === 'bank' ? n.type === 'bank' : n.type === 'shop') && Math.max(Math.abs(n.x - G.me.x), Math.abs(n.y - G.me.y)) <= 4);
      if (G.bankOpen && far('bank')) closeBank();
      if (G.shopOpen && far('shop')) closeShop();
    }
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
    EXT.snap(m);
  }

  /* ---------------- efectos de combate: partículas, proyectiles, hechizos ---------------- */
  const ELEM = {
    fire: ['255,242,192', '240,138,46', '216,53,15'], ice: ['234,248,255', '127,208,245', '58,123,213'],
    arcane: ['255,255,255', '199,155,255', '106,58,216'], void: ['232,200,255', '138,58,216', '42,10,64'],
    storm: ['255,255,192', '255,225,74', '74,138,255'], poison: ['232,255,192', '143,208,74', '58,122,42'],
    dark: ['190,120,255', '95,40,150', '14,5,24'],
    sun: ['255,250,210', '255,205,80', '214,140,30'], water: ['225,252,255', '70,200,225', '25,110,170'], stone: ['236,230,220', '165,155,145', '95,90,85'], magic: ['232,244,255', '134,193,234', '90,90,216'],
  };
  const WEAPON_ELEM = {
    baston_fuego: 'fire', arco_dragon: 'fire', arco_sol: 'sun', colmillo_hidra: 'poison',
    baston_hielo: 'ice', hacha_hielo: 'ice', arco_glacial: 'ice', baston_escarcha: 'ice', espada_reina: 'ice', baculo_reina: 'ice', arco_reina: 'ice',
    baston_arcano: 'arcane', baston_cristal: 'arcane', arco_celestial: 'arcane', arco_marfil: 'arcane', espada_dorada: 'sun',
    baston_abismo: 'void', mandoble_runico: 'arcane', baston_tormenta: 'storm', baston_pantano: 'poison',
    cetro_faraon: 'sun', hoja_faraon: 'sun', cimitarra_desierto: 'sun',
  };
  G.swings = new Map();                                      // golpes cuerpo a cuerpo en curso (por id de jugador)
  const SWING_MS = 320;
  const HEAVY = new Set(['titan_martillo', 'hacha_acero', 'mandoble_runico', 'martillo_titan', 'maza_enana', 'hacha_hielo', 'colmillo_hidra', 'fuego_mandoble']);
  const elemOf = (f) => (f.s === 'fire' || f.s === 'ice' ? f.s : WEAPON_ELEM[f.w] || (f.s === 'magic' ? 'magic' : null));
  G.parts = []; G.rings = []; G.bolts = []; G.casts = []; G.shake = { t: 0, m: 0 };

  function burst(x, y, el, n, o = {}) {
    const pal = ELEM[el] || ['255,255,255', '220,220,220', '160,160,160'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = (o.sp || 3) * (0.3 + Math.random() * 0.9);
      G.parts.push({ x, y, vx: Math.cos(a) * sp * (o.fx || 1), vy: Math.sin(a) * sp - (o.up || 0), g: o.g || 0, life: 0, max: (o.life || 0.5) * (0.6 + Math.random() * 0.8), s: (o.size || 2.2) * (0.6 + Math.random() * 0.9), c: pal[(Math.random() * 3) | 0], add: o.add !== false, sq: !!o.sq });
    }
  }
  const ring = (x, y, el, max = 460, r = 26, w = 3) => G.rings.push({ x, y, t: performance.now(), col: (ELEM[el] || ELEM.magic)[1], max, r, w });

  function impact(p, now) {
    const el = p.el, x = p.x2, y = p.y2;
    if (el) {
      burst(x, y, el, 16, { sp: 4, life: 0.55, size: 2.6 });
      ring(x, y, el, 420, 22);
      if (el === 'fire') burst(x, y, 'fire', 8, { sp: 1.6, up: 2.6, life: 0.7, size: 3.4 });
      if (el === 'ice') burst(x, y, 'ice', 10, { sp: 3.2, g: 7, life: 0.7, size: 3, sq: true });
      if (el === 'poison') burst(x, y, 'poison', 8, { sp: 1.2, up: 1.6, life: 0.9, size: 3.6 });
      if (el === 'void') { ring(x, y, 'void', 600, 30, 4); }
    } else {
      burst(x, y, null, 7, { sp: 2.6, g: 6, life: 0.35, size: 1.8, add: false });             // astillas de la flecha
    }
    if (p.cr) { burst(x, y, 'sun', 22, { sp: 6, life: 0.7, size: 3 }); ring(x, y, 'sun', 520, 38, 4); G.shake = { t: now, m: 4 }; }
  }

  function addFx(f, now) {
    EXT.fx(f);
    switch (f.k) {
      case 'd': G.texts.push({ x: f.x, y: f.y, v: String(f.v), c: f.c, t: now, dx: (Math.random() - 0.5) * 14, big: f.v === '¡CRÍTICO!' }); break;
      case 'p': {
        const el = elemOf(f), dist = Math.hypot(f.x2 - f.x1, f.y2 - f.y1), T = Math.min(430, 140 + dist * 42);
        G.proj.push({ x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, s: f.s, el, T, t: now, cr: f.cr, hit: false, acc: 0 });
        const casty = f.s === 'magic' || f.s === 'fire' || f.s === 'ice';
        if (casty) { G.casts.push({ x: f.x1, y: f.y1, el: el || 'magic', t: now }); burst(f.x1, f.y1 - 0.2, el || 'magic', 6, { sp: 1.8, up: 1.2, life: 0.4 }); }
        if (el === 'storm') {                                                    // rayo instantáneo
          const pts = [], n = 9;
          for (let i = 0; i <= n; i++) { const k = i / n, j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 0.7; pts.push([f.x1 + (f.x2 - f.x1) * k + j, f.y1 + (f.y2 - f.y1) * k + (Math.random() - 0.5) * 0.7 * (i % 2 ? 1 : -1)]); }
          G.bolts.push({ pts, t: now }); G.proj[G.proj.length - 1].T = 90;
        }
        break;
      }
      case 's': {
        { const wd = f.w && G.items[f.w], kd = wd ? wKind(f.w, wd) : 'fist'; if (f.i != null) G.swings.set(f.i, { t: now, w: f.w, kd, cr: !!f.cr });
          if (kd === 'hammer' || kd === 'mace' || HEAVY.has(f.w)) { ring(f.x, f.y, 'dark', 420, 30, 4); burst(f.x, f.y, 'dark', 10, { sp: 3.5, up: 2, g: 6, life: 0.5, size: 2.6, add: false }); G.shake = { t: now, m: f.cr ? 6 : 3 }; }
          else if (kd === 'axe' || kd === 'daxe' || kd === 'great') { burst(f.x, f.y, WEAPON_ELEM[f.w] || null, 10, { sp: 5, g: 3, life: 0.4, size: 2.4 }); G.shake = { t: now, m: 2 }; } }
        G.flashes.push({ k: 's', x: f.x, y: f.y, t: now, el: WEAPON_ELEM[f.w] || null, heavy: HEAVY.has(f.w), cr: f.cr, ang: Math.random() * 0.8 - 0.4 });
        burst(f.x, f.y, WEAPON_ELEM[f.w] || null, f.cr ? 18 : 8, { sp: 4, g: 5, life: 0.35, size: 2 });
        if (f.cr) { burst(f.x, f.y, 'sun', 16, { sp: 6, life: 0.6, size: 3 }); ring(f.x, f.y, 'sun', 520, 38, 4); G.shake = { t: now, m: 4 }; }
        break;
      }
      case 'x': G.flashes.push({ k: 'x', x: f.x, y: f.y, t: now }); burst(f.x, f.y, null, 10, { sp: 3, life: 0.5, size: 2.2, add: false }); break;
      case 'l': G.flashes.push({ k: 'l', x: f.x, y: f.y, t: now }); burst(f.x, f.y, 'sun', 30, { sp: 3, up: 4, life: 1.1, size: 2.6, fx: 0.5 }); ring(f.x, f.y, 'sun', 900, 40, 4); break;
      case 'h': G.flashes.push({ k: 'h', x: f.x, y: f.y, t: now }); burst(f.x, f.y, 'poison', 14, { sp: 1.3, up: 3.2, life: 0.9, size: 2.4, fx: 0.7 }); ring(f.x, f.y, 'poison', 650, 24); break;
      case 'c': G.bubbles.set(f.i, { v: f.v, t: now }); break;
      default: break;
    }
  }

  G.addFx = addFx;

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
      const b = el('b', '', m.k === 'g' ? `[Global] ${m.n}: ` : m.k === 'pt' ? `[Grupo] ${m.n}: ` : m.k === 'gc' ? `[Gremio] ${m.n}: ` : `${m.n}: `);
      p.append(b, document.createTextNode(m.m));
    } else p.textContent = m.m;
    if (m.c) p.style.color = m.c;
    log.append(p);
    EXT.chat(m);
    while (log.children.length > 120) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
    if (!$('#chat').classList.contains('closed')) return;
    if (m.n || m.k === 'g') { unread++; const u = $('#chatUnread'); u.textContent = unread > 99 ? '99+' : unread; u.hidden = false; }
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

  const fishRow = () => { const f = G.fish; return f ? [f.lv, f.xp, f.lo, f.hi > f.lo ? f.hi : f.lo + 1] : [1, 0, 0, 1]; };
  function renderStats() {
    const s = G.stats; if (!s) return;
    const me = G.ents.get(G.id);
    $('#cname').textContent = me ? me.n : '';
    $('#clv').textContent = s.lv;
    $('#bxp').style.width = pct(s.xp - s.xpLo, s.xpHi - s.xpLo);
    $('#txpTxt').textContent = `${fmt(s.xp - s.xpLo)} / ${fmt(s.xpHi - s.xpLo)}`;
    $('#gold').textContent = fmt(s.gold); $('#defTxt').textContent = `Defensa ${s.def}`;
    document.querySelectorAll('#skills li').forEach((li) => {
      const k = li.dataset.sk, [lv, xp, lo, hi] = k === 'fish' ? fishRow() : s.sk[k];
      li.querySelector('b').textContent = lv;
      li.querySelector('.bar i').style.width = pct(xp - lo, hi - lo);
      li.classList.toggle('on', s.style === k);
      if (k === 'fish') li.querySelector('.bar i').style.width = pct(Math.min(xp, hi) - lo, hi - lo);
    });
    document.querySelectorAll('#hotbar [data-style]').forEach((b) => b.classList.toggle('on', s.style === b.dataset.style));
    updateHud();
  }

  /* ---------- objetos: nombre, color de rareza y tooltip ----------
   * Objeto empaquetado: [id, qty]  o  equipo [id, 1, +N, ancient, nRanuras, gemas[], poder]  */
  const GEAR = new Set(['weapon', 'head', 'body', 'shield', 'amulet', 'ring', 'belt', 'gloves', 'legs', 'boots']);
  const ALL_SLOTS = ['weapon', 'head', 'body', 'shield', 'amulet', 'ring1', 'ring2', 'belt', 'gloves', 'legs', 'boots'];
  const bonusTxt = (b) => { const o = []; if (b.atk) o.push(`+${b.atk} ataque`); if (b.def) o.push(`+${b.def} defensa`); if (b.hp) o.push(`+${b.hp} vida`); if (b.mana) o.push(`+${b.mana} maná`); if (b.crit) o.push(`${Math.round(b.crit * 100)}% crítico`); if (b.steal) o.push(`${Math.round(b.steal * 100)}% robo de vida`); return o.join(' · '); };
  const isGear = (id) => !!G.items[id] && GEAR.has(G.items[id].type);
  const TYPE_NAME = { weapon: 'Arma', head: 'Casco', body: 'Armadura', shield: 'Escudo', amulet: 'Amuleto', ring: 'Anillo', belt: 'Cinto', gloves: 'Guantes', legs: 'Grebas', boots: 'Botas', pet: 'Mascota', mount: 'Montura', gem: 'Gema', consumable: 'Consumible', misc: 'Trofeo' };
  const itName = (it) => {
    const d = G.items[it[0]]; if (!d) return String(it[0]);
    return isGear(it[0]) ? `${it[3] ? 'Ancient ' : ''}${d.name}${it[2] > 0 ? ' +' + it[2] : ''}` : d.name;
  };
  const rarOf = (it) => (isGear(it[0]) ? (it[3] ? 'ancient' : it[2] > 0 ? 'plus' : 'normal') : (G.items[it[0]] && G.items[it[0]].type === 'gem' ? 'gem' : 'none'));
  const itColor = (it) => { const r = rarOf(it); return r === 'gem' ? G.items[it[0]].col : (G.rar[r] || G.rar.none); };
  const sellOf = (it) => {
    const d = G.items[it[0]]; if (!d || !d.sell) return 0;
    return isGear(it[0]) ? Math.round(d.sell * (1 + 0.35 * (it[2] || 0)) * (it[3] ? 6 : 1)) : d.sell;
  };
  const freeSockets = (it) => (it && it[5] ? it[5].filter((g) => !g).length : 0);
  const secs = (ms) => (ms >= 60000 ? `${Math.round(ms / 60000)} min` : `${Math.round(ms / 1000)} s`);

  const tipEl = $('#tip');
  function tipNode(it) {
    const d = G.items[it[0]], box = el('div');
    const n = el('div', 'tn', itName(it)); n.style.color = itColor(it); box.append(n);
    const gear = isGear(it[0]);
    let sub = TYPE_NAME[d.type] || '';
    if (d.type === 'weapon') sub += ' · ' + STYLE_NAME[d.style];
    if (gear) sub += it[3] ? ' · Ancient' : it[2] > 0 ? ' · Excelente +' + it[2] : ' · Normal';
    box.append(el('div', 'ts', sub));
    if (d.type === 'weapon') box.append(el('div', 'tl', `Ataque ${it[6] != null ? it[6] : d.atk} · alcance ${d.range} · cada ${(d.cd / 1000).toFixed(2)} s${d.mana ? ` · ${d.mana} de maná` : ''}`));
    else if (d.type === 'ring' || d.type === 'amulet') box.append(el('div', 'tl', bonusTxt(it[7] || d.bonus || {})));
    else if (gear) { box.append(el('div', 'tl', `Defensa ${it[6] != null ? it[6] : d.def}`)); const bt = it[7] || d.bonus; if (bt) { const b2 = el('div', 'tl', bonusTxt(bt)); b2.style.color = '#8fd0ff'; box.append(b2); } }
    else if (d.type === 'consumable') box.append(el('div', 'tl', d.buff ? d.desc : d.heal ? `Cura ${d.heal} de vida` : `Restaura ${d.restore} de maná`));
    else if (d.type === 'pet' || d.type === 'mount') { box.append(el('div', 'tl', d.desc)); box.append(el('div', 'ts', d.type === 'mount' && d.minLevel > 1 ? `Nivel ${d.minLevel} · clic para montar` : 'Clic para invocar o guardar')); }
    else if (d.type === 'gem') box.append(el('div', 'tl', d.desc));
    if (gear) {
      box.append(el('div', 'tsep'));
      if (it[4] > 0) {
        for (let i = 0; i < it[4]; i++) {
          const g = it[5][i], row = el('div', 'gm');
          if (g) { const gd = G.items[g], sp = el('span', '', `${gd.icon} ${gd.name}`); sp.style.color = gd.col; row.append(sp, el('span', 'ts', '— ' + gd.desc)); }
          else row.append(el('span', 'free', '◇ Ranura libre'));
          box.append(row);
        }
      } else box.append(el('div', 'free', 'Sin ranuras'));
    }
    if (d.minLevel > 1) box.append(el('div', 'tl' + (G.stats && G.stats.lv < d.minLevel ? ' bad' : ''), `Requiere nivel ${d.minLevel}`));
    const sv = sellOf(it); if (sv) box.append(el('div', 'ts tl', `Vale ${fmt(sv)} de oro${it[1] > 1 ? ' c/u' : ''}`));
    return box;
  }
  function moveTip(ev) {
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > innerHeight - 8) y = innerHeight - h - 8;
    tipEl.style.left = Math.max(4, x) + 'px'; tipEl.style.top = Math.max(4, y) + 'px';
  }
  const hideTip = () => { tipEl.hidden = true; };
  function withTip(node, getIt) {
    node.addEventListener('mouseenter', (ev) => { const it = getIt(); if (it) { tipEl.replaceChildren(tipNode(it)); tipEl.hidden = false; moveTip(ev); } });
    node.addEventListener('mousemove', (ev) => { if (!tipEl.hidden) moveTip(ev); });
    node.addEventListener('mouseleave', hideTip);
  }

  function fillSlot(node, it) {
    node.replaceChildren();
    node.classList.remove('r-plus', 'r-ancient', 'r-gem', 'locked');
    node.classList.toggle('empty', !it);
    node._it = it || null;
    if (!it) return;
    const d = G.items[it[0]];
    node.append(iconNode(it[0]));
    if (it[1] > 1) node.append(el('span', 'q', String(it[1])));
    const r = rarOf(it);
    if (r === 'plus' || r === 'ancient' || r === 'gem') node.classList.add('r-' + r);
    if (isGear(it[0])) {
      if (it[2] > 0 || it[3]) { const u = el('span', 'up', it[3] ? 'A' + (it[2] > 0 ? '+' + it[2] : '') : '+' + it[2]); u.style.color = itColor(it); node.append(u); }
      if (it[4] > 0) {
        const pips = el('span', 'pips');
        for (let i = 0; i < it[4]; i++) { const p = el('i', 'pip' + (it[5][i] ? ' on' : '')); if (it[5][i]) p.style.background = G.items[it[5][i]].col; pips.append(p); }
        node.append(pips);
      }
    }
    if (G.stats && (d.minLevel || 1) > G.stats.lv) node.classList.add('locked');
  }
  function mkSlot(it, onClick, onCtx) {
    const s = el('div', 'slot empty'); fillSlot(s, it);
    withTip(s, () => s._it);
    if (onClick) s.addEventListener('click', onClick);
    if (onCtx) s.addEventListener('contextmenu', (ev) => { ev.preventDefault(); onCtx(ev); });
    return s;
  }

  /* ---------- menú contextual ---------- */
  const ctxEl = $('#ctx');
  function closeCtx() { ctxEl.hidden = true; ctxEl.replaceChildren(); }
  function openCtx(ev, rows) {
    hideTip(); ctxEl.replaceChildren();
    for (const r of rows) {
      if (r === '-') { ctxEl.append(el('hr')); continue; }
      if (r.hdr) { const h = el('div', 'hdr', r.hdr); if (r.color) h.style.color = r.color; ctxEl.append(h); continue; }
      const b = el('button', '', r.label); b.type = 'button'; b.setAttribute('role', 'menuitem');
      if (r.color) b.style.color = r.color;
      if (r.off) b.disabled = true;
      b.addEventListener('click', () => { closeCtx(); if (r.fn) r.fn(); });
      ctxEl.append(b);
    }
    ctxEl.hidden = false;
    const w = ctxEl.offsetWidth, h = ctxEl.offsetHeight;
    ctxEl.style.left = Math.max(4, Math.min(ev.clientX, innerWidth - w - 6)) + 'px';
    ctxEl.style.top = Math.max(4, Math.min(ev.clientY, innerHeight - h - 6)) + 'px';
    const f = ctxEl.querySelector('button:not(:disabled)'); if (f) f.focus();
  }
  document.addEventListener('mousedown', (ev) => { if (!ctxEl.hidden && !ctxEl.contains(ev.target)) closeCtx(); });

  function gemTargets() {
    const out = [];
    for (const s of ALL_SLOTS) { const it = G.eq[s]; if (it && freeSockets(it)) out.push({ from: 'eq', at: s, it, where: 'equipado' }); }
    G.inv.forEach((it, i) => { if (it && isGear(it[0]) && freeSockets(it)) out.push({ from: 'inv', at: i, it, where: 'mochila' }); });
    return out;
  }
  const unsocketRows = (it, from, at) => (it[5] || []).map((g, h) => (g ? { label: `Sacar ${G.items[g].icon} ${G.items[g].name} (${G.cfg.gemCost} 💰)`, color: G.items[g].col, fn: () => send({ t: 'unsocket', from, at, hole: h }) } : null)).filter(Boolean);

  function invMenu(ev, i) {
    const it = G.inv[i], d = G.items[it[0]], rows = [{ hdr: itName(it), color: itColor(it) }];
    if (isGear(it[0])) { rows.push({ label: 'Equipar', fn: () => send({ t: 'use', s: i }) }, ...unsocketRows(it, 'inv', i)); }
    else if (d.type === 'consumable') rows.push({ label: 'Usar', fn: () => send({ t: 'use', s: i }) });
    else if (d.type === 'gem') {
      const tg = gemTargets();
      rows.push({ hdr: 'Engarzar en…' });
      if (!tg.length) rows.push({ label: 'Ningún equipo tiene ranura libre', off: 1 });
      tg.forEach((t) => rows.push({ label: `${itName(t.it)} (${t.where}) · ${freeSockets(t.it)} libre${freeSockets(t.it) > 1 ? 's' : ''}`, color: itColor(t.it), fn: () => send({ t: 'socket', gem: i, from: t.from, at: t.at }) }));
    }
    rows.push('-');
    if (G.bankOpen) rows.push({ label: 'Guardar en el banco', fn: () => send({ t: 'bdep', s: i, q: it[1] }) });
    if (G.trade) rows.push({ label: 'Ofrecer en el comercio', fn: () => send({ t: 'trade_add', s: i, q: it[1] }) });
    if (it[1] > 1) rows.push({ label: 'Soltar 1', fn: () => send({ t: 'drop', s: i, q: 1 }) });
    rows.push({ label: it[1] > 1 ? 'Soltar todo' : 'Soltar al suelo', fn: () => send({ t: 'drop', s: i, q: it[1] }) });
    openCtx(ev, rows);
  }
  function eqMenu(ev, slot) {
    const it = G.eq[slot];
    openCtx(ev, [{ hdr: itName(it), color: itColor(it) }, { label: 'Quitar', fn: () => send({ t: 'unequip', slot }) }, ...unsocketRows(it, 'eq', slot)]);
  }

  /* ---------- inventario y equipo ---------- */
  const EQ_GLYPH = { head: '⛑', weapon: '⚔', body: '👕', shield: '🛡', amulet: '📿', ring1: '💍', ring2: '💍', belt: '🎗', gloves: '🧤', legs: '🦿', boots: '🥾' };
  const EQ_NAME = { head: 'casco', weapon: 'arma', body: 'armadura', shield: 'escudo', amulet: 'amuleto', ring1: 'anillo', ring2: 'anillo', belt: 'cinto', gloves: 'guantes', legs: 'grebas', boots: 'botas' };
  function buildInvGrid() {
    const grid = $('#inv'); grid.replaceChildren();
    for (let i = 0; i < G.cfg.invSize; i++) {
      const s = el('div', 'slot empty'); s.dataset.i = i;
      withTip(s, () => s._it);
      s.addEventListener('click', (ev) => { const it = G.inv[i]; if (!it) return; if (ev.shiftKey) send({ t: 'drop', s: i, q: it[1] }); else send({ t: 'use', s: i }); });
      s.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (G.inv[i]) invMenu(ev, i); });
      // arrastrar y soltar para reorganizar la mochila
      s.addEventListener('dragstart', (ev) => { if (!G.inv[i]) { ev.preventDefault(); return; } hideTip(); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(i)); s.classList.add('dragging'); });
      s.addEventListener('dragend', () => { s.classList.remove('dragging'); grid.querySelectorAll('.dragover').forEach((q) => q.classList.remove('dragover')); });
      s.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; s.classList.add('dragover'); });
      s.addEventListener('dragleave', () => s.classList.remove('dragover'));
      s.addEventListener('drop', (ev) => { ev.preventDefault(); s.classList.remove('dragover'); const a = parseInt(ev.dataTransfer.getData('text/plain'), 10); if (a >= 0 && a !== i) send({ t: 'swap', a, b: i }); });
      grid.append(s);
    }
    document.querySelectorAll('#equip .slot').forEach((s) => {
      withTip(s, () => s._it);
      s.addEventListener('click', () => { if (G.eq[s.dataset.eq]) send({ t: 'unequip', slot: s.dataset.eq }); });
      s.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (G.eq[s.dataset.eq]) eqMenu(ev, s.dataset.eq); });
    });
  }

  function renderInv() {
    if (!$('#inv').children.length) buildInvGrid();
    $('#inv').querySelectorAll('.slot').forEach((s) => { fillSlot(s, G.inv[+s.dataset.i]); s.draggable = !!G.inv[+s.dataset.i]; });
    document.querySelectorAll('#equip .slot').forEach((s) => {
      const it = G.eq[s.dataset.eq]; fillSlot(s, it);
      if (!it) { s.textContent = EQ_GLYPH[s.dataset.eq]; s.title = 'Vacío: ' + EQ_NAME[s.dataset.eq]; } else s.removeAttribute('title');
    });
    $('#gold').textContent = fmt(G.gold);
    const count = (key, food) => G.inv.reduce((n, it) => { const d = it && G.items[it[0]]; return n + (d && d[key] && !!d.food === !!food ? it[1] : 0); }, 0);
    const h = count('heal'), mn = count('restore'), fd = count('heal', true);
    $('#nHeal').textContent = h; $('#nMana').textContent = mn; $('#nFood').textContent = fd;
    document.querySelector('[data-food]').classList.toggle('none', !fd);
    document.querySelector('[data-pot=heal]').classList.toggle('none', !h);
    document.querySelector('[data-pot=mana]').classList.toggle('none', !mn);
    if (G.shopOpen) renderShop();
    if (G.bankOpen) renderBank();
    if (G.trade) renderTrade();
  }

  function renderGemSum() {
    const s = G.stats; if (!s || !s.gb) return;
    const gb = s.gb, parts = [];
    if (gb.atk) parts.push(`+${gb.atk} ataque`);
    if (gb.def) parts.push(`+${gb.def} defensa`);
    if (gb.hp) parts.push(`+${gb.hp} vida`);
    if (gb.mana) parts.push(`+${gb.mana} maná`);
    if (gb.crit) parts.push(`${Math.round(gb.crit * 100)}% crítico`);
    if (gb.steal) parts.push(`${Math.round(gb.steal * 100)}% robo de vida`);
    $('#gemSum').textContent = (parts.length ? 'Gemas: ' + parts.join(' · ') : 'Sin bonus de gemas.') + (s.glow ? ` Brillo del set: ${s.glow}.` : '');
  }

  /* ---------- tienda ---------- */
  let shopStock = [];
  function openShop(m) {
    shopStock = m.stock; G.shopOpen = true;
    $('#shopTitle').textContent = m.npc;
    $('#shop').hidden = false; renderShop(); $('#shopClose').focus();
  }
  function closeShop() { G.shopOpen = false; $('#shop').hidden = true; hideTip(); }
  $('#shopClose').addEventListener('click', closeShop);
  $('#shop').addEventListener('mousedown', (ev) => { if (ev.target === $('#shop')) closeShop(); });

  function itemRow(it, subText, acts) {
    const d = G.items[it[0]], row = el('div', 'item');
    const nm = el('div', 'nm rc-' + (rarOf(it) === 'ancient' ? 'ancient' : rarOf(it) === 'plus' ? 'plus' : rarOf(it) === 'normal' ? 'normal' : ''), itName(it) + (it[1] > 1 ? ' ×' + it[1] : ''));
    if (rarOf(it) === 'gem') nm.style.color = d.col;
    nm.append(el('small', '', subText));
    const ic = el('div', 'ico'); ic.append(iconNode(it[0])); row.append(ic, nm, acts);
    withTip(row, () => it);
    return row;
  }

  function renderShop() {
    $('#shopGold').textContent = fmt(G.gold);
    const buy = $('#buyList'); buy.replaceChildren();
    shopStock.forEach((id) => {
      const d = G.items[id], it = isGear(id) ? [id, 1, 0, 0, 0, [], d.atk || d.def || 0, d.bonus] : [id, 1];
      const acts = el('div', 'acts');
      const b1 = el('button', '', 'Comprar'); b1.disabled = G.gold < d.price;
      b1.addEventListener('click', () => send({ t: 'buy', id, q: 1 }));
      acts.append(b1);
      if (d.stack) { const b10 = el('button', '', '×10'); b10.disabled = G.gold < d.price * 10; b10.addEventListener('click', () => send({ t: 'buy', id, q: 10 })); acts.append(b10); }
      buy.append(itemRow(it, `${fmt(d.price)} de oro${d.minLevel > 1 ? ` · nivel ${d.minLevel}` : ''}${d.atk ? ` · ataque ${d.atk}` : ''}${d.def ? ` · defensa ${d.def}` : ''}${d.bonus ? ' · ' + bonusTxt(d.bonus) : ''}`, acts));
    });
    const sell = $('#sellList'); sell.replaceChildren();
    let any = false;
    G.inv.forEach((it, i) => {
      if (!it || !sellOf(it)) return;
      any = true;
      const acts = el('div', 'acts');
      const b1 = el('button', '', 'Vender'); b1.addEventListener('click', () => send({ t: 'sell', s: i, q: 1 }));
      acts.append(b1);
      if (it[1] > 1) { const ba = el('button', '', 'Todo'); ba.addEventListener('click', () => send({ t: 'sell', s: i, q: it[1] })); acts.append(ba); }
      sell.append(itemRow(it, `${fmt(sellOf(it))} de oro${it[1] > 1 ? ' cada uno' : ''}`, acts));
    });
    if (!any) sell.append(el('p', 'empty-note', 'No llevas nada que el mercader compre.'));
  }

  /* ---------- banco ---------- */
  G.bank = { bank: [], gold: 0, size: 0 };
  function openBank(m) { G.bank = m; G.bankOpen = true; $('#bank').hidden = false; renderBank(); $('#bankClose').focus(); }
  function closeBank() { G.bankOpen = false; $('#bank').hidden = true; hideTip(); }
  $('#bankClose').addEventListener('click', closeBank);
  $('#bank').addEventListener('mousedown', (ev) => { if (ev.target === $('#bank')) closeBank(); });
  function renderBank() {
    if (!G.bankOpen) return;
    const inv = $('#bankInv'); inv.replaceChildren();
    G.inv.forEach((it, i) => inv.append(mkSlot(it, (ev) => { if (it) send({ t: 'bdep', s: i, q: ev.ctrlKey || ev.altKey ? 1 : it[1] }); })));
    const box = $('#bankBox'); box.replaceChildren();
    for (let i = 0; i < G.bank.size; i++) { const it = G.bank.bank[i]; box.append(mkSlot(it, (ev) => { if (it) send({ t: 'bwd', s: i, q: ev.ctrlKey || ev.altKey ? 1 : it[1] }); })); }
    $('#bankHand').textContent = fmt(G.gold); $('#bankGold').textContent = fmt(G.bank.gold);
  }
  const amt = () => Math.max(0, Math.floor(Number($('#bankAmt').value) || 0));
  $('#bankDep').addEventListener('click', () => { send({ t: 'bgold', d: 'dep', q: amt() || G.gold }); $('#bankAmt').value = ''; });
  $('#bankWd').addEventListener('click', () => { send({ t: 'bgold', d: 'wd', q: amt() || G.bank.gold }); $('#bankAmt').value = ''; });

  /* ---------- comercio entre jugadores ---------- */
  G.trade = null;
  function toast(text, buttons, ms) {
    const t = el('div', 'toast'); t.append(el('div', '', text));
    if (buttons) {
      const r = el('div', 'row2');
      buttons.forEach(([label, fn, cls]) => { const b = el('button', cls || 'mini', label); b.type = 'button'; b.addEventListener('click', () => { t.remove(); fn(); }); r.append(b); });
      t.append(r);
    }
    $('#toasts').append(t); setTimeout(() => t.remove(), ms || 20000);
    return t;
  }
  function onTradeInvite(m) {
    toast(`${m.name} quiere comerciar contigo.`, [['Aceptar', () => send({ t: 'trade_acc', id: m.from }), 'mini'], ['Rechazar', () => send({ t: 'trade_no' }), 'mini']], 20000);
  }
  function openTrade(m) {
    const first = !G.trade;
    G.trade = m; $('#trade').hidden = false; renderTrade();
    if (first) { $('#tradeOk').focus(); closeCtx(); }
  }
  function closeTrade(done) {
    const had = !!G.trade;
    G.trade = null; $('#trade').hidden = true; hideTip();
    if (had && done) toast('¡Comercio completado!', null, 3500);
  }
  function offerRow(it, onRemove) {
    const acts = el('div', 'acts');
    if (onRemove) { const x = el('button', 'x', '✕'); x.setAttribute('aria-label', 'Quitar de la oferta'); x.addEventListener('click', onRemove); acts.append(x); }
    return itemRow(it, TYPE_NAME[G.items[it[0]].type] || '', acts);
  }
  function renderTrade() {
    const t = G.trade; if (!t) return;
    $('#tradeTitle').textContent = 'Comercio con ' + t.with.name;
    $('#tradeTheirsTitle').textContent = 'Oferta de ' + t.with.name;
    const mine = $('#tradeMine'); mine.replaceChildren();
    if (!t.me.offer.length) mine.append(el('p', 'empty-note', 'Haz clic en un objeto de tu mochila para ofrecerlo.'));
    t.me.offer.forEach((it, i) => mine.append(offerRow(it, () => send({ t: 'trade_rem', i }))));
    const th = $('#tradeTheirs'); th.replaceChildren();
    if (!t.you.offer.length) th.append(el('p', 'empty-note', 'Todavía no ofrece objetos.'));
    t.you.offer.forEach((it) => th.append(offerRow(it, null)));
    $('#tradeTheirGold').textContent = fmt(t.you.gold);
    if (document.activeElement !== $('#tradeGold')) $('#tradeGold').value = t.me.gold || '';
    const inv = $('#tradeInv'); inv.replaceChildren();
    G.inv.forEach((it, i) => inv.append(mkSlot(it, (ev) => { if (it) send({ t: 'trade_add', s: i, q: ev.ctrlKey || ev.altKey ? 1 : it[1] }); })));
    $('#tradeState').textContent = `Tú: ${t.me.ok ? 'confirmado ✓' : 'sin confirmar'} · ${t.with.name}: ${t.you.ok ? 'confirmó ✓' : 'sin confirmar'}`;
    $('#tradeOk').disabled = t.me.ok;
  }
  $('#tradeGoldSet').addEventListener('click', () => send({ t: 'trade_gold', g: Math.max(0, Math.floor(Number($('#tradeGold').value) || 0)) }));
  $('#tradeOk').addEventListener('click', () => send({ t: 'trade_ok' }));
  $('#tradeNo').addEventListener('click', () => send({ t: 'trade_no' }));
  $('#tradeClose').addEventListener('click', () => send({ t: 'trade_no' }));

  /* ---------- ficha de monstruo y sus drops (clic derecho) ---------- */
  const pctTxt = (p) => (p >= 0.1 ? Math.round(p * 100) + '%' : p >= 0.01 ? (p * 100).toFixed(1) + '%' : p > 0.00005 ? (p * 100).toFixed(2) + '%' : '<0,01%').replace('.', ',');
  // color del nivel del monstruo según lo fuerte que es para ti
  function lvColor(lv) {
    const d = lv - ((G.me && G.me.l) || 1);
    return d <= -10 ? '#9aa7b3' : d <= -3 ? '#7fe08a' : d <= 3 ? '#ffe27a' : d <= 12 ? '#ff9a4a' : d <= 60 ? '#ff5a5a' : '#d070ff';
  }
  function showDrops(type) {
    const d = G.mons[type]; if (!d) return;
    $('#dropIcon').textContent = d.icon; $('#dropTitle').textContent = d.name;
    const b = $('#dropBadge'); b.textContent = d.boss ? 'Jefe' : d.aggro > 0 ? 'Agresivo' : 'Pasivo'; b.className = 'badge' + (d.boss ? ' boss' : '');
    const st = $('#dropStats'); st.replaceChildren();
    const stat = (k, v) => { const x = el('div'); x.append(el('small', '', k), el('b', '', v)); st.append(x); };
    stat('Nivel', fmt(d.lv || 1)); stat('Vida', fmt(d.hp)); stat('Daño', `${d.dmg[0]}–${d.dmg[1]}`); stat('Experiencia', fmt(d.exp));
    stat('Ataque', d.range > 1 ? `a ${d.range} casillas` : 'cuerpo a cuerpo'); stat('Oro', `${d.gold[0]}–${d.gold[1]}`); stat('Reaparece en', secs(d.respawn));
    const list = $('#dropList'); list.replaceChildren();
    const addRow = (icon, name, color, sub, p, rare) => {
      const r = el('div', 'drow' + (rare ? ' rare' : '')), nm = el('div', 'nm');
      const n1 = el('span', '', name); n1.style.color = color; nm.append(n1);
      if (sub) nm.append(el('small', '', sub));
      const pc = el('div', 'pc', pctTxt(p));
      r.append(el('div', 'ico', icon), nm, pc); list.append(r);
    };
    d.loot.slice().sort((a, c) => c[1] - a[1]).forEach(([id, ch, a, c, gear]) => {
      const it = G.items[id]; if (!it) return;
      const qty = a === c ? (a > 1 ? ` ×${a}` : '') : ` ×${a}–${c}`;
      addRow(it.icon, it.name + qty, gear ? G.rar.normal : G.rar.none, gear ? 'Equipo · puede venir +N, Ancient y con ranuras' : TYPE_NAME[it.type] || '', ch, gear && ch < 0.06);
    });
    addRow('💎', 'Gema al azar', '#bfe9ff', 'Rubí, zafiro, esmeralda, topacio… (los jefes y monstruos fuertes sueltan las mejores)', d.gem, d.gem < 0.06 && !d.boss);
    $('#dropNote').textContent = `Por cada muerte: ${pctTxt(d.plus)} de soltar un equipo +N (verde) y ${pctTxt(d.anc)} de soltar uno Ancient (azul). Pasa el ratón por un objeto para ver su detalle.`;
    $('#drops').hidden = false; $('#dropClose').focus();
  }
  const closeDrops = () => { $('#drops').hidden = true; };
  $('#dropClose').addEventListener('click', closeDrops);
  $('#drops').addEventListener('mousedown', (ev) => { if (ev.target === $('#drops')) closeDrops(); });

  /* ======================================================================
   *  TEXTURAS DEL MAPA (generadas por código, estilo píxel)
   * ==================================================================== */
  const TILE = { GRASS: 0, WATER: 1, TREE: 2, ROAD: 3, WALL: 4, DFLOOR: 5, PORTAL: 6, ROCK: 7, FLOWER: 8, SHOP: 9, AFLOOR: 10, SAND: 11, SNOW: 12, SWAMP: 13, DUNE: 14, PALM: 15, PINE: 16, DEADTREE: 17, CACTUS: 18, ICEBLOCK: 19, MFLOOR: 20, PFLOOR: 21, IFLOOR: 22, BOG: 23, HILL: 24, CFLOOR: 25, CWALL: 26, LAVA: 27, ASH: 28, CLOUDF: 29, CLOUDW: 30, WEBF: 31, WEBW: 32, AQF: 33, AQW: 34 };
  const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const mk = (fn) => { const c = document.createElement('canvas'); c.width = c.height = TS; const g = c.getContext('2d'); fn(g); return c; };
  const dot = (g, c, x, y, w = 2, h = 2) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  const trImg = new Image(); let TJ = null;
  const trReady = () => TJ && trImg.complete && trImg.naturalWidth > 0;
  const grass = (v) => mk((g) => {
    if (trReady()) { const f = TJ['grass' + (v % 4)]; g.drawImage(trImg, f[0], f[1], f[2], f[3], 0, 0, TS, TS); return; }
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
  let FG = false;      // true: genera solo la copa/tronco (sin fondo) para poder animarla
  const withGrass = (v, fn) => mk((g) => { if (!FG) g.drawImage(grass(v), 0, 0); fn(g); });
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


  const flat = (base, a, b, seed, n = 22) => (v) => mk((g) => {
    const r = seeded(seed + v); g.fillStyle = base; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < n; i++) dot(g, r() < 0.5 ? a : b, (r() * 16 | 0) * 2, (r() * 16 | 0) * 2);
  });
  const sand = flat('#d6c188', '#e3d29c', '#c4ad72', 1300);
  const snow = flat('#e4ecf3', '#f6fafd', '#c9d8e6', 1400, 18);
  const dune = (v) => mk((g) => { g.drawImage(sand(v), 0, 0); const r = seeded(1500 + v); g.fillStyle = 'rgba(160,120,60,.35)'; for (let i = 0; i < 3; i++) { const y = 4 + i * 10 + (r() * 3 | 0); g.fillRect(2 + (r() * 6 | 0), y, 20 + (r() * 8 | 0), 2); } });
  const swamp = (v) => mk((g) => {
    const r = seeded(1600 + v); g.fillStyle = '#3f5a33'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 14; i++) dot(g, r() < 0.5 ? '#4c6b3c' : '#2f4727', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2);
    g.fillStyle = 'rgba(60,90,50,.9)'; g.beginPath(); g.ellipse(8 + (r() * 14 | 0), 10 + (r() * 12 | 0), 6, 3, 0, 0, 7); g.fill();
    dot(g, '#8fb86a', 6 + (r() * 18 | 0), 4 + (r() * 22 | 0), 3, 2);
  });
  const bog = (f) => mk((g) => {
    g.fillStyle = '#2e4a2a'; g.fillRect(0, 0, TS, TS);
    const r = seeded(77); for (let i = 0; i < 5; i++) dot(g, '#4f7a3b', ((r() * 12 | 0) * 2 + f * 4) % 28, (r() * 15 | 0) * 2, 6, 2);
    dot(g, '#9ac46c', 8 + f * 10, 12, 2, 2); dot(g, '#9ac46c', 22 - f * 8, 22, 2, 2);
  });
  const hill = (v) => mk((g) => {
    g.drawImage(grass(v), 0, 0); g.fillStyle = 'rgba(190,170,70,.22)'; g.fillRect(0, 0, TS, TS);
    const r = seeded(1700 + v); for (let i = 0; i < 6; i++) dot(g, '#c9b14d', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 3);
  });
  const onTile = (bg, v, fn) => mk((g) => { if (!FG) g.drawImage(bg(v), 0, 0); fn(g); });
  const palm = (v) => onTile(sand, v, (g) => {
    dot(g, 'rgba(0,0,0,.2)', 8, 25, 16, 4);
    g.strokeStyle = '#7a5a30'; g.lineWidth = 3; g.beginPath(); g.moveTo(15, 28); g.quadraticCurveTo(19, 18, 16, 9); g.stroke();
    g.strokeStyle = '#2f7d3a'; g.lineWidth = 3;
    [[-11, 3], [-8, -4], [0, -7], [9, -3], [12, 4]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(16, 9); g.quadraticCurveTo(16 + dx / 2, 4 + dy, 16 + dx, 9 + dy + 4); g.stroke(); });
    dot(g, '#6b4a1e', 14, 11, 3, 3);
  });
  const pine = (v) => onTile(snow, v, (g) => {
    dot(g, 'rgba(0,0,0,.2)', 8, 26, 16, 4); dot(g, '#4a3220', 14, 21, 4, 8);
    [[6, 24, 26, '#1f4a35'], [9, 17, 23, '#25573f'], [12, 10, 20, '#2d6a4a']].forEach(([w, y, bw, c]) => { g.fillStyle = c; g.beginPath(); g.moveTo(16, y - 13); g.lineTo(16 + bw / 2 - 1, y); g.lineTo(16 - bw / 2 + 1, y); g.closePath(); g.fill(); });
    g.fillStyle = '#f2f7fb'; g.fillRect(12, 8, 3, 2); g.fillRect(18, 13, 4, 2); g.fillRect(9, 18, 4, 2);
  });
  const dead = (v) => onTile(swamp, v, (g) => {
    dot(g, 'rgba(0,0,0,.25)', 8, 26, 16, 4);
    g.strokeStyle = '#3a2d26'; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 29); g.lineTo(16, 13); g.stroke();
    g.lineWidth = 2; [[16, 20, 8, 12], [16, 16, 25, 9], [16, 13, 11, 5], [16, 11, 21, 4]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  });
  const cactus = (v) => onTile(sand, v, (g) => {
    dot(g, 'rgba(0,0,0,.2)', 8, 26, 16, 4);
    g.fillStyle = '#3f8a45'; g.fillRect(13, 6, 6, 22); g.fillRect(6, 13, 4, 8); g.fillRect(6, 19, 8, 3); g.fillRect(22, 10, 4, 8); g.fillRect(18, 16, 8, 3);
    g.fillStyle = '#5db062'; g.fillRect(14, 6, 2, 22); dot(g, '#e8d9a0', 15, 9, 1, 1); dot(g, '#e8d9a0', 17, 18, 1, 1);
  });
  const ice = (v) => onTile(snow, v, (g) => {
    dot(g, 'rgba(0,0,0,.18)', 6, 25, 20, 4);
    g.fillStyle = '#8fd0f0'; g.beginPath(); g.moveTo(16, 3); g.lineTo(26, 14); g.lineTo(23, 27); g.lineTo(9, 27); g.lineTo(6, 14); g.closePath(); g.fill();
    g.fillStyle = '#c8eefc'; g.beginPath(); g.moveTo(16, 3); g.lineTo(11, 15); g.lineTo(16, 24); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(19, 9, 2, 6);
  });
  const mfloor = (v) => { const r = seeded(1800 + v); return mk((g) => {
    g.fillStyle = '#3a342c'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 14; i++) dot(g, r() < 0.5 ? '#4a4338' : '#2c2721', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 2);
    if (r() < 0.25) dot(g, '#d9b04a', (r() * 14 | 0) * 2 + 2, (r() * 14 | 0) * 2 + 2, 2, 2);
  }); };
  const cfloor = (v) => { const r = seeded(2100 + v); return mk((g) => {
    g.fillStyle = '#2a2833'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 16; i++) dot(g, r() < 0.5 ? '#35323f' : '#1e1c26', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 2);
    if (r() < 0.2) dot(g, '#5a3a6e', (r() * 14 | 0) * 2 + 2, (r() * 14 | 0) * 2 + 2, 2, 2);
  }); };
  const nfloor = (v) => { const r = seeded(2300 + v); return mk((g) => {
    g.fillStyle = '#eef4fb'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 9; i++) { g.fillStyle = r() < 0.5 ? 'rgba(200,220,242,.55)' : 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(r() * 32, r() * 32, 4 + r() * 6, 2 + r() * 4, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 5; i++) dot(g, '#d3e3f4', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 2);
  }); };
  const aqfloor = (v) => { const r = seeded(2700 + v); return mk((g) => {
    g.fillStyle = '#17566e'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 16; i++) dot(g, r() < 0.5 ? '#1d6a84' : '#134a60', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 2);
    g.strokeStyle = 'rgba(150,225,240,.22)'; g.lineWidth = 1;                                   // ondas en el suelo inundado
    for (let i = 0; i < 3; i++) { const yy = 4 + r() * 24, xx = r() * 20; g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + 6, yy - 3, xx + 12, yy); g.quadraticCurveTo(xx + 18, yy + 3, xx + 24, yy); g.stroke(); }
    if (r() < 0.25) dot(g, '#7fe3f2', (r() * 14 | 0) * 2 + 2, (r() * 14 | 0) * 2 + 2, 2, 2);
  }); };
  const aqwall = (v) => { const r = seeded(2800 + v); return mk((g) => {
    g.fillStyle = '#0d2530'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 11; i++) dot(g, r() < 0.5 ? '#14384a' : '#08161e', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 4, 4);
    g.strokeStyle = '#2fb8c8'; g.globalAlpha = 0.55; g.lineWidth = 1.4; g.beginPath();           // vetas de coral luminoso
    let x = r() * 32, y = 0; g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += (r() - 0.5) * 12; y += 7; g.lineTo(x, y); } g.stroke(); g.globalAlpha = 1;
    if (r() < 0.4) { g.fillStyle = '#3fd0b8'; g.fillRect((r() * 14 | 0) * 2, (r() * 14 | 0) * 2, 2, 4); }
  }); };
  const wfloor = (v) => { const r = seeded(2500 + v); return mk((g) => {
    g.fillStyle = '#1d1a22'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 14; i++) dot(g, r() < 0.5 ? '#2a2630' : '#14121a', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 2);
    g.strokeStyle = 'rgba(210,205,200,.28)'; g.lineWidth = 1;                                   // telaraña
    const cx = 4 + r() * 24, cy = 4 + r() * 24; g.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * 1.047 + r() * 0.3; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); }
    for (let rr = 5; rr <= 15; rr += 5) for (let k = 0; k < 6; k++) { const a = k * 1.047, b = a + 1.047; g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); g.lineTo(cx + Math.cos(b) * rr * 0.92, cy + Math.sin(b) * rr * 0.92); }
    g.stroke();
    if (r() < 0.35) dot(g, '#7a2a10', (r() * 14 | 0) * 2 + 2, (r() * 14 | 0) * 2 + 2, 2, 2);        // brasa fría
  }); };
  const wwall = (v) => { const r = seeded(2600 + v); return mk((g) => {
    g.fillStyle = '#17121a'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 10; i++) dot(g, r() < 0.5 ? '#241a26' : '#0f0b12', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 4, 4);
    g.strokeStyle = '#b8420f'; g.lineWidth = 1.5; g.beginPath();                                   // vetas de lava
    let x = r() * 32, y = 0; g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += (r() - 0.5) * 12; y += 7; g.lineTo(x, y); } g.stroke();
    g.strokeStyle = 'rgba(225,220,215,.4)'; g.lineWidth = 1; g.beginPath();                        // hilos de seda
    for (let i = 0; i < 3; i++) { g.moveTo(r() * 32, 0); g.quadraticCurveTo(r() * 32, 16, r() * 32, 32); } g.stroke();
  }); };
  const nwall = (v) => { const r = seeded(2400 + v); return mk((g) => {
    g.fillStyle = '#a9bcd8'; g.fillRect(0, 0, TS, TS);
    const blob = (x, y, rad, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); };
    for (let i = 0; i < 5; i++) blob(r() * 32, r() * 32, 7 + r() * 6, '#c4d3e8');
    for (let i = 0; i < 5; i++) blob(r() * 32, r() * 28, 5 + r() * 5, '#e4edf8');
    for (let i = 0; i < 4; i++) blob(4 + r() * 24, 4 + r() * 20, 2 + r() * 3, '#ffffff');
  }); };
  const lava = (f) => mk((g) => {
    g.fillStyle = '#a21d08'; g.fillRect(0, 0, TS, TS);
    const r = seeded(77);
    for (let i = 0; i < 7; i++) { const x = ((r() * 12 | 0) * 2 + f * 6) % 28, y = (r() * 15 | 0) * 2; dot(g, '#e8590c', x, y, 8, 3); }
    for (let i = 0; i < 4; i++) dot(g, '#ffb02e', ((r() * 13 | 0) * 2 + f * 4) % 28, (r() * 15 | 0) * 2, 4, 2);
    for (let i = 0; i < 3; i++) dot(g, '#5c0f06', (r() * 14 | 0) * 2, (r() * 15 | 0) * 2, 6, 2);
  });
  const ash = (v) => { const r = seeded(2300 + v); return mk((g) => {
    g.fillStyle = '#3b2e2a'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 16; i++) dot(g, r() < 0.5 ? '#4a3a35' : '#2a1f1c', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2, 2, 2);
    if (r() < 0.22) { dot(g, '#e8590c', (r() * 14 | 0) * 2 + 2, (r() * 14 | 0) * 2 + 2, 2, 2); }
    if (r() < 0.1) { g.fillStyle = '#6b2410'; g.fillRect(6, 14, 18, 1); g.fillRect(14, 8, 1, 14); }
  }); };
  const obsid = (v) => { const r = seeded(2400 + v); return mk((g) => {
    g.fillStyle = '#17110f'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#2d2321'; g.beginPath(); g.moveTo(2, 28); g.lineTo(6, 8); g.lineTo(16, 2); g.lineTo(26, 9); g.lineTo(30, 28); g.closePath(); g.fill();
    g.fillStyle = '#3d302c'; g.beginPath(); g.moveTo(6, 8); g.lineTo(16, 2); g.lineTo(14, 16); g.closePath(); g.fill();
    g.fillStyle = '#ff7a1a'; for (let i = 0; i < 3; i++) g.fillRect(8 + (r() * 14 | 0), 10 + i * 6, 2, 4);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 29, TS, 3);
  }); };
  const cwall = (v) => { const r = seeded(2200 + v); return mk((g) => {
    g.fillStyle = '#14121a'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 9; i++) dot(g, r() < 0.5 ? '#201d29' : '#0c0b10', (r() * 14 | 0) * 2, (r() * 14 | 0) * 2, 4, 4);
    g.fillStyle = '#2b2736'; g.fillRect(0, 0, TS, 2);
  }); };
  const pfloor = (v) => { const r = seeded(1900 + v); return mk((g) => {
    g.fillStyle = '#b89a5e'; g.fillRect(0, 0, TS, TS); g.fillStyle = '#9a7f48'; g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS); g.fillRect(16, 0, 1, TS); g.fillRect(0, 16, TS, 1);
    for (let i = 0; i < 8; i++) dot(g, r() < 0.5 ? '#c8ad72' : '#a68a52', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2);
    if (r() < 0.12) { g.fillStyle = '#5a3a1a'; g.fillRect(10, 12, 12, 2); g.fillRect(14, 8, 4, 10); }
  }); };
  const ifloor = (v) => { const r = seeded(2000 + v); return mk((g) => {
    g.fillStyle = '#9fbfd6'; g.fillRect(0, 0, TS, TS); g.fillStyle = '#7fa3bd'; g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS); g.fillRect(16, 0, 1, TS); g.fillRect(0, 16, TS, 1);
    for (let i = 0; i < 9; i++) dot(g, r() < 0.5 ? '#b6d3e6' : '#86aac4', (r() * 16 | 0) * 2, (r() * 16 | 0) * 2);
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(4, 28); g.lineTo(14, 18); g.stroke();
  }); };

  const buildTEX = () => ({
    grass: [0, 1, 2, 3].map(grass), water: [water(0), water(1)],
    tree: [0, 1].map(tree), rock: [0, 1].map(rock),
    flower: [flower(0, '#e86a8a'), flower(1, '#f0d26a'), flower(2, '#b894f0')],
    road: [0, 1, 2].map(road), wall: [0, 1, 2].map(wall),
    dfloor: [0, 1, 2, 3].map(dfloor), afloor: [0, 1, 2, 3].map(afloor), shop: [0, 1].map(shopFloor),
    sand: [0, 1, 2, 3].map(sand), snow: [0, 1, 2, 3].map(snow), dune: [0, 1, 2, 3].map(dune), swamp: [0, 1, 2, 3].map(swamp), bog: [bog(0), bog(1)], hill: [0, 1, 2, 3].map(hill),
    palm: [0, 1].map(palm), pine: [0, 1].map(pine), dead: [0, 1].map(dead), cactus: [0, 1].map(cactus), ice: [0, 1].map(ice),
    mfloor: [0, 1, 2, 3].map(mfloor), pfloor: [0, 1, 2, 3].map(pfloor), ifloor: [0, 1, 2, 3].map(ifloor), cfloor: [0, 1, 2, 3].map(cfloor), lava: [lava(0), lava(1)], wfloor: [0, 1, 2, 3].map(wfloor), aqfloor: [0, 1, 2, 3].map(aqfloor), aqwall: [0, 1, 2].map(aqwall), wwall: [0, 1, 2].map(wwall), nfloor: [0, 1, 2, 3].map(nfloor), nwall: [0, 1, 2].map(nwall), obsid: [0, 1, 2].map(obsid), ash: [0, 1, 2, 3].map(ash), cwall: [0, 1, 2].map(cwall),
  });
  const buildFG = () => { FG = true; const o = { tree: [0, 1].map(tree), palm: [0, 1].map(palm), pine: [0, 1].map(pine), dead: [0, 1].map(dead) }; FG = false; return o; };
  let TEX = buildTEX(), TEXFG = buildFG();
  const FOREST = ['big1', 'big2', 'big3', 'oak', 'round', 'oak', 'big1', 'round', 'grove', 'apple', 'orange', 'blossom', 'big3', 'big2'];
  trImg.onload = () => { if (TJ) { TEX = buildTEX(); TEXFG = buildFG(); } };
  trImg.src = 'trees.png';
  fetch('trees.json').then((r) => r.json()).then((j) => { TJ = j; if (trImg.complete && trImg.naturalWidth) { TEX = buildTEX(); TEXFG = buildFG(); } }).catch(() => {});
  const SWAY = { [TILE.TREE]: ['tree', 'grass', 0.085], [TILE.PALM]: ['palm', 'sand', 0.12], [TILE.PINE]: ['pine', 'snow', 0.055], [TILE.DEADTREE]: ['dead', 'swamp', 0.035] };
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };

  /* ---- árboles nuevos (sprites) y pasto con viento ---- */
  function drawNewTree(c, x, y, t, now) {
    const h = hash(x, y), name = t === TILE.DEADTREE ? 'dead' : FOREST[h % FOREST.length], f = TJ[name]; if (!f) return;
    const sx = sxOf(x), sy = syOf(y), bx = sx + TS / 2, by = sy + TS - 2;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(bx, by - 1, f[2] * 0.3, 4, 0, 0, 7); c.fill();
    const ph = (h % 628) / 100, gust = Math.sin(now / 2300 + x * 0.35 + y * 0.2);
    const k = (Math.sin(now / 780 + ph) * 0.55 + gust * 0.9) * (name === 'dead' ? 0.02 : name === 'grove' ? 0.045 : 0.05);
    c.save(); c.translate(bx, by); c.transform(1, 0, k, 1 + Math.sin(now / 560 + ph) * 0.007, 0, 0);
    c.drawImage(trImg, f[0], f[1], f[2], f[3], -Math.round(f[2] / 2), -f[3], f[2], f[3]); c.restore();
    if (name !== 'dead' && (h & 7) === 0 && now - lastLeaf > 380) { lastLeaf = now; G.leaves.push({ x: x + 0.2 + Math.random() * 0.6, y: y - 0.6 + Math.random() * 0.4, t: now, p: Math.random() * 6 }); }
  }
  function grassBlades(c, x, y, sx, sy, now) {
    const h = hash(x, y), n = 3 + (h & 1), g = Math.sin(now / 2100 + x * 0.4 + y * 0.25);
    c.lineWidth = 1.5; c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? '#7fbf5c' : '#2f6a33'; c.beginPath();
      for (let i = pass; i < n; i += 2) {
        const bx = sx + 4 + ((h >> (i * 3)) % 24), by = sy + 8 + ((h >> (i * 3 + 2)) % 20), bh = 4 + ((h >> i) & 3);
        const sw = Math.sin(now / 600 + i * 1.7 + x + y * 0.7) * 1.3 + g * 2;
        c.moveTo(bx, by); c.quadraticCurveTo(bx + sw * 0.4, by - bh * 0.6, bx + sw, by - bh);
      }
      c.stroke();
    }
    c.lineCap = 'butt';
  }

  /* ---- nubes: bruma que se desplaza, destellos que titilan y nubes que respiran ---- */
  function cloudFloorFx(c, x, y, sx, sy, now) {
    const t = now / 1000, ph = (x * 0.9 + y * 0.6);
    const a = 0.16 + 0.12 * Math.sin(t * 0.8 + ph);
    c.fillStyle = `rgba(190,215,245,${a})`; c.beginPath(); c.ellipse(sx + 16 + Math.sin(t * 0.5 + ph) * 9, sy + 16 + Math.cos(t * 0.4 + ph * 1.3) * 7, 12, 7, 0, 0, 7); c.fill();
    const hs = hash(x * 5 + 1, y * 3 + ((now / 650) | 0));
    if ((hs & 7) === 0) { const px = sx + 3 + (hs >> 4) % 26, py = sy + 3 + (hs >> 9) % 26; c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(px, py, 2, 2); c.fillStyle = 'rgba(255,240,170,.8)'; c.fillRect(px - 1, py + 0.5, 4, 1); c.fillRect(px + 0.5, py - 1, 1, 4); }
  }
  function cloudWallFx(c, x, y, sx, sy, now) {
    const t = now / 1000, ph = (x * 1.3 + y * 0.8);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(sx + 10 + Math.sin(t * 0.7 + ph) * 3, sy + 11, 6 + Math.sin(t * 0.9 + ph) * 1.6, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.arc(sx + 22, sy + 20 + Math.cos(t * 0.8 + ph) * 2, 7 + Math.cos(t * 0.6 + ph) * 1.4, 0, 7); c.fill();
  }

  /* ---- gruta del leviatán: ondas de luz sobre el agua poco profunda y burbujas que suben ---- */
  function aqFloorFx(c, x, y, sx, sy, now) {
    const t = now / 1000, a = 0.08 + 0.08 * Math.sin(t * 1.4 + x * 0.9 + y * 0.7);
    c.fillStyle = `rgba(120,220,240,${a})`; c.fillRect(sx, sy, 32, 32);
    const k = (hash(x * 3 + 1, y * 5) & 3), yy = ((t * 0.6 + k * 0.25 + (x * 0.37 + y * 0.21)) % 1) * 28;
    c.fillStyle = 'rgba(200,245,255,.45)'; c.fillRect(sx + 4 + k * 6, sy + 30 - yy, 12 - k * 2, 1);
    const hs = hash(x + ((now / 600) | 0), y * 7);
    if ((hs & 15) === 0) { const px = sx + 3 + (hs >> 4) % 26, py = sy + 28 - ((now / 30 + (hs >> 3)) % 24); c.fillStyle = 'rgba(210,248,255,.8)'; c.fillRect(px, py, 2, 2); c.fillRect(px + 1, py - 3, 1, 1); }
  }
  function aqWallFx(c, x, y, sx, sy, now) {
    const a = 0.10 + 0.1 * Math.sin(now / 900 + x * 1.3 + y * 0.9);
    c.fillStyle = `rgba(40,200,210,${a})`; c.fillRect(sx, sy, 32, 32);
  }
  /* ---- guarida del aracnídeo: brasas que flotan, lava que late en las vetas y hilos de seda que se mecen ---- */
  function webFloorFx(c, x, y, sx, sy, now) {
    const t = now / 1000, hs = hash(x * 7 + 3, y * 5 + ((now / 700) | 0));
    const a = 0.10 + 0.08 * Math.sin(t * 1.6 + x * 0.8 + y * 0.5);
    c.fillStyle = `rgba(255,90,20,${a})`; c.fillRect(sx, sy, 32, 32);
    if ((hs & 7) === 0) { const px = sx + 3 + (hs >> 4) % 26, py = sy + 30 - ((now / 25 + (hs >> 3)) % 26); c.fillStyle = 'rgba(255,170,60,.95)'; c.fillRect(px, py, 2, 2); c.fillStyle = 'rgba(255,90,20,.6)'; c.fillRect(px, py + 2, 2, 2); }
  }
  function webWallFx(c, x, y, sx, sy, now) {
    const t = now / 1000, a = 0.25 + 0.2 * Math.sin(t * 2.2 + x * 1.3 + y * 0.9);
    c.fillStyle = `rgba(255,80,10,${a * 0.5})`; c.fillRect(sx, sy, 32, 32);
    c.strokeStyle = `rgba(235,230,225,${0.35 + 0.2 * Math.sin(t + x + y)})`; c.lineWidth = 1; c.beginPath();
    c.moveTo(sx + 4, sy); c.quadraticCurveTo(sx + 16 + Math.sin(t * 1.3 + x) * 4, sy + 16, sx + 28, sy + 32); c.stroke();
  }

  /* ---- agua viva: olas que fluyen, destellos y espuma en las orillas ---- */
  let lastLeaf = 0; G.leaves = [];
  function drawWater(c, x, y, sx, sy, now) {
    c.drawImage(TEX.water[0], sx, sy);
    const T = G.tiles, W = G.W;
    for (let k = 0; k < 3; k++) {
      const dir = k === 1 ? -1 : 1, len = 10 + k * 3;
      const px = (((x * 32 + y * 11 * (k + 1) + k * 37 + now * 0.014 * dir) % 64) + 64) % 64 - 16;
      const py = 5 + k * 10 + ((y * 7 + x * 3 + k) % 3);
      const a = 0.14 + 0.22 * Math.max(0, Math.sin(now / 900 + x * 0.9 + y * 0.6 + k * 2));
      if (px > -len && px < TS) { const x0 = Math.max(0, px), x1 = Math.min(TS, px + len); c.fillStyle = `rgba(170,215,240,${a})`; c.fillRect(sx + x0, sy + py, x1 - x0, 2); c.fillStyle = `rgba(20,60,95,${a * 0.9})`; c.fillRect(sx + x0 + 2, sy + py + 2, Math.max(0, x1 - x0 - 3), 1); }
    }
    const hs = hash(x + (now / 520 | 0), y * 3);
    if ((hs & 15) === 0) { c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(sx + (hs >> 5) % 28 + 1, sy + (hs >> 9) % 28 + 1, 2, 2); }
    const wt = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < G.H && T[yy * W + xx] === TILE.WATER;
    const ph = now / 520 + x * 1.7 + y * 1.3;
    c.fillStyle = 'rgba(235,248,255,.55)';
    if (!wt(x, y - 1)) for (let i = 0; i < TS; i += 4) c.fillRect(sx + i, sy, 4, 1.5 + Math.sin(ph + i * 0.4) * 1.2 + 1.2);
    if (!wt(x, y + 1)) for (let i = 0; i < TS; i += 4) c.fillRect(sx + i, sy + TS - 2.5 - Math.sin(ph + i * 0.4 + 2) * 1.2, 4, 2.5 + Math.sin(ph + i * 0.4 + 2) * 1.2);
    if (!wt(x - 1, y)) for (let i = 0; i < TS; i += 4) c.fillRect(sx, sy + i, 1.5 + Math.sin(ph + i * 0.4 + 1) * 1.2 + 1.2, 4);
    if (!wt(x + 1, y)) for (let i = 0; i < TS; i += 4) c.fillRect(sx + TS - 2.5 - Math.sin(ph + i * 0.4 + 3) * 1.2, sy + i, 2.5 + Math.sin(ph + i * 0.4 + 3) * 1.2, 4);
  }
  function drawLeaves(c, now) {
    const L = G.leaves;
    for (let i = L.length - 1; i >= 0; i--) {
      const l = L[i], a = (now - l.t) / 1000;
      if (a > 6) { L.splice(i, 1); continue; }
      const lx = l.x + a * 0.55 + Math.sin(a * 2.2 + l.p) * 0.25, ly = l.y + a * 0.28 + Math.abs(Math.sin(a * 1.4 + l.p)) * 0.1;
      c.globalAlpha = Math.min(1, (6 - a) / 1.5);
      c.fillStyle = (i & 1) ? '#7fb85a' : '#c9b14d';
      c.save(); c.translate(sxOf(lx), syOf(ly)); c.rotate(a * 3 + l.p); c.fillRect(-2, -1, 4, 2); c.restore();
      c.globalAlpha = 1;
    }
    if (L.length > 40) L.splice(0, L.length - 40);
  }

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
      case TILE.SAND: return TEX.sand[h % 4];
      case TILE.SNOW: return TEX.snow[h % 4];
      case TILE.SWAMP: return TEX.swamp[h % 4];
      case TILE.DUNE: return TEX.dune[h % 4];
      case TILE.PALM: return TEX.palm[h % 2];
      case TILE.PINE: return TEX.pine[h % 2];
      case TILE.DEADTREE: return TEX.dead[h % 2];
      case TILE.CACTUS: return TEX.cactus[h % 2];
      case TILE.ICEBLOCK: return TEX.ice[h % 2];
      case TILE.MFLOOR: return TEX.mfloor[h % 4];
      case TILE.PFLOOR: return TEX.pfloor[h % 4];
      case TILE.IFLOOR: return TEX.ifloor[h % 4];
      case TILE.BOG: return TEX.bog[frame];
      case TILE.HILL: return TEX.hill[h % 4];
      case TILE.LAVA: return TEX.lava[frame];
      case TILE.ASH: return TEX.ash[h % 4];
      case TILE.CFLOOR: return TEX.cfloor[h % 4];
      case TILE.CLOUDF: return TEX.nfloor[h % 4];
      case TILE.CLOUDW: return TEX.nwall[h % 3];
      case TILE.WEBF: return TEX.wfloor[h % 4];
      case TILE.WEBW: return TEX.wwall[h % 3];
      case TILE.AQF: return TEX.aqfloor[h % 4];
      case TILE.AQW: return TEX.aqwall[h % 3];
      case TILE.CWALL: return G.zoneGrid && zoneAt(x, y).id === 'volcan' ? TEX.obsid[h % 3] : TEX.cwall[h % 3];
      default: return TEX.grass[0];
    }
  }

  /* ======================================================================
   *  MINIMAPA
   * ==================================================================== */
  const MINI_COL = ['#3f6b3a', '#2b5d8a', '#234a2a', '#8a8271', '#59606e', '#3a3948', '#b07cff', '#77797f', '#3f6b3a', '#7a5634', '#4a2a2e', '#d6c188', '#e4ecf3', '#3f5a33', '#d2b878', '#2f7d3a', '#2d6a4a', '#5a4a3a', '#3f8a45', '#8fd0f0', '#3a342c', '#b89a5e', '#9fbfd6', '#2e4a2a', '#8d9a45', '#2a2833', '#0c0b10', '#d8480a', '#3b2e2a', '#e9f1fa', '#b4c6e0', '#3a2a30', '#241418', '#2a7a96', '#10303c'];
  let miniBase = null;
  function buildMiniBase() {
    const c = document.createElement('canvas'); c.width = G.W; c.height = G.H;
    const g = c.getContext('2d');
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
      g.fillStyle = MINI_COL[G.tiles[y * G.W + x]]; g.fillRect(x, y, 1, 1);
      if (zoneAt(x, y).pvp) { g.fillStyle = 'rgba(212,80,59,.22)'; g.fillRect(x, y, 1, 1); }
    }
    miniBase = c; EXT.miniBase = () => miniBase;
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
    if (G.grave && G.grave.x >= 0) {
      const gx = G.grave.x * sx, gy = G.grave.y * sy; g.strokeStyle = '#000'; g.lineWidth = 4; g.beginPath(); g.moveTo(gx, gy - 6); g.lineTo(gx, gy + 6); g.moveTo(gx - 4, gy - 2); g.lineTo(gx + 4, gy - 2); g.stroke();
      g.strokeStyle = '#ff5a4a'; g.lineWidth = 2; g.stroke();
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

  const shadeCache = {};
  function shade(hex, f) {
    const key = hex + f; if (shadeCache[key]) return shadeCache[key];
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return (shadeCache[key] = `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`);
  }

  /* ---------- equipo visible en el personaje ---------- */
  const MATS = {
    madera: ['#a8763f', '#6b4524'], cuero: ['#8f5d31', '#5f3c1e'], tela: ['#d8c9a0', '#a89870'],
    hierro: ['#aab2bd', '#5b6272'], acero: ['#c8d0da', '#6a7384'], placas: ['#c0c8d2', '#667082'], malla: ['#9aa3ad', '#555d6b'],
    torre: ['#9aa3ad', '#4f5766'], bronce: ['#d99a48', '#8a5a20'], escamas: ['#58b06a', '#2a6a3a'], dragon: ['#d4493a', '#7a1a12'],
    demonio: ['#a82a3a', '#4a0a14'], abismo: ['#7a3ab0', '#2a1244'], hielo: ['#b4e4fa', '#5aa0d0'], escarcha: ['#b4e4fa', '#5aa0d0'],
    reina: ['#cfeeff', '#6aa8d8'], faraon: ['#f0c85a', '#a07820'], dorada: ['#f0c85a', '#a07820'], sol: ['#ffd96a', '#c8901e'],
    titan: ['#9a9da8', '#4d505a'], runico: ['#b6a2ff', '#5a46b0'], llamas: ['#ffb04a', '#c8400f'], sombra: ['#7a7090', '#2a2238'],
    sombras: ['#7a7090', '#2a2238'], enana: ['#a89070', '#5f4a30'], hueso: ['#ece6d2', '#a89f84'], hidra: ['#7cc45a', '#2f6a2a'],
    desierto: ['#e0c070', '#a07830'], pantano: ['#7cc45a', '#3f6a2a'], cristal: ['#d6b8ff', '#8a5ad0'], tormenta: ['#ffe14a', '#5a8aff'],
    fuego: ['#ffb04a', '#c8400f'], arcano: ['#d6b8ff', '#6a3ad8'], abismo2: ['#7a3ab0', '#2a1244'],
  };
  const matOf = (id, dflt = 'hierro') => { for (const k of Object.keys(MATS)) if (id.includes(k)) return MATS[k]; return MATS[dflt]; };
  const itemGear = (e) => {
    const q = e.q || [], D = (i) => (q[i] && G.items[q[i]]) || null;
    return { wid: q[0] || '', hid: q[1] || '', bid: q[2] || '', sid: q[3] || '', aid: q[4] || '', r1: q[5] || '', r2: q[6] || '', btid: q[7] || '', glid: q[8] || '', lgid: q[9] || '', bootid: q[10] || '', w: D(0) };
  };
  const JEWEL = { angel: '#bfe4ff', sombra: '#9a6ad8', hueso: '#ece6d2', jade: '#4cd18a', vigor: '#e0503b', dragon: '#f08a2e', sol: '#ffd96a', abismo: '#9a4aff', faraon: '#4aa8ff', cobre: '#d98a4a', fuerza: '#e86a3a', vida: '#e0503b', mana: '#5aa8ff', plata: '#dfe6ee', rubi: '#ff3a4a', sangre: '#b0102a', hielo: '#9fe4ff' };
  const jewelCol = (id) => { for (const k of Object.keys(JEWEL)) if (id.includes(k)) return JEWEL[k]; return '#ffd96a'; };

  function wKind(id, d) {
    if (d.style === 'ranged') return /ballesta/.test(id) ? 'xbow' : 'bow';
    if (d.style === 'magic') return 'staff';
    if (/daga/.test(id)) return 'dagger';
    if (/hacha_doble/.test(id)) return 'daxe';
    if (/hacha/.test(id)) return 'axe';
    if (/martillo/.test(id)) return 'hammer';
    if (/maza/.test(id)) return 'mace';
    if (/lanza/.test(id)) return 'spear';
    if (/cimitarra|hoja_faraon|colmillo/.test(id)) return 'scim';
    if (/mandoble/.test(id)) return 'great';
    return 'sword';
  }

  /** Dibuja el arma equipada. (hx,hy) = mano; dir = lado hacia el que mira; swing = balanceo. */
  function drawWeaponItem(c, id, d, hx, hy, dir, now, swing) {
    const kind = wKind(id, d), m = matOf(id.replace(/^(espada|hacha|arco|baston|ballesta|cetro|baculo|vara|mandoble|martillo|maza|lanza|daga|hoja|cimitarra|colmillo)_?/, '') || id, d.style === 'melee' ? 'hierro' : 'madera');
    const el = WEAPON_ELEM[id], pal = el ? ELEM[el] : null, big = d.atk >= 40;
    if (d.spr && GJ['c_' + d.spr]) {
      const f = GJ['c_' + d.spr];
      c.save(); c.translate(hx, hy); c.rotate(swing * 0.35 * dir);
      if (pal) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -f[3] * 0.62 + 4, 9 + Math.sin(now / 220) * 1.2, pal[1], 0.42); c.restore(); }
      drawLayer(c, d.spr, 0, 4, 0.5, 1, false, 0); c.restore(); return;
    }
    c.save(); c.translate(hx, hy); c.rotate(swing * 0.35 * dir);
    const blade = (len, w, col, edge) => {
      c.fillStyle = edge || '#eef2f6'; c.fillRect(-w / 2, -len, w, len); c.fillStyle = col; c.fillRect(-w / 2 + (w > 3 ? 1 : 0), -len, Math.max(1, w - 2), len);
      c.fillStyle = col; c.beginPath(); c.moveTo(-w / 2, -len); c.lineTo(0, -len - 3); c.lineTo(w / 2, -len); c.fill();
    };
    const guard = (w, col) => { c.fillStyle = col; c.fillRect(-w / 2, -2, w, 2.4); };
    const grip = (len) => { c.fillStyle = '#5a3a1e'; c.fillRect(-1, 0, 2.4, len); c.fillStyle = '#c9a24b'; c.fillRect(-1.4, len, 3.2, 1.6); };
    if (kind === 'sword' || kind === 'great' || kind === 'dagger') {
      const len = kind === 'dagger' ? 9 : kind === 'great' ? 22 : big ? 18 : 14, w = kind === 'great' ? 4 : kind === 'dagger' ? 2.4 : 3;
      const col = /madera/.test(id) ? '#b88a4a' : pal ? `rgb(${pal[1]})` : (/dorada|sol/.test(id) ? '#f0c85a' : /hierro|acero/.test(id) || !pal ? '#cfd6df' : m[0]);
      if (pal) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -len / 2, len * 0.9, pal[1], 0.5 + 0.15 * Math.sin(now / 150)); c.restore(); }
      blade(len, w, col, pal ? `rgb(${pal[0]})` : undefined); guard(kind === 'dagger' ? 6 : 9, '#c9a24b'); grip(kind === 'great' ? 7 : 4);
    } else if (kind === 'scim') {
      const col = /faraon|desierto/.test(id) ? '#f0d078' : /colmillo/.test(id) ? '#9ee06a' : '#d8dee6';
      c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -1); c.quadraticCurveTo(dir * 7, -10, dir * 3, -19); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(dir * 6, -10, dir * 3, -18); c.stroke();
      guard(8, '#c9a24b'); grip(4);
    } else if (kind === 'axe' || kind === 'daxe') {
      c.fillStyle = '#6b4a2e'; c.fillRect(-1, -17, 2.6, 22);
      const head = (sd) => { c.fillStyle = pal ? `rgb(${pal[1]})` : '#aab2bd'; c.beginPath(); c.moveTo(0, -17); c.quadraticCurveTo(sd * 12, -22, sd * 10, -8); c.lineTo(sd * 1, -9); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(sd * 7 - 1, -17, 1.5, 6); };
      head(1); if (kind === 'daxe') head(-1);
    } else if (kind === 'hammer' || kind === 'mace') {
      c.fillStyle = '#6b4a2e'; c.fillRect(-1, -15, 2.6, 20);
      c.fillStyle = kind === 'hammer' ? '#8a8d98' : '#b0b6c0'; c.fillRect(-6, -20, 12, 7); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-6, -20, 12, 2);
      if (kind === 'mace') { c.fillStyle = '#d0d6de'; for (const [x, y] of [[-7, -17], [7, -17], [0, -22]]) c.fillRect(x - 1, y - 1, 2.4, 2.4); }
    } else if (kind === 'spear') {
      c.fillStyle = '#7a5a36'; c.fillRect(-1, -28, 2.4, 34);
      c.fillStyle = '#d8dee6'; c.beginPath(); c.moveTo(0, -36); c.lineTo(4, -28); c.lineTo(-4, -28); c.closePath(); c.fill(); c.fillStyle = '#c9453a'; c.fillRect(-1.5, -27, 3.4, 3);
    } else if (kind === 'bow') {
      const col = pal ? `rgb(${pal[1]})` : /marfil/.test(id) ? '#efe6cc' : /dragon/.test(id) ? '#c8402a' : /sol/.test(id) ? '#f0c85a' : /sombras/.test(id) ? '#4a3a60' : /celestial/.test(id) ? '#cfe4ff' : '#8a5a2b';
      if (pal) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, dir * -3, -3, 16, pal[1], 0.3); c.restore(); }
      c.strokeStyle = col; c.lineWidth = d.atk >= 27 ? 2.6 : 2; c.beginPath(); c.arc(dir * -3, -3, d.atk >= 27 ? 12 : 10, -1.25, 1.25); c.stroke();
      c.strokeStyle = '#d8d2c0'; c.lineWidth = 1; c.beginPath(); c.moveTo(dir * -3 + 5.5, -13); c.lineTo(dir * -3 + 5.5, 7); c.stroke();
    } else if (kind === 'xbow') {
      c.fillStyle = '#6b4a2e'; c.fillRect(-1.5, -4, 3, 12); c.fillStyle = id.includes('pesada') ? '#8a8d98' : '#a8763f'; c.fillRect(-9, -6, 18, 2.4);
      c.strokeStyle = '#d8d2c0'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -5); c.lineTo(0, -1); c.lineTo(9, -5); c.stroke(); c.fillStyle = '#cfd6df'; c.fillRect(-0.6, -12, 1.4, 9);
    } else {                                                       // bastones, varas, cetros
      const orb = pal ? pal[1] : /hueso/.test(id) ? '236,230,210' : /vara_novato/.test(id) ? '134,193,234' : ELEM.magic[1];
      const shaft = /hueso/.test(id) ? '#ece6d2' : /faraon|solar/.test(id) ? '#e0b848' : /reina|escarcha/.test(id) ? '#bfe8ff' : '#7a4f26';
      c.fillStyle = shaft; c.fillRect(-1, -19, 2.6, 25);
      const gl = 3.6 + Math.sin(now / 200) * 0.8;
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -21, gl + 7, orb, 0.55); c.restore();
      c.fillStyle = `rgb(${orb})`;
      if (/reina|cristal|escarcha/.test(id)) { c.beginPath(); c.moveTo(0, -29); c.lineTo(4, -21); c.lineTo(0, -15); c.lineTo(-4, -21); c.closePath(); c.fill(); }
      else if (/faraon/.test(id)) { c.fillRect(-1.5, -27, 3, 9); c.beginPath(); c.arc(0, -22, 3.4, 0, 7); c.fill(); }
      else { c.beginPath(); c.arc(0, -21, gl, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-1.5, -23, 1.6, 1.6); }
    }
    c.restore();
  }

  function drawHelm(c, id, hx, hy, view, side, now) {
    const m = matOf(id, 'hierro'), top = hy - 6;
    const dome = (col, r = 6.9) => { c.fillStyle = col; c.beginPath(); c.arc(hx, hy - 0.8, r, Math.PI, 0); c.lineTo(hx + r, hy + 0.8); c.lineTo(hx - r, hy + 0.8); c.closePath(); c.fill(); };
    if (/cuero/.test(id)) {
      dome(m[0], 6.6); c.fillStyle = m[1]; c.fillRect(hx - 6.6, hy - 1.4, 13.2, 2);
      if (view !== 's') { c.fillStyle = m[1]; c.fillRect(hx - 7, hy - 1, 2, 5); c.fillRect(hx + 5, hy - 1, 2, 5); }
    } else if (/demonio/.test(id)) {
      dome('#3a1420', 7); c.fillStyle = m[0]; c.fillRect(hx - 7, hy - 1.6, 14, 2);
      c.strokeStyle = '#d8c8b8'; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hx - 5, top + 1); c.quadraticCurveTo(hx - 11, top - 2, hx - 9, top - 8); c.stroke();
      c.beginPath(); c.moveTo(hx + 5, top + 1); c.quadraticCurveTo(hx + 11, top - 2, hx + 9, top - 8); c.stroke();
      if (view === 'f') { c.fillStyle = '#ff5a2a'; c.fillRect(hx - 4, hy - 0.5, 2.4, 2); c.fillRect(hx + 1.6, hy - 0.5, 2.4, 2); }
    } else if (/dragon/.test(id)) {
      dome(m[0], 7); c.fillStyle = m[1]; c.beginPath(); c.moveTo(hx - 5, top + 1); c.lineTo(hx, top - 7); c.lineTo(hx + 5, top + 1); c.closePath(); c.fill();
      c.fillStyle = '#f0c85a'; c.fillRect(hx - 7, hy - 1.6, 14, 1.6);
      if (view === 'f') { c.fillStyle = '#111'; c.fillRect(hx - 4.5, hy - 0.2, 9, 1.8); }
    } else if (/hielo|escarcha/.test(id)) {
      dome(m[1], 7);
      c.fillStyle = m[0]; for (const [dx, h] of [[-4, 6], [0, 9], [4, 6]]) { c.beginPath(); c.moveTo(hx + dx - 2.2, top + 1); c.lineTo(hx + dx, top - h); c.lineTo(hx + dx + 2.2, top + 1); c.closePath(); c.fill(); }
      if (view === 'f') { c.fillStyle = '#e8fbff'; c.fillRect(hx - 4, hy - 0.2, 8, 1.6); }
    } else if (/faraon/.test(id)) {
      dome('#f0c85a', 7.2); c.fillStyle = '#2a60c8';
      for (let i = -6; i <= 6; i += 4) c.fillRect(hx + i - 1, top + 1, 1.6, 6);
      if (view !== 'b') { c.fillStyle = '#f0c85a'; c.fillRect(hx - 8.5, hy - 1, 3, 13); c.fillRect(hx + 5.5, hy - 1, 3, 13); c.fillStyle = '#2a60c8'; for (let k = 0; k < 3; k++) { c.fillRect(hx - 8.5, hy + 2 + k * 4, 3, 1.4); c.fillRect(hx + 5.5, hy + 2 + k * 4, 3, 1.4); } }
      if (view === 'f') { c.fillStyle = '#3ad06a'; c.fillRect(hx - 1, top - 1, 2, 4); }
    } else {                                                        // hierro, acero, bronce, escamas...
      dome(m[0], 6.9); c.fillStyle = m[1]; c.fillRect(hx - 7, hy - 1.6, 14, 2);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(hx - 4, top + 0.5, 3, 1.6);
      if (/acero|escamas/.test(id)) { c.fillStyle = /acero/.test(id) ? '#c9453a' : m[1]; c.fillRect(hx - 0.8, top - 3, 1.8, 4); }
      if (view === 'f') { c.fillStyle = m[1]; c.fillRect(hx - 0.9, hy - 1, 1.8, 6); c.fillStyle = '#10131a'; c.fillRect(hx - 4.8, hy + 0.3, 3.6, 1.8); c.fillRect(hx + 1.2, hy + 0.3, 3.6, 1.8); }
      if (view === 's') { c.fillStyle = m[1]; c.fillRect(hx + side * 5, hy - 1, 2, 4); }
    }
  }

  function drawHead(c, id, hx, hy, view, side, now) {
    const d = G.items[id];
    if (d && d.spr && GJ['c_' + d.spr]) {
      const hood = /^hat1[234]$/.test(d.spr), boss = /^(t_helm|s_hood|j_helm|a_helm|f_helm|l_helm)$/.test(d.spr), dy = hood ? 7.5 : d.spr === 't_helm' ? 9.5 : d.spr === 'a_helm' || d.spr === 'f_helm' || d.spr === 'l_helm' ? 8.5 : d.spr === 'g_helm' ? 3.5 : boss ? 5.5 : 0.5;   // capuchas y cascos de jefe: cubren el rostro
      if ((hood || boss) && view === 'b') { drawLayer(c, d.spr, hx, hy + dy, 0.5, 1, false, 0); return; }
      if ((hood || boss) && view !== 'f') {                                       // de perfil: se estrecha y se voltea hacia donde mira el personaje
        const f = GJ['c_' + d.spr]; c.save(); c.translate(hx + side * 1.4, hy + dy); if (side < 0) c.scale(-1, 1); c.scale(0.84, 1);
        drawLayer(c, d.spr, 0, 0, 0.5, 1, false, 0); c.restore(); return;
      }
      if (drawLayer(c, d.spr, hx - side * 1, hy + dy, 0.5, 1, false, side * 0.06)) return;
    }
    drawHelm(c, id, hx, hy, view, side, now);
  }

  function drawShieldItem(c, id, x, y, view, side) {
    const sd = G.items[id];
    if (sd && sd.spr && GJ['c_' + sd.spr]) {                       // libro u orbe en la mano libre
      if (view === 'b') return;
      drawLayer(c, sd.spr, x, y + 1, 0.5, 0.5, false, view === 's' ? 0 : -0.12); return;
    }
    const m = matOf(id, 'madera'), s = view === 's' ? 0.55 : 1;
    c.save(); c.translate(x, y); c.scale(s, 1);
    const rim = (col) => { c.strokeStyle = col; c.lineWidth = 1.6; c.stroke(); };
    c.fillStyle = m[0];
    if (/torre|titan/.test(id)) { c.fillRect(-5.5, -7, 11, 17); rim(m[1]); c.strokeRect(-5.5, -7, 11, 17); c.fillStyle = m[1]; c.fillRect(-1, -5, 2, 13); c.fillRect(-4, 0, 8, 2); }
    else if (/hierro|escamas|demonio/.test(id)) {
      c.beginPath(); c.moveTo(-6, -7); c.lineTo(6, -7); c.lineTo(6, 2); c.lineTo(0, 10); c.lineTo(-6, 2); c.closePath(); c.fill(); rim(m[1]);
      c.fillStyle = /demonio/.test(id) ? '#ff5a2a' : m[1]; c.fillRect(-1, -5, 2, 11); c.fillRect(-4, -1, 8, 2);
      if (/demonio/.test(id)) { c.fillStyle = '#d8c8b8'; c.beginPath(); c.moveTo(-6, -7); c.lineTo(-8, -11); c.lineTo(-3, -7); c.fill(); c.beginPath(); c.moveTo(6, -7); c.lineTo(8, -11); c.lineTo(3, -7); c.fill(); }
    } else if (/hielo|escarcha/.test(id)) {
      c.beginPath(); c.moveTo(0, -9); c.lineTo(6, -2); c.lineTo(4, 8); c.lineTo(-4, 8); c.lineTo(-6, -2); c.closePath(); c.fill(); rim('#e8fbff');
      c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-1, -6, 2, 9);
    } else if (/faraon/.test(id)) {
      c.beginPath(); c.arc(0, 1, 7, 0, 7); c.fill(); rim(m[1]); c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(0, 1, 3.2, 0, 7); c.fill();
      c.strokeStyle = '#2a60c8'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = i * 0.785; c.beginPath(); c.moveTo(Math.cos(a) * 4, 1 + Math.sin(a) * 4); c.lineTo(Math.cos(a) * 6.4, 1 + Math.sin(a) * 6.4); c.stroke(); }
    } else {                                                        // madera, bronce
      c.beginPath(); c.arc(0, 1, 7, 0, 7); c.fill(); rim(m[1]); c.fillStyle = '#d8d2c0'; c.beginPath(); c.arc(0, 1, 2.4, 0, 7); c.fill();
      c.strokeStyle = m[1]; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 8); c.stroke();
    }
    c.restore();
  }

  /** Cuerpo con armadura: devuelve colores y dibuja detalles encima del torso. */
  function armorLook(e, gr) {
    if (!gr.bid || /tela/.test(gr.bid)) return null;
    const bd = G.items[gr.bid], rp = bd && bd.spr && ROBE_PAL[bd.spr];
    if (bd && bd.spr === 't_chest') return { id: gr.bid, m: ['#74594a', '#4c3a30'] };
    if (bd && bd.spr === 's_chest') return { id: gr.bid, m: ['#3a3548', '#262234'] };
    if (bd && bd.spr === 'f_chest') return { id: gr.bid, m: ['#3a3640', '#201c24'] };
    if (bd && bd.spr === 'a_chest') return { id: gr.bid, m: ['#e9f1fa', '#a9c0e0'] };
    if (bd && bd.spr === 'j_chest') return { id: gr.bid, m: ['#2f8a4a', '#1c5a32'] };
    if (rp) return { id: gr.bid, m: [rp[0], rp[1]], robe: { trim: rp[2], kind: rp[3] } };
    return { id: gr.bid, m: matOf(gr.bid, /cuero/.test(gr.bid) ? 'cuero' : 'hierro') };
  }
  function armorDetail(c, A, x, y, w, view) {            // (x,y) esquina superior izquierda del torso, w ancho, alto 12
    const id = A.id, m = A.m;
    if (A.robe) {                                        // túnica: ribete, cinto y adornos
      const R = A.robe;
      c.fillStyle = R.trim;
      if (view === 'f') { c.fillRect(x + w / 2 - 0.7, y, 1.4, 12); c.fillRect(x, y, 1.6, 12); c.fillRect(x + w - 1.6, y, 1.6, 12); }
      c.fillStyle = m[1]; c.fillRect(x, y + 8, w, 1.8); c.fillStyle = R.trim; c.fillRect(x + w / 2 - 1, y + 8, 2, 1.8);
      if (R.kind === 1 && view === 'f') { c.fillStyle = R.trim; for (const [dx, dy] of [[2, 2], [w - 4, 4], [4, 6], [w - 7, 1]]) c.fillRect(x + dx, y + dy, 1.2, 1.2); }
      if (R.kind === 2) { c.fillStyle = R.trim; c.globalAlpha = 0.55; c.fillRect(x + 1, y + 1, w - 2, 2); c.globalAlpha = 1; }
      return;
    }
    if (/placas|malla|bronce|torre/.test(id)) { c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x + 1, y + 1, 3, 9); c.fillStyle = m[1]; c.fillRect(x, y + 6, w, 1.4); if (/malla/.test(id)) { c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.fillRect(x + 1.5 + i * (w / 4), y + 1.5 + j * 3.6, 1.2, 1.2); } }
    if (/cuero/.test(id)) { c.fillStyle = m[1]; c.fillRect(x, y + 9, w, 2); c.fillRect(x + w / 2 - 0.8, y, 1.6, 9); }
    if (/escamas|dragon|hidra/.test(id)) { c.fillStyle = m[1]; for (let j = 0; j < 4; j++) for (let i = 0; i < Math.floor(w / 3.4); i++) c.fillRect(x + 1 + i * 3.4 + (j % 2) * 1.6, y + 1 + j * 3, 2.2, 1.6); }
    if (/demonio|abismo/.test(id)) { c.fillStyle = '#ff5a2a'; if (view === 'f') { c.fillRect(x + w / 2 - 0.8, y + 2, 1.6, 6); c.fillRect(x + w / 2 - 3, y + 4, 6, 1.4); } c.fillStyle = m[1]; c.fillRect(x, y + 9, w, 2); }
    if (/hielo|escarcha/.test(id)) { c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x + 2, y + 2, 2, 7); c.fillRect(x + w - 4, y + 3, 2, 5); }
    if (/faraon/.test(id)) { c.fillStyle = '#2a60c8'; c.fillRect(x + 1, y, w - 2, 2); c.fillStyle = '#ffe9a0'; c.fillRect(x + w / 2 - 1, y + 3, 2, 6); }
  }
  function pauldrons(c, A, lx, rx, y) {
    if (!A || A.robe || /cuero/.test(A.id)) return;
    c.fillStyle = A.m[0]; c.beginPath(); c.ellipse(lx, y, 3.8, 3, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(rx, y, 3.8, 3, 0, 0, 7); c.fill();
    c.fillStyle = A.m[1]; c.fillRect(lx - 3.8, y + 1.2, 7.6, 1.2); c.fillRect(rx - 3.8, y + 1.2, 7.6, 1.2);
  }
  function amuletDraw(c, aid, cx, y, view, side) {
    if (!aid) return; const col = jewelCol(aid);
    if (view === 'b') return;
    c.strokeStyle = 'rgba(230,220,170,.9)'; c.lineWidth = 1;
    if (view === 'f') { c.beginPath(); c.moveTo(cx - 3.5, y - 2); c.lineTo(cx, y + 2); c.lineTo(cx + 3.5, y - 2); c.stroke(); }
    const gx = view === 'f' ? cx : cx + side * 4, gy = y + (view === 'f' ? 3.2 : 2);
    c.fillStyle = col; c.beginPath(); c.arc(gx, gy, 2.1, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(gx - 1, gy - 1.2, 1, 1);
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, gx, gy, 5, '255,255,220', 0.25); c.restore();
  }
  function ringGlint(c, rid, x, y, now, k) {
    if (!rid) return; c.fillStyle = jewelCol(rid); c.fillRect(Math.round(x - 1), Math.round(y + 1.5), 2.4, 2); 
    if (Math.sin(now / 300 + k * 2) > 0.85) { c.fillStyle = '#fff'; c.fillRect(Math.round(x), Math.round(y), 1.4, 1.4); }
  }

  // arma por defecto cuando el servidor aún no envió el equipo (o puños): nada en la mano
  /* Personaje con ciclo de paso: la fase avanza con la distancia recorrida (ver frame()). Dibuja el equipo puesto. */
  function drawSpriteS(c, key, fi, cx, feetY, flip, scale) {
    const s = SPR[key]; if (!s || !sprReady()) return false;
    const f = s.f[fi % s.f.length], w = f[2] * scale, h = f[3] * scale;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.translate(Math.round(cx), Math.round(feetY)); if (flip) c.scale(-1, 1);
    c.drawImage(sprImg, f[0], f[1], f[2], f[3], -w / 2, -h, w, h); c.restore(); return true;
  }
  function drawPlayer(c, e, sx, sy, now) {
    if (e.mt && G.items[e.mt]) {                                 // montado: la montura va debajo y el jinete sube
      const md = G.items[e.mt], bob = Math.abs(Math.sin(e.phase || 0)) * 1.6 * (e.amp || 0);
      c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(sx + TS / 2, sy + TS - 2, 14, 4, 0, 0, 7); c.fill();
      const fr = SPR[md.mon] ? sprFrame(e, SPR[md.mon]) : 0;
      drawSpriteS(c, md.mon, fr, sx + TS / 2, sy + TS - 2 - bob, (e.face || 1) < 0, md.scale || 0.9);
      sy -= Math.round(8 + (SPR[md.mon] ? SPR[md.mon].h * (md.scale || 0.9) * 0.18 : 0));
    }
    const cx = sx + TS / 2, base = sy + TS - 3;
    const amp = e.amp || 0, ph = e.phase || 0, fd = e.fd == null ? 2 : e.fd;
    const sw = Math.sin(ph), cs = Math.cos(ph);
    const idle = Math.sin(now / 450 + e.id) * 0.6 * (1 - amp);              // respiración en reposo
    const bob = Math.round((-Math.abs(sw) * 1.5 * amp + idle) * 2) / 2;      // el cuerpo sube a mitad de zancada
    const side = fd === 1 ? 1 : fd === 3 ? -1 : 0;
    const lean = side * amp * 1.2;                                            // inclinación al correr
    const hipY = base - 10, shY = base - 21 + bob;
    const gr = itemGear(e), A = armorLook(e, gr);
    const body = A ? A.m[0] : e.c, dark = A ? shade(A.m[1], 0.85) : shade(e.c, 0.62), mid = A ? A.m[1] : shade(e.c, 0.82);
    const capeCol = shade(e.c, 0.62), skin = '#e8c39e', skinD = '#caa07c';
    const LG = gr.lgid && LEG_COL[(G.items[gr.lgid] || {}).spr] || (gr.lgid ? ['#6d5445', '#4b392d', '#ff8a1f'] : null);
    const legCol = LG ? LG[0] : A && !/tela/.test(gr.bid) ? shade(A.m[1], 0.9) : '#2a2f3a', legFar = LG ? LG[1] : A && !/tela/.test(gr.bid) ? shade(A.m[1], 0.7) : shade('#2a2f3a', 0.8);
    c.save();
    if (e.o) c.globalAlpha = 0.55;
    c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(cx, base + 0.5, 10 - bob * 0.6, 3.6, 0, 0, 7); c.fill();   // sombra

    const leg = (x, len, col) => { c.fillStyle = col; c.fillRect(Math.round(x - 2), hipY + bob * 0.4, 4, len); if (gr.lgid) { c.fillStyle = LG[2]; c.fillRect(Math.round(x - 1.5), hipY + bob * 0.4 + 3, 3, 1); } const bc = gr.bootid && BOOT_COL[(G.items[gr.bootid] || {}).spr] || ['#5d4637', '#ff8a1f']; c.fillStyle = gr.bootid ? bc[0] : '#15181f'; c.fillRect(Math.round(x - 2.5), hipY + bob * 0.4 + len - 2, 5 + (side ? 1 : 0), 2.5); if (gr.bootid) { c.fillStyle = bc[1]; c.fillRect(Math.round(x - 2.5), hipY + bob * 0.4 + len - 1.2, 5 + (side ? 1 : 0), 0.8); } };
    const arm = (x, y, dx, dy, col) => { c.strokeStyle = col; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); c.fillStyle = handCol; c.beginPath(); c.arc(x + dx, y + dy, 2, 0, 7); c.fill(); };
    const cape = (hem, wide) => {
      c.fillStyle = capeCol; c.beginPath();
      c.moveTo(cx - wide + lean, shY + 1); c.lineTo(cx + wide + lean, shY + 1);
      c.lineTo(cx + wide + 1 + hem, base - 7); c.lineTo(cx - wide - 1 + hem, base - 7); c.closePath(); c.fill();
    };
    const handCol = GLOVE_COL[(G.items[gr.glid] || {}).spr] || skin;
    const skirt = (wide, sway) => {
      if (!A || !A.robe) return;
      const top = hipY - 2 + bob * 0.4, bot = base - 2, R = A.robe;
      c.fillStyle = A.m[1]; c.beginPath(); c.moveTo(cx - wide + 1 + lean, top); c.lineTo(cx + wide - 1 + lean, top);
      c.lineTo(cx + wide + 2 + sway, bot); c.lineTo(cx - wide - 2 + sway, bot); c.closePath(); c.fill();
      c.fillStyle = A.m[0]; c.beginPath(); c.moveTo(cx - wide + 3 + lean, top); c.lineTo(cx + wide - 3 + lean, top);
      c.lineTo(cx + wide - 1 + sway, bot); c.lineTo(cx - wide + 1 + sway, bot); c.closePath(); c.fill();
      c.fillStyle = R.trim; c.fillRect(cx - wide - 2 + sway, bot - 1.6, wide * 2 + 4, 1.6);
    };
    const beltDraw = (y, wd) => { const b = G.items[gr.btid]; if (b && b.spr) { const f = GJ['c_' + b.spr]; if (f) drawLayer(c, b.spr, cx + lean, y, 0.5, 0.5, false, 0); } };
    const wdef = gr.w;
    const holdWeapon = (hx, hy, dir, swing) => {
      if (!wdef) return;
      const sg = wdef.style === 'melee' ? G.swings.get(e.id) : null, pr = sg ? (now - sg.t) / SWING_MS : 2;
      if (pr >= 1) { drawWeaponItem(c, gr.wid, wdef, hx, hy, dir, now, swing); return; }
      const dr = dir || 1, kd = sg.kd, ea = 1 - Math.pow(1 - pr, 3);
      if (kd === 'spear' || kd === 'dagger') {                                  // estocada: la mano se lanza hacia delante
        const th = Math.sin(Math.min(1, pr * 1.4) * Math.PI) * (kd === 'spear' ? 7 : 4);
        drawWeaponItem(c, gr.wid, wdef, hx + dr * th, hy - th * 0.35, dir, now, swing + dr * 1.3);
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,255,230,${0.7 * (1 - pr)})`; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(hx + dr * (th + 2), hy - 12 - th * 0.3); c.lineTo(hx + dr * (th + 14 + pr * 8), hy - 14 - th * 0.35); c.stroke(); c.restore();
        return;
      }
      const a0 = -2.0, a1 = 1.5, ang = (a0 + (a1 - a0) * ea) * dr, hv = kd === 'hammer' || kd === 'mace' || kd === 'great' || kd === 'daxe';
      drawWeaponItem(c, gr.wid, wdef, hx + dr * Math.sin(pr * Math.PI) * 2.5, hy, dir, now, swing + ang / (0.35 * dr));
      const R = hv ? 26 : 20, pal = WEAPON_ELEM[gr.wid] ? ELEM[WEAPON_ELEM[gr.wid]] : null;                   // estela del corte
      c.save(); c.translate(hx, hy - 2); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      for (const [w, col] of [[hv ? 7 : 5, `rgba(${pal ? pal[2] : '180,200,230'},${0.45 * (1 - pr)})`], [hv ? 3 : 2, `rgba(${pal ? pal[0] : '255,255,240'},${0.9 * (1 - pr * 0.8)})`]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath();
        const s0 = Math.PI / 2 * -1 + a0 * dr, s1 = Math.PI / 2 * -1 + (a0 + (a1 - a0) * ea) * dr;
        c.arc(0, 0, R, Math.min(s0, s1), Math.max(s0, s1)); c.stroke();
      }
      c.restore();
    };

    if (side) {
      // ---------- perfil ----------
      const swing = sw * amp;
      const lift1 = Math.max(0, cs) * 2.2 * amp, lift2 = Math.max(0, -cs) * 2.2 * amp;
      const farArmDx = swing * 3.6 * side, nearArmDx = -swing * 3.6 * side;
      arm(cx + lean - side * 1, shY + 4, farArmDx, 8, dark);
      leg(cx - side * swing * 4, 10 - lift2, legFar);
      cape(-side * (2.5 + amp * 3) + Math.sin(now / 220) * 0.8, 5);
      if (gr.sid) drawShieldItem(c, gr.sid, cx + lean - side * 2, shY + 6, 's', side);
      c.fillStyle = mid; c.fillRect(Math.round(cx - 5 + lean), shY, 10, 12);
      c.fillStyle = body; c.fillRect(Math.round(cx - 5 + lean), shY, 10, 3);
      if (A) armorDetail(c, A, cx - 5 + lean, shY, 10, 's'); else { c.fillStyle = '#6b4a2e'; c.fillRect(Math.round(cx - 5 + lean), shY + 9, 10, 2); }
      pauldrons(c, A, cx - 3 + lean, cx + 3 + lean, shY + 1);
      amuletDraw(c, gr.aid, cx + lean, shY + 3, 's', side);
      leg(cx + side * swing * 4, 10 - lift1, legCol);
      skirt(5.5, -side * (1.5 + amp * 2.5));
      if (A && A.robe) { c.fillStyle = A.m[0]; c.fillRect(Math.round(cx - 5 + lean), shY + 8, 10, 4); c.fillStyle = A.m[1]; c.fillRect(Math.round(cx - 5 + lean), shY + 8, 10, 1.6); }
      beltDraw(shY + 10, 10);
      const hx = cx + lean, hy = shY - 5 + bob * 0.3;
      c.fillStyle = skin; c.beginPath(); c.arc(hx, hy, 6, 0, 7); c.fill();
      if (!gr.hid || /cuero|faraon/.test(gr.hid)) { c.fillStyle = '#3a2a1c'; c.beginPath(); c.arc(hx - side * 1.5, hy - 1.5, 6, Math.PI * (side > 0 ? 0.9 : -0.1), Math.PI * (side > 0 ? 2.1 : 1.1)); c.fill(); }
      c.fillStyle = skinD; c.fillRect(hx + side * 6 - (side > 0 ? 1 : 0), hy, 2, 2);                        // nariz
      c.fillStyle = '#111'; c.fillRect(hx + side * 2.5 - 1, hy - 1, 2, 2);                                  // ojo
      if (gr.hid) drawHead(c, gr.hid, hx, hy, 's', side, now);
      arm(cx + lean + side * 1, shY + 4, nearArmDx, 8, body);
      const handX = cx + lean + side * 1 + nearArmDx, handY = shY + 12;
      ringGlint(c, gr.r1, handX, handY - 3.5, now, 1); ringGlint(c, gr.r2, handX + 1, handY - 5, now, 2);
      holdWeapon(handX, handY, side, -swing);
    } else {
      // ---------- frente / espalda ----------
      const front = fd === 2;
      const l1 = Math.max(0, cs) * 3.2 * amp, l2 = Math.max(0, -cs) * 3.2 * amp;
      leg(cx - 3, 10 - l1, legCol); leg(cx + 3, 10 - l2, legCol);
      const sway = Math.sin(ph) * amp;
      skirt(7, sway * 2.2);
      if (!front) cape(sway * 2.5 + Math.sin(now / 240) * 0.6, 7);
      if (!front && gr.sid) drawShieldItem(c, gr.sid, cx + sway * 0.8, shY + 7, 'b', 0);                    // escudo a la espalda
      c.fillStyle = front ? body : mid; c.fillRect(Math.round(cx - 7 + sway * 0.8), shY, 14, 12);
      if (front) {
        c.fillStyle = mid; c.fillRect(cx - 7 + sway * 0.8, shY + 9, 14, 3);
        if (A) armorDetail(c, A, cx - 7 + sway * 0.8, shY, 14, 'f'); else { c.fillStyle = '#c9a24b'; c.fillRect(cx - 1 + sway * 0.8, shY + 3, 2, 8); }
        if (A && G.items[gr.bid] && CHEST_SPR.has(G.items[gr.bid].spr)) drawLayer(c, G.items[gr.bid].spr, cx + sway * 0.8, shY + 12.5, 0.5, 1, false, 0);
      } else { c.fillStyle = dark; c.fillRect(cx - 7 + sway * 0.8, shY, 14, 3); }
      pauldrons(c, A, cx - 8 + sway * 0.8, cx + 8 + sway * 0.8, shY + 1);
      beltDraw(shY + 10, 14);
      if (front) amuletDraw(c, gr.aid, cx + sway * 0.8, shY + 2, 'f', 0);
      arm(cx - 8, shY + 3, -1, 7 - sw * 2.2 * amp, front ? mid : dark);
      const rdy = 7 + sw * 2.2 * amp;
      arm(cx + 8, shY + 3, 1, rdy, front ? body : mid);
      if (front) { ringGlint(c, gr.r1, cx + 9, shY + 3 + rdy - 2, now, 1); ringGlint(c, gr.r2, cx - 9, shY + 3 + 7 - sw * 2.2 * amp - 2, now, 2); }
      const hx = cx + sway * 0.4, hy = shY - 5;
      c.fillStyle = skin; c.beginPath(); c.arc(hx, hy, 6, 0, 7); c.fill();
      c.fillStyle = '#3a2a1c';
      if (front) { if (!gr.hid || /cuero|faraon/.test(gr.hid)) { c.beginPath(); c.arc(hx, hy - 1.5, 6, Math.PI, 0); c.fill(); } c.fillStyle = '#111'; c.fillRect(hx - 3, hy, 2, 2); c.fillRect(hx + 1, hy, 2, 2); }
      else { c.beginPath(); c.arc(hx, hy, 6, 0, 7); c.fill(); }
      if (gr.hid) drawHead(c, gr.hid, hx, hy, front ? 'f' : 'b', 0, now);
      if (front && gr.sid) drawShieldItem(c, gr.sid, cx - 11 + sway * 0.8, shY + 8 - sw * amp, 'f', 0);        // escudo en el brazo izquierdo
      holdWeapon(cx + 9, shY + 3 + rdy, 1, sw * amp);
    }
    c.restore();
  }

  /* ---------- atlas del equipo de mago: iconos y capas del personaje ---------- */
  const GJ = {};
  const gearImg = new Image();
  gearImg.src = 'gear.png';
  const gearReady = () => gearImg.complete && gearImg.naturalWidth > 0;
  fetch('gear.json').then((r) => r.json()).then((j) => { Object.assign(GJ, j); if (gearReady()) refreshIcons(); }).catch(() => {});
  gearImg.onload = () => { if (GJ.i_robe0) refreshIcons(); };
  function refreshIcons() { try { if (G.items && $('#inv').children.length) renderInv(); } catch (e) { /* aún sin interfaz */ } }
  const iconKey = (id) => { const d = G.items[id]; return d ? 'i_' + (d.spr || id) : ''; };
  /** Icono del objeto: dibujo de píxel-art si lo hay, si no el emoji. */
  function iconNode(id) {
    const d = G.items[id], k = iconKey(id), f = GJ[k];
    if (!f || !gearReady()) return el('span', '', d ? d.icon : '?');
    const cv = document.createElement('canvas'); cv.width = f[2]; cv.height = f[3]; cv.className = 'gico';
    const x = cv.getContext('2d'); x.drawImage(gearImg, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    return cv;
  }
  /** Capa sobre el personaje (c_<sprite>): ancla = (ax,ay) en fracción del dibujo. */
  function drawLayer(c, spr, x, y, ax, ay, flip, rot) {
    const f = GJ['c_' + spr]; if (!f || !gearReady()) return false;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.translate(x, y);
    if (rot) c.rotate(rot); if (flip) c.scale(-1, 1);
    c.drawImage(gearImg, f[0], f[1], f[2], f[3], -f[2] * ax, -f[3] * ay, f[2], f[3]); c.restore(); return true;
  }
  const ROBE_PAL = {
    robe0: ['#8d5c36', '#5a3a20', '#a87a4a', 0], robe1: ['#4f8a3a', '#2f5a25', '#8a5a30', 0], robe2: ['#5f8c8c', '#3a5c5c', '#8a5a30', 0],
    robe3: ['#2f58b0', '#1c3578', '#e0c060', 0], robe4: ['#3a68c0', '#22408a', '#e8c868', 0], robe5: ['#b02a2a', '#6e1818', '#d8c070', 0],
    robe6: ['#b02a2a', '#6e1818', '#d4d9e0', 0], robe7: ['#40307a', '#251a4a', '#7a5ac0', 0], robe8: ['#5a3aa0', '#2e1f5c', '#ffe070', 1],
    robe9: ['#2f5a9a', '#1c3868', '#d8ecff', 1], robe10: ['#8a2a10', '#4a1208', '#ff8a2a', 2], robe11: ['#e06a10', '#8a2a08', '#ffd040', 2], robe12: ['#6ab0e0', '#3a78b0', '#f0fcff', 2],
  };
  const GLOVE_COL = { glove0: '#b8a88a', glove1: '#b8a88a', glove2: '#8a5a30', glove3: '#7a4a28', glove4: '#6a3e20', glove5: '#6a3e20', t_glove1: '#7a5a48', t_glove2: '#7a5a48', s_gauntlet: '#2f2a3c', j_glove: '#2f7a4a', a_glove: '#e9f1fa', f_glove: '#2f2a30', l_glove: '#2a7a8a' };
  const BOOT_COL = { t_boot: ['#5d4637', '#ff8a1f'], s_boot: ['#2c2838', '#9a6ad8'], j_boot: ['#24603a', '#9ee85a'], a_boot: ['#e9f1fa', '#ffd96a'], f_boot: ['#26242a', '#ff6a1f'], g_boot: ['#3e4a30', '#8a7a50'], l_boot: ['#234f5c', '#7fe3f2'] };
  const LEG_COL = { j_leg: ['#2f8a4a', '#1f5c33', '#9ee85a'], s_leg: ['#2c2838', '#1c1928', '#9a6ad8'], a_leg: ['#e9f1fa', '#a9c0e0', '#ffd96a'], f_leg: ['#2c2a30', '#18161a', '#ff6a1f'], g_leg: ['#6b5a34', '#4a3d22', '#3f5a30'], l_leg: ['#2a6a78', '#1a4452', '#8be8f5'] };
  const CHEST_SPR = new Set(['t_chest', 's_chest', 'j_chest', 'a_chest', 'f_chest', 'g_chest', 'l_chest']);

  /* ---------- sprites de píxel-art (monstruos y PNJ) ---------- */
  const SPR = {};
  const sprImg = new Image();
  sprImg.src = 'sprites.png';
  fetch('sprites.json').then((r) => r.json()).then((j) => Object.assign(SPR, j)).catch(() => { /* sin sprites: se usan emojis */ });
  const sprReady = () => sprImg.complete && sprImg.naturalWidth > 0;
  /** Dibuja el fotograma `fi` del sprite `key` con los pies en (cx, feetY). */
  function drawSprite(c, key, fi, cx, feetY, flip, squash = 1) {
    const s = SPR[key], f = s.f[fi % s.f.length], w = f[2], h = f[3] * squash;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.translate(Math.round(cx), Math.round(feetY));
    if (flip) c.scale(-1, 1);
    c.drawImage(sprImg, f[0], f[1], f[2], f[3], -w / 2, -h, w, h);
    c.restore();
  }
  const sprFrame = (e, s) => {
    const n = s.f.length;
    if (s.anim && n > 1) return Math.floor(performance.now() / s.anim + (e.id || 0)) % n;   // aleteo continuo
    if (n < 2 || (e.amp || 0) < 0.3) return 0;
    const u = (((e.phase || 0) / (Math.PI * 2)) % 1 + 1) % 1;
    return Math.min(n - 1, Math.floor(u * n));
  };

  /* Monstruos: el emoji es el cuerpo y se le dibujan piernas y brazos con ciclo de paso real. */
  const RIG = (() => {
    const m = {}, set = (kind, col, list) => list.split(' ').forEach((k) => { m[k] = { kind, col }; });
    set('bi', '#e8e2d0', 'esqueleto esqueleto_arquero rey_esqueleto');
    set('bi', '#7a9a5a', 'necrofago zombi');
    set('bi', '#5a8a3a', 'orco chaman_orco senor_orco goblin arquero_goblin');
    set('bi', '#6f8f60', 'troll');
    set('bi', '#a82a2a', 'demonio_menor demonio_supremo');
    set('bi', '#4a3a2a', 'bandido enano_renegado bruja kobold');
    set('bi', '#7a7e88', 'golem_lava golem_hierro maestro_forjador golem_hielo');
    set('bi', '#d8caa0', 'momia sacerdote_momia momia_real faraon');
    set('bi', '#a8d8f0', 'yeti caballero_hielo reina_hielo');
    set('quad', '#6b4a2e', 'conejo rata lobo oso jabali tortuga lobo_hielo mamut lagarto sapo dragon hidra');
    set('bug', '#2a2220', 'arana arana_cueva cangrejo cangrejo_colosal escorpion rey_escorpion escarabajo_gigante');
    set('float', '#bfc8e0', 'serpiente cobra gusano_arena murcielago espectro_helado elemental_hielo sirena');
    return m;
  })();
  const RIG_HANDS = new Set(['bi']);

  function limb(c, x1, y1, x2, y2, w, col) {
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = w + 1.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }

  function drawMonster(c, e, sx, sy, now) {
    const d = G.mons[e.t] || { icon: '❓', boss: false };
    const rig = RIG[e.t] || { kind: 'bi', col: '#8a7a66' };
    const k = d.boss ? 1.55 : 1, cx = sx + TS / 2, ground = sy + TS - 4;
    const amp = e.amp || 0, ph = e.phase || 0, sw = Math.sin(ph), cs = Math.cos(ph);
    const spr = sprReady() && SPR[e.t];
    if (spr) {                                                                  // sprite de píxel-art con ciclo de paso
      const wide = spr.f[0][2];
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, ground + 1, Math.min(spr.sh || 22, 6 + wide * 0.28), 3.6 + (d.boss ? 1.5 : 0), 0, 0, 7); c.fill();
      if (d.boss) { c.fillStyle = 'rgba(212,80,59,.14)'; c.beginPath(); c.arc(cx, ground - spr.h * 0.4, spr.h * 0.5 + Math.sin(now / 300) * 2, 0, 7); c.fill(); }
      const moving = amp > 0.3, flying = e.t === 'murcielago' || /espectro|reina_hielo|elemental|golem_lava|sirena|dragon_sombra/.test(e.t);
      const hop = moving ? (spr.f.length < 2 ? Math.abs(Math.sin(ph)) * 3 : Math.abs(Math.sin(ph * spr.f.length / 2)) * 1.5) : 0;
      const float = flying ? (e.t === 'dragon_sombra' ? 14 + Math.sin(now / 450 + e.id) * 4 : 6 + Math.sin(now / 300 + e.id) * 2.2) : 0;
      const sq = 1 + (moving ? 0 : Math.sin(now / 520 + e.id) * 0.018);
      drawSprite(c, e.t, sprFrame(e, spr), cx, ground + 2 - Math.round(hop) - Math.round(float), (e.face || 1) < 0, sq);
      return;
    }
    const idle = Math.sin(now / 520 + e.id) * 0.8 * (1 - amp);
    const size = d.boss ? 46 : 28;
    c.save();
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, ground + 1, (d.boss ? 17 : 11) * (rig.kind === 'quad' ? 1.2 : 1), 4, 0, 0, 7); c.fill();
    if (d.boss) { c.fillStyle = 'rgba(212,80,59,.16)'; c.beginPath(); c.arc(cx, sy + TS / 2, 24 + Math.sin(now / 300) * 2, 0, 7); c.fill(); }
    let lift = 0, bodyY, front = rig.kind;
    const w = 2.6 * k, col = rig.col;
    if (rig.kind === 'bi') {
      const hipY = ground - 9 * k, bob = Math.round(-Math.abs(sw) * 2 * amp * k * 2) / 2;
      bodyY = sy + TS / 2 - 5 * k - 2 + bob + idle;
      for (const s of [-1, 1]) {                                                    // piernas
        const a = sw * s, foot = cx + s * 4 * k + a * 6 * k, fy = ground - Math.max(0, cs * s) * 3 * k * amp;
        limb(c, cx + s * 4 * k, hipY, foot, fy, w + 0.6, shade(col, 0.8));
        c.fillStyle = '#15181f'; c.fillRect(Math.round(foot - 2.5 * k), Math.round(fy - 1), Math.round(5 * k), 2.5);
      }
      c.fillStyle = '#fff'; c.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(d.icon, cx, bodyY);
      const shY = bodyY + 6 * k;
      for (const s of [-1, 1]) {                                                    // brazos (en oposición a las piernas)
        const a = -sw * s * amp, reach = d.range > 1 ? 7 * k : 0;
        const hx = cx + s * (12 * k) + a * 2, hy = shY + 8 * k + a * 4 * k - (d.range > 1 && s > 0 ? reach : 0);
        limb(c, cx + s * 9 * k, shY, hx, hy, w, col);
        c.fillStyle = col; c.beginPath(); c.arc(hx, hy, 1.9 * k, 0, 7); c.fill();
      }
    } else if (rig.kind === 'quad') {
      const bob = Math.round(-Math.abs(sw) * 1.6 * amp * 2) / 2, hipY = ground - 7 * k;
      bodyY = sy + TS / 2 - 3 * k + bob + idle;
      const legs = [[-8, 0], [-3, Math.PI], [4, Math.PI], [9, 0]];                   // andar diagonal de cuadrúpedo
      for (const [lx, off] of legs) {
        const a = Math.sin(ph + off), foot = cx + lx * k + a * 5 * k, fy = ground - Math.max(0, Math.cos(ph + off)) * 2.6 * k * amp;
        limb(c, cx + lx * k, hipY, foot, fy, w, shade(col, lx < 0 ? 0.7 : 0.9));
      }
      c.fillStyle = '#fff'; c.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(d.icon, cx, bodyY - (d.boss ? 2 : 0));
    } else if (rig.kind === 'bug') {
      const bob = Math.round(-Math.abs(sw) * 1.2 * amp * 2) / 2;
      bodyY = sy + TS / 2 - 3 * k + bob + idle * 0.4;
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {                         // seis patas con paso alterno
        const off = (i % 2 ? Math.PI : 0) + (s > 0 ? Math.PI : 0), a = Math.sin(ph * 1.6 + off), ox = s * (6 + i * 1.5) * k;
        const kx = cx + ox + s * 4 * k, ky = bodyY + 4 * k - 3 * k - Math.max(0, Math.cos(ph * 1.6 + off)) * 2.5 * k * amp;
        const fx = cx + ox + s * (8 * k) + a * 2.4 * k, fy = ground - 1;
        limb(c, cx + s * 4 * k, bodyY + 4 * k, kx, ky - 2 * k, w * 0.7, col); limb(c, kx, ky - 2 * k, fx, fy, w * 0.7, col);
      }
      c.fillStyle = '#fff'; c.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(d.icon, cx, bodyY);
    } else {                                                                         // flotan o reptan: balanceo
      const fl = e.t === 'murcielago' || e.t === 'espectro_helado' || e.t === 'elemental_hielo' ? 5 * k : 0;
      bodyY = sy + TS / 2 - 1 - fl + Math.sin(now / 260 + e.id) * (fl ? 2.2 : 0.8) + idle;
      const sway = fl ? 0 : Math.sin(ph) * 2 * amp;
      if (e.t === 'murcielago') {                                                    // alas que baten
        const f = Math.sin(now / 70 + e.id) * 6;
        c.fillStyle = '#2a2233';
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 4, bodyY); c.lineTo(cx + s * 17, bodyY - 6 - f); c.lineTo(cx + s * 14, bodyY + 3); c.lineTo(cx + s * 9, bodyY + 1); c.closePath(); c.fill(); }
      }
      c.fillStyle = '#fff'; c.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(d.icon, cx + sway, bodyY);
    }
    c.restore();
  }

  // aura de brillo: diamantes, piezas ancient y set mejorado completo
  const AURA = ['', '255,245,200', '170,220,255', '190,150,255', '255,200,90'];
  function drawAura(c, e, cx, cy, now) {
    const lv = Math.min(4, e.v), col = e.a >= 2 ? '120,190,255' : AURA[lv] || AURA[1];
    const r = 16 + lv * 3 + Math.sin(now / 260 + e.id) * 1.5;
    const g = c.createRadialGradient(cx, cy, 4, cx, cy, r + 8);
    g.addColorStop(0, `rgba(${col},${0.12 + lv * 0.06})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r + 8, 0, 7); c.fill();
    c.fillStyle = `rgba(${col},.9)`;
    for (let i = 0; i < 1 + lv; i++) { const a = now / 700 + i * 6.28 / (1 + lv) + e.id; c.fillRect(Math.round(cx + Math.cos(a) * (r - 2)) - 1, Math.round(cy + Math.sin(a) * (r - 6)) - 1, 2, 2); }
  }

  function drawFlash(c, f, now) {
    const age = now - f.t, cx = sxOf(f.x) + TS / 2, cy = syOf(f.y) + TS / 2;
    if (f.k === 's') {
      if (age > 260) return; const a = 1 - age / 260, pc = ELEM[f.el] || ['255,250,235', '255,240,200', '200,190,160'], sc = f.heavy ? 1.5 : 1;
      c.save(); c.translate(cx, cy); c.rotate(f.ang || 0); c.globalCompositeOperation = 'lighter';
      for (const [w, col, rr] of [[7 * sc, `rgba(${pc[2]},${a * 0.55})`, 1], [3.2 * sc, `rgba(${pc[0]},${a})`, 1]]) {
        c.strokeStyle = col; c.lineWidth = w * a + 0.8; c.lineCap = 'round';
        c.beginPath(); c.arc(0, 0, (11 + age / 9) * sc * rr, -2.5, -0.35); c.stroke();
        c.beginPath(); c.arc(0, 0, (8 + age / 12) * sc * rr, 0.7, 2.7); c.stroke();
      }
      c.restore();
      if (f.cr) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, cx, cy, 26 * a + 8, '255,225,120', 0.7 * a); c.restore(); }
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
      c.save(); c.globalCompositeOperation = 'lighter';
      glow(c, cx, cy + 4, 26, '120,230,140', 0.35 * a);
      c.strokeStyle = `rgba(200,255,200,${a})`; c.lineWidth = 3; const h = 7 + age / 50;
      c.beginPath(); c.moveTo(cx, cy - 12 - age / 25 - h); c.lineTo(cx, cy - 12 - age / 25 + h); c.moveTo(cx - h, cy - 12 - age / 25); c.lineTo(cx + h, cy - 12 - age / 25); c.stroke();
      c.restore();
    }
  }

  const TXT_COL = { p: '#ff5a4a', h: '#ffd08a', g: '#7be08a', m: '#86c1ea', x: '#f2d27a' };

  const px = (tx) => (tx - G.cam.x) * TS + cw / 2, py = (ty) => (ty - G.cam.y) * TS + ch / 2;
  function glow(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }

  function drawProj(c, p, now, dt) {
    const age = now - p.t, k = Math.min(1, age / p.T), el = p.el, pal = ELEM[el] || null;
    const wx = p.x1 + (p.x2 - p.x1) * k, wy = p.y1 + (p.y2 - p.y1) * k;
    const x = px(wx), y = py(wy) - 6, ang = Math.atan2(p.y2 - p.y1, p.x2 - p.x1);
    // estela de partículas
    p.acc += dt * (pal ? 60 : 0);
    while (p.acc >= 1) {
      p.acc -= 1;
      const col = pal[(Math.random() * 3) | 0];
      G.parts.push({ x: wx + (Math.random() - 0.5) * 0.15, y: wy - 0.18 + (Math.random() - 0.5) * 0.15, vx: (Math.random() - 0.5) * 0.8, vy: (el === 'fire' ? -1.2 : el === 'ice' ? 1.4 : -0.2) + (Math.random() - 0.5) * 0.8, g: 0, life: 0, max: 0.3 + Math.random() * 0.3, s: 1.5 + Math.random() * 2, c: col, add: true });
    }
    if (p.s === 'ranged' || p.s === 'arrow') {
      c.save(); c.translate(x, y); c.rotate(ang);
      if (pal) { c.globalCompositeOperation = 'lighter'; glow(c, 8, 0, 14, pal[1], 0.7); c.globalCompositeOperation = 'source-over'; }
      const tr = c.createLinearGradient(-34, 0, 0, 0); tr.addColorStop(0, 'rgba(255,255,255,0)'); tr.addColorStop(1, pal ? `rgba(${pal[1]},.65)` : 'rgba(230,225,205,.5)');
      c.fillStyle = tr; c.fillRect(-34, -1, 34, 2);
      c.strokeStyle = '#d8d2c0'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 0); c.lineTo(7, 0); c.stroke();
      c.fillStyle = pal ? `rgb(${pal[1]})` : '#c9453a'; c.beginPath(); c.moveTo(-11, 0); c.lineTo(-15, -3); c.lineTo(-8, 0); c.lineTo(-15, 3); c.closePath(); c.fill();      // plumas
      c.fillStyle = pal ? `rgb(${pal[0]})` : '#cfd6df'; c.beginPath(); c.moveTo(11, 0); c.lineTo(5, -3.2); c.lineTo(5, 3.2); c.fill();
      c.restore();
    } else {
      const pulse = 1 + Math.sin(now / 60) * 0.12, pc = pal || ELEM.magic, big = p.s === 'fire' ? 1.25 : 1;
      c.save(); c.globalCompositeOperation = 'lighter';
      glow(c, x, y, 22 * pulse * big, pc[2], 0.55); glow(c, x, y, 13 * pulse * big, pc[1], 0.9);
      c.restore();
      c.fillStyle = `rgb(${pc[0]})`; c.beginPath(); c.arc(x, y, 4.5 * pulse * big, 0, 7); c.fill();
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${pc[1]},.9)`;
      for (let i = 0; i < 3; i++) { const a = now / 90 + i * 2.09; c.fillRect(x + Math.cos(a) * 9 - 1, y + Math.sin(a) * 9 - 1, 2.4, 2.4); }
      c.restore();
    }
  }

  function drawBolt(c, b, now) {
    const age = now - b.t, a = 1 - age / 260; if (a <= 0) return;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
    for (const [w, col] of [[7, `rgba(74,138,255,${a * 0.45})`], [3.2, `rgba(255,225,74,${a})`], [1.2, `rgba(255,255,255,${a})`]]) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      b.pts.forEach(([tx, ty], i) => { const X = px(tx), Y = py(ty) - 6; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); }); c.stroke();
    }
    c.restore();
  }

  function drawCast(c, k, now) {
    const age = now - k.t, T = 420; if (age > T) return; const a = 1 - age / T, pc = ELEM[k.el] || ELEM.magic;
    const x = px(k.x), y = py(k.y) + TS / 2 - 4, r = 14 + (1 - a) * 10;
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, y); c.scale(1, 0.42);
    c.strokeStyle = `rgba(${pc[1]},${a})`; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
    c.rotate(age / 260); c.strokeStyle = `rgba(${pc[0]},${a * 0.9})`; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, r * 0.68, 0, 7); c.stroke();
    for (let i = 0; i < 6; i++) { const t = i * 1.047; c.beginPath(); c.moveTo(Math.cos(t) * r * 0.68, Math.sin(t) * r * 0.68); c.lineTo(Math.cos(t) * r, Math.sin(t) * r); c.stroke(); }
    c.restore();
  }

  function stepParts(c, dt) {
    c.save();
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i]; p.life += dt; if (p.life >= p.max) { G.parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = 1 - p.life / p.max;
      c.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      c.fillStyle = `rgba(${p.c},${a})`;
      const X = px(p.x), Y = py(p.y), s = p.s * (0.5 + a * 0.5);
      if (p.sq) { c.save(); c.translate(X, Y); c.rotate(p.life * 6); c.fillRect(-s, -s * 0.5, s * 2, s); c.restore(); } else c.fillRect(X - s / 2, Y - s / 2, s, s);
    }
    c.restore();
    if (G.parts.length > 700) G.parts.splice(0, G.parts.length - 700);
  }
  function drawRings(c, now) {
    G.rings = G.rings.filter((r) => now - r.t < r.max);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const r of G.rings) {
      const k = (now - r.t) / r.max, a = 1 - k;
      c.strokeStyle = `rgba(${r.col},${a * 0.9})`; c.lineWidth = r.w * a + 0.6;
      c.beginPath(); c.ellipse(px(r.x), py(r.y) + 2, r.r * (0.3 + k), r.r * (0.3 + k) * 0.6, 0, 0, 7); c.stroke();
    }
    c.restore();
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!G.me) return;
    const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;

    // Movimiento continuo: la velocidad sigue el ritmo real de pasos del servidor (sin arrancar/parar en cada casilla)
    for (const e of G.ents.values()) {
      const dx = e.x - e.rx, dy = e.y - e.ry, d = Math.hypot(dx, dy);
      if (d > 4) { e.rx = e.x; e.ry = e.y; e.amp = 0; continue; }
      if (d > 0.02) {
        const v = speedOf(e);
        const sp = v * (1 + 0.35 * Math.max(0, Math.min(d, 3) - 1));   // velocidad fija; solo acelera un poco si va muy atrasado
        const st = Math.min(d, sp * dt);
        e.rx += (dx / d) * st; e.ry += (dy / d) * st;
        e.phase = (e.phase || 0) + st * (Math.PI * 2 / (e.kind === 'pl' ? 3.0 : 2.2)); e.moveT = now;
        if (Math.abs(dx) > 0.02) e.face = dx < 0 ? -1 : 1;
      } else { e.rx = e.x; e.ry = e.y; }
      const moving = now - (e.moveT || 0) < 260;
      e.amp = (e.amp || 0) + ((moving ? 1 : 0) - (e.amp || 0)) * (1 - Math.exp(-dt * (moving ? 12 : 10)));
      if (e.kind === 'pl') e.fd = e.d;                       // dirección que manda el servidor: no parpadea en diagonales
    }
    const me = G.ents.get(G.id);
    const tx = me ? me.rx : G.me.x, ty = me ? me.ry : G.me.y;
    G.dbg = { tx, ty, amp: me && me.amp, phase: me && me.phase };
    G.cam.x = tx; G.cam.y = ty;     // cámara fija al jugador: el paisaje se desplaza al mismo ritmo que el paso

    c.fillStyle = '#05070a'; c.fillRect(0, 0, cw, ch);
    if (now - G.shake.t < 150) c.translate((Math.random() - 0.5) * G.shake.m, (Math.random() - 0.5) * G.shake.m);
    const frameW = Math.floor(now / 650) % 2;
    const x0 = Math.floor(G.cam.x - cw / 2 / TS) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / TS) + 1;
    const y0 = Math.floor(G.cam.y - ch / 2 / TS) - 1, y1 = Math.ceil(G.cam.y + ch / 2 / TS) + 1;

    // terreno
    const treeList = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= G.W || y >= G.H) continue;
      const t = G.tiles[y * G.W + x];
      const sx = sxOf(x), sy = syOf(y), sw = SWAY[t], nt = trReady() && (t === TILE.TREE || t === TILE.DEADTREE);
      if (nt) {                                                   // árboles nuevos: se dibujan después, por encima del terreno
        c.drawImage(t === TILE.TREE ? TEX.grass[hash(x, y) % 4] : TEX.swamp[hash(x, y) % 4], sx, sy);
        treeList.push(x, y, t);
      } else if (t === TILE.GRASS) {
        c.drawImage(TEX.grass[hash(x, y) % 4], sx, sy);
        if (hash(x * 3 + 1, y * 7) % 3 === 0) grassBlades(c, x, y, sx, sy, now);
      } else if (sw) {                                                   // árboles que se mecen con el viento
        const h = hash(x, y), v = h % 2;
        c.drawImage(TEX[sw[1]][v], sx, sy);
        const gust = Math.sin(now / 2300 + x * 0.35 + y * 0.2), ph = (h % 628) / 100;
        const k = (Math.sin(now / 760 + ph) * 0.6 + gust * 0.9) * sw[2];
        c.save(); c.translate(sx + 16, sy + 29); c.transform(1, 0, k, 1 + Math.sin(now / 520 + ph) * 0.006, 0, 0); c.drawImage(TEXFG[sw[0]][v], -16, -29); c.restore();
        if (t === TILE.TREE && (h & 7) === 0 && now - lastLeaf > 380) { lastLeaf = now; G.leaves.push({ x: x + 0.3 + Math.random() * 0.4, y: y + 0.2 + Math.random() * 0.3, t: now, p: Math.random() * 6 }); }
      } else if (t === TILE.WATER) drawWater(c, x, y, sx, sy, now);
      else { c.drawImage(texFor(t, x, y, frameW), sx, sy); if (t === TILE.CLOUDF) cloudFloorFx(c, x, y, sx, sy, now); else if (t === TILE.CLOUDW) cloudWallFx(c, x, y, sx, sy, now); else if (t === TILE.WEBF) webFloorFx(c, x, y, sx, sy, now); else if (t === TILE.WEBW) webWallFx(c, x, y, sx, sy, now); else if (t === TILE.AQF) aqFloorFx(c, x, y, sx, sy, now); else if (t === TILE.AQW) aqWallFx(c, x, y, sx, sy, now); }
    }
    for (let i = 0; i < treeList.length; i += 3) drawNewTree(c, treeList[i], treeList[i + 1], treeList[i + 2], now);
    drawLeaves(c, now);
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
    // tinte de zona (clima)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= G.W || y >= G.H) continue;
      const tn = zoneAt(x, y).tint; if (!tn) continue;
      c.fillStyle = tn; c.fillRect(sxOf(x), syOf(y), TS, TS);
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
      const gcol = g.n > 1 ? null : (G.items[top[0]] && G.items[top[0]].type === 'gem') ? G.items[top[0]].col : top[4] ? G.rar.ancient : top[3] > 0 ? G.rar.plus : null;
      if (gcol) { const gl = c.createRadialGradient(cx, cy, 2, cx, cy, 17); gl.addColorStop(0, gcol + 'cc'); gl.addColorStop(1, gcol + '00'); c.fillStyle = gl; c.beginPath(); c.arc(cx, cy, 17, 0, 7); c.fill(); c.fillStyle = '#fff'; }
      c.font = '20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const gf = g.n === 1 && d && gearReady() && GJ[iconKey(top[0])];
      if (gf) c.drawImage(gearImg, gf[0], gf[1], gf[2], gf[3], cx - 12, cy - 12, 24, 24);
      else c.fillText(g.n > 1 ? '👝' : (d ? d.icon : '?'), cx, cy);
      if (g.n === 1 && d && Math.abs(g.x - G.cam.x) < 4 && Math.abs(g.y - G.cam.y) < 3 && (top[3] > 0 || top[4] || !gcol)) {
        const nm = isGear(top[0]) ? itName([top[0], 1, top[3], top[4]]) : d.name;
        outlined(c, nm, cx, cy - 18, gcol || (isGear(top[0]) ? G.rar.normal : G.rar.none), 'bold 10px "Segoe UI", sans-serif');
      }
      if (g.n > 1) outlined(c, '×' + g.n, cx + 11, cy + 9, '#f2d27a', 'bold 10px sans-serif');
      else if (top[1] > 1) outlined(c, String(top[1]), cx + 10, cy + 9, '#f2d27a', 'bold 10px sans-serif');
      if (top[2]) c.fillText('🔒', cx - 9, cy - 9);
    }
    // PNJ
    for (const n of G.npcs) {
      if (n.x < x0 || n.x > x1 || n.y < y0 || n.y > y1) continue;
      const cx = sxOf(n.x) + TS / 2, cy = syOf(n.y) + TS / 2;
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, cy + 12, 11, 4, 0, 0, 7); c.fill();
      const ns = sprReady() && SPR['npc_' + n.id];
      if (ns) {
        drawSprite(c, 'npc_' + n.id, 0, cx, cy + 14, false, 1 + Math.sin(now / 600 + n.x) * 0.015);
        outlined(c, n.name, cx, cy + 14 - ns.h - 8, '#c9a24b');
      } else {
        c.font = '28px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
        c.fillText(n.icon, cx, cy - 1);
        outlined(c, n.name, cx, cy - 26, '#c9a24b');
      }
    }
    EXT.under(c, now, cw, ch);
    // entidades ordenadas por fila
    const list = [...G.ents.values()].sort((a, b) => a.ry - b.ry);
    const tgId = G.me.tg;
    for (const e of list) {
      const sx = Math.round((e.rx - G.cam.x) * TS + cw / 2 - TS / 2), sy = Math.round((e.ry - G.cam.y) * TS + ch / 2 - TS / 2);
      if (sx < -TS * 2 || sy < -TS * 2 || sx > cw + TS || sy > ch + TS) continue;
      if (e.id === tgId) {
        c.strokeStyle = `rgba(255,70,50,${0.7 + 0.3 * Math.sin(now / 150)})`; c.lineWidth = 2; c.strokeRect(sx + 1, sy + 1, TS - 2, TS - 2);
      }
      if (e.kind === 'pl' && e.v > 0) drawAura(c, e, sx + TS / 2, sy + TS / 2, now);
      if (e.kind === 'pl') drawPlayer(c, e, sx, sy, now); else drawMonster(c, e, sx, sy, now);
      const cx = sx + TS / 2;
      if (e.kind === 'pl') {
        const top = sy - 14;
        hpBar(c, cx, top, 28, e.h / e.H);
        outlined(c, `${e.gl ? '‹' + e.gl + '› ' : ''}${e.n} [${e.l}]${e.k ? ' ⚔' : ''}${e.tr ? ' 🤝' : ''}${e.o ? ' (ausente)' : ''}`, cx, top - 8, e.id === G.id ? '#c9a24b' : '#e8e2d0');
        if (e.tt) outlined(c, e.tt, cx, top - 19, '#9fd0ff', 'italic 10px "Segoe UI", sans-serif');
      } else {
        const d = G.mons[e.t] || {}; const sp0 = sprReady() && SPR[e.t];
        const top = sp0 ? sy + TS - 4 - sp0.h - 8 : sy - (d.boss ? 18 : 6);
        hpBar(c, cx, top, d.boss ? 40 : 28, e.h / e.H);
        outlined(c, d.name || '?', cx, top - 8, d.boss ? '#ff9c80' : '#d8d2c0');
        if (d.lv) outlined(c, 'lvl ' + d.lv, cx, top - 18, lvColor(d.lv), 'bold 9px "Segoe UI", system-ui, sans-serif');
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
    for (const p of G.proj) if (!p.hit && now - p.t >= p.T) { p.hit = true; impact(p, now); }
    G.proj = G.proj.filter((p) => now - p.t < p.T + 20);
    G.casts = G.casts.filter((k) => now - k.t < 420); for (const k of G.casts) drawCast(c, k, now);
    G.bolts = G.bolts.filter((b) => now - b.t < 260); for (const b of G.bolts) drawBolt(c, b, now);
    for (const p of G.proj) drawProj(c, p, now, dt);
    G.flashes = G.flashes.filter((f) => now - f.t < 1100); for (const f of G.flashes) drawFlash(c, f, now);
    drawRings(c, now); stepParts(c, dt);
    G.texts = G.texts.filter((t) => now - t.t < 1000);
    for (const t of G.texts) {
      const a = 1 - (now - t.t) / 1000;
      c.globalAlpha = Math.min(1, a * 1.6);
      outlined(c, t.v, sxOf(t.x) + TS / 2 + t.dx * (1 - a), syOf(t.y) - 4 - (1 - a) * 30, TXT_COL[t.c] || '#fff', t.big ? 'bold 20px "Segoe UI", sans-serif' : 'bold 14px "Segoe UI", sans-serif');
      c.globalAlpha = 1;
    }
    EXT.draw(c, now, cw, ch, dt, tx, ty);
    // oscuridad en mazmorras
    const zk = zoneAt(G.me.x, G.me.y).kind;
    if (zk === 'dungeon') {
      const px = (tx - G.cam.x) * TS + cw / 2, py = (ty - G.cam.y) * TS + ch / 2;
      const lit = 70 + 22 * Math.min(4, G.me.v || 0);
      const g = c.createRadialGradient(px, py, lit, px, py, Math.max(cw, ch) * 0.62 + lit * 0.4);
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
    if (EXT.key(k, ev)) { ev.preventDefault(); return; }
    if (k === 'enter') { ev.preventDefault(); if (!chatOpen()) setChat(true); chatIn.focus(); return; }
    if (k === 'tab') { ev.preventDefault(); setChat(!chatOpen()); return; }
    if (k === 'escape') { if (!ctxEl.hidden) closeCtx(); else if (!$('#drops').hidden) closeDrops(); else if (G.trade) send({ t: 'trade_no' }); else if (G.bankOpen) closeBank(); else if (G.shopOpen) closeShop(); else { send({ t: 'target', id: null }); G.path = []; } return; }
    if (KEYDIR[k]) { ev.preventDefault(); held.add(k); G.path = []; return; }
    if (k === 'z') send({ t: 'style', s: 'melee' });
    else if (k === 'x') send({ t: 'style', s: 'ranged' });
    else if (k === 'c') send({ t: 'style', s: 'magic' });
    else if (k === 'h') send({ t: 'potion', k: 'heal' });
    else if (k === 'j') send({ t: 'potion', k: 'mana' });
    else if (k === 'v') send({ t: 'spell' });
    else if (k === 'k') send({ t: 'eat' });
    else if (k === 'e' || k === ' ') { ev.preventDefault(); send({ t: 'pickup' }); }
  });
  window.addEventListener('keyup', (ev) => { held.delete(ev.key.toLowerCase()); });
  window.addEventListener('blur', () => held.clear());

  let wasMoving = false;
  setInterval(() => {
    if (!joined) return;
    let dx = 0, dy = 0;
    for (const k of held) { dx += KEYDIR[k][0]; dy += KEYDIR[k][1]; }
    dx += EXT.joy.dx; dy += EXT.joy.dy;
    dx = Math.sign(dx); dy = Math.sign(dy);
    if (dx || dy) { if (EXT.joy.dx || EXT.joy.dy) G.path = []; send({ t: 'move', dx, dy }); wasMoving = true; }
    else if (wasMoving) { send({ t: 'move', dx: 0, dy: 0 }); wasMoving = false; }
  }, 80);

  document.querySelectorAll('#hotbar button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.style) send({ t: 'style', s: b.dataset.style });
    else if (b.dataset.pot) send({ t: 'potion', k: b.dataset.pot });
    else if (b.dataset.spell) send({ t: 'spell' });
    else if (b.dataset.food) send({ t: 'eat' });
  }));

  /* ---- chat plegable ---- */
  let unread = 0;
  function setChat(open) {
    $('#chat').classList.toggle('closed', !open);
    $('#chatToggle').setAttribute('aria-expanded', String(open));
    if (open) { unread = 0; $('#chatUnread').hidden = true; const l = $('#log'); l.scrollTop = l.scrollHeight; }
    store.set('eldoria.chat', open ? '1' : '0');
  }
  const chatOpen = () => !$('#chat').classList.contains('closed');
  $('#chatToggle').addEventListener('click', () => setChat(!chatOpen()));
  if (store.get('eldoria.chat') === '0') setChat(false);

  /* ---- clic en el mapa: atacar, hablar o caminar ---- */
  const tileAt = (ev) => {
    const r = cv.getBoundingClientRect();
    return { x: Math.round((ev.clientX - r.left - cw / 2) / TS + G.cam.x), y: Math.round((ev.clientY - r.top - ch / 2) / TS + G.cam.y) };
  };
  const entAtTile = (t) => {
    let best = null;
    for (const e of G.ents.values()) if (e.id !== G.id && Math.round(e.x) === t.x && Math.round(e.y) === t.y) best = e;
    if (best) return best;
    for (const e of G.ents.values()) {                                  // jefes enormes: se pueden elegir clicando en su cuerpo
      const sp = e.kind === 'mo' && SPR[e.t];
      if (!sp || sp.h < 100) continue;
      const hw = Math.min(5, sp.f[0][2] / TS / 2 * 0.7), hh = sp.h / TS * 0.9;
      if (Math.abs(t.x - e.x) <= hw && t.y <= Math.round(e.y) + 0.5 && t.y >= Math.round(e.y) - hh) return e;
    }
    return null;
  };
  cv.addEventListener('contextmenu', (ev) => {
    ev.preventDefault(); if (!G.me) return;
    const tl = tileAt(ev), e = entAtTile(tl);
    if (!e) {
      const gt = G.ground.find((g) => g.x === tl.x && g.y === tl.y);
      if (gt) {
        const rows = [{ hdr: 'Botín del suelo' }];
        for (const it of gt.it) {
          const d = G.items[it[0]]; if (!d) continue;
          const lbl = it[0] === 'gold' ? it[1] + ' monedas de oro' : isGear(it[0]) ? itName([it[0], 1, it[3], it[4]]) : (it[1] > 1 ? it[1] + 'x ' : '') + d.name;
          rows.push({ label: 'Recoger ' + lbl + (it[2] ? ' 🔒' : ''), color: isGear(it[0]) ? (it[4] ? G.rar.ancient : it[3] > 0 ? G.rar.plus : null) : null, fn: () => { send({ t: 'pick', gid: it[5] }); if (G.me.x !== gt.x || G.me.y !== gt.y) walkTo(gt.x, gt.y); } });
        }
        if (gt.n > gt.it.length) rows.push({ label: '… y más objetos (pisa la casilla)', fn: () => walkTo(gt.x, gt.y) });
        if (rows.length > 1) openCtx(ev, rows);
      } else { const xr = EXT.ctx(tl); if (xr) openCtx(ev, xr); }
      return;
    }
    if (e.kind === 'mo') { const d = G.mons[e.t]; if (!d) return; openCtx(ev, [{ hdr: d.name, color: d.boss ? '#ff9c80' : null }, { label: 'Ver botín y datos', fn: () => showDrops(e.t) }, { label: 'Atacar', fn: () => send({ t: 'target', id: e.id }) }]); }
    else openCtx(ev, [{ hdr: e.n }, { label: 'Comerciar', fn: () => send({ t: 'trade_req', id: e.id }) }, { label: 'Invitar al grupo', fn: () => send({ t: 'p_inv', id: e.id }) }, { label: 'Invitar al gremio', fn: () => send({ t: 'g_inv', id: e.id }) }, { label: 'Atacar', fn: () => send({ t: 'target', id: e.id }) }]);
  });
  cv.addEventListener('mousemove', (ev) => {
    if (!G.me) return;
    const t = tileAt(ev);
    cv.style.cursor = entAtTile(t) ? 'crosshair' : G.npcs.some((n) => n.x === t.x && n.y === t.y) ? 'help' : 'default';
  });
  cv.addEventListener('mousedown', (ev) => {
    if (!G.me || ev.button !== 0) return;       // el clic derecho solo abre el menú
    if (typing()) chatIn.blur();
    const t = tileAt(ev);
    const e = entAtTile(t);
    if (e) { send({ t: 'target', id: e.id }); G.path = []; return; }
    const n = G.npcs.find((q) => q.x === t.x && q.y === t.y);
    if (n) { send({ t: 'npc', id: n.id }); return; }
    if (EXT.click(t, ev)) return;
    send({ t: 'target', id: null });
    walkTo(t.x, t.y);
  });

  const BLOCK = new Set([TILE.WATER, TILE.TREE, TILE.WALL, TILE.ROCK, TILE.PALM, TILE.PINE, TILE.DEADTREE, TILE.CACTUS, TILE.ICEBLOCK, TILE.BOG, TILE.CWALL, TILE.LAVA, TILE.CLOUDW, TILE.WEBW, TILE.AQW]);
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
  Object.assign(EXT, {
    itemRow, toast, fmt, itName, iconNode, drawSpriteS, SPR, sprImg, sprReady, sprFrame, burst, ring, openCtx, walkTo, outlined, hpBar,
    addFx: (f) => addFx(f, performance.now()), sxOf, syOf, TS, shade, send, closeCtx, itColor, rarOf, connect,
  });
})();
