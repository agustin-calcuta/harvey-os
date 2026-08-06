import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// El base se inyecta en CI (GitHub Pages sirve el sitio bajo /<repo>/).
// En local queda en '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    // jsPDF y Firebase son pesados; los separamos del bundle principal.
    chunkSizeWarningLimit: 1200,
  },
})
