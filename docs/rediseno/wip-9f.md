# WIP 9f: estado al 25-11-2026 (rama `wip-9e-9f`)

## Dónde está cada cosa

| Parte | Commit | Rama | Estado |
|---|---|---|---|
| Arreglo de «1RM estimado» (AA) | `d2af677` | `rediseno-orbita` (con push) | Listo |
| Fase 9e: hojas, temporizador de HIIT y descanso activo en Órbita | `bb2be74` | `rediseno-orbita` (con push) | Lista. `fase-9e-5` dio 69/70; la única falla fue una espera vencida al preparar los datos de la foto de la sesión de la 9d. Esa foto, corrida sola dos veces, salió sin diferencias. |
| Fase 9f: el HIIT y el descanso activo se retoman | `368d866` | `wip-9e-9f` | Aplicada, **sin verificación completa** |

La 9f no quedó solo como borrador: el código está aplicado y en commit en
esta rama. Ese commit es el parche (`git show 368d866`).

## Qué hace la 9f
- **Borrador:** usa `vanguard.sesionEnCurso`, la misma clave que la sesión de GYM.
  - `tipo: 'hiit'` nace al tocar «Iniciar timer». El tiempo no se guarda: se recalcula desde la hora de inicio (`estadoHiitEn`).
  - `tipo: 'descanso'` nace al abrir el descanso activo.
- **Retomar:** desde la tarjeta de Inicio, tras Volver, otra vista, atrás o recarga. Un HIIT que terminó fuera de la pantalla se guarda con su duración real.
- **Atrás en el resumen del HIIT:** cuenta como Omitir y la sesión se guarda una sola vez (antes se perdía).
- **Pruebas:** en `foto-hojas.mjs`, la parte `salida` de `hojas-antes.json` cambia a propósito y se agrega `fin`. `verificar.mjs` afirma los puntos clave.

## Qué falta
1. **Verificación completa de la 9f:**
   - `node tools/verificar/verificar.mjs fase-9f-2` con Node portable en el PATH.
   - `fase-9f-1` se detuvo con 35 pruebas OK y ninguna falla.
   - La foto de la 9e (`foto-hojas.mjs despues`), corrida sola, salió sin diferencias dos veces seguidas.
2. **Con la verificación en verde:**
   - Llevar el commit a `rediseno-orbita` (`git cherry-pick 368d866` y el de esta nota, o fusionar la rama) y hacer push.
   - Pasar el título de la sección 9f a «lista».
   - La regla acordada: si falla solo por una espera vencida, se corre esa foto sola dos veces, y si pasa las dos se anota en el mensaje del commit.
3. **Commit aparte de herramientas** (solo `tools/verificar`): encontrar la causa de las esperas vencidas de 30 s al preparar los datos de las fotos.
   - Salieron en Inicio, Finanzas, Rutinas y Sesión, una distinta en cada corrida.
   - Todas pasan por `prepararEscenario` (`foto-finanzas.mjs`). La última quedó en el paso «escenario» con la app en `#dashboard`, así que lo más probable es la espera de `currentView === 'configuracion'`.
   - Ya descartado: la recarga por actualización del service worker (en la primera instalación se ignora) y procesos colgados.
4. **`graphify`:** no está instalado en este PC, así que `graphify update .` queda pendiente.
