import { useState } from 'react'
import { Database, DoorOpen, Pencil, Plus, RotateCcw, Send, Trash2, Users } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { firebaseConfigurado } from '../lib/firebase'
import { neonConfigurado } from '../lib/neon'
import { correoConfigurado, enviarCorreo } from '../lib/email'
import { fechaCorta, integrantes, uid } from '../lib/utils'
import type { Alcance, Usuario } from '../types'
import { Boton, Campo, Chip, Confirmar, Modal, Seccion, Segmentado } from '../components/ui'

/* ─────────────────────────────────────────────────────────────
   Panel de superadmin.

   Sólo lo ve el superadmin: no es una pantalla del cliente, es la
   consola de quien mantiene la herramienta. El equipo administra
   su propia sala desde la pantalla de Salas.
   ───────────────────────────────────────────────────────────── */

export default function Admin() {
  const {
    estado,
    yo,
    esSuperadmin,
    borrarUsuario,
    actualizarConfig,
    restablecerDemo,
    modo,
    avisar,
  } = useApp()

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
        asunto: `Prueba de envío · ${estado.config.organizacion}`,
        texto:
          'Si estás leyendo esto, el envío automático quedó funcionando. Los correos de temario y de minuta van a salir por esta misma vía.',
        html: `<div style="background:#F7F5F1;padding:32px 16px;font-family:Inter,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E3DED4">
    <div style="padding:28px 32px;border-bottom:1px solid #E3DED4">
      <div style="font-size:10px;letter-spacing:3px;color:#6B665D;text-transform:uppercase">[ Prueba ]</div>
      <div style="font-size:32px;font-weight:800;color:#14120F;text-transform:uppercase;margin-top:10px;line-height:1.1">Funciona</div>
    </div>
    <div style="padding:28px 32px;color:#2C2924;font-size:14px;line-height:1.65">
      Si estás leyendo esto, el envío automático quedó funcionando. Los correos de
      temario y de minuta van a salir por esta misma vía.
    </div>
    <div style="padding:18px 32px;border-top:1px solid #E3DED4;font-size:10px;letter-spacing:2px;color:#9A948A;text-transform:uppercase">
      ${estado.config.organizacion} · enviado automáticamente
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

  if (!esSuperadmin) {
    return (
      <div className="card p-8 text-center">
        <div className="display mb-2 text-2xl text-suave">Sin acceso</div>
        <p className="text-sm text-tenue">
          Esta sección es del superadmin. Para gestionar tu equipo, entrá a la sala.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* ── Salas ── */}
      <Seccion kicker="Todo lo que hay" titulo="Salas" principal>
        <ul className="card divide-y divide-borde">
          {estado.salas.map((s) => {
            const gente = integrantes(estado, s.id)
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                <DoorOpen size={15} className="shrink-0 text-tenue" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    {s.nombre}
                    {s.archivada && <Chip>Archivada</Chip>}
                  </div>
                  <div className="truncate text-meta text-tenue">
                    {gente.length} personas ·{' '}
                    {estado.reuniones.filter((r) => r.salaId === s.id).length} reuniones ·{' '}
                    {estado.temas.filter((t) => t.salaId === s.id && t.estado === 'banco').length}{' '}
                    en el banco
                  </div>
                </div>
                <span className="hidden text-meta text-tenue sm:block">
                  Desde {fechaCorta(s.creadaEn)}
                </span>
              </li>
            )
          })}
        </ul>
      </Seccion>

      {/* ── Personas ── */}
      <Seccion
        kicker="Todas las cuentas"
        titulo="Personas"
        acciones={
          <Boton variante="solido" onClick={() => setCreando(true)}>
            <Plus size={13} /> Agregar persona
          </Boton>
        }
      >
        <p className="mb-4 max-w-2xl text-sm text-suave">
          El alcance no es el perfil: el perfil vive en cada sala. Acá se define quién es
          superadmin —con acceso por encima de todas las salas— y quién puede abrir salas
          nuevas, que quedó en manos de los socios.
        </p>

        <ul className="card divide-y divide-borde">
          {estado.usuarios.map((u) => {
            const salas = estado.membresias.filter((m) => m.usuarioId === u.id).length
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{u.nombre}</span>
                    {!u.activo && <Chip>Inactiva</Chip>}
                  </div>
                  <div className="truncate text-meta text-tenue">
                    {u.email}
                    {u.cargo && ` · ${u.cargo}`}
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-meta text-tenue">
                  <Users size={11} />
                  {salas}
                </span>
                {u.puedeCrearSalas && u.alcance !== 'superadmin' && (
                  <Chip tono="amber">Abre salas</Chip>
                )}
                {u.alcance === 'superadmin' && <Chip tono="signal">Superadmin</Chip>}
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditando(u)}
                    aria-label={`Editar a ${u.nombre}`}
                    className="border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-tinta hover:text-tinta"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setPorBorrar(u)}
                    aria-label={`Eliminar a ${u.nombre}`}
                    className="border border-borde2 bg-panel p-1.5 text-suave transition-colors hover:border-signal hover:text-signal"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </Seccion>

      {/* ── Estado técnico ── */}
      <Seccion kicker="Debajo del capot" titulo="Estado técnico">
        <div className="card divide-y divide-borde">
          <div className="p-4">
            <Campo etiqueta="Organización">
              <input
                className="w-full sm:w-72"
                value={estado.config.organizacion}
                onChange={(e) => actualizarConfig({ organizacion: e.target.value })}
              />
            </Campo>
          </div>

          <label className="flex cursor-pointer items-start gap-3 p-4">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#C0392B]"
              checked={estado.config.emailsActivos}
              onChange={(e) => actualizarConfig({ emailsActivos: e.target.checked })}
            />
            <span>
              <span className="block text-sm">Correos automáticos</span>
              <span className="block text-meta text-tenue">
                Emitir el aviso al cerrar el temario y la minuta al cerrar la reunión.
              </span>
            </span>
          </label>

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
                ? 'Base compartida vía Data API, con Row Level Security por sala. Se refresca cada 12 segundos y al volver a la pestaña.'
                : modo === 'firebase'
                  ? 'Los datos se comparten en vivo entre todos los usuarios.'
                  : 'Cada navegador guarda su propia copia.'
            }
          />
          <Fila
            etiqueta="Acceso con Google"
            valor={neonConfigurado || firebaseConfigurado ? 'Activo' : 'Pendiente'}
            tono={neonConfigurado || firebaseConfigurado ? 'acid' : 'amber'}
            nota={
              neonConfigurado
                ? 'Neon Auth. La identidad se vincula por correo con la ficha ya cargada, así cada uno entra con el rol que tiene en cada sala.'
                : 'Se activa al cargar las variables del proveedor.'
            }
          />
          <Fila
            etiqueta="Permisos"
            valor={modo === 'neon' ? 'En la base' : 'En la aplicación'}
            tono={modo === 'neon' ? 'acid' : 'amber'}
            nota={
              modo === 'neon'
                ? 'Las políticas viven en Postgres: sólo se lee lo de las salas propias, y un miembro no puede crear reuniones aunque manipule la app desde el navegador.'
                : 'Los roles se aplican en la interfaz.'
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Send size={13} className="text-tenue" />
                <span className="text-sm">Envío de correo</span>
              </div>
              <p className="mt-1 max-w-xl pl-5 text-meta text-tenue">
                {correoConfigurado
                  ? 'Salen solos al cerrar el temario y al cerrar la reunión. Probalo acá para confirmar que la casilla responde.'
                  : 'Los correos se componen siempre y quedan registrados y se pueden revisar desde acá, listos para copiar o abrir en el cliente de correo.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Chip tono={correoConfigurado ? 'acid' : 'amber'}>
                {correoConfigurado ? 'Conectado' : 'Sin casilla'}
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
              <div className="text-meta text-tenue">
                {modo === 'neon'
                  ? 'Con base compartida el restablecimiento se hace desde el repositorio, corriendo db/seed.sql.'
                  : `Vuelve todo al estado original: ${estado.salas.length} salas, ${estado.reuniones.length} reuniones y ${estado.compromisos.length} compromisos.`}
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

      <ModalPersona abierto={creando} onCerrar={() => setCreando(false)} />
      <ModalPersona
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        usuario={editando}
      />
      <Confirmar
        abierto={!!porBorrar}
        titulo="Eliminar persona"
        texto={`Se elimina a ${porBorrar?.nombre} y sale de todas sus salas. Sus tareas quedan registradas.`}
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
        titulo="Restablecer la demostración"
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
          <Database size={13} className="text-tenue" />
          <span className="text-sm">{etiqueta}</span>
        </div>
        {nota && <p className="mt-1 max-w-xl pl-5 text-meta text-tenue">{nota}</p>}
      </div>
      <Chip tono={tono}>{valor}</Chip>
    </div>
  )
}

const ALCANCES: { valor: Alcance; nombre: string; desc: string }[] = [
  {
    valor: 'usuario',
    nombre: 'Normal',
    desc: 'Ve sólo sus salas. El perfil lo define cada sala.',
  },
  {
    valor: 'superadmin',
    nombre: 'Superadmin',
    desc: 'Ve y puede intervenir en todas las salas. Queda fuera de los desplegables del equipo.',
  },
]

function ModalPersona({
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
  const [alcance, setAlcance] = useState<Alcance>('usuario')
  const [puedeCrearSalas, setPuedeCrearSalas] = useState(false)
  const [activo, setActivo] = useState(true)

  const [ultimo, setUltimo] = useState<string | undefined>()
  if (abierto && ultimo !== (usuario?.id ?? 'nueva')) {
    setUltimo(usuario?.id ?? 'nueva')
    setNombre(usuario?.nombre ?? '')
    setEmail(usuario?.email ?? '')
    setCargo(usuario?.cargo ?? '')
    setAlcance(usuario?.alcance ?? 'usuario')
    setPuedeCrearSalas(usuario?.puedeCrearSalas ?? false)
    setActivo(usuario?.activo ?? true)
  }
  if (!abierto && ultimo !== undefined) setUltimo(undefined)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    await guardarUsuario({
      id: usuario?.id ?? uid('u'),
      authUserId: usuario?.authUserId,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      cargo: cargo.trim() || undefined,
      alcance,
      puedeCrearSalas,
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
      titulo={usuario ? 'Editar persona' : 'Agregar persona'}
    >
      <form onSubmit={enviar} className="space-y-4">
        <Campo etiqueta="Nombre">
          <input
            className="w-full"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </Campo>
        <Campo etiqueta="Correo" ayuda="Con este correo entra con Google.">
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
        <Campo
          etiqueta="Alcance"
          ayuda={ALCANCES.find((a) => a.valor === alcance)?.desc}
        >
          <Segmentado
            valor={alcance}
            onChange={setAlcance}
            opciones={ALCANCES.map((a) => ({ valor: a.valor, label: a.nombre, title: a.desc }))}
          />
        </Campo>
        {/* Abrir salas quedó en manos de los socios. */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#C0392B]"
            checked={puedeCrearSalas}
            onChange={(e) => setPuedeCrearSalas(e.target.checked)}
          />
          <span className="text-sm">
            Puede abrir salas
            <span className="ml-2 text-meta text-tenue">
              Crear reuniones puede cualquiera; abrir una sala nueva, sólo quien esté marcado acá.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#C0392B]"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <span className="text-sm">
            Activa
            <span className="ml-2 text-meta text-tenue">
              Si no, deja de aparecer en los desplegables pero conserva el acceso.
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
