import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { uid } from '../model/factory';
import { nombreCorto } from '../model/actividad';
import {
  REFERENCIAS_INICIALES,
  calcular,
  leerPesos,
  num,
  plata,
  referenciasViejas,
  textoViatico,
  viaticoNuevo,
  type Referencias,
  type Viatico,
} from '../model/viatico';
import { documentosRepo } from '../services/documentos';
import { copiar } from '../lib/clipboard';
import { useSesion } from './Acceso';
import { useToast } from './Toast';
import { Icon, Input } from './ui';

const aNum = (s: string): number | undefined => {
  if (s.trim() === '') return undefined;
  const x = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(x) ? x : undefined;
};

/** ¿Cuánto nos cuesta mover a la murga a esta fecha? */
export function CalculadoraViatico({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const toast = useToast();
  const sesion = useSesion();
  const [ref, setRef] = useState<Referencias>(REFERENCIAS_INICIALES);
  const [refEdit, setRefEdit] = useState<Referencias | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    documentosRepo().cargarReferencias().then(setRef, () => undefined);
  }, []);

  const v: Viatico = fecha.viatico ?? viaticoNuevo();
  const c = useMemo(() => calcular(v, ref), [v, ref]);
  const arreglo = leerPesos(fecha.arreglo?.montoARS);
  const empezado = !!fecha.viatico;

  const set = (cambio: Partial<Viatico>) => actualizar(fecha.id, (f) => ({ ...f, viatico: { ...(f.viatico ?? viaticoNuevo()), ...cambio } }));

  const numero = (k: 'personas' | 'km' | 'peajes', label: string, sufijo?: string) => (
    <label className="mini-campo">
      <span>{label}</span>
      <span className="calc__input">
        {k === 'peajes' && <em>$</em>}
        <Input inputMode="decimal" value={v[k] ? String(v[k]) : ''} placeholder="0" onChange={(e) => set({ [k]: aNum(e.target.value) ?? 0 })} />
        {sufijo && <em>{sufijo}</em>}
      </span>
    </label>
  );

  const ajuste = (k: 'autos' | 'pizzas' | 'bidones' | 'materiales' | 'horasPreparacion', label: string, auto: number, prefijo?: string) => (
    <label className="mini-campo">
      <span>{label}</span>
      <span className="calc__input">
        {prefijo && <em>{prefijo}</em>}
        <Input inputMode="decimal" value={v[k] !== undefined ? String(v[k]) : ''} placeholder={`${num(auto, 1)} (auto)`} onChange={(e) => set({ [k]: aNum(e.target.value) })} />
      </span>
    </label>
  );

  async function onCopiar() {
    const ok = await copiar(textoViatico(fecha.nombre, v, ref, c, arreglo));
    toast(ok ? 'Cuenta copiada 📋' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }

  async function guardarReferencias() {
    if (!refEdit) return;
    setGuardando(true);
    try {
      const quien = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : undefined;
      const hoy = new Date();
      const r = { ...refEdit, actualizado: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`, actualizadoPor: quien };
      await documentosRepo().guardarReferencias(r);
      setRef(r);
      setRefEdit({ ...r });
      toast('Precios actualizados para todas las fechas.');
    } catch {
      toast('No pudimos guardar los precios. Probá de nuevo con conexión.', 'error');
    } finally {
      setGuardando(false);
    }
  }

  const refCampo = (k: keyof Referencias, label: string, prefijo?: string, sufijo?: string) => (
    <label className="mini-campo">
      <span>{label}</span>
      <span className="calc__input">
        {prefijo && <em>{prefijo}</em>}
        <Input inputMode="decimal" value={String(refEdit?.[k] ?? '')} onChange={(e) => setRefEdit((r) => (r ? { ...r, [k]: aNum(e.target.value) ?? 0 } : r))} />
        {sufijo && <em>{sufijo}</em>}
      </span>
    </label>
  );

  const [ay, am, ad] = ref.actualizado.split('-');

  return (
    <div className="calc" id="viatico">
      <div className="arreglo__cabeza">
        <h3 className="arreglo__titulo">¿Cuánto nos cuesta movernos?</h3>
        {empezado && <span className="calc__total-chip">{plata(c.totalDirectos)}</span>}
      </div>
      <p className="arreglo__bajada">
        Calculadora de viático: nafta, peajes, comida, agua y materiales. Sirve para negociar el arreglo y para tener dimensión de lo que cuesta cada fecha.
      </p>

      <div className="form__fila form__fila--3 calc__fila">
        {numero('personas', 'Personas', 'pers.')}
        {numero('km', 'Km ida y vuelta', 'km')}
        {numero('peajes', 'Peajes')}
      </div>

      <details className="calc__ajustes">
        <summary>Ajustar cantidades (si no, se calculan solas)</summary>
        <div className="form__fila form__fila--3 calc__fila">
          {ajuste('autos', 'Autos', c.autos)}
          {ajuste('pizzas', 'Pizzas', c.pizzas)}
          {ajuste('bidones', 'Bidones', c.bidones)}
          {ajuste('materiales', 'Materiales', ref.materiales, '$')}
          {ajuste('horasPreparacion', 'Horas prep. c/u', ref.horasPreparacion)}
        </div>
        <div className="calc__extras">
          {v.extras.map((x) => (
            <div key={x.id} className="calc__extra">
              <Input aria-label="Concepto" placeholder="ej: estacionamiento" value={x.concepto} onChange={(e) => set({ extras: v.extras.map((y) => (y.id === x.id ? { ...y, concepto: e.target.value } : y)) })} />
              <span className="calc__input">
                <em>$</em>
                <Input aria-label="Monto" inputMode="decimal" value={x.monto ? String(x.monto) : ''} onChange={(e) => set({ extras: v.extras.map((y) => (y.id === x.id ? { ...y, monto: aNum(e.target.value) ?? 0 } : y)) })} />
              </span>
              <button type="button" className="icon-btn" aria-label="Sacar" onClick={() => set({ extras: v.extras.filter((y) => y.id !== x.id) })}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
          <button type="button" className="link-btn" onClick={() => set({ extras: [...v.extras, { id: uid('ext'), concepto: '', monto: 0 }] })}>
            <Icon name="plus" size={16} /> Sumar otro gasto
          </button>
        </div>
      </details>

      <table className="calc__tabla">
        <tbody>
          {c.directos.map((d) => (
            <tr key={d.id}>
              <th scope="row">
                {d.concepto}
                {d.detalle && <small>{d.detalle}</small>}
              </th>
              <td>{plata(d.monto)}</td>
            </tr>
          ))}
          <tr className="calc__sub">
            <th scope="row">
              Gastos directos
              <small>{v.personas ? `${plata(c.porPersona)} por persona` : ''}</small>
            </th>
            <td>{plata(c.totalDirectos)}</td>
          </tr>
          {v.conTiempo && (
            <tr className="calc__tiempo">
              <th scope="row">
                Valor del tiempo de preparación
                <small>
                  {num(c.horas)} h × {plata(c.valorHora)} la hora (estimación nuestra, no tarifa oficial)
                </small>
              </th>
              <td>{plata(c.tiempo)}</td>
            </tr>
          )}
          {v.conTiempo && (
            <tr className="calc__total">
              <th scope="row">Costo total estimado</th>
              <td>{plata(c.total)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <label className="check">
        <input type="checkbox" checked={v.conTiempo} onChange={(e) => set({ conTiempo: e.target.checked })} />
        <span>Sumar el valor del tiempo de preparación (maquillaje, vestuario, organización)</span>
      </label>
      <p className="calc__nota">No incluye horas de traslado, la actuación, los ensayos ni el trabajo de producción.</p>

      {arreglo !== undefined && c.totalDirectos > 0 && (
        <p className={`calc__compara ${arreglo >= c.totalDirectos ? 'ok' : ''}`}>
          {arreglo >= c.totalDirectos
            ? `El arreglo (${plata(arreglo)}) cubre los gastos directos y sobran ${plata(arreglo - c.totalDirectos)}.`
            : `El arreglo (${plata(arreglo)}) cubre el ${num((arreglo / c.totalDirectos) * 100)}% de los gastos directos: faltan ${plata(c.totalDirectos - arreglo)}.`}
        </p>
      )}

      <button type="button" className="btn btn--secundario btn--block" onClick={onCopiar} disabled={!v.personas}>
        <Icon name="copy" size={18} /> Copiar la cuenta
      </button>

      <details className="calc__ref" onToggle={(e) => setRefEdit((e.currentTarget as HTMLDetailsElement).open ? { ...ref } : null)}>
        <summary>
          Precios de referencia (para todas las fechas) · {ad}/{am}/{ay}
          {ref.actualizadoPor ? ` por ${ref.actualizadoPor}` : ''}
        </summary>
        {referenciasViejas(ref) && <p className="aviso aviso--pendiente">Hace más de un mes y medio que no se actualizan. ¿Siguen vigentes?</p>}
        {refEdit && (
          <>
            <div className="form__fila form__fila--3 calc__fila">
              {refCampo('nafta', 'Nafta por litro', '$')}
              {refCampo('consumo', 'Consumo', '', 'l/100km')}
              {refCampo('personasPorAuto', 'Personas por auto')}
              {refCampo('pizzaPrecio', 'Pizza grande', '$')}
              {refCampo('personasPorPizza', 'Personas por pizza')}
              {refCampo('bidonPrecio', 'Bidón de agua', '$')}
              {refCampo('bidonLitros', 'Litros por bidón', '', 'l')}
              {refCampo('litrosPorPersona', 'Agua por persona', '', 'l')}
              {refCampo('materiales', 'Materiales por fecha', '$')}
              {refCampo('horasPreparacion', 'Horas de prep. c/u', '', 'h')}
              {refCampo('salarioMensual', 'Salario de referencia', '$')}
              {refCampo('horasMes', 'Horas por mes', '', 'h')}
            </div>
            <label className="mini-campo mini-campo--full">
              <span>De dónde sale el salario de referencia</span>
              <Input value={refEdit.referenciaSalarial} onChange={(e) => setRefEdit((r) => (r ? { ...r, referenciaSalarial: e.target.value } : r))} />
            </label>
            <p className="calc__nota">
              Valor hora: {plata(refEdit.horasMes ? refEdit.salarioMensual / refEdit.horasMes : 0)}. Cambiar estos precios cambia la cuenta de todas las fechas.
            </p>
            <div className="integrador__secundarias">
              <button type="button" className="btn btn--mega" onClick={guardarReferencias} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar precios'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setRefEdit({ ...ref })}>
                Deshacer cambios
              </button>
            </div>
          </>
        )}
      </details>
    </div>
  );
}
