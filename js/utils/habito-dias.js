// js/utils/habito-dias.js
// Hábitos con frecuencia: "¿aplica este día?" y "¿se cumplió?". Viven acá
// (y no dentro de db.js) para que también los use el cálculo de
// recordatorios (core/recordatorios-calculo.js), que es puro.
//
// habito.frecuencia = { tipo: 'diario' } (default, todo día aplica) |
// { tipo: 'dias', dias: [0..6] } (0=lunes..6=domingo, mismo orden que
// DOW_SHORT en habitos.js) | { tipo: 'semanal', vecesObjetivo: N }.
// habito.meta = { cantidad, unidad } opcional — si existe, marcas[fecha]
// guarda la CANTIDAD registrada ese día (número), no un booleano, y
// "cumplido" pasa a ser "llegó a la meta" en vez de "tiene una marca".

const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export function habitoDiaAplicable(habito, fechaIso) {
  const frecuencia = habito.frecuencia || { tipo: 'diario' };
  if (frecuencia.tipo !== 'dias') return true; // diario y semanal: no hay días "no aplicables" a nivel día individual
  const d = new Date(fechaIso + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7; // reindexa domingo=0 a lunes=0
  return (frecuencia.dias || []).includes(dow);
}

export function habitoCumplidoEnFecha(habito, fechaIso) {
  const valor = (habito.marcas || {})[fechaIso];
  if (habito.meta && numero(habito.meta.cantidad) > 0) {
    // Una marca "true" (booleana) es de ANTES de que el hábito tuviera meta
    // numérica -- el usuario lo dio por cumplido bajo esas reglas viejas, así
    // que se sigue contando como completo en vez de compararla como si fuera
    // un número (Number(true) da 1, lo que rompería la racha para cualquier
    // meta real y además rompería el toggle en la UI).
    if (valor === true) return true;
    return numero(valor) >= numero(habito.meta.cantidad);
  }
  return !!valor;
}
