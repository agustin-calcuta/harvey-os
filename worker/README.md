# El Worker

La plataforma es sólo frontend y se publica en GitHub Pages. Una clave de API
puesta ahí queda a la vista de cualquiera que abra el bundle, así que las dos
cosas que necesitan una clave viven acá: **transcribir la grabación de una
reunión y resumirla**.

Es un Cloudflare Worker de un archivo. Recibe el audio, se lo pasa a Gemini
—que procesa audio de forma nativa, así que transcribir y resumir son una sola
llamada— y devuelve la transcripción y un borrador de minuta.

Mientras no esté desplegado, la app funciona igual: el botón de grabar no
aparece. Es el mismo trato que el correo con `VITE_EMAIL_ENDPOINT`.

## Desplegarlo

Hace falta una cuenta de Cloudflare (gratis; el plan sin costo cubre de sobra
este volumen) y una clave de Gemini de [Google AI Studio](https://aistudio.google.com/apikey).

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

`wrangler deploy` imprime la URL. Esa URL es la que va en la app:

```bash
# .env, y también como secret del repo para el deploy de GitHub Pages
VITE_IA_ENDPOINT=https://harvey-ia.TU-SUBDOMINIO.workers.dev
```

## Antes de que salga a producción

Dos cosas que hay que ajustar y que no se pueden dejar como están:

1. **`ORIGENES_PERMITIDOS` en `wrangler.jsonc`.** Es la lista de dominios que
   pueden llamar al Worker. Sin eso, cualquiera con la URL gasta la cuota de
   Gemini de la cuenta.
2. **`NEON_JWKS_URL`.** El Worker valida el token de sesión de Neon antes de
   procesar nada. Sin esa variable arranca en modo abierto y avisa por consola
   en cada pedido: sirve para probar, no para dejarlo andando.

## Qué expone

`POST /transcribir` — `multipart/form-data`

| Campo | Qué es |
| --- | --- |
| `audio` | El archivo grabado. `audio/webm` es lo que manda el navegador |
| `contexto` | JSON opcional: título de la reunión, participantes y los temas de la agenda. Con esto el resumen sale ordenado por tema y con los nombres bien escritos |

Responde:

```json
{
  "transcripcion": "…",
  "resumen": {
    "conclusionesGenerales": "…",
    "porTema": [{ "temaId": "t_1", "conclusion": "…" }],
    "proximosPasos": [{ "accion": "…", "responsable": "Nombre", "fechaLimite": "2026-08-25" }],
    "observaciones": "…"
  }
}
```

El audio **no se guarda**: se procesa y se descarta. Lo único que vuelve es
texto, y lo que la app guarda es la minuta que quede después de que una persona
la revise.
