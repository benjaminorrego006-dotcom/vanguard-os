# Rediseño total de Vanguard OS — Concepto «Órbita»

> **Estado actual (24-11-2026):** la **Fase 8 (Finanzas) está terminada** (55/55 OK en `verificar.mjs fase-8b`): Resumen, Movimientos, Sobres y Recurrentes en Órbita, con Movimientos y Recurrentes en el layout lista + detalle y las cifras idénticas a la foto de antes. Pendiente aparte: migrar a `oHoja` las hojas de formulario de Finanzas (siguen MK III dentro de `.mk3-finanzas`). Lo siguiente: la **Fase 9 (Entreno)**.

Fecha: 23-11-2026
Concepto elegido: **C · Órbita** (el día como un juego: anillos por módulo y misiones de a una)

> Primero escribí este plan a partir del brief y de la maqueta, sin leer el código. Después lo revisé contra el repositorio (rama `rediseno-orbita`, `CACHE_NAME = vanguard-os-v341`). Todo lo que estaba marcado **[verificar]** quedó resuelto, y los supuestos que no coincidían con el código están corregidos y señalados con **Corregido:**.

---

## 0. Cómo está hecha la app hoy (verificado)

### Router (`js/core/app.js`, clase `Router`, expuesta como `window.appRouter`)
- No existe un `router.js` aparte. El router vive en `js/core/app.js`.
- **Ruteo por hash.** `VALID_VIEWS = dashboard, tareas, habitos, entrenamiento, finanzas, ritual, planificador, anotaciones, laboratorio, configuracion`. Cada vista es `js/views/<id>.js` y exporta `render()` (async, devuelve HTML), `mountListeners()` y, si los necesita, `cleanup()` y `onSubrouteChange()`.
- **Un solo punto de montaje.** El listener de `hashchange` llama a `navigate(viewId)`. `navigate()` limpia la vista saliente, llama a `forgetOpenModals()`, carga el módulo, hace `innerHTML` en `#view-root`, llama a `mountListeners()` y anima con `fadeSlideIn`.
- **Cargador propio de módulos.** `loadModuleGraph()` baja el grafo de imports y lo reescribe como Blob URL. Detecta los imports con una expresión regular, línea por línea: `import … from './x.js'` o `import './x.js'`. Desde una vista, un `import()` dinámico relativo no funciona; hay que usar `appRouter.importar(ruta)`.
- **Subrutas.** Solo existen `#tareas/semana` (planificador dentro de Tareas) y `#dashboard/ritual` (Ritual). Las demás pestañas internas (Finanzas, Laboratorio) son estado del módulo y no se reflejan en el hash.
- **Redirecciones de hashes viejos.** `#mas` → Hoy con el menú abierto, `#ritual` → `#dashboard/ritual`, `#planificador` → `#tareas/semana` (con `replaceState`).
- **Guardia de navegación** (`js/core/vista-activa.js`): `marcarNavegacion()` y `guardiaVista()`, para que un repintado tardío no pinte sobre otra vista.
- **Actualizaciones.** `recargarSiHayActualizacion()` recarga la app en la siguiente navegación si el service worker nuevo ya tomó el control.
- **Clases de ámbito MK III.** `navigate()` alterna `.mk3-entreno`, `.mk3-finanzas`, `.mk3-tareas` (Tareas **y** Hábitos), `.mk3-dashboard` (Hoy y Configuración), `.mk3-ritual`, `.mk3-planificador` y `.mk3-anotaciones` sobre `#view-root`.

### Botón atrás (`js/core/history.js`)
- Un `MutationObserver` vigila la clase `open` de todo `.modal-overlay` **que tenga `id`**. Al abrir hace `pushState({ modalId })` y al cerrar con su propio botón hace `history.back()`. Con `popstate` cierra el modal visualmente. Escape usa el mismo camino.
- `forgetOpenModals()` se llama al cambiar de vista. `esperarSalidaDeModal()` espera el `popstate` antes de tocar otra vez el historial.
- `initSheetDragToDismiss()` permite cerrar arrastrando hacia abajo las `.sheet-content` desde su agarre.
- El lock screen (`#lock-overlay`) no es un `.modal-overlay` a propósito: el botón atrás no puede saltárselo.
- **Además, hay sub-vistas con su propio `pushState`** (no pasan por `history.js`): detalle de hábito (`habitos.js`), la pila de sub-vistas de Entreno (`entrenamiento.js`, un solo nivel), el menú de un sobre (`finanzas.js`), el historial de sesiones, la sesión activa (`rutina-session.js`) y la pantalla de Foco (`foco.js`).
- Hoy hay 23 `modal-overlay` en `js/` y 9 hojas `.sheet-content`.

### Navegación actual (`index.html`)
- `#app-nav` con Hoy · Tareas · Hábitos · Entreno · Finanzas. En **≥ 768 px** la misma barra se convierte en riel lateral (`css/layout.css`). Los cortes que existen son 640, 768 y 1024 px.
- Botón ☰ (`#btn-menu`) en el encabezado → `#menu-overlay` (un `.modal-overlay`) con Ritual (marca «Hecho»), Anotaciones, Laboratorio y Configuración.
- Transversales: `#toast-container` (abajo, a 80 px del borde), `#global-confirm-modal` y el splash.

### Nombres reales de las vistas y de lo que contienen

| Vista (hash) | Archivo | Qué contiene de verdad |
|---|---|---|
| Hoy (`#dashboard`) | `views/dashboard.js` | Saludo + fecha, botón «Día» (hoja de descanso planificado y nota del día, `dia-hoja.js`), chip 🔥 de **racha global** con vidas extra (escudo), línea de **Foco** en curso, **tarjeta contextual** (tipos: `ritual`, `backup`, `vida`, `semana`, `entreno`; con «Después»), **4 accesos rápidos: Gasto · Entrenar · Tarea · Nota**, alertas de caja y de gastos anuales, **agenda de hoy** (tareas con fecha de hoy, tareas de Semana, hábitos pendientes, atrasadas plegables con «Mover a hoy»), modal de progreso para hábitos numéricos, 6 filas por módulo (Entreno, Finanzas, Tareas, Hábitos, **Anotaciones**, **Laboratorio**), última nota, **captura rápida** y banner de instalación |
| Tareas (`#tareas`, `#tareas/semana`) | `views/tareas.js` + `views/planificador.js` | Pestañas Lista · Semana. Lista: buscador, «+», tablero por estado, alta rápida de tarea, mapa de actividad. Foco (Pomodoro de 25 min) por tarea |
| Hábitos (`#habitos`) | `views/habitos.js` | Anillo de racha («reactor») + insignias (`racha-reactor.js`), lista con check y franja de 7 días, **Análisis** plegable (dona, tendencia de 8 semanas, el hábito más flojo) y detalle del hábito (franja semanal, editar, eliminar) |
| Entreno (`#entrenamiento`) | `views/entrenamiento.js` | Sesión en curso (Retomar / Descartar), tarjeta de perfil y nivel, «Hoy toca» con «Empezar», buscador de ejercicios y rutinas, banner de sugerencia de nivel, GYM · Calistenia · HIIT, configuración de entreno, historial de sesiones, «Ver progreso completo» y Cuerpo. Sub-vistas: `rutinas`, `form`, `session`, `progreso`, `historial`, `cuerpo` |
| Finanzas (`#finanzas`) | `views/finanzas.js` | **5 pestañas: Resumen · Movimientos · Presupuesto · Recurrentes · Cuentas** (sobres y metas). También: gasto rápido propio (`parseQuickGasto`), ingresos, ahorro, transferencias, metas y gastos anuales |
| Ritual (`#dashboard/ritual`) | `views/ritual.js` | Ritual matutino |
| Anotaciones (`#anotaciones`) | `views/anotaciones.js` | Categorías → notas |
| Laboratorio (`#laboratorio`) | `views/laboratorio.js` + `components/laboratorio.js` | Módulos Semana · Entreno · Finanzas · Tareas · Hábitos, cada uno con sus pestañas. Revisión semanal |
| Configuración (`#configuracion`) | `views/configuracion.js` | Cuenta, Respaldos, **Apariencia (tema Gris / Color)**, Recordatorios, Perfil, Entrenamiento, Presupuesto (límites de los sobres), Seguridad (PIN), Reportes de errores, Datos de prueba, Datos, Acerca de |

