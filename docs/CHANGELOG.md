# Vanguard OS — Changelog

Resumen de los 20 commits entre `bb6c189` (3 sep 2026) y `b6a4519` (5 sep
2026, HEAD de `worktree-dashboard-mk3` al momento de escribir esto). Agrupado
por tema, no por orden cronológico — el orden cronológico exacto está en
`git log --oneline bb6c189..b6a4519`.

---

## Integridad de datos (plata y fechas)

- **`ea113d8` — moneda unificada en CLP.** `getCurrency()` devolvía `'USD'`
  por defecto sin que existiera ninguna pantalla para cambiarla: Inicio y
  Análisis mostraban `US$450.000,00` mientras Finanzas mostraba `$450.000`,
  misma app, dos monedas. Además el formateador CLP estaba copiado a mano en
  7 archivos. `utils/currency.js` pasa a ser la única fuente (default CLP,
  locale `es-CL` fijo), y esos 7 archivos importan desde ahí.
- **`b1b2928` — separador de miles chileno en metas y sobres.**
  `goal-form.js` y `EnvelopeForm.js` usaban `<input type="number">` +
  `parseFloat`, donde el punto es separador *decimal* — un usuario tipeando
  "500.000" veía guardarse `500` sin ningún aviso (corrupción silenciosa).
  Pasan a `type="text" inputmode="numeric"` con máscara de miles en vivo
  (`digitsToMiles`/`milesToInt`), decisión acordada con el usuario en vez de
  reusar el patrón de teclado numérico de Gasto/Ingreso/Ahorro (esos modales
  son de un solo propósito; goal-form.js tiene 2 montos compartiendo
  pantalla con nombre/tipo/fecha/ícono).
- **`f5f0bd4` — fechas de día calendario sin corrimiento de huso horario.**
  `toISOString().slice(0,10)` convierte a UTC antes de truncar, así que una
  fecha construida en hora local puede caer en otro día calendario según el
  huso horario del usuario. Nueva `diaKeyDe()` en `fecha.js` (mismo criterio
  que la ya existente `mesKeyDe()`), aplicada en tareas recurrentes, racha
  global y nombre del archivo de respaldo.
- **`b4f3f9a` — locale de fechas unificado a `es-CL` + "Ahorro" singular.**
  Convivían tres criterios de locale (`es-CL`, `es-ES`, y ninguno) repartidos
  en 16 llamadas a `toLocaleDateString`/`toLocaleTimeString`. Se centralizan
  en 5 helpers nuevos de `fecha.js` con locale fijo. De paso, la lista de
  movimientos de Finanzas mostraba la fecha en crudo ISO en vez de
  formatearla, y todas las etiquetas visibles que decían "Ahorros" se
  normalizan a "Ahorro" singular (la clave interna de filtro no se tocó).

## Navegación y robustez del arranque

- **`85ae8e6` — navegación por hash + el botón atrás cierra modales, no la
  app.** No había un solo `hashchange`/`popstate`/`pushState` en el
  proyecto: la URL nunca se movía de `/vanguard-os/`, así que "atrás" en
  cualquier vista (o con un modal abierto) cerraba la app entera en vez de
  volver a Inicio o cerrar el modal, y recargar siempre volvía a Inicio.
  Se agrega navegación real por hash en `app.js` y un `history.js` nuevo con
  un `MutationObserver` genérico sobre la clase `.modal-overlay` que cubre
  **todos** los modales de la app (de negocio y el de confirmación global)
  sin tocar cada formulario uno por uno.
- **`3a8a194` — bootstrap más rápido + splash con progreso real.** El grafo
  de módulos se bajaba de a un archivo por vez (esquivando un bug de
  Content-Type de un servidor local viejo) — en GitHub Pages eso son ~60
  round-trips secuenciales en la primera visita. Pasa a un pool de 6
  descargas en paralelo, con progreso real en la barra del splash en vez de
  una animación falsa, y un mensaje de "Reintentar" si el grafo falla del
  todo (en vez de un `location.reload()` a ciegas que podía loopear).
