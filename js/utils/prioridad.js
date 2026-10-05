// Prioridad como 1-3 barritas rellenas en violeta, no como texto — mismo
// lenguaje visual que el detalle de tarea (task-form.js). Vive acá (y no en
// views/tareas.js) porque también la usa Semana (views/planificador.js), y
// tareas.js ya importa planificador.js: el cargador de módulos (app.js,
// loadModuleGraph) no admite imports circulares.
export function renderPriorityBars(priority) {
  const level = priority === 'high' ? 3 : priority === 'low' ? 1 : 2;
  const bars = [1, 2, 3].map(i => {
    const filled = i <= level;
    const h = 5 + i * 3;
    return `<span style="display:inline-block; width:4px; height:${h}px; background:${filled ? 'var(--vi)' : 'var(--surface-2)'}; border:1px solid ${filled ? 'var(--vi)' : 'var(--surface-border)'};"></span>`;
  }).join('');
  return `<span style="display:inline-flex; align-items:flex-end; gap:2px; flex-shrink:0;" title="Prioridad">${bars}</span>`;
}
