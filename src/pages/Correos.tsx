import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, ExternalLink, Eye, Mail, Send } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { abrirEnClienteDeCorreo, correoConfigurado } from '../lib/email'
import { fechaHora, relativo } from '../lib/utils'
import type { Notificacion, TipoNotificacion } from '../types'
import { Boton, Capa, Chip, Etiqueta, Seccion, Vacio } from '../components/ui'

const TIPO: Record<TipoNotificacion, { nombre: string; fase: string }> = {
  agenda_cerrada: { nombre: 'Temario cerrado', fase: 'Pre-reunión' },
  minuta: { nombre: 'Minuta', fase: 'Post-reunión' },
  recordatorio: { nombre: 'Recordatorio', fase: 'Pre-reunión' },
  tema_aprobado: { nombre: 'Tema aprobado', fase: 'Pre-reunión' },
}

export default function Correos() {
  const { estado, avisar, reenviarNotificacion } = useApp()
  const [viendo, setViendo] = useState<Notificacion | undefined>()

  const lista = [...estado.notificaciones].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  const hayProveedor = correoConfigurado

  return (
    <div className="space-y-6">
      <Seccion kicker="Automatizaciones" titulo="Correos">
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-suave">
          La plataforma emite dos correos por reunión: uno al cerrarse el temario y otro al
          cerrarse la sesión, con conclusiones y compromisos. Acá queda el registro de todos.
        </p>

        <div
          className={
            hayProveedor ? 'card mb-5 border-acid/40 p-4' : 'card mb-5 border-amber/40 p-4'
          }
        >
          <div className="mb-1.5 flex items-center gap-2">
            <Mail size={14} className={hayProveedor ? 'text-acid' : 'text-amber'} />
            <span
              className={
                hayProveedor
                  ? 'font-semibold text-[11px] uppercase tracking-[0.14em] text-acid'
                  : 'font-semibold text-[11px] uppercase tracking-[0.14em] text-amber'
              }
            >
              {hayProveedor ? 'Envío automático activo' : 'Sin proveedor de envío conectado'}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-suave">
            {hayProveedor
              ? 'Los correos salen solos al cerrarse el temario y al cerrarse la reunión. Acá queda el registro de cada uno, con su contenido y sus destinatarios.'
              : 'Los correos se componen completos y quedan registrados, pero todavía no salen solos. Podés verlos, copiarlos o abrirlos en tu cliente de correo. Para que salgan automáticamente hay que conectar la casilla de envío.'}
          </p>
        </div>

        {lista.length === 0 ? (
          <Vacio
            titulo="Todavía no se emitió ningún correo"
            texto="Cerrá el temario de una reunión para que salga el primero."
            icono={<Mail size={32} />}
          />
        ) : (
          <ul className="space-y-3">
            {lista.map((n) => {
              const reunion = estado.reuniones.find((r) => r.id === n.reunionId)
              return (
                <li key={n.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Chip tono={n.tipo === 'minuta' ? 'cold' : 'amber'}>
                          {TIPO[n.tipo].nombre}
                        </Chip>
                        <Chip>{TIPO[n.tipo].fase}</Chip>
                        <Chip
                          tono={
                            n.estado === 'enviado'
                              ? 'acid'
                              : n.estado === 'error'
                                ? 'signal'
                                : 'neutro'
                          }
                        >
                          {n.estado === 'enviado'
                            ? 'Enviado'
                            : n.estado === 'error'
                              ? 'Error'
                              : 'Listo para enviar'}
                        </Chip>
                      </div>

                      <div className="text-sm">{n.asunto}</div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
                        <span>{n.destinatarios.length} destinatarios</span>
                        <span>{fechaHora(n.creadoEn)}</span>
                        <span>{relativo(n.creadoEn)}</span>
                        {reunion && (
                          <Link
                            to={`/reuniones/${reunion.id}`}
                            className="truncate transition-colors hover:text-tinta"
                          >
                            {reunion.titulo}
                          </Link>
                        )}
                      </div>

                      {n.error && <p className="mt-2 text-xs text-signal">{n.error}</p>}

                      <div className="mt-2 truncate text-[11px] text-tenue">
                        {n.destinatarios.join(', ')}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Boton tam="sm" onClick={() => setViendo(n)}>
                        <Eye size={11} /> Ver
                      </Boton>
                      <Boton
                        tam="sm"
                        variante="fantasma"
                        onClick={() => {
                          void navigator.clipboard.writeText(n.cuerpoTexto)
                          avisar('Contenido copiado al portapapeles.')
                        }}
                        title="Copiar texto"
                      >
                        <Copy size={11} />
                      </Boton>
                      <Boton
                        tam="sm"
                        variante="fantasma"
                        onClick={() =>
                          abrirEnClienteDeCorreo(n.destinatarios, n.asunto, n.cuerpoTexto)
                        }
                        title="Abrir en el cliente de correo"
                      >
                        <ExternalLink size={11} />
                      </Boton>
                      {hayProveedor && (
                        <Boton
                          tam="sm"
                          variante="solido"
                          onClick={() => reenviarNotificacion(n.id)}
                          title="Reenviar"
                        >
                          <Send size={11} />
                        </Boton>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Seccion>

      {viendo && (
        <Capa onCerrar={() => setViendo(undefined)}>
          <div className="my-auto w-full max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Etiqueta className="bracket mb-1">
                  Para {viendo.destinatarios.length} personas
                </Etiqueta>
                <div className="truncate text-sm text-tinta">{viendo.asunto}</div>
              </div>
              <Boton onClick={() => setViendo(undefined)}>Cerrar</Boton>
            </div>
            {viendo.cuerpoHtml ? (
              <div
                className="overflow-hidden border border-borde"
                dangerouslySetInnerHTML={{ __html: viendo.cuerpoHtml }}
              />
            ) : (
              <pre className="card overflow-x-auto whitespace-pre-wrap p-5 text-xs leading-relaxed text-suave">
                {viendo.cuerpoTexto}
              </pre>
            )}
          </div>
        </Capa>
      )}
    </div>
  )
}
