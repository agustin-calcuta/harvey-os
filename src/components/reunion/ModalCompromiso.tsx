import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { paraInputDate } from '../../lib/utils'
import {
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  type Compromiso,
  type EstadoCompromiso,
  type Importancia,
} from '../../types'
import { Boton, Campo, Modal, Segmentado } from '../ui'

/* Alta y edición de compromisos: acción, responsable, fecha límite y estado. */

export default function ModalCompromiso({
  abierto,
  onCerrar,
  reunionId,
  temaId,
  compromiso,
}: {
  abierto: boolean
  onCerrar: () => void
  reunionId: string
  temaId?: string
  compromiso?: Compromiso
}) {
  const { estado, crearCompromiso, actualizarCompromiso } = useApp()

  const [accion, setAccion] = useState('')
  const [detalle, setDetalle] = useState('')
  const [responsableId, setResponsableId] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [importancia, setImportancia] = useState<Importancia>('media')
  const [est, setEst] = useState<EstadoCompromiso>('pendiente')
  const [avance, setAvance] = useState('')

  useEffect(() => {
    if (!abierto) return
    setAccion(compromiso?.accion ?? '')
    setDetalle(compromiso?.detalle ?? '')
    setResponsableId(compromiso?.responsableId ?? estado.usuarios[0]?.id ?? '')
    setFechaLimite(paraInputDate(compromiso?.fechaLimite) || sugerirFecha())
    setImportancia(compromiso?.importancia ?? 'media')
    setEst(compromiso?.estado ?? 'pendiente')
    setAvance(compromiso?.avance ?? '')
  }, [abierto, compromiso, estado.usuarios])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = {
      reunionId: compromiso?.reunionId ?? reunionId,
      temaId: compromiso?.temaId ?? temaId,
      accion: accion.trim(),
      detalle: detalle.trim() || undefined,
      responsableId,
      fechaLimite: fechaLimite ? new Date(`${fechaLimite}T18:00:00`).toISOString() : undefined,
      importancia,
      estado: est,
      avance: avance.trim() || undefined,
      completadoEn:
        est === 'hecho' ? (compromiso?.completadoEn ?? new Date().toISOString()) : undefined,
    }
    if (compromiso) await actualizarCompromiso(compromiso.id, datos)
    else await crearCompromiso(datos)
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      kicker={compromiso ? 'Editar' : 'Post-reunión'}
      titulo={compromiso ? 'Editar compromiso' : 'Nuevo compromiso'}
    >
      <form onSubmit={enviar} className="space-y-5">
        <Campo etiqueta="Acción / compromiso">
          <input
            className="w-full"
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            placeholder="Ej.: Cerrar contrato con el taller de denim"
            required
            autoFocus
          />
        </Campo>

        <Campo etiqueta="Detalle">
          <textarea
            className="w-full resize-y"
            rows={2}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Qué implica concretamente, con qué se considera cumplido…"
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Responsable">
            <select
              className="w-full"
              value={responsableId}
              onChange={(e) => setResponsableId(e.target.value)}
              required
            >
              {estado.usuarios
                .filter((u) => u.activo)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo etiqueta="Fecha límite">
            <input
              type="date"
              className="w-full"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Importancia">
          <Segmentado
            valor={importancia}
            onChange={setImportancia}
            opciones={(Object.keys(IMPORTANCIA) as Importancia[]).map((k) => ({
              valor: k,
              label: IMPORTANCIA[k].nombre,
              color: IMPORTANCIA[k].hex,
            }))}
          />
        </Campo>

        <Campo etiqueta="Estado">
          <Segmentado
            valor={est}
            onChange={setEst}
            opciones={(Object.keys(ESTADO_COMPROMISO) as EstadoCompromiso[]).map((k) => ({
              valor: k,
              label: ESTADO_COMPROMISO[k].nombre,
            }))}
          />
        </Campo>

        {compromiso && (
          <Campo etiqueta="Avance" ayuda="Qué se hizo hasta ahora o qué lo está frenando.">
            <textarea
              className="w-full resize-y"
              rows={2}
              value={avance}
              onChange={(e) => setAvance(e.target.value)}
            />
          </Campo>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Boton type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="solido">
            {compromiso ? 'Guardar' : 'Registrar compromiso'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}

/** Por defecto, una semana desde hoy. */
function sugerirFecha(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}
