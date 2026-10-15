import { useStore } from './store';
import { useRuta } from './router';
import { HomeView } from './views/HomeView';
import { NuevaFechaView } from './views/NuevaFechaView';
import { FechaView } from './views/FechaView';
import { DocsView } from './views/DocsView';
import { GuiaView } from './views/GuiaView';
import { Marca } from './components/ui';

export function App() {
  const ruta = useRuta();
  const { cargando, error } = useStore();

  if (cargando) {
    return (
      <div className="cargando" aria-busy="true">
        <Marca grande />
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="error-global" role="alert">
          {error}
        </div>
      )}
      {ruta.nombre === 'home' && <HomeView />}
      {ruta.nombre === 'nueva' && <NuevaFechaView />}
      {ruta.nombre === 'docs' && <DocsView />}
      {ruta.nombre === 'proceso' && <GuiaView />}
      {ruta.nombre === 'fecha' && <FechaView id={ruta.id} seccion={ruta.seccion} />}
    </>
  );
}
