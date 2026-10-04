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

export function renderPlateCalculatorPopover(discos, pesoBarra) {
  if (discos.length === 0) {
    return `<div style="font-size: 13px; color: var(--text-secondary); text-align: center;">Solo barra vacía (${formatNumero(pesoBarra)} kg)</div>`;
  }

  // Colores típicos de bumpers / discos
  const colores = {
    25: 'var(--disco-25)', // Rojo
    20: 'var(--disco-20)', // Azul
    15: 'var(--disco-15)', // Amarillo
    10: 'var(--disco-10)', // Verde
    5: 'var(--disco-5)',  // Blanco
    2.5: 'var(--disco-2-5)', // Negro
    1.25: 'var(--disco-1-25)' // Gris
  };

  let discosHtml = '';
  discos.forEach(d => {
    const color = colores[d] || 'var(--disco-otro)';
    const textColor = d === 5 ? 'var(--disco-texto-claro)' : 'var(--disco-texto)';
    // Anchura visual simulada basada en el peso
    const width = Math.max(12, d * 1.5); 
    const height = Math.max(40, d * 3);

    discosHtml += `
      <div style="width: ${width}px; height: ${height}px; background: ${color}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; writing-mode: vertical-rl; transform: rotate(180deg); border: 1px solid var(--line);">
        ${formatNumero(d, { decimales: 2 })}
      </div>
    `;
  });

  return `
    <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
      <!-- Manga izquierda -->
      <div style="width: 20px; height: 16px; background: var(--disco-manga);"></div>
      <!-- Discos -->
      ${discosHtml}
      <!-- Centro barra -->
      <div style="width: 60px; height: 12px; background: var(--disco-barra); display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--disco-texto-claro); font-weight: bold;">
        ${formatNumero(pesoBarra)} kg
      </div>
      <!-- Discos invertidos para simetría visual (opcional, por espacio mejor solo un lado) -->
      <div style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">Por lado</div>
    </div>
  `;
}