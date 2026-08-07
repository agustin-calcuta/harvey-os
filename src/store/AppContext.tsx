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
import { entrarConGoogleNeon, neonConfigurado, salirDeNeon, sesionActual } from '../lib/neon'
import { correoAgendaCerrada, correoMinuta, enviarCorreo } from '../lib/email'
import { ESTADO_INICIAL } from '../lib/seed'
import { agendaDe, rolEnSala, salasDe, uid } from '../lib/utils'
import type {
  Compromiso,
  Config,
  Estado,
  EstadoCompromiso,
  Membresia,
  Notificacion,
  Reunion,
  RolSala,
  Sala,
  Tema,
  Usuario,
} from '../types'
import {
  hayBaseRemota,
  repo,
  usarBasePrincipal,
  usarDatosDeDemostracion,
  type Coleccion,
} from './repo'

/* ─────────────────────────────────────────────────────────────
   Estado global: sesión, sala activa, datos y acciones.

   Todo lo que se ve está recortado por la sala activa. Los
   permisos se resuelven contra la membresía en esa sala, no
   contra un rol global.
   ───────────────────────────────────────────────────────────── */

const CLAVE_SESION = 'harvey-os:sesion:v1'
const CLAVE_VISTA_PREVIA = 'harvey-os:vista-previa:v1'
const CLAVE_SALA = 'harvey-os:sala:v1'

export type Aviso = { id: string; texto: string; tono: 'ok' | 'error' | 'info' }

interface Ctx {
  // sesión
  yo: Usuario | null
  cargando: boolean
  modo: 'demo' | 'firebase' | 'neon'
  vistaPrevia: boolean
  entrarComoDemo(usuarioId: string, salaId?: string): void
  entrarConGoogle(): Promise<void>
  salir(): Promise<void>

  // datos
  estado: Estado

  // salas
  misSalas: Sala[]
  salaActiva: Sala | null
  elegirSala(id: string): void
  crearSala(datos: Partial<Sala>): Promise<Sala | undefined>
  actualizarSala(id: string, cambios: Partial<Sala>): Promise<void>
  archivarSala(id: string): Promise<void>
  sumarAlaSala(salaId: string, usuarioId: string, rol: RolSala): Promise<void>
  cambiarRolEnSala(salaId: string, usuarioId: string, rol: RolSala): Promise<void>
  sacarDeLaSala(salaId: string, usuarioId: string): Promise<void>

  // permisos, siempre relativos a la sala activa
  esSuperadmin: boolean
  miRol: RolSala | undefined
  puedeOrganizar: boolean
  puedeModerar(r: Reunion): boolean
  /** El organizador ve los compromisos de todos; el miembro, sólo los suyos. */
  compromisosVisibles: Compromiso[]

  // reuniones
  crearReunion(datos: Partial<Reunion>): Promise<Reunion | undefined>
  actualizarReunion(id: string, cambios: Partial<Reunion>): Promise<void>
  borrarReunion(id: string): Promise<void>
  abrirAgenda(id: string): Promise<void>
  cerrarAgenda(id: string): Promise<void>
  iniciarReunion(id: string): Promise<void>
  cerrarReunion(id: string): Promise<void>
  reabrirReunion(id: string): Promise<void>

  // temas
  proponerTema(
    datos: Omit<Tema, 'id' | 'creadoEn' | 'orden' | 'estado' | 'salaId'> & {
      estado?: Tema['estado']
      salaId?: string
    },
  ): Promise<void>
  actualizarTema(id: string, cambios: Partial<Tema>): Promise<void>
  borrarTema(id: string): Promise<void>
  reordenarTemas(reunionId: string, idsEnOrden: string[]): Promise<void>
  /** Saca un tema del banco y lo mete en una reunión. */
  bajarDelBanco(temaId: string, reunionId: string): Promise<void>
  /** Devuelve un tema al banco de la sala. */
  devolverAlBanco(temaId: string): Promise<void>

  // compromisos
  crearCompromiso(datos: Omit<Compromiso, 'id' | 'creadoEn' | 'salaId'>): Promise<void>
  actualizarCompromiso(id: string, cambios: Partial<Compromiso>): Promise<void>
  borrarCompromiso(id: string): Promise<void>
  moverCompromiso(id: string, estado: EstadoCompromiso): Promise<void>

  // personas y config
  guardarUsuario(u: Usuario): Promise<void>
  borrarUsuario(id: string): Promise<void>
  actualizarConfig(cambios: Partial<Config>): Promise<void>

  reenviarNotificacion(id: string): Promise<void>
  restablecerDemo(): Promise<void>

