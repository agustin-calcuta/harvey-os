import { useEffect, useState } from 'react'
import { Download, Mail, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { generarMinutaPDF } from '../../lib/pdf'
import { correoMinuta } from '../../lib/email'
import {
  agendaDe,
  compromisosArrastrados,
  compromisosDe,
  estaVencido,
  fechaCorta,
  fechaLarga,
  hora,
  mmss,
  nombreDe,
  paraInputDate,
} from '../../lib/utils'
import { ESTADO_COMPROMISO, IMPORTANCIA, OBJETIVOS, type Compromiso, type Reunion } from '../../types'
import { Boton, Capa, Chip, ChipImportancia, Confirmar, Etiqueta, Vacio } from '../ui'
import ModalCompromiso from './ModalCompromiso'

export default function FasePost({ reunion }: { reunion: Reunion }) {
  const {
    estado,
    puedeModerar,
    actualizarReunion,
    borrarCompromiso,
    reabrirReunion,
  } = useApp()

  const temas = agendaDe(estado, reunion.id)
  const compromisos = compromisosDe(estado, reunion.id)
  const arrastrados = compromisosArrastrados(estado, reunion.id)
  const editable = puedeModerar(reunion)

  const [conclusiones, setConclusiones] = useState(reunion.conclusionesGenerales ?? '')
  const [observaciones, setObservaciones] = useState(reunion.observaciones ?? '')
  const [proxima, setProxima] = useState(paraInputDate(reunion.proximaReunionFecha))
  /* Qué pendientes viejos entran en la minuta lo decide el organizador
     uno por uno, no una casilla de todo o nada. */
  const [enElPDF, setEnElPDF] = useState<Set<string>>(new Set())
  const [nuevoCompromiso, setNuevoCompromiso] = useState(false)
  const [editando, setEditando] = useState<Compromiso | undefined>()
  const [porBorrar, setPorBorrar] = useState<Compromiso | undefined>()
  const [verCorreo, setVerCorreo] = useState(false)

  /* Autoguardado de los campos largos */
  useEffect(() => {
    const id = window.setTimeout(() => {
      const cambios: Partial<Reunion> = {}
      if ((reunion.conclusionesGenerales ?? '') !== conclusiones)
        cambios.conclusionesGenerales = conclusiones.trim() || undefined
      if ((reunion.observaciones ?? '') !== observaciones)
        cambios.observaciones = observaciones.trim() || undefined
      const isoProxima = proxima ? new Date(`${proxima}T10:00:00`).toISOString() : undefined
      if ((reunion.proximaReunionFecha ?? '') !== (isoProxima ?? ''))
        cambios.proximaReunionFecha = isoProxima
      if (Object.keys(cambios).length) void actualizarReunion(reunion.id, cambios)
    }, 900)
    return () => window.clearTimeout(id)
  }, [conclusiones, observaciones, proxima, reunion, actualizarReunion])

  return (
    <div className="space-y-8">
      {/* ── Acciones ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Boton
          variante="solido"
          onClick={() =>
            generarMinutaPDF(estado, reunion, { pendientesIncluidos: [...enElPDF] })
          }
        >
          <Download size={13} /> Descargar minuta PDF
          {enElPDF.size > 0 && (
            <span className="ml-1 opacity-70">+{enElPDF.size}</span>
          )}
        </Boton>
        <Boton onClick={() => setVerCorreo(true)}>
          <Mail size={13} /> Ver el correo
        </Boton>
        {editable && reunion.estado === 'cerrada' && (
          <Boton variante="fantasma" onClick={() => reabrirReunion(reunion.id)}>
            <RotateCcw size={12} /> Reabrir para editar
          </Boton>
        )}
      </div>

      {/* ── Ficha, tal cual la minuta de Fran ── */}
      <div className="card">
        <div className="grid gap-px bg-borde sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta="Participantes">
            {reunion.participantesIds.map((id) => nombreDe(estado, id)).join(', ')}
          </Dato>
          <Dato etiqueta="Fecha">
            {fechaLarga(reunion.fecha)} · {hora(reunion.fecha)}
          </Dato>
          <Dato etiqueta="Moderador">{nombreDe(estado, reunion.moderadorId)}</Dato>
          <div className="bg-panel p-4">
            <Etiqueta className="mb-1.5">Próxima reunión</Etiqueta>
            {editable ? (
              <input
                type="date"
                className="w-full"
                value={proxima}
                onChange={(e) => setProxima(e.target.value)}
              />
            ) : (
              <div className="text-sm">{fechaCorta(reunion.proximaReunionFecha)}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Conclusiones generales ── */}
      <section>
        <Etiqueta className="bracket mb-3">Principales conclusiones</Etiqueta>
        {editable ? (
          <textarea
            className="w-full resize-y text-sm leading-relaxed"
            rows={4}
            value={conclusiones}
            onChange={(e) => setConclusiones(e.target.value)}
            placeholder="Los hallazgos, definiciones y decisiones que dejó la reunión."
          />
        ) : (
          <p className="card whitespace-pre-wrap p-4 text-sm leading-relaxed text-suave">
            {conclusiones || 'Sin conclusiones registradas.'}
          </p>
        )}
      </section>

      {/* ── Desarrollo por tema ── */}
      <section>
        <Etiqueta className="bracket mb-3">Desarrollo por tema</Etiqueta>
        {temas.length === 0 ? (
          <Vacio titulo="Sin temas" texto="Esta reunión no tuvo temas en agenda." />
        ) : (
          <ul className="space-y-3">
            {temas.map((t, i) => (
              <li key={t.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="font-semibold text-xs text-tenue">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-base">{t.titulo}</h4>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:pl-8">
                      <ChipImportancia valor={t.importancia} />
                      <Chip>{OBJETIVOS[t.objetivo].nombre}</Chip>
                      <span className="font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
                        Propuso {nombreDe(estado, t.propuestoPor)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold text-xs text-suave">
                      {t.duracionRealSeg ? mmss(t.duracionRealSeg) : '—'}
                      <span className="text-tenue"> / {t.duracionMin}:00</span>
                    </div>
                    {t.duracionRealSeg && t.duracionRealSeg > t.duracionMin * 60 && (
                      <div className="mt-0.5 font-semibold text-[9px] uppercase tracking-[0.14em] text-signal">
                        Se pasó {mmss(t.duracionRealSeg - t.duracionMin * 60)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 border-t border-borde pt-3 sm:pl-8">
                  {editable ? (
                    <NotaEditable temaId={t.id} valor={t.conclusiones ?? ''} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-suave">
                      {t.conclusiones || 'Sin conclusiones registradas.'}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Próximos compromisos ── */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Etiqueta className="bracket">Próximos compromisos</Etiqueta>
          {editable && (
            <Boton tam="sm" variante="solido" onClick={() => setNuevoCompromiso(true)}>
              <Plus size={12} /> Agregar
            </Boton>
          )}
        </div>

        {compromisos.length === 0 ? (
          <Vacio titulo="Sin compromisos" texto="No se registraron acciones en esta reunión." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-borde">
                  {['Acción / compromiso', 'Responsable', 'Fecha límite', 'Estado', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="p-3 text-left font-semibold text-[9px] font-normal uppercase tracking-[0.16em] text-suave"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {compromisos.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-hueco">
                    <td className="p-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 h-5 w-0.5 shrink-0"
                          style={{ background: IMPORTANCIA[c.importancia].hex }}
                        />
                        <div>
                          <div>{c.accion}</div>
                          {c.detalle && (
                            <div className="mt-0.5 text-xs text-tenue">{c.detalle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-suave">{nombreDe(estado, c.responsableId)}</td>
                    <td
                      className={
                        estaVencido(c)
                          ? 'p-3 font-semibold text-xs text-signal'
                          : 'p-3 font-semibold text-xs text-suave'
                      }
                    >
                      {fechaCorta(c.fechaLimite)}
                    </td>
                    <td className="p-3">
                      <Chip
                        tono={
                          c.estado === 'hecho'
                            ? 'acid'
                            : c.estado === 'bloqueado'
                              ? 'signal'
                              : c.estado === 'en_curso'
                                ? 'amber'
                                : 'neutro'
                        }
                      >
                        {ESTADO_COMPROMISO[c.estado].nombre}
                      </Chip>
                    </td>
                    <td className="p-3">
                      {editable && (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditando(c)}
                            className="border border-borde2 p-1.5 text-suave transition-colors hover:border-tinta hover:text-tinta"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => setPorBorrar(c)}
                            className="border border-borde2 p-1.5 text-suave transition-colors hover:border-signal hover:text-signal"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Pendientes anteriores ── */}
      {arrastrados.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Etiqueta className="bracket mb-1">Pendientes de reuniones anteriores</Etiqueta>
              <p className="max-w-2xl text-xs text-tenue">
                No forman parte de esta minuta. Tildá los que quieras sumar al PDF.
              </p>
            </div>
            <button
              onClick={() =>
                setEnElPDF((prev) =>
                  prev.size === arrastrados.length
                    ? new Set()
                    : new Set(arrastrados.map((c) => c.id)),
                )
              }
              className="text-[10px] font-semibold uppercase tracking-[0.12em] text-suave underline underline-offset-2 hover:text-tinta"
            >
              {enElPDF.size === arrastrados.length ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          <ul className="card divide-y divide-borde">
            {arrastrados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 shrink-0 accent-[#C0392B]"
                  checked={enElPDF.has(c.id)}
                  onChange={(e) =>
                    setEnElPDF((prev) => {
                      const s = new Set(prev)
                      if (e.target.checked) s.add(c.id)
                      else s.delete(c.id)
                      return s
                    })
                  }
                  aria-label={`Sumar «${c.accion}» al PDF`}
                />
                <ChipImportancia valor={c.importancia} conTexto={false} />
                <span className="min-w-0 flex-1 truncate text-sm">{c.accion}</span>
                <span className="text-xs text-suave">{nombreDe(estado, c.responsableId)}</span>
                <span
                  className={
                    estaVencido(c)
                      ? 'font-semibold text-[11px] text-signal'
                      : 'font-semibold text-[11px] text-tenue'
                  }
                >
                  {fechaCorta(c.fechaLimite)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Observaciones ── */}
      <section>
        <Etiqueta className="bracket mb-3">Observaciones adicionales</Etiqueta>
        {editable ? (
          <textarea
            className="w-full resize-y text-sm leading-relaxed"
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Riesgos, pendientes o comentarios que deban quedar registrados."
          />
        ) : (
          <p className="card whitespace-pre-wrap p-4 text-sm leading-relaxed text-suave">
            {observaciones || 'Sin observaciones.'}
          </p>
        )}
      </section>

      {/* ── Modales ── */}
      <ModalCompromiso
        abierto={nuevoCompromiso}
        onCerrar={() => setNuevoCompromiso(false)}
        reunionId={reunion.id}
      />
      <ModalCompromiso
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        reunionId={reunion.id}
        compromiso={editando}
      />
      <Confirmar
        abierto={!!porBorrar}
        titulo="Eliminar compromiso"
        texto={`Se elimina “${porBorrar?.accion}” de forma definitiva.`}
        textoBoton="Eliminar"
        peligro
        onCancelar={() => setPorBorrar(undefined)}
        onConfirmar={() => {
          if (porBorrar) void borrarCompromiso(porBorrar.id)
          setPorBorrar(undefined)
        }}
      />
      <VistaCorreo abierto={verCorreo} onCerrar={() => setVerCorreo(false)} reunion={reunion} />
    </div>
  )
}

/* ── Auxiliares ───────────────────────────────────────────── */

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel p-4">
      <Etiqueta className="mb-1.5">{etiqueta}</Etiqueta>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  )
}

function NotaEditable({ temaId, valor }: { temaId: string; valor: string }) {
  const { actualizarTema } = useApp()
  const [texto, setTexto] = useState(valor)

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (texto !== valor) void actualizarTema(temaId, { conclusiones: texto.trim() || undefined })
    }, 900)
    return () => window.clearTimeout(id)
  }, [texto, valor, temaId, actualizarTema])

  return (
    <textarea
      className="w-full resize-y text-sm leading-relaxed"
      rows={3}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      placeholder="Conclusiones de este tema."
    />
  )
}

function VistaCorreo({
  abierto,
  onCerrar,
  reunion,
}: {
  abierto: boolean
  onCerrar: () => void
  reunion: Reunion
}) {
  const { estado } = useApp()
  if (!abierto) return null
  const correo = correoMinuta(estado, reunion)
  const destinatarios = estado.usuarios
    .filter((u) => reunion.participantesIds.includes(u.id))
    .map((u) => u.email)

  return (
    <Capa onCerrar={onCerrar}>
      <div className="my-auto w-full max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Etiqueta className="bracket mb-1">Se envía a {destinatarios.length} personas</Etiqueta>
            <div className="text-sm text-tinta">{correo.asunto}</div>
          </div>
          <Boton onClick={onCerrar}>Cerrar</Boton>
        </div>
        <div
          className="overflow-hidden border border-borde"
          dangerouslySetInnerHTML={{ __html: correo.html }}
        />
      </div>
    </Capa>
  )
}
