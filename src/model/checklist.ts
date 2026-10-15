import type { Respuesta, SeccionChecklistId, SeccionId } from './types';

/**
 * CHECKLIST GUIADO
 * Definición declarativa de todas las preguntas. Para agregar, sacar o
 * reformular preguntas alcanza con editar este archivo.
 *
 * tipo:
 *  - 'sino'   → Sí / No / A confirmar / No aplica (+ detalle opcional)
 *  - 'dato'   → un valor corto (texto, número u horario)
 *  - 'texto'  → texto largo
 *  - 'opcion' → elegir una opción de una lista
 *  'dato', 'texto' y 'opcion' también aceptan "A confirmar" y "No aplica".
 */

export type TipoPregunta = 'sino' | 'dato' | 'texto' | 'opcion' | 'varios';

export interface Pregunta {
  id: string;
  label: string;
  tipo: TipoPregunta;
  input?: 'text' | 'number' | 'time';
  placeholder?: string;
  opciones?: string[];
  /** para 'varios': la opción que significa "nada de lo anterior" */
  ninguna?: string;
  ayuda?: string;
  /** distinguir IDEAL / MÍNIMO NECESARIO / ACORDADO */
  triple?: boolean;
  /** aparece en el cierre como "planificado vs. real" con este nombre */
  comparable?: string;
  /** si queda sin responder aparece en "Antes de cerrar la fecha nos falta..." */
  critica?: boolean;
  /** se muestra solo si la condición se cumple */
  visibleSi?: (r: Record<string, Respuesta>) => boolean;
  /** preguntas que se despliegan si la respuesta es NO (advertencia no bloqueante) */
  alNo?: { aviso: string; preguntas: Pregunta[] };
}

export interface SeccionChecklist {
  id: SeccionChecklistId;
  titulo: string;
  bajada: string;
  preguntas: Pregunta[];
}

const sino = (id: string, label: string, extra: Partial<Pregunta> = {}): Pregunta => ({
  id,
  label,
  tipo: 'sino',
  ...extra,
});
const dato = (id: string, label: string, extra: Partial<Pregunta> = {}): Pregunta => ({
  id,
  label,
  tipo: 'dato',
  input: 'text',
  ...extra,
});
const texto = (id: string, label: string, extra: Partial<Pregunta> = {}): Pregunta => ({
  id,
  label,
  tipo: 'texto',
  ...extra,
});

/** elegir varias opciones (se guarda como "Luz, Espejos") */
const varios = (id: string, label: string, opciones: string[], extra: Partial<Pregunta> = {}): Pregunta => ({
  id,
  label,
  tipo: 'varios',
  opciones,
  ...extra,
});

/** Lo que tiene que tener un camarín (o el lugar donde nos cambiamos) para estar bien */
export const CAMARIN_IDEAL = ['Luz', 'Espejos', 'Mesa', 'Sillas'];
const AYUDA_CAMARIN = 'Lo ideal: buena luz, espejos, mesa y sillas. Marcá lo que hay; lo que falta lo llevamos o lo pedimos.';

