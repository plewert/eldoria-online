'use strict';
/** Habilidades de combate (cuerpo a cuerpo, distancia, magia): máximo 320; cada nivel cuesta más que el anterior. */
const SKILL_MAX = 320;
const LEVEL_MAX = 320;   // nivel general: tope igual al de las habilidades (vida/maná/daño dejan de crecer)
const skillXpFor = (l) => Math.round(20 * (l - 1) * (l - 1) * (1 + (l - 1) / 150));   // al principio como antes, luego cada vez más caro
const TABLE = Array.from({ length: SKILL_MAX + 1 }, (_, l) => (l ? skillXpFor(l) : 0));
const skillFromXp = (xp) => { let lo = 1, hi = SKILL_MAX; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (TABLE[mid] <= xp) lo = mid; else hi = mid - 1; } return lo; };
// bonus de daño: +5 % por nivel hasta el 100; después +1 % por nivel (así 320 no rompe el juego)
const skillMult = (l) => 1 + 0.05 * Math.min(l - 1, 99) + 0.01 * Math.max(0, l - 100);
module.exports = { LEVEL_MAX, SKILL_MAX, skillXpFor, skillFromXp, skillMult };
