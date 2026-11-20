import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// /api goes to the backend through the dev server, as Vercel does in production, so the login
// cookie belongs to the website's own origin in both.
const apiProxy = { '/api': { target: 'http://localhost:3000', changeOrigin: true } }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The socket connects to the backend directly; without this URL it would have nowhere to go.
  if (mode === 'production' && !loadEnv(mode, '.', 'VITE_').VITE_BACKEND_URL) {
    throw new Error('VITE_BACKEND_URL is not set. Set it to the backend URL, e.g. https://chatify-api.onrender.com')
  }
  return {
    plugins: [react()],
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
  }
})
