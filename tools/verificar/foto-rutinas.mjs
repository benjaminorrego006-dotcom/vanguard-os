// tools/verificar/foto-rutinas.mjs
// Foto de la pestaña Rutinas de Entreno (Fase 9b del rediseño): la lista de
// cada categoría (rutinas, plantillas, balance, descarga, constancia HIIT,
// fatiga del mapa muscular), la vista previa de una plantilla, la rutina
// generada, y lo que guardan en la base el formulario de rutina, el de
// HIIT, «Usar esta rutina» de una plantilla y el de la rutina generada.
// Sirve para comparar antes y después de cambiar la interfaz.
//
// Uso (desde la raíz del repo, con Node portable en el PATH):
//   node tools/verificar/foto-rutinas.mjs antes     → rutinas-antes.json
//   node tools/verificar/foto-rutinas.mjs despues   → salida/rutinas-despues/foto.json
// verificar.mjs llama a tomarFotoRutinas() y compara contra rutinas-antes.json.
//
// Escenario: datos de demostración y el mismo reloj simulado que las otras
// fotos. Contexto limpio, zona America/Santiago y Supabase bloqueado.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { AHORA_FOTO, prepararEscenario, ir, servir, compararFotos } from './foto-finanzas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
export const ARCHIVO_ANTES_RUTINAS = path.join(AQUI, 'rutinas-antes.json');
const CATS = ['gym', 'calistenia', 'hiit'];

// --- Lectores de cada interfaz -------------------------------------------
// Cada uno lee la lista que está a la vista, la vista previa de plantilla y
// la rutina generada; el recorrido (clics en botones con id) es común.

const T = `const t = (el) => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : null);`;

// Fatiga del mapa muscular: --intensidad de cada músculo (con 3 decimales).
const leerFatiga = () => {
  const r = {};
  document.querySelectorAll('.mk3-muscle-map__musculo').forEach((p) => {
    const v = parseFloat(p.style.getPropertyValue('--intensidad') || '0');
    if (v > 0) r[p.dataset.muscleId] = Math.round(v * 1000) / 1000;
  });
  return r;
};

export const UI_MK3 = {
  nombre: 'mk3',
  lista: new Function(`${T}
    const raiz = document.getElementById('ent-rutinas');
    const cards = [...raiz.querySelectorAll('.btn-eliminar-rutina')].map((b) => b.closest('.card'));
    const balance = [...raiz.querySelectorAll('.card')].find((c) => /Balance semanal/.test(c.textContent));
    const heat = [...raiz.querySelectorAll('.card')].find((c) => /Constancia HIIT/.test(c.textContent));
    return {
      titulo: t(raiz.querySelector('h2')),
      rutinas: cards.map((c) => ({
        nombre: t(c.querySelector('h3')),
        detalle: t(c.querySelector('p')),
        lineas: [...c.querySelectorAll('.exline, .sup-bracket > div > div')].map(t),
        superseries: c.querySelectorAll('.sup-bracket').length
      })),
      plantillas: [...raiz.querySelectorAll('.btn-preview-plantilla')].map((p) => ({ nombre: t(p.querySelector('h4')), nivel: t(p.querySelector('span')), resumen: t(p.querySelector('p')) })),
      balance: balance ? { valores: [...balance.querySelectorAll('div > div:last-child')].filter((d) => /^\\d+$/.test(t(d))).map(t), aviso: /quedando atrás/.test(balance.textContent) ? t(balance.querySelector('svg')?.parentElement) : null } : null,
      descarga: /Considera una semana de descarga/.test(raiz.textContent),
      constancia: heat ? [...heat.querySelectorAll('span')].map((s) => ({ dia: t(s), hecho: /accent-teal/.test(s.previousElementSibling.getAttribute('style')) })) : null,
      mapa: !!raiz.querySelector('.rutinas-mapa'),
      enlace: t(raiz.querySelector('#link-ver-progreso-categoria'))
    };`),
  plantilla: new Function(`${T}
    const c = document.getElementById('btn-usar-plantilla').closest('.card');
    return {
      titulo: t(c.querySelector('h2')),
      descripcion: t(c.querySelector('h2 + p')),
      rutinas: [...c.querySelectorAll('h4')].map((h) => ({
        nombre: t(h),
        grupos: [...h.parentElement.querySelectorAll('div[style*="width: 3px"] + span')].map(t),
        ejercicios: [...h.parentElement.querySelectorAll('li, ol + div > div, div[style*="gap: 8px"] > div')].map(t)
      }))
    };`),
  generada: new Function(`${T}
    const c = document.getElementById('btn-usar-generado').closest('.card');
    return {
      avisos: t(document.getElementById('generador-avisos')?.querySelector('span')),
      volumen: [...(document.getElementById('generador-volumen')?.children || [])].map(t),
      dias: [...c.querySelectorAll('h4')].map((h) => {
        const caja = h.closest('div[style*="padding: 16px"]') || h.parentElement;
        return { nombre: t(h), indicador: t(h.nextElementSibling), items: [...caja.querySelectorAll('div[style*="margin-bottom: 10px"]')].map(t), descanso: !!h.closest('.descanso-activo-card') };
      })
    };`),
  abrirPlantillas: async (page) => {
    await page.locator('#ent-rutinas details:not(.rutinas-mapa) > summary').click();
  }
};

