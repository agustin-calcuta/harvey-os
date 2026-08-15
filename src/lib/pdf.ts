import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Compromiso, Estado, Reunion } from '../types'
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
   objetivo y proponente, conclusiones, tareas y observaciones.
   ───────────────────────────────────────────────────────────── */

const NEGRO: [number, number, number] = [10, 10, 10]
const ROJO: [number, number, number] = [192, 57, 43]
const GRIS: [number, number, number] = [120, 120, 120]
const LINEA: [number, number, number] = [215, 213, 209]

const M = 42 // margen lateral

/**
 * Arma el documento sin descargarlo. Separado para poder inspeccionarlo.
 *
 * `pendientesIncluidos` son los ids que el organizador tildó uno por
 * uno: el criterio de qué viejo entra en la minuta es suyo, no
 * automático.
 */
export function construirMinuta(
  estado: Estado,
  r: Reunion,
  opciones?: { pendientesIncluidos?: string[] },
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const temas = agendaDe(estado, r.id)
  const compromisos = compromisosDe(estado, r.id)
  const elegidos = new Set(opciones?.pendientesIncluidos ?? [])
  const arrastrados = compromisosArrastrados(estado, r.id).filter((c) => elegidos.has(c.id))

  /* ── Cabecera ── */
  doc.setFillColor(...NEGRO)
  doc.rect(0, 0, ancho, 112, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text((estado.config.organizacion || 'Impor Bamas').toUpperCase(), M, 52)

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

  /* ── Próximos pasos ── */
  y = salto(doc, y, 95)
  y = titulo(doc, 'PRÓXIMOS PASOS', y)
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
      head: [['TAREA', 'RESPONSABLE', 'FECHA LÍMITE', 'ESTADO']],
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
    doc.text('No se registraron tareas en esta reunión.', M, y)
    y += 28
  }

  /* ── Arrastre de reuniones anteriores ── */
  if (arrastrados.length) {
    y = salto(doc, y, 95)
    y = titulo(doc, 'TAREAS QUE SIGUEN ABIERTAS DE ANTES', y)
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
      head: [['TAREA', 'RESPONSABLE', 'FECHA LÍMITE', 'ESTADO']],
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
    doc.text(
      `${(estado.config.organizacion || 'Impor Bamas').toUpperCase()}  ·  MINUTA GENERADA AUTOMÁTICAMENTE`,
      M,
      alto - 28,
    )
    doc.text(`${i} / ${paginas}`, ancho - M, alto - 28, { align: 'right' })
  }

  return doc
}

export function generarMinutaPDF(
  estado: Estado,
  r: Reunion,
  opciones?: { pendientesIncluidos?: string[] },
) {
  const doc = construirMinuta(estado, r, opciones)
  doc.save(`minuta-${slug(r.titulo)}-${fechaCorta(r.fecha).replace(/\//g, '-')}.pdf`)
}

/* ─────────────────────────────────────────────────────────────
   Pendientes de una persona.

   Fran lo pidió mirando la pantalla: "quiero que cada uno de mi
   equipo tenga el listado de sus tareas para tenerlo a
   mano", porque hay gente que no abre el correo y sí el WhatsApp.
   ───────────────────────────────────────────────────────────── */

export function construirPendientes(
  estado: Estado,
  usuarioId: string,
  compromisos: Compromiso[],
  contexto?: string,
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const abiertos = compromisos
    .filter((c) => c.responsableId === usuarioId && c.estado !== 'hecho')
    .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))

  /* ── Cabecera ── */
  doc.setFillColor(...NEGRO)
  doc.rect(0, 0, ancho, 104, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text((estado.config.organizacion || 'Impor Bamas').toUpperCase(), M, 50)

  doc.setFillColor(...ROJO)
  doc.rect(M, 60, 30, 3, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(170, 170, 170)
  doc.text('TUS TAREAS', M, 80)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(nombreDe(estado, usuarioId).toUpperCase(), M, 96)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`AL ${fechaCorta(new Date().toISOString())}`, ancho - M, 50, { align: 'right' })
  if (contexto) doc.text(contexto.toUpperCase(), ancho - M, 64, { align: 'right' })

  let y = 132

  if (!abiertos.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(...GRIS)
    doc.text('No tenés compromisos abiertos. Todo al día.', M, y)
    return doc
  }

  const vencidos = abiertos.filter(
    (c) => c.fechaLimite && new Date(c.fechaLimite).getTime() < Date.now(),
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(40, 40, 40)
  doc.text(
    vencidos.length
      ? `${abiertos.length} compromisos abiertos, ${vencidos.length} de ellos vencidos.`
      : `${abiertos.length} compromisos abiertos.`,
    M,
    y,
  )
  y += 22

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
    styles: { fontSize: 9, cellPadding: 8, lineColor: LINEA, lineWidth: 0.5, textColor: NEGRO },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 78, halign: 'center' },
      3: { cellWidth: 64, halign: 'center' },
    },
    head: [['', 'QUÉ TENÉS QUE HACER', 'PARA CUÁNDO', 'ESTADO']],
    body: abiertos.map((c) => [
      '',
      c.detalle ? `${c.accion}\n${c.detalle}` : c.accion,
      c.fechaLimite ? fechaCorta(c.fechaLimite) : 'A definir',
      ESTADO_COMPROMISO[c.estado].nombre,
    ]),
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const c = abiertos[data.row.index]
      if (!c) return
      const vencido = c.fechaLimite && new Date(c.fechaLimite).getTime() < Date.now()
      if (data.column.index === 2 && vencido) {
        data.cell.styles.textColor = ROJO
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.column.index === 3) data.cell.styles.textColor = GRIS
    },
    // Casilla para tildar a mano y barra de importancia al costado.
    didDrawCell: (data) => {
      if (data.section !== 'body') return
      const c = abiertos[data.row.index]
      if (!c) return
      if (data.column.index === 0) {
        doc.setDrawColor(...GRIS)
        doc.setLineWidth(0.7)
        doc.rect(data.cell.x + 6, data.cell.y + data.cell.height / 2 - 4.5, 9, 9)
      }
      if (data.column.index === 1) {
        doc.setFillColor(IMPORTANCIA[c.importancia].hex)
        doc.rect(data.cell.x + 1, data.cell.y + 1, 2.5, data.cell.height - 2, 'F')
      }
    },
  })

  const alto = doc.internal.pageSize.getHeight()
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINEA)
    doc.setLineWidth(0.5)
    doc.line(M, alto - 42, ancho - M, alto - 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text(
      `${(estado.config.organizacion || 'Impor Bamas').toUpperCase()}  ·  LISTADO GENERADO AUTOMÁTICAMENTE`,
      M,
      alto - 28,
    )
    doc.text(`${i} / ${paginas}`, ancho - M, alto - 28, { align: 'right' })
  }

  return doc
}

export function generarPendientesPDF(
  estado: Estado,
  usuarioId: string,
  compromisos: Compromiso[],
  contexto?: string,
) {
  const doc = construirPendientes(estado, usuarioId, compromisos, contexto)
  doc.save(`pendientes-${slug(nombreDe(estado, usuarioId))}.pdf`)
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
