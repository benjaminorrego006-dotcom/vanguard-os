# Pendientes del code review

De los 10 hallazgos del code review previo a la tanda de UX móvil, los 2
críticos se arreglaron primero (`93eab65` — captura rápida de Inicio mandaba
tareas con números a Finanzas; `b99d1b8` — tocar un sobre en Finanzas >
Cuentas tiraba TypeError). Los 8 restantes están cerrados. Revisado contra el
código el 27 sept 2026 (`CACHE_NAME` v230).

## Abiertos (encontrados al cerrar #6 y #7, sin corregir)

### 9. El replay de una meta por sesiones la deja sin progreso

**Archivos:** `js/core/db.js` (registro de sesión, `meta_progreso_agregado`
con `automatico: true`) y `js/core/sync.js` (su caso en `applyRemoteEvent`)

Los aportes automáticos de una meta por sesiones (`autoTrack`) se registran
con `{ amount: 1, automatico: true, sesionId }`, sin `currentAmount`. El
replay de `meta_progreso_agregado` copia `payload.currentAmount`, así que en
otro dispositivo (o al reconstruir desde el log) la meta queda sin progreso:
con el respaldo de 3 meses, "36 entrenamientos" pasa de 32/36 a 0/36.

### 10. Guardar un gasto y salir de Finanzas enseguida lanza un TypeError

**Archivo:** `js/components/GastoForm.js` (confirmación visual tras guardar)

Después de `await` del guardado, el formulario busca `#gasto-confirm-overlay`
y le cambia `style` sin comprobar que siga en el DOM. Si la vista cambia
antes de que termine el guardado (en la prueba, a los 300 ms), la consola
muestra "Cannot read properties of null (reading 'style')". El gasto sí se
guarda.

## Resueltos

| # | Hallazgo | Commit |
|---|---|---|
| 1 | Crear una tarea ya marcada "Hecho" no contaba como completada (`saveTask` sin `completedAt` ni `tarea_completada`) | `e44a38d` |
| 2 | Captura rápida de Inicio ambigua entre sobres tomaba el primero sin avisar | `fadd2e6` (ahora ofrece elegir el sobre inline) |
| 3 | `getProgressionLevel()` dejó de matchear por substring | `0e12f0c` (compara por nombre normalizado —espacios y tildes— y prioriza el id del ejercicio) |
| 4 | Botón de cerrar del modal de tarea recurrente sin `aria-label` | Obsoleto: `2c3f93e` eliminó las tareas recurrentes y `recurring-task-form.js` |
| 5 | Voseo "Dejalo vacío" en `hiit-rutina-form.js` | `bf8ef28` (barrido de tuteo en toda la app) |
| 6 | Editar una meta no conservaba ni aplicaba "Monto inicial" (mostraba 0 y cambiarlo no hacía nada) | `6959ee6` (se guarda `montoInicial`; editar lo conserva y, si cambia, recalcula el progreso sin tocar los aportes) |
| 7 | 18 llamadas a `getBudget` (127 lecturas de IndexedDB) al abrir Laboratorio > Finanzas > Hitos | Commit "Laboratorio: Hitos reutiliza el presupuesto de cada mes (#7)" (7 llamadas y 50 lecturas; caché por render que se invalida con cada evento) |
| 8 | `saveGeneradorConfig` validaba el equipo contra una lista hardcodeada | `f16a95a` (valida contra `EQUIPO_OPCIONES` y avisa en consola lo descartado) |
