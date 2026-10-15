import { useStore } from '../store';
import { riesgosDerivados } from '../model/logic';
import { uid } from '../model/factory';
import { TIPO_RIESGO_LABEL, type Fecha, type Riesgo, type TipoRiesgo } from '../model/types';
import { Icon, Input, Select } from './ui';
import { useConfirmar } from './Dialog';

const TIPOS = Object.keys(TIPO_RIESGO_LABEL) as TipoRiesgo[];

const AYUDA: Record<TipoRiesgo, string> = {
  minima: 'Lo que tiene que estar sí o sí para tocar.',
  asumido: 'Lo sabíamos y decidimos ir igual.',
  inesperado: 'No lo vimos venir.',
};

export function RiesgosEditor({ fecha, conResultado = false }: { fecha: Fecha; conResultado?: boolean }) {
  const { actualizar } = useStore();
  const confirmar = useConfirmar();
  const derivados = riesgosDerivados(fecha);

  const set = (id: string, cambio: Partial<Riesgo>) =>
    actualizar(fecha.id, (f) => ({ ...f, riesgos: f.riesgos.map((r) => (r.id === id ? { ...r, ...cambio } : r)) }));

  const agregar = (tipo: TipoRiesgo) =>
    actualizar(fecha.id, (f) => ({ ...f, riesgos: [...f.riesgos, { id: uid('rsg'), tipo, descripcion: '' }] }));

  const borrar = async (r: Riesgo) => {
    if (!r.descripcion || (await confirmar('¿Borramos este riesgo?', r.descripcion, 'Borrar'))) {
      actualizar(fecha.id, (f) => ({ ...f, riesgos: f.riesgos.filter((x) => x.id !== r.id) }));
    }
  };

  return (
    <div className="riesgos">
      <ul className="riesgos__leyenda">
        {TIPOS.map((t) => (
          <li key={t}>
            <span className={`rtag rtag--${t}`}>{TIPO_RIESGO_LABEL[t]}</span> {AYUDA[t]}
          </li>
        ))}
      </ul>

      {derivados.map((r) => (
        <div key={r.id} className={`riesgo riesgo--${r.tipo} riesgo--auto`}>
          <span className={`rtag rtag--${r.tipo}`}>{TIPO_RIESGO_LABEL[r.tipo]}</span>
          <p className="riesgo__desc">{r.descripcion}</p>
          <p className="riesgo__auto">Salió del checklist</p>
          {conResultado && (
            <Input
              aria-label="Qué pasó finalmente"
              placeholder="¿Qué pasó finalmente?"
              value={fecha.cierre.resultadoRiesgo[r.id] ?? ''}
              onChange={(e) =>
                actualizar(fecha.id, (f) => ({
                  ...f,
                  cierre: { ...f.cierre, resultadoRiesgo: { ...f.cierre.resultadoRiesgo, [r.id]: e.target.value } },
                }))
              }
            />
          )}
        </div>
      ))}

      {fecha.riesgos.map((r) => (
        <div key={r.id} className={`riesgo riesgo--${r.tipo}`}>
          <div className="riesgo__fila">
            <Select
              aria-label="Tipo de riesgo"
              value={r.tipo}
              onChange={(e) => set(r.id, { tipo: e.target.value as TipoRiesgo })}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_RIESGO_LABEL[t]}
                </option>
              ))}
            </Select>
            <button type="button" className="icon-btn" onClick={() => borrar(r)} aria-label="Borrar riesgo">
              <Icon name="trash" size={18} />
            </button>
          </div>
          <Input
            aria-label="Descripción del riesgo"
            placeholder="¿Cuál es el riesgo o la condición?"
            value={r.descripcion}
            onChange={(e) => set(r.id, { descripcion: e.target.value })}
          />
          {conResultado && (
            <Input
              aria-label="Qué pasó finalmente"
              placeholder="¿Qué pasó finalmente?"
              value={r.resultado ?? ''}
              onChange={(e) => set(r.id, { resultado: e.target.value })}
            />
          )}
        </div>
      ))}

      <div className="riesgos__agregar">
        {TIPOS.map((t) => (
          <button key={t} type="button" className={`chip chip--mini rchip--${t}`} onClick={() => agregar(t)}>
            + {TIPO_RIESGO_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