- **`d59ac35` (parte a) — manejo global de errores.** Cualquier excepción
  fuera de un `try/catch` dejaba la app muda, sin rastro visible. Ahora hay
  un listener de `error`/`unhandledrejection` en el bootstrap, y
  `navigate()` muestra una pantalla de error legible (en vez del div rojo
  con la excepción cruda) con botones "Reintentar"/"Volver a Inicio" y el
  detalle técnico colapsado detrás de un `<details>`.

## Seguridad

- **`d6714a0` — texto de usuario sin escapar en 3 lugares.** Un nombre de
  hábito o rutina con `&`/`<` rompía el render, y como queda guardado en
  IndexedDB la app quedaba rota en cada carga siguiente hasta borrar el
  dato a mano. Corregido en `habitos.js`, `entrenamiento.js` y
  `dashboard.js` (alerta de flujo de caja), más un caso encontrado en el
  barrido de control (`analisis.js`, título de tarea en el historial).

## Adopción de la PWA

- **`13a0850` — banner de instalación.** Sin capturar `beforeinstallprompt`
  temprano (se dispara una sola vez) la app nunca se ofrecía para instalar:
  el usuario la usaba como pestaña de navegador para siempre. Banner
  discreto en Inicio si hay un prompt disponible, la app no está ya
  instalada, y no se descartó en los últimos 30 días. De paso, unificado
  `theme-color` entre `manifest.json` e `index.html` (antes eran dos valores
  distintos y la barra de estado cambiaba de color entre pestaña y app
  instalada).
- **`fccba8b` — aviso de respaldo también en Inicio.** El aviso de días sin
  respaldar solo vivía en Ajustes de Finanzas — con todo en IndexedDB local
  y sin backend, eso es muy fácil de no ver hasta que ya es tarde. Ahora
  también aparece como tarjeta en Inicio (ámbar hasta los 30 días, rojo
  después), reusando la misma lógica de `utils/backup.js`.
- **`0486680` — onboarding inicial de bienvenida.** El primer arranque caía
  directo en un dashboard vacío sin explicar nada. Modal de 3 pasos,
  saltable, una sola vez (flag en IndexedDB, no `localStorage` — ese se
  borra junto con los datos del sitio): qué es la app, exportar un respaldo
  ahí mismo, e instalarla en la pantalla de inicio.

## Layout y viewport

- **`27f5da2` — `100dvh` en mobile.** `.app-layout` solo tenía
  `height:100vh`; en Chrome Android eso es la altura *con* la barra de URL
  visible, tapando parcialmente el nav flotante de abajo. Mismo fallback
  `100vh` + `100dvh` que ya tenía el bloque de escritorio.
- **`14cabdc` — pinch-zoom permitido + inputs a 16px mínimo.** El viewport
  tenía `maximum-scale=1.0, user-scalable=no` bloqueando el pinch-zoom — un
  fallo de accesibilidad real para quien no ve bien. Esos atributos existían
  para evitar el zoom automático de Safari iOS al enfocar un input; la
  solución correcta (inputs con `font-size >= 16px`) ya estaba parcialmente
  aplicada, así que se sube el resto: 27 inputs/selects/textareas en 15
  archivos que quedaban por debajo de 16px.

## Copy en español de Chile

- **`f651ea1` — voseo a tuteo.** Los 16 casos ya identificados en una sesión
  anterior, más 9 casos nuevos encontrados en un barrido final (imperativos
  con tilde final, "tenés"/"podés"/"vos"). Queda un voseo sin tocar a
  propósito: el mensaje de error de arranque de `index.html`, señalado como
  pendiente de otra reescritura (resuelto después en `d59ac35`).

## Accesibilidad

