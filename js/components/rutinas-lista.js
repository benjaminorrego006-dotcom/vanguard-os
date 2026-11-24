import { db } from '../core/db.js';
import { PLANTILLAS } from '../core/plantillas.js';
import { getEjercicioPorId, agruparPorGrupoMuscular, grupoMuscularParaMapa } from '../core/ejercicios-catalogo.js';
import { RAMA_LABELS } from '../core/progresiones.js';
import { esDescansoActivo, renderDescansoActivoCard } from './descanso-activo.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { formatDiaSemana } from '../utils/fecha.js';
import { oIcono, oVacio } from './orbita.js';
import { MuscleMap, calcularFatigaPorGrupo, expandirIntensidadPorMusculo } from './mk3-muscle-map.js';
import { VISTA, GRUPOS_MUSCULARES } from './mk3-muscle-map-data.js';

// Lista de rutinas de una categoría (pestaña Rutinas de Entreno), vista
// previa de plantilla y de rutina generada. Órbita desde la Fase 9b
// (estilos en css/entreno.css); los ids y clases que leen los listeners
// son los de siempre. data-foto marca lo que compara
// tools/verificar/foto-rutinas.mjs.

// Escala de dificultad para ordenar "Plantillas sugeridas" de menor a mayor.
// 'Todos los niveles' se trata como accesible para principiantes (rango 1).
const NIVEL_ORDEN = {
  'Principiante': 1,
  'Todos los niveles': 1,
  'Principiante-Intermedio': 2,
  'Intermedio': 3,
  'Intermedio-Avanzado': 4,
  'Avanzado': 5
};
function ordenarPorNivel(plantillas) {
  return [...plantillas].sort((a, b) => (NIVEL_ORDEN[a.nivel] || 99) - (NIVEL_ORDEN[b.nivel] || 99));
}

const setsResumen = (series) => {
  if (!series || series.length === 0) return '';
  const reps = series[0].reps;
  return ` — ${series.length}×${reps}`;
};

const ICO_BORRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
const ICO_IR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';

// Ejercicios con el mismo grupoId (2+, no solo pares) se agrupan en un
// solo bloque con el rótulo "Superserie" — mismo id de grupo asignado al
// guardar en rutina-form.js, y mismo campo que lee rutina-session.js.
// Recorre en orden y arma "corridas" de ejercicios consecutivos que
// comparten grupo; cualquier ejercicio sin grupoId (o que rompe la
// corrida) sale como línea suelta.
function renderEjerciciosRutina(ejercicios) {
  let html = '';
  let i = 0;
  while (i < ejercicios.length) {
    const ej = ejercicios[i];
    if (ej.grupoId) {
      const grupo = [ej];
      let j = i + 1;
      while (j < ejercicios.length && ejercicios[j].grupoId === ej.grupoId) {
        grupo.push(ejercicios[j]);
        j++;
      }
      html += `
        <li class="o-ent-sup" data-foto="rut-sup">
          <span class="o-ent-sup-rotulo">Superserie</span>
          <ul class="o-ent-ejs">
            ${grupo.map(g => `<li class="o-ent-ej" data-foto="rut-linea">${escapeHtml(g.nombre)}${setsResumen(g.series)}</li>`).join('')}
          </ul>
        </li>`;
      i = j;
    } else {
      html += `<li class="o-ent-ej" data-foto="rut-linea">${escapeHtml(ej.nombre)}${setsResumen(ej.series)}</li>`;
      i++;
    }
  }
  return html ? `<ul class="o-ent-ejs">${html}</ul>` : '';
}

// Aviso (ámbar, con ícono y texto): no es una alerta roja.
const aviso = (titulo, linea, foto) => `
  <div class="o-alerta o-alerta--aviso" data-foto="${foto}">
    <span class="o-alerta-ico">${oIcono('alerta')}</span>
    <span class="o-alerta-cuerpo">
      <span class="o-alerta-titulo">${titulo}</span>
      ${linea ? `<span class="o-alerta-linea">${linea}</span>` : ''}
    </span>
  </div>`;

