import type { Estado, Usuario } from '../types'

/* ─────────────────────────────────────────────────────────────
   Lectura de una minuta de Gemini.

   Gemini devuelve las notas de un Meet con una estructura fija, y
   eso es lo que hace que acá no haga falta un modelo de lenguaje:

     # 📝 Las notas
     <fecha>
     ## <título de la reunión>
     Invitado [Nombre](mailto:correo) [Nombre](mailto:correo) …
     Archivos adjuntos [<título>](https://calendar.google.com/…?eid=…)
     ### Resumen
     <párrafo>
     **<subtema>**
     <párrafo>
     ### Próximos pasos
     - [ ] \[Responsable\] Acción: Detalle
     ### Detalles
     * **<tema>**: <qué se dijo> ([00:03:38](#00:03:38))
     # 📖 Transcripción
     …

   Probado contra 18 minutas reales de reuniones distintas: salieron
   las 18, con 165 tareas y 268 conclusiones. Pedirle a un modelo que
   interprete esto sería pagar y esperar por un trabajo que Gemini ya
   hizo, y encima con la chance de que invente algo.

   Lo que este archivo **no** hace es escribir en la base: devuelve
   lo que encontró para que alguien lo revise antes. Una tarea mal
   asignada que aparece sola erosiona la confianza en la herramienta
   más rápido de lo que la arregla el ahorro de tipear.
   ───────────────────────────────────────────────────────────── */

/** Una tarea salida de «Próximos pasos». */
export interface TareaLeida {
  /** El nombre tal cual lo escribió Gemini: «Agustin Ducculi», «El grupo». */
  responsableTexto: string
  /** A quién de la sala corresponde, si se pudo resolver. */
  responsableId?: string
  accion: string
  detalle: string
}

/** Una viñeta de «Detalles»: de qué se habló y qué se concluyó. */
export interface TemaLeido {
  titulo: string
  conclusion: string
}

export interface MinutaLeida {
  titulo: string
  fecha: string
  /** El párrafo de apertura del resumen. Va como conclusión general. */
  resumen: string
  /** Los correos de los invitados, que es como se los reconoce. */
  correos: string[]
  /** El identificador del evento de Google, para saber de qué reunión es. */
  eid: string | null
  tareas: TareaLeida[]
  temas: TemaLeido[]
}

/* ── Auxiliares ───────────────────────────────────────────── */

/** La primera línea con texto a partir de `desde`. */
function primeraConTexto(lineas: string[], desde: number): string {
  for (let i = desde; i < lineas.length && i < desde + 6; i++) {
    if (lineas[i]?.trim()) return lineas[i].trim()
  }
  return ''
}

/** Saca los `([00:03:38](#00:03:38))` que Gemini deja al final. */
const sinMarcasDeTiempo = (t: string) => t.replace(/\s*\(\[[\d:]+\]\([^)]*\)\)/g, '').trim()

/**
 * Compara nombres sin acentos, mayúsculas ni dobles espacios.
 * «Agustin Ducculi» y «Agustín Ducculi» son la misma persona.
 */
const clave = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Los responsables que no son una persona.
 *
 * Gemini a veces escribe la minuta en inglés aunque la reunión haya
 * sido en castellano, así que van las dos formas.
 */
const ES_EL_GRUPO = new Set(['el grupo', 'the group', 'todos', 'everyone'])

/* ── El parser ────────────────────────────────────────────── */

/**
 * Lee el Markdown que descarga Gemini.
 *
 * Devuelve `null` si el texto no tiene la forma esperada, que es la
 * manera de distinguir «esto no es una minuta de Gemini» de «es una
 * minuta sin tareas».
 */