- **`a1593ad` — nombres accesibles (nav, modales, toasts, botones de
  ícono).** No había un solo `aria-*` ni `role=` en todo el proyecto.
  Cobertura genérica vía un observer nuevo que agrega `role="dialog"` y
  devuelve el foco al cerrar cualquier `.modal-overlay`, más
  `aria-current="page"` en la navegación, `aria-live` en los toasts, y
  `aria-label` puntual en los botones de ícono más tocados (marcar/borrar
  hábito, borrar movimiento, favoritos de PR). Quedó explícitamente afuera
  de esta pasada la mayoría de los botones de ícono de varios formularios
  secundarios.
- **`d59ac35` (parte b) — confirmaciones que dicen qué destruyen.**
  `ConfirmDialog` pasa a aceptar `{ verb, danger }`: el título nombra el
  objeto, el cuerpo nombra la consecuencia con datos reales calculados
  cuando se puede (cuántas subtareas, cuántos movimientos quedan sin sobre,
  cuánto llevás ahorrado), y el rojo queda reservado para lo realmente
  destructivo. El caso más explícito es "olvidé mi PIN" en `lock.js`, que
  cuenta en números reales lo que se pierde y exporta un respaldo
  automático antes de borrar.
- **`21e5d17` — tipografía autoalojada + sin sombras.** Inter, Space
  Grotesk e IBM Plex Mono pasan a `.woff2` local (subset latin) en vez de
  depender de `fonts.googleapis.com` en el arranque — una PWA offline-first
  no puede necesitar una petición externa para verse bien. Space Grotesk e
  IBM Plex Mono estaban declaradas en `variables.css` pero nunca se
  cargaban en ningún lado; ahora se sirven de verdad. De paso, se sacan los
  `box-shadow` redundantes de botón primario, tabs, hoja modal y bottom-nav
  (ya hay un border de 1px haciendo esa separación visual en cada caso).
- **`1f0494b` — teclado numérico en los formularios que faltaban.**
  `inputmode="numeric"`/`"decimal"` en los campos que faltaban de
  `profile-form.js`, `hiit-timer.js`, `hiit-rutina-form.js`,
  `rutina-form.js` y los 3 campos de porcentaje de la regla 50/30/20 en
  `finanzas.js`, más `enterkeyhint="done"` en el último campo numérico de
  cada uno.
- **`b6a4519` — labels asociados a su input.** De 62 `<label>` en el
  proyecto, solo 1 tenía `for=`. Se asocian los 55 que sí describen un
  único control (`<label for="X">` / `<input id="X">`, agregando id donde
  faltaba). Los 7 restantes eran encabezados de un grupo de botones/
  checkboxes sin ningún control real al que asociarse ("Modo", "Prioridad",
  "Subtareas", etc.) — pasan a `<div>` con el mismo estilo en vez de forzar
  un `for` inválido apuntando a un input oculto.

## Housekeeping

- **`1ed77cb` — borrado de archivos muertos.** `VanguardOS_Claude_Spec.md`
  (desactualizado), `Vanguard_OS_Prompt.txt` (sin referencias),
  `seed-data.js` (solo se invocaba a mano desde la consola) y
  `css/tokens-mk3.css` (no linkeado en ningún lado) — confirmado con grep
  que ninguno tenía referencias vivas antes de borrarlos.
- **`afb3c82` — documentación interna movida a `docs/`.** Los `.md` de
  planificación quedaban públicamente accesibles en GitHub Pages porque
  esa plataforma sirve toda la raíz del repo. Se mueven a `docs/` (no se
  publica como contenido de la app) y se agrega un `README.md` real en la
  raíz.

---

## Nota sobre `CACHE_NAME`

Casi todos estos commits suben `CACHE_NAME` en `sw.js` (de v20-y-pico a
v75 al cierre de este resumen) — regla del proyecto: sin subirlo, el
Service Worker sigue sirviendo el contenido cacheado viejo aunque el
código en el repo ya haya cambiado.