### Supuestos del brief que el código no confirma
- **CLP/USD:** no existe en la interfaz. `utils/currency.js` lee `vg_currency` de `localStorage`, pero nada llama a `setCurrency()`, y la palabra "USD" no aparece en ningún archivo. La app es solo CLP. **No se agrega un selector:** sería una funcionalidad nueva.
- **Hábitos en rosa:** hoy Hábitos usa el mismo violeta que Tareas (ámbito `.mk3-tareas`). El rosa sería nuevo en Órbita.
- **Registro mensual de hábitos:** no hay un calendario mensual. Están la franja de 7 días por hábito, la franja semanal del detalle y el Análisis (dona y tendencia).
- **«Nv 14»:** no existe un nivel numérico. `nivelEntrenamiento` guarda el tiempo entrenando (`menos-1`, `1-3`, `mas-3`) y niveles **por rama** con nombre (de principiante a avanzado), no un número.
- **Racha 🔥:** es la **racha global** (`db.getRachaGlobal()`), que cuenta actividad de Tareas, Hábitos, Entreno y Finanzas. No es solo de Hábitos.
- **Fuentes:** viven en `assets/fonts/` (Inter, Space Grotesk, IBM Plex Mono), no en `css/fonts/`. Sora y Geist Mono ya están en `docs/rediseno/maqueta-orbita/fonts/`.

---

## 1. Idea central

Abrir la app tiene que responder tres preguntas de un vistazo: **cómo voy hoy** (la órbita), **qué hago ahora** (la misión siguiente) y **qué viene** (la franja de la agenda). Cada módulo es un anillo. Completar cosas cierra anillos. Las acciones frecuentes se hacen desde Hoy, sin entrar a ningún módulo.

## 2. Navegación

### Celular (principal)
Dock flotante inferior de 5 posiciones, con Hoy al centro:

| Posición | Destino | Color del módulo | Hash |
|---|---|---|---|
| 1 | **Hábitos** | rosa → coral | `#habitos` |
| 2 | **Plan** (Tareas, Semana, Notas) | violeta | `#tareas`, `#tareas/semana`, `#tareas/notas` |
| 3 (centro, orbe) | **Hoy** | degradado de los 4 | `#dashboard` |
| 4 | **Entreno** | turquesa → azul | `#entrenamiento` |
| 5 | **Finanzas** | ámbar → naranjo | `#finanzas` |

- **Corregido:** los ids de las vistas y los hashes **no cambian** (`dashboard`, `tareas`, `entrenamiento`…). Las notificaciones push ya programadas abren `./#habitos`, `./#tareas`, `./#finanzas` y `./#dashboard` (`core/recordatorios-calculo.js`), y puede haber enlaces guardados. «Plan» es solo la etiqueta visible de `#tareas`. Los hashes viejos (`#anotaciones`, `#planificador`, `#ritual`, `#mas`, `#laboratorio`, `#configuracion`) siguen funcionando con redirecciones en `resolveViewFromHash()`.
- **Orbe central:** si estás en otra pantalla, te lleva a Hoy. Si ya estás en Hoy, abre la **hoja de captura rápida**: el mismo flujo actual (monto **al principio** → gasto con `parseQuickGasto`; si no, tarea), sin cambiar su lógica, solo de lugar.
- **Perfil (Yo):** se abre al tocar el saludo o el avatar en la cabecera de Hoy. Es una hoja `.modal-overlay` con `id` que lleva a Laboratorio, Ritual y Configuración. Reemplaza al panel ☰ (`#menu-overlay`) y usa el mismo patrón de cerrar primero y navegar después del `popstate` (`initMenu()`).
- **Pestañas superiores** dentro de cada módulo, en lugar de submenús.

### Tablet (≥ 768 px)
El dock pasa a ser un **riel lateral izquierdo** con iconos y etiquetas. **Corregido:** el riel ya existe desde 768 px (`css/layout.css`); se reemplaza su estilo, no la mecánica. Hoy usa dos columnas: la órbita y los anillos a la izquierda; las misiones, la agenda y las acciones a la derecha.

### PC (≥ 1280 px)
Riel lateral fijo. Hoy usa tres columnas: la órbita, misiones + agenda, y una vista previa del módulo con la última actividad. Los módulos aprovechan el ancho con lista y detalle uno al lado del otro. Hoy los cortes de la app son 640, 768 y 1024 px; se agrega 1280.

## 3. Mapa de pantallas

```
Hoy (orbe) — #dashboard
├── Cabecera: fecha + botón «Día» (hoja descanso/nota), saludo/avatar → Perfil,
│   chip 🔥 racha global + 🛡 vidas extra → Hábitos › Logros
├── Línea de Foco en curso (si hay) → pantalla de Foco
├── Órbita: 4 anillos + puntaje del día → toque = Laboratorio › Semana (semana en curso)
├── Chips de anillo (Hábitos, Tareas, Entreno, Presupuesto) → cada uno abre su módulo
├── Mazo de misiones = tarjeta contextual actual (ritual, backup, vida, semana, entreno)
│   + agenda pendiente (hábitos, tareas de hoy y de Semana); deslizar = «Después», «Hecho» = completar
├── Acciones rápidas: Gasto · Tarea · Entrenar · Hábito · Nota (cada una abre una hoja o su flujo)
├── Alertas reales (cobro sin saldo, gasto anual sin saldo) → Finanzas
├── Franja «Siguiente» → hoja «Agenda del día» (agenda completa con checks, atrasadas, «Mover a hoy»)
├── Banner de instalación (cuando corresponde)
└── Hoja de captura rápida (desde el orbe)

Hábitos — #habitos
├── Hoy (lista con check y franja de 7 días) — por defecto; detalle por hábito como sub-pantalla
├── Análisis (dona, tendencia de 8 semanas, el más flojo)  [Corregido: antes decía «Mes»]
└── Logros (anillo de racha, insignias, vidas extra, mejor racha perfecta)

Plan — #tareas
├── Tareas (tablero por estado, buscador, alta rápida, mapa de actividad, Foco) — por defecto
├── Semana (planificador) — #tareas/semana
└── Notas (Anotaciones: categorías → notas) — #tareas/notas

Entreno — #entrenamiento
├── Inicio: sesión en curso, «Hoy toca» + Empezar, mapa muscular con fatiga, perfil y nivel,
│   sugerencia de nivel, buscador
├── Rutinas: GYM · Calistenia · HIIT + generador de rutinas + crear a mano
├── Progreso: historial de sesiones, progreso completo (árbol, estándares de fuerza,
│   detalle de ejercicio), Cuerpo (medidas, fotos)
└── Sesión activa (pantalla completa sobre el dock, con temporizador HIIT, calculadora de
    discos y descanso activo; si sales, queda un mini-reproductor en Hoy)

Finanzas — #finanzas
├── Resumen (balance, gastos/ingresos, gráficos) — por defecto
├── Movimientos (transacciones, ingresos, transferencias)
├── Sobres (Presupuesto + Cuentas: sobres con arrastre, límites y metas/ahorro)
└── Recurrentes (incluidos los gastos anuales)
    [Corregido: no hay selector CLP/USD; la app es solo CLP]

Perfil (hoja desde la cabecera de Hoy)
├── Laboratorio — #laboratorio (Semana · Entreno · Finanzas · Tareas · Hábitos; chart.js diferido)
├── Ritual matutino — #dashboard/ritual (también es la 1.ª misión de la mañana)
└── Configuración — #configuracion (las 12 secciones actuales)

Transversales: Onboarding (inicial + nivel de entreno) · lock screen PIN · hojas inferiores ·
diálogo de confirmación global · toasts (con acción de deshacer)
```

## 4. Funcionalidad actual → dónde queda

