import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Settings,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useApp, ROL_LABEL } from '../store/AppContext'
import { cx, estaVencido, proximaReunion, cuentaRegresiva, deadlineAgenda } from '../lib/utils'
import { Avatar, Chip } from './ui'

const NAV = [
  { a: '/', icono: LayoutDashboard, texto: 'Panel', exacto: true },
  { a: '/reuniones', icono: CalendarDays, texto: 'Reuniones' },
  { a: '/compromisos', icono: ListChecks, texto: 'Compromisos' },
  { a: '/pendientes', icono: History, texto: 'Pendientes' },
  { a: '/correos', icono: Mail, texto: 'Correos' },
]

export default function Layout() {
  const { yo, estado, salir, esAdmin } = useApp()
  const [abierto, setAbierto] = useState(false)
  const navegar = useNavigate()

  const misPendientes = estado.compromisos.filter(
    (c) => c.responsableId === yo?.id && c.estado !== 'hecho',
  )
  const vencidos = estado.compromisos.filter((c) => estaVencido(c))
  const proxima = proximaReunion(estado)

  const enlaces = esAdmin
    ? [...NAV, { a: '/admin', icono: Settings, texto: 'Administración' }]
    : NAV

  return (
    <div className="flex min-h-screen">
      {/* ── Barra lateral ── */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-line bg-ink transition-transform lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-5">
          <button onClick={() => navegar('/')} className="text-left">
            <div className="display text-2xl leading-none">Harvey</div>
            <div className="label mt-1">Sistema de reuniones</div>
          </button>
          <button
            className="text-smoke lg:hidden"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {enlaces.map((n) => (
            <NavLink
              key={n.a}
              to={n.a}
              end={n.exacto}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                cx(
                  'group mb-0.5 flex items-center gap-3 border-l-2 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all',
                  isActive
                    ? 'border-signal bg-ink-2 text-bone'
                    : 'border-transparent text-smoke hover:border-line-2 hover:bg-ink-2 hover:text-bone',
                )
              }
            >
              <n.icono size={15} className="shrink-0" />
              <span className="flex-1">{n.texto}</span>
              {n.a === '/compromisos' && misPendientes.length > 0 && (
                <span className="bg-line-2 px-1.5 py-0.5 text-[9px] text-bone">
                  {misPendientes.length}
                </span>
              )}
              {n.a === '/pendientes' && vencidos.length > 0 && (
                <span className="bg-signal px-1.5 py-0.5 text-[9px] text-bone">
                  {vencidos.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Próxima reunión, siempre a la vista */}
        {proxima && (
          <button
            onClick={() => {
              navegar(`/reuniones/${proxima.id}`)
              setAbierto(false)
            }}
            className="mx-3 mb-3 border border-line p-3 text-left transition-colors hover:border-signal"
          >
            <div className="label mb-1.5">Próxima reunión</div>
            <div className="mb-2 text-xs leading-snug text-bone">{proxima.titulo}</div>
            {proxima.estado === 'agenda_abierta' ? (
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-amber" />
                Cierra en {cuentaRegresiva(deadlineAgenda(proxima)).texto}
              </div>
            ) : (
              <Chip tono="cold">{proxima.estado.replace('_', ' ')}</Chip>
            )}
          </button>
        )}

        {/* Usuario */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5">
            <Avatar nombre={yo?.nombre ?? '?'} url={yo?.avatarUrl} tam="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-bone">{yo?.nombre}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-smoke-2">
                {yo ? ROL_LABEL[yo.rol] : ''}
              </div>
            </div>
            <button
              onClick={salir}
              title="Cerrar sesión"
              className="p-1.5 text-smoke transition-colors hover:text-signal"
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
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <div className="display text-lg">Harvey</div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <footer className="border-t border-line px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-smoke-2">
            <span>Harvey OS · vista previa</span>
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
              'animate-in flex items-start gap-3 border bg-ink-2 p-3.5 shadow-2xl',
              colores[a.tono],
            )}
          >
            <Icono size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1 text-xs leading-relaxed text-bone">{a.texto}</span>
            <button
              onClick={() => descartarAviso(a.id)}
              className="shrink-0 text-smoke hover:text-bone"
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
