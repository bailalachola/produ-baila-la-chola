import type { Fecha } from './types';
import { renglonesArreglo } from './arreglo';
import { conHs } from './integrador';
import { OPCIONES_QUORUM } from './quorum';

/**
 * IDEA → PRODU → QUÓRUM
 * ---------------------
 * Cuando llega una idea, primero se arma un resumen para el grupo de Produ.
 * Si Produ da el OK, se larga el quórum en Cholas, y antes de la encuesta se
 * manda un mensaje de contexto para que la que contesta "puedo / no puedo"
 * sepa de qué se trata (no solo día, lugar y nombre).
 *
 * Cada sección se escribe una idea por línea. Si una sección nunca se tocó,
 * se sugiere sola con lo que ya está cargado en la fecha (relato, arreglo,
 * riesgos), y en cuanto se edita, queda lo que se escribió.
 */

export const SECCIONES_IDEA = [
  { id: 'laFecha', emoji: '🎶', titulo: 'La fecha', ayuda: 'Qué es, grilla y horarios, qué show hacemos.', ejemplo: 'Festi de cierre del ciclo: música en vivo, feria\nBandas de 20 a 22.30, nosotras cerramos\nShow completo' },
  { id: 'tecnica', emoji: '🔊', titulo: 'Técnica', ayuda: 'Qué ponen y qué falta resolver.', ejemplo: 'Ellas ponen sonidista y equipos\nFalta pasarles qué llevamos' },
  { id: 'economia', emoji: '💸', titulo: 'Economía', ayuda: 'Cachet, viáticos, gorra, cómo abaratamos.', ejemplo: 'No hay cachet ni viáticos\nPasan un alias para que el público aporte' },
  { id: 'camarin', emoji: '👗', titulo: 'Camarín', ayuda: 'Dónde y desde qué hora nos cambiamos.', ejemplo: 'Lugar para cambiarse desde las 17' },
  { id: 'pendiente', emoji: '⏳', titulo: 'Pendiente', ayuda: 'Lo que falta averiguar o lo que puede salir mal.', ejemplo: 'Comida para nosotras\nNo hay plan B si llueve' },
] as const;

export type SeccionIdeaId = (typeof SECCIONES_IDEA)[number]['id'];

export interface IdeaProdu {
  /** quién nos invita (persona, organización, quién produce) */
  invita?: string;
  /** texto de cada sección (una idea por línea). undefined = se sugiere solo */
  secciones?: Partial<Record<SeccionIdeaId, string>>;
  /** resumen editado a mano (si no, se arma solo) */
  textoProdu?: string;
  /** cuándo se copió para mandar a Produ */
  enviado?: string;
  /** cuándo Produ dio el OK para largar el quórum */
  ok?: string;
  okQuien?: string;
}

