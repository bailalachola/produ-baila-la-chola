import type { Cierre, Fecha, NuevaFechaInput } from './types';

export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${rnd}` : rnd;
}

export const ahora = (): string => new Date().toISOString();

export function crearFecha(input: NuevaFechaInput): Fecha {
  const t = ahora();
  return {
    id: uid('fecha'),
    nombre: input.nombre.trim(),
    fecha: input.fecha,
    lugar: input.lugar.trim(),
    tipo: input.tipo,
    responsable: input.responsable.trim(),
    contacto: input.contacto?.trim() || undefined,
    estado: 'produccion',
    creada: t,
    actualizada: t,
    respuestas: {},
    pendientes: [],
    movimientos: [],
    updates: [
      {
        id: uid('upd'),
        cuando: t,
        categoria: 'UPDATE',
        texto: `Arrancamos a producir la fecha. Responsable de Producción: ${input.responsable.trim()}.`,
        autor: input.responsable.trim(),
      },
    ],
    riesgos: [],
    relato: {},
    links: [],
    cierre: cierreVacio(),
  };
}

export const cierreVacio = (): Cierre => ({ real: {}, balanceItem: {}, itemsExtra: [], resultadoRiesgo: {}, respuestas: {} });

/** Completa campos faltantes (útil al importar JSON de versiones anteriores) */
export function normalizarFecha(raw: Partial<Fecha> & { id: string }): Fecha {
  const t = ahora();
  return {
    nombre: 'Fecha sin nombre',
    fecha: '',
    lugar: '',
    tipo: 'Otro',
    responsable: '',
    estado: 'idea',
    creada: t,
    actualizada: t,
    ...raw,
    respuestas: raw.respuestas ?? {},
    pendientes: raw.pendientes ?? [],
    movimientos: raw.movimientos ?? [],
    updates: raw.updates ?? [],
    riesgos: raw.riesgos ?? [],
    relato: raw.relato ?? {},
    links: raw.links ?? [],
    cierre: { ...cierreVacio(), ...(raw.cierre ?? {}) },
  };
}