export async function renderRutinasLista(categoria) {
  const rutinas = await db.getRutinas(categoria);
  const plantillas = ordenarPorNivel(PLANTILLAS[categoria] || []);

  const catNames = { gym: 'GYM (Pesas)', calistenia: 'Calistenia', hiit: 'HIIT/Cardio' };
  const catName = catNames[categoria] || categoria;

  let html = `
    <div class="o-ent-rut-cab">
      <h2 class="o-ent-titulo" data-foto="rut-titulo">${catName}</h2>
      <div class="o-ent-acciones">
        <button id="btn-nueva-rutina" type="button" class="o-btn o-btn--primario">Nueva rutina</button>
        <button id="btn-generar-rutina" type="button" class="o-btn o-btn--secundario">Generar rutina</button>
      </div>
    </div>
  `;

  let balanceHtml = '';
  if (categoria === 'calistenia') {
    const { balance } = await db.getVolumenPorGrupo(7, 'calistenia');
    const emp = balance.empuje || 0;
    const tra = balance.traccion || 0;
    const pie = balance.piernas || 0;
    const total = emp + tra + pie || 1;

    const fila = (label, valor) => `
      <li class="o-ent-barra">
        <span class="o-ent-barra-nombre">${label}</span>
        <span class="o-ent-barra-pista"><span class="o-ent-barra-relleno" style="--o-ent-ancho: ${(valor / total) * 100}%"></span></span>
        <span class="o-num o-ent-barra-valor" data-foto="bal-valor">${valor}</span>
      </li>`;

    let warningHtml = '';
    if (emp > 0 && tra < emp * 0.7) {
      warningHtml = `<p class="o-ent-nota-aviso" data-foto="bal-aviso">${oIcono('alerta')}<span>Tu tracción está quedando atrás esta semana.</span></p>`;
    }

    balanceHtml = `
      <section class="o-card o-ent-balance" data-foto="balance">
        <h3 class="o-rotulo">Balance semanal (7 días)</h3>
        <ul class="o-ent-barras">
          ${fila('Empuje', emp)}
          ${fila('Tracción', tra)}
          ${fila('Piernas', pie)}
        </ul>
        ${warningHtml}
      </section>
    `;
  }

  let muscleMapHtml = '';
  if (categoria === 'gym' || categoria === 'calistenia') {
    const mapPrefix = categoria === 'gym' ? 'gym' : 'calistenia';
    // Plegable debajo de las rutinas (docs/PLAN-REVISION-OCT.md, 2.3): ocupaba
    // la primera pantalla. Abierto de entrada solo si todavía no hay rutinas.
    muscleMapHtml = `
      <details class="o-card o-ent-plegable rutinas-mapa" ${rutinas.length === 0 ? 'open' : ''}>
        <summary class="o-ent-plegable-cab">Mapa muscular · fatiga actual</summary>
        <div class="o-ent-mapa">
          <div class="o-chips o-ent-mapa-vistas" id="${mapPrefix}-muscle-map-controles" role="group" aria-label="Vista del mapa">
            <button type="button" class="o-chip" data-vista="frente" aria-pressed="true">Frente</button>
            <button type="button" class="o-chip" data-vista="espalda" aria-pressed="false">Espalda</button>
          </div>
          <div id="${mapPrefix}-muscle-map"></div>
          <div class="o-ent-mapa-leyenda" id="${mapPrefix}-muscle-map-leyenda" aria-live="polite"></div>
          <p class="o-campo-ayuda o-ent-con-ico">${oIcono('info')}<span>Qué tan fatigado está cada grupo ahora mismo. Se recupera solo en 48h sin entrenarlo.</span></p>
        </div>
      </details>
    `;
  }

  if (categoria === 'gym' || categoria === 'calistenia') {
    const necesitaDeload = await db.detectarNecesidadDeload(categoria);
    if (necesitaDeload) {
      html += aviso('Considera una semana de descarga', 'Tu volumen ha subido 3+ semanas seguidas. Bajar la intensidad esta semana ayuda a evitar el sobreentrenamiento.', 'descarga');
    }
  }

  if (categoria === 'hiit') {
    const todasSesiones = await db.getSesiones();
    const hitIds = rutinas.map(r => r.id);
    const sesionesHiit = todasSesiones.filter(s => hitIds.includes(s.rutinaId) || s.nombreRutina.toLowerCase().includes('hiit') || s.nombreRutina.toLowerCase().includes('tabata'));

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    let boxes = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);

      const hasSession = sesionesHiit.some(s => {
        const sDate = new Date(s.fecha);
        sDate.setHours(0,0,0,0);
        return sDate.getTime() === d.getTime();
      });

      const dayName = formatDiaSemana(d);
      boxes += `
        <li class="o-ent-dia" data-foto="dia" data-hecho="${hasSession}">
          <span class="o-ent-dia-caja" aria-hidden="true"></span>
          <span class="o-num o-ent-dia-nombre">${dayName}</span>
          <span class="o-ent-sr">${hasSession ? 'con sesión' : 'sin sesión'}</span>
        </li>
      `;
    }

    html += `
      <section class="o-card o-ent-constancia">
        <h3 class="o-rotulo">Constancia HIIT (7 días)</h3>
        <ul class="o-ent-dias">${boxes}</ul>
      </section>
    `;
  }

  // Mis rutinas: primero (2.3), con el balance y el mapa más abajo.
  html += `<h3 class="o-rotulo o-ent-seccion">Mis rutinas</h3>`;

  if (rutinas.length === 0) {
    html += oVacio({ titulo: 'Sin rutinas personalizadas', texto: 'Crea la primera o usa una plantilla sugerida' });
  } else {
    html += `<ul class="o-ent-rut-lista">`;
    rutinas.forEach(r => {
      const eCount = r.ejercicios ? r.ejercicios.length : 0;
      const ejerciciosHtml = esDescansoActivo(r, r.categoria)
        ? `<p class="o-card-texto" data-foto="rut-detalle">Descanso activo</p>`
        : r.hiitSettings
        ? `<p class="o-card-texto" data-foto="rut-detalle">Configuración HIIT</p>`
        : `<p class="o-card-texto" data-foto="rut-detalle">${eCount} ejercicio${eCount === 1 ? '' : 's'}</p>${renderEjerciciosRutina(r.ejercicios || [])}`;
      html += `
        <li class="o-card o-ent-rutina" data-foto="rutina">
          <div class="o-ent-rutina-cab">
            <h3 class="o-card-titulo" data-foto="rut-nombre">${escapeHtml(r.nombre)}</h3>
            <button type="button" class="btn-eliminar-rutina o-btn o-btn--fantasma o-btn--icono" data-id="${r.id}" aria-label="Eliminar rutina ${escapeHtml(r.nombre)}" title="Eliminar">${ICO_BORRAR}</button>
          </div>
          ${ejerciciosHtml}
          <button type="button" class="btn-iniciar-sesion o-btn o-btn--secundario o-btn--bloque" data-id="${r.id}">Iniciar sesión</button>
        </li>
      `;
    });
    html += `</ul>`;
  }

  // Plantillas sugeridas: plegado por defecto (<details> nativo, sin JS
  // propio) — es contenido de descubrimiento, no la razón principal de
  // estar en esta pantalla (esa es "Mis rutinas", arriba).
  if (plantillas.length > 0) {
    html += `
      <details class="o-card o-ent-plegable o-ent-plantillas">
        <summary class="o-ent-plegable-cab">Plantillas sugeridas (<span class="o-num">${plantillas.length}</span>)</summary>
        <ul class="o-lista o-ent-plantillas-lista">
          ${plantillas.map(p => `
            <li><button type="button" class="o-fila o-ent-ir btn-preview-plantilla" data-id="${p.id}" data-foto="plantilla">
              <span class="o-fila-texto"><b data-foto="plant-nombre">${p.nombre}</b><small data-foto="plant-resumen">${p.resumen}</small></span>
              <span class="o-ent-nivel" data-foto="plant-nivel">${p.nivel}</span>
              <span class="o-ent-ir-flecha">${ICO_IR}</span>
            </button></li>`).join('')}
        </ul>
      </details>
    `;
  }

  html += balanceHtml + muscleMapHtml;

  // Progreso detallado (árbol, estándares, tendencia) vive en su propia
  // pantalla (ver views/entrenamiento.js > goToProgreso).
  html += `
    <a id="link-ver-progreso-categoria" href="#" class="o-btn o-btn--fantasma o-btn--bloque o-ent-enlace" data-foto="rut-enlace">Ver tu progreso en ${catName} →</a>
  `;

  return `<div class="o-ent-rut">${html}</div>`;
}

