# Vanguard OS — Changelog

## 10 oct 2026 — Días, Gastos anuales y catálogo (`docs/PLAN-PENDIENTES-OCT.md`)

Base: `1ed244e` (v302). Recordatorios queda en pausa. QA con scripts propios
de Playwright, de a una prueba, a 375×812 y 1280×800, zona
`America/Santiago`, reloj simulado, contextos limpios con `supabase.co`
bloqueado (stub del bundle cuando hace falta sesión), un solo servidor
dentro de la propia prueba y el navegador cerrado al final de cada una.

| Fase | Caché | Qué cambia |
|---|---|---|
| A1 — Días: datos (DB v6) | v303 | `idb.js`: `DB_VERSION` 6 con los stores `dias` (keyPath `fecha`) y `gastos_anuales` (keyPath `id`). La migración solo crea stores. `db.js`: `getDia(fecha)`, `getDias(desde, hasta)` (inclusivo, en orden), `esDescanso(fecha)` y `guardarDia({ fecha, descanso, nota })`. El descanso solo se marca para hoy o un día futuro. Quitarlo se puede siempre, y un día pasado que ya era de descanso puede editar su nota sin perderlo. La nota se recorta y queda en 140 caracteres como máximo, contados por punto de código para no partir un emoji. Sin descanso y sin nota, la fila se borra. Guardar sin cambios no emite nada. Eventos (modulo `dias`): `dia_actualizado` con la fila completa y `dia_borrado`. `sync.js`: su replay, su destino en el espejo (`dias`, id = fecha) y `dias` y `gastos_anuales` en `MIRROR_STORES`. El backfill usa `fecha` como id de `dias`. Respaldo: los dos stores van en `STORES_RESPALDO`. Al restaurar un respaldo que no los trae, se vacían igual que `medidas` (el log se reemplaza entero; nuevo `STORES_VACIAR_SI_FALTAN`). Supabase: `supabase/migrations/20261010120000_dias_gastos_anuales.sql`, con las tablas espejo `dias` y `gastos_anuales` (PK user_id + id, RLS `user_id = auth.uid()`, grants a `authenticated` y a `service_role`), aplicada con la CLI. |

### A1 — QA

- Migración (`a1-migracion`): con el código de `1ed244e` se importó el respaldo demo de 3 meses (base v5, 701 eventos). Después se abrió una segunda pestaña con el código nuevo en el mismo origen. La pestaña vieja mostró "Hay una versión nueva. Recarga la app." y la base quedó en v6 con `dias` y `gastos_anuales` vacíos. Las filas de los 16 stores v5 siguen todas, idénticas. Solo cambiaron los 4 recurrentes que se procesaron al abrir Hoy en octubre (8 eventos nuevos, `recurrente_procesado` y `movimiento_registrado`). Ningún evento ni singleton se perdió y todas las pestañas cargan.
- Datos (`a1-dias`). Todavía no hay interfaz (llega en A3), así que estos casos se probaron llamando a `db` desde la página. Casos: descanso y nota hoy, descanso ayer rechazado, nota ayer aceptada, descanso mañana, nota de 142 caracteres que queda en 140 sin partir el emoji, fecha mal formada rechazada y guardar sin cambios sin evento. Editar emite `dia_actualizado` con la fila completa. Con el reloj dos días adelante, el día de descanso ya pasado mantiene el descanso al editar su nota, se le puede quitar y no se le puede volver a poner. Vaciar borra la fila y emite `dia_borrado`; vaciar un día inexistente no emite nada.
- Espejo con el stub: la tabla `dias` queda igual al store (id = fecha) y los 8 eventos suben al log remoto. Un segundo contexto limpio con ese log reconstruye `dias` idéntico.
- Respaldo por Configuración: el archivo exportado trae `dias` y `gastos_anuales`, e importarlo en el segundo contexto restaura `dias`. Importar el respaldo demo, anterior a v6, deja `dias` vacío.
- Supabase: las dos tablas con RLS, una política y los grants a `authenticated` y a `service_role`, comprobados con `db query --linked`.
- Consola limpia en todas las pruebas. ESLint `no-undef` limpio.

## 7 oct 2026 — Limpieza y Recordatorios (`docs/RECORDATORIOS-PLAN.md`)

Base: `9b709fc` (v295). Primero la limpieza (L1, L2), después el plan
de Recordatorios por fases; el plan y su tabla de estado están en
`docs/RECORDATORIOS-PLAN.md`. QA con Playwright de a una, a 375×812 y
1280×800, zona `America/Santiago`, reloj simulado, contextos limpios sin
Supabase, un solo servidor y pruebas en primer plano.

| Fase | Caché | Qué cambia |
|---|---|---|
| L1 — Esquinas fuera del Laboratorio | v296 | Decisión del usuario: se mantiene la regla de MK III, que lleva chaflán solo en las tarjetas principales (`card-hero`); el resto de las tarjetas, rectas. La medición mostró que las tarjetas de Entreno, Finanzas y Configuración ya se veían rectas por esa regla, aunque tenían radios en línea sin efecto. Se sacaron todos los radios en línea (salvo los círculos, `50%`) de `hiit-timer.js`, `hiit-rutina-form.js`, `rutina-form.js`, `rutinas-lista.js`, `entrenamiento.js`, `finanzas.js`, `goal-card.js` y `activity-heatmap.js` (celdas del mapa de calor). También de las pestañas, selectores, botones y marcas de `laboratorio.js`, `lab-entreno.js`, `lab-finanzas.js`, `lab-tareas.js` y `donut-chart.js`. El control segmentado (`components.css`: pestañas de Finanzas, sub-pestañas de Tareas) queda recto. Las tarjetas del Laboratorio siguen con chaflán. |
| L2 — Números es-CL | v297 | Los números visibles con punto decimal pasan por `utils/numero.js`. IMC de Entreno ("25,9"). `mini-chart.js` suma la opción `formato` (por defecto `formatNumero`) para el número grande y las etiquetas: el volumen semanal de Entreno queda "19.596,5" y el ahorro por mes del Laboratorio de Finanzas va con `formatCurrency`. Estándares de fuerza: 1RM y ratio ("1,25×"). Mensaje de sugerencia de nivel: ratio. Observaciones de la semana: `dec` usaba `toFixed` y `replace` a mano. Configuración › Perfil: peso y estatura ("78,4 kg · 174 cm · 28 años", con "año" en singular para 1). Los `toFixed` de `foco.js` y `racha-reactor.js` quedan: son coordenadas de SVG y no se muestran. |
| F1 — Servidor (desplegado) | — | Sin cambios en la app (la caché queda en v297). Base real de Recordatorios: `7c91f92` (v297). `supabase/migrations/20261007120000_recordatorios_tablas.sql`: `push_suscripciones` (PK user_id + endpoint) y `recordatorios` (PK user_id + id, índice de pendientes), con RLS `user_id = auth.uid()`, grants a `authenticated` y también a `service_role` (en este proyecto la service role no ve una tabla nueva sin grant), y las extensiones pg_cron y pg_net. `20261007120100_recordatorios_cron.sql`: job `enviar-recordatorios` cada minuto con `net.http_post`, que manda el encabezado `x-cron-secret` leído de Vault (`recordatorios_cron_secret`). Edge Function `supabase/functions/enviar-recordatorios/index.ts` (Deno, `npm:web-push`): exige `x-cron-secret` (401 sin él), reclama los vencidos en un solo UPDATE con `enviado_en` (dos llamadas que se pisen no mandan dos veces), envía a todas las suscripciones del usuario, borra las que responden 404/410 y no manda los atrasados más de una hora. Desplegada con `--no-verify-jwt`, porque la clave pública nueva no es un JWT. Claves VAPID generadas con `web-push`: la privada, el subject y `CRON_SECRET` están solo en los secretos de Supabase (y el secreto del cron en Vault); la pública queda anotada en `docs/RECORDATORIOS.md` para F2. `docs/RECORDATORIOS.md`: cómo funciona, qué hay en Supabase, cómo se instaló con la CLI y los pasos para rehacerlo desde el panel web, escritos para alguien que no programa. `.gitignore`: `supabase/.temp/` y `supabase/.branches/`. |
| F2 — Suscripción en la app | v298 | `sw.js`: `push` muestra la notificación con el ícono de la app, `tag` = id del aviso (un reenvío la reemplaza) y la url en `data`. `notificationclick`: con la app abierta la enfoca y le manda `ABRIR_URL` (`app.js` solo cambia el hash, sin recargar); si no está abierta, la abre en esa url. Nuevo `js/core/push.js` (en `PRECACHE_URLS`), con la clave VAPID pública: `estadoPush` (sin-sesion / requiere-instalar / sin-soporte / bloqueado / desactivado / activado), `activarPush` (permiso, `subscribe` con `userVisibleOnly`, upsert en `push_suscripciones` con un "dispositivo" corto como "Android · Chrome · app instalada"), `desactivarPush`, `refrescarSuscripcion` (al abrir la app, por si el navegador renovó el endpoint) y `enviarAvisoPrueba` (un recordatorio `prueba:<ts>` para dentro de 1 minuto). Nuevo `js/components/recordatorios-config.js` (en `PRECACHE_URLS`): sección Configuración › Recordatorios, debajo de Cuenta. Sin cuenta solo lo explica. Según el estado, ofrece "Activar en este dispositivo" o "Enviar aviso de prueba" y "Desactivar en este dispositivo"; si está bloqueado o falta instalar en iPhone, dice qué hacer. Repinta con la guardia de vista vigente. Decisión técnica: "requiere instalar" se muestra solo en iPhone; en Android, Chrome permite push también sin instalar. |
| F3 — Cálculo de avisos | v299 | Nuevo `js/core/recordatorios-calculo.js` (puro: solo usa `utils/`): `calcularRecordatorios(datos, prefs, desde, hasta)` → [{ id, envia_en, titulo, cuerpo, url }], con ids estables `habito:<id>:<día>`, `tarea:<id>:<día>`, `cobro:<id>:<día del cobro>` y `resumen:<día>`. Hábitos: a la hora elegida por hábito (sin hora, no avisa), solo los días que aplica, si no está cumplido y, si es semanal, mientras la semana no llegue al objetivo; con meta a medias sigue avisando. Tareas de Lista no hechas: el día que vencen, a la hora configurada (09:00). Cobros recurrentes: el día anterior a las 20:00, con el monto (`formatCurrency`). Resumen: "Hoy: N tareas, M hábitos." a su hora, si hay algo. La hora local se arma con `new Date(año, mes, día, h, m)`, así el cambio de horario lo resuelve `Date`. Las reglas "¿aplica / se cumplió?" de hábitos y la próxima fecha de una recurrente pasan de `db.js` a `utils/habito-dias.js` y `utils/recurrentes.js`, sin cambiar su lógica: `db.js` las importa. Nuevo `js/core/recordatorios.js`: sube los avisos de los próximos 7 días (upsert por id estable, `enviado_en: null`) y borra los pendientes con prefijo de recordatorio que ya no corresponden. No toca los `prueba:` ni lo ya enviado. Va de a una pasada y junta varios cambios seguidos (1,5 s). Sin sesión o sin conexión no hace nada. Disparadores: abrir la app, cualquier evento `tarea_*`, `habito_*`, `recurrente_*` o `configuracion_actualizada` (escuchando `vg-event-logged`), `vg-synced` y volver a tener conexión. `db.getPrefsRecordatorios` / `savePrefsRecordatorios`: `settings.recordatorios` normalizado (todo apagado por defecto), con `configuracion_actualizada` y el mapa completo. Archivos nuevos en `PRECACHE_URLS`. |
| F4 — Preferencias por tipo | v300 | Configuración › Recordatorios suma "Qué avisar" siempre que haya sesión (las preferencias son de la cuenta y valen para todos los dispositivos con avisos activados). Tiene un interruptor por tipo: Hábitos (a la hora de cada hábito, con cuántos tienen hora), Tareas de Lista (09:00), Cobros recurrentes (20:00, el día anterior) y Resumen del día (08:00), cada uno con su hora (`<input type="time">`, deshabilitada si está apagado). Cada cambio guarda el mapa completo (`db.savePrefsRecordatorios`, `configuracion_actualizada`), y eso dispara el recálculo de F3: apagar un tipo borra sus pendientes y cambiar la hora los mueve (mismos ids). Formulario de hábito: "Recordarme a las…" opcional, guardado en `settings.recordatorios.habitos.horas[id]` solo si cambió, con una nota según los avisos de hábitos estén encendidos o no. Las casillas usan el acento de la app. |
| F5 — QA final y docs | — | Sin cambios de código (la caché queda en v300). `docs/PLAN.md`: Recordatorios y la limpieza pasan a Hecho, y la pasada de esquinas ya no está pendiente. `docs/RECORDATORIOS.md` suma "Prueba en el teléfono": 8 pasos para alguien que no programa (actualizar, iniciar sesión, activar, aviso de prueba, hábito, tarea y cobro con la app cerrada, y dejar las horas) y qué revisar si algo no llega. |
| Arreglo — `enviado_en` fuera del upsert | v301 | `js/core/recordatorios.js`: el upsert de `sincronizar()` ya no manda `enviado_en`. Antes mandaba `null`, y un aviso que la Edge Function ya había marcado como enviado (con su hora todavía en el rango de 7 días) volvía a quedar pendiente en la siguiente sincronización y podía mandarse dos veces. Ahora una fila nueva queda en `null` por el default de la tabla y una ya enviada se mantiene enviada. |
| Arreglo — Permiso de notificaciones en Android | v302 | Bug visto en el teléfono: "Activar en este dispositivo" no mostraba el permiso. `activarPush` esperaba la sesión de Supabase antes de `Notification.requestPermission()`, y Chrome en Android ya no lo tomaba como acción del usuario: lo descartaba en silencio o lo mandaba a la interfaz silenciosa. Ahora el click llama `pedirPermisoNotificaciones()` (`push.js`) primero, de forma síncrona y sin ningún await antes. `activarPush(pedido)` recién con el permiso concedido carga la sesión, se suscribe y guarda. Resultados: `activado`, `bloqueado` (negado) y `sin-respuesta` (se cerró o quedó silenciado). Siempre hay un aviso con el resultado. Con `sin-respuesta`, la sección explica cómo permitir a mano (app instalada: mantener presionado el ícono › Información de la app › Notificaciones; Chrome: candado › Permisos › Notificaciones › Permitir) y vuelve a ofrecer "Activar". Si Supabase rechaza la suscripción, el error completo va a la consola y el aviso muestra el mensaje y el código. |

### L1 — QA

- 375×812 y 1280×800 (`qa-l1`): Entreno, rutinas GYM y HIIT, formulario de rutina, formulario HIIT, timer HIIT (desde la plantilla Tabata), las 5 pestañas de Finanzas y las metas del Laboratorio. Ningún elemento visible queda con radio, salvo los círculos, y ningún texto cae dentro del chaflán de las `card-hero`. Regresión: chaflanes del Laboratorio. Consola limpia; ESLint `no-undef` limpio. Capturas `l1-*`.

### L2 — QA

- 375×812 y 1280×800 (`qa-l2`, con una medida de 78,4 kg): ningún texto visible tiene un decimal con punto en Entreno, Cuerpo, Progreso (estándares de fuerza), Configuración ni en todas las pestañas del Laboratorio de Entreno y de Finanzas. IMC "25,9", volumen "19.596,5" y perfil "78,4 kg · 174 cm · 28 años". Consola limpia; ESLint `no-undef` limpio. Capturas `l2-*`.

### F1 — QA

- Instalado con la CLI (`npx supabase`), con la sesión iniciada por Benjamin y sin la contraseña de la base (`db query --linked` va por la API de gestión).
- Tablas: las dos con RLS, sus políticas, los grants a `authenticated` y a `service_role`, y pg_cron 1.6.4 y pg_net 0.20.4 activos. Los secretos `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `CRON_SECRET` existen. El job `enviar-recordatorios` está activo cada minuto.
- Llamada sin el secreto: 401.
- Con un recordatorio de prueba en la cuenta de Benjamin, vencido hace 20 s, la llamada manual respondió `tomados: 1` y el aviso quedó con `enviado_en`. `enviados: 0`, porque todavía no hay dispositivos suscritos.
- En otro intento lo tomó el cron solo, en el tic del minuto. pg_net registró respuestas 200: el camino pg_cron → pg_net → función funciona.
- Antes de corregir el grant de la service role, la función respondía `permission denied for table recordatorios`.
- El recordatorio de prueba se borró. En el repo no hay claves privadas.

### F2 — QA

- 375×812 y 1280×800 (`qa-rec2`).
- **Sin cuenta** (bundle real, red a Supabase bloqueada): la sección lo explica y no ofrece botones.
- **Con cuenta**, con un stub del bundle `supabase-js` (sesión falsa; `supabase.co` bloqueado; también enruta lo que pide el service worker) y un `PushManager` simulado, porque Chromium headless no tiene servicio de push:
  - "Activar en este dispositivo" deja la suscripción en `push_suscripciones` (`user_id`, `endpoint`, `p256dh`, `auth`, "Windows · Chrome"), con `userVisibleOnly` y la clave VAPID de 65 bytes. Queda "Avisos activados en este dispositivo".
  - "Enviar aviso de prueba" deja `prueba:<ts>` para dentro de 60 s, sin enviar.
  - Al recargar sigue activado y la suscripción no se duplica.
  - Un push entregado al service worker por CDP (`ServiceWorker.deliverPushMessage`) muestra la notificación con título, cuerpo, ícono `icon-192.png`, `tag` = id y url.
  - `ABRIR_URL` lleva la app a `#habitos`.
  - Desactivar borra la suscripción.
- **Permiso bloqueado:** lo explica, sin botón.
- **iPhone sin la app en la pantalla de inicio:** explica cómo agregarla.
- No se probó el clic real sobre la notificación (headless no lo permite) ni la entrega real por el servicio de push: quedan para la prueba en el teléfono. Consola limpia; ESLint `no-undef` limpio (también `sw.js`). Capturas `rec2-*`.

### F3 — QA

- Tabla de casos en Node con `TZ=America/Santiago` (`casos-recordatorios.mjs`, 17 casos, todos OK):
  - Hábito diario (hoy y mañana; 07:30 = 10:30 UTC en septiembre).
  - Hábito por días lun/mié/vie (solo el viernes) y hábito ya marcado (solo mañana).
  - Semanal con el objetivo cumplido (nada), meta a medias (sigue) y sin hora (nada).
  - Tarea que vence hoy (09:00 = 12:00 UTC; la hecha no).
  - Cobro el 25 (aviso el 24 a las 20:00 = 23:00 UTC, "$24.990.").
  - Resumen ("Hoy: 1 tarea, 3 hábitos.").
  - Nada antes de "desde", nada a las 22:00 y nada con las preferencias por defecto.
  - Cambio de horario de abril 2026: 09:00 del 4 = 12:00 UTC; del 5 y 6 = 13:00 UTC. Septiembre 2026: 09:00 del 5 = 13:00 UTC; del 6 y 7 = 12:00 UTC.
  - 00:30 del 6 de septiembre, hora que no existe: cae a las 01:30.
- En la app, 375×812 y 1280×800 (`qa-rec3`, stub de Supabase):
  - Sin sesión no toca la tabla.
  - Al guardar las preferencias se suben los 22 avisos de 7 días, iguales a un cálculo aparte; "prueba:1" queda.
  - El hábito a las 22:00 del 24 queda como 01:00 UTC del 25.
  - Marcar el hábito en Hábitos borra su aviso de hoy y deja el del 26.
  - Completar una tarea desde su detalle borra su aviso.
  - `vg-synced` recalcula y no toca lo ya enviado. Con todo apagado quedan solo la prueba y lo enviado.
- Regresión: racha y Lista (375). Consola limpia; ESLint `no-undef` limpio.

### F4 — QA

- 375×812 y 1280×800 (`qa-rec4`, stub de Supabase).
- **Sin cuenta:** no hay interruptores.
- **Con cuenta:** los 4 tipos están apagados, con las horas por defecto deshabilitadas.
- **Tareas:** al encenderlas suben 2 avisos a las 09:00. Cambiar la hora a 08:15 mueve los mismos ids, y apagarlas los borra y deshabilita la hora.
- **Cobros y Resumen:** al encenderlos suben sus avisos a las 20:00 y 08:00.
- **Hábito desde su formulario:** "Recordarme a las…" abre vacío y avisa que los de hábitos están apagados. Con 21:00 queda en settings, pero no sube nada mientras Hábitos esté apagado. Configuración muestra "1 con hora", y al encender Hábitos suben sus avisos a las 21:00. Al reabrir el formulario trae 21:00; con 19:45 se mueven, y borrar la hora los quita.
- `configuracion_actualizada` lleva el mapa completo. Sin scroll horizontal. Consola limpia; ESLint `no-undef` limpio. Capturas `rec4-*`.

### F5 — QA

- Recorrido completo por la barra y el menú ☰ (`qa-rec5`), a 375×812 y a 1280×800.
- **Sin cuenta:** todas las pestañas cargan, y Configuración › Recordatorios solo explica que hace falta una cuenta.
- **Con cuenta** (stub de Supabase):
  - "Activar en este dispositivo" guarda la suscripción.
  - Con los cuatro tipos encendidos y el aviso de prueba hay avisos de tareas, cobros, resumen y la prueba.
  - "Recordarme a las 22:00" en un hábito sube su aviso de hoy, y marcarlo lo borra.
  - Un push de tarea se muestra con el ícono.
  - Hoy, Tareas, Finanzas y Entreno siguen funcionando.
- Regresión: foco, respaldo (`qa-df5`), navegación y Cuerpo.
- Pruebas de a una, en primer plano, con un solo servidor y la memoria vigilada (800–940 MB libres entre pruebas). Consola limpia; ESLint `no-undef` limpio.
- Pendiente: la prueba real en el teléfono (entrega por el servicio de push real y clic en la notificación). Headless no tiene servicio de push y no deja hacer clic en una notificación.

### Arreglo `enviado_en` — QA

- 375×812 y 1280×800 (`qa-rec-enviado`, stub de Supabase, desde la interfaz):
  - Al encender Tareas, los avisos nuevos entran sin `enviado_en` (pendientes).
  - Se marca uno como enviado, como hace la Edge Function, y después de una nueva sincronización (`vg-synced`) sigue enviado; el otro sigue pendiente.
  - Cambiar la hora de Tareas a 10:40 mueve el pendiente, que sigue pendiente, y el enviado no vuelve a quedar pendiente.
  - Con el código anterior, la comprobación del aviso enviado habría fallado.
- Regresión: `qa-rec3` (con la expectativa ajustada a "sin campo o null") y `qa-rec5`. Consola limpia; ESLint `no-undef` limpio.

### Arreglo del permiso — QA

- 375×812 y 1280×800 (`qa-permiso`, stub de Supabase). El permiso parte en `default`, y un espía registra cada llamada a `requestPermission` (y si ocurrió dentro del evento click) y a `getSession`.
- **granted, denied y default:** en los tres, `requestPermission` es la primera llamada y ocurre dentro del click; `getSession` llega después.
  - granted: suscripción guardada, "Avisos activados" y su aviso.
  - denied: aviso de bloqueo, la sección explica cómo desbloquear y no guarda nada.
  - default: aviso, instrucciones para permitir a mano (app instalada y Chrome) y otra vez el botón Activar.
- **Supabase rechaza la suscripción** (RLS, 42501): el aviso muestra el mensaje y el código, el error completo queda en la consola y el botón vuelve a estar disponible.
- Con el código anterior, la comprobación del orden habría fallado (`getSession` llegaba antes).
- Regresión: `qa-rec2`. Consola limpia en los casos sin error; ESLint `no-undef` limpio. Captura `permiso-default-*`.

## 5 oct 2026 — Fase 6: medidas corporales y fotos (`docs/FASE6-MEDIDAS.md`)

Base real: `8ce593a` (v288), después de los arreglos A y B. Plan por
fases; el plan y su tabla de estado están en `docs/FASE6-MEDIDAS.md`. QA
con Playwright de a una, a 375×812 y 1280×800, zona `America/Santiago`,
reloj simulado, contextos limpios sin Supabase.

