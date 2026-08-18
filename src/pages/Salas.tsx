import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Clock,
  DoorOpen,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  claveNombre,
  dejariaSinOrganizador,
  fechaCorta,
  integrantes,
  nombreDe,
  proximasReuniones,
  puedeVerReunion,
  relativo,
  reunionesDe,
  rolEnSala,
  salasParecidas,
  solicitudesDe,
  uid,
} from '../lib/utils'
import { ROLES_SALA, type RolSala, type Sala, type SalaAjena, type Usuario } from '../types'
import {
  Avatares,
  Boton,
  Campo,
  Chip,
  Confirmar,
  Etiqueta,
  Modal,
  Seccion,
  Segmentado,
  Vacio,
} from '../components/ui'

/* ─────────────────────────────────────────────────────────────
   Las salas: un espacio por equipo, con su gente y sus reuniones.
   Quien crea una sala la organiza; a partir de ahí suma a los
   suyos y define qué puede hacer cada uno ahí adentro.

   Si el nombre que se está por crear ya existe, se avisa antes y
   se ofrece pedir entrada en vez de armar una segunda igual.
   ───────────────────────────────────────────────────────────── */

export default function Salas() {
  const {
    estado,
    yo,
    misSalas,
    elegirSala,
    esSuperadmin,
    puedeCrearSalas,
    salirDeSala,
    solicitudesPendientes,
    misSolicitudes,
    retirarSolicitud,
    cargarDirectorio,
  } = useApp()
  const navegar = useNavigate()
  const [creando, setCreando] = useState(false)
  const [gestionando, setGestionando] = useState<Sala | undefined>()
  const [editando, setEditando] = useState<Sala | undefined>()
  const [porSalir, setPorSalir] = useState<Sala | undefined>()

  const trabada = porSalir && yo ? dejariaSinOrganizador(estado, porSalir.id, yo.id) : false

  /*
   * De una sala a la que todavía no pertenezco no llega ni el nombre:
   * las políticas la ocultan. Para poder decir qué estoy esperando, se
   * lee del directorio.
   */
  const [nombresAjenos, setNombresAjenos] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!misSolicitudes.length) return
    let vivo = true
    void cargarDirectorio().then((d) => {
      if (vivo) setNombresAjenos(Object.fromEntries(d.map((s) => [s.id, s.nombre])))
    })
    return () => {
      vivo = false
    }
  }, [misSolicitudes.length, cargarDirectorio])

  return (
    <div className="space-y-6">
      {/* Lo primero: gente esperando que le abras la puerta. */}
      {solicitudesPendientes.length > 0 && <Pedidos />}

      <Seccion
        titulo="Salas"
        principal
        acciones={
          /* Abrir salas es de los socios; reuniones crea cualquiera. */
          puedeCrearSalas && (
            <Boton variante="solido" onClick={() => setCreando(true)}>
              <Plus size={13} /> Nueva sala
            </Boton>
          )
        }
      >
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-suave">
          Cada sala es un equipo con sus reuniones y sus tareas. Sólo ves las salas de las que
          formás parte, y tu rol puede ser distinto en cada una.
        </p>

        {misSalas.length === 0 ? (
          <Vacio
            titulo="Todavía no estás en ninguna sala"
            texto={
              puedeCrearSalas
                ? 'Creá la de tu equipo y sumá a los tuyos, o pedí entrar a una que ya exista.'
                : 'Las salas las abren los socios. Pedile a quien organiza tu equipo que te sume.'
            }
            icono={<DoorOpen size={32} />}
            accion={
              puedeCrearSalas && (
                <Boton variante="solido" onClick={() => setCreando(true)}>
                  <Plus size={13} /> Crear la primera
                </Boton>
              )
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {misSalas.map((s) => {
              const gente = integrantes(estado, s.id)
              // Filtradas por lo que me toca ver: las privadas ajenas no cuentan.
              const visibles = reunionesDe(estado, s.id).filter((r) => puedeVerReunion(estado, r, yo))
              const proxima = proximasReuniones(estado, yo, s.id)[0]
              const total = visibles.length
              const miRol = esSuperadmin ? 'organizador' : rolEnSala(estado, s.id, yo?.id)
              const organizo = miRol === 'organizador'
              const pidiendo = solicitudesDe(estado, s.id).length

              return (
                <div key={s.id} className="card flex flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Chip tono={esSuperadmin ? 'cold' : organizo ? 'amber' : 'neutro'}>
                          {esSuperadmin ? 'Superadmin' : miRol ? ROLES_SALA[miRol].nombre : 'Sin rol'}
                        </Chip>
                        {organizo && pidiendo > 0 && (
                          <Chip tono="signal">
                            {pidiendo} {pidiendo === 1 ? 'pide entrar' : 'piden entrar'}
                          </Chip>
                        )}
                        {s.cadencia && <span className="text-meta text-tenue">{s.cadencia}</span>}
                      </div>
                      <h3 className="text-lg">{s.nombre}</h3>
                      {s.descripcion && (
                        <p className="mt-1 text-sm leading-relaxed text-suave">{s.descripcion}</p>
                      )}
                    </div>
                    <Avatares
                      nombres={gente.map((u) => ({ nombre: u.nombre, url: u.avatarUrl }))}
                      max={4}
                    />
                  </div>

                  <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-meta text-tenue">
                    <span>
                      {gente.length} {gente.length === 1 ? 'persona' : 'personas'}
                    </span>
                    <span>
                      {total} {total === 1 ? 'reunión' : 'reuniones'}
                    </span>
                    {proxima ? (
                      <span>Próxima el {fechaCorta(proxima.fecha)}</span>
                    ) : (
                      <span>Sin reuniones programadas</span>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Boton
                      variante="solido"
                      tam="sm"
                      onClick={() => {
                        elegirSala(s.id)
                        navegar('/')
                      }}
                    >
                      Entrar <ArrowRight size={12} />
                    </Boton>
                    {/* Crear reuniones puede cualquiera de la sala. */}
                    <Boton
                      tam="sm"
                      onClick={() => {
                        elegirSala(s.id)
                        navegar('/reuniones?nueva=1')
                      }}
                    >
                      <Plus size={12} /> Crear reunión
                    </Boton>
                    {organizo && (
                      <>
                        <Boton tam="sm" onClick={() => setGestionando(s)}>
                          <Users size={12} /> Equipo
                        </Boton>
                        <Boton tam="sm" variante="fantasma" onClick={() => setEditando(s)}>
                          <Pencil size={12} />
                        </Boton>
                      </>
                    )}
                    {/* El superadmin mira de afuera: no es parte de ningún equipo. */}
                    {!esSuperadmin && (
                      <Boton
                        tam="sm"
                        variante="fantasma"
                        className="ml-auto"
                        onClick={() => setPorSalir(s)}
                        title="Salir de esta sala"
                      >
                        <LogOut size={11} /> Salir
                      </Boton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Seccion>

      {/* Pedidos propios todavía sin respuesta. */}
      {misSolicitudes.length > 0 && (
        <Seccion titulo="Esperando respuesta">
          <ul className="card divide-y divide-borde">
            {misSolicitudes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <Clock size={14} className="shrink-0 text-tenue" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    {nombresAjenos[s.salaId] ??
                      estado.salas.find((x) => x.id === s.salaId)?.nombre ??
                      'Sala'}
                  </div>
                  <div className="text-meta text-tenue">
                    Enviado {relativo(s.creadaEn)} · esperando al organizador
                  </div>
                </div>
                <Boton tam="sm" variante="fantasma" onClick={() => retirarSolicitud(s.id)}>
                  Retirar
                </Boton>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <ModalSala abierto={creando} onCerrar={() => setCreando(false)} />
      <ModalSala abierto={!!editando} onCerrar={() => setEditando(undefined)} sala={editando} />
      <ModalEquipo
        abierto={!!gestionando}
        onCerrar={() => setGestionando(undefined)}
        sala={gestionando}
      />

      <Confirmar
        abierto={!!porSalir}
        titulo={trabada ? 'No podés salir todavía' : 'Salir de la sala'}
        texto={
          trabada
            ? `Sos el único organizador de «${porSalir?.nombre}». Pasale el rol a alguien del equipo y después salí.`
            : `Dejás de ver «${porSalir?.nombre}», sus reuniones y su temario. Tus tareas quedan registradas, y podés volver a pedir entrar cuando quieras.`
        }
        textoBoton={trabada ? 'Entendido' : 'Salir de la sala'}
        peligro={!trabada}
        onCancelar={() => setPorSalir(undefined)}
        onConfirmar={() => {
          if (porSalir && !trabada) void salirDeSala(porSalir.id)
          setPorSalir(undefined)
        }}
      />
    </div>
  )
}

/* ── Pedidos de entrada por resolver ──────────────────────── */

function Pedidos() {
  const { estado, solicitudesPendientes, resolverSolicitud } = useApp()

  return (
    <Seccion titulo="Pendientes de autorización">
      <ul className="grid gap-3 lg:grid-cols-2">
        {solicitudesPendientes.map((s) => {
          const quien = estado.usuarios.find((u) => u.id === s.usuarioId)
          const sala = estado.salas.find((x) => x.id === s.salaId)
          return (
            <li key={s.id} className="card border-signal/40 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Chip tono="signal">{sala?.nombre ?? 'Sala'}</Chip>
                <span className="text-meta text-tenue">{relativo(s.creadaEn)}</span>
              </div>
              <div className="mb-0.5 text-sm">{quien?.nombre ?? 'Alguien'}</div>
              <div className="mb-2 text-meta text-tenue">
                {quien?.cargo ? `${quien.cargo} · ` : ''}
                {quien?.email}
              </div>
              {s.mensaje && (
                <p className="mb-3 border-l-2 border-borde2 pl-3 text-xs leading-relaxed text-suave">
                  {s.mensaje}
                </p>
              )}
              <div className="flex flex-wrap gap-2 border-t border-borde pt-3">
                <Boton
                  tam="sm"
                  variante="solido"
                  onClick={() => resolverSolicitud(s.id, 'aceptada')}
                >
                  <Check size={12} /> Aceptar
                </Boton>
                <Boton
                  tam="sm"
                  variante="fantasma"
                  onClick={() => resolverSolicitud(s.id, 'rechazada')}
                >
                  <X size={12} /> Rechazar
                </Boton>
              </div>
            </li>
          )
        })}
      </ul>
    </Seccion>
  )
}

/* ── Alta y edición de sala ───────────────────────────────── */

function ModalSala({
  abierto,
  onCerrar,
  sala,
}: {
  abierto: boolean
  onCerrar: () => void
  sala?: Sala
}) {
  const {
    estado,
    yo,
    crearSala,
    actualizarSala,
    archivarSala,
    sumarAlaSala,
    asegurarPersona,
    cargarDirectorio,
    pedirEntrar,
    misSolicitudes,
    misSalas,
  } = useApp()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cadencia, setCadencia] = useState('')
  const [lugares, setLugares] = useState('')
  const [duracion, setDuracion] = useState(60)
  const [duracionTema, setDuracionTema] = useState(15)
  const [porArchivar, setPorArchivar] = useState(false)
  const [directorio, setDirectorio] = useState<SalaAjena[]>([])
  const [insistir, setInsistir] = useState(false)
  /* A quiénes sumar de entrada. En la edición se maneja desde Equipo. */
  const [invitados, setInvitados] = useState<string[]>([])
  /*
   * Gente de afuera del directorio, cargada acá mismo: "aunque el
   * sistema traiga las personas que ya están, tengo que poder sumar a
   * alguien nuevo mientras armo la sala". Se dan de alta al guardar y
   * el directorio queda actualizado.
   */
  const [nuevos, setNuevos] = useState<{ nombre: string; email: string }[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')

  /* Todo el mundo menos yo y menos las cuentas superadmin. */
  const disponibles = estado.usuarios.filter(
    (u) => u.activo && u.id !== yo?.id && u.alcance !== 'superadmin',
  )

  /*
   * El directorio dice qué salas existen, incluidas las que no ves por
   * no pertenecer: sin eso no habría manera de avisar que el nombre ya
   * está tomado. Se pide una sola vez, al abrir.
   */
  useEffect(() => {
    if (!abierto || sala) return
    let vivo = true
    void cargarDirectorio().then((d) => {
      if (vivo) setDirectorio(d)
    })
    return () => {
      vivo = false
    }
  }, [abierto, sala, cargarDirectorio])

  // Recarga los valores cada vez que se abre.
  const [ultimo, setUltimo] = useState<string | undefined>()
  if (abierto && ultimo !== (sala?.id ?? 'nueva')) {
    setUltimo(sala?.id ?? 'nueva')
    setNombre(sala?.nombre ?? '')
    setDescripcion(sala?.descripcion ?? '')
    setCadencia(sala?.cadencia ?? '')
    setLugares((sala?.lugares ?? []).join(', '))
    setDuracion(sala?.duracionReunionDefaultMin ?? 60)
    setDuracionTema(sala?.duracionTemaDefaultMin ?? 15)
    setInsistir(false)
    setInvitados([])
  }
  if (!abierto && ultimo !== undefined) setUltimo(undefined)

  /* Las salas donde ya estoy no son un choque de nombres: son las mías. */
  const parecidas = useMemo(
    () =>
      sala
        ? []
        : salasParecidas(
            directorio.filter((d) => !misSalas.some((m) => m.id === d.id)),
            nombre,
          ),
    [directorio, nombre, sala, misSalas],
  )
  const identica = parecidas.some((s) => claveNombre(s.nombre) === claveNombre(nombre))

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    // Con una sala del mismo nombre delante, primero se muestra; recién
    // si insiste se crea la segunda.
    if (identica && !insistir) {
      setInsistir(true)
      return
    }
    const lista = lugares
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)
    const datos = {
      nombre,
      descripcion: descripcion.trim() || undefined,
      cadencia: cadencia.trim() || undefined,
      lugares: lista,
      lugarHabitual: lista[0],
      duracionReunionDefaultMin: duracion,
      duracionTemaDefaultMin: duracionTema,
    }
    if (sala) await actualizarSala(sala.id, datos)
    else {
      const nueva = await crearSala(datos)
      if (nueva) {
        for (const id of invitados) await sumarAlaSala(nueva.id, id, 'miembro')
        for (const n of nuevos) {
          const persona = await asegurarPersona(n.nombre, n.email)
          if (persona) await sumarAlaSala(nueva.id, persona.id, 'miembro')
        }
        // Se queda acá: lo que sigue es sumar gente o abrirle una
        // reunión, y las dos cosas se hacen desde esta pantalla.
      }
    }
    onCerrar()
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={sala ? 'Editar sala' : 'Nueva sala'}>
      <form onSubmit={enviar} className="space-y-4">
        <Campo etiqueta="Nombre">
          <input
            className="w-full"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setInsistir(false)
            }}
            placeholder="Ej.: Marketing"
            required
            autoFocus
          />
        </Campo>

        {/* Ya existe una sala así: mejor entrar que duplicar. */}
        {parecidas.length > 0 && (
          <div className="border border-amber/50 bg-amber/10 p-3.5">
            <Etiqueta className="mb-2 text-amber">
              {identica ? 'Ese nombre ya está tomado' : 'Hay algo parecido'}
            </Etiqueta>
            <p className="mb-3 text-xs leading-relaxed text-suave">
              {identica
                ? 'Ya hay una sala con ese nombre. Si es la de tu equipo, pedí entrar en vez de crear una segunda.'
                : 'Fijate si alguna de estas es la que buscabas.'}
            </p>
            <ul className="space-y-1.5">
              {parecidas.map((s) => {
                const pedido = misSolicitudes.some((x) => x.salaId === s.id)
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 border border-borde bg-panel p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{s.nombre}</div>
                      <div className="text-meta text-tenue">
                        Organiza {s.organizador} · {s.integrantes}{' '}
                        {s.integrantes === 1 ? 'persona' : 'personas'}
                      </div>
                    </div>
                    {pedido ? (
                      <Chip tono="cold">
                        <Clock size={9} /> Pedido enviado
                      </Chip>
                    ) : (
                      <Boton
                        type="button"
                        tam="sm"
                        variante="solido"
                        onClick={async () => {
                          await pedirEntrar(s.id, descripcion.trim() || undefined)
                          onCerrar()
                        }}
                      >
                        Pedir unirme
                      </Boton>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <Campo etiqueta="De qué se trata">
          <textarea
            className="w-full resize-y"
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Quiénes participan y para qué se juntan."
          />
        </Campo>

        <Campo etiqueta="Cada cuánto se juntan" ayuda="Se sugiere al crear una reunión.">
          <input
            className="w-full"
            value={cadencia}
            onChange={(e) => setCadencia(e.target.value)}
            placeholder="Jueves 11:00"
          />
        </Campo>

        {/* ── A quiénes sumar ──
            Al crear la sala. Después se maneja desde Equipo. */}
        {!sala && disponibles.length > 0 && (
          <Campo
            etiqueta={`A quiénes sumás (${invitados.length})`}
            ayuda="Podés sumar más gente en cualquier momento."
          >
            <div className="grid max-h-52 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {disponibles.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={invitados.includes(u.id)}
                  onClick={() =>
                    setInvitados((v) =>
                      v.includes(u.id) ? v.filter((x) => x !== u.id) : [...v, u.id],
                    )
                  }
                  className={
                    invitados.includes(u.id)
                      ? 'flex items-center gap-2 border border-tinta/60 bg-hueco px-3 py-2 text-left text-xs'
                      : 'flex items-center gap-2 border border-borde px-3 py-2 text-left text-meta text-suave transition-colors hover:border-suave'
                  }
                >
                  <span
                    className={
                      invitados.includes(u.id)
                        ? 'h-2 w-2 shrink-0 bg-signal'
                        : 'h-2 w-2 shrink-0 border border-borde2'
                    }
                  />
                  <span className="truncate">{u.nombre}</span>
                </button>
              ))}
            </div>
          </Campo>
        )}

        {/* ── Alguien que todavía no está ──
            Se da de alta con la sala y queda en el directorio. */}
        {!sala && (
          <Campo
            etiqueta="Sumar a alguien que no está en la lista"
            ayuda="Con el correo con el que va a entrar. Queda cargado para el resto de las salas."
          >
            {nuevos.length > 0 && (
              <ul className="mb-2 space-y-1">
                {nuevos.map((n, i) => (
                  <li
                    key={n.email}
                    className="flex items-center gap-2 border border-borde bg-hueco px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {n.nombre} · <span className="text-tenue">{n.email}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setNuevos((v) => v.filter((_, j) => j !== i))}
                      className="shrink-0 text-suave hover:text-signal"
                      aria-label={`Sacar a ${n.nombre}`}
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-0 flex-1"
                placeholder="Nombre y apellido"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
              />
              <input
                type="email"
                className="min-w-0 flex-1"
                placeholder="correo@empresa.com"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
              />
              <Boton
                type="button"
                tam="sm"
                disabled={!nuevoEmail.trim()}
                onClick={() => {
                  const email = nuevoEmail.trim().toLowerCase()
                  if (!email || nuevos.some((n) => n.email === email)) return
                  setNuevos((v) => [...v, { nombre: nuevoNombre.trim() || email, email }])
                  setNuevoNombre('')
                  setNuevoEmail('')
                }}
              >
                <Plus size={12} /> Sumar
              </Boton>
            </div>
          </Campo>
        )}

        {/* ── Ajustes finos ──
            No van en el alta: son valores por omisión de las reuniones
            de esta sala y se tocan una vez cada tanto. */}
        {sala && (
          <>
            <Campo
              etiqueta="Lugares donde se juntan"
              ayuda="Separados por coma. Son los que aparecen al crear una reunión."
            >
              <input
                className="w-full"
                value={lugares}
                onChange={(e) => setLugares(e.target.value)}
                placeholder="Fábrica, Local Palermo, Meet"
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Duración de la reunión (min)">
                <input
                  type="number"
                  min={15}
                  step={5}
                  className="w-full"
                  value={duracion}
                  onChange={(e) => setDuracion(Number(e.target.value))}
                />
              </Campo>
              <Campo etiqueta="Duración por tema (min)">
                <input
                  type="number"
                  min={5}
                  step={5}
                  className="w-full"
                  value={duracionTema}
                  onChange={(e) => setDuracionTema(Number(e.target.value))}
                />
              </Campo>
            </div>
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {sala && (
            <Boton
              type="button"
              variante="peligro"
              onClick={() => setPorArchivar(true)}
              className="mr-auto"
            >
              <Trash2 size={12} /> Archivar
            </Boton>
          )}
          <Boton type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante={insistir ? 'peligro' : 'solido'}>
            {sala ? 'Guardar' : insistir ? 'Crear una segunda igual' : 'Crear sala'}
          </Boton>
        </div>
      </form>

      <Confirmar
        abierto={porArchivar}
        titulo="Archivar la sala"
        texto={`«${sala?.nombre}» deja de aparecer para todo el equipo. Las reuniones y las tareas quedan guardadas.`}
        textoBoton="Archivar"
        peligro
        onCancelar={() => setPorArchivar(false)}
        onConfirmar={() => {
          if (sala) void archivarSala(sala.id)
          setPorArchivar(false)
          onCerrar()
        }}
      />
    </Modal>
  )
}

/* ── Equipo de la sala ────────────────────────────────────── */

function ModalEquipo({
  abierto,
  onCerrar,
  sala,
}: {
  abierto: boolean
  onCerrar: () => void
  sala?: Sala
}) {
  const {
    estado,
    yo,
    sumarAlaSala,
    cambiarRolEnSala,
    sacarDeLaSala,
    guardarUsuario,
    resolverSolicitud,
  } = useApp()
  const [invitando, setInvitando] = useState(false)
  const [porSacar, setPorSacar] = useState<Usuario | undefined>()

  const gente = useMemo(() => (sala ? integrantes(estado, sala.id) : []), [estado, sala])
  const pedidos = useMemo(() => (sala ? solicitudesDe(estado, sala.id) : []), [estado, sala])

  /* Gente que ya existe en el sistema y todavía no está en esta sala. */
  const disponibles = useMemo(
    () =>
      sala
        ? estado.usuarios.filter(
            (u) => u.activo && u.alcance !== 'superadmin' && !gente.some((g) => g.id === u.id),
          )
        : [],
    [estado.usuarios, gente, sala],
  )

  if (!sala) return null

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} kicker={sala.nombre} titulo="Equipo de la sala">
      <div className="space-y-5">
        {/* Quien pidió entrar aparece acá, donde se arma el equipo. */}
        {pedidos.length > 0 && (
          <div className="border border-signal/40 bg-signal/5 p-3.5">
            <Etiqueta className="mb-2 text-signal">
              {pedidos.length} {pedidos.length === 1 ? 'pide entrar' : 'piden entrar'}
            </Etiqueta>
            <ul className="space-y-1.5">
              {pedidos.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 border border-borde bg-panel p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{nombreDe(estado, s.usuarioId)}</div>
                    {s.mensaje && (
                      <div className="text-xs leading-relaxed text-tenue">{s.mensaje}</div>
                    )}
                  </div>
                  <Boton
                    tam="sm"
                    variante="solido"
                    onClick={() => resolverSolicitud(s.id, 'aceptada')}
                  >
                    <Check size={11} /> Aceptar
                  </Boton>
                  <Boton
                    tam="sm"
                    variante="fantasma"
                    onClick={() => resolverSolicitud(s.id, 'rechazada')}
                  >
                    <X size={11} />
                  </Boton>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Etiqueta>{gente.length} personas en la sala</Etiqueta>
          <Boton tam="sm" variante="solido" onClick={() => setInvitando(true)}>
            <UserPlus size={12} /> Sumar a alguien
          </Boton>
        </div>

        <ul className="card divide-y divide-borde">
          {gente.map((u) => {
            const rol = rolEnSala(estado, sala.id, u.id) ?? 'miembro'
            const soyYo = u.id === yo?.id
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    {u.nombre}
                    {soyYo && <span className="ml-2 text-meta text-tenue">vos</span>}
                  </div>
                  <div className="truncate text-meta text-tenue">{u.email}</div>
                </div>
                <div className="flex gap-1">
                  {(Object.keys(ROLES_SALA) as RolSala[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => cambiarRolEnSala(sala.id, u.id, r)}
                      title={ROLES_SALA[r].desc}
                      className={
                        rol === r
                          ? 'border border-tinta bg-tinta px-2.5 py-1.5 text-[11px] font-semibold text-fondo'
                          : 'border border-borde2 bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-suave transition-colors hover:border-suave hover:text-tinta'
                      }
                    >
                      {ROLES_SALA[r].nombre}
                    </button>
                  ))}
                  {!soyYo && (
                    <button
                      onClick={() => setPorSacar(u)}
                      className="border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-signal hover:text-signal"
                      aria-label="Sacar de la sala"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <p className="text-xs leading-relaxed text-tenue">
          El socio arma la agenda, aprueba temas y gestiona quién entra. El miembro propone temas,
          participa y sigue sus propias tareas. El externo —un proveedor, alguien de afuera— propone
          temas para que los apruebe el socio y ve sólo las tareas que tiene a su nombre: no entra a
          las reuniones a las que no lo convocan ni ve las tareas de los demás.
        </p>
      </div>

      <ModalInvitar
        abierto={invitando}
        onCerrar={() => setInvitando(false)}
        sala={sala}
        disponibles={disponibles}
        onSumar={sumarAlaSala}
        onCrear={guardarUsuario}
      />

      <Confirmar
        abierto={!!porSacar}
        titulo="Sacar de la sala"
        texto={`${porSacar?.nombre} deja de ver esta sala. Sus tareas quedan registradas.`}
        textoBoton="Sacar"
        peligro
        onCancelar={() => setPorSacar(undefined)}
        onConfirmar={() => {
          if (porSacar) void sacarDeLaSala(sala.id, porSacar.id)
          setPorSacar(undefined)
        }}
      />
    </Modal>
  )
}

/* ── Sumar gente ──────────────────────────────────────────── */

function ModalInvitar({
  abierto,
  onCerrar,
  sala,
  disponibles,
  onSumar,
  onCrear,
}: {
  abierto: boolean
  onCerrar: () => void
  sala: Sala
  disponibles: Usuario[]
  onSumar: (salaId: string, usuarioId: string, rol: RolSala) => Promise<void>
  onCrear: (u: Usuario) => Promise<void>
}) {
  const { avisar } = useApp()
  const [rol, setRol] = useState<RolSala>('miembro')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState('')

  /*
   * Alta y alcance en un solo paso: se crea la ficha con su correo y
   * queda habilitada. Cuando la persona entra con Google, el sistema
   * la reconoce por ese correo y la engancha con esta ficha.
   */
  const crearYSumar = async (e: React.FormEvent) => {
    e.preventDefault()
    const nuevo: Usuario = {
      id: uid('u'),
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      alcance: 'usuario',
      cargo: cargo.trim() || undefined,
      activo: true,
      creadoEn: new Date().toISOString(),
    }
    await onCrear(nuevo)
    await onSumar(sala.id, nuevo.id, rol)
    avisar(
      `${nuevo.nombre} ya puede entrar con ${nuevo.email}. Avisale para que inicie sesión con Google.`,
    )
    setNombre('')
    setEmail('')
    setCargo('')
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      kicker={sala.nombre}
      titulo="Sumar a la sala"
      ancho="max-w-lg"
    >
      <div className="space-y-6">
        <Campo etiqueta="Con qué rol entra" ayuda={ROLES_SALA[rol].desc}>
          <Segmentado
            valor={rol}
            onChange={setRol}
            opciones={(Object.keys(ROLES_SALA) as RolSala[]).map((r) => ({
              valor: r,
              label: ROLES_SALA[r].nombre,
              title: ROLES_SALA[r].desc,
            }))}
          />
        </Campo>

        {disponibles.length > 0 && (
          <div>
            <Etiqueta className="mb-2">Ya están en el sistema</Etiqueta>
            <ul className="card max-h-52 divide-y divide-borde overflow-y-auto">
              {disponibles.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={async () => {
                      await onSumar(sala.id, u.id, rol)
                      onCerrar()
                    }}
                    className="group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-hueco"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{u.nombre}</div>
                      <div className="truncate text-meta text-tenue">{u.email}</div>
                    </div>
                    <Plus size={13} className="text-borde2 group-hover:text-signal" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-borde" />
            <span className="label">O dala de alta</span>
            <div className="h-px flex-1 bg-borde" />
          </div>

          <form onSubmit={crearYSumar} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre y apellido">
                <input
                  className="w-full"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Renata Sosa"
                  required
                />
              </Campo>
              <Campo etiqueta="Cargo">
                <input
                  className="w-full"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Diseño · Moldería"
                />
              </Campo>
            </div>

            <Campo
              etiqueta="Correo"
              ayuda="Tiene que ser la cuenta con la que inicia sesión en Google: por ahí se la reconoce al entrar."
            >
              <input
                type="email"
                className="w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="renata@harveywillys.com"
                required
              />
            </Campo>

            <div className="flex justify-end gap-2">
              <Boton type="button" variante="fantasma" onClick={onCerrar}>
                Cancelar
              </Boton>
              <Boton type="submit" variante="solido">
                <UserPlus size={12} /> Dar de alta y sumar
              </Boton>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}
