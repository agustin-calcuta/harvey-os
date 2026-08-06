import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  cerrarSesionFirebase,
  firebaseConfigurado,
  loginConGoogle,
  observarSesion,
} from '../lib/firebase'
import { correoAgendaCerrada, correoMinuta, enviarCorreo } from '../lib/email'
import { ESTADO_INICIAL } from '../lib/seed'
import { agendaDe, uid } from '../lib/utils'
import type {
  Compromiso,
  Config,
  Estado,
  EstadoCompromiso,
  Notificacion,
  Reunion,
  Rol,
  Tema,
  Usuario,
} from '../types'
import { repo, type Coleccion } from './repo'

/* ─────────────────────────────────────────────────────────────
   Estado global de la aplicación: sesión, datos y acciones.
   ───────────────────────────────────────────────────────────── */

const CLAVE_SESION = 'harvey-os:sesion:v1'

export type Aviso = { id: string; texto: string; tono: 'ok' | 'error' | 'info' }

interface Ctx {
  // sesión
  yo: Usuario | null
  cargando: boolean
  modo: 'demo' | 'firebase'
  entrarComoDemo(usuarioId: string): void
  entrarConGoogle(): Promise<void>
  salir(): Promise<void>

  // permisos
  esAdmin: boolean
  puedeOrganizar: boolean
  puedeModerar(r: Reunion): boolean

  // datos
  estado: Estado

  // reuniones
  crearReunion(datos: Partial<Reunion>): Promise<Reunion>
  actualizarReunion(id: string, cambios: Partial<Reunion>): Promise<void>
  borrarReunion(id: string): Promise<void>
  abrirAgenda(id: string): Promise<void>
  cerrarAgenda(id: string): Promise<void>
  iniciarReunion(id: string): Promise<void>
  cerrarReunion(id: string): Promise<void>
  reabrirReunion(id: string): Promise<void>

  // temas
  proponerTema(datos: Omit<Tema, 'id' | 'creadoEn' | 'orden' | 'estado'> & { estado?: Tema['estado'] }): Promise<void>
  actualizarTema(id: string, cambios: Partial<Tema>): Promise<void>
  borrarTema(id: string): Promise<void>
  reordenarTemas(reunionId: string, idsEnOrden: string[]): Promise<void>

  // compromisos
  crearCompromiso(datos: Omit<Compromiso, 'id' | 'creadoEn'>): Promise<void>
  actualizarCompromiso(id: string, cambios: Partial<Compromiso>): Promise<void>
  borrarCompromiso(id: string): Promise<void>
  moverCompromiso(id: string, estado: EstadoCompromiso): Promise<void>

  // usuarios y config
  guardarUsuario(u: Usuario): Promise<void>
  borrarUsuario(id: string): Promise<void>
  actualizarConfig(cambios: Partial<Config>): Promise<void>

  // notificaciones
  reenviarNotificacion(id: string): Promise<void>

  // utilidades de demo
  restablecerDemo(): Promise<void>

