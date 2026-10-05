# Fase 7 — Calentamiento y descanso por ejercicio

Base: rama worktree-dashboard-mk3, commit 48eb69a, CACHE_NAME v268.
Origen: docs/PLAN.md › Pendiente › FASE 7.

## Decisiones (6 oct 2026)
- Calentamiento a pedido, no automático: el ⋯ de cada ejercicio ofrece "Agregar calentamiento", que inserta series de tipo `calentamiento` (el tipo ya existe) al inicio del ejercicio.
- Solo para ejercicios con equipo `barra`, `mancuernas` o `maquina`. En los de peso corporal, `ninguno`, `banda` y `barra-dominadas` la opción no aparece.
- Las series de calentamiento no cuentan para volumen, récords, resumen ni Laboratorio, y no disparan el descanso.
- Descanso por ejercicio, no por rutina: se guarda por ejercicio (clave `ejercicioId`, o el nombre normalizado si no hay id) y vale en cualquier rutina donde aparezca. Sin override se usa el general (`restTimerSecs`).
- En una superserie, el descanso es el mayor de los ejercicios de la corrida.
- Las rutinas no se editan en este plan (hoy no existe evento de edición de rutina y no se crea uno).

## Reglas que aplican
- Toda mutación pasa por db y emite logEvent. Si se agrega un campo a `settings`, el payload lleva el mapa completo (el replay de sync.js hace mergeSingleton, que reemplaza las claves de primer nivel).
- Números con utils/numero.js (es-CL). Fechas con utils/fecha.js.
- Modales con .modal-overlay + open (Atrás de Android vía history.js). Capturar ids antes de cualquier await.
- Archivos nuevos a PRECACHE_URLS; subir CACHE_NAME en cada commit con código.
- La tabla de Estado nunca lleva el hash del commit que la edita; el commit de cierre no tiene fila propia.
- Un commit por fase; parar al final de cada tanda de 3 fases o ante fallas o decisiones. QA Playwright de a una, a 375 y a 1280.
- No romper el borrador de sesión en localStorage ni el HUD (docs/REDISENO-SESION-HUD.md).

## Fases

### F1 · Escalera de calentamiento (lógica pura, sin UI)
- Nuevo js/utils/calentamiento.js con escaleraCalentamiento({ pesoTrabajo, equipo, pesoBarra = 20 }) → [{ peso, reps, discosPorLado? }].
- Barra: barra vacía ×10, 40 % ×5, 60 % ×3, 80 % ×2. Redondear hacia abajo a 2,5 kg. Quitar pasos que queden ≤ barra (salvo el de barra vacía) o repetidos. Si pesoTrabajo ≤ 40 kg: solo barra vacía ×10 y 70 % ×5 si supera la barra. discosPorLado con calcularDiscos de plate-calculator.js.
- Mancuernas: 50 % ×8 y 75 % ×4, redondeado hacia abajo a 1 kg (peso por mancuerna, igual que el resto de la app).
- Máquina: 50 % ×8 y 75 % ×4, redondeado hacia abajo a 2,5 kg.
- pesoTrabajo vacío, 0 o inválido → [].
- Verificación: tabla de casos ejecutada en consola (20, 40, 60, 100, 142,5 kg con barra; 12 y 30 kg mancuernas; 45 kg máquina; 0 y vacío) con el resultado esperado de cada uno.

### F2 · Calentamiento en la sesión
- En el ⋯ del ejercicio, "Agregar calentamiento" (solo equipos del alcance).
- Peso base: la primera serie normal del ejercicio en pantalla; si está vacía, la primera normal de ANTERIOR; si tampoco hay, toast "Escribe primero el peso de tu primera serie".
- Inserta las filas de tipo calentamiento al inicio, con peso y reps ya llenos y sin marcar. Si el ejercicio ya tiene series de calentamiento, la opción dice "Rehacer calentamiento" y las reemplaza (solo las no marcadas; las marcadas se mantienen).
- En barra, bajo cada fila de calentamiento, una línea chica con los discos por lado ("por lado: 20 + 5"). Sin popover.
- El borrador en localStorage, Finalizar y el editor −/+ siguen funcionando con las filas nuevas (ya leen tipo).
- Verificación: insertar, rehacer, recargar a mitad de sesión (el borrador conserva las filas) y finalizar (la sesión guardada trae las series con tipo: 'calentamiento').

### F3 · Calentamiento fuera de los cálculos
- ANTERIOR por tipo: la serie normal N se compara con la normal N de la sesión anterior, y el calentamiento N con el calentamiento N. Insertar calentamientos ya no corre ANTERIOR.
- Excluir calentamiento de: volumen del HUD y su comparación con la sesión previa, récords en vivo y sus chips, resumen al finalizar, y Laboratorio de Entreno. Revisar progresiones.js (ya excluye) y cualquier otro cálculo de volumen o récord con grep.
- Marcar una serie de calentamiento no inicia el descanso. Sí cuenta para "series pendientes" y el paso automático al siguiente ejercicio.
- Verificación: una sesión con calentamientos tiene el mismo volumen y récords que la misma sesión sin ellos; ANTERIOR se alinea bien con y sin calentamientos.

### F4 · Descanso por ejercicio (datos)
- settings.descansoPorEjercicio: { [clave]: segundos }. Clave = ejercicioId o 'nombre:' + nombre normalizado (misma normalización que matchEjercicio).
- db.getDescansoEjercicio(clave) → segundos o null. db.setDescansoEjercicio(clave, segundos | null) (null borra el override); límites 15–600 s. Emite configuracion_actualizada con { descansoPorEjercicio: <mapa completo> }.
- Confirmar que el replay de sync.js y el respaldo/restauración lo llevan sin cambios (si no, ajustarlo en esta misma fase).
- Verificación: guardar, borrar, sincronizar en un segundo contexto y exportar/importar un respaldo.

### F5 · Descanso por ejercicio (UI)
- En el ⋯ del ejercicio: "Descanso · 2:30" (o "Descanso · general 1:30"). Abre una hoja .modal-overlay con el valor en mono, −/+ 15 s y "Usar el general".
- Si el ejercicio tiene override, la cabecera muestra un chip "⏱ 2:30".
- iniciarDescanso usa el override del ejercicio; en superserie, el mayor de la corrida; si no hay override, el general.
- El ajuste general de la barra superior sigue cambiando solo el general.
- Verificación: un ejercicio con override, uno sin override, una superserie con overrides distintos, y Atrás con la hoja abierta.

### F6 · QA final y docs
- QA de punta a punta a 375 y a 1280: sesión con calentamiento en barra, en mancuernas y en máquina, más descansos por ejercicio, finalizar y revisar el resumen y Laboratorio. Regresión del HUD (descanso, wake lock, récord en vivo, borrador).
- docs/PLAN.md: mover la Fase 7 a "Hecho". CHANGELOG al día.

## Estado
| Fase | Commit | Caché |
|---|---|---|
| F1 Escalera de calentamiento | | |
| F2 Calentamiento en la sesión | | |
| F3 Calentamiento fuera de los cálculos | | |
| F4 Descanso por ejercicio (datos) | | |
| F5 Descanso por ejercicio (UI) | | |
| F6 QA final y docs | | |
