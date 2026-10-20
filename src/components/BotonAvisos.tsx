import { useEffect, useState } from 'react';
import { activarAvisos, desactivarAvisos, estadoAvisos, probarAviso, type EstadoAvisos } from '../services/avisos';
import { useSesion } from './Acceso';
import { useToast } from './Toast';

/** Activar / apagar los avisos al celu en este dispositivo */
export function BotonAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const sesion = useSesion();
  const toast = useToast();

  useEffect(() => {
    estadoAvisos().then(setEstado, () => setEstado('no-soportado'));
  }, []);

  if (!estado || estado === 'no-soportado' || sesion.modo !== 'nube') return null;

  async function hacer(accion: () => Promise<void>, ok: string) {
    setOcupado(true);
    try {
      await accion();
      toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Algo falló. Probá de nuevo.', 'error');
    } finally {
      setEstado(await estadoAvisos().catch(() => 'no-soportado' as const));
      setOcupado(false);
    }
  }

  return (
    <section className="avisos" aria-labelledby="avisos-t">
      <div className="avisos__cabeza">
        <h2 id="avisos-t" className="avisos__titulo">🔔 Avisos al celu</h2>
        {estado === 'activo' && <span className="avisos__on">Activados</span>}
      </div>
      <p className="avisos__texto">
        Una vez por día, La Produ te avisa lo importante: cuánto falta para cada fecha, pendientes que vencen, quórums abiertos y
        Retiradas sin hacer. Gratis y sin WhatsApp.
      </p>
      {estado === 'instalar-primero' && (
        <p className="avisos__nota">En iPhone, primero instalá La Produ en la pantalla de inicio (Compartir → Agregar a inicio) y abrila desde ahí.</p>
      )}
      {estado === 'bloqueado' && (
        <p className="avisos__nota">Bloqueaste las notificaciones para La Produ. Para activarlas, habilitalas en la configuración del navegador.</p>
      )}
      {estado === 'apagado' && (
        <button
          type="button"
          className="btn btn--secundario"
          disabled={ocupado}
          onClick={() => hacer(() => activarAvisos(sesion.modo === 'nube' ? sesion.email : undefined), '¡Listo! Te van a llegar los avisos 🔔')}
        >
          {ocupado ? 'Activando…' : 'Activar avisos en este dispositivo'}
        </button>
      )}
      {estado === 'activo' && (
        <div className="avisos__acciones">
          <button type="button" className="btn btn--secundario" disabled={ocupado} onClick={() => hacer(probarAviso, 'Te mandamos un aviso de prueba.')}>
            Mandarme uno de prueba
          </button>
          <button type="button" className="link-btn" disabled={ocupado} onClick={() => hacer(desactivarAvisos, 'Avisos apagados en este dispositivo.')}>
            Apagar
          </button>
        </div>
      )}
    </section>
  );
}
