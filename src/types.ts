/* ─────────────────────────────────────────────────────────────
   Modelo de dominio — HARVEY OS
   Derivado de la minuta de Francisco Lebermann y de la reunión
   del 05/08/2026: pre-reunión → reunión → post-reunión.
   ───────────────────────────────────────────────────────────── */

export type Rol = 'admin' | 'organizador' | 'miembro' | 'invitado'

export const ROLES: Record<Rol, { nombre: string; desc: string }> = {
  admin: {
    nombre: 'Administrador',
    desc: 'Control total: usuarios, roles, configuración y todas las reuniones.',
  },
  organizador: {
    nombre: 'Organizador',
    desc: 'Arma la agenda, aprueba temas, asigna tiempos y modera la reunión.',
  },
  miembro: {
    nombre: 'Miembro',
    desc: 'Propone temas, participa y gestiona sus compromisos.',
  },
  invitado: {
    nombre: 'Invitado',
    desc: 'Sólo lectura de agendas y minutas.',
  },
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  avatarUrl?: string
  cargo?: string
  activo: boolean
  creadoEn: string
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
    hex: '#DC8F38',
  },
  baja: {
    nombre: 'Baja',
    alias: 'Frío',
    color: 'text-cold',
    bg: 'bg-cold',
    hex: '#4A7FA5',
  },
}

/** Los cuatro objetivos del formato de minuta de Fran. */
export type Objetivo = 'decision' | 'exploratoria' | 'comunicativa' | 'informativa'

export const OBJETIVOS: Record<Objetivo, { nombre: string; desc: string; sigla: string }> = {
  decision: {
    nombre: 'Decisión',
    sigla: 'DEC',
    desc: 'Se necesita definir algo y salir con una resolución tomada.',
  },
  exploratoria: {
    nombre: 'Exploratoria',
    sigla: 'EXP',
    desc: 'Se abre el tema para pensarlo en conjunto, sin cerrar todavía.',
  },
  comunicativa: {
    nombre: 'Comunicativa',
    sigla: 'COM',
    desc: 'Se comunica algo que impacta al resto y admite devolución.',
  },
  informativa: {
    nombre: 'Informativa',
    sigla: 'INF',
    desc: 'Se informa un estado o avance. No requiere discusión.',
  },
}

export type EstadoTema = 'propuesto' | 'aprobado' | 'rechazado' | 'diferido' | 'tratado'

export const ESTADO_TEMA: Record<EstadoTema, { nombre: string; color: string }> = {
  propuesto: { nombre: 'Propuesto', color: 'text-smoke' },
  aprobado: { nombre: 'En agenda', color: 'text-acid' },
  rechazado: { nombre: 'Rechazado', color: 'text-signal' },
  diferido: { nombre: 'Diferido', color: 'text-amber' },
  tratado: { nombre: 'Tratado', color: 'text-cold' },
}

export interface Tema {
  id: string
  reunionId: string
  titulo: string
  detalle?: string
  importancia: Importancia
  objetivo: Objetivo
  propuestoPor: string // Usuario.id
  duracionMin: number // asignada por el organizador
  duracionRealSeg?: number // cronometrada en vivo
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
    color: 'text-smoke',
    bg: 'bg-smoke-2/20',
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
  titulo: string
  /** ISO datetime del inicio. */
  fecha: string
  duracionPrevistaMin: number
  lugar?: string
  moderadorId: string
  participantesIds: string[]
  estado: EstadoReunion
  /** Horas antes del inicio en que se cierra la carga de temas (default 24). */
  horasCierreAgenda: number
  conclusionesGenerales?: string
  observaciones?: string
  proximaReunionFecha?: string
  /** Sellos de tiempo del ciclo de vida. */
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
    color: 'text-smoke',
    bg: 'bg-smoke-2/15',
    border: 'border-smoke-2',
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
  /** Reunión donde se originó. */
  reunionId: string
  /** Tema que lo disparó, si aplica. */
  temaId?: string
  accion: string
  detalle?: string
  responsableId: string
  fechaLimite?: string
  importancia: Importancia
  estado: EstadoCompromiso
  /** Notas de avance cargadas después de la reunión. */
  avance?: string
  completadoEn?: string
  creadoEn: string
}

/* ── Notificaciones / correos ─────────────────────────────── */

export type TipoNotificacion = 'agenda_cerrada' | 'minuta' | 'recordatorio' | 'tema_aprobado'

export interface Notificacion {
  id: string
  tipo: TipoNotificacion
  reunionId: string
  asunto: string
  destinatarios: string[] // emails
  cuerpoHtml: string
  cuerpoTexto: string
  /** 'simulado' = generado y visible en la plataforma, sin proveedor SMTP conectado. */
  estado: 'simulado' | 'enviado' | 'error'
  error?: string
  creadoEn: string
}

/* ── Configuración de la organización ─────────────────────── */

export interface Config {
  organizacion: string
  horasCierreAgendaDefault: number
  duracionReunionDefaultMin: number
  duracionTemaDefaultMin: number
  /** Cadencia sugerida al crear una reunión, ej. "Lunes 10:00". */
  cadencia: string
  emailsActivos: boolean
}

/* ── Snapshot completo del estado ─────────────────────────── */

export interface Estado {
  usuarios: Usuario[]
  reuniones: Reunion[]
  temas: Tema[]
  compromisos: Compromiso[]
  notificaciones: Notificacion[]
  config: Config
}
