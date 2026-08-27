// Plantillas de rutina. Cada ejercicio referencia un `ejercicioId` del
// catálogo (ejercicios-catalogo.js) — el texto de instrucciones vive UNA
// sola vez ahí, nunca se duplica aquí. Al usar una plantilla se resuelve
// ejercicioId -> nombre para crear la rutina real (ver
// initPlantillaPreviewListeners en rutinas-lista.js).
function series(n, reps) {
  return Array.from({ length: n }, () => ({ tipo: 'normal', reps, peso: 0 }));
}
function ej(ejercicioId, n, reps) {
  return { ejercicioId, series: series(n, reps) };
}

export const PLANTILLAS = {
  gym: [
    {
      id: 'gym-fb-principiante',
      nombre: 'Full Body Principiante',
      nivel: 'Principiante',
      resumen: 'Base de fuerza general',
      descripcion: 'Rutina de 3 días full body para construir una base sólida antes de especializar.',
      rutinas: [
        { nombre: 'Día A', ejercicios: [
          ej('sentadilla', 3, '8-10'), ej('press banca', 3, '8-10'), ej('remo con barra', 3, '8-10'), ej('plancha', 3, '30-45s')
        ]},
        { nombre: 'Día B', ejercicios: [
          ej('peso muerto', 3, '8'), ej('press militar', 3, '8-10'), ej('jalón al pecho', 3, '10-12'), ej('elevaciones de piernas', 3, '12-15')
        ]},
        { nombre: 'Día C', ejercicios: [
          ej('sentadilla frontal', 3, '8-10'), ej('press inclinado', 3, '8-10'), ej('remo en máquina', 3, '10-12'), ej('plancha lateral', 3, '20-30s')
        ]}
      ]
    },
    {
      id: 'gym-torso-pierna',
      nombre: 'Torso/Pierna',
      nivel: 'Intermedio',
      resumen: 'Fuerza + hipertrofia',
      descripcion: 'Divide el cuerpo en torso y pierna, 4 días por semana, combinando cargas pesadas con volumen de hipertrofia.',
      rutinas: [
        { nombre: 'Torso A', ejercicios: [
          ej('press banca', 4, '6-8'), ej('remo con barra', 4, '6-8'), ej('press militar', 3, '8-10'), ej('curl de bíceps', 3, '10-12'), ej('extensión de tríceps', 3, '10-12')
        ]},
        { nombre: 'Pierna A', ejercicios: [
          ej('sentadilla', 4, '6-8'), ej('peso muerto rumano', 3, '8-10'), ej('extensión de cuádriceps', 3, '10-12'), ej('curl femoral', 3, '10-12'), ej('elevación de talones', 4, '12-15')
        ]},
        { nombre: 'Torso B', ejercicios: [
          ej('press inclinado', 4, '8-10'), ej('dominadas', 4, '6-8'), ej('press arnold', 3, '10-12'), ej('curl martillo', 3, '10-12'), ej('fondos en paralelas', 3, '8-10')
        ]},
        { nombre: 'Pierna B', ejercicios: [
          ej('sentadilla frontal', 4, '6-8'), ej('peso muerto', 3, '5'), ej('zancadas', 3, '10-12'), ej('hip thrust', 3, '10-12'), ej('elevación de talones', 4, '12-15')
        ]}
      ]
    },
    {
      id: 'gym-ppl',
      nombre: 'Push/Pull/Legs',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Volumen alto por grupo muscular',
      descripcion: '6 días por semana agrupando por patrón de movimiento para maximizar el volumen semanal por grupo muscular.',
      rutinas: [
        { nombre: 'Push', ejercicios: [
          ej('press banca', 4, '8-10'), ej('press militar', 3, '8-10'), ej('fondos en paralelas', 3, '8-10'), ej('elevaciones laterales', 3, '12-15'), ej('extensión de tríceps', 3, '12-15')
        ]},
        { nombre: 'Pull', ejercicios: [
          ej('peso muerto', 4, '6'), ej('dominadas', 4, '8-10'), ej('remo con barra', 3, '8-10'), ej('face pull', 3, '15'), ej('curl de bíceps', 3, '10-12')
        ]},
        { nombre: 'Legs', ejercicios: [
          ej('sentadilla', 4, '8-10'), ej('peso muerto rumano', 3, '10-12'), ej('zancadas', 3, '10-12'), ej('elevación de talones', 4, '12-15'), ej('abdominales', 3, '15-20')
        ]}
      ]
    },
    {
      id: 'gym-upper-lower',
      nombre: 'Upper/Lower',
      nivel: 'Intermedio',
      resumen: 'Balance fuerza/volumen',
      descripcion: '4 días alternando torso/pierna con un día de fuerza y otro de volumen para cada uno.',
      rutinas: [
        { nombre: 'Upper A (Fuerza)', ejercicios: [
          ej('press banca', 4, '5'), ej('remo con barra', 4, '5'), ej('press militar', 3, '5'), ej('dominadas', 3, '6-8')
        ]},
        { nombre: 'Lower A (Fuerza)', ejercicios: [
          ej('sentadilla', 4, '5'), ej('peso muerto', 3, '5'), ej('zancadas', 3, '8')
        ]},
        { nombre: 'Upper B (Volumen)', ejercicios: [
          ej('press inclinado', 3, '10-12'), ej('jalón al pecho', 3, '10-12'), ej('elevaciones laterales', 3, '12-15'), ej('curl de bíceps', 3, '12'), ej('extensión de tríceps', 3, '12')
        ]},
        { nombre: 'Lower B (Volumen)', ejercicios: [
          ej('sentadilla frontal', 3, '10-12'), ej('peso muerto rumano', 3, '10-12'), ej('extensión de cuádriceps', 3, '12-15'), ej('curl femoral', 3, '12-15')
        ]}
      ]
    },
    {
      id: 'gym-phat',
      nombre: 'Híbrida PHAT',
      nivel: 'Avanzado',
      resumen: 'Fuerza máxima + hipertrofia',
      descripcion: '5 días de entrenamiento combinando días de fuerza pesada con días de hipertrofia de alto volumen.',
      rutinas: [
        { nombre: 'Día 1 — Upper Fuerza', ejercicios: [
          ej('press banca', 4, '3-5'), ej('remo con barra', 4, '3-5'), ej('press militar', 3, '5'), ej('dominadas', 3, '6')
        ]},
        { nombre: 'Día 2 — Lower Fuerza', ejercicios: [
          ej('sentadilla', 4, '3-5'), ej('peso muerto', 3, '3-5'), ej('extensión de cuádriceps', 3, '8')
        ]},
        { nombre: 'Día 4 — Espalda/Hombro Hipertrofia', ejercicios: [
          ej('jalón al pecho', 4, '10-12'), ej('remo en máquina', 3, '10-12'), ej('elevaciones laterales', 3, '15'), ej('face pull', 3, '15')
        ]},
        { nombre: 'Día 5 — Pecho/Brazos Hipertrofia', ejercicios: [
          ej('press inclinado', 4, '10-12'), ej('fondos en paralelas', 3, '10-12'), ej('curl de bíceps', 3, '12'), ej('extensión de tríceps', 3, '12')
        ]},
        { nombre: 'Día 6 — Pierna Hipertrofia', ejercicios: [
          ej('sentadilla frontal', 4, '10-12'), ej('peso muerto rumano', 3, '10-12'), ej('zancadas', 3, '12'), ej('elevación de talones', 4, '15')
        ]}
      ]
    },
    {
      id: 'gym-stronglifts',
      nombre: 'StrongLifts 5x5',
      nivel: 'Principiante-Intermedio',
      resumen: 'Fuerza pura, progresión lineal',
      descripcion: '3 días por semana con solo 3 ejercicios básicos por sesión, ideal para progresar peso semana a semana.',
      rutinas: [
        { nombre: 'Día A', ejercicios: [
          ej('sentadilla', 5, '5'), ej('press banca', 5, '5'), ej('remo con barra', 5, '5')
        ]},
        { nombre: 'Día B', ejercicios: [
          ej('sentadilla', 5, '5'), ej('press militar', 5, '5'), ej('peso muerto', 1, '5')
        ]}
      ]
    },
    {
      id: 'gym-arnold-split',
      nombre: 'Arnold Split',
      nivel: 'Avanzado',
      resumen: 'Volumen clásico de culturismo',
      descripcion: '6 días agrupando pecho/espalda, hombro/brazos y pierna al estilo clásico de culturismo.',
      rutinas: [
        { nombre: 'Pecho/Espalda', ejercicios: [
          ej('press banca', 4, '8-10'), ej('remo con barra', 4, '8-10'), ej('press inclinado', 3, '10-12'), ej('jalón al pecho', 3, '10-12')
        ]},
        { nombre: 'Hombro/Brazos', ejercicios: [
          ej('press militar', 4, '8-10'), ej('elevaciones laterales', 3, '12-15'), ej('curl de bíceps', 3, '10-12'), ej('extensión de tríceps', 3, '10-12')
        ]},
        { nombre: 'Pierna', ejercicios: [
          ej('sentadilla', 4, '8-10'), ej('peso muerto rumano', 3, '10-12'), ej('extensión de cuádriceps', 3, '12-15'), ej('elevación de talones', 4, '15')
        ]}
      ]
    },
    {
      id: 'gym-german-volume',
      nombre: 'German Volume Training',
      nivel: 'Avanzado',
      resumen: 'Hipertrofia extrema (10x10)',
      descripcion: '4 días con el clásico esquema de 10 series de 10 repeticiones en el ejercicio principal del día.',
      rutinas: [
        { nombre: 'Día 1', ejercicios: [
          ej('press banca', 10, '10'), ej('remo con barra', 3, '10')
        ]},
        { nombre: 'Día 2', ejercicios: [
          ej('sentadilla', 10, '10'), ej('curl femoral', 3, '10')
        ]},
        { nombre: 'Día 3', ejercicios: [
          ej('press militar', 10, '10'), ej('jalón al pecho', 3, '10')
        ]},
        { nombre: 'Día 4', ejercicios: [
          ej('peso muerto rumano', 10, '10'), ej('elevaciones laterales', 3, '12')
        ]}
      ]
    },
    {
      id: 'gym-bro-split',
      nombre: 'Bro Split',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Un grupo muscular por día',
      descripcion: '5 días dedicando cada sesión a un solo grupo muscular, con alto volumen de aislamiento.',
      rutinas: [
        { nombre: 'Pecho', ejercicios: [
          ej('press banca', 4, '8-10'), ej('press inclinado', 3, '10-12'), ej('fondos en paralelas', 3, '10-12')
        ]},
        { nombre: 'Espalda', ejercicios: [
          ej('peso muerto', 4, '6'), ej('remo con barra', 4, '8-10'), ej('jalón al pecho', 3, '10-12')
        ]},
        { nombre: 'Hombro', ejercicios: [
          ej('press militar', 4, '8-10'), ej('elevaciones laterales', 3, '12-15'), ej('face pull', 3, '15')
        ]},
        { nombre: 'Pierna', ejercicios: [
          ej('sentadilla', 4, '8-10'), ej('peso muerto rumano', 3, '10-12'), ej('extensión de cuádriceps', 3, '12-15'), ej('elevación de talones', 4, '15')
        ]},
        { nombre: 'Brazos', ejercicios: [
          ej('curl de bíceps', 3, '10-12'), ej('extensión de tríceps', 3, '10-12'), ej('curl martillo', 3, '10-12')
        ]}
      ]
    },
    {
      id: 'gym-fb-avanzado',
      nombre: 'Full Body Avanzado',
      nivel: 'Avanzado',
      resumen: 'Eficiencia, alta densidad',
      descripcion: '3 días de alta intensidad y poco descanso entre ejercicios, ideal cuando el tiempo es limitado.',
      rutinas: [
        { nombre: 'Día A', ejercicios: [
          ej('sentadilla', 4, '6'), ej('press banca', 4, '6'), ej('remo con barra', 4, '6'), ej('elevación de talones', 3, '15')
        ]},
        { nombre: 'Día B', ejercicios: [
          ej('peso muerto', 3, '5'), ej('press militar', 4, '6'), ej('dominadas', 4, '8'), ej('abdominales', 3, '15-20')
        ]},
        { nombre: 'Día C', ejercicios: [
          ej('sentadilla frontal', 4, '6'), ej('press inclinado', 4, '6'), ej('face pull', 3, '15'), ej('plancha', 3, '40-60s')
        ]}
      ]
    }
  ],

  calistenia: [
    {
      id: 'cal-fb-basico',
      nombre: 'Full Body Básico',
      nivel: 'Principiante',
      resumen: 'Fundamentos de peso corporal',
      descripcion: '3 días por semana con los movimientos fundamentales de peso corporal.',
      rutinas: [
        { nombre: 'Full Body', ejercicios: [
          ej('flexiones', 3, '10-15'), ej('sentadilla con peso corporal', 3, '15-20'), ej('plancha', 3, '30-40s'), ej('puente de glúteo', 3, '15')
        ]}
      ]
    },
    {
      id: 'cal-push-pull',
      nombre: 'Push/Pull Bodyweight',
      nivel: 'Principiante-Intermedio',
      resumen: 'Empuje y tracción con peso corporal',
      descripcion: '4 días alternando patrones de empuje y tracción usando solo el peso corporal.',
      rutinas: [
        { nombre: 'Push', ejercicios: [
          ej('flexiones', 4, '10-12'), ej('fondos en banco', 3, '10-12'), ej('pike push-up', 3, '8-10')
        ]},
        { nombre: 'Pull', ejercicios: [
          ej('dominada asistida con banda', 4, '6-8'), ej('remo invertido', 3, '10-12')
        ]}
      ]
    },
    {
      id: 'cal-fundamentos-dominada',
      nombre: 'Fundamentos de Dominada',
      nivel: 'Principiante',
      resumen: 'Progresión hacia primera dominada',
      descripcion: '3 días enfocados en construir la fuerza necesaria para tu primera dominada completa.',
      rutinas: [
        { nombre: 'Progresión Dominada', ejercicios: [
          ej('dead hang', 3, '20-30s'), ej('remo invertido', 3, '10-12'), ej('dominadas negativas', 3, '5'), ej('dominada asistida con banda', 3, '6-8')
        ]}
      ]
    },
    {
      id: 'cal-handstand',
      nombre: 'Skill Progression — Handstand',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Equilibrio invertido',
      descripcion: '4 días progresando hacia el handstand libre con ejercicios de fuerza y equilibrio.',
      rutinas: [
        { nombre: 'Handstand', ejercicios: [
          ej('pike push-up', 3, '8-10'), ej('handstand contra pared', 3, '20-30s'), ej('hollow body hold', 3, '20-30s'), ej('wall walk', 3, '5')
        ]}
      ]
    },
    {
      id: 'cal-core-intensivo',
      nombre: 'Core Intensivo',
      nivel: 'Todos los niveles',
      resumen: 'Fuerza de core completa',
      descripcion: '4 días enfocados en construir un core fuerte y estable desde todos los ángulos.',
      rutinas: [
        { nombre: 'Core', ejercicios: [
          ej('plancha', 3, '40-60s'), ej('plancha lateral', 3, '30s'), ej('elevaciones de piernas', 3, '12-15'), ej('hollow body hold', 3, '20-30s')
        ]}
      ]
    },
    {
      id: 'cal-piernas',
      nombre: 'Piernas Calistenia',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Fuerza unilateral de piernas',
      descripcion: '3 días de trabajo de piernas con progresiones exigentes de peso corporal.',
      rutinas: [
        { nombre: 'Piernas', ejercicios: [
          ej('sentadilla búlgara', 3, '10-12'), ej('pistol squat', 3, '5'), ej('zancadas', 3, '12'), ej('puente de glúteo a una pierna', 3, '10-12')
        ]}
      ]
    },
    {
      id: 'cal-circuito-metabolico',
      nombre: 'Circuito Metabólico',
      nivel: 'Intermedio',
      resumen: 'Resistencia + fuerza combinadas',
      descripcion: '3 días de circuitos que combinan fuerza y resistencia cardiovascular.',
      rutinas: [
        { nombre: 'Circuito', ejercicios: [
          ej('burpees', 4, '10'), ej('flexiones', 4, '12'), ej('sentadilla con salto', 4, '15'), ej('escaladores', 4, '20')
        ]}
      ]
    },
    {
      id: 'cal-isometrias',
      nombre: 'Estático/Isometrías',
      nivel: 'Avanzado',
      resumen: 'Fuerza de tendones y control',
      descripcion: '3 días de trabajo isométrico puro para construir fuerza de tendones y control corporal.',
      rutinas: [
        { nombre: 'Isometrías', ejercicios: [
          ej('plancha', 3, '45-60s'), ej('l-sit', 3, '10-15s'), ej('dead hang', 3, '20-30s'), ej('wall sit', 3, '40-60s')
        ]}
      ]
    },
    {
      id: 'cal-ppl-avanzado',
      nombre: 'Push/Pull/Legs Calistenia Avanzado',
      nivel: 'Avanzado',
      resumen: 'Volumen alto de peso corporal',
      descripcion: '6 días agrupando por patrón de movimiento con progresiones avanzadas de calistenia.',
      rutinas: [
        { nombre: 'Push', ejercicios: [
          ej('fondos en paralelas', 4, '8-10'), ej('pike push-up', 3, '8-10'), ej('flexiones diamante', 3, '10-12')
        ]},
        { nombre: 'Pull', ejercicios: [
          ej('dominadas', 4, '6-8'), ej('remo invertido', 3, '10-12'), ej('dominada australiana', 3, '10-12')
        ]},
        { nombre: 'Legs', ejercicios: [
          ej('pistol squat', 3, '5'), ej('sentadilla búlgara', 3, '10-12'), ej('zancadas saltadas', 3, '12')
        ]}
      ]
    },
    {
      id: 'cal-fb-progresivo',
      nombre: 'Full Body Progresivo',
      nivel: 'Intermedio',
      resumen: 'Combinación de fuerza y skill',
      descripcion: '4 días combinando fuerza básica con progresiones de skills de calistenia.',
      rutinas: [
        { nombre: 'Full Body', ejercicios: [
          ej('flexiones', 3, '10-12'), ej('dominada asistida con banda', 3, '6-8'), ej('pistol squat', 3, '5'), ej('plancha', 3, '40s'), ej('l-sit', 3, '10-15s')
        ]}
      ]
    }
  ],

  hiit: [
    {
      id: 'hiit-tabata-clasico',
      nombre: 'Tabata Clásico',
      nivel: 'Todos los niveles',
      resumen: 'Potencia anaeróbica (4 min por ejercicio)',
      descripcion: 'El protocolo original: 20 segundos de esfuerzo máximo y 10 segundos de descanso, 8 rondas.',
      hiitSettings: { mode: 'tabata', workSecs: 20, restSecs: 10, totalRounds: 8 },
      rutinas: [
        { nombre: 'Tabata Clásico', ejercicioIds: ['burpees', 'sentadilla con salto', 'escaladores', 'jumping jacks'] }
      ]
    },
    {
      id: 'hiit-emom-engine',
      nombre: 'EMOM The Engine',
      nivel: 'Intermedio',
      resumen: 'Fuerza-resistencia (12 min)',
      descripcion: 'Every Minute On the Minute: realiza el ejercicio al inicio del minuto, el tiempo restante es tu descanso.',
      hiitSettings: { mode: 'free', workSecs: 40, restSecs: 20, totalRounds: 12 },
      rutinas: [
        { nombre: 'EMOM', ejercicioIds: ['burpees', 'sentadilla con salto'] }
      ]
    },
    {
      id: 'hiit-amrap-20',
      nombre: 'AMRAP 20',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Máximas rondas en 20 minutos',
      descripcion: 'Completa la mayor cantidad de rondas posible en 20 minutos, a tu propio ritmo pero sin pausas largas.',
      rutinas: [
        { nombre: 'AMRAP 20', ejercicioIds: ['flexiones', 'sentadilla con peso corporal', 'escaladores', 'trote continuo'] }
      ]
    },
    {
      id: 'hiit-steady-state',
      nombre: 'Cardio Steady State',
      nivel: 'Todos los niveles',
      resumen: 'Resistencia aeróbica base (30-40 min)',
      descripcion: 'Cardio continuo a ritmo constante moderado — trote, bicicleta o elíptica.',
      rutinas: [
        { nombre: 'Steady State', ejercicioIds: ['trote continuo'] }
      ]
    },
    {
      id: 'hiit-sprint-intervals',
      nombre: 'Sprint Intervals',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Velocidad y potencia (20 min)',
      descripcion: '30 segundos de sprint máximo por 90 segundos de caminata, 8-10 rondas.',
      hiitSettings: { mode: 'free', workSecs: 30, restSecs: 90, totalRounds: 9 },
      rutinas: [
        { nombre: 'Sprint Intervals', ejercicioIds: ['sprint'] }
      ]
    },
    {
      id: 'hiit-circuito-fb',
      nombre: 'Circuito Metabólico Full Body',
      nivel: 'Intermedio',
      resumen: 'Circuito completo (25 min)',
      descripcion: '5 ejercicios de 30 segundos cada uno, circuito completo x4 rondas.',
      hiitSettings: { mode: 'free', workSecs: 30, restSecs: 10, totalRounds: 20 },
      rutinas: [
        { nombre: 'Circuito', ejercicioIds: ['burpees', 'sentadilla con salto', 'flexiones', 'escaladores', 'plancha'] }
      ]
    },
    {
      id: 'hiit-death-by-burpees',
      nombre: 'Death by Burpees',
      nivel: 'Avanzado',
      resumen: 'Resistencia mental y física (progresivo)',
      descripcion: 'Minuto 1: 1 burpee, minuto 2: 2 burpees... aumentando 1 por minuto hasta fallar.',
      rutinas: [
        { nombre: 'Death by Burpees', ejercicioIds: ['burpees'] }
      ]
    },
    {
      id: 'hiit-ladder',
      nombre: 'HIIT Escalera/Ladder',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Formato escalera (15 min)',
      descripcion: 'Sentadilla con salto en escalera descendente 10-9-8...1, con escaladores entre cada nivel.',
      rutinas: [
        { nombre: 'Ladder', ejercicioIds: ['sentadilla con salto', 'escaladores'] }
      ]
    },
    {
      id: 'hiit-liss',
      nombre: 'Cardio de Baja Intensidad — LISS',
      nivel: 'Principiante',
      resumen: 'Recuperación activa, quema de grasa (40-45 min)',
      descripcion: 'Caminata rápida en inclinación, bicicleta suave o natación suave, a intensidad baja y sostenida.',
      rutinas: [
        { nombre: 'LISS', ejercicioIds: ['caminata'] }
      ]
    },
    {
      id: 'hiit-mixto-bodyweight',
      nombre: 'HIIT Mixto Peso Corporal',
      nivel: 'Todos los niveles',
      resumen: 'Circuito mixto (20 min)',
      descripcion: '40 segundos de trabajo, 20 de descanso, x4 rondas por 5 ejercicios de peso corporal.',
      hiitSettings: { mode: 'free', workSecs: 40, restSecs: 20, totalRounds: 20 },
      rutinas: [
        { nombre: 'HIIT Mixto', ejercicioIds: ['jumping jacks', 'sentadilla con salto', 'flexiones', 'escaladores', 'plancha'] }
      ]
    }
  ]
};
