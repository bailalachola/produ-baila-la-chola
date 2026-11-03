import { PREGUNTAS_POR_ID } from './checklist';
import { esVisible, estaRespondida } from './logic';
import { fraseResuelta } from './reporte';
import { renglonesArreglo, arregloCompleto } from './arreglo';
import type { Fecha } from './types';

/**
 * VALIDADOR DE CONDICIONES
 * ------------------------
 * Antes de la fecha, le mandamos a la producción del otro lado lo que tenemos
 * entendido, dimensión por dimensión, y le preguntamos si estamos de acuerdo.
 * Así no hay sorpresas el día del show. Lo que respondan queda registrado.
 */

export type EstadoValidacion = 'sin_enviar' | 'enviado' | 'ok' | 'cambios';

export const ESTADO_VALIDACION_LABEL: Record<EstadoValidacion, string> = {
  sin_enviar: 'Sin enviar',
  enviado: 'Enviado',
  ok: 'De acuerdo',
  cambios: 'Hubo cambios',
};

export interface DimensionValidada {
  estado: EstadoValidacion;
  nota?: string;
  cuando?: string;
}

export interface Validacion {
  /** a quién le escribimos (se arma del contacto de la fecha) */
  saludo?: string;
  /** quién firma */
  firma?: string;
  /** dimensiones que no van en el mensaje */
  excluidas?: string[];
  /** también preguntar lo que todavía no respondimos */
  conSinResponder?: boolean;
  /** texto editado a mano (si no, se arma solo) */
  borrador?: string;
  enviado?: string;
  dimensiones: Record<string, DimensionValidada>;
}

export const validacionVacia = (): Validacion => ({ dimensiones: {} });

export interface Dimension {
  id: string;
  titulo: string;
  emoji: string;
  /** preguntas del checklist que le importan a la producción del otro lado */
  preguntas: string[];
}

export const DIMENSIONES: Dimension[] = [
  { id: 'horarios', titulo: 'Fecha y horarios', emoji: '📅', preguntas: ['esp_direccion', 'esp_ingreso', 'tec_prueba', 'tec_prueba_hora', 'esp_show', 'esp_duracion'] },
  {
    id: 'espacio',
    titulo: 'Espacio y camarines',
    emoji: '🏠',
    preguntas: ['esp_escenario_dim', 'esp_escenario_tipo', 'esp_camarin', 'esp_cambio_alt', 'esp_camarin_tiene', 'esp_cambio_tiene', 'esp_camarines_cant', 'esp_banos', 'esp_acceso', 'esp_guardar_vestuario', 'esp_guardar_instrumentos', 'esp_agua', 'esp_restricciones'],
  },
  {
    id: 'tecnica',
    titulo: 'Técnica y sonido',
    emoji: '🎛️',
    preguntas: ['tec_rider_ok', 'tec_mics', 'tec_mics_tipo', 'tec_monitores', 'tec_mezclas', 'tec_percu', 'tec_consola', 'tec_operador_sonido', 'tec_np_operador', 'tec_luces', 'tec_operador_luces', 'tec_contacto', 'tec_limitaciones'],
  },
  { id: 'artistico', titulo: 'Show', emoji: '🎭', preguntas: ['art_duracion', 'art_artistas', 'art_especiales'] },
  { id: 'logistica', titulo: 'Logística y atención', emoji: '🚐', preguntas: ['log_traslado', 'log_alojamiento', 'log_comida', 'log_agua', 'log_estacionamiento'] },
  { id: 'economia', titulo: 'Arreglo económico', emoji: '💸', preguntas: [] },
  { id: 'difusion', titulo: 'Difusión', emoji: '📣', preguntas: ['dif_colab', 'dif_link', 'dif_precio', 'dif_prensa', 'dif_registro'] },
];

const pregunta = (id: string) => PREGUNTAS_POR_ID[id];

