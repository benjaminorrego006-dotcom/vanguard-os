# Vanguard OS — reglas del proyecto

PWA offline-first (vanilla JS, ES Modules, sin bundlers) publicada en GitHub
Pages desde la rama `worktree-dashboard-mk3`. Estas reglas aplican a toda
sesión; el estado del trabajo está en `docs/PLAN.md` y el historial en
`docs/CHANGELOG.md`. Si algo de acá contradice el código, avisar antes de
cambiar cualquiera de los dos.

## Flujo de trabajo

- **Push después de cada commit** (rediseño): en cuanto se crea un commit,
  `git push origin rediseno-orbita` (el primer push de la rama:
  `git push -u origin rediseno-orbita`), para que los cambios queden en
  GitHub y se puedan abrir desde otro PC.
- Una fase no está terminada hasta confirmar que el push salió bien. Si
  falla, detenerse y mostrar el error.

## Forma de trabajo

- **Una tarea por commit.** Cada commit con su push a `origin` apenas se crea;
  después, parar y esperar confirmación antes de la siguiente tarea.
- Si aparece un bug fuera del alcance de la tarea: reportarlo y preguntar
  antes de corregirlo.
- **ESLint `no-undef` limpio antes de cerrar** (ignorando `js/vendor/`):
  `npx eslint@8 --no-eslintrc --env browser,es2022 --parser-options=sourceType:module --rule "no-undef:error" --ignore-pattern "js/vendor/" js/`
- **Verificación automática al cierre de cada fase:** `node tools/verificar/verificar.mjs <etiqueta>`
  (Playwright 1.65.0 + Chromium; Node portable en `%LOCALAPPDATA%\Programs\node`,
  agregarlo al PATH de la sesión). Cubre capturas en 390/768/1440, consola,
  las 5 acciones, crear/editar/borrar, botón atrás y offline. Si una fase
  cambia la interfaz, se actualiza el bloque `SEL` del script.
- **Verificar por la UI real** (Playwright 375×812 y 1280×800, zona
  `America/Santiago`, reloj simulado, contexto limpio) y con la consola
  limpia. Llamar a la función por debajo no cuenta como verificado.
- **Supabase en pruebas:** nunca iniciar sesión ni crear cuentas en el
  proyecto real. Bloquear `supabase.co` en el contexto de Playwright y, si
  hace falta una sesión, usar un stub del bundle
  `js/vendor/supabase-js-*.js`.

## Datos

- **Event log:** toda mutación emite `logEvent({ modulo, tipo, entidadId, payload })`.
  Los agregados (rachas, heatmap, insignias, saldos con arrastre) se derivan
  del log; nunca se guardan como campo aparte. Un tipo de evento nuevo
  necesita su replay en `js/core/sync.js` (`applyRemoteEvent`) y su destino en
  el espejo remoto.
- **Solo `js/core/db.js` y `js/core/sync.js` importan `js/core/idb.js`.**
  `sync.js` es la excepción documentada (motor de replay; ver el comentario al
  inicio del archivo). Cualquier otro módulo va por `db.js`.
- IndexedDB es la fuente de verdad en cada dispositivo; Supabase replica el
  log. Retrocompatibilidad siempre: migrar, nunca asumir la forma de los datos.

## Fechas

- Solo con `diaKeyDe`, `claveDiaDe`, `mesKeyDe`, `sumarDias`, `fechaLocalDe`
  y `diasEntre` (`js/utils/fecha.js`).
- **Nunca** `toISOString()` para claves de día, **nunca**
  `new Date('YYYY-MM-DD')` (se lee como UTC) y **nunca** restar
  milisegundos para contar días o meses (el cambio de horario deja días de 23
  o 25 horas).

## Montos

- Un solo formateador: `formatCurrency` / `formatCompactCurrency` de
  `js/utils/currency.js` (CLP por defecto). No duplicarlo ni formatear montos
  a mano. Los negativos salen `-$10.000`.

## Service worker

- Todo archivo nuevo va en `PRECACHE_URLS` (`sw.js`), y **cada commit que toca
  JS/CSS/HTML de la app sube `CACHE_NAME`**; sin eso el navegador sigue
  sirviendo el caché viejo.

## Interfaz (Órbita)

Sistema de diseño del rediseño (`docs/rediseno-total.md`). Las vistas que
todavía no se migran siguen con MK III (tokens sin prefijo y ámbitos
`.mk3-*`) hasta la limpieza final. **Código nuevo o migrado usa solo Órbita.**

- **Tokens:** todo color, tamaño, espaciado, radio, sombra, capa y duración
  sale de los tokens `--o-*` de `css/variables.css`. Cero valores sueltos.
- **Módulos:** el contenedor lleva `.o-mod-habitos`, `.o-mod-plan`,
  `.o-mod-entreno`, `.o-mod-finanzas`, `.o-mod-notas` u `.o-mod-hoy`, y los
  componentes usan `--o-mod`, `--o-mod-t`, `--o-mod-grad`, `--o-mod-soft`,
  `--o-mod-wash` y `--o-mod-glow`, nunca un color de módulo por nombre.
  Hábitos = rosa → coral; Plan (Tareas, Semana, Notas) = violeta;
  Entreno = turquesa → azul; Finanzas = ámbar → naranjo; Notas = neutro.
