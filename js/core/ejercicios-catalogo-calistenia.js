// Ejercicios de Calistenia — ver ejercicios-catalogo-gym.js para la nota
// completa sobre por qué está dividido así.
export const CATALOGO_CALISTENIA = {
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
};
