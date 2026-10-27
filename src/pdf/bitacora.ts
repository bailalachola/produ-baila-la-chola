import { jsPDF } from 'jspdf';
import { ESTADO_ENSAYO_LABEL, etiquetaDia, horarioEnsayo, nombreEnsayo } from '../model/ensayos';
import { CHECKLIST, COMPARABLES, type SeccionChecklist } from '../model/checklist';
import {
  balancesPorMoneda,
  esVisible,
  fechaHora,
  fechaLarga,
  formatoMonto,
  pendientesAbiertos,
  respuestaLegible,
  riesgosDerivados,
  valorPlanificado,
} from '../model/logic';
import {
  CATEGORIAS_LINK_FECHA,
  ESTADO_LABEL,
  ESTADO_MOV_LABEL,
  PREGUNTAS_CIERRE,
  TIPO_RIESGO_LABEL,
  type Fecha,
  type PreguntaCierreId,
  type RelatoId,
  type Respuesta,
  type TipoRiesgo,
} from '../model/types';

/**
 * BITÁCORA EN PDF — 100% en el navegador con jsPDF.
 * Identidad Baila La Chola en portada, títulos y separadores;
 * el cuerpo prioriza legibilidad (fondo blanco, Helvetica, buen interlineado).
 */

type RGB = [number, number, number];
const C = {
  negro: [20, 16, 18] as RGB,
  magenta: [229, 25, 127] as RGB,
  violeta: [107, 47, 191] as RGB,
  amarillo: [255, 212, 0] as RGB,
  naranja: [255, 106, 19] as RGB,
  crema: [246, 238, 220] as RGB,
  gris: [96, 90, 92] as RGB,
  grisClaro: [226, 219, 205] as RGB,
  blanco: [255, 255, 255] as RGB,
};

const W = 210;
const H = 297;
const M = 18; // margen
const ANCHO = W - M * 2;

