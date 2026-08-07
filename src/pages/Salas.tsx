import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, DoorOpen, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  bancoDe,
  fechaCorta,
  integrantes,
  proximaReunion,
  reunionesDe,
  rolEnSala,
  uid,
} from '../lib/utils'
import { ROLES_SALA, type RolSala, type Sala, type Usuario } from '../types'
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
   ───────────────────────────────────────────────────────────── */

export default function Salas() {
  const { estado, yo, misSalas, elegirSala, esSuperadmin } = useApp()
  const navegar = useNavigate()
  const [creando, setCreando] = useState(false)
  const [gestionando, setGestionando] = useState<Sala | undefined>()
  const [editando, setEditando] = useState<Sala | undefined>()

  return (
    <div className="space-y-6">
      <Seccion
        kicker="Tus espacios"
        titulo="Salas"
        acciones={
          <Boton variante="solido" onClick={() => setCreando(true)}>
            <Plus size={13} /> Nueva sala
          </Boton>
        }
      >
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-suave">
          Cada sala es un equipo con sus reuniones, su banco de temas y sus compromisos. Sólo ves
          las salas de las que formás parte, y tu rol puede ser distinto en cada una.
        </p>

        {misSalas.length === 0 ? (
          <Vacio
            titulo="Todavía no estás en ninguna sala"
            texto="Creá la de tu equipo y sumá a los tuyos, o esperá a que alguien te sume a la suya."
            icono={<DoorOpen size={32} />}
            accion={
              <Boton variante="solido" onClick={() => setCreando(true)}>
                <Plus size={13} /> Crear la primera
              </Boton>
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {misSalas.map((s) => {
              const gente = integrantes(estado, s.id)
              const proxima = proximaReunion(estado, s.id)
              const banco = bancoDe(estado, s.id).length
              const total = reunionesDe(estado, s.id).length
              const miRol = esSuperadmin ? 'organizador' : rolEnSala(estado, s.id, yo?.id)
              const organizo = miRol === 'organizador'

              return (
                <div key={s.id} className="card flex flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Chip tono={organizo ? 'amber' : 'neutro'}>
                          {miRol ? ROLES_SALA[miRol].nombre : 'Sin rol'}
                        </Chip>
                        {s.cadencia && <span className="text-xs text-tenue">{s.cadencia}</span>}
                      </div>
                      <h3 className="display text-2xl">{s.nombre}</h3>
                      {s.descripcion && (
                        <p className="mt-1 text-sm leading-relaxed text-suave">{s.descripcion}</p>
                      )}
                    </div>
                    <Avatares
                      nombres={gente.map((u) => ({ nombre: u.nombre, url: u.avatarUrl }))}
                      max={4}
                    />
                  </div>

                  <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-tenue">
                    <span>{gente.length} personas</span>
                    <span>{total} reuniones</span>
                    {banco > 0 && <span className="text-cold">{banco} en el banco</span>}
                    {proxima && <span>Próxima el {fechaCorta(proxima.fecha)}</span>}
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Seccion>

      <ModalSala abierto={creando} onCerrar={() => setCreando(false)} />
      <ModalSala abierto={!!editando} onCerrar={() => setEditando(undefined)} sala={editando} />
      <ModalEquipo
        abierto={!!gestionando}
        onCerrar={() => setGestionando(undefined)}
        sala={gestionando}
      />
    </div>
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
  const { crearSala, actualizarSala, archivarSala } = useApp()
  const navegar = useNavigate()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cadencia, setCadencia] = useState('')
  const [lugar, setLugar] = useState('')
  const [duracion, setDuracion] = useState(60)
  const [duracionTema, setDuracionTema] = useState(15)
  const [horasCierre, setHorasCierre] = useState(24)
  const [cierreManual, setCierreManual] = useState(false)
  const [porArchivar, setPorArchivar] = useState(false)

  // Recarga los valores cada vez que se abre.
  const [ultimo, setUltimo] = useState<string | undefined>()
  if (abierto && ultimo !== (sala?.id ?? 'nueva')) {
    setUltimo(sala?.id ?? 'nueva')
    setNombre(sala?.nombre ?? '')
    setDescripcion(sala?.descripcion ?? '')
    setCadencia(sala?.cadencia ?? '')
    setLugar(sala?.lugarHabitual ?? '')
    setDuracion(sala?.duracionReunionDefaultMin ?? 60)
    setDuracionTema(sala?.duracionTemaDefaultMin ?? 15)
    setHorasCierre(sala?.horasCierreAgenda ?? 24)
    setCierreManual(sala?.cierreManual ?? false)
  }
  if (!abierto && ultimo !== undefined) setUltimo(undefined)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = {
      nombre,
      descripcion: descripcion.trim() || undefined,
      cadencia: cadencia.trim() || undefined,
      lugarHabitual: lugar.trim() || undefined,
      duracionReunionDefaultMin: duracion,
      duracionTemaDefaultMin: duracionTema,
      horasCierreAgenda: horasCierre,
      cierreManual,
    }
    if (sala) await actualizarSala(sala.id, datos)
    else {
      const nueva = await crearSala(datos)
      if (nueva) navegar('/')
    }
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      kicker={sala ? 'Ajustes' : 'Nuevo espacio'}
      titulo={sala ? 'Editar sala' : 'Nueva sala'}
    >
      <form onSubmit={enviar} className="space-y-4">
        <Campo etiqueta="Nombre">
          <input
            className="w-full"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Marketing"
            required
            autoFocus
          />
        </Campo>

        <Campo etiqueta="De qué se trata">
          <textarea
            className="w-full resize-y"
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Quiénes participan y para qué se juntan."
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Cadencia" ayuda="Se sugiere al crear una reunión.">
            <input
              className="w-full"
              value={cadencia}
              onChange={(e) => setCadencia(e.target.value)}
              placeholder="Jueves 11:00"
            />
          </Campo>
          <Campo etiqueta="Dónde se juntan">
            <input
              className="w-full"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Showroom Palermo"
            />
          </Campo>
        </div>

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

        <Campo
          etiqueta="Cuándo se cierra el temario"
          ayuda="Con cierre a mano no hay plazo: se aceptan temas hasta que el organizador lo cierre."
        >
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCierreManual(true)}
              className={
                cierreManual
                  ? 'border border-tinta bg-tinta px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fondo'
                  : 'border border-borde2 bg-panel px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:border-suave hover:text-tinta'
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
                    ? 'border border-tinta bg-tinta px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fondo'
                    : 'border border-borde2 bg-panel px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-suave transition-colors hover:border-suave hover:text-tinta'
                }
              >
                {h} h antes
              </button>
            ))}
          </div>
        </Campo>

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
          <Boton type="submit" variante="solido">
            {sala ? 'Guardar' : 'Crear sala'}
          </Boton>
        </div>
      </form>

      <Confirmar
        abierto={porArchivar}
        titulo="Archivar la sala"
        texto={`«${sala?.nombre}» deja de aparecer para todo el equipo. Las reuniones y los compromisos quedan guardados.`}
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
  const { estado, yo, sumarAlaSala, cambiarRolEnSala, sacarDeLaSala, guardarUsuario } = useApp()
  const [invitando, setInvitando] = useState(false)
  const [porSacar, setPorSacar] = useState<Usuario | undefined>()

  const gente = useMemo(
    () => (sala ? integrantes(estado, sala.id) : []),
    [estado, sala],
  )

  /* Gente que ya existe en el sistema y todavía no está en esta sala. */
  const disponibles = useMemo(
    () =>
      sala
        ? estado.usuarios.filter(
            (u) =>
              u.activo &&
              u.alcance !== 'superadmin' &&
              !gente.some((g) => g.id === u.id),
          )
        : [],
    [estado.usuarios, gente, sala],
  )

  if (!sala) return null

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} kicker={sala.nombre} titulo="Equipo de la sala">
      <div className="space-y-5">
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
                    {soyYo && <span className="ml-2 text-xs text-tenue">vos</span>}
                  </div>
                  <div className="truncate text-xs text-tenue">{u.email}</div>
                </div>
                <div className="flex gap-1">
                  {(Object.keys(ROLES_SALA) as RolSala[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => cambiarRolEnSala(sala.id, u.id, r)}
                      title={ROLES_SALA[r].desc}
                      className={
                        rol === r
                          ? 'border border-tinta bg-tinta px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-fondo'
                          : 'border border-borde2 bg-panel px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-suave transition-colors hover:border-suave hover:text-tinta'
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
          El organizador arma la agenda, aprueba temas y gestiona quién entra. El miembro propone
          temas, participa y sigue sus propios compromisos.
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
        texto={`${porSacar?.nombre} deja de ver esta sala. Sus compromisos quedan registrados.`}
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
                      <div className="truncate text-xs text-tenue">{u.email}</div>
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
