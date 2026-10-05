# Tareas — Dificultad y Foco (Pomodoro)

Base: rama worktree-dashboard-mk3, commit 1773b9a, CACHE_NAME v281.
Origen: docs/PLAN.md › Pendiente › Dificultad de tareas y Pomodoro.

## Decisiones (5 oct 2026)
- Dificultad solo en tareas de Lista (store `tareas`), no en ítems rápidos del planificador. Valores: `facil` | `media` | `dificil`. Las tareas sin el campo se leen como `media` al calcular, sin migrar ni escribir nada.
- Peso para métricas: fácil 1, media 2, difícil 3 ("puntos").
- Foco = temporizador de 25 min de trabajo + 5 min de pausa, ligado a una tarea de Lista. Duraciones fijas en esta versión (sin ajustes).
- Solo se registra un foco completo: evento `foco_completado` { tareaId, minutos: 25, fecha }. Cancelar no registra nada. El evento no toca ningún store (como `rutina_generada`): las métricas se derivan del log.
- El foco no suma a la racha global (completar la tarea ya suma).
- El temporizador sobrevive a recargar y a cambiar de vista: guarda la hora de término en localStorage (con try/catch); al volver, retoma o, si ya terminó, ofrece registrarlo.
- Sin notificaciones push (eso es el plan de Recordatorios). Al terminar con la app abierta: sonido (audio.js), vibración si existe y aviso.

## Reglas que aplican
- Toda mutación pasa por db y emite logEvent; cada evento nuevo lleva su caso en applyRemoteEvent (sync.js) y, si toca un store, en el mapa de MIRROR_STORES. Los stores derivados tienen que poder reconstruirse desde `events`.
- Fechas con utils/fecha.js (nunca toISOString para claves de día). Números con utils/numero.js. Escapar con utils/escape.js.
- Modales con .modal-overlay + open (Atrás de Android vía history.js). Capturar ids antes de cualquier await.
- Archivos nuevos a PRECACHE_URLS; subir CACHE_NAME en cada commit con código. Imports relativos con .js; solo db.js importa idb.js (excepción documentada: sync.js).
- Acentos MK III: violeta = Tareas/Hábitos, cian = Entreno, ámbar = Finanzas, rojo solo alertas reales.
- La tabla de Estado nunca lleva el hash del commit que la edita; el commit de cierre no tiene fila propia.
- Un commit por fase; parar al final de cada tanda o ante fallas o decisiones. QA Playwright de a una, a 375 y a 1280, con consola y ESLint limpios. Informe con tabla de commit y caché, resultado de cada verificación y lo que no se pudo cumplir.

## Fases

### F1 · Dificultad: datos y formulario
- Campo `dificultad` en saveTask/updateTask; viaja en el payload de tarea_creada / tarea_actualizada (el replay ya hace mergeRow con el payload; confirmarlo).
- Formulario de tarea (task-form.js): selector de 3 chips "Fácil · Media · Difícil" bajo la prioridad, con la misma estética de los chips de estado. Sin elegir = sin campo (se lee como media).
- La captura rápida no pide dificultad.
- Verificación: crear, editar y releer; tarea vieja sin campo abre con "Media" sugerida pero no guarda nada si no se toca; replay en un segundo contexto con applyRemoteEvent.

### F2 · Dificultad: dónde se ve
- Tarjetas de Lista y filas de Semana (detalle y columnas): marca chica de dificultad solo si es `facil` o `dificil` (la media no se marca, para no meter ruido). Texto corto "FÁCIL" / "DIFÍCIL" en mono, color texto secundario; nunca rojo.
- Laboratorio de Tareas: además de tareas completadas, "puntos completados" por semana (últimas 8 semanas) con el peso 1/2/3, derivado de tarea_completada + dificultad actual de la tarea.
- Hoy: sin cambios en esta fase.
- Verificación: las marcas no rompen la fila de columnas de Semana (2 líneas máximo) a 900 y 1280; puntos de la semana cuadran con un cálculo a mano en consola.

### F3 · Foco: temporizador
- Botón "Foco 25 min" en el detalle de una tarea de Lista que no esté hecha, y en el menú ⋯ de las tareas de Lista en Semana.
- Pantalla de foco (modal-overlay a pantalla completa): nombre de la tarea, cuenta regresiva grande en mono, anillo de progreso, "Pausar/Seguir" y "Terminar". Wake lock mientras corre (mismo patrón que el HUD de Entreno). Atrás pregunta antes de cancelar.
- Al llegar a 0: registra `foco_completado`, sonido + vibración, y pasa a la pausa de 5 min con "Saltar pausa" y "Otro foco". Al terminar la pausa, vuelve al detalle de la tarea.
- Estado en localStorage { tareaId, fase, terminaEn, pausadoRestante }. Si la app se abre con un foco vencido mientras estaba cerrada: aviso "Terminaste un foco de 25 min en <tarea>" y se registra con la hora de término real.
- Un solo foco a la vez: si hay uno corriendo, Hoy muestra una línea "Foco en <tarea> · 12:40" que lo abre.
- Verificación: completar un foco (acelerar el reloj en la prueba), pausar/seguir, terminar antes (no registra), recargar a mitad, cerrar y volver después del término, Atrás con el foco abierto.

### F4 · Foco: registro y métricas
- Bitácora de la tarea: "Foco · 25 min" por cada foco_completado (getBitacoraEntidad ya lee el log; agregar la etiqueta).
- Detalle de la tarea: "N focos · X min" si tiene alguno.
- Laboratorio de Tareas: minutos de foco por semana (últimas 8) y la tarea con más foco del mes.
- Verificación: los números coinciden con los eventos en consola; tarea eliminada con focos no rompe Laboratorio.

### F5 · QA final y docs
- Recorrido completo a 375 y 1280: crear tarea difícil, hacer un foco, completarla, revisar Lista, Semana, Hoy y Laboratorio.
- Respaldo: exportar e importar conserva dificultad y focos.
- docs/PLAN.md: mover Dificultad y Pomodoro a "Hecho". CHANGELOG al día.

## Estado
| Fase | Commit | Caché |
|---|---|---|
| F1 Dificultad: datos y formulario | ef75014 | v282 |
| F2 Dificultad: dónde se ve | 7cbe25a | v283 |
| F3 Foco: temporizador | da6be3b | v284 |
| F4 Foco: registro y métricas | 8b656d6 | v286 |
