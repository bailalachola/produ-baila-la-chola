import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NUBE_ACTIVA, SUPABASE_KEY, SUPABASE_URL } from '../config';

let cliente: SupabaseClient | null = null;

/** Cliente de Supabase (null en modo local o dentro del artifact). */
export function supabase(): SupabaseClient | null {
  if (!NUBE_ACTIVA) return null;
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        // PKCE: Google vuelve con ?code=… en la URL, que no choca con el
        // routing por hash (#/fecha/…) de la app.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'produ-blc:sesion',
      },
    });
  }
  return cliente;
}

/** Dirección a la que Google vuelve después del login: la app, sin el #… */
export function urlDeRetorno(): string {
  return window.location.origin + window.location.pathname;
}

/** ¿El error es por falta de conexión (y conviene reintentar después)? */
export function esErrorDeRed(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
  return /fetch|network|timeout|load failed|conexi/i.test(msg);
}
