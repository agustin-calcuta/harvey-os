import type { Compromiso, Estado, Reunion, Tema } from '../types'
import { IMPORTANCIA, OBJETIVOS } from '../types'
import { agendaDe, compromisosDe, fechaCorta, fechaLarga, hora, minutosAgenda, nombreDe } from './utils'

/* ─────────────────────────────────────────────────────────────
   Composición de los dos correos automáticos que pidió Fran:
   1. al cerrar el temario, antes de la reunión
   2. al cerrar la reunión, con conclusiones y tareas
   ───────────────────────────────────────────────────────────── */

/* Mismos valores que el tema de la aplicación. */
const ROJO = '#C0392B'
const TINTA = '#14120F'
const FONDO = '#F7F5F1'
const SUAVE = '#6B665D'
const TENUE = '#9A948A'
const BORDE = '#E3DED4'

const layout = (titulo: string, kicker: string, cuerpo: string, marca: string) => `
<div style="background:${FONDO};padding:32px 16px;font-family:Inter,Helvetica,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid ${BORDE}">
    <div style="padding:28px 32px;border-bottom:1px solid ${BORDE}">
      <div style="font-size:10px;letter-spacing:3px;color:${SUAVE};text-transform:uppercase">[ ${kicker} ]</div>
      <div style="font-size:32px;font-weight:800;color:${TINTA};letter-spacing:-0.5px;text-transform:uppercase;margin-top:10px;line-height:1.1">${titulo}</div>
    </div>
    <div style="padding:28px 32px;color:#2C2924;font-size:14px;line-height:1.65">${cuerpo}</div>
    <div style="padding:18px 32px;border-top:1px solid ${BORDE};font-size:10px;letter-spacing:2px;color:${TENUE};text-transform:uppercase">
      ${marca} · enviado automáticamente
    </div>
  </div>
</div>`

const chip = (texto: string, color: string) =>
  `<span style="display:inline-block;padding:2px 8px;border:1px solid ${color};color:${color};font-size:10px;letter-spacing:1.5px;text-transform:uppercase">${texto}</span>`

const filaTema = (e: Estado, t: Tema, i: number) => `
<tr>
  <td style="padding:12px 0;border-bottom:1px solid ${BORDE};vertical-align:top;width:28px;color:${TENUE};font-size:12px">${String(i + 1).padStart(2, '0')}</td>
  <td style="padding:12px 0;border-bottom:1px solid ${BORDE};vertical-align:top">
    <div style="color:${TINTA};font-weight:700;font-size:15px">${t.titulo}</div>
    ${t.detalle ? `<div style="color:${SUAVE};font-size:13px;margin-top:4px">${t.detalle}</div>` : ''}
    <div style="margin-top:8px">
      ${chip(IMPORTANCIA[t.importancia].nombre, IMPORTANCIA[t.importancia].hex)}
      ${chip(OBJETIVOS[t.objetivo].nombre, SUAVE)}
      <span style="color:${TENUE};font-size:11px;margin-left:6px">Propuso ${nombreDe(e, t.propuestoPor)} · ${t.duracionMin} min</span>
    </div>
  </td>
</tr>`

/* ── 1. Temario cerrado ───────────────────────────────────── */

export function correoAgendaCerrada(e: Estado, r: Reunion) {
  const temas = agendaDe(e, r.id)
  const total = minutosAgenda(temas)
  const cuerpo = `
    <p style="margin:0 0 20px">
      Quedó cerrado el temario de <strong style="color:${TINTA}">${r.titulo}</strong>.
      Nos vemos el <strong style="color:${TINTA}">${fechaLarga(r.fecha)} a las ${hora(r.fecha)}</strong>${r.lugar ? ` en ${r.lugar}` : ''}.
    </p>
    <div style="border:1px solid ${BORDE};padding:16px;margin-bottom:24px">
      <span style="color:${SUAVE};font-size:12px">Modera</span>
      <span style="color:${TINTA};font-size:13px;margin-left:8px">${nombreDe(e, r.moderadorId)}</span>
      <span style="color:${SUAVE};font-size:12px;margin-left:20px">Temas</span>
      <span style="color:${TINTA};font-size:13px;margin-left:8px">${temas.length}</span>
      <span style="color:${SUAVE};font-size:12px;margin-left:20px">Duración</span>
      <span style="color:${total > r.duracionPrevistaMin ? ROJO : TINTA};font-size:13px;margin-left:8px">${total} min</span>
    </div>
    <div style="font-size:10px;letter-spacing:3px;color:${SUAVE};text-transform:uppercase;margin-bottom:8px">[ Temas a tratar ]</div>
    <table style="width:100%;border-collapse:collapse">${temas.map((t, i) => filaTema(e, t, i)).join('')}</table>
    <p style="margin:24px 0 0;color:${SUAVE};font-size:13px">
      Llegá con los temas leídos. Ya no se aceptan temas nuevos para esta reunión.
    </p>`

  const texto = [
    `Temario cerrado — ${r.titulo}`,
    `${fechaLarga(r.fecha)} a las ${hora(r.fecha)}${r.lugar ? ` · ${r.lugar}` : ''}`,
    `Modera: ${nombreDe(e, r.moderadorId)}`,
    `Duración estimada: ${total} min`,
    '',
    'TEMAS A TRATAR',
    ...temas.map(
      (t, i) =>
        `${i + 1}. ${t.titulo} (${t.duracionMin} min) — ${OBJETIVOS[t.objetivo].nombre} · importancia ${IMPORTANCIA[t.importancia].nombre} · propuso ${nombreDe(e, t.propuestoPor)}`,
    ),
  ].join('\n')

  return {
    asunto: `Temario cerrado · ${r.titulo}`,
    html: layout('Temario cerrado', 'Antes de la reunión', cuerpo, e.config.organizacion),
    texto,
  }
}

