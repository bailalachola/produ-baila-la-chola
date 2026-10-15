import type { Fecha, Respuesta } from './types';
import { formatoMonto } from './logic';

/**
 * INTEGRADOR
 * ----------
 * El mensaje de WhatsApp que se manda al grupo antes de la fecha, con todo lo
 * que la murga necesita saber: citación, agenda, camarines, sonido, vestuario,
 * maquillaje, comida, plata, recordatorios y show.
 * Se arma solo con lo cargado en el checklist y después se edita a mano.
 */

export interface ItemAgenda {
  hora: string;
  texto: string;
}

export interface Integrador {
  citacion?: string;
  direccion?: string;
  notaLugar?: string;
  agenda: ItemAgenda[];
  camarines?: string;
  sonidoCoordina?: string;
  sonido?: string;
  vestuarioModo?: string;
  vestuario?: string;
  maquillajeModo?: string;
  maquillajeCoordina?: string;
  maquillaje?: string;
  comida?: string;
  recaudacion?: string;
  recordatorios?: string;
  show?: string;
  reaccion?: string;
  firma?: string;
}

export const VESTUARIO_MODELO = `Sugerimos armarse cada unx su *check list* para no olvidar nada (ya que todos los trajes son distintos). Aquí uno de modelo que puede servir:
- Dos gorros
- Calzado
- Lo que llevo en las piernas y pies (medias de red, cortas o comunes)
- Pollera o pantalón o calza o short
- Camisa o remera o lo que llevo arriba en el torso
- Abrigo
- Accesorios (cintos, aros, pulseras, collares, riñoneras, etc.)
- Ropa de personajes
- Instrumentos
- Utilería

Pedimos que todo esté en condiciones y que lleven resuelto desde casa.`;

export const FIRMA_MODELO = `Con todo amor, manija, entrega y agradecimiento las saludan,
Las Produs
Ine, Marian, Cou, Clari, Anto.

❤️🫦❤️🫦❤️🫦❤️🫦`;

const v = (r?: Respuesta) => (r?.estado === 'na' || r?.estado === 'confirmar' ? '' : (r?.valor ?? '').trim());
const det = (r?: Respuesta) => (r?.detalle ?? '').trim();

/** "21:00" → "21:00hs" */
export function conHs(h: string): string {
  const t = h.trim();
  return /^\d{1,2}(:\d{2})?$/.test(t) ? `${t}hs` : t;
}

/** Lo que se puede deducir del checklist y la economía */
export function integradorSugerido(f: Fecha): Integrador {
  const r = f.respuestas;
  const agenda: ItemAgenda[] = [];
  const sumar = (hora: string, texto: string) => hora && agenda.push({ hora, texto });
  const encuentro = v(r.log_encuentro);
  const horaEncuentro = encuentro.match(/\b(\d{1,2}:\d{2})\b/)?.[1] ?? '';
  const citacion = horaEncuentro || v(r.esp_ingreso);
  sumar(citacion, 'ingreso de toda la murga, puntualísimo');
  if (r.tec_prueba?.estado === 'si') sumar(v(r.tec_prueba_hora), 'prueba de sonido');
  sumar(v(r.ves_horario), 'maquillaje y vestuario');
  sumar(v(r.esp_show), 'Función');

  // sonido
  const sonido: string[] = [];
  const operador = v(r.tec_operador_sonido) || v(r.tec_np_operador);
  if (operador) sonido.push(`Nos opera: ${operador}.`);
  if (r.tec_prueba?.estado === 'no') sonido.push('No hay prueba de sonido.');
  if (r.tec_prueba?.estado === 'si' && v(r.tec_prueba_hora)) sonido.push(`Prueba de sonido a las ${conHs(v(r.tec_prueba_hora))}.`);
  const mics = r.tec_mics?.acordado || r.tec_mics?.valor;
  if (mics) sonido.push(`Micrófonos: ${mics}.`);
  if (v(r.tec_limitaciones)) sonido.push(v(r.tec_limitaciones));

  // camarines
  let camarines = '';
  if (r.esp_camarin?.estado === 'no') {
    camarines = `No hay camarín${v(r.esp_cambio_alt) ? `: nos cambiamos en ${v(r.esp_cambio_alt)}` : ''}.`;
  } else if (r.esp_camarin?.estado === 'si') {
    camarines = det(r.esp_camarin) || 'Hay camarín.';
  }
  camarines = [camarines, 'Cuando lleguemos, atendamos las indicaciones de produ para ocupar espacios y dejar pertenencias, trajes y gorros.']
    .filter(Boolean)
    .join('\n');

  // comida
  let comida = '';
  if (r.log_comida?.estado === 'si') comida = det(r.log_comida) || 'Hay comida para la murga.';
  if (r.log_comida?.estado === 'no') comida = 'No hay comida: cada unx lleva lo suyo.';
  comida = [comida, 'Lleven agua y bebibles que gusten.'].filter(Boolean).join('\n');

  // recaudación: ingresos en pesos (sin sumar monedas)
  const ingresos = f.movimientos.filter((m) => m.tipo === 'ingreso');
  const recaudacion = ingresos.length
    ? ingresos.map((m) => `${formatoMonto(m.monto, m.moneda)}: ${m.concepto}`).join('\n')
    : '';

  // recordatorios
  const recordatorios = [
    v(r.esp_restricciones),
    v(r.esp_duracion) && `Tenemos ${v(r.esp_duracion)} de show.`,
    r.log_estacionamiento?.estado === 'no' && 'Ojo: no hay estacionamiento.',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    citacion,
    direccion: f.direccion || v(r.esp_direccion) || f.lugar,
    notaLugar: v(r.esp_acceso),
    agenda,
    camarines,
    sonidoCoordina: '',
    sonido: sonido.join('\n'),
    vestuarioModo: r.ves_confirmado?.estado === 'si' ? 'COMPLETO' : '',
    vestuario: [v(r.ves_propuesta), VESTUARIO_MODELO].filter(Boolean).join('\n\n'),
    maquillajeModo: v(r.ves_maquillaje) ? 'COMPLETO' : '',
    maquillajeCoordina: v(r.ves_comision),
    maquillaje: [v(r.ves_maquillaje), v(r.ves_lugar) && `Nos preparamos en: ${v(r.ves_lugar)}.`].filter(Boolean).join('\n'),
    comida,
    recaudacion,
    recordatorios,
    show: v(r.art_orden) || v(r.art_repertorio),
    reaccion: 'Reaccionen con un emoticón cuando lo lean 💜',
    firma: FIRMA_MODELO,
  };
}

