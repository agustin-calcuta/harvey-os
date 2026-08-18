import { aRgb, type Rgb } from './tipos.ts'

/* ─────────────────────────────────────────────────────────────
   La marca que está compilada, para el resto de la aplicación.

   Se resuelve una vez, en build. `VITE_MARCA` la fija el workflow
   de cada despliegue; en local se pasa por línea de comandos:

     npm run dev                        → Imporbamas
     VITE_MARCA=calcuta npm run dev     → Calcuta

   Importar desde acá y **nunca desde `registro.ts`**: el registro
   conoce todas las marcas, así que traerlo mete a los demás
   clientes dentro del archivo que se le sirve a éste.
   ───────────────────────────────────────────────────────────── */

/*
 * `__MARCA__` lo reemplaza `vite.config.ts` por el objeto literal de
 * la marca elegida. Para la aplicación es una constante; para el
 * paquete final, la única marca que existe.
 */
export const marca = __MARCA__

export const colores = marca.colores
export const fuentes = marca.fuentes
export const logos = marca.logos

/**
 * La misma paleta en RGB, que es lo que quiere jsPDF.
 *
 * Derivada, no escrita: el PDF tenía su propia copia de cuatro
 * colores y era lo último en enterarse de un cambio de marca —hay
 * que generar una minuta para verlo—. Ahora no hay nada que
 * mantener sincronizado porque hay una sola fuente.
 */
export const coloresRgb = Object.fromEntries(
  Object.entries(colores).map(([k, v]) => [k, aRgb(v)]),
) as Record<keyof typeof colores, Rgb>

/**
 * La ruta de un archivo de `public/`, con el prefijo del despliegue.
 *
 * GitHub Pages sirve el sitio bajo `/<repo>/` y Cloudflare Pages
 * bajo `/`. Los logos se piden por acá para que las dos formas
 * funcionen sin tocar la marca.
 */
export const rutaPublica = (r: string) => import.meta.env.BASE_URL + r
