import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Lock,
  Pencil,
  Play,
  Square,
  Trash2,
  UserPlus,
  Video,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { fechaLarga, hora, integrantes, lugaresDe, nombreDe, paraInputDateTime } from '../lib/utils'
import {
  ESTADO_REUNION,
  RECURRENCIAS,
  type EstadoReunion,
  type Recurrencia,
  type Reunion,
} from '../types'
import { Avatares, Boton, Campo, Chip, Confirmar, Modal, Vacio } from '../components/ui'
import FasePre from '../components/reunion/FasePre'
import FaseVivo from '../components/reunion/FaseVivo'
import FasePost from '../components/reunion/FasePost'

/** Valor del desplegable de lugar para escribir uno a mano. */
const OTRO = '__otro__'

type Fase = 'pre' | 'vivo' | 'post'

const FASES: { id: Fase; num: string; texto: string }[] = [
  { id: 'pre', num: '01', texto: 'Temario' },
  { id: 'vivo', num: '02', texto: 'Reunión' },
  { id: 'post', num: '03', texto: 'Minuta' },
]

/** Fase que corresponde según el estado de la reunión. */
function faseSugerida(e: EstadoReunion): Fase {
  if (e === 'en_curso') return 'vivo'
  if (e === 'cerrada') return 'post'
  return 'pre'
}

