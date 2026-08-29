# Instrucciones para Claude Code — Módulo Entrenamiento

Un prompt por etapa. Pegar de a uno, **en orden**. Cada etapa es un commit y
la siguiente depende de que la anterior esté cerrada y verificada.

Guarda antes en el repo: `EJERCICIOS-NIVELES.md`, `PLAN-REFUNDACION.md`.

**Antes de la Etapa 1: exporta el respaldo desde la app** (Finanzas → Ajustes
→ Exportar datos). Respalda toda la app, no solo Finanzas. El tag de git cubre
el código; los datos de IndexedDB no.

---

## Cabecera común

Va **al principio de cada prompt**, sin excepción:

```
ALCANCE: solo el módulo Entrenamiento. No toques vistas, componentes ni
lógica de Finanzas ni Tareas. db.js es compartido por los tres módulos: si un
cambio ahí afecta funciones de finanzas o tareas, PARA y avísame antes.

Reglas: Vanilla JS + ES Modules sin bundlers, imports relativos con .js.
IndexedDB solo vía db.js. Toda mutación emite logEvent(); los agregados
(racha, heatmap, insignias) se derivan del log, nunca se guardan aparte.
MK III: cian (--cy) para Entreno, chaflanes vía clip-path, monoespaciada,
sin border-radius, sin sombras, rojo solo para alertas reales. Reasignar
listeners tras cada render. Archivos nuevos → PRECACHE_URLS y subir
CACHE_NAME. VanguardOS_Claude_Spec.md está desactualizado, no lo sigas.

Una tarea a la vez, commit propio, parar y esperar confirmación. No lances
agentes en paralelo.
```

---

# ETAPA 1 — Identidad estable del ejercicio

**La más delicada de todo el plan. Si sale mal, el usuario pierde su
historial.**

```
[CABECERA COMÚN]

ETAPA 1 — Vincular el historial por ejercicioId en vez de por nombre

EL PROBLEMA
Las sesiones guardan el nombre del ejercicio, no su id:
  - db.js:841  → ejercicios: [{nombre, series}]
  - db.js:865  → busca con e.nombre.toLowerCase() === ejercicioNombre.toLowerCase()
  - db.js:996  → misma búsqueda por nombre
  - db.js:1395, 1428, 1459 → getEjercicioMetadata(ej.nombre)

Consecuencia: renombrar cualquier ejercicio del catálogo BORRA el historial
del usuario para ese ejercicio — PRs, progresión, volumen, deload. Sin esto
resuelto, no podemos reestructurar el catálogo sin riesgo.

QUÉ HACER

a) Al guardar una sesión, resolver y almacenar `ejercicioId` junto al nombre.
   NO quites `nombre`: las sesiones ya guardadas solo tienen eso.
   Estructura objetivo: {ejercicioId, nombre, series}

b) Las funciones de historial buscan primero por ejercicioId; si la entrada no
   lo tiene (sesión vieja), caen a la comparación por nombre actual. Ambos
   caminos deben convivir indefinidamente — no asumas que todas las sesiones
   se migrarán.

c) Migración PEREZOSA: al leer una sesión sin ejercicioId, resolverlo desde el
   catálogo por nombre y persistirlo. NUNCA un batch masivo al arrancar: con
   historial grande bloquearía el arranque de la app.

d) Si un nombre viejo no resuelve a ningún id del catálogo (ejercicio
   personalizado que el usuario escribió a mano), NO lo descartes ni lo
   inventes. Debe seguir funcionando por nombre. Dime cuántos casos así
   encuentras.

VERIFICACIÓN OBLIGATORIA — antes y después, con datos reales:
  - PRs por ejercicio: mismos valores
  - Racha y heatmap: mismos valores
  - Volumen por grupo muscular: mismo
  - Historial de un ejercicio concreto: mismas sesiones

Si algún número cambia, algo se rompió. Repórtalo, no lo maquilles.

Propón el enfoque y dime qué funciones vas a tocar ANTES de escribir código.
```

---

# ETAPA 2 — Reestructurar el catálogo

Va en cuatro pegadas. No las juntes: son ~36 entradas nuevas más 54
enriquecidas.

## 2a — Enriquecer los 54 existentes

