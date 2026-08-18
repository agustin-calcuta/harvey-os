import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  agendaDe,
  compromisosArrastrados,
  compromisosDe,
  estaVencido,
  fechaCorta,
  mmss,
  nombreDe,
  temasSinTratar,
} from '../../lib/utils'
import {
  COLUMNAS_KANBAN,
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  OBJETIVOS,
  type Reunion,
} from '../../types'
import { Boton, Chip, Confirmar, Vacio } from '../ui'
import ModalCompromiso from './ModalCompromiso'
import Grabadora from './Grabadora'
import type { MinutaSugerida } from '../../lib/ia'

/* ─────────────────────────────────────────────────────────────
   La reunión, en vivo.

   Arranca por el seguimiento: "el primer tema debería ser
   seguimiento" — se repasan las tareas que quedaron de las
   reuniones anteriores, se actualizan ahí mismo, y recién después
   se entra en los temas del día.

   El cronómetro quedó reducido a un reloj al costado y el botón de
   tareas pasó al frente: lo importante mientras se habla es
   registrar quién se lleva qué.
   ───────────────────────────────────────────────────────────── */

/** El seguimiento es el paso cero; los temas van del 0 en adelante. */
const SEGUIMIENTO = -1

export default function FaseVivo({
  reunion,
  pidiendoCierre = false,
  onCierreAtendido,
}: {
  reunion: Reunion
  /** La cabecera pidió cerrar: se abre el mismo diálogo de acá. */
  pidiendoCierre?: boolean
  onCierreAtendido?: () => void
}) {
  const { estado, actualizarTema, actualizarReunion, cerrarReunion, puedeModerar } = useApp()
  const agenda = agendaDe(estado, reunion.id)

  /* Para leer el estado del momento sin re-crear `volcarMinuta`. */
  const ref = useRef(estado)
  ref.current = estado

  const [indice, setIndice] = useState(SEGUIMIENTO)
  const [corriendo, setCorriendo] = useState(false)
  const [seg, setSeg] = useState(0)
  const [notas, setNotas] = useState('')
  const [nuevaTarea, setNuevaTarea] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)

  /* El botón de la cabecera abre este mismo diálogo. */
  useEffect(() => {
    if (pidiendoCierre) setConfirmarCierre(true)
  }, [pidiendoCierre])

  const cerrarDialogo = () => {
    setConfirmarCierre(false)
    onCierreAtendido?.()
  }

  /*
   * Lo que propuso la IA entra como borrador: la conclusión de cada
   * tema en su tema y el resto en la minuta, que es donde se revisa.
   * Nada se da por bueno solo —de ahí `sugerida`—: quien modera lo
   * lee antes de generar.
   *
   * Se emparejan por id cuando el modelo lo devolvió, y por título
   * cuando no: es un modelo escuchando, no un formulario.
   */
  const volcarMinuta = useCallback(
    (m: MinutaSugerida, transcripcion: string) => {
      const deLaAgenda = agendaDe(ref.current, reunion.id)
      for (const propuesta of m.porTema) {
        const suyo =
          deLaAgenda.find((t) => t.id === propuesta.temaId) ??
          deLaAgenda.find(
            (t) => t.titulo.trim().toLowerCase() === propuesta.titulo.trim().toLowerCase(),
          )
        if (!suyo || !propuesta.conclusion.trim()) continue
        // Lo que ya escribió una persona gana: la IA no pisa notas.
        if (suyo.conclusiones?.trim()) continue
        void actualizarTema(suyo.id, { conclusiones: propuesta.conclusion.trim() })
      }

      const pasos = m.proximosPasos
        .filter((p) => p.accion.trim())
        .map((p) => `· ${p.accion.trim()}${p.responsable ? ` — ${p.responsable}` : ''}${
          p.fechaLimite ? ` (${p.fechaLimite})` : ''
        }`)

      const observaciones = [
        m.observaciones?.trim(),
        pasos.length ? `Tareas que se escucharon en la reunión:\n${pasos.join('\n')}` : '',
        `Transcripción de la grabación:\n${transcripcion.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n')

      void actualizarReunion(reunion.id, {
        conclusionesGenerales:
          reunion.conclusionesGenerales?.trim() || m.conclusionesGenerales.trim() || undefined,
        observaciones: observaciones || undefined,
      })
    },
    [reunion, actualizarTema, actualizarReunion],
  )

  const tema = indice >= 0 ? agenda[indice] : undefined
  const moderador = puedeModerar(reunion)
  const arrastradas = useMemo(
    () => compromisosArrastrados(estado, reunion.id),
    [estado, reunion.id],
  )
  const delTema = tema
    ? compromisosDe(estado, reunion.id).filter((c) => c.temaId === tema.id)
    : []

  /* Cronómetro */
  const intervalo = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!corriendo) return
    intervalo.current = window.setInterval(() => setSeg((s) => s + 1), 1000)
    return () => window.clearInterval(intervalo.current)
  }, [corriendo])

  /* Al cambiar de tema: guardamos lo anterior y cargamos lo nuevo. */
  const guardarYSaltar = (nuevo: number) => {
    if (tema) {
      void actualizarTema(tema.id, {
        conclusiones: notas.trim() || undefined,
        duracionRealSeg: seg > 0 ? seg : tema.duracionRealSeg,
      })
    }
    setIndice(nuevo)
    const siguiente = nuevo >= 0 ? agenda[nuevo] : undefined
    setNotas(siguiente?.conclusiones ?? '')
    setSeg(siguiente?.duracionRealSeg ?? 0)
    setCorriendo(false)
  }

  /* Autoguardado de las notas mientras se escribe. */
  useEffect(() => {
    if (!tema) return
    const id = window.setTimeout(() => {
      if ((tema.conclusiones ?? '') !== notas) {
        void actualizarTema(tema.id, { conclusiones: notas.trim() || undefined })
      }
    }, 900)
    return () => window.clearTimeout(id)
  }, [notas, tema, actualizarTema])

  const asignado = (tema?.duracionMin ?? 0) * 60
  const excedido = seg > asignado && asignado > 0
  const conNotas = agenda.filter((t) => t.conclusiones?.trim()).length

  return (
    <div className="space-y-5">
      {/* ── Cabecera en vivo ──
          Sin el botón de cerrar: vive en la cabecera de la reunión,
          donde se ve desde las tres pestañas y no aparece dos veces. */}
      <div className="flex items-center gap-2">
        <span className="pulse-dot h-2 w-2 rounded-full bg-signal" />
        <span className="label text-signal">Reunión en curso</span>
      </div>

      {/* ── Grabación ──
          Sólo si el servicio está configurado; si no, no se dibuja. */}
      {moderador && <Grabadora reunion={reunion} onMinuta={volcarMinuta} />}

      {/* ── Recorrido ──
          El seguimiento primero, después los temas con su título a la
          vista: se salta al que se quiera, en el orden que salga. */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => guardarYSaltar(SEGUIMIENTO)}
          className={
            indice === SEGUIMIENTO
              ? 'flex shrink-0 items-center gap-2 border border-tinta bg-tinta px-3 py-2 text-[11px] text-fondo'
              : 'flex shrink-0 items-center gap-2 border border-borde bg-panel px-3 py-2 text-[11px] text-suave transition-colors hover:border-suave hover:text-tinta'
          }
        >
          <ListChecks size={12} className="shrink-0" />
          Seguimiento
          {arrastradas.length > 0 && (
            <span className={indice === SEGUIMIENTO ? 'text-fondo/60' : 'text-tenue'}>
              {arrastradas.length}
            </span>
          )}
        </button>
        {agenda.map((t, i) => (
          <button
            key={t.id}
            onClick={() => guardarYSaltar(i)}
            title={t.titulo}
            className={
              i === indice
                ? 'flex max-w-[220px] shrink-0 items-center gap-2 border border-tinta bg-tinta px-3 py-2 text-[11px] text-fondo'
                : 'flex max-w-[220px] shrink-0 items-center gap-2 border border-borde bg-panel px-3 py-2 text-[11px] text-suave transition-colors hover:border-suave hover:text-tinta'
            }
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: IMPORTANCIA[t.importancia].hex }}
            />
            <span className={i === indice ? 'text-fondo/60' : 'text-tenue'}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="truncate">{t.titulo}</span>
            {t.conclusiones && (
              <Check size={11} className={i === indice ? 'shrink-0' : 'shrink-0 text-acid'} />
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-5">
        {indice === SEGUIMIENTO ? (
          <Seguimiento reunion={reunion} />
        ) : !tema ? (
          <Vacio
            titulo="No hay temas en la agenda"
            texto="Volvé a la pre-reunión y aprobá al menos un tema."
          />
        ) : (
          <>
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borde p-5">
                <div className="min-w-0">
                  <h2 className="text-xl leading-snug sm:text-2xl">{tema.titulo}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-tenue">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: IMPORTANCIA[tema.importancia].hex }}
                      title={`Importancia ${IMPORTANCIA[tema.importancia].nombre.toLowerCase()}`}
                    />
                    <span title={OBJETIVOS[tema.objetivo].desc}>
                      {OBJETIVOS[tema.objetivo].nombre}
                    </span>
                    <span>Propuso {nombreDe(estado, tema.propuestoPor)}</span>
                  </div>
                  {tema.detalle && (
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-suave">
                      {tema.detalle}
                    </p>
                  )}
                </div>

                {/* El reloj, al costado: cuenta cuánto llevamos, no manda. */}
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={
                      excedido
                        ? 'font-semibold text-lg tabular-nums text-signal'
                        : 'font-semibold text-lg tabular-nums text-suave'
                    }
                    title={
                      excedido
                        ? `Pasado ${mmss(seg - asignado)} de los ${tema.duracionMin} min previstos`
                        : `De ${tema.duracionMin} min previstos`
                    }
                  >
                    {mmss(seg)}
                  </span>
                  <button
                    onClick={() => setCorriendo((c) => !c)}
                    className="border border-borde2 bg-panel p-2 text-suave transition-colors hover:border-tinta hover:text-tinta"
                    aria-label={corriendo ? 'Pausar el reloj' : 'Iniciar el reloj'}
                  >
                    {corriendo ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button
                    onClick={() => {
                      setSeg(0)
                      setCorriendo(false)
                    }}
                    className="border border-borde2 bg-panel p-2 text-suave transition-colors hover:border-tinta hover:text-tinta"
                    aria-label="Reiniciar el reloj"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {/* ── Tareas del tema ──
                  Adelante de las conclusiones: lo importante es registrar
                  quién se lleva qué. */}
              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">Tareas que salen de este tema</span>
                  <Boton variante="solido" onClick={() => setNuevaTarea(true)}>
                    <Plus size={13} /> Registrar tarea
                  </Boton>
                </div>

                {delTema.length === 0 ? (
                  <p className="text-meta text-tenue">
                    Todavía no hay ninguna. ¿Quién queda a cargo de qué?
                  </p>
                ) : (
                  <ul className="divide-y divide-borde border-t border-borde">
                    {delTema.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 py-2.5 text-xs">
                        <span
                          className="h-4 w-0.5 shrink-0"
                          style={{ background: IMPORTANCIA[c.importancia].hex }}
                        />
                        <span className="min-w-0 flex-1">{c.accion}</span>
                        <span className="text-suave">{nombreDe(estado, c.responsableId)}</span>
                        <span className="text-tenue">{fechaCorta(c.fechaLimite)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Notas: lo que se pide anotar cambia según el objetivo. */}
            <div className="card p-5">
              <span className="mb-3 block text-sm">{OBJETIVOS[tema.objetivo].pideConclusion}</span>
              <textarea
                className="w-full resize-y font-sans text-sm leading-relaxed"
                rows={6}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={OBJETIVOS[tema.objetivo].ejemploConclusion}
              />
              <div className="mt-2 text-meta text-tenue">Se guarda solo mientras escribís</div>
            </div>

            {/* Navegación */}
            <div className="flex items-center justify-between gap-3">
              <Boton onClick={() => guardarYSaltar(indice - 1)} disabled={indice < 0}>
                <ChevronLeft size={13} /> Anterior
              </Boton>
              <span className="text-meta text-tenue">
                {conNotas} de {agenda.length} con notas ·{' '}
                {compromisosDe(estado, reunion.id).length} tareas
              </span>
              <Boton
                variante={indice === agenda.length - 1 ? 'linea' : 'solido'}
                onClick={() => guardarYSaltar(Math.min(agenda.length - 1, indice + 1))}
                disabled={indice === agenda.length - 1}
              >
                Siguiente <ChevronRight size={13} />
              </Boton>
            </div>
          </>
        )}
      </div>

      {/* ── Modales ── */}
      {tema && (
        <ModalCompromiso
          abierto={nuevaTarea}
          onCerrar={() => setNuevaTarea(false)}
          reunionId={reunion.id}
          temaId={tema.id}
        />
      )}

      <Confirmar
        abierto={confirmarCierre}
        titulo="Cerrar y generar minuta"
        texto={`Se arma el borrador de la minuta con ${agenda.length} temas y ${compromisosDe(estado, reunion.id).length} tareas. Vas a poder revisarlo entero antes de mandarlo.${
          agenda.length - conNotas > 0
            ? ` Los ${agenda.length - conNotas} temas sin notas vuelven al bloc de notas de quien los propuso.`
            : ''
        }`}
        textoBoton="Cerrar y generar"
        onCancelar={cerrarDialogo}
        onConfirmar={() => {
          if (tema) {
            void actualizarTema(tema.id, {
              conclusiones: notas.trim() || undefined,
              duracionRealSeg: seg > 0 ? seg : tema.duracionRealSeg,
            })
          }
          // Sin correo: la minuta se manda al final, ya revisada.
          void cerrarReunion(reunion.id, false)
          cerrarDialogo()
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Seguimiento: el primer paso de toda reunión.

   "Tené la minuta de la reunión anterior para ver si la gente hizo
   lo que tenía que hacer." Se repasa tarea por tarea y se marca el
   estado en el momento; lo que queda hecho no vuelve a aparecer la
   próxima vez. Abajo, los temas que quedaron sin hablar, para
   incluirlos si hoy hay lugar.
   ───────────────────────────────────────────────────────────── */

function Seguimiento({ reunion }: { reunion: Reunion }) {
  const { estado, moverCompromiso, asignarAReunion, organizoLa } = useApp()
  const puedeOrganizar = organizoLa(reunion.salaId)
  const tareas = compromisosArrastrados(estado, reunion.id)
  const sinTratar = temasSinTratar(estado, reunion.salaId)

  return (
    <div className="space-y-5">
      <h2 className="subtitulo">
        Lo que quedó de antes
        <span className="cuenta">
          {tareas.length === 0
            ? 'nada abierto'
            : `${tareas.length} ${tareas.length === 1 ? 'tarea' : 'tareas'}`}
        </span>
      </h2>

      {tareas.length > 0 && (
        <ul className="card divide-y divide-borde">
          {tareas.map((c) => {
            const deDonde = estado.reuniones.find((r) => r.id === c.reunionId)
            return (
              <li key={c.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-8 w-0.5 shrink-0"
                    style={{ background: IMPORTANCIA[c.importancia].hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug">{c.accion}</div>
                    {c.avance && <p className="mt-1 text-meta text-suave">{c.avance}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-[10px] uppercase tracking-[0.14em] text-tenue">
                      <span className="text-tinta">{nombreDe(estado, c.responsableId)}</span>
                      <span className={estaVencido(c) ? 'text-signal' : ''}>
                        {estaVencido(c) ? 'Vencía ' : 'Vence '}
                        {fechaCorta(c.fechaLimite)}
                      </span>
                      {deDonde && <span className="truncate">{deDonde.titulo}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 pl-[14px]">
                  {COLUMNAS_KANBAN.map((s) => (
                    <button
                      key={s}
                      onClick={() => moverCompromiso(c.id, s)}
                      aria-pressed={c.estado === s}
                      className={
                        c.estado === s
                          ? 'border border-tinta bg-tinta px-3 py-1.5 font-semibold text-meta text-fondo'
                          : 'border border-borde2 px-3 py-1.5 font-semibold text-meta text-suave transition-colors hover:border-suave hover:text-tinta'
                      }
                    >
                      {ESTADO_COMPROMISO[s].nombre}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {sinTratar.length > 0 && (
        <section>
          <h3 className="subtitulo">
            Temas que quedaron sin hablar <span className="cuenta">{sinTratar.length}</span>
          </h3>
          <ul className="card divide-y divide-borde">
            {sinTratar.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
                <Chip tono="amber">Sin tratar</Chip>
                <span className="min-w-0 flex-1 text-sm">{t.titulo}</span>
                <span className="text-meta text-tenue">{nombreDe(estado, t.propuestoPor)}</span>
                {puedeOrganizar && (
                  <Boton tam="sm" onClick={() => asignarAReunion(t.id, reunion.id)}>
                    <Plus size={11} /> Incluir
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
