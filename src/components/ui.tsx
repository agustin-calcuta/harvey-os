import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronRight, X } from 'lucide-react'
import { cx, iniciales } from '../lib/utils'
import { IMPORTANCIA, OBJETIVOS, type Importancia, type Objetivo } from '../types'

/* ─────────────────────────────────────────────────────────────
   Piezas de interfaz compartidas.

   Lenguaje visual de Harvey: negro, rojo señal y corchetes como
   recurso gráfico. Las mayúsculas quedaron para las etiquetas
   —el kicker y los chips—: en botones y títulos hacían que todo
   pesara lo mismo. Ver la nota de volumen en `index.css`.
   ───────────────────────────────────────────────────────────── */

/* ── Botón ────────────────────────────────────────────────── */

/**
 * `destacado` es el rojo de la marca y va **una vez por pantalla**,
 * para la acción que la define: crear la reunión en Reuniones, la
 * tarea en Tareas, la nota en el bloc, la sala en Salas, y en una
 * reunión abierta iniciarla, cerrarla o mandar la minuta.
 *
 * `solido` es tinta, para todo lo demás que igual es un botón fuerte
 * —proponer un tema, aprobar, guardar un formulario—. Cuando todo era
 * rojo, el rojo no decía nada; con uno por pantalla, dice dónde está
 * lo que se viene a hacer.
 */
