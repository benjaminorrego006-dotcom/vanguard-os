# Rediseño de Semana (Tareas › Semana) — "Tablero de día"

Base: rama `worktree-dashboard-mk3`, commit ee2c234 (CACHE_NAME v258; el
plan original decía v257). Revisión visual con capturas y maquetas: artifact
"Semana · Revisión Vanguard".

## Estado

| Fase | Estado |
| --- | --- |
| F1 — Datos de la semana (sin UI) | Hecha (03dce16, v259) |
| F2 — Encabezado y franja de 7 días | Hecha (f12ab42, v260) |
| F3 — Detalle del día | Hecha (bd2605a, v261) |
| F4 — Input único + pendientes de días pasados | Hecha (9ed075e, v262) |
| F5 — Mover entre días + color | Hecha (45df35f, v263) |
| F6 — Lista y Hábitos | Hecha (c47db6c, v264) |
| Ajuste: "+" en el encabezado (sin FAB en Lista y Hábitos) | Hecho (3e17022, v265) |
| F7 — PC/tablet y QA | Hecha (0da0527, v266) |
| Ajuste final: filas de columnas en dos líneas (≥ 900 px) | Hecho (commit del ajuste final, v267) |

Actualiza esta tabla (hash del commit) al cerrar cada fase.

## Decisiones (4 oct 2026)
- Dirección **A · Tablero de día**: franja de 7 días arriba + detalle de un solo día abajo. Reemplaza las 7 tarjetas con input.
- Semana muestra **ítems del planificador + tareas de Lista con `dueDate`** en ese día. **Sin hábitos** (siguen viviendo en Hábitos y en la agenda de Hoy).
- Arreglos de Lista y Hábitos entran como **fase final** del mismo plan.
- **Sin migración de datos**: se mantienen los stores `planificador` y `tareas`. Semana lee ambos, como ya hace Hoy (dashboard.js, renderAgenda).
- Acento **violeta** (`--vi`, `--vib`, `--vis`) en vez de `--accent-plan` verde.

## Reglas que aplican (no negociables)
- Toda mutación pasa por las funciones de `db` existentes (`toggleTareaPlan`, `moverTareaPlan`, `crearTareaPlan`, `eliminarTareaPlan`, `updateTaskStatus`, `saveTask`), que ya emiten `logEvent`. No crear eventos nuevos salvo que una fase lo pida explícito.
- Fechas solo con `diaKeyDe()` / `utils/fecha.js`. Nunca `toISOString()` para claves de día.
- Modales con `.modal-overlay` + `open`. Capturar ids ANTES de cualquier `await ConfirmDialog(...)`.
- No tocar el parser de captura rápida (`utils/quickCapture.js`): solo usar `bindQuickCaptureForm`.
- Archivos nuevos a `PRECACHE_URLS`; subir `CACHE_NAME` en cada commit.
- Un commit por fase; parar al final de cada tanda de 3 fases o ante fallas/decisiones. QA Playwright de a una.
- Mantener el listener `budget-updated` con su guard y el chequeo de borrador antes de repintar.

## Fases

### F1 · Datos de la semana (sin UI)
- Nueva función en `views/planificador.js` (o helper propio): `armarSemana(lunes)` → 7 objetos `{ iso, items[], hechas, total, pendientesPasado }`.
- `items` mezcla:
  - planificador: `{ origen:'plan', id, texto, hecha }`
  - tareas con `dueDate === iso`: `{ origen:'tarea', id, texto:title, hecha: status==='done', priority, status }`
- Orden dentro del día: pendientes primero; entre pendientes, tareas de Lista por prioridad (high→low), luego ítems del planificador por `createdAt`; hechas al final.
- "Pendientes de días pasados" = ítems no hechos con fecha < hoy **dentro de la semana mostrada**, más tareas de Lista vencidas antes del lunes (igual criterio que "atrasadas" en Hoy). **Cambiado en F4 (decisión del usuario):** la tira usa exactamente el criterio de "atrasadas" de Hoy — todo lo no hecho con fecha < hoy de ambos stores, sin límite al lunes — con una función compartida (`js/utils/atrasadas.js`). Los cuadrados rojos de la franja siguen siendo por día de la semana mostrada.
- Verificación: en consola, con datos demo, los conteos coinciden con la vista actual + las tareas de Lista con fecha.

