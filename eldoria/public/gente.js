'use strict';
/* Gente del pueblo (solo visual, en el cliente): vecinos que caminan por las calles, barren, cargan cajas y entran y salen de las casas.
   Son figuras de ambiente: no se pueden atacar ni tocar, y no existen en el servidor. De noche se recogen. Se apaga con F7. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X, TS = 32;
  let ON = true; try { ON = localStorage.getItem('eldoria.gente') !== '0'; } catch (e) { /* sin storage */ }
  const hs = (x, y, k = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };
  const hour = () => (X.env ? X.env.hour() : 12);
  const tileAt = (x, y) => (x < 0 || y < 0 || x >= G.W || y >= G.H ? -1 : G.tiles[y * G.W + x]);
  const SKIN = ['#f0c8a0', '#d8a878', '#b07c54', '#8a5a3a'], HAIR = ['#3a2a1a', '#7a4a22', '#c8a050', '#222', '#a03a2a', '#ddd'], CLOTH = ['#4a6aa8', '#a84a4a', '#4a8a5a', '#8a5aa8', '#c89a3a', '#5a8aa8', '#7a7a4a'];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let town = null, walkers = [];
  const doors = () => (G.houses || []).map((h) => ({ x: h[4], y: h[3], rx: h[4], ry: h[3] + 1, rect: h }));

  const isRoad = (x, y) => tileAt(x, y) === 3 && !(G.npcTiles && G.npcTiles.has(y * G.W + x)) && !(G.decorSet && G.decorSet.has(y * G.W + x));
  function spawnIn(z) {
    const [x0, y0, x1, y1] = z.rect, n = z.id === 'ciudad' || z.id === 'ciudad_alba' ? 7 : 4, out = [];
    for (let tries = 0; out.length < n && tries < 200; tries++) {
      const x = x0 + 1 + ((Math.random() * (x1 - x0 - 1)) | 0), y = y0 + 1 + ((Math.random() * (y1 - y0 - 1)) | 0);
      if (!isRoad(x, y)) continue;
      const id = Math.random();
      out.push({ x, y, fx: x, fy: y, tx: x, ty: y, t: 0, st: 'walk', until: 0, dir: [1, 0], skin: SKIN[(id * 40 | 0) % 4], hair: HAIR[(id * 90 | 0) % 6], cloth: CLOTH[(id * 70 | 0) % 7], job: id < 0.3 ? 'box' : id < 0.5 ? 'sweep' : 'none', hat: id > 0.8, spd: 1.0 + id * 0.5, vis: 1 });
    }
    return out;
  }
  function pick(w, z, me) {                                   // elige la siguiente casilla
    const opts = DIRS.map((d) => [w.x + d[0], w.y + d[1], d]).filter(([x, y]) => isRoad(x, y) && x > z.rect[0] && x < z.rect[2] && y > z.rect[1] && y < z.rect[3] && !(me && me.x === x && me.y === y) && !walkers.some((o) => o !== w && Math.round(o.tx) === x && Math.round(o.ty) === y));
    if (!opts.length) return null;
    const straight = opts.find((o) => o[2][0] === w.dir[0] && o[2][1] === w.dir[1]);
    return straight && Math.random() < 0.7 ? straight : opts[(Math.random() * opts.length) | 0];
  }
  function update(now, dt, z) {
    const me = G.me, h = hour(), awake = h >= 6.5 && h < 20.5;
    for (const w of walkers) {
      if (!awake) { w.vis = Math.max(0, w.vis - dt * 0.8); continue; }
      w.vis = Math.min(1, w.vis + dt * 0.8);
      if (w.st === 'inside') { if (now > w.until) { w.st = 'walk'; w.x = w.tx = w.door.rx; w.y = w.ty = w.door.ry; w.t = 0; } continue; }
      if (w.st === 'sweep') { if (now > w.until) w.st = 'walk'; continue; }
      if (w.st === 'door') {                                                            // sube al umbral y entra
        w.t += dt * w.spd * 1.1; const k = Math.min(1, w.t); w.x = w.fx + (w.tx - w.fx) * k; w.y = w.fy + (w.ty - w.fy) * k;
        if (k >= 1) { w.st = 'inside'; w.until = now + 8000 + Math.random() * 9000; w.job = Math.random() < 0.3 ? 'box' : 'none'; }
        continue;
      }
      w.t += dt * w.spd; const k = Math.min(1, w.t); w.x = w.fx + (w.tx - w.fx) * k; w.y = w.fy + (w.ty - w.fy) * k;
      if (k >= 1) {
        w.fx = w.tx; w.fy = w.ty; w.t = 0; w.x = w.fx; w.y = w.fy;
        const dr = doors().find((d) => d.rx === w.fx && d.ry === w.fy);
        if (dr && Math.random() < 0.3) { w.door = dr; w.tx = dr.x; w.ty = dr.y; w.st = 'door'; w.dir = [0, -1]; continue; }
        if (w.job === 'sweep' && Math.random() < 0.12) { w.st = 'sweep'; w.until = now + 3500 + Math.random() * 3000; continue; }
        const nx = pick(w, z, me); if (nx) { w.tx = nx[0]; w.ty = nx[1]; w.dir = nx[2]; } else { w.dir = [-w.dir[0], -w.dir[1]]; w.st = 'sweep'; w.until = now + 800; }
      }
    }
  }
  function figure(c, w, now, cw, ch) {
    if (w.st === 'inside' || w.vis < 0.05) return;
    const X0 = (w.x - G.cam.x) * TS + cw / 2, Y0 = (w.y - G.cam.y) * TS + ch / 2 + 10, moving = w.st === 'walk' || w.st === 'door', ph = now / 140 + w.spd * 9, step = moving ? Math.sin(ph) * 3 : 0, bob = moving ? Math.abs(Math.sin(ph)) * 1.2 : 0;
    c.save(); c.globalAlpha = w.vis;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(X0, Y0 + 2, 8, 3, 0, 0, 7); c.fill();
    c.fillStyle = '#3a3040'; c.fillRect(X0 - 4, Y0 - 8 + step * 0.3, 3, 9); c.fillRect(X0 + 1, Y0 - 8 - step * 0.3, 3, 9);          // piernas
    c.fillStyle = w.cloth; c.fillRect(X0 - 5, Y0 - 19 - bob, 10, 12);                                                                 // cuerpo
    c.fillStyle = w.skin; c.fillRect(X0 - 7, Y0 - 17 - bob + step * 0.3, 2.5, 8); c.fillRect(X0 + 4.5, Y0 - 17 - bob - step * 0.3, 2.5, 8);
    c.beginPath(); c.arc(X0, Y0 - 24 - bob, 5, 0, 7); c.fill();                                                                       // cabeza
    c.fillStyle = w.hair; c.fillRect(X0 - 5, Y0 - 30 - bob, 10, 4); if (w.hat) { c.fillStyle = '#6a4a28'; c.fillRect(X0 - 7, Y0 - 31 - bob, 14, 2.5); c.fillRect(X0 - 4, Y0 - 35 - bob, 8, 5); }
    if (w.job === 'box' && w.st !== 'inside') { c.fillStyle = '#a8793a'; c.fillRect(X0 - 7, Y0 - 34 - bob, 14, 10); c.strokeStyle = '#6a4a22'; c.strokeRect(X0 - 6.5, Y0 - 33.5 - bob, 13, 9); c.fillStyle = w.skin; c.fillRect(X0 - 8, Y0 - 26 - bob, 3, 5); c.fillRect(X0 + 5, Y0 - 26 - bob, 3, 5); }
    if (w.job === 'sweep') {                                                                                                          // escoba
      const sw = w.st === 'sweep' ? Math.sin(now / 160) * 6 : 0; c.strokeStyle = '#7a5a30'; c.lineWidth = 2; c.beginPath(); c.moveTo(X0 + 8 + sw * 0.3, Y0 - 24); c.lineTo(X0 + 12 + sw, Y0 + 1); c.stroke();
      c.fillStyle = '#c8a050'; c.fillRect(X0 + 9 + sw, Y0 - 3, 8, 4);
      if (w.st === 'sweep' && Math.random() < 0.2) { c.fillStyle = 'rgba(190,170,130,.6)'; c.fillRect(X0 + 14 + sw + Math.random() * 6, Y0 - 2 - Math.random() * 5, 2, 2); }
    }
    c.restore();
  }
  X.on('under', (c, now, cw, ch) => {
    if (!ON || !G.me || !G.tiles) return;
    const z = X.zoneAt(G.me.x, G.me.y), dt = Math.min(0.1, (now - (update.last || now)) / 1000); update.last = now;
    if (!z || z.kind !== 'town' || !z.rect || G.me.x < z.rect[0] || G.me.x > z.rect[2]) { town = null; walkers = []; return; }
    if (town !== z.id) { town = z.id; walkers = spawnIn(z); }
    update(now, dt, z);
    for (const w of walkers.slice().sort((a, b) => a.y - b.y)) figure(c, w, now, cw, ch);
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'F7') { e.preventDefault(); ON = !ON; try { localStorage.setItem('eldoria.gente', ON ? '1' : '0'); } catch (x) { /* nada */ } if (X.toast) X.toast(ON ? 'Gente del pueblo: activada (F7)' : 'Gente del pueblo: desactivada (F7)'); } });
})();
