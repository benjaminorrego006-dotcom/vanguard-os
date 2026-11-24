import { db } from '../core/db.js';
import { formatCurrency } from '../utils/currency.js';
import { Toast } from '../utils/states.js';
import { parseQuickGasto, pedirPestanaFinanzas } from './finanzas.js';
import { escapeHtml } from '../utils/escape.js';
import { diaKeyDe, claveDiaDe, conMayuscula, diasEntre, formatFechaCorta, fechaLocalDe, sumarDias } from '../utils/fecha.js';
import { exportAllData, getDiasDesdeUltimoBackup } from '../utils/backup.js';
import { getEstadoSincronizacion } from '../core/sync.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';
import { calcularAtrasadas } from '../utils/atrasadas.js';
import { calcularHoyToca } from '../utils/hoyToca.js';
import { renderTaskForm, setupTaskForm, openTaskForm, abrirDetallePorId } from '../components/task-form.js';
import { renderGastoForm, initGastoForm } from '../components/GastoForm.js';
import { lineaFocoHoy, abrirPantallaFoco } from '../components/foco.js';
import * as Anotaciones from './anotaciones.js';
import { svgEscudo, avisarPrimeraVidaSiCorresponde } from '../components/racha-reactor.js';
import { pedirPestanaHabitos } from './habitos.js';
import { pedirSemana, rangoTexto } from '../components/lab-semana.js';
import { abrirHojaDia } from '../components/dia-hoja.js';
import { oIcono, oMazo, montarMazo, oVacio, oHoja, abrirHoja, cerrarHoja, montarHoja } from '../components/orbita.js';
import { esperarSalidaDeModal } from '../core/history.js';

// Hoy (Órbita, Fase 5; docs/rediseno-total.md § 3). Responde de un vistazo
// cómo voy (la órbita: 4 anillos y el puntaje del día), qué hago ahora (el
// mazo de misiones) y qué viene (la franja que abre la agenda). Todo se
// deriva en memoria de db.js en cada render: nada de lo que se muestra
// aquí se guarda aparte.

// Si la fila "N atrasadas" está desplegada; vive acá (no en el DOM) para
// sobrevivir a los repintados de la agenda.
let atrasadasAbierta = false;
// Misiones de la agenda que se pasaron con «Después» en esta sesión: van al
// final del mazo. Es solo orden de pantalla (no un dato), así que vive en
// memoria y se olvida al recargar.
const pospuestas = new Set();
// Presupuesto del último render, para el formulario de gasto (GastoForm).
let presupuestoActual = null;
// Hábitos con cantidad del último render (id → datos para la hoja de progreso).
let habitosConMeta = new Map();
// Misión contextual del último render (su semana o su día de vida extra).
let misionCtx = null;

// Repinta Hoy en el lugar, sin navegar: conserva el scroll y deja abiertas
// las hojas de Órbita que lo estaban (la agenda o la de hábitos), sin
// volver a animar su entrada. history.js las sigue cerrando por id.
async function repintar() {
  const root = document.getElementById('view-root');
  if (!root || !window.appRouter || window.appRouter.currentView !== 'dashboard') return;
  const abiertas = [...root.querySelectorAll('.modal-overlay.o-ui.open')].map(el => ({
    id: el.id, scroll: el.querySelector('.o-hoja')?.scrollTop || 0
  }));
  const scroll = root.scrollTop;
  const html = await render();
  if (window.appRouter.currentView !== 'dashboard') return;
  root.innerHTML = html;
  for (const { id, scroll: s } of abiertas) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.add('open', 'o-sin-entrada');
    el.style.display = 'flex';
    const hoja = el.querySelector('.o-hoja');
    if (hoja) hoja.scrollTop = s;
  }
  mountListeners();
  root.scrollTop = scroll;
}

// Mismo criterio que los helpers de db.js (días de la semana con getDay()
// local; con meta numérica, "cumplido" es llegar a la cantidad).
function tocaHoy(h) {
  const f = h.frecuencia || { tipo: 'diario' };
  return !(f.tipo === 'dias' && !(f.dias || []).includes((new Date().getDay() + 6) % 7));
}
function cumplidoHoy(h, hoyIso) {
  const v = h.marcas && h.marcas[hoyIso];
  if (h.meta && h.meta.cantidad) return Number(v) >= Number(h.meta.cantidad);
  return !!v;
}
function datosMeta(h, hoyIso) {
  const meta = Number(h.meta.cantidad);
  const actual = Number(h.marcas && h.marcas[hoyIso]) || 0;
  const unidad = h.meta.unidad ? String(h.meta.unidad) : '';
  return { id: h.id, nombre: h.nombre, actual, meta, unidad };
}

// El evento beforeinstallprompt lo captura index.html apenas carga la
// página (antes de que este módulo exista) y lo guarda en
// window.__vgInstall.deferredPrompt — acá solo lo leemos. Si el usuario ya
// lo descartó, no insistimos por 30 días (timestamp en localStorage: es
// solo una preferencia de UI, no dato de la app, así que no hace falta que
// viva en IndexedDB como el resto de la data).
const INSTALL_DISMISS_KEY = 'vg-install-dismissed-at';
const INSTALL_DISMISS_DIAS = 30;

function debeMostrarBannerInstalar() {
  if (!window.__vgInstall || !window.__vgInstall.deferredPrompt) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  try {
    const dismissedAt = localStorage.getItem(INSTALL_DISMISS_KEY);
    if (dismissedAt) {
      const diasDesde = diasEntre(diaKeyDe(new Date(Number(dismissedAt))), diaKeyDe(new Date()));
      if (diasDesde < INSTALL_DISMISS_DIAS) return false;
    }
  } catch (e) { /* localStorage puede fallar en modo privado — no bloquear el banner por eso */ }
  return true;
}

// beforeinstallprompt puede llegar recién unos segundos después de que
// Inicio ya está montada — si el usuario sigue ahí cuando eso pasa,
// re-renderizamos para que el banner aparezca sin que tenga que navegar.
// Este listener se registra una sola vez: dashboard.js es un módulo
// singleton (el mismo Blob URL cacheado se reusa en cada navegación a
// Inicio — ver loadModuleGraph en app.js), así que el top-level de este
// archivo corre una sola vez por sesión y no hace falta sacarlo en un
// cleanup.
window.addEventListener('vg-install-available', () => {
  if (window.appRouter && window.appRouter.currentView === 'dashboard') {
    window.appRouter.navigate('dashboard');
  }
});

// Orbe del dock estando en Hoy (app.js): abre la hoja de captura rápida.
// Mismo motivo que el de arriba para registrarlo una sola vez.
window.addEventListener('vg-orbe-hoy', () => {
  if (document.getElementById('hoy-captura')) abrirHoja('hoy-captura');
});

// Todo IndexedDB, sin backend: si Chrome libera espacio, el usuario borra
// datos de navegación o cambia de teléfono, se pierde todo. exportAllData()
// hoy vivía escondida en Ajustes de Finanzas — este aviso la trae a Inicio,
// que es lo primero que se ve, en vez de depender de que alguien entre por
// su cuenta a esa pantalla. "Después" lo oculta hasta mañana (no para
// siempre): la fecha (diaKeyDe) queda en localStorage porque es una
// preferencia de UI, no dato de la app.
const BACKUP_AVISO_DIAS = 14;

