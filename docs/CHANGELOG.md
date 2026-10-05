# Vanguard OS — Changelog

## 4 oct 2026 — Semana "Tablero de día" (`docs/REDISENO-SEMANA.md`)

Rediseño de Tareas › Semana por fases; el plan y su tabla de estado están en
`docs/REDISENO-SEMANA.md`. QA con Playwright de a una, zona
`America/Santiago`, reloj simulado, contextos limpios sin Supabase y el
respaldo demo COMPLETO importado por la UI.

| Fase | Caché | Qué cambia |
|---|---|---|
| F1 — Datos de la semana | v259 | Sin cambios de interfaz. `componerSemana(lunesIso, { plan, tareas, hoyIso })` (pura) y `armarSemana(lunes)` (lee los stores `planificador` y `tareas`, sin migrar nada) en `views/planificador.js`: 7 días `{ iso, items, hechas, total, pendientesPasado }`. Los ítems mezclan el planificador (`origen: 'plan'`) y las tareas de Lista con `dueDate` ese día (`origen: 'tarea'`, con `priority` y `status`). Orden: pendientes primero (Lista por prioridad alta → baja, después planificador por creación) y hechas al final. `pendientesPasado` cuenta lo sin hacer de los días anteriores a hoy; `semana.vencidasAntes` lista las tareas de Lista sin hacer vencidas antes del lunes (criterio de las "atrasadas" de Hoy). |

### F1 — QA

- Con el respaldo demo y el reloj en el mié 24 sept: en la semana actual, la anterior y la siguiente, los 7 días de `armarSemana` coinciden con los de la vista y, día por día, total, hechas y pendientes de días pasados = ítems del planificador de la vista + tareas de Lista con esa fecha (semana actual: 4 tareas de Lista con fecha; siguiente: 1 vencida antes del lunes). El orden respeta pendientes → Lista por prioridad → planificador → hechas. 375×812; consola limpia; ESLint `no-undef` limpio.

## 4 oct 2026 — Sesión activa "Cabina HUD" (`docs/REDISENO-SESION-HUD.md`)

**`CACHE_NAME` final: `vanguard-os-v258`.** Rediseño de la sesión activa de Entreno (GYM y Calistenia) por fases; el
plan y su tabla de estado están en `docs/REDISENO-SESION-HUD.md`. QA con
Playwright en 375×812 y 1280×800, zona `America/Santiago`, reloj simulado,
contextos limpios sin Supabase (`supabase.co` bloqueado) y el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI. Capturas en
`.playwright-mcp/hud-fN-*` (ignorada por Git).

| Fase | Caché | Qué cambia |
|---|---|---|
| 1 — Borrador | v243 | La sesión en curso se guarda en `localStorage` (`vanguard.sesionEnCurso`, `js/utils/sesion-borrador.js`) al empezar y con cada cambio (marcar, editar valores, tipo, RPE, sugerencia, + Serie, añadir ejercicio). No va al log ni a la sync: es estado de UI de un dispositivo y la sesión sigue naciendo con un solo `sesion_registrada`. El cronómetro parte del inicio guardado (antes se reiniciaba también al añadir un ejercicio). Tarjeta "Tienes una sesión en curso · Pull · 18 min" en Entreno con Retomar y Descartar; un borrador de más de 12 h muestra la hora de inicio y al guardar pregunta duración real o 60 min. Atrás y "Volver" ya no destruyen la sesión. Empezar otra con una en curso pide descartarla. Se borra al guardar o descartar. |
| 2 — Pantalla completa y orden | v246 | En móvil la barra inferior se oculta mientras la sesión está abierta (clase `entreno-sesion-activa` en `<html>`; se quita al volver, con Atrás, al guardar, al descartar y al cambiar de vista); el riel de tablet/PC se queda. Barra superior fija: ✕ (con series marcadas pregunta "¿Salir? Tu sesión queda guardada como borrador" · Salir / Descartar sesión / Cancelar), rutina + categoría y Finalizar. Los ejercicios van en el orden de la rutina con el rótulo "Ejercicio 2 de 7 · Espalda" (se quitó la agrupación por grupo muscular, que separaba las superseries); las superseries siguen igual. Sin el bloque "Fatiga en vivo" (vuelve en el HUD). La sesión se abre arriba. |
| 3 — HUD | v247 | Tarjeta principal con chaflán (`.card-hero`) fija bajo la barra superior (`.sesion-cabecera`): mapas mini de frente y de espalda (dos `MuscleMap` de 32 px, `.mk3-muscle-map--hud`, sin sombra) con la fatiga en vivo de antes (48 h previas + series marcadas); Tiempo, Series hechas/total, Volumen en kg con ▲/▼ % contra la última sesión de la misma rutina (oculto sin sesión previa o sin volumen) y Récords (contador + el último, comparados contra el récord que había al abrir la sesión); barra segmentada con una marca por serie (cian hecha, ámbar récord, borde cian la que toca, vacía pendiente; espacio entre ejercicios). Todo se actualiza al marcar, desmarcar o editar, sin repintar la sesión. El tiempo pasa del encabezado al HUD; "Descanso: 90 s" queda debajo. |
| 4 — Riel y un ejercicio por pantalla | v248 | Riel de pestañas bajo el HUD (dentro de la cabecera fija): nombre corto + progreso "2/3", la activa en cian, ✓ en las terminadas, scroll horizontal; los ejercicios consecutivos con el mismo `grupoId` van en un marco ámbar "SUPERSERIE A, B…"; al final "+" (añadir ejercicio con el mismo buscador, queda activo). Se ve un ejercicio a la vez (los demás bloques siguen en el DOM, ocultos): se cambia con la pestaña, con las flechas del teclado en el riel, deslizando (más de 60 px y el doble de horizontal que vertical) o con "‹ Anterior / Siguiente ›" y puntos de paginación. Al completar la última serie de un ejercicio pasa solo al siguiente: al instante dentro de una superserie, si no al terminar (o cerrar) el descanso. El borrador guarda el ejercicio activo y al retomar vuelve a él. |
| 5 — Tabla, editor y botón principal | v249 | Tabla por ejercicio `# · ANTERIOR · KG · REPS · RPE · ✓`: "Anterior" es la serie con el mismo índice de la última vez (`db.getUltimoRegistro`, "47,5×11"); el chip del número conserva el color y el popover del tipo de serie; la fila hecha se atenúa y la que toca lleva borde cian (tocar cualquier fila la vuelve la que toca; desmarcar una también). Editor bajo la tabla para la fila que toca: KG −/+ (2,5), REPS −/+ (1) con números grandes y RPE en chips 6–10; escribe en los inputs de la fila (siguen siendo lo que leen Finalizar, el borrador y el HUD); peso 0 en Calistenia se muestra "Corporal"; mantener presionado el KG abre la calculadora de discos. Chips en una línea: PR, nivel y sugerencia ("↑ Sube a 50 kg", aplica a las series sin marcar); el estancamiento es un chip ámbar "Estancado 3 ses." que muestra el texto. ⓘ Técnica, Progreso y Calculadora de discos pasan a un menú ⋯. Botón principal fijo abajo con chaflán: "✓ Completar serie 2 · 60 kg × 10"; en superserie, ámbar "✓ Completar y pasar a Curl →"; sin pendientes "Siguiente ejercicio →"; en el último, "Finalizar sesión". Tras el descanso de una superserie se vuelve al primero de la corrida con series pendientes. Helper `js/utils/numero.js` (es-CL) para los números nuevos. |
| 6 — Descanso en el HUD | v250 | Al completar una serie (salvo entre ejercicios de una superserie) el HUD pasa a modo descanso: anillo con la cuenta y "de 1:30", "Siguiente: Remo · serie 3 · 60 kg × 10", −15 / +15 / Saltar y una línea con tiempo, series y volumen. El botón principal queda atenuado ("Descansando… 01:09") y se puede seguir editando la serie siguiente. Al llegar a 0: `playBeep()` + `navigator.vibrate([200,100,200])` y vuelve el modo normal. La cuenta va contra una hora de término y queda en el borrador (al recargar sigue contando). Pantalla siempre encendida con la Wake Lock API (se vuelve a pedir en `visibilitychange` y se suelta al salir). Se eliminó el temporizador flotante; la duración del descanso se ajusta en el menú ⋯ de la barra superior. |
| Ajustes (tanda 2) | v251 | Volumen del HUD como avance contra la última sesión de la misma rutina ("880 de 7.078 kg"); el ▲ % solo al superarla, nunca ▼ a mitad de sesión; sin sesión previa, solo los kg. A ≥1024 px la sesión (HUD, riel, tabla, editor, pie) tiene 760 px como máximo, centrada. Números de la vista de sesión en es-CL con `formatNumero` (aviso de récord, panel Progreso y sus etiquetas del gráfico, calculadora de discos). El pie fijo queda pegado al borde (sin franja por la que se veía el contenido). En el plan, la pregunta de duración (>12 h) queda al guardar. |
| 7 — Récord en vivo | v252 | Con la misma regla del chequeo de récord que ya existía (supera el récord que había al abrir la sesión), cada serie marcada que es récord se pinta en ámbar con ★ en vez de ✓ y debajo "NUEVO PR · 45 kg (antes 42,5)"; el bloque Récords del HUD se resalta un momento y se anuncia al lector de pantalla; su segmento queda ámbar. En modo descanso (que oculta el bloque Récords) la línea del descanso suma "· 1 récord" y se resalta. Al desmarcar, o al bajar el peso hasta no superar el récord, todo se revierte. Reemplaza la insignia flotante "Nuevo PR" y el aviso emergente. |
| 8 — Resumen al finalizar | v253 | Solo GYM y Calistenia: Finalizar (con series marcadas) abre una vista de resumen dentro de la misma sub-vista, con su entrada de historial (Atrás vuelve a la sesión): barra "Sesión completada · Pull · mié 30 sept"; tarjeta con Duración, Volumen (▲/▼ % contra la última de la misma rutina), Series hechas/total y RPE promedio de las series; mapas de frente y espalda de 64 px con la fatiga de la sesión y la lista de récords (ámbar); tabla "Por ejercicio" con series, volumen y variación contra la última vez de cada uno; nota opcional y RPE de la sesión (1–10); Guardar sesión (`registrarSesion` con la misma forma de siempre, borra el borrador y vuelve a Entreno), "Volver a la sesión" y Descartar (ConfirmDialog). Sin series marcadas se mantiene el ConfirmDialog de siempre y se registra sin resumen. HIIT sigue con su modal (`session-summary-form.js`). |
| Ajuste (tanda 3) | v255 | HUD compacto bajo 1024 px: al bajar dentro de la sesión el HUD pasa a una línea de unos 48 px (tiempo · series · volumen · ★ récords y la barra segmentada) y arriba del todo vuelve a expandirse (histéresis: compacta pasados 160 px, expande en 4 px o menos); en descanso la línea muestra la cuenta regresiva y Saltar. El scroll se compensa al compactar (sin saltos; `overflow-anchor: none` en la sesión para que Chrome y Safari se comporten igual). A ≥1024 px el HUD queda siempre completo. Bajo 768 px se quitan "‹ Anterior / Siguiente ›" (quedan pestañas, deslizar y puntos). Peso 0 en un ejercicio de peso corporal (rutina o ejercicio de Calistenia, o equipo sin carga externa: ninguno, barra de dominadas, anillas) se muestra "Corporal" también en GYM: editor, tabla (etiqueta sobre el KG; al enfocarlo se edita el 0), botón principal y "Siguiente:" del descanso. Para que a 375×812 entren sin scroll la fila que toca, el editor y el botón principal: bajo 768 px la sesión también oculta el encabezado de la app (como ya hacía con la barra inferior) y se aprietan márgenes y filas (36 px). De paso: el editor ya no se sale de la tarjeta a 375 (columnas `minmax(0, 1fr)`) y el pie fijo queda pegado abajo al final del scroll (sin el relleno inferior de 120 px de la vista). |
| 9 — QA y documentación | v256 | Recorrido completo y auditoría de la vista: sin `border-radius` ni sombras (se quitaron los de las cajas del panel Progreso, sus botones Peso/1RM y la calculadora de discos, y la sombra del popover de tipo de serie); colores solo con tokens (el fondo de los tipos de serie con `color-mix` de tokens, `#000` → `var(--bg)`; los discos de la calculadora usan tokens nuevos `--disco-*` con los colores reales de las placas); sin voseo. Contra la maqueta `docs/mockups/sesion-hud-v2`: chaflán (`clip-path`) en el botón principal fijo y en "Guardar sesión" (la regla general de MK III se lo quitaba a todo botón que no fuera `.btn-primary`); en descanso, línea de ayuda bajo el HUD "Mientras descansas puedes ajustar la serie 2 o ver la técnica" (sin técnica o sin serie pendiente, solo la parte que aplica); el bloque Récords del HUD lleva marco ámbar mientras haya récord en la sesión y muestra "+1 ahora" unos 5 s después de un récord nuevo (luego vuelve el último). El subtítulo de la barra sigue siendo solo la categoría: no existe un dato de "semana N" del plan ni del generador. PLAN y CHANGELOG al día. |
| Cierre | v257 | Router (`navigate()` en `app.js`): cada navegación lleva un id y, si mientras carga su vista llega otra, la vieja no pinta encima al terminar tarde (antes Hoy → Entreno → Finanzas rápido podía dejar el hash en una vista y el contenido de otra; era la falla intermitente de la QA de la fase 8 a 1280). Volumen del HUD: si "X de Y kg" no cabe (375 px) queda "X kg" (se quitan "de Y" y, si hace falta, el ▲ %); se mide con el dato a la vista y otra vez al terminar el descanso o expandir el HUD. La línea de ayuda del descanso va debajo de la tabla del ejercicio activo (ya no entre el HUD y el riel) y, si al empezar el descanso el editor queda detrás del pie fijo, la vista baja lo justo. Series pendientes con "○" en vez del ✓ gris (la marcada sigue con ✓ verde y el récord con ★). Revisado: en `hud-f9-record-375` los 12 kg × 12 de Curl eran dato de la rutina de prueba ("QA Superserie": 12 kg × 12, 12 × 12, 12 × 10), no un error del editor; igual la QA ahora comprueba que KG y REPS del editor quedan cada uno en su campo. |
| Esperas sin tiempo fijo | v258 | Las dos esperas de 500 ms que quedaban se reemplazan por el mismo enfoque del resumen: `esperarSalidaDeModal(modalId)` (nuevo en `js/core/history.js`) espera el `popstate` real con que history.js suelta la entrada de un modal recién cerrado, y no espera nada si esa entrada ya no es la actual. Lo usan eliminar y "¿Descartar los cambios?" en el historial de sesiones (`sesiones-historial.js`, antes `esperarRetrocesoDe`) y "Ya tienes una sesión en curso" al empezar otra (`goToSession` en `entrenamiento.js`). Con la espera fija, en un equipo lento el siguiente movimiento del historial podía adelantarse y dejar una entrada colgando. |

