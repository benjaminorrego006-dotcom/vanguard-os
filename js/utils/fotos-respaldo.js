// Respaldo aparte de las fotos de progreso (docs/FASE6-MEDIDAS.md, F5). El
// respaldo JSON de siempre no las lleva (para que no pese); este archivo,
// `vanguard-fotos-AAAA-MM-DD.json`, trae cada foto con su imagen en base64:
// { tipo: 'vanguard-fotos', version: 1, exportadoEn, fotos: [{ id, fecha,
//   ancho, alto, medidaId?, createdAt, mime, datos }] }.
// Importar no duplica: una foto cuyo id ya está en este dispositivo se salta.
import { db } from '../core/db.js';
import { Toast } from './states.js';
import { diaKeyDe } from './fecha.js';
import { formatNumero } from './numero.js';

const TIPO = 'vanguard-fotos';

// Bytes del archivo: el base64 pesa 4/3 de la imagen, más los datos de cada foto.
export function estimarBytes(resumen) {
  return Math.ceil(resumen.bytes * 4 / 3) + resumen.cantidad * 200 + 100;
}
// "unos 1,9 MB" / "unos 340 KB"
export function textoTamano(bytes) {
  return bytes >= 1024 * 1024
    ? `unos ${formatNumero(bytes / (1024 * 1024))} MB`
    : `unos ${formatNumero(Math.max(1, Math.round(bytes / 1024)), { decimales: 0 })} KB`;
}

async function aBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}
function deBase64(datos, mime) {
  const bin = atob(datos);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime || 'image/jpeg' });
}

export async function exportarFotos() {
  const fotos = await db.getFotos();
  if (!fotos.length) { Toast('No hay fotos para exportar', 'info'); return false; }
  const salida = [];
  for (const f of fotos) {
    salida.push({ id: f.id, fecha: f.fecha, ancho: f.ancho, alto: f.alto, ...(f.medidaId ? { medidaId: f.medidaId } : {}), createdAt: f.createdAt, mime: f.blob.type || 'image/jpeg', datos: await aBase64(f.blob) });
  }
  const archivo = JSON.stringify({ tipo: TIPO, version: 1, exportadoEn: new Date().toISOString(), fotos: salida });
  const url = URL.createObjectURL(new Blob([archivo], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `vanguard-fotos-${diaKeyDe(new Date())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  Toast(fotos.length === 1 ? '1 foto exportada' : `${fotos.length} fotos exportadas`, 'success');
  return true;
}

// Lee el archivo y agrega las fotos que falten. { agregadas, omitidas,
// invalidas } o
// null si el archivo no es un respaldo de fotos.
export async function importarFotos(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
  if (!data || data.tipo !== TIPO || !Array.isArray(data.fotos)) {
    Toast('El archivo no es un respaldo de fotos de Vanguard.', 'error');
    return null;
  }
  const lista = [];
  let invalidas = 0;
  for (const f of data.fotos) {
    try {
      if (!f || typeof f.id !== 'string' || typeof f.datos !== 'string') throw new Error('foto sin datos');
      lista.push({ id: f.id, fecha: f.fecha, ancho: f.ancho, alto: f.alto, medidaId: f.medidaId || null, createdAt: f.createdAt, blob: deBase64(f.datos, f.mime) });
    } catch (e) { invalidas++; }
  }
  const r = await db.importarFotos(lista);
  r.invalidas = invalidas;
  const partes = [r.agregadas === 1 ? '1 foto importada' : `${r.agregadas} fotos importadas`];
  if (r.omitidas) partes.push(`${r.omitidas} ya ${r.omitidas === 1 ? 'estaba' : 'estaban'}`);
  if (invalidas) partes.push(`${invalidas} no se ${invalidas === 1 ? 'pudo' : 'pudieron'} leer`);
  Toast(partes.join(' · '), r.agregadas ? 'success' : 'info');
  return r;
}