export const CHECKLIST: SeccionChecklist[] = [
  {
    id: 'espacio',
    titulo: 'Espacio',
    bajada: 'Dónde tocamos, dónde nos cambiamos y qué hay en el lugar.',
    preguntas: [
      dato('esp_direccion', '¿Cuál es la dirección exacta?', { critica: true }),
      dato('esp_capacidad', '¿Qué capacidad tiene el lugar?', { input: 'number', placeholder: 'personas' }),
      dato('esp_escenario_dim', '¿Qué dimensiones tiene el escenario?', { placeholder: 'ej: 8 x 5 m' }),
      {
        id: 'esp_escenario_tipo',
        label: '¿El escenario es elevado o tocamos al piso?',
        tipo: 'opcion',
        opciones: ['Elevado', 'Al piso', 'Mixto'],
      },
      sino('esp_camarin', '¿Hay camarín? ¿Dónde nos cambiamos?', {
        critica: true,
        alNo: {
          aviso: 'Fecha sin camarín. Pensemos dónde nos cambiamos y dónde quedan las cosas.',
          preguntas: [
            dato('esp_cambio_alt', '¿Dónde nos cambiamos entonces?'),
            sino('esp_cambio_seguro', '¿Es un lugar seguro y cuidado para cambiarnos?'),
            varios('esp_cambio_tiene', '¿Qué tiene ese lugar?', CAMARIN_IDEAL, { ayuda: AYUDA_CAMARIN, ninguna: 'Nada de esto' }),
          ],
        },
      }),
      varios('esp_camarin_tiene', '¿Qué tiene el camarín?', CAMARIN_IDEAL, {
        ayuda: AYUDA_CAMARIN,
        ninguna: 'Nada de esto',
        visibleSi: (r) => r.esp_camarin?.estado !== 'no',
      }),
      dato('esp_camarines_cant', '¿Cuántos camarines hay?', {
        input: 'number',
        visibleSi: (r) => r.esp_camarin?.estado !== 'no',
      }),
      sino('esp_banos', '¿Hay baños para nosotres?'),
      dato('esp_acceso', '¿Cómo es el acceso?', { placeholder: 'carga y descarga, escaleras, rampa…' }),
      dato('esp_ingreso', '¿A qué hora podemos ingresar?', { input: 'time', comparable: 'Horario de ingreso' }),
      dato('esp_show', '¿A qué hora tocamos?', { input: 'time', comparable: 'Horario de show', critica: true }),
      dato('esp_duracion', '¿Cuánto tiempo tenemos?', { placeholder: 'ej: 40 minutos', comparable: 'Duración disponible' }),
      sino('esp_guardar_vestuario', '¿Hay lugar para guardar vestuario?'),
      sino('esp_guardar_instrumentos', '¿Hay lugar seguro para los instrumentos?'),
      sino('esp_agua', '¿Hay agua para la murga?'),
      texto('esp_restricciones', '¿Hay restricciones particulares?', {
        placeholder: 'horario de ruido, volumen, papelitos, accesos…',
      }),
    ],
  },
  {
    id: 'tecnica',
    titulo: 'Técnica',
    bajada: 'Sonido, luces y quién está del otro lado de la consola.',
    preguntas: [
      sino('tec_rider_enviado', '¿Ya mandamos el rider?', { critica: true }),
      sino('tec_rider_ok', '¿Recibieron y confirmaron el rider?', { critica: true }),
      sino('tec_prueba', '¿Hay prueba de sonido?', {
        critica: true,
        comparable: 'Prueba de sonido',
        alNo: {
          aviso: 'Fecha sin prueba de sonido. Revisemos algunas cosas antes de avanzar.',
          preguntas: [
            sino('tec_np_mics', '¿Cantidad de micrófonos confirmada?'),
            sino('tec_np_monitoreo', '¿Monitoreo confirmado?'),
            dato('tec_np_operador', '¿Quién opera sonido?'),
            sino('tec_np_armado', '¿Está confirmado el horario de armado?'),
            sino('tec_np_aceptamos', '¿Aceptamos tocar en estas condiciones?', {
              ayuda: 'La decisión es de la murga. Si es que sí, queda registrado como riesgo asumido en la bitácora.',
            }),
          ],
        },
      }),
      dato('tec_prueba_hora', '¿A qué hora es la prueba?', {
        input: 'time',
        comparable: 'Horario de prueba',
        visibleSi: (r) => r.tec_prueba?.estado !== 'no' && r.tec_prueba?.estado !== 'na',
      }),
      dato('tec_mics', '¿Cuántos micrófonos?', { input: 'number', triple: true, comparable: 'Micrófonos', critica: true }),
      dato('tec_mics_tipo', '¿Qué tipo de micrófonos?', { placeholder: 'inalámbricos, SM58, vincha…' }),
      dato('tec_monitores', '¿Cuántos monitores?', { input: 'number', triple: true, comparable: 'Monitores' }),
      dato('tec_mezclas', '¿Cuántas mezclas de monitoreo?', { input: 'number', triple: true }),
      dato('tec_percu', '¿Cómo se microfonea la percusión?', { triple: true, placeholder: 'bombo, platillo, redoblante…' }),
      dato('tec_consola', '¿Qué consola hay?'),
      dato('tec_operador_sonido', '¿Quién opera sonido?', { comparable: 'Operador/a de sonido' }),
      sino('tec_luces', '¿Hay luces?'),
      dato('tec_operador_luces', '¿Quién opera luces?', { visibleSi: (r) => r.tec_luces?.estado !== 'no' }),
      dato('tec_contacto', 'Contacto técnico', { placeholder: 'nombre y teléfono' }),
      texto('tec_limitaciones', '¿Hay limitaciones técnicas?'),
    ],
  },
  {
    id: 'logistica',
    titulo: 'Logística',
    bajada: 'Cómo llegamos, cómo volvemos y qué comemos.',
    preguntas: [
      {
        id: 'log_traslado',
        label: '¿Cómo viajamos?',
        tipo: 'opcion',
        opciones: ['Colectivo contratado', 'Transporte público', 'Autos', 'Avión', 'A pie', 'Cada una por su cuenta', 'Otro'],
        comparable: 'Traslado',
        critica: true,
      },
      dato('log_personas', '¿Cuántas personas viajan?', { input: 'number', comparable: 'Personas que viajan' }),
      dato('log_salida_punto', '¿Desde dónde salimos?'),
      dato('log_salida_hora', '¿A qué hora salimos?', { input: 'time', comparable: 'Horario de salida' }),
      dato('log_regreso', '¿Cómo y cuándo volvemos?', { comparable: 'Regreso' }),
      sino('log_alojamiento', '¿Hay alojamiento?'),
      dato('log_base', '¿Dónde es la base / camarín?', { comparable: 'Base / camarín' }),
      sino('log_comida', '¿Está resuelta la comida?'),
      sino('log_agua', '¿Está resuelta el agua?'),
      sino('log_estacionamiento', '¿Hay estacionamiento?'),
      dato('log_vestuario', '¿Quién traslada el vestuario?'),
      dato('log_instrumentos', '¿Quién traslada los instrumentos?'),
      dato('log_encuentro', '¿Cuál es el punto de encuentro?'),
      texto('log_horarios', 'Horarios importantes', { placeholder: '18:00 encuentro · 19:00 salida · …' }),
    ],
  },
  {
    id: 'artistico',
    titulo: 'Artístico',
    bajada: 'Qué hacemos arriba del escenario (o en la calle).',
    preguntas: [
      texto('art_repertorio', '¿Qué repertorio hacemos?', { critica: true }),
      texto('art_orden', '¿En qué orden van las canciones?'),
      dato('art_duracion', '¿Cuánto dura lo que hacemos?', { placeholder: 'ej: 35 minutos', comparable: 'Duración del show' }),
      dato('art_artistas', '¿Cuántas artistas suben?', { input: 'number', comparable: 'Artistas en escena' }),
      texto('art_instrumentos', '¿Qué instrumentos van?'),
      texto('art_especiales', '¿Hay intervenciones especiales?'),
      dato('art_responsable', '¿Quién coordina lo artístico en esta fecha?', {
        ayuda:
          'La persona o comisión que define qué hacemos y en qué orden, y que el día de la fecha resuelve lo artístico si hay cambios (cortar una canción, mover el orden). Ej: Comi Arti, o quien dirige ese día. Si lo decide toda la murga, poné “la murga”.',
        placeholder: 'ej: Comi Arti',
      }),
    ],
  },
  {
    id: 'vestuario',
    titulo: 'Vestuario / Maquillaje',
    bajada: 'Con qué salimos y dónde nos pintamos.',
    preguntas: [
      texto('ves_propuesta', '¿Cuál es la propuesta de vestuario?'),
      sino('ves_confirmado', '¿Está confirmado el vestuario?', { critica: true }),
      dato('ves_accesorios', 'Gorros y accesorios'),
      texto('ves_maquillaje', '¿Qué maquillaje hacemos?'),
      dato('ves_lugar', '¿Dónde nos preparamos?'),
      dato('ves_horario', '¿A qué hora arrancamos a prepararnos?', { input: 'time', comparable: 'Horario de preparación' }),
      texto('ves_necesidades', '¿Hay necesidades particulares?'),
    ],
  },
  {
    id: 'difusion',
    titulo: 'Difusión',
    bajada: 'Que se enteren. Que vengan.',
    preguntas: [
      sino('dif_flyer', '¿Está el flyer?'),
      sino('dif_publicacion', '¿Salió la publicación?'),
      sino('dif_colab', '¿Hicimos colaboración con el espacio u otras cuentas?'),
      dato('dif_link', 'Link de entradas', { placeholder: 'https://…' }),
      dato('dif_precio', 'Precio de la entrada'),
      sino('dif_prensa', '¿Hay prensa?'),
      sino('dif_historias', '¿Subimos historias?'),
      sino('dif_audiovisual', '¿Hay material audiovisual?'),
      sino('dif_registro', '¿Hay registro de foto / video?', { comparable: 'Registro de foto / video' }),
    ],
  },
];

