import { CAMARIN_IDEAL, TODAS_LAS_PREGUNTAS, type Pregunta } from './checklist';
import { esVisible, estaRespondida, etiquetaDe, pendientesAbiertos, type PendienteVista } from './logic';
import type { Fecha, Respuesta, SeccionChecklistId, SeccionId } from './types';
import { conHs } from './integrador';

/**
 * UPDATE PARA EL GRUPO
 * --------------------
 * Arma, a partir del checklist, el mensaje con el que la produ responsable
 * cuenta "cómo viene la fecha": lo que ya está (✅), lo que falta (🟡) y los
 * próximos pasos. No se manda solo: se arma, se edita y se copia.
 */

/** Cómo se cuenta cada pregunta en el update */
interface Frase {
  /** si la respuesta es Sí */
  si?: string;
  /** si la respuesta es No */
  no?: string;
  /** para datos, textos y opciones */
  valor?: (v: string) => string;
  /** cómo se dice si todavía falta */
  pend: string;
  /** lo que se responda es algo a tener en cuenta (⚠️) */
  alerta?: boolean;
}

const t = (v: string) => v.trim().replace(/\s*\n+\s*/g, ' · ');
const hora = (v: string) => conHs(t(v));

const FRASES: Record<string, Frase> = {
  // ESPACIO
  esp_direccion: { valor: (v) => `Dirección: ${t(v)}.`, pend: 'Confirmar la dirección exacta.' },
  esp_capacidad: { valor: (v) => `Capacidad del lugar: ${t(v)} personas.`, pend: 'Averiguar la capacidad del lugar.' },
  esp_escenario_dim: { valor: (v) => `Escenario de ${t(v)}.`, pend: 'Confirmar las dimensiones del escenario.' },
  esp_escenario_tipo: { valor: (v) => `Escenario: ${t(v).toLowerCase()}.`, pend: 'Confirmar si el escenario es elevado o al piso.' },
  esp_camarin: { si: 'Hay camarín.', no: 'No hay camarín.', pend: 'Confirmar si hay camarín y dónde nos cambiamos.' },
  esp_cambio_alt: { valor: (v) => `Nos cambiamos en: ${t(v)}.`, pend: 'Definir dónde nos cambiamos.' },
  esp_cambio_seguro: { si: 'El lugar para cambiarnos es seguro.', no: 'El lugar para cambiarnos no es del todo seguro: ojo con las cosas.', pend: 'Confirmar que el lugar para cambiarnos sea seguro.' },
  esp_camarin_tiene: { valor: tieneCamarin, pend: 'Confirmar condiciones del camarín: espejos, luz, mesa y sillas.' },
  esp_cambio_tiene: { valor: tieneCamarin, pend: 'Confirmar qué tiene el lugar donde nos cambiamos: espejos, luz, mesa y sillas.' },
  esp_camarines_cant: { valor: (v) => (t(v) === '1' ? 'Un camarín.' : `${t(v)} camarines.`), pend: 'Confirmar cuántos camarines hay.' },
  esp_banos: { si: 'Hay baños.', no: 'No hay baños para nosotres.', pend: 'Confirmar si hay baños.' },
  esp_acceso: { valor: (v) => `Acceso: ${t(v)}.`, pend: 'Averiguar cómo es el acceso.' },
  esp_ingreso: { valor: (v) => `Ingresamos al espacio a las ${hora(v)}.`, pend: 'Confirmar horario de acceso al espacio.' },
  esp_show: { valor: (v) => `Tocamos a las ${hora(v)}.`, pend: 'Confirmar a qué hora tocamos.' },
  esp_duracion: { valor: (v) => `Tenemos ${t(v)} de escenario.`, pend: 'Confirmar cuánto tiempo de escenario tenemos.' },
  esp_guardar_vestuario: { si: 'Hay lugar para guardar vestuario.', no: 'No hay lugar para guardar vestuario.', pend: 'Confirmar dónde guardamos el vestuario.' },
  esp_guardar_instrumentos: { si: 'Hay lugar seguro para los instrumentos.', no: 'No hay lugar seguro para los instrumentos.', pend: 'Confirmar dónde quedan los instrumentos.' },
  esp_agua: { si: 'Hay agua para la murga.', no: 'No hay agua: la llevamos.', pend: 'Confirmar disponibilidad de agua para la murga.' },
  esp_restricciones: { valor: (v) => `${t(v)}.`, pend: 'Preguntar si hay restricciones particulares.', alerta: true },
  // TÉCNICA
  tec_rider_enviado: { si: 'Rider enviado.', no: 'Todavía no mandamos el rider.', pend: 'Mandar el rider.' },
  tec_rider_ok: { si: 'Rider confirmado por el espacio.', no: 'El rider no fue confirmado.', pend: 'Que nos confirmen el rider.' },
  tec_prueba: { si: 'Hay prueba de sonido.', no: 'No hay prueba de sonido.', pend: 'Confirmar si hay prueba de sonido.' },
  tec_np_mics: { si: 'Cantidad de micrófonos confirmada.', no: 'Falta confirmar la cantidad de micrófonos.', pend: 'Confirmar cantidad de micrófonos.' },
  tec_np_monitoreo: { si: 'Monitoreo confirmado.', no: 'El monitoreo no está confirmado.', pend: 'Confirmar el monitoreo.' },
  tec_np_operador: { valor: (v) => `Nos opera sonido: ${t(v)}.`, pend: 'Confirmar quién opera sonido.' },
  tec_np_armado: { si: 'Horario de armado confirmado.', no: 'El horario de armado no está confirmado.', pend: 'Confirmar horario de armado.' },
  tec_np_aceptamos: { si: 'Decidimos tocar igual en estas condiciones.', no: 'No aceptamos tocar en estas condiciones.', pend: 'Decidir si tocamos en estas condiciones.' },
  tec_prueba_hora: { valor: (v) => `Prueba de sonido a las ${hora(v)}.`, pend: 'Cerrar el horario de la prueba de sonido.' },
  tec_mics: { valor: (v) => `${t(v)} micrófonos.`, pend: 'Acordar cuántos micrófonos.' },
  tec_mics_tipo: { valor: (v) => `Micrófonos: ${t(v)}.`, pend: 'Confirmar qué tipo de micrófonos hay.' },
  tec_monitores: { valor: (v) => `${t(v)} monitores.`, pend: 'Acordar cuántos monitores.' },
  tec_mezclas: { valor: (v) => `${t(v)} mezclas de monitoreo.`, pend: 'Acordar cuántas mezclas de monitoreo.' },
  tec_percu: { valor: (v) => `Percusión: ${t(v)}.`, pend: 'Definir cómo se microfonea la percusión.' },
  tec_consola: { valor: (v) => `Consola: ${t(v)}.`, pend: 'Averiguar qué consola hay.' },
  tec_operador_sonido: { valor: (v) => `Sonido a cargo de ${t(v)}.`, pend: 'Confirmar quién opera sonido.' },
  tec_luces: { si: 'Hay luces.', no: 'No hay luces.', pend: 'Confirmar si hay luces.' },
  tec_operador_luces: { valor: (v) => `Luces a cargo de ${t(v)}.`, pend: 'Confirmar quién opera luces.' },
  tec_contacto: { valor: (v) => `Contacto técnico: ${t(v)}.`, pend: 'Confirmar contacto técnico.' },
  tec_limitaciones: { valor: (v) => `${t(v)}.`, pend: 'Preguntar si hay limitaciones técnicas.', alerta: true },
  // LOGÍSTICA
  log_traslado: { valor: (v) => (v === 'Cada una por su cuenta' ? 'Vamos cada una por su cuenta.' : `Viajamos en: ${t(v).toLowerCase()}.`), pend: 'Definir cómo viajamos.' },
  log_personas: { valor: (v) => `Viajamos ${t(v)} personas.`, pend: 'Confirmar cuántas personas viajamos.' },
  log_salida_punto: { valor: (v) => `Salimos desde ${t(v)}.`, pend: 'Definir desde dónde salimos.' },
  log_salida_hora: { valor: (v) => `Salimos a las ${hora(v)}.`, pend: 'Definir horario de salida.' },
  log_regreso: { valor: (v) => `Regreso: ${t(v)}.`, pend: 'Confirmar cómo y cuándo volvemos.' },
  log_alojamiento: { si: 'Hay alojamiento.', no: 'No hay alojamiento.', pend: 'Confirmar si hay alojamiento.' },
  log_base: { valor: (v) => `Base: ${t(v)}.`, pend: 'Definir dónde es la base.' },
  log_comida: { si: 'Comida resuelta.', no: 'No hay comida: cada una lleva lo suyo.', pend: 'Resolver la comida.' },
  log_agua: { si: 'Agua resuelta.', no: 'El agua no está resuelta: la llevamos.', pend: 'Resolver el agua.' },
  log_estacionamiento: { si: 'Hay estacionamiento.', no: 'No hay estacionamiento.', pend: 'Averiguar si hay estacionamiento.' },
  log_vestuario: { valor: (v) => `El vestuario lo lleva ${t(v)}.`, pend: 'Definir quién traslada el vestuario.' },
  log_instrumentos: { valor: (v) => `Los instrumentos los lleva ${t(v)}.`, pend: 'Definir quién traslada los instrumentos.' },
  log_encuentro: { valor: (v) => `Punto de encuentro: ${t(v)}.`, pend: 'Definir punto de encuentro.' },
  log_horarios: { valor: (v) => `Horarios: ${t(v)}.`, pend: 'Armar los horarios importantes.' },
  // ARTÍSTICO
  art_repertorio: { valor: (v) => `Repertorio: ${t(v)}.`, pend: 'Definir el repertorio.' },
  art_orden: { valor: (v) => `Orden de canciones: ${t(v)}.`, pend: 'Pedirle a Comi Arti el orden definitivo de canciones.' },
  art_duracion: { valor: (v) => `Lo que hacemos dura ${t(v)}.`, pend: 'Confirmar cuánto dura lo que hacemos.' },
  art_artistas: { valor: (v) => `Suben ${t(v)} artistas.`, pend: 'Confirmar cuántas artistas suben.' },
  art_instrumentos: { valor: (v) => `Instrumentos: ${t(v)}.`, pend: 'Definir qué instrumentos van.' },
  art_especiales: { valor: (v) => `Intervenciones especiales: ${t(v)}.`, pend: 'Definir si hay intervenciones especiales.' },
  art_responsable: { valor: (v) => `Lo artístico lo coordina ${t(v)}.`, pend: 'Definir quién coordina lo artístico.' },
  // VESTUARIO / MAQUILLAJE
  ves_propuesta: { valor: (v) => `Vestuario: ${t(v)}.`, pend: 'Definir la propuesta de vestuario.' },
  ves_confirmado: { si: 'Vestuario confirmado.', no: 'El vestuario todavía no está confirmado.', pend: 'Confirmar el vestuario.' },
  ves_accesorios: { valor: (v) => `Gorros y accesorios: ${t(v)}.`, pend: 'Definir gorros y accesorios.' },
  ves_maquillaje: { valor: (v) => `Maquillaje: ${t(v)}.`, pend: 'Definir el maquillaje.' },
  ves_lugar: { valor: (v) => `Nos preparamos en ${t(v)}.`, pend: 'Definir dónde nos preparamos.' },
  ves_horario: { valor: (v) => `Arrancamos a prepararnos a las ${hora(v)}.`, pend: 'Coordinar horario de preparación, maquillaje y vestuario.' },
  ves_necesidades: { valor: (v) => `A tener en cuenta: ${t(v)}.`, pend: 'Relevar necesidades particulares.' },
  // DIFUSIÓN
  dif_flyer: { si: 'Flyer listo.', no: 'Todavía no hay flyer.', pend: 'Hacer el flyer.' },
  dif_publicacion: { si: 'Publicación hecha.', no: 'Todavía no salió la publicación.', pend: 'Sacar la publicación.' },
  dif_colab: { si: 'Colaboración hecha con el espacio / otras cuentas.', no: 'Sin colaboración con otras cuentas.', pend: 'Hacer colaboración con el espacio u otras cuentas.' },
  dif_link: { valor: (v) => `Entradas: ${t(v)}`, pend: 'Conseguir el link de entradas.' },
  dif_precio: { valor: (v) => `Entrada: ${t(v)}.`, pend: 'Confirmar el precio de la entrada.' },
  dif_prensa: { si: 'Hay prensa.', no: 'No hay prensa.', pend: 'Ver si hay prensa.' },
  dif_historias: { si: 'Historias subidas.', no: 'Faltan las historias.', pend: 'Subir historias.' },
  dif_audiovisual: { si: 'Hay material audiovisual.', no: 'No hay material audiovisual.', pend: 'Conseguir material audiovisual.' },
  dif_registro: { si: 'Hay registro de foto / video.', no: 'No hay registro de foto / video.', pend: 'Conseguir registro de foto / video.' },
};

