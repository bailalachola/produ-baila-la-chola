import type { SupabaseClient } from '@supabase/supabase-js';
import type { Link } from '../model/types';
import { REFERENCIAS_INICIALES, type Referencias } from '../model/viatico';
import { ID_DOCUMENTOS, esErrorDeRed } from './supabase';
import { SinConexion } from './supabaseRepository';

/**
 * DOCUMENTACIÓN Y ACCESOS (links generales de la murga, no de una fecha)
 * ----------------------------------------------------------------------
 * En la nube se guarda como una fila especial de la tabla `fechas`
 * (id `__documentos__`), así no hace falta crear otra tabla ni permisos.
 * El listado de fechas la ignora.
 */

export { ID_DOCUMENTOS };
const CLAVE_LOCAL = 'produ-blc:documentos';

/** Lo que aparece la primera vez, antes de que alguien edite */
export const DOCUMENTOS_INICIALES: Link[] = [
  {
    id: 'doc_rider_sonido',
    titulo: 'Rider de sonido',
    url: 'https://docs.google.com/document/d/12iJExLoF7lcMqNx8ltsgyUWpKG7so_Lx502vAiV14jQ/edit?tab=t.0',
    categoria: 'tecnica',
  },
];

export interface DocumentosRepo {
  cargar(): Promise<Link[]>;
  guardar(links: Link[]): Promise<void>;
  /** valores de referencia de la calculadora de viático (iguales para todas las fechas) */
  cargarReferencias(): Promise<Referencias>;
  guardarReferencias(r: Referencias): Promise<void>;
}

const CLAVE_REF = 'produ-blc:referencias';
function leerRefLocal(): Partial<Referencias> | null {
  try {
    const raw = window.localStorage.getItem(CLAVE_REF);
    return raw ? (JSON.parse(raw) as Partial<Referencias>) : null;
  } catch {
    return null;
  }
}
function escribirRefLocal(r: Referencias): void {
  try {
    window.localStorage.setItem(CLAVE_REF, JSON.stringify(r));
  } catch {
    /* sin storage */
  }
}

function leerLocal(): Link[] | null {
  try {
    const raw = window.localStorage.getItem(CLAVE_LOCAL);
    return raw ? (JSON.parse(raw) as Link[]) : null;
  } catch {
    return null;
  }
}
function escribirLocal(links: Link[]): void {
  try {
    window.localStorage.setItem(CLAVE_LOCAL, JSON.stringify(links));
  } catch {
    /* sin storage */
  }
}

class DocumentosLocal implements DocumentosRepo {
  async cargar() {
    return leerLocal() ?? DOCUMENTOS_INICIALES;
  }
  async guardar(links: Link[]) {
    escribirLocal(links);
  }
  async cargarReferencias() {
    return { ...REFERENCIAS_INICIALES, ...(leerRefLocal() ?? {}) };
  }
  async guardarReferencias(r: Referencias) {
    escribirRefLocal(r);
  }
}

export class DocumentosNube implements DocumentosRepo {
  constructor(
    private readonly sb: SupabaseClient,
    private readonly email: string,
  ) {}

  async cargar(): Promise<Link[]> {
    try {
      const { data, error } = await this.sb.from('fechas').select('data').eq('id', ID_DOCUMENTOS).maybeSingle();
      if (error) throw error;
      const links = (data?.data as { links?: Link[] } | undefined)?.links ?? DOCUMENTOS_INICIALES;
      escribirLocal(links);
      return links;
    } catch (e) {
      if (esErrorDeRed(e)) return leerLocal() ?? DOCUMENTOS_INICIALES;
      throw e;
    }
  }

  /** lee la fila especial completa (links + referencias) para no pisar lo que no se edita */
  private async filaActual(): Promise<Record<string, unknown>> {
    const { data, error } = await this.sb.from('fechas').select('data').eq('id', ID_DOCUMENTOS).maybeSingle();
    if (error) throw esErrorDeRed(error) ? new SinConexion() : error;
    return (data?.data as Record<string, unknown> | undefined) ?? {};
  }

  async cargarReferencias(): Promise<Referencias> {
    try {
      const fila = await this.filaActual();
      const r = { ...REFERENCIAS_INICIALES, ...((fila.referencias as Partial<Referencias> | undefined) ?? leerRefLocal() ?? {}) };
      escribirRefLocal(r);
      return r;
    } catch (e) {
      if (e instanceof SinConexion || esErrorDeRed(e)) return { ...REFERENCIAS_INICIALES, ...(leerRefLocal() ?? {}) };
      throw e;
    }
  }

  async guardarReferencias(r: Referencias): Promise<void> {
    escribirRefLocal(r);
    const fila = await this.filaActual();
    const { error } = await this.sb.from('fechas').upsert({
      id: ID_DOCUMENTOS,
      data: { id: ID_DOCUMENTOS, tipo: 'documentos', nombre: 'Documentación y accesos', ...fila, referencias: r },
      actualizada: new Date().toISOString(),
      actualizada_por: this.email,
    });
    if (error) throw esErrorDeRed(error) ? new SinConexion() : error;
  }

  async guardar(links: Link[]): Promise<void> {
    escribirLocal(links);
    const fila = await this.filaActual().catch(() => ({}));
    const { error } = await this.sb.from('fechas').upsert({
      id: ID_DOCUMENTOS,
      data: { id: ID_DOCUMENTOS, tipo: 'documentos', nombre: 'Documentación y accesos', ...fila, links },
      actualizada: new Date().toISOString(),
      actualizada_por: this.email,
    });
    if (error) throw esErrorDeRed(error) ? new SinConexion() : error;
  }
}

let actual: DocumentosRepo = new DocumentosLocal();
export const documentosRepo = (): DocumentosRepo => actual;
export function usarDocumentosRepo(r: DocumentosRepo): void {
  actual = r;
}
