import { useEffect, useMemo, useRef, useState } from 'react'
import { AtSign, Send, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { integrantes, nombreDe, relativo } from '../lib/utils'
import type { Compromiso, Usuario } from '../types'
import { Boton } from './ui'

/* ─────────────────────────────────────────────────────────────
   La conversación de una tarea.

   Antes esto pasaba en otro lado —un chat, un correo— y ahí se
   pierde: al que se suma dos semanas después le falta justo lo que
   se dijo. Acá queda pegado a la tarea, que es lo que se sigue
   mirando cuando alguien pregunta cómo viene.

   Arrobar a alguien con `@` le deja un aviso adentro de la
   aplicación. No sale por correo, y es a propósito: si cada mención
   mandara un mail, en dos días lo silencian y se pierden también los
   avisos de minuta, que son los que nadie quiere perderse.
   ───────────────────────────────────────────────────────────── */

/** Nombre reducido a lo comparable, para buscar sin tildes. */
const clave = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * De quién habla cada `@` del texto.
 *
 * Se resuelve contra la gente de la sala, del nombre más largo al
 * más corto: así «@Ana María» gana sobre «@Ana» cuando existen las
 * dos, en vez de cortar en la primera coincidencia.
 */
export function detectarMenciones(texto: string, gente: Usuario[]): string[] {
  const t = clave(texto)
  const ordenada = [...gente].sort((a, b) => b.nombre.length - a.nombre.length)
  const encontrados = new Set<string>()
  for (const u of ordenada) {
    const nombre = clave(u.nombre)
    const pila = clave(u.nombre.split(/\s+/)[0])
    if (t.includes('@' + nombre) || t.includes('@' + pila)) encontrados.add(u.id)
  }
  return [...encontrados]
}

/** Resalta los `@` que corresponden a alguien de la sala. */
function conMenciones(texto: string, gente: Usuario[]) {
  const nombres = gente
    .flatMap((u) => [u.nombre, u.nombre.split(/\s+/)[0]])
    .sort((a, b) => b.length - a.length)
  const partes: (string | { m: string })[] = []
  let resto = texto

  while (resto.length) {
    const i = resto.indexOf('@')
    if (i < 0) {
      partes.push(resto)
      break
    }
    partes.push(resto.slice(0, i))
    const despues = resto.slice(i + 1)
    const nombre = nombres.find((n) => clave(despues).startsWith(clave(n)))
    if (nombre) {
      partes.push({ m: '@' + despues.slice(0, nombre.length) })
      resto = despues.slice(nombre.length)
    } else {
      partes.push('@')
      resto = despues
    }
  }

  return partes.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <span key={i} className="font-semibold text-signal">
        {p.m}
      </span>
    ),
  )
}

/**
 * El campo donde se escribe, con el desplegable de `@`.
 *
 * Está aparte del hilo porque se usa en dos momentos distintos:
 * conversando sobre una tarea que ya existe, y escribiendo el primer
 * comentario mientras se la crea. Antes lo segundo no se podía —había
 * que registrar la tarea, volver a abrirla con el lápiz y recién ahí
 * arrobar a alguien—, y en la práctica eso significaba que nadie se
 * enteraba de las tareas nuevas.
 */
