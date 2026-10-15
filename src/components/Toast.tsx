import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tipo = 'ok' | 'error';
type ToastFn = (mensaje: string, tipo?: Tipo) => void;

const Ctx = createContext<ToastFn>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; mensaje: string; tipo: Tipo }[]>([]);

  const toast = useCallback<ToastFn>((mensaje, tipo = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), tipo === 'error' ? 6000 : 2600);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipo}`}>
            {t.mensaje}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = (): ToastFn => useContext(Ctx);