| Fase | Caché | Qué cambia |
|---|---|---|
| F1 — Datos de medidas | v289 | `idb.js` pasa a `DB_VERSION` 5 con los stores `medidas` y `fotos_progreso` (keyPath `id`); la migración solo los crea. `medidas` entra en `STORES_RESPALDO` y `MIRROR_STORES`; `fotos_progreso` en ninguno. `db`: `getMedidas` (más reciente arriba: fecha y, el mismo día, `createdAt`), `ultimaMedida(campo)`, `registrarMedida`, `editarMedida` (null o '' quita un campo) y `eliminarMedida`, con eventos `medida_registrada` / `medida_editada` / `medida_eliminada` (modulo `perfil`, payload = la medida completa; al eliminar, solo la fecha). Replay en `applyRemoteEvent` y destino en el espejo. Validación (`normalizarMedida`): fecha válida y no futura, al menos un valor, peso 30–300 kg y perímetros 20–200 cm; acepta "78,4", redondea a un decimal y recorta la nota a 200 caracteres. Mensajes en español para la hoja de F2. Peso al perfil: al registrar o editar, si es la medida con peso más reciente, `saveProfile` con ese `pesoKg`; sin perfil guardado no se crea uno, y eliminar no toca el perfil. Restaurar un respaldo anterior a la Fase 6 (sin `medidas`) deja el store vacío, igual que su log. |
| F2 — Registro y lista | v290 | Nuevo `js/components/cuerpo.js` (en `PRECACHE_URLS`). Entreno, vista principal: tarjeta "CUERPO" en cian bajo Volumen/Sesiones/IMC. Muestra el último peso y su variación contra el peso vigente hace 30 días ("78,4 kg · −1,2 en 30 días"; sin un registro de hace 30 días o más, va sin variación), "Último registro", "Registrar medidas" e "Historial". Sin medidas, invita a registrar. Hoja `#medida-modal` (`.modal-overlay` + `open`, sin tapar la barra ni el riel): fecha (hoy por defecto, sin días futuros), peso y 4 perímetros con `inputmode="decimal"` (aceptan "78,4"), nota opcional, y bajo cada campo "Anterior: 79,6 kg · 20 ago" (al editar, el anterior a esa medida). Los errores de validación de `db` se muestran en la hoja, sin cerrarla. Historial como sub-vista de Entreno (Atrás vuelve a la principal): medidas por fecha, la más reciente arriba, con Editar (vaciar un campo lo quita) y Eliminar ("¿Eliminar esta medida?", con el id y la fecha tomados antes del `await`). Guardar y eliminar repintan la vista abierta; el perfil toma el peso según F1, así el IMC se actualiza. |
| F3 — Gráficos | v291 | Historial de Cuerpo: tarjeta "Peso" con un gráfico de línea (Chart.js por `ensureChartJs`, que se carga recién al pintarlo). Por defecto muestra 90 días, con selector 30 / 90 / 365 d (`aria-pressed`), y suma la media móvil de 7 días de calendario como segunda línea tenue (cian al 40 %), con leyenda. Un punto por día: el último registrado ese día (`serieDiaria`). Con menos de 2 días en el rango, en vez del gráfico va un aviso: "Registra tu peso al menos dos días para ver el gráfico.", "Sin registros de peso en los últimos N días." o, sin pesos, "Registra tu peso para ver su evolución.". Mini-gráficos para cada perímetro con al menos 2 días registrados (todo el historial): último valor, variación desde el primero y la línea. Los gráficos se destruyen al repintar y al salir de Entreno. Laboratorio de Entreno › Desglose: fila "Peso" (`variacionPesoMes`) con el último peso del mes contra el vigente al empezar el mes ("78,2 kg · −1,7 kg en septiembre"), aparte del selector de período; sin pesos en el mes lo dice. Las funciones de series (`serieDiaria`, `mediaMovil7`, `variacionPesoMes`) quedan en `cuerpo.js`. |
| Arreglo C — Actualizar la base con varias ventanas abiertas | v292 | `idb.js`: la conexión abierta maneja `onversionchange` (se cierra) y la apertura maneja `onblocked`. Avisa con eventos de `window` (`vg-db-version-nueva`, `vg-db-bloqueada`, `vg-db-abierta`), y `app.js` los escucha desde que carga, antes de `db.init()`. Pestaña con una versión vieja cuando otra abre una nueva: cierra su conexión y muestra "Hay una versión nueva. Recarga la app." con "Recargar". Pestaña nueva bloqueada por otra que no suelta la versión vieja: "Cierra Vanguard en las otras pestañas o ventanas para terminar la actualización.", por encima del splash (los avisos suben a z-index 10000 solo mientras dure y vuelven a 4000). La apertura sigue pendiente y termina sola al cerrarse la otra, y el aviso se va. Ambos avisos quedan fijos hasta tocarlos. La v4 ya publicada no tiene `onversionchange`: en el paso a v5 la pestaña vieja no se cierra sola, y lo que se ve es el aviso de bloqueo en la nueva. El cierre automático rige desde v5 para las versiones siguientes. |
| F4 — Fotos (local) | v293 | Nuevo `js/components/fotos-progreso.js` (en `PRECACHE_URLS`). `reducirFoto` usa canvas, respeta la orientación EXIF (`createImageBitmap` con `imageOrientation: 'from-image'`) y deja 1080 px en el lado largo, en JPEG calidad 0,82. `db`: `getFotos`, `getFoto`, `agregarFoto` y `eliminarFoto` sobre `fotos_progreso` ({ id, fecha, blob, ancho, alto, medidaId?, createdAt }). Eventos `foto_agregada` / `foto_eliminada` con solo { id, fecha }, como auditoría, con caso vacío en `applyRemoteEvent` y sin espejo; las fotos no salen del dispositivo. Galería en el historial de Cuerpo: aviso fijo "Las fotos quedan solo en este teléfono. Exporta tus fotos para no perderlas.", "Tomar foto" (`accept="image/*"` + `capture`) y "Elegir foto" (sin `capture`, que no deja elegir de la galería), y miniaturas agrupadas por fecha. Visor `#foto-modal` con tamaño y Eliminar (con confirmación; libera el object URL). "Comparar" abre `#foto-comparar-modal`, antes / ahora lado a lado: por defecto la más antigua y la más nueva, cada lado elegible. Ambos modales dejan libre la navegación y Atrás los cierra. Hoja de registro: "Fotos (opcional)". Quedan pendientes hasta guardar la medida y se guardan con su fecha y su `medidaId`; Cancelar o reabrir las descarta. La tarjeta de Cuerpo muestra siempre "Historial y fotos", para llegar a la galería sin medidas. Los object URLs se liberan al eliminar y al salir de Entreno. |
| Arreglo D — Navegación desde sub-vistas | v294 | Bug previo a la Fase 6. Con una sub-vista abierta (Historial de sesiones, Cuerpo, el detalle de un hábito), tocar otra pestaña de la barra disparaba primero el `popstate` de la vista, que volvía a su principal y se repintaba de forma asíncrona. Después llegaba el `hashchange` del router, y ese repintado tardío pisaba la vista nueva; en la versión anterior pasaba 4 de 6 veces a 375. Nuevo `js/core/vista-activa.js` (en `PRECACHE_URLS`): `marcarNavegacion(viewId)` da el id de cada `navigate()`, el mismo que ya usaba el router (`navSeq`), y `guardiaVista(viewId)` devuelve la comprobación. Cada vista toma su guardia en `mountListeners` y no escribe en el DOM tras un `await` si la navegación ya cambió. Con guardia: Entreno (`refreshFull`, la recarga por sync y las sub-vistas que pintan tras un `await`: rutinas, progreso, historial de sesiones, Cuerpo y sesión), Hábitos (el `popstate` del detalle, la recarga por sync y `refresh`), Tareas (`repintar`, la recarga por sync y `refresh`) y Semana (`planificador.js`: la recarga por sync y `refresh`). Finanzas no se tocó: su `refresh` solo escribe en sus contenedores buscados por id, que tras cambiar de vista no existen o quedan sueltos, y nunca escribe en `#view-root`. |
| F5 — Exportar e importar fotos | v295 | Nuevo `js/utils/fotos-respaldo.js` (en `PRECACHE_URLS`). Configuración › Respaldos suma "Fotos de progreso". Antes de exportar muestra la cantidad y el tamaño estimado ("El respaldo no incluye tus fotos. 10 fotos · unos 1 MB.": base64 4/3 más los datos de cada foto); sin fotos, "Exportar fotos" queda deshabilitado. "Exportar fotos" descarga `vanguard-fotos-AAAA-MM-DD.json` ({ tipo: 'vanguard-fotos', version: 1, exportadoEn, fotos: [{ id, fecha, ancho, alto, medidaId?, createdAt, mime, datos }] }, con la imagen en base64). "Importar fotos" lee ese archivo y agrega con `db.importarFotos` solo los ids que no existen, sin duplicar ni pisar; cada una deja su `foto_agregada` { id, fecha }. Avisa "N fotos importadas · M ya estaban" (y las que no se pudieron leer) y rechaza un archivo que no es de fotos. El respaldo normal sigue sin fotos. |
| F6 — QA final y docs | — | Sin cambios de código (la caché queda en v295). `docs/PLAN.md`: la Fase 6 pasa de Pendiente a Hecho, y queda anotada como pendiente la pasada de esquinas redondeadas fuera del Laboratorio. Tabla de estado del plan al día. |

### F1 — QA

- Base v4 llena → v5 (`qa-med1`, perfil persistente con la versión anterior `8ce593a` servida en otro puerto): con la v4 se importa el respaldo demo (701 eventos, 13 stores con datos). Al abrir con la v5, la base queda en versión 5 con `medidas` y `fotos_progreso` vacíos. Los 13 stores quedan idénticos fila por fila, y los singletons también (salvo `storagePersistente`, que la app reescribe al abrir). Hoy carga con racha 84.
- Todavía sin interfaz (llega en F2), así que se probó por `db`:
  - "78,4" se guarda como 78.4 y el perfil pasa de 76 a 78.4; un peso con fecha anterior no lo toca.
  - La validación rechaza una medida vacía, fuera de rango, en cero, texto, una fecha futura y una fecha inexistente.
  - El orden y `ultimaMedida` funcionan por campo. Editar la más reciente cambia el perfil y editar una antigua no; editar no deja una medida sin valores.
  - Eliminar no toca el perfil.
  - Quedan 6 eventos con modulo `perfil` y la racha no cambia.
- Replay de esos eventos en un segundo contexto: mismo store `medidas`.
- Respaldo: "Exportar respaldo" trae `medidas` y sus eventos, y no `fotos_progreso`. Importado en un navegador limpio queda igual. Importar el respaldo demo (sin `medidas`) encima deja el store vacío.
- 375×812 y 1280×800. Regresión: `qa-df5`, sin localStorage y `qa-respaldo-foco`. Consola limpia; ESLint `no-undef` limpio.

### F2 — QA

- 375×812 y 1280×800 (`qa-med2`, todo por la interfaz):
  - Sin medidas, la tarjeta invita a registrar y no ofrece historial.
  - La hoja abre con hoy (máximo hoy), teclado decimal y la navegación libre.
  - Vacía, avisa "Ingresa al menos una medida."; con peso 500, "El peso tiene que estar entre 30 y 300 kg.", y no guarda.
  - "79,6" el 20 ago se guarda. La segunda hoja muestra "Anterior: 79,6 kg · 20 ago" y "Anterior: 86 cm · 20 ago". Con "78,4" hoy, la tarjeta dice "78,4 kg · −1,2 en 30 días" y el perfil queda en 78.4.
  - Atrás con la hoja abierta la cierra (desde la principal y desde el historial).
  - Historial: "Jue 24 sept | Peso 78,4 kg | Cintura 85,5 cm | Brazo 35 cm | En ayunas" arriba de la del 20 ago.
  - Editar abre con "78,4" y "85,5" y el anterior del 20 ago. Cambiar a "78,1" y vaciar el brazo lo quita.
  - Eliminar pregunta "Se borra la medida del 20 ago. No se puede deshacer."; cancelar no borra y confirmar la quita. El log queda con 2 registradas, 1 editada y 1 eliminada.
  - Atrás vuelve a la principal con "78,1 kg" y sin variación.
- Regresión de Entreno: HUD (`qa-f6`), editar sesiones y navegación a 1280. Sin scroll horizontal. Consola limpia; ESLint `no-undef` limpio. Capturas `med2-*`.

### F3 — QA

- 375×812 y 1280×800 (`qa-med3`):
  - Con 1 registro hecho por la hoja: "Registra tu peso al menos dos días para ver el gráfico.", sin canvas ni mini-gráficos.
  - Con 120 días sembrados: peso casi diario con huecos, dos registros el mismo día, cintura semanal y brazo una sola vez.
  - En 90, 30 y 365 días, los puntos del gráfico (fecha y valor) cuadran con la tabla del historial (72, 24 y 96 puntos, uno por día), y la media de 7 días cuadra con un cálculo aparte. El día con dos registros grafica el último (70 kg).
  - Solo la cintura tiene mini-gráfico.
  - Laboratorio de Entreno: "78,2 kg · −1,7 kg en septiembre", igual al cálculo desde la tabla.
- Regresión: `qa-med2`, `qa-med1`, chaflanes del Laboratorio (375 y 1280, con la fila nueva). Sin scroll horizontal. Consola limpia; ESLint `no-undef` limpio. Capturas `med3-*`.

### Arreglo C — QA

- 375×812 y 1280×800 (`qa-arr-c`, dos pestañas del mismo navegador, sin service worker):
  - Pestaña vieja real (`8ce593a`, base v4) abierta y luego la nueva (v5): la nueva muestra "Cierra Vanguard en las otras pestañas o ventanas…" encima del splash. Al cerrar la vieja, la nueva termina de abrir (base v5), monta Hoy sin recargar, el aviso se va y los avisos vuelven a z-index 4000.
  - App nueva (v5) abierta y otra pestaña que abre la base en v6: la v6 abre en 3 ms sin bloquearse, la v5 cerró su conexión y muestra "Hay una versión nueva. Recarga la app." con "Recargar", que recarga la página.
- Regresión: `qa-med1` (migración v4 → v5 con datos), sin localStorage y navegación. Consola limpia (salvo los errores esperados de una v5 que recarga contra una base v6, propios de la prueba); ESLint `no-undef` limpio. Capturas `arrc-*`.

### F4 — QA

- 375×812 y 1280×800 (`qa-med4`, fotos de 12 MP generadas con detalle de cámara, unos 4,8 MB):
  - Sin medidas se llega a la galería, con su aviso.
  - "Elegir foto": 4000 × 3000 → 1080 × 810, Blob JPEG de 142 KB. "Tomar foto": 3000 × 4000 → 810 × 1080, 120 KB.
  - En la hoja, la foto queda pendiente; Cancelar la descarta y al reabrir no queda nada. Guardada con una medida del 10 sept, queda con esa fecha y su `medidaId`.
  - La galería agrupa por fecha ("24 sept: 2 · 10 sept: 1"). Recargar conserva las 3 fotos.
  - Visor: imagen y "810 × 1080 px · 120 KB", con la navegación libre; Atrás lo cierra.
  - Comparar: 10 sept / 24 sept lado a lado, cada lado elegible; Atrás lo cierra y queda en el historial.
  - Eliminar: sale del store y de la galería, y su object URL queda liberado.
  - El log tiene 3 `foto_agregada` y 1 `foto_eliminada`, con solo id y fecha. El respaldo JSON no lleva fotos.
- Una corrida anterior falló en "en la hoja la foto queda pendiente". Fue con unos 500 MB de RAM libres y terminó cortada por falta de memoria; en las corridas completas pasó a 375 y 1280. No hay error de lógica: la foto se agrega a las pendientes recién cuando termina de reducirse, y no toca el store hasta guardar la medida.
- Regresión: `qa-med2` y `qa-med3`. Para llegar a Configuración la prueba usa una carga completa (el bug de navegación desde sub-vistas de Entreno es el arreglo D). Consola limpia; ESLint `no-undef` limpio. Capturas `med4-*`.

### Arreglo D — QA

- 375×812 y 1280×800 (`qa-arr-d`): desde el Historial de sesiones, el historial de Cuerpo y el detalle de un hábito, cada pestaña de la barra se tocó 10 veces. 240 navegaciones, 0 fallos: siempre queda la vista nueva, con su hash y su pestaña activa, sin la sub-vista vieja encima. Atrás de Android desde esas sub-vistas: 30 de 30 vuelve a la principal del módulo.
- Regresión: Semana (`qa-sem7`), Lista, Cuerpo (`qa-med2` 1280), editar sesiones, racha y foco. Pruebas de a una, en primer plano, con un solo servidor. Consola limpia; ESLint `no-undef` limpio.

### F5 — QA

- 375×812 y 1280×800 (`qa-med5`):
  - Sin fotos, "Exportar fotos" está deshabilitado y lo dice.
  - Se agregan 10 fotos por la interfaz: 9 desde la galería y 1 desde la hoja, ligada a una medida del 12 sept. Configuración muestra "10 fotos · unos 1 MB" y el archivo real (1043 KB) queda dentro del 5 % del estimado.
  - Se descarga `vanguard-fotos-2026-09-24.json` con las 10, cada una en base64 con sus bytes exactos. El respaldo normal no trae fotos.
  - En un navegador limpio (datos del sitio borrados) se restaura el respaldo normal: vuelve la medida, todavía sin fotos. Al importar las fotos vuelven las 10 con los mismos ids, fechas, medida, tamaño y tipo, aparece "10 fotos importadas" y el resumen se pone al día. La galería las muestra.
  - Importar otra vez: "0 fotos importadas · 10 ya estaban". Un archivo que no es de fotos se rechaza sin tocar nada.
- Regresión: `qa-df5` y `qa-respaldo-foco`. Pruebas de a una, en primer plano. Consola limpia; ESLint `no-undef` limpio. Captura `med5-config-*`.

### F6 — QA

- Recorrido completo por la barra y el menú ☰ normales (`qa-f6-final`), a 375×812 y a 1280×800:
  - Se registran dos medidas por la hoja: 1 sept (80 kg, cintura 87) y 24 sept (78,4 kg, cintura 85, nota y una foto).
  - La tarjeta Cuerpo dice "78,4 kg", sin variación porque no hay un peso de hace 30 días o más. El IMC de Entreno usa el peso nuevo (25.9).
  - En el historial, el gráfico de peso tiene 2 puntos (80 y 78,4), hay mini-gráfico de cintura y la foto de la hoja está en la galería. Se agrega otra foto y "Comparar" muestra las dos.
  - Desde el historial de Cuerpo, la barra lleva a Hoy sin que Entreno lo pise. El Laboratorio de Entreno dice "78,4 kg · −1,6 kg en septiembre".
- Respaldo normal: con 262 KB de fotos en el dispositivo crece solo 3267 B (6 eventos, las medidas y el perfil), sin ninguna imagen. Configuración ofrece las 2 fotos para exportar aparte.
- Regresión de Entreno: HUD de la sesión (`qa-f6`), editar sesiones, "Hoy toca", `qa-med3`, `qa-med4` y chaflanes del Laboratorio. Pruebas de a una, en primer plano, con un solo servidor. No se repitieron `qa-med1` ni `qa-arr-c` porque necesitan un segundo servidor con la versión anterior; pasaron en sus fases. Consola limpia; ESLint `no-undef` limpio. Capturas `f6-*`.

## 5 oct 2026 — Tareas: dificultad y foco (`docs/PLAN-DIFICULTAD-FOCO.md`)

Plan por fases; el plan y su tabla de estado están en
`docs/PLAN-DIFICULTAD-FOCO.md`. QA con Playwright de a una, a 375×812 y
1280×800, zona `America/Santiago`, reloj simulado, contextos limpios sin
Supabase.

| Fase | Caché | Qué cambia |
|---|---|---|
| F1 — Dificultad: datos y formulario | v282 | Formulario de tarea (`task-form.js`): chips "Fácil · Media · Difícil" bajo la prioridad, con la estética de los chips de estado (`role="radiogroup"`, 44 px). Sin elegir, la tarea no lleva el campo (se leerá como `media` al calcular): una tarea nueva o vieja sin `dificultad` abre con "Media" sugerida (borde punteado) y guardarla sin tocar no escribe nada. Al elegir, `saveTask` guarda `dificultad: 'facil' | 'media' | 'dificil'` y viaja en el payload completo de `tarea_creada` / `tarea_actualizada`. No hizo falta tocar `db.js` (`saveTask` mezcla lo que recibe; no hay un `updateTask` aparte) ni `sync.js` (el replay de `tarea_creada` pone el payload y el de `tarea_actualizada` hace `mergeRow`). La captura rápida no pide dificultad. |
| F2 — Dificultad: dónde se ve | v283 | Nuevo `js/utils/dificultad.js` (en `PRECACHE_URLS`): `dificultadDe` (sin campo = `media`), `pesoDificultad` (1/2/3), `etiquetaDificultad` y `marcaDificultad`, que solo marca fácil y difícil, en mono, `--text-secondary` y nunca rojo. En Lista va "FÁCIL" / "DIFÍCIL" antes de la prioridad (urgentes, por estado y cola). En Semana, el detalle lleva la marca junto al vencimiento y las columnas la letra "F" / "D" con el nombre en `title` y `aria-label`; el `aria-label` de la fila suma ", difícil" / ", fácil". En `.plan-fila-l2` el gap baja de 6 a 4 px para que la letra quepa a 900 px. Laboratorio de Tareas, pestaña Desglose: nueva tarjeta "Puntos completados · 8 semanas" (semanas de lunes a domingo, la última es la actual) con tareas y puntos por semana, desde `db.getPuntosTareasPorSemana`. Cuenta las completadas netas del log (`tareasCompletadasNetas`, la misma regla que la racha: una reabierta o eliminada no cuenta), con el peso de la dificultad actual de cada tarea. Hoy no cambia. |
| F3 — Foco: temporizador | v284 | Nuevo `js/components/foco.js` (en `PRECACHE_URLS`). Entradas: botón "Foco 25 min" en el detalle de una tarea de Lista no hecha (`task-form.js`; con un foco en curso dice "Volver al foco" o "Ver foco en curso" y abre ese) y en el menú ⋯ de las tareas de Lista en Semana, sobre "Mover a". Pantalla `#foco-modal` (`.modal-overlay` + `open`, en `<body>`): nombre de la tarea, cuenta en mono, anillo violeta, "Pausar/Seguir" y "Terminar" (corta sin registrar), con wake lock mientras corre (se suelta al pausar o cerrar). Deja libre la barra inferior y el riel; abierta sobre el detalle, que ya los tapa, lo cubre entero. Atrás o Escape la vuelven a abrir y preguntan "¿Cancelar el foco?" ("Seguir con el foco" / "Cancelar foco"). Al llegar a 0: `db.registrarFoco` → `foco_completado` { tareaId, minutos: 25, fecha } con `entidadId` = la tarea y `ts` = la hora real de término; luego sonido y vibración y una pausa de 5 min con "Saltar pausa" y "Otro foco". Al terminar la pausa, vuelve al detalle de la tarea (el que quedó debajo o, desde Semana u Hoy, `abrirDetallePorId`). Estado en localStorage `vg_foco` { tareaId, titulo, fase, terminaEn, pausadoRestante }, con try/catch y respaldo en memoria. `initFoco` (app.js): un foco vencido con la app cerrada se registra con su hora de término y avisa "Terminaste un foco de 25 min en <tarea>". Lo mismo si termina con la pantalla cerrada en otra vista (navegar la cierra y el foco sigue); en esos casos no hay pausa. Hoy: línea "FOCO en <tarea> · 12:40" ("· en pausa" si está pausado) que abre la pantalla. Un solo foco a la vez. `foco_completado` es solo auditoría: un caso vacío en `applyRemoteEvent`, sin store espejo y fuera de la racha. La bitácora ya lo nombra "Foco · 25 min". |
| F3b — Foco: "Terminar" pregunta | v285 | Decisión del usuario sobre la tanda 1: "Terminar" antes de llegar a 0 ya no corta de una; pregunta "¿Terminar sin registrar este foco?" con "Terminar" / "Seguir" (el foco del teclado queda en "Seguir"). Atrás y Escape hacen la misma pregunta (antes: "¿Cancelar el foco?"). La cuenta sigue corriendo mientras pregunta; si llega a 0, se registra y pasa a la pausa. Durante la pausa, "Saltar pausa" no pregunta. |
| F4 — Foco: registro y métricas | v286 | Bitácora de la tarea: "Foco · N min" con los minutos del evento. Detalle: línea "N focos · X min" en violeta bajo los chips de estado, solo si tiene alguno (también en una tarea hecha). Sale de la misma lectura del log que la bitácora (`refreshBitacoraSection`). Al cerrarse la pantalla de foco (fin de la pausa, "Saltar pausa", "Terminar" o Atrás), `foco.js` emite `vg-foco-cerrado` y, si el detalle de esa tarea quedó abierto debajo, se ponen al día la bitácora y la línea sin reabrirlo. Laboratorio de Tareas, Desglose: tarjeta "Minutos de foco · 8 semanas" (`db.getFocoPorSemana`, semanas de lunes a domingo según `payload.fecha`) con "Esta semana: N focos · X min" y "Más foco este mes: <tarea> · X min (N focos)" (`db.getTareaConMasFocoMes`; empate: el foco más reciente). Una tarea eliminada sigue contando: su nombre sale de su último evento con título y va "(eliminada)". Las letras "F" / "D" de las columnas de Semana ya llevaban `title` y `aria-label` "Fácil" / "Difícil" (desde F2); ahora la QA lo verifica. |
| F5 — QA final y docs | — | Sin cambios de código (la caché queda en v286). `docs/PLAN.md`: Dificultad y Pomodoro pasan de Pendiente a Hecho. Tabla de estado del plan al día. |
| Arreglo A — Chaflanes en el Laboratorio | v287 | Las tarjetas del Laboratorio (`.card` dentro del nuevo contenedor `.lab-mk3` de `laboratorio.js`) van con el chaflán MK III de dos esquinas opuestas y sin radio. Regla en `css/layout.css` que pisa el `--radius-lg` del `.card` global, y 18 radios inline sacados de `lab-entreno`, `lab-finanzas`, `lab-habitos` y `lab-tareas` (incluidas las tarjetas nuevas de puntos y de foco). Las metas de `goal-card.js` también quedan con chaflán dentro del Laboratorio, sin tocar ese archivo, que se usa fuera. Círculos y anillos (50 %) sin cambios. La vista Semana del Laboratorio ya era recta. |
| Arreglo B — El foco en curso no va en el respaldo | v288 | `backup.js`: `CLAVES_SOLO_DISPOSITIVO` (`vg_foco`) no se exporta, y al importar se ignora si un respaldo viejo la trae (formato nuevo y formato anterior a IndexedDB). Así un respaldo restaurado en otro navegador o más tarde no registra un foco que nadie hizo ahí. Los `foco_completado` ya registrados viajan en el log de eventos como siempre. |

### F1 — QA

- 375×812 y 1280×800: tarea nueva con "Media" sugerida y nada elegido; elegir "Difícil" y guardar deja `dificultad: 'dificil'` en la tarea y en el payload de `tarea_creada`; al abrirla aparece "Difícil"; editarla a "Fácil" lo guarda (payload de `tarea_actualizada`) y releída aparece "Fácil". Una tarea vieja sin el campo ("Terminar curso online de Python (módulo 3)") abre con "Media" sugerida y guardarla sin tocar no escribe `dificultad` (ni en la tarea ni en el evento). La captura rápida crea la tarea sin el campo. Segundo contexto: aplicar esos eventos con `applyRemoteEvent` deja "facil" en la tarea y la rápida sin campo. Regresión: Lista y el "+" del encabezado. Consola limpia; ESLint `no-undef` limpio. Captura `dif-form-*`.

### F2 — QA

- 375×812, 900×800 y 1280×800, con dificultades sembradas con `db.saveTask` (dos tareas del sáb 26 difícil/fácil, una del mié 23 difícil y dos hechas): Lista muestra "DIFÍCIL" y "FÁCIL" en `--text-secondary`, y las tareas sin campo no llevan marca. A 375, el detalle del sáb 26 muestra las dos marcas y el `aria-label` dice ", difícil". A 900 y 1280, las columnas llevan "D" / "F" con `title`, y las filas siguen en 2 líneas sin desbordarse y con el ⋯ alineado. En el Laboratorio, las 8 semanas cuadran con un cálculo aparte desde el log (p. ej. 31 ago: "2 · 3 pts", fácil + media). Regresión: Lista, Semana detalle y columnas (900, 1024, 1280). Consola limpia; ESLint `no-undef` limpio. Capturas `dif-lista-*`, `dif-semana-*`, `dif-lab-*`.

### F3 — QA

- 375×812 y 1280×800 (`qa-foco`, reloj simulado; wake lock y vibración simulados para contarlos):
  - En el detalle, una tarea hecha no tiene el botón y una por hacer muestra "Foco 25 min". La pantalla sale con el título y "25:00", cubre el detalle entero y pide el wake lock; localStorage queda con { tareaId, fase: foco, terminaEn, pausadoRestante: null }.
  - Pausar: la cuenta se queda en 23:00 aunque pasen 3 min, dice "En pausa" y suelta el wake lock. Seguir: vuelve a bajar.
  - Llegar a 0 registra un `foco_completado` con la tarea, `minutos: 25`, `fecha: 2026-09-24` y `ts` igual a la hora de término; vibra y pasa a "PAUSA · 5 MIN" con "Saltar pausa" y "Otro foco". Al terminar la pausa se cierra y queda el detalle de la tarea, sin estado guardado.
  - "Terminar" a los 3 min cierra sin registrar.
  - Atrás y Escape preguntan; "Seguir con el foco" continúa y "Cancelar foco" cierra sin registrar. Un Atrás más cierra el detalle y queda en Tareas, sin entradas de historial fantasma.
  - Semana: el ⋯ de una tarea de Lista ofrece "Foco 25 min" y abre el foco de esa tarea (a 1280, en columnas).
  - Recargar a mitad (15:00) mantiene el foco. Hoy muestra "FOCO en <tarea> 14:51", la línea corre y abre la pantalla con el tiempo que queda; desde ahí la barra inferior y el riel quedan libres y tocables. Al pausar, la línea dice "· en pausa".
  - Navegar a Hábitos cierra la pantalla y el foco sigue; al llegar a 0 registra con su hora de término y avisa, sin pausa.
  - Con la app cerrada (about:blank, +40 min) y vuelta a abrir: aviso "Terminaste un foco de 25 min en <tarea>" y registro con la hora de término real; sin línea en Hoy.
  - La racha global y la de Tareas no cambian (84 y 1).
- Segundo contexto (`qa-foco-sync`): `applyRemoteEvent` de un `foco_completado` no falla ni toca el store de tareas.
- Regresión: Semana (`qa-sem7` 375 y 1280, `qa-sem3`, `qa-filas2` 900), formulario (`qa-dif1`), Lista, `qa-dif2` 1280, sin localStorage, navegación y racha. Consola limpia; ESLint `no-undef` limpio. Capturas `foco-*`.

