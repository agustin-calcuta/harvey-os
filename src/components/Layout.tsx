import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  DoorOpen,
  Eye,
  Inbox,
  Info,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { cx, estaVencido, proximasReuniones, temarioDe, temasSinTratar } from '../lib/utils'
import { ESTADO_REUNION } from '../types'
import { logos, marca, rutaPublica } from '../marca'

/*
 * «Correos» salió del menú: mostraba vistas previas de mensajes sin
 * configurar y confundía más de lo que ayudaba. El registro sigue
 * existiendo, en Administración, para cuando haga falta revisarlo.
 */
const NAV = [
  { a: '/', icono: LayoutDashboard, texto: 'Panel', exacto: true },
  { a: '/reuniones', icono: CalendarDays, texto: 'Reuniones' },
  { a: '/bloc', icono: Inbox, texto: 'Bloc de notas' },
  { a: '/compromisos', icono: ListChecks, texto: 'Tareas' },
  { a: '/salas', icono: DoorOpen, texto: 'Salas' },
]

export default function Layout() {
  const {
    yo,
    estado,
    salir,
    vistaPrevia,
    esSuperadmin,
    compromisosVisibles,
    solicitudesPendientes,
    mencionesSinLeer,
  } = useApp()

  const [abierto, setAbierto] = useState(false)
  const navegar = useNavigate()
  const ruta = useLocation()

  useEffect(() => setAbierto(false), [ruta.pathname])
  useEffect(() => {
    if (!abierto) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [abierto])

  const misPendientes = compromisosVisibles.filter(
    (c) => c.responsableId === yo?.id && c.estado !== 'hecho',
  )
  const vencidos = compromisosVisibles.filter((c) => estaVencido(c))
  // Por `proximasReuniones` y no por la primera de la lista: una reunión
  // privada no tiene que asomar acá para quien no participa.
  const proxima = proximasReuniones(estado, yo)[0]
  // El bloc de notas es personal: cuenta lo mío, no lo de la sala.
  const enElBloc =
    temarioDe(estado, yo?.id).length + temasSinTratar(estado, undefined, yo?.id).length

  const enlaces = esSuperadmin
    ? [...NAV, { a: '/admin', icono: Settings, texto: 'Administración' }]
    : NAV

  /*
   * El nombre sale de la configuración: la usan para todas sus
   * sociedades. La marca compilada es sólo el valor de arranque,
   * para antes de que exista configuración cargada.
   */
  const nombre = estado.config.organizacion || marca.nombre

  return (
    <div className="flex min-h-screen">
      {/* ── Barra lateral ──
          Queda en oscuro: sostiene el contraste de la marca y separa
          la navegación del área de trabajo. */}
      <aside
        className={cx(
          'noche fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col transition-transform lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <button onClick={() => navegar('/')} className="flex items-center gap-3 text-left">
            {/*
              El isotipo si la marca lo trae, el nombre compuesto si
              no. Imporbamas nunca tuvo archivo de logo y así se
              queda como estaba.
            */}
            {logos.isotipoClaro && (
              <img
                src={rutaPublica(logos.isotipoClaro)}
                alt=""
                aria-hidden
                className="h-8 w-8 shrink-0"
              />
            )}
            <span className="block">
              <span className="display block text-2xl leading-none">{nombre}</span>
              <span className="label mt-1 block">Reuniones y minutas</span>
            </span>
          </button>
          <button
            className="text-white/50 lg:hidden"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/*
          Acá vivía el selector de sala. Se fue: ninguna pantalla
          depende ya de una sala activa —todas traen lo de todas mis
          salas y filtran adentro—, así que un selector global no
          elegía nada y sólo confundía.
        */}

        <nav className="flex-1 overflow-y-auto px-3">
          {enlaces.map((n) => (
            <NavLink
              key={n.a}
              to={n.a}
              end={n.exacto}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                cx(
                  'group mb-0.5 flex items-center gap-3 border-l-2 px-3 py-2.5 text-cuerpo font-semibold transition-all',
                  /*
                   * La marca del enlace activo va en `acento`, que
                   * es el color que aparece poco y se nota mucho.
                   * Sobre la barra oscura el lima de Calcuta se lee
                   * perfecto —sobre las superficies claras no, por
                   * eso no se usa en ningún otro lado—. En
                   * Imporbamas `acento` es el mismo rojo de antes.
                   */
                  isActive
                    ? 'border-acento bg-white/8 text-white'
                    : 'border-transparent text-white/55 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <n.icono size={15} className="shrink-0" />
              <span className="flex-1">{n.texto}</span>
              {/*
                Que me hayan arrobado pesa más que cualquier contador:
                es alguien esperando una respuesta, no una cuenta.
                Por eso va en `acento` —el color que aparece poco— y
                se muestra antes que lo vencido.
              */}
              {n.a === '/compromisos' && mencionesSinLeer.length > 0 ? (
                <span
                  className="bg-acento px-1.5 py-0.5 text-[9px] font-semibold text-acento-tinta"
                  title={`${mencionesSinLeer.length} ${
                    mencionesSinLeer.length === 1 ? 'mención sin leer' : 'menciones sin leer'
                  }`}
                >
                  @{mencionesSinLeer.length}
                </span>
              ) : null}
              {/* Lo vencido pesa más que lo propio: si hay, se muestra eso. */}
              {n.a === '/compromisos' && mencionesSinLeer.length === 0 &&
                (vencidos.length > 0 ? (
                  <span
                    className="bg-alerta px-1.5 py-0.5 text-[9px] text-white"
                    title={`${vencidos.length} vencidos`}
                  >
                    {vencidos.length}
                  </span>
                ) : (
                  misPendientes.length > 0 && (
                    <span className="bg-white/15 px-1.5 py-0.5 text-[9px] text-white">
                      {misPendientes.length}
                    </span>
                  )
                ))}
              {n.a === '/bloc' && enElBloc > 0 && (
                <span
                  className="bg-white/15 px-1.5 py-0.5 text-[9px] text-white"
                  title={`${enElBloc} temas anotados`}
                >
                  {enElBloc}
                </span>
              )}
              {/* Alguien esperando entrar a una sala que organizo. */}
              {n.a === '/salas' && solicitudesPendientes.length > 0 && (
                <span
                  className="bg-signal px-1.5 py-0.5 text-[9px] text-white"
                  title={`${solicitudesPendientes.length} piden entrar`}
                >
                  {solicitudesPendientes.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {proxima && (
          <button
            onClick={() => {
              navegar(`/reuniones/${proxima.id}`)
              setAbierto(false)
            }}
            className="mx-3 mb-3 border border-[--color-nocheborde] p-3 text-left transition-colors hover:border-signal"
          >
            <div className="label mb-1.5">Próxima reunión</div>
            <div className="mb-2 text-xs leading-snug text-white/85">{proxima.titulo}</div>
            <span className="inline-flex border border-white/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/60">
              {ESTADO_REUNION[proxima.estado].nombre}
            </span>
          </button>
        )}

        <div className="border-t border-[--color-nocheborde] p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/20 text-[9px] font-semibold tracking-wider text-white/70">
              {(yo?.nombre ?? '?')
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? '')
                .join('')}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-white/90">{yo?.nombre}</div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {esSuperadmin ? 'Superadmin' : (yo?.cargo ?? '')}
              </div>
            </div>
            <button
              onClick={salir}
              title="Cerrar sesión"
              className="p-1.5 text-white/50 transition-colors hover:text-signal"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* ── Contenido ── */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setAbierto(true)} aria-label="Abrir menú" className="-m-2 p-2">
            <Menu size={20} />
          </button>
          <button onClick={() => navegar('/')} className="display text-lg">
            {nombre}
          </button>
        </header>

        {vistaPrevia && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber/40 bg-amber/10 px-4 py-2.5 sm:px-6">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber">
              <Eye size={12} />
              Vista previa como {esSuperadmin ? 'Superadmin' : (yo?.nombre ?? '—')} · datos de
              ejemplo, sólo en este navegador
            </span>
            <button
              onClick={salir}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber underline underline-offset-2 hover:text-tinta"
            >
              Salir y entrar con Google
            </button>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <footer className="border-t border-borde px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-tenue">
            <span>{nombre} · reuniones y minutas</span>
            {marca.credito && <span>{marca.credito}</span>}
          </div>
        </footer>
      </div>

      <Avisos />
    </div>
  )
}

/* ── Avisos flotantes ─────────────────────────────────────── */

function Avisos() {
  const { avisos, descartarAviso } = useApp()
  if (!avisos.length) return null

  const iconos = { ok: CheckCircle2, error: AlertTriangle, info: Info }
  const colores = {
    ok: 'border-acid/60 text-acid',
    error: 'border-signal/60 text-signal',
    info: 'border-cold/60 text-cold',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2">
      {avisos.map((a) => {
        const Icono = iconos[a.tono]
        return (
          <div
            key={a.id}
            className={cx(
              'animate-in flex items-start gap-3 border bg-panel p-3.5 shadow-2xl',
              colores[a.tono],
            )}
          >
            <Icono size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1 text-xs leading-relaxed text-tinta">{a.texto}</span>
            <button
              onClick={() => descartarAviso(a.id)}
              className="shrink-0 text-suave hover:text-tinta"
              aria-label="Descartar"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
