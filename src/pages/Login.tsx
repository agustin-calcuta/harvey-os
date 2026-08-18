import { ArrowRight } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { firebaseConfigurado } from '../lib/firebase'
import { neonConfigurado } from '../lib/neon'
import { ESTADO_INICIAL, VISTAS } from '../lib/seed'
import { logos, marca, rutaPublica } from '../marca'

const CINTA =
  'TEMARIO · REUNIÓN · MINUTA EN VIVO · SEGUIMIENTO · TAREAS CON RESPONSABLE Y FECHA · '

/*
 * Los cuatro perfiles vienen del seed: qué cuentas se ofrecen
 * depende de quién existe en los datos de cada cliente.
 */

export default function Login() {
  const { entrarComoDemo, entrarConGoogle } = useApp()
  const accesoReal = neonConfigurado || firebaseConfigurado
  const usuarios = ESTADO_INICIAL.usuarios
  /*
   * Una instancia que ya está en uso no tiene perfiles de
   * demostración: se entra con la cuenta propia a los datos
   * propios. Lo decide el seed del cliente, no una opción aparte.
   */
  const hayVistaPrevia = VISTAS.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      {/* Cinta superior, como la de la tienda */}
      <div className="overflow-hidden border-b border-borde bg-signal py-2">
        <div className="marquee flex whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
          <span>{CINTA.repeat(4)}</span>
          <span>{CINTA.repeat(4)}</span>
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Marca ── */}
        <div className="relative flex flex-col justify-between overflow-hidden border-b border-borde p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg,var(--color-tinta) 0,var(--color-tinta) 1px,transparent 1px,transparent 14px)',
            }}
          />
          <div className="relative">
            <div className="label bracket">{marca.kicker}</div>
          </div>

          <div className="relative py-12">
            {/*
              El logotipo completo va una vez, acá y grande. Si la
              marca no trae archivo, el nombre compuesto hace el
              mismo trabajo —que es lo que hacía Imporbamas—.
            */}
            <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">
              {logos.logotipo ? (
                <img
                  src={rutaPublica(logos.logotipo)}
                  alt={marca.nombre}
                  className="w-full max-w-[min(28rem,80%)]"
                />
              ) : (
                marca.nombre
              )}
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-suave">
              Las reuniones dejan de perderse. Cada equipo tiene su sala, con el temario cargado
              con anticipación, tiempos asignados, minuta que se arma sola y tareas con
              nombre y fecha.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['Temario', 'Reunión', 'Minuta'].map((f, i) => (
                <div
                  key={f}
                  className="flex items-center gap-2 border border-borde2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  <span className="text-signal">{String(i + 1).padStart(2, '0')}</span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-tenue">
            {hayVistaPrevia ? 'Vista previa' : marca.nombre} · {new Date().getFullYear()}
          </div>
        </div>

        {/* ── Acceso ── */}
        <div className="flex flex-col justify-center p-8 lg:p-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="label bracket mb-3">Acceso</div>
            <h2 className="display mb-8 text-4xl">Entrar</h2>

            <button
              onClick={entrarConGoogle}
              className="mb-3 flex w-full items-center justify-center gap-3 border border-tinta bg-tinta px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-fondo transition-all hover:bg-black"
            >
              <GoogleIcono />
              Continuar con Google
            </button>

            <p className="text-xs leading-relaxed text-tenue">
              {accesoReal
                ? 'Entrás a las salas de las que formás parte, con el rol que tengas en cada una.'
                : 'El acceso con Google se activa al cargar las credenciales.'}
            </p>

            {/*
              El recorrido por perfil sólo existe donde hay perfiles
              de demostración cargados. En una instancia que ya está
              en uso —el equipo entra con su cuenta a sus datos
              reales— no hay nada que previsualizar, y ofrecerlo
              haría parecer que lo que se ve es de mentira.
            */}
            {hayVistaPrevia && (
              <>
                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-borde" />
                  <span className="label">O mirá cómo se ve cada perfil</span>
                  <div className="h-px flex-1 bg-borde" />
                </div>

                <p className="mb-4 text-xs leading-relaxed text-tenue">
                  Entrás sin iniciar sesión, con datos de ejemplo. Nada de lo que toques sale de
                  este navegador.
                </p>

                <div className="space-y-1.5">
                  {VISTAS.map((v) => {
                    const u = usuarios.find((x) => x.id === v.id)
                    if (!u) return null
                    return (
                      <button
                        key={u.id}
                        onClick={() => entrarComoDemo(u.id, v.sala)}
                        className="group flex w-full items-center gap-3 border border-borde bg-panel p-3 text-left transition-all hover:border-signal"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">
                            {v.nombre}
                            {u.nombre !== v.nombre && (
                              <span className="ml-2 text-meta text-tenue">{u.nombre}</span>
                            )}
                          </div>
                          <div className="truncate text-[11px] leading-snug text-tenue">
                            {v.que}
                          </div>
                        </div>
                        <ArrowRight
                          size={14}
                          className="shrink-0 text-borde2 transition-colors group-hover:text-signal"
                        />
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcono() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}