/** Completa solo lo que está vacío con lo sugerido */
export function completarIntegrador(actual: Integrador, sugerido: Integrador): Integrador {
  const out: Integrador = { ...actual };
  for (const k of Object.keys(sugerido) as (keyof Integrador)[]) {
    if (k === 'agenda') {
      if (!actual.agenda?.length) out.agenda = sugerido.agenda;
      continue;
    }
    const valor = actual[k];
    if (typeof valor !== 'string' || !valor.trim()) (out as unknown as Record<string, unknown>)[k] = sugerido[k];
  }
  return out;
}

const bloque = (titulo: string, extra: string, cuerpo?: string) => {
  const t = (cuerpo ?? '').trim();
  if (!t && !extra) return '';
  return [`${titulo}${extra ? ` ${extra}` : ''}`, t].filter(Boolean).join('\n');
};

/** El texto final para WhatsApp (los *asteriscos* salen en negrita) */
export function armarIntegrador(f: Fecha, i: Integrador): string {
  const partes: string[] = [];
  partes.push(`*INTEGRADOR "${f.nombre.toUpperCase()}"*`);

  const cab: string[] = [];
  if (i.citacion?.trim()) cab.push(`⏰ Hora de citación: *${conHs(i.citacion)}*`);
  if (i.direccion?.trim()) cab.push(`📍 ${i.direccion.trim()}`);
  if (i.notaLugar?.trim()) cab.push(`(${i.notaLugar.trim()})`);
  if (cab.length) partes.push(cab.join('\n'));

  const agenda = i.agenda.filter((a) => a.hora.trim() || a.texto.trim());
  if (agenda.length) {
    partes.push(['La agenda será:', ...agenda.map((a) => `- *${conHs(a.hora)}* ${a.texto.trim()}`)].join('\n'));
  }

  const coordina = (n?: string) => (n?.trim() ? `\n*Coordina ${n.trim()}*` : '');
  const modo = (m?: string) => (m?.trim() ? `*${m.trim().toUpperCase()}*` : '');

  partes.push(bloque('CAMARINES 🚊', '', i.camarines));
  partes.push(bloque('SONIDO 🎛️🎙️📻', '', (coordina(i.sonidoCoordina) + '\n' + (i.sonido ?? '')).trim()));
  partes.push(bloque('VESTUARIO 🦺🧵🧦', modo(i.vestuarioModo), i.vestuario));
  partes.push(
    bloque('MAQUILLAJE 🎨👩🏻‍🎨✨', modo(i.maquillajeModo), (coordina(i.maquillajeCoordina) + '\n' + (i.maquillaje ?? '')).trim()),
  );
  partes.push(bloque('COMIDA 🥑🍕🥤', '', i.comida));
  partes.push(bloque('RECAUDACIÓN 💸', '', i.recaudacion));

  const recs = (i.recordatorios ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (recs.length) partes.push(['RECORDATORIOS:', ...recs.map((l) => (l.startsWith('-') ? l : `- ${l}`))].join('\n'));

  if (i.show?.trim()) partes.push(['SHOW 🎭', i.show.trim()].join('\n'));
  if (i.reaccion?.trim()) partes.push(i.reaccion.trim());
  if (i.firma?.trim()) partes.push(i.firma.trim());

  return partes.filter(Boolean).join('\n\n');
}
