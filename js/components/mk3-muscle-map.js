/**
 * mk3-muscle-map.js
 * -----------------------------------------------------------------
 * Componente vanilla JS (ES Module, sin dependencias) para dibujar un
 * mapa muscular interactivo frente/espalda dentro del modulo
 * Entrenamiento de Vanguard OS (MK III).
 *
 * Convenciones que respeta (ver architecture-rules.md del proyecto):
 * - Import relativo con extension .js
 * - Sin frameworks, sin build step: se puede pegar tal cual en js/components/
 * - No usa color rojo para intensidad (el rojo esta reservado a alertas
 *   reales en el sistema de diseño MK III). La intensidad se pinta en un
 *   solo tono (el acento cian de Entreno) variando su mezcla con la
 *   superficie base, de "apagado" a "saturado".
 * - Despues de insertar el SVG con innerHTML/appendChild, los listeners
 *   se agregan de nuevo con addEventListener en cada path (no relies on
 *   onclick inline), tal como exige el resto de la app tras un render.
 *
 * Los datos vectoriales (paths) vienen de mk3-muscle-map-data.js
 * (adaptados del proyecto open source "body-muscles", Apache-2.0 —
 * ver el aviso de licencia en ese archivo).
 *
 * RENDER "REALISTA" (v2):
 * La geometria original es low-poly (facetada), asi que en vez de
 * redibujar anatomia a mano, el realismo se gana con shading:
 *  1) Una silueta de fondo, borrosa (feGaussianBlur), del cuerpo
 *     completo -> da un "glow" corporal suave detras de las facetas,
 *     para que la figura se lea como un cuerpo y no como piezas
 *     sueltas sobre fondo negro.
 *  2) Cada musculo en reposo usa un tono neutro VISIBLE (no casi negro)
 *     para que se note el cuerpo completo aunque no se haya entrenado.
 *  3) Una capa de "brillo" (radialGradient con gradientUnits
 *     objectBoundingBox, se re-centra solo en cada path) simulando
 *     el volumen/curvatura de cada musculo, con mix-blend-mode overlay.
 *  4) Uniones redondeadas (stroke-linejoin round) y trazo fino y tenue
 *     en vez de lineas duras tipo "placas de armadura".
 * -----------------------------------------------------------------
 */

import { VISTA, MUSCULOS_FRENTE, MUSCULOS_ESPALDA, OFFSET_ESPALDA_X } from "./mk3-muscle-map-data.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @typedef {Object} MuscleMapOptions
 * @property {string} [vista] - VISTA.FRENTE | VISTA.ESPALDA (default: VISTA.FRENTE)
 * @property {Record<string, number>} [intensidades] - id de musculo -> 0..1
 * @property {(info: {id: string, nombre: string, grupo: string}) => void} [onMuscleClick]
 * @property {(info: {id: string, nombre: string, grupo: string} | null) => void} [onMuscleHover]
 * @property {string} [claseContenedor] - clase css extra para el wrapper
 */

export class MuscleMap {
  /**
   * @param {HTMLElement} contenedor
   * @param {MuscleMapOptions} opciones
   */
  constructor(contenedor, opciones = {}) {
    this.contenedor = contenedor;
    this.vista = opciones.vista || VISTA.FRENTE;
    this.intensidades = opciones.intensidades || {};
    this.onMuscleClick = opciones.onMuscleClick || (() => {});
    this.onMuscleHover = opciones.onMuscleHover || (() => {});
    this.claseContenedor = opciones.claseContenedor || "";

    /** @type {Map<string, SVGPathElement>} */
    this._paths = new Map();
    this._cleanup = [];
    this._wrapperEl = null;
    this._svgEl = null;

    this._render();
  }

  /** Cambia de vista (frente/espalda). Vuelve a construir el SVG. */
  setVista(vista) {
    if (vista === this.vista) return;
    this.vista = vista;
    this._render();
  }

  /**
   * Actualiza intensidades sin reconstruir el SVG completo.
   * @param {Record<string, number>} intensidades - id de musculo -> 0..1
   * @param {{merge?: boolean}} [opts] - merge=true combina con lo existente en vez de reemplazar
   */
  setIntensidades(intensidades, opts = {}) {
    this.intensidades = opts.merge
      ? { ...this.intensidades, ...intensidades }
      : intensidades;
    this._refrescarTodos();
  }

  /** Aplica una intensidad a todos los musculos de un grupo (ej. "Pecho"). */
  setIntensidadGrupo(grupoId, intensidad, gruposMap) {
    const ids = gruposMap[grupoId] || [];
    const patch = {};
    for (const id of ids) patch[id] = intensidad;
    this.setIntensidades(patch, { merge: true });
  }

