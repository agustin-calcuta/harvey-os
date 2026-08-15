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
import { Check, Clock, GripVertical, Pencil, Plus, Send, Trash2, Undo2, X } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  llegaTarde,
  minutosAgenda,
  nombreDe,
  relativo,
  temarioDe,
  temasDe,
  temasSinTratar,
} from '../../lib/utils'
import { IMPORTANCIA, type Reunion, type Tema } from '../../types'
import {
  BarraFlotante,
  Boton,
  Chip,
  ChipImportancia,
  ChipObjetivo,
  Confirmar,
  Vacio,
} from '../ui'
import ModalTema from './ModalTema'

/* ─────────────────────────────────────────────────────────────
   Antes de la reunión.

   Se fue el plazo de cierre: el temario lo cierra el organizador
   cuando quiere y un tema de último momento entra igual —"si te
   olvidaste de cargarlo, decímelo igual un minuto antes"—. Cerrar
   el temario es avisar de qué se va a hablar, no trabar nada, y
   el botón quedó flotante para no perderlo al final de la página.
   ───────────────────────────────────────────────────────────── */

export default function FasePre({ reunion }: { reunion: Reunion }) {
  const {
    estado,
    yo,
    puedeOrganizar,
    actualizarTema,
    borrarTema,
    reordenarTemas,
    cerrarAgenda,
    asignarAReunion,
    devolverAlTemario,
  } = useApp()

  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Tema | undefined>()
  const [porBorrar, setPorBorrar] = useState<Tema | undefined>()
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [avisar, setAvisar] = useState(true)

  const todos = temasDe(estado, reunion.id)
  const agenda = todos.filter((t) => t.estado === 'aprobado')
  const propuestos = todos.filter((t) => t.estado === 'propuesto')
  const fuera = todos.filter((t) => t.estado === 'rechazado')

  /* Mi bloc de notas, para bajar algo a esta reunión sin salir de acá. */
  const mios = temarioDe(estado, yo?.id)
  /* Los que quedaron sin tratar en esta sala, esperando que los incluyan. */
  const sinTratar = temasSinTratar(estado, reunion.salaId)

  const total = minutosAgenda(agenda)
  const excedido = total > reunion.duracionPrevistaMin
  const tarde = llegaTarde(reunion)

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

  const paraIncluir = (t: Tema, deDonde: 'temario' | 'sinTratar') => (
    <li key={t.id} className="card border-cold/30 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="mt-1 h-10 w-0.5 shrink-0"
          style={{ background: IMPORTANCIA[t.importancia].hex }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-snug">{t.titulo}</div>
          {t.detalle && <p className="mt-1 text-xs leading-relaxed text-suave">{t.detalle}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ChipImportancia valor={t.importancia} />
            <ChipObjetivo valor={t.objetivo} />
            <span className="ml-1 text-xs text-tenue">
              {deDonde === 'sinTratar'
                ? `${nombreDe(estado, t.propuestoPor)} · ${t.motivoRechazo ?? 'no se llegó a hablar'}`
                : `anotado ${relativo(t.creadoEn)}`}
            </span>
          </div>
        </div>
        <Boton tam="sm" variante="solido" onClick={() => asignarAReunion(t.id, reunion.id)}>
          <Check size={12} /> Incluir
        </Boton>
      </div>
    </li>
  )

  return (
    <div className="space-y-8">
      {/* ── Acciones ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Boton variante="solido" onClick={() => setCreando(true)}>
          <Plus size={13} /> Proponer tema
        </Boton>
        <span className="text-xs text-suave">
          {agenda.length} {agenda.length === 1 ? 'tema' : 'temas'} en agenda
          {puedeOrganizar && (
            <>
              {' · '}
              <span className={excedido ? 'text-signal' : undefined}>
                {total} de {reunion.duracionPrevistaMin} min asignados
              </span>
            </>
          )}
        </span>
      </div>

      {tarde && (
        <p className="border border-borde bg-hueco p-3 text-xs leading-relaxed text-suave">
          El temario ya se cerró y se avisó qué se iba a hablar. Igual se pueden sumar temas: entran
          al final y el que modera decide si se llegan a tratar.
        </p>
      )}

      {/* ── Sin tratar de reuniones anteriores ── */}
      {puedeOrganizar && sinTratar.length > 0 && (
        <section>
          <h3 className="display mb-1 text-xl">
            No se llegaron a hablar <span className="text-suave">{sinTratar.length}</span>
          </h3>
          <p className="mb-3 text-xs text-suave">
            Quedaron fuera de una reunión anterior de esta sala. Incluí los que quieras tratar ahora;
            el resto sigue esperando.
          </p>
          <ul className="space-y-2">{sinTratar.map((t) => paraIncluir(t, 'sinTratar'))}</ul>
        </section>
      )}

      {/* ── Mi temario ── */}
      {mios.length > 0 && (
        <section>
          <h3 className="display mb-1 text-xl">
            De mi temario <span className="text-suave">{mios.length}</span>
          </h3>
          <p className="mb-3 text-xs text-suave">
            Lo que anotaste sin fecha. Sólo lo ves vos hasta que lo incluís en una reunión.
          </p>
          <ul className="space-y-2">{mios.map((t) => paraIncluir(t, 'temario'))}</ul>
        </section>
      )}

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
                    <Boton
                      tam="sm"
                      onClick={() =>
                        actualizarTema(t.id, { estado: 'diferido', reunionId: undefined })
                      }
                    >
                      <Clock size={12} /> Dejar para más adelante
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
            <span className="flex items-center gap-1.5 border border-borde px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave">
              <GripVertical size={11} /> Arrastrá para cambiar el orden
            </span>
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
            <SortableContext items={agenda.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {agenda.map((t, i) => (
                  <TemaOrdenable
                    key={t.id}
                    tema={t}
                    indice={i}
                    arrastrable={puedeOrganizar}
                    puedeOrganizar={puedeOrganizar}
                    onEditar={() => setEditando(t)}
                    onBorrar={() => setPorBorrar(t)}
                    onDiferir={() =>
                      actualizarTema(t.id, { estado: 'diferido', reunionId: undefined })
                    }
                    onAlTemario={() => devolverAlTemario(t.id)}
                    onTiempo={(min) => actualizarTema(t.id, { duracionMin: min })}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* ── Rechazados ── */}
      {fuera.length > 0 && (
        <section>
          <h3 className="display mb-3 text-xl">
            Fuera de esta reunión <span className="text-suave">{fuera.length}</span>
          </h3>
          <ul className="space-y-2">
            {fuera.map((t) => (
              <li
                key={t.id}
                className="card flex flex-wrap items-center gap-3 p-3 opacity-70 transition-opacity hover:opacity-100"
              >
                <Chip tono="signal">Rechazado</Chip>
                <span className="min-w-0 flex-1 truncate text-sm">{t.titulo}</span>
                <span className="text-xs text-tenue">{nombreDe(estado, t.propuestoPor)}</span>
                {puedeOrganizar && (
                  <div className="flex gap-1">
                    <Boton tam="sm" onClick={() => actualizarTema(t.id, { estado: 'aprobado' })}>
                      Recuperar
                    </Boton>
                    <Boton tam="sm" variante="fantasma" onClick={() => devolverAlTemario(t.id)}>
                      <Undo2 size={11} /> Al temario
                    </Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Cerrar el temario ──
          Flotante: es el submit de esta pantalla y se perdía abajo de todo. */}
      {puedeOrganizar && reunion.estado === 'agenda_abierta' && (
        <BarraFlotante>
          <label className="mr-auto flex items-center gap-2 text-xs text-suave">
            <input
              type="checkbox"
              checked={avisar}
              onChange={(e) => setAvisar(e.target.checked)}
            />
            Avisar por correo a los {reunion.participantesIds.length} participantes
          </label>
          <Boton
            variante="solido"
            onClick={() => setConfirmarCierre(true)}
            disabled={agenda.length === 0}
          >
            <Send size={13} /> Cerrar temario {avisar ? 'y avisar' : ''}
          </Boton>
        </BarraFlotante>
      )}

      {/* ── Modales ── */}
      <ModalTema
        abierto={creando}
        onCerrar={() => setCreando(false)}
        salaId={reunion.salaId}
        reunionId={reunion.id}
        entraDirecto={puedeOrganizar}
      />
      <ModalTema
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        salaId={reunion.salaId}
        reunionId={reunion.id}
        tema={editando}
      />
      <Confirmar
        abierto={!!porBorrar}
        titulo="Eliminar tema"
        texto={`Se elimina «${porBorrar?.titulo}» de forma definitiva. Si querés guardarlo para más adelante, devolvelo al temario en vez de borrarlo.`}
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
        texto={
          avisar
            ? `Sale un correo a los ${reunion.participantesIds.length} participantes con los ${agenda.length} temas, para que lleguen sabiendo de qué se va a hablar. Si aparece algo de último momento, se puede sumar igual.`
            : `Se cierra el temario con ${agenda.length} temas y no se avisa a nadie. Si aparece algo de último momento, se puede sumar igual.`
        }
        textoBoton={avisar ? 'Cerrar y avisar' : 'Cerrar sin avisar'}
        onCancelar={() => setConfirmarCierre(false)}
        onConfirmar={() => {
          void cerrarAgenda(reunion.id, avisar)
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
        {tema.detalle && <p className="mt-1 text-xs leading-relaxed text-suave">{tema.detalle}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ChipImportancia valor={tema.importancia} />
          <ChipObjetivo valor={tema.objetivo} />
          <span className="ml-1 text-xs text-tenue">{nombreDe(estado, tema.propuestoPor)}</span>
        </div>
      </div>
      {(puedeOrganizar || propio) && (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEditar}
            className="border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-tinta hover:text-tinta"
            aria-label={`Editar «${tema.titulo}»`}
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onBorrar}
            className="border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-signal hover:text-signal"
            aria-label={`Eliminar «${tema.titulo}»`}
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
  onAlTemario,
  onTiempo,
}: {
  tema: Tema
  indice: number
  arrastrable: boolean
  puedeOrganizar: boolean
  onEditar: () => void
  onBorrar: () => void
  onDiferir: () => void
  onAlTemario: () => void
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
            aria-label={`Reordenar «${tema.titulo}»`}
          >
            <GripVertical size={16} />
          </button>
        )}
        <span className="mt-0.5 w-6 shrink-0 text-xs text-tenue">
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
                      ? 'border border-tinta bg-tinta px-2.5 py-1.5 text-[10px] text-fondo'
                      : 'border border-borde2 bg-panel px-2.5 py-1.5 text-[10px] text-suave transition-colors hover:border-suave hover:text-tinta'
                  }
                >
                  {m}′
                </button>
              ))}
              <button
                onClick={onDiferir}
                className="ml-auto py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:text-amber"
              >
                Para más adelante
              </button>
              <button
                onClick={onAlTemario}
                className="py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:text-cold"
              >
                Al temario
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
