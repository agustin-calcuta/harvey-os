import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  CalendarPlus,
  Columns3,
  GripVertical,
  Inbox,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import ModalTema from '../components/reunion/ModalTema'
import {
  cx,
  fechaCorta,
  hora,
  proximasReuniones,
  relativo,
  reunion,
  sala,
  temarioDe,
  temasAsignados,
  temasSinTratar,
} from '../lib/utils'
import { IMPORTANCIA, type Tema } from '../types'
import {
  Boton,
  Chip,
  ChipImportancia,
  ChipObjetivo,
  Confirmar,
  Modal,
  Seccion,
  SelectorVista,
  Vacio,
  usePantallaAncha,
} from '../components/ui'
import { BarraFiltros, Buscador, FiltroFecha, FiltroSala, enRango } from '../components/Filtros'
import { useFiltros } from '../store/Filtros'

/* ─────────────────────────────────────────────────────────────
   El bloc de notas.

   Dejó de llamarse temario porque nunca lo fue: "en realidad es un
   bloc de notas, donde voy tirando todo lo que se me va ocurriendo
   y lo voy guardando ahí".

   Se mira en tres columnas o en una lista, como Tareas. Las
   columnas son los tres momentos de una nota: la tiré y está ahí,
   la llevé a una reunión y no se habló, o ya está en una agenda.
   ───────────────────────────────────────────────────────────── */

type Vista = 'columnas' | 'lista'
type Grupo = 'borradores' | 'pendientes' | 'asignados'

const CLAVE_VISTA = 'harvey-os:vista-bloc'

const GRUPOS: { clave: Grupo; titulo: string; texto: string }[] = [
  {
    clave: 'borradores',
    titulo: 'Borradores',
    texto: 'Lo que anotaste al pasar. Todavía no fue a ninguna reunión.',
  },
  {
    clave: 'pendientes',
    titulo: 'Pendientes',
    texto: 'Los llevaste a una reunión y no se llegaron a hablar.',
  },
  {
    clave: 'asignados',
    titulo: 'Asignados',
    texto: 'Ya están en la agenda de una reunión que todavía no pasó.',
  },
]