- **Contraste AA:** el texto de acento usa la variante `-t`. Sobre un
  degradado o relleno de módulo, el texto va en `--o-ink` (nunca blanco).
  `--o-faint` es solo decorativo.
- **Alertas:** el rojo (`--o-alert`, texto `--o-alert-t`) es solo para
  alertas reales (un saldo negativo, un cobro que no alcanza). Toda alerta
  lleva **ícono y texto**, nunca solo color.
- **Formas y profundidad («Esquina Vanguard», 24 nov 2026):** radios
  `--o-radius-*`, redondeados salvo la esquina superior derecha, casi
  recta: tarjetas, listas y paneles `card` (18/4); botones, campos y
  pestañas `control` (12/3); `chip` (10/3); `check` (7/2); hoja inferior
  `sheet` (24/6 arriba). Círculo solo en anillos, orbe y avatares; píldora
  solo en el dock y los avisos. Sin chaflán (`clip-path`) en ningún lado.
  Las vistas MK III pasan por el puente al final de `css/variables.css`
  (sus tokens apuntan a los de Órbita). Vidrio con `backdrop-filter` solo en el dock y las
  hojas. Sombra de color (`--o-glow-*`) solo en el botón principal de cada
  pantalla. Las luces de fondo (`--o-ambient`) son gradientes sin `filter`.
- **Tipografía:** Sora (`--o-font`) para títulos y texto; Geist Mono
  (`--o-font-num`) solo para cifras, horas, montos y rótulos. Fuentes
  locales en `assets/fonts/`, nunca desde un CDN.
- **Movimiento:** duraciones `--o-dur-*` y curvas `--o-ease-*`. Con
  `prefers-reduced-motion` los tokens ya pasan a fundidos cortos sin
  desplazamiento; no animar con valores propios.
- **Modo sobrio:** `html[data-tema="gris"]` (Configuración › Apariencia):
  fondo neutro, sin luces ni sombras de color, acentos de módulo solo en
  anillos y estados. Todo componente nuevo se revisa en los dos modos.
- **Táctil:** objetivo mínimo de `--o-touch` (44 px).
- Modales y hojas: `.modal-overlay` **con `id`** + clase `open` (sin `id`,
  `history.js` no maneja el botón atrás); el overlay cubre la pantalla
  completa, dock y riel incluidos (decisión del 16 oct 2026).
- Chart.js sigue cargando diferido, solo cuando se necesita.
- Render por `innerHTML`: reasignar los listeners después de cada render.
- Textos en español de Chile con **tuteo** (nunca voseo: "Elige", no
  "Elegí"; "Déjalo", no "Dejalo"). Plurales correctos con 1.

## No tocar

- El parser de captura rápida (`parseQuickGasto` en `js/views/finanzas.js`).

## Arrastre de saldos de sobres (decisiones del usuario)

1. `saldo(mes) = arrastre(mes anterior) + asignado(mes) − gastado(mes) ± transferencias(mes)`, incluidos los saldos negativos.
2. Transferencias nuevas (`modelo: 'saldo'`) mueven saldo solo en su mes y no tocan `assignedAmount`. Las antiguas quedan como estaban (su efecto ya está en `assignedAmount`) y borrarlas revierte como siempre. Sin migrar datos.
3. El asignado se suma solo en meses con al menos una transacción. El **mes actual siempre suma** su asignado; la regla aplica a meses pasados.
4. Solo los sobres arrastran: "Disponible del mes", "Disponible por día" y la fila de Hoy siguen siendo del mes.
5. Sobres sin eventos (por defecto o anteriores al log): su `assignedAmount` actual rige en todos los meses.
6. "Eliminar sobre" es "Archivar": se oculta, su historial y saldo quedan y se puede desarchivar (bloqueado si tiene recurrentes).
7. Tarjeta de sobre: "$gastado de $disponible" y una línea aparte con el arrastre ("+$30.000 de agosto").
8. Los ids de los sobres por defecto son fijos (`env_1`…`env_6`) en todos los dispositivos.

Además: el arrastre **no usa `createdAt`** (difiere entre dispositivos); el
punto de partida sale de las transacciones. Un sobre existe desde su
`sobre_creado` o su primer movimiento propio, lo que ocurra antes, así ningún
gasto se ignora.

## graphify

El grafo de conocimiento del proyecto vive en `graphify-out/` (nodos centrales,
comunidades y relaciones entre archivos).

- Para preguntas sobre el código, si existe `graphify-out/graph.json`, partir
  con `graphify query "<pregunta>"`. Para relaciones, `graphify path "<A>" "<B>"`;
  para un concepto puntual, `graphify explain "<concepto>"`. Devuelven un
  subgrafo acotado, más chico que `GRAPH_REPORT.md` o que un grep.
- Si existe `graphify-out/wiki/index.md`, usarlo para navegar en vez de
  recorrer el código a mano.
- Leer `graphify-out/GRAPH_REPORT.md` solo para revisiones amplias de
  arquitectura o cuando query/path/explain no alcanzan.
- Después de modificar código, correr `graphify update .` (solo AST, sin costo
  de API) para mantener el grafo al día.
