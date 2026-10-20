import type { Integrador } from './integrador';
import type { Quorum } from './quorum';

/**
 * MODELO DE DATOS DE LA PRODU
 * Todo lo que se guarda vive acá. La UI no conoce cómo se persiste:
 * eso lo resuelve src/services/repository.ts.
 * Pensado para mapear 1:1 a tablas/JSONB si se migra a Supabase.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // ISO 8601 completo

export const ESTADOS = ['idea', 'produccion', 'confirmada', 'realizada', 'cerrada'] as const;
export type EstadoFecha = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<EstadoFecha, string> = {
  idea: 'Idea',
  produccion: 'En producción',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  cerrada: 'Cerrada',
};

export const TIPOS_FECHA = [
  'Show propio',
  'Fecha invitada',
  'Festival',
  'Marcha / intervención',
  'Encuentro',
  'Gira',
  'Corso / carnaval',
  'Otro',
] as const;

/** Respuesta rápida de checklist */
export type Estado4 = 'si' | 'no' | 'confirmar' | 'na';

export const ESTADO4_LABEL: Record<Estado4, string> = {
  si: 'Sí',
  no: 'No',
  confirmar: 'A confirmar',
  na: 'No aplica',
};

/** Respuesta a una pregunta del checklist. Todos los campos opcionales. */
export interface Respuesta {
  estado?: Estado4;
  /** valor libre (texto, número, horario) */
  valor?: string;
  /** para ítems técnicos: lo que soñamos / lo que necesitamos sí o sí / lo que se acordó */
  ideal?: string;
  minimo?: string;
  acordado?: string;
  detalle?: string;
  responsable?: string;
  limite?: ISODate;
  notas?: string;
  urgente?: boolean;
  actualizado?: ISODateTime;
}

export type SeccionChecklistId =
  | 'espacio'
  | 'tecnica'
  | 'logistica'
  | 'artistico'
  | 'vestuario'
  | 'difusion';

export type SeccionId =
  | 'resumen'
  | 'pendientes'
  | SeccionChecklistId
  | 'economia'
  | 'links'
  | 'integrador'
  | 'updates'
  | 'cierre';

export interface Pendiente {
  id: string;
  descripcion: string;
  seccion: SeccionId;
  responsable?: string;
  limite?: ISODate;
  urgente: boolean;
  resuelto: boolean;
  creado: ISODateTime;
  resueltoEn?: ISODateTime;
}

export const MONEDAS = ['ARS', 'USD'] as const;
export type Moneda = (typeof MONEDAS)[number];

export const CATEGORIAS_MOV = [
  'Transporte',
  'Alojamiento',
  'Comida',
  'Técnica',
  'Vestuario',
  'Difusión',
  'Entradas',
  'Merch',
  'Reintegros',
  'Otros',
] as const;
export type CategoriaMov = (typeof CATEGORIAS_MOV)[number];

export type EstadoMov = 'confirmado' | 'confirmar_concepto' | 'reintegro';
export const ESTADO_MOV_LABEL: Record<EstadoMov, string> = {
  confirmado: 'Confirmado',
  confirmar_concepto: 'Pendiente de confirmar concepto',
  reintegro: 'Pendiente de reintegro',
};

export interface Movimiento {
  id: string;
  fecha: ISODate;
  concepto: string;
  categoria: CategoriaMov;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  moneda: Moneda;
  pago?: string;
  recibio?: string;
  estado: EstadoMov;
  observaciones?: string;
}

export const CATEGORIAS_UPDATE = ['DECISIÓN', 'UPDATE', 'PENDIENTE', 'RESUELTO', 'CAMBIO'] as const;
export type CategoriaUpdate = (typeof CATEGORIAS_UPDATE)[number];

export interface Update {
  id: string;
  cuando: ISODateTime;
  categoria: CategoriaUpdate;
  texto: string;
  autor?: string;
  /** etiqueta libre para la bitácora: "Previo al viaje", "Domingo 11/10"… */
  momento?: string;
  /** tema del hito: Técnica, Camarín, Logística… */
  tema?: string;
}

