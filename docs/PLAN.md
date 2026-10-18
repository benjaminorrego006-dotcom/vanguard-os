# Vanguard OS — Plan de trabajo

Sirve para que cualquier sesión nueva de Claude Code retome sin explicaciones.
Las reglas completas y vigentes están en `CLAUDE.md` (raíz del repo); acá va
el resumen.

---

## Reglas transversales (aplican a todo)

- Vanilla JS, ES Modules, sin bundlers. Imports relativos SIEMPRE con `.js`
- Persistencia: IndexedDB vía `js/core/idb.js`, siempre a través de `db.js`.
  Nadie fuera de `db.js` importa `idb.js` directo, salvo `sync.js` (motor de
  replay, excepción documentada al inicio del archivo).
- Toda mutación nueva emite su `logEvent({modulo, tipo, entidadId, payload})`.
  Los agregados (racha, heatmap, insignias) se DERIVAN del log — nunca se
  guardan como campo aparte.
- Sistema de diseño MK III: tipografía monoespaciada, chaflanes vía
  `clip-path` (`.cut` / `.cut7` / `.cut9`), sin sombras, NO `border-radius`.
  Acentos: cian (`--cy`) = Entreno, ámbar (`--am`) = Finanzas,
  violeta (`--vi`) = Tareas. Rojo (`--rd`) SOLO para alertas reales.
  Los tokens viven en `css/variables.css`; `components.css` los aplica con
  clases scopeadas (`html.mk3-entreno`, etc.) que `app.js` alterna por vista.
- Render por `innerHTML`: reasignar listeners después de cada render.
- Retrocompatibilidad de datos: IndexedDB es la fuente de verdad en cada
  dispositivo (Supabase solo replica el log). Si se corrompe un
  store, el usuario pierde todo. Migrar, nunca asumir.
- Al crear archivos nuevos: agregarlos a `PRECACHE_URLS` en `sw.js` Y subir
  `CACHE_NAME`. Sin lo segundo el navegador sigue sirviendo el caché viejo.
- `VanguardOS_Claude_Spec.md` está DESACTUALIZADO (dice localStorage y otra
  paleta). No seguirlo. El código manda.
- Una tarea a la vez, commit propio, parar y esperar confirmación.
- No lanzar agentes en paralelo (consumen cuota sin terminar).

---

## Hecho

Estado al 12 oct 2026 (`CACHE_NAME` v321). El detalle de cada tanda (commits,
caché y QA) está en `docs/CHANGELOG.md`.

