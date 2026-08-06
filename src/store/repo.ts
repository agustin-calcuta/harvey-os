import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, firebaseConfigurado } from '../lib/firebase'
import { ESTADO_INICIAL } from '../lib/seed'
import type { Config, Estado } from '../types'

/* ─────────────────────────────────────────────────────────────
   Repositorio con dos implementaciones intercambiables:
   · demo     → localStorage, funciona sin credenciales
   · firebase → Firestore en vivo, se activa con las env vars
   ───────────────────────────────────────────────────────────── */

export type Coleccion = 'usuarios' | 'reuniones' | 'temas' | 'compromisos' | 'notificaciones'

export const COLECCIONES: Coleccion[] = [
  'usuarios',
  'reuniones',
  'temas',
  'compromisos',
  'notificaciones',
]

export interface Repo {
  modo: 'demo' | 'firebase'
  cargar(): Promise<Estado>
  /** Devuelve la función para desuscribirse. Sólo en Firestore. */
  suscribir(cb: (e: Estado) => void): () => void
  guardarDoc(col: Coleccion, item: { id: string }): Promise<void>
  borrarDoc(col: Coleccion, id: string): Promise<void>
  guardarConfig(config: Config): Promise<void>
  /** Vuelca el estado completo. Usado para reset y para sembrar Firestore. */
  reemplazar(estado: Estado): Promise<void>
}

/* ── Demo ─────────────────────────────────────────────────── */

const CLAVE = 'harvey-os:estado:v1'

function leerLocal(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return structuredClone(ESTADO_INICIAL)
    const parsed = JSON.parse(raw) as Partial<Estado>
    // Merge defensivo: si el snapshot guardado es de una versión anterior,
    // completamos las colecciones que falten en vez de romper la app.
    return {
      ...structuredClone(ESTADO_INICIAL),
      ...parsed,
      config: { ...ESTADO_INICIAL.config, ...(parsed.config ?? {}) },
    } as Estado
  } catch {
    return structuredClone(ESTADO_INICIAL)
  }
}

function escribirLocal(e: Estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e))
  } catch (err) {
    console.warn('[harvey] no se pudo persistir en localStorage:', err)
  }
}

export const repoDemo: Repo = {
  modo: 'demo',
  async cargar() {
    return leerLocal()
  },
  suscribir() {
    return () => {}
  },
  async guardarDoc(col, item) {
    const e = leerLocal()
    const arr = e[col] as { id: string }[]
    const i = arr.findIndex((x) => x.id === item.id)
    if (i >= 0) arr[i] = item
    else arr.push(item)
    escribirLocal(e)
  },
  async borrarDoc(col, id) {
    const e = leerLocal()
    // @ts-expect-error — colecciones homogéneas por id
    e[col] = (e[col] as { id: string }[]).filter((x) => x.id !== id)
    escribirLocal(e)
  },
  async guardarConfig(config) {
    const e = leerLocal()
    e.config = config
    escribirLocal(e)
  },
  async reemplazar(estado) {
    escribirLocal(estado)
  },
}

/* ── Firestore ────────────────────────────────────────────── */

export const repoFirebase: Repo = {
  modo: 'firebase',
  async cargar() {
    // La carga real llega por suscribir(); devolvemos el molde vacío.
    return {
      usuarios: [],
      reuniones: [],
      temas: [],
      compromisos: [],
      notificaciones: [],
      config: ESTADO_INICIAL.config,
    }
  },

  suscribir(cb) {
    if (!db) return () => {}
    const acc: Estado = {
      usuarios: [],
      reuniones: [],
      temas: [],
      compromisos: [],
      notificaciones: [],
      config: ESTADO_INICIAL.config,
    }
    const unsubs = COLECCIONES.map((col) =>
      onSnapshot(collection(db!, col), (snap) => {
        // @ts-expect-error — cada colección guarda su propio tipo por id
        acc[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        cb({ ...acc })
      }),
    )
    unsubs.push(
      onSnapshot(doc(db, 'config', 'global'), (snap) => {
        if (snap.exists()) acc.config = { ...ESTADO_INICIAL.config, ...snap.data() } as Config
        cb({ ...acc })
      }),
    )
    return () => unsubs.forEach((u) => u())
  },

  async guardarDoc(col, item) {
    if (!db) return
    const { id, ...resto } = item as { id: string } & Record<string, unknown>
    await setDoc(doc(db, col, id), limpiar(resto), { merge: true })
  },

  async borrarDoc(col, id) {
    if (!db) return
    await deleteDoc(doc(db, col, id))
  },

  async guardarConfig(config) {
    if (!db) return
    await setDoc(doc(db, 'config', 'global'), config, { merge: true })
  },

  async reemplazar(estado) {
    if (!db) return
    const batch = writeBatch(db)
    for (const col of COLECCIONES) {
      for (const item of estado[col] as { id: string }[]) {
        const { id, ...resto } = item as { id: string } & Record<string, unknown>
        batch.set(doc(db, col, id), limpiar(resto))
      }
    }
    batch.set(doc(db, 'config', 'global'), estado.config)
    await batch.commit()
  },
}

/** Firestore rechaza `undefined`; los quitamos antes de escribir. */
function limpiar<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

export const repo: Repo = firebaseConfigurado && db ? repoFirebase : repoDemo
