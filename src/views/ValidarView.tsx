import { useMemo } from 'react';
import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { ahora, uid } from '../model/factory';
import { fechaHora } from '../model/logic';
import { nombreCorto } from '../model/actividad';
import {
  DIMENSIONES,
  ESTADO_VALIDACION_LABEL,
  armarValidacion,
  contenidoDimension,
  resumenValidacion,
  saludoSugerido,
  validacionVacia,
  type EstadoValidacion,
  type Validacion,
} from '../model/validacion';
import { useSesion } from '../components/Acceso';
import { useConfirmar } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { Icon, Input, TextArea, TituloSeccion } from '../components/ui';
import { copiar } from '../lib/clipboard';
import { FormatoWhatsApp } from './IntegradorView';

const ESTADOS: EstadoValidacion[] = ['sin_enviar', 'enviado', 'ok', 'cambios'];

/**
 * Validar con la producción del otro lado: lo que tenemos entendido,
 * dimensión por dimensión, para que nos digan si estamos de acuerdo.
 */
export function ValidarView({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const sesion = useSesion();
  const toast = useToast();
  const confirmar = useConfirmar();
  const v: Validacion = fecha.validacion ?? validacionVacia();
  const yo = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : '';
  const firmaPorDefecto = `${yo ? `${yo}, ` : ''}Producción de Baila La Chola`;
  const generado = useMemo(() => armarValidacion(fecha, v, firmaPorDefecto), [fecha, v, firmaPorDefecto]);
  const texto = v.borrador ?? generado;
  const editado = v.borrador !== undefined;
  const r = resumenValidacion(fecha);

  const set = (cambio: Partial<Validacion>) =>
    actualizar(fecha.id, (f) => ({ ...f, validacion: { ...(f.validacion ?? validacionVacia()), ...cambio } }));

  const setDim = (id: string, estado: EstadoValidacion, nota?: string) =>
    actualizar(fecha.id, (f) => {
      const val = f.validacion ?? validacionVacia();
      const previa = val.dimensiones[id];
      return {
        ...f,
        validacion: { ...val, dimensiones: { ...val.dimensiones, [id]: { estado, nota: nota ?? previa?.nota, cuando: ahora() } } },
      };
    });

  const incluidas = DIMENSIONES.filter((d) => !v.excluidas?.includes(d.id));

  async function onCopiar() {
    const ok = await copiar(texto);
    toast(ok ? 'Copiado. Mandáselo a la producción del otro lado 💬' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }

  async function onEnviado() {
    const ok = await confirmar(
      '¿Ya se lo mandaste?',
      'Las dimensiones que van en el mensaje quedan como “Enviado”. Cuando te respondan, marcás cada una como De acuerdo o Hubo cambios.',
      'Sí, lo mandé',
      false,
    );
    if (!ok) return;
    const cuando = ahora();
    actualizar(fecha.id, (f) => {
      const val = f.validacion ?? validacionVacia();
      const dims = { ...val.dimensiones };
      for (const d of DIMENSIONES) {
        if (val.excluidas?.includes(d.id)) continue;
        const c = contenidoDimension(f, d, val.conSinResponder);
        if (!c.acordado.length && !c.falta.length) continue;
        if (!dims[d.id] || dims[d.id]!.estado === 'sin_enviar') dims[d.id] = { estado: 'enviado', cuando };
      }
      return {
        ...f,
        validacion: { ...val, enviado: cuando, borrador: undefined, dimensiones: dims },
        updates: [...f.updates, { id: uid('upd'), cuando, categoria: 'UPDATE', tema: 'Validación con la contraparte', texto, autor: yo || undefined }],
      };
    });
    toast('Quedó registrado. Cuando respondan, marcá cada parte.');
  }

  async function todoOk() {
    const ok = await confirmar('¿Están de acuerdo con todo?', 'Marcamos todas las partes enviadas como “De acuerdo”.', 'Sí, de acuerdo', false);
    if (!ok) return;
    const cuando = ahora();
    actualizar(fecha.id, (f) => {
      const val = f.validacion ?? validacionVacia();
      const dims = { ...val.dimensiones };
      for (const [id, d] of Object.entries(dims)) if (d.estado === 'enviado') dims[id] = { ...d, estado: 'ok', cuando };
      return {
        ...f,
        validacion: { ...val, dimensiones: dims },
        updates: [...f.updates, { id: uid('upd'), cuando, categoria: 'RESUELTO', tema: 'Validación con la contraparte', texto: 'La producción del otro lado confirmó que estamos de acuerdo con las condiciones.', autor: yo || undefined }],
      };
    });
  }

  return (
    <section className="validar">
      <TituloSeccion bajada="Le mandamos a la producción del otro lado lo que tenemos entendido, parte por parte, y nos dicen si estamos de acuerdo. Así no hay sorpresas el día de la fecha.">
        Validar
      </TituloSeccion>

      <div className={`validar__resumen ${r.total && r.ok === r.total ? 'is-ok' : ''}`}>
        <strong>
          {r.ok}/{r.total} de acuerdo
        </strong>
        <span>
          {v.enviado ? `Enviado el ${fechaHora(v.enviado)}.` : 'Todavía no se lo mandamos.'}
          {r.cambios ? ` ${r.cambios} parte${r.cambios === 1 ? '' : 's'} con cambios.` : ''}
        </span>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Qué vamos a validar</h3>
        <ul className="validar__dims">
          {DIMENSIONES.map((d) => {
            const c = contenidoDimension(fecha, d, v.conSinResponder);
            const vacia = !c.acordado.length && !c.falta.length;
            const incluida = !v.excluidas?.includes(d.id);
            const est = v.dimensiones[d.id];
            return (
              <li key={d.id} className={`vdim vdim--${est?.estado ?? 'sin_enviar'} ${!incluida || vacia ? 'is-fuera' : ''}`}>
                <div className="vdim__cabeza">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={incluida && !vacia}
                      disabled={vacia}
                      onChange={(e) =>
                        set({ excluidas: e.target.checked ? (v.excluidas ?? []).filter((x) => x !== d.id) : [...(v.excluidas ?? []), d.id] })
                      }
                    />
                    <span>
                      {d.emoji} {d.titulo}
                    </span>
                  </label>
                  <span className="vdim__cuenta">
                    {vacia ? 'Nada cargado todavía' : `${c.acordado.length} acordado${c.acordado.length === 1 ? '' : 's'}${c.falta.length ? ` · ${c.falta.length} a confirmar` : ''}`}
                  </span>
                </div>
                {incluida && !vacia && (
                  <>
                    <div className="opciones vdim__estados" role="group" aria-label={`Estado de ${d.titulo}`}>
                      {ESTADOS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className={`chip chip--mini vdim__estado--${e} ${(est?.estado ?? 'sin_enviar') === e ? 'is-on' : ''}`}
                          aria-pressed={(est?.estado ?? 'sin_enviar') === e}
                          onClick={() => setDim(d.id, e)}
                        >
                          {e === 'ok' ? '✓ ' : e === 'cambios' ? '✎ ' : ''}
                          {ESTADO_VALIDACION_LABEL[e]}
                        </button>
                      ))}
                    </div>
                    {est?.estado === 'cambios' && (
                      <label className="mini-campo mini-campo--full">
                        <span>¿Qué cambió? Después actualizalo en el checklist o en Economía.</span>
                        <Input value={est.nota ?? ''} placeholder="ej: el camarín se comparte con otra murga" onChange={(e) => setDim(d.id, 'cambios', e.target.value)} />
                      </label>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <label className="check">
          <input type="checkbox" checked={!!v.conSinResponder} onChange={(e) => set({ conSinResponder: e.target.checked })} disabled={editado} />
          <span>Preguntarles también lo que todavía no respondimos</span>
        </label>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">El mensaje</h3>
        <div className="form__fila">
          <label className="mini-campo">
            <span>¿A quién le escribimos?</span>
            <Input value={v.saludo ?? saludoSugerido(fecha)} placeholder="nombre" onChange={(e) => set({ saludo: e.target.value })} disabled={editado} />
          </label>
          <label className="mini-campo">
            <span>Firma</span>
            <Input value={v.firma ?? firmaPorDefecto} onChange={(e) => set({ firma: e.target.value })} disabled={editado} />
          </label>
        </div>
        <div className="wa">
          <div className="wa__burbuja ensayo__wa">
            <FormatoWhatsApp texto={texto} />
          </div>
        </div>
        <details className="quorum__editar">
          <summary>Editar el texto a mano</summary>
          <TextArea rows={12} value={texto} onChange={(e) => set({ borrador: e.target.value })} />
          {editado && (
            <button type="button" className="link-btn" onClick={() => set({ borrador: undefined })}>
              Volver a armarlo desde lo cargado
            </button>
          )}
        </details>
        <div className="integrador__acciones">
          <button type="button" className="btn btn--mega btn--block" onClick={onCopiar} disabled={!incluidas.length}>
            <Icon name="copy" size={22} /> Copiar para mandar
          </button>
          <div className="integrador__secundarias">
            <a className="btn btn--secundario" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
              Abrir en WhatsApp ↗
            </a>
          </div>
          <button type="button" className="btn btn--alt btn--block" onClick={onEnviado}>
            <Icon name="check" size={20} /> Ya se lo mandé
          </button>
          {Object.values(v.dimensiones).some((d) => d.estado === 'enviado') && (
            <button type="button" className="btn btn--secundario btn--block" onClick={todoOk}>
              🤝 Respondieron que están de acuerdo con todo
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
