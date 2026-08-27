import { Toast, ConfirmDialog } from './states.js';

export function exportAllData() {
  const allData = {};
  Object.keys(localStorage)
    .filter(key => key.startsWith('vg_') || key.startsWith('vanguard:'))
    .forEach(key => {
      try {
        allData[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        // Ignorar si no se puede parsear
      }
    });

  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vanguard-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Toast("Respaldo exportado con éxito", "success");
}

// FIX: antes no retornaba nada (ni Promise ni boolean), por lo que
// `const res = await importAllData(file)` en finanzas.js siempre era `undefined`
// y el flujo de "Datos restaurados" / "Error al restaurar" nunca se ejecutaba
// correctamente. También usaba ConfirmDialog(mensaje, callback), firma que ya
// no existe tras unificarla en states.js.
export function importAllData(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        const vgKeys = Object.keys(data).filter(k => k.startsWith('vg_') || k.startsWith('vanguard:'));
        if (vgKeys.length === 0) {
          Toast("El archivo no contiene datos de Vanguard OS válidos.", "error");
          resolve(false);
          return;
        }

        const confirmed = await ConfirmDialog(
          "Restaurar respaldo",
          "Esto reemplazará todos tus datos actuales por los del respaldo. ¿Continuar?"
        );

        if (!confirmed) {
          resolve(false);
          return;
        }

        vgKeys.forEach(k => {
          localStorage.setItem(k, JSON.stringify(data[k]));
        });
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