// Encabezado de un grupo muscular dentro de una vista previa.
const grupoHeaderHtml = (label) => `<p class="o-rotulo o-ent-prev-grupo" data-foto="prev-grupo">${label}</p>`;

export function renderPlantillaPreview(plantilla) {
  let html = `
    <article class="o-card o-ent-preview">
      <header class="o-ent-preview-cab">
        <h2 class="o-ent-titulo" data-foto="prev-titulo">${plantilla.nombre}</h2>
        <p class="o-card-texto" data-foto="prev-desc">${plantilla.descripcion}</p>
      </header>
  `;

  plantilla.rutinas.forEach(rut => {
    html += `
      <section class="o-ent-prev-rut" data-foto="prev-rut">
        <h3 class="o-ent-prev-nombre" data-foto="prev-nombre">${rut.nombre}</h3>
    `;

    if (rut.ejercicioIds) {
      const grupos = agruparPorGrupoMuscular(rut.ejercicioIds, id => getEjercicioPorId(id)?.grupoMuscular);
      grupos.forEach(seccion => {
        html += grupoHeaderHtml(seccion.label);
        html += `<ol class="o-ent-prev-ejs">`;
        seccion.items.forEach(id => {
          const nombre = getEjercicioPorId(id)?.nombre || id;
          html += `<li data-foto="prev-ej">${nombre}</li>`;
        });
        html += `</ol>`;
      });
    } else if (rut.ejercicios) {
      const grupos = agruparPorGrupoMuscular(rut.ejercicios, ej => getEjercicioPorId(ej.ejercicioId)?.grupoMuscular);
      grupos.forEach(seccion => {
        html += grupoHeaderHtml(seccion.label);
        html += `<ul class="o-ent-prev-ejs o-ent-prev-ejs--series">`;
        seccion.items.forEach(ej => {
          const nombre = getEjercicioPorId(ej.ejercicioId)?.nombre || ej.ejercicioId;
          const totalSeries = ej.series.length;
          const repStr = ej.series[0].reps;
          html += `<li data-foto="prev-ej" data-bala><b>${nombre}</b> <span class="o-ent-prev-series">— ${totalSeries} serie${totalSeries === 1 ? '' : 's'} x ${repStr} reps</span></li>`;
        });
        html += `</ul>`;
      });
    }

    html += `</section>`;
  });

  html += `
      <button id="btn-usar-plantilla" type="button" class="o-btn o-btn--primario o-btn--bloque">Usar esta rutina</button>
    </article>
  `;
  return html;
}

