// js/views/habitos.js
// Hábitos en Órbita (docs/rediseno-total.md, Fase 6). Tres pestañas: Hoy
// (lista con check y semana de cada hábito), Análisis (dona de 7 días, el
// hábito en riesgo y la tendencia de 8 semanas) y Logros (anillo de la
// racha global, vidas extra, últimos 7 días, mejor racha perfecta e
// insignias). El detalle de un hábito es una sub-pantalla con su propia
// entrada de historial. La pestaña es estado del módulo (como en Finanzas),
// no va en el hash. Todo se deriva en memoria; las mutaciones son las de
// db.js, cada una con su logEvent.
import { db } from '../core/db.js';
import { renderHabitoForm, setupHabitoForm, openHabitoForm } from '../components/habito-form.js';
import { renderDonutChart, destroyAllDonuts } from '../components/donut-chart.js';
import { ensureChartJs, baseChartOptions, hdPixelRatio, lineValueLabelsPlugin, verticalGradient } from '../utils/charts.js';
import { Toast, ConfirmDialog, hayModalAbierto } from '../utils/states.js';
import { diaKeyDe, sumarDias, fechaLocalDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';
import { svgEscudo, avisarPrimeraVidaSiCorresponde } from '../components/racha-reactor.js';
import { guardiaVista } from '../core/vista-activa.js';
import { abrirHojaDia } from '../components/dia-hoja.js';
import { habitoDiaAplicable, habitoCumplidoEnFecha } from '../utils/habito-dias.js';
import { oIcono, oAnillo, oVacio, oHoja, abrirHoja, cerrarHoja, montarHoja } from '../components/orbita.js';
import { esperarSalidaDeModal } from '../core/history.js';

// Guardia de la navegación con que se montó esta vista (core/vista-activa.js):
// un repintado que termina después de cambiar de vista no escribe encima.
let vistaVigente = () => true;

// --- Estado del módulo ---------------------------------------------------
const PESTANAS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'analisis', label: 'Análisis' },
  { id: 'logros', label: 'Logros' }
];
let pestana = 'hoy';
// Hoy (chip de racha) abre Hábitos directo en Logros.
export function pedirPestanaHabitos(tab) {
  if (PESTANAS.some(p => p.id === tab)) pestana = tab;
}
// Sub-pantalla de detalle: empuja una entrada de historial al entrar
// (instalada como PWA no hay botón atrás del navegador; sin esto el atrás
// del sistema saldría de la app en vez de volver a la lista).
let vista = 'lista';
let habitoDetalleId = null;
let popstateEnganchado = false;
// 'budget-updated' es el aviso genérico de sync.js de que se aplicó un
// cambio remoto: sin este listener un hábito marcado en otro dispositivo no
// se ve hasta salir y volver. Se engancha una sola vez (mountListeners se
// llama en cada repintado).
let syncEnganchado = false;

// Datos que los gráficos montan después de pintar el HTML.
let donaEntradas = [];
let tendencia = [];
let tendenciaChart = null;