// Interfaz Órbita (Fase 9b): cada dato lleva data-foto. La viñeta «•» que
// MK III escribía como texto en las listas con series ahora es CSS: se
// repone en la lectura (data-bala) para comparar el mismo texto.
export const UI_ORBITA = {
  nombre: 'orbita',
  lista: new Function(`${T}
    const raiz = document.getElementById('ent-rutinas');
    const f = (k, r = raiz) => r.querySelector('[data-foto="' + k + '"]');
    const ff = (k, r = raiz) => [...r.querySelectorAll('[data-foto="' + k + '"]')];
    const balance = f('balance');
    const dias = ff('dia');
    return {
      titulo: t(f('rut-titulo')),
      rutinas: ff('rutina').map((c) => ({
        nombre: t(f('rut-nombre', c)),
        detalle: t(f('rut-detalle', c)),
        lineas: ff('rut-linea', c).map(t),
        superseries: ff('rut-sup', c).length
      })),
      plantillas: ff('plantilla').map((p) => ({ nombre: t(f('plant-nombre', p)), nivel: t(f('plant-nivel', p)), resumen: t(f('plant-resumen', p)) })),
      balance: balance ? { valores: ff('bal-valor', balance).map(t), aviso: t(f('bal-aviso', balance)) } : null,
      descarga: !!f('descarga'),
      constancia: dias.length ? dias.map((d) => ({ dia: t(d.querySelector('.o-ent-dia-nombre')), hecho: d.dataset.hecho === 'true' })) : null,
      mapa: !!raiz.querySelector('.rutinas-mapa'),
      enlace: t(raiz.querySelector('#link-ver-progreso-categoria'))
    };`),
  plantilla: new Function(`${T}
    const c = document.getElementById('btn-usar-plantilla').closest('.o-ent-preview');
    const f = (k, r = c) => r.querySelector('[data-foto="' + k + '"]');
    const ff = (k, r = c) => [...r.querySelectorAll('[data-foto="' + k + '"]')];
    const bala = (el) => (el.hasAttribute('data-bala') ? '• ' : '') + t(el);
    return {
      titulo: t(f('prev-titulo')),
      descripcion: t(f('prev-desc')),
      rutinas: ff('prev-rut').map((r) => ({ nombre: t(f('prev-nombre', r)), grupos: ff('prev-grupo', r).map(t), ejercicios: ff('prev-ej', r).map(bala) }))
    };`),
  generada: new Function(`${T}
    const c = document.getElementById('btn-usar-generado').closest('.o-ent-preview');
    const bala = (el) => (el.hasAttribute('data-bala') ? '• ' : '') + t(el);
    return {
      avisos: t(c.querySelector('[data-foto="gen-aviso"]')),
      volumen: [...(document.getElementById('generador-volumen')?.children || [])].map(t),
      dias: [...c.querySelectorAll('[data-foto="gen-dia"]')].map((d) => ({
        nombre: t(d.querySelector('[data-foto="gen-nombre"]')),
        indicador: t(d.querySelector('[data-foto="gen-cupo"], .o-ent-descanso-dia')),
        items: [...d.querySelectorAll('[data-foto="gen-ej"]')].map(bala),
        descanso: d.classList.contains('descanso-activo-card')
      }))
    };`),
  abrirPlantillas: async (page) => {
    await page.locator('#ent-rutinas .o-ent-plantillas > summary').click();
  }
};