| Funcionalidad actual | Dónde queda en Órbita | Toques desde Hoy (hoy → Órbita) |
|---|---|---|
| **Hoy** · tarjeta contextual (ritual, backup, vida, semana, entreno) | Mazo de misiones («Después» = deslizar) | 1 → 1 |
| Hoy · accesos rápidos (Gasto, Entrenar, Tarea, **Nota**) | 5 botones: Gasto · Tarea · Entrenar · Hábito · **Nota**. **Corregido:** la maqueta tenía 4 y dejaba fuera Nota | 1 → 1 |
| Hoy · captura rápida (gasto si empieza con monto; si no, tarea) | Orbe (en Hoy) → hoja de captura. Parser intacto | tocar el campo + texto + Enter (el campo está al fondo de Hoy, hay que bajar) → 1 + texto + Enter |
| Hoy · elegir sobre cuando el texto calza con varios | Dentro de la hoja de captura | +1 → +1 |
| Hoy · agenda del día con checks | Misiones + hoja «Agenda del día» desde la franja | 1 por check → 1 por check desde la misión, 2 desde la hoja |
| Hoy · atrasadas + «Mover a hoy» | Hoja «Agenda del día» | 2 (desplegar + mover) → 2 (franja + mover) |
| Hoy · progreso de hábitos numéricos (modal) | Misma hoja, desde la misión o la agenda | 1 + cantidad + Sumar → igual |
| Hoy · hoja «Día» (descanso planificado y nota) | Botón «Día» junto a la fecha, en la cabecera | 1 → 1 |
| Hoy · línea de Foco en curso | Bajo la cabecera, igual que hoy | 1 → 1 |
| Hoy · alertas de caja y de gastos anuales | Tarjeta de alerta sobre las acciones (rojo solo aquí) | 1 → 1 |
| Hoy · filas por módulo (6) | Anillos + chips (4). Anotaciones → Plan › Notas; Laboratorio → toque en la órbita | — |
| Hoy · última nota | Plan › Notas (primera de la lista) | 1 → 2 |
| Hoy · banner de instalación | Se mantiene en Hoy | — |
| **Tareas** · lista/tablero, buscador, alta rápida, mapa de actividad | Plan › Tareas | — |
| Tareas · Foco (Pomodoro) | Plan › Tareas (por tarea) + línea en Hoy | — |
| Tareas · planificador semanal | Plan › Semana (`#tareas/semana`) | 2 → 2 |
| **Hábitos** · lista con check | Hábitos › Hoy | 1 (dock) + 1 → igual |
| Hábitos · «registro mensual» (en realidad: franjas de 7 días + Análisis) | Hábitos › Análisis + detalle | — |
| Hábitos · rachas, anillo de racha | Hábitos › Logros + chip 🔥 en Hoy + anillo rosa de la órbita | — |
| Hábitos · vidas extra | Hábitos › Logros + chip 🛡 en Hoy + misión «vida» | — |
| Hábitos · insignias | Hábitos › Logros | — |
| Hábitos · detalle (editar, eliminar, franja semanal) | Sub-pantalla de Hábitos › Hoy (mismo `pushState`) | — |
| **Entreno** · GYM / Calistenia / HIIT, crear a mano | Entreno › Rutinas | — |
| Entreno · generador de rutinas | Entreno › Rutinas › «Generar» | — |
| Entreno · sesión activa (y sesión en curso: Retomar / Descartar) | Pantalla completa + mini-reproductor en Hoy + tarjeta en Entreno › Inicio | — |
| Entreno · mapa muscular con fatiga | Entreno › Inicio | — |
| Entreno · niveles por rama y sugerencias | Entreno › Inicio (tarjeta de perfil + banner) | — |
| Entreno · historial, progreso completo, Cuerpo, fotos | Entreno › Progreso | — |
| Entreno · temporizador HIIT, calculadora de discos, descanso activo, resumen de sesión | Dentro de la sesión activa | — |
| Entreno · buscador, configuración de entreno | Entreno › Inicio (cabecera) | — |
| **Finanzas** · Resumen | Finanzas › Resumen | — |
| Finanzas · Movimientos, ingresos, transferencias | Finanzas › Movimientos | — |
| Finanzas · Presupuesto + Cuentas (sobres con arrastre, metas, ahorro) | Finanzas › Sobres + anillo ámbar | — |
| Finanzas · Recurrentes y gastos anuales | Finanzas › Recurrentes | — |
| Finanzas · gasto rápido propio (`parseQuickGasto`) | Se queda en Finanzas › Movimientos, intacto | — |
| ~~Finanzas · CLP/USD~~ | **No existe en el código.** Nada que migrar | — |
| **Ritual matutino** | 1.ª misión de la mañana + Perfil › Ritual | 2 (☰ → Ritual), o 1 desde la tarjeta → 1 (misión) / 2 (Perfil) |
| **Anotaciones** | Plan › Notas | 2 (☰), o 1 desde la fila de Hoy → 2 (dock + pestaña) |
| Anotaciones · nota nueva | Acción rápida «Nota» | 1 + «+» → igual |
| **Laboratorio** | Perfil › Laboratorio; toque en la órbita → Semana | 2 (☰), o 1 desde la fila → 1 (órbita) / 2 (Perfil) |
| **Configuración** (12 secciones) | Perfil › Configuración | 2 → 2 |
| Configuración · Apariencia (tema Gris / Color) | Perfil › Configuración › Apariencia: Órbita a color (por defecto) o modo sobrio (§ 7.5) | — |
| Onboarding inicial + nivel de entreno | Mismo flujo, rediseñado | — |
| Lock screen (PIN) | Igual: fuera de `.modal-overlay` | — |
| Modales | Hojas inferiores con `.modal-overlay` + `id` + `open` | — |
| Diálogo de confirmación global | Diálogo centrado (`#global-confirm-modal`) | — |
| Toasts (con acción de deshacer) | Píldora; posición ajustada sobre el dock | — |

Ninguna funcionalidad se elimina. El panel ☰ desaparece como contenedor: su contenido se reparte entre Plan y Perfil.

## 5. Las 5 acciones frecuentes: hoy (medido en el código) → Órbita

| Acción | Hoy | Órbita |
|---|---|---|
| Marcar un hábito | **1** (check en la agenda de Hoy; hay que bajar hasta la agenda) | **1** (misión «Hecho» o botón **Hábito** → toque = 2) |
| Registrar un gasto | Captura: tocar el campo + «4500 almuerzo» + Enter. Botón **Gasto**: **lleva a Finanzas** y abre la hoja → monto en el teclado + Guardar (sobre opcional, viene preseleccionado) = 2 + monto | Orbe + «4500 almuerzo» + Enter (**Corregido:** el monto va al principio; «gasto 4500…» se guardaría como tarea). Botón **Gasto**: la hoja se abre **en Hoy**, sin salir = 2 + monto |
| Agregar una tarea | Botón **Tarea** → título → Guardar = 2 + texto. O la captura: campo + texto + Enter | Igual: 2 + texto, u orbe + texto + Enter |
| Empezar un entreno | Botón **Entrenar** → va a Entreno y aprieta solo «Retomar» o «Empezar» de «Hoy toca» = **1**. Sin rutina para hoy: queda en Entreno (≥ 3) | **Corregido: 1** (se mantiene; el plan decía 2, y eso empeoraba). Sin rutina para hoy: Entreno › Rutinas |
| Revisar el día | 0, pero los resúmenes y la agenda quedan bajo los accesos rápidos (hay que bajar) | 0: órbita, chips y franja visibles sin bajar |

## 6. Dirección visual (base para la Fase 2)

- **Fondo:** `#0C0A1C`. **Superficies:** blanco al 6 % y al 10 % sobre el fondo (efecto vidrio). **Texto:** `#F4F2FF` / `#A9A3C9` / `#6E6890`.
- **Módulos** (color plano para texto e iconos; degradado para anillos y botones):
  Hábitos `#FF4D8D → #FF8A5C` · Plan `#7C5CFF → #B79BFF` · Entreno `#19E3D2 → #2FA8FF` · Finanzas `#FFC23D → #FF8A1F`.
  Notas mantiene un acento neutro, como el `--accent-notas` actual.
- **Alertas reales:** un rojo distinto del rosa de Hábitos (ver riesgos). Gastos y saldos negativos en rojo, como hoy.
- **Tipografía** (local, woff2, en `assets/fonts/`): **Sora** para títulos y texto; **Geist Mono** para cifras, horas y montos. Los archivos ya están en `docs/rediseno/maqueta-orbita/fonts/`.
- **Formas:** radios de 18 / 22 / 26 / 999 px. Dock y botones principales en forma de píldora.
- **Profundidad:** luces de color difusas en el fondo, vidrio con desenfoque y sombras de color solo en el botón principal de cada pantalla.
- **Animación:** resortes cortos (180–320 ms) al cerrar un anillo, al pasar de misión y al abrir hojas. Con `prefers-reduced-motion`, todo pasa a fundidos de 0 ms o 120 ms, sin desplazamientos.

## 7. Decisiones aprobadas (23-11-2026)