```
[CABECERA COMÚN]

ETAPA 2a — Enriquecer las entradas existentes del catálogo

REGLA DURA: los 54 `nombre` actuales NO SE TOCAN. Se enriquecen con campos
nuevos, nunca se renombran. El historial depende de esos strings (ver Etapa 1).

Lee EJERCICIOS-NIVELES.md: tiene los 54 clasificados con justificación.

CAMPOS A AGREGAR a cada entrada de js/core/ejercicios-catalogo.js:

  nivel             'principiante' | 'intermedio' | 'avanzado' | 'todos'
  prerequisitos     [ids] — qué dominar antes. [] si es entrada de su familia
  progresionDe      id del paso anterior en su familia, o null
  criterioAvance    { tipo: 'reps'|'segundos'|'ratio', valor, series }
  tambienEn         categorías adicionales, ej. ['hiit']. [] si no aplica
  equipo            'ninguno'|'barra'|'mancuernas'|'banda'|'anillas'|'cajon'|
                    'kettlebell'|'maquina'|'banco'|'barra-dominadas'
  patronMovimiento  'empuje-horizontal'|'empuje-vertical'|'traccion-horizontal'|
                    'traccion-vertical'|'rodilla'|'cadera'|'core'|'locomocion'

Los dos últimos son imprescindibles para el generador de la Etapa 4: sin
`equipo` generaría rutinas con material que el usuario no tiene, y sin
`patronMovimiento` no puede equilibrar empuje contra tracción.

'todos' en nivel es para ejercicios donde la carga define la dificultad, no el
movimiento: sentadilla con barra, press de banca, curls, máquinas.

DOS CASOS QUE PARECEN RAROS Y SON CORRECTOS:
- 'dominadas' (gym) es 'intermedio', NO 'todos'. La primera dominada estricta
  es un hito, no un punto de partida.
- 'fondos en paralelas' es 'intermedio'. Un principiante empieza en banco.

Si dudas del nivel de alguno, PREGÚNTAME. No lo asignes por tu cuenta.

Cambio puramente aditivo: nada que lea el catálogo hoy debe romperse.

AL TERMINAR: script que verifique que los 54 tienen los 7 campos, sin valores
fuera de enum. Dime el conteo por nivel, por equipo y por patrón.
```

## 2b — Pasos de progresión que faltan

```
[CABECERA COMÚN]

ETAPA 2b — Agregar los pasos de progresión que el árbol ya menciona

progresiones-calistenia.js declara 25 pasos y 16 NO existen en el catálogo.
getProgressionLevel() los resuelve por fuzzy match, así que "funciona", pero
no tienen ficha: sin instrucciones ni errores comunes. Es el 72% del árbol.

AGREGAR (categoria: 'calistenia', con los 7 campos de la etapa 2a):

Flexión:     Flexiones en Pared (principiante), Flexiones Inclinadas
             (principiante), Flexiones con Rodillas (principiante),
             Flexiones Declinadas (intermedio), Flexiones de Arquero
             (avanzado), Flexión a Una Mano (avanzado)
Dominada:    Dominadas Isométricas (principiante), Dominada Estricta
             (intermedio), Dominadas Lastradas (avanzado), Dominada a Una
             Mano (avanzado)
Fondo:       Fondos Asistidos (principiante), Fondos en Anillas (avanzado),
             Fondos Lastrados (avanzado), Muscle-up (avanzado)
Sentadilla:  Sentadilla Asistida (principiante), Pistol Squat Asistida
             (intermedio)

SOBRE "Dominada Estricta": ya existe 'dominadas' en gym. Aquí hace falta como
nodo del árbol de calistenia. Decide si duplicar o referenciar la de gym, y
explícame por qué ANTES de hacerlo. Cuidado con el historial: si duplicas, dos
entradas compiten por el mismo nombre.

CRÍTICO: los nombres deben coincidir EXACTAMENTE con los de
progresiones-calistenia.js o getProgressionLevel() dejará de encontrarlos.
Verifica la correspondencia con un script y repórtala.

Mira 2-3 entradas actuales antes de escribir, para copiar el tono y el nivel
de detalle de posturaInicial, pasosEjecucion y erroresComunes.
```

## 2c — Rama de estáticos

