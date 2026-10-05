// Entreno › Cuerpo (docs/FASE6-MEDIDAS.md): peso y perímetros.
// - Tarjeta en la vista principal: último peso y su variación contra hace 30
//   días, con "Registrar medidas" e "Historial".
// - Historial (sub-vista de Entreno): medidas por fecha, la más reciente
//   arriba, con Editar y Eliminar.
// - Hoja de registro / edición (#medida-modal, .modal-overlay + open: Atrás
//   la cierra vía history.js), sin tapar la barra inferior ni el riel.
// - Gráficos (F3), en el historial: peso con media móvil de 7 días y
//   selector 30/90/365 días, y un mini-gráfico por perímetro con al menos 2
//   días registrados. Chart.js se carga recién al pintarlos (ensureChartJs).
// Los datos van por db (registrarMedida / editarMedida / eliminarMedida),
// que valida y deja el evento en el log.
import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { diaKeyDe, sumarDias, fechaLocalDe, formatFechaCorta, conMayuscula, diasEntre, formatMes } from '../utils/fecha.js';
import { ensureChartJs, baseChartOptions, chartFontFamily, cssVar, hdPixelRatio } from '../utils/charts.js';
import { formatNumero } from '../utils/numero.js';
import { escapeHtml } from '../utils/escape.js';
import { Toast, ConfirmDialog } from '../utils/states.js';

const CAMPOS = [
  { k: 'pesoKg', etq: 'Peso', u: 'kg' },
  { k: 'cinturaCm', etq: 'Cintura', u: 'cm' },
  { k: 'pechoCm', etq: 'Pecho', u: 'cm' },
  { k: 'brazoCm', etq: 'Brazo', u: 'cm' },
  { k: 'musloCm', etq: 'Muslo', u: 'cm' }
];

const fechaCorta = (clave) => formatFechaCorta(fechaLocalDe(clave));
const diaCorto = (clave) => {
  const f = fechaLocalDe(clave);
  return `${conMayuscula(f.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''))} ${formatFechaCorta(f)}`;
};
const conUnidad = (v, u) => `<span class="num">${formatNumero(v)}</span> ${u}`;

// Variación del último peso contra el peso vigente hace 30 días (el último
// registrado ese día o antes). null si no hay con qué comparar.
export function variacionPeso30(medidas, hoy = diaKeyDe(new Date())) {
  const pesos = medidas.filter(m => typeof m.pesoKg === 'number');
  if (!pesos.length) return null;
  const ultimo = pesos[0];
  const ref = pesos.find(m => m.fecha <= sumarDias(hoy, -30));
  return { ultimo, delta: ref ? Math.round((ultimo.pesoKg - ref.pesoKg) * 10) / 10 : null };
}
// Solo el número va en mono.
const textoVariacion = (delta) => (delta === 0 ? 'sin cambios en 30 días'
  : `<span class="num">${delta > 0 ? '+' : '−'}${formatNumero(Math.abs(delta))}</span> en 30 días`);

