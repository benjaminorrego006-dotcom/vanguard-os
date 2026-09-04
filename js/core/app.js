import { db } from './db.js';
import { mountLockScreen, startInactivityWatch, isLocked } from './lock.js';
import { initModalHistory, forgetOpenModals } from './history.js';
import { mountOnboardingInicial } from '../components/onboarding-inicial.js';
import { escapeHtml } from '../utils/escape.js';

const VALID_VIEWS = ['dashboard', 'tareas', 'habitos', 'entrenamiento', 'finanzas', 'analisis'];

// El servidor local a veces omite el header Content-Type cuando recibe
// varias peticiones en paralelo (medido: 0/52 fallos pidiendo los archivos
// de a uno vs 4/52 pidiéndolos todos a la vez, que es lo que hace el
// navegador automáticamente al resolver los imports estáticos de un
// módulo). Como el servidor no manda headers de caché, ni siquiera
// "precalentar" el caché HTTP evita que el import real vuelva a pedir
// todo en paralelo. La única forma de controlar la concurrencia es
// construir el grafo de módulos nosotros mismos: bajamos los archivos con
// un pool de descargas en paralelo acotado (con reintento y validación de
// Content-Type por archivo — ver CONCURRENCY más abajo) y los empaquetamos
// como Blob URL, reescribiendo sus imports relativos para que apunten a
// los Blob URL ya resueltos de sus dependencias. Así el import() final no
// dispara ninguna petición de red nueva. GitHub Pages sí manda
// Content-Type correcto bajo concurrencia; esto era un problema puntual
// del servidor local de desarrollo.
//
// OJO: esta función (fetchTextWithRetry + loadModuleGraph) está DUPLICADA
// en el <script type="module"> inline de index.html — ese bootstrap no
// puede importar nada (es justamente lo que carga este archivo), así que
// no hay forma de compartir el código. Cualquier cambio acá hay que
// replicarlo también allá, o quedan desincronizadas.
const blobUrlCache = new Map(); // url absoluta -> blob url ya construido

async function fetchTextWithRetry(url, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(i === 0 ? url : `${url}${url.includes('?') ? '&' : '?'}retry=${Date.now()}_${i}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
      const ct = res.headers.get('content-type') || '';
      if (!/javascript|ecmascript/i.test(ct)) throw new Error(`Content-Type inválido ("${ct || 'vacío'}") al pedir ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 80 * (i + 1)));
    }
  }
  throw lastErr;
}

// Cuántas descargas del grafo corren en paralelo. GitHub Pages manda
// Content-Type correcto aun bajo concurrencia (a diferencia del server
// local que motivó bajar todo secuencial en su momento — ver el comment de
// arriba). fetchTextWithRetry sigue validando Content-Type y reintentando
// por archivo, así que si algún host devuelve basura bajo carga, un par de
// archivos reintentan solos sin tumbar el resto. Si en el server local
// vuelven a aparecer fallos de Content-Type con N=6, bajar a N=3.
const CONCURRENCY = 6;