export default function Bloc() {
  const { estado, yo, misSalas, borrarTema, devolverAlTemario } = useApp()
  const [params, setParams] = useSearchParams()

  const [vista, setVista] = useState<Vista>(
    () => (localStorage.getItem(CLAVE_VISTA) as Vista) ?? 'columnas',
  )
  /* Los filtros son de toda la app: lo que ponés acá sigue puesto allá. */
  const { sala: salaFiltro, elegirSala: setSalaFiltro, rango, elegirRango: setRango } = useFiltros()
  const [anotando, setAnotando] = useState(params.get('nueva') === '1')
  /* "¿ya anoté algo sobre esto?" es la pregunta que más se hace acá. */
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Tema | undefined>()
  const [porBorrar, setPorBorrar] = useState<Tema | undefined>()
  const [porAsignar, setPorAsignar] = useState<Tema | undefined>()
  const [arrastrando, setArrastrando] = useState<Tema | undefined>()

  const cambiarVista = (v: Vista) => {
    setVista(v)
    localStorage.setItem(CLAVE_VISTA, v)
  }

  /*
   * Arrastrar de una columna a otra.
   *
   * Las tres columnas del bloc no son un estado que se elija: son en
   * qué momento está cada nota. Por eso sólo dos aceptan que se les
   * suelte algo, y lo que hacen no es «cambiar el estado» sino la
   * acción que ya tenían los botones de la tarjeta:
   *
   *   → Asignados  = elegir a qué reunión va (abre el desplegable,
   *                  porque la reunión hay que decirla)
   *   → Borradores = sacarla de la reunión y devolverla al bloc
   *
   * A Pendientes no se puede soltar nada: una nota queda pendiente
   * porque una reunión se cerró sin tratarla, y eso no es algo que
   * alguien pueda decidir a mano.
   */
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const alEmpezar = (e: DragStartEvent) =>
    setArrastrando(estado.temas.find((t) => t.id === e.active.id))

  const alSoltar = (e: DragEndEvent) => {
    const tema = estado.temas.find((t) => t.id === e.active.id)
    setArrastrando(undefined)
    if (!tema || !e.over) return
    const destino = e.over.id as Grupo
    const origen = e.active.data.current?.grupo as Grupo | undefined
    if (destino === origen) return
    if (destino === 'asignados') setPorAsignar(tema)
    if (destino === 'borradores') void devolverAlTemario(tema.id)
  }

  /*
   * El panel entra acá con el formulario ya pedido. El parámetro se
   * saca de la URL enseguida: si queda, recargar vuelve a abrirlo.
   */
  useEffect(() => {
    if (params.get('nueva') !== '1') return
    setAnotando(true)
    params.delete('nueva')
    setParams(params, { replace: true })
  }, [params, setParams])

  const porGrupo = useMemo<Record<Grupo, Tema[]>>(() => {
    /*
     * Un borrador todavía no es de ninguna sala, pero puede tener
     * anotado para qué equipo se pensó. Filtrar por sala mira las dos
     * cosas: si no, elegir una sala vaciaba la columna de borradores
     * entera y parecía que se habían perdido.
     */
    const deLaSala = (t: Tema) =>
      salaFiltro === 'todas' || t.salaId === salaFiltro || t.salaTentativaId === salaFiltro

    /*
     * Acá la fecha es la de anotado, que siempre mira para atrás: con
     * un período hacia adelante —el que trae la app por defecto— el
     * bloc quedaría vacío y parecería que se perdió todo. Esos
     * períodos simplemente no recortan las notas.
     */
    const haciaAdelante = ['adelante', 'proximaSemana', 'proximoMes'].includes(rango.periodo)
    const enFecha = (t: Tema) => haciaAdelante || enRango(t.creadoEn, rango)

    /* Busca en el título y en el detalle, sin distinguir mayúsculas. */
    const q = busqueda.trim().toLowerCase()
    const coincide = (t: Tema) =>
      !q ||
      t.titulo.toLowerCase().includes(q) ||
      (t.detalle ?? '').toLowerCase().includes(q)

    const filtrar = (temas: Tema[]) =>
      temas.filter((t) => deLaSala(t) && enFecha(t) && coincide(t))

    return {
      borradores: filtrar(temarioDe(estado, yo?.id)),
      pendientes: filtrar(temasSinTratar(estado, undefined, yo?.id)),
      asignados: filtrar(temasAsignados(estado, yo?.id)),
    }
  }, [estado, yo, salaFiltro, rango, busqueda])

  const total = GRUPOS.reduce((n, g) => n + porGrupo[g.clave].length, 0)
  const filtrando = salaFiltro !== 'todas' || busqueda.trim().length > 0

  const tarjeta = (t: Tema, grupo: Grupo) => (
    <Tarjeta
      key={t.id}
      tema={t}
      grupo={grupo}
      onAsignar={() => setPorAsignar(t)}
      onEditar={() => setEditando(t)}
      onBorrar={() => setPorBorrar(t)}
      onSacar={() => void devolverAlTemario(t.id)}
    />
  )

  return (
    <div className="space-y-8">
      <Seccion
        titulo="Bloc de notas"
        principal
        acciones={
          <>
            <SelectorVista
              valor={vista}
              onChange={cambiarVista}
              opciones={[
                { valor: 'columnas', icono: Columns3, texto: 'Columnas' },
                { valor: 'lista', icono: List, texto: 'Lista' },
              ]}
            />
            <Boton variante="destacado" onClick={() => setAnotando(true)}>
              <Plus size={13} /> Crear nota
            </Boton>
          </>
        }
      >
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-suave">
          Anotá acá lo que quieras tratar, sin esperar a que haya una reunión armada, y después
          asignalo a la que corresponda. Sólo lo ves vos.
        </p>

        <BarraFiltros>
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar en mis notas…"
          />
          <FiltroSala valor={salaFiltro} onChange={setSalaFiltro} salas={misSalas} />
          <FiltroFecha valor={rango} onChange={setRango} />
        </BarraFiltros>

        {total === 0 ? (
          <Vacio
            titulo={
              busqueda.trim()
                ? 'Nada con esa palabra'
                : filtrando
                  ? 'Nada con esos filtros'
                  : 'Todavía no anotaste nada'
            }
            texto={
              busqueda.trim()
                ? `Ninguna nota tuya dice «${busqueda.trim()}». Si es algo que querés tratar, anotalo.`
                : filtrando
                  ? 'Ninguna nota tuya entra en lo que estás filtrando. Probá ampliándolo.'
                  : 'Cuando se te ocurra algo para hablar con alguno de tus equipos, anotalo acá y no se pierde.'
            }
            icono={<Inbox size={32} />}
            accion={
              /* Si buscaste y no está, lo más probable es que lo quieras anotar. */
              filtrando && !busqueda.trim() ? undefined : (
                <Boton variante="destacado" onClick={() => setAnotando(true)}>
                  <Plus size={13} /> {busqueda.trim() ? 'Anotarlo' : 'Crear la primera'}
                </Boton>
              )
            }
          />
        ) : vista === 'columnas' ? (
          <>
            <DndContext sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar}>
              <div className="grid gap-5 lg:grid-cols-3">
                {GRUPOS.map((g) => (
                  <ColumnaBloc key={g.clave} grupo={g} cuantos={porGrupo[g.clave].length}>
                    {porGrupo[g.clave].length === 0 ? (
                      <p className="border border-borde border-dashed p-4 text-meta text-tenue">
                        Nada por acá.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {porGrupo[g.clave].map((t) => tarjeta(t, g.clave))}
                      </ul>
                    )}
                  </ColumnaBloc>
                ))}
              </div>

              <DragOverlay>
                {arrastrando && (
                  <div className="w-72 rotate-2 opacity-90">
                    <ul>
                      <Tarjeta
                        tema={arrastrando}
                        grupo="borradores"
                        superpuesta
                        onAsignar={() => {}}
                        onEditar={() => {}}
                        onBorrar={() => {}}
                        onSacar={() => {}}
                      />
                    </ul>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            <p className="mt-4 hidden text-meta text-tenue lg:block">
              Arrastrá una nota a «Asignados» para mandarla a una reunión, o a «Borradores» para
              sacarla de la que tenga.
            </p>
          </>
        ) : (
          /*
             Lista de verdad: filas, no las mismas tarjetas puestas una
             abajo de la otra. Es para repasar de un vistazo lo que hay,
             igual que la lista de Tareas.
          */
          <div className="space-y-6">
            {GRUPOS.filter((g) => porGrupo[g.clave].length > 0).map((g) => (
              <section key={g.clave}>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-tarjeta font-semibold">{g.titulo}</h3>
                  <span className="text-meta text-tenue">{porGrupo[g.clave].length}</span>
                  <div className="h-px flex-1 bg-borde" />
                </div>
                <ul className="card divide-y divide-borde">
                  {porGrupo[g.clave].map((t) => (
                    <Fila
                      key={t.id}
                      tema={t}
                      grupo={g.clave}
                      onAsignar={() => setPorAsignar(t)}
                      onEditar={() => setEditando(t)}
                      onBorrar={() => setPorBorrar(t)}
                      onSacar={() => void devolverAlTemario(t.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Seccion>

      <ModalTema abierto={anotando} onCerrar={() => setAnotando(false)} />
      <ModalTema abierto={!!editando} onCerrar={() => setEditando(undefined)} tema={editando} />

      <ModalAsignar tema={porAsignar} onCerrar={() => setPorAsignar(undefined)} />

      <Confirmar
        abierto={!!porBorrar}
        titulo="Borrar el tema"
        texto={`«${porBorrar?.titulo}» se saca de tu bloc de notas. No se puede deshacer.`}
        textoBoton="Borrar"
        peligro
        onCancelar={() => setPorBorrar(undefined)}
        onConfirmar={() => {
          if (porBorrar) void borrarTema(porBorrar.id)
          setPorBorrar(undefined)
        }}
      />
    </div>
  )
}

/* ── La columna ───────────────────────────────────────────── */

/**
 * Una de las tres columnas, con su zona para soltar.
 *
 * «Pendientes» no acepta nada: se llega ahí porque una reunión se
 * cerró sin tratar la nota, no porque alguien lo decida. Marcarla
 * igual como zona válida sería prometer algo que al soltar no pasa.
 */
function ColumnaBloc({
  grupo: g,
  cuantos,
  children,
}: {
  grupo: (typeof GRUPOS)[number]
  cuantos: number
  children: React.ReactNode
}) {
  const recibe = g.clave !== 'pendientes'
  const { setNodeRef, isOver } = useDroppable({ id: g.clave, disabled: !recibe })

  return (
    <section ref={setNodeRef}>
      <h3 className="subtitulo">
        {g.titulo} <span className="cuenta">{cuantos}</span>
      </h3>
      <p className="mb-3 text-xs leading-relaxed text-tenue">{g.texto}</p>
      <div
        className={cx(
          'transition-colors',
          isOver && recibe && 'border border-dashed border-signal bg-signal/5 p-2',
        )}
      >
        {children}
      </div>
    </section>
  )
}

/* ── La nota ──────────────────────────────────────────────── */

/**
 * Una nota en la vista de lista: una fila y no una tarjeta.
 *
 * En columnas cada nota es una ficha con su botón grande, porque la
 * columna es angosta y hay pocas. En lista lo que se quiere es
 * repasar: el título manda, lo demás va al costado en gris, y las
 * acciones son íconos que aparecen al pasar por encima.
 */
function Fila({
  tema: t,
  grupo,
  onAsignar,
  onEditar,
  onBorrar,
  onSacar,
}: {
  tema: Tema
  grupo: Grupo
  onAsignar: () => void
  onEditar: () => void
  onBorrar: () => void
  onSacar: () => void
}) {
  const { estado } = useApp()
  const suya = reunion(estado, t.reunionId)
  const equipo = sala(estado, t.salaId ?? t.salaTentativaId)

  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
      <span
        className="h-8 w-0.5 shrink-0"
        style={{ background: IMPORTANCIA[t.importancia].hex }}
        title={IMPORTANCIA[t.importancia].nombre}
      />

      <div className="min-w-0 flex-1 basis-[60%] sm:basis-auto">
        <div className="text-sm leading-snug">{t.titulo}</div>
        {t.detalle && <div className="mt-0.5 truncate text-meta text-tenue">{t.detalle}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-tenue">
        <ChipObjetivo valor={t.objetivo} />
        {equipo && <span>{equipo.nombre}</span>}
        {grupo === 'pendientes' && (
          <span className="text-amber">{t.motivoRechazo ?? 'No se llegó a hablar'}</span>
        )}
        {grupo === 'asignados' && suya && (
          <Link to={`/reuniones/${suya.id}`} className="transition-colors hover:text-tinta">
            {suya.titulo} · {fechaCorta(suya.fecha)}
          </Link>
        )}
        <span>{relativo(t.creadoEn)}</span>
      </div>

      {/* En táctil no hay hover: en pantalla chica quedan siempre. */}
      <div className="flex shrink-0 items-center gap-1 xl:opacity-0 xl:group-hover:opacity-100">
        {grupo === 'asignados' ? (
          <Boton tam="sm" variante="fantasma" onClick={onSacar} aria-label="Sacar de la reunión">
            <RotateCcw size={12} />
          </Boton>
        ) : (
          <Boton tam="sm" onClick={onAsignar}>
            <CalendarPlus size={11} /> Asignar
          </Boton>
        )}
        <Boton tam="sm" variante="fantasma" onClick={onEditar} aria-label="Editar tema">
          <Pencil size={11} />
        </Boton>
        {grupo !== 'asignados' && (
          <Boton tam="sm" variante="fantasma" onClick={onBorrar} aria-label="Borrar tema">
            <Trash2 size={11} />
          </Boton>
        )}
      </div>
    </li>
  )
}

/**
 * Una nota, con las acciones que tienen sentido según dónde esté.
 *
 * Los pendientes llevan el borde ámbar y el motivo a la vista: "que
 * se distingan de las ideas nuevas", aunque estén en su columna.
 */
function Tarjeta({
  tema: t,
  grupo,
  onAsignar,
  onEditar,
  onBorrar,
  onSacar,
  superpuesta,
}: {
  tema: Tema
  grupo: Grupo
  onAsignar: () => void
  onEditar: () => void
  onBorrar: () => void
  onSacar: () => void
  /** La copia que sigue al puntero: se dibuja, pero no se arrastra ella misma. */
  superpuesta?: boolean
}) {
  const { estado } = useApp()
  const suya = reunion(estado, t.reunionId)
  /*
   * Las columnas se ponen en fila recién en `lg`. Debajo de eso están
   * apiladas —arrastrar entre ellas no lleva a ningún lado— y el gesto
   * le pelearía el dedo al scroll.
   */
  const enEscritorio = usePantallaAncha(1024)
  const arrastrable = enEscritorio && !superpuesta
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: t.id,
    disabled: !arrastrable,
    /* De qué columna salió, para saber qué significa soltarla en otra. */
    data: { grupo },
  })

  return (
    /*
      La nota entera es el asa, como en el tablero de Tareas: el
      sensor arranca a los 6 px, así que un click en un botón sigue
      siendo un click.
    */
    <li
      ref={setNodeRef}
      {...(arrastrable ? listeners : {})}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cx(
        'flex flex-col border bg-panel p-4',
        grupo === 'pendientes' ? 'border-amber/50' : 'border-borde',
        isDragging && 'opacity-30',
        arrastrable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {arrastrable && (
          <span {...attributes} className="-ml-1 text-borde2" aria-label="Mover">
            <GripVertical size={13} />
          </span>
        )}
        <ChipImportancia valor={t.importancia} />
        <ChipObjetivo valor={t.objetivo} />
        <span className="ml-auto text-meta text-tenue">anotado {relativo(t.creadoEn)}</span>
      </div>

      <h4 className="mb-1 text-sm leading-snug">{t.titulo}</h4>
      {t.detalle && <p className="mb-2 text-xs leading-relaxed text-suave">{t.detalle}</p>}

      {/* Para qué equipo se pensó, mientras la nota sigue siendo tuya. */}
      {grupo === 'borradores' && t.salaTentativaId && (
        <div className="mt-1">
          <Chip>{sala(estado, t.salaTentativaId)?.nombre}</Chip>
        </div>
      )}

      {grupo === 'pendientes' && (
        <p className="mt-1 text-xs text-amber">
          {t.motivoRechazo ?? 'No se llegó a hablar.'}
          {t.salaId && ` · ${sala(estado, t.salaId)?.nombre ?? ''}`}
        </p>
      )}

      {grupo === 'asignados' && suya && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Chip>{sala(estado, suya.salaId)?.nombre ?? 'Sin sala'}</Chip>
          <Link to={`/reuniones/${suya.id}`} className="text-meta text-suave hover:text-signal">
            {suya.titulo} · {fechaCorta(suya.fecha)} · {hora(suya.fecha)}
          </Link>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-borde pt-3">
        {grupo === 'asignados' ? (
          <Boton tam="sm" onClick={onSacar}>
            <RotateCcw size={11} /> Sacar de la reunión
          </Boton>
        ) : (
          <Boton tam="sm" variante="solido" onClick={onAsignar}>
            <CalendarPlus size={12} /> Asignar a una reunión
          </Boton>
        )}
        <Boton tam="sm" variante="fantasma" onClick={onEditar} aria-label="Editar tema">
          <Pencil size={11} />
        </Boton>
        {grupo !== 'asignados' && (
          <Boton tam="sm" variante="fantasma" onClick={onBorrar} aria-label="Borrar tema">
            <Trash2 size={11} />
          </Boton>
        )}
      </div>
    </li>
  )
}

/* ── Del bloc a una reunión ───────────────────────────────── */

function ModalAsignar({ tema, onCerrar }: { tema?: Tema; onCerrar: () => void }) {
  const { estado, yo, asignarAReunion, devolverAlTemario } = useApp()
  const navegar = useNavigate()

  /*
   * Cualquiera de mis próximas reuniones, de la sala que sea: el bloc
   * es mío y desde acá decido a cuál lo llevo. Un tema que volvió sin
   * tratar se queda en su sala.
   */
  const candidatas = useMemo(() => {
    if (!tema) return []
    const todas = proximasReuniones(estado, yo, tema.salaId ?? undefined).filter(
      (r) => r.estado !== 'cerrada',
    )
    /*
     * Si al anotarlo dijiste para qué equipo era, las de ese equipo
     * van primero. No se esconden las otras: era una intención, no una
     * decisión, y capaz el tema termina en otra reunión.
     */
    if (!tema.salaTentativaId) return todas
    return [
      ...todas.filter((r) => r.salaId === tema.salaTentativaId),
      ...todas.filter((r) => r.salaId !== tema.salaTentativaId),
    ]
  }, [estado, yo, tema])

  if (!tema) return null
  const volvio = tema.estado === 'diferido'

  return (
    <Modal abierto={!!tema} onCerrar={onCerrar} titulo={tema.titulo} ancho="max-w-lg">
      {candidatas.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-suave">
            No tenés ninguna reunión por delante donde llevarlo. Creá una y el tema te va a estar
            esperando acá.
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>
              Cerrar
            </Boton>
            <Boton
              variante="solido"
              onClick={() => {
                onCerrar()
                navegar('/reuniones?nueva=1')
              }}
            >
              Crear reunión
            </Boton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-suave">
            ¿En cuál lo tratamos? Entra directo a la agenda y pasa a la columna de asignados.
          </p>
          <ul className="card divide-y divide-borde">
            {candidatas.map((r) => (
              <li key={r.id}>
                <button
                  onClick={async () => {
                    await asignarAReunion(tema.id, r.id)
                    onCerrar()
                  }}
                  className="group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-hueco"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{r.titulo}</div>
                    <div className="text-meta text-tenue">
                      {sala(estado, r.salaId)?.nombre} · {fechaCorta(r.fecha)} · {hora(r.fecha)}
                    </div>
                  </div>
                  <Plus size={13} className="text-borde2 group-hover:text-signal" />
                </button>
              </li>
            ))}
          </ul>

          {volvio && (
            <button
              onClick={async () => {
                await devolverAlTemario(tema.id)
                onCerrar()
              }}
              className="flex items-center gap-2 text-meta text-suave underline underline-offset-2 hover:text-tinta"
            >
              <RotateCcw size={12} /> Sacarlo de esa sala y dejarlo en mi bloc de notas
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
