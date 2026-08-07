import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx, iniciales } from '../lib/utils'
import { IMPORTANCIA, OBJETIVOS, type Importancia, type Objetivo } from '../types'

/* ─────────────────────────────────────────────────────────────
   Piezas de interfaz compartidas.
   Lenguaje visual de Harvey: negro, rojo señal, mayúsculas
   condensadas y corchetes como recurso gráfico.
   ───────────────────────────────────────────────────────────── */

/* ── Botón ────────────────────────────────────────────────── */

type BotonProps = {
  variante?: 'solido' | 'linea' | 'fantasma' | 'peligro'
  tam?: 'sm' | 'md' | 'lg'
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function Boton({
  variante = 'linea',
  tam = 'md',
  className,
  children,
  ...props
}: BotonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.12em] transition-all disabled:opacity-35 disabled:cursor-not-allowed select-none border'
  // Alturas cómodas para el dedo: nada por debajo de ~34 px de alto real.
  const tamanos = {
    sm: 'text-[10px] px-3 py-2',
    md: 'text-[11px] px-4 py-2.5',
    lg: 'text-xs px-6 py-3.5',
  }
  const variantes = {
    solido: 'bg-signal border-signal text-white hover:bg-signal-hi hover:border-signal-hi',
    linea: 'bg-panel border-borde2 text-tinta hover:border-signal hover:text-signal',
    fantasma: 'bg-transparent border-transparent text-suave hover:text-tinta',
    peligro: 'bg-panel border-signal/40 text-signal hover:bg-signal hover:text-white',
  }
  return (
    <button className={cx(base, tamanos[tam], variantes[variante], className)} {...props}>
      {children}
    </button>
  )
}

/* ── Etiquetas ────────────────────────────────────────────── */

export function Etiqueta({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('label', className)}>{children}</div>
}

export function Chip({
  children,
  className,
  tono = 'neutro',
  title,
}: {
  children: ReactNode
  className?: string
  tono?: 'neutro' | 'signal' | 'amber' | 'acid' | 'cold'
  title?: string
}) {
  const tonos = {
    neutro: 'border-borde2 text-suave',
    signal: 'border-signal/60 text-signal',
    amber: 'border-amber/60 text-amber',
    acid: 'border-acid/60 text-acid',
    cold: 'border-cold/60 text-cold',
  }
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-semibold text-[9px] uppercase tracking-[0.14em] whitespace-nowrap',
        tonos[tono],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Semáforo de importancia: el rojo/amarillo/verde que pidió Fran. */
export function ChipImportancia({ valor, conTexto = true }: { valor: Importancia; conTexto?: boolean }) {
  const i = IMPORTANCIA[valor]
  const tono = valor === 'alta' ? 'signal' : valor === 'media' ? 'amber' : 'cold'
  return (
    <Chip tono={tono}>
      <span className={cx('inline-block h-1.5 w-1.5 rounded-full', i.bg)} />
      {conTexto && i.nombre}
    </Chip>
  )
}

export function ChipObjetivo({ valor }: { valor: Objetivo }) {
  return <Chip title={OBJETIVOS[valor].desc}>{OBJETIVOS[valor].nombre}</Chip>
}

/* ── Avatar ───────────────────────────────────────────────── */

export function Avatar({
  nombre,
  url,
  tam = 'md',
}: {
  nombre: string
  url?: string
  tam?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const tamanos = {
    xs: 'h-5 w-5 text-[8px]',
    sm: 'h-7 w-7 text-[9px]',
    md: 'h-9 w-9 text-[11px]',
    lg: 'h-12 w-12 text-sm',
  }
  if (url) {
    return (
      <img
        src={url}
        alt={nombre}
        className={cx(tamanos[tam], 'shrink-0 border border-borde object-cover')}
      />
    )
  }
  return (
    <div
      title={nombre}
      className={cx(
        tamanos[tam],
        'shrink-0 border border-borde2 bg-hueco flex items-center justify-center font-semibold tracking-wider text-suave',
      )}
    >
      {iniciales(nombre)}
    </div>
  )
}

export function Avatares({
  nombres,
  max = 5,
}: {
  nombres: { nombre: string; url?: string }[]
  max?: number
}) {
  const visibles = nombres.slice(0, max)
  const resto = nombres.length - visibles.length
  return (
    <div className="flex items-center -space-x-1.5">
      {visibles.map((n, i) => (
        <div key={i} className="ring-1 ring-fondo">
          <Avatar nombre={n.nombre} url={n.url} tam="sm" />
        </div>
      ))}
      {resto > 0 && (
        <div className="h-7 w-7 border border-borde2 bg-hueco flex items-center justify-center font-semibold text-[9px] text-suave ring-1 ring-fondo">
          +{resto}
        </div>
      )}
    </div>
  )
}

/* ── Modal ────────────────────────────────────────────────── */

export function Modal({
  abierto,
  onCerrar,
  titulo,
  kicker,
  children,
  ancho = 'max-w-2xl',
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  kicker?: string
  children: ReactNode
  ancho?: string
}) {
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', onKey)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previo
    }
  }, [abierto, onCerrar])

  if (!abierto) return null
  return (
    <Capa onCerrar={onCerrar}>
      <div className={cx('card animate-in relative my-auto w-full', ancho)}>
        <div className="flex items-start justify-between gap-4 border-b border-borde p-4 sm:p-5">
          <div>
            {kicker && <div className="label bracket mb-2">{kicker}</div>}
            <h2 className="display text-xl sm:text-2xl">{titulo}</h2>
          </div>
          <button
            onClick={onCerrar}
            className="shrink-0 border border-borde2 p-1.5 text-suave transition-colors hover:border-signal hover:text-signal"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </Capa>
  )
}

