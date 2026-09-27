// Revisión semanal (S2): observaciones cruzadas por reglas, sin IA.
// Función pura: recibe la semana (resultado de resumirSemana, en db.js) y las
// 4 semanas anteriores con el mismo formato, y devuelve como máximo 2
// observaciones ordenadas por magnitud (diferencia relativa). Nunca dos del
// mismo módulo principal. Redacción: tuteo, "coincide con" / "en los días
// que…", nunca "causa" ni "porque".
import { formatCurrency } from '../utils/currency.js';
import { conMayuscula } from '../utils/fecha.js';

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DIAS_PLURAL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
// Comparaciones entre grupos de días: al menos 4 días en cada grupo, con la
// semana sola o, si no alcanza, con las semanas previas con actividad.
const MIN_DIAS_GRUPO = 4;
// Tope de magnitud: un caso extremo (ej. 83 % vs 11 % con pocos días) no
// tapa a las demás; entre empatadas gana la que tiene más días de datos.
const MAGNITUD_MAX = 3;
const MIN_SEMANAS_PREVIAS = 3;

// "3,6" (un decimal, coma).
const dec = (n) => n.toFixed(1).replace('.', ',');
const promedio = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
// Montos redondeados a la centena para que la frase se lea fácil.
const monto = (n) => formatCurrency(Math.round(n / 100) * 100);
// "el jueves 24"
const diaConNumero = (clave, dow) => `el ${DIAS[dow]} ${Number(clave.slice(8))}`;
const listaY = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);

const diasContados = (semanas) => semanas.flatMap(s => s.porDia.filter(d => !d.futuro));

// Semanas con algún día activo: las anteriores al primer dato no cuentan (sus
// días vacíos inflarían el grupo "sin").
const conActividad = (semanas) => semanas.filter(s => s.porDia.some(d => d.activo));

// Compara un valor diario entre dos grupos de días. Primero con la semana
// sola; si algún grupo no llega al mínimo, con las previas con actividad + la
// actual; si tampoco, null. `semanas` = cuántas semanas entraron (1 = esta semana).
function compararGrupos(semana, previas, filtro, grupo, valor) {
  const ampliado = conActividad([...previas, semana]);
  const intentos = [[semana]];
  if (ampliado.length > 1) intentos.push(ampliado);
  for (const semanas of intentos) {
    const dias = diasContados(semanas).filter(filtro);
    const si = dias.filter(grupo).map(valor);
    const no = dias.filter(d => !grupo(d)).map(valor);
    if (si.length >= MIN_DIAS_GRUPO && no.length >= MIN_DIAS_GRUPO) {
      return { semanas: semanas.length, si: promedio(si), no: promedio(no), nSi: si.length, nNo: no.length };
    }
  }
  return null;
}
const prefijo = (n) => (n === 1 ? 'Esta semana, los' : `En las últimas ${n} semanas, los`);

// 1. Energía del Ritual en días con y sin entreno.
function reglaEnergiaEntreno(semana, previas) {
  const c = compararGrupos(semana, previas, d => d.energia !== null, d => d.sesiones > 0, d => d.energia);
  if (!c || Math.abs(c.si - c.no) < 0.5) return null;
  const mas = c.si > c.no;
  return {
    id: 'energia-entreno', modulos: ['ritual', 'entreno'], principal: 'ritual', dias: c.nSi + c.nNo,
    magnitud: Math.abs(c.si - c.no) / Math.min(c.si, c.no),
    texto: `${prefijo(c.semanas)} días que entrenaste coinciden con ${mas ? 'más' : 'menos'} energía: ${dec(c.si)} vs ${dec(c.no)} los días sin entreno.`
  };
}

// Promedio de las semanas previas completas que tienen datos para `valor`.
function ritmoPrevio(previas, conDatos, valor) {
  const validas = previas.filter(s => !s.parcial && s.diasContados === 7 && conDatos(s));
  if (validas.length < MIN_SEMANAS_PREVIAS) return null;
  return { prom: promedio(validas.map(valor)), n: validas.length };
}
// En la semana en curso, el ritmo se prorratea a los días contados.
const aEstaAltura = (semana, prom) => (semana.parcial ? prom * semana.diasContados / 7 : prom);

