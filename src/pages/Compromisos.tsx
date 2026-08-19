import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  AlertTriangle,
  Download,
  GripVertical,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  cx,
  estaVencido,
  fechaCorta,
  integrantes,
  nombreDe,
  relativo,
  rolEnSala,
  sala,
  venceProximo,
} from '../lib/utils'
import {
  COLUMNAS_KANBAN,
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  type Compromiso,
  type Estado,
  type EstadoCompromiso,
  type Importancia,
} from '../types'
import { Boton, Chip, Confirmar, Seccion, SelectorVista, Vacio } from '../components/ui'
import {
  BarraFiltros,
  Buscador,
  FiltroBoton,
  FiltroFecha,
  FiltroSala,
  FiltroSelect,
  enRango,
} from '../components/Filtros'
import { useFiltros } from '../store/Filtros'
import { generarPendientesPDF } from '../lib/pdf'
import ModalCompromiso from '../components/reunion/ModalCompromiso'

/* ─────────────────────────────────────────────────────────────
   Tareas: todo lo que hay por hacer, en un solo lugar.

   Tablero y lista son dos maneras de mirar el mismo conjunto: el
   tablero sirve para mover cosas de estado, la lista para repasar
   por responsable, por reunión o por vencimiento.

   Quien no organiza ve solamente lo suyo: "acá no debería existir
   el filtro de todos los responsables; solo veo las mías". El
   filtro por persona aparece únicamente para quien conduce el
   equipo, y ahora sala por sala: puedo conducir una y ser uno más
   en otra.

   Trae todas mis salas juntas. El filtro de fecha arranca sin
   recorte a propósito: una tarea vencida tiene fecha vieja, y
   esconder justo lo atrasado sería lo peor que puede hacer esta
   pantalla.
   ───────────────────────────────────────────────────────────── */

type Vista = 'tablero' | 'lista'
type Agrupacion = 'responsable' | 'reunion' | 'vencimiento'

const CLAVE_VISTA = 'harvey-os:vista-compromisos'

const AGRUPACIONES: { valor: Agrupacion; texto: string }[] = [
  { valor: 'responsable', texto: 'Responsable' },
  { valor: 'reunion', texto: 'Reunión' },
  { valor: 'vencimiento', texto: 'Vencimiento' },
]

