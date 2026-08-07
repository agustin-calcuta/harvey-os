import { useState } from 'react'
import { Database, Pencil, Plus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useApp, ROL_LABEL } from '../store/AppContext'
import { firebaseConfigurado } from '../lib/firebase'
import { neonConfigurado } from '../lib/neon'
import { correoConfigurado, enviarCorreo } from '../lib/email'
import { fechaCorta, uid } from '../lib/utils'
import { ROLES, type Rol, type Usuario } from '../types'
import {
  Avatar,
  Boton,
  Campo,
  Chip,
  Confirmar,
  Modal,
  Seccion,
  Segmentado,
} from '../components/ui'

export default function Admin() {
  const { estado, yo, esAdmin, borrarUsuario, actualizarConfig, restablecerDemo, modo, avisar } =
    useApp()

  const [editando, setEditando] = useState<Usuario | undefined>()
  const [creando, setCreando] = useState(false)
  const [porBorrar, setPorBorrar] = useState<Usuario | undefined>()
  const [confirmarReset, setConfirmarReset] = useState(false)
  const [probando, setProbando] = useState(false)

  /* Verifica el envío sin tener que cerrar una reunión de verdad. */
  const probarCorreo = async () => {
    if (!yo?.email) return
    setProbando(true)
    try {
      const r = await enviarCorreo({
        destinatarios: [yo.email],
        asunto: 'Prueba de envío · Harvey OS',
        texto:
          'Si estás leyendo esto, el envío automático de Harvey OS quedó funcionando. Los correos de temario y de minuta van a salir por esta misma vía.',
        html: `<div style="background:#0A0A0A;padding:32px 16px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #262626">
    <div style="padding:28px 32px;border-bottom:1px solid #262626">
      <div style="font-size:10px;letter-spacing:3px;color:#8C8C8C;text-transform:uppercase">[ Prueba ]</div>
      <div style="font-size:32px;font-weight:900;color:#F4F2EE;letter-spacing:-1px;text-transform:uppercase;margin-top:10px;line-height:1">Funciona</div>
    </div>
    <div style="padding:28px 32px;color:#D8D6D2;font-size:14px;line-height:1.65">
      Si estás leyendo esto, el envío automático quedó funcionando. Los correos de
      temario y de minuta van a salir por esta misma vía.
    </div>
    <div style="padding:18px 32px;border-top:1px solid #262626;font-size:10px;letter-spacing:2px;color:#5C5C5C;text-transform:uppercase">
      Harvey OS · enviado automáticamente
    </div>
  </div>
</div>`,
      })
      avisar(
        r === 'enviado'
          ? `Correo de prueba enviado a ${yo.email}. Revisá la bandeja y el correo no deseado.`
          : 'No hay casilla conectada todavía: el correo se compuso pero no salió.',
        r === 'enviado' ? 'ok' : 'info',
      )
    } catch (e) {
      avisar(`Falló el envío: ${e instanceof Error ? e.message : e}`, 'error')
    } finally {
      setProbando(false)
    }
  }

  if (!esAdmin) {
    return (
      <div className="card p-8 text-center">
        <div className="display mb-2 text-2xl text-smoke">Sin acceso</div>
        <p className="text-sm text-smoke-2">Esta sección es sólo para administradores.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* ── Equipo ── */}
      <Seccion
        kicker="Quién es quién"
        titulo="Equipo y roles"
        acciones={
          <Boton variante="solido" onClick={() => setCreando(true)}>
            <Plus size={13} /> Agregar persona
          </Boton>
        }
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <div key={r} className="card p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  {ROLES[r].nombre}
                </span>
                <span className="font-mono text-[10px] text-smoke-2">
                  {estado.usuarios.filter((u) => u.rol === r).length}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-smoke-2">{ROLES[r].desc}</p>
            </div>
          ))}
        </div>

        <ul className="card divide-y divide-line">
          {estado.usuarios.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar nombre={u.nombre} url={u.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{u.nombre}</span>
                  {!u.activo && <Chip>Inactivo</Chip>}
                </div>
                <div className="truncate text-xs text-smoke-2">
                  {u.email}
                  {u.cargo && ` · ${u.cargo}`}
                </div>
              </div>
              <Chip
                tono={u.rol === 'admin' ? 'signal' : u.rol === 'organizador' ? 'amber' : 'neutro'}
              >
                {ROL_LABEL[u.rol]}
              </Chip>
              <span className="hidden font-mono text-[10px] text-smoke-2 sm:block">
                Desde {fechaCorta(u.creadoEn)}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditando(u)}
                  className="border border-line-2 p-1.5 text-smoke transition-colors hover:border-bone hover:text-bone"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => setPorBorrar(u)}
                  className="border border-line-2 p-1.5 text-smoke transition-colors hover:border-signal hover:text-signal"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Seccion>

      {/* ── Configuración ── */}
      <Seccion kicker="Reglas del juego" titulo="Configuración">
        <div className="card space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Organización">
              <input
                className="w-full"
                value={estado.config.organizacion}
                onChange={(e) => actualizarConfig({ organizacion: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Cadencia habitual" ayuda="Se sugiere al crear una reunión nueva.">
              <input
                className="w-full"
                value={estado.config.cadencia}
                onChange={(e) => actualizarConfig({ cadencia: e.target.value })}
                placeholder="Lunes 10:00"
              />
            </Campo>
          </div>

          <Campo
            etiqueta="El temario cierra"
            ayuda="Cuántas horas antes de la reunión deja de aceptarse la carga de temas."
          >
            <div className="flex flex-wrap gap-1.5">
              {[12, 24, 48, 72].map((h) => (
                <button
                  key={h}
                  onClick={() => actualizarConfig({ horasCierreAgendaDefault: h })}
                  className={
                    estado.config.horasCierreAgendaDefault === h
                      ? 'border border-bone bg-bone px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink'
                      : 'border border-line-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-smoke transition-colors hover:border-smoke hover:text-bone'
                  }
                >
                  {h} h antes
                </button>
              ))}
            </div>
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Duración por defecto de la reunión (min)">
              <input
                type="number"
                min={15}
                step={5}
                className="w-full"
                value={estado.config.duracionReunionDefaultMin}
                onChange={(e) =>
                  actualizarConfig({ duracionReunionDefaultMin: Number(e.target.value) })
                }
              />
            </Campo>
            <Campo etiqueta="Duración por defecto de cada tema (min)">
              <input
                type="number"
                min={5}
                step={5}
                className="w-full"
                value={estado.config.duracionTemaDefaultMin}
                onChange={(e) =>
                  actualizarConfig({ duracionTemaDefaultMin: Number(e.target.value) })
                }
              />
            </Campo>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#C0392B]"
              checked={estado.config.emailsActivos}
              onChange={(e) => actualizarConfig({ emailsActivos: e.target.checked })}
            />
            <span>
              <span className="block text-sm">Correos automáticos</span>
              <span className="block text-xs text-smoke-2">
                Emitir el aviso al cerrar el temario y la minuta al cerrar la reunión.
              </span>
            </span>
          </label>
        </div>
      </Seccion>

      {/* ── Estado técnico ── */}
      <Seccion kicker="Debajo del capot" titulo="Estado técnico">
        <div className="card divide-y divide-line">
          <Fila
            etiqueta="Persistencia"
            valor={
              modo === 'neon'
                ? 'Neon Postgres'
                : modo === 'firebase'
                  ? 'Firestore'
                  : 'Navegador (localStorage)'
            }
            tono={modo === 'demo' ? 'amber' : 'acid'}
            nota={
              modo === 'neon'
                ? 'Base compartida vía Data API, con Row Level Security por rol. Se refresca cada 12 segundos y al volver a la pestaña.'
                : modo === 'firebase'
                  ? 'Los datos se comparten en vivo entre todos los usuarios.'
                  : 'Cada navegador guarda su propia copia. Al cargar las credenciales pasa a ser compartida.'
            }
          />
          <Fila
            etiqueta="Acceso con Google"
            valor={neonConfigurado || firebaseConfigurado ? 'Activo' : 'Pendiente de credenciales'}
            tono={neonConfigurado || firebaseConfigurado ? 'acid' : 'amber'}
            nota={
              neonConfigurado
                ? 'Neon Auth. La identidad se vincula por correo con la ficha del equipo, así cada uno entra con su rol.'
                : firebaseConfigurado
                  ? 'Firebase Authentication con proveedor de Google.'
                  : 'Se activa al cargar las variables del proveedor.'
            }
          />
          <Fila
            etiqueta="Permisos"
            valor={modo === 'neon' ? 'En la base' : 'En la aplicación'}
            tono={modo === 'neon' ? 'acid' : 'amber'}
            nota={
              modo === 'neon'
                ? 'Las políticas viven en Postgres: un miembro no puede crear reuniones aunque manipule la app desde el navegador.'
                : 'Los roles se aplican en la interfaz. Con base real pasan a estar respaldados por la base.'
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Send size={13} className="text-smoke-2" />
                <span className="text-sm">Envío de correo</span>
              </div>
              <p className="mt-1 max-w-xl pl-5 text-xs text-smoke-2">
                {correoConfigurado
                  ? 'Salen solos al cerrar el temario y al cerrar la reunión. Probalo acá para confirmar que la casilla responde.'
                  : 'Los correos se componen siempre y quedan registrados en la sección Correos, listos para copiar o abrir en el cliente de correo.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Chip tono={correoConfigurado ? 'acid' : 'amber'}>
                {correoConfigurado ? 'Conectado' : 'Sin casilla conectada'}
              </Chip>
              {correoConfigurado && (
                <Boton tam="sm" onClick={probarCorreo} disabled={probando}>
                  <Send size={11} /> {probando ? 'Enviando…' : 'Probar'}
                </Boton>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm">Datos de demostración</div>
              <div className="text-xs text-smoke-2">
                {modo === 'neon'
                  ? 'Con base compartida el restablecimiento se hace desde el repositorio, corriendo db/seed.sql. Así nadie borra el trabajo del resto por accidente.'
                  : `Vuelve todo al estado original: ${estado.reuniones.length} reuniones, ${estado.temas.length} temas y ${estado.compromisos.length} compromisos.`}
              </div>
            </div>
            <Boton
              variante="peligro"
              onClick={() => setConfirmarReset(true)}
              disabled={modo === 'neon'}
            >
              <RotateCcw size={12} /> Restablecer
            </Boton>
          </div>
        </div>
      </Seccion>

      {/* ── Modales ── */}
      <ModalUsuario abierto={creando} onCerrar={() => setCreando(false)} />
      <ModalUsuario
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        usuario={editando}
      />
      <Confirmar
        abierto={!!porBorrar}
        titulo="Eliminar persona"
        texto={`Se elimina a ${porBorrar?.nombre}. Sus compromisos quedan registrados pero sin responsable visible.`}
        textoBoton="Eliminar"
        peligro
        onCancelar={() => setPorBorrar(undefined)}
        onConfirmar={() => {
          if (porBorrar) void borrarUsuario(porBorrar.id)
          setPorBorrar(undefined)
        }}
      />
      <Confirmar
        abierto={confirmarReset}
        titulo="Restablecer la demo"
        texto="Se descartan todos los cambios y se vuelve al conjunto de datos original. No se puede deshacer."
        textoBoton="Restablecer"
        peligro
        onCancelar={() => setConfirmarReset(false)}
        onConfirmar={() => {
          void restablecerDemo()
          setConfirmarReset(false)
        }}
      />
    </div>
  )
}

/* ── Auxiliares ───────────────────────────────────────────── */

function Fila({
  etiqueta,
  valor,
  nota,
  tono,
}: {
  etiqueta: string
  valor: string
  nota?: string
  tono?: 'acid' | 'amber' | 'signal'
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Database size={13} className="text-smoke-2" />
          <span className="text-sm">{etiqueta}</span>
        </div>
        {nota && <p className="mt-1 max-w-xl pl-5 text-xs text-smoke-2">{nota}</p>}
      </div>
      <Chip tono={tono}>{valor}</Chip>
    </div>
  )
}

function ModalUsuario({
  abierto,
  onCerrar,
  usuario,
}: {
  abierto: boolean
  onCerrar: () => void
  usuario?: Usuario
}) {
  const { guardarUsuario } = useApp()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState('')
  const [rol, setRol] = useState<Rol>('miembro')
  const [activo, setActivo] = useState(true)

  // Cargamos los valores cada vez que se abre el modal.
  const [ultimo, setUltimo] = useState<string | undefined>()
  if (abierto && ultimo !== (usuario?.id ?? 'nuevo')) {
    setUltimo(usuario?.id ?? 'nuevo')
    setNombre(usuario?.nombre ?? '')
    setEmail(usuario?.email ?? '')
    setCargo(usuario?.cargo ?? '')
    setRol(usuario?.rol ?? 'miembro')
    setActivo(usuario?.activo ?? true)
  }
  if (!abierto && ultimo !== undefined) setUltimo(undefined)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    await guardarUsuario({
      id: usuario?.id ?? uid('u'),
      nombre: nombre.trim(),
      email: email.trim(),
      cargo: cargo.trim() || undefined,
      rol,
      activo,
      avatarUrl: usuario?.avatarUrl,
      creadoEn: usuario?.creadoEn ?? new Date().toISOString(),
    })
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      kicker="Equipo"
      titulo={usuario ? 'Editar persona' : 'Agregar persona'}
    >
      <form onSubmit={enviar} className="space-y-4">
        <Campo etiqueta="Nombre">
          <input className="w-full" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Correo" ayuda="Con este correo va a poder entrar con Google.">
          <input
            type="email"
            className="w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Campo>
        <Campo etiqueta="Cargo">
          <input
            className="w-full"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Socio · Operaciones"
          />
        </Campo>
        <Campo etiqueta="Rol" ayuda={ROLES[rol].desc}>
          <Segmentado
            valor={rol}
            onChange={setRol}
            opciones={(Object.keys(ROLES) as Rol[]).map((r) => ({
              valor: r,
              label: ROLES[r].nombre,
              title: ROLES[r].desc,
            }))}
          />
        </Campo>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#C0392B]"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <span className="text-sm">Activo</span>
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
