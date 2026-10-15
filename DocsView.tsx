import { useEffect, useRef, useState } from 'react';
import { href } from '../router';
import { CATEGORIAS_DOCUMENTOS, type Link } from '../model/types';
import { documentosRepo } from '../services/documentos';
import { SinConexion } from '../services/supabaseRepository';
import { LinksEditor } from '../components/LinksEditor';
import { Icon, TituloSeccion } from '../components/ui';
import { useToast } from '../components/Toast';

export function DocsView() {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [error, setError] = useState('');
  const toast = useToast();
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    documentosRepo()
      .cargar()
      .then((l) => vivo.current && setLinks(l))
      .catch(() => vivo.current && setError('No pudimos traer la documentación. Probá recargar.'));
    return () => {
      vivo.current = false;
    };
  }, []);

  const guardar = async (nuevos: Link[]) => {
    setLinks(nuevos);
    try {
      await documentosRepo().guardar(nuevos);
      toast('Guardado.');
    } catch (e) {
      if (e instanceof SinConexion) toast('Sin señal: queda en este dispositivo. Volvé a guardarlo con conexión.', 'error');
      else toast('No pudimos guardar el link.', 'error');
    }
  };

  return (
    <div className="pantalla">
      <header className="barra">
        <a href={href({ nombre: 'home' })} className="barra__volver" aria-label="Volver al inicio">
          <Icon name="back" />
        </a>
        <span className="barra__titulo">La Produ</span>
      </header>
      <main className="contenedor contenedor--angosto">
        <TituloSeccion bajada="Lo que usamos en todas las fechas: riders, Drives, kit de prensa y dónde está cada cosa.">
          Documentación y accesos
        </TituloSeccion>
        {error && (
          <p className="aviso aviso--alerta" role="alert">
            {error}
          </p>
        )}
        {links === null && !error && <p className="vacio">Trayendo los links…</p>}
        {links && <LinksEditor links={links} categorias={CATEGORIAS_DOCUMENTOS} onChange={guardar} />}
        <p className="links__aviso">
          <Icon name="alert" size={16} /> No guardes contraseñas acá: anotá dónde están o quién tiene el acceso.
        </p>
      </main>
    </div>
  );
}
