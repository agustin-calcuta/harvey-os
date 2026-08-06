import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/* ─────────────────────────────────────────────────────────────
   Firebase opcional.
   La app arranca en modo demo (localStorage) mientras no haya
   credenciales. Al cargar las VITE_FIREBASE_* se activa sola
   el login con Google y la persistencia en Firestore.
   ───────────────────────────────────────────────────────────── */

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigurado = Boolean(cfg.apiKey && cfg.projectId && cfg.authDomain)

let app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null

if (firebaseConfigurado) {
  try {
    app = initializeApp(cfg as Required<typeof cfg>)
    _auth = getAuth(app)
    _db = getFirestore(app)
  } catch (e) {
    console.error('[harvey] no se pudo inicializar Firebase, sigue en modo demo:', e)
    app = null
  }
}

export const auth = _auth
export const db = _db

export async function loginConGoogle(): Promise<User> {
  if (!auth) throw new Error('Firebase no está configurado.')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const cred = await signInWithPopup(auth, provider)
  return cred.user
}

export async function cerrarSesionFirebase(): Promise<void> {
  if (auth) await signOut(auth)
}

export function observarSesion(cb: (u: User | null) => void): () => void {
  if (!auth) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(auth, cb)
}
