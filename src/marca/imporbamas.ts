import type { Marca } from './tipos.ts'

/* ─────────────────────────────────────────────────────────────
   IMPORBAMAS — la marca original (ex «Harvey»).

   Todos estos valores estaban escritos a mano en `index.css`,
   `email.ts`, `pdf.ts` e `index.html`. Están acá tal cual, sin
   cambiar ni un dígito: mover la marca a configuración no puede
   mover un solo píxel de lo que el equipo ya usa todos los días.

   Fondo hueso, tinta casi negra y el rojo señal de la tienda. Las
   dos familias son las mismas que usa harveywillys.com.
   ───────────────────────────────────────────────────────────── */

export const imporbamas: Marca = {
  id: 'imporbamas',
  nombre: 'Imporbamas',
  titulo: 'Imporbamas — Reuniones y minutas',
  descripcion: 'Imporbamas — reuniones y minutas: temario, minuta y seguimiento de tareas.',
  kicker: 'Calcuta para Imporbamas',

  /* El superadmin es la cuenta de soporte de Calcuta, no del equipo. */
  adminsSonDelEquipo: false,
  credito: 'Desarrollado por Calcuta',

  colores: {
    fondo: '#f7f5f1',
    panel: '#ffffff',
    hueco: '#efece6',

    tinta: '#14120f',
    suave: '#6b665d',
    tenue: '#9a948a',

    borde: '#e3ded4',
    borde2: '#cdc6b8',

    signal: '#c0392b',
    signalHi: '#a52f23',

    /*
     * Acá el rojo hacía las dos cosas —la acción principal y lo
     * vencido— y así queda: mismo valor que `signal`, cero cambio
     * visual. La separación existe para Calcuta, donde la acción
     * es azul y lo vencido necesita un color propio.
     */
    alerta: '#c0392b',
    alertaHi: '#a52f23',

    /* Mismo criterio: acá el acento de marca ya era el rojo. */
    acento: '#c0392b',
    acentoTinta: '#ffffff',

    rust: '#ae5343',
    amber: '#b26b18',
    acid: '#5f7d1c',
    cold: '#2e6285',

    noche: '#14120f',
    noche2: '#1f1c18',
    nocheborde: '#322d26',
    nocheTinta: '#f2efe9',
    nocheTenue: '#8f887c',
  },

  fuentes: {
    display: "'Almarai', 'Inter', sans-serif",
    sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
    mono: "'Inter', ui-sans-serif, system-ui, sans-serif",
    googleFonts:
      'https://fonts.googleapis.com/css2?family=Inter:wght@300..800&family=Almarai:wght@400;700;800&display=swap',
    correo: 'Inter,Helvetica,Arial,sans-serif',

    displayPeso: 800,
    displayCaja: 'uppercase',
    displayTracking: '-0.02em',

    tituloPeso: 700,
    tituloTracking: '-0.01em',
  },

  ejemplos: {
    tema: 'Definir proveedor de denim',
    tarea: 'Cerrar contrato con el taller de denim',
    correo: 'renata@harveywillys.com',
    persona: 'Renata Sosa',
  },

  logos: {
    /*
     * Imporbamas nunca tuvo archivo de logo en la aplicación: el
     * nombre se compone en Almarai y listo. Sin `isotipoClaro` ni
     * `logotipo`, la interfaz cae sola en el texto, que es
     * exactamente lo que hacía antes.
     */
    favicon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230A0A0A'/%3E%3Ctext x='50' y='72' font-family='Arial Black,Arial' font-size='44' font-weight='900' fill='%23C0392B' text-anchor='middle'%3EIB%3C/text%3E%3C/svg%3E",
  },
}
