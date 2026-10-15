import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { href } from '../router';
import { fechaCorta, pendientesAbiertos, progresoGeneral } from '../model/logic';
import type { Fecha } from '../model/types';
import { EstadoSticker, Icon, Marca, Progreso, Vacio } from '../components/ui';
import { exportarBackup, leerBackup } from '../services/backup';
import { useDialogo } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { useSesion } from '../components/Acceso';
import { EstadoGuardado } from '../components/EstadoGuardado';
import { exportarPlanilla } from '../services/planilla';
import { BotonInstalar } from '../components/BotonInstalar';

type Filtro = 'activas' | 'realizadas' | 'cerradas' | 'todas';

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'activas', label: 'Activas' },
  { id: 'realizadas', label: 'Realizadas' },
  { id: 'cerradas', label: 'Cerradas' },
];

/** primero lo que se está produciendo (por fecha más próxima), después lo hecho (más reciente primero) */
const ORDEN_ESTADO: Record<Fecha['estado'], number> = { produccion: 0, confirmada: 0, idea: 1, realizada: 2, cerrada: 3 };
const ordenar = (a: Fecha, b: Fecha) => {
  const ea = ORDEN_ESTADO[a.estado];
  const eb = ORDEN_ESTADO[b.estado];
  if (ea !== eb) return ea - eb;
  return ea >= 2
    ? (b.fecha || '').localeCompare(a.fecha || '')
    : (a.fecha || '9999').localeCompare(b.fecha || '9999');
};

const pasaFiltro = (f: Fecha, filtro: Filtro) =>
  filtro === 'todas' ||
  (filtro === 'activas' && ['idea', 'produccion', 'confirmada'].includes(f.estado)) ||
  (filtro === 'realizadas' && f.estado === 'realizada') ||
  (filtro === 'cerradas' && f.estado === 'cerrada');

