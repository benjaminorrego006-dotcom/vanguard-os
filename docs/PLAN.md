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

Estado al 4 oct 2026 (`CACHE_NAME` v256). El detalle de cada tanda (commits,
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
| Sesión activa "Cabina HUD" (`docs/REDISENO-SESION-HUD.md`): borrador en localStorage, pantalla completa, HUD, riel y un ejercicio por pantalla, tabla + editor + botón principal, descanso en el HUD con pantalla encendida, récord en vivo y resumen al finalizar (GYM y Calistenia; HIIT y Descanso activo sin cambios). Además: la app arranca con localStorage bloqueado y las series por tiempo ("30s") se conservan | hecho (`c35e30f` → fase 9, v243–v256) |

---

## Pendiente

### Recordatorios

Avisos de hábitos, tareas y cobros recurrentes. **Requieren un servidor de
push** (Web Push con claves VAPID y un backend que envíe): una PWA sin
servidor no puede notificar con la app cerrada. Decidir el backend antes de
implementar.

### Dificultad de tareas

Campo de dificultad/esfuerzo por tarea (y su uso en la agenda de Hoy y en
Laboratorio). Retrocompatible: las tareas existentes sin el campo siguen
funcionando.

### Pomodoro

Temporizador de foco asociado a una tarea, con su registro en el log de
eventos.

### FASE 6 — Medidas corporales históricas y fotos de progreso

`js/utils/bodyMetrics.js` calcula IMC pero no hay registro histórico.

a) Store nuevo: fecha, peso, circunferencias (cintura, pecho, brazo, muslo —
   opcionales). Gráfico de evolución reutilizando `utils/charts.js`.
b) Fotos como **Blob** en IndexedDB, NO base64 (infla ~33%). Redimensionar
   antes de guardar vía canvas. Definir tope de resolución.
c) Incluirlas en el respaldo. Un JSON con fotos puede pesar mucho — proponer
   cómo manejarlo antes de implementar.

### FASE 7 — Calentamiento y timer de descanso por ejercicio

a) **Calentamiento:** dado el peso de la serie de trabajo, sugerir la escalera
   de aproximación. Reutilizar `plate-calculator.js` para mostrar qué discos
   cargar en cada paso.
b) **Timer por ejercicio:** hoy `restTimerSecs` es global. Permitir override
   por ejercicio, con el global como default. Las rutinas existentes no tienen
   el campo — deben seguir funcionando cayendo al global. Desde el rediseño
   HUD el descanso vive en el HUD de la sesión (`iniciarDescanso` en
   `rutina-session.js`) y el ajuste global está en el menú ⋯ de la barra
   superior; la calculadora de discos se abre manteniendo presionado el KG
   del editor.

### Más ejercicios (N7, N8)

- **N8. Windshield wipers** (calistenia, core, avanzado, aislamiento): falta
  en el catálogo.
- **N7. Puente de glúteo a una pierna** (calistenia, cadera, intermedio): ya
  está en `js/core/ejercicios-catalogo-calistenia.js`; revisar que su ficha
  coincida con la propuesta antes de darlo por cerrado.

### Code review

Sin hallazgos abiertos (`docs/PENDIENTES-CODE-REVIEW.md`).

---

## Ideas sin fase asignada

Vienen de comparar con apps de referencia (Strong, Hevy, YNAB, Todoist,
Habitify, Way of Life):

1. **Estado "omitido" en racha/heatmap** (sí / no / omitido): un descanso
   planificado no debería contar igual que un día sin actividad. La vida extra
   cubre parte del problema, pero no el descanso planificado.
2. **Notas contextuales en el heatmap:** mostrar por qué, no solo cuánto.
3. **Gastos anuales prorrateados** en Finanzas (patente, seguro, matrícula).

### Decisiones de diseño tomadas — no revisar

- **Sin gamificación RPG** (XP, tiers, mascota).
- **Sin métrica compuesta de "fuerza del hábito".** La racha simple es más
  honesta que un número que nadie entiende.
- **PWA, no nativo ni PHP.** Un solo código para los tres dispositivos.
- **Offline-first con sync opcional:** IndexedDB es la fuente de verdad en
  cada dispositivo; Supabase replica el log de eventos. La app funciona igual
  sin cuenta.
