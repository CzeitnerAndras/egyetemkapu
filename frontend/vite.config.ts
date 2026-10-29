import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Listed before /api. Vite keeps the first matching prefix.
      '/api/bibliography': {
        target: 'http://localhost:8092',
        changeOrigin: true,
      },
      '/api/thesis': {
        target: 'http://localhost:8091',
        changeOrigin: true,
      },
      '/api/points': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
