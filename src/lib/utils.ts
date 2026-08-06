import type { Compromiso, Estado, Reunion, Tema, Usuario } from '../types'

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ')

export const uid = (prefijo = 'id') =>
  `${prefijo}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`

/* ── Fechas ───────────────────────────────────────────────── */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export const fechaCorta = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const fechaLarga = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

export const hora = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const fechaHora = (iso?: string) =>
  !iso ? '—' : `${fechaCorta(iso)} · ${hora(iso)}`

/** Valor para <input type="datetime-local"> en hora local. */
export const paraInputDateTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date()
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export const paraInputDate = (iso?: string) => (iso ? paraInputDateTime(iso).slice(0, 10) : '')

/** "en 3 días" / "hace 2 horas" / "vence hoy" */
export function relativo(iso?: string): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(ms)
  const min = Math.round(abs / 60000)
  const hs = Math.round(abs / 3600000)
  const dias = Math.round(abs / 86400000)

  if (min < 1) return 'ahora'
  const cuerpo =
    min < 60 ? `${min} min` : hs < 24 ? `${hs} h` : dias === 1 ? '1 día' : `${dias} días`
  return ms > 0 ? `en ${cuerpo}` : `hace ${cuerpo}`
}

/** Cuenta regresiva en formato d/h/m para el cierre de agenda. */
export function cuentaRegresiva(iso?: string): { texto: string; vencido: boolean } {
  if (!iso) return { texto: '—', vencido: false }
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return { texto: 'Cerrada', vencido: true }
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return { texto: `${d}d ${h}h`, vencido: false }
  if (h > 0) return { texto: `${h}h ${m}m`, vencido: false }
  return { texto: `${m}m`, vencido: false }
}

export const mmss = (seg: number) => {
  const s = Math.max(0, Math.floor(seg))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const esMismoDia = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString()

/* ── Reglas de negocio ────────────────────────────────────── */

/**
 * Momento en que se cierra la carga de temas.
 * Regla acordada con Fran: 24 h antes del inicio (configurable por reunión).
 */
export const deadlineAgenda = (r: Reunion): string =>
  new Date(new Date(r.fecha).getTime() - r.horasCierreAgenda * 3600000).toISOString()

export const agendaVencida = (r: Reunion): boolean =>
  Date.now() > new Date(deadlineAgenda(r)).getTime()

/** ¿Se pueden seguir proponiendo temas? */
export const puedeProponerTemas = (r: Reunion): boolean =>
  r.estado === 'agenda_abierta' && !agendaVencida(r)

export const estaVencido = (c: Compromiso): boolean =>
  c.estado !== 'hecho' && !!c.fechaLimite && new Date(c.fechaLimite).getTime() < Date.now()

/** Vence dentro de los próximos 3 días. */
export const venceProximo = (c: Compromiso): boolean => {
  if (c.estado === 'hecho' || !c.fechaLimite) return false
  const ms = new Date(c.fechaLimite).getTime() - Date.now()
  return ms >= 0 && ms < 3 * 86400000
}

export const minutosAgenda = (temas: Tema[]): number =>
  temas.filter((t) => t.estado === 'aprobado' || t.estado === 'tratado')
    .reduce((a, t) => a + t.duracionMin, 0)

/* ── Lookups ──────────────────────────────────────────────── */

export const usuario = (e: Estado, id?: string): Usuario | undefined =>
  e.usuarios.find((u) => u.id === id)

export const nombreDe = (e: Estado, id?: string): string =>
  usuario(e, id)?.nombre ?? 'Sin asignar'

export const iniciales = (nombre: string): string =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export const temasDe = (e: Estado, reunionId: string): Tema[] =>
  e.temas.filter((t) => t.reunionId === reunionId).sort((a, b) => a.orden - b.orden)

export const agendaDe = (e: Estado, reunionId: string): Tema[] =>
  temasDe(e, reunionId).filter((t) => t.estado === 'aprobado' || t.estado === 'tratado')

export const compromisosDe = (e: Estado, reunionId: string): Compromiso[] =>
  e.compromisos.filter((c) => c.reunionId === reunionId)

/** Compromisos abiertos que vienen de reuniones anteriores a la dada. */
export function compromisosArrastrados(e: Estado, reunionId: string): Compromiso[] {
  const r = e.reuniones.find((x) => x.id === reunionId)
  if (!r) return []
  const previas = new Set(
    e.reuniones
      .filter((x) => new Date(x.fecha).getTime() < new Date(r.fecha).getTime())
      .map((x) => x.id),
  )
  return e.compromisos
    .filter((c) => previas.has(c.reunionId) && c.estado !== 'hecho')
    .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))
}

export const proximaReunion = (e: Estado): Reunion | undefined =>
  e.reuniones
    .filter((r) => r.estado !== 'cerrada')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]

export const ordenarReuniones = (rs: Reunion[]): Reunion[] =>
  [...rs].sort((a, b) => b.fecha.localeCompare(a.fecha))

/* ── Misc ─────────────────────────────────────────────────── */

export const descargar = (contenido: string, nombre: string, tipo = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
