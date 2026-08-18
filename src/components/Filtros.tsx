import type { ReactNode } from 'react'
import { CalendarRange } from 'lucide-react'
import { cx } from '../lib/utils'
import type { Sala } from '../types'

/* ─────────────────────────────────────────────────────────────
   Los dos filtros que están en todas las secciones.

   Antes cada pantalla mostraba una sala y punto. Ahora traen
   todo lo de todas mis salas, y para eso hacen falta las dos
   perillas: de qué sala y de cuándo. Viven acá para que en
   Reuniones, Tareas y el bloc de notas se vean y se comporten
   igual.
   ───────────────────────────────────────────────────────────── */

export type Periodo =
  | 'adelante'
  | 'semana'
  | 'mes'
  | 'proximaSemana'
  | 'proximoMes'
  | 'todo'
  | 'rango'

export interface Rango {
  periodo: Periodo
  /** Sólo cuando el período es 'rango'. Fechas en formato AAAA-MM-DD. */
  desde?: string
  hasta?: string
}

/**
 * Lo que viene, que es con lo que uno abre la plataforma: *"quiero
 * ver todo lo que tengo de acá en adelante"*.
 */
export const RANGO_INICIAL: Rango = { periodo: 'adelante' }

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'adelante', texto: 'De hoy en adelante' },
  { valor: 'semana', texto: 'Última semana' },
  { valor: 'mes', texto: 'Último mes' },
  { valor: 'proximaSemana', texto: 'Próxima semana' },
  { valor: 'proximoMes', texto: 'Próximo mes' },
  { valor: 'todo', texto: 'Todo' },
  { valor: 'rango', texto: 'Entre dos fechas…' },
]

const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sumarDias = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Los dos extremos del período, en milisegundos. Sin límite es `null`. */
function limites(r: Rango): { desde: number | null; hasta: number | null } {
  const hoy = inicioDelDia(new Date())
  const finDeHoy = sumarDias(hoy, 1).getTime() - 1

  switch (r.periodo) {
    case 'adelante':
      return { desde: hoy.getTime(), hasta: null }
    case 'semana':
      return { desde: sumarDias(hoy, -7).getTime(), hasta: finDeHoy }
    case 'mes':
      return { desde: sumarDias(hoy, -30).getTime(), hasta: finDeHoy }
    case 'proximaSemana':
      return { desde: hoy.getTime(), hasta: sumarDias(hoy, 7).getTime() - 1 }
    case 'proximoMes':
      return { desde: hoy.getTime(), hasta: sumarDias(hoy, 30).getTime() - 1 }
    case 'rango':
      return {
        desde: r.desde ? new Date(`${r.desde}T00:00:00`).getTime() : null,
        hasta: r.hasta ? new Date(`${r.hasta}T23:59:59`).getTime() : null,
      }
    default:
      return { desde: null, hasta: null }
  }
}

/**
 * Si una fecha entra en el período elegido.
 *
 * Lo que no tiene fecha entra siempre: una tarea sin vencimiento no
 * está ni antes ni después, y esconderla sería perderla.
 */
export function enRango(iso: string | undefined, r: Rango): boolean {
  if (!iso) return true
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return true
  const { desde, hasta } = limites(r)
  if (desde !== null && t < desde) return false
  if (hasta !== null && t > hasta) return false
  return true
}

/** Texto corto del filtro puesto, para decir por qué no se ve algo. */
export function textoRango(r: Rango): string {
  if (r.periodo === 'rango') {
    if (!r.desde && !r.hasta) return 'entre dos fechas'
    if (r.desde && r.hasta) return `entre el ${r.desde} y el ${r.hasta}`
    return r.desde ? `desde el ${r.desde}` : `hasta el ${r.hasta}`
  }
  return (PERIODOS.find((p) => p.valor === r.periodo)?.texto ?? '').toLowerCase()
}

/* ── Los controles ────────────────────────────────────────── */

const selectCls =
  'border border-borde2 bg-panel px-3 py-2 font-semibold text-meta text-suave transition-colors hover:border-suave hover:text-tinta'

export function FiltroSala({
  valor,
  onChange,
  salas,
}: {
  /** `'todas'` o el id de una sala. */
  valor: string
  onChange: (v: string) => void
  salas: Sala[]
}) {
  // Con una sola sala no hay nada que elegir.
  if (salas.length < 2) return null

  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrar por sala"
      className={cx(selectCls, valor !== 'todas' && 'border-tinta text-tinta')}
    >
      <option value="todas">Todas las salas</option>
      {salas.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  )
}

export function FiltroFecha({ valor, onChange }: { valor: Rango; onChange: (v: Rango) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={valor.periodo}
        onChange={(e) => onChange({ ...valor, periodo: e.target.value as Periodo })}
        aria-label="Filtrar por fecha"
        className={cx(selectCls, valor.periodo !== 'adelante' && 'border-tinta text-tinta')}
      >
        {PERIODOS.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.texto}
          </option>
        ))}
      </select>

      {valor.periodo === 'rango' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <CalendarRange size={13} className="text-tenue" />
          <input
            type="date"
            value={valor.desde ?? ''}
            max={valor.hasta || undefined}
            onChange={(e) => onChange({ ...valor, desde: e.target.value || undefined })}
            aria-label="Desde"
            className="text-xs"
          />
          <span className="text-meta text-tenue">a</span>
          <input
            type="date"
            value={valor.hasta ?? ''}
            min={valor.desde || undefined}
            onChange={(e) => onChange({ ...valor, hasta: e.target.value || undefined })}
            aria-label="Hasta"
            className="text-xs"
          />
          {(valor.desde || valor.hasta) && (
            <button
              type="button"
              onClick={() => onChange({ periodo: 'rango' })}
              className="text-[10px] text-suave underline underline-offset-2 hover:text-tinta"
            >
              limpiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** La fila donde viven los filtros de una pantalla. */
export function BarraFiltros({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-center gap-2">{children}</div>
}
