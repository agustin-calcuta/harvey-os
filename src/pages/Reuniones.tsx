import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarPlus, Lock, Plus, Search, UserPlus, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  agendaDe,
  buscarEnMinutas,
  fechaCorta,
  fechaLarga,
  historialReuniones,
  hora,
  integrantes,
  lugaresDe,
  nombreDe,
  paraInputDateTime,
  proximasReuniones,
  sala,
  temasDe,
} from '../lib/utils'
import { ESTADO_REUNION, RECURRENCIAS, type Recurrencia, type Reunion } from '../types'
import { Avatares, Boton, Campo, Chip, Modal, Seccion, Vacio } from '../components/ui'
import {
  BarraFiltros,
  FiltroFecha,
  FiltroSala,
  enRango,
  textoRango,
  type Rango,
} from '../components/Filtros'
import { useFiltros } from '../store/Filtros'

/* ─────────────────────────────────────────────────────────────
   Reuniones.

   Dos vistas y no una lista larga: "para mí hay próximas
   reuniones y reuniones que ya ocurrieron". De una serie que se
   repite se muestra sólo la primera, y el historial se recorre
   como un extracto, con un buscador que entra en las minutas.

   Trae todas mis salas de entrada, y el buscador también: "que
   el buscador abarque todas las salas y que se vea de cuál sale
   cada minuta". Después se filtra por sala y por fecha.
   ───────────────────────────────────────────────────────────── */

type Vista = 'proximas' | 'historial'

