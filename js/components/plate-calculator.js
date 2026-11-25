import { formatNumero } from '../utils/numero.js';

export function calcularDiscos(pesoObjetivo, pesoBarra = 20, discosDisponibles = [20, 15, 10, 5, 2.5, 1.25]) {
  if (pesoObjetivo <= pesoBarra) return [];

  let pesoRestantePorLado = (pesoObjetivo - pesoBarra) / 2;
  const discos = [];

  const disponibles = [...discosDisponibles].sort((a, b) => b - a);

  for (const disco of disponibles) {
    while (pesoRestantePorLado >= disco) {
      discos.push(disco);
      pesoRestantePorLado = Math.round((pesoRestantePorLado - disco) * 100) / 100;
    }
  }

  return discos;
}

// Discos por lado en la barra (popover de la sesión). Los colores son los
// de los discos reales (--disco-*, variables.css); el ancho y el alto de
// cada uno salen de su peso (--d) en css/entreno.css.
export function renderPlateCalculatorPopover(discos, pesoBarra) {
  if (discos.length === 0) {
    return `<p class="discos-vacio">Solo barra vacía (<span class="o-num">${formatNumero(pesoBarra)}</span> kg)</p>`;
  }
  const clase = (d) => ({ 25: '25', 20: '20', 15: '15', 10: '10', 5: '5', 2.5: '2-5', 1.25: '1-25' }[d] || 'otro');
  const discosHtml = discos.map(d => `<span class="disco disco--${clase(d)} o-num" style="--d: ${d}">${formatNumero(d, { decimales: 2 })}</span>`).join('');
  return `
    <div class="discos" role="img" aria-label="Por lado: ${discos.map(d => formatNumero(d, { decimales: 2 })).join(', ')} kg, barra de ${formatNumero(pesoBarra)} kg">
      <span class="discos-manga" aria-hidden="true"></span>
      ${discosHtml}
      <span class="discos-barra o-num">${formatNumero(pesoBarra)} kg</span>
      <span class="discos-lado">Por lado</span>
    </div>
  `;
}