export default function ReunionDetalle() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const { estado, puedeModerar, organizoLa, iniciarReunion, borrarReunion } = useApp()

  const reunion = estado.reuniones.find((r) => r.id === id)
  const [fase, setFase] = useState<Fase>(() =>
    reunion ? faseSugerida(reunion.estado) : 'pre',
  )
  const [editando, setEditando] = useState(false)
  const [porBorrar, setPorBorrar] = useState(false)
  /*
   * "Cerrar y generar minuta tiene que estar disponible siempre": el
   * botón vive en la cabecera y se ve desde cualquiera de las tres
   * pestañas. Abre el mismo diálogo de la reunión en curso, que es el
   * que guarda las notas del tema abierto antes de cerrar.
   */
  const [pidiendoCierre, setPidiendoCierre] = useState(false)

  // Cuando la reunión avanza de etapa, la vista acompaña. Sólo ante un cambio
  // real de estado: si el usuario eligió otra pestaña a mano, se respeta.
  const estadoPrevio = useRef(reunion?.estado)
  useEffect(() => {
    if (!reunion) return
    if (estadoPrevio.current !== reunion.estado) {
      estadoPrevio.current = reunion.estado
      setFase(faseSugerida(reunion.estado))
    }
  }, [reunion])

  if (!reunion) {
    return (
      <Vacio
        titulo="Reunión no encontrada"
        texto="Puede que se haya eliminado."
        accion={
          <Link to="/reuniones">
            <Boton>Volver a reuniones</Boton>
          </Link>
        }
      />
    )
  }

  const moderador = puedeModerar(reunion)
  /* Editar o borrar la reunión es de quien organiza *esa* sala. */
  const puedeOrganizar = organizoLa(reunion.salaId)
  const est = ESTADO_REUNION[reunion.estado]

  return (
    <div className="space-y-6">
      {/* ── Cabecera ── */}
      <div>
        <Link
          to="/reuniones"
          className="mb-4 inline-flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-[0.14em] text-suave transition-colors hover:text-tinta"
        >
          <ArrowLeft size={12} /> Reuniones
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Chip
                tono={
                  reunion.estado === 'en_curso'
                    ? 'signal'
                    : reunion.estado === 'agenda_abierta'
                      ? 'acid'
                      : reunion.estado === 'agenda_cerrada'
                        ? 'amber'
                        : reunion.estado === 'cerrada'
                          ? 'cold'
                          : 'neutro'
                }
              >
                {reunion.estado === 'en_curso' && (
                  <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-signal" />
                )}
                {est.nombre}
              </Chip>
              {reunion.privada && (
                <Chip title="Sólo la ven quienes participan">
                  <Lock size={9} /> Privada
                </Chip>
              )}
            </div>

            <h1 className="display text-titulo">{reunion.titulo}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-meta text-suave">
              <span>
                {fechaLarga(reunion.fecha)} · {hora(reunion.fecha)}
              </span>
              {reunion.lugar && <span>{reunion.lugar}</span>}
              <span>Modera {nombreDe(estado, reunion.moderadorId)}</span>
              <span>{reunion.duracionPrevistaMin} min previstos</span>
              {/* El Meet que armó Google al agendarla. */}
              {reunion.meetUrl && (
                <a
                  href={reunion.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-cold transition-colors hover:text-tinta"
                >
                  <Video size={12} /> Entrar por Meet
                </a>
              )}
              {reunion.calendarUrl && (
                <a
                  href={reunion.calendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-tinta"
                >
                  <CalendarDays size={12} /> En el calendario
                </a>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-row-reverse flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-col sm:flex-nowrap sm:items-end">
            <Avatares
              nombres={reunion.participantesIds
                .map((uid) => estado.usuarios.find((u) => u.id === uid))
                .filter(Boolean)
                .map((u) => ({ nombre: u!.nombre, url: u!.avatarUrl }))}
            />
            <div className="flex flex-wrap justify-end gap-2">
              {/* Se puede empezar sin haber cerrado el temario: cerrarlo es
                  avisar de qué se va a hablar, no un requisito. */}
              {(reunion.estado === 'agenda_cerrada' || reunion.estado === 'agenda_abierta') &&
                moderador && (
                  <Boton
                    tam="sm"
                    variante="destacado"
                    onClick={() => {
                      void iniciarReunion(reunion.id)
                      setFase('vivo')
                    }}
                  >
                    <Play size={12} /> Iniciar reunión
                  </Boton>
                )}
              {/* Una reunión que nunca se inició no se cierra: para eso
                  está iniciarla. */}
              {reunion.estado === 'en_curso' && moderador && (
                <Boton
                  tam="sm"
                  variante="destacado"
                  onClick={() => {
                    setFase('vivo')
                    setPidiendoCierre(true)
                  }}
                >
                  <Square size={11} /> Cerrar y generar minuta
                </Boton>
              )}
              {puedeOrganizar && (
                <>
                  <Boton
                    tam="sm"
                    variante="fantasma"
                    onClick={() => setEditando(true)}
                    aria-label="Editar la reunión"
                  >
                    <Pencil size={12} />
                  </Boton>
                  <Boton
                    tam="sm"
                    variante="fantasma"
                    onClick={() => setPorBorrar(true)}
                    aria-label="Eliminar la reunión"
                  >
                    <Trash2 size={12} />
                  </Boton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fases ── */}
      <div className="flex gap-px overflow-x-auto border border-borde bg-borde no-scrollbar">
        {FASES.map((f) => {
          const activa = fase === f.id
          const sugerida = faseSugerida(reunion.estado) === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFase(f.id)}
              className={
                activa
                  ? 'flex flex-1 items-center justify-center gap-2 whitespace-nowrap bg-tinta px-3 py-2.5 text-fondo'
                  : 'flex flex-1 items-center justify-center gap-2 whitespace-nowrap bg-panel px-3 py-2.5 text-suave transition-colors hover:bg-hueco hover:text-tinta'
              }
            >
              <span className={activa ? 'text-signal' : 'text-borde2'}>{f.num}</span>
              <span className="text-cuerpo font-semibold">
                {f.texto}
              </span>
              {sugerida && !activa && (
                <span className="h-1.5 w-1.5 rounded-full bg-signal" title="Acá estás" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Contenido de la fase ── */}
      <div className="animate-in">
        {fase === 'pre' && <FasePre reunion={reunion} />}
        {fase === 'vivo' &&
          (reunion.estado === 'en_curso' || reunion.estado === 'cerrada' ? (
            <FaseVivo
              reunion={reunion}
              pidiendoCierre={pidiendoCierre}
              onCierreAtendido={() => setPidiendoCierre(false)}
            />
          ) : (
            <Vacio
              titulo="La reunión todavía no empezó"
              texto="Cuando estén todos, iniciala y arrancás por el seguimiento de lo que quedó de la vez pasada."
              accion={
                moderador ? (
                  <Boton
                    variante="solido"
                    onClick={() => {
                      void iniciarReunion(reunion.id)
                      setFase('vivo')
                    }}
                  >
                    <Play size={13} /> Iniciar reunión
                  </Boton>
                ) : (
                  <Boton onClick={() => setFase('pre')}>Ver el temario</Boton>
                )
              }
            />
          ))}
        {fase === 'post' &&
          (reunion.estado === 'en_curso' || reunion.estado === 'cerrada' ? (
            <FasePost reunion={reunion} />
          ) : (
            <Vacio
              titulo="Todavía no hay minuta"
              texto="La minuta se arma con lo que se registre durante la reunión."
              accion={<Boton onClick={() => setFase('pre')}>Ver el temario</Boton>}
            />
          ))}
      </div>

      {/* ── Modales ── */}
      <ModalEditarReunion
        abierto={editando}
        onCerrar={() => setEditando(false)}
        reunion={reunion}
      />
      <Confirmar
        abierto={porBorrar}
        titulo="Eliminar reunión"
        texto={`Se elimina “${reunion.titulo}” junto con todos sus temas. Las tareas quedan en el historial.`}
        textoBoton="Eliminar"
        peligro
        onCancelar={() => setPorBorrar(false)}
        onConfirmar={() => {
          void borrarReunion(reunion.id)
          navegar('/reuniones')
        }}
      />
    </div>
  )
}

/* ── Edición de la reunión ────────────────────────────────── */

function ModalEditarReunion({
  abierto,
  onCerrar,
  reunion,
}: {
  abierto: boolean
  onCerrar: () => void
  reunion: Reunion
}) {
  const { estado, actualizarReunion, sumarInvitado } = useApp()
  const gente = integrantes(estado, reunion.salaId)
  const lugares = lugaresDe(estado, reunion.salaId)

  const [titulo, setTitulo] = useState(reunion.titulo)
  const [fecha, setFecha] = useState(paraInputDateTime(reunion.fecha))
  const [duracion, setDuracion] = useState(reunion.duracionPrevistaMin)
  const [lugar, setLugar] = useState(reunion.lugar ?? lugares[0] ?? OTRO)
  const [otroLugar, setOtroLugar] = useState(
    reunion.lugar && !lugares.includes(reunion.lugar) ? reunion.lugar : '',
  )
  const [moderadorId, setModeradorId] = useState(reunion.moderadorId)
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(reunion.recurrencia ?? 'unica')
  const [privada, setPrivada] = useState(reunion.privada ?? false)
  const [participantes, setParticipantes] = useState<string[]>(reunion.participantesIds)
  const [est, setEst] = useState<EstadoReunion>(reunion.estado)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')

  /* Los de afuera ya están en la reunión aunque no sean de la sala. */
  const externos = estado.usuarios.filter(
    (u) => reunion.participantesIds.includes(u.id) && !gente.some((g) => g.id === u.id),
  )

  const alternar = (id: string) =>
    setParticipantes((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    await actualizarReunion(reunion.id, {
      titulo,
      fecha: new Date(fecha).toISOString(),
      duracionPrevistaMin: duracion,
      lugar: (lugar === OTRO ? otroLugar.trim() : lugar) || undefined,
      moderadorId,
      recurrencia,
      privada,
      participantesIds: participantes,
      estado: est,
    })
    onCerrar()
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Editar reunión">
      <form onSubmit={enviar} className="space-y-4">
        <Campo etiqueta="Título">
          <input className="w-full" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha y hora">
            <input
              type="datetime-local"
              className="w-full"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Duración prevista (min)">
            <input
              type="number"
              min={15}
              step={5}
              className="w-full"
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Lugar">
            <select className="w-full" value={lugar} onChange={(e) => setLugar(e.target.value)}>
              {lugares.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
              <option value={OTRO}>Otro…</option>
            </select>
            {lugar === OTRO && (
              <input
                className="mt-2 w-full"
                placeholder="¿Dónde se juntan?"
                aria-label="Otro lugar"
                value={otroLugar}
                onChange={(e) => setOtroLugar(e.target.value)}
              />
            )}
          </Campo>
          <Campo etiqueta="Modera">
            <select
              className="w-full"
              value={moderadorId}
              onChange={(e) => setModeradorId(e.target.value)}
            >
              {gente.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Se repite">
            <select
              className="w-full"
              value={recurrencia}
              onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
            >
              {(Object.keys(RECURRENCIAS) as Recurrencia[]).map((r) => (
                <option key={r} value={r}>
                  {RECURRENCIAS[r].nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Estado" ayuda="Sirve para volver atrás si algo se adelantó de más.">
            <select
              className="w-full"
              value={est}
              onChange={(e) => setEst(e.target.value as EstadoReunion)}
            >
              {(Object.keys(ESTADO_REUNION) as EstadoReunion[]).map((k) => (
                <option key={k} value={k}>
                  {ESTADO_REUNION[k].nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo etiqueta={`Quiénes participan (${participantes.length})`}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {[...gente, ...externos].map((u) => (
              <button
                key={u.id}
                type="button"
                aria-pressed={participantes.includes(u.id)}
                onClick={() => alternar(u.id)}
                className={
                  participantes.includes(u.id)
                    ? 'flex items-center gap-2 border border-tinta/60 bg-hueco px-3 py-2 text-left text-xs'
                    : 'flex items-center gap-2 border border-borde px-3 py-2 text-left text-meta text-suave transition-colors hover:border-suave'
                }
              >
                <span
                  className={
                    participantes.includes(u.id)
                      ? 'h-2 w-2 shrink-0 bg-signal'
                      : 'h-2 w-2 shrink-0 border border-borde2'
                  }
                />
                <span className="truncate">
                  {u.nombre}
                  {externos.some((x) => x.id === u.id) && ' · de afuera'}
                </span>
              </button>
            ))}
          </div>
        </Campo>

        <Campo
          etiqueta="Sumar a alguien de afuera"
          ayuda="Entra sólo a esta reunión: no ve el resto de las minutas de la sala."
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="w-full"
              placeholder="Nombre"
              aria-label="Nombre de la persona invitada"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
            <input
              type="email"
              className="w-full"
              placeholder="Correo"
              aria-label="Correo de la persona invitada"
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
            />
            <Boton
              type="button"
              onClick={async () => {
                if (!nuevoEmail.trim()) return
                await sumarInvitado(reunion.id, nuevoNombre, nuevoEmail)
                setNuevoNombre('')
                setNuevoEmail('')
                onCerrar()
              }}
            >
              <UserPlus size={12} /> Sumar
            </Boton>
          </div>
        </Campo>

        <label className="flex items-start gap-2.5 border border-borde p-3 text-xs">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={privada}
            onChange={(e) => setPrivada(e.target.checked)}
          />
          <span>
            <span className="block text-tinta">Reunión privada</span>
            <span className="mt-0.5 block text-tenue">
              No se lista para el resto de la sala: la ven sólo quienes participan.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="solido">
            Guardar
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
