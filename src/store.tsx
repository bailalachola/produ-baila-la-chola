import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Fecha, NuevaFechaInput } from './model/types';
import { ahora, crearFecha } from './model/factory';
import { DEMO_ID, DEMO_VERSION, completarConNoAplica, fechaDemo } from './model/demo';
import { progresoGeneral } from './model/logic';
import { actividadInicial, nombreCorto, registrarActividad } from './model/actividad';
import { useSesion } from './components/Acceso';
import { CLAVE_LOCAL, LocalStorageRepository, repositorio } from './services/repository';
import { SinConexion } from './services/supabaseRepository';
import { useToast } from './components/Toast';

/**
 * Estado global de la app. Cada cambio se autoguarda en el repositorio activo
 * (navegador o nube). Las vistas nunca tocan el almacenamiento directamente.
 */

/** ok: todo guardado · guardando · pendiente: sin señal, se sube después · error */
export type EstadoGuardado = 'ok' | 'guardando' | 'pendiente' | 'error';

interface Store {
  fechas: Fecha[];
  cargando: boolean;
  error: string | null;
  guardado: EstadoGuardado;
  remoto: boolean;
  crear(input: NuevaFechaInput): Fecha;
  actualizar(id: string, cambio: (f: Fecha) => Fecha): void;
  eliminar(id: string): Promise<void>;
  importar(fechas: Fecha[], modo: 'sumar' | 'reemplazar'): Promise<void>;
  cargarDemo(): void;
  recargar(): Promise<void>;
  tieneDemo: boolean;
}

const Ctx = createContext<Store | null>(null);

/** espera antes de subir un cambio (para no mandar una escritura por cada tecla) */
const DEMORA_GUARDADO = 700;
const CLAVE_MIGRADO = 'produ-blc:migrado-a-nube';
const CLAVE_CORDOBA = 'produ-blc:cordoba-sembrada';

function leerMarca(clave: string): boolean {
  try {
    return !!window.localStorage.getItem(clave);
  } catch {
    return false;
  }
}
function ponerMarca(clave: string): void {
  try {
    window.localStorage.setItem(clave, new Date().toISOString());
  } catch {
    /* sin storage */
  }
}

