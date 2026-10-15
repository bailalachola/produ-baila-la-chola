import { href } from '../router';
import { ESTADO_LABEL, ESTADOS } from '../model/types';
import { EstadoSticker, Icon, TituloSeccion } from '../components/ui';

/**
 * INSTRUCTIVO: el proceso de producción de una fecha, tal como está mapeado en La Produ.
 * Para cambiar el texto, editá los arrays de abajo.
 */

interface Paso {
  momento: string;
  titulo: string;
  texto: string;
  /** dónde se hace en la app */
  donde: string[];
  tips?: string[];
}

const ETAPAS: { nombre: string; estado: (typeof ESTADOS)[number]; pasos: Paso[] }[] = [
  {
    nombre: 'Aparece la fecha',
    estado: 'idea',
    pasos: [
      {
        momento: 'Apenas llega la invitación',
        titulo: 'Cargamos la fecha',
        texto:
          'Aunque todavía no sepamos si vamos, la cargamos. Alcanza con el nombre, el lugar, quién la produce y con quién hablamos del otro lado. Lo demás se completa después.',
        donde: ['Inicio → Nueva fecha'],
        tips: ['Si todavía no está decidida, dejala en estado Idea.', 'Quien la carga queda como responsable de Producción.'],
      },
    ],
  },
  {
    nombre: 'Producimos',
    estado: 'produccion',
    pasos: [
      {
        momento: 'Primera charla con la contraparte',
        titulo: 'Recorremos el checklist',
        texto:
          'Espacio, Técnica y Logística tienen las preguntas que no nos pueden faltar: dónde nos cambiamos, si hay prueba de sonido, si mandamos el rider, cómo viajamos. Se responde con Sí, No, A confirmar o No aplica.',
        donde: ['Espacio', 'Técnica', 'Logística'],
        tips: [
          'Lo que no sabemos se marca “A confirmar”: así no se pierde.',
          'En técnica separamos lo Ideal, el Mínimo necesario y lo Acordado.',
          'El rider va en el bloque de links de Técnica.',
        ],
      },
      {
        momento: 'Cuando algo no está',
        titulo: 'Miramos los riesgos y decidimos',
        texto:
          'Si falta algo importante (por ejemplo, no hay prueba de sonido), la app avisa y despliega preguntas para pensarlo. No bloquea nada: la decisión es de la murga. Lo que decidimos queda registrado como condición mínima, riesgo asumido o problema inesperado.',
        donde: ['Checklist', 'Resumen → Riesgos y condiciones'],
        tips: ['La herramienta ayuda a evaluar; decide la murga.'],
      },
      {
        momento: 'En paralelo',
        titulo: 'Articulamos con las comisiones',
        texto:
          'Artístico (repertorio, orden, duración), Vestuario y Maquillaje, y Difusión tienen su sección. Cada pregunta puede tener responsable y fecha límite.',
        donde: ['Artístico', 'Vestuario / Maquillaje', 'Difusión'],
        tips: ['Comi Arti: recorte y orden de canciones.', 'Comi Maqui: propuesta de maquillaje y quién coordina.'],
      },
      {
        momento: 'Todo el tiempo',
        titulo: 'Seguimos los pendientes',
        texto:
          'Todo lo que quedó “A confirmar” aparece solo en Pendientes. También se pueden anotar a mano. Lo urgente, o lo que vence en dos días, va arriba.',
        donde: ['Pendientes'],
      },
      {
        momento: 'Cada vez que se decide algo',
        titulo: 'Lo dejamos por escrito',
        texto:
          'Decisiones, cambios y novedades van como Update, con tema y momento. Cada uno se copia listo para pegar en el grupo de WhatsApp.',
        donde: ['Updates'],
        tips: ['Si se decidió en el grupo, igual lo pasamos acá: es la memoria de la fecha.'],
      },
      {
        momento: 'Cuando hay plata en juego',
        titulo: 'Anotamos la economía',
        texto:
          'Ingresos y gastos, quién pagó y quién recibió. Pesos y dólares siempre por separado. Lo que falta reintegrar o confirmar queda marcado.',
        donde: ['Economía'],
      },
    ],
  },
  {
    nombre: 'Se confirma',
    estado: 'confirmada',
    pasos: [
      {
        momento: 'Cuando está todo acordado',
        titulo: 'Confirmamos la fecha',
        texto:
          'Pasamos el estado a Confirmada. En el Resumen, “Antes de cerrar la fecha nos falta…” muestra lo crítico que todavía no está.',
        donde: ['Resumen → Estado'],
      },
      {
        momento: 'Unos días antes',
        titulo: 'Mandamos el integrador',
        texto:
          'El mensaje para la murga con citación, agenda, camarines, sonido, vestuario, maquillaje, comida, recaudación, recordatorios y show. Se arma solo con lo del checklist; lo ajustamos y lo mandamos al grupo.',
        donde: ['Integrador', 'Resumen → Armar integrador'],
        tips: ['“Compartir” en el celu abre directo WhatsApp.', 'Pedimos que reaccionen para saber que lo leyeron.'],
      },
      {
        momento: 'Antes y durante',
        titulo: 'Juntamos los links',
        texto:
          'Rider, Drive de fotos, prensa que nos pasan y la carpeta donde guardamos nuestra prensa. Todo en un lugar.',
        donde: ['Links', 'Difusión'],
      },
    ],
  },
  {
    nombre: 'La hacemos',
    estado: 'realizada',
    pasos: [
      {
        momento: 'El día de la fecha',
        titulo: 'Registramos lo que pasa',
        texto:
          'Demoras, cambios, imprevistos: un Update rápido desde el celu. La app funciona aunque no haya señal y sube todo cuando vuelve.',
        donde: ['Updates'],
      },
      {
        momento: 'Después del show',
        titulo: 'Hacemos la Retirada',
        texto:
          'Pasamos la fecha a Realizada y completamos la Retirada: lo acordado contra lo que pasó realmente, qué funcionó, qué no, qué haríamos distinto, y el balance (positivo, mixto o negativo).',
        donde: ['Retirada'],
        tips: ['Mejor hacerla en la semana, cuando está fresco.', 'Revisá qué pasó con cada riesgo que habíamos asumido.'],
      },
    ],
  },
  {
    nombre: 'Cerramos',
    estado: 'cerrada',
    pasos: [
      {
        momento: 'Cuando está todo cargado',
        titulo: 'Cerramos y sacamos la Bitácora Chola',
        texto:
          'Cerramos la fecha y generamos la Bitácora en PDF. Queda como registro de decisiones, ejecución y aprendizajes para las próximas fechas.',
        donde: ['Retirada → Cerrar fecha', 'Bitácora'],
        tips: ['La de Córdoba es el ejemplo de cómo queda una fecha cerrada.'],
      },
    ],
  },
];

