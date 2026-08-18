/* ─────────────────────────────────────────────────────────────
   Harvey — de la grabación a la minuta.

   Un solo endpoint. Recibe el audio de una reunión y devuelve la
   transcripción y un borrador de minuta ordenado por los temas que
   estaban en la agenda.

   Está acá y no en la app porque la app es estática: la clave de
   Gemini en el bundle la lee cualquiera. Este Worker es lo único
   que la ve.

   Dos cosas que el Worker sí hace y conviene no sacar:

   - **Corta por origen.** Sin eso es una API de IA abierta a
     internet, pagada por la cuenta de Calcuta.
   - **Pide sesión.** El token de Neon del usuario que graba. Si no
     está configurado el JWKS, arranca igual y lo grita por consola.

   Y una que no hace a propósito: **guardar el audio**. Se procesa
   y se descarta. Lo que queda es texto, y la minuta la firma una
   persona después de revisarla.
   ───────────────────────────────────────────────────────────── */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

export default {
  async fetch(peticion, env) {
    const origen = peticion.headers.get('Origin') ?? ''
    const cors = cabecerasCors(origen, env)

    if (peticion.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (!cors['Access-Control-Allow-Origin']) {
      return responder({ error: 'Origen no permitido.' }, 403, {})
    }
    if (peticion.method !== 'POST') {
      return responder({ error: 'Sólo POST.' }, 405, cors)
    }

    const url = new URL(peticion.url)
    if (url.pathname !== '/transcribir') {
      return responder({ error: 'No existe.' }, 404, cors)
    }

    if (!env.GEMINI_API_KEY) {
      return responder(
        { error: 'Falta la clave de Gemini. Ver el README del worker.' },
        500,
        cors,
      )
    }

    const sesion = await validarSesion(peticion, env)
    if (!sesion.ok) return responder({ error: sesion.error }, 401, cors)

    let formulario
    try {
      formulario = await peticion.formData()
    } catch {
      return responder({ error: 'Se esperaba multipart/form-data.' }, 400, cors)
    }

    const audio = formulario.get('audio')
    if (!audio || typeof audio === 'string') {
      return responder({ error: 'Falta el archivo de audio.' }, 400, cors)
    }

    /*
     * El tope. Gemini acepta audio inline hasta cierto tamaño de
     * petición; más arriba de eso hay que subirlo antes por la Files
     * API, que es otro camino. Una reunión de una hora en el códec
     * del navegador entra con holgura; el tope está para que, si
     * alguien deja grabando media tarde, el error sea claro en vez de
     * un fallo raro de la API.
     */
    const maxBytes = Number(env.MAX_MB ?? 18) * 1024 * 1024
    if (audio.size > maxBytes) {
      return responder(
        {
          error: `La grabación pesa ${(audio.size / 1024 / 1024).toFixed(1)} MB y el tope es ${env.MAX_MB ?? 18} MB. Cortala en partes y subilas de a una.`,
        },
        413,
        cors,
      )
    }

    let contexto = {}
    const crudo = formulario.get('contexto')
    if (typeof crudo === 'string' && crudo.trim()) {
      try {
        contexto = JSON.parse(crudo)
      } catch {
        /* El contexto es una ayuda, no un requisito: sin él se resume igual. */
      }
    }

    try {
      const salida = await pedirleAGemini(audio, contexto, env)
      return responder(salida, 200, cors)
    } catch (e) {
      console.error('[harvey-ia] falló el procesamiento:', e)
      return responder({ error: 'No se pudo procesar la grabación.' }, 502, cors)
    }
  },
}

/* ── CORS ─────────────────────────────────────────────────── */

function cabecerasCors(origen, env) {
  const permitidos = (env.ORIGENES_PERMITIDOS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const base = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (!permitidos.length) {
    console.warn('[harvey-ia] sin ORIGENES_PERMITIDOS: acepta a cualquiera.')
    return { ...base, 'Access-Control-Allow-Origin': origen || '*' }
  }
  return permitidos.includes(origen)
    ? { ...base, 'Access-Control-Allow-Origin': origen }
    : base
}

const responder = (cuerpo, estado, cors) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...JSON_HEADERS, ...cors },
  })

