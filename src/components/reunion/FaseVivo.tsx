import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  History,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  compromisosArrastrados,
  compromisosDe,
  agendaDe,
  estaVencido,
  fechaCorta,
  mmss,
  nombreDe,
} from '../../lib/utils'
import { IMPORTANCIA, OBJETIVOS, type Reunion } from '../../types'
import { Boton, Capa, Chip, ChipImportancia, Confirmar, Etiqueta, Vacio } from '../ui'
import ModalCompromiso from './ModalCompromiso'

export default function FaseVivo({ reunion }: { reunion: Reunion }) {
  const { estado, actualizarTema, cerrarReunion, puedeModerar } = useApp()
  const agenda = agendaDe(estado, reunion.id)

  const [indice, setIndice] = useState(0)
  const [corriendo, setCorriendo] = useState(false)
  const [seg, setSeg] = useState(0)
  const [notas, setNotas] = useState('')
  const [nuevoCompromiso, setNuevoCompromiso] = useState(false)
  const [verPendientes, setVerPendientes] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)

  const tema = agenda[indice]
  const moderador = puedeModerar(reunion)
  const arrastrados = useMemo(
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

  /* Al cambiar de tema: guardamos lo anterior y cargamos lo nuevo */
  const guardarYSaltar = (nuevo: number) => {
    if (tema) {
      void actualizarTema(tema.id, {
        conclusiones: notas.trim() || undefined,
        duracionRealSeg: seg > 0 ? seg : tema.duracionRealSeg,
      })
    }
    setIndice(nuevo)
    const siguiente = agenda[nuevo]
    setNotas(siguiente?.conclusiones ?? '')
    setSeg(siguiente?.duracionRealSeg ?? 0)
    setCorriendo(false)
  }

  useEffect(() => {
    const t = agenda[indice]
    setNotas(t?.conclusiones ?? '')
    setSeg(t?.duracionRealSeg ?? 0)
    // Sólo al montar: después se maneja desde guardarYSaltar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Autoguardado de las notas mientras se escribe */
  useEffect(() => {
    if (!tema) return
    const id = window.setTimeout(() => {
      if ((tema.conclusiones ?? '') !== notas) {
        void actualizarTema(tema.id, { conclusiones: notas.trim() || undefined })
      }
    }, 900)
    return () => window.clearTimeout(id)
  }, [notas, tema, actualizarTema])

  if (!agenda.length) {
    return (
      <Vacio
        titulo="No hay temas en la agenda"
        texto="Volvé a la pre-reunión y aprobá al menos un tema para poder empezar."
      />
    )
  }

  const asignado = (tema?.duracionMin ?? 0) * 60
  const progreso = asignado ? Math.min(100, (seg / asignado) * 100) : 0
  const excedido = seg > asignado && asignado > 0
  const restante = asignado - seg

  return (
    <div className="space-y-5">
      {/* ── Cabecera en vivo ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="pulse-dot h-2 w-2 rounded-full bg-signal" />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-signal">
            Reunión en curso
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton tam="sm" onClick={() => setVerPendientes(true)}>
            <History size={12} /> Pendientes anteriores
            {arrastrados.length > 0 && (
              <span className="ml-1 bg-signal px-1.5 text-[9px] text-bone">
                {arrastrados.length}
              </span>
            )}
          </Boton>
          {moderador && (
            <Boton tam="sm" variante="solido" onClick={() => setConfirmarCierre(true)}>
              <Square size={11} /> Cerrar reunión
            </Boton>
          )}
        </div>
      </div>

      {/* ── Recorrido de temas ── */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {agenda.map((t, i) => (
          <button
            key={t.id}
            onClick={() => guardarYSaltar(i)}
            className={
              i === indice
                ? 'flex shrink-0 items-center gap-2 border border-bone bg-bone px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink'
                : 'flex shrink-0 items-center gap-2 border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-smoke transition-colors hover:border-smoke hover:text-bone'
            }
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: IMPORTANCIA[t.importancia].hex }}
            />
            {String(i + 1).padStart(2, '0')}
            {t.conclusiones && <span className="text-acid">·</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── Tema en curso ── */}
        <div className="space-y-5">
          <div className="card">
            <div className="border-b border-line p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Chip>
                  Tema {indice + 1} de {agenda.length}
                </Chip>
                <ChipImportancia valor={tema.importancia} />
                <Chip>{OBJETIVOS[tema.objetivo].nombre}</Chip>
              </div>
              <h2 className="display text-3xl sm:text-4xl">{tema.titulo}</h2>
              {tema.detalle && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-smoke">
                  {tema.detalle}
                </p>
              )}
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-smoke-2">
                Propuso {nombreDe(estado, tema.propuestoPor)} · {OBJETIVOS[tema.objetivo].desc}
              </div>
            </div>

            {/* Cronómetro */}
            <div className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span
                    className={
                      excedido ? 'display text-5xl text-signal' : 'display text-5xl'
                    }
                  >
                    {mmss(seg)}
                  </span>
                  <span className="font-mono text-xs text-smoke">
                    / {tema.duracionMin}:00
                  </span>
                </div>
                <div className="flex gap-2">
                  <Boton tam="sm" onClick={() => setCorriendo((c) => !c)}>
                    {corriendo ? <Pause size={12} /> : <Play size={12} />}
                    {corriendo ? 'Pausar' : seg > 0 ? 'Seguir' : 'Arrancar'}
                  </Boton>
                  <Boton
                    tam="sm"
                    variante="fantasma"
                    onClick={() => {
                      setSeg(0)
                      setCorriendo(false)
                    }}
                    title="Reiniciar"
                  >
                    <RotateCcw size={12} />
                  </Boton>
                </div>
              </div>

              <div className="h-1.5 w-full bg-ink-3">
                <div
                  className={excedido ? 'h-full bg-signal' : 'h-full bg-acid transition-all'}
                  style={{ width: `${excedido ? 100 : progreso}%` }}
                />
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-smoke-2">
                {excedido
                  ? `Pasado ${mmss(seg - asignado)} del tiempo asignado`
                  : `Quedan ${mmss(restante)}`}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="card p-5">
            <Etiqueta className="bracket mb-3">Conclusiones del tema</Etiqueta>
            <textarea
              className="w-full resize-y font-sans text-sm leading-relaxed"
              rows={7}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Qué se dijo, qué se definió, qué quedó abierto…"
            />
            <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-smoke-2">
              Se guarda solo mientras escribís
            </div>
          </div>

          {/* Navegación */}
          <div className="flex items-center justify-between gap-3">
            <Boton
              onClick={() => guardarYSaltar(Math.max(0, indice - 1))}
              disabled={indice === 0}
            >
              <ChevronLeft size={13} /> Anterior
            </Boton>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-smoke-2">
              {indice + 1} / {agenda.length}
            </span>
            <Boton
              variante={indice === agenda.length - 1 ? 'linea' : 'solido'}
              onClick={() => guardarYSaltar(Math.min(agenda.length - 1, indice + 1))}
              disabled={indice === agenda.length - 1}
            >
              Siguiente <ChevronRight size={13} />
            </Boton>
          </div>
        </div>

        {/* ── Compromisos del tema ── */}
        <aside className="space-y-3">
          <div className="card sticky top-4">
            <div className="flex items-center justify-between gap-2 border-b border-line p-4">
              <Etiqueta className="bracket">Compromisos</Etiqueta>
              <Boton tam="sm" variante="solido" onClick={() => setNuevoCompromiso(true)}>
                <Plus size={11} />
              </Boton>
            </div>

            {delTema.length === 0 ? (
              <p className="p-4 text-xs leading-relaxed text-smoke-2">
                Sin compromisos para este tema todavía. Registralos en el momento, con
                responsable y fecha.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {delTema.map((c) => (
                  <li key={c.id} className="p-4">
                    <div className="text-xs leading-snug">{c.accion}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ChipImportancia valor={c.importancia} conTexto={false} />
                      <span className="font-mono text-[10px] text-smoke">
                        {nombreDe(estado, c.responsableId)}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-smoke-2">
                        {fechaCorta(c.fechaLimite)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Resumen de la reunión */}
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
              <div className="bg-ink-2 p-3">
                <Etiqueta className="mb-1">Temas con notas</Etiqueta>
                <div className="display text-xl">
                  {agenda.filter((t) => t.conclusiones?.trim()).length}
                  <span className="text-sm text-smoke">/{agenda.length}</span>
                </div>
              </div>
              <div className="bg-ink-2 p-3">
                <Etiqueta className="mb-1">Compromisos</Etiqueta>
                <div className="display text-xl">{compromisosDe(estado, reunion.id).length}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Modales ── */}
      <ModalCompromiso
        abierto={nuevoCompromiso}
        onCerrar={() => setNuevoCompromiso(false)}
        reunionId={reunion.id}
        temaId={tema.id}
      />

      <PanelPendientes
        abierto={verPendientes}
        onCerrar={() => setVerPendientes(false)}
        reunionId={reunion.id}
      />

      <Confirmar
        abierto={confirmarCierre}
        titulo="Cerrar la reunión"
        texto={`Se emite la minuta con ${agenda.length} temas y ${compromisosDe(estado, reunion.id).length} compromisos, y sale por correo a los ${reunion.participantesIds.length} participantes.`}
        textoBoton="Cerrar y enviar minuta"
        onCancelar={() => setConfirmarCierre(false)}
        onConfirmar={() => {
          if (tema) {
            void actualizarTema(tema.id, {
              conclusiones: notas.trim() || undefined,
              duracionRealSeg: seg > 0 ? seg : tema.duracionRealSeg,
            })
          }
          void cerrarReunion(reunion.id)
          setConfirmarCierre(false)
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Panel de pendientes de reuniones anteriores.
   Es lo que pidió Fran: repasarlos con un click, sin que
   inflen la minuta del día.
   ───────────────────────────────────────────────────────────── */

function PanelPendientes({
  abierto,
  onCerrar,
  reunionId,
}: {
  abierto: boolean
  onCerrar: () => void
  reunionId: string
}) {
  const { estado, moverCompromiso } = useApp()
  const lista = compromisosArrastrados(estado, reunionId)

  if (!abierto) return null

  return (
    <Capa onCerrar={onCerrar} alinear="end">
      <div className="flex w-full max-w-lg flex-col border-l border-line bg-ink">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <Etiqueta className="bracket mb-2">Vienen de atrás</Etiqueta>
            <h3 className="display text-2xl">Pendientes anteriores</h3>
            <p className="mt-2 text-xs text-smoke">
              {lista.length} compromisos abiertos de reuniones previas.
            </p>
          </div>
          <Boton tam="sm" variante="fantasma" onClick={onCerrar}>
            Cerrar
          </Boton>
        </div>

        <div className="flex-1 overflow-y-auto">
          {lista.length === 0 ? (
            <div className="p-8 text-center text-sm text-smoke">
              No quedó nada abierto de reuniones anteriores.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lista.map((c) => {
                const reunion = estado.reuniones.find((r) => r.id === c.reunionId)
                return (
                  <li key={c.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 h-8 w-0.5 shrink-0"
                        style={{ background: IMPORTANCIA[c.importancia].hex }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm leading-snug">{c.accion}</div>
                        {c.avance && (
                          <p className="mt-1 text-xs text-smoke">{c.avance}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-smoke-2">
                          <span>{nombreDe(estado, c.responsableId)}</span>
                          <span className={estaVencido(c) ? 'text-signal' : ''}>
                            {estaVencido(c) ? 'Vencido ' : 'Vence '}
                            {fechaCorta(c.fechaLimite)}
                          </span>
                          {reunion && <span className="truncate">{reunion.titulo}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 pl-[14px]">
                      {(['pendiente', 'en_curso', 'bloqueado', 'hecho'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => moverCompromiso(c.id, s)}
                          className={
                            c.estado === s
                              ? 'border border-bone bg-bone px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink'
                              : 'border border-line-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-smoke transition-colors hover:border-smoke hover:text-bone'
                          }
                        >
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Capa>
  )
}