/** jsPDF con fuentes estándar solo dibuja WinAnsi: sacamos emojis y símbolos raros */
function limpio(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/[−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\u0000-ÿ–—…•€]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

class Doc {
  pdf: jsPDF;
  y = M;
  nro = 1;
  titulo: string;

  constructor(titulo: string) {
    this.pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    this.titulo = titulo;
  }

  fill(c: RGB) {
    this.pdf.setFillColor(c[0], c[1], c[2]);
  }
  stroke(c: RGB) {
    this.pdf.setDrawColor(c[0], c[1], c[2]);
  }
  color(c: RGB) {
    this.pdf.setTextColor(c[0], c[1], c[2]);
  }
  font(style: 'normal' | 'bold' | 'italic' | 'bolditalic', size: number) {
    this.pdf.setFont('helvetica', style);
    this.pdf.setFontSize(size);
  }

  /** polígono cerrado a partir de puntos absolutos */
  poly(pts: [number, number][], style: 'F' | 'S' | 'FD' = 'F') {
    const [x0, y0] = pts[0]!;
    const deltas: [number, number][] = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push([pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]]);
    }
    this.pdf.lines(deltas, x0, y0, [1, 1], style, true);
  }

  estrella(cx: number, cy: number, r: number, c: RGB) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
    this.fill(c);
    this.poly(pts);
  }

  /** cinta adhesiva inclinada */
  cinta(x: number, y: number, w: number, h: number, inclinacion: number, c: RGB) {
    this.fill(c);
    this.poly([
      [x, y + inclinacion],
      [x + w, y],
      [x + w, y + h],
      [x, y + h + inclinacion],
    ]);
  }

  nuevaPagina() {
    this.pdf.addPage();
    this.y = M + 10;
    // encabezado editorial
    this.fill(C.negro);
    this.pdf.rect(0, 0, W, 9, 'F');
    this.fill(C.magenta);
    this.pdf.rect(0, 9, W, 1.2, 'F');
    this.font('bold', 7.5);
    this.color(C.crema);
    this.pdf.text('BITÁCORA CHOLA · PRODUCCIÓN', M, 5.8);
    this.color(C.amarillo);
    this.pdf.text(limpio(this.titulo).toUpperCase().slice(0, 70), W - M, 5.8, { align: 'right' });
  }

  espacio(h: number) {
    if (this.y + h > H - 16) this.nuevaPagina();
  }

  /** título de sección: recorte negro + subrayado magenta + número sticker */
  seccion(nombre: string, numerar = true) {
    // que el título nunca quede solo al pie de la página
    this.espacio(44);
    this.y += 4;
    const n = numerar ? String(this.nro++).padStart(2, '0') : 'A';
    this.font('bold', 15);
    const tw = this.pdf.getTextWidth(nombre.toUpperCase());
    const x = M + 13;
    // número en sticker amarillo
    this.fill(C.amarillo);
    this.poly([
      [M, this.y - 1],
      [M + 10.5, this.y - 1.6],
      [M + 11, this.y + 9],
      [M + 0.4, this.y + 9.4],
    ]);
    this.font('bold', 11);
    this.color(C.negro);
    this.pdf.text(n, M + 5.5, this.y + 5.6, { align: 'center' });
    // recorte negro
    this.fill(C.negro);
    this.poly([
      [x, this.y - 0.6],
      [x + tw + 7, this.y - 1.4],
      [x + tw + 6.2, this.y + 9.2],
      [x - 0.6, this.y + 9.6],
    ]);
    this.font('bold', 15);
    this.color(C.crema);
    this.pdf.text(nombre.toUpperCase(), x + 3.2, this.y + 6.3);
    // trazo magenta imperfecto
    this.stroke(C.magenta);
    this.pdf.setLineWidth(1.1);
    this.pdf.line(x + 1, this.y + 12, x + tw + 4, this.y + 11.2);
    this.pdf.setLineWidth(0.2);
    this.y += 18;
  }

  subtitulo(t: string, c: RGB = C.violeta) {
    this.espacio(12);
    this.font('bold', 10.5);
    this.color(c);
    this.pdf.text(limpio(t).toUpperCase(), M, this.y);
    this.y += 5.5;
  }

  parrafo(t: string, opts: { size?: number; color?: RGB; estilo?: 'normal' | 'italic' | 'bold'; indent?: number } = {}) {
    const txt = limpio(t);
    if (!txt) return;
    const size = opts.size ?? 10;
    this.font(opts.estilo ?? 'normal', size);
    this.color(opts.color ?? C.negro);
    const indent = opts.indent ?? 0;
    const lineas = this.pdf.splitTextToSize(txt, ANCHO - indent) as string[];
    const lh = size * 0.45;
    for (const l of lineas) {
      this.espacio(lh + 1);
      // nuevaPagina() cambia fuente y color: se restablecen en cada línea
      this.font(opts.estilo ?? 'normal', size);
      this.color(opts.color ?? C.negro);
      this.pdf.text(l, M + indent, this.y);
      this.y += lh;
    }
    this.y += 2;
  }

  /** fila etiqueta → valor */
  kv(label: string, valor: string, resaltar?: RGB) {
    const v = limpio(valor);
    if (!v) return;
    const LW = 62;
    this.font('normal', 9.5);
    const lineasV = this.pdf.splitTextToSize(v, ANCHO - LW - 2) as string[];
    this.font('bold', 9);
    const lineasL = this.pdf.splitTextToSize(limpio(label), LW - 3) as string[];
    const h = Math.max(lineasV.length, lineasL.length) * 4.3 + 2.4;
    this.espacio(h);
    if (resaltar) {
      this.fill(resaltar);
      this.pdf.rect(M - 2, this.y - 3.6, 1.4, h - 1, 'F');
    }
    this.color(C.gris);
    this.font('bold', 9);
    this.pdf.text(lineasL, M, this.y);
    this.color(C.negro);
    this.font('normal', 9.5);
    this.pdf.text(lineasV, M + LW, this.y);
    this.y += h - 1.4;
    this.stroke(C.grisClaro);
    this.pdf.setLineWidth(0.15);
    this.pdf.line(M, this.y - 2.6, W - M, this.y - 2.6);
    this.y += 1;
  }

  vinieta(t: string, c: RGB = C.magenta, indent = 0) {
    const txt = limpio(t);
    if (!txt) return;
    this.font('normal', 9.8);
    const lineas = this.pdf.splitTextToSize(txt, ANCHO - 6 - indent) as string[];
    this.espacio(lineas.length * 4.4 + 1.5);
    this.fill(c);
    this.estrellita(M + indent + 1.6, this.y - 1.3);
    this.fill(c);
    this.color(C.negro);
    this.pdf.text(lineas, M + indent + 5, this.y);
    this.y += lineas.length * 4.4 + 1.6;
  }

  /** Texto del relato: párrafos, "- viñetas" y "1. pasos numerados" */
  texto(t: string) {
    const lineas = t.replace(/\r/g, '').split('\n');
    let parrafo: string[] = [];
    const flush = () => {
      if (parrafo.length) this.parrafo(parrafo.join(' '), { size: 10 });
      parrafo = [];
    };
    for (const raw of lineas) {
      const l = raw.trim();
      if (!l) {
        flush();
        continue;
      }
      const vin = l.match(/^[-•*]\s+(.*)$/);
      const num = l.match(/^(\d+)[.)]\s+(.*)$/);
      if (vin) {
        flush();
        this.vinieta(vin[1]!);
      } else if (num) {
        flush();
        this.numerado(num[1]!, num[2]!);
      } else parrafo.push(l);
    }
    flush();
    this.y += 1;
  }

  numerado(n: string, t: string) {
    const txt = limpio(t);
    this.font('normal', 9.8);
    const lineas = this.pdf.splitTextToSize(txt, ANCHO - 8) as string[];
    this.espacio(lineas.length * 4.4 + 1.5);
    this.fill(C.amarillo);
    this.pdf.rect(M, this.y - 3.6, 5.2, 4.8, 'F');
    this.font('bold', 8.5);
    this.color(C.negro);
    this.pdf.text(n, M + 2.6, this.y - 0.1, { align: 'center' });
    this.font('normal', 9.8);
    this.pdf.text(lineas, M + 8, this.y);
    this.y += lineas.length * 4.4 + 1.8;
  }

  /** link clickeable: título en negrita y la dirección abajo, chiquita */
  enlace(titulo: string, url: string, nota?: string) {
    const t = limpio(titulo);
    this.espacio(12);
    this.fill(C.magenta);
    this.estrellita(M + 1.6, this.y - 1.3);
    this.font('bold', 10);
    this.color(C.negro);
    this.pdf.textWithLink(t, M + 5, this.y, { url });
    this.y += 4.2;
    this.font('normal', 7.8);
    this.color(C.violeta);
    const u = this.pdf.splitTextToSize(url, ANCHO - 5) as string[];
    this.pdf.textWithLink(u[0] ?? url, M + 5, this.y, { url });
    this.y += 3.6;
    if (nota) {
      this.font('italic', 8.5);
      this.color(C.gris);
      this.pdf.text(limpio(nota), M + 5, this.y);
      this.y += 4;
    }
    this.y += 1.8;
  }

  estrellita(x: number, y: number) {
    this.pdf.rect(x - 1.1, y - 1.1, 2.2, 2.2, 'F');
  }

  /** tabla simple, con encabezado negro y filas cebra crema */
  tabla(cols: { t: string; w: number; align?: 'left' | 'right' }[], filas: string[][], marcar?: (i: number) => RGB | null) {
    const total = cols.reduce((a, c) => a + c.w, 0);
    const ws = cols.map((c) => (c.w / total) * ANCHO);
    const cabecera = () => {
      this.espacio(9);
      this.fill(C.negro);
      this.pdf.rect(M, this.y - 4.6, ANCHO, 6.6, 'F');
      this.font('bold', 8);
      this.color(C.crema);
      let x = M;
      cols.forEach((c, i) => {
        const w = ws[i]!;
        this.pdf.text(c.t.toUpperCase(), c.align === 'right' ? x + w - 2 : x + 2, this.y, { align: c.align === 'right' ? 'right' : 'left' });
        x += w;
      });
      this.y += 4.4;
    };
    cabecera();
    filas.forEach((fila, fi) => {
      this.font('normal', 8.8);
      const partidas = fila.map((celda, i) => this.pdf.splitTextToSize(limpio(celda) || '—', ws[i]! - 4) as string[]);
      const h = Math.max(...partidas.map((p) => p.length)) * 3.9 + 3;
      if (this.y + h > H - 16) {
        this.nuevaPagina();
        cabecera();
      }
      if (fi % 2 === 0) {
        this.fill(C.crema);
        this.pdf.rect(M, this.y - 1.2, ANCHO, h, 'F');
      }
      const m = marcar?.(fi);
      if (m) {
        this.fill(m);
        this.pdf.rect(M, this.y - 1.2, 1.4, h, 'F');
      }
      let x = M;
      this.color(C.negro);
      partidas.forEach((p, i) => {
        const w = ws[i]!;
        const right = cols[i]!.align === 'right';
        this.font(i === 0 ? 'bold' : 'normal', 8.8);
        this.pdf.text(p, right ? x + w - 2 : x + 2.5, this.y + 2.6, { align: right ? 'right' : 'left' });
        x += w;
      });
      this.y += h;
    });
    this.y += 4;
  }

  /** sello tipo stamp (balance / estado) */
  sello(x: number, y: number, texto: string, c: RGB) {
    this.font('bold', 14);
    const tw = this.pdf.getTextWidth(texto);
    this.stroke(c);
    this.pdf.setLineWidth(1.2);
    this.poly(
      [
        [x, y],
        [x + tw + 10, y - 1.5],
        [x + tw + 10.6, y + 10],
        [x + 0.6, y + 11],
      ],
      'S',
    );
    this.pdf.setLineWidth(0.2);
    this.color(c);
    this.pdf.text(texto, x + 5.2, y + 6.9);
  }

  pies() {
    const total = this.pdf.getNumberOfPages();
    for (let i = 2; i <= total; i++) {
      this.pdf.setPage(i);
      this.font('normal', 7.5);
      this.color(C.gris);
      this.pdf.text('Baila La Chola · producción autogestiva · @bailalachola', M, H - 8);
      this.pdf.text(`${i} / ${total}`, W - M, H - 8, { align: 'right' });
    }
  }
}

