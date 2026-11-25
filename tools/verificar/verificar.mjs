// tools/verificar/verificar.mjs
// Verificación de Vanguard OS con Playwright (Chromium). Fuera de la app:
// no está en PRECACHE_URLS y _config.yml excluye tools/ de GitHub Pages.
//
// Uso (PowerShell, desde la raíz del repo):
//   $env:Path = "$env:LOCALAPPDATA\Programs\node;$env:Path"
//   node tools/verificar/verificar.mjs [etiqueta]
// Deja capturas e informe en tools/verificar/salida/<etiqueta>/ (ignorado
// por git). Sale con código 1 si falla alguna prueba o hay errores de consola.
//
// Reglas de CLAUDE.md que cumple: contexto limpio, zona America/Santiago,
// reloj simulado, Supabase bloqueado (nunca se inicia sesión) y prueba por
// la UI real. Los datos de prueba se cargan con el botón de Configuración
// (datos-demo.js, todo por db.js).
//
// Cuando una fase del rediseño cambia la interfaz, se actualiza SOLO el
// bloque SEL (selectores) y, si cambia un flujo, la prueba correspondiente.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { tomarFoto, leerUiOrbita, compararFotos, ARCHIVO_ANTES } from './foto-finanzas.mjs';
import { tomarFotoEntreno, leerUiOrbitaEntreno, ARCHIVO_ANTES_ENTRENO } from './foto-entreno.mjs';
import { tomarFotoRutinas, UI_ORBITA as UI_ORBITA_RUTINAS, ARCHIVO_ANTES_RUTINAS } from './foto-rutinas.mjs';
import { tomarFotoProgreso, UI_ORBITA as UI_ORBITA_PROGRESO, ARCHIVO_ANTES_PROGRESO } from './foto-progreso.mjs';
import { tomarFotoSesion, UI_ORBITA as UI_ORBITA_SESION, ARCHIVO_ANTES_SESION } from './foto-sesion.mjs';
import { tomarFotoHojas, UI_ORBITA as UI_ORBITA_HOJAS, ARCHIVO_ANTES_HOJAS } from './foto-hojas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const ETIQUETA = process.argv[2] || new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const SALIDA = path.join(AQUI, 'salida', ETIQUETA);
const PUERTO = 8766;
const BASE = `http://127.0.0.1:${PUERTO}/`;
// Lunes 23 nov 2026, 16:00 en Santiago (UTC-3 en verano).
const AHORA = new Date('2026-11-23T16:00:00-03:00');
const VIEWPORTS = [
  { nombre: '390', width: 390, height: 844 },
  { nombre: '768', width: 768, height: 1024 },
  { nombre: '1440', width: 1440, height: 900 }
];
const VISTAS = ['dashboard', 'tareas', 'tareas/notas', 'habitos', 'entrenamiento', 'finanzas'];

// --- Selectores de la interfaz actual (actualizar en cada fase) ---
const SEL = {
  vistaTitulo: '#view-root h1',
  saltarOnboarding: 'button:has-text("Saltar")',
  nav: (vista) => `a.nav-item[data-view="${vista}"]`,
  menuBtn: '#btn-perfil',          // Perfil (Fase 3; antes el menú ☰)
  menuOverlay: '#perfil-overlay',
  perfilItem: (vista) => `#perfil-overlay .o-perfil-item[data-menu-view="${vista}"]`,
  orbe: '#app-nav .nav-orbe',
  rielActivo: '#app-nav .nav-item.active:not(.nav-orbe)',
  dockItems: '#app-nav .nav-item',
  notasHost: '#notas-host',
  demoBtn: '#btn-cfg-demo',
  confirmOk: '#confirm-ok',
  confirmCancel: '#confirm-cancel',
  confirmModal: '#global-confirm-modal',
  toast: '#toast-container',
  toastOk: '#toast-container .o-toast--ok .o-toast-ico', // Fase 4: aviso Órbita con ícono
  // Muestra de componentes (docs/rediseno/componentes-orbita.html, fuera de la app)
  muestra: 'docs/rediseno/componentes-orbita.html',
  muestraHoja: '#demo-hoja',
  muestraMision: '#mazo .o-mision',
  muestraRegistro: '#mazo-registro',
  // Hoy (Fase 5: órbita, mazo y franja que abre la agenda)
  hoyOrbita: '#hoy-orbita',
  hoyMazo: '#hoy-mazo',
  hoyMision: '#hoy-mazo .o-mision',
  hoyFranja: '#hoy-franja',
  hoyAgendaHoja: '#hoy-agenda-hoja',
  hoyAgenda: '#hoy-agenda',
  hoyCaptura: '#hoy-captura',
  hoyHabitosHoja: '#hoy-habitos-hoja',
  qaHabito: '#qa-habito',
  qaTarea: '#qa-tarea',
  qaGasto: '#qa-gasto',
  qaEntreno: '#qa-entreno',
  capturaInput: '#quick-capture-input',
  capturaOpcionSobre: '.qa-sobre-opcion',
  checkHabitoHoy: (nombre) => `.agenda-check[data-tipo="habito"][data-nombre="${nombre}"]`,
  // Tareas
  tareaModal: '#task-modal',
  tareaTitulo: '#task-title',
  tareaGuardar: '#btn-save-task',
  tareaEliminar: '#btn-delete-task-modal',
  tareaCard: (titulo) => `.btn-edit-task:has-text("${titulo}")`,
  // Plan (Fase 7: pestañas Tareas · Semana · Notas; Tareas con lista + detalle)
  planTab: (id) => `.tareas-subtab[data-sub="${id}"]`,
  tareaNueva: '#btn-new-task',
  tareaEstado: (s) => `.btn-state-tab[data-state="${s}"]`,
  tareaFila: (titulo) => `.o-tarea-fila:has(.btn-edit-task:has-text("${titulo}"))`,
  tareaRapida: '#task-quick-add',
  tareaVolver: '#btn-volver-tarea',
  tareaCerrar: '#btn-cerrar-tarea',
  tareaEditar: '#btn-editar-tarea',
  tareaEliminarDet: '#btn-eliminar-tarea',
  tareaDetEstado: (s) => `.o-tarea-det-estado[data-status="${s}"]`,
  tareaFoco: '#btn-foco-tarea',
  tarLdLista: '#tar-ld > .o-ld-lista',
  tarLdDetalle: '#tar-ld > .o-ld-detalle',
  tarLdTitulo: '#tar-ld .o-ld-titulo',
  focoModal: '#foco-modal',
  semanaDia: '.plan-dia',
  semanaNueva: '.plan-nueva',
  semanaItem: (t) => `.plan-item:has(.plan-item-texto:has-text("${t}"))`,
  semanaTira: '#plan-tira-toggle',
  notaCatFila: (t) => `.o-nota-cat:has(.cat-abrir:has-text("${t}"))`,
  // Hábitos (Fase 6: pestañas Hoy · Análisis · Logros, detalle como sub-pantalla)
  habitoMarcado: (nombre) => `.o-habitos .day-toggle-hoy[aria-label="Desmarcar ${nombre} hoy"][aria-pressed="true"]`,
  habCheck: (nombre) => `.o-habitos .day-toggle-hoy[aria-label$=" ${nombre} hoy"]`,
  habCantidad: (nombre) => `.o-habitos .day-progreso-hoy[aria-label^="Registrar progreso de ${nombre} hoy"]`,
  habFila: (nombre) => `.o-habitos .habito-row[aria-label^="${nombre}:"]`,
  habTab: (t) => `.o-habitos .o-tab[data-tab="${t}"]`,
  habPanel: '#hab-panel',
  habNuevo: '#btn-new-habito',
  habModal: '#habito-modal',
  habNombre: '#habito-nombre',
  habFrec: (f) => `#habito-modal .btn-frecuencia-chip[data-frecuencia="${f}"]`,
  habDia: (i) => `#habito-modal .btn-frecuencia-dia[data-dow="${i}"]`,
  habGuardar: '#btn-save-habito',
  habVolver: '#btn-volver-habito',
  habEditar: '#btn-editar-habito-detalle',
  habEliminar: '#btn-eliminar-habito-detalle',
  habDetalleChips: '.o-hab-det-chips',
  habCerrar: '#btn-cerrar-habito',  // cerrar el detalle en PC (lista + detalle)
  habLd: '#hab-ld',
  habLdLista: '#hab-ld > .o-ld-lista',
  habLdDetalle: '#hab-ld > .o-ld-detalle',
  ldTitulo: '#hab-ld .o-ld-titulo',
  progresoModal: '#progreso-modal',
  progresoInput: '#progreso-cantidad',
  progresoGuardar: '#btn-save-progreso',
  habDona: '#habitos-donut',
  habTendencia: '#habitos-tendencia-chart',
  habLogro: '#habitos-logro',
  habInsignia: '.o-hab-insignia',
  chipRacha: '#chip-racha',
  // Finanzas
  gastoModal: '#gasto-modal',
  gastoTecla: (v) => `#gasto-modal .numpad-btn[data-val="${v}"]`,
  gastoChip: '#gasto-chip-container .o-chip',
  gastoLabel: '#gasto-label',
  gastoGuardar: '#btn-submit-gasto',
  finTab: (tab) => `.fin-tab[data-tab="${tab}"]`,
  movimientos: '#history-list-content',
  fechaDesde: '#history-date-from',
  limpiarFechas: '#btn-clear-date-filter',
  finTitulo: '#view-root h1',
  mapaCalor: '#finanzas-heatmap',
  // Finanzas (Órbita, Fase 8): lista + detalle en Movimientos y Recurrentes.
  // El más reciente con ese nombre (los datos demo repiten Metro, Restaurante…).
  finMov: (nombre) => `.o-fin-mov-abrir:has(.o-fin-mov-nombre:text-is("${nombre}")) >> nth=0`,
  finRec: (nombre) => `.o-fin-rec-abrir:has(.o-fin-rec-nombre:text-is("${nombre}"))`,
  finMovLd: '#fin-mov-ld',
  finRecLd: '#fin-rec-ld',
  finMovVolver: '#btn-volver-mov',
  finMovCerrar: '#btn-cerrar-mov',
  finMovEliminar: '#btn-eliminar-mov',
  finRecVolver: '#btn-volver-rec',
  finRecCerrar: '#btn-cerrar-rec',
  finRecEliminar: '#btn-eliminar-recurrente',
  finSobre: (nombre) => `.env-row:has(.o-fin-sobre-nombre:text-is("${nombre}"))`,
  // Entreno
  sesionActiva: '#sesion-barra, #hiit-container' // GYM/Calistenia o temporizador HIIT
};
const HABITO_PENDIENTE = 'Meditar 10 min'; // datos-demo.js lo deja sin marcar hoy

// --- Servidor estático del repo ---
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, BASE).pathname);
    if (p.endsWith('/')) p += 'index.html';
    const archivo = path.join(RAIZ, p);
    if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(archivo).pipe(res);
  });
  return new Promise(ok => srv.listen(PUERTO, '127.0.0.1', () => ok(srv)));
}

// --- Registro de resultados ---
const resultados = [];
const erroresConsola = [];
let paginaActual = null; // para la captura de una prueba que falla
async function prueba(nombre, fn) {
  const t0 = Date.now();
  try {
    await fn();
    resultados.push({ nombre, ok: true, ms: Date.now() - t0 });
    console.log(`  OK   ${nombre}`);
  } catch (err) {
    // Primera línea + qué esperaba Playwright y dónde quedó la app.
    const lineas = String(err.message || err).split('\n');
    const espera = lineas.find((l) => /waiting for/.test(l));
    const donde = paginaActual ? await paginaActual.evaluate(() => `${location.hash} ${JSON.stringify(history.state)}`).catch(() => '') : '';
    const error = `${lineas[0]}${espera ? ` [${espera.trim()}]` : ''}${donde ? ` (en ${donde})` : ''}`;
    resultados.push({ nombre, ok: false, ms: Date.now() - t0, error });
    console.log(`  FALLA ${nombre}: ${error}`);
    if (paginaActual) await paginaActual.screenshot({ path: path.join(SALIDA, `FALLA-${resultados.length}.png`) }).catch(() => {});
  }
}
function afirmar(cond, msj) { if (!cond) throw new Error(msj); }

// --- Ayudas de navegación ---
async function irA(page, vista) {
  await page.evaluate((v) => { location.hash = v; }, vista);
  await page.waitForFunction((v) => window.appRouter && window.appRouter.currentView === v.split('/')[0], vista);
  await page.waitForSelector(SEL.vistaTitulo, { state: 'visible' });
  await page.waitForTimeout(400);
}
async function esperarToast(page, re) {
  await page.waitForFunction(([src, flags]) => new RegExp(src, flags).test(document.querySelector('#toast-container')?.textContent || ''), [re.source, re.flags], { timeout: 8000 });
}
// Contraste WCAG del texto de cada elemento que calce con el selector contra
// su fondo real (los fondos translúcidos de los ancestros compuestos sobre
// --o-bg). Devuelve los que no llegan a 4,5:1 (3:1 si el texto es grande).
async function fallasContraste(page, selector) {
  return page.$$eval(selector, (els) => {
    const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    const sobre = (c, f) => ({ r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a), a: 1 });
    const lum = (c) => { const t = [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]; };
    const sonda = document.createElement('span'); sonda.style.color = 'var(--o-bg)'; document.body.appendChild(sonda);
    const base = rgba(getComputedStyle(sonda).color); sonda.remove();
    // Un control deshabilitado no entra (WCAG 1.4.3 lo exime).
    return els.filter((el) => el.textContent.trim() && el.getBoundingClientRect().width > 0 && !el.closest(':disabled')).map((el) => {
      const capas = []; let op = 1; let paradas = null;
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e); op *= Number(c.opacity);
        // Un degradado de un solo color (relleno sólido, p. ej.
        // linear-gradient(X, X)) pinta encima del color de fondo y se cuenta.
        // Un degradado lineal opaco de varios colores (relleno de módulo) se
        // mide contra cada parada y vale la peor. Las luces ambientales
        // (radiales que se desvanecen) no se cuentan.
        const deg = c.backgroundImage.startsWith('linear-gradient') ? c.backgroundImage.match(/rgba?\([^)]*\)/g) : null;
        const dg = deg && new Set(deg).size === 1 ? rgba(deg[0]) : null; if (dg && dg.a > 0) capas.unshift(dg);
        if (deg && !dg && deg.map(rgba).every((p) => p.a === 1)) { paradas = deg.map(rgba); break; }
        const bg = rgba(c.backgroundColor); if (bg.a > 0) capas.unshift(bg);
        if (bg.a === 1 || (dg && dg.a === 1)) break;
      }
      const cs = getComputedStyle(el); const fg = rgba(cs.color);
      const q = Math.min(...(paradas || [base]).map((p0) => {
        let fondo = p0; for (const c of capas) fondo = sobre(c, fondo);
        const texto = sobre({ ...fg, a: fg.a * op }, fondo);
        const [x, y] = [lum(texto), lum(fondo)].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05);
      }));
      const grande = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
      return { texto: el.textContent.trim().slice(0, 24), q: Math.round(q * 100) / 100, min: grande ? 3 : 4.5 };
    }).filter((r) => r.q < r.min);
  });
}