1. **Puntaje del día** (el número del centro de la órbita): es el promedio del avance de los 4 anillos (hábitos marcados hoy, tareas de hoy hechas, entreno de hoy y disponible del mes). Se calcula en memoria a partir del log y **nunca se guarda**. ✅
2. **XP:** se quita el «+40 XP» de las misiones y se muestra «cierra el anillo». Un XP global queda para después del rediseño, como funcionalidad nueva derivada del log. ✅
3. **Cabecera de Hoy:** se reemplaza «Nv 14» por **🛡 vidas extra**, junto al 🔥 de la racha global. El nivel con nombre de cada rama se queda dentro de Entreno. ✅
4. **Anillo de Finanzas:** muestra el **disponible del mes** (`budget.remaining`, sin el arrastre de los sobres, según la regla 4 de `CLAUDE.md`). Lleno significa «vas bien». ✅
5. **Tema Gris / Color:** no se elimina. «Gris» pasa a ser el **modo sobrio** de Órbita: fondo neutro, sin luces de color y con los acentos de módulo solo en anillos y estados. **Por defecto se usa Órbita a color.** El selector sigue en Configuración › Apariencia. ✅
6. **`CLAUDE.md`:** la sección de interfaz (MK III) se reescribe para Órbita. Se mantienen intactas todas las reglas de datos, sincronización, fechas, montos, service worker y accesibilidad. ✅
7. **Rosa de Hábitos vs. rojo de alerta:** toda alerta lleva **ícono y texto**, nunca solo color. El rojo de alerta tiene que distinguirse claramente del coral y el rosa de Hábitos, tanto en tono como en contraste. Se verifica en los tokens de la Fase 2. ✅
8. **Prueba en Playwright:** se captura en 375, 390, 768, 1280 y 1440 px (las medidas de `CLAUDE.md` y las del brief).

## 8. Fases restantes (una por commit, con su push)

| Fase | Contenido | Archivos principales (verificados) |
|---|---|---|
| 2 | Sistema de diseño: tokens nuevos (color, tipografía, escala, espaciado, radios, elevación, vidrio, movimiento) y clases por módulo. Sora y Geist Mono en local. Reglas de `CLAUDE.md` actualizadas (con aprobación) | `css/variables.css`, `assets/fonts/`, `sw.js`, `CLAUDE.md` |
| 3 | Esqueleto: dock y riel, hoja de Perfil (reemplaza a `#menu-overlay`), subruta `#tareas/notas`, redirecciones de los hashes viejos, layouts 390 / 768 / 1280 y transiciones. `history.js` adaptado y probado. Las vistas actuales se conectan sin rediseñar | `index.html`, `js/core/app.js` (`Router`: `VALID_VIEWS`, `resolveViewFromHash`, `navigate`, `initMenu`), `js/core/history.js`, `css/layout.css`, `sw.js` |
| 4 | Componentes base: botón, input, tarjeta, lista, chip, anillo, mazo de misiones, hoja inferior, diálogo, estado vacío, toast | `js/components/*`, `js/utils/states.js` (Toast, EmptyState), `css/components.css` |
| 5 | **Hoy**: órbita, misiones, acciones rápidas, franja, hojas de captura y de agenda | `js/views/dashboard.js` |
| 6 | **Hábitos** (Hoy · Análisis · Logros) | `js/views/habitos.js`, `components/racha-reactor.js`, `habito-form.js` |
| 7 | **Plan** (Tareas · Semana · Notas) | `js/views/tareas.js`, `planificador.js`, `anotaciones.js`, `components/task-form.js`, `foco.js` |
| 8 | **Finanzas** (Resumen · Movimientos · Sobres · Recurrentes) | `js/views/finanzas.js` (sin tocar `parseQuickGasto`) + formularios de `components/` |
| 9 | **Entreno** (Inicio · Rutinas · Progreso · Sesión activa) | `js/views/entrenamiento.js`, `rutina-session.js`, `rutinas-lista.js`, `mk3-muscle-map.*`, `sesiones-historial.js`, `cuerpo.js`… |
| 10 | **Perfil**: Laboratorio, Ritual y Configuración | `views/laboratorio.js` + `components/lab-*.js`, `views/ritual.js`, `views/configuracion.js` |
| 11 | **Onboarding** + lock screen + revisión de diálogos y toasts en toda la app | `components/onboarding-inicial.js`, `nivel-onboarding-form.js`, `core/lock.js` |
| Final | Limpieza: vistas, CSS y componentes viejos (MK III, ámbitos `.mk3-*`, `#menu-overlay`); revisión de consistencia; `docs/CHANGELOG.md` | — |

En cada fase: `CACHE_NAME` se incrementa, los archivos nuevos van a `PRECACHE_URLS`, ESLint `no-undef` queda limpio, se prueba con Playwright (Supabase bloqueado, zona `America/Santiago`) y se revisan la consola, las 5 acciones, crear/editar/borrar, el botón atrás, el modo offline y la sincronización. Después: commit, `git push origin rediseno-orbita` y confirmación del push.

### Registro de fases

**Fase 2 — Sistema de diseño (23-11-2026)**
- Tokens `--o-*` en `css/variables.css`: superficies, texto, módulos (plano, segunda parada y texto `-t`), estados, degradados, luces de fondo, tipografía (escala en rem), espaciado, tamaños de interfaz, radios, elevación, capas y movimiento (con su versión para `prefers-reduced-motion`).
- Modo sobrio en `html[data-tema="gris"]` y clases por módulo `.o-mod-habitos`, `.o-mod-plan`, `.o-mod-entreno`, `.o-mod-finanzas`, `.o-mod-notas` y `.o-mod-hoy`.
- Sora (400/600/700/800) y Geist Mono (400/500/600) en `assets/fonts/`, en `PRECACHE_URLS`. `CACHE_NAME` sube a `v342`.
- `CLAUDE.md`: la sección «Interfaz (MK III)» pasa a ser «Interfaz (Órbita)».
- Muestra de tokens fuera de la app: `docs/rediseno/tokens-orbita.html` (`?modo=sobrio` para el modo sobrio).
- **Ajustes al contraste** respecto de la maqueta:
  - El texto 3 pasa de `#6E6890` (3.8:1) a `#9A94BC` (6.8:1); `#6E6890` queda como `--o-faint`, solo decorativo.
  - Textos de acento: Hábitos `#FF6B9E` y Plan `#A58FFF`.
  - El texto sobre degradados va en tinta oscura (el blanco del «Hecho» de la maqueta daba 3.1:1).
  - El botón de Plan parte en `#8F72FF`.
  - Rojo de alerta `#FF3B3B`: ΔE 42.8 del rosa y 33.9 del coral; su texto, `#FF6060`, da ≥ 4.6:1.
- **Por defecto Órbita a color (decisión 7.5):** la app sigue arrancando en Gris hasta la Fase 3. Cambiar el predeterminado ahora pintaría MK III a color, que no es lo que se aprobó. En la Fase 3 el predeterminado de `utils/tema.js` y del script del `<head>` pasa a «color». A quien ya eligió Gris a mano se le respeta.
- **Verificación:** Chrome headless controlado por DevTools Protocol, con Supabase bloqueado, zona `America/Santiago`, perfil limpio y capturas en 390, 768 y 1440 px. Este equipo no tiene Node, así que no hubo Playwright ni ESLint. El único JS tocado es la lista de `sw.js`.

**Herramientas y línea base (23-11-2026, antes de la Fase 3)**
- Node v26.13.1 LTS portable en `%LOCALAPPDATA%\Programs\node`, con el SHA-256 verificado. `winget --scope user` no tiene un instalador de Node LTS solo para el usuario.
- ESLint `no-undef` limpio en todo `js/` (sin `js/vendor/`).
- `tools/verificar/verificar.mjs` (Playwright 1.65.0 + Chromium), fuera de la app: no está en `PRECACHE_URLS` y `_config.yml` excluye `tools/`.
  - Contexto: limpio, zona `America/Santiago`, reloj simulado (lunes 23-11-2026, 16:00) y Supabase bloqueado.
  - Datos: los de demostración de Configuración.
  - Pruebas:
    - las 5 acciones;
    - crear, editar y borrar una tarea;
    - el botón atrás (modal, menú, módulo → Hoy);
    - capturas en 390, 768 y 1440 px de las 5 vistas;
    - offline;
    - consola sin errores.
- **Línea base (MK III): 17/17 OK y 0 errores de consola.**
- **Bug previo encontrado (fuera del alcance, sin corregir):** si sales de Finanzas con Movimientos abierto y vuelves, la pestaña aparece activa pero la lista queda vacía hasta tocarla otra vez (`renderHistoryList()` solo corre al hacer clic en la pestaña).