const PRINCIPIOS = [
  { t: 'Que no nos olvidemos de preguntar', d: 'El checklist pregunta lo que importa, fecha a fecha.' },
  { t: 'Lo que no sabemos, a confirmar', d: 'Nada queda en el aire: se vuelve pendiente.' },
  { t: 'Decide la murga', d: 'La herramienta avisa los riesgos, no decide por nosotras.' },
  { t: 'Todo por escrito', d: 'Las decisiones quedan registradas, no solo en el grupo.' },
  { t: 'Cerrar para aprender', d: 'Comparar lo acordado con lo que pasó es lo que nos hace mejores.' },
];

export function GuiaView() {
  let n = 0;
  return (
    <div className="pantalla">
      <header className="barra">
        <a href={href({ nombre: 'home' })} className="barra__volver" aria-label="Volver al inicio">
          <Icon name="back" />
        </a>
        <span className="barra__titulo">La Produ</span>
      </header>
      <main className="contenedor contenedor--angosto guia">
        <TituloSeccion bajada="El proceso de producción de una fecha, paso a paso, y dónde se hace cada cosa en La Produ.">
          Cómo producimos
        </TituloSeccion>

        <ol className="guia__ciclo" aria-label="Estados de una fecha">
          {ESTADOS.map((e, i) => (
            <li key={e}>
              <EstadoSticker estado={e} />
              {i < ESTADOS.length - 1 && <span className="guia__flecha" aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>

        {ETAPAS.map((etapa) => (
          <section key={etapa.nombre} className="guia__etapa" aria-label={etapa.nombre}>
            <h2 className="guia__etapa-titulo">
              <span>{etapa.nombre}</span>
              <span className="guia__estado">estado: {ESTADO_LABEL[etapa.estado]}</span>
            </h2>
            <ol className="guia__pasos">
              {etapa.pasos.map((p) => {
                n += 1;
                return (
                  <li key={p.titulo} className="guia__paso">
                    <span className="guia__num" aria-hidden="true">
                      {n}
                    </span>
                    <div className="guia__cuerpo">
                      <p className="guia__momento">{p.momento}</p>
                      <h3 className="guia__titulo">{p.titulo}</h3>
                      <p className="guia__texto">{p.texto}</p>
                      <p className="guia__donde">
                        {p.donde.map((d) => (
                          <span key={d} className="tag">
                            {d}
                          </span>
                        ))}
                      </p>
                      {p.tips && (
                        <ul className="guia__tips">
                          {p.tips.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        <section className="bloque">
          <h2 className="bloque__titulo">Lo que nos importa</h2>
          <ul className="guia__principios">
            {PRINCIPIOS.map((p) => (
              <li key={p.t}>
                <strong>{p.t}</strong>
                <span>{p.d}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="acciones-finales">
          <a className="btn btn--mega btn--block" href={href({ nombre: 'fecha', id: 'demo_encuentro_cordoba', seccion: 'resumen' })}>
            Ver Córdoba como ejemplo
          </a>
          <a className="btn btn--secundario" href={href({ nombre: 'nueva' })}>
            <Icon name="plus" /> Empezar una fecha nueva
          </a>
        </div>
      </main>
    </div>
  );
}
