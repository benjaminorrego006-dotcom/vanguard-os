// seed-data.js
// Datos de prueba REALISTAS de una persona promedio en Chile, para ver
// poblada visualmente la app (gráficos, barras de progreso, mapa de
// actividad, listas, presupuesto en CLP). Solo para pruebas visuales — NO
// se referencia desde index.html ni desde sw.js, y no se carga nunca
// automáticamente. Se ejecuta a mano cuando se necesite, las veces que se
// quiera: cada ejecución parte de una base limpia (ver clearSeedData).
//
// Cómo usarlo (con la app abierta en el navegador, en la consola):
//   import('/seed-data.js').then(m => m.seedVanguardOS())
//
// Para borrar SOLO los datos de prueba (perfil se sobreescribe, no se
// borra; los sobres de Finanzas quedan intactos porque son configuración,
// no datos de prueba):
//   import('/seed-data.js').then(m => m.clearSeedData())

import { db } from './js/core/db.js';
import * as idb from './js/core/idb.js';
import { setCurrency } from './js/utils/currency.js';

function fechaYMD(diasAtras, base) {
  const d = new Date(base);
  d.setDate(d.getDate() - diasAtras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fechaISO(diasAtras, base, horas = 18) {
  const d = new Date(base);
  d.setDate(d.getDate() - diasAtras);
  d.setHours(horas, 0, 0, 0);
  return d.toISOString();
}
function series(n, reps, peso = 0) {
  return Array.from({ length: n }, () => ({ tipo: 'normal', reps: String(reps), peso }));
}

// Los stores que "seedVanguardOS" repuebla en cada corrida — se limpian
// primero para que re-ejecutar el script no vaya acumulando rutinas,
// sesiones, tareas y transacciones duplicadas. El perfil no se limpia acá
// porque seedVanguardOS siempre lo vuelve a guardar completo; los sobres
// (envelopes) tampoco, porque son configuración de Finanzas, no datos de
// prueba, y borrarlos resetearía montos asignados que el usuario haya
// definido a mano.
export async function clearSeedData() {
  for (const store of ['sesiones', 'rutinas', 'tareas', 'transacciones', 'goals', 'events']) {
    await idb.clearStore(store);
  }
  db._triggerUpdate();
  console.log('[seed] Rutinas, sesiones, tareas, transacciones, metas y log de eventos eliminados (perfil y sobres no se tocan).');
}

export async function seedVanguardOS() {
  await clearSeedData();

  // Moneda: pesos chilenos, sin decimales, para que los montos se vean
  // como "$780.000" y no como "$780,000.00".
  setCurrency('CLP');

  const HOY = new Date();
  const ymd = (d) => fechaYMD(d, HOY);
  const iso = (d, h) => fechaISO(d, HOY, h);
  // Para Finanzas: db.getBudget() filtra transacciones por el mes calendario
  // ACTUAL (no por HOY como referencia arbitraria). Si usáramos "días atrás"
  // fijos, ejecutar el script a inicios de mes empujaría los movimientos al
  // mes anterior y el presupuesto se vería vacío. Por eso acá el máximo
  // retroceso se acota a "ayer, como muy temprano" dentro del mes actual.
  const maxOfsMes = Math.max(0, HOY.getDate() - 1);
  const ymdMes = (diasAtrasDeseado) => ymd(Math.min(diasAtrasDeseado, maxOfsMes));

  // ------------------------------------------------------------------
  // 1. PERFIL — hombre de 26 años, actividad moderada, meta de subir masa
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
      fecha: iso(s.d),
      duracionMin: s.dur,
      completado: true,
      ejercicios: s.ej,
      rpe: s.rpe,
      notas: ''
    });
  }

  // ------------------------------------------------------------------
  // 4. TAREAS (con un par de trámites típicos en Chile)
  // ------------------------------------------------------------------
  const tareas = [
    // Por hacer
    { title: 'Preparar informe semanal', priority: 'high', dCreated: 1, status: 'todo', dueDias: -2 },
    { title: 'Comprar proteína', priority: 'medium', dCreated: 2, status: 'todo', dueDias: -3 },
    { title: 'Agendar hora médica (Isapre)', priority: 'medium', dCreated: 3, status: 'todo', dueDias: -5 },
    { title: 'Pagar permiso de circulación', priority: 'high', dCreated: 4, status: 'todo', dueDias: -6 },
    { title: 'Renovar suscripción gym', priority: 'low', dCreated: 4, status: 'todo', dueDias: -1 },
    { title: 'Llamar al arrendador', priority: 'high', dCreated: 7, status: 'todo', dueDias: -4 },
    // En progreso
    { title: 'Organizar rutina de la semana', priority: 'medium', dCreated: 5, status: 'in-progress' },
    { title: 'Revisar presupuesto del mes', priority: 'high', dCreated: 8, status: 'in-progress' },
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
      dueDate: t.dueDias !== undefined ? ymd(t.dueDias * -1) : '',
      project: '',
      status: t.status,
      subtasks: [],
      createdAt: iso(t.dCreated),
      completedAt: t.dDone !== undefined ? iso(t.dDone) : null
    });
  }

  // ------------------------------------------------------------------
  // 5. FINANZAS — en pesos chilenos (CLP), gastos típicos de Santiago
  // ------------------------------------------------------------------
  const envelopes = await db.getEnvelopes();
  const envId = (nombre) => (envelopes.find(e => e.name === nombre) || {}).id || null;

  // Ingreso mensual — sueldo líquido
  await db.addTransaction({ type: 'Ingreso', category: 'Income', label: 'Sueldo líquido', amount: 1050000, date: ymdMes(26) });

  // Gastos - Necesidades
  const gastosNeeds = [
    { label: 'Arriendo', amount: 350000, d: 26, env: 'Arriendo' },
    { label: 'Jumbo - Supermercado', amount: 48000, d: 24, env: 'Supermercado' },
    { label: 'Líder - Supermercado', amount: 42000, d: 17, env: 'Supermercado' },
    { label: 'Santa Isabel - Supermercado', amount: 55000, d: 10, env: 'Supermercado' },
    { label: 'Jumbo - Supermercado', amount: 39000, d: 3, env: 'Supermercado' },
    { label: 'Cuenta de luz (Enel)', amount: 28000, d: 22, env: 'Servicios' },
    { label: 'Cuenta de agua (Aguas Andinas)', amount: 17000, d: 22, env: 'Servicios' },
    { label: 'Internet (Movistar)', amount: 22990, d: 15, env: 'Servicios' },
    { label: 'Bencina (Copec)', amount: 27000, d: 23, env: 'Transporte' },
    { label: 'Metro / bip!', amount: 18000, d: 16, env: 'Transporte' },
    { label: 'Bencina (Copec)', amount: 25000, d: 9, env: 'Transporte' }
  ];
  // Gastos - Deseos
  const gastosWants = [
    { label: 'Cena con amigos', amount: 26000, d: 25, env: 'Salidas y Ocio' },
    { label: 'Cine', amount: 9000, d: 18, env: 'Salidas y Ocio' },
    { label: 'Carrete / bar', amount: 22000, d: 11, env: 'Salidas y Ocio' },
    { label: 'Concierto', amount: 42000, d: 5, env: 'Salidas y Ocio' },
    { label: 'Ropa nueva', amount: 35000, d: 7, env: 'Salidas y Ocio' },
    { label: 'Netflix', amount: 7990, d: 26, env: 'Suscripciones' },
    { label: 'Spotify', amount: 5990, d: 26, env: 'Suscripciones' },
    { label: 'Gimnasio', amount: 29990, d: 26, env: 'Suscripciones' }
  ];
  for (const g of [...gastosNeeds, ...gastosWants]) {
    const env = envelopes.find(e => e.name === g.env);
    await db.addTransaction({
      type: 'Gasto', category: env ? env.category : 'Needs',
      label: g.label, amount: g.amount, date: ymdMes(g.d), envelopeId: envId(g.env)
    });
  }

  // Meta de ahorro en progreso: Fondo de emergencia
  await db.createGoal({
    name: 'Fondo de emergencia', targetAmount: 1200000, currentAmount: 160000,
    icon: 'shield', dominio: 'finanzas', tipo: 'dinero'
  });
  const goals = await db.getGoals('finanzas');
  const emergencyGoalId = (goals.find(g => g.name === 'Fondo de emergencia') || {}).id || null;

  const ahorros = [
    { amount: 80000, d: 22 },
    { amount: 50000, d: 12 },
    { amount: 30000, d: 2 }
  ];
  for (const a of ahorros) {
    await db.addTransaction({
      type: 'Gasto', category: 'Savings', label: 'Fondo de emergencia',
      amount: a.amount, date: ymdMes(a.d), goalId: emergencyGoalId
    });
  }

  console.log('[seed] Datos de prueba insertados con éxito.');
  return true;
}

if (typeof window !== 'undefined') {
  window.seedVanguardOS = seedVanguardOS;
  window.clearSeedData = clearSeedData;
}
