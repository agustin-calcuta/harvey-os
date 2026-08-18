/* ─────────────────────────────────────────────────────────────
   Modelo de dominio — HARVEY

   Derivado de la minuta de Francisco Lebermann y de las reuniones
   del 05/08 y 07/08 de 2026.

   La unidad de trabajo es la **sala**: un espacio con su propio
   equipo, sus reuniones y su propio banco de temas. Cada persona
   ve sólo las salas de las que forma parte, y su rol se define
   dentro de cada una: la misma persona puede organizar la suya y
   ser miembro en la de al lado.
   ───────────────────────────────────────────────────────────── */

/* ── Roles ────────────────────────────────────────────────── */

/**
 * Rol dentro de una sala. No es global: vive en la membresía, así que
 * la misma persona puede ser socia de la suya y miembro en la de al
 * lado.
 *
 * La clave interna sigue diciendo `organizador` —renombrarla obliga a
 * migrar la base y las políticas— pero de cara a quien la usa son
 * **socio** y **miembro**, que es como se llaman entre ellos.
 */
export type RolSala = 'organizador' | 'miembro' | 'externo'

export const ROLES_SALA: Record<RolSala, { nombre: string; desc: string }> = {
  organizador: {
    nombre: 'Socio',
    desc: 'Arma la agenda, aprueba temas, modera, decide quién entra y puede borrar. Es el único que abre salas nuevas.',
  },
  miembro: {
    nombre: 'Miembro',
    desc: 'Propone temas, crea y sigue sus tareas, y pide entrar a las salas donde quiera participar.',
  },
  /*
   * Para el proveedor recurrente. Ariel no lo quiso de sólo lectura:
   * *"si es un proveedor con el que trabajamos siempre, que pueda
   * proponer temas o ver las tareas que le asignaron"*. Eso y nada
   * más: no ve las tareas de los demás ni el resto de la sala.
   */
  externo: {
    nombre: 'Externo',
    desc: 'Proveedor o invitado permanente. Propone temas —los aprueba el socio— y ve las tareas que tiene a su nombre. No ve las de los demás.',
  },
}

/** Los que son del equipo. El externo mira desde afuera. */
export const ROLES_INTERNOS: RolSala[] = ['organizador', 'miembro']

/**
 * Alcance de la cuenta, por encima de las salas.
 *
 * `superadmin` es la cuenta nuestra, no forma parte de ningún equipo:
 * ve todo, puede intervenir en cualquier sala y es el único que
 * puede dar de baja a un administrador. Queda fuera de toda lista
 * donde se elige gente.
 */
export type Alcance = 'superadmin' | 'usuario'

export interface Usuario {
  id: string
  /** `sub` del JWT del proveedor de identidad. Se vincula por correo al primer ingreso. */
  authUserId?: string
  nombre: string
  email: string
  alcance: Alcance
  /**
   * Abrir salas quedó en manos de los socios; reuniones crea
   * cualquiera. Se marca desde Administración y nadie se lo puede dar
   * a sí mismo: lo congela un disparador de la base.
   */
  puedeCrearSalas?: boolean
  avatarUrl?: string
  cargo?: string
  activo: boolean
  creadoEn: string
}

/* ── Salas ────────────────────────────────────────────────── */

/**
 * El alta pregunta cuatro cosas —nombre, descripción, cadencia y a
 * quién sumar—. El resto son valores por omisión para precargar el
 * formulario de cada reunión, y se ajustan después desde la sala.
 */
export interface Sala {
  id: string
  nombre: string
  descripcion?: string
  /** Cadencia habitual, ej. "Lunes 10:00". Sugerida al crear una reunión. */
  cadencia?: string
  horasCierreAgenda: number
  /** Sin cierre automático: el temario queda abierto hasta que el organizador lo cierre. */
  cierreManual: boolean
  duracionReunionDefaultMin: number
  duracionTemaDefaultMin: number
  lugarHabitual?: string
  /** Lo que ofrece el desplegable de lugar. Vacío: los ya usados en la sala. */
  lugares?: string[]
  creadaPor: string
  creadaEn: string
  archivada: boolean
}