### Esperas sin tiempo fijo — QA

- Con la CPU frenada ×4 (CDP `Emulation.setCPUThrottlingRate`), de a una, 5 de 5 a 375 y 5 de 5 a 1280: eliminar desde el historial (una sesión menos, sin entradas de modal colgando) y Atrás → principal de Entreno sin reabrir el detalle; editar con cambios → Cancelar → Descartar vuelve al detalle con su entrada, Atrás cierra el detalle y otro Atrás vuelve a la principal; con un borrador, empezar otra rutina → "Ya tienes una sesión en curso" → Descartar y empezar abre la nueva con la entrada de la sub-vista y Atrás vuelve a la principal (no a la confirmación); Retomar desde la tarjeta y Atrás.
- Regresiones de sesiones e historial (editar, eliminar/deshacer de la fase 4, borrador, pantalla completa, resumen, "Hoy toca") a 375 y 1280 sin fallas. ESLint `no-undef` limpio; consola limpia.

### Cierre — QA

- Router: Hoy → Entreno → Finanzas con 120 ms entre toques, 5 de 5 a 1280 y a 375: termina en `#finanzas` con la vista de Finanzas, su scope y su pestaña activa, sin restos de Entreno ni de Hoy. QA de la fase 8 a 1280, 10 de 10 (de a una).
- 375: pendientes "○○○", tras marcar "✓○…"; editor +2,5 kg y +1 rep → "0×10 → 2.5×10 → 2.5×11"; en descanso la ayuda queda bajo la tabla y el editor sobre el pie (borde inferior 728 ≤ 732); volumen "1.140 kg" sin cortarse con récord. Capturas `hud-fin-sesion-375`, `hud-fin-descanso-375`, `hud-fin-record-375`.
- Regresión: las 17 QA anteriores a 1280 y las de las fases 4–9 a 375, de a una, sin fallas. Las QA de las fases 3 y 7 se pusieron al día con lo de la fase 9 (justo después de un récord esperan "+1 ahora" y, pasados 6 s, el nombre) y la de la fase 7 espera "○" al desmarcar. ESLint `no-undef` limpio; consola limpia.

### Fase 9 — QA final

Recorrido en 375×812 y 1280×800 (respaldo COMPLETO + rutina de superserie y un récord previo de prueba, locales):
- GYM desde "Hoy toca": sesión (botón principal con chaflán), descanso al completar una serie con la línea de ayuda "Mientras descansas puedes ajustar la serie 2 o ver la técnica" (sin descanso no aparece), recarga a mitad → tarjeta → Retomar con la serie hecha, ✕ → Descartar sesión (sin borrador ni sesión guardada).
- GYM desde la lista ("QA Superserie"): superserie agrupada en el riel, A1 → A2 sin descanso, récord en vivo en Curl (45 > 42,5) con el bloque Récords enmarcado en ámbar y "+1 ahora"; pasados 6 s vuelve "· Curl de Bíceps 45" y el marco sigue; resumen ("Guardar sesión" con chaflán) y guardar (1 sesión, sin borrador).
- Calistenia desde la lista: "Corporal" en el botón, resumen y guardar; al terminar vuelve la barra de navegación.
- Capturas de los 4 estados: `hud-f9-sesion-*`, `hud-f9-descanso-*`, `hud-f9-record-*`, `hud-f9-resumen-*`.
- Auditoría de estilos computados en la vista (incluye el panel Progreso, la calculadora y la ficha de técnica): ningún `border-radius` ni sombra. Sin colores literales en la vista (salvo el buscador de ejercicios, que el plan deja fuera de alcance) y sin voseo.
- ESLint `no-undef` limpio; consola limpia.

### Notas

- El buscador de ejercicios (`abrirBuscadorEjercicios`) conserva sus estilos (radios y colores propios): el plan lo deja fuera de alcance.
- HIIT, Descanso activo, `session-summary-form.js` (lo sigue usando HIIT) y la edición de sesiones del historial no cambian; `registrarSesion` recibe la misma forma de siempre y no hay tipos de evento nuevos.

### Fase 8 — QA

- "Pull" con 60 kg × 10 (récord, RPE 8), 45 kg × 10 (RPE 9) y Jalón 50 kg × 10: Finalizar abre el resumen con "Sesión completada · Pull · mié 30 sept", "1.550 kg ▼ 78 %" (contra 7.077,5), "3/21", RPE promedio "8,5", mapas de 64 px, "★ Remo Invertido con Pies Elevados · 60 kg (antes 47,5)" y por ejercicio "1.050 kg ▼ 31 %" y "500 kg ▼ 67 %".
- Atrás y "Volver a la sesión" vuelven a la sesión con todo igual y sin guardar.
- Guardar con nota "Buena sesión" y RPE 7: un solo `sesion_registrada` con los mismos campos que una sesión guardada antes del cambio (las del respaldo; ahora con `checked: true` en cada serie, como desde la fase de nivel), nota, RPE y las series marcadas; borra el borrador y vuelve a Entreno sin entradas de historial colgando.
- Descartar pide confirmación y no guarda; sin series marcadas sale "Terminar sesión vacía" como siempre. Calistenia también abre el resumen. HIIT sigue mostrando su modal.
- 375 y 1280; regresión de fases 1–7 y QA anteriores sin fallas (guardan desde el resumen). ESLint `no-undef` limpio; consola limpia.
- Ajuste (v255): QA propia a 375 (HUD compacto 50 px, descanso compacto con Saltar, sin saltos Δ 0 px, sin Anterior/Siguiente, "Corporal" en editor/tabla/botón/descanso, 0 en ejercicios con carga, fila + editor + botón sin scroll) y a 1280 (HUD siempre completo, Anterior/Siguiente presentes); QA de fases 4–8 a 375 sin fallas (la de la fase 4 ahora comprueba que bajo 768 px no están los botones). Capturas `hud-aj2-expandido-375`, `hud-aj2-compacto-375` y `hud-aj2-descanso-375`. ESLint `no-undef` limpio; consola limpia.
- Arreglo (v254): Guardar y Descartar desde el resumen ya no esperan 500 ms fijos para soltar la entrada del resumen; esperan el `popstate` real de ese retroceso (y el de la confirmación, al descartar) antes de que `goToMain`/salir haga el suyo. Con la espera fija, en una máquina cargada los dos retrocesos se pisaban (2 fallas en 3 corridas a 1280). Tras el arreglo: 10/10 a 375 y 9/10 a 1280; la falla restante deja el hash en `#entrenamiento` con otra vista pintada, compatible con una carrera de render del router (`navigate()` sin guarda contra un render tardío), fuera de este alcance.

### Fase 7 — QA

- Respaldo de prueba local con una sesión previa de Curl de Bíceps a 42,5 × 10 (chip "PR 42,5 kg"). Marcar 45 kg: fila ámbar con ★, "NUEVO PR · 45 kg (antes 42,5)", HUD "Récords 1 · Curl de Bíceps 45" resaltado un momento, segmento ámbar, anuncio "Nuevo récord: 45 kg en Curl de Bíceps"; en el modo descanso que arranca, la línea "… · 540 kg · 1 récord" también se resalta.
- 40 kg en otra serie queda normal (✓ verde); bajar la serie récord a 42,5 la vuelve normal y quita la nota; volver a 45 la marca otra vez; desmarcar quita fila ámbar, nota, contador y segmento.
- Recargar y retomar con el récord marcado: sigue pintado, sin volver a resaltar.
- 375 y 1280; regresión de fases 1–6, ajustes y QA anteriores sin fallas. ESLint `no-undef` limpio; consola limpia.

### Fase 6 — QA

- "Pull": se pide el Wake Lock al abrir; sin temporizador flotante. Completar la serie 1 con el botón: el HUD muestra 01:30 "de 1:30", "Siguiente: Remo Invertido con Pies Elevados · serie 2 · 0 kg × 10" y "Tiempo · Series 1/21 · 0 kg"; el botón dice "Descansando… 01:30" atenuado y no hace nada; editar la serie 2 durante el descanso actualiza "Siguiente" (2,5 kg).
- +15 → 01:45 de 1:45; −15 → 01:29; 30 s de reloj simulado → 00:59. Recargar y retomar: sigue contando (00:57 de 1:45).
- Al llegar a 0 (reloj simulado): un `playBeep()` y `navigator.vibrate([200,100,200])` (espías), el HUD y el botón vuelven a la normalidad ("✓ Completar serie 2 · 2,5 kg × 10"). Saltar vuelve sin sonar.
- Menú ⋯ de la barra: + sube el descanso a 105 s (y el siguiente es "de 1:45"); Escape lo cierra sin salir. Al volver a la app (`visibilitychange`) se vuelve a pedir el Wake Lock; al salir con ✕ se suelta.
- "QA Superserie": sin descanso entre A1 y A2; tras A2 hay descanso y lo siguiente es "Press de Banca · serie 2".
- 375 y 1280; regresión de fases 1–5 y QA anteriores sin fallas (la de la fase 5 salta el descanso donde corresponde). ESLint `no-undef` limpio; consola limpia.

