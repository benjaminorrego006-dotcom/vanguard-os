// js/core/datos-demo.js
// Datos de demostración BAJO DEMANDA (Configuración → Datos de prueba).
// Nunca corre solo: lo importa la vista de Configuración con
// window.appRouter.importar() recién cuando el usuario confirma.
//
// Todo pasa por las funciones públicas de db.js (que emiten logEvent), nunca
// escribiendo directo en IndexedDB, así que los datos quedan en el log igual
// que si el usuario los hubiera cargado a mano: rachas, vidas extra, avances
// y replay se derivan de ellos como siempre. Las fechas son claves de día
// relativas a hoy (diaKeyDe / sumarDias); las sesiones llevan hora local
// ('YYYY-MM-DDT19:00:00', sin zona) para que su ts caiga ese día.
import { db } from './db.js';
import { diaKeyDe, sumarDias } from '../utils/fecha.js';
import { EQUIPO_OPCIONES } from './trainingConfig.js';
import { generarPlan } from './generador-rutinas.js';

// Borra todos los stores de IndexedDB, incluidos `events` y `singletons`,
// con la misma función que restaura un respaldo (reemplaza cada store por
// el arreglo que recibe; acá, vacío). No emite eventos: el log se vacía.
export async function borrarTodo() {
  const stores = Object.keys(await db.exportarDatosRespaldo());
  await db.restaurarDatosRespaldo(Object.fromEntries(stores.map(s => [s, []])));
}

const dowDe = (clave) => { const [y, m, d] = clave.split('-').map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; }; // 0 = lunes
const serie = (reps, peso, rpe) => ({ tipo: 'normal', reps: String(reps), peso, checked: true, rpe });
const series = (n, reps, peso, rpeBase) => Array.from({ length: n }, (_, i) => serie(reps, peso, Math.min(10, rpeBase + (i === n - 1 ? 1 : 0))));

