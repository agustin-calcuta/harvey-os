import type { Estado } from '../../types'

/* ─────────────────────────────────────────────────────────────
   Lo que tiene que exportar el seed de cualquier cliente.

   Un seed no es relleno: los temas de ejemplo son lo que le enseña
   a alguien qué va en cada campo la primera vez que entra. Por eso
   no alcanza con traducir nombres —«Definir proveedor de denim» no
   le dice nada a una consultora—: cada cliente necesita reuniones
   que se parezcan a las suyas.
   ───────────────────────────────────────────────────────────── */

/**
 * Uno de los perfiles que ofrece la pantalla de acceso para mirar
 * la herramienta sin credenciales.
 */
export interface VistaPrevia {
  /** El id de una persona del seed. */
  id: string
  /** La sala desde la que se entra. */
  sala: string
  /** Cómo se llama el perfil: Socio, Miembro, Externo, Superadmin. */
  nombre: string
  /** Qué puede hacer, en una línea. */
  que: string
}

/** Lo que exporta el archivo de datos de cada cliente. */
export interface Seed {
  ESTADO_INICIAL: Estado
  VISTAS: VistaPrevia[]
}
