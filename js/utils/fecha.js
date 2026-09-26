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

// Clave de día en hora LOCAL ("2026-09-03"), no UTC. Mismo motivo que
// mesKeyDe: toISOString() convierte a UTC primero, así que una fecha
// calculada en local (ej. el próximo vencimiento de una tarea recurrente)
// puede caer en el día siguiente para un usuario al oeste de UTC (o el
// anterior, al este) si se le hace toISOString().slice(0,10) en vez de
// esto.
export const diaKeyDe = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};

// Helpers de formato visible (no de clave). Locale 'es-CL' fijo en los
// cinco — antes convivían 'es-CL' (plata, desde P2), 'es-ES' (la mayoría de
// las fechas) y una sola llamada sin locale (el del navegador de cada
// quien). Un mismo día podía mostrarse distinto según el formateador que lo
// tocara; fijar 'es-CL' en todos lados evita eso.

// "3 sept"
export const formatFechaCorta = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  return f.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

// "3 sept 2026"
export const formatFechaLarga = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  return f.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

// "septiembre"
export const formatMes = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  return f.toLocaleDateString('es-CL', { month: 'long' });
};

// "3 sept · 14:30". hour12:false a propósito: 'es-CL' sin esa opción da
// 12 horas con "a. m./p. m." (ej. "02:30 p. m."), no el formato 24h que
// usa el resto de la app.
export const formatFechaHora = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  const fecha = f.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  const hora = f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fecha} · ${hora}`;
};

// "L" (weekday narrow, para la tira de 7 días de rutinas-lista.js). OJO:
// bajo 'es-CL' martes y miércoles dan la misma letra ("M") — a diferencia
// de 'es-ES', que distingue miércoles con "X" — porque el narrow weekday
// de Chile no usa esa convención. Es una decisión consciente a favor de un
// solo locale consistente en toda la app.
export const formatDiaSemana = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  return f.toLocaleDateString('es-CL', { weekday: 'narrow' });
};

// Días de calendario entre dos claves diaKeyDe ('YYYY-MM-DD'). Positivo si
// claveHasta es posterior a claveDesde. Las claves se comparan como fechas
// de calendario puras vía Date.UTC (sin huso horario): con medianoches
// LOCALES, el cambio de horario deja días de 23 o 25 horas (en Chile, el
// 6 de septiembre ni siquiera tiene 00:00) y cualquier cuenta en ms se
// descuadra. Toda diferencia de días de la app pasa por acá.
export const diasEntre = (claveDesde, claveHasta) => {
  const [ya, ma, da] = claveDesde.split('-').map(Number);
  const [yb, mb, db] = claveHasta.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
};

// Clave del día `n` días después (o antes, si es negativo) de `clave`.
// Avanza con el calendario (new Date(y, m, d + n)), nunca sumando ms.
export const sumarDias = (clave, n) => {
  const [y, m, d] = clave.split('-').map(Number);
  return diaKeyDe(new Date(y, m - 1, d + n));
};

// Clave de día local de un valor guardado, que en la app puede ser una
// clave 'YYYY-MM-DD' (fechas elegidas en formularios) o un timestamp/ISO
// completo (lo que se registra al momento). OJO: new Date('YYYY-MM-DD') se
// interpreta en UTC y, al oeste de UTC, diaKeyDe lo correría al día
// anterior — por eso una clave pura se devuelve tal cual.
export const claveDiaDe = (valor) => {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  return diaKeyDe(valor instanceof Date ? valor : new Date(valor));
};
