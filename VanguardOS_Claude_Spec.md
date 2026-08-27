# Vanguard OS v5 - Especificación Técnica y Arquitectura

**Rol del Asistente (Claude):** Eres el Ingeniero Principal a cargo de "Vanguard OS v5", una PWA offline-first diseñada como un sistema operativo personal. Debes mantener el código limpio, modular, sin bundlers y respetando estrictamente la arquitectura Vanilla JS existente.

---

## 1. Arquitectura Base
*   **Stack:** HTML5, CSS3, Vanilla JavaScript (ES Modules).
*   **Paradigma:** PWA Offline-first. No hay backend ni base de datos en la nube.
*   **Almacenamiento:** Todo persiste localmente usando `localStorage` (a través del wrapper centralizado `db.js`).
*   **Enrutamiento:** Router personalizado (`js/core/app.js`) que intercepta los clics en la barra de navegación inferior e inyecta dinámicamente las vistas mediante `import()` dinámico.
*   **Renderizado:** Inyección de HTML mediante Template Literals (`innerHTML`). No se usa React ni frameworks. Los eventos se manejan delegando listeners tras cada render (patrón `mountListeners` o `setupListeners`).

## 2. Estructura de Directorios

```text
cerebro/
├── index.html              # Shell de la PWA, Router y Navbar
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker (actualmente en modo passthrough/kill-switch)
├── css/
│   ├── layout.css          # Estructura principal y responsividad
│   ├── components.css      # Tarjetas, botones, inputs
│   └── variables.css       # Sistema de diseño (Paleta índigo/teal/orange)
└── js/
    ├── core/
    │   ├── app.js          # Router principal
    │   ├── db.js           # CORE: Wrapper de localStorage y lógica de negocio
    │   ├── audio.js        # Web Audio API (beeps) y SpeechSynthesis
    │   ├── plantillas.js   # Plantillas de rutinas
    │   ├── progresiones-calistenia.js
    │   └── ejercicios-catalogo.js
    ├── utils/
    │   ├── animate.js      # Animaciones de números
    │   ├── currency.js     # Formateo de moneda
    │   ├── donut.js        # Renderizado de gráficos SVG
    │   ├── states.js       # UI States: Toast, ConfirmDialog, EmptyState
    │   └── backup.js       # Import/Export JSON de todo el sistema
    ├── components/         # Componentes reutilizables (Formularios, Timers, UI)
    │   ├── IngresoForm.js, GastoForm.js, AhorroForm.js, EnvelopeForm.js, TransferForm.js
    │   ├── task-form.js, rutina-form.js, rutina-session.js, rutinas-lista.js
    │   ├── hiit-timer.js, plate-calculator.js, mini-chart.js
    └── views/              # Vistas principales (Controladores)
        ├── dashboard.js    # Resumen general
        ├── tareas.js       # Kanban board (TaskFlow)
        ├── entrenamiento.js# Módulo deportivo (Gym, Calistenia, HIIT)
        └── finanzas.js     # Presupuesto de sobres, metas y control de gastos
```

## 3. Módulos Principales (El Dominio)

### A. Finanzas (`views/finanzas.js`)
*   **Modelo de Sobres (Envelope Budgeting):** Asignación de ingresos a necesidades, deseos y ahorro.
*   **Componentes:** Formularios dinámicos de transacciones y transferencias. Gráficos de dona en SVG para el progreso.
*   **Claves Storage:** `vg_transactions`, `vg_settings`, `vg_savings_goals`.

### B. Entrenamiento (`views/entrenamiento.js`)
*   **Múltiples Modalidades:** GYM (Fuerza), Calistenia (Peso corporal) y HIIT/Cardio (Timers).
*   **Timers Integrados:** HIIT (Tabata, EMOM, AMRAP) con anuncios de voz (`SpeechSynthesis`) y beeps (`AudioContext`).
*   **Métricas:** Cálculo de 1RM, volumen por grupo muscular, rachas.
*   **Claves Storage:** `vg_routines`, `vg_sessions`.

### C. Tareas (`views/tareas.js`)
*   **Kanban Board:** Columnas de "Pendiente", "En Progreso" y "Completada".
*   **Atributos:** Prioridad (Alta/Media/Baja), Fechas límite, Proyectos.
*   **Claves Storage:** `vg_tasks`.

## 4. Gestión de Estado y Flujo de Datos
1.  **Lectura/Escritura:** Toda vista importa `db` desde `js/core/db.js`. Para modificar datos, llaman a métodos asíncronos como `db.saveTask()`, `db.registrarSesion()` o `db.saveTransaction()`.
2.  **Reactividad (Vanilla):** Cuando `db.js` guarda algo, llama a `this._triggerUpdate()` que emite eventos del DOM (ej. `budget-updated`). Alternativamente, las vistas locales tienen una función `reRender()` que limpia y vuelve a dibujar el contenedor principal al detectar cambios.

## 5. Reglas de Diseño UI/UX
*   **Tema Oscuro:** La app es estrictamente Dark Mode (fondos `#0a0a0b`, superficies `#141416`).
*   **Variables CSS (Design Tokens):** 
    *   Fondos: `--surface-1`, `--surface-2`, `--surface-border`.
    *   Texto: `--text-primary`, `--text-secondary`.
    *   Acentos: `--accent-primary` (Indigo), `--accent-teal` (Verde agua), `--accent-orange` (Naranja/Oro).
    *   Estados: `--state-success` (Verde), `--state-medium` (Amarillo), `--state-high` (Rojo).
*   **Clases Utilitarias Clave:** Usa `.card` para contenedores, `.tappable` para dar efecto al tocar en móviles, `.flex-between` para maquetación, y los modales se inyectan en el DOM con overlays absolutos (`z-index: 3000`).

## 6. Reglas e Instrucciones Críticas para Claude
1.  **No uses Bundlers ni Webpack:** Todo el código debe escribirse como ES Modules listos para el navegador (`import { x } from './x.js'`). **Es OBLIGATORIO incluir la extensión `.js` en los imports relativos**.
2.  **No rompas el LocalStorage:** Antes de modificar un método en `db.js`, asegúrate de mantener retrocompatibilidad con la estructura actual del objeto para no corromper la data local del usuario.
3.  **Encapsulamiento de Eventos:** Como la app inyecta HTML por `innerHTML`, recuerda siempre reasignar los Event Listeners después de cada render usando delegación de eventos o llamados a `setupListeners()` / `mountListeners()`.
4.  **Service Worker Caché:** El proyecto usa PWA y tiene un script "kill-switch" en `index.html`. Si los módulos dinámicos fallan al cargar (`Failed to fetch dynamically imported module`), probablemente sea culpa del Service Worker, por lo que debes guiar al usuario a refrescar o limpiar caché.
