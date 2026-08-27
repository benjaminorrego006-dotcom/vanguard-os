// seed-data.js
// Datos de prueba REALISTAS para ver poblada visualmente la app (gráficos,
// barras de progreso, mapa de actividad, listas). Solo para pruebas
// visuales — NO se referencia desde index.html ni desde sw.js, y no se
// carga nunca automáticamente. Se ejecuta a mano cuando se necesite.
//
// Cómo usarlo (con la app abierta en el navegador, en la consola):
//   import('/seed-data.js').then(m => m.seedVanguardOS())
//
// Para borrar los datos de prueba (deja perfil y rutinas personalizadas
// intactos, solo limpia tareas/transacciones/sesiones/metas):
//   import('/seed-data.js').then(m => m.clearSeedData())

import { db } from './js/core/db.js';

const HOY = new Date('2026-08-27T12:00:00');

function fechaYMD(diasAtras) {
  const d = new Date(HOY);
  d.setDate(d.getDate() - diasAtras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fechaISO(diasAtras, horas = 18) {
  const d = new Date(HOY);
  d.setDate(d.getDate() - diasAtras);
  d.setHours(horas, 0, 0, 0);
  return d.toISOString();
}
function series(n, reps, peso = 0) {
  return Array.from({ length: n }, () => ({ tipo: 'normal', reps: String(reps), peso }));
}

export async function clearSeedData() {
  ['vg_tasks', 'vg_transactions', 'vg_sessions', 'vg_savings_goals'].forEach(k => localStorage.removeItem(k));
  db._triggerUpdate();
  console.log('[seed] Tareas, transacciones, sesiones y metas eliminadas (perfil y rutinas no se tocan).');
}

export async function seedVanguardOS() {
  await clearSeedData();

  // ------------------------------------------------------------------
  // 1. PERFIL
  // ------------------------------------------------------------------
  await db.saveProfile({
    pesoKg: 78, estaturaCm: 175, edad: 26, sexo: 'M',
    nivelActividad: 'moderado', meta: 'subir_masa'
  });

  // ------------------------------------------------------------------
  // 2. RUTINAS (necesarias para poder registrar sesiones "reales")
  // ------------------------------------------------------------------
  const rFullA = await db.crearRutina({
    categoria: 'gym', nombre: 'Full Body - Día A',
    ejercicios: [
      { nombre: 'Sentadilla Libre', series: series(4, '8') },
      { nombre: 'Press de Banca', series: series(4, '8') },
      { nombre: 'Remo con Barra', series: series(3, '10') },
      { nombre: 'Curl de Bíceps', series: series(3, '12') }
    ]
  });
  const rFullB = await db.crearRutina({
    categoria: 'gym', nombre: 'Full Body - Día B',
    ejercicios: [
      { nombre: 'Peso Muerto', series: series(4, '6') },
      { nombre: 'Press Militar', series: series(4, '8') },
      { nombre: 'Jalón al Pecho', series: series(3, '10') },
      { nombre: 'Extensión de Tríceps', series: series(3, '12') }
    ]
  });
  const rUpper = await db.crearRutina({
    categoria: 'gym', nombre: 'Upper (Torso)',
    ejercicios: [
      { nombre: 'Press de Banca Inclinado', series: series(4, '10') },
      { nombre: 'Dominadas o Jalón', series: series(4, '10') },
      { nombre: 'Remo en Polea Baja', series: series(3, '10') },
      { nombre: 'Elevaciones Laterales', series: series(4, '12') }
    ]
  });
  const rLower = await db.crearRutina({
    categoria: 'gym', nombre: 'Lower (Pierna)',
    ejercicios: [
      { nombre: 'Sentadilla o Prensa', series: series(4, '8') },
      { nombre: 'Peso Muerto Rumano', series: series(4, '10') },
      { nombre: 'Extensiones de Cuádriceps', series: series(3, '12') },
      { nombre: 'Elevación de Talones', series: series(4, '12') }
    ]
  });
  const rCalFB = await db.crearRutina({
    categoria: 'calistenia', nombre: 'Full Body (Sin Equipo)',
    ejercicios: [
      { nombre: 'Flexiones (Push-ups)', series: series(4, '15') },
      { nombre: 'Dominadas', series: series(4, '8') },
      { nombre: 'Fondos en Silla', series: series(3, '12') },
      { nombre: 'Sentadillas Búlgaras', series: series(3, '12') },
      { nombre: 'Plancha (Core)', series: series(3, '40s') }
    ]
  });
  const rCalPush = await db.crearRutina({
    categoria: 'calistenia', nombre: 'Push (Empuje)',
    ejercicios: [
      { nombre: 'Fondos', series: series(4, '10') },
      { nombre: 'Flexiones Diamante', series: series(3, '10') },
      { nombre: 'Plancha (Core)', series: series(3, '45s') }
    ]
  });
  const rCalPull = await db.crearRutina({
    categoria: 'calistenia', nombre: 'Pull (Tracción)',
    ejercicios: [
      { nombre: 'Dominadas', series: series(4, '8') },
      { nombre: 'Remo Invertido', series: series(3, '10') },
      { nombre: 'Sentadillas Búlgaras', series: series(3, '12') }
    ]
  });
  const rTabata = await db.crearRutina({
    categoria: 'hiit', nombre: 'Tabata Explosivo',
    hiitSettings: { mode: 'tabata', workSecs: 20, restSecs: 10, totalRounds: 8 },
    ejercicios: []
  });
  const rEmom = await db.crearRutina({
    categoria: 'hiit', nombre: 'EMOM (Fuerza-Resistencia)',
    hiitSettings: { mode: 'free', workSecs: 40, restSecs: 20, totalRounds: 12 },
    ejercicios: []
  });

  // ------------------------------------------------------------------
  // 3. SESIONES DE ENTRENO (últimas 3 semanas, con descansos y variación)
  // ------------------------------------------------------------------

  // --- GYM: 9 sesiones, progresión leve semana a semana ---
  const gymSesiones = [
    { d: 21, rutina: rFullA, nombre: 'Full Body - Día A', rpe: 7, dur: 55, ej: [
      { nombre: 'Sentadilla Libre', series: series(4, '8', 70) },
      { nombre: 'Press de Banca', series: series(4, '8', 60) },
      { nombre: 'Remo con Barra', series: series(3, '10', 55) },
      { nombre: 'Curl de Bíceps', series: series(3, '12', 12) }
    ]},
    { d: 17, rutina: rFullB, nombre: 'Full Body - Día B', rpe: 7, dur: 58, ej: [
      { nombre: 'Peso Muerto', series: series(4, '6', 90) },
      { nombre: 'Press Militar', series: series(4, '8', 35) },
      { nombre: 'Jalón al Pecho', series: series(3, '10', 50) },
      { nombre: 'Extensión de Tríceps', series: series(3, '12', 15) }
    ]},
    { d: 14, rutina: rUpper, nombre: 'Upper (Torso)', rpe: 6, dur: 50, ej: [
      { nombre: 'Press de Banca Inclinado', series: series(4, '10', 50) },
      { nombre: 'Dominadas o Jalón', series: series(4, '10', 48) },
      { nombre: 'Remo en Polea Baja', series: series(3, '10', 45) },
      { nombre: 'Elevaciones Laterales', series: series(4, '12', 8) }
    ]},
    { d: 10, rutina: rLower, nombre: 'Lower (Pierna)', rpe: 8, dur: 52, ej: [
      { nombre: 'Sentadilla o Prensa', series: series(4, '8', 75) },
      { nombre: 'Peso Muerto Rumano', series: series(4, '10', 60) },
      { nombre: 'Extensiones de Cuádriceps', series: series(3, '12', 35) },
      { nombre: 'Elevación de Talones', series: series(4, '12', 40) }
    ]},
    { d: 8, rutina: rFullA, nombre: 'Full Body - Día A', rpe: 8, dur: 60, ej: [
      { nombre: 'Sentadilla Libre', series: series(4, '8', 72.5) },
      { nombre: 'Press de Banca', series: series(4, '8', 62.5) },
      { nombre: 'Remo con Barra', series: series(4, '10', 57.5) },
      { nombre: 'Curl de Bíceps', series: series(3, '12', 13) }
    ]},
    { d: 6, rutina: rFullB, nombre: 'Full Body - Día B', rpe: 8, dur: 62, ej: [
      { nombre: 'Peso Muerto', series: series(4, '6', 95) },
      { nombre: 'Press Militar', series: series(4, '8', 37.5) },
      { nombre: 'Jalón al Pecho', series: series(3, '10', 52.5) },
      { nombre: 'Extensión de Tríceps', series: series(3, '12', 16) }
    ]},
    { d: 3, rutina: rUpper, nombre: 'Upper (Torso)', rpe: 7, dur: 48, ej: [
      { nombre: 'Press de Banca Inclinado', series: series(4, '10', 52.5) },
      { nombre: 'Dominadas o Jalón', series: series(4, '10', 50) },
      { nombre: 'Remo en Polea Baja', series: series(3, '10', 47.5) },
      { nombre: 'Elevaciones Laterales', series: series(4, '12', 9) }
    ]},
    { d: 1, rutina: rLower, nombre: 'Lower (Pierna)', rpe: 9, dur: 55, ej: [
      { nombre: 'Sentadilla o Prensa', series: series(4, '8', 80) },
      { nombre: 'Peso Muerto Rumano', series: series(4, '10', 65) },
      { nombre: 'Extensiones de Cuádriceps', series: series(3, '12', 37.5) },
      { nombre: 'Elevación de Talones', series: series(4, '12', 42.5) }
    ]},
    { d: 0, rutina: rFullA, nombre: 'Full Body - Día A', rpe: 8, dur: 65, ej: [
      { nombre: 'Sentadilla Libre', series: series(4, '8', 75) },
      { nombre: 'Press de Banca', series: series(4, '8', 65) },
      { nombre: 'Remo con Barra', series: series(4, '10', 60) },
      { nombre: 'Curl de Bíceps', series: series(3, '12', 14) }
    ]}
  ];

  // --- CALISTENIA: 4 sesiones ---
  const calSesiones = [
    { d: 19, rutina: rCalFB, nombre: 'Full Body (Sin Equipo)', rpe: 6, dur: 40, ej: [
      { nombre: 'Flexiones (Push-ups)', series: series(4, '15') },
      { nombre: 'Dominadas', series: series(4, '8') },
      { nombre: 'Fondos en Silla', series: series(3, '12') },
      { nombre: 'Sentadillas Búlgaras', series: series(3, '12') },
      { nombre: 'Plancha (Core)', series: series(3, '40s') }
    ]},
    { d: 12, rutina: rCalPush, nombre: 'Push (Empuje)', rpe: 7, dur: 32, ej: [
      { nombre: 'Fondos', series: series(4, '10') },
      { nombre: 'Flexiones Diamante', series: series(3, '10') },
      { nombre: 'Plancha (Core)', series: series(3, '45s') }
    ]},
    { d: 8, rutina: rCalPull, nombre: 'Pull (Tracción)', rpe: 7, dur: 38, ej: [
      { nombre: 'Dominadas', series: series(4, '8') },
      { nombre: 'Remo Invertido', series: series(3, '10') },
      { nombre: 'Sentadillas Búlgaras', series: series(3, '12') }
    ]},
    { d: 4, rutina: rCalFB, nombre: 'Full Body (Sin Equipo)', rpe: 7, dur: 42, ej: [
      { nombre: 'Flexiones (Push-ups)', series: series(4, '16') },
      { nombre: 'Dominadas', series: series(4, '9') },
      { nombre: 'Fondos en Silla', series: series(3, '13') },
      { nombre: 'Sentadillas Búlgaras', series: series(3, '14') },
      { nombre: 'Plancha (Core)', series: series(3, '50s') }
    ]}
  ];

  // --- HIIT/CARDIO: 4 sesiones, 20-30 min ---
  const hiitSesiones = [
    { d: 15, rutina: rTabata, nombre: 'Tabata Explosivo', rpe: 8, dur: 22, ej: [
      { nombre: 'Circuito Tabata', series: series(1, '8') }
    ]},
    { d: 11, rutina: rEmom, nombre: 'EMOM (Fuerza-Resistencia)', rpe: 7, dur: 28, ej: [
      { nombre: 'Circuito EMOM', series: series(1, '12') }
    ]},
    { d: 7, rutina: rTabata, nombre: 'Tabata Explosivo', rpe: 9, dur: 24, ej: [
      { nombre: 'Circuito Tabata', series: series(1, '8') }
    ]},
    { d: 2, rutina: rEmom, nombre: 'EMOM (Fuerza-Resistencia)', rpe: 8, dur: 30, ej: [
      { nombre: 'Circuito EMOM', series: series(1, '12') }
    ]}
  ];

  for (const s of [...gymSesiones, ...calSesiones, ...hiitSesiones]) {
    await db.registrarSesion({
      rutinaId: s.rutina.id,
      nombreRutina: s.nombre,
      fecha: fechaISO(s.d),
      duracionMin: s.dur,
      completado: true,
      ejercicios: s.ej,
      rpe: s.rpe,
      notas: ''
    });
  }

  // ------------------------------------------------------------------
  // 4. TAREAS
  // ------------------------------------------------------------------
  const tareas = [
    // Por hacer
    { title: 'Preparar informe semanal', priority: 'high', dCreated: 1, status: 'todo', dueDias: -2 },
    { title: 'Comprar proteína', priority: 'medium', dCreated: 2, status: 'todo', dueDias: -3 },
    { title: 'Agendar hora médica', priority: 'medium', dCreated: 3, status: 'todo', dueDias: -5 },
    { title: 'Renovar suscripción gym', priority: 'low', dCreated: 4, status: 'todo', dueDias: -1 },
    { title: 'Llamar al arrendador', priority: 'high', dCreated: 7, status: 'todo', dueDias: -4 },
    // En progreso
    { title: 'Organizar rutina de la semana', priority: 'medium', dCreated: 5, status: 'in-progress' },
    { title: 'Revisar presupuesto de agosto', priority: 'high', dCreated: 8, status: 'in-progress' },
    { title: 'Actualizar currículum', priority: 'low', dCreated: 12, status: 'in-progress' },
    // Completadas (últimos 15 días)
    { title: 'Pagar arriendo', priority: 'high', dCreated: 15, status: 'done', dDone: 14 },
    { title: 'Comprar mercado semanal', priority: 'medium', dCreated: 12, status: 'done', dDone: 11 },
    { title: 'Ir al dentista', priority: 'medium', dCreated: 10, status: 'done', dDone: 9 },
    { title: 'Enviar informe mensual', priority: 'high', dCreated: 8, status: 'done', dDone: 7 },
    { title: 'Renovar seguro auto', priority: 'medium', dCreated: 6, status: 'done', dDone: 4 },
    { title: 'Backup de fotos del celular', priority: 'low', dCreated: 2, status: 'done', dDone: 1 }
  ];
  for (const t of tareas) {
    await db.saveTask({
      title: t.title,
      description: '',
      priority: t.priority,
      dueDate: t.dueDias !== undefined ? fechaYMD(t.dueDias * -1) : '',
      project: '',
      status: t.status,
      subtasks: [],
      createdAt: fechaISO(t.dCreated),
      completedAt: t.dDone !== undefined ? fechaISO(t.dDone) : null
    });
  }

  // ------------------------------------------------------------------
  // 5. FINANZAS
  // ------------------------------------------------------------------
  const envelopes = await db.getEnvelopes();
  const envId = (nombre) => (envelopes.find(e => e.name === nombre) || {}).id || null;

  // Ingreso mensual
  await db.addTransaction({ type: 'Ingreso', category: 'Income', label: 'Sueldo', amount: 2000, date: fechaYMD(26) });

  // Gastos - Necesidades (50)
  const gastosNeeds = [
    { label: 'Arriendo', amount: 650, d: 26, env: 'Arriendo' },
    { label: 'Supermercado', amount: 85, d: 24, env: 'Supermercado' },
    { label: 'Supermercado', amount: 70, d: 17, env: 'Supermercado' },
    { label: 'Supermercado', amount: 92, d: 10, env: 'Supermercado' },
    { label: 'Supermercado', amount: 78, d: 3, env: 'Supermercado' },
    { label: 'Luz y agua', amount: 45, d: 22, env: 'Servicios' },
    { label: 'Internet', amount: 35, d: 15, env: 'Servicios' },
    { label: 'Bencina', amount: 30, d: 23, env: 'Transporte' },
    { label: 'Metro / Bus', amount: 25, d: 16, env: 'Transporte' },
    { label: 'Bencina', amount: 28, d: 9, env: 'Transporte' }
  ];
  // Gastos - Deseos (30)
  const gastosWants = [
    { label: 'Cena con amigos', amount: 60, d: 25, env: 'Salidas y Ocio' },
    { label: 'Cine', amount: 35, d: 18, env: 'Salidas y Ocio' },
    { label: 'Bar', amount: 45, d: 11, env: 'Salidas y Ocio' },
    { label: 'Concierto', amount: 90, d: 5, env: 'Salidas y Ocio' },
    { label: 'Ropa nueva', amount: 70, d: 7, env: 'Salidas y Ocio' },
    { label: 'Netflix', amount: 12, d: 26, env: 'Suscripciones' },
    { label: 'Spotify', amount: 8, d: 26, env: 'Suscripciones' },
    { label: 'Gimnasio', amount: 40, d: 26, env: 'Suscripciones' }
  ];
  for (const g of [...gastosNeeds, ...gastosWants]) {
    const env = envelopes.find(e => e.name === g.env);
    await db.addTransaction({
      type: 'Gasto', category: env ? env.category : 'Needs',
      label: g.label, amount: g.amount, date: fechaYMD(g.d), envelopeId: envId(g.env)
    });
  }

  // Meta de ahorro en progreso: Fondo de emergencia ($300 de $1000)
  await db.createGoal({
    name: 'Fondo de emergencia', targetAmount: 1000, currentAmount: 300,
    icon: 'shield', dominio: 'finanzas', tipo: 'dinero'
  });
  const goals = await db.getGoals('finanzas');
  const emergencyGoalId = (goals.find(g => g.name === 'Fondo de emergencia') || {}).id || null;

  const ahorros = [
    { amount: 150, d: 22 },
    { amount: 100, d: 12 },
    { amount: 50, d: 2 }
  ];
  for (const a of ahorros) {
    await db.addTransaction({
      type: 'Gasto', category: 'Savings', label: 'Fondo de emergencia',
      amount: a.amount, date: fechaYMD(a.d), goalId: emergencyGoalId
    });
  }

  console.log('[seed] Datos de prueba insertados con éxito.');
  return true;
}

if (typeof window !== 'undefined') {
  window.seedVanguardOS = seedVanguardOS;
  window.clearSeedData = clearSeedData;
}
