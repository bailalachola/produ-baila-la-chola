import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { balancesPorMoneda, fechaCorta, formatoMonto, hoyISO } from '../model/logic';
import { uid } from '../model/factory';
import {
  CATEGORIAS_MOV,
  ESTADO_MOV_LABEL,
  MONEDAS,
  type CategoriaMov,
  type EstadoMov,
  type Fecha,
  type Moneda,
  type Movimiento,
} from '../model/types';
import { Icon, Input, Select, TextArea, TituloSeccion, Vacio } from '../components/ui';
import { useConfirmar } from '../components/Dialog';

type Borrador = Omit<Movimiento, 'monto'> & { monto: string };

const nuevoBorrador = (): Borrador => ({
  id: uid('mov'),
  fecha: hoyISO(),
  concepto: '',
  categoria: 'Otros',
  tipo: 'egreso',
  monto: '',
  moneda: 'ARS',
  pago: '',
  recibio: '',
  estado: 'confirmado',
  observaciones: '',
});

/** "2.976.000,50" o "2976000.5" → número */
function parsearMonto(s: string): number {
  const limpio = s.replace(/[^\d.,-]/g, '');
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(/\.(?=\d{3}(\D|$))/g, '');
  return Number(normal);
}

export function EconomiaView({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const confirmar = useConfirmar();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const balances = balancesPorMoneda(fecha.movimientos);
  const movs = [...fecha.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const guardar = (m: Movimiento) =>
    actualizar(fecha.id, (f) => {
      const existe = f.movimientos.some((x) => x.id === m.id);
      return {
        ...f,
        movimientos: existe ? f.movimientos.map((x) => (x.id === m.id ? m : x)) : [...f.movimientos, m],
      };
    });

  const borrar = async (m: Movimiento) => {
    if (await confirmar('¿Borramos este movimiento?', `${m.concepto} · ${formatoMonto(m.monto, m.moneda)}`, 'Borrar')) {
      actualizar(fecha.id, (f) => ({ ...f, movimientos: f.movimientos.filter((x) => x.id !== m.id) }));
      setBorrador(null);
    }
  };

  return (
    <section>
      <TituloSeccion bajada="Ingresos y gastos de la fecha. Pesos y dólares van siempre por separado.">Economía</TituloSeccion>

      {balances.length > 0 ? (
        <div className="balances">
          {balances.map((b) => (
            <div key={b.moneda} className={`balance balance--${b.moneda}`}>
              <h3 className="balance__moneda">{b.moneda}</h3>
              <dl>
                {b.ingresos > 0 && (
                  <div>
                    <dt>Ingresos</dt>
                    <dd>{formatoMonto(b.ingresos, b.moneda)}</dd>
                  </div>
                )}
                {b.egresos > 0 && (
                  <div>
                    <dt>{b.ingresos > 0 ? 'Egresos' : 'Gastos'}</dt>
                    <dd>{formatoMonto(b.egresos, b.moneda)}</dd>
                  </div>
                )}
                {b.ingresos > 0 && (
                  <div className="balance__saldo">
                    <dt>Saldo</dt>
                    <dd className={b.saldo < 0 ? 'neg' : ''}>{formatoMonto(b.saldo, b.moneda)}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <Vacio>Todavía no cargamos movimientos.</Vacio>
      )}

      {fecha.movimientos.some((m) => m.estado !== 'confirmado') && (
        <p className="aviso aviso--pendiente">
          <Icon name="flag" size={16} /> Hay {fecha.movimientos.filter((m) => m.estado !== 'confirmado').length} movimiento(s) sin
          cerrar: reintegros o conceptos a confirmar.
        </p>
      )}

      {borrador ? (
        <FormMovimiento
          borrador={borrador}
          esNuevo={!fecha.movimientos.some((m) => m.id === borrador.id)}
          onCancelar={() => setBorrador(null)}
          onGuardar={(m) => {
            guardar(m);
            setBorrador(null);
          }}
          onBorrar={() => {
            const m = fecha.movimientos.find((x) => x.id === borrador.id);
            if (m) void borrar(m);
          }}
        />
      ) : (
        <button type="button" className="btn btn--primario btn--block" onClick={() => setBorrador(nuevoBorrador())}>
          <Icon name="plus" /> Cargar movimiento
        </button>
      )}

      <ul className="movs">
        {movs.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className={`mov mov--${m.tipo}`}
              onClick={() => setBorrador({ ...m, monto: String(m.monto) })}
              aria-label={`Editar ${m.concepto}`}
            >
              <span className="mov__signo" aria-hidden="true">
                {m.tipo === 'ingreso' ? '+' : '−'}
              </span>
              <span className="mov__cuerpo">
                <span className="mov__concepto">{m.concepto}</span>
                <span className="mov__meta">
                  {fechaCorta(m.fecha)} · {m.categoria}
                  {m.pago ? ` · pagó ${m.pago}` : ''}
                  {m.recibio ? ` · recibió ${m.recibio}` : ''}
                </span>
                {m.estado !== 'confirmado' && <span className="tag tag--alerta">{ESTADO_MOV_LABEL[m.estado]}</span>}
              </span>
              <span className="mov__monto">{formatoMonto(m.monto, m.moneda)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FormMovimiento({
  borrador,
  esNuevo,
  onCancelar,
  onGuardar,
  onBorrar,
}: {
  borrador: Borrador;
  esNuevo: boolean;
  onCancelar: () => void;
  onGuardar: (m: Movimiento) => void;
  onBorrar: () => void;
}) {
  const [b, setB] = useState(borrador);
  const [error, setError] = useState('');
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const monto = parsearMonto(b.monto);
    if (!b.concepto.trim()) return setError('¿En concepto de qué?');
    if (!Number.isFinite(monto) || monto <= 0) return setError('El monto tiene que ser un número mayor a cero.');
    onGuardar({
      ...b,
      concepto: b.concepto.trim(),
      monto,
      pago: b.pago?.trim() || undefined,
      recibio: b.recibio?.trim() || undefined,
      observaciones: b.observaciones?.trim() || undefined,
    });
  }

  return (
    <form className="panel form" onSubmit={onSubmit}>
      <div className="segmentos segmentos--2" role="group" aria-label="Tipo de movimiento">
        {(['ingreso', 'egreso'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`segmento segmento--${t === 'ingreso' ? 'si' : 'no'} ${b.tipo === t ? 'is-on' : ''}`}
            aria-pressed={b.tipo === t}
            onClick={() => set('tipo', t)}
          >
            {t === 'ingreso' ? 'Entra plata' : 'Sale plata'}
          </button>
        ))}
      </div>
      <label className="mini-campo mini-campo--full">
        <span>Concepto</span>
        <Input autoFocus={esNuevo} value={b.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="ej: nafta del colectivo" />
      </label>
      <div className="form__fila">
        <label className="mini-campo">
          <span>Monto</span>
          <Input inputMode="decimal" value={b.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" />
        </label>
        <label className="mini-campo">
          <span>Moneda</span>
          <Select value={b.moneda} onChange={(e) => set('moneda', e.target.value as Moneda)}>
            {MONEDAS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </label>
        <label className="mini-campo">
          <span>Categoría</span>
          <Select value={b.categoria} onChange={(e) => set('categoria', e.target.value as CategoriaMov)}>
            {CATEGORIAS_MOV.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </label>
        <label className="mini-campo">
          <span>Fecha</span>
          <Input type="date" value={b.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </label>
        <label className="mini-campo">
          <span>¿Quién pagó?</span>
          <Input value={b.pago ?? ''} onChange={(e) => set('pago', e.target.value)} />
        </label>
        <label className="mini-campo">
          <span>¿Quién recibió?</span>
          <Input value={b.recibio ?? ''} onChange={(e) => set('recibio', e.target.value)} />
        </label>
      </div>
      <label className="mini-campo mini-campo--full">
        <span>Estado</span>
        <Select value={b.estado} onChange={(e) => set('estado', e.target.value as EstadoMov)}>
          {(Object.keys(ESTADO_MOV_LABEL) as EstadoMov[]).map((k) => (
            <option key={k} value={k}>
              {ESTADO_MOV_LABEL[k]}
            </option>
          ))}
        </Select>
      </label>
      <label className="mini-campo mini-campo--full">
        <span>Observaciones</span>
        <TextArea rows={2} value={b.observaciones ?? ''} onChange={(e) => set('observaciones', e.target.value)} />
      </label>
      {error && (
        <p className="aviso aviso--alerta" role="alert">
          <Icon name="alert" size={16} /> {error}
        </p>
      )}
      <div className="form__acciones">
        {!esNuevo && (
          <button type="button" className="btn btn--ghost btn--peligro-txt" onClick={onBorrar}>
            <Icon name="trash" size={18} /> Borrar
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primario">
          {esNuevo ? 'Cargar' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