function tieneCamarin(v: string): string {
  if (v.includes('Nada de esto')) return 'El camarín no tiene luz, espejos, mesa ni sillas: lo llevamos nosotras.';
  const hay = v.split(',').map((x) => x.trim());
  const faltan = CAMARIN_IDEAL.filter((x) => !hay.includes(x));
  if (!faltan.length) return 'El camarín tiene luz, espejos, mesa y sillas.';
  return `El camarín tiene ${hay.join(', ').toLowerCase()}; falta ${faltan.join(', ').toLowerCase()}.`;
}

/** Orden y nombre de los bloques del update */
export const BLOQUES_REPORTE: { id: SeccionChecklistId; titulo: string }[] = [
  { id: 'artistico', titulo: '🎭 GRILLA Y ARTÍSTICO' },
  { id: 'tecnica', titulo: '🎤 TÉCNICA' },
  { id: 'espacio', titulo: '🏠 ESPACIO Y CAMARINES' },
  { id: 'logistica', titulo: '🚗 LOGÍSTICA' },
  { id: 'vestuario', titulo: '💄 VESTUARIO Y MAQUILLAJE' },
  { id: 'difusion', titulo: '📣 DIFUSIÓN' },
];

export interface OpcionesReporte {
  /** sumar como pendiente lo que todavía no se respondió */
  sinResponder: boolean;
  /** marcar con 🆕 lo que cambió desde el último update enviado */
  marcarNuevo: boolean;
  /** cerrar con el párrafo de la bitácora */
  bitacora: boolean;
}

