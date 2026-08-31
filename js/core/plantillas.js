// Plantillas de rutina. Cada ejercicio referencia un `ejercicioId` del
// catálogo (ejercicios-catalogo.js) — el texto de instrucciones vive UNA
// sola vez ahí, nunca se duplica aquí. Al usar una plantilla se resuelve
// ejercicioId -> nombre para crear la rutina real (ver
// initPlantillaPreviewListeners en rutinas-lista.js).
//
// Etapa 4b: el generador de rutinas (generador-rutinas.js) es ahora el
// camino principal para empezar una rutina — arma la sesión según el nivel
// real del usuario en cada patrón de movimiento, en vez de una plantilla
// fija igual para todos. Esto ya no es "el catálogo de plantillas", son 3
// RESPALDOS DE EMERGENCIA, uno por modalidad, para el caso de que el
// generador no pueda producir nada (ej. usuario sin equipo declarado en
// GYM, donde el catálogo depende casi por completo de barra/mancuernas/
// máquina — ver hallazgo de la Etapa 4b). Elegidas por ser Principiante y,
// donde la modalidad lo permite, sin depender de equipo:
//   - gym-pecho-1: única que puede quedar corta si falta equipo, pero GYM
//     por definición asume algo de equipo — no hay forma de evitarlo del
//     todo en esta modalidad.
//   - calistenia-pecho-1: cero equipo, funciona para cualquiera.
//   - hiit-tabata-basica: cero equipo, arranca con solo un timer.
//
// Antes de esta etapa había 77 (7 por grupo muscular, ver
// RUTINAS-COMPLETAS.md / Etapa 6b) — las 74 restantes se retiraron porque
// ninguna rutina guardada del usuario depende de plantillas.js en tiempo de
// ejecución (se verificó con datos reales: al usar una plantilla se crea
// una rutina propia en IndexedDB con los nombres ya resueltos, sin
// referencia de vuelta a este archivo).
function series(n, reps) {
  return Array.from({ length: n }, () => ({ tipo: 'normal', reps, peso: 0 }));
}
function ej(ejercicioId, n, reps) {
  return { ejercicioId, series: series(n, reps) };
}

export const PLANTILLAS = {
  gym: [
    {
      id: 'gym-pecho-1',
      nombre: 'Pecho — Introducción',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de pecho nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Pecho — Introducción', ejercicios: [
          ej('press de banca con mancuernas', 3, '12'), ej('flexiones', 3, '15'), ej('aperturas con mancuernas', 3, '12'), ej('abdominales', 2, '15'), ej('elevaciones de piernas', 2, '12')
        ]}
      ]
    }
  ],

  calistenia: [
    {
      id: 'calistenia-pecho-1',
      nombre: 'Pecho — Primeros Pasos',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de pecho nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Pecho — Primeros Pasos', ejercicios: [
          ej('flexiones en pared', 3, '15'), ej('flexiones inclinadas', 3, '12'), ej('flexiones con rodillas', 3, '10'), ej('plancha', 3, '30s'), ej('plancha lateral', 2, '20s/lado')
        ]}
      ]
    }
  ],

  hiit: [
    {
      id: 'hiit-tabata-basica',
      nombre: 'Tabata Básica',
      nivel: 'Principiante',
      resumen: 'Potencia anaeróbica (4 min)',
      descripcion: 'Protocolo Tabata con 4 ejercicios de peso corporal, 2 rondas cada uno.',
      hiitSettings: { mode: 'tabata', workSecs: 20, restSecs: 10, totalRounds: 8 },
      rutinas: [
        { nombre: 'Tabata Básica', ejercicioIds: ['jumping jacks', 'escaladores', 'caminata', 'rodillas altas'] }
      ]
    }
  ]
};
