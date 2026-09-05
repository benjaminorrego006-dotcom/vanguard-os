// Config compartida entre la vista de Entreno y la tarjeta miniatura del
// Dashboard, para que ambas calculen el mismo progreso semanal con los
// mismos colores por categoría.
export const WEEKLY_GOALS = { gym: 3, calistenia: 3, hiit: 2 };
// Las 3 categorías comparten familia (var(--accent-teal) es var(--cy) dentro
// de html.mk3-entreno) — antes calistenia usaba var(--accent-blue) (un azul
// pre-MK3 fuera de paleta) e hiit usaba var(--state-high) (rojo de alerta,
// no un color decorativo de categoría). Ahora las tres quedan dentro de la
// misma familia cyan, solo con distinto tono.
export const CATEGORY_COLORS = { gym: 'var(--accent-teal)', calistenia: 'var(--cy2)', hiit: 'var(--cy3)' };

// Fuente única del equipo que el generador de rutinas y el onboarding de
// nivel dejan elegir — antes vivía en generador-rutina-form.js y db.js
// validaba equipoDisponible contra una copia hardcodeada aparte, que se
// podía desincronizar en silencio si se agregaba una opción acá y no allá.
export const EQUIPO_OPCIONES = [
  { value: 'barra', label: 'Barra' },
  { value: 'mancuernas', label: 'Mancuernas' },
  { value: 'banda', label: 'Banda de resistencia' },
  { value: 'anillas', label: 'Anillas' },
  { value: 'barra-dominadas', label: 'Barra de dominadas' },
  { value: 'banco', label: 'Banco' },
  { value: 'maquina', label: 'Máquina de gimnasio' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'cajon', label: 'Cajón pliométrico' }
];
