import type { Compromiso, Estado, Notificacion, Reunion, Tema, Usuario } from '../types'

/* ─────────────────────────────────────────────────────────────
   Datos de demostración.
   Se generan relativos a "hoy" para que la vista previa siempre
   muestre una reunión próxima con la agenda abierta.
   ───────────────────────────────────────────────────────────── */

const dia = 86400000
const hoy = new Date()

/** Fecha a N días de hoy, fijando hora y minuto. */
function en(dias: number, h = 10, m = 0): string {
  const d = new Date(hoy.getTime() + dias * dia)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

/** Próximo lunes a las 10:00 (la cadencia que definieron con Fran). */
function proximoLunes(semanas = 0): string {
  const d = new Date(hoy)
  const delta = (8 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + delta + semanas * 7)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

function lunesPasado(semanasAtras = 1): string {
  const d = new Date(hoy)
  const delta = (d.getDay() + 6) % 7 || 7
  d.setDate(d.getDate() - delta - (semanasAtras - 1) * 7)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

/* ── Usuarios ─────────────────────────────────────────────── */

export const USUARIOS: Usuario[] = [
  {
    id: 'u_matias',
    nombre: 'Matías Harvey',
    email: 'matias@harveywillys.com',
    rol: 'organizador',
    cargo: 'Socio · Operaciones',
    activo: true,
    creadoEn: en(-120),
  },
  {
    id: 'u_tomas',
    nombre: 'Tomás Harvey',
    email: 'tomas@harveywillys.com',
    rol: 'miembro',
    cargo: 'Socio · Producto y diseño',
    activo: true,
    creadoEn: en(-120),
  },
  {
    id: 'u_nico',
    nombre: 'Nicolás Harvey',
    email: 'nicolas@harveywillys.com',
    // Alguien del equipo administra usuarios y configuración.
    rol: 'admin',
    cargo: 'Socio · Comercial y retail',
    activo: true,
    creadoEn: en(-120),
  },
  {
    id: 'u_lucas',
    nombre: 'Lucas Harvey',
    email: 'lucas@harveywillys.com',
    rol: 'miembro',
    cargo: 'Socio · Marketing y comunidad',
    activo: true,
    creadoEn: en(-120),
  },
]

const SOCIOS = USUARIOS.map((u) => u.id)

/* ── Reuniones ────────────────────────────────────────────── */

const R_ANTERIOR = 'r_s12'
const R_PASADA = 'r_s13'
const R_HOY = 'r_s14'
const R_PROXIMA = 'r_s15'
const R_SIGUIENTE = 'r_s16'

export const REUNIONES: Reunion[] = [
  {
    id: R_ANTERIOR,
    titulo: 'Reunión semanal de socios · #12',
    fecha: lunesPasado(3),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'cerrada',
    horasCierreAgenda: 24,
    conclusionesGenerales:
      'Se aprobó el presupuesto de la campaña de invierno y se definió adelantar el drop cápsula a la primera semana de agosto. Queda pendiente cerrar el proveedor de denim: el taller actual viene con dos semanas de atraso sostenido.',
    observaciones:
      'Riesgo abierto: si el taller de denim no confirma entrega antes de fin de mes, hay que activar el proveedor alternativo aunque el costo suba ~12%.',
    proximaReunionFecha: lunesPasado(2),
    agendaCerradaEn: en(-22),
    iniciadaEn: lunesPasado(3),
    cerradaEn: lunesPasado(3),
    creadoPor: 'u_matias',
    creadoEn: en(-25),
  },
  {
    id: R_PASADA,
    titulo: 'Reunión semanal de socios · #13',
    fecha: lunesPasado(1),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'cerrada',
    horasCierreAgenda: 24,
    conclusionesGenerales:
      'Se cerró la lista de precios de primavera/verano con un ajuste promedio del 18%. Nicolás presentó los números del local de Córdoba: el punto de equilibrio se alcanza recién en el cuarto mes, se decide seguir adelante igual. El equipo acordó que las reuniones pasen a tener temario cargado con 24 h de anticipación.',
    observaciones:
      'Se empieza a usar la plataforma de gestión de reuniones a partir de la semana próxima.',
    proximaReunionFecha: en(0, 10, 0),
    agendaCerradaEn: en(-8),
    iniciadaEn: lunesPasado(1),
    cerradaEn: lunesPasado(1),
    creadoPor: 'u_matias',
    creadoEn: en(-12),
  },
  {
    id: R_HOY,
    titulo: 'Reunión semanal de socios · #14',
    fecha: en(0, 16, 30),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'agenda_cerrada',
    horasCierreAgenda: 24,
    proximaReunionFecha: proximoLunes(),
    agendaCerradaEn: en(-1),
    creadoPor: 'u_matias',
    creadoEn: en(-6),
  },
  {
    id: R_PROXIMA,
    titulo: 'Reunión semanal de socios · #15',
    fecha: proximoLunes(),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'agenda_abierta',
    horasCierreAgenda: 24,
    proximaReunionFecha: proximoLunes(1),
    creadoPor: 'u_matias',
    creadoEn: en(-2),
  },
  {
    id: R_SIGUIENTE,
    titulo: 'Reunión semanal de socios · #16',
    fecha: proximoLunes(1),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'borrador',
    horasCierreAgenda: 24,
    creadoPor: 'u_matias',
    creadoEn: en(-1),
  },
]

/* ── Temas ────────────────────────────────────────────────── */

export const TEMAS: Tema[] = [
  // ── #12 (cerrada)
  {
    id: 't_1',
    reunionId: R_ANTERIOR,
    titulo: 'Presupuesto campaña invierno',
    detalle: 'Cierre de números de producción audiovisual, pauta y locaciones.',
    importancia: 'alta',
    objetivo: 'decision',
    propuestoPor: 'u_lucas',
    duracionMin: 20,
    duracionRealSeg: 1480,
    estado: 'tratado',
    orden: 0,
    conclusiones:
      'Se aprueba el presupuesto por $4.200.000 con tope. La producción se hace con el mismo equipo del año pasado. Lucas negocia la pauta directo con Meta para bajar el fee de agencia.',
    creadoEn: en(-26),
  },
  {
    id: 't_2',
    reunionId: R_ANTERIOR,
    titulo: 'Atraso del taller de denim',
    detalle: 'Vienen dos semanas tarde con la entrega de la línea de jeans.',
    importancia: 'alta',
    objetivo: 'exploratoria',
    propuestoPor: 'u_tomas',
    duracionMin: 15,
    duracionRealSeg: 1920,
    estado: 'tratado',
    orden: 1,
    conclusiones:
      'Tomás va a reunirse con el taller para entender si el atraso es puntual o estructural. En paralelo se cotiza un proveedor alternativo en Villa Crespo.',
    creadoEn: en(-26),
  },
  {
    id: 't_3',
    reunionId: R_ANTERIOR,
    titulo: 'Adelanto del drop cápsula',
    importancia: 'media',
    objetivo: 'decision',
    propuestoPor: 'u_matias',
    duracionMin: 10,
    duracionRealSeg: 640,
    estado: 'tratado',
    orden: 2,
    conclusiones: 'Se adelanta a la primera semana de agosto para pegarle al Día del Niño.',
    creadoEn: en(-26),
  },

  // ── #13 (cerrada)
  {
    id: 't_4',
    reunionId: R_PASADA,
    titulo: 'Lista de precios primavera/verano',
    detalle: 'Ajuste por costos de tela y márgenes objetivo por categoría.',
    importancia: 'alta',
    objetivo: 'decision',
    propuestoPor: 'u_nico',
    duracionMin: 20,
    duracionRealSeg: 1680,
    estado: 'tratado',
    orden: 0,
    conclusiones:
      'Ajuste promedio del 18%. Remeras suben 15%, denim 22%, abrigos 20%. Se mantiene el 10% off por transferencia y las 3 cuotas sin interés.',
    creadoEn: en(-13),
  },
  {
    id: 't_5',
    reunionId: R_PASADA,
    titulo: 'Números del local de Córdoba',
    importancia: 'alta',
    objetivo: 'exploratoria',
    propuestoPor: 'u_nico',
    duracionMin: 15,
    duracionRealSeg: 1320,
    estado: 'tratado',
    orden: 1,
    conclusiones:
      'El punto de equilibrio llega al cuarto mes. Se decide sostener la apertura. Nicolás arma un tablero mensual de seguimiento.',
    creadoEn: en(-13),
  },
  {
    id: 't_6',
    reunionId: R_PASADA,
    titulo: 'Cómo ordenamos estas reuniones',
    detalle: 'Dividir cada reunión en tres fases: pre-reunión, reunión y post-reunión.',
    importancia: 'media',
    objetivo: 'comunicativa',
    propuestoPor: 'u_matias',
    duracionMin: 15,
    duracionRealSeg: 1140,
    estado: 'tratado',
    orden: 2,
    conclusiones:
      'Se adopta el esquema de tres fases. El temario se carga con 24 h de anticipación y Matías aprueba qué entra.',
    creadoEn: en(-13),
  },

  // ── #14 (agenda cerrada, lista para correr en vivo)
  {
    id: 't_7',
    reunionId: R_HOY,
    titulo: 'Definir proveedor de denim',
    detalle:
      'Ya están las dos cotizaciones. El alternativo entrega en 3 semanas pero sale 12% más caro. Hay que decidir hoy porque la producción de PV arranca el lunes.',
    importancia: 'alta',
    objetivo: 'decision',
    propuestoPor: 'u_tomas',
    duracionMin: 15,
    estado: 'aprobado',
    orden: 0,
    creadoEn: en(-5),
  },
  {
    id: 't_8',
    reunionId: R_HOY,
    titulo: 'Repaso de compromisos abiertos',
    detalle:
      'Bloque fijo al inicio: se abre el tablero de pendientes y se repasa lo que quedó de reuniones anteriores.',
    importancia: 'media',
    objetivo: 'informativa',
    propuestoPor: 'u_matias',
    duracionMin: 10,
    estado: 'aprobado',
    orden: 1,
    creadoEn: en(-5),
  },
  {
    id: 't_9',
    reunionId: R_HOY,
    titulo: 'Contratación de community manager',
    detalle: 'Tres candidatos preseleccionados. Rango salarial y a quién reporta.',
    importancia: 'media',
    objetivo: 'decision',
    propuestoPor: 'u_lucas',
    duracionMin: 15,
    estado: 'aprobado',
    orden: 2,
    creadoEn: en(-4),
  },
  {
    id: 't_10',
    reunionId: R_HOY,
    titulo: 'Estado del ecommerce',
    detalle: 'Métricas del mes y la tasa de abandono en el checkout.',
    importancia: 'baja',
    objetivo: 'informativa',
    propuestoPor: 'u_nico',
    duracionMin: 10,
    estado: 'aprobado',
    orden: 3,
    creadoEn: en(-4),
  },
  {
    id: 't_11',
    reunionId: R_HOY,
    titulo: 'Rediseño del packaging',
    detalle: 'Tomás trajo tres opciones de bolsa.',
    importancia: 'baja',
    objetivo: 'exploratoria',
    propuestoPor: 'u_tomas',
    duracionMin: 10,
    estado: 'diferido',
    orden: 4,
    motivoRechazo: 'No entra en los 60 minutos. Pasa a la próxima.',
    creadoEn: en(-4),
  },

  // ── #15 (agenda abierta — el flujo vivo de la demo)
  {
    id: 't_12',
    reunionId: R_PROXIMA,
    titulo: 'Apertura del local de Rosario',
    detalle:
      'Apareció un local sobre Córdoba al 1200. Alquiler alto pero muy buena zona. Necesito que lo veamos entre todos antes de dar una seña.',
    importancia: 'alta',
    objetivo: 'decision',
    propuestoPor: 'u_nico',
    duracionMin: 20,
    estado: 'aprobado',
    orden: 0,
    creadoEn: en(-2),
  },
  {
    id: 't_13',
    reunionId: R_PROXIMA,
    titulo: 'Colaboración con banda para el drop de octubre',
    detalle: 'Hay charla avanzada con el manager. Definir si vamos y con qué presupuesto.',
    importancia: 'media',
    objetivo: 'exploratoria',
    propuestoPor: 'u_lucas',
    duracionMin: 15,
    estado: 'aprobado',
    orden: 1,
    creadoEn: en(-2),
  },
  {
    id: 't_14',
    reunionId: R_PROXIMA,
    titulo: 'Rediseño del packaging',
    detalle: 'Viene diferido de la #14. Tres opciones de bolsa para elegir.',
    importancia: 'baja',
    objetivo: 'decision',
    propuestoPor: 'u_tomas',
    duracionMin: 10,
    estado: 'propuesto',
    orden: 2,
    creadoEn: en(-1),
  },
  {
    id: 't_15',
    reunionId: R_PROXIMA,
    titulo: 'Sistema de talles: sumar XXL',
    detalle: 'Nos lo piden mucho por Instagram. Impacta en moldería y en costos de tela.',
    importancia: 'media',
    objetivo: 'exploratoria',
    propuestoPor: 'u_lucas',
    duracionMin: 15,
    estado: 'propuesto',
    orden: 3,
    creadoEn: en(-1),
  },
  {
    id: 't_16',
    reunionId: R_PROXIMA,
    titulo: 'Cambiar el proveedor de envíos',
    detalle: 'Vienen mal las entregas del interior, hay muchos reclamos.',
    importancia: 'alta',
    objetivo: 'decision',
    propuestoPor: 'u_matias',
    duracionMin: 15,
    estado: 'propuesto',
    orden: 4,
    creadoEn: en(0, 9, 30),
  },
]

/* ── Compromisos ──────────────────────────────────────────── */

export const COMPROMISOS: Compromiso[] = [
  {
    id: 'c_1',
    reunionId: R_ANTERIOR,
    temaId: 't_1',
    accion: 'Cerrar la pauta de Meta sin intermediarios',
    detalle: 'Negociar directo para eliminar el fee del 15% de agencia.',
    responsableId: 'u_lucas',
    fechaLimite: en(-12),
    importancia: 'media',
    estado: 'hecho',
    avance: 'Cerrado. Quedó cuenta propia, ahorro estimado de $380.000 por campaña.',
    completadoEn: en(-14),
    creadoEn: en(-25),
  },
  {
    id: 'c_2',
    reunionId: R_ANTERIOR,
    temaId: 't_2',
    accion: 'Reunirse con el taller de denim y traer diagnóstico',
    detalle: '¿El atraso es puntual o estructural? Traer respuesta con fechas.',
    responsableId: 'u_tomas',
    fechaLimite: en(-6),
    importancia: 'alta',
    estado: 'en_curso',
    avance: 'Reunión hecha. Falta que el taller mande el cronograma firmado.',
    creadoEn: en(-25),
  },
  {
    id: 'c_3',
    reunionId: R_ANTERIOR,
    temaId: 't_2',
    accion: 'Cotizar proveedor alternativo de denim',
    responsableId: 'u_matias',
    fechaLimite: en(-3),
    importancia: 'alta',
    estado: 'hecho',
    avance: 'Cotización recibida: 12% más caro, entrega en 3 semanas.',
    completadoEn: en(-4),
    creadoEn: en(-25),
  },
  {
    id: 'c_4',
    reunionId: R_ANTERIOR,
    temaId: 't_3',
    accion: 'Armar el calendario de contenido del drop cápsula',
    responsableId: 'u_lucas',
    fechaLimite: en(-9),
    importancia: 'media',
    estado: 'bloqueado',
    avance: 'Frenado hasta tener las fotos del shooting. El fotógrafo reprogramó dos veces.',
    creadoEn: en(-25),
  },
  {
    id: 'c_5',
    reunionId: R_PASADA,
    temaId: 't_4',
    accion: 'Cargar la nueva lista de precios en el ecommerce y en el POS',
    responsableId: 'u_nico',
    fechaLimite: en(2),
    importancia: 'alta',
    estado: 'en_curso',
    avance: 'Ecommerce listo. Falta el POS de los tres locales.',
    creadoEn: en(-12),
  },
  {
    id: 'c_6',
    reunionId: R_PASADA,
    temaId: 't_5',
    accion: 'Armar tablero mensual de seguimiento del local de Córdoba',
    detalle: 'Ventas, ticket promedio, costo fijo y avance al punto de equilibrio.',
    responsableId: 'u_nico',
    fechaLimite: en(6),
    importancia: 'media',
    estado: 'pendiente',
    creadoEn: en(-12),
  },
  {
    id: 'c_7',
    reunionId: R_PASADA,
    temaId: 't_6',
    accion: 'Definir quién aprueba los temas de cada reunión',
    responsableId: 'u_matias',
    fechaLimite: en(-4),
    importancia: 'baja',
    estado: 'hecho',
    avance: 'Queda Matías como organizador fijo.',
    completadoEn: en(-5),
    creadoEn: en(-12),
  },
  {
    id: 'c_8',
    reunionId: R_PASADA,
    temaId: 't_6',
    accion: 'Cargar los temas de la próxima con 24 h de anticipación',
    detalle: 'Estrenar el esquema acordado en la reunión que viene.',
    responsableId: 'u_matias',
    fechaLimite: en(1),
    importancia: 'alta',
    estado: 'en_curso',
    avance: 'Temario de la #14 ya cargado y cerrado.',
    creadoEn: en(-12),
  },
  {
    id: 'c_9',
    reunionId: R_PASADA,
    accion: 'Renegociar el alquiler del showroom de Palermo',
    detalle: 'Vence el contrato en noviembre. Adelantarse a la negociación.',
    responsableId: 'u_matias',
    fechaLimite: en(20),
    importancia: 'media',
    estado: 'pendiente',
    creadoEn: en(-12),
  },
  {
    id: 'c_10',
    reunionId: R_ANTERIOR,
    accion: 'Definir la campaña de ropa de invierno 2027',
    detalle: 'Proyecto largo: arranca ahora y cierra recién en cinco meses.',
    responsableId: 'u_lucas',
    fechaLimite: en(140),
    importancia: 'baja',
    estado: 'pendiente',
    creadoEn: en(-25),
  },
]

/* ── Notificaciones ya emitidas ───────────────────────────── */

export const NOTIFICACIONES: Notificacion[] = [
  {
    id: 'n_1',
    tipo: 'agenda_cerrada',
    reunionId: R_HOY,
    asunto: 'Temario cerrado · Reunión semanal de socios · #14',
    destinatarios: USUARIOS.map((u) => u.email),
    cuerpoHtml: '',
    cuerpoTexto:
      'Se cerró el temario de la reunión #14. Cuatro temas aprobados, 50 minutos asignados.',
    estado: 'simulado',
    creadoEn: en(-1),
  },
]

/* ── Estado inicial ───────────────────────────────────────── */

export const ESTADO_INICIAL: Estado = {
  usuarios: USUARIOS,
  reuniones: REUNIONES,
  temas: TEMAS,
  compromisos: COMPROMISOS,
  notificaciones: NOTIFICACIONES,
  config: {
    organizacion: 'Harvey',
    horasCierreAgendaDefault: 24,
    duracionReunionDefaultMin: 60,
    duracionTemaDefaultMin: 15,
    cadencia: 'Lunes 10:00',
    emailsActivos: true,
  },
}
