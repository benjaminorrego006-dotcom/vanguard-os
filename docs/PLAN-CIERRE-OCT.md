Plan corto de cierre (base 696a4b8, v310). Guarda este texto como docs/PLAN-CIERRE-OCT.md en el primer commit. Haz todo seguido, un commit por punto con su caché, y para solo al final o ante una falla real. Las decisiones técnicas chicas tómalas tú y anótalas en el informe.

## Reglas
- Mide la memoria antes de empezar: 600 MB o más, sigue; menos de 600, para y dime qué ocupa. Si baja de 450 durante una prueba, para y avisa.
- MCP de Playwright apagado: usa tus propios scripts de Playwright, de a una prueba, en primer plano, un solo servidor, y cierra el navegador al final de cada una.
- Pruebas de cada punto a 375; una pasada final de todo a 1280. Consola y ESLint limpios.
- Reglas de siempre: mutaciones por db con logEvent, utils/fecha.js, utils/numero.js, utils/currency.js, utils/escape.js, vista-activa.js tras await, modales .modal-overlay + open, archivos nuevos a PRECACHE_URLS, CACHE_NAME en cada commit con código, la tabla de Estado nunca lleva el hash del commit que la edita.

## P1 · Pulido visual
1. Mapa de actividad de Finanzas: usar el token ámbar del módulo, no el dorado heredado.
2. Modales y hojas antiguos: sin esquinas redondeadas (regla MK III: recto; chaflán solo en tarjetas principales). Revisa todos los .modal-overlay, hojas y diálogos (ConfirmDialog incluido). No toques círculos ni anillos.
3. Hoy a 375: el saludo no se parte en dos líneas por el botón "Día". Achica o reubica el botón sin bajar de 44 px de área de toque.

## P2 · Diagnóstico de Recordatorios (sin cambiar cómo funcionan)
Recordatorios sigue en pausa porque en el teléfono de Benjamin no funcionan y no sabemos en qué paso falla. Agrega en Configuración › Recordatorios un bloque plegado "Diagnóstico" (cerrado por defecto) que muestre, en texto simple y con un botón "Copiar diagnóstico":
- navegador y si la app está instalada (display-mode standalone);
- soporte: serviceWorker, PushManager, Notification;
- Notification.permission;
- service worker: registrado, activo y si controla la página (navigator.serviceWorker.controller);
- suscripción push en el navegador: sí/no y los últimos 12 caracteres del endpoint;
- sesión de Supabase: sí/no (sin mostrar el correo completo ni tokens);
- fila en push_suscripciones para este endpoint: sí/no (consulta de solo lectura);
- recordatorios pendientes de esta cuenta en el servidor: cantidad, y el próximo envia_en en hora de Chile;
- último error capturado al activar o al sincronizar avisos (guardar el último en memoria y en localStorage con try/catch).
No muestres claves ni tokens. No cambies la lógica de push.js ni de recordatorios*.js salvo para registrar el último error. Verifica con el stub: cada línea muestra el valor correcto en los casos concedido, negado, sin sesión y sin suscripción.

## P3 · Configuración de MCP duplicada
El servidor "playwright" está definido dos veces (scope project con --executable-path y scope local). Deja solo el de scope project y quita el local con `claude mcp remove playwright -s local`. Si el de project no queda funcionando, explícame cómo dejarlo bien. Déjalo desactivado al terminar (lo apago yo para ahorrar memoria).

## Cierre
- docs/PLAN.md y CHANGELOG al día.
- Informe final con: tabla de commits y cachés, qué hice en cada punto, lo que no pude cumplir, y una lista corta para Benjamin de cómo abrir el Diagnóstico en el teléfono y qué copiarme.

## Estado
| Punto | Commit | Caché |
|---|---|---|
| P1.1 Mapa de Finanzas en ámbar | | v311 |
| P1.2 Modales y hojas sin esquinas redondeadas | | |
| P1.3 Saludo de Hoy en una línea a 375 | | |
| P2 Diagnóstico de Recordatorios | | |
| P3 MCP playwright sin duplicado | | |
| Cierre: docs | | |
