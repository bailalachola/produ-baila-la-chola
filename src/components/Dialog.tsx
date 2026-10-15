import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface OpcionDialogo<T extends string> {
  valor: T;
  label: string;
  tono?: 'primario' | 'peligro' | 'neutro';
}

interface Pedido {
  titulo: string;
  texto?: string;
  opciones: OpcionDialogo<string>[];
  resolver: (v: string | null) => void;
}

type PedirFn = <T extends string>(p: { titulo: string; texto?: string; opciones: OpcionDialogo<T>[] }) => Promise<T | null>;

const Ctx = createContext<PedirFn | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const pedir = useCallback<PedirFn>(
    (p) =>
      new Promise((resolve) => {
        setPedido({ ...p, resolver: resolve as (v: string | null) => void });
      }),
    [],
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (pedido && !d.open) d.showModal();
    if (!pedido && d.open) d.close();
  }, [pedido]);

  const cerrar = (v: string | null) => {
    pedido?.resolver(v);
    setPedido(null);
  };

  return (
    <Ctx.Provider value={pedir}>
      {children}
      <dialog
        ref={ref}
        className="dialogo"
        onCancel={(e) => {
          e.preventDefault();
          cerrar(null);
        }}
        aria-labelledby="dialogo-titulo"
      >
        {pedido && (
          <div className="dialogo__cuerpo">
            <h2 id="dialogo-titulo" className="dialogo__titulo">
              {pedido.titulo}
            </h2>
            {pedido.texto && <p className="dialogo__texto">{pedido.texto}</p>}
            <div className="dialogo__acciones">
              <button type="button" className="btn btn--ghost" onClick={() => cerrar(null)}>
                Mejor no
              </button>
              {pedido.opciones.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  className={`btn ${o.tono === 'peligro' ? 'btn--peligro' : o.tono === 'neutro' ? 'btn--secundario' : 'btn--primario'}`}
                  onClick={() => cerrar(o.valor)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

export function useDialogo(): PedirFn {
  const p = useContext(Ctx);
  if (!p) throw new Error('useDialogo fuera de DialogProvider');
  return p;
}

/** Atajo para un "¿seguro?" de una sola acción */
export function useConfirmar() {
  const pedir = useDialogo();
  return useCallback(
    async (titulo: string, texto: string, accion: string, peligro = true) =>
      (await pedir({ titulo, texto, opciones: [{ valor: 'si', label: accion, tono: peligro ? 'peligro' : 'primario' }] })) ===
      'si',
    [pedir],
  );
}
