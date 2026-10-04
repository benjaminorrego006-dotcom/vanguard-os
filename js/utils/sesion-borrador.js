// Borrador de la sesión de Entreno en curso (GYM y Calistenia): lo que hay
// en pantalla mientras entrenas —series marcadas, valores, ejercicios
// agregados y la hora de inicio—, para no perderlo si se recarga la página,
// se cierra la app o Android la mata.
//
// Va en localStorage y NO al log de eventos ni a la sync, a propósito: es
// estado de UI de un solo dispositivo y de vida corta. La sesión de verdad
// sigue naciendo con un único sesion_registrada al terminar
// (db.registrarSesion); si el borrador fuera al log, cada serie marcada o
// valor editado sería un evento que otros dispositivos replicarían y la
// racha, el heatmap y los récords verían actividad que todavía no existe (o
// que se descarta). Si localStorage no está disponible, la sesión funciona
// igual, solo que sin borrador.
//
// Forma: { rutinaId, nombreRutina, categoria, inicio (ms), ejercicios:
// [{ nombre, ejercicioId?, grupoId?, series: [{ tipo, reps, peso, rpe,
// checked }] }], ejercicioActivo (índice), actualizado (ms) }.
const CLAVE = 'vanguard.sesionEnCurso';

// Desde cuánto un borrador se considera "viejo": se ofrece igual, pero al
// guardarlo se pregunta si usar la duración real o 60 min.
export const BORRADOR_HORAS_LARGO = 12;

export function leerBorrador() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const b = JSON.parse(raw);
    // Retrocompatibilidad: sin inicio o sin ejercicios no hay qué retomar.
    if (!b || typeof b.inicio !== 'number' || !Array.isArray(b.ejercicios)) return null;
    return b;
  } catch (e) {
    return null;
  }
}

export function guardarBorrador(borrador) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ ...borrador, actualizado: Date.now() }));
    return true;
  } catch (e) {
    return false;
  }
}

export function borrarBorrador() {
  try { localStorage.removeItem(CLAVE); } catch (e) { /* sin localStorage no hay borrador que borrar */ }
}

export function esBorradorLargo(borrador, ahora = Date.now()) {
  return !!borrador && ahora - borrador.inicio > BORRADOR_HORAS_LARGO * 3600 * 1000;
}
