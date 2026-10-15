import { useCallback, useState } from 'react';
import type { Fecha } from '../model/types';
import { useToast } from '../components/Toast';
import { descargarArchivo } from '../services/backup';

/** Genera y descarga la bitácora. jsPDF se carga recién al usarlo (bundle inicial liviano). */
export function useBitacora() {
  const [generando, setGenerando] = useState(false);
  const toast = useToast();

  const generar = useCallback(
    async (f: Fecha) => {
      setGenerando(true);
      try {
        const { generarBitacora, nombreArchivo } = await import('./bitacora');
        const pdf = generarBitacora(f);
        const ok = await descargarArchivo(nombreArchivo(f), pdf.output('blob'));
        if (ok) toast('Bitácora lista 📄');
      } catch (e) {
        console.error(e);
        toast('No pudimos generar la bitácora. Probá de nuevo.', 'error');
      } finally {
        setGenerando(false);
      }
    },
    [toast],
  );

  return { generar, generando };
}