const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** "Viernes 27/11" */
export function diaLargo(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${DIAS_LARGO[new Date(y, m - 1, d).getDay()]} ${d}/${m}`;
}

/** Texto libre → renglones limpios (sin viñetas ni numeración) */
export function renglones(texto?: string): string[] {
  return (texto ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-•·]\s*|\d+[.)]\s+)/, '').trim())
    .filter(Boolean);
}

const unir = (...partes: (string | undefined)[]) => partes.flatMap((p) => renglones(p)).join('\n');

/** Lo que se sugiere para cada sección, con lo que ya está cargado en la fecha */
export function sugerenciaIdea(f: Fecha): Record<SeccionIdeaId, string> & { invita: string } {
  const r = f.relato ?? {};
  const riesgos = (f.riesgos ?? []).filter((x) => x.tipo !== 'inesperado' && x.descripcion.trim()).map((x) => x.descripcion);
  const arreglo = renglonesArreglo(f.arreglo);
  return {
    invita: f.contacto?.trim() ?? '',
    laFecha: unir(r.contexto || f.nota, f.formato),
    tecnica: unir(r.gestionTecnica),
    economia: arreglo.length ? arreglo.join('\n') : unir(r.condiciones),
    camarin: unir(r.camarin),
    pendiente: unir(riesgos.join('\n')),
  };
}

/** El texto de una sección: lo escrito, o la sugerencia si nunca se tocó */
export function textoSeccion(f: Fecha, id: SeccionIdeaId): string {
  const escrito = f.ideaProdu?.secciones?.[id];
  return escrito !== undefined ? escrito : sugerenciaIdea(f)[id];
}

export function invitaFinal(f: Fecha): string {
  const i = f.ideaProdu?.invita;
  return i !== undefined ? i : sugerenciaIdea(f).invita;
}

function cabecera(f: Fecha): string[] {
  const hora = f.quorum?.hora?.trim();
  const cuando = [f.fecha ? diaLargo(f.fecha) : 'Día a definir', hora && conHs(hora)].filter(Boolean).join(' · ');
  const lugar = [f.lugar?.trim(), f.direccion?.trim() && `(${f.direccion.trim()})`].filter(Boolean).join(' ');
  return [`📅 ${cuando}`, lugar && `📍 ${lugar}`].filter((x): x is string => !!x);
}

function cuerpo(f: Fecha, titulos: Partial<Record<SeccionIdeaId, string>> = {}): string[] {
  const out: string[] = [];
  for (const s of SECCIONES_IDEA) {
    const lineas = renglones(textoSeccion(f, s.id));
    if (!lineas.length) continue;
    out.push(`${s.emoji} ${titulos[s.id] ?? s.titulo}`, ...lineas);
  }
  return out;
}

export const nombreIdea = (f: Fecha) => (f.evento?.trim() || f.nombre.trim() || 'Sin nombre');

/** El resumen para el grupo de Produ (formato de Cou) */
export function resumenSugeridoProdu(f: Fecha): string {
  const invita = invitaFinal(f).trim();
  return [
    `💡 NUEVA IDEA · ${nombreIdea(f)}`,
    ...cabecera(f),
    invita && `🙋 Nos invita ${invita.replace(/^nos invita\s+/i, '')}`,
    ...cuerpo(f),
    '👉 Produ: ¿avanzamos y largo el quórum?',
  ]
    .filter(Boolean)
    .join('\n');
}

export const resumenFinalProdu = (f: Fecha): string =>
  f.ideaProdu?.textoProdu?.trim() ? f.ideaProdu.textoProdu.trim() : resumenSugeridoProdu(f);

/**
 * El contexto para la murga: va en Cholas justo antes de la encuesta.
 * Mismo contenido que el resumen, pero hablándole a la murga.
 */
export function contextoSugeridoQuorum(f: Fecha): string {
  const invita = invitaFinal(f).trim();
  const opciones = (f.quorum?.opciones ?? OPCIONES_QUORUM).filter((o) => o.trim()).join(' / ');
  return [
    `📣 PARA EL QUÓRUM · ${nombreIdea(f)}`,
    ...cabecera(f),
    invita && `🙋 Nos invita ${invita.replace(/^nos invita\s+/i, '')}`,
    ...cuerpo(f, { pendiente: 'A tener en cuenta' }),
    `👇 Abajo va la encuesta: contestá ${opciones || 'si podés o no'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export const contextoFinalQuorum = (f: Fecha): string =>
  f.quorum?.contexto?.trim() ? f.quorum.contexto.trim() : contextoSugeridoQuorum(f);

/** ¿En qué paso está la idea? */
export type PasoIdea = 'armar' | 'esperandoOk' | 'quorum';
export function pasoIdea(f: Fecha): PasoIdea {
  if (f.ideaProdu?.ok || f.quorum?.enviado) return 'quorum';
  if (f.ideaProdu?.enviado) return 'esperandoOk';
  return 'armar';
}

/** Chip para la tarjeta de la idea en el inicio (antes de que haya quórum) */
export function estadoIdeaProdu(f: Fecha): { texto: string; tono: 'neutro' | 'ok' } | null {
  if (f.estado !== 'idea') return null;
  if (f.ideaProdu?.ok) return { texto: 'OK de Produ ✓', tono: 'ok' };
  if (f.ideaProdu?.enviado) return { texto: 'Esperando OK de Produ', tono: 'neutro' };
  return null;
}
