# Vanguard OS — Changelog

## 25 sept 2026 — Nueva distribución: 5 pestañas, menú ☰, Hoy reordenado y riel responsive

**`CACHE_NAME`: `vanguard-os-v158` → `vanguard-os-v166`** (una versión por
commit; el commit de documentación no toca código y deja `v166`). Nueve
commits entre `5ecda90` y `5b70f9e`, agrupados por tema (el número de versión
indica el orden cronológico).

### Navegación

- **`dc5e2a4` (v158) — 5 pestañas y panel ☰.** La barra inferior pasa a
  Hoy · Tareas · Hábitos · Entreno · Finanzas; "Más" desaparece (y con él
  `views/mas.js`). Un encabezado global con botón ☰ abre un panel lateral
  (`.modal-overlay` + `open`, así `history.js` lo engancha solo al botón
  Atrás) con Anotaciones, Laboratorio y Configuración. Rutas antiguas:
  `#mas` → `#dashboard` + panel abierto, `#planificador` →
  `#tareas/semana`, `#ritual` → `#dashboard`. El router entiende
  subrutas (`#tareas/semana`) y las redirecciones se reescriben con
  `replaceState` para que Atrás no vuelva a la ruta vieja.
- **`13a544c` (v159) — Tareas: sub-pestañas Lista · Semana.** Semana monta el
  Planificador sin reescribirlo (solo repinta `#plan-host` si existe); la
  sub-vista sale del hash, así que recargar en `#tareas/semana` cae en
  Semana. Cambiar de sub-pestaña suelta los listeners de sync de la
  saliente (verificado: el contador de listeners `budget-updated` se queda
  en 1). El router avisa a la vista con `onSubrouteChange` cuando solo
  cambia la subruta.
- **`5c4626e` (v161) — Ritual en el panel ☰ + bug del historial.** Tras las
  12:00 (o tras "Después") el Ritual quedaba sin acceso. Ahora es la primera
  opción del panel (`#dashboard/ritual`, la misma ruta que la tarjeta
  contextual) y muestra "Hecho" si el ritual de hoy está completo
  (`db.getProgresoRitual`, sin flag aparte). **Bug corregido:** los links del
  panel cerraban con `history.back()` y el cambio de hash competía con ese
  retroceso — a veces la vista no cambiaba (con Ritual, siempre). Ahora se
  cierra primero y se navega al `popstate`; de paso desaparece la entrada
  fantasma que quedaba en el historial.

### Hoy

- **`42e0eac` (v160) — Hoy reordenado.** Encabezado compacto (saludo, fecha,
  chip de racha); una sola tarjeta contextual con prioridad Ritual pendiente
  (antes de las 12:00) > respaldo > "Hoy toca", y "Después" la oculta hasta
  mañana (fecha en `localStorage` vía `diaKeyDe`); accesos rápidos, agenda,
  resúmenes, Laboratorio y última nota. El Laboratorio pasa a **carga
  diferida** con `IntersectionObserver` (antes se cargaba directo): Chart.js
  no se descarga hasta llegar con el scroll. El anillo de racha grande y las
  insignias se mudan a la cabecera de Hábitos
  (`components/racha-reactor.js`, mismos valores desde el log de eventos).
  `calcularHoyToca` sale a `utils/hoyToca.js` para compartirlo con Hoy sin
  arrastrar el grafo de Entreno. Ritual se abre en `#dashboard/ritual` (`#ritual`
  a secas sigue siendo solo una redirección).
- **`48e4a75` (v162) — Agenda de hoy + accesos rápidos.** Lista las tareas con
  fecha de hoy (Tareas y Semana) y los hábitos que tocan hoy y no están
  cumplidos, con checkbox en línea que usa las mismas funciones de `db.js`
  que el resto de la app (`updateTaskStatus`, `toggleTareaPlan`,
  `toggleMarcaHabito`), cada una con su `logEvent`; repinta sin animación y
  conserva el scroll. Vacío: "Nada pendiente hoy". Accesos rápidos: Gasto,
  Entrenar, Tarea (abre el `task-form` existente) y Nota (abre Anotaciones
  en la categoría de la última nota; `anotaciones.js` exporta
  `abrirCategoria`).
