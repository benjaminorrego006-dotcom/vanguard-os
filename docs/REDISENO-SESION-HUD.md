# Rediseño de la sesión activa de Entreno — "Cabina (HUD)"

Instrucciones para Claude Code. Rama `worktree-dashboard-mk3`. Las reglas de
`CLAUDE.md` mandan sobre este archivo; si algo de acá las contradice, avisa
antes de cambiar nada.

No hay maqueta en el repo: guíate por las descripciones de cada fase, con los
tokens de `css/variables.css` / `.mk3-entreno` (acento cian, ámbar para récords
y superseries).

## Estado

| Fase | Estado |
| --- | --- |
| 0 — "Hoy toca → Empezar" | Hecha (0e92260) |
| 1 — Borrador de sesión | Hecha (c35e30f, v243) |
| 2 — Pantalla completa y orden | Hecha (commit de la fase 2, v246) |
| 3 — HUD | Pendiente |
| 4 — Riel y un ejercicio por pantalla | Pendiente |
| 5 — Tabla, editor y botón principal | Pendiente |
| 6 — Descanso en el HUD | Pendiente |
| 7 — Récord en vivo | Pendiente |
| 8 — Resumen al finalizar | Pendiente |
| 9 — QA y documentación | Pendiente |

Actualiza esta tabla (hash del commit) al cerrar cada fase.

## Modo de avance por tandas

Para agilizar, las fases se hacen en **3 tandas**: 1–3, 4–6 y 7–9.
- Dentro de una tanda, cada fase sigue siendo **un commit + push**, con su
  verificación completa, y pasas a la siguiente sin esperar.
- Al terminar la tanda, **te detienes** con un informe breve por fase (commit,
  versión de caché, qué cambió, resultado de la verificación) y la lista de
  capturas guardadas en `.playwright-mcp/` con el prefijo `hud-fN-`.
- Te detienes **antes** de terminar la tanda si: una verificación falla y no
  la puedes arreglar dentro del alcance, encuentras un bug fuera del alcance,
  o una decisión del plan es ambigua o choca con `CLAUDE.md`.
- Nunca inicies sesión en Supabase. No incluyas `.gitattributes`,
  `.graphifyignore` ni `graphify-out/` en los commits.

## Forma de trabajo (obligatoria)

- **Una fase = un commit + push**, y se avanza por tandas (ver arriba). Sin
  agentes en paralelo.
- Cada commit que toque JS/CSS/HTML sube `CACHE_NAME` en `sw.js`; todo archivo
  nuevo va en `PRECACHE_URLS`.
- Antes de cerrar cada fase: ESLint `no-undef` limpio (comando en `CLAUDE.md`)
  y verificación por la UI real con Playwright (375×812 y 1280×800, zona
  `America/Santiago`, contexto limpio, `supabase.co` bloqueado, respaldo
  COMPLETO importado desde Configuración), consola limpia. Guarda capturas de
  cada estado que cambiaste.
- Si encuentras un bug fuera del alcance de la fase, repórtalo y detente.
- Registra cada fase en `docs/CHANGELOG.md`.

## Lo que NO se toca

- La forma de los datos: `db.registrarSesion()` recibe exactamente lo mismo
  que hoy (`rutinaId, nombreRutina, duracionMin, completado, ejercicios[{ejercicioId?, nombre, series[{tipo, reps, peso, rpe, checked:true}]}], rpe, notas`).
  **No se crean tipos de evento nuevos.** Solo se guardan las series marcadas.
- HIIT (`hiit-timer.js`) y Descanso activo (`descanso-activo.js`): siguen
  igual. `session-summary-form.js` lo sigue usando HIIT; no lo borres.
- El buscador de ejercicios (`abrirBuscadorEjercicios`), la edición de
  sesiones del historial y la lógica de sugerencias/estancamiento/PR de `db.js`
  (solo cambia cómo se muestran).
- La sesión la usan GYM **y** Calistenia (`rutina-session.js`): verifica las dos.

