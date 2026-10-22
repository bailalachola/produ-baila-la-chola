import { useState } from 'react';
import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { ahora, uid } from '../model/factory';
import {
  CHECKS_ENSAYO,
  ESTADO_ENSAYO_LABEL,
  faltantesEnsayo,
  horarioEnsayo,
  mensajeEnsayo,
  nombreEnsayo,
  nuevoEnsayo,
  etiquetaDia,
  type Ensayo,
  type EstadoEnsayo,
} from '../model/ensayos';
import { copiar } from '../lib/clipboard';
import { FormatoWhatsApp } from './IntegradorView';
import { useConfirmar } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { Icon, Input, TextArea, TituloSeccion, Vacio } from '../components/ui';

const ESTADOS: EstadoEnsayo[] = ['a_confirmar', 'confirmado', 'hecho', 'cancelado'];

export function EnsayosView({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const [abierto, setAbierto] = useState<string | null>(null);
  const ensayos = [...(fecha.ensayos ?? [])].sort((a, b) => (a.dia || '9').localeCompare(b.dia || '9'));

  function agregar() {
    const e = nuevoEnsayo(uid('ens'), ahora());
    actualizar(fecha.id, (f) => ({ ...f, ensayos: [...(f.ensayos ?? []), e] }));
    setAbierto(e.id);
  }

  return (
    <section className="ensayos">
      <TituloSeccion bajada="Ensayos aparte para esta fecha: otro lugar, otro día u otro horario. Cada uno se produce como una fecha chiquita.">
        Ensayos
      </TituloSeccion>

      {ensayos.length === 0 ? (
        <Vacio>Todavía no hay ensayos especiales para esta fecha.</Vacio>
      ) : (
        <ul className="ensayos__lista">
          {ensayos.map((e) => (
            <li key={e.id}>
              <EnsayoCard fecha={fecha} ensayo={e} abierto={abierto === e.id} onToggle={() => setAbierto(abierto === e.id ? null : e.id)} />
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn--mega btn--block ensayos__nuevo" onClick={agregar}>
        <Icon name="plus" size={22} /> Sumar un ensayo
      </button>
    </section>
  );
}

function EnsayoCard({ fecha, ensayo: e, abierto, onToggle }: { fecha: Fecha; ensayo: Ensayo; abierto: boolean; onToggle: () => void }) {
  const { actualizar } = useStore();
  const toast = useToast();
  const confirmar = useConfirmar();
  const falta = faltantesEnsayo(e);
  const mensaje = mensajeEnsayo(fecha, e);

  const set = (cambio: Partial<Ensayo>) =>
    actualizar(fecha.id, (f) => ({ ...f, ensayos: (f.ensayos ?? []).map((x) => (x.id === e.id ? { ...x, ...cambio } : x)) }));

  const campo = (k: keyof Ensayo, label: string, opts: { placeholder?: string; type?: string; filas?: number; full?: boolean } = {}) => (
    <label className={`mini-campo ${opts.full ? 'mini-campo--full' : ''}`}>
      <span>{label}</span>
      {opts.filas ? (
        <TextArea rows={opts.filas} placeholder={opts.placeholder} value={(e[k] as string) ?? ''} onChange={(ev) => set({ [k]: ev.target.value })} />
      ) : (
        <Input type={opts.type ?? 'text'} placeholder={opts.placeholder} value={(e[k] as string) ?? ''} onChange={(ev) => set({ [k]: ev.target.value })} />
      )}
    </label>
  );

  async function onCopiar() {
    const ok = await copiar(mensaje);
    if (ok && !e.checks.aviso) set({ checks: { ...e.checks, aviso: true } });
    toast(ok ? 'Mensaje copiado. Pegalo en el grupo 💬' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }

  async function onBorrar() {
    if (await confirmar('¿Borramos este ensayo?', nombreEnsayo(e), 'Borrar')) {
      actualizar(fecha.id, (f) => ({ ...f, ensayos: (f.ensayos ?? []).filter((x) => x.id !== e.id) }));
    }
  }

  return (
    <article className={`ensayo ensayo--${e.estado} ${abierto ? 'is-abierto' : ''}`}>
      <button type="button" className="ensayo__cabeza" aria-expanded={abierto} onClick={onToggle}>
        <span className="ensayo__dia">{etiquetaDia(e.dia)}</span>
        <span className="ensayo__info">
          <strong>{nombreEnsayo(e)}</strong>
          <span>{[horarioEnsayo(e), e.lugar].filter(Boolean).join(' · ') || 'Falta definir día, horario y lugar'}</span>
        </span>
        <span className={`ensayo__estado ensayo__estado--${e.estado}`}>{ESTADO_ENSAYO_LABEL[e.estado]}</span>
      </button>
      {!abierto && falta.length > 0 && (
        <p className="ensayo__falta">
          🟡 Falta: {falta.slice(0, 3).join(', ')}
          {falta.length > 3 ? ` y ${falta.length - 3} más` : ''}
        </p>
      )}

      {abierto && (
        <div className="ensayo__cuerpo">
          <div className="opciones" role="group" aria-label="Estado del ensayo">
            {ESTADOS.map((s) => (
              <button key={s} type="button" className={`chip ${e.estado === s ? 'is-on' : ''}`} aria-pressed={e.estado === s} onClick={() => set({ estado: s })}>
                {ESTADO_ENSAYO_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="form">
            {campo('titulo', '¿Qué ensayo es?', { placeholder: 'ej: Ensayo de Cutre con la banda', full: true })}
            <div className="form__fila form__fila--3">
              {campo('dia', 'Día', { type: 'date' })}
              {campo('desde', 'Desde', { type: 'time' })}
              {campo('hasta', 'Hasta', { type: 'time' })}
            </div>
            <div className="form__fila">
              {campo('lugar', 'Lugar', { placeholder: 'ej: Sala La Usina' })}
              {campo('direccion', 'Dirección', { placeholder: 'calle y número' })}
            </div>
            {campo('objetivo', '¿Qué ensayamos?', { placeholder: 'ej: pasada completa de Cutre con el recorte de 35 minutos', filas: 2, full: true })}
            <div className="form__fila">
              {campo('quienes', '¿Quiénes van?', { placeholder: 'ej: toda la murga / solo la percu' })}
              {campo('responsable', '¿Quién lo produce?', { placeholder: 'ej: Ine' })}
            </div>

            <h4 className="ensayo__sub">🚗 Traslado</h4>
            {campo('traslado', '¿Cómo vamos?', { placeholder: 'ej: cada una por su cuenta / en autos compartidos', full: true })}
            <div className="form__fila">
              {campo('encuentro', 'Punto de encuentro', { placeholder: 'ej: Plaza Irlanda' })}
              {campo('salida', 'Hora de salida', { type: 'time' })}
            </div>
            {campo('llevar', '¿Qué hay que llevar?', { placeholder: 'ej: instrumentos, atriles, ropa cómoda, agua', filas: 2, full: true })}
            <div className="form__fila">
              {campo('costo', 'Costo del lugar', { placeholder: 'ej: $40.000 la sala' })}
            </div>
            {campo('notas', 'Notas', { filas: 2, full: true })}
          </div>

          <h4 className="ensayo__sub">✅ ¿Qué tenemos resuelto?</h4>
          <ul className="ensayo__checks">
            {CHECKS_ENSAYO.map((c) => {
              const v = e.checks[c.id];
              return (
                <li key={c.id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={v === true}
                      onChange={(ev) => set({ checks: { ...e.checks, [c.id]: ev.target.checked } })}
                    />
                    <span className={v === 'na' ? 'is-na' : ''}>{c.label}</span>
                  </label>
                  <button
                    type="button"
                    className={`chip chip--mini ${v === 'na' ? 'is-on' : ''}`}
                    aria-pressed={v === 'na'}
                    onClick={() => set({ checks: { ...e.checks, [c.id]: v === 'na' ? false : 'na' } })}
                  >
                    No aplica
                  </button>
                </li>
              );
            })}
          </ul>

          <h4 className="ensayo__sub">💬 Mensaje para el grupo</h4>
          <div className="wa">
            <div className="wa__burbuja ensayo__wa">
              <FormatoWhatsApp texto={mensaje} />
            </div>
          </div>
          <div className="integrador__acciones">
            <button type="button" className="btn btn--mega btn--block" onClick={onCopiar}>
              <Icon name="copy" size={22} /> Copiar para WhatsApp
            </button>
            <div className="integrador__secundarias">
              <a className="btn btn--secundario" href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">
                Abrir en WhatsApp ↗
              </a>
              <button type="button" className="btn btn--ghost btn--peligro-txt" onClick={onBorrar}>
                <Icon name="trash" size={18} /> Borrar ensayo
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
