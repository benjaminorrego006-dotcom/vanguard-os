// Historial de sesiones de Entreno: lista por semana (lunes a domingo, la
// más reciente primero) con "Cargar más", y el detalle de cada sesión en un
// hoja de Órbita (.modal-overlay con id + open, así el atrás del sistema la
// cierra; ver history.js) con Eliminar y Editar. Eliminar pide confirmación y deja un
// aviso con "Deshacer" (db.restaurarSesion). Editar abre el formulario en
// el mismo modal y guarda con db.editarSesion; Cancelar, Atrás o Escape
// vuelven al detalle (con "¿Descartar los cambios?" si hubo cambios).
import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { claveDiaDe, fechaLocalDe, sumarDias, diaKeyDe, formatFechaCorta, conMayuscula } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { ConfirmDialog, ToastAccion, Toast } from '../utils/states.js';
import { abrirBuscadorEjercicios, TIPO_LABELS } from './rutina-session.js';
import { oIcono } from './orbita.js';

const SEMANAS_POR_PAGINA = 8;
// Serie por tiempo (plantillas de Calistenia): "30s", "20s/lado", "45 s".
const REPS_TIEMPO = /^\d+(?:[.,]\d+)?\s*s(?:\s*\/\s*lado)?$/i;
const esNumero = (v) => String(v).trim() !== '' && Number.isFinite(Number(v));
const CATEGORIAS = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };

let semanasVisibles = SEMANAS_POR_PAGINA;

// Lunes (clave 'YYYY-MM-DD') de la semana de una fecha guardada.
function lunesDe(fecha) {
  const clave = claveDiaDe(fecha);
  const dow = (fechaLocalDe(clave).getDay() + 6) % 7; // 0 = lunes
  return sumarDias(clave, -dow);
}

// "lunes 21 sept" (para la confirmación) y "Lun 21 sept" (para la fila).
function diaLargo(fecha) {
  const f = fechaLocalDe(claveDiaDe(fecha));
  return `${f.toLocaleDateString('es-CL', { weekday: 'long' })} ${formatFechaCorta(f)}`;
}
function diaCorto(fecha) {
  const f = fechaLocalDe(claveDiaDe(fecha));
  return `${conMayuscula(f.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''))} ${formatFechaCorta(f)}`;
}

// Solo se guardan las series marcadas; las antiguas no traen `checked`.
const seriesMarcadas = (s) => (s.ejercicios || []).reduce((n, ej) => n + (ej.series || []).filter(sr => sr.checked !== false).length, 0);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function agruparPorSemana(sesiones) {
  const porLunes = new Map();
  sesiones.forEach(s => {
    const lunes = lunesDe(s.fecha);
    if (!porLunes.has(lunes)) porLunes.set(lunes, []);
    porLunes.get(lunes).push(s);
  });
  return [...porLunes.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([lunes, lista]) => ({ lunes, sesiones: lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) }));
}

function tituloSemana(lunes) {
  const hoyLunes = lunesDe(diaKeyDe(new Date()));
  if (lunes === hoyLunes) return 'Esta semana';
  if (lunes === sumarDias(hoyLunes, -7)) return 'Semana pasada';
  return `Semana del ${formatFechaCorta(fechaLocalDe(lunes))}`;
}

