import { useEffect, useRef } from 'react';
import { Campanita } from '../components/Campanita';
import { useStore } from '../store';
import { href } from '../router';
import { SECCIONES_NAV, getSeccion } from '../model/checklist';
import { fechaCorta, pendientesAbiertos, progresoGeneral } from '../model/logic';
import type { Fecha, SeccionId } from '../model/types';
import { EstadoSticker, Icon, Progreso, Vacio } from '../components/ui';
import { ResumenView } from './ResumenView';
import { PendientesView } from './PendientesView';
import { ChecklistView } from './ChecklistView';
import { EconomiaView } from './EconomiaView';
import { UpdatesView } from './UpdatesView';
import { CierreView } from './CierreView';
import { LinksView } from './LinksView';
import { IntegradorView } from './IntegradorView';
import { useBitacora } from '../pdf/useBitacora';
import { EstadoGuardado } from '../components/EstadoGuardado';

export function FechaView({ id, seccion }: { id: string; seccion: SeccionId }) {
  const { fechas } = useStore();
  const fecha = fechas.find((f) => f.id === id);
  const navRef = useRef<HTMLElement>(null);
  const { generar, generando } = useBitacora();

  useEffect(() => {
    const activo = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    activo?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    window.scrollTo({ top: 0 });
  }, [seccion]);

  if (!fecha) {
    return (
      <div className="pantalla">
        <main className="contenedor">
          <Vacio>No encontramos esta fecha. Puede que se haya borrado.</Vacio>
          <a className="btn btn--primario" href={href({ nombre: 'home' })}>
            Volver al inicio
          </a>
        </main>
      </div>
    );
  }

  const prog = progresoGeneral(fecha);
  const pend = pendientesAbiertos(fecha).length;

  return (
    <div className="pantalla">
      <header className="cabecera">
        <div className="cabecera__fila">
          <a href={href({ nombre: 'home' })} className="barra__volver" aria-label="Volver a todas las fechas">
            <Icon name="back" />
          </a>
          <span className="cabecera__marca">LA PRODU</span>
          <EstadoGuardado />
          <Campanita />
          <button
            type="button"
            className="btn btn--pdf"
            onClick={() => generar(fecha)}
            disabled={generando}
            aria-label="Generar bitácora en PDF"
          >
            <Icon name="pdf" size={18} /> {generando ? 'Armando…' : 'Bitácora'}
          </button>
        </div>
        <h1 className="cabecera__nombre">{fecha.nombre}</h1>
        <p className="cabecera__meta">
          <EstadoSticker estado={fecha.estado} />
          <span>{fechaCorta(fecha.fecha)}</span>
          <span aria-hidden="true">·</span>
          <span>{fecha.lugar || 'Lugar a definir'}</span>
          {fecha.responsable && (
            <>
              <span aria-hidden="true">·</span>
              <span>{fecha.responsable}</span>
            </>
          )}
        </p>
        {fecha.estado !== 'idea' && (
        <div className="indicadores">
          {fecha.estado === 'cerrada' ? (
            <div className="indicador indicador--cerrada">
              <span className="indicador__num">
                <Icon name="check" size={18} /> Fecha cerrada
              </span>
              <span className="indicador__sub">Checklist registrado: {prog.porcentaje}%</span>
            </div>
          ) : (
            <div className="indicador">
              <span className="indicador__num">Producción {prog.porcentaje}%</span>
              <Progreso porcentaje={prog.porcentaje} />
            </div>
          )}
          <a
            className={`indicador indicador--pend ${pend ? 'has' : ''}`}
            href={href({ nombre: 'fecha', id, seccion: 'pendientes' })}
          >
            <Icon name="flag" size={16} /> {pend} pendiente{pend === 1 ? '' : 's'}
          </a>
        </div>
        )}
      </header>

      <nav ref={navRef} className="secciones" aria-label="Secciones de la fecha">
        {SECCIONES_NAV.map((s) => (
          <a
            key={s.id}
            href={href({ nombre: 'fecha', id, seccion: s.id })}
            className={`secciones__item ${seccion === s.id ? 'is-on' : ''}`}
            aria-current={seccion === s.id ? 'page' : undefined}
          >
            {s.corto}
            {s.id === 'pendientes' && pend > 0 && <span className="secciones__badge">{pend}</span>}
          </a>
        ))}
      </nav>

      <main className="contenedor">
        <Contenido fecha={fecha} seccion={seccion} />
        <SiguienteSeccion id={id} seccion={seccion} />
      </main>
    </div>
  );
}

function Contenido({ fecha, seccion }: { fecha: Fecha; seccion: SeccionId }) {
  switch (seccion) {
    case 'resumen':
      return <ResumenView fecha={fecha} />;
    case 'pendientes':
      return <PendientesView fecha={fecha} />;
    case 'economia':
      return <EconomiaView fecha={fecha} />;
    case 'updates':
      return <UpdatesView fecha={fecha} />;
    case 'cierre':
      return <CierreView fecha={fecha} />;
    case 'links':
      return <LinksView fecha={fecha} />;
    case 'integrador':
      return <IntegradorView fecha={fecha} />;
    default: {
      const s = getSeccion(seccion);
      return s ? <ChecklistView fecha={fecha} seccion={s} /> : null;
    }
  }
}

function SiguienteSeccion({ id, seccion }: { id: string; seccion: SeccionId }) {
  const i = SECCIONES_NAV.findIndex((s) => s.id === seccion);
  const sig = SECCIONES_NAV[i + 1];
  if (!sig) return null;
  return (
    <a className="siguiente" href={href({ nombre: 'fecha', id, seccion: sig.id })}>
      <span className="siguiente__pre">Seguimos con</span>
      <span className="siguiente__nombre">
        {sig.label} <Icon name="arrow" />
      </span>
    </a>
  );
}
