import type { Fecha } from './types';

/**
 * ARREGLO ECONÓMICO
 * -----------------
 * Lo que acordamos con la producción del otro lado: cachet, viáticos, gorra,
 * porcentaje de entradas… Es obligatorio: sin arreglo, la fecha no está completa.
 * Pesos y dólares van siempre separados, nunca se suman.
 * Los movimientos (lo que entra y sale de verdad) siguen aparte, en Economía.
 */

export const MODALIDADES = ['Cachet', 'Viáticos', 'Gorra', '% de entradas', 'Canje', 'Sin pago', 'Otro'] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export interface Arreglo {
  modalidades: Modalidad[];
  /** monto en pesos (texto libre: "$300.000", "a definir") */
  montoARS?: string;
  /** monto en dólares, siempre aparte */
  montoUSD?: string;
  /** qué cubre: traslado, comida, alojamiento… */
  cubre?: string;
  /** quién paga y cuándo / cómo se cobra */
  quienPaga?: string;
  cuandoCobra?: string;
  /** cómo es, en palabras (obligatorio) */
  detalle: string;
  /** confirmado con la producción del otro lado */
  confirmado?: boolean;
}

export const arregloVacio = (): Arreglo => ({ modalidades: [], detalle: '' });

/** ¿Está cargado lo mínimo? (modalidad + cómo es, en palabras) */
export const arregloCompleto = (a?: Arreglo): boolean => !!a && a.modalidades.length > 0 && a.detalle.trim().length > 0;

const conPesos = (s: string) => (/^\s*\d/.test(s) ? `$${s.trim()}` : s.trim());
const conDolares = (s: string) => (/^\s*\d/.test(s) ? `USD ${s.trim()}` : s.trim());

/** Renglones del arreglo, en lenguaje simple (para integrador, update, validador y PDF) */
export function renglonesArreglo(a?: Arreglo): string[] {
  if (!a || (!a.modalidades.length && !a.detalle.trim())) return [];
  const out: string[] = [];
  if (a.modalidades.length) {
    const montos = [a.montoARS?.trim() && conPesos(a.montoARS), a.montoUSD?.trim() && conDolares(a.montoUSD)].filter(Boolean).join(' y ');
    out.push(`${a.modalidades.join(' + ')}${montos ? `: ${montos}` : ''}.`);
  }
  if (a.detalle.trim()) out.push(a.detalle.trim().replace(/([^.!?])$/, '$1.'));
  if (a.cubre?.trim()) out.push(`Cubre: ${a.cubre.trim()}.`);
  const paga = [a.quienPaga?.trim() && `Paga ${a.quienPaga.trim()}`, a.cuandoCobra?.trim()].filter(Boolean).join(', ');
  if (paga) out.push(`${paga.charAt(0).toUpperCase()}${paga.slice(1)}.`);
  return out.map((l) => l.replace(/\.\.$/, '.'));
}

export const textoArreglo = (a?: Arreglo) => renglonesArreglo(a).join('\n');

export const faltaArreglo = (f: Fecha): boolean =>
  f.estado !== 'idea' && f.estado !== 'cancelada' && !arregloCompleto(f.arreglo);
