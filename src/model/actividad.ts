import { PREGUNTAS_POR_ID, seccionLabel } from './checklist';
import { formatoMonto } from './logic';
import { ESTADO_LABEL, ESTADO4_LABEL, type Fecha, type Respuesta, type SeccionId } from './types';

/**
 * NOVEDADES (actividad)
 * ---------------------
 * Cada vez que alguien cambia una fecha, se anota quién hizo qué. Se guarda
 * dentro de la misma fecha (no hace falta tabla nueva) y la campanita junta
 * las novedades de todas las fechas.
 *
 * Para que no aparezca una novedad por cada tecla, los cambios de la misma
 * persona en la misma parte de la fecha se juntan en una sola entrada durante
 * JUNTAR_MIN minutos.
 */

export interface Actividad {
  id: string;
  cuando: string;
  autor: string;
  /** qué parte se tocó: 'resp:tecnica', 'update:<id>', 'estado'… (para juntar) */
  clave: string;
  texto: string;
  seccion?: SeccionId;
  /** preguntas tocadas (para las entradas del checklist) */
  items?: string[];
}

const JUNTAR_MIN = 20;
const MAX_POR_FECHA = 300;

interface Cambio {
  clave: string;
  texto: string;
  seccion?: SeccionId;
  items?: string[];
}