function backupNecesitaAviso(diasDesdeBackup) {
  return diasDesdeBackup === null || diasDesdeBackup > BACKUP_AVISO_DIAS;
}

// "Después" de la misión contextual (ritual / respaldo / hoy toca…): guarda
// el día en que se ocultó; vuelve a aparecer mañana.
const OCULTA_PREFIX = 'vg-ctx-oculta-';

function ocultaHoy(tipo) {
  try { return localStorage.getItem(OCULTA_PREFIX + tipo) === diaKeyDe(new Date()); }
  catch (e) { return false; /* modo privado — mostrar la tarjeta igual */ }
}

function ocultarHoy(tipo) {
  try { localStorage.setItem(OCULTA_PREFIX + tipo, diaKeyDe(new Date())); }
  catch (e) { /* modo privado */ }
}

// Aviso de vida extra usada: guarda la clave del día protegido que ya se
// vio ("Entendido"). Preferencia de UI → localStorage.
const VIDA_USADA_VISTA = 'vg-vida-extra-usada-vista';
function vidaUsadaVista() {
  try { return localStorage.getItem(VIDA_USADA_VISTA); } catch (e) { return null; }
}
function marcarVidaUsadaVista(clave) {
  try { localStorage.setItem(VIDA_USADA_VISTA, clave); } catch (e) { /* modo privado */ }
}

function saludoPorHora() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Misión contextual: una sola, con prioridad Ritual pendiente (solo antes
// de las 12:00) > "Tu semana" (lunes y martes) > aviso de respaldo > vida
// extra usada (ayer o anteayer) > avances de nivel listos > "Hoy toca" de
// Entreno. "Después" la oculta hasta mañana (ver ocultarHoy) y deja pasar a
// la siguiente; en "Tu semana", la oculta para esa semana. Devuelve los
// datos de la misión (texto plano: oMision escapa) o null.
async function misionContextual({ hayDatosReales, diasDesdeBackup, sincronizadoReciente, sesiones, rachaGlobal }) {
  const hoy = diaKeyDe(new Date());
  const mision = (datos) => ({ id: `ctx:${datos.tipo}`, ...datos });

  if (new Date().getHours() < 12 && !ocultaHoy('ritual')) {
    const p = await db.getProgresoRitual(hoy);
    if (!p.completo) {
      return mision({
        tipo: 'ritual', modulo: 'plan', etiqueta: 'Ritual de hoy',
        titulo: 'Tu ritual está pendiente',
        detalle: `${p.hechos} de ${p.total} campos completados. Empieza el día con intención.`,
        hecho: 'Hacer ritual'
      });
    }
  }

  // Revisión semanal: lunes y martes, la semana recién terminada (si tuvo
  // datos y no se vio ni descartó ya, en este u otro dispositivo).
  const dow = (new Date().getDay() + 6) % 7; // 0 = lunes
  if (dow <= 1) {
    const lunesPasado = sumarDias(hoy, -dow - 7);
    const revisadas = await db.getSemanasRevisadas();
    if (!revisadas.includes(lunesPasado)) {
      const s = await db.getResumenSemana(lunesPasado);
      const conDatos = s.general.diasActivos > 0 || s.finanzas.gastoTotal > 0 || s.tareas.creadas > 0 || s.general.diasRitual > 0;
      if (conDatos) {
        const obs = s.observaciones && s.observaciones[0];
        const resumen = `${s.entreno.sesiones} ${s.entreno.sesiones === 1 ? 'entreno' : 'entrenos'} · ${formatCurrency(s.finanzas.gastoTotal)} gastado · ${s.tareas.completadas} ${s.tareas.completadas === 1 ? 'tarea' : 'tareas'}`;
        return mision({
          tipo: 'semana', modulo: 'hoy', etiqueta: 'Revisión semanal',
          titulo: `Tu semana · ${rangoTexto(s.lunes, s.domingo)}`,
          detalle: obs ? obs.texto : resumen,
          hecho: 'Ver', semana: s.lunes
        });
      }
    }
  }

  // Con sesión iniciada y una sync correcta hace menos de 7 días los datos
  // ya tienen copia en la nube: no hace falta el aviso de respaldo.
  if (hayDatosReales && !sincronizadoReciente && backupNecesitaAviso(diasDesdeBackup) && !ocultaHoy('backup')) {
    return mision({
      tipo: 'backup', etiqueta: 'Respaldo',
      titulo: diasDesdeBackup === null ? 'Nunca has exportado un respaldo' : `Hace ${diasDesdeBackup} días sin respaldo`,
      detalle: 'Tus datos viven solo en este dispositivo. Sin respaldo, se pierden si borras la app o cambias de equipo.',
      hecho: 'Exportar'
    });
  }

  // Vida extra usada ayer o anteayer, con la racha todavía viva (el día
  // protegido sigue dentro de la racha en curso). "Entendido" la oculta
  // para siempre para ESE día protegido (vidaUsadaVista); "Después", solo
  // hasta mañana como las demás.
  const usada = rachaGlobal && rachaGlobal.ultimaVidaUsada;
  if (usada && rachaGlobal.actual > 0 && (rachaGlobal.diasProtegidos || []).includes(usada)
      && (usada === sumarDias(hoy, -1) || usada === sumarDias(hoy, -2))
      && vidaUsadaVista() !== usada && !ocultaHoy('vida')) {
    const f = fechaLocalDe(usada);
    const dia = `${f.toLocaleDateString('es-CL', { weekday: 'long' })} ${f.getDate()}`;
    return mision({
      tipo: 'vida', modulo: 'habitos', etiqueta: 'Vida extra',
      titulo: 'Tu racha se salvó',
      detalle: `Usaste una vida extra el ${dia} y tu racha sigue en ${rachaGlobal.actual}. ${rachaGlobal.vidas > 0 ? `Te ${rachaGlobal.vidas === 1 ? 'queda 1 vida' : `quedan ${rachaGlobal.vidas} vidas`}.` : 'Registra algo hoy para no cortarla.'}`,
      hecho: 'Entendido', vida: usada
    });
  }

  // Avances de nivel listos en Entreno (detectarSugerencias). Se importa
  // bajo demanda: arrastra el catálogo de ejercicios, que Inicio no necesita
  // para nada más.
  if (!ocultaHoy('avances')) {
    try {
      const { detectarSugerencias } = await window.appRouter.importar('js/core/sugerencias-nivel.js');
      const avances = await detectarSugerencias();
      if (avances.length > 0) {
        const n = avances.length;
        const primero = avances[0];
        return mision({
          tipo: 'avances', modulo: 'entreno', etiqueta: 'Entreno',
          titulo: `${n} ${n === 1 ? 'avance listo' : 'avances listos'} en Entreno`,
          detalle: `${primero.ramaLabel}: ${primero.ejercicioActual.nombre} → ${primero.ejercicioSiguiente.nombre}${n > 1 ? ` y ${n - 1} más` : ''}`,
          hecho: 'Ver avances'
        });
      }
    } catch (err) {
      console.error('No se pudieron calcular los avances de nivel:', err);
    }
  }

  if (!ocultaHoy('hoytoca')) {
    const rutina = await calcularHoyToca(sesiones);
    if (rutina) {
      const catNames = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };
      return mision({
        tipo: 'hoytoca', modulo: 'entreno', etiqueta: 'Hoy toca',
        titulo: rutina.nombre,
        detalle: catNames[rutina.categoria] || rutina.categoria,
        hecho: 'Ir a entrenar'
      });
    }
  }

  return null;
}

