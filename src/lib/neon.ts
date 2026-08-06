import { createClient } from '@neondatabase/neon-js'

/* ─────────────────────────────────────────────────────────────
   Cliente de Neon.
   Un solo objeto resuelve las dos mitades: Neon Auth (Better Auth
   gestionado, con Google incluido) y la Data API (PostgREST sobre
   Postgres). El token se inyecta solo en cada consulta, y las
   políticas RLS del esquema deciden qué puede hacer cada rol.

   Sin estas variables la app arranca en modo demo con localStorage.
   ───────────────────────────────────────────────────────────── */

const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL
const DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL

export const neonConfigurado = Boolean(AUTH_URL && DATA_API_URL)

export const neon = neonConfigurado
  ? createClient({
      auth: { url: AUTH_URL },
      dataApi: { url: DATA_API_URL },
    })
  : null

/** Sesión de Neon Auth reducida a lo que necesita la app. */
export interface SesionNeon {
  id: string
  email: string
  nombre: string
  avatarUrl?: string
}

function aSesion(u: {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}): SesionNeon {
  return {
    id: u.id,
    email: u.email ?? '',
    nombre: u.name || u.email || 'Sin nombre',
    avatarUrl: u.image ?? undefined,
  }
}

export async function sesionActual(): Promise<SesionNeon | null> {
  if (!neon) return null
  try {
    const r = await neon.auth.getSession()
    const usuario = r?.data?.user
    return usuario ? aSesion(usuario) : null
  } catch (e) {
    console.warn('[harvey] no se pudo leer la sesión:', e)
    return null
  }
}

/**
 * Arranca el ingreso con Google.
 * Vuelve a la misma URL, que en GitHub Pages incluye el base del repo.
 */
export async function entrarConGoogleNeon(): Promise<void> {
  if (!neon) throw new Error('Neon no está configurado.')
  const volverA = `${window.location.origin}${import.meta.env.BASE_URL}`
  await neon.auth.signIn.social({ provider: 'google', callbackURL: volverA })
}

export async function salirDeNeon(): Promise<void> {
  if (!neon) return
  try {
    await neon.auth.signOut()
  } catch (e) {
    console.warn('[harvey] fallo al cerrar sesión:', e)
  }
}
