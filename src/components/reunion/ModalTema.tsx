import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { integrantes, llegaTarde } from '../../lib/utils'
import { IMPORTANCIA, OBJETIVOS, type Importancia, type Objetivo, type Tema } from '../../types'
import { Boton, Campo, Modal, Segmentado } from '../ui'
import { marca } from '../../marca'
import CampoCliente from '../CampoCliente'

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
  const {
    yo,
    estado,
    proponerTema,
    actualizarTema,
    asegurarCliente,
    organizoLa,
    salasDondeSoyDelEquipo,
  } = useApp()
  const sala = estado.salas.find((s) => s.id === salaId)
  const reunion = estado.reuniones.find((r) => r.id === reunionId)
  const puedeOrganizar = organizoLa(salaId ?? reunion?.salaId)
  const gente = salaId ? integrantes(estado, salaId) : yo ? [yo] : []

  const [titulo, setTitulo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [importancia, setImportancia] = useState<Importancia>('media')
  const [objetivo, setObjetivo] = useState<Objetivo>('decision')
  const [cliente, setCliente] = useState('')
  const [propuestoPor, setPropuestoPor] = useState(yo?.id ?? '')
  /* Para qué equipo es, mientras la nota todavía es sólo mía. */
  const [salaTentativaId, setSalaTentativaId] = useState('')

  const clientesRef = useRef(estado.clientes)
  clientesRef.current = estado.clientes

  /*
   * Igual que en el modal de tareas: se rellena al abrir y nada más.
   * Con el objeto del tema o la lista de clientes en las
   * dependencias, cada refresco contra la base —uno cada doce
   * segundos— reescribía lo que se estaba tipeando.
   */
  useEffect(() => {
    if (!abierto) return
    setTitulo(tema?.titulo ?? '')
    setDetalle(tema?.detalle ?? '')
    setImportancia(tema?.importancia ?? 'media')
    setObjetivo(tema?.objetivo ?? 'decision')
    setCliente(clientesRef.current.find((c) => c.id === tema?.clienteId)?.nombre ?? '')
    setPropuestoPor(tema?.propuestoPor ?? yo?.id ?? '')
    setSalaTentativaId(tema?.salaTentativaId ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, tema?.id, yo?.id])

  const alTemario = !reunionId
  const tarde = reunion ? llegaTarde(reunion) : false

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const elCliente = cliente.trim() ? await asegurarCliente(cliente) : undefined
    const datos = {
      salaId,
      reunionId,
      // Sólo tiene sentido mientras la nota no está en una reunión.
      salaTentativaId: alTemario ? salaTentativaId || undefined : undefined,
      titulo: titulo.trim(),
      detalle: detalle.trim() || undefined,
      importancia,
      objetivo,
      clienteId: elCliente?.id,
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
      titulo={
        tema
          ? 'Editar'
          : alTemario
            ? 'Crear nota'
            : /* El cuerpo y el botón ya distinguen los dos casos; el título
                 decía «Proponer» incluso cuando el tema entra derecho. */
              entraDirecto
              ? 'Agregar tema'
              : 'Proponer tema'
      }
    >
      <form onSubmit={enviar} className="space-y-5">
        <Campo etiqueta="Tema">
          <input
            className="w-full"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={`Ej.: ${marca.ejemplos.tema}`}
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

        <CampoCliente valor={cliente} onChange={setCliente} />

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

        {/* ── Para qué equipo ──
            Sólo cuando la nota es del bloc: en una reunión la sala ya
            está decidida. Se puede dejar sin elegir, que es el caso de
            "lo anoto ahora y después veo con quién lo hablo". */}
        {alTemario && salasDondeSoyDelEquipo.length > 0 && (
          <Campo
            etiqueta="¿Para qué equipo?"
            ayuda="Opcional. Sirve para encontrarlo después; el tema sigue siendo sólo tuyo hasta que lo asignes a una reunión."
          >
            <select
              className="w-full"
              value={salaTentativaId}
              onChange={(e) => setSalaTentativaId(e.target.value)}
            >
              <option value="">Todavía no sé</option>
              {salasDondeSoyDelEquipo.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

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
              ? 'Queda en tu bloc de notas, sin fecha y sin que lo vea nadie más. Lo asignás a la reunión que quieras cuando quieras.'
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
