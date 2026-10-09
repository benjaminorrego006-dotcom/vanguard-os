# Recordatorios — servidor

Cómo está armado el envío de avisos push y qué hacer si hay que rehacerlo.
El plan completo está en `docs/RECORDATORIOS-PLAN.md`.

## Cómo funciona

1. La app (el teléfono) calcula los avisos de los próximos 7 días y los sube a
   la tabla `recordatorios` (F3).
2. Cada dispositivo que activa los avisos guarda su suscripción en
   `push_suscripciones` (F2).
3. Cada minuto, pg_cron llama a la Edge Function `enviar-recordatorios`. La
   función toma los avisos vencidos, los marca como enviados y los manda a
   todos los dispositivos del usuario.

## Qué hay en Supabase (proyecto `dgnjoawfaizmbrekxauq`)

| Pieza | Dónde |
|---|---|
| Tablas `push_suscripciones` y `recordatorios`, con RLS y grants | `supabase/migrations/20261007120000_recordatorios_tablas.sql` |
| Extensiones pg_cron y pg_net | la misma migración |
| Job `enviar-recordatorios` cada minuto | `supabase/migrations/20261007120100_recordatorios_cron.sql` |
| Edge Function | `supabase/functions/enviar-recordatorios/index.ts` |
| Secretos de la función | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (solo en Supabase) |
| Secreto del cron | Vault, nombre `recordatorios_cron_secret` (mismo valor que `CRON_SECRET`) |

Clave VAPID pública (puede estar en el código; la usa la app en F2):
`BBKGgbN60jDdkTovkN_z1hdjJU9qm2SlSE9_fbMP6QXz1YBQbluhi1DXZaASW-x1FbTAKjVefzoYVbhm6Hv0MEA`

La clave privada no está en ningún archivo: solo en los secretos de Supabase.

## Cómo se instaló (7 oct 2026, con la CLI)

Todo con `npx`, desde la carpeta del proyecto, con la sesión de la CLI
iniciada (`npx supabase login`):

1. `npx supabase link --project-ref dgnjoawfaizmbrekxauq`
2. `npx supabase db query --linked --file supabase/migrations/20261007120000_recordatorios_tablas.sql`
3. Claves VAPID con `npx web-push generate-vapid-keys --json` y secretos con
   `npx supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:benjaminorrego006@gmail.com CRON_SECRET=…`
   (sin guardar la clave privada en ningún archivo).
4. El mismo `CRON_SECRET` en Vault:
   `select vault.create_secret('<secreto>', 'recordatorios_cron_secret');`
5. `npx supabase db query --linked --file supabase/migrations/20261007120100_recordatorios_cron.sql`
6. `npx supabase functions deploy enviar-recordatorios --no-verify-jwt --use-api --project-ref dgnjoawfaizmbrekxauq`

`--no-verify-jwt` es a propósito: la clave pública nueva (`sb_publishable_…`)
no es un JWT. La función se protege con el encabezado `x-cron-secret`; sin él
responde 401.

## Si hay que hacerlo desde el panel web (sin la CLI)

Para alguien que no programa; cada paso dice cómo saber que salió bien.

1. **Entrar al proyecto.** Abre <https://supabase.com/dashboard>, inicia sesión
   y elige el proyecto **vanguard-os**.
2. **Crear las tablas.** Menú de la izquierda › **SQL Editor** › **New query**.
   Pega todo el contenido de
   `supabase/migrations/20261007120000_recordatorios_tablas.sql` y toca
   **Run**. Sale bien si abajo dice "Success. No rows returned". En
   **Table Editor** aparecen `push_suscripciones` y `recordatorios`.
3. **Guardar los secretos de la función.** Menú › **Edge Functions** ›
   **Secrets** (o **Manage secrets**). Agrega uno por uno, con **Add new
   secret**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   (`mailto:benjaminorrego006@gmail.com`) y `CRON_SECRET` (un texto largo al
   azar). Sale bien si los cuatro nombres aparecen en la lista.
4. **Guardar el secreto del cron en Vault.** **SQL Editor** › **New query**,
   pega `select vault.create_secret('EL MISMO TEXTO DE CRON_SECRET', 'recordatorios_cron_secret');`
   y **Run**. Sale bien si devuelve un id.
5. **Subir la función.** Menú › **Edge Functions** › **Deploy a new function**
   › **Via Editor**. Nombre: `enviar-recordatorios`. Pega el contenido de
   `supabase/functions/enviar-recordatorios/index.ts` y despliega. Después,
   en la función, abre **Details** y apaga **Enforce JWT Verification**. Sale
   bien si la función aparece con estado "Active".
6. **Activar el envío cada minuto.** **SQL Editor** › **New query**, pega el
   contenido de `supabase/migrations/20261007120100_recordatorios_cron.sql` y
   **Run**. Sale bien si en **Integrations › Cron** (o **Database › Cron
   Jobs**) aparece `enviar-recordatorios` activo, cada minuto.
7. **Comprobar.** En **SQL Editor**: `select status_code from net._http_response order by created desc limit 3;`
   Unos minutos después tienen que salir 200.

## Prueba en el teléfono

Para hacerla una vez, con el teléfono Android y la cuenta de Benjamin:

1. **Actualizar la app.** Abre Vanguard (la app instalada). Si ya estaba
   abierta, ciérrala del todo y vuelve a abrirla dos veces, para que tome la
   versión nueva.
2. **Iniciar sesión.** Menú ☰ › Configuración › Cuenta: tiene que decir
   "Sesión iniciada".
3. **Activar los avisos.** En Configuración › Recordatorios toca "Activar en
   este dispositivo" y acepta el permiso de notificaciones. Tiene que decir
   "Avisos activados en este dispositivo".
4. **Aviso de prueba.** Toca "Enviar aviso de prueba", cierra la app y espera
   uno o dos minutos: llega "Aviso de prueba". Al tocarlo se abre Vanguard.
5. **Hábito.** En "Qué avisar" enciende Hábitos. Ve a Hábitos, abre uno que no
   hayas marcado hoy › Editar › "Recordarme a las…" con una hora 3 o 4
   minutos más tarde › Guardar. Cierra la app: a esa hora llega el aviso con
   el nombre del hábito. Para ver que marcarlo lo cancela, repite con otro
   hábito y márcalo antes de la hora: ese no llega.
6. **Tarea.** Enciende "Tareas de Lista" y pon su hora 3 o 4 minutos más
   tarde. Crea una tarea que venza hoy. Cierra la app: llega "Vence hoy: …".
7. **Cobro.** Enciende "Cobros recurrentes" y pon su hora 3 o 4 minutos más
   tarde. En Finanzas › Recurrentes crea uno que se cobre mañana. Cierra la
   app: llega "Mañana se cobra …" con el monto.
8. **Dejarlo como quieras.** Vuelve a poner las horas que te sirvan (por
   defecto: tareas 09:00, cobros 20:00, resumen 08:00) y apaga lo que no uses.

Si algo no llega: en Configuración › Recordatorios revisa que diga
"activados"; en Ajustes del teléfono › Apps › Vanguard (o Chrome) ›
Notificaciones, que estén permitidas; y que el teléfono no esté en modo
ahorro de batería extremo, que puede retrasar los avisos.

## Verificación hecha en F1

- Llamada sin el secreto: 401.
- Recordatorio de prueba en la cuenta de Benjamin, vencido hace 20 s: la llamada
  manual respondió `tomados: 1` y quedó con `enviado_en`. Otro intento lo tomó
  el cron solo, en el tic del minuto. pg_net registró respuestas 200.
- El recordatorio de prueba se borró después.
