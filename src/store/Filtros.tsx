import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { RANGO_INICIAL, type Rango } from '../components/Filtros'

/* ─────────────────────────────────────────────────────────────
   El filtro es uno solo para toda la aplicación.

   *"Si cambio a una sala, que se cambie todo, en todos los filtros
   y en todas las secciones"*. Tiene sentido: filtrar es elegir de
   qué estás hablando, y esa elección no debería evaporarse porque
   pasaste de Reuniones a Tareas.

   Vive acá y no en cada pantalla, y se guarda: al volver mañana
   seguís mirando lo mismo que dejaste.

   Lo que cada sección **no** comparte es contra qué fecha compara,
   porque no es la misma: en Reuniones es cuándo es la reunión, en
   Tareas cuándo vence, en el bloc cuándo se anotó la nota. El
   período elegido es el mismo; el campo que mira, no.
   ───────────────────────────────────────────────────────────── */

const CLAVE = 'harvey-os:filtros:v1'

interface Filtros {
  /** `'todas'` o el id de una sala. */
  sala: string
  elegirSala(v: string): void
  rango: Rango
  elegirRango(v: Rango): void
  /** Si hay algo puesto, para poder decir por qué no se ve algo. */
  hayFiltro: boolean
  limpiar(): void
}

const Ctx = createContext<Filtros | null>(null)

interface Guardado {
  sala?: string
  rango?: Rango
}

function leer(): Guardado {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Guardado
  } catch {
    return {}
  }
}

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const guardado = useMemo(leer, [])
  const [sala, setSala] = useState(guardado.sala ?? 'todas')
  const [rango, setRango] = useState<Rango>(guardado.rango ?? RANGO_INICIAL)

  const guardar = useCallback((s: string, r: Rango) => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ sala: s, rango: r }))
    } catch {
      /* Sin localStorage el filtro dura la sesión, que alcanza. */
    }
  }, [])

  const elegirSala = useCallback(
    (v: string) => {
      setSala(v)
      guardar(v, rango)
    },
    [rango, guardar],
  )

  const elegirRango = useCallback(
    (v: Rango) => {
      setRango(v)
      guardar(sala, v)
    },
    [sala, guardar],
  )

  const limpiar = useCallback(() => {
    setSala('todas')
    setRango(RANGO_INICIAL)
    guardar('todas', RANGO_INICIAL)
  }, [guardar])

  const valor = useMemo<Filtros>(
    () => ({
      sala,
      elegirSala,
      rango,
      elegirRango,
      hayFiltro: sala !== 'todas' || rango.periodo !== RANGO_INICIAL.periodo,
      limpiar,
    }),
    [sala, elegirSala, rango, elegirRango, limpiar],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useFiltros(): Filtros {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFiltros fuera de FiltrosProvider')
  return ctx
}
