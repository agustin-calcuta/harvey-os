import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { integrantes, llegaTarde } from '../../lib/utils'
import { IMPORTANCIA, OBJETIVOS, type Importancia, type Objetivo, type Tema } from '../../types'
import { Boton, Campo, Modal, Segmentado } from '../ui'

/* ─────────────────────────────────────────────────────────────
   Alta y edición de un tema.

   Tres campos y nada más: importancia (el semáforo), objetivo (los
   cuatro tipos) y quién lo propone. El tiempo estimado salió de
   acá —"es muy subjetivo, lo sacaría"—: lo ajusta el organizador
   desde la agenda si quiere, y el cronómetro sigue corriendo igual
   durante la reunión.

   Sin reunión, el tema va al temario personal de quien lo escribe.
   ───────────────────────────────────────────────────────────── */

export default function ModalTema({
  abierto,
  onCerrar,
  salaId,
  reunionId,
  tema,
  /** Si el usuario puede aprobar, el tema entra directo a la agenda. */
  entraDirecto,
}: {
  abierto: boolean
  onCerrar: () => void
  salaId?: string
  reunionId?: string
  tema?: Tema
  entraDirecto?: boolean
}) {
  const { yo, estado, proponerTema, actualizarTema, organizoLa } = useApp()
  const sala = estado.salas.find((s) => s.id === salaId)
  const reunion = estado.reuniones.find((r) => r.id === reunionId)
  const puedeOrganizar = organizoLa(salaId ?? reunion?.salaId)
  const gente = salaId ? integrantes(estado, salaId) : yo ? [yo] : []

  const [titulo, setTitulo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [importancia, setImportancia] = useState<Importancia>('media')
  const [objetivo, setObjetivo] = useState<Objetivo>('decision')
  const [propuestoPor, setPropuestoPor] = useState(yo?.id ?? '')

  useEffect(() => {
    if (!abierto) return
    setTitulo(tema?.titulo ?? '')
    setDetalle(tema?.detalle ?? '')
    setImportancia(tema?.importancia ?? 'media')
    setObjetivo(tema?.objetivo ?? 'decision')
    setPropuestoPor(tema?.propuestoPor ?? yo?.id ?? '')
  }, [abierto, tema, yo])

  const alTemario = !reunionId
  const tarde = reunion ? llegaTarde(reunion) : false

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = {
      salaId,
      reunionId,
      titulo: titulo.trim(),
      detalle: detalle.trim() || undefined,
      importancia,
      objetivo,
      // El tiempo lo pone la sala; el organizador lo ajusta en la agenda.
      duracionMin: tema?.duracionMin ?? sala?.duracionTemaDefaultMin ?? 15,
      propuestoPor,
    }
    if (tema) await actualizarTema(tema.id, datos)
    else
      await proponerTema({
        ...datos,
        estado: alTemario ? 'banco' : entraDirecto ? 'aprobado' : 'propuesto',
      })
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={tema ? 'Editar tema' : alTemario ? 'Anotar un tema' : 'Proponer tema'}
    >
      <form onSubmit={enviar} className="space-y-5">
        <Campo etiqueta="Tema">
          <input
            className="w-full"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej.: Definir proveedor de denim"
            required
            autoFocus
          />
        </Campo>

        <Campo
          etiqueta="Detalle"
          ayuda="Lo que el resto necesita saber para llegar preparado a la reunión."
        >
          <textarea
            className="w-full resize-y"
            rows={3}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Qué está en juego, qué información hay que mirar, qué se necesita resolver…"
          />
        </Campo>

        <Campo etiqueta="Importancia" ayuda="Qué tan caliente está el tema.">
          <Segmentado
            valor={importancia}
            onChange={setImportancia}
            opciones={(Object.keys(IMPORTANCIA) as Importancia[]).map((k) => ({
              valor: k,
              label: `${IMPORTANCIA[k].nombre} · ${IMPORTANCIA[k].alias}`,
              color: IMPORTANCIA[k].hex,
            }))}
          />
        </Campo>

        <Campo etiqueta="Objetivo" ayuda={OBJETIVOS[objetivo].desc}>
          <Segmentado
            valor={objetivo}
            onChange={setObjetivo}
            opciones={(Object.keys(OBJETIVOS) as Objetivo[]).map((k) => ({
              valor: k,
              label: OBJETIVOS[k].nombre,
              title: OBJETIVOS[k].desc,
            }))}
          />
        </Campo>

        {!alTemario && (
          <Campo
            etiqueta="Propone"
            ayuda={puedeOrganizar ? 'Podés cargarlo a nombre de otra persona.' : undefined}
          >
            <select
              className="w-full"
              value={propuestoPor}
              onChange={(e) => setPropuestoPor(e.target.value)}
              disabled={!puedeOrganizar}
            >
              {gente.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        {!tema && (
          <p className="border border-borde bg-hueco p-3 text-xs leading-relaxed text-suave">
            {alTemario
              ? 'Queda en tu bloc de notas, sin sala y sin fecha. Sólo lo ves vos, y lo asignás a la reunión que quieras cuando quieras.'
              : tarde
                ? 'El temario de esta reunión ya se cerró, pero el tema entra igual: se suma al final y el que modera decide si se llega a hablar.'
                : entraDirecto
                  ? 'Entra directo a la agenda de esta reunión.'
                  : 'Queda propuesto. El organizador decide si entra en la agenda.'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Boton type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="solido">
            {tema
              ? 'Guardar'
              : alTemario
                ? 'Guardar en mi bloc'
                : entraDirecto
                  ? 'Agregar a la agenda'
                  : 'Proponer tema'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
