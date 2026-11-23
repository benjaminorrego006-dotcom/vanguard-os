# Rediseño total de Vanguard OS — Concepto «Órbita»

Estado: **Fase 1 aprobada** · siguiente: Fase 2
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