async function loadModuleGraph(entryUrl, onProgress) {
  if (blobUrlCache.has(entryUrl)) return blobUrlCache.get(entryUrl);

  // Acepta tanto `import { x } from './y.js'` como imports de solo efecto
  // `import './y.js';` (ej. librerías vendorizadas tipo UMD sin bindings).
  const importLineRe = /^import\s+(?:[^;\n]*?\sfrom\s+)?['"](\.[^'"]+)['"]/gm;
  const texts = new Map();   // url -> código fuente original
  const deps = new Map();    // url -> [{specifier, absUrl}]

  // 1. Bajar el grafo con un pool de descargas en paralelo (acotado a
  // CONCURRENCY) que lo va descubriendo a medida que cada archivo se
  // resuelve — no sabemos el total de archivos de antemano, así que
  // "total" crece a medida que aparecen nuevos imports. launch() se
  // re-llama cada vez que una descarga termina para mantener el pool
  // lleno; el orden topológico del paso 2 no depende del orden de llegada.
  const queue = [entryUrl];
  const seen = new Set([entryUrl]);
  let total = 1;
  let done = 0;
  await new Promise((resolve, reject) => {
    let active = 0;
    let failed = false;
    const launch = () => {
      if (failed) return;
      while (active < CONCURRENCY && queue.length > 0) {
        const url = queue.shift();
        if (blobUrlCache.has(url) || texts.has(url)) continue;
        active++;
        fetchTextWithRetry(url).then(text => {
          texts.set(url, text);
          done++;
          if (onProgress) onProgress(done, total);

          const fileDeps = [];
          let m;
          importLineRe.lastIndex = 0;
          while ((m = importLineRe.exec(text))) {
            const abs = new URL(m[1], url).href;
            fileDeps.push({ specifier: m[1], absUrl: abs });
            if (!seen.has(abs) && !blobUrlCache.has(abs)) {
              seen.add(abs);
              total++;
              queue.push(abs);
            }
          }
          deps.set(url, fileDeps);

          active--;
          if (failed) return;
          if (queue.length === 0 && active === 0) resolve();
          else launch();
        }).catch(err => { failed = true; reject(err); });
      }
      if (active === 0 && queue.length === 0) resolve();
    };
    launch();
  });

  // 2. Orden topológico (post-order): las dependencias primero.
  const order = [];
  const visited = new Set();
  (function visit(url) {
    if (visited.has(url) || blobUrlCache.has(url)) return;
    visited.add(url);
    for (const d of deps.get(url) || []) visit(d.absUrl);
    order.push(url);
  })(entryUrl);

  // 3. Construir los Blob URL de abajo hacia arriba, reescribiendo cada
  // import relativo para que apunte al Blob URL final de esa dependencia.
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const url of order) {
    let text = texts.get(url);
    for (const d of deps.get(url) || []) {
      const finalUrl = blobUrlCache.get(d.absUrl);
      if (!finalUrl) continue;
      const specRe = new RegExp(`(^import\\s+(?:[^;\\n]*?\\sfrom\\s+)?['"])${escapeRe(d.specifier)}(['"])`, 'm');
      text = text.replace(specRe, `$1${finalUrl}$2`);
    }
    const blob = new Blob([text], { type: 'text/javascript' });
    blobUrlCache.set(url, URL.createObjectURL(blob));
  }

  return blobUrlCache.get(entryUrl);
}

// Accesibilidad genérica de modales. Observer SEPARADO del de history.js
// (que maneja el botón atrás) a propósito, para no mezclar dos
// responsabilidades distintas en el mismo archivo — ambos escuchan el
// mismo cambio de clase "open" en cualquier .modal-overlay, sin pisarse:
// - role="dialog"/aria-modal="true": sin esto un lector de pantalla no
//   anuncia el modal como tal ni atrapa el foco dentro de él.
// - aria-label="Cerrar" en los botones .btn-close-modal (la mayoría son
//   solo un "×" sin texto real) — cubre los ~10 formularios que ya usan
//   esa clase, sin tener que tocar cada uno.
// - Devolver el foco a quien abrió el modal cuando se cierra: sin esto, al
//   cerrar el foco vuelve al <body> y alguien navegando por teclado pierde
//   su lugar en la página.
const modalOpeners = new Map(); // id del modal -> elemento a re-enfocar al cerrarse
function initModalAccessibility() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const el = m.target;
      if (!(el instanceof Element) || !el.id || !el.classList.contains('modal-overlay')) continue;

      if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
      if (!el.hasAttribute('aria-modal')) el.setAttribute('aria-modal', 'true');
      el.querySelectorAll('.btn-close-modal').forEach(btn => {
        if (!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', 'Cerrar');
      });

      const isOpen = el.classList.contains('open');
      if (isOpen && !modalOpeners.has(el.id)) {
        modalOpeners.set(el.id, document.activeElement);
      } else if (!isOpen && modalOpeners.has(el.id)) {
        const opener = modalOpeners.get(el.id);
        modalOpeners.delete(el.id);
        if (opener && typeof opener.focus === 'function' && document.body.contains(opener)) {
          opener.focus();
        }
      }
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
}

