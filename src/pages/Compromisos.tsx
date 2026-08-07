import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { AlertTriangle, GripVertical, Pencil, Plus } from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  cx,
  estaVencido,
  fechaCorta,
  nombreDe,
  relativo,
  venceProximo,
} from '../lib/utils'
import {
  COLUMNAS_KANBAN,
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  type Compromiso,
  type EstadoCompromiso,
  type Importancia,
} from '../types'
import { Avatar, Boton, Metrica, Seccion } from '../components/ui'
import ModalCompromiso from '../components/reunion/ModalCompromiso'

export default function Compromisos() {
  const { estado, yo, moverCompromiso } = useApp()

  const [responsable, setResponsable] = useState<string>('todos')
  const [importancia, setImportancia] = useState<Importancia | 'todas'>('todas')
  const [soloVencidos, setSoloVencidos] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Compromiso | undefined>()
  const [arrastrando, setArrastrando] = useState<Compromiso | undefined>()

  const filtrados = useMemo(
    () =>
      estado.compromisos.filter((c) => {
        if (responsable !== 'todos' && c.responsableId !== responsable) return false
        if (importancia !== 'todas' && c.importancia !== importancia) return false
        if (soloVencidos && !estaVencido(c)) return false
        if (busqueda && !c.accion.toLowerCase().includes(busqueda.toLowerCase())) return false
        return true
      }),
    [estado.compromisos, responsable, importancia, soloVencidos, busqueda],
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

  return (
    <div className="space-y-6">
      <Seccion
        kicker="Seguimiento"
        titulo="Compromisos"
        acciones={
          <Boton variante="solido" onClick={() => setCreando(true)}>
            <Plus size={13} /> Nuevo compromiso
          </Boton>
        }
      >
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metrica valor={filtrados.filter((c) => c.estado !== 'hecho').length} etiqueta="Abiertos" />
          <Metrica valor={mios.length} etiqueta="A tu nombre" />
          <Metrica
            valor={vencidos.length}
            etiqueta="Vencidos"
            tono={vencidos.length ? 'signal' : undefined}
          />
          <Metrica
            valor={filtrados.filter((c) => c.estado === 'hecho').length}
            etiqueta="Cerrados"
            tono="acid"
          />
        </div>

        {/* Filtros */}
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
            onClick={() => setSoloVencidos((v) => !v)}
            className={
              soloVencidos
                ? 'border border-signal bg-signal px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-tinta'
                : 'border border-borde2 px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-suave transition-colors hover:border-signal hover:text-signal'
            }
          >
            Sólo vencidos
          </button>
          {yo && (
            <button
              onClick={() => setResponsable(responsable === yo.id ? 'todos' : yo.id)}
              className={
                responsable === yo.id
                  ? 'border border-tinta bg-tinta px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-fondo'
                  : 'border border-borde2 px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-suave transition-colors hover:border-suave hover:text-tinta'
              }
            >
              Sólo míos
            </button>
          )}
        </div>

        {/* Tablero */}
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

        <p className="mt-4 font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
          <span className="hidden xl:inline">
            Arrastrá las tarjetas entre columnas para cambiar el estado
          </span>
          <span className="xl:hidden">
            Tocá el estado en cada tarjeta para moverla, o arrastrala
          </span>
        </p>
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

/* ── Columna ──────────────────────────────────────────────── */

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
        isOver ? 'border-signal bg-signal/5' : 'border-borde bg-panel',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-borde p-3">
        <div className="flex items-center gap-2">
          <span className={cx('h-2 w-2', meta.bg, 'border', meta.border)} />
          <span className="font-semibold text-[10px] uppercase tracking-[0.14em]">{meta.nombre}</span>
        </div>
        <span className="font-semibold text-[10px] text-tenue">{compromisos.length}</span>
      </div>

      <div className="flex-1 space-y-2 p-2">
        {compromisos.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-center font-semibold text-[10px] uppercase tracking-[0.14em] text-borde2 xl:h-24">
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

/* ── Tarjeta ──────────────────────────────────────────────── */

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
        'group border bg-fondo p-3 transition-colors',
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
              'ml-auto flex items-center gap-1 font-semibold text-[10px]',
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
          className="mt-2 block truncate pl-[26px] font-semibold text-[9px] uppercase tracking-[0.12em] text-borde2 transition-colors hover:text-suave"
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
              className="border border-borde2 px-2 py-1 font-semibold text-[9px] uppercase tracking-[0.1em] text-suave transition-colors hover:border-suave hover:text-tinta"
            >
              → {ESTADO_COMPROMISO[s].nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