### F2 · Encabezado y franja de 7 días
- Quitar el segmentado Anterior/Esta/Siguiente. Encabezado: "Semana" + rango y `hechas/total` en mono + dos botones ‹ › (44 px de toque). Tocar el rango vuelve a esta semana cuando `offsetSemana !== 0`.
- Franja: grilla de 7 celdas (L M X J V S D), cada una con número de día (mono), barra de progreso de 3 px (`hechas/total`, `--vi` sobre `--vid`) y un cuadrado `--rd` de 5 px si el día pasado tiene pendientes.
- Hoy lleva la etiqueta "HOY" en vez de la letra. Celda seleccionada: fondo `--vis`, borde `--vi`.
- Selección por defecto: hoy si está en la semana mostrada; si no, el lunes. Guardar `diaSeleccionado` a nivel de módulo (como `offsetSemana`).
- `role="tablist"` / `aria-selected` en las celdas; etiqueta accesible "jueves 1 de octubre, 1 de 2 hechas, 1 pendiente".

### F3 · Detalle del día
- Bajo la franja: título "Domingo 4" + contador, y la lista de `items` del día.
- Fila: check (16 px, violeta al marcar) · texto · para `origen:'tarea'`: barras de prioridad (`renderPriorityBars` de tareas.js) y etiqueta de vencimiento si corresponde.
- Check en ítem del planificador → `toggleTareaPlan`. Check en tarea de Lista → `updateTaskStatus(id, 'done')` (o volver a `'todo'` si estaba hecha).
- Tocar el texto de una tarea de Lista abre su detalle (`openTaskForm`), como en Lista. Los ítems del planificador mantienen la ✕ de borrar.
- Día vacío: estado vacío corto ("Nada para este día").

### F4 · Input único + pendientes de días pasados
- Un solo form al final: input "Agregar…" + chip mono con el día seleccionado ("DOM 4") + botón +. Crea con `crearTareaPlan(diaSeleccionado, texto)`.
- Tira "N pendientes de días pasados" (borde `--rdb`) entre la franja y el detalle, solo si N > 0. Botón "Pasar a hoy": ítems del planificador → `moverTareaPlan(id, hoy)`; tareas de Lista → actualizar `dueDate` a hoy con la función de db que ya use el formulario de tarea (registrar el evento correspondiente). Tocar el texto de la tira despliega la lista de esos ítems.
- Solo aparece cuando la semana mostrada es la actual.

### F5 · Mover entre días + color
- Mantener presionado (500 ms) un ítem → modo "mover": la franja se resalta y tocar un día lo mueve (`moverTareaPlan` o cambio de `dueDate`). Alternativa accesible: botón "Mover" en un menú del ítem con los 7 días. Toast "Movida al jueves".
- Reemplazar todo uso de `--accent-plan` en Semana por los tokens violeta. Revisar que Hoy no dependa de ese color para otra cosa antes de tocar el token.

### F6 · Lista y Hábitos
- Lista: captura rápida al final del tablero en flujo normal (no sticky); quitar la dona (los tres contadores ya lo muestran); buscador como ícono en el encabezado que despliega el input. Verificar que no queda nada tapado por el nav ni por el FAB en 375×812.
- Hábitos: una sola racha visible arriba; "días perfectos" pasa a una línea secundaria bajo el anillo ("Mejor racha perfecta: 3 días"); dona, "en riesgo" y gráfico de 8 semanas a una sección plegada "Análisis" al final (cerrada por defecto); FAB sin superponerse a tarjetas.

### F7 · PC/tablet y QA
- ≥ 900 px: la franja se convierte en 7 columnas con el detalle de cada día debajo (scroll interno por columna), manteniendo el input único.
- QA Playwright (de a una): semana actual, anterior y siguiente; marcar/desmarcar de ambos orígenes; crear; mover; "Pasar a hoy"; sync remoto (`budget-updated`) con borrador escrito; back de Android con un modal abierto.

## Pendiente fuera de este plan
- Hábitos dentro de Semana (descartado por ahora).
- Arrastrar y soltar real con puntero (F5 usa mantener presionado + tocar día).
