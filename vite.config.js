import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: ['es2015', 'chrome63', 'safari11.1'],
    polyfillModulePreload: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: 'all',
    cors: {
      origin: '*',
    },
  }
})