### Fase 5 — QA

- "Pull", Remo Invertido: columnas `# · ANTERIOR · KG · REPS · RPE · ✓` y "Anterior" igual a la última Pull ("47,5×11 | 47,5×10 | 47,5×11"); chips "PR 47,5 kg · 1RM ~65 kg", nivel y "↑ Sube a 50 kg" (aplicarlo pone 50 kg en las series sin marcar).
- Solo con el editor y el botón (sin teclado): +2,5 ×3 y −2,5 → 55 kg, +1 rep → 11, RPE 8; el botón dice "✓ Completar serie 1 · 55 kg × 11" y completa; tocar la fila 3 la vuelve la que toca; "Siguiente ejercicio →" al terminar; en el último ejercicio "Finalizar sesión" guarda. La sesión guardada tiene 55 kg × 11 con RPE 8 y la serie 3 con 9 reps, con la misma forma de siempre.
- Menú ⋯ con Técnica, Progreso y Calculadora de discos; Escape lo cierra sin salir de la sesión; la calculadora se abre desde ⋯ y manteniendo presionado el KG.
- Calistenia ("Pecho — Primeros Pasos"): "Corporal" en el editor y "✓ Completar serie 1 · Corporal × 15".
- "QA Superserie": botón ámbar "✓ Completar y pasar a Curl de Bíceps →"; completar pasa a Curl ("serie 1 · 12 kg × 12"); completar Curl arranca el descanso y al terminar vuelve a Press de Banca.
- 375 y 1280 sin scroll horizontal; regresión de fases 1–4 y QA anteriores sin fallas. ESLint `no-undef` limpio; consola limpia.

### Fase 4 — QA

- "Pull": 7 pestañas + "+", se ve solo el 1.º ejercicio con su pestaña activa ("0/3"); tocar una pestaña, "Siguiente ›", "‹ Anterior", deslizar a izquierda y derecha y la flecha derecha en el riel cambian de ejercicio; un gesto más vertical que horizontal no; "Anterior" deshabilitado en el primero.
- Completar el 1.º: la pestaña pasa a "✓ 3/3", sigue en ese ejercicio mientras corre el descanso y al terminar (reloj simulado, 91 s) pasa solo al 2.º; cerrar el descanso antes de tiempo también avanza.
- Recargar y retomar vuelve al 3.º ejercicio con el progreso del riel; añadir "Face Pull" con "+" crea la 8.ª pestaña y la deja activa.
- "QA Superserie": un marco "SUPERSERIE A" con Press de Banca y Curl de Bíceps; marcar series de A1 no arranca descanso; terminar A1 pasa al instante a A2; terminar A2 arranca el descanso y al terminar pasa a Remo con Barra.
- 375 y 1280, sin scroll horizontal de la página; regresión de fases 1–3 y QA anteriores sin fallas (las que tocaban otros ejercicios ahora los activan por su pestaña). ESLint `no-undef` limpio; consola limpia.

### Fase 3 — QA

- "Pull" (última del respaldo: 7.077,5 kg): al abrir, 0/21 series, 0 kg sin variación, 0 récords, 21 segmentos con el primero como "la que toca" y mapas de frente y espalda de 32 px; el tiempo avanza.
- Marcar 40 kg × 10: 1/21, 400 kg, "▼ 94 %", segmento hecho y el siguiente pasa a ser el que toca; el bloque es el mismo nodo (sin re-render).
- 60 kg × 8 en Remo Invertido (récord previo 47,5): "Récords 1 · Remo Invertido con Pies Elevados 60", segmento ámbar, 880 kg. Al desmarcarlo se va del contador y del segmento.
- Dos series de Jalón: el mapa de espalda pasa de 0 a 7,3 de intensidad total (el de frente sigue en 0); desmarcar todo vuelve contador, volumen, segmentos y mapa al inicio.
- Editar el peso de una serie marcada actualiza el volumen; con scroll el HUD queda fijo bajo la barra; sin scroll horizontal; al recargar y retomar el HUD muestra lo marcado.
- 375 y 1280; regresión de fases 1–2 y QA anteriores sin fallas. ESLint `no-undef` limpio; consola limpia.

### Fase 2 — QA

- 375: sin barra inferior durante la sesión (también al retomar) y la barra superior queda fija al hacer scroll; la barra inferior vuelve al salir con ✕ sin series, con Atrás, con ✕ → Salir (el borrador queda y aparece la tarjeta), con ✕ → Descartar sesión (borra el borrador), al cambiar de vista y al guardar con Finalizar. Atrás sobre la pregunta "¿Salir?" sigue en la sesión.
- 1280: el riel se queda durante la sesión.
- "Pull": el orden en pantalla es el de la rutina y los rótulos van de "Ejercicio 1 de 7 · Espalda" a "Ejercicio 7 de 7"; sin "Fatiga en vivo".
- Superserie (rutina de prueba "QA Superserie": Press de Banca + Curl de Bíceps con el mismo `grupoId`, después Remo con Barra): quedan juntas y en orden, Curl con su chip "SUPERSERIE" (antes Curl caía en la sección "Brazos", después de Remo).
- Regresión: QA de borrador, Hoy toca, buscador, catálogo, ejercicio libre, reps por tiempo y nombres viejos sin fallas (las que salían con "Volver" ahora usan ✕). ESLint `no-undef` limpio; consola limpia.

### Fase 1 — QA

- GYM: 3 series marcadas, peso y reps editados, RPE y una serie agregada; tras recargar aparece la tarjeta ("Pull · 0 min · 3 series marcadas"); Retomar restaura todo (mismo estado por ejercicio) y el cronómetro sigue (6 s → 9 s); Atrás y "Volver" dejan el borrador; guardar borra la clave y registra una sola sesión (32 → 33) con las mismas claves que las del respaldo, solo las 3 series marcadas y los valores editados.
- Descartar pide confirmación, quita la tarjeta y la clave, y no registra nada.
- Calistenia (plantilla "Pecho — Primeros Pasos"): tarjeta tras recargar y Retomar restaura todo.
- Borrador de 13 h (reloj adelantado): la tarjeta dice "desde el mié 30 sept, 15:00"; Finalizar pregunta "Usar 60 min" / "Usar la duración real · 13 h 29 min" / Cancelar; Atrás cierra la pregunta sin guardar; se guarda con la duración elegida (60 a 375, real a 1280) y se borra el borrador.
- `localStorage` sin poder escribir (`QuotaExceededError`) o con la clave del borrador bloqueada (`SecurityError`): la sesión funciona igual, sin tarjeta y sin errores.
- ESLint `no-undef` limpio; consola limpia salvo 5 avisos anteriores a esta fase (ver abajo).

### Fase 1 — detectado, sin corregir

- **Reps de tiempo en un campo numérico:** las plantillas de Calistenia traen reps como "30s" o "20s/lado"; el campo de reps de la sesión es `type="number"`, así que el navegador avisa ("cannot be parsed") y el campo queda vacío: esas series se guardan (y quedan en el borrador) sin reps. Pasa igual antes de esta fase. **Corregido (v245):** el campo de reps de la sesión es texto con teclado numérico, así "30s" y "20s/lado" se ven, quedan en el borrador y se guardan tal cual; el detalle del historial las muestra sin "reps" y su editor las acepta (número o segundos, ej. "30s"; antes "30s" no pasaba la validación y se habría guardado como "NaN"). Verificado en 375 y 1280 con la plantilla "Pecho — Primeros Pasos": consola sin avisos.
- **Con `localStorage` bloqueado del todo la app no arranca** (promesa rechazada sin manejar al iniciar), también antes de esta fase. **Corregido (v244):** `isPinEnabled` (el candado del primer render), la migración inicial, la moneda (`currency.js`, que usa todo monto) y la preferencia de voz de HIIT (`audio.js`, `hiit-timer.js`) leen `localStorage` en try/catch con su valor por defecto (sin PIN, CLP, voz activada). Verificado con `localStorage` bloqueado del todo en 375 y 1280: Hoy, Tareas, Hábitos, Finanzas, Laboratorio, Configuración y Entreno cargan, una sesión de GYM se guarda y HIIT abre, con la consola limpia.

## 4 oct 2026 — Hoy toca, racha del primer render y nombres de ejercicios

