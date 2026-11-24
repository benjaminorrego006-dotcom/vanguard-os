import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { CATALOGO_EJERCICIOS, GRUPO_MUSCULAR_LABELS } from '../core/ejercicios-catalogo.js';
import { LEVANTAMIENTOS_ID } from '../core/estandares-fuerza.js';
import { oIcono } from './orbita.js';

// Formulario "Crear rutina" de GYM/Calistenia. Órbita desde la Fase 9b
// (css/entreno.css); los ids y clases que lee el guardado son los de siempre.

const ESTANDARES_SET = new Set(LEVANTAMIENTOS_ID);

// Índice de autocompletado: solo ejercicios de ESTA categoría (Estándares
// de Fuerza y Árbol de Progresión también filtran por categoría, así que
// mezclar ejercicios de otra acá solo generaría matches que no cuentan
// para nada en la categoría en la que el usuario está parado).
function catalogoDeCategoria(categoria) {
  return Object.values(CATALOGO_EJERCICIOS)
    .filter(e => e.categoria === categoria)
    .map(e => ({ nombre: e.nombre, grupoMuscular: e.grupoMuscular, esEstandar: ESTANDARES_SET.has(e.id) }));
}

const linkSvg = `<svg class="o-ent-ico-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

const generarIdGrupo = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

export function renderRutinaForm(categoria) {
  return `
    <section class="o-card o-ent-form">
      <h2 class="o-ent-titulo">Crear rutina</h2>

      <div class="o-campo">
        <label for="rutina-nombre">Nombre de la rutina</label>
        <input type="text" id="rutina-nombre" class="o-input" placeholder="Ej. Empuje Pesado" autocomplete="off">
      </div>

      <div id="ejercicios-container" class="o-ent-form-ejs">
        <!-- Ejercicios: se agregan desde initRutinaFormListeners -->
      </div>

      <p class="o-ent-nota">
        Empieza a escribir y elige de la lista para que tus series cuenten en <b>Estándares de fuerza</b> y en el <b>Árbol de Progresión</b>. Puedes seguir escribiendo cualquier nombre si prefieres.
      </p>

      <button id="btn-add-ejercicio" type="button" class="o-btn o-btn--secundario o-btn--bloque">Agregar ejercicio</button>

      <button id="btn-guardar-rutina" type="button" class="o-btn o-btn--primario o-btn--bloque">Guardar rutina</button>
    </section>
  `;
}

export function initRutinaFormListeners(categoria, onSuccess, signal) {
  const container = document.getElementById('ejercicios-container');
  const btnAdd = document.getElementById('btn-add-ejercicio');
  const btnSave = document.getElementById('btn-guardar-rutina');
  
  const isCalistenia = categoria === 'calistenia';
  const pesoHelper = isCalistenia ? ' (kg, - banda / + lastre)' : ' (kg)';
  const catalogo = catalogoDeCategoria(categoria);

  const createSerieRowHTML = () => {
    return `
      <div class="serie-row o-ent-serie">
        <select class="serie-tipo o-input" aria-label="Tipo de serie">
          <option value="normal">Normal</option>
          <option value="calentamiento">Calentamiento</option>
          <option value="fallo">Fallo</option>
          <option value="dropset">Drop set</option>
        </select>
        <input type="text" inputmode="numeric" class="serie-reps o-input o-num" placeholder="Reps" aria-label="Repeticiones">
        <input type="number" inputmode="decimal" enterkeyhint="done" class="serie-peso o-input o-num" placeholder="Peso" aria-label="Peso en kg">
        <button type="button" class="btn-remove-serie o-btn o-btn--fantasma o-btn--icono" aria-label="Quitar serie">${oIcono('cerrar')}</button>
      </div>
    `;
  };

  const addEjercicioRow = () => {
    const div = document.createElement('div');
    div.className = 'ejercicio-block o-ent-ej-bloque';

    div.innerHTML = `
      <div class="o-ent-ej-bloque-cab">
        <div class="ej-nombre-wrap o-ent-ac-wrap">
          <input type="text" class="ej-nombre o-input" placeholder="Nombre del ejercicio" aria-label="Nombre del ejercicio" autocomplete="off">
          <div class="ej-nombre-ac o-ent-ac" hidden></div>
        </div>
        <button type="button" class="btn-remove-ej o-btn o-btn--fantasma o-btn--icono" aria-label="Quitar ejercicio">${oIcono('cerrar')}</button>
      </div>

      <p class="o-campo-etiqueta">Series, repeticiones y peso${pesoHelper}</p>
      <div class="series-container o-ent-series">
        ${createSerieRowHTML()}
      </div>

      <button type="button" class="btn-add-serie o-btn o-btn--fantasma o-btn--bloque">Añadir serie</button>
      <button type="button" class="btn-agrupar-sup o-btn o-btn--secundario o-btn--bloque" aria-pressed="false">${linkSvg}<span>Agrupar en superserie con el anterior</span></button>
    `;

    div.dataset.superset = 'false';
    div.querySelector('.btn-remove-ej').addEventListener('click', () => div.remove());

    const btnAgrupar = div.querySelector('.btn-agrupar-sup');
    const actualizarBotonAgrupar = () => {
      const activo = div.dataset.superset === 'true';
      const prevBlock = div.previousElementSibling;
      const prevNombre = (prevBlock && prevBlock.querySelector('.ej-nombre').value.trim()) || 'el ejercicio anterior';
      btnAgrupar.setAttribute('aria-pressed', String(activo));
      btnAgrupar.innerHTML = activo
        ? `${linkSvg}<span>Agrupado en superserie con ${escapeHtml(prevNombre)}</span>`
        : `${linkSvg}<span>Agrupar en superserie con el anterior</span>`;
    };
    btnAgrupar.addEventListener('click', () => {
      div.dataset.superset = div.dataset.superset === 'true' ? 'false' : 'true';
      actualizarBotonAgrupar();
    });

    // Autocompletado contra el catálogo de esta categoría — el input sigue
    // siendo texto libre (nunca bloquea guardar con lo que sea que esté
    // tipeado), esto solo ofrece coincidencias para que el nombre termine
    // siendo el EXACTO del catálogo, que es lo único que hace que las
    // series cuenten en Estándares de Fuerza/Árbol de Progresión (matching
    // exacto en minúsculas, ver ejercicios-catalogo.js).
    const inputNombre = div.querySelector('.ej-nombre');
    const acList = div.querySelector('.ej-nombre-ac');
    const cerrarDropdown = () => { acList.hidden = true; acList.innerHTML = ''; };
    const mostrarSugerencias = () => {
      const q = inputNombre.value.trim().toLowerCase();
      if (!q) { cerrarDropdown(); return; }
      // Por palabra, no substring literal completo: "Press ba" (saltando
      // "de") no matchea "Press de Banca" con un .includes(q) de la
      // consulta entera, aunque cada palabra suelta sí está ahí. Exigir
      // que TODAS las palabras tipeadas aparezcan en algún lado del
      // nombre cubre ese caso sin dejar de filtrar razonablemente.
      const palabras = q.split(/\s+/).filter(Boolean);
      const matches = catalogo.filter(e => {
        const nombreLower = e.nombre.toLowerCase();
        return palabras.every(p => nombreLower.includes(p));
      }).slice(0, 6);

      const itemsHtml = matches.map(e => `
        <div class="ac-item o-ent-ac-item" data-nombre="${escapeHtml(e.nombre)}">
          <span class="o-ent-ac-nombre">${escapeHtml(e.nombre)} <span class="o-ent-ac-grupo">· ${GRUPO_MUSCULAR_LABELS[e.grupoMuscular] || e.grupoMuscular}</span></span>
          ${e.esEstandar ? `<span class="o-ent-ac-estandar">Estándar</span>` : ''}
        </div>
      `).join('');
      const libreHtml = `<div class="ac-item ac-item-libre o-ent-ac-item o-ent-ac-libre">Usar "${escapeHtml(inputNombre.value.trim())}" tal cual (no vinculado a Estándares)</div>`;

      acList.innerHTML = itemsHtml + libreHtml;
      acList.hidden = false;

      acList.querySelectorAll('.ac-item[data-nombre]').forEach(item => {
        // mousedown, no click: dispara ANTES del blur del input, que si no
        // cierra el dropdown primero y el click nunca llega a su target.
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          inputNombre.value = item.getAttribute('data-nombre');
          cerrarDropdown();
          actualizarBotonAgrupar();
        });
      });
      const libreItem = acList.querySelector('.ac-item-libre');
      if (libreItem) libreItem.addEventListener('mousedown', (e) => { e.preventDefault(); cerrarDropdown(); });
    };
    inputNombre.addEventListener('input', mostrarSugerencias);
    inputNombre.addEventListener('focus', mostrarSugerencias);
    inputNombre.addEventListener('blur', cerrarDropdown);
    inputNombre.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarDropdown(); });

    const seriesContainer = div.querySelector('.series-container');
    div.querySelector('.btn-add-serie').addEventListener('click', () => {
      const rowDiv = document.createElement('div');
      rowDiv.innerHTML = createSerieRowHTML();
      const newSerie = rowDiv.firstElementChild;
      
      newSerie.querySelector('.btn-remove-serie').addEventListener('click', () => {
        if (seriesContainer.children.length > 1) newSerie.remove();
      });
      seriesContainer.appendChild(newSerie);
    });

    // attach remove event to the default first series
    div.querySelector('.btn-remove-serie').addEventListener('click', (e) => {
      if (seriesContainer.children.length > 1) e.currentTarget.parentElement.remove();
    });

    container.appendChild(div);
  };

  addEjercicioRow();

  btnAdd.addEventListener('click', addEjercicioRow);

  btnSave.addEventListener('click', async () => {
    const nombre = document.getElementById('rutina-nombre').value.trim();
    if (!nombre) return Toast('Debes darle un nombre a la rutina', 'warning');

    const ejercicios = [];
    // pendingGroupId encadena supersets de 2+ ejercicios: si el anterior ya
    // tiene grupo (venía de ser agrupado él mismo), este se suma al mismo
    // grupo en vez de crear uno nuevo — así "A agrupado con B" + "C
    // agrupado con B" arma un solo trío, no dos pares sueltos.
    let pendingGroupId = null;
    container.querySelectorAll('.ejercicio-block').forEach(block => {
      const eNombre = block.querySelector('.ej-nombre').value.trim();
      if (eNombre) {
        const series = [];
        block.querySelectorAll('.serie-row').forEach(row => {
          series.push({
            tipo: row.querySelector('.serie-tipo').value,
            reps: row.querySelector('.serie-reps').value.trim() || '0',
            peso: parseFloat(row.querySelector('.serie-peso').value) || 0
          });
        });

        const agrupado = block.dataset.superset === 'true' && ejercicios.length > 0;
        let grupoId = null;
        if (agrupado) {
          if (!pendingGroupId) {
            pendingGroupId = generarIdGrupo();
            ejercicios[ejercicios.length - 1].grupoId = pendingGroupId;
          }
          grupoId = pendingGroupId;
        } else {
          pendingGroupId = null;
        }

        ejercicios.push({
          nombre: eNombre,
          series: series,
          grupoId
        });
      }
    });

    if (ejercicios.length === 0) return Toast('Agrega al menos un ejercicio', 'warning');

    await db.crearRutina({
      nombre,
      categoria,
      ejercicios
    });

    if (onSuccess) onSuccess();
  });
}