/**
 * Capa a pantalla completa.
 *
 * Va por portal a <body> a propósito: cualquier ancestro con transform,
 * filtro o animación crea un bloque contenedor y un `fixed` deja de
 * referirse al viewport. El portal lo evita de raíz.
 */
export function Capa({
  children,
  onCerrar,
  alinear = 'center',
}: {
  children: ReactNode
  onCerrar?: () => void
  alinear?: 'center' | 'end'
}) {
  return createPortal(
    <div
      className={cx(
        'fixed inset-0 z-50 flex overflow-y-auto bg-tinta/45 backdrop-blur-sm',
        // items-start + my-auto en el hijo: centra si entra en pantalla y
        // deja scrollear desde arriba si el contenido es más alto.
        alinear === 'end' ? 'justify-end' : 'items-start justify-center p-3 sm:p-8',
      )}
      onMouseDown={(e) => {
        if (onCerrar && e.target === e.currentTarget) onCerrar()
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

/* ── Formularios ──────────────────────────────────────────── */

export function Campo({
  etiqueta,
  children,
  ayuda,
  className,
}: {
  etiqueta: string
  children: ReactNode
  ayuda?: string
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="label mb-1.5 block">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1.5 block text-xs text-tenue">{ayuda}</span>}
    </label>
  )
}

export const inputCls = 'w-full'

/** Selector segmentado, usado para importancia y objetivo. */
export function Segmentado<T extends string>({
  valor,
  opciones,
  onChange,
}: {
  valor: T
  opciones: { valor: T; label: string; color?: string; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          title={o.title}
          onClick={() => onChange(o.valor)}
          className={cx(
            'flex items-center gap-1.5 border px-3 py-2 font-semibold text-[10px] uppercase tracking-[0.12em] transition-all',
            valor === o.valor
              ? 'border-tinta bg-tinta text-fondo'
              : 'border-borde2 text-suave hover:border-suave hover:text-tinta',
          )}
        >
          {o.color && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: o.color }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Estructura ───────────────────────────────────────────── */

export function Seccion({
  titulo,
  kicker,
  acciones,
  children,
  className,
}: {
  titulo?: string
  kicker?: string
  acciones?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('animate-in', className)}>
      {(titulo || acciones) && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {kicker && <div className="label bracket mb-1.5">{kicker}</div>}
            {titulo && <h2 className="display text-2xl sm:text-3xl">{titulo}</h2>}
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Vacio({
  titulo,
  texto,
  accion,
  icono,
}: {
  titulo: string
  texto?: string
  accion?: ReactNode
  icono?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icono && <div className="text-borde2">{icono}</div>}
      <div className="display text-xl text-suave">{titulo}</div>
      {texto && <p className="max-w-sm text-sm text-tenue">{texto}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}

export function Metrica({
  valor,
  etiqueta,
  tono,
  sufijo,
}: {
  valor: string | number
  etiqueta: string
  tono?: 'signal' | 'amber' | 'acid' | 'cold'
  sufijo?: string
}) {
  const colores = {
    signal: 'text-signal',
    amber: 'text-amber',
    acid: 'text-acid',
    cold: 'text-cold',
  }
  return (
    <div className="card p-4">
      <div className="label mb-2">{etiqueta}</div>
      <div className={cx('display text-4xl leading-none', tono && colores[tono])}>
        {valor}
        {sufijo && <span className="ml-1 text-lg text-suave">{sufijo}</span>}
      </div>
    </div>
  )
}

/* ── Confirmación ─────────────────────────────────────────── */

export function Confirmar({
  abierto,
  titulo,
  texto,
  textoBoton = 'Confirmar',
  peligro,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean
  titulo: string
  texto: string
  textoBoton?: string
  peligro?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCancelar} titulo={titulo} ancho="max-w-md">
      <p className="text-sm leading-relaxed text-suave">{texto}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Boton variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton variante={peligro ? 'peligro' : 'solido'} onClick={onConfirmar}>
          {textoBoton}
        </Boton>
      </div>
    </Modal>
  )
}
