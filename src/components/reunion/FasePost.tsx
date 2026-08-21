import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Download,
  FileCheck,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { generarMinutaPDF } from '../../lib/pdf'
import {
  agendaDe,
  compromisosArrastrados,
  compromisosDe,
  estaVencido,
  rolEnSala,
  fechaCorta,
  fechaLarga,
  hora,
  mmss,
  nombreDe,
  paraInputDate,
} from '../../lib/utils'
import {
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  OBJETIVOS,
  type Compromiso,
  type Reunion,
} from '../../types'
import {
  BarraFlotante,
  Boton,
  Chip,
  ChipImportancia,
  Confirmar,
  Etiqueta,
  Vacio,
} from '../ui'
import { marca } from '../../marca'
import ModalCompromiso from './ModalCompromiso'
import ImportarMinuta from './ImportarMinuta'

/* ─────────────────────────────────────────────────────────────
   Generación de la minuta.

   Cerrar la reunión arma el borrador; mandarlo es otro paso, y
   antes hay que pasar por todo: "me debería obligar a ver todo
   esto, como un supermercado que te obliga a pasar por todo, y
   recién cuando llego acá la podés descargar o enviar".

   Y al final, un solo botón: **generar**. Recién después aparecen
   descargar y enviar. Es el orden del comprobante del banco —"que
   la acción principal sea generar la minuta, y después ofrecer las
   opciones"—: mientras tanto son un borrador, no una minuta.

   Los pendientes de reuniones anteriores dejaron de ser una
   sección aparte —"esto tiene que volar todo, confunde"—: las
   tareas viejas que siguen abiertas van en la misma caja que las
   nuevas, bajo Próximos pasos.
   ───────────────────────────────────────────────────────────── */

const PASOS = [
  { id: 'conclusiones', nombre: 'Conclusiones' },
  { id: 'temas', nombre: 'Temas' },
  { id: 'pasos', nombre: 'Próximos pasos' },
  { id: 'observaciones', nombre: 'Observaciones' },
] as const

type PasoId = (typeof PASOS)[number]['id']

