// Catálogo único de ejercicios. Cada entrada vive UNA sola vez aquí — las
// plantillas (plantillas.js) referencian estos ejercicios por `id`, nunca
// copian el texto de instrucciones. getEjercicioMetadata() se mantiene
// aparte para resolver por nombre (fuzzy match) los ejercicios que el
// usuario escribe a mano en una sesión libre, ya que esos no tienen id.
export const CATALOGO_EJERCICIOS = {
  // ============================ GYM (PESAS) ============================
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
    patronMovimiento: "rodilla"
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
    patronMovimiento: "rodilla"
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
    patronMovimiento: "cadera"
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
    patronMovimiento: "cadera"
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
    patronMovimiento: "empuje-horizontal"
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
    patronMovimiento: "empuje-horizontal"
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
    patronMovimiento: "empuje-vertical"
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
    patronMovimiento: "empuje-vertical"
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
    patronMovimiento: "traccion-horizontal"
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
    patronMovimiento: "traccion-vertical"
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
    patronMovimiento: "traccion-vertical"
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
    patronMovimiento: "empuje-horizontal"
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
    patronMovimiento: "traccion-horizontal"
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
    patronMovimiento: "traccion-horizontal"
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
    patronMovimiento: "empuje-horizontal"
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
    patronMovimiento: "empuje-vertical"
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
    patronMovimiento: "traccion-horizontal"
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
    patronMovimiento: "rodilla"
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
    patronMovimiento: "cadera"
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
    patronMovimiento: "rodilla"
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
    patronMovimiento: "cadera"
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
    patronMovimiento: "traccion-horizontal"
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
    patronMovimiento: "core"
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
    patronMovimiento: "core"
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
    patronMovimiento: "locomocion"
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
    patronMovimiento: "rodilla"
  },

  // ============================ CALISTENIA ============================
  'flexiones': {
    id: 'flexiones',
    nombre: 'Flexiones (Push-up)',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, core',
    posturaInicial: 'Manos al ancho de hombros, cuerpo en línea recta de cabeza a talones.',
    pasosEjecucion: [
      'Baja el pecho hacia el piso flexionando los codos a unos 45° del cuerpo.',
      'Mantén el core apretado para no dejar caer la cadera.',
      'Empuja de vuelta hasta extensión completa de codos.'
    ],
    erroresComunes: [
      'Dejar caer la cadera (pierde línea recta).',
      'Codos completamente abiertos a 90°.',
      'Rango de movimiento incompleto.'
    ],
    nivel: "principiante",
    prerequisitos: ["flexiones con rodillas"],
    progresionDe: "flexiones con rodillas",
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  'flexiones diamante': {
    id: 'flexiones diamante',
    nombre: 'Flexiones Diamante',
    categoria: 'calistenia',
    grupoMuscular: 'brazos',
    patron: 'empuje',
    musculoSecundario: 'pecho',
    posturaInicial: 'Manos juntas formando un diamante con los pulgares e índices, bajo el centro del pecho.',
    pasosEjecucion: [
      'Baja el pecho controladamente manteniendo los codos cerca del cuerpo.',
      'Empuja de vuelta hasta extensión completa.'
    ],
    erroresComunes: [
      'Abrir los codos hacia los lados.',
      'Rango de movimiento incompleto por la mayor exigencia.'
    ],
    nivel: "intermedio",
    prerequisitos: ["flexiones declinadas"],
    progresionDe: "flexiones declinadas",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  // --- Árbol de progresión de flexiones (progresiones-calistenia.js) ---
  'flexiones en pared': {
    id: 'flexiones en pared',
    nombre: 'Flexiones en Pared',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, core',
    posturaInicial: 'De pie frente a una pared, manos apoyadas a la altura de los hombros, un paso atrás de la pared.',
    pasosEjecucion: [
      'Flexiona los codos acercando el pecho a la pared, manteniendo el cuerpo recto.',
      'Empuja de vuelta hasta extensión completa de codos.'
    ],
    erroresComunes: [
      'Doblar la cadera en vez de mantener el cuerpo en línea recta.',
      'Quedarse tan cerca de la pared que el rango de movimiento es mínimo.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  'flexiones inclinadas': {
    id: 'flexiones inclinadas',
    nombre: 'Flexiones Inclinadas',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, core',
    posturaInicial: 'Manos apoyadas en una superficie elevada (banco, escalón o pared), cuerpo en línea recta.',
    pasosEjecucion: [
      'Baja el pecho hacia el borde flexionando los codos a unos 45° del cuerpo.',
      'Empuja de vuelta hasta extensión completa de codos.'
    ],
    erroresComunes: [
      'Dejar caer la cadera.',
      'Elegir una superficie tan alta que quite todo el estímulo.'
    ],
    nivel: "principiante",
    prerequisitos: ["flexiones en pared"],
    progresionDe: "flexiones en pared",
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  'flexiones con rodillas': {
    id: 'flexiones con rodillas',
    nombre: 'Flexiones con Rodillas',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Rodillas apoyadas en el piso, manos al ancho de hombros, línea recta desde la rodilla hasta la cabeza.',
    pasosEjecucion: [
      'Baja el pecho hacia el piso con los codos a unos 45°.',
      'Empuja de vuelta a extensión completa sin perder la línea cadera-rodilla.'
    ],
    erroresComunes: [
      'Doblar la cadera en vez de mantenerla en línea recta.',
      'Rango de movimiento incompleto.'
    ]
  },
  'flexiones declinadas': {
    id: 'flexiones declinadas',
    nombre: 'Flexiones Declinadas',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros, tríceps',
    posturaInicial: 'Pies apoyados en una superficie elevada, manos en el piso al ancho de hombros.',
    pasosEjecucion: [
      'Baja el pecho hacia el piso manteniendo el core apretado.',
      'Empuja de vuelta hasta extensión completa.'
    ],
    erroresComunes: [
      'Elegir una elevación tan alta que se vuelva un pike push-up.',
      'Dejar caer la cadera.'
    ]
  },
  'flexiones de arquero': {
    id: 'flexiones de arquero',
    nombre: 'Flexiones de Arquero',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, hombros',
    posturaInicial: 'Manos separadas más allá del ancho de hombros, cuerpo en línea recta.',
    pasosEjecucion: [
      'Baja desplazando el peso hacia un lado: ese brazo se flexiona y el otro queda casi extendido.',
      'Empuja de vuelta al centro y alterna de lado.'
    ],
    erroresComunes: [
      'Rotar el torso en vez de desplazar el peso lateralmente.',
      'No bajar lo suficiente del lado de trabajo.'
    ]
  },
  'flexiones a una mano asistidas': {
    id: 'flexiones a una mano asistidas',
    nombre: 'Flexiones a Una Mano Asistidas',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, core (anti-rotación)',
    posturaInicial: 'Una mano en el piso, la otra apoyada en un soporte bajo (pelota, step) que asiste el equilibrio.',
    pasosEjecucion: [
      'Baja controladamente con el peso mayormente en el brazo de trabajo.',
      'Empuja de vuelta manteniendo las caderas cuadradas.'
    ],
    erroresComunes: [
      'Rotar el torso para compensar.',
      'Apoyar demasiado peso en la mano de asistencia.'
    ]
  },
  'flexiones a una mano': {
    id: 'flexiones a una mano',
    nombre: 'Flexiones a Una Mano',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'tríceps, core',
    posturaInicial: 'Pies separados para dar base, una mano en el piso bajo el hombro, la otra detrás de la espalda.',
    pasosEjecucion: [
      'Baja controladamente sin rotar el torso.',
      'Empuja de vuelta hasta extensión completa.'
    ],
    erroresComunes: [
      'Rotar caderas u hombros para ayudarse.',
      'Base de pies demasiado angosta (pierde estabilidad).'
    ]
  },
  'fondos en banco': {
    id: 'fondos en banco',
    nombre: 'Fondos en Banco',
    categoria: 'calistenia',
    grupoMuscular: 'brazos',
    patron: 'empuje',
    musculoSecundario: 'pecho, hombros',
    posturaInicial: 'Manos apoyadas en un banco detrás del cuerpo, piernas extendidas al frente.',
    pasosEjecucion: [
      'Baja flexionando los codos.',
      'Empuja de vuelta a la posición inicial.'
    ],
    erroresComunes: [
      'Bajar demasiado (estrés en el hombro).',
      'Codos abiertos hacia los lados.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "banco",
    patronMovimiento: "empuje-horizontal"
  },
  // --- Resto del árbol de progresión de fondos ---
  'fondos asistidos con banda': {
    id: 'fondos asistidos con banda',
    nombre: 'Fondos Asistidos con Banda',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros, tríceps',
    posturaInicial: 'Banda elástica anclada arriba de las paralelas, bajo la rodilla o el pie.',
    pasosEjecucion: [
      'Ejecuta el fondo con la misma mecánica que la versión completa.',
      'Reduce progresivamente la asistencia de la banda con el tiempo.'
    ],
    erroresComunes: [
      'Bajar demasiado y forzar el hombro.',
      'Depender de la banda por demasiado tiempo sin progresar.'
    ]
  },
  'fondos en anillas': {
    id: 'fondos en anillas',
    nombre: 'Fondos en Anillas',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros, tríceps, estabilizadores',
    posturaInicial: 'Sostenido en anillas con los brazos extendidos, anillas rotadas hacia afuera (turnout).',
    pasosEjecucion: [
      'Baja controladamente manteniendo las anillas estables.',
      'Empuja de vuelta rotando ligeramente las anillas hacia adentro al llegar arriba.'
    ],
    erroresComunes: [
      'Dejar que las anillas se abran o se inestabilicen.',
      'Bajar demasiado sin control del hombro.'
    ]
  },
  'fondos lastrados': {
    id: 'fondos lastrados',
    nombre: 'Fondos Lastrados',
    categoria: 'calistenia',
    grupoMuscular: 'pecho',
    patron: 'empuje',
    musculoSecundario: 'hombros, tríceps',
    posturaInicial: 'Peso extra sujeto con cinturón o mancuerna entre los pies.',
    pasosEjecucion: [
      'Ejecuta el fondo con la misma mecánica que la versión sin peso.',
      'Controla también la bajada, no solo la subida.'
    ],
    erroresComunes: [
      'Agregar peso antes de dominar la técnica sin lastre.',
      'Rango de movimiento incompleto por la carga extra.'
    ]
  },
  'pike push-up': {
    id: 'pike push-up',
    nombre: 'Pike Push-up',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'tríceps',
    posturaInicial: 'Posición de "V invertida" (cadera elevada), manos y pies en el piso.',
    pasosEjecucion: [
      'Flexiona los codos bajando la cabeza hacia el piso entre las manos.',
      'Empuja de vuelta a la posición inicial.'
    ],
    erroresComunes: [
      'Perder la posición de cadera elevada.',
      'No bajar lo suficiente.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":8,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-vertical"
  },
  'dead hang': {
    id: 'dead hang',
    nombre: 'Dead Hang',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'Colgado de una barra con brazos extendidos, sosteniendo el peso corporal.',
    pasosEjecucion: [
      'Mantén las escápulas activas, no completamente relajadas.',
      'Sostén la posición el tiempo objetivo.'
    ],
    erroresComunes: [
      'Relajar completamente los hombros (mala preparación articular).',
      'Balancear el cuerpo en vez de mantenerlo quieto.'
    ],
    nivel: "principiante",
    prerequisitos: ["remo invertido"],
    progresionDe: "remo invertido",
    criterioAvance: {"tipo":"segundos","valor":20,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  'dominadas isométricas': {
    id: 'dominadas isométricas',
    nombre: 'Dominadas Isométricas',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps, antebrazos',
    posturaInicial: 'Arriba de la barra (con salto, salto asistido o un banco), barbilla sobre la barra.',
    pasosEjecucion: [
      'Sostén la posición arriba, escápulas retraídas y hacia abajo.',
      'Mantén el tiempo objetivo sin dejar que el mentón baje de la barra.'
    ],
    erroresComunes: [
      'Dejar que los hombros suban hacia las orejas durante el sostén.',
      'Soltar el control y caer en vez de bajar de forma controlada al terminar.'
    ],
    nivel: "principiante",
    prerequisitos: ["dead hang"],
    progresionDe: "dead hang",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  'remo invertido': {
    id: 'remo invertido',
    nombre: 'Remo Invertido',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Acostado bajo una barra baja (o TRX), sujeto con agarre pronado, cuerpo en línea recta.',
    pasosEjecucion: [
      'Tira del pecho hacia la barra, apretando los omóplatos.',
      'Baja controladamente a extensión completa.'
    ],
    erroresComunes: [
      'Dejar caer la cadera.',
      'No completar el rango de movimiento.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "traccion-horizontal"
  },
  'negativas de dominada': {
    id: 'negativas de dominada',
    nombre: 'Negativas de Dominada',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Desde la posición alta de una dominada (usando un banco o salto para llegar arriba).',
    pasosEjecucion: [
      'Baja de forma lenta y controlada (3-5 segundos).',
      'Llega hasta extensión completa de brazos.'
    ],
    erroresComunes: [
      'Bajar demasiado rápido, perdiendo el control.',
      'No completar el rango hasta la extensión total.'
    ],
    nivel: "principiante",
    prerequisitos: ["dominadas isométricas"],
    progresionDe: "dominadas isométricas",
    criterioAvance: {"tipo":"reps","valor":5,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  'dominada asistida con banda': {
    id: 'dominada asistida con banda',
    nombre: 'Dominada Asistida con Banda',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Banda elástica anclada arriba, bajo el pie o la rodilla, agarre pronado en la barra.',
    pasosEjecucion: [
      'Ejecuta la dominada con la misma mecánica que la versión estándar.',
      'Reduce progresivamente la asistencia de la banda con el tiempo.'
    ],
    erroresComunes: [
      'Depender de la banda por demasiado tiempo sin progresar.',
      'Kipping no controlado.'
    ],
    nivel: "principiante",
    prerequisitos: ["negativas de dominada"],
    progresionDe: "negativas de dominada",
    criterioAvance: {"tipo":"reps","valor":6,"series":3},
    tambienEn: [],
    equipo: "banda",
    patronMovimiento: "traccion-vertical"
  },
  'dominada australiana': {
    id: 'dominada australiana',
    nombre: 'Dominada Australiana',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Versión horizontal de la dominada: cuerpo bajo una barra, agarre de dominada, pies apoyados en el piso.',
    pasosEjecucion: [
      'Tira del pecho hacia la barra manteniendo el cuerpo en línea recta.',
      'Baja controladamente.'
    ],
    erroresComunes: [
      'Dejar caer la cadera.',
      'No completar el rango de movimiento.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "traccion-horizontal"
  },
  // --- Resto del árbol de progresión de dominadas ---
  'dominadas lastradas': {
    id: 'dominadas lastradas',
    nombre: 'Dominadas Lastradas',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Peso extra sujeto con cinturón o mancuerna entre los pies, agarre pronado en la barra.',
    pasosEjecucion: [
      'Ejecuta la dominada con la misma mecánica que la versión sin peso.',
      'Controla también la bajada, no solo la subida.'
    ],
    erroresComunes: [
      'Agregar peso antes de dominar la técnica sin lastre.',
      'Kipping para compensar el peso extra.'
    ]
  },
  'dominada de arquero': {
    id: 'dominada de arquero',
    nombre: 'Dominada de Arquero',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps',
    posturaInicial: 'Agarre ancho en la barra; un brazo hará la mayor parte del trabajo.',
    pasosEjecucion: [
      'Tira llevando el cuerpo hacia un lado: ese brazo se flexiona mientras el otro queda casi extendido.',
      'Baja controladamente y alterna de lado.'
    ],
    erroresComunes: [
      'Usar impulso en vez de fuerza controlada.',
      'No extender casi por completo el brazo pasivo.'
    ]
  },
  'dominada a una mano asistida': {
    id: 'dominada a una mano asistida',
    nombre: 'Dominada a Una Mano Asistida',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps, antebrazos',
    posturaInicial: 'Una mano en la barra; la otra sujeta una toalla o correa anclada cerca del agarre principal.',
    pasosEjecucion: [
      'Tira principalmente con el brazo de trabajo, usando el asistido solo de apoyo.',
      'Reduce progresivamente la asistencia con el tiempo.'
    ],
    erroresComunes: [
      'Depender demasiado del brazo asistido.',
      'Rango de movimiento incompleto.'
    ]
  },
  'dominada a una mano': {
    id: 'dominada a una mano',
    nombre: 'Dominada a Una Mano',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'bíceps, antebrazos, core',
    posturaInicial: 'Una mano en la barra con agarre firme, el otro brazo libre.',
    pasosEjecucion: [
      'Tira del cuerpo hacia arriba sin balancearte ni rotar el torso.',
      'Baja controladamente hasta extensión completa.'
    ],
    erroresComunes: [
      'Balancear el cuerpo (kipping) para generar impulso.',
      'Rotar el torso hacia el lado del brazo de apoyo.'
    ]
  },
  'puente de glúteo': {
    id: 'puente de glúteo',
    nombre: 'Puente de Glúteo (Glute Bridge)',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'core',
    posturaInicial: 'Acostado boca arriba, rodillas flexionadas, pies apoyados en el piso.',
    pasosEjecucion: [
      'Eleva la cadera apretando el glúteo hasta línea recta de hombro a rodilla.',
      'Baja controladamente.'
    ],
    erroresComunes: [
      'Hiperextender la espalda baja.',
      'No apretar el glúteo arriba.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "cadera"
  },
  'puente de glúteo a una pierna': {
    id: 'puente de glúteo a una pierna',
    nombre: 'Puente de Glúteo a una Pierna',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'core',
    posturaInicial: 'Misma postura que el puente de glúteo, con una pierna extendida al aire.',
    pasosEjecucion: [
      'Eleva la cadera con la pierna de apoyo, manteniendo la otra extendida.',
      'Baja controladamente sin perder el equilibrio.'
    ],
    erroresComunes: [
      'Rotar la cadera hacia el lado sin apoyo.',
      'Rango de movimiento incompleto.'
    ],
    nivel: "intermedio",
    prerequisitos: ["puente de glúteo"],
    progresionDe: "puente de glúteo",
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "cadera"
  },
  // --- Resto del árbol de progresión de sentadillas ---
  'sentadilla asistida': {
    id: 'sentadilla asistida',
    nombre: 'Sentadilla Asistida',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos, core',
    posturaInicial: 'De pie sujetando un soporte fijo (marco de puerta, poste) con ambas manos.',
    pasosEjecucion: [
      'Flexiona cadera y rodillas bajando en línea recta, usando los brazos solo de apoyo.',
      'Empuja el piso para subir, reduciendo progresivamente la ayuda de los brazos.'
    ],
    erroresComunes: [
      'Tirar del soporte en vez de usarlo solo de equilibrio.',
      'Rodillas colapsando hacia adentro.'
    ]
  },
  'sentadilla con peso corporal': {
    id: 'sentadilla con peso corporal',
    nombre: 'Sentadilla con Peso Corporal',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos, core',
    posturaInicial: 'Misma mecánica que la sentadilla con barra, sin carga externa.',
    pasosEjecucion: [
      'Flexiona cadera y rodillas bajando en línea recta.',
      'Desciende hasta el rango cómodo de movilidad.',
      'Empuja el piso para subir.'
    ],
    erroresComunes: [
      'Rodillas colapsando hacia adentro.',
      'Levantar los talones del piso.'
    ],
    nivel: "principiante",
    prerequisitos: ["sentadilla asistida"],
    progresionDe: "sentadilla asistida",
    criterioAvance: {"tipo":"reps","valor":15,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "rodilla"
  },
  'sentadilla búlgara': {
    id: 'sentadilla búlgara',
    nombre: 'Sentadilla Búlgara',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos',
    posturaInicial: 'Pie trasero elevado sobre un banco, pie delantero adelante, torso erguido.',
    pasosEjecucion: [
      'Baja flexionando la rodilla delantera hasta cerca de 90°.',
      'Empuja con el pie delantero para subir.'
    ],
    erroresComunes: [
      'Que la rodilla delantera colapse hacia adentro.',
      'Perder el equilibrio por base de apoyo estrecha.'
    ],
    nivel: "intermedio",
    prerequisitos: ["zancadas"],
    progresionDe: "zancadas",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "rodilla"
  },
  'pistol squat asistida': {
    id: 'pistol squat asistida',
    nombre: 'Pistol Squat Asistida',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'core, estabilizadores de tobillo',
    posturaInicial: 'De pie sobre una pierna, sujetando un soporte o banda elástica anclada al frente.',
    pasosEjecucion: [
      'Baja controladamente en sentadilla a una pierna, usando el soporte solo para el equilibrio.',
      'Reduce progresivamente la asistencia con el tiempo.'
    ],
    erroresComunes: [
      'Apoyar demasiado peso en el soporte.',
      'Perder el equilibrio por falta de movilidad de tobillo.'
    ]
  },
  'pistol squat': {
    id: 'pistol squat',
    nombre: 'Pistol Squat (progresión)',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'core, estabilizadores de tobillo',
    posturaInicial: 'De pie sobre una pierna, la otra extendida al frente.',
    pasosEjecucion: [
      'Baja controladamente en sentadilla a una pierna.',
      'Progresa primero con apoyo de una silla o banda elástica antes de hacerlo libre.'
    ],
    erroresComunes: [
      'Perder el equilibrio por falta de movilidad de tobillo.',
      'Saltar etapas de progresión antes de tener la fuerza base.'
    ],
    nivel: "avanzado",
    prerequisitos: ["pistol squat asistida"],
    progresionDe: "pistol squat asistida",
    criterioAvance: {"tipo":"reps","valor":5,"series":2},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "rodilla"
  },
  'plancha': {
    id: 'plancha',
    nombre: 'Plancha (Plank)',
    categoria: 'calistenia',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'hombros',
    posturaInicial: 'Apoyo en antebrazos y puntas de pie, cuerpo en línea recta.',
    pasosEjecucion: [
      'Aprieta abdomen y glúteos.',
      'Mantén la posición sin dejar caer ni elevar excesivamente la cadera.'
    ],
    erroresComunes: [
      'Cadera muy elevada (pierde el trabajo real de core).',
      'Cadera hundida (estrés en espalda baja).'
    ],
    nivel: "principiante",
    prerequisitos: ["hollow body hold"],
    progresionDe: "hollow body hold",
    criterioAvance: {"tipo":"segundos","valor":40,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  'plancha lateral': {
    id: 'plancha lateral',
    nombre: 'Plancha Lateral',
    categoria: 'calistenia',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'oblicuos',
    posturaInicial: 'Apoyo en un antebrazo de lado, cuerpo en línea recta lateral, cadera elevada del piso.',
    pasosEjecucion: [
      'Mantén la cadera arriba sin rotar el torso.',
      'Sostén la posición el tiempo objetivo.'
    ],
    erroresComunes: [
      'Dejar caer la cadera.',
      'Rotar el torso hacia adelante o atrás.'
    ],
    nivel: "principiante",
    prerequisitos: ["plancha"],
    progresionDe: "plancha",
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  'l-sit': {
    id: 'l-sit',
    nombre: 'L-Sit',
    categoria: 'calistenia',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'flexores de cadera',
    posturaInicial: 'Sentado o suspendido en paralelas/anillas.',
    pasosEjecucion: [
      'Eleva ambas piernas extendidas al frente formando una "L" con el cuerpo.',
      'Sostén la posición isométrica el tiempo objetivo.'
    ],
    erroresComunes: [
      'Flexionar las rodillas para compensar falta de fuerza.',
      'Encoger los hombros en vez de mantenerlos deprimidos.'
    ],
    nivel: "intermedio",
    prerequisitos: ["plancha"],
    progresionDe: "plancha",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  'hollow body hold': {
    id: 'hollow body hold',
    nombre: 'Hollow Body Hold',
    categoria: 'calistenia',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'flexores de cadera',
    posturaInicial: 'Acostado boca arriba, espalda baja pegada al suelo.',
    pasosEjecucion: [
      'Eleva levemente hombros y piernas del piso.',
      'Forma una curva cóncava con el cuerpo, manteniendo la espalda baja pegada al suelo.'
    ],
    erroresComunes: [
      'Despegar la espalda baja del piso.',
      'Elevar demasiado las piernas, perdiendo la tensión de core.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":20,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  'wall sit': {
    id: 'wall sit',
    nombre: 'Wall Sit',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'core',
    posturaInicial: 'Espalda apoyada en la pared, rodillas a 90° como si estuvieras sentado en una silla invisible.',
    pasosEjecucion: [
      'Sostén la posición isométrica el mayor tiempo posible.',
      'Mantén los talones apoyados en el piso.'
    ],
    erroresComunes: [
      'Rodillas por delante de la punta del pie.',
      'Despegar la espalda de la pared.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "rodilla"
  },
  'handstand contra pared': {
    id: 'handstand contra pared',
    nombre: 'Handstand contra Pared',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core',
    posturaInicial: 'Con apoyo de pared, manos en el piso, pies contra la pared.',
    pasosEjecucion: [
      'Sube a la posición invertida con control.',
      'Mantén el equilibrio con el core activo y la mirada entre las manos.'
    ],
    erroresComunes: [
      'Arquear demasiado la espalda baja.',
      'Perder la alineación de hombros sobre las manos.'
    ],
    nivel: "intermedio",
    prerequisitos: ["pike push-up", "crow pose"],
    progresionDe: "pike push-up",
    criterioAvance: {"tipo":"segundos","valor":20,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-vertical"
  },
  'wall walk': {
    id: 'wall walk',
    nombre: 'Wall Walk',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core',
    posturaInicial: 'Posición de plancha con los pies apoyados en la pared.',
    pasosEjecucion: [
      'Camina los pies hacia arriba por la pared mientras las manos se acercan a ella.',
      'Progresa hacia la posición de handstand.'
    ],
    erroresComunes: [
      'Avanzar demasiado rápido perdiendo el control del core.',
      'No mantener el cuerpo alineado durante el ascenso.'
    ],
    nivel: "intermedio",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"reps","valor":5,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-vertical"
  },
  // --- Rama "estáticos": Crow Pose es el primer paso de la cadena real de
  // handstand (crow pose -> handstand contra pared -> handstand de cara a
  // la pared -> handstand libre), en paralelo a pike push-up que aporta la
  // fuerza de empuje — handstand contra pared exige ambas cosas a la vez.
  'crow pose': {
    id: 'crow pose',
    nombre: 'Crow Pose',
    categoria: 'calistenia',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'antebrazos, hombros',
    posturaInicial: 'En cuclillas, manos en el piso al ancho de hombros, rodillas apoyadas contra la parte externa de los brazos (tríceps).',
    pasosEjecucion: [
      'Inclina el peso hacia adelante hasta que los pies se despeguen del piso.',
      'Mantén la mirada al frente, no hacia abajo, para ayudar al equilibrio.'
    ],
    erroresComunes: [
      'Mirar hacia abajo, lo que desequilibra hacia adelante.',
      'Separar demasiado las manos, perdiendo la base de apoyo de las rodillas.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  // --- Rama "estáticos" del árbol de progresión (handstand libre) ---
  'handstand de cara a la pared': {
    id: 'handstand de cara a la pared',
    nombre: 'Handstand de Cara a la Pared',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core',
    posturaInicial: 'De cara a la pared, manos en el piso cerca de la base, subiendo a la posición invertida con el cuerpo hacia la pared.',
    pasosEjecucion: [
      'Sube a la posición invertida con los talones tocando la pared apenas como referencia, no como apoyo de peso.',
      'Mantén el cuerpo lo más recto posible, sin arquear la espalda baja.'
    ],
    erroresComunes: [
      'Apoyar peso real en la pared en vez de usarla solo de referencia.',
      'Arquear la espalda baja (banana back).'
    ],
    nivel: "intermedio",
    prerequisitos: ["handstand contra pared"],
    progresionDe: "handstand contra pared",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-vertical"
  },
  'handstand (libre)': {
    id: 'handstand (libre)',
    nombre: 'Handstand (Libre)',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core, tríceps',
    posturaInicial: 'En el centro del espacio, sin apoyo de pared, tras dominar el handstand contra pared.',
    pasosEjecucion: [
      'Patea o salta a la posición invertida buscando el equilibrio con la punta de los dedos.',
      'Sostén la posición ajustando el balance con pequeños movimientos de muñeca.'
    ],
    erroresComunes: [
      'Arquear demasiado la espalda baja.',
      'Mirar hacia adelante en vez de hacia las manos.'
    ],
    nivel: "intermedio",
    prerequisitos: ["handstand de cara a la pared"],
    progresionDe: "handstand de cara a la pared",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-vertical"
  },
  // --- Rama "estáticos": línea del front lever ---
  'front lever tuck': {
    id: 'front lever tuck',
    nombre: 'Front Lever Tuck',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'core, bíceps',
    posturaInicial: 'Colgado de una barra, rodillas llevadas al pecho, cuerpo horizontal.',
    pasosEjecucion: [
      'Tira de los hombros hacia abajo y atrás (retracción escapular) antes de levantar el cuerpo.',
      'Sostén el cuerpo horizontal con las rodillas al pecho.'
    ],
    erroresComunes: [
      'Dejar que los hombros suban hacia las orejas.',
      'Perder la horizontal dejando caer la cadera.'
    ],
    nivel: "intermedio",
    prerequisitos: ["dominadas", "hollow body hold"],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  'front lever avanzado': {
    id: 'front lever avanzado',
    nombre: 'Front Lever Avanzado (Tuck Avanzado)',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'core, bíceps',
    posturaInicial: 'Igual que el front lever tuck, pero con la cadera extendida y las piernas semi-extendidas.',
    pasosEjecucion: [
      'Extiende progresivamente la cadera mientras sostienes la horizontal.',
      'Mantén la retracción escapular activa durante todo el sostén.'
    ],
    erroresComunes: [
      'Extender las piernas antes de tener fuerza de cadera.',
      'Perder la tensión escapular a mitad del sostén.'
    ],
    nivel: "intermedio",
    prerequisitos: ["front lever tuck"],
    progresionDe: "front lever tuck",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  'front lever straddle': {
    id: 'front lever straddle',
    nombre: 'Straddle Front Lever',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'core, bíceps',
    posturaInicial: 'Colgado de una barra, cuerpo horizontal, piernas extendidas y abiertas en V.',
    pasosEjecucion: [
      'Sostén el cuerpo horizontal con las piernas abiertas, lo que reduce el torque comparado con piernas juntas.',
      'Mantén la retracción escapular activa durante todo el sostén.'
    ],
    erroresComunes: [
      'Cerrar las piernas para compensar falta de fuerza.',
      'Perder la horizontal dejando caer la cadera.'
    ],
    nivel: "avanzado",
    prerequisitos: ["front lever avanzado"],
    progresionDe: "front lever avanzado",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  'front lever': {
    id: 'front lever',
    nombre: 'Front Lever',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'core, bíceps, antebrazos',
    posturaInicial: 'Colgado de una barra, cuerpo completamente extendido y horizontal, paralelo al piso.',
    pasosEjecucion: [
      'Sostén el cuerpo recto y horizontal, piernas juntas y extendidas.',
      'Mantén la retracción escapular activa durante todo el sostén.'
    ],
    erroresComunes: [
      'Doblar las rodillas o la cadera para compensar falta de fuerza.',
      'Soltar la tensión de hombros a mitad del sostén.'
    ],
    nivel: "avanzado",
    prerequisitos: ["front lever straddle"],
    progresionDe: "front lever straddle",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  // --- Rama "estáticos": el muscle-up cruza dominadas + fondos ---
  'muscle-up': {
    id: 'muscle-up',
    nombre: 'Muscle-up',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'pecho, tríceps',
    posturaInicial: 'Colgado de la barra con agarre falso (muñecas por encima de la barra) o agarre normal.',
    pasosEjecucion: [
      'Tira explosivo llevando el pecho hacia la barra, más alto que en una dominada normal.',
      'En el punto más alto, rota las muñecas y transita empujando hacia arriba como en un fondo.'
    ],
    erroresComunes: [
      'Intentar la transición sin fuerza de dominada explosiva de base.',
      'Usar demasiado kipping en vez de fuerza controlada.'
    ]
  },
  // --- Rama "estáticos": prerrequisito de toda la línea de planche. Se
  // recomiendan 2+ meses de acondicionamiento antes de trabajo serio de
  // planche — es la causa más común de lesión temprana de muñeca.
  'acondicionamiento de muñeca': {
    id: 'acondicionamiento de muñeca',
    nombre: 'Acondicionamiento de Muñeca',
    categoria: 'calistenia',
    grupoMuscular: 'brazos',
    patron: 'otro',
    musculoSecundario: 'antebrazos',
    posturaInicial: 'Apoyado en el piso con las palmas planas, dedos hacia el cuerpo, o con variantes de flexión/extensión de muñeca con carga ligera.',
    pasosEjecucion: [
      'Sostén o mueve el peso del cuerpo (o una carga ligera) en distintos ángulos de muñeca: flexión, extensión, lateral.',
      'Progresa el tiempo y el ángulo de carga a lo largo de semanas, nunca de una sesión a otra.'
    ],
    erroresComunes: [
      'Saltar directo a trabajo de planche sin este acondicionamiento — es la causa más común de lesión temprana de muñeca.',
      'Progresar la carga o el ángulo antes de que la muñeca esté completamente sin dolor.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  'plancha lean': {
    id: 'plancha lean',
    nombre: 'Plancha Lean',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core, antebrazos',
    posturaInicial: 'Posición de flexión con las manos bajo los hombros, cuerpo recto.',
    pasosEjecucion: [
      'Inclina el cuerpo hacia adelante desde los tobillos, trasladando peso hacia las manos sin doblar los codos.',
      'Sostén el ángulo de inclinación el tiempo objetivo.'
    ],
    erroresComunes: [
      'Doblar los codos para compensar — si el codo se dobla no es planche.',
      'No inclinar lo suficiente para generar carga real en el hombro.'
    ],
    nivel: "intermedio",
    prerequisitos: ["acondicionamiento de muñeca"],
    progresionDe: "acondicionamiento de muñeca",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  'tuck planche': {
    id: 'tuck planche',
    nombre: 'Tuck Planche',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core, antebrazos',
    posturaInicial: 'Sentado con las manos junto a la cadera, rodillas al pecho.',
    pasosEjecucion: [
      'Empuja el piso elevando la cadera hasta despegar los pies del suelo, rodillas dobladas contra el pecho.',
      'Mantén los brazos completamente extendidos y la espalda plana.'
    ],
    erroresComunes: [
      'Doblar los codos — si el codo se dobla no es planche.',
      'Redondear la espalda en vez de mantenerla plana.'
    ],
    nivel: "intermedio",
    prerequisitos: ["plancha lean"],
    progresionDe: "plancha lean",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  // La diferencia entre el tuck y el tuck avanzado es la espalda plana en
  // vez de redondeada, lo que aleja el centro de masa de las manos y sube
  // la demanda de hombro sustancialmente — es donde más gente se estanca.
  // Criterio de avance más exigente que el resto de estáticos (12-15s por
  // 3+ series) antes de pasar a straddle.
  'tuck avanzado planche': {
    id: 'tuck avanzado planche',
    nombre: 'Tuck Avanzado Planche',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core, antebrazos',
    posturaInicial: 'Igual que el tuck planche, pero con la espalda plana en vez de redondeada y la cadera más extendida.',
    pasosEjecucion: [
      'Extiende progresivamente la cadera manteniendo la espalda plana, no redondeada.',
      'Mantén la protracción escapular activa durante todo el sostén.'
    ],
    erroresComunes: [
      'Mantener la espalda redondeada como en el tuck normal — es el error que más estanca el progreso hacia straddle.',
      'Protracción escapular insuficiente.'
    ],
    nivel: "avanzado",
    prerequisitos: ["tuck planche"],
    progresionDe: "tuck planche",
    criterioAvance: {"tipo":"segundos","valor":15,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  'straddle planche': {
    id: 'straddle planche',
    nombre: 'Straddle Planche',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core, antebrazos',
    posturaInicial: 'Cuerpo horizontal sostenido en las manos, piernas extendidas y abiertas en V.',
    pasosEjecucion: [
      'Extiende completamente cadera y rodillas manteniendo las piernas abiertas.',
      'Mantén los brazos bloqueados y la protracción escapular activa.'
    ],
    erroresComunes: [
      'Brazos no completamente bloqueados — si el codo se dobla no es planche.',
      'Cerrar las piernas para compensar falta de fuerza.'
    ],
    nivel: "avanzado",
    prerequisitos: ["tuck avanzado planche"],
    progresionDe: "tuck avanzado planche",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  'planche': {
    id: 'planche',
    nombre: 'Planche',
    categoria: 'calistenia',
    grupoMuscular: 'hombros',
    patron: 'empuje',
    musculoSecundario: 'core, antebrazos',
    posturaInicial: 'Cuerpo horizontal sostenido en las manos, piernas extendidas y juntas.',
    pasosEjecucion: [
      'Sostén el cuerpo recto y horizontal, piernas juntas y extendidas.',
      'Mantén los brazos bloqueados y la protracción escapular activa durante todo el sostén.'
    ],
    erroresComunes: [
      'Brazos no completamente bloqueados — si el codo se dobla no es planche.',
      'Protracción escapular insuficiente, dejando caer los hombros hacia atrás.'
    ],
    nivel: "avanzado",
    prerequisitos: ["straddle planche"],
    progresionDe: "straddle planche",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "ninguno",
    patronMovimiento: "empuje-horizontal"
  },
  'back lever': {
    id: 'back lever',
    nombre: 'Back Lever',
    categoria: 'calistenia',
    grupoMuscular: 'espalda',
    patron: 'traccion',
    musculoSecundario: 'core',
    posturaInicial: 'Colgado de una barra con agarre pronado, cuerpo boca abajo horizontal.',
    pasosEjecucion: [
      'Baja el cuerpo desde la posición colgada hasta quedar horizontal, boca abajo.',
      'Mantén el cuerpo recto de hombros a pies.'
    ],
    erroresComunes: [
      'Doblar la cadera en vez de mantener el cuerpo recto.',
      'Bajar demasiado rápido sin control.'
    ],
    nivel: "intermedio",
    prerequisitos: ["dominadas"],
    progresionDe: "dominadas",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "traccion-vertical"
  },
  'dragon flag': {
    id: 'dragon flag',
    nombre: 'Dragon Flag',
    categoria: 'calistenia',
    grupoMuscular: 'core',
    patron: 'core',
    musculoSecundario: 'espalda baja',
    posturaInicial: 'Acostado en un banco, sujeto con las manos detrás de la cabeza, cuerpo recto elevado desde los hombros.',
    pasosEjecucion: [
      'Baja el cuerpo lentamente manteniendo la línea recta desde los hombros hasta los pies, sin doblar la cadera.',
      'Sostén cerca del punto más bajo controlado antes de subir.'
    ],
    erroresComunes: [
      'Doblar la cadera durante el descenso — deja de ser dragon flag.',
      'Bajar demasiado rápido sin control.'
    ],
    nivel: "intermedio",
    prerequisitos: ["hollow body hold"],
    progresionDe: "hollow body hold",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "banco",
    patronMovimiento: "core"
  },
  'bandera humana': {
    id: 'bandera humana',
    nombre: 'Bandera Humana',
    categoria: 'calistenia',
    grupoMuscular: 'core',
    patron: 'traccion',
    musculoSecundario: 'hombros, espalda',
    posturaInicial: 'Sujeto de una barra o poste vertical con ambas manos, cuerpo horizontal al costado del poste.',
    pasosEjecucion: [
      'Sostén el cuerpo completamente horizontal y recto, perpendicular al poste.',
      'El brazo inferior empuja y el superior tira, ambos en tensión constante.'
    ],
    erroresComunes: [
      'Dejar caer las piernas o la cadera, perdiendo la línea recta.',
      'Intentarlo sin base sólida de fuerza de tracción y core.'
    ],
    nivel: "avanzado",
    prerequisitos: ["dominadas"],
    progresionDe: "dominadas",
    criterioAvance: {"tipo":"segundos","valor":10,"series":3},
    tambienEn: [],
    equipo: "barra-dominadas",
    patronMovimiento: "core"
  },
  'burpees': {
    id: 'burpees',
    nombre: 'Burpees',
    categoria: 'calistenia',
    grupoMuscular: 'cardio',
    patron: 'otro',
    musculoSecundario: 'cuerpo completo',
    posturaInicial: 'De pie, listo para iniciar el movimiento completo.',
    pasosEjecucion: [
      'Baja a posición de sentadilla y coloca las manos en el piso.',
      'Lleva los pies hacia atrás a posición de plancha (opcional: flexión).',
      'Regresa los pies hacia las manos.',
      'Sube explosivamente con un salto vertical.'
    ],
    erroresComunes: [
      'Perder la forma de la espalda al llevar los pies hacia atrás.',
      'No completar el salto final.'
    ],
    nivel: "intermedio",
    prerequisitos: ["medio burpee"],
    progresionDe: "medio burpee",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: ["hiit"],
    equipo: "ninguno",
    patronMovimiento: "locomocion"
  },
  'escaladores': {
    id: 'escaladores',
    nombre: 'Escaladores (Mountain Climbers)',
    categoria: 'calistenia',
    grupoMuscular: 'cardio',
    patron: 'core',
    musculoSecundario: 'hombros',
    posturaInicial: 'Posición de plancha alta, brazos extendidos.',
    pasosEjecucion: [
      'Alterna llevando cada rodilla hacia el pecho de forma rápida.',
      'Mantén la cadera estable y sin elevarla.'
    ],
    erroresComunes: [
      'Elevar la cadera durante el movimiento.',
      'Perder la velocidad/ritmo por fatiga de core.'
    ],
    nivel: "principiante",
    prerequisitos: [],
    progresionDe: null,
    criterioAvance: {"tipo":"segundos","valor":30,"series":3},
    tambienEn: ["hiit"],
    equipo: "ninguno",
    patronMovimiento: "core"
  },
  'sentadilla con salto': {
    id: 'sentadilla con salto',
    nombre: 'Sentadilla con Salto',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos',
    posturaInicial: 'De pie, pies al ancho de hombros.',
    pasosEjecucion: [
      'Realiza una sentadilla estándar.',
      'Termina con un salto explosivo vertical.',
      'Aterriza suavemente flexionando las rodillas para amortiguar.'
    ],
    erroresComunes: [
      'Aterrizar con las piernas rígidas (mal amortiguado).',
      'Rodillas colapsando hacia adentro al aterrizar.'
    ],
    nivel: "intermedio",
    prerequisitos: ["sentadilla con peso corporal"],
    progresionDe: "sentadilla con peso corporal",
    criterioAvance: {"tipo":"reps","valor":12,"series":3},
    tambienEn: ["hiit"],
    equipo: "ninguno",
    patronMovimiento: "rodilla"
  },
  'zancadas saltadas': {
    id: 'zancadas saltadas',
    nombre: 'Zancadas Saltadas',
    categoria: 'calistenia',
    grupoMuscular: 'piernas',
    patron: 'piernas',
    musculoSecundario: 'glúteos',
    posturaInicial: 'En posición de zancada, un pie adelante y otro atrás.',
    pasosEjecucion: [
      'Impulsa con un salto para alternar la pierna delantera y trasera.',
      'Aterriza con control en cada repetición.'
    ],
    erroresComunes: [
      'Aterrizar sin amortiguar (rodillas rígidas).',
      'Perder el equilibrio por falta de control en el aire.'
    ],
    nivel: "intermedio",
    prerequisitos: ["zancadas"],
    progresionDe: "zancadas",
    criterioAvance: {"tipo":"reps","valor":10,"series":3},
    tambienEn: ["hiit"],
    equipo: "ninguno",
    patronMovimiento: "rodilla"
  },

  // ============================ HIIT / CARDIO ============================
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

export function getEjercicioPorId(id) {
  return CATALOGO_EJERCICIOS[id] || null;
}

export function getEjercicioMetadata(nombre) {
  const fallback = { grupoMuscular: 'otro', patron: 'otro', categoria: null, posturaInicial: '', pasosEjecucion: [], erroresComunes: [], musculoSecundario: '' };
  if (!nombre) return fallback;
  const nomClean = nombre.toLowerCase().trim();

  // 1. Exact match
  if (CATALOGO_EJERCICIOS[nomClean]) return CATALOGO_EJERCICIOS[nomClean];

  // 2. Fuzzy match
  for (const key of Object.keys(CATALOGO_EJERCICIOS)) {
    if (nomClean.includes(key)) {
      return CATALOGO_EJERCICIOS[key];
    }
  }

  // Fallback if no match
  return fallback;
}

// Índice inverso nombre -> id, construido una sola vez al cargar el módulo.
// A diferencia de getEjercicioMetadata() (fuzzy: hace match por substring
// para resolver texto libre que el usuario tipeó a mano), esto es SOLO
// coincidencia exacta — lo usa db.js para vincular una sesión al
// ejercicioId estable del catálogo (Fase "Etapa 1"). Un falso positivo acá
// vincularía el historial de dos ejercicios distintos para siempre, así
// que no vale correr el riesgo del fuzzy match en este camino.
const NOMBRE_A_ID = new Map(
  Object.values(CATALOGO_EJERCICIOS).map(e => [e.nombre.toLowerCase().trim(), e.id])
);

// Devuelve el id de catálogo cuyo `nombre` coincide EXACTO (case-insensitive,
// trim) con `nombre`, o null si no hay coincidencia — típicamente un
// ejercicio que el usuario escribió a mano y no está en el catálogo. null
// es una respuesta válida y esperada, no un error.
export function getIdPorNombreExacto(nombre) {
  if (!nombre) return null;
  return NOMBRE_A_ID.get(nombre.toLowerCase().trim()) || null;
}

// Orden lógico y etiquetas para agrupar ejercicios por grupo muscular
// dentro de una rutina/plantilla. 'otro' cubre ejercicios sueltos que el
// usuario escribe a mano y no matchean el catálogo.
export const GRUPO_MUSCULAR_ORDEN = ['piernas', 'espalda', 'pecho', 'hombros', 'brazos', 'core', 'cardio', 'otro'];
export const GRUPO_MUSCULAR_LABELS = {
  piernas: 'Piernas',
  espalda: 'Espalda',
  pecho: 'Pecho',
  hombros: 'Hombros',
  brazos: 'Brazos',
  core: 'Core',
  cardio: 'Cardio',
  otro: 'Otros'
};

// Agrupa `items` por grupo muscular (según `getGrupo(item)`) preservando el
// orden original DENTRO de cada grupo, y devuelve los grupos en el orden
// lógico de entrenamiento (Piernas -> Espalda -> Pecho -> Hombros -> Brazos
// -> Core -> Cardio -> Otros), omitiendo los grupos sin ejercicios.
export function agruparPorGrupoMuscular(items, getGrupo) {
  const buckets = {};
  items.forEach(item => {
    const g = getGrupo(item) || 'otro';
    if (!buckets[g]) buckets[g] = [];
    buckets[g].push(item);
  });
  return GRUPO_MUSCULAR_ORDEN
    .filter(g => buckets[g] && buckets[g].length > 0)
    .map(g => ({ grupo: g, label: GRUPO_MUSCULAR_LABELS[g], items: buckets[g] }));
}