class Router {
  constructor() {
    this.root = document.getElementById('view-root');
    this.navItems = document.querySelectorAll('.nav-item');
    this.currentView = null;
    this.currentModule = null; // vista actualmente montada, para poder limpiarla antes de la próxima navegación

    // Inject icons only if they exist
    this.injectIcons();

    // db.init() abre (y de ser necesario migra a) IndexedDB — es async, así
    // que el resto del arranque espera a que termine antes de decidir si
    // hay que mostrar el lock screen o ir directo al Dashboard.
    db.init()
      .catch(err => console.error('Error inicializando la base de datos', err))
      .then(() => this.init());
  }

  injectIcons() {
    const iconHome = document.getElementById('icon-home');
    if (iconHome) iconHome.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const iconTasks = document.getElementById('icon-tasks');
    if (iconTasks) iconTasks.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
    const iconTraining = document.getElementById('icon-training');
    if (iconTraining) iconTraining.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect></svg>`;
    const iconWallet = document.getElementById('icon-wallet');
    if (iconWallet) iconWallet.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12h-3v4h3v-4z"></path></svg>`;
  }

  async init() {
    // Botón atrás para los modales .modal-overlay (ver history.js) — un
    // solo observer genérico, no hace falta enganchar nada por nav-item.
    initModalHistory();
    initModalAccessibility();

    // Los <a href="#tareas"> del nav ya cambian el hash solos (no hay
    // preventDefault acá): este listener es el ÚNICO lugar que monta una
    // vista a partir del hash, así que cubre por igual un click de nav,
    // el botón atrás/adelante del navegador, y compartir/recargar un link
    // directo a una vista.
    window.addEventListener('hashchange', () => {
      // Mientras el PIN sigue sin desbloquear no hay que montar nada de
      // fondo detrás del lock screen — si alguien edita el hash a mano
      // en la barra de direcciones estando bloqueado, se ignora.
      if (isLocked()) return;
      const viewId = this.resolveViewFromHash();
      if (viewId === this.currentView) return; // ya está montada (navigate() directo ya la puso, o ya estábamos ahí)
      this.navigate(viewId);
    });

    // Start robust splash screen logic
    this.setupSplashScreen();

    const bootDashboard = () => {
      startInactivityWatch();
      // Respeta el hash con el que se abrió/recargó la app (ej. un link
      // directo a #finanzas) en vez de ir siempre a Inicio.
      //
      // El bootstrap de index.html ya ocupó el 0%-30% de la barra del
      // splash bajando el grafo de app.js — este es el tramo pesado (la
      // vista inicial y sus componentes), así que sigue de 30% a 100%.
      // window.__vgSplashProgress lo define index.html (misma barra, ver
      // #splash-progress-bar); puede no existir si el splash ya se ocultó.
      this.navigate(this.resolveViewFromHash(), (done, total) => {
        if (window.__vgSplashProgress) window.__vgSplashProgress(0.3 + 0.7 * (done / total));
      }).then(async () => {
        // Layer 1: Hide automatically when ready
        this.hideSplash();
        // Primer arranque: onboarding de bienvenida por encima de lo que
        // haya quedado montado (normalmente Inicio). El flag vive en
        // IndexedDB (ver db.js), así que sobrevive a que se borre solo el
        // localStorage — a diferencia de un flag ahí, que reaparecería
        // justo cuando el usuario ya perdió todos sus datos.
        if (!(await db.isOnboardingInicialCompletado())) {
          mountOnboardingInicial();
        }
      }).catch(err => {
        console.error("Dashboard failed to mount initially", err);
        // Even on failure, try to hide it so user sees the error
        this.hideSplash();
      });
    };

    // Si el PIN está activado, la app queda bloqueada detrás del splash
    // hasta que se ingresa correctamente — recién ahí se monta la vista
    // del hash inicial (el hash no cambia mientras está bloqueada).
    if (db.isPinEnabled()) {
      mountLockScreen(bootDashboard);
    } else {
      bootDashboard();
    }
  }

