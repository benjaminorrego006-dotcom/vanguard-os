# Refundación del sistema de entrenamiento

Reemplaza el alcance de `PLAN-CATALOGO.md` y `PROMPTS-CATALOGO.md`. La
diferencia: no se trata de agregar ejercicios sueltos, sino de **reestructurar
todo el catálogo** y **sustituir las plantillas fijas por rutinas generadas
según la progresión del usuario**, en las tres modalidades (gym, calistenia,
cardio/HIIT).

---

## ⚠ Lo que hay que saber antes de empezar

### Las sesiones guardan el NOMBRE, no el id

Verificado en `db.js`:

- línea 841 — las sesiones guardan `ejercicios: [{nombre, series}]`
- líneas 865 y 996 — el historial busca por `nombre.toLowerCase()`
- líneas 1395, 1428, 1459 — la metadata se resuelve por nombre

**Consecuencia: renombrar un ejercicio existente borra el historial del
usuario para ese ejercicio.** PRs, progresión, volumen por grupo muscular,
detección de deload — todo deja de encontrarlo.

Regla dura para todo este plan:

> Los 54 `nombre` actuales **no se tocan**. Se enriquecen con campos nuevos,
> nunca se renombran. Si algún nombre es realmente malo, se hace una
> migración explícita del historial, en un commit aparte, y se verifica antes
> y después.

Corolario: **arreglar esto es la etapa 1**. Mientras el historial dependa de
strings, cualquier reorganización del catálogo es frágil.

### Borrar plantillas ≠ borrar rutinas del usuario

`PLANTILLAS` en `plantillas.js` son moldes de solo lectura. Cuando el usuario
usa una, se crea una **rutina propia** en IndexedDB, con los nombres ya
resueltos. Esas rutinas son sus datos.

Borrar las plantillas no las afecta. Pero hay que confirmarlo con datos
reales, no asumirlo.

---

## ETAPA 1 — Estabilizar la identidad del ejercicio

**Antes que nada.** Sin esto, todo lo demás se construye sobre arena.

Objetivo: que el historial se vincule por `ejercicioId` estable, no por
nombre.

- Añadir `ejercicioId` a las entradas de sesión nuevas, resolviéndolo desde el
  catálogo al guardar.
- Mantener `nombre` para compatibilidad — **no lo quites**, las sesiones
  viejas solo tienen eso.
- Las funciones de historial deben buscar primero por `ejercicioId` y caer a
  nombre si no está (sesiones anteriores a este cambio).
- Migración perezosa: al leer una sesión vieja, resolver el id por nombre y
  guardarlo. Nunca en un batch masivo al arrancar.

Verificar con datos reales: PRs, racha, heatmap y volumen deben dar
exactamente lo mismo antes y después.

---

## ETAPA 2 — Reestructurar el catálogo completo

Cada uno de los 54 ejercicios existentes se **enriquece**, no se reemplaza.

Campos nuevos para todas las entradas:

| Campo | Qué es |
|---|---|
| `nivel` | `principiante` / `intermedio` / `avanzado` / `todos` |
| `prerequisitos` | ids de ejercicios que deberían dominarse antes (array, vacío si es entrada) |
| `progresionDe` | id del paso anterior en su familia, si aplica |
| `criterioAvance` | qué hay que lograr para pasar al siguiente (reps, segundos, series) |
| `tambienEn` | categorías adicionales (burpees → `['hiit']`) |
| `equipo` | qué hace falta (`ninguno`, `barra`, `mancuernas`, `banda`, `anillas`, `cajon`, `kettlebell`, `maquina`) |
| `patronMovimiento` | empuje horizontal / empuje vertical / tracción horizontal / tracción vertical / rodilla / cadera / core / locomoción |

`equipo` y `patronMovimiento` no estaban en el plan anterior y son
imprescindibles para el generador de la Etapa 4: sin `equipo` genera rutinas
con material que el usuario no tiene, y sin `patronMovimiento` no puede
equilibrar empuje contra tracción.

Después se agregan las ~36 entradas nuevas (pasos de progresión, estáticos,
HIIT) con la misma estructura desde el inicio.