  /** Limpia listeners y remueve el DOM creado por este componente. */
  destroy() {
    for (const fn of this._cleanup) fn();
    this._cleanup = [];
    this._paths.clear();
    if (this._wrapperEl && this.contenedor.contains(this._wrapperEl)) {
      this.contenedor.removeChild(this._wrapperEl);
    }
    this._wrapperEl = null;
    this._svgEl = null;
  }

  // ---- privado ----------------------------------------------------

  _render() {
    this.destroy();

    const musculos = this.vista === VISTA.FRENTE ? MUSCULOS_FRENTE : MUSCULOS_ESPALDA;

    this._wrapperEl = document.createElement("div");
    this._wrapperEl.className = `mk3-muscle-map ${this.claseContenedor}`.trim();

    this._svgEl = document.createElementNS(SVG_NS, "svg");
    this._svgEl.setAttribute("viewBox", "0 0 35 93");
    this._svgEl.setAttribute("class", "mk3-muscle-map__svg");
    this._svgEl.setAttribute("role", "img");
    this._svgEl.setAttribute(
      "aria-label",
      this.vista === VISTA.FRENTE ? "Mapa muscular, vista frontal" : "Mapa muscular, vista posterior"
    );

    const offsetX = this.vista === VISTA.ESPALDA ? -OFFSET_ESPALDA_X : 0;

    this._svgEl.appendChild(this._buildDefs());

    // 1) Silueta de fondo borrosa: da el "glow" de cuerpo completo.
    const glowGroup = document.createElementNS(SVG_NS, "g");
    glowGroup.setAttribute("class", "mk3-muscle-map__glow");
    glowGroup.setAttribute("transform", `translate(${offsetX}, 0)`);
    glowGroup.setAttribute("aria-hidden", "true");
    for (const musculo of musculos) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", musculo.path);
      glowGroup.appendChild(p);
    }
    this._svgEl.appendChild(glowGroup);

    // 2) Musculos interactivos (fill dinamico segun intensidad).
    const grupo = document.createElementNS(SVG_NS, "g");
    grupo.setAttribute("transform", `translate(${offsetX}, 0)`);

    // 3) Capa de brillo/volumen encima, sin eventos de puntero.
    const shineGroup = document.createElementNS(SVG_NS, "g");
    shineGroup.setAttribute("class", "mk3-muscle-map__shine-layer");
    shineGroup.setAttribute("transform", `translate(${offsetX}, 0)`);
    shineGroup.setAttribute("aria-hidden", "true");

    for (const musculo of musculos) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", musculo.path);
      path.setAttribute("class", "mk3-muscle-map__musculo");
      path.dataset.muscleId = musculo.id;
      path.dataset.grupo = musculo.grupo;
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");

      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = musculo.nombre;
      path.appendChild(title);

      const info = { id: musculo.id, nombre: musculo.nombre, grupo: musculo.grupo };