/* ── Sesión ───────────────────────────────────────────────── */

/**
 * Verifica el token de Neon Auth con el JWKS del proyecto.
 *
 * Alcanza con comprobar que el token es válido y no venció: quién
 * puede ver qué lo deciden las políticas de la base, no esto. Acá
 * sólo se trata de no procesar audio de un desconocido.
 */
async function validarSesion(peticion, env) {
  if (!env.NEON_JWKS_URL) {
    console.warn('[harvey-ia] sin NEON_JWKS_URL: no se valida la sesión.')
    return { ok: true }
  }

  const cabecera = peticion.headers.get('Authorization') ?? ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : ''
  if (!token) return { ok: false, error: 'Falta la sesión.' }

  try {
    const [cabeceraB64, cuerpoB64, firmaB64] = token.split('.')
    if (!cabeceraB64 || !cuerpoB64 || !firmaB64) {
      return { ok: false, error: 'Sesión mal formada.' }
    }

    const cuerpo = JSON.parse(textoDeB64Url(cuerpoB64))
    if (cuerpo.exp && cuerpo.exp * 1000 < Date.now()) {
      return { ok: false, error: 'La sesión venció. Volvé a entrar.' }
    }

    const { kid, alg } = JSON.parse(textoDeB64Url(cabeceraB64))
    const jwks = await traerJwks(env.NEON_JWKS_URL)
    const jwk = jwks.keys.find((k) => k.kid === kid) ?? jwks.keys[0]
    if (!jwk) return { ok: false, error: 'No se pudo verificar la sesión.' }

    const clave = await crypto.subtle.importKey(
      'jwk',
      jwk,
      algoritmoDe(alg ?? jwk.alg),
      false,
      ['verify'],
    )
    const valida = await crypto.subtle.verify(
      algoritmoDe(alg ?? jwk.alg),
      clave,
      bytesDeB64Url(firmaB64),
      new TextEncoder().encode(`${cabeceraB64}.${cuerpoB64}`),
    )
    return valida ? { ok: true } : { ok: false, error: 'Sesión inválida.' }
  } catch (e) {
    console.error('[harvey-ia] no se pudo validar la sesión:', e)
    return { ok: false, error: 'No se pudo verificar la sesión.' }
  }
}

/* El JWKS cambia muy de vez en cuando: se cachea cinco minutos. */
let jwksCache = { url: '', datos: null, hasta: 0 }
async function traerJwks(url) {
  if (jwksCache.url === url && jwksCache.datos && Date.now() < jwksCache.hasta) {
    return jwksCache.datos
  }
  const r = await fetch(url)
  if (!r.ok) throw new Error(`JWKS respondió ${r.status}`)
  const datos = await r.json()
  jwksCache = { url, datos, hasta: Date.now() + 5 * 60 * 1000 }
  return datos
}

