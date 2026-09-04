import { db } from '../core/db.js';
import { PLANTILLAS } from '../core/plantillas.js';
import { getEjercicioPorId, agruparPorGrupoMuscular } from '../core/ejercicios-catalogo.js';
import { renderMiniChart } from './mini-chart.js';
import { Toast, ConfirmDialog, EmptyState } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { formatDiaSemana } from '../utils/fecha.js';

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

const warningSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px; flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
const infoSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

export async function renderRutinasLista(categoria) {
  const rutinas = await db.getRutinas(categoria);
  const plantillas = ordenarPorNivel(PLANTILLAS[categoria] || []);

  const catNames = { gym: 'GYM (Pesas)', calistenia: 'Calistenia', hiit: 'HIIT/Cardio' };
  const catName = catNames[categoria] || categoria;

  let html = `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 26px; font-weight: 800; margin: 0 0 16px 0; color: var(--text-primary); letter-spacing: -0.4px;">${catName}</h2>
      <button id="btn-nueva-rutina" class="tappable" style="width: 100%; padding: 14px; border-radius: 14px; background: rgba(92, 225, 230, 0.08); border: 1px dashed var(--accent-teal); color: var(--accent-teal); font-size: 15px; font-weight: 700; cursor: pointer; margin-bottom: 10px;">
        + Nueva rutina
      </button>
      <button id="btn-generar-rutina" class="tappable" style="width: 100%; padding: 14px; border-radius: 14px; background: var(--accent-teal); border: none; color: #000; font-size: 15px; font-weight: 700; cursor: pointer;">
        Generar Rutina
      </button>
    </div>
  `;

  let balanceHtml = '';
  if (categoria === 'calistenia') {
    const { balance } = await db.getVolumenPorGrupo(7, 'calistenia');
    const emp = balance.empuje || 0;
    const tra = balance.traccion || 0;
    const pie = balance.piernas || 0;
    const total = emp + tra + pie || 1;

    const wEmp = (emp / total) * 100;
    const wTra = (tra / total) * 100;
    const wPie = (pie / total) * 100;

    let warningHtml = '';
    if (emp > 0 && tra < emp * 0.7) {
      warningHtml = `<div style="font-size: 11px; color: var(--state-medium); font-weight: 600; margin-top: 8px; display: flex; align-items: center;">${warningSvg}Tu tracción está quedando atrás esta semana.</div>`;
    }

    balanceHtml = `
      <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Balance semanal (7 días)</h3>

        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 60px; color: var(--text-secondary);">Empuje</div>
            <div style="flex: 1; height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${wEmp}%; background: var(--cy2);"></div>
            </div>
            <div style="width: 24px; text-align: right; color: var(--text-primary);">${emp}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 60px; color: var(--text-secondary);">Tracción</div>
            <div style="flex: 1; height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${wTra}%; background: var(--accent-teal);"></div>
            </div>
            <div style="width: 24px; text-align: right; color: var(--text-primary);">${tra}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 60px; color: var(--text-secondary);">Piernas</div>
            <div style="flex: 1; height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${wPie}%; background: var(--cy3);"></div>
            </div>
            <div style="width: 24px; text-align: right; color: var(--text-primary);">${pie}</div>
          </div>
        </div>
        ${warningHtml}
      </div>
    `;
  }

  html += balanceHtml;

  // El árbol de progresión (progresiones.js) es un dato unificado que cubre
  // las tres modalidades, pero cada una ve su propio recorte filtrado por
  // categoria/tambienEn (Etapa 3 + fix post-Etapa 4a: mostrar "Dominadas"
  // como tarjeta suelta dentro de Calistenia era confuso, aunque sea un
  // prerrequisito real de Front Lever/Muscle-up). Vive acá adentro de cada
  // modalidad en vez de listarse aparte en el nivel superior de
  // Entrenamiento. Mismo formato de tarjeta que las de modalidad (ícono,
  // título, subtítulo, chevron); como ya está dentro de la modalidad el
  // subtítulo no necesita repetirla.
  html += `
    <div class="card tappable" id="btn-ir-arbol-progresion" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(92, 225, 230, 0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="24" height="24" fill="none" stroke="var(--accent-teal)" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="22" x2="12" y2="12"></line><path d="M12 12 5 5"></path><path d="M12 12l7-7"></path><circle cx="12" cy="12" r="2"></circle><circle cx="5" cy="5" r="2"></circle><circle cx="19" cy="5" r="2"></circle></svg>
      </div>
      <div style="flex: 1;">
        <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">Árbol de Progresión</h3>
        <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Qué entrenar después</p>
      </div>
      <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  `;

  // Hermano del Árbol de Progresión de Calistenia, pero para pesas — vive
  // adentro de GYM por la misma razón: es específico de esta modalidad
  // (en gym se progresa subiendo peso del mismo ejercicio, no cambiando
  // de ejercicio, así que no tiene sentido en calistenia ni en HIIT).
  if (categoria === 'gym') {
    html += `
      <div class="card tappable" id="btn-ir-estandares-fuerza" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer; margin-bottom: 24px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(92, 225, 230, 0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="24" height="24" fill="none" stroke="var(--accent-teal)" stroke-width="2" viewBox="0 0 24 24"><path d="M6 7v10M4 9v6M2 10v4"></path><path d="M18 7v10M20 9v6M22 10v4"></path><line x1="6" y1="12" x2="18" y2="12"></line></svg>
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">Estándares de Fuerza</h3>
          <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Dónde estás y qué falta</p>
        </div>
        <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    `;
  }

  let volumenGrupoHtml = '';
  if (categoria === 'gym') {
    const { volumen } = await db.getVolumenPorGrupo(7, 'gym');
    const grupos = [
      { key: 'pecho', label: 'Pecho', color: 'var(--accent-teal)' },
      { key: 'espalda', label: 'Espalda', color: 'var(--cy2)' },
      { key: 'piernas', label: 'Piernas', color: 'var(--cy3)' },
      { key: 'hombros', label: 'Hombros', color: 'var(--cy4)' },
      { key: 'brazos', label: 'Brazos', color: 'var(--cyb)' }
    ];
    const total = grupos.reduce((sum, g) => sum + (volumen[g.key] || 0), 0);

    if (total > 0) {
      const maxVal = Math.max(...grupos.map(g => volumen[g.key] || 0), 1);
      volumenGrupoHtml = `
        <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Volumen por grupo muscular (7 días)</h3>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
            ${grupos.map(g => {
              const v = volumen[g.key] || 0;
              const w = (v / maxVal) * 100;
              return `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 60px; color: var(--text-secondary);">${g.label}</div>
                  <div style="flex: 1; height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${w}%; background: ${g.color};"></div>
                  </div>
                  <div style="width: 28px; text-align: right; color: var(--text-primary);">${v}</div>
                </div>
              `;
            }).join('')}
          </div>
          <div style="margin-top: 10px; font-size: 11px; color: var(--text-secondary);">${infoSvg}Series totales por grupo muscular esta semana.</div>
        </div>
      `;
    }
  }
  html += volumenGrupoHtml;

  let deloadHtml = '';
  if (categoria === 'gym' || categoria === 'calistenia') {
    const necesitaDeload = await db.detectarNecesidadDeload(categoria);
    if (necesitaDeload) {
      deloadHtml = `
        <div class="card" style="background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.3); padding: 14px 16px; border-radius: 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
          <div class="icon-chip" style="width: 32px; height: 32px; background: rgba(245, 158, 11, 0.18); color: var(--state-medium); flex-shrink: 0;">
            ${warningSvg}
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--state-medium);">Considera una semana de descarga</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Tu volumen ha subido 3+ semanas seguidas. Bajar la intensidad esta semana ayuda a evitar el sobreentrenamiento.</div>
          </div>
        </div>
      `;
    }
  }
  html += deloadHtml;

  // --- Tendencia de volumen (GYM / Calistenia) ---
  if (categoria === 'gym' || categoria === 'calistenia') {
    const { volumenPorSemana } = await db.getTendenciaSemanal(categoria, 8);
    const chartHtml = renderMiniChart(volumenPorSemana, {
      color: 'var(--accent-teal)',
      unidad: categoria === 'gym' ? ' kg' : ' reps',
      label: 'Volumen total por semana (últimas 8 semanas)',
      emptyText: 'Registra un par de sesiones más para ver tu tendencia.'
    });

    const infoText = categoria === 'gym'
      ? `${infoSvg}<b>Volumen:</b> Total de kilos movidos esta semana (Series × Reps × Peso).`
      : `${infoSvg}<b>Volumen:</b> Cantidad total de repeticiones hechas esta semana.`;

    html += `
      <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Tendencia de entrenamiento</h3>
        ${chartHtml}
        <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
          ${infoText}
        </div>
      </div>
    `;
  }

  let heatmapHtml = '';
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
      const color = hasSession ? 'var(--accent-teal)' : 'var(--surface-2)';
      const border = hasSession ? 'none' : '1px solid var(--surface-border)';

      boxes += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <div style="width: 24px; height: 24px; background: ${color}; border-radius: 4px; border: ${border};"></div>
          <span style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase;">${dayName}</span>
        </div>
      `;
    }

    heatmapHtml = `
      <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Constancia HIIT (7 días)</h3>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${boxes}
        </div>
      </div>
    `;
  }

  html += heatmapHtml;

  // --- Tendencia de minutos (HIIT) ---
  if (categoria === 'hiit') {
    const { minutosPorSemana } = await db.getTendenciaSemanal('hiit', 8);
    const chartHtml = renderMiniChart(minutosPorSemana, {
      color: 'var(--accent-teal)',
      unidad: ' min',
      label: 'Minutos entrenados por semana (últimas 8 semanas)',
      emptyText: 'Completa un par de sesiones HIIT más para ver tu tendencia.'
    });

    html += `
      <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Tendencia de constancia</h3>
        ${chartHtml}
        <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
          ${infoSvg}<b>Constancia:</b> Suma total de minutos activos en tus sesiones de cardio y HIIT de la semana.
        </div>
      </div>
    `;
  }

  // Plantillas Sugeridas
  if (plantillas.length > 0) {
    html += `
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Plantillas sugeridas</h3>
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">
    `;
    plantillas.forEach(p => {
      html += `
        <div class="card tappable btn-preview-plantilla" data-id="${p.id}" style="background: var(--surface-2); padding: 16px; border-radius: 16px; cursor: pointer; position: relative;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h4 style="font-size: 16px; font-weight: 600; margin: 0; color: var(--text-primary);">${p.nombre}</h4>
            <span style="background: var(--surface-1); color: var(--text-secondary); font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${p.nivel}</span>
          </div>
          <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">${p.resumen}</p>
        </div>
      `;
    });
    html += `</div>`;
  }

  // Mis Rutinas
  html += `<h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Mis Rutinas</h3>`;

  if (rutinas.length === 0) {
    html += EmptyState("Sin rutinas personalizadas", "Crea la primera o usa una plantilla sugerida");
  } else {
    html += `<div style="display: flex; flex-direction: column; gap: 16px;">`;
    rutinas.forEach(r => {
      const eCount = r.ejercicios ? r.ejercicios.length : 0;
      html += `
        <div class="card" style="padding: 20px; border-radius: 18px;">
          <div class="flex-between" style="margin-bottom: 12px;">
            <h3 style="font-size: 17px; font-weight: 700; margin: 0; color: var(--text-primary);">${escapeHtml(r.nombre)}</h3>
            <button class="btn-eliminar-rutina" data-id="${r.id}" style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer;" title="Eliminar">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
          <p style="color: var(--text-secondary); font-size: 13px; font-weight: 500; margin: 0 0 16px 0;">${r.hiitSettings ? 'Configuración HIIT' : eCount + ' ejercicios'}</p>
          <button class="btn-iniciar-sesion btn-primary tappable" data-id="${r.id}" style="background: var(--accent-teal); color: #000; padding: 12px; font-size: 14px;">
            Iniciar sesión
          </button>
        </div>
      `;
    });
    html += `</div>`;
  }

  return html;
}

export function renderPlantillaPreview(plantilla) {
  let html = `
    <div class="card" style="padding: 22px; border-radius: 20px;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 8px 0; color: var(--text-primary); letter-spacing: -0.3px;">${plantilla.nombre}</h2>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin: 0;">${plantilla.descripcion}</p>
      </div>
  `;

  plantilla.rutinas.forEach(rut => {
    html += `
      <div style="background: var(--surface-2); padding: 16px; border-radius: 14px; border: 1px solid var(--surface-border); margin-bottom: 16px;">
        <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 12px 0; color: var(--accent-teal);">${rut.nombre}</h4>
    `;

    const grupoHeaderHtml = (label) => `
      <div style="display: flex; align-items: center; gap: 7px; margin: 10px 0 2px 0;">
        <div style="width: 3px; height: 13px; background: var(--accent-teal); border-radius: 2px;"></div>
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: var(--accent-teal);">${label}</span>
      </div>
    `;

    if (rut.ejercicioIds) {
      const grupos = agruparPorGrupoMuscular(rut.ejercicioIds, id => getEjercicioPorId(id)?.grupoMuscular);
      grupos.forEach(seccion => {
        html += grupoHeaderHtml(seccion.label);
        html += `<ol style="margin: 0; padding-left: 20px; color: var(--text-primary); font-size: 14px; display: flex; flex-direction: column; gap: 8px;">`;
        seccion.items.forEach(id => {
          const nombre = getEjercicioPorId(id)?.nombre || id;
          html += `<li>${nombre}</li>`;
        });
        html += `</ol>`;
      });
    } else if (rut.ejercicios) {
      const grupos = agruparPorGrupoMuscular(rut.ejercicios, ej => getEjercicioPorId(ej.ejercicioId)?.grupoMuscular);
      grupos.forEach(seccion => {
        html += grupoHeaderHtml(seccion.label);
        html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        seccion.items.forEach(ej => {
          const nombre = getEjercicioPorId(ej.ejercicioId)?.nombre || ej.ejercicioId;
          const totalSeries = ej.series.length;
          const repStr = ej.series[0].reps;
          html += `<div style="font-size: 14px; color: var(--text-primary);">• <b>${nombre}</b> <span style="color: var(--text-secondary);">— ${totalSeries} series x ${repStr} reps</span></div>`;
        });
        html += `</div>`;
      });
    }

    html += `</div>`;
  });

  html += `
      <button id="btn-usar-plantilla" class="btn-primary tappable" style="background: var(--accent-teal); margin-top: 8px;">
        Usar esta rutina
      </button>
    </div>
  `;
  return html;
}

export function initRutinasListaListeners(categoria, onNewRoutine, onStartSession, onPreviewMode, signal, onArbolProgresion, onEstandaresFuerza, onGenerarRutina) {
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

  const btnArbol = document.getElementById('btn-ir-arbol-progresion');
  if (btnArbol && onArbolProgresion) {
    btnArbol.addEventListener('click', () => onArbolProgresion(), { signal });
  }

  const btnEstandares = document.getElementById('btn-ir-estandares-fuerza');
  if (btnEstandares && onEstandaresFuerza) {
    btnEstandares.addEventListener('click', () => onEstandaresFuerza(), { signal });
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
      const confirmed = await ConfirmDialog("¿Eliminar rutina?", "Esta acción no se puede deshacer.");
      if (confirmed) {
        await db.eliminarRutina(id);
        Toast("Rutina eliminada", "success");
        document.getElementById('btn-entrenamiento-volver').click();
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

// Preview del plan generado (Etapa 4a) — mismo patrón visual que
// renderPlantillaPreview, pero cada ejercicio muestra su `motivo` (por qué
// se eligió, no solo qué) y los `avisos` de patrones que no se pudieron
// cubrir quedan arriba de todo, nunca ocultos. "Usar esta rutina" guarda
// con el mismo db.crearRutina() que usa una plantilla fija — de ahí en
// adelante es una rutina común: se edita, se borra, se re-genera después.
export function renderGeneradorPreview(plan, categoria) {
  const avisosHtml = plan.avisos.length === 0 ? '' : `
    <div class="card" style="padding: 14px 16px; margin-bottom: 20px; border-left: 3px solid var(--state-medium);">
      ${plan.avisos.map(a => `<div style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px;">${warningSvg}<span>${a}</span></div>`).join('')}
    </div>
  `;

  const diasHtml = plan.dias.map(dia => {
    const items = categoria === 'hiit'
      ? dia.motivos.map(m => `
          <div style="margin-bottom: 10px;">
            <div style="font-size: 14px; color: var(--text-primary); font-weight: 700;">${m.nombre}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${m.motivo}</div>
          </div>
        `).join('')
      : dia.ejercicios.map(ej => `
          <div style="margin-bottom: 10px;">
            <div style="font-size: 14px; color: var(--text-primary);">• <b>${ej.nombre}</b> <span style="color: var(--text-secondary);">— ${ej.series.length} series x ${ej.series[0].reps}</span></div>
            <div style="font-size: 11px; color: var(--text-secondary); margin: 2px 0 0 14px;">${ej.motivo}</div>
          </div>
        `).join('');

    return `
      <div style="background: var(--surface-2); padding: 16px; border-radius: 14px; border: 1px solid var(--surface-border); margin-bottom: 16px;">
        <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 12px 0; color: var(--accent-teal);">${dia.nombre}</h4>
        ${items || `<div style="font-size: 12px; color: var(--text-secondary);">Sin ejercicios disponibles para este día.</div>`}
      </div>
    `;
  }).join('');

  return `
    <div class="card" style="padding: 22px; border-radius: 20px;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 8px 0; color: var(--text-primary); letter-spacing: -0.3px;">Tu rutina generada</h2>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin: 0;">Según tu progreso actual en cada patrón de movimiento y el equipo que declaraste. Puedes editarla después como cualquier otra rutina.</p>
      </div>
      ${avisosHtml}
      ${diasHtml}
      <button id="btn-usar-generado" class="btn-primary tappable" style="background: var(--accent-teal); margin-top: 8px;">
        Usar esta rutina
      </button>
    </div>
  `;
}

export function initGeneradorPreviewListeners(plan, categoria, onSuccess, signal) {
  document.getElementById('btn-usar-generado').addEventListener('click', async () => {
    for (const dia of plan.dias) {
      const ejercicios = categoria === 'hiit'
        ? dia.ejercicioIds.map(id => ({ nombre: getEjercicioPorId(id)?.nombre || id, series: [] }))
        : dia.ejercicios.map(ej => ({ nombre: ej.nombre, series: ej.series }));

      if (ejercicios.length === 0) continue;

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