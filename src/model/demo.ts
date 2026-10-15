import type { Fecha, Respuesta } from './types';
import { TODAS_LAS_PREGUNTAS } from './checklist';
import { esVisible, estaRespondida } from './logic';

/**
 * Fecha de ejemplo, ya cerrada: 39° Encuentro Plurinacional – Córdoba.
 * Cargada a partir de la bitácora real de cierre de Producción (octubre 2026).
 * Queda como registro y como modelo de cómo se completa una fecha.
 */
export const DEMO_ID = 'demo_encuentro_cordoba';
/** subir este número cuando cambie la demo: se actualiza sola en los navegadores */
export const DEMO_VERSION = 4;

export function fechaDemo(): Fecha {
  const f = fechaDemoBase();
  return { ...f, respuestas: completarConNoAplica(f.respuestas) };
}

/** Lo que no se registró en la bitácora de Córdoba queda como "No aplica", así la fecha queda al 100%. */
export function completarConNoAplica(r: Record<string, Respuesta>): Record<string, Respuesta> {
  const out = { ...r };
  for (const u of TODAS_LAS_PREGUNTAS) {
    if (!esVisible(u, out)) continue;
    const actual = out[u.pregunta.id];
    if (!estaRespondida(u.pregunta, actual)) out[u.pregunta.id] = { ...actual, estado: 'na' };
  }
  return out;
}

