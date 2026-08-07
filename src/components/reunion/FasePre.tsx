import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Check,
  Clock,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  agendaVencida,
  cuentaRegresiva,
  deadlineAgenda,
  fechaHora,
  minutosAgenda,
  nombreDe,
  puedeProponerTemas,
  temasDe,
} from '../../lib/utils'
import { IMPORTANCIA, type Reunion, type Tema } from '../../types'
import { Boton, Chip, ChipImportancia, ChipObjetivo, Confirmar, Etiqueta, Vacio } from '../ui'
import ModalTema from './ModalTema'

export default function FasePre({ reunion }: { reunion: Reunion }) {
  const { estado, puedeOrganizar, actualizarTema, borrarTema, reordenarTemas, cerrarAgenda } =
    useApp()

  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Tema | undefined>()
  const [porBorrar, setPorBorrar] = useState<Tema | undefined>()
  const [confirmarCierre, setConfirmarCierre] = useState(false)

  const todos = temasDe(estado, reunion.id)
  const agenda = todos.filter((t) => t.estado === 'aprobado')
  const propuestos = todos.filter((t) => t.estado === 'propuesto')
  const fuera = todos.filter((t) => t.estado === 'rechazado' || t.estado === 'diferido')

  const total = minutosAgenda(agenda)
  const excedido = total > reunion.duracionPrevistaMin
  const cd = cuentaRegresiva(deadlineAgenda(reunion))
  const abierta = puedeProponerTemas(reunion)
  const vencida = agendaVencida(reunion)

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const alSoltar = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = agenda.map((t) => t.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    void reordenarTemas(reunion.id, arrayMove(ids, from, to))
  }

  return (
    <div className="space-y-8">
      {/*
        Una sola cifra: el tiempo asignado es el único número que obliga
        a decidir algo. El plazo va en una línea de texto al lado, sin
        repetir la fecha, las horas de antelación y la cuenta regresiva
        en tres cajas distintas.
      */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <Etiqueta className="mb-1.5">Tiempo asignado</Etiqueta>
            <div className={excedido ? 'display text-3xl text-signal' : 'display text-3xl'}>
              {total}
              <span className="ml-1 text-base text-suave">
                / {reunion.duracionPrevistaMin} min
              </span>
            </div>
          </div>

          <div className="text-right">
            <Etiqueta className="mb-1.5">{vencida ? 'La carga cerró' : 'La carga cierra'}</Etiqueta>
            <div className="flex items-center justify-end gap-2 text-sm">
              {abierta ? (
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-acid" />
              ) : (
                <Lock size={12} className="text-suave" />
              )}
              <span>{fechaHora(deadlineAgenda(reunion))}</span>
              {abierta && <span className="text-amber">· quedan {cd.texto}</span>}
            </div>
          </div>
        </div>

        {excedido && (
          <div className="border-t border-borde bg-signal/5 px-5 py-2.5 text-xs text-signal">
            La agenda se pasa {total - reunion.duracionPrevistaMin} minutos de lo previsto.
            Recortá tiempos o diferí algún tema.
          </div>
        )}
      </div>

      {/* ── Acciones ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Boton
          variante="solido"
          onClick={() => setCreando(true)}
          disabled={!abierta && !puedeOrganizar}
          title={!abierta && !puedeOrganizar ? 'La carga de temas ya está cerrada.' : undefined}
        >
          <Plus size={13} /> Proponer tema
        </Boton>

        {puedeOrganizar && reunion.estado === 'agenda_abierta' && (
          <Boton onClick={() => setConfirmarCierre(true)} disabled={agenda.length === 0}>
            <Send size={13} /> Cerrar temario y notificar
          </Boton>
        )}

        {!abierta && !puedeOrganizar && (
          <span className="font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
            La carga cerró {reunion.horasCierreAgenda} h antes de la reunión
          </span>
        )}
      </div>

      {/* ── Por aprobar ── */}
      {propuestos.length > 0 && (
        <section>
          <h3 className="display mb-1 text-xl">
            Temas propuestos <span className="text-suave">{propuestos.length}</span>
          </h3>
          <p className="mb-3 text-xs text-suave">
            {puedeOrganizar
              ? 'Decidí cuáles entran en esta reunión.'
              : 'El organizador define cuáles entran en esta reunión.'}
          </p>

          <ul className="space-y-2">
            {propuestos.map((t) => (
              <li key={t.id} className="card p-4">
                <FilaTema tema={t} onEditar={() => setEditando(t)} onBorrar={() => setPorBorrar(t)} />
                {puedeOrganizar && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-borde pt-3">
                    <Boton
                      tam="sm"
                      variante="solido"
                      onClick={() => actualizarTema(t.id, { estado: 'aprobado' })}
                    >
                      <Check size={12} /> Aprobar
                    </Boton>
                    <Boton tam="sm" onClick={() => actualizarTema(t.id, { estado: 'diferido' })}>
                      <Clock size={12} /> Diferir
                    </Boton>
                    <Boton
                      tam="sm"
                      variante="peligro"
                      onClick={() => actualizarTema(t.id, { estado: 'rechazado' })}
                    >
                      <X size={12} /> Rechazar
                    </Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Agenda ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="display text-xl">
            Agenda de la reunión <span className="text-suave">{agenda.length}</span>
          </h3>
          {puedeOrganizar && agenda.length > 1 && (
            <span className="text-xs text-tenue">Arrastrá para reordenar</span>
          )}
        </div>

        {agenda.length === 0 ? (
          <Vacio
            titulo="La agenda está vacía"
            texto="Todavía no hay temas aprobados para esta reunión."
            accion={
              <Boton variante="solido" onClick={() => setCreando(true)}>
                <Plus size={13} /> Proponer el primero
              </Boton>
            }
          />
        ) : (
          <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
            <SortableContext
              items={agenda.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {agenda.map((t, i) => (
                  <TemaOrdenable
                    key={t.id}
                    tema={t}
                    indice={i}
                    arrastrable={puedeOrganizar}
                    onEditar={() => setEditando(t)}
                    onBorrar={() => setPorBorrar(t)}
                    onDiferir={() => actualizarTema(t.id, { estado: 'diferido' })}
                    onTiempo={(min) => actualizarTema(t.id, { duracionMin: min })}
                    puedeOrganizar={puedeOrganizar}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* ── Fuera de agenda ── */}
      {fuera.length > 0 && (
        <section>
          <h3 className="display mb-3 text-xl">
            Fuera de esta reunión <span className="text-suave">{fuera.length}</span>
          </h3>
          <ul className="space-y-2">
            {fuera.map((t) => (
              <li
                key={t.id}
                className="card flex flex-wrap items-center gap-3 p-3 opacity-60 transition-opacity hover:opacity-100"
              >
                <Chip tono={t.estado === 'diferido' ? 'amber' : 'signal'}>
                  {t.estado === 'diferido' ? 'Diferido' : 'Rechazado'}
                </Chip>
                <span className="min-w-0 flex-1 truncate text-sm">{t.titulo}</span>
                <span className="text-xs text-tenue">{nombreDe(estado, t.propuestoPor)}</span>
                {puedeOrganizar && (
                  <Boton tam="sm" onClick={() => actualizarTema(t.id, { estado: 'aprobado' })}>
                    Recuperar
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Modales ── */}
      <ModalTema
        abierto={creando}
        onCerrar={() => setCreando(false)}
        reunionId={reunion.id}
        entraDirecto={puedeOrganizar}
      />
      <ModalTema
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        reunionId={reunion.id}
        tema={editando}
      />
      <Confirmar
        abierto={!!porBorrar}
        titulo="Eliminar tema"
        texto={`Se elimina “${porBorrar?.titulo}” de forma definitiva.`}
        textoBoton="Eliminar"
        peligro
        onCancelar={() => setPorBorrar(undefined)}
        onConfirmar={() => {
          if (porBorrar) void borrarTema(porBorrar.id)
          setPorBorrar(undefined)
        }}
      />
      <Confirmar
        abierto={confirmarCierre}
        titulo="Cerrar el temario"
        texto={`Se congela la agenda con ${agenda.length} temas y sale un correo a los ${reunion.participantesIds.length} participantes con el detalle. Después de esto nadie más puede sumar temas.`}
        textoBoton="Cerrar y notificar"
        onCancelar={() => setConfirmarCierre(false)}
        onConfirmar={() => {
          void cerrarAgenda(reunion.id)
          setConfirmarCierre(false)
        }}
      />
    </div>
  )
}

/* ── Fila de tema ─────────────────────────────────────────── */

function FilaTema({
  tema,
  onEditar,
  onBorrar,
}: {
  tema: Tema
  onEditar: () => void
  onBorrar: () => void
}) {
  const { estado, puedeOrganizar, yo } = useApp()
  const propio = tema.propuestoPor === yo?.id

  return (
    <div className="flex flex-wrap items-start gap-3">
      <span
        className="mt-1 h-10 w-0.5 shrink-0"
        style={{ background: IMPORTANCIA[tema.importancia].hex }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug">{tema.titulo}</div>
        {tema.detalle && (
          <p className="mt-1 text-xs leading-relaxed text-suave">{tema.detalle}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ChipImportancia valor={tema.importancia} />
          <ChipObjetivo valor={tema.objetivo} />
          <span className="ml-1 font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
            {nombreDe(estado, tema.propuestoPor)} · {tema.duracionMin} min
          </span>
        </div>
      </div>
      {(puedeOrganizar || propio) && (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEditar}
            className="border border-borde2 p-1.5 text-suave transition-colors hover:border-tinta hover:text-tinta"
            title="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onBorrar}
            className="border border-borde2 p-1.5 text-suave transition-colors hover:border-signal hover:text-signal"
            title="Eliminar"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Tema arrastrable ─────────────────────────────────────── */

function TemaOrdenable({
  tema,
  indice,
  arrastrable,
  puedeOrganizar,
  onEditar,
  onBorrar,
  onDiferir,
  onTiempo,
}: {
  tema: Tema
  indice: number
  arrastrable: boolean
  puedeOrganizar: boolean
  onEditar: () => void
  onBorrar: () => void
  onDiferir: () => void
  onTiempo: (min: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tema.id,
    disabled: !arrastrable,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        isDragging
          ? 'card relative z-10 border-signal p-4 opacity-90 shadow-2xl'
          : 'card p-4 transition-colors hover:border-borde2'
      }
    >
      <div className="flex items-start gap-3">
        {arrastrable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab text-borde2 transition-colors hover:text-tinta active:cursor-grabbing"
            aria-label="Reordenar"
          >
            <GripVertical size={16} />
          </button>
        )}
        <span className="mt-0.5 w-6 shrink-0 font-semibold text-xs text-tenue">
          {String(indice + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <FilaTema tema={tema} onEditar={onEditar} onBorrar={onBorrar} />

          {puedeOrganizar && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-borde pt-3 sm:gap-2">
              <span className="label">Tiempo</span>
              {[5, 10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => onTiempo(m)}
                  className={
                    tema.duracionMin === m
                      ? 'border border-tinta bg-tinta px-2.5 py-1.5 font-semibold text-[10px] text-fondo'
                      : 'border border-borde2 px-2.5 py-1.5 font-semibold text-[10px] text-suave transition-colors hover:border-suave hover:text-tinta'
                  }
                >
                  {m}′
                </button>
              ))}
              <button
                onClick={onDiferir}
                className="ml-auto py-1.5 font-semibold text-[10px] uppercase tracking-[0.12em] text-suave transition-colors hover:text-amber"
              >
                Diferir
              </button>
            </div>
          )}
        </div>
      </div>

    </li>
  )
}
