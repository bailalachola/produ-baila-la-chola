import { useStore } from '../store';
import { COMPARABLES } from '../model/checklist';
import { esVisible, fechaHora, pendientesAbiertos, valorPlanificado } from '../model/logic';
import { ahora, uid } from '../model/factory';
import {
  BALANCES_ITEM,
  PREGUNTAS_CIERRE,
  RELATO_CIERRE,
  type Balance,
  type Fecha,
  type ItemComparado,
  type PreguntaCierreId,
} from '../model/types';
import { RelatoCampos } from '../components/RelatoCampos';
import { Icon, Input, Select, TextArea, TituloSeccion } from '../components/ui';
import { RiesgosEditor } from '../components/RiesgosEditor';
import { useConfirmar } from '../components/Dialog';
import { useBitacora } from '../pdf/useBitacora';

const BALANCES: { id: Balance; label: string }[] = [
  { id: 'positivo', label: 'Positivo' },
  { id: 'mixto', label: 'Mixto' },
  { id: 'negativo', label: 'Negativo' },
];

const norm = (s: string) => s.trim().toLowerCase();

export function CierreView({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const confirmar = useConfirmar();
  const { generar, generando } = useBitacora();
  const habilitado = fecha.estado === 'realizada' || fecha.estado === 'cerrada';
  const cerrada = fecha.estado === 'cerrada';

  if (!habilitado) {
    return (
      <section>
        <TituloSeccion bajada="La retirada es el balance de la fecha. Se habilita cuando la fecha ya se hizo.">Retirada</TituloSeccion>
        <div className="panel panel--centro">
          <p className="lead">¿Ya hicimos la fecha?</p>
          <button
            type="button"
            className="btn btn--mega btn--block"
            onClick={() => actualizar(fecha.id, (f) => ({ ...f, estado: 'realizada' }))}
          >
            <Icon name="check" size={24} /> Sí, ya la hicimos
          </button>
        </div>
      </section>
    );
  }

  const comparables = COMPARABLES.filter(
    (u) => {
      if (!esVisible(u, fecha.respuestas)) return false;
      const plan = valorPlanificado(u.pregunta.id, fecha.respuestas);
      return (!!plan && plan !== 'No aplica') || !!fecha.cierre.real[u.pregunta.id];
    },
  );
  const setReal = (id: string, v: string) =>
    actualizar(fecha.id, (f) => ({ ...f, cierre: { ...f.cierre, real: { ...f.cierre.real, [id]: v } } }));
  const setResp = (id: PreguntaCierreId, v: string) =>
    actualizar(fecha.id, (f) => ({ ...f, cierre: { ...f.cierre, respuestas: { ...f.cierre.respuestas, [id]: v } } }));
  const setBalanceItem = (id: string, v: string) =>
    actualizar(fecha.id, (f) => ({ ...f, cierre: { ...f.cierre, balanceItem: { ...f.cierre.balanceItem, [id]: v } } }));
  const setExtra = (id: string, cambio: Partial<ItemComparado>) =>
    actualizar(fecha.id, (f) => ({
      ...f,
      cierre: { ...f.cierre, itemsExtra: f.cierre.itemsExtra.map((i) => (i.id === id ? { ...i, ...cambio } : i)) },
    }));
  const agregarExtra = () =>
    actualizar(fecha.id, (f) => ({
      ...f,
      cierre: { ...f.cierre, itemsExtra: [...f.cierre.itemsExtra, { id: uid('item'), tema: '', planificado: '', real: '' }] },
    }));
  const borrarExtra = async (i: ItemComparado) => {
    if (!i.tema || (await confirmar('¿Borramos este ítem?', i.tema, 'Borrar'))) {
      actualizar(fecha.id, (f) => ({
        ...f,
        cierre: { ...f.cierre, itemsExtra: f.cierre.itemsExtra.filter((x) => x.id !== i.id) },
      }));
    }
  };
  const setBalance = (b: Balance) =>
    actualizar(fecha.id, (f) => ({ ...f, cierre: { ...f.cierre, balance: f.cierre.balance === b ? undefined : b } }));

  const pend = pendientesAbiertos(fecha);
  const movsAbiertos = fecha.movimientos.filter((m) => m.estado !== 'confirmado');

  async function onCerrar() {
    const avisos = [
      pend.length ? `${pend.length} pendiente(s) sin resolver` : '',
      movsAbiertos.length ? `${movsAbiertos.length} movimiento(s) de plata sin cerrar` : '',
      !fecha.cierre.balance ? 'sin balance general marcado' : '',
    ].filter(Boolean);
    const ok = await confirmar(
      'Cerrar la fecha',
      avisos.length
        ? `Ojo: quedan ${avisos.join(', ')}. Podés cerrarla igual y seguir editando después.`
        : 'Queda todo registrado. Después podés generar la bitácora o reabrirla si hace falta.',
      'Cerrar fecha',
      false,
    );
    if (ok) actualizar(fecha.id, (f) => ({ ...f, estado: 'cerrada', cierre: { ...f.cierre, cerradaEn: ahora() } }));
  }

  return (
    <section className="cierre">
      <TituloSeccion bajada="¿Qué pasó finalmente? Comparamos lo acordado con lo que pasó de verdad y cerramos la fecha.">Retirada</TituloSeccion>

      {cerrada && (
        <p className="aviso aviso--ok">
          <Icon name="check" size={18} /> Fecha cerrada{fecha.cierre.cerradaEn ? ` el ${fechaHora(fecha.cierre.cerradaEn)}` : ''}.
        </p>
      )}

      <div className="bloque">
        <h3 className="bloque__titulo">Planificado / acordado vs. qué pasó realmente</h3>
        {comparables.length === 0 ? (
          <p className="vacio">Todavía no hay nada acordado para comparar. Completá el checklist (horarios, micrófonos, traslado…) y vuelve a aparecer acá.</p>
        ) : (
          <ul className="comparar">
            {comparables.map(({ pregunta: p }) => {
              const plan = valorPlanificado(p.id, fecha.respuestas);
              const real = fecha.cierre.real[p.id] ?? '';
              const distinto = !!real && !!plan && norm(real) !== norm(plan);
              return (
                <li key={p.id} className={`comparar__item ${distinto ? 'is-distinto' : ''}`}>
                  <span className="comparar__nombre">{p.comparable}</span>
                  <div className="comparar__col">
                    <span className="comparar__lbl">Acordado</span>
                    <span className="comparar__plan">{plan || '—'}</span>
                  </div>
                  <div className="comparar__col">
                    <span className="comparar__lbl">Real</span>
                    <Input
                      aria-label={`${p.comparable}: qué pasó realmente`}
                      value={real}
                      placeholder="¿qué pasó?"
                      onChange={(e) => setReal(p.id, e.target.value)}
                    />
                  </div>
                  {plan && !real && (
                    <button type="button" className="link-btn comparar__igual" onClick={() => setReal(p.id, plan)}>
                      Fue igual
                    </button>
                  )}
                  {distinto && <span className="comparar__diff">Cambió</span>}
                  {real && (
                    <SelectBalance
                      id={`bal-${p.id}`}
                      valor={fecha.cierre.balanceItem[p.id] ?? ''}
                      onChange={(v) => setBalanceItem(p.id, v)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Otros ítems para comparar</h3>
        <p className="relato__ayuda">Lo que no sale del checklist: la base, el maquillaje, cómo sonó el show…</p>
        <ul className="comparar">
          {fecha.cierre.itemsExtra.map((i) => (
            <li key={i.id} className="comparar__item comparar__item--extra">
              <div className="riesgo__fila comparar__nombre">
                <Input
                  aria-label="Tema"
                  placeholder="Tema (ej: Colectivo cerca del escenario)"
                  value={i.tema}
                  onChange={(e) => setExtra(i.id, { tema: e.target.value })}
                />
                <button type="button" className="icon-btn" onClick={() => borrarExtra(i)} aria-label="Borrar ítem">
                  <Icon name="trash" size={18} />
                </button>
              </div>
              <div className="comparar__col">
                <span className="comparar__lbl">Acordado</span>
                <TextArea rows={2} value={i.planificado} placeholder="¿qué habíamos planeado?" onChange={(e) => setExtra(i.id, { planificado: e.target.value })} />
              </div>
              <div className="comparar__col">
                <span className="comparar__lbl">Real</span>
                <TextArea rows={2} value={i.real} placeholder="¿qué pasó?" onChange={(e) => setExtra(i.id, { real: e.target.value })} />
              </div>
              <SelectBalance id={`bal-${i.id}`} valor={i.balance ?? ''} onChange={(v) => setExtra(i.id, { balance: v || undefined })} />
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--secundario" onClick={agregarExtra}>
          <Icon name="plus" /> Agregar ítem
        </button>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">¿Qué pasó finalmente?</h3>
        <RelatoCampos fecha={fecha} campos={RELATO_CIERRE.slice(0, 2)} />
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Mirando para atrás</h3>
        <div className="form">
          {PREGUNTAS_CIERRE.map((q) => (
            <label key={q.id} className="mini-campo mini-campo--full">
              <span className="mini-campo__q">{q.label}</span>
              <TextArea rows={2} value={fecha.cierre.respuestas[q.id] ?? ''} onChange={(e) => setResp(q.id, e.target.value)} />
            </label>
          ))}
        </div>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Para la próxima</h3>
        <RelatoCampos fecha={fecha} campos={RELATO_CIERRE.slice(2)} />
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Balance de Producción</h3>
        <div className="balance-btns" role="group" aria-label="Balance general">
          {BALANCES.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`sello sello--${b.id} ${fecha.cierre.balance === b.id ? 'is-on' : ''}`}
              aria-pressed={fecha.cierre.balance === b.id}
              onClick={() => setBalance(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Riesgos: ¿qué pasó con cada uno?</h3>
        <RiesgosEditor fecha={fecha} conResultado />
      </div>

      {(pend.length > 0 || movsAbiertos.length > 0) && !cerrada && (
        <div className="falta">
          <h3 className="falta__titulo">Antes de cerrar la fecha nos falta…</h3>
          <ul className="falta__lista">
            {pend.slice(0, 6).map((p) => (
              <li key={p.id}>{p.descripcion}</li>
            ))}
            {pend.length > 6 && <li>y {pend.length - 6} pendiente(s) más</li>}
            {movsAbiertos.map((m) => (
              <li key={m.id}>💸 {m.concepto} ({m.estado === 'reintegro' ? 'reintegro' : 'confirmar concepto'})</li>
            ))}
          </ul>
        </div>
      )}

      <div className="acciones-finales">
        {!cerrada ? (
          <button type="button" className="btn btn--mega btn--block btn--cerrar" onClick={onCerrar}>
            <Icon name="check" size={24} /> Cerrar fecha
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--secundario"
            onClick={() => actualizar(fecha.id, (f) => ({ ...f, estado: 'realizada' }))}
          >
            Reabrir la fecha
          </button>
        )}
        <button type="button" className="btn btn--mega btn--block btn--alt" onClick={() => generar(fecha)} disabled={generando}>
          <Icon name="pdf" size={24} /> {generando ? 'Armando la bitácora…' : 'Generar bitácora'}
        </button>
      </div>
    </section>
  );
}

function SelectBalance({ id, valor, onChange }: { id: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label className="comparar__balance" htmlFor={id}>
      <span className="comparar__lbl">Balance</span>
      <Select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin evaluar</option>
        {BALANCES_ITEM.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </Select>
    </label>
  );
}
