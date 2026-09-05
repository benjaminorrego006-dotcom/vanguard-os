# Pendientes del code review

De los 10 hallazgos del code review previo a la tanda de UX móvil, los 2
críticos ya se arreglaron (`93eab65` — captura rápida de Inicio mandaba
tareas con números a Finanzas; `b99d1b8` — tocar un sobre en Finanzas >
Cuentas tiraba TypeError). Quedan estos 8 sin tocar.

## 1. Crear una tarea ya marcada "Hecho" no cuenta como completada

**Archivo:** `js/core/db.js:1980` (función `saveTask`)

El chip de estado en el formulario de tarea solo llama a
`db.updateTaskStatus` cuando la tarea YA existe (tiene `id`). Si la tarea es
nueva, tocar "Hecho" y después "Guardar" la crea directo con `saveTask`, que
nunca pone `completedAt` ni emite el evento `tarea_completada` vía
`logEvent`. La tarea se ve como hecha en la lista pero no cuenta en la
racha, la tasa de cumplimiento ni el mapa de calor de Tareas.

## 2. Captura rápida ambigua entre sobres: toma el primero sin avisar

**Archivo:** `js/views/dashboard.js:437` (línea `const env = parsed.matches[0] || null;`)

Si el texto de captura rápida de Inicio matchea el nombre de más de un
sobre (ej. sobres "Auto" y "Autopista", texto "15000 en auto"), se asigna
al primero del array sin pedir confirmación — a diferencia del flujo
equivalente en Finanzas, que abre el formulario completo para que el
usuario desambigüe a mano.

## 3. `getProgressionLevel()` dejó de matchear por substring

**Archivo:** `js/core/progresiones.js:113`

La función pasó de comparar por substring a comparar por igualdad exacta
de nombre. Un ejercicio con espacio extra, una variante tipeada a mano, o
un alias viejo que antes matcheaba por substring ahora no matchea nada — el
chip "Nv.X/Y" desaparece en silencio de la sesión de rutina.

## 4. Botón de cerrar del modal de tarea recurrente sin aria-label

**Archivo:** `js/components/recurring-task-form.js:17`

El botón usa la clase propia `btn-close-recurring-task` en vez de
`btn-close-modal`. `initModalAccessibility()` en `app.js` cubre
genéricamente todo botón `.btn-close-modal` con `aria-label="Cerrar"` —
este archivo, al no usar esa clase, deja a un usuario de lector de
pantalla llegando a la "×" sin escuchar qué hace.

## 5. Voseo reintroducido en un archivo nuevo

**Archivo:** `js/components/hiit-rutina-form.js:43`

El texto de ayuda dice "Dejalo vacío si es solo un temporizador" en vez de
"Déjalo". La conversión de voseo a tuteo (commit `f651ea1`) se hizo a mano
sin un diccionario de copy compartido, así que este archivo, agregado
después, ya viola la convención establecida.

## 6. Editar una meta no resetea "Monto inicial"

**Archivo:** `js/components/goal-form.js:227-239` (rama `if (goal)` de `__openGoalForm`)

La rama que llena el formulario para una meta existente nunca toca el
campo `goal-initial` — solo la rama de meta nueva (línea 246) lo resetea a
`'0'`. Si se crea una meta escribiendo algo en "Monto inicial" y después se
edita una meta distinta ya existente, el campo sigue mostrando ese valor
viejo. Es solo visual (al guardar se descarta y se usa el `currentAmount`
real), pero confunde mientras se edita.

## 7. 18 llamadas secuenciales a `getBudget` en los cálculos de Análisis

**Archivo:** `js/core/db.js:1407` (`getMesesSinExceder`) y las funciones
vecinas `getTendenciaAhorro`, `getCategoriasFueraDeRango`

Cada una de estas funciones hace su propio loop de llamadas secuenciales a
`getBudget` por mes, re-ejecutando el procesamiento de recurrentes cada
vez. Cada render de Análisis > Finanzas > Hitos (o cuando vence el TTL de
5s del caché) dispara hasta 18 lecturas/escrituras de IndexedDB repetidas
para meses ya procesados — I/O evitable con `Promise.all` o un solo pase
sobre las transacciones.

## 8. `saveGeneradorConfig` tiene su propia lista de equipo hardcodeada

**Archivo:** `js/core/db.js:1081`

La función valida `equipoDisponible` contra un array de strings escrito a
mano ahí mismo, en vez de derivarlo de `EQUIPO_OPCIONES` (la fuente real
que arma la UI del selector). Si se agrega una opción nueva a
`EQUIPO_OPCIONES` — el lugar obvio para hacerlo — el checkbox se ve bien
pero `saveGeneradorConfig` la filtra en silencio del array guardado en cada
guardado, perdiendo el dato sin ningún error visible.
