import type { Fecha } from '../model/types';
import { normalizarFecha } from '../model/factory';
import { hoyISO } from '../model/logic';

export const FORMATO_BACKUP = 'produ-baila-la-chola';

export interface Backup {
  formato: typeof FORMATO_BACKUP;
  version: 1;
  exportado: string;
  fechas: Fecha[];
}

interface DownloadsApi {
  save(req: { filename: string; data: Blob }): Promise<unknown>;
}
interface ClaudeHost {
  use(name: 'downloads'): Promise<DownloadsApi | null>;
}

/**
 * Descarga un archivo. Si la app corre dentro de un artifact de claude.ai
 * (donde los links de descarga están bloqueados), usa el permiso de
 * descargas del visor; en GitHub Pages o en local, un link normal.
 * Devuelve false si la persona canceló.
 */
export async function descargarArchivo(nombre: string, contenido: Blob): Promise<boolean> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    const downloads = await host.use('downloads').catch(() => null);
    if (downloads) {
      try {
        await downloads.save({ filename: nombre, data: contenido });
        return true;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'declined') return false;
        throw new Error('No pudimos descargar el archivo en esta vista.');
      }
    }
  }
  const url = URL.createObjectURL(contenido);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function exportarBackup(fechas: Fecha[]): Promise<boolean> {
  const data: Backup = {
    formato: FORMATO_BACKUP,
    version: 1,
    exportado: new Date().toISOString(),
    fechas,
  };
  return descargarArchivo(
    `produ-backup-${hoyISO()}.json`,
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
}

/** Lee y valida un JSON exportado. Tira Error con mensaje legible si no sirve. */
export async function leerBackup(file: File): Promise<Fecha[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Ese archivo no es un JSON válido.');
  }
  const obj = parsed as Partial<Backup> | Fecha[];
  const lista = Array.isArray(obj) ? obj : obj.fechas;
  if (!Array.isArray(lista)) {
    throw new Error('No encontramos fechas en ese archivo. ¿Es un backup de La Produ?');
  }
  const fechas = lista.filter(
    (f): f is Fecha => typeof f === 'object' && f !== null && typeof (f as Fecha).id === 'string',
  );
  if (fechas.length === 0) throw new Error('El backup no tiene ninguna fecha.');
  return fechas.map((f) => normalizarFecha(f));
}
