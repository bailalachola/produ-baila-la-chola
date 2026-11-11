import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { ahora, uid } from '../model/factory';
import { armarMensajeBitacora } from '../model/mensajeBitacora';
import { copiar } from '../lib/clipboard';
import { useBitacora } from '../pdf/useBitacora';
import { useConfirmar } from './Dialog';
import { useToast } from './Toast';
import { Icon, TextArea } from './ui';
import { FormatoWhatsApp } from '../views/IntegradorView';

/** El mensaje para compartir la Bitácora en Cholas organizativas */
export function MensajeBitacora({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const toast = useToast();
  const confirmar = useConfirmar();
  const { generar, generando } = useBitacora();
  const [corta, setCorta] = useState(true);
  const generado = useMemo(() => armarMensajeBitacora(fecha, corta), [fecha, corta]);
  const [editado, setEditado] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const texto = editado ?? generado;

  // si cambia la versión, se vuelve a armar
  useEffect(() => setEditado(null), [corta]);

  const yaCompartida = fecha.updates.some((u) => u.tema === 'Bitácora compartida');
  const puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator;

  async function onCopiar() {
    const ok = await copiar(texto);
    toast(ok ? 'Copiado. Pegalo en Cholas organizativas y adjuntá el PDF 📕' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }

  async function onCompartir() {
    setCompartiendo(true);
    try {
      const { generarBitacora, nombreArchivo } = await import('../pdf/bitacora');
      const pdf = new File([generarBitacora(fecha).output('blob')], nombreArchivo(fecha), { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [pdf] })) await navigator.share({ text: texto, files: [pdf] });
      else {
        await navigator.share({ text: texto });
        toast('Este dispositivo no deja compartir el PDF junto: bajalo aparte.', 'error');
      }
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') toast('No pudimos compartir. Probá copiar el texto.', 'error');
    } finally {
      setCompartiendo(false);
    }
  }

  async function onCompartida() {
    if (!(await confirmar('¿Ya la compartiste?', 'Queda registrado en los Updates de la fecha.', 'Sí, la compartí', false))) return;
    actualizar(fecha.id, (f) => ({
      ...f,
      updates: [...f.updates, { id: uid('upd'), cuando: ahora(), categoria: 'RESUELTO', tema: 'Bitácora compartida', texto: 'Compartimos la Bitácora Chola en Cholas organizativas.' }],
    }));
    toast('¡Listo! 💜');
  }

  return (
    <div className="bloque mensaje-bitacora">
      <h3 className="bloque__titulo">📕 Compartir la Bitácora</h3>
      <p className="mensaje-bitacora__bajada">
        El mensaje para Cholas organizativas, armado con lo que cargaron en la Retirada. Se manda junto con el PDF.
        {yaCompartida && <strong> Ya la compartieron ✓</strong>}
      </p>
      <div className="opciones" role="radiogroup" aria-label="Largo del mensaje">
        <button type="button" role="radio" aria-checked={corta} className={`chip ${corta ? 'is-on' : ''}`} onClick={() => setCorta(true)}>
          Versión corta
        </button>
        <button type="button" role="radio" aria-checked={!corta} className={`chip ${!corta ? 'is-on' : ''}`} onClick={() => setCorta(false)}>
          Versión completa
        </button>
      </div>

      {editando ? (
        <TextArea aria-label="Texto del mensaje" className="input input--area reporte__texto" rows={18} value={texto} onChange={(e) => setEditado(e.target.value)} />
      ) : (
        <div className="wa">
          <div className="wa__burbuja ensayo__wa">
            <FormatoWhatsApp texto={texto} />
          </div>
        </div>
      )}
      <div className="mensaje-bitacora__editar">
        <button type="button" className="link-btn" onClick={() => setEditando((x) => !x)}>
          {editando ? 'Ver cómo queda' : 'Editar el texto'}
        </button>
        {editado !== null && (
          <button type="button" className="link-btn" onClick={() => setEditado(null)}>
            Volver a armarlo desde la Retirada
          </button>
        )}
      </div>

      <div className="integrador__acciones">
        <button type="button" className="btn btn--mega btn--block" onClick={onCopiar}>
          <Icon name="copy" size={22} /> Copiar para WhatsApp
        </button>
        <div className="integrador__secundarias">
          {puedeCompartir && (
            <button type="button" className="btn btn--secundario" onClick={onCompartir} disabled={compartiendo}>
              {compartiendo ? 'Armando…' : 'Compartir con el PDF'}
            </button>
          )}
          <button type="button" className="btn btn--secundario" onClick={() => generar(fecha)} disabled={generando}>
            <Icon name="pdf" size={18} /> {generando ? 'Armando…' : 'Bajar el PDF'}
          </button>
        </div>
        {!yaCompartida && (
          <button type="button" className="btn btn--alt btn--block" onClick={onCompartida}>
            <Icon name="check" size={20} /> Ya la compartí
          </button>
        )}
      </div>
    </div>
  );
}
