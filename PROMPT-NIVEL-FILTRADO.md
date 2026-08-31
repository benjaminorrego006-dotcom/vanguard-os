# Prompt para Claude Code — Sistema de nivel y filtrado inteligente

NO implementar hasta que las 11 entradas nuevas + las 77 rutinas + sw.js
estén terminadas y commiteadas. Este es el paso siguiente.

---

```
[CABECERA COMÚN]

ALCANCE: solo el módulo Entrenamiento. No toques vistas, componentes ni
lógica de Finanzas ni Tareas. db.js es compartido por los tres módulos: si un
cambio ahí afecta funciones de finanzas o tareas, PARA y avísame antes.

Reglas: Vanilla JS + ES Modules sin bundlers, imports relativos con .js.
IndexedDB solo vía db.js. MK III: cian (--cy) para Entreno, chaflanes vía
clip-path, monoespaciada, sin border-radius, sin sombras, rojo solo para
alertas reales. Reasignar listeners tras cada render. Archivos nuevos →
PRECACHE_URLS y subir CACHE_NAME.

Una tarea a la vez, commit propio, parar y esperar confirmación.
```

---

## SIGUIENTE PASO — Sistema de nivel y filtrado inteligente de rutinas

### PROBLEMA

Hay 77 rutinas en el catálogo. Mostrar todas agobia y confunde. El usuario
necesita ver solo las que le sirven según su nivel y su disponibilidad.

Además, el nivel declarado por tiempo no es suficiente: alguien que dice
"llevo 8 meses" pero ya hace 10 dominadas estrictas y sentadilla a 1.5× su
peso corporal no es principiante — está listo para intermedio aunque no haya
cumplido el año. La app debe detectar eso y sugerirle avanzar.

---

### a) PERFIL DE ENTRENAMIENTO

Preguntar una vez (onboarding al entrar por primera vez a Entrenamiento, o
desde Ajustes). Guardar en singletons vía db.js.

**Preguntas:**

1. **¿Cuánto tiempo llevas entrenando?**
   - Menos de 1 año → principiante
   - 1 a 3 años → intermedio
   - Más de 3 años → avanzado

   Este es el PUNTO DE PARTIDA, no la última palabra. El nivel puede subir
   automáticamente si el historial lo justifica (ver punto e).

2. **¿Cuántos días por semana puedes entrenar?** (2 a 6)

   Esto determina qué tipo de rutinas se muestran (ver punto c).

3. **¿Qué equipo tienes disponible?**

   Usar el enum del campo `equipo` del catálogo: ninguno, barra,
   mancuernas, banda, anillas, cajon, kettlebell, maquina, banco,
   barra-dominadas, rueda-ab. Selección múltiple.

   Esto filtra ejercicios que el usuario no puede hacer.

4. **¿Tu sexo?** (para los estándares de fuerza — los ratios cambian)

   Opcional. Si no responde, mostrar ambas columnas o solo el 1RM absoluto.

**Diseño:** NO es un formulario largo. Son 4 preguntas en tarjetas tipo
onboarding, una por pantalla, con respuestas de un toque. MK III: cian,
chaflanes, monoespaciada. Debe poder modificarse después desde Ajustes de
Entrenamiento.

---

### b) FILTRADO POR NIVEL

El usuario ve SOLO rutinas de su nivel:

- **Principiante** → ve las 2 rutinas de principiante de cada grupo
- **Intermedio** → ve las 2 de principiante + las 3 de intermedio
- **Avanzado** → ve todas

Si sube de nivel (manual o por sugerencia automática), las nuevas aparecen.

**No ocultar las de nivel inferior.** Un avanzado a veces quiere hacer una
rutina de principiante como recuperación activa. Pero las de su nivel van
primero, destacadas. Las inferiores quedan abajo, más discretas.

---

### c) LÓGICA MULTIARTICULAR vs ANALÍTICO según días disponibles

Esta es la regla más importante de diseño de programas. Menos días = más
ejercicios compuestos por sesión. Más días = se puede dedicar tiempo a
aislamiento.

| Días/semana | Lógica | Split sugerido |
|---|---|---|
| 2-3 | Casi todo compuesto/multiarticular: sentadilla, peso muerto, press banca, remo, dominadas. Los ejercicios de aislamiento (curl, extensión, face pull) se minimizan o eliminan | Full Body cada sesión |
| 4 | Base de compuestos + algo de aislamiento por sesión | Upper/Lower ×2 |
| 5-6 | Compuestos primero + aislamiento dedicado por grupo | PPL o split por músculo |

**Para que esto funcione automáticamente**, cada ejercicio del catálogo
necesita un campo nuevo:

```
tipoMovimiento: 'compuesto' | 'aislamiento'
```

Ejemplos:
- compuesto: sentadilla, press banca, peso muerto, dominadas, remo con barra,
  press militar, fondos en paralelas, flexiones, hip thrust, zancadas
- aislamiento: curl de bíceps, extensión de tríceps, elevaciones laterales,
  face pull, extensión de cuádriceps, curl femoral, elevación de talones

Cuando el usuario declara 2-3 días, las rutinas que se muestran priorizan
ejercicios compuestos. Con 5-6, se muestran las rutinas por grupo muscular
completas con aislamiento.