// --- Series para los gráficos (funciones puras) -----------------------------------
// Un punto por día con `campo`: el último registrado ese día (medidas viene
// de db.getMedidas, la más reciente primero). Desde `desde` (clave de día,
// incluida) si se da. [{ fecha, valor }] de la más antigua a la más nueva.
export function serieDiaria(medidas, campo, desde = null) {
  const porDia = new Map();
  medidas.forEach(m => {
    if (typeof m[campo] !== 'number' || porDia.has(m.fecha)) return;
    if (desde && m.fecha < desde) return;
    porDia.set(m.fecha, m[campo]);
  });
  return [...porDia.entries()].map(([fecha, valor]) => ({ fecha, valor })).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Media móvil de 7 días de calendario: para cada punto, el promedio de los
// puntos de ese día y los 6 anteriores (con huecos, los que haya).
export function mediaMovil7(serie) {
  return serie.map(p => {
    const ventana = serie.filter(q => q.fecha <= p.fecha && diasEntre(q.fecha, p.fecha) <= 6);
    return Math.round((ventana.reduce((s, q) => s + q.valor, 0) / ventana.length) * 100) / 100;
  });
}

// Variación de peso del mes de `hoy`: el último peso del mes contra el
// vigente al empezar el mes (el último anterior); sin uno anterior, contra
// el primero del mes. null si no hay pesos este mes.
export function variacionPesoMes(medidas, hoy = diaKeyDe(new Date())) {
  const inicio = hoy.slice(0, 8) + '01';
  const serie = serieDiaria(medidas, 'pesoKg');
  const delMes = serie.filter(p => p.fecha >= inicio && p.fecha <= hoy);
  if (!delMes.length) return null;
  const antes = serie.filter(p => p.fecha < inicio).pop();
  const base = antes || delMes[0];
  const ultimo = delMes[delMes.length - 1];
  return { ultimo: ultimo.valor, delta: Math.round((ultimo.valor - base.valor) * 10) / 10, desde: base.fecha, mes: formatMes(fechaLocalDe(hoy)) };
}
export const textoDelta = (delta) => (delta === 0 ? 'sin cambios'
  : `<span class="num">${delta > 0 ? '+' : '−'}${formatNumero(Math.abs(delta))}</span>`);

// --- Tarjeta de la vista principal ---------------------------------------------
export function renderCuerpoTarjeta(medidas) {
  const v = variacionPeso30(medidas);
  const ultima = medidas[0];
  const cuerpo = v
    ? `<div class="cuerpo-peso"><span class="num">${formatNumero(v.ultimo.pesoKg)}</span> kg${v.delta !== null ? ` <span class="cuerpo-var">· ${textoVariacion(v.delta)}</span>` : ''}</div>
       <div class="cuerpo-sub">Último registro: ${escapeHtml(fechaCorta(ultima.fecha))}</div>`
    : ultima
      ? `<div class="cuerpo-sub">Sin peso registrado. Último registro: ${escapeHtml(fechaCorta(ultima.fecha))}</div>`
      : `<div class="cuerpo-sub">Registra tu peso y tus medidas para seguir tu evolución.</div>`;
  return `
    <section id="entreno-cuerpo" class="card cuerpo-tarjeta" aria-labelledby="cuerpo-titulo">
      <div class="cuerpo-etq num" id="cuerpo-titulo">CUERPO</div>
      ${cuerpo}
      <div class="cuerpo-acciones">
        <button type="button" id="btn-cuerpo-registrar" class="cuerpo-btn cuerpo-btn--primario tappable">Registrar medidas</button>
        ${medidas.length ? '<button type="button" id="btn-cuerpo-historial" class="cuerpo-btn tappable">Historial</button>' : ''}
      </div>
    </section>`;
}

// --- Gráficos del historial -----------------------------------------------------------
const RANGOS = [30, 90, 365];
let rangoPeso = 90;
const graficos = new Map(); // id del canvas -> instancia de Chart

export function cleanupCuerpoGraficos() {
  graficos.forEach(g => g.destroy());
  graficos.clear();
}

function renderGraficos(medidas) {
  const hoy = diaKeyDe(new Date());
  const serie = serieDiaria(medidas, 'pesoKg', sumarDias(hoy, -(rangoPeso - 1)));
  const hayPeso = medidas.some(m => typeof m.pesoKg === 'number');
  const vacio = serie.length >= 2 ? ''
    : !hayPeso ? 'Registra tu peso para ver su evolución.'
    : serie.length === 0 ? `Sin registros de peso en los últimos ${rangoPeso} días.`
    : 'Registra tu peso al menos dos días para ver el gráfico.';
  const minis = CAMPOS.slice(1).map(c => ({ ...c, serie: serieDiaria(medidas, c.k) })).filter(c => c.serie.length >= 2);
  return `
    <section class="card cuerpo-graf" aria-labelledby="cuerpo-graf-titulo">
      <div class="cuerpo-graf-cab">
        <h3 id="cuerpo-graf-titulo">Peso</h3>
        <div class="cuerpo-rangos" role="group" aria-label="Rango del gráfico">
          ${RANGOS.map(r => `<button type="button" class="cuerpo-rango tappable" data-rango="${r}" aria-pressed="${r === rangoPeso}"><span class="num">${r}</span> d</button>`).join('')}
        </div>
      </div>
      ${vacio
        ? `<p class="cuerpo-graf-vacio" id="cuerpo-peso-vacio">${vacio}</p>`
        : `<div class="cuerpo-graf-caja"><canvas id="cuerpo-peso-chart" role="img" aria-label="Peso de los últimos ${rangoPeso} días: de ${formatNumero(serie[0].valor)} a ${formatNumero(serie[serie.length - 1].valor)} kg"></canvas></div>
           <div class="cuerpo-graf-leyenda" aria-hidden="true"><span class="cuerpo-ley cuerpo-ley--peso">Peso</span><span class="cuerpo-ley cuerpo-ley--media">Media de 7 días</span></div>`}
    </section>
    ${minis.length ? `<div class="cuerpo-minis">${minis.map(c => {
      const a = c.serie[0], b = c.serie[c.serie.length - 1];
      const delta = Math.round((b.valor - a.valor) * 10) / 10;
      return `
        <section class="card cuerpo-mini" data-campo="${c.k}" aria-label="${c.etq}">
          <div class="cuerpo-mini-etq">${c.etq}</div>
          <div class="cuerpo-mini-valor">${conUnidad(b.valor, c.u)}</div>
          <div class="cuerpo-mini-var">${textoDelta(delta)}${delta === 0 ? '' : ` ${c.u}`} desde ${escapeHtml(fechaCorta(a.fecha))}</div>
          <div class="cuerpo-mini-caja"><canvas id="cuerpo-mini-${c.k}" aria-hidden="true"></canvas></div>
        </section>`;
    }).join('')}</div>` : ''}`;
}

// Tras insertar renderCuerpoHistorial en el DOM.
export async function initCuerpoGraficos(medidas) {
  cleanupCuerpoGraficos();
  const canvas = document.getElementById('cuerpo-peso-chart');
  const minis = [...document.querySelectorAll('.cuerpo-mini canvas')];
  if (!canvas && !minis.length) return;
  const Chart = await ensureChartJs();
  const cy = cssVar('--cy');
  const texto = cssVar('--text-secondary');
  const family = chartFontFamily();
  const opts = baseChartOptions();
  if (canvas && canvas.isConnected) {
    const hoy = diaKeyDe(new Date());
    const serie = serieDiaria(medidas, 'pesoKg', sumarDias(hoy, -(rangoPeso - 1)));
    graficos.set(canvas.id, new Chart(canvas, {
      type: 'line',
      data: {
        labels: serie.map(p => fechaCorta(p.fecha)),
        datasets: [
          { label: 'Peso', data: serie.map(p => p.valor), fechas: serie.map(p => p.fecha), borderColor: cy, backgroundColor: cy, borderWidth: 2, pointRadius: serie.length > 60 ? 0 : 3, pointHoverRadius: 5, tension: 0 },
          { label: 'Media de 7 días', data: mediaMovil7(serie), borderColor: cy + '66', borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, tension: 0.3 }
        ]
      },
      options: {
        ...opts,
        devicePixelRatio: hdPixelRatio(),
        interaction: { mode: 'index', intersect: false },
        plugins: { ...opts.plugins, tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatNumero(ctx.parsed.y)} kg` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: texto, maxTicksLimit: 6, maxRotation: 0, font: { size: 10, family } } },
          y: { grid: { color: cssVar('--line') }, ticks: { color: texto, maxTicksLimit: 5, font: { size: 10, family }, callback: (v) => formatNumero(v) } }
        }
      }
    }));
  }
  minis.forEach(cv => {
    if (!cv.isConnected) return;
    const campo = cv.id.replace('cuerpo-mini-', '');
    const serie = serieDiaria(medidas, campo);
    graficos.set(cv.id, new Chart(cv, {
      type: 'line',
      data: { labels: serie.map(p => fechaCorta(p.fecha)), datasets: [{ data: serie.map(p => p.valor), borderColor: cy, borderWidth: 2, pointRadius: 2, tension: 0 }] },
      options: { ...opts, devicePixelRatio: hdPixelRatio(), plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, events: [] }
    }));
  });
}

// --- Historial (sub-vista) ---------------------------------------------------------
export function renderCuerpoHistorial(medidas) {
  const filas = medidas.map(m => {
    const valores = CAMPOS.filter(c => typeof m[c.k] === 'number')
      .map(c => `<span class="cuerpo-valor"><span class="cuerpo-valor-etq">${c.etq}</span> ${conUnidad(m[c.k], c.u)}</span>`).join('');
    const dia = diaCorto(m.fecha);
    return `
      <li class="cuerpo-fila" data-id="${escapeHtml(m.id)}" data-fecha="${escapeHtml(m.fecha)}">
        <div class="cuerpo-fila-dia num">${escapeHtml(dia)}</div>
        <div class="cuerpo-fila-valores">${valores}</div>
        ${m.nota ? `<p class="cuerpo-fila-nota">${escapeHtml(m.nota)}</p>` : ''}
        <div class="cuerpo-fila-acciones">
          <button type="button" class="cuerpo-btn btn-medida-editar tappable" data-id="${escapeHtml(m.id)}" aria-label="Editar la medida del ${escapeHtml(dia)}">Editar</button>
          <button type="button" class="cuerpo-btn btn-medida-eliminar tappable" data-id="${escapeHtml(m.id)}" aria-label="Eliminar la medida del ${escapeHtml(dia)}">Eliminar</button>
        </div>
      </li>`;
  }).join('');
  return `
    <div class="cuerpo-historial">
      <div class="cuerpo-historial-cab">
        <h2>Cuerpo</h2>
        <button type="button" id="btn-cuerpo-hist-registrar" class="cuerpo-btn cuerpo-btn--primario tappable">Registrar medidas</button>
      </div>
      ${medidas.length ? renderGraficos(medidas) : ''}
      ${medidas.length
        ? `<ul class="cuerpo-lista">${filas}</ul>`
        : '<p class="cuerpo-sub">Todavía no hay medidas registradas.</p>'}
    </div>`;
}

// --- Hoja de registro / edición ------------------------------------------------------
export function renderMedidaForm() {
  return `
    <div id="medida-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="medida-titulo">
      <div class="modal-content cuerpo-hoja">
        <h3 id="medida-titulo">Registrar medidas</h3>
        <form id="medida-form" novalidate>
          <input type="hidden" id="medida-id">
          <label class="cuerpo-campo cuerpo-campo--fecha">
            <span>Fecha</span>
            <input type="date" id="medida-fecha" required>
          </label>
          <div class="cuerpo-campos">
            ${CAMPOS.map(c => `
              <label class="cuerpo-campo">
                <span>${c.etq} (${c.u})</span>
                <input type="text" inputmode="decimal" id="medida-${c.k}" data-campo="${c.k}" autocomplete="off" placeholder="—">
                <small class="cuerpo-anterior" id="medida-ant-${c.k}"></small>
              </label>`).join('')}
          </div>
          <label class="cuerpo-campo">
            <span>Nota (opcional)</span>
            <textarea id="medida-nota" rows="2" maxlength="200" placeholder="Ej. en ayunas"></textarea>
          </label>
          <p class="cuerpo-error" id="medida-error" role="alert" hidden></p>
          <div class="cuerpo-hoja-acciones">
            <button type="button" id="medida-cancelar" class="cuerpo-btn tappable">Cancelar</button>
            <button type="submit" id="medida-guardar" class="cuerpo-btn cuerpo-btn--primario tappable">Guardar</button>
          </div>
        </form>
      </div>
    </div>`;
}

let alCambiar = null; // repinta la vista que esté mostrando las medidas

// Abre la hoja vacía (nueva) o con una medida (edición). Junto a cada campo,
// el valor anterior como referencia: el último registrado (o, al editar, el
// último anterior a esta medida).
export async function abrirMedidaForm(medida = null) {
  const modal = document.getElementById('medida-modal');
  if (!modal) return;
  const medidas = await db.getMedidas();
  const hoy = diaKeyDe(new Date());
  const desde = medida ? medidas.findIndex(m => m.id === medida.id) + 1 : 0;
  modal.querySelector('#medida-titulo').textContent = medida ? 'Editar medidas' : 'Registrar medidas';
  modal.querySelector('#medida-id').value = medida ? medida.id : '';
  const fecha = modal.querySelector('#medida-fecha');
  fecha.value = medida ? medida.fecha : hoy;
  fecha.max = hoy;
  CAMPOS.forEach(c => {
    const input = modal.querySelector(`#medida-${c.k}`);
    input.value = medida && typeof medida[c.k] === 'number' ? formatNumero(medida[c.k]) : '';
    const ant = medidas.slice(desde).find(m => typeof m[c.k] === 'number');
    modal.querySelector(`#medida-ant-${c.k}`).innerHTML = ant ? `Anterior: ${conUnidad(ant[c.k], c.u)} · ${escapeHtml(fechaCorta(ant.fecha))}` : '';
  });
  modal.querySelector('#medida-nota').value = medida && medida.nota ? medida.nota : '';
  const error = modal.querySelector('#medida-error');
  error.hidden = true;
  error.textContent = '';
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}

async function cerrarMedidaForm() {
  const modal = document.getElementById('medida-modal');
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
  await esperarSalidaDeModal('medida-modal');
}

// La hoja se renderiza una vez por render completo de Entreno: sus
// listeners se asignan acá, tras cada render.
export function setupMedidaForm() {
  const modal = document.getElementById('medida-modal');
  if (!modal) return;
  modal.querySelector('#medida-cancelar').addEventListener('click', () => cerrarMedidaForm());
  modal.querySelector('#medida-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = modal.querySelector('#medida-guardar');
    const error = modal.querySelector('#medida-error');
    const id = modal.querySelector('#medida-id').value;
    const datos = { fecha: modal.querySelector('#medida-fecha').value, nota: modal.querySelector('#medida-nota').value };
    CAMPOS.forEach(c => { datos[c.k] = modal.querySelector(`#medida-${c.k}`).value.trim(); });
    btn.disabled = true;
    try {
      if (id) await db.editarMedida(id, datos);
      else await db.registrarMedida(datos);
    } catch (err) {
      error.textContent = err.message || 'No se pudo guardar. Inténtalo de nuevo.';
      error.hidden = false;
      btn.disabled = false;
      return;
    }
    btn.disabled = false;
    await cerrarMedidaForm();
    Toast(id ? 'Medidas actualizadas' : 'Medidas registradas', 'success');
    if (alCambiar) await alCambiar();
  });
}

// Botones de la tarjeta o del historial (lo que esté en pantalla). Se
// llama tras cada render de esa parte. `repintar`: vuelve a pintar la vista
// actual después de guardar o eliminar.
export function initCuerpo({ repintar, abrirHistorial, signal } = {}) {
  alCambiar = repintar || null;
  const opts = signal ? { signal } : undefined;
  // La tarjeta sigue en el DOM (oculta) con el historial abierto: ids distintos.
  document.getElementById(abrirHistorial ? 'btn-cuerpo-registrar' : 'btn-cuerpo-hist-registrar')?.addEventListener('click', () => abrirMedidaForm(), opts);
  document.getElementById('btn-cuerpo-historial')?.addEventListener('click', () => abrirHistorial && abrirHistorial(), opts);
  document.querySelectorAll('.cuerpo-rango').forEach(b => b.addEventListener('click', async () => {
    rangoPeso = Number(b.dataset.rango) || 90;
    if (alCambiar) await alCambiar();
  }, opts));
  document.querySelectorAll('.btn-medida-editar').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.id;
    const medida = (await db.getMedidas()).find(m => m.id === id);
    if (medida) abrirMedidaForm(medida);
  }, opts));
  document.querySelectorAll('.btn-medida-eliminar').forEach(b => b.addEventListener('click', async () => {
    // El id y la fecha se capturan antes de cualquier await.
    const id = b.dataset.id;
    const fecha = b.closest('.cuerpo-fila')?.dataset.fecha;
    const ok = await ConfirmDialog('¿Eliminar esta medida?', `Se borra la medida del ${fecha ? fechaCorta(fecha) : 'día elegido'}. No se puede deshacer.`, { verb: 'Eliminar' });
    if (!ok) return;
    await db.eliminarMedida(id);
    Toast('Medida eliminada', 'success');
    if (alCambiar) await alCambiar();
  }, opts));
}
