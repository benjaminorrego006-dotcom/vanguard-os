// Tipo de serie (docs/FASE7-CALENTAMIENTO-DESCANSO.md, F3). Las series de
// calentamiento no cuentan para volumen, récords, resumen ni Laboratorio:
// todo cálculo de rendimiento usa seriesDeTrabajo(). Una serie vieja sin
// `tipo` es normal.
export const esCalentamiento = (serie) => !!serie && serie.tipo === 'calentamiento';
export const seriesDeTrabajo = (series) => (Array.isArray(series) ? series : []).filter(s => !esCalentamiento(s));
