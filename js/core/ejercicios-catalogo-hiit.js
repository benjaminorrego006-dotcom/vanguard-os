// Ejercicios de HIIT/Cardio — ver ejercicios-catalogo-gym.js para la nota
// completa sobre por qué está dividido así.
export const CATALOGO_HIIT = {
  'jumping jacks': {
    id: 'jumping jacks',
    nombre: 'Jumping Jacks',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'cuerpo completo',
    posturaInicial: 'De pie, brazos a los costados, piernas juntas.',
    pasosEjecucion: [
      'Salta abriendo piernas y brazos simultáneamente.',
      'Regresa a la posición inicial con otro salto.',
      'Mantén un ritmo constante.'
    ],
    erroresComunes: [
      'Aterrizar con las piernas rígidas.',
      'Perder el ritmo constante por fatiga.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  // --- Etapa 2d: poblar HIIT/Cardio, hoy con solo 4 ejercicios propios ---
  'rodillas altas': {
    id: 'rodillas altas',
    nombre: 'Rodillas Altas',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'core',
    posturaInicial: 'De pie, listo para trotar en el lugar.',
    pasosEjecucion: [
      'Trota en el lugar llevando cada rodilla a la altura de la cadera lo más rápido posible.',
      'Mantén el torso erguido y los brazos en movimiento coordinado.'
    ],
    erroresComunes: [
      'No levantar las rodillas lo suficiente.',
      'Inclinar el torso hacia adelante.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  'talones al glúteo': {
    id: 'talones al glúteo',
    nombre: 'Talones al Glúteo',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'core',
    posturaInicial: 'De pie, listo para trotar en el lugar.',
    pasosEjecucion: [
      'Trota en el lugar llevando cada talón hacia el glúteo.',
      'Mantén el ritmo rápido y el torso erguido.'
    ],
    erroresComunes: [
      'Inclinarse hacia adelante compensando.',
      'No llevar el talón lo suficientemente atrás.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  'salto a la comba': {
    id: 'salto a la comba',
    nombre: 'Salto a la Comba',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'core, antebrazos',
    posturaInicial: 'De pie con la comba detrás de los talones, un mango en cada mano.',
    pasosEjecucion: [
      'Gira la comba con las muñecas y salta apenas lo necesario para dejarla pasar bajo los pies.',
      'Aterriza suave, sobre la punta de los pies.'
    ],
    erroresComunes: [
      'Saltar demasiado alto, gastando energía de más.',
      'Girar la comba con el brazo entero en vez de la muñeca.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  'step-ups': {
    id: 'step-ups',
    nombre: 'Step-ups',
    categoria: 'hiit',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos',
    posturaInicial: 'De pie frente a un cajón o banco estable.',
    pasosEjecucion: [
      'Sube apoyando todo el pie en el cajón y extendiendo la cadera arriba.',
      'Baja controladamente y alterna la pierna que inicia.'
    ],
    erroresComunes: [
      'Impulsarse con la pierna de abajo en vez de empujar con la de arriba.',
      'Usar un cajón demasiado alto que rompe la técnica.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "cajon",
    patronMovimiento: "rodilla"
  },
  'plancha jacks': {
    id: 'plancha jacks',
    nombre: 'Plancha Jacks',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'core',
    musculoSecundario: 'hombros',
    posturaInicial: 'Posición de plancha alta, brazos extendidos.',
    pasosEjecucion: [
      'Salta abriendo ambos pies hacia afuera, luego vuelve a juntarlos.',
      'Mantén la posición de plancha (cadera estable) durante todo el movimiento.'
    ],
    erroresComunes: [
      'Elevar la cadera al saltar.',
      'Perder la línea recta del cuerpo.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  // Prerrequisito de Burpees: el escalón que falta entre nada y el burpee
  // completo (sin flexión ni salto final).
  'medio burpee': {
    id: 'medio burpee',
    nombre: 'Medio Burpee',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'cuerpo completo',
    posturaInicial: 'De pie, listo para iniciar el movimiento.',
    pasosEjecucion: [
      'Baja a sentadilla y coloca las manos en el piso.',
      'Lleva los pies hacia atrás a posición de plancha, sin flexión.',
      'Regresa los pies hacia las manos y ponte de pie, sin salto final.'
    ],
    erroresComunes: [
      'Perder la forma de la espalda al llevar los pies hacia atrás.',
      'Apurar la transición sacrificando control.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  'saltos al cajón': {
    id: 'saltos al cajón',
    nombre: 'Saltos al Cajón',
    categoria: 'hiit',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos',
    posturaInicial: 'De pie frente a un cajón, pies al ancho de cadera.',
    pasosEjecucion: [
      'Flexiona rodillas y cadera, salta explosivo aterrizando con ambos pies sobre el cajón.',
      'Baja con control, un pie a la vez o con un salto suave hacia atrás.'
    ],
    erroresComunes: [
      'Aterrizar con las piernas rígidas.',
      'Elegir un cajón demasiado alto para la fuerza actual.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "cajon",
    patronMovimiento: "rodilla"
  },
  'kettlebell swing': {
    id: 'kettlebell swing',
    nombre: 'Kettlebell Swing',
    categoria: 'hiit',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'espalda baja, core',
    posturaInicial: 'De pie con los pies al ancho de hombros, kettlebell en el piso al frente.',
    pasosEjecucion: [
      'Con bisagra de cadera, impulsa la kettlebell hacia arriba con la explosión de la cadera, no de los brazos.',
      'Deja que baje entre las piernas y repite el impulso.'
    ],
    erroresComunes: [
      'Usar los brazos para levantar en vez de la cadera.',
      'Redondear la espalda baja.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "kettlebell",
    patronMovimiento: "cadera"
  },
  'thrusters': {
    id: 'thrusters',
    nombre: 'Thrusters',
    categoria: 'hiit',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'hombros',
    posturaInicial: 'De pie con mancuernas a la altura de los hombros, pies al ancho de hombros.',
    pasosEjecucion: [
      'Baja en sentadilla completa.',
      'Al subir, usa el impulso para empujar las mancuernas hacia arriba en un press por encima de la cabeza.'
    ],
    erroresComunes: [
      'Separar la sentadilla del press en dos movimientos en vez de uno fluido.',
      'No llegar a sentadilla completa.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "rodilla"
  },
  'battle ropes': {
    id: 'battle ropes',
    nombre: 'Battle Ropes',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'hombros, core',
    posturaInicial: 'De pie sujetando un extremo de la cuerda en cada mano, rodillas semiflexionadas.',
    pasosEjecucion: [
      'Genera olas alternando los brazos arriba y abajo con fuerza constante.',
      'Mantén el core apretado y las rodillas semiflexionadas.'
    ],
    erroresComunes: [
      'Mover solo los brazos sin generar la ola completa.',
      'Perder la postura de rodillas semiflexionadas.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "core"
  },
  'burpee con salto tuck': {
    id: 'burpee con salto tuck',
    nombre: 'Burpee con Salto Tuck',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'cuerpo completo',
    posturaInicial: 'De pie, listo para iniciar el burpee completo.',
    pasosEjecucion: [
      'Ejecuta el burpee completo con flexión.',
      'En el salto final, lleva ambas rodillas al pecho antes de aterrizar.'
    ],
    erroresComunes: [
      'No completar la flexión antes del salto.',
      'Aterrizar sin amortiguar.'
    ],
    nivel: "avanzado",
    prerequisitos: ["burpees"],
    progresionDe: "burpees",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  'burpee box jump': {
    id: 'burpee box jump',
    nombre: 'Burpee Box Jump',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'cuerpo completo',
    posturaInicial: 'De pie frente a un cajón, listo para iniciar el burpee.',
    pasosEjecucion: [
      'Ejecuta el burpee completo con flexión.',
      'En vez del salto vertical, salta con ambos pies sobre el cajón.'
    ],
    erroresComunes: [
      'Elegir un cajón demasiado alto para la fatiga acumulada del burpee.',
      'Aterrizar con las piernas rígidas.'
    ],
    nivel: "avanzado",
    prerequisitos: ["burpee con salto tuck"],
    progresionDe: "burpee con salto tuck",
    criterioAvance: {"tipo":"reps","valor":6,"series":3},
    tambienEn: [],
    equipo: "cajon",
    patronMovimiento: "locomocion"
  },
  'sprint': {
    id: 'sprint',
    nombre: 'Sprint (carrera de máxima velocidad)',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'piernas',
    musculoSecundario: 'core',
    posturaInicial: 'Calentamiento previo adecuado, postura de carrera con torso ligeramente inclinado.',
    pasosEjecucion: [
      'Corre a la máxima velocidad posible durante el intervalo indicado.',
      'Mantén los brazos a 90° y una pisada media.',
      'Recupera durante el intervalo de descanso indicado.'
    ],
    erroresComunes: [
      'Saltarse el calentamiento (riesgo de lesión).',
      'Sobrezancada (dar pasos demasiado largos).'
    ],
    nivel: "avanzado",
    prerequisitos: ["trote continuo"],
    progresionDe: "trote continuo",
    criterioAvance: {"tipo":"segundos","valor":30,"series":4},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  'trote continuo': {
    id: 'trote continuo',
    nombre: 'Trote Continuo',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'piernas',
    musculoSecundario: 'core',
    posturaInicial: 'Postura de carrera relajada, ritmo sostenible.',
    pasosEjecucion: [
      'Corre a un ritmo constante que te permita mantener una conversación con esfuerzo.',
      'Sostén el ritmo durante toda la duración indicada.'
    ],
    erroresComunes: [
      'Empezar a un ritmo demasiado alto y no poder sostenerlo.',
      'Postura tensa en hombros y mandíbula.'
    ],
    nivel: "principiante",
    prerequisitos: ["caminata"],
    progresionDe: "caminata",
    criterioAvance: {"tipo":"segundos","valor":1200,"series":1},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  }
};
