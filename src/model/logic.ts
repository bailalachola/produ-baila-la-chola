import {
  CHECKLIST,
  PREGUNTAS_POR_ID,
  TODAS_LAS_PREGUNTAS,
  type Pregunta,
  type PreguntaUbicada,
} from './checklist';
import {
  ESTADO4_LABEL,
  type Fecha,
  type Moneda,
  type Movimiento,
  type Respuesta,
  type Riesgo,
  type SeccionChecklistId,
  type SeccionId,
} from './types';

/* ---------- visibilidad y completitud ---------- */

export function esVisible(u: PreguntaUbicada, r: Record<string, Respuesta>): boolean {
  if (u.padre && r[u.padre.id]?.estado !== 'no') return false;
  if (u.pregunta.visibleSi && !u.pregunta.visibleSi(r)) return false;
  return true;
}

const lleno = (s?: string) => !!s && s.trim().length > 0;

export function estaRespondida(p: Pregunta, resp?: Respuesta): boolean {
  if (!resp) return false;
  if (resp.estado === 'confirmar') return false;
  if (resp.estado === 'na') return true;
  if (p.tipo === 'sino') return resp.estado === 'si' || resp.estado === 'no';
  if (p.triple) return lleno(resp.acordado) || lleno(resp.valor);
  return lleno(resp.valor);
}

export interface Progreso {
  total: number;
  hechas: number;
  porcentaje: number;
}

function progresoDe(lista: PreguntaUbicada[], r: Record<string, Respuesta>): Progreso {
  const visibles = lista.filter((u) => esVisible(u, r));
  const hechas = visibles.filter((u) => estaRespondida(u.pregunta, r[u.pregunta.id])).length;
  const total = visibles.length;
  return { total, hechas, porcentaje: total ? Math.round((hechas / total) * 100) : 0 };
}

export const progresoGeneral = (f: Fecha): Progreso => progresoDe(TODAS_LAS_PREGUNTAS, f.respuestas);

export const progresoSeccion = (f: Fecha, s: SeccionChecklistId): Progreso =>
  progresoDe(
    TODAS_LAS_PREGUNTAS.filter((u) => u.seccion === s),
    f.respuestas,
  );

/** Preguntas críticas sin resolver: "Antes de cerrar la fecha nos falta…" */
export function faltantesCriticos(f: Fecha): PreguntaUbicada[] {
  return TODAS_LAS_PREGUNTAS.filter(
    (u) => u.pregunta.critica && esVisible(u, f.respuestas) && !estaRespondida(u.pregunta, f.respuestas[u.pregunta.id]),
  );
}

/* ---------- pendientes ---------- */

export type GrupoPendiente = 'urgente' | 'resolver' | 'resuelto';

export interface PendienteVista {
  id: string;
  descripcion: string;
  seccion: SeccionId;
  responsable?: string;
  limite?: string;
  urgente: boolean;
  resuelto: boolean;
  /** viene de una respuesta "A confirmar" del checklist */
  automatico: boolean;
  preguntaId?: string;
}

export function hoyISO(d = new Date()): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function venceProntito(limite?: string): boolean {
  if (!limite) return false;
  const en2dias = hoyISO(new Date(Date.now() + 2 * 86400000));
  return limite <= en2dias;
}

export function grupoDe(p: PendienteVista): GrupoPendiente {
  if (p.resuelto) return 'resuelto';
  if (p.urgente || venceProntito(p.limite)) return 'urgente';
  return 'resolver';
}

/** Pendientes manuales + los generados automáticamente por "A confirmar" */
export function todosLosPendientes(f: Fecha): PendienteVista[] {
  const auto: PendienteVista[] = TODAS_LAS_PREGUNTAS.filter(
    (u) => f.respuestas[u.pregunta.id]?.estado === 'confirmar' && esVisible(u, f.respuestas),
  ).map((u) => {
    const r = f.respuestas[u.pregunta.id] ?? {};
    return {
      id: `auto:${u.pregunta.id}`,
      descripcion: u.pregunta.label + (r.detalle ? ` — ${r.detalle}` : ''),
      seccion: u.seccion,
      responsable: r.responsable,
      limite: r.limite,
      urgente: !!r.urgente,
      resuelto: false,
      automatico: true,
      preguntaId: u.pregunta.id,
    };
  });
  const manuales: PendienteVista[] = f.pendientes.map((p) => ({ ...p, automatico: false }));
  return [...auto, ...manuales];
}

export const pendientesAbiertos = (f: Fecha): PendienteVista[] =>
  todosLosPendientes(f).filter((p) => !p.resuelto);

/* ---------- planificado vs real ---------- */

