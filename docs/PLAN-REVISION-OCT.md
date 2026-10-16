Nuevo plan (base 82066a7, v321; anota los reales al empezar). Guarda el plan de abajo tal cual como docs/PLAN-REVISION-OCT.md en el primer commit y empieza la Etapa 1. Cada etapa es una tanda: un commit por fase y para al terminar la etapa, o antes ante una falla real o una decisión de producto. Las decisiones técnicas chicas tómalas tú y anótalas en el informe. No pases a la etapa siguiente hasta que escriba "continúa".

Base real al empezar: `82066a7`, `CACHE_NAME` v321.

# Revisión de octubre — por etapas

Origen: recorrido de la app con datos demo a 375×812 y 1280×800 (16 oct 2026, después del tema Gris): todas las vistas, Semana, hojas, la sesión de GYM, el timer de HIIT y las pestañas de Finanzas. Consola sin errores. Este plan es de interfaz: no cambia datos, stores ni eventos.

## Reglas (todas las etapas)
- Sin cambios de datos, eventos ni stores. Si algo parece necesitar uno, para y avisa.
- Cada fase se revisa en tema Gris y en Color.
- MK III: recto en todo salvo círculos y anillos; chaflán solo en tarjetas principales y en el botón principal; violeta Tareas/Hábitos, cian Entreno, ámbar Finanzas, rojo solo alertas reales y gastos.
- Reglas de siempre: utils/fecha.js, utils/numero.js, utils/currency.js, utils/escape.js, vista-activa.js tras await, modales .modal-overlay + open, ids antes de cualquier await, archivos nuevos a PRECACHE_URLS, CACHE_NAME en cada commit con código. La tabla de Estado nunca lleva el hash del commit que la edita.
- No romper la sesión HUD (borrador, descanso, wake lock, récord en vivo), Semana ni el respaldo.
- Memoria: medir antes de cada etapa (600 MB o más). Sin MCP de Playwright: tus propios scripts, de a una prueba, un solo servidor, navegador cerrado al final. Pruebas a 375 en cada fase y a 1280 al cerrar cada etapa. Consola y ESLint limpios.
- Informe al final de cada etapa: tabla de commit y caché, resultado de cada verificación, capturas antes/después y lo que no se pudo cumplir.

---

## Etapa 1 · Arreglos visibles (no necesita decisiones)

### 1.1 Cortes y flechas de los números
- Finanzas › Resumen › "Gasto vs. mes anterior": a 375 el monto de "Este mes" se corta ("$295,"). Que los dos montos se vean enteros (formato corto de currency.js o en una línea debajo de la barra).
- Entreno: la fila Volumen semanal / Sesiones / IMC no cabe a 375 y la tarjeta IMC queda cortada. A 375: Volumen a todo el ancho y Sesiones + IMC debajo, sin scroll horizontal.
- Finanzas: las pestañas Recurrentes y Cuentas quedan fuera de pantalla a 375 sin indicio. Que quepan las 5 sin bajar de 44 px de toque o, si no caben, desvanecido en el borde y la pestaña activa siempre a la vista.
- Inputs numéricos con las flechas del navegador (se ven en la sesión de GYM, columna KG, y en la hoja de cantidad de un hábito): ocultarlas en toda la app con CSS, sin cambiar cómo se leen los valores.
- Verificación: a 360, 375 y 414, script que recorra todas las vistas y liste textos que se salgan del ancho (excepto rieles que se deslizan a propósito, como el riel de ejercicios de la sesión); lista vacía.

### 1.2 Hojas encima de la barra inferior
- Al abrir una hoja desde Hoy (ej. "Día"), el fondo oscurecido no cubre la barra inferior ni lo que queda debajo de la hoja: se ve la agenda nítida bajo la hoja. Que el overlay cubra la pantalla completa, barra incluida, en todas las hojas .modal-overlay.
- Verificación: abrir a 375 la hoja Día, Registrar medidas, cantidad de hábito, Nueva tarea, Gasto, Nuevo pago y un ConfirmDialog; en todas, nada nítido fuera de la hoja. Atrás de Android cierra cada una.

