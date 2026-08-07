import type { Config, Estado } from '../types'

/* Contrato del repositorio, en su propio módulo para que las
   implementaciones no dependan unas de otras. */

export type Coleccion =
  | 'usuarios'
  | 'salas'
  | 'membresias'
  | 'reuniones'
  | 'temas'
  | 'compromisos'
  | 'notificaciones'

/** Orden de escritura: respeta las claves foráneas. */
export const COLECCIONES: Coleccion[] = [
  'usuarios',
  'salas',
  'membresias',
  'reuniones',
  'temas',
  'compromisos',
  'notificaciones',
]

export interface Repo {
  modo: 'demo' | 'firebase' | 'neon'
  cargar(): Promise<Estado>
  /** Devuelve la función para desuscribirse. */
  suscribir(cb: (e: Estado) => void): () => void
  guardarDoc(col: Coleccion, item: { id: string }): Promise<void>
  borrarDoc(col: Coleccion, id: string): Promise<void>
  guardarConfig(config: Config): Promise<void>
  /** Vuelca el estado completo. Usado para restablecer la demo. */
  reemplazar(estado: Estado): Promise<void>
}