export default function Reuniones() {
  const { estado, yo, misSalas, salasDondeSoyDelEquipo } = useApp()
  /* El externo participa de las reuniones a las que lo convocan; no las arma. */
  const puedeCrearReuniones = salasDondeSoyDelEquipo.length > 0
  const [params, setParams] = useSearchParams()

  const [vista, setVista] = useState<Vista>(
    params.get('vista') === 'historial' ? 'historial' : 'proximas',
  )
  const [creando, setCreando] = useState(params.get('nueva') === '1')
  const [busqueda, setBusqueda] = useState('')
  /* Los filtros son de toda la app: lo que ponés acá sigue puesto allá. */
  const { sala: salaFiltro, elegirSala: setSalaFiltro, rango, elegirRango: setRango } = useFiltros()

  /* El panel entra acá con la vista ya elegida. */
  useEffect(() => {
    if (params.get('nueva') === '1') {
      setCreando(true)
      params.delete('nueva')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  /*
   * El historial mira para atrás, así que "de hoy en adelante" lo
   * dejaría vacío: ahí el filtro de fecha arranca sin recorte y el
   * usuario elige si quiere la última semana o el último mes.
   */
  const rangoHistorial = useMemo<Rango>(
    () => (rango.periodo === 'adelante' ? { periodo: 'todo' } : rango),
    [rango],
  )

  const unaSala = salaFiltro === 'todas' ? undefined : salaFiltro
  const proximas = proximasReuniones(estado, yo, unaSala).filter((r) => enRango(r.fecha, rango))
  const historial = historialReuniones(estado, yo, unaSala).filter((r) =>
    enRango(r.fecha, rangoHistorial),
  )
  const coincidencias = useMemo(
    () =>
      buscarEnMinutas(estado, busqueda, yo, unaSala).filter((c) =>
        enRango(c.reunion.fecha, rangoHistorial),
      ),
    [estado, busqueda, yo, unaSala, rangoHistorial],
  )
  const enBusqueda = busqueda.trim().length >= 2

  return (
    <div className="space-y-6">
      <Seccion
        kicker="Agenda de mis equipos"
        titulo="Reuniones"
        principal
        acciones={
          puedeCrearReuniones ? (
            <Boton variante="destacado" onClick={() => setCreando(true)}>
              <Plus size={13} /> Crear reunión
            </Boton>
          ) : undefined
        }
      >
        {/* ── Próximas / Historial ── */}
        <div role="tablist" aria-label="Vista de reuniones" className="mb-5 flex gap-1.5">
          {(
            [
              ['proximas', 'Próximas'],
              ['historial', 'Historial'],
            ] as const
          ).map(([v, texto]) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={
                vista === v
                  ? 'border border-tinta bg-tinta px-4 py-2 font-semibold text-meta text-fondo'
                  : 'border border-borde2 px-4 py-2 font-semibold text-meta text-suave transition-colors hover:border-suave hover:text-tinta'
              }
            >
              {texto}
            </button>
          ))}
        </div>

        <BarraFiltros>
          <FiltroSala valor={salaFiltro} onChange={setSalaFiltro} salas={misSalas} />
          <FiltroFecha
            valor={vista === 'historial' ? rangoHistorial : rango}
            onChange={setRango}
          />
        </BarraFiltros>

        {vista === 'proximas' ? (
          proximas.length === 0 ? (
            <Vacio
              titulo="No hay reuniones a la vista"
              texto={
                rango.periodo !== 'adelante' || salaFiltro !== 'todas'
                  ? `Ninguna reunión ${textoRango(rango)}${
                      salaFiltro === 'todas' ? '' : ' en esa sala'
                    }. Probá ampliando los filtros.`
                  : puedeCrearReuniones
                    ? 'Creá la próxima para que el equipo empiece a cargar temas.'
                    : 'Cuando te convoquen a una, la vas a ver acá.'
              }
              icono={<CalendarPlus size={32} />}
              accion={
                puedeCrearReuniones ? (
                  <Boton variante="destacado" onClick={() => setCreando(true)}>
                    <Plus size={13} /> Crear reunión
                  </Boton>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {proximas.map((r) => (
                <Fila key={r.id} reunion={r} />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {/* ── Buscar en las minutas ── */}
            <div className="card flex items-center gap-3 px-4 py-3">
              <Search size={16} className="shrink-0 text-suave" aria-hidden />
              {/* type="text" a propósito: en WebKit, `search` dibuja su
                  propia cruz y quedaban dos, una al lado de la otra. */}
              <input
                type="text"
                className="w-full border-0 bg-transparent p-0 focus:ring-0"
                placeholder="Buscar una palabra en todas las minutas"
                aria-label="Buscar una palabra en todas las minutas"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="shrink-0 text-suave hover:text-tinta"
                  aria-label="Limpiar la búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {enBusqueda ? (
              coincidencias.length === 0 ? (
                <Vacio
                  titulo="Sin resultados"
                  texto={`Ninguna minuta menciona «${busqueda.trim()}».`}
                  icono={<Search size={32} />}
                />
              ) : (
                <>
                  <p className="text-meta text-suave">
                    {coincidencias.length}{' '}
                    {coincidencias.length === 1 ? 'minuta menciona' : 'minutas mencionan'} «
                    {busqueda.trim()}».
                  </p>
                  <div className="space-y-3">
                    {coincidencias.map(({ reunion, donde }) => (
                      <Fila key={reunion.id} reunion={reunion} donde={donde} />
                    ))}
                  </div>
                </>
              )
            ) : historial.length === 0 ? (
              <Vacio
                titulo="Todavía no hay historial"
                texto={
                  rangoHistorial.periodo === 'todo' && salaFiltro === 'todas'
                    ? 'Acá van a quedar todas las reuniones cerradas, de la más nueva a la más vieja.'
                    : `Ninguna reunión cerrada ${textoRango(rangoHistorial)}${
                        salaFiltro === 'todas' ? '' : ' en esa sala'
                      }.`
                }
                icono={<CalendarPlus size={32} />}
              />
            ) : (
              <ul className="card divide-y divide-borde">
                {historial.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/reuniones/${r.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-hueco"
                    >
                      <span className="w-20 shrink-0 font-semibold text-meta text-tenue">
                        {fechaCorta(r.fecha)}
                      </span>
                      <span className="min-w-0 flex-1 basis-[60%] truncate text-sm sm:basis-auto">
                        {r.titulo}
                      </span>
                      {salaFiltro === 'todas' && (
                        <span className="text-meta text-tenue">
                          {estado.salas.find((s) => s.id === r.salaId)?.nombre}
                        </span>
                      )}
                      <span className="font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
                        {agendaDe(estado, r.id).length} temas
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Seccion>

      <ModalNuevaReunion abierto={creando} onCerrar={() => setCreando(false)} />
    </div>
  )
}

/* ── Una reunión en la lista ──────────────────────────────── */

function Fila({ reunion: r, donde }: { reunion: Reunion; donde?: string[] }) {
  const { estado } = useApp()
  const agenda = agendaDe(estado, r.id)
  const propuestos = temasDe(estado, r.id).filter((t) => t.estado === 'propuesto')

  return (
    <Link
      to={`/reuniones/${r.id}`}
      className="card group block p-4 transition-colors hover:border-signal"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Chip>{sala(estado, r.salaId)?.nombre ?? 'Sin sala'}</Chip>
            <Chip
              tono={
                r.estado === 'en_curso'
                  ? 'signal'
                  : r.estado === 'agenda_abierta'
                    ? 'acid'
                    : r.estado === 'agenda_cerrada'
                      ? 'amber'
                      : 'cold'
              }
            >
              {r.estado === 'en_curso' && (
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-signal" />
              )}
              {ESTADO_REUNION[r.estado].nombre}
            </Chip>
            {r.privada && (
              <Chip tono="neutro" title="Sólo la ven quienes participan">
                <Lock size={9} /> Privada
              </Chip>
            )}
          </div>

          <h3 className="text-base transition-colors group-hover:text-signal sm:text-lg">
            {r.titulo}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-suave">
            <span>
              {fechaLarga(r.fecha)} · {hora(r.fecha)}
            </span>
            {r.lugar && <span>{r.lugar}</span>}
            <span>Modera {nombreDe(estado, r.moderadorId)}</span>
          </div>

          {donde && donde.length > 0 && (
            <p className="mt-2 text-meta text-tenue">Aparece en: {donde.slice(0, 3).join(' · ')}</p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-row-reverse items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
          <Avatares
            nombres={r.participantesIds
              .map((id) => estado.usuarios.find((u) => u.id === id))
              .filter(Boolean)
              .map((u) => ({ nombre: u!.nombre, url: u!.avatarUrl }))}
            max={4}
          />
          <div className="flex gap-3 font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
            <span>{agenda.length} temas</span>
            {propuestos.length > 0 && (
              <span className="text-amber">{propuestos.length} por aprobar</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Alta de reunión ──────────────────────────────────────── */

const OTRO = '__otro__'

/**
 * Alta de reunión.
 *
 * Con el selector de sala fuera de la barra lateral, la sala es lo
 * primero que se elige acá: de ella salen los participantes, los
 * lugares habituales y la duración de siempre.
 */
function ModalNuevaReunion({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { estado, crearReunion, asegurarPersona, salasDondeSoyDelEquipo: misSalas, yo } = useApp()

  const [salaId, setSalaId] = useState(misSalas[0]?.id ?? '')
  const laSala = misSalas.find((s) => s.id === salaId) ?? misSalas[0]

  const gente = laSala ? integrantes(estado, laSala.id) : []
  const lugares = lugaresDe(estado, laSala?.id)

  const proximoLunes = () => {
    const d = new Date()
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
    d.setHours(10, 0, 0, 0)
    return paraInputDateTime(d.toISOString())
  }

  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(proximoLunes())
  const [duracion, setDuracion] = useState(laSala?.duracionReunionDefaultMin ?? 60)
  const [lugar, setLugar] = useState(lugares[0] ?? OTRO)
  const [otroLugar, setOtroLugar] = useState('')
  const [moderadorId, setModeradorId] = useState(yo?.id ?? gente[0]?.id ?? '')
  const [recurrencia, setRecurrencia] = useState<Recurrencia>('unica')
  const [privada, setPrivada] = useState(false)
  /* Desmarcados a propósito: se marca quién va, no quién no va. */
  const [participantes, setParticipantes] = useState<string[]>([])
  const [invitados, setInvitados] = useState<{ nombre: string; email: string }[]>([])
  const [sumandoInvitado, setSumandoInvitado] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')

  /*
   * Al abrir, y cada vez que se cambia de sala, se rearma lo que
   * depende de ella: el título numerado, la duración y el lugar. El
   * título se respeta si ya lo escribieron a mano.
   */
  const sugerido = laSala
    ? `${laSala.nombre} · #${estado.reuniones.filter((r) => r.salaId === laSala.id).length + 1}`
    : ''
  const tituloPropio = useRef(false)
  useEffect(() => {
    if (!abierto || !laSala) return
    if (!tituloPropio.current) setTitulo(sugerido)
    setDuracion(laSala.duracionReunionDefaultMin)
    setLugar(lugaresDe(estado, laSala.id)[0] ?? OTRO)
    setParticipantes([])
  }, [abierto, laSala, sugerido, estado])

  const alternar = (id: string) =>
    setParticipantes((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const agregarInvitado = () => {
    const email = nuevoEmail.trim().toLowerCase()
    if (!email) return
    setInvitados((v) => [...v, { nombre: nuevoNombre.trim() || email, email }])
    setNuevoNombre('')
    setNuevoEmail('')
    setSumandoInvitado(false)
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    // Los de afuera se dan de alta ahora y entran sólo a esta reunión.
    const ids = [...participantes]
    for (const inv of invitados) {
      const persona = await asegurarPersona(inv.nombre, inv.email)
      if (persona && !ids.includes(persona.id)) ids.push(persona.id)
    }
    const r = await crearReunion({
      salaId: laSala?.id,
      titulo,
      fecha: new Date(fecha).toISOString(),
      duracionPrevistaMin: duracion,
      lugar: (lugar === OTRO ? otroLugar.trim() : lugar) || undefined,
      moderadorId,
      recurrencia,
      privada,
      participantesIds: ids,
      estado: 'agenda_abierta',
    })
    onCerrar()
    // Se queda en la lista: el que arma dos o tres seguidas no quiere
    // volver atrás cada vez. La reunión nueva ya aparece acá.
    void r
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Crear reunión">
      <form onSubmit={enviar} className="space-y-4">
        {misSalas.length > 1 && (
          <Campo etiqueta="Sala" ayuda="De acá salen los participantes y los lugares de siempre.">
            <select
              className="w-full"
              value={salaId}
              onChange={(e) => setSalaId(e.target.value)}
              required
            >
              {misSalas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo etiqueta="Título">
          <input
            className="w-full"
            value={titulo}
            onChange={(e) => {
              tituloPropio.current = true
              setTitulo(e.target.value)
            }}
            required
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha y hora">
            <input
              type="datetime-local"
              lang="es-AR"
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

        <Campo etiqueta="Se repite">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(RECURRENCIAS) as Recurrencia[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecurrencia(r)}
                className={
                  recurrencia === r
                    ? 'border border-tinta bg-tinta px-3 py-2 font-semibold text-meta text-fondo'
                    : 'border border-borde2 px-3 py-2 font-semibold text-meta text-suave transition-colors hover:border-suave hover:text-tinta'
                }
              >
                {RECURRENCIAS[r].nombre}
              </button>
            ))}
          </div>
        </Campo>

        {/* ── Participantes ── */}
        <Campo
          etiqueta={`Quiénes participan (${participantes.length + invitados.length})`}
          ayuda="Marcá a quiénes convocás. Podés sumar a alguien de afuera: entra a esta reunión y no ve el resto de la sala."
        >
          <div className="grid gap-1.5 sm:grid-cols-2">
            {gente.map((u) => (
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
                <span className="truncate">{u.nombre}</span>
              </button>
            ))}
            {invitados.map((inv, i) => (
              <span
                key={inv.email}
                className="flex items-center gap-2 border border-cold/50 bg-cold/5 px-3 py-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate">{inv.nombre} · de afuera</span>
                <button
                  type="button"
                  onClick={() => setInvitados((v) => v.filter((_, j) => j !== i))}
                  aria-label={`Sacar a ${inv.nombre}`}
                  className="shrink-0 text-suave hover:text-signal"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {sumandoInvitado ? (
            <div className="mt-2 grid gap-2 border border-borde p-3 sm:grid-cols-[1fr_1fr_auto]">
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
              <Boton type="button" tam="sm" onClick={agregarInvitado}>
                Sumar
              </Boton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSumandoInvitado(true)}
              className="mt-2 flex items-center gap-1.5 border border-dashed border-borde2 px-3 py-2 font-semibold text-meta text-suave transition-colors hover:border-signal hover:text-signal"
            >
              <UserPlus size={12} /> Sumar a alguien de afuera
            </button>
          )}
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
            Crear reunión
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
