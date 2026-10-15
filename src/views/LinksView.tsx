import { useStore } from '../store';
import { href } from '../router';
import { CATEGORIAS_LINK_FECHA, type CategoriaLink, type Fecha, type Link } from '../model/types';
import { LinksEditor } from '../components/LinksEditor';
import { TituloSeccion } from '../components/ui';

/** Links de una fecha, filtrados por categoría (se usa también dentro de Técnica y Difusión) */
export function LinksDeFecha({ fecha, categorias }: { fecha: Fecha; categorias: CategoriaLink[] }) {
  const { actualizar } = useStore();
  const ids = new Set(categorias.map((c) => c.id));
  const propios = fecha.links.filter((l) => ids.has(l.categoria));
  const cambiar = (nuevos: Link[]) =>
    actualizar(fecha.id, (f) => ({ ...f, links: [...f.links.filter((l) => !ids.has(l.categoria)), ...nuevos] }));
  return <LinksEditor links={propios} categorias={categorias} onChange={cambiar} />;
}

export const categoriasLink = (...ids: string[]): CategoriaLink[] =>
  CATEGORIAS_LINK_FECHA.filter((c) => ids.includes(c.id));

export function LinksView({ fecha }: { fecha: Fecha }) {
  return (
    <section>
      <TituloSeccion bajada="Todos los links de esta fecha: fotos, prensa, rider, planillas. Pegá el link de Drive y listo.">
        Links
      </TituloSeccion>
      <LinksDeFecha fecha={fecha} categorias={CATEGORIAS_LINK_FECHA} />
      <p className="links__aviso">
        Los links generales de la murga (rider, kit de prensa, accesos) están en{' '}
        <a href={href({ nombre: 'docs' })}>Documentación y accesos</a>.
      </p>
    </section>
  );
}
