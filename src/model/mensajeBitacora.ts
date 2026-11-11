import { PREGUNTAS_POR_ID } from './checklist';
import { balancesPorMoneda, formatoMonto } from './logic';
import { renglonesArreglo } from './arreglo';
import type { Fecha } from './types';

/**
 * MENSAJE DE LA BITÁCORA (para Cholas organizativas)
 * --------------------------------------------------
 * Cuando cerramos una fecha, compartimos la Retirada: cómo nos fue, qué
 * aprendimos y qué nos llevamos para las próximas. Se arma con lo cargado en la
 * Retirada y se manda junto con el PDF de la Bitácora Chola.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const BALANCE_TXT = {
  positivo: '💚 POSITIVO',
  mixto: '💛 MIXTO',
  negativo: '🩹 NEGATIVO',
} as const;

/** Un texto libre → viñetas (cada renglón es una) */
function vinetas(t?: string): string[] {
  return (t ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*·]\s*/, '').trim())
    .filter(Boolean)
    .map((l) => `• ${l}`);
}

function bloque(titulo: string, ...textos: (string | undefined)[]): string {
  const lineas = textos.flatMap(vinetas).slice(0, tope);
  return lineas.length ? [`*${titulo}*`, ...lineas].join('\n') : '';
}

/** en la versión corta, cuántas viñetas por bloque */
let tope = Infinity;

const BIEN = new Set(['Cumplido', 'Según lo previsto', 'Mejoró lo acordado']);

export function armarMensajeBitacora(f: Fecha, corta = false): string {
  tope = corta ? 2 : Infinity;
  const c = f.cierre;
  const r = c.respuestas;
  const out: string[] = [];

  out.push(`📕 *BITÁCORA CHOLA · ${f.nombre.toUpperCase()}*`);
  let cuando = '';
  if (f.fecha) {
    const [y, m, d] = f.fecha.split('-').map(Number);
    cuando = `${d} de ${MESES[(m ?? 1) - 1]} de ${y}`;
  }
  const meta = [cuando, f.lugar?.trim()].filter(Boolean).join(' · ');
  if (meta) out.push(`_${meta}_`);

  out.push(
    `¡Cerramos la fecha! 🎉 Les compartimos la Retirada: lo que acordamos, lo que pasó, qué aprendimos y qué nos llevamos para las próximas.`,
  );

  // balance general
  if (c.balance || r.balanceTexto?.trim()) {
    out.push([`*BALANCE${c.balance ? `: ${BALANCE_TXT[c.balance]}` : ''}*`, ...vinetas(r.balanceTexto).slice(0, corta ? 1 : Infinity)].join('\n'));
  }

  if (!corta) out.push(bloque('🎭 CÓMO FUE', f.relato?.desarrolloReal));
  out.push(bloque('✅ LO QUE FUNCIONÓ', r.funciono, r.volveriamos));
  out.push(bloque('🔁 LO QUE CAMBIARÍAMOS', r.noFunciono, r.cambiariamos));
  out.push(bloque('⚡ LO QUE NO ESPERÁBAMOS', r.problemas, r.inesperado));
  if (!corta) {
    out.push(bloque('🎛️ TÉCNICA Y SONIDO', f.relato?.resultadoTecnico));
    out.push(bloque('🤝 RELACIÓN CON LA PRODUCCIÓN', r.relacion));
    out.push(bloque('👏 EL PÚBLICO', r.publico));
  }

  // acordado vs. lo que pasó
  const evaluados: { tema: string; balance: string }[] = [
    ...Object.entries(c.balanceItem)
      .filter(([, b]) => b)
      .map(([id, b]) => ({ tema: (PREGUNTAS_POR_ID[id]?.pregunta.label ?? id).split('?')[0]!.replace('¿', '').trim(), balance: b })),
    ...c.itemsExtra.filter((i) => i.balance).map((i) => ({ tema: i.tema, balance: i.balance! })),
  ];
  if (evaluados.length) {
    const bien = evaluados.filter((e) => BIEN.has(e.balance)).length;
    const desvios = evaluados.filter((e) => !BIEN.has(e.balance));
    const partes = [`*📏 ACORDADO VS. LO QUE PASÓ*`, `• ${bien} de ${evaluados.length} cosas salieron como las acordamos (o mejor).`];
    if (!corta) for (const d of desvios) partes.push(`• ${d.tema}: ${d.balance.toLowerCase()}.`);
    out.push(partes.join('\n'));
  }

  // riesgos asumidos
  const asumidos = f.riesgos.filter((x) => x.tipo === 'asumido' || x.tipo === 'inesperado');
  if (asumidos.length && !corta) {
    out.push(
      [
        '*🎯 RIESGOS*',
        ...asumidos.map((x) => `• ${x.descripcion.trim()}${x.tipo === 'inesperado' ? ' (inesperado)' : ''}${x.resultado?.trim() ? ` → ${x.resultado.trim()}` : ''}`),
      ].join('\n'),
    );
  }

  // plata: arreglo + saldo por moneda (nunca sumadas)
  const plata: string[] = [];
  const arr = renglonesArreglo(f.arreglo);
  if (arr.length) plata.push(`• Arreglo: ${arr[0]}`);
  for (const b of balancesPorMoneda(f.movimientos)) {
    if (!b.ingresos && !b.egresos) continue;
    const partes = [b.ingresos && `entraron ${formatoMonto(b.ingresos, b.moneda)}`, b.egresos && `salieron ${formatoMonto(b.egresos, b.moneda)}`].filter(Boolean).join(', ');
    plata.push(`• ${b.moneda}: ${partes}. Saldo ${formatoMonto(b.saldo, b.moneda)}.`);
  }
  if (plata.length) out.push(['*💸 LA PLATA*', ...plata].join('\n'));

  out.push(bloque('📚 APRENDIZAJES', f.relato?.aprendizajes));
  if (!corta) out.push(bloque('📌 CRITERIOS PARA PRÓXIMAS FECHAS', f.relato?.criterios));

  out.push('📄 Les adjuntamos la Bitácora Chola completa en PDF, con todo el detalle de la fecha.');
  out.push('¡Gracias a todas por el laburo, la entrega y la manija! Seguimos aprendiendo juntas 💜\n\nLas Produs');

  return out.filter(Boolean).join('\n\n');
}
