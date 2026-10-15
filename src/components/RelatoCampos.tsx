import { useStore } from '../store';
import type { Fecha, RelatoId } from '../model/types';
import { TextArea } from './ui';

interface CampoRelato {
  readonly id: RelatoId;
  readonly label: string;
  readonly ayuda: string;
}

/** Textos largos del relato de producción (cuerpo de la bitácora) */
export function RelatoCampos({ fecha, campos }: { fecha: Fecha; campos: readonly CampoRelato[] }) {
  const { actualizar } = useStore();
  const set = (id: RelatoId, v: string) =>
    actualizar(fecha.id, (f) => ({ ...f, relato: { ...f.relato, [id]: v } }));

  return (
    <div className="relato">
      <p className="relato__ayuda">
        Una idea por línea. Empezá con <code>-</code> para viñetas o con <code>1.</code> para pasos. Todo esto sale tal cual en la
        bitácora.
      </p>
      {campos.map((c) => {
        const valor = fecha.relato[c.id] ?? '';
        return (
          <label key={c.id} className="mini-campo mini-campo--full relato__campo">
            <span className="mini-campo__q">{c.label}</span>
            <span className="relato__hint">{c.ayuda}</span>
            <TextArea
              id={`relato-${c.id}`}
              rows={Math.min(14, Math.max(3, valor.split('\n').length + 1))}
              value={valor}
              onChange={(e) => set(c.id, e.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
