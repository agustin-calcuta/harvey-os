import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Inbox, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import ModalTema from '../components/reunion/ModalTema'
import {
  fechaCorta,
  hora,
  proximasReuniones,
  relativo,
  sala,
  temarioDe,
  temasSinTratar,
} from '../lib/utils'
import type { Tema } from '../types'
import { Boton, ChipImportancia, ChipObjetivo, Confirmar, Modal, Seccion, Vacio } from '../components/ui'

/* ─────────────────────────────────────────────────────────────
   El temario: un bloc de notas personal.

   "Acá andá tirando todos los temas que quieras y después, cuando
   querés, los asignás a una reunión." No pertenece a ninguna
   sala y nadie más lo ve: cada uno anota lo suyo y decide a cuál
   de sus próximas reuniones lo lleva.

   Debajo aparecen los que estuvieron en una agenda y no se
   llegaron a hablar, para no perderlos de vista.
   ───────────────────────────────────────────────────────────── */

export default function Temario() {
  const { estado, yo, borrarTema } = useApp()
  const [anotando, setAnotando] = useState(false)
  const [editando, setEditando] = useState<Tema | undefined>()
  const [porBorrar, setPorBorrar] = useState<Tema | undefined>()
  const [porAsignar, setPorAsignar] = useState<Tema | undefined>()

  const mios = useMemo(() => temarioDe(estado, yo?.id), [estado, yo])
  const sinTratar = useMemo(
    () => temasSinTratar(estado, undefined, yo?.id),
    [estado, yo],
  )

  const tarjeta = (t: Tema, volvio = false) => (
    <li key={t.id} className="card flex flex-col p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ChipImportancia valor={t.importancia} />
        <ChipObjetivo valor={t.objetivo} />
        <span className="ml-auto text-[10px] text-tenue">anotado {relativo(t.creadoEn)}</span>
      </div>

      <h3 className="mb-1 text-sm leading-snug">{t.titulo}</h3>
      {t.detalle && <p className="mb-2 text-xs leading-relaxed text-suave">{t.detalle}</p>}

      {volvio && (
        <p className="mt-1 text-xs text-amber">
          {t.motivoRechazo ?? 'No se llegó a hablar.'}
          {t.salaId && ` · ${sala(estado, t.salaId)?.nombre ?? ''}`}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-borde pt-3">
        <Boton tam="sm" variante="solido" onClick={() => setPorAsignar(t)}>
          <CalendarPlus size={12} /> Asignar a una reunión
        </Boton>
        <Boton tam="sm" variante="fantasma" onClick={() => setEditando(t)} aria-label="Editar tema">
          <Pencil size={11} />
        </Boton>
        <Boton
          tam="sm"
          variante="fantasma"
          onClick={() => setPorBorrar(t)}
          aria-label="Borrar tema"
        >
          <Trash2 size={11} />
        </Boton>
      </div>
    </li>
  )

  return (
    <div className="space-y-10">
      <Seccion
        titulo="Mi temario"
        acciones={
          <Boton variante="solido" onClick={() => setAnotando(true)}>
            <Plus size={13} /> Anotar tema
          </Boton>
        }
      >
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-suave">
          Tu bloc de notas. Anotá acá lo que quieras tratar, sin esperar a que haya una reunión
          armada, y después asignalo a la que corresponda. Sólo lo ves vos.
        </p>

        {mios.length === 0 ? (
          <Vacio
            titulo="Todavía no anotaste nada"
            texto="Cuando se te ocurra algo para hablar con alguno de tus equipos, anotalo acá y no se pierde."
            icono={<Inbox size={32} />}
            accion={
              <Boton variante="solido" onClick={() => setAnotando(true)}>
                <Plus size={13} /> Anotar el primero
              </Boton>
            }
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">{mios.map((t) => tarjeta(t))}</ul>
        )}
      </Seccion>

      {sinTratar.length > 0 && (
        <Seccion titulo="Volvieron sin tratar">
          <p className="mb-5 max-w-2xl text-sm leading-relaxed text-suave">
            Los llevaste a una reunión y no se llegó a hablarlos. Están esperando: asignalos a la
            próxima cuando quieras.
          </p>
          <ul className="grid gap-3 lg:grid-cols-2">{sinTratar.map((t) => tarjeta(t, true))}</ul>
        </Seccion>
      )}

      <ModalTema abierto={anotando} onCerrar={() => setAnotando(false)} />
      <ModalTema abierto={!!editando} onCerrar={() => setEditando(undefined)} tema={editando} />

      <ModalAsignar tema={porAsignar} onCerrar={() => setPorAsignar(undefined)} />

      <Confirmar
        abierto={!!porBorrar}
        titulo="Borrar el tema"
        texto={`«${porBorrar?.titulo}» se saca de tu temario. No se puede deshacer.`}
        textoBoton="Borrar"
        peligro
        onCancelar={() => setPorBorrar(undefined)}
        onConfirmar={() => {
          if (porBorrar) void borrarTema(porBorrar.id)
          setPorBorrar(undefined)
        }}
      />
    </div>
  )
}

/* ── Del temario a una reunión ────────────────────────────── */

function ModalAsignar({ tema, onCerrar }: { tema?: Tema; onCerrar: () => void }) {
  const { estado, yo, asignarAReunion, devolverAlTemario } = useApp()
  const navegar = useNavigate()

  /*
   * Cualquiera de mis próximas reuniones, de la sala que sea: el
   * temario es mío y desde acá decido a cuál lo llevo. Un tema que
   * volvió sin tratar se queda en su sala.
   */
  const candidatas = useMemo(() => {
    if (!tema) return []
    return proximasReuniones(estado, yo, tema.salaId ?? undefined).filter(
      (r) => r.estado !== 'cerrada',
    )
  }, [estado, yo, tema])

  if (!tema) return null
  const volvio = tema.estado === 'diferido'

  return (
    <Modal abierto={!!tema} onCerrar={onCerrar} titulo={tema.titulo} ancho="max-w-lg">
      {candidatas.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-suave">
            No tenés ninguna reunión por delante donde llevarlo. Creá una y el tema te va a estar
            esperando acá.
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>
              Cerrar
            </Boton>
            <Boton
              variante="solido"
              onClick={() => {
                onCerrar()
                navegar('/reuniones?nueva=1')
              }}
            >
              Crear reunión
            </Boton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-suave">
            ¿En cuál lo tratamos? Entra directo a la agenda y sale de tu temario.
          </p>
          <ul className="card divide-y divide-borde">
            {candidatas.map((r) => (
              <li key={r.id}>
                <button
                  onClick={async () => {
                    await asignarAReunion(tema.id, r.id)
                    onCerrar()
                    navegar(`/reuniones/${r.id}`)
                  }}
                  className="group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-hueco"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{r.titulo}</div>
                    <div className="text-xs text-tenue">
                      {sala(estado, r.salaId)?.nombre} · {fechaCorta(r.fecha)} · {hora(r.fecha)}
                    </div>
                  </div>
                  <Plus size={13} className="text-borde2 group-hover:text-signal" />
                </button>
              </li>
            ))}
          </ul>

          {volvio && (
            <button
              onClick={async () => {
                await devolverAlTemario(tema.id)
                onCerrar()
              }}
              className="flex items-center gap-2 text-xs text-suave underline underline-offset-2 hover:text-tinta"
            >
              <RotateCcw size={12} /> Sacarlo de esa sala y dejarlo en mi temario
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
