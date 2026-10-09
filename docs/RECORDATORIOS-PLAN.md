# Recordatorios (notificaciones push)

Base: rama worktree-dashboard-mk3, partiendo de 9b709fc, v295 (anotar el commit y la caché reales al empezar F1).

## Decisiones
- Backend: el Supabase de la sync. Web Push con VAPID. Edge Function `enviar-recordatorios`, llamada cada minuto por pg_cron (con pg_net), que envía los avisos vencidos.
- Requiere sesión iniciada. Sin cuenta, la sección lo explica y no ofrece nada más.
- El teléfono calcula; el servidor solo envía: la app sube los avisos de los próximos 7 días a `recordatorios` (user_id, id, envia_en timestamptz, titulo, cuerpo, url, enviado_en). Se recalcula al abrir la app, al cambiar algo que afecte un aviso y después de cada sync.
- Tipos (cada uno se activa aparte, todos apagados al principio): hábitos a una hora elegida por hábito, solo los días que aplica y si no está marcado (al marcarlo se borra su aviso del día); tareas de Lista a las 9:00 del día que vencen (hora configurable); cobros recurrentes el día anterior a las 20:00; resumen diario opcional "Hoy: N tareas, M hábitos".
- Horas en hora local de Chile, convertidas a UTC al subir (cuidado con el cambio de horario).
- Plataforma: Android con la app instalada. iPhone solo con la app en la pantalla de inicio (iOS 16.4+); se informa.
- Preferencias en settings (`recordatorios`: {...}) con configuracion_actualizada y el mapa completo.

## Reglas
- Toda mutación pasa por db y emite logEvent; eventos nuevos con su caso en applyRemoteEvent. Fechas con utils/fecha.js, números con utils/numero.js, escape con utils/escape.js.
- Modales con .modal-overlay + open. Ids antes de cualquier await. Repintados tras await con js/core/vista-activa.js.
- Archivos nuevos a PRECACHE_URLS; CACHE_NAME en cada commit con código.
- Tablas nuevas con RLS user_id = auth.uid(). Nada de claves privadas en el repo.
- QA Playwright de a una, 375 y 1280, un solo servidor, en primer plano, navegador cerrado al final. Consola y ESLint limpios.
- La tabla de Estado nunca lleva el hash del commit que la edita.

## Fases
F1 · Servidor: migraciones en supabase/migrations/ (push_suscripciones: user_id, endpoint, p256dh, auth, creado_en, dispositivo; recordatorios; RLS; pg_cron + pg_net + job cada minuto); Edge Function en supabase/functions/enviar-recordatorios/ (Deno + web-push: envía los vencidos con enviado_en null a todas las suscripciones del usuario, marca enviado_en, borra suscripciones que den 404/410). Desplegado y verificado.
F2 · Suscripción: sw.js maneja push (notificación con ícono) y notificationclick (abre o enfoca la app en la url). Configuración › Recordatorios: "Activar en este dispositivo" (permiso + suscripción guardada), estado visible (activado / bloqueado / requiere instalar), y "Enviar aviso de prueba" para dentro de 1 minuto.
F3 · Cálculo: js/core/recordatorios.js con calcularRecordatorios(datos, prefs, desde, hasta) puro, ids estables (habito:<id>:<fecha>), upsert de 7 días y borrado de los no enviados que ya no corresponden; disparadores: abrir app, preferencias, tareas, hábitos, recurrentes, sync. Tabla de casos en consola, incluidos los cambios de horario de abril y septiembre.
F4 · Preferencias: un interruptor y una hora por tipo en Configuración; "Recordarme a las…" opcional en el formulario de hábito. Apagar un tipo borra sus pendientes; cambiar la hora los mueve.
F5 · QA final y docs: recorrido completo a 375 y 1280, sin cuenta la app funciona igual, docs/PLAN.md con Recordatorios en "Hecho", CHANGELOG al día, y la lista de pasos para la prueba real en el teléfono.

## Estado
| Fase | Commit | Caché |
|---|---|---|
| F1 Servidor | | |
| F2 Suscripción | | |
| F3 Cálculo | | |
| F4 Preferencias | | |
