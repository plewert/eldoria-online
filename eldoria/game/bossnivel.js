'use strict';
/**
 * Vida de los jefes según el nivel de quien los pelea: al empezar el combate (jefe con la vida completa y alguien cerca)
 * su vida se multiplica por  1 + (nivel − 100) × 2 %  del jugador de más nivel presente, entre ×1 y ×2,5.
 * (Medusa lo hace por su cuenta, con la misma fórmula.) No afecta a las Raids, a las invocaciones ni a las criaturas normales.
 * Al morir el jefe, su vida base se restaura para que renazca y se vuelva a ajustar.
 */
const K_MIN = 1, K_MAX = 2.5, K_PER_LV = 0.02, LV_BASE = 100, NEAR = 24;
const factor = (lv) => Math.max(K_MIN, Math.min(K_MAX, 1 + (lv - LV_BASE) * K_PER_LV));

function install(Game) {
  const P = Game.prototype;
  const U0 = P.updateMonster;
  P.updateMonster = function (m, now) {
    const d = m.def;
    if (d && d.boss && !m.dead && !m.scaled && m.target && m.hp === m.maxHp && !m.parent && !m.raidRun && m.type !== 'medusa' && !/^raid_/.test(require('./world').zoneAt(m.x, m.y).id)) {
      const near = [...this.players.values()].filter((q) => !q.bot && q.hp > 0 && Math.max(Math.abs(q.x - m.x), Math.abs(q.y - m.y)) <= NEAR);
      const lv = Math.max(0, ...near.map((q) => q.level || 1));
      if (lv > 0) {
        const k = factor(lv);
        m.baseMax = m.maxHp; m.maxHp = m.hp = Math.round(m.maxHp * k); m.scaled = true; m.scaleK = k;
        for (const q of near) this.msg(q, `👑 La vida de ${d.name} se ajusta a tu nivel (${lv}): ×${k.toFixed(2)} → ${m.maxHp.toLocaleString('es')}.`, 'x');
      }
    }
    return U0.call(this, m, now);
  };
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    const r = K0.call(this, m, now);
    if (m.baseMax && m.type !== 'medusa') { m.maxHp = m.baseMax; m.baseMax = 0; m.scaled = false; }
    return r;
  };
}
module.exports = { install, factor, K_MIN, K_MAX };
