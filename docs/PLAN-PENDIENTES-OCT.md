# Pendientes de octubre — Días (descanso y nota), Gastos anuales y catálogo

Base: rama worktree-dashboard-mk3, commit 1ed244e, CACHE_NAME v302 (confirmados al empezar, 10 oct 2026).
Origen: docs/PLAN.md › Ideas sin fase asignada (1, 2 y 3) y Más ejercicios (N7, N8).
Recordatorios queda en pausa por decisión de Benjamin: no tocar push.js, recordatorios*.js ni la Edge Function, salvo que algo de este plan los rompa.

## Decisiones (10 oct 2026)
### Días: descanso planificado y nota del día (ideas 1 y 2 juntas)
- Un solo registro por día: store `dias` (keyPath `fecha`, clave diaKeyDe) con { fecha, descanso: bool, nota: string (máx. 140), actualizadoEn }. Evento `dia_actualizado` (modulo 'dias') con la fila completa; `dia_borrado` si queda sin descanso y sin nota.
- Descanso planificado = día que no corta ni suma: en la racha global, un día de descanso sin actividad se salta (la racha sigue igual, no consume vida, no suma a la cuenta de 7). Si ese día igual hubo actividad, cuenta normal como día activo.
- Solo se puede marcar descanso para hoy o días futuros (es planificado, no una excusa a posteriori). Quitarlo se puede siempre, también en días pasados.
- Sin límite de descansos, pero se ven: el anillo de racha muestra "N descansos este mes" si hay alguno.
- En Hábitos: un día de descanso no cuenta como fallado ni para la racha de cada hábito ni para "días perfectos" ni para el % de cumplimiento (se excluye del denominador). En la franja semanal se ve neutro (rayado), no vacío.
- Nota del día: se puede escribir en cualquier día (pasado, hoy o futuro). Se ve en el detalle del día de los mapas de actividad (Tareas, Finanzas) y en la franja de Hábitos.
- Las insignias ya ganadas no cambian.

### Gastos anuales prorrateados (idea 3)
- Store `gastos_anuales` (keyPath `id`) con { id, nombre, monto (CLP), mes (1–12), dia (1–31), sobreId, activo, createdAt }. Eventos `gasto_anual_creado`, `gasto_anual_editado`, `gasto_anual_eliminado` (modulo 'finanzas').
- Cada gasto anual se apoya en un sobre propio de Finanzas (se crea al crear el gasto, con el mismo nombre). El arrastre de saldos de sobres que ya existe (opción A: el saldo pasa de mes a mes) hace de alcancía: lo apartado se acumula solo.
- "Apartar este mes" = (monto − saldo actual del sobre) / meses que faltan hasta el vencimiento, contando el mes en curso; nunca negativo. Se muestra como sugerencia y se usa como presupuesto del sobre al crear el gasto y al empezar cada mes. Si Benjamin cambia el presupuesto del sobre a mano, se respeta.
- Al vencer: aviso en Hoy desde 30 días antes si el saldo del sobre no alcanza (rojo solo si faltan 7 días o menos y no alcanza; antes, ámbar). Pagarlo es un gasto normal desde ese sobre; después el ciclo sigue para el año siguiente.
- Eliminar un gasto anual no borra su sobre (se archiva como cualquier sobre, con su historial).

### Catálogo (N7, N8)
- N8 Windshield wipers: calistenia, core, avanzado, aislamiento, con todos los campos que tienen las demás fichas (nivel, prerrequisitos, progresionDe, criterioAvance, equipo, patronMovimiento, tipoMovimiento, técnica, errores comunes) y una progresión previa razonable dentro del catálogo.
- N7 Puente de glúteo a una pierna: ya existe; comparar su ficha con la propuesta (buscar en docs/) y completar solo lo que falte.

## Reglas
- Toda mutación pasa por db y emite logEvent; eventos nuevos con su caso en applyRemoteEvent y en el mapa de MIRROR_STORES. Los stores tienen que poder reconstruirse desde `events`.
- IndexedDB: una sola subida de versión en este plan (DB_VERSION 6) en A1, creando `dias` y `gastos_anuales` juntos. La migración solo crea stores. Probar abrir con una base v5 llena (datos demo) y confirmar que nada se pierde. Usar el aviso de varias ventanas que ya existe.
- Supabase: las tablas espejo `dias` y `gastos_anuales` (id, user_id, data jsonb, updated_at, PK user_id+id, RLS user_id = auth.uid()) con grant a authenticated y a service_role. Aplicarlas con la CLI ya logueada (proyecto dgnjoawfaizmbrekxauq) y dejar el SQL en supabase/migrations/. Si la CLI pide algo, avisar en una línea.
- Ambos stores nuevos van a STORES_RESPALDO.
- Fechas con utils/fecha.js, números con utils/numero.js, montos con utils/currency.js, escape con utils/escape.js. Repintados tras await con js/core/vista-activa.js.
- Modales con .modal-overlay + open. Ids antes de cualquier await.
- MK III: violeta Tareas/Hábitos, ámbar Finanzas, cian Entreno, rojo solo alertas reales. Chaflán solo en tarjetas principales; el resto recto.
- Archivos nuevos a PRECACHE_URLS; CACHE_NAME en cada commit con código. La tabla de Estado nunca lleva el hash del commit que la edita.
- QA Playwright de a una, a 375 y 1280, un solo servidor, en primer plano, navegador cerrado al final. Antes de cada tanda medir la memoria: si hay menos de 800 MB libres, parar y avisar.

