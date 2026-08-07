import type {
  Compromiso,
  Estado,
  Membresia,
  Notificacion,
  Reunion,
  Sala,
  Solicitud,
  Tema,
  Usuario,
} from '../types'

/* ─────────────────────────────────────────────────────────────
   Datos de demostración.

   Tres salas para que se entienda el modelo de un vistazo:
   la gerencial, donde los cuatro socios están a la par, y dos de
   equipo, donde un socio organiza y su gente propone.

   Las fechas se generan relativas a "hoy" para que siempre haya
   una reunión próxima con la agenda abierta.
   ───────────────────────────────────────────────────────────── */

const dia = 86400000
const hoy = new Date()

function en(dias: number, h = 10, m = 0): string {
  const d = new Date(hoy.getTime() + dias * dia)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

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

/* ── Personas ─────────────────────────────────────────────── */

const socio = (
  id: string,
  nombre: string,
  email: string,
  cargo: string,
): Usuario => ({
  id,
  nombre,
  email,
  alcance: 'usuario',
  cargo,
  activo: true,
  creadoEn: en(-120),
})

export const USUARIOS: Usuario[] = [
  socio('u_matias', 'Matías Harvey', 'matias@harveywillys.com', 'Socio · Operaciones'),
  socio('u_tomas', 'Tomás Harvey', 'tomas@harveywillys.com', 'Socio · Producto y diseño'),
  socio('u_nico', 'Nicolás Harvey', 'nicolas@harveywillys.com', 'Socio · Comercial y retail'),
  socio('u_lucas', 'Lucas Harvey', 'lucas@harveywillys.com', 'Socio · Marketing y comunidad'),

  // Gente de los equipos, que en su sala son miembros.
  socio('u_renata', 'Renata Sosa', 'renata@harveywillys.com', 'Diseño · Moldería'),
  socio('u_juli', 'Julieta Paz', 'julieta@harveywillys.com', 'Diseño · Estampas'),
  socio('u_pedro', 'Pedro Arana', 'pedro@harveywillys.com', 'Marketing · Contenido'),
  socio('u_cami', 'Camila Ruiz', 'camila@harveywillys.com', 'Marketing · Community'),

  // Entró hace poco y todavía no está en ninguna sala: pidió sumarse
  // a la de socios y el pedido espera respuesta.
  socio('u_sofia', 'Sofía Ledesma', 'sofia@harveywillys.com', 'Gerencia · Operaciones'),
]

const SOCIOS = ['u_matias', 'u_tomas', 'u_nico', 'u_lucas']

/* ── Salas ────────────────────────────────────────────────── */

export const S_GERENCIAL = 'sala_gerencial'
export const S_DISENO = 'sala_diseno'
export const S_MARKETING = 'sala_marketing'

export const SALAS: Sala[] = [
  {
    id: S_GERENCIAL,
    nombre: 'Socios',
    descripcion: 'La reunión semanal de los cuatro. Acá están todos a la par.',
    cadencia: 'Lunes 10:00',
    horasCierreAgenda: 24,
    cierreManual: false,
    duracionReunionDefaultMin: 60,
    duracionTemaDefaultMin: 15,
    lugarHabitual: 'Showroom Palermo',
    creadaPor: 'u_matias',
    creadaEn: en(-130),
    archivada: false,
  },
  {
    id: S_DISENO,
    nombre: 'Diseño',
    descripcion: 'Tomás con el equipo de producto y moldería.',
    cadencia: 'Miércoles 15:00',
    horasCierreAgenda: 12,
    cierreManual: false,
    duracionReunionDefaultMin: 45,
    duracionTemaDefaultMin: 15,
    lugarHabitual: 'Taller',
    creadaPor: 'u_tomas',
    creadaEn: en(-60),
    archivada: false,
  },
  {
    id: S_MARKETING,
    nombre: 'Marketing',
    descripcion: 'Lucas con el equipo de contenido y comunidad.',
    cadencia: 'Jueves 11:00',
    horasCierreAgenda: 24,
    // Equipo chico: el temario lo cierra Lucas cuando quiere.
    cierreManual: true,
    duracionReunionDefaultMin: 45,
    duracionTemaDefaultMin: 10,
    creadaPor: 'u_lucas',
    creadaEn: en(-45),
    archivada: false,
  },
]

/* ── Membresías ───────────────────────────────────────────── */

const m = (salaId: string, usuarioId: string, rol: 'organizador' | 'miembro'): Membresia => ({
  id: `mb_${salaId}_${usuarioId}`,
  salaId,
  usuarioId,
  rol,
  desde: en(-120),
})

export const MEMBRESIAS: Membresia[] = [
  // En la gerencial los cuatro están a la par: todos proponen y todos aprueban.
  ...SOCIOS.map((id) => m(S_GERENCIAL, id, 'organizador')),

  // En cada sala de equipo, el socio organiza y su gente propone.
  m(S_DISENO, 'u_tomas', 'organizador'),
  m(S_DISENO, 'u_renata', 'miembro'),
  m(S_DISENO, 'u_juli', 'miembro'),

  m(S_MARKETING, 'u_lucas', 'organizador'),
  m(S_MARKETING, 'u_pedro', 'miembro'),
  m(S_MARKETING, 'u_cami', 'miembro'),
]

/* ── Reuniones ────────────────────────────────────────────── */

const R_ANTERIOR = 'r_s12'
const R_PASADA = 'r_s13'
const R_HOY = 'r_s14'
const R_PROXIMA = 'r_s15'
const R_SIGUIENTE = 'r_s16'
const R_DISENO = 'r_d01'
const R_MKT = 'r_m01'

export const REUNIONES: Reunion[] = [
  {
    id: R_ANTERIOR,
    salaId: S_GERENCIAL,
    titulo: 'Reunión semanal de socios · #12',
    fecha: lunesPasado(3),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'cerrada',
    horasCierreAgenda: 24,
    cierreManual: false,
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
    salaId: S_GERENCIAL,
    titulo: 'Reunión semanal de socios · #13',
    fecha: lunesPasado(1),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'cerrada',
    horasCierreAgenda: 24,
    cierreManual: false,
    conclusionesGenerales:
      'Se cerró la lista de precios de primavera/verano con un ajuste promedio del 18%. Nicolás presentó los números del local de Córdoba: el punto de equilibrio se alcanza recién en el cuarto mes, se decide seguir adelante igual. El equipo acordó que las reuniones pasen a tener temario cargado con 24 h de anticipación.',
    observaciones:
      'Se empieza a usar la plataforma de gestión de reuniones a partir de la semana próxima.',
    proximaReunionFecha: en(0, 16, 30),
    agendaCerradaEn: en(-8),
    iniciadaEn: lunesPasado(1),
    cerradaEn: lunesPasado(1),
    creadoPor: 'u_matias',
    creadoEn: en(-12),
  },
  {
    id: R_HOY,
    salaId: S_GERENCIAL,
    titulo: 'Reunión semanal de socios · #14',
    fecha: en(0, 16, 30),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'agenda_cerrada',
    horasCierreAgenda: 24,
    cierreManual: false,
    proximaReunionFecha: proximoLunes(),
    agendaCerradaEn: en(-1),
    creadoPor: 'u_matias',
    creadoEn: en(-6),
  },
  {
    id: R_PROXIMA,
    salaId: S_GERENCIAL,
    titulo: 'Reunión semanal de socios · #15',
    fecha: proximoLunes(),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'agenda_abierta',
    horasCierreAgenda: 24,
    cierreManual: false,
    proximaReunionFecha: proximoLunes(1),
    creadoPor: 'u_matias',
    creadoEn: en(-2),
  },
  {
    id: R_SIGUIENTE,
    salaId: S_GERENCIAL,
    titulo: 'Reunión semanal de socios · #16',
    fecha: proximoLunes(1),
    duracionPrevistaMin: 60,
    lugar: 'Showroom Palermo',
    moderadorId: 'u_matias',
    participantesIds: SOCIOS,
    estado: 'borrador',
    horasCierreAgenda: 24,
    cierreManual: false,
    creadoPor: 'u_matias',
    creadoEn: en(-1),
  },

  {
    id: R_DISENO,
    salaId: S_DISENO,
    titulo: 'Diseño · Avance primavera/verano',
    fecha: en(1, 15, 0),
    duracionPrevistaMin: 45,
    lugar: 'Taller',
    moderadorId: 'u_tomas',
    participantesIds: ['u_tomas', 'u_renata', 'u_juli'],
    estado: 'agenda_abierta',
    horasCierreAgenda: 12,
    cierreManual: false,
    creadoPor: 'u_tomas',
    creadoEn: en(-3),
  },
  {
    id: R_MKT,
    salaId: S_MARKETING,
    titulo: 'Marketing · Calendario de agosto',
    fecha: en(-4, 11, 0),
    duracionPrevistaMin: 45,
    moderadorId: 'u_lucas',
    participantesIds: ['u_lucas', 'u_pedro', 'u_cami'],
    estado: 'cerrada',
    horasCierreAgenda: 24,
    cierreManual: true,
    conclusionesGenerales:
      'Se definió el calendario de contenido hasta fin de mes. El shooting del drop cápsula se reprograma para la semana que viene y se prioriza contenido de archivo mientras tanto.',
    proximaReunionFecha: en(3, 11, 0),
    agendaCerradaEn: en(-5),
    iniciadaEn: en(-4, 11, 0),
    cerradaEn: en(-4, 12, 0),
    creadoPor: 'u_lucas',
    creadoEn: en(-8),
  },
]

/* ── Temas ────────────────────────────────────────────────── */

export const TEMAS: Tema[] = [
  // ── Socios #12 (cerrada)
  {
    id: 't_1', salaId: S_GERENCIAL, reunionId: R_ANTERIOR,
    titulo: 'Presupuesto campaña invierno',
    detalle: 'Cierre de números de producción audiovisual, pauta y locaciones.',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_lucas',
    duracionMin: 20, duracionRealSeg: 1480, estado: 'tratado', orden: 0,
    conclusiones:
      'Se aprueba el presupuesto por $4.200.000 con tope. La producción se hace con el mismo equipo del año pasado. Lucas negocia la pauta directo con Meta para bajar el fee de agencia.',
    creadoEn: en(-26),
  },
  {
    id: 't_2', salaId: S_GERENCIAL, reunionId: R_ANTERIOR,
    titulo: 'Atraso del taller de denim',
    detalle: 'Vienen dos semanas tarde con la entrega de la línea de jeans.',
    importancia: 'alta', objetivo: 'exploratoria', propuestoPor: 'u_tomas',
    duracionMin: 15, duracionRealSeg: 1920, estado: 'tratado', orden: 1,
    conclusiones:
      'Tomás va a reunirse con el taller para entender si el atraso es puntual o estructural. En paralelo se cotiza un proveedor alternativo en Villa Crespo.',
    creadoEn: en(-26),
  },
  {
    id: 't_3', salaId: S_GERENCIAL, reunionId: R_ANTERIOR,
    titulo: 'Adelanto del drop cápsula',
    importancia: 'media', objetivo: 'decision', propuestoPor: 'u_matias',
    duracionMin: 10, duracionRealSeg: 640, estado: 'tratado', orden: 2,
    conclusiones: 'Se adelanta a la primera semana de agosto para pegarle al Día del Niño.',
    creadoEn: en(-26),
  },

  // ── Socios #13 (cerrada)
  {
    id: 't_4', salaId: S_GERENCIAL, reunionId: R_PASADA,
    titulo: 'Lista de precios primavera/verano',
    detalle: 'Ajuste por costos de tela y márgenes objetivo por categoría.',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_nico',
    duracionMin: 20, duracionRealSeg: 1680, estado: 'tratado', orden: 0,
    conclusiones:
      'Ajuste promedio del 18%. Remeras suben 15%, denim 22%, abrigos 20%. Se mantiene el 10% off por transferencia y las 3 cuotas sin interés.',
    creadoEn: en(-13),
  },
  {
    id: 't_5', salaId: S_GERENCIAL, reunionId: R_PASADA,
    titulo: 'Números del local de Córdoba',
    importancia: 'alta', objetivo: 'exploratoria', propuestoPor: 'u_nico',
    duracionMin: 15, duracionRealSeg: 1320, estado: 'tratado', orden: 1,
    conclusiones:
      'El punto de equilibrio llega al cuarto mes. Se decide sostener la apertura. Nicolás arma un tablero mensual de seguimiento.',
    creadoEn: en(-13),
  },
  {
    id: 't_6', salaId: S_GERENCIAL, reunionId: R_PASADA,
    titulo: 'Cómo ordenamos estas reuniones',
    detalle: 'Dividir cada reunión en tres fases: pre-reunión, reunión y post-reunión.',
    importancia: 'media', objetivo: 'comunicativa', propuestoPor: 'u_matias',
    duracionMin: 15, duracionRealSeg: 1140, estado: 'tratado', orden: 2,
    conclusiones:
      'Se adopta el esquema de tres fases. El temario se carga con 24 h de anticipación y Matías aprueba qué entra.',
    creadoEn: en(-13),
  },

  // ── Socios #14 (lista para correr en vivo)
  {
    id: 't_7', salaId: S_GERENCIAL, reunionId: R_HOY,
    titulo: 'Definir proveedor de denim',
    detalle:
      'Ya están las dos cotizaciones. El alternativo entrega en 3 semanas pero sale 12% más caro. Hay que decidir hoy porque la producción de PV arranca el lunes.',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_tomas',
    duracionMin: 15, estado: 'aprobado', orden: 0, creadoEn: en(-5),
  },
  {
    id: 't_8', salaId: S_GERENCIAL, reunionId: R_HOY,
    titulo: 'Repaso de compromisos abiertos',
    detalle: 'Bloque fijo al inicio: se abre el tablero y se repasa lo que quedó de antes.',
    importancia: 'media', objetivo: 'informativa', propuestoPor: 'u_matias',
    duracionMin: 10, estado: 'aprobado', orden: 1, creadoEn: en(-5),
  },
  {
    id: 't_9', salaId: S_GERENCIAL, reunionId: R_HOY,
    titulo: 'Contratación de community manager',
    detalle: 'Tres candidatos preseleccionados. Rango salarial y a quién reporta.',
    importancia: 'media', objetivo: 'decision', propuestoPor: 'u_lucas',
    duracionMin: 15, estado: 'aprobado', orden: 2, creadoEn: en(-4),
  },
  {
    id: 't_10', salaId: S_GERENCIAL, reunionId: R_HOY,
    titulo: 'Estado del ecommerce',
    detalle: 'Métricas del mes y la tasa de abandono en el checkout.',
    importancia: 'baja', objetivo: 'informativa', propuestoPor: 'u_nico',
    duracionMin: 10, estado: 'aprobado', orden: 3, creadoEn: en(-4),
  },
  {
    id: 't_11', salaId: S_GERENCIAL, reunionId: R_HOY,
    titulo: 'Rediseño del packaging',
    detalle: 'Tomás trajo tres opciones de bolsa.',
    importancia: 'baja', objetivo: 'exploratoria', propuestoPor: 'u_tomas',
    duracionMin: 10, estado: 'diferido', orden: 4,
    motivoRechazo: 'No entra en los 60 minutos. Pasa a la próxima.',
    creadoEn: en(-4),
  },

  // ── Socios #15 (agenda abierta)
  {
    id: 't_12', salaId: S_GERENCIAL, reunionId: R_PROXIMA,
    titulo: 'Apertura del local de Rosario',
    detalle:
      'Apareció un local sobre Córdoba al 1200. Alquiler alto pero muy buena zona. Necesito que lo veamos entre todos antes de dar una seña.',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_nico',
    duracionMin: 20, estado: 'aprobado', orden: 0, creadoEn: en(-2),
  },
  {
    id: 't_13', salaId: S_GERENCIAL, reunionId: R_PROXIMA,
    titulo: 'Colaboración con banda para el drop de octubre',
    detalle: 'Hay charla avanzada con el manager. Definir si vamos y con qué presupuesto.',
    importancia: 'media', objetivo: 'exploratoria', propuestoPor: 'u_lucas',
    duracionMin: 15, estado: 'aprobado', orden: 1, creadoEn: en(-2),
  },
  {
    id: 't_14', salaId: S_GERENCIAL, reunionId: R_PROXIMA,
    titulo: 'Rediseño del packaging',
    detalle: 'Viene diferido de la #14. Tres opciones de bolsa para elegir.',
    importancia: 'baja', objetivo: 'decision', propuestoPor: 'u_tomas',
    duracionMin: 10, estado: 'propuesto', orden: 2, creadoEn: en(-1),
  },
  {
    id: 't_15', salaId: S_GERENCIAL, reunionId: R_PROXIMA,
    titulo: 'Cambiar el proveedor de envíos',
    detalle: 'Vienen mal las entregas del interior, hay muchos reclamos.',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_matias',
    duracionMin: 15, estado: 'propuesto', orden: 3, creadoEn: en(0, 9, 30),
  },

  /* ── Banco de la sala de socios ──
     Temas anotados sin reunión: lo que Fran llamó "banco de suplentes". */
  {
    id: 't_b1', salaId: S_GERENCIAL,
    titulo: 'Revisar el seguro del showroom',
    detalle: 'Vence en octubre y nunca lo comparamos con otras aseguradoras.',
    importancia: 'baja', objetivo: 'informativa', propuestoPor: 'u_nico',
    duracionMin: 10, estado: 'banco', orden: 0, creadoEn: en(-9),
  },
  {
    id: 't_b2', salaId: S_GERENCIAL,
    titulo: 'Sistema de talles: sumar XXL',
    detalle: 'Nos lo piden mucho por Instagram. Impacta en moldería y en costos de tela.',
    importancia: 'media', objetivo: 'exploratoria', propuestoPor: 'u_lucas',
    duracionMin: 15, estado: 'banco', orden: 0, creadoEn: en(-6),
  },
  {
    id: 't_b3', salaId: S_GERENCIAL,
    titulo: 'Vacaciones de enero: quién cubre qué',
    importancia: 'media', objetivo: 'decision', propuestoPor: 'u_matias',
    duracionMin: 15, estado: 'banco', orden: 0, creadoEn: en(-2),
  },

  // ── Diseño
  {
    id: 't_d1', salaId: S_DISENO, reunionId: R_DISENO,
    titulo: 'Moldería de la campera oversize',
    detalle: 'La primera muestra vino corta de manga. Revisar la ficha técnica.',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_renata',
    duracionMin: 15, estado: 'aprobado', orden: 0, creadoEn: en(-2),
  },
  {
    id: 't_d2', salaId: S_DISENO, reunionId: R_DISENO,
    titulo: 'Estampas del drop cápsula',
    detalle: 'Tengo tres opciones para mostrar y elegir entre todos.',
    importancia: 'media', objetivo: 'exploratoria', propuestoPor: 'u_juli',
    duracionMin: 15, estado: 'propuesto', orden: 1, creadoEn: en(-1),
  },
  {
    id: 't_d3', salaId: S_DISENO,
    titulo: 'Probar el proveedor de avíos nuevo',
    detalle: 'Mandaron muestras de cierres y botones. Verlas antes de la próxima temporada.',
    importancia: 'baja', objetivo: 'exploratoria', propuestoPor: 'u_renata',
    duracionMin: 10, estado: 'banco', orden: 0, creadoEn: en(-4),
  },

  // ── Marketing
  {
    id: 't_m1', salaId: S_MARKETING, reunionId: R_MKT,
    titulo: 'Calendario de contenido de agosto',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_lucas',
    duracionMin: 20, duracionRealSeg: 1500, estado: 'tratado', orden: 0,
    conclusiones:
      'Tres posteos por semana y dos reels. Pedro arma el guion de los reels y Camila el calendario de historias.',
    creadoEn: en(-8),
  },
  {
    id: 't_m2', salaId: S_MARKETING, reunionId: R_MKT,
    titulo: 'Reprogramación del shooting',
    detalle: 'El fotógrafo se cayó dos veces.',
    importancia: 'alta', objetivo: 'decision', propuestoPor: 'u_cami',
    duracionMin: 15, duracionRealSeg: 1100, estado: 'tratado', orden: 1,
    conclusiones: 'Se reprograma para la semana que viene. Mientras tanto se usa material de archivo.',
    creadoEn: en(-8),
  },
]

/* ── Compromisos ──────────────────────────────────────────── */

export const COMPROMISOS: Compromiso[] = [
  {
    id: 'c_1', salaId: S_GERENCIAL, reunionId: R_ANTERIOR, temaId: 't_1',
    accion: 'Cerrar la pauta de Meta sin intermediarios',
    detalle: 'Negociar directo para eliminar el fee del 15% de agencia.',
    responsableId: 'u_lucas', fechaLimite: en(-12), importancia: 'media', estado: 'hecho',
    avance: 'Cerrado. Quedó cuenta propia, ahorro estimado de $380.000 por campaña.',
    completadoEn: en(-14), creadoEn: en(-25),
  },
  {
    id: 'c_2', salaId: S_GERENCIAL, reunionId: R_ANTERIOR, temaId: 't_2',
    accion: 'Reunirse con el taller de denim y traer diagnóstico',
    detalle: '¿El atraso es puntual o estructural? Traer respuesta con fechas.',
    responsableId: 'u_tomas', fechaLimite: en(-6), importancia: 'alta', estado: 'en_curso',
    avance: 'Reunión hecha. Falta que el taller mande el cronograma firmado.',
    creadoEn: en(-25),
  },
  {
    id: 'c_3', salaId: S_GERENCIAL, reunionId: R_ANTERIOR, temaId: 't_2',
    accion: 'Cotizar proveedor alternativo de denim',
    responsableId: 'u_matias', fechaLimite: en(-3), importancia: 'alta', estado: 'hecho',
    avance: 'Cotización recibida: 12% más caro, entrega en 3 semanas.',
    completadoEn: en(-4), creadoEn: en(-25),
  },
  {
    id: 'c_4', salaId: S_GERENCIAL, reunionId: R_ANTERIOR, temaId: 't_3',
    accion: 'Armar el calendario de contenido del drop cápsula',
    responsableId: 'u_lucas', fechaLimite: en(-9), importancia: 'media', estado: 'bloqueado',
    avance: 'Frenado hasta tener las fotos del shooting. El fotógrafo reprogramó dos veces.',
    creadoEn: en(-25),
  },
  {
    id: 'c_5', salaId: S_GERENCIAL, reunionId: R_PASADA, temaId: 't_4',
    accion: 'Cargar la nueva lista de precios en el ecommerce y en el POS',
    responsableId: 'u_nico', fechaLimite: en(2), importancia: 'alta', estado: 'en_curso',
    avance: 'Ecommerce listo. Falta el POS de los tres locales.',
    creadoEn: en(-12),
  },
  {
    id: 'c_6', salaId: S_GERENCIAL, reunionId: R_PASADA, temaId: 't_5',
    accion: 'Armar tablero mensual de seguimiento del local de Córdoba',
    detalle: 'Ventas, ticket promedio, costo fijo y avance al punto de equilibrio.',
    responsableId: 'u_nico', fechaLimite: en(6), importancia: 'media', estado: 'pendiente',
    creadoEn: en(-12),
  },
  {
    id: 'c_7', salaId: S_GERENCIAL, reunionId: R_PASADA, temaId: 't_6',
    accion: 'Definir quién aprueba los temas de cada reunión',
    responsableId: 'u_matias', fechaLimite: en(-4), importancia: 'baja', estado: 'hecho',
    avance: 'Queda Matías como organizador fijo.', completadoEn: en(-5), creadoEn: en(-12),
  },
  {
    id: 'c_8', salaId: S_GERENCIAL, reunionId: R_PASADA, temaId: 't_6',
    accion: 'Cargar los temas de la próxima con 24 h de anticipación',
    detalle: 'Estrenar el esquema acordado en la reunión que viene.',
    responsableId: 'u_matias', fechaLimite: en(1), importancia: 'alta', estado: 'en_curso',
    avance: 'Temario de la #14 ya cargado y cerrado.', creadoEn: en(-12),
  },
  {
    id: 'c_9', salaId: S_GERENCIAL, reunionId: R_PASADA,
    accion: 'Renegociar el alquiler del showroom de Palermo',
    detalle: 'Vence el contrato en noviembre. Adelantarse a la negociación.',
    responsableId: 'u_matias', fechaLimite: en(20), importancia: 'media', estado: 'pendiente',
    creadoEn: en(-12),
  },
  {
    id: 'c_10', salaId: S_GERENCIAL, reunionId: R_ANTERIOR,
    accion: 'Definir la campaña de ropa de invierno 2027',
    detalle: 'Proyecto largo: arranca ahora y cierra recién en cinco meses.',
    responsableId: 'u_lucas', fechaLimite: en(140), importancia: 'baja', estado: 'pendiente',
    creadoEn: en(-25),
  },
  // Suelto, sin reunión: el caso que pidió Fran.
  {
    id: 'c_11', salaId: S_GERENCIAL,
    accion: 'Pedir presupuesto de cartelería para Rosario',
    detalle: 'Surgió por WhatsApp, fuera de reunión.',
    responsableId: 'u_nico', fechaLimite: en(9), importancia: 'media', estado: 'pendiente',
    creadoEn: en(-1),
  },

  // Diseño
  {
    id: 'c_d1', salaId: S_DISENO,
    accion: 'Corregir la ficha técnica de la campera oversize',
    responsableId: 'u_renata', fechaLimite: en(4), importancia: 'alta', estado: 'en_curso',
    avance: 'Manga corregida, falta revisar el largo de espalda.', creadoEn: en(-3),
  },
  {
    id: 'c_d2', salaId: S_DISENO,
    accion: 'Pedir muestras de tela al proveedor nuevo',
    responsableId: 'u_juli', fechaLimite: en(-1), importancia: 'media', estado: 'pendiente',
    creadoEn: en(-6),
  },

  // Marketing
  {
    id: 'c_m1', salaId: S_MARKETING, reunionId: R_MKT, temaId: 't_m1',
    accion: 'Escribir los guiones de los reels de agosto',
    responsableId: 'u_pedro', fechaLimite: en(2), importancia: 'alta', estado: 'en_curso',
    avance: 'Dos de cuatro listos.', creadoEn: en(-4),
  },
  {
    id: 'c_m2', salaId: S_MARKETING, reunionId: R_MKT, temaId: 't_m1',
    accion: 'Armar el calendario de historias',
    responsableId: 'u_cami', fechaLimite: en(1), importancia: 'media', estado: 'pendiente',
    creadoEn: en(-4),
  },
  {
    id: 'c_m3', salaId: S_MARKETING, reunionId: R_MKT, temaId: 't_m2',
    accion: 'Confirmar fecha nueva con el fotógrafo',
    responsableId: 'u_lucas', fechaLimite: en(-2), importancia: 'alta', estado: 'bloqueado',
    avance: 'No contesta desde el martes.', creadoEn: en(-4),
  },
]

/* ── Notificaciones ───────────────────────────────────────── */

export const NOTIFICACIONES: Notificacion[] = [
  {
    id: 'n_1',
    salaId: S_GERENCIAL,
    tipo: 'agenda_cerrada',
    reunionId: R_HOY,
    asunto: 'Temario cerrado · Reunión semanal de socios · #14',
    destinatarios: USUARIOS.filter((u) => SOCIOS.includes(u.id)).map((u) => u.email),
    cuerpoHtml: '',
    cuerpoTexto:
      'Se cerró el temario de la reunión #14. Cuatro temas aprobados, 50 minutos asignados.',
    estado: 'simulado',
    creadoEn: en(-1),
  },
]

/* ── Pedidos de entrada ───────────────────────────────────── */

const SOLICITUDES: Solicitud[] = [
  {
    id: 'sol_1',
    salaId: S_GERENCIAL,
    usuarioId: 'u_sofia',
    mensaje: 'Arranqué en operaciones y me pidieron seguir los temas de la semanal.',
    estado: 'pendiente',
    creadaEn: en(-1),
  },
]

/* ── Estado inicial ───────────────────────────────────────── */

export const ESTADO_INICIAL: Estado = {
  usuarios: USUARIOS,
  salas: SALAS,
  membresias: MEMBRESIAS,
  solicitudes: SOLICITUDES,
  reuniones: REUNIONES,
  temas: TEMAS,
  compromisos: COMPROMISOS,
  notificaciones: NOTIFICACIONES,
  config: {
    organizacion: 'Harvey',
    emailsActivos: true,
  },
}
