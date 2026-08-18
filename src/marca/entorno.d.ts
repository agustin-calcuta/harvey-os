import type { Marca } from './tipos.ts'

/*
 * La marca compilada, inyectada por `vite.config.ts` con `define`.
 *
 * Se resuelve a un objeto literal en tiempo de build. Es la forma de
 * que el paquete de un cliente **no contenga a los demás**: si la
 * aplicación importara el registro, el archivo que se le sirve a
 * Calcuta traería adentro la paleta y el nombre de Imporbamas.
 */
declare global {
  const __MARCA__: Marca
}

export {}
