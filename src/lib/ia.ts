import { neon } from './neon'
import type { Estado, Reunion, Tema } from '../types'
import { nombreDe, sala } from './utils'

/* ─────────────────────────────────────────────────────────────
   Grabar una reunión y volver con la minuta escrita.

   Dos mitades. Acá está la del navegador: grabar con el micrófono
   y mandarle el archivo al Worker. La otra —la que tiene la clave
   de Gemini— vive en `worker/`, porque una clave en este bundle la
   lee cualquiera que abra el sitio.

   Sin `VITE_IA_ENDPOINT` esto queda apagado y la app no cambia:
   `iaConfigurada` es false y el botón de grabar no se dibuja. Es el
   mismo trato que tiene el correo.
   ───────────────────────────────────────────────────────────── */

const ENDPOINT = import.meta.env.VITE_IA_ENDPOINT as string | undefined

export const iaConfigurada = Boolean(ENDPOINT)

/** Si el navegador puede grabar. Safari viejo y http:// no pueden. */
export const sePuedeGrabar = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined'

export interface MinutaSugerida {
  conclusionesGenerales: string
  porTema: { temaId?: string; titulo: string; conclusion: string }[]
  proximosPasos: { accion: string; responsable?: string; fechaLimite?: string }[]
  observaciones?: string
}

export interface ResultadoIA {
  transcripcion: string
  resumen: MinutaSugerida
}

/* ── Grabar ───────────────────────────────────────────────── */

export interface Grabacion {
  /** Corta, suelta el micrófono y devuelve el audio. */
  detener(): Promise<Blob>
  /** Corta y tira lo grabado. */
  cancelar(): void
  /** Segundos grabados hasta ahora. */
  segundos(): number
}

/*
 * El formato lo elige el navegador. Chrome y Firefox dan webm/opus,
 * Safari da mp4: Gemini entiende los dos, así que no se fuerza
 * ninguno y se manda el que salga con su propio mime.
 */
const FORMATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', '']

export async function empezarAGrabar(): Promise<Grabacion> {
  const pista = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  })

  const formato = FORMATOS.find((f) => !f || MediaRecorder.isTypeSupported(f)) ?? ''
  const grabador = new MediaRecorder(pista, formato ? { mimeType: formato } : undefined)
  const trozos: Blob[] = []
  grabador.ondataavailable = (e) => {
    if (e.data.size > 0) trozos.push(e.data)
  }

  /*
   * Por trozos de cinco segundos y no uno solo al final: si el navegador
   * se cierra o la pestaña muere, lo grabado hasta ahí ya está en
   * memoria en vez de perderse entero.
   */
  grabador.start(5000)
  const arranque = Date.now()

  const soltarMicrofono = () => pista.getTracks().forEach((t) => t.stop())

  return {
    segundos: () => Math.floor((Date.now() - arranque) / 1000),
    cancelar() {
      if (grabador.state !== 'inactive') grabador.stop()
      soltarMicrofono()
    },
    detener() {
      return new Promise<Blob>((resolver) => {
        grabador.onstop = () => {
          soltarMicrofono()
          resolver(new Blob(trozos, { type: grabador.mimeType || 'audio/webm' }))
        }
        if (grabador.state === 'inactive') grabador.onstop?.(new Event('stop'))
        else grabador.stop()
      })
    },
  }
}

/* ── Mandarlo a procesar ──────────────────────────────────── */

/**
 * Lo que el modelo necesita saber antes de escuchar: de qué reunión
 * se trata, quiénes hablan y qué temas había en la agenda. Con eso
 * el resumen sale ordenado por tema y con los nombres bien escritos,
 * en vez de "una persona dijo".
 */
function contextoDe(estado: Estado, reunion: Reunion, agenda: Tema[]) {
  return {
    titulo: reunion.titulo,
    fecha: reunion.fecha,
    sala: sala(estado, reunion.salaId)?.nombre,
    participantes: reunion.participantesIds.map((id) => nombreDe(estado, id)),
    temas: agenda.map((t) => ({ id: t.id, titulo: t.titulo, objetivo: t.objetivo })),
  }
}

export async function transcribirYResumir(
  audio: Blob,
  estado: Estado,
  reunion: Reunion,
  agenda: Tema[],
): Promise<ResultadoIA> {
  if (!ENDPOINT) throw new Error('La transcripción no está configurada.')

  const cuerpo = new FormData()
  const extension = audio.type.includes('mp4') ? 'mp4' : 'webm'
  cuerpo.append('audio', audio, `reunion.${extension}`)
  cuerpo.append('contexto', JSON.stringify(contextoDe(estado, reunion, agenda)))

  /* El Worker pide la sesión de Neon antes de gastar cuota de Gemini. */
  const cabeceras: Record<string, string> = {}
  try {
    const token = (await neon?.auth.getSession())?.data?.session?.token
    if (token) cabeceras.Authorization = `Bearer ${token}`
  } catch {
    /* En modo demo no hay sesión: el Worker decide si la exige. */
  }

  const r = await fetch(`${ENDPOINT.replace(/\/$/, '')}/transcribir`, {
    method: 'POST',
    headers: cabeceras,
    body: cuerpo,
  })

  if (!r.ok) {
    const detalle = await r.json().catch(() => ({}))
    throw new Error(detalle.error ?? `El servicio respondió ${r.status}.`)
  }
  return r.json()
}