## Archivos principales

`js/components/rutina-session.js` (render + listeners), `js/views/entrenamiento.js`
(`goToSession`, botón volver, popstate), `js/components/mk3-muscle-map.js`,
`js/core/audio.js`, `css/components.css`.

---

## Fase 0 — Bug: "Hoy toca → Empezar" no abre la sesión

**Hecha en 0e92260.** No repetir.

## Fase 1 — Borrador de sesión: no perder nada si se cierra la app

Hoy el estado de la sesión vive solo en el DOM: recargar, cerrar la app o que
Android la mate borra todo.

**Alcance:**
- Guarda un borrador en `localStorage` (clave `vanguard.sesionEnCurso`), en
  `try/catch`: `{ rutinaId, inicio (timestamp), ejercicios: [{ nombre, ejercicioId?, grupoId?, series: [{tipo, reps, peso, rpe, checked}] }], ejercicioActivo, actualizado }`.
  Se actualiza al marcar/desmarcar una serie, editar un valor, añadir serie o
  ejercicio. Es estado de UI de un solo dispositivo: **no** emite eventos ni se
  sincroniza (deja un comentario explicando por qué no va al log).
- El cronómetro parte de `inicio` del borrador, no de cuando se abrió la vista.
- Al entrar a Entreno con un borrador vigente (menos de 12 h): tarjeta
  "Tienes una sesión en curso · Torso A · 18 min" con **Retomar** y
  **Descartar** (ConfirmDialog). Retomar abre la sesión con todo restaurado.
  Un borrador de más de 12 h se ofrece igual pero diciendo la hora de inicio, y
  al retomarlo pregunta si guardar con la duración real o con 60 min.
- Se borra al guardar la sesión o al descartarla.
- El botón Atrás / volver ya no destruye la sesión: sale y el borrador queda.

**Verificación:** marca 3 series, recarga la página → aparece la tarjeta,
Retomar restaura series, valores y cronómetro. Descartar la elimina. Guardar
una sesión deja `localStorage` sin la clave y registra 1 sola sesión con la
forma de siempre. Con `localStorage` bloqueado la sesión funciona igual (sin
borrador, sin errores).

## Fase 2 — Estructura: pantalla completa, barra superior y orden de la rutina

**Alcance:**
- Mientras la sesión está abierta, en móvil se oculta la barra inferior
  (`#app-nav`) con una clase en `<html>` (p. ej. `entreno-sesion-activa`) que
  se quita en **todas** las salidas (volver, Atrás de Android, guardar,
  descartar, cambiar de vista). En tablet/PC el riel lateral se queda.