export default function FasePost({ reunion }: { reunion: Reunion }) {
  const {
    estado,
    yo,
    puedeModerar,
    actualizarReunion,
    borrarCompromiso,
    reabrirReunion,
    enviarMinuta,
  } = useApp()

  const temas = agendaDe(estado, reunion.id)
  const nuevas = compromisosDe(estado, reunion.id)
  const arrastradas = compromisosArrastrados(estado, reunion.id)
  const editable = puedeModerar(reunion)
  /*
   * Borrar una tarea: quien organiza la sala, o quien la tiene a su
   * nombre. Mismo criterio que editarla —el responsable ya puede
   * reescribirle la acción entera— y que la política de la base.
   */
  const puedeBorrarTarea = (c: Compromiso) =>
    yo?.alcance === 'superadmin' ||
    rolEnSala(estado, reunion.salaId, yo?.id) === 'organizador' ||
    c.responsableId === yo?.id

  const [conclusiones, setConclusiones] = useState(reunion.conclusionesGenerales ?? '')
  const [observaciones, setObservaciones] = useState(reunion.observaciones ?? '')
  const [proxima, setProxima] = useState(paraInputDate(reunion.proximaReunionFecha))
  /* Cuáles de las que vienen de antes se suman al PDF: una por una. */
  const [enElPDF, setEnElPDF] = useState<Set<string>>(new Set())
  const [nuevaTarea, setNuevaTarea] = useState(false)
  const [editando, setEditando] = useState<Compromiso | undefined>()
  const [porBorrar, setPorBorrar] = useState<Compromiso | undefined>()
  const [importando, setImportando] = useState(false)
  const [confirmarEnvio, setConfirmarEnvio] = useState(false)
  /*
   * Una minuta ya emitida no se vuelve a "generar": si alguna vez
   * salió por correo, la pantalla abre directamente con las opciones.
   */
  const yaSalio = estado.notificaciones.some(
    (n) => n.reunionId === reunion.id && n.tipo === 'minuta',
  )
  const [generada, setGenerada] = useState(yaSalio)

  /* ── El recorrido obligatorio ── */
  const [vistos, setVistos] = useState<Set<PasoId>>(new Set())
  const refs = useRef<Partial<Record<PasoId, HTMLElement | null>>>({})

  useEffect(() => {
    /*
     * Se marca cuando la sección cruza la banda del medio de la
     * pantalla. Con un umbral por porcentaje del elemento, un apartado
     * más alto que el viewport —el de los temas, con cuatro o cinco—
     * no llegaba nunca a marcarse.
     */
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          const id = e.target.getAttribute('data-paso') as PasoId | null
          if (id) setVistos((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
        }
      },
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 },
    )
    for (const el of Object.values(refs.current)) if (el) obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const faltan = PASOS.filter((p) => !vistos.has(p.id))
  const listo = faltan.length === 0

  /* Autoguardado de los campos largos. */
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

  const irA = (id: PasoId) =>
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="space-y-8">
      {/* ── El recorrido ──
          Reemplaza al título y a su bajada: se entiende igual y ocupa
          una franja en vez de media pantalla. */}
      <nav aria-label="Apartados de la minuta" className="card flex flex-wrap gap-px bg-borde">
        {PASOS.map((p) => (
          <button
            key={p.id}
            onClick={() => irA(p.id)}
            className={
              vistos.has(p.id)
                ? 'flex flex-1 items-center justify-center gap-2 bg-panel px-3 py-3 text-meta font-semibold text-acid'
                : 'flex flex-1 items-center justify-center gap-2 bg-panel px-3 py-3 text-meta font-semibold text-suave transition-colors hover:text-tinta'
            }
          >
            {vistos.has(p.id) ? (
              <Check size={12} />
            ) : (
              <span className="h-2 w-2 shrink-0 border border-borde2" />
            )}
            {p.nombre}
          </button>
        ))}
      </nav>

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          {reunion.estado === 'cerrada' && (
            <Boton variante="fantasma" onClick={() => reabrirReunion(reunion.id)}>
              <RotateCcw size={12} /> Reabrir para editar
            </Boton>
          )}
          {/* A la derecha y en sólido: es lo que ahorra media hora de tipeo. */}
          <Boton variante="solido" className="ml-auto" onClick={() => setImportando(true)}>
            <FileText size={12} /> Importar la minuta de Gemini
          </Boton>
        </div>
      )}

      {/* ── Ficha ── */}
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
                lang="es-AR"
                className="w-full"
                aria-label="Fecha de la próxima reunión"
                value={proxima}
                onChange={(e) => setProxima(e.target.value)}
              />
            ) : (
              <div className="text-sm">{fechaCorta(reunion.proximaReunionFecha)}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 1. Conclusiones ── */}
      <section data-paso="conclusiones" ref={(el) => void (refs.current.conclusiones = el)}>
        <h3 className="subtitulo">Principales conclusiones</h3>
        {editable ? (
          <textarea
            className="w-full resize-y text-sm leading-relaxed"
            rows={4}
            aria-label="Principales conclusiones"
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

      {/* ── 2. Temas ── */}
      <section data-paso="temas" ref={(el) => void (refs.current.temas = el)}>
        <h3 className="subtitulo">Qué se habló en cada tema</h3>
        {temas.length === 0 ? (
          <Vacio titulo="Sin temas" texto="Esta reunión no tuvo temas en agenda." />
        ) : (
          <ul className="space-y-3">
            {temas.map((t, i) => (
              <li key={t.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="font-semibold text-meta text-tenue">
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
                  {t.duracionRealSeg ? (
                    <div className="shrink-0 text-right font-semibold text-meta text-suave">
                      {mmss(t.duracionRealSeg)}
                    </div>
                  ) : null}
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

      {/* ── 3. Próximos pasos ──
          Una sola caja: las tareas nuevas y las que venían de antes sin
          terminar. Diferenciadas adentro, no en secciones separadas. */}
      <section data-paso="pasos" ref={(el) => void (refs.current.pasos = el)}>
        <h3 className="subtitulo justify-between">
          Próximos pasos
          {editable && (
            <Boton tam="sm" variante="solido" onClick={() => setNuevaTarea(true)}>
              <Plus size={12} /> Agregar tarea
            </Boton>
          )}
        </h3>

        {nuevas.length === 0 && arrastradas.length === 0 ? (
          <Vacio titulo="Sin tareas" texto="No quedó nadie a cargo de nada en esta reunión." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">
                Tareas que salen de esta reunión y las que siguen abiertas de antes
              </caption>
              <thead>
                <tr className="border-b border-borde">
                  {['Tarea', 'Responsable', 'Fecha límite', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="p-3 text-left font-semibold text-[9px] uppercase tracking-[0.16em] text-suave"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {nuevas.map((c) => (
                  <Fila
                    key={c.id}
                    c={c}
                    editable={editable}
                    onEditar={() => setEditando(c)}
                    onBorrar={puedeBorrarTarea(c) ? () => setPorBorrar(c) : undefined}
                  />
                ))}

                {arrastradas.length > 0 && (
                  <tr className="bg-hueco">
                    <td colSpan={5} className="px-3 py-2">
                      <span className="font-semibold text-[9px] uppercase tracking-[0.16em] text-suave">
                        Siguen abiertas de reuniones anteriores
                      </span>
                      <span className="ml-2 text-meta text-tenue">
                        Tildá las que quieras sumar al PDF
                      </span>
                    </td>
                  </tr>
                )}
                {arrastradas.map((c) => (
                  <Fila
                    key={c.id}
                    c={c}
                    editable={false}
                    vieja
                    marcada={enElPDF.has(c.id)}
                    onMarcar={(v) =>
                      setEnElPDF((prev) => {
                        const s = new Set(prev)
                        if (v) s.add(c.id)
                        else s.delete(c.id)
                        return s
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 4. Observaciones ── */}
      <section data-paso="observaciones" ref={(el) => void (refs.current.observaciones = el)}>
        <h3 className="subtitulo">Observaciones adicionales</h3>
        {editable ? (
          <textarea
            className="w-full resize-y text-sm leading-relaxed"
            rows={3}
            aria-label="Observaciones adicionales"
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

      {/* ── El cierre ── */}
      <BarraFlotante>
        {generada ? (
          <>
            <span className="mr-auto text-meta text-suave">
              {marca.usaCorreo
                ? 'Minuta generada. Descargala o mandala a los participantes.'
                : 'Minuta generada. Descargala y pasala por donde quieras.'}
            </span>
            <Boton
              variante={marca.usaCorreo ? 'linea' : 'destacado'}
              onClick={() =>
                generarMinutaPDF(estado, reunion, { pendientesIncluidos: [...enElPDF] })
              }
            >
              <Download size={13} /> Descargar
            </Boton>
            {/* Enviar, sólo donde hay por dónde enviarla. */}
            {marca.usaCorreo && (
              <Boton variante="destacado" onClick={() => setConfirmarEnvio(true)}>
                <Send size={13} /> Enviar minuta
              </Boton>
            )}
          </>
        ) : (
          <>
            <span className="mr-auto text-meta text-suave">
              {listo
                ? 'Recorriste toda la minuta. Ya se puede generar.'
                : `Falta mirar: ${faltan.map((p) => p.nombre.toLowerCase()).join(', ')}.`}
            </span>
            <Boton variante="destacado" disabled={!listo} onClick={() => setGenerada(true)}>
              <FileCheck size={13} /> Generar minuta
            </Boton>
          </>
        )}
      </BarraFlotante>

      {/* ── Modales ── */}
      <ImportarMinuta
        abierto={importando}
        onCerrar={() => setImportando(false)}
        reunion={reunion}
      />
      <ModalCompromiso
        abierto={nuevaTarea}
        onCerrar={() => setNuevaTarea(false)}
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
        titulo="Eliminar tarea"
        texto={`Se elimina «${porBorrar?.accion}» de forma definitiva.`}
        textoBoton="Eliminar"
        peligro
        onCancelar={() => setPorBorrar(undefined)}
        onConfirmar={() => {
          if (porBorrar) void borrarCompromiso(porBorrar.id)
          setPorBorrar(undefined)
        }}
      />
      <Confirmar
        abierto={confirmarEnvio}
        titulo="Enviar la minuta"
        texto={`Sale por correo a los ${reunion.participantesIds.length} participantes, con los temas, las conclusiones y las tareas de cada uno.`}
        textoBoton="Enviar"
        onCancelar={() => setConfirmarEnvio(false)}
        onConfirmar={() => {
          void enviarMinuta(reunion.id)
          setConfirmarEnvio(false)
        }}
      />
    </div>
  )
}

/* ── Auxiliares ───────────────────────────────────────────── */

function Fila({
  c,
  editable,
  vieja,
  marcada,
  onMarcar,
  onEditar,
  onBorrar,
}: {
  c: Compromiso
  editable: boolean
  vieja?: boolean
  marcada?: boolean
  onMarcar?: (v: boolean) => void
  onEditar?: () => void
  /** Sin esto, no se muestra el botón: borrar es del socio. */
  onBorrar?: () => void
}) {
  const { estado } = useApp()
  return (
    <tr className="transition-colors hover:bg-hueco">
      <td className="p-3">
        <div className="flex items-start gap-2.5">
          {vieja && onMarcar ? (
            <input
              type="checkbox"
              className="mt-1 h-3.5 w-3.5 shrink-0 accent-signal"
              checked={marcada}
              onChange={(e) => onMarcar(e.target.checked)}
              aria-label={`Sumar «${c.accion}» al PDF`}
            />
          ) : (
            <span
              className="mt-0.5 h-5 w-0.5 shrink-0"
              style={{ background: IMPORTANCIA[c.importancia].hex }}
            />
          )}
          <div>
            <div>{c.accion}</div>
            {c.detalle && <div className="mt-0.5 text-meta text-tenue">{c.detalle}</div>}
          </div>
        </div>
      </td>
      <td className="p-3 text-meta text-suave">{nombreDe(estado, c.responsableId)}</td>
      <td
        className={
          estaVencido(c)
            ? 'p-3 font-semibold text-xs text-alerta'
            : 'p-3 font-semibold text-meta text-suave'
        }
      >
        {fechaCorta(c.fechaLimite)}
      </td>
      <td className="p-3">
        <Chip
          tono={c.estado === 'hecho' ? 'acid' : c.estado === 'en_curso' ? 'amber' : 'neutro'}
        >
          {ESTADO_COMPROMISO[c.estado].nombre}
        </Chip>
      </td>
      <td className="p-3">
        {editable && (onEditar || onBorrar) && (
          <div className="flex justify-end gap-1">
            {onEditar && (
              <button
                onClick={onEditar}
                aria-label={`Editar «${c.accion}»`}
                className="border border-borde2 p-1.5 text-suave transition-colors hover:border-tinta hover:text-tinta"
              >
                <Pencil size={11} />
              </button>
            )}
            {onBorrar && (
              <button
                onClick={onBorrar}
                aria-label={`Eliminar «${c.accion}»`}
                className="border border-borde2 p-1.5 text-suave transition-colors hover:border-signal hover:text-signal"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

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
      aria-label="Conclusiones de este tema"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      placeholder="Conclusiones de este tema."
    />
  )
}

