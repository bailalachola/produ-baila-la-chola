import { useEffect, useState } from 'react';
import type { SeccionId } from './model/types';

/**
 * Routing por hash (#/fecha/abc/tecnica). Funciona bajo cualquier subpath
 * de GitHub Pages sin configurar redirecciones ni 404.html.
 */
export type Ruta =
  | { nombre: 'home' }
  | { nombre: 'nueva' }
  | { nombre: 'docs' }
  | { nombre: 'fecha'; id: string; seccion: SeccionId };

const SECCIONES: SeccionId[] = [
  'resumen', 'pendientes', 'espacio', 'tecnica', 'logistica', 'artistico',
  'vestuario', 'economia', 'difusion', 'links', 'updates', 'cierre',
];

export function parsear(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (partes[0] === 'nueva') return { nombre: 'nueva' };
  if (partes[0] === 'docs') return { nombre: 'docs' };
  if (partes[0] === 'fecha' && partes[1]) {
    const s = partes[2] as SeccionId | undefined;
    return { nombre: 'fecha', id: partes[1], seccion: s && SECCIONES.includes(s) ? s : 'resumen' };
  }
  return { nombre: 'home' };
}

export function href(r: Ruta): string {
  switch (r.nombre) {
    case 'home':
      return '#/';
    case 'nueva':
      return '#/nueva';
    case 'docs':
      return '#/docs';
    case 'fecha':
      return `#/fecha/${encodeURIComponent(r.id)}/${r.seccion}`;
  }
}

export function ir(r: Ruta): void {
  window.location.hash = href(r);
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => parsear(window.location.hash));
  useEffect(() => {
    const on = () => setRuta(parsear(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return ruta;
}
