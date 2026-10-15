import type { Fecha } from '../model/types';
import { normalizarFecha } from '../model/factory';

/**
 * CONTRATO DE PERSISTENCIA
 * ------------------------
 * La UI solo habla con esta interfaz (vía src/store.tsx). Hoy la implementa
 * LocalStorageRepository. Para migrar a Supabase/PostgreSQL alcanza con
 * escribir otra clase que implemente FechasRepository (ver README) y
 * cambiar la línea `export const repository = ...` al final de este archivo.
 *
 * Todos los métodos son async aunque localStorage sea sincrónico,
 * justamente para que el cambio a un backend real no toque la UI.
 */
export interface FechasRepository {
  listar(): Promise<Fecha[]>;
  guardar(fecha: Fecha): Promise<void>;
  eliminar(id: string): Promise<void>;
  /** reemplaza TODO (restaurar backup) */
  reemplazarTodo(fechas: Fecha[]): Promise<void>;
  /** true si nunca se guardó nada (para sembrar la fecha demo) */
  estaVacio(): Promise<boolean>;
  /** true si los datos viven en la nube (compartidos) */
  readonly remoto: boolean;
  /** reintenta subir lo que quedó pendiente; devuelve cuántos cambios quedan sin subir */
  sincronizar?(): Promise<number>;
}

interface Almacen {
  version: 1;
  fechas: Fecha[];
}

export const CLAVE_LOCAL = 'produ-blc:v1';

export class StorageError extends Error {}

export class LocalStorageRepository implements FechasRepository {
  readonly remoto = false;
  constructor(private readonly clave: string = CLAVE_LOCAL) {}

  private leer(): Almacen | null {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(this.clave);
    } catch {
      throw new StorageError('Este navegador no deja guardar datos (¿modo privado?).');
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Almacen;
      if (!Array.isArray(parsed.fechas)) throw new Error('formato');
      return { version: 1, fechas: parsed.fechas.map((f) => normalizarFecha(f)) };
    } catch {
      throw new StorageError('Los datos guardados están dañados. Restaurá un backup JSON.');
    }
  }

  private escribir(fechas: Fecha[]): void {
    try {
      window.localStorage.setItem(this.clave, JSON.stringify({ version: 1, fechas } satisfies Almacen));
    } catch {
      throw new StorageError('No pudimos guardar. Puede que el navegador se haya quedado sin espacio.');
    }
  }

  async listar(): Promise<Fecha[]> {
    return this.leer()?.fechas ?? [];
  }

  async guardar(fecha: Fecha): Promise<void> {
    const fechas = this.leer()?.fechas ?? [];
    const i = fechas.findIndex((f) => f.id === fecha.id);
    if (i >= 0) fechas[i] = fecha;
    else fechas.push(fecha);
    this.escribir(fechas);
  }

  async eliminar(id: string): Promise<void> {
    const fechas = (this.leer()?.fechas ?? []).filter((f) => f.id !== id);
    this.escribir(fechas);
  }

  async reemplazarTodo(fechas: Fecha[]): Promise<void> {
    this.escribir(fechas);
  }

  async estaVacio(): Promise<boolean> {
    try {
      return window.localStorage.getItem(this.clave) === null;
    } catch {
      return true;
    }
  }
}

/**
 * Repositorio activo. Arranca en modo local; cuando alguien entra con Google
 * y está habilitada, src/components/Acceso.tsx lo cambia por el de Supabase.
 */
let actual: FechasRepository = new LocalStorageRepository();
export const repositorio = (): FechasRepository => actual;
export function usarRepositorio(r: FechasRepository): void {
  actual = r;
}