**`CACHE_NAME` final: `vanguard-os-v242`.** Cuatro arreglos de lo detectado
en la QA de editar/eliminar sesiones, cada uno con su commit y su bump de
caché. QA con Playwright en 375×812 y 1280×800, zona `America/Santiago`,
reloj simulado, contextos limpios sin Supabase (`supabase.co` bloqueado) y
el respaldo `vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI
(para el punto 3, un respaldo de prueba local derivado de ese, con sesiones
de id `null` y nombres viejos).

| Commit | Caché | Qué cambia |
|---|---|---|
| `0e92260` | v239 | **"Hoy toca → Empezar" en la principal de Entreno abre la sesión visible.** `mostrarSubVista()` es el único lugar que muestra la sub-vista (con su entrada de historial) y oculta la principal; lo usan todas las sub-vistas. `goToSession` no lo hacía y pintaba la sesión en la vista oculta. "Volver" desde una sesión iniciada en la principal vuelve a la principal. La tarjeta "Hoy toca" de Hoy no inicia la sesión ("Ir a entrenar" lleva a la principal de Entreno) y no cambia. |
| `b98724a` | v240 | **La racha de Hoy se lee después de procesar los recurrentes.** `getRachaGlobal` espera a `getBudget` (que genera los cobros vencidos); el resto de las lecturas sigue en paralelo. |
| `d833526` | v241 | **Nombres antiguos → id del catálogo, al leer.** `idCatalogoPorNombre` (nombre del catálogo o su clave, sin distinguir mayúsculas, tildes ni espacios), `idDeEntradaEjercicio` y `metadataDeEjercicio` en `ejercicios-catalogo.js`, compartidas por Récords, Estándares de Fuerza y nivel por rama, historial (`matchEjercicio`), `getProgressionLevel`, sugerencias de nivel y el agrupado y mapa muscular de la sesión en vivo. `getPRs` agrupa por ese id y pone el mismo objeto bajo todas sus claves (incluido el nombre del catálogo); Récords deduplica. Al guardar y en la migración perezosa se sigue usando `getIdPorNombreExacto`: ninguna sesión se reescribe. |
| este commit | v242 | **"Añadir de todas formas" guarda lo escrito**, sin espacios de más y sin pasarlo a minúsculas. |

### QA

- **Hoy toca:** Empezar desde la principal de Entreno abre la sesión visible; Atrás y "Volver" regresan a la principal sin dejar la sesión oculta en el DOM ni una entrada de historial colgando; terminarla la registra una sola vez (32 → 33). Desde Hoy: con el aviso de respaldo pospuesto, "Ir a entrenar" lleva a Entreno, Empezar abre la sesión visible, Atrás vuelve a Entreno y otro Atrás a Hoy.
- **Racha (lunes 28 sept, con un recurrente que vence ese día):** el primer render de Hoy muestra 87 sin pasar por 86 (el chip se registra desde la carga) y lee `events` una vez; la versión anterior mostraba 86 y leía dos veces. Tres recargas no vuelven a procesar el recurrente (1 transacción, 1 `recurrente_procesado`, 1 `movimiento_registrado`).
- **Nombres antiguos:** con sesiones de id `null` ("Peso Muerto" 180 × 5, "Flexiones", "Plancha", los 19 nombres viejos y "Remo inventado QA") más "Peso Muerto Convencional" 170 × 5 con id:
  - Récords: una sola tarjeta "Peso Muerto Convencional 180kg × 5", ningún nombre viejo suelto y sin duplicados; el inventado sigue aparte.
  - Estándares de Fuerza: 1RM de 210 kg, que sale del récord de 180 guardado con el nombre viejo (la versión anterior usaba el de 170: 198 kg).
  - Árbol (rama Cadera): el nivel cuenta ese récord.
  - Pista de nivel en la sesión en vivo: Peso Muerto, Flexiones, Plancha, Press Militar y Pistol Squat la muestran (antes ninguno); el inventado no la tiene. Los 12 de los 19 que están en el árbol la resuelven; los otros 7 no tienen nodo.
  - Agrupado muscular: cada nombre viejo cae en su grupo y no en "Otros".
  - Las sesiones guardadas quedan intactas (ids `null`) y el replay desde `events` da las mismas sesiones que el store.
- **Ejercicio libre:** "  Remo en   TRX " queda como "Remo en TRX" en el botón, la sesión, lo guardado (id `null`), el detalle del historial y Récords.
- Regresión: QA de edición, buscador, catálogo y fase 4 sin fallas. ESLint `no-undef` limpio; consola sin errores.

## 27 sept – 4 oct 2026 — Editar y eliminar sesiones de Entreno

**`CACHE_NAME` final: `vanguard-os-v238`.** Desde el historial de sesiones
se puede ver el detalle de cada sesión, eliminarla (con Deshacer) y
editarla. Todo lo derivado (racha, actividad por día, últimos pesos, metas
por sesiones, Laboratorio > Semana) sale de las sesiones vigentes según el
log, que se calculan con `sesion_registrada`, `sesion_editada`,
`sesion_eliminada` y `sesion_restaurada`. QA con Playwright en 375×812 y
1280×800, zona `America/Santiago`, reloj simulado, contextos limpios sin
Supabase (`supabase.co` bloqueado) y el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI.

### Decisiones

1. Eliminar: botón en el detalle → "¿Eliminar la sesión del lunes 21 sept?" → aviso "Sesión eliminada · Deshacer" durante 6 s (se pausa mientras tiene el foco). Deshacer emite `sesion_restaurada`; el evento de eliminación nunca se borra.
2. En replay y sync, una eliminación gana aunque llegue antes que la creación (lápida por id). Los eventos de una sesión se ordenan por `ts` y, si empatan, por id del evento: dos dispositivos quedan idénticos con cualquier orden de llegada.
3. Editar: fecha (no futura), duración, notas y series (peso, reps, tipo, marcada; agregar y quitar series y ejercicios). `sesion_editada` lleva la sesión completa y el replay deja la última versión.
4. Las insignias ya ganadas no se pierden (se calculan sobre la actividad histórica); la racha sí se recalcula y puede bajar.
5. Historial en la vista principal de Entreno: últimas 8 semanas con sesiones y "Cargar más".
6. Editar una sesión de una semana ya revisada recalcula su resumen, pero no vuelve a mostrar la tarjeta "Tu semana".

### Fases

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| 1 | `1f249f7` | v233 | Motor: `sesiones-estado.js` (estado neto por sesión desde el log, compartido por `db.js` y el replay de `sync.js`), `db.editarSesion` / `eliminarSesion` / `restaurarSesion`. Racha global, racha de Entreno, actividad por día y últimos pesos usan las sesiones vigentes (lectura compartida de `events`, memoizada). |
| Paso previo | `63f7d06` | v234 | El día de hoy entra en la clave de la caché memoizada: a medianoche ningún evento la invalida y un render dentro del TTL mostraba el día anterior. |
| 2 | `34a61bb` | v235 | Historial por semana con "Cargar más", detalle en modal (sin tapar la barra ni el riel), Eliminar con confirmación y `ToastAccion` (aviso reutilizable con acción). |
| 3 | `be9b5e0` | v236 | Editar en el mismo modal: validaciones (fecha futura, sin ejercicios, ejercicio sin series, números negativos o ilegibles), Cancelar/Atrás/Escape vuelven al detalle con "¿Descartar los cambios?" si hubo cambios, aviso "Sesión actualizada" y la sesión pasa a su semana nueva. El buscador de ejercicios de la sesión en vivo se exporta (`abrirBuscadorEjercicios`) y se usa tal cual. |
| — | `37183bf` | v237 | El buscador de ejercicios es un `.modal-overlay` con id: deja libre la barra inferior y el riel, y Atrás o Escape cierran solo el buscador (sesión en vivo y edición). |
| — | `4239524` | v238 | El buscador muestra el nombre real del catálogo y la sesión en vivo guarda `ejercicioId` + nombre del catálogo; "Añadir de todas formas" guarda id `null`. |
| 4 | este commit | v238 | QA final y documentación. |

### QA final (fase 4)

Con el reloj en el lunes 28 sept 2026, 14:00:
- Hoy muestra "Tu semana · 21 – 27 sept"; "Después" la oculta.
- Eliminar el viernes 25 sept: confirmación con ese texto, aviso "Sesión eliminada · Deshacer" que se va solo a los ~6 s, la sesión sale del historial. La meta "36 entrenamientos" pasa de 32 a 31; Laboratorio > Semana 21–27 pasa de 3 a 2 sesiones (168 → 119 min); las insignias quedan iguales (ganadas: 7 días de racha, Mes de presupuesto sin excederte y 10 sesiones de entrenamiento); la tarjeta "Tu semana" no vuelve.
- Eliminar el miércoles 23 y tocar "Deshacer": vuelve al historial y la meta vuelve a 31.
- Editar el lunes 21 al 14 sept: "Sesión actualizada"; Semana 21–27 queda con 1 sesión y 14–20 con 4 (de 3 objetivo); la meta no cambia; la tarjeta no reaparece; insignias iguales.
- Tras recargar: la eliminada sigue fuera, la restaurada sigue y la editada está en su semana nueva.
- La racha global queda en 87 días en todo el recorrido: los días tocados tienen otra actividad (hábitos, tareas, Finanzas).
- Edición (375 y 1280): foco inicial en Fecha y de vuelta en Editar al salir; sin scroll horizontal con el formulario lleno; "Atrás" sobre la confirmación sigue editando; la edición persiste tras recargar y deja un `sesion_editada`.
- Buscador: barra y riel visibles en la sesión en vivo y en la edición; Atrás y Escape lo cierran sin salir de la sesión ni del formulario, y elegir no deja una entrada de historial colgando.
- Catálogo: "Peso Muerto Convencional" agregado en una sesión en vivo queda con `ejercicioId: "peso muerto"`; Récords lo muestra (200 kg × 5) y la rama Cadera del Árbol sube de nivel (desbloquea Puente de Glúteo a una Pierna, Buenos Días y Peso Muerto con Piernas Rígidas). Un ejercicio libre queda con id `null` y aparece en Récords por su nombre.
- Motor: el estado neto de una sesión da un solo resultado con cualquier orden de llegada (6, 24 y 720 órdenes probados) y una eliminación que llega antes que la creación gana.
- ESLint `no-undef` limpio; consola sin errores.

### Diagnóstico: ejercicios guardados sin id

El buscador anterior armaba el nombre desde la clave del catálogo. De 182
ejercicios, 97 se mostraban distinto, pero 78 solo cambiaban mayúsculas (la
búsqueda exacta por nombre las ignora y les encuentra el id). Los otros 19
(ej. "Peso Muerto" por "Peso Muerto Convencional", "Flexiones" por
"Flexiones (Push-up)", "Plancha" por "Plancha (Plank)") se guardaban con id
`null`. El respaldo COMPLETO no tiene ninguna entrada sin id (224 de 224 con
id válido), así que no se migró nada. En datos reales con esos 19 nombres:
- Récords los cuenta aparte (por nombre, no por id) y el nivel por Estándares de Fuerza no los encuentra (busca el récord por el nombre del catálogo).
- `getProgressionLevel` (pista de progresión en la sesión en vivo) no reconoce 12 de ellos.
- Sugerencias de nivel y mapa muscular sí los reconocen (búsqueda aproximada por la clave del catálogo).

Propuesta original: indexar también las claves del catálogo en
`getIdPorNombreExacto` (una clave es el nombre viejo en minúsculas, y como es
el id no hay riesgo de falso positivo) y que la migración perezosa vuelva a
intentar las entradas `null` cuyo nombre coincide con una clave. Se implementó
el 4 oct de otra forma, solo al leer (`idCatalogoPorNombre`), sin migrar ni
reescribir sesiones.

### Detectado en la QA (corregido el 4 oct, ver la entrada de arriba)

- **Hoy pinta la racha de antes en el primer render del día con un recurrente vencido** (la "racha 87 vs 86"). `dashboard.js` pide `getRachaGlobal()` en el mismo `Promise.all` que `getDashboardStats()` → `getBudget()` → `processRecurringTransactions()`, que genera el gasto recurrente de hoy (cuenta como actividad). La racha se lee antes de esa escritura y Hoy muestra 86 hasta el siguiente render (87). No es la caché: `63f7d06` arregló otro caso (medianoche). Propuesta: procesar los recurrentes antes de leer los agregados de Hoy.
- **"Hoy toca → Empezar" en la vista principal de Entreno no muestra la sesión**: `goToSession` pinta la sesión en `#entrenamiento-sub-view` sin hacerlo visible (desde la lista de rutinas funciona porque la sub-vista ya está abierta).
- **"Añadir de todas formas" guarda el nombre en minúsculas** (el buscador pasa el texto ya normalizado): "Remo con toalla" queda "remo con toalla".

## 27 sept 2026 — Code review: hallazgos #6–#10

| # | Commit | Caché | Qué cambia |
|---|---|---|---|
| 6 | `6959ee6` | v229 | Editar una meta conserva el monto inicial y, si cambia, recalcula el progreso sin tocar los aportes. |
| 7 | `e28f244` | v230 | Laboratorio > Finanzas > Hitos reutiliza el presupuesto de cada mes (de 127 a 50 lecturas de IndexedDB). |
| 9 | `f790c1f` | v231 | Metas por sesiones: el progreso se deriva de las sesiones completadas desde la creación de la meta (el replay ya no la deja en 0). |
| 10 | `3753d27` | v232 | Finanzas: los formularios no tocan el DOM si la vista cambió mientras guardaban. |

El detalle de los 10 hallazgos está en `docs/PENDIENTES-CODE-REVIEW.md`.

## 27 sept 2026 — Revisión semanal (Tu semana)

**`CACHE_NAME` final: `vanguard-os-v228`.** Resumen lunes–domingo (hora
local) de Entreno, Finanzas, Tareas, Hábitos, racha/vidas y energía del
Ritual, con hasta 2 observaciones cruzadas por reglas (sin IA). Todo se
deriva del log y los stores; lo único que se guarda es qué semanas ya se
revisaron en Hoy (evento `semana_revisada`). QA con Playwright en 375×812 y
1280×800, zona `America/Santiago`, reloj simulado, contextos limpios sin
Supabase (`supabase.co` bloqueado) y el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI.

### Decisiones

