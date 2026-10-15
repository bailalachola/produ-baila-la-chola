import { TODAS_LAS_PREGUNTAS, seccionLabel } from '../model/checklist';
import { estadoQuorum } from '../model/quorum';
import {
  esVisible,
  pendientesAbiertos,
  progresoGeneral,
  respuestaLegible,
  todosLosPendientes,
  hoyISO,
} from '../model/logic';
import { CATEGORIAS_LINK_FECHA, ESTADO_LABEL, ESTADO_MOV_LABEL, type Fecha } from '../model/types';
import { descargarArchivo } from './backup';

/**
 * EXPORTAR A PLANILLA (.xlsx)
 * Una hoja por tipo de dato, con columnas legibles. Sirve para mirar todo
 * junto, filtrar o pasarlo a Google Sheets. No se vuelve a importar:
 * para restaurar se usa el respaldo JSON.
 */

type Fila = Record<string, string | number>;

const fechaHoraLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
};

function hojas(fechas: Fecha[]): Record<string, Fila[]> {
  const ordenadas = [...fechas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const resumen: Fila[] = ordenadas.map((f) => ({
    Fecha: f.fecha,
    Nombre: f.nombre,
    Lugar: f.lugar,
    Dirección: f.direccion ?? '',
    Tipo: f.tipo,
    Estado: ESTADO_LABEL[f.estado],
    'Producción (responsables)': f.responsable,
    Contraparte: f.contacto ?? '',
    'Idea / nota': f.nota ?? '',
    Quórum: estadoQuorum(f.quorum)?.texto ?? '',
    'Checklist %': progresoGeneral(f).porcentaje,
    'Pendientes abiertos': pendientesAbiertos(f).length,
    'Balance de Producción': f.cierre.balance ?? '',
    'Última actualización': fechaHoraLocal(f.actualizada),
  }));

  const movimientos: Fila[] = ordenadas.flatMap((f) =>
    [...f.movimientos]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((m) => ({
        Fecha: f.nombre,
        Día: m.fecha,
        Concepto: m.concepto,
        Categoría: m.categoria,
        Tipo: m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        // con signo, para poder sumar por moneda con un filtro
        Monto: m.tipo === 'ingreso' ? m.monto : -m.monto,
        Moneda: m.moneda,
        'Quién pagó': m.pago ?? '',
        'Quién recibió': m.recibio ?? '',
        Estado: ESTADO_MOV_LABEL[m.estado],
        Observaciones: m.observaciones ?? '',
      })),
  );

  const pendientes: Fila[] = ordenadas.flatMap((f) =>
    todosLosPendientes(f).map((p) => ({
      Fecha: f.nombre,
      Pendiente: p.descripcion,
      Sección: seccionLabel(p.seccion),
      Responsable: p.responsable ?? '',
      'Fecha límite': p.limite ?? '',
      Urgente: p.urgente ? 'Sí' : '',
      Estado: p.resuelto ? 'Resuelto' : 'Abierto',
      Origen: p.automatico ? 'Checklist (a confirmar)' : 'Anotado',
    })),
  );

  const updates: Fila[] = ordenadas.flatMap((f) =>
    [...f.updates]
      .sort((a, b) => a.cuando.localeCompare(b.cuando))
      .map((u) => ({
        Fecha: f.nombre,
        Cuándo: fechaHoraLocal(u.cuando),
        Momento: u.momento ?? '',
        Tema: u.tema ?? '',
        Categoría: u.categoria,
        Registro: u.texto,
        Autor: u.autor ?? '',
      })),
  );

  const checklist: Fila[] = ordenadas.flatMap((f) =>
    TODAS_LAS_PREGUNTAS.filter((u) => esVisible(u, f.respuestas) && f.respuestas[u.pregunta.id]).map((u) => {
      const r = f.respuestas[u.pregunta.id]!;
      return {
        Fecha: f.nombre,
        Sección: seccionLabel(u.seccion),
        Pregunta: u.pregunta.label,
        Respuesta: respuestaLegible(u.pregunta, r),
        Responsable: r.responsable ?? '',
        'Fecha límite': r.limite ?? '',
        Notas: r.notas ?? '',
        'Qué pasó (real)': f.cierre.real[u.pregunta.id] ?? '',
      };
    }),
  );

  const links: Fila[] = ordenadas.flatMap((f) =>
    f.links.map((l) => ({
      Fecha: f.nombre,
      Categoría: CATEGORIAS_LINK_FECHA.find((c) => c.id === l.categoria)?.label ?? l.categoria,
      Qué: l.titulo,
      Link: l.url,
      Nota: l.nota ?? '',
    })),
  );

  return { Fechas: resumen, Movimientos: movimientos, Pendientes: pendientes, Updates: updates, Links: links, Checklist: checklist };
}

export async function exportarPlanilla(fechas: Fecha[]): Promise<boolean> {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas(fechas))) {
    const hoja = filas.length ? XLSX.utils.json_to_sheet(filas) : XLSX.utils.aoa_to_sheet([['Sin datos']]);
    // ancho de columnas según el contenido (con tope, para que no queden gigantes)
    const columnas = filas.length ? Object.keys(filas[0]!) : ['Sin datos'];
    hoja['!cols'] = columnas.map((c) => ({
      wch: Math.min(60, Math.max(c.length, ...filas.map((f) => String(f[c] ?? '').length)) + 2),
    }));
    XLSX.utils.book_append_sheet(libro, hoja, nombre);
  }
  const datos = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return descargarArchivo(
    `la-produ-${hoyISO()}.xlsx`,
    new Blob([datos], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
}