// --- Órbita: 4 anillos concéntricos (de afuera hacia adentro: Hábitos,
// Tareas, Entreno y Presupuesto) con el puntaje del día al centro. Cada
// anillo toma los colores de su módulo (.o-mod-* en su grupo). Sin meta
// para hoy (ej. sin hábitos que toquen), queda solo la pista.
const ANILLOS = [
  { clave: 'habitos', modulo: 'habitos', r: 132 },
  { clave: 'tareas', modulo: 'plan', r: 112 },
  { clave: 'entreno', modulo: 'entreno', r: 92 },
  { clave: 'finanzas', modulo: 'finanzas', r: 72 }
];
const GROSOR_ANILLO = 14; // unidades del viewBox (290): --o-ring-w a tamaño real

function renderOrbita(anillos, puntaje) {
  const grupos = ANILLOS.map(({ clave, modulo, r }) => {
    const pct = anillos[clave].pct;
    const arco = pct > 0
      ? `<circle class="o-orbita-arco" cx="145" cy="145" r="${r}" fill="none" stroke="url(#o-orbita-${clave})" stroke-width="${GROSOR_ANILLO}" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct.toFixed(2)} 100"></circle>`
      : '';
    return `
      <g class="o-mod-${modulo}">
        <linearGradient id="o-orbita-${clave}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color: var(--o-mod)"></stop><stop offset="1" style="stop-color: var(--o-mod-2)"></stop></linearGradient>
        <circle class="o-orbita-pista" cx="145" cy="145" r="${r}" fill="none" stroke-width="${GROSOR_ANILLO}"></circle>
        ${arco}
      </g>`;
  }).join('');
  const etiqueta = puntaje === null
    ? 'Todavía no hay metas para hoy. Ver tu semana en Laboratorio'
    : `Puntaje del día: ${puntaje}. Ver tu semana en Laboratorio`;
  return `
    <button type="button" id="hoy-orbita" class="o-orbita" aria-label="${etiqueta}">
      <svg viewBox="0 0 290 290" aria-hidden="true" focusable="false">${grupos}</svg>
      <span class="o-orbita-centro" aria-hidden="true">
        <span class="o-orbita-puntaje">${puntaje === null ? '—' : puntaje}</span>
        <span class="o-rotulo">Día</span>
      </span>
    </button>`;
}

function chipAnillo({ id, modulo, nombre, valor, etiqueta }) {
  return `<button type="button" id="${id}" class="o-chip o-mod-${modulo}" aria-label="${escapeHtml(etiqueta)}"><span class="o-chip-punto"></span>${nombre}<span class="o-chip-num">${valor}</span></button>`;
}

// --- Agenda del día: tareas y Semana con fecha de hoy + hábitos que tocan
// y no están cumplidos, y las atrasadas (plegables, con «Mover a hoy»).
function renderAgenda({ items, atrasadas, hoyIso }) {
  if (atrasadas.length === 0) atrasadasAbierta = false;
  const fila = (it) => it.tipo === 'habito-num' ? `
      <li class="o-fila o-mod-habitos">
        <span class="o-fila-texto"><b>${escapeHtml(it.texto)}</b><small>Hábito · ${it.actual}/${it.meta}${it.unidad ? ' ' + escapeHtml(it.unidad) : ''}</small></span>
        <button type="button" class="o-btn o-btn--secundario o-agenda-sumar agenda-check" data-tipo="habito-num" data-id="${escapeHtml(it.id)}" aria-label="Registrar progreso de ${escapeHtml(it.texto)}">Sumar</button>
      </li>` : `
      <li class="o-fila o-mod-${it.tipo === 'habito' ? 'habitos' : 'plan'}">
        <button type="button" class="o-check agenda-check" aria-pressed="false" data-tipo="${it.tipo}" data-id="${escapeHtml(it.id)}" data-nombre="${escapeHtml(it.texto)}" aria-label="Marcar ${escapeHtml(it.texto)}">${oIcono('check')}</button>
        <span class="o-fila-texto"><b>${escapeHtml(it.texto)}</b><small>${it.etiqueta}</small></span>
      </li>`;

  // Atrasadas de Tareas y de Semana (fecha anterior a hoy, comparada como texto YYYY-MM-DD
  // local — diaKeyDe, nunca toISOString). Los días se cuentan con diasEntre.
  const haceTexto = (n) => (n === 1 ? 'ayer' : `hace ${n} días`);
  const filaAtrasada = (t) => `
      <li class="o-fila o-agenda-atrasada o-mod-plan">
        <button type="button" class="o-check agenda-check" aria-pressed="false" data-tipo="${t.tipo}" data-id="${escapeHtml(t.id)}" data-nombre="${escapeHtml(t.texto)}" aria-label="Marcar ${escapeHtml(t.texto)}">${oIcono('check')}</button>
        <span class="o-fila-texto"><b>${escapeHtml(t.texto)}</b><small>${t.tipo === 'plan' ? 'Semana · ' : ''}${haceTexto(diasEntre(t.fecha, hoyIso))}</small></span>
        <button type="button" class="o-btn o-btn--secundario o-agenda-mover agenda-mover" data-tipo="${t.tipo}" data-id="${escapeHtml(t.id)}">Mover a hoy</button>
      </li>`;
  const atrasadasHtml = atrasadas.length === 0 ? '' : `
      <div class="o-agenda-seccion">
        <button type="button" id="hoy-atrasadas-toggle" class="o-btn o-btn--secundario o-btn--bloque o-agenda-toggle" aria-expanded="${atrasadasAbierta}" aria-controls="hoy-atrasadas-lista">
          ${oIcono('alerta')}${atrasadas.length} ${atrasadas.length === 1 ? 'atrasada' : 'atrasadas'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <ul id="hoy-atrasadas-lista" class="o-lista" ${atrasadasAbierta ? '' : 'hidden'}>${atrasadas.map(filaAtrasada).join('')}</ul>
      </div>`;

  return `
      <div id="hoy-agenda" class="o-agenda-seccion">
        ${atrasadasHtml}
        ${items.length
          ? `<ul class="o-lista">${items.map(fila).join('')}</ul>`
          : oVacio({ icono: 'check', titulo: 'Nada pendiente hoy', texto: 'Lo que tenga fecha de hoy aparece aquí.' })}
      </div>`;
}

