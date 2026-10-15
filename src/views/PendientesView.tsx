import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { href } from '../router';
import { SECCIONES_NAV, seccionLabel } from '../model/checklist';
import { fechaCorta, grupoDe, todosLosPendientes, type GrupoPendiente, type PendienteVista } from '../model/logic';
import { ahora, uid } from '../model/factory';
import type { Fecha, SeccionId } from '../model/types';
import { Icon, Input, Select, TituloSeccion, Vacio } from '../components/ui';
import { useConfirmar } from '../components/Dialog';

const GRUPOS: { id: GrupoPendiente; titulo: string; bajada: string }[] = [
  { id: 'urgente', titulo: 'Urgente', bajada: 'Marcado urgente o vence en menos de 2 días.' },
  { id: 'resolver', titulo: 'A resolver', bajada: 'Todavía está pendiente.' },
  { id: 'resuelto', titulo: 'Resuelto', bajada: 'Listo. Queda registrado.' },
];

export function PendientesView({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const confirmar = useConfirmar();
  const todos = todosLosPendientes(fecha);

  const setUrgente = (p: PendienteVista, urgente: boolean) =>
    actualizar(fecha.id, (f) =>
      p.automatico && p.preguntaId
        ? { ...f, respuestas: { ...f.respuestas, [p.preguntaId]: { ...f.respuestas[p.preguntaId], urgente } } }
        : { ...f, pendientes: f.pendientes.map((x) => (x.id === p.id ? { ...x, urgente } : x)) },
    );

  const setResuelto = (p: PendienteVista, resuelto: boolean) =>
    actualizar(fecha.id, (f) => ({
      ...f,
      pendientes: f.pendientes.map((x) =>
        x.id === p.id ? { ...x, resuelto, resueltoEn: resuelto ? ahora() : undefined } : x,
      ),
    }));

  const borrar = async (p: PendienteVista) => {
    if (await confirmar('¿Borramos este pendiente?', p.descripcion, 'Borrar')) {
      actualizar(fecha.id, (f) => ({ ...f, pendientes: f.pendientes.filter((x) => x.id !== p.id) }));
    }
  };

  return (
    <section>
      <TituloSeccion bajada="Todo lo que falta, de todas las secciones. Lo que marcaste “A confirmar” en el checklist aparece solo.">
        Pendientes
      </TituloSeccion>

      <NuevoPendiente
        onAgregar={(p) => actualizar(fecha.id, (f) => ({ ...f, pendientes: [...f.pendientes, p] }))}
      />

      {todos.length === 0 && <Vacio>No hay pendientes. ¡Qué lujo!</Vacio>}

      {GRUPOS.map((g) => {
        const items = todos.filter((p) => grupoDe(p) === g.id);
        if (!items.length) return null;
        return (
          <div key={g.id} className={`grupo grupo--${g.id}`}>
            <h3 className="grupo__titulo">
              <span>{g.titulo}</span> <span className="grupo__n">{items.length}</span>
            </h3>
            <ul className="pendientes">
              {items.map((p) => (
                <li key={p.id} className={`pendiente ${p.resuelto ? 'is-resuelto' : ''}`}>
                  {!p.automatico ? (
                    <label className="pendiente__check">
                      <input
                        type="checkbox"
                        checked={p.resuelto}
                        onChange={(e) => setResuelto(p, e.target.checked)}
                        aria-label={`Marcar como resuelto: ${p.descripcion}`}
                      />
                    </label>
                  ) : (
                    <span className="pendiente__auto" title="Viene del checklist">
                      <Icon name="flag" size={18} />
                    </span>
                  )}
                  <div className="pendiente__cuerpo">
                    <p className="pendiente__desc">{p.descripcion}</p>
                    <p className="pendiente__meta">
                      <span className="tag">{seccionLabel(p.seccion)}</span>
                      {p.responsable && <span>👤 {p.responsable}</span>}
                      {p.limite && <span>📅 {fechaCorta(p.limite)}</span>}
                    </p>
                    <div className="pendiente__acciones">
                      {p.automatico ? (
                        <a className="link-btn" href={href({ nombre: 'fecha', id: fecha.id, seccion: p.seccion })}>
                          Resolver en {seccionLabel(p.seccion)} →
                        </a>
                      ) : (
                        <button type="button" className="link-btn link-btn--peligro" onClick={() => borrar(p)}>
                          Borrar
                        </button>
                      )}
                      {!p.resuelto && (
                        <button type="button" className="link-btn" onClick={() => setUrgente(p, !p.urgente)}>
                          {p.urgente ? 'Sacar de urgente' : 'Marcar urgente'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function NuevoPendiente({ onAgregar }: { onAgregar: (p: Fecha['pendientes'][number]) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [desc, setDesc] = useState('');
  const [seccion, setSeccion] = useState<SeccionId>('resumen');
  const [resp, setResp] = useState('');
  const [limite, setLimite] = useState('');
  const [urgente, setUrgente] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!desc.trim()) return;
    onAgregar({
      id: uid('pend'),
      descripcion: desc.trim(),
      seccion,
      responsable: resp.trim() || undefined,
      limite: limite || undefined,
      urgente,
      resuelto: false,
      creado: ahora(),
    });
    setDesc('');
    setResp('');
    setLimite('');
    setUrgente(false);
    setAbierto(false);
  }

  if (!abierto) {
    return (
      <button type="button" className="btn btn--primario btn--block" onClick={() => setAbierto(true)}>
        <Icon name="plus" /> Anotar un pendiente
      </button>
    );
  }

  return (
    <form className="panel form" onSubmit={onSubmit}>
      <label className="mini-campo mini-campo--full">
        <span>¿Qué falta?</span>
        <Input autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="ej: conseguir alargue para el bombo" />
      </label>
      <div className="form__fila">
        <label className="mini-campo">
          <span>Sección</span>
          <Select value={seccion} onChange={(e) => setSeccion(e.target.value as SeccionId)}>
            {SECCIONES_NAV.filter((s) => s.id !== 'pendientes').map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="mini-campo">
          <span>¿Quién se encarga?</span>
          <Input value={resp} onChange={(e) => setResp(e.target.value)} />
        </label>
        <label className="mini-campo">
          <span>¿Para cuándo?</span>
          <Input type="date" value={limite} onChange={(e) => setLimite(e.target.value)} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
        <span>Es urgente</span>
      </label>
      <div className="form__acciones">
        <button type="button" className="btn btn--ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primario" disabled={!desc.trim()}>
          Anotar
        </button>
      </div>
    </form>
  );
}