```
[CABECERA COMÚN]

ETAPA 2c — Agregar la rama de estáticos

No existe ninguno, y son la razón por la que la gente entrena calistenia. El
árbol hoy no tiene hacia dónde apuntar.

AGREGAR (categoria: 'calistenia', 7 campos):

Front lever:   Tuck Front Lever (intermedio) → Tuck Avanzado Front Lever
               (intermedio) → Straddle Front Lever (avanzado) → Front Lever
               (avanzado)
Planche:       Plancha Lean (intermedio) → Tuck Planche (intermedio) → Tuck
               Avanzado Planche (avanzado) → Straddle Planche (avanzado) →
               Planche (avanzado)
Otros:         Back Lever (intermedio), Crow Pose (principiante), Handstand
               de Cara a la Pared (intermedio), Handstand Libre (intermedio),
               Dragon Flag (intermedio), Bandera Humana (avanzado)
Prerrequisito: Acondicionamiento de Muñeca (principiante)

criterioAvance para todos los estáticos: 10 segundos con forma limpia.
Excepción — Tuck Avanzado Planche: 12-15 segundos por 3+ series.

DATOS PARA LAS FICHAS (ya investigados, úsalos):
- Tuck Avanzado Planche es donde más gente se estanca. La diferencia con el
  tuck normal es la espalda plana en vez de redondeada, lo que aleja el centro
  de masa de las manos y sube la demanda de hombro sustancialmente.
- Acondicionamiento de Muñeca: 2+ meses antes de trabajo serio de planche. Es
  la causa más común de lesión temprana — dilo explícitamente en la ficha.
- erroresComunes de la rama planche: brazos no bloqueados (si el codo se dobla
  no es planche), protracción escapular insuficiente.

prerequisitos de la rama planche debe incluir Acondicionamiento de Muñeca.
```

## 2d — Cardio/HIIT

```
[CABECERA COMÚN]

ETAPA 2d — Poblar la categoría HIIT/Cardio

HIIT tiene 4 ejercicios contra 25 de gym y 25 de calistenia. Y burpees,
escaladores, sentadilla con salto y zancadas saltadas están en 'calistenia'
aunque son movimientos centrales de HIIT: el módulo depende hoy de ejercicios
de otra categoría.

DECISIÓN: usar el campo `tambienEn` de la etapa 2a. NO cambies `categoria` de
esos cuatro — así el código que lee `categoria` sigue funcionando sin
migración. Márcalos con tambienEn: ['hiit'].

AGREGAR (categoria: 'hiit', 7 campos):

Principiante: Rodillas Altas, Talones al Glúteo, Salto a la Comba, Step-ups,
              Plancha Jacks, Medio Burpee
Intermedio:   Saltos al Cajón, Kettlebell Swing, Thrusters, Battle Ropes
Avanzado:     Burpee con Salto Tuck, Burpee Box Jump

"Medio Burpee" (sin flexión ni salto) es importante: es el escalón que falta
entre nada y el burpee completo. Debe ser prerequisito de Burpees.

NO agregues "jumping lunges" — ya existe como Zancadas Saltadas.

Actualiza el filtro de la vista HIIT para considerar `tambienEn` además de
`categoria`. VERIFICA que las vistas de gym y calistenia NO cambien de
comportamiento.
```

## 2e — Chequeo de tamaño

```
El catálogo pasó de 54 a ~90 entradas. Dime cuánto pesa ahora
ejercicios-catalogo.js y si conviene partirlo por categoría con un index que
los una. Si lo partes: PRECACHE_URLS + subir CACHE_NAME. Propón antes de
hacerlo.
```

---

# ETAPA 3 — Árbol de progresión unificado

```
[CABECERA COMÚN]

ETAPA 3 — Rehacer el árbol sobre el catálogo nuevo

Ahora los prerrequisitos viven en el catálogo (campo `prerequisitos`), así que
progresiones-calistenia.js deja de ser la fuente de verdad. Decide: ¿se deriva
del catálogo, o se elimina? Propón y espera mi ok.

a) PRERREQUISITOS EXPLÍCITOS
Hoy la progresión es implícita: la posición en un array. Debe ser explícita,
porque las ramas se bifurcan — después de la Dominada Estricta, el camino a la
Dominada a Una Mano no es el mismo que a las Lastradas. Un nodo puede tener
más de un prerrequisito.

b) CRITERIO DE AVANCE — ya está en el campo criterioAvance. Recordatorio:
   Estáticos: 10 s con forma limpia (tuck avanzado planche: 12-15 s × 3 series)
   Dinámicos: a intermedio → 15 flexiones, 5 dominadas, 20 sentadillas
              a avanzado   → 25 flexiones, 10 dominadas, negativas de pistol
   Gym: múltiplos de peso corporal (tabla en EJERCICIOS-NIVELES.md)

Deriva todo de getHistorialEjercicio() y el log. NO crees un store nuevo.

c) EL ÁRBOL CUBRE LAS TRES MODALIDADES, no solo calistenia. Ramas por patrón
de movimiento: empuje, tracción, rodilla, cadera, core, estáticos, locomoción.

d) VISTA: nodo bloqueado atenuado con sus prerrequisitos visibles, para que se
entienda qué falta. Sin XP, sin niveles, sin tiers, sin copy de videojuego —
el árbol informa qué entrenar después, no premia. El código ya declara esa
decisión.

e) Los datos son referencias de la comunidad, no consenso científico. La vista
debe presentarlos como orientación, no como veredicto.

CRÍTICO: rutina-session.js importa getProgressionLevel(). No cambies su firma
sin actualizar el llamador. Verifica la correspondencia de nombres con un
script, no a ojo.

Propón la estructura de datos ANTES de escribir código.
```