export const OPCIONES_REPORTE: OpcionesReporte = { sinResponder: true, marcarNuevo: true, bitacora: true };

const lleno = (s?: string) => !!s && s.trim().length > 0;

function valorDe(p: Pregunta, r: Respuesta): string {
  if (p.triple) return (r.acordado || r.valor || '').trim();
  return (r.valor ?? '').trim();
}

/** Lo resuelto de una pregunta, como frase. '' si no hay nada que contar. */
function fraseResuelta(p: Pregunta, r: Respuesta): string {
  const f = FRASES[p.id];
  let base = '';
  if (p.tipo === 'sino') {
    if (r.estado === 'si') base = f?.si ?? `${limpiar(p.label)}: sí.`;
    else if (r.estado === 'no') base = f?.no ?? `${limpiar(p.label)}: no.`;
  } else {
    const v = valorDe(p, r);
    if (v) base = f?.valor ? f.valor(v) : `${limpiar(p.label)}: ${t(v)}.`;
  }
  if (!base) return '';
  return sinDoblePunto(lleno(r.detalle) ? `${base} ${punto(t(r.detalle!))}` : base);
}

const punto = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);
/** "aprox.." → "aprox." (sin tocar los "...") */
const sinDoblePunto = (s: string) => s.replace(/([^.])\.\.(?!\.)/g, '$1.');
const limpiar = (label: string) => label.replace(/[¿?]/g, '').trim();

