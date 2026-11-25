// Onboarding del sistema de nivel (PROMPT-NIVEL-FILTRADO.md, paso 2): 3
// preguntas, una por pantalla, respuesta de un toque. Se abre solo al
// entrar por primera vez a Entrenamiento, o manualmente desde el ícono de
// nivel junto al de perfil — y se puede repetir después para corregir.
//
// Guarda en dos lugares distintos a propósito, para no duplicar estado que
// ya existe: tiempoEntrenando es dato nuevo (db.saveNivelEntrenamiento);
// días y equipo se comparten con el generador de rutinas
// (db.saveGeneradorConfig, Etapa 4a) — completar esto también precompleta
// el generador. Sexo NO se pregunta acá: ya lo pide el perfil (IMC/gasto
// calórico) y Estándares de Fuerza lo lee de ahí directamente.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { diaKeyDe } from '../utils/fecha.js';
import { EQUIPO_OPCIONES } from '../core/trainingConfig.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';

const TIEMPO_OPCIONES = [
  { value: 'menos-1', label: 'Menos de 1 año', ayuda: 'Recién empezando o volviendo después de una pausa larga.' },
  { value: '1-3', label: '1 a 3 años', ayuda: 'Ya conoces los movimientos básicos y entrenas con cierta regularidad.' },
  { value: 'mas-3', label: 'Más de 3 años', ayuda: 'Entrenas hace tiempo, con experiencia real en progresión de cargas.' }
];

const TOTAL_PASOS = 3;

// Respuestas en curso del wizard — vive a nivel de módulo (no dentro de
// setup/open) porque ambas funciones necesitan leerla y escribirla: setup
// la llena cuando el usuario toca una opción, open la prellena si ya había
// respuestas guardadas, sin simular clicks ni disparar navegación como
// efecto secundario de la precarga.
const respuestas = { tiempoEntrenando: null, diasSemana: null };
let pasoActual = 1;

// Órbita (oHoja, Fase 9e): el título de la hoja es la pregunta del paso.
const ID = 'nivel-onboarding-modal';
const TITULOS = ['¿Cuánto tiempo llevas entrenando?', '¿Cuántos días por semana puedes entrenar?', '¿Qué equipo tienes disponible?'];

function renderDots() {
  return Array.from({ length: TOTAL_PASOS }, (_, i) => `<span class="o-ent-paso"${i + 1 === pasoActual ? ' aria-current="step"' : ''}></span>`).join('');
}

function mostrarPaso(n) {
  pasoActual = n;
  document.querySelectorAll('.nivel-onboarding-paso').forEach((el, i) => el.style.display = i + 1 === n ? '' : 'none');
  const titulo = document.getElementById(`${ID}-titulo`);
  if (titulo) titulo.textContent = TITULOS[n - 1];
  const dots = document.getElementById('nivel-onboarding-dots');
  if (dots) {
    dots.innerHTML = renderDots();
    dots.setAttribute('aria-label', `Paso ${n} de ${TOTAL_PASOS}`);
  }
}

// "Ahora no": oculta la apertura automática al entrar a Entreno hasta mañana
// (fecha por diaKeyDe en localStorage: preferencia de UI, no dato de la
// app). No afecta a la apertura manual desde el ícono de nivel.
const NIVEL_AHORA_NO_KEY = 'vg-nivel-ahora-no';

export function nivelPospuestoHoy() {
  try { return localStorage.getItem(NIVEL_AHORA_NO_KEY) === diaKeyDe(new Date()); }
  catch (e) { return false; /* modo privado — mostrar el modal igual */ }
}

function posponerNivelHoy() {
  try { localStorage.setItem(NIVEL_AHORA_NO_KEY, diaKeyDe(new Date())); }
  catch (e) { /* modo privado */ }
}

