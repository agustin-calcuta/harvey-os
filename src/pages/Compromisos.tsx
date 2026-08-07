import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, GripVertical, LayoutGrid, List, Pencil, Plus } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { cx, estaVencido, fechaCorta, nombreDe, relativo, venceProximo } from '../lib/utils'
import {
  COLUMNAS_KANBAN,
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  type Compromiso,
  type EstadoCompromiso,
  type Importancia,
} from '../types'
import { Avatar, Boton, Chip, Etiqueta, Metrica, Seccion, Vacio } from '../components/ui'
import ModalCompromiso from '../components/reunion/ModalCompromiso'

/* ─────────────────────────────────────────────────────────────
   Todo lo que hay por hacer, en un solo lugar.

   Tablero y lista son dos maneras de mirar el mismo conjunto: el
   tablero sirve para mover cosas de estado, la lista para repasar
   por responsable, por reunión o por vencimiento. Tenerlas en
   secciones separadas obligaba a adivinar en cuál buscar.
   ───────────────────────────────────────────────────────────── */

type Vista = 'tablero' | 'lista'
type Agrupacion = 'responsable' | 'reunion' | 'vencimiento'
/** Recorte por plazo. Los tres son excluyentes entre sí. */
type Plazo = 'todos' | 'vencidos' | 'semana'

const CLAVE_VISTA = 'harvey-os:vista-compromisos'

const AGRUPACIONES: { valor: Agrupacion; texto: string }[] = [
  { valor: 'responsable', texto: 'Responsable' },
  { valor: 'reunion', texto: 'Reunión' },
  { valor: 'vencimiento', texto: 'Vencimiento' },
]

