import { neon } from '../lib/neon'
import { ESTADO_INICIAL } from '../lib/seed'
import type { Config, Estado, SalaAjena } from '../types'
import { COLECCIONES, type Coleccion, type Repo } from './tipos'

/* ─────────────────────────────────────────────────────────────
   Repositorio contra la Data API de Neon.

   El esquema usa columnas en camelCase, así que las filas que
   devuelve PostgREST ya tienen la forma de los tipos de la app y
   no hace falta traducir nombres. Sólo se normalizan las fechas,
   que Postgres devuelve como timestamptz.

   Lo que llega está recortado por las políticas RLS: cada quien
   recibe únicamente lo de las salas a las que pertenece.
   ───────────────────────────────────────────────────────────── */

/** Columnas de fecha por colección, para normalizarlas a ISO. */
const FECHAS: Record<Coleccion, string[]> = {
  usuarios: ['creadoEn'],
  salas: ['creadaEn'],
  membresias: ['desde'],
  solicitudes: ['creadaEn', 'resueltaEn'],
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
    const cliente = neon
    if (!cliente) throw new Error('Neon no está configurado.')

    const resultados = await Promise.all([
      ...COLECCIONES.map((c) => cliente.from(c).select('*')),
      cliente.from('config').select('*').eq('id', 'global'),
    ])

    const primerError = resultados.find((r) => r.error)?.error
    if (primerError) throw new Error(primerError.message)

    const porColeccion = Object.fromEntries(
      COLECCIONES.map((c, i) => [
        c,
        ((resultados[i].data ?? []) as Fila[]).map((f) => normalizar(c, f)),
      ]),
    )
    const cfgFila = ((resultados[COLECCIONES.length].data ?? []) as Partial<Config>[])[0]

    return {
      ...porColeccion,
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
    const refrescar = () =>
      void this.cargar()
        .then(cb)
        .catch((e) => console.warn('[reuniones] fallo al refrescar:', e))

    /*
     * La primera carga va ya, no dentro de doce segundos.
     *
     * Sin esto la aplicación arrancaba mostrando el estado inicial
     * —que tiene las salas y la gente, pero ninguna reunión— y había
     * que esperar al primer tic del intervalo para ver los datos de
     * verdad. Abriendo la aplicación de frente casi no se notaba,
     * pero entrando por el enlace de un correo a una reunión puntual
     * la pantalla decía «Reunión no encontrada» durante esos doce
     * segundos, que es exactamente el momento en que alguien decide
     * que la herramienta no anda.
     */
    refrescar()

    const id = window.setInterval(refrescar, 12000)
    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar()
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
    // Borra en orden inverso al de las claves foráneas.
    for (const col of [...COLECCIONES].reverse()) {
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

  /*
   * `directorio_salas` es una vista que corre con los permisos de su
   * dueño, así que atraviesa el RLS de `salas`. Es la única manera de
   * saber que un nombre ya está tomado por una sala a la que todavía
   * no pertenecés. Sólo expone nombre, organizador y tamaño.
   */
  async directorioSalas() {
    if (!neon) return []
    const { data, error } = await neon
      .from('directorio_salas')
      .select('id,nombre,organizador,integrantes')
    if (error) {
      console.warn('[reuniones] no se pudo leer el directorio de salas:', error.message)
      return []
    }
    return (data ?? []) as SalaAjena[]
  },
}
