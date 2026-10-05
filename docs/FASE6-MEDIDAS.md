# Fase 6 — Medidas corporales y fotos de progreso

Base: rama worktree-dashboard-mk3, después de los dos arreglos previos (partiendo de 0375720, v286; anotar el commit y la caché reales al empezar).
Origen: docs/PLAN.md › Pendiente › FASE 6.

## Decisiones (5 oct 2026)
- Store nuevo `medidas` (keyPath `id`): { id, fecha (diaKeyDe), pesoKg?, cinturaCm?, pechoCm?, brazoCm?, musloCm?, nota?, createdAt }. Todos los valores son opcionales, pero al menos uno es obligatorio. Varias medidas el mismo día se permiten; el gráfico usa la última de cada día.
- Eventos: `medida_registrada`, `medida_editada`, `medida_eliminada` (modulo 'perfil'), con replay y MIRROR_STORES. El store se reconstruye desde el log.
- Registrar un peso actualiza también `profile.pesoKg` con saveProfile (así IMC, TMB y estándares de fuerza usan el peso al día). Solo si la medida es la más reciente por fecha.
- Fotos solo en este dispositivo: store `fotos_progreso` (keyPath `id`) con { id, fecha, blob, ancho, alto, medidaId? }. Se guardan como Blob (no base64), reducidas a 1080 px en el lado largo, JPEG calidad 0,82. No se suben a Supabase ni entran al log de eventos (el evento `foto_agregada`/`foto_eliminada` lleva solo id y fecha, como auditoría). Excepción documentada a "todo se reconstruye desde events", igual que sync.js.
- Respaldo: el JSON de siempre NO lleva fotos (para que no pese). Configuración suma "Exportar fotos", que descarga un archivo aparte `vanguard-fotos-AAAA-MM-DD.json` con las imágenes en base64, e "Importar fotos" que lo lee. Mostrar el tamaño estimado antes de exportar.
- Dónde vive: Entreno › nueva sección "Cuerpo" (cian), no una pestaña nueva de la barra.

## Reglas que aplican
- Toda mutación pasa por db y emite logEvent; cada evento nuevo lleva su caso en applyRemoteEvent (sync.js) y, si toca un store, en el mapa de MIRROR_STORES. Los stores derivados tienen que poder reconstruirse desde `events`.
- Fechas con utils/fecha.js (nunca toISOString para claves de día). Números con utils/numero.js. Escapar con utils/escape.js.
- Modales con .modal-overlay + open (Atrás de Android vía history.js). Capturar ids antes de cualquier await.
- Archivos nuevos a PRECACHE_URLS; subir CACHE_NAME en cada commit con código. Imports relativos con .js; solo db.js importa idb.js (excepción documentada: sync.js).
- Acentos MK III: violeta = Tareas/Hábitos, cian = Entreno, ámbar = Finanzas, rojo solo alertas reales.
- La tabla de Estado nunca lleva el hash del commit que la edita; el commit de cierre no tiene fila propia.
- Un commit por fase; parar al final de cada tanda o ante fallas o decisiones. QA Playwright de a una, a 375 y a 1280, con consola y ESLint limpios. Informe con tabla de commit y caché, resultado de cada verificación y lo que no se pudo cumplir.
- Subir DB_VERSION de idb.js a 5 con los dos stores nuevos en F1; la migración solo crea stores, no toca los existentes. Probar abrir la app con una base v4 llena (datos demo) y confirmar que nada se pierde.

## Fases

### F1 · Datos de medidas
- DB_VERSION 5 con los dos stores nuevos, `medidas` y `fotos_progreso` (este último se usa recién en F4). `medidas` va a STORES_RESPALDO y MIRROR_STORES; `fotos_progreso` no va a ninguno de los dos.
- db: getMedidas(), registrarMedida(datos), editarMedida(id, cambios), eliminarMedida(id), ultimaMedida(campo). Validación: números > 0 y razonables (peso 30–300 kg, perímetros 20–200 cm).
- Actualización de profile.pesoKg según la decisión.
- Verificación: abrir con base v4 llena (nada se pierde), crear/editar/eliminar, replay en segundo contexto, exportar/importar respaldo.

### F2 · Registro y lista
- Entreno › "Cuerpo": tarjeta con el último peso y su variación contra hace 30 días ("78,4 kg · −1,2 en 30 días"), y botón "Registrar medidas".
- Hoja de registro (modal-overlay): fecha (hoy por defecto), peso y los 4 perímetros con teclado decimal, nota opcional. Muestra el valor anterior de cada campo como referencia.
- Historial: lista por fecha (más reciente arriba) con editar y eliminar (ConfirmDialog, id capturado antes del await).
- Verificación: registrar, editar, eliminar, Atrás con la hoja abierta, números es-CL.

### F3 · Gráficos
- Gráfico de peso (línea, 90 días por defecto, selector 30/90/365) con utils/charts.js, cargado diferido como en Laboratorio. Media móvil de 7 días como segunda línea tenue.
- Mini-gráficos para cada perímetro que tenga al menos 2 registros.
- Laboratorio de Entreno: una fila "Peso" con la variación del mes.
- Verificación: con 1 registro no se dibuja gráfico (estado vacío claro); con datos demo de 90 días los puntos cuadran con la tabla.

### F4 · Fotos (local)
- "Agregar foto" desde la sección Cuerpo y desde la hoja de registro: input file con accept="image/*" y capture para cámara. Reducir con canvas antes de guardar.
- Galería por fecha y vista de comparación "antes / ahora" (dos fotos lado a lado, elegibles).
- Aviso fijo y corto en la galería: "Las fotos quedan solo en este teléfono. Exporta tus fotos para no perderlas."
- Verificación: foto de 12 MP queda ≤ 1080 px y < 400 KB; recargar conserva; eliminar libera; Atrás con la comparación abierta.

### F5 · Exportar e importar fotos
- Configuración › Respaldo: "Exportar fotos" (con tamaño estimado y cantidad) e "Importar fotos" (no duplica ids existentes).
- Verificación: exportar 10 fotos, borrar datos del sitio, restaurar respaldo normal + importar fotos, todo vuelve.

### F6 · QA final y docs
- Recorrido a 375 y 1280; regresión de Entreno y del respaldo normal (el JSON sin fotos pesa lo mismo que antes).
- docs/PLAN.md: Fase 6 a "Hecho". CHANGELOG al día.

## Estado
| Fase | Commit | Caché |
|---|---|---|
| F1 Datos de medidas | 4110724 | v289 |
| F2 Registro y lista | | |
| F3 Gráficos | | |
| F4 Fotos (local) | | |
| F5 Exportar e importar fotos | | |
