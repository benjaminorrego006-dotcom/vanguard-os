// js/utils/bodyMetrics.js
// Funciones puras de cálculo corporal a partir del perfil de usuario.
// No tocan storage — eso vive en db.js (getProfile/saveProfile).

const ACTIVITY_FACTORS = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9
};

// Rangos OMS. Con solo 3 colores para 4 categorías: normal=verde,
// bajo peso y sobrepeso=ámbar (fuera de rango leve), obesidad=rojo
// (fuera de rango importante) — confirmado con el usuario.
export function calcularIMC(pesoKg, estaturaCm) {
  const peso = Number(pesoKg) || 0;
  const estaturaM = (Number(estaturaCm) || 0) / 100;
  if (peso <= 0 || estaturaM <= 0) return { valor: 0, categoria: 'Sin datos', color: 'var(--text-disabled)' };

  const valor = peso / (estaturaM * estaturaM);
  let categoria, color;
  if (valor < 18.5) { categoria = 'Bajo peso'; color = 'var(--state-medium)'; }
  else if (valor < 25) { categoria = 'Normal'; color = 'var(--state-low)'; }
  else if (valor < 30) { categoria = 'Sobrepeso'; color = 'var(--state-medium)'; }
  else { categoria = 'Obesidad'; color = 'var(--state-high)'; }

  return { valor: Math.round(valor * 10) / 10, categoria, color };
}

// Mifflin-St Jeor. Devuelve la TMB base (reposo) y el gasto diario
// estimado (TMB * factor de actividad, popularmente llamado "TMB
// ajustada" aunque técnicamente es el TDEE).
export function calcularTMB(profile) {
  if (!profile) return { tmbBase: 0, gastoDiario: 0 };
  const { pesoKg, estaturaCm, edad, sexo, nivelActividad } = profile;
  const peso = Number(pesoKg) || 0;
  const estatura = Number(estaturaCm) || 0;
  const anios = Number(edad) || 0;

  if (peso <= 0 || estatura <= 0 || anios <= 0) return { tmbBase: 0, gastoDiario: 0 };

  const base = 10 * peso + 6.25 * estatura - 5 * anios + (sexo === 'F' ? -161 : 5);
  const tmbBase = Math.round(Math.max(0, base));
  const factor = ACTIVITY_FACTORS[nivelActividad] || ACTIVITY_FACTORS.sedentario;
  const gastoDiario = Math.round(tmbBase * factor);

  return { tmbBase, gastoDiario };
}
