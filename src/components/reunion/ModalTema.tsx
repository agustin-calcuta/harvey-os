import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { IMPORTANCIA, OBJETIVOS, type Importancia, type Objetivo, type Tema } from '../../types'
import { Boton, Campo, Modal, Segmentado } from '../ui'

/* ─────────────────────────────────────────────────────────────
   Alta y edición de un tema.
   Los tres campos que exigió Fran: importancia (semáforo),
   objetivo (los cuatro tipos) y quién lo propone.
   ───────────────────────────────────────────────────────────── */

export default function ModalTema({
  abierto,
  onCerrar,
  reunionId,
  tema,
  /** Si el usuario puede aprobar, el tema entra directo a la agenda. */
  entraDirecto,
}: {
  abierto: boolean
  onCerrar: () => void
  reunionId: string
  tema?: Tema
  entraDirecto?: boolean
}) {
  const { yo, estado, proponerTema, actualizarTema, puedeOrganizar } = useApp()

  const [titulo, setTitulo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [importancia, setImportancia] = useState<Importancia>('media')
  const [objetivo, setObjetivo] = useState<Objetivo>('decision')
  const [duracion, setDuracion] = useState(estado.config.duracionTemaDefaultMin)
  const [propuestoPor, setPropuestoPor] = useState(yo?.id ?? '')

  useEffect(() => {
    if (!abierto) return
    setTitulo(tema?.titulo ?? '')
    setDetalle(tema?.detalle ?? '')
    setImportancia(tema?.importancia ?? 'media')
    setObjetivo(tema?.objetivo ?? 'decision')
    setDuracion(tema?.duracionMin ?? estado.config.duracionTemaDefaultMin)
    setPropuestoPor(tema?.propuestoPor ?? yo?.id ?? '')
  }, [abierto, tema, yo, estado.config.duracionTemaDefaultMin])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = {
      reunionId,
      titulo: titulo.trim(),
      detalle: detalle.trim() || undefined,
      importancia,
      objetivo,
      duracionMin: duracion,
      propuestoPor,
    }
    if (tema) await actualizarTema(tema.id, datos)
    else await proponerTema({ ...datos, estado: entraDirecto ? 'aprobado' : 'propuesto' })
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      kicker={tema ? 'Editar' : 'Pre-reunión'}
      titulo={tema ? 'Editar tema' : 'Proponer tema'}
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
          etiqueta="Contexto"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Tiempo sugerido (min)"
            ayuda={puedeOrganizar ? 'Como organizador podés ajustarlo después.' : 'El organizador puede ajustarlo.'}
          >
            <input
              type="number"
              min={5}
              step={5}
              className="w-full"
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
            />
          </Campo>

          <Campo etiqueta="Propone">
            <select
              className="w-full"
              value={propuestoPor}
              onChange={(e) => setPropuestoPor(e.target.value)}
              disabled={!puedeOrganizar}
            >
              {estado.usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {!tema && !entraDirecto && (
          <p className="border border-borde bg-hueco p-3 text-xs leading-relaxed text-suave">
            El tema queda como propuesto. El organizador decide si entra en la agenda de esta
            reunión.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Boton type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="solido">
            {tema ? 'Guardar' : entraDirecto ? 'Agregar a la agenda' : 'Proponer tema'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
