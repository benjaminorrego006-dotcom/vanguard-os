// Escalera de calentamiento (docs/FASE7-CALENTAMIENTO-DESCANSO.md, F1).
// Lógica pura, sin UI: dado el peso de trabajo y el equipo, devuelve las
// series de aproximación [{ peso, reps, discosPorLado? }]. Solo para barra,
// mancuernas y máquina; cualquier otro equipo (peso corporal, banda, barra
// de dominadas…) o un peso vacío/0/inválido devuelve [].
import { calcularDiscos } from '../components/plate-calculator.js';

export const EQUIPOS_CON_CALENTAMIENTO = ['barra', 'mancuernas', 'maquina'];

// Redondea hacia abajo al múltiplo de `paso` (con tolerancia para errores
// de coma flotante: 0.6 * 100 da 60.00000000000001).
const haciaAbajo = (valor, paso) => Math.floor(valor / paso + 1e-9) * paso;

// Acepta número o texto ("62,5" o "62.5"), como llega de los inputs.
function leerPeso(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Quita pasos sin peso, iguales o más pesados que el de trabajo, o con el
// mismo peso que uno anterior.
function depurar(pasos, pesoTrabajo) {
  const vistos = new Set();
  return pasos.filter(p => {
    if (!(p.peso > 0) || p.peso >= pesoTrabajo || vistos.has(p.peso)) return false;
    vistos.add(p.peso);
    return true;
  });
}

export function escaleraCalentamiento({ pesoTrabajo, equipo, pesoBarra = 20 } = {}) {
  const trabajo = leerPeso(pesoTrabajo);
  if (!trabajo || !EQUIPOS_CON_CALENTAMIENTO.includes(equipo)) return [];

  if (equipo === 'barra') {
    // Menos que la barra sola no se puede cargar: sin escalera.
    if (trabajo < pesoBarra) return [];
    // Barra vacía ×10 siempre; el resto de los pasos solo si superan la barra.
    const pct = trabajo <= 40 ? [[0.7, 5]] : [[0.4, 5], [0.6, 3], [0.8, 2]];
    const subidas = pct
      .map(([p, reps]) => ({ peso: haciaAbajo(trabajo * p, 2.5), reps }))
      .filter(s => s.peso > pesoBarra);
    // Un paso a menos de 10 kg del anterior (la barra vacía cuenta como
    // paso) no aporta: se descarta. Con 60 kg: 20×10, 35×3, 47,5×2.
    const pasos = [{ peso: pesoBarra, reps: 10 }];
    depurar(subidas, trabajo).forEach(s => { if (s.peso - pasos[pasos.length - 1].peso >= 10) pasos.push(s); });
    return pasos.map(s => ({ ...s, discosPorLado: calcularDiscos(s.peso, pesoBarra) }));
  }

  // Mancuernas (peso por mancuerna, redondeo a 1 kg) y máquina (2,5 kg).
  const paso = equipo === 'mancuernas' ? 1 : 2.5;
  return depurar([
    { peso: haciaAbajo(trabajo * 0.5, paso), reps: 8 },
    { peso: haciaAbajo(trabajo * 0.75, paso), reps: 4 }
  ], trabajo);
}
