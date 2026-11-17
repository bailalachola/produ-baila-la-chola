import { useState } from 'react';
import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { ahora, uid } from '../model/factory';
import { fechaHora } from '../model/logic';
import { nombreCorto } from '../model/actividad';
import { quorumVacio } from '../model/quorum';
import {
  SECCIONES_IDEA,
  invitaFinal,
  resumenFinalProdu,
  resumenSugeridoProdu,
  textoSeccion,
  type IdeaProdu,
  type SeccionIdeaId,
} from '../model/ideaProdu';
import { copiar } from '../lib/clipboard';
import { FormatoWhatsApp } from '../views/IntegradorView';
import { useSesion } from './Acceso';
import { useConfirmar } from './Dialog';
import { useToast } from './Toast';
import { Icon, Input, TextArea } from './ui';

/**
 * PASO 1 DE UNA IDEA: el resumen para el grupo de Produ.
 * Se carga lo que sabemos, se copia para WhatsApp y, cuando Produ da el OK,
 * se anota acá y se habilita el quórum.
 */
export function IdeaProduBloque({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const sesion = useSesion();
  const toast = useToast();
  const confirmar = useConfirmar();
  const [editando, setEditando] = useState(false);
  const ip: IdeaProdu = fecha.ideaProdu ?? {};
  const texto = resumenFinalProdu(fecha);
  const editado = !!ip.textoProdu?.trim();
  const quien = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : undefined;

  const guardar = (cambio: Partial<IdeaProdu>) =>
    actualizar(fecha.id, (f) => ({ ...f, ideaProdu: { ...(f.ideaProdu ?? {}), ...cambio } }));
  const guardarSeccion = (id: SeccionIdeaId, valor: string) =>
    actualizar(fecha.id, (f) => ({
      ...f,
      ideaProdu: { ...(f.ideaProdu ?? {}), secciones: { ...(f.ideaProdu?.secciones ?? {}), [id]: valor } },
    }));
  const set = <K extends keyof Fecha>(k: K, v: Fecha[K]) => actualizar(fecha.id, (f) => ({ ...f, [k]: v }));

  async function onCopiar() {
    const ok = await copiar(texto);
    toast(ok ? 'Copiado. Pegalo en el grupo de Produ 💡' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
    if (ok && !ip.enviado) guardar({ enviado: ahora() });
  }

  async function onOk() {
    if (!(await confirmar('¿Produ dio el OK?', 'Queda anotado en los Updates y se habilita el quórum para Cholas.', 'Sí, dio el OK', false))) return;
    const cuando = ahora();
    actualizar(fecha.id, (f) => ({
      ...f,
      ideaProdu: { ...(f.ideaProdu ?? {}), enviado: f.ideaProdu?.enviado ?? cuando, ok: cuando, okQuien: quien },
      updates: [{ id: uid('upd'), cuando, categoria: 'DECISIÓN', texto: 'Produ dio el OK para largar el quórum.', autor: quien ?? 'Produ' }, ...f.updates],
    }));
    toast('¡OK de Produ! Ahora, el quórum 🔴');
    setTimeout(() => document.getElementById('quorum')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }

  return (
    <div className="idea-produ" id="idea-produ">
      <div className="quorum__cabeza">
        <h3 className="idea-produ__titulo">1 · Resumen para Produ</h3>
        {ip.ok ? (
          <span className="quorum__estado quorum__estado--ok">OK de Produ ✓</span>
        ) : ip.enviado ? (
          <span className="quorum__estado">Esperando OK</span>
        ) : null}
      </div>
      <p className="quorum__bajada">
        Lo que sabemos de la idea, para mandar al grupo de Produ. Una idea por línea. Lo que ya cargaron en el relato, el arreglo y los riesgos aparece solo:
        editalo como quieras.
      </p>

      <div className="form">
        <div className="form__fila">
          <label className="mini-campo">
            <span>Día</span>
            <Input type="date" value={fecha.fecha} onChange={(e) => set('fecha', e.target.value)} />
          </label>
          <label className="mini-campo">
            <span>Hora (si se sabe)</span>
            <Input
              placeholder="ej: 22:00"
              value={fecha.quorum?.hora ?? ''}
              onChange={(e) => actualizar(fecha.id, (f) => ({ ...f, quorum: { ...(f.quorum ?? quorumVacio()), hora: e.target.value } }))}
            />
          </label>
          <label className="mini-campo">
            <span>Lugar</span>
            <Input placeholder="ej: Plaza Seca, Sociales UBA" value={fecha.lugar} onChange={(e) => set('lugar', e.target.value)} />
          </label>
          <label className="mini-campo">
            <span>Dirección</span>
            <Input
              placeholder="ej: Santiago del Estero 1029"
              value={fecha.direccion ?? ''}
              onChange={(e) =>
                actualizar(fecha.id, (f) => ({
                  ...f,
                  direccion: e.target.value,
                  respuestas: { ...f.respuestas, esp_direccion: { ...f.respuestas.esp_direccion, valor: e.target.value } },
                }))
              }
            />
          </label>
        </div>
        <label className="mini-campo mini-campo--full">
          <span>🙋 ¿Quién nos invita?</span>
          <Input
            placeholder="ej: Abril Castromán, de Mujeres en Sociales (producen Cardumen Films)"
            value={invitaFinal(fecha)}
            onChange={(e) => guardar({ invita: e.target.value })}
          />
        </label>
        {SECCIONES_IDEA.map((s) => (
          <label key={s.id} className="mini-campo mini-campo--full">
            <span>
              {s.emoji} {s.titulo} <small className="idea-produ__ayuda">{s.ayuda}</small>
            </span>
            <TextArea
              rows={4}
              placeholder={s.ejemplo}
              value={textoSeccion(fecha, s.id)}
              onChange={(e) => guardarSeccion(s.id, e.target.value)}
            />
          </label>
        ))}
      </div>

      <p className="idea-produ__vista">Así le llega a Produ:</p>
      {editando ? (
        <TextArea
          aria-label="Texto del resumen para Produ"
          className="input input--area reporte__texto"
          rows={16}
          value={ip.textoProdu ?? texto}
          onChange={(e) => guardar({ textoProdu: e.target.value })}
        />
      ) : (
        <div className="wa">
          <div className="wa__burbuja ensayo__wa">
            <FormatoWhatsApp texto={texto} />
          </div>
        </div>
      )}
      <div className="mensaje-bitacora__editar">
        <button type="button" className="link-btn" onClick={() => setEditando((x) => !x)}>
          {editando ? 'Ver cómo queda' : 'Editar el texto a mano'}
        </button>
        {editado && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              guardar({ textoProdu: undefined });
              setEditando(false);
            }}
          >
            Volver a armarlo desde los campos
          </button>
        )}
      </div>
      {editado && texto !== resumenSugeridoProdu(fecha) && (
        <p className="quorum__ayuda">Estás usando el texto editado a mano: si cambiás los campos de arriba, no se actualiza solo.</p>
      )}

      <div className="integrador__acciones">
        <button type="button" className="btn btn--mega btn--block" onClick={onCopiar}>
          <Icon name="copy" size={22} /> Copiar resumen para Produ
        </button>
        {ip.ok ? (
          <p className="idea-produ__ok">
            ✓ Produ dio el OK{ip.okQuien ? ` (lo anotó ${ip.okQuien})` : ''} · {fechaHora(ip.ok)}.{' '}
            <button type="button" className="link-btn" onClick={() => guardar({ ok: undefined, okQuien: undefined })}>
              Deshacer
            </button>
          </p>
        ) : (
          <>
            <button type="button" className="btn btn--alt btn--block" onClick={onOk}>
              <Icon name="check" size={20} /> Produ dio el OK: largamos el quórum
            </button>
            <p className="quorum__ayuda">¿Produ dijo que no? Registralo abajo, en “¿Avanzamos o no?”, con el motivo.</p>
          </>
        )}
      </div>
    </div>
  );
}
