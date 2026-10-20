import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { ahora, uid } from '../model/factory';
import { fechaHora } from '../model/logic';
import { OPCIONES_REPORTE, armarReporte, cambiosDesde, type OpcionesReporte } from '../model/reporte';
import { copiar } from '../lib/clipboard';
import { useBitacora } from '../pdf/useBitacora';
import { useConfirmar } from './Dialog';
import { useToast } from './Toast';
import { Icon, TextArea } from './ui';

/**
 * Update de la fecha para el grupo: se arma con el checklist, la produ lo ajusta
 * y lo manda ella. Nada se envía solo.
 */
export function ReporteGrupo({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const toast = useToast();
  const confirmar = useConfirmar();
  const { generar, generando } = useBitacora();
  const [op, setOp] = useState<OpcionesReporte>(OPCIONES_REPORTE);
  const [compartiendo, setCompartiendo] = useState(false);

  const generado = useMemo(() => armarReporte(fecha, op), [fecha, op]);
  const editado = fecha.reporteBorrador !== undefined;
  const texto = fecha.reporteBorrador ?? generado;
  const cambios = cambiosDesde(fecha);

  const setBorrador = (v: string | undefined) => actualizar(fecha.id, (f) => ({ ...f, reporteBorrador: v }));
  const toggle = (k: keyof OpcionesReporte) => setOp((o) => ({ ...o, [k]: !o[k] }));

  async function onCopiar() {
    const ok = await copiar(texto);
    toast(ok ? 'Update copiado. Cuando lo mandes, marcalo como enviado 💬' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }

  async function onCompartirConBitacora() {
    setCompartiendo(true);
    try {
      const { generarBitacora, nombreArchivo } = await import('../pdf/bitacora');
      const pdf = new File([generarBitacora(fecha).output('blob')], nombreArchivo(fecha), { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [pdf] })) {
        await navigator.share({ text: texto, files: [pdf] });
      } else {
        await navigator.share({ text: texto });
        toast('Este dispositivo no deja compartir el PDF junto: bajalo aparte.', 'error');
      }
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') toast('No pudimos compartir. Probá copiar el texto.', 'error');
    } finally {
      setCompartiendo(false);
    }
  }

  async function onEnviado() {
    const ok = await confirmar(
      '¿Ya lo mandaste?',
      'Queda guardado en los Updates de la fecha, y el próximo update va a marcar con 🆕 lo que cambie a partir de ahora.',
      'Sí, lo mandé',
      false,
    );
    if (!ok) return;
    const cuando = ahora();
    actualizar(fecha.id, (f) => ({
      ...f,
      ultimoReporte: cuando,
      reporteBorrador: undefined,
      updates: [...f.updates, { id: uid('upd'), cuando, categoria: 'UPDATE', tema: 'Update al grupo', texto }],
    }));
    toast('Listo, quedó registrado. ¡Seguimos! 💜');
  }

  async function onRearmar() {
    if (await confirmar('¿Rearmamos el texto?', 'Se pierden los cambios que hiciste a mano y se vuelve a armar con lo que dice el checklist.', 'Rearmar')) {
      setBorrador(undefined);
    }
  }

  const puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <div className="reporte">
      <h3 className="reporte__titulo">Update de la fecha para el grupo</h3>
      <p className="reporte__bajada">
        Se arma solo con el checklist: lo que ya está ✅, lo que falta 🟡 y los próximos pasos. Revisalo, ajustalo y mandalo vos.
      </p>
      <p className="reporte__ultimo">
        {fecha.ultimoReporte
          ? `Último update enviado: ${fechaHora(fecha.ultimoReporte)}. ${
              cambios ? `Desde entonces ${cambios === 1 ? 'cambió 1 cosa' : `cambiaron ${cambios} cosas`} (van con 🆕).` : 'Desde entonces no cambió nada.'
            }`
          : 'Todavía no mandaste ningún update de esta fecha.'}
      </p>

      <div className="reporte__opciones">
        <label className="check">
          <input type="checkbox" checked={op.sinResponder} onChange={() => toggle('sinResponder')} disabled={editado} />
          <span>Sumar como pendiente lo que todavía no respondimos</span>
        </label>
        {fecha.ultimoReporte && (
          <label className="check">
            <input type="checkbox" checked={op.marcarNuevo} onChange={() => toggle('marcarNuevo')} disabled={editado} />
            <span>Marcar con 🆕 lo que cambió</span>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={op.bitacora} onChange={() => toggle('bitacora')} disabled={editado} />
          <span>Cerrar con el párrafo de la bitácora</span>
        </label>
      </div>

      {editado && (
        <p className="reporte__editado">
          Lo editaste a mano, así que no se actualiza solo.{' '}
          <button type="button" className="link-btn" onClick={onRearmar}>
            Rearmar desde el checklist
          </button>
        </p>
      )}

      <TextArea
        aria-label="Texto del update"
        className="input input--area reporte__texto"
        rows={18}
        value={texto}
        onChange={(e) => setBorrador(e.target.value)}
      />

      <div className="integrador__acciones">
        <button type="button" className="btn btn--mega btn--block" onClick={onCopiar}>
          <Icon name="copy" size={22} /> Copiar para WhatsApp
        </button>
        <div className="integrador__secundarias">
          {puedeCompartir && (
            <button type="button" className="btn btn--secundario" onClick={onCompartirConBitacora} disabled={compartiendo}>
              {compartiendo ? 'Armando…' : 'Compartir con la bitácora'}
            </button>
          )}
          <button type="button" className="btn btn--secundario" onClick={() => generar(fecha)} disabled={generando}>
            <Icon name="pdf" size={18} /> {generando ? 'Armando…' : 'Bajar bitácora'}
          </button>
        </div>
        <button type="button" className="btn btn--alt btn--block" onClick={onEnviado}>
          <Icon name="check" size={20} /> Ya lo mandé
        </button>
      </div>
    </div>
  );
}
