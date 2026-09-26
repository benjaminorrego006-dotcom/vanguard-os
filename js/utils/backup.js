import { Toast, ConfirmDialog } from './states.js';
import { db } from '../core/db.js';
import { diaKeyDe, diasEntre } from './fecha.js';

// Los stores de IndexedDB se leen y escriben a través de db.js
// (exportarDatosRespaldo / restaurarDatosRespaldo): solo db.js importa
// idb.js. La lista de stores que viajan en el respaldo vive allá
// (STORES_RESPALDO).

// Claves de localStorage que ya NO son la fuente de verdad (quedaron como
// copia congelada de antes de migrar a IndexedDB) — no se incluyen en un
// respaldo nuevo para no exportar datos desactualizados. Las pocas claves
// "vg_" que sí siguen viviendo en localStorage (preferencias sueltas como
// vg_hiit_voice/vg_currency) se exportan igual que siempre.
const LEGACY_KEYS_SUPERSEDED_BY_IDB = new Set([
  'vg_transactions', 'vg_savings_goals', 'vg_settings', 'vg_envelopes',
  'vg_recurring', 'vg_routines', 'vg_sessions', 'vg_profile', 'vg_tasks',
  'vg_pr_favoritos', 'vg_dummy_loaded', 'vg_migrated_to_idb',
  'vg_categories', 'vg_budgets'
]);

export async function exportAllData() {
  const idbData = await db.exportarDatosRespaldo();

  const localStorageData = {};
  Object.keys(localStorage)
    .filter(key => (key.startsWith('vg_') || key.startsWith('vanguard:')) && !LEGACY_KEYS_SUPERSEDED_BY_IDB.has(key))
    .forEach(key => {
      try {
        localStorageData[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        // Ignorar si no se puede parsear
      }
    });

  const allData = { version: 2, exportedAt: new Date().toISOString(), idb: idbData, localStorage: localStorageData };

  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vanguard-backup-${diaKeyDe(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Toast("Respaldo exportado con éxito", "success");

  // No crítico: si esto falla, el archivo ya se descargó igual — el usuario
  // solo perdería el aviso de "días desde el último respaldo" en Ajustes.
  try { await db.marcarRespaldoExportado(); }
  catch (e) { console.error('[Vanguard OS] Error guardando fecha de último respaldo', e); }
}

// Días transcurridos desde el último exportAllData() exitoso, o null si
// nunca se exportó un respaldo en este navegador. Usado en Ajustes de
// Finanzas para avisar cuando el respaldo manual quedó desactualizado.
export async function getDiasDesdeUltimoBackup() {
  const ts = await db.getUltimoRespaldoTs();
  if (ts === null) return null;
  // Días de calendario (claves), no bloques de 24 h restando ms.
  return diasEntre(diaKeyDe(new Date(ts)), diaKeyDe(new Date()));
}

async function restoreNewFormat(data) {
  await db.restaurarDatosRespaldo(data.idb || {});

  const localStorageData = data.localStorage || {};
  Object.keys(localStorageData).forEach(k => {
    localStorage.setItem(k, JSON.stringify(localStorageData[k]));
  });
  // Este respaldo YA es el estado completo en IndexedDB — no hace falta
  // (ni corresponde) volver a correr la migración desde localStorage.
  localStorage.setItem('vg_migrated_to_idb', 'true');
}

// Respaldos exportados ANTES de la migración a IndexedDB: son un objeto
// plano de claves "vg_"/"vanguard:" (el formato viejo de exportAllData).
// Se restauran escribiéndolas de vuelta en localStorage y reutilizando el
// mismo camino de migración que corre en db.init() al arrancar, en vez de
// duplicar acá la lógica de normalización + backfill de eventos.
async function restoreLegacyFormat(data) {
  const vgKeys = Object.keys(data).filter(k => k.startsWith('vg_') || k.startsWith('vanguard:'));
  vgKeys.forEach(k => {
    localStorage.setItem(k, JSON.stringify(data[k]));
  });
  localStorage.removeItem('vg_migrated_to_idb');
  await db.init();
}

export function importAllData(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        const isNewFormat = data && typeof data === 'object' && data.idb && typeof data.idb === 'object';
        const legacyVgKeys = (data && typeof data === 'object')
          ? Object.keys(data).filter(k => k.startsWith('vg_') || k.startsWith('vanguard:'))
          : [];

        if (!isNewFormat && legacyVgKeys.length === 0) {
          Toast("El archivo no contiene datos de Vanguard OS válidos.", "error");
          resolve(false);
          return;
        }

        const confirmed = await ConfirmDialog(
          "Restaurar respaldo",
          "Esto reemplazará todos tus datos actuales por los del respaldo. No se puede deshacer.",
          { verb: 'Restaurar' }
        );

        if (!confirmed) {
          resolve(false);
          return;
        }

        if (isNewFormat) {
          await restoreNewFormat(data);
        } else {
          await restoreLegacyFormat(data);
        }
        resolve(true);
      } catch (err) {
        Toast("Error al leer el archivo de respaldo. Formato inválido.", "error");
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}
