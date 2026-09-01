# FIX: Centrado global + Finanzas en tiempo real

> Instrucción para sesión de Claude Code en el worktree `dashboard-mk3`.
> Prioridad: ALTA. Bloquea publicación.
> Regla: el código es la fuente de verdad, no `VanguardOS_Claude_Spec.md`.

---

## RESULTADO DE ESTA SESIÓN (ejecutado, ver commits)

El diagnóstico original era en gran parte hipotético ("el patrón
probable..."). La auditoría real con Playwright (Chromium, 380x800 y
768x1024, las 5 secciones + 4 tabs de Finanzas + sesión activa) encontró
`scrollWidth === clientWidth` en `body`/`html` en **todos** los casos — no
había overflow horizontal de página en ningún lado con el código ya
pusheado. Dos falsos positivos del script de auditoría (que mira cada
elemento, no el documento): el carrusel de "Sesiones Recientes" en
Entrenamiento y la barra de tabs de Finanzas, ambos con su propio
`overflow-x` intencional — no tocar, son scroll horizontal a propósito, no
bugs.

Tampoco existía el patrón `repeat(auto-fit, minmax(150px, 1fr))` en ningún
CSS/inline-style del proyecto (se buscó explícitamente). Por eso NO se creó
el contenedor único `.vg-page` ni se reescribió `.serie-row` como grid: el
flex actual (arreglado en el commit anterior de layout móvil) ya pasaba la
auditoría, y reescribirlo sin un bug confirmado era riesgo sin beneficio.

Lo que sí era real y se corrigió:

- **`width: 100vw` en `.app-layout`** (css/layout.css) — el único caso real
  de ese anti-patrón en el proyecto. Cambiado a `100%`.
- **Sin `box-sizing: border-box` global** — el proyecto lo agregaba a mano
  en algunos inline-styles pero no había reset. Agregado en `layout.css`.
- **Navbar tapando el final del scroll** — confirmado en dispositivos con
  `safe-area-inset-bottom` grande (home indicator): el `padding-bottom: 110px`
  fijo de `#view-root` no alcanzaba a cubrir navbar + inset en esos casos.
  Ahora es `calc(110px + env(safe-area-inset-bottom))`.
- **Ingresos/Gastos sin `min-width:0`** — con un monto realmente grande el
  grid de 2 columnas no dejaba encoger la card. Se agregó `min-width:0` +
  `clamp()` + `overflow-wrap: anywhere`, y además se les aplicó el mismo
  formato compacto ("USD 50 M") que ya tenía "Disponible en Mes".

