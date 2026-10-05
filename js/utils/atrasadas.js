// Atrasadas: todo lo no hecho con fecha anterior a hoy, de los dos stores
// (tareas de Lista con dueDate e ítems del planificador), sin límite hacia
// atrás. Las fechas se comparan como texto 'YYYY-MM-DD' local (diaKeyDe,
// nunca toISOString). Orden: por fecha, la más vieja primero; a igual fecha,
// las de Lista antes que las del planificador (sort estable).
// Lo usan la agenda de Hoy (fila "N atrasadas") y Semana (tira "N
// pendientes de días pasados"), así las dos cuentan lo mismo.
export function calcularAtrasadas({ tareas = [], plan = [], hoyIso }) {
  return [
    ...tareas
      .filter(t => t.status !== 'done' && t.dueDate && t.dueDate < hoyIso)
      .map(t => ({ tipo: 'tarea', id: t.id, texto: t.title, fecha: t.dueDate })),
    ...plan
      .filter(t => !t.hecha && t.fecha && t.fecha < hoyIso)
      .map(t => ({ tipo: 'plan', id: t.id, texto: t.texto, fecha: t.fecha }))
  ].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}
