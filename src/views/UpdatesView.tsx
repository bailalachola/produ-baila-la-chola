import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { etiquetaDe, fechaHora } from '../model/logic';
import { ahora, uid } from '../model/factory';
import { CATEGORIAS_UPDATE, type CategoriaUpdate, type Fecha, type Update } from '../model/types';
import { Icon, Input, TextArea, TituloSeccion, Vacio } from '../components/ui';
import { useConfirmar } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { copiar } from '../lib/clipboard';
import { ReporteGrupo } from '../components/ReporteGrupo';

const EMOJI: Record<CategoriaUpdate, string> = {
  DECISIÓN: '✊',
  UPDATE: '🌈',
  PENDIENTE: '⏳',
  RESUELTO: '✅',
  CAMBIO: '🔁',
};

export function formatoWhatsApp(f: Fecha, u: Update): string {
  return [
    `${EMOJI[u.categoria]} *#${etiquetaDe(f)} | ${u.categoria}${u.tema ? ` · ${u.tema.toUpperCase()}` : ''}*`,
    '',
    u.texto.trim(),
    '',
    `_${[u.autor, fechaHora(u.cuando)].filter(Boolean).join(' · ')}_`,
  ].join('\n');
}

export function UpdatesView({ fecha }: { fecha: Fecha }) {
  const { actualizar } = useStore();
  const confirmar = useConfirmar();
  const toast = useToast();
  const [cat, setCat] = useState<CategoriaUpdate>('UPDATE');
  const [texto, setTexto] = useState('');
  const [autor, setAutor] = useState('');
  const [cuando, setCuando] = useState('');
  const [momento, setMomento] = useState('');
  const [tema, setTema] = useState('');
  const [etiqueta, setEtiqueta] = useState(fecha.etiqueta ?? '');

  const ordenados = [...fecha.updates].sort((a, b) => a.cuando.localeCompare(b.cuando));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const u: Update = {
      id: uid('upd'),
      cuando: cuando ? new Date(cuando).toISOString() : ahora(),
      categoria: cat,
      texto: texto.trim(),
      autor: autor.trim() || undefined,
      momento: momento.trim() || undefined,
      tema: tema.trim() || undefined,
    };
    actualizar(fecha.id, (f) => ({ ...f, updates: [...f.updates, u] }));
    setTexto('');
    setCuando('');
    setTema('');
    toast('Update registrado.');
  }

  async function onCopiar(u: Update) {
    const ok = await copiar(formatoWhatsApp(fecha, u));
    toast(ok ? 'Copiado. Pegalo en el grupo 💬' : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
  }

  async function onBorrar(u: Update) {
    if (await confirmar('¿Borramos este update?', u.texto.slice(0, 120), 'Borrar')) {
      actualizar(fecha.id, (f) => ({ ...f, updates: f.updates.filter((x) => x.id !== u.id) }));
    }
  }

  return (
    <section>
      <TituloSeccion bajada="La memoria de la fecha: qué se decidió, qué cambió, qué se resolvió.">Updates</TituloSeccion>

      {fecha.estado !== 'idea' && fecha.estado !== 'cerrada' && <ReporteGrupo fecha={fecha} />}

      <h3 className="bloque__titulo updates__registrar">Registrar un update</h3>

      <form className="panel form" onSubmit={onSubmit}>
        <div className="opciones" role="group" aria-label="Categoría">
          {CATEGORIAS_UPDATE.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip chip--cat chip--${c.normalize('NFD').replace(/[^A-Z]/g, '').toLowerCase()} ${cat === c ? 'is-on' : ''}`}
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="mini-campo mini-campo--full">
          <span>¿Qué pasó?</span>
          <TextArea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="ej: Confirmaron 9 micrófonos. No hay prueba." />
        </label>
        <div className="form__fila">
          <label className="mini-campo">
            <span>¿Quién lo cuenta?</span>
            <Input value={autor} onChange={(e) => setAutor(e.target.value)} />
          </label>
          <label className="mini-campo">
            <span>¿Cuándo? (vacío = ahora)</span>
            <Input type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} />
          </label>
          <label className="mini-campo">
            <span>Tema (opcional)</span>
            <Input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Técnica, Camarín, Logística…" />
          </label>
          <label className="mini-campo">
            <span>Momento (opcional)</span>
            <Input value={momento} onChange={(e) => setMomento(e.target.value)} placeholder="Previo al viaje, Día del show…" />
          </label>
        </div>
        <button type="submit" className="btn btn--primario btn--block" disabled={!texto.trim()}>
          <Icon name="plus" /> Registrar update
        </button>
      </form>

      <details className="etiqueta-wa">
        <summary>
          Etiqueta para WhatsApp:{' '}<strong>#{etiquetaDe(fecha)}</strong>
        </summary>
        <label className="mini-campo mini-campo--full">
          <span>Cambiar etiqueta</span>
          <Input
            value={etiqueta}
            placeholder={etiquetaDe({ ...fecha, etiqueta: undefined })}
            onChange={(e) => setEtiqueta(e.target.value)}
            onBlur={() => actualizar(fecha.id, (f) => ({ ...f, etiqueta: etiqueta.trim() || undefined }))}
          />
        </label>
      </details>

      {ordenados.length === 0 ? (
        <Vacio>Todavía no hay updates.</Vacio>
      ) : (
        <ol className="timeline">
          {ordenados.map((u) => (
            <li key={u.id} className={`tl tl--${u.categoria.normalize('NFD').replace(/[^A-Z]/g, '').toLowerCase()}`}>
              <div className="tl__cabeza">
                <span className="tl__cat">{u.categoria}</span>
                <time dateTime={u.cuando} className="tl__cuando">
                  {u.momento ? `${u.momento} · ` : ''}
                  {fechaHora(u.cuando)}
                </time>
              </div>
              {u.tema && <span className="tag tl__tema">{u.tema}</span>}
              <p className="tl__texto">{u.texto}</p>
              <div className="tl__pie">
                {u.autor && <span className="tl__autor">— {u.autor}</span>}
                <span className="tl__acciones">
                  <button type="button" className="link-btn" onClick={() => onCopiar(u)}>
                    <Icon name="copy" size={16} /> Copiar para WhatsApp
                  </button>
                  <button type="button" className="link-btn link-btn--peligro" onClick={() => onBorrar(u)} aria-label="Borrar update">
                    <Icon name="trash" size={16} />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