function algoritmoDe(alg) {
  if (alg === 'ES256') return { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' }
  if (alg === 'EdDSA') return { name: 'Ed25519' }
  return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
}

const bytesDeB64Url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const textoDeB64Url = (s) => new TextDecoder().decode(bytesDeB64Url(s))

/* ── Gemini ───────────────────────────────────────────────── */

/*
 * Lo que se le pide. Está en castellano rioplatense a propósito: el
 * modelo escribe la minuta en el mismo registro en que se habló, y
 * una minuta que suena a traducción no la lee nadie.
 *
 * Lo importante es lo que **no** se le pide: que decida. Propone una
 * conclusión por tema y las tareas que escuchó, con el nombre tal
 * como lo dijeron. Todo eso queda editable antes de generar la
 * minuta definitiva.
 */
const INSTRUCCIONES = `
Sos el asistente que toma la minuta de una reunión de trabajo en Argentina.

Recibís el audio de la reunión. Tu trabajo es doble:

1. Transcribir lo que se dijo, en español rioplatense, sin corregir la forma
   de hablar de nadie. Si no se entiende un tramo, poné [inaudible].
2. Armar el borrador de la minuta.

Reglas:

- Escribí como se habla acá: "vos", "tenés", "acá". Nada de "ustedes deben".
- No inventes. Si algo no se dijo, no está. Un campo vacío es correcto.
- Una tarea es algo que alguien se comprometió a hacer. "Habría que ver" no es
  una tarea; "yo lo llamo el lunes" sí.
- El responsable va con el nombre tal como lo dijeron en la reunión.
- Las fechas, en formato AAAA-MM-DD. Si dijeron "el lunes" y sabés la fecha de
  la reunión, calculala; si no, dejala vacía.
- Si te paso los temas de la agenda, ordená las conclusiones por esos temas y
  usá sus identificadores. Lo que se habló y no estaba en la agenda va en
  observaciones.
- Las conclusiones generales son tres o cuatro oraciones: qué se decidió y por
  qué. No un resumen de todo lo que se dijo.
`.trim()

const ESQUEMA = {
  type: 'object',
  properties: {
    transcripcion: { type: 'string' },
    resumen: {
      type: 'object',
      properties: {
        conclusionesGenerales: { type: 'string' },
        porTema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              temaId: { type: 'string' },
              titulo: { type: 'string' },
              conclusion: { type: 'string' },
            },
            required: ['titulo', 'conclusion'],
          },
        },
        proximosPasos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              accion: { type: 'string' },
              responsable: { type: 'string' },
              fechaLimite: { type: 'string' },
            },
            required: ['accion'],
          },
        },
        observaciones: { type: 'string' },
      },
      required: ['conclusionesGenerales', 'porTema', 'proximosPasos'],
    },
  },
  required: ['transcripcion', 'resumen'],
}

async function pedirleAGemini(audio, contexto, env) {
  const modelo = env.MODELO || 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`

  const partes = [{ text: textoDeContexto(contexto) }]
  partes.push({
    inline_data: {
      mime_type: audio.type || 'audio/webm',
      data: aBase64(await audio.arrayBuffer()),
    },
  })

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCCIONES }] },
      contents: [{ role: 'user', parts: partes }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: ESQUEMA,
        temperature: 0.2,
      },
    }),
  })

  if (!r.ok) {
    const detalle = await r.text()
    throw new Error(`Gemini respondió ${r.status}: ${detalle.slice(0, 400)}`)
  }

  const datos = await r.json()
  const texto = datos?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!texto) throw new Error('Gemini no devolvió contenido.')
  return JSON.parse(texto)
}

/** Lo que el modelo necesita saber de la reunión antes de escuchar. */
function textoDeContexto(c) {
  const lineas = ['Datos de la reunión:']
  if (c.titulo) lineas.push(`Título: ${c.titulo}`)
  if (c.fecha) lineas.push(`Fecha: ${c.fecha}`)
  if (c.sala) lineas.push(`Equipo: ${c.sala}`)
  if (Array.isArray(c.participantes) && c.participantes.length) {
    lineas.push(`Participantes: ${c.participantes.join(', ')}`)
  }
  if (Array.isArray(c.temas) && c.temas.length) {
    lineas.push('', 'Temas de la agenda:')
    for (const t of c.temas) {
      lineas.push(`- [${t.id}] ${t.titulo}${t.objetivo ? ` (${t.objetivo})` : ''}`)
    }
  }
  lineas.push('', 'Transcribí el audio y armá la minuta con eso.')
  return lineas.join('\n')
}

/* Por bloques: un spread de un buffer de decenas de MB revienta la pila. */
function aBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const bloque = 0x8000
  let bin = ''
  for (let i = 0; i < bytes.length; i += bloque) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + bloque))
  }
  return btoa(bin)
}