function frasePendiente(p: Pregunta, r?: Respuesta): string {
  const base = FRASES[p.id]?.pend ?? `Definir: ${limpiar(p.label).toLowerCase()}.`;
  const extra = [r?.detalle && t(r.detalle), r?.responsable && `a cargo de ${r.responsable.trim()}`].filter(Boolean).join(', ');
  return extra ? `${base.replace(/\.$/, '')} (${extra}).` : base;
}

const fraseManual = (p: PendienteVista) => {
  const d = p.descripcion.trim().replace(/[.]$/, '');
  return punto(p.responsable ? `${d} (a cargo de ${p.responsable.trim()})` : d);
};

export interface BloqueReporte {
  id: SeccionChecklistId;
  titulo: string;
  /** alerta: una respuesta "No" que conviene que la murga sepa */
  listo: { texto: string; nuevo: boolean; alerta: boolean }[];
  pendientes: { texto: string; nuevo: boolean; urgente: boolean; limite?: string; critica: boolean }[];
}

/** Lo que dice el checklist, sección por sección */
export function bloquesReporte(f: Fecha, op: OpcionesReporte, desde?: string): BloqueReporte[] {
  const esNuevo = (r?: Respuesta) => !!(op.marcarNuevo && desde && r?.actualizado && r.actualizado > desde);
  const manuales = pendientesAbiertos(f).filter((p) => !p.automatico);
  return BLOQUES_REPORTE.map(({ id, titulo }) => {
    const listo: BloqueReporte['listo'] = [];
    const pendientes: BloqueReporte['pendientes'] = [];
    const ubicadas = TODAS_LAS_PREGUNTAS.filter((u) => u.seccion === id);
    // respetar el orden del checklist (incluye preguntas de seguimiento)
    for (const u of ubicadas) {
      if (!esVisible(u, f.respuestas)) continue;
      const p = u.pregunta;
      const r = f.respuestas[p.id];
      if (r?.estado === 'na') continue;
      if (r?.estado === 'confirmar') {
        pendientes.push({ texto: frasePendiente(p, r), nuevo: esNuevo(r), urgente: !!r.urgente, limite: r.limite, critica: !!p.critica });
        continue;
      }
      if (estaRespondida(p, r)) {
        const texto = fraseResuelta(p, r!);
        if (texto) listo.push({ texto, nuevo: esNuevo(r), alerta: (p.tipo === 'sino' && r?.estado === 'no') || !!FRASES[p.id]?.alerta });
        continue;
      }
      if (op.sinResponder) pendientes.push({ texto: frasePendiente(p, r), nuevo: false, urgente: false, critica: !!p.critica });
    }
    for (const m of manuales.filter((m) => m.seccion === (id as SeccionId))) {
      pendientes.push({ texto: fraseManual(m), nuevo: !!(op.marcarNuevo && desde && 'creado' in m && typeof m.creado === 'string' && m.creado > desde), urgente: m.urgente, limite: m.limite, critica: true });
    }
    return { id, titulo, listo, pendientes };
  }).filter((b) => b.listo.length || b.pendientes.length);
}

