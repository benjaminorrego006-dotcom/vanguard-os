# Vanguard OS — reglas del proyecto

PWA offline-first (vanilla JS, ES Modules, sin bundlers) publicada en GitHub
Pages desde la rama `worktree-dashboard-mk3`. Estas reglas aplican a toda
sesión; el estado del trabajo está en `docs/PLAN.md` y el historial en
`docs/CHANGELOG.md`. Si algo de acá contradice el código, avisar antes de
cambiar cualquiera de los dos.

## Forma de trabajo

- **Una tarea por commit.** Cada commit con su push a `origin` apenas se crea;
  después, parar y esperar confirmación antes de la siguiente tarea.
- Si aparece un bug fuera del alcance de la tarea: reportarlo y preguntar
  antes de corregirlo.
- **ESLint `no-undef` limpio antes de cerrar** (ignorando `js/vendor/`):
  `npx eslint@8 --no-eslintrc --env browser,es2022 --parser-options=sourceType:module --rule "no-undef:error" --ignore-pattern "js/vendor/" js/`
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

## Interfaz (MK III)

- Colores y medidas solo con los tokens de `css/variables.css`.
- Chaflanes con `clip-path`, **sin `border-radius` ni sombras** (también en
  Chart.js: `borderRadius: 0`).
- Monoespaciada solo para números y rótulos; los párrafos van en sans-serif.
- Acentos: cian = Entreno, ámbar = Finanzas, violeta = Tareas. Rojo solo para
  alertas reales (un saldo negativo, un cobro que no alcanza).
- Modales: `.modal-overlay` + clase `open`, sin tapar la barra inferior ni el
  riel.
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
