import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { cx, estaVencido, fechaCorta, nombreDe, relativo } from '../lib/utils'
import {
  COLUMNAS_KANBAN,
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  type Compromiso,
  type EstadoCompromiso,
} from '../types'
import { Avatar, Boton, Chip, Etiqueta, Metrica, Seccion, Vacio } from '../components/ui'

/* ─────────────────────────────────────────────────────────────
   Repositorio centralizado de pendientes.
   Es el link que el equipo abre al arrancar la reunión para
   repasar lo que quedó de sesiones anteriores, sin que eso
   infle la minuta del día.
   ───────────────────────────────────────────────────────────── */

type Agrupacion = 'responsable' | 'reunion' | 'vencimiento'

export default function Pendientes() {
  const { estado, moverCompromiso } = useApp()
  const [agrupar, setAgrupar] = useState<Agrupacion>('responsable')
  const [incluirHechos, setIncluirHechos] = useState(false)

  const lista = useMemo(
    () =>
      estado.compromisos
        .filter((c) => incluirHechos || c.estado !== 'hecho')
        .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999')),
    [estado.compromisos, incluirHechos],
  )

  const grupos = useMemo(() => {
    const m = new Map<string, Compromiso[]>()
    for (const c of lista) {
      let clave: string
      if (agrupar === 'responsable') clave = nombreDe(estado, c.responsableId)
      else if (agrupar === 'reunion')
        clave = estado.reuniones.find((r) => r.id === c.reunionId)?.titulo ?? 'Sin reunión'
      else clave = etiquetaVencimiento(c)
      m.set(clave, [...(m.get(clave) ?? []), c])
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [lista, agrupar, estado])

  const vencidos = lista.filter((c) => estaVencido(c))
  const antiguo = lista.reduce<Compromiso | undefined>(
    (peor, c) =>
      c.estado !== 'hecho' && (!peor || c.creadoEn < peor.creadoEn) ? c : peor,
    undefined,
  )

  return (
    <div className="space-y-6">
      <Seccion kicker="Historial vivo" titulo="Pendientes">
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-smoke">
          Todo lo que quedó abierto, sin importar de qué reunión venga. Hay decisiones que
          arrancan hoy y se cierran dentro de cinco meses: acá no se pierden.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metrica valor={lista.filter((c) => c.estado !== 'hecho').length} etiqueta="Abiertos" />
          <Metrica
            valor={vencidos.length}
            etiqueta="Vencidos"
            tono={vencidos.length ? 'signal' : undefined}
          />
          <Metrica
            valor={lista.filter((c) => c.estado === 'bloqueado').length}
            etiqueta="Bloqueados"
            tono="amber"
          />
          <Metrica
            valor={antiguo ? relativo(antiguo.creadoEn).replace('hace ', '') : '—'}
            etiqueta="El más viejo"
          />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Etiqueta className="mr-1">Agrupar por</Etiqueta>
          {(['responsable', 'reunion', 'vencimiento'] as Agrupacion[]).map((a) => (
            <button
              key={a}
              onClick={() => setAgrupar(a)}
              className={
                agrupar === a
                  ? 'border border-bone bg-bone px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink'
                  : 'border border-line-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-smoke transition-colors hover:border-smoke hover:text-bone'
              }
            >
              {a}
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-smoke">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[#C0392B]"
              checked={incluirHechos}
              onChange={(e) => setIncluirHechos(e.target.checked)}
            />
            Mostrar cerrados
          </label>
        </div>

        {grupos.length === 0 ? (
          <Vacio
            titulo="No queda nada abierto"
            texto="Todos los compromisos están cumplidos."
            icono={<CheckCircle2 size={32} />}
          />
        ) : (
          <div className="space-y-6">
            {grupos.map(([clave, items]) => (
              <div key={clave}>
                <div className="mb-2 flex items-center gap-3">
                  {agrupar === 'responsable' && <Avatar nombre={clave} tam="sm" />}
                  <h3 className="display text-lg">{clave}</h3>
                  <span className="font-mono text-[10px] text-smoke-2">{items.length}</span>
                  {items.some((c) => estaVencido(c)) && (
                    <Chip tono="signal">
                      {items.filter((c) => estaVencido(c)).length} vencidos
                    </Chip>
                  )}
                  <div className="h-px flex-1 bg-line" />
                </div>

                <ul className="card divide-y divide-line">
                  {items.map((c) => (
                    <li key={c.id} className="p-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <span
                          className="mt-1 h-8 w-0.5 shrink-0"
                          style={{ background: IMPORTANCIA[c.importancia].hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={cx(
                              'text-sm leading-snug',
                              c.estado === 'hecho' && 'text-smoke line-through',
                            )}
                          >
                            {c.accion}
                          </div>
                          {c.detalle && (
                            <p className="mt-1 text-xs text-smoke">{c.detalle}</p>
                          )}
                          {c.avance && (
                            <p className="mt-1 border-l border-line-2 pl-2 text-xs text-smoke-2">
                              {c.avance}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-smoke-2">
                            {agrupar !== 'responsable' && (
                              <span>{nombreDe(estado, c.responsableId)}</span>
                            )}
                            <span className={estaVencido(c) ? 'text-signal' : ''}>
                              {estaVencido(c) && <AlertTriangle size={9} className="mr-1 inline" />}
                              {estaVencido(c) ? 'Venció ' : 'Vence '}
                              {fechaCorta(c.fechaLimite)}
                            </span>
                            <span>Abierto {relativo(c.creadoEn)}</span>
                            {agrupar !== 'reunion' && (
                              <Link
                                to={`/reuniones/${c.reunionId}`}
                                className="truncate transition-colors hover:text-bone"
                              >
                                {estado.reuniones.find((r) => r.id === c.reunionId)?.titulo}
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-1">
                          {COLUMNAS_KANBAN.map((s) => (
                            <BotonEstado
                              key={s}
                              activo={c.estado === s}
                              estado={s}
                              onClick={() => moverCompromiso(c.id, s)}
                            />
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link to="/compromisos">
            <Boton>Ver como tablero</Boton>
          </Link>
        </div>
      </Seccion>
    </div>
  )
}

function BotonEstado({
  estado,
  activo,
  onClick,
}: {
  estado: EstadoCompromiso
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={ESTADO_COMPROMISO[estado].nombre}
      className={
        activo
          ? 'border border-bone bg-bone px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink'
          : 'border border-line-2 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-smoke transition-colors hover:border-smoke hover:text-bone'
      }
    >
      {ESTADO_COMPROMISO[estado].nombre}
    </button>
  )
}

function etiquetaVencimiento(c: Compromiso): string {
  if (c.estado === 'hecho') return 'Cerrados'
  if (!c.fechaLimite) return 'Sin fecha'
  const ms = new Date(c.fechaLimite).getTime() - Date.now()
  if (ms < 0) return 'Vencidos'
  if (ms < 7 * 86400000) return 'Esta semana'
  if (ms < 30 * 86400000) return 'Este mes'
  return 'Más adelante'
}
