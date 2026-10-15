import { useState, type FormEvent } from 'react';
import type { CategoriaLink, Link } from '../model/types';
import { uid } from '../model/factory';
import { Icon, Input } from './ui';
import { useConfirmar } from './Dialog';

/** "drive.google.com/…" → "https://drive.google.com/…" */
export function normalizarUrl(u: string): string {
  const t = u.trim();
  if (!t) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
}

/** Qué tipo de link es, para mostrar un rótulo chiquito */
export function tipoDeLink(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname.includes('drive.google')) return pathname.includes('/folders/') ? 'Carpeta Drive' : 'Drive';
    if (hostname.includes('docs.google')) {
      if (pathname.startsWith('/spreadsheets')) return 'Planilla';
      if (pathname.startsWith('/presentation')) return 'Presentación';
      if (pathname.startsWith('/forms')) return 'Formulario';
      return 'Documento';
    }
    if (hostname.includes('instagram')) return 'Instagram';
    if (hostname.includes('youtu')) return 'YouTube';
    if (hostname.includes('dropbox')) return 'Dropbox';
    return hostname.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
}

interface Props {
  links: Link[];
  categorias: CategoriaLink[];
  onChange: (links: Link[]) => void;
  /** si es false, solo se ven (sin agregar ni borrar) */
  editable?: boolean;
}

export function LinksEditor({ links, categorias, onChange, editable = true }: Props) {
  const confirmar = useConfirmar();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const borrar = async (l: Link) => {
    if (await confirmar('¿Sacamos este link?', l.titulo || l.url, 'Sacar')) {
      onChange(links.filter((x) => x.id !== l.id));
    }
  };

  return (
    <div className="links">
      {categorias.map((c) => {
        const items = links.filter((l) => l.categoria === c.id);
        const vacia = items.length === 0;
        if (!editable && vacia) return null;
        return (
          <section key={c.id} className={`links__cat ${vacia ? 'is-vacia' : ''}`} aria-labelledby={`lc-${c.id}`}>
            <div className="links__cabeza">
              <h3 id={`lc-${c.id}`} className="links__titulo">
                {c.label}
              </h3>
              {editable && abierta !== c.id && (
                <button type="button" className="link-btn" onClick={() => setAbierta(c.id)}>
                  <Icon name="plus" size={16} /> Agregar
                </button>
              )}
            </div>
            {c.ayuda && vacia && abierta !== c.id && <p className="links__ayuda">{c.ayuda}</p>}

            {items.length > 0 && (
              <ul className="links__lista">
                {items.map((l) =>
                  editando === l.id ? (
                    <li key={l.id}>
                      <FormLink
                        inicial={l}
                        onCancelar={() => setEditando(null)}
                        onGuardar={(nuevo) => {
                          onChange(links.map((x) => (x.id === l.id ? nuevo : x)));
                          setEditando(null);
                        }}
                      />
                    </li>
                  ) : (
                    <li key={l.id} className="link-item">
                      <a className="link-item__a" href={l.url} target="_blank" rel="noopener noreferrer">
                        <span className="link-item__titulo">{l.titulo || l.url}</span>
                        <span className="link-item__tipo">{tipoDeLink(l.url)} ↗</span>
                      </a>
                      {l.nota && <p className="link-item__nota">{l.nota}</p>}
                      {editable && (
                        <div className="link-item__acciones">
                          <button type="button" className="link-btn" onClick={() => setEditando(l.id)}>
                            Editar
                          </button>
                          <button type="button" className="link-btn link-btn--peligro" onClick={() => borrar(l)}>
                            Sacar
                          </button>
                        </div>
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}

            {abierta === c.id && (
              <FormLink
                inicial={{ id: uid('link'), titulo: '', url: '', categoria: c.id }}
                onCancelar={() => setAbierta(null)}
                onGuardar={(nuevo) => {
                  onChange([...links, nuevo]);
                  setAbierta(null);
                }}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

function FormLink({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: Link;
  onGuardar: (l: Link) => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [url, setUrl] = useState(inicial.url);
  const [nota, setNota] = useState(inicial.nota ?? '');
  const [error, setError] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const u = normalizarUrl(url);
    try {
      new URL(u);
    } catch {
      setError('Pegá un link completo, por ejemplo https://drive.google.com/…');
      return;
    }
    onGuardar({ ...inicial, titulo: titulo.trim() || tipoDeLink(u), url: u, nota: nota.trim() || undefined });
  }

  return (
    <form className="panel form link-form" onSubmit={onSubmit}>
      <label className="mini-campo mini-campo--full">
        <span>Link</span>
        <Input
          autoFocus
          inputMode="url"
          placeholder="https://drive.google.com/…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
          }}
        />
      </label>
      <label className="mini-campo mini-campo--full">
        <span>¿Qué es?</span>
        <Input placeholder="ej: Fotos de Gonza, Rider 2026" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="mini-campo mini-campo--full">
        <span>Nota (opcional)</span>
        <Input placeholder="ej: pedir acceso a Ine" value={nota} onChange={(e) => setNota(e.target.value)} />
      </label>
      {error && (
        <p className="aviso aviso--alerta" role="alert">
          {error}
        </p>
      )}
      <div className="form__acciones">
        <button type="button" className="btn btn--ghost" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primario" disabled={!url.trim()}>
          Guardar link
        </button>
      </div>
    </form>
  );
}
