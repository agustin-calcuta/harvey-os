import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { integrantes, paraInputDate, reunion as buscarReunion } from '../../lib/utils'
import {
  ESTADO_COMPROMISO,
  IMPORTANCIA,
  type Compromiso,
  type EstadoCompromiso,
  type Importancia,
} from '../../types'
import { Boton, Campo, Modal, Segmentado } from '../ui'

/*
 * Alta y edición de tareas: qué hay que hacer, quién y para cuándo.
 *
 * La sala sale de la reunión cuando la tarea nace en una; si nace
 * suelta desde Tareas, se elige acá, porque ya no hay una sala activa
 * de la que heredarla.
 */

export default function ModalCompromiso({
  abierto,
  onCerrar,
  reunionId,
  temaId,
  compromiso,
}: {
  abierto: boolean
  onCerrar: () => void
  reunionId?: string
  temaId?: string
  compromiso?: Compromiso
}) {
  const { estado, crearCompromiso, actualizarCompromiso, salasDondeSoyDelEquipo: misSalas } =
    useApp()

  /* De la reunión, de la tarea que se edita, o la que se elija. */
  const salaDeLaReunion = buscarReunion(estado, compromiso?.reunionId ?? reunionId)?.salaId
  const salaFija = compromiso?.salaId ?? salaDeLaReunion
  const [salaId, setSalaId] = useState(salaFija ?? misSalas[0]?.id ?? '')
  const laSala = salaFija ?? salaId
  const gente = laSala ? integrantes(estado, laSala) : []

  const [accion, setAccion] = useState('')
  const [detalle, setDetalle] = useState('')
  const [responsableId, setResponsableId] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [importancia, setImportancia] = useState<Importancia>('media')
  const [est, setEst] = useState<EstadoCompromiso>('pendiente')
  const [avance, setAvance] = useState('')

  const primero = gente[0]?.id
  useEffect(() => {
    if (!abierto) return
    if (salaFija) setSalaId(salaFija)
    setAccion(compromiso?.accion ?? '')
    setDetalle(compromiso?.detalle ?? '')
    setResponsableId(compromiso?.responsableId ?? primero ?? '')
    setFechaLimite(paraInputDate(compromiso?.fechaLimite) || sugerirFecha())
    setImportancia(compromiso?.importancia ?? 'media')
    setEst(compromiso?.estado ?? 'pendiente')
    setAvance(compromiso?.avance ?? '')
  }, [abierto, compromiso, primero, salaFija])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = {
      salaId: laSala,
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
      titulo={compromiso ? 'Editar tarea' : 'Nueva tarea'}
    >
      <form onSubmit={enviar} className="space-y-5">
        {!salaFija && misSalas.length > 1 && (
          <Campo etiqueta="Sala" ayuda="De acá salen las personas que pueden quedar a cargo.">
            <select
              className="w-full"
              value={salaId}
              onChange={(e) => setSalaId(e.target.value)}
              required
            >
              {misSalas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo etiqueta="Qué hay que hacer">
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
              {gente.map((u) => (
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
          <Campo etiqueta="Avance" ayuda="Qué se hizo hasta ahora, o qué la está frenando.">
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
            {compromiso ? 'Guardar' : 'Registrar tarea'}
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
