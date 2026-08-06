import { ArrowRight } from 'lucide-react'
import { useApp, ROL_LABEL } from '../store/AppContext'
import { Avatar } from '../components/ui'
import { firebaseConfigurado } from '../lib/firebase'

const CINTA =
  'PRE-REUNIÓN · TEMARIO 24 H ANTES · REUNIÓN · MINUTA EN VIVO · POST-REUNIÓN · COMPROMISOS CON RESPONSABLE Y FECHA · '

export default function Login() {
  const { estado, entrarComoDemo, entrarConGoogle } = useApp()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Cinta superior, como la de la tienda */}
      <div className="overflow-hidden border-b border-line bg-signal py-2">
        <div className="marquee flex whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-bone">
          <span>{CINTA.repeat(4)}</span>
          <span>{CINTA.repeat(4)}</span>
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Marca ── */}
        <div className="relative flex flex-col justify-between overflow-hidden border-b border-line p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg,#F4F2EE 0,#F4F2EE 1px,transparent 1px,transparent 14px)',
            }}
          />
          <div className="relative">
            <div className="label bracket">Calcuta para Harvey</div>
          </div>

          <div className="relative py-12">
            <h1 className="display text-[clamp(3.5rem,11vw,7.5rem)]">
              Harvey
              <br />
              <span className="text-signal">OS</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-smoke">
              Las reuniones dejan de perderse. Temario cargado con anticipación, tiempos
              asignados, minuta que se arma sola y compromisos con nombre y fecha.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['Pre-reunión', 'Reunión', 'Post-reunión'].map((f, i) => (
                <div
                  key={f}
                  className="flex items-center gap-2 border border-line-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  <span className="text-signal">{String(i + 1).padStart(2, '0')}</span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="relative font-mono text-[10px] uppercase tracking-[0.16em] text-smoke-2">
            Vista previa · {new Date().getFullYear()}
          </div>
        </div>

        {/* ── Acceso ── */}
        <div className="flex flex-col justify-center p-8 lg:p-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="label bracket mb-3">Acceso</div>
            <h2 className="display mb-8 text-4xl">Entrar</h2>

            <button
              onClick={entrarConGoogle}
              className="group mb-3 flex w-full items-center justify-center gap-3 border border-line-2 bg-bone px-5 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-all hover:bg-white"
            >
              <GoogleIcono />
              Continuar con Google
            </button>

            {!firebaseConfigurado && (
              <p className="mb-8 text-xs leading-relaxed text-smoke-2">
                El acceso con Google se activa al cargar las credenciales de Firebase. Mientras
                tanto, entrá con uno de los perfiles de prueba para recorrer la plataforma con
                cada rol.
              </p>
            )}

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="label">Perfiles de prueba</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="space-y-1.5">
              {estado.usuarios
                .filter((u) => u.activo)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => entrarComoDemo(u.id)}
                    className="group flex w-full items-center gap-3 border border-line bg-ink-2 p-3 text-left transition-all hover:border-signal"
                  >
                    <Avatar nombre={u.nombre} url={u.avatarUrl} tam="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-bone">{u.nombre}</div>
                      <div className="truncate text-[11px] text-smoke-2">
                        {u.cargo ?? u.email}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-smoke">
                      {ROL_LABEL[u.rol]}
                    </span>
                    <ArrowRight
                      size={14}
                      className="shrink-0 text-line-2 transition-colors group-hover:text-signal"
                    />
                  </button>
                ))}
            </div>

            <p className="mt-8 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-smoke-2">
              Probá con Matías para ver el rol de organizador y con Tomás para ver el de
              miembro.
            </p>
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
