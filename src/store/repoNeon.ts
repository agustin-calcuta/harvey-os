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
  comentarios: ['creadoEn', 'editadoEn'],
  clientes: ['creadoEn'],
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

export const repoNeon: Repo & { faltantes?: string[] } = {
  modo: 'neon',
  /* Colecciones que la última lectura no pudo traer. */
  faltantes: undefined,

  async cargar(): Promise<Estado> {
    const cliente = neon
    if (!cliente) throw new Error('Neon no está configurado.')

    const resultados = await Promise.all([
      ...COLECCIONES.map((c) => cliente.from(c).select('*')),
      cliente.from('config').select('*').eq('id', 'global'),
    ])

    /*
     * Una tabla que falta no puede tumbar la aplicación entera.
     *
     * Antes, cualquier error cortaba la carga: si una base todavía no
     * tenía las tablas de una función nueva —comentarios, clientes—
     * la respuesta era una aplicación **vacía**, como si no hubiera
     * reuniones ni tareas. Y eso pasa justo en el peor momento: al
     * desplegar una versión nueva sobre una base sin migrar.
     *
     * Ahora sólo son imprescindibles las que sostienen todo lo demás.
     * Si falla una accesoria, se sigue sin ella y se avisa; si falla
     * una imprescindible, sí se corta, porque sin gente ni salas no
     * hay nada que mostrar y una pantalla vacía mentiría.
     */
    const IMPRESCINDIBLES: Coleccion[] = ['usuarios', 'salas', 'membresias']
    const faltantes: string[] = []

    COLECCIONES.forEach((c, i) => {
      const err = resultados[i].error
      if (!err) return
      if (IMPRESCINDIBLES.includes(c)) throw new Error(`${c}: ${err.message}`)
      faltantes.push(c)
      console.warn(`[reuniones] sigo sin «${c}»:`, err.message)
    })

    if (faltantes.length) {
      // Se cuenta arriba para poder avisarlo una sola vez.
      this.faltantes = faltantes
    }

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
  suscribir(cb, alFallar) {
    if (!neon) return () => {}
    /*
     * Un fallo al leer no puede quedarse en la consola.
     *
     * Sin datos la aplicación se ve vacía, y vacía es exactamente lo
     * que se ve cuando alguien perdió su trabajo: quien lo mira no
     * tiene forma de distinguir «no cargó» de «no está». El aviso es
     * la diferencia entre recargar la página y dar por perdido un mes
     * de reuniones.
     */
    let yaAvise = false
    const refrescar = () =>
      void this.cargar()
        .then((estado) => {
          cb(estado)
          /*
           * Si faltó alguna tabla, se dice una vez y no en cada
           * refresco: repetir el mismo aviso cada doce segundos es
           * la forma más rápida de que se ignore.
           */
          const f = (this as { faltantes?: string[] }).faltantes
          if (f?.length && !yaAvise) {
            yaAvise = true
            alFallar?.(
              `faltan tablas en la base (${f.join(', ')}). La aplicación funciona, pero esas funciones no.`,
            )
          }
        })
        .catch((e) => {
          console.warn('[reuniones] fallo al refrescar:', e)
          alFallar?.(e instanceof Error ? e.message : String(e))
        })

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
