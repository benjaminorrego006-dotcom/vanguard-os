import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { CATALOGO_EJERCICIOS, GRUPO_MUSCULAR_LABELS } from '../core/ejercicios-catalogo.js';
import { LEVANTAMIENTOS_ID } from '../core/estandares-fuerza.js';

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

const linkSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px; flex-shrink: 0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

const generarIdGrupo = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

export function renderRutinaForm(categoria) {
  return `
    <div class="card" style="padding: 22px; border-radius: 20px;">
      <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 20px 0; color: var(--text-primary); letter-spacing: -0.3px;">Crear Rutina</h2>

      <div class="input-group" style="margin-bottom: 20px;">
        <label for="rutina-nombre">Nombre de la rutina</label>
        <input type="text" id="rutina-nombre" placeholder="Ej. Empuje Pesado" autocomplete="off">
      </div>

      <style>
        #ejercicios-container .ejercicio-block:first-child .btn-agrupar-sup { display: none !important; }
      </style>
      <div id="ejercicios-container" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 14px;">
        <!-- Ejercicios dynamically added here -->
      </div>

      <div style="background: color-mix(in srgb, var(--accent-teal) 10%, transparent); border-left: 3px solid var(--accent-teal); border-radius: 0 10px 10px 0; padding: 10px 12px; font-size: 11.5px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">
        Empezá a tipear y elegí de la lista para que tus series cuenten en <b style="color: var(--accent-teal);">Estándares de Fuerza</b> y en el <b style="color: var(--accent-teal);">Árbol de Progresión</b>. Podés seguir escribiendo cualquier nombre si preferís.
      </div>

      <button id="btn-add-ejercicio" type="button" class="tappable" style="width: 100%; padding: 13px; border-radius: 12px; background: transparent; border: 1px dashed var(--surface-border); color: var(--text-secondary); font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 24px;">
        + Agregar ejercicio
      </button>

      <button id="btn-guardar-rutina" class="btn-primary tappable" style="background: var(--accent-teal);">
        Guardar Rutina
      </button>
    </div>
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
      <div class="serie-row" style="display: flex; gap: 8px; align-items: center;">
        <select class="serie-tipo" style="flex: 1; min-width:0; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 10px; padding: 9px 8px; color: var(--text-primary); font-size: 16px;">
          <option value="normal">Normal</option>
          <option value="calentamiento">Calentamiento</option>
          <option value="fallo">Fallo</option>
          <option value="dropset">Drop Set</option>
        </select>
        <input type="text" inputmode="numeric" class="serie-reps" placeholder="Reps" style="width: 60px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 10px; padding: 9px 8px; color: var(--text-primary); font-size: 16px; box-sizing: border-box;">
        <input type="number" inputmode="decimal" enterkeyhint="done" class="serie-peso" placeholder="Peso" style="width: 70px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 10px; padding: 9px 8px; color: var(--text-primary); font-size: 16px; box-sizing: border-box;">
        <button class="btn-remove-serie" style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer; font-size: 18px; flex-shrink: 0;">&times;</button>
      </div>
    `;
  };

  const addEjercicioRow = () => {
    const div = document.createElement('div');
    div.className = 'ejercicio-block';
    div.style.cssText = 'background: var(--surface-2); padding: 16px; border-radius: 16px; border: 1px solid var(--surface-border); display: flex; flex-direction: column; gap: 12px; position: relative;';

    div.innerHTML = `
      <button class="btn-remove-ej" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: var(--text-disabled); cursor: pointer; font-size: 20px;">&times;</button>
      <div class="ej-nombre-wrap" style="position: relative; width: calc(100% - 30px); margin-bottom: 4px;">
        <input type="text" class="ej-nombre" placeholder="Nombre del ejercicio" autocomplete="off" style="width: 100%; box-sizing: border-box; background: transparent; border: none; border-bottom: 1px solid var(--surface-border); padding: 4px 0; color: var(--text-primary); font-size: 16px; font-weight: 700; outline: none;">
        <div class="ej-nombre-ac" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 10px; overflow: hidden; z-index: 20; box-shadow: 0 8px 24px rgba(0,0,0,0.4);"></div>
      </div>

      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: -4px;">Series, Repeticiones y Peso${pesoHelper}</div>
      <div class="series-container" style="display: flex; flex-direction: column; gap: 8px;">
        ${createSerieRowHTML()}
      </div>

      <button class="btn-add-serie" style="background: transparent; border: 1px dashed var(--surface-border); color: var(--text-secondary); border-radius: 10px; padding: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; margin-top: 4px;">+ Añadir serie</button>
      <button class="btn-agrupar-sup" style="background: var(--surface-2); border: 1px dashed var(--surface-border); color: var(--text-primary); border-radius: 10px; padding: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; margin-top: 4px;">${linkSvg}Agrupar en superserie con el anterior</button>
    `;

    div.dataset.superset = 'false';
    div.querySelector('.btn-remove-ej').addEventListener('click', () => div.remove());

    const btnAgrupar = div.querySelector('.btn-agrupar-sup');
    const actualizarBotonAgrupar = () => {
      const activo = div.dataset.superset === 'true';
      const prevBlock = div.previousElementSibling;
      const prevNombre = (prevBlock && prevBlock.querySelector('.ej-nombre').value.trim()) || 'el ejercicio anterior';
      if (activo) {
        btnAgrupar.style.cssText = 'display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--state-medium) 14%, transparent); border: 1px solid var(--state-medium); color: var(--state-medium); border-radius: 10px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer; text-align: center; margin-top: 4px;';
        btnAgrupar.innerHTML = `${linkSvg}Agrupado en superserie con ${escapeHtml(prevNombre)}`;
      } else {
        btnAgrupar.style.cssText = 'display: flex; align-items: center; justify-content: center; background: var(--surface-2); border: 1px dashed var(--surface-border); color: var(--text-primary); border-radius: 10px; padding: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; margin-top: 4px;';
        btnAgrupar.innerHTML = `${linkSvg}Agrupar en superserie con el anterior`;
      }
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
    const cerrarDropdown = () => { acList.style.display = 'none'; acList.innerHTML = ''; };
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
        <div class="ac-item tappable" data-nombre="${escapeHtml(e.nombre)}" style="padding: 10px 12px; font-size: 12.5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 8px; border-bottom: 1px solid var(--surface-border);">
          <span style="color: var(--text-primary); font-weight: 600; min-width: 0;">${escapeHtml(e.nombre)} <span style="color: var(--text-disabled); font-weight: 500;">· ${GRUPO_MUSCULAR_LABELS[e.grupoMuscular] || e.grupoMuscular}</span></span>
          ${e.esEstandar ? `<span style="font-size: 9px; font-weight: 700; color: var(--accent-teal); background: color-mix(in srgb, var(--accent-teal) 14%, transparent); padding: 1px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.03em; flex-shrink: 0;">Estándar</span>` : ''}
        </div>
      `).join('');
      const libreHtml = `<div class="ac-item ac-item-libre tappable" style="padding: 10px 12px; font-size: 12px; cursor: pointer; color: var(--text-secondary); font-style: italic;">+ Usar "${escapeHtml(inputNombre.value.trim())}" tal cual (no vinculado a Estándares)</div>`;

      acList.innerHTML = itemsHtml + libreHtml;
      acList.style.display = 'block';

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