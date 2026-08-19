import { useMemo, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { integrantes, nombreDe } from '../../lib/utils'
import {
  leerMinutaDeGemini,
  resolverResponsables,
  type MinutaLeida,
  type TareaLeida,
} from '../../lib/minuta-gemini'
import type { Importancia, Reunion } from '../../types'
import { Boton, Campo, Modal } from '../ui'

/* ─────────────────────────────────────────────────────────────
   Traer la minuta que Gemini escribió del Meet.

   Se pega el texto o se suelta el `.md` que baja de Google, y lo que
   sale queda **a la vista para revisar antes de guardar**. Ese paso
   no es un trámite: una tarea que aparece sola a nombre de quien no
   corresponde hace que el equipo deje de confiar en la herramienta,
   y eso no se recupera con un botón de deshacer.

   Se puede destildar lo que no va y corregir el responsable de cada
   una. Recién al confirmar se escribe.
   ───────────────────────────────────────────────────────────── */

interface Elegida extends TareaLeida {
  incluida: boolean
}

export default function ImportarMinuta({
  abierto,
  onCerrar,
  reunion,
}: {
  abierto: boolean
  onCerrar: () => void
  reunion: Reunion
}) {
  const { estado, crearCompromiso, actualizarReunion, actualizarTema, avisar } = useApp()

  const [texto, setTexto] = useState('')
  const [minuta, setMinuta] = useState<MinutaLeida | null>(null)
  const [tareas, setTareas] = useState<Elegida[]>([])
  const [tomarConclusiones, setTomarConclusiones] = useState(true)
  const [guardando, setGuardando] = useState(false)

  /* Sólo la gente de esta sala puede quedar a cargo de algo. */
  const gente = useMemo(() => integrantes(estado, reunion.salaId), [estado, reunion.salaId])

  const analizar = (contenido: string) => {
    const leida = leerMinutaDeGemini(contenido)
    if (!leida) {
      avisar(
        'Eso no parece una minuta de Gemini. Tiene que ser el archivo tal como lo baja Google, sin editar.',
        'error',
      )
      return
    }
    setMinuta(leida)
    /*
     * Sin responsable no entra: el modelo pide uno y ponerlo por
     * defecto —el moderador, por ejemplo— sería crearle trabajo a
     * alguien que no lo aceptó. Se tilda solo lo que se pudo
     * resolver; el resto espera a que alguien elija.
     */
    setTareas(
      resolverResponsables(leida, gente).map((t) => ({
        ...t,
        incluida: Boolean(t.responsableId),
      })),
    )
  }

  const soltarArchivo = async (archivo: File | undefined) => {
    if (!archivo) return
    const contenido = await archivo.text()
    setTexto(contenido)
    analizar(contenido)
  }

  const guardar = async () => {
    if (!minuta) return
    setGuardando(true)
    try {
      /* Las conclusiones generales, del resumen de Gemini. */
      if (tomarConclusiones && minuta.resumen) {
        await actualizarReunion(reunion.id, { conclusionesGenerales: minuta.resumen })
      }

      /*
       * Las conclusiones por tema se vuelcan sólo donde el título
       * coincide con un tema del temario. Gemini arma sus propios
       * títulos, así que casi nunca coinciden todos: lo que no
       * matchea no se pierde —queda en el resumen— pero tampoco se
       * mete a la fuerza en un tema que no le corresponde.
       */
      if (tomarConclusiones) {
        const delTemario = estado.temas.filter((t) => t.reunionId === reunion.id)
        for (const leido of minuta.temas) {
          const tema = delTemario.find(
            (t) => t.titulo.trim().toLowerCase() === leido.titulo.trim().toLowerCase(),
          )
          if (tema && !tema.conclusiones?.trim()) {
            await actualizarTema(tema.id, { conclusiones: leido.conclusion })
          }
        }
      }

      /* Y las tareas tildadas, que son las que tienen responsable. */
      const aCrear = tareas.filter(
        (t): t is Elegida & { responsableId: string } => t.incluida && Boolean(t.responsableId),
      )
      for (const t of aCrear) {
        await crearCompromiso({
          salaId: reunion.salaId,
          reunionId: reunion.id,
          accion: t.accion,
          detalle: t.detalle || undefined,
          responsableId: t.responsableId,
          /*
           * Gemini no dice ni la importancia ni la fecha límite: no
           * están en la minuta. Entran como «media» y sin
           * vencimiento, para que quien las revise las ajuste desde
           * la lista de tareas.
           */
          importancia: 'media' as Importancia,
          estado: 'pendiente',
        })
      }

      avisar(
        aCrear.length
          ? `Listo: ${aCrear.length} ${aCrear.length === 1 ? 'tarea creada' : 'tareas creadas'}.`
          : 'Minuta importada.',
      )
      cerrarYLimpiar()
    } catch (e) {
      avisar(`No se pudo importar: ${e instanceof Error ? e.message : e}`, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const cerrarYLimpiar = () => {
    setTexto('')
    setMinuta(null)
    setTareas([])
    onCerrar()
  }

  const sinResponsable = tareas.filter((t) => t.incluida && !t.responsableId).length

  return (
    <Modal abierto={abierto} onCerrar={cerrarYLimpiar} titulo="Importar la minuta de Gemini" ancho="lg">
      {!minuta ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-suave">
            Pegá acá las notas que Gemini manda después del Meet, o soltá el archivo{' '}
            <code className="bg-hueco px-1 text-meta">.md</code> tal como lo baja Google.
          </p>

          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              void soltarArchivo(e.dataTransfer.files[0])
            }}
            className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-borde2 p-6 text-center transition-colors hover:border-signal"
          >
            <Upload size={20} className="text-tenue" />
            <span className="text-meta text-suave">
              Soltá el archivo acá, o hacé clic para elegirlo
            </span>
            <input
              type="file"
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={(e) => void soltarArchivo(e.target.files?.[0])}
            />
          </label>

          <Campo etiqueta="O pegá el texto">
            <textarea
              rows={8}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="# 📝 Las notas…"
              className="w-full font-mono text-meta"
            />
          </Campo>

          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={cerrarYLimpiar}>
              Cancelar
            </Boton>
            <Boton variante="destacado" disabled={!texto.trim()} onClick={() => analizar(texto)}>
              <FileText size={13} /> Leer la minuta
            </Boton>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Lo que se encontró ── */}
          <div className="card p-4">
            <div className="label mb-2">Se leyó</div>
            <div className="text-sm">{minuta.titulo}</div>
            <div className="mt-1 text-meta text-tenue">
              {minuta.fecha && `${minuta.fecha} · `}
              {minuta.tareas.length} {minuta.tareas.length === 1 ? 'tarea' : 'tareas'} ·{' '}
              {minuta.temas.length} {minuta.temas.length === 1 ? 'tema' : 'temas'} con
              conclusión
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-signal"
              checked={tomarConclusiones}
              onChange={(e) => setTomarConclusiones(e.target.checked)}
            />
            <span>
              <span className="block text-sm">Tomar también las conclusiones</span>
              <span className="block text-meta text-tenue">
                El resumen va a las conclusiones generales. Las de cada tema se cargan sólo
                donde el título coincide con uno del temario, y sin pisar lo ya escrito.
              </span>
            </span>
          </label>

          {/* ── Las tareas, para revisar ── */}
          <div>
            <div className="subtitulo">
              Tareas detectadas
              <span className="cuenta">
                {tareas.filter((t) => t.incluida).length} de {tareas.length}
              </span>
            </div>

            {sinResponsable > 0 && (
              <p className="mb-3 border-l-2 border-amber pl-3 text-meta text-suave">
                {sinResponsable === 1
                  ? 'Una tarea quedó sin responsable'
                  : `${sinResponsable} tareas quedaron sin responsable`}
                : Gemini las anotó a nombre de alguien que no está en esta sala, o del grupo.
                Elegí a quién corresponde o dejalas sin asignar.
              </p>
            )}

            <div className="space-y-2">
              {tareas.map((t, i) => (
                <div
                  key={i}
                  className={`card p-3 ${t.incluida ? '' : 'opacity-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-signal"
                      checked={t.incluida}
                      disabled={!t.responsableId}
                      title={
                        t.responsableId ? undefined : 'Elegí un responsable para poder incluirla'
                      }
                      onChange={(e) =>
                        setTareas((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, incluida: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{t.accion}</div>
                      {t.detalle && (
                        <div className="mt-1 text-meta leading-snug text-tenue">{t.detalle}</div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={t.responsableId ?? ''}
                          onChange={(e) =>
                            setTareas((prev) =>
                              prev.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      responsableId: e.target.value || undefined,
                                      /* Elegir a alguien la habilita sola. */
                                      incluida: Boolean(e.target.value),
                                    }
                                  : x,
                              ),
                            )
                          }
                          className="text-meta"
                        >
                          <option value="">Sin responsable</option>
                          {gente.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre}
                            </option>
                          ))}
                        </select>
                        <span className="text-meta text-tenue">
                          Gemini anotó «{t.responsableTexto}»
                          {t.responsableId &&
                            nombreDe(estado, t.responsableId) !== t.responsableTexto &&
                            ` → ${nombreDe(estado, t.responsableId)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {tareas.length === 0 && (
              <p className="text-meta text-tenue">
                La minuta no trae próximos pasos. Se pueden tomar igual las conclusiones.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setMinuta(null)}>
              Volver
            </Boton>
            <Boton variante="destacado" disabled={guardando} onClick={() => void guardar()}>
              {guardando ? 'Importando…' : 'Importar'}
            </Boton>
          </div>
        </div>
      )}
    </Modal>
  )
}