export const SECCIONES_NAV: { id: SeccionId; label: string; corto: string }[] = [
  { id: 'resumen', label: 'Resumen', corto: 'Resumen' },
  { id: 'pendientes', label: 'Pendientes', corto: 'Pendientes' },
  { id: 'espacio', label: 'Espacio', corto: 'Espacio' },
  { id: 'tecnica', label: 'Técnica', corto: 'Técnica' },
  { id: 'logistica', label: 'Logística', corto: 'Logística' },
  { id: 'artistico', label: 'Artístico', corto: 'Artístico' },
  { id: 'vestuario', label: 'Vestuario / Maquillaje', corto: 'Vestuario' },
  { id: 'economia', label: 'Economía', corto: 'Economía' },
  { id: 'difusion', label: 'Difusión', corto: 'Difusión' },
  { id: 'links', label: 'Links', corto: 'Links' },
  { id: 'integrador', label: 'Integrador', corto: 'Integrador' },
  { id: 'updates', label: 'Updates', corto: 'Updates' },
  { id: 'cierre', label: 'Retirada', corto: 'Retirada' },
];

export const seccionLabel = (id: SeccionId): string =>
  SECCIONES_NAV.find((s) => s.id === id)?.label ?? id;

export const getSeccion = (id: SeccionId): SeccionChecklist | undefined =>
  CHECKLIST.find((s) => s.id === id);

export interface PreguntaUbicada {
  pregunta: Pregunta;
  seccion: SeccionChecklistId;
  /** si es una pregunta desplegada por un NO */
  padre?: Pregunta;
}

/** Todas las preguntas (incluidas las de seguimiento) con su sección */
export const TODAS_LAS_PREGUNTAS: PreguntaUbicada[] = CHECKLIST.flatMap((s) =>
  s.preguntas.flatMap((p) => [
    { pregunta: p, seccion: s.id },
    ...(p.alNo?.preguntas ?? []).map((sub) => ({ pregunta: sub, seccion: s.id, padre: p })),
  ]),
);

export const PREGUNTAS_POR_ID: Record<string, PreguntaUbicada> = Object.fromEntries(
  TODAS_LAS_PREGUNTAS.map((u) => [u.pregunta.id, u]),
);

export const COMPARABLES = TODAS_LAS_PREGUNTAS.filter((u) => u.pregunta.comparable);
