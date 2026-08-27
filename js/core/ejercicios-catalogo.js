export const CATALOGO_EJERCICIOS = {
  // --- PECHO ---
  'press banca': { grupoMuscular: 'pecho', patron: 'empuje', instrucciones: 'Pies firmes en el suelo, retrae las escápulas y baja la barra controlada hasta el pecho medio.', musculoSecundario: 'tríceps' },
  'flexiones': { grupoMuscular: 'pecho', patron: 'empuje', instrucciones: 'Cuerpo en línea recta, core contraído, baja hasta que el pecho roce el suelo.', musculoSecundario: 'tríceps, core' },
  'fondos': { grupoMuscular: 'pecho', patron: 'empuje', instrucciones: 'Inclínate ligeramente hacia adelante para enfocar el pecho, baja hasta los 90 grados.', musculoSecundario: 'tríceps, hombros' },
  'fondos en silla': { grupoMuscular: 'pecho', patron: 'empuje', instrucciones: 'Mantén la espalda cerca de la silla, baja flexionando los codos.', musculoSecundario: 'tríceps' },
  
  // --- ESPALDA ---
  'remo con barra': { grupoMuscular: 'espalda', patron: 'traccion', instrucciones: 'Torso a 45 grados o más paralelo, tira la barra hacia el ombligo retrayendo las escápulas.', musculoSecundario: 'bíceps' },
  'dominadas': { grupoMuscular: 'espalda', patron: 'traccion', instrucciones: 'Inicia el movimiento tirando de las escápulas hacia abajo, barbilla sobre la barra.', musculoSecundario: 'bíceps' },
  'dominadas negativas': { grupoMuscular: 'espalda', patron: 'traccion', instrucciones: 'Salta hasta arriba y controla la bajada de 3 a 5 segundos.', musculoSecundario: 'bíceps' },
  'remo invertido': { grupoMuscular: 'espalda', patron: 'traccion', instrucciones: 'Cuerpo recto como tabla, tira hasta que el pecho toque la barra.', musculoSecundario: 'bíceps' },
  
  // --- HOMBROS ---
  'press militar': { grupoMuscular: 'hombros', patron: 'empuje', instrucciones: 'Glúteos y core apretados, empuja la barra sobre la cabeza hasta bloquear codos.', musculoSecundario: 'tríceps' },
  
  // --- BRAZOS ---
  'curl de bíceps': { grupoMuscular: 'brazos', patron: 'traccion', instrucciones: 'Codos pegados a los costados, no balancees el torso.', musculoSecundario: 'antebrazos' },
  'curl': { grupoMuscular: 'brazos', patron: 'traccion', instrucciones: 'Codos pegados, rango completo de movimiento.', musculoSecundario: 'antebrazos' },
  
  // --- PIERNAS ---
  'sentadilla': { grupoMuscular: 'piernas', patron: 'piernas', instrucciones: 'Pies al ancho de hombros, baja controlando la rodilla alineada con el pie, rompe el paralelo si tienes movilidad.', musculoSecundario: 'glúteos, core' },
  'sentadillas': { grupoMuscular: 'piernas', patron: 'piernas', instrucciones: 'Misma técnica que sentadilla.', musculoSecundario: 'glúteos' },
  'peso muerto': { grupoMuscular: 'piernas', patron: 'piernas', instrucciones: 'Barra pegada a las espinillas, empuja el suelo con las piernas, espalda neutra.', musculoSecundario: 'espalda baja, glúteos' },
  'peso muerto rumano': { grupoMuscular: 'piernas', patron: 'piernas', instrucciones: 'Rodillas semi-flexionadas fijas, empuja la cadera hacia atrás hasta sentir estiramiento.', musculoSecundario: 'glúteos, espalda baja' },
  'elevación de talones': { grupoMuscular: 'piernas', patron: 'piernas', instrucciones: 'Sube explosivo, mantén 1 segundo arriba y baja profundo.', musculoSecundario: 'ninguno' },
  'zancadas': { grupoMuscular: 'piernas', patron: 'piernas', instrucciones: 'Paso largo, baja la rodilla trasera hacia el suelo sin tocarlo.', musculoSecundario: 'glúteos' },
  'pistol squat': { grupoMuscular: 'piernas', patron: 'piernas', instrucciones: 'Mantén el talón de apoyo firme, pierna libre recta.', musculoSecundario: 'core' },
  
  // --- CORE ---
  'plancha': { grupoMuscular: 'core', patron: 'core', instrucciones: 'Retrovertir la pelvis (apretar glúteos), cuerpo en línea recta.', musculoSecundario: 'hombros' },
  'abdominales': { grupoMuscular: 'core', patron: 'core', instrucciones: 'Contrae el abdomen intentando acercar el esternón a la pelvis.', musculoSecundario: 'ninguno' }
};

export function getEjercicioMetadata(nombre) {
  if (!nombre) return { grupoMuscular: 'otro', patron: 'otro' };
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
  return { grupoMuscular: 'otro', patron: 'otro' };
}