1. Por defecto, la última semana completa; flechas hacia atrás y hasta la semana en curso ("En curso").
2. Laboratorio: botón "Semana" primero en el selector y seleccionado al entrar.
3. Hoy: tarjeta "Tu semana" lunes y martes (la semana recién terminada), después del Ritual y antes del aviso de respaldo; desaparece con "Ver" o "Después".
4. Gasto total en el resumen (variable al lado); las observaciones usan gasto variable (sin recurrentes) o solo Deseos.
5. Comparaciones contra el promedio de las 4 semanas anteriores, con al menos 3 semanas con datos.
6. Máximo 2 observaciones, nunca 2 del mismo módulo principal, primero la de mayor diferencia relativa. Tuteo y "coincide con", nunca "causa".
7. El Planificador suma a tareas completadas, con "(N de Semana)".
8. Energía "3,6 · 5 de 7 días"; sin días con Ritual no se muestra.

### Fases

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| S0 | — | — | Informe de solo lectura: funciones por semana/rango, datos por día, reglas propuestas y riesgos. |
| S1 | `eb41a80` | v221 | `resumirSemana` (pura, en `db.js`) y `db.getResumenSemana(lunesKey)`: una lectura de `events` por render; bordes con claves de día; semana en curso parcial. Entreno, finanzas, tareas (Tareas + Planificador, netas), hábitos, racha/vidas al cierre, Ritual y `porDia`. |
| S2 | `33d0002` | v222 | `js/core/observaciones-semana.js`: 8 reglas (energía y entreno, Deseos vs ritmo, Ritual y hábitos, gasto variable y entreno, tareas que entran/salen, día más activo, hábitos vs ritmo, vida extra). En la semana en curso, hoy entra al % de hábitos solo si ya tiene una marca. |
| S2b | `0cc5e21` | v223 | Comparaciones entre grupos con al menos 4 días por grupo (la semana sola o, si no alcanza, las semanas con actividad de las 4 previas + la actual); magnitud con tope en 3 y desempate por días de datos; nuevo texto de "mejor día". |
| S3 | `61880fe` | v224 | `js/components/lab-semana.js`: rango con flechas, tira L–D (activo / protegido / vacío / futuro), bloques por módulo (tocar uno lleva a su pestaña), observaciones y estado vacío; aria-labels con los números. |
| S3b | `3244052` | v225 | Selector de módulos del Laboratorio en MK III (chaflán, tokens, 12,5 px, scroll horizontal con snap y sin barra a 375). |
| S4 | `a7a8560` | v226 | Tarjeta "Tu semana" en Hoy con la primera observación (o "3 entrenos · $276.490 gastado · 5 tareas"); "Ver" abre el Laboratorio en esa semana; `semana_revisada` con replay y espejo en `sync.js`. |
| S5 | `fe8b1aa` | v227 | Mono solo para las cifras (rango y porcentajes), pares número + texto sin partirse entre líneas, padding inferior con safe-area en el Laboratorio. |
| S5 (QA) | este commit | v228 | QA final y documentación. |

### Verificación con el respaldo

Semana 14–20 sept: 3 de 3 sesiones · 177 min · volumen 19.067 · gasto
$276.490 (variable $261.500), más gasto Supermercado $130.250 · 5 completadas
(3 de Semana), 8 creadas, 1 atrasada · hábitos 45 % (mejor Meditar 10 min,
más flojo Tomar agua) · racha 81 días, 2 vidas al cierre · Ritual 5 de 7 ·
energía 3,6 · 5 de 7 días. Observaciones: "Gastaste $89.100 en Deseos: 2,9
veces tu promedio de las 4 semanas anteriores ($30.700)." y "Los viernes son
tus días más activos (11 entrenos y tareas en 5 semanas); los domingos, los
más tranquilos (2)."

QA final (S5):
- Laboratorio abre en Semana 14–20; "›" lleva a 21–27 ("En curso", tira con el jueves 24 protegido y el domingo futuro); 13 veces "‹" llega a 22–28 jun (estado vacío); los bloques Entreno, Finanzas, Tareas y Hábitos llevan a su pestaña. A 375 el bloque General queda completo sobre la barra inferior.
- Hoy: lunes 28 a las 10:00 va primero el Ritual; a las 15:00, "Tu semana · 21 – 27 sept"; "Después" la oculta y el martes no vuelve; el miércoles no aparece. "Ver" abre el Laboratorio en 21–27 (S4).
- Cambio de horario: lunes 7 sept 2026 (el 6/9 no tiene 00:00) muestra 31 ago – 6 sept; domingo 4 abr 2027 (fin del horario de verano) muestra 22 – 28 mar; martes 6 abr 2027 muestra 29 mar – 4 abr. Siempre 7 días distintos, sin desplazarse ni duplicarse.
- Offline tras recarga (service worker activo): Semana muestra 21–27 con sus 5 bloques y Hoy la tarjeta "Tu semana".
- Replay desde `events` (sesiones, transacciones, tareas, planificador, rutinas, ritual, recurrentes, marcas de hábitos y semanas revisadas): mismas observaciones, mismas cifras y el mismo ocultamiento.
- A 375 y 1280 sin scroll horizontal; border-radius 0 en bloques, flechas, selector, observaciones, tira y la tarjeta de Hoy con sus botones. ESLint `no-undef` limpio; consola sin errores.

### Notas

- Las observaciones son correlaciones de una sola persona en pocas semanas: se redactan como coincidencias y nunca como causa.
- "Días objetivo" de Entreno sale de la configuración actual del generador (no hay historial de cambios).
- El encabezado "Revisión semanal" de la tarjeta de Hoy usa el mismo estilo (mono) que los encabezados de todas las tarjetas contextuales.

## 27 sept 2026 — Pulido de Finanzas, textos, Entreno y detalles

**`CACHE_NAME` final: `vanguard-os-v220`.** Diez commits entre `b8b8ea3`
(v211) y `d69a511` (v220), cada uno con su propio bump de caché. Verificado
con Playwright en 375×812 y 1280×800, zona `America/Santiago`, reloj
simulado, contextos limpios y el respaldo `vanguard-backup-demo-3-meses-COMPLETO.json`
importado por la UI. Las pruebas bloquean `supabase.co`; la sesión, cuando
hace falta, es un stub del bundle de Supabase (nunca se inicia sesión real).

### Pulido de Finanzas

| Commit | Caché | Qué cambia |
|---|---|---|
| `b8b8ea3` | v211 | Montos negativos con el signo antes del símbolo: `-$10.000` (Intl en es-CL dejaba `$-10.000`; el compacto era inconsistente). Un solo lugar en `utils/currency.js` para `formatCurrency` y `formatCompactCurrency`; lo que redondea a cero queda `$0`. |
| `079b855` | v212 | Tarjeta de sobre con disponible negativo: "Sobregiro de $66.200 acumulado" en rojo y barra al 100 % en vez de "$0 de $-66.200". Con disponible exactamente 0 queda la línea normal (un sobre vacío no es alerta). |
| `3dcd4ed` | v213 | Restaurar un respaldo (formato nuevo y antiguo) marca el onboarding inicial como completado con `marcarOnboardingInicialCompletado`, salvo que el respaldo traiga su propia marca. |
| `e35d5e2` | v214 | Alerta de flujo de caja: un cobro del mes siguiente dentro de la ventana de 7 días se compara contra el saldo proyectado (lo que arrastra este mes + asignado del mes siguiente). El 26/9, Spotify del 3/10 ya no avisa; el Gimnasio del 28/9 sí (faltan $16.410). |

### Textos, saludo y comparación mensual

| Commit | Caché | Qué cambia |
|---|---|---|
| `bf8ef28` | v215 | Voseo → tuteo en toda la app (Completa, Elige, Ingresa, Déjalo, Ingrésalo, Puedes, Siente, Sincroniza, Prueba, Revisa…); "Septiembre de 2026" en vez de "Septiembre De 2026" (`conMayuscula` en `fecha.js` reemplaza `text-transform: capitalize`, también en Movimientos y Laboratorio); plurales con 1 (nota, categoría, completada, pendiente, serie, sesión…); onboarding: "Análisis" → "Laboratorio" y párrafos en sans-serif. |
| `d5653f0` | v216 | Perfil con "Nombre" opcional: Hoy saluda "Buenas tardes, Ana" o, sin nombre, a secas (antes "Benjamín" fijo). Tarjeta de respaldo: "en este dispositivo". Con sesión de Supabase y una sync correcta hace menos de 7 días, Hoy no muestra el aviso de respaldo; Configuración > Cuenta dice "Sincronizado hace X" (`sync.js` guarda `ultimaSyncTs` y expone `getEstadoSincronizacion`). |
| `f94a360` | v217 | "Gastaste X% más/menos": el mes en curso se compara con el anterior hasta el mismo día (1–26 sept vs 1–26 ago; si el anterior es más corto, hasta su último día); un mes cerrado sigue completo contra completo. Con el respaldo: +3 % (contra agosto completo) → +14 %. El texto dice "a esta altura del mes pasado" y el gráfico "Gasto vs. mes anterior" usa el mismo corte. |

### Entreno y detalles

| Commit | Caché | Qué cambia |
|---|---|---|
| `77b982f` | v218 | Entreno sin rutinas: "Arma tu primera rutina" con selector GYM / Calistenia / HIIT, "Generar mi rutina" (generador existente) y "Crear rutina a mano" (formulario de la categoría; en HIIT, el de HIIT). |
| `2d59a3d` | v219 | El formulario de perfil y el de nivel ya no se abren solos al entrar a Entreno: una tarjeta "Completa tu perfil para calcular tu nivel e IMC" con "Completar" y/o "Definir mi nivel"; "Ahora no" la oculta hasta el día siguiente (localStorage con `diaKeyDe`). |
| `d69a511` | v220 | Onboarding paso 2 menciona la cuenta opcional para sincronizar entre dispositivos (ya no dice "No hay cuenta ni nube"). Gráficos de Chart.js con `borderRadius: 0` (Gasto vs. mes anterior, Tendencia de Entreno, donuts). |

## 26–27 sept 2026 — Sync vendorizada, tareas, demo y sesiones (v200–v204)

| Commit | Caché | Qué cambia |
|---|---|---|
| `6dfa105` | v200 | Supabase desde un bundle local (`js/vendor/supabase-js-2.116.0.js`, en `PRECACHE_URLS`) cargado con `import()` dinámico por `cargarSupabase()`: si esm.sh caía, la app no arrancaba. Sin el bundle, la sync queda desactivada y el resto sigue igual. |
| `e44a38d` | v201 | Crear o editar una tarea a "Hecho" pone `completedAt` y emite `tarea_completada` (cuenta en las rachas); volver a otro estado limpia `completedAt`. |
| `7c22874` | v202 | Reabrir una tarea emite `tarea_reabierta` y le quita la actividad a ese día en la racha global y la de Tareas (estado neto por tarea y día), igual que desmarcar un hábito. |
| `3cc5967` | v203 | Configuración > "Datos de prueba": `cargarDatosDemo()` (`js/core/datos-demo.js`) borra lo que haya en el dispositivo y siembra unos 60 días de datos en los 4 módulos con las funciones de `db.js` (todo con `logEvent`), previa confirmación. Bloqueado con sesión de Supabase iniciada. |
| `e1b9fb5` | v204 | Fix `checked` en sesiones: las series guardadas no llevaban `checked` y las sugerencias de nivel exigían `checked === true`, así que nunca sugerían subir. Las series nuevas llevan `checked: true`; una serie sin el campo (sesiones ya guardadas) cuenta como marcada. |

## 27 sept 2026 — Arrastre de saldos de sobres