### F3b — QA

- 375×812 y 1280×800 (`qa-foco`): "Terminar" a los 3 min pregunta "¿Terminar sin registrar este foco?" con los botones "Terminar" / "Seguir" y el foco en "Seguir". "Seguir" vuelve a la cuenta, que siguió bajando mientras preguntaba, y "Terminar" cierra sin registrar con el detalle abierto debajo. Atrás y Escape hacen la misma pregunta. "Saltar pausa" cierra sin preguntar y deja el detalle. El resto de `qa-foco` sigue pasando. Consola limpia; ESLint `no-undef` limpio. Captura `foco-terminar-*`.

### F4 — QA

- 375×812 y 1280×800 (`qa-foco4`). Una tarea nueva creada por el formulario recibe 3 focos sembrados en septiembre y otra tarea uno en agosto.
  - Detalle sin focos: sin línea ni entradas de foco.
  - Con el detalle abierto debajo, un foco que llega a 0 y termina su pausa deja "1 foco · 25 min" y "Foco · 25 min" en la bitácora sin reabrirlo. Otro foco con "Saltar pausa" deja "2 focos · 50 min" y dos entradas. "Terminar" sin registrar no cambia nada.
  - Reabierto, sigue igual. Otra tarea sin focos no muestra la línea, y la tarea sembrada muestra "3 focos · 75 min".
  - Esa tarea se eliminó por la UI. En el Laboratorio, las 8 semanas de minutos cuadran con los eventos del log (17 ago 25, 31 ago 25, 7 sept 50, 21 sept 50), "Esta semana: 2 focos · 50 min" y "Más foco este mes: Informe con foco para borrar (eliminada) · 75 min (3 focos)". La tarjeta de puntos sigue con sus 8 semanas.
  - A 1280, las columnas muestran "F" / "D" con `title` y `aria-label` "Fácil" / "Difícil".
- Regresión: `qa-foco` (375 y 1280), `qa-dif2` 375 y `qa-dif1` 1280. Consola limpia; ESLint `no-undef` limpio. Capturas `foco4-*`.

### F5 — QA

- Recorrido completo (`qa-df5`), a 375×812 y a 1280×800:
  - Se crea por el formulario "Preparar presentación del trimestre", difícil y para hoy; Lista la marca "DIFÍCIL".
  - Un foco desde el detalle llega a 0 y pasa a la pausa; "Saltar pausa" deja "1 foco · 25 min" y la bitácora con "Foco · 25 min".
  - Se marca Hecho desde el detalle y el botón de foco se oculta. En Lista (Hecho) sigue "DIFÍCIL". En Semana sale hecha el 24 con "DIFÍCIL" (375) o "D" (1280) y sin foco en su ⋯. Hoy no tiene línea de foco ni marcas.
  - En el Laboratorio, esta semana suma +1 tarea y +3 puntos, y +25 min de foco, y la tarea queda como la de más foco del mes.
- Respaldo: "Exportar respaldo" de Configuración trae la dificultad y el `foco_completado`. Importado por Configuración en un contexto limpio, conserva ambos, Lista muestra "DIFÍCIL", el detalle "1 foco · 25 min" y el Laboratorio da lo mismo que antes de exportar.
- Consola limpia en ambos contextos; ESLint `no-undef` limpio.

### Arreglo A — QA

- 375×812 y 1280×800 (`qa-lab-chaflan`): las 5 secciones del Laboratorio y cada una de sus pestañas, 49 tarjetas en total. Todas tienen radio 0 y `clip-path`, y ningún texto, gráfico ni control cae dentro de las esquinas cortadas. Sin scroll horizontal. Regresión `qa-dif2` 1280. Consola limpia; ESLint `no-undef` limpio. Capturas `chaflan-*`.

### Arreglo B — QA

- 375×812 y 1280×800 (`qa-respaldo-foco`): un foco completo y otro corriendo; se exporta por Configuración con el foco aún en curso. El JSON no trae `vg_foco` y sí el `foco_completado`. Se importa en un navegador limpio una hora después, con el foco ya vencido: no se registra ningún foco nuevo, el anterior sigue, no hay aviso ni línea en Hoy y no queda `vg_foco`. Se repitió con el mismo respaldo con `vg_foco` agregado a mano (como un respaldo viejo): se ignora igual. Regresión `qa-df5` (respaldo con dificultad y focos). Consola limpia; ESLint `no-undef` limpio.

## 5 oct 2026 — Pesos que se llenan solos en la sesión

| Paso | Caché | Qué cambia |
|---|---|---|
| 1. Llenado desde ANTERIOR | v280 | Al abrir una sesión nueva (no al retomar un borrador: sus valores mandan), cada serie normal sin marcar y vacía (peso "" o 0) toma el peso de su serie equivalente en ANTERIOR, con la misma alineación por tipo de la Fase 7 (la serie de trabajo N con la de trabajo N); si ANTERIOR no tiene esa serie, la última serie normal de ANTERIOR. Las reps no se tocan. No aplica a calentamientos, fallo ni dropset, ni a ejercicios de peso corporal (`data-peso-corporal="true"`). Las filas llenadas así llevan `data-peso-auto="true"`, que se quita en cuanto el usuario cambia ese peso (con el input o con el editor −/+, que escribe en él; la calculadora de discos solo muestra). El borrador se guarda con la función de siempre justo después. El llenado no cuenta para el HUD: el volumen y los récords siguen contando solo al marcar. Al agregar un ejercicio en vivo la sesión se vuelve a pintar como un retomar: no se rellena nada. |
| 2. Copia desde la serie 1 | v281 | Al cambiar el peso de la primera serie normal de un ejercicio (con el input o con el editor −/+), ese peso se copia a las series normales siguientes que estén sin marcar y vacías o llenadas solas (`data-peso-auto="true"`, que quedan marcadas así); las que el usuario ya editó y las marcadas no cambian. No aplica a calentamientos, fallo, dropset ni peso corporal. Con la serie 1 vacía o en 0 (a mitad de escribir) no se copia nada. Se guarda el borrador después, con la función de siempre. |

### Paso 1 — QA

- 375×812 y 1280×800, "Pull" con un ANTERIOR de prueba (registrado por `db.registrarSesion`: Remo con Barra 70×5 ×3; Curl Concentrado 14×10 y 16×8): al abrir, Remo con Barra muestra 70 en las 3 series y Curl 14, 16, 16 (la tercera toma la segunda de ANTERIOR), todas con la marca de llenado; las reps siguen las de la rutina (8, 8, 8); Remo Invertido (peso corporal, con ANTERIOR 47,5 en los datos demo) queda en 0; el borrador se guarda con los pesos llenados; el volumen del HUD sigue en 0 y cuenta recién al marcar una serie (560). Agregar el calentamiento a Remo con Barra deja los calentamientos sin marca de llenado y las normales en 70. Cambiar a mano dos pesos de Curl (0 y 18), recargar y Retomar: el borrador conserva lo escrito y la serie en 0 no se rellena. Regresión: borrador, fase 5 del HUD, F2, F3 y la QA final de la Fase 7 a 375. Consola limpia; ESLint `no-undef` limpio. Captura `pesos-auto-375`.

### Paso 2 — QA

- 375×812 y 1280×800 (la misma QA del paso 1, más): un ejercicio nuevo agregado en vivo (Peso Muerto Rumano, sin ANTERIOR) con 3 series vacías: escribir 60 en la serie 1 pone 60 en las series 2 y 3; en Pull-Over en Polea Alta (llenado solo con 22,5 desde ANTERIOR) escribir 60 en la serie 1 también reemplaza las llenadas; con 65 escrito a mano en la serie 2, subir la serie 1 a 62,5 con el editor deja la 2 en 65 y pasa la 3 a 62,5; con la serie 3 ya marcada, cambiar la serie 1 a 70 no la cambia; en Curl Concentrado (14, 16, 16 llenados desde ANTERIOR) escribir 20 en la serie 1 deja 20, 20, 20; en Remo con Barra con calentamiento, cambiar la segunda normal no toca los calentamientos ni las demás filas. Al recargar y Retomar, el borrador conserva lo escrito y no se rellena nada. Regresión: borrador, fases 5 y 8 del HUD, F2, F3 y la QA final de la Fase 7 a 375. Consola limpia; ESLint `no-undef` limpio. Captura `pesos-copia-375`.

## 5 oct 2026 — Ajustes tras revisar la Fase 7

| Ajuste | Caché | Qué cambia |
|---|---|---|
| 1. Calentamiento en barra: pasos de al menos 10 kg | v276 | `escaleraCalentamiento` (barra) descarta un paso que quede a menos de 10 kg del anterior; la barra vacía cuenta como paso. 60 kg: 20×10, 35×3, 47,5×2 (sin el 22,5×5); 40 kg: solo 20×10 (sin el 27,5×5); 70 kg: 20×10, 40×3, 55×2. Mancuernas y máquina no cambian. |
| 2. Contador de series sin calentamientos | v277 | El contador del HUD ("1/21"), su línea compacta, la barra segmentada (una marca por serie de trabajo) y el progreso de cada pestaña del riel ("1/3") cuentan solo las series de trabajo, igual que el resumen. El ✓ de la pestaña y el paso automático al siguiente ejercicio siguen esperando también a los calentamientos. |
| 3. Sin 1RM en el editor para el calentamiento | v278 | Cuando la serie elegida en el editor es de calentamiento, el título dice "Serie 1 · Calentamiento" sin el "1RM ~…"; en una serie de trabajo el 1RM estimado sigue igual. |
| 4. Franja de Semana: sin barra en días vacíos | v279 | En la franja de 7 días, la barra de progreso (3 px, `--vi` sobre `--vid`) aparece solo en los días con ítems: un día con ítems y 0 hechos muestra la barra vacía y un día sin ítems no lleva barra, así se distinguen. La altura de las celdas no cambia. |

### Ajuste 1 — QA

- Tabla de casos de F1 en la consola de la app, a 375×812 y 1280×800, con los resultados nuevos: barra 20 → 20×10; 40 → 20×10; 50 → 20×10, 30×3, 40×2; 60 → 20×10, 35×3 (5 + 2,5 por lado), 47,5×2; 70 → 20×10, 40×3, 55×2; 100 → 20×10, 40×5, 60×3, 80×2; 142,5 → 20×10, 55×5, 85×3, 112,5×2; mancuernas 12 → 6×8, 9×4; 30 → 15×8, 22×4; máquina 45 → 22,5×8, 32,5×4; 0, vacío, inválido, `ninguno`, `banda`, `barra-dominadas` y barra con 15 kg → `[]`. 18/18. En la sesión (QA de F2 actualizada): Remo con Barra con 60 kg inserta 3 calentamientos (20, 35, 47,5) con sus discos y "Calentamiento: 3 series". Consola limpia; ESLint `no-undef` limpio.

### Ajuste 2 — QA

- 375×812 y 1280×800, "Pull", Remo con Barra 100 kg: insertar 4 calentamientos no cambia el contador (0/21, 21 marcas, pestaña 0/3); con los 4 calentamientos y 1 normal marcados, el HUD dice "1/21" (antes "5/25"), la barra 21 marcas con 1 hecha, la línea compacta "1/21" y la pestaña "1/3". Con un calentamiento sin marcar y las 3 normales marcadas, la pestaña dice 3/3 sin ✓ y no pasa al siguiente ejercicio; al marcar ese calentamiento aparece el ✓ y pasa al siguiente al instante, sin descanso. Regresión: QA del HUD fases 3 y 4 y F3 de la Fase 7 (que ahora espera "0/21" con solo calentamientos marcados) a 375. Consola limpia; ESLint `no-undef` limpio. Captura `ajuste-contador-375`.

### Ajuste 3 — QA

- 375×812 y 1280×800, Remo con Barra: con la normal 100×8 elegida el editor dice "Serie 1 · 1RM ~127 kg"; tras agregar el calentamiento, la fila 20×10 elegida dice "Serie 1 · Calentamiento" sin 1RM, y ninguno de los 4 calentamientos lo muestra; al volver a la normal, "Serie 5 · 1RM ~127 kg". Regresión: QA del HUD fase 5 (tabla, editor y botón principal) a 375, con su chequeo del menú ⋯ puesto al día con los ítems de la Fase 7 ("Descanso · …" y "Agregar calentamiento"). Consola limpia; ESLint `no-undef` limpio.

### Ajuste 4 — QA

- 375×812 y 1280×800, semana del 21 al 27 sept (reloj en el jue 24): lun 21 y mar 22 con la barra llena; mié 23 a sáb 26 (con ítems, 0 hechos) con la barra vacía visible (`--vid`, 3 px, 0 %); dom 27 (sin ítems) sin barra; todas las celdas de 64 px. Al agregar un ítem al dom 27 aparece su barra vacía y al marcarlo se llena. Regresión: QA de F2 de Semana (actualizada para no leer una barra que ya no existe en los días vacíos) a 375 y de F7 (columnas) a 1280. Consola limpia; ESLint `no-undef` limpio. Captura `ajuste-franja-*`.

## 5 oct 2026 — Arreglos vistos en la Fase 7

| Arreglo | Caché | Qué cambia |
|---|---|---|
| Hoja "¿Salir?" sin espera fija | v274 | `preguntarOpciones` (la hoja "¿Salir?" de la sesión) ya no espera 500 ms fijos al cerrarse con un botón: espera el `popstate` real con `esperarSalidaDeModal` (`js/core/history.js`), el mismo criterio de la limpieza anterior. Ya no queda ninguna espera fija de 500 ms en el código. |
| Números del Laboratorio en es-CL | v275 | Todo número del Laboratorio pasa por `formatNumero` (`utils/numero.js`, es-CL con punto de miles). Lab › Entreno: las tarjetas del resumen (entrenamientos, series, repeticiones y el volumen, que usaba `toLocaleString('es-ES')` y salía "1256"), el tooltip de la dona, el tooltip y las etiquetas de valor del gráfico por ejercicio (antes "57.5"), y los récords ("47,5kg × 8"). Lab › Semana: su `Intl.NumberFormat` propio y los `toFixed(1).replace('.', ',')` de la energía (en el texto y en el aria-label) pasan a `formatNumero` (la energía entera sale "7" en vez de "7,0"). Revisados con grep `lab-*.js`, `components/laboratorio.js` y `views/laboratorio.js`: no queda `toLocaleString`, `es-ES`, `Intl.NumberFormat` ni `toFixed`. |

### Hoja "¿Salir?" — QA

- 375×812 y 1280×800 con la CPU frenada ×4, de a una: "Cancelar" cierra la hoja y queda en la sesión sin entrada de modal colgando; Atrás con la hoja abierta la cierra y queda en la sesión; "Salir" vuelve a la lista de rutinas con el borrador, y Atrás desde ahí va a la principal con la tarjeta "sesión en curso" sin reabrir la hoja; Retomar y "Descartar sesión" borran el borrador y vuelven a la principal sin la tarjeta, y Atrás después no vuelve a la sesión ni a la hoja. Regresión: pantalla completa (fase 2 del HUD), QA final del HUD y esperas sin tiempo fijo a 375. Consola limpia; ESLint `no-undef` limpio.


### Números del Laboratorio — QA

- La misma sesión de la QA final de la Fase 7 (calentamientos en barra, mancuernas y máquina; 3 series normales), a 375×812 y 1280×800: el volumen se ve "1.256" en el HUD, en el resumen ("1.256 kg") y en Laboratorio › Entreno ("1.256", antes "1256"), y "volumen 1.256" en Laboratorio › Semana (semana en curso). Récords con coma decimal ("22,5kg × 11"), sin ningún "x.5kg". Regresión: la QA de ejercicio libre (que abre Récords) a 375. Consola limpia; ESLint `no-undef` limpio. Captura `arreglo-lab-numeros-*`.

## 6 oct 2026 — Fase 7: calentamiento y descanso por ejercicio (`docs/FASE7-CALENTAMIENTO-DESCANSO.md`)

**`CACHE_NAME` final: `vanguard-os-v273`.** Plan por fases; el plan y su tabla de estado están en
`docs/FASE7-CALENTAMIENTO-DESCANSO.md`. QA con Playwright de a una, a 375×812
y 1280×800, zona `America/Santiago`, reloj simulado, contextos limpios sin
Supabase.

| Fase | Caché | Qué cambia |
|---|---|---|
| F1 — Escalera de calentamiento | v269 | Sin cambios de interfaz. `js/utils/calentamiento.js` (nuevo, en `PRECACHE_URLS`): `escaleraCalentamiento({ pesoTrabajo, equipo, pesoBarra = 20 })` → `[{ peso, reps, discosPorLado? }]`. Barra: barra vacía ×10, 40 % ×5, 60 % ×3, 80 % ×2 redondeado hacia abajo a 2,5 kg, sin pasos ≤ barra (salvo la barra vacía), repetidos ni ≥ al peso de trabajo; con ≤ 40 kg, barra vacía ×10 y 70 % ×5 si supera la barra; `discosPorLado` con `calcularDiscos`. Mancuernas: 50 % ×8 y 75 % ×4 a 1 kg (por mancuerna). Máquina: igual a 2,5 kg. Peso vacío, 0 o inválido, o equipo fuera del alcance (`ninguno`, `banda`, `barra-dominadas`…) → `[]`. Además (no lo decía el plan): con barra y un peso de trabajo menor que la barra → `[]`. Acepta el peso como número o texto con coma ("142,5"). |
| F2 — Calentamiento en la sesión | v270 | En el ⋯ de cada ejercicio con equipo `barra`, `mancuernas` o `maquina` (el bloque lleva `data-equipo` del catálogo), "Agregar calentamiento": toma el peso de la primera serie normal en pantalla o, si está vacía, la primera normal de ANTERIOR; sin ninguno, toast "Escribe primero el peso de tu primera serie". Inserta al inicio las filas de tipo `calentamiento` de `escaleraCalentamiento`, con peso y reps llenos y sin marcar, renumera las filas y deja como la que toca la primera sin marcar. Con calentamientos, la opción dice "Rehacer calentamiento": quita los no marcados, deja los marcados y agrega después de ellos los pasos de la escalera que todavía no se hicieron (no repite el paso ya marcado). En barra, bajo cada fila de calentamiento, una línea chica "por lado: 10 + 2,5 + 1,25" ("solo la barra" si no lleva discos); se recalcula en cada guardado, así sigue al editor −/+, a un cambio de tipo y vuelve al retomar el borrador. Si la escalera queda vacía, toast "Con ese peso no hace falta calentar". El borrador, Finalizar y el editor ya leen el tipo de cada fila: no cambiaron. En F2 el calentamiento todavía cuenta en volumen y récords, y marcarlo inicia el descanso (eso es F3). |
| F3 — Calentamiento fuera de los cálculos | v271 | Nuevo `js/utils/tipo-serie.js` (en `PRECACHE_URLS`): `esCalentamiento(serie)` y `seriesDeTrabajo(series)`; una serie sin `tipo` es normal. Fuera de los cálculos: en la sesión, el volumen del HUD y la comparación con la sesión previa (`volumenDeSeries`), el récord en vivo (`esRecord`: un calentamiento nunca es récord, ni fila ámbar ni chip), el mapa de fatiga en vivo, el resumen al finalizar (series hechas/total, volumen, RPE promedio, récords y la tabla por ejercicio) y la sugerencia "Sube a…" (no pisa las filas de calentamiento); en `db.js`, los récords, el historial por ejercicio (gráficos, 1RM, Progreso; una sesión con solo calentamiento de un ejercicio no suma un punto), el resumen del período, el volumen y el balance por grupo, la tendencia semanal y el volumen por día del Laboratorio, el aviso de sobrecarga, `sugerirProgresion`, el resumen "Tu semana" y la fatiga base del mapa. `progresiones.js` y `sugerencias-nivel.js` ya contaban solo series normales. `getUltimoRegistro` sigue devolviendo todas las series: ANTERIOR va por tipo (el calentamiento N con el calentamiento N de la última vez y la serie de trabajo N con la de trabajo N; fallo y dropset cuentan como trabajo) y se recalcula en cada guardado, así insertar calentamientos no corre la columna. Marcar un calentamiento no inicia el descanso; sí cuenta como serie hecha en el HUD y para el paso al siguiente ejercicio (si era la última pendiente, pasa al instante). En una superserie, un calentamiento se completa sin pasar al otro ejercicio. |
| F4 — Descanso por ejercicio (datos) | v272 | Sin cambios de interfaz. `settings.descansoPorEjercicio: { [clave]: segundos }` con `db.claveDescansoEjercicio({ ejercicioId, nombre })` (el id del catálogo —el guardado o el que sale del nombre, como `matchEjercicio`— o `'nombre:' + nombre` en minúscula y sin espacios de más para un ejercicio libre), `db.getDescansoEjercicio(clave)` (segundos o `null`), `db.getDescansosPorEjercicio()` (copia del mapa) y `db.setDescansoEjercicio(clave, segundos | null)`: redondea y acota a 15–600 s, `null` borra el override, y emite `configuracion_actualizada` (módulo entreno) con `{ descansoPorEjercicio: <mapa completo> }`. El general (`restTimerSecs`) no cambia y cambiarlo no toca los overrides. Revisado sin cambios: el replay de `sync.js` (`mergeSingleton` sobre `settings`, en orden de `ts` como `pullRemoteEvents`) y el respaldo/restauración (el store `singletons` va entero). |
| F5 — Descanso por ejercicio (UI) | v273 | La sesión carga los overrides al abrir (`getDescansosPorEjercicio`) y cada bloque lleva su clave (`data-descanso-clave`). En el ⋯ de cada ejercicio, "Descanso · 2:30" (o "Descanso · general 1:30"): abre una hoja `.modal-overlay` (misma ubicación que "¿Salir?", sin tapar la barra inferior ni el riel) con el valor en mono, "de este ejercicio" / "el general", −15 / +15 (15–600 s), "Usar el general" (deshabilitado si no hay override) y "Listo"; cada cambio se guarda con `setDescansoEjercicio`; Atrás la cierra (history.js). Con override, la cabecera del ejercicio muestra el chip "⏱ 2:30". Al completar una serie, `iniciarDescanso` usa el descanso del ejercicio y, en una superserie, el mayor de la corrida (cada ejercicio con su override o el general). El ajuste de la barra superior sigue cambiando solo el general (y repinta los textos "general …"). |
| F6 — QA final y docs | — | Solo documentación (no sube la caché: `docs/` no está en `PRECACHE_URLS`). QA de punta a punta y regresión del HUD; `docs/PLAN.md` pasa la Fase 7 a "Hecho". |

### F1 — QA

- Tabla de casos ejecutada en la consola de la app (import del módulo servido), a 375×812 y 1280×800: barra 20 → 20×10; 40 → 20×10, 27,5×5 (2,5 + 1,25 por lado); 60 → 20×10, 22,5×5, 35×3, 47,5×2; 100 → 20×10, 40×5, 60×3, 80×2 (por lado 10 / 20 / 20 + 10); 142,5 (también como "142,5") → 20×10, 55×5, 85×3, 112,5×2; mancuernas 12 → 6×8, 9×4; 30 → 15×8, 22×4; máquina 45 → 22,5×8, 32,5×4; 0, vacío, "abc", `ninguno`, `banda`, `barra-dominadas` y barra con 15 kg → `[]`. 16/16 como se esperaba; consola limpia; ESLint `no-undef` limpio.


### F2 — QA

- 375×812 y 1280×800, rutina "Pull": sin "Agregar calentamiento" en Remo Invertido (`ninguno`) ni en Dominadas (`barra-dominadas`). Remo con Barra con 60 kg en la primera normal: inserta 20×10 ("solo la barra"), 22,5×5 ("por lado: 1,25"), 35×3 ("5 + 2,5") y 47,5×2 ("10 + 2,5 + 1,25") al inicio, sin marcar, filas renumeradas 1…7, toast "Calentamiento: 4 series", y la opción pasa a "Rehacer calentamiento". El + del editor escribe 22,5 en la fila de calentamiento que toca y su línea de discos se actualiza. Marcado el primero y con 100 kg en la primera normal, "Rehacer" deja 20×10 ✓ y agrega 40×5, 60×3, 80×2. Curl Concentrado (mancuernas) 12 kg → 6×8, 9×4 sin línea de discos; Jalón (máquina) 45 kg → 22,5×8, 32,5×4. Remo en Máquina con la primera normal vacía usa ANTERIOR (47,5×11 → 22,5×8, 35×4). Un ejercicio nuevo agregado en vivo (Peso Muerto Rumano, barra), sin peso ni ANTERIOR: toast "Escribe primero el peso de tu primera serie". Recargar a mitad y Retomar conserva los calentamientos con sus discos; Finalizar → Guardar: la sesión guardada trae `tipo: 'calentamiento'` en Remo con Barra. Regresión: QA del HUD fase 5, borrador y fase 9 a 375 sin fallas. Consola limpia; ESLint `no-undef` limpio. Captura `f7-calentamiento-375`, `f7-calentamiento-1280`.

### F3 — QA

- La misma sesión de "Pull" en dos contextos limpios, a 375×812 y 1280×800: Remo con Barra 100 × 8 (récord previo 47,5), una con calentamiento (20×10, 40×5, 60×3, 80×2, todos marcados) y otra sin él. Insertar los calentamientos no corre ANTERIOR de las normales (47,5×9 · 47,5×10 · 47,5×8 en ambas) y los calentamientos quedan con ANTERIOR vacío; marcar los 4 no inicia el descanso; con solo ellos marcados (40, 60 y 80 superan 47,5) el HUD muestra volumen 0, 0 récords y ninguna fila ámbar, pero sí "4/25" series; la serie normal sí inicia el descanso. Después: HUD 800 kg y 1 récord en ambas; resumen idéntico ("1 min | 800 kg ▼ 89 % | 1/21 | —", "★ Remo con Barra · 100 kg (antes 47,5)", "Remo con Barra 1 800 kg ▼ 38 %"); Laboratorio de Entreno idéntico (1 entrenamiento, 1 serie, 8 reps, 800 kg). Sesión siguiente: las normales tienen el mismo ANTERIOR (100×8) en ambas, y al calentar de nuevo el calentamiento N muestra el de la vez anterior (20×10 · 40×5 · 60×3 · 80×2) y la normal sigue con 100×8.
- Regresión: QA del HUD fases 3, 4, 6, 7, 8 y 9, F2 de esta fase e historial (fase 4) a 375; fase 8 y F2 a 1280. Sin fallas. Consola limpia; ESLint `no-undef` limpio. Captura `f7-fuera-calculos-375`, `-1280`.

### F4 — QA

- 375×812 y 1280×800, en la consola de la app: clave de Remo con Barra = su id del catálogo ("remo con barra") y de "  Remo en TRX " = "nombre:remo en trx"; sin override → `null`; guardar 150 y 45 y leerlos; 5 → 15 y 900 → 600; `null` borra; `setRestTimerSecs(120)` no toca los overrides; `settings` queda con `restTimerSecs: 120` y el mapa; cada cambio emite `configuracion_actualizada` con el mapa completo (6 eventos). Segundo contexto limpio: aplicar esos eventos con `applyRemoteEvent` de `sync.js` (en orden de `ts`, como la sync) deja el mismo mapa y el mismo general, sin pisar `allocationRule`. Respaldo: exportarlo con "Exportar respaldo" en Configuración e importarlo en un tercer contexto por la UI conserva los descansos por ejercicio. Consola limpia; ESLint `no-undef` limpio.

