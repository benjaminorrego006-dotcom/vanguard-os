// js/core/recordatorios-calculo.js
// Cálculo puro de los avisos (docs/RECORDATORIOS-PLAN.md, F3): con los
// datos y las preferencias arma la lista de recordatorios entre `desde` y
// `hasta`. No toca la base ni la red (eso está en core/recordatorios.js), así
// se puede probar en Node con la zona de Chile.
//
// Las horas son locales ('HH:MM', hora de Chile en el teléfono). El instante
// se arma con new Date(año, mes, día, h, m) en la zona del dispositivo, así
// el cambio de horario lo resuelve el propio Date: 09:00 es 12:00 UTC en
// horario de verano y 13:00 UTC en invierno. envia_en va como instante ISO
// (UTC), que es lo que guarda la tabla.
//
// Ids estables, para reemplazar sin duplicar: habito:<id>:<día>,
// tarea:<id>:<día>, cobro:<id>:<día del cobro>, resumen:<día>.
import { diaKeyDe, sumarDias, fechaLocalDe } from '../utils/fecha.js';
import { formatCurrency } from '../utils/currency.js';
import { habitoDiaAplicable, habitoCumplidoEnFecha } from '../utils/habito-dias.js';
import { proximaFechaRecurrente, claveEnMes } from '../utils/recurrentes.js';

export const PREFIJOS_RECORDATORIO = ['habito:', 'tarea:', 'cobro:', 'resumen:'];

// Todo apagado al principio.
export const PREFS_RECORDATORIOS_DEFAULT = {
  habitos: { activo: false, horas: {} }, // horas: { [habitoId]: 'HH:MM' } (sin hora, ese hábito no avisa)
  tareas: { activo: false, hora: '09:00' },
  cobros: { activo: false, hora: '20:00' },
  resumen: { activo: false, hora: '08:00' }
};

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;
const hora = (v, porDefecto) => (typeof v === 'string' && HORA_VALIDA.test(v) ? v : porDefecto);

// Completa lo que falte con los valores por defecto (prefs viejas o rotas).
export function normalizarPrefs(p) {
  const d = PREFS_RECORDATORIOS_DEFAULT;
  const x = p && typeof p === 'object' ? p : {};
  const horas = {};
  const hh = x.habitos && x.habitos.horas && typeof x.habitos.horas === 'object' ? x.habitos.horas : {};
  Object.keys(hh).forEach(id => { if (HORA_VALIDA.test(hh[id])) horas[id] = hh[id]; });
  return {
    habitos: { activo: !!(x.habitos && x.habitos.activo), horas },
    tareas: { activo: !!(x.tareas && x.tareas.activo), hora: hora(x.tareas && x.tareas.hora, d.tareas.hora) },
    cobros: { activo: !!(x.cobros && x.cobros.activo), hora: hora(x.cobros && x.cobros.hora, d.cobros.hora) },
    resumen: { activo: !!(x.resumen && x.resumen.activo), hora: hora(x.resumen && x.resumen.hora, d.resumen.hora) }
  };
}

// Instante local del día `clave` a la hora 'HH:MM'.
export function instanteLocal(clave, hhmm) {
  const base = fechaLocalDe(clave);
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// ¿El hábito todavía pide marcarse ese día? Aplica, no está cumplido y, si
// es semanal, la semana (lunes a domingo) todavía no llegó al objetivo.
function habitoPendiente(h, dia) {
  if (h.archivado || h.eliminado) return false;
  if (!habitoDiaAplicable(h, dia)) return false;
  if (habitoCumplidoEnFecha(h, dia)) return false;
  const f = h.frecuencia || { tipo: 'diario' };
  if (f.tipo === 'semanal') {
    const lunes = sumarDias(dia, -((fechaLocalDe(dia).getDay() + 6) % 7));
    let hechos = 0;
    for (let i = 0; i < 7; i++) if (habitoCumplidoEnFecha(h, sumarDias(lunes, i))) hechos++;
    if (hechos >= (Number(f.vecesObjetivo) || 1)) return false;
  }
  return true;
}

// datos: { habitos, tareas (Lista), recurrentes }. desde / hasta: Date.
// Devuelve [{ id, envia_en (ISO), titulo, cuerpo, url }], por envia_en.
export function calcularRecordatorios(datos, prefsCrudas, desde, hasta) {
  const prefs = normalizarPrefs(prefsCrudas);
  const habitos = (datos && datos.habitos) || [];
  const tareas = ((datos && datos.tareas) || []).filter(t => t && t.status !== 'done' && typeof t.dueDate === 'string' && t.dueDate);
  const recurrentes = (datos && datos.recurrentes) || [];
  const t0 = desde.getTime(), t1 = hasta.getTime();
  const out = [];
  const agregar = (id, instante, titulo, cuerpo, url) => {
    const t = instante.getTime();
    if (t > t0 && t <= t1) out.push({ id, envia_en: instante.toISOString(), titulo, cuerpo, url });
  };

  // Días del rango, de `desde` a `hasta` (claves locales).
  const dias = [];
  for (let d = diaKeyDe(desde), fin = diaKeyDe(hasta); d <= fin; d = sumarDias(d, 1)) dias.push(d);

  if (prefs.habitos.activo) {
    habitos.forEach(h => {
      const hh = prefs.habitos.horas[h.id];
      if (!hh) return;
      dias.forEach(dia => {
        if (!habitoPendiente(h, dia)) return;
        const cuerpo = h.meta && Number(h.meta.cantidad) > 0
          ? `Todavía no llegas a tu meta de hoy: ${`${h.meta.cantidad} ${h.meta.unidad || ''}`.trim()}.`
          : 'Todavía no lo marcas hoy.';
        agregar(`habito:${h.id}:${dia}`, instanteLocal(dia, hh), h.nombre || 'Hábito', cuerpo, './#habitos');
      });
    });
  }

  if (prefs.tareas.activo) {
    tareas.forEach(t => {
      if (!dias.includes(t.dueDate)) return;
      agregar(`tarea:${t.id}:${t.dueDate}`, instanteLocal(t.dueDate, prefs.tareas.hora), `Vence hoy: ${t.title || 'Tarea'}`, 'Tarea de Lista.', './#tareas');
    });
  }

  if (prefs.cobros.activo) {
    recurrentes.forEach(r => {
      if (!r || !r.dayOfMonth) return;
      const primera = proximaFechaRecurrente(r);
      [primera, claveEnMes(primera, 1, r.dayOfMonth)].forEach(fechaCobro => {
        const aviso = sumarDias(fechaCobro, -1);
        agregar(`cobro:${r.id}:${fechaCobro}`, instanteLocal(aviso, prefs.cobros.hora), `Mañana se cobra ${r.label || 'un cobro recurrente'}`, `${formatCurrency(Number(r.amount) || 0)}.`, './#finanzas');
      });
    });
  }

  if (prefs.resumen.activo) {
    dias.forEach(dia => {
      const n = tareas.filter(t => t.dueDate === dia).length;
      const m = habitos.filter(h => habitoPendiente(h, dia)).length;
      if (!n && !m) return;
      agregar(`resumen:${dia}`, instanteLocal(dia, prefs.resumen.hora), 'Tu día en Vanguard', `Hoy: ${plural(n, 'tarea', 'tareas')}, ${plural(m, 'hábito', 'hábitos')}.`, './#dashboard');
    });
  }

  return out.sort((a, b) => a.envia_en.localeCompare(b.envia_en) || a.id.localeCompare(b.id));
}
