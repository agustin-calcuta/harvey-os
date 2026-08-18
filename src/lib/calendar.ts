import type { Estado, Reunion } from '../types'
import { nombreDe, sala } from './utils'

/* ─────────────────────────────────────────────────────────────
   Google Calendar.

   La reunión que se crea acá aparece en el calendario de todos, con
   su link de Meet, y acompaña si se cambia la fecha o se cancela.

   No hace falta servidor: el permiso se pide desde el navegador con
   Google Identity Services, que devuelve un token de acceso de vida
   corta. El `client_id` es público por diseño —lo que protege la
   cuenta es la lista de orígenes autorizados en Google Cloud, no
   esconderlo—.

   Sin `VITE_GOOGLE_CLIENT_ID` esto queda apagado: `calendarConfigurado`
   es false y la app no ofrece la sincronización.

   ── Para enchufarlo ───────────────────────────────────────────
   1. Google Cloud Console → APIs y servicios → habilitar Calendar API.
   2. Credenciales → ID de cliente de OAuth → Aplicación web.
   3. En «Orígenes autorizados de JavaScript», los dominios desde los
      que se entra: http://localhost:5173 y el de GitHub Pages.
   4. El ID que sale de ahí va en VITE_GOOGLE_CLIENT_ID.

   El permiso se pide **la primera vez que se crea una reunión**, no
   al entrar: pedir acceso al calendario en el login espanta, y quien
   sólo mira minutas no lo necesita nunca.
   ───────────────────────────────────────────────────────────── */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/** Sólo eventos: no se lee el calendario, se escriben los propios. */
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3'
const GSI = 'https://accounts.google.com/gsi/client'

export const calendarConfigurado = Boolean(CLIENT_ID)

/* ── El token ─────────────────────────────────────────────── */

/*
 * Google devuelve un token que dura una hora. Se guarda en memoria y
 * no en localStorage a propósito: es una credencial, y si se pierde
 * al recargar el costo es un clic, no un problema.
 */
let token: { valor: string; hasta: number } | null = null

interface ClienteToken {
  requestAccessToken(opciones?: { prompt?: string }): void
  callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: ClienteToken['callback']
          }): ClienteToken
        }
      }
    }
  }
}

let cargando: Promise<void> | null = null

function cargarGoogle(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (cargando) return cargando
  cargando = new Promise<void>((resolver, rechazar) => {
    const script = document.createElement('script')
    script.src = GSI
    script.async = true
    script.onload = () => resolver()
    script.onerror = () => rechazar(new Error('No se pudo cargar Google.'))
    document.head.appendChild(script)
  })
  return cargando
}

/**
 * Token de acceso, pidiendo permiso si hace falta.
 *
 * `interactivo` en false devuelve lo que haya en memoria y nada más:
 * sirve para actualizar un evento sin abrir una ventana de permiso en
 * medio de otra cosa.
 */
export async function tokenDeCalendario(interactivo = true): Promise<string | null> {
  if (!CLIENT_ID) return null
  if (token && Date.now() < token.hasta) return token.valor
  if (!interactivo) return null

  await cargarGoogle()
  const oauth2 = window.google?.accounts.oauth2
  if (!oauth2) return null

  return new Promise<string | null>((resolver) => {
    const cliente = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) {
          // Cerró la ventana o dijo que no: no es un error, es un no.
          resolver(null)
          return
        }
        token = {
          valor: r.access_token,
          // Un minuto de margen, para no usarlo justo cuando vence.
          hasta: Date.now() + ((r.expires_in ?? 3600) - 60) * 1000,
        }
        resolver(token.valor)
      },
    })
    cliente.requestAccessToken()
  })
}

/** Olvida el permiso de esta sesión. */
export const olvidarCalendario = () => {
  token = null
}

/** Si ya se dio permiso en esta sesión. */
export const hayPermisoDeCalendario = () => Boolean(token && Date.now() < token.hasta)

/* ── Los eventos ──────────────────────────────────────────── */

const fin = (r: Reunion) =>
  new Date(new Date(r.fecha).getTime() + r.duracionPrevistaMin * 60000).toISOString()

function evento(estado: Estado, r: Reunion) {
  const equipo = sala(estado, r.salaId)?.nombre
  return {
    summary: r.titulo,
    description: [
      equipo ? `Equipo: ${equipo}` : '',
      `Modera: ${nombreDe(estado, r.moderadorId)}`,
      '',
      'El temario y la minuta viven en la plataforma.',
    ]
      .filter(Boolean)
      .join('\n'),
    location: r.lugar,
    start: { dateTime: r.fecha },
    end: { dateTime: fin(r) },
    attendees: r.participantesIds
      .map((id) => estado.usuarios.find((u) => u.id === id)?.email)
      .filter((e): e is string => Boolean(e))
      .map((email) => ({ email })),
  }
}

async function llamar(ruta: string, opciones: RequestInit, interactivo = true) {
  const acceso = await tokenDeCalendario(interactivo)
  if (!acceso) return null

  const r = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: {
      ...opciones.headers,
      authorization: `Bearer ${acceso}`,
      'content-type': 'application/json',
    },
  })

  if (r.status === 401) {
    // El token venció antes de tiempo: se pide de nuevo, una sola vez.
    token = null
    if (!interactivo) return null
    return llamar(ruta, opciones, true)
  }
  if (!r.ok) throw new Error(`Google Calendar respondió ${r.status}.`)
  return r.json()
}

export interface EventoCreado {
  /** Id del evento en Google, para poder actualizarlo o cancelarlo. */
  id: string
  /** Link de Meet, si Google lo generó. */
  meet?: string
  /** El evento en el calendario, para abrirlo. */
  url?: string
}

/**
 * Crea el evento y le pide a Google una sala de Meet.
 *
 * `conferenceDataVersion=1` es lo que hace que Meet se genere; sin
 * ese parámetro Google ignora el pedido en silencio.
 */
export async function crearEvento(estado: Estado, r: Reunion): Promise<EventoCreado | null> {
  const datos = await llamar(
    '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      body: JSON.stringify({
        ...evento(estado, r),
        conferenceData: {
          createRequest: {
            requestId: r.id,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    },
  )
  if (!datos) return null
  return { id: datos.id, meet: datos.hangoutLink, url: datos.htmlLink }
}

/** Lleva al evento los cambios de fecha, lugar o participantes. */
export async function actualizarEvento(
  estado: Estado,
  r: Reunion,
  eventoId: string,
): Promise<boolean> {
  const datos = await llamar(
    `/calendars/primary/events/${encodeURIComponent(eventoId)}?sendUpdates=all`,
    { method: 'PATCH', body: JSON.stringify(evento(estado, r)) },
    false,
  )
  return Boolean(datos)
}

/**
 * Cancela el evento y avisa a los invitados.
 *
 * Se borra en vez de marcarlo cancelado: en el calendario de cada uno
 * desaparece, que es lo que se espera cuando se elimina la reunión.
 */
export async function cancelarEvento(eventoId: string): Promise<boolean> {
  const acceso = await tokenDeCalendario(false)
  if (!acceso) return false
  const r = await fetch(
    `${API}/calendars/primary/events/${encodeURIComponent(eventoId)}?sendUpdates=all`,
    { method: 'DELETE', headers: { authorization: `Bearer ${acceso}` } },
  )
  // 410 es "ya estaba borrado": para nosotros es lo mismo que borrarlo.
  return r.ok || r.status === 410
}
