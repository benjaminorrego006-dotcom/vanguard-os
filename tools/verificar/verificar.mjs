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
const VISTAS = ['dashboard', 'tareas', 'habitos', 'entrenamiento', 'finanzas'];

// --- Selectores de la interfaz actual (actualizar en cada fase) ---
const SEL = {
  vistaTitulo: '#view-root h1',
  saltarOnboarding: 'button:has-text("Saltar")',
  nav: (vista) => `a.nav-item[data-view="${vista}"]`,
  menuBtn: '#btn-menu',
  menuOverlay: '#menu-overlay',
  demoBtn: '#btn-cfg-demo',
  confirmOk: '#confirm-ok',
  toast: '#toast-container',
  // Hoy
  hoyAgenda: '#hoy-agenda',
  hoyResumenes: '#hoy-resumenes',
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
  await page.waitForFunction((v) => window.appRouter && window.appRouter.currentView === v, vista);
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
  await prueba('Acción 1 · revisar el día (Hoy con agenda y resúmenes)', async () => {
    await irA(page, 'dashboard');
    await page.waitForSelector(SEL.hoyAgenda, { state: 'visible' });
    await page.waitForSelector(SEL.hoyResumenes, { state: 'visible' });
  });

  await prueba('Acción 2 · marcar un hábito desde Hoy', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.checkHabitoHoy(HABITO_PENDIENTE)).click();
    await page.waitForSelector(SEL.checkHabitoHoy(HABITO_PENDIENTE), { state: 'detached', timeout: 8000 });
    await irA(page, 'habitos');
    await page.waitForSelector(SEL.habitoMarcado(HABITO_PENDIENTE), { timeout: 8000 });
  });

  await prueba('Acción 3 · registrar un gasto (captura rápida "4500 almuerzo")', async () => {
    await irA(page, 'dashboard');
    await page.locator(SEL.capturaInput).fill('4500 almuerzo');
    await page.locator(SEL.capturaInput).press('Enter');
    const opcion = page.locator(SEL.capturaOpcionSobre).first();
    if (await opcion.isVisible({ timeout: 1500 }).catch(() => false)) await opcion.click();
    await esperarToast(page, /Gasto de \$4\.500 registrado/);
    await irA(page, 'finanzas');
    await page.locator(SEL.finTab('movimientos')).click();
    await page.waitForFunction((s) => /almuerzo/i.test(document.querySelector(s)?.textContent || ''), SEL.movimientos, { timeout: 8000 });
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

  await prueba('Atrás · cierra el menú', async () => {
    await page.locator(SEL.menuBtn).click();
    await page.waitForFunction((s) => document.querySelector(s)?.classList.contains('open'), SEL.menuOverlay);
    await page.goBack();
    await page.waitForFunction((s) => !document.querySelector(s)?.classList.contains('open'), SEL.menuOverlay);
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
        await capturar(page, `${v}-${vp.nombre}.png`);
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
