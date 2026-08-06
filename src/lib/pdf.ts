import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Estado, Reunion } from '../types'
import { IMPORTANCIA, OBJETIVOS, ESTADO_COMPROMISO } from '../types'
import {
  agendaDe,
  compromisosArrastrados,
  compromisosDe,
  fechaCorta,
  hora,
  minutosAgenda,
  nombreDe,
  slug,
} from './utils'

/* ─────────────────────────────────────────────────────────────
   Minuta en PDF.
   Replica el documento que Francisco venía armando a mano:
   participantes / fecha / moderador / próxima reunión, temas con
   objetivo y proponente, conclusiones, compromisos y observaciones.
   ───────────────────────────────────────────────────────────── */

const NEGRO: [number, number, number] = [10, 10, 10]
const ROJO: [number, number, number] = [192, 57, 43]
const GRIS: [number, number, number] = [120, 120, 120]
const LINEA: [number, number, number] = [215, 213, 209]

const M = 42 // margen lateral

/** Arma el documento sin descargarlo. Separado para poder inspeccionarlo. */
export function construirMinuta(
  estado: Estado,
  r: Reunion,
  opciones?: { incluirArrastrados?: boolean },
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const temas = agendaDe(estado, r.id)
  const compromisos = compromisosDe(estado, r.id)
  const arrastrados = opciones?.incluirArrastrados ? compromisosArrastrados(estado, r.id) : []

  /* ── Cabecera ── */
  doc.setFillColor(...NEGRO)
  doc.rect(0, 0, ancho, 112, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text('HARVEY', M, 52)

  doc.setFillColor(...ROJO)
  doc.rect(M, 62, 30, 3, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(170, 170, 170)
  doc.text('MINUTA DE REUNIÓN', M, 82)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(r.titulo.toUpperCase(), M, 98, { maxWidth: ancho - M * 2 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`${fechaCorta(r.fecha)}  ·  ${hora(r.fecha)}`, ancho - M, 52, { align: 'right' })
  if (r.lugar) doc.text(r.lugar, ancho - M, 66, { align: 'right' })

  let y = 140

  /* ── Ficha ── */
  const participantes = r.participantesIds.map((id) => nombreDe(estado, id)).join(', ')
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 7, lineColor: LINEA, lineWidth: 0.5, textColor: NEGRO },
    columnStyles: {
      0: { cellWidth: 92, fontStyle: 'bold', fillColor: [246, 245, 243], textColor: GRIS },
      1: { cellWidth: 180 },
      2: { cellWidth: 92, fontStyle: 'bold', fillColor: [246, 245, 243], textColor: GRIS },
      3: { cellWidth: 'auto' },
    },
    body: [
      ['PARTICIPANTES', participantes, 'FECHA', fechaCorta(r.fecha)],
      [
        'MODERADOR',
        nombreDe(estado, r.moderadorId),
        'PRÓXIMA REUNIÓN',
        r.proximaReunionFecha ? fechaCorta(r.proximaReunionFecha) : 'A definir',
      ],
    ],
  })
  y = (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26

  /* ── Temas tratados ── */
  y = titulo(doc, 'TEMAS A TRATAR', y)
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    headStyles: {
      fillColor: NEGRO,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 6,
    },
    styles: { fontSize: 8.5, cellPadding: 7, lineColor: LINEA, lineWidth: 0.5, textColor: NEGRO },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 84 },
      2: { cellWidth: 96 },
      3: { cellWidth: 56, halign: 'center' },
    },
    head: [['TEMA', 'OBJETIVO', 'QUIÉN PROPUSO', 'TIEMPO']],
    body: temas.map((t) => [
      t.titulo,
      OBJETIVOS[t.objetivo].nombre,
      nombreDe(estado, t.propuestoPor),
      `${t.duracionMin} min`,
    ]),
    // Barra de importancia al costado de cada tema
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 0) return
      const t = temas[data.row.index]
      if (!t) return
      const hex = IMPORTANCIA[t.importancia].hex
      doc.setFillColor(hex)
      doc.rect(data.cell.x + 1, data.cell.y + 1, 2.5, data.cell.height - 2, 'F')
    },
    foot: [['', '', 'TOTAL ASIGNADO', `${minutosAgenda(temas)} min`]],
    footStyles: {
      fillColor: [246, 245, 243],
      textColor: NEGRO,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 6,
    },
  })
  y = (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26

  /* ── Conclusiones generales ── */
  if (r.conclusionesGenerales) {
    y = salto(doc, y, 90)
    y = titulo(doc, 'PRINCIPALES CONCLUSIONES', y)
    y = parrafo(doc, r.conclusionesGenerales, y, ancho)
    y += 18
  }

  /* ── Conclusiones por tema ── */
  const conNotas = temas.filter((t) => t.conclusiones?.trim())
  if (conNotas.length) {
    y = salto(doc, y, 90)
    y = titulo(doc, 'DESARROLLO POR TEMA', y)
    for (const [i, t] of conNotas.entries()) {
      y = salto(doc, y, 70)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...NEGRO)
      doc.text(`${String(i + 1).padStart(2, '0')} · ${t.titulo}`, M, y)
      y += 13
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...GRIS)
      doc.text(
        `${OBJETIVOS[t.objetivo].nombre.toUpperCase()}  ·  IMPORTANCIA ${IMPORTANCIA[t.importancia].nombre.toUpperCase()}  ·  PROPUSO ${nombreDe(estado, t.propuestoPor).toUpperCase()}`,
        M,
        y,
      )
      y += 12
      y = parrafo(doc, t.conclusiones!, y, ancho)
      y += 14
    }
    y += 4
  }

  /* ── Próximos compromisos ── */
  y = salto(doc, y, 95)
  y = titulo(doc, 'PRÓXIMOS COMPROMISOS', y)
  if (compromisos.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: 'grid',
      headStyles: {
        fillColor: NEGRO,
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 6,
      },
      styles: { fontSize: 8.5, cellPadding: 7, lineColor: LINEA, lineWidth: 0.5, textColor: NEGRO },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 108 },
        2: { cellWidth: 74, halign: 'center' },
        3: { cellWidth: 68, halign: 'center' },
      },
      head: [['ACCIÓN / COMPROMISO', 'RESPONSABLE', 'FECHA LÍMITE', 'ESTADO']],
      body: compromisos.map((c) => [
        c.detalle ? `${c.accion}\n${c.detalle}` : c.accion,
        nombreDe(estado, c.responsableId),
        c.fechaLimite ? fechaCorta(c.fechaLimite) : 'A definir',
        ESTADO_COMPROMISO[c.estado].nombre,
      ]),
      didParseCell: (data) => {
        if (data.section !== 'body') return
        const c = compromisos[data.row.index]
        if (!c) return
        if (data.column.index === 0) data.cell.styles.fontStyle = 'normal'
        if (data.column.index === 3) {
          data.cell.styles.textColor = c.estado === 'hecho' ? [90, 120, 40] : GRIS
        }
      },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 0) return
        const c = compromisos[data.row.index]
        if (!c) return
        doc.setFillColor(IMPORTANCIA[c.importancia].hex)
        doc.rect(data.cell.x + 1, data.cell.y + 1, 2.5, data.cell.height - 2, 'F')
      },
    })
    y = (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text('No se registraron compromisos en esta reunión.', M, y)
    y += 28
  }

  /* ── Arrastre de reuniones anteriores ── */
  if (arrastrados.length) {
    y = salto(doc, y, 95)
    y = titulo(doc, 'PENDIENTES DE REUNIONES ANTERIORES', y)
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: 'grid',
      headStyles: {
        fillColor: [246, 245, 243],
        textColor: GRIS,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 6,
      },
      styles: { fontSize: 8, cellPadding: 6, lineColor: LINEA, lineWidth: 0.5, textColor: GRIS },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 108 },
        2: { cellWidth: 74, halign: 'center' },
        3: { cellWidth: 68, halign: 'center' },
      },
      head: [['ACCIÓN / COMPROMISO', 'RESPONSABLE', 'FECHA LÍMITE', 'ESTADO']],
      body: arrastrados.map((c) => [
        c.accion,
        nombreDe(estado, c.responsableId),
        c.fechaLimite ? fechaCorta(c.fechaLimite) : 'A definir',
        ESTADO_COMPROMISO[c.estado].nombre,
      ]),
    })
    y = (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26
  }

  /* ── Observaciones ── */
  if (r.observaciones) {
    y = salto(doc, y, 80)
    y = titulo(doc, 'OBSERVACIONES ADICIONALES', y)
    parrafo(doc, r.observaciones, y, ancho)
  }

  /* ── Pie en todas las páginas ── */
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    const alto = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...LINEA)
    doc.setLineWidth(0.5)
    doc.line(M, alto - 42, ancho - M, alto - 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text('HARVEY OS  ·  MINUTA GENERADA AUTOMÁTICAMENTE', M, alto - 28)
    doc.text(`${i} / ${paginas}`, ancho - M, alto - 28, { align: 'right' })
  }

  return doc
}

export function generarMinutaPDF(
  estado: Estado,
  r: Reunion,
  opciones?: { incluirArrastrados?: boolean },
) {
  const doc = construirMinuta(estado, r, opciones)
  doc.save(`minuta-${slug(r.titulo)}-${fechaCorta(r.fecha).replace(/\//g, '-')}.pdf`)
}

/* ── Auxiliares ───────────────────────────────────────────── */

function titulo(doc: jsPDF, texto: string, y: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...ROJO)
  doc.text(`[ ${texto} ]`, M, y)
  return y + 14
}

function parrafo(doc: jsPDF, texto: string, y: number, ancho: number): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(40, 40, 40)
  const lineas = doc.splitTextToSize(texto, ancho - M * 2)
  const alto = doc.internal.pageSize.getHeight()
  for (const linea of lineas) {
    if (y > alto - 70) {
      doc.addPage()
      y = 60
    }
    doc.text(linea, M, y)
    y += 13
  }
  return y
}

/** Salta de página si no entra un bloque de `necesita` puntos. */
function salto(doc: jsPDF, y: number, necesita: number): number {
  if (y + necesita > doc.internal.pageSize.getHeight() - 70) {
    doc.addPage()
    return 60
  }
  return y
}