### F5 — QA

- 375×812 y 1280×800: Remo con Barra sin override → "Descanso · general 1:30" y sin chip; la hoja abre en 1:30 (el general) con "Usar el general" deshabilitado; +15 ×4 → 2:30 (de este ejercicio); Atrás con la hoja abierta la cierra y queda en la sesión, sin entrada de modal colgando; chip "⏱ 2:30", ítem "Descanso · 2:30" y 150 s en `settings`. Completar una serie de Remo con Barra → descanso de 2:30; de Curl Concentrado (sin override) → 1:30. Subir el general a 1:45 en la barra superior cambia los "general" y no el override. "Usar el general" vuelve a 1:45 y "Listo" cierra sin chip ni override guardado. Superserie ("QA Superserie"): Press de Banca 1:00 y Curl de Bíceps 2:00 → A1 → A2 sin descanso y después 2:00 (el mayor); con Press a 3:00 → 3:00. Regresión: QA del HUD fases 6 y 9, borrador, F2 y F3 a 375 y fase 6 a 1280 sin fallas. Consola limpia; ESLint `no-undef` limpio. Capturas `f7-descanso-hoja-375`, `-1280`.

### F6 — QA final

- De punta a punta a 375×812 y 1280×800, rutina "Pull": Remo con Barra 100 kg con calentamiento (20, 40, 60, 80) y descanso 2:30; Curl Concentrado 12 kg con calentamiento (6, 9) sin override; Jalón 45 kg con calentamiento (22,5, 32,5) y descanso 1:00. Los 8 calentamientos se marcan sin iniciar el descanso; cada serie normal descansa lo de su ejercicio (2:30, 1:30 el general, 1:00). HUD: 1.256 kg = solo las normales. Resumen: "1.256 kg", "3/21" series y 1 serie por ejercicio. La sesión guardada trae los 8 calentamientos con su tipo. Laboratorio de Entreno: 3 series y 1256 kg.
- Regresión del HUD: descanso y pantalla encendida (fase 6), récord en vivo (fase 7), borrador y QA final del HUD (fase 9) a 1280; récord en vivo, F4 y F5 de este plan a 375 (el resto de la regresión a 375 corrió en F3 y F5). Sin fallas. Consola limpia; ESLint `no-undef` limpio. Capturas `f7-e2e-*`, `f7-e2e-resumen-*`.
- Visto de paso, fuera de alcance: el Laboratorio formatea el volumen con `toLocaleString('es-ES')` ("1256", sin punto de miles) en vez de `utils/numero.js`, y la hoja "¿Salir?" de la sesión (`preguntarOpciones`) todavía espera 500 ms fijos al cerrarse.

## 4 oct 2026 — Semana "Tablero de día" (`docs/REDISENO-SEMANA.md`)

**`CACHE_NAME` final: `vanguard-os-v268`.** Rediseño de Tareas › Semana por fases; el plan y su tabla de estado están en
`docs/REDISENO-SEMANA.md`. QA con Playwright de a una, zona
`America/Santiago`, reloj simulado, contextos limpios sin Supabase y el
respaldo demo COMPLETO importado por la UI.

### Cierre del rediseño de Semana

Plan completo. Semana pasó de 7 tarjetas con input a un tablero de día que
lee los dos stores (`planificador` y `tareas` con fecha) sin migrar datos:

| Paso | Commit | Caché | En una línea |
|---|---|---|---|
| F1 — Datos de la semana | 03dce16 | v259 | `armarSemana` / `componerSemana`: 7 días con ítems del planificador y tareas de Lista con fecha, ordenados. |
| F2 — Encabezado y franja | f12ab42 | v260 | Rango + hechas/total, flechas ‹ › y franja de 7 días (HOY, barra de progreso, cuadrado rojo en días pasados con pendientes). |
| F3 — Detalle del día | bd2605a | v261 | Detalle del día elegido con los dos orígenes; `renderPriorityBars` pasa a `js/utils/prioridad.js`. |
| F4 — Input único + pendientes | 9ed075e | v262 | Form único con chip del día; tira "pendientes de días pasados" = atrasadas de Hoy (`js/utils/atrasadas.js`), con "Pasar a hoy". |
| F5 — Mover + color | 45df35f | v263 | Mantener presionado → modo mover; menú ⋯ "Mover a"; Semana sin el verde de `--accent-plan`. |
| F6 — Lista y Hábitos | c47db6c | v264 | Lista sin dona, buscador en el encabezado y captura en flujo; Hábitos con una sola racha y "Análisis" plegado. |
| Ajuste — "+" en el encabezado | 3e17022 | v265 | Lista y Hábitos sin FAB: el "+" va en el encabezado. |
| F7 — PC/tablet y QA | 0da0527 | v266 | Desde 900 px, 7 columnas con scroll propio; QA de punta a punta. |
| Ajuste final — filas en columnas | a4caba3 | v267 | Filas de columnas en dos líneas (texto de hasta 2 líneas; prioridad y acciones alineadas). |
| Ajuste 2 — sin etiqueta en columnas | a4f4887 | v268 | Columnas sin etiqueta de vencimiento; tarea de Lista vencida con el check en `--rd`. |

`CACHE_NAME` final del plan: `vanguard-os-v268`. Este cierre solo toca
documentación (`docs/` no está en `PRECACHE_URLS`), así que no sube la caché.

### Detalle por fase

| Fase | Caché | Qué cambia |
|---|---|---|
| F1 — Datos de la semana | v259 | Sin cambios de interfaz. `componerSemana(lunesIso, { plan, tareas, hoyIso })` (pura) y `armarSemana(lunes)` (lee los stores `planificador` y `tareas`, sin migrar nada) en `views/planificador.js`: 7 días `{ iso, items, hechas, total, pendientesPasado }`. Los ítems mezclan el planificador (`origen: 'plan'`) y las tareas de Lista con `dueDate` ese día (`origen: 'tarea'`, con `priority` y `status`). Orden: pendientes primero (Lista por prioridad alta → baja, después planificador por creación) y hechas al final. `pendientesPasado` cuenta lo sin hacer de los días anteriores a hoy; `semana.vencidasAntes` lista las tareas de Lista sin hacer vencidas antes del lunes (criterio de las "atrasadas" de Hoy). |
| F2 — Encabezado y franja | v260 | Sin el segmentado Anterior/Esta/Siguiente. Encabezado "Semana" con el rango y hechas/total de la semana (planificador + Lista con fecha) en mono, y flechas ‹ › de 44 px. Fuera de la semana actual el rango es un botón "· Volver a hoy". Franja de 7 celdas (L M X J V S D; hoy dice "HOY"): número en mono, barra de 3 px hechas/total (`--vi` sobre `--vid`) y un cuadrado `--rd` de 5 px si el día ya pasó con pendientes. La celda elegida va con fondo `--vis` y borde `--vi`; por defecto, hoy si está en la semana mostrada y, si no, el lunes (`diaSeleccionado` a nivel de módulo, como `offsetSemana`; cambiar de semana lo reinicia). `role="tablist"`/`role="tab"` con `aria-selected`, foco itinerante y ← → Inicio Fin; etiqueta accesible "miércoles 23 de septiembre, 0 de 1 hecha, 1 pendiente" ("sin tareas" si no hay nada; "hoy, …" en hoy). Las 7 tarjetas con su input siguen debajo hasta F3. |
| F3 — Detalle del día | v261 | Las 7 tarjetas con input se reemplazan por el detalle del día elegido: "Jueves 24" + hechas/total y sus ítems (planificador y tareas de Lista con esa fecha, en el orden de F1). Fila: check de 16 px (violeta al marcar, dentro de un botón de 44 px) · texto · en las tareas de Lista, "VENCE HOY"/"VENCIDA" si siguen pendientes y las barras de prioridad; los ítems del planificador conservan la ✕ (con confirmación). Check del planificador → `toggleTareaPlan`; de Lista → `updateTaskStatus(id, 'done')` o de vuelta a `'todo'`. Tocar el texto de una tarea de Lista abre su detalle (`openTaskForm`, el mismo formulario de Lista, que ahora también se pinta en Semana). Día vacío: "Nada para este día". Tocar otro día repinta solo el detalle (sin leer la base) y conserva lo escrito en el input del día, que queda en el detalle hasta F4. `renderPriorityBars` se movió tal cual de `views/tareas.js` a `js/utils/prioridad.js` (nuevo, en `PRECACHE_URLS`): tareas.js ya importa planificador.js y el cargador de módulos (`loadModuleGraph`) no admite imports circulares. |
| F4 — Input único + pendientes de días pasados | v262 | Un solo form al final: "Agregar…" + chip mono con el día elegido ("JUE 24", cambia al tocar otro día sin perder lo escrito) + botón + de 44 px; crea con `crearTareaPlan(diaSeleccionado, texto)`. Tira "N pendientes de días pasados" (borde `--rdb`) entre la franja y el detalle, solo en la semana actual y si N > 0: tocar el texto despliega la lista (texto, "Semana"/"Lista" y hace cuánto); "Pasar a hoy" mueve todo a hoy — planificador con `moverTareaPlan` (`tarea_reprogramada`), Lista con `saveTask({ id, dueDate })` (`tarea_actualizada`, lo mismo que "Mover a hoy" en Hoy) — y deja hoy elegido. Por decisión del usuario, la tira cuenta lo mismo que "atrasadas" en Hoy: todo lo no hecho con fecha < hoy de los dos stores, sin límite al lunes (incluye ítems del planificador de semanas anteriores). El cálculo pasa a `calcularAtrasadas` (`js/utils/atrasadas.js`, nuevo, en `PRECACHE_URLS`), que usan Hoy y Semana; Hoy muestra exactamente lo mismo que antes (mismo filtro y mismo orden). `componerSemana` deja `semana.vencidasAntes` y expone `semana.atrasadas`; `armarSemana` lee todo el planificador. Los cuadrados rojos de la franja siguen siendo por día de la semana mostrada. |
| F5 — Mover entre días + color | v263 | Mantener presionado 500 ms un ítem (sin moverse más de 10 px; mouse o táctil) activa el modo "mover": la franja se resalta (bordes punteados `--vi`), el ítem se marca y un aviso "Toca un día para mover «…»" con Cancelar aparece bajo la franja; tocar un día lo mueve, tocar el mismo día, Cancelar o Escape salen. El click que llega al soltar se descarta en todo el documento (el aviso corre el contenido y el dedo puede quedar sobre otro elemento). Alternativa accesible: menú ⋯ en cada ítem con "Mover a" y los 7 días (el actual deshabilitado; foco al primero, flechas para recorrer, Escape cierra y devuelve el foco). Planificador → `moverTareaPlan` (`tarea_reprogramada`); Lista → `saveTask({ id, dueDate })` (`tarea_actualizada`). Toast "Movida al jueves". Color: Semana ya no usa `--accent-plan` (desde F3 todo va con `--vi`/`--vib`/`--vis`/`--vid`); Hoy tampoco lo usa. El token no se tocó: solo vive en `variables.css` y en el ámbito `.mk3-planificador`, que no se aplica nunca porque `#planificador` redirige a `#tareas/semana`. |
| F6 — Lista y Hábitos | v264 | **Lista:** sin la tarjeta de la dona (los tres contadores del tablero ya lo muestran; se quitaron `renderTasksDonut` y su instancia de Chart.js); el buscador pasa a un ícono de 44 px en el encabezado que despliega el input (foco al abrir; Escape o el ícono lo pliegan, limpian el filtro y devuelven el foco; abierto/cerrado sobrevive a los refresh); la captura rápida va al final del tablero en flujo normal (ya no sticky) y la vista tiene 180 px de relleno inferior, como Hábitos, para que al final del scroll el FAB quede sobre el relleno y no tape el calendario. **Hábitos:** una sola racha visible arriba (el anillo); la tarjeta "días perfectos seguidos" pasa a una línea bajo el anillo, "Mejor racha perfecta: N días" (`renderCabeceraRacha({ lineaSecundaria })`); la dona, "En riesgo hoy" y el gráfico de 8 semanas van en una sección plegada "Análisis" al final (`<details>`, cerrada por defecto; los gráficos se montan al abrirla y queda abierta si se marca un hábito). **Pendiente de decisión:** el FAB sigue siendo sticky (`bottom: 100px`), así que mientras se hace scroll flota sobre lo que pase por debajo; al final del scroll no tapa nada en ninguna de las dos vistas. |
| Ajuste — "+" en el encabezado | v265 | Decisión del usuario sobre el pendiente de F6: Lista y Hábitos ya no tienen FAB. El "+" pasa al encabezado como botón de 44 px (`.cab-accion`, violeta, con foco visible): en Hábitos en lugar del ícono decorativo (aria-label "Nuevo hábito"), en Lista junto a la lupa (aria-label "Nueva tarea"). Mantienen los ids `btn-new-habito` / `btn-new-task`, así abren lo mismo que el FAB (formulario de hábito nuevo / de tarea nueva). Sin FAB, el relleno inferior de las dos vistas vuelve a 110 px. El vacío de "Por hacer" dice "el botón + de arriba". Los FAB de otras vistas no se tocaron. |
| F7 — PC/tablet y QA | v266 | Desde 900 px la franja pasa a 7 columnas: bajo cada celda va una columna con los ítems de ese día (mismo orden, mismas filas, apiladas porque la columna es angosta) y scroll propio (`max-height: calc(100vh - 380px)`); la del día elegido va resaltada (`--vis`/`--vi`) y tocar el fondo de una columna elige ese día para el form único, que se mantiene abajo con su chip. Marcar, abrir el detalle, el menú "Mover a", ✕ y mantener presionado funcionan igual en las columnas. El modo se decide al pintar (`matchMedia('(min-width: 900px)')`) y cruzar ese ancho repinta (con las mismas guardas que el sync: no repinta con un modal abierto ni con un borrador escrito). Bajo 900 px sigue el detalle de un día. |
| Ajuste final — filas en columnas | v267 | Solo el modo columnas (≥ 900 px; el detalle de un día no cambia). Cada fila tiene siempre dos líneas (`filaColumna`, mismas clases que la fila del detalle, así los listeners son los mismos): 1) check + texto, que ocupa a lo sumo 2 líneas con ellipsis (`-webkit-line-clamp: 2`) y lleva el título completo en `title`; 2) alineada con el texto, no con el check: vencimiento y barras de prioridad (`renderPriorityBars`) en las tareas de Lista, y las acciones a la derecha (`margin-left: auto`) en el mismo orden en todas las filas — en el planificador ✕ y después ⋯, así el ⋯ (32×32) queda en la misma posición en todas. Misma altura mínima (64 px) y padding para Lista y planificador. El menú "Mover a" se despliega debajo solo mientras está abierto. **Etiqueta de vencimiento según el ancho de la columna** (container query sobre `.plan-col`): con la sangría alineada al texto, el ⋯ de 32 px y todo en una línea, "VENCE HOY" (63 px) solo cabe en columnas de ≥ 151 px; entre 121 y 150 px se muestra "HOY"/"VENC."; bajo 121 px, un cuadrado rojo de 8 px (el texto sigue para lectores de pantalla y en `title`); bajo 96 px la sangría baja a 20 px (check de 26 px). A 1280 de ventana las columnas miden 125 px ("HOY"/"VENC.") y a 900, 88 px (cuadrado). Columnas con barra de scroll delgada y menos relleno lateral. |
| Ajuste 2 — sin etiqueta de vencimiento en columnas | v268 | Solo el modo columnas (≥ 900 px). Se quita del todo la etiqueta de vencimiento de las tareas de Lista (los tramos por ancho de v267: "VENCE HOY", "HOY"/"VENC.", el cuadrado y la sangría reducida, y la container query): la columna ya dice la fecha. Una tarea de Lista pendiente en un día anterior a hoy lleva el borde del check en `--rd` (`.plan-item--vencida`); hecha vuelve al estilo normal; los ítems del planificador no cambian. La segunda línea queda solo con las barras de prioridad y las acciones a la derecha (en el planificador ✕ y ⋯), igual en todos los anchos de columna, con una sangría única de 20 px (check de 26 px) que entra también en la columna más angosta. El estado sigue para lectores de pantalla y al pasar el puntero: aria-label del texto "…, vence hoy. Abrir el detalle" / "…, vencida el miércoles 23. Abrir el detalle" (también en el del check) y title "… (vencida el miércoles 23)". El detalle de un día (< 900 px) no cambia: sigue con "VENCE HOY"/"VENCIDA". |

### F1 — QA

- Con el respaldo demo y el reloj en el jue 24 sept: en la semana actual, la anterior y la siguiente, los 7 días de `armarSemana` coinciden con los de la vista y, día por día, total, hechas y pendientes de días pasados = ítems del planificador de la vista + tareas de Lista con esa fecha (semana actual: 4 tareas de Lista con fecha; siguiente: 1 vencida antes del lunes). El orden respeta pendientes → Lista por prioridad → planificador → hechas. 375×812; consola limpia; ESLint `no-undef` limpio.

### F2 — QA

- 375×812 y 1280×800, reloj en el jue 24 sept: sin segmentado; "21 sept – 27 sept · 3/8" (3/8 = `armarSemana` de ambos orígenes); flechas de 44×44; franja L M X HOY V S D con 21…27, hoy elegido por defecto, cuadrado rojo solo en el mié 23 (pasado con 1 pendiente), barras 100 % en lun/mar y 0 % en mié; etiquetas "miércoles 23 de septiembre, 0 de 1 hecha, 1 pendiente", "hoy, jueves 24 de septiembre, …", "domingo 27 de septiembre, sin tareas"; celda elegida con `--vis`/`--vi` (estilo computado). Tocar el sáb 26 lo elige y → pasa al dom 27 con el foco. ‹: semana del 14 con el lunes 14 elegido y sin HOY; el rango pasa a "Volver a hoy" y al tocarlo vuelve a esta semana con hoy elegido; ›: lunes 28. Sin scroll horizontal; consola limpia; ESLint `no-undef` limpio. Capturas `sem-f2-375`, `sem-f2-1280`.

### F3 — QA

- 375×812 y 1280×800, reloj en el jue 24 sept: un solo detalle (sin las 7 tarjetas); por defecto "Jueves 24" · 0/1 con "Comprar remedios" (check de 16 px y ✕). Marcarlo: hecha, 1/1, barra del día llena, check violeta (estilo computado) y un evento `tarea_completada`; desmarcarlo, otro evento. Mié 23: "Cambiar filtro de la aspiradora" (Lista) con barras, "VENCIDA" y sin ✕; marcarla deja `status: done`, quita "VENCIDA" y el cuadrado rojo del día; desmarcarla vuelve a `todo`. Tocar su texto abre el detalle de la tarea y Atrás lo cierra sin salir de Semana. Sáb 26: dos tareas futuras sin etiqueta. Dom 27: "Nada para este día"; crear "Comprar pan" lo agrega a ese día; lo escrito se conserva al cambiar de día; `budget-updated` con borrador no repinta, y sin borrador ni foco sí; ✕ → confirmar lo borra. Lista sigue con sus barras de prioridad y las pestañas Lista ↔ Semana funcionan. La QA de F2 sigue pasando (ahora con un solo input). Sin scroll horizontal; consola limpia; ESLint `no-undef` limpio. Capturas `sem-f3-375`, `sem-f3-1280`.

### F4 — QA

- 375×812 y 1280×800, reloj en el jue 24 sept, respaldo demo: atrasadas esperadas (calculadas aparte desde IndexedDB) = 1 tarea de Lista del mié 23 + 1 ítem del planificador del lun 14 (semana anterior). Hoy sigue mostrando "2 atrasadas"; la tira dice "2 pendientes de días pasados", empieza plegada y al tocarla lista "Pagar gastos comunes · Semana · hace 10 días" y "Cambiar filtro de la aspiradora · Lista · ayer"; borde `--rdb` (estilo computado); cuadrado rojo solo en el mié 23. Form único "Agregar…" con chip "JUE 24"; al elegir el dom 27 el chip pasa a "DOM 27" (etiqueta "Agregar al domingo 27") sin perder lo escrito; `budget-updated` con borrador no repinta; + crea "Regar plantas" el 27 y limpia el input. "Pasar a hoy": las 2 quedan en el 24 (1 `tarea_reprogramada`, 1 `tarea_actualizada`), desaparecen la tira y el cuadrado rojo, queda elegido hoy con lo movido, y Hoy deja de mostrar atrasadas. Semana anterior: sin tira. QA de F2 y F3 siguen pasando. Sin scroll horizontal; consola limpia; ESLint `no-undef` limpio. Capturas `sem-f4-375`, `sem-f4-1280`.

### F5 — QA

- 375×812 y 1280×800, reloj en el jue 24 sept: un toque corto no activa el modo mover; mantener presionado el check de "Comprar remedios" lo activa (franja resaltada, ítem marcado, aviso) y soltar no marca el check; Escape, tocar el mismo día y Cancelar salen sin mover; mantener y tocar el sáb 26 lo mueve (fecha 26) con "Movida al sábado" y el jueves queda "Nada para este día". En el sáb 26, el ⋯ de una tarea de Lista abre "Mover a" con LUN 21 … DOM 27 y SÁB 26 deshabilitado; el foco va al lun 21, → pasa al mar 22, Escape cierra y devuelve el foco al ⋯; "VIE 25" la mueve (`dueDate` 25, un `tarea_actualizada`, "Movida al viernes") y la franja muestra "viernes 25 …, 0 de 2 hechas". A 375, con eventos touch reales (CDP): mantener presionado activa el modo mover sin abrir el detalle de la tarea y tocar el dom 27 la mueve. Ningún elemento de Semana con el verde `#4ADE80` (estilos computados). QA de F3 y F4 siguen pasando. Sin scroll horizontal; consola limpia; ESLint `no-undef` limpio. Capturas `sem-f5-mover-375`, `sem-f5-menu-375`.

### F6 — QA

- 375×812 y 1280×800. Lista: sin la dona y con los tres contadores; ícono de búsqueda de 44 px, plegado; al tocarlo aparece el input con el foco; filtrar "zzzz-no-existe" oculta todas las tarjetas y Escape lo pliega, limpia el filtro y devuelve el foco al ícono; la captura rápida es `static`, va después de la última tarjeta y antes del calendario; centrada en pantalla no la tapa nada, y al final del scroll ninguna tarjeta, contador, captura ni calendario se cruza con el nav o el FAB; sigue creando tareas. Hábitos: "Mejor racha perfecta: 1 día" bajo el anillo (= `getRachaHabitosGlobal().mejor`), una sola `.card-hero` y sin "días perfectos seguidos"; "Análisis" está al final, cerrado, con la dona y la tendencia ocultas; al abrirlo se dibujan (92 px y 301 px de ancho) y marcar un hábito no lo cierra; al final del scroll el FAB no se superpone a ninguna tarjeta. Sin scroll, el FAB queda sobre las insignias (375) o sobre filas de hábitos (1280): es el comportamiento sticky de siempre, anotado como pendiente. QA de Lista (barras de prioridad, pestañas), racha de Hoy y F3–F4 siguen pasando. Sin scroll horizontal; consola limpia; ESLint `no-undef` limpio. Capturas `sem-f6-lista-*`, `sem-f6-habitos-*`.

### Ajuste "+" en el encabezado — QA

- 375×812 y 1280×800: Lista y Hábitos sin FAB (y Hábitos sin el ícono decorativo); el "+" mide 44×44, queda dentro del encabezado sin desbordarlo ni cruzarse con el título (en Lista a 8 px de la lupa), con aria-label "Nueva tarea" / "Nuevo hábito" y foco visible (contorno sólido de 2 px con teclado); abre el formulario de tarea nueva / hábito nuevo y Atrás lo cierra. Barrido de scroll completo (cada 120 px): ningún elemento tapado por un FAB, y al final del scroll nada detrás del nav; en Hábitos también con "Análisis" abierto. QA de F6 sigue pasando. Consola limpia; ESLint `no-undef` limpio. Capturas `aj-fab-lista-*`, `aj-fab-habitos-*`.

### F7 — QA final de Semana

- QA de punta a punta (`qa-sem7`), de a una, a 1280×800 (columnas) y 375×812 (detalle), reloj en el jue 24 sept: a 1280 hay 7 columnas alineadas bajo sus celdas, la de hoy resaltada y con scroll propio; semana anterior (14–20 sept, 3 ítems el jue 17), siguiente (28 sept – 4 oct) y vuelta a esta; marcar y desmarcar un ítem del planificador y una tarea de Lista; elegir el domingo (a 1280 tocando el fondo de su columna) cambia el chip a "DOM 27" y crear lo agrega ahí; "Mover a" lo pasa al sábado; con 15 ítems en un día la columna hace scroll por dentro (1307/418 px) y pasado su alto máximo la página no crece; `budget-updated` con borrador no repinta; Atrás con el detalle de una tarea abierto lo cierra y queda en Semana; "Pasar a hoy" deja todo en hoy y quita la tira; cruzar 900 px (899 ↔ 900) cambia de modo.
- Regresión de Semana, de a una: F2–F6, el ajuste del "+" y Lista a 375; F3–F5 también a 899×800 (último ancho con detalle de un día); F2, F6 y el ajuste del "+" a 1280. Todo sin fallas. Sin scroll horizontal; consola limpia; ESLint `no-undef` limpio. Capturas `sem-f7-columnas-1280`, `sem-f7-final-1280`.

### Ajuste final — QA

- 1280×900 y 900×800 (Playwright, de a una), datos demo + 15 ítems en el jue 24 (7 del planificador por la UI y 7 tareas de Lista con fecha ese día, una hecha; títulos de 101 caracteres): las 15 filas tienen 2 bloques visibles (nunca una tercera línea); el texto ocupa a lo sumo 2 líneas y los largos se cortan con ellipsis, con el título completo en `title`; vencimiento, prioridad y acciones en una sola línea (32 px) sin desbordarse; la segunda línea alineada con el texto; el ⋯ pegado a la derecha y en la misma x en todas las filas, con 32×32 px; en el planificador la ✕ va justo antes del ⋯; misma altura mínima (64 px) y padding en los dos orígenes; la etiqueta corresponde al ancho de la columna (125 px → "HOY"; 88 px → cuadrado); `scrollWidth === clientWidth` en las 7 columnas y la de hoy hace scroll por dentro (1184/518 a 1280); el ⋯ abre "Mover a" con los 7 días y mantener presionado sigue activando el modo mover.
- 899×800 y 375×812: el detalle de un día es idéntico píxel a píxel al de 0da0527 (capturas de `#plan-host` del mié 23, jue 24, sáb 26 y con el menú ⋯ abierto, servidas una desde el árbol actual y otra desde un `git archive 0da0527`).
- QA de F7 a 1280 sigue pasando. Consola limpia; ESLint `no-undef` limpio. Capturas `sem-ajuste-filas-1280`, `-900`, `-899`, `-375`.

### Ajuste 2 — QA