export function initRutinasListaListeners(categoria, onNewRoutine, onStartSession, onPreviewMode, signal, onVerProgreso, onGenerarRutina) {
  const btnNueva = document.getElementById('btn-nueva-rutina');
  if (btnNueva) {
    btnNueva.addEventListener('click', () => {
      onNewRoutine();
    }, { signal });
  }

  const btnGenerar = document.getElementById('btn-generar-rutina');
  if (btnGenerar && onGenerarRutina) {
    btnGenerar.addEventListener('click', () => onGenerarRutina(), { signal });
  }

  const linkProgreso = document.getElementById('link-ver-progreso-categoria');
  if (linkProgreso && onVerProgreso) {
    linkProgreso.addEventListener('click', (e) => { e.preventDefault(); onVerProgreso(); }, { signal });
  }

  document.querySelectorAll('.btn-iniciar-sesion').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const rutinas = await db.getRutinas();
      const rutina = rutinas.find(r => r.id === id);
      if (rutina && onStartSession) {
        onStartSession(rutina);
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-eliminar-rutina').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const rutinas = await db.getRutinas();
      const rutina = rutinas.find(r => r.id === id);
      const totalSeries = rutina ? (rutina.ejercicios || []).reduce((sum, ej) => sum + ((ej.series || []).length), 0) : 0;
      const confirmed = await ConfirmDialog(
        `Eliminar rutina${rutina ? ' ' + rutina.nombre : ''}`,
        totalSeries > 0
          ? `Se perderá la configuración de ${totalSeries === 1 ? 'su serie' : `sus ${totalSeries} series`}. No se puede deshacer.`
          : 'No se puede deshacer.',
        { verb: 'Eliminar' }
      );
      if (confirmed) {
        await db.eliminarRutina(id);
        Toast("Rutina eliminada", "success");
        // Re-renderiza esta misma lista en vez de "volver": si el usuario
        // quiere borrar varias rutinas seguidas no tiene que volver a
        // entrar a la categoría cada vez.
        // En la pestaña Rutinas de Entreno (Fase 9a) la lista vive en
        // #ent-rutinas; en una sub-pantalla, en #entrenamiento-sub-content.
        const subContent = document.getElementById('ent-rutinas') || document.getElementById('entrenamiento-sub-content');
        if (subContent) {
          subContent.innerHTML = await renderRutinasLista(categoria);
          initRutinasListaListeners(categoria, onNewRoutine, onStartSession, onPreviewMode, signal, onVerProgreso, onGenerarRutina);
        }
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-preview-plantilla').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const plantilla = (PLANTILLAS[categoria] || []).find(p => p.id === id);
      if (plantilla && onPreviewMode) {
        onPreviewMode(plantilla);
      }
    }, { signal });
  });

  if (categoria === 'gym') {
    initMuscleMapPara('gym', { contenedorId: 'gym-muscle-map', controlesId: 'gym-muscle-map-controles', leyendaId: 'gym-muscle-map-leyenda' }, signal);
  } else if (categoria === 'calistenia') {
    initMuscleMapPara('calistenia', { contenedorId: 'calistenia-muscle-map', controlesId: 'calistenia-muscle-map-controles', leyendaId: 'calistenia-muscle-map-leyenda' }, signal);
  }
}