| | Estado |
|---|---|
| Fase 1 — Persistencia de almacenamiento + recordatorio de respaldo | hecha |
| Fase 2 — Escapado de HTML | hecha |
| Limpiezas A–C (`PRECACHE_URLS`, código muerto, navbar) | hechas (`2912c4f`, `dcfb0a2`) |
| Fase 3 — Tareas recurrentes | hecha (`7aba0f3`); después se eliminaron las recurrentes de Tareas (`2c3f93e`) |
| Nueva distribución: 5 pestañas, menú ☰, Hoy reordenado, riel responsive | hecha (v158–v166) |
| Sistema de nivel de Entreno v2: generador por nivel, árbol de progresión derivado del catálogo con prerrequisitos (reemplaza la antigua "Fase 5 — árbol de calistenia"), sugerencias de avance, desbloqueo | hecho (25 sept) |
| Revisión del catálogo de ejercicios (176 → 182, acceso cruzado gym/calistenia) | hecha (26 sept) |
| Vida extra de la racha global | hecha (26 sept, v189–v197) |
| Fechas locales y cambio de horario (DST) en rachas, hábitos y Finanzas | hecho (26 sept) |
| Finanzas: fixes A–F (fechas, recurrentes, proyección, ids deterministas, alerta MK III, respaldo completo) | hechos (v191–v196) |
| Sync activa con Supabase (tabla `events` + espejos) y bundle vendorizado (`js/vendor/supabase-js-2.116.0.js`) | hecha (`b628a77`, `71dbd0b`, `6dfa105`) |
| Fase 4 — Arrastre de saldos de sobres (R1–R5, archivar en vez de eliminar) | hecho (`88efe44` → `1afc101`, v205–v210) |
| Pulido de Finanzas (signo de negativos, sobregiro acumulado, onboarding tras restaurar, proyección del mes siguiente) | hecho (v211–v214) |
| Textos: tuteo, fecha, plurales, saludo con nombre, aviso de respaldo según la sync, comparación hasta el mismo día | hecho (v215–v217) |
| Entreno sin rutinas (estado vacío con acciones), perfil y nivel desde una tarjeta, gráficos sin esquinas redondeadas | hecho (v218–v220) |
| Publicación en GitHub Pages (PWA instalable, `start_url: "./"`, íconos PNG 192/512 y maskable) | hecha |
| Revisión semanal (Tu semana): resumen lunes–domingo en Laboratorio > Semana, observaciones cruzadas por reglas y tarjeta de Hoy los lunes y martes | hecha (S1 `eb41a80` → S5, v221–v228) |
| Code review: los 10 hallazgos cerrados (#6–#10 en v229–v232) | hecho (27 sept) |
| Editar y eliminar sesiones de Entreno: historial por semana, detalle, eliminar con Deshacer, editar (fecha, duración, notas, series y ejercicios); caché memoizada con el día en la clave | hecho (`1f249f7` → fase 4, v233–v236) |
| Buscador de ejercicios sin tapar la barra ni el riel (Atrás lo cierra) y sesión en vivo con id + nombre del catálogo | hecho (`37183bf`, `4239524`, v237–v238) |
| "Hoy toca → Empezar" visible, racha de Hoy tras procesar recurrentes, nombres antiguos → id del catálogo al leer, ejercicio libre con el nombre tal como se escribe | hecho (`0e92260` → v242) |
| Sesión activa "Cabina HUD" (`docs/REDISENO-SESION-HUD.md`): borrador en localStorage, pantalla completa, HUD, riel y un ejercicio por pantalla, tabla + editor + botón principal, descanso en el HUD con pantalla encendida, récord en vivo y resumen al finalizar (GYM y Calistenia; HIIT y Descanso activo sin cambios). Además: la app arranca con localStorage bloqueado y las series por tiempo ("30s") se conservan | hecho (`c35e30f` → cierre, v243–v257) |
| Semana "Tablero de día" (`docs/REDISENO-SEMANA.md`): franja de 7 días + detalle de un día con ítems del planificador y tareas de Lista con fecha, input único con el día elegido, tira de pendientes de días pasados (= atrasadas de Hoy, `js/utils/atrasadas.js`) con "Pasar a hoy", mover entre días (mantener presionado o menú ⋯), 7 columnas desde 900 px; Lista sin dona y Hábitos con una sola racha, con el "+" en el encabezado | hecho (`03dce16` → `a4f4887`, v259–v268) |
| Fase 7 — Calentamiento y descanso por ejercicio (`docs/FASE7-CALENTAMIENTO-DESCANSO.md`): escalera a pedido desde el ⋯ (barra, mancuernas y máquina, con discos por lado en barra), calentamiento fuera de volumen, récords, resumen y Laboratorio, ANTERIOR por tipo, y descanso por ejercicio (override en settings, hoja en la sesión, chip, superserie = el mayor) | hecho (`ddfbce3` → F6, v269–v273) |
| Dificultad y foco de tareas (`docs/PLAN-DIFICULTAD-FOCO.md`): dificultad fácil/media/difícil en el formulario (sin campo = media), marcas en Lista y Semana y puntos por semana en Laboratorio; foco de 25 min + 5 de pausa desde el detalle, el ⋯ de Semana y la línea de Hoy, que sobrevive a recargar y a cerrar la app, con `foco_completado` en el log, "N focos · X min" en el detalle y minutos por semana y tarea con más foco del mes en Laboratorio | hecho (`ef75014` → F5, v282–v286) |
| Fase 6 — Medidas corporales y fotos de progreso (`docs/FASE6-MEDIDAS.md`): IndexedDB v5 con `medidas` (derivado del log, en respaldo y espejo) y `fotos_progreso` (Blobs solo del dispositivo); Entreno › Cuerpo con tarjeta de peso y variación a 30 días, hoja de registro, historial, gráfico de peso (30/90/365 días, media de 7 días), mini-gráficos de perímetros, fila "Peso" en el Laboratorio, fotos reducidas a 1080 px con galería y comparación antes / ahora, y "Exportar / Importar fotos" en un archivo aparte. Además: chaflanes en el Laboratorio, foco en curso fuera del respaldo, aviso al actualizar la base con varias ventanas y navegación desde sub-vistas sin repintados tardíos | hecho (`2a5e623` → F6, v287–v295) |
| Limpieza: sin esquinas redondeadas salvo círculos (regla MK III: chaflán solo en `card-hero`) y números visibles en es-CL | hecha (`3d48cbc`, `7c91f92`, v296–v297) |
| Recordatorios (`docs/RECORDATORIOS-PLAN.md`, `docs/RECORDATORIOS.md`): Web Push con VAPID sobre el Supabase de la sync. Tablas `push_suscripciones` y `recordatorios` con RLS, pg_cron cada minuto y la Edge Function `enviar-recordatorios` desplegada. Suscripción por dispositivo en Configuración, con aviso de prueba. El teléfono calcula los avisos de 7 días (hábitos a su hora, tareas el día que vencen, cobros el día anterior, resumen diario) y los sube; marcar o completar los borra. Interruptor y hora por tipo, y hora por hábito | hecho (`0f6abc9` → F5, v297–v300); verificado en el teléfono de Benjamin el 12 oct (ver Pendiente) |
| Días: descanso planificado y nota por día (ideas 1 y 2, `docs/PLAN-PENDIENTES-OCT.md`). IndexedDB v6 con `dias` (derivado del log, en respaldo y espejo). La racha global y los cálculos de Hábitos saltan los días de descanso sin actividad; las insignias no cambian. Hoja "Día" desde Hoy, los mapas de actividad y la franja de Hábitos (mantener presionado), con rayado para el descanso y punto para la nota | hecho (`7042737` → `bda8a19`, v303–v305) |
| Gastos anuales prorrateados (idea 3): cada uno con su sobre, apartado sugerido por mes y ajuste automático del presupuesto al empezar el mes (respeta un cambio a mano del mismo mes). Sección en Finanzas › Recurrentes, aviso agrupado en Hoy (ámbar desde 30 días; rojo con 7 días o menos sin alcanzar) y línea "Anuales" en el Laboratorio. Tabla `gastos_anuales` en el espejo | hecho (`aebd0f7` → `68b4bd8`, v306–v308) |
| Catálogo: N8 Windshield Wipers (Limpiaparabrisas), Core avanzado con barra, viene de L-Sit y pide Dead Hang; N7 Puente de glúteo a una pierna revisado contra la propuesta y completado | hecho (`a648d15`, v309) |
| Cierre de octubre (`docs/PLAN-CIERRE-OCT.md`): mapa de Finanzas en ámbar; modales, hojas y diálogos rectos en todas las vistas (también ConfirmDialog y Laboratorio); saludo de Hoy en una línea a 375, con "Día" junto a la fecha y área de toque de 44 px; Diagnóstico de Recordatorios en Configuración (solo lectura, con "Copiar diagnóstico"); MCP "playwright" solo en scope project | hecho (`a63acd2` → `147011a`, v311–v314) |
| Pasada mínima de pulido: modales de metas sin tapar la navegación, modales de Finanzas con la regla común (sin copia propia ni radios inline) y toasts rectos y sin sombra | hecho (`13833d7` → toasts sin sombra, v315–v318) |
| Tema "Gris" (`docs/PLAN-TEMA-GRIS.md`): interfaz en grises y color solo en el texto, predeterminado; "Color" (el de siempre) se elige en Configuración › Apariencia, por dispositivo (localStorage, aplicado antes del primer pintado). Cada acento tiene un token de fondo/borde (`--cy`, `--state-high`…, gris en el tema) y uno de texto (`--cy-t`…, mantiene el color); `colorTexto()` para los colores armados en JS. Íconos, botones, barra y riel, gráficos, mapas y mapa muscular en grises; Hoy en blanco con etiquetas de color; títulos y números con el acento del módulo; contraste 4,5:1 en Gris | hecho (`ed0fdc6` → `8211b86`, v319–v321) |

---

## Pendiente

### Recordatorios — probar con uso real

Ya no está en pausa (12 oct 2026). El Diagnóstico desde el teléfono de
Benjamin (Android 10, Chrome 154, en pestaña) salió completo: permiso
concedido, service worker activo y controlando la página, suscripción creada,
fila en `push_suscripciones` y sin errores; el aviso de prueba llegó. Falta
solo probarlo con uso real y la app cerrada: un hábito con hora, una tarea
que vence y un cobro recurrente.

### Code review

Sin hallazgos abiertos (`docs/PENDIENTES-CODE-REVIEW.md`).

---

## Ideas sin fase asignada

Vienen de comparar con apps de referencia (Strong, Hevy, YNAB, Todoist,
Habitify, Way of Life):

Las ideas 1 (estado "omitido" = descanso planificado), 2 (notas en el
heatmap) y 3 (gastos anuales prorrateados) quedaron hechas en octubre (ver
Hecho).

- **Editar un pago fijo** (Finanzas › Recurrentes). Hoy solo se crea y se
  elimina. Necesita un evento nuevo `recurrente_editado` con su replay en
  `js/core/sync.js` (`applyRemoteEvent`), su destino en `MIRROR_STORES` y
  que el respaldo lo lleve. Quedó fuera de la revisión de octubre (decisión
  de Benjamin, 18 oct 2026).

### Decisiones de diseño tomadas — no revisar

- **Sin gamificación RPG** (XP, tiers, mascota).
- **Sin métrica compuesta de "fuerza del hábito".** La racha simple es más
  honesta que un número que nadie entiende.
- **PWA, no nativo ni PHP.** Un solo código para los tres dispositivos.
- **Offline-first con sync opcional:** IndexedDB es la fuente de verdad en
  cada dispositivo; Supabase replica el log de eventos. La app funciona igual
  sin cuenta.