---

# ETAPA 4 — Generador de rutinas

El cambio grande. **Va en dos pegadas: generador primero, borrado de
plantillas después.**

## 4a — El generador

```
[CABECERA COMÚN]

ETAPA 4a — Generador de rutinas según progresión del usuario

Objetivo: sustituir las plantillas fijas por rutinas generadas según dónde
está el usuario, en las tres modalidades.

NO BORRES plantillas.js todavía. Eso es la etapa 4b, y solo cuando esto
funcione.

ENTRADAS DEL GENERADOR

1. NIVEL POR PATRÓN DE MOVIMIENTO, no un nivel global. Alguien puede ser
   intermedio en empuje y principiante en tracción — de hecho es lo normal.
   Un nivel único promedia y miente. Derívalo del historial por patrón.
2. EQUIPO DISPONIBLE. Hay que preguntarlo, no se puede derivar. Guárdalo en
   el perfil (singletons). Usa el enum del campo `equipo` del catálogo.
3. DÍAS POR SEMANA y duración objetivo de sesión.
4. HISTORIAL RECIENTE: no repetir lo mismo, no ignorar lo que no se entrena
   hace un mes.

QUÉ DEBE RESPETAR

- Equilibrio empuje/tracción. Es el error clásico de las rutinas
  autogeneradas: mucho pecho, poca espalda.
- No proponer ejercicios cuyos prerrequisitos no estén cumplidos.
- No proponer ejercicios que requieran equipo que el usuario no declaró.
- Frecuencia por grupo muscular coherente con los días disponibles.
- Progresión semana a semana, no la misma rutina indefinidamente.

QUÉ NO DEBE HACER

- No generar en silencio. Debe mostrar POR QUÉ eligió cada ejercicio. Una caja
  negra que escupe rutinas es peor que una plantilla fija, porque el usuario no
  puede corregirla.
- No bloquear la edición manual. La rutina generada es un punto de partida,
  no un mandato.
- No sustituir la creación manual de rutinas, que debe seguir existiendo.

CASOS BORDE que tienes que resolver explícitamente:
- Usuario sin historial (primera vez): ¿qué genera?
- Usuario que declara "sin equipo": ¿alcanza el catálogo para una rutina
  completa?
- Usuario avanzado en un patrón y principiante en otro: ¿cómo mezcla?

Propón el algoritmo y cómo derivas el nivel por patrón ANTES de codificar.
Ese cálculo es la parte delicada.
```

## 4b — Retirar las plantillas

```
[CABECERA COMÚN]

ETAPA 4b — Retirar las plantillas fijas

SOLO si el generador de 4a está probado y funcionando. Si no lo está, para.

ANTES DE BORRAR:

1. Confirma con datos reales que ninguna rutina guardada del usuario depende
   de plantillas.js en tiempo de ejecución. Las plantillas son moldes de solo
   lectura: al usarlas se crea una rutina propia en IndexedDB con los nombres
   ya resueltos. Verifícalo, no lo asumas.

2. Prueba el generador en los tres casos borde de 4a. Si falla en alguno, el
   usuario se quedaría sin ninguna forma de empezar una rutina.

3. CONSERVA 2-3 plantillas de emergencia como respaldo, para el caso de que el
   generador no pueda producir nada. Dime cuáles elegirías y por qué.

Después: elimina el resto y quítalas de PRECACHE_URLS si estaban. Sube
CACHE_NAME.

Commit aparte del generador.
```

---

# ETAPA 5 — Estándares de fuerza (GYM)

Independiente de las anteriores: puede ir en paralelo. Necesita tus decisiones
(fuente de los ratios, si se pide sexo). El prompt está en
`PROMPTS-CATALOGO.md`, etapa 4.

Nota: el peso corporal que necesita esta etapa es el mismo que necesita el
generador. Resuélvelo una sola vez, en el perfil.

---

## Si algo se corta a mitad

```
Corre git log --oneline -8 y git status. Dime en qué etapa quedamos según
INSTRUCCIONES-ENTRENAMIENTO.md y si hay algo sin commitear. Termina lo que
esté a medias antes de seguir.
```
