import type { Fecha } from './types';
import { diaCorto } from './agenda';
import { conHs } from './integrador';

/**
 * QUÓRUM
 * ------
 * Antes de decir que sí a una fecha, se le pregunta a la murga con una encuesta de
 * WhatsApp en el grupo de Cholas. Reglamento: tres íconos rojos al principio y al
 * final, para que se entienda que lo único que hay que hacer es contestar.
 * Según cómo sale, la fecha sigue o no.
 */

export type ResultadoQuorum = 'si' | 'no';

export interface Quorum {
  /** hora de la fecha, si ya se sabe */
  hora?: string;
  /** info extra que ayuda a decidir: paga traslado, es lejos, etc. */
  info?: string;
  /** pregunta editada a mano (si no, se arma sola) */
  pregunta?: string;
  opciones: string[];
  /** cuántas necesitamos para decir que sí */
  minimo?: string;
  enviado?: string;
  puedo?: string;
  noPuedo?: string;
  resultado?: ResultadoQuorum;
  decidido?: string;
}

export const ROJOS = '🔴🔴🔴';
export const OPCIONES_QUORUM = ['Puedo 🙋', 'No puedo 🙅'];
/** límite de WhatsApp para la pregunta de una encuesta */
export const MAX_PREGUNTA = 255;

export const quorumVacio = (): Quorum => ({ opciones: [...OPCIONES_QUORUM] });

/** La pregunta de la encuesta, con el reglamento de los tres rojos */
export function preguntaSugerida(f: Fecha, q: Quorum): string {
  const cuando = [f.fecha ? diaCorto(f.fecha) : 'fecha a definir', q.hora?.trim() && conHs(q.hora)].filter(Boolean).join(' ');
  const partes = [`QUÓRUM ${f.nombre.trim().toUpperCase()}`, cuando, f.lugar?.trim()].filter(Boolean).join(' · ');
  const info = q.info?.trim() ? ` ${q.info.trim().replace(/\s*\n+\s*/g, ' ')}` : '';
  return `${ROJOS} ${partes}.${info} ¿Podés? ${ROJOS}`;
}

export const preguntaFinal = (f: Fecha, q: Quorum): string => (q.pregunta?.trim() ? q.pregunta.trim() : preguntaSugerida(f, q));

const num = (s?: string) => {
  const n = Number((s ?? '').trim());
  return Number.isFinite(n) && (s ?? '').trim() !== '' ? n : undefined;
};

export function estadoQuorum(q?: Quorum): { texto: string; tono: 'neutro' | 'ok' | 'no' } | null {
  if (!q) return null;
  if (q.resultado === 'si') return { texto: `Hay quórum${num(q.puedo) !== undefined ? ` (${num(q.puedo)} pueden)` : ''}`, tono: 'ok' };
  if (q.resultado === 'no') return { texto: 'Sin quórum', tono: 'no' };
  if (q.enviado) return { texto: 'Quórum: esperando respuestas', tono: 'neutro' };
  return null;
}

/** ¿Los números alcanzan el mínimo? (solo orientativo, decide la murga) */
export function llegaAlMinimo(q: Quorum): boolean | undefined {
  const min = num(q.minimo);
  const si = num(q.puedo);
  if (min === undefined || si === undefined) return undefined;
  return si >= min;
}

export const resumenNumeros = (q: Quorum): string =>
  [num(q.puedo) !== undefined && `${num(q.puedo)} pueden`, num(q.noPuedo) !== undefined && `${num(q.noPuedo)} no pueden`]
    .filter(Boolean)
    .join(', ');
