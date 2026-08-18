import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { elegirMarca } from './src/marca/registro.ts'
import { cssDeMarca } from './src/marca/css.ts'

// La marca se resuelve una sola vez, acá, y de acá salen tanto las
// variables CSS como el título, la descripción y el favicon del
// index.html —que es estático y no se entera de nada de lo que pasa
// en React—. Si VITE_MARCA no existe, `elegirMarca` rompe el build.
const marca = elegirMarca(process.env.VITE_MARCA)

// El base se inyecta en CI (GitHub Pages sirve el sitio bajo /<repo>/).
// En local y en Cloudflare Pages queda en '/'.
const base = process.env.VITE_BASE ?? '/'

// Un `data:` URI o una URL van tal cual; un archivo de public/ lleva
// el prefijo del despliegue adelante.
const rutaPublica = (r: string) => (/^(data:|https?:)/.test(r) ? r : base + r)

export default defineConfig({
  base,
  define: {
    /*
     * La marca entra al paquete como objeto literal, no como un
     * `import` del registro: si la aplicación importara el registro,
     * el archivo que se le sirve a Calcuta llevaría adentro la
     * paleta y el nombre de Imporbamas —y al revés—.
     */
    __MARCA__: JSON.stringify(marca),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'marca',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return {
            html: html
              .replace(/%MARCA_TITULO%/g, marca.titulo)
              .replace(/%MARCA_DESCRIPCION%/g, marca.descripcion)
              .replace(/%MARCA_FUENTES%/g, marca.fuentes.googleFonts)
              .replace(/%MARCA_FAVICON%/g, rutaPublica(marca.logos.favicon))
              .replace(/%MARCA_FONDO%/g, marca.colores.fondo),
            tags: [
              {
                // `head-prepend` y no un import de CSS: las variables
                // tienen que estar en el HTML que llega, para que no
                // haya un cuadro con los colores de la otra marca.
                tag: 'style',
                children: cssDeMarca(marca),
                injectTo: 'head-prepend',
              },
            ],
          }
        },
      },
    },
  ],
  build: {
    // jsPDF y Firebase son pesados; los separamos del bundle principal.
    chunkSizeWarningLimit: 1200,
  },
})