export function leerMinutaDeGemini(md: string): MinutaLeida | null {
  const L = md.split(/\r?\n/)
  const indice = (re: RegExp) => L.findIndex((l) => re.test(l))

  const iTitulo = indice(/^##\s+\*{0,2}/)
  const iResumen = indice(/^###\s+\*{0,2}Resumen/)
  // Sin título ni resumen no es una minuta: no vale la pena adivinar.
  if (iTitulo < 0 || iResumen < 0) return null

  const iNotas = indice(/^#\s+\*{0,2}.{0,3}\s*Las notas/)
  const iDetalles = indice(/^###\s+\*{0,2}Detalles/)
  const iTranscripcion = indice(/^#\s+\*{0,2}.{0,3}\s*Transcripción/)

  const titulo = (L[iTitulo].match(/^##\s+\*{0,2}(.+?)\*{0,2}\s*$/)?.[1] ?? '')
    // Gemini escapa el guión del subtítulo: «Harvey \- Transcripción».
    .replace(/\\/g, '')
    .trim()

  const lineaInvitados = L.find((l) => /^Invitado\s/.test(l)) ?? ''
  const correos = [...lineaInvitados.matchAll(/\[[^\]]+\]\(mailto:([^)]+)\)/g)].map((m) =>
    m[1].trim().toLowerCase(),
  )

  const lineaCalendario = L.find((l) => /calendar\.google\.com/.test(l)) ?? ''
  const eid = lineaCalendario.match(/[?&]eid=([\w-]+)/)?.[1] ?? null

  /* Tareas: `- [ ] \[Responsable\] Acción: Detalle` */
  const tareas: TareaLeida[] = []
  for (const linea of L) {
    const m = linea.match(/^\s*-\s*\[\s*\]\s*\\?\[(.+?)\\?\]\s*(.+)$/)
    if (!m) continue
    const resto = m[2].trim()
    /*
     * El primer `:` separa el título de la explicación. Se busca el
     * primero y no el último porque el detalle suele traer los suyos.
     */
    const corte = resto.indexOf(':')
    tareas.push({
      responsableTexto: m[1].trim(),
      accion: (corte > 0 ? resto.slice(0, corte) : resto).trim(),
      detalle: corte > 0 ? resto.slice(corte + 1).trim() : '',
    })
  }

  /* Conclusiones por tema: las viñetas de «Detalles». */
  const hasta = iTranscripcion > 0 ? iTranscripcion : L.length
  const temas: TemaLeido[] =
    iDetalles < 0
      ? []
      : L.slice(iDetalles + 1, hasta)
          .map((l) => l.match(/^\s*\*\s+\*\*(.+?)\*\*:\s*(.+)$/))
          .filter((m): m is RegExpMatchArray => Boolean(m))
          .map((m) => ({ titulo: m[1].trim(), conclusion: sinMarcasDeTiempo(m[2]) }))

  return {
    titulo,
    fecha: iNotas >= 0 ? primeraConTexto(L, iNotas + 1) : '',
    resumen: primeraConTexto(L, iResumen + 1),
    correos,
    eid,
    tareas,
    temas,
  }
}

/* ── De la minuta a la gente de la aplicación ─────────────── */

/**
 * Resuelve a quién de la sala corresponde cada tarea.
 *
 * Se busca por nombre completo, porque es lo único que Gemini pone
 * en «Próximos pasos» —los correos sólo están arriba, en la lista de
 * invitados—. Lo que no resuelve queda sin responsable a propósito:
 * es preferible que alguien lo complete a mano antes que asignarle
 * una tarea a la persona equivocada.
 */
export function resolverResponsables(
  minuta: MinutaLeida,
  candidatos: Usuario[],
): TareaLeida[] {
  const porNombre = new Map(candidatos.map((u) => [clave(u.nombre), u.id]))

  return minuta.tareas.map((t) => {
    const texto = t.responsableTexto
    if (ES_EL_GRUPO.has(clave(texto))) return t

    /*
     * Una tarea puede venir a nombre de dos: «Denise Zaga, Agustin
     * Ducculi». Se toma la primera que se reconozca; el resto de los
     * nombres quedan a la vista en la revisión.
     */
    for (const parte of texto.split(/\s*,\s*/)) {
      const id = porNombre.get(clave(parte))
      if (id) return { ...t, responsableId: id }
    }
    return t
  })
}

/**
 * Con qué reunión se corresponde la minuta.
 *
 * El link de Google que trae la minuta lleva el `eid`, que es el id
 * del evento y el calendario juntos, en base64. Como la aplicación
 * guardó el id del evento al crearlo, se los puede comparar y saber
 * de qué reunión se trata sin preguntarle nada a nadie.
 *
 * Si no coincide nada devuelve `undefined` y la elige el usuario.
 */
export function reunionDeLaMinuta(estado: Estado, minuta: MinutaLeida): string | undefined {
  if (!minuta.eid) return undefined

  let descifrado = ''
  try {
    // El eid es base64url y a veces viene sin el relleno de `=`.
    const base64 = minuta.eid.replace(/-/g, '+').replace(/_/g, '/')
    descifrado = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  } catch {
    return undefined
  }

  // Adentro viene «<idDelEvento> <correoDelCalendario>».
  const idEvento = descifrado.split(' ')[0]
  if (!idEvento) return undefined

  return estado.reuniones.find((r) => r.calendarEventoId === idEvento)?.id
}
