import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { ESTADO_LABEL, type EstadoFecha } from '../model/types';

/* ---------- íconos (SVG inline, sin dependencias) ---------- */

const paths = {
  plus: 'M12 5v14M5 12h14',
  back: 'M15 18l-6-6 6-6',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  download: 'M12 4v12m0 0l-5-5m5 5l5-5M4 20h16',
  upload: 'M12 20V8m0 0l-5 5m5-5l5 5M4 4h16',
  pdf: 'M7 3h7l5 5v13H7zM14 3v5h5M9 14h6M9 17h4',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  star: 'M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21.2l1.6-7L2 9.5l7.1-.6z',
  arrow: 'M5 12h14m-6-6l6 6-6 6',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  close: 'M6 6l12 12M18 6L6 18',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, title }: { name: IconName; size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'star' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={paths[name]} />
    </svg>
  );
}

/* ---------- marca ---------- */

export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <div className={`marca ${grande ? 'marca--grande' : ''}`}>
      <span className="marca__produ">
        <span className="marca__la">La</span>Produ
      </span>
      <span className="marca__chola">Baila La Chola</span>
    </div>
  );
}

/* ---------- sticker de estado ---------- */

export function EstadoSticker({ estado }: { estado: EstadoFecha }) {
  return <span className={`sticker sticker--${estado}`}>{ESTADO_LABEL[estado]}</span>;
}

/* ---------- barra de progreso ---------- */

export function Progreso({ porcentaje, label }: { porcentaje: number; label?: string }) {
  return (
    <div className="progreso" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Producción'}>
      <div className="progreso__barra" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

/* ---------- campos de formulario ---------- */

export function Campo({ label, hint, children, id }: { label: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div className="campo">
      <label htmlFor={id} className="campo__label">
        {label}
      </label>
      {children}
      {hint && <p className="campo__hint">{hint}</p>}
    </div>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...p} />;
export const TextArea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className="input input--area" rows={3} {...p} />
);
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select className="input input--select" {...p} />;

/* ---------- títulos de sección ---------- */

export function TituloSeccion({ children, bajada }: { children: ReactNode; bajada?: string }) {
  return (
    <header className="titulo-seccion">
      <h2 className="titulo-seccion__h">
        <span>{children}</span>
      </h2>
      {bajada && <p className="titulo-seccion__bajada">{bajada}</p>}
    </header>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio">{children}</p>;
}
