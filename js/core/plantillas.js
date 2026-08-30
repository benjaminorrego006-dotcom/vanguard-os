// Plantillas de rutina. Cada ejercicio referencia un `ejercicioId` del
// catálogo (ejercicios-catalogo.js) — el texto de instrucciones vive UNA
// sola vez ahí, nunca se duplica aquí. Al usar una plantilla se resuelve
// ejercicioId -> nombre para crear la rutina real (ver
// initPlantillaPreviewListeners en rutinas-lista.js).
//
// Reemplazadas por completo desde RUTINAS-COMPLETAS.md (Etapa 6): 7
// rutinas por grupo muscular (2 principiante, 3 intermedio, 2 avanzado),
// una sesión por plantilla en vez del esquema anterior de splits
// multi-día. Los nombres de ejercicio se verificaron contra el catálogo
// con un script antes de escribir esto — 4 tenían solo una diferencia de
// nombre (corregidos acá) y 11 no existían (agregados al catálogo en la
// Etapa 6a, commit previo a este).
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
    },
    {
      id: 'gym-pecho-2',
      nombre: 'Pecho — Volumen Ligero',
      nivel: 'Principiante',
      resumen: 'Volumen moderado, técnica',
      descripcion: 'Sesión de pecho nivel principiante — volumen moderado, técnica.',
      rutinas: [
        { nombre: 'Pecho — Volumen Ligero', ejercicios: [
          ej('press de banca', 3, '10'), ej('press de banca con mancuernas', 3, '12'), ej('aperturas con mancuernas', 3, '15'), ej('flexiones', 2, 'máx'), ej('crunch en banco declinado', 2, '15'), ej('plancha con peso', 2, '30s')
        ]}
      ]
    },
    {
      id: 'gym-pecho-3',
      nombre: 'Pecho — Fuerza',
      nivel: 'Intermedio',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de pecho nivel intermedio — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Pecho — Fuerza', ejercicios: [
          ej('press de banca', 4, '6'), ej('press inclinado', 4, '8'), ej('fondos en paralelas', 3, '8'), ej('aperturas con mancuernas', 3, '10'), ej('crunch en polea', 3, '12'), ej('pallof press', 2, '10/lado')
        ]}
      ]
    },
    {
      id: 'gym-pecho-4',
      nombre: 'Pecho — Hipertrofia',
      nivel: 'Intermedio',
      resumen: 'Volumen alto para hipertrofia',
      descripcion: 'Sesión de pecho nivel intermedio — volumen alto para hipertrofia.',
      rutinas: [
        { nombre: 'Pecho — Hipertrofia', ejercicios: [
          ej('press de banca con mancuernas', 4, '10'), ej('press inclinado', 3, '12'), ej('aperturas en polea', 3, '15'), ej('flexiones', 3, '20'), ej('woodchopper', 3, '12/lado'), ej('elevaciones de piernas', 3, '15')
        ]}
      ]
    },
    {
      id: 'gym-pecho-5',
      nombre: 'Pecho — Variación',
      nivel: 'Intermedio',
      resumen: 'Variación de estímulo',
      descripcion: 'Sesión de pecho nivel intermedio — variación de estímulo.',
      rutinas: [
        { nombre: 'Pecho — Variación', ejercicios: [
          ej('press de banca', 3, '8'), ej('press de banca con mancuernas', 3, '10'), ej('fondos en paralelas', 3, '10'), ej('aperturas en polea', 4, '12'), ej('rueda abdominal', 3, '8'), ej('abdominales', 2, '20')
        ]}
      ]
    },
    {
      id: 'gym-pecho-6',
      nombre: 'Pecho — Fuerza Pesada',
      nivel: 'Avanzado',
      resumen: 'Cargas máximas',
      descripcion: 'Sesión de pecho nivel avanzado — cargas máximas.',
      rutinas: [
        { nombre: 'Pecho — Fuerza Pesada', ejercicios: [
          ej('press de banca', 5, '5'), ej('press inclinado', 4, '6'), ej('fondos en paralelas', 4, '8'), ej('press de banca con mancuernas', 3, '8'), ej('aperturas en polea', 3, '12'), ej('crunch en polea', 3, '15'), ej('pallof press', 3, '10/lado')
        ]}
      ]
    },
    {
      id: 'gym-pecho-7',
      nombre: 'Pecho — Volumen Alto',
      nivel: 'Avanzado',
      resumen: 'Volumen alto',
      descripcion: 'Sesión de pecho nivel avanzado — volumen alto.',
      rutinas: [
        { nombre: 'Pecho — Volumen Alto', ejercicios: [
          ej('press de banca con mancuernas', 4, '10'), ej('press inclinado', 4, '10'), ej('aperturas en polea', 4, '15'), ej('fondos en paralelas', 3, '12'), ej('flexiones', 2, 'máx'), ej('woodchopper', 3, '15/lado'), ej('rueda abdominal', 3, '10')
        ]}
      ]
    },
    {
      id: 'gym-espalda-1',
      nombre: 'Espalda — Introducción',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de espalda nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Espalda — Introducción', ejercicios: [
          ej('jalón al pecho', 3, '12'), ej('remo en máquina', 3, '12'), ej('face pull', 3, '15'), ej('abdominales', 2, '15'), ej('elevaciones de piernas', 2, '12')
        ]}
      ]
    },
    {
      id: 'gym-espalda-2',
      nombre: 'Espalda — Volumen Ligero',
      nivel: 'Principiante',
      resumen: 'Volumen moderado, técnica',
      descripcion: 'Sesión de espalda nivel principiante — volumen moderado, técnica.',
      rutinas: [
        { nombre: 'Espalda — Volumen Ligero', ejercicios: [
          ej('jalón al pecho', 3, '15'), ej('remo en máquina', 3, '15'), ej('face pull', 3, '15'), ej('jalón al pecho', 2, '12'), ej('crunch en banco declinado', 2, '15'), ej('plancha con peso', 2, '30s')
        ]}
      ]
    },
    {
      id: 'gym-espalda-3',
      nombre: 'Espalda — Fuerza',
      nivel: 'Intermedio',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de espalda nivel intermedio — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Espalda — Fuerza', ejercicios: [
          ej('remo con barra', 4, '6'), ej('dominadas', 4, '6'), ej('remo en máquina', 3, '10'), ej('face pull', 3, '15'), ej('crunch en polea', 3, '12'), ej('pallof press', 2, '10/lado')
        ]}
      ]
    },
    {
      id: 'gym-espalda-4',
      nombre: 'Espalda — Hipertrofia',
      nivel: 'Intermedio',
      resumen: 'Volumen alto para hipertrofia',
      descripcion: 'Sesión de espalda nivel intermedio — volumen alto para hipertrofia.',
      rutinas: [
        { nombre: 'Espalda — Hipertrofia', ejercicios: [
          ej('jalón al pecho', 4, '10'), ej('remo con barra', 3, '10'), ej('remo en máquina', 3, '12'), ej('face pull', 4, '15'), ej('woodchopper', 3, '12/lado'), ej('elevaciones de piernas', 3, '15')
        ]}
      ]
    },
    {
      id: 'gym-espalda-5',
      nombre: 'Espalda — Variación',
      nivel: 'Intermedio',
      resumen: 'Variación de estímulo',
      descripcion: 'Sesión de espalda nivel intermedio — variación de estímulo.',
      rutinas: [
        { nombre: 'Espalda — Variación', ejercicios: [
          ej('dominadas', 3, '8'), ej('remo con barra', 3, '10'), ej('jalón al pecho', 3, '12'), ej('face pull', 3, '15'), ej('rueda abdominal', 3, '8'), ej('abdominales', 2, '20')
        ]}
      ]
    },
    {
      id: 'gym-espalda-6',
      nombre: 'Espalda — Fuerza Pesada',
      nivel: 'Avanzado',
      resumen: 'Cargas máximas',
      descripcion: 'Sesión de espalda nivel avanzado — cargas máximas.',
      rutinas: [
        { nombre: 'Espalda — Fuerza Pesada', ejercicios: [
          ej('remo con barra', 5, '5'), ej('dominadas', 5, '5'), ej('remo en máquina', 4, '8'), ej('face pull', 4, '15'), ej('crunch en polea', 3, '15'), ej('pallof press', 3, '10/lado')
        ]}
      ]
    },
    {
      id: 'gym-espalda-7',
      nombre: 'Espalda — Volumen Alto',
      nivel: 'Avanzado',
      resumen: 'Volumen alto',
      descripcion: 'Sesión de espalda nivel avanzado — volumen alto.',
      rutinas: [
        { nombre: 'Espalda — Volumen Alto', ejercicios: [
          ej('dominadas', 4, '10'), ej('remo con barra', 4, '10'), ej('jalón al pecho', 3, '12'), ej('remo en máquina', 3, '12'), ej('face pull', 4, '20'), ej('woodchopper', 3, '15/lado'), ej('rueda abdominal', 3, '10')
        ]}
      ]
    },
    {
      id: 'gym-piernas-1',
      nombre: 'Piernas — Introducción',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de piernas nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Piernas — Introducción', ejercicios: [
          ej('sentadilla', 3, '10'), ej('extensión de cuádriceps', 3, '12'), ej('curl femoral', 3, '12'), ej('elevación de talones', 3, '15'), ej('abdominales', 2, '15'), ej('elevaciones de piernas', 2, '12')
        ]}
      ]
    },
    {
      id: 'gym-piernas-2',
      nombre: 'Piernas — Volumen Ligero',
      nivel: 'Principiante',
      resumen: 'Volumen moderado, técnica',
      descripcion: 'Sesión de piernas nivel principiante — volumen moderado, técnica.',
      rutinas: [
        { nombre: 'Piernas — Volumen Ligero', ejercicios: [
          ej('sentadilla', 3, '12'), ej('zancadas', 3, '10/pierna'), ej('hip thrust', 3, '12'), ej('elevación de talones', 3, '15'), ej('crunch en banco declinado', 2, '15'), ej('plancha con peso', 2, '30s')
        ]}
      ]
    },
    {
      id: 'gym-piernas-3',
      nombre: 'Piernas — Fuerza',
      nivel: 'Intermedio',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de piernas nivel intermedio — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Piernas — Fuerza', ejercicios: [
          ej('sentadilla', 4, '6'), ej('peso muerto rumano', 4, '8'), ej('zancadas', 3, '8/pierna'), ej('extensión de cuádriceps', 3, '10'), ej('elevación de talones', 4, '12'), ej('crunch en polea', 3, '12'), ej('pallof press', 2, '10/lado')
        ]}
      ]
    },
    {
      id: 'gym-piernas-4',
      nombre: 'Piernas — Hipertrofia',
      nivel: 'Intermedio',
      resumen: 'Volumen alto para hipertrofia',
      descripcion: 'Sesión de piernas nivel intermedio — volumen alto para hipertrofia.',
      rutinas: [
        { nombre: 'Piernas — Hipertrofia', ejercicios: [
          ej('sentadilla', 4, '10'), ej('hip thrust', 4, '12'), ej('extensión de cuádriceps', 3, '15'), ej('curl femoral', 3, '15'), ej('elevación de talones', 4, '15'), ej('woodchopper', 3, '12/lado'), ej('elevaciones de piernas', 3, '15')
        ]}
      ]
    },
    {
      id: 'gym-piernas-5',
      nombre: 'Piernas — Variación',
      nivel: 'Intermedio',
      resumen: 'Variación de estímulo',
      descripcion: 'Sesión de piernas nivel intermedio — variación de estímulo.',
      rutinas: [
        { nombre: 'Piernas — Variación', ejercicios: [
          ej('sentadilla frontal', 4, '8'), ej('peso muerto rumano', 3, '10'), ej('zancadas', 3, '10/pierna'), ej('hip thrust', 3, '12'), ej('elevación de talones', 3, '15'), ej('rueda abdominal', 3, '8'), ej('abdominales', 2, '20')
        ]}
      ]
    },
    {
      id: 'gym-piernas-6',
      nombre: 'Piernas — Fuerza Pesada',
      nivel: 'Avanzado',
      resumen: 'Cargas máximas',
      descripcion: 'Sesión de piernas nivel avanzado — cargas máximas.',
      rutinas: [
        { nombre: 'Piernas — Fuerza Pesada', ejercicios: [
          ej('sentadilla', 5, '5'), ej('peso muerto', 4, '5'), ej('sentadilla frontal', 3, '6'), ej('peso muerto rumano', 3, '8'), ej('elevación de talones', 4, '10'), ej('crunch en polea', 3, '15'), ej('pallof press', 3, '10/lado')
        ]}
      ]
    },
    {
      id: 'gym-piernas-7',
      nombre: 'Piernas — Volumen Alto',
      nivel: 'Avanzado',
      resumen: 'Volumen alto',
      descripcion: 'Sesión de piernas nivel avanzado — volumen alto.',
      rutinas: [
        { nombre: 'Piernas — Volumen Alto', ejercicios: [
          ej('sentadilla', 4, '10'), ej('hip thrust', 4, '12'), ej('zancadas', 4, '10/pierna'), ej('extensión de cuádriceps', 3, '15'), ej('curl femoral', 3, '15'), ej('elevación de talones', 4, '15'), ej('woodchopper', 3, '15/lado'), ej('rueda abdominal', 3, '10')
        ]}
      ]
    },
    {
      id: 'gym-core-1',
      nombre: 'Core — Base',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de core nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Core — Base', ejercicios: [
          ej('abdominales', 3, '15'), ej('elevaciones de piernas', 3, '12'), ej('crunch en banco declinado', 3, '12'), ej('plancha con peso', 3, '30s')
        ]}
      ]
    },
    {
      id: 'gym-core-2',
      nombre: 'Core — Estabilidad',
      nivel: 'Principiante',
      resumen: 'Estabilidad',
      descripcion: 'Sesión de core nivel principiante — estabilidad.',
      rutinas: [
        { nombre: 'Core — Estabilidad', ejercicios: [
          ej('pallof press', 3, '10/lado'), ej('plancha con peso', 3, '30s'), ej('abdominales', 3, '15'), ej('elevaciones de piernas', 3, '10')
        ]}
      ]
    },
    {
      id: 'gym-core-3',
      nombre: 'Core — Anti-Movimiento',
      nivel: 'Intermedio',
      resumen: 'Estabilidad anti-rotación',
      descripcion: 'Sesión de core nivel intermedio — estabilidad anti-rotación.',
      rutinas: [
        { nombre: 'Core — Anti-Movimiento', ejercicios: [
          ej('pallof press', 4, '12/lado'), ej('rueda abdominal', 3, '10'), ej('woodchopper', 3, '12/lado'), ej('crunch en polea', 3, '15')
        ]}
      ]
    },
    {
      id: 'gym-core-4',
      nombre: 'Core — Fuerza',
      nivel: 'Intermedio',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de core nivel intermedio — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Core — Fuerza', ejercicios: [
          ej('crunch en polea', 4, '12'), ej('elevaciones de piernas', 4, '12'), ej('rueda abdominal', 3, '10'), ej('plancha con peso', 3, '45s')
        ]}
      ]
    },
    {
      id: 'gym-core-5',
      nombre: 'Core — Rotación',
      nivel: 'Intermedio',
      resumen: 'Trabajo rotacional',
      descripcion: 'Sesión de core nivel intermedio — trabajo rotacional.',
      rutinas: [
        { nombre: 'Core — Rotación', ejercicios: [
          ej('woodchopper', 4, '12/lado'), ej('pallof press', 3, '12/lado'), ej('crunch en banco declinado', 3, '15'), ej('elevaciones de piernas', 3, '15')
        ]}
      ]
    },
    {
      id: 'gym-core-6',
      nombre: 'Core — Completo',
      nivel: 'Avanzado',
      resumen: 'Rutina completa del grupo',
      descripcion: 'Sesión de core nivel avanzado — rutina completa del grupo.',
      rutinas: [
        { nombre: 'Core — Completo', ejercicios: [
          ej('rueda abdominal', 4, '12'), ej('crunch en polea', 4, '15'), ej('woodchopper', 4, '15/lado'), ej('pallof press', 3, '15/lado'), ej('elevaciones de piernas', 3, '15')
        ]}
      ]
    },
    {
      id: 'gym-core-7',
      nombre: 'Core — Resistencia',
      nivel: 'Avanzado',
      resumen: 'Resistencia muscular',
      descripcion: 'Sesión de core nivel avanzado — resistencia muscular.',
      rutinas: [
        { nombre: 'Core — Resistencia', ejercicios: [
          ej('crunch en polea', 3, '20'), ej('woodchopper', 3, '15/lado'), ej('rueda abdominal', 3, '12'), ej('pallof press', 3, '15/lado'), ej('plancha con peso', 3, '60s'), ej('abdominales', 2, 'máx')
        ]}
      ]
    },
    {
      id: 'gym-hombros-brazos-1',
      nombre: 'Hombros+Brazos — Introducción',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de hombros y brazos nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Introducción', ejercicios: [
          ej('elevaciones laterales', 3, '12'), ej('face pull', 3, '15'), ej('curl de bíceps', 3, '12'), ej('extensión de tríceps', 3, '12'), ej('abdominales', 2, '15'), ej('elevaciones de piernas', 2, '12')
        ]}
      ]
    },
    {
      id: 'gym-hombros-brazos-2',
      nombre: 'Hombros+Brazos — Volumen Ligero',
      nivel: 'Principiante',
      resumen: 'Volumen moderado, técnica',
      descripcion: 'Sesión de hombros y brazos nivel principiante — volumen moderado, técnica.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Volumen Ligero', ejercicios: [
          ej('elevaciones laterales', 3, '15'), ej('face pull', 3, '15'), ej('curl martillo', 3, '12'), ej('extensión de tríceps', 3, '12'), ej('curl de bíceps', 2, '15'), ej('crunch en banco declinado', 2, '15'), ej('plancha con peso', 2, '30s')
        ]}
      ]
    },
    {
      id: 'gym-hombros-brazos-3',
      nombre: 'Hombros+Brazos — Fuerza',
      nivel: 'Intermedio',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de hombros y brazos nivel intermedio — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Fuerza', ejercicios: [
          ej('press militar', 4, '6'), ej('elevaciones laterales', 3, '12'), ej('face pull', 3, '15'), ej('curl de bíceps', 4, '8'), ej('extensión de tríceps', 4, '8'), ej('crunch en polea', 3, '12'), ej('pallof press', 2, '10/lado')
        ]}
      ]
    },
    {
      id: 'gym-hombros-brazos-4',
      nombre: 'Hombros+Brazos — Hipertrofia',
      nivel: 'Intermedio',
      resumen: 'Volumen alto para hipertrofia',
      descripcion: 'Sesión de hombros y brazos nivel intermedio — volumen alto para hipertrofia.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Hipertrofia', ejercicios: [
          ej('press arnold', 3, '10'), ej('elevaciones laterales', 4, '15'), ej('face pull', 3, '15'), ej('curl de bíceps', 3, '12'), ej('curl martillo', 3, '12'), ej('extensión de tríceps', 3, '12'), ej('woodchopper', 3, '12/lado')
        ]}
      ]
    },
    {
      id: 'gym-hombros-brazos-5',
      nombre: 'Hombros+Brazos — Variación',
      nivel: 'Intermedio',
      resumen: 'Variación de estímulo',
      descripcion: 'Sesión de hombros y brazos nivel intermedio — variación de estímulo.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Variación', ejercicios: [
          ej('press militar', 3, '8'), ej('press arnold', 3, '10'), ej('face pull', 4, '15'), ej('curl martillo', 3, '10'), ej('extensión de tríceps', 3, '10'), ej('rueda abdominal', 3, '8'), ej('abdominales', 2, '20')
        ]}
      ]
    },
    {
      id: 'gym-hombros-brazos-6',
      nombre: 'Hombros+Brazos — Fuerza Pesada',
      nivel: 'Avanzado',
      resumen: 'Cargas máximas',
      descripcion: 'Sesión de hombros y brazos nivel avanzado — cargas máximas.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Fuerza Pesada', ejercicios: [
          ej('press militar', 5, '5'), ej('press arnold', 4, '6'), ej('elevaciones laterales', 4, '12'), ej('face pull', 3, '15'), ej('curl de bíceps', 4, '6'), ej('extensión de tríceps', 4, '6'), ej('crunch en polea', 3, '15')
        ]}
      ]
    },
    {
      id: 'gym-hombros-brazos-7',
      nombre: 'Hombros+Brazos — Volumen Alto',
      nivel: 'Avanzado',
      resumen: 'Volumen alto',
      descripcion: 'Sesión de hombros y brazos nivel avanzado — volumen alto.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Volumen Alto', ejercicios: [
          ej('press arnold', 4, '10'), ej('elevaciones laterales', 4, '15'), ej('face pull', 4, '15'), ej('curl de bíceps', 4, '12'), ej('curl martillo', 3, '12'), ej('extensión de tríceps', 4, '12'), ej('woodchopper', 3, '15/lado'), ej('rueda abdominal', 3, '10')
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
    },
    {
      id: 'calistenia-pecho-2',
      nombre: 'Pecho — Construir Volumen',
      nivel: 'Principiante',
      resumen: 'Volumen moderado',
      descripcion: 'Sesión de pecho nivel principiante — volumen moderado.',
      rutinas: [
        { nombre: 'Pecho — Construir Volumen', ejercicios: [
          ej('flexiones con rodillas', 3, '15'), ej('flexiones inclinadas', 3, '12'), ej('fondos en banco', 3, '12'), ej('flexiones en pared', 2, '20'), ej('hollow body hold', 3, '20s'), ej('plancha', 2, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-pecho-3',
      nombre: 'Pecho — Fuerza',
      nivel: 'Intermedio',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de pecho nivel intermedio — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Pecho — Fuerza', ejercicios: [
          ej('flexiones', 4, '15'), ej('flexiones diamante', 3, '10'), ej('flexiones declinadas', 3, '10'), ej('fondos en banco', 3, '15'), ej('l-sit', 3, '10s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-pecho-4',
      nombre: 'Pecho — Hipertrofia',
      nivel: 'Intermedio',
      resumen: 'Volumen alto para hipertrofia',
      descripcion: 'Sesión de pecho nivel intermedio — volumen alto para hipertrofia.',
      rutinas: [
        { nombre: 'Pecho — Hipertrofia', ejercicios: [
          ej('flexiones', 4, '20'), ej('flexiones declinadas', 3, '15'), ej('flexiones diamante', 3, '12'), ej('fondos en banco', 4, '15'), ej('plancha', 3, '45s'), ej('plancha lateral', 3, '30s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-pecho-5',
      nombre: 'Pecho — Explosiva',
      nivel: 'Intermedio',
      resumen: 'Trabajo explosivo/pliométrico',
      descripcion: 'Sesión de pecho nivel intermedio — trabajo explosivo/pliométrico.',
      rutinas: [
        { nombre: 'Pecho — Explosiva', ejercicios: [
          ej('flexiones con palmada', 3, '8'), ej('flexiones', 4, '15'), ej('flexiones diamante', 3, '12'), ej('flexiones declinadas', 3, '12'), ej('l-sit', 3, '15s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-pecho-6',
      nombre: 'Pecho — Habilidades',
      nivel: 'Avanzado',
      resumen: 'Habilidades avanzadas',
      descripcion: 'Sesión de pecho nivel avanzado — habilidades avanzadas.',
      rutinas: [
        { nombre: 'Pecho — Habilidades', ejercicios: [
          ej('pseudo planche push-up', 4, '8'), ej('flexiones de arquero', 4, '6/lado'), ej('flexiones con palmada', 3, '10'), ej('flexiones declinadas', 3, '15'), ej('flexiones diamante', 3, '12'), ej('l-sit', 3, '20s'), ej('hollow body hold', 3, '45s')
        ]}
      ]
    },
    {
      id: 'calistenia-pecho-7',
      nombre: 'Pecho — Una Mano',
      nivel: 'Avanzado',
      resumen: 'Progresión a una mano',
      descripcion: 'Sesión de pecho nivel avanzado — progresión a una mano.',
      rutinas: [
        { nombre: 'Pecho — Una Mano', ejercicios: [
          ej('flexiones a una mano', 4, '3/lado'), ej('flexiones de arquero', 4, '8/lado'), ej('pseudo planche push-up', 3, '10'), ej('flexiones con palmada', 3, '10'), ej('flexiones', 2, 'máx'), ej('l-sit', 3, '20s'), ej('plancha', 3, '60s')
        ]}
      ]
    },
    {
      id: 'calistenia-espalda-1',
      nombre: 'Espalda — Base',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de espalda nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Espalda — Base', ejercicios: [
          ej('dead hang', 3, '20s'), ej('dominada australiana', 3, '10'), ej('remo invertido', 3, '10'), ej('plancha', 3, '30s'), ej('plancha lateral', 2, '20s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-espalda-2',
      nombre: 'Espalda — Volumen',
      nivel: 'Principiante',
      resumen: 'Volumen moderado',
      descripcion: 'Sesión de espalda nivel principiante — volumen moderado.',
      rutinas: [
        { nombre: 'Espalda — Volumen', ejercicios: [
          ej('dead hang', 3, '30s'), ej('dominada australiana', 3, '12'), ej('remo invertido', 3, '12'), ej('negativas de dominada', 3, '5'), ej('hollow body hold', 3, '20s'), ej('plancha', 2, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-espalda-3',
      nombre: 'Espalda — Primera Dominada',
      nivel: 'Intermedio',
      resumen: 'Camino a la primera dominada',
      descripcion: 'Sesión de espalda nivel intermedio — camino a la primera dominada.',
      rutinas: [
        { nombre: 'Espalda — Primera Dominada', ejercicios: [
          ej('dominada asistida con banda', 4, '6'), ej('negativas de dominada', 4, '5'), ej('remo invertido', 3, '12'), ej('dead hang', 3, '30s'), ej('l-sit', 3, '10s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-espalda-4',
      nombre: 'Espalda — Volumen',
      nivel: 'Intermedio',
      resumen: 'Volumen moderado',
      descripcion: 'Sesión de espalda nivel intermedio — volumen moderado.',
      rutinas: [
        { nombre: 'Espalda — Volumen', ejercicios: [
          ej('dominada asistida con banda', 4, '8'), ej('remo invertido', 4, '12'), ej('dominada australiana', 3, '15'), ej('negativas de dominada', 3, '8'), ej('plancha', 3, '45s'), ej('plancha lateral', 3, '30s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-espalda-5',
      nombre: 'Espalda — Estrictas',
      nivel: 'Intermedio',
      resumen: 'Dominadas estrictas',
      descripcion: 'Sesión de espalda nivel intermedio — dominadas estrictas.',
      rutinas: [
        { nombre: 'Espalda — Estrictas', ejercicios: [
          ej('dominadas', 4, '5'), ej('remo invertido', 4, '10'), ej('dominada australiana', 3, '15'), ej('dead hang', 3, '45s'), ej('l-sit', 3, '15s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-espalda-6',
      nombre: 'Espalda — Fuerza',
      nivel: 'Avanzado',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de espalda nivel avanzado — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Espalda — Fuerza', ejercicios: [
          ej('dominadas', 5, '8'), ej('dominadas lastradas', 4, '5'), ej('remo invertido', 4, '12'), ej('dead hang', 3, '60s'), ej('l-sit', 3, '20s'), ej('hollow body hold', 3, '45s')
        ]}
      ]
    },
    {
      id: 'calistenia-espalda-7',
      nombre: 'Espalda — Volumen Alto',
      nivel: 'Avanzado',
      resumen: 'Volumen alto',
      descripcion: 'Sesión de espalda nivel avanzado — volumen alto.',
      rutinas: [
        { nombre: 'Espalda — Volumen Alto', ejercicios: [
          ej('dominadas', 4, '10'), ej('dominadas lastradas', 3, '8'), ej('remo invertido', 4, '15'), ej('dominada australiana', 3, 'máx'), ej('dead hang', 3, '60s'), ej('l-sit', 3, '20s'), ej('plancha', 3, '60s')
        ]}
      ]
    },
    {
      id: 'calistenia-piernas-1',
      nombre: 'Piernas — Base',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de piernas nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Piernas — Base', ejercicios: [
          ej('sentadilla con peso corporal', 3, '15'), ej('puente de glúteo', 3, '15'), ej('wall sit', 3, '30s'), ej('plancha', 3, '30s'), ej('plancha lateral', 2, '20s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-piernas-2',
      nombre: 'Piernas — Volumen',
      nivel: 'Principiante',
      resumen: 'Volumen moderado',
      descripcion: 'Sesión de piernas nivel principiante — volumen moderado.',
      rutinas: [
        { nombre: 'Piernas — Volumen', ejercicios: [
          ej('sentadilla con peso corporal', 3, '20'), ej('puente de glúteo', 3, '15'), ej('puente de glúteo a una pierna', 3, '10/pierna'), ej('wall sit', 3, '45s'), ej('hollow body hold', 3, '20s'), ej('plancha', 2, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-piernas-3',
      nombre: 'Piernas — Fuerza Unilateral',
      nivel: 'Intermedio',
      resumen: 'Fuerza unilateral',
      descripcion: 'Sesión de piernas nivel intermedio — fuerza unilateral.',
      rutinas: [
        { nombre: 'Piernas — Fuerza Unilateral', ejercicios: [
          ej('sentadilla búlgara', 4, '8/pierna'), ej('sentadilla con peso corporal', 3, '20'), ej('puente de glúteo a una pierna', 3, '12/pierna'), ej('wall sit', 3, '60s'), ej('l-sit', 3, '10s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-piernas-4',
      nombre: 'Piernas — Hipertrofia',
      nivel: 'Intermedio',
      resumen: 'Volumen alto para hipertrofia',
      descripcion: 'Sesión de piernas nivel intermedio — volumen alto para hipertrofia.',
      rutinas: [
        { nombre: 'Piernas — Hipertrofia', ejercicios: [
          ej('sentadilla con peso corporal', 4, '25'), ej('sentadilla búlgara', 3, '10/pierna'), ej('puente de glúteo a una pierna', 4, '12/pierna'), ej('zancadas saltadas', 3, '10/pierna'), ej('plancha', 3, '45s'), ej('plancha lateral', 3, '30s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-piernas-5',
      nombre: 'Piernas — Explosiva',
      nivel: 'Intermedio',
      resumen: 'Trabajo explosivo/pliométrico',
      descripcion: 'Sesión de piernas nivel intermedio — trabajo explosivo/pliométrico.',
      rutinas: [
        { nombre: 'Piernas — Explosiva', ejercicios: [
          ej('sentadilla con salto', 4, '10'), ej('zancadas saltadas', 3, '10/pierna'), ej('sentadilla búlgara', 3, '10/pierna'), ej('puente de glúteo', 3, '20'), ej('l-sit', 3, '15s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-piernas-6',
      nombre: 'Piernas — Pistol',
      nivel: 'Avanzado',
      resumen: 'Progresión pistol squat',
      descripcion: 'Sesión de piernas nivel avanzado — progresión pistol squat.',
      rutinas: [
        { nombre: 'Piernas — Pistol', ejercicios: [
          ej('pistol squat asistida', 4, '5/pierna'), ej('sentadilla búlgara', 4, '10/pierna'), ej('sentadilla con salto', 3, '12'), ej('puente de glúteo a una pierna', 3, '15/pierna'), ej('l-sit', 3, '20s'), ej('hollow body hold', 3, '45s')
        ]}
      ]
    },
    {
      id: 'calistenia-piernas-7',
      nombre: 'Piernas — Completo',
      nivel: 'Avanzado',
      resumen: 'Rutina completa del grupo',
      descripcion: 'Sesión de piernas nivel avanzado — rutina completa del grupo.',
      rutinas: [
        { nombre: 'Piernas — Completo', ejercicios: [
          ej('pistol squat', 4, '5/pierna'), ej('sentadilla con salto', 4, '12'), ej('sentadilla búlgara', 4, '10/pierna'), ej('zancadas saltadas', 3, '12/pierna'), ej('puente de glúteo a una pierna', 3, '15/pierna'), ej('l-sit', 3, '20s'), ej('plancha', 3, '60s')
        ]}
      ]
    },
    {
      id: 'calistenia-core-1',
      nombre: 'Core — Isométricos',
      nivel: 'Principiante',
      resumen: 'Sostenes isométricos',
      descripcion: 'Sesión de core nivel principiante — sostenes isométricos.',
      rutinas: [
        { nombre: 'Core — Isométricos', ejercicios: [
          ej('plancha', 3, '30s'), ej('plancha lateral', 3, '20s/lado'), ej('hollow body hold', 3, '15s'), ej('escaladores', 3, '20')
        ]}
      ]
    },
    {
      id: 'calistenia-core-2',
      nombre: 'Core — Dinámico',
      nivel: 'Principiante',
      resumen: 'Trabajo dinámico',
      descripcion: 'Sesión de core nivel principiante — trabajo dinámico.',
      rutinas: [
        { nombre: 'Core — Dinámico', ejercicios: [
          ej('escaladores', 3, '30'), ej('plancha', 3, '30s'), ej('hollow body hold', 3, '20s'), ej('plancha lateral', 3, '20s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-core-3',
      nombre: 'Core — L-Sit',
      nivel: 'Intermedio',
      resumen: 'L-Sit',
      descripcion: 'Sesión de core nivel intermedio — l-sit.',
      rutinas: [
        { nombre: 'Core — L-Sit', ejercicios: [
          ej('l-sit', 4, '10s'), ej('hollow body hold', 4, '30s'), ej('plancha', 3, '45s'), ej('plancha lateral', 3, '30s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-core-4',
      nombre: 'Core — Resistencia',
      nivel: 'Intermedio',
      resumen: 'Resistencia muscular',
      descripcion: 'Sesión de core nivel intermedio — resistencia muscular.',
      rutinas: [
        { nombre: 'Core — Resistencia', ejercicios: [
          ej('hollow body hold', 4, '30s'), ej('plancha', 3, '60s'), ej('plancha lateral', 3, '45s/lado'), ej('escaladores', 3, '40'), ej('l-sit', 3, '10s')
        ]}
      ]
    },
    {
      id: 'calistenia-core-5',
      nombre: 'Core — Completo',
      nivel: 'Intermedio',
      resumen: 'Rutina completa del grupo',
      descripcion: 'Sesión de core nivel intermedio — rutina completa del grupo.',
      rutinas: [
        { nombre: 'Core — Completo', ejercicios: [
          ej('l-sit', 4, '15s'), ej('hollow body hold', 3, '30s'), ej('plancha lateral', 3, '30s/lado'), ej('escaladores', 3, '30'), ej('plancha', 2, '60s')
        ]}
      ]
    },
    {
      id: 'calistenia-core-6',
      nombre: 'Core — Habilidades',
      nivel: 'Avanzado',
      resumen: 'Habilidades avanzadas',
      descripcion: 'Sesión de core nivel avanzado — habilidades avanzadas.',
      rutinas: [
        { nombre: 'Core — Habilidades', ejercicios: [
          ej('l-sit', 4, '20s'), ej('hollow body hold', 4, '45s'), ej('dragon flag', 3, '5'), ej('plancha lateral', 3, '45s/lado'), ej('plancha', 2, '90s')
        ]}
      ]
    },
    {
      id: 'calistenia-core-7',
      nombre: 'Core — Máxima',
      nivel: 'Avanzado',
      resumen: 'Máxima exigencia',
      descripcion: 'Sesión de core nivel avanzado — máxima exigencia.',
      rutinas: [
        { nombre: 'Core — Máxima', ejercicios: [
          ej('dragon flag', 4, '8'), ej('l-sit', 4, '25s'), ej('hollow body hold', 3, '60s'), ej('plancha lateral', 3, '60s/lado'), ej('escaladores', 3, '50')
        ]}
      ]
    },
    {
      id: 'calistenia-hombros-brazos-1',
      nombre: 'Hombros+Brazos — Base',
      nivel: 'Principiante',
      resumen: 'Fundamentos del grupo',
      descripcion: 'Sesión de hombros y brazos nivel principiante — fundamentos del grupo.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Base', ejercicios: [
          ej('pike push-up', 3, '8'), ej('fondos en banco', 3, '12'), ej('flexiones diamante', 3, '10'), ej('dead hang', 3, '20s'), ej('plancha', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-hombros-brazos-2',
      nombre: 'Hombros+Brazos — Volumen',
      nivel: 'Principiante',
      resumen: 'Volumen moderado',
      descripcion: 'Sesión de hombros y brazos nivel principiante — volumen moderado.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Volumen', ejercicios: [
          ej('pike push-up', 3, '10'), ej('fondos en banco', 3, '15'), ej('flexiones diamante', 3, '12'), ej('dead hang', 3, '30s'), ej('hollow body hold', 3, '20s'), ej('plancha lateral', 2, '20s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-hombros-brazos-3',
      nombre: 'Hombros+Brazos — Fuerza',
      nivel: 'Intermedio',
      resumen: 'Cargas pesadas, pocas reps',
      descripcion: 'Sesión de hombros y brazos nivel intermedio — cargas pesadas, pocas reps.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Fuerza', ejercicios: [
          ej('pike push-up', 4, '8'), ej('handstand contra pared', 3, '20s'), ej('fondos en banco', 4, '15'), ej('flexiones diamante', 3, '12'), ej('l-sit', 3, '10s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-hombros-brazos-4',
      nombre: 'Hombros+Brazos — Hipertrofia',
      nivel: 'Intermedio',
      resumen: 'Volumen alto para hipertrofia',
      descripcion: 'Sesión de hombros y brazos nivel intermedio — volumen alto para hipertrofia.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Hipertrofia', ejercicios: [
          ej('pike push-up', 4, '12'), ej('fondos en banco', 4, '20'), ej('wall walk', 3, '5'), ej('flexiones diamante', 4, '15'), ej('plancha', 3, '45s'), ej('plancha lateral', 3, '30s/lado')
        ]}
      ]
    },
    {
      id: 'calistenia-hombros-brazos-5',
      nombre: 'Hombros+Brazos — Inversión',
      nivel: 'Intermedio',
      resumen: 'Trabajo invertido',
      descripcion: 'Sesión de hombros y brazos nivel intermedio — trabajo invertido.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Inversión', ejercicios: [
          ej('handstand contra pared', 4, '30s'), ej('wall walk', 3, '5'), ej('pike push-up', 3, '12'), ej('fondos en banco', 3, '15'), ej('l-sit', 3, '15s'), ej('hollow body hold', 3, '30s')
        ]}
      ]
    },
    {
      id: 'calistenia-hombros-brazos-6',
      nombre: 'Hombros+Brazos — Handstand',
      nivel: 'Avanzado',
      resumen: 'Progresión de handstand',
      descripcion: 'Sesión de hombros y brazos nivel avanzado — progresión de handstand.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Handstand', ejercicios: [
          ej('handstand (libre)', 4, '15s'), ej('handstand contra pared', 3, '45s'), ej('pike push-up', 4, '15'), ej('fondos en banco', 4, '20'), ej('flexiones diamante', 3, '15'), ej('l-sit', 3, '20s')
        ]}
      ]
    },
    {
      id: 'calistenia-hombros-brazos-7',
      nombre: 'Hombros+Brazos — Completo',
      nivel: 'Avanzado',
      resumen: 'Rutina completa del grupo',
      descripcion: 'Sesión de hombros y brazos nivel avanzado — rutina completa del grupo.',
      rutinas: [
        { nombre: 'Hombros+Brazos — Completo', ejercicios: [
          ej('handstand (libre)', 4, '20s'), ej('wall walk', 4, '5'), ej('pike push-up', 3, '15'), ej('flexiones diamante', 4, '15'), ej('fondos en banco', 3, 'máx'), ej('l-sit', 3, '20s'), ej('hollow body hold', 3, '45s')
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
    },
    {
      id: 'hiit-circuito-cardio',
      nombre: 'Circuito Cardio',
      nivel: 'Principiante',
      resumen: 'Circuito de baja-media intensidad (15 min)',
      descripcion: '5 ejercicios de 40 segundos con 20 de descanso, 3 vueltas completas.',
      hiitSettings: { mode: 'free', workSecs: 40, restSecs: 20, totalRounds: 15 },
      rutinas: [
        { nombre: 'Circuito Cardio', ejercicioIds: ['jumping jacks', 'sentadilla con peso corporal', 'escaladores', 'caminata', 'talones al glúteo'] }
      ]
    },
    {
      id: 'hiit-tabata-full-body',
      nombre: 'Tabata Full Body',
      nivel: 'Intermedio',
      resumen: 'Full body de alta intensidad (4 min)',
      descripcion: 'Protocolo Tabata con 4 ejercicios de cuerpo completo, 2 rondas cada uno.',
      hiitSettings: { mode: 'tabata', workSecs: 20, restSecs: 10, totalRounds: 8 },
      rutinas: [
        { nombre: 'Tabata Full Body', ejercicioIds: ['burpees', 'sentadilla con salto', 'escaladores', 'jumping jacks'] }
      ]
    },
    {
      id: 'hiit-emom-15',
      nombre: 'EMOM 15 min',
      nivel: 'Intermedio',
      resumen: 'Fuerza-resistencia (15 min)',
      descripcion: 'Every Minute On the Minute: 3 ejercicios rotando cada minuto, 5 ciclos completos.',
      hiitSettings: { mode: 'free', workSecs: 60, restSecs: 0, totalRounds: 15 },
      rutinas: [
        { nombre: 'EMOM 15 min', ejercicioIds: ['burpees', 'sentadilla con salto', 'escaladores'] }
      ]
    },
    {
      id: 'hiit-amrap-20-completo',
      nombre: 'AMRAP 20 min',
      nivel: 'Intermedio-Avanzado',
      resumen: 'Máximas rondas en 20 minutos',
      descripcion: 'Completa la mayor cantidad de rondas posible en 20 minutos con estos 4 ejercicios.',
      hiitSettings: null,
      rutinas: [
        { nombre: 'AMRAP 20 min', ejercicioIds: ['burpees', 'jumping jacks', 'escaladores', 'zancadas saltadas'] }
      ]
    },
    {
      id: 'hiit-tabata-extrema',
      nombre: 'Tabata Extrema',
      nivel: 'Avanzado',
      resumen: 'Máxima intensidad (4 min)',
      descripcion: 'Protocolo Tabata con 4 ejercicios explosivos avanzados, 2 rondas cada uno.',
      hiitSettings: { mode: 'tabata', workSecs: 20, restSecs: 10, totalRounds: 8 },
      rutinas: [
        { nombre: 'Tabata Extrema', ejercicioIds: ['burpee con salto tuck', 'sprint', 'saltos al cajón', 'escaladores'] }
      ]
    },
    {
      id: 'hiit-emom-20',
      nombre: 'EMOM 20 min',
      nivel: 'Avanzado',
      resumen: 'Fuerza-resistencia avanzada (20 min)',
      descripcion: 'Every Minute On the Minute: 4 ejercicios rotando cada minuto, 5 ciclos completos.',
      hiitSettings: { mode: 'free', workSecs: 60, restSecs: 0, totalRounds: 20 },
      rutinas: [
        { nombre: 'EMOM 20 min', ejercicioIds: ['burpee con salto tuck', 'sentadilla con salto', 'escaladores', 'burpee box jump'] }
      ]
    }
  ]
};