export function HomeView() {
  const { fechas, importar, cargarDemo, tieneDemo, remoto } = useStore();
  const sesion = useSesion();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const inputRef = useRef<HTMLInputElement>(null);
  const pedir = useDialogo();
  const toast = useToast();

  const visibles = useMemo(
    () =>
      fechas
        .filter((f) => pasaFiltro(f, filtro))
        .sort(ordenar),
    [fechas, filtro],
  );

  const conteo = (fl: Filtro) => fechas.filter((f) => pasaFiltro(f, fl)).length;

  async function onImportar(file: File | undefined) {
    if (!file) return;
    try {
      const entrantes = await leerBackup(file);
      const modo = fechas.length
        ? await pedir({
            titulo: 'Restaurar backup',
            texto: `El archivo trae ${entrantes.length} fecha(s). Ya hay ${fechas.length} guardada(s)${remoto ? ' en la base de la murga' : ' en este dispositivo'}. ¿Qué hacemos?`,
            opciones: [
              { valor: 'sumar', label: 'Sumar (pisa las que coinciden)', tono: 'neutro' },
              { valor: 'reemplazar', label: 'Reemplazar todo', tono: 'peligro' },
            ],
          })
        : 'reemplazar';
      if (!modo) return;
      await importar(entrantes, modo);
      toast(`Listo: restauramos ${entrantes.length} fecha(s).`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No pudimos importar el archivo.', 'error');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="home">
      <header className="portada">
        <div className="portada__papel" aria-hidden="true" />
        <span className="portada__estrella portada__estrella--1" aria-hidden="true">
          <Icon name="star" size={34} />
        </span>
        <span className="portada__estrella portada__estrella--2" aria-hidden="true">
          <Icon name="star" size={22} />
        </span>
        <Marca grande />
        <p className="portada__bajada">Producción de fechas · bitácora chola</p>
        <a href={href({ nombre: 'nueva' })} className="btn btn--mega">
          <Icon name="plus" size={26} /> Nueva fecha
        </a>
        <BotonInstalar />
      </header>

      <main className="contenedor">
        <div className="filtros" role="tablist" aria-label="Filtrar fechas">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filtro === f.id}
              className={`filtro ${filtro === f.id ? 'is-on' : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label} <span className="filtro__n">{conteo(f.id)}</span>
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <Vacio>
            {fechas.length === 0
              ? 'Todavía no hay fechas. ¡Arranquemos la primera!'
              : 'No hay fechas en este filtro.'}
          </Vacio>
        ) : (
          <ul className="cards">
            {visibles.map((f, i) => (
              <li key={f.id}>
                <FechaCard fecha={f} indice={i} />
              </li>
            ))}
          </ul>
        )}

        <a className="docs-acceso docs-acceso--guia" href={href({ nombre: 'proceso' })}>
          <span className="docs-acceso__icono" aria-hidden="true">
            <Icon name="map" size={26} />
          </span>
          <span className="docs-acceso__texto">
            <strong>Cómo producimos</strong>
            <span>El proceso de una fecha, paso a paso, y dónde se hace cada cosa</span>
          </span>
          <Icon name="arrow" />
        </a>

        <a className="docs-acceso" href={href({ nombre: 'docs' })}>
          <span className="docs-acceso__icono" aria-hidden="true">
            <Icon name="pdf" size={26} />
          </span>
          <span className="docs-acceso__texto">
            <strong>Documentación y accesos</strong>
            <span>Rider, Drives, kit de prensa y dónde está cada cosa</span>
          </span>
          <Icon name="arrow" />
        </a>

        <section className="backup" aria-labelledby="backup-t">
          <div className="backup__cabeza">
            <h2 id="backup-t" className="backup__titulo">Datos</h2>
            <EstadoGuardado />
          </div>
          <p className="backup__texto">
            {remoto
              ? 'Todo se guarda solo en la base de datos de la murga y lo ven todas las personas habilitadas.'
              : 'Todo se guarda en este navegador. Bajate un respaldo seguido y compartilo con la comisión.'}
          </p>
          <div className="backup__acciones">
            <button
              type="button"
              className="btn btn--secundario"
              onClick={async () => {
                try {
                  if (await exportarPlanilla(fechas)) toast('Planilla descargada.');
                } catch (e) {
                  console.error(e);
                  toast('No pudimos armar la planilla.', 'error');
                }
              }}
              disabled={fechas.length === 0}
            >
              <Icon name="download" /> Planilla (Excel)
            </button>
            <button
              type="button"
              className="btn btn--secundario"
              onClick={async () => {
                try {
                  if (await exportarBackup(fechas)) toast('Respaldo descargado.');
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'No pudimos exportar.', 'error');
                }
              }}
              disabled={fechas.length === 0}
            >
              <Icon name="download" /> Respaldo (JSON)
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => inputRef.current?.click()}>
              <Icon name="upload" /> Restaurar respaldo
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => onImportar(e.target.files?.[0])}
            />
            {!tieneDemo && (
              <button type="button" className="btn btn--ghost" onClick={cargarDemo}>
                Recuperar la fecha de Córdoba
              </button>
            )}
          </div>
        </section>

        {sesion.modo === 'nube' && (
          <p className="sesion">
            <span>
              Entraste como <strong title={sesion.email}>{sesion.nombre || sesion.email}</strong>
            </span>
            <button type="button" className="link-btn" onClick={() => void sesion.salir()}>
              Salir
            </button>
          </p>
        )}
      </main>
      <footer className="pie">@bailalachola · producción autogestiva</footer>
    </div>
  );
}

function FechaCard({ fecha: f, indice }: { fecha: Fecha; indice: number }) {
  const prog = progresoGeneral(f);
  const pend = pendientesAbiertos(f).length;
  return (
    <a
      href={href({ nombre: 'fecha', id: f.id, seccion: 'resumen' })}
      className={`card card--${f.estado} card--rot${indice % 3}`}
    >
      <span className="card__cinta" aria-hidden="true" />
      <div className="card__top">
        <EstadoSticker estado={f.estado} />
        <span className="card__fecha">{fechaCorta(f.fecha)}</span>
      </div>
      <h3 className="card__nombre">{f.nombre}</h3>
      <p className="card__meta">
        {f.lugar || 'Lugar a definir'} · {f.responsable || 'Sin responsable'}
      </p>
      <div className="card__pie">
        <div className="card__prog">
          {f.estado === 'cerrada' ? (
            <span>✓ Cerrada · checklist {prog.porcentaje}%</span>
          ) : (
            <>
              <Progreso porcentaje={prog.porcentaje} />
              <span>Producción {prog.porcentaje}%</span>
            </>
          )}
        </div>
        <span className={`card__pend ${pend ? 'has' : ''}`}>
          {pend ? `${pend} pendiente${pend === 1 ? '' : 's'}` : 'Sin pendientes'}
        </span>
      </div>
    </a>
  );
}
