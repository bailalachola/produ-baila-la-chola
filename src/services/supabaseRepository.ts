import type { SupabaseClient } from '@supabase/supabase-js';
import type { Fecha } from '../model/types';
import { normalizarFecha } from '../model/factory';
import { LocalStorageRepository, type FechasRepository } from './repository';
import { esErrorDeRed } from './supabase';

/**
 * REPOSITORIO EN LA NUBE (Supabase / PostgreSQL)
 * ----------------------------------------------
 * Tabla `public.fechas (id text, data jsonb, actualizada timestamptz, actualizada_por text)`.
 * Solo las personas de la tabla `miembros` pueden leer o escribir (RLS).
 *
 * Funciona sin conexión: cada cambio se guarda primero en una copia local
 * del navegador y queda en una cola hasta que se puede subir.
 */

const CLAVE_CACHE = 'produ-blc:nube-cache';
const CLAVE_COLA = 'produ-blc:nube-cola';

interface Cola {
  guardar: string[];
  borrar: string[];
}

/** Error que no se arregla reintentando (permisos, datos inválidos…) */
export class ErrorNube extends Error {}

/** Sin conexión: el cambio quedó guardado en el dispositivo y se sube después */
export class SinConexion extends Error {
  constructor() {
    super('Sin conexión: el cambio queda guardado en este dispositivo y se sube al volver la señal.');
  }
}

export class SupabaseRepository implements FechasRepository {
  readonly remoto = true;
  private readonly cache = new LocalStorageRepository(CLAVE_CACHE);

  constructor(
    private readonly sb: SupabaseClient,
    private readonly email: string,
  ) {}

  /* ---------- cola de cambios sin subir ---------- */

  private leerCola(): Cola {
    try {
      const raw = window.localStorage.getItem(CLAVE_COLA);
      const c = raw ? (JSON.parse(raw) as Partial<Cola>) : {};
      return { guardar: c.guardar ?? [], borrar: c.borrar ?? [] };
    } catch {
      return { guardar: [], borrar: [] };
    }
  }

  private escribirCola(c: Cola): void {
    try {
      window.localStorage.setItem(CLAVE_COLA, JSON.stringify(c));
    } catch {
      /* sin storage: no hay cola, se reintenta con el próximo cambio */
    }
  }

  private encolar(tipo: keyof Cola, id: string): void {
    const c = this.leerCola();
    const otro: keyof Cola = tipo === 'guardar' ? 'borrar' : 'guardar';
    c[otro] = c[otro].filter((x) => x !== id);
    if (!c[tipo].includes(id)) c[tipo].push(id);
    this.escribirCola(c);
  }

  private desencolar(tipo: keyof Cola, id: string): void {
    const c = this.leerCola();
    c[tipo] = c[tipo].filter((x) => x !== id);
    this.escribirCola(c);
  }

  pendientes(): number {
    const c = this.leerCola();
    return c.guardar.length + c.borrar.length;
  }

  /* ---------- operaciones contra Supabase ---------- */

  private fallo(e: unknown): Error {
    if (esErrorDeRed(e)) return new SinConexion();
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === '42501' || code === 'PGRST301') {
      return new ErrorNube('Tu cuenta no tiene permiso para guardar. Pedile a Producción que te sume a la lista.');
    }
    const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
    return new ErrorNube(`No pudimos guardar en la base${msg ? `: ${msg}` : '.'}`);
  }

  private async subir(f: Fecha): Promise<void> {
    const { error } = await this.sb.from('fechas').upsert({
      id: f.id,
      data: f,
      actualizada: new Date().toISOString(),
      actualizada_por: this.email,
    });
    if (error) throw error;
  }

  private async borrarRemoto(id: string): Promise<void> {
    const { error } = await this.sb.from('fechas').delete().eq('id', id);
    if (error) throw error;
  }

  async listar(): Promise<Fecha[]> {
    // primero subimos lo que haya quedado pendiente, para no pisarlo con lo de la nube
    await this.sincronizar().catch(() => undefined);
    try {
      const { data, error } = await this.sb.from('fechas').select('data');
      if (error) throw error;
      const remotas = (data ?? []).map((r) => normalizarFecha((r as { data: Fecha }).data));
      // lo que todavía no se pudo subir manda sobre la versión de la nube
      const cola = this.leerCola();
      const locales = await this.cache.listar();
      const sinSubir = locales.filter((f) => cola.guardar.includes(f.id));
      const ids = new Set(sinSubir.map((f) => f.id));
      const lista = [
        ...remotas.filter((f) => !ids.has(f.id) && !cola.borrar.includes(f.id)),
        ...sinSubir,
      ];
      await this.cache.reemplazarTodo(lista);
      return lista;
    } catch (e) {
      if (esErrorDeRed(e)) return this.cache.listar(); // sin señal: lo último que vimos
      throw this.fallo(e);
    }
  }

  async guardar(f: Fecha): Promise<void> {
    await this.cache.guardar(f);
    this.encolar('guardar', f.id);
    try {
      await this.subir(f);
      this.desencolar('guardar', f.id);
    } catch (e) {
      throw this.fallo(e);
    }
  }

  async eliminar(id: string): Promise<void> {
    await this.cache.eliminar(id);
    this.encolar('borrar', id);
    try {
      await this.borrarRemoto(id);
      this.desencolar('borrar', id);
    } catch (e) {
      const err = this.fallo(e);
      if (err instanceof SinConexion) return; // se borra al volver la señal
      throw err;
    }
  }

  async reemplazarTodo(fechas: Fecha[]): Promise<void> {
    try {
      const ids = fechas.map((f) => f.id);
      const borrar = this.sb.from('fechas').delete();
      const { error: errBorrar } = ids.length
        ? await borrar.not('id', 'in', `(${ids.map((i) => `"${i.replace(/"/g, '')}"`).join(',')})`)
        : await borrar.neq('id', '');
      if (errBorrar) throw errBorrar;
      if (fechas.length) {
        const ahora = new Date().toISOString();
        const { error } = await this.sb
          .from('fechas')
          .upsert(fechas.map((f) => ({ id: f.id, data: f, actualizada: ahora, actualizada_por: this.email })));
        if (error) throw error;
      }
      await this.cache.reemplazarTodo(fechas);
      this.escribirCola({ guardar: [], borrar: [] });
    } catch (e) {
      throw this.fallo(e);
    }
  }

  async estaVacio(): Promise<boolean> {
    const { count, error } = await this.sb.from('fechas').select('id', { count: 'exact', head: true });
    if (error) return false; // ante la duda, no sembramos nada
    return (count ?? 0) === 0;
  }

  /** Sube todo lo que quedó en la cola. Devuelve cuántos cambios siguen sin subir. */
  async sincronizar(): Promise<number> {
    const cola = this.leerCola();
    if (!cola.guardar.length && !cola.borrar.length) return 0;
    const locales = await this.cache.listar();
    for (const id of cola.guardar) {
      const f = locales.find((x) => x.id === id);
      if (!f) {
        this.desencolar('guardar', id);
        continue;
      }
      try {
        await this.subir(f);
        this.desencolar('guardar', id);
      } catch (e) {
        if (esErrorDeRed(e)) break;
      }
    }
    for (const id of cola.borrar) {
      try {
        await this.borrarRemoto(id);
        this.desencolar('borrar', id);
      } catch (e) {
        if (esErrorDeRed(e)) break;
      }
    }
    return this.pendientes();
  }
}
