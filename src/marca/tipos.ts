/* ─────────────────────────────────────────────────────────────
   La forma que tiene una marca.

   Esto es lo único que cambia entre un cliente y otro. El modelo
   de datos, las tres fases, los roles y las políticas de la base
   son iguales para todos: acá viven el nombre, los colores, las
   tipografías y los logos, y nada más.

   Los nombres de color son **semánticos, no descriptivos**: se
   llama `signal` y no `rojo` justamente porque en Calcuta es azul.
   Un nombre descriptivo obliga a renombrar en ciento y pico de
   lugares la primera vez que un cliente elige otro color.

   Para dar de alta un cliente nuevo: un archivo acá y una línea en
   `registro.ts`. Nada más — ni `index.css`, ni `email.ts`, ni
   `pdf.ts`, ni `index.html`.
   ───────────────────────────────────────────────────────────── */

/** Color en hexadecimal, siempre con `#` y seis dígitos. */
export type Hex = string

/** El mismo color en la forma que quiere jsPDF. */
export type Rgb = [number, number, number]

/**
 * La paleta completa.
 *
 * El orden es el de `index.css`: primero las superficies —de la más
 * al fondo a la más cercana—, después el texto, los bordes, los
 * acentos y por último la contraparte oscura.
 */
export interface ColoresMarca {
  /* ── Superficies ── */
  fondo: Hex
  panel: Hex
  hueco: Hex

  /* ── Texto ── */
  tinta: Hex
  suave: Hex
  tenue: Hex

  /* ── Bordes ── */
  borde: Hex
  borde2: Hex

  /**
   * La acción principal de cada pantalla: el botón que hay que
   * apretar, el foco de un campo, la selección de texto.
   *
   * Va **uno por pantalla**. El resto de los botones sólidos van en
   * tinta; si todo es signal, signal deja de significar algo.
   */
  signal: Hex
  /** El mismo, un escalón más oscuro, para `:hover`. */
  signalHi: Hex

  /**
   * Lo vencido y lo que salió mal.
   *
   * En Imporbamas esto era el mismo rojo que `signal` —un color
   * hacía las dos cosas—. Con un azul de acción deja de funcionar:
   * un azul no alerta. Por eso son dos tokens y no uno, aunque en
   * Imporbamas los dos valgan lo mismo y no se note ningún cambio.
   */
  alerta: Hex
  alertaHi: Hex

  /**
   * El color de marca que aparece poco y se nota mucho: lo que está
   * pasando ahora —la reunión en vivo, el punto que late—.
   *
   * Existe porque el manual de Calcuta le asigna al lima un 2% del
   * uso y no hay forma de respetar un 2% si el color no tiene un
   * lugar propio en el sistema. En Imporbamas vale lo mismo que
   * `signal`, así que no cambia nada de lo que ya estaba.
   */
  acento: Hex
  /**
   * El texto que va **encima** del acento.
   *
   * No es un detalle: el lima `#edf84e` con texto blanco da 1.3:1 y
   * es ilegible. Sobre el rojo de Imporbamas el texto va blanco.
   * Que lo decida la marca evita que alguien ponga `text-white` a
   * mano y lo descubra recién en producción.
   */
  acentoTinta: Hex

  /* ── Estados. Cada uno tiene un significado fijo en `types.ts`: ── */
  /** Casi sin uso; queda por compatibilidad del tema. */
  rust: Hex
  /** Pendiente, sin tratar, lo que espera a alguien. */
  amber: Hex
  /** Aprobado, en agenda, hecho. */
  acid: Hex
  /** Informativo, en el bloc, lo que todavía no es de nadie. */
  cold: Hex

  /* ── La contraparte oscura: barra lateral y portadas ── */
  noche: Hex
  noche2: Hex
  nocheborde: Hex
  /** El texto sobre la noche. Estaba escrito a mano dentro de `.noche`. */
  nocheTinta: Hex
  /** Las etiquetas sobre la noche, un escalón más apagadas. */
  nocheTenue: Hex
}

/**
 * Las tipografías y cómo se comporta el titular.
 *
 * La caja del titular es parte de la marca, no del producto:
 * Imporbamas compone en mayúsculas porque así es su cartelería, y
 * Calcuta reserva las mayúsculas para las etiquetas —su manual las
 * asigna a los *tags* y nada más—. Si esto viviera en `index.css`,
 * el segundo cliente tendría que editarlo a mano.
 */
