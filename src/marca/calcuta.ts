import type { Marca } from './tipos.ts'

/* ─────────────────────────────────────────────────────────────
   CALCUTA — la instancia propia.

   Los valores marcados «oficial» salen del Brandbox 2026 de la
   consultora (`CalcutaDesign/Soporte visual/Brandbox.pdf`). Los
   demás son derivados: la marca define seis colores y una
   tipografía, y una aplicación necesita bastante más que eso
   —superficies hundidas, tres pesos de texto, dos bordes, cuatro
   estados—. Cada derivado dice de dónde viene.

   ── Jerarquía de uso, que el manual fija en la página 22 ──────
   Negro 35% · Blanco 30% · Azul 20% · Gris claro 8% · Gris 5% ·
   Lima 2%.

   El negro pesa más que el blanco, y eso no se resuelve con un
   fondo oscuro: se resuelve con **negro estructural**. La barra
   lateral, las portadas y los encabezados de bloque van en negro
   pleno, y las superficies de trabajo quedan claras. Así el negro
   ocupa su tercio sin que haya que recalibrar el contraste de cada
   pantalla, del PDF y de los correos.

   ── Lo que no se pudo copiar de Imporbamas ────────────────────
   Allá un solo rojo era la acción principal *y* lo vencido. Acá la
   acción es azul, y un azul no alerta: lo vencido pasa al naranja
   de la paleta secundaria. Es el cambio de fondo entre las dos
   marcas y la razón de que `signal` y `alerta` sean dos tokens.
   ───────────────────────────────────────────────────────────── */

export const calcuta: Marca = {
  id: 'calcuta',
  nombre: 'Calcuta',
  titulo: 'Calcuta — Reuniones y minutas',
  descripcion: 'Calcuta — reuniones y minutas: temario, minuta y seguimiento de tareas.',
  kicker: 'Reuniones y minutas',

  colores: {
    /*
     * Superficies. Neutras a propósito: el hueso de Imporbamas
     * (#f7f5f1) es cálido y acá desentona con el azul eléctrico.
     * El blanco es oficial y se lleva su 30%.
     */
    fondo: '#f2f2f1',
    panel: '#ffffff', // Plain White, oficial
    hueco: '#e6e5e3',

    /*
     * El manual pide negro puro para la tinta. En texto corrido de
     * pantalla lo bajamos un punto: #0b0b0b es indistinguible del
     * negro a simple vista y cansa menos en una minuta larga. El
     * negro puro sí va, sin retoque, en las superficies (`noche`).
     */
    tinta: '#0b0b0b', // ← Deep Black #000000, oficial
    suave: '#5f5f5f',
    tenue: '#7f7f7f', // Neutral Grey, oficial

    borde: '#e6e6e4',
    borde2: '#dedad8', // Soft Grey, oficial

    /*
     * Electric Blue: la acción principal de cada pantalla. Sobre
     * blanco da 7.4:1, así que aguanta texto chico y no sólo
     * botones.
     */
    signal: '#1d37e0', // oficial
    signalHi: '#182db8', // el mismo, oscurecido para :hover

    /*
     * Lo vencido y lo que salió mal, en el naranja de la paleta
     * secundaria. Es el único de los cinco secundarios que alerta
     * a distancia sin discutirle el protagonismo al azul.
     */
    alerta: '#d1540b', // oficial (secundaria)
    alertaHi: '#a94309',

    /*
     * Highlight Yellow: «energía & movimiento», 2% del uso. Va en
     * lo que está pasando ahora. Con texto negro encima, que es la
     * única forma de que se lea.
     */
    acento: '#edf84e', // oficial
    acentoTinta: '#0b0b0b',

    /* Los cuatro estados, todos de la paleta secundaria oficial. */
    rust: '#6c1c25', // bordó; casi sin uso, queda por compatibilidad
    /*
     * Pendiente / sin tratar. La secundaria no tiene un ámbar, así
     * que va un ocre emparentado con el naranja de alerta: se
     * distingue por estar más apagado y más oscuro, que es
     * exactamente la diferencia entre «esperando» y «vencido».
     */
    amber: '#8a5c0e',
    acid: '#25725e', // verde: en agenda, aprobado, hecho
    cold: '#04457b', // azul petróleo: informativo, en el bloc

    /*
     * La contraparte oscura, que acá no es contraparte sino el
     * color dominante: barra lateral, portadas y encabezados.
     */
    noche: '#000000', // Deep Black, oficial y sin retoque
    noche2: '#141414',
    nocheborde: '#2a2a2a',
    nocheTinta: '#f2f2f1',
    nocheTenue: '#8a8a8a',
  },

  fuentes: {
    /*
     * Space Grotesk, familia única. El manual no define una segunda:
     * la jerarquía se arma con peso y caja, no con dos familias.
     * Es open source, así que no hay licencia que resolver.
     */
    display: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    sans: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    mono: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    googleFonts:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap',
    /*
     * En el correo lo que se va a ver es el fallback: casi ningún
     * cliente carga fuentes remotas. Helvetica y Arial son las que
     * más se le parecen de las que están instaladas en todos lados.
     */
    correo: "'Space Grotesk',Helvetica,Arial,sans-serif",

    /*
     * El titular va en Bold y en **caja mixta**. Es la diferencia
     * más visible con Imporbamas, y no es una preferencia: el
     * manual asigna las mayúsculas a los *tags* y nada más. Un
     * titular en mayúsculas acá contradice la marca.
     */
    displayPeso: 700,
    displayCaja: 'none',
    displayTracking: '-0.04em', // el interletrado −4 del manual

    tituloPeso: 700,
    tituloTracking: '-0.02em', // −2
  },

  ejemplos: {
    tema: 'Definir el alcance de la propuesta',
    tarea: 'Preparar la propuesta y pasarla a revisión',
    correo: 'nombre@calcuta.com',
    persona: 'Nombre y apellido',
  },

  logos: {
    isotipoClaro: 'marca/calcuta/isotipo-blanco.svg', // sobre la barra negra
    isotipoOscuro: 'marca/calcuta/isotipo-azul.svg',
    logotipo: 'marca/calcuta/logotipo-azul.svg', // una vez, grande, en el acceso
    favicon: 'marca/calcuta/isotipo-azul.svg',
  },
}
