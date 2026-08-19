import type { Config, Estado, SalaAjena } from '../types'

/* Contrato del repositorio, en su propio módulo para que las
   implementaciones no dependan unas de otras. */

export type Coleccion =
  | 'usuarios'
  | 'salas'
  | 'membresias'
  | 'solicitudes'
  | 'reuniones'
  | 'temas'
  | 'compromisos'
  | 'comentarios'
  | 'clientes'
  | 'notificaciones'

/** Orden de escritura: respeta las claves foráneas. */
export const COLECCIONES: Coleccion[] = [
  'usuarios',
  'salas',
  'membresias',
  'solicitudes',
  'reuniones',
  'temas',
  'compromisos',
  /* Los comentarios van después de los compromisos: los referencian. */
  'comentarios',
  'clientes',
  'notificaciones',
]

export interface Repo {
  modo: 'demo' | 'firebase' | 'neon'
  cargar(): Promise<Estado>
  /**
   * Devuelve la función para desuscribirse.
   *
   * `alFallar` recibe el motivo cuando una lectura no sale. Sin eso,
   * un error de red deja la aplicación vacía y en silencio, que es
   * indistinguible de haber perdido los datos.
   */
  suscribir(cb: (e: Estado) => void, alFallar?: (motivo: string) => void): () => void
  guardarDoc(col: Coleccion, item: { id: string }): Promise<void>
  borrarDoc(col: Coleccion, id: string): Promise<void>
  guardarConfig(config: Config): Promise<void>
  /** Vuelca el estado completo. Usado para restablecer la demo. */
  reemplazar(estado: Estado): Promise<void>
  /**
   * Qué salas existen, más allá de las propias: lo justo para avisar
   * que un nombre ya está tomado y a quién pedirle entrar.
   */
  directorioSalas(): Promise<SalaAjena[]>
}
