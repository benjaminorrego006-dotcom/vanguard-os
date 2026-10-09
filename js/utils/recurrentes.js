// js/utils/recurrentes.js
// Próxima fecha de cobro de una recurrente. Vive acá (y no dentro de db.js)
// para que también la use el cálculo de recordatorios, que es puro.
import { diaKeyDe, claveDiaDe } from './fecha.js';

// Clave del día `dia` en el mes `mesOffset` meses después del de `clave`
// (dayOfMonth se limita a 28 en la UI, así que no hay desborde de mes).
export function claveEnMes(clave, mesOffset, dia) {
  const [y, m] = clave.split('-').map(Number);
  return diaKeyDe(new Date(y, m - 1 + mesOffset, dia));
}

// Próxima fecha pendiente de una recurrente ('YYYY-MM-DD'): el día
// dayOfMonth del mes de lastProcessed (o de createdAt si nunca se procesó)
// y, si ya se procesó o se creó ese mismo día o después, el del mes
// siguiente. La usan processRecurringTransactions (para generar),
// getProyeccionRecurrentes (para avisar) y los recordatorios — mismo
// cálculo, sin guardar ningún "nextDate". El único candado contra procesar
// dos veces la misma recurrencia es lastProcessed (los ids de las
// transacciones generadas son aleatorios). lastProcessed se guarda como
// clave, pero puede venir como ISO de versiones anteriores (toISOString()
// de las 00:00 locales): claveDiaDe acepta ambos y da el mismo día local.
// OJO: nunca new Date(lastProcessed) con una clave — se leería en UTC (en
// Chile, el día anterior), el mes base podría retroceder uno y duplicar la
// recurrencia.
export function proximaFechaRecurrente(req) {
  const base = claveDiaDe(req.lastProcessed || req.createdAt);
  const enMesBase = claveEnMes(base, 0, req.dayOfMonth);
  return (base >= enMesBase || req.lastProcessed) ? claveEnMes(enMesBase, 1, req.dayOfMonth) : enMesBase;
}
