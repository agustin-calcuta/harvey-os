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
import { RECURRENCIAS } from '../types'
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
  SalaAjena,
  Solicitud,
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
  /** Irse de una sala por decisión propia. */
  salirDeSala(salaId: string): Promise<void>

  // pedidos de entrada a salas ajenas
  /** Qué salas existen además de las propias, para no duplicar nombres. */
  cargarDirectorio(): Promise<SalaAjena[]>
  pedirEntrar(salaId: string, mensaje?: string): Promise<void>
  retirarSolicitud(id: string): Promise<void>
  resolverSolicitud(id: string, decision: 'aceptada' | 'rechazada'): Promise<void>
  /** Pedidos que me toca resolver, de todas las salas que organizo. */
  solicitudesPendientes: Solicitud[]
  /** Mis pedidos todavía sin respuesta. */
  misSolicitudes: Solicitud[]

  // permisos, siempre relativos a la sala activa
  esSuperadmin: boolean
  miRol: RolSala | undefined
  puedeOrganizar: boolean
  puedeModerar(r: Reunion): boolean
  /** Abrir salas es de los socios. Reuniones crea cualquiera. */
  puedeCrearSalas: boolean
  /** El organizador ve las tareas de todos; el miembro, sólo las suyas. */
  compromisosVisibles: Compromiso[]

  // reuniones
  crearReunion(datos: Partial<Reunion>): Promise<Reunion | undefined>
  actualizarReunion(id: string, cambios: Partial<Reunion>): Promise<void>
  borrarReunion(id: string): Promise<void>
  abrirAgenda(id: string): Promise<void>
  /** Cierra el temario. Avisa por correo salvo que se pida lo contrario. */
  cerrarAgenda(id: string, notificar?: boolean): Promise<void>
  iniciarReunion(id: string): Promise<void>
  cerrarReunion(id: string, notificar?: boolean): Promise<void>
  reabrirReunion(id: string): Promise<void>
  /** Manda la minuta ya revisada. Es el último paso, después de recorrerla entera. */
  enviarMinuta(id: string): Promise<void>
  /** Suma a alguien que no es de la sala: entra a esta reunión y a nada más. */
  sumarInvitado(reunionId: string, nombre: string, email: string): Promise<void>
  /** Busca a alguien por correo y, si no está, lo da de alta. */
  asegurarPersona(nombre: string, email: string): Promise<Usuario | undefined>

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
  /** Lleva un tema del temario personal —o uno que quedó sin tratar— a una reunión. */
  asignarAReunion(temaId: string, reunionId: string): Promise<void>
  /** Lo devuelve al temario de quien lo propuso. */
  devolverAlTemario(temaId: string): Promise<void>

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
   * Abrir una sala quedó en manos de los socios: "una persona no puede
   * crear una sala; puede crear una reunión". Lo cuida una política de
   * la base; acá se replica para no mostrar un botón que va a fallar.
   */
  const puedeCrearSalas = esSuperadmin || yo?.puedeCrearSalas === true

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
      if (!puedeCrearSalas) {
        avisar('Las salas las abren los socios. Vos podés crear reuniones en las tuyas.', 'info')
        return undefined
      }
      const s: Sala = {
        id: uid('sala'),
        nombre: datos.nombre?.trim() || 'Sala sin nombre',
        descripcion: datos.descripcion,
        cadencia: datos.cadencia,
        horasCierreAgenda: datos.horasCierreAgenda ?? 24,
        // El temario lo cierra el organizador cuando quiere.
        cierreManual: datos.cierreManual ?? true,
        duracionReunionDefaultMin: datos.duracionReunionDefaultMin ?? 60,
        duracionTemaDefaultMin: datos.duracionTemaDefaultMin ?? 15,
        lugarHabitual: datos.lugarHabitual,
        lugares: datos.lugares ?? [],
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
    [yo, puedeCrearSalas, persistir, elegirSala, avisar],
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

  const salirDeSala = useCallback(
    async (sId: string) => {
      if (!yo) return
      const m = ref.current.membresias.find(
        (x) => x.salaId === sId && x.usuarioId === yo.id,
      )
      if (!m) return
      const nombre = ref.current.salas.find((s) => s.id === sId)?.nombre ?? 'la sala'
      try {
        await eliminar('membresias', m.id)
      } catch (e) {
        // El trigger de la base corta si se iba el último organizador.
        avisar(e instanceof Error ? e.message : 'No se pudo salir de la sala.', 'error')
        return
      }
      if (salaId === sId) {
        setSalaId(null)
        localStorage.removeItem(CLAVE_SALA)
      }
      avisar(`Saliste de «${nombre}».`, 'info')
    },
    [yo, salaId, eliminar, avisar],
  )

  /* ── Pedidos de entrada ─────────────────────────────────── */

  const cargarDirectorio = useCallback(() => repo.directorioSalas(), [])

  const pedirEntrar = useCallback(
    async (sId: string, mensaje?: string) => {
      if (!yo) return
      const ya = ref.current.solicitudes.find(
        (s) => s.salaId === sId && s.usuarioId === yo.id && s.estado === 'pendiente',
      )
      if (ya) {
        avisar('Ya hay un pedido esperando respuesta en esa sala.', 'info')
        return
      }
      await persistir('solicitudes', {
        id: uid('sol'),
        salaId: sId,
        usuarioId: yo.id,
        mensaje: mensaje?.trim() || undefined,
        estado: 'pendiente',
        creadaEn: new Date().toISOString(),
      })
      avisar('Pedido enviado. Cuando el organizador lo acepte vas a ver la sala acá.')
    },
    [yo, persistir, avisar],
  )

  const retirarSolicitud = useCallback(
    async (id: string) => {
      await eliminar('solicitudes', id)
      avisar('Pedido retirado.', 'info')
    },
    [eliminar, avisar],
  )

  /*
   * Aceptar es sumar: la membresía se crea acá para que la interfaz
   * responda al instante. En la base un trigger hace lo mismo, por si
   * el pedido se resuelve desde otro lado.
   */
  const resolverSolicitud = useCallback(
    async (id: string, decision: 'aceptada' | 'rechazada') => {
      const s = ref.current.solicitudes.find((x) => x.id === id)
      if (!s) return
      const quien = ref.current.usuarios.find((u) => u.id === s.usuarioId)?.nombre ?? 'La persona'
      if (decision === 'aceptada') {
        await sumarAlaSala(s.salaId, s.usuarioId, 'miembro')
      }
      await persistir('solicitudes', {
        ...s,
        estado: decision,
        resueltaEn: new Date().toISOString(),
      })
      avisar(
        decision === 'aceptada'
          ? `${quien} ya es parte de la sala.`
          : `Pedido de ${quien} rechazado.`,
        decision === 'aceptada' ? 'ok' : 'info',
      )
    },
    [sumarAlaSala, persistir, avisar],
  )

  /* Los pedidos que puedo resolver: los de las salas que organizo. */
  const solicitudesPendientes = useMemo(
    () =>
      estado.solicitudes.filter(
        (s) =>
          s.estado === 'pendiente' &&
          (esSuperadmin || rolEnSala(estado, s.salaId, yo?.id) === 'organizador'),
      ),
    [estado, yo, esSuperadmin],
  )

  const misSolicitudes = useMemo(
    () => estado.solicitudes.filter((s) => s.usuarioId === yo?.id && s.estado === 'pendiente'),
    [estado.solicitudes, yo],
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

  /*
   * Los participantes ya no vienen todos marcados: el organizador
   * elige quiénes van. Ariel cargó una reunión creyendo lo contrario y
   * le quedó con cero participantes, así que por omisión queda sólo
   * quien la arma.
   */
  const crearReunion = useCallback(
    async (datos: Partial<Reunion>) => {
      const sId = datos.salaId ?? salaId
      const s = ref.current.salas.find((x) => x.id === sId)
      if (!sId || !s) return undefined
      const moderadorId = datos.moderadorId ?? yo?.id ?? ''
      const participantes = datos.participantesIds ?? (yo ? [yo.id] : [])
      const r: Reunion = {
        id: uid('r'),
        salaId: sId,
        titulo: datos.titulo ?? 'Reunión sin título',
        fecha: datos.fecha ?? new Date(Date.now() + 7 * 86400000).toISOString(),
        duracionPrevistaMin: datos.duracionPrevistaMin ?? s.duracionReunionDefaultMin,
        lugar: datos.lugar ?? s.lugarHabitual,
        moderadorId,
        // Quien modera siempre está en la reunión que modera.
        participantesIds: participantes.includes(moderadorId)
          ? participantes
          : [moderadorId, ...participantes].filter(Boolean),
        estado: datos.estado ?? 'agenda_abierta',
        privada: datos.privada ?? false,
        recurrencia: datos.recurrencia ?? 'unica',
        // La primera de una serie la encabeza: las siguientes heredan su id.
        serieId:
          datos.serieId ?? (datos.recurrencia && datos.recurrencia !== 'unica' ? uid('serie') : undefined),
        horasCierreAgenda: datos.horasCierreAgenda ?? s.horasCierreAgenda,
        cierreManual: datos.cierreManual ?? s.cierreManual,
        proximaReunionFecha: datos.proximaReunionFecha,
        creadoPor: yo?.id ?? '',
        creadoEn: new Date().toISOString(),
      }
      await persistir('reuniones', r)
      avisar('Reunión creada. Ya se pueden cargar temas.')
      return r
    },
    [salaId, persistir, yo, avisar],
  )

  /*
   * Sumar a alguien de afuera: entra a esta reunión y a nada más.
   *
   * "Si soy de diseño y me sumo a una reunión de marketing, no me sumo
   * a la sala de marketing y tengo acceso a todas sus minutas". Si la
   * persona no existe todavía, se da de alta con su correo y se
   * engancha sola cuando entre con Google.
   */
  const asegurarPersona = useCallback(
    async (nombre: string, email: string) => {
      const correo = email.trim().toLowerCase()
      if (!correo) return undefined
      const existente = ref.current.usuarios.find((u) => u.email.toLowerCase() === correo)
      if (existente) return existente
      const nueva: Usuario = {
        id: uid('u'),
        nombre: nombre.trim() || correo,
        email: correo,
        alcance: 'usuario',
        activo: true,
        creadoEn: new Date().toISOString(),
      }
      await persistir('usuarios', nueva)
      return nueva
    },
    [persistir],
  )

  const sumarInvitado = useCallback(
    async (reunionId: string, nombre: string, email: string) => {
      const r = ref.current.reuniones.find((x) => x.id === reunionId)
      if (!r) return
      const persona = await asegurarPersona(nombre, email)
      if (!persona) return
      if (r.participantesIds.includes(persona.id)) {
        avisar('Esa persona ya está en la reunión.', 'info')
        return
      }
      await persistir('reuniones', {
        ...r,
        participantesIds: [...r.participantesIds, persona.id],
      })
      avisar(`${persona.nombre} queda invitada a esta reunión, sin entrar a la sala.`)
    },
    [asegurarPersona, persistir, avisar],
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
      // Los temas no se pierden: vuelven al temario de quien los escribió.
      for (const t of ref.current.temas.filter((t) => t.reunionId === id)) {
        await persistir('temas', {
          ...t,
          reunionId: undefined,
          salaId: undefined,
          estado: 'banco',
          orden: 0,
        })
      }
      await eliminar('reuniones', id)
      avisar('Reunión eliminada. Los temas volvieron al temario de cada uno.', 'info')
    },
    [eliminar, persistir, avisar],
  )

  const abrirAgenda = useCallback(
    async (id: string) => {
      await actualizarReunion(id, { estado: 'agenda_abierta' })
      avisar('Agenda abierta. El equipo ya puede proponer temas.')
    },
    [actualizarReunion, avisar],
  )

  /*
   * Cerrar el temario es avisar de qué se va a hablar, no trabar la
   * carga: se pueden seguir sumando temas hasta que la reunión se
   * cierre. El aviso es opcional, con una casilla en el botón.
   */
  const cerrarAgenda = useCallback(
    async (id: string, notificar = true) => {
      const r = ref.current.reuniones.find((x) => x.id === id)
      if (!r) return
      const actualizada: Reunion = {
        ...r,
        estado: 'agenda_cerrada',
        agendaCerradaEn: new Date().toISOString(),
      }
      await persistir('reuniones', actualizada)
      if (!notificar) {
        avisar('Temario cerrado. No se avisó a nadie.', 'info')
        return
      }
      const n = await registrarCorreo(
        'agenda_cerrada',
        actualizada,
        correoAgendaCerrada(ref.current, actualizada),
      )
      avisar(
        n.estado === 'enviado'
          ? `Temario cerrado y avisado a ${n.destinatarios.length} personas.`
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

  /*
   * Cerrar y generar minuta.
   *
   * Lo que se habló queda tratado. Lo que no se llegó a hablar no se
   * pierde: vuelve como "sin tratar" al temario de quien lo propuso y
   * queda disponible para incluirlo en la próxima —"que le vuelva a la
   * persona que lo propuso, para que no se olvide"—.
   *
   * Si la reunión se repite, la siguiente se crea sola: así en
   * «Próximas» siempre hay una y nadie tiene que acordarse de armarla.
   */
  const cerrarReunion = useCallback(
    async (id: string, notificar = true) => {
      const r = ref.current.reuniones.find((x) => x.id === id)
      if (!r) return

      let sinTratar = 0
      for (const t of agendaDe(ref.current, id)) {
        if (t.estado !== 'aprobado') continue
        const seHablo = !!t.conclusiones?.trim() || (t.duracionRealSeg ?? 0) > 0
        if (seHablo) {
          await persistir('temas', { ...t, estado: 'tratado' })
        } else {
          sinTratar++
          await persistir('temas', {
            ...t,
            estado: 'diferido',
            reunionId: undefined,
            orden: 0,
          })
        }
      }

      const actualizada: Reunion = {
        ...r,
        estado: 'cerrada',
        cerradaEn: new Date().toISOString(),
      }
      await persistir('reuniones', actualizada)

      if (r.recurrencia && r.recurrencia !== 'unica') {
        const dias = RECURRENCIAS[r.recurrencia].dias
        const siguiente: Reunion = {
          ...r,
          id: uid('r'),
          serieId: r.serieId ?? r.id,
          fecha: new Date(new Date(r.fecha).getTime() + dias * 86400000).toISOString(),
          estado: 'agenda_abierta',
          conclusionesGenerales: undefined,
          observaciones: undefined,
          agendaCerradaEn: undefined,
          iniciadaEn: undefined,
          cerradaEn: undefined,
          creadoEn: new Date().toISOString(),
        }
        await persistir('reuniones', siguiente)
      }

      if (notificar) {
        const n = await registrarCorreo(
          'minuta',
          actualizada,
          correoMinuta(ref.current, actualizada),
        )
        avisar(
          n.estado === 'enviado'
            ? `Minuta enviada a ${n.destinatarios.length} personas.`
            : `Minuta generada. Quedó lista para ${n.destinatarios.length} destinatarios.`,
        )
      } else {
        avisar('Minuta generada. No se avisó a nadie.', 'info')
      }

      if (sinTratar > 0) {
        avisar(
          sinTratar === 1
            ? 'Un tema no se llegó a hablar: volvió al temario de quien lo propuso.'
            : `${sinTratar} temas no se llegaron a hablar: volvieron al temario de cada uno.`,
          'info',
        )
      }
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

  /*
   * La minuta sale cuando el organizador terminó de revisarla, no al
   * cerrar la reunión: cerrar es generar el borrador, y recién después
   * de recorrerlo entero se manda.
   */
  const enviarMinuta = useCallback(
    async (id: string) => {
      const r = ref.current.reuniones.find((x) => x.id === id)
      if (!r) return
      const n = await registrarCorreo('minuta', r, correoMinuta(ref.current, r))
      avisar(
        n.estado === 'enviado'
          ? `Minuta enviada a ${n.destinatarios.length} personas.`
          : `Minuta lista para ${n.destinatarios.length} destinatarios. Falta conectar la casilla de correo.`,
        n.estado === 'enviado' ? 'ok' : 'info',
      )
    },
    [registrarCorreo, avisar],
  )

  /* ── Temas ──────────────────────────────────────────────── */

  /*
   * Un tema sin reunión va al temario personal: sin sala, y sólo lo ve
   * quien lo escribió. Uno con reunión toma la sala de esa reunión.
   */
  const proponerTema = useCallback(
    async (
      datos: Omit<Tema, 'id' | 'creadoEn' | 'orden' | 'estado' | 'salaId'> & {
        estado?: Tema['estado']
        salaId?: string
      },
    ) => {
      const estado = datos.estado ?? (datos.reunionId ? 'propuesto' : 'banco')
      const deLaReunion = ref.current.reuniones.find((r) => r.id === datos.reunionId)
      const sId =
        estado === 'banco'
          ? undefined
          : (deLaReunion?.salaId ?? datos.salaId ?? salaId ?? undefined)
      if (estado !== 'banco' && !sId) return
      const hermanos = datos.reunionId
        ? ref.current.temas.filter((t) => t.reunionId === datos.reunionId)
        : []
      const t: Tema = {
        ...datos,
        salaId: sId,
        reunionId: estado === 'banco' ? undefined : datos.reunionId,
        id: uid('t'),
        estado,
        orden: hermanos.length,
        creadoEn: new Date().toISOString(),
      }
      await persistir('temas', t)
      avisar(
        t.estado === 'banco'
          ? 'Anotado en tu temario. Lo asignás a la reunión que quieras cuando quieras.'
          : t.estado === 'aprobado'
            ? 'Tema agregado a la agenda.'
            : 'Tema propuesto. Queda esperando que el organizador lo apruebe.',
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

  /*
   * Llevar un tema a una reunión: sale del temario y toma la sala de
   * esa reunión. "Lo saqué de mi mente y lo pasé formalmente a una
   * reunión" — si se quedara en las dos partes, el bloc no terminaría
   * nunca de crecer.
   */
  const asignarAReunion = useCallback(
    async (temaId: string, reunionId: string) => {
      const t = ref.current.temas.find((x) => x.id === temaId)
      const r = ref.current.reuniones.find((x) => x.id === reunionId)
      if (!t || !r) return
      const hermanos = ref.current.temas.filter((x) => x.reunionId === reunionId)
      await persistir('temas', {
        ...t,
        salaId: r.salaId,
        reunionId,
        estado: 'aprobado',
        orden: hermanos.length,
      })
      avisar(`Tema incluido en «${r.titulo}».`)
    },
    [persistir, avisar],
  )

  const devolverAlTemario = useCallback(
    async (temaId: string) => {
      const t = ref.current.temas.find((x) => x.id === temaId)
      if (!t) return
      await persistir('temas', {
        ...t,
        reunionId: undefined,
        salaId: undefined,
        estado: 'banco',
        orden: 0,
      })
      avisar('Tema devuelto al temario de quien lo propuso.', 'info')
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
      avisar('Tarea registrada.')
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
      sumarAlaSala, cambiarRolEnSala, sacarDeLaSala, salirDeSala,
      cargarDirectorio, pedirEntrar, retirarSolicitud, resolverSolicitud,
      solicitudesPendientes, misSolicitudes,
      esSuperadmin, miRol, puedeOrganizar, puedeModerar, puedeCrearSalas, compromisosVisibles,
      crearReunion, actualizarReunion, borrarReunion,
      abrirAgenda, cerrarAgenda, iniciarReunion, cerrarReunion, reabrirReunion,
      sumarInvitado, asegurarPersona, enviarMinuta,
      proponerTema, actualizarTema, borrarTema, reordenarTemas,
      asignarAReunion, devolverAlTemario,
      crearCompromiso, actualizarCompromiso, borrarCompromiso, moverCompromiso,
      guardarUsuario, borrarUsuario, actualizarConfig,
      reenviarNotificacion, restablecerDemo,
      avisos, avisar, descartarAviso,
    }),
    [
      yo, cargando, vistaPrevia, estado, misSalas, salaActiva, esSuperadmin, miRol,
      puedeOrganizar, puedeModerar, puedeCrearSalas, compromisosVisibles, avisos,
      entrarComoDemo, entrarConGoogle, salir, elegirSala,
      crearSala, actualizarSala, archivarSala, sumarAlaSala, cambiarRolEnSala, sacarDeLaSala,
      salirDeSala, cargarDirectorio, pedirEntrar, retirarSolicitud, resolverSolicitud,
      solicitudesPendientes, misSolicitudes,
      crearReunion, actualizarReunion, borrarReunion, abrirAgenda, cerrarAgenda,
      iniciarReunion, cerrarReunion, reabrirReunion, enviarMinuta,
      sumarInvitado, asegurarPersona,
      proponerTema, actualizarTema, borrarTema, reordenarTemas, asignarAReunion, devolverAlTemario,
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