export interface Membresia {
  id: string
  salaId: string
  usuarioId: string
  rol: RolSala
  desde: string
}

/**
 * Pedido de entrada a una sala ajena.
 *
 * Aparece cuando alguien va a crear una sala que ya existe: en vez de
 * armar una segunda con el mismo nombre, pide sumarse a la que hay.
 */
export interface Solicitud {
  id: string
  salaId: string
  usuarioId: string
  mensaje?: string
  estado: 'pendiente' | 'aceptada' | 'rechazada'
  creadaEn: string
  resueltaEn?: string
}

/**
 * Lo que se puede saber de una sala ajena: que existe, cómo se llama y
 * a quién pedirle entrar. Nada de su contenido.
 */
export interface SalaAjena {
  id: string
  nombre: string
  organizador: string
  integrantes: number
}

/* ── Temas ────────────────────────────────────────────────── */

/** Semáforo de importancia — el "rojo / amarillo / verde" que pidió Fran. */
export type Importancia = 'alta' | 'media' | 'baja'

export const IMPORTANCIA: Record<
  Importancia,
  { nombre: string; alias: string; color: string; bg: string; hex: string }
> = {
  alta: {
    nombre: 'Alta',
    alias: 'Caliente',
    color: 'text-signal',
    bg: 'bg-signal',
    hex: '#C0392B',
  },
  media: {
    nombre: 'Media',
    alias: 'Tibio',
    color: 'text-amber',
    bg: 'bg-amber',
    hex: '#B26B18',
  },
  baja: {
    nombre: 'Baja',
    alias: 'Frío',
    color: 'text-cold',
    bg: 'bg-cold',
    hex: '#2E6285',
  },
}

/** Los cuatro objetivos del formato de minuta de Fran. */
export type Objetivo = 'decision' | 'exploratoria' | 'comunicativa' | 'informativa'

export const OBJETIVOS: Record<
  Objetivo,
  {
    nombre: string
    desc: string
    sigla: string
    /** Qué se le pide anotar al cerrar el tema. Cambia según para qué se trató. */
    pideConclusion: string
    ejemploConclusion: string
  }
> = {
  decision: {
    nombre: 'Decisión',
    sigla: 'DEC',
    desc: 'Se necesita definir algo y salir con una resolución tomada.',
    pideConclusion: 'Qué se decidió',
    ejemploConclusion:
      'Qué se resolvió, con qué alcance y desde cuándo. Si quedó alguien a cargo, registralo abajo como tarea.',
  },
  exploratoria: {
    nombre: 'Exploratoria',
    sigla: 'EXP',
    desc: 'Se abre el tema para pensarlo en conjunto, sin cerrar todavía.',
    pideConclusion: 'Hasta dónde se llegó',
    ejemploConclusion:
      'Qué caminos aparecieron, qué quedó descartado y qué falta averiguar para poder decidir.',
  },
  comunicativa: {
    nombre: 'Comunicativa',
    sigla: 'COM',
    desc: 'Se comunica algo que impacta al resto y admite devolución.',
    pideConclusion: 'Qué se comunicó y qué devolución hubo',
    ejemploConclusion: 'Qué se transmitió, cómo lo tomó el equipo y qué objeciones aparecieron.',
  },
  informativa: {
    nombre: 'Informativa',
    sigla: 'INF',
    desc: 'Se informa un estado o avance. No requiere discusión.',
    pideConclusion: 'Qué se informó',
    ejemploConclusion: 'El estado o los números que se pasaron, para que queden registrados.',
  },
}

export type EstadoTema =
  /** En el temario personal de quien lo escribió: sin sala y sin reunión. */
  | 'banco'
  | 'propuesto'
  | 'aprobado'
  | 'rechazado'
  /** Estuvo en una agenda y no se llegó a hablar. Conserva la sala. */
  | 'diferido'
  | 'tratado'

