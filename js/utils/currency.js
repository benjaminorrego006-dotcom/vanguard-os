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

// Negativos con el signo antes del símbolo ("-$10.000", no "$-10.000" como
// lo deja Intl en es-CL). Se formatea el valor absoluto y se antepone el
// signo, salvo que redondee a cero (-0,4 CLP es "$0", no "-$0").
function formatearConSigno(formatter, amount) {
  const safeAmount = toSafeNumber(amount);
  const texto = formatter.format(Math.abs(safeAmount));
  return safeAmount < 0 && texto !== formatter.format(0) ? '-' + texto : texto;
}

export function formatCurrency(amount) {
  return formatearConSigno(getFormatters().standardFormatter, amount);
}

export function formatCompactCurrency(amount) {
  return formatearConSigno(getFormatters().compactFormatter, amount);
}