**Fase 3 · esqueleto (23-11-2026)**
- **Dock flotante (celular):** cinco posiciones en este orden: Hábitos, Plan, Hoy (orbe al centro), Entreno y Finanzas. Lleva vidrio, cada ítem mide al menos 44 px y el activo toma el acento de su módulo (`.o-mod-*`).
  - Tocar el orbe desde otra pantalla lleva a Hoy.
  - Estando ya en Hoy, el orbe enfoca la captura rápida actual. Es un puente: en la Fase 5 abre la hoja de captura.
- **Riel:**
  - En tablet (≥ 768 px), riel de íconos con etiqueta y Hoy primero.
  - En PC (≥ 1280 px), riel de 220 px con la etiqueta al lado del ícono.
- **Hoja de Perfil (`#perfil-overlay`):** reemplaza al menú ☰. Se abre con el botón de la cabecera y contiene Laboratorio, Ritual matutino (con su "Hecho") y Configuración. `#mas` la abre.
- **Plan › Notas:** Anotaciones pasa a ser la sub-vista `#tareas/notas`, montada en `#notas-host` con su ámbito MK III.
  - Las pestañas de Plan quedan: Tareas, Semana y Notas.
  - `#anotaciones` redirige ahí, y los accesos de Hoy siguen funcionando, porque `navigate('anotaciones')` es un alias de esa subruta.
- **Fondo Órbita:** el fondo usa `--o-bg` con las luces `--o-ambient`.
- **Transición entre pantallas:** usa los tokens de movimiento.
- **Avisos (toasts):** se muestran por encima del dock.
- **`--o-z-dock`:** sube a 1000, igual que la barra anterior, para no quedar bajo elementos de las vistas MK III.
- **Tema:** Órbita a color pasa a ser el predeterminado. En Configuración › Apariencia las opciones quedan como "Órbita" y "Sobrio". Quien ya había elegido Gris lo conserva.
- **Verificación:** se agregaron pruebas para Perfil (atrás y navegación), el dock, el orbe, las redirecciones y Plan › Notas (crear y borrar una categoría sin perder las pestañas). Las capturas ahora incluyen Plan › Notas.
- **ESLint:** `no-undef` limpio.
- **Resultado: 22/22 OK y 0 errores de consola** (`node tools/verificar/verificar.mjs fase-3`).

**Bug previo de Finanzas › Movimientos (24-11-2026, commit `1fe6143`)**
- Al volver a Finanzas con Movimientos activa, la lista se llena al montar la vista (antes solo al tocar la pestaña). Prueba de regresión en `verificar.mjs`.

**Fase 4 · componentes base (24-11-2026)**
- **`css/orbita.css`** (nuevo, en `PRECACHE_URLS`): botón (primario con el degradado y la sombra del módulo, secundario, fantasma, alerta, ícono, bloque), campo (etiqueta, ayuda y error con ícono), tarjeta (estándar y destacada), lista y fila, check, chip, pestañas superiores, anillo, mazo de misiones, hoja inferior, diálogo, estado vacío y aviso. Solo tokens `--o-*`; sin módulo, los componentes caen a neutros.
- **`js/components/orbita.js`** (nuevo): `oIcono`, `oAnillo`, `oVacio`, `oMision`, `oMazo` + `montarMazo` («Hecho», «Después» o deslizar), `oHoja` + `abrirHoja` / `cerrarHoja` / `montarHoja`, y `msDeToken` (las esperas siguen a los tokens de movimiento).
- **Tokens nuevos** en `variables.css`: tamaños (`--o-icon-sm`, `--o-check`, `--o-anillo`, `--o-anillo-lg`, `--o-grip-w`, `--o-sheet-max`, `--o-dialog-max`, `--o-text-max`) y movimiento (`--o-move-sheet`, `--o-move-out`, `--o-press`, `--o-pop`, `--o-disabled`), con su versión para `prefers-reduced-motion`.
- **Transversales migrados a Órbita:**
  - Avisos (`Toast`, `ToastAccion`): píldora con ícono por tipo. `'warning'` (11 llamadas) antes salía sin color; ahora sale en ámbar con ⚠, y el rojo queda solo para `'error'`.
  - Diálogo de confirmación global: `.o-dialogo`; el ícono ⚠ solo acompaña a las acciones destructivas; foco inicial en «Cancelar».
  - Hoja de Perfil: pasa a `.o-hoja` (sin los `!important` de la Fase 3).
- **Convivencia con MK III:** los overlays de Órbita llevan `.o-ui`, que `components.css` excluye de la regla que deja recto todo lo que va dentro de un modal. `history.js` también deja arrastrar el agarre de `.o-hoja` para cerrarla (en ≥ 640 px no hay agarre).
- **Muestra fuera de la app:** `docs/rediseno/componentes-orbita.html` (`?modo=sobrio`), con los mismos CSS y JS de la app.
- **Contraste:** texto de acento sobre el tinte del módulo ≥ 4.75:1; tinta sobre el rojo de alerta, 5.5:1.
- **Verificación:** nuevas pruebas de la muestra en los dos modos (capturas en 390/768/1440; hoja con atrás, diálogo, los cuatro avisos y el mazo con botones y deslizando) y del aviso con ícono en la app. ESLint `no-undef` limpio. **25/25 OK y 0 errores de consola.**
- **Bug previo del diálogo, corregido en un commit aparte (24-11-2026):** cerrar el diálogo de confirmación con el botón atrás, con Escape o tocando fuera dejaba sin resolver la promesa de `ConfirmDialog`. Ahora cuenta como «Cancelar» (`false`), con su prueba en `verificar.mjs` (26/26 OK).

#### Fase 5 · Hoy (24-11-2026)
- **Vista nueva** (`js/views/dashboard.js` + `css/hoy.css`): cabecera (saludo, fecha, Día, racha con vidas, línea de Foco); **órbita** de 4 anillos (Hábitos, Tareas, Entreno, Presupuesto) con el puntaje del día al centro, que lleva a Laboratorio › Semana; chips por anillo que llevan a su módulo; **mazo de misiones** (la misión contextual de siempre —ritual, tu semana, respaldo, vida extra, avances, hoy toca— y después la agenda pendiente; «Después» la manda al final); 5 acciones rápidas (Gasto, Tarea, Entrenar, Hábito, Nota); alertas reales con ícono y texto (`.o-alerta`); franja «Agenda del día» que abre la hoja de agenda (con atrasadas y «Mover a hoy»).
- **Hojas:** agenda, hábitos de hoy, captura rápida (la abre el orbe del dock estando en Hoy) y progreso de hábito con cantidad. Repintar Hoy deja abierta la hoja que lo estaba, sin volver a animarla; `history.js` cierra por `id`.
- **Diseño adaptable:** celular en una columna; tablet con la órbita a la izquierda; PC en tres columnas con la agenda fija a la derecha (deja de ser hoja).
- **Gasto y Tarea** se abren sin salir de Hoy (formularios MK III dentro de su ámbito `.mk3-*` hasta su fase). Salen las filas heroicas y la «última nota» (§ 4).
- Todo se deriva en memoria; las mutaciones son las mismas funciones de `db.js` (cada una con su `logEvent`). `CACHE_NAME` → `v347`, `css/hoy.css` en el precache.
- **Verificación:** pruebas de Hoy actualizadas y nuevas (órbita → Laboratorio, «Después» en el mazo, hábito desde la agenda sin cerrarla, botón Hábito, orbe → captura con atrás). Capturas en 390/768/1440 en los dos modos. ESLint `no-undef` limpio. **29/29 OK y 0 errores de consola.**

