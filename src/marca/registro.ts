import type { Marca } from './tipos.ts'
import { imporbamas } from './imporbamas.ts'
import { calcuta } from './calcuta.ts'

/* ─────────────────────────────────────────────────────────────
   Qué marcas existen y cuál se está compilando.

   Este archivo lo importa **también `vite.config.ts`**, que corre
   en Node y no tiene `import.meta.env`. Por eso la elección se hace
   con un parámetro y no leyendo la variable de entorno acá: quien
   sabe de dónde sale el valor es cada lado.

   Para dar de alta un cliente: importarlo y sumarlo al mapa.
   ───────────────────────────────────────────────────────────── */

export const marcas: Record<string, Marca> = {
  imporbamas,
  calcuta,
}

/**
 * Con qué se compila si nadie dice nada.
 *
 * Imporbamas, porque es la instancia que ya está en producción: un
 * build sin variables tiene que seguir dando exactamente lo mismo
 * que antes de que este directorio existiera.
 */
export const MARCA_POR_DEFECTO = 'imporbamas'

/**
 * Resuelve el valor de `VITE_MARCA` a una marca.
 *
 * Si el identificador no existe, **rompe el build**. La alternativa
 * —caer en la marca por defecto— es peor de lo que parece: un typo
 * en el workflow de Calcuta desplegaría la aplicación con los
 * colores y el nombre de Imporbamas, y eso se descubre cuando lo
 * abre el cliente, no cuando se compila.
 */
export function elegirMarca(id?: string): Marca {
  const clave = (id ?? MARCA_POR_DEFECTO).trim()
  const marca = marcas[clave]
  if (!marca) {
    const conocidas = Object.keys(marcas).join(', ')
    throw new Error(`VITE_MARCA="${clave}" no existe. Las que hay: ${conocidas}.`)
  }
  return marca
}
