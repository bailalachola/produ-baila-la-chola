import { useStore } from '../store';

const TEXTO = {
  ok: { nube: 'Guardado en la base', local: 'Guardado en este dispositivo' },
  guardando: { nube: 'Guardando…', local: 'Guardando…' },
  pendiente: { nube: 'Sin señal · se sube al volver', local: 'Guardado en este dispositivo' },
  error: { nube: 'No se pudo guardar', local: 'No se pudo guardar' },
} as const;

/** Indicador chiquito de si lo último ya quedó guardado. */
export function EstadoGuardado() {
  const { guardado, remoto, recargar } = useStore();
  const texto = TEXTO[guardado][remoto ? 'nube' : 'local'];
  const reintentable = remoto && (guardado === 'pendiente' || guardado === 'error');
  return (
    <button
      type="button"
      className={`guardado guardado--${guardado}`}
      onClick={reintentable ? () => void recargar() : undefined}
      disabled={!reintentable}
      aria-live="polite"
      title={reintentable ? 'Tocá para reintentar' : texto}
    >
      <span className="guardado__punto" aria-hidden="true" />
      <span className="guardado__texto">{texto}</span>
    </button>
  );
}
