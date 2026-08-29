# Vanguard OS — Plan de trabajo

Guardar en la raíz del worktree `dashboard-mk3` y commitear. Sirve para que
cualquier sesión nueva de Claude Code retome sin explicaciones.

---

## Reglas transversales (aplican a todo)

- Vanilla JS, ES Modules, sin bundlers. Imports relativos SIEMPRE con `.js`
- Persistencia: IndexedDB vía `js/core/idb.js`, siempre a través de `db.js`.
  Nadie fuera de `db.js` importa `idb.js` directo.
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
- Retrocompatibilidad de datos: app local sin backend. Si se corrompe un
  store, el usuario pierde todo. Migrar, nunca asumir.
- Al crear archivos nuevos: agregarlos a `PRECACHE_URLS` en `sw.js` Y subir
  `CACHE_NAME`. Sin lo segundo el navegador sigue sirviendo el caché viejo.
- `VanguardOS_Claude_Spec.md` está DESACTUALIZADO (dice localStorage y otra
  paleta). No seguirlo. El código manda.
- Una tarea a la vez, commit propio, parar y esperar confirmación.
- No lanzar agentes en paralelo (consumen cuota sin terminar).

---

## Hecho

| | Estado |
|---|---|
| Fase 1 — Persistencia de almacenamiento + recordatorio de respaldo | hecha |
| Fase 2 — Escapado de HTML | hecha, verificada con Playwright |
| Limpieza A — auditar `PRECACHE_URLS`, `CACHE_NAME` a v20 | hecha (`2912c4f`) |
| Limpieza B — borrar `metas.js` y `ripple.js` (código muerto) | hecha |
| Limpieza C — "Análisis" como 5º ítem de la navbar | hecha (`dcfb0a2`) |
| Fase 3 — Tareas recurrentes (diaria/semanal/mensual) | hecha (`7aba0f3`), migración IndexedDB v1→v2 |

Verificado en navegador con Playwright MCP + Claude in Chrome: migración
preserva datos, navbar de 5 ítems entra a 375px y 1280px, recurrentes no
inflan la racha, escapado funciona.

Hay datos de prueba en IndexedDB (una recurrente y sus 2 instancias) que se
dejaron a propósito.

---

## Pendiente

### FASE 4 — Rollover de sobres (Finanzas)

**Bloqueada: falta decisión.** Hoy no hay lógica de qué pasa con el saldo de
un sobre al cambiar de mes, así que el presupuesto miente al cruzar el día 1.

El sobre de "Comida" que quedó con $15.000 el 31 de enero:

- **A)** arranca febrero con esos $15.000 (arrastre, estilo Goodbudget)
- **B)** vuelve a cero y se reasigna desde el ingreso nuevo (presupuesto a cero)
- **C)** el sobrante se transfiere automático a una meta de ahorro

Elegir una e implementar SOLO esa. Considerar también el caso negativo (sobre
sobregirado) — proponer cómo tratarlo antes de codificar.

Revisar `getBudget(monthFilter)` en `db.js`: probablemente necesite saber del
arrastre. No romper el histórico ya guardado.

### FASE 5 — Árbol de calistenia con prerrequisitos

`js/core/progresiones-calistenia.js` tiene 4 familias como listas lineales
(flexiones, dominadas, fondos, sentadillas) con `getProgressionLevel()`. Solo
la usa `rutina-session.js`.

a) **Prerrequisitos.** Convertir las listas en un árbol donde cada paso
   declara qué necesita antes. Hoy la progresión es implícita (posición en el
   array); debe ser explícita, porque las ramas se bifurcan: después de
   dominadas estrictas, el camino a la dominada a una mano no es el mismo que
   el camino a la dominada lastrada.

b) **Criterio de avance.** Un paso no se marca como superado hasta que el
   historial registre N series limpias del paso anterior. Proponer el N y
   justificarlo. Usar `getHistorialEjercicio()` y el log de eventos.

c) **Ramas que faltan:** CORE (hollow body, plancha, L-sit) y ESTÁTICOS
   (handstand, front lever, muscle-up). Son la razón por la que la gente hace
   calistenia y hoy no están.

d) **Vista del árbol** en Entreno. Paso bloqueado atenuado, con prerrequisitos
   visibles. MK III, cian.

Restricciones: sin XP, sin niveles, sin tiers, sin copy de videojuego — el
código ya declara esa decisión. Los nombres en `PROGRESIONES` deben seguir
coincidiendo con `ejercicios-catalogo.js` y las plantillas, o
`getProgressionLevel()` deja de encontrar el ejercicio. No cambiar su firma
sin actualizar `rutina-session.js`.

### FASE 6 — Medidas corporales históricas y fotos de progreso

`js/utils/bodyMetrics.js` calcula IMC pero no hay registro histórico.

a) Store nuevo: fecha, peso, circunferencias (cintura, pecho, brazo, muslo —
   opcionales). Gráfico de evolución reutilizando `utils/charts.js`.