// 2. Gasto en Deseos contra el promedio de las 4 semanas anteriores.
function reglaDeseos(semana, previas) {
  const r = ritmoPrevio(previas, s => s.finanzas.gastoTotal > 0, s => s.finanzas.porCategoria.deseos);
  if (!r || r.prom <= 0) return null;
  const actual = semana.finanzas.porCategoria.deseos;
  const esperado = aEstaAltura(semana, r.prom);
  const rel = (actual - esperado) / esperado;
  if (Math.abs(rel) < 0.3) return null;
  const inicio = semana.parcial ? `En lo que va de la semana llevas ${monto(actual)} en Deseos` : `Gastaste ${monto(actual)} en Deseos`;
  const referencia = semana.parcial ? `lo habitual a esta altura (${monto(esperado)})` : `tu promedio de las ${r.n} semanas anteriores (${monto(esperado)})`;
  const comparacion = actual >= esperado * 2
    ? `${dec(actual / esperado)} veces ${referencia}`
    : `un ${Math.round(Math.abs(rel) * 100)} % ${rel > 0 ? 'más' : 'menos'} que ${referencia}`;
  return { id: 'deseos-ritmo', modulos: ['finanzas'], principal: 'finanzas', dias: semana.diasContados + 7 * r.n, magnitud: Math.abs(rel), texto: `${inicio}: ${comparacion}.` };
}

// 3. Hábitos cumplidos en días con y sin Ritual.
function reglaRitualHabitos(semana, previas) {
  const c = compararGrupos(semana, previas, d => d.habitosPct !== null, d => d.ritual, d => d.habitosPct);
  if (!c || Math.abs(c.si - c.no) < 15) return null;
  const mas = c.si > c.no;
  return {
    id: 'ritual-habitos', modulos: ['habitos', 'ritual'], principal: 'habitos', dias: c.nSi + c.nNo,
    magnitud: Math.abs(c.si - c.no) / Math.max(1, Math.min(c.si, c.no)),
    texto: `${prefijo(c.semanas)} días que hiciste el Ritual coinciden con ${mas ? 'más' : 'menos'} hábitos cumplidos: ${Math.round(c.si)} % vs ${Math.round(c.no)} % los demás días.`
  };
}

// 4. Gasto variable (sin recurrentes) en días con y sin entreno.
function reglaGastoEntreno(semana, previas) {
  const c = compararGrupos(semana, previas, () => true, d => d.sesiones > 0, d => d.gastoVariable);
  if (!c) return null;
  const base = Math.min(c.si, c.no);
  if (base <= 0) return null;
  const rel = Math.abs(c.si - c.no) / base;
  if (rel < 0.25) return null;
  return {
    id: 'gasto-entreno', modulos: ['finanzas', 'entreno'], principal: 'finanzas', dias: c.nSi + c.nNo, magnitud: rel,
    texto: `${prefijo(c.semanas)} días que entrenaste coinciden con ${c.si > c.no ? 'más' : 'menos'} gasto variable: ${monto(c.si)} vs ${monto(c.no)} al día.`
  };
}

// 5. Tareas que entran contra tareas que salen.
function reglaTareas(semana) {
  const { creadas, completadas, deSemana } = semana.tareas;
  const dif = creadas - completadas;
  if (creadas + completadas < 4 || Math.abs(dif) < 2) return null;
  const rel = Math.abs(dif) / Math.max(1, Math.min(creadas, completadas));
  if (rel < 0.3) return null;
  const detalle = deSemana > 0 ? ` (${deSemana} de Semana)` : '';
  const texto = dif > 0
    ? `Entraron ${creadas} tareas y completaste ${completadas}${detalle}: la lista creció en ${dif}.`
    : `Completaste ${completadas} tareas${detalle} y entraron ${creadas}: la lista bajó en ${-dif}.`;
  return { id: 'tareas-flujo', modulos: ['tareas'], principal: 'tareas', dias: semana.diasContados, magnitud: rel, texto };
}