export function renderNivelOnboardingForm() {
  const cuerpo = `
    <div id="nivel-onboarding-dots" class="o-ent-pasos" role="img" aria-label="Paso 1 de ${TOTAL_PASOS}">${renderDots()}</div>

    <div id="nivel-onboarding-paso-1" class="nivel-onboarding-paso o-ent-nivel-paso">
      <p class="o-card-texto">Es tu punto de partida, no la última palabra — si tu historial muestra que ya estás más avanzado, la app te lo va a sugerir después.</p>
      <div class="o-ent-nivel-opciones">
        ${TIEMPO_OPCIONES.map(o => `
          <button type="button" class="o-fila nivel-onboarding-tiempo-btn" data-value="${o.value}">
            <span class="o-fila-texto"><b>${o.label}</b> <small>${o.ayuda}</small></span>
          </button>
        `).join('')}
      </div>
      <button type="button" id="btn-nivel-onboarding-ahora-no" class="o-btn o-btn--secundario o-btn--bloque">Ahora no</button>
    </div>

    <div id="nivel-onboarding-paso-2" class="nivel-onboarding-paso o-ent-nivel-paso" style="display: none;">
      <p class="o-card-texto">Define si tus rutinas priorizan ejercicios compuestos (pocos días) o suman aislamiento (más días).</p>
      <div class="o-ent-nivel-dias">
        ${[1, 2, 3, 4, 5, 6, 7].map(n => `
          <button type="button" class="o-chip nivel-onboarding-dias-btn" data-value="${n}"><span class="o-num">${n}</span></button>
        `).join('')}
      </div>
      <button type="button" id="btn-nivel-onboarding-atras-2" class="o-btn o-btn--secundario o-btn--bloque">Atrás</button>
    </div>

    <div id="nivel-onboarding-paso-3" class="nivel-onboarding-paso o-ent-nivel-paso" style="display: none;">
      <p class="o-card-texto">Filtra los ejercicios que la app te va a proponer. Puedes dejarlo vacío si solo entrenas con peso corporal.</p>
      <div class="o-ent-equipo">
        ${EQUIPO_OPCIONES.map(o => `
          <label for="nivel-onboarding-equipo-${o.value}" class="o-ent-casilla">
            <input type="checkbox" id="nivel-onboarding-equipo-${o.value}" class="nivel-onboarding-equipo-check" value="${o.value}">
            ${o.label}
          </label>
        `).join('')}
      </div>
      <div class="o-ent-acciones">
        <button type="button" id="btn-nivel-onboarding-atras-3" class="o-btn o-btn--secundario">Atrás</button>
        <button type="button" id="btn-nivel-onboarding-finalizar" class="o-btn o-btn--primario">Finalizar</button>
      </div>
    </div>`;
  return oHoja({ id: ID, modulo: 'entreno', titulo: TITULOS[0], cuerpo });
}

export function setupNivelOnboardingForm(onFinalizado) {
  const modal = document.getElementById('nivel-onboarding-modal');
  if (!modal) return;

  montarHoja(ID);
  const close = () => cerrarHoja(ID);

  modal.querySelectorAll('.nivel-onboarding-tiempo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      respuestas.tiempoEntrenando = btn.dataset.value;
      mostrarPaso(2);
    });
  });

  modal.querySelectorAll('.nivel-onboarding-dias-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      respuestas.diasSemana = parseInt(btn.dataset.value, 10);
      mostrarPaso(3);
    });
  });

  // Sin nivel guardado es "Ahora no" (pospone el día); con nivel guardado
  // (corrección manual) es solo "Cancelar".
  const btnAhoraNo = document.getElementById('btn-nivel-onboarding-ahora-no');
  btnAhoraNo.addEventListener('click', () => {
    if (btnAhoraNo.dataset.modo === 'onboarding') posponerNivelHoy();
    close();
  });

  document.getElementById('btn-nivel-onboarding-atras-2').addEventListener('click', () => mostrarPaso(1));
  document.getElementById('btn-nivel-onboarding-atras-3').addEventListener('click', () => mostrarPaso(2));

  document.getElementById('btn-nivel-onboarding-finalizar').addEventListener('click', async () => {
    const equipoDisponible = [...modal.querySelectorAll('.nivel-onboarding-equipo-check:checked')].map(el => el.value);
    const btn = document.getElementById('btn-nivel-onboarding-finalizar');
    btn.disabled = true;
    try {
      await db.saveNivelEntrenamiento({ tiempoEntrenando: respuestas.tiempoEntrenando });
      // Lee la config existente para no pisar duracionSesionMin si el
      // usuario ya la había ajustado desde "Generar rutina".
      const configPrevia = await db.getGeneradorConfig();
      await db.saveGeneradorConfig({
        equipoDisponible,
        diasSemana: respuestas.diasSemana,
        duracionSesionMin: configPrevia?.duracionSesionMin
      });
      close();
      Toast('Perfil de nivel guardado', 'success');
      if (onFinalizado) onFinalizado();
    } catch (err) {
      console.error('Error guardando el perfil de nivel:', err);
      Toast('No se pudo guardar — inténtalo de nuevo.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

// Prellena las respuestas previas (si las hay) sin simular clicks ni
// disparar navegación — así reabrir el onboarding desde el ícono de nivel
// permite corregir datos ya guardados en vez de repetir todo desde cero,
// y siempre arranca mostrando el paso 1.
export async function openNivelOnboardingForm() {
  const modal = document.getElementById('nivel-onboarding-modal');
  if (!modal) return;

  const [nivel, config] = await Promise.all([db.getNivelEntrenamiento(), db.getGeneradorConfig()]);

  respuestas.tiempoEntrenando = nivel?.tiempoEntrenando || null;
  respuestas.diasSemana = config?.diasSemana || null;

  const equipoGuardado = new Set(config?.equipoDisponible || []);
  modal.querySelectorAll('.nivel-onboarding-equipo-check').forEach(el => {
    el.checked = equipoGuardado.has(el.value);
  });

  const btnAhoraNo = document.getElementById('btn-nivel-onboarding-ahora-no');
  btnAhoraNo.textContent = nivel ? 'Cancelar' : 'Ahora no';
  btnAhoraNo.dataset.modo = nivel ? '' : 'onboarding';

  mostrarPaso(1);
  abrirHoja(ID);
}