#### Bordes «Esquina Vanguard» y puente MK III (24-11-2026, antes de la Fase 6)
- **Decisión del usuario (opción B):** todo redondeado salvo la esquina superior derecha, casi recta. Tokens `--o-radius-card` (18/4: tarjetas, listas, paneles), `-control` (12/3: botones, campos, pestañas), `-chip` (10/3), `-check` (7/2), `-sheet` (24/6 arriba, hoja inferior), `-circle` (anillos, orbe, avatares) y `-pill` (dock y avisos). Reemplazan a `--o-r-*` en `orbita.css`, `hoy.css`, `layout.css` y la página de tokens. Los botones de Hoy que eran píldora pasan a `control`.
- **Puente para las vistas MK III** (Hábitos, Plan, Entreno, Finanzas, Configuración, Laboratorio, Ritual): sin ningún chaflán (`clip-path`) y con los radios de Órbita (la regla común de `components.css` con `:is()` reemplaza las de cada scope; hojas y modales MK III con fondo sólido de hoja). Los tokens de MK III (`--panel`, `--line`, `--t1`…, los tintes de panel `--cyp`/`--vis`/`--cyb`… y los textos de acento `--X-t`) apuntan a los de Órbita en un bloque al final de `variables.css`, también en modo sobrio. Estructura y lógica intactas. Los hexágonos de insignias quedan (no son chaflán).
- **Finanzas:** la cabecera ya no es `sticky` con fondo propio (era la franja negra detrás del título).
- **Fechas dd-mm-aaaa:** `js/utils/campo-fecha.js` convierte cada `input type="date"` en un campo que se ve `dd-mm-aaaa` (es-CL, sin depender del idioma del navegador) y cuyo `.value` sigue siendo `YYYY-MM-DD`; el calendario nativo se abre con el ícono, con un toque en pantallas táctiles o con Alt+↓.
- **Verificación:** pruebas nuevas (filtro de fechas de Movimientos escrito por teclado, título de Finanzas sin franja, sin chaflán y con 18/4 px en las tarjetas de Hábitos, Plan, Entreno y Finanzas). Auditoría de contraste AA del texto de Hoy, Hábitos, Plan, Entreno y Finanzas en los dos modos: sin fallas salvo los números del mapa de calor de Finanzas (problema previo, pendiente). Capturas en 390/768/1440 en los dos modos. ESLint limpio. **32/32 OK y 0 errores de consola.** `CACHE_NAME` → `v348`.

#### Pendientes corregidos antes de la Fase 6 (24-11-2026)
- **Hoja de gasto desde Hoy (regresión de la Fase 5):** el teclado numérico, los chips y la animación del check de los formularios de Finanzas pasaron del `<style>` de esa vista a `components.css` (con tokens de Órbita), así que funcionan en cualquier vista. Prueba nueva: abre la hoja desde Hoy, comprueba estilos reales (12 teclas ≥ 44 px sin aspecto nativo, chips con caja táctil, relleno y radio, el elegido con fondo) y registra un gasto de punta a punta (sale en Movimientos con su monto y su sobre). Falla sin el arreglo («tecla de 21 px de alto») y pasa con él. La prueba del orbe ahora espera a que Hoy termine de pintarse. `v349`, 33/33.
- **Mapa de calor (Finanzas y Tareas):** cada celda ya no baja la opacidad (apagaba también el número); se pinta con una mezcla opaca del acento sobre el fondo, y al montar se elige texto claro o tinta oscura según el contraste real, corriendo la mezcla lo justo en los tonos medios donde ninguno llega a 4,5:1. Prueba nueva de contraste de todas las celdas en color y en sobrio: falla sin el arreglo (19 celdas, la peor 3,2:1) y pasa con él. `v350`, 34/34.
- **Riel en modo sobrio:** una regla vieja de `components.css` (el filo de 2 px del riel MK III, hecho con `background-image: linear-gradient(#D0D0D4, #D0D0D4)`) rellenaba todo el ítem activo del riel de Órbita con gris claro, y el texto del módulo quedaba en 1,74:1. Se quitó: el ítem activo vuelve a `--o-mod-soft` (superficie neutra) con el texto `--o-mod-t`. Prueba nueva en 768 y 1440 para Hábitos, Plan, Entreno y Finanzas; la ayuda de contraste del verificador ahora también cuenta los degradados de un solo color. `v351`, 35/35.
- **Check de Órbita sin ✓ (bug de la Fase 4, encontrado en la Fase 6):** al marcar un `.o-check`, su caja (`::before`) se escala con `transform`, y un elemento transformado se pinta encima del contenido sin posicionar: el ✓ quedaba tapado y se veía un cuadrado de color. El ícono pasa a `position: relative`. Prueba nueva: fotografía el ícono del check marcado en la hoja «Hábitos de hoy» y cuenta los píxeles de tinta; falla sin el arreglo (0) y pasa con él. `v352`, 36/36.

#### Fase 6 · Hábitos (24-11-2026)
- **Vista nueva** (`js/views/habitos.js` + `css/habitos.css`, en el precache): cabecera con el botón principal «+», pestañas **Hoy · Análisis · Logros** (estado del módulo, como Finanzas; flechas del teclado entre pestañas) y el detalle como sub-pantalla con su `pushState` de siempre. Sale el ámbito `.mk3-tareas` de Hábitos (`app.js`).
  - **Hoy:** resumen con anillo («2 de 3 hoy», descanso planificado si corresponde) y lista: nombre, racha y semana lunes a domingo (hecha, fallada con raya, hoy con borde, inactiva, descanso rayado, punto de nota); los semanales con su barra. Check de Órbita o botón con la cantidad para los hábitos con meta; «No aplica» los días fuera de su frecuencia.
  - **Análisis:** dona de 7 días con leyenda «N/7», el hábito en riesgo hoy y la tendencia de 8 semanas (la misma serie del Laboratorio). Chart.js sigue diferido; colores leídos de los tokens del módulo.
  - **Logros:** anillo de la racha global (el arco avanza hacia la próxima vida extra), las dos vidas, los últimos 7 días (con los protegidos), la racha perfecta (ahora y la mejor) e insignias en tarjetas con el color de su módulo. Reemplaza al «reactor» de tres anillos, que repetía la órbita de Hoy; `racha-reactor.js` queda con el escudo y el aviso de la primera vida.
  - **Detalle:** franja de la semana (toque = marcar; mantener presionado = hoja «Día»), racha y mejor, días marcados, Editar y Eliminar (con confirmación). Una columna del ancho de una hoja para que cada día mida más de 44 px también en tablet.
- **Hojas de Órbita:** formulario de hábito (`habito-form.js`: frecuencia con chips, días, meta, recordatorio) y progreso de cantidad; `.modal-overlay` con `id`, atrás las cierra.
- **Hoy:** el chip 🔥 abre Hábitos › Logros y el chip de Hábitos de la órbita, Hábitos › Hoy (`pedirPestanaHabitos`).
- **Limpieza:** CSS muerto del reactor, del «Análisis» plegable y del hexágono de insignias (`components.css`, `layout.css`).
- **Diseño adaptable:** celular en una columna; tablet y PC con el resumen, la racha o la dona a la izquierda y la lista o las tarjetas a la derecha. La lista y el detalle lado a lado en PC llegaron después (ver «Lista + detalle»).
- **Verificación:** pruebas nuevas (pestañas con sus gráficos y el tamaño de la dona; chip de racha → Logros; crear con «algunos días», marcar, detalle con atrás, editar y eliminar; cantidad con su hoja y atrás; botones de 44 px y contraste AA en las 3 pestañas y el detalle, en color y sobrio, a 390, 768 y 1440). La ayuda de contraste mide el texto sobre un degradado de módulo contra cada parada. ESLint `no-undef` limpio. `CACHE_NAME` → `v353`. **41/41 OK y 0 errores de consola.**

#### Lista + detalle (24-11-2026, antes de la Fase 7)
- **Componente reutilizable** `js/components/lista-detalle.js` (en el precache) + `.o-ld*` en `orbita.css`: `oListaDetalle()` (plantilla de dos columnas), `oListaDetalleCab()` (título + cerrar) y `crearListaDetalle({ clave, alCambiar })`, que lleva el elemento abierto.
  - **Bajo 1024 px** el detalle es sub-pantalla: abrirlo empuja `{ [clave]: true }` y el atrás del sistema (o «Volver») vuelve a la lista.
  - **Desde 1024 px** la lista va a la izquierda y el detalle a la derecha (fijo al bajar), con un aviso «Elige un…» cuando no hay nada abierto. Abrir, cambiar de elemento y cerrar no tocan el historial ni el hash.
  - Al cruzar el corte con el detalle abierto (girar la tablet, achicar la ventana) se empuja la entrada que falta para que el atrás siga volviendo a la lista.