- 1280×900 y 900×800 (y 1024×800, con la barra lateral ancha), de a una, datos demo + 15 ítems mezclados en el jue 24 con títulos de 101 caracteres: ninguna fila con tercera línea; texto en 2 líneas como máximo con los largos cortados; la segunda línea es solo prioridad + ⋯ en las tareas de Lista y ✕ + ⋯ en el planificador, en una sola línea, alineada con el texto y sin desbordarse; el ⋯ en la misma x en todas las filas; ninguna columna con scroll horizontal; ninguna etiqueta de vencimiento en las columnas.
- "Cambiar filtro de la aspiradora" (Lista, pendiente, mié 23): check con borde `--rd`; marcada como hecha vuelve al estilo normal y deja de decir "vencida". Un ítem del planificador pendiente del lun 14 (semana anterior) mantiene el borde normal. aria-label "Cambiar filtro de la aspiradora, vencida el miércoles 23. Abrir el detalle" y title "… (vencida el miércoles 23)"; una tarea de hoy: "Tarea corta 0, vence hoy. Abrir el detalle" con el borde normal.
- 899×800 y 375×812: el detalle de un día es idéntico píxel a píxel al de a4caba3 (mié 23, jue 24, sáb 26 y con el menú ⋯ abierto). QA de F7 a 1280 sigue pasando. Consola limpia; ESLint `no-undef` limpio. Capturas `sem-ajuste2-1280`, `-900`, `-375`.

## 4 oct 2026 — Sesión activa "Cabina HUD" (`docs/REDISENO-SESION-HUD.md`)

**`CACHE_NAME` final: `vanguard-os-v258`.** Rediseño de la sesión activa de Entreno (GYM y Calistenia) por fases; el
plan y su tabla de estado están en `docs/REDISENO-SESION-HUD.md`. QA con
Playwright en 375×812 y 1280×800, zona `America/Santiago`, reloj simulado,
contextos limpios sin Supabase (`supabase.co` bloqueado) y el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI. Capturas en
`.playwright-mcp/hud-fN-*` (ignorada por Git).

| Fase | Caché | Qué cambia |
|---|---|---|
| 1 — Borrador | v243 | La sesión en curso se guarda en `localStorage` (`vanguard.sesionEnCurso`, `js/utils/sesion-borrador.js`) al empezar y con cada cambio (marcar, editar valores, tipo, RPE, sugerencia, + Serie, añadir ejercicio). No va al log ni a la sync: es estado de UI de un dispositivo y la sesión sigue naciendo con un solo `sesion_registrada`. El cronómetro parte del inicio guardado (antes se reiniciaba también al añadir un ejercicio). Tarjeta "Tienes una sesión en curso · Pull · 18 min" en Entreno con Retomar y Descartar; un borrador de más de 12 h muestra la hora de inicio y al guardar pregunta duración real o 60 min. Atrás y "Volver" ya no destruyen la sesión. Empezar otra con una en curso pide descartarla. Se borra al guardar o descartar. |
| 2 — Pantalla completa y orden | v246 | En móvil la barra inferior se oculta mientras la sesión está abierta (clase `entreno-sesion-activa` en `<html>`; se quita al volver, con Atrás, al guardar, al descartar y al cambiar de vista); el riel de tablet/PC se queda. Barra superior fija: ✕ (con series marcadas pregunta "¿Salir? Tu sesión queda guardada como borrador" · Salir / Descartar sesión / Cancelar), rutina + categoría y Finalizar. Los ejercicios van en el orden de la rutina con el rótulo "Ejercicio 2 de 7 · Espalda" (se quitó la agrupación por grupo muscular, que separaba las superseries); las superseries siguen igual. Sin el bloque "Fatiga en vivo" (vuelve en el HUD). La sesión se abre arriba. |
| 3 — HUD | v247 | Tarjeta principal con chaflán (`.card-hero`) fija bajo la barra superior (`.sesion-cabecera`): mapas mini de frente y de espalda (dos `MuscleMap` de 32 px, `.mk3-muscle-map--hud`, sin sombra) con la fatiga en vivo de antes (48 h previas + series marcadas); Tiempo, Series hechas/total, Volumen en kg con ▲/▼ % contra la última sesión de la misma rutina (oculto sin sesión previa o sin volumen) y Récords (contador + el último, comparados contra el récord que había al abrir la sesión); barra segmentada con una marca por serie (cian hecha, ámbar récord, borde cian la que toca, vacía pendiente; espacio entre ejercicios). Todo se actualiza al marcar, desmarcar o editar, sin repintar la sesión. El tiempo pasa del encabezado al HUD; "Descanso: 90 s" queda debajo. |
| 4 — Riel y un ejercicio por pantalla | v248 | Riel de pestañas bajo el HUD (dentro de la cabecera fija): nombre corto + progreso "2/3", la activa en cian, ✓ en las terminadas, scroll horizontal; los ejercicios consecutivos con el mismo `grupoId` van en un marco ámbar "SUPERSERIE A, B…"; al final "+" (añadir ejercicio con el mismo buscador, queda activo). Se ve un ejercicio a la vez (los demás bloques siguen en el DOM, ocultos): se cambia con la pestaña, con las flechas del teclado en el riel, deslizando (más de 60 px y el doble de horizontal que vertical) o con "‹ Anterior / Siguiente ›" y puntos de paginación. Al completar la última serie de un ejercicio pasa solo al siguiente: al instante dentro de una superserie, si no al terminar (o cerrar) el descanso. El borrador guarda el ejercicio activo y al retomar vuelve a él. |
| 5 — Tabla, editor y botón principal | v249 | Tabla por ejercicio `# · ANTERIOR · KG · REPS · RPE · ✓`: "Anterior" es la serie con el mismo índice de la última vez (`db.getUltimoRegistro`, "47,5×11"); el chip del número conserva el color y el popover del tipo de serie; la fila hecha se atenúa y la que toca lleva borde cian (tocar cualquier fila la vuelve la que toca; desmarcar una también). Editor bajo la tabla para la fila que toca: KG −/+ (2,5), REPS −/+ (1) con números grandes y RPE en chips 6–10; escribe en los inputs de la fila (siguen siendo lo que leen Finalizar, el borrador y el HUD); peso 0 en Calistenia se muestra "Corporal"; mantener presionado el KG abre la calculadora de discos. Chips en una línea: PR, nivel y sugerencia ("↑ Sube a 50 kg", aplica a las series sin marcar); el estancamiento es un chip ámbar "Estancado 3 ses." que muestra el texto. ⓘ Técnica, Progreso y Calculadora de discos pasan a un menú ⋯. Botón principal fijo abajo con chaflán: "✓ Completar serie 2 · 60 kg × 10"; en superserie, ámbar "✓ Completar y pasar a Curl →"; sin pendientes "Siguiente ejercicio →"; en el último, "Finalizar sesión". Tras el descanso de una superserie se vuelve al primero de la corrida con series pendientes. Helper `js/utils/numero.js` (es-CL) para los números nuevos. |
| 6 — Descanso en el HUD | v250 | Al completar una serie (salvo entre ejercicios de una superserie) el HUD pasa a modo descanso: anillo con la cuenta y "de 1:30", "Siguiente: Remo · serie 3 · 60 kg × 10", −15 / +15 / Saltar y una línea con tiempo, series y volumen. El botón principal queda atenuado ("Descansando… 01:09") y se puede seguir editando la serie siguiente. Al llegar a 0: `playBeep()` + `navigator.vibrate([200,100,200])` y vuelve el modo normal. La cuenta va contra una hora de término y queda en el borrador (al recargar sigue contando). Pantalla siempre encendida con la Wake Lock API (se vuelve a pedir en `visibilitychange` y se suelta al salir). Se eliminó el temporizador flotante; la duración del descanso se ajusta en el menú ⋯ de la barra superior. |
| Ajustes (tanda 2) | v251 | Volumen del HUD como avance contra la última sesión de la misma rutina ("880 de 7.078 kg"); el ▲ % solo al superarla, nunca ▼ a mitad de sesión; sin sesión previa, solo los kg. A ≥1024 px la sesión (HUD, riel, tabla, editor, pie) tiene 760 px como máximo, centrada. Números de la vista de sesión en es-CL con `formatNumero` (aviso de récord, panel Progreso y sus etiquetas del gráfico, calculadora de discos). El pie fijo queda pegado al borde (sin franja por la que se veía el contenido). En el plan, la pregunta de duración (>12 h) queda al guardar. |
| 7 — Récord en vivo | v252 | Con la misma regla del chequeo de récord que ya existía (supera el récord que había al abrir la sesión), cada serie marcada que es récord se pinta en ámbar con ★ en vez de ✓ y debajo "NUEVO PR · 45 kg (antes 42,5)"; el bloque Récords del HUD se resalta un momento y se anuncia al lector de pantalla; su segmento queda ámbar. En modo descanso (que oculta el bloque Récords) la línea del descanso suma "· 1 récord" y se resalta. Al desmarcar, o al bajar el peso hasta no superar el récord, todo se revierte. Reemplaza la insignia flotante "Nuevo PR" y el aviso emergente. |
| 8 — Resumen al finalizar | v253 | Solo GYM y Calistenia: Finalizar (con series marcadas) abre una vista de resumen dentro de la misma sub-vista, con su entrada de historial (Atrás vuelve a la sesión): barra "Sesión completada · Pull · mié 30 sept"; tarjeta con Duración, Volumen (▲/▼ % contra la última de la misma rutina), Series hechas/total y RPE promedio de las series; mapas de frente y espalda de 64 px con la fatiga de la sesión y la lista de récords (ámbar); tabla "Por ejercicio" con series, volumen y variación contra la última vez de cada uno; nota opcional y RPE de la sesión (1–10); Guardar sesión (`registrarSesion` con la misma forma de siempre, borra el borrador y vuelve a Entreno), "Volver a la sesión" y Descartar (ConfirmDialog). Sin series marcadas se mantiene el ConfirmDialog de siempre y se registra sin resumen. HIIT sigue con su modal (`session-summary-form.js`). |
| Ajuste (tanda 3) | v255 | HUD compacto bajo 1024 px: al bajar dentro de la sesión el HUD pasa a una línea de unos 48 px (tiempo · series · volumen · ★ récords y la barra segmentada) y arriba del todo vuelve a expandirse (histéresis: compacta pasados 160 px, expande en 4 px o menos); en descanso la línea muestra la cuenta regresiva y Saltar. El scroll se compensa al compactar (sin saltos; `overflow-anchor: none` en la sesión para que Chrome y Safari se comporten igual). A ≥1024 px el HUD queda siempre completo. Bajo 768 px se quitan "‹ Anterior / Siguiente ›" (quedan pestañas, deslizar y puntos). Peso 0 en un ejercicio de peso corporal (rutina o ejercicio de Calistenia, o equipo sin carga externa: ninguno, barra de dominadas, anillas) se muestra "Corporal" también en GYM: editor, tabla (etiqueta sobre el KG; al enfocarlo se edita el 0), botón principal y "Siguiente:" del descanso. Para que a 375×812 entren sin scroll la fila que toca, el editor y el botón principal: bajo 768 px la sesión también oculta el encabezado de la app (como ya hacía con la barra inferior) y se aprietan márgenes y filas (36 px). De paso: el editor ya no se sale de la tarjeta a 375 (columnas `minmax(0, 1fr)`) y el pie fijo queda pegado abajo al final del scroll (sin el relleno inferior de 120 px de la vista). |
| 9 — QA y documentación | v256 | Recorrido completo y auditoría de la vista: sin `border-radius` ni sombras (se quitaron los de las cajas del panel Progreso, sus botones Peso/1RM y la calculadora de discos, y la sombra del popover de tipo de serie); colores solo con tokens (el fondo de los tipos de serie con `color-mix` de tokens, `#000` → `var(--bg)`; los discos de la calculadora usan tokens nuevos `--disco-*` con los colores reales de las placas); sin voseo. Contra la maqueta `docs/mockups/sesion-hud-v2`: chaflán (`clip-path`) en el botón principal fijo y en "Guardar sesión" (la regla general de MK III se lo quitaba a todo botón que no fuera `.btn-primary`); en descanso, línea de ayuda bajo el HUD "Mientras descansas puedes ajustar la serie 2 o ver la técnica" (sin técnica o sin serie pendiente, solo la parte que aplica); el bloque Récords del HUD lleva marco ámbar mientras haya récord en la sesión y muestra "+1 ahora" unos 5 s después de un récord nuevo (luego vuelve el último). El subtítulo de la barra sigue siendo solo la categoría: no existe un dato de "semana N" del plan ni del generador. PLAN y CHANGELOG al día. |
| Cierre | v257 | Router (`navigate()` en `app.js`): cada navegación lleva un id y, si mientras carga su vista llega otra, la vieja no pinta encima al terminar tarde (antes Hoy → Entreno → Finanzas rápido podía dejar el hash en una vista y el contenido de otra; era la falla intermitente de la QA de la fase 8 a 1280). Volumen del HUD: si "X de Y kg" no cabe (375 px) queda "X kg" (se quitan "de Y" y, si hace falta, el ▲ %); se mide con el dato a la vista y otra vez al terminar el descanso o expandir el HUD. La línea de ayuda del descanso va debajo de la tabla del ejercicio activo (ya no entre el HUD y el riel) y, si al empezar el descanso el editor queda detrás del pie fijo, la vista baja lo justo. Series pendientes con "○" en vez del ✓ gris (la marcada sigue con ✓ verde y el récord con ★). Revisado: en `hud-f9-record-375` los 12 kg × 12 de Curl eran dato de la rutina de prueba ("QA Superserie": 12 kg × 12, 12 × 12, 12 × 10), no un error del editor; igual la QA ahora comprueba que KG y REPS del editor quedan cada uno en su campo. |
| Esperas sin tiempo fijo | v258 | Las dos esperas de 500 ms que quedaban se reemplazan por el mismo enfoque del resumen: `esperarSalidaDeModal(modalId)` (nuevo en `js/core/history.js`) espera el `popstate` real con que history.js suelta la entrada de un modal recién cerrado, y no espera nada si esa entrada ya no es la actual. Lo usan eliminar y "¿Descartar los cambios?" en el historial de sesiones (`sesiones-historial.js`, antes `esperarRetrocesoDe`) y "Ya tienes una sesión en curso" al empezar otra (`goToSession` en `entrenamiento.js`). Con la espera fija, en un equipo lento el siguiente movimiento del historial podía adelantarse y dejar una entrada colgando. |

### Esperas sin tiempo fijo — QA

- Con la CPU frenada ×4 (CDP `Emulation.setCPUThrottlingRate`), de a una, 5 de 5 a 375 y 5 de 5 a 1280: eliminar desde el historial (una sesión menos, sin entradas de modal colgando) y Atrás → principal de Entreno sin reabrir el detalle; editar con cambios → Cancelar → Descartar vuelve al detalle con su entrada, Atrás cierra el detalle y otro Atrás vuelve a la principal; con un borrador, empezar otra rutina → "Ya tienes una sesión en curso" → Descartar y empezar abre la nueva con la entrada de la sub-vista y Atrás vuelve a la principal (no a la confirmación); Retomar desde la tarjeta y Atrás.
- Regresiones de sesiones e historial (editar, eliminar/deshacer de la fase 4, borrador, pantalla completa, resumen, "Hoy toca") a 375 y 1280 sin fallas. ESLint `no-undef` limpio; consola limpia.

### Cierre — QA

- Router: Hoy → Entreno → Finanzas con 120 ms entre toques, 5 de 5 a 1280 y a 375: termina en `#finanzas` con la vista de Finanzas, su scope y su pestaña activa, sin restos de Entreno ni de Hoy. QA de la fase 8 a 1280, 10 de 10 (de a una).
- 375: pendientes "○○○", tras marcar "✓○…"; editor +2,5 kg y +1 rep → "0×10 → 2.5×10 → 2.5×11"; en descanso la ayuda queda bajo la tabla y el editor sobre el pie (borde inferior 728 ≤ 732); volumen "1.140 kg" sin cortarse con récord. Capturas `hud-fin-sesion-375`, `hud-fin-descanso-375`, `hud-fin-record-375`.
- Regresión: las 17 QA anteriores a 1280 y las de las fases 4–9 a 375, de a una, sin fallas. Las QA de las fases 3 y 7 se pusieron al día con lo de la fase 9 (justo después de un récord esperan "+1 ahora" y, pasados 6 s, el nombre) y la de la fase 7 espera "○" al desmarcar. ESLint `no-undef` limpio; consola limpia.

### Fase 9 — QA final

Recorrido en 375×812 y 1280×800 (respaldo COMPLETO + rutina de superserie y un récord previo de prueba, locales):
- GYM desde "Hoy toca": sesión (botón principal con chaflán), descanso al completar una serie con la línea de ayuda "Mientras descansas puedes ajustar la serie 2 o ver la técnica" (sin descanso no aparece), recarga a mitad → tarjeta → Retomar con la serie hecha, ✕ → Descartar sesión (sin borrador ni sesión guardada).
- GYM desde la lista ("QA Superserie"): superserie agrupada en el riel, A1 → A2 sin descanso, récord en vivo en Curl (45 > 42,5) con el bloque Récords enmarcado en ámbar y "+1 ahora"; pasados 6 s vuelve "· Curl de Bíceps 45" y el marco sigue; resumen ("Guardar sesión" con chaflán) y guardar (1 sesión, sin borrador).
- Calistenia desde la lista: "Corporal" en el botón, resumen y guardar; al terminar vuelve la barra de navegación.
- Capturas de los 4 estados: `hud-f9-sesion-*`, `hud-f9-descanso-*`, `hud-f9-record-*`, `hud-f9-resumen-*`.
- Auditoría de estilos computados en la vista (incluye el panel Progreso, la calculadora y la ficha de técnica): ningún `border-radius` ni sombra. Sin colores literales en la vista (salvo el buscador de ejercicios, que el plan deja fuera de alcance) y sin voseo.
- ESLint `no-undef` limpio; consola limpia.

### Notas

- El buscador de ejercicios (`abrirBuscadorEjercicios`) conserva sus estilos (radios y colores propios): el plan lo deja fuera de alcance.
- HIIT, Descanso activo, `session-summary-form.js` (lo sigue usando HIIT) y la edición de sesiones del historial no cambian; `registrarSesion` recibe la misma forma de siempre y no hay tipos de evento nuevos.

### Fase 8 — QA

- "Pull" con 60 kg × 10 (récord, RPE 8), 45 kg × 10 (RPE 9) y Jalón 50 kg × 10: Finalizar abre el resumen con "Sesión completada · Pull · mié 30 sept", "1.550 kg ▼ 78 %" (contra 7.077,5), "3/21", RPE promedio "8,5", mapas de 64 px, "★ Remo Invertido con Pies Elevados · 60 kg (antes 47,5)" y por ejercicio "1.050 kg ▼ 31 %" y "500 kg ▼ 67 %".
- Atrás y "Volver a la sesión" vuelven a la sesión con todo igual y sin guardar.
- Guardar con nota "Buena sesión" y RPE 7: un solo `sesion_registrada` con los mismos campos que una sesión guardada antes del cambio (las del respaldo; ahora con `checked: true` en cada serie, como desde la fase de nivel), nota, RPE y las series marcadas; borra el borrador y vuelve a Entreno sin entradas de historial colgando.
- Descartar pide confirmación y no guarda; sin series marcadas sale "Terminar sesión vacía" como siempre. Calistenia también abre el resumen. HIIT sigue mostrando su modal.
- 375 y 1280; regresión de fases 1–7 y QA anteriores sin fallas (guardan desde el resumen). ESLint `no-undef` limpio; consola limpia.
- Ajuste (v255): QA propia a 375 (HUD compacto 50 px, descanso compacto con Saltar, sin saltos Δ 0 px, sin Anterior/Siguiente, "Corporal" en editor/tabla/botón/descanso, 0 en ejercicios con carga, fila + editor + botón sin scroll) y a 1280 (HUD siempre completo, Anterior/Siguiente presentes); QA de fases 4–8 a 375 sin fallas (la de la fase 4 ahora comprueba que bajo 768 px no están los botones). Capturas `hud-aj2-expandido-375`, `hud-aj2-compacto-375` y `hud-aj2-descanso-375`. ESLint `no-undef` limpio; consola limpia.
- Arreglo (v254): Guardar y Descartar desde el resumen ya no esperan 500 ms fijos para soltar la entrada del resumen; esperan el `popstate` real de ese retroceso (y el de la confirmación, al descartar) antes de que `goToMain`/salir haga el suyo. Con la espera fija, en una máquina cargada los dos retrocesos se pisaban (2 fallas en 3 corridas a 1280). Tras el arreglo: 10/10 a 375 y 9/10 a 1280; la falla restante deja el hash en `#entrenamiento` con otra vista pintada, compatible con una carrera de render del router (`navigate()` sin guarda contra un render tardío), fuera de este alcance.

### Fase 7 — QA

- Respaldo de prueba local con una sesión previa de Curl de Bíceps a 42,5 × 10 (chip "PR 42,5 kg"). Marcar 45 kg: fila ámbar con ★, "NUEVO PR · 45 kg (antes 42,5)", HUD "Récords 1 · Curl de Bíceps 45" resaltado un momento, segmento ámbar, anuncio "Nuevo récord: 45 kg en Curl de Bíceps"; en el modo descanso que arranca, la línea "… · 540 kg · 1 récord" también se resalta.
- 40 kg en otra serie queda normal (✓ verde); bajar la serie récord a 42,5 la vuelve normal y quita la nota; volver a 45 la marca otra vez; desmarcar quita fila ámbar, nota, contador y segmento.
- Recargar y retomar con el récord marcado: sigue pintado, sin volver a resaltar.
- 375 y 1280; regresión de fases 1–6, ajustes y QA anteriores sin fallas. ESLint `no-undef` limpio; consola limpia.

### Fase 6 — QA

- "Pull": se pide el Wake Lock al abrir; sin temporizador flotante. Completar la serie 1 con el botón: el HUD muestra 01:30 "de 1:30", "Siguiente: Remo Invertido con Pies Elevados · serie 2 · 0 kg × 10" y "Tiempo · Series 1/21 · 0 kg"; el botón dice "Descansando… 01:30" atenuado y no hace nada; editar la serie 2 durante el descanso actualiza "Siguiente" (2,5 kg).
- +15 → 01:45 de 1:45; −15 → 01:29; 30 s de reloj simulado → 00:59. Recargar y retomar: sigue contando (00:57 de 1:45).
- Al llegar a 0 (reloj simulado): un `playBeep()` y `navigator.vibrate([200,100,200])` (espías), el HUD y el botón vuelven a la normalidad ("✓ Completar serie 2 · 2,5 kg × 10"). Saltar vuelve sin sonar.
- Menú ⋯ de la barra: + sube el descanso a 105 s (y el siguiente es "de 1:45"); Escape lo cierra sin salir. Al volver a la app (`visibilitychange`) se vuelve a pedir el Wake Lock; al salir con ✕ se suelta.
- "QA Superserie": sin descanso entre A1 y A2; tras A2 hay descanso y lo siguiente es "Press de Banca · serie 2".
- 375 y 1280; regresión de fases 1–5 y QA anteriores sin fallas (la de la fase 5 salta el descanso donde corresponde). ESLint `no-undef` limpio; consola limpia.

### Fase 5 — QA

- "Pull", Remo Invertido: columnas `# · ANTERIOR · KG · REPS · RPE · ✓` y "Anterior" igual a la última Pull ("47,5×11 | 47,5×10 | 47,5×11"); chips "PR 47,5 kg · 1RM ~65 kg", nivel y "↑ Sube a 50 kg" (aplicarlo pone 50 kg en las series sin marcar).
- Solo con el editor y el botón (sin teclado): +2,5 ×3 y −2,5 → 55 kg, +1 rep → 11, RPE 8; el botón dice "✓ Completar serie 1 · 55 kg × 11" y completa; tocar la fila 3 la vuelve la que toca; "Siguiente ejercicio →" al terminar; en el último ejercicio "Finalizar sesión" guarda. La sesión guardada tiene 55 kg × 11 con RPE 8 y la serie 3 con 9 reps, con la misma forma de siempre.
- Menú ⋯ con Técnica, Progreso y Calculadora de discos; Escape lo cierra sin salir de la sesión; la calculadora se abre desde ⋯ y manteniendo presionado el KG.
- Calistenia ("Pecho — Primeros Pasos"): "Corporal" en el editor y "✓ Completar serie 1 · Corporal × 15".
- "QA Superserie": botón ámbar "✓ Completar y pasar a Curl de Bíceps →"; completar pasa a Curl ("serie 1 · 12 kg × 12"); completar Curl arranca el descanso y al terminar vuelve a Press de Banca.
- 375 y 1280 sin scroll horizontal; regresión de fases 1–4 y QA anteriores sin fallas. ESLint `no-undef` limpio; consola limpia.

### Fase 4 — QA

- "Pull": 7 pestañas + "+", se ve solo el 1.º ejercicio con su pestaña activa ("0/3"); tocar una pestaña, "Siguiente ›", "‹ Anterior", deslizar a izquierda y derecha y la flecha derecha en el riel cambian de ejercicio; un gesto más vertical que horizontal no; "Anterior" deshabilitado en el primero.
- Completar el 1.º: la pestaña pasa a "✓ 3/3", sigue en ese ejercicio mientras corre el descanso y al terminar (reloj simulado, 91 s) pasa solo al 2.º; cerrar el descanso antes de tiempo también avanza.
- Recargar y retomar vuelve al 3.º ejercicio con el progreso del riel; añadir "Face Pull" con "+" crea la 8.ª pestaña y la deja activa.
- "QA Superserie": un marco "SUPERSERIE A" con Press de Banca y Curl de Bíceps; marcar series de A1 no arranca descanso; terminar A1 pasa al instante a A2; terminar A2 arranca el descanso y al terminar pasa a Remo con Barra.
- 375 y 1280, sin scroll horizontal de la página; regresión de fases 1–3 y QA anteriores sin fallas (las que tocaban otros ejercicios ahora los activan por su pestaña). ESLint `no-undef` limpio; consola limpia.

### Fase 3 — QA

- "Pull" (última del respaldo: 7.077,5 kg): al abrir, 0/21 series, 0 kg sin variación, 0 récords, 21 segmentos con el primero como "la que toca" y mapas de frente y espalda de 32 px; el tiempo avanza.
- Marcar 40 kg × 10: 1/21, 400 kg, "▼ 94 %", segmento hecho y el siguiente pasa a ser el que toca; el bloque es el mismo nodo (sin re-render).
- 60 kg × 8 en Remo Invertido (récord previo 47,5): "Récords 1 · Remo Invertido con Pies Elevados 60", segmento ámbar, 880 kg. Al desmarcarlo se va del contador y del segmento.
- Dos series de Jalón: el mapa de espalda pasa de 0 a 7,3 de intensidad total (el de frente sigue en 0); desmarcar todo vuelve contador, volumen, segmentos y mapa al inicio.
- Editar el peso de una serie marcada actualiza el volumen; con scroll el HUD queda fijo bajo la barra; sin scroll horizontal; al recargar y retomar el HUD muestra lo marcado.
- 375 y 1280; regresión de fases 1–2 y QA anteriores sin fallas. ESLint `no-undef` limpio; consola limpia.

### Fase 2 — QA

- 375: sin barra inferior durante la sesión (también al retomar) y la barra superior queda fija al hacer scroll; la barra inferior vuelve al salir con ✕ sin series, con Atrás, con ✕ → Salir (el borrador queda y aparece la tarjeta), con ✕ → Descartar sesión (borra el borrador), al cambiar de vista y al guardar con Finalizar. Atrás sobre la pregunta "¿Salir?" sigue en la sesión.
- 1280: el riel se queda durante la sesión.
- "Pull": el orden en pantalla es el de la rutina y los rótulos van de "Ejercicio 1 de 7 · Espalda" a "Ejercicio 7 de 7"; sin "Fatiga en vivo".
- Superserie (rutina de prueba "QA Superserie": Press de Banca + Curl de Bíceps con el mismo `grupoId`, después Remo con Barra): quedan juntas y en orden, Curl con su chip "SUPERSERIE" (antes Curl caía en la sección "Brazos", después de Remo).
- Regresión: QA de borrador, Hoy toca, buscador, catálogo, ejercicio libre, reps por tiempo y nombres viejos sin fallas (las que salían con "Volver" ahora usan ✕). ESLint `no-undef` limpio; consola limpia.

