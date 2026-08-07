import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Play, Trash2, Unlock } from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  fechaLarga,
  hora,
  nombreDe,
  paraInputDateTime,
} from '../lib/utils'
import { ESTADO_REUNION, type EstadoReunion, type Reunion } from '../types'
import { Avatares, Boton, Campo, Chip, Confirmar, Modal, Vacio } from '../components/ui'
import FasePre from '../components/reunion/FasePre'
import FaseVivo from '../components/reunion/FaseVivo'
import FasePost from '../components/reunion/FasePost'

type Fase = 'pre' | 'vivo' | 'post'

const FASES: { id: Fase; num: string; texto: string }[] = [
  { id: 'pre', num: '01', texto: 'Pre-reunión' },
  { id: 'vivo', num: '02', texto: 'Reunión' },
  { id: 'post', num: '03', texto: 'Post-reunión' },
]

/** Fase que corresponde según el estado de la reunión. */
function faseSugerida(e: EstadoReunion): Fase {
  if (e === 'borrador' || e === 'agenda_abierta') return 'pre'
  if (e === 'en_curso') return 'vivo'
  if (e === 'cerrada') return 'post'
  return 'pre'
}

export default function ReunionDetalle() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const {
    estado,
    puedeModerar,
    puedeOrganizar,
    iniciarReunion,
    abrirAgenda,
    borrarReunion,
  } = useApp()

  const reunion = estado.reuniones.find((r) => r.id === id)
  const [fase, setFase] = useState<Fase>(() =>
    reunion ? faseSugerida(reunion.estado) : 'pre',
  )
  const [editando, setEditando] = useState(false)
  const [porBorrar, setPorBorrar] = useState(false)

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
            </div>

            <h1 className="display text-3xl sm:text-4xl">{reunion.titulo}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-suave">
              <span>
                {fechaLarga(reunion.fecha)} · {hora(reunion.fecha)}
              </span>
              {reunion.lugar && <span>{reunion.lugar}</span>}
              <span>Modera {nombreDe(estado, reunion.moderadorId)}</span>
              <span>{reunion.duracionPrevistaMin} min previstos</span>
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
              {reunion.estado === 'borrador' && puedeOrganizar && (
                <Boton tam="sm" variante="solido" onClick={() => abrirAgenda(reunion.id)}>
                  <Unlock size={12} /> Abrir agenda
                </Boton>
              )}
              {reunion.estado === 'agenda_cerrada' && moderador && (
                <Boton
                  tam="sm"
                  variante="solido"
                  onClick={() => {
                    void iniciarReunion(reunion.id)
                    setFase('vivo')
                  }}
                >
                  <Play size={12} /> Iniciar reunión
                </Boton>
              )}
              {puedeOrganizar && (
                <>
                  <Boton tam="sm" variante="fantasma" onClick={() => setEditando(true)}>
                    <Pencil size={12} />
                  </Boton>
                  <Boton tam="sm" variante="fantasma" onClick={() => setPorBorrar(true)}>
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
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
          (reunion.estado === 'borrador' || reunion.estado === 'agenda_abierta' ? (
            <Vacio
              titulo="La reunión todavía no empezó"
              texto="Cerrá el temario en la pre-reunión y después iniciá la sesión."
              accion={<Boton onClick={() => setFase('pre')}>Ir a pre-reunión</Boton>}
            />
          ) : (
            <FaseVivo reunion={reunion} />
          ))}
        {fase === 'post' &&
          (reunion.estado === 'borrador' || reunion.estado === 'agenda_abierta' ? (
            <Vacio
              titulo="Todavía no hay minuta"
              texto="La minuta se arma con lo que se registre durante la reunión."
              accion={<Boton onClick={() => setFase('pre')}>Ir a pre-reunión</Boton>}
            />
          ) : (
            <FasePost reunion={reunion} />
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
        texto={`Se elimina “${reunion.titulo}” junto con todos sus temas. Los compromisos quedan en el historial.`}
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
  const { estado, actualizarReunion } = useApp()
  const [titulo, setTitulo] = useState(reunion.titulo)
  const [fecha, setFecha] = useState(paraInputDateTime(reunion.fecha))
  const [duracion, setDuracion] = useState(reunion.duracionPrevistaMin)
  const [lugar, setLugar] = useState(reunion.lugar ?? '')
  const [moderadorId, setModeradorId] = useState(reunion.moderadorId)
  const [horasCierre, setHorasCierre] = useState(reunion.horasCierreAgenda)
  const [participantes, setParticipantes] = useState<string[]>(reunion.participantesIds)
  const [est, setEst] = useState<EstadoReunion>(reunion.estado)

  const alternar = (id: string) =>
    setParticipantes((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    await actualizarReunion(reunion.id, {
      titulo,
      fecha: new Date(fecha).toISOString(),
      duracionPrevistaMin: duracion,
      lugar: lugar || undefined,
      moderadorId,
      horasCierreAgenda: horasCierre,
      participantesIds: participantes,
      estado: est,
    })
    onCerrar()
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} kicker="Ajustes" titulo="Editar reunión">
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
            <input className="w-full" value={lugar} onChange={(e) => setLugar(e.target.value)} />
          </Campo>
          <Campo etiqueta="Modera">
            <select
              className="w-full"
              value={moderadorId}
              onChange={(e) => setModeradorId(e.target.value)}
            >
              {estado.usuarios.filter((u) => u.activo).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="El temario cierra (h antes)">
            <input
              type="number"
              min={1}
              className="w-full"
              value={horasCierre}
              onChange={(e) => setHorasCierre(Number(e.target.value))}
            />
          </Campo>
          <Campo etiqueta="Estado" ayuda="Sirve para volver atrás en la demo.">
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

        <Campo etiqueta={`Participantes (${participantes.length})`}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {estado.usuarios
              .filter((u) => u.activo)
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => alternar(u.id)}
                  className={
                    participantes.includes(u.id)
                      ? 'flex items-center gap-2 border border-tinta/60 bg-hueco px-3 py-2 text-left text-xs'
                      : 'flex items-center gap-2 border border-borde px-3 py-2 text-left text-xs text-suave transition-colors hover:border-suave'
                  }
                >
                  <span
                    className={
                      participantes.includes(u.id)
                        ? 'h-2 w-2 shrink-0 bg-signal'
                        : 'h-2 w-2 shrink-0 border border-borde2'
                    }
                  />
                  <span className="truncate">{u.nombre}</span>
                </button>
              ))}
          </div>
        </Campo>

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