// Hábitos que tocan hoy, marcados o no: la hoja de la acción rápida «Hábito».
function renderHabitosHoy(habitosHoy, hoyIso) {
  if (habitosHoy.length === 0) {
    return oVacio({ icono: 'check', titulo: 'No tienes hábitos para hoy', texto: 'Créalos en Hábitos; los que tocan hoy aparecen aquí.' });
  }
  return `<ul class="o-lista o-mod-habitos">${habitosHoy.map(h => {
    const hecho = cumplidoHoy(h, hoyIso);
    if (h.meta && h.meta.cantidad) {
      const d = datosMeta(h, hoyIso);
      return `
        <li class="o-fila${hecho ? ' o-fila--hecha' : ''}">
          <span class="o-fila-texto"><b>${escapeHtml(h.nombre)}</b><small>${d.actual}/${d.meta}${d.unidad ? ' ' + escapeHtml(d.unidad) : ''}${hecho ? ' · meta cumplida' : ''}</small></span>
          <button type="button" class="o-btn o-btn--secundario o-agenda-sumar agenda-check" data-tipo="habito-num" data-id="${escapeHtml(h.id)}" aria-label="Registrar progreso de ${escapeHtml(h.nombre)}">Sumar</button>
        </li>`;
    }
    return `
        <li class="o-fila${hecho ? ' o-fila--hecha' : ''}">
          <button type="button" class="o-check agenda-check" aria-pressed="${hecho}" data-tipo="habito" data-id="${escapeHtml(h.id)}" data-nombre="${escapeHtml(h.nombre)}" aria-label="${hecho ? 'Desmarcar' : 'Marcar'} ${escapeHtml(h.nombre)}">${oIcono('check')}</button>
          <span class="o-fila-texto"><b>${escapeHtml(h.nombre)}</b><small>${hecho ? 'Hecho hoy' : 'Pendiente'}</small></span>
        </li>`;
  }).join('')}</ul>`;
}

const ICONOS_ACCION = {
  gasto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.4 4.5 3.2-2 3-4.5 3-4.5-1.3-4.5-3"></path></svg>',
  tarea: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"></path></svg>',
  entreno: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"></path></svg>',
  habito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"></path></svg>',
  nota: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"></path><path d="M14 4v6h6"></path></svg>'
};
function accionRapida(id, modulo, etiqueta, icono, extra = '') {
  return `<button type="button" id="${id}" class="o-accion o-mod-${modulo}" ${extra}><span class="o-accion-ico">${ICONOS_ACCION[icono]}</span>${etiqueta}</button>`;
}