// --- Recorrido común ---------------------------------------------------------
async function irARutinas(page, cat) {
  // Por la interfaz, sin cambiar el hash: salir de una sub-pantalla con
  // Volver y elegir pestaña y categoría con sus botones. (Cambiar el hash
  // mientras sigue pendiente el history.back() con que Entreno suelta la
  // entrada de una sub-pantalla cruzaba las dos navegaciones.)
  if (await page.evaluate(() => window.appRouter.currentView) !== 'entrenamiento') await ir(page, 'entrenamiento');
  // El router marca la vista antes de terminar de pintarla.
  await page.waitForSelector('#entrenamiento-sub-view', { state: 'attached' });
  const subAbierta = () => page.evaluate(() => getComputedStyle(document.getElementById('entrenamiento-sub-view')).display !== 'none');
  if (await subAbierta()) {
    await page.locator('#btn-entrenamiento-volver').click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('entrenamiento-sub-view')).display === 'none');
  }
  await page.waitForSelector('#entrenamiento-main-view [data-ent-tab="rutinas"]');
  if (await page.locator('[data-ent-tab="rutinas"][aria-selected="false"]').count()) {
    await page.locator('[data-ent-tab="rutinas"]').click();
  }
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  if (await page.locator(`[data-rut-cat="${cat}"][aria-pressed="false"]`).count()) {
    await page.locator(`[data-rut-cat="${cat}"]`).click();
    await page.waitForSelector(`[data-rut-cat="${cat}"][aria-pressed="true"]`);
    await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  }
  // El mapa muscular se pinta después de leer los eventos.
  if (cat !== 'hiit') await page.waitForFunction(() => document.querySelectorAll('.mk3-muscle-map__musculo').length > 0);
  await page.waitForTimeout(300);
}

// La rutina generada elige al azar entre ejercicios equivalentes. La
// semilla se reinicia justo antes de «Generar»: así lo que sale no depende
// de cuántos sorteos hizo la app antes (cambia con el recorrido de la prueba).
async function generarConSemilla(page) {
  await page.evaluate(() => window.__semillaFoto(20261124));
  await page.locator('#btn-generar-plan').click();
}

// Lo que quedó guardado de una rutina (sin ids ni fechas): los grupos de
// superserie se numeran por orden de aparición.
async function rutinaGuardada(page, nombres) {
  return page.evaluate(async (ns) => {
    const { db } = await import('/js/core/db.js');
    const todas = await db.getRutinas();
    return ns.map((n) => {
      const r = todas.find((x) => x.nombre === n);
      if (!r) return { nombre: n, falta: true };
      const grupos = [];
      return {
        nombre: r.nombre,
        categoria: r.categoria,
        hiitSettings: r.hiitSettings || null,
        ejercicios: (r.ejercicios || []).map((e) => {
          let g = null;
          if (e.grupoId) { if (!grupos.includes(e.grupoId)) grupos.push(e.grupoId); g = grupos.indexOf(e.grupoId) + 1; }
          return { nombre: e.nombre, series: e.series, grupo: g };
        })
      };
    });
  }, nombres);
}

// Rutinas creadas desde `antes` (lista de ids), en el orden en que se guardaron.
async function rutinasNuevas(page, antes) {
  return page.evaluate(async (ids) => {
    const { db } = await import('/js/core/db.js');
    return (await db.getRutinas()).filter((r) => !ids.includes(r.id)).map((r) => {
      const grupos = [];
      return {
        nombre: r.nombre,
        categoria: r.categoria,
        hiitSettings: r.hiitSettings || null,
        ejercicios: (r.ejercicios || []).map((e) => {
          let g = null;
          if (e.grupoId) { if (!grupos.includes(e.grupoId)) grupos.push(e.grupoId); g = grupos.indexOf(e.grupoId) + 1; }
          return { nombre: e.nombre, series: e.series, grupo: g };
        })
      };
    });
  }, antes);
}
const nombresRutinas = (page) => page.evaluate(async () => { const { db } = await import('/js/core/db.js'); return (await db.getRutinas()).map((r) => r.id); });

