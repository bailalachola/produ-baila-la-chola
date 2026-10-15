/**
 * CONFIGURACIÓN DE LA NUBE (Supabase)
 * -----------------------------------
 * Con estos dos valores la app guarda en la base de datos compartida y pide
 * login con Google. Si la clave queda vacía, la app funciona como antes:
 * todo se guarda solo en el navegador.
 *
 * La clave "anon" / "publishable" es pública por diseño (va en la página).
 * NUNCA pongas acá la "service_role" / "secret key".
 *
 * También se pueden pasar como variables de entorno al hacer el build:
 *   VITE_SUPABASE_URL=...  VITE_SUPABASE_KEY=...  npm run build
 */
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://ljnjoyjdcfrkemlagcxv.supabase.co';

export const SUPABASE_KEY: string =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_91s4u5H6xjkJngFrxIJvSw_6YJRlN5H';

/** Dentro del artifact de claude.ai no se puede usar Google ni Supabase: modo local */
function dentroDeArtifact(): boolean {
  try {
    return (
      window.self !== window.top ||
      typeof (window as unknown as { claude?: unknown }).claude !== 'undefined' ||
      window.location.hostname.endsWith('claudeusercontent.com')
    );
  } catch {
    // acceder a window.top puede tirar error en un iframe de otro origen
    return true;
  }
}

export const NUBE_ACTIVA = !!SUPABASE_URL && !!SUPABASE_KEY && !dentroDeArtifact();