type BotonProps = {
  variante?: 'destacado' | 'solido' | 'linea' | 'fantasma' | 'peligro'
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
    'inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed select-none border'
  /*
   * Alturas cómodas para el dedo: nada por debajo de ~40 px de alto
   * real **en el teléfono**, que es donde se usa con el pulgar.
   *
   * Los valores chicos se reservan para `sm:` en adelante: medido en
   * un teléfono, `sm` daba 31 px de alto y `md` 34, por debajo de lo
   * que cualquiera acierta sin mirar. En el escritorio, donde hay
   * puntero, quedan como estaban.
   */
  const tamanos = {
    sm: 'text-meta px-3 py-2.5 sm:py-1.5',
    md: 'text-cuerpo px-4 py-2.5 sm:py-2',
    lg: 'text-tarjeta px-6 py-3.5 sm:py-3',
  }
  const variantes = {
    destacado: 'bg-signal border-signal text-white hover:bg-signal-hi hover:border-signal-hi',
    solido: 'bg-tinta border-tinta text-fondo hover:bg-noche2 hover:border-noche2',
    linea: 'bg-panel border-borde2 text-tinta hover:border-tinta',
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
  tono?: 'neutro' | 'signal' | 'alerta' | 'amber' | 'acid' | 'cold'
  title?: string
}) {
  const tonos = {
    neutro: 'border-borde2 text-suave',
    signal: 'border-signal/60 text-signal',
    /* Lo vencido. En Imporbamas se ve igual que `signal`. */
    alerta: 'border-alerta/60 text-alerta',
    amber: 'border-amber/60 text-amber',
    acid: 'border-acid/60 text-acid',
    cold: 'border-cold/60 text-cold',
  }
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-semibold text-[9px] uppercase tracking-[0.12em] whitespace-nowrap',
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
  const tono = valor === 'alta' ? 'alerta' : valor === 'media' ? 'amber' : 'acid'
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
            <h2 className="titulo">{titulo}</h2>
          </div>
          <button
            onClick={onCerrar}
            className="shrink-0 border border-borde2 p-2.5 text-suave transition-colors hover:border-signal hover:text-signal sm:p-1.5"
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
      {ayuda && <span className="mt-1.5 block text-meta text-tenue">{ayuda}</span>}
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
            'flex items-center gap-1.5 border px-3 py-1.5 font-semibold text-meta transition-all',
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

/**
 * Cambiar la forma de mirar lo mismo: columnas o lista.
 *
 * Estaba escrito a mano en Tareas y el bloc de notas pedía el mismo
 * control; vive acá para que los dos se vean y se comporten igual.
 */
export function SelectorVista<T extends string>({
  valor,
  opciones,
  onChange,
}: {
  valor: T
  opciones: { valor: T; icono: ComponentType<{ size?: number }>; texto: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex border border-borde2">
      {opciones.map(({ valor: v, icono: Icono, texto }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={valor === v}
          className={cx(
            'flex items-center gap-2 px-3 py-1.5 font-semibold text-meta transition-colors',
            valor === v ? 'bg-tinta text-fondo' : 'bg-panel text-suave hover:text-tinta',
          )}
        >
          <Icono size={12} />
          {texto}
        </button>
      ))}
    </div>
  )
}

/**
 * Bloque que se abre y se cierra.
 *
 * *"Es mucha información de golpe; lo único es si yo quiero abrir, le
 * hago clic y se expande"*. El contador queda siempre a la vista para
 * saber si vale la pena abrirlo sin tener que abrirlo.
 */
export function Colapsable({
  titulo,
  cuenta,
  abiertoPorDefecto = false,
  acciones,
  children,
}: {
  titulo: string
  cuenta?: number
  abiertoPorDefecto?: boolean
  /** Va en la cabecera, a la derecha. No abre ni cierra el bloque. */
  acciones?: ReactNode
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto)

  return (
    <section>
      <div className="mb-3 flex items-center gap-2 border-b border-borde pb-2">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left text-sm transition-colors hover:text-signal"
        >
          <ChevronRight
            size={13}
            className={cx(
              'shrink-0 self-center text-suave transition-transform',
              abierto && 'rotate-90',
            )}
          />
          <span className="min-w-0 truncate">{titulo}</span>
          {cuenta !== undefined && <span className="text-meta text-tenue">{cuenta}</span>}
        </button>
        {acciones}
      </div>
      {abierto && children}
    </section>
  )
}

/* ── Estructura ───────────────────────────────────────────── */

/**
 * Una sección de la pantalla.
 *
 * `principal` la marca como el encabezado de la pantalla: ahí sí va
 * el titular de la marca, en h1 y una sola vez. Las demás llevan el
 * escalón de abajo, que ordena sin gritar.
 */
export function Seccion({
  titulo,
  kicker,
  acciones,
  principal = false,
  children,
  className,
}: {
  titulo?: string
  kicker?: string
  acciones?: ReactNode
  principal?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('animate-in', className)}>
      {(titulo || acciones) && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {kicker && <div className="label bracket mb-1.5">{kicker}</div>}
            {titulo &&
              (principal ? (
                <h1 className="display text-titulo">{titulo}</h1>
              ) : (
                <h2 className="titulo">{titulo}</h2>
              ))}
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
      {/* Un estado vacío no es el titular de la pantalla: informa. */}
      <div className="titulo text-suave">{titulo}</div>
      {texto && <p className="max-w-sm text-cuerpo text-tenue">{texto}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}

/**
 * Cifra con su etiqueta. Con `a` se vuelve un enlace: la métrica lleva
 * al listado ya filtrado por eso mismo que muestra.
 */
export function Metrica({
  valor,
  etiqueta,
  tono,
  sufijo,
  a,
}: {
  valor: string | number
  etiqueta: string
  tono?: 'signal' | 'amber' | 'acid' | 'cold'
  sufijo?: string
  a?: string
}) {
  const colores = {
    signal: 'text-signal',
    amber: 'text-amber',
    acid: 'text-acid',
    cold: 'text-cold',
  }
  const cuerpo = (
    <>
      <div className="label mb-2 flex items-center gap-1.5">
        {etiqueta}
        {a && (
          <ArrowUpRight
            size={11}
            className="text-borde2 transition-colors group-hover:text-signal"
          />
        )}
      </div>
      <div className={cx('display text-4xl leading-none', tono && colores[tono])}>
        {valor}
        {sufijo && <span className="ml-1 text-lg text-suave">{sufijo}</span>}
      </div>
    </>
  )

  if (!a) return <div className="card p-4">{cuerpo}</div>

  return (
    <Link to={a} className="card group p-4 transition-colors hover:border-signal">
      {cuerpo}
    </Link>
  )
}

/**
 * Acceso directo del panel.
 *
 * Lo primero que se ve al entrar: *"tenés botones de acción, apenas
 * entrás a tu home tenés todos los shortcuts, porque eso es lo más
 * importante"*.
 */
/**
 * Acceso directo del panel.
 *
 * `destacado` es para el único de los tres que crea algo: *"que se
 * note que es un botón especial"*. Los otros dos son puertas a una
 * pantalla que ya existe y se quedan en su sitio.
 */
export function Atajo({
  a,
  icono,
  titulo,
  detalle,
  destacado = false,
}: {
  a: string
  icono: ReactNode
  titulo: string
  detalle: string
  destacado?: boolean
}) {
  return (
    <Link
      to={a}
      className={cx(
        'group flex items-start gap-3 border p-4 transition-colors',
        destacado
          ? 'border-signal bg-signal text-white hover:bg-signal-hi hover:border-signal-hi'
          : 'card hover:border-signal',
      )}
    >
      <span
        className={cx(
          'mt-0.5 shrink-0 transition-colors',
          destacado ? 'text-white' : 'text-suave group-hover:text-signal',
        )}
      >
        {icono}
      </span>
      <span className="min-w-0">
        <span
          className={cx(
            'block text-sm transition-colors',
            destacado ? 'font-semibold' : 'group-hover:text-signal',
          )}
        >
          {titulo}
        </span>
        <span
          className={cx(
            'mt-0.5 block text-xs leading-snug',
            destacado ? 'text-white/75' : 'text-tenue',
          )}
        >
          {detalle}
        </span>
      </span>
    </Link>
  )
}

/**
 * Barra pegada al pie con la acción que cierra la pantalla.
 *
 * *"Tiene que estar flotante siempre, es el típico submit"*: se venía
 * perdiendo al final de una página larga y nadie la encontraba.
 */
export function BarraFlotante({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'sticky bottom-0 z-20 -mx-4 mt-6 border-t border-borde bg-fondo/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-3">{children}</div>
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

/* ─────────────────────────────────────────────────────────────
   Si la pantalla es de escritorio.

   Los tableros arrastran desde toda la tarjeta, y en un teléfono
   eso pelea con el gesto de scrollear: el dedo baja por la lista y
   el primer movimiento se lo lleva el arrastre. Ahí las columnas
   además están apiladas, así que arrastrar entre ellas no lleva a
   ningún lado —cada tarjeta trae sus propios botones de estado—.

   El corte es el mismo `md` de Tailwind con el que las columnas se
   ponen una al lado de la otra: si se ven en fila, se arrastra.
   ───────────────────────────────────────────────────────────── */
export function usePantallaAncha(minPx = 768) {
  const consulta = `(min-width: ${minPx}px)`
  const [ancha, setAncha] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const alCambiar = () => setAncha(mq.matches)
    alCambiar()
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [consulta])

  return ancha
}
