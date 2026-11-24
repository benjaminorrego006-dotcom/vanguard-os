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
  gastoChip: '#gasto-chip-container .chip',
  gastoLabel: '#gasto-label',
  gastoGuardar: '#btn-submit-gasto',
  finTab: (tab) => `.fin-tab[data-tab="${tab}"]`,
  movimientos: '#history-list-content',
  fechaDesde: '#history-date-from',
  limpiarFechas: '#btn-clear-date-filter',
  finTitulo: '#view-root h1',
  mapaCalor: '#finanzas-heatmap',
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
    resultados.push({ nombre, ok: false, ms: Date.now() - t0, error: String(err.message || err).split('\n')[0] });
    console.log(`  FALLA ${nombre}: ${String(err.message || err).split('\n')[0]}`);
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
    return els.filter((el) => el.textContent.trim() && el.getBoundingClientRect().width > 0).map((el) => {
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
    afirmar(await page.locator(SEL.finTab('movimientos')).evaluate((e) => e.classList.contains('active')), 'Movimientos no quedó activa');
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
      return { alto: r.height, fondo: c.backgroundColor, borde: c.borderTopStyle, letra: parseFloat(c.fontSize) };
    }));
    afirmar(teclas.length === 12, `teclas: ${teclas.length}`);
    for (const t of teclas) {
      afirmar(t.alto >= 44, `tecla de ${t.alto} px de alto`);
      afirmar(t.fondo === 'rgba(0, 0, 0, 0)' && t.borde === 'none', `tecla con aspecto nativo (${t.fondo}, borde ${t.borde})`);
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
          await page.locator(SEL.habFila(HABITO_PENDIENTE)).click();
          await page.waitForSelector(SEL.habVolver);
          await page.waitForTimeout(300);
          await revisar(`${tema} ${vp.nombre} detalle`);
          await page.screenshot({ path: path.join(SALIDA, `habitos-detalle-${tema}-${vp.nombre}.png`), fullPage: true });
          await page.goBack();
          await page.waitForSelector(SEL.habPanel);
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
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.tareaModal);
    await page.locator(SEL.tareaTitulo).fill('Prueba verificación editada');
    await page.locator(SEL.tareaGuardar).click();
    await esperarToast(page, /Tarea guardada/);
    await page.waitForSelector(SEL.tareaCard('Prueba verificación editada'));
  });

  await prueba('CRUD · borrar la tarea (con confirmación)', async () => {
    await page.locator(SEL.tareaCard('Prueba verificación editada')).first().click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.tareaModal);
    await page.locator(SEL.tareaEliminar).click();
    await page.locator(SEL.confirmOk).click();
    await esperarToast(page, /Tarea eliminada/);
    await page.waitForSelector(SEL.toastOk, { timeout: 2000 });
    await page.waitForSelector(SEL.tareaCard('Prueba verificación editada'), { state: 'detached' });
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

  await prueba('Orbe · estando en Hoy abre la captura rápida', async () => {
    // Hoy se pinta de forma asíncrona: esperar a que exista su hoja de captura.
    await page.waitForSelector(SEL.hoyCaptura, { state: 'attached' });
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
    await page.locator('.cat-abrir:has-text("Prueba QA") .cat-delete').click();
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