/** Los pendientes más importantes: urgentes, con fecha límite más cercana, críticos */
export function proximosPasos(bloques: BloqueReporte[], cuantos = 5): string[] {
  const todos = bloques.flatMap((b) => b.pendientes);
  const peso = (p: BloqueReporte['pendientes'][number]) => (p.urgente ? 0 : p.limite ? 1 : p.critica ? 2 : 3);
  return todos
    .filter((p) => p.urgente || p.limite || p.critica)
    .sort((a, b) => peso(a) - peso(b) || (a.limite ?? '9').localeCompare(b.limite ?? '9'))
    .slice(0, cuantos)
    .map((p) => p.texto);
}

const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function cuandoLargo(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${DIAS_LARGO[new Date(y, m - 1, d).getDay()]} ${d}/${m}`;
}

const ddmm = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

/** El texto completo para WhatsApp */
export function armarReporte(f: Fecha, op: OpcionesReporte = OPCIONES_REPORTE, hoy = new Date()): string {
  const desde = f.ultimoReporte;
  const bloques = bloquesReporte(f, op, desde);
  const nuevo = (n: boolean) => (n ? '🆕 ' : '');
  const out: string[] = [];

  out.push(`🟢 *#${etiquetaDe(f)} UPDATE | ${ddmm(hoy)}*`);
  const cuando = cuandoLargo(f.fecha);
  const donde = f.lugar?.trim();
  out.push(
    `Produs, actualizo cómo viene la fecha${cuando ? ` del ${cuando}` : ''}${donde ? ` en ${donde}` : ''}, con las últimas definiciones y todos los pendientes que tenemos que seguir de cerca.`,
  );

  for (const b of bloques) {
    const partes: string[] = [`*${b.titulo}*`];
    for (const l of b.listo.filter((x) => !x.alerta)) partes.push(`✅ ${nuevo(l.nuevo)}${l.texto}`);
    for (const l of b.listo.filter((x) => x.alerta)) partes.push(`⚠️ ${nuevo(l.nuevo)}${l.texto}`);
    if (b.pendientes.length === 1) {
      const p = b.pendientes[0]!;
      partes.push(`🟡 Pendiente: ${nuevo(p.nuevo)}${p.texto}`);
    } else if (b.pendientes.length > 1) {
      partes.push(['🟡 Pendientes:', ...b.pendientes.map((p) => `• ${nuevo(p.nuevo)}${p.texto}`)].join('\n'));
    }
    out.push(partes.join('\n\n'));
  }

  const pasos = proximosPasos(bloques);
  if (pasos.length) {
    out.push(['*📌 PRÓXIMOS PASOS PRIORITARIOS*', ...pasos.map((p, i) => `${i + 1}. ${p}`)].join('\n'));
  }

  if (op.bitacora) {
    out.push(
      '*📄 BITÁCORA*\nAdjunto la última versión de la bitácora generada desde La Produ, donde está el detalle completo de la fecha.\n\nLa idea es que sigamos registrando ahí las novedades y usemos estos updates para que ninguna definición se nos pierda.',
    );
  }
  out.push('¡Seguimos! 💜');
  return out.join('\n\n');
}

/** Cuántas cosas cambiaron desde el último update enviado */
export function cambiosDesde(f: Fecha): number {
  const desde = f.ultimoReporte;
  if (!desde) return 0;
  const resp = Object.values(f.respuestas).filter((r) => r.actualizado && r.actualizado > desde).length;
  const pend = f.pendientes.filter((p) => p.creado > desde || (p.resueltoEn && p.resueltoEn > desde)).length;
  return resp + pend;
}