export function CajaMencion({
  gente,
  texto,
  onChange,
  placeholder,
  rows = 2,
  onEnter,
}: {
  /** Contra quiénes se resuelve el `@`. Sin nadie, el campo escribe texto y ya. */
  gente: Usuario[]
  texto: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  /** Qué hace Enter. Sin esto, Enter hace un renglón como en cualquier textarea. */
  onEnter?: () => void
}) {
  /* Posición del `@` que se está escribiendo, para el desplegable. */
  const [buscando, setBuscando] = useState<{ desde: number; termino: string } | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  const candidatos = useMemo(() => {
    if (!buscando) return []
    const t = clave(buscando.termino)
    return gente.filter((u) => clave(u.nombre).includes(t)).slice(0, 5)
  }, [buscando, gente])

  const alEscribir = (v: string, posicion: number) => {
    onChange(v)
    /*
     * Se busca el último `@` antes del cursor y se mira lo que sigue.
     * Si hay un espacio en el medio, ya no se está escribiendo una
     * mención y el desplegable se cierra.
     */
    const hasta = v.slice(0, posicion)
    const i = hasta.lastIndexOf('@')
    if (i < 0) return setBuscando(null)
    const termino = hasta.slice(i + 1)
    if (/\s/.test(termino) || termino.length > 24) return setBuscando(null)
    setBuscando({ desde: i, termino })
  }

  const elegir = (u: Usuario) => {
    if (!buscando) return
    const antes = texto.slice(0, buscando.desde)
    const despues = texto.slice(buscando.desde + 1 + buscando.termino.length)
    onChange(`${antes}@${u.nombre}${despues.startsWith(' ') ? '' : ' '}${despues}`)
    setBuscando(null)
    campo.current?.focus()
  }

  return (
    <div className="relative">
      {candidatos.length > 0 && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-56 border border-borde2 bg-panel shadow-lg">
          {candidatos.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => elegir(u)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-hueco"
            >
              <AtSign size={11} className="shrink-0 text-tenue" />
              {u.nombre}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={campo}
        rows={rows}
        value={texto}
        onChange={(e) => alEscribir(e.target.value, e.target.selectionStart)}
        onKeyDown={(e) => {
          /* Con el desplegable abierto, Enter es para elegir, no para mandar. */
          if (onEnter && e.key === 'Enter' && !e.shiftKey && !candidatos.length) {
            e.preventDefault()
            onEnter()
          }
          if (e.key === 'Escape') setBuscando(null)
        }}
        placeholder={placeholder}
        className="w-full text-xs"
      />
    </div>
  )
}

export default function Comentarios({ tarea }: { tarea: Compromiso }) {
  const { estado, yo, comentar, borrarComentario, marcarComentariosLeidos } = useApp()
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const gente = useMemo(
    () => integrantes(estado, tarea.salaId).filter((u) => u.id !== yo?.id),
    [estado, tarea.salaId, yo],
  )

  const hilo = useMemo(
    () =>
      estado.comentarios
        .filter((c) => c.compromisoId === tarea.id)
        .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn)),
    [estado.comentarios, tarea.id],
  )

  /* Abrir el hilo es leerlo. */
  useEffect(() => {
    void marcarComentariosLeidos(tarea.id)
  }, [tarea.id, marcarComentariosLeidos])

  const enviar = async () => {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    try {
      await comentar(tarea.id, texto, detectarMenciones(texto, gente))
      setTexto('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="label">Conversación</div>

      {hilo.length > 0 && (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {hilo.map((c) => {
            const mio = c.autorId === yo?.id
            return (
              <div key={c.id} className="group border border-borde bg-panel p-2.5">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-meta font-semibold">{nombreDe(estado, c.autorId)}</span>
                  <span className="text-[10px] text-tenue">{relativo(c.creadoEn)}</span>
                  {mio && (
                    <button
                      onClick={() => void borrarComentario(c.id)}
                      aria-label="Eliminar comentario"
                      className="ml-auto p-0.5 text-borde2 transition-colors hover:text-alerta xl:opacity-0 xl:group-hover:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                  {conMenciones(c.texto, integrantes(estado, tarea.salaId))}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Escribir ── Enter manda; Shift+Enter hace un renglón. */}
      <CajaMencion
        gente={gente}
        texto={texto}
        onChange={setTexto}
        onEnter={() => void enviar()}
        placeholder="Escribí algo. Con @ arrobás a alguien del equipo."
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-tenue">
          {gente.length > 0
            ? 'Con @ le queda un aviso en la aplicación.'
            : 'Sos el único en esta sala.'}
        </span>
        <Boton tam="sm" variante="solido" disabled={!texto.trim() || enviando} onClick={() => void enviar()}>
          <Send size={11} /> {enviando ? 'Enviando…' : 'Comentar'}
        </Boton>
      </div>
    </div>
  )
}
