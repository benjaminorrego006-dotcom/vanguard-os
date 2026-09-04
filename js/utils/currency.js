let cachedCurrency = null;
let standardFormatter = null;
let compactFormatter = null;

export function getCurrency() {
  return localStorage.getItem('vg_currency') || 'CLP';
}

export function setCurrency(code) {
  localStorage.setItem('vg_currency', code);
  cachedCurrency = null; // Invalidate cache
}

export function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getFormatters() {
  const currency = getCurrency();
  if (cachedCurrency === currency && standardFormatter && compactFormatter) {
    return { standardFormatter, compactFormatter };
  }
  
  // Locale fijo en 'es-CL': navigator.language puede ser en-US aunque la
  // moneda configurada sea CLP, lo que rompe el separador de miles/decimales.
  const locale = 'es-CL';
  const noDecimals = ['CLP', 'COP', 'PYG', 'CLF'].includes(currency);

  standardFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2
  });

  compactFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  });

  cachedCurrency = currency;
  return { standardFormatter, compactFormatter };
}

export function formatCurrency(amount) {
  const safeAmount = toSafeNumber(amount);
  const { standardFormatter } = getFormatters();
  return standardFormatter.format(safeAmount);
}

export function formatCompactCurrency(amount) {
  const safeAmount = toSafeNumber(amount);
  const { compactFormatter } = getFormatters();
  return compactFormatter.format(safeAmount);
}