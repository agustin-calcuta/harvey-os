import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  DoorOpen,
  Eye,
  Inbox,
  Info,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  bancoDe,
  cx,
  cuentaRegresiva,
  deadlineAgenda,
  estaVencido,
  proximaReunion,
} from '../lib/utils'
import { ROLES_SALA } from '../types'

const NAV = [
  { a: '/', icono: LayoutDashboard, texto: 'Panel', exacto: true },
  { a: '/reuniones', icono: CalendarDays, texto: 'Reuniones' },
  { a: '/temario', icono: Inbox, texto: 'Temario' },
  { a: '/compromisos', icono: ListChecks, texto: 'Compromisos' },
  { a: '/correos', icono: Mail, texto: 'Correos' },
  { a: '/salas', icono: DoorOpen, texto: 'Salas' },
]

export default function Layout() {
  const {
    yo,
    estado,
    salir,
    vistaPrevia,
    misSalas,
    salaActiva,
    elegirSala,
    miRol,
    esSuperadmin,
    compromisosVisibles,
    solicitudesPendientes,
  } = useApp()

  const [abierto, setAbierto] = useState(false)
  const [salasAbiertas, setSalasAbiertas] = useState(false)
  const navegar = useNavigate()
  const ruta = useLocation()

  useEffect(() => setAbierto(false), [ruta.pathname])
  useEffect(() => setSalasAbiertas(false), [ruta.pathname, salaActiva?.id])
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
  const proxima = salaActiva ? proximaReunion(estado, salaActiva.id) : undefined
  const enBanco = salaActiva ? bancoDe(estado, salaActiva.id).length : 0

  const enlaces = esSuperadmin
    ? [...NAV, { a: '/admin', icono: Settings, texto: 'Administración' }]
    : NAV

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
          <button onClick={() => navegar('/')} className="text-left">
            <div className="display text-2xl leading-none">Harvey</div>
            <div className="label mt-1">Sistema de reuniones</div>
          </button>
          <button
            className="text-white/50 lg:hidden"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Sala activa ──
            Todo lo que se ve abajo pertenece a esta sala. */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setSalasAbiertas((v) => !v)}
            className="flex w-full items-center gap-2 border border-[--color-nocheborde] px-3 py-2.5 text-left transition-colors hover:border-white/30"
          >
            <DoorOpen size={14} className="shrink-0 text-white/50" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white/90">
                {salaActiva?.nombre ?? 'Sin sala'}
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {miRol ? ROLES_SALA[miRol].nombre : '—'}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={cx(
                'shrink-0 text-white/50 transition-transform',
                salasAbiertas && 'rotate-180',
              )}
            />
          </button>

          {salasAbiertas && (
            <div className="mt-1 border border-[--color-nocheborde] bg-black/30">
              {misSalas.map((s) => (
                <button
                  key={s.id}
                  onClick={() => elegirSala(s.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Check
                    size={12}
                    className={cx('shrink-0', s.id === salaActiva?.id ? 'text-signal' : 'opacity-0')}
                  />
                  <span className="truncate">{s.nombre}</span>
                </button>
              ))}
              <button
                onClick={() => navegar('/salas')}
                className="flex w-full items-center gap-2 border-t border-[--color-nocheborde] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-white"
              >
                Ver todas las salas
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {enlaces.map((n) => (
            <NavLink
              key={n.a}
              to={n.a}
              end={n.exacto}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                cx(
                  'group mb-0.5 flex items-center gap-3 border-l-2 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all',
                  isActive
                    ? 'border-signal bg-white/8 text-white'
                    : 'border-transparent text-white/55 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <n.icono size={15} className="shrink-0" />
              <span className="flex-1">{n.texto}</span>
              {/* Lo vencido pesa más que lo propio: si hay, se muestra eso. */}
              {n.a === '/compromisos' &&
                (vencidos.length > 0 ? (
                  <span
                    className="bg-signal px-1.5 py-0.5 text-[9px] text-white"
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
              {n.a === '/temario' && enBanco > 0 && (
                <span
                  className="bg-white/15 px-1.5 py-0.5 text-[9px] text-white"
                  title={`${enBanco} en el banco`}
                >
                  {enBanco}
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
            {proxima.estado === 'agenda_abierta' && !proxima.cierreManual ? (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#E8A33D]">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#E8A33D]" />
                Cierra en {cuentaRegresiva(deadlineAgenda(proxima)).texto}
              </div>
            ) : (
              <span className="inline-flex border border-white/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/60">
                {proxima.estado.replace('_', ' ')}
              </span>
            )}
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
                {esSuperadmin ? 'Soporte' : (yo?.cargo ?? '')}
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
            Harvey
          </button>
          <span className="ml-auto truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-suave">
            {salaActiva?.nombre ?? ''}
          </span>
        </header>

        {vistaPrevia && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber/40 bg-amber/10 px-4 py-2.5 sm:px-6">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber">
              <Eye size={12} />
              Vista previa como {miRol ? ROLES_SALA[miRol].nombre : '—'} · datos de ejemplo, sólo
              en este navegador
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
            <span>Harvey · vista previa</span>
            <span>Desarrollado por Calcuta</span>
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
