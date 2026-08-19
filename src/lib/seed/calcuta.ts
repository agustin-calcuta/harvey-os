import type { Estado, Membresia, RolSala, Sala, Usuario } from '../../types'
import { en } from './fechas.ts'
import type { VistaPrevia } from './tipos.ts'

/* ─────────────────────────────────────────────────────────────
   Estado inicial — CALCUTA.

   Esto **no es una demostración**: es la instancia con la que el
   equipo empieza a trabajar. Por eso no hay reuniones, temas ni
   tareas de ejemplo —las carga el equipo desde el primer día— y la
   pantalla de acceso no ofrece ningún recorrido: se entra con
   Google y nada más.

   Lo único que viene cargado es lo que no tiene sentido pedirle a
   nadie que tipee la primera vez: las cuatro salas y quién es quién
   en cada una.

   ── Quién puede qué ──────────────────────────────────────────
   **Todos** crean salas, reuniones, temas y tareas. La única
   diferencia es que Ariel y Denise administran el equipo: son los
   que dan de alta y de baja gente.

   Eso los hace `superadmin`, que además de administrar les deja ver
   todas las salas. Para cinco personas en un mismo estudio eso no
   molesta, pero conviene saberlo: no es sólo «pueden agregar
   miembros», es también «ven todo».
   ───────────────────────────────────────────────────────────── */

/**
 * El dominio del Workspace.
 *
 * En un solo lugar porque el acceso es con Google: el correo con el
 * que cada uno entra tiene que ser **exactamente** el de su cuenta.
 * Uno que no coincide es una persona que no puede entrar, y el
 * error no se ve hasta que lo intenta.
 */
const DOMINIO = 'calcutaconsulting.com'

/* ── Personas ─────────────────────────────────────────────── */

/**
 * Todos pueden abrir salas: `puedeCrearSalas` va en `true` para
 * cualquiera. El `alcance` es lo único que separa a quien
 * administra el equipo del resto.
 */
const persona = (
  id: string,
  nombre: string,
  usuario: string,
  cargo: string,
  alcance: Usuario['alcance'] = 'usuario',
): Usuario => ({
  id,
  nombre,
  email: `${usuario}@${DOMINIO}`,
  alcance,
  puedeCrearSalas: true,
  cargo,
  activo: true,
  creadoEn: en(0),
})

export const USUARIOS: Usuario[] = [
  /*
   * Ariel y Denise administran: dan de alta y de baja gente. No hay
   * una cuenta de soporte aparte —la administración la hacen ellos—.
   *
   * Los correos salen de las minutas de Gemini, que traen a cada
   * invitado con su `mailto:`: son las cuentas con las que realmente
   * entraron a la reunión.
   *
   * Los nombres, en cambio, se confirmaron a mano. La cuenta del
   * área aparece en las minutas sólo como «Digital Lab CALCUTA», sin
   * nombre de persona, y buscarle uno cruzando otras minutas hizo
   * que se colara el apellido de un tocayo de otro cliente.
   */
  persona('u_ariel', 'Ariel Berinstein', 'ariel', 'Socio', 'superadmin'),
  persona('u_denise', 'Denise Zaga', 'denise', 'Socia', 'superadmin'),

  /*
   * El equipo. Crean salas, reuniones, temas y tareas como
   * cualquiera; lo único que no hacen es dar de alta gente nueva.
   *
   * El de Lucas es `digital.lab@` —con punto—, que es la casilla del
   * área y no una personal. Salió de las minutas de Gemini: se había
   * cargado sin el punto y así no habría podido entrar. En Workspace
   * los puntos cuentan, a diferencia de Gmail personal.
   */
  persona('u_agustin', 'Agustín Ducculi', 'agustin', 'Digital Lab'),
  persona('u_francisco', 'Francisco Lebermann', 'francisco', 'Digital Lab'),
  persona('u_lucas', 'Lucas Schmidt', 'digital.lab', 'Digital Lab'),
]

const ADMINS = ['u_ariel', 'u_denise']
const EQUIPO = ['u_agustin', 'u_francisco', 'u_lucas']

/* ── Salas ────────────────────────────────────────────────── */

export const S_LAB = 'sala_digital_lab'
export const S_GENERAL = 'sala_general'
export const S_COMERCIAL = 'sala_comercial'
export const S_SOCIOS = 'sala_socios'