/* ------------------------------------------------------------------ */

function portada(d: Doc, f: Fecha) {
  const p = d.pdf;
  d.fill(C.negro);
  p.rect(0, 0, W, H, 'F');

  // textura: líneas tipo diario muy sutiles
  d.stroke([40, 34, 37]);
  p.setLineWidth(0.15);
  for (let y = 8; y < H; y += 3.2) p.line(0, y, W, y);

  // recortes de color
  d.fill(C.violeta);
  d.poly([
    [W - 78, 18],
    [W + 4, 10],
    [W + 4, 92],
    [W - 64, 104],
  ]);
  d.fill(C.naranja);
  d.poly([
    [-4, H - 96],
    [74, H - 108],
    [86, H - 40],
    [-4, H - 26],
  ]);

  // papel crema con "BITÁCORA CHOLA"
  d.fill(C.crema);
  d.poly([
    [M - 4, 52],
    [146, 46],
    [148, 70],
    [M - 2, 74],
  ]);
  d.cinta(132, 40, 26, 9, 3, C.amarillo);
  d.font('bold', 26);
  d.color(C.negro);
  p.text('BITÁCORA CHOLA', M + 2, 63);
  d.font('bold', 10);
  d.color(C.magenta);
  p.text('DE PRODUCCIÓN', M + 2, 70.5);

  // título de la fecha
  d.font('bold', 30);
  d.color(C.crema);
  const lineas = p.splitTextToSize(limpio(f.nombre).toUpperCase(), ANCHO) as string[];
  let y = 98;
  lineas.slice(0, 4).forEach((l) => {
    p.text(l, M, y);
    y += 12.5;
  });

  // subrayado magenta + "Baila La Chola"
  d.stroke(C.magenta);
  p.setLineWidth(2.2);
  p.line(M, y - 6, M + 92, y - 8);
  p.setLineWidth(0.2);
  d.fill(C.magenta);
  d.poly([
    [M - 1, y + 2],
    [M + 78, y - 1],
    [M + 79, y + 13],
    [M, y + 15],
  ]);
  d.font('bolditalic', 20);
  d.color(C.blanco);
  p.text('Baila La Chola', M + 5, y + 10);

  d.estrella(W - 34, y + 6, 9, C.amarillo);
  d.estrella(W - 52, 128, 4.5, C.magenta);
  d.estrella(36, H - 70, 5, C.amarillo);

  // datos
  const datos: [string, string][] = [
    ['Fecha', fechaLarga(f.fecha)],
    ['Lugar', f.lugar],
    ['Producción', f.responsable],
    ['Estado', ESTADO_LABEL[f.estado]],
  ];
  let dy = H - 78;
  datos.forEach(([k, v]) => {
    if (!v) return;
    d.font('bold', 8);
    d.color(C.amarillo);
    p.text(k.toUpperCase(), 100, dy);
    d.font('normal', 12);
    d.color(C.crema);
    p.text(limpio(v), 100, dy + 5.5);
    dy += 13;
  });

  if (f.cierre.balance) {
    const col = f.cierre.balance === 'positivo' ? C.amarillo : f.cierre.balance === 'mixto' ? C.naranja : C.magenta;
    d.sello(100, H - 102, `BALANCE ${f.cierre.balance.toUpperCase()}`, col);
  }

  d.font('normal', 7.5);
  d.color([150, 140, 140]);
  p.text(`Generada el ${fechaHora(new Date().toISOString())} con La Produ`, W - M, H - 10, { align: 'right' });
}

