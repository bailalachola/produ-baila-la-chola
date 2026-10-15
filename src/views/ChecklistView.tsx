import { useCallback } from 'react';
import { useStore } from '../store';
import type { Pregunta, SeccionChecklist } from '../model/checklist';
import { esVisible, progresoSeccion } from '../model/logic';
import type { Fecha, Respuesta } from '../model/types';
import { PreguntaCard } from '../components/PreguntaCard';
import { Progreso, TituloSeccion } from '../components/ui';

export function ChecklistView({ fecha, seccion }: { fecha: Fecha; seccion: SeccionChecklist }) {
  const { actualizar } = useStore();
  const prog = progresoSeccion(fecha, seccion.id);

  const responder = useCallback(
    (preguntaId: string, r: Respuesta) =>
      actualizar(fecha.id, (f) => ({
        ...f,
        respuestas: { ...f.respuestas, [preguntaId]: r },
        // la dirección del checklist es la dirección de la fecha
        ...(preguntaId === 'esp_direccion' ? { direccion: r.valor } : {}),
      })),
    [actualizar, fecha.id],
  );

  const render = (p: Pregunta, padre?: Pregunta) => {
    if (!esVisible({ pregunta: p, seccion: seccion.id, padre }, fecha.respuestas)) return null;
    return (
      <PreguntaCard
        key={p.id}
        pregunta={p}
        anidada={!!padre}
        respuesta={fecha.respuestas[p.id]}
        onChange={(r) => responder(p.id, r)}
        seguimiento={p.alNo?.preguntas.map((sub) => render(sub, p))}
      />
    );
  };

  return (
    <section aria-labelledby="sec-t">
      <TituloSeccion bajada={seccion.bajada}>
        <span id="sec-t">{seccion.titulo}</span>
      </TituloSeccion>
      <div className="sec-prog">
        <Progreso porcentaje={prog.porcentaje} label={`${seccion.titulo} completado`} />
        <span>
          {prog.hechas} de {prog.total} respondidas
        </span>
      </div>
      <div className="preguntas">{seccion.preguntas.map((p) => render(p))}</div>
    </section>
  );
}
