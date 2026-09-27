# Pendientes del code review

De los 10 hallazgos del code review previo a la tanda de UX móvil, los 2
críticos se arreglaron primero (`93eab65` — captura rápida de Inicio mandaba
tareas con números a Finanzas; `b99d1b8` — tocar un sobre en Finanzas >
Cuentas tiraba TypeError). De los 8 restantes, 6 ya están cerrados y quedan
2 abiertos. Revisado contra el código el 27 sept 2026 (`CACHE_NAME` v220).

## Abiertos

### 6. Editar una meta no resetea "Monto inicial"

**Archivo:** `js/components/goal-form.js` (rama `if (goal)` de `__openGoalForm`)

La rama que llena el formulario para una meta existente nunca toca el
campo `goal-initial` — solo la rama de meta nueva lo resetea a `'0'`. Si se
crea una meta escribiendo algo en "Monto inicial" y después se edita una
meta distinta ya existente, el campo sigue mostrando ese valor viejo. Es
solo visual (al guardar se descarta y se usa el `currentAmount` real), pero
confunde mientras se edita.

### 7. Llamadas secuenciales a `getBudget` en los cálculos de Laboratorio

**Archivo:** `js/core/db.js` (`getMesesSinExceder`, `getTendenciaAhorro`,
`getCategoriasFueraDeRango`)

Cada una de estas funciones hace su propio loop de llamadas secuenciales a
`getBudget` por mes, re-ejecutando el procesamiento de recurrentes y, desde
el arrastre de sobres, el cálculo de saldos con arrastre cada vez. Un render
de Laboratorio > Finanzas puede disparar hasta 18 lecturas de IndexedDB
repetidas para meses ya procesados — I/O evitable con un solo pase sobre las
transacciones.

## Resueltos

| # | Hallazgo | Commit |
|---|---|---|
| 1 | Crear una tarea ya marcada "Hecho" no contaba como completada (`saveTask` sin `completedAt` ni `tarea_completada`) | `e44a38d` |
| 2 | Captura rápida de Inicio ambigua entre sobres tomaba el primero sin avisar | `fadd2e6` (ahora ofrece elegir el sobre inline) |
| 3 | `getProgressionLevel()` dejó de matchear por substring | `0e12f0c` (compara por nombre normalizado —espacios y tildes— y prioriza el id del ejercicio) |
| 4 | Botón de cerrar del modal de tarea recurrente sin `aria-label` | Obsoleto: `2c3f93e` eliminó las tareas recurrentes y `recurring-task-form.js` |
| 5 | Voseo "Dejalo vacío" en `hiit-rutina-form.js` | `bf8ef28` (barrido de tuteo en toda la app) |
| 8 | `saveGeneradorConfig` validaba el equipo contra una lista hardcodeada | `f16a95a` (valida contra `EQUIPO_OPCIONES` y avisa en consola lo descartado) |
