export const PROGRESIONES = {
  flexiones: [
    'Flexiones en pared',
    'Flexiones inclinadas',
    'Flexiones con rodillas',
    'Flexiones (Empuje)',
    'Flexiones declinadas',
    'Flexiones diamante',
    'Flexiones de arquero',
    'Flexiones a una mano'
  ],
  dominadas: [
    'Remo invertido (Tracción)', // from our templates
    'Dominadas isométricas',
    'Dominadas negativas (Tracción)', // from templates
    'Dominadas asistidas (banda)',
    'Dominadas',
    'Dominadas lastradas'
  ],
  fondos: [
    'Fondos en silla (Empuje)', // from templates
    'Fondos asistidos',
    'Fondos',
    'Fondos en anillas',
    'Fondos lastrados'
  ],
  sentadillas: [
    'Sentadilla asistida',
    'Sentadillas (Piernas)', // from templates
    'Zancadas (Piernas)',    // from templates (often grouped as next step for unilateral)
    'Sentadilla búlgara',
    'Pistol squat asistida',
    'Pistol squat'
  ]
};

export function getProgressionLevel(ejercicioNombre) {
  const nombre = ejercicioNombre.toLowerCase().trim();
  
  for (const [familia, pasos] of Object.entries(PROGRESIONES)) {
    const stepIndex = pasos.findIndex(p => p.toLowerCase() === nombre || nombre.includes(p.toLowerCase()));
    if (stepIndex !== -1) {
      return {
        familia: familia,
        nivelActual: stepIndex + 1,
        nivelTotal: pasos.length,
        nombrePaso: pasos[stepIndex]
      };
    }
  }
  return null;
}