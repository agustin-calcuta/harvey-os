import type { Marca } from './tipos.ts'

/* ─────────────────────────────────────────────────────────────
   De una marca al bloque de variables CSS que la aplica.

   Lo llama `vite.config.ts` y el resultado se inyecta como un
   `<style>` en el `<head>`, **antes** de la hoja de estilos. Eso
   importa: si las variables las escribiera JavaScript al arrancar,
   la aplicación se vería un instante con los colores de Imporbamas
   antes de repintarse con los de Calcuta. Resuelto en build no hay
   parpadeo posible.

   `index.css` no conoce ningún color: su `@theme` referencia estas
   variables y Tailwind genera las utilidades apuntando a ellas.
   ───────────────────────────────────────────────────────────── */

/** `signalHi` → `signal-hi`, que es como se escribe una variable CSS. */
const guionar = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

/**
 * El bloque `:root { … }` de una marca.
 *
 * Sale sin indentar y en una línea por variable: va incrustado en el
 * HTML, donde nadie lo lee a mano, y así el diff de un cambio de
 * color es de una sola línea.
 */
export function cssDeMarca(marca: Marca): string {
  const { colores, fuentes } = marca

  const vars = [
    ...Object.entries(colores).map(([k, v]) => `--m-${guionar(k)}: ${v};`),

    `--m-font-display: ${fuentes.display};`,
    `--m-font-sans: ${fuentes.sans};`,
    `--m-font-mono: ${fuentes.mono};`,

    /*
     * Cómo se compone el titular. Están acá y no en `index.css`
     * porque la caja es de la marca: Imporbamas va en mayúsculas y
     * Calcuta en caja mixta, y eso no es una preferencia sino lo
     * que dice cada manual.
     */
    `--m-display-peso: ${fuentes.displayPeso};`,
    `--m-display-caja: ${fuentes.displayCaja};`,
    `--m-display-tracking: ${fuentes.displayTracking};`,
    `--m-titulo-peso: ${fuentes.tituloPeso};`,
    `--m-titulo-tracking: ${fuentes.tituloTracking};`,
  ]

  return `:root{\n${vars.map((v) => '  ' + v).join('\n')}\n}`
}