**No generar rutinas nuevas en tiempo real.** Usar las 77 existentes pero
FILTRAR y REORDENAR según los días declarados. Si el usuario dice 3 días, las
rutinas tipo "Full Body" van primero; las de aislamiento por grupo muscular
quedan disponibles pero abajo.

Si para 2-3 días no hay rutinas Full Body en las 77, CRÉALAS (serían ~6
nuevas: 2 principiante, 2 intermedio, 2 avanzado, usando solo ejercicios
compuestos).

---

### d) PRESENTACIÓN

En vez de una lista de 77 rutinas, el usuario ve:

```
┌──────────────────────────────────────────┐
│  Tu perfil: Intermedio · 4 días/semana   │
│  [Editar perfil]                         │
└──────────────────────────────────────────┘

Rutinas recomendadas para ti:
  [tarjeta] Pecho — Fuerza (Intermedio)
  [tarjeta] Pecho — Hipertrofia (Intermedio)
  [tarjeta] Pecho — Introducción (Principiante)
  ...

▸ Ver todas las rutinas (77)
```

Las rutinas de su nivel van primero, las inferiores después más discretas, y
un enlace para ver todo el catálogo si quiere explorar.

---

### e) AUTO-DETECCIÓN DE PROGRESO — la pieza clave

El nivel declarado es el punto de partida. Pero la app debe detectar cuando
el usuario ya supera su nivel y **sugerirle avanzar**.

**No subirlo automáticamente.** Sugerir. El usuario confirma. Razón: a veces
alguien tiene la fuerza pero no la técnica, y forzar el avance puede causar
lesiones.

**La detección es POR PATRÓN DE MOVIMIENTO, no global.** Alguien puede ser
intermedio en piernas (sentadilla fuerte) y seguir siendo principiante en
tracción (no hace una dominada). La sugerencia llega por separado para cada
patrón.

**Criterios concretos** (ya definidos en EJERCICIOS-NIVELES.md):

CALISTENIA — de principiante a intermedio:
- 15 flexiones estrictas registradas en una serie
- 5 dominadas estrictas registradas en una serie
- 20 sentadillas con peso corporal en una serie

CALISTENIA — de intermedio a avanzado:
- 25 flexiones estrictas
- 10 dominadas estrictas
- Negativas de pistol squat registradas

GYM — de principiante a intermedio (múltiplos de peso corporal en 1RM):
- Sentadilla ≥ 1.0×
- Press de Banca ≥ 0.75×
- Peso Muerto ≥ 1.25×
- Press Militar ≥ 0.5×

GYM — de intermedio a avanzado:
- Sentadilla ≥ 1.5×
- Press de Banca ≥ 1.25×
- Peso Muerto ≥ 2.0×
- Press Militar ≥ 0.9×

**Necesita peso corporal.** Sin ese dato no se pueden calcular los ratios de
gym. Si no está declarado, la detección solo funciona para calistenia (que usa
reps absolutas). La vista debe invitar a completar el dato.

**De dónde saca los datos:**
- getPRs() en db.js (ya existe, calcula 1RM estimado)
- getHistorialEjercicio() (ya existe)
- El log de eventos (ya tiene todo)

No crear un store nuevo. Es solo comparar lo que el usuario ha logrado contra
los umbrales.

**UX de la sugerencia:**

Cuando el historial muestre que el usuario cumple los criterios de avance EN
UN PATRÓN, mostrar un aviso NO intrusivo en la vista de Entrenamiento:

```
┌──────────────────────────────────────────────┐
│  📈 Tu progreso en Empuje ya es intermedio   │
│  Registraste 18 flexiones estrictas y tu     │
│  press de banca está en 1.1× tu peso.        │
│                                              │
│  ¿Desbloquear rutinas intermedias de pecho?  │
│                                              │
│  [Sí, subir de nivel]    [Ahora no]          │
└──────────────────────────────────────────────┘
```

- Mostrar los datos concretos que lo justifican (no un mensaje genérico)
- Cian para el borde y el ícono (es un logro de Entreno, no una alerta)
- Si elige "Ahora no", no volver a mostrar hasta que registre otra mejora
  significativa. No insistir.
- Si confirma, el nivel de ESE PATRÓN sube. Los otros patrones se quedan
  donde están.

**Qué pasa si el usuario se declaró avanzado pero su historial dice
principiante:** NADA. No le bajamos el nivel. Él sabe cuánto lleva
entrenando, aunque no haya usado esta app todo ese tiempo. Solo subimos,
nunca bajamos.

---

### f) CAMPO NUEVO EN EL CATÁLOGO

Para que (c) funcione, agregar a cada ejercicio:

```
tipoMovimiento: 'compuesto' | 'aislamiento'
```

Cambio puramente aditivo. No rompe nada. Verificar que las ~100 entradas lo
tengan.

---

### ORDEN DE IMPLEMENTACIÓN

1. Campo `tipoMovimiento` en el catálogo (commit propio)
2. Perfil de entrenamiento — onboarding + singleton (commit propio)
3. Filtrado de rutinas por nivel + días (commit propio)
4. Auto-detección de progreso + sugerencia de avance (commit propio)
5. Rutinas Full Body para 2-3 días si no existen (commit propio)

Propón el enfoque del punto 4 (cómo y cuándo evalúas los criterios — ¿en
cada render? ¿al guardar una sesión?) antes de codificar.