export async function render() {
  const hoyIso = diaKeyDe(new Date());
  // getBudget procesa las recurrentes que vencieron; la proyección se pide
  // DESPUÉS (encadenada, no en paralelo) para que no avise de una que se
  // acaba de generar con el estado anterior al procesamiento.
  const presupuesto = db.getBudget();
  const budgetYProyeccion = presupuesto.then(async b => [b, await db.getProyeccionRecurrentes()]);
  // La racha (y con ella las vidas y la misión contextual) se lee DESPUÉS
  // de procesar las recurrentes: un cobro que vence hoy es actividad de hoy,
  // y leída en paralelo Hoy mostraba la racha anterior (86 en vez de 87)
  // hasta el siguiente render. El resto de las lecturas sigue en paralelo.
  const rachaTrasRecurrentes = presupuesto.then(() => db.getRachaGlobal());
  // Gastos anuales: después de getBudget (que ajusta el presupuesto del mes).
  const anualesTrasPresupuesto = presupuesto.then(() => db.getEstadoGastosAnuales());
  const [[budget, alertasCaja], sesiones, rachaGlobal, habitos, tareas, notas, diasDesdeBackup, plan, perfil, estadoSync, diaHoy, estadoAnuales] = await Promise.all([
    budgetYProyeccion,
    db.getSesiones(),
    rachaTrasRecurrentes,
    db.getHabitos(),
    db.getTasks(),
    db.getNotas(),
    getDiasDesdeUltimoBackup(),
    db.getTareasPlan(),
    db.getProfile(),
    getEstadoSincronizacion(),
    db.getDia(hoyIso),
    anualesTrasPresupuesto
  ]);
  presupuestoActual = budget;

  // --- Anillos y puntaje (decisión 7.1: promedio de los anillos con meta
  // hoy, calculado en memoria y nunca guardado). ---
  const habitosHoy = habitos.filter(tocaHoy);
  const tareasDeHoy = tareas.filter(t => t.dueDate === hoyIso);
  const planDeHoy = plan.filter(t => t.fecha === hoyIso);
  const entrenoHecho = sesiones.some(s => claveDiaDe(s.fecha) === hoyIso);
  const descanso = !!(diaHoy && diaHoy.descanso);
  const anillo = (hechos, total) => ({ hechos, total, pct: total > 0 ? Math.min(100, (hechos / total) * 100) : null });
  // Presupuesto (decisión 7.4): disponible del mes sobre lo que entró este
  // mes, sin el arrastre de los sobres. Lleno es «vas bien».
  const pctFin = budget.income > 0 ? Math.max(0, Math.min(100, (budget.remaining / budget.income) * 100)) : null;
  const anillos = {
    habitos: anillo(habitosHoy.filter(h => cumplidoHoy(h, hoyIso)).length, habitosHoy.length),
    tareas: anillo(tareasDeHoy.filter(t => t.status === 'done').length + planDeHoy.filter(t => t.hecha).length, tareasDeHoy.length + planDeHoy.length),
    // Un día de descanso planificado no pide entreno (si igual entrenaste, cuenta).
    entreno: descanso && !entrenoHecho ? anillo(0, 0) : anillo(entrenoHecho ? 1 : 0, 1),
    finanzas: { pct: pctFin }
  };
  const conMeta = Object.values(anillos).filter(a => a.pct !== null);
  const puntaje = conMeta.length ? Math.round(conMeta.reduce((s, a) => s + a.pct, 0) / conMeta.length) : null;
  const fraccion = (a) => (a.pct === null ? '—' : `${a.hechos}/${a.total}`);
  const pctFinTexto = pctFin === null ? '—' : `${Math.round(pctFin)}%`;

  // --- Agenda pendiente (misiones + hoja) ---
  const habitosPend = habitosHoy.filter(h => !cumplidoHoy(h, hoyIso));
  habitosConMeta = new Map(habitos.filter(h => h.meta && h.meta.cantidad).map(h => [h.id, datosMeta(h, hoyIso)]));
  const items = [
    ...tareasDeHoy.filter(t => t.status !== 'done').map(t => ({ tipo: 'tarea', id: t.id, texto: t.title, etiqueta: 'Tarea' })),
    ...planDeHoy.filter(t => !t.hecha).map(t => ({ tipo: 'plan', id: t.id, texto: t.texto, etiqueta: 'Semana' })),
    // Hábito con meta numérica ('habito-num'): no se cumple con un toque, se
    // abre la hoja de progreso y se muestra lo avanzado (ej. 5/20 min).
    ...habitosPend.map(h => (h.meta && h.meta.cantidad)
      ? { tipo: 'habito-num', ...datosMeta(h, hoyIso), texto: h.nombre }
      : { tipo: 'habito', id: h.id, texto: h.nombre, etiqueta: 'Hábito' })
  ];
  // Mismo cálculo que la tira de Semana (utils/atrasadas.js).
  const atrasadas = calcularAtrasadas({ tareas, plan, hoyIso });

  // Sin esto, alguien que recién instaló la app y todavía no cargó nada
  // ve el aviso de respaldo cuando no hay nada real que respaldar.
  const hayDatosReales = sesiones.length > 0 || habitos.length > 0 || tareas.length > 0 || budget.breakdown.length > 0;
  const sincronizadoReciente = estadoSync.conSesion && estadoSync.ultimaSyncTs !== null
    && diasEntre(diaKeyDe(new Date(estadoSync.ultimaSyncTs)), hoyIso) < 7;
  const ctx = await misionContextual({ hayDatosReales, diasDesdeBackup, sincronizadoReciente, sesiones, rachaGlobal });
  misionCtx = ctx;
  avisarPrimeraVidaSiCorresponde(rachaGlobal);

  // Mazo: la misión contextual primero, después la agenda; las pasadas con
  // «Después» al final, en el orden en que se pasaron.
  const deAgenda = items.map(it => {
    const id = `${it.tipo === 'habito-num' ? 'habito' : it.tipo}:${it.id}`;
    const esHabito = it.tipo === 'habito' || it.tipo === 'habito-num';
    return {
      id, modulo: esHabito ? 'habitos' : 'plan', etiqueta: esHabito ? 'Hábito' : it.etiqueta,
      titulo: it.texto,
      detalle: it.tipo === 'habito-num' ? `Llevas ${it.actual}/${it.meta}${it.unidad ? ' ' + it.unidad : ''}` : '',
      pista: `Cierra el anillo de ${esHabito ? 'Hábitos' : 'Tareas'}`,
      hecho: it.tipo === 'habito-num' ? 'Sumar' : 'Hecho',
      accion: it.tipo === 'habito-num' ? 'sumar' : 'hecho'
    };
  });
  const orden = [...pospuestas];
  deAgenda.sort((a, b) => (orden.includes(a.id) ? orden.indexOf(a.id) + 1 : 0) - (orden.includes(b.id) ? orden.indexOf(b.id) + 1 : 0));
  const misiones = [...(ctx ? [ctx] : []), ...deAgenda];
  if (misiones.length) misiones[0] = { ...misiones[0], rotulo: `${misiones[0].etiqueta} · 1 de ${misiones.length}` };
  const mazoHtml = oMazo(misiones, {
    vacio: `<div class="o-card">${oVacio({ icono: 'check', titulo: 'Misiones del día completas', texto: 'No queda nada pendiente para hoy.' })}</div>`
  });

  // --- Alertas reales (rojo con ícono y texto; ámbar si todavía hay margen) ---
  let alertasHtml = '';
  if (alertasCaja && alertasCaja.length > 0) {
    // Un cobro de los próximos 7 días que no alcanza. Una línea por cobro,
    // máximo 3, bajo un solo título. Toda la tarjeta lleva a Finanzas (no
    // hay ruta a un sobre puntual).
    const visibles = alertasCaja.slice(0, 3);
    const extra = alertasCaja.length - visibles.length;
    alertasHtml += `
      <button id="alerta-caja" type="button" class="o-alerta" aria-label="${alertasCaja.length === 1 ? 'Un cobro' : `${alertasCaja.length} cobros`} de los próximos 7 días sin saldo suficiente. Ver Finanzas">
        <span class="o-alerta-ico" aria-hidden="true">${oIcono('alerta')}</span>
        <span class="o-alerta-cuerpo">
          <span class="o-alerta-titulo">Cobros sin saldo · 7 días</span>
          ${visibles.map(a => `<span class="o-alerta-linea">El ${formatFechaCorta(fechaLocalDe(a.date))}, <b>${escapeHtml(a.name)}</b> (${formatCurrency(a.amount)}) excederá el saldo de <b>${escapeHtml(a.envelopeName)}</b>. Faltan ${formatCurrency(a.shortfall)}.</span>`).join('')}
          ${extra > 0 ? `<span class="o-alerta-linea">y ${extra} más en Finanzas</span>` : ''}
        </span>
      </button>`;
  }
  // Gastos anuales por vencer (B3): un solo aviso agrupado desde 30 días
  // antes si el sobre no alcanza. Ámbar; rojo (alerta real) si alguno vence
  // en 7 días o menos sin alcanzar. Lleva a Finanzas › Recurrentes.
  const avisosAnuales = estadoAnuales.avisos;
  if (avisosAnuales.length > 0) {
    const rojo = avisosAnuales.some(a => a.rojo);
    const visibles = avisosAnuales.slice(0, 3);
    const extra = avisosAnuales.length - visibles.length;
    const cuando = (a) => (a.dias === 0 ? 'Hoy' : a.dias === 1 ? 'Mañana' : `En ${a.dias} días`);
    alertasHtml += `
      <button id="alerta-anual" type="button" class="o-alerta${rojo ? '' : ' o-alerta--aviso'}" aria-label="${avisosAnuales.length === 1 ? 'Un gasto anual' : `${avisosAnuales.length} gastos anuales`} por vencer sin saldo suficiente. Ver Finanzas">
        <span class="o-alerta-ico" aria-hidden="true">${oIcono('alerta')}</span>
        <span class="o-alerta-cuerpo">
          <span class="o-alerta-titulo">Gastos anuales por vencer</span>
          ${visibles.map(a => `<span class="o-alerta-linea${a.rojo ? ' o-alerta-linea--alerta' : ''}">${cuando(a)} (${formatFechaCorta(fechaLocalDe(a.vence))}) vence <b>${escapeHtml(a.nombre)}</b> (${formatCurrency(a.monto)}). Faltan ${formatCurrency(a.falta)} en su sobre.</span>`).join('')}
          ${extra > 0 ? `<span class="o-alerta-linea">y ${extra} más en Finanzas</span>` : ''}
        </span>
      </button>`;
  }

  const installBannerHtml = debeMostrarBannerInstalar() ? `
    <div id="install-banner" class="o-card o-instalar o-mod-entreno">
      <span class="o-fila-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></span>
      <span class="o-fila-texto"><b>Instalar Vanguard en tu teléfono</b><small>Acceso directo desde tu pantalla de inicio.</small></span>
      <button id="btn-install-app" type="button" class="o-btn o-btn--secundario">Instalar</button>
      <button id="btn-dismiss-install" type="button" class="o-btn o-btn--fantasma o-btn--icono" aria-label="Cerrar">${oIcono('cerrar')}</button>
    </div>` : '';

  // --- Franja «Agenda del día» ---
  const pendientes = items.length;
  const siguiente = items[0];
  const franjaHtml = `
    <button type="button" id="hoy-franja" class="o-franja" aria-haspopup="dialog" aria-controls="hoy-agenda-hoja">
      <span class="o-franja-texto">
        <span class="o-rotulo">Agenda del día · ${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}</span>
        <b>${siguiente ? `Siguiente: ${escapeHtml(siguiente.texto)}` : 'Nada pendiente hoy'}</b>
        ${atrasadas.length ? `<span class="o-franja-atrasadas">${oIcono('alerta')}${atrasadas.length} ${atrasadas.length === 1 ? 'atrasada' : 'atrasadas'}</span>` : ''}
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>`;

  const nombre = (perfil?.nombre || '').trim();
  const fechaLarga = conMayuscula(new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }));
  const ultimaNota = notas[0] || null;
  const vidas = rachaGlobal.vidas;

  return `
    <div class="o-vista o-hoy">
      <div class="o-hoy-grid">

        <header class="o-hoy-cab">
          <div class="o-hoy-cab-fila">
            <div>
              <h1 class="o-hoy-saludo">${saludoPorHora()}${nombre ? `, ${escapeHtml(nombre)}` : ''}</h1>
              <p class="o-hoy-fecha">${escapeHtml(fechaLarga)}</p>
            </div>
            <div class="o-hoy-cab-chips">
              <!-- Hoja "Día": descanso planificado y nota de hoy. -->
              <button type="button" id="btn-dia-hoy" class="o-chip${descanso ? ' o-dia--descanso' : ''}" aria-label="Día de hoy: descanso planificado y nota${descanso ? ' (hoy es de descanso)' : ''}${diaHoy && diaHoy.nota ? ' (con nota)' : ''}">${descanso ? 'Descanso' : 'Día'}${diaHoy && diaHoy.nota ? '<span class="o-dia-punto" aria-hidden="true"></span>' : ''}</button>
              <button type="button" id="chip-racha" class="o-chip" aria-label="Racha de ${rachaGlobal.actual} ${rachaGlobal.actual === 1 ? 'día' : 'días'}, ${vidas} ${vidas === 1 ? 'vida extra' : 'vidas extra'}. Ver logros de Hábitos">
                <span aria-hidden="true">🔥</span><span class="o-num">${rachaGlobal.actual}</span>
                <span class="chip-vidas${vidas > 0 ? '' : ' chip-vidas--vacio'}" aria-hidden="true">${svgEscudo({ lleno: vidas > 0, size: 14 })}<span class="o-num">${vidas}</span></span>
              </button>
            </div>
          </div>
          ${lineaFocoHoy()}
        </header>

        <section class="o-hoy-orbita o-hoy-col" aria-label="Cómo vas hoy">
          ${renderOrbita(anillos, puntaje)}
          <div class="o-orbita-chips">
            ${chipAnillo({ id: 'chip-habitos', modulo: 'habitos', nombre: 'Hábitos', valor: fraccion(anillos.habitos), etiqueta: `Hábitos: ${anillos.habitos.pct === null ? 'ninguno toca hoy' : `${anillos.habitos.hechos} de ${anillos.habitos.total}`}. Abrir Hábitos` })}
            ${chipAnillo({ id: 'chip-tareas', modulo: 'plan', nombre: 'Tareas', valor: fraccion(anillos.tareas), etiqueta: `Tareas de hoy: ${anillos.tareas.pct === null ? 'ninguna' : `${anillos.tareas.hechos} de ${anillos.tareas.total}`}. Abrir Plan` })}
            ${chipAnillo({ id: 'chip-entreno', modulo: 'entreno', nombre: 'Entreno', valor: fraccion(anillos.entreno), etiqueta: `Entreno: ${anillos.entreno.pct === null ? 'día de descanso' : entrenoHecho ? 'hecho hoy' : 'pendiente hoy'}. Abrir Entreno` })}
            ${chipAnillo({ id: 'chip-finanzas', modulo: 'finanzas', nombre: 'Presupuesto', valor: pctFinTexto, etiqueta: `Disponible del mes: ${formatCurrency(budget.remaining)}${pctFin === null ? '' : `, ${Math.round(pctFin)} % de lo que entró`}. Abrir Finanzas` })}
          </div>
        </section>

        <section class="o-hoy-centro o-hoy-col" aria-label="Qué hacer ahora">
          <div id="hoy-mazo">${mazoHtml}</div>
          <div class="o-acciones" role="group" aria-label="Acciones rápidas">
            ${accionRapida('qa-gasto', 'finanzas', 'Gasto', 'gasto')}
            ${accionRapida('qa-tarea', 'plan', 'Tarea', 'tarea')}
            ${accionRapida('qa-entreno', 'entreno', 'Entrenar', 'entreno')}
            ${accionRapida('qa-habito', 'habitos', 'Hábito', 'habito')}
            ${accionRapida('qa-nota', 'notas', 'Nota', 'nota', `data-cat="${ultimaNota ? escapeHtml(ultimaNota.catId) : ''}"`)}
          </div>
          ${alertasHtml}
          ${franjaHtml}
          ${installBannerHtml}
        </section>

        <div class="o-hoy-agenda">
          ${oHoja({ id: 'hoy-agenda-hoja', titulo: 'Agenda del día', cuerpo: renderAgenda({ items, atrasadas, hoyIso }) })}
        </div>
      </div>

      ${oHoja({ id: 'hoy-habitos-hoja', modulo: 'habitos', titulo: 'Hábitos de hoy', cuerpo: renderHabitosHoy(habitosHoy, hoyIso) })}

      ${oHoja({
        id: 'hoy-captura', titulo: 'Captura rápida',
        // <form> a propósito, no un div + keydown: ver commit 4396aa1. Un
        // <input> solo dentro de un <form> ya dispara "submit" en
        // Enter/Ir/Listo sin necesitar un botón visible.
        cuerpo: `
          <form id="quick-capture-form" class="o-campo" onsubmit="return false;">
            <label for="quick-capture-input">Tarea o gasto</label>
            <input type="text" id="quick-capture-input" class="o-input" placeholder="Ej.: 4500 almuerzo · Comprar pan" enterkeyhint="go" autocomplete="off">
            <p class="o-campo-ayuda">Si empieza con un monto se guarda como gasto; si no, como tarea.</p>
            <p id="quick-capture-hint" class="o-campo-ayuda" role="status"></p>
          </form>
          <ul id="quick-capture-sobre-opciones" class="o-chips o-mod-finanzas" aria-label="Sobres posibles"></ul>`,
        pie: '<button type="submit" form="quick-capture-form" class="o-btn o-btn--primario">Guardar</button>'
      })}

      ${oHoja({
        id: 'hoy-progreso-modal', modulo: 'habitos', titulo: 'Registrar progreso',
        cuerpo: `
          <form id="hoy-prog-form" class="o-campo" onsubmit="return false;">
            <label for="hoy-prog-cantidad">Cantidad a sumar</label>
            <input id="hoy-prog-cantidad" class="o-input o-input--monto" type="number" inputmode="decimal" min="0" step="any" autocomplete="off">
            <p id="hoy-prog-detalle" class="o-campo-ayuda"></p>
          </form>`,
        pie: '<button type="button" class="o-btn o-btn--secundario" data-hoja-cerrar>Cancelar</button><button type="submit" form="hoy-prog-form" id="hoy-prog-guardar" class="o-btn o-btn--primario">Sumar</button>'
      })}

      <!-- Formularios MK III que Hoy abre sin salir (se migran en su fase):
           su ámbito les da el mismo aspecto que en su módulo. -->
      <div class="mk3-tareas">${renderTaskForm()}</div>
      <!-- Hoja de gasto de Finanzas (Órbita desde la Fase 8b). -->
      ${renderGastoForm()}
    </div>
  `;
}

