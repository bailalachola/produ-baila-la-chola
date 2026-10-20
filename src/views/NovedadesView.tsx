import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { href } from '../router';
import { nombreCorto, todasLasNovedades, type NovedadVista } from '../model/actividad';
import { hoyISO } from '../model/agenda';
import { useSesion } from '../components/Acceso';
import { leerVistas, marcarVistas } from '../components/Campanita';
import { Icon, Select, TituloSeccion, Vacio } from '../components/ui';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const POR_PAGINA = 80;

function diaTitulo(iso: string): string {
  const d = new Date(iso);
  const dia = hoyISO(d);
  const hoy = hoyISO();
  const ayer = hoyISO(new Date(Date.now() - 86_400_000));
  if (dia === hoy) return 'Hoy';
  if (dia === ayer) return 'Ayer';
  return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

export function NovedadesView({ fechaId }: { fechaId?: string }) {
  const { fechas } = useStore();
  const sesion = useSesion();
  const yo = sesion.modo === 'nube' ? nombreCorto(sesion.nombre, sesion.email) : 'Vos';
  // lo que era nuevo al entrar queda resaltado mientras estás acá
  const [vistasAlEntrar] = useState(leerVistas);
  const [cuantas, setCuantas] = useState(POR_PAGINA);
  const [quien, setQuien] = useState('');

  useEffect(() => {
    marcarVistas();
  }, []);

  const todas = useMemo(() => todasLasNovedades(fechas, fechaId), [fechas, fechaId]);
  const personas = useMemo(() => [...new Set(todas.map((n) => n.autor))].sort(), [todas]);
  const filtradas = quien ? todas.filter((n) => n.autor === quien) : todas;
  const visibles = filtradas.slice(0, cuantas);

  const grupos: { dia: string; items: NovedadVista[] }[] = [];
  for (const n of visibles) {
    const dia = diaTitulo(n.cuando);
    const g = grupos[grupos.length - 1];
    if (g && g.dia === dia) g.items.push(n);
    else grupos.push({ dia, items: [n] });
  }

  const fecha = fechaId ? fechas.find((f) => f.id === fechaId) : undefined;
  const volver = fecha ? href({ nombre: 'fecha', id: fecha.id, seccion: 'resumen' }) : href({ nombre: 'home' });

  return (
    <div className="pantalla">
      <header className="barra">
        <a href={volver} className="barra__volver" aria-label="Volver">
          <Icon name="back" />
        </a>
        <span className="barra__titulo">La Produ</span>
      </header>
      <main className="contenedor contenedor--angosto novedades">
        <TituloSeccion bajada={fecha ? `Lo que se fue haciendo en ${fecha.nombre}.` : 'Lo que cada una fue haciendo en las fechas.'}>
          Novedades
        </TituloSeccion>

        <div className="novedades__filtros">
          <label className="mini-campo">
            <span>Fecha</span>
            <Select
              value={fechaId ?? ''}
              onChange={(e) => {
                window.location.hash = href({ nombre: 'novedades', fecha: e.target.value || undefined });
              }}
            >
              <option value="">Todas las fechas</option>
              {[...fechas]
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
            </Select>
          </label>
          {personas.length > 1 && (
            <label className="mini-campo">
              <span>Quién</span>
              <Select value={quien} onChange={(e) => setQuien(e.target.value)}>
                <option value="">Todas</option>
                {personas.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </label>
          )}
        </div>

        {visibles.length === 0 ? (
          <Vacio>Todavía no hay novedades{fecha ? ' en esta fecha' : ''}. Aparecen a medida que se carga algo.</Vacio>
        ) : (
          grupos.map((g) => (
            <section key={g.dia} className="novedades__dia">
              <h2 className="novedades__dia-titulo">{g.dia}</h2>
              <ul className="novedades__lista">
                {g.items.map((n) => {
                  const nueva = n.autor !== yo && (!vistasAlEntrar || n.cuando > vistasAlEntrar);
                  return (
                    <li key={`${n.fechaId ?? 'app'}-${n.id}`} className={`novedad ${nueva ? 'is-nueva' : ''} ${n.mejora ? 'novedad--mejora' : ''}`}>
                      <span className="novedad__inicial" aria-hidden="true">
                        {n.mejora ? '✨' : n.autor.charAt(0).toUpperCase()}
                      </span>
                      <a
                        className="novedad__cuerpo"
                        href={
                          n.ir
                            ? href(n.ir)
                            : n.fechaId
                              ? href({ nombre: 'fecha', id: n.fechaId, seccion: n.seccion ?? 'resumen' })
                              : href({ nombre: 'novedades' })
                        }
                      >
                        <span className="novedad__texto">
                          <strong>{n.autor}</strong> {n.texto}
                        </span>
                        <span className="novedad__meta">
                          {hora(n.cuando)}
                          {n.mejora ? <> · Mejora de La Produ</> : !fechaId && <> · {n.fechaNombre}</>}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {filtradas.length > cuantas && (
          <button type="button" className="btn btn--secundario novedades__mas" onClick={() => setCuantas((c) => c + POR_PAGINA)}>
            Ver más
          </button>
        )}
      </main>
    </div>
  );
}