export default function Compromisos() {
  const { estado, yo, moverCompromiso } = useApp()

  // Las métricas del panel entran acá con el filtro ya puesto.
  const [params] = useSearchParams()
  const filtroInicial = params.get('filtro')

  const [vista, setVista] = useState<Vista>(
    () => (localStorage.getItem(CLAVE_VISTA) as Vista) || 'tablero',
  )
  const [agrupar, setAgrupar] = useState<Agrupacion>('responsable')
  const [responsable, setResponsable] = useState<string>(
    filtroInicial === 'mios' && yo ? yo.id : 'todos',
  )
  const [importancia, setImportancia] = useState<Importancia | 'todas'>('todas')
  const [plazo, setPlazo] = useState<Plazo>(
    filtroInicial === 'vencidos' ? 'vencidos' : filtroInicial === 'semana' ? 'semana' : 'todos',
  )
  const [incluirHechos, setIncluirHechos] = useState(filtroInicial !== 'abiertos')
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Compromiso | undefined>()
  const [arrastrando, setArrastrando] = useState<Compromiso | undefined>()

  const cambiarVista = (v: Vista) => {
    setVista(v)
    localStorage.setItem(CLAVE_VISTA, v)
  }

  /*
   * El estado inicial sólo corre al montar. Si ya estás en la pantalla y
   * llega otro `?filtro=`, hay que reaplicarlo a mano.
   */
  useEffect(() => {
    setPlazo(
      filtroInicial === 'vencidos' ? 'vencidos' : filtroInicial === 'semana' ? 'semana' : 'todos',
    )
    setIncluirHechos(filtroInicial !== 'abiertos')
    if (filtroInicial === 'mios' && yo) setResponsable(yo.id)
  }, [filtroInicial, yo])

  const filtrados = useMemo(
    () =>
      estado.compromisos.filter((c) => {
        if (responsable !== 'todos' && c.responsableId !== responsable) return false
        if (importancia !== 'todas' && c.importancia !== importancia) return false
        if (plazo === 'vencidos' && !estaVencido(c)) return false
        if (plazo === 'semana' && !venceProximo(c)) return false
        if (!incluirHechos && c.estado === 'hecho') return false
        if (busqueda && !c.accion.toLowerCase().includes(busqueda.toLowerCase())) return false
        return true
      }),
    [estado.compromisos, responsable, importancia, plazo, incluirHechos, busqueda],
  )

  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const alEmpezar = (e: DragStartEvent) =>
    setArrastrando(estado.compromisos.find((c) => c.id === e.active.id))

  const alSoltar = (e: DragEndEvent) => {
    setArrastrando(undefined)
    const destino = e.over?.id
    if (!destino) return
    const nuevoEstado = String(destino) as EstadoCompromiso
    if (!COLUMNAS_KANBAN.includes(nuevoEstado)) return
    void moverCompromiso(String(e.active.id), nuevoEstado)
  }

  const vencidos = filtrados.filter((c) => estaVencido(c))
  const mios = filtrados.filter((c) => c.responsableId === yo?.id && c.estado !== 'hecho')

  const botonFiltro = (activo: boolean) =>
    activo
      ? 'border border-tinta bg-tinta px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fondo'
      : 'border border-borde2 bg-panel px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:border-suave hover:text-tinta'

  return (
    <div className="space-y-6">
      <Seccion
        kicker="Todo lo que hay por hacer"
        titulo="Compromisos"
        acciones={
          <>
            <div className="flex border border-borde2">
              {(
                [
                  ['tablero', LayoutGrid, 'Tablero'],
                  ['lista', List, 'Lista'],
                ] as const
              ).map(([v, Icono, texto]) => (
                <button
                  key={v}
                  onClick={() => cambiarVista(v)}
                  className={cx(
                    'flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors',
                    vista === v ? 'bg-tinta text-fondo' : 'bg-panel text-suave hover:text-tinta',
                  )}
                >
                  <Icono size={12} />
                  {texto}
                </button>
              ))}
            </div>
            <Boton variante="solido" onClick={() => setCreando(true)}>
              <Plus size={13} /> Nuevo compromiso
            </Boton>
          </>
        }
      >
        {/* Las cifras son de todo el equipo y sirven de atajo al filtro. */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metrica
            valor={estado.compromisos.filter((c) => c.estado !== 'hecho').length}
            etiqueta="Abiertos del equipo"
            a="?filtro=abiertos"
          />
          <Metrica valor={mios.length} etiqueta="A tu nombre" a="?filtro=mios" />
          <Metrica
            valor={estado.compromisos.filter((c) => estaVencido(c)).length}
            etiqueta="Vencidos del equipo"
            tono={vencidos.length ? 'signal' : undefined}
            a="?filtro=vencidos"
          />
          <Metrica
            valor={estado.compromisos.filter((c) => venceProximo(c)).length}
            etiqueta="Vencen esta semana"
            tono="amber"
            a="?filtro=semana"
          />
        </div>

        {/* ── Filtros, comunes a las dos vistas ── */}
        <div className="mb-5 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <input
            className="col-span-2 sm:w-48"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select value={responsable} onChange={(e) => setResponsable(e.target.value)}>
            <option value="todos">Todos los responsables</option>
            {estado.usuarios
              .filter((u) => u.activo)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
          </select>
          <select
            value={importancia}
            onChange={(e) => setImportancia(e.target.value as Importancia | 'todas')}
          >
            <option value="todas">Toda importancia</option>
            {(Object.keys(IMPORTANCIA) as Importancia[]).map((k) => (
              <option key={k} value={k}>
                {IMPORTANCIA[k].nombre}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPlazo((p) => (p === 'vencidos' ? 'todos' : 'vencidos'))}
            className={
              plazo === 'vencidos'
                ? 'border border-signal bg-signal px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white'
                : 'border border-borde2 bg-panel px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:border-signal hover:text-signal'
            }
          >
            Vencidos
          </button>
          <button
            onClick={() => setPlazo((p) => (p === 'semana' ? 'todos' : 'semana'))}
            className={
              plazo === 'semana'
                ? 'border border-amber bg-amber px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white'
                : 'border border-borde2 bg-panel px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:border-amber hover:text-amber'
            }
          >
            Vencen esta semana
          </button>
          {yo && (
            <button
              onClick={() => setResponsable(responsable === yo.id ? 'todos' : yo.id)}
              className={botonFiltro(responsable === yo.id)}
            >
              Sólo míos
            </button>
          )}
          <label className="col-span-2 flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave sm:col-auto">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[#C0392B]"
              checked={incluirHechos}
              onChange={(e) => setIncluirHechos(e.target.checked)}
            />
            Mostrar cerrados
          </label>

          {/* Sólo tiene sentido cuando hay grupos que armar */}
          {vista === 'lista' && (
            <>
              <Etiqueta className="col-span-2 sm:ml-auto sm:col-auto">Agrupar por</Etiqueta>
              {AGRUPACIONES.map(({ valor, texto }) => (
                <button
                  key={valor}
                  onClick={() => setAgrupar(valor)}
                  className={botonFiltro(agrupar === valor)}
                >
                  {texto}
                </button>
              ))}
            </>
          )}
        </div>

        {vista === 'tablero' ? (
          <>
            <DndContext sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {COLUMNAS_KANBAN.map((col) => (
                  <Columna
                    key={col}
                    estado={col}
                    compromisos={filtrados.filter((c) => c.estado === col)}
                    onEditar={setEditando}
                  />
                ))}
              </div>

              <DragOverlay>
                {arrastrando && (
                  <div className="rotate-2 opacity-90">
                    <Tarjeta compromiso={arrastrando} onEditar={() => {}} superpuesta />
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            <p className="mt-4 text-xs text-tenue">
              <span className="hidden xl:inline">
                Arrastrá las tarjetas entre columnas para cambiar el estado
              </span>
              <span className="xl:hidden">
                Tocá el estado en cada tarjeta para moverla, o arrastrala
              </span>
            </p>
          </>
        ) : (
          <VistaLista lista={filtrados} agrupar={agrupar} onEditar={setEditando} />
        )}
      </Seccion>

      <ModalCompromiso
        abierto={creando}
        onCerrar={() => setCreando(false)}
        reunionId={
          estado.reuniones.find((r) => r.estado !== 'cerrada')?.id ?? estado.reuniones[0]?.id ?? ''
        }
      />
      <ModalCompromiso
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        reunionId={editando?.reunionId ?? ''}
        compromiso={editando}
      />
    </div>
  )
}

/* ── Vista de lista, agrupada ─────────────────────────────── */

function VistaLista({
  lista,
  agrupar,
  onEditar,
}: {
  lista: Compromiso[]
  agrupar: Agrupacion
  onEditar: (c: Compromiso) => void
}) {
  const { estado, moverCompromiso } = useApp()

  const grupos = useMemo(() => {
    const m = new Map<string, Compromiso[]>()
    const ordenada = [...lista].sort((a, b) =>
      (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'),
    )
    for (const c of ordenada) {
      let clave: string
      if (agrupar === 'responsable') clave = nombreDe(estado, c.responsableId)
      else if (agrupar === 'reunion')
        clave = estado.reuniones.find((r) => r.id === c.reunionId)?.titulo ?? 'Sin reunión'
      else clave = etiquetaVencimiento(c)
      m.set(clave, [...(m.get(clave) ?? []), c])
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [lista, agrupar, estado])

  if (!grupos.length) {
    return <Vacio titulo="No hay nada acá" texto="Ningún compromiso coincide con los filtros." />
  }

  return (
    <div className="space-y-6">
      {grupos.map(([clave, items]) => (
        <div key={clave}>
          <div className="mb-2 flex items-center gap-3">
            {agrupar === 'responsable' && <Avatar nombre={clave} tam="sm" />}
            <h3 className="display text-lg">{clave}</h3>
            <span className="text-xs text-tenue">{items.length}</span>
            {items.some((c) => estaVencido(c)) && (
              <Chip tono="signal">{items.filter((c) => estaVencido(c)).length} vencidos</Chip>
            )}
            <div className="h-px flex-1 bg-borde" />
          </div>

          <ul className="card divide-y divide-borde">
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
                        c.estado === 'hecho' && 'text-suave line-through',
                      )}
                    >
                      {c.accion}
                    </div>
                    {c.detalle && <p className="mt-1 text-xs text-suave">{c.detalle}</p>}
                    {c.avance && (
                      <p className="mt-1 border-l border-borde2 pl-2 text-xs text-tenue">
                        {c.avance}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tenue">
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
                          className="truncate transition-colors hover:text-tinta"
                        >
                          {estado.reuniones.find((r) => r.id === c.reunionId)?.titulo}
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="grid w-full shrink-0 grid-cols-4 gap-1 sm:flex sm:w-auto sm:flex-wrap">
                    {COLUMNAS_KANBAN.map((s) => (
                      <button
                        key={s}
                        onClick={() => moverCompromiso(c.id, s)}
                        title={ESTADO_COMPROMISO[s].nombre}
                        className={
                          c.estado === s
                            ? 'truncate border border-tinta bg-tinta px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-fondo'
                            : 'truncate border border-borde2 bg-panel px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-suave transition-colors hover:border-suave hover:text-tinta'
                        }
                      >
                        {ESTADO_COMPROMISO[s].nombre}
                      </button>
                    ))}
                    <button
                      onClick={() => onEditar(c)}
                      className="col-span-4 border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-tinta hover:text-tinta sm:col-auto"
                      aria-label="Editar"
                    >
                      <Pencil size={11} className="mx-auto" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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

/* ── Columna del tablero ──────────────────────────────────── */

function Columna({
  estado: col,
  compromisos,
  onEditar,
}: {
  estado: EstadoCompromiso
  compromisos: Compromiso[]
  onEditar: (c: Compromiso) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col })
  const meta = ESTADO_COMPROMISO[col]

  return (
    <div
      ref={setNodeRef}
      className={cx(
        'flex flex-col border transition-colors xl:min-h-[240px]',
        isOver ? 'border-signal bg-signal/5' : 'border-borde bg-hueco',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-borde p-3">
        <div className="flex items-center gap-2">
          <span className={cx('h-2 w-2', meta.bg, 'border', meta.border)} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
            {meta.nombre}
          </span>
        </div>
        <span className="text-[10px] text-tenue">{compromisos.length}</span>
      </div>

      <div className="flex-1 space-y-2 p-2">
        {compromisos.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-borde2 xl:h-24">
            Vacío
          </div>
        ) : (
          compromisos
            .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))
            .map((c) => <Tarjeta key={c.id} compromiso={c} onEditar={() => onEditar(c)} />)
        )}
      </div>
    </div>
  )
}

/* ── Tarjeta del tablero ──────────────────────────────────── */

function Tarjeta({
  compromiso: c,
  onEditar,
  superpuesta,
}: {
  compromiso: Compromiso
  onEditar: () => void
  superpuesta?: boolean
}) {
  const { estado, moverCompromiso } = useApp()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: c.id,
    disabled: superpuesta,
  })

  const vencido = estaVencido(c)
  const proximo = venceProximo(c)
  const reunion = estado.reuniones.find((r) => r.id === c.reunionId)
  const responsable = estado.usuarios.find((u) => u.id === c.responsableId)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cx(
        'group border bg-panel p-3 transition-colors',
        isDragging ? 'opacity-30' : 'hover:border-borde2',
        vencido ? 'border-signal/50' : 'border-borde',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab text-borde2 transition-colors hover:text-tinta active:cursor-grabbing"
          aria-label="Mover"
        >
          <GripVertical size={13} />
        </button>
        <span
          className="mt-0.5 h-4 w-0.5 shrink-0"
          style={{ background: IMPORTANCIA[c.importancia].hex }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs leading-snug">{c.accion}</div>
          {c.avance && <div className="mt-1 text-[11px] text-tenue">{c.avance}</div>}
        </div>
        {/* En táctil no hay hover: el lápiz queda siempre visible. */}
        <button
          onClick={onEditar}
          className="shrink-0 p-1 text-borde2 transition-all hover:text-tinta xl:opacity-0 xl:group-hover:opacity-100"
          aria-label="Editar"
        >
          <Pencil size={11} />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-[26px]">
        <Avatar nombre={responsable?.nombre ?? '?'} url={responsable?.avatarUrl} tam="xs" />
        <span className="text-[10px] text-suave">{nombreDe(estado, c.responsableId)}</span>
        {c.fechaLimite && (
          <span
            className={cx(
              'ml-auto flex items-center gap-1 text-[10px]',
              vencido ? 'text-signal' : proximo ? 'text-amber' : 'text-tenue',
            )}
            title={fechaCorta(c.fechaLimite)}
          >
            {vencido && <AlertTriangle size={9} />}
            {c.estado === 'hecho' ? fechaCorta(c.fechaLimite) : relativo(c.fechaLimite)}
          </span>
        )}
      </div>

      {reunion && (
        <Link
          to={`/reuniones/${reunion.id}`}
          className="mt-2 block truncate pl-[26px] text-[9px] font-semibold uppercase tracking-[0.12em] text-borde2 transition-colors hover:text-suave"
        >
          {reunion.titulo}
        </Link>
      )}

      {/*
        Con las columnas apiladas, arrastrar entre ellas no es viable.
        Debajo de xl la tarjeta trae sus propios botones de estado.
      */}
      {!superpuesta && (
        <div className="mt-2.5 flex flex-wrap gap-1 border-t border-borde pt-2.5 xl:hidden">
          {COLUMNAS_KANBAN.filter((s) => s !== c.estado).map((s) => (
            <button
              key={s}
              onClick={() => moverCompromiso(c.id, s)}
              className="border border-borde2 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-suave transition-colors hover:border-suave hover:text-tinta"
            >
              → {ESTADO_COMPROMISO[s].nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
