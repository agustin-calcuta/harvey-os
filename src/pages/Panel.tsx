import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  FileText,
  Inbox,
  Search,
  Users,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  agendaDe,
  estaVencido,
  fechaCorta,
  fechaLarga,
  historialReuniones,
  hora,
  nombreDe,
  proximasReuniones,
  temarioDe,
  temasDe,
  temasSinTratar,
} from '../lib/utils'
import { ESTADO_COMPROMISO, ESTADO_REUNION, IMPORTANCIA } from '../types'
import {
  Atajo,
  Avatares,
  Boton,
  Chip,
  ChipObjetivo,
  Seccion,
  Vacio,
} from '../components/ui'

/* ─────────────────────────────────────────────────────────────
   El panel.

   Se limpió entero: "hay demasiada información y no sé a dónde
   tienen que mirar mis ojos". Quedaron tres cosas y en este
   orden — los accesos directos, la próxima reunión y lo que
   tengo yo a mi nombre—. Los pendientes de otras personas y el
   historial se fueron: viven en Tareas y en Reuniones.
   ───────────────────────────────────────────────────────────── */

export default function Panel() {
  const { estado, yo, salaActiva, compromisosVisibles } = useApp()

  const proximas = proximasReuniones(estado, yo, salaActiva?.id)
  const proxima = proximas[0]
  const ultimaMinuta = historialReuniones(estado, yo, salaActiva?.id)[0]

  const misAbiertas = compromisosVisibles
    .filter((c) => c.responsableId === yo?.id && c.estado !== 'hecho')
    .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))
  const misVencidas = misAbiertas.filter((c) => estaVencido(c))

  const misTemas = temarioDe(estado, yo?.id).length + temasSinTratar(estado, undefined, yo?.id).length
  const agenda = proxima ? agendaDe(estado, proxima.id) : []
  const propuestos = proxima
    ? temasDe(estado, proxima.id).filter((t) => t.estado === 'propuesto')
    : []

  const plural = (n: number, sing: string, plur: string) => (n === 1 ? sing : plur)
  const saludo =
    misAbiertas.length === 0
      ? 'No tenés tareas abiertas a tu nombre.'
      : `Tenés ${misAbiertas.length} ${plural(misAbiertas.length, 'tarea abierta', 'tareas abiertas')}${
          misVencidas.length
            ? `, ${misVencidas.length} ${plural(misVencidas.length, 'vencida', 'vencidas')}`
            : ''
        }.`

  return (
    <div className="space-y-10">
      {/* ── Encabezado ── */}
      <div>
        <div className="label bracket mb-2">
          {salaActiva?.nombre ?? ''} ·{' '}
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </div>
        <h1 className="display text-3xl sm:text-4xl">Hola, {yo?.nombre.split(' ')[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-suave">{saludo}</p>
      </div>

      {/* ── Accesos directos ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Atajo
          a="/temario"
          icono={<Inbox size={18} />}
          titulo="Anotar un tema"
          detalle={
            misTemas > 0
              ? `Tenés ${misTemas} ${plural(misTemas, 'tema anotado', 'temas anotados')} sin reunión`
              : 'Tu bloc de notas, para no perder nada'
          }
        />
        <Atajo
          a="/reuniones?nueva=1"
          icono={<CalendarPlus size={18} />}
          titulo="Crear reunión"
          detalle="Fecha, lugar y a quiénes convocás"
        />
        <Atajo
          a="/reuniones?vista=historial"
          icono={<Search size={18} />}
          titulo="Buscar en minutas"
          detalle="Una palabra y aparece en qué reunión se habló"
        />
        <Atajo
          a={ultimaMinuta ? `/reuniones/${ultimaMinuta.id}` : '/reuniones?vista=historial'}
          icono={<FileText size={18} />}
          titulo="Última minuta"
          detalle={ultimaMinuta ? ultimaMinuta.titulo : 'Todavía no hay ninguna cerrada'}
        />
      </div>

      {/* ── Próxima reunión ── */}
      {proxima ? (
        <Seccion titulo="Próxima reunión">
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borde p-5">
              <div className="min-w-0">
                <Chip tono={proxima.estado === 'agenda_abierta' ? 'acid' : 'amber'}>
                  {ESTADO_REUNION[proxima.estado].nombre}
                </Chip>
                <Link
                  to={`/reuniones/${proxima.id}`}
                  className="display mt-2 block text-xl transition-colors hover:text-signal sm:text-2xl"
                >
                  {proxima.titulo}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-suave">
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

            {agenda.length > 0 && (
              <ul className="divide-y divide-borde">
                {agenda.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="hidden w-6 shrink-0 font-semibold text-[11px] text-tenue sm:block">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="h-6 w-0.5 shrink-0"
                      style={{ background: IMPORTANCIA[t.importancia].hex }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{t.titulo}</span>
                    <span className="hidden sm:block">
                      <ChipObjetivo valor={t.objetivo} />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {propuestos.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-borde bg-amber/5 px-5 py-3">
                <span className="text-xs text-amber">
                  Hay {propuestos.length} {plural(propuestos.length, 'tema', 'temas')} esperando
                  aprobación.
                </span>
                <Link to={`/reuniones/${proxima.id}`}>
                  <Boton tam="sm">Revisar</Boton>
                </Link>
              </div>
            )}
          </div>

          {/* Las otras que vienen, en una línea cada una. */}
          {proximas.length > 1 && (
            <ul className="card mt-3 divide-y divide-borde">
              {proximas.slice(1).map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/reuniones/${r.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 transition-colors hover:text-signal"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{r.titulo}</span>
                    <span className="text-xs text-suave">
                      {fechaCorta(r.fecha)} · {hora(r.fecha)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      ) : (
        <Vacio
          titulo="No hay reuniones a la vista"
          texto="Creá la próxima para que el equipo empiece a cargar temas."
          icono={<Users size={32} />}
          accion={
            <Link to="/reuniones?nueva=1">
              <Boton variante="solido">
                <CalendarPlus size={13} /> Crear reunión
              </Boton>
            </Link>
          }
        />
      )}

      {/* ── Mis tareas ── */}
      <Seccion
        titulo="Mis tareas"
        acciones={
          <Link to="/compromisos">
            <Boton tam="sm">
              Ver todas <ArrowRight size={12} />
            </Boton>
          </Link>
        }
      >
        {misAbiertas.length === 0 ? (
          <Vacio titulo="Sin pendientes" texto="No tenés tareas abiertas a tu nombre." />
        ) : (
          <ul className="card divide-y divide-borde">
            {misAbiertas.slice(0, 5).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                <span
                  className="h-8 w-0.5 shrink-0"
                  style={{ background: IMPORTANCIA[c.importancia].hex }}
                />
                <div className="min-w-0 flex-1 basis-[70%] sm:basis-auto">
                  <div className="text-sm">{c.accion}</div>
                  {c.avance && <div className="mt-0.5 truncate text-xs text-tenue">{c.avance}</div>}
                </div>
                <Chip tono={c.estado === 'en_curso' ? 'amber' : 'neutro'}>
                  {ESTADO_COMPROMISO[c.estado].nombre}
                </Chip>
                <span
                  className={
                    estaVencido(c)
                      ? 'font-semibold text-[11px] text-signal'
                      : 'font-semibold text-[11px] text-suave'
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
    </div>
  )
}