export const SALAS: Sala[] = [
  {
    id: S_LAB,
    nombre: 'Digital Lab',
    descripcion: 'El equipo de producto y desarrollo.',
    cadencia: 'Lunes 10:00',
    horasCierreAgenda: 24,
    cierreManual: true,
    duracionReunionDefaultMin: 60,
    duracionTemaDefaultMin: 15,
    lugarHabitual: 'Meet',
    lugares: ['Meet', 'Oficina'],
    creadaPor: 'u_ariel',
    creadaEn: en(0),
    archivada: false,
  },
  {
    id: S_GENERAL,
    nombre: 'General',
    descripcion: 'Todo el estudio: novedades, calendario y lo que cruza a los equipos.',
    cadencia: 'Primer lunes de cada mes',
    horasCierreAgenda: 48,
    cierreManual: true,
    duracionReunionDefaultMin: 45,
    duracionTemaDefaultMin: 10,
    lugarHabitual: 'Oficina',
    lugares: ['Oficina', 'Meet'],
    creadaPor: 'u_ariel',
    creadaEn: en(0),
    archivada: false,
  },
  {
    id: S_COMERCIAL,
    nombre: 'Comercial',
    descripcion: 'Pipeline, propuestas en curso y renovaciones.',
    cadencia: 'Miércoles 09:30',
    horasCierreAgenda: 24,
    cierreManual: true,
    duracionReunionDefaultMin: 45,
    duracionTemaDefaultMin: 15,
    lugarHabitual: 'Meet',
    lugares: ['Meet', 'Oficina'],
    creadaPor: 'u_denise',
    creadaEn: en(0),
    archivada: false,
  },
  {
    id: S_SOCIOS,
    nombre: 'Socios',
    descripcion: 'La reunión de dirección. Acá están todos a la par.',
    cadencia: 'Viernes 16:00',
    horasCierreAgenda: 24,
    cierreManual: true,
    duracionReunionDefaultMin: 90,
    duracionTemaDefaultMin: 20,
    lugarHabitual: 'Oficina',
    lugares: ['Oficina', 'Meet'],
    creadaPor: 'u_ariel',
    creadaEn: en(0),
    archivada: false,
  },
]

/* ── Membresías ───────────────────────────────────────────── */

const m = (salaId: string, usuarioId: string, rol: RolSala): Membresia => ({
  id: `mb_${salaId}_${usuarioId}`,
  salaId,
  usuarioId,
  rol,
  desde: en(0),
})

/*
 * Todos entran como `organizador` a las salas donde trabajan, y no
 * es un descuido.
 *
 * «Agregar miembros» son dos cosas distintas en la herramienta:
 * dar de alta una **cuenta** —que es de quien administra, o sea
 * Ariel y Denise, desde Administración— y sumar a alguien que ya
 * existe a una **sala**, que es de quien organiza esa sala.
 *
 * Si el equipo entrara como `miembro`, cada tema que propusieran
 * quedaría esperando que un socio lo apruebe antes de entrar al
 * temario. Eso no es lo que se pidió —«el resto todos podemos crear
 * reuniones, temas, tareas»— así que van como organizadores: cargan
 * su temario sin pedir permiso y moderan sus propias reuniones.
 */
export const MEMBRESIAS: Membresia[] = [
  /* Digital Lab: el equipo entero, todos a la par. */
  ...ADMINS.map((id) => m(S_LAB, id, 'organizador')),
  ...EQUIPO.map((id) => m(S_LAB, id, 'organizador')),

  /* General: está todo el estudio. */
  ...ADMINS.map((id) => m(S_GENERAL, id, 'organizador')),
  ...EQUIPO.map((id) => m(S_GENERAL, id, 'organizador')),

  /*
   * Comercial y Socios arrancan sólo con Ariel y Denise. Si tiene
   * que entrar alguien más, se suma desde la sala.
   */
  ...ADMINS.map((id) => m(S_COMERCIAL, id, 'organizador')),
  ...ADMINS.map((id) => m(S_SOCIOS, id, 'organizador')),
]

/* ── Pantalla de acceso ───────────────────────────────────── */

/**
 * Vacío a propósito.
 *
 * Los perfiles de vista previa son para mostrar la herramienta a
 * alguien que todavía no la usa. Acá el equipo entra con su cuenta
 * de Google a sus datos reales, así que la pantalla de acceso no
 * ofrece ningún recorrido ni menciona datos de ejemplo.
 */
export const VISTAS: VistaPrevia[] = []

/* ── Estado inicial ───────────────────────────────────────── */

export const ESTADO_INICIAL: Estado = {
  usuarios: USUARIOS,
  salas: SALAS,
  membresias: MEMBRESIAS,
  /* Todo lo demás lo carga el equipo. */
  solicitudes: [],
  reuniones: [],
  temas: [],
  compromisos: [],
  comentarios: [],
  clientes: [],
  notificaciones: [],
  config: {
    organizacion: 'Calcuta',
    emailsActivos: true,
  },
}