export async function recorrerRutinas(page, ui) {
  const foto = { listas: {}, plantillas: {}, generada: null, guardado: {} };

  for (const cat of CATS) {
    await irARutinas(page, cat);
    foto.listas[cat] = await page.evaluate(ui.lista);
    if (cat !== 'hiit') foto.listas[cat].fatiga = await page.evaluate(leerFatiga);
  }

  // Vista previa de la primera plantilla de cada categoría.
  for (const cat of CATS) {
    await irARutinas(page, cat);
    await ui.abrirPlantillas(page);
    await page.locator('.btn-preview-plantilla').first().click();
    await page.waitForSelector('#btn-usar-plantilla');
    foto.plantillas[cat] = await page.evaluate(ui.plantilla);
  }

  // «Usar esta rutina» de la primera plantilla de GYM.
  let antes = await nombresRutinas(page);
  await irARutinas(page, 'gym');
  await ui.abrirPlantillas(page);
  await page.locator('.btn-preview-plantilla').first().click();
  await page.locator('#btn-usar-plantilla').click();
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  foto.guardado.plantillaGym = await rutinasNuevas(page, antes);

  // Rutina generada (GYM, con lo que trae el formulario por defecto).
  await irARutinas(page, 'gym');
  await page.locator('#btn-generar-rutina').click();
  await generarConSemilla(page);
  await page.waitForSelector('#btn-usar-generado');
  foto.generada = await page.evaluate(ui.generada);
  antes = await nombresRutinas(page);
  await page.locator('#btn-usar-generado').click();
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  foto.guardado.generadaGym = await rutinasNuevas(page, antes);

  // Formulario de GYM: tres ejercicios, dos series en el primero, el
  // segundo y el tercero en superserie con el anterior.
  await irARutinas(page, 'gym');
  await page.locator('#btn-nueva-rutina').click();
  await page.waitForSelector('#rutina-nombre');
  await page.fill('#rutina-nombre', 'Foto fuerza');
  const bloque = (i) => page.locator('.ejercicio-block').nth(i);
  await bloque(0).locator('.ej-nombre').fill('Press de Banca');
  await bloque(0).locator('.ej-nombre').press('Escape');
  await bloque(0).locator('.serie-reps').fill('8');
  await bloque(0).locator('.serie-peso').fill('60');
  await bloque(0).locator('.btn-add-serie').click();
  await bloque(0).locator('.serie-tipo').nth(1).selectOption('fallo');
  await bloque(0).locator('.serie-reps').nth(1).fill('6');
  await bloque(0).locator('.serie-peso').nth(1).fill('70');
  await page.locator('#btn-add-ejercicio').click();
  await bloque(1).locator('.ej-nombre').fill('Remo libre');
  await bloque(1).locator('.ej-nombre').press('Escape');
  await bloque(1).locator('.serie-reps').fill('10');
  await bloque(1).locator('.serie-peso').fill('50');
  await bloque(1).locator('.btn-agrupar-sup').click();
  await page.locator('#btn-add-ejercicio').click();
  await bloque(2).locator('.ej-nombre').fill('Curl libre');
  await bloque(2).locator('.ej-nombre').press('Escape');
  await bloque(2).locator('.serie-tipo').selectOption('dropset');
  await bloque(2).locator('.serie-reps').fill('12');
  await bloque(2).locator('.btn-agrupar-sup').click();
  await page.locator('#btn-guardar-rutina').click();
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  foto.guardado.formGym = await rutinaGuardada(page, ['Foto fuerza']);
  foto.listaGymDespues = (await page.evaluate(ui.lista)).rutinas.find((r) => r.nombre === 'Foto fuerza') || null;

  // Formulario HIIT: uno libre (con cambio de modo de ida y vuelta) y un EMOM.
  await irARutinas(page, 'hiit');
  await page.locator('#btn-nueva-rutina').click();
  await page.waitForSelector('#hiit-rf-nombre');
  await page.fill('#hiit-rf-nombre', 'Foto libre');
  await page.fill('#hiit-rf-s-work', '40');
  await page.fill('#hiit-rf-s-rest', '20');
  await page.fill('#hiit-rf-s-rounds', '6');
  await page.locator('[data-mode="tabata"]').click();
  await page.locator('[data-mode="free"]').click();
  await page.locator('#btn-hiit-rf-add-ejercicio').click();
  await page.locator('.hiit-rf-ej-nombre').first().fill('Burpees');
  await page.locator('#btn-guardar-hiit-rutina').click();
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');

  await irARutinas(page, 'hiit');
  await page.locator('#btn-nueva-rutina').click();
  await page.waitForSelector('#hiit-rf-nombre');
  await page.fill('#hiit-rf-nombre', 'Foto emom');
  await page.locator('[data-mode="emom"]').click();
  await page.fill('#hiit-rf-s-emom-mins', '12');
  await page.fill('#hiit-rf-s-emom-sec', '45');
  await page.locator('#btn-hiit-rf-add-ejercicio').click();
  await page.locator('#btn-hiit-rf-add-ejercicio').click();
  await page.locator('.hiit-rf-ej-nombre').nth(0).fill('Saltos');
  await page.locator('.hiit-rf-ej-nombre').nth(1).fill('Sentadillas');
  await page.locator('#btn-guardar-hiit-rutina').click();
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  foto.guardado.formHiit = await rutinaGuardada(page, ['Foto libre', 'Foto emom']);
  foto.listaHiitDespues = (await page.evaluate(ui.lista)).rutinas.filter((r) => /^Foto /.test(r.nombre));

  return foto;
}