// Mapa muscular MK III (mk3-muscle-map.js): fatiga con recuperación de 48h,
// no volumen fijo de una ventana de 7 días — un grupo entrenado va bajando
// de intensidad linealmente hasta volver a neutro si no se lo vuelve a
// entrenar. Se lee 'events' (vía db.getEventosEjercicioPorCategoria, a
// granularidad de un ejercicio por entrada con su timestamp real) en vez
// de reusar getVolumenPorGrupo porque ese agrega todo el rango con el mismo
// peso y no expone el timestamp de cada aporte por separado, que es lo que
// calcularFatigaPorGrupo necesita para el decaimiento.
const obtenerGruposDelEvento = (entidadId, payload) => {
  const clave = grupoMuscularParaMapa(payload.grupoMuscular);
  return clave ? [clave] : [];
};
const obtenerVolumenDelEvento = (payload) => payload.series || 0;

// Recalcular cada 5 min mientras la vista sigue abierta: la fatiga decae
// solo con el paso del tiempo, sin que el usuario haga nada, así que si no
// se refresca periódicamente alguien que deja la pestaña abierta ve un
// número viejo que nunca se mueve solo.
const INTERVALO_REFRESCO_FATIGA_MS = 5 * 60 * 1000;

async function initMuscleMapPara(categoria, { contenedorId, controlesId, leyendaId }, signal) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const leyenda = document.getElementById(leyendaId);
  const mostrarEnLeyenda = (info) => { if (leyenda) leyenda.textContent = info ? info.nombre : ''; };

  const mapa = new MuscleMap(contenedor, {
    vista: VISTA.FRENTE,
    intensidades: {},
    onMuscleHover: mostrarEnLeyenda,
    onMuscleClick: mostrarEnLeyenda,
  });
  if (signal) signal.addEventListener('abort', () => mapa.destroy());

  const recalcular = async () => {
    const eventos = await db.getEventosEjercicioPorCategoria(categoria);
    const fatigaPorGrupo = calcularFatigaPorGrupo(eventos, obtenerGruposDelEvento, obtenerVolumenDelEvento);
    mapa.setIntensidades(expandirIntensidadPorMusculo(fatigaPorGrupo, GRUPOS_MUSCULARES));
  };
  await recalcular();

  const intervalId = setInterval(recalcular, INTERVALO_REFRESCO_FATIGA_MS);
  if (signal) signal.addEventListener('abort', () => clearInterval(intervalId));

  const controles = document.getElementById(controlesId);
  if (controles) {
    controles.querySelectorAll('button[data-vista]').forEach(btn => {
      btn.addEventListener('click', () => {
        mapa.setVista(btn.dataset.vista === 'espalda' ? VISTA.ESPALDA : VISTA.FRENTE);
        controles.querySelectorAll('button[data-vista]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      }, { signal });
    });
  }
}

export function initPlantillaPreviewListeners(categoria, plantilla, onSuccess, signal) {
  document.getElementById('btn-usar-plantilla').addEventListener('click', async () => {
    for (let rut of plantilla.rutinas) {
      let ejercicios = [];
      if (rut.ejercicioIds) {
        ejercicios = rut.ejercicioIds.map(id => ({ nombre: getEjercicioPorId(id)?.nombre || id, series: [] }));
      } else {
        ejercicios = rut.ejercicios.map(ej => ({
          nombre: getEjercicioPorId(ej.ejercicioId)?.nombre || ej.ejercicioId,
          series: JSON.parse(JSON.stringify(ej.series))
        }));
      }

      await db.crearRutina({
        nombre: rut.nombre,
        categoria: categoria,
        ejercicios: ejercicios,
        hiitSettings: plantilla.hiitSettings || null
      });
    }

    Toast(`Plantilla "${plantilla.nombre}" agregada a tus rutinas.`, "success");
    if (onSuccess) onSuccess();
  }, { signal });
}

// Vista previa del plan generado (Etapa 4a) — mismo patrón que
// renderPlantillaPreview, pero cada ejercicio muestra su `motivo` (por qué
// se eligió, no solo qué) y los `avisos` de patrones que no se pudieron
// cubrir quedan arriba de todo, nunca ocultos. "Usar esta rutina" guarda
// con el mismo db.crearRutina() que usa una plantilla fija.
//
// Los avisos de cobertura ("no llenó", "no se pudo incluir") salen agrupados
// en UN bloque arriba, con los patrones únicos; cada día solo lleva un
// indicador "n/cupo" si le faltan ejercicios. Tono de aviso solo si algún
// patrón quedó fuera del plan entero ('faltante'); si solo faltaron espacios
// extra, tono neutro.
export function renderGeneradorPreview(plan, categoria) {
  const faltantes = plan.faltantes || [];
  const etiquetas = (tipo) => faltantes.filter(f => f.tipo === tipo).map(f => RAMA_LABELS[f.patron] || f.patron);
  const patronesAviso = [...new Set([...etiquetas('faltante'), ...etiquetas('incompleto')])];
  const hayFaltante = faltantes.some(f => f.tipo === 'faltante');
  const volumen = plan.avisosVolumen || [];
  const avisosHtml = patronesAviso.length === 0 ? '' : `
    <div id="generador-avisos" class="o-alerta${hayFaltante ? ' o-alerta--aviso' : ' o-ent-cobertura'}">
      ${hayFaltante ? `<span class="o-alerta-ico">${oIcono('alerta')}</span>` : ''}
      <span class="o-alerta-cuerpo">
        <span class="o-alerta-linea" data-foto="gen-aviso">Con el equipo que declaraste, algunos días tienen menos ejercicios en: <b>${patronesAviso.join(', ')}</b>.</span>
        <button type="button" id="btn-generador-agregar-equipo" class="o-btn o-btn--fantasma o-ent-btn-inline">Agregar equipo</button>
      </span>
    </div>
  `;
  // El aviso de volumen semanal es otra cosa (no depende del equipo): va
  // aparte, como nota suelta, para que "sin bloque" signifique que no hay
  // problema de cobertura.
  const volumenHtml = volumen.length === 0 ? '' : `
    <div id="generador-volumen" class="o-ent-gen-volumen">
      ${volumen.map(a => `<p class="o-campo-ayuda">${a}</p>`).join('')}
    </div>
  `;

  const diasHtml = plan.dias.map(dia => {
    if (esDescansoActivo(dia, categoria)) return renderDescansoActivoCard({ nombre: dia.nombre });
    const faltan = categoria !== 'hiit' && dia.cupo && dia.ejercicios.length > 0 && dia.ejercicios.length < dia.cupo;
    const indicador = faltan ? `<span class="o-num o-ent-gen-cupo" title="Este día tiene menos ejercicios de los previstos" data-foto="gen-cupo">${dia.ejercicios.length}/${dia.cupo}</span>` : '';
    const items = categoria === 'hiit'
      ? dia.motivos.map(m => `
          <li class="o-ent-gen-ej" data-foto="gen-ej">
            <b>${m.nombre}</b>
            <small>${m.motivo}</small>
          </li>
        `).join('')
      : dia.ejercicios.map(ej => `
          <li class="o-ent-gen-ej" data-foto="gen-ej" data-bala>
            <span><b>${ej.nombre}</b> <span class="o-ent-prev-series">— ${ej.series.length} serie${ej.series.length === 1 ? '' : 's'} x ${ej.series[0].reps}</span></span>
            <small>${ej.motivo}</small>
          </li>
        `).join('');

    return `
      <section class="o-ent-prev-rut" data-foto="gen-dia">
        <div class="o-ent-prev-rut-cab">
          <h3 class="o-ent-prev-nombre" data-foto="gen-nombre">${dia.nombre}</h3>
          ${indicador}
        </div>
        ${items ? `<ul class="o-ent-gen-ejs">${items}</ul>` : `<p class="o-campo-ayuda">Sin ejercicios disponibles para este día.</p>`}
      </section>
    `;
  }).join('');

  return `
    <article class="o-card o-ent-preview">
      <header class="o-ent-preview-cab">
        <h2 class="o-ent-titulo">Tu rutina generada</h2>
        <p class="o-card-texto">Según tu progreso actual en cada patrón de movimiento y el equipo que declaraste. Puedes editarla después como cualquier otra rutina.</p>
      </header>
      ${avisosHtml}
      ${volumenHtml}
      ${diasHtml}
      <button id="btn-usar-generado" type="button" class="o-btn o-btn--primario o-btn--bloque">Usar esta rutina</button>
    </article>
  `;
}

export function initGeneradorPreviewListeners(plan, categoria, onSuccess, signal, onAgregarEquipo) {
  const btnEquipo = document.getElementById('btn-generador-agregar-equipo');
  if (btnEquipo && onAgregarEquipo) btnEquipo.addEventListener('click', onAgregarEquipo, { signal });

  document.getElementById('btn-usar-generado').addEventListener('click', async () => {
    for (const dia of plan.dias) {
      const ejercicios = categoria === 'hiit'
        ? dia.ejercicioIds.map(id => ({ nombre: getEjercicioPorId(id)?.nombre || id, series: [] }))
        : dia.ejercicios.map(ej => ({ nombre: ej.nombre, series: ej.series }));

      if (ejercicios.length === 0 && !esDescansoActivo(dia, categoria)) continue;

      await db.crearRutina({
        nombre: dia.nombre,
        categoria: categoria,
        ejercicios: ejercicios,
        hiitSettings: dia.hiitSettings || null
      });
    }

    Toast('Rutina generada agregada a tus rutinas.', 'success');
    if (onSuccess) onSuccess();
  }, { signal });
}
