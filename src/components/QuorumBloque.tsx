import { useStore } from '../store';
import type { Fecha } from '../model/types';
import { ahora, uid } from '../model/factory';
import {
  MAX_PREGUNTA,
  OPCIONES_QUORUM,
  estadoQuorum,
  llegaAlMinimo,
  preguntaFinal,
  preguntaSugerida,
  quorumVacio,
  resumenNumeros,
  type Quorum,
  type ResultadoQuorum,
} from '../model/quorum';
import { copiar } from '../lib/clipboard';
import { useToast } from './Toast';
import { Icon, Input, TextArea } from './ui';

/** Armar la encuesta de quórum para Cholas y registrar cómo salió */
export function QuorumBloque({ fecha, onSeguir }: { fecha: Fecha; onSeguir?: () => void }) {
  const { actualizar } = useStore();
  const toast = useToast();
  const q: Quorum = fecha.quorum ?? quorumVacio();
  const pregunta = preguntaFinal(fecha, q);
  const largo = [...pregunta].length;
  const estado = estadoQuorum(fecha.quorum);
  const alcanza = llegaAlMinimo(q);

  const guardar = (cambio: Partial<Quorum>) =>
    actualizar(fecha.id, (f) => ({ ...f, quorum: { ...(f.quorum ?? quorumVacio()), ...cambio } }));

  async function copiarTexto(texto: string, que: string) {
    const ok = await copiar(texto);
    toast(ok ? `${que} copiada 📋` : 'No pudimos copiar. Probá de nuevo.', ok ? 'ok' : 'error');
    if (ok && !q.enviado && que === 'Pregunta') guardar({ enviado: ahora() });
  }

  function decidir(resultado: ResultadoQuorum) {
    const nums = resumenNumeros(q);
    const texto =
      resultado === 'si'
        ? `Hay quórum${nums ? ` (${nums})` : ''}.`
        : `No hay quórum${nums ? ` (${nums})` : ''}.`;
    actualizar(fecha.id, (f) => ({
      ...f,
      quorum: { ...(f.quorum ?? quorumVacio()), resultado, decidido: ahora() },
      updates: [{ id: uid('upd'), cuando: ahora(), categoria: 'DECISIÓN', texto, autor: 'Produ' }, ...f.updates],
    }));
    toast(resultado === 'si' ? '¡Hay quórum! 🥁' : 'Quedó registrado: sin quórum.');
  }

  return (
    <div className="quorum" id="quorum">
      <div className="quorum__cabeza">
        <h3 className="quorum__titulo">Quórum</h3>
        {estado && <span className={`quorum__estado quorum__estado--${estado.tono}`}>{estado.texto}</span>}
      </div>
      <p className="quorum__bajada">
        La encuesta para Cholas: tres rojos al principio y al final, para que la murga solo conteste. Según cómo sale, la fecha sigue o no.
      </p>

      <div className="form">
        <div className="form__fila">
          <label className="mini-campo">
            <span>Día</span>
            <Input
              type="date"
              value={fecha.fecha}
              onChange={(e) => actualizar(fecha.id, (f) => ({ ...f, fecha: e.target.value }))}
            />
          </label>
          <label className="mini-campo">
            <span>Hora (si se sabe)</span>
            <Input placeholder="ej: 21:00" value={q.hora ?? ''} onChange={(e) => guardar({ hora: e.target.value })} />
          </label>
        </div>
        <label className="mini-campo mini-campo--full">
          <span>Info extra para decidir</span>
          <TextArea
            rows={2}
            placeholder="ej: Pagan traslado. Salimos 17hs desde Constitución."
            value={q.info ?? ''}
            onChange={(e) => guardar({ info: e.target.value })}
          />
        </label>
      </div>

      <div className="encuesta" aria-label="Vista previa de la encuesta">
        <p className="encuesta__tipo">📊 Encuesta</p>
        <p className="encuesta__pregunta">{pregunta}</p>
        <ul className="encuesta__opciones">
          {q.opciones.map((o, i) => (
            <li key={i}>
              <span className="encuesta__radio" aria-hidden="true" />
              <Input
                aria-label={`Opción ${i + 1}`}
                value={o}
                onChange={(e) => guardar({ opciones: q.opciones.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            </li>
          ))}
        </ul>
        <p className={`encuesta__largo ${largo > MAX_PREGUNTA ? 'is-largo' : ''}`}>
          {largo}/{MAX_PREGUNTA} caracteres{largo > MAX_PREGUNTA ? ' · WhatsApp la va a cortar: acortá la info extra' : ''}
        </p>
      </div>

      <details className="quorum__editar">
        <summary>Editar la pregunta a mano</summary>
        <TextArea
          rows={4}
          value={q.pregunta ?? ''}
          placeholder={preguntaSugerida(fecha, q)}
          onChange={(e) => guardar({ pregunta: e.target.value })}
        />
        <p className="quorum__ayuda">Si lo dejás vacío, se arma sola con el nombre, el día, el lugar y la info extra.</p>
        {q.opciones.join('|') !== OPCIONES_QUORUM.join('|') && (
          <button type="button" className="link-btn" onClick={() => guardar({ opciones: [...OPCIONES_QUORUM] })}>
            Volver a “Puedo / No puedo”
          </button>
        )}
      </details>

      <div className="quorum__copiar">
        <button type="button" className="btn btn--mega btn--block" onClick={() => copiarTexto(pregunta, 'Pregunta')}>
          <Icon name="copy" size={22} /> Copiar pregunta
        </button>
        <div className="integrador__secundarias">
          {q.opciones.map((o, i) => (
            <button key={i} type="button" className="btn btn--secundario" onClick={() => copiarTexto(o, 'Opción')}>
              Copiar “{o}”
            </button>
          ))}
        </div>
        <p className="quorum__ayuda">
          En el grupo de Cholas: 📎 → <strong>Encuesta</strong> → pegá la pregunta y las opciones. Dejá apagado “permitir varias respuestas”.
        </p>
      </div>

      <div className="quorum__resultado">
        <h4>¿Cómo salió?</h4>
        <div className="form__fila form__fila--3">
          <label className="mini-campo">
            <span>Pueden</span>
            <Input inputMode="numeric" value={q.puedo ?? ''} onChange={(e) => guardar({ puedo: e.target.value })} />
          </label>
          <label className="mini-campo">
            <span>No pueden</span>
            <Input inputMode="numeric" value={q.noPuedo ?? ''} onChange={(e) => guardar({ noPuedo: e.target.value })} />
          </label>
          <label className="mini-campo">
            <span>Necesitamos</span>
            <Input inputMode="numeric" placeholder="mín." value={q.minimo ?? ''} onChange={(e) => guardar({ minimo: e.target.value })} />
          </label>
        </div>
        {alcanza !== undefined && (
          <p className={`quorum__cuenta ${alcanza ? 'is-ok' : 'is-no'}`}>
            {alcanza ? 'Con estos números llegamos.' : 'Con estos números no llegamos.'} Igual, decide la murga.
          </p>
        )}
        <div className="quorum__decision">
          <button
            type="button"
            className={`btn quorum__si ${q.resultado === 'si' ? 'is-on' : ''}`}
            aria-pressed={q.resultado === 'si'}
            onClick={() => decidir('si')}
          >
            ✓ Hay quórum
          </button>
          <button
            type="button"
            className={`btn quorum__no ${q.resultado === 'no' ? 'is-on' : ''}`}
            aria-pressed={q.resultado === 'no'}
            onClick={() => decidir('no')}
          >
            ✗ No hay quórum
          </button>
        </div>
        {q.resultado === 'si' && onSeguir && (
          <button type="button" className="btn btn--alt btn--block quorum__seguir" onClick={onSeguir}>
            Seguimos: pasar a producción <Icon name="arrow" />
          </button>
        )}
      </div>
    </div>
  );
}