export const ESTADO_TEMA: Record<EstadoTema, { nombre: string; color: string }> = {
  banco: { nombre: 'En mi bloc', color: 'text-cold' },
  propuesto: { nombre: 'Propuesto', color: 'text-suave' },
  aprobado: { nombre: 'En agenda', color: 'text-acid' },
  rechazado: { nombre: 'Rechazado', color: 'text-signal' },
  diferido: { nombre: 'Sin tratar', color: 'text-amber' },
  tratado: { nombre: 'Tratado', color: 'text-cold' },
}

/**
 * Un tema vive en dos lados, y de eso depende quién lo ve.
 *
 * En el **temario** —el bloc de notas personal de cada uno— no tiene
 * sala ni reunión, y sólo lo ve quien lo escribió: *"a vos no te
 * interesa ver el temario que yo quiero cargar"*. Cuando se asigna a
 * una reunión toma la sala de esa reunión y pasa a ser del equipo.
 *
 * El que se llevó a una reunión y no se llegó a hablar queda
 * `diferido`: pierde la reunión y conserva la sala, así el
 * organizador lo puede volver a incluir y a la vez le vuelve a
 * aparecer en el temario a quien lo propuso.
 */
export interface Tema {
  id: string
  /** Sin sala mientras está en el temario personal. */
  salaId?: string
  reunionId?: string
  titulo: string
  detalle?: string
  importancia: Importancia
  objetivo: Objetivo
  propuestoPor: string
  duracionMin: number
  duracionRealSeg?: number
  estado: EstadoTema
  orden: number
  /** Notas tomadas durante la reunión sobre este tema. */
  conclusiones?: string
  motivoRechazo?: string
  creadoEn: string
}

/* ── Reuniones ────────────────────────────────────────────── */

/**
 * Cuatro estados. «Borrador» se fue: si la reunión existe, se le
 * pueden cargar temas, y nadie entendía la diferencia.
 */
export type EstadoReunion = 'agenda_abierta' | 'agenda_cerrada' | 'en_curso' | 'cerrada'

export const ESTADO_REUNION: Record<
  EstadoReunion,
  { nombre: string; color: string; bg: string; desc: string }
> = {
  agenda_abierta: {
    nombre: 'Agenda abierta',
    color: 'text-acid',
    bg: 'bg-acid/15',
    desc: 'Se pueden proponer temas.',
  },
  agenda_cerrada: {
    nombre: 'Temario cerrado',
    color: 'text-amber',
    bg: 'bg-amber/15',
    desc: 'Temario definido y avisado. Igual se puede sumar algo de último momento.',
  },
  en_curso: {
    nombre: 'En curso',
    color: 'text-signal',
    bg: 'bg-signal/15',
    desc: 'La reunión se está desarrollando ahora.',
  },
  cerrada: {
    nombre: 'Cerrada',
    color: 'text-cold',
    bg: 'bg-cold/15',
    desc: 'Minuta emitida y tareas distribuidas.',
  },
}

/** Cada cuánto se repite. Se elige al crear la reunión, no en la sala. */
export type Recurrencia = 'unica' | 'semanal' | 'quincenal' | 'mensual'

export const RECURRENCIAS: Record<Recurrencia, { nombre: string; dias: number }> = {
  unica: { nombre: 'Por única vez', dias: 0 },
  semanal: { nombre: 'Todas las semanas', dias: 7 },
  quincenal: { nombre: 'Cada quince días', dias: 14 },
  mensual: { nombre: 'Una vez por mes', dias: 28 },
}

