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
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      this.accounts = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('No se pudo leer', file, e.message);
    }
  }

  static keyOf(name) { return String(name).toLowerCase(); }

  get(name) { return this.accounts[Store.keyOf(name)] || null; }

  create(name, password, color) {
    const key = Store.keyOf(name);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 32).toString('hex');
    const acc = { key, name, salt, hash, color, created: Date.now(), data: null };
    this.accounts[key] = acc;
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
  }
}

module.exports = Store;
