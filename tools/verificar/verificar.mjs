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
  // Hábitos
  habitoMarcado: (nombre) => `button[aria-label="Editar ${nombre} hoy"][aria-pressed="true"]`,
  // Finanzas
  gastoModal: '#gasto-modal',
  finTab: (tab) => `.fin-tab[data-tab="${tab}"]`,
  movimientos: '#history-list-content',
  fechaDesde: '#history-date-from',
  limpiarFechas: '#btn-clear-date-filter',
  finTitulo: '#view-root h1',
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

  await prueba('Acción 3b · botón Gasto abre el formulario', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.qaGasto).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.gastoModal, { timeout: 8000 });
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.gastoModal);
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