Los datos de nivel y progresión están en `EJERCICIOS-NIVELES.md`.

---

## ETAPA 3 — Árbol de progresión sobre el catálogo nuevo

Ya no hace falta un archivo `progresiones-calistenia.js` aparte: los
prerrequisitos viven en el catálogo. Ese archivo pasa a ser derivado o
desaparece.

Criterios de avance ya investigados:

- **Estáticos:** 10 segundos con forma limpia desbloquea el siguiente paso.
  Excepción: tuck avanzado de planche pide 12-15 s por 3+ series.
- **Dinámicos:** 15 flexiones / 5 dominadas / 20 sentadillas para intermedio;
  25 / 10 / negativas de pistol para avanzado.
- **Gym:** múltiplos de peso corporal (tabla en `EJERCICIOS-NIVELES.md`).

El árbol cubre las tres modalidades, no solo calistenia.

---

## ETAPA 4 — Generador de rutinas (el cambio grande)

Sustituir las plantillas fijas por rutinas generadas según dónde está el
usuario.

### Qué necesita como entrada

1. **Nivel derivado por patrón de movimiento**, no un nivel global. Alguien
   puede ser intermedio en empuje y principiante en tracción — de hecho es lo
   normal. Un nivel único promedia y miente.
2. **Equipo disponible.** Hay que preguntarlo; no se puede derivar.
3. **Días por semana** y duración objetivo de sesión.
4. **Historial reciente** para no repetir lo mismo ni ignorar lo que no se
   entrena hace un mes.

### Qué debe respetar

- Equilibrio empuje/tracción. Es el error clásico de las rutinas
  autogeneradas.
- No proponer ejercicios cuyos prerrequisitos no estén cumplidos.
- Frecuencia por grupo muscular coherente con los días disponibles.
- Progresión entre semanas, no la misma rutina indefinidamente.

### Qué NO debe hacer

- No generar en silencio: mostrar **por qué** eligió cada ejercicio. Una caja
  negra que escupe rutinas es peor que una plantilla fija, porque el usuario
  no puede corregirla.
- No bloquear la edición manual. La rutina generada es un punto de partida.

### Sobre borrar las plantillas

Antes de borrar `plantillas.js`:

1. Confirmar con datos reales que ninguna rutina del usuario depende de él en
   tiempo de ejecución.
2. Tener el generador **funcionando**, no a medias. Si se borran las
   plantillas y el generador falla, el usuario se queda sin ninguna forma de
   empezar una rutina.
3. Considerar conservar 2-3 plantillas de emergencia como respaldo para el
   caso de que el generador no pueda producir nada (usuario sin historial y
   sin equipo declarado).

Mi recomendación: **generador primero, borrado de plantillas después**, en
commits separados y con el generador ya probado.

---

## ETAPA 5 — Estándares de fuerza (GYM)

Sin cambios respecto al plan anterior. Ver `PROMPTS-CATALOGO.md` etapa 4.
Sigue pendiente elegir fuente (ExRx o Strength Level) y decidir si se pide
sexo.

Nota: el peso corporal que necesita esta etapa es el mismo que necesita el
generador. Conviene resolverlo una sola vez, en el perfil.

---

## Orden y por qué

```
1. Identidad estable del ejercicio     ← sin esto todo lo demás es frágil
2. Reestructurar + completar catálogo  ← depende de 1
3. Árbol sobre el catálogo nuevo       ← depende de 2
4. Generador de rutinas                ← depende de 2 y 3
5. Estándares de fuerza                ← independiente, puede ir en paralelo
6. Borrar plantillas                   ← solo cuando 4 esté probado
```

## Riesgo principal

Este plan toca la capa de datos de un módulo completo en una app local sin
backend. Si algo corrompe el historial, no hay servidor de donde recuperarlo.

**Exportar el respaldo (Finanzas → Ajustes → Exportar datos) antes de empezar
la Etapa 1, y de nuevo antes de la Etapa 4.** El tag de git respalda el
código, no los datos del navegador.
