// Números de la app (no montos de dinero: esos van por utils/currency.js)
// con formato es-CL: coma decimal y punto de miles ("52,5", "1.522,5").
// Acepta números o texto numérico; lo que no es número devuelve '' (o el
// texto tal cual si `textoSiNoEsNumero`, para reps como "30s").
export function formatNumero(valor, { decimales = 1, textoSiNoEsNumero = false } = {}) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) return textoSiNoEsNumero ? String(valor) : '';
  return n.toLocaleString('es-CL', { maximumFractionDigits: decimales });
}

// "52,5 kg"
export function formatKg(valor) {
  const t = formatNumero(valor);
  return t === '' ? '' : `${t} kg`;
}
