import { href } from '../router';

/** Lista ↔ Calendario */
export function VistaToggle({ actual }: { actual: 'lista' | 'calendario' }) {
  return (
    <nav className="vista-toggle" aria-label="Cómo ver las fechas">
      <a href={href({ nombre: 'home' })} className={actual === 'lista' ? 'is-on' : ''} aria-current={actual === 'lista' ? 'page' : undefined}>
        ☰ Lista
      </a>
      <a
        href={href({ nombre: 'calendario' })}
        className={actual === 'calendario' ? 'is-on' : ''}
        aria-current={actual === 'calendario' ? 'page' : undefined}
      >
        📅 Calendario
      </a>
    </nav>
  );
}
