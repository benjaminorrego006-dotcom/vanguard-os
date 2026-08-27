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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
