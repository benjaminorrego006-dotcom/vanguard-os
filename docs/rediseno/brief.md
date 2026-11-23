Actúa como diseñador de producto senior (UX + UI) y desarrollador frontend. Vamos a REHACER POR COMPLETO el diseño y la estructura de Vanguard OS: navegación, arquitectura de información, distribución de pantallas e identidad visual. Lo único intocable son los datos y la lógica de fondo.

## Contexto de la app
- App: Vanguard OS. PWA personal de productividad, offline-first. Publicada en https://benjaminorrego006-dotcom.github.io/vanguard-os/
- Stack: JavaScript vanilla, ES Modules nativos (sin bundler ni frameworks), IndexedDB con un log central de eventos y sincronización con Supabase. Estructura js/core, js/views, js/components; tokens en css/variables.css.
- Usuario: uso personal (estudiante universitario). Dispositivo principal: celular. También tiene que funcionar bien en tablet y PC.
- Funcionalidades actuales (TODAS tienen que seguir existiendo en la nueva estructura):
  - Hoy: tarjeta contextual, acciones rápidas, captura rápida, agenda del día con checks, resúmenes por módulo
  - Tareas: lista de tareas con fechas + planificador semanal
  - Hábitos: registro mensual, rachas, anillo de racha, vidas extra, insignias
  - Entreno: GYM, Calistenia, HIIT, generador de rutinas, sesión activa, mapa muscular con fatiga, sistema de niveles y sugerencias
  - Finanzas: sobres/presupuesto con arrastre mensual, transacciones, recurrentes, CLP/USD
  - Ritual matutino, Anotaciones, Laboratorio (gráficos y estadísticas), Configuración (cuenta, sincronización, respaldo)
  - Onboarding, modales, diálogos de confirmación, toasts
- Estructura actual (puedes cambiarla entera): barra inferior Hoy · Tareas · Hábitos · Entreno · Finanzas; panel ☰ con Ritual, Anotaciones, Laboratorio y Configuración; riel lateral en tablet/PC.
- Diseño actual "MK III" (puedes reemplazarlo entero): tema oscuro, esquinas en chaflán, sin sombras, monoespaciada para números, tema gris con acentos por módulo (cian Entreno, ámbar Finanzas, violeta Tareas, rosa Hábitos).

## Lo que quiero
- Una app que se sienta NUEVA: más clara de usar, más rápida para lo que hago todos los días, profesional, fluida, visual y llamativa. Que no parezca una plantilla genérica ni algo hecho por IA.
- Puedes cambiar la navegación, agrupar, separar o fusionar módulos y pantallas, mover funciones de lugar y rediseñar cada flujo, siempre que no se pierda ninguna funcionalidad.
- Todavía no tengo decidida la dirección, así que partes proponiendo (Fase 0).

## Fases (una por commit; al terminar cada una te detienes y esperas que escriba "continúa")
- Fase 0 – Diagnóstico y propuestas (SIN tocar la app):
  a) Recorre el proyecto y hazme un mapa de la estructura actual: pantallas, cuántos toques toma cada acción frecuente y qué problemas de uso ves.
  b) Propón 3 conceptos completos y claramente distintos. Cada uno con: nombre, idea central en 2-3 líneas, nueva navegación y mapa de pantallas (dónde queda cada funcionalidad de la lista), flujo de las 5 acciones más frecuentes (marcar un hábito, registrar un gasto, agregar una tarea, empezar un entreno, revisar el día), y dirección visual (paleta en HEX, tipografías, formas, profundidad, uso del color por módulo, estilo de animaciones).
  c) Para cada concepto, una maqueta HTML estática de la pantalla principal en celular, en un archivo aparte fuera de la app.
  d) Recomienda uno, explica por qué y espera mi elección.
- Fase 1 – Plan de migración: con el concepto elegido, escribe docs/rediseno-total.md con el mapa final de pantallas, una tabla "funcionalidad actual → dónde queda", las fases restantes y los riesgos. Espera mi aprobación.
- Fase 2 – Sistema de diseño: tokens nuevos en css/variables.css (colores, tipografía, escala, espaciados, radios, elevación, animaciones) y clases por módulo.
- Fase 3 – Esqueleto: nueva navegación y router, layout de celular/tablet/PC y transiciones entre pantallas. Las vistas existentes se conectan aunque todavía no estén rediseñadas.
- Fase 4 – Componentes base: botones, inputs, tarjetas, listas, chips, modales, diálogos, hojas inferiores (bottom sheets), estados vacíos, toasts.
- Fase 5 en adelante – Una pantalla o módulo por fase, en el orden del plan de la Fase 1.
- Fase final – Limpieza: elimina las vistas, el CSS y los componentes viejos que ya no se usen, revisa la consistencia general y actualiza docs/CHANGELOG.md.

## Reglas que NO se pueden romper
- La capa de datos queda intacta: db.js, idb.js, sync.js, los stores de IndexedDB, el log de eventos y utils/ (fecha.js, currency.js, escape.js). No cambias esquemas ni nombres de stores, y no haces migraciones de datos.
- Toda mutación sigue emitiendo logEvent({modulo, tipo, entidadId, payload}). Rachas, balance e insignias se siguen calculando desde el log, nunca se guardan aparte.
- Fechas siempre con diaKeyDe()/mesKeyDe(), nunca toISOString(). Montos siempre con utils/currency.js.
- No toques el parser de captura rápida. Puede cambiar de lugar en la interfaz, pero su lógica no se modifica.
- Solo db.js importa idb.js (sync.js es la única excepción documentada).
- El botón atrás de Android tiene que seguir funcionando: todo modal u hoja usa el patrón .modal-overlay + clase open, y si cambias el router, js/core/history.js se adapta y se prueba.
- Todo archivo nuevo va en PRECACHE_URLS, y CACHE_NAME se incrementa en cada cambio. La app tiene que seguir funcionando offline.
- Los imports relativos llevan siempre la extensión .js. Después de cada render con innerHTML, reasigna los listeners.
- chart.js sigue cargando diferido, solo cuando se necesita.
- Las fuentes se sirven locales, nunca desde un CDN.
- Todo color, tamaño y espaciado sale de los tokens: cero valores sueltos.
- Accesibilidad: contraste AA, objetivos táctiles de mínimo 44px y respeto a prefers-reduced-motion.
- Ninguna funcionalidad desaparece sin que yo lo apruebe explícitamente.
- Una tarea por commit, sin agentes en paralelo. Ignora VanguardOS_Claude_Spec.md (está obsoleto).

## Verificación al final de cada fase
- Con Playwright MCP (Chromium), captura las pantallas tocadas en 390px (celular), 768px (tablet) y 1440px (PC).
- La consola debe quedar sin errores en carga limpia.
- Comprueba que siguen funcionando las 5 acciones frecuentes, crear/editar/borrar en el módulo tocado, modales, botón atrás, modo offline y sincronización.
- Confirma que mis datos existentes se siguen viendo igual que antes del cambio.
- Si tengo que ejecutar algo en PowerShell, escríbeme los comandos paso a paso y de forma explícita.

## Formato de respuesta en cada fase
1. Qué vas a hacer (2-3 líneas).
2. Los cambios.
3. El resultado de la verificación, con capturas.
4. Qué cambió respecto a la versión anterior y qué falta.
Después te detienes y esperas "continúa".