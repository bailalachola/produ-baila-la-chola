import { useState } from 'react';
import { useStore } from '../store';
import { ir } from '../router';
import { ahora, uid } from '../model/factory';
import { fechaHora } from '../model/logic';
import { nombreCorto } from '../model/actividad';
import { ESTADO_LABEL, MOTIVOS_AVANZA, MOTIVOS_NO_AVANZA, type Fecha } from '../model/types';
import { useSesion } from './Acceso';
import { useConfirmar } from './Dialog';
import { useToast } from './Toast';
import { Icon, TextArea } from './ui';

/**
 * ¿AVANZAMOS O NO?
 * Para salir de Idea (o para cancelar una fecha en curso) hay que decidir y
 * dejar escrito por qué. El quórum ayuda a decidir, pero no alcanza: puede haber
 * quórum y que igual no avancemos porque el espacio canceló.
 */
export function DecisionBloque({ fecha, soloCancelar = false }: { fecha: Fecha; soloCancelar?: boolean }) {
  const { actualizar } = useStore();
  const sesion = useSesion();
  const toast = useToast();
  const [avanza, setAvanza] = useState<boolean | null>(soloCancelar ? false : null);
  const [motivo, setMotivo] = useState(() => (!soloCancelar && fecha.quorum?.resultado === 'no' ? 'No hubo quórum' : ''));
  const [intentado, setIntentado] = useState(false);
  const quien = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : undefined;
  const esIdea = fecha.estado === 'idea';

  const elegir = (v: boolean) => {
    setAvanza(v);
    setIntentado(false);
    if (!motivo.trim() || [...MOTIVOS_AVANZA, ...MOTIVOS_NO_AVANZA].includes(motivo)) {
      setMotivo(v ? (fecha.quorum?.resultado === 'si' ? 'Hay quórum' : '') : fecha.quorum?.resultado === 'no' ? 'No hubo quórum' : '');
    }
  };

  function confirmarDecision() {
    setIntentado(true);
    const m = motivo.trim();
    if (avanza === null || !m) return;
    const responsable = fecha.responsable.trim();
    if (avanza && esIdea && !responsable) {
      toast('Antes de avanzar, decí quién queda responsable.', 'error');
      document.getElementById('idea-resp')?.focus();
      return;
    }
    const cuando = ahora();
    // "El espacio canceló" → "el espacio canceló" (si no es una sigla)
    const enFrase = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(m) ? m.charAt(0).toLowerCase() + m.slice(1) : m;
    const texto = avanza
      ? `Decidimos avanzar: ${enFrase.replace(/\.$/, '')}. Responsable de Producción: ${responsable}.`
      : `${esIdea ? 'No avanzamos con esta idea' : 'Cancelamos la fecha'}: ${enFrase.replace(/\.$/, '')}.`;
    actualizar(fecha.id, (f) => ({
      ...f,
      estado: avanza ? 'produccion' : 'cancelada',
      decision: { avanza, motivo: m, cuando, quien, estadoAnterior: f.estado },
      updates: [{ id: uid('upd'), cuando, categoria: 'DECISIÓN', texto, autor: quien ?? responsable }, ...f.updates],
    }));
    if (avanza) {
      toast('¡A producir! Arrancamos por el checklist 🥁');
      ir({ nombre: 'fecha', id: fecha.id, seccion: 'espacio' });
    } else {
      toast(esIdea ? 'Quedó registrada como cancelada.' : 'La fecha quedó cancelada.');
    }
  }

  const sugerencias = avanza ? MOTIVOS_AVANZA : MOTIVOS_NO_AVANZA;
  const falta = intentado && !motivo.trim();

  return (
    <div className="decision">
      {!soloCancelar && (
        <>
          <h3 className="decision__titulo">¿Avanzamos con esta idea?</h3>
          <p className="decision__bajada">
            El quórum ayuda, pero la decisión es otra cosa: puede haber quórum y que igual no avancemos. Siempre queda escrito por qué.
          </p>
          <div className="decision__opciones" role="radiogroup" aria-label="¿Avanzamos?">
            <button type="button" role="radio" aria-checked={avanza === true} className={`decision__op decision__op--si ${avanza === true ? 'is-on' : ''}`} onClick={() => elegir(true)}>
              ✓ Sí, avanzamos
            </button>
            <button type="button" role="radio" aria-checked={avanza === false} className={`decision__op decision__op--no ${avanza === false ? 'is-on' : ''}`} onClick={() => elegir(false)}>
              ✗ No avanzamos
            </button>
          </div>
        </>
      )}

      {avanza !== null && (
        <div className="decision__motivo">
          <label className="mini-campo mini-campo--full" htmlFor={`motivo-${fecha.id}`}>
            <span>
              {avanza ? '¿Por qué avanzamos?' : soloCancelar ? '¿Por qué se cancela?' : '¿Por qué no avanzamos?'} <em className="decision__obligatorio">(obligatorio)</em>
            </span>
          </label>
          <div className="opciones decision__sugerencias" role="group" aria-label="Motivos frecuentes">
            {sugerencias.map((s) => (
              <button key={s} type="button" className={`chip chip--mini ${motivo === s ? 'is-on' : ''}`} onClick={() => setMotivo(s)}>
                {s}
              </button>
            ))}
          </div>
          <TextArea
            id={`motivo-${fecha.id}`}
            rows={2}
            value={motivo}
            aria-invalid={falta}
            placeholder={avanza ? 'ej: hay quórum y el teatro confirmó el sábado' : 'ej: el teatro canceló la fecha'}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {falta && (
            <p className="aviso aviso--alerta" role="alert">
              <Icon name="alert" size={16} /> Contá por qué: es lo que queda en la memoria de la fecha.
            </p>
          )}
          <button type="button" className={`btn btn--block ${avanza ? 'btn--mega' : 'decision__cancelar'}`} onClick={confirmarDecision}>
            {avanza ? (
              <>
                Avanzamos: pasar a producción <Icon name="arrow" />
              </>
            ) : esIdea ? (
              'Confirmar: no avanzamos'
            ) : (
              'Confirmar: cancelar la fecha'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/** Cartel de fecha cancelada, con el motivo y la opción de reabrir */
export function CanceladaBanner({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const confirmar = useConfirmar();
  const toast = useToast();
  const sesion = useSesion();
  const d = fecha.decision;
  const volverA = d?.estadoAnterior && d.estadoAnterior !== 'cancelada' ? d.estadoAnterior : 'idea';

  async function reabrir() {
    const ok = await confirmar(
      '¿Reabrimos esta fecha?',
      `Vuelve a quedar en “${ESTADO_LABEL[volverA]}”. El motivo de la cancelación queda guardado en los Updates.`,
      'Reabrir',
      false,
    );
    if (!ok) return;
    const quien = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : undefined;
    actualizar(fecha.id, (f) => ({
      ...f,
      estado: volverA,
      decision: undefined,
      updates: [{ id: uid('upd'), cuando: ahora(), categoria: 'CAMBIO', texto: 'Reabrimos la fecha.', autor: quien }, ...f.updates],
    }));
    toast('Fecha reabierta.');
  }

  return (
    <div className="cancelada">
      <p className="cancelada__sello">✗ Cancelada</p>
      <p className="cancelada__motivo">{d?.motivo || 'Sin motivo registrado.'}</p>
      {d && (
        <p className="cancelada__meta">
          {[d.quien, fechaHora(d.cuando)].filter(Boolean).join(' · ')}
          {d.estadoAnterior === 'idea' ? ' · era una idea' : ''}
        </p>
      )}
      <button type="button" className="link-btn" onClick={reabrir}>
        Reabrir esta fecha
      </button>
    </div>
  );
}
