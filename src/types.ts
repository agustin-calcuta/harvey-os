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
 * Rol dentro de una sala. No es global: vive en la membresía.
 */
export type RolSala = 'organizador' | 'miembro'

export const ROLES_SALA: Record<RolSala, { nombre: string; desc: string }> = {
  organizador: {
    nombre: 'Organizador',
    desc: 'Arma la agenda, aprueba temas, asigna tiempos, modera y gestiona quién entra a la sala.',
  },
  miembro: {
    nombre: 'Miembro',
    desc: 'Propone temas, participa y sigue sus propios compromisos.',
  },
}

/**
 * Alcance de la cuenta, por encima de las salas.
 *
 * `superadmin` es soporte técnico, no forma parte de ningún equipo:
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
  avatarUrl?: string
  cargo?: string
  activo: boolean
  creadoEn: string
}

/* ── Salas ────────────────────────────────────────────────── */

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
      'Qué se resolvió, con qué alcance y desde cuándo. Si quedó alguien a cargo, registralo abajo como compromiso.',
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
  /** En el banco de la sala, todavía sin reunión asignada. */
  | 'banco'
  | 'propuesto'
  | 'aprobado'
  | 'rechazado'
  | 'diferido'
  | 'tratado'

export const ESTADO_TEMA: Record<EstadoTema, { nombre: string; color: string }> = {
  banco: { nombre: 'En el banco', color: 'text-cold' },
  propuesto: { nombre: 'Propuesto', color: 'text-suave' },
  aprobado: { nombre: 'En agenda', color: 'text-acid' },
  rechazado: { nombre: 'Rechazado', color: 'text-signal' },
  diferido: { nombre: 'Diferido', color: 'text-amber' },
  tratado: { nombre: 'Tratado', color: 'text-cold' },
}

export interface Tema {
  id: string
  salaId: string
  /**
   * Sin reunión asignada mientras vive en el banco: es el "banco de
   * suplentes" que pidió Fran, para anotar un tema antes de que
   * exista una fecha y no perderlo.
   */
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

export type EstadoReunion =
  | 'borrador'
  | 'agenda_abierta'
  | 'agenda_cerrada'
  | 'en_curso'
  | 'cerrada'

export const ESTADO_REUNION: Record<
  EstadoReunion,
  { nombre: string; color: string; bg: string; desc: string }
> = {
  borrador: {
    nombre: 'Borrador',
    color: 'text-suave',
    bg: 'bg-hueco',
    desc: 'Todavía no se abrió la carga de temas.',
  },
  agenda_abierta: {
    nombre: 'Agenda abierta',
    color: 'text-acid',
    bg: 'bg-acid/15',
    desc: 'Se pueden proponer temas hasta el cierre.',
  },
  agenda_cerrada: {
    nombre: 'Agenda cerrada',
    color: 'text-amber',
    bg: 'bg-amber/15',
    desc: 'Temario definido y notificado. Listo para reunirse.',
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
    desc: 'Minuta emitida y compromisos distribuidos.',
  },
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
  participantesIds: string[]
  estado: EstadoReunion
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
  creadoPor: string
  creadoEn: string
}

/* ── Compromisos ──────────────────────────────────────────── */

export type EstadoCompromiso = 'pendiente' | 'en_curso' | 'bloqueado' | 'hecho'

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
  bloqueado: {
    nombre: 'Bloqueado',
    color: 'text-signal',
    bg: 'bg-signal/15',
    border: 'border-signal',
  },
  hecho: {
    nombre: 'Hecho',
    color: 'text-acid',
    bg: 'bg-acid/15',
    border: 'border-acid',
  },
}

export const COLUMNAS_KANBAN: EstadoCompromiso[] = [
  'pendiente',
  'en_curso',
  'bloqueado',
  'hecho',
]

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