// 6. Día de la semana más activo (sesiones + tareas completadas).
function reglaMejorDia(semana, previas) {
  const semanas = conActividad([...previas, semana].filter(s => !s.futura));
  const completas = semanas.filter(s => s.diasContados === 7).length;
  if (completas < 4) return null;
  const porDow = Array(7).fill(0);
  diasContados(semanas).forEach(d => { porDow[d.dow] += d.sesiones + d.tareas; });
  const media = promedio(porDow);
  if (!media) return null;
  const mejor = porDow.indexOf(Math.max(...porDow));
  const flojo = porDow.indexOf(Math.min(...porDow));
  const rel = porDow[mejor] / media - 1;
  if (porDow[mejor] < media * 1.5) return null;
  return {
    id: 'mejor-dia', modulos: ['entreno', 'tareas'], principal: 'general', dias: diasContados(semanas).length, magnitud: rel,
    texto: `${conMayuscula(`los ${DIAS_PLURAL[mejor]}`)} son tus días más activos (${porDow[mejor]} entrenos y tareas en ${semanas.length} semanas); los ${DIAS_PLURAL[flojo]}, los más tranquilos (${porDow[flojo]}).`
  };
}

// 7. % de hábitos contra el promedio de las 4 semanas anteriores.
function reglaHabitosRitmo(semana, previas) {
  if (semana.habitos.pct === null) return null;
  const r = ritmoPrevio(previas, s => s.habitos.pct !== null, s => s.habitos.pct);
  if (!r) return null;
  const dif = semana.habitos.pct - r.prom;
  if (Math.abs(dif) < 10) return null;
  const verbo = semana.parcial ? 'Vas en' : 'Cumpliste';
  return {
    id: 'habitos-ritmo', modulos: ['habitos'], principal: 'habitos', dias: semana.diasContados + 7 * r.n,
    magnitud: Math.abs(dif) / Math.max(1, r.prom),
    texto: `${verbo} ${semana.habitos.pct} % de tus hábitos, ${dif > 0 ? 'sobre' : 'bajo'} tu ${Math.round(r.prom)} % habitual.`
  };
}

// 8. Días que sostuvo la vida extra. No tiene diferencia relativa: su
// magnitud es 1 por día protegido, para competir con las demás.
function reglaVidaExtra(semana) {
  const protegidos = semana.porDia.filter(d => d.protegido);
  if (!protegidos.length) return null;
  const dias = listaY(protegidos.map(d => diaConNumero(d.fecha, d.dow)));
  const texto = protegidos.length === 1
    ? `${conMayuscula(dias)} no registraste nada y la vida extra sostuvo tu racha.`
    : `${conMayuscula(dias)} no registraste nada y las vidas extra sostuvieron tu racha.`;
  return { id: 'vida-extra', modulos: ['racha'], principal: 'racha', dias: semana.diasContados, magnitud: protegidos.length, texto };
}

const REGLAS = [reglaEnergiaEntreno, reglaDeseos, reglaRitualHabitos, reglaGastoEntreno, reglaTareas, reglaMejorDia, reglaHabitosRitmo, reglaVidaExtra];

// Todas las reglas que se cumplen, de mayor a menor magnitud (para depurar
// y verificar); generarObservaciones elige de acá.
export function evaluarReglas(semana, semanasPrevias = []) {
  if (!semana || semana.futura || semana.diasContados === 0) return [];
  return REGLAS.map(regla => regla(semana, semanasPrevias))
    .filter(Boolean)
    .map(o => ({ ...o, magnitud: Math.min(MAGNITUD_MAX, o.magnitud) }))
    .sort((a, b) => b.magnitud - a.magnitud || b.dias - a.dias);
}

export function generarObservaciones(semana, semanasPrevias = []) {
  const elegidas = [];
  const usados = new Set();
  for (const o of evaluarReglas(semana, semanasPrevias)) {
    if (usados.has(o.principal)) continue;
    elegidas.push(o);
    usados.add(o.principal);
    if (elegidas.length === 2) break;
  }
  return elegidas;
}
