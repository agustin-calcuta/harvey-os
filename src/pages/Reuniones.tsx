import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarPlus, Plus } from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  agendaDe,
  integrantes,
  cuentaRegresiva,
  deadlineAgenda,
  fechaCorta,
  hora,
  minutosAgenda,
  nombreDe,
  ordenarReuniones,
  paraInputDateTime,
  temasDe,
} from '../lib/utils'
import { ESTADO_REUNION, type EstadoReunion } from '../types'
import {
  Avatares,
  Boton,
  Campo,
  Chip,
  Modal,
  Seccion,
  Vacio,
} from '../components/ui'

const FILTROS: { valor: EstadoReunion | 'todas'; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'agenda_abierta', texto: 'Agenda abierta' },
  { valor: 'agenda_cerrada', texto: 'Agenda cerrada' },
  { valor: 'en_curso', texto: 'En curso' },
  { valor: 'cerrada', texto: 'Cerradas' },
]

export default function Reuniones() {
  const { estado, puedeOrganizar, salaActiva } = useApp()
  // Las métricas del panel entran acá con el estado ya filtrado.
  const [params] = useSearchParams()
  const [filtro, setFiltro] = useState<EstadoReunion | 'todas'>(() => {
    const e = params.get('estado')
    return e && e in ESTADO_REUNION ? (e as EstadoReunion) : 'todas'
  })
  const [creando, setCreando] = useState(false)

  const deLaSala = estado.reuniones.filter((r) => r.salaId === salaActiva?.id)
  const lista = ordenarReuniones(
    filtro === 'todas' ? deLaSala : deLaSala.filter((r) => r.estado === filtro),
  )

  return (
    <div className="space-y-6">
      <Seccion
        kicker={salaActiva?.nombre ?? "Agenda del equipo"}
        titulo="Reuniones"
        acciones={
          puedeOrganizar && (
            <Boton variante="solido" onClick={() => setCreando(true)}>
              <Plus size={13} /> Nueva reunión
            </Boton>
          )
        }
      >
        {/* En móvil se desplazan en horizontal en vez de apilarse en varias filas. */}
        <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={
                filtro === f.valor
                  ? 'shrink-0 whitespace-nowrap border border-tinta bg-tinta px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-fondo'
                  : 'shrink-0 whitespace-nowrap border border-borde2 px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-suave transition-colors hover:border-suave hover:text-tinta'
              }
            >
              {f.texto}
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <Vacio
            titulo="No hay reuniones"
            texto="Todavía no se creó ninguna reunión con este filtro."
            icono={<CalendarPlus size={32} />}
          />
        ) : (
          <div className="space-y-3">
            {lista.map((r) => {
              const agenda = agendaDe(estado, r.id)
              const propuestos = temasDe(estado, r.id).filter((t) => t.estado === 'propuesto')
              const total = minutosAgenda(agenda)
              const excedido = total > r.duracionPrevistaMin
              const cd = cuentaRegresiva(deadlineAgenda(r))

              return (
                <Link
                  key={r.id}
                  to={`/reuniones/${r.id}`}
                  className="card group block p-5 transition-colors hover:border-signal"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Chip
                          tono={
                            r.estado === 'en_curso'
                              ? 'signal'
                              : r.estado === 'agenda_abierta'
                                ? 'acid'
                                : r.estado === 'agenda_cerrada'
                                  ? 'amber'
                                  : r.estado === 'cerrada'
                                    ? 'cold'
                                    : 'neutro'
                          }
                        >
                          {r.estado === 'en_curso' && (
                            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-signal" />
                          )}
                          {ESTADO_REUNION[r.estado].nombre}
                        </Chip>
                        {r.estado === 'agenda_abierta' && !r.cierreManual && (
                          <span
                            className={
                              cd.vencido
                                ? 'font-semibold text-[10px] uppercase tracking-[0.14em] text-signal'
                                : 'font-semibold text-[10px] uppercase tracking-[0.14em] text-amber'
                            }
                          >
                            {cd.vencido ? 'Plazo vencido' : `Cierra en ${cd.texto}`}
                          </span>
                        )}
                      </div>

                      <h3 className="display text-xl transition-colors group-hover:text-signal sm:text-2xl">
                        {r.titulo}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-suave">
                        <span>
                          {fechaCorta(r.fecha)} · {hora(r.fecha)}
                        </span>
                        {r.lugar && <span>{r.lugar}</span>}
                        <span>Modera {nombreDe(estado, r.moderadorId)}</span>
                      </div>
                    </div>

                    <div className="flex w-full shrink-0 flex-row-reverse items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                      <Avatares
                        nombres={r.participantesIds
                          .map((id) => estado.usuarios.find((u) => u.id === id))
                          .filter(Boolean)
                          .map((u) => ({ nombre: u!.nombre, url: u!.avatarUrl }))}
                        max={4}
                      />
                      <div className="flex gap-4 font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
                        <span>{agenda.length} temas</span>
                        {propuestos.length > 0 && (
                          <span className="text-amber">{propuestos.length} por aprobar</span>
                        )}
                        <span className={excedido ? 'text-signal' : ''}>
                          {total}/{r.duracionPrevistaMin} min
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Seccion>

      <ModalNuevaReunion abierto={creando} onCerrar={() => setCreando(false)} />
    </div>
  )
}

/* ── Alta de reunión ──────────────────────────────────────── */

function ModalNuevaReunion({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { estado, crearReunion, salaActiva, yo } = useApp()
  const navegar = useNavigate()

  /* La sala define los valores por defecto de sus reuniones. */
  const gente = salaActiva ? integrantes(estado, salaActiva.id) : []

  const proximoLunes = () => {
    const d = new Date()
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
    d.setHours(10, 0, 0, 0)
    return paraInputDateTime(d.toISOString())
  }

  const siguiente =
    estado.reuniones.filter((r) => r.salaId === salaActiva?.id).length + 1
  const [titulo, setTitulo] = useState(`${salaActiva?.nombre ?? 'Reunión'} · #${siguiente}`)
  const [fecha, setFecha] = useState(proximoLunes())
  const [duracion, setDuracion] = useState(salaActiva?.duracionReunionDefaultMin ?? 60)
  const [lugar, setLugar] = useState(salaActiva?.lugarHabitual ?? '')
  const [moderadorId, setModeradorId] = useState(yo?.id ?? gente[0]?.id ?? '')
  const [horasCierre, setHorasCierre] = useState(salaActiva?.horasCierreAgenda ?? 24)
  const [cierreManual, setCierreManual] = useState(salaActiva?.cierreManual ?? false)
  const [participantes, setParticipantes] = useState<string[]>(gente.map((u) => u.id))

  const alternar = (id: string) =>
    setParticipantes((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await crearReunion({
      titulo,
      fecha: new Date(fecha).toISOString(),
      duracionPrevistaMin: duracion,
      lugar: lugar || undefined,
      moderadorId,
      horasCierreAgenda: horasCierre,
      cierreManual,
      participantesIds: participantes,
      estado: 'agenda_abierta',
    })
    onCerrar()
    if (r) navegar(`/reuniones/${r.id}`)
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} kicker="Pre-reunión" titulo="Nueva reunión">
      <form onSubmit={enviar} className="space-y-4">
        <Campo etiqueta="Título">
          <input
            className="w-full"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha y hora">
            <input
              type="datetime-local"
              className="w-full"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
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
              {gente.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo
          etiqueta="El temario cierra"
          ayuda="Con cierre a mano no hay plazo: se aceptan temas hasta que lo cierres."
        >
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCierreManual(true)}
              className={
                cierreManual
                  ? 'border border-tinta bg-tinta px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fondo'
                  : 'border border-borde2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:border-suave hover:text-tinta'
              }
            >
              A mano
            </button>
            {[12, 24, 48].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setCierreManual(false)
                  setHorasCierre(h)
                }}
                className={
                  !cierreManual && horasCierre === h
                    ? 'border border-tinta bg-tinta px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-fondo'
                    : 'border border-borde2 px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] text-suave transition-colors hover:border-suave hover:text-tinta'
                }
              >
                {h} h antes
              </button>
            ))}
          </div>
        </Campo>

        <Campo etiqueta={`Participantes (${participantes.length})`}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {gente.map((u) => (
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
            Crear y abrir agenda
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