  resolveViewFromHash() {
    const raw = (location.hash || '').replace(/^#/, '');
    return VALID_VIEWS.includes(raw) ? raw : 'dashboard';
  }
  
  setupSplashScreen() {
    // Layer 2: Safety timeout (Max 12 seconds). Antes eran 3s, pero eso
    // alcanzaba a tapar apenas una fracción del grafo de la vista inicial
    // (~1.1MB) en una conexión lenta: el splash se cerraba solo y dejaba
    // la pantalla vacía con la barra de nav mientras la vista todavía
    // seguía cargando en el fondo. 12s da margen real antes de asumir que
    // algo se colgó.
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash && !splash.classList.contains('splash-hidden')) {
        console.warn('Splash timeout: el contenido tardó demasiado en cargar, forzando cierre.');
        this.hideSplash();
      }
    }, 12000);

    // Layer 3: Manual "Entrar" button backup after 4s. Antes aparecía a
    // 1.5s, pero a esa altura normalmente todavía no hay nada montado
    // detrás del splash — apretarlo dejaba la pantalla vacía igual.
    setTimeout(() => {
      const btn = document.getElementById('splash-enter-btn');
      if (btn) {
        btn.style.display = 'block';
        btn.addEventListener('click', () => this.hideSplash());
      }
    }, 4000);
  }

  hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    
    // Check if it's already hidden to avoid double execution
    if (splash.classList.contains('splash-hidden')) return;
    
    splash.classList.add('splash-hidden');
    splash.style.pointerEvents = 'none';
    splash.style.opacity = '0';
    
    // Wait for the CSS fade-out transition, then remove from DOM completely
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 300);
  }

  async navigate(viewId, onProgress) {
    // Si el hash no coincide (navegación programática — ej. un tap en el
    // resumen de Finanzas del Dashboard — o el arranque con un hash
    // inválido/vacío), lo actualizamos para que la URL, compartir un link
    // y el botón atrás queden en sync. No delegamos el montaje al
    // 'hashchange' que esto dispara — currentView ya queda en viewId más
    // abajo, ANTES de que ese hashchange (asíncrono) pueda relanzar una
    // segunda vez la misma navegación (ver el guard en el listener de
    // init()), así que no hay doble montaje.
    if (location.hash.slice(1) !== viewId) location.hash = viewId;

    this.currentView = viewId;

    this.navItems.forEach(item => {
      const isActive = item.getAttribute('data-view') === viewId;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    // Vanguard MK III (paleta/tipografía/geometría nuevas): rollout
    // completo — Entreno, Finanzas, Tareas y ahora Inicio. Ver los bloques
    // html.mk3-entreno / html.mk3-finanzas / html.mk3-tareas /
    // html.mk3-dashboard en components.css: se activan acá porque es el
    // único punto por el que pasa toda navegación, sin importar qué vista
    // la dispare.
    document.documentElement.classList.toggle('mk3-entreno', viewId === 'entrenamiento' || viewId === 'analisis');
    document.documentElement.classList.toggle('mk3-finanzas', viewId === 'finanzas');
    // Hábitos comparte el scope MK III de Tareas (mismo acento violeta,
    // mismo dominio): no hace falta un html.mk3-habitos aparte que
    // duplicaría el mismo bloque de chaflán/tipografía en components.css.
    document.documentElement.classList.toggle('mk3-tareas', viewId === 'tareas' || viewId === 'habitos');
    document.documentElement.classList.toggle('mk3-dashboard', viewId === 'dashboard');

    try {
      this.root.style.animation = 'none';

      // Limpia la vista saliente ANTES de tirar su HTML (que se lleva sus
      // canvases con él) — si esa vista tenía instancias de Chart.js o
      // timers corriendo, esto es lo único que los para. Sin este hook, el
      // único momento en que se destruían era la próxima vez que esa misma
      // vista se volvía a montar (si es que se volvía a montar).
      if (this.currentModule && typeof this.currentModule.cleanup === 'function') {
        try { this.currentModule.cleanup(); } catch (e) { console.error('Error limpiando la vista anterior:', e); }
      }

      // Si la vista saliente tenía un modal abierto, su nodo va a
      // desaparecer con el innerHTML de abajo sin pasar por su botón de
      // cierre — hay que soltar su entrada de historial (ver history.js).
      forgetOpenModals();

      // OJO: no usar import.meta.url aquí — cuando app.js se carga desde un
      // Blob URL (ver loadModuleGraph), import.meta.url es ese blob: URL y
      // resolver rutas relativas contra él no funciona de forma fiable.
      const viewUrl = new URL(`js/views/${viewId}.js`, location.href).href;
      const blobUrl = await loadModuleGraph(viewUrl, onProgress);
      const module = await import(blobUrl);
      this.currentModule = module;
      this.root.innerHTML = await module.render();
      if (typeof module.mountListeners === 'function') module.mountListeners();
      void this.root.offsetWidth;
      this.root.style.animation = 'fadeSlideIn var(--transition-view)';
    } catch (err) {
      // El detalle técnico sigue yendo a consola siempre — lo de abajo es
      // la versión para el usuario: qué pasó en simple, cómo seguir, y el
      // detalle crudo colapsado detrás de "Ver detalle" para quien lo
      // necesite (soporte, o el propio desarrollo).
      console.error('Error al cargar la vista:', err);
      const detalle = escapeHtml(String((err && (err.stack || err.message)) || err));
      this.root.innerHTML = `
        <div style="padding: 48px 24px 24px; text-align: center;">
          <div class="icon-chip" style="width: 56px; height: 56px; background: rgba(239, 68, 68, 0.12); color: var(--state-high); margin: 0 auto 20px auto;">
            <svg aria-hidden="true" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <h2 style="font-size: 18px; font-weight: 800; margin: 0 0 8px 0; color: var(--text-primary);">Esta pantalla no cargó bien</h2>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0 auto 24px auto; line-height: 1.5; max-width: 320px;">Puede ser un problema pasajero de conexión o un dato que la vista no supo interpretar. Reintenta — si sigue pasando, vuelve a Inicio.</p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
            <button id="btn-view-error-retry" class="tappable" style="background: var(--accent-primary); color: #000; border: none; padding: 12px 24px; font-weight: 700; font-size: 13px; cursor: pointer;">Reintentar</button>
            <button id="btn-view-error-home" class="tappable" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 12px 24px; font-weight: 700; font-size: 13px; cursor: pointer;">Volver a Inicio</button>
          </div>
          <details style="text-align: left; max-width: 400px; margin: 0 auto;">
            <summary style="cursor: pointer; font-size: 12px; color: var(--text-disabled); font-weight: 600;">Ver detalle</summary>
            <pre style="white-space: pre-wrap; word-break: break-word; font-size: 11px; color: var(--text-disabled); background: var(--surface-2); padding: 12px; margin-top: 8px; overflow-x: auto;">${detalle}</pre>
          </details>
        </div>
      `;
      const btnRetry = document.getElementById('btn-view-error-retry');
      const btnHome = document.getElementById('btn-view-error-home');
      if (btnRetry) btnRetry.addEventListener('click', () => this.navigate(viewId));
      if (btnHome) btnHome.addEventListener('click', () => this.navigate('dashboard'));
    }
  }
}

// Global hook
window.appRouter = new Router();