**`CACHE_NAME` final: `vanguard-os-v210`.** Seis commits entre `88efe44` (v205)
y `1afc101` (v210), cada uno con su propio bump de caché. QA final con
Playwright en 375×812 y 1280×800, zona `America/Santiago` y reloj simulado,
importando por la UI (Configuración → Restaurar respaldo) el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` (120 transacciones, 6 sobres,
6 recurrentes, 700 eventos) en un contexto limpio con el reloj en
2026-09-26 10:00.

### Decisiones

1. `saldo(mes) = arrastre(mes anterior) + asignado(mes) − gastado(mes) ± transferencias(mes)`, incluidos los saldos negativos (un sobregiro también arrastra).
2. Transferencias: desde R2, una transferencia mueve saldo solo en su mes y NO toca `assignedAmount`. Las anteriores quedan como estaban (su efecto ya está en `assignedAmount`) y borrarlas sigue revirtiendo como siempre. Sin migrar datos: las nuevas llevan `modelo: 'saldo'`.
3. El asignado se suma solo en meses con al menos una transacción (de cualquier tipo, en toda la app). *Ajuste R4b:* el mes actual siempre suma su asignado; la regla aplica solo a meses pasados.
4. Solo los sobres arrastran. "Disponible del mes", "Disponible por día" y la fila de Hoy siguen siendo del mes.
5. Sobres sin eventos (por defecto o anteriores al log): su `assignedAmount` actual rige en todos los meses.
6. "Eliminar sobre" pasa a "Archivar": se oculta de la UI, su historial y saldo quedan y se puede desarchivar.
7. Tarjeta: "$gastado de $disponible" y una línea aparte con el arrastre ("+$30.000 de agosto" / "−$20.000 de agosto").
8. Orden: primero R1 (ids de los sobres por defecto entre dispositivos), después el arrastre.

Además: el arrastre no usa el `createdAt` de los sobres (difiere entre
dispositivos); el punto de partida sale de las transacciones. *Ajuste R4b:* un
sobre existe desde lo que ocurra antes, su `sobre_creado` o su primer
movimiento propio (gasto o transferencia `saldo`); antes de su `sobre_creado`
usa el asignado de esa primera foto, así ningún gasto se ignora.

### Commits

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| R1 | — | — | Verificación sin código: los sobres por defecto usan ids fijos `env_1`…`env_6` en todos los dispositivos; solo su `createdAt` difiere. |
| R2 | `88efe44` | v205 | Transferencias nuevas (`modelo: 'saldo'`) mueven saldo solo en su mes; no tocan `assignedAmount` ni emiten `sobre_transferencia`. |
| Fix | `5150066` | v206 | Las transferencias entre sobres (nuevas, antiguas y `Assignment`) no son gasto: fuera de gastos del mes, disponible, tendencia, distribución e historial. Siguen en Movimientos y cuentan para la racha. |
| R3 | `64d66cd` | v207 | Archivar/desarchivar (`sobre_archivado` / `sobre_desarchivado` con replay). Bloqueado si hay recurrentes apuntando al sobre. Sección "Archivados (N)". |
| R4 | `72ec37f` | v208 | `calcularSaldosConArrastre` (pura) reemplaza a `saldosDeSobres`; la usan `getBudget().envelopes` (Gasto, tope de Transferencia) y `getProyeccionRecurrentes`. |
| R4b | `bd7ed9a` | v209 | El mes actual siempre suma su asignado; un sobre existe desde su creación o su primer movimiento, lo que sea antes. |
| R5 | `1afc101` | v210 | Tarjeta: saldo, "$gastado de $disponible", líneas de arrastre y de transferencias, mini-gráfico contra el disponible de cada mes, `aria-label`. |

### Verificación con el respaldo (vista del 26/9)

asignado / gastado / transferencias / arrastre / **saldo**

| Sobre | Julio | Agosto | Septiembre |
|---|---|---|---|
| Supermercado | 220.000 / 254.780 / 0 / 0 / **−34.780** | 240.000 / 274.470 / 0 / −34.780 / **−69.250** | 240.000 / 247.990 / 0 / −69.250 / **−77.240** |
| Servicios | 105.000 / 102.710 / 0 / 0 / **2.290** | 105.000 / 106.600 / 0 / 2.290 / **690** | 105.000 / 106.450 / 0 / 690 / **−760** |
| Transporte | 45.000 / 52.120 / 0 / 0 / **−7.120** | 45.000 / 57.410 / 0 / −7.120 / **−19.530** | 45.000 / 38.450 / 0 / −19.530 / **−12.980** |
| Arriendo | 380.000 / 380.000 / 0 / 0 / **0** | 380.000 / 380.000 / 0 / 0 / **0** | 380.000 / 380.000 / 0 / 0 / **0** |
| Salidas y Ocio | 80.000 / 86.000 / 0 / 0 / **−6.000** | 60.000 / 77.700 / 0 / −6.000 / **−23.700** | 60.000 / 162.500 / 0 / −23.700 / **−126.200** |
| Suscripciones | 40.000 / 41.470 / 0 / 0 / **−1.470** | 40.000 / 41.470 / 0 / −1.470 / **−2.940** | 40.000 / 28.480 / 0 / −2.940 / **8.580** |

Revisado a mano:
- **Supermercado:** `sobre_actualizado` del 1/7 con 220.000; la transferencia
  antigua del 25/8 (+20.000 desde Salidas y Ocio) lo deja en 240.000 desde
  agosto. Julio 220.000 − 254.780 = −34.780; agosto −34.780 + 240.000 − 274.470
  = −69.250; septiembre −69.250 + 240.000 − 247.990 = −77.240.
- **Salidas y Ocio:** foto del 1/7 con 80.000; la misma transferencia antigua lo
  deja en 60.000 desde agosto. Julio 80.000 − 86.000 = −6.000; agosto −6.000 +
  60.000 − 77.700 = −23.700; septiembre −23.700 + 60.000 − 162.500 = −126.200.
  La transferencia antigua actúa en el asignado, como antes, y no se vuelve a
  sumar en la columna de transferencias.

Resto del QA:
- **1/10 08:00 sin registrar nada:** cada sobre muestra arrastre de septiembre +
  asignado de octubre (Supermercado −77.240 + 240.000 = 162.760). Se generó
  una sola vez la recurrente vencida (Gimnasio del 28/9, $24.990), que pasa a
  septiembre: Suscripciones cierra septiembre en −16.410 y octubre arranca en
  23.590. Tres recargas no la duplican.
- **Tarjetas (375×812):** sobregiro "Supermercado $162.760 · $0 de $162.760 ·
  −$77.240 de septiembre" (línea en rojo). Ningún sobre del respaldo cierra
  septiembre con sobrante; el sobrante se verificó el 26/9 con Servicios
  "+$690 de agosto". Sin cortes a 375 px, sin border-radius ni sombras.
- **Consumidores:** Gasto "Quedan $157.760 en este sobre" (Supermercado,
  $5.000); tope de Transferencia "Max: $380.000" (Arriendo); alerta de Hoy el
  26/9 "Gimnasio ($24.990) excederá el saldo de Suscripciones. Faltan $16.410"
  (saldo con arrastre 8.580; sin arrastre habría dicho $13.470).
- **Archivar:** Transporte archivado el 1/10 queda congelado en 32.020 en
  noviembre (asignado 0); al desarchivar el 2/11 vuelve a sumar (77.020).
- **Sync:** un segundo contexto (instalado el 20/10, IndexedDB propio) aplica
  los eventos con `applyRemoteEvent`: mismos saldos de julio a noviembre y 128
  transacciones en ambos.
- **Replay** desde `events`: stores y saldos idénticos. **Offline** tras
  recarga (service worker activo): Finanzas carga con las 6 tarjetas.
- **Rendimiento con el respaldo:** `calcularSaldosConArrastre` 0,14 ms;
  `getBudget` completo 13 ms. Con 24 meses sintéticos (1.920 transacciones,
  3.300 eventos) unos 2–3 ms.
- ESLint `no-undef` limpio (ignorando `js/vendor/`); consola sin errores en
  Hoy, Finanzas y Laboratorio.

### Notas

- **Transferencias antiguas vs nuevas.** Las antiguas (sin `modelo`)
  modificaron `assignedAmount` con `sobre_transferencia`; en el arrastre cuentan
  como un cambio del asignado desde el mes en que ocurrieron, y borrarlas lo
  revierte desde el mes del borrado. Las nuevas (`modelo: 'saldo'`) solo suman
  o restan en su mes y se ven en la tarjeta como "±$X transferido".
- **Sobres por defecto sin eventos.** Si no tienen ningún evento, su
  `assignedAmount` actual rige en todos los meses. Si solo tienen
  `sobre_actualizado` (sin `sobre_creado`), el valor anterior al primer evento
  se deduce de ese evento. Si el log leído no llega al valor guardado (caché de
  eventos de hasta 5 s), la diferencia se aplica en el mes actual.
- **El mes actual siempre suma su asignado**, aunque todavía no tenga
  movimientos. Un mes que termina sin ninguna transacción, visto después como
  mes pasado, solo arrastra.
- Un sobre con `disponible` negativo muestra "$0 de $-66.200" (formato actual
  de `formatCurrency` para negativos).
- Tras restaurar este respaldo vuelve a aparecer el onboarding inicial: el
  respaldo no trae la marca de completado.

## 26 sept 2026 — Vida extra, fechas locales, Finanzas y respaldos

**`CACHE_NAME` final: `vanguard-os-v199`.** Catorce commits entre `da71068`
(v186) y el fix de `desde` (v199), cada uno con su propio bump de caché. QA
final con Playwright en 375×812 y 1280×800, zona `America/Santiago` y reloj
simulado.

> **Corregido (encontrado en el QA final):** `78fe15a` quitó la variable
> `desde` de `detectarSugerencias` (`js/core/sugerencias-nivel.js`) pero
> `evaluarPorRatio` todavía la recibía. Si el ejercicio más alto de una rama en
> las últimas 4 semanas era uno de los 4 básicos de gym con criterio `ratio`
> (sentadilla, peso muerto, press banca, press militar), `detectarSugerencias`
> lanzaba `ReferenceError: desde is not defined`: en Hoy la tarjeta de avances
> no aparecía y en Entreno el banner de sugerencias fallaba. Corregido en el
> commit "Sugerencias de nivel: ventana de 4 semanas en dias tambien para el
> criterio ratio" (v199), commit siguiente a `b087a8e`: `evaluarPorRatio`
> recibe `hoyClave` y filtra por días de calendario como el resto de la
> ventana. Un barrido con ESLint (`no-undef`) sobre todo `js/` no encontró
> otros casos (solo falsos positivos del envoltorio UMD de
> `js/vendor/chart.js`).

### Vida extra de racha

Proteger la racha global un día sin actividad. Todo se deriva del log de
eventos; no se guarda ningún estado.

Decisiones:
- Solo la racha global (no días perfectos, rachas por hábito, ritual, Entreno ni Tareas).
- 1 vida por cada 7 días activos **reales** seguidos; máximo 2. Un día protegido mantiene la racha sin sumar y reinicia la cuenta de 7.
- Las vidas se consumen solas al terminar un día sin actividad (con 2 vidas y 2 días vacíos se usan ambas). Hoy sin actividad está pendiente y nunca consume.
- La insignia `racha_7` significa "alguna vez llegó a 7" y no se vuelve a bloquear.
- Un hábito cuenta en la **fecha marcada**, no en el momento en que se marcó; desmarcar quita el día solo si no quedó otra actividad ese día.

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| 1 | `78fe15a` | v189 | Cambio de horario en todas las rachas (ver "Fechas locales"). |
| 2 | `c69f8a2` | v190 | `actividadGlobalPorDia`: los hábitos cuentan en `payload.fecha` con estado neto por (hábito, fecha); el resto por el día de su `ts`. |
| 3 | `51e01d3` | v197 | `calcularRachaConVidas` (función pura) → `getRachaGlobal` devuelve además `vidas`, `diasProtegidos`, `maxHistorica`, `ultimaVidaUsada`. `racha_7` por `maxHistorica`. `leerEventosCompartido`: abrir Hábitos pasa de 2 lecturas de `events` a 1. |
| 4 | `a3a941f` | v198 | UI: chip de Hoy "🔥 N · [escudo] V" (atenuado con 0), escudos y texto de vidas bajo el reactor de Hábitos, tira de los últimos 7 días (activo / protegido / vacío / hoy), aviso "Usaste una vida extra el martes 8 — tu racha sigue en N" en la tarjeta contextual (Ritual > respaldo > vida usada > avances > Hoy toca; "Entendido" lo oculta para ese día) y toast "Ganaste una vida extra" una sola vez. `getRachaGlobal` suma `faltanParaVida`. |

Nota: con estas reglas, tras usar una vida hacen falta 7 días reales nuevos para
ganar la siguiente, así que la secuencia 7 activos → 1 vacío → 7 activos deja
**1** vida (no 2).

### Fechas locales y cambio de horario

`78fe15a` (v189). Las rachas restaban 86 400 000 ms entre medianoches locales;
con el cambio de horario hay días de 23 o 25 h (en Chile el 6/9 no tiene 00:00)
y la racha se cortaba sola: 3–8 sept daba 2 en vez de 6, 2–6 abr 2027 daba 3 en
vez de 5. Toda la aritmética de días pasa a claves `YYYY-MM-DD`.

Helpers en `js/utils/fecha.js`:
- `diasEntre` compara con `Date.UTC` (sin huso horario).
- `sumarDias(clave, n)`: avanza por calendario.
- `claveDiaDe(valor)`: clave del día local de una clave o de un ISO/timestamp (`new Date('YYYY-MM-DD')` es UTC y en Chile cae el día anterior).
- `fechaLocalDe(valor)` y `compararFechas(a, b)` (agregados en el fix A de Finanzas).

Lugares corregidos: `calcularRachaDesdeDias`, la copia del bucle en
`getRachaGlobal` y su `last7`, `calcularRachaDiasAplicables`,
`generarDiasAplicables`, `getRachaHabito`, `getRachaHabitosGlobal`,
`getRachaRitual`, `getRachaHiit`, `weekIdDe` (hábitos semanales) y
`rachaSemanas` de Entreno (las semanas empiezan el lunes 00:00 local; antes el
domingo 21:00 en Chile), antigüedad del dinero, deload, `getTendenciaSemanal`,
`getTendenciaTareasCompletadas`, atrasadas y banner de instalar (`dashboard.js`),
días desde el último respaldo (`backup.js`), días restantes de una meta
(`goal-card.js`), días sin entrenar una rama (`generador-rutinas.js:317`) y la
ventana de 4 semanas de `sugerencias-nivel.js`. Queda a propósito
`generador-rutinas.js:590` (ordena por recencia exacta, no cuenta días).

### Finanzas

| Fix | Commit | Caché | Qué cambia |
|---|---|---|---|
| A | `8f35248` | v191 | Claves `YYYY-MM-DD` leídas como día local: fecha visible de los movimientos (un gasto del 26/9 se veía "25 sept"), rango del desglose del Laboratorio (incluía el día anterior y excluía el último), orden de movimientos con claves e ISO mezclados, backfill de eventos. |
| B | `68cf377` | v192 | Recurrentes guardan `tx.date` y `lastProcessed` como clave de día; `lastProcessed` se lee con `claveDiaDe` (acepta el ISO anterior, sin duplicar). Todos los filtros por mes/rango/día sobre `tx.date` usan el día local (una transferencia ISO de la noche caía en el mes siguiente). Sin migrar datos. |
| C | `06bea2e` | v193 | La proyección de recurrentes a 7 días nunca funcionaba (`r.nextDate` inexistente, filtro por `r.type`, `r.name`, `env.spent`). `proximaFechaRecurrente` compartida con el procesamiento; saldo por `saldosDeSobres`; en Hoy la proyección se pide después de `getBudget`. |
| D | `b99b847` | v194 | Id determinista `rec-${recurrente}-${día}` + `recurrenteId` para las transacciones recurrentes: dos dispositivos que procesan la misma recurrencia sin sincronizar quedan con una sola (el replay y el espejo ya hacían upsert por id). |
| E | `2d5be2a` | v195 | Alerta de flujo de caja en MK III: tokens (`--state-high` con `color-mix`), título "Cobros sin saldo · 7 días", fecha del cobro en cada línea, máximo 3 líneas, toda la tarjeta lleva a Finanzas. |

### Respaldos

`d28f840` (v196, fix F): `backup.js` ya no importa `idb.js`; usa
`db.exportarDatosRespaldo` / `restaurarDatosRespaldo` / `marcarRespaldoExportado`
/ `getUltimoRespaldoTs`. El respaldo suma **ritual, planificador, notas y
notas_categorias**, que faltaban desde la v4 de la base: los respaldos
anteriores no incluyen el Ritual, la Semana ni las Anotaciones — **conviene
exportar un respaldo nuevo**. El formato no cambia (`version: 2`): un respaldo
anterior se importa igual y la versión anterior ignora las claves nuevas.

`js/core/sync.js` queda como **excepción documentada** a "solo `db.js` importa
`idb.js"` (es el motor de replay; comentario al inicio del archivo, en `51e01d3`).

