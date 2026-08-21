import type {
  Compromiso,
  Estado,
  Membresia,
  Reunion,
  RolSala,
  Sala,
  SalaAjena,
  Solicitud,
  Tema,
  Usuario,
} from '../types'

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

/** "en 3 días" / "hace 2 horas" */
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

/* ── Salas y membresías ───────────────────────────────────── */

export const sala = (e: Estado, id?: string): Sala | undefined =>
  e.salas.find((s) => s.id === id)

export const membresia = (e: Estado, salaId?: string, usuarioId?: string): Membresia | undefined =>
  e.membresias.find((m) => m.salaId === salaId && m.usuarioId === usuarioId)

/** Rol de alguien dentro de una sala. `undefined` si no pertenece. */
export const rolEnSala = (e: Estado, salaId?: string, usuarioId?: string): RolSala | undefined =>
  membresia(e, salaId, usuarioId)?.rol

export const integrantes = (e: Estado, salaId: string): Usuario[] =>
  e.membresias
    .filter((m) => m.salaId === salaId)
    .map((m) => e.usuarios.find((u) => u.id === m.usuarioId))
    .filter((u): u is Usuario => Boolean(u) && u!.activo)

/** Salas de las que alguien forma parte. El superadmin las ve todas. */
export function salasDe(e: Estado, usuario?: Usuario | null): Sala[] {
  if (!usuario) return []
  const visibles =
    usuario.alcance === 'superadmin'
      ? e.salas
      : e.salas.filter((s) => e.membresias.some((m) => m.salaId === s.id && m.usuarioId === usuario.id))
  return visibles.filter((s) => !s.archivada).sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/**
 * Nombre reducido a lo comparable: sin mayúsculas, tildes ni signos.
 * «Marketing», «marketing» y «Márketing » son el mismo nombre.
 * Réplica exacta de `clave_nombre()` en la base.
 */
export const claveNombre = (t: string): string =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')

/**
 * Salas ya existentes que se parecen al nombre que se está escribiendo.
 *
 * Coincide el nombre exacto y también el que contiene al otro —«Equipo
 * de marketing» encuentra «Marketing»— con un piso de cuatro caracteres
 * para que una palabra corta no traiga media empresa.
 */
export function salasParecidas(directorio: SalaAjena[], nombre: string): SalaAjena[] {
  const q = claveNombre(nombre)
  if (q.length < 3) return []
  return directorio.filter((s) => {
    const c = claveNombre(s.nombre)
    if (c === q) return true
    const corta = c.length < q.length ? c : q
    return corta.length >= 4 && (c.includes(q) || q.includes(c))
  })
    .sort((a, b) => Number(claveNombre(b.nombre) === q) - Number(claveNombre(a.nombre) === q))
}

/** Pedidos de entrada esperando respuesta en una sala. */
export const solicitudesDe = (e: Estado, salaId?: string): Solicitud[] =>
  e.solicitudes
    .filter((s) => s.salaId === salaId && s.estado === 'pendiente')
    .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn))

/**
 * Si me voy, ¿la sala queda sin organizador?
 * Mismo criterio que el trigger de la base, para avisar antes de
 * intentarlo en vez de mostrar el error crudo.
 */
export function dejariaSinOrganizador(e: Estado, salaId: string, usuarioId: string): boolean {
  const mia = membresia(e, salaId, usuarioId)
  if (mia?.rol !== 'organizador') return false
  return !e.membresias.some(
    (m) => m.salaId === salaId && m.rol === 'organizador' && m.usuarioId !== usuarioId,
  )
}

/* ── Reglas de negocio ────────────────────────────────────── */

/**
 * Momento en que se cierra la carga de temas.
 * Con cierre manual no hay plazo: sólo cierra cuando el organizador
 * aprieta el botón, que es como quedó por defecto.
 */
export const deadlineAgenda = (r: Reunion): string | undefined =>
  r.cierreManual
    ? undefined
    : new Date(new Date(r.fecha).getTime() - r.horasCierreAgenda * 3600000).toISOString()

export function agendaVencida(r: Reunion): boolean {
  const d = deadlineAgenda(r)
  return d ? Date.now() > new Date(d).getTime() : false
}

/**
 * ¿Se puede seguir cargando temas?
 *
 * Hasta que la reunión se cierra, sí. Un tema que aparece diez minutos
 * antes entra igual: *"si te olvidaste de cargarlo, decímelo igual un
 * minuto antes, porque capaz el tema es pertinente"*. Con el temario
 * ya cerrado se avisa que llega tarde, pero no se traba.
 */