### Fase 1 — QA

- GYM: 3 series marcadas, peso y reps editados, RPE y una serie agregada; tras recargar aparece la tarjeta ("Pull · 0 min · 3 series marcadas"); Retomar restaura todo (mismo estado por ejercicio) y el cronómetro sigue (6 s → 9 s); Atrás y "Volver" dejan el borrador; guardar borra la clave y registra una sola sesión (32 → 33) con las mismas claves que las del respaldo, solo las 3 series marcadas y los valores editados.
- Descartar pide confirmación, quita la tarjeta y la clave, y no registra nada.
- Calistenia (plantilla "Pecho — Primeros Pasos"): tarjeta tras recargar y Retomar restaura todo.
- Borrador de 13 h (reloj adelantado): la tarjeta dice "desde el mié 30 sept, 15:00"; Finalizar pregunta "Usar 60 min" / "Usar la duración real · 13 h 29 min" / Cancelar; Atrás cierra la pregunta sin guardar; se guarda con la duración elegida (60 a 375, real a 1280) y se borra el borrador.
- `localStorage` sin poder escribir (`QuotaExceededError`) o con la clave del borrador bloqueada (`SecurityError`): la sesión funciona igual, sin tarjeta y sin errores.
- ESLint `no-undef` limpio; consola limpia salvo 5 avisos anteriores a esta fase (ver abajo).

### Fase 1 — detectado, sin corregir

- **Reps de tiempo en un campo numérico:** las plantillas de Calistenia traen reps como "30s" o "20s/lado"; el campo de reps de la sesión es `type="number"`, así que el navegador avisa ("cannot be parsed") y el campo queda vacío: esas series se guardan (y quedan en el borrador) sin reps. Pasa igual antes de esta fase. **Corregido (v245):** el campo de reps de la sesión es texto con teclado numérico, así "30s" y "20s/lado" se ven, quedan en el borrador y se guardan tal cual; el detalle del historial las muestra sin "reps" y su editor las acepta (número o segundos, ej. "30s"; antes "30s" no pasaba la validación y se habría guardado como "NaN"). Verificado en 375 y 1280 con la plantilla "Pecho — Primeros Pasos": consola sin avisos.
- **Con `localStorage` bloqueado del todo la app no arranca** (promesa rechazada sin manejar al iniciar), también antes de esta fase. **Corregido (v244):** `isPinEnabled` (el candado del primer render), la migración inicial, la moneda (`currency.js`, que usa todo monto) y la preferencia de voz de HIIT (`audio.js`, `hiit-timer.js`) leen `localStorage` en try/catch con su valor por defecto (sin PIN, CLP, voz activada). Verificado con `localStorage` bloqueado del todo en 375 y 1280: Hoy, Tareas, Hábitos, Finanzas, Laboratorio, Configuración y Entreno cargan, una sesión de GYM se guarda y HIIT abre, con la consola limpia.

## 4 oct 2026 — Hoy toca, racha del primer render y nombres de ejercicios

**`CACHE_NAME` final: `vanguard-os-v242`.** Cuatro arreglos de lo detectado
en la QA de editar/eliminar sesiones, cada uno con su commit y su bump de
caché. QA con Playwright en 375×812 y 1280×800, zona `America/Santiago`,
reloj simulado, contextos limpios sin Supabase (`supabase.co` bloqueado) y
el respaldo `vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI
(para el punto 3, un respaldo de prueba local derivado de ese, con sesiones
de id `null` y nombres viejos).

| Commit | Caché | Qué cambia |
|---|---|---|
| `0e92260` | v239 | **"Hoy toca → Empezar" en la principal de Entreno abre la sesión visible.** `mostrarSubVista()` es el único lugar que muestra la sub-vista (con su entrada de historial) y oculta la principal; lo usan todas las sub-vistas. `goToSession` no lo hacía y pintaba la sesión en la vista oculta. "Volver" desde una sesión iniciada en la principal vuelve a la principal. La tarjeta "Hoy toca" de Hoy no inicia la sesión ("Ir a entrenar" lleva a la principal de Entreno) y no cambia. |
| `b98724a` | v240 | **La racha de Hoy se lee después de procesar los recurrentes.** `getRachaGlobal` espera a `getBudget` (que genera los cobros vencidos); el resto de las lecturas sigue en paralelo. |
| `d833526` | v241 | **Nombres antiguos → id del catálogo, al leer.** `idCatalogoPorNombre` (nombre del catálogo o su clave, sin distinguir mayúsculas, tildes ni espacios), `idDeEntradaEjercicio` y `metadataDeEjercicio` en `ejercicios-catalogo.js`, compartidas por Récords, Estándares de Fuerza y nivel por rama, historial (`matchEjercicio`), `getProgressionLevel`, sugerencias de nivel y el agrupado y mapa muscular de la sesión en vivo. `getPRs` agrupa por ese id y pone el mismo objeto bajo todas sus claves (incluido el nombre del catálogo); Récords deduplica. Al guardar y en la migración perezosa se sigue usando `getIdPorNombreExacto`: ninguna sesión se reescribe. |
| este commit | v242 | **"Añadir de todas formas" guarda lo escrito**, sin espacios de más y sin pasarlo a minúsculas. |

### QA

- **Hoy toca:** Empezar desde la principal de Entreno abre la sesión visible; Atrás y "Volver" regresan a la principal sin dejar la sesión oculta en el DOM ni una entrada de historial colgando; terminarla la registra una sola vez (32 → 33). Desde Hoy: con el aviso de respaldo pospuesto, "Ir a entrenar" lleva a Entreno, Empezar abre la sesión visible, Atrás vuelve a Entreno y otro Atrás a Hoy.
- **Racha (lunes 28 sept, con un recurrente que vence ese día):** el primer render de Hoy muestra 87 sin pasar por 86 (el chip se registra desde la carga) y lee `events` una vez; la versión anterior mostraba 86 y leía dos veces. Tres recargas no vuelven a procesar el recurrente (1 transacción, 1 `recurrente_procesado`, 1 `movimiento_registrado`).
- **Nombres antiguos:** con sesiones de id `null` ("Peso Muerto" 180 × 5, "Flexiones", "Plancha", los 19 nombres viejos y "Remo inventado QA") más "Peso Muerto Convencional" 170 × 5 con id:
  - Récords: una sola tarjeta "Peso Muerto Convencional 180kg × 5", ningún nombre viejo suelto y sin duplicados; el inventado sigue aparte.
  - Estándares de Fuerza: 1RM de 210 kg, que sale del récord de 180 guardado con el nombre viejo (la versión anterior usaba el de 170: 198 kg).
  - Árbol (rama Cadera): el nivel cuenta ese récord.
  - Pista de nivel en la sesión en vivo: Peso Muerto, Flexiones, Plancha, Press Militar y Pistol Squat la muestran (antes ninguno); el inventado no la tiene. Los 12 de los 19 que están en el árbol la resuelven; los otros 7 no tienen nodo.
  - Agrupado muscular: cada nombre viejo cae en su grupo y no en "Otros".
  - Las sesiones guardadas quedan intactas (ids `null`) y el replay desde `events` da las mismas sesiones que el store.
- **Ejercicio libre:** "  Remo en   TRX " queda como "Remo en TRX" en el botón, la sesión, lo guardado (id `null`), el detalle del historial y Récords.
- Regresión: QA de edición, buscador, catálogo y fase 4 sin fallas. ESLint `no-undef` limpio; consola sin errores.

## 27 sept – 4 oct 2026 — Editar y eliminar sesiones de Entreno

**`CACHE_NAME` final: `vanguard-os-v238`.** Desde el historial de sesiones
se puede ver el detalle de cada sesión, eliminarla (con Deshacer) y
editarla. Todo lo derivado (racha, actividad por día, últimos pesos, metas
por sesiones, Laboratorio > Semana) sale de las sesiones vigentes según el
log, que se calculan con `sesion_registrada`, `sesion_editada`,
`sesion_eliminada` y `sesion_restaurada`. QA con Playwright en 375×812 y
1280×800, zona `America/Santiago`, reloj simulado, contextos limpios sin
Supabase (`supabase.co` bloqueado) y el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI.

### Decisiones

1. Eliminar: botón en el detalle → "¿Eliminar la sesión del lunes 21 sept?" → aviso "Sesión eliminada · Deshacer" durante 6 s (se pausa mientras tiene el foco). Deshacer emite `sesion_restaurada`; el evento de eliminación nunca se borra.
2. En replay y sync, una eliminación gana aunque llegue antes que la creación (lápida por id). Los eventos de una sesión se ordenan por `ts` y, si empatan, por id del evento: dos dispositivos quedan idénticos con cualquier orden de llegada.
3. Editar: fecha (no futura), duración, notas y series (peso, reps, tipo, marcada; agregar y quitar series y ejercicios). `sesion_editada` lleva la sesión completa y el replay deja la última versión.
4. Las insignias ya ganadas no se pierden (se calculan sobre la actividad histórica); la racha sí se recalcula y puede bajar.
5. Historial en la vista principal de Entreno: últimas 8 semanas con sesiones y "Cargar más".
6. Editar una sesión de una semana ya revisada recalcula su resumen, pero no vuelve a mostrar la tarjeta "Tu semana".

### Fases

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| 1 | `1f249f7` | v233 | Motor: `sesiones-estado.js` (estado neto por sesión desde el log, compartido por `db.js` y el replay de `sync.js`), `db.editarSesion` / `eliminarSesion` / `restaurarSesion`. Racha global, racha de Entreno, actividad por día y últimos pesos usan las sesiones vigentes (lectura compartida de `events`, memoizada). |
| Paso previo | `63f7d06` | v234 | El día de hoy entra en la clave de la caché memoizada: a medianoche ningún evento la invalida y un render dentro del TTL mostraba el día anterior. |
| 2 | `34a61bb` | v235 | Historial por semana con "Cargar más", detalle en modal (sin tapar la barra ni el riel), Eliminar con confirmación y `ToastAccion` (aviso reutilizable con acción). |
| 3 | `be9b5e0` | v236 | Editar en el mismo modal: validaciones (fecha futura, sin ejercicios, ejercicio sin series, números negativos o ilegibles), Cancelar/Atrás/Escape vuelven al detalle con "¿Descartar los cambios?" si hubo cambios, aviso "Sesión actualizada" y la sesión pasa a su semana nueva. El buscador de ejercicios de la sesión en vivo se exporta (`abrirBuscadorEjercicios`) y se usa tal cual. |
| — | `37183bf` | v237 | El buscador de ejercicios es un `.modal-overlay` con id: deja libre la barra inferior y el riel, y Atrás o Escape cierran solo el buscador (sesión en vivo y edición). |
| — | `4239524` | v238 | El buscador muestra el nombre real del catálogo y la sesión en vivo guarda `ejercicioId` + nombre del catálogo; "Añadir de todas formas" guarda id `null`. |
| 4 | este commit | v238 | QA final y documentación. |

### QA final (fase 4)

Con el reloj en el lunes 28 sept 2026, 14:00:
- Hoy muestra "Tu semana · 21 – 27 sept"; "Después" la oculta.
- Eliminar el viernes 25 sept: confirmación con ese texto, aviso "Sesión eliminada · Deshacer" que se va solo a los ~6 s, la sesión sale del historial. La meta "36 entrenamientos" pasa de 32 a 31; Laboratorio > Semana 21–27 pasa de 3 a 2 sesiones (168 → 119 min); las insignias quedan iguales (ganadas: 7 días de racha, Mes de presupuesto sin excederte y 10 sesiones de entrenamiento); la tarjeta "Tu semana" no vuelve.
- Eliminar el miércoles 23 y tocar "Deshacer": vuelve al historial y la meta vuelve a 31.
- Editar el lunes 21 al 14 sept: "Sesión actualizada"; Semana 21–27 queda con 1 sesión y 14–20 con 4 (de 3 objetivo); la meta no cambia; la tarjeta no reaparece; insignias iguales.
- Tras recargar: la eliminada sigue fuera, la restaurada sigue y la editada está en su semana nueva.
- La racha global queda en 87 días en todo el recorrido: los días tocados tienen otra actividad (hábitos, tareas, Finanzas).
- Edición (375 y 1280): foco inicial en Fecha y de vuelta en Editar al salir; sin scroll horizontal con el formulario lleno; "Atrás" sobre la confirmación sigue editando; la edición persiste tras recargar y deja un `sesion_editada`.
- Buscador: barra y riel visibles en la sesión en vivo y en la edición; Atrás y Escape lo cierran sin salir de la sesión ni del formulario, y elegir no deja una entrada de historial colgando.
- Catálogo: "Peso Muerto Convencional" agregado en una sesión en vivo queda con `ejercicioId: "peso muerto"`; Récords lo muestra (200 kg × 5) y la rama Cadera del Árbol sube de nivel (desbloquea Puente de Glúteo a una Pierna, Buenos Días y Peso Muerto con Piernas Rígidas). Un ejercicio libre queda con id `null` y aparece en Récords por su nombre.
- Motor: el estado neto de una sesión da un solo resultado con cualquier orden de llegada (6, 24 y 720 órdenes probados) y una eliminación que llega antes que la creación gana.
- ESLint `no-undef` limpio; consola sin errores.

### Diagnóstico: ejercicios guardados sin id

El buscador anterior armaba el nombre desde la clave del catálogo. De 182
ejercicios, 97 se mostraban distinto, pero 78 solo cambiaban mayúsculas (la
búsqueda exacta por nombre las ignora y les encuentra el id). Los otros 19
(ej. "Peso Muerto" por "Peso Muerto Convencional", "Flexiones" por
"Flexiones (Push-up)", "Plancha" por "Plancha (Plank)") se guardaban con id
`null`. El respaldo COMPLETO no tiene ninguna entrada sin id (224 de 224 con
id válido), así que no se migró nada. En datos reales con esos 19 nombres:
- Récords los cuenta aparte (por nombre, no por id) y el nivel por Estándares de Fuerza no los encuentra (busca el récord por el nombre del catálogo).
- `getProgressionLevel` (pista de progresión en la sesión en vivo) no reconoce 12 de ellos.
- Sugerencias de nivel y mapa muscular sí los reconocen (búsqueda aproximada por la clave del catálogo).

Propuesta original: indexar también las claves del catálogo en
`getIdPorNombreExacto` (una clave es el nombre viejo en minúsculas, y como es
el id no hay riesgo de falso positivo) y que la migración perezosa vuelva a
intentar las entradas `null` cuyo nombre coincide con una clave. Se implementó
el 4 oct de otra forma, solo al leer (`idCatalogoPorNombre`), sin migrar ni
reescribir sesiones.

### Detectado en la QA (corregido el 4 oct, ver la entrada de arriba)

- **Hoy pinta la racha de antes en el primer render del día con un recurrente vencido** (la "racha 87 vs 86"). `dashboard.js` pide `getRachaGlobal()` en el mismo `Promise.all` que `getDashboardStats()` → `getBudget()` → `processRecurringTransactions()`, que genera el gasto recurrente de hoy (cuenta como actividad). La racha se lee antes de esa escritura y Hoy muestra 86 hasta el siguiente render (87). No es la caché: `63f7d06` arregló otro caso (medianoche). Propuesta: procesar los recurrentes antes de leer los agregados de Hoy.
- **"Hoy toca → Empezar" en la vista principal de Entreno no muestra la sesión**: `goToSession` pinta la sesión en `#entrenamiento-sub-view` sin hacerlo visible (desde la lista de rutinas funciona porque la sub-vista ya está abierta).
- **"Añadir de todas formas" guarda el nombre en minúsculas** (el buscador pasa el texto ya normalizado): "Remo con toalla" queda "remo con toalla".

## 27 sept 2026 — Code review: hallazgos #6–#10

| # | Commit | Caché | Qué cambia |
|---|---|---|---|
| 6 | `6959ee6` | v229 | Editar una meta conserva el monto inicial y, si cambia, recalcula el progreso sin tocar los aportes. |
| 7 | `e28f244` | v230 | Laboratorio > Finanzas > Hitos reutiliza el presupuesto de cada mes (de 127 a 50 lecturas de IndexedDB). |
| 9 | `f790c1f` | v231 | Metas por sesiones: el progreso se deriva de las sesiones completadas desde la creación de la meta (el replay ya no la deja en 0). |
| 10 | `3753d27` | v232 | Finanzas: los formularios no tocan el DOM si la vista cambió mientras guardaban. |

El detalle de los 10 hallazgos está en `docs/PENDIENTES-CODE-REVIEW.md`.

## 27 sept 2026 — Revisión semanal (Tu semana)