## Fases

### A1 · Días: datos (DB v6)
- DB_VERSION 6 con `dias` y `gastos_anuales`. db: getDia(fecha), getDias(desde, hasta), guardarDia({ fecha, descanso, nota }) (borra si queda vacío), esDescanso(fecha).
- Validaciones: descanso solo hoy o futuro; nota recortada y máx. 140.
- Replay, MIRROR_STORES, STORES_RESPALDO, tablas espejo en Supabase (con grants).
- Verificación: base v5 llena abre sin pérdidas; crear/editar/borrar; replay en segundo contexto; respaldo exportar/importar.

### A2 · Días: racha y hábitos
- calcularRachaConVidas recibe también los días de descanso y los salta según la decisión. Tabla de casos en consola: descanso entre dos días activos, descanso + actividad, dos descansos seguidos, descanso hoy, descanso sin racha previa, vidas intactas.
- Hábitos: racha por hábito, días perfectos y % de cumplimiento ignoran los días de descanso. Laboratorio de Hábitos igual.
- Verificación: los números del Laboratorio y de Hábitos cuadran con un cálculo aparte en consola.

### A3 · Días: interfaz
- Hoja "Día" (modal-overlay): fecha, interruptor "Descanso planificado" (deshabilitado con explicación en días pasados si está apagado), nota de 140 con contador, Guardar.
- Se abre desde: Hoy (botón chico "Día" en el encabezado o en la tarjeta contextual), tocar un día en los mapas de actividad de Tareas y Finanzas, y tocar un día en la franja semanal de Hábitos (sin perder el toque actual de marcar: usar mantener presionado o un ícono de nota).
- Mapas de actividad y franja: día de descanso rayado y neutro; día con nota con un punto chico; el detalle del día muestra la nota.
- Anillo de racha: línea "N descansos este mes" si hay alguno.
- Verificación: marcar descanso hoy y ver que la racha no se corta al día siguiente sin actividad (adelantar el reloj en la prueba); nota visible en los tres lugares; Atrás con la hoja abierta.

### B1 · Gastos anuales: datos
- db: getGastosAnuales(), crearGastoAnual (crea su sobre), editarGastoAnual, eliminarGastoAnual (archiva el sobre, no lo borra), apartarSugerido(gasto, hoy).
- Replay, MIRROR_STORES, STORES_RESPALDO (el store y su tabla espejo ya existen desde A1).
- Verificación: tabla de casos de apartarSugerido (vence en 12 meses, en 1 mes, ya cubierto, vencido este mes, sobre con saldo negativo); replay; respaldo.

### B2 · Gastos anuales: interfaz en Finanzas
- Sección "Anuales" en Finanzas (en la pestaña donde viven los sobres o recurrentes, la que encaje mejor): una fila por gasto con nombre, fecha, barra de avance (saldo del sobre / monto, ámbar), y "Apartar este mes: $X".
- Formulario (modal-overlay): nombre, monto, día y mes. Editar y eliminar (ConfirmDialog).
- Al empezar un mes, el presupuesto del sobre se ajusta a la sugerencia salvo que se haya cambiado a mano ese mes.
- Verificación: crear "Patente" $180.000 en marzo y "Seguro" $240.000 en diciembre; sugerencias correctas; números es-CL; Atrás con el formulario abierto.

### B3 · Gastos anuales: avisos y Laboratorio
- Hoy: aviso desde 30 días antes si el sobre no alcanza (ámbar; rojo a 7 días o menos). Un solo aviso agrupado si hay varios.
- Laboratorio de Finanzas: línea "Anuales: $X apartado de $Y".
- Verificación: adelantar el reloj para ver el aviso ámbar y el rojo; desaparece cuando el sobre alcanza.

### C1 · Catálogo N7 y N8
- N8 nuevo con ficha completa; N7 revisado. Que aparezcan en el buscador, en el árbol de progresión y en el generador cuando corresponda por nivel y equipo.
- Verificación: buscar ambos, abrir su ficha, ver su lugar en el árbol; una rutina generada de nivel avanzado puede incluir N8.

### C2 · QA final y docs
- Recorrido completo a 375 y 1280 de Días, Gastos anuales y catálogo; regresión de racha, Hábitos, Finanzas (sobres y arrastre) y respaldo.
- docs/PLAN.md: ideas 1, 2 y 3 y N7/N8 a "Hecho"; Recordatorios anotado "en pausa". CHANGELOG al día.

## Estado
| Fase | Commit | Caché |
|---|---|---|
| A1 Días: datos | 7042737 | v303 |
| A2 Días: racha y hábitos | 9fd0315 | v304 |
| A3 Días: interfaz | bda8a19 | v305 |
| B1 Gastos anuales: datos | | v306 |
| B2 Gastos anuales: interfaz | | |
| B3 Gastos anuales: avisos y Laboratorio | | |
| C1 Catálogo N7 y N8 | | |
