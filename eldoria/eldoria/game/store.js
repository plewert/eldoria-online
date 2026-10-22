'use strict';
/**
 * Almacenamiento de cuentas en un archivo JSON (data/players.json).
 * Escritura diferida y atómica (archivo temporal + rename).
 * Las contraseñas se guardan con scrypt + sal aleatoria; nunca en texto plano.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Store {
  constructor(file) {
    this.file = file;
    this.accounts = {};
    this.timer = null;
    this.dirty = new Set();
    this.remote = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? { url: process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, ''), token: process.env.UPSTASH_REDIS_REST_TOKEN } : null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      this.accounts = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('No se pudo leer', file, e.message);
    }
  }

  /** Llama a Upstash Redis (REST). Las cuentas viven en un hash: un campo por cuenta. */
  async cmd(args) {
    const r = await fetch(this.remote.url, {
      method: 'POST', headers: { Authorization: 'Bearer ' + this.remote.token, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
    });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status);
    return j.result;
  }

  /** Carga las cuentas guardadas en la base remota (si está configurada). */
  async init() {
    if (!this.remote) return;
    const flat = await this.cmd(['HGETALL', 'eldoria:accounts']);
    let n = 0;
    for (let i = 0; i < (flat || []).length; i += 2) {
      try { this.accounts[flat[i]] = JSON.parse(flat[i + 1]); n++; } catch (e) { console.error('Cuenta dañada', flat[i]); }
    }
    // cuentas que solo existían en el archivo local y aún no están en la base
    for (const k of Object.keys(this.accounts)) if (!(flat || []).includes(k)) this.dirty.add(k);
    console.log(`Base remota conectada: ${n} cuentas cargadas.`);
    if (this.dirty.size) await this.flushRemote();
  }

  async flushRemote() {
    if (!this.remote || !this.dirty.size) return;
    const keys = [...this.dirty]; this.dirty.clear();
    const args = ['HSET', 'eldoria:accounts'];
    for (const k of keys) if (this.accounts[k]) args.push(k, JSON.stringify(this.accounts[k]));
    if (args.length === 2) return;
    try { await this.cmd(args); } catch (e) { keys.forEach((k) => this.dirty.add(k)); console.error('Error guardando en la base remota:', e.message); }
  }

  static keyOf(name) { return String(name).toLowerCase(); }

  get(name) { return this.accounts[Store.keyOf(name)] || null; }

  create(name, password, color) {
    const key = Store.keyOf(name);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 32).toString('hex');
    const acc = { key, name, salt, hash, color, created: Date.now(), data: null };
    this.accounts[key] = acc;
    this.dirty.add(key);
    this.touch();
    return acc;
  }

  verify(acc, password) {
    const h = crypto.scryptSync(password, acc.salt, 32);
    const want = Buffer.from(acc.hash, 'hex');
    return h.length === want.length && crypto.timingSafeEqual(h, want);
  }

  saveData(key, data) {
    const acc = this.accounts[key];
    if (!acc) return;
    acc.data = data;
    this.dirty.add(key);
    this.touch();
  }

  touch() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 2000);
    this.timer.unref();
  }

  flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const tmp = this.file + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(this.accounts));
      fs.renameSync(tmp, this.file);
    } catch (e) {
      console.error('Error guardando cuentas:', e.message);
    }
    return this.flushRemote();
  }
}

module.exports = Store;