/** "No aplica" sin ningún detalle no aporta nada a la bitácora */
const soloNoAplica = (r?: Respuesta) => r?.estado === 'na' && !r.detalle?.trim() && !r.notas?.trim() && !r.valor?.trim();

function seccionChecklist(d: Doc, f: Fecha, s: SeccionChecklist) {
  const filas: { label: string; valor: string; notas?: string; alerta?: boolean; anidada?: boolean; aviso?: string }[] = [];
  for (const p of s.preguntas) {
    if (!esVisible({ pregunta: p, seccion: s.id }, f.respuestas)) continue;
    const r = f.respuestas[p.id];
    const v = soloNoAplica(r) ? '' : respuestaLegible(p, r);
    if (v) filas.push({ label: p.label, valor: v, notas: r?.notas, alerta: r?.estado === 'confirmar' });
    if (r?.estado === 'no' && p.alNo) {
      filas.push({ label: '', valor: '', aviso: p.alNo.aviso });
      for (const sub of p.alNo.preguntas) {
        const rs = f.respuestas[sub.id];
        const vs = soloNoAplica(rs) ? '' : respuestaLegible(sub, rs);
        if (vs) filas.push({ label: sub.label, valor: vs, notas: rs?.notas, alerta: rs?.estado === 'confirmar', anidada: true });
      }
    }
  }
  if (!filas.some((x) => x.valor)) return;
  d.y += 2;
  d.subtitulo(s.titulo, C.magenta);
  for (const x of filas) {
    if (x.aviso) {
      d.espacio(10);
      d.fill([255, 240, 214]);
      const lineas = d.pdf.splitTextToSize(limpio(`! ${x.aviso}`), ANCHO - 8) as string[];
      const h = lineas.length * 4.3 + 4;
      d.pdf.rect(M, d.y - 3.6, ANCHO, h, 'F');
      d.fill(C.naranja);
      d.pdf.rect(M, d.y - 3.6, 1.6, h, 'F');
      d.font('bold', 9.2);
      d.color([150, 60, 0]);
      d.pdf.text(lineas, M + 4, d.y + 0.4);
      d.y += h + 1.5;
      continue;
    }
    d.kv((x.anidada ? '› ' : '') + x.label, x.valor + (x.notas ? `\nNotas: ${x.notas}` : ''), x.alerta ? C.naranja : x.anidada ? C.violeta : undefined);
  }
}