export const puedeProponerTemas = (r: Reunion): boolean => r.estado !== 'cerrada'

/** El temario ya se cerró y este tema entra igual, fuera de lo avisado. */
export const llegaTarde = (r: Reunion): boolean =>
  r.estado === 'agenda_cerrada' || r.estado === 'en_curso'

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

/**
 * Mi temario: el bloc de notas personal.
 *
 * *"Acá andá tirando todos los temas que quieras y después, cuando
 * querés, los asignás a una reunión"*. No tiene sala: son míos hasta
 * que decido a qué reunión los llevo.
 */
export const temarioDe = (e: Estado, usuarioId?: string): Tema[] =>
  e.temas
    .filter((t) => t.estado === 'banco' && t.propuestoPor === usuarioId && !t.reunionId)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

/**
 * Los que estuvieron en una agenda y no se llegaron a hablar.
 *
 * Conservan la sala: el organizador los vuelve a incluir en la próxima
 * y, al mismo tiempo, le reaparecen en el temario a quien los propuso.
 */
export const temasSinTratar = (e: Estado, salaId?: string, usuarioId?: string): Tema[] =>
  e.temas
    .filter(
      (t) =>
        t.estado === 'diferido' &&
        !t.reunionId &&
        (salaId ? t.salaId === salaId : true) &&
        (usuarioId ? t.propuestoPor === usuarioId : true),
    )
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

/**
 * Los que ya mandé a una reunión y todavía no se hablaron.
 *
 * Salían del bloc de notas al asignarlos y no se veían más desde ahí:
 * *"quiero ver mis borradores, los asignados y los que quedaron
 * pendientes"*. Los tratados no vuelven —ésos ya están en una minuta—
 * y los rechazados tampoco.
 */
export const temasAsignados = (e: Estado, usuarioId?: string): Tema[] =>
  e.temas
    .filter(
      (t) =>
        t.propuestoPor === usuarioId &&
        !!t.reunionId &&
        (t.estado === 'propuesto' || t.estado === 'aprobado'),
    )
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

export const agendaDe = (e: Estado, reunionId: string): Tema[] =>
  temasDe(e, reunionId).filter((t) => t.estado === 'aprobado' || t.estado === 'tratado')

export const compromisosDe = (e: Estado, reunionId: string): Compromiso[] =>
  e.compromisos.filter((c) => c.reunionId === reunionId)

export const reunion = (e: Estado, id?: string): Reunion | undefined =>
  id ? e.reuniones.find((r) => r.id === id) : undefined

export const reunionesDe = (e: Estado, salaId?: string): Reunion[] =>
  e.reuniones.filter((r) => !salaId || r.salaId === salaId)

export const compromisosDeSala = (e: Estado, salaId?: string): Compromiso[] =>
  e.compromisos.filter((c) => !salaId || c.salaId === salaId)

/** Compromisos abiertos que vienen de antes de la reunión dada, en su misma sala. */
export function compromisosArrastrados(e: Estado, reunionId: string): Compromiso[] {
  const r = e.reuniones.find((x) => x.id === reunionId)
  if (!r) return []
  const previas = new Set(
    e.reuniones
      .filter((x) => x.salaId === r.salaId && new Date(x.fecha).getTime() < new Date(r.fecha).getTime())
      .map((x) => x.id),
  )
  return e.compromisos
    .filter(
      (c) =>
        c.salaId === r.salaId &&
        c.estado !== 'hecho' &&
        // Los sueltos de la sala también arrastran.
        (c.reunionId ? previas.has(c.reunionId) : true) &&
        c.reunionId !== reunionId,
    )
    .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))
}

export const proximaReunion = (e: Estado, salaId?: string): Reunion | undefined =>
  reunionesDe(e, salaId)
    .filter((r) => r.estado !== 'cerrada')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]

export const ordenarReuniones = (rs: Reunion[]): Reunion[] =>
  [...rs].sort((a, b) => b.fecha.localeCompare(a.fecha))

/* ── Próximas, historial y búsqueda ───────────────────────── */

/**
 * ¿Esta reunión se lista para mí?
 *
 * Se ve si es de una sala mía, o si me sumaron a ella aunque no sea del
 * equipo. Una privada no aparece para el resto de la sala: la ven
 * quienes están en ella.
 *
 * En la base lo cuida una política; acá se repite para la vista previa,
 * que corre sin base y tiene todo el conjunto de datos a mano.
 */