export type TipoRiesgo = 'minima' | 'asumido' | 'inesperado';
export const TIPO_RIESGO_LABEL: Record<TipoRiesgo, string> = {
  minima: 'Condición mínima',
  asumido: 'Riesgo asumido',
  inesperado: 'Problema inesperado',
};

export interface Riesgo {
  id: string;
  tipo: TipoRiesgo;
  descripcion: string;
  /** qué pasó con esto finalmente */
  resultado?: string;
}

export type Balance = 'positivo' | 'mixto' | 'negativo';

/**
 * RELATO DE PRODUCCIÓN
 * Textos que arman el cuerpo de la bitácora. Una idea por línea:
 * "- algo" se vuelve viñeta y "1. algo" un paso numerado.
 */
export const RELATO_PREVIO = [
  { id: 'contexto', label: 'Contexto y objetivo de la fecha', ayuda: '¿Por qué hacemos esta fecha? ¿Qué buscamos?' },
  { id: 'condiciones', label: 'Condiciones iniciales y acuerdos de producción', ayuda: 'Lo que nos informaron y lo que negociamos.' },
  { id: 'gestionTecnica', label: 'Gestión técnica previa', ayuda: 'Cómo fue la conversación técnica y qué decidimos.' },
  { id: 'logistica', label: 'Logística general', ayuda: 'Viaje, alojamiento, comida, traslados.' },
  { id: 'camarin', label: 'Camarín y base de preparación', ayuda: 'Dónde nos preparamos y cómo lo resolvimos.' },
  { id: 'articulacion', label: 'Articulación interna', ayuda: 'Qué comisión se ocupó de qué.' },
  { id: 'planOperativo', label: 'Plan operativo final', ayuda: 'El paso a paso del día. Usá 1. 2. 3.' },
] as const;

export const RELATO_CIERRE = [
  { id: 'desarrolloReal', label: 'Desarrollo real de la fecha', ayuda: '¿Qué pasó finalmente?' },
  { id: 'resultadoTecnico', label: 'Técnica y sonido: resultado real', ayuda: '¿Cómo salió lo técnico comparado con lo acordado?' },
  { id: 'aprendizajes', label: 'Aprendizajes para próximas fechas', ayuda: 'Lo que nos llevamos para la próxima.' },
  { id: 'criterios', label: 'Criterios que quedan como antecedente', ayuda: 'Qué decisión de esta fecha sirve como regla para otras parecidas.' },
] as const;

export type RelatoId = (typeof RELATO_PREVIO)[number]['id'] | (typeof RELATO_CIERRE)[number]['id'];

export const BALANCES_ITEM = [
  'Cumplido',
  'Según lo previsto',
  'Mejoró lo acordado',
  'Desvío asumible',
  'Riesgo materializado',
  'No cumplido',
] as const;

/** Ítem propio de planificado vs. real (no sale del checklist) */
export interface ItemComparado {
  id: string;
  tema: string;
  planificado: string;
  real: string;
  balance?: string;
}

export const PREGUNTAS_CIERRE = [
  { id: 'funciono', label: '¿Qué funcionó?' },
  { id: 'noFunciono', label: '¿Qué no funcionó?' },
  { id: 'problemas', label: '¿Qué problemas aparecieron?' },
  { id: 'riesgosPrevistos', label: '¿Qué riesgos habíamos previsto?' },
  { id: 'inesperado', label: '¿Qué apareció inesperadamente?' },
  { id: 'volveriamos', label: '¿Qué volveríamos a hacer?' },
  { id: 'cambiariamos', label: '¿Qué cambiaríamos?' },
  { id: 'relacion', label: '¿Cómo fue la relación con la producción / el espacio?' },
  { id: 'publico', label: '¿Cómo fue la respuesta del público?' },
  { id: 'balanceTexto', label: '¿Balance general?' },
] as const;
export type PreguntaCierreId = (typeof PREGUNTAS_CIERRE)[number]['id'];

export interface Cierre {
  /** lo que pasó realmente, por id de pregunta comparable */
  real: Record<string, string>;
  /** balance de cada ítem comparable (Cumplido, Desvío asumible…) */
  balanceItem: Record<string, string>;
  /** ítems propios de planificado vs. real */
  itemsExtra: ItemComparado[];
  /** qué pasó con los riesgos que salen solos del checklist */
  resultadoRiesgo: Record<string, string>;
  respuestas: Partial<Record<PreguntaCierreId, string>>;
  balance?: Balance;
  cerradaEn?: ISODateTime;
}

