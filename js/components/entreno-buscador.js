// js/components/entreno-buscador.js
// Buscador de Inicio de Entreno (Fase 9b): busca por nombre de rutina y de
// ejercicio (catálogo y los que el usuario escribió en sus rutinas), sin
// distinguir mayúsculas ni tildes. Una rutina abre la pestaña Rutinas en su
// categoría con la rutina resaltada; un ejercicio abre su ficha. Solo lee:
// no escribe datos ni cambia esquemas.
import { CATALOGO_EJERCICIOS, GRUPO_MUSCULAR_LABELS, metadataDeEjercicio, idCatalogoPorNombre } from '../core/ejercicios-catalogo.js';
import { LEVANTAMIENTOS_ID } from '../core/estandares-fuerza.js';
import { renderEjercicioDetalle } from './ejercicio-detalle.js';
import { escapeHtml } from '../utils/escape.js';

const CAT = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };
const ESTANDARES = new Set(LEVANTAMIENTOS_ID);
const MAX_RUTINAS = 4;
const MAX_TOTAL = 8;
const ICO_IR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';

export const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Índice: rutinas del usuario y ejercicios (catálogo + nombres propios de
// sus rutinas), sin repetir nombres.
export function armarIndice(rutinas) {
  const ejercicios = new Map();
  Object.values(CATALOGO_EJERCICIOS).forEach((e) => {
    const clave = normalizar(e.nombre);
    if (clave && !ejercicios.has(clave)) ejercicios.set(clave, { nombre: e.nombre, categoria: e.categoria, grupo: e.grupoMuscular, clave });
  });
  rutinas.forEach((r) => (r.ejercicios || []).forEach((e) => {
    const clave = normalizar(e.nombre);
    if (!clave || ejercicios.has(clave)) return;
    const meta = metadataDeEjercicio(e.nombre);
    ejercicios.set(clave, { nombre: e.nombre, categoria: r.categoria, grupo: meta?.grupoMuscular || null, clave });
  }));
  return {
    rutinas: rutinas.map((r) => ({ id: r.id, nombre: r.nombre, categoria: r.categoria, n: (r.ejercicios || []).length, hiit: !!r.hiitSettings, clave: normalizar(r.nombre) })),
    ejercicios: [...ejercicios.values()]
  };
}

// Todas las palabras escritas tienen que aparecer en el nombre (como el
// autocompletado del formulario de rutina). Primero los que empiezan con
// la primera palabra; después, en orden alfabético.
export function buscar(indice, consulta) {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return null;
  const coincide = (it) => palabras.every((p) => it.clave.includes(p));
  const orden = (a, b) => (Number(b.clave.startsWith(palabras[0])) - Number(a.clave.startsWith(palabras[0]))) || a.nombre.localeCompare(b.nombre, 'es');
  const rutinas = indice.rutinas.filter(coincide).sort(orden).slice(0, MAX_RUTINAS);
  const ejercicios = indice.ejercicios.filter(coincide).sort(orden).slice(0, MAX_TOTAL - rutinas.length);
  return { rutinas, ejercicios };
}

const grupoLabel = (g) => (g ? (GRUPO_MUSCULAR_LABELS[g] || g) : null);

export function renderResultados(res, consulta) {
  if (!res) return '';
  if (res.rutinas.length === 0 && res.ejercicios.length === 0) {
    return `<p class="o-card-texto o-ent-busq-vacio">Sin resultados para «${escapeHtml(consulta.trim())}».</p>`;
  }
  const fila = (attr, valor, titulo, sub) => `
    <li><button type="button" class="o-fila o-ent-ir" ${attr}="${escapeHtml(valor)}">
      <span class="o-fila-texto"><b>${escapeHtml(titulo)}</b><small>${escapeHtml(sub)}</small></span>
      <span class="o-ent-ir-flecha">${ICO_IR}</span>
    </button></li>`;
  const rutinas = res.rutinas.length === 0 ? '' : `
    <p class="o-rotulo o-ent-busq-rotulo">Rutinas</p>
    <ul class="o-lista">${res.rutinas.map((r) => fila('data-busq-rutina', r.id, r.nombre, `${CAT[r.categoria] || r.categoria} · ${r.hiit ? 'Configuración HIIT' : plural(r.n, 'ejercicio', 'ejercicios')}`)).join('')}</ul>`;
  const ejercicios = res.ejercicios.length === 0 ? '' : `
    <p class="o-rotulo o-ent-busq-rotulo">Ejercicios</p>
    <ul class="o-lista">${res.ejercicios.map((e) => fila('data-busq-ejercicio', e.nombre, e.nombre, [grupoLabel(e.grupo), CAT[e.categoria] || e.categoria].filter(Boolean).join(' · '))).join('')}</ul>`;
  return rutinas + ejercicios;
}

// Ficha de un ejercicio: datos del catálogo, en qué rutinas está y su
// progreso (el mismo detalle que se abre durante la sesión; sigue en
// MK III hasta la 9c, dentro de .mk3-entreno).
export const FICHA_CHART_ID = 'ficha-ejercicio-chart';

export function rutinasConEjercicio(rutinas, nombre) {
  const clave = normalizar(nombre);
  return rutinas.filter((r) => (r.ejercicios || []).some((e) => normalizar(e.nombre) === clave));
}

export function renderFichaEjercicio(nombre, { rutinas, historial }) {
  const meta = metadataDeEjercicio(nombre);
  const categoria = meta?.categoria || rutinas[0]?.categoria || null;
  const grupo = grupoLabel(meta?.grupoMuscular);
  const esEstandar = ESTANDARES.has(idCatalogoPorNombre(nombre));
  const datos = [grupo, esEstandar ? 'Cuenta para Estándares de fuerza' : null].filter(Boolean).join(' · ');
  return `
    <article class="o-card o-ent-ficha" data-foto="ficha">
      <header class="o-ent-preview-cab">
        <p class="o-rotulo">Ejercicio${categoria ? ` · ${CAT[categoria] || escapeHtml(categoria)}` : ''}</p>
        <h2 class="o-ent-titulo" data-foto="ficha-nombre">${escapeHtml(nombre)}</h2>
        ${datos ? `<p class="o-card-texto">${datos}</p>` : ''}
      </header>
      <section class="o-ent-ficha-sec">
        <h3 class="o-rotulo">En tus rutinas</h3>
        ${rutinas.length === 0
          ? '<p class="o-card-texto">No está en ninguna de tus rutinas.</p>'
          : `<ul class="o-lista">${rutinas.map((r) => `
            <li><button type="button" class="o-fila o-ent-ir" data-ficha-rutina="${escapeHtml(r.id)}">
              <span class="o-fila-texto"><b>${escapeHtml(r.nombre)}</b><small>${CAT[r.categoria] || escapeHtml(r.categoria)}</small></span>
              <span class="o-ent-ir-flecha">${ICO_IR}</span>
            </button></li>`).join('')}</ul>`}
      </section>
      <section class="o-ent-ficha-sec">
        <h3 class="o-rotulo">Progreso</h3>
        <div class="mk3-entreno o-ent-ficha-legado">${renderEjercicioDetalle(nombre, historial, FICHA_CHART_ID)}</div>
      </section>
    </article>`;
}