/* ── 2. Minuta post-reunión ───────────────────────────────── */

const filaCompromiso = (e: Estado, c: Compromiso) => `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${BORDE};color:${TINTA};font-size:13px">
    ${c.accion}
    ${c.detalle ? `<div style="color:${SUAVE};font-size:12px;margin-top:3px">${c.detalle}</div>` : ''}
  </td>
  <td style="padding:10px 12px;border-bottom:1px solid ${BORDE};color:#2C2924;font-size:13px;white-space:nowrap">${nombreDe(e, c.responsableId)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${BORDE};color:${IMPORTANCIA[c.importancia].hex};font-size:13px;white-space:nowrap">${fechaCorta(c.fechaLimite)}</td>
</tr>`

export function correoMinuta(e: Estado, r: Reunion) {
  const temas = agendaDe(e, r.id)
  const comps = compromisosDe(e, r.id)

  const bloquesTemas = temas
    .map(
      (t, i) => `
    <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid ${BORDE}">
      <div style="color:${TINTA};font-weight:700;font-size:15px">${String(i + 1).padStart(2, '0')} · ${t.titulo}</div>
      <div style="margin:8px 0">
        ${chip(OBJETIVOS[t.objetivo].nombre, SUAVE)}
        <span style="color:${TENUE};font-size:11px;margin-left:6px">Propuso ${nombreDe(e, t.propuestoPor)}</span>
      </div>
      <div style="color:#2C2924;font-size:13px;line-height:1.6;white-space:pre-wrap">${t.conclusiones ?? `<span style="color:${TENUE}">Sin conclusiones registradas.</span>`}</div>
    </div>`,
    )
    .join('')

  const cuerpo = `
    <p style="margin:0 0 20px">
      Cerramos <strong style="color:${TINTA}">${r.titulo}</strong> del ${fechaLarga(r.fecha)}.
      Acá quedan las conclusiones y las tareas que se llevó cada uno.
    </p>
    ${
      r.conclusionesGenerales
        ? `<div style="font-size:10px;letter-spacing:3px;color:${SUAVE};text-transform:uppercase;margin-bottom:8px">[ Principales conclusiones ]</div>
           <div style="border-left:2px solid ${ROJO};padding-left:14px;color:#2C2924;font-size:14px;line-height:1.65;margin-bottom:28px;white-space:pre-wrap">${r.conclusionesGenerales}</div>`
        : ''
    }
    <div style="font-size:10px;letter-spacing:3px;color:${SUAVE};text-transform:uppercase;margin-bottom:12px">[ Tema por tema ]</div>
    ${bloquesTemas}
    <div style="font-size:10px;letter-spacing:3px;color:${SUAVE};text-transform:uppercase;margin:28px 0 8px">[ Próximos pasos ]</div>
    ${
      comps.length
        ? `<table style="width:100%;border-collapse:collapse">
            <tr>
              <th style="text-align:left;padding-bottom:8px;border-bottom:1px solid ${BORDE};color:${SUAVE};font-size:10px;letter-spacing:2px;text-transform:uppercase">Acción</th>
              <th style="text-align:left;padding:0 12px 8px;border-bottom:1px solid ${BORDE};color:${SUAVE};font-size:10px;letter-spacing:2px;text-transform:uppercase">Responsable</th>
              <th style="text-align:left;padding-bottom:8px;border-bottom:1px solid ${BORDE};color:${SUAVE};font-size:10px;letter-spacing:2px;text-transform:uppercase">Límite</th>
            </tr>
            ${comps.map((c) => filaCompromiso(e, c)).join('')}
          </table>`
        : '<div style="color:${TENUE};font-size:13px">No se registraron compromisos.</div>'
    }
    ${
      r.observaciones
        ? `<div style="font-size:10px;letter-spacing:3px;color:${SUAVE};text-transform:uppercase;margin:28px 0 8px">[ Observaciones adicionales ]</div>
           <div style="color:#2C2924;font-size:13px;line-height:1.6;white-space:pre-wrap">${r.observaciones}</div>`
        : ''
    }
    ${
      r.proximaReunionFecha
        ? `<div style="margin-top:28px;padding:14px 16px;border:1px solid ${BORDE}">
             <span style="color:${SUAVE};font-size:12px">Próxima reunión</span>
             <span style="color:${TINTA};font-size:13px;margin-left:10px">${fechaLarga(r.proximaReunionFecha)} · ${hora(r.proximaReunionFecha)}</span>
           </div>`
        : ''
    }`

  const texto = [
    `Minuta — ${r.titulo}`,
    fechaLarga(r.fecha),
    '',
    r.conclusionesGenerales ? `CONCLUSIONES\n${r.conclusionesGenerales}\n` : '',
    'TEMAS',
    ...temas.map((t, i) => `${i + 1}. ${t.titulo}\n   ${t.conclusiones ?? 'Sin conclusiones.'}`),
    '',
    'PRÓXIMOS COMPROMISOS',
    ...comps.map(
      (c) => `· ${c.accion} — ${nombreDe(e, c.responsableId)} — vence ${fechaCorta(c.fechaLimite)}`,
    ),
    r.observaciones ? `\nOBSERVACIONES\n${r.observaciones}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    asunto: `Minuta · ${r.titulo}`,
    html: layout('Minuta de reunión', 'Después de la reunión', cuerpo, e.config.organizacion),
    texto,
  }
}

/* ── Envío ────────────────────────────────────────────────── */

const EMAILJS = {
  servicio: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  plantilla: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  clave: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
}

export const correoConfigurado = Boolean(
  (EMAILJS.servicio && EMAILJS.plantilla && EMAILJS.clave) ||
    import.meta.env.VITE_EMAIL_ENDPOINT,
)

export interface Payload {
  destinatarios: string[]
  asunto: string
  html: string
  texto: string
}

/**
 * Punto único de salida de correo.
 *
 * GitHub Pages es estático: no hay proceso propio que pueda mandar mails.
 * El envío sale del navegador a través de EmailJS, que despacha desde la
 * casilla conectada en su panel.
 *
 * Sin proveedor configurado el correo igual se compone entero y queda
 * registrado en la plataforma: se puede ver, copiar o abrir en el cliente
 * de correo. Por eso el estado 'simulado' no es un error.
 *
 * `VITE_EMAIL_ENDPOINT` queda como alternativa para cuando el envío pase
 * por un backend propio (Resend detrás de una función, por ejemplo).
 */
export async function enviarCorreo(payload: Payload): Promise<'simulado' | 'enviado'> {
  const endpoint = import.meta.env.VITE_EMAIL_ENDPOINT
  if (endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`El proveedor de correo devolvió ${res.status}`)
    return 'enviado'
  }

  if (!EMAILJS.servicio || !EMAILJS.plantilla || !EMAILJS.clave) return 'simulado'

  // EmailJS despacha un mensaje por llamada, así que se manda uno por
  // persona. Con equipos de este tamaño el costo es despreciable y
  // además cada quien recibe el correo dirigido a él.
  const { default: emailjs } = await import('@emailjs/browser')

  const fallidos: string[] = []
  for (const destinatario of payload.destinatarios) {
    try {
      await emailjs.send(
        EMAILJS.servicio,
        EMAILJS.plantilla,
        {
          to_email: destinatario,
          subject: payload.asunto,
          html: payload.html,
          texto: payload.texto,
        },
        { publicKey: EMAILJS.clave },
      )
    } catch (e) {
      const detalle = e instanceof Error ? e.message : JSON.stringify(e)
      fallidos.push(`${destinatario} (${detalle})`)
    }
  }

  if (fallidos.length === payload.destinatarios.length) {
    throw new Error(`No se pudo enviar a nadie: ${fallidos.join('; ')}`)
  }
  if (fallidos.length) {
    throw new Error(`Enviado con fallas. No llegó a: ${fallidos.join('; ')}`)
  }
  return 'enviado'
}

/** Abre el cliente de correo del usuario con el mensaje ya armado. */
export function abrirEnClienteDeCorreo(destinatarios: string[], asunto: string, texto: string) {
  const url = `mailto:${destinatarios.join(',')}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`
  window.open(url, '_blank')
}
