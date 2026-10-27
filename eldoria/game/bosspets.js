'use strict';
/** Mascotas de jefe: cada jefe puede soltar una cría suya (muy rara). Dan un buen bonus de oro. */
const BIG = { coloso_ancestral: 0.3, dragon_sombra: 0.25, hidra_jade: 0.25, arcangel: 0.25 };     // sprites grandes: se dibujan más pequeños
function build(ITEMS, MONSTERS) {
  const made = [];
  for (const [type, def] of Object.entries(MONSTERS)) {
    if (!def.boss) continue;
    const id = 'pet_' + type, gold = Math.min(0.4, +(0.2 + (def.lv || 20) / 1500).toFixed(2));
    ITEMS[id] = { name: `Cría de ${def.name}`, icon: def.icon || '🐲', type: 'pet', mon: type, scale: BIG[type] || 0.45, gold, sell: 20000 + (def.lv || 20) * 150, desc: `Una cría de ${def.name} te sigue y recoge el oro. +${Math.round(gold * 100)}% de oro.` };
    def.loot.push([id, def.lv >= 150 ? 0.004 : 0.01, 1, 1]);
    made.push(id);
  }
  return made;
}
module.exports = { build };
