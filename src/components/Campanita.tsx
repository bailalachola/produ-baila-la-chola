import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { href } from '../router';
import { todasLasNovedades, nombreCorto } from '../model/actividad';
import { useSesion } from './Acceso';
import { Icon } from './ui';

/**
 * Lo "no leído" se guarda por dispositivo: la última vez que esta persona
 * abrió las novedades en este navegador.
 */
const CLAVE = 'produ-blc:novedades-vistas';
const EVENTO = 'produ-novedades-vistas';

export function leerVistas(): string {
  try {
    return window.localStorage.getItem(CLAVE) ?? '';
  } catch {
    return '';
  }
}

export function marcarVistas(): void {
  try {
    window.localStorage.setItem(CLAVE, new Date().toISOString());
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Novedades de las demás que todavía no viste */
export function useSinLeer(): number {
  const { fechas } = useStore();
  const sesion = useSesion();
  const yo = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : 'Vos';
  const [vistas, setVistas] = useState(leerVistas);
  useEffect(() => {
    const on = () => setVistas(leerVistas());
    window.addEventListener(EVENTO, on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener(EVENTO, on);
      window.removeEventListener('storage', on);
    };
  }, []);
  return useMemo(() => {
    // la primera vez, solo cuenta lo de la última semana
    const desde = vistas || new Date(Date.now() - 7 * 86_400_000).toISOString();
    return todasLasNovedades(fechas).filter((n) => n.cuando > desde && n.autor !== yo).length;
  }, [fechas, vistas, yo]);
}

export function Campanita({ className = '' }: { className?: string }) {
  const n = useSinLeer();
  return (
    <a
      href={href({ nombre: 'novedades' })}
      className={`campanita ${n ? 'has' : ''} ${className}`}
      aria-label={n ? `Novedades: ${n} sin leer` : 'Novedades'}
    >
      <Icon name="bell" size={22} />
      {n > 0 && <span className="campanita__n">{n > 99 ? '99+' : n}</span>}
    </a>
  );
}