- Barra superior: botón ✕ (sale; si hay series marcadas pregunta "¿Salir? Tu
  sesión queda guardada como borrador" con opciones Salir / Descartar sesión),
  nombre de la rutina + categoría debajo, botón **Finalizar** a la derecha.
- Los ejercicios siguen **el orden de la rutina**. Se elimina la agrupación por
  grupo muscular (`agruparPorGrupoMuscular`) en esta vista; el grupo muscular
  pasa a ser un rótulo pequeño sobre el nombre ("Ejercicio 2 de 4 · Espalda").
  La lógica de superseries (`grupoId`) se mantiene.
- Se elimina el bloque grande "Fatiga en vivo" de arriba (vuelve en Fase 3
  dentro del HUD).

**Verificación:** en 375×812 no hay barra inferior durante la sesión y vuelve
al salir por cada camino. El orden coincide con el de la rutina. 1280×800
mantiene el riel.

## Fase 3 — HUD (panel de mando)

Tarjeta principal con chaflán (`.card-hero`) fija arriba bajo la barra superior.

**Alcance:**
- Mapa muscular **mini de frente y de espalda** (dos instancias de `MuscleMap`
  a ~32 px de ancho), con la fatiga en vivo que ya calcula la vista hoy
  (fatiga previa 48 h + series marcadas ahora).
- Datos (monoespaciada solo en números): **Tiempo**, **Series** hechas/total,
  **Volumen** en kg con la variación vs la última sesión de la **misma rutina**
  (▲/▼ %, oculto si no hay sesión previa) y **Récords** de la sesión
  (contador + el último, ej. "Banca 72,5").
- Barra segmentada debajo: un segmento por serie de la sesión, con un pequeño
  espacio entre ejercicios. Cian = hecha, ámbar = récord, borde cian = la que
  toca, vacío = pendiente.
- Todo se actualiza al marcar una serie, sin re-render completo.

**Verificación:** marcar/desmarcar series mueve contador, volumen, segmentos y
el mapa (incluida la vista de espalda con un ejercicio de espalda).

## Fase 4 — Riel de ejercicios y un ejercicio por pantalla

**Alcance:**
- Debajo del HUD, un riel de pestañas: nombre corto + progreso (`3/3`, `1/3`);
  la activa resaltada en cian, las terminadas con ✓. Si no caben, scroll
  horizontal.
- Superseries: los ejercicios con el mismo `grupoId` van unidos en un solo
  marco ámbar con etiqueta "SUPERSERIE A" (A, B, C… por orden).
- Se muestra **un ejercicio a la vez**. Se cambia tocando la pestaña,
  deslizando a izquierda/derecha (umbral horizontal claro, que no choque con
  el scroll vertical) o con los botones "‹ Anterior / Siguiente ›".
  Puntos de paginación sobre el botón principal.
- Implementación: deja **todos** los `.ejercicio-sesion-block` en el DOM y
  oculta los no activos, así Finalizar, el borrador y "Añadir ejercicio" siguen
  leyendo todo igual.
- Al completar la última serie de un ejercicio, pasa solo al siguiente (después
  del descanso o al instante si es superserie).
- "Añadir ejercicio" va al final del riel como pestaña "+".

**Verificación:** navegar por tap, swipe y botones; superseries agrupadas;
añadir un ejercicio en vivo crea su pestaña y lo deja activo.

## Fase 5 — Tabla de series, editor y botón principal

**Alcance:**
- Tabla por ejercicio con columnas `# · ANTERIOR · KG · REPS · RPE · ✓`.
  "Anterior" = la serie con el mismo índice de la última vez que hiciste ese
  ejercicio (`db.getUltimoRegistro`), en gris (ej. `57,5×10`); vacío si no
  hay. El chip del número mantiene los colores por tipo de serie y su popover.
- Fila hecha atenuada con ✓ verde; **fila que toca** con borde cian. Se puede
  tocar cualquier fila para volverla la que toca.
- **Editor** bajo la tabla para la fila que toca: KG con −/+ (paso 2,5 kg) y
  REPS con −/+ (paso 1), números grandes, y RPE en chips 6–10. Los cambios se
  escriben en los inputs de la fila (siguen siendo la fuente que leen
  Finalizar y el borrador). Peso 0 en Calistenia se muestra como "Corporal".
- Chips del ejercicio en una línea: PR, nivel de progresión y la sugerencia
  ("↑ Sube a 60 kg", al tocar aplica a las series sin marcar). El aviso de
  estancamiento pasa a ser un chip ámbar "Estancado 3 ses." que al tocarlo
  muestra el texto completo.
- Botón principal fijo abajo (zona del pulgar, chaflán, cian):
  "✓ Completar serie 2 · 60 kg × 10". En superserie: ámbar, "✓ Completar y
  pasar a Curl →". Sin series pendientes: "Siguiente ejercicio →"; en el último
  ejercicio: "Finalizar sesión".
- "+ Serie" queda bajo la tabla. ⓘ (técnica) y "Progreso" van en un menú ⋯
  junto al nombre. La calculadora de discos se abre al tocar el KG del editor
  manteniendo presionado o desde ⋯.

**Verificación:** completar series solo con el botón y el editor, sin tocar el
teclado; los valores guardados en la sesión final coinciden con lo editado.

## Fase 6 — Descanso dentro del HUD

**Alcance:**
- Al completar una serie (salvo entre ejercicios de una superserie, misma regla
  que hoy), el HUD cambia a modo descanso: anillo con cuenta regresiva y
  "de 1:30", "Siguiente: Remo · serie 3 · 60 kg × 10", botones −15 / +15 /
  Saltar, y una línea con tiempo, series y volumen en pequeño.
- El botón principal muestra "Descansando… 01:09" atenuado (se puede seguir
  editando la serie siguiente).
- Al terminar: `playBeep()` + `navigator.vibrate([200,100,200])` si existe, y el
  HUD vuelve a su modo normal.
- **Pantalla siempre encendida** durante la sesión con la Wake Lock API
  (`navigator.wakeLock.request('screen')`), re-solicitada en
  `visibilitychange` y liberada al salir. Si el navegador no la soporta, no pasa
  nada.
- Se elimina el temporizador flotante (`#floating-rest-timer`) y su limpieza en
  `cleanupSessionTimer` se adapta. La duración configurada (`getRestTimerSecs`)
  se mantiene; su ajuste pasa al menú ⋯ de la barra superior.
- El descanso en curso se guarda en el borrador (si recargas, sigue contando).

**Verificación:** con reloj simulado, la cuenta llega a 0, suena/vibra (verifica
la llamada) y vuelve al modo normal; −15/+15/Saltar funcionan; el descanso no se
dispara entre A1 y A2.

## Fase 7 — Récord en vivo

**Alcance:** reutilizando el chequeo de PR en vivo que ya existe: cuando una
serie marcada supera el récord, la fila se pinta en ámbar (chip ★ en vez de
✓), aparece debajo "NUEVO PR · 45 kg (antes 42,5)", el bloque Récords del
HUD se resalta un momento y su segmento queda ámbar. Al desmarcar, se revierte.

**Verificación:** con un PR previo de 42,5 kg, marcar 45 kg muestra todo lo
anterior; desmarcar lo quita.

## Fase 8 — Pantalla de resumen al finalizar

Reemplaza, **solo para GYM y Calistenia**, el modal `askSessionSummary`.

**Alcance:**
- Al tocar Finalizar (si no hay ninguna serie marcada, se mantiene el
  ConfirmDialog actual) se abre una vista de resumen dentro de la misma
  sub-vista, con su entrada de historial (Atrás vuelve a la sesión):
  - Barra superior "Sesión completada · Torso A · dom 4 oct".
  - Tarjeta principal: Duración, Volumen (▲/▼ % vs la última de la misma
    rutina), Series hechas/total y RPE promedio de las series.
  - Mapa muscular de frente y de espalda más grande + lista de récords de la
    sesión (ámbar).
  - Tabla "Por ejercicio": volumen y variación de cada uno.
  - Nota opcional y RPE de la sesión (chips 1–10, como hoy).
  - Botones: **Guardar sesión** (llama a `registrarSesion` con la misma forma de
    siempre, borra el borrador y vuelve a Entreno), "Volver a la sesión" y
    "Descartar" (ConfirmDialog).

**Verificación:** guardar desde el resumen crea un solo `sesion_registrada`
con los mismos campos que antes (compáralo con uno guardado antes del cambio);
Atrás vuelve a la sesión sin perder nada; HIIT sigue mostrando su modal.

## Fase 9 — QA final y documentación

- Recorrido completo en 375×812 y 1280×800 de GYM y Calistenia: empezar desde
  "Hoy toca" y desde la lista, superserie, récord, recarga a mitad (retomar),
  descartar, guardar. Consola limpia. Capturas de los 4 estados (sesión,
  descanso, récord, resumen).
- Revisa que no queden estilos con `border-radius` ni sombras en la vista
  nueva, ni colores fuera de los tokens, ni textos con voseo.
- Actualiza `docs/PLAN.md` y `docs/CHANGELOG.md`.
