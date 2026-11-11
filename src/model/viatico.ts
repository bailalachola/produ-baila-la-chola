/**
 * CALCULADORA DE VIÁTICO: ¿cuánto nos cuesta mover a la murga?
 * ------------------------------------------------------------
 * Dos partes:
 *  - Valores de referencia (iguales para todas las fechas): precio de la nafta,
 *    consumo, pizza, bidón, materiales, valor hora… Se actualizan con la inflación.
 *  - Datos de cada fecha: cuántas vamos, kilómetros, peajes y lo que cambie.
 * Todo en pesos. El valor del tiempo es una estimación nuestra, no una tarifa oficial.
 */

export interface Referencias {
  /** $ por litro */
  nafta: number;
  /** litros cada 100 km */
  consumo: number;
  personasPorAuto: number;
  pizzaPrecio: number;
  personasPorPizza: number;
  bidonPrecio: number;
  bidonLitros: number;
  litrosPorPersona: number;
  /** maquillaje, pestañas y materiales por fecha */
  materiales: number;
  /** horas de preparación por integrante (maquillaje, vestuario, organización) */
  horasPreparacion: number;
  /** referencia salarial mensual para valorizar el tiempo */
  salarioMensual: number;
  horasMes: number;
  referenciaSalarial: string;
  actualizado: string;
  actualizadoPor?: string;
}

/** Los valores de la cuenta de Francisco Álvarez (noviembre 2026) */
export const REFERENCIAS_INICIALES: Referencias = {
  nafta: 2100,
  consumo: 9,
  personasPorAuto: 4,
  pizzaPrecio: 18000,
  personasPorPizza: 2.6,
  bidonPrecio: 3700,
  bidonLitros: 6,
  litrosPorPersona: 1.6,
  materiales: 40000,
  horasPreparacion: 3,
  salarioMensual: 1660613,
  horasMes: 160,
  referenciaSalarial: 'Asociación Argentina de Actores y Actrices, escala noviembre 2026, categoría ensayos y apuntador',
  actualizado: '2026-11-05',
};

export interface Extra {
  id: string;
  concepto: string;
  monto: number;
}

/** Lo que se carga en cada fecha (vacío = se calcula solo) */
export interface Viatico {
  personas: number;
  /** km ida y vuelta (por auto) */
  km: number;
  peajes: number;
  autos?: number;
  pizzas?: number;
  bidones?: number;
  materiales?: number;
  /** sumar el valor del tiempo de preparación */
  conTiempo: boolean;
  horasPreparacion?: number;
  extras: Extra[];
  notas?: string;
}

export const viaticoNuevo = (): Viatico => ({ personas: 26, km: 0, peajes: 0, conTiempo: true, extras: [] });

export interface Renglon {
  id: string;
  concepto: string;
  detalle: string;
  monto: number;
}

export interface Calculo {
  autos: number;
  pizzas: number;
  bidones: number;
  litrosNafta: number;
  directos: Renglon[];
  totalDirectos: number;
  porPersona: number;
  horas: number;
  valorHora: number;
  tiempo: number;
  total: number;
}

const n = (x: number | undefined) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined);
const plata = (x: number) => `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(x))}`;
const num = (x: number, dec = 0) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: dec }).format(x);
export { plata, num };

