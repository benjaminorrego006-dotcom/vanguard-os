export const PLANTILLAS = {
  gym: [
    {
      id: 'gym-fb-3dias',
      nombre: 'Full Body (3 DÃ­as)',
      nivel: 'Principiante / Intermedio',
      resumen: 'Fuerza Base + Hipertrofia',
      descripcion: 'Entrena todo el cuerpo alternando DÃ­a A y B. Ideal para ganar fuerza pura en ejercicios multiarticulares (5x5) complementado con hipertrofia.',
      rutinas: [
        {
          nombre: 'Full Body - DÃ­a A',
          ejercicios: [
            { nombre: 'Sentadilla Libre', series: Array.from({length: 5}, () => ({tipo:'normal', reps:'5', peso:0})) },
            { nombre: 'Press de Banca', series: Array.from({length: 5}, () => ({tipo:'normal', reps:'5', peso:0})) },
            { nombre: 'Remo con Barra', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-10', peso:0})) },
            { nombre: 'Curl de BÃ­ceps', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'10-12', peso:0})) }
          ]
        },
        {
          nombre: 'Full Body - DÃ­a B',
          ejercicios: [
            { nombre: 'Peso Muerto', series: Array.from({length: 5}, () => ({tipo:'normal', reps:'5', peso:0})) },
            { nombre: 'Press Militar', series: Array.from({length: 5}, () => ({tipo:'normal', reps:'5', peso:0})) },
            { nombre: 'JalÃ³n al Pecho', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-10', peso:0})) },
            { nombre: 'ExtensiÃ³n de TrÃ­ceps', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'10-12', peso:0})) }
          ]
        }
      ]
    },
    {
      id: 'gym-upper-lower',
      nombre: 'Torso / Pierna (4 DÃ­as)',
      nivel: 'Intermedio',
      resumen: 'Hipertrofia EstÃ©tica y Equilibrio',
      descripcion: 'Divide el cuerpo en mitades. MantendrÃ¡s todas las series en el rango de 8 a 12 repeticiones (cerca del fallo) para optimizar el crecimiento muscular.',
      rutinas: [
        {
          nombre: 'Upper (Torso)',
          ejercicios: [
            { nombre: 'Press de Banca Inclinado', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-12', peso:0})) },
            { nombre: 'Dominadas o JalÃ³n', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-12', peso:0})) },
            { nombre: 'Remo en Polea Baja', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'10-12', peso:0})) },
            { nombre: 'Elevaciones Laterales', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'12-15', peso:0})) }
          ]
        },
        {
          nombre: 'Lower (Pierna)',
          ejercicios: [
            { nombre: 'Sentadilla o Prensa', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-10', peso:0})) },
            { nombre: 'Peso Muerto Rumano', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'10-12', peso:0})) },
            { nombre: 'Extensiones de CuÃ¡driceps', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'12-15', peso:0})) },
            { nombre: 'ElevaciÃ³n de Talones', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'15-20', peso:0})) }
          ]
        }
      ]
    },
    {
      id: 'gym-phat',
      nombre: 'HÃ­brida PHAT (5 DÃ­as)',
      nivel: 'Avanzado',
      resumen: 'Fuerza MÃ¡xima + Hipertrofia',
      descripcion: 'Dos dÃ­as de fuerza pura (3-5 reps) para aumentar tus marcas, seguidos de tres dÃ­as de hipertrofia de alto volumen.',
      rutinas: [
        {
          nombre: 'PHAT - Torso (Fuerza)',
          ejercicios: [
            { nombre: 'Press de Banca', series: Array.from({length: 5}, () => ({tipo:'normal', reps:'3-5', peso:0})) },
            { nombre: 'Remo Pendlay', series: Array.from({length: 5}, () => ({tipo:'normal', reps:'3-5', peso:0})) },
            { nombre: 'Press Militar', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'6-8', peso:0})) }
          ]
        },
        {
          nombre: 'PHAT - Empuje (Hipertrofia)',
          ejercicios: [
            { nombre: 'Press Inclinado Mancuernas', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'10-12', peso:0})) },
            { nombre: 'Cruce de Poleas', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'12-15', peso:0})) },
            { nombre: 'ExtensiÃ³n TrÃ­ceps', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'15-20', peso:0})) }
          ]
        }
      ]
    },
    {
      id: 'gym-ppl-6d',
      nombre: 'Push / Pull / Legs (6 DÃ­as)',
      nivel: 'Avanzado',
      resumen: 'Sinergia y Volumen MÃ¡ximo',
      descripcion: 'La rutina reina de hipertrofia. Agrupa los mÃºsculos por patrones de movimiento para que descansen mientras trabajas otros grupos.',
      rutinas: [
        {
          nombre: 'PPL - Push (Empuje)',
          ejercicios: [
            { nombre: 'Press de Banca', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-10', peso:0})) },
            { nombre: 'Press Militar Mancuernas', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'10-12', peso:0})) },
            { nombre: 'Fondos en Paralelas', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'8-12', peso:0})) }
          ]
        },
        {
          nombre: 'PPL - Pull (TracciÃ³n)',
          ejercicios: [
            { nombre: 'Dominadas', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-12', peso:0})) },
            { nombre: 'Remo con Barra', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'10-12', peso:0})) },
            { nombre: 'Curl de BÃ­ceps', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'12-15', peso:0})) }
          ]
        },
        {
          nombre: 'PPL - Legs (Piernas)',
          ejercicios: [
            { nombre: 'Sentadilla Libre', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-10', peso:0})) },
            { nombre: 'Peso Muerto Rumano', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'10-12', peso:0})) },
            { nombre: 'Prensa', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'12-15', peso:0})) }
          ]
        }
      ]
    }
  ],
  calistenia: [
    {
      id: 'cal-fb',
      nombre: 'Full Body BÃ¡sico',
      nivel: 'Principiante',
      resumen: 'Fundamentos de Peso Corporal',
      descripcion: 'Controla tu propio cuerpo. Rango de 10-15 repeticiones para ganar masa muscular. Si es muy fÃ¡cil, pasa a una progresiÃ³n mÃ¡s difÃ­cil.',
      rutinas: [
        {
          nombre: 'Full Body (Sin Equipo)',
          ejercicios: [
            { nombre: 'Flexiones (Push-ups)', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'10-15', peso:0})) },
            { nombre: 'Dominadas o Remo Invertido', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'8-12', peso:0})) },
            { nombre: 'Fondos en Silla', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'10-15', peso:0})) },
            { nombre: 'Sentadillas', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'15-20', peso:0})) },
            { nombre: 'Plancha (Core)', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'30-45s', peso:0})) }
          ]
        }
      ]
    },
    {
      id: 'cal-pp',
      nombre: 'Push / Pull Bodyweight',
      nivel: 'Intermedio',
      resumen: 'Fuerza y TensiÃ³n Avanzada',
      descripcion: 'Para practicantes con experiencia. Rangos de fuerza pura (1-6 reps) en ejercicios desafiantes.',
      rutinas: [
        {
          nombre: 'Push (Empuje)',
          ejercicios: [
            { nombre: 'Flexiones en Pino (HSPU)', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'3-6', peso:0})) },
            { nombre: 'Fondos Lastrados', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'5-8', peso:0})) },
            { nombre: 'Flexiones Diamante', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'10-12', peso:0})) }
          ]
        },
        {
          nombre: 'Pull (TracciÃ³n)',
          ejercicios: [
            { nombre: 'Dominadas Lastradas', series: Array.from({length: 4}, () => ({tipo:'normal', reps:'3-6', peso:0})) },
            { nombre: 'Front Lever Raises', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'4-8', peso:0})) },
            { nombre: 'L-Sit', series: Array.from({length: 3}, () => ({tipo:'normal', reps:'15s', peso:0})) }
          ]
        }
      ]
    }
  ],
  hiit: [
    {
      id: 'hiit-tabata',
      nombre: 'Tabata ClÃ¡sico',
      nivel: 'Todos los niveles',
      resumen: 'Potencia AnaerÃ³bica (4 mins)',
      descripcion: 'El protocolo original para acelerar el metabolismo: 20 segundos de esfuerzo mÃ¡ximo y 10 segundos de descanso por 8 rondas.',
      hiitSettings: {
        mode: 'tabata',
        workSecs: 20,
        restSecs: 10,
        totalRounds: 8
      },
      rutinas: [
        {
          nombre: 'Tabata Explosivo',
          ejerciciosList: ['Jumping jacks', 'Sentadilla con salto', 'Mountain climbers', 'Burpees']
        }
      ]
    },
    {
      id: 'hiit-emom',
      nombre: 'EMOM The Engine',
      nivel: 'Intermedio',
      resumen: 'Fuerza-Resistencia (12 mins)',
      descripcion: 'Every Minute On the Minute. Realiza el ejercicio al inicio del minuto; el tiempo que sobre es tu descanso.',
      hiitSettings: {
        mode: 'free',
        workSecs: 40, // Trabajas hasta terminar, aprox 40s
        restSecs: 20,
        totalRounds: 12
      },
      rutinas: [
        {
          nombre: 'EMOM (Fuerza-Resistencia)',
          ejerciciosList: [
            '15 Kettlebell Swings o Sentadillas', 
            '10 Burpees', 
            '20 Zancadas Alternas con Salto',
            '15 Kettlebell Swings o Sentadillas', 
            '10 Burpees', 
            '20 Zancadas Alternas con Salto'
          ]
        }
      ]
    }
  ]
};

