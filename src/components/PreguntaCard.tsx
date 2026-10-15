import { useId, useState, type ReactNode } from 'react';
import type { Pregunta } from '../model/checklist';
import { estaRespondida } from '../model/logic';
import { ESTADO4_LABEL, type Estado4, type Respuesta } from '../model/types';
import { Icon, Input, TextArea } from './ui';

interface Props {
  pregunta: Pregunta;
  respuesta?: Respuesta;
  onChange: (r: Respuesta) => void;
  /** preguntas de seguimiento ya renderizadas (se muestran si la respuesta es NO) */
  seguimiento?: ReactNode;
  anidada?: boolean;
}

const ESTADOS_SINO: Estado4[] = ['si', 'no', 'confirmar', 'na'];

export function PreguntaCard({ pregunta: p, respuesta, onChange, seguimiento, anidada }: Props) {
  const r = respuesta ?? {};
  const id = useId();
  const tieneExtra = !!(r.detalle || r.responsable || r.limite || r.notas);
  const [abierto, setAbierto] = useState(false);
  const hecha = estaRespondida(p, r);
  const aConfirmar = r.estado === 'confirmar';
  const mostrarExtra = abierto || aConfirmar;

  const set = (cambio: Partial<Respuesta>) => onChange({ ...r, ...cambio, actualizado: new Date().toISOString() });
  const toggleEstado = (e: Estado4) => set({ estado: r.estado === e ? undefined : e });

  const clase = [
    'pregunta',
    anidada && 'pregunta--anidada',
    hecha && 'pregunta--hecha',
    aConfirmar && 'pregunta--confirmar',
    r.estado === 'no' && p.alNo && 'pregunta--alerta',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={clase} aria-labelledby={`${id}-l`}>
      <div className="pregunta__cabeza">
        <h3 id={`${id}-l`} className="pregunta__label">
          {p.label}
        </h3>
        {hecha && (
          <span className="pregunta__ok" title="Respondida">
            <Icon name="check" size={18} title="Respondida" />
          </span>
        )}
      </div>
      {p.ayuda && <p className="pregunta__ayuda">{p.ayuda}</p>}

      {p.tipo === 'sino' && (
        <div className="segmentos" role="group" aria-labelledby={`${id}-l`}>
          {ESTADOS_SINO.map((e) => (
            <button
              key={e}
              type="button"
              className={`segmento segmento--${e} ${r.estado === e ? 'is-on' : ''}`}
              aria-pressed={r.estado === e}
              onClick={() => toggleEstado(e)}
            >
              {ESTADO4_LABEL[e]}
            </button>
          ))}
        </div>
      )}

      {p.tipo === 'dato' && !p.triple && (
        <Input
          id={`${id}-v`}
          aria-labelledby={`${id}-l`}
          type={p.input === 'number' ? 'text' : p.input ?? 'text'}
          inputMode={p.input === 'number' ? 'numeric' : undefined}
          placeholder={p.placeholder ?? 'Escribí acá…'}
          value={r.valor ?? ''}
          onChange={(e) => set({ valor: e.target.value })}
        />
      )}

      {p.tipo === 'dato' && p.triple && (
        <div className="triple">
          {(
            [
              ['ideal', 'Ideal'],
              ['minimo', 'Mínimo necesario'],
              ['acordado', 'Acordado'],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className={`triple__item triple__item--${k}`}>
              <span className="triple__label">{l}</span>
              <Input
                inputMode={p.input === 'number' ? 'numeric' : undefined}
                placeholder={p.placeholder ?? '—'}
                value={r[k] ?? ''}
                onChange={(e) => set({ [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
      )}

      {p.tipo === 'texto' && (
        <TextArea
          aria-labelledby={`${id}-l`}
          placeholder={p.placeholder ?? 'Escribí acá…'}
          value={r.valor ?? ''}
          onChange={(e) => set({ valor: e.target.value })}
        />
      )}

      {p.tipo === 'opcion' && (
        <div className="opciones" role="group" aria-labelledby={`${id}-l`}>
          {p.opciones?.map((o) => (
            <button
              key={o}
              type="button"
              className={`chip ${r.valor === o ? 'is-on' : ''}`}
              aria-pressed={r.valor === o}
              onClick={() => set({ valor: r.valor === o ? undefined : o, estado: undefined })}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {p.tipo === 'varios' && <Varios pregunta={p} valor={r.valor} onChange={(valor) => set({ valor, estado: undefined })} />}

      <div className="pregunta__pie">
        {p.tipo !== 'sino' && (
          <>
            <button
              type="button"
              className={`chip chip--mini chip--confirmar ${aConfirmar ? 'is-on' : ''}`}
              aria-pressed={aConfirmar}
              onClick={() => toggleEstado('confirmar')}
            >
              A confirmar
            </button>
            <button
              type="button"
              className={`chip chip--mini ${r.estado === 'na' ? 'is-on' : ''}`}
              aria-pressed={r.estado === 'na'}
              onClick={() => toggleEstado('na')}
            >
              No aplica
            </button>
          </>
        )}
        {!aConfirmar && (
          <button type="button" className="link-btn" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
            {abierto ? 'Ocultar detalle' : tieneExtra ? 'Ver detalle' : '+ detalle, responsable, notas'}
          </button>
        )}
      </div>

      {!mostrarExtra && tieneExtra && (
        <p className="pregunta__resumen">
          {[r.detalle, r.responsable && `👤 ${r.responsable}`, r.limite && `📅 ${r.limite}`, r.notas && `📝 ${r.notas}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {aConfirmar && (
        <p className="aviso aviso--pendiente">
          <Icon name="flag" size={16} /> Esto todavía está pendiente. Ya quedó en la lista de pendientes.
        </p>
      )}

      {mostrarExtra && (
        <div className="pregunta__extra">
          <label className="mini-campo mini-campo--full">
            <span>Detalle</span>
            <TextArea rows={2} value={r.detalle ?? ''} onChange={(e) => set({ detalle: e.target.value })} />
          </label>
          <label className="mini-campo">
            <span>¿Quién se encarga?</span>
            <Input value={r.responsable ?? ''} onChange={(e) => set({ responsable: e.target.value })} />
          </label>
          <label className="mini-campo">
            <span>¿Para cuándo?</span>
            <Input type="date" value={r.limite ?? ''} onChange={(e) => set({ limite: e.target.value || undefined })} />
          </label>
          <label className="mini-campo mini-campo--full">
            <span>Notas</span>
            <TextArea rows={2} value={r.notas ?? ''} onChange={(e) => set({ notas: e.target.value })} />
          </label>
          {aConfirmar && (
            <label className="check">
              <input type="checkbox" checked={!!r.urgente} onChange={(e) => set({ urgente: e.target.checked })} />
              <span>Es urgente</span>
            </label>
          )}
        </div>
      )}

      {r.estado === 'no' && p.alNo && (
        <div className="seguimiento">
          <p className="aviso aviso--alerta" role="note">
            <Icon name="alert" size={18} /> {p.alNo.aviso}
          </p>
          <p className="seguimiento__nota">No bloquea la fecha: la herramienta ayuda a mirar los riesgos, la decisión es de la murga.</p>
          {seguimiento}
        </div>
      )}
    </article>
  );
}

/** Elegir varias: se guarda como "Luz, Espejos". La opción "ninguna" es excluyente. */
function Varios({ pregunta: p, valor, onChange }: { pregunta: Pregunta; valor?: string; onChange: (v: string | undefined) => void }) {
  const elegidas = (valor ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const opciones = [...(p.opciones ?? []), ...(p.ninguna ? [p.ninguna] : [])];
  const toggle = (o: string) => {
    let nuevas: string[];
    if (o === p.ninguna) nuevas = elegidas.includes(o) ? [] : [o];
    else {
      const sin = elegidas.filter((x) => x !== p.ninguna);
      nuevas = sin.includes(o) ? sin.filter((x) => x !== o) : [...sin, o];
      // respetar el orden de las opciones
      nuevas = (p.opciones ?? []).filter((x) => nuevas.includes(x));
    }
    onChange(nuevas.length ? nuevas.join(', ') : undefined);
  };
  const faltan = elegidas.length ? (p.opciones ?? []).filter((o) => !elegidas.includes(o)) : [];
  return (
    <>
      <div className="opciones" role="group" aria-label={p.label}>
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            className={`chip ${elegidas.includes(o) ? 'is-on' : ''}`}
            aria-pressed={elegidas.includes(o)}
            onClick={() => toggle(o)}
          >
            {o !== p.ninguna && elegidas.includes(o) ? '✓ ' : ''}
            {o}
          </button>
        ))}
      </div>
      {faltan.length > 0 && (
        <p className="varios__falta">
          Falta: {faltan.join(', ').toLowerCase()}. Anotalo para llevarlo o pedirlo.
        </p>
      )}
      {faltan.length === 0 && elegidas.length > 0 && !elegidas.includes(p.ninguna ?? '') && (
        <p className="varios__ok">Tiene todo lo ideal 🙌</p>
      )}
    </>
  );
}