      const onEnter = () => {
        path.classList.add("is-hover");
        this.onMuscleHover(info);
      };
      const onLeave = () => {
        path.classList.remove("is-hover");
        this.onMuscleHover(null);
      };
      const onClick = () => this.onMuscleClick(info);
      const onKey = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.onMuscleClick(info);
        }
      };

      path.addEventListener("mouseenter", onEnter);
      path.addEventListener("mouseleave", onLeave);
      path.addEventListener("click", onClick);
      path.addEventListener("keydown", onKey);
      this._cleanup.push(() => {
        path.removeEventListener("mouseenter", onEnter);
        path.removeEventListener("mouseleave", onLeave);
        path.removeEventListener("click", onClick);
        path.removeEventListener("keydown", onKey);
      });

      grupo.appendChild(path);
      this._paths.set(musculo.id, path);

      const shine = document.createElementNS(SVG_NS, "path");
      shine.setAttribute("d", musculo.path);
      shine.setAttribute("class", "mk3-muscle-map__shine");
      shineGroup.appendChild(shine);
    }

    this._svgEl.appendChild(grupo);
    this._svgEl.appendChild(shineGroup);
    this._wrapperEl.appendChild(this._svgEl);
    this.contenedor.appendChild(this._wrapperEl);

    this._refrescarTodos();
  }

  _buildDefs() {
    const defs = document.createElementNS(SVG_NS, "defs");

    // Brillo/volumen por musculo: gradientUnits="objectBoundingBox" hace
    // que ESTA MISMA definicion se re-centre automaticamente en cada
    // path que la use (no hay que crear un gradiente por musculo).
    const shine = document.createElementNS(SVG_NS, "radialGradient");
    shine.setAttribute("id", "mk3-shine");
    shine.setAttribute("gradientUnits", "objectBoundingBox");
    shine.setAttribute("cx", "32%");
    shine.setAttribute("cy", "22%");
    shine.setAttribute("r", "85%");
    const stops = [
      ["0%", "#ffffff", "0.55"],
      ["40%", "#ffffff", "0.12"],
      ["75%", "#000000", "0"],
      ["100%", "#000000", "0.22"],
    ];
    for (const [offset, color, opacity] of stops) {
      const stop = document.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      stop.setAttribute("stop-opacity", opacity);
      shine.appendChild(stop);
    }
    defs.appendChild(shine);

    // Blur para la silueta de fondo (glow de cuerpo completo).
    const blur = document.createElementNS(SVG_NS, "filter");
    blur.setAttribute("id", "mk3-blur-cuerpo");
    blur.setAttribute("x", "-20%");
    blur.setAttribute("y", "-20%");
    blur.setAttribute("width", "140%");
    blur.setAttribute("height", "140%");
    const feBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
    feBlur.setAttribute("stdDeviation", "1.1");
    blur.appendChild(feBlur);
    defs.appendChild(blur);

    return defs;
  }

  _refrescarTodos() {
    for (const [id, path] of this._paths) {
      const intensidad = clamp01(this.intensidades[id] || 0);
      // La intensidad se expone como variable CSS; el color real
      // (mezcla con el acento --accent-entreno) lo define mk3-muscle-map.css
      // para no hardcodear ningun hex ni usar rojo.
      path.style.setProperty("--intensidad", String(intensidad));
      path.classList.toggle("is-activo", intensidad > 0);
    }
  }
}

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// ---------------------------------------------------------------------
// Utilidad opcional: derivar intensidad por grupo muscular desde el log
// de eventos de Vanguard OS (events store). NO asume nombres de campo
// reales del catalogo de ejercicios: hay que ajustar `obtenerGrupos`
// a como el catalogo real relacione ejercicioId -> grupo(s) muscular(es)
// (ver INTEGRACION.md para el detalle de esto).
// ---------------------------------------------------------------------

/**
 * @param {Array<{modulo: string, tipo: string, entidadId: string, payload: any, fecha: string|number|Date}>} eventos
 *   Eventos del log central (modulo "entreno"), ya filtrados a la ventana de tiempo deseada.
 * @param {(entidadId: string, payload: any) => string[]} obtenerGrupos
 *   Dado un evento de serie/ejercicio completado, devuelve los grupos musculares que trabaja
 *   (ej. a partir de ejercicioId -> catalogo -> patronMovimiento / grupo).
 * @param {(payload: any) => number} obtenerVolumen
 *   Devuelve el "volumen" de ese evento (ej. series * reps, o series * reps * peso).
 * @returns {Record<string, number>} grupo muscular -> intensidad normalizada 0..1
 */
export function calcularIntensidadPorGrupo(eventos, obtenerGrupos, obtenerVolumen) {
  const volumenPorGrupo = {};

  for (const evento of eventos) {
    const grupos = obtenerGrupos(evento.entidadId, evento.payload) || [];
    const volumen = obtenerVolumen(evento.payload) || 0;
    if (volumen <= 0 || grupos.length === 0) continue;
    // Si un ejercicio trabaja varios grupos (ej. press banca -> pecho,
    // triceps, hombro anterior), se reparte el volumen entre ellos.
    const parte = volumen / grupos.length;
    for (const g of grupos) {
      volumenPorGrupo[g] = (volumenPorGrupo[g] || 0) + parte;
    }
  }

  const max = Math.max(1, ...Object.values(volumenPorGrupo));
  const intensidad = {};
  for (const [grupo, vol] of Object.entries(volumenPorGrupo)) {
    intensidad[grupo] = vol / max;
  }
  return intensidad;
}

/**
 * Expande una intensidad por GRUPO (ej. {"Pecho": 0.8}) a una intensidad
 * por MUSCULO individual, usando GRUPOS_MUSCULARES de mk3-muscle-map-data.js.
 * @param {Record<string, number>} intensidadPorGrupo
 * @param {Record<string, string[]>} gruposMusculares
 * @returns {Record<string, number>}
 */
export function expandirIntensidadPorMusculo(intensidadPorGrupo, gruposMusculares) {
  const out = {};
  for (const [grupo, valor] of Object.entries(intensidadPorGrupo)) {
    const ids = gruposMusculares[grupo] || [];
    for (const id of ids) out[id] = valor;
  }
  return out;
}
