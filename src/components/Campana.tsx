import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { nombreDe, relativo } from '../lib/utils'

/* ─────────────────────────────────────────────────────────────
   Lo que te están esperando.

   Sólo menciones: alguien te arrobó en la conversación de una tarea
   y todavía no la abriste. No entran acá los vencimientos ni las
   tareas nuevas —eso ya se ve en Tareas, con su propio contador—,
   porque una campana que avisa de todo se apaga sin mirar y deja de
   avisar de lo único que necesita una respuesta.

   Abrir la tarea marca el hilo como leído, así que el contador baja
   solo: no hay un «marcar todo como leído» que mentir.
   ───────────────────────────────────────────────────────────── */

export default function Campana() {
  const { estado, mencionesSinLeer } = useApp()
  const [abierta, setAbierta] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const navegar = useNavigate()

  /* Se cierra al tocar afuera o con Escape, como cualquier menú. */
  useEffect(() => {
    if (!abierta) return
    const afuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierta(false)
    }
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false)
    document.addEventListener('mousedown', afuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', afuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierta])

  const cuantas = mencionesSinLeer.length

  return (
    <div ref={caja} className="relative">
      <button
        onClick={() => setAbierta((v) => !v)}
        aria-label={
          cuantas
            ? `${cuantas} ${cuantas === 1 ? 'mención sin leer' : 'menciones sin leer'}`
            : 'Sin menciones nuevas'
        }
        className="relative p-2.5 text-white/50 transition-colors hover:text-white sm:p-2"
      >
        <Bell size={16} />
        {cuantas > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center bg-acento px-1 text-[9px] font-semibold text-acento-tinta">
            {cuantas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 border border-borde2 bg-panel shadow-lg">
          <div className="label border-b border-borde px-3 py-2">
            {cuantas ? `Te mencionaron (${cuantas})` : 'Menciones'}
          </div>

          {cuantas === 0 ? (
            <p className="px-3 py-4 text-meta leading-relaxed text-tenue">
              Nada pendiente. Acá aparece cuando alguien te arroba con «@» en la conversación
              de una tarea.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-borde overflow-y-auto">
              {mencionesSinLeer.map((c) => {
                const tarea = estado.compromisos.find((t) => t.id === c.compromisoId)
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setAbierta(false)
                        /*
                         * A la lista de tareas: el hilo vive adentro
                         * de la tarea, y abrirlo desde ahí es lo que
                         * la marca leída.
                         */
                        navegar('/compromisos')
                      }}
                      className="w-full px-3 py-2.5 text-left transition-colors hover:bg-hueco"
                    >
                      <div className="text-meta">
                        <span className="font-semibold">{nombreDe(estado, c.autorId)}</span>
                        <span className="text-tenue"> · {relativo(c.creadoEn)}</span>
                      </div>
                      {tarea && (
                        <div className="mt-0.5 truncate text-[11px] text-suave">
                          en «{tarea.accion}»
                        </div>
                      )}
                      <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-tenue">
                        {c.texto}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
