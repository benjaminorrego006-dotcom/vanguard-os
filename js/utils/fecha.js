// js/utils/fecha.js
// Clave de mes en hora LOCAL ("2026-08"), no UTC. Usar SIEMPRE esto en vez
// de `d.toISOString().slice(0,7)`: toISOString() convierte a UTC primero,
// así que un movimiento cargado de noche cerca de fin de mes puede caer en
// el mes siguiente para un usuario al oeste de UTC (o el anterior, al
// este) aunque su calendario local diga otra cosa.
export const mesKeyDe = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
};