- **Hábitos** lo usa en la pestaña Hoy: la fila abierta queda marcada (`aria-current`) y el detalle es el mismo en las dos formas (`cuerpoDetalle`). «Eliminar» sin relleno para mantener AA sobre la tarjeta del panel.
- **Verificación:** pruebas nuevas en 390 (sub-pantalla, atrás y «Volver» con su entrada de historial) y 1440 (dos columnas, la fila marcada, cambiar de hábito, marcar desde el detalle, cerrar sin tocar historial ni ruta, y pasar a 390 con el detalle abierto). El historial se mide contando `pushState` y `back` (con `history.length` no se puede: un `pushState` tras retroceder borra las entradas siguientes). La prueba del orbe ahora espera a que el mazo de Hoy esté visible (una corrida falló por tocarlo antes de tiempo). `CACHE_NAME` → `v354`. **43/43 OK y 0 errores de consola.**

#### Fase 7 · Plan (24-11-2026)
- **Vista** (`js/views/tareas.js` + `css/plan.css`, en el precache): cabecera «Plan» con las tareas pendientes y el botón principal «+» (solo en Tareas), pestañas **Tareas · Semana · Notas** con su subruta de siempre (`replaceState`, flechas del teclado). Sale el ámbito `.mk3-tareas` (`app.js`); la cabecera de módulo (`.o-mod-cab`) pasa a `orbita.css` porque la usan Hábitos y Plan.
  - **Tareas:** búsqueda (título, proyecto y notas; se mantiene al repintar), pestañas por estado con su cuenta, alta rápida, «Lo primero» (las dos más urgentes) y «En cola», mapa de actividad del mes. Cada fila abre el detalle; a la derecha, el paso siguiente: «Empezar» (Por hacer → En curso) o el check (En curso → Hecho), con su evento en el log. Vencida o vence hoy: alerta con ícono y texto.
  - **Detalle (lista + detalle):** sub-pantalla en celular (`{ tareaDetalle: true }`; el atrás vuelve a la lista) y columna derecha desde 1024 px, sin tocar historial ni ruta. Estado (se aplica al tocarlo), fecha, prioridad, dificultad y proyecto; Foco y «N focos · X min»; notas; subtareas que se marcan ahí mismo; bitácora derivada del log; Editar (hoja) y Eliminar (con confirmación). `crearListaDetalle` suma `descartar()`: si la tarea abierta se borra desde la hoja, suelta también la entrada de historial. Además, la entrada del detalle se suelta **una sola vez** aunque lleguen dos cierres seguidos (un repintado que descarta y el botón Eliminar), y `cerrar()` espera a que el diálogo de confirmación suelte la suya: antes eso retrocedía dos veces y sacaba de Plan (también aplica a Hábitos).
  - **Hoja de tarea** (`task-form.js`, `oHoja` `#task-modal`, la misma en Tareas, Semana y Hoy): título, estado, Foco, fecha (con aviso si venció), prioridad y dificultad en chips («Media» sugerida con borde punteado), notas, proyecto, subtareas y bitácora. Cerrarla de cualquier forma repinta la vista si un chip de estado ya movió la tarea.
  - **Semana** (`planificador.js`): mismo tablero (franja, detalle del día o 7 columnas desde 900 px, mantener presionado para mover, menú ⋯ con Foco y «Mover a», tira de atrasadas y «Pasar a hoy») con el marcado y los tokens de Órbita: check de Órbita, prioridad en barras propias, la tira de atrasadas como alerta con ícono. En las columnas (mouse) los botones bajan a 32 px.
  - **Notas** (`anotaciones.js`, acento neutro `.o-mod-notas`): categorías con su cuenta y «Nueva categoría»; dentro, formulario de nota y lista. El borrar de una categoría queda al lado del botón que la abre (antes estaba anidado). Desde tablet, el formulario a la izquierda y la lista a la derecha.
  - **Foco** (`foco.js`): pantalla completa en Órbita (`.o-mod-plan`, capa nueva `--o-z-foco`), anillo del módulo y botones de Órbita.
- **Limpieza:** CSS de Semana, buscador, «+» de encabezado, Foco y flecha de avance de MK III (`layout.css`, `components.css`).
- **Verificación:** pruebas nuevas (lista + detalle de tareas en 390 y 1440 contando `pushState`/`back`; alta rápida, Empezar, Hecho desde el detalle y eliminar sin dejar entrada de historial; hoja nueva con atrás; Foco con Terminar y contraste; Semana: agregar, marcar y borrar; botones de 44 px y contraste AA en Tareas, el detalle, Semana y Notas en color y sobrio a 390, 768 y 1440, más la hoja en sobrio). El CRUD de tareas ahora pasa por el detalle. Cuando una prueba falla, el informe dice también qué esperaba Playwright y en qué ruta y estado de historial quedó la app. ESLint `no-undef` limpio. `CACHE_NAME` → `v355`. **48/48 OK y 0 errores de consola.**

#### Íconos de alerta en modo sobrio (24-11-2026)
- En sobrio, la regla general que pasa los íconos a gris (`components.css`) excluye `.o-ico-alerta`: el ícono de alerta y de vencido conserva el color de estado, igual que su texto. `oIcono('alerta')` pone la clase solo; los dos íconos de alerta dibujados a mano (pantalla de error de `app.js`, advertencia de Rutinas) la llevan explícita. Los de color fijo por atributo (`stroke`) no pasaban por la regla.
- Cubre Hoy (atrasadas, cobros sin saldo y gastos anuales, que son las alertas de Finanzas con ícono), Plan (lista, detalle, Semana), la hoja de tarea y los avisos emergentes. Hábitos no tiene íconos de alerta; los de Finanzas llegan con la Fase 8.
- Prueba nueva: en sobrio, cada ícono de alerta visible tiene color y el mismo que su texto (en los avisos emergentes, donde el texto es neutro, basta con que no sea gris); de control, un ícono común sigue gris. `CACHE_NAME` → `v356`. **49/49 OK.**

#### Hábitos · hábito borrado en otro dispositivo (24-11-2026)
- Si el hábito abierto como sub-pantalla (celular) se borra en otro dispositivo, al llegar la sincronización el detalle usa `ld.descartar()` en vez de `ld.olvidar()`: vuelve a la lista **y suelta su paso del historial**. Antes quedaba un «atrás» que no hacía nada. Tareas ya lo hacía así desde la Fase 7.
- Prueba nueva (390): una segunda pestaña, con la misma base local, borra el hábito por su UI y la primera recibe el mismo aviso (`budget-updated`) que manda `sync.js`; se comprueba que vuelve a la lista, que soltó la entrada y que el siguiente atrás sale de Hábitos. Sin el arreglo falla. `CACHE_NAME` → `v357`. **50/50 OK.**

#### Fase 8 · Finanzas (24-11-2026)
- **Foto de antes** (`tools/verificar/foto-finanzas.mjs` → `finanzas-antes.json`, tomada con la app sin tocar en `1584518`): datos demo más un escenario que el arrastre tiene que cuidar (sobregiro de octubre que arrastra en negativo, un sobre archivado que sigue arrastrando, un gasto anual con su sobre). Guarda lo que muestra la pantalla (cada monto tal cual) y lo que calcula `getBudget` de agosto a noviembre.
- **Vista** (`js/views/finanzas.js` + `css/finanzas.css`, en el precache): cabecera «Finanzas» con el mes y el botón principal «+ Gasto»; pestañas **Resumen · Movimientos · Sobres · Recurrentes**. Sobres reúne lo que eran Presupuesto y Cuentas (`pedirPestanaFinanzas` traduce los nombres viejos). Sale el ámbito `.mk3-finanzas` de `app.js`; las hojas de formulario (ingreso, gasto, ahorro, transferencia, pago fijo, meta, gasto anual y el panel de sobre) siguen MK III envueltas en `.mk3-finanzas` y se montan fuera del cuerpo que se repinta.
  - **Resumen:** balance del mes (negativo: ícono y texto), tendencia, Gastos e Ingresos (abren Movimientos filtrado), Ingreso · Ahorro · Transferir, disponible por día, dona con su leyenda (≥ 80 % y ≥ 100 % con ícono y texto), mapa de actividad, saldo diario, comparativo y tendencia de 6 meses (Chart.js diferido, colores del módulo) y los 5 movimientos recientes.
  - **Movimientos (lista + detalle):** gasto rápido (`parseQuickGasto` sin cambios), filtros por tipo y por fecha (se mantienen al repintar), lista y edad del dinero. Detalle (`{ movDetalle: true }` en celular): monto, tipo, fecha, sobre y su saldo (negativo con ícono), meta; Editar abre la hoja de siempre (las transferencias no se editan, lo dice) y Eliminar con confirmación.
  - **Sobres:** gastado del mes con su anillo, regla 50/30/20 por categoría (abre Movimientos), tarjetas de sobre con saldo con arrastre, «$gastado de $disponible» o «Sobregiro de $X acumulado», la línea del arrastre («+$299.900 de octubre») y la de transferencias, mini gráfico de 3 meses, Transferir y menú ⋯ (Editar · Archivar, con su paso de historial); archivados con Desarchivar y metas de ahorro.
  - **Recurrentes (lista + detalle):** total por mes, pagos fijos y gastos anuales (`gastos-anuales.js` pasa a Órbita; su texto dice «desarchivarlo en Sobres»). Detalle (`{ recDetalle: true }`): monto, día, próximo cobro, sobre y su saldo; si el saldo no alcanza, aviso con ícono y texto («faltan $X»); Eliminar con confirmación.
