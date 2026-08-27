import { formatCurrency, formatCompactCurrency } from './currency.js';

export function animateNumber(el, from, to, duration = 500, isCurrency = false, isCompact = false) {
  const start = performance.now();
  
  const step = (timestamp) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    // ease-out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * easeProgress;
    
    if (isCurrency) {
      if (isCompact) el.innerText = formatCompactCurrency(current);
      else el.innerText = formatCurrency(current);
    } else {
      el.innerText = Math.round(current);
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // Ensure exact final value
      if (isCurrency) {
        if (isCompact) el.innerText = formatCompactCurrency(to);
        else el.innerText = formatCurrency(to);
      } else {
        el.innerText = to;
      }
    }
  };

  requestAnimationFrame(step);
}