  avisos: Aviso[]
  avisar(texto: string, tono?: Aviso['tono']): void
  descartarAviso(id: string): void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL)
  const [yo, setYo] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [salaId, setSalaId] = useState<string | null>(
    () => localStorage.getItem(CLAVE_SALA),
  )
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [vistaPrevia, setVistaPrevia] = useState(
    () => localStorage.getItem(CLAVE_VISTA_PREVIA) === '1',
  )

  const ref = useRef(estado)
  ref.current = estado
  const persistirRef = useRef<
    (<T extends { id: string }>(col: Coleccion, item: T) => Promise<void>) | null
  >(null)

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
    ;(async () => {
      if (vistaPrevia) {
        usarDatosDeDemostracion()
        const local = await repo.cargar()
        const guardado = localStorage.getItem(CLAVE_SESION)
        const u = local.usuarios.find((x) => x.id === guardado)
        if (!vivo) return
        setEstado(local)
        if (u) setYo(u)
        setCargando(false)
        return
      }
      if (!hayBaseRemota) {
        const inicial = await repo.cargar()
        if (vivo) setEstado(inicial)
      }
      if (vivo && !neonConfigurado) setCargando(false)
    })()
    return () => {
      vivo = false
    }
  }, [vistaPrevia])

  /* Refresco periódico: sólo con sesión real sobre base remota. */
  useEffect(() => {
    if (!hayBaseRemota || vistaPrevia || !yo) return
    return repo.suscribir(setEstado)
  }, [yo, vistaPrevia])

  /* ── Sesión ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!neonConfigurado || vistaPrevia) return
    let vivo = true
    ;(async () => {
      const s = await sesionActual()
      if (!vivo) return
      if (!s) {
        setYo(null)
        setCargando(false)
        return
      }

      let datos = ref.current
      if (datos.usuarios.length === 0) {
        try {
          datos = await repo.cargar()
          if (!vivo) return
          setEstado(datos)
        } catch (e) {
          console.warn('[harvey] no se pudieron cargar los usuarios:', e)
        }
      }

      const porAuth = datos.usuarios.find((u) => u.authUserId === s.id)
      const porEmail = datos.usuarios.find(
        (u) => u.email.toLowerCase() === s.email.toLowerCase(),
      )

      if (porAuth) {
        setYo(porAuth)
      } else if (porEmail) {
        const vinculado: Usuario = {
          ...porEmail,
          authUserId: s.id,
          avatarUrl: porEmail.avatarUrl ?? s.avatarUrl,
        }
        setYo(vinculado)
        await persistirRef.current?.('usuarios', vinculado)
      } else {
        // Alguien nuevo. El alcance lo decide el trigger de la base.
        const nuevo: Usuario = {
          id: `u_${s.id.slice(0, 12)}`,
          authUserId: s.id,
          nombre: s.nombre,
          email: s.email,
          alcance: 'usuario',
          avatarUrl: s.avatarUrl,
          activo: true,
          creadoEn: new Date().toISOString(),
        }
        setYo(nuevo)
        await persistirRef.current?.('usuarios', nuevo)
      }
      setCargando(false)
    })()
    return () => {
      vivo = false
    }
  }, [vistaPrevia])

  useEffect(() => {
    if (neonConfigurado || vistaPrevia) return
    if (!firebaseConfigurado) {
      const guardado = localStorage.getItem(CLAVE_SESION)
      if (guardado) {
        const u = ESTADO_INICIAL.usuarios.find((x) => x.id === guardado)
        if (u) setYo(u)
      }
      return
    }
    return observarSesion((fu) => {
      if (!fu) return
      const existente = ref.current.usuarios.find(
        (u) => u.email.toLowerCase() === (fu.email ?? '').toLowerCase(),
      )
      setYo(
        existente ?? {
          id: fu.uid,
          nombre: fu.displayName ?? fu.email ?? 'Sin nombre',
          email: fu.email ?? '',
          alcance: 'usuario',
          avatarUrl: fu.photoURL ?? undefined,
          activo: true,
          creadoEn: new Date().toISOString(),
        },
      )
    })
  }, [vistaPrevia])

  /* ── Salas ──────────────────────────────────────────────── */

  const misSalas = useMemo(() => salasDe(estado, yo), [estado, yo])

  /* La sala activa siempre tiene que ser una de las mías. */
  useEffect(() => {
    if (!misSalas.length) return
    if (!salaId || !misSalas.some((s) => s.id === salaId)) {
      const elegida = misSalas[0].id
      setSalaId(elegida)
      localStorage.setItem(CLAVE_SALA, elegida)
    }
  }, [misSalas, salaId])

  const salaActiva = useMemo(
    () => misSalas.find((s) => s.id === salaId) ?? null,
    [misSalas, salaId],
  )

  const elegirSala = useCallback((id: string) => {
    setSalaId(id)
    localStorage.setItem(CLAVE_SALA, id)
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
  persistirRef.current = persistir

  const eliminar = useCallback(async (col: Coleccion, id: string) => {
    setEstado((prev) => ({
      ...prev,
      [col]: (prev[col] as { id: string }[]).filter((x) => x.id !== id),
    }))
    await repo.borrarDoc(col, id)
  }, [])

  /* ── Permisos ───────────────────────────────────────────── */

  const esSuperadmin = yo?.alcance === 'superadmin'
  const miRol = useMemo(
    () => (esSuperadmin ? 'organizador' : rolEnSala(estado, salaId ?? undefined, yo?.id)),
    [estado, salaId, yo, esSuperadmin],
  )
  const puedeOrganizar = miRol === 'organizador'

  const puedeModerar = useCallback(
    (r: Reunion) =>
      esSuperadmin ||
      rolEnSala(ref.current, r.salaId, yo?.id) === 'organizador' ||
      r.moderadorId === yo?.id,
    [esSuperadmin, yo],
  )

  /*
   * Un miembro ve sólo lo suyo. Lo pidió Fran mirando la pantalla:
   * "si yo entro, soy un empleado, debería haber sólo mis pendientes".
   */
  const compromisosVisibles = useMemo(() => {
    const deLaSala = estado.compromisos.filter((c) => c.salaId === salaId)
    return puedeOrganizar ? deLaSala : deLaSala.filter((c) => c.responsableId === yo?.id)
  }, [estado.compromisos, salaId, puedeOrganizar, yo])

  /* ── Salas: acciones ────────────────────────────────────── */

  const crearSala = useCallback(
    async (datos: Partial<Sala>) => {
      if (!yo) return undefined
      const s: Sala = {
        id: uid('sala'),
        nombre: datos.nombre?.trim() || 'Sala sin nombre',
        descripcion: datos.descripcion,
        cadencia: datos.cadencia,
        horasCierreAgenda: datos.horasCierreAgenda ?? 24,
        cierreManual: datos.cierreManual ?? false,
        duracionReunionDefaultMin: datos.duracionReunionDefaultMin ?? 60,
        duracionTemaDefaultMin: datos.duracionTemaDefaultMin ?? 15,
        lugarHabitual: datos.lugarHabitual,
        creadaPor: yo.id,
        creadaEn: new Date().toISOString(),
        archivada: false,
      }
      await persistir('salas', s)
      // Quien la crea la organiza. En la base lo hace un trigger;
      // acá se replica para que la interfaz responda al instante.
      const m: Membresia = {
        id: uid('mb'),
        salaId: s.id,
        usuarioId: yo.id,
        rol: 'organizador',
        desde: new Date().toISOString(),
      }
      await persistir('membresias', m)
      elegirSala(s.id)
      avisar(`Sala «${s.nombre}» creada. Ya podés sumar a tu equipo.`)
      return s
    },
    [yo, persistir, elegirSala, avisar],
  )

  const actualizarSala = useCallback(
    async (id: string, cambios: Partial<Sala>) => {
      const actual = ref.current.salas.find((s) => s.id === id)
      if (!actual) return
      await persistir('salas', { ...actual, ...cambios })
    },
    [persistir],
  )

  const archivarSala = useCallback(
    async (id: string) => {
      await actualizarSala(id, { archivada: true })
      avisar('Sala archivada.', 'info')
    },
    [actualizarSala, avisar],
  )

  const sumarAlaSala = useCallback(
    async (sId: string, usuarioId: string, rol: RolSala) => {
      const ya = ref.current.membresias.find(
        (m) => m.salaId === sId && m.usuarioId === usuarioId,
      )
      if (ya) {
        await persistir('membresias', { ...ya, rol })
        return
      }
      await persistir('membresias', {
        id: uid('mb'),
        salaId: sId,
        usuarioId,
        rol,
        desde: new Date().toISOString(),
      })
      avisar('Persona sumada a la sala.')
    },
    [persistir, avisar],
  )

  const cambiarRolEnSala = useCallback(
    async (sId: string, usuarioId: string, rol: RolSala) => {
      const m = ref.current.membresias.find(
        (x) => x.salaId === sId && x.usuarioId === usuarioId,
      )
      if (m) await persistir('membresias', { ...m, rol })
    },
    [persistir],
  )

  const sacarDeLaSala = useCallback(
    async (sId: string, usuarioId: string) => {
      const m = ref.current.membresias.find(
        (x) => x.salaId === sId && x.usuarioId === usuarioId,
      )
      if (m) {
        await eliminar('membresias', m.id)
        avisar('Persona sacada de la sala.', 'info')
      }
    },
    [eliminar, avisar],
  )

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
        salaId: reunion.salaId,
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

  /* ── Reuniones ──────────────────────────────────────────── */

  const crearReunion = useCallback(
    async (datos: Partial<Reunion>) => {
      const sId = datos.salaId ?? salaId
      const s = ref.current.salas.find((x) => x.id === sId)
      if (!sId || !s) return undefined
      const r: Reunion = {
        id: uid('r'),
        salaId: sId,
        titulo: datos.titulo ?? 'Reunión sin título',
        fecha: datos.fecha ?? new Date(Date.now() + 7 * 86400000).toISOString(),
        duracionPrevistaMin: datos.duracionPrevistaMin ?? s.duracionReunionDefaultMin,
        lugar: datos.lugar ?? s.lugarHabitual,
        moderadorId: datos.moderadorId ?? yo?.id ?? '',
        participantesIds:
          datos.participantesIds ??
          ref.current.membresias.filter((m) => m.salaId === sId).map((m) => m.usuarioId),
        estado: datos.estado ?? 'agenda_abierta',
        horasCierreAgenda: datos.horasCierreAgenda ?? s.horasCierreAgenda,
        cierreManual: datos.cierreManual ?? s.cierreManual,
        proximaReunionFecha: datos.proximaReunionFecha,
        creadoPor: yo?.id ?? '',
        creadoEn: new Date().toISOString(),
      }
      await persistir('reuniones', r)
      avisar('Reunión creada. Ya se pueden proponer temas.')
      return r
    },
    [salaId, persistir, yo, avisar],
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
      // Los temas del banco no se pierden: vuelven a quedar sueltos.
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

  /* ── Temas ──────────────────────────────────────────────── */

  const proponerTema = useCallback(
    async (
      datos: Omit<Tema, 'id' | 'creadoEn' | 'orden' | 'estado' | 'salaId'> & {
        estado?: Tema['estado']
        salaId?: string
      },
    ) => {
      const sId = datos.salaId ?? salaId
      if (!sId) return
      const hermanos = datos.reunionId
        ? ref.current.temas.filter((t) => t.reunionId === datos.reunionId)
        : []
      const t: Tema = {
        ...datos,
        salaId: sId,
        id: uid('t'),
        estado: datos.estado ?? (datos.reunionId ? 'propuesto' : 'banco'),
        orden: hermanos.length,
        creadoEn: new Date().toISOString(),
      }
      await persistir('temas', t)
      avisar(
        t.estado === 'banco'
          ? 'Tema guardado en el banco. Va a aparecer cuando se arme la próxima reunión.'
          : t.estado === 'aprobado'
            ? 'Tema agregado a la agenda.'
            : 'Tema propuesto. Queda esperando aprobación del organizador.',
      )
    },
    [salaId, persistir, avisar],
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

  const reordenarTemas = useCallback(async (reunionId: string, idsEnOrden: string[]) => {
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
  }, [])

  const bajarDelBanco = useCallback(
    async (temaId: string, reunionId: string) => {
      const t = ref.current.temas.find((x) => x.id === temaId)
      if (!t) return
      const hermanos = ref.current.temas.filter((x) => x.reunionId === reunionId)
      await persistir('temas', {
        ...t,
        reunionId,
        estado: 'aprobado',
        orden: hermanos.length,
      })
      avisar('Tema agregado a la agenda.')
    },
    [persistir, avisar],
  )

  const devolverAlBanco = useCallback(
    async (temaId: string) => {
      const t = ref.current.temas.find((x) => x.id === temaId)
      if (!t) return
      await persistir('temas', { ...t, reunionId: undefined, estado: 'banco', orden: 0 })
      avisar('Tema devuelto al banco de la sala.', 'info')
    },
    [persistir, avisar],
  )

  /* ── Compromisos ────────────────────────────────────────── */

  const crearCompromiso = useCallback(
    async (datos: Omit<Compromiso, 'id' | 'creadoEn' | 'salaId'>) => {
      if (!salaId) return
      await persistir('compromisos', {
        ...datos,
        salaId,
        id: uid('c'),
        creadoEn: new Date().toISOString(),
      })
      avisar('Compromiso registrado.')
    },
    [salaId, persistir, avisar],
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

  /* ── Personas y configuración ───────────────────────────── */

  const guardarUsuario = useCallback(
    async (u: Usuario) => {
      await persistir('usuarios', u)
      if (yo?.id === u.id) setYo(u)
      avisar('Persona guardada.')
    },
    [persistir, yo, avisar],
  )

  const borrarUsuario = useCallback(
    async (id: string) => {
      await eliminar('usuarios', id)
      avisar('Persona eliminada.', 'info')
    },
    [eliminar, avisar],
  )

  const actualizarConfig = useCallback(async (cambios: Partial<Config>) => {
    const nueva = { ...ref.current.config, ...cambios }
    setEstado((prev) => ({ ...prev, config: nueva }))
    await repo.guardarConfig(nueva)
  }, [])

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
        avisar(
          r === 'enviado' ? 'Correo reenviado.' : 'No hay proveedor de correo conectado.',
          r === 'enviado' ? 'ok' : 'info',
        )
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
    (usuarioId: string, salaSugerida?: string) => {
      usarDatosDeDemostracion()
      const local = structuredClone(ESTADO_INICIAL)
      const u = local.usuarios.find((x) => x.id === usuarioId)
      if (!u) return
      localStorage.setItem(CLAVE_SESION, usuarioId)
      localStorage.setItem(CLAVE_VISTA_PREVIA, '1')
      const suya =
        salaSugerida ??
        local.membresias.find((m) => m.usuarioId === usuarioId)?.salaId ??
        local.salas[0]?.id
      if (suya) {
        setSalaId(suya)
        localStorage.setItem(CLAVE_SALA, suya)
      }
      setEstado(local)
      setVistaPrevia(true)
      setYo(u)
    },
    [],
  )

  const entrarConGoogle = useCallback(async () => {
    try {
      if (neonConfigurado) return void (await entrarConGoogleNeon())
      if (firebaseConfigurado) return void (await loginConGoogle())
      avisar('Todavía no hay credenciales de Google cargadas. Entrá con un perfil de demo.', 'info')
    } catch (e) {
      avisar(`No se pudo iniciar sesión: ${e instanceof Error ? e.message : e}`, 'error')
    }
  }, [avisar])

  const salir = useCallback(async () => {
    localStorage.removeItem(CLAVE_SESION)
    localStorage.removeItem(CLAVE_VISTA_PREVIA)
    localStorage.removeItem(CLAVE_SALA)
    usarBasePrincipal()
    setVistaPrevia(false)
    setYo(null)
    setSalaId(null)
    setEstado(ESTADO_INICIAL)
    if (neonConfigurado) await salirDeNeon()
    if (firebaseConfigurado) await cerrarSesionFirebase()
  }, [])

  const restablecerDemo = useCallback(async () => {
    const limpio = structuredClone(ESTADO_INICIAL)
    setEstado(limpio)
    await repo.reemplazar(limpio)
    avisar('Datos de demostración restablecidos.', 'info')
  }, [avisar])

  const valor = useMemo<Ctx>(
    () => ({
      yo, cargando, modo: repo.modo, vistaPrevia,
      entrarComoDemo, entrarConGoogle, salir,
      estado,
      misSalas, salaActiva, elegirSala,
      crearSala, actualizarSala, archivarSala,
      sumarAlaSala, cambiarRolEnSala, sacarDeLaSala,
      esSuperadmin, miRol, puedeOrganizar, puedeModerar, compromisosVisibles,
      crearReunion, actualizarReunion, borrarReunion,
      abrirAgenda, cerrarAgenda, iniciarReunion, cerrarReunion, reabrirReunion,
      proponerTema, actualizarTema, borrarTema, reordenarTemas,
      bajarDelBanco, devolverAlBanco,
      crearCompromiso, actualizarCompromiso, borrarCompromiso, moverCompromiso,
      guardarUsuario, borrarUsuario, actualizarConfig,
      reenviarNotificacion, restablecerDemo,
      avisos, avisar, descartarAviso,
    }),
    [
      yo, cargando, vistaPrevia, estado, misSalas, salaActiva, esSuperadmin, miRol,
      puedeOrganizar, puedeModerar, compromisosVisibles, avisos,
      entrarComoDemo, entrarConGoogle, salir, elegirSala,
      crearSala, actualizarSala, archivarSala, sumarAlaSala, cambiarRolEnSala, sacarDeLaSala,
      crearReunion, actualizarReunion, borrarReunion, abrirAgenda, cerrarAgenda,
      iniciarReunion, cerrarReunion, reabrirReunion,
      proponerTema, actualizarTema, borrarTema, reordenarTemas, bajarDelBanco, devolverAlBanco,
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
