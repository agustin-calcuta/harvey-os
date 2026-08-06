import { neon } from '../lib/neon'
import { ESTADO_INICIAL } from '../lib/seed'
import type { Config, Estado } from '../types'
import { COLECCIONES, type Coleccion, type Repo } from './tipos'

/* ─────────────────────────────────────────────────────────────
   Repositorio contra la Data API de Neon.

   El esquema usa columnas en camelCase, así que las filas que
   devuelve PostgREST ya tienen la forma de los tipos de la app y
   no hace falta traducir nombres. Sólo se normalizan las fechas,
   que Postgres devuelve como timestamptz.
   ───────────────────────────────────────────────────────────── */

/** Columnas de fecha por colección, para normalizarlas a ISO. */
const FECHAS: Record<Coleccion | 'config', string[]> = {
  usuarios: ['creadoEn'],
  reuniones: [
    'fecha',
    'proximaReunionFecha',
    'agendaCerradaEn',
    'iniciadaEn',
    'cerradaEn',
    'creadoEn',
  ],
  temas: ['creadoEn'],
  compromisos: ['fechaLimite', 'completadoEn', 'creadoEn'],
  notificaciones: ['creadoEn'],
  config: [],
}

type Fila = Record<string, unknown>

function normalizar(col: Coleccion, fila: Fila): Fila {
  const salida: Fila = { ...fila }
  for (const campo of FECHAS[col]) {
    const v = salida[campo]
    if (typeof v === 'string') salida[campo] = new Date(v).toISOString()
  }
  // PostgREST devuelve null donde la app espera undefined.
  for (const k of Object.keys(salida)) if (salida[k] === null) delete salida[k]
  return salida
}

/** Postgres rechaza cadenas vacías en timestamptz y no acepta undefined. */
function aFila(item: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(item)) {
    salida[k] = v === undefined || v === '' ? null : v
  }
  return salida
}

export const repoNeon: Repo = {
  modo: 'neon',

  async cargar(): Promise<Estado> {
    if (!neon) throw new Error('Neon no está configurado.')

    const [usuarios, reuniones, temas, compromisos, notificaciones, config] =
      await Promise.all([
        neon.from('usuarios').select('*'),
        neon.from('reuniones').select('*'),
        neon.from('temas').select('*'),
        neon.from('compromisos').select('*'),
        neon.from('notificaciones').select('*'),
        neon.from('config').select('*').eq('id', 'global'),
      ])

    const primerError = [usuarios, reuniones, temas, compromisos, notificaciones, config].find(
      (r) => r.error,
    )?.error
    if (primerError) throw new Error(primerError.message)

    const cfgFila = (config.data ?? [])[0] as Partial<Config> | undefined

    return {
      usuarios: ((usuarios.data ?? []) as Fila[]).map((f) => normalizar('usuarios', f)),
      reuniones: ((reuniones.data ?? []) as Fila[]).map((f) => normalizar('reuniones', f)),
      temas: ((temas.data ?? []) as Fila[]).map((f) => normalizar('temas', f)),
      compromisos: ((compromisos.data ?? []) as Fila[]).map((f) => normalizar('compromisos', f)),
      notificaciones: ((notificaciones.data ?? []) as Fila[]).map((f) =>
        normalizar('notificaciones', f),
      ),
      config: { ...ESTADO_INICIAL.config, ...(cfgFila ?? {}) },
    } as unknown as Estado
  },

  /**
   * La Data API es REST, sin canal de tiempo real. Se refresca por
   * intervalo: alcanza para que varias personas trabajen sobre la
   * misma reunión sin pisarse.
   */
  suscribir(cb) {
    if (!neon) return () => {}
    const id = window.setInterval(() => {
      void this.cargar()
        .then(cb)
        .catch((e) => console.warn('[harvey] fallo al refrescar:', e))
    }, 12000)

    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        void this.cargar()
          .then(cb)
          .catch((e) => console.warn('[harvey] fallo al refrescar:', e))
      }
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  },

  async guardarDoc(col, item) {
    if (!neon) return
    const { error } = await neon.from(col).upsert(aFila(item as Record<string, unknown>))
    if (error) throw new Error(`No se pudo guardar en ${col}: ${error.message}`)
  },

  async borrarDoc(col, id) {
    if (!neon) return
    const { error } = await neon.from(col).delete().eq('id', id)
    if (error) throw new Error(`No se pudo eliminar de ${col}: ${error.message}`)
  },

  async guardarConfig(config) {
    if (!neon) return
    const { error } = await neon
      .from('config')
      .upsert({ ...aFila(config as unknown as Record<string, unknown>), id: 'global' })
    if (error) throw new Error(`No se pudo guardar la configuración: ${error.message}`)
  },

  async reemplazar(estado) {
    if (!neon) return
    // Se respeta el orden de las claves foráneas: primero lo que
    // cuelga de reuniones, después las reuniones.
    for (const col of ['notificaciones', 'compromisos', 'temas', 'reuniones'] as Coleccion[]) {
      await neon.from(col).delete().neq('id', '')
    }
    for (const col of COLECCIONES) {
      const filas = (estado[col] as { id: string }[]).map((x) =>
        aFila(x as unknown as Record<string, unknown>),
      )
      if (!filas.length) continue
      const { error } = await neon.from(col).upsert(filas)
      if (error) throw new Error(`No se pudo sembrar ${col}: ${error.message}`)
    }
    await this.guardarConfig(estado.config)
  },
}
