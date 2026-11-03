import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { MODALIDADES, arregloCompleto, arregloVacio, renglonesArreglo, type Arreglo, type Modalidad } from '../model/arreglo';
import { Icon, Input, TextArea } from './ui';

/** El arreglo económico de la fecha (obligatorio), arriba de todo en Economía */
export function ArregloBloque({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const a: Arreglo = fecha.arreglo ?? arregloVacio();
  const completo = arregloCompleto(fecha.arreglo);

  const set = (cambio: Partial<Arreglo>) =>
    actualizar(fecha.id, (f) => ({ ...f, arreglo: { ...(f.arreglo ?? arregloVacio()), ...cambio } }));

  const toggle = (m: Modalidad) => {
    let lista = a.modalidades.includes(m) ? a.modalidades.filter((x) => x !== m) : [...a.modalidades, m];
    // "Sin pago" no convive con las demás
    if (m === 'Sin pago' && lista.includes('Sin pago')) lista = ['Sin pago'];
    else if (m !== 'Sin pago') lista = lista.filter((x) => x !== 'Sin pago');
    set({ modalidades: MODALIDADES.filter((x) => lista.includes(x)) });
  };

  const campo = (k: keyof Arreglo, label: string, placeholder: string, full = false) => (
    <label className={`mini-campo ${full ? 'mini-campo--full' : ''}`}>
      <span>{label}</span>
      <Input value={(a[k] as string) ?? ''} placeholder={placeholder} onChange={(e) => set({ [k]: e.target.value })} />
    </label>
  );

  return (
    <div className={`arreglo ${completo ? 'is-completo' : ''}`} id="arreglo">
      <div className="arreglo__cabeza">
        <h3 className="arreglo__titulo">Arreglo económico</h3>
        <span className={`arreglo__estado ${completo ? 'ok' : ''}`}>{completo ? '✓ Cargado' : 'Obligatorio'}</span>
      </div>
      <p className="arreglo__bajada">
        Lo que acordamos con la producción del otro lado. Va al Integrador para que toda la murga sepa cómo es, y a la validación con la contraparte.
      </p>

      <div className="mini-campo mini-campo--full">
        <span>¿Cómo es? <em className="decision__obligatorio">(obligatorio)</em></span>
        <div className="opciones" role="group" aria-label="Modalidad del arreglo">
          {MODALIDADES.map((m) => (
            <button key={m} type="button" className={`chip ${a.modalidades.includes(m) ? 'is-on' : ''}`} aria-pressed={a.modalidades.includes(m)} onClick={() => toggle(m)}>
              {a.modalidades.includes(m) ? '✓ ' : ''}
              {m}
            </button>
          ))}
        </div>
      </div>

      {!a.modalidades.includes('Sin pago') && (
        <div className="form__fila">
          {campo('montoARS', 'Monto en pesos', 'ej: 300.000')}
          {campo('montoUSD', 'Monto en dólares (aparte)', 'ej: 100')}
        </div>
      )}
      <label className="mini-campo mini-campo--full">
        <span>
          Contalo en palabras <em className="decision__obligatorio">(obligatorio)</em>
        </span>
        <TextArea
          rows={3}
          value={a.detalle}
          aria-invalid={a.modalidades.length > 0 && !a.detalle.trim()}
          placeholder="ej: Nos dan $300.000 de viáticos para el traslado. Lo que entre a la gorra es para la murga."
          onChange={(e) => set({ detalle: e.target.value })}
        />
      </label>
      <div className="form__fila">
        {campo('cubre', '¿Qué cubre?', 'ej: traslado y comida')}
        {campo('quienPaga', '¿Quién paga?', 'ej: CC El Bondi')}
      </div>
      {campo('cuandoCobra', '¿Cuándo / cómo se cobra?', 'ej: en efectivo el día de la fecha', true)}
      <label className="check">
        <input type="checkbox" checked={!!a.confirmado} onChange={(e) => set({ confirmado: e.target.checked })} />
        <span>Confirmado con la producción del otro lado</span>
      </label>

      {completo ? (
        <div className="arreglo__vista">
          <p className="arreglo__vista-titulo">Así lo va a leer la murga en el Integrador:</p>
          {renglonesArreglo(a).map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      ) : (
        <p className="aviso aviso--alerta" role="note">
          <Icon name="alert" size={16} /> Falta el arreglo económico: elegí cómo es y contalo en palabras.
        </p>
      )}
    </div>
  );
}
