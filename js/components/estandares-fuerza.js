// Vista de solo lectura de Estándares de Fuerza (hermana del Árbol de
// Progresión, pero para GYM), dentro de Entreno › Progreso. Órbita (Fase
// 9c); data-foto: lo que lee tools/verificar/foto-progreso.mjs.
//
// En calistenia se progresa cambiando de ejercicio; en gym se progresa
// subiendo el peso del mismo ejercicio — por eso esto no es un árbol de
// prerrequisitos, es una comparación contra estándares documentados
// (ver estandares-fuerza.js para la fuente de los ratios). "Nivel" acá
// es un estándar de fuerza real, no un tier de videojuego.
import { db } from '../core/db.js';
import { getEjercicioPorId } from '../core/ejercicios-catalogo.js';
import { openProfileForm } from './profile-form.js';
import { LEVANTAMIENTOS_ID, getNivel } from '../core/estandares-fuerza.js';
import { formatNumero } from '../utils/numero.js';
import { oIcono } from './orbita.js';

function renderSinDato(nombre) {
  return `
    <li class="o-card o-ent-est" data-foto="est-fila" data-estado="sin-dato">
      <b class="o-ent-est-nombre" data-foto="est-nombre">${nombre}</b>
      <p class="o-card-texto">Sin registros todavía — anótalo en tu próxima sesión de GYM para ver dónde estás.</p>
    </li>`;
}

function renderSinPeso(nombre, oneRM) {
  return `
    <li class="o-card o-ent-est" data-foto="est-fila" data-estado="sin-peso">
      <div class="o-ent-est-cab">
        <b class="o-ent-est-nombre" data-foto="est-nombre">${nombre}</b>
        <span class="o-ent-est-valor o-num" data-foto="est-valor">${oneRM} kg · 1RM est.</span>
      </div>
    </li>`;
}

const NIVEL_ORDEN_BARRA = ['principiante', 'novato', 'intermedio', 'avanzado'];

// Barra de 4 segmentos ("dónde estás") — puramente visual, el nivel real
// lo decide getNivel() en core/estandares-fuerza.js; esto solo posiciona
// ese resultado en la escala. El nivel también va en texto al lado.
function renderBarraNivel(nivelActual) {
  const idx = NIVEL_ORDEN_BARRA.indexOf(nivelActual);
  return `
    <div class="o-ent-est-barra" aria-hidden="true">
      ${NIVEL_ORDEN_BARRA.map((n, i) => `<span class="o-ent-est-seg" data-lleno="${i <= idx}"></span>`).join('')}
    </div>`;
}

function renderConNivel(nombre, oneRM, ratio, nivelInfo, pesoKg) {
  const gapKg = nivelInfo.siguienteRatio != null ? Math.max(0, Math.round((nivelInfo.siguienteRatio * pesoKg) - oneRM)) : null;
  const gap = gapKg != null ? `Te faltan ${gapKg} kg para ${nivelInfo.siguienteLabel}` : 'Tope de esta escala';
  return `
    <li class="o-card o-ent-est" data-foto="est-fila" data-estado="nivel">
      <div class="o-ent-est-cab">
        <b class="o-ent-est-nombre" data-foto="est-nombre">${nombre}</b>
        <span class="o-ent-est-valor o-num" data-foto="est-valor">${formatNumero(oneRM)} kg · ${formatNumero(ratio, { decimales: 2 })}× peso corporal</span>
      </div>
      ${renderBarraNivel(nivelInfo.nivel)}
      <div class="o-ent-est-pie">
        <span class="o-ent-est-nivel" data-foto="est-nivel">${nivelInfo.label}</span>
        <span class="o-card-texto" data-foto="est-gap">${gap}</span>
      </div>
    </li>`;
}

export async function renderEstandaresFuerza() {
  const [prs, profile] = await Promise.all([db.getPRs(), db.getProfile()]);
  const pesoKg = Number(profile?.pesoKg) || 0;
  const sexo = profile?.sexo === 'F' ? 'F' : 'M';
  const tienePeso = pesoKg > 0;

  const filasHtml = LEVANTAMIENTOS_ID.map(id => {
    const meta = getEjercicioPorId(id);
    const nombre = meta.nombre;
    const pr = prs[nombre.toLowerCase().trim()];

    if (!pr || pr.pesoMax <= 0) return renderSinDato(nombre);

    const oneRM = db.estimar1RM(pr.pesoMax, pr.repsMax);
    if (!tienePeso) return renderSinPeso(nombre, oneRM);

    const ratio = oneRM / pesoKg;
    const nivelInfo = getNivel(id, sexo, ratio);
    return renderConNivel(nombre, oneRM, ratio, nivelInfo, pesoKg);
  }).join('');

  // prs[] se busca por el nombre EXACTO (minúsculas) del ejercicio tal cual
  // está en el catálogo: un PR cargado como "Bench Press" nunca va a
  // coincidir con "Press de banca". Mientras el matching siga siendo exacto,
  // este aviso dice qué nombres hay que usar al cargar las series.
  const nombres = LEVANTAMIENTOS_ID.map(id => getEjercicioPorId(id)?.nombre).filter(Boolean).join(', ');

  const bannerPesoHtml = !tienePeso ? `
    <div class="o-alerta o-alerta--aviso o-ent-est-perfil" data-foto="est-perfil">
      <span class="o-alerta-ico">${oIcono('info')}</span>
      <span class="o-alerta-cuerpo">
        <span class="o-alerta-titulo">Falta tu peso corporal</span>
        <span class="o-alerta-linea">Complétalo para ver tu nivel y qué te falta.</span>
      </span>
      <button type="button" id="btn-completar-perfil-estandares" class="o-btn o-btn--secundario">Completar perfil</button>
    </div>` : '';

  return `
    <div class="o-ent-estandares">
      <header class="o-ent-sec-cab">
        <h2 class="o-card-titulo" data-foto="est-titulo">Estándares de fuerza</h2>
        <p class="o-card-texto">Dónde estás y qué falta en cada levantamiento principal, según tu 1RM estimado relativo a tu peso corporal.</p>
      </header>
      <p class="o-card o-card-texto o-ent-est-nombres">Para que tus series cuenten acá, cárgalas con estos nombres exactos: <b data-foto="est-aviso">${nombres}</b>.</p>
      ${bannerPesoHtml}
      <ul class="o-lista">${filasHtml}</ul>
    </div>`;
}

export function initEstandaresFuerzaListeners(signal) {
  const btn = document.getElementById('btn-completar-perfil-estandares');
  if (btn) btn.addEventListener('click', () => openProfileForm(), { signal });
}
