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
   Ariel y Denise son socios: abren salas y suman gente. El resto
   propone temas, crea reuniones en sus salas y sigue sus tareas.
   Es la única diferencia de permisos que pidieron.
   ───────────────────────────────────────────────────────────── */

/**
 * El dominio del Workspace.
 *
 * En un solo lugar porque el acceso es con Google: el correo con el
 * que cada uno entra tiene que ser exactamente el de su cuenta, y
 * si el dominio cambia, cambia acá y en ningún otro lado.
 *
 * ⚠️ PENDIENTE: confirmar contra el Workspace real antes de cargar
 * la base. Un correo que no coincide es una persona que no puede
 * entrar.
 */
const DOMINIO = 'calcuta.com'

/* ── Personas ─────────────────────────────────────────────── */

const persona = (
  id: string,
  nombre: string,
  usuario: string,
  cargo: string,
  puedeCrearSalas = false,
): Usuario => ({
  id,
  nombre,
  email: `${usuario}@${DOMINIO}`,
  alcance: 'usuario',
  puedeCrearSalas,
  cargo,
  activo: true,
  creadoEn: en(0),
})

export const USUARIOS: Usuario[] = [
  /*
   * Socios. Son los únicos que abren salas y suman gente nueva.
   * ⚠️ Faltan los apellidos y confirmar el usuario de cada correo.
   */
  persona('u_ariel', 'Ariel', 'ariel', 'Socio', true),
  persona('u_denise', 'Denise', 'denise', 'Socia', true),

  /* Equipo. */
  persona('u_agustin', 'Agustín', 'agustin', 'Digital Lab'),
  persona('u_francisco', 'Francisco', 'francisco', 'Digital Lab'),
  persona('u_lucas', 'Lucas', 'lucas', 'Digital Lab'),

  /*
   * La cuenta de soporte: ve todas las salas y puede intervenir en
   * cualquiera, pero no pertenece a ningún equipo y queda fuera de
   * las listas donde se elige gente.
   *
   * ⚠️ PENDIENTE: definir con qué casilla se entra. Tiene que ser
   * una cuenta de Google real o nadie va a poder usarla.
   */
  {
    id: 'u_superadmin',
    nombre: 'Superadmin',
    email: `superadmin@${DOMINIO}`,
    alcance: 'superadmin',
    puedeCrearSalas: true,
    activo: true,
    creadoEn: en(0),
  },
]

const SOCIOS = ['u_ariel', 'u_denise']
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

export const MEMBRESIAS: Membresia[] = [
  /*
   * Digital Lab: los socios organizan —son los que suman gente— y
   * el equipo propone.
   */
  ...SOCIOS.map((id) => m(S_LAB, id, 'organizador')),
  ...EQUIPO.map((id) => m(S_LAB, id, 'miembro')),

  /* General: está todo el estudio. */
  ...SOCIOS.map((id) => m(S_GENERAL, id, 'organizador')),
  ...EQUIPO.map((id) => m(S_GENERAL, id, 'miembro')),

  /* Comercial: por ahora los socios. Se suma gente desde la sala. */
  ...SOCIOS.map((id) => m(S_COMERCIAL, id, 'organizador')),

  /* Socios: los dos a la par. */
  ...SOCIOS.map((id) => m(S_SOCIOS, id, 'organizador')),
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
  notificaciones: [],
  config: {
    organizacion: 'Calcuta',
    emailsActivos: true,
  },
}
