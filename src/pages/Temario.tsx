import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Inbox, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import ModalTema from '../components/reunion/ModalTema'
import { bancoDe, nombreDe, relativo, reunionesDe } from '../lib/utils'
import type { Tema } from '../types'
import {
  Boton,
  ChipImportancia,
  ChipObjetivo,
  Confirmar,
  Modal,
  Seccion,
  Vacio,
} from '../components/ui'

/* ─────────────────────────────────────────────────────────────
   El banco de temas de la sala.

   Es el "banco de suplentes" que pidió Fran: anotar algo que hay
   que tratar sin esperar a que exista una reunión. Queda acá, sin
   fecha, hasta que alguien arme la próxima y lo baje a la agenda.
   ───────────────────────────────────────────────────────────── */

export default function Temario() {
  const { estado, yo, salaActiva, puedeOrganizar, borrarTema } = useApp()
  const [anotando, setAnotando] = useState(false)
  const [editando, setEditando] = useState<Tema | undefined>()
  const [porBorrar, setPorBorrar] = useState<Tema | undefined>()
  const [porBajar, setPorBajar] = useState<Tema | undefined>()

  const banco = useMemo(
    () => (salaActiva ? bancoDe(estado, salaActiva.id) : []),
    [estado, salaActiva],
  )

  if (!salaActiva) return null

  return (
    <div className="space-y-6">
      <Seccion
        kicker={salaActiva.nombre}
        titulo="Temario"
        acciones={
          <Boton variante="solido" onClick={() => setAnotando(true)}>
            <Plus size={13} /> Anotar tema
          </Boton>
        }
      >
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-suave">
          Temas que hay que tratar en algún momento, todavía sin fecha. Se anotan acá apenas
          aparecen —sin esperar a que haya una reunión armada— y cuando se arma la próxima, el
          organizador elige cuáles bajan a la agenda.
        </p>

        {banco.length === 0 ? (
          <Vacio
            titulo="El banco está vacío"
            texto="Cuando se te ocurra algo para tratar con el equipo, anotalo acá. No hace falta que haya una reunión creada."
            icono={<Inbox size={32} />}
            accion={
              <Boton variante="solido" onClick={() => setAnotando(true)}>
                <Plus size={13} /> Anotar el primero
              </Boton>
            }
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {banco.map((t) => {
              const mio = t.propuestoPor === yo?.id
              return (
                <li key={t.id} className="card flex flex-col p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ChipImportancia valor={t.importancia} />
                    <ChipObjetivo valor={t.objetivo} />
                    <span className="ml-auto text-[10px] text-tenue">{t.duracionMin} min</span>
                  </div>

                  <h3 className="mb-1 text-sm leading-snug">{t.titulo}</h3>
                  {t.detalle && (
                    <p className="mb-2 text-xs leading-relaxed text-suave">{t.detalle}</p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[10px] text-tenue">
                    <span>{nombreDe(estado, t.propuestoPor)}</span>
                    <span>anotado {relativo(t.creadoEn)}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-borde pt-3">
                    {puedeOrganizar && (
                      <Boton tam="sm" variante="solido" onClick={() => setPorBajar(t)}>
                        <CalendarPlus size={12} /> Llevar a una reunión
                      </Boton>
                    )}
                    {(mio || puedeOrganizar) && (
                      <>
                        <Boton tam="sm" variante="fantasma" onClick={() => setEditando(t)}>
                          <Pencil size={11} />
                        </Boton>
                        <Boton tam="sm" variante="fantasma" onClick={() => setPorBorrar(t)}>
                          <Trash2 size={11} />
                        </Boton>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Seccion>

      <ModalTema
        abierto={anotando}
        onCerrar={() => setAnotando(false)}
        salaId={salaActiva.id}
      />
      <ModalTema
        abierto={!!editando}
        onCerrar={() => setEditando(undefined)}
        salaId={salaActiva.id}
        tema={editando}
      />

      <ModalBajar tema={porBajar} onCerrar={() => setPorBajar(undefined)} />

      <Confirmar
        abierto={!!porBorrar}
        titulo="Borrar el tema"
        texto={`«${porBorrar?.titulo}» se saca del banco. No se puede deshacer.`}
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

/* ── Bajar del banco a una reunión ────────────────────────── */

function ModalBajar({ tema, onCerrar }: { tema?: Tema; onCerrar: () => void }) {
  const { estado, bajarDelBanco } = useApp()
  const navegar = useNavigate()

  /* Sólo tiene sentido sumarlo donde la agenda todavía se puede tocar. */
  const candidatas = useMemo(() => {
    if (!tema) return []
    return reunionesDe(estado, tema.salaId)
      .filter((r) => r.estado === 'agenda_abierta' || r.estado === 'agenda_cerrada')
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [estado, tema])

  if (!tema) return null

  return (
    <Modal
      abierto={!!tema}
      onCerrar={onCerrar}
      kicker="Del banco a la agenda"
      titulo={tema.titulo}
      ancho="max-w-lg"
    >
      {candidatas.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-suave">
            No hay ninguna reunión con la agenda abierta en esta sala. Creá una y el tema va a
            estar esperando para que lo bajes.
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>
              Cerrar
            </Boton>
            <Boton
              variante="solido"
              onClick={() => {
                onCerrar()
                navegar('/reuniones')
              }}
            >
              Ir a reuniones
            </Boton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-suave">
            ¿En cuál lo tratamos? Entra directo a la agenda, ya aprobado.
          </p>
          <ul className="card divide-y divide-borde">
            {candidatas.map((r) => (
              <li key={r.id}>
                <button
                  onClick={async () => {
                    await bajarDelBanco(tema.id, r.id)
                    onCerrar()
                    navegar(`/reuniones/${r.id}`)
                  }}
                  className="group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-hueco"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{r.titulo}</div>
                    <div className="text-xs text-tenue">
                      {relativo(r.fecha)} · {r.estado.replace('_', ' ')}
                    </div>
                  </div>
                  <Plus size={13} className="text-borde2 group-hover:text-signal" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