**`CACHE_NAME` final: `vanguard-os-v228`.** Resumen lunes–domingo (hora
local) de Entreno, Finanzas, Tareas, Hábitos, racha/vidas y energía del
Ritual, con hasta 2 observaciones cruzadas por reglas (sin IA). Todo se
deriva del log y los stores; lo único que se guarda es qué semanas ya se
revisaron en Hoy (evento `semana_revisada`). QA con Playwright en 375×812 y
1280×800, zona `America/Santiago`, reloj simulado, contextos limpios sin
Supabase (`supabase.co` bloqueado) y el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` importado por la UI.

### Decisiones

1. Por defecto, la última semana completa; flechas hacia atrás y hasta la semana en curso ("En curso").
2. Laboratorio: botón "Semana" primero en el selector y seleccionado al entrar.
3. Hoy: tarjeta "Tu semana" lunes y martes (la semana recién terminada), después del Ritual y antes del aviso de respaldo; desaparece con "Ver" o "Después".
4. Gasto total en el resumen (variable al lado); las observaciones usan gasto variable (sin recurrentes) o solo Deseos.
5. Comparaciones contra el promedio de las 4 semanas anteriores, con al menos 3 semanas con datos.
6. Máximo 2 observaciones, nunca 2 del mismo módulo principal, primero la de mayor diferencia relativa. Tuteo y "coincide con", nunca "causa".
7. El Planificador suma a tareas completadas, con "(N de Semana)".
8. Energía "3,6 · 5 de 7 días"; sin días con Ritual no se muestra.

### Fases

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| S0 | — | — | Informe de solo lectura: funciones por semana/rango, datos por día, reglas propuestas y riesgos. |
| S1 | `eb41a80` | v221 | `resumirSemana` (pura, en `db.js`) y `db.getResumenSemana(lunesKey)`: una lectura de `events` por render; bordes con claves de día; semana en curso parcial. Entreno, finanzas, tareas (Tareas + Planificador, netas), hábitos, racha/vidas al cierre, Ritual y `porDia`. |
| S2 | `33d0002` | v222 | `js/core/observaciones-semana.js`: 8 reglas (energía y entreno, Deseos vs ritmo, Ritual y hábitos, gasto variable y entreno, tareas que entran/salen, día más activo, hábitos vs ritmo, vida extra). En la semana en curso, hoy entra al % de hábitos solo si ya tiene una marca. |
| S2b | `0cc5e21` | v223 | Comparaciones entre grupos con al menos 4 días por grupo (la semana sola o, si no alcanza, las semanas con actividad de las 4 previas + la actual); magnitud con tope en 3 y desempate por días de datos; nuevo texto de "mejor día". |
| S3 | `61880fe` | v224 | `js/components/lab-semana.js`: rango con flechas, tira L–D (activo / protegido / vacío / futuro), bloques por módulo (tocar uno lleva a su pestaña), observaciones y estado vacío; aria-labels con los números. |
| S3b | `3244052` | v225 | Selector de módulos del Laboratorio en MK III (chaflán, tokens, 12,5 px, scroll horizontal con snap y sin barra a 375). |
| S4 | `a7a8560` | v226 | Tarjeta "Tu semana" en Hoy con la primera observación (o "3 entrenos · $276.490 gastado · 5 tareas"); "Ver" abre el Laboratorio en esa semana; `semana_revisada` con replay y espejo en `sync.js`. |
| S5 | `fe8b1aa` | v227 | Mono solo para las cifras (rango y porcentajes), pares número + texto sin partirse entre líneas, padding inferior con safe-area en el Laboratorio. |
| S5 (QA) | este commit | v228 | QA final y documentación. |

### Verificación con el respaldo

Semana 14–20 sept: 3 de 3 sesiones · 177 min · volumen 19.067 · gasto
$276.490 (variable $261.500), más gasto Supermercado $130.250 · 5 completadas
(3 de Semana), 8 creadas, 1 atrasada · hábitos 45 % (mejor Meditar 10 min,
más flojo Tomar agua) · racha 81 días, 2 vidas al cierre · Ritual 5 de 7 ·
energía 3,6 · 5 de 7 días. Observaciones: "Gastaste $89.100 en Deseos: 2,9
veces tu promedio de las 4 semanas anteriores ($30.700)." y "Los viernes son
tus días más activos (11 entrenos y tareas en 5 semanas); los domingos, los
más tranquilos (2)."

QA final (S5):
- Laboratorio abre en Semana 14–20; "›" lleva a 21–27 ("En curso", tira con el jueves 24 protegido y el domingo futuro); 13 veces "‹" llega a 22–28 jun (estado vacío); los bloques Entreno, Finanzas, Tareas y Hábitos llevan a su pestaña. A 375 el bloque General queda completo sobre la barra inferior.
- Hoy: lunes 28 a las 10:00 va primero el Ritual; a las 15:00, "Tu semana · 21 – 27 sept"; "Después" la oculta y el martes no vuelve; el miércoles no aparece. "Ver" abre el Laboratorio en 21–27 (S4).
- Cambio de horario: lunes 7 sept 2026 (el 6/9 no tiene 00:00) muestra 31 ago – 6 sept; domingo 4 abr 2027 (fin del horario de verano) muestra 22 – 28 mar; martes 6 abr 2027 muestra 29 mar – 4 abr. Siempre 7 días distintos, sin desplazarse ni duplicarse.
- Offline tras recarga (service worker activo): Semana muestra 21–27 con sus 5 bloques y Hoy la tarjeta "Tu semana".
- Replay desde `events` (sesiones, transacciones, tareas, planificador, rutinas, ritual, recurrentes, marcas de hábitos y semanas revisadas): mismas observaciones, mismas cifras y el mismo ocultamiento.
- A 375 y 1280 sin scroll horizontal; border-radius 0 en bloques, flechas, selector, observaciones, tira y la tarjeta de Hoy con sus botones. ESLint `no-undef` limpio; consola sin errores.

### Notas

- Las observaciones son correlaciones de una sola persona en pocas semanas: se redactan como coincidencias y nunca como causa.
- "Días objetivo" de Entreno sale de la configuración actual del generador (no hay historial de cambios).
- El encabezado "Revisión semanal" de la tarjeta de Hoy usa el mismo estilo (mono) que los encabezados de todas las tarjetas contextuales.

## 27 sept 2026 — Pulido de Finanzas, textos, Entreno y detalles

**`CACHE_NAME` final: `vanguard-os-v220`.** Diez commits entre `b8b8ea3`
(v211) y `d69a511` (v220), cada uno con su propio bump de caché. Verificado
con Playwright en 375×812 y 1280×800, zona `America/Santiago`, reloj
simulado, contextos limpios y el respaldo `vanguard-backup-demo-3-meses-COMPLETO.json`
importado por la UI. Las pruebas bloquean `supabase.co`; la sesión, cuando
hace falta, es un stub del bundle de Supabase (nunca se inicia sesión real).

### Pulido de Finanzas

| Commit | Caché | Qué cambia |
|---|---|---|
| `b8b8ea3` | v211 | Montos negativos con el signo antes del símbolo: `-$10.000` (Intl en es-CL dejaba `$-10.000`; el compacto era inconsistente). Un solo lugar en `utils/currency.js` para `formatCurrency` y `formatCompactCurrency`; lo que redondea a cero queda `$0`. |
| `079b855` | v212 | Tarjeta de sobre con disponible negativo: "Sobregiro de $66.200 acumulado" en rojo y barra al 100 % en vez de "$0 de $-66.200". Con disponible exactamente 0 queda la línea normal (un sobre vacío no es alerta). |
| `3dcd4ed` | v213 | Restaurar un respaldo (formato nuevo y antiguo) marca el onboarding inicial como completado con `marcarOnboardingInicialCompletado`, salvo que el respaldo traiga su propia marca. |
| `e35d5e2` | v214 | Alerta de flujo de caja: un cobro del mes siguiente dentro de la ventana de 7 días se compara contra el saldo proyectado (lo que arrastra este mes + asignado del mes siguiente). El 26/9, Spotify del 3/10 ya no avisa; el Gimnasio del 28/9 sí (faltan $16.410). |

### Textos, saludo y comparación mensual

| Commit | Caché | Qué cambia |
|---|---|---|
| `bf8ef28` | v215 | Voseo → tuteo en toda la app (Completa, Elige, Ingresa, Déjalo, Ingrésalo, Puedes, Siente, Sincroniza, Prueba, Revisa…); "Septiembre de 2026" en vez de "Septiembre De 2026" (`conMayuscula` en `fecha.js` reemplaza `text-transform: capitalize`, también en Movimientos y Laboratorio); plurales con 1 (nota, categoría, completada, pendiente, serie, sesión…); onboarding: "Análisis" → "Laboratorio" y párrafos en sans-serif. |
| `d5653f0` | v216 | Perfil con "Nombre" opcional: Hoy saluda "Buenas tardes, Ana" o, sin nombre, a secas (antes "Benjamín" fijo). Tarjeta de respaldo: "en este dispositivo". Con sesión de Supabase y una sync correcta hace menos de 7 días, Hoy no muestra el aviso de respaldo; Configuración > Cuenta dice "Sincronizado hace X" (`sync.js` guarda `ultimaSyncTs` y expone `getEstadoSincronizacion`). |
| `f94a360` | v217 | "Gastaste X% más/menos": el mes en curso se compara con el anterior hasta el mismo día (1–26 sept vs 1–26 ago; si el anterior es más corto, hasta su último día); un mes cerrado sigue completo contra completo. Con el respaldo: +3 % (contra agosto completo) → +14 %. El texto dice "a esta altura del mes pasado" y el gráfico "Gasto vs. mes anterior" usa el mismo corte. |

### Entreno y detalles

| Commit | Caché | Qué cambia |
|---|---|---|
| `77b982f` | v218 | Entreno sin rutinas: "Arma tu primera rutina" con selector GYM / Calistenia / HIIT, "Generar mi rutina" (generador existente) y "Crear rutina a mano" (formulario de la categoría; en HIIT, el de HIIT). |
| `2d59a3d` | v219 | El formulario de perfil y el de nivel ya no se abren solos al entrar a Entreno: una tarjeta "Completa tu perfil para calcular tu nivel e IMC" con "Completar" y/o "Definir mi nivel"; "Ahora no" la oculta hasta el día siguiente (localStorage con `diaKeyDe`). |
| `d69a511` | v220 | Onboarding paso 2 menciona la cuenta opcional para sincronizar entre dispositivos (ya no dice "No hay cuenta ni nube"). Gráficos de Chart.js con `borderRadius: 0` (Gasto vs. mes anterior, Tendencia de Entreno, donuts). |

## 26–27 sept 2026 — Sync vendorizada, tareas, demo y sesiones (v200–v204)

| Commit | Caché | Qué cambia |
|---|---|---|
| `6dfa105` | v200 | Supabase desde un bundle local (`js/vendor/supabase-js-2.116.0.js`, en `PRECACHE_URLS`) cargado con `import()` dinámico por `cargarSupabase()`: si esm.sh caía, la app no arrancaba. Sin el bundle, la sync queda desactivada y el resto sigue igual. |
| `e44a38d` | v201 | Crear o editar una tarea a "Hecho" pone `completedAt` y emite `tarea_completada` (cuenta en las rachas); volver a otro estado limpia `completedAt`. |
| `7c22874` | v202 | Reabrir una tarea emite `tarea_reabierta` y le quita la actividad a ese día en la racha global y la de Tareas (estado neto por tarea y día), igual que desmarcar un hábito. |
| `3cc5967` | v203 | Configuración > "Datos de prueba": `cargarDatosDemo()` (`js/core/datos-demo.js`) borra lo que haya en el dispositivo y siembra unos 60 días de datos en los 4 módulos con las funciones de `db.js` (todo con `logEvent`), previa confirmación. Bloqueado con sesión de Supabase iniciada. |
| `e1b9fb5` | v204 | Fix `checked` en sesiones: las series guardadas no llevaban `checked` y las sugerencias de nivel exigían `checked === true`, así que nunca sugerían subir. Las series nuevas llevan `checked: true`; una serie sin el campo (sesiones ya guardadas) cuenta como marcada. |

## 27 sept 2026 — Arrastre de saldos de sobres

**`CACHE_NAME` final: `vanguard-os-v210`.** Seis commits entre `88efe44` (v205)
y `1afc101` (v210), cada uno con su propio bump de caché. QA final con
Playwright en 375×812 y 1280×800, zona `America/Santiago` y reloj simulado,
importando por la UI (Configuración → Restaurar respaldo) el respaldo
`vanguard-backup-demo-3-meses-COMPLETO.json` (120 transacciones, 6 sobres,
6 recurrentes, 700 eventos) en un contexto limpio con el reloj en
2026-09-26 10:00.

### Decisiones

1. `saldo(mes) = arrastre(mes anterior) + asignado(mes) − gastado(mes) ± transferencias(mes)`, incluidos los saldos negativos (un sobregiro también arrastra).
2. Transferencias: desde R2, una transferencia mueve saldo solo en su mes y NO toca `assignedAmount`. Las anteriores quedan como estaban (su efecto ya está en `assignedAmount`) y borrarlas sigue revirtiendo como siempre. Sin migrar datos: las nuevas llevan `modelo: 'saldo'`.
3. El asignado se suma solo en meses con al menos una transacción (de cualquier tipo, en toda la app). *Ajuste R4b:* el mes actual siempre suma su asignado; la regla aplica solo a meses pasados.
4. Solo los sobres arrastran. "Disponible del mes", "Disponible por día" y la fila de Hoy siguen siendo del mes.
5. Sobres sin eventos (por defecto o anteriores al log): su `assignedAmount` actual rige en todos los meses.
6. "Eliminar sobre" pasa a "Archivar": se oculta de la UI, su historial y saldo quedan y se puede desarchivar.
7. Tarjeta: "$gastado de $disponible" y una línea aparte con el arrastre ("+$30.000 de agosto" / "−$20.000 de agosto").
8. Orden: primero R1 (ids de los sobres por defecto entre dispositivos), después el arrastre.

Además: el arrastre no usa el `createdAt` de los sobres (difiere entre
dispositivos); el punto de partida sale de las transacciones. *Ajuste R4b:* un
sobre existe desde lo que ocurra antes, su `sobre_creado` o su primer
movimiento propio (gasto o transferencia `saldo`); antes de su `sobre_creado`
usa el asignado de esa primera foto, así ningún gasto se ignora.

### Commits

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| R1 | — | — | Verificación sin código: los sobres por defecto usan ids fijos `env_1`…`env_6` en todos los dispositivos; solo su `createdAt` difiere. |
| R2 | `88efe44` | v205 | Transferencias nuevas (`modelo: 'saldo'`) mueven saldo solo en su mes; no tocan `assignedAmount` ni emiten `sobre_transferencia`. |
| Fix | `5150066` | v206 | Las transferencias entre sobres (nuevas, antiguas y `Assignment`) no son gasto: fuera de gastos del mes, disponible, tendencia, distribución e historial. Siguen en Movimientos y cuentan para la racha. |
| R3 | `64d66cd` | v207 | Archivar/desarchivar (`sobre_archivado` / `sobre_desarchivado` con replay). Bloqueado si hay recurrentes apuntando al sobre. Sección "Archivados (N)". |
| R4 | `72ec37f` | v208 | `calcularSaldosConArrastre` (pura) reemplaza a `saldosDeSobres`; la usan `getBudget().envelopes` (Gasto, tope de Transferencia) y `getProyeccionRecurrentes`. |
| R4b | `bd7ed9a` | v209 | El mes actual siempre suma su asignado; un sobre existe desde su creación o su primer movimiento, lo que sea antes. |
| R5 | `1afc101` | v210 | Tarjeta: saldo, "$gastado de $disponible", líneas de arrastre y de transferencias, mini-gráfico contra el disponible de cada mes, `aria-label`. |

### Verificación con el respaldo (vista del 26/9)

asignado / gastado / transferencias / arrastre / **saldo**

| Sobre | Julio | Agosto | Septiembre |
|---|---|---|---|
| Supermercado | 220.000 / 254.780 / 0 / 0 / **−34.780** | 240.000 / 274.470 / 0 / −34.780 / **−69.250** | 240.000 / 247.990 / 0 / −69.250 / **−77.240** |
| Servicios | 105.000 / 102.710 / 0 / 0 / **2.290** | 105.000 / 106.600 / 0 / 2.290 / **690** | 105.000 / 106.450 / 0 / 690 / **−760** |
| Transporte | 45.000 / 52.120 / 0 / 0 / **−7.120** | 45.000 / 57.410 / 0 / −7.120 / **−19.530** | 45.000 / 38.450 / 0 / −19.530 / **−12.980** |
| Arriendo | 380.000 / 380.000 / 0 / 0 / **0** | 380.000 / 380.000 / 0 / 0 / **0** | 380.000 / 380.000 / 0 / 0 / **0** |
| Salidas y Ocio | 80.000 / 86.000 / 0 / 0 / **−6.000** | 60.000 / 77.700 / 0 / −6.000 / **−23.700** | 60.000 / 162.500 / 0 / −23.700 / **−126.200** |
| Suscripciones | 40.000 / 41.470 / 0 / 0 / **−1.470** | 40.000 / 41.470 / 0 / −1.470 / **−2.940** | 40.000 / 28.480 / 0 / −2.940 / **8.580** |

Revisado a mano:
- **Supermercado:** `sobre_actualizado` del 1/7 con 220.000; la transferencia
  antigua del 25/8 (+20.000 desde Salidas y Ocio) lo deja en 240.000 desde
  agosto. Julio 220.000 − 254.780 = −34.780; agosto −34.780 + 240.000 − 274.470
  = −69.250; septiembre −69.250 + 240.000 − 247.990 = −77.240.
- **Salidas y Ocio:** foto del 1/7 con 80.000; la misma transferencia antigua lo
  deja en 60.000 desde agosto. Julio 80.000 − 86.000 = −6.000; agosto −6.000 +
  60.000 − 77.700 = −23.700; septiembre −23.700 + 60.000 − 162.500 = −126.200.
  La transferencia antigua actúa en el asignado, como antes, y no se vuelve a
  sumar en la columna de transferencias.

Resto del QA:
- **1/10 08:00 sin registrar nada:** cada sobre muestra arrastre de septiembre +
  asignado de octubre (Supermercado −77.240 + 240.000 = 162.760). Se generó
  una sola vez la recurrente vencida (Gimnasio del 28/9, $24.990), que pasa a
  septiembre: Suscripciones cierra septiembre en −16.410 y octubre arranca en
  23.590. Tres recargas no la duplican.
- **Tarjetas (375×812):** sobregiro "Supermercado $162.760 · $0 de $162.760 ·
  −$77.240 de septiembre" (línea en rojo). Ningún sobre del respaldo cierra
  septiembre con sobrante; el sobrante se verificó el 26/9 con Servicios
  "+$690 de agosto". Sin cortes a 375 px, sin border-radius ni sombras.
- **Consumidores:** Gasto "Quedan $157.760 en este sobre" (Supermercado,
  $5.000); tope de Transferencia "Max: $380.000" (Arriendo); alerta de Hoy el
  26/9 "Gimnasio ($24.990) excederá el saldo de Suscripciones. Faltan $16.410"
  (saldo con arrastre 8.580; sin arrastre habría dicho $13.470).
- **Archivar:** Transporte archivado el 1/10 queda congelado en 32.020 en
  noviembre (asignado 0); al desarchivar el 2/11 vuelve a sumar (77.020).
- **Sync:** un segundo contexto (instalado el 20/10, IndexedDB propio) aplica
  los eventos con `applyRemoteEvent`: mismos saldos de julio a noviembre y 128
  transacciones en ambos.
- **Replay** desde `events`: stores y saldos idénticos. **Offline** tras
  recarga (service worker activo): Finanzas carga con las 6 tarjetas.
- **Rendimiento con el respaldo:** `calcularSaldosConArrastre` 0,14 ms;
  `getBudget` completo 13 ms. Con 24 meses sintéticos (1.920 transacciones,
  3.300 eventos) unos 2–3 ms.
- ESLint `no-undef` limpio (ignorando `js/vendor/`); consola sin errores en
  Hoy, Finanzas y Laboratorio.

### Notas

- **Transferencias antiguas vs nuevas.** Las antiguas (sin `modelo`)
  modificaron `assignedAmount` con `sobre_transferencia`; en el arrastre cuentan
  como un cambio del asignado desde el mes en que ocurrieron, y borrarlas lo
  revierte desde el mes del borrado. Las nuevas (`modelo: 'saldo'`) solo suman
  o restan en su mes y se ven en la tarjeta como "±$X transferido".
- **Sobres por defecto sin eventos.** Si no tienen ningún evento, su
  `assignedAmount` actual rige en todos los meses. Si solo tienen
  `sobre_actualizado` (sin `sobre_creado`), el valor anterior al primer evento
  se deduce de ese evento. Si el log leído no llega al valor guardado (caché de
  eventos de hasta 5 s), la diferencia se aplica en el mes actual.
- **El mes actual siempre suma su asignado**, aunque todavía no tenga
  movimientos. Un mes que termina sin ninguna transacción, visto después como
  mes pasado, solo arrastra.
- Un sobre con `disponible` negativo muestra "$0 de $-66.200" (formato actual
  de `formatCurrency` para negativos).
- Tras restaurar este respaldo vuelve a aparecer el onboarding inicial: el
  respaldo no trae la marca de completado.

## 26 sept 2026 — Vida extra, fechas locales, Finanzas y respaldos

**`CACHE_NAME` final: `vanguard-os-v199`.** Catorce commits entre `da71068`
(v186) y el fix de `desde` (v199), cada uno con su propio bump de caché. QA
final con Playwright en 375×812 y 1280×800, zona `America/Santiago` y reloj
simulado.

> **Corregido (encontrado en el QA final):** `78fe15a` quitó la variable
> `desde` de `detectarSugerencias` (`js/core/sugerencias-nivel.js`) pero
> `evaluarPorRatio` todavía la recibía. Si el ejercicio más alto de una rama en
> las últimas 4 semanas era uno de los 4 básicos de gym con criterio `ratio`
> (sentadilla, peso muerto, press banca, press militar), `detectarSugerencias`
> lanzaba `ReferenceError: desde is not defined`: en Hoy la tarjeta de avances
> no aparecía y en Entreno el banner de sugerencias fallaba. Corregido en el
> commit "Sugerencias de nivel: ventana de 4 semanas en dias tambien para el
> criterio ratio" (v199), commit siguiente a `b087a8e`: `evaluarPorRatio`
> recibe `hoyClave` y filtra por días de calendario como el resto de la
> ventana. Un barrido con ESLint (`no-undef`) sobre todo `js/` no encontró
> otros casos (solo falsos positivos del envoltorio UMD de
> `js/vendor/chart.js`).

### Vida extra de racha

Proteger la racha global un día sin actividad. Todo se deriva del log de
eventos; no se guarda ningún estado.

Decisiones:
- Solo la racha global (no días perfectos, rachas por hábito, ritual, Entreno ni Tareas).
- 1 vida por cada 7 días activos **reales** seguidos; máximo 2. Un día protegido mantiene la racha sin sumar y reinicia la cuenta de 7.
- Las vidas se consumen solas al terminar un día sin actividad (con 2 vidas y 2 días vacíos se usan ambas). Hoy sin actividad está pendiente y nunca consume.
- La insignia `racha_7` significa "alguna vez llegó a 7" y no se vuelve a bloquear.
- Un hábito cuenta en la **fecha marcada**, no en el momento en que se marcó; desmarcar quita el día solo si no quedó otra actividad ese día.

| Fase | Commit | Caché | Qué cambia |
|---|---|---|---|
| 1 | `78fe15a` | v189 | Cambio de horario en todas las rachas (ver "Fechas locales"). |
| 2 | `c69f8a2` | v190 | `actividadGlobalPorDia`: los hábitos cuentan en `payload.fecha` con estado neto por (hábito, fecha); el resto por el día de su `ts`. |
| 3 | `51e01d3` | v197 | `calcularRachaConVidas` (función pura) → `getRachaGlobal` devuelve además `vidas`, `diasProtegidos`, `maxHistorica`, `ultimaVidaUsada`. `racha_7` por `maxHistorica`. `leerEventosCompartido`: abrir Hábitos pasa de 2 lecturas de `events` a 1. |
| 4 | `a3a941f` | v198 | UI: chip de Hoy "🔥 N · [escudo] V" (atenuado con 0), escudos y texto de vidas bajo el reactor de Hábitos, tira de los últimos 7 días (activo / protegido / vacío / hoy), aviso "Usaste una vida extra el martes 8 — tu racha sigue en N" en la tarjeta contextual (Ritual > respaldo > vida usada > avances > Hoy toca; "Entendido" lo oculta para ese día) y toast "Ganaste una vida extra" una sola vez. `getRachaGlobal` suma `faltanParaVida`. |

Nota: con estas reglas, tras usar una vida hacen falta 7 días reales nuevos para
ganar la siguiente, así que la secuencia 7 activos → 1 vacío → 7 activos deja
**1** vida (no 2).

### Fechas locales y cambio de horario

`78fe15a` (v189). Las rachas restaban 86 400 000 ms entre medianoches locales;
con el cambio de horario hay días de 23 o 25 h (en Chile el 6/9 no tiene 00:00)
y la racha se cortaba sola: 3–8 sept daba 2 en vez de 6, 2–6 abr 2027 daba 3 en
vez de 5. Toda la aritmética de días pasa a claves `YYYY-MM-DD`.

Helpers en `js/utils/fecha.js`:
- `diasEntre` compara con `Date.UTC` (sin huso horario).
- `sumarDias(clave, n)`: avanza por calendario.
- `claveDiaDe(valor)`: clave del día local de una clave o de un ISO/timestamp (`new Date('YYYY-MM-DD')` es UTC y en Chile cae el día anterior).
- `fechaLocalDe(valor)` y `compararFechas(a, b)` (agregados en el fix A de Finanzas).

Lugares corregidos: `calcularRachaDesdeDias`, la copia del bucle en
`getRachaGlobal` y su `last7`, `calcularRachaDiasAplicables`,
`generarDiasAplicables`, `getRachaHabito`, `getRachaHabitosGlobal`,
`getRachaRitual`, `getRachaHiit`, `weekIdDe` (hábitos semanales) y
`rachaSemanas` de Entreno (las semanas empiezan el lunes 00:00 local; antes el
domingo 21:00 en Chile), antigüedad del dinero, deload, `getTendenciaSemanal`,
`getTendenciaTareasCompletadas`, atrasadas y banner de instalar (`dashboard.js`),
días desde el último respaldo (`backup.js`), días restantes de una meta
(`goal-card.js`), días sin entrenar una rama (`generador-rutinas.js:317`) y la
ventana de 4 semanas de `sugerencias-nivel.js`. Queda a propósito
`generador-rutinas.js:590` (ordena por recencia exacta, no cuenta días).

### Finanzas

| Fix | Commit | Caché | Qué cambia |
|---|---|---|---|
| A | `8f35248` | v191 | Claves `YYYY-MM-DD` leídas como día local: fecha visible de los movimientos (un gasto del 26/9 se veía "25 sept"), rango del desglose del Laboratorio (incluía el día anterior y excluía el último), orden de movimientos con claves e ISO mezclados, backfill de eventos. |
| B | `68cf377` | v192 | Recurrentes guardan `tx.date` y `lastProcessed` como clave de día; `lastProcessed` se lee con `claveDiaDe` (acepta el ISO anterior, sin duplicar). Todos los filtros por mes/rango/día sobre `tx.date` usan el día local (una transferencia ISO de la noche caía en el mes siguiente). Sin migrar datos. |
| C | `06bea2e` | v193 | La proyección de recurrentes a 7 días nunca funcionaba (`r.nextDate` inexistente, filtro por `r.type`, `r.name`, `env.spent`). `proximaFechaRecurrente` compartida con el procesamiento; saldo por `saldosDeSobres`; en Hoy la proyección se pide después de `getBudget`. |
| D | `b99b847` | v194 | Id determinista `rec-${recurrente}-${día}` + `recurrenteId` para las transacciones recurrentes: dos dispositivos que procesan la misma recurrencia sin sincronizar quedan con una sola (el replay y el espejo ya hacían upsert por id). |
| E | `2d5be2a` | v195 | Alerta de flujo de caja en MK III: tokens (`--state-high` con `color-mix`), título "Cobros sin saldo · 7 días", fecha del cobro en cada línea, máximo 3 líneas, toda la tarjeta lleva a Finanzas. |

### Respaldos

`d28f840` (v196, fix F): `backup.js` ya no importa `idb.js`; usa
`db.exportarDatosRespaldo` / `restaurarDatosRespaldo` / `marcarRespaldoExportado`
/ `getUltimoRespaldoTs`. El respaldo suma **ritual, planificador, notas y
notas_categorias**, que faltaban desde la v4 de la base: los respaldos
anteriores no incluyen el Ritual, la Semana ni las Anotaciones — **conviene
exportar un respaldo nuevo**. El formato no cambia (`version: 2`): un respaldo
anterior se importa igual y la versión anterior ignora las claves nuevas.

`js/core/sync.js` queda como **excepción documentada** a "solo `db.js` importa
`idb.js"` (es el motor de replay; comentario al inicio del archivo, en `51e01d3`).

### Otros

| Commit | Caché | Qué cambia |
|---|---|---|
| `da71068` | v186 | Service worker: tras una actualización, la pestaña recarga una vez en la próxima navegación segura (no con un modal abierto ni en una sesión de entreno) en vez de mezclar módulos de dos versiones; aviso "Actualización lista", máximo 1 recarga por activación. |
| `8607344` | v188 | Hoy: los ítems del Planificador (Semana) con fecha pasada cuentan como atrasados, con etiqueta "Semana", checkbox y "Mover a hoy" (`moverTareaPlan`, evento `tarea_reprogramada`). |
| `3e6066b` | v187 | Entreno MK III: `.badge` y los contenedores de Progreso sin `border-radius`. |

## 26 sept 2026 — Revisión del catálogo

**`CACHE_NAME` final: `vanguard-os-v184`.** Ocho commits entre `b128826` (v177)
y `b8db473` (v184): los pasos 1–7 de la revisión más un fix de racha detectado en
el QA final (paso 8). El catálogo pasa de 176 a **182 ejercicios**. Medición
común a todas las cifras: 60 planes por nivel (30 gym + 30 calistenia, 3 y 5 días
alternados, 45 min, equipo completo, sin historial), 1140 ejercicios elegidos.

### Commits

| Paso | Commit | Caché | Qué cambia |
|---|---|---|---|
| 1 | `b128826` | v177 | Prerrequisitos por nivel y alternativos (OR) en `estaDesbloqueado` (`prerequisitosAlternativos`). |
| 2 | `c197d69` | v178 | Datos P0: acceso cruzado gym/calistenia, dominadas con alternativos (asistida con banda / jalón al pecho) y frontera unificada: `calcularNivelPorRama` usa la misma `estaDesbloqueado` (sin regla de nivel, `ratioEstricto`), corrigiendo que un principiante viera tracción vertical intermedia. |
| 3 | `4ac9b37` | v179 | 5 ejercicios nuevos (ver abajo). Solo datos. |
| 4 | `5fa46f2` | v180 | Generador: no dejar espacios vacíos en silencio. Si se agota el nivel de la rama, se completa con el nivel inferior más cercano (`relajado`, motivo `nivel-inferior`) sin repetir ejercicios de la sesión; si aun así no hay, el espacio queda vacío con aviso. Cada fase corre en dos pasadas (nivel de la rama, luego relleno hacia abajo empezando por el patrón con menos ejercicios hoy). Un espacio extra nunca sube de nivel. |
| 5 | `2d9fd9e` | v181 | Push Press (gym, avanzado, requiere Press Militar). Solo datos. |
| 6 | `bd2e78a` | v182 | UI: un solo bloque de aviso por plan con los patrones únicos y "Agregar equipo →" (abre el modal del generador); cada día solo lleva "n/cupo" si le faltan ejercicios. `generarPlan` devuelve además `faltantes`, `avisosVolumen` y `cupo` por día (la selección no cambia). El aviso de volumen semanal queda como nota gris aparte. |
| 7 | `201b1f7` | v183 | UI: el día 7 sin ejercicios por diseño se muestra como **Descanso activo** (tarjeta con 3 sugerencias fijas, sin "0/5" ni aviso). Se guarda como rutina vacía; al abrirlo muestra la tarjeta con "Marcar como hecho", que emite `descanso_activo_completado` (`fecha` por `diaKeyDe`) sin crear sesión. En `sync.js` es un evento de solo auditoría. |
| 8 | `b8db473` | v184 | Fix: `descanso_activo_completado` cuenta para la racha global (`getRachaGlobal`, chip de racha y `last7`) pero no como sesión: `getRachaGeneral`, insignias de sesiones, volumen y mapa muscular solo leen `sesion_registrada` y no cambian. |

### Ejercicios agregados (176 → 182)

- **Calistenia:** Remo Invertido con Pies Elevados (intermedio, requiere Remo Invertido), Remo Invertido a Una Mano (avanzado, requiere el anterior), Flexión en Pica con Manos Elevadas (principiante), Flexión de Pino contra la Pared / HSPU (avanzado, requiere Handstand contra Pared). Pike Push-up pasa a requerir la flexión en pica con manos elevadas.
- **Gym:** Press de Hombros en Máquina (principiante, empuje vertical) y Push Press (avanzado, requiere Press Militar).

### % de ejercicios elegidos por debajo del nivel de su rama

| Momento | Intermedio | Avanzado |
|---|---|---|
| Informe de fase 0 (antes) | 28 % (315/1140) | 32 % (360/1140) |
| Paso 1 | 9 % (105/1140) | 14 % (165/1140) |
| Paso 2 | 7 % (75/1140) | 14 % (165/1140) |
| Paso 3 | 0 % (pero solo 1110 ejercicios: tracción vertical de calistenia daba 30 en vez de 60) | 3,9 % |
| Paso 4 | 2,6 % (30/1140, 1140 ejercicios) | 3,9 % |
| Paso 5 (final) | **2,6 %** (30/1140) | **0 %** (0/1140) |

En ningún momento hubo ejercicios **por encima** del nivel de la rama, y
un principiante ve 0 de 1140 ejercicios intermedios. Tracción vertical de
calistenia da 60 en intermedio y avanzado. El 2,6 % restante de intermedio es
tracción vertical de calistenia bajando al nivel principiante para completar el
cupo.

### Cobertura final del catálogo (gym + calistenia, ejercicios por patrón y nivel)

Cuenta también los ejercicios con acceso cruzado (`tambienEn`).

| Patrón | Gym P/I/A/Todos | Calistenia P/I/A/Todos |
|---|---|---|
| Rodilla | 3/3/1/7 | 4/5/2/2 |
| Cadera | 1/3/3/9 | 2/1/1/1 |
| Empuje horizontal | 7/6/3/15 | 7/5/12/1 |
| Empuje vertical | 1/2/1/1 | 1/5/1/0 |
| Tracción horizontal | 3/5/1/11 | 2/1/1/1 |
| Tracción vertical | 2/1/2/6 | 6/4/8/0 |
| Core | 1/6/1/2 | 6/2/1/0 |
| Locomoción | — | 1/1/0/0 |

### Espacios vacíos (3 niveles × gym/calistenia × 1–7 días × 5 juegos de equipo, 2 planes c/u, 5 ejercicios por sesión)

- 1620 días evaluados (sin contar el día 7): **1170 espacios vacíos en 676 días** (antes del paso 4: 1502 en 676). **0 días sin ningún ejercicio**; el único día vacío por diseño es el Día 7 Movilidad, ahora "Descanso activo".
- Los vacíos vienen de equipo restringido (gym sin equipo, solo barra de dominadas, o calistenia Pull con mancuernas y banco): no existe otro ejercicio disponible para ese patrón. Todos llevan aviso visible ("no llenó todos sus espacios…", agrupado en el bloque del plan) e indicador "n/5" en el día.

### QA final (Playwright 375×812 y 1280×800, IndexedDB limpio, consola sin errores)

- **Árbol por la interfaz:** Dominadas con alternativos (asistida con banda, jalón al pecho); Remo Invertido → con Pies Elevados → a Una Mano; Flexión en Pica con Manos Elevadas → Pike Push-up → Handstand contra Pared → HSPU; Press Militar → Push Press (junto a Press Arnold).
- **Equipo limitado (gym sin equipo, 5 días):** 1 bloque de aviso, 0 avisos por día, indicadores 3/5, 2/5, 3/5; "Agregar equipo" abre el modal y Atrás lo cierra. Con equipo completo no hay bloque.
- **Descanso activo (7 días, equipo completo):** tarjeta en el preview y al abrirlo como sesión (sin cronómetro); "Marcar como hecho" registra `descanso_activo_completado`, 0 sesiones creadas. Racha global 0 → 1 (chip 🔥 1 en Hoy); racha de Entreno, insignias, volumen y mapa muscular sin cambios.
- **Replay:** borrar `rutinas`, `sesiones` y los singletons de perfil/generador/nivel y reaplicar los 15 eventos con `applyRemoteEvent` deja el mismo estado.
- **Offline:** con el servidor detenido, recarga y generación de un plan de 7 días con Descanso activo funcionan desde el service worker (`vanguard-os-v184` incluye `descanso-activo.js`).
- **Nota de medición:** las funciones memoizadas de `db.js` (`getRachaGlobal`…) se invalidan con `logEvent` dentro de la misma instancia del módulo; al consultarlas desde una instancia importada aparte hay que recargar para ver el valor nuevo. No es un bug de la app.

## 25 sept 2026 — Sistema de nivel de Entreno v2

**`CACHE_NAME` final: `vanguard-os-v176`** (el commit de documentación no toca
código y lo deja igual). Siete commits del sistema de nivel entre `4134499`
(v170) y `b74fc99` (v176), más los dos fixes de modales de Entreno de esa misma
jornada (v167 y v168, ver "Modales de Entreno"). Decisiones de partida (acordadas
al cerrar la auditoría): **extender** lo que ya existía (`nivelEntrenamiento`,
`overridesPorRama`, `calcularNivelPorRama`, `detectarSugerenciaPendiente`) en vez
de crear un evento `nivel_patron_ajustado`; mantener los umbrales de tiempo del
onboarding (< 1 año / 1–3 años / > 3 años → principiante / intermedio /
avanzado); **mantener el ratio multiarticular actual** y los nombres de patrón del
catálogo (`empuje-horizontal`, `traccion-vertical`…), no los del plan.