// Captura sin los toasts que dejaron pruebas anteriores (tapan la pantalla).
async function capturar(page, archivo) {
  await page.evaluate((s) => { const t = document.querySelector(s); if (t) t.innerHTML = ''; }, SEL.toast);
  await page.screenshot({ path: path.join(SALIDA, archivo) });
}

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const srv = await servir();
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.supabase.co ~NOTFOUND'] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'America/Santiago',
    locale: 'es-CL',
    serviceWorkers: 'allow'
  });
  await context.route(/supabase\.co/, r => r.abort());
  await context.clock.install({ time: AHORA });
  const page = await context.newPage();
  paginaActual = page;
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = m.location()?.url || '';
    if (/supabase\.co/.test(url) || /supabase\.co/.test(m.text())) return; // bloqueado a propósito
    erroresConsola.push(`[console] ${m.text()} ${url}`);
  });
  page.on('pageerror', e => erroresConsola.push(`[pageerror] ${e.message}`));

  console.log(`Verificación "${ETIQUETA}" → ${path.relative(RAIZ, SALIDA)}`);

  await prueba('Carga limpia (onboarding y Hoy)', async () => {
    await page.goto(BASE + 'index.html');
    await page.locator(SEL.saltarOnboarding).click({ timeout: 15000 });
    await page.waitForSelector(SEL.vistaTitulo);
    const ok = await page.evaluate(async () => { await navigator.serviceWorker.ready; return true; });
    afirmar(ok, 'el service worker no quedó listo');
  });

  await prueba('Cargar datos de demostración (Configuración)', async () => {
    await irA(page, 'configuracion');
    await page.locator(SEL.demoBtn).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Datos de demostración cargados/);
    await irA(page, 'dashboard');
  });

  // ---------- Las 5 acciones frecuentes ----------
  await prueba('Acción 1 · revisar el día (órbita, mazo y agenda)', async () => {
    await irA(page, 'dashboard');
    await page.waitForSelector(SEL.hoyOrbita, { state: 'visible' });
    await page.waitForSelector(SEL.hoyMision, { state: 'visible' });
    await page.locator(SEL.hoyFranja).click();
    await page.waitForSelector(SEL.hoyAgenda, { state: 'visible' });
    await capturar(page, 'hoy-agenda-390.png');
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.hoyAgendaHoja);
    afirmar((await page.evaluate(() => location.hash)) === '#dashboard', 'atrás cambió de vista');
  });

  await prueba('Hoy · la órbita lleva a Laboratorio', async () => {
    await page.locator(SEL.hoyOrbita).click();
    await page.waitForFunction(() => window.appRouter.currentView === 'laboratorio');
    await irA(page, 'dashboard');
  });

  await prueba('Hoy · «Después» pasa la misión al final del mazo', async () => {
    await irA(page, 'dashboard');
    const primera = await page.locator(SEL.hoyMision).getAttribute('data-mision-id');
    await page.locator(`${SEL.hoyMision} [data-mision-accion="despues"]`).click();
    await page.waitForFunction(([s, id]) => document.querySelector(s)?.getAttribute('data-mision-id') !== id, [SEL.hoyMision, primera], { timeout: 8000 });
  });

  await prueba('Acción 2 · marcar un hábito desde Hoy (agenda)', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.hoyFranja).click();
    await page.locator(`${SEL.hoyAgendaHoja} ${SEL.checkHabitoHoy(HABITO_PENDIENTE)}`).click();
    await page.waitForSelector(`${SEL.hoyAgendaHoja} ${SEL.checkHabitoHoy(HABITO_PENDIENTE)}`, { state: 'detached', timeout: 8000 });
    afirmar(await page.evaluate((s) => document.querySelector(s).classList.contains('open'), SEL.hoyAgendaHoja), 'la agenda se cerró al marcar');
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.hoyAgendaHoja);
    await irA(page, 'habitos');
    await page.waitForSelector(SEL.habitoMarcado(HABITO_PENDIENTE), { timeout: 8000 });
  });

  await prueba('Acción 3 · registrar un gasto (captura rápida "4500 almuerzo")', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.orbe).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.hoyCaptura);
    await page.locator(SEL.capturaInput).fill('4500 almuerzo');
    await page.locator(SEL.capturaInput).press('Enter');
    const opcion = page.locator(SEL.capturaOpcionSobre).first();
    if (await opcion.isVisible({ timeout: 1500 }).catch(() => false)) await opcion.click();
    await esperarToast(page, /Gasto de \$4\.500 registrado/);
    await irA(page, 'finanzas');
    await page.locator(SEL.finTab('movimientos')).click();
    await page.waitForFunction((s) => /almuerzo/i.test(document.querySelector(s)?.textContent || ''), SEL.movimientos, { timeout: 8000 });
  });

  await prueba('Finanzas · Movimientos sigue llena al volver a la vista', async () => {
    // Sigue a la prueba anterior: sale de Finanzas con Movimientos activa y vuelve sin tocar la pestaña.
    await irA(page, 'dashboard');
    await irA(page, 'finanzas');
    afirmar(await page.locator(SEL.finTab('movimientos')).getAttribute('aria-selected') === 'true', 'Movimientos no quedó activa');
    await page.waitForFunction((s) => /almuerzo/i.test(document.querySelector(s)?.textContent || ''), SEL.movimientos, { timeout: 8000 });
  });

  await prueba('Fechas · el filtro de Movimientos se escribe dd-mm-aaaa y filtra', async () => {
    // Sigue en Finanzas › Movimientos (prueba anterior). Datos demo: «Almuerzo» el 23 nov, «Metro» el 22.
    const campo = page.locator(SEL.fechaDesde);
    afirmar((await campo.getAttribute('placeholder')) === 'dd-mm-aaaa', 'el campo no muestra dd-mm-aaaa');
    await campo.click({ position: { x: 10, y: 10 } });
    await page.keyboard.type('23112026');
    afirmar((await campo.evaluate((e) => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get.call(e))) === '23-11-2026', 'el texto no quedó 23-11-2026');
    await page.keyboard.press('Tab'); // change
    await page.waitForFunction((s) => !/Metro/.test(document.querySelector(s)?.textContent || ''), SEL.movimientos, { timeout: 8000 });
    afirmar(/Almuerzo/.test(await page.locator(SEL.movimientos).textContent()), 'el filtro dejó fuera el 23 nov');
    await page.locator(SEL.limpiarFechas).click();
    await page.waitForFunction((s) => /Metro/.test(document.querySelector(s)?.textContent || ''), SEL.movimientos, { timeout: 8000 });
    afirmar((await campo.inputValue()) === '', 'Limpiar no vació el campo');
  });

  await prueba('Finanzas · el título no lleva franja de fondo', async () => {
    const fondo = await page.locator(SEL.finTitulo).evaluate((h) => {
      for (let e = h; e && e.id !== 'view-root'; e = e.parentElement) {
        const c = getComputedStyle(e);
        if (c.position === 'sticky' || c.backgroundColor !== 'rgba(0, 0, 0, 0)') return `${c.position} ${c.backgroundColor}`;
      }
      return '';
    });
    afirmar(fondo === '', `cabecera con fondo propio: ${fondo}`);
  });

  await prueba('Finanzas · los números del mapa de calor cumplen AA (color y sobrio)', async () => {
    for (const tema of ['color', 'gris']) {
      await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
      await irA(page, 'finanzas');
      await page.locator(SEL.finTab('resumen')).click();
      await page.waitForSelector(`${SEL.mapaCalor} .heatmap-cell`);
      const celdas = await page.$$eval(`${SEL.mapaCalor} .heatmap-cell`, (cs) => cs.length);
      const conActividad = await page.$$eval(`${SEL.mapaCalor} .heatmap-cell:not([data-count="0"])`, (cs) => new Set(cs.map((c) => c.dataset.count)).size);
      afirmar(celdas >= 28 && conActividad >= 2, `mapa sin niveles para revisar (${celdas} celdas, ${conActividad} niveles)`);
      const fallas = await fallasContraste(page, `${SEL.mapaCalor} .heatmap-cell`);
      afirmar(fallas.length === 0, `${tema}: ${fallas.length} celdas bajo AA, ej. «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
      if (tema === 'color') {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.locator(SEL.mapaCalor).scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await capturar(page, 'mapa-calor-768.png');
        await page.setViewportSize({ width: 390, height: 844 });
      }
    }
    await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
    await page.reload();
    await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
  });

  await prueba('Riel · en modo sobrio el ítem activo cumple AA en 768 y 1440', async () => {
    await page.evaluate(() => localStorage.setItem('vg-tema', 'gris'));
    try {
      for (const ancho of [768, 1440]) {
        await page.setViewportSize({ width: ancho, height: 900 });
        await page.reload();
        await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
        for (const vista of ['habitos', 'tareas', 'entrenamiento', 'finanzas']) {
          await irA(page, vista);
          await page.waitForSelector(SEL.rielActivo);
          // Etiqueta (texto, 4,5:1) e ícono (mismo color, objeto gráfico).
          const fallas = await fallasContraste(page, SEL.rielActivo);
          afirmar(fallas.length === 0, `${ancho} px, ${vista}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
          if (ancho === 1440 && vista === 'finanzas') await capturar(page, 'riel-sobrio-1440.png');
        }
      }
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
    }
  });

  await prueba('Bordes · «Esquina Vanguard» sin chaflán en Hábitos, Plan, Entreno y Finanzas', async () => {
    for (const vista of ['habitos', 'tareas', 'entrenamiento', 'finanzas']) {
      await irA(page, vista);
      const r = await page.evaluate(() => {
        const todos = [...document.querySelectorAll('#view-root *')];
        const chaflan = todos.filter((e) => getComputedStyle(e).clipPath.startsWith('polygon') && !e.closest('.mk3-hex'));
        const tarjeta = document.querySelector('#view-root .card');
        return { chaflan: chaflan.map((e) => e.className || e.tagName).slice(0, 3), esquina: tarjeta ? getComputedStyle(tarjeta).borderTopRightRadius : null, otra: tarjeta ? getComputedStyle(tarjeta).borderTopLeftRadius : null };
      });
      afirmar(r.chaflan.length === 0, `${vista}: quedan chaflanes (${r.chaflan.join(', ')})`);
      if (r.esquina !== null) afirmar(r.esquina === '4px' && r.otra === '18px', `${vista}: tarjeta con ${r.otra}/${r.esquina}`);
    }
  });

  // El ✓ del check marcado (.o-check) se ve encima de su caja: se fotografía
  // el ícono y se cuentan los píxeles oscuros (tinta sobre el degradado).
  // Sin el arreglo, la caja transformada lo tapaba y no quedaba ninguno.
  await prueba('Check · el ✓ se ve al marcar (hoja «Hábitos de hoy»)', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.qaHabito).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.hoyHabitosHoja);
    try {
    const check = page.locator(`${SEL.hoyHabitosHoja} .o-check[aria-pressed="true"]`).first();
    await check.waitFor();
    await page.waitForTimeout(500); // termina la animación de la caja
    const png = await check.locator('svg').screenshot();
    const oscuros = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 128) n++;
      return n;
    }, png.toString('base64'));
    // Sin el ✓, la foto del ícono es solo degradado (rojo alto en cada píxel).
    afirmar(oscuros >= 10, `el ✓ no se ve (${oscuros} píxeles de tinta)`);
    } finally {
      await page.goBack();
      await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.hoyHabitosHoja);
    }
  });

  await prueba('Acción 3b · botón Gasto abre el formulario', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.qaGasto).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.gastoModal, { timeout: 8000 });
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.gastoModal);
  });

  await prueba('Hoy · la hoja de gasto tiene estilo y registra un gasto de punta a punta', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.qaGasto).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.gastoModal, { timeout: 8000 });
    await page.waitForTimeout(500); // entrada de la hoja
    // Teclado: las 12 teclas con objetivo táctil ≥ 44 px y sin el aspecto nativo del navegador.
    const teclas = await page.$$eval('#gasto-modal .numpad-btn', (bs) => bs.map((b) => {
      const c = getComputedStyle(b); const r = b.getBoundingClientRect();
      return { alto: r.height, radio: c.borderTopLeftRadius, fuente: c.fontFamily, letra: parseFloat(c.fontSize) };
    }));
    afirmar(teclas.length === 12, `teclas: ${teclas.length}`);
    for (const t of teclas) {
      afirmar(t.alto >= 44, `tecla de ${t.alto} px de alto`);
      // Tecla de Órbita (Fase 8b): caja con radio y cifra en Geist Mono.
      afirmar(t.radio !== '0px' && /Geist Mono/.test(t.fuente), `tecla sin estilo Órbita (radio ${t.radio}, fuente ${t.fuente})`);
      afirmar(t.letra >= 20, `tecla con letra de ${t.letra} px`);
    }
    // Chips de sobre: caja táctil con relleno y radio; el elegido toma fondo.
    const chip = page.locator(SEL.gastoChip).first();
    const antes = await chip.evaluate((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { alto: r.height, relleno: parseFloat(c.paddingLeft), radio: c.borderTopLeftRadius }; });
    afirmar(antes.alto >= 44 && antes.relleno >= 8 && antes.radio !== '0px', `chip sin estilo: ${JSON.stringify(antes)}`);
    const nombreSobre = (await chip.textContent()).trim();
    await chip.click();
    const fondo = await chip.evaluate((e) => getComputedStyle(e).backgroundColor);
    afirmar(fondo !== 'rgba(0, 0, 0, 0)', 'el chip elegido no tomó fondo');
    for (const v of ['3', '2', '0', '0']) await page.locator(SEL.gastoTecla(v)).click();
    await page.locator(SEL.gastoLabel).fill('Prueba hoja Hoy');
    await capturar(page, 'hoja-gasto-390.png');
    await page.locator(SEL.gastoGuardar).click();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.gastoModal, { timeout: 8000 });
    await irA(page, 'finanzas');
    await page.locator(SEL.finTab('movimientos')).click();
    await page.waitForFunction((s) => /Prueba hoja Hoy/.test(document.querySelector(s)?.textContent || ''), SEL.movimientos, { timeout: 8000 });
    const fila = await page.locator(SEL.movimientos).textContent();
    afirmar(/-\$3\.200/.test(fila) && fila.includes(nombreSobre), `el gasto no quedó con $3.200 en ${nombreSobre}`);
  });

  await prueba('Acción 4 · agregar una tarea (botón Tarea)', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.qaTarea).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.tareaModal);
    await page.locator(SEL.tareaTitulo).fill('Prueba verificación');
    await page.locator(SEL.tareaGuardar).click();
    await esperarToast(page, /Tarea guardada/);
  });

  await prueba('Acción 5 · empezar un entreno (botón Entrenar)', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.qaEntreno).click();
    await page.waitForSelector(SEL.sesionActiva, { state: 'visible', timeout: 15000 });
    await capturar(page, 'sesion-activa-390.png');
  });

  await prueba('Hoy · botón Hábito abre los hábitos del día', async () => {
    await page.goto(BASE + 'index.html#dashboard'); // suelta la sesión de entreno de la vista
    await page.waitForFunction(() => window.appRouter && window.appRouter.currentView === 'dashboard');
    await page.locator(SEL.qaHabito).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.hoyHabitosHoja);
    await page.waitForSelector(`${SEL.hoyHabitosHoja} .o-check[aria-pressed="true"]`);
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.hoyHabitosHoja);
  });

  // ---------- Hábitos (Fase 6) ----------
  const abierta = (s) => page.waitForFunction((x) => document.querySelector(x)?.classList.contains('open'), s, { timeout: 8000 });
  const cerrada = (s) => page.waitForFunction((x) => !document.querySelector(x)?.classList.contains('open'), s, { timeout: 8000 });
  const pestanaActiva = (t) => page.waitForSelector(`${SEL.habTab(t)}[aria-selected="true"]`, { timeout: 8000 });

  await prueba('Hábitos · pestañas Hoy, Análisis y Logros (con sus gráficos)', async () => {
    await irA(page, 'habitos');
    await pestanaActiva('hoy');
    const filas = await page.$$eval('.o-habitos .habito-row', (els) => els.length);
    afirmar(filas >= 4, `la lista tiene ${filas} hábitos`);
    await page.locator(SEL.habTab('analisis')).click();
    await pestanaActiva('analisis');
    // Chart.js diferido: la dona y la tendencia quedan dibujadas.
    await page.waitForFunction(([d, t]) => window.Chart && window.Chart.getChart(document.querySelector(d)) && window.Chart.getChart(document.querySelector(t)), [SEL.habDona, SEL.habTendencia], { timeout: 10000 });
    // La dona conserva su caja (Chart.js no la hace crecer).
    const alto = await page.locator(SEL.habDona).evaluate((c) => c.getBoundingClientRect().height);
    afirmar(alto > 0 && alto <= 110, `la dona mide ${Math.round(alto)} px de alto`);
    await page.locator(SEL.habTab('logros')).click();
    await pestanaActiva('logros');
    await page.waitForSelector(`${SEL.habLogro} .o-anillo`, { state: 'visible' });
    const insignias = await page.$$eval(SEL.habInsignia, (els) => els.length);
    afirmar(insignias === 4, `hay ${insignias} insignias`);
    // Flechas del teclado entre pestañas (tablist).
    await page.locator(SEL.habTab('logros')).focus();
    await page.keyboard.press('ArrowRight');
    await pestanaActiva('hoy');
  });

  await prueba('Hoy · el chip de racha abre Hábitos › Logros', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.chipRacha).click();
    await page.waitForFunction(() => window.appRouter.currentView === 'habitos');
    await pestanaActiva('logros');
    await page.waitForSelector(`${SEL.habLogro} .o-anillo`, { state: 'visible' });
    await page.goBack();
    await page.waitForFunction(() => window.appRouter.currentView === 'dashboard');
    // El chip de Hábitos de la órbita abre la pestaña Hoy.
    await page.locator('#chip-habitos').click();
    await page.waitForFunction(() => window.appRouter.currentView === 'habitos');
    await pestanaActiva('hoy');
  });

  await prueba('CRUD · Hábitos: crear (algunos días), marcar, detalle con atrás, editar y eliminar', async () => {
    const nombre = 'Prueba hábito';
    await irA(page, 'habitos');
    await page.locator(SEL.habNuevo).click();
    await abierta(SEL.habModal);
    afirmar(await page.evaluate((s) => document.activeElement?.matches(s), SEL.habNombre), 'el foco no quedó en el nombre');
    await page.locator(SEL.habNombre).fill(nombre);
    await page.locator(SEL.habFrec('dias')).click();
    // Lunes 23 nov (hoy) y miércoles.
    await page.locator(SEL.habDia(0)).click();
    await page.locator(SEL.habDia(2)).click();
    afirmar(await page.locator(SEL.habDia(0)).getAttribute('aria-pressed') === 'true', 'el lunes no quedó elegido');
    await page.locator(SEL.habGuardar).click();
    await cerrada(SEL.habModal);
    await page.waitForSelector(SEL.habFila(nombre));
    // Marcar hoy desde la lista; queda marcado tras salir y volver.
    await page.locator(SEL.habCheck(nombre)).click();
    await page.waitForSelector(SEL.habitoMarcado(nombre), { timeout: 8000 });
    await irA(page, 'dashboard');
    await irA(page, 'habitos');
    await page.waitForSelector(SEL.habitoMarcado(nombre));
    // Detalle: abre como sub-pantalla y el botón atrás vuelve a la lista.
    await page.locator(SEL.habFila(nombre)).click();
    await page.waitForSelector(SEL.habVolver);
    afirmar((await page.locator(SEL.vistaTitulo).textContent()).trim() === nombre, 'el detalle no muestra el hábito');
    afirmar(/L, X/.test(await page.locator(SEL.habDetalleChips).textContent()), 'la frecuencia no quedó en lunes y miércoles');
    await page.goBack();
    await page.waitForSelector(SEL.habFila(nombre));
    afirmar((await page.evaluate(() => location.hash)) === '#habitos', 'atrás salió de Hábitos');
    // Editar el nombre desde el detalle.
    await page.locator(SEL.habFila(nombre)).click();
    await page.locator(SEL.habEditar).click();
    await abierta(SEL.habModal);
    afirmar(await page.locator(SEL.habNombre).inputValue() === nombre, 'la hoja de edición no trae el nombre');
    await page.locator(SEL.habNombre).fill(`${nombre} editado`);
    await page.locator(SEL.habGuardar).click();
    await cerrada(SEL.habModal);
    await page.waitForFunction(([s, n]) => document.querySelector(s)?.textContent.trim() === n, [SEL.vistaTitulo, `${nombre} editado`], { timeout: 8000 });
    // Eliminar con confirmación: vuelve a la lista sin el hábito.
    await page.locator(SEL.habEliminar).click();
    await abierta(SEL.confirmModal);
    await page.locator(SEL.confirmOk).click();
    await page.waitForSelector(SEL.habPanel);
    await page.waitForSelector(SEL.habFila(`${nombre} editado`), { state: 'detached', timeout: 8000 });
    afirmar((await page.evaluate(() => location.hash)) === '#habitos', 'eliminar salió de Hábitos');
  });

  // ---------- Lista + detalle (components/lista-detalle.js) ----------
  // history.length no sirve (un pushState tras retroceder borra las entradas
  // siguientes): se cuentan las llamadas a pushState y back.
  const espiarHistorial = () => page.evaluate(() => {
    if (window.__espia) return;
    window.__espia = { push: 0, back: 0 };
    const p = history.pushState.bind(history); const b = history.back.bind(history);
    history.pushState = (...a) => { window.__espia.push++; return p(...a); };
    history.back = () => { window.__espia.back++; return b(); };
  });
  const historial = () => page.evaluate(() => ({ push: window.__espia.push, back: window.__espia.back, hash: location.hash, vista: window.appRouter.currentView, detalle: !!(history.state && history.state.habitoDetalle) }));
  // Parte con el detalle cerrado (por si una prueba anterior lo dejó abierto).
  const sinDetalle = async () => {
    if (await page.$(SEL.habVolver)) await page.locator(SEL.habVolver).click();
    if (await page.$(SEL.habCerrar)) await page.locator(SEL.habCerrar).click();
    await page.waitForSelector(SEL.habPanel);
  };

  await prueba('Lista + detalle · 390: el detalle es sub-pantalla y atrás vuelve a la lista', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await irA(page, 'habitos');
    await sinDetalle();
    await espiarHistorial();
    const antes = await historial();
    await page.locator(SEL.habFila(HABITO_PENDIENTE)).click();
    await page.waitForSelector(SEL.habVolver);
    afirmar(!(await page.$('.o-habitos .habito-row')), 'la lista sigue en pantalla junto al detalle');
    afirmar(!(await page.$(SEL.habCerrar)), 'en celular aparece el cierre de PC');
    const abierto = await historial();
    afirmar(abierto.push === antes.push + 1 && abierto.detalle && abierto.hash === '#habitos', `abrir no empujó una entrada (${JSON.stringify(abierto)})`);
    await page.goBack();
    await page.waitForSelector(SEL.habFila(HABITO_PENDIENTE));
    const tras = await historial();
    afirmar(tras.vista === 'habitos' && !tras.detalle, 'atrás salió de Hábitos');
    // «Volver» de la cabecera hace lo mismo y no deja una entrada fantasma.
    await page.locator(SEL.habFila(HABITO_PENDIENTE)).click();
    await page.locator(SEL.habVolver).click();
    await page.waitForSelector(SEL.habFila(HABITO_PENDIENTE));
    const fin = await historial();
    afirmar(fin.push === tras.push + 1 && fin.back === tras.back + 1 && !fin.detalle, `«Volver» dejó el historial descuadrado (${JSON.stringify(fin)})`);
  });

  await prueba('Lista + detalle · 390: si el hábito abierto se borra en otro dispositivo, el detalle suelta su paso del historial', async () => {
    const nombre = 'QA remoto';
    await page.setViewportSize({ width: 390, height: 844 });
    await irA(page, 'dashboard');
    await irA(page, 'habitos');
    await sinDetalle();
    await page.locator(SEL.habNuevo).click();
    await abierta(SEL.habModal);
    await page.locator(SEL.habNombre).fill(nombre);
    await page.locator(SEL.habGuardar).click();
    await cerrada(SEL.habModal);
    await page.waitForSelector(SEL.habFila(nombre));
    await espiarHistorial();
    await page.locator(SEL.habFila(nombre)).click();
    await page.waitForSelector(SEL.habVolver);
    const abierto = await historial();
    afirmar(abierto.detalle, 'abrir no dejó la entrada del detalle');
    // «Otro dispositivo»: una segunda pestaña (misma base local) lo borra por
    // su propia UI; acá llega el mismo aviso que manda sync.js tras aplicar
    // eventos remotos.
    const otra = await context.newPage();
    try {
      await otra.goto(`${BASE}#habitos`);
      await otra.waitForFunction(() => window.appRouter && window.appRouter.currentView === 'habitos');
      await otra.locator(SEL.habFila(nombre)).click();
      await otra.locator(SEL.habEliminar).click();
      await otra.locator(SEL.confirmOk).click();
      // En celular la fila ya no está con el detalle abierto: se espera el
      // aviso del borrado y la vuelta a la lista sin ella.
      await esperarToast(otra, /Hábito eliminado/);
      await otra.waitForSelector(SEL.habPanel);
      afirmar(!(await otra.$(SEL.habFila(nombre))), 'la otra pestaña no borró el hábito');
    } finally {
      await otra.close();
    }
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('budget-updated')));
    await page.waitForSelector(SEL.habPanel);
    await page.waitForFunction((s) => !document.querySelector(s), SEL.habVolver, { timeout: 8000 });
    await page.waitForFunction(() => !(history.state && history.state.habitoDetalle), null, { timeout: 8000 });
    const tras = await historial();
    afirmar(tras.vista === 'habitos' && tras.back === abierto.back + 1, `el detalle no soltó su entrada (${JSON.stringify(tras)})`);
    afirmar(!(await page.$(SEL.habFila(nombre))), 'el hábito borrado sigue en la lista');
    // El siguiente atrás sale de Hábitos (antes no hacía nada).
    await page.goBack();
    await page.waitForFunction(() => window.appRouter.currentView === 'dashboard', null, { timeout: 8000 });
    await irA(page, 'habitos');
  });

  await prueba('Lista + detalle · 1440: lista y detalle juntos; abrir, cambiar y cerrar no cambian de ruta', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    try {
      await irA(page, 'habitos');
      await sinDetalle();
      await espiarHistorial();
      await page.waitForSelector(`${SEL.habLdDetalle} .o-ld-vacio`, { state: 'visible' });
      const antes = await historial();
      await page.locator(SEL.habFila(HABITO_PENDIENTE)).click();
      await page.waitForFunction(([s, n]) => document.querySelector(s)?.textContent.trim() === n, [SEL.ldTitulo, HABITO_PENDIENTE], { timeout: 8000 });
      // Las dos columnas visibles, el detalle a la derecha de la lista.
      const caja = await page.evaluate(([l, d]) => {
        const a = document.querySelector(l).getBoundingClientRect(); const b = document.querySelector(d).getBoundingClientRect();
        return { lista: a.width > 0 && a.height > 0, detalle: b.width > 0 && b.height > 0, derecha: b.left >= a.right };
      }, [SEL.habLdLista, SEL.habLdDetalle]);
      afirmar(caja.lista && caja.detalle && caja.derecha, `columnas: ${JSON.stringify(caja)}`);
      afirmar(await page.locator(SEL.habFila(HABITO_PENDIENTE)).getAttribute('aria-current') === 'true', 'la fila abierta no queda marcada');
      let ahora = await historial();
      afirmar(ahora.push === antes.push && ahora.back === antes.back && ahora.hash === antes.hash, `abrir tocó el historial (${JSON.stringify(ahora)})`);
      // Cambiar a otro hábito: el detalle cambia sin historial.
      await page.locator(SEL.habFila('Gimnasio')).click();
      await page.waitForFunction((s) => document.querySelector(s)?.textContent.trim() === 'Gimnasio', SEL.ldTitulo, { timeout: 8000 });
      // Marcar desde la franja del detalle repinta sin cerrarlo.
      await page.locator(`${SEL.habLdDetalle} .day-toggle[aria-label^="Marcar Gimnasio el lunes"]`).click();
      await page.waitForSelector(`${SEL.habLdDetalle} .day-toggle[aria-label^="Desmarcar Gimnasio el lunes"]`, { timeout: 8000 });
      await page.locator(`${SEL.habLdDetalle} .day-toggle[aria-label^="Desmarcar Gimnasio el lunes"]`).click();
      await page.waitForSelector(`${SEL.habLdDetalle} .day-toggle[aria-label^="Marcar Gimnasio el lunes"]`, { timeout: 8000 });
      await page.screenshot({ path: path.join(SALIDA, 'lista-detalle-1440.png') });
      // Cerrar: vuelve el aviso «Elige un hábito», misma ruta y mismo historial.
      await page.locator(SEL.habCerrar).click();
      await page.waitForSelector(`${SEL.habLdDetalle} .o-ld-vacio`, { state: 'visible' });
      ahora = await historial();
      afirmar(ahora.push === antes.push && ahora.back === antes.back && ahora.hash === '#habitos' && ahora.vista === 'habitos', `cerrar cambió la ruta o el historial (${JSON.stringify(ahora)})`);
      // Pasar de PC a celular con el detalle abierto: queda como sub-pantalla
      // y el atrás vuelve a la lista sin salir de Hábitos.
      await page.locator(SEL.habFila(HABITO_PENDIENTE)).click();
      await page.waitForSelector(SEL.habCerrar);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForSelector(SEL.habVolver, { timeout: 8000 });
      await page.goBack();
      await page.waitForSelector(SEL.habFila(HABITO_PENDIENTE));
      afirmar((await historial()).vista === 'habitos', 'el atrás tras achicar la ventana salió de Hábitos');
    } finally {
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });

  await prueba('Hábitos · un hábito con cantidad registra su progreso y cumple la meta', async () => {
    await irA(page, 'habitos');
    await page.locator(SEL.habCantidad('Leer')).click();
    await abierta(SEL.progresoModal);
    await page.locator(SEL.progresoInput).fill('20');
    await page.locator(SEL.progresoGuardar).click();
    await cerrada(SEL.progresoModal);
    await page.waitForFunction((s) => { const b = document.querySelector(s); return b && b.getAttribute('aria-pressed') === 'true' && b.textContent.trim() === '20'; }, SEL.habCantidad('Leer'), { timeout: 8000 });
    // El atrás cierra la hoja sin salir de la vista.
    await page.locator(SEL.habCantidad('Leer')).click();
    await abierta(SEL.progresoModal);
    await page.goBack();
    await cerrada(SEL.progresoModal);
    afirmar((await page.evaluate(() => location.hash)) === '#habitos', 'atrás salió de Hábitos');
  });

  await prueba('Hábitos · objetivos táctiles de 44 px y contraste AA en las 3 pestañas y el detalle (color y sobrio)', async () => {
    const revisar = async (donde) => {
      const chicos = await page.$$eval('.o-habitos button', (bs) => bs.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && !b.closest('.modal-overlay') && (r.width < 44 || r.height < 44);
      }).map((b) => `${b.getAttribute('aria-label') || b.textContent.trim()} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`));
      afirmar(chicos.length === 0, `${donde}: botones bajo 44 px: ${chicos.slice(0, 3).join(', ')}`);
      const fallas = await fallasContraste(page, '.o-habitos *');
      afirmar(fallas.length === 0, `${donde}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
    };
    try {
      for (const tema of ['color', 'gris']) {
        await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.reload();
          await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
          await irA(page, 'habitos');
          for (const t of ['hoy', 'analisis', 'logros']) {
            await page.locator(SEL.habTab(t)).click();
            await pestanaActiva(t);
            await page.waitForTimeout(t === 'analisis' ? 700 : 300);
            await revisar(`${tema} ${vp.nombre} ${t}`);
            await page.screenshot({ path: path.join(SALIDA, `habitos-${t}-${tema}-${vp.nombre}.png`), fullPage: true });
          }
          await page.locator(SEL.habTab('hoy')).click();
          await pestanaActiva('hoy');
          // Detalle: sub-pantalla bajo 1024 px (atrás vuelve); en PC, a la
          // derecha de la lista (se cierra con su botón).
          const ancho = vp.width >= 1024;
          await page.locator(SEL.habFila(HABITO_PENDIENTE)).click();
          await page.waitForSelector(ancho ? SEL.habCerrar : SEL.habVolver);
          await page.waitForTimeout(300);
          await revisar(`${tema} ${vp.nombre} detalle`);
          await page.screenshot({ path: path.join(SALIDA, `habitos-detalle-${tema}-${vp.nombre}.png`), fullPage: true });
          if (ancho) await page.locator(SEL.habCerrar).click();
          else await page.goBack();
          await page.waitForSelector(SEL.habPanel);
          await page.waitForSelector(SEL.habCerrar, { state: 'detached' });
        }
      }
      // Hoja del formulario en 390.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator(SEL.habNuevo).click();
      await abierta(SEL.habModal);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SALIDA, 'habitos-form-gris-390.png') });
      await page.goBack();
      await cerrada(SEL.habModal);
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
    }
  });

  // ---------- Crear / editar / borrar (Tareas) ----------
  await prueba('CRUD · editar la tarea creada', async () => {
    await page.goto(BASE + 'index.html#tareas'); // también suelta la sesión de entreno de la vista
    await page.waitForFunction(() => window.appRouter && window.appRouter.currentView === 'tareas');
    await page.locator(SEL.tareaCard('Prueba verificación')).first().click();
    await page.locator(SEL.tareaEditar).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.tareaModal);
    await page.locator(SEL.tareaTitulo).fill('Prueba verificación editada');
    await page.locator(SEL.tareaGuardar).click();
    await esperarToast(page, /Tarea guardada/);
    // El detalle (sub-pantalla en 390) se pone al día; atrás vuelve a la lista.
    await page.waitForSelector('.o-plan-det-cab h1:has-text("Prueba verificación editada")');
    await page.goBack();
    await page.waitForSelector(SEL.tareaCard('Prueba verificación editada'));
  });

  await prueba('CRUD · borrar la tarea (con confirmación)', async () => {
    await page.locator(SEL.tareaCard('Prueba verificación editada')).first().click();
    await page.locator(SEL.tareaEliminarDet).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Tarea eliminada/);
    await page.waitForSelector(SEL.toastOk, { timeout: 2000 });
    await page.waitForSelector(SEL.tareaCard('Prueba verificación editada'), { state: 'detached' });
  });

  // ---------- Plan (Fase 7) ----------
  const histTarea = () => page.evaluate(() => ({ push: window.__espia.push, back: window.__espia.back, hash: location.hash, vista: window.appRouter.currentView, detalle: !!(history.state && history.state.tareaDetalle) }));
  const sinDetalleTarea = async () => {
    if (await page.$(SEL.tareaVolver)) await page.locator(SEL.tareaVolver).click();
    if (await page.$(SEL.tareaCerrar)) await page.locator(SEL.tareaCerrar).click();
    await page.waitForSelector(SEL.tarLdLista);
  };

  await prueba('Plan · Tareas con lista + detalle: sub-pantalla en 390, al lado en 1440 sin tocar el historial', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await irA(page, 'tareas');
      await sinDetalleTarea();
      await espiarHistorial();
      const antes = await histTarea();
      await page.locator(SEL.tareaCard('Renovar el pasaporte')).click();
      await page.waitForSelector(SEL.tareaVolver);
      afirmar(!(await page.$('.o-tarea-fila')), 'la lista sigue en pantalla junto al detalle');
      // La fecha vencida es una alerta real: ícono y texto.
      afirmar(!!(await page.$('.o-tarea-chip-alerta svg')) && /Venció/.test(await page.locator('.o-tarea-chip-alerta').textContent()), 'la fecha vencida no lleva ícono y texto');
      let h = await histTarea();
      afirmar(h.push === antes.push + 1 && h.detalle && h.hash === '#tareas', `abrir no empujó una entrada (${JSON.stringify(h)})`);
      await page.goBack();
      await page.waitForSelector(SEL.tareaCard('Renovar el pasaporte'));
      h = await histTarea();
      afirmar(h.vista === 'tareas' && !h.detalle, 'atrás salió de Plan');

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForSelector(`${SEL.tarLdDetalle} .o-ld-vacio`, { state: 'visible' });
      const pc = await histTarea();
      await page.locator(SEL.tareaEstado('in-progress')).click();
      await page.locator(SEL.tareaCard('Preparar presentación')).click();
      await page.waitForFunction((s) => document.querySelector(s)?.textContent.trim() === 'Preparar presentación', SEL.tarLdTitulo, { timeout: 8000 });
      const caja = await page.evaluate(([l, d]) => {
        const a = document.querySelector(l).getBoundingClientRect(); const b = document.querySelector(d).getBoundingClientRect();
        return { lista: a.width > 0, detalle: b.width > 0, derecha: b.left >= a.right };
      }, [SEL.tarLdLista, SEL.tarLdDetalle]);
      afirmar(caja.lista && caja.detalle && caja.derecha, `columnas: ${JSON.stringify(caja)}`);
      afirmar(await page.locator(SEL.tareaCard('Preparar presentación')).getAttribute('aria-current') === 'true', 'la fila abierta no queda marcada');
      await page.locator(SEL.tareaCard('Curso de inglés')).click();
      await page.waitForFunction((s) => /Curso de inglés/.test(document.querySelector(s)?.textContent || ''), SEL.tarLdTitulo, { timeout: 8000 });
      await page.screenshot({ path: path.join(SALIDA, 'plan-tareas-detalle-1440.png') });
      await page.locator(SEL.tareaCerrar).click();
      await page.waitForSelector(`${SEL.tarLdDetalle} .o-ld-vacio`, { state: 'visible' });
      h = await histTarea();
      afirmar(h.push === pc.push && h.back === pc.back && h.hash === '#tareas' && h.vista === 'tareas', `en PC el detalle tocó el historial o la ruta (${JSON.stringify(h)})`);
    } finally {
      await page.setViewportSize({ width: 390, height: 844 });
      if (await page.$(SEL.tareaEstado('todo'))) await page.locator(SEL.tareaEstado('todo')).click();
    }
  });

  await prueba('Plan · alta rápida, Empezar desde la fila, Hecho desde el detalle y eliminar', async () => {
    await irA(page, 'tareas');
    await sinDetalleTarea();
    await page.locator(SEL.tareaRapida).fill('QA rápida');
    await page.locator(SEL.tareaRapida).press('Enter');
    await esperarToast(page, /Tarea agregada/);
    await page.locator(`${SEL.tareaFila('QA rápida')} .btn-advance-task`).click();
    await esperarToast(page, /Tarea en curso/);
    await page.locator(SEL.tareaEstado('in-progress')).click();
    await page.waitForSelector(`${SEL.tareaFila('QA rápida')} .o-check`);
    await page.locator(SEL.tareaCard('QA rápida')).click();
    await page.locator(SEL.tareaDetEstado('done')).click();
    await esperarToast(page, /Pasó a Hecho/);
    await page.waitForSelector(`${SEL.tareaDetEstado('done')}[aria-pressed="true"]`);
    afirmar(!(await page.$(SEL.tareaFoco)), 'una tarea hecha sigue ofreciendo Foco');
    await page.locator(SEL.tareaEliminarDet).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Tarea eliminada/);
    await page.waitForSelector(SEL.tarLdLista);
    afirmar(!(await page.$(SEL.tareaCard('QA rápida'))), 'la tarea eliminada sigue en la lista');
    afirmar(!(await page.evaluate(() => !!(history.state && history.state.tareaDetalle))), 'quedó la entrada de historial del detalle');
    await page.locator(SEL.tareaEstado('todo')).click();
  });

  await prueba('Plan · la hoja de tarea nueva y el Foco desde el detalle', async () => {
    await irA(page, 'tareas');
    await sinDetalleTarea();
    await page.locator(SEL.tareaNueva).click();
    await abierta(SEL.tareaModal);
    afirmar((await page.locator('#task-modal-titulo').textContent()).trim() === 'Nueva tarea', 'la hoja no dice «Nueva tarea»');
    afirmar(!!(await page.$('#task-modal .btn-dificultad-chip.o-tarea-sugerida[data-dificultad="media"]')), 'falta la dificultad «Media» sugerida');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SALIDA, 'plan-hoja-tarea-390.png') });
    await page.goBack();
    await cerrada(SEL.tareaModal);
    afirmar((await page.evaluate(() => location.hash)) === '#tareas', 'atrás en la hoja cambió de vista');
    // Foco: pantalla completa; Terminar pregunta y no registra.
    await page.locator(SEL.tareaCard('Ordenar la bodega')).click();
    await page.locator(SEL.tareaFoco).click();
    await abierta(SEL.focoModal);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SALIDA, 'plan-foco-390.png') });
    const fallas = await fallasContraste(page, '#foco-modal *');
    afirmar(fallas.length === 0, `foco: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
    await page.locator('#foco-terminar').click();
    await page.locator('#foco-cancelar').click();
    await esperarToast(page, /Foco terminado sin registrar/);
    await page.waitForSelector(SEL.focoModal, { state: 'detached' });
    await page.goBack();
    await page.waitForSelector(SEL.tarLdLista);
  });

  await prueba('Plan · Semana: agregar, marcar y borrar un ítem del día', async () => {
    await irA(page, 'tareas/semana');
    afirmar((await page.locator(SEL.semanaDia).count()) === 7, 'la franja no tiene 7 días');
    afirmar(!!(await page.$(`${SEL.semanaTira} svg`)), 'la tira de atrasadas no lleva ícono');
    await page.locator(SEL.semanaNueva).fill('QA semana');
    await page.locator(SEL.semanaNueva).press('Enter');
    await page.waitForSelector(SEL.semanaItem('QA semana'));
    await page.locator(`${SEL.semanaItem('QA semana')} .plan-check`).click();
    await page.waitForSelector(`.plan-item--hecha:has(.plan-item-texto:has-text("QA semana"))`);
    await page.locator(`${SEL.semanaItem('QA semana')} .plan-delete`).click();
    await page.locator(SEL.confirmOk).click();
    await page.waitForSelector(SEL.semanaItem('QA semana'), { state: 'detached' });
    afirmar(!!(await page.$('.tareas-subtabs')), 'las pestañas de Plan desaparecieron al repintar Semana');
    await irA(page, 'tareas');
  });

  await prueba('Modo sobrio · los íconos de alerta conservan el color de su texto (Hoy, Plan, hoja de tarea y avisos)', async () => {
    // Cada ícono de alerta visible: mismo color que el texto que acompaña
    // y con color (no gris). En sobrio, el resto de los íconos sí pasa a gris.
    const revisarIconos = async (donde) => {
      await page.waitForSelector('svg.o-ico-alerta', { timeout: 5000 });
      const iconos = await page.$$eval('svg.o-ico-alerta', (svgs) => svgs.filter((s) => s.getBoundingClientRect().width > 0).map((s) => {
        const c = getComputedStyle(s).color;
        const t = getComputedStyle(s.parentElement).color;
        const n = (c.match(/[\d.]+/g) || []).map(Number);
        const gris = c.startsWith('oklch') ? n[1] < 0.02 : Math.max(n[0], n[1], n[2]) - Math.min(n[0], n[1], n[2]) < 16;
        // En los avisos emergentes el texto es neutro y el color de estado va
        // solo en el ícono (igual en modo color): ahí basta con que no sea gris.
        const aviso = !!s.closest('.o-toast');
        return { c, t, gris, aviso, lugar: (s.parentElement.textContent || '').trim().slice(0, 30) };
      }));
      afirmar(iconos.length > 0, `${donde}: no hay íconos de alerta visibles`);
      const mal = iconos.find((i) => i.gris || (!i.aviso && i.c !== i.t));
      afirmar(!mal, `${donde}: el ícono de «${mal?.lugar}» quedó ${mal?.c} y su texto ${mal?.t}`);
      return iconos.length;
    };
    try {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'gris'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
      afirmar(await page.evaluate(() => document.documentElement.dataset.tema === 'gris'), 'no entró al modo sobrio');
      // Control: un ícono que no es de alerta sigue pasando a gris.
      await irA(page, 'dashboard');
      await revisarIconos('Hoy');
      await page.screenshot({ path: path.join(SALIDA, 'sobrio-alertas-hoy-390.png'), fullPage: true });
      await irA(page, 'tareas');
      await sinDetalleTarea();
      await revisarIconos('Plan · lista');
      const otro = await page.$eval(`${SEL.tareaCard('Renovar el pasaporte')} svg:not(.o-ico-alerta)`, (s) => getComputedStyle(s).color).catch(() => null);
      if (otro) {
        const n = (otro.match(/[\d.]+/g) || []).map(Number);
        afirmar(otro.startsWith('oklch') ? n[1] < 0.02 : Math.max(n[0], n[1], n[2]) - Math.min(n[0], n[1], n[2]) < 16, `un ícono común dejó de pasar a gris (${otro})`);
      }
      await page.locator(SEL.tareaCard('Renovar el pasaporte')).click();
      await page.waitForSelector(SEL.tareaVolver);
      await revisarIconos('Plan · detalle');
      await page.screenshot({ path: path.join(SALIDA, 'sobrio-alertas-detalle-390.png') });
      await page.locator(SEL.tareaEditar).click();
      await abierta(SEL.tareaModal);
      await page.waitForSelector('#task-due-aviso svg.o-ico-alerta');
      await revisarIconos('hoja de tarea');
      await page.goBack();
      await cerrada(SEL.tareaModal);
      await page.goBack();
      await page.waitForSelector(SEL.tarLdLista);
      await irA(page, 'tareas/semana');
      await revisarIconos('Semana');
      await page.screenshot({ path: path.join(SALIDA, 'sobrio-alertas-semana-390.png'), fullPage: true });
      // Aviso emergente: guardar una nota vacía muestra uno con ícono de alerta.
      await irA(page, 'tareas/notas');
      await page.locator('.cat-abrir').first().click();
      await page.waitForSelector('#nota-guardar');
      await page.evaluate((s) => { const t = document.querySelector(s); if (t) t.innerHTML = ''; }, SEL.toast);
      await page.locator('#nota-guardar').click();
      await esperarToast(page, /Escribe algo/);
      await revisarIconos('aviso');
      await page.locator('#cat-volver').click();
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
      await irA(page, 'tareas');
    }
  });

  await prueba('Plan · objetivos táctiles de 44 px y contraste AA en Tareas, el detalle, Semana y Notas (color y sobrio)', async () => {
    const revisar = async (donde) => {
      const chicos = await page.$$eval('.o-plan button', (bs) => bs.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && !b.closest('.modal-overlay, .plan-col') && (r.width < 44 || r.height < 44);
      }).map((b) => `${b.getAttribute('aria-label') || b.textContent.trim()} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`));
      afirmar(chicos.length === 0, `${donde}: botones bajo 44 px: ${chicos.slice(0, 3).join(', ')}`);
      const fallas = await fallasContraste(page, '.o-plan *');
      afirmar(fallas.length === 0, `${donde}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
    };
    try {
      for (const tema of ['color', 'gris']) {
        await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.reload();
          await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
          await irA(page, 'tareas');
          await revisar(`${tema} ${vp.nombre} tareas`);
          await page.screenshot({ path: path.join(SALIDA, `plan-tareas-${tema}-${vp.nombre}.png`), fullPage: true });
          const ancho = vp.width >= 1024;
          await page.locator(SEL.tareaCard('Renovar el pasaporte')).click();
          await page.waitForSelector(ancho ? SEL.tareaCerrar : SEL.tareaVolver);
          await page.waitForTimeout(300);
          await revisar(`${tema} ${vp.nombre} detalle`);
          await page.screenshot({ path: path.join(SALIDA, `plan-detalle-${tema}-${vp.nombre}.png`), fullPage: true });
          if (ancho) await page.locator(SEL.tareaCerrar).click();
          else await page.goBack();
          await page.waitForSelector(SEL.tarLdLista);
          for (const sub of ['semana', 'notas']) {
            await irA(page, `tareas/${sub}`);
            await page.waitForTimeout(300);
            await revisar(`${tema} ${vp.nombre} ${sub}`);
            await page.screenshot({ path: path.join(SALIDA, `plan-${sub}-${tema}-${vp.nombre}.png`), fullPage: true });
          }
        }
      }
      // Hoja de tarea en sobrio (390): contraste dentro de la hoja.
      await page.setViewportSize({ width: 390, height: 844 });
      await irA(page, 'tareas');
      await page.locator(SEL.tareaNueva).click();
      await abierta(SEL.tareaModal);
      await page.waitForTimeout(400);
      const fallas = await fallasContraste(page, '#task-modal *');
      afirmar(fallas.length === 0, `hoja (sobrio): «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
      await page.screenshot({ path: path.join(SALIDA, 'plan-hoja-gris-390.png') });
      await page.goBack();
      await cerrada(SEL.tareaModal);
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
    }
  });

  // ---------- Finanzas (Órbita, Fase 8) ----------
  await prueba('Finanzas · saldos, arrastre y totales idénticos a la foto de antes de la Fase 8', async () => {
    // Contexto propio (datos demo + escenario de foto-finanzas.mjs), leído por la interfaz Órbita.
    const despues = await tomarFoto(browser, BASE, { leerUi: leerUiOrbita, capturas: path.join(SALIDA, 'finanzas-foto') });
    fs.writeFileSync(path.join(SALIDA, 'finanzas-despues.json'), JSON.stringify(despues, null, 2) + '\n');
    afirmar(despues.errores.length === 0, `errores de consola: ${despues.errores[0]}`);
    const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES, 'utf8')), despues);
    afirmar(difs.length === 0, `${difs.length} diferencias: ${difs.slice(0, 3).join(' | ')}`);
  });

  const histFin = (clave) => page.evaluate((c) => ({ push: window.__espia.push, back: window.__espia.back, hash: location.hash, vista: window.appRouter.currentView, detalle: !!(history.state && history.state[c]) }), clave);

  await prueba('Finanzas · Movimientos y Recurrentes con lista + detalle: sub-pantalla en 390, al lado en 1440 sin tocar el historial', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await irA(page, 'finanzas');
      await espiarHistorial();
      for (const caso of [
        { tab: 'movimientos', fila: SEL.finMov('Metro'), volver: SEL.finMovVolver, cerrar: SEL.finMovCerrar, ld: SEL.finMovLd, clave: 'movDetalle', titulo: 'Metro', otra: SEL.finMov('Restaurante') },
        { tab: 'recurrentes', fila: SEL.finRec('Internet'), volver: SEL.finRecVolver, cerrar: SEL.finRecCerrar, ld: SEL.finRecLd, clave: 'recDetalle', titulo: 'Internet', otra: null }
      ]) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator(SEL.finTab(caso.tab)).click();
        await page.waitForSelector(caso.fila);
        const antes = await histFin(caso.clave);
        await page.locator(caso.fila).click();
        await page.waitForSelector(caso.volver);
        afirmar(!(await page.$(caso.ld)), `${caso.tab}: la lista sigue en pantalla junto al detalle`);
        afirmar((await page.locator('#view-root h1').textContent()).trim() === caso.titulo, `${caso.tab}: el título del detalle no es ${caso.titulo}`);
        let h = await histFin(caso.clave);
        afirmar(h.push === antes.push + 1 && h.detalle && h.hash === '#finanzas', `${caso.tab}: abrir no empujó una entrada (${JSON.stringify(h)})`);
        await page.screenshot({ path: path.join(SALIDA, `finanzas-${caso.tab}-detalle-390.png`) });
        await page.goBack();
        await page.waitForSelector(caso.fila);
        h = await histFin(caso.clave);
        afirmar(h.vista === 'finanzas' && !h.detalle, `${caso.tab}: atrás salió de Finanzas`);
        afirmar(await page.locator(SEL.finTab(caso.tab)).getAttribute('aria-selected') === 'true', `${caso.tab}: atrás cambió de pestaña`);

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForSelector(`${caso.ld} .o-ld-vacio`, { state: 'visible' });
        const pc = await histFin(caso.clave);
        await page.locator(caso.fila).click();
        await page.waitForSelector(caso.cerrar);
        const caja = await page.evaluate((ld) => {
          const a = document.querySelector(`${ld} .o-ld-lista`).getBoundingClientRect(); const b = document.querySelector(`${ld} .o-ld-detalle`).getBoundingClientRect();
          return { lista: a.width > 0, detalle: b.width > 0, derecha: b.left >= a.right };
        }, caso.ld);
        afirmar(caja.lista && caja.detalle && caja.derecha, `${caso.tab}: columnas ${JSON.stringify(caja)}`);
        afirmar(await page.locator(caso.fila).getAttribute('aria-current') === 'true', `${caso.tab}: la fila abierta no queda marcada`);
        if (caso.otra) {
          await page.locator(caso.otra).click();
          await page.waitForFunction((ld) => /Restaurante/.test(document.querySelector(`${ld} .o-ld-titulo`)?.textContent || ''), caso.ld, { timeout: 8000 });
        }
        await page.screenshot({ path: path.join(SALIDA, `finanzas-${caso.tab}-detalle-1440.png`) });
        await page.locator(caso.cerrar).click();
        await page.waitForSelector(`${caso.ld} .o-ld-vacio`, { state: 'visible' });
        h = await histFin(caso.clave);
        afirmar(h.push === pc.push && h.back === pc.back && h.hash === '#finanzas' && h.vista === 'finanzas', `${caso.tab}: en PC el detalle tocó el historial o la ruta (${JSON.stringify(h)})`);
      }
    } finally {
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });

  await prueba('Finanzas · los detalles muestran saldo y alertas con ícono y texto (sobre negativo, cobro que no alcanza)', async () => {
    await irA(page, 'finanzas');
    // Movimiento de Transporte (saldo negativo en los datos demo): saldo del sobre con ícono de alerta.
    await page.locator(SEL.finTab('movimientos')).click();
    await page.locator(SEL.finMov('Metro')).click();
    await page.waitForSelector(SEL.finMovVolver);
    const saldo = await page.evaluate(() => {
      const fila = [...document.querySelectorAll('.o-fin-datos > div')].find((d) => /Saldo de Transporte/.test(d.textContent));
      return fila ? { texto: fila.querySelector('dd').textContent.trim(), icono: !!fila.querySelector('dd svg.o-ico-alerta') } : null;
    });
    afirmar(saldo && /^-\$[\d.]+$/.test(saldo.texto) && saldo.icono, `saldo del sobre en el detalle: ${JSON.stringify(saldo)}`);
    await page.goBack();
    await page.waitForSelector(SEL.movimientos);
    // Recurrente que su sobre no cubre: aviso con ícono y texto.
    await page.locator(SEL.finTab('recurrentes')).click();
    await page.locator(SEL.finRec('Internet')).click();
    await page.waitForSelector(SEL.finRecVolver);
    const aviso = await page.evaluate(() => { const a = document.querySelector('.o-fin-aviso-cobro'); return a ? { texto: a.textContent.replace(/\s+/g, ' ').trim(), icono: !!a.querySelector('svg.o-ico-alerta') } : null; });
    afirmar(aviso && /no alcanza para este cobro: faltan \$[\d.]+/.test(aviso.texto) && aviso.icono, `aviso del cobro: ${JSON.stringify(aviso)}`);
    await page.goBack();
    await page.waitForSelector(SEL.finRec('Internet'));
    // Sobre con saldo negativo: ícono + texto en la tarjeta.
    await page.locator(SEL.finTab('sobres')).click();
    const tarjeta = await page.locator(`${SEL.finSobre('Transporte')} .o-fin-sobre-saldo`).evaluate((p) => ({ icono: !!p.querySelector('svg.o-ico-alerta'), texto: p.textContent.replace(/\s+/g, ' ').trim() }));
    afirmar(tarjeta.icono && /Saldo negativo: -\$/.test(tarjeta.texto), `tarjeta de Transporte: ${JSON.stringify(tarjeta)}`);
    // Cada meta conserva su ícono (como en la tarjeta de antes).
    const metasSinIcono = await page.$$eval('.goal-row', (gs) => gs.filter((g) => !g.querySelector('.o-fila-ico svg')).length);
    afirmar(metasSinIcono === 0, `${metasSinIcono} metas sin ícono`);
  });

  await prueba('Finanzas · eliminar un movimiento y un pago fijo desde su detalle', async () => {
    await irA(page, 'finanzas');
    await page.locator(SEL.finTab('movimientos')).click();
    await page.locator(SEL.finMov('Almuerzo')).click();
    await page.waitForSelector(SEL.finMovEliminar);
    await page.locator(SEL.finMovEliminar).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Movimiento eliminado/);
    await page.waitForSelector(SEL.movimientos);
    await page.waitForFunction((s) => !/Almuerzo/.test(document.querySelector(s)?.textContent || ''), SEL.movimientos, { timeout: 8000 });
    afirmar(!(await histFin('movDetalle')).detalle, 'quedó la entrada de historial del detalle');
    await page.locator(SEL.finTab('recurrentes')).click();
    await page.locator(SEL.finRec('App de música')).click();
    await page.waitForSelector(SEL.finRecEliminar);
    await page.locator(SEL.finRecEliminar).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Pago fijo eliminado/);
    await page.waitForSelector(SEL.finRecLd);
    afirmar(!(await page.$(SEL.finRec('App de música'))), 'el pago fijo sigue en la lista');
    afirmar((await histFin('recDetalle')).vista === 'finanzas', 'eliminar salió de Finanzas');
  });

  // --- Hojas de Finanzas (Órbita, Fase 8b): crear, editar y borrar de punta a punta ---
  const saldoSobre = (nombre) => page.locator(`${SEL.finSobre(nombre)} .o-fin-sobre-saldo .o-num`).textContent().then((t) => t.trim());
  const aPesos = (t) => Number(t.replace(/[^\d-]/g, ''));
  const teclear = async (digitos) => { for (const v of digitos) await page.locator(SEL.gastoTecla(v)).click(); };

  await prueba('Finanzas · hoja de gasto: crear, editar y borrar, con el saldo del sobre en cada paso', async () => {
    await irA(page, 'finanzas');
    await page.locator(SEL.finTab('sobres')).click();
    const inicial = aPesos(await saldoSobre('Salidas'));
    // Crear.
    await page.locator('#btn-fab-gasto').click();
    await abierta(SEL.gastoModal);
    afirmar(await page.locator(`${SEL.gastoModal}.o-ui .o-hoja`).count() === 1, 'la hoja de gasto no es una hoja de Órbita');
    await page.locator(`${SEL.gastoChip}:text-is("Salidas")`).click();
    await teclear(['1', '5', '0', '0']);
    afirmar((await page.locator('#gasto-numpad-display').textContent()).trim() === '$1.500', 'la cifra no muestra $1.500');
    await page.locator(SEL.gastoLabel).fill('Prueba E2E gasto');
    await page.locator(SEL.gastoGuardar).click();
    await cerrada(SEL.gastoModal);
    await page.waitForFunction((v) => {
      const c = [...document.querySelectorAll('.env-row')].find((e) => e.querySelector('.o-fin-sobre-nombre')?.textContent.trim() === 'Salidas');
      return c && Number(c.querySelector('.o-fin-sobre-saldo .o-num').textContent.replace(/[^\d-]/g, '')) === v;
    }, inicial - 1500, { timeout: 8000 });
    // Editar desde su detalle.
    await page.locator(SEL.finTab('movimientos')).click();
    await page.locator(SEL.finMov('Prueba E2E gasto')).click();
    await page.locator('#btn-editar-mov').click();
    await abierta(SEL.gastoModal);
    afirmar((await page.locator('#gasto-numpad-display').textContent()).trim() === '$1.500', 'editar no precargó el monto');
    afirmar(await page.locator(`${SEL.gastoChip}:text-is("Salidas")`).getAttribute('aria-pressed') === 'true', 'editar no precargó el sobre');
    await teclear(['del', 'del', 'del', 'del', '2', '5', '0', '0']);
    await page.locator(SEL.gastoLabel).fill('Prueba E2E gasto editado');
    await page.locator(SEL.gastoGuardar).click();
    await cerrada(SEL.gastoModal);
    await page.waitForFunction(() => /Prueba E2E gasto editado/.test(document.getElementById('view-root').textContent), null, { timeout: 8000 });
    afirmar(/-\$2\.500/.test(await page.locator('#fin-mov-monto').textContent()), 'el detalle no muestra el monto editado');
    await page.goBack(); // sub-pantalla (390)
    await page.waitForSelector(SEL.movimientos);
    await page.locator(SEL.finTab('sobres')).click();
    afirmar(aPesos(await saldoSobre('Salidas')) === inicial - 2500, 'el saldo de Salidas no refleja la edición');
    // Borrar.
    await page.locator(SEL.finTab('movimientos')).click();
    await page.locator(SEL.finMov('Prueba E2E gasto editado')).click();
    await page.locator(SEL.finMovEliminar).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Movimiento eliminado/);
    await page.waitForSelector(SEL.movimientos);
    await page.locator(SEL.finTab('sobres')).click();
    afirmar(aPesos(await saldoSobre('Salidas')) === inicial, 'borrar no devolvió el saldo de Salidas');
  });

  await prueba('Finanzas · hoja de sobre: crear, editar y archivar (con atrás que cierra la hoja)', async () => {
    await irA(page, 'finanzas');
    await page.locator(SEL.finTab('sobres')).click();
    // Atrás cierra la hoja sin salir de Finanzas.
    await page.locator('.btn-add-envelope').click();
    await abierta('#envelope-modal');
    await page.goBack();
    await cerrada('#envelope-modal');
    afirmar((await page.evaluate(() => location.hash)) === '#finanzas', 'atrás salió de Finanzas');
    // Crear.
    await page.locator('.btn-add-envelope').click();
    await abierta('#envelope-modal');
    afirmar((await page.locator('#envelope-modal-titulo').textContent()) === 'Nuevo sobre', 'título de la hoja nueva');
    await page.locator('#envelope-name').fill('Prueba sobre');
    await page.locator('#envelope-category').selectOption('Wants');
    await page.locator('#envelope-amount').fill('5000');
    afirmar((await page.locator('#envelope-amount').inputValue()) === '5.000', 'el monto no se formateó con miles');
    await page.locator('#envelope-guardar').click();
    await esperarToast(page, /Sobre guardado/);
    await cerrada('#envelope-modal');
    await page.waitForSelector(SEL.finSobre('Prueba sobre'));
    afirmar(await saldoSobre('Prueba sobre') === '$5.000', 'el sobre nuevo no tiene $5.000');
    // Editar (menú ⋯ › Editar).
    await page.locator(`${SEL.finSobre('Prueba sobre')} .sobre-menu-btn`).click();
    await page.locator(`${SEL.finSobre('Prueba sobre')} .edit-env`).click();
    await abierta('#envelope-modal');
    afirmar((await page.locator('#envelope-modal-titulo').textContent()) === 'Editar sobre', 'título de la hoja de edición');
    afirmar((await page.locator('#envelope-name').inputValue()) === 'Prueba sobre' && (await page.locator('#envelope-amount').inputValue()) === '5.000', 'editar no precargó el sobre');
    await page.locator('#envelope-amount').fill('8000');
    await page.locator('#envelope-guardar').click();
    await esperarToast(page, /Sobre guardado/);
    await cerrada('#envelope-modal');
    await page.waitForFunction(() => [...document.querySelectorAll('.env-row')].some((e) => e.querySelector('.o-fin-sobre-nombre')?.textContent.trim() === 'Prueba sobre' && e.querySelector('.o-fin-sobre-saldo .o-num').textContent.trim() === '$8.000'), null, { timeout: 8000 });
    // Borrar = archivar (CLAUDE.md, regla 6): sale de la lista y queda en Archivados.
    await page.locator(`${SEL.finSobre('Prueba sobre')} .sobre-menu-btn`).click();
    await page.locator(`${SEL.finSobre('Prueba sobre')} .archive-env`).click();
    await page.locator(SEL.confirmOk).click();
    await page.locator(SEL.finSobre('Prueba sobre')).waitFor({ state: 'detached', timeout: 8000 });
    afirmar(await page.locator('.o-fin-archivado-nombre:text-is("Prueba sobre")').count() === 1, 'el sobre no quedó en Archivados');
  });

  await prueba('Finanzas · hoja de pago fijo: crear y borrar desde su detalle', async () => {
    await irA(page, 'finanzas');
    await page.locator(SEL.finTab('recurrentes')).click();
    await page.locator('#btn-add-recurring').click();
    await abierta('#recurring-modal');
    afirmar(await page.locator('#btn-submit-recurring').isDisabled(), 'Guardar habilitado sin datos');
    for (const v of ['9', '9', '0', '0']) await page.locator(`#recurring-modal .numpad-btn[data-val="${v}"]`).click();
    await page.locator('#recurring-label').fill('Prueba fijo');
    await page.locator('#recurring-day').selectOption('10');
    await page.locator('#recurring-envelope').selectOption({ label: 'Servicios' });
    await page.locator('#btn-submit-recurring').click();
    await esperarToast(page, /Gasto fijo configurado/);
    await cerrada('#recurring-modal');
    await page.waitForSelector(SEL.finRec('Prueba fijo'));
    const fila = (await page.locator(SEL.finRec('Prueba fijo')).textContent()).replace(/\s+/g, ' ');
    afirmar(/Día 10 · Servicios/.test(fila) && /\$9\.900/.test(fila), `fila del pago fijo: ${fila}`);
    await page.locator(SEL.finRec('Prueba fijo')).click();
    await page.locator(SEL.finRecEliminar).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Pago fijo eliminado/);
    await page.waitForSelector(SEL.finRecLd);
    afirmar(!(await page.$(SEL.finRec('Prueba fijo'))), 'el pago fijo sigue en la lista');
  });

  await prueba('Finanzas · las ocho hojas: Órbita, 44 px y contraste AA (color y sobrio)', async () => {
    const hojas = [
      ['#gasto-modal', () => page.locator('#btn-fab-gasto').click()],
      ['#ingreso-modal', async () => { await page.locator(SEL.finTab('resumen')).click(); await page.locator('#btn-fab-ingreso').click(); }],
      ['#ahorro-modal', async () => { await page.locator(SEL.finTab('resumen')).click(); await page.locator('#btn-fab-ahorro').click(); }],
      ['#transfer-modal', async () => { await page.locator(SEL.finTab('resumen')).click(); await page.locator('#btn-fab-transferir').click(); }],
      ['#recurring-modal', async () => { await page.locator(SEL.finTab('recurrentes')).click(); await page.locator('#btn-add-recurring').click(); }],
      ['#anual-modal', async () => { await page.locator(SEL.finTab('recurrentes')).click(); await page.locator('#btn-anual-nuevo').click(); }],
      ['#envelope-modal', async () => { await page.locator(SEL.finTab('sobres')).click(); await page.locator('.btn-add-envelope').click(); }],
      ['#goal-modal', async () => { await page.locator(SEL.finTab('sobres')).click(); await page.locator('#btn-add-goal').click(); }]
    ];
    try {
      for (const tema of ['color', 'gris']) {
        await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
        await irA(page, 'finanzas');
        for (const [id, abrir] of hojas) {
          await abrir();
          await abierta(id);
          await page.waitForTimeout(450);
          afirmar(await page.locator(`${id}.o-ui .o-hoja`).count() === 1, `${id} no es una hoja de Órbita`);
          const chicos = await page.$$eval(`${id} :is(button, input, select)`, (bs) => bs.filter((b) => {
            const r = b.getBoundingClientRect();
            return b.type !== 'hidden' && r.width > 0 && (r.width < 44 || r.height < 44);
          }).map((b) => `${b.getAttribute('aria-label') || b.textContent.trim() || b.id} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`));
          afirmar(chicos.length === 0, `${tema} ${id}: objetivos bajo 44 px: ${chicos.slice(0, 3).join(', ')}`);
          const fallas = await fallasContraste(page, `${id} *`);
          afirmar(fallas.length === 0, `${tema} ${id}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
          await page.screenshot({ path: path.join(SALIDA, `finanzas-hoja-${id.slice(1)}-${tema}-390.png`) });
          await page.goBack();
          await cerrada(id);
        }
      }
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
    }
  });

  await prueba('Finanzas · objetivos táctiles de 44 px y contraste AA en las cuatro pestañas y los detalles (color y sobrio)', async () => {
    const revisar = async (donde) => {
      const chicos = await page.$$eval('#fin-cuerpo :is(button, input, summary)', (bs) => bs.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && (r.width < 44 || r.height < 44);
      }).map((b) => `${b.getAttribute('aria-label') || b.textContent.trim()} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`));
      afirmar(chicos.length === 0, `${donde}: objetivos bajo 44 px: ${chicos.slice(0, 3).join(', ')}`);
      const fallas = await fallasContraste(page, '#fin-cuerpo *');
      afirmar(fallas.length === 0, `${donde}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
    };
    try {
      for (const tema of ['color', 'gris']) {
        await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.reload();
          await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
          await irA(page, 'finanzas');
          for (const tab of ['resumen', 'movimientos', 'sobres', 'recurrentes']) {
            await page.locator(SEL.finTab(tab)).click();
            await page.waitForSelector(`${SEL.finTab(tab)}[aria-selected="true"]`);
            await page.waitForTimeout(300);
            await revisar(`${tema} ${vp.nombre} ${tab}`);
            await page.screenshot({ path: path.join(SALIDA, `finanzas-${tab}-${tema}-${vp.nombre}.png`), fullPage: true });
          }
          const ancho = vp.width >= 1024;
          for (const [tab, fila, cerrar, volver] of [['movimientos', SEL.finMov('Metro'), SEL.finMovCerrar, SEL.finMovVolver], ['recurrentes', SEL.finRec('Internet'), SEL.finRecCerrar, SEL.finRecVolver]]) {
            await page.locator(SEL.finTab(tab)).click();
            await page.locator(fila).click();
            await page.waitForSelector(ancho ? cerrar : volver);
            await page.waitForTimeout(200);
            await revisar(`${tema} ${vp.nombre} detalle de ${tab}`);
            if (ancho) await page.locator(cerrar).click();
            else await page.goBack();
            await page.waitForSelector(fila);
          }
        }
      }
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
    }
  });

  // ---------- Botón atrás ----------
  await prueba('Atrás · cierra un modal sin salir de la vista', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.qaTarea).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.tareaModal);
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.tareaModal);
    afirmar((await page.evaluate(() => location.hash)) === '#dashboard', 'atrás cambió de vista');
  });

  await prueba('Atrás · cierra la hoja de Perfil', async () => {
    await page.locator(SEL.menuBtn).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.menuOverlay);
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.menuOverlay);
    afirmar((await page.evaluate(() => location.hash)) === '#dashboard', 'atrás cambió de vista');
  });

  await prueba('Perfil · abre Configuración y atrás vuelve a Hoy', async () => {
    await page.locator(SEL.menuBtn).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.menuOverlay);
    await page.locator(SEL.perfilItem('configuracion')).click();
    await page.waitForFunction(() => window.appRouter.currentView === 'configuracion');
    afirmar(!(await page.evaluate((s) => document.querySelector(s).classList.contains('open'), SEL.menuOverlay)), 'la hoja quedó abierta');
    await page.goBack();
    await page.waitForFunction(() => window.appRouter.currentView === 'dashboard');
  });

  await prueba('Dock · 5 posiciones, Hoy al centro', async () => {
    const vistas = await page.$$eval(SEL.dockItems, (els) => els.map((e) => e.dataset.view));
    afirmar(vistas.join(',') === 'habitos,tareas,dashboard,entrenamiento,finanzas', `orden: ${vistas}`);
    const dentro = await page.$$eval(SEL.dockItems, (els) => els.every((e) => {
      const r = e.getBoundingClientRect(); return r.width >= 44 && r.height >= 44;
    }));
    afirmar(dentro, 'algún ítem del dock mide menos de 44 px');
  });

  // ---------- Entreno (Órbita, Fase 9a) ----------
  await prueba('Entreno · cifras de Inicio idénticas a la foto de antes de la Fase 9', async () => {
    // Contexto propio (datos demo y reloj de foto-entreno.mjs), leído por la interfaz Órbita.
    const despues = await tomarFotoEntreno(browser, BASE, { leerUi: leerUiOrbitaEntreno, capturas: path.join(SALIDA, 'entreno-foto') });
    fs.writeFileSync(path.join(SALIDA, 'entreno-despues.json'), JSON.stringify(despues, null, 2) + '\n');
    afirmar(despues.errores.length === 0, `errores de consola: ${despues.errores[0]}`);
    const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_ENTRENO, 'utf8')), despues);
    afirmar(difs.length === 0, `${difs.length} diferencias: ${difs.slice(0, 3).join(' | ')}`);
  });

  await prueba('Entreno › Rutinas · lista, vistas previas y lo que guardan los formularios, idénticos a la foto de antes de la Fase 9b', async () => {
    // Contexto propio (datos demo, reloj y semilla de foto-rutinas.mjs), leído por la interfaz Órbita.
    const despues = await tomarFotoRutinas(browser, BASE, { ui: UI_ORBITA_RUTINAS });
    fs.writeFileSync(path.join(SALIDA, 'rutinas-despues.json'), JSON.stringify(despues, null, 2) + '\n');
    afirmar(despues.errores.length === 0, `errores de consola: ${despues.errores[0]}`);
    const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_RUTINAS, 'utf8')), despues);
    afirmar(difs.length === 0, `${difs.length} diferencias: ${difs.slice(0, 3).join(' | ')}`);
  });

  await prueba('Entreno › Historial, Progreso completo y Cuerpo · cifras y gráficos idénticos a la foto de antes de la Fase 9c (metas con coma decimal)', async () => {
    // Contexto propio (datos demo, medidas, metas y fotos de foto-progreso.mjs), leído por la interfaz Órbita.
    const despues = await tomarFotoProgreso(browser, BASE, { ui: UI_ORBITA_PROGRESO, capturas: path.join(SALIDA, 'progreso-foto') });
    fs.writeFileSync(path.join(SALIDA, 'progreso-despues.json'), JSON.stringify(despues, null, 2) + '\n');
    afirmar(despues.errores.length === 0, `errores de consola: ${despues.errores[0]}`);
    // Metas de Entreno con coma decimal (es-CL), solo en la presentación.
    const correr = despues.metas.metas.find((m) => m.nombre === 'Correr 50 km');
    afirmar(correr && correr.valor === '12,5 km / 50 km', `meta en km: «${correr && correr.valor}»`);
    const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_PROGRESO, 'utf8')), despues);
    afirmar(difs.length === 0, `${difs.length} diferencias: ${difs.slice(0, 3).join(' | ')}`);
  });

  await prueba('Entreno › sesión activa · cifras idénticas a la foto de antes de la Fase 9d y la sesión sobrevive a salir de Entreno, al botón atrás y a recargar', async () => {
    // Contexto propio (datos demo, una rutina de Calistenia y un descanso de
    // 120 s por ejercicio, de foto-sesion.mjs), con el reloj detenido.
    const despues = await tomarFotoSesion(browser, BASE, { ui: UI_ORBITA_SESION, capturas: path.join(SALIDA, 'sesion-foto') });
    fs.writeFileSync(path.join(SALIDA, 'sesion-despues.json'), JSON.stringify(despues, null, 2) + '\n');
    afirmar(despues.errores.length === 0, `errores de consola: ${despues.errores[0]}`);
    for (const [k, difs] of Object.entries(despues.sobrevive)) afirmar(difs.length === 0, `la sesión no quedó igual tras ${k}: ${difs.slice(0, 2).join(' | ')}`);
    afirmar(despues.borradorTrasGuardar.length === 0, 'el borrador siguió después de guardar');
    const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_SESION, 'utf8')), despues);
    afirmar(difs.length === 0, `${difs.length} diferencias: ${difs.slice(0, 3).join(' | ')}`);
  });

  const pestanaEnt = () => page.$eval('[data-ent-tab][aria-selected="true"]', (e) => e.dataset.entTab);
  const subVisible = () => page.$eval('#entrenamiento-sub-view', (e) => getComputedStyle(e).display !== 'none');

  await prueba('Entreno · pestañas Inicio, Rutinas y Progreso; volver de una sub-pantalla deja la pestaña de origen', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await irA(page, 'entrenamiento');
    await page.waitForSelector('[data-ent-tab]');
    afirmar(await page.locator('.o-vista.o-mod-entreno').count() === 1, 'la vista no es Órbita');
    afirmar(!(await page.evaluate(() => document.getElementById('view-root').classList.contains('mk3-entreno'))), '#view-root conserva .mk3-entreno');
    afirmar(await pestanaEnt() === 'inicio', 'no arranca en Inicio');
    // Una categoría de Inicio abre Rutinas en esa categoría.
    await page.locator('.btn-explorar[data-cat="hiit"]').click();
    await page.waitForSelector('[data-rut-cat="hiit"][aria-pressed="true"]');
    afirmar(await pestanaEnt() === 'rutinas', 'la categoría no abrió Rutinas');
    afirmar(/HIIT/.test(await page.locator('#ent-rutinas').textContent()), 'la lista no es la de HIIT');
    // Flechas entre pestañas.
    await page.locator('#ent-tab-rutinas').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForSelector('#ent-tab-progreso[aria-selected="true"]');
    // Historial: atrás del sistema vuelve a Progreso.
    await page.locator('#link-historial-sesiones').click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('entrenamiento-sub-view')).display !== 'none');
    await capturar(page, 'entreno-historial-390.png');
    await page.goBack();
    await page.waitForSelector('#ent-tab-progreso[aria-selected="true"]');
    afirmar(!(await subVisible()), 'atrás no cerró el historial');
    afirmar((await page.evaluate(() => location.hash)) === '#entrenamiento', 'atrás salió de Entreno');
    // Progreso completo: el botón Volver vuelve a Progreso.
    await page.locator('#link-ver-progreso-completo').click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('entrenamiento-sub-view')).display !== 'none');
    await page.locator('#btn-entrenamiento-volver').click();
    await page.waitForSelector('#ent-tab-progreso[aria-selected="true"]');
    afirmar(!(await subVisible()), 'Volver no cerró el progreso completo');
    await page.locator('#ent-tab-inicio').click();
    await page.waitForSelector('#ent-tab-inicio[aria-selected="true"]');
  });

  await prueba('Entreno › Rutinas · borrar una rutina repinta la lista en la misma pestaña', async () => {
    await irA(page, 'entrenamiento');
    await page.locator('#ent-tab-rutinas').click();
    await page.locator('[data-rut-cat="gym"]').click();
    await page.waitForSelector('[data-rut-cat="gym"][aria-pressed="true"]');
    const antes = await page.locator('#ent-rutinas .btn-eliminar-rutina').count();
    afirmar(antes > 0, 'no hay rutinas de GYM para borrar');
    const nombre = (await page.locator('#ent-rutinas .btn-eliminar-rutina').first().getAttribute('aria-label')).replace('Eliminar rutina ', '');
    await page.locator('#ent-rutinas .btn-eliminar-rutina').first().click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Rutina eliminada/);
    await page.waitForFunction((n) => document.querySelectorAll('#ent-rutinas .btn-eliminar-rutina').length === n, antes - 1, { timeout: 8000 });
    afirmar(!(await page.locator(`#ent-rutinas .btn-eliminar-rutina[aria-label="Eliminar rutina ${nombre}"]`).count()), `«${nombre}» sigue en la lista`);
    afirmar(await pestanaEnt() === 'rutinas' && !(await subVisible()), 'borrar sacó de la pestaña Rutinas');
  });

  await prueba('Entreno › Inicio · el buscador encuentra rutinas y ejercicios (sin tildes ni mayúsculas), abre la rutina o la ficha y no escribe datos', async () => {
    // Huella de toda la base (cantidad y tamaño por almacén): buscar y abrir solo lee.
    const huella = () => page.evaluate(() => new Promise((res, rej) => {
      const r = indexedDB.open('vanguard_os');
      r.onerror = () => rej(r.error);
      r.onsuccess = () => {
        const d = r.result;
        const almacenes = [...d.objectStoreNames];
        const tx = d.transaction(almacenes);
        const out = {};
        let faltan = almacenes.length;
        almacenes.forEach((s) => {
          const q = tx.objectStore(s).getAll();
          q.onsuccess = () => { out[s] = `${q.result.length}:${JSON.stringify(q.result).length}`; if (--faltan === 0) { d.close(); res(out); } };
        });
      };
    }));
    await page.setViewportSize({ width: 390, height: 844 });
    await irA(page, 'entrenamiento');
    await page.locator('#ent-tab-inicio').click();
    await page.waitForSelector('#ent-tab-inicio[aria-selected="true"]');
    const rutina = await page.evaluate(async () => {
      const { db } = await import('/js/core/db.js');
      const r = (await db.getRutinas()).find((x) => x.categoria === 'gym');
      return r ? { id: r.id, nombre: r.nombre, categoria: r.categoria } : null;
    });
    afirmar(rutina, 'no hay rutinas de GYM para buscar');
    const antes = await huella();
    const buscador = page.locator('#entreno-buscador');

    // Ejercicio sin tildes: «jalon al pecho» encuentra «Jalón al Pecho».
    await buscador.fill('jalon al pecho');
    await page.waitForSelector('#entreno-buscador-res:not([hidden]) [data-busq-ejercicio="Jalón al Pecho"]');

    // Rutina en mayúsculas; Enter abre el primer resultado: Rutinas, su categoría y la tarjeta resaltada.
    await buscador.fill(rutina.nombre.toUpperCase());
    await page.waitForSelector(`[data-busq-rutina="${rutina.id}"]`);
    await buscador.press('Enter');
    await page.waitForSelector(`#ent-tab-rutinas[aria-selected="true"]`);
    await page.waitForSelector(`[data-rut-cat="${rutina.categoria}"][aria-pressed="true"]`);
    await page.waitForSelector('.o-ent-rutina--resaltada');
    const resaltada = await page.evaluate(() => ({
      nombre: document.querySelector('.o-ent-rutina--resaltada [data-foto="rut-nombre"]')?.textContent.trim(),
      foco: document.activeElement?.closest('.o-ent-rutina--resaltada') ? document.activeElement.className : null
    }));
    afirmar(resaltada.nombre === rutina.nombre, `resaltó «${resaltada.nombre}» en vez de «${rutina.nombre}»`);
    afirmar(/btn-iniciar-sesion/.test(resaltada.foco || ''), 'el foco no quedó en «Iniciar sesión» de la rutina');

    // Ejercicio: abre su ficha; Volver deja Inicio.
    await page.locator('#ent-tab-inicio').click();
    await page.waitForSelector('#ent-tab-inicio[aria-selected="true"]');
    await buscador.fill('PRESS DE BANCA');
    await page.locator('[data-busq-ejercicio="Press de Banca"]').click();
    await page.waitForSelector('[data-foto="ficha-nombre"]');
    afirmar(await page.locator('[data-foto="ficha-nombre"]').textContent() === 'Press de Banca', 'la ficha no es la de Press de Banca');
    afirmar(await subVisible(), 'la ficha no se abrió como sub-pantalla');
    await capturar(page, 'entreno-ficha-ejercicio-390.png');
    // Desde la ficha, una rutina que lo usa abre Rutinas con esa rutina resaltada.
    const enRutina = page.locator('[data-ficha-rutina]').first();
    if (await enRutina.count()) {
      const id = await enRutina.getAttribute('data-ficha-rutina');
      await enRutina.click();
      await page.waitForSelector('#ent-tab-rutinas[aria-selected="true"]');
      await page.waitForSelector('.o-ent-rutina--resaltada');
      afirmar(await page.evaluate((x) => !!document.querySelector(`.o-ent-rutina--resaltada .btn-iniciar-sesion[data-id="${x}"]`), id), 'la ficha no abrió la rutina pedida');
      afirmar(!(await subVisible()), 'la ficha quedó abierta');
      await page.locator('#ent-tab-inicio').click();
      await page.waitForSelector('#ent-tab-inicio[aria-selected="true"]');
    } else {
      await page.locator('#btn-entrenamiento-volver').click();
      await page.waitForSelector('#ent-tab-inicio[aria-selected="true"]');
      afirmar(!(await subVisible()), 'Volver no cerró la ficha');
    }

    // Sin resultados y Escape.
    await buscador.fill('zzzz');
    await page.waitForSelector('#entreno-buscador-res:not([hidden]) .o-ent-busq-vacio');
    afirmar(/Sin resultados para «zzzz»/.test(await page.locator('#entreno-buscador-res').textContent()), 'falta el aviso de sin resultados');
    await buscador.press('Escape');
    await page.waitForSelector('#entreno-buscador-res', { state: 'hidden' });
    afirmar(await buscador.inputValue() === '', 'Escape no limpió el buscador');

    const despues = await huella();
    afirmar(JSON.stringify(antes) === JSON.stringify(despues), `la base cambió: ${Object.keys(antes).filter((k) => antes[k] !== despues[k]).join(', ')}`);
  });

  await prueba('Entreno · 44 px y contraste AA en las pestañas, la lista de rutinas, los formularios, las vistas previas, el historial, Progreso completo y Cuerpo (color y sobrio)', async () => {
    const chicosEn = (sel) => page.$$eval(`${sel} :is(button, input, select, summary)`, (bs) => bs.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && (r.width < 44 || r.height < 44);
    }).map((b) => `${b.getAttribute('aria-label') || b.textContent.trim() || b.id || b.className} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`));
    const revisar = async (sel, donde) => {
      await page.waitForTimeout(400);
      const chicos = await chicosEn(sel);
      afirmar(chicos.length === 0, `${donde}: objetivos bajo 44 px: ${chicos.slice(0, 3).join(', ')}`);
      const fallas = await fallasContraste(page, `${sel} *`);
      afirmar(fallas.length === 0, `${donde}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
    };
    const subAbierta = () => page.waitForFunction(() => getComputedStyle(document.getElementById('entrenamiento-sub-view')).display !== 'none');
    const aRutinas = async (cat) => {
      await page.locator('#ent-tab-rutinas').click();
      await page.waitForSelector('#ent-tab-rutinas[aria-selected="true"]');
      if (await page.locator(`[data-rut-cat="${cat}"][aria-pressed="false"]`).count()) {
        await page.locator(`[data-rut-cat="${cat}"]`).click();
        await page.waitForSelector(`[data-rut-cat="${cat}"][aria-pressed="true"]`);
      }
      await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
    };
    try {
      for (const tema of ['color', 'gris']) {
        await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
        for (const vp of [{ w: 390, h: 844 }, { w: 1440, h: 900 }]) {
          const donde = (x) => `${tema} ${vp.w} ${x}`;
          await page.setViewportSize({ width: vp.w, height: vp.h });
          await page.reload();
          await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
          await irA(page, 'entrenamiento');
          for (const tab of ['inicio', 'rutinas', 'progreso']) {
            await page.locator(`#ent-tab-${tab}`).click();
            await page.waitForSelector(`#ent-tab-${tab}[aria-selected="true"]`);
            await revisar('#entrenamiento-main-view', donde(tab));
            await page.screenshot({ path: path.join(SALIDA, `entreno-${tab}-${tema}-${vp.w}.png`), fullPage: true });
          }
          // Buscador con resultados y la ficha de un ejercicio (su progreso sigue
          // en MK III hasta la 9c y queda fuera del contraste).
          await page.locator('#ent-tab-inicio').click();
          await page.waitForSelector('#ent-tab-inicio[aria-selected="true"]');
          await page.locator('#entreno-buscador').fill('press');
          await page.waitForSelector('#entreno-buscador-res:not([hidden]) [data-busq-ejercicio]');
          await revisar('#entrenamiento-main-view', donde('buscador'));
          await page.locator('[data-busq-ejercicio="Press de Banca"]').click();
          await page.waitForSelector('[data-foto="ficha-nombre"]');
          await page.waitForTimeout(400);
          const chicosFicha = await chicosEn('#entrenamiento-sub-view');
          afirmar(chicosFicha.length === 0, `${donde('ficha')}: objetivos bajo 44 px: ${chicosFicha.slice(0, 3).join(', ')}`);
          const fallasFicha = await fallasContraste(page, '#entrenamiento-sub-view *');
          afirmar(fallasFicha.length === 0, `${donde('ficha')}: «${fallasFicha[0]?.texto}» ${fallasFicha[0]?.q}:1`);
          await page.screenshot({ path: path.join(SALIDA, `entreno-ficha-${tema}-${vp.w}.png`), fullPage: true });
          await page.locator('#btn-entrenamiento-volver').click();
          await page.waitForSelector('#ent-tab-inicio[aria-selected="true"]');
          // Rutinas (Fase 9b): cada categoría con sus plegables abiertos.
          for (const cat of ['gym', 'calistenia', 'hiit']) {
            await aRutinas(cat);
            const cerrados = page.locator('#ent-rutinas details:not([open]) > summary');
            while (await cerrados.count()) await cerrados.first().click();
            await revisar('#ent-rutinas', donde(`rutinas ${cat}`));
            await page.screenshot({ path: path.join(SALIDA, `entreno-rutinas-${cat}-${tema}-${vp.w}.png`), fullPage: true });
          }
          // Formulario de GYM, con el autocompletado abierto y una superserie.
          await aRutinas('gym');
          await page.locator('#btn-nueva-rutina').click();
          await subAbierta();
          await page.locator('#btn-add-ejercicio').click();
          await page.locator('.ejercicio-block').nth(1).locator('.btn-agrupar-sup').click();
          await page.locator('.ej-nombre').first().fill('press');
          await page.waitForSelector('.ej-nombre-ac:not([hidden]) .ac-item');
          await revisar('#entrenamiento-sub-view', donde('formulario GYM'));
          await page.screenshot({ path: path.join(SALIDA, `entreno-form-gym-${tema}-${vp.w}.png`), fullPage: true });
          await page.locator('#btn-entrenamiento-volver').click();
          // Formulario HIIT (modo EMOM y un ejercicio).
          await aRutinas('hiit');
          await page.locator('#btn-nueva-rutina').click();
          await subAbierta();
          await page.locator('[data-mode="emom"]').click();
          await page.locator('#btn-hiit-rf-add-ejercicio').click();
          await revisar('#entrenamiento-sub-view', donde('formulario HIIT'));
          await page.locator('#btn-entrenamiento-volver').click();
          // Vista previa de plantilla y rutina generada.
          await aRutinas('calistenia');
          await page.locator('#ent-rutinas .o-ent-plantillas > summary').click();
          await page.locator('.btn-preview-plantilla').first().click();
          await page.waitForSelector('#btn-usar-plantilla');
          await revisar('#entrenamiento-sub-view', donde('vista previa de plantilla'));
          await page.locator('#btn-entrenamiento-volver').click();
          await aRutinas('gym');
          await page.locator('#btn-generar-rutina').click();
          await page.locator('#btn-generar-plan').click();
          await page.waitForSelector('#btn-usar-generado');
          await revisar('#entrenamiento-sub-view', donde('rutina generada'));
          await page.screenshot({ path: path.join(SALIDA, `entreno-generada-${tema}-${vp.w}.png`), fullPage: true });
          await page.locator('#btn-entrenamiento-volver').click();
          await page.waitForSelector('#ent-tab-rutinas[aria-selected="true"]');
          // Fase 9c: Historial, cada pestaña de Progreso completo y Cuerpo.
          const aProgreso = async () => {
            await page.locator('#ent-tab-progreso').click();
            await page.waitForSelector('#ent-tab-progreso[aria-selected="true"]');
          };
          const volver = async () => {
            await page.locator('#btn-entrenamiento-volver').click();
            await page.waitForSelector('#entrenamiento-sub-view', { state: 'hidden' });
          };
          await aProgreso();
          if (await page.locator('#link-historial-sesiones').count()) {
            await page.locator('#link-historial-sesiones').click();
            await page.waitForSelector('#hist-lista [data-foto="hist-sesion"]');
            await revisar('#entrenamiento-sub-view', donde('historial'));
            await page.screenshot({ path: path.join(SALIDA, `entreno-historial-${tema}-${vp.w}.png`), fullPage: true });
            await volver();
            await aProgreso();
          }
          await page.locator('#link-ver-progreso-completo').click();
          await page.waitForSelector('#progreso-tab-content');
          for (const tab of ['estandares', 'arbol', 'tendencia', 'metas']) {
            await page.locator(`#prog-tab-${tab}`).click();
            await page.waitForSelector(`#prog-tab-${tab}[aria-selected="true"]`);
            await revisar('#entrenamiento-sub-view', donde(`progreso ${tab}`));
            await page.screenshot({ path: path.join(SALIDA, `entreno-progreso-${tab}-${tema}-${vp.w}.png`), fullPage: true });
          }
          if (tema === 'color' && vp.w === 390) {
            // Teclado de las pestañas de Progreso: flechas e Inicio/Fin, con el foco en la nueva.
            await page.locator('#prog-tab-metas').focus();
            await page.keyboard.press('ArrowRight');
            await page.waitForSelector('#prog-tab-estandares[aria-selected="true"]');
            afirmar(await page.evaluate(() => document.activeElement?.id) === 'prog-tab-estandares', 'la flecha no dejó el foco en la pestaña nueva');
            await page.keyboard.press('End');
            await page.waitForSelector('#prog-tab-metas[aria-selected="true"]');
            afirmar(await page.evaluate(() => document.activeElement?.id) === 'prog-tab-metas', 'Fin no dejó el foco en Metas');
          }
          await volver();
          await aProgreso();
          await page.locator('#btn-cuerpo-historial').click();
          await page.waitForSelector('#entrenamiento-sub-content [data-foto="cuerpo"]');
          await revisar('#entrenamiento-sub-view', donde('cuerpo'));
          await page.screenshot({ path: path.join(SALIDA, `entreno-cuerpo-${tema}-${vp.w}.png`), fullPage: true });
          await volver();
        }
      }
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
      await irA(page, 'dashboard'); // la prueba siguiente parte en Hoy
    }
  });

  await prueba('Entreno › sesión activa · 44 px y contraste AA en la sesión, el descanso, el progreso de un ejercicio y el resumen (color y sobrio, 390 y 1440)', async () => {
    const chicosEn = (sel) => page.$$eval(`${sel} :is(button, input, select, summary)`, (bs) => bs.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && (r.width < 44 || r.height < 44);
    }).map((b) => `${b.getAttribute('aria-label') || b.textContent.trim() || b.id || b.className} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`));
    const revisar = async (donde) => {
      await page.waitForTimeout(400);
      const chicos = await chicosEn('#entrenamiento-sub-view');
      afirmar(chicos.length === 0, `${donde}: objetivos bajo 44 px: ${chicos.slice(0, 3).join(', ')}`);
      const fallas = await fallasContraste(page, '#entrenamiento-sub-view *');
      afirmar(fallas.length === 0, `${donde}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
    };
    try {
      for (const tema of ['color', 'gris']) {
        await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
        for (const vp of [{ w: 390, h: 844 }, { w: 1440, h: 900 }]) {
          const donde = (x) => `${tema} ${vp.w} ${x}`;
          await page.setViewportSize({ width: vp.w, height: vp.h });
          await page.reload();
          await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
          await irA(page, 'entrenamiento');
          await page.locator('#ent-tab-rutinas').click();
          if (await page.locator('[data-rut-cat="gym"][aria-pressed="false"]').count()) await page.locator('[data-rut-cat="gym"]').click();
          await page.waitForSelector('#ent-rutinas .btn-iniciar-sesion');
          await page.locator('#ent-rutinas .btn-iniciar-sesion').first().click();
          await page.waitForSelector('#btn-finalizar-sesion');
          await revisar(donde('sesión'));
          await page.screenshot({ path: path.join(SALIDA, `entreno-sesion-${tema}-${vp.w}.png`) });
          // Una serie hecha: descanso en el HUD y la fila marcada.
          await page.locator('#btn-sesion-principal').click();
          await page.waitForSelector('#hud-descanso:not([hidden])');
          await revisar(donde('descanso'));
          await page.screenshot({ path: path.join(SALIDA, `entreno-sesion-descanso-${tema}-${vp.w}.png`) });
          await page.locator('#btn-descanso-saltar').click();
          // Progreso del ejercicio (menú ⋯ › Progreso).
          const bloque = page.locator('.ejercicio-sesion-block:not([hidden])');
          await bloque.locator('.btn-ej-menu').click();
          await bloque.locator('.btn-ver-progreso').click();
          await page.waitForSelector('.ejercicio-sesion-block:not([hidden]) .sesion-ej-progreso:not([hidden]) > *');
          await revisar(donde('progreso del ejercicio'));
          // Resumen y salir sin guardar (Descartar, con su confirmación).
          await page.locator('#btn-finalizar-sesion').click();
          await page.waitForSelector('#sesion-resumen:not([hidden]) #btn-resumen-guardar');
          await revisar(donde('resumen'));
          await page.screenshot({ path: path.join(SALIDA, `entreno-sesion-resumen-${tema}-${vp.w}.png`), fullPage: true });
          await page.locator('#btn-resumen-descartar').click();
          await page.locator('#confirm-ok').click();
          await page.waitForSelector('#entrenamiento-main-view [data-ent-tab]');
          await page.waitForFunction(() => getComputedStyle(document.getElementById('entrenamiento-sub-view')).display === 'none');
        }
      }
    } finally {
      await page.evaluate(() => localStorage.setItem('vg-tema', 'color'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
      await irA(page, 'dashboard'); // la prueba siguiente parte en Hoy
    }
  });

  await prueba('Entreno › HIIT y hojas · cifras idénticas a la foto de antes de la Fase 9e; desde la 9f el HIIT y el descanso activo se retoman al salir, con atrás y al recargar, y atrás en el resumen guarda la sesión una sola vez', async () => {
    // Contexto propio (datos demo, un circuito HIIT, un día de descanso
    // activo y tres fotos, de foto-hojas.mjs), con el reloj detenido.
    const despues = await tomarFotoHojas(browser, BASE, { ui: UI_ORBITA_HOJAS, capturas: path.join(SALIDA, 'hojas-foto') });
    fs.writeFileSync(path.join(SALIDA, 'hojas-despues.json'), JSON.stringify(despues, null, 2) + '\n');
    afirmar(despues.errores.length === 0, `errores de consola: ${despues.errores[0]}`);
    const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_HOJAS, 'utf8')), despues);
    // 9f, además de la foto: lo esencial, explícito.
    const { salida, fin } = despues;
    for (const k of ['volver', 'otraVista', 'atras']) {
      const e = salida[k];
      afirmar(/HIIT Tabata · ronda 1 de 8/.test(e.tarjeta || ''), `${k}: sin tarjeta de HIIT en curso (${e.tarjeta})`);
      afirmar(e.retomado?.activo?.fase === 'DESCANSO' && e.retomado.activo.tiempo === '00:05', `${k}: el HIIT no se retomó donde iba según la hora real`);
      afirmar(e.vozFuera.length === 0, `${k}: hubo voz con el HIIT fuera de la pantalla`);
    }
    for (const [k, d] of Object.entries(salida.descanso)) afirmar(/Descanso activo sin marcar/.test(d.tarjeta || '') && /Marcarcomohecho/.test(d.retomado), `descanso activo, ${k}: no se retomó`);
    afirmar(fin.recarga.guardada?.duracionMin === 4 && fin.recarga.guardada.completado === true, 'recarga: el HIIT terminado fuera no se guardó con su duración real');
    const a = fin.resumenAtras;
    afirmar(!a.hojaAbierta && a.guardada?.duracionMin === 1 && a.sesionesDespues === a.sesiones + 1, 'atrás en el resumen: la sesión no quedó guardada con su duración real');
    afirmar(a.eventosNuevos === 1 && a.eventoEsLaSesion && a.eventosTrasRecargar === 1 && a.sesionesTrasRecargar === a.sesionesDespues, `atrás en el resumen: ${a.eventosNuevos} eventos sesion_registrada (y ${a.eventosTrasRecargar} tras recargar), se esperaba 1`);
    afirmar(difs.length === 0, `${difs.length} diferencias: ${difs.slice(0, 3).join(' | ')}`);
  });

  await prueba('Entreno › HIIT y hojas · Órbita, 44 px y contraste AA en el temporizador, el descanso activo y cada hoja (color y sobrio, 390 y 1440)', async () => {
    const chicosEn = (sel) => page.$$eval(`${sel} :is(button, input, select, summary, label:has(> input[type=checkbox]))`, (bs) => bs.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && (r.width < 44 || r.height < 44) && !(b.matches('input[type=checkbox]') && b.closest('label'));
    }).map((b) => `${b.getAttribute('aria-label') || b.textContent.trim() || b.id || b.className} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`));
    const revisar = async (sel, donde) => {
      await page.waitForTimeout(450);
      const chicos = await chicosEn(sel);
      afirmar(chicos.length === 0, `${donde}: objetivos bajo 44 px: ${chicos.slice(0, 3).join(', ')}`);
      const fallas = await fallasContraste(page, `${sel} *`);
      afirmar(fallas.length === 0, `${donde}: «${fallas[0]?.texto}» ${fallas[0]?.q}:1`);
    };
    // Una hoja abierta es Órbita (.o-ui + .o-hoja), sin restos de MK III.
    // Configuración sigue en MK III (.mk3-dashboard en #view-root): ahí se
    // admite ese ámbito de la vista, pero no debe quitarle la sombra.
    const hojaOrbita = async (id, donde) => {
      await page.waitForSelector(`#${id}.open .o-hoja`);
      const mk3 = await page.$eval(`#${id}`, (h) => {
        const ambito = h.parentElement?.closest('[class*="mk3-"]');
        const sinSombra = getComputedStyle(h.querySelector('.o-hoja')).boxShadow === 'none';
        return (!!ambito && ambito.id !== 'view-root') || sinSombra || !!h.querySelector('.modal-content, [style*="--text-"], [style*="--accent-"], [style*="--cy"]');
      });
      afirmar(!mk3, `${donde}: la hoja ${id} conserva estilos MK III`);
      await revisar(`#${id}`, `${donde} ${id}`);
    };
    const cerrarConAtras = async (id) => {
      await page.goBack();
      await page.waitForFunction((i) => !document.getElementById(i)?.classList.contains('open'), id);
      await page.waitForTimeout(300);
    };
    const aRutinas = async (cat) => {
      if (await page.evaluate(() => window.appRouter.currentView) !== 'entrenamiento') await irA(page, 'entrenamiento');
      await page.locator('#ent-tab-rutinas').click();
      await page.waitForSelector('#ent-tab-rutinas[aria-selected="true"]');
      if (await page.locator(`[data-rut-cat="${cat}"][aria-pressed="false"]`).count()) await page.locator(`[data-rut-cat="${cat}"]`).click();
      await page.waitForSelector(`[data-rut-cat="${cat}"][aria-pressed="true"]`);
      await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
    };
    const enMain = () => page.waitForSelector('#entrenamiento-main-view [data-ent-tab]', { state: 'visible' });
    // Escenario: un día de descanso activo y dos fotos (se borran al final).
    // Sin sesión de GYM a medias que haya dejado una prueba anterior fallida
    // (si no, iniciar una rutina pregunta qué hacer con ella).
    await page.evaluate(() => localStorage.removeItem('vanguard.sesionEnCurso'));
    const extra = await page.evaluate(async () => {
      const { db } = await import('/js/core/db.js');
      const r = await db.crearRutina({ nombre: 'Día 7 · Movilidad', categoria: 'gym', ejercicios: [] });
      const png = () => new Promise((ok) => { const c = document.createElement('canvas'); c.width = 4; c.height = 6; c.getContext('2d').fillRect(0, 0, 4, 6); c.toBlob(ok, 'image/png'); });
      const fotos = [];
      for (const fecha of ['2026-10-25', '2026-11-22']) fotos.push((await db.agregarFoto({ blob: await png(), ancho: 4, alto: 6, fecha })).id);
      return { rutina: r.id || (await db.getRutinas()).find((x) => x.nombre === 'Día 7 · Movilidad').id, fotos };
    });
    try {
      for (const tema of ['color', 'gris']) {
        await page.evaluate((t) => localStorage.setItem('vg-tema', t), tema);
        for (const vp of [{ w: 390, h: 844 }, { w: 1440, h: 900 }]) {
          const donde = `${tema} ${vp.w}`;
          const foto = (n) => page.screenshot({ path: path.join(SALIDA, `entreno-${n}-${tema}-${vp.w}.png`) });
          await page.setViewportSize({ width: vp.w, height: vp.h });
          await page.reload();
          await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);

          // --- Temporizador de HIIT: ajustes, en curso, hoja de resumen y fin.
          await aRutinas('hiit');
          await page.locator('#ent-rutinas .btn-iniciar-sesion').first().click();
          await page.waitForSelector('#btn-hiit-start');
          afirmar(!(await page.$eval('#entrenamiento-sub-content', (c) => !!c.closest('.mk3-entreno') || c.classList.contains('mk3-entreno'))), `${donde}: el temporizador sigue en el ámbito MK III`);
          for (const m of ['free', 'emom', 'amrap', 'tabata']) {
            await page.locator(`.hiit-mode-btn[data-mode="${m}"]`).click();
            afirmar(await page.$eval(`.hiit-mode-btn[data-mode="${m}"]`, (b) => b.getAttribute('aria-pressed') === 'true'), `${donde}: el modo ${m} no quedó marcado`);
            await revisar('#entrenamiento-sub-view', `${donde} HIIT ajustes ${m}`);
          }
          await foto('hiit-ajustes');
          await page.locator('.hiit-mode-btn[data-mode="free"]').click();
          await page.locator('#btn-hiit-start').click();
          await page.waitForSelector('#hiit-active-view', { state: 'visible' });
          await revisar('#entrenamiento-sub-view', `${donde} HIIT en curso`);
          await foto('hiit-en-curso');
          await page.locator('#btn-hiit-stop').click();
          await hojaOrbita('session-summary-modal', `${donde} HIIT`);
          await page.locator('#session-summary-modal [data-rpe="7"]').click();
          afirmar(await page.$eval('#session-summary-modal [data-rpe="7"]', (b) => b.getAttribute('aria-pressed') === 'true'), `${donde}: el RPE elegido no quedó marcado`);
          await revisar('#session-summary-modal', `${donde} resumen con RPE`);
          await foto('hiit-resumen');
          await page.locator('#btn-skip-summary').click();
          await page.waitForSelector('#hiit-summary-view', { state: 'visible' });
          await revisar('#entrenamiento-sub-view', `${donde} HIIT fin`);
          await page.locator('#btn-hiit-close').click();
          await enMain();

          // --- Descanso activo.
          await aRutinas('gym');
          await page.locator(`#ent-rutinas .btn-iniciar-sesion[data-id="${extra.rutina}"]`).click();
          await page.waitForSelector('#btn-descanso-activo-hecho');
          await revisar('#entrenamiento-sub-view', `${donde} descanso activo`);
          await page.locator('#btn-entrenamiento-volver').click();
          await enMain();
          // 9f: queda en curso; la tarjeta de Inicio también se revisa y se descarta.
          await page.locator('#ent-tab-inicio').click();
          await page.waitForSelector('#entreno-sesion-en-curso');
          await revisar('#entreno-sesion-en-curso', `${donde} tarjeta de sesión en curso`);
          await page.locator('#btn-sesion-en-curso-descartar').click();
          await page.locator(SEL.confirmOk).click();
          await page.waitForSelector('#entreno-sesion-en-curso', { state: 'detached' });

          // --- Hojas de la sesión de GYM.
          await aRutinas('gym');
          await page.locator(`#ent-rutinas .btn-iniciar-sesion:not([data-id="${extra.rutina}"])`).first().click();
          await page.waitForSelector('#btn-finalizar-sesion');
          const conTecnica = await page.evaluate(() => [...document.querySelectorAll('.ejercicio-sesion-block')].findIndex((b) => b.querySelector('.btn-info-ejercicio')));
          if (conTecnica >= 0) {
            await page.locator(`#sesion-riel .sesion-tab[data-ej-idx="${conTecnica}"]`).click();
            const b = page.locator('.ejercicio-sesion-block:not([hidden])');
            await b.locator('.btn-ej-menu').click();
            await b.locator('.btn-info-ejercicio').click();
            await hojaOrbita('tecnica-ej-modal', donde);
            await foto('hoja-tecnica');
            await cerrarConAtras('tecnica-ej-modal'); // antes no tenía id: Atrás no la cerraba
          }
          let b = page.locator('.ejercicio-sesion-block:not([hidden])');
          await b.locator('.btn-ej-menu').click();
          await b.locator('.btn-descanso-ej').click();
          await hojaOrbita('descanso-ej-modal', donde);
          await foto('hoja-descanso');
          await cerrarConAtras('descanso-ej-modal');
          await page.locator('#btn-add-ejercicio-live').click();
          await hojaOrbita('buscador-ejercicios-modal', donde);
          await page.locator('#picker-search').fill('Remo raro');
          await revisar('#buscador-ejercicios-modal', `${donde} buscador sin resultados`);
          await cerrarConAtras('buscador-ejercicios-modal');
          await page.waitForSelector('#buscador-ejercicios-modal', { state: 'detached' });
          await page.locator('#btn-sesion-principal').click();
          if (await page.locator('#hud-descanso:not([hidden])').count()) await page.locator('#btn-descanso-saltar').click();
          await page.locator('#btn-sesion-salir').click();
          await hojaOrbita('sesion-salir-modal', donde);
          await foto('hoja-salir');
          await page.locator('#sesion-salir-modal [data-valor="descartar"]').click();
          await enMain();

          // --- Detalle y edición de una sesión.
          await page.locator('#ent-tab-progreso').click();
          await page.locator('#link-historial-sesiones').click();
          await page.waitForSelector('.hist-sesion');
          await page.locator('.hist-sesion').first().click();
          await hojaOrbita('sesion-detalle-modal', `${donde} detalle`);
          await foto('hoja-detalle');
          await page.locator('#btn-sesion-editar').click();
          await page.waitForSelector('#sesion-edicion-form');
          await page.waitForTimeout(300); // la hoja termina de acomodarse
          await page.locator('#ed-duracion').fill('');
          await page.waitForFunction(() => document.getElementById('ed-duracion')?.value === '');
          await page.locator('#sesion-edicion-form button[type="submit"]').click();
          await page.waitForSelector('#sesion-edicion-error:not([hidden]) svg');
          await revisar('#sesion-detalle-modal', `${donde} edición con error`);
          await foto('hoja-edicion');
          await page.locator('#sesion-detalle-modal [data-accion="cancelar"]').click();
          await page.locator(SEL.confirmOk).click();
          await page.waitForSelector('#sesion-detalle-modal.open #btn-sesion-editar');
          await page.locator('#btn-sesion-detalle-cerrar').click();
          await page.waitForFunction(() => !document.getElementById('sesion-detalle-modal')?.classList.contains('open'));
          await page.locator('#btn-entrenamiento-volver').click();
          await enMain();

          // --- Generador, medidas y fotos.
          await aRutinas('gym');
          await page.locator('#btn-generar-rutina').click();
          await hojaOrbita('generador-config-modal', donde);
          await foto('hoja-generador');
          await cerrarConAtras('generador-config-modal');
          await page.locator('#ent-tab-progreso').click();
          await page.locator('#btn-cuerpo-registrar').click();
          await hojaOrbita('medida-modal', donde);
          await foto('hoja-medida');
          await page.locator('#medida-cancelar').click();
          await page.waitForFunction(() => !document.getElementById('medida-modal')?.classList.contains('open'));
          await page.locator('#btn-cuerpo-historial').click();
          await page.waitForSelector('.o-ent-foto');
          await page.locator('.o-ent-foto').first().click();
          await hojaOrbita('foto-modal', donde);
          await cerrarConAtras('foto-modal');
          await page.locator('#btn-fotos-comparar').click();
          await hojaOrbita('foto-comparar-modal', donde);
          await foto('hoja-comparar');
          await page.locator('#foto-comparar-cerrar').click();
          await page.waitForFunction(() => !document.getElementById('foto-comparar-modal')?.classList.contains('open'));
          await page.locator('#btn-entrenamiento-volver').click();
          await enMain();

          // --- Perfil y nivel (desde Configuración, que pinta las mismas hojas).
          await irA(page, 'configuracion');
          await page.locator('#btn-cfg-perfil').click();
          await hojaOrbita('profile-modal', donde);
          await foto('hoja-perfil');
          await cerrarConAtras('profile-modal');
          await page.locator('#btn-cfg-nivel').click();
          await hojaOrbita('nivel-onboarding-modal', `${donde} nivel 1`);
          await page.locator('.nivel-onboarding-tiempo-btn').first().click();
          await revisar('#nivel-onboarding-modal', `${donde} nivel 2`);
          await page.locator('.nivel-onboarding-dias-btn').first().click();
          await revisar('#nivel-onboarding-modal', `${donde} nivel 3`);
          await foto('hoja-nivel');
          await cerrarConAtras('nivel-onboarding-modal');
        }
      }
    } finally {
      await page.evaluate(async (x) => {
        localStorage.setItem('vg-tema', 'color');
        const { db } = await import('/js/core/db.js');
        for (const id of x.fotos) await db.eliminarFoto(id);
        await db.eliminarRutina(x.rutina);
      }, extra).catch(() => {});
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
      await irA(page, 'dashboard'); // la prueba siguiente parte en Hoy
    }
  });

  await prueba('Orbe · estando en Hoy abre la captura rápida', async () => {
    // Hoy se pinta de forma asíncrona: esperar a que exista su hoja de captura.
    await page.waitForSelector(SEL.hoyCaptura, { state: 'attached' });
    await page.waitForSelector(SEL.hoyMision, { state: 'visible' }); // listeners de Hoy montados
    await page.locator(SEL.orbe).click();
    await page.waitForFunction((s) => document.activeElement?.matches(s), SEL.capturaInput);
    afirmar((await page.evaluate(() => location.hash)) === '#dashboard', 'el orbe cambió de vista');
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.hoyCaptura);
    afirmar((await page.evaluate(() => location.hash)) === '#dashboard', 'atrás cambió de vista');
  });

  await prueba('Redirecciones · #anotaciones, #mas y #planificador', async () => {
    await page.evaluate(() => { location.hash = 'anotaciones'; });
    await page.waitForFunction(() => location.hash === '#tareas/notas' && !!document.querySelector('#notas-host'));
    await irA(page, 'dashboard');
    await page.evaluate(() => { location.hash = 'planificador'; });
    await page.waitForFunction(() => location.hash === '#tareas/semana' && !!document.querySelector('#plan-host'));
    await irA(page, 'dashboard');
    await page.evaluate(() => { location.hash = 'mas'; });
    await page.waitForFunction((s) => location.hash === '#dashboard' && document.querySelector(s)?.classList.contains('open'), SEL.menuOverlay);
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.menuOverlay);
    await irA(page, 'dashboard');
  });

  await prueba('Plan › Notas · crear y borrar una categoría', async () => {
    await irA(page, 'tareas/notas');
    await page.locator('#cat-nueva').fill('Prueba QA');
    await page.locator('#cat-nueva').press('Enter');
    await page.waitForSelector('.cat-abrir:has-text("Prueba QA")');
    afirmar(!!(await page.$('.tareas-subtabs')), 'las pestañas de Plan desaparecieron al repintar Notas');
    await page.locator(`${SEL.notaCatFila('Prueba QA')} .cat-delete`).click();
    await page.locator(SEL.confirmOk).click();
    await page.waitForSelector('.cat-abrir:has-text("Prueba QA")', { state: 'detached' });
    await irA(page, 'dashboard');
  });

  await prueba('Atrás · vuelve de un módulo a Hoy', async () => {
    await page.locator(SEL.nav('finanzas')).click();
    await page.waitForFunction(() => window.appRouter.currentView === 'finanzas');
    await page.goBack();
    await page.waitForFunction(() => window.appRouter.currentView === 'dashboard');
  });

  // ---------- Capturas ----------
  for (const vp of VIEWPORTS) {
    await prueba(`Capturas ${vp.nombre} px`, async () => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const v of VISTAS) {
        await irA(page, v);
        await page.waitForTimeout(500);
        await capturar(page, `${v.replace('/', '-')}-${vp.nombre}.png`);
      }
      await irA(page, 'dashboard');
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });

  // ---------- Offline ----------
  await prueba('Offline · Hoy carga sin red desde el caché', async () => {
    const controla = await page.evaluate(() => !!navigator.serviceWorker.controller);
    if (!controla) await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector(SEL.vistaTitulo, { state: 'visible', timeout: 15000 });
    await capturar(page, 'offline-390.png');
    await context.setOffline(false);
  });

  // ---------- Componentes Órbita (muestra fuera de la app) ----------
  // El botón «Diálogo destructivo» de la muestra avisa «Cancelado» cuando
  // ConfirmDialog resuelve false: así se ve por la UI que la promesa no
  // quedó colgada.
  await prueba('Diálogo · atrás, Escape y tocar fuera cuentan como Cancelar', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + SEL.muestra);
    await page.waitForSelector(SEL.muestraMision);
    const cerrarCon = { atrás: () => page.goBack(), Escape: () => page.keyboard.press('Escape'), 'tocar fuera': () => page.mouse.click(8, 8) };
    for (const [como, cerrar] of Object.entries(cerrarCon)) {
      await page.evaluate((s) => { document.querySelector(s).innerHTML = ''; }, SEL.toast);
      await page.locator('#d-confirmar').click();
      await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.confirmModal);
      await page.waitForTimeout(300);
      await cerrar();
      await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.confirmModal, { timeout: 4000 });
      await page.waitForFunction(() => /Cancelado/.test(document.querySelector('#toast-container')?.textContent || ''), null, { timeout: 4000 })
        .catch(() => { throw new Error(`cerrar con ${como} no resolvió la promesa como Cancelar`); });
      afirmar(!/Sobre eliminado/.test(await page.locator(SEL.toast).textContent()), `cerrar con ${como} ejecutó la acción`);
    }
  });

  for (const modo of ['color', 'sobrio']) {
    await prueba(`Componentes · muestra en modo ${modo} (hoja, diálogo, avisos, mazo)`, async () => {
      const url = BASE + SEL.muestra + (modo === 'sobrio' ? '?modo=sobrio' : '');
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(url);
        await page.waitForSelector(SEL.muestraMision);
        await page.screenshot({ path: path.join(SALIDA, `componentes-${modo}-${vp.nombre}.png`), fullPage: true });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      // Hoja: abre, atrás la cierra.
      await page.locator('#d-hoja').click();
      await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.muestraHoja);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SALIDA, `componentes-${modo}-hoja-390.png`) });
      await page.goBack();
      await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.muestraHoja);
      // Diálogo destructivo: ícono visible, Cancelar lo cierra.
      await page.locator('#d-confirmar').click();
      await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.confirmModal);
      afirmar(await page.locator('#confirm-icon').isVisible(), 'el diálogo destructivo no muestra el ícono');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SALIDA, `componentes-${modo}-dialogo-390.png`) });
      await page.locator(SEL.confirmCancel).click();
      await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.confirmModal);
      // Avisos: los cuatro tipos con ícono.
      await page.evaluate((s) => { document.querySelector(s).innerHTML = ''; }, SEL.toast);
      await page.locator('#d-toasts').click();
      await page.waitForFunction(() => document.querySelectorAll('#toast-container .o-toast .o-toast-ico').length === 4);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SALIDA, `componentes-${modo}-avisos-390.png`) });
      // Mazo: Hecho saca la misión; Después la manda al final.
      await page.locator(`${SEL.muestraMision} [data-mision-accion="hecho"]`).click();
      await page.waitForFunction((s) => /Hecho: Inglés/.test(document.querySelector(s).textContent), SEL.muestraRegistro);
      await page.locator(`${SEL.muestraMision} [data-mision-accion="despues"]`).click();
      await page.waitForFunction((s) => /Después: Entregar informe/.test(document.querySelector(s).textContent), SEL.muestraRegistro);
      afirmar(/Empuje A/.test(await page.locator(SEL.muestraMision).textContent()), 'la siguiente misión no quedó arriba');
      // Deslizar a la izquierda también la pasa.
      await page.locator(SEL.muestraMision).scrollIntoViewIfNeeded();
      const caja = await page.locator(`${SEL.muestraMision} .o-mision-titulo`).boundingBox();
      await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await page.mouse.down();
      await page.mouse.move(caja.x - 180, caja.y + caja.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForFunction((s) => /Después: Empuje A/.test(document.querySelector(s).textContent), SEL.muestraRegistro);
    });
  }

  await browser.close();
  srv.close();

  // ---------- Informe ----------
  const fallas = resultados.filter(r => !r.ok);
  const lineas = [
    `# Verificación «${ETIQUETA}»`,
    '',
    `Fecha simulada: ${AHORA.toISOString()} (America/Santiago) · Chromium (Playwright) · Supabase bloqueado`,
    '',
    '| Prueba | Resultado |',
    '|---|---|',
    ...resultados.map(r => `| ${r.nombre} | ${r.ok ? 'OK' : 'FALLA: ' + r.error.replace(/\|/g, '/')} |`),
    '',
    `Errores de consola: ${erroresConsola.length === 0 ? 'ninguno' : ''}`,
    ...erroresConsola.map(e => `- ${e}`)
  ];
  fs.writeFileSync(path.join(SALIDA, 'informe.md'), lineas.join('\n'));
  console.log(`\n${resultados.length - fallas.length}/${resultados.length} pruebas OK · errores de consola: ${erroresConsola.length}`);
  erroresConsola.forEach(e => console.log('  ' + e));
  process.exit(fallas.length || erroresConsola.length ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