export default function Compromisos() {
  const {
    estado,
    yo,
    moverCompromiso,
    borrarCompromiso,
    compromisosVisibles,
    puedeOrganizar,
    misSalas,
    salasDondeSoyDelEquipo,
  } = useApp()

  // Las métricas del panel entran acá con el filtro ya puesto.
  const [params] = useSearchParams()
  const filtroInicial = params.get('filtro')

  const [vista, setVista] = useState<Vista>(
    () => (localStorage.getItem(CLAVE_VISTA) as Vista) || 'tablero',
  )
  const [agrupar, setAgrupar] = useState<Agrupacion>('responsable')
  /*
   * Se abre con lo propio, siempre: "Mis tareas" tiene que ser mis
   * tareas. El socio pasa a ver las del equipo con el interruptor de
   * arriba; el miembro no tiene nada que cambiar.
   */
  const [responsable, setResponsable] = useState<string>(yo?.id ?? 'todos')
  const [importancia, setImportancia] = useState<Importancia | 'todas'>('todas')
  const [soloVencidas, setSoloVencidas] = useState(filtroInicial === 'vencidos')
  /* Los filtros son de toda la app: lo que ponés acá sigue puesto allá. */
  const { sala: salaFiltro, elegirSala: setSalaFiltro, rango, elegirRango: setRango } = useFiltros()
  const [incluirHechos, setIncluirHechos] = useState(filtroInicial !== 'abiertos')
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Compromiso | undefined>()
  const [porBorrar, setPorBorrar] = useState<Compromiso | undefined>()

  /*
   * Quién puede borrar una tarea: quien organiza esa sala, o quien la
   * tiene a su nombre. Es la misma condición que la política
   * `compromisos_borrar` de la base —si acá se ofreciera de más, el
   * botón fallaría con un error de permisos incomprensible—.
   */
  const puedoBorrar = (c: Compromiso) =>
    yo?.alcance === 'superadmin' ||
    rolEnSala(estado, c.salaId, yo?.id) === 'organizador' ||
    c.responsableId === yo?.id
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
    setSoloVencidas(filtroInicial === 'vencidos')
    if (filtroInicial === 'semana') setRango({ periodo: 'proximaSemana' })
    setIncluirHechos(filtroInicial !== 'abiertos')
    if (filtroInicial === 'equipo') setResponsable('todos')
    else if (yo) setResponsable(yo.id)
    // `setRango` no va en las dependencias: cambia con el rango y
    // volvería a pisar lo que el usuario acaba de elegir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroInicial, yo])

  /* El filtro por persona ofrece a todos los de las salas que se miran. */
  const gente = useMemo(() => {
    const salas = salaFiltro === 'todas' ? misSalas.map((s) => s.id) : [salaFiltro]
    const vistos = new Map<string, (typeof estado.usuarios)[number]>()
    for (const sId of salas) for (const u of integrantes(estado, sId)) vistos.set(u.id, u)
    return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [estado, misSalas, salaFiltro])

  const deLasSalas = useMemo(
    () =>
      salaFiltro === 'todas'
        ? compromisosVisibles
        : compromisosVisibles.filter((c) => c.salaId === salaFiltro),
    [compromisosVisibles, salaFiltro],
  )

  const soloMias = responsable === yo?.id
  const propias = deLasSalas.filter((c) => c.responsableId === yo?.id)
  /* El alcance de las cifras acompaña a lo que se está mirando. */
  const alcance = soloMias ? propias : deLasSalas

  /*
   * El período es el mismo de toda la app, pero acá se compara contra
   * el vencimiento, y eso tiene una vuelta: una tarea vencida tiene la
   * fecha en el pasado, así que "de hoy en adelante" la escondería.
   * Justo lo atrasado, que es lo primero que uno quiere ver.
   *
   * Así que mirando hacia adelante, lo vencido y sin cerrar entra
   * igual: "lo que tengo por delante" incluye lo que se pasó y sigue
   * abierto.
   */
  const entraPorFecha = useCallback(
    (c: Compromiso) => {
      const haciaAdelante = ['adelante', 'proximaSemana', 'proximoMes'].includes(rango.periodo)
      if (haciaAdelante && estaVencido(c)) return true
      return enRango(c.fechaLimite, rango)
    },
    [rango],
  )

  const filtrados = useMemo(
    () =>
      deLasSalas.filter((c) => {
        if (responsable !== 'todos' && c.responsableId !== responsable) return false
        if (importancia !== 'todas' && c.importancia !== importancia) return false
        if (soloVencidas && !estaVencido(c)) return false
        if (!entraPorFecha(c)) return false
        if (!incluirHechos && c.estado === 'hecho') return false
        if (busqueda && !c.accion.toLowerCase().includes(busqueda.toLowerCase())) return false
        return true
      }),
    [deLasSalas, responsable, importancia, soloVencidas, entraPorFecha, incluirHechos, busqueda],
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



  return (
    <div className="space-y-6">
      <Seccion
        titulo="Tareas"
        principal
        acciones={
          <>
            <SelectorVista
              valor={vista}
              onChange={cambiarVista}
              opciones={[
                { valor: 'tablero', icono: LayoutGrid, texto: 'Tablero' },
                { valor: 'lista', icono: List, texto: 'Lista' },
              ]}
            />
            {salasDondeSoyDelEquipo.length > 0 && (
              <Boton variante="destacado" onClick={() => setCreando(true)}>
                <Plus size={13} /> Nueva tarea
              </Boton>
            )}
          </>
        }
      >
        {/* ── Los filtros, todos en una sola fila ──
            Antes había dos: la de sala y fecha, chiquita, y abajo otra
            con los de acá, escritos a mano y del doble de alto. Filtrar
            es una sola cosa y se ve como una sola cosa. */}
        <BarraFiltros>
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar una tarea…" />
          <FiltroSala valor={salaFiltro} onChange={setSalaFiltro} salas={misSalas} />
          <FiltroFecha valor={rango} onChange={setRango} />

          {/* Por persona, sólo cuando se están mirando las del equipo. */}
          {puedeOrganizar && !soloMias && (
            <FiltroSelect
              valor={responsable}
              onChange={setResponsable}
              etiqueta="Filtrar por responsable"
              neutro="todos"
              opciones={[
                { valor: 'todos', texto: 'Todos los responsables' },
                ...gente.map((u) => ({ valor: u.id, texto: u.nombre })),
              ]}
            />
          )}

          <FiltroSelect
            valor={importancia}
            onChange={setImportancia}
            etiqueta="Filtrar por importancia"
            neutro="todas"
            opciones={[
              { valor: 'todas' as const, texto: 'Toda importancia' },
              ...(Object.keys(IMPORTANCIA) as Importancia[]).map((k) => ({
                valor: k,
                texto: IMPORTANCIA[k].nombre,
              })),
            ]}
          />

          {/* Vencida no es un período: es una fecha que ya pasó y sigue
              abierta. Por eso queda aparte del filtro de fechas. */}
          <FiltroBoton activo={soloVencidas} onClick={() => setSoloVencidas((v) => !v)}>
            Vencidas
          </FiltroBoton>
          {/* En negativo a propósito: en toda la barra, tinta quiere
              decir "estás filtrando". Por defecto se ven todas. */}
          <FiltroBoton activo={!incluirHechos} onClick={() => setIncluirHechos((v) => !v)}>
            Ocultar cerradas
          </FiltroBoton>

          {/* Sólo tiene sentido cuando hay grupos que armar. */}
          {vista === 'lista' && (
            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
              <span className="text-meta text-tenue">Agrupar por</span>
              {AGRUPACIONES.map(({ valor, texto }) => (
                <FiltroBoton
                  key={valor}
                  activo={agrupar === valor}
                  onClick={() => setAgrupar(valor)}
                >
                  {texto}
                </FiltroBoton>
              ))}
            </div>
          )}
        </BarraFiltros>

        {/* ── Mías / del equipo ──
            Sólo para el socio: el miembro ve lo suyo y no hay nada que
            elegir. No es un filtro más, es de qué se está hablando, y
            por eso queda afuera de la fila de arriba. */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {puedeOrganizar && yo && (
            <div className="flex border border-borde2">
              {(
                [
                  [yo.id, 'Mías'],
                  ['todos', 'Del equipo'],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  onClick={() => setResponsable(valor)}
                  className={cx(
                    'px-3 py-1 text-meta font-semibold leading-5 transition-colors',
                    responsable === valor
                      ? 'bg-tinta text-fondo'
                      : 'bg-panel text-suave hover:text-tinta',
                  )}
                >
                  {texto}
                </button>
              ))}
            </div>
          )}
          <span className="text-meta text-suave">
            {alcance.filter((c) => c.estado !== 'hecho').length}{' '}
            {alcance.filter((c) => c.estado !== 'hecho').length === 1 ? 'abierta' : 'abiertas'}
            {alcance.filter((c) => estaVencido(c)).length > 0 && (
              <span className="text-alerta">
                {' · '}
                {alcance.filter((c) => estaVencido(c)).length} vencidas
              </span>
            )}
            {alcance.filter((c) => venceProximo(c)).length > 0 && (
              <span className="text-amber">
                {' · '}
                {alcance.filter((c) => venceProximo(c)).length} vencen esta semana
              </span>
            )}
          </span>
        </div>

        {vista === 'tablero' ? (
          <>
            <DndContext sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar}>
              <div className="grid gap-3 md:grid-cols-3">
                {COLUMNAS_KANBAN.map((col) => (
                  <Columna
                    key={col}
                    estado={col}
                    compromisos={filtrados.filter((c) => c.estado === col)}
                    onEditar={setEditando}
                    onBorrar={(c) => (puedoBorrar(c) ? setPorBorrar(c) : undefined)}
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

            <p className="mt-4 text-meta text-tenue">
              <span className="hidden md:inline">
                Arrastrá las tarjetas entre columnas para cambiar el estado
              </span>
              <span className="md:hidden">
                Tocá el estado en cada tarjeta para moverla, o arrastrala
              </span>
            </p>
          </>
        ) : (
          <VistaLista
            lista={filtrados}
            agrupar={agrupar}
            onEditar={setEditando}
            onBorrar={setPorBorrar}
            puedoBorrar={puedoBorrar}
          />
        )}
      </Seccion>

      {/* Nace suelta: la sala se elige en el formulario, no se adivina. */}
      <ModalCompromiso abierto={creando} onCerrar={() => setCreando(false)} />
      <ModalCompromiso
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        reunionId={editando?.reunionId ?? ''}
        compromiso={editando}
      />
      <Confirmar
        abierto={!!porBorrar}
        titulo="Eliminar tarea"
        texto={
          porBorrar
            ? `Se elimina “${porBorrar.accion}”. Si venía de una minuta ya enviada, ahí sigue figurando.`
            : ''
        }
        textoBoton="Eliminar"
        peligro
        onCancelar={() => setPorBorrar(undefined)}
        onConfirmar={() => {
          if (porBorrar) void borrarCompromiso(porBorrar.id)
          setPorBorrar(undefined)
        }}
      />
    </div>
  )
}

/**
 * Cómo titular un listado que puede venir de varias salas: si son
 * todas de la misma, se nombra; si no, se dice cuántas.
 */
function nombreDeLasSalas(estado: Estado, items: Compromiso[]) {
  const ids = [...new Set(items.map((c) => c.salaId))]
  if (ids.length === 1) return sala(estado, ids[0])?.nombre
  return `${ids.length} salas`
}

/* ── Vista de lista, agrupada ─────────────────────────────── */

function VistaLista({
  lista,
  agrupar,
  onEditar,
  onBorrar,
  puedoBorrar,
}: {
  lista: Compromiso[]
  agrupar: Agrupacion
  onEditar: (c: Compromiso) => void
  onBorrar?: (c: Compromiso) => void
  puedoBorrar: (c: Compromiso) => boolean
}) {
  const { estado, moverCompromiso, puedeOrganizar } = useApp()

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
    return <Vacio titulo="No hay nada acá" texto="Ninguna tarea coincide con los filtros." />
  }

  return (
    <div className="space-y-6">
      {grupos.map(([clave, items]) => (
        <div key={clave}>
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-sm">{clave}</h3>
            <span className="text-meta text-tenue">{items.length}</span>
            {items.some((c) => estaVencido(c)) && (
              <Chip tono="alerta">{items.filter((c) => estaVencido(c)).length} vencidos</Chip>
            )}
            <div className="h-px flex-1 bg-borde" />
            {/* Listado suelto para mandarle a cada uno lo suyo: hay
                gente que no abre el correo y sí el WhatsApp. */}
            {agrupar === 'responsable' && puedeOrganizar && (
              <button
                onClick={() =>
                  generarPendientesPDF(
                    estado,
                    items[0].responsableId,
                    lista,
                    nombreDeLasSalas(estado, items),
                  )
                }
                title={`Descargar los pendientes de ${clave}`}
                className="flex shrink-0 items-center gap-1.5 border border-borde2 bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-suave transition-colors hover:border-signal hover:text-signal"
              >
                <Download size={11} /> PDF
              </button>
            )}
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
                    {c.detalle && <p className="mt-1 text-meta text-suave">{c.detalle}</p>}
                    {c.avance && (
                      <p className="mt-1 border-l border-borde2 pl-2 text-meta text-tenue">
                        {c.avance}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-tenue">
                      <span className="font-semibold text-suave">{sala(estado, c.salaId)?.nombre}</span>
                      {agrupar !== 'responsable' && (
                        <span>{nombreDe(estado, c.responsableId)}</span>
                      )}
                      <span className={estaVencido(c) ? 'text-alerta' : ''}>
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

                  <div className="grid w-full shrink-0 grid-cols-3 gap-1 sm:flex sm:w-auto sm:flex-wrap">
                    {COLUMNAS_KANBAN.map((s) => (
                      <button
                        key={s}
                        onClick={() => moverCompromiso(c.id, s)}
                        title={ESTADO_COMPROMISO[s].nombre}
                        className={
                          c.estado === s
                            ? 'truncate border border-tinta bg-tinta px-2 py-1.5 text-[11px] font-semibold text-fondo'
                            : 'truncate border border-borde2 bg-panel px-2 py-1.5 text-[11px] font-semibold text-suave transition-colors hover:border-suave hover:text-tinta'
                        }
                      >
                        {ESTADO_COMPROMISO[s].nombre}
                      </button>
                    ))}
                    <button
                      onClick={() => onEditar(c)}
                      className="col-span-3 border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-tinta hover:text-tinta sm:col-auto"
                      aria-label={`Editar «${c.accion}»`}
                    >
                      <Pencil size={11} className="mx-auto" />
                    </button>
                    {onBorrar && puedoBorrar(c) && (
                      <button
                        onClick={() => onBorrar(c)}
                        className="col-span-3 border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-alerta hover:text-alerta sm:col-auto"
                        aria-label={`Eliminar «${c.accion}»`}
                      >
                        <Trash2 size={11} className="mx-auto" />
                      </button>
                    )}
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
  onBorrar,
}: {
  estado: EstadoCompromiso
  compromisos: Compromiso[]
  onEditar: (c: Compromiso) => void
  onBorrar: (c: Compromiso) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col })
  const meta = ESTADO_COMPROMISO[col]

  return (
    <div
      ref={setNodeRef}
      className={cx(
        'flex flex-col border transition-colors md:min-h-[240px]',
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
        <span className="text-meta text-tenue">{compromisos.length}</span>
      </div>

      <div className="flex-1 space-y-2 p-2">
        {compromisos.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-borde2 md:h-24">
            Vacío
          </div>
        ) : (
          compromisos
            .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))
            .map((c) => (
              <Tarjeta
                key={c.id}
                compromiso={c}
                onEditar={() => onEditar(c)}
                onBorrar={() => onBorrar(c)}
              />
            ))
        )}
      </div>
    </div>
  )
}

/* ── Tarjeta del tablero ──────────────────────────────────── */

function Tarjeta({
  compromiso: c,
  onEditar,
  onBorrar,
  superpuesta,
}: {
  compromiso: Compromiso
  onEditar: () => void
  /* Sin permiso no llega, y entonces el tacho no se dibuja. */
  onBorrar?: () => void
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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cx(
        'group border bg-panel p-3 transition-colors',
        isDragging ? 'opacity-30' : 'hover:border-borde2',
        vencido ? 'border-alerta/50' : 'border-borde',
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
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-tenue">
            {sala(estado, c.salaId)?.nombre}
          </div>
          <div className="mt-0.5 text-xs leading-snug">{c.accion}</div>
          {c.avance && <div className="mt-1 text-meta text-tenue">{c.avance}</div>}
        </div>
        {/* En táctil no hay hover: el lápiz queda siempre visible. */}
        <button
          onClick={onEditar}
          className="shrink-0 p-1 text-borde2 transition-all hover:text-tinta xl:opacity-0 xl:group-hover:opacity-100"
          aria-label="Editar"
        >
          <Pencil size={11} />
        </button>
        {onBorrar && (
          <button
            onClick={onBorrar}
            className="shrink-0 p-1 text-borde2 transition-all hover:text-alerta xl:opacity-0 xl:group-hover:opacity-100"
            aria-label="Eliminar"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-[26px]">
        <span className="text-[10px] text-suave">{nombreDe(estado, c.responsableId)}</span>
        {c.fechaLimite && (
          <span
            className={cx(
              'ml-auto flex items-center gap-1 text-[10px]',
              vencido ? 'text-alerta' : proximo ? 'text-amber' : 'text-tenue',
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
          className="mt-2 block truncate pl-[26px] text-meta text-borde2 transition-colors hover:text-suave"
        >
          {reunion.titulo}
        </Link>
      )}

      {/*
        Con las columnas apiladas, arrastrar entre ellas no es viable.
        En pantalla chica la tarjeta trae sus propios botones de estado.
      */}
      {!superpuesta && (
        <div className="mt-2.5 flex flex-wrap gap-1 border-t border-borde pt-2.5 md:hidden">
          {COLUMNAS_KANBAN.filter((s) => s !== c.estado).map((s) => (
            <button
              key={s}
              onClick={() => moverCompromiso(c.id, s)}
              className="border border-borde2 px-2 py-1 text-[11px] font-semibold text-suave transition-colors hover:border-suave hover:text-tinta"
            >
              → {ESTADO_COMPROMISO[s].nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