export async function tomarFotoRutinas(browser, base, { ui = UI_MK3, capturas = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Santiago', locale: 'es-CL', serviceWorkers: 'allow' });
  await context.route(/supabase\.co/, (r) => r.abort());
  await context.clock.install({ time: AHORA_FOTO });
  // Los datos de demostración y el generador de rutinas eligen ejercicios
  // al azar: con una semilla fija la foto sale igual en cada corrida.
  await context.addInitScript(() => {
    let a = 20261123;
    // Reinicio de la semilla (solo esta herramienta): ver generarConSemilla.
    window.__semillaFoto = (x) => { a = x; };
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase\.co/.test(m.text() + (m.location()?.url || ''))) errores.push(m.text()); });
  try {
    await prepararEscenario(page, base);
    const foto = await recorrerRutinas(page, ui);
    if (capturas) {
      fs.mkdirSync(capturas, { recursive: true });
      for (const vp of [{ n: '390', w: 390, h: 844 }, { n: '1440', w: 1440, h: 900 }]) {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        for (const cat of CATS) {
          await irARutinas(page, cat);
          await page.screenshot({ path: path.join(capturas, `rutinas-${cat}-${vp.n}.png`), fullPage: true });
        }
        await page.locator('#btn-nueva-rutina').click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(capturas, `rutinas-form-hiit-${vp.n}.png`), fullPage: true });
        await irARutinas(page, 'gym');
        await page.locator('#btn-nueva-rutina').click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(capturas, `rutinas-form-gym-${vp.n}.png`), fullPage: true });
        await irARutinas(page, 'gym');
        await ui.abrirPlantillas(page);
        await page.locator('.btn-preview-plantilla').first().click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(capturas, `rutinas-plantilla-${vp.n}.png`), fullPage: true });
        await irARutinas(page, 'gym');
        await page.locator('#btn-generar-rutina').click();
        await generarConSemilla(page);
        await page.waitForSelector('#btn-usar-generado');
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(capturas, `rutinas-generada-${vp.n}.png`), fullPage: true });
      }
      await ir(page, 'dashboard');
    }
    return { ...foto, errores };
  } finally {
    await context.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const etiqueta = process.argv[2] || 'despues';
  const puerto = 8767;
  const srv = await servir(puerto);
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.supabase.co ~NOTFOUND'] });
  try {
    const salida = path.join(AQUI, 'salida', `rutinas-${etiqueta}`);
    const ui = etiqueta === 'antes' ? UI_MK3 : UI_ORBITA;
    const foto = await tomarFotoRutinas(browser, `http://127.0.0.1:${puerto}/`, { ui, capturas: salida });
    const destino = etiqueta === 'antes' ? ARCHIVO_ANTES_RUTINAS : path.join(salida, 'foto.json');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(foto, null, 2) + '\n');
    console.log(`Foto "${etiqueta}" (${ui.nombre}) → ${path.relative(RAIZ, destino)} (errores de consola: ${foto.errores.length})`);
    if (etiqueta !== 'antes' && fs.existsSync(ARCHIVO_ANTES_RUTINAS)) {
      const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_RUTINAS, 'utf8')), foto);
      console.log(difs.length ? `Diferencias con la foto de antes:\n  ${difs.join('\n  ')}` : 'Idéntica a la foto de antes.');
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
