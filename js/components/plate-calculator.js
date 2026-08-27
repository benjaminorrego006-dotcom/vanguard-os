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
    return `<div style="font-size: 13px; color: var(--text-secondary); text-align: center;">Solo barra vacía (${pesoBarra}kg)</div>`;
  }

  // Colores típicos de bumpers / discos
  const colores = {
    25: '#e53935', // Rojo
    20: '#1e88e5', // Azul
    15: '#fdd835', // Amarillo
    10: '#43a047', // Verde
    5: '#eeeeee',  // Blanco
    2.5: '#212121', // Negro
    1.25: '#757575' // Gris
  };

  let discosHtml = '';
  discos.forEach(d => {
    const color = colores[d] || '#555';
    const textColor = d === 5 ? '#000' : '#fff';
    // Anchura visual simulada basada en el peso
    const width = Math.max(12, d * 1.5); 
    const height = Math.max(40, d * 3);
    
    discosHtml += `
      <div style="width: ${width}px; height: ${height}px; background: ${color}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border-radius: 4px; writing-mode: vertical-rl; transform: rotate(180deg); border: 1px solid rgba(0,0,0,0.2);">
        ${d}
      </div>
    `;
  });

  return `
    <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
      <!-- Manga izquierda -->
      <div style="width: 20px; height: 16px; background: #9e9e9e; border-radius: 2px 0 0 2px;"></div>
      <!-- Discos -->
      ${discosHtml}
      <!-- Centro barra -->
      <div style="width: 60px; height: 12px; background: #bdbdbd; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #000; font-weight: bold; border-radius: 2px;">
        ${pesoBarra}kg
      </div>
      <!-- Discos invertidos para simetría visual (opcional, por espacio mejor solo un lado) -->
      <div style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">Por lado</div>
    </div>
  `;
}