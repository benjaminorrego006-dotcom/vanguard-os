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
    patronMovimiento: "empuje-horizontal"
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
    patronMovimiento: "empuje-horizontal"
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
    patronMovimiento: "core"
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
    patronMovimiento: "core"
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
    patronMovimiento: "core"
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
    patronMovimiento: "core"
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
    patronMovimiento: "core"
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
};