### Otros

| Commit | Caché | Qué cambia |
|---|---|---|
| `da71068` | v186 | Service worker: tras una actualización, la pestaña recarga una vez en la próxima navegación segura (no con un modal abierto ni en una sesión de entreno) en vez de mezclar módulos de dos versiones; aviso "Actualización lista", máximo 1 recarga por activación. |
| `8607344` | v188 | Hoy: los ítems del Planificador (Semana) con fecha pasada cuentan como atrasados, con etiqueta "Semana", checkbox y "Mover a hoy" (`moverTareaPlan`, evento `tarea_reprogramada`). |
| `3e6066b` | v187 | Entreno MK III: `.badge` y los contenedores de Progreso sin `border-radius`. |

## 26 sept 2026 — Revisión del catálogo

**`CACHE_NAME` final: `vanguard-os-v184`.** Ocho commits entre `b128826` (v177)
y `b8db473` (v184): los pasos 1–7 de la revisión más un fix de racha detectado en
el QA final (paso 8). El catálogo pasa de 176 a **182 ejercicios**. Medición
común a todas las cifras: 60 planes por nivel (30 gym + 30 calistenia, 3 y 5 días
alternados, 45 min, equipo completo, sin historial), 1140 ejercicios elegidos.

### Commits

| Paso | Commit | Caché | Qué cambia |
|---|---|---|---|
| 1 | `b128826` | v177 | Prerrequisitos por nivel y alternativos (OR) en `estaDesbloqueado` (`prerequisitosAlternativos`). |
| 2 | `c197d69` | v178 | Datos P0: acceso cruzado gym/calistenia, dominadas con alternativos (asistida con banda / jalón al pecho) y frontera unificada: `calcularNivelPorRama` usa la misma `estaDesbloqueado` (sin regla de nivel, `ratioEstricto`), corrigiendo que un principiante viera tracción vertical intermedia. |
| 3 | `4ac9b37` | v179 | 5 ejercicios nuevos (ver abajo). Solo datos. |
| 4 | `5fa46f2` | v180 | Generador: no dejar espacios vacíos en silencio. Si se agota el nivel de la rama, se completa con el nivel inferior más cercano (`relajado`, motivo `nivel-inferior`) sin repetir ejercicios de la sesión; si aun así no hay, el espacio queda vacío con aviso. Cada fase corre en dos pasadas (nivel de la rama, luego relleno hacia abajo empezando por el patrón con menos ejercicios hoy). Un espacio extra nunca sube de nivel. |
| 5 | `2d9fd9e` | v181 | Push Press (gym, avanzado, requiere Press Militar). Solo datos. |
| 6 | `bd2e78a` | v182 | UI: un solo bloque de aviso por plan con los patrones únicos y "Agregar equipo →" (abre el modal del generador); cada día solo lleva "n/cupo" si le faltan ejercicios. `generarPlan` devuelve además `faltantes`, `avisosVolumen` y `cupo` por día (la selección no cambia). El aviso de volumen semanal queda como nota gris aparte. |
| 7 | `201b1f7` | v183 | UI: el día 7 sin ejercicios por diseño se muestra como **Descanso activo** (tarjeta con 3 sugerencias fijas, sin "0/5" ni aviso). Se guarda como rutina vacía; al abrirlo muestra la tarjeta con "Marcar como hecho", que emite `descanso_activo_completado` (`fecha` por `diaKeyDe`) sin crear sesión. En `sync.js` es un evento de solo auditoría. |
| 8 | `b8db473` | v184 | Fix: `descanso_activo_completado` cuenta para la racha global (`getRachaGlobal`, chip de racha y `last7`) pero no como sesión: `getRachaGeneral`, insignias de sesiones, volumen y mapa muscular solo leen `sesion_registrada` y no cambian. |

### Ejercicios agregados (176 → 182)

- **Calistenia:** Remo Invertido con Pies Elevados (intermedio, requiere Remo Invertido), Remo Invertido a Una Mano (avanzado, requiere el anterior), Flexión en Pica con Manos Elevadas (principiante), Flexión de Pino contra la Pared / HSPU (avanzado, requiere Handstand contra Pared). Pike Push-up pasa a requerir la flexión en pica con manos elevadas.
- **Gym:** Press de Hombros en Máquina (principiante, empuje vertical) y Push Press (avanzado, requiere Press Militar).

### % de ejercicios elegidos por debajo del nivel de su rama

| Momento | Intermedio | Avanzado |
|---|---|---|
| Informe de fase 0 (antes) | 28 % (315/1140) | 32 % (360/1140) |
| Paso 1 | 9 % (105/1140) | 14 % (165/1140) |
| Paso 2 | 7 % (75/1140) | 14 % (165/1140) |
| Paso 3 | 0 % (pero solo 1110 ejercicios: tracción vertical de calistenia daba 30 en vez de 60) | 3,9 % |
| Paso 4 | 2,6 % (30/1140, 1140 ejercicios) | 3,9 % |
| Paso 5 (final) | **2,6 %** (30/1140) | **0 %** (0/1140) |

En ningún momento hubo ejercicios **por encima** del nivel de la rama, y
un principiante ve 0 de 1140 ejercicios intermedios. Tracción vertical de
calistenia da 60 en intermedio y avanzado. El 2,6 % restante de intermedio es
tracción vertical de calistenia bajando al nivel principiante para completar el
cupo.

### Cobertura final del catálogo (gym + calistenia, ejercicios por patrón y nivel)

Cuenta también los ejercicios con acceso cruzado (`tambienEn`).

| Patrón | Gym P/I/A/Todos | Calistenia P/I/A/Todos |
|---|---|---|
| Rodilla | 3/3/1/7 | 4/5/2/2 |
| Cadera | 1/3/3/9 | 2/1/1/1 |
| Empuje horizontal | 7/6/3/15 | 7/5/12/1 |
| Empuje vertical | 1/2/1/1 | 1/5/1/0 |
| Tracción horizontal | 3/5/1/11 | 2/1/1/1 |
| Tracción vertical | 2/1/2/6 | 6/4/8/0 |
| Core | 1/6/1/2 | 6/2/1/0 |
| Locomoción | — | 1/1/0/0 |

### Espacios vacíos (3 niveles × gym/calistenia × 1–7 días × 5 juegos de equipo, 2 planes c/u, 5 ejercicios por sesión)