let soltarMazo = null;
let vigiaGasto = null;

export function cleanup() {
  if (soltarMazo) { soltarMazo(); soltarMazo = null; }
  if (vigiaGasto) { vigiaGasto.disconnect(); vigiaGasto = null; }
}

export function mountListeners() {
  cleanup();
  const go = (view) => {
    if (window.appRouter) window.appRouter.navigate(view);
  };
  const hoy = () => diaKeyDe(new Date());
  const fallo = (err, donde) => {
    console.error(`Error al ${donde}:`, err);
    Toast('No se pudo guardar. Inténtalo de nuevo.', 'error');
  };

  // En PC la agenda es un panel fijo, no un diálogo.
  const agendaHoja = document.getElementById('hoy-agenda-hoja');
  if (agendaHoja && window.matchMedia('(min-width: 1280px)').matches) {
    agendaHoja.removeAttribute('role');
    agendaHoja.removeAttribute('aria-modal');
  }
  ['hoy-agenda-hoja', 'hoy-habitos-hoja', 'hoy-captura', 'hoy-progreso-modal'].forEach(montarHoja);

  // --- Cabecera ---
  // La racha y las vidas viven en Hábitos › Logros.
  document.getElementById('chip-racha')?.addEventListener('click', () => { pedirPestanaHabitos('logros'); go('habitos'); });
  document.getElementById('btn-dia-hoy')?.addEventListener('click', () => abrirHojaDia(hoy(), { alGuardar: () => repintar() }));
  // Foco en curso (components/foco.js): la línea abre su pantalla.
  document.getElementById('hoy-foco')?.addEventListener('click', () => abrirPantallaFoco({ alVolver: abrirDetallePorId }));

  // --- Órbita y chips ---
  // La órbita lleva a Laboratorio › Semana en la semana en curso.
  document.getElementById('hoy-orbita')?.addEventListener('click', () => {
    const h = hoy();
    pedirSemana(sumarDias(h, -((new Date().getDay() + 6) % 7)));
    go('laboratorio');
  });
  document.getElementById('chip-habitos')?.addEventListener('click', () => { pedirPestanaHabitos('hoy'); go('habitos'); });
  document.getElementById('chip-tareas')?.addEventListener('click', () => go('tareas'));
  document.getElementById('chip-entreno')?.addEventListener('click', () => go('entrenamiento'));
  document.getElementById('chip-finanzas')?.addEventListener('click', () => go('finanzas'));

  // --- Marcar desde la agenda, la hoja de hábitos o una misión: las mismas
  // funciones de db.js que usan Tareas, Semana y Hábitos (cada una emite su
  // logEvent). ---
  const marcar = async (tipo, id) => {
    if (tipo === 'tarea') await db.updateTaskStatus(id, 'done');
    else if (tipo === 'plan') await db.toggleTareaPlan(id);
    else await db.toggleMarcaHabito(id, hoy());
  };
  document.querySelectorAll('.agenda-check').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tipo = btn.getAttribute('data-tipo');
      const id = btn.getAttribute('data-id');
      if (tipo === 'habito-num') { abrirProgreso(id); return; }
      btn.disabled = true;
      try {
        await marcar(tipo, id);
        await repintar();
      } catch (err) {
        fallo(err, 'marcar desde la agenda');
        btn.disabled = false;
      }
    });
  });

  // Atrasadas: la fila las despliega en línea (sin repintar); cada una se
  // marca con el mismo check de la agenda o se pasa a hoy con
  // saveTask({ id, dueDate }) (tarea_actualizada) o moverTareaPlan
  // (tarea_reprogramada).
  const atrasadasToggle = document.getElementById('hoy-atrasadas-toggle');
  if (atrasadasToggle) {
    atrasadasToggle.addEventListener('click', () => {
      atrasadasAbierta = !atrasadasAbierta;
      document.getElementById('hoy-atrasadas-lista').hidden = !atrasadasAbierta;
      atrasadasToggle.setAttribute('aria-expanded', String(atrasadasAbierta));
    });
  }
  document.querySelectorAll('.agenda-mover').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const id = btn.getAttribute('data-id');
        if (btn.getAttribute('data-tipo') === 'plan') await db.moverTareaPlan(id, hoy());
        else await db.saveTask({ id, dueDate: hoy() });
        Toast('Tarea movida a hoy', 'success');
        await repintar();
      } catch (err) {
        fallo(err, 'mover la tarea a hoy');
        btn.disabled = false;
      }
    });
  });

  // --- Mazo de misiones ---
  const mazo = document.getElementById('hoy-mazo');
  soltarMazo = montarMazo(mazo, {
    alHecho: async (misionId) => {
      const [tipo, ...resto] = misionId.split(':');
      const id = resto.join(':');
      if (tipo === 'ctx') { await hechoContextual(id); return; }
      try {
        await marcar(tipo, id);
        pospuestas.delete(misionId);
        await repintar();
      } catch (err) {
        fallo(err, 'completar la misión');
        await repintar();
      }
    },
    alDespues: async (misionId) => {
      const [tipo, ...resto] = misionId.split(':');
      if (tipo === 'ctx') {
        const tipoCtx = resto.join(':');
        if (tipoCtx === 'semana') await db.marcarSemanaRevisada(misionCtx.semana);
        else ocultarHoy(tipoCtx);
      } else {
        pospuestas.delete(misionId);
        pospuestas.add(misionId);
      }
      await repintar();
    },
    alAccion: (accion, misionId) => {
      if (accion === 'sumar') abrirProgreso(misionId.split(':').slice(1).join(':'));
    }
  });
  async function hechoContextual(tipo) {
    if (tipo === 'ritual') go('ritual');
    else if (tipo === 'backup') { await exportAllData(); await repintar(); } // los días desde el respaldo quedan en 0: la misión sale sola
    else if (tipo === 'vida') { marcarVidaUsadaVista(misionCtx.vida); await repintar(); }
    else if (tipo === 'semana') {
      await db.marcarSemanaRevisada(misionCtx.semana);
      pedirSemana(misionCtx.semana);
      go('laboratorio');
    }
    else go('entrenamiento');
  }

  // --- Hoja de progreso de un hábito con cantidad: suma lo ingresado a lo
  // que ya lleva hoy y guarda el total con registrarProgresoHabito (emite su
  // logEvent con la cantidad). ---
  const progInput = document.getElementById('hoy-prog-cantidad');
  const progForm = document.getElementById('hoy-prog-form');
  const progGuardar = document.getElementById('hoy-prog-guardar');
  let progreso = null;
  function abrirProgreso(id) {
    progreso = habitosConMeta.get(id) || null;
    if (!progreso) return;
    document.getElementById('hoy-progreso-modal-titulo').textContent = progreso.nombre;
    document.getElementById('hoy-prog-detalle').textContent =
      `Llevas ${progreso.actual}/${progreso.meta}${progreso.unidad ? ' ' + progreso.unidad : ''} hoy.`;
    progInput.value = '';
    progGuardar.disabled = false;
    abrirHoja('hoy-progreso-modal');
  }
  progForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cantidad = Number(String(progInput.value).replace(',', '.'));
    if (!progreso || !(cantidad > 0)) { progInput.focus(); return; }
    const total = progreso.actual + cantidad;
    progGuardar.disabled = true;
    try {
      await db.registrarProgresoHabito(progreso.id, hoy(), total);
      await cerrarHoja('hoy-progreso-modal');
      await esperarSalidaDeModal('hoy-progreso-modal');
      Toast(total >= progreso.meta ? 'Meta cumplida' : 'Progreso guardado', 'success');
      await repintar();
    } catch (err) {
      fallo(err, 'registrar el progreso');
      progGuardar.disabled = false;
    }
  });

  // --- Franja → hoja «Agenda del día» ---
  document.getElementById('hoy-franja')?.addEventListener('click', () => abrirHoja('hoy-agenda-hoja'));

  // --- Acciones rápidas ---
  // Formulario de tarea existente (components/task-form.js), montado acá.
  setupTaskForm(repintar);
  document.getElementById('qa-tarea')?.addEventListener('click', () => openTaskForm());
  // Gasto: la hoja de Finanzas (GastoForm) se abre aquí, sin salir de Hoy.
  // Al cerrarse (guardado o no), Hoy se repinta para mover los anillos.
  const gastoModal = document.getElementById('gasto-modal');
  if (gastoModal) {
    initGastoForm(db, () => presupuestoActual, () => {});
    document.getElementById('qa-gasto')?.addEventListener('click', () => gastoModal.openForm());
    vigiaGasto = new MutationObserver(async () => {
      if (gastoModal.classList.contains('open') || gastoModal.dataset.vigilado !== '1') {
        if (gastoModal.classList.contains('open')) gastoModal.dataset.vigilado = '1';
        return;
      }
      gastoModal.dataset.vigilado = '';
      await esperarSalidaDeModal('gasto-modal');
      await repintar();
    });
    vigiaGasto.observe(gastoModal, { attributes: true, attributeFilter: ['class'] });
  }
  document.getElementById('qa-entreno')?.addEventListener('click', async () => {
    const { pedirEntrenarDesdeHoy } = await window.appRouter.importar('js/views/entrenamiento.js');
    pedirEntrenarDesdeHoy();
    go('entrenamiento');
  });
  document.getElementById('qa-habito')?.addEventListener('click', () => abrirHoja('hoy-habitos-hoja'));
  // "Nota": abre el formulario de nota nueva de Anotaciones (Plan › Notas),
  // en la categoría de la última nota (o la primera).
  const qaNota = document.getElementById('qa-nota');
  qaNota?.addEventListener('click', async () => {
    const cats = await db.getCategoriasNota();
    const cat = cats.find(c => c.id === qaNota.getAttribute('data-cat')) || cats[0];
    if (cat) Anotaciones.abrirCategoria(cat.id);
    go('anotaciones');
  });

  // --- Alertas ---
  document.getElementById('alerta-caja')?.addEventListener('click', () => go('finanzas'));
  document.getElementById('alerta-anual')?.addEventListener('click', () => { pedirPestanaFinanzas('recurrentes'); go('finanzas'); });

  // --- Banner de instalación ---
  document.getElementById('btn-install-app')?.addEventListener('click', async () => {
    const evt = window.__vgInstall && window.__vgInstall.deferredPrompt;
    if (!evt) return;
    evt.prompt();
    const choice = await evt.userChoice;
    window.__vgInstall.deferredPrompt = null;
    if (choice.outcome === 'accepted') {
      Toast('Vanguard instalada', 'success');
    } else {
      // Rechazó el prompt nativo del navegador — cuenta como descarte
      // igual que el botón de cerrar, para no insistir de nuevo enseguida.
      try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch (e) { /* modo privado */ }
    }
    document.getElementById('install-banner')?.remove();
  });
  document.getElementById('btn-dismiss-install')?.addEventListener('click', () => {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch (e) { /* modo privado */ }
    document.getElementById('install-banner')?.remove();
  });

  // --- Captura rápida (hoja del orbe): si el texto trae un monto AL
  // PRINCIPIO, se registra como gasto (mismo parser que "Agregar gasto
  // rápido" de Finanzas); si no, se crea como tarea. Dos destinos nada más. ---
  const quickInput = document.getElementById('quick-capture-input');
  const quickHint = document.getElementById('quick-capture-hint');
  const quickOpciones = document.getElementById('quick-capture-sobre-opciones');

  const terminarCaptura = async () => {
    quickInput.value = '';
    quickHint.textContent = '';
    quickOpciones.innerHTML = '';
    await cerrarHoja('hoy-captura');
    await esperarSalidaDeModal('hoy-captura');
    await repintar();
  };

  const registrarGasto = async (parsed, env) => {
    await db.addTransaction({
      type: 'Gasto',
      category: env ? env.category : 'Needs',
      label: parsed.label || 'Gasto',
      amount: parsed.amount,
      envelopeId: env ? env.id : null,
      goalId: null
    });
    Toast(`Gasto de ${formatCurrency(parsed.amount)} registrado`, 'success');
    await terminarCaptura();
  };

  // Cuando el texto calza con más de un sobre (ej. "Auto" y "Autopista" con
  // "15000 en auto"), no elegimos por el usuario: se muestran los sobres
  // encontrados para que confirme cuál es.
  const mostrarSelectorDeSobre = (parsed) => {
    quickHint.textContent = 'Encontré más de un sobre posible. Elige cuál es:';
    quickOpciones.innerHTML = parsed.matches.map((env, i) => `
      <li><button type="button" class="o-chip qa-sobre-opcion" data-idx="${i}"><span class="o-chip-punto"></span>${escapeHtml(env.name)}</button></li>
    `).join('');
    quickOpciones.querySelectorAll('.qa-sobre-opcion').forEach(btn => {
      btn.addEventListener('click', () => registrarGasto(parsed, parsed.matches[Number(btn.dataset.idx)]));
    });
  };

  const submitQuickCapture = async () => {
    const text = quickInput.value.trim();
    if (!text) { quickInput.focus(); return; }
    quickOpciones.innerHTML = '';

    // El monto tiene que ir AL PRINCIPIO ("4500 almuerzo") — un dígito en
    // cualquier parte del texto (ej. "Comprar 2 entradas") mandaba tareas
    // comunes a Finanzas como gasto.
    if (/^\$?\s*\d/.test(text)) {
      const budget = await db.getBudget();
      const parsed = parseQuickGasto(text, budget.envelopes);
      if (!parsed) {
        quickHint.textContent = 'No encontré un monto válido.';
        return;
      }
      if (parsed.matches.length > 1) {
        mostrarSelectorDeSobre(parsed);
        return;
      }
      await registrarGasto(parsed, parsed.matches[0] || null);
      return;
    }
    await db.saveTask({ title: text, status: 'todo', priority: 'medium' });
    Toast('Tarea creada', 'success');
    await terminarCaptura();
  };
  bindQuickCaptureForm(document.getElementById('quick-capture-form'), submitQuickCapture);
}
