import type { Fecha } from './types';

/**
 * AGENDA
 * ------
 * Orden cronológico de las fechas, el calendario y lo que se comparte hacia afuera
 * (mensaje de WhatsApp y archivo .ics para sumar al calendario del celu).
 */

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** hoy como 'YYYY-MM-DD' en hora local */
export function hoyISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const valida = (iso?: string) => !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso);

export interface GruposAgenda {
  proximas: Fecha[];
  sinFecha: Fecha[];
  pasadas: Fecha[];
}

const ORDEN_SIN_FECHA: Record<Fecha['estado'], number> = { confirmada: 0, produccion: 1, idea: 2, realizada: 3, cerrada: 4, cancelada: 5 };

/**
 * Próximas (de la más cercana a la más lejana), después las que no tienen día,
 * y al final las que ya pasaron (de la más reciente a la más vieja).
 * Así, a medida que avanza el calendario, lo hecho va quedando abajo solo.
 */
export function agruparPorFecha(fechas: Fecha[], hoy = hoyISO()): GruposAgenda {
  const proximas: Fecha[] = [];
  const sinFecha: Fecha[] = [];
  const pasadas: Fecha[] = [];
  for (const f of fechas) {
    if (!valida(f.fecha)) sinFecha.push(f);
    else if (f.fecha >= hoy) proximas.push(f);
    else pasadas.push(f);
  }
  proximas.sort((a, b) => a.fecha.localeCompare(b.fecha));
  pasadas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  sinFecha.sort((a, b) => ORDEN_SIN_FECHA[a.estado] - ORDEN_SIN_FECHA[b.estado] || b.creada.localeCompare(a.creada));
  return { proximas, sinFecha, pasadas };
}

/** "Sáb 12/12" */
export function diaCorto(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${DIAS_CORTO[new Date(y, m - 1, d).getDay()]} ${d}/${m}`;
}

/** fechas que la murga tiene comprometidas de hoy en adelante */
export function comprometidas(fechas: Fecha[], conProduccion: boolean, hoy = hoyISO()): Fecha[] {
  return agruparPorFecha(fechas, hoy).proximas.filter(
    (f) => f.estado === 'confirmada' || (conProduccion && f.estado === 'produccion'),
  );
}

/** Mensaje de agenda para WhatsApp */
export function textoAgenda(lista: Fecha[]): string {
  if (!lista.length) return '';
  const lineas = lista.map((f) => {
    const donde = f.lugar ? ` — ${f.lugar}` : '';
    const aConfirmar = f.estado === 'confirmada' ? '' : ' _(a confirmar)_';
    return `📅 *${diaCorto(f.fecha)}* · ${f.nombre}${donde}${aConfirmar}`;
  });
  return ['*AGENDA BAILA LA CHOLA* 🥁', '', ...lineas].join('\n');
}

/* ---------- .ics ---------- */

const escIcs = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const compacta = (iso: string) => iso.replace(/-/g, '');
function diaSiguiente(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return hoyISO(new Date(y!, m! - 1, d! + 1));
}
/** las líneas de un .ics no pueden pasar de 75 octetos */
function plegar(linea: string): string {
  const out: string[] = [];
  let resto = linea;
  while (resto.length > 60) {
    out.push(resto.slice(0, 60));
    resto = ' ' + resto.slice(60);
  }
  out.push(resto);
  return out.join('\r\n');
}

/** Calendario .ics (eventos de día completo) para Google Calendar, iPhone, etc. */
export function generarIcs(lista: Fecha[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const eventos = lista.flatMap((f) => [
    'BEGIN:VEVENT',
    `UID:${f.id}@la-produ.bailalachola`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${compacta(f.fecha)}`,
    `DTEND;VALUE=DATE:${compacta(diaSiguiente(f.fecha))}`,
    `SUMMARY:${escIcs(`Baila La Chola · ${f.nombre}`)}`,
    ...(f.lugar || f.direccion ? [`LOCATION:${escIcs([f.direccion, f.lugar].filter(Boolean).join(', '))}`] : []),
    `DESCRIPTION:${escIcs(f.estado === 'confirmada' ? 'Fecha confirmada.' : 'Fecha en producción, a confirmar.')}`,
    `STATUS:${f.estado === 'confirmada' ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT',
  ]);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Baila La Chola//La Produ//ES',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Baila La Chola',
    ...eventos,
    'END:VCALENDAR',
  ]
    .map(plegar)
    .join('\r\n');
}

/** Grilla de un mes, semanas de lunes a domingo; null = celda vacía */
export function grillaMes(anio: number, mes0: number): (string | null)[][] {
  const primero = new Date(anio, mes0, 1);
  const offset = (primero.getDay() + 6) % 7; // lunes = 0
  const dias = new Date(anio, mes0 + 1, 0).getDate();
  const celdas: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= dias; d++) celdas.push(hoyISO(new Date(anio, mes0, d)));
  while (celdas.length % 7) celdas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}