- **`29770b5` (v163) — Hábitos numéricos en la agenda.** Antes un toque
  registraba la meta completa. Ahora abre un modal (`.modal-overlay` +
  `open`) que **suma** la cantidad ingresada a lo ya registrado hoy y guarda
  el total con `registrarProgresoHabito`: si llega a la meta sale de la
  agenda, si no queda con el avance (ej. 5/20 min). Decisión: el evento
  guarda el **total del día**, no el incremento — es el valor absoluto que ya
  usa `registrarProgresoHabito` y es más seguro para sync.

### Layout responsive y riel

- **`e4194ab` (v164) — Tablet y PC.** 768–1023 px: riel de 72 px solo con
  íconos (el texto queda para lectores de pantalla) y Hoy en 2 columnas.
  ≥1024 px: riel de 220 px con texto, contenido centrado de hasta 1200 px
  (reemplaza los máximos de 960/1120) y Hoy en grilla de 12 columnas (agenda
  7 / resúmenes 5). <768 px sin cambios. Foco de teclado visible en el riel.
- **`4dbf5d9` (v165) — Riel MK III.** El riel salía flotante y con esquinas
  redondeadas (heredaba `left/right/bottom` de 16 px y el radio de 26 px de la
  barra móvil). Ahora va pegado al borde izquierdo a toda la altura, con
  borde de 1 px (`--line`), **chaflán con `clip-path`** en dos esquinas
  opuestas (`--chaflan`, igual que las tarjetas MK III), sin radios ni
  sombras (tampoco en los ítems). El ítem activo usa el acento del módulo
  (dorado de marca en Hoy, cian Entreno, ámbar Finanzas, violeta Tareas) con
  fondo tenue y filo de 2 px a la izquierda.
- **`5b70f9e` (v166) — Reversión del token rosa.** `4dbf5d9` había agregado
  `--pk` (rosa) para Hábitos en el riel; Hábitos en MK III es violeta.
  Se elimina el token de `variables.css` y el ítem activo de Hábitos usa el
  `--vi` existente (verificado a 1024 px: mismo color que el acento de la
  vista). Se conservan el filo de 2 px y el borde con `--line`.

### QA (Playwright, 375×812 y 1280×800)

Recorrido completo sin cambios de código: las 5 pestañas (textos sin cortar),
el panel ☰ (abre con el botón, cierra con el fondo y con Atrás; cada ítem
navega y lo cierra), las tres rutas antiguas (ninguna deja pantalla vacía),
Atrás sobre el panel y sobre un modal (cierra el modal sin salir de Hoy),
marcar una tarea y un hábito desde la agenda (aparecen como hechos en
Tareas y en Hábitos), grilla de Hoy sin scroll horizontal y **modo offline**
(con el servidor local apagado y el service worker ya instalado — 96
entradas en `vanguard-os-v166` — Hoy carga y las 5 pestañas, Laboratorio y
`#planificador` navegan). Consola limpia, sin respuestas 4xx.

### Notas

- `core/sync.js`, `core/supabase-client.js`, `core/db.js` y `core/history.js`
  no cambiaron en ninguno de los nueve commits; la sincronización con
  Supabase no se pudo ejercitar en QA (no hay sesión de prueba), solo se
  comprobó que el código de sync no se tocó.
- Archivos nuevos (todos en `PRECACHE_URLS`): `js/components/racha-reactor.js`,
  `js/utils/hoyToca.js`. Archivo eliminado: `js/views/mas.js`.
- Comportamiento previo que el QA reconfirmó (no es un cambio de esta
  tanda): la primera visita a Entreno abre el modal de perfil y tapa la
  navegación hasta cerrarlo.
- Las tareas de `Tareas` no tienen recurrencia (lo recurrente es de
  Finanzas); la agenda solo lista las tareas con fecha exactamente de hoy,
  sin atrasadas.

---

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