/** La primera vez que se entra a la nube desde un dispositivo, sube las fechas que había en el navegador. */
async function migrarLocal(): Promise<number> {
  const repo = repositorio();
  if (!repo.remoto) return 0;
  try {
    if (window.localStorage.getItem(CLAVE_MIGRADO)) return 0;
  } catch {
    return 0;
  }
  const locales = (await new LocalStorageRepository(CLAVE_LOCAL).listar()).filter((f) => f.id !== DEMO_ID);
  const enNube = new Set((await repo.listar()).map((f) => f.id));
  const nuevas = locales.filter((f) => !enNube.has(f.id));
  for (const f of nuevas) await repo.guardar(f);
  try {
    window.localStorage.setItem(CLAVE_MIGRADO, new Date().toISOString());
  } catch {
    /* sin storage */
  }
  return nuevas.length;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [fechas, setFechas] = useState<Fecha[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<EstadoGuardado>('ok');
  const toast = useToast();
  const sesion = useSesion();
  // quién está usando la app, para las novedades
  const autorRef = useRef('Vos');
  autorRef.current = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : 'Vos';
  const fechasRef = useRef(fechas);
  fechasRef.current = fechas;
  const remoto = repositorio().remoto;

  /* ---------- guardado con demora, por fecha ---------- */

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const enVuelo = useRef(0);

  const subir = useCallback(
    async (f: Fecha) => {
      enVuelo.current += 1;
      setGuardado('guardando');
      try {
        await repositorio().guardar(f);
        if (timers.current.size === 0 && enVuelo.current === 1) setGuardado('ok');
      } catch (e) {
        if (e instanceof SinConexion) setGuardado('pendiente');
        else {
          setGuardado('error');
          toast(e instanceof Error ? e.message : 'No pudimos guardar el cambio.', 'error');
        }
      } finally {
        enVuelo.current -= 1;
      }
    },
    [toast],
  );

  const persistir = useCallback(
    (f: Fecha, inmediato = false) => {
      const t = timers.current.get(f.id);
      if (t) clearTimeout(t);
      if (inmediato) {
        timers.current.delete(f.id);
        void subir(f);
        return;
      }
      setGuardado('guardando');
      timers.current.set(
        f.id,
        setTimeout(() => {
          timers.current.delete(f.id);
          const actual = fechasRef.current.find((x) => x.id === f.id);
          if (actual) void subir(actual);
        }, DEMORA_GUARDADO),
      );
    },
    [subir],
  );

  /** sube ya todo lo que está esperando (al cerrar o esconder la pestaña) */
  const vaciarPendientes = useCallback(() => {
    for (const [id, t] of timers.current) {
      clearTimeout(t);
      const f = fechasRef.current.find((x) => x.id === id);
      if (f) void subir(f);
    }
    timers.current.clear();
  }, [subir]);

  /* ---------- carga inicial ---------- */

  const cargarLista = useCallback(async (): Promise<Fecha[]> => {
    const repo = repositorio();
    let lista = await repo.listar();
    // si la fecha demo es de una versión anterior, se reemplaza por la nueva
    const vieja = lista.find((f) => f.id === DEMO_ID && (f.demo ?? 1) < DEMO_VERSION);
    if (vieja) {
      const nueva = fechaDemo();
      await repo.guardar(nueva).catch(() => undefined);
      lista = lista.map((f) => (f.id === DEMO_ID ? nueva : f));
    }
    // Córdoba es un registro cerrado: si el checklist suma preguntas nuevas, quedan como "No aplica"
    const cordoba = lista.find((f) => f.id === DEMO_ID && f.estado === 'cerrada');
    if (cordoba && progresoGeneral(cordoba).porcentaje < 100) {
      const completa = { ...cordoba, respuestas: completarConNoAplica(cordoba.respuestas) };
      await repo.guardar(completa).catch(() => undefined);
      lista = lista.map((f) => (f.id === DEMO_ID ? completa : f));
    }
    return lista;
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const migradas = await migrarLocal().catch(() => 0);
        let lista = await cargarLista();
        // la fecha de Córdoba queda siempre como primer registro (salvo que se haya borrado desde este dispositivo)
        if (!lista.some((f) => f.id === DEMO_ID) && !leerMarca(CLAVE_CORDOBA)) {
          const cordoba = fechaDemo();
          try {
            await repositorio().guardar(cordoba);
            lista = [...lista, cordoba];
          } catch (e) {
            console.error('No pudimos cargar la fecha de Córdoba', e);
            if (vivo) toast(`No pudimos cargar la fecha de Córdoba: ${e instanceof Error ? e.message : 'error'}`, 'error');
          }
        }
        if (lista.some((f) => f.id === DEMO_ID)) ponerMarca(CLAVE_CORDOBA);
        if (!vivo) return;
        setFechas(lista);
        if (migradas) toast(`Subimos a la base ${migradas} fecha(s) que estaban en este dispositivo.`);
        const quedan = repositorio().sincronizar ? await repositorio().sincronizar!() : 0;
        if (vivo && quedan) setGuardado('pendiente');
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'No pudimos leer los datos guardados.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [cargarLista, toast]);

  /* ---------- traer cambios de otras personas ---------- */

  const recargar = useCallback(async () => {
    const repo = repositorio();
    if (!repo.remoto) return;
    if (timers.current.size || enVuelo.current) return; // hay cambios propios en camino
    try {
      const quedan = repo.sincronizar ? await repo.sincronizar() : 0;
      const lista = await repo.listar();
      if (timers.current.size || enVuelo.current) return;
      fechasRef.current = lista;
      setFechas(lista);
      setGuardado(quedan ? 'pendiente' : 'ok');
    } catch {
      /* sin señal: seguimos con lo que hay */
    }
  }, []);

  useEffect(() => {
    if (!remoto) return;
    const alVolver = () => {
      if (document.visibilityState === 'visible') void recargar();
      else vaciarPendientes();
    };
    const alConectar = () => void recargar();
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alConectar);
    window.addEventListener('pagehide', vaciarPendientes);
    const cada = setInterval(() => {
      if (document.visibilityState === 'visible') void recargar();
    }, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alConectar);
      window.removeEventListener('pagehide', vaciarPendientes);
      clearInterval(cada);
    };
  }, [remoto, recargar, vaciarPendientes]);

  // modo local: igual subimos al cerrar, por si quedó algo esperando
  useEffect(() => {
    if (remoto) return;
    window.addEventListener('pagehide', vaciarPendientes);
    return () => window.removeEventListener('pagehide', vaciarPendientes);
  }, [remoto, vaciarPendientes]);

  /* ---------- acciones ---------- */

  const crear = useCallback(
    (input: NuevaFechaInput) => {
      const base = crearFecha(input);
      const f = { ...base, actividad: [actividadInicial(base, autorRef.current)] };
      fechasRef.current = [...fechasRef.current, f];
      setFechas(fechasRef.current);
      persistir(f, true);
      return f;
    },
    [persistir],
  );

  const actualizar = useCallback(
    (id: string, cambio: (f: Fecha) => Fecha) => {
      const actual = fechasRef.current.find((f) => f.id === id);
      if (!actual) return;
      const nueva = registrarActividad(actual, { ...cambio(actual), actualizada: ahora() }, autorRef.current);
      const lista = fechasRef.current.map((f) => (f.id === id ? nueva : f));
      fechasRef.current = lista;
      setFechas(lista);
      persistir(nueva);
    },
    [persistir],
  );

  const eliminar = useCallback(async (id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    await repositorio().eliminar(id);
    fechasRef.current = fechasRef.current.filter((f) => f.id !== id);
    setFechas(fechasRef.current);
  }, []);

  const importar = useCallback(async (entrantes: Fecha[], modo: 'sumar' | 'reemplazar') => {
    let resultado: Fecha[];
    if (modo === 'reemplazar') resultado = entrantes;
    else {
      const ids = new Set(entrantes.map((f) => f.id));
      resultado = [...fechasRef.current.filter((f) => !ids.has(f.id)), ...entrantes];
    }
    await repositorio().reemplazarTodo(resultado);
    fechasRef.current = resultado;
    setFechas(resultado);
  }, []);

  const cargarDemo = useCallback(() => {
    const demo = fechaDemo();
    fechasRef.current = [...fechasRef.current.filter((f) => f.id !== DEMO_ID), demo];
    setFechas(fechasRef.current);
    persistir(demo, true);
  }, [persistir]);

  const value = useMemo<Store>(
    () => ({
      fechas,
      cargando,
      error,
      guardado,
      remoto,
      crear,
      actualizar,
      eliminar,
      importar,
      cargarDemo,
      recargar,
      tieneDemo: fechas.some((f) => f.id === DEMO_ID),
    }),
    [fechas, cargando, error, guardado, remoto, crear, actualizar, eliminar, importar, cargarDemo, recargar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}