  // avisos
  avisos: Aviso[]
  avisar(texto: string, tono?: Aviso['tono']): void
  descartarAviso(id: string): void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL)
  const [yo, setYo] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const ref = useRef(estado)
  ref.current = estado

  /* ── Avisos ─────────────────────────────────────────────── */

  const avisar = useCallback((texto: string, tono: Aviso['tono'] = 'ok') => {
    const id = uid('av')
    setAvisos((prev) => [...prev, { id, texto, tono }])
    setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), 4500)
  }, [])

  const descartarAviso = useCallback(
    (id: string) => setAvisos((prev) => prev.filter((a) => a.id !== id)),
    [],
  )

  /* ── Carga inicial ──────────────────────────────────────── */

  useEffect(() => {
    let vivo = true
    let desuscribir: (() => void) | undefined

    ;(async () => {
      const inicial = await repo.cargar()
      if (!vivo) return
      setEstado(inicial)

      if (repo.modo === 'firebase') {
        // Si Firestore está vacío lo sembramos con los datos de demo,
        // así la primera visita ya muestra la plataforma con contenido.
        desuscribir = repo.suscribir((e) => {
          if (!vivo) return
          setEstado(e)
        })
      }
      setCargando(false)
    })()

    return () => {
      vivo = false
      desuscribir?.()
    }
  }, [])

  /* ── Sesión ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!firebaseConfigurado) {
      const guardado = localStorage.getItem(CLAVE_SESION)
      if (guardado) {
        const u = ESTADO_INICIAL.usuarios.find((x) => x.id === guardado)
        if (u) setYo(u)
      }
      return
    }
    return observarSesion((fu) => {
      if (!fu) {
        const guardado = localStorage.getItem(CLAVE_SESION)
        if (!guardado) setYo(null)
        return
      }
      const existente = ref.current.usuarios.find(
        (u) => u.email.toLowerCase() === (fu.email ?? '').toLowerCase(),
      )
      const usuario: Usuario = existente ?? {
        id: fu.uid,
        nombre: fu.displayName ?? fu.email ?? 'Sin nombre',
        email: fu.email ?? '',
        // El primer usuario que entra queda como admin; el resto, como miembro.
        rol: ref.current.usuarios.length === 0 ? 'admin' : 'miembro',
        avatarUrl: fu.photoURL ?? undefined,
        activo: true,
        creadoEn: new Date().toISOString(),
      }
      if (!existente) void repo.guardarDoc('usuarios', usuario)
      setYo(usuario)
    })
  }, [])

  /* ── Mutaciones ─────────────────────────────────────────── */

  const persistir = useCallback(async <T extends { id: string }>(col: Coleccion, item: T) => {
    setEstado((prev) => {
      const arr = prev[col] as unknown as T[]
      const i = arr.findIndex((x) => x.id === item.id)
      const nuevo = i >= 0 ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item]
      return { ...prev, [col]: nuevo }
    })
    await repo.guardarDoc(col, item)
  }, [])

  const eliminar = useCallback(async (col: Coleccion, id: string) => {
    setEstado((prev) => ({
      ...prev,
      [col]: (prev[col] as { id: string }[]).filter((x) => x.id !== id),
    }))
    await repo.borrarDoc(col, id)
  }, [])

  /* ── Notificaciones ─────────────────────────────────────── */

  const registrarCorreo = useCallback(
    async (
      tipo: Notificacion['tipo'],
      reunion: Reunion,
      compuesto: { asunto: string; html: string; texto: string },
    ) => {
      const destinatarios = ref.current.usuarios
        .filter((u) => reunion.participantesIds.includes(u.id) && u.activo)
        .map((u) => u.email)

      let estadoEnvio: Notificacion['estado'] = 'simulado'
      let error: string | undefined
      if (ref.current.config.emailsActivos) {
        try {
          estadoEnvio = await enviarCorreo({
            destinatarios,
            asunto: compuesto.asunto,
            html: compuesto.html,
            texto: compuesto.texto,
          })
        } catch (e) {
          estadoEnvio = 'error'
          error = e instanceof Error ? e.message : String(e)
        }
      }

      const n: Notificacion = {
        id: uid('n'),
        tipo,
        reunionId: reunion.id,
        asunto: compuesto.asunto,
        destinatarios,
        cuerpoHtml: compuesto.html,
        cuerpoTexto: compuesto.texto,
        estado: estadoEnvio,
        error,
        creadoEn: new Date().toISOString(),
      }
      await persistir('notificaciones', n)
      return n
    },
    [persistir],
  )

  /* ── Acciones: reuniones ────────────────────────────────── */

  const crearReunion = useCallback(
    async (datos: Partial<Reunion>) => {
      const cfg = ref.current.config
      const r: Reunion = {
        id: uid('r'),
        titulo: datos.titulo ?? 'Reunión sin título',
        fecha: datos.fecha ?? new Date(Date.now() + 7 * 86400000).toISOString(),
        duracionPrevistaMin: datos.duracionPrevistaMin ?? cfg.duracionReunionDefaultMin,
        lugar: datos.lugar,
        moderadorId: datos.moderadorId ?? yo?.id ?? ref.current.usuarios[0]?.id ?? '',
        participantesIds: datos.participantesIds ?? ref.current.usuarios.map((u) => u.id),
        estado: datos.estado ?? 'agenda_abierta',
        horasCierreAgenda: datos.horasCierreAgenda ?? cfg.horasCierreAgendaDefault,
        proximaReunionFecha: datos.proximaReunionFecha,
        creadoPor: yo?.id ?? '',
        creadoEn: new Date().toISOString(),
      }
      await persistir('reuniones', r)
      avisar('Reunión creada. Ya se pueden proponer temas.')
      return r
    },
    [persistir, yo, avisar],
  )

  const actualizarReunion = useCallback(
    async (id: string, cambios: Partial<Reunion>) => {
      const actual = ref.current.reuniones.find((r) => r.id === id)
      if (!actual) return
      await persistir('reuniones', { ...actual, ...cambios })
    },
    [persistir],
  )

  const borrarReunion = useCallback(
    async (id: string) => {
      for (const t of ref.current.temas.filter((t) => t.reunionId === id)) {
        await eliminar('temas', t.id)
      }
      await eliminar('reuniones', id)
      avisar('Reunión eliminada.', 'info')
    },
    [eliminar, avisar],
  )

  const abrirAgenda = useCallback(
    async (id: string) => {
      await actualizarReunion(id, { estado: 'agenda_abierta' })
      avisar('Agenda abierta. El equipo ya puede proponer temas.')
    },
    [actualizarReunion, avisar],
  )

  const cerrarAgenda = useCallback(
    async (id: string) => {
      const r = ref.current.reuniones.find((x) => x.id === id)
      if (!r) return
      const actualizada: Reunion = {
        ...r,
        estado: 'agenda_cerrada',
        agendaCerradaEn: new Date().toISOString(),
      }
      await persistir('reuniones', actualizada)
      const n = await registrarCorreo(
        'agenda_cerrada',
        actualizada,
        correoAgendaCerrada(ref.current, actualizada),
      )
      avisar(
        n.estado === 'enviado'
          ? `Temario cerrado y notificado a ${n.destinatarios.length} personas.`
          : `Temario cerrado. El correo quedó listo para ${n.destinatarios.length} destinatarios.`,
      )
    },
    [persistir, registrarCorreo, avisar],
  )

  const iniciarReunion = useCallback(
    async (id: string) => {
      await actualizarReunion(id, { estado: 'en_curso', iniciadaEn: new Date().toISOString() })
    },
    [actualizarReunion],
  )

  const cerrarReunion = useCallback(
    async (id: string) => {
      const r = ref.current.reuniones.find((x) => x.id === id)
      if (!r) return
      // Todo tema aprobado pasa a "tratado" al cerrar.
      for (const t of agendaDe(ref.current, id)) {
        if (t.estado === 'aprobado') await persistir('temas', { ...t, estado: 'tratado' })
      }
      const actualizada: Reunion = {
        ...r,
        estado: 'cerrada',
        cerradaEn: new Date().toISOString(),
      }
      await persistir('reuniones', actualizada)
      const n = await registrarCorreo('minuta', actualizada, correoMinuta(ref.current, actualizada))
      avisar(
        n.estado === 'enviado'
          ? `Minuta enviada a ${n.destinatarios.length} personas.`
          : `Reunión cerrada. La minuta quedó lista para ${n.destinatarios.length} destinatarios.`,
      )
    },
    [persistir, registrarCorreo, avisar],
  )

  const reabrirReunion = useCallback(
    async (id: string) => {
      await actualizarReunion(id, { estado: 'en_curso', cerradaEn: undefined })
      avisar('Reunión reabierta para edición.', 'info')
    },
    [actualizarReunion, avisar],
  )

  /* ── Acciones: temas ────────────────────────────────────── */

  const proponerTema = useCallback(
    async (datos: Omit<Tema, 'id' | 'creadoEn' | 'orden' | 'estado'> & { estado?: Tema['estado'] }) => {
      const hermanos = ref.current.temas.filter((t) => t.reunionId === datos.reunionId)
      const t: Tema = {
        ...datos,
        id: uid('t'),
        estado: datos.estado ?? 'propuesto',
        orden: hermanos.length,
        creadoEn: new Date().toISOString(),
      }
      await persistir('temas', t)
      avisar(
        t.estado === 'aprobado'
          ? 'Tema agregado a la agenda.'
          : 'Tema propuesto. Queda esperando aprobación del organizador.',
      )
    },
    [persistir, avisar],
  )

  const actualizarTema = useCallback(
    async (id: string, cambios: Partial<Tema>) => {
      const actual = ref.current.temas.find((t) => t.id === id)
      if (!actual) return
      await persistir('temas', { ...actual, ...cambios })
    },
    [persistir],
  )

  const borrarTema = useCallback((id: string) => eliminar('temas', id), [eliminar])

  const reordenarTemas = useCallback(
    async (reunionId: string, idsEnOrden: string[]) => {
      const mapa = new Map(idsEnOrden.map((id, i) => [id, i]))
      setEstado((prev) => ({
        ...prev,
        temas: prev.temas.map((t) =>
          t.reunionId === reunionId && mapa.has(t.id) ? { ...t, orden: mapa.get(t.id)! } : t,
        ),
      }))
      for (const [id, orden] of mapa) {
        const t = ref.current.temas.find((x) => x.id === id)
        if (t) await repo.guardarDoc('temas', { ...t, orden } as Tema)
      }
    },
    [],
  )

  /* ── Acciones: compromisos ──────────────────────────────── */

  const crearCompromiso = useCallback(
    async (datos: Omit<Compromiso, 'id' | 'creadoEn'>) => {
      await persistir('compromisos', {
        ...datos,
        id: uid('c'),
        creadoEn: new Date().toISOString(),
      })
      avisar('Compromiso registrado.')
    },
    [persistir, avisar],
  )

  const actualizarCompromiso = useCallback(
    async (id: string, cambios: Partial<Compromiso>) => {
      const actual = ref.current.compromisos.find((c) => c.id === id)
      if (!actual) return
      await persistir('compromisos', { ...actual, ...cambios })
    },
    [persistir],
  )

  const borrarCompromiso = useCallback((id: string) => eliminar('compromisos', id), [eliminar])

  const moverCompromiso = useCallback(
    async (id: string, nuevoEstado: EstadoCompromiso) => {
      const actual = ref.current.compromisos.find((c) => c.id === id)
      if (!actual || actual.estado === nuevoEstado) return
      await persistir('compromisos', {
        ...actual,
        estado: nuevoEstado,
        completadoEn: nuevoEstado === 'hecho' ? new Date().toISOString() : undefined,
      })
    },
    [persistir],
  )

  /* ── Acciones: usuarios y config ────────────────────────── */

  const guardarUsuario = useCallback(
    async (u: Usuario) => {
      await persistir('usuarios', u)
      if (yo?.id === u.id) setYo(u)
      avisar('Usuario guardado.')
    },
    [persistir, yo, avisar],
  )

  const borrarUsuario = useCallback(
    async (id: string) => {
      await eliminar('usuarios', id)
      avisar('Usuario eliminado.', 'info')
    },
    [eliminar, avisar],
  )

  const actualizarConfig = useCallback(
    async (cambios: Partial<Config>) => {
      const nueva = { ...ref.current.config, ...cambios }
      setEstado((prev) => ({ ...prev, config: nueva }))
      await repo.guardarConfig(nueva)
    },
    [],
  )

  const reenviarNotificacion = useCallback(
    async (id: string) => {
      const n = ref.current.notificaciones.find((x) => x.id === id)
      if (!n) return
      try {
        const r = await enviarCorreo({
          destinatarios: n.destinatarios,
          asunto: n.asunto,
          html: n.cuerpoHtml,
          texto: n.cuerpoTexto,
        })
        await persistir('notificaciones', { ...n, estado: r, error: undefined })
        avisar(r === 'enviado' ? 'Correo reenviado.' : 'No hay proveedor de correo conectado.', r === 'enviado' ? 'ok' : 'info')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await persistir('notificaciones', { ...n, estado: 'error', error: msg })
        avisar(`Falló el reenvío: ${msg}`, 'error')
      }
    },
    [persistir, avisar],
  )

  /* ── Sesión: acciones ───────────────────────────────────── */

  const entrarComoDemo = useCallback(
    (usuarioId: string) => {
      const u = ref.current.usuarios.find((x) => x.id === usuarioId)
      if (!u) return
      localStorage.setItem(CLAVE_SESION, usuarioId)
      setYo(u)
    },
    [],
  )

  const entrarConGoogle = useCallback(async () => {
    if (!firebaseConfigurado) {
      avisar('Todavía no hay credenciales de Google cargadas. Entrá con un perfil de demo.', 'info')
      return
    }
    try {
      await loginConGoogle()
    } catch (e) {
      avisar(`No se pudo iniciar sesión: ${e instanceof Error ? e.message : e}`, 'error')
    }
  }, [avisar])

  const salir = useCallback(async () => {
    localStorage.removeItem(CLAVE_SESION)
    setYo(null)
    if (firebaseConfigurado) await cerrarSesionFirebase()
  }, [])

  const restablecerDemo = useCallback(async () => {
    const limpio = structuredClone(ESTADO_INICIAL)
    setEstado(limpio)
    await repo.reemplazar(limpio)
    avisar('Datos de demostración restablecidos.', 'info')
  }, [avisar])

  /* ── Permisos ───────────────────────────────────────────── */

  const esAdmin = yo?.rol === 'admin'
  const puedeOrganizar = yo?.rol === 'admin' || yo?.rol === 'organizador'
  const puedeModerar = useCallback(
    (r: Reunion) => esAdmin || yo?.rol === 'organizador' || r.moderadorId === yo?.id,
    [esAdmin, yo],
  )

  const valor = useMemo<Ctx>(
    () => ({
      yo,
      cargando,
      modo: repo.modo,
      entrarComoDemo,
      entrarConGoogle,
      salir,
      esAdmin,
      puedeOrganizar,
      puedeModerar,
      estado,
      crearReunion,
      actualizarReunion,
      borrarReunion,
      abrirAgenda,
      cerrarAgenda,
      iniciarReunion,
      cerrarReunion,
      reabrirReunion,
      proponerTema,
      actualizarTema,
      borrarTema,
      reordenarTemas,
      crearCompromiso,
      actualizarCompromiso,
      borrarCompromiso,
      moverCompromiso,
      guardarUsuario,
      borrarUsuario,
      actualizarConfig,
      reenviarNotificacion,
      restablecerDemo,
      avisos,
      avisar,
      descartarAviso,
    }),
    [
      yo, cargando, estado, esAdmin, puedeOrganizar, puedeModerar, avisos,
      entrarComoDemo, entrarConGoogle, salir, crearReunion, actualizarReunion,
      borrarReunion, abrirAgenda, cerrarAgenda, iniciarReunion, cerrarReunion,
      reabrirReunion, proponerTema, actualizarTema, borrarTema, reordenarTemas,
      crearCompromiso, actualizarCompromiso, borrarCompromiso, moverCompromiso,
      guardarUsuario, borrarUsuario, actualizarConfig, reenviarNotificacion,
      restablecerDemo, avisar, descartarAviso,
    ],
  )

  return <AppCtx.Provider value={valor}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return c
}

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Admin',
  organizador: 'Organizador',
  miembro: 'Miembro',
  invitado: 'Invitado',
}