export interface Fecha {
  id: string;
  nombre: string;
  fecha: ISODate;
  lugar: string;
  direccion?: string;
  /** nombre completo del evento, si es distinto del nombre corto */
  evento?: string;
  /** formato de la presentación */
  formato?: string;
  tipo: string;
  responsable: string;
  contacto?: string;
  /** de qué se trata la idea / cómo llegó (sobre todo para fechas en estado Idea) */
  nota?: string;
  /** etiqueta para WhatsApp: #CÓRDOBA */
  etiqueta?: string;
  estado: EstadoFecha;
  creada: ISODateTime;
  actualizada: ISODateTime;

  respuestas: Record<string, Respuesta>;
  pendientes: Pendiente[];
  movimientos: Movimiento[];
  updates: Update[];
  riesgos: Riesgo[];
  relato: Partial<Record<RelatoId, string>>;
  /** links de Drive y otros: fotos, prensa, rider… */
  links: Link[];
  /** mensaje de WhatsApp para el grupo (si no existe, se sugiere desde el checklist) */
  integrador?: Integrador;
  /** encuesta a la murga para saber si vamos */
  quorum?: Quorum;
  /** cuándo se mandó el último update al grupo (para marcar lo nuevo) */
  ultimoReporte?: ISODateTime;
  /** borrador del update al grupo, si se editó a mano */
  reporteBorrador?: string;
  cierre: Cierre;
  /** versión de la fecha demo (para actualizarla sola) */
  demo?: number;
}

/** Datos que se piden al crear una fecha */
export type NuevaFechaInput = Pick<
  Fecha,
  'nombre' | 'fecha' | 'lugar' | 'responsable' | 'contacto' | 'tipo' | 'nota'
> & {
  /** 'idea': se anota para más adelante, sin arrancar a producir */
  estado?: 'idea' | 'produccion';
};

/* ---------- links (por fecha y documentación general) ---------- */

export interface Link {
  id: string;
  titulo: string;
  url: string;
  categoria: string;
  nota?: string;
}

export interface CategoriaLink {
  id: string;
  label: string;
  ayuda: string;
}

/** Links de una fecha */
export const CATEGORIAS_LINK_FECHA: CategoriaLink[] = [
  { id: 'fotos', label: 'Fotos y video de la fecha', ayuda: 'El Drive donde subimos el registro.' },
  { id: 'prensa_recibida', label: 'Prensa que nos pasaron', ayuda: 'Notas, entrevistas, posteos de otras cuentas.' },
  { id: 'prensa_propia', label: 'Nuestra prensa: dónde la alojamos', ayuda: 'Carpeta de Drive con gacetilla, flyer, textos y fotos de prensa propios.' },
  { id: 'tecnica', label: 'Rider y técnica', ayuda: 'El rider que mandamos, planos de escenario, fichas técnicas.' },
  { id: 'produccion', label: 'Producción y logística', ayuda: 'Planillas, contratos, cronogramas, mapas.' },
  { id: 'otros', label: 'Otros', ayuda: '' },
];

/** Documentación y accesos generales de la murga (no de una fecha) */
export const CATEGORIAS_DOCUMENTOS: CategoriaLink[] = [
  { id: 'tecnica', label: 'Riders y técnica', ayuda: 'Rider de sonido, plano de escenario, input list.' },
  { id: 'drive', label: 'Drives y carpetas', ayuda: 'Fotos, videos, archivo, prensa.' },
  { id: 'prensa', label: 'Prensa y difusión', ayuda: 'Gacetillas, kit de prensa, logos, flyers base.' },
  { id: 'accesos', label: 'Accesos y cuentas', ayuda: 'Dónde están las cosas y quién tiene acceso. No guardes contraseñas acá.' },
  { id: 'produccion', label: 'Producción', ayuda: 'Planillas, modelos de contrato, presupuestos.' },
  { id: 'otros', label: 'Otros', ayuda: '' },
];