export function puedeVerReunion(e: Estado, r: Reunion, yo?: Usuario | null): boolean {
  if (!yo) return false
  if (yo.alcance === 'superadmin') return true
  if (r.moderadorId === yo.id || r.participantesIds.includes(yo.id)) return true
  if (r.privada) return false
  /*
   * El externo entra sólo a las reuniones a las que lo convocan: es un
   * proveedor, no parte del equipo. Estar en la sala le sirve para que
   * lo puedan sumar y para seguir sus tareas, no para leer todo.
   */
  const mia = membresia(e, r.salaId, yo.id)
  return !!mia && mia.rol !== 'externo'
}

/**
 * Las que vienen, una por serie.
 *
 * *"No voy a proponer un tema para la reunión de socios 18 cuando
 * todavía no tuve la 17"*: de una reunión que se repite se muestra
 * sólo la primera, y cuando esa se cierra aparece la siguiente. Las
 * de única vez se listan todas.
 */
export function proximasReuniones(e: Estado, yo?: Usuario | null, salaId?: string): Reunion[] {
  const abiertas = e.reuniones
    .filter((r) => (salaId ? r.salaId === salaId : true))
    .filter((r) => r.estado !== 'cerrada')
    .filter((r) => puedeVerReunion(e, r, yo))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const vistas = new Set<string>()
  return abiertas.filter((r) => {
    const serie = r.serieId ?? r.id
    if (vistas.has(serie)) return false
    vistas.add(serie)
    return true
  })
}

/** Todo lo que ya pasó, de lo más nuevo a lo más viejo. */
export function historialReuniones(e: Estado, yo?: Usuario | null, salaId?: string): Reunion[] {
  return e.reuniones
    .filter((r) => (salaId ? r.salaId === salaId : true))
    .filter((r) => r.estado === 'cerrada')
    .filter((r) => puedeVerReunion(e, r, yo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export interface Coincidencia {
  reunion: Reunion
  /** Dónde apareció: el título del tema, "Conclusiones", una tarea… */
  donde: string[]
}

/**
 * Buscar una palabra en todas las minutas.
 *
 * *"No me acuerdo cuándo hablamos del balance: pongo balance y me
 * trae todas las minutas que dicen esa palabra"*. Busca en el título
 * de la reunión, en los temas y sus conclusiones, en las
 * observaciones y en las tareas que salieron de ahí.
 */
export function buscarEnMinutas(
  e: Estado,
  texto: string,
  yo?: Usuario | null,
  salaId?: string,
): Coincidencia[] {
  const q = texto.trim().toLowerCase()
  if (q.length < 2) return []
  const tiene = (s?: string) => !!s && s.toLowerCase().includes(q)

  return historialReuniones(e, yo, salaId)
    .map((r) => {
      const donde: string[] = []
      if (tiene(r.titulo)) donde.push('En el título')
      if (tiene(r.conclusionesGenerales)) donde.push('En las conclusiones')
      if (tiene(r.observaciones)) donde.push('En las observaciones')
      for (const t of temasDe(e, r.id)) {
        if (tiene(t.titulo) || tiene(t.detalle) || tiene(t.conclusiones)) donde.push(t.titulo)
      }
      for (const c of compromisosDe(e, r.id)) {
        if (tiene(c.accion) || tiene(c.detalle)) donde.push(`Tarea: ${c.accion}`)
      }
      return { reunion: r, donde }
    })
    .filter((x) => x.donde.length > 0)
}

/**
 * Lo que ofrece el desplegable de lugar: lo configurado en la sala y,
 * si no hay nada, lo que ya se usó en reuniones anteriores.
 */
export function lugaresDe(e: Estado, salaId?: string): string[] {
  const s = sala(e, salaId)
  const usados = e.reuniones
    .filter((r) => r.salaId === salaId && r.lugar)
    .map((r) => r.lugar!)
  const todos = [...(s?.lugares ?? []), s?.lugarHabitual, ...usados].filter(
    (x): x is string => !!x && x.trim().length > 0,
  )
  return [...new Set(todos.map((x) => x.trim()))]
}

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

/* ─────────────────────────────────────────────────────────────
   Correos que todavía no se cargaron.

   `.invalid` lo reserva la RFC 2606 para esto: no existe ni puede
   registrarse, así que nadie le manda un correo por error. Se usan
   como marcador de posición donde falta el correo de verdad —en la
   base la columna es `unique`, así que dejarlos vacíos no es
   opción— y la interfaz los muestra como lo que son.
   ───────────────────────────────────────────────────────────── */
export const DOMINIO_PENDIENTE = 'pendiente.invalid'

/** Si es uno de los provisorios y no una dirección de verdad. */
export const correoPendiente = (email?: string) =>
  !email || email.endsWith(`@${DOMINIO_PENDIENTE}`)
