import type { Estado, Membresia, Sala, Usuario } from '../../types'
import { en } from './fechas.ts'
import type { VistaPrevia } from './tipos.ts'

/* ─────────────────────────────────────────────────────────────
   Estado inicial — IMPORBAMAS.

   Esto **no es una demostración**: es la instancia con la que los
   socios empiezan a trabajar. Por eso no hay reuniones, temas ni
   tareas de ejemplo, y tampoco gente inventada: lo único cargado
   son las cuatro personas y la sala donde se reúnen.

   Hasta acá los datos eran de muestra —cuatro apellidos Harvey,
   dos equipos con su gente y una agenda armada—. Servían para
   mostrar la herramienta antes de que existiera el equipo, y a
   partir de que el equipo existe estorban: nadie sabe cuál de las
   tareas que ve es suya de verdad.

   ── Quién puede qué ──────────────────────────────────────────
   Los cuatro están a la par: todos abren salas, arman la agenda,
   moderan y administran el equipo. Son `superadmin`, que es lo que
   deja dar de alta y de baja gente sin depender de nosotros.

   ── Los correos ──────────────────────────────────────────────
   Van vacíos a propósito. El correo es lo que después vincula cada
   cuenta de Google con su ficha, así que uno inventado no es un
   dato incompleto: es un dato **equivocado**, y el día que se
   encienda el acceso deja afuera justo a la persona que figura con
   él. Se completan desde Administración cuando el equipo los pase.
   ───────────────────────────────────────────────────────────── */

/* ── Personas ─────────────────────────────────────────────── */

const socio = (id: string, nombre: string): Usuario => ({
  id,
  nombre,
  /* Se carga desde Administración; ver la nota de arriba. */
  email: '',
  /* Los cuatro administran: no hay cuenta de soporte. */
  alcance: 'superadmin',
  puedeCrearSalas: true,
  cargo: 'Socio',
  activo: true,
  creadoEn: en(0),
})

export const USUARIOS: Usuario[] = [
  socio('u_nico', 'Nicolas Kroitor'),
  socio('u_matias', 'Matias Kroitor'),
  socio('u_lucas', 'Lucas Finkelstein'),
  socio('u_hernan', 'Hernan Finkelstein'),
]

const SOCIOS = USUARIOS.map((u) => u.id)

/* ── Salas ────────────────────────────────────────────────── */

export const S_SOCIOS = 'sala_socios'

export const SALAS: Sala[] = [
  {
    id: S_SOCIOS,
    nombre: 'Socios',
    descripcion: 'La reunión de los cuatro. Acá están todos a la par.',
    cadencia: 'Lunes 10:00',
    horasCierreAgenda: 24,
    cierreManual: true,
    duracionReunionDefaultMin: 60,
    duracionTemaDefaultMin: 15,
    creadaPor: 'u_nico',
    creadaEn: en(0),
    archivada: false,
  },
]

/* ── Membresías ───────────────────────────────────────────── */

/* Los cuatro organizan: todos proponen, todos aprueban, todos moderan. */
export const MEMBRESIAS: Membresia[] = SOCIOS.map((usuarioId) => ({
  id: `mb_${S_SOCIOS}_${usuarioId}`,
  salaId: S_SOCIOS,
  usuarioId,
  rol: 'organizador',
  desde: en(0),
}))

/* ── Acceso ───────────────────────────────────────────────── */

/*
 * Los cuatro perfiles de la pantalla de acceso.
 *
 * No son «vistas de demostración»: mientras el acceso con Google
 * esté apagado, es la única forma de entrar, y cada uno entra por
 * el suyo. Por eso dicen el nombre de la persona y no el del rol.
 */
export const VISTAS: VistaPrevia[] = USUARIOS.map((u) => ({
  id: u.id,
  sala: S_SOCIOS,
  nombre: u.nombre,
  /* Corto a propósito: los cuatro hacen lo mismo, y cuatro renglones
     idénticos y cortados a la mitad no informan nada. */
  que: 'Socio',
}))

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
    organizacion: 'Imporbamas',
    /* Sin casilla propia todavía: ver `usaCorreo` en la marca. */
    emailsActivos: false,
  },
}
