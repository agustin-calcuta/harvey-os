import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock, Plus, Users } from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  agendaDe,
  compromisosArrastrados,
  cuentaRegresiva,
  deadlineAgenda,
  estaVencido,
  fechaCorta,
  fechaLarga,
  hora,
  minutosAgenda,
  nombreDe,
  ordenarReuniones,
  proximaReunion,
  temasDe,
  venceProximo,
} from '../lib/utils'
import { ESTADO_REUNION, IMPORTANCIA } from '../types'
import {
  Avatares,
  Boton,
  Chip,
  ChipImportancia,
  ChipObjetivo,
  Metrica,
  Seccion,
  Vacio,
} from '../components/ui'

export default function Panel() {
  const { estado, yo, puedeOrganizar } = useApp()
  const proxima = proximaReunion(estado)

  const misAbiertos = estado.compromisos.filter(
    (c) => c.responsableId === yo?.id && c.estado !== 'hecho',
  )
  const vencidos = estado.compromisos.filter((c) => estaVencido(c))
  const porVencer = estado.compromisos.filter((c) => venceProximo(c))
  const abiertos = estado.compromisos.filter((c) => c.estado !== 'hecho')
  const cerradas = estado.reuniones.filter((r) => r.estado === 'cerrada')

  const arrastrados = proxima ? compromisosArrastrados(estado, proxima.id) : []
  const agenda = proxima ? agendaDe(estado, proxima.id) : []
  const propuestos = proxima
    ? temasDe(estado, proxima.id).filter((t) => t.estado === 'propuesto')
    : []

  return (
    <div className="space-y-10">
      {/* ── Encabezado ── */}
      <div>
        <div className="label bracket mb-2">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </div>
        <h1 className="display text-4xl sm:text-5xl">
          Hola, {yo?.nombre.split(' ')[0]}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-smoke">
          {misAbiertos.length === 0
            ? 'No tenés compromisos abiertos. Todo al día.'
            : `Tenés ${misAbiertos.length} compromiso${misAbiertos.length > 1 ? 's' : ''} abierto${misAbiertos.length > 1 ? 's' : ''}${
                vencidos.filter((c) => c.responsableId === yo?.id).length
                  ? ` y ${vencidos.filter((c) => c.responsableId === yo?.id).length} vencido${vencidos.filter((c) => c.responsableId === yo?.id).length > 1 ? 's' : ''}`
                  : ''
              }.`}
        </p>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica valor={abiertos.length} etiqueta="Compromisos abiertos" />
        <Metrica
          valor={vencidos.length}
          etiqueta="Vencidos"
          tono={vencidos.length ? 'signal' : undefined}
        />
        <Metrica
          valor={porVencer.length}
          etiqueta="Vencen esta semana"
          tono={porVencer.length ? 'amber' : undefined}
        />
        <Metrica valor={cerradas.length} etiqueta="Reuniones cerradas" />
      </div>

      {/* ── Próxima reunión ── */}
      {proxima ? (
        <Seccion kicker="Lo que viene" titulo="Próxima reunión">
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip tono={proxima.estado === 'agenda_abierta' ? 'acid' : 'amber'}>
                    {ESTADO_REUNION[proxima.estado].nombre}
                  </Chip>
                  {proxima.estado === 'agenda_abierta' && (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                      <Clock size={11} />
                      Temario cierra en {cuentaRegresiva(deadlineAgenda(proxima)).texto}
                    </span>
                  )}
                </div>
                <Link
                  to={`/reuniones/${proxima.id}`}
                  className="display block text-2xl transition-colors hover:text-signal sm:text-3xl"
                >
                  {proxima.titulo}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-smoke">
                  <span>
                    {fechaLarga(proxima.fecha)} · {hora(proxima.fecha)}
                  </span>
                  {proxima.lugar && <span>{proxima.lugar}</span>}
                  <span>Modera {nombreDe(estado, proxima.moderadorId)}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3">
                <Avatares
                  nombres={proxima.participantesIds
                    .map((id) => estado.usuarios.find((u) => u.id === id))
                    .filter(Boolean)
                    .map((u) => ({ nombre: u!.nombre, url: u!.avatarUrl }))}
                />
                <Link to={`/reuniones/${proxima.id}`}>
                  <Boton variante="solido" tam="sm">
                    Abrir <ArrowRight size={12} />
                  </Boton>
                </Link>
              </div>
            </div>

            {/* Agenda */}
            <div className="grid gap-px bg-line sm:grid-cols-3">
              <div className="bg-ink-2 p-4">
                <div className="label mb-1">En agenda</div>
                <div className="display text-2xl">{agenda.length}</div>
              </div>
              <div className="bg-ink-2 p-4">
                <div className="label mb-1">Esperando aprobación</div>
                <div className="display text-2xl">{propuestos.length}</div>
              </div>
              <div className="bg-ink-2 p-4">
                <div className="label mb-1">Tiempo asignado</div>
                <div
                  className={
                    minutosAgenda(agenda) > proxima.duracionPrevistaMin
                      ? 'display text-2xl text-signal'
                      : 'display text-2xl'
                  }
                >
                  {minutosAgenda(agenda)}
                  <span className="ml-1 text-sm text-smoke">
                    / {proxima.duracionPrevistaMin} min
                  </span>
                </div>
              </div>
            </div>

            {agenda.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {agenda.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 shrink-0 font-mono text-[11px] text-smoke-2">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="h-6 w-0.5 shrink-0"
                      style={{ background: IMPORTANCIA[t.importancia].hex }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{t.titulo}</span>
                    <ChipObjetivo valor={t.objetivo} />
                    <span className="w-14 shrink-0 text-right font-mono text-[11px] text-smoke">
                      {t.duracionMin} min
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {propuestos.length > 0 && puedeOrganizar && (
              <div className="flex items-center justify-between gap-3 border-t border-line bg-amber/5 px-5 py-3">
                <span className="text-xs text-amber">
                  Hay {propuestos.length} tema{propuestos.length > 1 ? 's' : ''} esperando tu
                  aprobación.
                </span>
                <Link to={`/reuniones/${proxima.id}`}>
                  <Boton tam="sm">Revisar</Boton>
                </Link>
              </div>
            )}
          </div>
        </Seccion>
      ) : (
        <Vacio
          titulo="No hay reuniones programadas"
          texto="Creá la próxima reunión para que el equipo empiece a cargar temas."
          icono={<Users size={32} />}
          accion={
            puedeOrganizar && (
              <Link to="/reuniones">
                <Boton variante="solido">
                  <Plus size={13} /> Nueva reunión
                </Boton>
              </Link>
            )
          }
        />
      )}

      {/* ── Mis compromisos ── */}
      <Seccion
        kicker="Tu carga"
        titulo="Mis compromisos"
        acciones={
          <Link to="/compromisos">
            <Boton tam="sm">
              Ver tablero <ArrowRight size={12} />
            </Boton>
          </Link>
        }
      >
        {misAbiertos.length === 0 ? (
          <Vacio titulo="Sin pendientes" texto="No tenés compromisos abiertos a tu nombre." />
        ) : (
          <ul className="card divide-y divide-line">
            {misAbiertos
              .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))
              .map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span
                    className="h-8 w-0.5 shrink-0"
                    style={{ background: IMPORTANCIA[c.importancia].hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{c.accion}</div>
                    {c.avance && (
                      <div className="mt-0.5 truncate text-xs text-smoke-2">{c.avance}</div>
                    )}
                  </div>
                  <Chip tono={c.estado === 'bloqueado' ? 'signal' : 'neutro'}>{c.estado.replace('_', ' ')}</Chip>
                  <span
                    className={
                      estaVencido(c)
                        ? 'font-mono text-[11px] text-signal'
                        : 'font-mono text-[11px] text-smoke'
                    }
                  >
                    {estaVencido(c) && <AlertTriangle size={11} className="mr-1 inline" />}
                    {fechaCorta(c.fechaLimite)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Seccion>

      {/* ── Arrastre de reuniones anteriores ── */}
      {arrastrados.length > 0 && (
        <Seccion
          kicker="Vienen de atrás"
          titulo="Pendientes arrastrados"
          acciones={
            <Link to="/pendientes">
              <Boton tam="sm">
                Ver historial <ArrowRight size={12} />
              </Boton>
            </Link>
          }
        >
          <p className="mb-4 max-w-2xl text-sm text-smoke">
            Compromisos abiertos de reuniones anteriores. Este es el bloque que se repasa al
            arrancar, sin ensuciar la minuta del día.
          </p>
          <ul className="card divide-y divide-line">
            {arrastrados.slice(0, 6).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <ChipImportancia valor={c.importancia} conTexto={false} />
                <span className="min-w-0 flex-1 truncate text-sm">{c.accion}</span>
                <span className="text-xs text-smoke">{nombreDe(estado, c.responsableId)}</span>
                <span
                  className={
                    estaVencido(c)
                      ? 'w-20 text-right font-mono text-[11px] text-signal'
                      : 'w-20 text-right font-mono text-[11px] text-smoke'
                  }
                >
                  {fechaCorta(c.fechaLimite)}
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {/* ── Historial ── */}
      <Seccion
        kicker="Registro"
        titulo="Últimas reuniones"
        acciones={
          <Link to="/reuniones">
            <Boton tam="sm">
              Todas <ArrowRight size={12} />
            </Boton>
          </Link>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {ordenarReuniones(cerradas)
            .slice(0, 4)
            .map((r) => (
              <Link
                key={r.id}
                to={`/reuniones/${r.id}`}
                className="card group p-4 transition-colors hover:border-signal"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Chip tono="cold">{ESTADO_REUNION[r.estado].nombre}</Chip>
                  <span className="font-mono text-[10px] text-smoke-2">
                    {fechaCorta(r.fecha)}
                  </span>
                </div>
                <div className="text-sm transition-colors group-hover:text-signal">
                  {r.titulo}
                </div>
                <div className="mt-2 flex gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-smoke-2">
                  <span>{agendaDe(estado, r.id).length} temas</span>
                  <span>
                    {estado.compromisos.filter((c) => c.reunionId === r.id).length} compromisos
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </Seccion>
    </div>
  )
}