### Generador

- **`4134499` (v170) — la degradación de nivel va solo hacia abajo.**
  `candidatosPara()` prueba el nivel de la rama y luego los inferiores (de mayor
  a menor; `'todos'` vale en cada intento). Solo si no hay ningún candidato ahí
  mira el nivel superior más cercano, marcado `relajado: true` con motivo
  `'sin-candidatos-inferiores'` y un `console.warn`. Antes también probaba los
  niveles superiores por cercanía. Splits, ratio y `calcularNivelPorRama` intactos.
- **`afaa60e` (v173) — `motivoPara` distingue los dos casos.** "Bajó de nivel: …"
  (motivo `nivel-inferior`) frente a "Subió de nivel por falta de ejercicios: …"
  (motivo `sin-candidatos-inferiores`).

**Proporción multiarticular (sin cambios, se mantiene la actual):** ≤ 2 días 80 %,
3–4 días 65 %, 5–6 días 55 %, 7 días 50 %; los multiarticulares van primero en la
sesión. Splits: 1 día rota Upper/Lower, 2 Upper/Lower, 3 Push/Pull/Legs, 4
Upper A/Lower A/Upper B/Lower B, 5 PPL + Upper + Lower, 6 PPL ×2, 7 PPL ×2 + día
liviano. Sin Full Body.

### Sugerencias de avance

- **`5411165` (v171) — sugerencias por `criterioAvance` en las 8 ramas.** Nueva
  `detectarSugerencias()`: por rama toma el ejercicio de mayor nivel entrenado en
  las últimas 4 semanas (match por `ejercicioId`, con fallback por nombre, igual
  que el mapa muscular) y evalúa su `criterioAvance`: reps/segundos en al menos 2
  de las últimas 3 sesiones con ≥ `series` series limpias; ratio con los Estándares
  de Fuerza. Sugiere el nivel siguiente con `ejercicioSiguiente` = hijo por
  `progresionDe` (misma categoría y equipo disponible primero). Se eliminan los
  umbrales fijos (flexiones 15/25, dominadas 5/10…). `detectarSugerenciaPendiente()`
  devuelve el primero.
- **`0ce2743` (v172) — "Ahora no" caduca y el ratio usa datos recientes.**
  `sugerenciasDescartadas[rama]` pasa a `{ nivel, fecha }` (`diaKeyDe`); el evento
  `sugerencia_nivel_descartada` suma `fecha` (case de `sync.js` actualizado). Un
  "Ahora no" oculta ese nivel (y menores) 7 días; una entrada vieja sin fecha cuenta
  como vencida. El criterio `ratio` usa el mejor 1RM estimado de las series
  limpias de las últimas 4 semanas, no el PR histórico.
- **`3afeb37` (v175) — coherencia con el árbol.** Las sugerencias por
  reps/segundos usan la misma definición de "serie limpia" que el árbol de
  progresión (`contarSeriesLimpias`: tipo normal, reps suficientes, RPE ≤ 8 si hay
  RPE) más `checked`; el criterio `ratio` no cambió.

### Tarjetas, desbloqueo y garantía

- **`afaa60e` (v173) — tarjetas MK III + aviso en Hoy.** En Entreno, una tarjeta por
  rama sugerida (chaflán con `clip-path` sobre `.card-hero`, sin radios ni
  sombras, acento cian; máx. 3 visibles y "Ver N más"): "Rama: ejercicio →
  siguiente", evidencia en una línea, "Subir de nivel" y "Ahora no". En Hoy, la
  tarjeta contextual suma "N avances listos en Entreno" con prioridad Ritual >
  respaldo > avances > Hoy toca; el módulo de sugerencias se importa bajo demanda
  (`Router.importar`) para no cargar el catálogo en el arranque.
- **`428bca4` (v174) — "Subir de nivel" desbloquea el ejercicio siguiente.**
  `confirmarSugerenciaNivel` guarda el siguiente en `desbloqueadosPorRama` (dentro
  de `nivelEntrenamiento`) y `ejercicioSiguienteId` en el payload de
  `sugerencia_nivel_confirmada` (replay de `sync.js` actualizado).
  `estaDesbloqueado()` acepta un set de ids desbloqueados a mano y el generador los
  deja pasar por prerrequisitos y los prioriza.
- **`3afeb37` (v175)** — la vista del árbol recibe `desbloqueadosManuales` y los
  muestra desbloqueados; el desbloqueado tiene 1 espacio garantizado por sesión de
  su rama.
- **`b74fc99` (v176) — garantía híbrida.** Cada desbloqueo lleva su fecha
  (`{ id, fecha }`, también en el payload y en el replay). Durante 28 días desde esa
  fecha, 1 espacio garantizado por sesión de su rama; pasado el plazo sigue
  desbloqueado pero compite con el orden normal. Corrección incluida: los
  desbloqueados se **suman** al pool de cualquier intento en vez de pasar el filtro
  de nivel (así tapaban a los candidatos de niveles inferiores y la garantía
  vencida no rotaba). `diasEntre` pasa a `utils/fecha.js`.

### Modales de Entreno

- **`c931176` (v167) — modal de perfil.** Ya no tapa la navegación (el overlay deja
  libre la barra inferior y el riel), y "Ahora no" oculta la apertura automática el
  resto del día (`diaKeyDe`).
- **`4cdce7a` (v168) — modal de nivel.** Mismo patrón; el modal no tenía ningún
  botón de salida y ahora lo tiene ("Ahora no" en el paso 1).

### QA (Playwright; 375×812 y 1280×800, IndexedDB limpio)

1. **Onboarding de nivel por la interfaz** (perfil → 3 pasos): con "< 1 año" todas
   las ramas salen principiante (excepto `empuje-vertical`, intermedio: el
   catálogo no tiene ejercicios principiante en ese patrón); con "1–3 años" todas
   intermedio; con "> 3 años" todas avanzado. Ambos modales dejan la navegación
   tocable en cada paso.
2. **Generador:** 384 planes (3 niveles × gym/calistenia × 1/3/5/7 días × equipo
   completo/sin equipo), 5.560 ejercicios: **0 sobre el nivel de su rama**, 0 días
   Full Body, y con 1 día/semana la rotación alterna Upper/Lower en gym y calistenia.
3. **Sugerencias:** una rama por reps (flexiones), una por segundos (dead hang), una
   por ratio (sentadilla) y una cuarta (plancha); series a RPE 9 no cuentan, series
   sin marcar no cuentan y un récord de ratio de hace 40 días no cuenta.
4. **Tarjetas:** 3 visibles + "Ver 1 más"; "Subir de nivel" desbloquea el siguiente y
   el árbol lo muestra desbloqueado; "Ahora no" la oculta 7 días (a +6 sigue oculta,
   a +7 vuelve).
5. **Garantía del desbloqueado** (tracción vertical, calistenia, 3 días, 30 planes):
   30/30 sesiones el día 0 y el día 27; 9/30 el día 28 y 15/30 el día 29 (rota con
   las demás variantes).
6. **Hoy:** con hora simulada a las 09:00 el orden fue ritual → respaldo → avances
   ("3 avances listos en Entreno") → Hoy toca.
7. **Replay:** borrar el singleton y reproducir sus eventos
   (`nivel_entrenamiento_actualizado`, `sugerencia_nivel_confirmada`,
   `sugerencia_nivel_descartada`) da el mismo `nivelEntrenamiento` (overrides,
   descartes con fecha, desbloqueados con fecha).
8. **Offline:** con el servidor apagado y el service worker instalado, Entreno carga
   con sus tarjetas, las 5 pestañas navegan y el generador produce planes. Consola
   limpia en toda la tanda.

### Observaciones (no bloqueantes; no se cambió código)

- Hay días de plan sin ejercicios por diseño: GYM sin equipo declarado deja vacío el
  día Push (no hay ejercicios de pecho de peso corporal en esa categoría) y el "Día
  7 · Movilidad" no lista ejercicios.
- La garantía de 28 días ocupa el único espacio de las ramas que tienen 1 espacio
  por sesión (en calistenia, tracción vertical): ahí las otras variantes no
  aparecen hasta que vence.
- La sugerencia de ratio exige series `checked`, más estricta que el PR histórico
  que se usaba antes.
- El selector de categoría de la vista de progreso (`entreno-progreso.js`) sigue
  con `border-radius: 10px`, anterior a esta tanda y fuera de su alcance.
- La sincronización con Supabase no se pudo ejercitar con una sesión real; solo se
  verificó el replay local de los eventos (`applyRemoteEvent`).

---

## 25 sept 2026 — Nueva distribución: 5 pestañas, menú ☰, Hoy reordenado y riel responsive

**`CACHE_NAME`: `vanguard-os-v158` → `vanguard-os-v166`** (una versión por
commit; el commit de documentación no toca código y deja `v166`). Nueve
commits entre `5ecda90` y `5b70f9e`, agrupados por tema (el número de versión
indica el orden cronológico).

### Navegación

- **`dc5e2a4` (v158) — 5 pestañas y panel ☰.** La barra inferior pasa a
  Hoy · Tareas · Hábitos · Entreno · Finanzas; "Más" desaparece (y con él
  `views/mas.js`). Un encabezado global con botón ☰ abre un panel lateral
  (`.modal-overlay` + `open`, así `history.js` lo engancha solo al botón
  Atrás) con Anotaciones, Laboratorio y Configuración. Rutas antiguas:
  `#mas` → `#dashboard` + panel abierto, `#planificador` →
  `#tareas/semana`, `#ritual` → `#dashboard`. El router entiende
  subrutas (`#tareas/semana`) y las redirecciones se reescriben con
  `replaceState` para que Atrás no vuelva a la ruta vieja.
- **`13a544c` (v159) — Tareas: sub-pestañas Lista · Semana.** Semana monta el
  Planificador sin reescribirlo (solo repinta `#plan-host` si existe); la
  sub-vista sale del hash, así que recargar en `#tareas/semana` cae en
  Semana. Cambiar de sub-pestaña suelta los listeners de sync de la
  saliente (verificado: el contador de listeners `budget-updated` se queda
  en 1). El router avisa a la vista con `onSubrouteChange` cuando solo
  cambia la subruta.
- **`5c4626e` (v161) — Ritual en el panel ☰ + bug del historial.** Tras las
  12:00 (o tras "Después") el Ritual quedaba sin acceso. Ahora es la primera
  opción del panel (`#dashboard/ritual`, la misma ruta que la tarjeta
  contextual) y muestra "Hecho" si el ritual de hoy está completo
  (`db.getProgresoRitual`, sin flag aparte). **Bug corregido:** los links del
  panel cerraban con `history.back()` y el cambio de hash competía con ese
  retroceso — a veces la vista no cambiaba (con Ritual, siempre). Ahora se
  cierra primero y se navega al `popstate`; de paso desaparece la entrada
  fantasma que quedaba en el historial.

### Hoy

- **`42e0eac` (v160) — Hoy reordenado.** Encabezado compacto (saludo, fecha,
  chip de racha); una sola tarjeta contextual con prioridad Ritual pendiente
  (antes de las 12:00) > respaldo > "Hoy toca", y "Después" la oculta hasta
  mañana (fecha en `localStorage` vía `diaKeyDe`); accesos rápidos, agenda,
  resúmenes, Laboratorio y última nota. El Laboratorio pasa a **carga
  diferida** con `IntersectionObserver` (antes se cargaba directo): Chart.js
  no se descarga hasta llegar con el scroll. El anillo de racha grande y las
  insignias se mudan a la cabecera de Hábitos
  (`components/racha-reactor.js`, mismos valores desde el log de eventos).
  `calcularHoyToca` sale a `utils/hoyToca.js` para compartirlo con Hoy sin
  arrastrar el grafo de Entreno. Ritual se abre en `#dashboard/ritual` (`#ritual`
  a secas sigue siendo solo una redirección).
- **`48e4a75` (v162) — Agenda de hoy + accesos rápidos.** Lista las tareas con
  fecha de hoy (Tareas y Semana) y los hábitos que tocan hoy y no están
  cumplidos, con checkbox en línea que usa las mismas funciones de `db.js`
  que el resto de la app (`updateTaskStatus`, `toggleTareaPlan`,
  `toggleMarcaHabito`), cada una con su `logEvent`; repinta sin animación y
  conserva el scroll. Vacío: "Nada pendiente hoy". Accesos rápidos: Gasto,
  Entrenar, Tarea (abre el `task-form` existente) y Nota (abre Anotaciones
  en la categoría de la última nota; `anotaciones.js` exporta
  `abrirCategoria`).
- **`29770b5` (v163) — Hábitos numéricos en la agenda.** Antes un toque
  registraba la meta completa. Ahora abre un modal (`.modal-overlay` +
  `open`) que **suma** la cantidad ingresada a lo ya registrado hoy y guarda
  el total con `registrarProgresoHabito`: si llega a la meta sale de la
  agenda, si no queda con el avance (ej. 5/20 min). Decisión: el evento
  guarda el **total del día**, no el incremento — es el valor absoluto que ya
  usa `registrarProgresoHabito` y es más seguro para sync.

### Layout responsive y riel

- **`e4194ab` (v164) — Tablet y PC.** 768–1023 px: riel de 72 px solo con
  íconos (el texto queda para lectores de pantalla) y Hoy en 2 columnas.
  ≥1024 px: riel de 220 px con texto, contenido centrado de hasta 1200 px
  (reemplaza los máximos de 960/1120) y Hoy en grilla de 12 columnas (agenda
  7 / resúmenes 5). <768 px sin cambios. Foco de teclado visible en el riel.
- **`4dbf5d9` (v165) — Riel MK III.** El riel salía flotante y con esquinas
  redondeadas (heredaba `left/right/bottom` de 16 px y el radio de 26 px de la
  barra móvil). Ahora va pegado al borde izquierdo a toda la altura, con
  borde de 1 px (`--line`), **chaflán con `clip-path`** en dos esquinas
  opuestas (`--chaflan`, igual que las tarjetas MK III), sin radios ni
  sombras (tampoco en los ítems). El ítem activo usa el acento del módulo
  (dorado de marca en Hoy, cian Entreno, ámbar Finanzas, violeta Tareas) con
  fondo tenue y filo de 2 px a la izquierda.
- **`5b70f9e` (v166) — Reversión del token rosa.** `4dbf5d9` había agregado
  `--pk` (rosa) para Hábitos en el riel; Hábitos en MK III es violeta.
  Se elimina el token de `variables.css` y el ítem activo de Hábitos usa el
  `--vi` existente (verificado a 1024 px: mismo color que el acento de la
  vista). Se conservan el filo de 2 px y el borde con `--line`.

### QA (Playwright, 375×812 y 1280×800)

Recorrido completo sin cambios de código: las 5 pestañas (textos sin cortar),
el panel ☰ (abre con el botón, cierra con el fondo y con Atrás; cada ítem
navega y lo cierra), las tres rutas antiguas (ninguna deja pantalla vacía),
Atrás sobre el panel y sobre un modal (cierra el modal sin salir de Hoy),
marcar una tarea y un hábito desde la agenda (aparecen como hechos en
Tareas y en Hábitos), grilla de Hoy sin scroll horizontal y **modo offline**
(con el servidor local apagado y el service worker ya instalado — 96
entradas en `vanguard-os-v166` — Hoy carga y las 5 pestañas, Laboratorio y
`#planificador` navegan). Consola limpia, sin respuestas 4xx.

### Notas

- `core/sync.js`, `core/supabase-client.js`, `core/db.js` y `core/history.js`
  no cambiaron en ninguno de los nueve commits; la sincronización con
  Supabase no se pudo ejercitar en QA (no hay sesión de prueba), solo se
  comprobó que el código de sync no se tocó.
- Archivos nuevos (todos en `PRECACHE_URLS`): `js/components/racha-reactor.js`,
  `js/utils/hoyToca.js`. Archivo eliminado: `js/views/mas.js`.
- Comportamiento previo que el QA reconfirmó (no es un cambio de esta
  tanda): la primera visita a Entreno abre el modal de perfil y tapa la
  navegación hasta cerrarlo.
- Las tareas de `Tareas` no tienen recurrencia (lo recurrente es de
  Finanzas); la agenda solo lista las tareas con fecha exactamente de hoy,
  sin atrasadas.

---

Resumen de los 20 commits entre `bb6c189` (3 sep 2026) y `b6a4519` (5 sep
2026, HEAD de `worktree-dashboard-mk3` al momento de escribir esto). Agrupado
por tema, no por orden cronológico — el orden cronológico exacto está en
`git log --oneline bb6c189..b6a4519`.

---

## Integridad de datos (plata y fechas)

- **`ea113d8` — moneda unificada en CLP.** `getCurrency()` devolvía `'USD'`
  por defecto sin que existiera ninguna pantalla para cambiarla: Inicio y
  Análisis mostraban `US$450.000,00` mientras Finanzas mostraba `$450.000`,
  misma app, dos monedas. Además el formateador CLP estaba copiado a mano en
  7 archivos. `utils/currency.js` pasa a ser la única fuente (default CLP,
  locale `es-CL` fijo), y esos 7 archivos importan desde ahí.
- **`b1b2928` — separador de miles chileno en metas y sobres.**
  `goal-form.js` y `EnvelopeForm.js` usaban `<input type="number">` +
  `parseFloat`, donde el punto es separador *decimal* — un usuario tipeando
  "500.000" veía guardarse `500` sin ningún aviso (corrupción silenciosa).
  Pasan a `type="text" inputmode="numeric"` con máscara de miles en vivo
  (`digitsToMiles`/`milesToInt`), decisión acordada con el usuario en vez de
  reusar el patrón de teclado numérico de Gasto/Ingreso/Ahorro (esos modales
  son de un solo propósito; goal-form.js tiene 2 montos compartiendo
  pantalla con nombre/tipo/fecha/ícono).
- **`f5f0bd4` — fechas de día calendario sin corrimiento de huso horario.**
  `toISOString().slice(0,10)` convierte a UTC antes de truncar, así que una
  fecha construida en hora local puede caer en otro día calendario según el
  huso horario del usuario. Nueva `diaKeyDe()` en `fecha.js` (mismo criterio
  que la ya existente `mesKeyDe()`), aplicada en tareas recurrentes, racha
  global y nombre del archivo de respaldo.
- **`b4f3f9a` — locale de fechas unificado a `es-CL` + "Ahorro" singular.**
  Convivían tres criterios de locale (`es-CL`, `es-ES`, y ninguno) repartidos
  en 16 llamadas a `toLocaleDateString`/`toLocaleTimeString`. Se centralizan
  en 5 helpers nuevos de `fecha.js` con locale fijo. De paso, la lista de
  movimientos de Finanzas mostraba la fecha en crudo ISO en vez de
  formatearla, y todas las etiquetas visibles que decían "Ahorros" se
  normalizan a "Ahorro" singular (la clave interna de filtro no se tocó).

## Navegación y robustez del arranque

- **`85ae8e6` — navegación por hash + el botón atrás cierra modales, no la
  app.** No había un solo `hashchange`/`popstate`/`pushState` en el
  proyecto: la URL nunca se movía de `/vanguard-os/`, así que "atrás" en
  cualquier vista (o con un modal abierto) cerraba la app entera en vez de
  volver a Inicio o cerrar el modal, y recargar siempre volvía a Inicio.
  Se agrega navegación real por hash en `app.js` y un `history.js` nuevo con
  un `MutationObserver` genérico sobre la clase `.modal-overlay` que cubre
  **todos** los modales de la app (de negocio y el de confirmación global)
  sin tocar cada formulario uno por uno.
- **`3a8a194` — bootstrap más rápido + splash con progreso real.** El grafo
  de módulos se bajaba de a un archivo por vez (esquivando un bug de
  Content-Type de un servidor local viejo) — en GitHub Pages eso son ~60
  round-trips secuenciales en la primera visita. Pasa a un pool de 6
  descargas en paralelo, con progreso real en la barra del splash en vez de
  una animación falsa, y un mensaje de "Reintentar" si el grafo falla del
  todo (en vez de un `location.reload()` a ciegas que podía loopear).
- **`d59ac35` (parte a) — manejo global de errores.** Cualquier excepción
  fuera de un `try/catch` dejaba la app muda, sin rastro visible. Ahora hay
  un listener de `error`/`unhandledrejection` en el bootstrap, y
  `navigate()` muestra una pantalla de error legible (en vez del div rojo
  con la excepción cruda) con botones "Reintentar"/"Volver a Inicio" y el
  detalle técnico colapsado detrás de un `<details>`.

## Seguridad

- **`d6714a0` — texto de usuario sin escapar en 3 lugares.** Un nombre de
  hábito o rutina con `&`/`<` rompía el render, y como queda guardado en
  IndexedDB la app quedaba rota en cada carga siguiente hasta borrar el
  dato a mano. Corregido en `habitos.js`, `entrenamiento.js` y
  `dashboard.js` (alerta de flujo de caja), más un caso encontrado en el
  barrido de control (`analisis.js`, título de tarea en el historial).

## Adopción de la PWA

- **`13a0850` — banner de instalación.** Sin capturar `beforeinstallprompt`
  temprano (se dispara una sola vez) la app nunca se ofrecía para instalar:
  el usuario la usaba como pestaña de navegador para siempre. Banner
  discreto en Inicio si hay un prompt disponible, la app no está ya
  instalada, y no se descartó en los últimos 30 días. De paso, unificado
  `theme-color` entre `manifest.json` e `index.html` (antes eran dos valores
  distintos y la barra de estado cambiaba de color entre pestaña y app
  instalada).
- **`fccba8b` — aviso de respaldo también en Inicio.** El aviso de días sin
  respaldar solo vivía en Ajustes de Finanzas — con todo en IndexedDB local
  y sin backend, eso es muy fácil de no ver hasta que ya es tarde. Ahora
  también aparece como tarjeta en Inicio (ámbar hasta los 30 días, rojo
  después), reusando la misma lógica de `utils/backup.js`.
- **`0486680` — onboarding inicial de bienvenida.** El primer arranque caía
  directo en un dashboard vacío sin explicar nada. Modal de 3 pasos,
  saltable, una sola vez (flag en IndexedDB, no `localStorage` — ese se
  borra junto con los datos del sitio): qué es la app, exportar un respaldo
  ahí mismo, e instalarla en la pantalla de inicio.

## Layout y viewport

- **`27f5da2` — `100dvh` en mobile.** `.app-layout` solo tenía
  `height:100vh`; en Chrome Android eso es la altura *con* la barra de URL
  visible, tapando parcialmente el nav flotante de abajo. Mismo fallback
  `100vh` + `100dvh` que ya tenía el bloque de escritorio.
- **`14cabdc` — pinch-zoom permitido + inputs a 16px mínimo.** El viewport
  tenía `maximum-scale=1.0, user-scalable=no` bloqueando el pinch-zoom — un
  fallo de accesibilidad real para quien no ve bien. Esos atributos existían
  para evitar el zoom automático de Safari iOS al enfocar un input; la
  solución correcta (inputs con `font-size >= 16px`) ya estaba parcialmente
  aplicada, así que se sube el resto: 27 inputs/selects/textareas en 15
  archivos que quedaban por debajo de 16px.

## Copy en español de Chile

- **`f651ea1` — voseo a tuteo.** Los 16 casos ya identificados en una sesión
  anterior, más 9 casos nuevos encontrados en un barrido final (imperativos
  con tilde final, "tenés"/"podés"/"vos"). Queda un voseo sin tocar a
  propósito: el mensaje de error de arranque de `index.html`, señalado como
  pendiente de otra reescritura (resuelto después en `d59ac35`).

## Accesibilidad

- **`a1593ad` — nombres accesibles (nav, modales, toasts, botones de
  ícono).** No había un solo `aria-*` ni `role=` en todo el proyecto.
  Cobertura genérica vía un observer nuevo que agrega `role="dialog"` y
  devuelve el foco al cerrar cualquier `.modal-overlay`, más
  `aria-current="page"` en la navegación, `aria-live` en los toasts, y
  `aria-label` puntual en los botones de ícono más tocados (marcar/borrar
  hábito, borrar movimiento, favoritos de PR). Quedó explícitamente afuera
  de esta pasada la mayoría de los botones de ícono de varios formularios
  secundarios.
- **`d59ac35` (parte b) — confirmaciones que dicen qué destruyen.**
  `ConfirmDialog` pasa a aceptar `{ verb, danger }`: el título nombra el
  objeto, el cuerpo nombra la consecuencia con datos reales calculados
  cuando se puede (cuántas subtareas, cuántos movimientos quedan sin sobre,
  cuánto llevás ahorrado), y el rojo queda reservado para lo realmente
  destructivo. El caso más explícito es "olvidé mi PIN" en `lock.js`, que
  cuenta en números reales lo que se pierde y exporta un respaldo
  automático antes de borrar.
- **`21e5d17` — tipografía autoalojada + sin sombras.** Inter, Space
  Grotesk e IBM Plex Mono pasan a `.woff2` local (subset latin) en vez de
  depender de `fonts.googleapis.com` en el arranque — una PWA offline-first
  no puede necesitar una petición externa para verse bien. Space Grotesk e
  IBM Plex Mono estaban declaradas en `variables.css` pero nunca se
  cargaban en ningún lado; ahora se sirven de verdad. De paso, se sacan los
  `box-shadow` redundantes de botón primario, tabs, hoja modal y bottom-nav
  (ya hay un border de 1px haciendo esa separación visual en cada caso).
- **`1f0494b` — teclado numérico en los formularios que faltaban.**
  `inputmode="numeric"`/`"decimal"` en los campos que faltaban de
  `profile-form.js`, `hiit-timer.js`, `hiit-rutina-form.js`,
  `rutina-form.js` y los 3 campos de porcentaje de la regla 50/30/20 en
  `finanzas.js`, más `enterkeyhint="done"` en el último campo numérico de
  cada uno.
- **`b6a4519` — labels asociados a su input.** De 62 `<label>` en el
  proyecto, solo 1 tenía `for=`. Se asocian los 55 que sí describen un
  único control (`<label for="X">` / `<input id="X">`, agregando id donde
  faltaba). Los 7 restantes eran encabezados de un grupo de botones/
  checkboxes sin ningún control real al que asociarse ("Modo", "Prioridad",
  "Subtareas", etc.) — pasan a `<div>` con el mismo estilo en vez de forzar
  un `for` inválido apuntando a un input oculto.

## Housekeeping

- **`1ed77cb` — borrado de archivos muertos.** `VanguardOS_Claude_Spec.md`
  (desactualizado), `Vanguard_OS_Prompt.txt` (sin referencias),
  `seed-data.js` (solo se invocaba a mano desde la consola) y
  `css/tokens-mk3.css` (no linkeado en ningún lado) — confirmado con grep
  que ninguno tenía referencias vivas antes de borrarlos.
- **`afb3c82` — documentación interna movida a `docs/`.** Los `.md` de
  planificación quedaban públicamente accesibles en GitHub Pages porque
  esa plataforma sirve toda la raíz del repo. Se mueven a `docs/` (no se
  publica como contenido de la app) y se agrega un `README.md` real en la
  raíz.

---

## Nota sobre `CACHE_NAME`

Casi todos estos commits suben `CACHE_NAME` en `sw.js` (de v20-y-pico a
v75 al cierre de este resumen) — regla del proyecto: sin subirlo, el
Service Worker sigue sirviendo el contenido cacheado viejo aunque el
código en el repo ya haya cambiado.