// Fila de una sesión (Órbita, Fase 9c). data-foto: lo que lee
// tools/verificar/foto-progreso.mjs.
function filaSesion(s, categoria) {
  const series = seriesMarcadas(s);
  const incompleta = categoria === 'hiit' && s.completado === false;
  const cat = CATEGORIAS[categoria] || '';
  const aria = [diaLargo(s.fecha), s.nombreRutina, cat, plural(s.duracionMin || 0, 'minuto', 'minutos'), plural(series, 'serie', 'series'), incompleta ? 'incompleta' : ''].filter(Boolean).join(', ');
  return `
    <li>
      <button type="button" class="o-fila o-ent-hist-fila hist-sesion" data-id="${escapeHtml(s.id)}" aria-label="${escapeHtml(aria)}. Ver detalle" data-foto="hist-sesion">
        <span class="o-fila-texto">
          <small data-foto="hist-dia">${escapeHtml(diaCorto(s.fecha))}${cat ? ` · ${cat}` : ''}</small>
          <b data-foto="hist-nombre">${escapeHtml(s.nombreRutina || 'Entrenamiento')}</b>
          ${incompleta ? '<span class="o-ent-hist-incompleta" data-foto="hist-incompleta">Incompleta</span>' : ''}
        </span>
        <span class="o-ent-hist-meta">
          <span data-foto="hist-min"><span class="o-num">${s.duracionMin || 0}</span> min</span>
          <span data-foto="hist-series"><span class="o-num">${series}</span> ${series === 1 ? 'serie' : 'series'}</span>
        </span>
      </button>
    </li>`;
}

async function renderLista() {
  const [sesiones, rutinas] = await Promise.all([db.getSesiones(), db.getRutinas()]);
  const catPorRutina = {};
  rutinas.forEach(r => { catPorRutina[r.id] = r.categoria; });
  if (sesiones.length === 0) {
    return '<p class="o-card-texto o-ent-hist-vacio" data-foto="hist-vacio">Todavía no tienes sesiones registradas.</p>';
  }
  const semanas = agruparPorSemana(sesiones);
  const visibles = semanas.slice(0, semanasVisibles);
  return `
    ${visibles.map(sem => `
      <section class="o-ent-hist-sem" aria-label="${escapeHtml(tituloSemana(sem.lunes))}" data-foto="hist-semana">
        <div class="o-ent-hist-sem-cab">
          <h2 class="o-rotulo" data-foto="sem-titulo">${escapeHtml(tituloSemana(sem.lunes))}</h2>
          <span class="o-ent-hist-cuenta" data-foto="sem-cuenta"><span class="o-num">${sem.sesiones.length}</span> ${sem.sesiones.length === 1 ? 'sesión' : 'sesiones'}</span>
        </div>
        <ul class="o-lista">
          ${sem.sesiones.map(s => filaSesion(s, catPorRutina[s.rutinaId])).join('')}
        </ul>
      </section>`).join('')}
    ${semanas.length > visibles.length ? `
      <button type="button" id="btn-hist-cargar-mas" class="o-btn o-btn--secundario o-btn--bloque">Cargar más</button>` : ''}`;
}

function renderDetalle(s, categoria) {
  const series = seriesMarcadas(s);
  const incompleta = categoria === 'hiit' && s.completado === false;
  const ejercicios = (s.ejercicios || []).map(ej => `
    <li class="o-ent-det-ej">
      <h3 class="o-ent-det-ej-nombre">${escapeHtml(ej.nombre || 'Ejercicio')}</h3>
      <ol class="o-ent-det-series">
        ${(ej.series || []).map((sr, i) => {
          const peso = Number(sr.peso) || 0;
          const tipo = sr.tipo && sr.tipo !== 'normal' ? ` · ${escapeHtml(sr.tipo)}` : '';
          const marcada = sr.checked !== false;
          return `<li class="o-ent-det-serie${marcada ? '' : ' o-ent-det-serie--sin'}">
            <span class="o-ent-det-serie-n">Serie <span class="o-num">${i + 1}</span></span>
            <span>${peso > 0 ? `<span class="o-num">${escapeHtml(String(sr.peso))}</span> kg × ` : ''}<span class="o-num">${escapeHtml(String(sr.reps ?? 0))}</span>${esNumero(sr.reps ?? 0) ? ' reps' : ''}${tipo}${marcada ? '' : ' · sin marcar'}</span>
          </li>`;
        }).join('')}
      </ol>
    </li>`).join('');
  return `
    <div class="o-hoja-cab">
      <div class="o-ent-det-cab">
        <p class="o-rotulo">${escapeHtml(conMayuscula(diaLargo(s.fecha)))}${CATEGORIAS[categoria] ? ` · ${CATEGORIAS[categoria]}` : ''}</p>
        <h2 id="sesion-detalle-titulo" class="o-hoja-titulo">${escapeHtml(s.nombreRutina || 'Entrenamiento')}</h2>
      </div>
      <button type="button" id="btn-sesion-detalle-cerrar" class="o-btn o-btn--fantasma o-btn--icono" aria-label="Cerrar detalle">${oIcono('cerrar')}</button>
    </div>
    <div class="o-hoja-cuerpo">
      <p class="o-ent-det-datos">
        <span><b class="o-num">${s.duracionMin || 0}</b> min</span>
        <span><b class="o-num">${series}</b> ${series === 1 ? 'serie' : 'series'}</span>
        ${s.rpe ? `<span>RPE <b class="o-num">${escapeHtml(String(s.rpe))}</b></span>` : ''}
        ${incompleta ? '<span class="o-ent-hist-incompleta">Incompleta</span>' : ''}
      </p>
      ${s.notas ? `<p class="o-card-texto o-ent-det-notas">${escapeHtml(s.notas)}</p>` : ''}
      <ul class="o-ent-det-ejs">${ejercicios || '<li class="o-card-texto">Sin series registradas.</li>'}</ul>
    </div>
    <div class="o-hoja-pie sesion-detalle-acciones">
      <button type="button" id="btn-sesion-eliminar" class="o-btn o-btn--secundario">Eliminar</button>
      <button type="button" id="btn-sesion-editar" class="o-btn o-btn--primario">Editar</button>
    </div>`;
}

