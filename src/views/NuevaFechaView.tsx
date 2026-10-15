import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { href, ir } from '../router';
import { TIPOS_FECHA, type NuevaFechaInput } from '../model/types';
import { Campo, Icon, Input, Select, TextArea } from '../components/ui';

const VACIO: NuevaFechaInput = {
  nombre: '',
  fecha: '',
  lugar: '',
  responsable: '',
  contacto: '',
  tipo: TIPOS_FECHA[0],
  nota: '',
};

export function NuevaFechaView({ idea: ideaInicial = false }: { idea?: boolean }) {
  const { crear } = useStore();
  const [datos, setDatos] = useState<NuevaFechaInput>(VACIO);
  const [esIdea, setEsIdea] = useState(ideaInicial);
  const [intentado, setIntentado] = useState(false);
  const set = (k: keyof NuevaFechaInput, v: string) => setDatos((d) => ({ ...d, [k]: v }));

  // una idea solo necesita nombre; para producir hace falta responsable
  const falta = !datos.nombre.trim() || (!esIdea && !datos.responsable.trim());

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (falta) return;
    const f = crear({ ...datos, estado: esIdea ? 'idea' : 'produccion' });
    ir({ nombre: 'fecha', id: f.id, seccion: esIdea ? 'resumen' : 'espacio' });
  }

  return (
    <div className="pantalla">
      <header className="barra">
        <a href={href({ nombre: 'home' })} className="barra__volver" aria-label="Volver al inicio">
          <Icon name="back" />
        </a>
        <span className="barra__titulo">{esIdea ? 'Nueva idea' : 'Nueva fecha'}</span>
      </header>
      <main className="contenedor contenedor--angosto">
        <h1 className="titular">
          <span className="titular__recorte">{esIdea ? '¿Qué se nos' : '¿Qué fecha'}</span>
          <br />
          <span className="titular__recorte titular__recorte--b">{esIdea ? 'ocurrió?' : 'producimos?'}</span>
        </h1>

        <div className="tipo-alta" role="radiogroup" aria-label="¿Es una idea o ya la producimos?">
          <button
            type="button"
            role="radio"
            aria-checked={esIdea}
            className={`tipo-alta__op ${esIdea ? 'is-on' : ''}`}
            onClick={() => setEsIdea(true)}
          >
            <strong>💡 Es una idea</strong>
            <span>Una invitación, un lugar, algo que nos gustaría hacer. La anotamos para no perderla.</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!esIdea}
            className={`tipo-alta__op ${!esIdea ? 'is-on' : ''}`}
            onClick={() => setEsIdea(false)}
          >
            <strong>🥁 Ya la producimos</strong>
            <span>Va en serio: arrancamos con el checklist y alguien queda responsable.</span>
          </button>
        </div>

        <p className="lead">
          {esIdea
            ? 'Con el nombre alcanza. Cuando decidamos ir, la pasamos a producción desde el Resumen.'
            : 'Arrancamos con lo básico. El resto lo vamos completando con el checklist.'}
        </p>

        <form className="form" onSubmit={onSubmit} noValidate>
          <Campo id="nf-nombre" label={esIdea ? '¿Cómo la llamamos?' : '¿Cómo se llama la fecha?'}>
            <Input
              id="nf-nombre"
              autoFocus
              placeholder={esIdea ? 'ej: Carnaval en Rosario' : 'ej: 39° Encuentro Plurinacional – Córdoba'}
              value={datos.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              aria-invalid={intentado && !datos.nombre.trim()}
            />
          </Campo>
          {esIdea && (
            <Campo id="nf-nota" label="¿De qué se trata?" hint="Cómo llegó, qué nos entusiasma, qué habría que averiguar.">
              <TextArea
                id="nf-nota"
                rows={4}
                placeholder="ej: Nos escribió la organización del corso. Pagan traslado. Habría que ver si hay escenario."
                value={datos.nota ?? ''}
                onChange={(e) => set('nota', e.target.value)}
              />
            </Campo>
          )}
          <div className="form__fila">
            <Campo id="nf-fecha" label="¿Cuándo?" hint="Si todavía no está, dejalo vacío.">
              <Input id="nf-fecha" type="date" value={datos.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </Campo>
            <Campo id="nf-tipo" label="Tipo de fecha">
              <Select id="nf-tipo" value={datos.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS_FECHA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Campo>
          </div>
          <Campo id="nf-lugar" label="¿Dónde?">
            <Input id="nf-lugar" placeholder="ciudad o espacio" value={datos.lugar} onChange={(e) => set('lugar', e.target.value)} />
          </Campo>
          <Campo
            id="nf-resp"
            label={esIdea ? '¿Quién la trajo?' : '¿Quién queda responsable de esta fecha?'}
            hint={esIdea ? 'Opcional.' : undefined}
          >
            <Input
              id="nf-resp"
              placeholder={esIdea ? 'nombre' : 'nombre o comisión'}
              value={datos.responsable}
              onChange={(e) => set('responsable', e.target.value)}
              aria-invalid={intentado && !esIdea && !datos.responsable.trim()}
            />
          </Campo>
          <Campo id="nf-contacto" label="¿Con quién hablamos del otro lado?" hint="Contraparte / contacto de la producción o el espacio.">
            <Input id="nf-contacto" placeholder="nombre y teléfono" value={datos.contacto} onChange={(e) => set('contacto', e.target.value)} />
          </Campo>

          {intentado && falta && (
            <p className="aviso aviso--alerta" role="alert">
              <Icon name="alert" size={18} />{' '}
              {esIdea ? 'Ponele un nombre a la idea.' : 'Nos falta al menos el nombre de la fecha y quién la produce.'}
            </p>
          )}

          <button type="submit" className="btn btn--mega btn--block">
            {esIdea ? 'Guardar la idea' : 'Empezar a producir'} <Icon name="arrow" />
          </button>
        </form>
      </main>
    </div>
  );
}
