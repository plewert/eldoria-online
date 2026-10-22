'use strict';
/**
 * Servidor WebSocket mínimo (RFC 6455) sin dependencias.
 * Soporta: handshake, mensajes de texto, fragmentación, ping/pong, cierre,
 * límite de tamaño de mensaje y enmascarado de cliente.
 * API: const wss = new WSServer(httpServer, {maxPayload});
 *      wss.on('connection', (sock, req) => { sock.on('message', txt=>{}); sock.send(txt); sock.close(); })
 */
const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class Sock extends EventEmitter {
  constructor(socket, maxPayload) {
    super();
    this.socket = socket;
    this.maxPayload = maxPayload;
    this.buf = Buffer.alloc(0);
    this.frags = [];
    this.fragLen = 0;
    this.open = true;
    this.alive = true;
    socket.setNoDelay(true);
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
  }

  get readyState() { return this.open ? 1 : 3; }

  _closed() {
    if (!this.open) return;
    this.open = false;
    this.emit('close');
  }

  _onData(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    try {
      while (this._parse()) { /* sigue */ }
    } catch (e) {
      this.close(1002);
    }
  }

  _parse() {
    const b = this.buf;
    if (b.length < 2) return false;
    const fin = (b[0] & 0x80) !== 0;
    const op = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) {
      if (b.length < 4) return false;
      len = b.readUInt16BE(2); off = 4;
    } else if (len === 127) {
      if (b.length < 10) return false;
      const hi = b.readUInt32BE(2), lo = b.readUInt32BE(6);
      if (hi !== 0) throw new Error('payload demasiado grande');
      len = lo; off = 10;
    }
    if (!masked) throw new Error('el cliente debe enmascarar');
    if (len > this.maxPayload) { this.close(1009); this.buf = Buffer.alloc(0); return false; }
    if (b.length < off + 4 + len) return false;
    const mask = b.subarray(off, off + 4);
    const payload = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) payload[i] = b[off + 4 + i] ^ mask[i & 3];
    this.buf = b.subarray(off + 4 + len);

    if (op === 0x8) { this.close(1000); return false; }
    if (op === 0x9) { this._frame(0xA, payload); return true; }
    if (op === 0xA) { this.alive = true; return true; }
    if (op === 0x1 || op === 0x2 || op === 0x0) {
      this.frags.push(payload); this.fragLen += len;
      if (this.fragLen > this.maxPayload) { this.close(1009); return false; }
      if (fin) {
        const full = this.frags.length === 1 ? this.frags[0] : Buffer.concat(this.frags);
        this.frags = []; this.fragLen = 0;
        this.emit('message', full.toString('utf8'));
      }
      return true;
    }
    throw new Error('opcode desconocido');
  }

  _frame(op, payload) {
    if (!this.open) return;
    const len = payload.length;
    let head;
    if (len < 126) { head = Buffer.from([0x80 | op, len]); }
    else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6); }
    try { this.socket.write(Buffer.concat([head, payload])); } catch (e) { /* cerrado */ }
  }

  send(text) {
    if (!this.open) return;
    // Si el cliente va muy atrasado, no acumulamos memoria sin límite.
    if (this.socket.writableLength > 2 * 1024 * 1024) { this.close(1013); return; }
    this._frame(0x1, Buffer.from(text, 'utf8'));
  }

  ping() { this.alive = false; this._frame(0x9, Buffer.alloc(0)); }

  close(code = 1000) {
    if (!this.open) return;
    const p = Buffer.alloc(2); p.writeUInt16BE(code, 0);
    this._frame(0x8, p);
    this.open = false;
    try { this.socket.end(); } catch (e) { /* nada */ }
    setTimeout(() => { try { this.socket.destroy(); } catch (e) { /* nada */ } }, 500).unref();
    this.emit('close');
  }
}

class WSServer extends EventEmitter {
  constructor(httpServer, opts = {}) {
    super();
    this.maxPayload = opts.maxPayload || 4096;
    this.clients = new Set();
    httpServer.on('upgrade', (req, socket) => {
      const key = req.headers['sec-websocket-key'];
      if ((req.headers.upgrade || '').toLowerCase() !== 'websocket' || !key) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return;
      }
      const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
        'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n');
      const sock = new Sock(socket, this.maxPayload);
      this.clients.add(sock);
      sock.on('close', () => this.clients.delete(sock));
      this.emit('connection', sock, req);
    });
    // Latido: cierra conexiones muertas.
    this.timer = setInterval(() => {
      for (const c of this.clients) {
        if (!c.alive) { c.close(1001); continue; }
        c.ping();
      }
    }, 30000);
    this.timer.unref();
  }
}

module.exports = { WSServer };
