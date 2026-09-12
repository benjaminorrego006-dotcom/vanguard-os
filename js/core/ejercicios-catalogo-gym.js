// Ejercicios de GYM (pesas) — parte de ejercicios-catalogo.js, dividido
// por categoría porque el archivo único pasó de 54 a 100+ entradas. La
// forma pública (CATALOGO_EJERCICIOS, getEjercicioPorId, etc.) sigue
// viviendo en ejercicios-catalogo.js, que combina este archivo con los de
// calistenia y hiit — nada fuera de ese archivo importa este directamente.
export const CATALOGO_GYM = {
  'sentadilla': {
    id: 'sentadilla',
    nombre: 'Sentadilla',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos, core',
    posturaInicial: 'Barra apoyada sobre el trapecio superior (no el cuello), pies al ancho de hombros, puntas ligeramente hacia afuera, pecho arriba.',
    pasosEjecucion: [
      'Inhala y genera presión abdominal (brace).',
      'Flexiona cadera y rodillas simultáneamente, bajando en línea recta como si te sentaras en una silla.',
      'Desciende hasta que el pliegue de cadera quede a la altura o por debajo de la rodilla.',
      'Empuja el piso con los talones para subir, exhalando al pasar el punto más difícil.'
    ],
    erroresComunes: [
      'Rodillas colapsando hacia adentro (valgo).',
      'Levantar los talones del piso.',
      'Redondear la espalda baja.',
      'Mirar hacia arriba en vez de mantener el cuello neutro.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"ratio","valor":"intermedio","series":null},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "rodilla",
    tipoMovimiento: "compuesto"
  },
  'sentadilla frontal': {
    id: 'sentadilla frontal',
    nombre: 'Sentadilla Frontal',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'core, cuádriceps',
    posturaInicial: 'Barra al frente sobre los deltoides anteriores, codos altos, torso más vertical que en la sentadilla trasera.',
    pasosEjecucion: [
      'Misma mecánica que la sentadilla trasera: flexiona cadera y rodillas bajando en línea recta.',
      'Mantén el torso lo más vertical posible para no perder la barra hacia adelante.',
      'Empuja el piso con los talones para subir.'
    ],
    erroresComunes: [
      'Dejar caer los codos (la barra rueda hacia adelante).',
      'Inclinar demasiado el torso.',
      'Movilidad insuficiente de muñeca/tobillo que rompe la postura.'
    ],
    nivel: "intermedio",
    prerequisitos: ["sentadilla"],
    progresionDe: "sentadilla",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "rodilla",
    tipoMovimiento: "compuesto"
  },
  'peso muerto': {
    id: 'peso muerto',
    nombre: 'Peso Muerto Convencional',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'espalda baja, glúteos',
    posturaInicial: 'Barra sobre el mediopié, pies al ancho de cadera, agarre justo fuera de las piernas.',
    pasosEjecucion: [
      'Flexiona cadera y rodillas hasta agarrar la barra, espalda recta y pecho arriba.',
      'Genera tensión en la barra antes de moverla ("saca la holgura").',
      'Empuja el piso con las piernas mientras la cadera y los hombros suben a la misma velocidad.',
      'Extiende la cadera completamente al final, sin hiperextender la espalda baja.'
    ],
    erroresComunes: [
      'Redondear la espalda baja.',
      'Alejar la barra del cuerpo (debe rozar las piernas).',
      'Extender la cadera antes que los hombros ("hip rise" prematuro).'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"ratio","valor":"intermedio","series":null},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "cadera",
    tipoMovimiento: "compuesto"
  },
  'peso muerto rumano': {
    id: 'peso muerto rumano',
    nombre: 'Peso Muerto Rumano',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos, espalda baja',
    posturaInicial: 'De pie con la barra, rodillas con flexión leve y fija.',
    pasosEjecucion: [
      'Empuja la cadera hacia atrás manteniendo las rodillas casi estáticas.',
      'Baja la barra pegada a las piernas hasta sentir estiramiento en isquiotibiales (usualmente a media espinilla).',
      'Regresa extendiendo la cadera hacia adelante, apretando el glúteo arriba.'
    ],
    erroresComunes: [
      'Doblar demasiado las rodillas (se convierte en sentadilla).',
      'Redondear la espalda.',
      'Alejar la barra del cuerpo.'
    ],
    nivel: "intermedio",
    prerequisitos: ["peso muerto"],
    progresionDe: "peso muerto",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "cadera",
    tipoMovimiento: "compuesto"
  },
  'peso muerto sumo': {
    id: 'peso muerto sumo',
    nombre: 'Peso Muerto Sumo',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos, aductores',
    posturaInicial: 'Stance ancho, puntas de los pies hacia afuera, barra sobre el mediopié, agarre entre las piernas.',
    pasosEjecucion: [
      'Empuja las rodillas hacia afuera mientras te agarras a la barra, torso más vertical que en el convencional.',
      'Empuja el piso con las piernas mientras la cadera y los hombros suben a la misma velocidad.',
      'Extiende la cadera completamente al final, sin hiperextender la espalda baja.'
    ],
    erroresComunes: [
      'Rodillas colapsando hacia adentro.',
      'Redondear la espalda baja.',
      'Stance tan ancho que limita el rango de movimiento útil.'
    ],
    nivel: "intermedio",
    prerequisitos: ["peso muerto"],
    progresionDe: "peso muerto",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "cadera",
    tipoMovimiento: "compuesto"
  },
  'peso muerto piernas rígidas': {
    id: 'peso muerto piernas rígidas',
    nombre: 'Peso Muerto con Piernas Rígidas',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos, espalda baja',
    posturaInicial: 'De pie con la barra, rodillas casi extendidas (mucha menos flexión que en el rumano).',
    pasosEjecucion: [
      'Empuja la cadera hacia atrás con las rodillas casi fijas todo el recorrido.',
      'Baja la barra pegada a las piernas hasta el máximo estiramiento cómodo de isquiotibiales.',
      'Regresa extendiendo la cadera, sin usar impulso de rodillas.'
    ],
    erroresComunes: [
      'Redondear la espalda para ganar rango de movimiento.',
      'Flexionar las rodillas como en un peso muerto rumano normal.'
    ],
    nivel: "avanzado",
    prerequisitos: ["peso muerto rumano"],
    progresionDe: "peso muerto rumano",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "cadera",
    tipoMovimiento: "compuesto"
  },
  'buenos días': {
    id: 'buenos días',
    nombre: 'Buenos Días',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'espalda baja',
    posturaInicial: 'Barra sobre los trapecios como en sentadilla, pies al ancho de hombros, rodillas con flexión leve y fija.',
    pasosEjecucion: [
      'Empuja la cadera hacia atrás inclinando el torso hacia adelante, espalda recta.',
      'Baja hasta que el torso quede casi paralelo al piso o donde la técnica lo permita.',
      'Extiende la cadera hacia adelante para volver a la posición inicial.'
    ],
    erroresComunes: [
      'Redondear la espalda baja — el error más peligroso en este ejercicio.',
      'Usar demasiado peso antes de dominar la técnica.',
      'Doblar las rodillas de más (se acerca a un peso muerto rumano).'
    ],
    nivel: "avanzado",
    prerequisitos: ["peso muerto rumano"],
    progresionDe: "peso muerto rumano",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "cadera",
    tipoMovimiento: "compuesto"
  },
  'hiperextensiones': {
    id: 'hiperextensiones',
    nombre: 'Hiperextensiones',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'espalda baja',
    posturaInicial: 'Cadera apoyada en el banco romano, tobillos fijados, torso doblado hacia abajo en ángulo.',
    pasosEjecucion: [
      'Sube el torso hasta alinearlo con las piernas, apretando el glúteo.',
      'No hiperextender más allá de la línea recta.',
      'Baja controladamente hasta el ángulo inicial.'
    ],
    erroresComunes: [
      'Hiperextender de más buscando más rango.',
      'Usar impulso en vez de control.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "cadera",
    tipoMovimiento: "aislamiento"
  },
  'superman': {
    id: 'superman',
    nombre: 'Superman',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos, hombros',
    posturaInicial: 'Acostado boca abajo, brazos extendidos al frente, piernas extendidas.',
    pasosEjecucion: [
      'Levanta brazos y piernas del piso al mismo tiempo, apretando la espalda baja y el glúteo.',
      'Sostén brevemente arriba.',
      'Baja controladamente sin dejarte caer.'
    ],
    erroresComunes: [
      'Usar impulso en vez de control.',
      'Levantar solo brazos o solo piernas.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "cadera",
    tipoMovimiento: "aislamiento"
  },
  'press de banca': {
    id: 'press de banca',
    nombre: 'Press de Banca',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Acostado en el banco, escápulas retraídas y pecho ligeramente elevado, pies firmes en el piso.',
    pasosEjecucion: [
      'Baja la barra de forma controlada hasta tocar el pecho a la altura de la línea del pezón.',
      'Mantén los codos a unos 45-60° del torso, no pegados ni completamente abiertos.',
      'Empuja la barra hacia arriba en línea recta hasta extender los codos.'
    ],
    erroresComunes: [
      'Rebotar la barra en el pecho.',
      'Levantar la cadera del banco.',
      'Codos completamente abiertos a 90° (estrés en el hombro).'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"ratio","valor":"intermedio","series":null},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press inclinado': {
    id: 'press inclinado',
    nombre: 'Press Inclinado',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, hombro anterior',
    posturaInicial: 'Igual mecánica que el Press de Banca, pero en banco inclinado a 30-45°.',
    pasosEjecucion: [
      'Baja la barra o mancuernas controladamente hacia la parte superior del pecho.',
      'Empuja en línea recta hasta extender los codos.'
    ],
    erroresComunes: [
      'Inclinar demasiado el banco (se vuelve un press de hombro).',
      'Rebotar en el pecho.'
    ],
    nivel: "todos",
    prerequisitos: ["press de banca"],
    progresionDe: "press de banca",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press de banca con mancuernas': {
    id: 'press de banca con mancuernas',
    nombre: 'Press de Banca con Mancuernas',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, hombros',
    posturaInicial: 'Acostado en banco plano, una mancuerna en cada mano a la altura del pecho.',
    pasosEjecucion: [
      'Empuja las mancuernas hacia arriba hasta extender los codos, sin juntarlas del todo.',
      'Baja controladamente hasta sentir el estiramiento del pecho.'
    ],
    erroresComunes: [
      'Dejar caer las mancuernas en la bajada en vez de controlarla.',
      'Muñecas dobladas hacia atrás en vez de neutras.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press inclinado con mancuernas': {
    id: 'press inclinado con mancuernas',
    nombre: 'Press Inclinado con Mancuernas',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, hombro anterior',
    posturaInicial: 'Acostado en banco inclinado a 30-45°, una mancuerna en cada mano a la altura de la parte superior del pecho.',
    pasosEjecucion: [
      'Empuja las mancuernas hacia arriba y ligeramente hacia adentro hasta extender los codos.',
      'Baja controladamente hasta sentir el estiramiento en la parte superior del pecho.'
    ],
    erroresComunes: [
      'Inclinar demasiado el banco (se vuelve un press de hombro).',
      'Dejar caer las mancuernas en la bajada en vez de controlarla.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press declinado': {
    id: 'press declinado',
    nombre: 'Press Declinado',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Acostado en banco declinado, pies fijados arriba, barra a la altura de la parte baja del pecho.',
    pasosEjecucion: [
      'Baja la barra controladamente hacia la parte baja del pecho.',
      'Empuja en línea recta hasta extender los codos.'
    ],
    erroresComunes: [
      'Rebotar la barra en el pecho.',
      'Bajar la barra demasiado alto (se acerca a un press plano).'
    ],
    nivel: "intermedio",
    prerequisitos: ["press de banca"],
    progresionDe: "press de banca",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press declinado con mancuernas': {
    id: 'press declinado con mancuernas',
    nombre: 'Press Declinado con Mancuernas',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Acostado en banco declinado, pies fijados arriba, una mancuerna en cada mano a la altura de la parte baja del pecho.',
    pasosEjecucion: [
      'Empuja las mancuernas hacia arriba hasta extender los codos, sin juntarlas del todo.',
      'Baja controladamente hasta sentir el estiramiento en la parte baja del pecho.'
    ],
    erroresComunes: [
      'Dejar caer las mancuernas en la bajada en vez de controlarla.',
      'Bajar las mancuernas demasiado alto (se acerca a un press plano).'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press cerrado en banca': {
    id: 'press cerrado en banca',
    nombre: 'Press Cerrado en Banca',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Acostado en banco plano, agarre en la barra más cerrado que el ancho de hombros.',
    pasosEjecucion: [
      'Baja la barra controladamente hacia la parte baja del pecho, codos pegados al cuerpo.',
      'Empuja en línea recta hasta extender los codos, enfocando el esfuerzo en el tríceps.'
    ],
    erroresComunes: [
      'Agarre tan cerrado que fuerza la muñeca.',
      'Abrir los codos hacia afuera (pierde el énfasis en tríceps).'
    ],
    nivel: "intermedio",
    prerequisitos: ["press de banca"],
    progresionDe: "press de banca",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press con banda elástica': {
    id: 'press con banda elástica',
    nombre: 'Press con Banda Elástica',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, hombros',
    posturaInicial: 'De pie o de rodillas, banda anclada detrás a la altura del pecho, un extremo en cada mano.',
    pasosEjecucion: [
      'Empuja ambas manos hacia adelante hasta extender los codos.',
      'Regresa controladamente sin perder la tensión de la banda.'
    ],
    erroresComunes: [
      'Perder la tensión de la banda al final del recorrido.',
      'Encorvar los hombros hacia adelante.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "banda",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'press en máquina': {
    id: 'press en máquina',
    nombre: 'Press en Máquina',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, hombros',
    posturaInicial: 'Sentado en la máquina de press (plano o inclinado), agarraderas a la altura del pecho.',
    pasosEjecucion: [
      'Empuja las agarraderas hacia adelante hasta extender los codos.',
      'Regresa controladamente sin dejar caer el peso.'
    ],
    erroresComunes: [
      'Rebotar el peso en la posición inicial.',
      'Extender los codos de golpe sin control.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'aperturas con mancuernas': {
    id: 'aperturas con mancuernas',
    nombre: 'Aperturas con Mancuernas',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros',
    posturaInicial: 'Acostado en banco plano, mancuernas extendidas sobre el pecho con codos con flexión leve.',
    pasosEjecucion: [
      'Baja los brazos hacia los lados en arco, manteniendo la flexión leve del codo.',
      'Junta las mancuernas de vuelta arriba en el mismo arco, sin extender del todo los codos.'
    ],
    erroresComunes: [
      'Doblar y extender el codo como si fuera un press (pierde el estiramiento del pecho).',
      'Bajar demasiado y forzar el hombro más allá de su rango cómodo.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'aperturas inclinadas con mancuernas': {
    id: 'aperturas inclinadas con mancuernas',
    nombre: 'Aperturas Inclinadas con Mancuernas',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros',
    posturaInicial: 'Acostado en banco inclinado a 30-45°, mancuernas extendidas sobre la parte superior del pecho con codos con flexión leve.',
    pasosEjecucion: [
      'Baja los brazos hacia los lados en arco, manteniendo la flexión leve del codo.',
      'Junta las mancuernas de vuelta arriba en el mismo arco, enfocando la parte superior del pecho.'
    ],
    erroresComunes: [
      'Doblar y extender el codo como si fuera un press (pierde el estiramiento del pecho).',
      'Inclinar demasiado el banco (pasa a trabajar más el hombro).'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'aperturas en polea': {
    id: 'aperturas en polea',
    nombre: 'Aperturas en Polea',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros',
    posturaInicial: 'De pie entre dos poleas altas, un cable en cada mano, un paso adelante.',
    pasosEjecucion: [
      'Junta las manos al frente del pecho en un arco amplio, codos con flexión leve.',
      'Regresa controladamente a la posición inicial sin perder la tensión del cable.'
    ],
    erroresComunes: [
      'Usar los brazos como palanca en vez de mantener el arco.',
      'Encorvar los hombros hacia adelante.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'pec deck': {
    id: 'pec deck',
    nombre: 'Pec Deck (Máquina de Aperturas)',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros',
    posturaInicial: 'Sentado en la máquina, espalda apoyada, antebrazos o manos en las almohadillas a la altura del pecho.',
    pasosEjecucion: [
      'Junta las almohadillas al frente del pecho en un arco, sin usar impulso.',
      'Regresa controladamente hasta sentir el estiramiento del pecho.'
    ],
    erroresComunes: [
      'Usar impulso del torso para mover el peso.',
      'Abrir demasiado y forzar el hombro más allá de su rango cómodo.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'pull-over con mancuerna': {
    id: 'pull-over con mancuerna',
    nombre: 'Pull-Over con Mancuerna',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'espalda, tríceps',
    // Híbrido pecho/dorsal: tageado como accesorio de pecho (empuje-
    // horizontal), no como slot de espalda — spec-catalogo-gym.md, sección 2.
    posturaInicial: 'Acostado perpendicular a un banco (solo la parte alta de la espalda apoyada), mancuerna sostenida con ambas manos sobre el pecho.',
    pasosEjecucion: [
      'Con los codos ligeramente flexionados y fijos, baja la mancuerna en arco por detrás de la cabeza.',
      'Sentí el estiramiento del pecho y el dorsal, luego regresa en el mismo arco.'
    ],
    erroresComunes: [
      'Doblar y estirar los codos durante el movimiento.',
      'Bajar demasiado la cadera en vez de mantenerla firme.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'press militar': {
    id: 'press militar',
    nombre: 'Press Militar (de pie)',
    categoria: 'gym',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Barra a la altura de la clavícula, pies al ancho de cadera, glúteos y abdomen apretados.',
    pasosEjecucion: [
      'Empuja la barra hacia arriba en línea recta, moviendo levemente la cabeza hacia atrás para dejarla pasar.',
      'Extiende completamente los codos arriba, con la cabeza "asomándose" entre los brazos al final.',
      'Baja controladamente a la posición inicial.'
    ],
    erroresComunes: [
      'Arquear excesivamente la espalda baja.',
      'Usar impulso de piernas (eso sería "push press").',
      'No extender completamente arriba.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"ratio","valor":"intermedio","series":null},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "empuje-vertical",
    tipoMovimiento: "compuesto"
  },
  'press arnold': {
    id: 'press arnold',
    nombre: 'Press Arnold',
    categoria: 'gym',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'tríceps, estabilizadores del hombro',
    posturaInicial: 'Sentado o de pie con mancuernas, palmas mirando hacia el cuerpo a la altura de los hombros.',
    pasosEjecucion: [
      'Empuja hacia arriba mientras rotas las muñecas 180°.',
      'Termina con las palmas hacia adelante arriba, codos extendidos.',
      'Baja controladamente revirtiendo la rotación.'
    ],
    erroresComunes: [
      'Rotar demasiado rápido perdiendo el control del peso.',
      'No completar el rango de extensión arriba.'
    ],
    nivel: "intermedio",
    prerequisitos: ["press militar"],
    progresionDe: "press militar",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-vertical",
    tipoMovimiento: "compuesto"
  },
  'remo con barra': {
    id: 'remo con barra',
    nombre: 'Remo con Barra',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Flexión de cadera ~45°, espalda recta, barra colgando frente a las piernas.',
    pasosEjecucion: [
      'Tira de la barra hacia el abdomen bajo, llevando los codos hacia atrás (no hacia afuera).',
      'Aprieta los omóplatos al final del movimiento.',
      'Baja controladamente sin perder la posición de espalda.'
    ],
    erroresComunes: [
      'Usar impulso del torso (balanceo).',
      'Redondear la espalda baja.',
      'No completar el rango de movimiento.'
    ],
    nivel: "intermedio",
    prerequisitos: ["remo en máquina"],
    progresionDe: "remo en máquina",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "compuesto"
  },
  'remo con mancuerna a una mano': {
    id: 'remo con mancuerna a una mano',
    nombre: 'Remo con Mancuerna a Una Mano',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Una rodilla y la mano del mismo lado apoyadas en un banco, espalda paralela al piso, mancuerna en la otra mano colgando.',
    pasosEjecucion: [
      'Tira de la mancuerna hacia la cadera, llevando el codo hacia atrás pegado al cuerpo.',
      'Aprieta el omóplato al final del movimiento.',
      'Baja controladamente hasta extender el brazo por completo.'
    ],
    erroresComunes: [
      'Rotar el torso para ayudar con impulso en vez de aislar la espalda.',
      'No completar el rango de movimiento.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "compuesto"
  },
  'remo pendlay': {
    id: 'remo pendlay',
    nombre: 'Remo Pendlay',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Torso paralelo al piso, barra en el suelo frente a las piernas, agarre prono al ancho de hombros.',
    pasosEjecucion: [
      'Desde parada muerta en el piso, tira explosivo de la barra hacia el abdomen bajo.',
      'Aprieta los omóplatos al final del movimiento.',
      'Devuelve la barra al piso hasta parada completa antes de la siguiente repetición.'
    ],
    erroresComunes: [
      'No devolver la barra al piso entre repeticiones (convertirlo en un remo con barra normal).',
      'Redondear la espalda baja al bajar.',
      'Usar impulso de piernas en vez de tirón explosivo controlado.'
    ],
    nivel: "avanzado",
    prerequisitos: ["remo con barra"],
    progresionDe: "remo con barra",
    criterioAvance: {"tipo":"reps","valor":6,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "compuesto"
  },
  'dominadas': {
    id: 'dominadas',
    nombre: 'Dominadas',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Agarre pronado (palmas hacia adelante), un poco más ancho que los hombros, colgado con brazos extendidos.',
    pasosEjecucion: [
      'Tira del cuerpo hacia arriba llevando el pecho hacia la barra, iniciando el movimiento con la espalda, no solo los brazos.',
      'Sube hasta que la barbilla pase la barra.',
      'Baja controladamente hasta extensión completa de brazos.'
    ],
    erroresComunes: [
      'Usar impulso de piernas (kipping no controlado).',
      'No bajar a extensión completa.',
      'Encoger los hombros en vez de usar la espalda.'
    ],
    nivel: "intermedio",
    prerequisitos: ["jalón al pecho"],
    progresionDe: "jalón al pecho",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'jalón al pecho': {
    id: 'jalón al pecho',
    nombre: 'Jalón al Pecho',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Sentado en la máquina, agarre pronado más ancho que los hombros, muslos fijados bajo el soporte.',
    pasosEjecucion: [
      'Tira de la barra hacia el pecho con la espalda, codos hacia abajo y atrás.',
      'Evita balancear el torso hacia atrás excesivamente.',
      'Regresa controladamente a extensión completa.'
    ],
    erroresComunes: [
      'Balancear el torso para generar impulso.',
      'Tirar solo con los brazos sin activar la espalda.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'jalón al pecho agarre cerrado': {
    id: 'jalón al pecho agarre cerrado',
    nombre: 'Jalón al Pecho Agarre Cerrado',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Sentado en la máquina, barra V o agarre cerrado, muslos fijados bajo el soporte.',
    pasosEjecucion: [
      'Tira de la barra hacia el pecho bajo, codos pegados al cuerpo.',
      'Aprieta la espalda al final del movimiento.',
      'Regresa controladamente a extensión completa.'
    ],
    erroresComunes: [
      'Balancear el torso para generar impulso.',
      'Tirar solo con los brazos sin activar la espalda.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'jalón al pecho supino': {
    id: 'jalón al pecho supino',
    nombre: 'Jalón al Pecho Supino',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Sentado en la máquina, agarre supino (palmas hacia el cuerpo) al ancho de hombros.',
    pasosEjecucion: [
      'Tira de la barra hacia el pecho, llevando los codos hacia abajo y atrás.',
      'Aprieta la espalda y el bíceps al final del movimiento.',
      'Regresa controladamente a extensión completa.'
    ],
    erroresComunes: [
      'Balancear el torso para generar impulso.',
      'Convertirlo en un curl de bíceps en vez de un tirón de espalda.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'dominadas supinas': {
    id: 'dominadas supinas',
    nombre: 'Dominadas Supinas',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Colgado de la barra con agarre supino (palmas hacia la cara), al ancho de hombros.',
    pasosEjecucion: [
      'Tira del cuerpo hacia arriba hasta que la barbilla pase la barra.',
      'Inicia el movimiento con la espalda, no solo con los brazos.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Usar impulso de piernas (kipping) sin querer.',
      'No completar el rango de movimiento arriba o abajo.'
    ],
    nivel: "principiante",
    // Raíz independiente, NO progresión de jalón al pecho: jalón al pecho
    // necesita máquina, y gatear la única dominada "fácil" alcanzable con
    // solo barra de dominadas detrás de un ejercicio de máquina dejaba a
    // cualquier usuario sin máquina sin ningún compuesto real de Tracción
    // Vertical (el generador terminaba llenando el slot con Encogimientos
    // de Hombros, un accesorio, sin avisar del hueco).
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":6,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'dominadas agarre neutro': {
    id: 'dominadas agarre neutro',
    nombre: 'Dominadas Agarre Neutro',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Colgado de agarres paralelos (agarre neutro, palmas enfrentadas), al ancho de hombros.',
    pasosEjecucion: [
      'Tira del cuerpo hacia arriba hasta que la barbilla pase el nivel de las manos.',
      'Inicia el movimiento con la espalda, no solo con los brazos.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Usar impulso de piernas (kipping) sin querer.',
      'No completar el rango de movimiento arriba o abajo.'
    ],
    nivel: "principiante",
    // Raíz independiente — mismo motivo que Dominadas Supinas: no gatear
    // detrás de jalón al pecho (requiere máquina).
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":6,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'dominadas agarre ancho': {
    id: 'dominadas agarre ancho',
    nombre: 'Dominadas Agarre Ancho',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Colgado de la barra con agarre pronado, notablemente más ancho que los hombros.',
    pasosEjecucion: [
      'Tira del cuerpo hacia arriba priorizando llevar el pecho a la barra, no la barbilla.',
      'Enfoca el tirón en la espalda ancha, con menor ayuda del bíceps que en la dominada estándar.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Agarre tan ancho que reduce el rango de movimiento real.',
      'Usar impulso de piernas (kipping) sin querer.'
    ],
    nivel: "avanzado",
    prerequisitos: ["dominadas"],
    progresionDe: "dominadas",
    criterioAvance: {"tipo":"reps","valor":6,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'jalón tras nuca': {
    id: 'jalón tras nuca',
    nombre: 'Jalón Tras Nuca',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Sentado en la máquina, agarre pronado bien ancho, barra por detrás de la cabeza.',
    pasosEjecucion: [
      'Tira de la barra hacia la nuca, sin forzar el cuello hacia adelante.',
      'Detente si sentís pinzamiento o molestia en el hombro — no es apto para todos.',
      'Regresa controladamente a extensión completa.'
    ],
    erroresComunes: [
      'Forzar el rango de movimiento con movilidad de hombro insuficiente.',
      'Usar demasiado peso y compensar con el cuello hacia adelante.'
    ],
    nivel: "avanzado",
    prerequisitos: ["jalón al pecho"],
    progresionDe: "jalón al pecho",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "compuesto"
  },
  'pull-over en polea alta': {
    id: 'pull-over en polea alta',
    nombre: 'Pull-Over en Polea Alta',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'pecho',
    posturaInicial: 'De pie o con una rodilla apoyada, frente a la polea alta, cuerda o barra recta sobre la cabeza, brazos casi extendidos.',
    pasosEjecucion: [
      'Con los codos ligeramente flexionados y fijos, baja los brazos en arco hasta la altura de los muslos.',
      'Sentí el estiramiento y la contracción del dorsal, no de los tríceps.',
      'Regresa controladamente a la posición inicial.'
    ],
    erroresComunes: [
      'Doblar y estirar los codos durante el movimiento (lo convierte en un ejercicio de tríceps).',
      'Usar demasiado peso y perder el arco del movimiento.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "aislamiento"
  },
  'fondos en paralelas': {
    id: 'fondos en paralelas',
    nombre: 'Fondos en Paralelas',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, hombros',
    posturaInicial: 'Sujeto en barras paralelas, brazos extendidos, cuerpo ligeramente inclinado hacia adelante.',
    pasosEjecucion: [
      'Baja flexionando los codos hasta que el hombro quede a la altura del codo aproximadamente.',
      'Empuja hacia arriba extendiendo los codos completamente.'
    ],
    erroresComunes: [
      'Bajar demasiado (estrés excesivo en el hombro).',
      'Codos completamente abiertos hacia los lados.'
    ],
    nivel: "intermedio",
    prerequisitos: ["fondos en banco"],
    progresionDe: "fondos en banco",
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'curl de bíceps': {
    id: 'curl de bíceps',
    nombre: 'Curl de Bíceps',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'De pie, barra o mancuernas con agarre supino (palmas hacia arriba), codos pegados al torso.',
    pasosEjecucion: [
      'Flexiona el codo llevando el peso hacia el hombro, sin mover los codos hacia adelante.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Balancear el torso para generar impulso.',
      'Mover los codos hacia adelante durante el movimiento.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl martillo': {
    id: 'curl martillo',
    nombre: 'Curl Martillo',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos, braquial',
    posturaInicial: 'De pie, mancuernas con agarre neutro (palmas enfrentadas), codos pegados al torso.',
    pasosEjecucion: [
      'Flexiona el codo llevando el peso hacia el hombro, manteniendo el agarre neutro.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Balancear el torso para generar impulso.',
      'Mover los codos hacia adelante durante el movimiento.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl con barra': {
    id: 'curl con barra',
    nombre: 'Curl con Barra',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    // Cubre tanto barra recta como barra Z (EZ bar) — la Z es más cómoda
    // para la muñeca pero el movimiento y el músculo trabajado son los
    // mismos, no amerita una entrada de catálogo aparte.
    posturaInicial: 'De pie, agarre pronado en la barra (recta o Z) al ancho de hombros, codos pegados al torso.',
    pasosEjecucion: [
      'Flexiona los codos llevando la barra hacia el pecho, sin mover los codos hacia adelante.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Balancear el torso para generar impulso.',
      'Mover los codos hacia adelante durante el movimiento.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl concentrado': {
    id: 'curl concentrado',
    nombre: 'Curl Concentrado',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'Sentado, codo apoyado contra la cara interna del muslo, mancuerna colgando.',
    pasosEjecucion: [
      'Flexiona el codo llevando la mancuerna hacia el hombro, sin mover el brazo del muslo.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Despegar el codo del muslo para generar impulso.',
      'Rango de movimiento incompleto.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl en banco scott': {
    id: 'curl en banco scott',
    nombre: 'Curl en Banco Scott (Predicador)',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'Brazos apoyados sobre el banco inclinado, axilas cerca del borde superior, agarre en barra o mancuernas.',
    pasosEjecucion: [
      'Flexiona los codos sin despegar los brazos del banco.',
      'Baja controladamente hasta extensión casi completa, sin trabar el codo.'
    ],
    erroresComunes: [
      'Despegar los brazos del banco para generar impulso.',
      'Extender el codo del todo y trabarlo abajo.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "banco",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl en polea baja': {
    id: 'curl en polea baja',
    nombre: 'Curl en Polea Baja',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'De pie frente a la polea baja, agarre en barra recta, cuerda o barra EZ, codos pegados al torso.',
    pasosEjecucion: [
      'Flexiona los codos llevando el agarre hacia el pecho, sin mover los codos.',
      'Regresa controladamente manteniendo la tensión del cable.'
    ],
    erroresComunes: [
      'Balancear el torso para generar impulso.',
      'Perder la tensión del cable al extender.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl 21s': {
    id: 'curl 21s',
    nombre: 'Curl 21s',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'De pie, agarre pronado en la barra al ancho de hombros.',
    pasosEjecucion: [
      '7 repeticiones de la mitad inferior del recorrido (de abajo hasta la mitad).',
      '7 repeticiones de la mitad superior (de la mitad hasta arriba).',
      '7 repeticiones de recorrido completo, sin descanso entre los tres bloques.'
    ],
    erroresComunes: [
      'Usar tanto peso que ninguno de los tres tramos se hace con buena forma.',
      'Balancear el torso para compensar la fatiga.'
    ],
    nivel: "intermedio",
    prerequisitos: ["curl con barra"],
    progresionDe: "curl con barra",
    criterioAvance: {"tipo":"reps","valor":1,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl spider': {
    id: 'curl spider',
    nombre: 'Curl Spider',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'Boca abajo sobre un banco inclinado, brazos colgando al frente, mancuernas en cada mano.',
    pasosEjecucion: [
      'Flexiona los codos llevando las mancuernas hacia los hombros.',
      'Baja controladamente hasta extensión completa, sintiendo el estiramiento.'
    ],
    erroresComunes: [
      'Despegar los hombros del banco para generar impulso.',
      'Rango de movimiento incompleto.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "banco",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'curl inverso': {
    id: 'curl inverso',
    nombre: 'Curl Inverso',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'De pie, agarre pronado (palmas hacia abajo) en la barra al ancho de hombros.',
    pasosEjecucion: [
      'Flexiona los codos llevando la barra hacia el pecho sin rotar las muñecas.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Rotar las muñecas hacia un curl normal a mitad de camino.',
      'Balancear el torso para generar impulso.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'extensión de tríceps': {
    id: 'extensión de tríceps',
    nombre: 'Extensión de Tríceps',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'empuje',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Codo fijo pegado al cuerpo o por encima de la cabeza según la variante (polea o mancuerna).',
    pasosEjecucion: [
      'Extiende el codo completamente sin mover el hombro.',
      'Regresa controladamente sin perder la posición del codo.'
    ],
    erroresComunes: [
      'Mover el codo durante el ejercicio.',
      'Usar impulso del hombro.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'press francés': {
    id: 'press francés',
    nombre: 'Press Francés',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'empuje',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Acostado en banco plano, barra Z sostenida con brazos extendidos sobre el pecho.',
    pasosEjecucion: [
      'Flexiona los codos bajando la barra hacia la frente, manteniendo los brazos fijos verticales.',
      'Extiende los codos de vuelta sin mover los hombros.'
    ],
    erroresComunes: [
      'Mover los codos hacia afuera o adelante.',
      'Bajar la barra demasiado rápido.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'press francés con mancuernas': {
    id: 'press francés con mancuernas',
    nombre: 'Press Francés con Mancuernas',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'empuje',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Acostado en banco plano o inclinado, una mancuerna en cada mano sobre el pecho, codos apuntando al techo.',
    pasosEjecucion: [
      'Flexiona los codos bajando las mancuernas hacia las sienes.',
      'Extiende los codos de vuelta sin mover los hombros.'
    ],
    erroresComunes: [
      'Mover los codos hacia afuera.',
      'Bajar las mancuernas demasiado rápido.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'extensión overhead con mancuerna': {
    id: 'extensión overhead con mancuerna',
    nombre: 'Extensión Overhead con Mancuerna',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'empuje',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Sentado o de pie, una mancuerna sostenida con ambas manos por encima de la cabeza, codos apuntando al frente.',
    pasosEjecucion: [
      'Flexiona los codos bajando la mancuerna detrás de la cabeza.',
      'Extiende los codos de vuelta sin abrirlos hacia los lados.'
    ],
    erroresComunes: [
      'Abrir los codos hacia los lados.',
      'Arquear la espalda baja para compensar.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'patada de tríceps': {
    id: 'patada de tríceps',
    nombre: 'Patada de Tríceps',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'empuje',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Torso inclinado ~45° apoyado en un banco con una mano, mancuerna en la otra, codo pegado al torso a 90°.',
    pasosEjecucion: [
      'Extiende el codo hacia atrás hasta que el brazo quede recto.',
      'Regresa controladamente sin mover el hombro.'
    ],
    erroresComunes: [
      'Mover el hombro en vez de solo el codo.',
      'Usar impulso en vez de control.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'press cerrado en máquina smith': {
    id: 'press cerrado en máquina smith',
    nombre: 'Press Cerrado en Máquina Smith',
    categoria: 'gym',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Acostado en banco plano bajo la barra fija de la máquina Smith, agarre más cerrado que el ancho de hombros.',
    pasosEjecucion: [
      'Baja la barra controladamente hacia la parte baja del pecho, codos pegados al cuerpo.',
      'Empuja en línea recta hasta extender los codos, enfocando el esfuerzo en el tríceps.'
    ],
    erroresComunes: [
      'Agarre tan cerrado que fuerza la muñeca.',
      'Abrir los codos hacia afuera (pierde el énfasis en tríceps).'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "empuje-horizontal",
    tipoMovimiento: "compuesto"
  },
  'elevaciones laterales': {
    id: 'elevaciones laterales',
    nombre: 'Elevaciones Laterales',
    categoria: 'gym',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'trapecio',
    posturaInicial: 'De pie, mancuernas a los lados del cuerpo, codos con flexión leve.',
    pasosEjecucion: [
      'Eleva los brazos hacia los lados hasta la altura del hombro.',
      'Baja controladamente.'
    ],
    erroresComunes: [
      'Usar impulso/balanceo del torso.',
      'Subir más allá de la altura del hombro (estrés articular).',
      'Encoger los trapecios en vez de usar el deltoides lateral.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "empuje-vertical",
    tipoMovimiento: "aislamiento"
  },
  'face pull': {
    id: 'face pull',
    nombre: 'Face Pull',
    categoria: 'gym',
    grupoMuscular: 'hombros',
    patron: 'traccion',
    musculoSecundario: 'rotadores externos',
    posturaInicial: 'De pie frente a una polea alta con cuerda, brazos extendidos a la altura de la cara.',
    pasosEjecucion: [
      'Tira de la cuerda hacia el rostro separando las manos al final.',
      'Mantén los codos altos durante todo el movimiento.',
      'Regresa controladamente.'
    ],
    erroresComunes: [
      'Codos bajos (pierde el trabajo de deltoides posterior).',
      'Usar demasiado peso y perder la forma.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'encogimientos con barra': {
    id: 'encogimientos con barra',
    nombre: 'Encogimientos de Hombros con Barra',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'trapecio',
    posturaInicial: 'De pie, barra sostenida al frente de los muslos con agarre pronado.',
    pasosEjecucion: [
      'Encoge los hombros hacia las orejas, sin rotarlos.',
      'Sostén brevemente arriba apretando el trapecio.',
      'Baja controladamente.'
    ],
    erroresComunes: [
      'Rotar los hombros en círculo (aumenta el riesgo sin sumar beneficio).',
      'Usar impulso de rodillas para levantar el peso.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "aislamiento"
  },
  'encogimientos con mancuernas': {
    id: 'encogimientos con mancuernas',
    nombre: 'Encogimientos de Hombros con Mancuernas',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'trapecio',
    posturaInicial: 'De pie, una mancuerna en cada mano a los costados del cuerpo.',
    pasosEjecucion: [
      'Encoge los hombros hacia las orejas, sin rotarlos.',
      'Sostén brevemente arriba apretando el trapecio.',
      'Baja controladamente.'
    ],
    erroresComunes: [
      'Rotar los hombros en círculo (aumenta el riesgo sin sumar beneficio).',
      'Usar impulso de rodillas para levantar el peso.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "traccion-vertical",
    tipoMovimiento: "aislamiento"
  },
  'extensión de cuádriceps': {
    id: 'extensión de cuádriceps',
    nombre: 'Extensión de Cuádriceps',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Sentado en la máquina, respaldo ajustado, rodillas alineadas con el eje de giro.',
    pasosEjecucion: [
      'Extiende la rodilla completamente contra la resistencia.',
      'Controla la bajada sin soltar el peso de golpe.'
    ],
    erroresComunes: [
      'Usar impulso.',
      'Extender con golpe seco al final del recorrido.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "rodilla",
    tipoMovimiento: "aislamiento"
  },
  'curl femoral': {
    id: 'curl femoral',
    nombre: 'Curl Femoral',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos',
    posturaInicial: 'Acostado o sentado en la máquina, según la variante disponible.',
    pasosEjecucion: [
      'Flexiona la rodilla llevando el talón hacia el glúteo contra resistencia.',
      'Controla tanto la fase de flexión como la de extensión.'
    ],
    erroresComunes: [
      'Soltar el peso de golpe en la fase de extensión.',
      'Usar impulso de cadera.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "cadera",
    tipoMovimiento: "aislamiento"
  },
  'zancadas': {
    id: 'zancadas',
    nombre: 'Zancadas',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos',
    posturaInicial: 'De pie, peso corporal o con mancuernas/barra.',
    pasosEjecucion: [
      'Da un paso largo hacia adelante.',
      'Baja flexionando ambas rodillas hasta que la rodilla trasera casi toque el piso.',
      'Empuja con la pierna delantera para volver a la posición inicial.'
    ],
    erroresComunes: [
      'Que la rodilla delantera sobrepase mucho la punta del pie.',
      'Perder el equilibrio por pasos demasiado cortos.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "rodilla",
    tipoMovimiento: "compuesto"
  },
  'hip thrust': {
    id: 'hip thrust',
    nombre: 'Hip Thrust',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'isquiotibiales',
    posturaInicial: 'Espalda apoyada en banco, barra sobre la cadera, pies firmes en el piso.',
    pasosEjecucion: [
      'Empuja la cadera hacia arriba apretando el glúteo, hasta que el torso quede paralelo al piso.',
      'Baja controladamente sin tocar el piso con la cadera entre repeticiones.'
    ],
    erroresComunes: [
      'Hiperextender la espalda baja al final.',
      'No llegar a extensión completa de cadera.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "cadera",
    tipoMovimiento: "compuesto"
  },
  'remo en máquina': {
    id: 'remo en máquina',
    nombre: 'Remo en Máquina',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Sentado en la máquina, pecho apoyado en el soporte si lo tiene, agarre a la altura del pecho.',
    pasosEjecucion: [
      'Tira de las agarraderas hacia el abdomen, llevando los codos hacia atrás.',
      'Aprieta los omóplatos al final del movimiento.',
      'Regresa controladamente sin perder la postura.'
    ],
    erroresComunes: [
      'Usar impulso del torso en vez de la espalda.',
      'No completar el rango de movimiento.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "compuesto"
  },
  'remo con barra en máquina smith': {
    id: 'remo con barra en máquina smith',
    nombre: 'Remo con Barra en Máquina Smith',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Flexión de cadera ~45° frente a la barra fija de la máquina Smith, agarre pronado.',
    pasosEjecucion: [
      'Tira de la barra hacia el abdomen bajo, codos hacia atrás.',
      'Aprieta los omóplatos al final del movimiento.',
      'Baja controladamente sin perder la posición de espalda.'
    ],
    erroresComunes: [
      'Redondear la espalda baja.',
      'Usar impulso del torso en vez de la espalda.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "compuesto"
  },
  'remo en polea baja sentado': {
    id: 'remo en polea baja sentado',
    nombre: 'Remo en Polea Baja Sentado',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Sentado con las rodillas ligeramente flexionadas, agarre en la polea baja (barra recta, V, o cuerda), espalda recta.',
    pasosEjecucion: [
      'Tira del agarre hacia el abdomen, manteniendo el torso erguido sin balancearlo.',
      'Aprieta los omóplatos al final del movimiento.',
      'Regresa controladamente extendiendo los brazos sin redondear la espalda.'
    ],
    erroresComunes: [
      'Balancear el torso hacia adelante y atrás para generar impulso.',
      'Redondear la espalda baja al final del recorrido.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "compuesto"
  },
  'remo en t': {
    id: 'remo en t',
    nombre: 'Remo en T',
    categoria: 'gym',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Torso inclinado ~45° sobre la barra apoyada en una esquina o soporte fijo, agarre en la barra en V o mangos.',
    pasosEjecucion: [
      'Tira de la barra hacia el abdomen, codos hacia atrás.',
      'Aprieta los omóplatos al final del movimiento.',
      'Baja controladamente sin perder la posición de espalda.'
    ],
    erroresComunes: [
      'Redondear la espalda baja.',
      'Usar impulso del torso en vez de la espalda.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "compuesto"
  },
  'elevaciones de piernas': {
    id: 'elevaciones de piernas',
    nombre: 'Elevaciones de Piernas',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'flexores de cadera',
    posturaInicial: 'Colgado de una barra o acostado boca arriba, piernas extendidas.',
    pasosEjecucion: [
      'Eleva las piernas extendidas (o con rodillas flexionadas para una versión más fácil) hasta la altura de la cadera.',
      'Baja controladamente sin balancear el cuerpo.'
    ],
    erroresComunes: [
      'Usar impulso/balanceo en vez de controlar el movimiento.',
      'Arquear la espalda baja al bajar las piernas (en la versión acostada).'
    ],
    nivel: "intermedio",
    prerequisitos: ["abdominales"],
    progresionDe: "abdominales",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "core",
    tipoMovimiento: "aislamiento"
  },
  'abdominales': {
    id: 'abdominales',
    nombre: 'Abdominales',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Acostado boca arriba, rodillas flexionadas, pies apoyados en el piso.',
    pasosEjecucion: [
      'Contrae el abdomen intentando acercar el esternón a la pelvis.',
      'Baja controladamente sin relajar por completo entre repeticiones.'
    ],
    erroresComunes: [
      'Tirar del cuello con las manos.',
      'Usar impulso en vez de contracción abdominal.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core",
    tipoMovimiento: "aislamiento"
  },
  'curl de muñeca': {
    id: 'curl de muñeca',
    nombre: 'Curl de Muñeca',
    categoria: 'gym',
    grupoMuscular: 'brazos',
    patron: 'traccion',
    musculoSecundario: 'ninguno',
    // Prioridad baja para el generador (spec-catalogo-gym.md, sección 4):
    // no representa ningún patrón principal, es puro relleno ocasional de
    // antebrazo — cubre tanto palma arriba (flexores) como palma abajo
    // (extensores) según cómo se sostenga la barra.
    posturaInicial: 'Sentado, antebrazos apoyados en los muslos o un banco, muñecas colgando del borde, barra o mancuernas en las manos.',
    pasosEjecucion: [
      'Flexiona las muñecas hacia arriba (palma arriba) o hacia atrás (palma abajo) según la variante.',
      'Baja controladamente hasta el estiramiento completo.'
    ],
    erroresComunes: [
      'Usar demasiado peso y perder el rango de movimiento.',
      'Mover el antebrazo en vez de solo la muñeca.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "barra",
    patronMovimiento: "traccion-horizontal",
    tipoMovimiento: "aislamiento"
  },
  'farmer\'s walk': {
    id: 'farmer\'s walk',
    nombre: "Farmer's Walk",
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'antebrazos, trapecio',
    // Híbrido agarre/core: es carga cargada de pie, no aislación de
    // antebrazo pura — tageado como core (anti-flexión lateral) siguiendo
    // la sugerencia explícita del spec, no como accesorio de brazo.
    posturaInicial: 'De pie, una mancuerna o kettlebell pesada en cada mano, hombros hacia atrás, core apretado.',
    pasosEjecucion: [
      'Camina en línea recta manteniendo el torso erguido, sin balancear las cargas.',
      'Mantén el agarre firme durante todo el recorrido.'
    ],
    erroresComunes: [
      'Encorvar los hombros hacia adelante.',
      'Caminar demasiado rápido y perder el control del torso.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "mancuernas",
    patronMovimiento: "core",
    tipoMovimiento: "compuesto"
  },
  'crunch en banco declinado': {
    id: 'crunch en banco declinado',
    nombre: 'Crunch en Banco Declinado',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'flexores de cadera',
    posturaInicial: 'Acostado en un banco declinado, pies asegurados arriba, manos detrás de la cabeza o cruzadas en el pecho.',
    pasosEjecucion: [
      'Contrae el abdomen elevando el torso hacia las rodillas.',
      'Baja controladamente sin llegar a apoyar del todo entre repeticiones.'
    ],
    erroresComunes: [
      'Tirar del cuello con las manos.',
      'Usar los flexores de cadera en vez del abdomen para impulsarse.'
    ],
    nivel: "intermedio",
    prerequisitos: ["abdominales"],
    progresionDe: "abdominales",
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "banco",
    patronMovimiento: "core",
    tipoMovimiento: "aislamiento"
  },
  'crunch en polea': {
    id: 'crunch en polea',
    nombre: 'Crunch en Polea',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'ninguno',
    posturaInicial: 'De rodillas frente a una polea alta con cuerda, sosteniéndola a los lados de la cabeza.',
    pasosEjecucion: [
      'Flexiona la cintura llevando los codos hacia las rodillas, contrayendo el abdomen.',
      'Regresa controladamente sin perder tensión en el cable.'
    ],
    erroresComunes: [
      'Tirar con los brazos en vez de flexionar la columna con el abdomen.',
      'Usar demasiado peso y perder el rango de movimiento.'
    ],
    nivel: "intermedio",
    prerequisitos: ["abdominales"],
    progresionDe: "abdominales",
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "core",
    tipoMovimiento: "aislamiento"
  },
  'pallof press': {
    id: 'pallof press',
    nombre: 'Pallof Press',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'oblicuos',
    posturaInicial: 'De pie, de costado a una polea o banda anclada a la altura del pecho, sosteniendo el agarre con ambas manos frente al esternón.',
    pasosEjecucion: [
      'Extiende los brazos al frente resistiendo la rotación del torso hacia la polea.',
      'Regresa controladamente sin dejar que el torso gire.'
    ],
    erroresComunes: [
      'Dejar que la cadera o el torso roten hacia la resistencia.',
      'Usar los brazos en vez del core para estabilizar.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "core",
    tipoMovimiento: "aislamiento"
  },
  'woodchopper': {
    id: 'woodchopper',
    nombre: 'Woodchopper',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'hombros',
    posturaInicial: 'De pie de costado a una polea alta, sosteniendo el agarre con ambas manos por encima del hombro contrario a la cadera.',
    pasosEjecucion: [
      'Tira el cable diagonalmente hacia abajo y hacia la cadera opuesta, rotando el torso.',
      'Regresa controladamente a la posición inicial.'
    ],
    erroresComunes: [
      'Mover solo los brazos en vez de rotar desde el core.',
      'Usar demasiado peso y perder el control de la rotación.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "core",
    tipoMovimiento: "compuesto"
  },
  'plancha con peso': {
    id: 'plancha con peso',
    nombre: 'Plancha con Peso',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Posición de plancha sobre antebrazos, con un disco apoyado sobre la espalda baja.',
    pasosEjecucion: [
      'Mantén el cuerpo en línea recta desde los hombros hasta los talones.',
      'Sostén la posición sin dejar que la cadera caiga ni suba.'
    ],
    erroresComunes: [
      'Dejar caer la cadera.',
      'Elevar demasiado la cadera para aliviar la carga.'
    ],
    nivel: "intermedio",
    prerequisitos: ["plancha"],
    progresionDe: "plancha",
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core",
    tipoMovimiento: "aislamiento"
  },
  'rueda abdominal': {
    id: 'rueda abdominal',
    nombre: 'Rueda Abdominal',
    categoria: 'gym',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'hombros, dorsales',
    posturaInicial: 'De rodillas, sosteniendo la rueda con ambas manos frente a los hombros.',
    pasosEjecucion: [
      'Rueda hacia adelante extendiendo el cuerpo lo más posible sin que la cadera caiga.',
      'Vuelve a la posición inicial contrayendo el abdomen, sin usar la espalda baja para tirar.'
    ],
    erroresComunes: [
      'Dejar caer la cadera (arqueo lumbar) en la extensión.',
      'Extender más allá del rango que se puede controlar con el core.'
    ],
    nivel: "avanzado",
    prerequisitos: ["plancha"],
    progresionDe: "plancha",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core",
    tipoMovimiento: "compuesto"
  },
  'caminata': {
    id: 'caminata',
    nombre: 'Caminata Rápida',
    categoria: 'hiit',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'ninguno',
    posturaInicial: 'Postura erguida, ritmo de paso rápido pero sostenible.',
    pasosEjecucion: [
      'Camina a un ritmo elevado, idealmente con inclinación si es en cinta.',
      'Mantén el ritmo constante durante toda la duración indicada.'
    ],
    erroresComunes: [
      'Encorvar la espalda.',
      'Ritmo demasiado lento como para elevar la frecuencia cardíaca.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":1200,"series":1},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "locomocion",
    tipoMovimiento: "compuesto"
  },
  'elevación de talones': {
    id: 'elevación de talones',
    nombre: 'Elevación de Talones',
    categoria: 'gym',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'ninguno',
    posturaInicial: 'De pie o sentado, ante la máquina o con peso libre.',
    pasosEjecucion: [
      'Eleva los talones contra resistencia.',
      'Haz una pausa arriba.',
      'Controla la bajada completa para maximizar el rango de movimiento.'
    ],
    erroresComunes: [
      'Rango de movimiento parcial.',
      'Rebotar en vez de controlar la bajada.'
    ],
    nivel: "todos",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "maquina",
    patronMovimiento: "rodilla",
    tipoMovimiento: "aislamiento"
  },
};