export function calcular(v: Viatico, r: Referencias): Calculo {
  const personas = Math.max(0, Math.round(v.personas || 0));
  const autos = n(v.autos) ?? (personas ? Math.ceil(personas / Math.max(1, r.personasPorAuto)) : 0);
  const pizzas = n(v.pizzas) ?? (personas ? Math.ceil(personas / Math.max(0.1, r.personasPorPizza)) : 0);
  const bidones = n(v.bidones) ?? (personas ? Math.ceil((personas * r.litrosPorPersona) / Math.max(0.1, r.bidonLitros)) : 0);
  const materiales = n(v.materiales) ?? r.materiales;
  const litrosNafta = (autos * (v.km || 0) * r.consumo) / 100;

  const directos: Renglon[] = [
    {
      id: 'nafta',
      concepto: 'Combustible',
      detalle: `${autos} autos × ${num(v.km || 0)} km × ${num(r.consumo, 1)} l/100 km = ${num(litrosNafta, 1)} l a ${plata(r.nafta)}`,
      monto: litrosNafta * r.nafta,
    },
    { id: 'peajes', concepto: 'Peajes', detalle: 'presupuestado', monto: v.peajes || 0 },
    { id: 'comida', concepto: 'Comida', detalle: `${pizzas} pizzas grandes a ${plata(r.pizzaPrecio)}`, monto: pizzas * r.pizzaPrecio },
    {
      id: 'agua',
      concepto: 'Agua',
      detalle: `${bidones} bidones de ${num(r.bidonLitros)} l a ${plata(r.bidonPrecio)} · ${num(bidones * r.bidonLitros)} l en total`,
      monto: bidones * r.bidonPrecio,
    },
    { id: 'materiales', concepto: 'Maquillaje y materiales', detalle: 'por fecha', monto: materiales },
    ...v.extras.filter((e) => e.concepto.trim() || e.monto).map((e) => ({ id: e.id, concepto: e.concepto || 'Otro', detalle: '', monto: e.monto || 0 })),
  ];
  const totalDirectos = directos.reduce((s, x) => s + x.monto, 0);
  const valorHora = r.horasMes ? r.salarioMensual / r.horasMes : 0;
  const horas = personas * (n(v.horasPreparacion) ?? r.horasPreparacion);
  const tiempo = v.conTiempo ? horas * valorHora : 0;
  return {
    autos,
    pizzas,
    bidones,
    litrosNafta,
    directos,
    totalDirectos,
    porPersona: personas ? totalDirectos / personas : 0,
    horas,
    valorHora,
    tiempo,
    total: totalDirectos + tiempo,
  };
}

/** "300.000", "$300.000", "300000" → 300000 (si no se puede leer, undefined) */
export function leerPesos(s?: string): number | undefined {
  if (!s) return undefined;
  const limpio = s.replace(/[^\d.,]/g, '');
  if (!limpio) return undefined;
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(/\./g, '');
  const x = Number(normal);
  return Number.isFinite(x) && x > 0 ? x : undefined;
}

/** Texto para compartir (grupo o negociación) */
export function textoViatico(nombre: string, v: Viatico, r: Referencias, c: Calculo, arregloARS?: number): string {
  const l: string[] = [`🚗 *¿Cuánto nos cuesta movernos a ${nombre}?*`, `Somos ${v.personas} personas en ${c.autos} autos, ${num(v.km)} km ida y vuelta.`, ''];
  for (const d of c.directos) l.push(`• ${d.concepto}: ${plata(d.monto)}${d.detalle ? ` (${d.detalle})` : ''}`);
  l.push('', `*Gastos directos: ${plata(c.totalDirectos)}* (${plata(c.porPersona)} por persona)`);
  if (v.conTiempo) {
    l.push(
      '',
      `Además, ${num(c.horas)} horas de preparación (${num(n(v.horasPreparacion) ?? r.horasPreparacion, 1)} h por integrante) ≈ ${plata(c.tiempo)}, valorizadas a ${plata(c.valorHora)} la hora.`,
      `_Estimación nuestra a partir de: ${r.referenciaSalarial} (${plata(r.salarioMensual)} / ${num(r.horasMes)} h). No es una tarifa oficial._`,
      '',
      `*Costo total estimado: ${plata(c.total)}*`,
    );
  }
  l.push('_Sin contar horas de traslado, la actuación, los ensayos ni el trabajo de producción._');
  if (arregloARS) {
    const cubre = arregloARS / c.totalDirectos;
    l.push('', `El arreglo (${plata(arregloARS)}) cubre el ${num(cubre * 100)}% de los gastos directos${cubre < 1 ? `: faltan ${plata(c.totalDirectos - arregloARS)}` : ''}.`);
  }
  return l.join('\n');
}

/** ¿Hace mucho que no se actualizan los precios? */
export const referenciasViejas = (r: Referencias, hoy = new Date()) =>
  (hoy.getTime() - new Date(`${r.actualizado}T12:00:00`).getTime()) / 86_400_000 > 45;
