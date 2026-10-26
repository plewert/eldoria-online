'use strict';
// Comprobación estática del cliente: toda función draw, render, open, show o send que se llama debe estar definida (evita pantallazos en blanco por ReferenceError).
const fs = require('fs'), path = require('path'), assert = require('assert');
const dir = path.join(__dirname, '..', 'public');
const src = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const called = new Set([...src.matchAll(/(?<![.\w$])((?:draw|render|open|close|show|on|add|send)[A-Z]\w*)\s*\(/g)].map((m) => m[1]));
const defined = new Set([...src.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_]\w*)/g)].map((m) => m[1]));
const params = new Set([...src.matchAll(/\(([^()]*)\)\s*=>|function\s*\w*\(([^()]*)\)/g)].flatMap((m) => (m[1] || m[2] || '').split(',').map((x) => x.trim().replace(/=.*/, ''))));
const missing = [...called].filter((n) => !defined.has(n) && !params.has(n));
assert.deepStrictEqual(missing, [], 'Funciones llamadas pero no definidas: ' + missing.join(', '));
console.log('  ✔ el cliente no llama a funciones inexistentes\n\n1 prueba correcta');