export interface Reunion {
  id: string
  salaId: string
  titulo: string
  /** ISO datetime del inicio. */
  fecha: string
  duracionPrevistaMin: number
  lugar?: string
  moderadorId: string
  /**
   * Puede incluir a alguien que no es de la sala: se suma a esta
   * reunión, no al equipo, y no ve el resto de las minutas.
   */
  participantesIds: string[]
  estado: EstadoReunion
  /** No se lista para el resto de la sala: sólo la ven los que están. */
  privada?: boolean
  recurrencia?: Recurrencia
  /** Las de una misma serie lo comparten. En «Próximas» se ve una sola. */
  serieId?: string
  /** Horas antes del inicio en que se cierra la carga de temas. */
  horasCierreAgenda: number
  /** Sin cierre automático: sólo cierra cuando el organizador aprieta el botón. */
  cierreManual: boolean
  conclusionesGenerales?: string
  observaciones?: string
  proximaReunionFecha?: string
  agendaCerradaEn?: string
  iniciadaEn?: string
  cerradaEn?: string
  /**
   * El evento en Google Calendar, si se sincronizó. Con el id se lo
   * actualiza o se lo cancela después; el resto es para mostrar.
   */
  calendarEventoId?: string
  calendarUrl?: string
  meetUrl?: string
  creadoPor: string
  creadoEn: string
}

/* ── Tareas ───────────────────────────────────────────────── */

/*
 * De cara a quien la usa esto son **tareas**: la palabra "compromiso"
 * se fue de toda la interfaz. Adentro el tipo y la tabla conservan el
 * nombre viejo a propósito —renombrar la tabla obliga a migrar la
 * base y a rehacer el caché de la Data API sin que nadie lo note—.
 *
 * Tres estados y no más: *"o lo tengo pendiente y todavía no lo pude
 * hacer, o ya lo terminé"*. Lo que está trabado se cuenta en el
 * avance de la tarea en curso, que es donde se explica por qué.
 */
export type EstadoCompromiso = 'pendiente' | 'en_curso' | 'hecho'

export const ESTADO_COMPROMISO: Record<
  EstadoCompromiso,
  { nombre: string; color: string; bg: string; border: string }
> = {
  pendiente: {
    nombre: 'Pendiente',
    color: 'text-suave',
    bg: 'bg-hueco',
    border: 'border-borde2',
  },
  en_curso: {
    nombre: 'En curso',
    color: 'text-amber',
    bg: 'bg-amber/15',
    border: 'border-amber',
  },
  hecho: {
    nombre: 'Hecha',
    color: 'text-acid',
    bg: 'bg-acid/15',
    border: 'border-acid',
  },
}

export const COLUMNAS_KANBAN: EstadoCompromiso[] = ['pendiente', 'en_curso', 'hecho']

export interface Compromiso {
  id: string
  salaId: string
  /** Puede no venir de una reunión: se cargan sueltos también. */
  reunionId?: string
  temaId?: string
  accion: string
  detalle?: string
  responsableId: string
  fechaLimite?: string
  importancia: Importancia
  estado: EstadoCompromiso
  avance?: string
  completadoEn?: string
  creadoEn: string
}

/* ── Notificaciones / correos ─────────────────────────────── */

export type TipoNotificacion = 'agenda_cerrada' | 'minuta' | 'recordatorio' | 'tema_aprobado'

export interface Notificacion {
  id: string
  salaId: string
  tipo: TipoNotificacion
  reunionId: string
  asunto: string
  destinatarios: string[]
  cuerpoHtml: string
  cuerpoTexto: string
  estado: 'simulado' | 'enviado' | 'error'
  error?: string
  creadoEn: string
}

/* ── Configuración global ─────────────────────────────────── */

export interface Config {
  organizacion: string
  emailsActivos: boolean
}

/* ── Snapshot completo del estado ─────────────────────────── */

export interface Estado {
  usuarios: Usuario[]
  salas: Sala[]
  membresias: Membresia[]
  solicitudes: Solicitud[]
  reuniones: Reunion[]
  temas: Tema[]
  compromisos: Compromiso[]
  notificaciones: Notificacion[]
  config: Config
}