const corto = (s: string, n = 70) => {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const etiqueta = (id: string) => {
  const p = PREGUNTAS_POR_ID[id]?.pregunta;
  // "¿Hay camarín? ¿Dónde nos cambiamos?" → "Hay camarín"
  return p ? (p.label.split('?')[0] ?? p.label).replace(/[¿?]/g, '').trim() : id;
};

function valorCorto(id: string, r?: Respuesta): string {
  if (!r) return '';
  if (r.estado === 'confirmar') return 'a confirmar';
  if (r.estado === 'na') return 'no aplica';
  const p = PREGUNTAS_POR_ID[id]?.pregunta;
  if (p?.tipo === 'sino' && r.estado) return ESTADO4_LABEL[r.estado].toLowerCase();
  const v = (p?.triple ? r.acordado || r.valor : r.valor) ?? '';
  return corto(v, 40);
}

/** Texto de una entrada del checklist a partir de las preguntas tocadas */
export function textoChecklist(f: Fecha, items: string[], seccion: SeccionId): string {
  const s = seccionLabel(seccion);
  if (items.length === 1) {
    const id = items[0]!;
    const v = valorCorto(id, f.respuestas[id]);
    return `actualizó ${s}: ${etiqueta(id)}${v ? ` → ${v}` : ''}`;
  }
  const muestra = items.slice(0, 3).map((id) => {
    const v = valorCorto(id, f.respuestas[id]);
    return `${etiqueta(id)}${v ? ` (${v})` : ''}`;
  });
  const resto = items.length > 3 ? ` y ${items.length - 3} más` : '';
  return `actualizó ${items.length} cosas en ${s}: ${muestra.join(' · ')}${resto}`;
}

const mismo = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Qué cambió entre dos versiones de una fecha */
export function describirCambios(antes: Fecha, despues: Fecha): Cambio[] {
  const out: Cambio[] = [];

  // estado
  if (antes.estado !== despues.estado) {
    out.push({ clave: 'estado', texto: `pasó la fecha a ${ESTADO_LABEL[despues.estado]}` });
  }

  // checklist, agrupado por sección
  const ids = new Set([...Object.keys(antes.respuestas), ...Object.keys(despues.respuestas)]);
  const porSeccion = new Map<SeccionId, string[]>();
  for (const id of ids) {
    const a = { ...antes.respuestas[id], actualizado: undefined };
    const d = { ...despues.respuestas[id], actualizado: undefined };
    if (mismo(a, d)) continue;
    const seccion = PREGUNTAS_POR_ID[id]?.seccion;
    if (!seccion) continue;
    porSeccion.set(seccion, [...(porSeccion.get(seccion) ?? []), id]);
  }
  for (const [seccion, items] of porSeccion) {
    out.push({ clave: `resp:${seccion}`, texto: textoChecklist(despues, items, seccion), seccion, items });
  }

  // updates
  const updAntes = new Set(antes.updates.map((u) => u.id));
  for (const u of despues.updates.filter((x) => !updAntes.has(x.id))) {
    const alGrupo = u.tema === 'Update al grupo';
    out.push({
      clave: `update:${u.id}`,
      texto: alGrupo ? 'mandó el update de la fecha al grupo 🟢' : `registró ${u.categoria === 'DECISIÓN' ? 'una decisión' : `un ${u.categoria.toLowerCase()}`}: «${corto(u.texto, 90)}»`,
      seccion: 'updates',
    });
  }

  // pendientes manuales
  const pendAntes = new Map(antes.pendientes.map((p) => [p.id, p]));
  for (const p of despues.pendientes) {
    const previo = pendAntes.get(p.id);
    if (!previo) out.push({ clave: `pend:${p.id}`, texto: `sumó un pendiente${p.urgente ? ' urgente' : ''}: ${corto(p.descripcion)}`, seccion: 'pendientes' });
    else if (!previo.resuelto && p.resuelto) out.push({ clave: `pendok:${p.id}`, texto: `resolvió: ${corto(p.descripcion)} ✅`, seccion: 'pendientes' });
  }

  // economía
  const movAntes = new Set(antes.movimientos.map((m) => m.id));
  for (const m of despues.movimientos.filter((x) => !movAntes.has(x.id))) {
    out.push({
      clave: `mov:${m.id}`,
      texto: `cargó un ${m.tipo === 'ingreso' ? 'ingreso' : 'gasto'}${m.monto ? ` de ${formatoMonto(m.monto, m.moneda)}` : ''}${m.concepto ? `: ${corto(m.concepto, 50)}` : ''}`,
      seccion: 'economia',
    });
  }

  // links
  const linkAntes = new Set((antes.links ?? []).map((l) => l.id));
  for (const l of (despues.links ?? []).filter((x) => !linkAntes.has(x.id))) {
    out.push({ clave: `link:${l.id}`, texto: `sumó un link: ${corto(l.titulo || l.url, 60)}`, seccion: 'links' });
  }

  // quórum
  if (!antes.quorum?.enviado && despues.quorum?.enviado) out.push({ clave: 'quorum', texto: 'mandó la encuesta de quórum 🔴🔴🔴', seccion: 'resumen' });

  // integrador
  if (despues.integrador && !mismo(antes.integrador, despues.integrador)) out.push({ clave: 'integrador', texto: 'editó el integrador', seccion: 'integrador' });

  // riesgos
  if (despues.riesgos.length > antes.riesgos.length) out.push({ clave: 'riesgos', texto: 'sumó un riesgo / condición', seccion: 'resumen' });

  // retirada y cierre
  if (!antes.cierre.cerradaEn && despues.cierre.cerradaEn) out.push({ clave: 'cierre', texto: 'cerró la fecha 🎉', seccion: 'cierre' });
  else if (!mismo({ ...antes.cierre, cerradaEn: 0 }, { ...despues.cierre, cerradaEn: 0 })) out.push({ clave: 'retirada', texto: 'avanzó con la Retirada', seccion: 'cierre' });

  // datos generales (nombre, día, lugar, relato…)
  // (la dirección no: se copia sola desde el checklist)
  const generales = ['nombre', 'fecha', 'lugar', 'tipo', 'responsable', 'contacto', 'evento', 'formato', 'nota', 'relato'] as const;
  const cambiaron = generales.filter((k) => !mismo(antes[k], despues[k]));
  if (cambiaron.includes('fecha') && despues.fecha) out.push({ clave: 'dia', texto: `cambió el día de la fecha`, seccion: 'resumen' });
  else if (cambiaron.length) out.push({ clave: 'datos', texto: 'editó los datos de la fecha', seccion: 'resumen' });

  return out;
}

/** Suma los cambios a la actividad de la fecha, juntando lo que corresponde */
export function registrarActividad(antes: Fecha, despues: Fecha, autor: string, ahora = new Date()): Fecha {
  const cambios = describirCambios(antes, despues);
  if (!cambios.length) return despues;
  const lista = [...(despues.actividad ?? [])];
  const limite = new Date(ahora.getTime() - JUNTAR_MIN * 60_000).toISOString();
  const cuando = ahora.toISOString();

  for (const c of cambios) {
    // buscar una entrada reciente de la misma persona sobre lo mismo
    const i = lista.findIndex((a) => a.autor === autor && a.clave === c.clave && a.cuando >= limite);
    if (i >= 0) {
      const previa = lista[i]!;
      const items = c.items ? [...new Set([...(previa.items ?? []), ...c.items])] : undefined;
      const texto = items && c.seccion ? textoChecklist(despues, items, c.seccion) : c.texto;
      lista.splice(i, 1);
      lista.unshift({ ...previa, cuando, texto, items });
    } else {
      lista.unshift({ id: `act_${ahora.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, cuando, autor, ...c });
    }
  }
  return { ...despues, actividad: lista.slice(0, MAX_POR_FECHA) };
}

/** Entrada inicial al crear una fecha */
export function actividadInicial(f: Fecha, autor: string): Actividad {
  return {
    id: `act_${Date.now().toString(36)}`,
    cuando: f.creada,
    autor,
    clave: 'creada',
    texto: f.estado === 'idea' ? 'anotó una idea nueva 💡' : 'cargó una fecha nueva',
    seccion: 'resumen',
  };
}

export interface NovedadVista extends Actividad {
  fechaId: string;
  fechaNombre: string;
}

/** Todas las novedades, de la más nueva a la más vieja */
export function todasLasNovedades(fechas: Fecha[], fechaId?: string): NovedadVista[] {
  return fechas
    .filter((f) => !fechaId || f.id === fechaId)
    .flatMap((f) => (f.actividad ?? []).map((a) => ({ ...a, fechaId: f.id, fechaNombre: f.nombre })))
    .sort((a, b) => b.cuando.localeCompare(a.cuando));
}

/** Nombre corto para mostrar: "Cou Infante" → "Cou"; sin nombre, la parte antes de la @ */
export function nombreCorto(nombre?: string, email?: string): string {
  const n = nombre?.trim().split(/\s+/)[0];
  if (n) return n;
  const e = email?.split('@')[0]?.split(/[._\-+]/)[0];
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : 'Alguien';
}