const R = (f: Fecha, id: PreguntaCierreId) => (f.cierre.respuestas[id] ?? '').trim();
const RL = (f: Fecha, id: RelatoId) => (f.relato[id] ?? '').trim();
const labelCierre = (id: PreguntaCierreId) => PREGUNTAS_CIERRE.find((q) => q.id === id)?.label ?? id;

/**
 * ESTRUCTURA DE LA BITÁCORA (sigue el formato de cierre de Producción):
 *  1 Datos generales · 2 Contexto y objetivo · 3 Condiciones iniciales y acuerdos
 *  4 Gestión técnica previa · 5 Logística general · 6 Camarín y base de preparación
 *  7 Articulación interna · 8 Plan operativo final · 9 Desarrollo real
 *  10 Técnica y sonido: resultado real · 11 Planificado vs. real · 12 Qué funcionó
 *  13 Aprendizajes · 14 Balance de Producción · 15 Criterios que quedan como antecedente
 *  16 Registro de hitos y decisiones · 17 Estado final y balance económico
 *  Anexo: checklist de producción completo
 * Las secciones vacías no se imprimen y la numeración se ajusta sola.
 */
export function generarBitacora(f: Fecha): jsPDF {
  const d = new Doc(f.nombre);
  portada(d, f);
  d.nuevaPagina();

  // 1. Datos generales
  d.seccion('Datos generales');
  d.kv('Evento', f.evento || f.nombre);
  d.kv('Fecha de presentación', fechaLarga(f.fecha));
  d.kv('Ciudad / lugar', f.lugar);
  if (f.decision) d.kv(f.decision.avanza ? 'Decisión: avanzamos' : 'Decisión: no avanzamos', f.decision.motivo, f.decision.avanza ? undefined : C.naranja);
  d.kv('Espacio', f.direccion ?? f.respuestas.esp_direccion?.valor ?? '');
  d.kv('Tipo de fecha', f.tipo);
  d.kv('Formato', f.formato ?? '');
  d.kv('Proyecto', 'Baila La Chola');
  d.kv('Producción Baila La Chola', f.responsable || 'Sin definir');
  d.kv('Contraparte / contacto', f.contacto ?? '');

  const narrativa = (titulo: string, id: RelatoId) => {
    if (!RL(f, id)) return;
    d.seccion(titulo);
    d.texto(RL(f, id));
  };

  // 2–8 relato previo
  narrativa('Contexto y objetivo de la fecha', 'contexto');
  narrativa('Condiciones iniciales y acuerdos de producción', 'condiciones');
  narrativa('Gestión técnica previa', 'gestionTecnica');
  narrativa('Logística general', 'logistica');
  narrativa('Camarín y base de preparación', 'camarin');
  narrativa('Articulación interna', 'articulacion');
  narrativa('Plan operativo final', 'planOperativo');

  // 9. Desarrollo real (+ lo que no funcionó, problemas e imprevistos)
  const idsDesarrollo = ['noFunciono', 'problemas', 'inesperado'] as const;
  if (RL(f, 'desarrolloReal') || idsDesarrollo.some((id) => R(f, id))) {
    d.seccion('Desarrollo real de la fecha');
    if (RL(f, 'desarrolloReal')) d.texto(RL(f, 'desarrolloReal'));
    for (const id of idsDesarrollo) {
      if (!R(f, id)) continue;
      d.subtitulo(labelCierre(id));
      d.texto(R(f, id));
    }
  }

  // 10. Técnica y sonido
  narrativa('Técnica y sonido: resultado real', 'resultadoTecnico');

  // 11. Planificado vs. real
  const filas = [
    ...COMPARABLES.filter((u) => esVisible(u, f.respuestas)).map((u) => ({
      tema: u.pregunta.comparable!,
      plan: valorPlanificado(u.pregunta.id, f.respuestas),
      real: (f.cierre.real[u.pregunta.id] ?? '').trim(),
      balance: f.cierre.balanceItem[u.pregunta.id] ?? '',
    })),
    ...f.cierre.itemsExtra.map((i) => ({ tema: i.tema, plan: i.planificado, real: i.real.trim(), balance: i.balance ?? '' })),
  ].filter((x) => x.tema.trim() && x.real);
  if (filas.length) {
    d.seccion('Planificado vs. real');
    const conBalance = filas.some((x) => x.balance);
    const COLOR_BAL: Record<string, RGB> = {
      'Riesgo materializado': C.naranja,
      'Desvío asumible': C.amarillo,
      'No cumplido': C.magenta,
    };
    d.tabla(
      [
        { t: 'Tema', w: 24 },
        { t: 'Planificado / acordado', w: 28 },
        { t: 'Resultado real', w: 28 },
        ...(conBalance ? [{ t: 'Balance', w: 20 }] : []),
      ],
      filas.map((x) => [x.tema, x.plan || '—', x.real, ...(conBalance ? [x.balance || '—'] : [])]),
      (i) => {
        const x = filas[i]!;
        if (x.balance) return COLOR_BAL[x.balance] ?? C.violeta;
        return x.plan && x.real.toLowerCase() !== x.plan.toLowerCase() ? C.magenta : null;
      },
    );
  }

  // 12. Qué funcionó
  if (R(f, 'funciono')) {
    d.seccion('Qué funcionó');
    d.texto(R(f, 'funciono'));
  }

  // 13. Aprendizajes
  if (RL(f, 'aprendizajes') || R(f, 'volveriamos') || R(f, 'cambiariamos')) {
    d.seccion('Aprendizajes para próximas fechas');
    if (RL(f, 'aprendizajes')) d.texto(RL(f, 'aprendizajes'));
    for (const id of ['volveriamos', 'cambiariamos'] as const) {
      if (!R(f, id)) continue;
      d.subtitulo(labelCierre(id));
      d.texto(R(f, id));
    }
  }

  // 14. Balance de Producción
  if (f.cierre.balance || R(f, 'balanceTexto') || R(f, 'relacion') || R(f, 'publico')) {
    d.seccion('Balance de Producción');
    if (f.cierre.balance) {
      d.espacio(18);
      const col = f.cierre.balance === 'positivo' ? C.violeta : f.cierre.balance === 'mixto' ? C.naranja : C.magenta;
      d.sello(M, d.y - 2, f.cierre.balance.toUpperCase(), col);
      d.y += 16;
    }
    if (R(f, 'balanceTexto')) d.texto(R(f, 'balanceTexto'));
    for (const id of ['relacion', 'publico'] as const) {
      if (!R(f, id)) continue;
      d.subtitulo(labelCierre(id));
      d.texto(R(f, id));
    }
  }

  // 15. Criterios que quedan como antecedente (+ distinción de riesgos)
  const riesgos = [
    ...riesgosDerivados(f).map((r) => ({ ...r, resultado: f.cierre.resultadoRiesgo[r.id] })),
    ...f.riesgos.filter((r) => r.descripcion.trim()),
  ];
  if (RL(f, 'criterios') || riesgos.length || R(f, 'riesgosPrevistos')) {
    d.seccion('Criterios que quedan como antecedente');
    if (RL(f, 'criterios')) d.texto(RL(f, 'criterios'));
    if (R(f, 'riesgosPrevistos')) {
      d.subtitulo(labelCierre('riesgosPrevistos'));
      d.texto(R(f, 'riesgosPrevistos'));
    }
    const COLOR_RIESGO: Record<TipoRiesgo, RGB> = { minima: C.violeta, asumido: C.naranja, inesperado: C.magenta };
    for (const t of ['minima', 'asumido', 'inesperado'] as TipoRiesgo[]) {
      const lista = riesgos.filter((r) => r.tipo === t);
      if (!lista.length) continue;
      d.subtitulo(TIPO_RIESGO_LABEL[t], COLOR_RIESGO[t]);
      for (const r of lista) {
        d.vinieta(r.descripcion, COLOR_RIESGO[t]);
        if (r.resultado) d.parrafo(`Qué pasó: ${r.resultado}`, { size: 9, color: C.gris, estilo: 'italic', indent: 5 });
      }
    }
  }

  // 16. Registro de hitos y decisiones
  if (f.updates.length) {
    d.seccion('Registro de hitos y decisiones');
    const ups = [...f.updates].sort((a, b) => a.cuando.localeCompare(b.cuando));
    d.tabla(
      [
        { t: 'Momento', w: 20 },
        { t: 'Tema', w: 18 },
        { t: 'Registro', w: 62 },
      ],
      ups.map((u) => [
        u.momento || fechaHora(u.cuando),
        u.tema || u.categoria,
        u.texto + (u.autor && u.autor !== 'Producción' ? ` (${u.autor})` : ''),
      ]),
      (i) => {
        const c = ups[i]!.categoria;
        return c === 'DECISIÓN' ? C.magenta : c === 'CAMBIO' ? C.naranja : c === 'RESUELTO' ? C.violeta : null;
      },
    );
    d.parrafo('Marca magenta: decisión · naranja: cambio · violeta: resuelto.', { size: 8, color: C.gris, estilo: 'italic' });
  }

  // Ensayos ad hoc
  const ensayos = [...(f.ensayos ?? [])].sort((a, b) => (a.dia || '9').localeCompare(b.dia || '9'));
  if (ensayos.length) {
    d.seccion('Ensayos');
    d.tabla(
      [
        { t: 'Día', w: 20 },
        { t: 'Ensayo', w: 60 },
        { t: 'Estado', w: 20 },
      ],
      ensayos.map((e) => [
        [etiquetaDia(e.dia), horarioEnsayo(e)].filter(Boolean).join('\n'),
        [
          nombreEnsayo(e),
          [e.lugar, e.direccion].filter(Boolean).join(' — '),
          e.objetivo && `Qué: ${e.objetivo}`,
          [e.traslado, e.encuentro && `encuentro: ${e.encuentro}`, e.salida && `salida: ${e.salida}`].filter(Boolean).join(' · '),
          e.costo && `Costo: ${e.costo}`,
          e.notas,
        ]
          .filter(Boolean)
          .join('\n'),
        ESTADO_ENSAYO_LABEL[e.estado],
      ]),
      (i) => (ensayos[i]!.estado === 'cancelado' ? C.gris : ensayos[i]!.estado === 'confirmado' || ensayos[i]!.estado === 'hecho' ? C.violeta : C.naranja),
    );
  }

  // Links y archivos
  if (f.links.length) {
    d.seccion('Links y archivos');
    for (const c of CATEGORIAS_LINK_FECHA) {
      const lista = f.links.filter((l) => l.categoria === c.id);
      if (!lista.length) continue;
      d.subtitulo(c.label, C.violeta);
      for (const l of lista) d.enlace(l.titulo || l.url, l.url, l.nota);
    }
  }

  // 17. Estado final y balance económico
  d.seccion('Estado final y balance económico');
  const balances = balancesPorMoneda(f.movimientos);
  if (balances.length) {
    d.parrafo('Balances separados por moneda. Pesos y dólares nunca se suman entre sí.', {
      size: 8.5,
      color: C.gris,
      estilo: 'italic',
    });
    for (const b of balances) {
      d.subtitulo(b.moneda, C.magenta);
      if (b.ingresos) d.kv(`Ingresos ${b.moneda}`, formatoMonto(b.ingresos, b.moneda));
      if (b.egresos) d.kv(`${b.ingresos ? 'Egresos' : 'Gastos'} ${b.moneda}`, formatoMonto(b.egresos, b.moneda));
      if (b.ingresos) d.kv(`Saldo ${b.moneda}`, formatoMonto(b.saldo, b.moneda), b.saldo < 0 ? C.magenta : C.amarillo);
    }
    if (balances.length > 1) {
      d.parrafo(
        'El saldo en pesos no incluye los movimientos en dólares, por lo que todavía no representa el resultado económico total de la fecha.',
        { size: 9, estilo: 'italic' },
      );
    }
    d.y += 2;
    const movs = [...f.movimientos].sort((a, b) =>
      a.moneda === b.moneda ? (a.tipo === b.tipo ? a.fecha.localeCompare(b.fecha) : a.tipo === 'ingreso' ? -1 : 1) : a.moneda === 'ARS' ? -1 : 1,
    );
    d.tabla(
      [
        { t: 'Concepto', w: 38 },
        { t: 'Categoría', w: 15 },
        { t: 'Quién', w: 18 },
        { t: 'Estado', w: 17 },
        { t: 'Monto', w: 18, align: 'right' },
      ],
      movs.map((m) => [
        m.concepto + (m.observaciones ? ` (${m.observaciones})` : ''),
        m.categoria,
        [m.pago && `pagó ${m.pago}`, m.recibio && `recibió ${m.recibio}`].filter(Boolean).join(' / '),
        ESTADO_MOV_LABEL[m.estado],
        `${m.tipo === 'ingreso' ? '+' : '-'} ${formatoMonto(m.monto, m.moneda)}`,
      ]),
      (i) => (movs[i]!.estado !== 'confirmado' ? C.naranja : null),
    );
  }

  const abiertos = pendientesAbiertos(f);
  const movsAb = f.movimientos.filter((m) => m.estado !== 'confirmado');
  d.kv('Estado de la fecha', ESTADO_LABEL[f.estado]);
  if (f.cierre.cerradaEn) d.kv('Cerrada el', fechaHora(f.cierre.cerradaEn));
  if (abiertos.length) {
    d.subtitulo('Pendientes abiertos', C.naranja);
    for (const p of abiertos) d.vinieta(`${p.descripcion}${p.responsable ? ` (${p.responsable})` : ''}`, C.naranja, 4);
  }
  if (movsAb.length) {
    d.subtitulo('Plata a confirmar', C.naranja);
    for (const m of movsAb) d.vinieta(`${m.concepto}: ${formatoMonto(m.monto, m.moneda)} — ${ESTADO_MOV_LABEL[m.estado]}`, C.naranja, 4);
  }
  const cierreTexto =
    f.estado === 'cerrada'
      ? `Fecha realizada y cerrada. ${abiertos.length ? `Quedan ${abiertos.length} pendiente(s) abiertos.` : 'No quedan pendientes operativos de la presentación.'} La bitácora se conserva como registro de decisiones, ejecución y aprendizajes para futuras producciones de Baila La Chola.`
      : `Fecha en estado "${ESTADO_LABEL[f.estado]}". Esta bitácora es un registro parcial de la producción.`;
  d.y += 3;
  d.parrafo(cierreTexto, { size: 10, estilo: 'bold' });

  // Anexo: checklist completo
  if (CHECKLIST.some((s) => s.preguntas.some((p) => !soloNoAplica(f.respuestas[p.id]) && respuestaLegible(p, f.respuestas[p.id])))) {
    d.seccion('Anexo: checklist de producción', false);
    for (const s of CHECKLIST) seccionChecklist(d, f, s);
  }

  d.pies();
  return d.pdf;
}

export function nombreArchivo(f: Fecha): string {
  const base = f.nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `bitacora-chola-${base || 'fecha'}.pdf`;
}
