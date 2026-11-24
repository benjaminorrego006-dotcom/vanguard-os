import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';
import { esperarSalidaDeModal } from '../core/history.js';

// Hoja de alta/edición de hábito (Órbita, Fase 6). Un hábito declara
// frecuencia (todo hábito viejo sin este campo se trata como 'diario') y,
// opcionalmente, una meta numérica (cantidad + unidad: "8 vasos") en vez de
// un simple cumplido/no cumplido. Es un .modal-overlay con id (oHoja):
// history.js la cierra con el botón atrás.
const ID = 'habito-modal';
const DOW_FORM = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // 0=lunes..6=domingo, mismo orden que habitos.js
const DOW_NOMBRE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const OPCIONES = [
  { value: 'diario', label: 'Diario' },
  { value: 'dias', label: 'Algunos días' },
  { value: 'semanal', label: 'X por semana' }
];

export function renderHabitoForm() {
  const cuerpo = `
    <form id="habito-form" class="o-hab-form" onsubmit="return false;" novalidate>
      <div class="o-campo">
        <label for="habito-nombre">Nombre del hábito</label>
        <input type="text" id="habito-nombre" class="o-input" placeholder="Ej.: Entrenar 45 min" maxlength="60" enterkeyhint="done" autocomplete="off">
        <input type="hidden" id="habito-id">
      </div>

      <div class="o-campo">
        <span class="o-campo-etiqueta" id="habito-frec-etq">Frecuencia</span>
        <div id="frecuencia-picker" class="o-hab-opciones" role="group" aria-labelledby="habito-frec-etq">
          ${OPCIONES.map(o => `<button type="button" class="o-chip btn-frecuencia-chip" data-frecuencia="${o.value}" aria-pressed="false">${o.label}</button>`).join('')}
        </div>
        <div id="frecuencia-dias-picker" class="o-hab-dias-form" role="group" aria-label="Días de la semana" hidden>
          ${DOW_FORM.map((letra, i) => `<button type="button" class="o-chip btn-frecuencia-dia" data-dow="${i}" aria-pressed="false" aria-label="${DOW_NOMBRE[i]}">${letra}</button>`).join('')}
        </div>
        <div id="frecuencia-semanal-picker" class="o-hab-semanal" hidden>
          <label for="habito-veces-objetivo">Al menos</label>
          <input type="number" id="habito-veces-objetivo" class="o-input" min="1" max="7" value="3" inputmode="numeric">
          <span>veces por semana</span>
        </div>
      </div>

      <div class="o-campo">
        <label class="o-hab-interruptor" for="habito-tiene-meta">
          <input type="checkbox" id="habito-tiene-meta">
          <span>Tiene una meta numérica (ej.: 8 vasos de agua)</span>
        </label>
        <div id="habito-meta-campos" class="o-hab-meta" hidden>
          <div class="o-campo">
            <label for="habito-meta-cantidad">Cantidad</label>
            <input type="number" id="habito-meta-cantidad" class="o-input" min="1" placeholder="8" inputmode="numeric">
          </div>
          <div class="o-campo">
            <label for="habito-meta-unidad">Unidad</label>
            <input type="text" id="habito-meta-unidad" class="o-input" placeholder="vasos" maxlength="20" autocomplete="off">
          </div>
        </div>
      </div>

      <!-- Recordatorio opcional (docs/RECORDATORIOS-PLAN.md, F4): la hora
           vive en settings.recordatorios.habitos.horas[id]. -->
      <div class="o-campo">
        <label for="habito-recordar">Recordarme a las… (opcional)</label>
        <input type="time" id="habito-recordar" class="o-input">
        <p id="habito-recordar-nota" class="o-campo-ayuda"></p>
      </div>
    </form>`;
  return oHoja({
    id: ID, modulo: 'habitos', titulo: 'Nuevo hábito', cuerpo,
    pie: '<button type="button" class="o-btn o-btn--secundario" data-hoja-cerrar>Cancelar</button><button type="submit" form="habito-form" id="btn-save-habito" class="o-btn o-btn--primario">Guardar</button>'
  });
}

// Estado de los selectores de frecuencia: vive en el módulo (no en el DOM)
// porque "algunos días" es una selección múltiple que no mapea a un solo
// input nativo.
let frecuenciaTipoActual = 'diario';
let diasSeleccionados = new Set();

function pintarFrecuencia() {
  document.querySelectorAll('.btn-frecuencia-chip').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('data-frecuencia') === frecuenciaTipoActual));
  });
  const diasPicker = document.getElementById('frecuencia-dias-picker');
  const semanalPicker = document.getElementById('frecuencia-semanal-picker');
  if (diasPicker) diasPicker.hidden = frecuenciaTipoActual !== 'dias';
  if (semanalPicker) semanalPicker.hidden = frecuenciaTipoActual !== 'semanal';
}

function pintarDias() {
  document.querySelectorAll('.btn-frecuencia-dia').forEach(btn => {
    btn.setAttribute('aria-pressed', String(diasSeleccionados.has(Number(btn.getAttribute('data-dow')))));
  });
}