### 1.3 Respaldo: Exportar primero
- Configuración › Respaldos: hoy "Restaurar respaldo" lleva el botón principal (claro) y "Exportar respaldo" el secundario. Invertirlo: Exportar es el principal.
- Verificación: capturas en Gris y Color; exportar y restaurar siguen funcionando.

---

## Etapa 2 · Atajos que llevan directo (no necesita decisiones)

### 2.1 Hoy › Gasto
- Hoy el acceso "Gasto" solo navega a Finanzas, y ahí el botón Gasto queda bajo tres tarjetas grandes. Que abra directamente la hoja de gasto (la misma GastoForm de Finanzas), sobre Hoy o en Finanzas ya abierta, lo que sea más simple sin duplicar el formulario.
- Verificación: registrar un gasto desde Hoy; aparece en Movimientos y el resumen de Hoy se actualiza; Atrás cierra la hoja.

### 2.2 Hoy › Entrenar
- Hoy solo navega a Entreno. Que siga este orden: si hay una sesión en curso (borrador), la retoma; si no, si hay "Hoy toca", la empieza (mismo camino que #btn-hoy-toca-empezar); si no, va a Entreno.
- Verificación: los tres casos, con GYM y con HIIT.

### 2.3 GYM y Calistenia: rutinas antes del mapa
- Al entrar a GYM, el mapa muscular grande ocupa la primera pantalla y las rutinas quedan abajo. Poner la lista de rutinas primero y el mapa debajo, en una sección plegable (abierta si no hay rutinas). Igual en Calistenia. "Generar Rutina" → "Generar rutina".
- Verificación: a 375 la primera rutina y su "Iniciar" se ven sin hacer scroll.

---

## Etapa 3 · Pantallas más cortas (necesita decisiones)

Antes de empezar esta etapa, pregúntale a Benjamin si confirma las tres decisiones de abajo o cambia alguna. No empieces sin respuesta.

- (?) Barra inferior pegada al borde, a todo el ancho, recta, fondo sólido y borde superior de 1 px (hoy flota con esquinas redondeadas, contra la limpieza L1, y el contenido se ve pasar por detrás). En tablet/PC el riel no cambia.
- (?) Hoy deja de mostrar el bloque Laboratorio (dona + 4 cifras, repite Finanzas). Queda una fila "Laboratorio" como las de los módulos. La última nota sigue.
- (?) Entreno: las sugerencias "Listo para avanzar" van en una sola tarjeta ("3 ejercicios listos para avanzar") debajo de "Hoy toca", plegada por defecto (abierta si hay una sola).

### 3.1 Barra inferior y espacio final
- Según la decisión. Cada vista deja al final el alto de la barra + safe-area, para que lo último nunca quede tapado.
- Verificación: scroll hasta abajo en cada vista a 375; el último elemento queda completo. La sesión de Entreno sigue ocultando la barra.

### 3.2 Hoy más corto
- Según la decisión. La fila "Laboratorio" muestra una cifra de la semana y lleva a la vista.
- Verificación: alto de Hoy antes/después a 375 (hoy ~1700 px); Atrás desde Laboratorio vuelve a Hoy.

### 3.3 Entreno: Hoy toca primero
- Según la decisión. "Subir de nivel" y "Ahora no" funcionan igual dentro de la tarjeta.
- Verificación: con 0, 1 y 3 sugerencias; "Hoy toca · Empezar" visible en la primera pantalla a 375.

---

## Etapa 4 · Finanzas y Configuración

### 4.1 Resumen de Finanzas compacto
- Hoy mide ~2900 px a 375 y Balance, Gastos e Ingresos ocupan una tarjeta grande cada uno. Juntarlos en una tarjeta: Balance grande arriba, Gastos e Ingresos en una fila debajo, con el texto de comparación del mes pasado. El resto de los bloques no cambia.
- Verificación: los montos coinciden con los de antes; alto antes/después.

### 4.2 Sobres más limpios
- En Cuentas cada sobre muestra 4 íconos de acción (transferir, editar, archivar, gráfico) más un ⋯. Dejar visible solo la acción más usada (transferir) y llevar el resto al menú ⋯.
- Verificación: cada acción sigue funcionando desde el menú; Atrás cierra el menú.

### 4.3 Configuración ordenada
- Mide ~3150 px y Respaldos queda casi al fondo. Subir Respaldos justo debajo de Cuenta; el resto mantiene su orden.
- "Timer de descanso entre series (segundos)" → "Descanso entre series (segundos)".
- Botones con una sola regla en toda la vista: principal con chaflán y fondo claro; secundario recto con borde (hoy "Crear cuenta" e "Iniciar sesión" usan formas distintas).
- Verificación: capturas en Gris y Color; cuenta, PIN, regla de presupuesto y respaldo siguen funcionando.

---

## Etapa 5 · Consistencia y cierre

### 5.1 Colores e íconos del tema Gris
- Lista de movimientos: gastos en rojo, ingresos en verde y transferencias neutras, como texto (hoy van en blanco mientras "Gastos del mes" va en rojo). En tema Color, como está hoy.
- Hábitos: el botón para marcar es un círculo vacío sin ícono (solo "Leer" tiene +). Ícono de check (o + si tiene meta) en todos.
- "Ver todo" del Laboratorio con el color de texto que le corresponde (hoy usa cian, el de Entreno).
- Verificación: capturas a 375 en Gris y Color de Movimientos, Hábitos y Hoy.

### 5.2 Textos y unidades
- "Volumen semanal 11.344" → con "kg". "Tendencia de gastos" con meses abreviados ("may", "jun"…) usando fecha.js en vez de "05 06 07".
- Barrido de títulos con mayúscula en cada palabra (como "Generar Rutina") hacia oración normal.
- Verificación: grep del barrido en el informe; capturas de Entreno y Finanzas.

### 5.3 Datos demo coherentes
- Laboratorio › Semana de la semana pasada dice "Sin hábitos" mientras Hábitos muestra Gimnasio con 17 días seguidos: los hábitos demo se crean hoy con marcas hacia atrás y resumirSemana ignora los días anteriores a createdAt. Que los datos demo creen los hábitos con createdAt al inicio del período sembrado, tocando solo datos-demo.js (no resumirSemana ni la racha).
- Verificación: con datos demo, Laboratorio › Semana muestra el % de hábitos y cuadra con Hábitos.

### Cierre
- QA final a 375 y 1280 de todas las vistas en Gris y en Color; regresión de la sesión HUD, Semana, Foco, Recordatorios (Diagnóstico) y respaldo.
- docs/PLAN.md y CHANGELOG al día.
- Informe final con tabla de commits y cachés, altos antes/después de Hoy, Finanzas y Configuración, y lo que no se pudo cumplir.

## Estado
| Fase | Commit | Caché |
|---|---|---|
| 1.1 Cortes y flechas de los números | `d3fe1c7` | v322 |
| 1.2 Hojas encima de la barra | `85878a7` | v323 |
| 1.3 Respaldo: Exportar primero | (en el commit siguiente) | v324 |
| 2.1 Hoy › Gasto | | |
| 2.2 Hoy › Entrenar | | |
| 2.3 GYM y Calistenia: rutinas antes del mapa | | |
| 3.1 Barra inferior y espacio final | | |
| 3.2 Hoy más corto | | |
| 3.3 Entreno: Hoy toca primero | | |
| 4.1 Resumen de Finanzas compacto | | |
| 4.2 Sobres más limpios | | |
| 4.3 Configuración ordenada | | |
| 5.1 Colores e íconos del tema Gris | | |
| 5.2 Textos y unidades | | |
| 5.3 Datos demo coherentes | | |
