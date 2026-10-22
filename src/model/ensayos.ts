import type { Fecha } from './types';
import { conHs } from './integrador';
import { diaCorto, hoyISO } from './agenda';

/**
 * ENSAYOS AD HOC
 * --------------
 * Algunas fechas piden ensayos aparte: otro lugar, otro día, otro horario, con
 * todo lo que implica (reservar, avisar, trasladarse, llevar instrumentos).
 * Cada ensayo se produce como una mini fecha dentro de la fecha.
 */

export type EstadoEnsayo = 'a_confirmar' | 'confirmado' | 'hecho' | 'cancelado';

export const ESTADO_ENSAYO_LABEL: Record<EstadoEnsayo, string> = {
  a_confirmar: 'A confirmar',
  confirmado: 'Confirmado',
  hecho: 'Hecho',
  cancelado: 'Cancelado',
};

/** Lo que hay que tener resuelto para que el ensayo salga */
export const CHECKS_ENSAYO = [
  { id: 'lugar', label: 'Lugar reservado / confirmado', pend: 'reservar o confirmar el lugar' },
  { id: 'aviso', label: 'Avisamos a la murga', pend: 'avisar a la murga' },
  { id: 'traslado', label: 'Traslado resuelto', pend: 'resolver el traslado' },
  { id: 'instrumentos', label: 'Instrumentos y equipo resueltos', pend: 'resolver instrumentos y equipo' },
  { id: 'pago', label: 'Pago del lugar resuelto (si hay)', pend: 'resolver el pago del lugar' },
] as const;
export type CheckEnsayo = (typeof CHECKS_ENSAYO)[number]['id'];

export interface Ensayo {
  id: string;
  /** para qué es: "Ensayo de Cutre", "Pasada con la banda"… */
  titulo: string;
  dia: string;
  desde?: string;
  hasta?: string;
  lugar?: string;
  direccion?: string;
  /** qué ensayamos / objetivo */
  objetivo?: string;
  /** quién lo produce */
  responsable?: string;
  /** quiénes van (toda la murga, solo la percu…) */
  quienes?: string;
  traslado?: string;
  encuentro?: string;
  salida?: string;
  llevar?: string;
  costo?: string;
  notas?: string;
  estado: EstadoEnsayo;
  checks: Partial<Record<CheckEnsayo, boolean | 'na'>>;
  creado: string;
}

export const nuevoEnsayo = (id: string, creado: string): Ensayo => ({
  id,
  titulo: '',
  dia: '',
  estado: 'a_confirmar',
  checks: {},
  creado,
});

/** Lo que le falta resolver a un ensayo que sigue en pie */
export function faltantesEnsayo(e: Ensayo): string[] {
  if (e.estado === 'cancelado' || e.estado === 'hecho') return [];
  const falta: string[] = [];
  if (!e.dia) falta.push('definir el día');
  if (!e.lugar?.trim()) falta.push('definir el lugar');
  for (const c of CHECKS_ENSAYO) if (!e.checks[c.id]) falta.push(c.pend);
  return falta;
}

export const nombreEnsayo = (e: Ensayo) => e.titulo.trim() || 'Ensayo';

export function horarioEnsayo(e: Ensayo): string {
  if (e.desde && e.hasta) return `${e.desde} a ${conHs(e.hasta)}`;
  if (e.desde) return conHs(e.desde);
  return '';
}

/** Ensayos por venir (o sin día), ordenados */
export function ensayosActivos(f: Fecha, hoy = hoyISO()): Ensayo[] {
  return (f.ensayos ?? [])
    .filter((e) => e.estado !== 'cancelado' && e.estado !== 'hecho' && (!e.dia || e.dia >= hoy))
    .sort((a, b) => (a.dia || '9').localeCompare(b.dia || '9'));
}

const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function diaLargo(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${DIAS_LARGO[new Date(y, m - 1, d).getDay()]} ${d}/${m}`;
}

/** Mensaje para el grupo de WhatsApp */
export function mensajeEnsayo(f: Fecha, e: Ensayo): string {
  const t = e.titulo.trim().toUpperCase();
  const titulo = !t ? 'ENSAYO' : /ENSAYO/.test(t) ? t : `ENSAYO · ${t}`;
  const lineas: string[] = [`🥁 *${titulo}*`, `_Para ${f.nombre}_`];
  const cuando = [e.dia ? diaLargo(e.dia) : 'Día a confirmar', horarioEnsayo(e)].filter(Boolean).join(', ');
  lineas.push('', `📅 *${cuando}*`);
  if (e.lugar?.trim()) lineas.push(`📍 ${e.lugar.trim()}${e.direccion?.trim() ? ` — ${e.direccion.trim()}` : ''}`);
  if (e.quienes?.trim()) lineas.push(`👥 Vamos: ${e.quienes.trim()}`);
  if (e.objetivo?.trim()) lineas.push('', `🎯 *Qué ensayamos:* ${e.objetivo.trim()}`);
  const traslado = [
    e.traslado?.trim(),
    e.encuentro?.trim() && `Punto de encuentro: ${e.encuentro.trim()}`,
    e.salida?.trim() && `Salimos a las ${conHs(e.salida)}`,
  ].filter(Boolean);
  if (traslado.length) lineas.push('', `🚗 *Cómo vamos:* ${traslado.map((x) => String(x).replace(/\.$/, '')).join('. ')}.`);
  if (e.llevar?.trim()) lineas.push('', `🎒 *Traer:* ${e.llevar.trim()}`);
  if (e.estado === 'a_confirmar') lineas.push('', '_Todavía a confirmar: les avisamos apenas esté cerrado._');
  if (e.responsable?.trim()) lineas.push('', `Coordina ${e.responsable.trim()} 💜`);
  lineas.push('', 'Reaccionen con un emoji cuando lo lean 🙌');
  return lineas.join('\n');
}

export const etiquetaDia = (iso: string) => (iso ? diaCorto(iso) : 'sin día');