function fechaDemoBase(): Fecha {
  const d = (dia: number, h: string) => `2026-10-${String(dia).padStart(2, '0')}T${h}:00-03:00`;
  return {
    id: DEMO_ID,
    demo: DEMO_VERSION,
    nombre: '39° Encuentro Plurinacional – Córdoba',
    evento:
      '39° Encuentro Plurinacional de Mujeres, Lesbianas, Travestis, Trans, Bisexuales, Intersex y No Binaries',
    formato: 'Presentación de un recorte del espectáculo, en el marco de la programación cultural del Encuentro.',
    fecha: '2026-10-11',
    lugar: 'Córdoba Capital',
    direccion: 'Escenario Peña / Arenales, zona Parque Sarmiento',
    tipo: 'Encuentro',
    responsable: 'Anto, Clari, Ine, Marian y Cou',
    etiqueta: 'CÓRDOBA',
    estado: 'cerrada',
    creada: d(1, '10:00'),
    actualizada: d(13, '18:00'),

    respuestas: {
      esp_direccion: { valor: 'Escenario Peña / Arenales, zona Parque Sarmiento' },
      esp_escenario_dim: { valor: '12 x 10 m aprox.' },
      esp_escenario_tipo: { valor: 'Elevado' },
      esp_camarin: {
        estado: 'si',
        detalle: 'Camarín oficial N.º 2, con ventana de uso acotada (23:10 a 23:55). Insuficiente para todo el grupo: se complementó con el colectivo.',
      },
      esp_show: { valor: '23:30', notas: 'Horario estimado, sujeto a la dinámica del Encuentro.' },
      esp_guardar_vestuario: { estado: 'si', detalle: 'En el colectivo.' },
      esp_guardar_instrumentos: { estado: 'si', detalle: 'En el colectivo.' },
      esp_restricciones: {
        valor: 'La programación del escenario comenzaba luego de la marcha y podía sufrir desplazamientos.',
      },

      tec_prueba: { estado: 'no', detalle: 'No habría prueba de sonido para los proyectos participantes.' },
      tec_np_mics: { estado: 'si', detalle: '7 micrófonos como condición mínima negociada.' },
      tec_np_monitoreo: { estado: 'na', detalle: 'Sujeto a la definición operativa del momento.' },
      tec_np_operador: { valor: 'Técnica del escenario del Encuentro' },
      tec_np_armado: {
        estado: 'na',
        detalle: 'Escenario de programación continua: distribución de micrófonos e ingreso definidos en el momento.',
      },
      tec_np_aceptamos: {
        estado: 'si',
        detalle: 'Se decide avanzar con la fecha asumiendo conscientemente el riesgo técnico.',
      },
      tec_mics: { minimo: '7', acordado: '7' },
      tec_limitaciones: { valor: 'Sin prueba de sonido: principal riesgo en sonido y monitoreo.' },

      log_traslado: { valor: 'Colectivo contratado' },
      log_salida_punto: { valor: 'CABA' },
      log_regreso: { valor: 'En el colectivo contratado, Córdoba–CABA, después del show' },
      log_alojamiento: { estado: 'si', detalle: 'Escuela Esteban Echeverría, Córdoba Capital.' },
      log_base: { valor: 'Colectivo estacionado en Parque Sarmiento' },
      log_comida: {
        estado: 'si',
        detalle: 'Comida posterior al show gestionada por Producción y pagada con fondos de la murga.',
      },
      log_vestuario: { valor: 'Viajó y quedó en el colectivo. Gorros identificados con nombre.' },
      log_encuentro: { valor: 'Colectivo en Parque Sarmiento, 21:00' },
      log_horarios: { valor: '21:00 concentración general en el colectivo · maquillaje, vestuario e instrumentos · presentación' },

      art_responsable: { valor: 'Comi Arti' },

      ves_confirmado: { estado: 'si' },
      ves_accesorios: { valor: 'Gorros identificados con nombre' },
      ves_maquillaje: { valor: 'Formato simple y práctico, articulado con Comi Maqui y Comisión Encuentro.' },
      ves_lugar: { valor: 'Maquillaje en el entorno del colectivo; cambio de vestuario dentro del colectivo' },
      ves_horario: { valor: '21:00' },
    },

    relato: {
      contexto: `La participación en Córdoba fue pensada como una fecha artística dentro de una experiencia colectiva más amplia. El objetivo de Producción fue hacer posible la presentación sin perder de vista que el viaje incluía también la participación en el Encuentro: talleres, actividades, calle, marcha, convivencia y circulación por la ciudad.

Por tratarse de un evento de gran escala, con múltiples proyectos y programación condicionada por el desarrollo general del Encuentro, desde el inicio se trabajó sobre una lógica de adaptación: identificar las condiciones mínimas necesarias para tocar, explicitar los riesgos y construir una logística propia para aquello que sí podía resolverse desde Baila La Chola.`,
      condiciones: `- La programación del escenario comenzaba luego de la marcha y podía sufrir desplazamientos.
- No habría prueba de sonido para los proyectos participantes.
- El escenario informado era de aproximadamente 12 x 10 m.
- Se había informado un camarín oficial N.º 2 con una ventana de uso acotada (23:10 a 23:55).
- Ante la imposibilidad de contar con una prueba previa, el principal riesgo identificado fue técnico, especialmente en sonido y monitoreo.
- La condición mínima negociada para voces fue contar con 7 micrófonos.`,
      gestionTecnica: `La conversación técnica se concentró en asegurar una cantidad de micrófonos que permitiera sostener la presentación y en comprender de antemano las limitaciones de salir a escena sin prueba de sonido. La decisión fue avanzar con la fecha asumiendo conscientemente ese riesgo.

La distribución concreta de los micrófonos y la modalidad de ingreso al escenario quedaron sujetas a la definición operativa del momento, por tratarse de un escenario de programación continua.`,
      logistica: `- El traslado CABA–Córdoba–CABA se realizó en colectivo contratado.
- El alojamiento del grupo fue en la Escuela Esteban Echeverría, en Córdoba Capital.
- Para el domingo se definió cargar en el colectivo los elementos personales y dejar organizada también la logística del regreso.
- Se decidió trasladar el colectivo a Parque Sarmiento y utilizarlo como base operativa cercana al escenario.
- La propuesta permitió que, una vez ubicado el colectivo, cada integrante pudiera organizar su jornada (talleres, actividades del Encuentro, marcha u otras necesidades) y reencontrarse con el grupo a las 21:00.
- Cada integrante gestionó su comida y lo necesario para el viaje de regreso.

Alimentación. Si bien inicialmente se había planteado que cada Choli gestionara su comida, finalmente parte del equipo de Producción tomó la gestión y logró resolver una opción de comida para el grupo. El costo fue asumido por la murga como parte del saldo de la fecha, pero la búsqueda, coordinación y organización se incorporaron a las tareas de Producción. La resolución funcionó bien y fue valorada y agradecida por la murga, por lo que queda también como una experiencia positiva de la fecha.`,
      camarin: `El camarín oficial disponible tenía una ventana demasiado acotada para resolver maquillaje, vestuario y preparación de todo el grupo. Por eso se diseñó una alternativa propia: convertir el colectivo en base de producción y camarín principal.
- Vestuarios y gorros viajaron en el colectivo y se mantuvieron allí.
- Cada integrante llevó su gorro identificado con nombre.
- El cambio de vestuario se realizó dentro del colectivo.
- El maquillaje se planteó en formato simple y práctico, articulado con Comi Maqui y Comisión Encuentro.
- La organización se pensó para poder maquillar en el entorno inmediato del colectivo y cambiarse dentro.`,
      articulacion: `La producción de la fecha se articuló con las comisiones que tenían incidencia directa en la presentación. No se asignaron coordinaciones individuales por área para esta fecha: la lógica fue sostener acuerdos comunes y responsabilidades compartidas.
- Comi Arti: definición del recorte del espectáculo y orden de canciones.
- Comi Maqui: organización de la propuesta de maquillaje.
- Comisión Encuentro: articulación de la experiencia general del viaje y participación en el Encuentro.
- Producción: condiciones de escenario, técnica, colectivo, horarios y plan operativo de presentación.`,
      planOperativo: `1. Carga del colectivo en la escuela y traslado a Parque Sarmiento.
2. Colectivo estacionado como punto de referencia y base de preparación.
3. Jornada libre para que cada integrante participara de las actividades que necesitara o quisiera realizar.
4. Concentración general a las 21:00 en el colectivo.
5. Desde ese momento: maquillaje, vestuario, instrumentos y preparación para la presentación.
6. El plan se comunicó como una estructura de referencia, sabiendo que el Encuentro podía producir modificaciones de horario.`,
      desarrolloReal: `La logística principal pudo ejecutarse como había sido diseñada. El colectivo pudo quedar ubicado en el lugar previsto y funcionó efectivamente como base de preparación. El maquillaje comenzó en el horario acordado, lo que permitió sostener la organización previa al show.

La presentación se demoró aproximadamente 30 minutos respecto del horario previsto. El desplazamiento estuvo dentro de un contexto que ya se había considerado variable por la dinámica general del Encuentro.`,
      resultadoTecnico: `- No hubo prueba de sonido, tal como había sido informado y aceptado previamente.
- La condición mínima acordada era de 7 micrófonos.
- Finalmente se dispuso de 9 micrófonos: dos más que los acordados con producción.
- Los requisitos técnicos que habían sido acordados se cumplieron.
- Durante la presentación existieron pormenores de sonido. Desde Producción se los interpreta dentro del riesgo técnico previamente identificado al aceptar una presentación sin prueba de sonido.

Esto no implica naturalizar las dificultades técnicas: el aprendizaje es distinguir entre un problema inesperado y un riesgo conocido que se decide asumir por las características particulares de una fecha.`,
      aprendizajes: `- Registrar siempre por separado las condiciones mínimas, las condiciones ideales y los riesgos que el grupo decide aceptar.
- Cuando no exista prueba de sonido, asumir explícitamente que el resultado técnico tendrá un margen de incertidumbre mayor y evaluar si el contexto artístico justifica ese riesgo.
- En eventos masivos, construir una base operativa propia puede ser más importante que disponer formalmente de un camarín.
- Evitar sobrecargar el horario inmediatamente anterior al show: alimentación, descanso, maquillaje, vestuario e instrumentos necesitan márgenes reales.
- Mantener un punto de encuentro y un horario simples facilita la autonomía del grupo durante jornadas extensas.
- Cerrar la bitácora después de cada fecha permite comparar lo negociado con lo ocurrido y convertir la experiencia en criterio para futuras decisiones.`,
      criterios: `Esta fecha deja un antecedente útil para futuras invitaciones de características similares. No todas las condiciones deben evaluarse como bloqueantes: Producción puede decidir avanzar con una fecha aun cuando exista una limitación, siempre que el riesgo esté identificado, el grupo conozca las condiciones y exista una estrategia concreta para aquello que sí puede resolverse.

En este caso, la ausencia de prueba fue un riesgo aceptado; la cantidad mínima de micrófonos fue una condición negociada; y la logística de preparación fue resuelta internamente mediante el colectivo. Esa distinción permitió tomar decisiones con mayor claridad.`,
    },

    pendientes: [],

    links: [
      {
        id: 'link_cba_fotos',
        titulo: 'Fotos del Encuentro',
        url: 'https://drive.google.com/drive/folders/1K6ZJfMBe6D9Y_uAmS1ZwrTEtlciniiIq?usp=sharing',
        categoria: 'fotos',
      },
      {
        id: 'link_cba_rider',
        titulo: 'Rider de sonido',
        url: 'https://docs.google.com/document/d/12iJExLoF7lcMqNx8ltsgyUWpKG7so_Lx502vAiV14jQ/edit?tab=t.0',
        categoria: 'tecnica',
        nota: 'Mínimo negociado: 7 micrófonos para voces.',
      },
    ],

    movimientos: [
      {
        id: 'mov_demo_colectivo',
        fecha: '2026-10-09',
        concepto: 'Colectivo contratado CABA–Córdoba–CABA',
        categoria: 'Transporte',
        tipo: 'egreso',
        monto: 3_800,
        moneda: 'USD',
        estado: 'confirmado',
      },
      {
        id: 'mov_demo_pasajes',
        fecha: '2026-10-08',
        concepto: 'Cobro de pasajes',
        categoria: 'Transporte',
        tipo: 'ingreso',
        monto: 2_600_000,
        moneda: 'ARS',
        estado: 'confirmado',
      },
      {
        id: 'mov_demo_fondo',
        fecha: '2026-10-08',
        concepto: 'Disponible previamente en el fondo',
        categoria: 'Otros',
        tipo: 'ingreso',
        monto: 132_000,
        moneda: 'ARS',
        estado: 'confirmado',
      },
      {
        id: 'mov_demo_remeras',
        fecha: '2026-10-10',
        concepto: 'Venta de remeras',
        categoria: 'Merch',
        tipo: 'ingreso',
        monto: 140_000,
        moneda: 'ARS',
        estado: 'confirmado',
      },
      {
        id: 'mov_demo_devolucion',
        fecha: '2026-10-11',
        concepto: 'Devolución del pasaje de una veci que no regresó con la murga',
        categoria: 'Reintegros',
        tipo: 'egreso',
        monto: 55_000,
        moneda: 'ARS',
        estado: 'confirmado',
      },
      {
        id: 'mov_demo_hotel1',
        fecha: '2026-10-09',
        concepto: 'Primer hotel de los choferes',
        categoria: 'Alojamiento',
        tipo: 'egreso',
        monto: 110_000,
        moneda: 'ARS',
        estado: 'confirmado',
      },
      {
        id: 'mov_demo_clari',
        fecha: '2026-10-11',
        concepto: 'Transferencia a Clari',
        categoria: 'Otros',
        tipo: 'egreso',
        monto: 160_000,
        moneda: 'ARS',
        recibio: 'Clari',
        estado: 'confirmar_concepto',
        observaciones: 'Concepto pendiente de confirmar.',
      },
      {
        id: 'mov_demo_choferes2',
        fecha: '2026-10-11',
        concepto: 'Uber y segundo alojamiento de los choferes',
        categoria: 'Alojamiento',
        tipo: 'egreso',
        monto: 192_000,
        moneda: 'ARS',
        estado: 'confirmar_concepto',
        observaciones: 'Detalle pendiente de confirmar.',
      },
      {
        id: 'mov_demo_comida',
        fecha: '2026-10-11',
        concepto: 'Comida posterior al show',
        categoria: 'Comida',
        tipo: 'egreso',
        monto: 199_000,
        moneda: 'ARS',
        pago: 'Fondos de la murga',
        estado: 'confirmado',
        observaciones: 'Gestionada desde Producción.',
      },
    ],

    updates: [
      {
        id: 'upd_demo_1',
        cuando: d(3, '12:00'),
        momento: 'Previo al viaje',
        tema: 'Técnica',
        categoria: 'DECISIÓN',
        texto: 'Se confirma que no habrá prueba de sonido y se trabaja sobre condiciones mínimas para la presentación.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_2',
        cuando: d(4, '12:00'),
        momento: 'Previo al viaje',
        tema: 'Microfonía',
        categoria: 'DECISIÓN',
        texto: 'Se acuerda contar con 7 micrófonos como condición mínima.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_3',
        cuando: d(5, '12:00'),
        momento: 'Previo al viaje',
        tema: 'Camarín',
        categoria: 'CAMBIO',
        texto: 'Se identifica que la ventana de camarín oficial es insuficiente y se diseña el colectivo como base alternativa.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_4',
        cuando: d(10, '20:00'),
        momento: 'Previo al show',
        tema: 'Logística',
        categoria: 'DECISIÓN',
        texto: 'Se define trasladar y dejar el colectivo en Parque Sarmiento, cerca del escenario.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_5',
        cuando: d(11, '10:00'),
        momento: 'Domingo 11/10',
        tema: 'Operación',
        categoria: 'UPDATE',
        texto: 'Se carga el colectivo, queda como punto de encuentro y se fija concentración general a las 21:00.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_6',
        cuando: d(11, '21:00'),
        momento: 'Domingo 11/10',
        tema: 'Preparación',
        categoria: 'UPDATE',
        texto: 'El maquillaje puede comenzar en el horario acordado.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_7',
        cuando: d(11, '23:30'),
        momento: 'Domingo 11/10',
        tema: 'Programación',
        categoria: 'CAMBIO',
        texto: 'La presentación se demora aproximadamente 30 minutos.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_8',
        cuando: d(11, '23:50'),
        momento: 'Domingo 11/10',
        tema: 'Técnica',
        categoria: 'UPDATE',
        texto: 'Se presentan 9 micrófonos en total, dos más que los 7 acordados.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_9',
        cuando: d(12, '00:30'),
        momento: 'Domingo 11/10',
        tema: 'Show',
        categoria: 'UPDATE',
        texto: 'Se realiza la presentación sin prueba de sonido; aparecen pormenores técnicos compatibles con el riesgo previamente asumido.',
        autor: 'Producción',
      },
      {
        id: 'upd_demo_10',
        cuando: d(13, '18:00'),
        momento: 'Cierre',
        tema: 'Balance',
        categoria: 'RESUELTO',
        texto: 'Se considera cumplido lo acordado y positivo el resultado general de Producción.',
        autor: 'Producción',
      },
    ],

    riesgos: [
      {
        id: 'rsg_demo_mics',
        tipo: 'minima',
        descripcion: '7 micrófonos para voces como condición mínima negociada.',
        resultado: 'Se cumplió y se superó: hubo 9 micrófonos.',
      },
      {
        id: 'rsg_demo_horario',
        tipo: 'asumido',
        descripcion: 'Horario de presentación sujeto a la dinámica del Encuentro (programación después de la marcha).',
        resultado: 'Demora aproximada de 30 minutos, dentro de lo considerado variable.',
      },
      {
        id: 'rsg_demo_camarin',
        tipo: 'minima',
        descripcion: 'Contar con un lugar propio para maquillaje, vestuario y preparación de todo el grupo.',
        resultado: 'Resuelto internamente con el colectivo como base y camarín principal.',
      },
    ],

    cierre: {
      real: {
        tec_prueba: 'No hubo prueba',
        tec_mics: '9 disponibles',
        esp_show: 'Demora aproximada de 30 minutos',
      },
      balanceItem: {
        tec_prueba: 'Según lo previsto',
        tec_mics: 'Mejoró lo acordado',
        esp_show: 'Desvío asumible',
      },
      itemsExtra: [
        {
          id: 'item_demo_colectivo',
          tema: 'Colectivo cerca del escenario',
          planificado: 'Usarlo como base operativa y camarín',
          real: 'Se pudo dejar donde estaba previsto y funcionó como base',
          balance: 'Cumplido',
        },
        {
          id: 'item_demo_maqui',
          tema: 'Preparación / maquillaje',
          planificado: 'Comenzar según horario acordado',
          real: 'Se pudo maquillar a la hora prevista',
          balance: 'Cumplido',
        },
        {
          id: 'item_demo_camarin',
          tema: 'Camarín',
          planificado: 'Complementar el camarín oficial con el colectivo',
          real: 'El colectivo resolvió la preparación principal',
          balance: 'Cumplido',
        },
        {
          id: 'item_demo_sonido',
          tema: 'Sonido en show',
          planificado: 'Riesgo identificado por ausencia de prueba',
          real: 'Hubo pormenores técnicos durante la presentación',
          balance: 'Riesgo materializado',
        },
      ],
      resultadoRiesgo: {
        'auto:sin-prueba':
          'Hubo pormenores de sonido durante la presentación, compatibles con el riesgo previamente identificado.',
      },
      respuestas: {
        funciono: `- Diseñar una base logística propia en lugar de depender exclusivamente de la infraestructura del evento.
- Usar el colectivo como camarín permitió resolver una ventana de camarín oficial que era insuficiente para las necesidades del grupo.
- Definir un horario único de concentración permitió que la participación en el Encuentro y la preparación artística pudieran convivir.
- Identificar previamente la ausencia de prueba como riesgo evitó interpretar los problemas técnicos posteriores como una sorpresa de producción.
- La negociación de micrófonos aseguró el mínimo requerido y, en la ejecución, la disponibilidad terminó siendo superior a la acordada.
- La articulación entre Producción y las comisiones permitió distribuir decisiones sin crear coordinaciones adicionales para una fecha excepcional.`,
        problemas:
          'Pormenores de sonido durante la presentación, dentro del riesgo técnico asumido al tocar sin prueba.',
        riesgosPrevistos:
          'Riesgo técnico en sonido y monitoreo por la ausencia de prueba; horario sujeto a desplazamientos por la dinámica del Encuentro.',
        relacion:
          'Valoración positiva de la organización general del Encuentro, que permitió desarrollar la participación en un contexto de gran escala con una dinámica cuidada y ordenada. La organización cumplió con los requisitos acordados.',
        publico:
          'La respuesta del público, incluida su permanencia pese a la lluvia, y el intercambio vivido durante el fin de semana fueron parte central de la fecha.',
        balanceTexto: `El balance de Producción es positivo. La logística diseñada funcionó, el colectivo pudo utilizarse como estaba previsto, la preparación comenzó en horario y la organización del Encuentro cumplió con los requisitos acordados. Incluso se contó con dos micrófonos adicionales respecto del mínimo negociado.

La demora aproximada de media hora y los pormenores de sonido no modifican ese balance: el horario estaba sujeto a la dinámica del evento y las dificultades técnicas estaban dentro de los riesgos asumidos al aceptar una presentación sin prueba.

La experiencia excedió la presentación artística.`,
      },
      balance: 'positivo',
      cerradaEn: d(13, '18:00'),
    },
  };
}