// --- Edición (mismo modal que el detalle) ---------------------------------

// Copia editable de la sesión: fecha como clave de día y números como
// texto (lo que muestran los inputs). Las series conservan sus otros campos
// (rpe, etc.); `checked` se vuelve explícito (las antiguas no lo traen y
// cuentan como marcadas).
function borradorDe(s) {
  return {
    fecha: claveDiaDe(s.fecha),
    duracionMin: String(s.duracionMin ?? 0),
    notas: s.notas || '',
    ejercicios: (s.ejercicios || []).map(ej => ({
      ejercicioId: ej.ejercicioId,
      nombre: ej.nombre,
      series: (ej.series || []).map(sr => ({
        ...sr,
        tipo: sr.tipo || 'normal',
        peso: sr.peso === undefined || sr.peso === null ? '' : String(sr.peso),
        reps: sr.reps === undefined || sr.reps === null ? '' : String(sr.reps),
        checked: sr.checked !== false
      }))
    }))
  };
}

function filaSerieEdicion(sr, ei, si, nombreEj) {
  const n = si + 1;
  const pre = `ed-${ei}-${si}`;
  const de = `de la serie ${n} de ${escapeHtml(nombreEj)}`;
  return `
    <li class="ed-serie o-ent-ed-serie">
      <div class="o-ent-ed-serie-cab">
        <span class="o-ent-det-serie-n">Serie <span class="o-num">${n}</span></span>
        <select id="${pre}-tipo" class="ed-campo o-input" data-ej="${ei}" data-sr="${si}" data-prop="tipo" aria-label="Tipo ${de}">
          ${Object.entries(TIPO_LABELS).map(([v, l]) => `<option value="${v}" ${sr.tipo === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button type="button" class="ed-campo o-btn o-btn--secundario o-btn--icono" data-accion="quitar-serie" data-ej="${ei}" data-sr="${si}" aria-label="Quitar la serie ${n} de ${escapeHtml(nombreEj)}">${oIcono('cerrar')}</button>
      </div>
      <div class="o-ent-ed-serie-campos">
        <div class="o-campo">
          <label for="${pre}-peso">Peso (kg)</label>
          <input id="${pre}-peso" class="ed-campo o-input o-num" type="number" inputmode="decimal" min="0" step="any" value="${escapeHtml(sr.peso)}" data-ej="${ei}" data-sr="${si}" data-prop="peso" aria-label="Peso en kilos ${de}">
        </div>
        <div class="o-campo">
          <label for="${pre}-reps">Reps</label>
          <input id="${pre}-reps" class="ed-campo o-input o-num" type="text" inputmode="numeric" value="${escapeHtml(sr.reps)}" data-ej="${ei}" data-sr="${si}" data-prop="reps" aria-label="Repeticiones ${de}">
        </div>
        <label class="o-ent-casilla">
          <input type="checkbox" class="ed-campo" data-ej="${ei}" data-sr="${si}" data-prop="checked" ${sr.checked ? 'checked' : ''} aria-label="Serie ${n} de ${escapeHtml(nombreEj)} marcada">
          Marcada
        </label>
      </div>
    </li>`;
}

function renderEdicion(s, b) {
  const hoy = diaKeyDe(new Date());
  const ejercicios = b.ejercicios.map((ej, ei) => {
    const nombre = ej.nombre || 'Ejercicio';
    return `
      <li class="ed-ejercicio o-ent-ed-ej">
        <div class="o-ent-ed-ej-cab">
          <h3 class="o-ent-det-ej-nombre">${escapeHtml(nombre)}</h3>
          <button type="button" class="ed-campo o-btn o-btn--secundario" data-accion="quitar-ejercicio" data-ej="${ei}" aria-label="Quitar ${escapeHtml(nombre)} de la sesión">Quitar</button>
        </div>
        <ol class="o-ent-ed-series">
          ${ej.series.map((sr, si) => filaSerieEdicion(sr, ei, si, nombre)).join('')}
        </ol>
        <button type="button" class="ed-campo o-btn o-btn--fantasma o-btn--bloque o-ent-ed-agregar" data-accion="agregar-serie" data-ej="${ei}" aria-label="Agregar una serie a ${escapeHtml(nombre)}">+ Agregar serie</button>
      </li>`;
  }).join('');
  return `
    <div class="o-hoja-cab">
      <div class="o-ent-det-cab">
        <p class="o-rotulo">Editar sesión</p>
        <h2 id="sesion-detalle-titulo" class="o-hoja-titulo">${escapeHtml(s.nombreRutina || 'Entrenamiento')}</h2>
      </div>
    </div>
    <form id="sesion-edicion-form" class="o-hoja-cuerpo" novalidate>
      <div class="o-ent-hoja-par">
        <div class="o-campo">
          <label for="ed-fecha">Fecha</label>
          <input id="ed-fecha" class="ed-campo o-input o-num" type="date" max="${hoy}" value="${escapeHtml(b.fecha)}" data-prop="fecha">
        </div>
        <div class="o-campo">
          <label for="ed-duracion">Duración (min)</label>
          <input id="ed-duracion" class="ed-campo o-input o-num" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(b.duracionMin)}" data-prop="duracionMin">
        </div>
      </div>
      <div class="o-campo">
        <label for="ed-notas">Notas</label>
        <textarea id="ed-notas" class="ed-campo o-input" data-prop="notas" rows="2">${escapeHtml(b.notas)}</textarea>
      </div>
      <ul class="o-ent-det-ejs">${ejercicios || '<li class="o-card-texto">Sin ejercicios. Agrega al menos uno para guardar.</li>'}</ul>
      <button type="button" class="ed-campo o-btn o-btn--secundario o-btn--bloque" data-accion="agregar-ejercicio">+ Agregar ejercicio</button>
      <div class="o-hoja-pie sesion-detalle-acciones">
        <p id="sesion-edicion-error" class="o-campo-error o-ent-ed-error" role="alert" hidden>${oIcono('alerta')}<span></span></p>
        <button type="button" class="ed-campo o-btn o-btn--secundario" data-accion="cancelar">Cancelar</button>
        <button type="submit" class="ed-campo o-btn o-btn--primario">Guardar</button>
      </div>
    </form>`;
}

// Primer problema del borrador (o null). Los números vienen como texto de
// los inputs; `ilegibles` son los ids de inputs con texto que el navegador
// no pudo leer como número (validity.badInput).
function validarBorrador(b, ilegibles = []) {
  const noNegativo = (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0);
  // Reps: número o una serie por tiempo como "30s" o "20s/lado".
  const repsValidas = (v) => noNegativo(v) || REPS_TIEMPO.test(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha)) return { mensaje: 'Elige una fecha.', campo: 'ed-fecha' };
  if (b.fecha > diaKeyDe(new Date())) return { mensaje: 'La fecha no puede ser futura.', campo: 'ed-fecha' };
  if (ilegibles.includes('ed-duracion') || b.duracionMin.trim() === '' || !noNegativo(b.duracionMin.trim())) {
    return { mensaje: 'La duración tiene que ser un número de minutos, 0 o más.', campo: 'ed-duracion' };
  }
  if (b.ejercicios.length === 0) return { mensaje: 'Agrega al menos un ejercicio para guardar.', campo: null };
  for (let ei = 0; ei < b.ejercicios.length; ei++) {
    const ej = b.ejercicios[ei];
    if (ej.series.length === 0) {
      return { mensaje: `${ej.nombre || 'Un ejercicio'} no tiene series: agrega una o quita el ejercicio.`, campo: null, agregarSerieDe: ei };
    }
    for (let si = 0; si < ej.series.length; si++) {
      for (const prop of ['peso', 'reps']) {
        const id = `ed-${ei}-${si}-${prop}`;
        const v = ej.series[si][prop].trim();
        if (ilegibles.includes(id) || !(prop === 'reps' ? repsValidas(v) : noNegativo(v))) {
          return { mensaje: prop === 'reps' ? 'Las repeticiones tienen que ser un número (0 o más) o segundos, como 30s.' : 'El peso tiene que ser un número, 0 o más.', campo: id };
        }
      }
    }
  }
  return null;
}

// Lo que recibe db.editarSesion: números normalizados como texto (igual
// que los guarda la sesión en vivo) y la fecha como clave de día (editarSesion
// conserva la hora original).
function cambiosDe(b) {
  // Números normalizados; una serie por tiempo ("30s") queda como se escribió.
  const limpio = (v) => (v.trim() === '' ? '' : esNumero(v) ? String(Number(v)) : v.trim());
  return {
    fecha: b.fecha,
    duracionMin: Math.round(Number(b.duracionMin)),
    notas: b.notas.trim(),
    ejercicios: b.ejercicios.map(ej => ({
      ...(ej.ejercicioId !== undefined ? { ejercicioId: ej.ejercicioId } : {}),
      nombre: ej.nombre,
      series: ej.series.map(sr => ({ ...sr, peso: limpio(sr.peso), reps: limpio(sr.reps) }))
    }))
  };
}

export async function renderSesionesHistorial() {
  semanasVisibles = SEMANAS_POR_PAGINA;
  // La hoja del detalle (y su edición): Órbita (Fase 9e). Su contenido se
  // repinta entero al pasar del detalle a la edición.
  return `
    <div class="o-ent-hist">
      <header class="o-ent-sub-cab">
        <h1 class="o-ent-titulo" data-foto="hist-titulo">Historial de sesiones</h1>
        <p class="o-card-texto">Toca una sesión para ver sus series, editarla o eliminarla.</p>
      </header>
      <div id="hist-lista" class="o-ent-hist-lista">${await renderLista()}</div>
    </div>
    <div id="sesion-detalle-modal" class="modal-overlay o-ui o-mod-entreno" role="dialog" aria-modal="true" aria-labelledby="sesion-detalle-titulo">
      <div class="o-hoja" id="sesion-detalle-contenido"></div>
    </div>`;
}

export function initSesionesHistorialListeners(signal) {
  const lista = document.getElementById('hist-lista');
  const modal = document.getElementById('sesion-detalle-modal');
  const contenido = document.getElementById('sesion-detalle-contenido');
  if (!lista || !modal || !contenido) return;

  let origenFoco = null;
  // Mientras se edita: { s, cat, borrador, inicial, ocupado }. `inicial` es
  // el borrador recién abierto (JSON) para saber si hay cambios sin guardar;
  // `ocupado` frena otras acciones mientras se espera una confirmación, el
  // buscador o el guardado.
  let edicion = null;

  const refrescarLista = async () => {
    if (!document.body.contains(lista)) return;
    lista.innerHTML = await renderLista();
    // innerHTML nuevo: los listeners van por delegación en `lista`, que no cambia.
  };

  const cerrarDetalle = () => {
    edicion = null;
    modal.classList.remove('open');
    modal.style.display = 'none';
    if (origenFoco && document.body.contains(origenFoco)) origenFoco.focus();
  };

  const pintarDetalle = (s, cat, foco = 'btn-sesion-detalle-cerrar') => {
    edicion = null;
    contenido.innerHTML = renderDetalle(s, cat);
    // Listeners del detalle: se reasignan en cada pintado (innerHTML nuevo).
    document.getElementById('btn-sesion-detalle-cerrar').addEventListener('click', cerrarDetalle);
    document.getElementById('btn-sesion-eliminar').addEventListener('click', () => eliminar(s));
    document.getElementById('btn-sesion-editar').addEventListener('click', () => abrirEdicion(s, cat));
    requestAnimationFrame(() => document.getElementById(foco)?.focus());
  };

  const abrirDetalle = async (id, boton) => {
    const [sesiones, rutinas] = await Promise.all([db.getSesiones(), db.getRutinas()]);
    const s = sesiones.find(x => x.id === id);
    if (!s) { await refrescarLista(); return; }
    const cat = (rutinas.find(r => r.id === s.rutinaId) || {}).categoria;
    origenFoco = boton;
    pintarDetalle(s, cat);
    modal.style.display = 'flex';
    modal.classList.add('open');
  };

  const eliminar = async (s) => {
    const dia = diaLargo(s.fecha);
    const ok = await ConfirmDialog(`¿Eliminar la sesión del ${dia}?`, 'Se quita del historial y se recalculan tu racha, tus metas y tu volumen. Podrás deshacerlo durante unos segundos.', { verb: 'Eliminar' });
    // Que history.js suelte la entrada de la confirmación antes de cerrar
    // otro modal (si no, el back() de ese no encuentra su entrada).
    await esperarSalidaDeModal('global-confirm-modal');
    if (!ok) { document.getElementById('btn-sesion-eliminar')?.focus(); return; }
    const res = await db.eliminarSesion(s.id);
    cerrarDetalle();
    if (!res || !res.ok) { Toast('No se pudo eliminar la sesión', 'error'); return; }
    await refrescarLista();
    ToastAccion('Sesión eliminada', {
      accion: 'Deshacer',
      alAccion: async () => {
        const r = await db.restaurarSesion(s.id);
        if (!r || !r.ok) { Toast('No se pudo deshacer', 'error'); return; }
        await refrescarLista();
      }
    });
  };

  // --- Edición ---

  // `foco`: id del elemento a enfocar o función que lo devuelve (después de
  // quitar o agregar series y ejercicios el formulario se repinta entero).
  const pintarEdicion = (foco) => {
    const scroll = contenido.scrollTop;
    contenido.innerHTML = renderEdicion(edicion.s, edicion.borrador);
    contenido.scrollTop = scroll;
    if (!foco) return;
    requestAnimationFrame(() => {
      const el = typeof foco === 'function' ? foco() : document.getElementById(foco);
      el?.focus();
    });
  };

  const abrirEdicion = (s, cat) => {
    const borrador = borradorDe(s);
    edicion = { s, cat, borrador, inicial: JSON.stringify(borrador), ocupado: false };
    contenido.scrollTop = 0;
    pintarEdicion('ed-fecha');
  };

  const hayCambios = () => !!edicion && JSON.stringify(edicion.borrador) !== edicion.inicial;

  // ConfirmDialog no se resuelve si el atrás (o Escape) lo cierra por
  // history.js: en ese caso cuenta como "seguir editando".
  const confirmarDescartar = () => new Promise(resolve => {
    let listo = false;
    const fin = (v) => {
      if (listo) return;
      listo = true;
      window.removeEventListener('popstate', alAtras);
      resolve(v);
    };
    const alAtras = () => {
      if (!document.getElementById('global-confirm-modal')?.classList.contains('open')) fin(false);
    };
    window.addEventListener('popstate', alAtras);
    ConfirmDialog('¿Descartar los cambios?', 'Lo que cambiaste en esta sesión no se guarda.', { verb: 'Descartar', danger: false }).then(fin);
  });

  // Cancelar, Atrás, Escape o tocar fuera: vuelve al detalle, preguntando
  // antes si hay cambios sin guardar.
  const salirDeEdicion = async () => {
    if (!edicion || edicion.ocupado) return;
    if (hayCambios()) {
      const actual = edicion;
      actual.ocupado = true;
      const ok = await confirmarDescartar();
      // Que history.js suelte la entrada de la confirmación antes de cerrar
      // otro modal (si no, el back() de ese no encuentra su entrada).
      await esperarSalidaDeModal('global-confirm-modal');
      if (edicion !== actual) return;
      actual.ocupado = false;
      if (!ok) { contenido.querySelector('[data-accion="cancelar"]')?.focus(); return; }
    }
    pintarDetalle(edicion.s, edicion.cat, 'btn-sesion-editar');
  };

  // El atrás del sistema (y Escape, que history.js convierte en atrás)
  // cierra el modal antes de llegar acá. En edición se reabre y se sale al
  // detalle (no se cierra todo de golpe). Con el buscador encima, el atrás
  // cierra solo el buscador (tiene su propia entrada) y no llega acá.
  window.addEventListener('popstate', () => {
    if (!edicion || modal.classList.contains('open') || !document.body.contains(modal)) return;
    modal.style.display = 'flex';
    modal.classList.add('open');
    salirDeEdicion();
  }, { signal });

  // Cada input actualiza el borrador; los repintados (agregar o quitar)
  // parten de él.
  const alEditarCampo = (e) => {
    const el = e.target;
    if (!edicion || !el.classList || !el.classList.contains('ed-campo') || !el.dataset.prop) return;
    const valor = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.ej !== undefined) edicion.borrador.ejercicios[Number(el.dataset.ej)].series[Number(el.dataset.sr)][el.dataset.prop] = valor;
    else edicion.borrador[el.dataset.prop] = valor;
    el.removeAttribute('aria-invalid');
  };
  contenido.addEventListener('input', alEditarCampo, { signal });
  contenido.addEventListener('change', alEditarCampo, { signal });

  contenido.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn || !edicion || edicion.ocupado) return;
    const b = edicion.borrador;
    const ei = Number(btn.dataset.ej);
    const si = Number(btn.dataset.sr);
    switch (btn.dataset.accion) {
      case 'quitar-serie': {
        b.ejercicios[ei].series.splice(si, 1);
        pintarEdicion(() => {
          const quitar = contenido.querySelectorAll(`[data-accion="quitar-serie"][data-ej="${ei}"]`);
          return quitar[Math.min(si, quitar.length - 1)] || contenido.querySelector(`[data-accion="agregar-serie"][data-ej="${ei}"]`);
        });
        break;
      }
      case 'agregar-serie': {
        const series = b.ejercicios[ei].series;
        const ultima = series[series.length - 1];
        series.push({ tipo: 'normal', peso: ultima ? ultima.peso : '', reps: ultima ? ultima.reps : '', checked: true });
        pintarEdicion(`ed-${ei}-${series.length - 1}-peso`);
        break;
      }
      case 'quitar-ejercicio': {
        b.ejercicios.splice(ei, 1);
        pintarEdicion(() => {
          const quitar = contenido.querySelectorAll('[data-accion="quitar-ejercicio"]');
          return quitar[Math.min(ei, quitar.length - 1)] || contenido.querySelector('[data-accion="agregar-ejercicio"]');
        });
        break;
      }
      case 'agregar-ejercicio': {
        const actual = edicion;
        actual.ocupado = true;
        const elegido = await abrirBuscadorEjercicios({ permitirPersonalizado: false, conId: true });
        if (edicion !== actual) return;
        actual.ocupado = false;
        if (!elegido) { contenido.querySelector('[data-accion="agregar-ejercicio"]')?.focus(); return; }
        b.ejercicios.push({ ejercicioId: elegido.id, nombre: elegido.nombre, series: [{ tipo: 'normal', peso: '', reps: '', checked: true }] });
        pintarEdicion(`ed-${b.ejercicios.length - 1}-0-peso`);
        break;
      }
      case 'cancelar':
        salirDeEdicion();
        break;
    }
  }, { signal });

  contenido.addEventListener('submit', async (e) => {
    if (!edicion || e.target.id !== 'sesion-edicion-form') return;
    e.preventDefault();
    if (edicion.ocupado) return;
    const msg = document.getElementById('sesion-edicion-error');
    const ponerError = (texto) => { msg.hidden = !texto; msg.querySelector('span').textContent = texto; };
    contenido.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const ilegibles = [...contenido.querySelectorAll('input[type="number"]')].filter(i => i.validity.badInput).map(i => i.id);
    const error = validarBorrador(edicion.borrador, ilegibles);
    if (error) {
      ponerError(error.mensaje);
      const campo = error.campo && document.getElementById(error.campo);
      if (campo) {
        campo.setAttribute('aria-invalid', 'true');
        campo.setAttribute('aria-describedby', 'sesion-edicion-error');
        campo.focus();
      } else if (error.agregarSerieDe !== undefined) {
        contenido.querySelector(`[data-accion="agregar-serie"][data-ej="${error.agregarSerieDe}"]`)?.focus();
      } else {
        contenido.querySelector('[data-accion="agregar-ejercicio"]')?.focus();
      }
      return;
    }
    ponerError('');
    // Sin cambios no hay nada que registrar: vuelve al detalle.
    if (!hayCambios()) { pintarDetalle(edicion.s, edicion.cat, 'btn-sesion-editar'); return; }

    const actual = edicion;
    actual.ocupado = true;
    const res = await db.editarSesion(actual.s.id, cambiosDe(actual.borrador));
    if (edicion !== actual) return;
    actual.ocupado = false;
    if (!res || !res.ok) {
      ponerError(res && res.error === 'fecha-futura' ? 'La fecha no puede ser futura.' : 'No se pudo guardar la sesión. Inténtalo de nuevo.');
      return;
    }
    ToastAccion('Sesión actualizada', { duracion: 3000 });
    // La vista pudo cambiar mientras se guardaba: entonces no se toca el DOM.
    if (!document.body.contains(modal)) return;
    pintarDetalle(res.sesion, actual.cat, 'btn-sesion-editar');
    // Si cambió la fecha, la lista la deja en su semana nueva.
    await refrescarLista();
    const fila = lista.querySelector(`.hist-sesion[data-id="${CSS.escape(actual.s.id)}"]`);
    if (fila) origenFoco = fila;
  }, { signal });

  // Delegación: la lista se repinta con innerHTML (Cargar más, eliminar,
  // deshacer, editar) y así no hay que volver a enganchar cada fila.
  lista.addEventListener('click', (e) => {
    const fila = e.target.closest('.hist-sesion');
    if (fila) { abrirDetalle(fila.getAttribute('data-id'), fila); return; }
    if (e.target.closest('#btn-hist-cargar-mas')) {
      const primeraNueva = lista.querySelectorAll('section').length;
      semanasVisibles += SEMANAS_POR_PAGINA;
      refrescarLista().then(() => {
        const sec = lista.querySelectorAll('section')[primeraNueva];
        sec?.querySelector('.hist-sesion')?.focus();
      });
    }
  }, { signal });

  // Tocar fuera del contenido cierra el detalle (en edición, sale al detalle).
  modal.addEventListener('click', (e) => {
    if (e.target !== modal) return;
    if (edicion) salirDeEdicion(); else cerrarDetalle();
  }, { signal });
}
