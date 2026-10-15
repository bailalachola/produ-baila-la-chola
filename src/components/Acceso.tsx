import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { NUBE_ACTIVA } from '../config';
import { esErrorDeRed, supabase, urlDeRetorno } from '../services/supabase';
import { SupabaseRepository } from '../services/supabaseRepository';
import { usarRepositorio } from '../services/repository';
import { Marca } from './ui';

/**
 * ACCESO CON GOOGLE
 * -----------------
 * - En modo local (sin Supabase configurado, o dentro del artifact) no pide nada.
 * - En modo nube pide entrar con Google y verifica que el mail esté en la tabla
 *   `miembros`. Si está, activa el repositorio de Supabase y muestra la app.
 */

interface Sesion {
  modo: 'local' | 'nube';
  email?: string;
  nombre?: string;
  salir(): Promise<void>;
}

const Ctx = createContext<Sesion>({ modo: 'local', salir: async () => undefined });
export const useSesion = (): Sesion => useContext(Ctx);

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin-sesion'; error?: string }
  | { tipo: 'sin-acceso'; email: string }
  | { tipo: 'ok'; email: string; nombre?: string };

const CLAVE_MIEMBRO = 'produ-blc:miembro';

function recordarMiembro(email: string | null): void {
  try {
    if (email) window.localStorage.setItem(CLAVE_MIEMBRO, email.toLowerCase());
    else window.localStorage.removeItem(CLAVE_MIEMBRO);
  } catch {
    /* sin storage */
  }
}
function eraMiembro(email: string): boolean {
  try {
    return window.localStorage.getItem(CLAVE_MIEMBRO) === email.toLowerCase();
  } catch {
    return false;
  }
}

export function Acceso({ children }: { children: ReactNode }) {
  if (!NUBE_ACTIVA) {
    return <Ctx.Provider value={{ modo: 'local', salir: async () => undefined }}>{children}</Ctx.Provider>;
  }
  return <AccesoNube>{children}</AccesoNube>;
}

function AccesoNube({ children }: { children: ReactNode }) {
  const sb = supabase()!;
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  const verificar = useCallback(
    async (s: Session | null) => {
      const email = s?.user.email;
      if (!s || !email) {
        setEstado({ tipo: 'sin-sesion' });
        return;
      }
      const nombre = (s.user.user_metadata?.full_name as string | undefined) ?? undefined;
      const { data, error } = await sb.rpc('es_miembro');
      let ok = data === true;
      if (error) {
        // sin señal: si ya entró antes desde este dispositivo, la dejamos pasar con la copia local
        if (esErrorDeRed(error) && eraMiembro(email)) ok = true;
        else if (!esErrorDeRed(error)) {
          setEstado({ tipo: 'sin-sesion', error: 'No pudimos verificar tu acceso. Probá de nuevo en un rato.' });
          return;
        }
      }
      if (!ok) {
        recordarMiembro(null);
        setEstado({ tipo: 'sin-acceso', email });
        return;
      }
      recordarMiembro(email);
      usarRepositorio(new SupabaseRepository(sb, email));
      setEstado((prev) => (prev.tipo === 'ok' && prev.email === email ? prev : { tipo: 'ok', email, nombre }));
    },
    [sb],
  );

  useEffect(() => {
    let vivo = true;
    // el error de Google vuelve en la URL (?error_description=…)
    const params = new URLSearchParams(window.location.search);
    const errorUrl = params.get('error_description');

    sb.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      if (errorUrl && !data.session) setEstado({ tipo: 'sin-sesion', error: errorUrl });
      else void verificar(data.session);
      // limpiamos ?code=… de la barra de direcciones
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((evento, s) => {
      if (!vivo) return;
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') void verificar(s);
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [sb, verificar]);

  const entrar = async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlDeRetorno(), queryParams: { prompt: 'select_account' } },
    });
    if (error) setEstado({ tipo: 'sin-sesion', error: 'No pudimos abrir el acceso con Google. Revisá tu conexión.' });
  };

  const salir = useCallback(async () => {
    recordarMiembro(null);
    await sb.auth.signOut().catch(() => undefined);
    setEstado({ tipo: 'sin-sesion' });
  }, [sb]);

  if (estado.tipo === 'cargando') {
    return (
      <div className="cargando" aria-busy="true">
        <Marca grande />
      </div>
    );
  }

  if (estado.tipo === 'ok') {
    return (
      <Ctx.Provider value={{ modo: 'nube', email: estado.email, nombre: estado.nombre, salir }}>
        {/* key: si cambia la cuenta, la app se vuelve a montar con los datos nuevos */}
        <div key={estado.email}>{children}</div>
      </Ctx.Provider>
    );
  }

  return (
    <div className="acceso">
      <div className="acceso__caja">
        <Marca grande />
        {estado.tipo === 'sin-sesion' ? (
          <>
            <p className="acceso__texto">Entrá con tu Gmail para ver y producir las fechas de la murga.</p>
            {estado.error && (
              <p className="aviso aviso--alerta" role="alert">
                {estado.error}
              </p>
            )}
            <button type="button" className="btn btn--mega btn--block" onClick={entrar}>
              <LogoGoogle /> Entrar con Google
            </button>
            <p className="acceso__nota">Solo pueden entrar las personas que Producción habilitó.</p>
          </>
        ) : (
          <>
            <p className="acceso__texto">
              La cuenta <strong>{estado.email}</strong> todavía no está habilitada para La Produ.
            </p>
            <p className="acceso__nota">Pedile a alguien de Producción que te sume a la lista, y volvé a entrar.</p>
            <button type="button" className="btn btn--secundario btn--block" onClick={salir}>
              Entrar con otra cuenta
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LogoGoogle() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