export interface FuentesMarca {
  /** Titulares. */
  display: string
  /** Texto corrido. */
  sans: string
  /** Números y datos tabulares. */
  mono: string
  /** La URL del `<link>` de Google Fonts, con los pesos que se usan. */
  googleFonts: string
  /** Las familias tal cual las quiere un cliente de correo, sin `var()`. */
  correo: string

  /* ── Cómo se compone el titular (`.display`) ── */
  displayPeso: number
  displayCaja: 'uppercase' | 'none'
  /** Interletrado en `em`. El manual de Calcuta pide −4 en bold. */
  displayTracking: string

  /* ── Y el título de sección (`.titulo`) ── */
  tituloPeso: number
  tituloTracking: string
}

/**
 * Los archivos de marca, servidos desde `public/marca/<id>/`.
 *
 * Son opcionales a propósito: una marca sin logos compone su nombre
 * en la tipografía del titular, que es lo que hacía Imporbamas antes
 * de que esto existiera.
 */
export interface LogosMarca {
  /** Para la barra lateral, que es oscura. */
  isotipoClaro?: string
  /** Para fondos claros. */
  isotipoOscuro?: string
  /** El logotipo completo, una vez y grande, en la pantalla de acceso. */
  logotipo?: string
  /** El de la pestaña. Puede ser una ruta o un `data:` URI. */
  favicon: string
}

/** Una marca completa. */
export interface Marca {
  /** El identificador que se pasa en `VITE_MARCA`. */
  id: string
  /**
   * El nombre visible.
   *
   * Es el valor **por defecto**: una vez creada la base, quien
   * administra puede cambiarlo desde Administración y lo que manda
   * es `estado.config.organizacion`. Esto es lo que se muestra
   * mientras todavía no hay configuración cargada.
   */
  nombre: string
  /** El `<title>` de la pestaña. */
  titulo: string
  /** El `<meta name="description">`. */
  descripcion: string
  /** El `[ kicker ]` de la pantalla de acceso. */
  kicker: string
  /**
   * El crédito del pie de página.
   *
   * Opcional porque no siempre corresponde: en la instancia de un
   * cliente dice quién hizo la herramienta, y en la de Calcuta
   * —que es quien la hace— diría «Calcuta · reuniones y minutas /
   * desarrollado por Calcuta». Sin valor, el pie no lo muestra.
   */
  credito?: string

  /**
   * Si quien administra es parte del equipo o una cuenta de afuera.
   *
   * En la instancia de un cliente, el superadmin es la cuenta de
   * soporte de Calcuta: no participa de ninguna reunión y no tiene
   * sentido que aparezca cuando se elige a quién sumar a una sala o
   * a quién asignarle una tarea. Ahí va `false`.
   *
   * En la instancia propia son dos socios que además administran:
   * participan de todo, y esconderlos de esas listas significaría
   * que nadie los puede sumar a una sala nueva. Ahí va `true`.
   */
  adminsSonDelEquipo: boolean

  /**
   * Si el trabajo se organiza por cliente.
   *
   * Una consultora factura por cliente y necesita saber de quién es
   * cada tarea; una marca de ropa trabaja para sí misma y el campo
   * sería una pregunta sin respuesta en cada formulario. Apagado, no
   * aparece ni el campo ni el filtro —los datos que hubiera quedan
   * en la base, sin borrarse—.
   */
  usaClientes: boolean

  colores: ColoresMarca
  fuentes: FuentesMarca
  logos: LogosMarca
  ejemplos: EjemplosMarca
}

/**
 * Los ejemplos que muestran los formularios vacíos.
 *
 * Parecen decorativos y no lo son: son lo que le dice a alguien qué
 * se espera que escriba ahí. Uno de otro rubro —«Definir proveedor
 * de denim» en una consultora— confunde más de lo que ayuda.
 */
export interface EjemplosMarca {
  /** Un tema de reunión típico de este cliente. */
  tema: string
  /** Una tarea con acción concreta. */
  tarea: string
  /** Un nombre y apellido, para el formulario de alta de gente. */
  persona: string
  /**
   * Un correo con el dominio del cliente.
   *
   * Lo muestra el formulario para sumar gente a una sala, y ahí el
   * dominio importa: es lo que le dice a quien invita con qué
   * cuenta tiene que entrar la otra persona.
   */
  correo: string
}

/**
 * De `#1d37e0` a `[29, 55, 224]`.
 *
 * Está acá y no en `pdf.ts` para que el PDF no vuelva a tener su
 * propia copia de la paleta: la marca define los colores una sola
 * vez en hexadecimal y expone las dos formas.
 */
export function aRgb(hex: Hex): Rgb {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