- 1620 días evaluados (sin contar el día 7): **1170 espacios vacíos en 676 días** (antes del paso 4: 1502 en 676). **0 días sin ningún ejercicio**; el único día vacío por diseño es el Día 7 Movilidad, ahora "Descanso activo".
- Los vacíos vienen de equipo restringido (gym sin equipo, solo barra de dominadas, o calistenia Pull con mancuernas y banco): no existe otro ejercicio disponible para ese patrón. Todos llevan aviso visible ("no llenó todos sus espacios…", agrupado en el bloque del plan) e indicador "n/5" en el día.

### QA final (Playwright 375×812 y 1280×800, IndexedDB limpio, consola sin errores)

- **Árbol por la interfaz:** Dominadas con alternativos (asistida con banda, jalón al pecho); Remo Invertido → con Pies Elevados → a Una Mano; Flexión en Pica con Manos Elevadas → Pike Push-up → Handstand contra Pared → HSPU; Press Militar → Push Press (junto a Press Arnold).
- **Equipo limitado (gym sin equipo, 5 días):** 1 bloque de aviso, 0 avisos por día, indicadores 3/5, 2/5, 3/5; "Agregar equipo" abre el modal y Atrás lo cierra. Con equipo completo no hay bloque.
- **Descanso activo (7 días, equipo completo):** tarjeta en el preview y al abrirlo como sesión (sin cronómetro); "Marcar como hecho" registra `descanso_activo_completado`, 0 sesiones creadas. Racha global 0 → 1 (chip 🔥 1 en Hoy); racha de Entreno, insignias, volumen y mapa muscular sin cambios.
- **Replay:** borrar `rutinas`, `sesiones` y los singletons de perfil/generador/nivel y reaplicar los 15 eventos con `applyRemoteEvent` deja el mismo estado.
- **Offline:** con el servidor detenido, recarga y generación de un plan de 7 días con Descanso activo funcionan desde el service worker (`vanguard-os-v184` incluye `descanso-activo.js`).
- **Nota de medición:** las funciones memoizadas de `db.js` (`getRachaGlobal`…) se invalidan con `logEvent` dentro de la misma instancia del módulo; al consultarlas desde una instancia importada aparte hay que recargar para ver el valor nuevo. No es un bug de la app.

## 25 sept 2026 — Sistema de nivel de Entreno v2

**`CACHE_NAME` final: `vanguard-os-v176`** (el commit de documentación no toca
código y lo deja igual). Siete commits del sistema de nivel entre `4134499`
(v170) y `b74fc99` (v176), más los dos fixes de modales de Entreno de esa misma
jornada (v167 y v168, ver "Modales de Entreno"). Decisiones de partida (acordadas
al cerrar la auditoría): **extender** lo que ya existía (`nivelEntrenamiento`,
`overridesPorRama`, `calcularNivelPorRama`, `detectarSugerenciaPendiente`) en vez
de crear un evento `nivel_patron_ajustado`; mantener los umbrales de tiempo del
onboarding (< 1 año / 1–3 años / > 3 años → principiante / intermedio /
avanzado); **mantener el ratio multiarticular actual** y los nombres de patrón del
catálogo (`empuje-horizontal`, `traccion-vertical`…), no los del plan.

### Generador

- **`4134499` (v170) — la degradación de nivel va solo hacia abajo.**
  `candidatosPara()` prueba el nivel de la rama y luego los inferiores (de mayor
  a menor; `'todos'` vale en cada intento). Solo si no hay ningún candidato ahí
  mira el nivel superior más cercano, marcado `relajado: true` con motivo
  `'sin-candidatos-inferiores'` y un `console.warn`. Antes también probaba los
  niveles superiores por cercanía. Splits, ratio y `calcularNivelPorRama` intactos.
- **`afaa60e` (v173) — `motivoPara` distingue los dos casos.** "Bajó de nivel: …"
  (motivo `nivel-inferior`) frente a "Subió de nivel por falta de ejercicios: …"
  (motivo `sin-candidatos-inferiores`).

**Proporción multiarticular (sin cambios, se mantiene la actual):** ≤ 2 días 80 %,
3–4 días 65 %, 5–6 días 55 %, 7 días 50 %; los multiarticulares van primero en la
sesión. Splits: 1 día rota Upper/Lower, 2 Upper/Lower, 3 Push/Pull/Legs, 4
Upper A/Lower A/Upper B/Lower B, 5 PPL + Upper + Lower, 6 PPL ×2, 7 PPL ×2 + día
liviano. Sin Full Body.

### Sugerencias de avance

- **`5411165` (v171) — sugerencias por `criterioAvance` en las 8 ramas.** Nueva
  `detectarSugerencias()`: por rama toma el ejercicio de mayor nivel entrenado en
  las últimas 4 semanas (match por `ejercicioId`, con fallback por nombre, igual
  que el mapa muscular) y evalúa su `criterioAvance`: reps/segundos en al menos 2
  de las últimas 3 sesiones con ≥ `series` series limpias; ratio con los Estándares
  de Fuerza. Sugiere el nivel siguiente con `ejercicioSiguiente` = hijo por
  `progresionDe` (misma categoría y equipo disponible primero). Se eliminan los
  umbrales fijos (flexiones 15/25, dominadas 5/10…). `detectarSugerenciaPendiente()`
  devuelve el primero.
- **`0ce2743` (v172) — "Ahora no" caduca y el ratio usa datos recientes.**
  `sugerenciasDescartadas[rama]` pasa a `{ nivel, fecha }` (`diaKeyDe`); el evento
  `sugerencia_nivel_descartada` suma `fecha` (case de `sync.js` actualizado). Un
  "Ahora no" oculta ese nivel (y menores) 7 días; una entrada vieja sin fecha cuenta
  como vencida. El criterio `ratio` usa el mejor 1RM estimado de las series
  limpias de las últimas 4 semanas, no el PR histórico.
- **`3afeb37` (v175) — coherencia con el árbol.** Las sugerencias por
  reps/segundos usan la misma definición de "serie limpia" que el árbol de
  progresión (`contarSeriesLimpias`: tipo normal, reps suficientes, RPE ≤ 8 si hay
  RPE) más `checked`; el criterio `ratio` no cambió.

### Tarjetas, desbloqueo y garantía

- **`afaa60e` (v173) — tarjetas MK III + aviso en Hoy.** En Entreno, una tarjeta por
  rama sugerida (chaflán con `clip-path` sobre `.card-hero`, sin radios ni
  sombras, acento cian; máx. 3 visibles y "Ver N más"): "Rama: ejercicio →
  siguiente", evidencia en una línea, "Subir de nivel" y "Ahora no". En Hoy, la
  tarjeta contextual suma "N avances listos en Entreno" con prioridad Ritual >
  respaldo > avances > Hoy toca; el módulo de sugerencias se importa bajo demanda
  (`Router.importar`) para no cargar el catálogo en el arranque.
- **`428bca4` (v174) — "Subir de nivel" desbloquea el ejercicio siguiente.**
  `confirmarSugerenciaNivel` guarda el siguiente en `desbloqueadosPorRama` (dentro
  de `nivelEntrenamiento`) y `ejercicioSiguienteId` en el payload de
  `sugerencia_nivel_confirmada` (replay de `sync.js` actualizado).
  `estaDesbloqueado()` acepta un set de ids desbloqueados a mano y el generador los
  deja pasar por prerrequisitos y los prioriza.
- **`3afeb37` (v175)** — la vista del árbol recibe `desbloqueadosManuales` y los
  muestra desbloqueados; el desbloqueado tiene 1 espacio garantizado por sesión de
  su rama.
- **`b74fc99` (v176) — garantía híbrida.** Cada desbloqueo lleva su fecha
  (`{ id, fecha }`, también en el payload y en el replay). Durante 28 días desde esa
  fecha, 1 espacio garantizado por sesión de su rama; pasado el plazo sigue
  desbloqueado pero compite con el orden normal. Corrección incluida: los
  desbloqueados se **suman** al pool de cualquier intento en vez de pasar el filtro
  de nivel (así tapaban a los candidatos de niveles inferiores y la garantía
  vencida no rotaba). `diasEntre` pasa a `utils/fecha.js`.

### Modales de Entreno

- **`c931176` (v167) — modal de perfil.** Ya no tapa la navegación (el overlay deja
  libre la barra inferior y el riel), y "Ahora no" oculta la apertura automática el
  resto del día (`diaKeyDe`).
- **`4cdce7a` (v168) — modal de nivel.** Mismo patrón; el modal no tenía ningún
  botón de salida y ahora lo tiene ("Ahora no" en el paso 1).

### QA (Playwright; 375×812 y 1280×800, IndexedDB limpio)

1. **Onboarding de nivel por la interfaz** (perfil → 3 pasos): con "< 1 año" todas
   las ramas salen principiante (excepto `empuje-vertical`, intermedio: el
   catálogo no tiene ejercicios principiante en ese patrón); con "1–3 años" todas
   intermedio; con "> 3 años" todas avanzado. Ambos modales dejan la navegación
   tocable en cada paso.
2. **Generador:** 384 planes (3 niveles × gym/calistenia × 1/3/5/7 días × equipo
   completo/sin equipo), 5.560 ejercicios: **0 sobre el nivel de su rama**, 0 días
   Full Body, y con 1 día/semana la rotación alterna Upper/Lower en gym y calistenia.
3. **Sugerencias:** una rama por reps (flexiones), una por segundos (dead hang), una
   por ratio (sentadilla) y una cuarta (plancha); series a RPE 9 no cuentan, series
   sin marcar no cuentan y un récord de ratio de hace 40 días no cuenta.
4. **Tarjetas:** 3 visibles + "Ver 1 más"; "Subir de nivel" desbloquea el siguiente y
   el árbol lo muestra desbloqueado; "Ahora no" la oculta 7 días (a +6 sigue oculta,
   a +7 vuelve).
5. **Garantía del desbloqueado** (tracción vertical, calistenia, 3 días, 30 planes):
   30/30 sesiones el día 0 y el día 27; 9/30 el día 28 y 15/30 el día 29 (rota con
   las demás variantes).
6. **Hoy:** con hora simulada a las 09:00 el orden fue ritual → respaldo → avances
   ("3 avances listos en Entreno") → Hoy toca.
7. **Replay:** borrar el singleton y reproducir sus eventos
   (`nivel_entrenamiento_actualizado`, `sugerencia_nivel_confirmada`,
   `sugerencia_nivel_descartada`) da el mismo `nivelEntrenamiento` (overrides,
   descartes con fecha, desbloqueados con fecha).
8. **Offline:** con el servidor apagado y el service worker instalado, Entreno carga
   con sus tarjetas, las 5 pestañas navegan y el generador produce planes. Consola
   limpia en toda la tanda.

### Observaciones (no bloqueantes; no se cambió código)

- Hay días de plan sin ejercicios por diseño: GYM sin equipo declarado deja vacío el
  día Push (no hay ejercicios de pecho de peso corporal en esa categoría) y el "Día
  7 · Movilidad" no lista ejercicios.
- La garantía de 28 días ocupa el único espacio de las ramas que tienen 1 espacio
  por sesión (en calistenia, tracción vertical): ahí las otras variantes no
  aparecen hasta que vence.
- La sugerencia de ratio exige series `checked`, más estricta que el PR histórico
  que se usaba antes.
- El selector de categoría de la vista de progreso (`entreno-progreso.js`) sigue
  con `border-radius: 10px`, anterior a esta tanda y fuera de su alcance.
- La sincronización con Supabase no se pudo ejercitar con una sesión real; solo se
  verificó el replay local de los eventos (`applyRemoteEvent`).

---

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
