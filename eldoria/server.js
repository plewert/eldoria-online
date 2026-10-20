'use strict';
/**
 * Eldoria Online - servidor HTTP + WebSocket (sin dependencias externas).
 *   npm start            -> http://localhost:3000
 *   PORT=8080 npm start  -> otro puerto
 *   DATA_FILE=ruta.json  -> archivo de cuentas
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WSServer } = require('./game/ws');
const Store = require('./game/store');
const { Game, NAME_RE } = require('./game/game');
const { CFG } = require('./game/data');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUB = path.join(__dirname, 'public');
const store = new Store(process.env.DATA_FILE || path.join(__dirname, 'data', 'players.json'));
const game = new Game(store);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let u;
  try { u = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (u === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ online: [...game.players.values()].filter((p) => p.ws).length, monsters: game.monsters.filter((m) => !m.dead).length }));
  }
  if (u === '/') u = '/index.html';
  const fp = path.normalize(path.join(PUB, u));
  if (!fp.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(d);
  });
});

/* ---------- autenticación ---------- */
const failures = new Map();   // ip -> {n, until}
function ipOf(req) {
  const xf = req.headers['x-forwarded-for'];
  return (xf ? String(xf).split(',')[0].trim() : req.socket.remoteAddress) || '?';
}
function blocked(ip) {
  const f = failures.get(ip);
  return f && f.n >= 8 && Date.now() < f.until;
}
function fail(ip) {
  const f = failures.get(ip) || { n: 0, until: 0 };
  f.n++; f.until = Date.now() + 5 * 60 * 1000;
  failures.set(ip, f);
}

const wss = new WSServer(server, { maxPayload: 4096 });
wss.on('connection', (ws, req) => {
  const ip = ipOf(req);
  ws.p = null;
  let count = 0, windowStart = Date.now();
  const sendErr = (msg) => ws.send(JSON.stringify({ t: 'err', msg }));

  ws.on('message', (txt) => {
    // limitador de mensajes: máximo 60 por segundo
    const now = Date.now();
    if (now - windowStart > 1000) { windowStart = now; count = 0; }
    if (++count > 60) { ws.close(1008); return; }
    let msg;
    try { msg = JSON.parse(txt); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;

    if (!ws.p) {
      if (msg.t !== 'auth') return;
      if (blocked(ip)) return sendErr('Demasiados intentos fallidos. Espera unos minutos.');
      const name = String(msg.name || '').trim();
      const pass = String(msg.pass || '');
      if (!NAME_RE.test(name)) return sendErr('El nombre debe tener 3-14 letras, números o guion bajo.');
      if (pass.length < 4 || pass.length > 64) return sendErr('La contraseña debe tener entre 4 y 64 caracteres.');
      let acc = store.get(name);
      if (msg.mode === 'register') {
        if (acc) return sendErr('Ese nombre ya existe. Elige otro o inicia sesión.');
        const color = /^#[0-9a-fA-F]{6}$/.test(msg.color || '') ? msg.color : '#4aa3ff';
        acc = store.create(name, pass, color);
      } else {
        if (!acc) { fail(ip); return sendErr('Personaje no encontrado. Créalo primero.'); }
        if (!store.verify(acc, pass)) { fail(ip); return sendErr('Contraseña incorrecta.'); }
      }
      failures.delete(ip);
      game.attach(acc, ws);
      return;
    }
    game.handle(ws.p, msg);
  });
  ws.on('close', () => game.onClose(ws));
});

/* ---------- bucle del juego ---------- */
const loop = setInterval(() => {
  try { game.tick(Date.now()); } catch (e) { console.error('Error en tick:', e); }
}, CFG.TICK_MS);

function shutdown() {
  clearInterval(loop);
  try { game.saveAll(); } catch (e) { console.error(e); }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`Eldoria Online escuchando en http://localhost:${PORT}`);
  console.log(`Monstruos: ${game.monsters.length} · Cuentas: ${Object.keys(store.accounts).length}`);
});
