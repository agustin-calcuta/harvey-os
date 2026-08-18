import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Loader2, Mic, Square, Trash2 } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  empezarAGrabar,
  iaConfigurada,
  sePuedeGrabar,
  transcribirYResumir,
  type Grabacion,
  type MinutaSugerida,
} from '../../lib/ia'
import { agendaDe, cx, mmss } from '../../lib/utils'
import type { Reunion } from '../../types'
import { Boton, Confirmar } from '../ui'

/* ─────────────────────────────────────────────────────────────
   Grabar la reunión y volver con la minuta escrita.

   Lo que hace la IA es **proponer**: una conclusión por tema y las
   tareas que escuchó, con nombre y fecha. Todo eso entra como
   borrador editable y la minuta la sigue firmando una persona.

   Dos decisiones que no son de interfaz:

   - **Se avisa que se está grabando**, a la vista de todos y en la
     minuta. Grabar a alguien sin decírselo es un problema, y la
     minuta después sale por correo.
   - **El audio no se guarda.** Se manda, se procesa y se descarta.
     Quedan la transcripción y el resumen, que son texto.

   Sin `VITE_IA_ENDPOINT` este componente no se dibuja: la reunión
   funciona igual, tomando notas a mano.
   ───────────────────────────────────────────────────────────── */

type Fase = 'quieta' | 'grabando' | 'procesando' | 'lista' | 'error'

export default function Grabadora({
  reunion,
  onMinuta,
}: {
  reunion: Reunion
  /** El borrador que propuso la IA, para volcarlo en la minuta. */
  onMinuta: (m: MinutaSugerida, transcripcion: string) => void
}) {
  const { estado, avisar } = useApp()
  const [fase, setFase] = useState<Fase>('quieta')
  const [seg, setSeg] = useState(0)
  const [error, setError] = useState('')
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const grabacion = useRef<Grabacion | null>(null)

  /* El reloj de la grabación. */
  useEffect(() => {
    if (fase !== 'grabando') return
    const id = window.setInterval(() => setSeg(grabacion.current?.segundos() ?? 0), 1000)
    return () => window.clearInterval(id)
  }, [fase])

  /* Si te vas de la pantalla con el micrófono abierto, se suelta. */
  useEffect(() => () => grabacion.current?.cancelar(), [])

  if (!iaConfigurada) return null

  const arrancar = async () => {
    if (!sePuedeGrabar()) {
      setError('Este navegador no puede grabar. Probá con Chrome.')
      setFase('error')
      return
    }
    try {
      grabacion.current = await empezarAGrabar()
      setSeg(0)
      setFase('grabando')
    } catch {
      // El navegador no dice por qué: casi siempre es el permiso.
      setError('No se pudo abrir el micrófono. Revisá el permiso del navegador.')
      setFase('error')
    }
  }

  const cortarYProcesar = async () => {
    const g = grabacion.current
    if (!g) return
    setFase('procesando')
    try {
      const audio = await g.detener()
      grabacion.current = null
      const { transcripcion, resumen } = await transcribirYResumir(
        audio,
        estado,
        reunion,
        agendaDe(estado, reunion.id),
      )
      onMinuta(resumen, transcripcion)
      setFase('lista')
      avisar('Listo: la minuta quedó cargada como borrador. Revisala antes de cerrar.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar la grabación.')
      setFase('error')
    }
  }

  const descartar = () => {
    grabacion.current?.cancelar()
    grabacion.current = null
    setFase('quieta')
    setSeg(0)
  }

  return (
    <>
      <div
        className={cx(
          'flex flex-wrap items-center gap-3 border p-3',
          fase === 'grabando' ? 'border-signal bg-signal/5' : 'border-borde bg-hueco',
        )}
      >
        {fase === 'grabando' ? (
          <>
            <span className="pulse-dot h-2.5 w-2.5 shrink-0 rounded-full bg-signal" />
            <span className="font-semibold text-cuerpo text-signal">Grabando · {mmss(seg)}</span>
            <span className="min-w-0 flex-1 text-meta text-suave">
              Avisales a todos que la reunión se está grabando.
            </span>
            <Boton tam="sm" variante="destacado" onClick={cortarYProcesar}>
              <Square size={11} /> Cortar y armar la minuta
            </Boton>
            <Boton
              tam="sm"
              variante="fantasma"
              onClick={() => setConfirmarDescarte(true)}
              aria-label="Descartar la grabación"
            >
              <Trash2 size={12} />
            </Boton>
          </>
        ) : fase === 'procesando' ? (
          <>
            <Loader2 size={15} className="shrink-0 animate-spin text-suave" />
            <span className="min-w-0 flex-1 text-cuerpo">
              Escuchando la reunión y escribiendo la minuta. Puede tardar un rato.
            </span>
          </>
        ) : fase === 'lista' ? (
          <>
            <Check size={15} className="shrink-0 text-acid" />
            <span className="min-w-0 flex-1 text-cuerpo">
              La minuta quedó cargada como borrador. Revisala tema por tema: lo escribió una
              máquina escuchando, y la firmás vos.
            </span>
            <Boton tam="sm" onClick={arrancar}>
              <Mic size={12} /> Grabar otro tramo
            </Boton>
          </>
        ) : fase === 'error' ? (
          <>
            <AlertTriangle size={15} className="shrink-0 text-signal" />
            <span className="min-w-0 flex-1 text-cuerpo text-signal">{error}</span>
            <Boton tam="sm" onClick={arrancar}>
              Reintentar
            </Boton>
          </>
        ) : (
          <>
            <Mic size={15} className="shrink-0 text-suave" />
            <span className="min-w-0 flex-1 text-meta text-suave">
              Grabá la reunión y la minuta se escribe sola. El audio no se guarda: se transcribe y
              se descarta.
            </span>
            <Boton tam="sm" onClick={arrancar}>
              <Mic size={12} /> Grabar
            </Boton>
          </>
        )}
      </div>

      <Confirmar
        abierto={confirmarDescarte}
        titulo="Descartar la grabación"
        texto={`Se pierden los ${mmss(seg)} grabados y no se transcribe nada. La reunión sigue igual.`}
        textoBoton="Descartar"
        peligro
        onCancelar={() => setConfirmarDescarte(false)}
        onConfirmar={() => {
          descartar()
          setConfirmarDescarte(false)
        }}
      />
    </>
  )
}