export function setupHabitoForm(onSaveCallback) {
  const input = document.getElementById('habito-nombre');
  const checkMeta = document.getElementById('habito-tiene-meta');
  const camposMeta = document.getElementById('habito-meta-campos');
  const guardar = document.getElementById('btn-save-habito');
  if (!input) return;
  montarHoja(ID);

  document.querySelectorAll('.btn-frecuencia-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      frecuenciaTipoActual = btn.getAttribute('data-frecuencia');
      pintarFrecuencia();
    });
  });

  document.querySelectorAll('.btn-frecuencia-dia').forEach(btn => {
    btn.addEventListener('click', () => {
      const dow = Number(btn.getAttribute('data-dow'));
      if (diasSeleccionados.has(dow)) diasSeleccionados.delete(dow);
      else diasSeleccionados.add(dow);
      pintarDias();
    });
  });

  checkMeta.addEventListener('change', () => { camposMeta.hidden = !checkMeta.checked; });

  const save = async () => {
    const nombre = input.value.trim();
    if (!nombre) { input.focus(); return Toast('Escribe un nombre para el hábito', 'warning'); }

    if (frecuenciaTipoActual === 'dias' && diasSeleccionados.size === 0) {
      return Toast('Elige al menos un día', 'warning');
    }

    const frecuencia = frecuenciaTipoActual === 'dias'
      ? { tipo: 'dias', dias: Array.from(diasSeleccionados).sort() }
      : frecuenciaTipoActual === 'semanal'
        ? { tipo: 'semanal', vecesObjetivo: Math.max(1, Math.min(7, parseInt(document.getElementById('habito-veces-objetivo').value, 10) || 3)) }
        : { tipo: 'diario' };

    const tieneMeta = checkMeta.checked;
    const cantidad = parseFloat(document.getElementById('habito-meta-cantidad').value);
    const unidad = document.getElementById('habito-meta-unidad').value.trim();
    if (tieneMeta && (!cantidad || cantidad <= 0)) return Toast('Ingresa una cantidad para la meta', 'warning');
    const meta = tieneMeta ? { cantidad, unidad: unidad || 'veces' } : null;

    guardar.disabled = true;
    try {
      const id = document.getElementById('habito-id').value;
      const horaAviso = document.getElementById('habito-recordar').value;
      let idGuardado = id;
      if (id) {
        await db.renombrarHabito(id, nombre);
        await db.actualizarConfigHabito(id, { frecuencia, meta });
      } else {
        const nuevo = await db.crearHabito(nombre, { frecuencia, meta });
        idGuardado = nuevo && nuevo.id;
      }
      // La hora del recordatorio: solo se guarda si cambió.
      if (idGuardado) {
        const prefs = await db.getPrefsRecordatorios();
        const antes = prefs.habitos.horas[idGuardado] || '';
        if (antes !== horaAviso) {
          if (horaAviso) prefs.habitos.horas[idGuardado] = horaAviso;
          else delete prefs.habitos.horas[idGuardado];
          await db.savePrefsRecordatorios(prefs);
        }
      }
      Toast(id ? 'Hábito actualizado' : 'Hábito creado', 'success');
      await cerrarHoja(ID);
      await esperarSalidaDeModal(ID);
      if (onSaveCallback) await onSaveCallback();
    } catch (err) {
      console.error('Error al guardar el hábito:', err);
      Toast('No se pudo guardar. Inténtalo de nuevo.', 'error');
    } finally {
      guardar.disabled = false;
    }
  };

  bindQuickCaptureForm(document.getElementById('habito-form'), save);
}

export function openHabitoForm(habito = null) {
  if (!document.getElementById(ID)) return;
  const titleEl = document.getElementById(`${ID}-titulo`);
  const nombreInput = document.getElementById('habito-nombre');
  const checkMeta = document.getElementById('habito-tiene-meta');

  const frecuencia = (habito && habito.frecuencia) || { tipo: 'diario' };
  frecuenciaTipoActual = frecuencia.tipo || 'diario';
  diasSeleccionados = new Set(frecuencia.dias || []);
  document.getElementById('habito-veces-objetivo').value = frecuencia.vecesObjetivo || 3;

  const meta = (habito && habito.meta) || null;
  checkMeta.checked = !!meta;
  document.getElementById('habito-meta-campos').hidden = !meta;
  document.getElementById('habito-meta-cantidad').value = meta ? meta.cantidad : '';
  document.getElementById('habito-meta-unidad').value = meta ? meta.unidad : '';

  pintarFrecuencia();
  pintarDias();

  titleEl.textContent = habito ? 'Editar hábito' : 'Nuevo hábito';
  document.getElementById('habito-id').value = habito ? habito.id : '';
  nombreInput.value = habito ? (habito.nombre || '') : '';

  // Hora del recordatorio (id capturado antes del await).
  const idAviso = habito ? habito.id : null;
  const inputAviso = document.getElementById('habito-recordar');
  const notaAviso = document.getElementById('habito-recordar-nota');
  inputAviso.value = '';
  notaAviso.textContent = '';
  db.getPrefsRecordatorios().then(prefs => {
    if (document.getElementById('habito-id')?.value !== (idAviso || '')) return;
    inputAviso.value = (idAviso && prefs.habitos.horas[idAviso]) || '';
    notaAviso.textContent = prefs.habitos.activo
      ? 'Llega solo los días que aplica y si todavía no lo marcas.'
      : 'Los avisos de hábitos están apagados: actívalos en Configuración › Recordatorios.';
  });

  abrirHoja(ID);
}