/** Lo que quedó planificado/acordado para una pregunta comparable */
export function valorPlanificado(preguntaId: string, r: Record<string, Respuesta>): string {
  const u = PREGUNTAS_POR_ID[preguntaId];
  const resp = r[preguntaId];
  if (!u || !resp) return '';
  if (resp.estado === 'na') return 'No aplica';
  if (resp.estado === 'confirmar') return 'A confirmar';
  const p = u.pregunta;
  if (p.tipo === 'sino') return resp.estado ? ESTADO4_LABEL[resp.estado] : '';
  if (p.triple) return resp.acordado || resp.valor || '';
  return resp.valor ?? '';
}

/** Texto legible de una respuesta, para resumen y PDF */
export function respuestaLegible(p: Pregunta, resp?: Respuesta): string {
  if (!resp) return '';
  const partes: string[] = [];
  if (p.tipo === 'sino') {
    if (resp.estado) partes.push(ESTADO4_LABEL[resp.estado]);
  } else {
    if (resp.estado === 'na' || resp.estado === 'confirmar') partes.push(ESTADO4_LABEL[resp.estado]);
    if (p.triple) {
      const t = [
        resp.ideal && `Ideal: ${resp.ideal}`,
        resp.minimo && `Mínimo: ${resp.minimo}`,
        (resp.acordado || resp.valor) && `Acordado: ${resp.acordado || resp.valor}`,
      ].filter(Boolean);
      if (t.length) partes.push(t.join(' · '));
    } else if (lleno(resp.valor)) partes.push(resp.valor!.trim());
  }
  if (lleno(resp.detalle)) partes.push(resp.detalle!.trim());
  return partes.join(' — ');
}

/** Riesgos que surgen solos del checklist (ej: tocar sin prueba aceptado) */
export function riesgosDerivados(f: Fecha): Riesgo[] {
  const r = f.respuestas;
  const out: Riesgo[] = [];
  if (r.tec_prueba?.estado === 'no' && r.tec_np_aceptamos?.estado === 'si') {
    out.push({
      id: 'auto:sin-prueba',
      tipo: 'asumido',
      descripcion: 'Tocar sin prueba de sonido (decidido en el checklist técnico).',
    });
  }
  if (r.esp_camarin?.estado === 'no') {
    out.push({
      id: 'auto:sin-camarin',
      tipo: 'asumido',
      descripcion: `Sin camarín${r.esp_cambio_alt?.valor ? `: nos cambiamos en ${r.esp_cambio_alt.valor}` : ''}.`,
    });
  }
  const mics = r.tec_mics;
  if (mics?.minimo && (mics.acordado || mics.valor)) {
    const min = Number(mics.minimo);
    const acord = Number(mics.acordado || mics.valor);
    if (!Number.isNaN(min) && !Number.isNaN(acord) && acord < min) {
      out.push({
        id: 'auto:mics-bajo-minimo',
        tipo: 'asumido',
        descripcion: `Micrófonos acordados (${acord}) por debajo del mínimo necesario (${min}).`,
      });
    }
  }
  return out;
}

/* ---------- economía ---------- */

export interface BalanceMoneda {
  moneda: Moneda;
  ingresos: number;
  egresos: number;
  saldo: number;
  cantidad: number;
}

/** Nunca se mezclan monedas: un balance por moneda */
export function balancesPorMoneda(movs: Movimiento[]): BalanceMoneda[] {
  const map = new Map<Moneda, BalanceMoneda>();
  for (const m of movs) {
    const b = map.get(m.moneda) ?? { moneda: m.moneda, ingresos: 0, egresos: 0, saldo: 0, cantidad: 0 };
    if (m.tipo === 'ingreso') b.ingresos += m.monto;
    else b.egresos += m.monto;
    b.saldo = b.ingresos - b.egresos;
    b.cantidad += 1;
    map.set(m.moneda, b);
  }
  return (['ARS', 'USD'] as Moneda[]).flatMap((m) => (map.has(m) ? [map.get(m)!] : []));
}

export function formatoMonto(monto: number, moneda: Moneda): string {
  const n = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Math.abs(monto));
  const signo = monto < 0 ? '-' : '';
  return moneda === 'ARS' ? `${signo}$${n}` : `${signo}USD ${n}`;
}

/* ---------- fechas y formato ---------- */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function fechaCorta(iso?: string): string {
  if (!iso) return 'sin fecha';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MESES[m - 1]} ${y}`;
}

export function fechaLarga(iso?: string): string {
  if (!iso) return 'Sin fecha definida';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${MESES_LARGO[m - 1]} de ${y}`;
}

export function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

/** "Córdoba, Argentina" → "CÓRDOBA" (para el #hashtag de WhatsApp) */
export function etiquetaDe(f: Fecha): string {
  const base = (f.etiqueta || f.lugar || f.nombre || 'FECHA').split(',')[0] ?? 'FECHA';
  return base.trim().toUpperCase().replace(/\s+/g, '');
}

export const seccionesConContenido = (f: Fecha): SeccionChecklistId[] =>
  CHECKLIST.filter((s) => s.preguntas.some((p) => f.respuestas[p.id])).map((s) => s.id);
