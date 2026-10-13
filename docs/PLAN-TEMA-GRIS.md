Nuevo plan: tema "Gris" (base 241bcce, v318). Guarda este texto como docs/PLAN-TEMA-GRIS.md en el commit de G1. Haz todo seguido, un commit por fase con su caché, y para solo al final o ante una falla real o una decisión de producto. Las decisiones técnicas chicas tómalas tú y anótalas en el informe.

# Tema "Gris": interfaz en grises, color solo en el texto

## Qué se busca
Toda la interfaz (fondos, tarjetas, bordes, botones, chips, barras de progreso, anillos, celdas de mapas, íconos y gráficos) en escala de grises. El color queda solo en el texto:
- Títulos de cada vista y números destacados (clase .num, h1–h4) con el acento de su módulo: violeta en Tareas/Semana y Hábitos, cian en Entreno, ámbar en Finanzas.
- Hoy (Inicio): títulos y valores en blanco (#F5F5F7). Solo las etiquetas chicas de cada fila (ENTRENO, FINANZAS, TAREAS, HÁBITOS, ANOTACIONES) mantienen el color de su módulo.
- Dinero: ingresos y balance positivo en verde, gastos y negativos en rojo (texto).
- Alertas reales: texto en rojo sobre fondo gris (ya no fondos rojos).
- Las etiquetas que hoy ya tienen color de acento (por ejemplo "LISTO PARA AVANZAR", "Ver todo", "3 pendientes de días pasados") lo mantienen.
- Pestaña activa de la barra inferior y del riel: ícono gris claro y texto con el acento del módulo.
- Botones principales: fondo gris claro (≈ #D0D0D4) con texto oscuro; secundarios: borde gris y texto claro.
- Sin sombras.
Referencia visual: la maqueta "vanguard-gris-texto-color-v2.png" que Benjamin aprobó (Hoy, Semana, Hábitos, Entreno, Finanzas). Si la deja en docs/mockups/, úsala; si no, guíate por esta descripción.

## Decisiones
- Es un tema que se elige en Configuración › Apariencia: "Gris" o "Color" (el actual). Gris queda como predeterminado; quien quiera volver al actual elige "Color".
- La elección es por dispositivo: localStorage con try/catch (si falla, se usa Gris). Se aplica antes del primer pintado (script chico en index.html que pone data-tema en <html>) para que no parpadee.
- No se cambia ningún dato ni la lógica de la app; solo estilos.

## Reglas
- Implementar con tokens, no con filtros CSS sobre la página: separar "acento de texto" de "acento de fondo/borde" (por ejemplo --acento-texto y --acento-fondo por módulo, y lo mismo para alertas y dinero). En html[data-tema="gris"] los tokens de fondo/borde/relleno pasan a grises y los de texto mantienen el color.
- Revisar con grep los estilos inline que usan var(--vi), var(--cy), var(--am), var(--rd), var(--accent-*), var(--state-*) como background, border, fill o stroke, y pasarlos al token de fondo correspondiente. El tema "Color" debe verse exactamente igual que hoy.
- Imágenes de usuario (fotos de progreso) y el mapa muscular de Entreno: el mapa muscular pasa a escala de grises por intensidad; las fotos no se tocan.
- Gráficos (Chart.js en Laboratorio, Cuerpo, Hábitos): series en grises de distinta luminosidad; títulos y números del gráfico pueden llevar el acento como texto.
- Contraste: todo texto sobre gris debe pasar 4,5:1 (revisar los acentos sobre las tarjetas grises; si alguno no pasa, aclarar el tono del texto solo en el tema Gris).
- Archivos nuevos a PRECACHE_URLS; CACHE_NAME en cada commit con código. La tabla de Estado nunca lleva el hash del commit que la edita.
- Memoria: medir antes de empezar (600 MB o más). Pruebas a 375 por fase, de a una, navegador cerrado al final; una pasada final a 1280. MCP de Playwright apagado: usa tus propios scripts. Consola y ESLint limpios.

## Fases
### G1 · Tokens y selector
- Tokens separados de texto y de fondo, html[data-tema="gris"], script de arranque en index.html, Configuración › Apariencia con "Gris / Color".
- Verificación: cambiar de tema sin recargar y después de recargar; sin parpadeo al abrir; tema Color idéntico al actual (comparar capturas con v318).

### G2 · Vistas
- Hoy (con texto blanco y etiquetas de color), Tareas/Lista/Semana, Hábitos (anillo, franja, insignias), Entreno (sesión HUD incluida), Finanzas (sobres, recurrentes, anuales), Configuración, hojas y modales, barra inferior y riel.
- Verificación: capturas a 375 de cada vista en Gris; ningún fondo, borde ni ícono con color salvo el texto según lo descrito.

### G3 · Gráficos, mapas y contraste
- Chart.js, mapas de actividad, mapa muscular, anillo de racha y barras de progreso en grises.
- Revisión de contraste del texto de color sobre gris.
- Pasada final a 1280 de todas las vistas en Gris y en Color.

## Cierre
- docs/PLAN.md y CHANGELOG al día.
- Informe con tabla de commits y cachés, capturas de antes/después de Hoy y una vista por módulo, y lo que no se pudo cumplir.

---

## Estado

| Fase | Estado | Caché |
|---|---|---|
| G1 · Tokens y selector | hecho (`ed0fdc6`) | v319 |
| G2 · Vistas | hecho | v320 |
| G3 · Gráficos, mapas y contraste | pendiente | — |
| Cierre | pendiente | — |

### Nota de implementación (G1)

La regla pide separar el acento de texto del de fondo. Se hizo al revés de
como sugiere el ejemplo, por seguridad: el token de siempre (`--cy`,
`--am`, `--vi`, `--rd`, `--accent-*`, `--state-*`) queda como token de
**fondo/borde/relleno** y pasa a gris en `html[data-tema="gris"]`; el texto
usa un token nuevo con sufijo `-t` (`--cy-t`, `--state-success-t`, …), que
mantiene el color en los dos temas. Así, cualquier uso que se escape de la
revisión (por ejemplo un color armado en JS y usado en un `background`)
queda gris y no de color. Los usos como color de texto se pasaron a `-t`
(162: `color: var(--X)`, `color: ${…}` y `.style.color = …`).

### Nota de implementación (G2)

- Íconos SVG: `color: oklch(from currentColor l 0 h)` en el tema Gris. Cada
  ícono toma el gris de la misma luminosidad que el color que hereda, sin
  tocar cada plantilla. No es un filtro sobre la página: es un color.
- Colores armados en JS que se usan como texto (`color: ${color}`):
  `colorTexto()` de `js/utils/tema.js` los pasa a su token `-t`.
- Botón principal, FAB, botones de cabecera y botones rellenos con un acento:
  #D0D0D4 con texto oscuro. Una acción peligrosa (fondo `--state-high`):
  fondo gris y texto rojo.
- Títulos y números destacados: reglas sin especificidad (`:where`), para
  no pisar el verde y el rojo del dinero ni las etiquetas de acento.
- Los emojis (🔥, 🌅, ✅) no se tocan: son texto y no se pueden pasar a gris
  sin un filtro.