b) Fotos como **Blob** en IndexedDB, NO base64 (infla ~33%). Redimensionar
   antes de guardar vía canvas. Definir tope de resolución.
c) Incluirlas en `exportAllData()`/`importAllData()`. Un JSON con fotos puede
   pesar mucho — proponer cómo manejarlo antes de implementar.

### FASE 7 — Calentamiento y timer de descanso por ejercicio

a) **Calentamiento:** dado el peso de la serie de trabajo, sugerir la escalera
   de aproximación. Reutilizar `plate-calculator.js` para mostrar qué discos
   cargar en cada paso.
b) **Timer por ejercicio:** hoy `restTimerSecs` es global. Permitir override
   por ejercicio, con el global como default. Las rutinas existentes no tienen
   el campo — deben seguir funcionando cayendo al global.

---

## Publicación (después de las fases, o antes si se prefiere)

Objetivo: que la app funcione en celular, tablet y PC. Ya es una PWA, solo
falta publicarla.

### Arreglar el manifest primero

`manifest.json` tiene dos problemas que rompen la instalación:

1. `"start_url": "/"` asume que la app vive en la raíz del dominio. En GitHub
   Pages estará en un subdirectorio → la app instalada abriría en el lugar
   equivocado. Debe ser `"./"`.
2. Un solo ícono SVG declarado como 192x192 con `purpose: "any maskable"`.
   Chrome pide un PNG de 512x512 para instalación completa, y un SVG con
   emoji se recorta mal como maskable en Android. Generar PNGs reales de
   192x192 y 512x512, y separar `purpose: "any"` de `purpose: "maskable"`.

### Publicar

1. Crear repo en GitHub (cuenta ya existe). **No** inicializarlo con README —
   choca con el historial local.
2. Push desde el worktree.
3. Activar GitHub Pages en Settings → Pages.
4. Verificar desde celular: abrir la URL en Chrome → "Agregar a pantalla de
   inicio" → confirmar que abre en standalone, funciona offline y el ícono se
   ve bien.
5. Verificar en tablet: el breakpoint es 768px, así que una tablet horizontal
   cae en "escritorio" y vertical puede caer en cualquiera. Nunca se ha
   revisado.

### Lo que publicar NO resuelve

IndexedDB es local a cada navegador. Usar la app en PC y celular = **dos bases
separadas que no se sincronizan**. La única forma de mover datos hoy es
exportar el JSON e importarlo en el otro dispositivo.

Sincronización real requiere backend (Firebase, Supabase, PHP+MySQL) y deja de
ser offline-first puro. Decisión a tomar después de usarla un tiempo con
export/import manual, no antes.

---

## Mejoras identificadas, sin fase asignada

Vienen de comparar con apps de referencia (Strong, Hevy, YNAB, Todoist,
Habitify, Way of Life). Ordenadas por impacto:

1. **Estado "omitido" en racha/heatmap.** Hoy es binario: hiciste o no. Un día
   de descanso planificado rompe la racha igual que un día de flojera, lo que
   desalienta el descanso correcto. Tres estados (sí / no / omitido) es
   estándar en la categoría. Encaja perfecto: sería un tipo de evento nuevo en
   el log, sin tocar nada más.

2. **Notas contextuales en el heatmap.** Ya existe `notas` en sesiones de
   entreno (`db.js` ~888). Falta extenderlo a tareas/transacciones y sobre
   todo **mostrarlas al pasar sobre una celda del heatmap**. Hoy el heatmap
   dice cuánto, no por qué.

3. **Revisión semanal.** `resumenSemanal` existe pero es un número perdido
   entre otros. Con el log cruzando tres módulos se puede responder algo que
   ninguna app comercial puede: "los jueves entrenas poco y gastas más".

4. **Gastos anuales prorrateados** en Finanzas (patente, seguro, matrícula).
   Los recurrentes actuales son mensuales puros.

5. Accesibilidad: cero `aria-*` y cero `role=` en todo el proyecto. Modales
   sin `role="dialog"` ni foco atrapado; botones de solo ícono sin nombre
   accesible.

6. Manejo global de errores: no hay `window.onerror` ni listener de
   `unhandledrejection`. Si un `await` falla en un `mountListeners`, la vista
   queda a medio pintar sin explicación.

7. Deuda menor: `css/tokens-mk3.css` quedó muerto (no enlazado, duplica lo que
   ya hace `variables.css`, y su comentario de cabecera miente). Inter se
   carga desde Google Fonts pero la regla `html.mk3-* *` la anula con
   `!important`, así que se descarga sin usarse.

### Decisiones de diseño tomadas — no revisar

- **Sin gamificación RPG** (XP, niveles, tiers, mascota). El código ya lo dice.
- **Sin métrica compuesta de "fuerza del hábito".** La racha simple es más
  honesta que un número que nadie entiende.
- **PWA, no nativo ni PHP.** Un solo código para los tres dispositivos.
  Android Studio daría solo Android; PHP haría perder el offline.