- **Cálculo sin cambios:** cada cifra sale de `db.getBudget` y `calcularSaldosConArrastre` (`db.js` no se tocó) y todo monto pasa por `formatCurrency` / `formatCompactCurrency`.
- **Verificación:** prueba nueva que toma la foto con la interfaz Órbita y la compara campo a campo con la de antes (**0 diferencias**; los movimientos del mismo día se comparan como conjunto, porque su orden depende de ids aleatorios y cambia entre corridas también sin tocar nada); lista + detalle de Movimientos y Recurrentes en 390 y 1440 contando `pushState`/`back`; alertas con ícono y texto en el detalle, el cobro y la tarjeta de sobre; eliminar un movimiento y un pago fijo desde el detalle; objetivos de 44 px y contraste AA en las cuatro pestañas y los dos detalles, en color y sobrio a 390, 768 y 1440. ESLint `no-undef` limpio. `CACHE_NAME` → `v358`. **55/55 OK y 0 errores de consola.**

#### Fase 8b · Hojas de Finanzas (24-11-2026)
- **Las ocho hojas pasan a Órbita** (`oHoja` con `.o-mod-finanzas`, Atrás las cierra): gasto, ingreso, ahorro (aporte a meta), transferencia, pago fijo, sobre, meta y gasto anual. Piezas comunes en `js/components/fin-hoja.js` (cifra, línea de contexto, confirmación «registrado») y teclado Órbita en `NumericKeypad.js` (`renderNumericKeypad({ orbita: true })`; el de bloqueo sigue igual). Estilos al final de `css/finanzas.css`.
- **Lógica sin cambios:** mismos ids, mismas llamadas a `db` y mismos avisos. `parseQuickGasto` idéntico (44 líneas comparadas con `HEAD`). Los avisos de la línea de contexto («Excederías…», «quedaría en…», «ya está en negativo», «No tienes suficientes fondos…») llevan ícono y texto.
- **Sobre:** deja de ser un panel dentro de la pestaña y es una hoja más, montada una vez junto a las otras (`initEnvelopeForm` pasa a `mountListeners`).
- **Meta:** el color de la hoja sigue al dominio de la meta (Finanzas o Entreno), porque Entreno y Laboratorio también la abren.
- **Se quitan** el envoltorio `.mk3-finanzas` y el `<style>` de hojas MK III en Finanzas y en Hoy.
- **Dos arreglos de la Fase 8:** la hoja de ingreso leía el presupuesto del momento en que se montó (con las hojas montadas una sola vez, el contexto quedaba viejo); ahora lo lee en cada cambio. Y la vista ya no se salta el repintado cuando hay una hoja abierta: las hojas viven fuera de `#fin-cuerpo`, así que lo guardado se ve al cerrar.
- **Verificación (`fase-8b-hojas2`, 59/59, consola limpia):** de punta a punta por la interfaz, gasto (crear, editar desde su detalle, borrar; el saldo del sobre se revisa en cada paso), sobre (crear, editar, archivar; Atrás cierra la hoja) y pago fijo (crear, borrar desde su detalle). Las ocho hojas: Órbita, 44 px y contraste AA en color y sobrio. La prueba de la hoja de gasto de Hoy pasa a exigir teclas Órbita.

## 9. Riesgos y cómo se controlan

| Riesgo | Mitigación |
|---|---|
| **Contraste AA** sobre vidrio y degradados | Texto siempre sobre una superficie sólida o con opacidad ≥ 85 %. Los degradados solo van en anillos y fondos de botón, con texto blanco verificado. Prueba de contraste en la Fase 2. |
| **Rendimiento** de `backdrop-filter` y de las luces difusas | El desenfoque se limita al dock y a las hojas (ya hay `backdrop-filter` en `components.css`). Las luces son un gradiente sin `filter`. Alternativa sin desenfoque con `@supports`. |
| **Gamificación que cansa** | Sin sonidos ni confeti por defecto. La celebración solo aparece al cerrar un anillo completo. |
| **Botón atrás de Android** | Toda hoja nueva es `.modal-overlay` **con `id`** (sin `id`, `history.js` no la ve). Las sub-vistas con `pushState` propio (hábito, Entreno, sobre, historial, sesión, Foco) se prueban una por una. Orden esperado: hoja → sub-vista → módulo → Hoy → salir. |
| **Nuevo · Cargador de módulos por Blob URL** | Todo archivo nuevo usa imports estáticos de una línea con `.js` (los lee una expresión regular). Las cargas diferidas pasan por `appRouter.importar()`. Se prueba en carga limpia, con caché vacío. |
| **Nuevo · Hashes que ya circulan** | No se renombran vistas ni hashes. Las notificaciones push ya programadas abren `#habitos`, `#tareas`, `#finanzas` y `#dashboard`. Los hashes viejos se redirigen con `replaceState`. |
| **Nuevo · Pestañas que hoy no viven en el hash** | Finanzas y Laboratorio guardan su pestaña en memoria. Si pasan al hash, el botón atrás cambia de comportamiento; se decide y se prueba por módulo, sin mezclar ambos modelos dentro de una misma vista. |
| **Nuevo · Clases de ámbito `.mk3-*` en `navigate()`** | Conviven con las nuevas hasta la fase final. Las clases de Órbita se aplican en el mismo punto, y se borran las viejas en la limpieza. |
| **Nuevo · Rosa de Hábitos vs. rojo de alerta** | `CLAUDE.md`: el rojo es solo para alertas reales. El rosa `#FF4D8D` se parece al rojo. En la Fase 2 se fija un rojo de alerta distinguible, y se prueba con gastos en rojo y alertas de caja. |
| **Nuevo · Reglas de `CLAUDE.md` (MK III)** | Contradicen a Órbita (radios, sombras, colores). Se reescriben en la Fase 2 con tu aprobación, antes de escribir CSS nuevo. |
| **Nuevo · Tema Gris / Color** | Hoy `utils/tema.js` aplica `data-tema` y hay tokens para cada tema. Decidido (§ 7.5): «Gris» pasa a ser el modo sobrio de Órbita; por defecto, Órbita a color. |
| **Nuevo · Sincronización de vistas** | Varias vistas repintan con `budget-updated` (sync) y usan `guardiaVista()`. Con más pantallas montadas a la vez (PC con tres columnas), cada panel necesita su propia guardia. |
| **Sesión de entreno activa** al cambiar de pantalla | Ya existe la «sesión en curso» (Retomar / Descartar) con borrador (`utils/sesion-borrador.js`). Solo cambia su presentación (mini-reproductor). |
| **Captura rápida** cambia de lugar | Solo se mueve el componente. `parseQuickGasto` sigue en `finanzas.js` y Hoy lo importa desde ahí. Prueba de regresión con frases reales («4500 almuerzo», «15000 en auto» con dos sobres, «Comprar 2 entradas» → tarea). |
| **Datos nuevos** (puntaje, anillos) | Todo se deriva en memoria de lo que ya entrega `db.js`. Nada se escribe en IndexedDB. Sin cambios de esquema ni de stores. |
| **Offline / Service Worker** con fuentes y CSS nuevos | Cada archivo va a `PRECACHE_URLS` (hoy hay 128 entradas) y `CACHE_NAME` sube en cada commit (hoy está en `v341`). Prueba en modo avión. |
| **Funcionalidad perdida** en la migración | La tabla de la § 4 es la lista de control (ahora con Foco, hoja Día, alertas, Nota, Progreso de Entreno, metas y gastos anuales). Cada fila se marca al cerrar su fase. |
| **Dos sistemas visuales conviviendo** entre las fases 3 y 10 | Las vistas viejas se conectan al esqueleto nuevo. La limpieza total queda para la fase final. |
