/* ─────────────────────────────────────────────────────────────
   Los datos de demostración del cliente que se esté compilando.

   `@seed` es un alias que `vite.config.ts` apunta al archivo de la
   marca activa. Es la misma razón que en `src/marca/`: si acá
   hubiera un `import` de los dos, el paquete que se le sirve a
   Calcuta llevaría adentro los nombres y los correos del equipo de
   Imporbamas. Con el alias, el otro cliente ni se compila.

   Todo el resto de la aplicación importa desde acá y no sabe de
   qué archivo salieron los datos.
   ───────────────────────────────────────────────────────────── */

export { ESTADO_INICIAL, VISTAS } from '@seed'
export type { Seed, VistaPrevia } from './tipos.ts'
