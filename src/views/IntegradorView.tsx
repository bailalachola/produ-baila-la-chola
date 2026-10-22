import { Fragment, useMemo } from 'react';
import { useStore } from '../store';
import type { Fecha } from '../model/types';
import {
  armarIntegrador,
  completarIntegrador,
  integradorSugerido,
  type Integrador,
  type ItemAgenda,
} from '../model/integrador';
import { Icon, Input, TextArea, TituloSeccion } from '../components/ui';
import { useToast } from '../components/Toast';
import { useConfirmar } from '../components/Dialog';
import { copiar } from '../lib/clipboard';

/** *negrita* y _cursiva_ como en WhatsApp, para la vista previa */
export function FormatoWhatsApp({ texto }: { texto: string }) {
  const partes = texto.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <strong key={i}>{p.slice(1, -1)}</strong>
        ) : p.startsWith('_') && p.endsWith('_') && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function IntegradorView({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const toast = useToast();
  const confirmar = useConfirmar();
  const sugerido = useMemo(() => integradorSugerido(fecha), [fecha]);
  const integ: Integrador = fecha.integrador ?? sugerido;
  const mensaje = armarIntegrador(fecha, integ);

  const guardar = (cambio: Partial<Integrador>) =>
    actualizar(fecha.id, (f) => ({ ...f, integrador: { ...(f.integrador ?? integradorSugerido(f)), ...cambio } }));

  const setAgenda = (agenda: ItemAgenda[]) => guardar({ agenda });

  const campo = (k: keyof Omit<Integrador, 'agenda'>, label: string, opciones: { filas?: number; ayuda?: string; placeholder?: string } = {}) => (
    <label className="mini-campo mini-campo--full">
      <span className="mini-campo__q">{label}</span>
      {opciones.ayuda && <span className="relato__hint">{opciones.ayuda}</span>}
      {opciones.filas ? (
        <TextArea
          id={`int-${k}`}
          rows={Math.min(14, Math.max(opciones.filas, (integ[k] ?? '').split('\n').length + 1))}
          value={integ[k] ?? ''}
          placeholder={opciones.placeholder}
          onChange={(e) => guardar({ [k]: e.target.value })}
        />
      ) : (
        <Input id={`int-${k}`} value={integ[k] ?? ''} placeholder={opciones.placeholder} onChange={(e) => guardar({ [k]: e.target.value })} />
      )}
    </label>
  );

  async function onCopiar() {
    const ok = await copiar(mensaje);
    toast(ok ? 'Integrador copiado. Pegalo en el grupo 💬' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }

  async function onCompartir() {
    try {
      await navigator.share({ text: mensaje });
    } catch {
      /* canceló */
    }
  }

  async function onRearmar() {
    const ok = await confirmar(
      'Completar desde el checklist',
      'Llenamos los bloques que estén vacíos con lo que está cargado en el checklist. Lo que ya escribiste no se toca.',
      'Completar',
      false,
    );
    if (ok) actualizar(fecha.id, (f) => ({ ...f, integrador: completarIntegrador(f.integrador ?? integradorSugerido(f), integradorSugerido(f)) }));
  }

  async function onReiniciar() {
    const ok = await confirmar(
      '¿Empezamos de nuevo?',
      'Se borra lo que escribiste en el integrador y se vuelve a armar desde el checklist.',
      'Rearmar desde cero',
    );
    if (ok) actualizar(fecha.id, (f) => ({ ...f, integrador: integradorSugerido(f) }));
  }

  const puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <section className="integrador">
      <TituloSeccion bajada="El mensaje para el grupo antes de la fecha. Se arma con lo del checklist; acá lo terminás de ajustar.">
        Integrador
      </TituloSeccion>

      <div className="integrador__acciones">
        <button type="button" className="btn btn--mega btn--block" onClick={onCopiar}>
          <Icon name="copy" size={22} /> Copiar para WhatsApp
        </button>
        <div className="integrador__secundarias">
          {puedeCompartir && (
            <button type="button" className="btn btn--secundario" onClick={onCompartir}>
              Compartir…
            </button>
          )}
          <a
            className="btn btn--secundario"
            href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en WhatsApp ↗
          </a>
        </div>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Así se va a ver</h3>
        <div className="wa">
          <div className="wa__burbuja">
            <FormatoWhatsApp texto={mensaje} />
          </div>
        </div>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Citación y lugar</h3>
        <div className="form">
          <div className="form__fila">
            {campo('citacion', 'Hora de citación', { placeholder: 'ej: 16:30' })}
            {campo('direccion', 'Dirección', { placeholder: 'ej: Av. Corrientes 5233' })}
          </div>
          {campo('notaLugar', 'Nota sobre el lugar', { placeholder: 'ej: zona complicada para estacionar' })}
        </div>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Agenda</h3>
        <ul className="agenda">
          {integ.agenda.map((a, i) => (
            <li key={i} className="agenda__item">
              <Input
                aria-label="Hora"
                className="input agenda__hora"
                placeholder="ej: 19:00"
                value={a.hora}
                onChange={(e) => setAgenda(integ.agenda.map((x, j) => (j === i ? { ...x, hora: e.target.value } : x)))}
              />
              <Input
                aria-label="Qué pasa"
                placeholder="ej: Función"
                value={a.texto}
                onChange={(e) => setAgenda(integ.agenda.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Sacar de la agenda"
                onClick={() => setAgenda(integ.agenda.filter((_, j) => j !== i))}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="link-btn integrador__mas" onClick={() => setAgenda([...integ.agenda, { hora: '', texto: '' }])}>
          <Icon name="plus" size={16} /> Agregar a la agenda
        </button>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Bloques</h3>
        <div className="form">
          {campo('camarines', 'Camarines 🚊', { filas: 3 })}
          {campo('sonidoCoordina', 'Sonido: ¿quién coordina?', { placeholder: 'ej: Anto' })}
          {campo('sonido', 'Sonido 🎛️', { filas: 3, placeholder: 'Quién nos opera, si hay prueba, qué micrófonos llevamos…' })}
          <div className="form__fila">
            {campo('vestuarioModo', 'Vestuario: ¿cómo vamos?', { placeholder: 'ej: COMPLETO' })}
            {campo('maquillajeModo', 'Maquillaje: ¿cómo vamos?', { placeholder: 'ej: COMPLETO' })}
          </div>
          {campo('vestuario', 'Vestuario 🧵', { filas: 6 })}
          {campo('maquillajeCoordina', 'Maquillaje: ¿quién coordina?', { placeholder: 'ej: Clari' })}
          {campo('maquillaje', 'Maquillaje 🎨', { filas: 4 })}
          {campo('comida', 'Comida 🥑', { filas: 2 })}
          {campo('recaudacion', 'Recaudación 💸', { filas: 2, placeholder: 'ej: 300.000 nos dan para un viático' })}
          {campo('recordatorios', 'Recordatorios', { filas: 3, ayuda: 'Uno por renglón.' })}
          {campo('show', 'Show 🎭', { filas: 5, ayuda: 'El orden de lo que hacemos, uno por renglón.' })}
          {campo('reaccion', 'Pedido de reacción', { placeholder: 'Reaccionen con un emoticón de primavera 🌼' })}
          {campo('firma', 'Firma', { filas: 4 })}
        </div>
      </div>

      <div className="acciones-finales">
        <button type="button" className="btn btn--secundario" onClick={onRearmar}>
          Completar lo vacío desde el checklist
        </button>
        <button type="button" className="btn btn--ghost btn--peligro-txt" onClick={onReiniciar}>
          Rearmar desde cero
        </button>
      </div>
    </section>
  );
}