// --- Fechas: semana calendario (lunes a domingo, es-CL) -----------------
const DOW_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DOW_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const hoyKey = () => diaKeyDe(new Date());
const dowDe = (iso) => (fechaLocalDe(iso).getDay() + 6) % 7; // 0 = lunes
function semanaActual() {
  const hoy = hoyKey();
  const lunes = sumarDias(hoy, -dowDe(hoy));
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

// Días de la semana en curso con descanso planificado o nota (store `dias`).
// En las semanas, un día de descanso sin marcar va rayado y neutro (no
// fallado) y un día con nota lleva un punto.
let diasSemana = new Map();
async function cargarDiasSemana() {
  const s = semanaActual();
  const filas = await db.getDias(s[0], s[6]);
  diasSemana = new Map(filas.map(d => [d.fecha, d]));
}
const esDescanso = (iso) => !!(diasSemana.get(iso) && diasSemana.get(iso).descanso);
const notaDia = (iso) => (diasSemana.get(iso) && diasSemana.get(iso).nota) || '';

// --- Hábitos: frecuencia y meta (utils/habito-dias.js) -------------------
const estaCumplido = habitoCumplidoEnFecha;
const esDiaAplicable = habitoDiaAplicable;
const tieneMeta = (h) => !!(h.meta && Number(h.meta.cantidad) > 0);
const esSemanal = (h) => (h.frecuencia || {}).tipo === 'semanal';
// Para MOSTRAR un valor: una marca "true" heredada (de antes de la meta
// numérica) se ve como la meta completa.
function valorMostrado(h, iso) {
  const v = (h.marcas || {})[iso];
  if (h.meta && v === true) return h.meta.cantidad;
  return v;
}
function labelFrecuencia(h) {
  const f = h.frecuencia || { tipo: 'diario' };
  if (f.tipo === 'dias') return (f.dias || []).slice().sort().map(i => DOW_CORTO[i]).join(', ');
  if (f.tipo === 'semanal') return `${f.vecesObjetivo || 1} ${(f.vecesObjetivo || 1) === 1 ? 'vez' : 'veces'} por semana`;
  return 'Diario';
}
function textoRacha(racha, semanal) {
  const n = racha.actual;
  if (!(n > 0)) return 'Sin racha todavía';
  if (semanal) return `${n} ${n === 1 ? 'semana seguida' : 'semanas seguidas'}`;
  return `${n} ${n === 1 ? 'día seguido' : 'días seguidos'}`;
}
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const ICO_FUEGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>';
const ICO_MAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
const ICO_VOLVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
const ICO_CHEVRON = '<svg class="o-hab-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';

// --- Semana compacta de una fila ----------------------------------------
// hecha (relleno del módulo) · fallada (día pasado que aplicaba, sin marcar:
// raya) · hoy (borde del módulo) · inactiva (futuro o no aplica) ·
// descanso (rayado). Los semanales muestran la barra de la semana.
function renderSemanaFila(h, hoyIso) {
  if (esSemanal(h)) {
    const hechas = semanaActual().filter(iso => estaCumplido(h, iso)).length;
    const objetivo = (h.frecuencia || {}).vecesObjetivo || 1;
    return `
      <span class="o-hab-barra" aria-hidden="true">
        <span class="o-hab-barra-pista"><span class="o-hab-barra-relleno" style="width: ${Math.min(100, (hechas / objetivo) * 100)}%"></span></span>
        <span class="o-hab-barra-num">${hechas}/${objetivo} esta semana</span>
      </span>`;
  }
  const celdas = semanaActual().map(iso => {
    const hecha = estaCumplido(h, iso);
    const futuro = iso > hoyIso;
    const aplica = esDiaAplicable(h, iso);
    const descanso = esDescanso(iso);
    const clases = ['o-hab-celda'];
    if (hecha) clases.push('o-hab-celda--hecha');
    else if (descanso) clases.push('o-hab-celda--descanso');
    else if (!futuro && iso !== hoyIso && aplica) clases.push('o-hab-celda--fallada');
    if (iso === hoyIso) clases.push('o-hab-celda--hoy');
    if ((futuro || !aplica) && !descanso) clases.push('o-hab-celda--inactiva');
    return `<span class="${clases.join(' ')}">${notaDia(iso) ? '<span class="o-hab-nota"></span>' : ''}${hecha ? oIcono('check') : ''}</span>`;
  }).join('');
  return `<span class="o-hab-semana" aria-hidden="true">${celdas}</span>`;
}

function resumenSemanaTexto(h) {
  if (esSemanal(h)) return '';
  const dias = semanaActual().filter(iso => iso <= hoyKey() && esDiaAplicable(h, iso));
  const hechas = dias.filter(iso => estaCumplido(h, iso)).length;
  return `, esta semana ${hechas} de ${dias.length}`;
}

// --- Pestaña Hoy -----------------------------------------------------------
function renderFila(h, hoyIso) {
  const hecho = estaCumplido(h, hoyIso);
  const aplica = esDiaAplicable(h, hoyIso);
  const racha = h._racha || { actual: 0 };
  const nombre = escapeHtml(h.nombre);
  let accion;
  if (!aplica) {
    accion = '<span class="o-hab-noaplica" aria-label="No aplica hoy">No<br>aplica</span>';
  } else if (tieneMeta(h)) {
    const v = valorMostrado(h, hoyIso);
    const unidad = escapeHtml(h.meta.unidad || '');
    accion = `<button type="button" class="o-btn o-btn--secundario o-hab-cantidad day-progreso-hoy" data-id="${escapeHtml(h.id)}" data-fecha="${hoyIso}" aria-pressed="${hecho}" aria-label="Registrar progreso de ${nombre} hoy (${Number(v) || 0} de ${h.meta.cantidad}${unidad ? ' ' + unidad : ''})">${v ? escapeHtml(String(v)) : ICO_MAS}</button>`;
  } else {
    accion = `<button type="button" class="o-check day-toggle-hoy" data-id="${escapeHtml(h.id)}" data-fecha="${hoyIso}" aria-pressed="${hecho}" aria-label="${hecho ? 'Desmarcar' : 'Marcar'} ${nombre} hoy">${oIcono('check')}</button>`;
  }
  return `
    <li class="o-fila o-hab-fila${hecho ? ' o-fila--hecha' : ''}" data-id="${escapeHtml(h.id)}">
      <button type="button" class="o-hab-abrir habito-row" data-id="${escapeHtml(h.id)}" aria-label="${nombre}: ${escapeHtml(textoRacha(racha, esSemanal(h)).toLowerCase())}${resumenSemanaTexto(h)}. Ver detalle">
        <span class="o-fila-texto"><b>${nombre}</b><small>${racha.actual > 0 ? ICO_FUEGO : ''}${escapeHtml(textoRacha(racha, esSemanal(h)))}</small></span>
        ${renderSemanaFila(h, hoyIso)}
      </button>
      <span class="o-hab-fila-fin">${accion}</span>
    </li>`;
}

function renderPanelHoy(habitos, hoyIso) {
  const nuevo = '<button type="button" class="o-btn o-btn--secundario" data-nuevo-habito>Nuevo hábito</button>';
  if (habitos.length === 0) {
    return `<div class="o-card">${oVacio({ icono: 'check', titulo: 'Sin hábitos todavía', texto: 'Agrega el primero y empieza a marcar días.' })}<div class="o-hab-vacio-accion">${nuevo}</div></div>`;
  }
  const tocan = habitos.filter(h => esDiaAplicable(h, hoyIso) && !esSemanal(h));
  const hechos = tocan.filter(h => estaCumplido(h, hoyIso)).length;
  const descanso = esDescanso(hoyIso);
  let titulo; let texto;
  if (tocan.length === 0) {
    titulo = 'Hoy no te toca ninguno';
    texto = 'Los semanales se marcan cualquier día.';
  } else if (hechos === tocan.length) {
    titulo = 'Todo listo por hoy';
    texto = `${plural(hechos, 'hábito cumplido', 'hábitos cumplidos')}.`;
  } else {
    titulo = `${hechos} de ${tocan.length} hoy`;
    texto = `Te ${tocan.length - hechos === 1 ? 'falta 1' : `faltan ${tocan.length - hechos}`} para cerrar el anillo.`;
  }
  if (descanso) texto = `Día de descanso planificado. ${texto}`;
  const anillo = oAnillo({
    valor: hechos, max: tocan.length || 1, centro: tocan.length ? `${hechos}/${tocan.length}` : '—',
    etiqueta: tocan.length ? `Hábitos de hoy: ${hechos} de ${tocan.length}` : 'Hoy no te toca ningún hábito'
  });
  return `
    <div class="o-hab-panel">
      <div class="o-hab-col">
        <div class="o-card o-card--destacada o-hab-resumen">
          ${anillo}
          <div class="o-hab-resumen-texto"><b>${titulo}</b><span>${escapeHtml(texto)}</span></div>
        </div>
      </div>
      <div class="o-hab-col">
        <ul class="o-lista" aria-label="Tus hábitos">${habitos.map(h => renderFila(h, hoyIso)).join('')}</ul>
      </div>
    </div>`;
}

// --- Pestaña Análisis -----------------------------------------------------
async function renderPanelAnalisis(habitos, hoyIso) {
  if (habitos.length === 0) {
    return `<div class="o-card">${oVacio({ icono: 'info', titulo: 'Sin datos todavía', texto: 'Crea un hábito y márcalo unos días para ver tu análisis.' })}</div>`;
  }
  // Últimos 7 días terminando hoy.
  const dias7 = Array.from({ length: 7 }, (_, i) => sumarDias(hoyIso, -i));
  donaEntradas = habitos
    .map((h, i) => ({ label: h.nombre, valor: dias7.filter(iso => estaCumplido(h, iso)).length, i }))
    .filter(e => e.valor > 0);
  const leyenda = donaEntradas.map(e => `
      <li><span class="o-hab-leyenda-punto" data-color="${e.i}"></span><span class="o-hab-leyenda-nombre">${escapeHtml(e.label)}</span><span class="o-hab-leyenda-num">${e.valor}/7</span></li>`).join('');
  const dona = donaEntradas.length === 0
    ? oVacio({ icono: 'check', titulo: 'Sin marcas esta semana', texto: 'Marca un hábito para ver su desglose aquí.' })
    : `<div class="o-hab-dona"><div class="o-hab-dona-lienzo"><canvas id="habitos-donut" role="img" aria-label="Días cumplidos por hábito en los últimos 7 días"></canvas></div><ul class="o-hab-leyenda">${leyenda}</ul></div>`;

  // En riesgo: el hábito con la racha más floja entre los que hoy siguen sin
  // marcar (con un solo hábito no hay "el más flojo").
  let riesgo = '';
  if (habitos.length >= 2 && !esDescanso(hoyIso)) {
    const sinMarcar = habitos.filter(h => esDiaAplicable(h, hoyIso) && !estaCumplido(h, hoyIso));
    if (sinMarcar.length > 0) {
      const flojo = [...sinMarcar].sort((a, b) => (a._racha?.actual || 0) - (b._racha?.actual || 0))[0];
      const n = flojo._racha?.actual || 0;
      riesgo = `
        <div class="o-card o-card--destacada" id="habitos-riesgo">
          <p class="o-rotulo">En riesgo hoy</p>
          <h3 class="o-card-titulo o-hab-riesgo-titulo">${escapeHtml(flojo.nombre)}</h3>
          <p class="o-card-texto">${n > 0 ? `Racha de ${plural(n, 'día', 'días')}; todavía sin marcar hoy.` : 'Sin racha y todavía sin marcar hoy.'}</p>
        </div>`;
    }
  }

  // Misma serie que el Laboratorio (un solo lugar que la define).
  tendencia = await db.getTendenciaCumplimientoHabitos(8);
  const hayTendencia = tendencia.some(v => v > 0);
  const estaSemana = tendencia[tendencia.length - 1] || 0;
  const promedio = Math.round(tendencia.reduce((a, b) => a + b, 0) / (tendencia.length || 1));
  const tendenciaHtml = !hayTendencia
    ? oVacio({ icono: 'info', titulo: 'Sin tendencia todavía', texto: 'Marca hábitos un par de semanas más para ver el avance.' })
    : `
      <div class="o-hab-cifras">
        <div class="o-hab-cifra"><b>${estaSemana}%</b><span class="o-rotulo">Esta semana</span></div>
        <div class="o-hab-cifra"><b>${promedio}%</b><span class="o-rotulo">Promedio 8 sem.</span></div>
      </div>
      <div class="o-hab-tendencia"><canvas id="habitos-tendencia-chart" role="img" aria-label="Porcentaje de hábitos cumplidos por semana: esta semana ${estaSemana} %, promedio ${promedio} %"></canvas></div>`;

  return `
    <div class="o-hab-panel">
      <div class="o-hab-col">
        <div class="o-card">
          <p class="o-rotulo o-hab-card-rotulo">Cumplimiento por hábito · 7 días</p>
          ${dona}
        </div>
        ${riesgo}
      </div>
      <div class="o-hab-col">
        <div class="o-card">
          <p class="o-rotulo o-hab-card-rotulo">Hábitos cumplidos por semana · 8 semanas</p>
          ${tendenciaHtml}
        </div>
      </div>
    </div>`;
}

// --- Pestaña Logros ---------------------------------------------------------
const DIAS_POR_VIDA = 7;
const VIDAS_MAX = 2;
// Insignias: sin niveles ni copy de videojuego. Cada una toma el color de su
// módulo (.o-mod-*); bloqueada = candado neutro.
const INSIGNIAS = {
  racha_7: { modulo: 'habitos', icono: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>' },
  primera_meta: { modulo: 'finanzas', icono: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>' },
  mes_sin_exceder: { modulo: 'finanzas', icono: '<circle cx="12" cy="12" r="9"></circle><polyline points="8.5 12 11 14.5 15.5 10"></polyline>' },
  diez_sesiones: { modulo: 'entreno', icono: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"></path>' }
};
const ICO_CANDADO = '<rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>';

function renderInsignia(b) {
  const meta = INSIGNIAS[b.id] || { modulo: 'habitos', icono: ICO_CANDADO };
  return `
    <li class="o-hab-insignia${b.unlocked ? ' o-hab-insignia--ganada o-mod-' + meta.modulo : ''}">
      <span class="o-hab-insignia-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b.unlocked ? meta.icono : ICO_CANDADO}</svg></span>
      <span class="o-hab-insignia-texto">${escapeHtml(b.label)}<small>${b.unlocked ? 'Ganada' : 'Bloqueada'}</small></span>
    </li>`;
}

function renderRacha7(racha) {
  const protegidos = new Set(racha.diasProtegidos || []);
  const hoy = hoyKey();
  return `
    <ul class="o-hab-racha7" aria-label="Últimos 7 días de la racha">
      ${racha.last7.map(d => {
        const estado = protegidos.has(d.date) ? 'protegida' : d.count > 0 ? 'hecha' : d.descanso ? 'descanso' : 'vacia';
        const etiqueta = { protegida: 'protegido por una vida extra', hecha: 'con actividad', descanso: 'descanso planificado', vacia: d.date === hoy ? 'hoy, pendiente' : 'sin actividad' }[estado];
        const dow = dowDe(d.date);
        return `
          <li class="${d.date === hoy ? 'o-hab-racha7-hoy' : ''}" aria-label="${DOW_LARGO[dow]} ${Number(d.date.slice(8))}: ${etiqueta}">
            <span class="o-hab-racha7-letra" aria-hidden="true">${DOW_CORTO[dow]}</span>
            <span class="o-hab-celda o-hab-celda--${estado}${d.date === hoy && estado === 'vacia' ? ' o-hab-celda--hoy' : ''}" aria-hidden="true">${estado === 'hecha' ? oIcono('check') : estado === 'protegida' ? svgEscudo({ lleno: true, size: 12 }) : ''}</span>
          </li>`;
      }).join('')}
    </ul>`;
}

async function renderPanelLogros(habitos) {
  const [racha, badges, perfecta] = await Promise.all([db.getRachaGlobal(), db.getBadges(), db.getRachaHabitosGlobal()]);
  avisarPrimeraVidaSiCorresponde(racha);
  const llenas = Math.min(racha.vidas, VIDAS_MAX);
  // El arco avanza hacia la próxima vida extra (7 días activos seguidos); con
  // las dos vidas ganadas queda lleno.
  const avance = racha.vidas >= VIDAS_MAX ? DIAS_POR_VIDA : DIAS_POR_VIDA - racha.faltanParaVida;
  const vidasTexto = racha.vidas > 0
    ? `${plural(racha.vidas, 'vida extra', 'vidas extra')}: protege${racha.vidas === 1 ? '' : 'n'} tu racha si un día no registras nada.`
    : `Gana una vida con 7 días seguidos (${racha.faltanParaVida === 1 ? 'falta 1' : `faltan ${racha.faltanParaVida}`}).`;
  return `
    <div class="o-hab-panel">
      <div class="o-hab-col">
        <div class="o-card o-card--destacada o-hab-logro" id="habitos-logro">
          <p class="o-rotulo">Racha global</p>
          ${oAnillo({ valor: avance, max: DIAS_POR_VIDA, grande: true, centro: racha.actual, sub: racha.actual === 1 ? 'día' : 'días', etiqueta: `Racha de ${plural(racha.actual, 'día', 'días')}. ${racha.vidas >= VIDAS_MAX ? 'Tienes las dos vidas extra' : `Faltan ${plural(racha.faltanParaVida, 'día', 'días')} para la próxima vida extra`}` })}
          <span class="o-hab-vidas" aria-label="${plural(racha.vidas, 'vida extra', 'vidas extra')} de ${VIDAS_MAX}">
            ${Array.from({ length: VIDAS_MAX }, (_, i) => `<span class="${i < llenas ? 'o-hab-vida--llena' : ''}">${svgEscudo({ lleno: i < llenas, size: 22 })}</span>`).join('')}
          </span>
          <p class="o-hab-logro-texto" id="habitos-vidas-texto">${escapeHtml(vidasTexto)}</p>
          ${renderRacha7(racha)}
          <p class="o-hab-logro-texto">La racha cuenta actividad en Hábitos, Tareas, Entreno y Finanzas.${racha.descansosMes > 0 ? ` <b>${racha.descansosMes}</b> ${racha.descansosMes === 1 ? 'descanso' : 'descansos'} este mes.` : ''}</p>
        </div>
      </div>
      <div class="o-hab-col">
        ${habitos.length > 0 ? `
        <div class="o-card">
          <p class="o-rotulo">Racha perfecta</p>
          <p class="o-hab-logro-texto o-hab-perfecta" title="Días con todos los hábitos cumplidos">Días seguidos con todos tus hábitos cumplidos: <b>${perfecta.actual}</b> ahora, mejor <b>${perfecta.mejor}</b>.</p>
        </div>` : ''}
        <div class="o-card">
          <p class="o-rotulo o-hab-card-rotulo">Insignias · ${badges.filter(b => b.unlocked).length} de ${badges.length}</p>
          <ul class="o-hab-insignias">${badges.map(renderInsignia).join('')}</ul>
        </div>
      </div>
    </div>`;
}

// --- Hoja de progreso (hábitos con cantidad): fija la cantidad del día ---
function renderProgresoHoja() {
  return oHoja({
    id: 'progreso-modal', modulo: 'habitos', titulo: 'Registrar progreso',
    cuerpo: `
      <form id="progreso-form" class="o-campo" onsubmit="return false;">
        <label for="progreso-cantidad" id="progreso-unidad-label">Cantidad</label>
        <input type="number" id="progreso-cantidad" class="o-input o-input--monto" min="0" step="any" inputmode="decimal" enterkeyhint="done" autocomplete="off">
        <p id="progreso-ayuda" class="o-campo-ayuda"></p>
        <input type="hidden" id="progreso-habito-id">
        <input type="hidden" id="progreso-fecha">
      </form>`,
    pie: '<button type="button" class="o-btn o-btn--secundario" data-hoja-cerrar>Cancelar</button><button type="submit" form="progreso-form" id="btn-save-progreso" class="o-btn o-btn--primario">Guardar</button>'
  });
}

function abrirProgreso(h, fecha) {
  if (!document.getElementById('progreso-modal')) return;
  document.getElementById('progreso-modal-titulo').textContent = h.nombre;
  document.getElementById('progreso-habito-id').value = h.id;
  document.getElementById('progreso-fecha').value = fecha;
  const unidad = (h.meta && h.meta.unidad) || 'veces';
  document.getElementById('progreso-unidad-label').textContent = `Cantidad (${unidad})`;
  const dia = fecha === hoyKey() ? 'hoy' : `el ${DOW_LARGO[dowDe(fecha)]} ${Number(fecha.slice(8))}`;
  document.getElementById('progreso-ayuda').textContent = `Meta: ${h.meta.cantidad} ${unidad}. Escribe el total de ${dia}.`;
  document.getElementById('progreso-cantidad').value = valorMostrado(h, fecha) || '';
  abrirHoja('progreso-modal');
}

// --- Detalle de un hábito ---------------------------------------------------
function renderFranja(h, hoyIso) {
  return semanaActual().map(iso => {
    const hecha = estaCumplido(h, iso);
    const valor = valorMostrado(h, iso);
    const esHoy = iso === hoyIso;
    const futuro = iso > hoyIso;
    const aplica = esDiaAplicable(h, iso);
    const inactivo = futuro || !aplica;
    const descanso = esDescanso(iso);
    const nota = notaDia(iso);
    const dow = dowDe(iso);
    const diaLabel = `${DOW_LARGO[dow]} ${Number(iso.slice(8))}`;
    const extra = [descanso ? 'descanso planificado' : '', nota ? `nota: ${nota}` : ''].filter(Boolean).join(', ');
    const label = inactivo
      ? `${h.nombre} el ${diaLabel} (${futuro ? 'todavía no llega' : 'no aplica este día'})`
      : `${hecha ? 'Desmarcar' : 'Marcar'} ${h.nombre} el ${diaLabel}`;
    const clases = ['o-hab-celda'];
    if (hecha) clases.push('o-hab-celda--hecha');
    else if (descanso) clases.push('o-hab-celda--descanso');
    if (inactivo && !descanso) clases.push('o-hab-celda--inactiva');
    if (esHoy) clases.push('o-hab-celda--hoy');
    const contenido = tieneMeta(h) && valor ? escapeHtml(String(valor)) : (hecha ? oIcono('check') : '');
    return `
      <button type="button" class="o-hab-dia ${tieneMeta(h) ? 'day-progreso' : 'day-toggle'}${esHoy ? ' o-hab-dia--hoy' : ''}" data-id="${escapeHtml(h.id)}" data-fecha="${iso}" data-dia-largo="1"
        ${inactivo ? 'aria-disabled="true"' : ''} aria-pressed="${hecha}" aria-label="${escapeHtml(label)}${extra ? ` · ${escapeHtml(extra)}` : ''}"${nota ? ` title="${escapeHtml(nota)}"` : ''}>
        <span class="o-hab-dia-letra" aria-hidden="true">${DOW_CORTO[dow]}</span>
        <span class="${clases.join(' ')}" aria-hidden="true">${nota ? '<span class="o-hab-nota"></span>' : ''}${contenido}</span>
      </button>`;
  }).join('');
}

async function renderDetalle(id) {
  await cargarDiasSemana();
  const habitos = await db.getHabitos();
  const h = habitos.find(x => x.id === id);
  if (!h) { vista = 'lista'; habitoDetalleId = null; return renderModulo(); }
  const hoyIso = hoyKey();
  const racha = await db.getRachaHabito(id);
  const total = Object.keys(h.marcas || {}).length;
  const unidad = esSemanal(h) ? ['semana', 'semanas'] : ['día', 'días'];
  return `
    <div class="o-vista o-habitos o-mod-habitos">
      <header class="o-hab-det-cab">
        <button type="button" id="btn-volver-habito" class="o-btn o-btn--secundario o-btn--icono" aria-label="Volver a Hábitos">${ICO_VOLVER}</button>
        <h1 class="o-mod-titulo">${escapeHtml(h.nombre)}</h1>
      </header>
      <ul class="o-chips o-hab-det-chips" aria-label="Configuración del hábito">
        <li class="o-chip">${escapeHtml(labelFrecuencia(h))}</li>
        ${h.meta ? `<li class="o-chip">Meta: <span class="o-num">${escapeHtml(String(h.meta.cantidad))}</span> ${escapeHtml(h.meta.unidad || '')}</li>` : ''}
      </ul>
      <div class="o-hab-panel o-hab-panel--detalle">
        <div class="o-hab-col">
          <div class="o-card o-card--destacada">
            <p class="o-hab-racha-linea">
              <span>${racha.actual > 0
                ? `<span class="o-num">${racha.actual}</span> ${racha.actual === 1 ? `${unidad[0]} seguid${unidad[0] === 'día' ? 'o' : 'a'}` : `${unidad[1]} seguid${unidad[0] === 'día' ? 'os' : 'as'}`} · Mejor: <span class="o-num">${racha.mejor}</span> ${racha.mejor === 1 ? unidad[0] : unidad[1]}`
                : 'Sin racha: márcalo hoy'}</span>
              ${racha.actual > 0 ? ICO_FUEGO : ''}
            </p>
            <div class="o-hab-franja">${renderFranja(h, hoyIso)}</div>
            <p class="o-hab-ayuda">Mantén presionado un día para planificar un descanso o anotar algo.</p>
          </div>
        </div>
        <div class="o-hab-col">
          <p class="o-hab-total">${plural(total, 'día marcado', 'días marcados')} en total.</p>
          <div class="o-hab-det-acciones">
            <button type="button" id="btn-editar-habito-detalle" class="o-btn o-btn--secundario">Editar</button>
            <button type="button" id="btn-eliminar-habito-detalle" class="o-btn o-btn--secundario o-hab-eliminar">Eliminar</button>
          </div>
        </div>
      </div>
      ${renderHabitoForm()}
      ${renderProgresoHoja()}
    </div>`;
}

// --- Vista con pestañas -----------------------------------------------------
async function renderModulo() {
  await cargarDiasSemana();
  const habitos = await db.getHabitos();
  const hoyIso = hoyKey();
  await Promise.all(habitos.map(async (h) => { h._racha = await db.getRachaHabito(h.id); }));

  let panel;
  if (pestana === 'analisis') panel = await renderPanelAnalisis(habitos, hoyIso);
  else if (pestana === 'logros') panel = await renderPanelLogros(habitos);
  else panel = renderPanelHoy(habitos, hoyIso);

  const tocan = habitos.filter(h => esDiaAplicable(h, hoyIso) && !esSemanal(h));
  const hechos = tocan.filter(h => estaCumplido(h, hoyIso)).length;
  const sub = habitos.length === 0 ? 'Empieza con uno pequeño.' : tocan.length ? `${hechos} de ${tocan.length} hoy` : 'Hoy no te toca ninguno';

  return `
    <div class="o-vista o-habitos o-mod-habitos">
      <header class="o-mod-cab">
        <div>
          <h1 class="o-mod-titulo">Hábitos</h1>
          <p class="o-mod-sub">${escapeHtml(sub)}</p>
        </div>
        <button type="button" id="btn-new-habito" class="o-btn o-btn--primario o-btn--icono" aria-label="Nuevo hábito">${ICO_MAS}</button>
      </header>
      <div class="o-tabs" role="tablist" aria-label="Secciones de Hábitos">
        ${PESTANAS.map(p => `<button type="button" class="o-tab" role="tab" id="hab-tab-${p.id}" data-tab="${p.id}" aria-selected="${p.id === pestana}" aria-controls="hab-panel" tabindex="${p.id === pestana ? '0' : '-1'}">${p.label}</button>`).join('')}
      </div>
      <section id="hab-panel" role="tabpanel" aria-labelledby="hab-tab-${pestana}">
        ${panel}
      </section>
      ${renderHabitoForm()}
      ${renderProgresoHoja()}
    </div>`;
}

export async function render() {
  if (vista === 'detalle' && habitoDetalleId) return renderDetalle(habitoDetalleId);
  return renderModulo();
}

// --- Gráficos de Análisis (Chart.js diferido) -------------------------------
// Los colores salen de los tokens del módulo, leídos en el propio lienzo
// (Chart.js no entiende var(--x)).
function colorDe(el, token) { return getComputedStyle(el).getPropertyValue(token).trim(); }
function conAlfa(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function paletaDona(el) {
  const base = ['--o-mod', '--o-mod-2', '--o-mod-t'].map(t => colorDe(el, t));
  return (i) => conAlfa(base[i % base.length], [1, 0.6, 0.35][Math.floor(i / base.length) % 3]);
}

async function montarGraficos() {
  if (vista !== 'lista' || pestana !== 'analisis') return;
  const lienzo = document.getElementById('habitos-donut');
  if (lienzo && donaEntradas.length > 0) {
    const color = paletaDona(lienzo);
    const entradas = donaEntradas.map(e => ({ label: e.label, valor: e.valor, color: color(e.i) }));
    document.querySelectorAll('.o-hab-leyenda-punto').forEach(p => { p.style.background = color(Number(p.dataset.color)); });
    renderDonutChart('habitos-donut', entradas, { tooltipLabel: (ctx, e) => `${e.label}: ${e.valor} de 7 días` });
  }
  const canvas = document.getElementById('habitos-tendencia-chart');
  if (!canvas || tendencia.length === 0) return;
  const Chart = await ensureChartJs();
  if (!document.body.contains(canvas)) return;
  const opts = baseChartOptions();
  const color = colorDe(canvas, '--o-mod');
  const texto = colorDe(canvas, '--o-text');
  const texto3 = colorDe(canvas, '--o-text-3');
  const linea = colorDe(canvas, '--o-line');
  const family = colorDe(canvas, '--o-font-num');
  if (tendenciaChart) tendenciaChart.destroy();
  tendenciaChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: tendencia.map((_, i) => (i === tendencia.length - 1 ? 'Esta sem.' : `S-${tendencia.length - 1 - i}`)),
      datasets: [{
        data: tendencia, borderColor: color, backgroundColor: verticalGradient(canvas.getContext('2d'), color, canvas.clientHeight || 180),
        fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: color,
        pointBorderColor: colorDe(canvas, '--o-bg'), pointBorderWidth: 2, pointHoverRadius: 6, borderWidth: 3
      }]
    },
    options: {
      ...opts,
      devicePixelRatio: hdPixelRatio(),
      layout: { padding: { top: 20 } },
      plugins: { ...opts.plugins, tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.parsed.y} % cumplido` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: texto3, font: { size: 10, family } } },
        y: { min: 0, max: 100, grid: { color: linea }, ticks: { color: texto3, font: { size: 10, family }, stepSize: 25, callback: (v) => `${v}%` } }
      }
    },
    plugins: [lineValueLabelsPlugin(texto, '%')]
  });
}

function soltarGraficos() {
  destroyAllDonuts();
  if (tendenciaChart) { tendenciaChart.destroy(); tendenciaChart = null; }
}

// --- Listeners ----------------------------------------------------------------
async function repintar() {
  const root = document.getElementById('view-root');
  const html = await render();
  if (!vistaVigente()) return;
  soltarGraficos();
  root.innerHTML = html;
  mountListeners();
}

async function onSyncActualizado() {
  if (hayModalAbierto()) return; // no pisar una hoja abierta
  await repintar();
}

function onPopStateHabitos(e) {
  if (vista === 'detalle' && (!e.state || !e.state.habitoDetalle)) {
    vista = 'lista';
    habitoDetalleId = null;
    repintar();
  }
}

export function mountListeners() {
  vistaVigente = guardiaVista('habitos');
  if (!syncEnganchado) {
    syncEnganchado = true;
    window.addEventListener('budget-updated', onSyncActualizado);
  }
  if (!popstateEnganchado) {
    popstateEnganchado = true;
    window.addEventListener('popstate', onPopStateHabitos);
  }

  setupHabitoForm(repintar);
  montarHoja('progreso-modal');
  montarGraficos();

  // Pestañas (flechas para moverse entre ellas, como un tablist).
  const tabs = [...document.querySelectorAll('.o-habitos .o-tab')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === pestana) return;
      pestana = tab.dataset.tab;
      repintar().then(() => document.getElementById(`hab-tab-${pestana}`)?.focus({ preventScroll: true }));
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].click();
    });
  });

  const abrirDetalle = (id) => {
    vista = 'detalle'; habitoDetalleId = id;
    history.pushState({ habitoDetalle: true }, '');
    repintar().then(() => window.scrollTo(0, 0));
  };
  const volverALista = () => {
    vista = 'lista'; habitoDetalleId = null;
    // Sacar la entrada que empujó abrirDetalle para no dejar un "atrás" fantasma.
    if (history.state && history.state.habitoDetalle) history.back();
    repintar();
  };

  document.getElementById('btn-new-habito')?.addEventListener('click', () => openHabitoForm());
  document.querySelectorAll('[data-nuevo-habito]').forEach(b => b.addEventListener('click', () => openHabitoForm()));
  document.getElementById('btn-volver-habito')?.addEventListener('click', volverALista);
  document.querySelectorAll('.habito-row').forEach(row => {
    row.addEventListener('click', () => abrirDetalle(row.getAttribute('data-id')));
  });

  // Hoja de progreso: guarda el total del día con registrarProgresoHabito.
  const progForm = document.getElementById('progreso-form');
  bindQuickCaptureForm(progForm, async () => {
    const btn = document.getElementById('btn-save-progreso');
    const id = document.getElementById('progreso-habito-id').value;
    const fecha = document.getElementById('progreso-fecha').value;
    const cantidad = parseFloat(String(document.getElementById('progreso-cantidad').value).replace(',', '.')) || 0;
    btn.disabled = true;
    try {
      await db.registrarProgresoHabito(id, fecha, cantidad);
      await cerrarHoja('progreso-modal');
      await esperarSalidaDeModal('progreso-modal');
      await repintar();
    } catch (err) {
      console.error('Error al registrar el progreso:', err);
      Toast('No se pudo guardar. Inténtalo de nuevo.', 'error');
      btn.disabled = false;
    }
  });

  // Días del detalle: mantener presionado (500 ms) o clic derecho abre la
  // hoja «Día». El clic que sigue al toque largo se descarta.
  let ultimoLargo = 0;
  const abrirDia = (fecha) => { ultimoLargo = Date.now(); abrirHojaDia(fecha, { alGuardar: () => repintar() }); };
  document.querySelectorAll('[data-dia-largo]').forEach(btn => {
    let timer = null;
    const cancelar = () => { clearTimeout(timer); timer = null; };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      cancelar();
      timer = setTimeout(() => { timer = null; abrirDia(btn.getAttribute('data-fecha')); }, 500);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, cancelar));
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (Date.now() - ultimoLargo < 800) return; // en táctil llega junto con el toque largo
      cancelar();
      abrirDia(btn.getAttribute('data-fecha'));
    });
  });
  const descartarClic = (el) => el.getAttribute('aria-disabled') === 'true' || Date.now() - ultimoLargo < 800;

  // Hábitos con cantidad: el toque abre la hoja de progreso.
  document.querySelectorAll('.day-progreso-hoy, .day-progreso').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (descartarClic(btn)) return;
      const habitos = await db.getHabitos();
      const h = habitos.find(x => x.id === btn.getAttribute('data-id'));
      if (h) abrirProgreso(h, btn.getAttribute('data-fecha'));
    });
  });

  // Marcar: optimista (se pinta al instante y después se escribe). Si la
  // escritura no quedó, vuelve atrás y avisa.
  const pintar = (el, marcado) => {
    el.setAttribute('aria-pressed', String(marcado));
    const celda = el.querySelector('.o-hab-celda');
    if (celda) {
      celda.classList.toggle('o-hab-celda--hecha', marcado);
      celda.innerHTML = (celda.querySelector('.o-hab-nota')?.outerHTML || '') + (marcado ? oIcono('check') : '');
    }
  };
  document.querySelectorAll('.day-toggle-hoy, .day-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (descartarClic(btn)) return;
      const id = btn.getAttribute('data-id');
      const fecha = btn.getAttribute('data-fecha');
      const antes = btn.getAttribute('aria-pressed') === 'true';
      pintar(btn, !antes);
      try {
        await db.toggleMarcaHabito(id, fecha);
        // db.js atrapa sus errores de IndexedDB sin rechazar: se relee para
        // confirmar que la marca quedó como se pintó.
        const actual = (await db.getHabitos()).find(x => x.id === id);
        const quedo = !!(actual && actual.marcas && actual.marcas[fecha]);
        if (quedo === antes) throw new Error('La marca no se guardó en IndexedDB');
        await repintar();
      } catch (err) {
        console.error('Error al marcar hábito:', err);
        pintar(btn, antes);
        Toast('No se pudo guardar. Inténtalo de nuevo.', 'error');
      }
    });
  });

  document.getElementById('btn-editar-habito-detalle')?.addEventListener('click', async () => {
    const h = (await db.getHabitos()).find(x => x.id === habitoDetalleId);
    if (h) openHabitoForm(h);
  });

  document.getElementById('btn-eliminar-habito-detalle')?.addEventListener('click', async () => {
    const h = (await db.getHabitos()).find(x => x.id === habitoDetalleId);
    const dias = h ? Object.keys(h.marcas || {}).length : 0;
    const ok = await ConfirmDialog(
      `Eliminar hábito${h ? ' ' + h.nombre : ''}`,
      dias > 0 ? `Se perderá el registro de ${plural(dias, 'día marcado', 'días marcados')}. No se puede deshacer.` : 'No se puede deshacer.',
      { verb: 'Eliminar' }
    );
    if (!ok) return;
    await db.eliminarHabito(habitoDetalleId);
    Toast('Hábito eliminado', 'success');
    volverALista();
  });
}

// Llamado por el router antes de desmontar la vista: si el detalle estaba
// abierto (con su entrada de historial), se suelta esa entrada y la próxima
// entrada a Hábitos parte en la lista.
export function cleanup() {
  window.removeEventListener('popstate', onPopStateHabitos);
  popstateEnganchado = false;
  window.removeEventListener('budget-updated', onSyncActualizado);
  syncEnganchado = false;
  if (vista === 'detalle' && history.state && history.state.habitoDetalle) history.back();
  vista = 'lista';
  habitoDetalleId = null;
  soltarGraficos();
}
