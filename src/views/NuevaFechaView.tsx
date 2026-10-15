import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { href, ir } from '../router';
import { TIPOS_FECHA, type NuevaFechaInput } from '../model/types';
import { Campo, Icon, Input, Select } from '../components/ui';

const VACIO: NuevaFechaInput = {
  nombre: '',
  fecha: '',
  lugar: '',
  responsable: '',
  contacto: '',
  tipo: TIPOS_FECHA[0],
};

export function NuevaFechaView() {
  const { crear } = useStore();
  const [datos, setDatos] = useState<NuevaFechaInput>(VACIO);
  const [intentado, setIntentado] = useState(false);
  const set = (k: keyof NuevaFechaInput, v: string) => setDatos((d) => ({ ...d, [k]: v }));

  const falta = !datos.nombre.trim() || !datos.responsable.trim();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (falta) return;
    const f = crear(datos);
    ir({ nombre: 'fecha', id: f.id, seccion: 'espacio' });
  }

  return (
    <div className="pantalla">
      <header className="barra">
        <a href={href({ nombre: 'home' })} className="barra__volver" aria-label="Volver al inicio">
          <Icon name="back" />
        </a>
        <span className="barra__titulo">Nueva fecha</span>
      </header>
      <main className="contenedor contenedor--angosto">
        <h1 className="titular">
          <span className="titular__recorte">¿Qué fecha</span>
          <br />
          <span className="titular__recorte titular__recorte--b">producimos?</span>
        </h1>
        <p className="lead">Arrancamos con lo básico. El resto lo vamos completando con el checklist.</p>

        <form className="form" onSubmit={onSubmit} noValidate>
          <Campo id="nf-nombre" label="¿Cómo se llama la fecha?">
            <Input
              id="nf-nombre"
              autoFocus
              placeholder="ej: 39° Encuentro Plurinacional – Córdoba"
              value={datos.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              aria-invalid={intentado && !datos.nombre.trim()}
            />
          </Campo>
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
          <Campo id="nf-resp" label="¿Quién queda responsable de esta fecha?">
            <Input
              id="nf-resp"
              placeholder="nombre o comisión"
              value={datos.responsable}
              onChange={(e) => set('responsable', e.target.value)}
              aria-invalid={intentado && !datos.responsable.trim()}
            />
          </Campo>
          <Campo id="nf-contacto" label="¿Con quién hablamos del otro lado?" hint="Contraparte / contacto de la producción o el espacio.">
            <Input id="nf-contacto" placeholder="nombre y teléfono" value={datos.contacto} onChange={(e) => set('contacto', e.target.value)} />
          </Campo>

          {intentado && falta && (
            <p className="aviso aviso--alerta" role="alert">
              <Icon name="alert" size={18} /> Nos falta al menos el nombre de la fecha y quién la produce.
            </p>
          )}

          <button type="submit" className="btn btn--mega btn--block">
            Empezar a producir <Icon name="arrow" />
          </button>
        </form>
      </main>
    </div>
  );
}
