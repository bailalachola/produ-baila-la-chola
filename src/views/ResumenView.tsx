import { useStore } from '../store';
import { href, ir } from '../router';
import { CHECKLIST, seccionLabel } from '../model/checklist';
import { faltantesCriticos, pendientesAbiertos, progresoSeccion } from '../model/logic';
import { ESTADOS, ESTADO_LABEL, RELATO_PREVIO, TIPOS_FECHA, type Fecha } from '../model/types';
import { RelatoCampos } from '../components/RelatoCampos';
import { Campo, Icon, Input, Progreso, Select, TextArea, TituloSeccion } from '../components/ui';
import { ahora, uid } from '../model/factory';
import { RiesgosEditor } from '../components/RiesgosEditor';
import { QuorumBloque } from '../components/QuorumBloque';
import { useConfirmar } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { useBitacora } from '../pdf/useBitacora';

export function ResumenView({ fecha }: { fecha: Fecha }) {
  const { actualizar, eliminar } = useStore();
  const confirmar = useConfirmar();
  const toast = useToast();
  const { generar, generando } = useBitacora();
  const faltan = faltantesCriticos(fecha);
  const pend = pendientesAbiertos(fecha);

  const set = <K extends keyof Fecha>(k: K, v: Fecha[K]) => actualizar(fecha.id, (f) => ({ ...f, [k]: v }));

  const esIdea = fecha.estado === 'idea';

  async function onProducir() {
    const quien = fecha.responsable.trim();
    if (!quien) {
      toast('Antes de arrancar, decí quién queda responsable.', 'error');
      document.getElementById('idea-resp')?.focus();
      return;
    }
    actualizar(fecha.id, (f) => ({
      ...f,
      estado: 'produccion',
      updates: [
        { id: uid('upd'), cuando: ahora(), categoria: 'DECISIÓN', texto: `Decidimos ir: pasamos la idea a producción. Responsable de Producción: ${quien}.`, autor: quien },
        ...f.updates,
      ],
    }));
    toast('¡A producir! Arrancamos por el checklist 🥁');
    ir({ nombre: 'fecha', id: fecha.id, seccion: 'espacio' });
  }

  async function onEliminar() {
    const ok = await confirmar(
      '¿Borramos esta fecha?',
      `Se borra “${fecha.nombre}” con todo su checklist, economía y updates. No se puede deshacer. Si querés, antes exportá un backup desde el inicio.`,
      'Sí, borrar la fecha',
    );
    if (!ok) return;
    try {
      await eliminar(fecha.id);
      toast('Fecha borrada.');
      ir({ nombre: 'home' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No pudimos borrar la fecha.', 'error');
    }
  }

  return (
    <section className="resumen">
      <TituloSeccion>Resumen</TituloSeccion>

      {esIdea && (
        <div className="idea">
          <p className="idea__sello">💡 Es una idea</p>
          <p className="idea__texto">
            Todavía no la estamos produciendo. Anotá lo que vayan sabiendo; cuando decidan ir, la pasan a producción y arranca el checklist.
          </p>
          <div className="form">
            <Campo id="idea-nota" label="¿De qué se trata?">
              <TextArea
                id="idea-nota"
                rows={4}
                placeholder="Cómo llegó, qué nos entusiasma, qué habría que averiguar…"
                value={fecha.nota ?? ''}
                onChange={(e) => set('nota', e.target.value)}
              />
            </Campo>
            <Campo id="idea-resp" label="¿Quién la produciría?" hint="Hace falta para pasarla a producción.">
              <Input id="idea-resp" value={fecha.responsable} placeholder="nombre o comisión" onChange={(e) => set('responsable', e.target.value)} />
            </Campo>
          </div>
          <QuorumBloque fecha={fecha} />
          {fecha.quorum?.resultado !== 'no' && (
            <button type="button" className="btn btn--mega btn--block" onClick={onProducir}>
              ¡Vamos! Pasar a producción <Icon name="arrow" />
            </button>
          )}
        </div>
      )}

      {fecha.estado === 'produccion' && (
        <details className="quorum-plegado" open={!!fecha.quorum}>
          <summary>Quórum de la murga</summary>
          <QuorumBloque fecha={fecha} />
        </details>
      )}

      {!esIdea && (faltan.length > 0 || pend.length > 0) && (
        <div className="falta">
          <h3 className="falta__titulo">Antes de cerrar la fecha nos falta…</h3>
          <ul className="falta__lista">
            {faltan.map((u) => (
              <li key={u.pregunta.id}>
                <a href={href({ nombre: 'fecha', id: fecha.id, seccion: u.seccion })}>
                  <span className="tag">{seccionLabel(u.seccion)}</span> {u.pregunta.label}
                </a>
              </li>
            ))}
            {pend.length > 0 && (
              <li>
                <a href={href({ nombre: 'fecha', id: fecha.id, seccion: 'pendientes' })}>
                  <span className="tag tag--alerta">Pendientes</span> {pend.length} cosa{pend.length === 1 ? '' : 's'} a
                  resolver
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="bloque">
        <h3 className="bloque__titulo">¿En qué estado está?</h3>
        <div className="estados" role="group" aria-label="Estado de la fecha">
          {ESTADOS.map((e) => (
            <button
              key={e}
              type="button"
              className={`chip chip--estado chip--${e} ${fecha.estado === e ? 'is-on' : ''}`}
              aria-pressed={fecha.estado === e}
              onClick={() => set('estado', e)}
            >
              {ESTADO_LABEL[e]}
            </button>
          ))}
        </div>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Checklist por sección</h3>
        <ul className="mapa">
          {CHECKLIST.map((s) => {
            const p = progresoSeccion(fecha, s.id);
            return (
              <li key={s.id}>
                <a className="mapa__item" href={href({ nombre: 'fecha', id: fecha.id, seccion: s.id })}>
                  <span className="mapa__nombre">{s.titulo}</span>
                  <Progreso porcentaje={p.porcentaje} label={s.titulo} />
                  <span className="mapa__n">
                    {p.hechas}/{p.total}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Datos generales</h3>
        <div className="form">
          <Campo id="r-nombre" label="Nombre de la fecha">
            <Input id="r-nombre" value={fecha.nombre} onChange={(e) => set('nombre', e.target.value)} />
          </Campo>
          <Campo id="r-evento" label="Nombre completo del evento" hint="Si es distinto del nombre corto.">
            <Input id="r-evento" value={fecha.evento ?? ''} onChange={(e) => set('evento', e.target.value)} />
          </Campo>
          <Campo id="r-formato" label="Formato de la presentación">
            <Input
              id="r-formato"
              placeholder="ej: recorte del espectáculo en la programación cultural"
              value={fecha.formato ?? ''}
              onChange={(e) => set('formato', e.target.value)}
            />
          </Campo>
          <div className="form__fila">
            <Campo id="r-fecha" label="Fecha">
              <Input id="r-fecha" type="date" value={fecha.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </Campo>
            <Campo id="r-tipo" label="Tipo">
              <Select id="r-tipo" value={fecha.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {[...new Set([...TIPOS_FECHA, fecha.tipo])].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Campo>
            <Campo id="r-lugar" label="Lugar">
              <Input id="r-lugar" value={fecha.lugar} onChange={(e) => set('lugar', e.target.value)} />
            </Campo>
            <Campo id="r-dir" label="Dirección">
              <Input
                id="r-dir"
                value={fecha.direccion ?? ''}
                onChange={(e) =>
                  actualizar(fecha.id, (f) => ({
                    ...f,
                    direccion: e.target.value,
                    respuestas: { ...f.respuestas, esp_direccion: { ...f.respuestas.esp_direccion, valor: e.target.value } },
                  }))
                }
              />
            </Campo>
            <Campo id="r-resp" label="Producción (responsables)">
              <Input id="r-resp" value={fecha.responsable} onChange={(e) => set('responsable', e.target.value)} />
            </Campo>
            <Campo id="r-cont" label="Contraparte / contacto">
              <Input id="r-cont" value={fecha.contacto ?? ''} onChange={(e) => set('contacto', e.target.value)} />
            </Campo>
          </div>
        </div>
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Relato de producción</h3>
        <RelatoCampos fecha={fecha} campos={RELATO_PREVIO} />
      </div>

      <div className="bloque">
        <h3 className="bloque__titulo">Riesgos y condiciones</h3>
        <RiesgosEditor fecha={fecha} />
      </div>

      <div className="acciones-finales">
        {!esIdea && fecha.estado !== 'cerrada' && fecha.estado !== 'realizada' && (
          <a className="btn btn--mega btn--block btn--alt" href={href({ nombre: 'fecha', id: fecha.id, seccion: 'integrador' })}>
            <Icon name="copy" size={24} /> Armar integrador
          </a>
        )}
        {!esIdea && fecha.estado !== 'cerrada' && (
          <a className="btn btn--secundario btn--block" href={href({ nombre: 'fecha', id: fecha.id, seccion: 'updates' })}>
            🟢 Armar update para el grupo
          </a>
        )}
        <button type="button" className="btn btn--mega btn--block" onClick={() => generar(fecha)} disabled={generando}>
          <Icon name="pdf" size={24} /> {generando ? 'Armando la bitácora…' : 'Generar bitácora'}
        </button>
        <button type="button" className="btn btn--ghost btn--peligro-txt" onClick={onEliminar}>
          <Icon name="trash" size={18} /> Borrar esta fecha
        </button>
      </div>
    </section>
  );
}
