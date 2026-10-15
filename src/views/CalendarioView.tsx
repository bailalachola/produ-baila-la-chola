import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { href } from '../router';
import type { Fecha } from '../model/types';
import { MESES_LARGO } from '../model/logic';
import { comprometidas, diaCorto, generarIcs, grillaMes, hoyISO, textoAgenda } from '../model/agenda';
import { EstadoSticker, Icon, TituloSeccion, Vacio } from '../components/ui';
import { useToast } from '../components/Toast';
import { copiar } from '../lib/clipboard';
import { descargarArchivo } from '../services/backup';
import { VistaToggle } from '../components/VistaToggle';

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const mesActual = () => ({ anio: new Date().getFullYear(), mes: new Date().getMonth() });

export function CalendarioView() {
  const { fechas } = useStore();
  const toast = useToast();
  const [{ anio, mes }, setMes] = useState(mesActual);
  const [conProduccion, setConProduccion] = useState(true);
  const hoy = hoyISO();

  const porDia = useMemo(() => {
    const m = new Map<string, Fecha[]>();
    for (const f of fechas) {
      if (!f.fecha) continue;
      m.set(f.fecha, [...(m.get(f.fecha) ?? []), f]);
    }
    return m;
  }, [fechas]);

  const semanas = grillaMes(anio, mes);
  const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}-`;
  const delMes = fechas.filter((f) => f.fecha?.startsWith(prefijo)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const sinDia = fechas.filter((f) => !f.fecha && f.estado !== 'cerrada' && f.estado !== 'realizada');

  const lista = comprometidas(fechas, conProduccion, hoy);
  const mensaje = textoAgenda(lista);

  const mover = (delta: number) =>
    setMes(({ anio: a, mes: m }) => {
      const d = new Date(a, m + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });
  const irAHoy = () => setMes(mesActual());

  async function onCopiar() {
    const ok = await copiar(mensaje);
    toast(ok ? 'Agenda copiada. Pegala donde quieras 💬' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }
  async function onCompartir() {
    try {
      await navigator.share({ text: mensaje });
    } catch {
      /* canceló */
    }
  }
  async function onIcs() {
    try {
      const ok = await descargarArchivo(
        'agenda-baila-la-chola.ics',
        new Blob([generarIcs(lista)], { type: 'text/calendar;charset=utf-8' }),
      );
      if (ok) toast('Listo. Abrí el archivo para sumar las fechas a tu calendario.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No pudimos descargar el calendario.', 'error');
    }
  }
  const puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <div className="pantalla">
      <header className="barra">
        <a href={href({ nombre: 'home' })} className="barra__volver" aria-label="Volver al inicio">
          <Icon name="back" />
        </a>
        <span className="barra__titulo">La Produ</span>
      </header>
      <main className="contenedor calendario">
        <VistaToggle actual="calendario" />
        <TituloSeccion bajada="Las fechas de la murga en el tiempo. Tocá una para abrirla.">Calendario</TituloSeccion>

        <div className="cal__nav">
          <button type="button" className="icon-btn icon-btn--claro" aria-label="Mes anterior" onClick={() => mover(-1)}>
            <Icon name="back" />
          </button>
          <h2 className="cal__mes" aria-live="polite">
            {MESES_LARGO[mes]} {anio}
          </h2>
          <button type="button" className="icon-btn icon-btn--claro cal__sig" aria-label="Mes siguiente" onClick={() => mover(1)}>
            <Icon name="back" />
          </button>
          <button type="button" className="link-btn cal__hoy" onClick={irAHoy}>
            Hoy
          </button>
        </div>

        <table className="cal">
          <thead>
            <tr>
              {DIAS.map((d) => (
                <th key={d} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semanas.map((s, i) => (
              <tr key={i}>
                {s.map((dia, j) => {
                  if (!dia) return <td key={j} className="cal__vacio" />;
                  const delDia = porDia.get(dia) ?? [];
                  return (
                    <td key={j} className={`cal__dia ${dia === hoy ? 'is-hoy' : ''} ${dia < hoy ? 'is-pasado' : ''}`}>
                      <span className="cal__num">{Number(dia.slice(8))}</span>
                      {delDia.map((f) => (
                        <a
                          key={f.id}
                          className={`cal__ev cal__ev--${f.estado}`}
                          href={href({ nombre: 'fecha', id: f.id, seccion: 'resumen' })}
                          title={f.nombre}
                        >
                          {f.nombre}
                        </a>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bloque">
          <h3 className="bloque__titulo">En {MESES_LARGO[mes]}</h3>
          {delMes.length === 0 ? (
            <Vacio>No hay fechas este mes.</Vacio>
          ) : (
            <ul className="agenda-lista">
              {delMes.map((f) => (
                <li key={f.id}>
                  <a className="agenda-lista__item" href={href({ nombre: 'fecha', id: f.id, seccion: 'resumen' })}>
                    <span className="agenda-lista__dia">{diaCorto(f.fecha)}</span>
                    <span className="agenda-lista__info">
                      <strong>{f.nombre}</strong>
                      <span>{f.lugar || 'Lugar a definir'}</span>
                    </span>
                    <EstadoSticker estado={f.estado} />
                  </a>
                </li>
              ))}
            </ul>
          )}
          {sinDia.length > 0 && (
            <p className="cal__sindia">
              Sin día todavía: {sinDia.map((f) => f.nombre).join(' · ')}
            </p>
          )}
        </div>

        <div className="bloque compartir-agenda">
          <h3 className="bloque__titulo">Compartir lo que tenemos comprometido</h3>
          <p className="compartir-agenda__bajada">
            Las fechas de hoy en adelante, para mandar al grupo o sumar al calendario del celu.
          </p>
          <label className="check">
            <input type="checkbox" checked={conProduccion} onChange={(e) => setConProduccion(e.target.checked)} />
            <span>Sumar las que están en producción (salen como “a confirmar”)</span>
          </label>
          {lista.length === 0 ? (
            <Vacio>
              No hay fechas {conProduccion ? 'confirmadas ni en producción' : 'confirmadas'} con día de hoy en adelante.
            </Vacio>
          ) : (
            <>
              <div className="wa">
                <div className="wa__burbuja">
                  {mensaje.split('\n').map((l, i) => (
                    <div key={i}>{l ? formato(l) : '\u00a0'}</div>
                  ))}
                </div>
              </div>
              <div className="integrador__acciones">
                <button type="button" className="btn btn--mega btn--block" onClick={onCopiar}>
                  <Icon name="copy" size={22} /> Copiar para WhatsApp
                </button>
                <div className="integrador__secundarias">
                  {puedeCompartir && (
                    <button type="button" className="btn btn--secundario" onClick={onCompartir}>
                      Compartir…
                    </button>
                  )}
                  <button type="button" className="btn btn--secundario" onClick={onIcs}>
                    <Icon name="download" size={18} /> Sumar al calendario (.ics)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** *negrita* y _cursiva_ como en WhatsApp */
function formato(linea: string) {
  return linea.split(/(\*[^*]+\*|_[^_]+_)/g).map((p, i) =>
    p.length > 2 && p.startsWith('*') && p.endsWith('*') ? (
      <strong key={i}>{p.slice(1, -1)}</strong>
    ) : p.length > 2 && p.startsWith('_') && p.endsWith('_') ? (
      <em key={i}>{p.slice(1, -1)}</em>
    ) : (
      p
    ),
  );
}