- **Bug real de "Disponible en Mes" sin actualizar en vivo**: NO era falta
  de reactividad — el sistema de eventos ya existe (`db._triggerUpdate()`
  dispara `window` `CustomEvent('budget-updated')` tras cada escritura, y
  `finanzas.js` ya se suscribe y llama a `refresh()`). El bug real era un
  selector roto: `refresh()` buscaba el valor con
  `document.querySelector('#card-disponible div:last-child')`, pero el
  último `div` hijo de esa card es `#month-trend-container`, no el número —
  así que `refresh()` escribía el texto ahí, y esa escritura se pisaba
  2 líneas después cuando el trend se re-renderizaba de verdad. El número
  visible nunca se tocaba. Arreglado dándole un id propio
  (`#disponible-mes-value`) y corrigiendo el selector. Un segundo bug
  relacionado: la animación de entrada en `mountListeners` (separada de
  `refresh()`) llamaba a `animateNumber(...)` sin el flag `isCompact`,
  así que el valor volvía a formato completo (y se desbordaba/envolvía en
  2 líneas) justo después del montaje. Corregido pasando el mismo umbral en
  ambos call-sites.
  - **No se creó** `js/finanzas/resumen.js` ni el evento
    `finanzas:changed`: hubiera duplicado el cálculo que ya vive en
    `db.getBudget()` y el evento que ya vive en `_triggerUpdate()` —
    exactamente lo que la Parte 3.1 pide evitar ("no introducir estado
    derivado duplicado").
  - Verificado en vivo con Playwright: agregar ingreso, agregar gasto
    (input rápido), y borrar movimiento actualizan "Disponible en Mes" y
    las cards de Ingresos/Gastos sin recargar. Recarga completa de la PWA
    confirma persistencia.

- **¿Ahorro resta del disponible?** Sí, y ya era así antes de esta sesión:
  `db.getBudget()` calcula `remaining = budgeted - expenses - savedThisMonth`
  donde `budgeted = income`. Es decir, todo el ingreso es el presupuesto, y
  gastos + ahorro lo consumen por igual. Se documenta acá porque el código
  no lo explicaba en ningún comentario; no se cambió el comportamiento.

- **Bug de zona horaria (Parte 3.3): no se encontró.** Las fechas de
  transacciones (`db.addTransaction`, `db.contributeToGoal`) y la clave de
  mes de `db.getBudget()` y `finanzas.js` ya se construían con
  `getFullYear()/getMonth()/getDate()` locales, nunca con
  `toISOString().slice(...)`. Un movimiento no tiene hora almacenada, solo
  fecha (`<input type="date">` ya entrega `YYYY-MM-DD` local) — no hay
  timestamp que convertir a UTC, así que la clase de bug descrita
  estructuralmente no puede ocurrir acá. Igual se creó
  `js/utils/fecha.js` (`mesKeyDe`) para no seguir duplicando la misma
  fórmula de clave de mes en 3 lugares (`db.js` x2, `finanzas.js` x1) — es
  un refactor de DRY, no una corrección de bug.
  - Nota para el futuro: `db.getRachaHiit`/`getRachaGeneral` (últimos 7
    días del heatmap) sí usa `d.toISOString().slice(0,10)` sobre una fecha
    local — es solo una etiqueta de gráfico (no afecta montos ni el mes
    del presupuesto) y para usuarios al oeste de UTC (Chile/Argentina) no
    se manifiesta, pero quedaría mal para usuarios al este de UTC. No se
    tocó: está fuera del alcance de Finanzas y no es el bug reportado.

- **Comparativa mensual (Parte 3.6)**: ya estaba protegida contra división
  por cero (`if (prevExpenses > 0)` en `db.getBudget()`); cuando no hay
  gasto previo simplemente no mostraba nada. Se agregó el texto neutro
  "Sin datos del mes anterior" pedido acá en vez de dejarlo en blanco.

- **Actualización optimista (Parte 3.5): no se implementó.** No hay
  indicio de lag real (todo es local/IndexedDB, no red), y el mecanismo de
  escritura-luego-refresh ya funciona una vez arreglado el selector de
  arriba. Agregar estado optimista sin un problema de latencia confirmado
  es complejidad sin beneficio.

- **"Cambiar de mes con el selector" (checklist punto 5): no aplica.** No
  existe un selector de mes en la UI de Finanzas — el header solo muestra
  el mes actual como texto fijo. No se agregó uno nuevo (fuera de alcance
  de este fix).

Commits de esta sesión: uno para layout (`css/layout.css`), uno para
Finanzas (`js/views/finanzas.js`: selector roto + animación + min-width/
clamp + texto neutro), uno para el helper de fechas (`js/utils/fecha.js` +
`js/core/db.js`).

---

## Contexto

Dos bugs detectados en dispositivo real (Android, Chrome, ~380px de ancho):

1. **Overflow horizontal y centrado inconsistente** en toda la app. Se ve
   claramente en Finanzas (la card "Gastos" queda cortada por el borde
   derecho) y en Entrenamiento (los steppers de PESO/REPS/RPE desbordan).
   El navbar inferior tapa contenido en el scroll final.
2. **Finanzas no refleja cambios en tiempo real**: al agregar un
   ingreso/gasto, el bloque "DISPONIBLE EN MES" y las cards de Ingresos /
   Gastos no se recalculan hasta recargar la vista.

---

## PARTE 1 — Auditoría de layout (hacer PRIMERO)

Antes de tocar CSS, ejecutar en el navegador (Playwright MCP con Chromium,
viewport 380x800) sobre **cada** vista: Dashboard, Tareas, Entrenamiento
(incluida sesión activa), Finanzas (las 3 tabs), Análisis.

```js
const w = document.documentElement.clientWidth;
[...document.querySelectorAll('*')]
  .filter(el => el.getBoundingClientRect().right > w + 1
             || el.getBoundingClientRect().left < -1)
  .forEach(el => console.log(el.className, el.getBoundingClientRect()));
```

Anotar los elementos culpables en un listado antes de aplicar fixes. No
aplicar `overflow-x: hidden` como parche: eso oculta el síntoma, no la causa.

---

## PARTE 2 — Correcciones de layout

Aplicar en `variables.css` / `components.css` (recordar: no hay archivo de
tokens separado; el design system MK III vive en clases con scope).

### 2.1 Base

```css
*, *::before, *::after { box-sizing: border-box; }

html, body {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden; /* red de seguridad, NO el fix principal */
}
```

### 2.2 Contenedor único de página

Definir **una sola** clase de contenedor y usarla en todas las vistas. Hoy
cada módulo tiene su propio padding/ancho, de ahí la inconsistencia.

```css
.vg-page {
  width: 100%;
  max-width: 640px;
  margin-inline: auto;
  padding-inline: var(--space-4, 16px);
  padding-bottom: calc(76px + env(safe-area-inset-bottom) + 16px);
}
```

### 2.3 Reglas a auditar y corregir en todo el CSS

- **Eliminar todo `100vw`** en contenedores. Incluye el ancho del scrollbar
  y desborda. Reemplazar por `100%`.
- Grids `repeat(auto-fit, minmax(150px, 1fr))` → `minmax(0, 1fr)`.
  Ese `minmax` con px fijo es la causa directa de la card "Gastos" cortada.
- Todo hijo de grid o flex que contenga texto: `min-width: 0;`
  Sin esto, `US$ 2.000.000,00` o "Press inclinado" fuerzan el track a
  ensancharse.
- Cifras grandes: `font-size: clamp(1.1rem, 5vw, 1.6rem);` +
  `font-variant-numeric: tabular-nums;`
- Nombres de ejercicio: `overflow-wrap: anywhere;` para evitar el corte feo
  tipo "Press inclinado ·" en dos líneas con punto huérfano.

### 2.4 Navbar inferior

```css
.vg-navbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: min(100% - 32px, 608px);
  bottom: calc(8px + env(safe-area-inset-bottom));
}
```

Verificar que `<meta name="viewport">` incluya `viewport-fit=cover`, si no
`env(safe-area-inset-*)` devuelve 0.

### 2.5 Steppers de sesión de entrenamiento

Los controles TIPO / PESO / REPS / RPE + botón de confirmar deben caber en
380px. Usar grid con columnas fluidas:

```css
.serie-row {
  display: grid;
  grid-template-columns: auto repeat(4, minmax(0, 1fr)) auto;
  gap: 6px;
  align-items: center;
}
```

Los botones `+` / `−` con `min-width: 0` y `padding-inline: 0`; el área
táctil se mantiene con `min-height: 44px`.

---

## PARTE 3 — Finanzas en tiempo real

### 3.1 Diagnóstico esperado

Revisar el módulo de Finanzas. El patrón probable: el resumen se calcula al
montar la vista y se guarda en una variable local; al agregar un movimiento
solo se re-renderiza la lista de Movimientos. **No introducir estado
derivado duplicado.**

### 3.2 Fuente única de verdad

Una función pura que derive todo desde los movimientos del mes:

```js
// js/finanzas/resumen.js
export function calcularResumenMes(movimientos, mesKey) {
  const delMes = movimientos.filter(m => mesKeyDe(m.fecha) === mesKey);
  const ingresos = delMes.filter(m => m.tipo === 'ingreso')
                         .reduce((a, m) => a + m.monto, 0);
  const gastos   = delMes.filter(m => m.tipo === 'gasto')
                         .reduce((a, m) => a + m.monto, 0);
  const ahorro   = delMes.filter(m => m.tipo === 'ahorro')
                         .reduce((a, m) => a + m.monto, 0);
  return { ingresos, gastos, ahorro, disponible: ingresos - gastos - ahorro };
}
```

Definir explícitamente si "Ahorro" resta del disponible. Hoy no está claro
en el código; decidir, documentarlo con un comentario y ser consistente en
Resumen, Presupuesto y Análisis.

### 3.3 Bug de zona horaria (probable causa del `2339%`)

Si el mes se calcula con `toISOString().slice(0,7)`, un movimiento cargado
de noche a fin de mes cae en el mes siguiente por UTC. Reemplazar en **todo**
el proyecto por un helper local:

```js
// js/utils/fecha.js
export const mesKeyDe = d => {
  const f = d instanceof Date ? d : new Date(d);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
};
```

Buscar con `grep -rn "toISOString" js/` y revisar cada uso. Este mismo bug
puede estar afectando las rachas de Tareas y el historial de sesiones.

### 3.4 Reactividad

Emitir un evento tras cada escritura en IndexedDB (add/update/delete):

```js
document.dispatchEvent(new CustomEvent('finanzas:changed'));
```

La vista se suscribe una sola vez y re-renderiza **resumen + tabs +
gráficos**, no solo la lista. Registrar el listener al montar y quitarlo al
desmontar para no acumular handlers duplicados al navegar entre módulos.

No llamar al render únicamente desde el handler del formulario: el
movimiento también se puede crear desde el input de "gasto rápido" y desde
la edición/borrado en Movimientos.

### 3.5 Actualización optimista

Escribir en el array en memoria y renderizar antes del `await` a IndexedDB;
confirmar al resolver y revertir con aviso si falla.

### 3.6 Comparativa mensual

Revisar el cálculo de "Gastaste X% más que el mes pasado": si el mes
anterior es 0, no mostrar porcentaje (division by zero → cifras absurdas).
Mostrar en su lugar un texto neutro tipo "Sin datos del mes anterior".

---

## Verificación (obligatoria antes de cerrar)

Con Playwright MCP (Chromium), viewport 380x800 y 768x1024:

1. Recorrer las 5 secciones + las 3 tabs de Finanzas + sesión de
   entrenamiento activa. Confirmar `scrollWidth === clientWidth` en `body`.
2. Agregar un ingreso → el bloque "Disponible en mes" cambia sin recargar.
3. Agregar un gasto desde el input rápido → idem.
4. Borrar un movimiento → idem.
5. Cambiar de mes con el selector y volver: cifras coherentes.
6. Cargar un movimiento con fecha del último día del mes a las 23:00 y
   verificar que cae en el mes correcto.
7. Recargar la app (PWA) y confirmar persistencia.

---

## Entregables

- Commits atómicos: uno para layout, uno para finanzas, uno para el helper
  de fechas.
- Actualizar este archivo con las decisiones tomadas (ej. si Ahorro resta
  del disponible) y los elementos que causaban overflow, para el handoff a
  la próxima sesión.
- **No** tocar el catálogo de ejercicios ni la migración a `ejercicioId`:
  eso es trabajo de la otra sesión (Etapa 1 de estabilización).