/** Lo que tenemos entendido y lo que falta, para una dimensión */
export function contenidoDimension(f: Fecha, d: Dimension, conSinResponder = false): { acordado: string[]; falta: string[] } {
  const acordado: string[] = [];
  const falta: string[] = [];
  if (d.id === 'economia') {
    if (arregloCompleto(f.arreglo)) acordado.push(...renglonesArreglo(f.arreglo));
    else falta.push('¿Cómo es el arreglo económico?');
    return { acordado, falta };
  }
  for (const id of d.preguntas) {
    const u = pregunta(id);
    if (!u || !esVisible(u, f.respuestas)) continue;
    const r = f.respuestas[id];
    if (r?.estado === 'na') continue;
    const esPregunta = u.pregunta.label.includes('¿');
    const label = u.pregunta.label.split('?')[0]!.replace('¿', '').trim();
    const comoPregunta = esPregunta ? `¿${label}?` : label;
    if (r?.estado === 'confirmar') {
      falta.push(`${comoPregunta}${r.detalle?.trim() ? ` (${r.detalle.trim()})` : ''}`);
      continue;
    }
    if (estaRespondida(u.pregunta, r)) {
      const t = fraseResuelta(u.pregunta, r!);
      if (t) acordado.push(t);
    } else if (conSinResponder) falta.push(comoPregunta);
  }
  if (d.id === 'horarios' && f.fecha) {
    const [y, m, dd] = f.fecha.split('-').map(Number);
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    acordado.unshift(`Día: ${dias[new Date(y!, m! - 1, dd!).getDay()]} ${dd}/${m}.`);
  }
  return { acordado, falta };
}

/** "Lola (CC El Bondi) · 11 5555" → "Lola" */
export function saludoSugerido(f: Fecha): string {
  const c = (f.contacto ?? '').split(/[(·,\-–|/]/)[0]?.trim() ?? '';
  const nombre = c.split(/\s+/)[0] ?? '';
  return /^[A-Za-zÁÉÍÓÚÑáéíóúñ]+$/.test(nombre) ? nombre : '';
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** El mensaje para la producción del otro lado */
export function armarValidacion(f: Fecha, v: Validacion, firmaPorDefecto: string): string {
  const saludo = (v.saludo ?? saludoSugerido(f)).trim();
  let cuando = '';
  if (f.fecha) {
    const [y, m, d] = f.fecha.split('-').map(Number);
    cuando = `${DIAS[new Date(y!, m! - 1, d!).getDay()]} ${d}/${m}`;
  }
  const meta = [cuando, f.lugar?.trim()].filter(Boolean).join(', ');
  const out: string[] = [
    `¡Hola${saludo ? ` ${saludo}` : ''}! 👋 Te comparto cómo tenemos las condiciones para *${f.nombre}*${meta ? ` (${meta})` : ''}, así validamos que estemos de acuerdo en todo y evitamos sorpresas el día de la fecha.`,
  ];
  for (const d of DIMENSIONES) {
    if (v.excluidas?.includes(d.id)) continue;
    const { acordado, falta } = contenidoDimension(f, d, v.conSinResponder);
    if (!acordado.length && !falta.length) continue;
    const partes = [`*${d.emoji} ${d.titulo.toUpperCase()}*`, ...acordado.map((a) => `• ${a}`)];
    if (falta.length) partes.push(`❓ Nos falta confirmar:\n${falta.map((x) => `• ${x}`).join('\n')}`);
    out.push(partes.join('\n'));
  }
  out.push('¿Estamos de acuerdo con todo? Si algo no es así, avisanos y lo ajustamos 🙌');
  out.push(`¡Gracias!\n${(v.firma ?? firmaPorDefecto).trim()}`);
  return out.join('\n\n');
}

/** Dimensiones que van en el mensaje (tienen algo para contar) */
export function dimensionesConContenido(f: Fecha, v: Validacion): Dimension[] {
  return DIMENSIONES.filter((d) => {
    const c = contenidoDimension(f, d, v.conSinResponder);
    return c.acordado.length + c.falta.length > 0;
  });
}

export function resumenValidacion(f: Fecha): { ok: number; cambios: number; total: number } {
  const v = f.validacion;
  const dims = dimensionesConContenido(f, v ?? validacionVacia()).filter((d) => !v?.excluidas?.includes(d.id));
  const estados = dims.map((d) => v?.dimensiones[d.id]?.estado ?? 'sin_enviar');
  return { ok: estados.filter((e) => e === 'ok').length, cambios: estados.filter((e) => e === 'cambios').length, total: dims.length };
}