export async function cargarDatosDemo() {
  await borrarTodo();
  const hoy = diaKeyDe(new Date());
  const hace = (n) => sumarDias(hoy, -n);
  const [anio, mes] = hoy.split('-').map(Number);
  const inicioMes = diaKeyDe(new Date(anio, mes - 1, 1));
  const inicioMesAnterior = diaKeyDe(new Date(anio, mes - 2, 1));

  // ---------- Perfil, nivel y configuración ----------
  await db.marcarOnboardingInicialCompletado();
  await db.saveProfile({ pesoKg: 80, estaturaCm: 178, edad: 29, sexo: 'M', nivelActividad: 'moderado', meta: 'mantener' });
  await db.saveNivelEntrenamiento({ tiempoEntrenando: '1-3' });
  const equipoDisponible = EQUIPO_OPCIONES.map(o => o.value);
  await db.saveGeneradorConfig({ equipoDisponible, diasSemana: 3, duracionSesionMin: 45 });

  // ---------- Entreno: 3 rutinas generadas + 1 HIIT ----------
  const rutinasGym = [];
  try {
    const plan = await generarPlan({ categoria: 'gym', diasSemana: 3, duracionSesionMin: 45, equipoDisponible });
    for (const dia of plan.dias.filter(d => d.ejercicios && d.ejercicios.length).slice(0, 3)) {
      rutinasGym.push(await db.crearRutina({ nombre: dia.nombre, categoria: 'gym', ejercicios: dia.ejercicios.map(ej => ({ nombre: ej.nombre, series: ej.series })) }));
    }
  } catch (err) {
    console.warn('[datos demo] No se pudo usar el generador; se crean rutinas fijas.', err);
  }
  if (rutinasGym.length === 0) {
    rutinasGym.push(await db.crearRutina({ nombre: 'Día A · Empuje', categoria: 'gym', ejercicios: [{ nombre: 'Press de Banca', series: [] }, { nombre: 'Press Militar (de pie)', series: [] }] }));
  }
  const rutinaHiit = await db.crearRutina({ nombre: 'Tabata express', categoria: 'hiit', ejercicios: [{ nombre: 'Burpees', series: [] }], hiitSettings: { mode: 'tabata', workSecs: 20, restSecs: 10, totalRounds: 8 } });

  // ~20 sesiones en 60 días: GYM A / GYM B / calistenia rotando, cargas en
  // progresión. Press Militar 70 kg × 5 en las últimas 4 semanas (≈1,0× el
  // peso corporal) deja un avance de nivel listo en Entreno.
  const dias = [58, 55, 52, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 13, 10, 7, 5, 3];
  for (let i = 0; i < dias.length; i++) {
    const n = dias[i];
    const prog = i / dias.length; // 0 → 1
    const tipo = i % 3;
    let sesion;
    if (tipo === 0) {
      const r = rutinasGym[0];
      sesion = { rutinaId: r.id, nombreRutina: r.nombre, duracionMin: 50, rpe: 7, ejercicios: [
        { nombre: 'Sentadilla', series: series(4, 6, Math.round(90 + 20 * prog), 7) },
        { nombre: 'Press de Banca', series: series(4, 8, Math.round(60 + 12 * prog), 7) },
        { nombre: 'Remo con Barra', series: series(3, 10, Math.round(50 + 10 * prog), 6) }
      ] };
    } else if (tipo === 1) {
      const r = rutinasGym[1 % rutinasGym.length];
      const militar = n <= 28 ? 70 : Math.round(55 + 10 * prog);
      sesion = { rutinaId: r.id, nombreRutina: r.nombre, duracionMin: 55, rpe: 8, ejercicios: [
        { nombre: 'Peso Muerto Convencional', series: series(3, 5, Math.round(110 + 25 * prog), 8) },
        { nombre: 'Press Militar (de pie)', series: series(3, 5, militar, 8) },
        { nombre: 'Jalón al Pecho', series: series(3, 10, 55, 6) }
      ] };
    } else {
      sesion = { rutinaId: null, nombreRutina: 'Calistenia en casa', duracionMin: 35, rpe: 6, ejercicios: [
        { nombre: 'Flexiones (Push-up)', series: series(3, Math.round(12 + 6 * prog), 0, 6) },
        { nombre: 'Dominadas', series: series(3, Math.round(5 + 3 * prog), 0, 8) },
        { nombre: 'Fondos en Paralelas', series: series(3, 8, 0, 7) },
        { nombre: 'Sentadilla con Peso Corporal', series: series(3, 20, 0, 5) }
      ] };
    }
    await db.registrarSesion({ ...sesion, fecha: `${hace(n)}T19:00:00` });
  }
  await db.registrarSesion({ rutinaId: rutinaHiit.id, nombreRutina: rutinaHiit.nombre, duracionMin: 20, rpe: 9, ejercicios: [{ nombre: 'Burpees', series: [] }], fecha: `${hace(8)}T07:30:00` });
  await db.registrarDescansoActivoCompletado({ categoria: 'gym', nombre: 'Descanso activo' });

  // ---------- Hábitos (4) ----------
  // "Meditar" diario todos los días desde hace 45 salvo dos huecos viejos y
  // AYER: ayer sin actividad consume una vida extra y la racha sigue viva.
  const meditar = await db.crearHabito('Meditar 10 min');
  for (let n = 45; n >= 2; n--) if (n !== 30 && n !== 31) await db.toggleMarcaHabito(meditar.id, hace(n));
  const gimnasio = await db.crearHabito('Gimnasio', { frecuencia: { tipo: 'dias', dias: [0, 2, 4] } }); // lun, mié, vie
  for (let n = 40; n >= 2; n--) if ([0, 2, 4].includes(dowDe(hace(n))) && n !== 12) await db.toggleMarcaHabito(gimnasio.id, hace(n));
  const familia = await db.crearHabito('Llamar a la familia', { frecuencia: { tipo: 'semanal', vecesObjetivo: 2 } });
  for (let n = 42; n >= 2; n--) if ([2, 5].includes(dowDe(hace(n)))) await db.toggleMarcaHabito(familia.id, hace(n));
  const leer = await db.crearHabito('Leer', { meta: { cantidad: 20, unidad: 'min' } });
  for (let n = 25; n >= 2; n--) if (n % 6 !== 0) await db.registrarProgresoHabito(leer.id, hace(n), n % 4 === 0 ? 10 : 20);

  // ---------- Tareas: Lista (15) y Semana ----------
  const tareas = [
    ['Renovar el pasaporte', 'todo', 'high', hace(3)],        // atrasada
    ['Enviar informe mensual', 'todo', 'high', hace(1)],      // atrasada
    ['Comprar regalo de cumpleaños', 'todo', 'medium', sumarDias(hoy, 4)],
    ['Agendar control dental', 'todo', 'low', sumarDias(hoy, 10)],
    ['Revisar seguro del auto', 'todo', 'medium', ''],
    ['Ordenar la bodega', 'todo', 'low', ''],
    ['Preparar presentación', 'in-progress', 'high', sumarDias(hoy, 2)],
    ['Curso de inglés: unidad 4', 'in-progress', 'medium', sumarDias(hoy, 7)],
    ['Arreglar la bicicleta', 'in-progress', 'low', ''],
    ['Pagar la tarjeta de crédito', 'done', 'high', hace(2)],
    ['Llevar el auto a revisión', 'done', 'medium', hace(4)],
    ['Responder correos pendientes', 'done', 'low', ''],
    ['Comprar zapatillas', 'done', 'low', ''],
    ['Cancelar suscripción de revistas', 'done', 'medium', ''],
    ['Planificar vacaciones', 'todo', 'medium', sumarDias(hoy, 20)]
  ];
  for (const [title, status, priority, dueDate] of tareas) {
    await db.saveTask({ title, status, priority, dueDate, description: '', project: '', subtasks: [] });
  }
  const lunes = sumarDias(hoy, -dowDe(hoy));
  const semana = [['Hacer las compras', 0], ['Pagar cuentas', 1], ['Llamar al banco', 2], ['Clase de yoga', 3], ['Cena con amigos', 4], ['Limpiar el auto', 5]];
  for (const [texto, i] of semana) {
    const fecha = sumarDias(lunes, i);
    const item = await db.crearTareaPlan(fecha, texto);
    if (fecha < hoy) await db.toggleTareaPlan(item.id); // los días ya pasados de esta semana, hechos
  }
  await db.crearTareaPlan(hace(2), 'Devolver libro a la biblioteca'); // el único atrasado, sin hacer

  // ---------- Finanzas ----------
  const sobre = async (name, category, icon, assignedAmount) => db.createEnvelope({ name, category, icon, assignedAmount });
  const supermercado = await sobre('Supermercado', 'Needs', 'home', 250000);
  const transporte = await sobre('Transporte', 'Needs', 'car', 60000);
  const servicios = await sobre('Servicios', 'Needs', 'home', 90000);
  const salidas = await sobre('Salidas', 'Wants', 'plane', 80000);
  const suscripciones = await sobre('Suscripciones', 'Wants', 'laptop', 25000);

  const ingreso = (amount, label, date) => db.addTransaction({ type: 'Ingreso', category: 'Income', amount, label, date, goalId: null });
  await ingreso(1500000, 'Sueldo', inicioMesAnterior);
  await ingreso(180000, 'Proyecto freelance', sumarDias(inicioMesAnterior, 14));
  await ingreso(1500000, 'Sueldo', inicioMes);

  // ~50 gastos repartidos en los últimos 59 días.
  const catalogoGastos = [
    [supermercado, ['Supermercado', 'Feria', 'Panadería', 'Carnicería'], 8000, 45000],
    [transporte, ['Bencina', 'Metro', 'Estacionamiento', 'Uber'], 2000, 30000],
    [salidas, ['Cine', 'Café', 'Restaurante', 'Bar'], 5000, 35000],
    [suscripciones, ['Netflix', 'App de música', 'Almacenamiento en la nube'], 3000, 9000]
  ];
  for (let i = 0; i < 50; i++) {
    const [env, etiquetas, min, max] = catalogoGastos[i % catalogoGastos.length];
    const amount = Math.round((min + ((i * 7919) % 100) / 100 * (max - min)) / 100) * 100;
    await db.addTransaction({ type: 'Gasto', category: env.category, amount, label: etiquetas[i % etiquetas.length], date: hace(Math.round(i * 1.18)), envelopeId: env.id, goalId: null });
  }
  // Servicios casi agotado este mes: la recurrente de Internet no alcanza (alerta de flujo de caja).
  await db.addTransaction({ type: 'Gasto', category: servicios.category, amount: 38000, label: 'Cuenta de luz', date: hoy, envelopeId: servicios.id, goalId: null });
  await db.addTransaction({ type: 'Gasto', category: servicios.category, amount: 22000, label: 'Cuenta de agua', date: hoy, envelopeId: servicios.id, goalId: null });

  // Recurrentes: Internet cobra en 3 días (dayOfMonth máx. 28, como la UI).
  const diaInternet = Math.min(28, Number(sumarDias(hoy, 3).slice(8)));
  await db.createRecurring({ label: 'Internet', amount: 45000, dayOfMonth: diaInternet, envelopeId: servicios.id });
  await db.createRecurring({ label: 'App de música', amount: 6000, dayOfMonth: 15, envelopeId: suscripciones.id });

  await db.transferEnvelopeFunds(supermercado.id, transporte.id, 20000);

  await db.createGoal({ name: 'Fondo de emergencia', targetAmount: 600000, currentAmount: 0, dominio: 'finanzas', tipo: 'dinero', icon: 'shield', deadline: sumarDias(hoy, 120) });
  const meta = (await db.getGoals()).find(g => g.name === 'Fondo de emergencia');
  if (meta) await db.contributeToGoal(meta.id, 120000, 'Aporte mensual');

  // ---------- Ritual (últimos 10 días) ----------
  const misiones = ['Terminar la presentación', 'Entrenar pierna', 'Ordenar finanzas', 'Leer una hora', 'Llamar a mamá', 'Avanzar el curso', 'Salir a caminar', 'Cerrar pendientes', 'Planificar la semana', 'Descansar bien'];
  for (let n = 9; n >= 0; n--) {
    const fecha = hace(n);
    await db.setRitualCampo(fecha, 'mision', misiones[n]);
    await db.setRitualCampo(fecha, 'gratitud', n % 2 ? 'Buen café por la mañana' : 'Tiempo con la familia');
    await db.setRitualCampo(fecha, 'energia', 3 + (n % 3));
  }

  // ---------- Anotaciones: 6 notas en 3 categorías ----------
  await db.getCategoriasNota(); // siembra Personal e Ideas si faltan
  await db.crearCategoriaNota('Entreno');
  const cats = await db.getCategoriasNota();
  const catId = (nombre) => (cats.find(c => c.nombre === nombre) || cats[0]).id;
  const notas = [
    ['Personal', 'Lista de regalos', 'Libro para papá, audífonos para Sofi.'],
    ['Personal', 'Contraseña del wifi de la casa', 'Está pegada detrás del router.'],
    ['Ideas', 'App para compartir recetas', 'Guardar recetas con foto y lista de compras automática.'],
    ['Ideas', 'Viaje al sur', 'Puerto Varas en marzo, arrendar auto en Puerto Montt.'],
    ['Entreno', 'Técnica de sentadilla', 'Rodillas hacia afuera, pecho arriba, bajar hasta paralelo.'],
    ['Entreno', 'Objetivo del trimestre', 'Press militar con 75 kg por 5 repeticiones.']
  ];
  for (const [cat, titulo, texto] of notas) await db.crearNota(catId(cat), titulo, texto);
}
